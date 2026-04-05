import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError } from "../src/errors";

import statusResponse from "../../shared/fixtures/transactions/status-response.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return { status, statusText: "OK", json: async () => data };
}

describe("Transactions", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  it("should fetch and parse transaction status", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(statusResponse));

    const result = await payd.transactions.getStatus("9BD103350408eR");

    expect(result.id).toBe("00000000-0000-4000-a000-000000000001");
    expect(result.currency).toBe("KES");
    expect(result.code).toBe("9BD103350408eR");
    expect(result.transactionReference).toBe("9BD103350408eR");
    expect(result.amount).toBe(10000);
    expect(result.type).toBe("receipt");
    expect(result.transactionDetails.status).toBe("success");
    expect(result.transactionDetails.payer).toBe("+254700000000");
    expect(result.transactionDetails.channel).toBe("mobile");
    expect(result.balance).toBe(50000.00);
  });

  it("should send to correct URL with encoded reference", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(statusResponse));

    await payd.transactions.getStatus("9BD103350408eR");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/status/9BD103350408eR");
  });

  it("should reject empty transaction reference", async () => {
    await expect(payd.transactions.getStatus("")).rejects.toThrow(
      PaydValidationError,
    );
  });
});
