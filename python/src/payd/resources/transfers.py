"""Payd-to-Payd transfer operations."""

from __future__ import annotations

from payd.validators import validate_international_phone, validate_positive_amount, validate_required


class Transfers:
    """Resource namespace for P2P transfers."""

    def __init__(self, client: "PaydClient") -> None:
        self._client = client

    def send(
        self,
        receiver_username: str,
        amount: int | float,
        narration: str,
        phone_number: str | None = None,
        currency: str | None = None,
        wallet_type: str | None = None,
    ) -> dict:
        """
        Send money from one Payd wallet to another.

        Optional values are included only when provided.
        """
        validate_required(
            {"receiver_username": receiver_username, "narration": narration},
            ["receiver_username", "narration"],
        )
        validate_positive_amount(amount)

        if phone_number:
            validate_international_phone(phone_number)

        resolved_wallet_type = wallet_type or self._client.defaults.get("wallet_type") or "local"

        body: dict[str, str | int | float] = {
            "receiver_username": receiver_username,
            "amount": amount,
            "narration": narration,
        }
        if phone_number:
            body["phone_number"] = phone_number
        if currency:
            body["currency"] = currency
        if resolved_wallet_type != "local":
            body["wallet_type"] = resolved_wallet_type

        return self._client.request(method="POST", path="/api/v2/p2p", body=body)
