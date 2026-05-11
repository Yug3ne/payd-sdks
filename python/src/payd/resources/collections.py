"""Collection (pay-in) operations."""

from __future__ import annotations

from typing import TYPE_CHECKING

from payd.errors import PaydAPIError
from payd.response import resolve_transaction_reference
from payd.validators import (
    normalize_kenya_phone,
    validate_card_amount,
    validate_enum,
    validate_international_phone,
    validate_kenya_phone,
    validate_mpesa_amount,
    validate_positive_amount,
    validate_required,
)

if TYPE_CHECKING:
    from payd.client import PaydClient


class Collections:
    """Collection (pay-in) operations."""

    def __init__(self, client: PaydClient) -> None:
        self._client = client

    def mpesa(
        self,
        amount: int | float,
        phone_number: str,
        narration: str,
        username: str | None = None,
        callback_url: str | None = None,
    ) -> dict:
        resolved_username = username or self._client.defaults.get("username")
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        validate_required(
            {
                "username": resolved_username,
                "callback_url": resolved_callback,
                "narration": narration,
            },
            ["username", "callback_url", "narration"],
        )
        assert resolved_username is not None and resolved_callback is not None

        normalized_phone = normalize_kenya_phone(phone_number)
        validate_kenya_phone(normalized_phone)
        validate_mpesa_amount(amount)

        data = self._client.request(
            method="POST",
            path="/api/v2/payments",
            body={
                "username": resolved_username,
                "channel": "MPESA",
                "amount": amount,
                "phone_number": normalized_phone,
                "narration": narration,
                "currency": "KES",
                "callback_url": resolved_callback,
            },
        )

        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "payment_method": str(data.get("payment_method") or ""),
            "transaction_reference": resolve_transaction_reference(data),
            "tracking_id": str(data.get("trackingId") or ""),
            "reference": str(data.get("reference") or ""),
            "result": data.get("result"),
            "_raw": data,
        }

    def card(
        self,
        amount: int | float,
        phone_number: str,
        narration: str,
        username: str | None = None,
        callback_url: str | None = None,
    ) -> dict:
        resolved_username = username or self._client.defaults.get("username")
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        validate_required(
            {
                "username": resolved_username,
                "callback_url": resolved_callback,
                "narration": narration,
            },
            ["username", "callback_url", "narration"],
        )
        assert resolved_username is not None and resolved_callback is not None

        normalized_phone = normalize_kenya_phone(phone_number)
        validate_kenya_phone(normalized_phone)
        validate_card_amount(amount)

        data = self._client.request(
            method="POST",
            path="/api/v2/payments",
            body={
                "username": resolved_username,
                "channel": "card",
                "payment_method": "card",
                "amount": amount,
                "phone_number": normalized_phone,
                "narration": narration,
                "currency": "KES",
                "callback_url": resolved_callback,
            },
        )

        checkout_url = data.get("checkout_url")
        if not checkout_url:
            raise PaydAPIError(
                200,
                str(data.get("message") or "Card collection response missing checkout_url"),
                detail=data,
            )

        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "payment_method": str(data.get("payment_method") or ""),
            "checkout_url": str(checkout_url),
            "transaction_reference": resolve_transaction_reference(data),
            "tracking_id": str(data.get("trackingId") or ""),
            "reference": str(data.get("reference") or ""),
            "result": data.get("result"),
            "_raw": data,
        }

    def pan_african(
        self,
        account_name: str,
        amount: int | float,
        phone_number: str,
        account_number: str,
        network_code: str,
        channel_id: str,
        narration: str,
        currency: str,
        transaction_channel: str,
        username: str | None = None,
        callback_url: str | None = None,
        redirect_url: str | None = None,
        provider_name: str | None = None,
        provider_code: str | None = None,
    ) -> dict:
        resolved_username = username or self._client.defaults.get("username")
        resolved_callback = callback_url or self._client.defaults.get("callback_url")
        validate_required(
            {
                "username": resolved_username,
                "callback_url": resolved_callback,
                "narration": narration,
                "account_name": account_name,
                "account_number": account_number,
                "network_code": network_code,
                "channel_id": channel_id,
                "currency": currency,
                "transaction_channel": transaction_channel,
            },
            [
                "username",
                "callback_url",
                "narration",
                "account_name",
                "account_number",
                "network_code",
                "channel_id",
                "currency",
                "transaction_channel",
            ],
        )
        assert resolved_username is not None and resolved_callback is not None

        validate_international_phone(phone_number)
        validate_positive_amount(amount)
        validate_enum(account_name, ["bank", "phone"], "account_name")
        validate_enum(transaction_channel, ["bank", "phone"], "transaction_channel")

        body: dict[str, str | int | float] = {
            "username": resolved_username,
            "account_name": account_name,
            "amount": amount,
            "phone_number": phone_number,
            "account_number": account_number,
            "network_code": network_code,
            "channel_id": channel_id,
            "narration": narration,
            "currency": currency,
            "callback_url": resolved_callback,
            "transaction_channel": transaction_channel,
        }
        if redirect_url:
            body["redirect_url"] = redirect_url

        data = self._client.request(method="POST", path="/api/v3/payments", body=body)

        bank_account = None
        raw_bank = data.get("bank_account")
        if isinstance(raw_bank, dict):
            bank_account = {
                "name": str(raw_bank.get("name") or ""),
                "branch_code": str(raw_bank.get("branch_code") or ""),
                "account_number": str(raw_bank.get("account_number") or ""),
                "account_name": str(raw_bank.get("account_name") or ""),
                "account_reference": str(raw_bank.get("account_reference") or ""),
            }

        co = data.get("checkout_url")
        return {
            "success": bool(data.get("success")),
            "message": str(data.get("message") or ""),
            "status": str(data.get("status") or ""),
            "payment_method": str(data.get("payment_method") or ""),
            "transaction_reference": resolve_transaction_reference(data),
            "bank_account": bank_account,
            "checkout_url": str(co) if co else None,
            "tracking_id": str(data.get("trackingId") or ""),
            "reference": str(data.get("reference") or ""),
            "result": data.get("result"),
            "_raw": data,
        }
