"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

function canManagePhotos(role: string) {
  return (
    ["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR"].includes(role) ||
    role.startsWith("SERVICE") ||
    role.startsWith("SALES")
  );
}

export async function addProfileDocumentAction(profileId: string, url: string, type: "PHOTO" | "ID_PROOF" | "OTHER") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!canManagePhotos(session.user.role)) {
    return { error: "You do not have permission to upload photos for this profile." };
  }

  let existingPhotoCount = 0;
  if (type === "PHOTO") {
    existingPhotoCount = await prisma.profileDocument.count({ where: { profileId, type: "PHOTO" } });
    if (existingPhotoCount >= 5) {
      return { error: "Maximum 5 photos allowed per profile." };
    }
  }

  const maxOrder = await prisma.profileDocument.aggregate({
    where: { profileId, type },
    _max: { order: true },
  });

  await prisma.profileDocument.create({
    data: { profileId, url, type, order: (maxOrder._max.order ?? -1) + 1 },
  });

  if (type === "PHOTO" && existingPhotoCount === 0) {
    await prisma.profile.update({ where: { id: profileId }, data: { photoUrl: url } });
  }

  revalidatePath(`/dashboard/admin/profiles/${profileId}/edit`);
  revalidatePath(`/dashboard/service/profiles/${profileId}`);
  revalidatePath(`/dashboard/service/profiles`);
  revalidatePath(`/dashboard/admin/profiles`);
  return { error: null };
}

export async function getProfileDocuments(profileId: string) {
  return prisma.profileDocument.findMany({
    where: { profileId },
    orderBy: [{ order: "asc" }, { uploadedAt: "asc" }, { id: "asc" }],
  });
}

export async function deleteProfileDocumentAction(id: string, profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!canManagePhotos(session.user.role)) {
    return { error: "You do not have permission to upload photos for this profile." };
  }
  const doc = await prisma.profileDocument.findUnique({ where: { id }, select: { type: true } });
  await prisma.profileDocument.delete({ where: { id } });
  if (doc?.type === "PHOTO") await normalizePhotos(profileId);
  revalidatePath(`/dashboard/admin/profiles/${profileId}/edit`);
}

export async function setPrimaryPhotoAction(id: string, profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!canManagePhotos(session.user.role)) {
    return { error: "You do not have permission to upload photos for this profile." };
  }

  const photos = await prisma.profileDocument.findMany({
    where: { profileId, type: "PHOTO" },
    orderBy: [{ order: "asc" }, { uploadedAt: "asc" }, { id: "asc" }],
  });

  const target = photos.find((p) => p.id === id);
  if (!target) return;

  const others = photos.filter((p) => p.id !== id);
  await prisma.$transaction([
    prisma.profileDocument.update({ where: { id: target.id }, data: { order: 0 } }),
    ...others.map((p, i) =>
      prisma.profileDocument.update({ where: { id: p.id }, data: { order: i + 1 } })
    ),
  ]);

  await prisma.profile.update({ where: { id: profileId }, data: { photoUrl: target.url } });
  revalidatePath(`/dashboard/admin/profiles/${profileId}/edit`);
}

// Renumbers a profile's photos to 0..n-1 (stable tie-break by upload time) and
// keeps Profile.photoUrl in sync with the primary photo.
async function normalizePhotos(profileId: string) {
  const photos = await prisma.profileDocument.findMany({
    where: { profileId, type: "PHOTO" },
    orderBy: [{ order: "asc" }, { uploadedAt: "asc" }, { id: "asc" }],
  });
  await prisma.$transaction(
    photos.map((p, i) => prisma.profileDocument.update({ where: { id: p.id }, data: { order: i } }))
  );
  await prisma.profile.update({ where: { id: profileId }, data: { photoUrl: photos[0]?.url ?? null } });
}

// Sets the exact photo order. Index 0 is primary, 1 and 2 are the secondary
// photos on the biodata, anything after that is kept but not printed.
export async function reorderPhotosAction(profileId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!canManagePhotos(session.user.role)) {
    return { error: "You do not have permission to manage photos for this profile." };
  }

  const photos = await prisma.profileDocument.findMany({
    where: { profileId, type: "PHOTO" },
    select: { id: true, url: true },
  });
  const known = new Set(photos.map((p) => p.id));
  if (
    orderedIds.length !== photos.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => known.has(id))
  ) {
    return { error: "Photo list is out of date. Refresh and try again." };
  }

  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.profileDocument.update({ where: { id }, data: { order: i } }))
  );
  const first = photos.find((p) => p.id === orderedIds[0]);
  await prisma.profile.update({ where: { id: profileId }, data: { photoUrl: first?.url ?? null } });

  revalidatePath(`/dashboard/admin/profiles/${profileId}/edit`);
  revalidatePath(`/dashboard/service/profiles/${profileId}`);
  revalidatePath(`/dashboard/service/profiles`);
  revalidatePath(`/dashboard/admin/profiles`);
  return { error: null };
}
