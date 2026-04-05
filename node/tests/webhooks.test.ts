import { describe, it, expect } from "vitest";
import { Webhooks } from "../src/webhooks";
import { PaydValidationError, PaydWebhookVerificationError } from "../src/errors";

import kenyaSuccess from "../../shared/fixtures/webhooks/kenya-success.json";
import kenyaFailure from "../../shared/fixtures/webhooks/kenya-failure.json";
import panAfricanSuccess from "../../shared/fixtures/webhooks/pan-african-success.json";
import panAfricanFailure from "../../shared/fixtures/webhooks/pan-african-failure.json";

describe("Webhooks", () => {
  const webhooks = new Webhooks();

  // ─── parseEvent ─────────────────────────────────────────────────────

  describe("parseEvent()", () => {
    it("should parse Kenya M-Pesa success webhook", () => {
      const event = webhooks.parseEvent(kenyaSuccess);

      expect(event.transactionReference).toBe("9BD103739849eR");
      expect(event.resultCode).toBe(0);
      expect(event.success).toBe(true);
      expect(event.isSuccess).toBe(true);
      expect(event.transactionType).toBe("receipt");
      expect(event.remarks).toBe("Successfully processes m-pesa transaction");
      expect(event.thirdPartyTransId).toBe("UB9C46DH3Q");
      expect(event.amount).toBe(10);
      expect(event.userId).toBe("0de616fc-61f7-46e2-aa36-4c9eda58ed37");
    });

    it("should parse Kenya M-Pesa failure webhook", () => {
      const event = webhooks.parseEvent(kenyaFailure);

      expect(event.transactionReference).toBe("9BD104311505eR");
      expect(event.resultCode).toBe(1);
      expect(event.success).toBe(false);
      expect(event.isSuccess).toBe(false);
      expect(event.transactionType).toBe("receipt");
      expect(event.remarks).toContain("Request Cancelled by user");
    });

    it("should parse Pan-African success webhook", () => {
      const event = webhooks.parseEvent(panAfricanSuccess);

      expect(event.transactionReference).toBe("9BD113419309eW");
      expect(event.resultCode).toBe(0);
      expect(event.success).toBe(true);
      expect(event.isSuccess).toBe(true);
      expect(event.transactionType).toBe("withdrawal");
      expect(event.amount).toBe(132.61);
      expect(event.customerName).toBe("+250700000000");
    });

    it("should parse Pan-African failure webhook", () => {
      const event = webhooks.parseEvent(panAfricanFailure);

      expect(event.transactionReference).toBe("9BD110009989eR");
      expect(event.resultCode).toBe(3000);
      expect(event.success).toBe(false);
      expect(event.isSuccess).toBe(false);
      expect(event.status).toBe("failed");
    });

    it("should parse a JSON string body", () => {
      const event = webhooks.parseEvent(JSON.stringify(kenyaSuccess));

      expect(event.transactionReference).toBe("9BD103739849eR");
      expect(event.isSuccess).toBe(true);
    });

    it("should throw on invalid JSON string", () => {
      expect(() => webhooks.parseEvent("not-json")).toThrow(PaydValidationError);
    });

    it("should throw on null/undefined body", () => {
      expect(() => webhooks.parseEvent(null as any)).toThrow(PaydValidationError);
    });

    it("should preserve raw payload in _raw", () => {
      const event = webhooks.parseEvent(kenyaSuccess);

      expect(event._raw).toEqual(kenyaSuccess);
    });
  });

  // ─── Transaction type derivation ───────────────────────────────────

  describe("transactionType derivation", () => {
    it("should detect receipt from eR suffix", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "9BD103739849eR",
        result_code: 0,
        success: true,
      });
      expect(event.transactionType).toBe("receipt");
    });

    it("should detect withdrawal from eW suffix", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "9BD113419309eW",
        result_code: 0,
        success: true,
      });
      expect(event.transactionType).toBe("withdrawal");
    });

    it("should detect transfer from .eS suffix", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "9BD12041887.eS",
        result_code: 0,
        success: true,
      });
      expect(event.transactionType).toBe("transfer");
    });

    it("should return unknown for unrecognized suffix", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "UNKNOWN123",
        result_code: 0,
        success: true,
      });
      expect(event.transactionType).toBe("unknown");
    });

    it("should return unknown for empty reference", () => {
      const event = webhooks.parseEvent({
        result_code: 0,
        success: true,
      });
      expect(event.transactionType).toBe("unknown");
    });
  });

  // ─── isSuccess derivation ─────────────────────────────────────────

  describe("isSuccess derivation", () => {
    it("should be true only when result_code is 0 AND success is true", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "TEST",
        result_code: 0,
        success: true,
      });
      expect(event.isSuccess).toBe(true);
    });

    it("should be false when result_code is 0 but success is false", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "TEST",
        result_code: 0,
        success: false,
      });
      expect(event.isSuccess).toBe(false);
    });

    it("should be false when result_code is non-zero even if success is true", () => {
      const event = webhooks.parseEvent({
        transaction_reference: "TEST",
        result_code: 1,
        success: true,
      });
      expect(event.isSuccess).toBe(false);
    });
  });

  // ─── verify ─────────────────────────────────────────────────────────

  describe("verify()", () => {
    it("should verify a valid HMAC-SHA256 signature", () => {
      const { createHmac } = require("node:crypto");
      const secret = "test_webhook_secret";
      const payload = JSON.stringify({ transaction_reference: "TEST123", success: true });

      // Create expected signature (matching payd-connect signing logic)
      const parsed = JSON.parse(payload);
      const normalized = JSON.stringify(parsed, Object.keys(parsed).sort());
      const signature = createHmac("sha256", secret).update(normalized).digest("hex");

      expect(webhooks.verify(payload, signature, secret)).toBe(true);
    });

    it("should throw on invalid signature", () => {
      const payload = JSON.stringify({ test: true });
      expect(() =>
        webhooks.verify(payload, "invalid_signature_hex", "secret"),
      ).toThrow(PaydWebhookVerificationError);
    });

    it("should throw when missing required params", () => {
      expect(() => webhooks.verify("", "sig", "secret")).toThrow(
        PaydWebhookVerificationError,
      );
      expect(() => webhooks.verify("body", "", "secret")).toThrow(
        PaydWebhookVerificationError,
      );
      expect(() => webhooks.verify("body", "sig", "")).toThrow(
        PaydWebhookVerificationError,
      );
    });
  });

  // ─── constructEvent ─────────────────────────────────────────────────

  describe("constructEvent()", () => {
    it("should verify and parse in one step", () => {
      const { createHmac } = require("node:crypto");
      const secret = "my_secret";
      const payload = JSON.stringify(kenyaSuccess);

      const parsed = JSON.parse(payload);
      const normalized = JSON.stringify(parsed, Object.keys(parsed).sort());
      const signature = createHmac("sha256", secret).update(normalized).digest("hex");

      const event = webhooks.constructEvent(payload, signature, secret);

      expect(event.isSuccess).toBe(true);
      expect(event.transactionReference).toBe("9BD103739849eR");
    });
  });
});
