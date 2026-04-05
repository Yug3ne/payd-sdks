import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaydClient } from "../src/client";
import { PaydValidationError } from "../src/errors";

import discoveryResponse from "../../shared/fixtures/networks/discovery-response.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return { status, statusText: "OK", json: async () => data };
}

describe("Networks", () => {
  let payd: PaydClient;

  beforeEach(() => {
    vi.clearAllMocks();
    payd = new PaydClient({
      apiUsername: "test_user",
      apiPassword: "test_pass",
    });
  });

  describe("discover()", () => {
    it("should fetch and parse network discovery response", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");

      expect(result.mobile).toHaveLength(1);
      expect(result.banks).toHaveLength(1);
      expect(result.mobile[0].name).toBe("Mobile Money");
      expect(result.mobile[0].id).toBe("0cca95de-c028-48fd-8806-45b4e32fe6f1");
      expect(result.mobile[0].selectedChannelId).toBe("e573694c-d9d2-4511-8dec-aa633baf19f3");
      expect(result.mobile[0].minAmount).toBe(15000);
      expect(result.mobile[0].maxAmount).toBe(3000000);
    });

    it("should send correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      await payd.networks.discover("withdrawal", "+234");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v2/networks/grouped");
      expect(url).toContain("transaction_type=withdrawal");
      expect(url).toContain("dial_code=%2B234");
    });

    it("should reject invalid transactionType", async () => {
      await expect(
        payd.networks.discover("invalid" as any, "+234"),
      ).rejects.toThrow(PaydValidationError);
    });

    it("should reject dialCode without + prefix", async () => {
      await expect(
        payd.networks.discover("receipt", "234"),
      ).rejects.toThrow(PaydValidationError);
    });
  });

  describe("findMobile()", () => {
    it("should find a mobile network by name (case-insensitive)", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");
      const network = result.findMobile("mobile money");

      expect(network.name).toBe("Mobile Money");
      expect(network.id).toBe("0cca95de-c028-48fd-8806-45b4e32fe6f1");
    });

    it("should find by partial name match", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");
      const network = result.findMobile("Mobile");

      expect(network.name).toBe("Mobile Money");
    });

    it("should throw when no match found", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");

      expect(() => result.findMobile("NonExistent")).toThrow(PaydValidationError);
    });
  });

  describe("toPaymentParams()", () => {
    it("should return correct payment params from a network", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");
      const network = result.findMobile("Mobile Money");
      const params = network.toPaymentParams();

      expect(params.networkCode).toBe("0cca95de-c028-48fd-8806-45b4e32fe6f1");
      expect(params.channelId).toBe("e573694c-d9d2-4511-8dec-aa633baf19f3");
      expect(params.transactionChannel).toBe("phone");
      expect(params.providerName).toBe("Mobile Money");
      expect(params.providerCode).toBe("Mobile Money");
    });
  });

  describe("findBank()", () => {
    it("should find a bank network by name", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");
      const network = result.findBank("Manual Input");

      expect(network.name).toBe("Manual Input");
      expect(network.accountNumberType).toBe("bank");
    });

    it("should throw when no bank match found", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(discoveryResponse));

      const result = await payd.networks.discover("receipt", "+256");

      expect(() => result.findBank("NonExistent")).toThrow(PaydValidationError);
    });
  });
});
