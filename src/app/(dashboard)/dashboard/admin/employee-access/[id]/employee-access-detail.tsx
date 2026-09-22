"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Contact,
  Handshake,
  UserSquare2,
  HeartHandshake,
  Users,
  Settings as SettingsIcon,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  grantEmployeeAccess,
  revokeEmployeeAccess,
} from "@/actions/employees/employee-permission.actions";
import { PERMISSION_MODULES, ACTION_LABELS } from "@/lib/permissions/permission-modules";
import type { PermissionAction } from "@prisma/client";

type PermissionRow = {
  id: string;
  module: string;
  action: PermissionAction;
};

type ExtraGrant = {
  permissionId: string;
  note: string | null;
  grantedByName: string | null;
};

const MODULE_META: Record<string, { icon: LucideIcon; accent: string; iconBg: string; iconText: string }> = {
  Leads: { icon: Contact, accent: "border-l-blue-400", iconBg: "bg-blue-50", iconText: "text-blue-600" },
  Conversion: { icon: Handshake, accent: "border-l-indigo-400", iconBg: "bg-indigo-50", iconText: "text-indigo-600" },
  ProfileCreation: { icon: UserSquare2, accent: "border-l-amber-400", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  Profiles: { icon: UserSquare2, accent: "border-l-emerald-400", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
  Service: { icon: HeartHandshake, accent: "border-l-teal-400", iconBg: "bg-teal-50", iconText: "text-teal-600" },
  Employees: { icon: Users, accent: "border-l-violet-400", iconBg: "bg-violet-50", iconText: "text-violet-600" },
  Settings: { icon: SettingsIcon, accent: "border-l-gray-400", iconBg: "bg-gray-50", iconText: "text-gray-600" },
  Payments: { icon: CreditCard, accent: "border-l-rose-400", iconBg: "bg-rose-50", iconText: "text-rose-600" },
};

export function EmployeeAccessDetail({
  employeeId,
  permissions,
  rolePermissionIdList,
  extraGrants,
}: {
  employeeId: string;
  permissions: PermissionRow[];
  rolePermissionIdList: string[];
  extraGrants: ExtraGrant[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rolePermissionIds = useMemo(() => new Set(rolePermissionIdList), [rolePermissionIdList]);
  const [extraGrantedIds, setExtraGrantedIds] = useState(
    () => new Set(extraGrants.map((g) => g.permissionId))
  );

  const permissionIdByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of permissions) {
      map.set(`${p.module}:${p.action}`, p.id);
    }
    return map;
  }, [permissions]);

  function toggle(permissionId: string, nextChecked: boolean) {
    setPendingId(permissionId);
    startTransition(async () => {
      if (nextChecked) {
        const res = await grantEmployeeAccess(employeeId, permissionId);
        if (res.ok) {
          setExtraGrantedIds((prev) => new Set(prev).add(permissionId));
        }
      } else {
        await revokeEmployeeAccess(employeeId, permissionId);
        setExtraGrantedIds((prev) => {
          const next = new Set(prev);
          next.delete(permissionId);
          return next;
        });
      }
      setPendingId(null);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {PERMISSION_MODULES.map((mod) => {
        const meta = MODULE_META[mod.module] ?? {
          icon: SettingsIcon,
          accent: "border-l-gray-300",
          iconBg: "bg-gray-50",
          iconText: "text-gray-500",
        };
        const Icon = meta.icon;

        const grantedCount = mod.actions.filter((action) => {
          const id = permissionIdByKey.get(`${mod.module}:${action}`);
          return id && (rolePermissionIds.has(id) || extraGrantedIds.has(id));
        }).length;

        return (
          <Card
            key={mod.module}
            className={cn("overflow-hidden border-l-4 py-0 gap-0", meta.accent)}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30 py-3">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", meta.iconBg)}>
                  <Icon className={cn("h-4 w-4", meta.iconText)} />
                </span>
                <span className="text-sm font-semibold">{mod.label}</span>
              </div>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[11px] font-medium text-muted-foreground"
              >
                {grantedCount}/{mod.actions.length}
              </Badge>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {mod.actions.map((action) => {
                const permissionId = permissionIdByKey.get(`${mod.module}:${action}`);
                if (!permissionId) return null;

                const fromRole = rolePermissionIds.has(permissionId);
                const isExtra = extraGrantedIds.has(permissionId);
                const checked = fromRole || isExtra;
                const busy = isPending && pendingId === permissionId;

                return (
                  <label
                    key={action}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-2 transition-colors",
                      !fromRole && "hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={checked}
                        disabled={fromRole || busy}
                        onCheckedChange={(v: boolean | "indeterminate") => toggle(permissionId, Boolean(v))}
                      />
                      <span className="text-sm">{ACTION_LABELS[action]}</span>
                    </div>
                    {fromRole && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                        via role
                      </Badge>
                    )}
                    {!fromRole && isExtra && (
                      <Badge className="h-4 border-emerald-200 bg-emerald-100 px-1.5 text-[10px] text-emerald-700">
                        extra
                      </Badge>
                    )}
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
