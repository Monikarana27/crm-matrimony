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
    orderBy: { order: "asc" },
  });
}

export async function deleteProfileDocumentAction(id: string, profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!canManagePhotos(session.user.role)) {
    return { error: "You do not have permission to upload photos for this profile." };
  }
  await prisma.profileDocument.delete({ where: { id } });
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
    orderBy: { order: "asc" },
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
