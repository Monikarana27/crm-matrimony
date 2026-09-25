import { getMyFollowUps } from "@/lib/stats/sme-follow-ups";
import { MyFollowUpsCard } from "@/components/sme/my-follow-ups-card";

export async function MyFollowUps() {
  const items = await getMyFollowUps();
  if (items.length === 0) return null;
  return <MyFollowUpsCard items={items} />;
}
