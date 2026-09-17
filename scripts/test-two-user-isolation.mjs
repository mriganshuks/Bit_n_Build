import fs from "node:fs";
import mongoose from "mongoose";

const baseUrl = process.env.PRAMAAN_BASE_URL ?? "http://localhost:3000";
const token = `two-user-${Date.now()}`;
const created = { profiles: [] };

function session() {
  let cookie = "";
  return async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...options.headers,
      },
    });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const profileCookie = setCookie.find((value) => value.startsWith("pramaan_profile_id="));
    if (profileCookie) cookie = profileCookie.split(";", 1)[0];
    const body = await response.json();
    return { status: response.status, ok: response.ok, body, headers: response.headers };
  };
}

async function cleanup() {
  let uri = process.env.MONGODB_URI;
  if (!uri && fs.existsSync(".env.local")) {
    const raw = fs.readFileSync(".env.local", "utf8");
    uri = raw.split(/\r?\n/).find((line) => line.startsWith("MONGODB_URI="))?.split("=").slice(1).join("=").replace(/^"|"$/g, "");
  }
  if (!uri) return;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10_000 });
      break;
    } catch {
      await mongoose.disconnect().catch(() => undefined);
      if (attempt < 4) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  const db = mongoose.connection.db;
  if (!db) {
    await mongoose.disconnect();
    return;
  }
  const profileIds = created.profiles.map((id) => new mongoose.Types.ObjectId(id));
  if (profileIds.length) {
    await Promise.all([
      db.collection("assessmentattempts").deleteMany({ profileId: { $in: profileIds } }),
      db.collection("integrityevents").deleteMany({ profileId: { $in: profileIds } }),
      db.collection("users").deleteMany({ _id: { $in: profileIds } }),
    ]);
  }
  await mongoose.disconnect();
}

async function runTest() {
  console.log("=== STARTING TWO-USER ISOLATION TEST ===");

  const userASession = session();
  const userBSession = session();

  // 1. User A creates profile and claims React & Python
  console.log("\n1. Setting up User A with [React, Python]...");
  const resUserA = await userASession("/api/profiles", {
    method: "POST",
    body: JSON.stringify({
      displayName: `User A ${token}`,
      email: `${token}-usera@example.test`,
      handle: `${token.replaceAll("-", "_")}_usera`.slice(0, 32),
      headline: "Frontend developer",
    }),
  });
  if (!resUserA.ok) throw new Error(`Failed to create User A: ${JSON.stringify(resUserA.body)}`);
  const userAProfileId = resUserA.body.profile.id;
  created.profiles.push(userAProfileId);

  await userASession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "React" }) });
  await userASession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "Python" }) });

  // Verify User A assessment eligibility
  const userAAssessments = await userASession("/api/assessments");
  if (!userAAssessments.ok) throw new Error(`User A /api/assessments failed: ${JSON.stringify(userAAssessments.body)}`);
  const userASkills = userAAssessments.body.skills.map((s) => s.name);
  console.log("   User A eligible assessment skills:", userASkills);
  if (!userASkills.includes("React") || !userASkills.includes("Python") || userASkills.length !== 2) {
    throw new Error(`User A assessment eligibility mismatch. Expected [React, Python], got: ${JSON.stringify(userASkills)}`);
  }
  console.log("   ✓ User A has only React and Python.");

  // 2. User B creates profile and claims Java & C++
  console.log("\n2. Setting up User B with [Java, C++]...");
  const resUserB = await userBSession("/api/profiles", {
    method: "POST",
    body: JSON.stringify({
      displayName: `User B ${token}`,
      email: `${token}-userb@example.test`,
      handle: `${token.replaceAll("-", "_")}_userb`.slice(0, 32),
      headline: "Systems engineer",
    }),
  });
  if (!resUserB.ok) throw new Error(`Failed to create User B: ${JSON.stringify(resUserB.body)}`);
  const userBProfileId = resUserB.body.profile.id;
  created.profiles.push(userBProfileId);

  await userBSession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "Java" }) });
  await userBSession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "C++" }) });

  // Verify User B assessment eligibility
  const userBAssessments = await userBSession("/api/assessments");
  if (!userBAssessments.ok) throw new Error(`User B /api/assessments failed: ${JSON.stringify(userBAssessments.body)}`);
  const userBSkills = userBAssessments.body.skills.map((s) => s.name);
  console.log("   User B eligible assessment skills:", userBSkills);
  if (!userBSkills.includes("Java") || !userBSkills.includes("C++") || userBSkills.length !== 2) {
    throw new Error(`User B assessment eligibility mismatch. Expected [Java, C++], got: ${JSON.stringify(userBSkills)}`);
  }
  if (userBSkills.includes("React") || userBSkills.includes("Python")) {
    throw new Error(`User B received User A's skills! Got: ${JSON.stringify(userBSkills)}`);
  }
  console.log("   ✓ User B has only Java and C++. React and Python do NOT appear.");

  // 3. User B attempts direct POST /api/assessment/start for React (not claimed)
  console.log("\n3. Testing server rejection: User B attempts to start React assessment...");
  const startReactUnclaimed = await userBSession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "React", difficulty: "intermediate", consent: true }),
  });
  console.log(`   Response status: ${startReactUnclaimed.status}`);
  console.log(`   Response error:`, startReactUnclaimed.body.error);

  if (startReactUnclaimed.status !== 403) {
    throw new Error(`Expected HTTP 403 when User B requests unclaimed skill React, but received HTTP ${startReactUnclaimed.status}`);
  }
  if (startReactUnclaimed.body.error?.code !== "SKILL_NOT_CLAIMED") {
    throw new Error(`Expected error code SKILL_NOT_CLAIMED, received ${startReactUnclaimed.body.error?.code}`);
  }
  console.log("   ✓ Server REJECTED attempt with HTTP 403 SKILL_NOT_CLAIMED.");

  // Verify in MongoDB that NO attempt was created for User B
  let uri = process.env.MONGODB_URI;
  if (!uri && fs.existsSync(".env.local")) {
    const raw = fs.readFileSync(".env.local", "utf8");
    uri = raw.split(/\r?\n/).find((line) => line.startsWith("MONGODB_URI="))?.split("=").slice(1).join("=").replace(/^"|"$/g, "");
  }
  if (uri) {
    await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10_000 });
    const attemptInDb = await mongoose.connection.db.collection("assessmentattempts").findOne({
      profileId: new mongoose.Types.ObjectId(userBProfileId),
      skill: "React",
    });
    if (attemptInDb) {
      throw new Error("An AssessmentAttempt document was erroneously created in MongoDB for unclaimed skill!");
    }
    console.log("   ✓ Verified MongoDB: No assessment attempt created for unclaimed React.");
    await mongoose.disconnect();
  }

  // 4. User B claims React
  console.log("\n4. User B claims React...");
  await userBSession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "React" }) });

  // Verify User B assessment eligibility now includes React
  const userBAssessmentsAfter = await userBSession("/api/assessments");
  const userBSkillsAfter = userBAssessmentsAfter.body.skills.map((s) => s.name);
  console.log("   User B updated assessment skills:", userBSkillsAfter);
  if (!userBSkillsAfter.includes("React")) {
    throw new Error(`Expected React to become available for User B, but got: ${JSON.stringify(userBSkillsAfter)}`);
  }
  console.log("   ✓ React is now available for User B after claiming.");

  // 5. User B starts React assessment
  console.log("\n5. User B starts React assessment now that it is claimed...");
  const startReactClaimed = await userBSession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "React", difficulty: "intermediate", consent: true }),
  });
  if (startReactClaimed.status !== 201 || !startReactClaimed.body.attempt?.id) {
    throw new Error(`Failed to start assessment after claiming: status ${startReactClaimed.status}, body: ${JSON.stringify(startReactClaimed.body)}`);
  }
  console.log(`   ✓ React assessment started successfully with attempt ID: ${startReactClaimed.body.attempt.id}`);

  console.log("\n=== ALL TWO-USER ISOLATION CHECKS PASSED ===");
}

try {
  await runTest();
} finally {
  await cleanup().catch((e) => console.error("Cleanup error:", e));
}
