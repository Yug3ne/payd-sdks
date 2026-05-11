"""Account balance queries."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from payd.http_utils import encode_uri_component
from payd.validators import validate_required

if TYPE_CHECKING:
    from payd.client import PaydClient


class Balances:
    """Account balance operations."""

    def __init__(self, client: PaydClient) -> None:
        self._client = client

    def get_all(self, username: str | None = None) -> dict[str, Any]:
        resolved = username or self._client.defaults.get("username")
        validate_required({"username": resolved}, ["username"])
        assert resolved is not None

        enc = encode_uri_component(resolved)
        data = self._client.request(method="GET", path=f"/api/v1/accounts/{enc}/all_balances")

        raw_fiat = data.get("fiat_balance")
        if not isinstance(raw_fiat, dict):
            raw_fiat = {}
        raw_onchain = data.get("onchain_balance")
        if not isinstance(raw_onchain, dict):
            raw_onchain = {}

        fiat_balance = {
            "balance": float(raw_fiat.get("balance") or 0),
            "converted_balance": float(raw_fiat.get("converted_balance") or 0),
            "currency": str(raw_fiat.get("currency") or ""),
        }
        onchain_balance = {
            "balance": float(raw_onchain.get("balance") or 0),
            "converted_balance": float(raw_onchain.get("converted_balance") or 0),
            "currency": str(raw_onchain.get("currency") or ""),
        }

        return {
            "fiat_balance": fiat_balance,
            "onchain_balance": onchain_balance,
            "_raw": data,
        }
