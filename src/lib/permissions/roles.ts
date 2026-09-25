export const ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "PROFILE_CREATOR", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "HR", "SME", "SYSTEM"] as const;
export type Role = (typeof ROLES)[number];

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard/admin/leads": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/admin/subscriptions": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  "/dashboard/admin/payments": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/admin/missed-weekly-shares": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  "/dashboard/admin/non-connected-clients": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  "/dashboard/admin/overdue-welcome-calls": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  "/dashboard/admin/profiles": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "PROFILE_CREATOR", "SME"],
  "/dashboard/admin/pp-validation": ["SUPER_ADMIN", "ADMIN"],
  "/dashboard/sales/pp-validation": ["SALES", "SALES_TL", "SALES_MANAGER", "SERVICE_MANAGER"],
  "/dashboard/admin/meetings": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/admin/attendance-report": ["SUPER_ADMIN", "ADMIN", "HR"],
  "/dashboard/admin/newly-paid-clients": ["SUPER_ADMIN", "ADMIN"],
  "/dashboard/admin/ongoing-services": ["SUPER_ADMIN", "ADMIN"],
  "/dashboard/admin/expired-clients": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/admin": ["SUPER_ADMIN", "ADMIN"],
  "/dashboard/sales": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE_MANAGER"],
  "/dashboard/service": ["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SALES_MANAGER"],
  "/dashboard/profile-creator": ["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/hr": ["SUPER_ADMIN", "HR"],
  "/dashboard/workspace": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "PROFILE_CREATOR", "HR", "SME"],
  "/dashboard/welcome-calls": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  "/dashboard/discounts": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"],
  "/dashboard/sme": ["SUPER_ADMIN", "ADMIN", "SME"],
  "/dashboard/profile-search": ["SUPER_ADMIN", "ADMIN", "SALES", "SALES_TL", "SALES_MANAGER", "PROFILE_CREATOR", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "HR", "SME"],
};

/**
 * Maps a route prefix to the permission module that unlocks it via
 * per-employee "extra access" grants (Employee Access screen), on
 * top of whatever ROUTE_ACCESS already allows for their role. Kept
 * separate from EXTRA_ACCESS_NAV_ITEMS in config/navigation.ts to
 * avoid a circular import between roles.ts and navigation.ts.
 */
export const EXTRA_ACCESS_ROUTES: Record<string, string> = {
  "/dashboard/admin/leads": "Leads",
  "/dashboard/admin/profiles": "Profiles",
  "/dashboard/admin/service-overview": "Service",
  "/dashboard/admin/employees": "Employees",
  "/dashboard/admin/settings": "Settings",
  "/dashboard/admin/payments": "Payments",
};

export function canAccessRoute(role: Role, path: string, extraModules: string[] = []): boolean {
  const sortedKeys = Object.keys(ROUTE_ACCESS).sort((a, b) => b.length - a.length);
  const matchedKey = sortedKeys.find((route) => path.startsWith(route));
  if (matchedKey && ROUTE_ACCESS[matchedKey].includes(role)) {
    return true;
  }

  const extraKeys = Object.keys(EXTRA_ACCESS_ROUTES).sort((a, b) => b.length - a.length);
  const extraMatch = extraKeys.find((route) => path.startsWith(route));
  if (extraMatch && extraModules.includes(EXTRA_ACCESS_ROUTES[extraMatch])) {
    return true;
  }

  return false;
}
