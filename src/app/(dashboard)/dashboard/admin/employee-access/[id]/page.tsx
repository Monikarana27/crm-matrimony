import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { getEmployeeAccess } from "@/actions/employees/employee-permission.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { PERMISSION_MODULES } from "@/lib/permissions/permission-modules";
import { EmployeeAccessDetail } from "./employee-access-detail";

export default async function EmployeeAccessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getEmployeeAccess(id);
  } catch {
    notFound();
  }

  const { employee, permissions, rolePermissionIds, employeeGrantByPermissionId } = data;

  const rolePermissionIdList = Array.from(rolePermissionIds);
  const extraGrants = Array.from(employeeGrantByPermissionId.values()).map(
    (g: { permissionId: string; note: string | null; grantedBy: { name: string } | null }) => ({
      permissionId: g.permissionId,
      note: g.note,
      grantedByName: g.grantedBy?.name ?? null,
    })
  );

  const totalPossible = permissions.length;
  const totalGranted = rolePermissionIdList.length + extraGrants.length;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard/admin/employee-access">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Employee Access
          </Link>
        </Button>
        <DashboardHero
          title={employee.name}
          subtitle={`${employee.email} · Manage additional page access on top of the ${employee.role} role.`}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">From role</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{rolePermissionIdList.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Extra granted</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-emerald-600">
            {extraGrants.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-medium">Total access</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">
            {totalGranted}
            <span className="text-sm font-normal text-muted-foreground">/{totalPossible}</span>
          </p>
        </div>
      </div>

      <EmployeeAccessDetail
        employeeId={employee.id}
        permissions={permissions}
        rolePermissionIdList={rolePermissionIdList}
        extraGrants={extraGrants}
      />
    </div>
  );
}
