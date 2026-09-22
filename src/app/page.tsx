import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { ROLE_ROUTE_MAP } from "@/lib/permissions/role-routes";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const route = ROLE_ROUTE_MAP[session.user.role] ?? session.user.role.toLowerCase();
  redirect(`/dashboard/${route}`);
}