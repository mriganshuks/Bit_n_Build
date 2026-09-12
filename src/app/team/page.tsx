import { getTeamState } from "@/lib/demo-data";
import TeamClient from "@/components/team-client";
import { cookies } from "next/headers";

export default async function TeamPage() {
  const cookieStore = await cookies();
  return (
    <TeamClient initialTeam={getTeamState(cookieStore.has("pramaan_aman_accepted"))} />
  );
}
