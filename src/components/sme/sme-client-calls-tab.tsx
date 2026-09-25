import { auth } from "@/lib/auth/auth";
import { getSmeClientCallData } from "@/lib/stats/sme-client-reviews";
import { getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { SmeClientCalls } from "@/components/sme/sme-client-calls";

export async function SmeClientCallsTab() {
  const session = await auth();
  const [{ rows, ratings }, employees] = await Promise.all([
    getSmeClientCallData(),
    getActiveServiceEmployees(),
  ]);
  const list = employees.filter((e) => e.id !== session?.user?.id);
  return <SmeClientCalls rows={rows} ratings={ratings} employees={list} />;
}
