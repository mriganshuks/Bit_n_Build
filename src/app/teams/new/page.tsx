import { CreateTeamClient } from "@/components/team-workspace-client";
export default async function NewTeamPage({ searchParams }: { searchParams: Promise<{ hackathon?: string }> }) { const { hackathon } = await searchParams; return hackathon ? <CreateTeamClient hackathonId={hackathon} /> : <main className="mx-auto max-w-3xl px-6 py-10">Choose a hackathon before creating a team.</main>; }
