import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError } from "../src/errors";

import transferResponse from "../../shared/fixtures/transfers/response.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return { status, statusText: "OK", json: async () => data };
}

describe("Transfers", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  it("should make a successful P2P transfer", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(transferResponse));

    const result = await payd.transfers.send({
      receiverUsername: "recipient_username",
      amount: 10,
      narration: "Family breakfast",
      phoneNumber: "+254700000000",
    });

    expect(result.success).toBe(true);
    expect(result.transactionReference).toBe("9BD12041887.eS");
  });

  it("should send to /api/v2/p2p", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(transferResponse));

    await payd.transfers.send({
      receiverUsername: "recipient",
      amount: 10,
      narration: "Test",
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v2/p2p");
  });

  it("should reject missing receiverUsername", async () => {
    await expect(
      payd.transfers.send({
        receiverUsername: "",
        amount: 10,
        narration: "Test",
      }),
    ).rejects.toThrow(PaydValidationError);
  });

  it("should reject zero amount", async () => {
    await expect(
      payd.transfers.send({
        receiverUsername: "recipient",
        amount: 0,
        narration: "Test",
      }),
    ).rejects.toThrow(PaydValidationError);
  });

  it("should omit optional fields when not provided", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(transferResponse));

    await payd.transfers.send({
      receiverUsername: "recipient",
      amount: 10,
      narration: "Test",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phone_number).toBeUndefined();
    expect(body.currency).toBeUndefined();
    expect(body.wallet_type).toBeUndefined();
  });

  it("should include wallet_type when set to USD", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(transferResponse));

    await payd.transfers.send({
      receiverUsername: "recipient",
      amount: 10,
      narration: "Test",
      walletType: "USD",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.wallet_type).toBe("USD");
  });
});
