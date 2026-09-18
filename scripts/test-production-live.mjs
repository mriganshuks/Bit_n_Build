import assert from "node:assert/strict";

const prodBase = "https://pramaan-verify.vercel.app";
const uniqueId = Date.now().toString().slice(-8);
const prodHandle = `p_${uniqueId}`;

console.log(`=== RUNNING POST-DEPLOYMENT PRODUCTION VERIFICATION ===`);
console.log(`Target: ${prodBase}\n`);

async function runProdTests() {
  // 1. Verify /login route
  console.log("1. Checking /login page...");
  const loginRes = await fetch(`${prodBase}/login`);
  assert.equal(loginRes.status, 200, "Login page returned non-200");
  const loginHtml = await loginRes.text();
  assert.ok(loginHtml.includes("Create local profile"), "Login page does not contain 'Create local profile' link");
  assert.ok(loginHtml.includes('href="/onboarding"'), "Login page does not link to /onboarding");
  console.log("  ✓ /login page loaded successfully and contains 'Create local profile' link to /onboarding");

  // 2. Verify /onboarding route
  console.log("\n2. Checking /onboarding page...");
  const onboardRes = await fetch(`${prodBase}/onboarding`);
  assert.equal(onboardRes.status, 200, "Onboarding page returned non-200");
  console.log("  ✓ /onboarding page loaded successfully (HTTP 200)");

  // 3. Test handle validation error responses via GET /api/profiles
  console.log("\n3. Testing handle validation error feedback on production...");
  const cases = [
    { handle: "ab", expectedMsg: "Handle must be at least 3 characters.", desc: "too-short handle" },
    { handle: "thishandleiswaytoolong123", expectedMsg: "Handle must be 18 characters or fewer.", desc: "too-long handle" },
    { handle: "Rajveer123", expectedMsg: "Use lowercase letters only.", desc: "uppercase handle" },
    { handle: "rajveer 123", expectedMsg: "Spaces are not allowed.", desc: "spaces handle" },
    { handle: "rajveer@123", expectedMsg: "Only lowercase letters, numbers, and the allowed separator are permitted.", desc: "invalid special-character handle" },
    { handle: "moosa", expectedMsg: "Add at least one number.", desc: "required-number condition" },
  ];

  for (const { handle, expectedMsg, desc } of cases) {
    const res = await fetch(`${prodBase}/api/profiles?handle=${encodeURIComponent(handle)}`);
    assert.equal(res.status, 400, `Expected 400 for ${desc}`);
    const data = await res.json();
    assert.equal(data.available, false);
    assert.equal(data.error, expectedMsg, `Expected error "${expectedMsg}", got "${data.error}"`);
    console.log(`  ✓ ${desc} ("${handle}"): returned 400 with "${expectedMsg}"`);
  }

  // 4. Test availability check for free valid handle
  console.log(`\n4. Testing handle availability for valid unused handle "${prodHandle}"...`);
  const availRes = await fetch(`${prodBase}/api/profiles?handle=${encodeURIComponent(prodHandle)}`);
  assert.equal(availRes.status, 200);
  const availData = await availRes.json();
  assert.equal(availData.available, true);
  console.log(`  ✓ Valid handle "${prodHandle}" reported available: true`);

  // 5. Test POST format rejection on production
  console.log("\n5. Testing POST format rejection on production...");
  const postBadRes = await fetch(`${prodBase}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Prod Test Invalid",
      email: `invalid_${uniqueId}@example.test`,
      handle: "Rajveer123",
    }),
  });
  assert.equal(postBadRes.status, 400);
  const postBadData = await postBadRes.json();
  assert.equal(postBadData.error.message, "Use lowercase letters only.");
  console.log(`  ✓ POST with 'Rajveer123' correctly rejected with 400: "${postBadData.error.message}"`);

  // 6. Test valid profile creation on production
  console.log(`\n6. Testing profile creation with valid handle "${prodHandle}" on production...`);
  const postGoodRes = await fetch(`${prodBase}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Prod Verified User",
      email: `prod_${uniqueId}@example.test`,
      handle: prodHandle,
    }),
  });
  assert.equal(postGoodRes.status, 201);
  const postGoodData = await postGoodRes.json();
  assert.equal(postGoodData.profile.handle, prodHandle);
  console.log(`  ✓ Profile successfully created on production with handle: ${prodHandle}`);

  // 7. Test already-taken handle availability check
  console.log(`\n7. Testing already-taken handle availability check for "${prodHandle}"...`);
  const takenRes = await fetch(`${prodBase}/api/profiles?handle=${encodeURIComponent(prodHandle)}`);
  assert.equal(takenRes.status, 200);
  const takenData = await takenRes.json();
  assert.equal(takenData.available, false);
  assert.equal(takenData.error, "This public handle is already taken. Try another one.");
  console.log(`  ✓ Already-taken handle reported available: false with "${takenData.error}"`);

  // 8. Test POST conflict rejection for already-taken handle
  console.log("\n8. Testing POST duplicate handle conflict rejection on production...");
  const postConflictRes = await fetch(`${prodBase}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Duplicate Attempt User",
      email: `dup_${uniqueId}@example.test`,
      handle: prodHandle,
    }),
  });
  assert.equal(postConflictRes.status, 409);
  const postConflictData = await postConflictRes.json();
  assert.equal(postConflictData.error.message, "This public handle is already taken. Try another one.");
  console.log(`  ✓ Duplicate registration rejected with 409: "${postConflictData.error.message}"`);

  console.log("\n=== ALL PRODUCTION DEPLOYMENT TESTS PASSED PERFECTLY ===");
}

runProdTests().catch((err) => {
  console.error("Production test failed:", err);
  process.exit(1);
});
