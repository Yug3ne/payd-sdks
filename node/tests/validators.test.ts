import { describe, it, expect } from "vitest";
import {
  validateKenyaPhone,
  validateInternationalPhone,
  normalizeKenyaPhone,
} from "../src/validators/phone";
import {
  validateMpesaAmount,
  validateCardAmount,
  validatePositiveAmount,
} from "../src/validators/amount";
import { validateRequired, validateEnum } from "../src/validators/params";
import { PaydValidationError } from "../src/errors";

// ─── Phone Validation ──────────────────────────────────────────────────

describe("Phone Validators", () => {
  describe("validateKenyaPhone", () => {
    it("should accept valid 10-digit number starting with 0", () => {
      expect(() => validateKenyaPhone("0700000000")).not.toThrow();
      expect(() => validateKenyaPhone("0112345678")).not.toThrow();
    });

    it("should reject numbers not starting with 0", () => {
      expect(() => validateKenyaPhone("7000000000")).toThrow(PaydValidationError);
      expect(() => validateKenyaPhone("+254700000000")).toThrow(PaydValidationError);
    });

    it("should reject numbers with wrong length", () => {
      expect(() => validateKenyaPhone("070000000")).toThrow(PaydValidationError); // 9 digits
      expect(() => validateKenyaPhone("07000000000")).toThrow(PaydValidationError); // 11 digits
    });

    it("should reject empty string", () => {
      expect(() => validateKenyaPhone("")).toThrow(PaydValidationError);
    });

    it("should include field name in error", () => {
      try {
        validateKenyaPhone("bad", "phone");
      } catch (e) {
        expect((e as PaydValidationError).field).toBe("phone");
      }
    });
  });

  describe("validateInternationalPhone", () => {
    it("should accept valid international numbers", () => {
      expect(() => validateInternationalPhone("+2340000000000")).not.toThrow();
      expect(() => validateInternationalPhone("+254700000000")).not.toThrow();
      expect(() => validateInternationalPhone("+27800000000")).not.toThrow();
    });

    it("should reject numbers without + prefix", () => {
      expect(() => validateInternationalPhone("2340000000000")).toThrow(
        PaydValidationError,
      );
    });

    it("should reject too-short numbers", () => {
      expect(() => validateInternationalPhone("+12345")).toThrow(PaydValidationError);
    });

    it("should reject empty string", () => {
      expect(() => validateInternationalPhone("")).toThrow(PaydValidationError);
    });
  });

  describe("normalizeKenyaPhone", () => {
    it("should convert +254XXXXXXXXX to 0XXXXXXXXX", () => {
      expect(normalizeKenyaPhone("+254700000000")).toBe("0700000000");
      expect(normalizeKenyaPhone("+254112345678")).toBe("0112345678");
    });

    it("should leave non-+254 numbers unchanged", () => {
      expect(normalizeKenyaPhone("0700000000")).toBe("0700000000");
      expect(normalizeKenyaPhone("+2340000000000")).toBe("+2340000000000");
    });

    it("should leave short +254 numbers unchanged", () => {
      expect(normalizeKenyaPhone("+25470")).toBe("+25470");
    });
  });
});

// ─── Amount Validation ─────────────────────────────────────────────────

describe("Amount Validators", () => {
  describe("validateMpesaAmount", () => {
    it("should accept amounts within range (10 – 250,000)", () => {
      expect(() => validateMpesaAmount(10)).not.toThrow();
      expect(() => validateMpesaAmount(500)).not.toThrow();
      expect(() => validateMpesaAmount(250_000)).not.toThrow();
    });

    it("should reject amounts below 10", () => {
      expect(() => validateMpesaAmount(9)).toThrow(PaydValidationError);
      expect(() => validateMpesaAmount(0)).toThrow(PaydValidationError);
      expect(() => validateMpesaAmount(-1)).toThrow(PaydValidationError);
    });

    it("should reject amounts above 250,000", () => {
      expect(() => validateMpesaAmount(250_001)).toThrow(PaydValidationError);
    });

    it("should reject NaN", () => {
      expect(() => validateMpesaAmount(NaN)).toThrow(PaydValidationError);
    });
  });

  describe("validateCardAmount", () => {
    it("should accept amounts >= 100", () => {
      expect(() => validateCardAmount(100)).not.toThrow();
      expect(() => validateCardAmount(5000)).not.toThrow();
    });

    it("should reject amounts < 100", () => {
      expect(() => validateCardAmount(99)).toThrow(PaydValidationError);
      expect(() => validateCardAmount(50)).toThrow(PaydValidationError);
    });
  });

  describe("validatePositiveAmount", () => {
    it("should accept positive amounts", () => {
      expect(() => validatePositiveAmount(1)).not.toThrow();
      expect(() => validatePositiveAmount(0.01)).not.toThrow();
    });

    it("should reject zero and negative amounts", () => {
      expect(() => validatePositiveAmount(0)).toThrow(PaydValidationError);
      expect(() => validatePositiveAmount(-100)).toThrow(PaydValidationError);
    });
  });
});

// ─── Params Validation ─────────────────────────────────────────────────

describe("Params Validators", () => {
  describe("validateRequired", () => {
    it("should pass when all required fields are present", () => {
      expect(() =>
        validateRequired(
          { name: "John", age: 30 },
          ["name", "age"],
        ),
      ).not.toThrow();
    });

    it("should reject missing fields", () => {
      expect(() =>
        validateRequired({ name: "John" }, ["name", "age"]),
      ).toThrow(PaydValidationError);
    });

    it("should reject empty string fields", () => {
      expect(() =>
        validateRequired({ name: "" }, ["name"]),
      ).toThrow(PaydValidationError);
    });

    it("should reject null fields", () => {
      expect(() =>
        validateRequired({ name: null }, ["name"]),
      ).toThrow(PaydValidationError);
    });

    it("should reject undefined fields", () => {
      expect(() =>
        validateRequired({ name: undefined }, ["name"]),
      ).toThrow(PaydValidationError);
    });
  });

  describe("validateEnum", () => {
    it("should accept valid enum values", () => {
      expect(() => validateEnum("bank", ["bank", "phone"], "type")).not.toThrow();
      expect(() => validateEnum("phone", ["bank", "phone"], "type")).not.toThrow();
    });

    it("should reject invalid enum values", () => {
      expect(() => validateEnum("card", ["bank", "phone"], "type")).toThrow(
        PaydValidationError,
      );
    });

    it("should include allowed values in error message", () => {
      try {
        validateEnum("card", ["bank", "phone"], "type");
      } catch (e) {
        expect((e as PaydValidationError).message).toContain("bank, phone");
      }
    });
  });
});
