import { PaydValidationError } from "../errors";

/** Validates a Kenyan phone number (10 digits, starting with 0) */
const KENYA_PHONE_REGEX = /^0\d{9}$/;

/** Validates an international phone number (starts with +, 7-15 digits) */
const INTERNATIONAL_PHONE_REGEX = /^\+\d{7,15}$/;

/**
 * Validate a Kenyan phone number.
 * Must be exactly 10 digits starting with 0 (e.g., 0700000000).
 */
export function validateKenyaPhone(phone: string, field = "phoneNumber"): void {
  if (!phone) {
    throw new PaydValidationError(`${field} is required`, field);
  }
  if (!KENYA_PHONE_REGEX.test(phone)) {
    throw new PaydValidationError(
      `${field} must be exactly 10 digits starting with 0 (e.g., 0700000000). Got: "${phone}"`,
      field,
    );
  }
}

/**
 * Validate an international phone number.
 * Must start with + followed by 7-15 digits (e.g., +2340000000000).
 */
export function validateInternationalPhone(phone: string, field = "phoneNumber"): void {
  if (!phone) {
    throw new PaydValidationError(`${field} is required`, field);
  }
  if (!INTERNATIONAL_PHONE_REGEX.test(phone)) {
    throw new PaydValidationError(
      `${field} must start with + followed by 7-15 digits (e.g., +2340000000000). Got: "${phone}"`,
      field,
    );
  }
}

/**
 * Normalize a Kenyan phone number.
 * Converts +254XXXXXXXXX to 0XXXXXXXXX for Kenya endpoints.
 * Returns the original number if it doesn't match the +254 pattern.
 */
export function normalizeKenyaPhone(phone: string): string {
  if (phone.startsWith("+254") && phone.length === 13) {
    return "0" + phone.slice(4);
  }
  return phone;
}
