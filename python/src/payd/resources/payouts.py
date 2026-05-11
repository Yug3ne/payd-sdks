"""Payout (disbursement) operations."""

from __future__ import annotations

from typing import TYPE_CHECKING

from payd.response import resolve_transaction_reference
from payd.validators import (
    normalize_kenya_phone,
    validate_enum,
    validate_international_phone,
    validate_kenya_phone,
    validate_mpesa_amount,
    validate_positive_amount,
    validate_required,
)

if TYPE_CHECKING:
    from payd.client import PaydClient


class Payouts:
    """Payout (disbursement) operations."""

    def __init__(self, client: PaydClient) -> None:
        self._client = client

    def mpesa(
        self,
        phone_number: str,
        amount: int | float,
        narration: str,
        callback_url: str | None = None,
        wallet_type: str | None = None,
    ) -> dict:
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        resolved_wallet = wallet_type or self._client.defaults.get("wallet_type") or "local"

        validate_required({"callback_url": resolved_callback, "narration": narration}, ["callback_url", "narration"])
        assert resolved_callback is not None

        normalized_phone = normalize_kenya_phone(phone_number)
        validate_kenya_phone(normalized_phone)
        validate_mpesa_amount(amount)

        body: dict[str, str | int | float] = {
            "phone_number": normalized_phone,
            "amount": amount,
            "narration": narration,
            "callback_url": resolved_callback,
            "channel": "MPESA",
            "currency": "KES",
        }
        if resolved_wallet != "local":
            body["wallet_type"] = resolved_wallet

        data = self._client.request(method="POST", path="/api/v2/withdrawal", body=body)

        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "transaction_reference": resolve_transaction_reference(data),
            "channel": str(data.get("channel") or ""),
            "amount": float(data.get("amount") or 0),
            "_raw": data,
        }

    def pan_african(
        self,
        account_name: str,
        account_holder_name: str,
        account_number: str,
        network_code: str,
        channel_id: str,
        phone_number: str,
        amount: int | float,
        narration: str,
        currency: str,
        transaction_channel: str,
        provider_name: str,
        provider_code: str,
        username: str | None = None,
        callback_url: str | None = None,
        wallet_type: str | None = None,
    ) -> dict:
        resolved_username = username or self._client.defaults.get("username")
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        resolved_wallet = wallet_type or self._client.defaults.get("wallet_type") or "local"

        validate_required(
            {
                "username": resolved_username,
                "callback_url": resolved_callback,
                "narration": narration,
                "account_name": account_name,
                "account_holder_name": account_holder_name,
                "account_number": account_number,
                "network_code": network_code,
                "channel_id": channel_id,
                "currency": currency,
                "transaction_channel": transaction_channel,
                "provider_name": provider_name,
                "provider_code": provider_code,
            },
            [
                "username",
                "callback_url",
                "narration",
                "account_name",
                "account_holder_name",
                "account_number",
                "network_code",
                "channel_id",
                "currency",
                "transaction_channel",
                "provider_name",
                "provider_code",
            ],
        )
        assert resolved_username is not None and resolved_callback is not None

        validate_international_phone(phone_number)
        validate_positive_amount(amount)
        validate_enum(account_name, ["bank", "phone"], "account_name")
        validate_enum(transaction_channel, ["bank", "phone"], "transaction_channel")

        body: dict[str, str | int | float] = {
            "username": resolved_username,
            "network_code": network_code,
            "account_name": account_name,
            "account_holder_name": account_holder_name,
            "account_number": account_number,
            "amount": amount,
            "phone_number": phone_number,
            "channel_id": channel_id,
            "narration": narration,
            "currency": currency,
            "callback_url": resolved_callback,
            "transaction_channel": transaction_channel,
            "channel": transaction_channel,
            "provider_name": provider_name,
            "provider_code": provider_code,
        }
        if resolved_wallet != "local":
            body["wallet_type"] = resolved_wallet

        data = self._client.request(method="POST", path="/api/v2/payments", body=body)

        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "transaction_reference": resolve_transaction_reference(data),
            "channel": str(data.get("channel") or ""),
            "amount": float(data.get("amount") or 0),
            "_raw": data,
        }

    def merchant(
        self,
        amount: int | float,
        phone_number: str,
        narration: str,
        business_account: str,
        business_number: str,
        username: str | None = None,
        callback_url: str | None = None,
        wallet_type: str | None = None,
    ) -> dict:
        resolved_username = username or self._client.defaults.get("username")
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        resolved_wallet = wallet_type or self._client.defaults.get("wallet_type") or "local"

        validate_required(
            {
                "username": resolved_username,
                "callback_url": resolved_callback,
                "narration": narration,
                "business_account": business_account,
                "business_number": business_number,
            },
            ["username", "callback_url", "narration", "business_account", "business_number"],
        )
        assert resolved_username is not None and resolved_callback is not None

        validate_international_phone(phone_number)
        validate_positive_amount(amount)

        body: dict[str, str | int | float] = {
            "username": resolved_username,
            "amount": amount,
            "currency": "KES",
            "phone_number": phone_number,
            "narration": narration,
            "transaction_channel": "bank",
            "channel": "bank",
            "business_account": business_account,
            "business_number": business_number,
            "callback_url": resolved_callback,
        }
        if resolved_wallet != "local":
            body["wallet_type"] = resolved_wallet

        data = self._client.request(method="POST", path="/api/v3/withdrawal", body=body)

        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "transaction_reference": resolve_transaction_reference(data),
            "channel": str(data.get("channel") or ""),
            "amount": float(data.get("amount") or 0),
            "_raw": data,
        }
