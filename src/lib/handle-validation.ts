export interface HandleRequirements {
  lengthValid: boolean;
  lowercaseValid: boolean;
  numbersValid: boolean;
  noSpacesOrUnsupported: boolean;
  allValid: boolean;
}

/**
 * Returns a specific, actionable error message if the handle is invalid, or null if valid.
 * Order of precedence ensures the most specific feedback is delivered to the user:
 * 1. Spaces check
 * 2. Uppercase check
 * 3. Unsupported special characters check
 * 4. Length checks (< 3, > 18)
 * 5. Lowercase letter presence
 * 6. Number presence
 */
export function getHandleValidationError(rawHandle: string): string | null {
  const handle = rawHandle ?? "";

  if (/\s/.test(handle)) {
    return "Spaces are not allowed.";
  }

  if (/[A-Z]/.test(handle)) {
    return "Use lowercase letters only.";
  }

  if (/[^a-z0-9_]/.test(handle)) {
    return "Only lowercase letters, numbers, and the allowed separator are permitted.";
  }

  if (handle.length < 3) {
    return "Handle must be at least 3 characters.";
  }

  if (handle.length > 18) {
    return "Handle must be 18 characters or fewer.";
  }

  if (!/[a-z]/.test(handle)) {
    return "Use 3–18 characters with lowercase letters and numbers.";
  }

  if (!/[0-9]/.test(handle)) {
    return "Add at least one number.";
  }

  return null;
}

/**
 * Returns the status of each requirement for dynamic UI indicators below the input.
 */
export function getHandleRequirements(rawHandle: string): HandleRequirements {
  const handle = rawHandle ?? "";
  const lengthValid = handle.length >= 3 && handle.length <= 18;
  const lowercaseValid = /[a-z]/.test(handle);
  const numbersValid = /[0-9]/.test(handle);
  const noSpacesOrUnsupported =
    handle.length === 0
      ? true
      : !/\s/.test(handle) && !/[A-Z]/.test(handle) && !/[^a-z0-9_]/.test(handle);

  const allValid =
    handle.length > 0 &&
    lengthValid &&
    lowercaseValid &&
    numbersValid &&
    noSpacesOrUnsupported;

  return {
    lengthValid,
    lowercaseValid,
    numbersValid,
    noSpacesOrUnsupported,
    allValid,
  };
}
