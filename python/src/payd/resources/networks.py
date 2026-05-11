"""Network discovery for Pan-African payments."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from payd.errors import PaydValidationError
from payd.validators import validate_enum, validate_required

if TYPE_CHECKING:
    from payd.client import PaydClient


@dataclass(frozen=True)
class DiscoveredNetwork:
    """Single network entry from discovery."""

    id: str
    code: str
    updated_at: str
    status: str
    account_number_type: str
    country: str
    name: str
    channel_ids: list[str]
    selected_channel_id: str
    country_account_number_type: str
    min_amount: int | float
    max_amount: int | float

    def to_payment_params(self) -> dict[str, str]:
        """Fields ready to pass into Pan-African collection or payout calls."""
        return {
            "network_code": self.id,
            "channel_id": self.selected_channel_id,
            "transaction_channel": self.account_number_type,
            "provider_name": self.name,
            "provider_code": self.code,
        }


class NetworkDiscoveryResult:
    """Rich discovery result with lookup helpers."""

    def __init__(
        self,
        *,
        defaults: list[DiscoveredNetwork],
        mobile: list[DiscoveredNetwork],
        banks: list[DiscoveredNetwork],
    ) -> None:
        self.defaults = defaults
        self.mobile = mobile
        self.banks = banks

    def find_mobile(self, name: str) -> DiscoveredNetwork:
        lower = name.lower()
        found = next((n for n in self.mobile if lower in n.name.lower()), None)
        if not found:
            available = ", ".join(n.name for n in self.mobile)
            raise PaydValidationError(
                f'No mobile network found matching "{name}". Available: {available or "none"}',
            )
        return found

    def find_bank(self, name: str) -> DiscoveredNetwork:
        lower = name.lower()
        found = next((n for n in self.banks if lower in n.name.lower()), None)
        if not found:
            available = ", ".join(n.name for n in self.banks)
            raise PaydValidationError(
                f'No bank network found matching "{name}". Available: {available or "none"}',
            )
        return found


def _parse_network(raw: dict[str, Any]) -> DiscoveredNetwork:
    ch_ids = raw.get("channel_ids") or []
    if not isinstance(ch_ids, list):
        ch_ids = []
    return DiscoveredNetwork(
        id=str(raw.get("id") or ""),
        code=str(raw.get("code") or ""),
        updated_at=str(raw.get("updated_at") or ""),
        status=str(raw.get("status") or ""),
        account_number_type=str(raw.get("account_number_type") or ""),
        country=str(raw.get("country") or ""),
        name=str(raw.get("name") or ""),
        channel_ids=[str(x) for x in ch_ids],
        selected_channel_id=str(raw.get("selected_channel_id") or ""),
        country_account_number_type=str(raw.get("country_account_number_type") or ""),
        min_amount=raw.get("min_amount") if raw.get("min_amount") is not None else 0,
        max_amount=raw.get("max_amount") if raw.get("max_amount") is not None else 0,
    )


def _build_discovery(raw: dict[str, Any]) -> NetworkDiscoveryResult:
    defaults_raw = raw.get("defaults") or []
    mobile_raw = raw.get("mobile") or []
    banks_raw = raw.get("banks") or []
    if not isinstance(defaults_raw, list):
        defaults_raw = []
    if not isinstance(mobile_raw, list):
        mobile_raw = []
    if not isinstance(banks_raw, list):
        banks_raw = []

    defaults = [_parse_network(x) for x in defaults_raw if isinstance(x, dict)]
    mobile = [_parse_network(x) for x in mobile_raw if isinstance(x, dict)]
    banks = [_parse_network(x) for x in banks_raw if isinstance(x, dict)]

    return NetworkDiscoveryResult(defaults=defaults, mobile=mobile, banks=banks)


class Networks:
    """Network discovery operations."""

    def __init__(self, client: PaydClient) -> None:
        self._client = client

    def discover(self, transaction_type: str, dial_code: str) -> NetworkDiscoveryResult:
        validate_required({"transaction_type": transaction_type, "dial_code": dial_code}, ["transaction_type", "dial_code"])
        validate_enum(transaction_type, ["receipt", "withdrawal"], "transaction_type")
        if not dial_code.startswith("+"):
            raise PaydValidationError(
                f'dial_code must start with + (e.g., "+234"). Got: "{dial_code}"',
                field="dial_code",
            )

        data = self._client.request(
            method="GET",
            path="/v2/networks/grouped",
            query={
                "transaction_type": transaction_type,
                "dial_code": dial_code,
            },
        )
        return _build_discovery(data)
