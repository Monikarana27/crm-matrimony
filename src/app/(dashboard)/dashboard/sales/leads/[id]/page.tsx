import { redirect } from "next/navigation";
import { resolveLeadProfileAction } from "@/actions/leads/lead-profile-link.actions";

// Retired lead detail page: go to the lead's profile when one exists, else the leads list.
export default async function LeadDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let profileId: string | null = null;
  try {
    ({ profileId } = await resolveLeadProfileAction(id));
  } catch {
    profileId = null;
  }

  if (profileId) redirect(`/dashboard/admin/profiles/${profileId}`);
  redirect("/dashboard/sales/leads");
}
