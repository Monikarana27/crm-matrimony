import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getProfileById } from "@/actions/profiles/profile.actions";
import { getProfileDocuments } from "@/actions/documents/document.actions";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { BiodataDownloadButton } from "@/components/shared/biodata-download-button";
import { SharedProfilesTable } from "@/components/shared/shared-profiles-table";
import { getSharedProfilesForClient } from "@/actions/profile-shares/profile-share.actions";
import { ProfileDetailSections } from "@/components/shared/profile-detail-sections";
import { prisma } from "@/lib/db/prisma";

export default async function ServiceProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();
  const docs = await getProfileDocuments(id);

  const activeSubscription = await prisma.subscription.findFirst({
    where: { profileId: profile.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  const sharedProfiles = await getSharedProfilesForClient(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <DashboardHero
          title={profile.name}
          subtitle={`Profile ID: ${profile.profileCode}`}
        />
        <div className="flex items-center gap-2">
          <BiodataDownloadButton profileId={id} variant="default" />
          <Button asChild>
            <Link href={`/dashboard/admin/profiles/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      <ProfileDetailSections profile={profile} />

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-sm font-semibold">Photos & Documents</h2>
        <DocumentUploader profileId={id} initialDocs={docs} />
      </div>

      <SharedProfilesTable rows={sharedProfiles} clientName={profile.name} clientProfileId={profile.id} clientId={profile.id} />
    </div>
  );
}
