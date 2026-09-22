import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { resolveLeadProfileAction } from "@/actions/leads/lead-profile-link.actions";

// Retired lead detail page. Old links (welcome-call tables, notifications) go to the
// lead's profile when one exists, otherwise back to the leads list.
export default async function LeadDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = String(session?.user?.role ?? "");

  let profileId: string | null = null;
  try {
    ({ profileId } = await resolveLeadProfileAction(id));
  } catch {
    profileId = null;
  }

  if (profileId) redirect(`/dashboard/admin/profiles/${profileId}`);
  redirect(role.startsWith("SALES") ? "/dashboard/sales/leads" : "/dashboard/admin/leads");
}
