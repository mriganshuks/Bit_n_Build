import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";

const baseUrl = process.env.PRAMAAN_BASE_URL ?? "http://localhost:3000";
const uniqueSuffix = Date.now().toString().slice(-6);
const testHandle = `tst_${uniqueSuffix}`;

async function runE2ETests() {
  console.log("=== RUNNING HANDLE VALIDATION & AVAILABILITY E2E TESTS ===");

  // 1. Check GET /api/profiles availability endpoints for format errors
  console.log("\n1. Testing GET /api/profiles with invalid handles...");
  
  const invalidGetCases = [
    { handle: "ab", expectedMsg: "Handle must be at least 3 characters." },
    { handle: "thishandleiswaytoolong123", expectedMsg: "Handle must be 18 characters or fewer." },
    { handle: "Rajveer123", expectedMsg: "Use lowercase letters only." },
    { handle: "rajveer 123", expectedMsg: "Spaces are not allowed." },
    { handle: "rajveer@123", expectedMsg: "Only lowercase letters, numbers, and the allowed separator are permitted." },
    { handle: "moosa", expectedMsg: "Add at least one number." },
  ];

  for (const { handle, expectedMsg } of invalidGetCases) {
    const res = await fetch(`${baseUrl}/api/profiles?handle=${encodeURIComponent(handle)}`);
    assert.equal(res.status, 400, `Expected 400 for GET handle=${handle}`);
    const data = await res.json();
    assert.equal(data.available, false);
    assert.equal(data.error, expectedMsg, `Expected error "${expectedMsg}", got "${data.error}"`);
    console.log(`  ✓ GET /api/profiles?handle=${handle} returned 400 with "${expectedMsg}"`);
  }

  // 2. Check GET /api/profiles availability for a fresh, unused valid handle
  console.log("\n2. Testing GET /api/profiles availability for new handle:", testHandle);
  const freeRes = await fetch(`${baseUrl}/api/profiles?handle=${encodeURIComponent(testHandle)}`);
  assert.equal(freeRes.status, 200);
  const freeData = await freeRes.json();
  assert.equal(freeData.available, true);
  console.log(`  ✓ Fresh handle ${testHandle} reported available: true`);

  // 3. Check POST /api/profiles with invalid handle format
  console.log("\n3. Testing POST /api/profiles format rejection...");
  const postInvalidRes = await fetch(`${baseUrl}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Invalid Handle User",
      email: `test_${uniqueSuffix}@example.test`,
      handle: "Rajveer123", // uppercase
    }),
  });
  assert.equal(postInvalidRes.status, 400);
  const postInvalidData = await postInvalidRes.json();
  assert.equal(postInvalidData.error.message, "Use lowercase letters only.");
  console.log(`  ✓ POST /api/profiles with 'Rajveer123' returned 400: "${postInvalidData.error.message}"`);

  // 4. Register profile with testHandle
  console.log("\n4. Registering profile with valid handle:", testHandle);
  const postValidRes = await fetch(`${baseUrl}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Valid User",
      email: `test_${uniqueSuffix}@example.test`,
      handle: testHandle,
    }),
  });
  assert.equal(postValidRes.status, 201);
  const postValidData = await postValidRes.json();
  assert.equal(postValidData.profile.handle, testHandle);
  const createdProfileId = postValidData.profile.id;
  console.log(`  ✓ Profile successfully created with handle: ${testHandle}`);

  // 5. Check GET /api/profiles availability for the now-registered handle
  console.log("\n5. Testing GET /api/profiles availability for now-taken handle...");
  const takenRes = await fetch(`${baseUrl}/api/profiles?handle=${encodeURIComponent(testHandle)}`);
  assert.equal(takenRes.status, 200);
  const takenData = await takenRes.json();
  assert.equal(takenData.available, false);
  assert.equal(takenData.error, "This public handle is already taken. Try another one.");
  console.log(`  ✓ Taken handle reported available: false with "${takenData.error}"`);

  // 6. Check POST /api/profiles conflict rejection
  console.log("\n6. Testing POST /api/profiles conflict rejection for duplicate handle...");
  const postConflictRes = await fetch(`${baseUrl}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Another User",
      email: `another_${uniqueSuffix}@example.test`,
      handle: testHandle,
    }),
  });
  assert.equal(postConflictRes.status, 409);
  const postConflictData = await postConflictRes.json();
  assert.equal(postConflictData.error.message, "This public handle is already taken. Try another one.");
  console.log(`  ✓ POST /api/profiles returned 409: "${postConflictData.error.message}"`);

  // 7. Cleanup created test profile
  console.log("\n7. Cleaning up test profile from DB...");
  let uri = process.env.MONGODB_URI;
  if (!uri && fs.existsSync(".env.local")) {
    const raw = fs.readFileSync(".env.local", "utf8");
    uri = raw.split(/\r?\n/).find((line) => line.startsWith("MONGODB_URI="))?.split("=").slice(1).join("=").replace(/^"|"$/g, "");
  }
  if (uri) {
    await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10_000 });
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("users").deleteOne({ _id: new mongoose.Types.ObjectId(createdProfileId) });
      console.log(`  ✓ Cleaned up profile ${createdProfileId}`);
    }
    await mongoose.disconnect();
  }

  console.log("\n=== ALL E2E HANDLE VALIDATION & AVAILABILITY TESTS PASSED ===");
}

runE2ETests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
