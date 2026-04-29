# Validators API

Client-side validation functions used internally by the SDK. Exported for advanced use cases where you want to validate input before calling SDK methods.

```typescript
import {
  validateKenyaPhone,
  validateInternationalPhone,
  normalizeKenyaPhone,
  validateMpesaAmount,
  validateCardAmount,
  validatePositiveAmount,
  validateRequired,
  validateEnum,
} from "payd-node-sdk";
```

## Phone Validators

### `validateKenyaPhone(phone, field?)`

Validates a Kenyan phone number. Must be exactly 10 digits starting with `0`.

```typescript
validateKenyaPhone(phone: string, field?: string): void
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `phone` | `string` | — | Phone number to validate |
| `field` | `string` | `"phoneNumber"` | Field name for error messages |

**Throws:** `PaydValidationError` if invalid.

```typescript
validateKenyaPhone("0700000000");     // OK
validateKenyaPhone("0712345678");     // OK
validateKenyaPhone("+254700000000");  // Throws — must be normalized first
validateKenyaPhone("123");            // Throws
```

---

### `validateInternationalPhone(phone, field?)`

Validates an international phone number. Must start with `+` followed by 7-15 digits.

```typescript
validateInternationalPhone(phone: string, field?: string): void
```

```typescript
validateInternationalPhone("+254700000000");   // OK
validateInternationalPhone("+2340000000000");  // OK
validateInternationalPhone("0700000000");      // Throws — no + prefix
```

---

### `normalizeKenyaPhone(phone)`

Converts `+254XXXXXXXXX` to `0XXXXXXXXX`. Returns the original string if it doesn't match the `+254` pattern.

```typescript
normalizeKenyaPhone(phone: string): string
```

```typescript
normalizeKenyaPhone("+254700000000"); // "0700000000"
normalizeKenyaPhone("0700000000");    // "0700000000" (unchanged)
normalizeKenyaPhone("+2340000000");   // "+2340000000" (not Kenya, unchanged)
```

## Amount Validators

### `validateMpesaAmount(amount)`

Validates an M-Pesa amount: must be between 10 and 250,000 KES.

```typescript
validateMpesaAmount(amount: number): void
```

```typescript
validateMpesaAmount(100);      // OK
validateMpesaAmount(5);        // Throws — below minimum
validateMpesaAmount(300000);   // Throws — above maximum
```

---

### `validateCardAmount(amount)`

Validates a card payment amount: must be at least 100 KES.

```typescript
validateCardAmount(amount: number): void
```

```typescript
validateCardAmount(100);   // OK
validateCardAmount(50);    // Throws — below minimum
```

---

### `validatePositiveAmount(amount)`

Validates an amount is a positive number.

```typescript
validatePositiveAmount(amount: number): void
```

```typescript
validatePositiveAmount(1);     // OK
validatePositiveAmount(0);     // Throws
validatePositiveAmount(-50);   // Throws
```

## Parameter Validators

### `validateRequired(params, requiredFields)`

Validates that required fields are present and non-empty.

```typescript
validateRequired(
  params: Record<string, unknown>,
  requiredFields: string[]
): void
```

```typescript
validateRequired(
  { username: "test", callbackUrl: "" },
  ["username", "callbackUrl"]
);
// Throws: "callbackUrl is required and cannot be empty"
```

---

### `validateEnum(value, allowed, field)`

Validates that a value is one of the allowed options.

```typescript
validateEnum(value: string, allowed: string[], field: string): void
```

```typescript
validateEnum("phone", ["bank", "phone"], "accountName");  // OK
validateEnum("card", ["bank", "phone"], "accountName");
// Throws: 'accountName must be one of: bank, phone. Got: "card"'
```

## All Validators Throw PaydValidationError

Every validator function throws `PaydValidationError` on failure, with the relevant `field` property set:

```typescript
try {
  validateKenyaPhone("bad");
} catch (e) {
  e instanceof PaydValidationError; // true
  e.field;   // "phoneNumber"
  e.message; // "phoneNumber must be exactly 10 digits starting with 0..."
}
```
