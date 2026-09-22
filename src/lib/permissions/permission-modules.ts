import type { PermissionAction } from "@prisma/client";

/**
 * These are the REAL modules from prisma/seed-permissions.ts — the
 * actual seed that populates your Permission table. Do not add a
 * module here unless it's also in that file's MODULES array, or the
 * Additional Access screen will show permissions that don't exist in
 * the database and grants will silently fail to look anything up.
 *
 * seed-permissions.ts creates all 6 actions for every module (not
 * just the ones a role currently uses), so all 6 are listed here too.
 */
const ALL_ACTIONS: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "APPROVE", "ASSIGN", "FULL"];

export const PERMISSION_MODULES: { module: string; label: string; actions: PermissionAction[] }[] = [
  { module: "Leads", label: "Leads", actions: ALL_ACTIONS },
  { module: "Conversion", label: "Lead Conversion", actions: ALL_ACTIONS },
  { module: "ProfileCreation", label: "Profile Creation", actions: ALL_ACTIONS },
  { module: "Profiles", label: "Profiles", actions: ALL_ACTIONS },
  { module: "Service", label: "Service", actions: ALL_ACTIONS },
  { module: "Employees", label: "Employees", actions: ALL_ACTIONS },
  { module: "Settings", label: "Settings", actions: ALL_ACTIONS },
  { module: "Payments", label: "Payments", actions: ALL_ACTIONS },
];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  VIEW: "View",
  CREATE: "Create",
  EDIT: "Edit",
  ASSIGN: "Assign",
  APPROVE: "Approve",
  FULL: "Full access",
};
