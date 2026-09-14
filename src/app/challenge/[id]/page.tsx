import ChallengeClient from "@/components/challenge-client";
export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ChallengeClient id={id} />; }
