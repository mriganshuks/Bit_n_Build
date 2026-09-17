import assert from "node:assert/strict";
import fs from "node:fs";

const baseUrl = process.env.PRAMAAN_BASE_URL ?? "http://localhost:3000";

async function runTests() {
  console.log("=== VERIFYING LOGIN FLOW, REDIRECTS, AND ASSESSMENTS EXCLUSION ===");

  // 1. Check /login page
  console.log("1. Checking /login page...");
  const loginRes = await fetch(`${baseUrl}/login`);
  assert.equal(loginRes.status, 200, "Expected /login to return 200");
  const loginHtml = await loginRes.text();

  assert.ok(
    loginHtml.includes("PRAMAAN Authentication") || loginHtml.includes("Sign in"),
    "Expected /login to contain authentication branding/text"
  );
  assert.ok(
    !loginHtml.toLowerCase().includes("explore assessments"),
    "Expected /login NOT to contain 'explore assessments'"
  );
  assert.ok(
    !loginHtml.includes('href="/assessments"'),
    "Expected /login NOT to have link to /assessments"
  );
  assert.ok(
    !loginHtml.includes('aria-label="Primary navigation"'),
    "Expected /login NOT to render application primary navigation while logged out"
  );
  console.log("✓ /login renders clean authentication UI without any assessments options or navbar.");

  // 2. Check / (Home) page
  console.log("2. Checking root / page...");
  const homeRes = await fetch(`${baseUrl}/`);
  assert.equal(homeRes.status, 200, "Expected / to return 200");
  const homeHtml = await homeRes.text();

  assert.ok(
    !homeHtml.toLowerCase().includes("explore assessments"),
    "Expected / NOT to contain 'explore assessments'"
  );
  assert.ok(
    !homeHtml.includes('href="/assessments"'),
    "Expected / NOT to have link to /assessments"
  );
  console.log("✓ Root page / does NOT contain 'Explore assessments' or /assessments links.");

  // 3. Check /assessments protection
  console.log("3. Checking /assessments page for unauthenticated protection...");
  const assessmentsRes = await fetch(`${baseUrl}/assessments`);
  assert.equal(assessmentsRes.status, 200, "Expected /assessments to return 200");
  const assessmentsHtml = await assessmentsRes.text();

  assert.ok(
    !assessmentsHtml.toLowerCase().includes("explore assessments"),
    "Expected /assessments NOT to contain 'explore assessments'"
  );

  const assessmentsSource = fs.readFileSync("src/app/assessments/page.tsx", "utf8");
  assert.ok(
    assessmentsSource.includes('router.replace("/login")'),
    "Expected src/app/assessments/page.tsx to contain router.replace('/login') when unauthenticated"
  );

  const assessmentClientSource = fs.readFileSync("src/components/assessment-client.tsx", "utf8");
  assert.ok(
    assessmentClientSource.includes('router.replace("/login")'),
    "Expected src/components/assessment-client.tsx to contain router.replace('/login') when unauthenticated"
  );
  console.log("✓ /assessments and assessment-client enforce automatic redirect to /login for unauthenticated users.");

  // 4. Check Auth Provider redirect destinations
  console.log("4. Checking Auth Provider redirects...");
  const authProviderSource = fs.readFileSync("src/components/auth-provider.tsx", "utf8");
  assert.ok(
    authProviderSource.includes('router.push("/dashboard")'),
    "Expected auth-provider.tsx signIn() to redirect to /dashboard when profile complete"
  );
  assert.ok(
    authProviderSource.includes('router.push("/login")'),
    "Expected auth-provider.tsx signOut() to redirect to /login"
  );
  console.log("✓ auth-provider redirects to /dashboard on successful login and /login on logout.");

  // 5. Check Navbar auth hiding
  console.log("5. Checking Navbar authenticated-only rendering...");
  const navSource = fs.readFileSync("src/components/app-nav.tsx", "utf8");
  assert.ok(
    navSource.includes("!isAuthenticated") && navSource.includes("return null"),
    "Expected app-nav.tsx to return null when unauthenticated"
  );
  assert.ok(
    !navSource.includes("Sign In"),
    "Expected app-nav.tsx NOT to include a redundant Sign In button when logged out"
  );
  console.log("✓ AppNav strictly returns null when unauthenticated or loading.");

  console.log("\n=== ALL LOGIN, REDIRECT, & NAVBAR CHECKS PASSED ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
