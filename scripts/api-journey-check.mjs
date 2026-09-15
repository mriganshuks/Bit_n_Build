import fs from "node:fs";
import mongoose from "mongoose";

const baseUrl = process.env.PRAMAAN_BASE_URL ?? "http://localhost:3000";
const token = `pramaan-api-${Date.now()}`;
const created = { profiles: [], hackathonId: null, teamId: null, challengeId: null };

function session() {
  let cookie = "";
  return async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
    });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const profileCookie = setCookie.find((value) => value.startsWith("pramaan_profile_id="));
    if (profileCookie) cookie = profileCookie.split(";", 1)[0];
    const body = await response.json();
    if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path}: ${body.error?.message ?? response.statusText}`);
    return body;
  };
}

async function cleanup() {
  let uri = process.env.MONGODB_URI;
  if (!uri && fs.existsSync(".env.local")) {
    const raw = fs.readFileSync(".env.local", "utf8");
    uri = raw.split(/\r?\n/).find((line) => line.startsWith("MONGODB_URI="))?.split("=").slice(1).join("=").replace(/^"|"$/g, "");
  }
  if (!uri) return;
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10_000 });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => undefined);
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  if (lastError) throw lastError;
  const database = mongoose.connection.db;
  if (!database) {
    await mongoose.disconnect();
    return;
  }
  const profileIds = created.profiles.map((id) => new mongoose.Types.ObjectId(id));
  if (!profileIds.length) {
    await mongoose.disconnect();
    return;
  }
  const testHackathons = await database.collection("hackathons").find({ createdBy: { $in: profileIds } }).project({ _id: 1 }).toArray();
  const hackathonIds = [...new Set([created.hackathonId, ...testHackathons.map((hackathon) => hackathon._id.toString())].filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
  const testTeams = await database.collection("teams").find({ hackathonId: { $in: hackathonIds } }).project({ _id: 1 }).toArray();
  const teamIds = [...new Set([created.teamId, ...testTeams.map((team) => team._id.toString())].filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
  await Promise.all([
    database.collection("integrityevents").deleteMany({ profileId: { $in: profileIds } }),
    database.collection("assessmentattempts").deleteMany({ profileId: { $in: profileIds } }),
    database.collection("skillchallenges").deleteMany({ $or: [{ candidateId: { $in: profileIds } }, { createdBy: { $in: profileIds } }] }),
    database.collection("invitations").deleteMany({ $or: [{ candidateId: { $in: profileIds } }, { sentBy: { $in: profileIds } }] }),
    database.collection("teams").deleteMany({ _id: { $in: teamIds } }),
    database.collection("hackathons").deleteMany({ _id: { $in: hackathonIds } }),
    database.collection("users").deleteMany({ _id: { $in: profileIds } }),
  ]);
  await mongoose.disconnect();
}

try {
  const owner = session();
  const candidate = session();
  const ownerProfile = await owner("/api/profiles", { method: "POST", body: JSON.stringify({ displayName: "API Journey Owner", email: `${token}-owner@example.test`, handle: `${token.replaceAll("-", "_")}_owner`.slice(0, 32), headline: "Team lead" }) });
  created.profiles.push(ownerProfile.profile.id);
  const candidateProfile = await candidate("/api/profiles", { method: "POST", body: JSON.stringify({ displayName: "API Journey Candidate", email: `${token}-candidate@example.test`, handle: `${token.replaceAll("-", "_")}_candidate`.slice(0, 32), headline: "JavaScript builder" }) });
  created.profiles.push(candidateProfile.profile.id);

  await owner("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "JavaScript" }) });
  await candidate("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "JavaScript" }) });
  await candidate("/api/profile/evidence", { method: "POST", body: JSON.stringify({ source: "GITHUB", url: "https://github.com/example/pramaan-api-check", description: "A public JavaScript project used only for this disposable API check.", skills: ["JavaScript"] }) });

  const assessment = await candidate("/api/assessment/start", { method: "POST", body: JSON.stringify({ skill: "JavaScript", difficulty: "intermediate", consent: true }) });
  const fetchedAttempt = await candidate(`/api/assessment/attempt?id=${assessment.attempt.id}`);
  if (fetchedAttempt.attempt.questions.some((question) => "correctOption" in question)) throw new Error("Assessment answer key reached the client payload.");
  await candidate("/api/assessment/integrity", { method: "POST", body: JSON.stringify({ assessmentId: assessment.attempt.id, events: [{ type: "WINDOW_FOCUS", severity: "LOW" }] }) });
  await candidate("/api/assessment/submit", { method: "POST", body: JSON.stringify({ assessmentId: assessment.attempt.id, answers: {}, codingSubmission: "", timeout: false }) });

  const now = Date.now();
  const hackathon = await owner("/api/hackathons", { method: "POST", body: JSON.stringify({ name: `API Journey ${token}`, description: "A disposable hackathon created to exercise the complete PRAMAAN API journey.", location: "Remote", startsAt: new Date(now + 86_400_000).toISOString(), endsAt: new Date(now + 172_800_000).toISOString() }) });
  created.hackathonId = hackathon.hackathon.id;
  await candidate(`/api/hackathons/${created.hackathonId}/join`, { method: "POST" });
  const team = await owner("/api/teams", { method: "POST", body: JSON.stringify({ hackathonId: created.hackathonId, name: `API Team ${token}`.slice(0, 80), description: "A disposable API journey team.", requiredSkills: ["JavaScript"], capacity: 3 }) });
  created.teamId = team.team.id;

  const candidates = await owner(`/api/teams/${created.teamId}/candidates`);
  if (!candidates.candidates.some((item) => item.id === candidateProfile.profile.id)) throw new Error("Candidate discovery did not return the evidence-backed candidate.");
  await owner(`/api/teams/${created.teamId}/invitations`, { method: "POST", body: JSON.stringify({ candidateId: candidateProfile.profile.id, message: "A disposable invitation for the API journey." }) });
  const invitations = await candidate("/api/invitations");
  if (!invitations.invitations.length) throw new Error("Candidate invitation was not visible.");

  const challenge = await owner(`/api/teams/${created.teamId}/challenges`, { method: "POST", body: JSON.stringify({ candidateId: candidateProfile.profile.id, skill: "JavaScript" }) });
  created.challengeId = challenge.challenge.id;
  const challengeInbox = await candidate("/api/challenges");
  if (!challengeInbox.challenges.some((item) => item.id === created.challengeId && item.state === "SENT")) throw new Error("Candidate challenge was not visible in the dashboard inbox.");
  await candidate(`/api/challenges/${created.challengeId}/start`, { method: "POST", body: JSON.stringify({ consent: true }) });
  const candidateChallenge = await candidate(`/api/challenges/${created.challengeId}`);
  if (candidateChallenge.challenge.questions.some((question) => "correctOption" in question)) throw new Error("Challenge answer key reached the candidate payload.");
  await candidate(`/api/challenges/${created.challengeId}/integrity`, { method: "POST", body: JSON.stringify({ events: [{ type: "WINDOW_FOCUS", severity: "LOW" }] }) });
  await candidate(`/api/challenges/${created.challengeId}/submit`, { method: "POST", body: JSON.stringify({ answers: {}, timeout: false }) });
  const teamChallenges = await owner(`/api/teams/${created.teamId}/challenges/list`);
  if (!teamChallenges.challenges.some((item) => item.id === created.challengeId && item.canDecide)) throw new Error("Completed challenge was not available for a team decision.");
  await owner(`/api/challenges/${created.challengeId}/decision`, { method: "POST", body: JSON.stringify({ decision: "ACCEPT" }) });
  const candidateTeams = await candidate("/api/teams");
  if (!candidateTeams.teams.some((item) => item.id === created.teamId)) throw new Error("Accepting a challenge did not form the team membership.");

  console.log("PASS profile → evidence → assessment → verification → hackathon → discovery → challenge → team formation API journey.");
} finally {
  await cleanup().catch((error) => {
    console.error("Cleanup failed for disposable API journey data:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
