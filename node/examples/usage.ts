/**
 * Payd SDK Usage Examples
 *
 * Run with:
 *   npx tsx examples/usage.ts
 *
 * Make sure to set your environment variables first:
 *   export PAYD_API_USERNAME="your_api_username"
 *   export PAYD_API_PASSWORD="your_api_password"
 *   export PAYD_USERNAME="your_payd_account_username"
 */

import { PaydClient, PaydValidationError, PaydAPIError } from "../src/index";

// ─── Initialize the Client ───────────────────────────────────────────────────

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME || "your_api_username",
  apiPassword: process.env.PAYD_API_PASSWORD || "your_api_password",

  // Optional defaults — set these once, use everywhere
  defaultUsername: process.env.PAYD_USERNAME || "your_payd_username",
  defaultCallbackUrl: "https://your-server.com/webhook",
  walletType: "local", // or "USD"
  debug: true,         // logs all requests/responses to console
});

// ─── Example 1: Check your balances ──────────────────────────────────────────

async function checkBalances() {
  console.log("\n--- Checking Balances ---");

  const balances = await payd.balances.getAll();
  //                                  ^ uses defaultUsername

  console.log(`KES Balance: ${balances.fiatBalance.balance} ${balances.fiatBalance.currency}`);
  console.log(`USD Balance: ${balances.onchainBalance.balance} ${balances.onchainBalance.currency}`);
}

// ─── Example 2: Collect via M-Pesa ──────────────────────────────────────────

async function collectMpesa() {
  console.log("\n--- Collecting via M-Pesa ---");

  const result = await payd.collections.mpesa({
    username: "",  // falls back to defaultUsername
    amount: 100,
    phoneNumber: "0700000000",     // Kenyan format
    // phoneNumber: "+254700000000" // Also works — auto-normalized to 0700000000
    narration: "Order #1234",
    callbackUrl: "",  // falls back to defaultCallbackUrl
  });

  console.log(`Transaction Reference: ${result.transactionReference}`);
  console.log(`Status: ${result.status}`);
  console.log(`Message: ${result.message}`);

  // Save this reference — you'll need it to match the webhook
  return result.transactionReference;
}

// ─── Example 3: Card Payment (hosted checkout) ─────────────────────────────

async function collectCard() {
  console.log("\n--- Card Payment ---");

  const result = await payd.collections.card({
    username: "",
    amount: 500,
    phoneNumber: "0700000000",
    narration: "Premium subscription",
    callbackUrl: "",
  });

  console.log(`Checkout URL: ${result.checkoutUrl}`);
  console.log(`Transaction Ref: ${result.transactionReference}`);

  // Redirect your customer to result.checkoutUrl
}

// ─── Example 4: Pan-African Collection (2-step flow) ────────────────────────

async function collectPanAfrican() {
  console.log("\n--- Pan-African Collection (Nigeria) ---");

  // Step 1: Discover available networks for Nigeria
  const networks = await payd.networks.discover("receipt", "+234");

  console.log("Available mobile networks:");
  for (const net of networks.mobile) {
    console.log(`  - ${net.name} (min: ${net.minAmount}, max: ${net.maxAmount})`);
  }
  console.log("Available bank networks:");
  for (const net of networks.banks) {
    console.log(`  - ${net.name}`);
  }

  // Step 2: Pick a network and get its payment params
  const network = networks.mobile[0]; // or networks.findMobile("MTN")
  const paymentParams = network.toPaymentParams();
  // paymentParams contains: { networkCode, channelId, transactionChannel, providerName, providerCode }

  console.log(`Using network: ${network.name}`);
  console.log(`Payment params:`, paymentParams);

  // Step 3: Make the collection
  const result = await payd.collections.panAfrican({
    username: "",
    ...paymentParams,           // spread the network params in
    accountName: "phone",       // "phone" for mobile money, "bank" for bank
    amount: 1800,
    phoneNumber: "+2340000000000",
    accountNumber: "+2340000000000",
    narration: "Order payment",
    currency: "NGN",
    callbackUrl: "",
  });

  console.log(`Transaction Ref: ${result.transactionReference}`);

  // If the response includes bank details (for bank transfers):
  if (result.bankAccount) {
    console.log("Bank Account for payment:");
    console.log(`  Bank: ${result.bankAccount.name}`);
    console.log(`  Account: ${result.bankAccount.accountNumber}`);
    console.log(`  Name: ${result.bankAccount.accountName}`);
  }

  // If it's a hosted checkout (e.g., South Africa):
  if (result.checkoutUrl) {
    console.log(`Checkout URL: ${result.checkoutUrl}`);
  }
}

// ─── Example 5: M-Pesa Payout ───────────────────────────────────────────────

async function payoutMpesa() {
  console.log("\n--- M-Pesa Payout ---");

  const result = await payd.payouts.mpesa({
    phoneNumber: "0700000000",
    amount: 500,
    narration: "Salary payment",
    callbackUrl: "",
    // walletType: "USD"  // uncomment to pay from USD wallet
  });

  console.log(`Transaction Ref: ${result.transactionReference}`);
  console.log(`Status: ${result.status}`);
}

// ─── Example 6: Pan-African Payout ──────────────────────────────────────────

async function payoutPanAfrican() {
  console.log("\n--- Pan-African Payout (Nigeria) ---");

  // Step 1: Discover withdrawal networks
  const networks = await payd.networks.discover("withdrawal", "+234");
  const opay = networks.findBank("OPay");  // find by name

  // Step 2: Send the payout
  const result = await payd.payouts.panAfrican({
    username: "",
    ...opay.toPaymentParams(),
    accountName: "bank",
    accountHolderName: "John Doe",
    accountNumber: "0000000000",
    amount: 1800,
    phoneNumber: "+2340000000000",
    narration: "Freelancer payment",
    currency: "NGN",
    callbackUrl: "",
  });

  console.log(`Transaction Ref: ${result.transactionReference}`);
}

// ─── Example 7: Merchant Payout (Paybill / Till) ────────────────────────────

async function payoutMerchant() {
  console.log("\n--- Merchant Payout ---");

  // Pay a Paybill
  const result = await payd.payouts.merchant({
    username: "",
    amount: 500,
    phoneNumber: "+254700000000",
    narration: "Electricity bill",
    businessAccount: "888880",     // Paybill number
    businessNumber: "12345678",    // Account number
    callbackUrl: "",
  });

  console.log(`Transaction Ref: ${result.transactionReference}`);
}

// ─── Example 8: Payd-to-Payd Transfer ───────────────────────────────────────

async function transfer() {
  console.log("\n--- Payd-to-Payd Transfer ---");

  const result = await payd.transfers.send({
    receiverUsername: "friend_username",
    amount: 50,
    narration: "Lunch money",
    phoneNumber: "+254700000000",
    // walletType: "USD"  // optional
  });

  console.log(`Transaction Ref: ${result.transactionReference}`);
  console.log(`Success: ${result.success}`);
  // Transfers are instant — no need to wait for a webhook
}

// ─── Example 9: Check Transaction Status ─────────────────────────────────────

async function checkStatus() {
  console.log("\n--- Transaction Status ---");

  const tx = await payd.transactions.getStatus("9BD103350408eR");

  console.log(`Type: ${tx.type}`);           // "receipt", "withdrawal", etc.
  console.log(`Amount: ${tx.amount} ${tx.currency}`);
  console.log(`Status: ${tx.transactionDetails.status}`);
  console.log(`Channel: ${tx.transactionDetails.channel}`);
  console.log(`Payer: ${tx.transactionDetails.payer}`);
  console.log(`Created: ${tx.createdAt}`);
}

// ─── Example 10: Handle Webhooks ─────────────────────────────────────────────

function handleWebhook() {
  console.log("\n--- Webhook Handling ---");

  // Simulating an incoming webhook payload
  const incomingPayload = {
    transaction_reference: "9BD103739849eR",
    result_code: 0,
    remarks: "Successfully processes m-pesa transaction",
    third_party_trans_id: "UB9C46DH3Q",
    amount: 10,
    success: true,
  };

  const event = payd.webhooks.parseEvent(incomingPayload);

  console.log(`Reference: ${event.transactionReference}`);
  console.log(`Success: ${event.isSuccess}`);              // true
  console.log(`Type: ${event.transactionType}`);            // "receipt" (from "eR" suffix)
  console.log(`Amount: ${event.amount}`);
  console.log(`3rd Party ID: ${event.thirdPartyTransId}`);  // M-Pesa receipt number
  console.log(`Remarks: ${event.remarks}`);

  // In a real Express/Fastify app:
  // app.post("/webhook", (req, res) => {
  //   const event = payd.webhooks.parseEvent(req.body);
  //
  //   if (event.isSuccess) {
  //     // Update your order status, credit user, etc.
  //     await db.orders.update(event.transactionReference, { status: "paid" });
  //   } else {
  //     // Handle failure
  //     await db.orders.update(event.transactionReference, { status: "failed" });
  //   }
  //
  //   res.status(200).send("OK"); // Always respond 200 immediately
  // });
}

// ─── Example 11: Error Handling ──────────────────────────────────────────────

async function errorHandlingExample() {
  console.log("\n--- Error Handling ---");

  try {
    // This will throw a PaydValidationError (bad phone number)
    await payd.collections.mpesa({
      username: "my_user",
      amount: 100,
      phoneNumber: "123",  // Invalid!
      narration: "Test",
      callbackUrl: "https://example.com/webhook",
    });
  } catch (error) {
    if (error instanceof PaydValidationError) {
      console.log(`Validation Error: ${error.message}`);
      console.log(`Field: ${error.field}`);
      // "phoneNumber must be exactly 10 digits starting with 0"
    } else if (error instanceof PaydAPIError) {
      console.log(`API Error (${error.statusCode}): ${error.message}`);
      console.log(`Raw response:`, error.detail);
    }
  }

  try {
    // This will throw a PaydValidationError (amount too low)
    await payd.collections.mpesa({
      username: "my_user",
      amount: 5,  // Below minimum of 10 KES
      phoneNumber: "0700000000",
      narration: "Test",
      callbackUrl: "https://example.com/webhook",
    });
  } catch (error) {
    if (error instanceof PaydValidationError) {
      console.log(`Validation Error: ${error.message}`);
      // "amount must be at least 10 for M-Pesa transactions. Got: 5"
    }
  }
}

// ─── Run examples ────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Payd SDK Examples ===\n");

  // These don't need API credentials:
  handleWebhook();
  await errorHandlingExample();

  // Uncomment these to run against the live API:
  // await checkBalances();
  // await collectMpesa();
  // await collectCard();
  // await collectPanAfrican();
  // await payoutMpesa();
  // await payoutPanAfrican();
  // await payoutMerchant();
  // await transfer();
  // await checkStatus();
}

main().catch(console.error);
