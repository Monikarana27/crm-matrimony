import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getProfileById } from "@/actions/profiles/profile.actions";
import { SharedProfilesTable } from "@/components/shared/shared-profiles-table";
import { getSharedProfilesForClient } from "@/actions/profile-shares/profile-share.actions";
import { prisma } from "@/lib/db/prisma";
import { CreateOfferDialog } from "@/components/shared/create-offer-dialog";
import { BiodataDownloadButton } from "@/components/shared/biodata-download-button";
import { SavedBanner } from "@/components/shared/saved-banner";
import { Row, Section, ProfileDetailSections } from "@/components/shared/profile-detail-sections";
import { getPaymentHistory } from "@/lib/stats/payment-history";
import { PaymentHistorySection } from "@/components/subscriptions/payment-history-section";
import { auth } from "@/lib/auth/auth";

export default async function ViewProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileById(id);

  if (!profile) {
    notFound();
  }

  const pp = profile.partnerPreference;
  const photos = profile.documents ?? [];

  const activeSubscription = await prisma.subscription.findFirst({
    where: { profileId: profile.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  const sharedProfiles = await getSharedProfilesForClient(profile.id);
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } });
  const paymentHistory = await getPaymentHistory(profile.id);
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <SavedBanner />
      <div className="flex items-start justify-between gap-4">
        <DashboardHero
          title={profile.name}
          subtitle={`Profile ID: ${profile.profileCode}`}
        />
        <div className="flex items-center gap-2">
          <BiodataDownloadButton profileId={profile.id} />
          <CreateOfferDialog profileId={profile.id} plans={plans} />
          <Button asChild>
            <Link href={`/dashboard/admin/profiles/${profile.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{profile.status}</Badge>
        <Badge variant="outline">{profile.approvalStatus}</Badge>
        {profile.assignedTo && (
          <Badge variant="outline">Assigned to {profile.assignedTo.name}</Badge>
        )}
      </div>

      {photos.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">PHOTOS</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {photos.map((doc, idx) => (
                <div key={doc.id} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={doc.url} className="h-full w-full object-cover" alt="" />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Section title="SOURCE & CONTACT">
        <Row label="Source" value={profile.source} />
        <Row label="Source Info" value={profile.sourceInfo} />
        <Row label="Email" value={profile.email} />
        <Row label="Alt Email" value={profile.altEmail} />
        <Row label="Phone" value={profile.phone} />
        <Row label="Alt Phone" value={profile.altPhone} />
        <Row label="Contact Person" value={profile.contactPerson} />
        <Row label="Creating For" value={profile.creatingFor} />
      </Section>

      <ProfileDetailSections profile={profile} />

      <PaymentHistorySection
        profileId={profile.id}
        profileName={profile.name}
        entries={paymentHistory}
        isAdmin={isAdmin}
      />

      <SharedProfilesTable rows={sharedProfiles} clientName={profile.name} clientProfileId={profile.id} clientId={profile.id} />
    </div>
  );
}
