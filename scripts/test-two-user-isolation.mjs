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

  // 3. Testing C++ Assessment with all representations [C++, c++, C%2B%2B, c%2B%2B] & User Isolation
  console.log("\n3. Testing C++ assessment regression variants [C++, c++, C%2B%2B, c%2B%2B]...");
  const cppVariants = ["C++", "c++", "C%2B%2B", "c%2B%2B"];

  // User A has NOT claimed C++. Calling start with ANY of the 4 variants MUST be REJECTED with 403
  for (const variant of cppVariants) {
    const userAStartCpp = await userASession("/api/assessment/start", {
      method: "POST",
      body: JSON.stringify({ skill: variant, difficulty: "intermediate", consent: true }),
    });
    console.log(`   User A (unclaimed) starting "${variant}": HTTP ${userAStartCpp.status}`);
    if (userAStartCpp.status !== 403) {
      throw new Error(`Expected HTTP 403 for User A attempting unclaimed "${variant}", got ${userAStartCpp.status}`);
    }
    if (userAStartCpp.body.error?.code !== "SKILL_NOT_CLAIMED") {
      throw new Error(`Expected SKILL_NOT_CLAIMED for User A attempting "${variant}", got ${userAStartCpp.body.error?.code}`);
    }
  }
  console.log("   ✓ User A rejected with 403 SKILL_NOT_CLAIMED for all 4 variants: C++, c++, C%2B%2B, c%2B%2B.");

  // User B HAS claimed C++. Calling start with "c%2B%2B" must be ALLOWED with 201
  const userBStartCppEncoded = await userBSession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "c%2B%2B", difficulty: "intermediate", consent: true }),
  });
  console.log(`   User B (claimed C++) starting "c%2B%2B": HTTP ${userBStartCppEncoded.status}`);
  if (userBStartCppEncoded.status !== 201 || !userBStartCppEncoded.body.attempt?.id) {
    throw new Error(`Expected HTTP 201 for User B starting c%2B%2B, got ${userBStartCppEncoded.status}: ${JSON.stringify(userBStartCppEncoded.body)}`);
  }
  console.log(`   ✓ User B successfully started C++ assessment via encoded "c%2B%2B"! Attempt ID: ${userBStartCppEncoded.body.attempt.id}`);
  if (userBStartCppEncoded.body.attempt.skill !== "C++") {
    throw new Error(`Expected canonical skill name "C++" in attempt, got: ${userBStartCppEncoded.body.attempt.skill}`);
  }
  console.log("   ✓ Attempt stored canonical skill name 'C++'.");

  // User B attempts to start React and Python (claimed by User A, NOT claimed by User B)
  console.log("\n3b. Testing two-user privacy: User B cannot start User A's claimed skills (React, Python)...");
  for (const skill of ["React", "Python"]) {
    const userBStartA = await userBSession("/api/assessment/start", {
      method: "POST",
      body: JSON.stringify({ skill, difficulty: "intermediate", consent: true }),
    });
    console.log(`   User B starting unclaimed "${skill}": HTTP ${userBStartA.status}`);
    if (userBStartA.status !== 403) {
      throw new Error(`Expected HTTP 403 for User B attempting unclaimed "${skill}", got ${userBStartA.status}`);
    }
    if (userBStartA.body.error?.code !== "SKILL_NOT_CLAIMED") {
      throw new Error(`Expected SKILL_NOT_CLAIMED for User B attempting "${skill}", got ${userBStartA.body.error?.code}`);
    }
  }
  console.log("   ✓ User B cannot start React or Python assessments through the API.");

  // User A MUST still be able to start React and Python assessments
  console.log("\n3c. Verifying User A CAN start React and Python assessments...");
  const userAStartReact = await userASession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "React", difficulty: "intermediate", consent: true }),
  });
  console.log(`   User A starting claimed "React": HTTP ${userAStartReact.status}`);
  if (userAStartReact.status !== 201 || !userAStartReact.body.attempt?.id) {
    throw new Error(`Expected HTTP 201 for User A starting React, got ${userAStartReact.status}`);
  }
  console.log(`   ✓ User A successfully started React assessment! Attempt ID: ${userAStartReact.body.attempt.id}`);

  // User A submits the React assessment so there is no concurrent active assessment
  console.log("   Submitting User A React assessment...");
  const userASubmitReact = await userASession("/api/assessment/submit", {
    method: "POST",
    body: JSON.stringify({
      assessmentId: userAStartReact.body.attempt.id,
      answers: {},
      timeout: false,
    }),
  });
  if (!userASubmitReact.ok) {
    throw new Error(`User A failed to submit React assessment: ${JSON.stringify(userASubmitReact.body)}`);
  }
  console.log("   ✓ User A React assessment submitted.");

  const userAStartPython = await userASession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "Python", difficulty: "intermediate", consent: true }),
  });
  console.log(`   User A starting claimed "Python": HTTP ${userAStartPython.status}`);
  if (userAStartPython.status !== 201 || !userAStartPython.body.attempt?.id) {
    throw new Error(`Expected HTTP 201 for User A starting Python, got ${userAStartPython.status}`);
  }
  console.log(`   ✓ User A successfully started Python assessment! Attempt ID: ${userAStartPython.body.attempt.id}`);

  // 4. Test First-Time Skill Addition vs Duplicate Skill Addition (Bug 2)
  console.log("\n4. Testing first-time skill addition vs duplicate addition (Bug 2)...");
  // User A adds a new skill for the first time: "TypeScript"
  const addTypeScript = await userASession("/api/profile/skills", {
    method: "POST",
    body: JSON.stringify({ name: "TypeScript" }),
  });
  console.log(`   First-time add TypeScript: HTTP ${addTypeScript.status}`);
  if (addTypeScript.status !== 201) {
    throw new Error(`Expected HTTP 201 for first-time skill add, got ${addTypeScript.status}`);
  }
  if (addTypeScript.body.message !== "Skill added successfully") {
    throw new Error(`Expected message 'Skill added successfully', got: ${addTypeScript.body.message}`);
  }
  console.log("   ✓ First-time skill addition returned 201 and 'Skill added successfully'.");

  // User A attempts to add "TypeScript" again (duplicate)
  const addDuplicateTypeScript = await userASession("/api/profile/skills", {
    method: "POST",
    body: JSON.stringify({ name: "TypeScript" }),
  });
  console.log(`   Duplicate add TypeScript: HTTP ${addDuplicateTypeScript.status}`);
  if (addDuplicateTypeScript.status !== 409) {
    throw new Error(`Expected HTTP 409 for duplicate skill add, got ${addDuplicateTypeScript.status}`);
  }
  if (addDuplicateTypeScript.body.error?.code !== "SKILL_EXISTS") {
    throw new Error(`Expected error code SKILL_EXISTS, got: ${addDuplicateTypeScript.body.error?.code}`);
  }
  console.log("   ✓ Duplicate skill addition returned 409 SKILL_EXISTS ('That skill is already claimed.').");

  // User A attempts to add " typescript " (case and whitespace normalized duplicate)
  const addDuplicateCase = await userASession("/api/profile/skills", {
    method: "POST",
    body: JSON.stringify({ name: "  typescript  " }),
  });
  console.log(`   Duplicate case-insensitive add: HTTP ${addDuplicateCase.status}`);
  if (addDuplicateCase.status !== 409) {
    throw new Error(`Expected HTTP 409 for case-insensitive duplicate add, got ${addDuplicateCase.status}`);
  }
  console.log("   ✓ Case-insensitive duplicate addition correctly rejected with 409.");

  // 5. Test distinct language preservation: "C" vs "C++" vs "C#"
  console.log("\n5. Testing distinct skills (C, C++, C#)...");
  const addC = await userASession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "C" }) });
  const addCSharp = await userASession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "C#" }) });
  if (addC.status !== 201 || addCSharp.status !== 201) {
    throw new Error(`Distinct languages failed to add independently: C=${addC.status}, C#=${addCSharp.status}`);
  }
  console.log("   ✓ 'C' and 'C#' added independently without collision.");

  // 6. User B direct POST /api/assessment/start for React (not claimed)
  console.log("\n6. Testing server rejection: User B attempts to start React assessment (unclaimed)...");
  const startReactUnclaimed = await userBSession("/api/assessment/start", {
    method: "POST",
    body: JSON.stringify({ skill: "React", difficulty: "intermediate", consent: true }),
  });
  console.log(`   Response status: ${startReactUnclaimed.status}`);
  if (startReactUnclaimed.status !== 403) {
    throw new Error(`Expected HTTP 403 when User B requests unclaimed skill React, but received HTTP ${startReactUnclaimed.status}`);
  }
  if (startReactUnclaimed.body.error?.code !== "SKILL_NOT_CLAIMED") {
    throw new Error(`Expected error code SKILL_NOT_CLAIMED, received ${startReactUnclaimed.body.error?.code}`);
  }
  console.log("   ✓ Server REJECTED attempt with HTTP 403 SKILL_NOT_CLAIMED.");

  // 7. User B claims React
  console.log("\n7. User B claims React...");
  const claimReactRes = await userBSession("/api/profile/skills", { method: "POST", body: JSON.stringify({ name: "React" }) });
  if (claimReactRes.status !== 201) throw new Error(`User B failed to claim React: ${claimReactRes.status}`);

  // Verify User B assessment eligibility now includes React
  const userBAssessmentsAfter = await userBSession("/api/assessments");
  const userBSkillsAfter = userBAssessmentsAfter.body.skills.map((s) => s.name);
  console.log("   User B updated assessment skills:", userBSkillsAfter);
  if (!userBSkillsAfter.includes("React")) {
    throw new Error(`Expected React to become available for User B, but got: ${JSON.stringify(userBSkillsAfter)}`);
  }
  console.log("   ✓ React is now available for User B after claiming.");

  // 8. Test candidate discovery / team public profile
  console.log("\n8. Testing candidate discovery / public profile...");
  const pubProfileA = await userBSession(`/api/profiles/${userAProfileId}`);
  if (!pubProfileA.ok) {
    throw new Error(`Failed to view public profile: ${pubProfileA.status}`);
  }
  console.log("   ✓ Public candidate profile accessible for team discovery.");

  console.log("\n=== ALL TWO-USER ISOLATION & SKILL CHECKS PASSED ===");
}

try {
  await runTest();
} finally {
  await cleanup().catch((e) => console.error("Cleanup error:", e));
}
