// Removes the dummy profiles created by scripts/seed-dummy-users.mjs, along
// with the dummy hackathon and any teams/invitations/challenges/attempts they
// ended up in during manual testing.
//
// Usage: node scripts/cleanup-dummy-users.mjs
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

if (!uri) throw new Error("MONGODB_URI is required in .env.local to clean up dummy users.");

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

  const users = await database.collection("users").find({ email: /^dummy\./ }).project({ _id: 1 }).toArray();
  const userIds = users.map((user) => user._id);

  const hackathons = await database.collection("hackathons").find({ name: "Dummy Test Hackathon" }).project({ _id: 1 }).toArray();
  const hackathonIds = hackathons.map((hackathon) => hackathon._id);

  const teams = await database.collection("teams").find({ hackathonId: { $in: hackathonIds } }).project({ _id: 1 }).toArray();
  const teamIds = teams.map((team) => team._id);

  const results = await Promise.all([
    database.collection("integrityevents").deleteMany({ profileId: { $in: userIds } }),
    database.collection("assessmentattempts").deleteMany({ profileId: { $in: userIds } }),
    database.collection("skillchallenges").deleteMany({ $or: [{ candidateId: { $in: userIds } }, { createdBy: { $in: userIds } }] }),
    database.collection("invitations").deleteMany({ $or: [{ candidateId: { $in: userIds } }, { sentBy: { $in: userIds } }] }),
    database.collection("teams").deleteMany({ _id: { $in: teamIds } }),
    database.collection("hackathons").deleteMany({ _id: { $in: hackathonIds } }),
    database.collection("users").deleteMany({ _id: { $in: userIds } }),
  ]);

  console.log(`Removed ${results[6].deletedCount} dummy profiles, ${hackathonIds.length} dummy hackathon(s), and their related teams/invitations/challenges/attempts.`);
} finally {
  await mongoose.disconnect();
}
