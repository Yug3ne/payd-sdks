import { PaydValidationError } from "../errors";

/**
 * Validate an amount is within allowed range.
 */
export function validateAmount(
  amount: number,
  min: number,
  max: number,
  context: string,
): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount < min) {
    throw new PaydValidationError(
      `amount must be at least ${min} for ${context}. Got: ${amount}`,
      "amount",
    );
  }
  if (amount > max) {
    throw new PaydValidationError(
      `amount must be at most ${max} for ${context}. Got: ${amount}`,
      "amount",
    );
  }
}

/**
 * Validate M-Pesa amount (KES 10 – 250,000).
 */
export function validateMpesaAmount(amount: number): void {
  validateAmount(amount, 10, 250_000, "M-Pesa transactions");
}

/**
 * Validate Card payment amount (min KES 100).
 */
export function validateCardAmount(amount: number): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount < 100) {
    throw new PaydValidationError(
      `amount must be at least 100 KES for card payments. Got: ${amount}`,
      "amount",
    );
  }
}

/**
 * Validate a positive amount (for Pan-African and transfers).
 */
export function validatePositiveAmount(amount: number): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount <= 0) {
    throw new PaydValidationError(
      `amount must be greater than 0. Got: ${amount}`,
      "amount",
    );
  }
}
