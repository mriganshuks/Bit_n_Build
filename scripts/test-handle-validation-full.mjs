import assert from "node:assert/strict";
import { z } from "zod";
import { getHandleValidationError, getHandleRequirements } from "../src/lib/handle-validation.ts";

const createProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  handle: z.string().superRefine((val, ctx) => {
    const error = getHandleValidationError(val);
    if (error) {
      ctx.addIssue({
        code: "custom",
        message: error,
      });
    }
  }),
});

console.log("=== RUNNING COMPLETE PUBLIC HANDLE VALIDATION TESTS ===");

// 1. Requirement 8 formatting test cases
console.log("\n1. Testing format validation rules & messages...");
const testCases = [
  { input: "rajveer123", expected: null, desc: "valid lowercase + numbers" },
  { input: "moosa12", expected: null, desc: "valid lowercase + numbers" },
  { input: "aman2026", expected: null, desc: "valid lowercase + numbers" },
  { input: "rajveer_123", expected: null, desc: "valid with existing separator underscore" },
  { input: "ab", expected: "Handle must be at least 3 characters.", desc: "too short" },
  { input: "thishandleiswaytoolong123", expected: "Handle must be 18 characters or fewer.", desc: "too long" },
  { input: "Rajveer123", expected: "Use lowercase letters only.", desc: "uppercase letter" },
  { input: "rajveer 123", expected: "Spaces are not allowed.", desc: "space present" },
  { input: "rajveer@123", expected: "Only lowercase letters, numbers, and the allowed separator are permitted.", desc: "unsupported char @" },
  { input: "rajveer-123", expected: "Only lowercase letters, numbers, and the allowed separator are permitted.", desc: "unsupported separator -" },
  { input: "moosa", expected: "Add at least one number.", desc: "missing number" },
  { input: "12345", expected: "Use 3–18 characters with lowercase letters and numbers.", desc: "missing lowercase" },
];

for (const { input, expected, desc } of testCases) {
  const result = getHandleValidationError(input);
  assert.equal(result, expected, `Failed for "${input}" (${desc})`);
  console.log(`  ✓ "${input}" -> ${result ?? "VALID"}`);
}

// 2. Requirement 4 Dynamic checklist test cases
console.log("\n2. Testing dynamic checklist requirements indicators...");

// moosa123 -> all pass
const moosaReqs = getHandleRequirements("moosa123");
assert.equal(moosaReqs.lengthValid, true);
assert.equal(moosaReqs.lowercaseValid, true);
assert.equal(moosaReqs.numbersValid, true);
assert.equal(moosaReqs.noSpacesOrUnsupported, true);
assert.equal(moosaReqs.allValid, true);
console.log("  ✓ moosa123: all 4 requirements passed.");

// Rajveer123 -> uppercase violates noSpacesOrUnsupported
const rajveerUpperReqs = getHandleRequirements("Rajveer123");
assert.equal(rajveerUpperReqs.noSpacesOrUnsupported, false);
assert.equal(rajveerUpperReqs.allValid, false);
console.log("  ✓ Rajveer123: uppercase flagged in requirements.");

// rajveer 123 -> space violates noSpacesOrUnsupported
const rajveerSpaceReqs = getHandleRequirements("rajveer 123");
assert.equal(rajveerSpaceReqs.noSpacesOrUnsupported, false);
assert.equal(rajveerSpaceReqs.allValid, false);
console.log("  ✓ rajveer 123: space flagged in requirements.");

// rajveer@123 -> @ violates noSpacesOrUnsupported
const rajveerSymbolReqs = getHandleRequirements("rajveer@123");
assert.equal(rajveerSymbolReqs.noSpacesOrUnsupported, false);
assert.equal(rajveerSymbolReqs.allValid, false);
console.log("  ✓ rajveer@123: @ flagged in requirements.");

// ab -> length fails
const abReqs = getHandleRequirements("ab");
assert.equal(abReqs.lengthValid, false);
assert.equal(abReqs.allValid, false);
console.log("  ✓ ab: length requirement failed.");

// moosa -> number fails
const moosaNoNumReqs = getHandleRequirements("moosa");
assert.equal(moosaNoNumReqs.numbersValid, false);
assert.equal(moosaNoNumReqs.allValid, false);
console.log("  ✓ moosa: number requirement failed.");

// 3. Backend Zod validation (createProfileSchema)
console.log("\n3. Testing backend Zod createProfileSchema validation...");

const baseValid = {
  displayName: "Test User",
  email: "test@example.com",
};

// Valid submission
const validParse = createProfileSchema.safeParse({ ...baseValid, handle: "rajveer123" });
assert.equal(validParse.success, true);
console.log("  ✓ Backend schema accepts valid handle 'rajveer123'");

// Invalid: too short
const shortParse = createProfileSchema.safeParse({ ...baseValid, handle: "ab" });
assert.equal(shortParse.success, false);
assert.equal(shortParse.error.flatten().fieldErrors.handle[0], "Handle must be at least 3 characters.");
console.log("  ✓ Backend schema rejects 'ab' with 'Handle must be at least 3 characters.'");

// Invalid: uppercase
const upperParse = createProfileSchema.safeParse({ ...baseValid, handle: "Rajveer123" });
assert.equal(upperParse.success, false);
assert.equal(upperParse.error.flatten().fieldErrors.handle[0], "Use lowercase letters only.");
console.log("  ✓ Backend schema rejects 'Rajveer123' with 'Use lowercase letters only.'");

// Invalid: spaces
const spaceParse = createProfileSchema.safeParse({ ...baseValid, handle: "rajveer 123" });
assert.equal(spaceParse.success, false);
assert.equal(spaceParse.error.flatten().fieldErrors.handle[0], "Spaces are not allowed.");
console.log("  ✓ Backend schema rejects 'rajveer 123' with 'Spaces are not allowed.'");

// Invalid: unsupported char
const symbolParse = createProfileSchema.safeParse({ ...baseValid, handle: "rajveer@123" });
assert.equal(symbolParse.success, false);
assert.equal(symbolParse.error.flatten().fieldErrors.handle[0], "Only lowercase letters, numbers, and the allowed separator are permitted.");
console.log("  ✓ Backend schema rejects 'rajveer@123' with 'Only lowercase letters, numbers, and the allowed separator are permitted.'");

// Invalid: missing number
const noNumParse = createProfileSchema.safeParse({ ...baseValid, handle: "moosa" });
assert.equal(noNumParse.success, false);
assert.equal(noNumParse.error.flatten().fieldErrors.handle[0], "Add at least one number.");
console.log("  ✓ Backend schema rejects 'moosa' with 'Add at least one number.'");

console.log("\n=== ALL VALIDATION TESTS COMPLETED SUCCESSFULLY ===");
