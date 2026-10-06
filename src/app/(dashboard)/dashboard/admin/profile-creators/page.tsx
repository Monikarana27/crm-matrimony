import { redirect } from "next/navigation";

// The profile team now lives on the Staff History page (Profile team tab).
export default function ProfileCreatorsRedirect() {
  redirect("/dashboard/admin/staff-history?team=profile");
}
