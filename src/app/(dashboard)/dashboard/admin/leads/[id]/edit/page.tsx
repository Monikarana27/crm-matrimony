import { notFound } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LeadForm } from "../../lead-form";
import { getLeadById, updateLeadAction } from "@/actions/leads/lead.actions";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const boundAction = updateLeadAction.bind(null, id);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Edit Lead"
        subtitle={`Update details for ${lead.name}.`}
      />
      <Button variant="outline" asChild>
        <Link
          href={`/dashboard/workspace?attachType=LEAD&attachId=${lead.id}&attachLabel=${encodeURIComponent(
            `${lead.name} (${lead.phone})`
          )}`}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Mention in Workspace
        </Link>
      </Button>
      <LeadForm
        mode="edit"
        defaultValues={{
          ...lead,
          followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 10) : null,
        }}
        action={boundAction}
      />
    </div>
  );
}