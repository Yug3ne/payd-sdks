# Account Balances

Fetch the current balances across all wallets for a Payd account.

## Basic Usage

```typescript
const balances = await payd.balances.getAll("my_payd_user");

console.log(balances.fiatBalance.balance);     // 1000.00
console.log(balances.fiatBalance.currency);    // "KES"

console.log(balances.onchainBalance.balance);  // 500
console.log(balances.onchainBalance.currency); // "USD"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | No* | Payd account username |

*Falls back to `defaultUsername` if not provided.

```typescript
// Using client default:
const payd = new PaydClient({
  apiUsername: "...",
  apiPassword: "...",
  defaultUsername: "my_payd_user",
});

const balances = await payd.balances.getAll();
// Uses "my_payd_user" automatically
```

## Response

```typescript
interface BalancesResponse {
  fiatBalance: WalletBalance;      // Local currency wallet (e.g., KES)
  onchainBalance: WalletBalance;   // USD wallet
  _raw: Record<string, unknown>;
}

interface WalletBalance {
  balance: number;           // Current balance
  convertedBalance: number;  // Balance converted to base currency
  currency: string;          // Currency code (e.g., "KES", "USD")
}
```

## Use Cases

### Check balance before payout

```typescript
async function safePayout(amount: number, phone: string) {
  const balances = await payd.balances.getAll();

  if (balances.fiatBalance.balance < amount) {
    throw new Error(
      `Insufficient balance: ${balances.fiatBalance.balance} ${balances.fiatBalance.currency}, ` +
      `need ${amount}`
    );
  }

  return payd.payouts.mpesa({
    phoneNumber: phone,
    amount,
    narration: "Payout",
    callbackUrl: "",
  });
}
```

### Display balance dashboard

```typescript
async function getBalanceSummary() {
  const balances = await payd.balances.getAll();

  return {
    local: {
      amount: balances.fiatBalance.balance,
      currency: balances.fiatBalance.currency,
      converted: balances.fiatBalance.convertedBalance,
    },
    usd: {
      amount: balances.onchainBalance.balance,
      currency: balances.onchainBalance.currency,
      converted: balances.onchainBalance.convertedBalance,
    },
  };
}
```
