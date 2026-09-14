import CandidateClient from "@/components/candidate-client";
export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ team?: string }> }) { const { id } = await params; const { team } = await searchParams; return <CandidateClient candidateId={id} teamId={team} />; }
