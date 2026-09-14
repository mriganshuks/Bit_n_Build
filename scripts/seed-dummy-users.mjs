// Seeds a handful of realistic dummy profiles (plus one dummy hackathon) into
// MongoDB for manual/local testing of the team-formation and assessment flows.
//
// Usage: node scripts/seed-dummy-users.mjs
//
// Safe to re-run: profiles are upserted by email, so running this again just
// refreshes the same dummy accounts instead of creating duplicates.
import fs from "node:fs";
import mongoose from "mongoose";

const raw = fs.readFileSync(".env.local", "utf8");
const uri = raw
  .split(/\r?\n/)
  .find((line) => line.startsWith("MONGODB_URI="))
  ?.split("=")
  .slice(1)
  .join("=")
  .replace(/^"|"$/g, "");

if (!uri) throw new Error("MONGODB_URI is required in .env.local to seed dummy users.");

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

function skill(name, status, extra = {}) {
  return { name, normalizedName: name.toLowerCase(), status, evidenceCount: 0, ...extra };
}

const DUMMY_USERS = [
  {
    handle: "dummy_asha",
    displayName: "Asha Verma",
    email: "dummy.asha@example.test",
    headline: "Frontend engineer who loves design systems",
    bio: "Building accessible React interfaces for four years.",
    location: "Bengaluru, India",
    education: "B.Tech, Computer Science",
    availableForTeams: true,
    skills: [
      skill("React", "VERIFIED", { assessmentScore: 92, evidenceCount: 2 }),
      skill("JavaScript", "VERIFIED", { assessmentScore: 88, evidenceCount: 1 }),
      skill("CSS", "CLAIMED"),
    ],
    projects: [{ title: "Design system kit", description: "A themeable component library used across three internal products.", url: "https://github.com/example/dummy-asha-kit", skills: ["React", "CSS"] }],
    evidence: [{ source: "GITHUB", url: "https://github.com/example/dummy-asha-kit", description: "Public component library with Storybook docs.", skills: ["React"] }],
  },
  {
    handle: "dummy_rohan",
    displayName: "Rohan Mehta",
    email: "dummy.rohan@example.test",
    headline: "Backend developer, Node.js & distributed systems",
    bio: "Ships APIs that stay up at 3am.",
    location: "Pune, India",
    education: "B.E, Information Technology",
    availableForTeams: true,
    skills: [
      skill("Node.js", "VERIFIED", { assessmentScore: 90, evidenceCount: 1 }),
      skill("Python", "PARTIALLY_VERIFIED", { evidenceCount: 2 }),
      skill("MongoDB", "CLAIMED"),
    ],
    projects: [{ title: "Rate limiter service", description: "A Redis-backed rate limiting microservice with a Node.js SDK.", url: "https://github.com/example/dummy-rohan-ratelimit", skills: ["Node.js"] }],
    evidence: [{ source: "GITHUB", url: "https://github.com/example/dummy-rohan-ratelimit", description: "Open source rate limiter with tests and benchmarks.", skills: ["Node.js", "Python"] }],
  },
  {
    handle: "dummy_priya",
    displayName: "Priya Nair",
    email: "dummy.priya@example.test",
    headline: "Data scientist focused on applied ML",
    bio: "Turns messy data into shipped models.",
    location: "Hyderabad, India",
    education: "M.Sc, Data Science",
    availableForTeams: true,
    skills: [
      skill("Python", "VERIFIED", { assessmentScore: 95, evidenceCount: 2 }),
      skill("Machine Learning", "VERIFIED", { assessmentScore: 85, evidenceCount: 1 }),
      skill("SQL", "PARTIALLY_VERIFIED", { evidenceCount: 1 }),
    ],
    projects: [{ title: "Churn prediction pipeline", description: "An end-to-end pipeline that predicts customer churn from usage logs.", url: "https://github.com/example/dummy-priya-churn", skills: ["Python", "Machine Learning"] }],
    evidence: [{ source: "GITHUB", url: "https://github.com/example/dummy-priya-churn", description: "Notebook and pipeline code with a written report.", skills: ["Python", "Machine Learning", "SQL"] }],
  },
  {
    handle: "dummy_karan",
    displayName: "Karan Singh",
    email: "dummy.karan@example.test",
    headline: "Product designer who can code",
    bio: "Prototypes fast, sweats the details.",
    location: "Delhi, India",
    education: "B.Des, Communication Design",
    availableForTeams: true,
    skills: [
      skill("Figma", "CLAIMED"),
      skill("UI/UX", "PARTIALLY_VERIFIED", { evidenceCount: 1 }),
      skill("HTML", "VERIFIED", { assessmentScore: 80, evidenceCount: 1 }),
    ],
    projects: [{ title: "Onboarding flow redesign", description: "Cut signup drop-off by simplifying a five-step onboarding flow to two.", url: "https://github.com/example/dummy-karan-onboarding", skills: ["UI/UX", "HTML"] }],
    evidence: [{ source: "OTHER", url: "https://dummy-karan.example.test/case-study", description: "Case study write-up with before/after metrics.", skills: ["UI/UX"] }],
  },
  {
    handle: "dummy_divya",
    displayName: "Divya Rao",
    email: "dummy.divya@example.test",
    headline: "Full-stack developer, currently heads-down on a side project",
    bio: "JavaScript end to end.",
    location: "Chennai, India",
    education: "B.Tech, Computer Science",
    availableForTeams: false,
    skills: [
      skill("JavaScript", "VERIFIED", { assessmentScore: 91, evidenceCount: 1 }),
      skill("React", "PARTIALLY_VERIFIED", { evidenceCount: 1 }),
      skill("Node.js", "CLAIMED"),
    ],
    projects: [{ title: "Habit tracker", description: "A full-stack habit tracking app with streak analytics.", url: "https://github.com/example/dummy-divya-habits", skills: ["JavaScript", "React", "Node.js"] }],
    evidence: [{ source: "GITHUB", url: "https://github.com/example/dummy-divya-habits", description: "Full-stack app with a deployed demo.", skills: ["JavaScript", "React"] }],
  },
  {
    handle: "dummy_aman",
    displayName: "Aman Gupta",
    email: "dummy.aman@example.test",
    headline: "DevOps engineer, infra-as-code advocate",
    bio: "Automates everything twice.",
    location: "Remote",
    education: "B.Tech, Electronics",
    availableForTeams: true,
    skills: [
      skill("Docker", "VERIFIED", { assessmentScore: 87, evidenceCount: 1 }),
      skill("AWS", "PARTIALLY_VERIFIED", { evidenceCount: 1 }),
      skill("Linux", "CLAIMED"),
    ],
    projects: [{ title: "One-click deploy templates", description: "A set of Terraform + Docker Compose templates for small teams.", url: "https://github.com/example/dummy-aman-deploy", skills: ["Docker", "AWS"] }],
    evidence: [{ source: "GITHUB", url: "https://github.com/example/dummy-aman-deploy", description: "Reusable infra templates with a README walkthrough.", skills: ["Docker", "AWS"] }],
  },
];

try {
  await connectWithRetry();
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB did not expose a database connection.");
  const users = database.collection("users");
  const hackathons = database.collection("hackathons");

  const now = new Date();
  const created = [];
  for (const user of DUMMY_USERS) {
    const doc = { ...user, createdAt: now, updatedAt: now };
    const result = await users.findOneAndUpdate(
      { email: user.email },
      { $set: doc, $setOnInsert: { _id: new mongoose.Types.ObjectId() } },
      { upsert: true, returnDocument: "after" }
    );
    created.push(result);
  }

  const owner = created[0];
  const participantIds = created.map((user) => user._id);
  const hackathon = {
    name: "Dummy Test Hackathon",
    description: "A disposable hackathon seeded for local testing of team formation and skill challenges.",
    location: "Remote",
    startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    createdBy: owner._id,
    participantIds,
  };
  const hackathonResult = await hackathons.findOneAndUpdate(
    { name: hackathon.name, createdBy: owner._id },
    { $set: hackathon, $setOnInsert: { _id: new mongoose.Types.ObjectId() } },
    { upsert: true, returnDocument: "after" }
  );

  console.log(`Seeded ${created.length} dummy profiles and 1 dummy hackathon ("${hackathonResult.name}").\n`);
  console.log("Profile".padEnd(16), "Handle".padEnd(14), "Email".padEnd(28), "Id");
  for (const user of created) {
    console.log(user.displayName.padEnd(16), user.handle.padEnd(14), user.email.padEnd(28), user._id.toString());
  }
  console.log("\nTo browse the app as one of these users (no password needed), open the site,");
  console.log("then in the browser console run:");
  console.log('  document.cookie = "pramaan_profile_id=<Id from the table above>; path=/"; location.reload();');
  console.log("\nRun scripts/cleanup-dummy-users.mjs to remove them again.");
} finally {
  await mongoose.disconnect();
}
