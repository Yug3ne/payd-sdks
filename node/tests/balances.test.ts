import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError } from "../src/errors";

import balancesResponse from "../../shared/fixtures/balances/response.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return { status, statusText: "OK", json: async () => data };
}

describe("Balances", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  it("should fetch and parse balances", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(balancesResponse));

    const result = await payd.balances.getAll("my_user");

    expect(result.fiatBalance.balance).toBe(37767.63);
    expect(result.fiatBalance.currency).toBe("KES");
    expect(result.onchainBalance.balance).toBe(29065);
    expect(result.onchainBalance.currency).toBe("USD");
  });

  it("should send to correct URL with username", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(balancesResponse));

    await payd.balances.getAll("my_user");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/accounts/my_user/all_balances");
  });

  it("should use client default username", async () => {
    const paydWithDefaults = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
      defaultUsername: "default_user",
    });

    mockFetch.mockResolvedValueOnce(mockResponse(balancesResponse));

    await paydWithDefaults.balances.getAll();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/accounts/default_user/all_balances");
  });

  it("should reject when no username is provided", async () => {
    await expect(payd.balances.getAll()).rejects.toThrow(PaydValidationError);
  });
});
