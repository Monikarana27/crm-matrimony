/**
 * Maps a role to the role(s) eligible to be ITS manager (one level up
 * in the hierarchy). Used both by the employee create/edit form's
 * "Reports To" field and by the Team Hierarchy bulk-assignment page,
 * so both stay in sync from a single source of truth.
 */
export const MANAGER_ROLE_MAP: Record<string, string[]> = {
  SALES: ["SALES_TL", "SERVICE_MANAGER"],
  SALES_TL: ["SALES_MANAGER", "SERVICE_MANAGER"],
  SALES_MANAGER: ["ADMIN", "SUPER_ADMIN"],
  SERVICE: ["SERVICE_TL", "SERVICE_MANAGER"],
  SERVICE_TL: ["SERVICE_MANAGER"],
  SERVICE_MANAGER: ["ADMIN", "SUPER_ADMIN"],
};

/**
 * Roles that have a "Select Role" entry on the Team Hierarchy page —
 * i.e. roles that report to someone and can be bulk-assigned.
 */
export const ASSIGNABLE_ROLES = ["SALES", "SALES_TL", "SERVICE", "SERVICE_TL"] as const;

export const ROLE_LABELS: Record<string, string> = {
  SALES: "Sales",
  SALES_TL: "Sales Team Lead",
  SALES_MANAGER: "Sales Manager",
  SERVICE: "Service",
  SERVICE_TL: "Service Team Lead",
  SERVICE_MANAGER: "Sales & Service Manager",
};