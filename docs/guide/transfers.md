# Transfers (P2P)

Send money instantly between Payd accounts. Transfers are **immediate** — the funds arrive in the recipient's Payd wallet right away, no webhook needed (though one is sent if configured).

## Basic Usage

```typescript
const result = await payd.transfers.send({
  receiverUsername: "recipient_user",
  amount: 100,
  narration: "Lunch money",
  phoneNumber: "+254700000000",
});

console.log(result.transactionReference); // "9BD12041887.eS"
console.log(result.success);             // true
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `receiverUsername` | `string` | Yes | Payd username of the recipient |
| `amount` | `number` | Yes | Amount to transfer (must be > 0) |
| `narration` | `string` | Yes | Description of the transfer |
| `phoneNumber` | `string` | No | Recipient's phone with country code (e.g., `+254700000000`) |
| `currency` | `string` | No | Currency code (Payd auto-converts if different) |
| `walletType` | `"local" \| "USD"` | No | Which wallet to fund from (default: `"local"`) |

## Response

```typescript
interface TransferResponse {
  success: boolean;
  message: string;
  status: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

## Key Differences from Payouts

| Feature | Transfers | Payouts |
|---------|-----------|---------|
| **Speed** | Instant | Async (webhook confirmation) |
| **Destination** | Payd account | M-Pesa / bank / mobile money |
| **Webhook** | Optional | Required |
| **Identifier** | `receiverUsername` | `phoneNumber` + `accountNumber` |

## Complete Example

```typescript
async function sendToUser(receiver: string, amount: number) {
  try {
    const result = await payd.transfers.send({
      receiverUsername: receiver,
      amount,
      narration: `Transfer to ${receiver}`,
      phoneNumber: "+254700000000",
    });

    if (result.success) {
      console.log(`Sent ${amount} to ${receiver}`);
      console.log(`Ref: ${result.transactionReference}`);
    }

    return result;
  } catch (error) {
    if (error instanceof PaydValidationError) {
      console.error(`Invalid input: ${error.message}`);
    }
    throw error;
  }
}
```
