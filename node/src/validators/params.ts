import { PaydValidationError } from "../errors";

/**
 * Validate that required string fields are present and non-empty.
 */
export function validateRequired(
  params: Record<string, unknown>,
  requiredFields: string[],
): void {
  for (const field of requiredFields) {
    const value = params[field];
    if (value === undefined || value === null || value === "") {
      throw new PaydValidationError(
        `${field} is required and cannot be empty`,
        field,
      );
    }
  }
}

/**
 * Validate that a field matches one of the allowed values.
 */
export function validateEnum(
  value: string,
  allowed: string[],
  field: string,
): void {
  if (!allowed.includes(value)) {
    throw new PaydValidationError(
      `${field} must be one of: ${allowed.join(", ")}. Got: "${value}"`,
      field,
    );
  }
}
