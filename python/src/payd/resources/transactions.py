"""Transaction status lookups."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from payd.http_utils import encode_uri_component
from payd.validators import validate_required

if TYPE_CHECKING:
    from payd.client import PaydClient


class Transactions:
    """Transaction status lookups."""

    def __init__(self, client: PaydClient) -> None:
        self._client = client

    def get_status(self, transaction_reference: str) -> dict[str, Any]:
        validate_required({"transaction_reference": transaction_reference}, ["transaction_reference"])

        encoded = encode_uri_component(transaction_reference)
        data = self._client.request(method="GET", path=f"/api/v1/status/{encoded}")

        raw_details = data.get("transaction_details")
        if not isinstance(raw_details, dict):
            raw_details = {}

        processed_at = raw_details.get("processed_at")
        if not isinstance(processed_at, dict):
            processed_at = {}

        transaction_details = {
            "payer": str(raw_details.get("payer") or ""),
            "merchant_id": str(raw_details.get("merchant_id") or ""),
            "phone_number": str(raw_details.get("phone_number") or ""),
            "processed_at": {
                "seconds": int(processed_at.get("seconds") or 0),
                "nanos": int(processed_at.get("nanos") or 0),
            },
            "reason": str(raw_details.get("reason") or ""),
            "channel": str(raw_details.get("channel") or ""),
            "account_number": str(raw_details.get("account_number") or ""),
            "status": str(raw_details.get("status") or ""),
            "receiver": str(raw_details.get("receiver") or ""),
            "email_address": str(raw_details.get("email_address") or ""),
        }

        code = str(data.get("code") or "")

        return {
            "id": str(data.get("id") or ""),
            "account_id": str(data.get("account_id") or ""),
            "billing_currency": str(data.get("billing_currency") or ""),
            "currency": str(data.get("currency") or ""),
            "code": code,
            "conversion_rate": float(data.get("conversion_rate") or 0),
            "amount": float(data.get("amount") or 0),
            "billing_currency_amount": float(data.get("billing_currency_amount") or 0),
            "balance": float(data.get("balance") or 0),
            "type": str(data.get("type") or ""),
            "transaction_details": transaction_details,
            "transaction_category": str(data.get("transaction_category") or ""),
            "user_id": str(data.get("user_id") or ""),
            "request_metadata": data.get("request_metadata"),
            "created_at": str(data.get("created_at") or ""),
            "transaction_reference": code,
            "_raw": data,
        }
