"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Heart, Users, Shield, UserPlus, Settings } from "lucide-react";
import type { Role } from "@/lib/permissions/roles";

const PALETTE = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-500",
  "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
  "bg-pink-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const ROLE_BADGE: Partial<Record<Role, { icon: typeof TrendingUp; bg: string }>> = {
  SALES: { icon: TrendingUp, bg: "bg-blue-600" },
  SALES_TL: { icon: TrendingUp, bg: "bg-blue-600" },
  SALES_MANAGER: { icon: TrendingUp, bg: "bg-blue-600" },
  SERVICE: { icon: Heart, bg: "bg-emerald-600" },
  SERVICE_TL: { icon: Heart, bg: "bg-emerald-600" },
  SERVICE_MANAGER: { icon: Heart, bg: "bg-emerald-600" },
  HR: { icon: Users, bg: "bg-violet-600" },
  PROFILE_CREATOR: { icon: UserPlus, bg: "bg-cyan-600" },
  ADMIN: { icon: Shield, bg: "bg-amber-600" },
  SUPER_ADMIN: { icon: Shield, bg: "bg-amber-600" },
  SYSTEM: { icon: Settings, bg: "bg-gray-500" },
};

export function EmployeeAvatar({
  name,
  role,
  className = "h-8 w-8",
}: {
  name: string;
  role?: Role;
  className?: string;
}) {
  const badge = role ? ROLE_BADGE[role] : undefined;
  const Icon = badge?.icon;

  return (
    <div className="relative inline-block">
      <Avatar className={className}>
        <AvatarFallback className={`${colorForName(name)} text-white font-medium`}>
          {initialsFor(name)}
        </AvatarFallback>
      </Avatar>
      {Icon && badge && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background ${badge.bg}`}
        >
          <Icon className="h-2 w-2 text-white" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
