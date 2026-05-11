import httpx
import pytest
import respx

from payd.client import PaydClient
from payd.errors import PaydAPIError
from helpers import load_fixture


@respx.mock
def test_mpesa_collection_uses_fixture_and_normalizes_ref() -> None:
    fixture = load_fixture("collections", "mpesa-response.json")
    respx.post("https://api.payd.money/api/v2/payments").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.collections.mpesa(amount=100, phone_number="0700000000", narration="sale")

    assert out["transaction_reference"] == "9BD103350408eR"
    assert out["payment_method"] == "mobile"
    assert out["_raw"]["transaction_reference"] == "9BD103350408eR"


@respx.mock
def test_card_collection_requires_checkout_url() -> None:
    respx.post("https://api.payd.money/api/v2/payments").mock(
        return_value=httpx.Response(
            200,
            json={"success": True, "message": "ok", "payment_method": "card"},
        )
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    with pytest.raises(PaydAPIError):
        client.collections.card(amount=100, phone_number="0700000000", narration="sale")


@respx.mock
def test_card_collection_returns_checkout_url() -> None:
    fixture = load_fixture("collections", "card-response.json")
    respx.post("https://api.payd.money/api/v2/payments").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.collections.card(amount=100, phone_number="0700000000", narration="sale")

    assert out["checkout_url"].startswith("https://")
    assert out["transaction_reference"] == "9BD114038965eR"


@respx.mock
def test_pan_african_collection_parses_bank_account_optional() -> None:
    fixture = load_fixture("collections", "pan-african-bank-response.json")
    respx.post("https://api.payd.money/api/v3/payments").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.collections.pan_african(
        account_name="bank",
        amount=500,
        phone_number="+254700000000",
        account_number="123",
        network_code="nid",
        channel_id="cid",
        narration="x",
        currency="KES",
        transaction_channel="bank",
    )

    assert out["bank_account"] is not None
    assert out["bank_account"]["account_number"] == "0755758717"


@respx.mock
def test_pan_african_collection_accepts_network_helper_params() -> None:
    route = respx.post("https://api.payd.money/api/v3/payments").mock(
        return_value=httpx.Response(200, json=load_fixture("collections", "pan-african-response.json"))
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.collections.pan_african(
        account_name="phone",
        amount=500,
        phone_number="+254700000000",
        account_number="+254700000000",
        narration="x",
        currency="KES",
        **{
            "network_code": "nid",
            "channel_id": "cid",
            "transaction_channel": "phone",
            "provider_name": "Mobile Money",
            "provider_code": "MM",
        },
    )

    assert out["success"] is True
    sent = route.calls[0].request.content.decode()
    assert "provider_name" not in sent
