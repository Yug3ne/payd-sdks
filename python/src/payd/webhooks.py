"""Webhook parsing and HMAC verification."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from payd.errors import PaydValidationError, PaydWebhookVerificationError

TransactionKind = str  # receipt | withdrawal | transfer | topup | unknown


def derive_transaction_type(transaction_reference: str) -> TransactionKind:
    if not transaction_reference:
        return "unknown"
    if transaction_reference.endswith("eR"):
        return "receipt"
    if transaction_reference.endswith("eW"):
        return "withdrawal"
    if transaction_reference.endswith("eS"):
        return "transfer"
    if transaction_reference.endswith("eT"):
        return "topup"
    if ".eS" in transaction_reference:
        return "transfer"
    return "unknown"


class Webhooks:
    """Parse webhook payloads and verify Payd Connect signatures."""

    def parse_event(self, body: str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(body, str):
            try:
                data = json.loads(body)
            except json.JSONDecodeError as exc:
                raise PaydValidationError("Invalid JSON in webhook body") from exc
        elif isinstance(body, dict):
            data = dict(body)
        else:
            raise PaydValidationError("Webhook body must be a JSON string or object")

        transaction_reference = str(data.get("transaction_reference") or "")
        rc = data.get("result_code")
        if isinstance(rc, bool):
            result_code = -1
        elif isinstance(rc, int):
            result_code = rc
        elif isinstance(rc, float):
            result_code = int(rc)
        else:
            try:
                result_code = int(rc) if rc is not None else -1
            except (TypeError, ValueError):
                result_code = -1
        success = bool(data.get("success"))

        return {
            "transaction_reference": transaction_reference,
            "result_code": result_code,
            "remarks": str(data.get("remarks") or ""),
            "third_party_trans_id": data.get("third_party_trans_id"),
            "amount": data.get("amount"),
            "transaction_date": data.get("transaction_date"),
            "forward_url": data.get("forward_url"),
            "order_id": data.get("order_id"),
            "user_id": data.get("user_id"),
            "customer_name": data.get("customer_name"),
            "success": success,
            "status": data.get("status"),
            "phone_number": data.get("phone_number"),
            "web3_transaction_reference": data.get("web3_transaction_reference"),
            "is_success": result_code == 0 and success is True,
            "transaction_type": derive_transaction_type(transaction_reference),
            "_raw": data,
        }

    def verify(self, body: str, signature: str, secret: str) -> bool:
        if not body or not signature or not secret:
            raise PaydWebhookVerificationError(
                "body, signature, and secret are all required for webhook verification.",
            )
        try:
            parsed = json.loads(body)
            if isinstance(parsed, dict):
                normalized = json.dumps(
                    {k: parsed[k] for k in sorted(parsed.keys())},
                    separators=(",", ":"),
                )
            else:
                normalized = json.dumps(parsed, separators=(",", ":"))
        except json.JSONDecodeError:
            normalized = body

        expected_sig = hmac.new(secret.encode("utf-8"), normalized.encode("utf-8"), hashlib.sha256).hexdigest()

        try:
            sig_bytes = bytes.fromhex(signature.strip())
            exp_bytes = bytes.fromhex(expected_sig)
        except ValueError as exc:
            raise PaydWebhookVerificationError() from exc

        if len(sig_bytes) != len(exp_bytes):
            raise PaydWebhookVerificationError()

        if not hmac.compare_digest(sig_bytes, exp_bytes):
            raise PaydWebhookVerificationError()

        return True

    def construct_event(self, body: str, signature: str, secret: str) -> dict[str, Any]:
        self.verify(body, signature, secret)
        return self.parse_event(body)
