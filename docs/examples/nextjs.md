# Next.js Integration

Use the Payd SDK in Next.js API routes (App Router) for server-side payment processing.

## Setup

```bash
npm install payd-node-sdk
```

Add environment variables to `.env.local`:

```env
PAYD_API_USERNAME=your_api_username
PAYD_API_PASSWORD=your_api_password
PAYD_USERNAME=your_payd_username
WEBHOOK_SECRET=your_webhook_secret
```

## Shared Client

Create a shared Payd client instance:

```typescript
// lib/payd.ts
import { PaydClient } from "payd-node-sdk";

export const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
  defaultCallbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`,
});
```

## API Routes

### Create M-Pesa Payment

```typescript
// app/api/pay/mpesa/route.ts
import { NextResponse } from "next/server";
import { payd } from "@/lib/payd";
import { PaydValidationError, PaydAPIError } from "payd-node-sdk";

export async function POST(request: Request) {
  const { orderId, amount, phoneNumber } = await request.json();

  try {
    const result = await payd.collections.mpesa({
      username: "",
      amount,
      phoneNumber,
      narration: `Order #${orderId}`,
      callbackUrl: "",
    });

    // Store transactionReference in your database
    // await db.order.update({ orderId, ref: result.transactionReference });

    return NextResponse.json({
      transactionReference: result.transactionReference,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof PaydValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 },
      );
    }
    if (error instanceof PaydAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### Create Card Payment

```typescript
// app/api/pay/card/route.ts
import { NextResponse } from "next/server";
import { payd } from "@/lib/payd";

export async function POST(request: Request) {
  const { orderId, amount, phoneNumber } = await request.json();

  try {
    const result = await payd.collections.card({
      username: "",
      amount,
      phoneNumber,
      narration: `Order #${orderId}`,
      callbackUrl: "",
    });

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      transactionReference: result.transactionReference,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 },
    );
  }
}
```

### Webhook Handler

```typescript
// app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { payd } from "@/lib/payd";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const event = payd.webhooks.parseEvent(body);

    if (event.isSuccess) {
      // Update order status in your database
      // await db.order.update({
      //   where: { transactionReference: event.transactionReference },
      //   data: { status: "paid", paidAt: new Date() },
      // });
      console.log(`Payment ${event.transactionReference} succeeded`);
    } else {
      // await db.order.update({
      //   where: { transactionReference: event.transactionReference },
      //   data: { status: "failed" },
      // });
      console.log(`Payment ${event.transactionReference} failed: ${event.remarks}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ received: true }); // Still return 200
  }
}
```

### Check Balance

```typescript
// app/api/balance/route.ts
import { NextResponse } from "next/server";
import { payd } from "@/lib/payd";

export async function GET() {
  try {
    const balances = await payd.balances.getAll();
    return NextResponse.json({
      kes: balances.fiatBalance.balance,
      usd: balances.onchainBalance.balance,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
```

## Client Component

```tsx
// components/PaymentButton.tsx
"use client";

import { useState } from "react";

export function PaymentButton({ orderId, amount }: { orderId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleMpesaPay() {
    setLoading(true);
    setStatus("Sending STK push...");

    try {
      const res = await fetch("/api/pay/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          phoneNumber: "0700000000", // Get from user input
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Check your phone for the M-Pesa prompt!");
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCardPay() {
    setLoading(true);

    try {
      const res = await fetch("/api/pay/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          phoneNumber: "0700000000",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = data.checkoutUrl; // Redirect to checkout
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleMpesaPay} disabled={loading}>
        Pay KES {amount} with M-Pesa
      </button>
      <button onClick={handleCardPay} disabled={loading}>
        Pay KES {amount} with Card
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
```

::: tip
The Payd SDK should only be used on the **server side** (API routes, server actions). Never import it in client components — API credentials would be exposed.
:::
