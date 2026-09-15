import fs from "node:fs";
import mongoose from "mongoose";

let uri = process.env.MONGODB_URI;
if (!uri && fs.existsSync(".env.local")) {
  const raw = fs.readFileSync(".env.local", "utf8");
  uri = raw
    .split(/\r?\n/)
    .find((line) => line.startsWith("MONGODB_URI="))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^"|"$/g, "");
}

if (!uri) throw new Error("MONGODB_URI is required for the integration check.");

const token = `pramaan-integration-${Date.now()}`;
let collections;

async function connectWithRetry() {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10000 });
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => undefined);
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

try {
  await connectWithRetry();
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB did not expose a database connection.");

  collections = {
    profiles: database.collection("users"),
    attempts: database.collection("assessmentattempts"),
    events: database.collection("integrityevents"),
    hackathons: database.collection("hackathons"),
    teams: database.collection("teams"),
    invitations: database.collection("invitations"),
    challenges: database.collection("skillchallenges"),
  };

  const owner = {
    _id: new mongoose.Types.ObjectId(),
    displayName: `${token} owner`,
    email: `${token}-owner@example.test`,
    handle: `${token}-owner`,
    skills: [{ name: "JavaScript", normalizedName: "javascript", status: "VERIFIED", assessmentScore: 92, evidenceCount: 1 }],
    integrationToken: token,
  };
  const candidate = {
    _id: new mongoose.Types.ObjectId(),
    displayName: `${token} candidate`,
    email: `${token}-candidate@example.test`,
    handle: `${token}-candidate`,
    availableForTeams: true,
    skills: [{ name: "JavaScript", normalizedName: "javascript", status: "VERIFIED", assessmentScore: 88, evidenceCount: 1 }],
    integrationToken: token,
  };
  await collections.profiles.insertMany([owner, candidate]);

  const hackathon = { _id: new mongoose.Types.ObjectId(), name: token, description: "Disposable integration check", location: "Test", startsAt: new Date(), endsAt: new Date(Date.now() + 86_400_000), createdBy: owner._id, participantIds: [owner._id, candidate._id], integrationToken: token };
  const team = { _id: new mongoose.Types.ObjectId(), hackathonId: hackathon._id, name: token, requiredSkills: ["JavaScript"], capacity: 3, members: [{ profileId: owner._id, role: "Lead", status: "OWNER" }], integrationToken: token };
  const invitation = { _id: new mongoose.Types.ObjectId(), teamId: team._id, candidateId: candidate._id, sentBy: owner._id, status: "PENDING", integrationToken: token };
  const attempt = { _id: new mongoose.Types.ObjectId(), profileId: candidate._id, skill: "JavaScript", difficulty: "intermediate", state: "COMPLETED", startedAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000), submittedAt: new Date(), questions: [{ id: "q1", prompt: "Test?", topic: "test", options: [{ id: "A", text: "A" }, { id: "B", text: "B" }, { id: "C", text: "C" }, { id: "D", text: "D" }], correctOption: "A", explanation: "A", fingerprint: token }], codingProblem: { id: "test" }, generatedBy: "fallback", mcqScore: 100, finalScore: 100, integrityScore: 100, riskLevel: "LOW", verificationStatus: "VERIFIED", integrationToken: token };
  const event = { _id: new mongoose.Types.ObjectId(), targetId: attempt._id, targetType: "ASSESSMENT", profileId: candidate._id, type: "WINDOW_BLUR", severity: "LOW", timestamp: new Date(), integrationToken: token };
  const challenge = { _id: new mongoose.Types.ObjectId(), teamId: team._id, candidateId: candidate._id, createdBy: owner._id, skill: "JavaScript", state: "COMPLETED", questions: attempt.questions, generatedBy: "fallback", score: 100, integrityScore: 100, riskLevel: "LOW", decision: "ACCEPTED", integrationToken: token };
  await Promise.all([
    collections.hackathons.insertOne(hackathon),
    collections.teams.insertOne(team),
    collections.invitations.insertOne(invitation),
    collections.attempts.insertOne(attempt),
    collections.events.insertOne(event),
    collections.challenges.insertOne(challenge),
  ]);
  console.log("PASS created profile, assessment, integrity event, hackathon, team, invitation, and challenge.");
} finally {
  if (collections) await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({ integrationToken: token })));
  await mongoose.disconnect();
}
