import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError, PaydAPIError } from "../src/errors";

// Fixtures
import mpesaResponse from "../../shared/fixtures/collections/mpesa-response.json";
import cardResponse from "../../shared/fixtures/collections/card-response.json";
import panAfricanResponse from "../../shared/fixtures/collections/pan-african-response.json";
import panAfricanBankResponse from "../../shared/fixtures/collections/pan-african-bank-response.json";
import errorResponse from "../../shared/fixtures/collections/error-response.json";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return {
    status,
    statusText: "OK",
    json: async () => data,
  };
}

describe("Collections", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  // ─── M-Pesa Collection ──────────────────────────────────────────────

  describe("mpesa()", () => {
    it("should make a successful M-Pesa collection", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      const result = await payd.collections.mpesa({
        username: "my_user",
        amount: 10,
        phoneNumber: "0700000000",
        narration: "Payment for goods",
        callbackUrl: "https://example.com/callback",
      });

      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe("9BD103350408eR");
      expect(result.paymentMethod).toBe("mobile");
      expect(result.status).toBe("SUCCESS");

      // Verify the request was made correctly
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v2/payments");
      const body = JSON.parse(options.body);
      expect(body.channel).toBe("MPESA");
      expect(body.currency).toBe("KES");
      expect(body.phone_number).toBe("0700000000");
    });

    it("should normalize +254 phone numbers to 0-prefix", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await payd.collections.mpesa({
        username: "my_user",
        amount: 10,
        phoneNumber: "+254700000000",
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.phone_number).toBe("0700000000");
    });

    it("should reject invalid phone numbers", async () => {
      await expect(
        payd.collections.mpesa({
          username: "my_user",
          amount: 10,
          phoneNumber: "123",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should reject amounts below minimum (10 KES)", async () => {
      await expect(
        payd.collections.mpesa({
          username: "my_user",
          amount: 5,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should reject amounts above maximum (250,000 KES)", async () => {
      await expect(
        payd.collections.mpesa({
          username: "my_user",
          amount: 300_000,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should reject missing required fields", async () => {
      await expect(
        payd.collections.mpesa({
          username: "",
          amount: 10,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(errorResponse, 400));

      await expect(
        payd.collections.mpesa({
          username: "my_user",
          amount: 10,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydAPIError);
    });

    it("should use client defaults for username and callbackUrl", async () => {
      const paydWithDefaults = new PaydClient({
        apiUsername: "test_user",
        apiPassword: "test_pass",
        defaultUsername: "default_user",
        defaultCallbackUrl: "https://default.com/callback",
      });

      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await paydWithDefaults.collections.mpesa({
        username: "", // Falls back to default
        amount: 10,
        phoneNumber: "0700000000",
        narration: "Test",
        callbackUrl: "", // Falls back to default
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.username).toBe("default_user");
      expect(body.callback_url).toBe("https://default.com/callback");
    });
  });

  // ─── Card Collection ──────────────────────────────────────────────

  describe("card()", () => {
    it("should make a successful card collection with checkout URL", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(cardResponse));

      const result = await payd.collections.card({
        username: "my_user",
        amount: 101,
        phoneNumber: "0700000000",
        narration: "Payment for goods",
        callbackUrl: "https://example.com/callback",
      });

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toContain("pesapal.com");
      expect(result.transactionReference).toBe("9BD114038965eR");
    });

    it("should reject amounts below minimum (100 KES)", async () => {
      await expect(
        payd.collections.card({
          username: "my_user",
          amount: 50,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should throw if checkout_url is missing from response", async () => {
      const badResponse = { ...cardResponse, checkout_url: undefined };
      mockFetch.mockResolvedValueOnce(mockResponse(badResponse));

      await expect(
        payd.collections.card({
          username: "my_user",
          amount: 101,
          phoneNumber: "0700000000",
          narration: "Test",
          callbackUrl: "https://example.com/callback",
        }),
      ).rejects.toThrow(PaydAPIError);
    });

    it("should send correct request body", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(cardResponse));

      await payd.collections.card({
        username: "my_user",
        amount: 101,
        phoneNumber: "0700000000",
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.channel).toBe("card");
      expect(body.payment_method).toBe("card");
      expect(body.currency).toBe("KES");
    });
  });

  // ─── Pan-African Collection ───────────────────────────────────────

  describe("panAfrican()", () => {
    const validParams = {
      username: "my_user",
      accountName: "phone" as const,
      amount: 1800,
      phoneNumber: "+2340000000000",
      accountNumber: "+2340000000000",
      networkCode: "344f1324-11fb-4875-bd74-fbb43cd2b32d",
      channelId: "af944f0c-ba70-47c7-86dc-1bad5a6ab4e4",
      narration: "Payment for goods",
      currency: "NGN",
      callbackUrl: "https://example.com/callback",
      transactionChannel: "phone" as const,
    };

    it("should make a successful mobile money collection", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanResponse));

      const result = await payd.collections.panAfrican(validParams);

      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe("9BD110009989eR");
    });

    it("should parse bank account from bank transfer response", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanBankResponse));

      const result = await payd.collections.panAfrican({
        ...validParams,
        accountName: "bank",
        transactionChannel: "bank",
      });

      expect(result.bankAccount).toBeDefined();
      expect(result.bankAccount!.name).toBe("PAGA");
      expect(result.bankAccount!.accountNumber).toBe("0755758717");
    });

    it("should reject invalid international phone numbers", async () => {
      await expect(
        payd.collections.panAfrican({
          ...validParams,
          phoneNumber: "0700000000", // Missing +
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should reject invalid accountName values", async () => {
      await expect(
        payd.collections.panAfrican({
          ...validParams,
          accountName: "invalid" as any,
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should send correct request body to v3 endpoint", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanResponse));

      await payd.collections.panAfrican(validParams);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v3/payments");
      const body = JSON.parse(options.body);
      expect(body.network_code).toBe(validParams.networkCode);
      expect(body.channel_id).toBe(validParams.channelId);
      expect(body.transaction_channel).toBe("phone");
    });

    it("should include redirect_url when provided", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanResponse));

      await payd.collections.panAfrican({
        ...validParams,
        redirectUrl: "https://example.com/redirect",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.redirect_url).toBe("https://example.com/redirect");
    });
  });
});
