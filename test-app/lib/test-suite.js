/**
 * Predefined test suite for "Run All" mode.
 * Each test defines an endpoint to call, params, and a validator.
 * Tests can depend on results from earlier tests via the `context` object.
 */

export const tests = [
  // ── Smoke test ──────────────────────────────────────────────────────
  {
    name: "Balances — Get All",
    category: "balances",
    method: "GET",
    endpoint: "/api/balances",
    params: () => ({}),
    validate: (res) => {
      if (!res.data?.fiatBalance) return { pass: false, reason: "Missing fiatBalance" };
      if (typeof res.data.fiatBalance.balance !== "number")
        return { pass: false, reason: "fiatBalance.balance is not a number" };
      return { pass: true };
    },
  },

  // ── Network Discovery ───────────────────────────────────────────────
  {
    name: "Networks — Discover (receipt, +256)",
    category: "networks",
    method: "GET",
    endpoint: "/api/networks/discover?transactionType=receipt&dialCode=%2B256",
    params: () => ({}),
    saveToContext: (ctx, res) => {
      ctx.receiptNetworks = res.data;
    },
    validate: (res) => {
      if (!res.data) return { pass: false, reason: "No data returned" };
      if (!Array.isArray(res.data.mobile))
        return { pass: false, reason: "mobile is not an array" };
      return { pass: true };
    },
  },
  {
    name: "Networks — Discover (withdrawal, +256)",
    category: "networks",
    method: "GET",
    endpoint: "/api/networks/discover?transactionType=withdrawal&dialCode=%2B256",
    params: () => ({}),
    saveToContext: (ctx, res) => {
      ctx.withdrawalNetworks = res.data;
    },
    validate: (res) => {
      if (!res.data) return { pass: false, reason: "No data returned" };
      return { pass: true };
    },
  },

  // ── Collections ─────────────────────────────────────────────────────
  {
    name: "Collections — M-Pesa STK Push",
    category: "collections",
    method: "POST",
    endpoint: "/api/collections/mpesa",
    params: () => ({
      amount: 10,
      phoneNumber: "0700000000",
      narration: "SDK test — M-Pesa collection",
    }),
    saveToContext: (ctx, res) => {
      ctx.mpesaCollectionRef = res.data?.transactionReference;
    },
    validate: (res) => {
      if (!res.data?.transactionReference)
        return { pass: false, reason: "Missing transactionReference" };
      if (!res.data?.success) return { pass: false, reason: "success is not true" };
      return { pass: true };
    },
  },
  {
    name: "Collections — Card Payment",
    category: "collections",
    method: "POST",
    endpoint: "/api/collections/card",
    params: () => ({
      amount: 101,
      phoneNumber: "0700000000",
      narration: "SDK test — Card collection",
    }),
    validate: (res) => {
      if (!res.data?.checkoutUrl)
        return { pass: false, reason: "Missing checkoutUrl" };
      return { pass: true };
    },
  },

  // ── Payouts ─────────────────────────────────────────────────────────
  {
    name: "Payouts — M-Pesa",
    category: "payouts",
    method: "POST",
    endpoint: "/api/payouts/mpesa",
    params: () => ({
      phoneNumber: "0700000000",
      amount: 10,
      narration: "SDK test — M-Pesa payout",
    }),
    validate: (res) => {
      if (!res.data?.transactionReference)
        return { pass: false, reason: "Missing transactionReference" };
      return { pass: true };
    },
  },
  {
    name: "Payouts — Merchant (Paybill)",
    category: "payouts",
    method: "POST",
    endpoint: "/api/payouts/merchant",
    params: () => ({
      amount: 10,
      phoneNumber: "+254700000000",
      narration: "SDK test — Merchant payout",
      businessAccount: "174379",
      businessNumber: "174379",
    }),
    validate: (res) => {
      if (!res.data?.transactionReference)
        return { pass: false, reason: "Missing transactionReference" };
      return { pass: true };
    },
  },

  // ── Transfers ───────────────────────────────────────────────────────
  {
    name: "Transfers — Payd-to-Payd",
    category: "transfers",
    method: "POST",
    endpoint: "/api/transfers/send",
    params: () => ({
      receiverUsername: "test_receiver",
      amount: 10,
      narration: "SDK test — P2P transfer",
      phoneNumber: "+254700000000",
    }),
    validate: (res) => {
      if (!res.data?.transactionReference)
        return { pass: false, reason: "Missing transactionReference" };
      return { pass: true };
    },
  },

  // ── Transaction Status ──────────────────────────────────────────────
  {
    name: "Transactions — Get Status",
    category: "transactions",
    method: "GET",
    endpoint: (ctx) =>
      `/api/transactions/status/${encodeURIComponent(ctx.mpesaCollectionRef || "9BD103350408eR")}`,
    params: () => ({}),
    validate: (res) => {
      if (!res.data?.transactionReference)
        return { pass: false, reason: "Missing transactionReference" };
      if (!res.data?.type) return { pass: false, reason: "Missing type field" };
      return { pass: true };
    },
  },

  // ── Webhooks (offline — no API call) ────────────────────────────────
  {
    name: "Webhooks — Parse Success Event",
    category: "webhooks",
    method: "POST",
    endpoint: "/api/webhooks/parse",
    params: () => ({
      body: {
        transaction_reference: "9BD103739849eR",
        result_code: 0,
        remarks: "Successfully processes m-pesa transaction",
        third_party_trans_id: "UB9C46DH3Q",
        amount: 10,
        success: true,
      },
    }),
    validate: (res) => {
      if (!res.data?.isSuccess) return { pass: false, reason: "isSuccess should be true" };
      if (res.data?.transactionType !== "receipt")
        return { pass: false, reason: `transactionType should be receipt, got ${res.data?.transactionType}` };
      return { pass: true };
    },
  },
  {
    name: "Webhooks — Parse Failure Event",
    category: "webhooks",
    method: "POST",
    endpoint: "/api/webhooks/parse",
    params: () => ({
      body: {
        transaction_reference: "9BD104311505eR",
        result_code: 1,
        remarks: "Transaction failed",
        success: false,
      },
    }),
    validate: (res) => {
      if (res.data?.isSuccess !== false)
        return { pass: false, reason: "isSuccess should be false" };
      return { pass: true };
    },
  },
];
