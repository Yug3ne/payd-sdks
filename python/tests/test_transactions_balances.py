import httpx
import respx

from payd.client import PaydClient
from helpers import load_fixture


@respx.mock
def test_get_status_parses_nested_details() -> None:
    fixture = load_fixture("transactions", "status-response.json")
    ref = fixture["code"]
    respx.get(f"https://api.payd.money/api/v1/status/{ref}").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(api_username="a", api_password="b")

    out = client.transactions.get_status(ref)

    assert out["transaction_reference"] == ref
    assert out["transaction_details"]["status"] == "success"


@respx.mock
def test_balances_get_all() -> None:
    fixture = load_fixture("balances", "response.json")
    respx.get("https://api.payd.money/api/v1/accounts/merchant/all_balances").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
    )

    out = client.balances.get_all()

    assert out["fiat_balance"]["currency"] == "KES"
    assert out["onchain_balance"]["currency"] == "USD"
