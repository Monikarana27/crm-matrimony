const VARIANT_STYLES = {
  default: {
    gradient: "from-primary via-primary to-[oklch(0.271_0.105_12.094)]",
    badge: null as string | null,
  },
  tl: {
    gradient: "from-amber-600 via-amber-500 to-[oklch(0.271_0.105_12.094)]",
    badge: "Team Lead View",
  },
  manager: {
    gradient: "from-violet-700 via-fuchsia-600 to-amber-500",
    badge: "Manager View",
  },
} as const;

export function heroVariantForRole(role: string): keyof typeof VARIANT_STYLES {
  if (role.endsWith("_MANAGER")) return "manager";
  if (role.endsWith("_TL")) return "tl";
  return "default";
}

export function DashboardHero({
  title,
  subtitle,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  variant?: keyof typeof VARIANT_STYLES;
}) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles.gradient} px-8 py-10 shadow-lg shadow-primary/10`}
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      <div className="relative">
        {styles.badge && (
          <span className="mb-3 inline-block rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {styles.badge}
          </span>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-primary-foreground/75">{subtitle}</p>
      </div>
    </div>
  );
}
