import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError } from "../src/errors";

// Fixtures
import mpesaResponse from "../../shared/fixtures/payouts/mpesa-response.json";
import panAfricanResponse from "../../shared/fixtures/payouts/pan-african-response.json";
import merchantResponse from "../../shared/fixtures/payouts/merchant-response.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return {
    status,
    statusText: "OK",
    json: async () => data,
  };
}

describe("Payouts", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  // ─── M-Pesa Payout ─────────────────────────────────────────────────

  describe("mpesa()", () => {
    it("should make a successful M-Pesa payout", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      const result = await payd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Withdrawal request",
        callbackUrl: "https://example.com/callback",
      });

      expect(result.success).toBe(true);
      // correlator_id should be normalized to transactionReference
      expect(result.transactionReference).toBe("9BD141203407eW");
      expect(result.status).toBe("SUCCESS");
    });

    it("should normalize correlator_id to transactionReference", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      const result = await payd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      // The API returns correlator_id, SDK normalizes to transactionReference
      expect(result.transactionReference).toBe("9BD141203407eW");
    });

    it("should send wallet_type when set to USD", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await payd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Test",
        callbackUrl: "https://example.com/callback",
        walletType: "USD",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.wallet_type).toBe("USD");
    });

    it("should not send wallet_type when local (default)", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await payd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.wallet_type).toBeUndefined();
    });

    it("should use client-level walletType default", async () => {
      const paydUsd = new PaydClient({
        apiUsername: "test_user",
        apiPassword: "test_pass",
        walletType: "USD",
      });

      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await paydUsd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.wallet_type).toBe("USD");
    });

    it("should send to /api/v2/withdrawal", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mpesaResponse));

      await payd.payouts.mpesa({
        phoneNumber: "0700000000",
        amount: 100,
        narration: "Test",
        callbackUrl: "https://example.com/callback",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v2/withdrawal");
    });
  });

  // ─── Pan-African Payout ─────────────────────────────────────────────

  describe("panAfrican()", () => {
    const validParams = {
      username: "my_user",
      networkCode: "344f1324-11fb-4875-bd74-fbb43cd2b32d",
      accountName: "bank" as const,
      accountHolderName: "John Doe",
      accountNumber: "0000000000",
      amount: 1800,
      phoneNumber: "+2340000000000",
      channelId: "fe8f4989-3bf6-41ca-9621-ffe2bc127569",
      narration: "Payment for goods",
      currency: "NGN",
      callbackUrl: "https://example.com/callback",
      transactionChannel: "bank" as const,
      providerName: "OPay",
      providerCode: "100004",
    };

    it("should make a successful Pan-African payout", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanResponse));

      const result = await payd.payouts.panAfrican(validParams);

      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe("9BD090722409eW");
    });

    it("should reject missing providerName", async () => {
      await expect(
        payd.payouts.panAfrican({
          ...validParams,
          providerName: "",
        }),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should send channel matching transactionChannel", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(panAfricanResponse));

      await payd.payouts.panAfrican(validParams);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.channel).toBe("bank");
      expect(body.transaction_channel).toBe("bank");
    });
  });

  // ─── Merchant Payout ────────────────────────────────────────────────

  describe("merchant()", () => {
    it("should make a successful merchant payout", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(merchantResponse));

      const result = await payd.payouts.merchant({
        username: "my_user",
        amount: 12,
        phoneNumber: "+254700000000",
        narration: "Payment for goods",
        businessAccount: "123456",
        businessNumber: "9876543210",
        callbackUrl: "https://example.com/callback",
      });

      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe("9BD090722409eW");
    });

    it("should send to /api/v3/withdrawal", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(merchantResponse));

      await payd.payouts.merchant({
        username: "my_user",
        amount: 12,
        phoneNumber: "+254700000000",
        narration: "Test",
        businessAccount: "123456",
        businessNumber: "9876543210",
        callbackUrl: "https://example.com/callback",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v3/withdrawal");
    });

    it("should force currency to KES and channel to bank", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(merchantResponse));

      await payd.payouts.merchant({
        username: "my_user",
        amount: 12,
        phoneNumber: "+254700000000",
        narration: "Test",
        businessAccount: "123456",
        businessNumber: "9876543210",
        callbackUrl: "https://example.com/callback",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.currency).toBe("KES");
      expect(body.channel).toBe("bank");
      expect(body.transaction_channel).toBe("bank");
    });
  });
});
