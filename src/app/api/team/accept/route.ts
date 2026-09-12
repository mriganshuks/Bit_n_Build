import { acceptCandidate } from "@/lib/demo-data";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { candidateId?: unknown };
    const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
    const response = NextResponse.json(acceptCandidate(candidateId));
    response.cookies.set("pramaan_aman_accepted", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept candidate.";
    return Response.json({ error: message }, { status: 400 });
  }
}
