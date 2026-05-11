import httpx
import respx

from payd.client import PaydClient
from helpers import load_fixture


@respx.mock
def test_mpesa_payout_normalizes_response() -> None:
    fixture = load_fixture("payouts", "mpesa-response.json")
    respx.post("https://api.payd.money/api/v2/withdrawal").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_callback_url="https://example.com/hook",
    )

    out = client.payouts.mpesa(
        phone_number="0700000000",
        amount=500,
        narration="pay",
    )

    assert out["transaction_reference"] == "9BD141203407eW"


@respx.mock
def test_pan_african_payout() -> None:
    fixture = load_fixture("payouts", "pan-african-response.json")
    respx.post("https://api.payd.money/api/v2/payments").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.payouts.pan_african(
        account_name="phone",
        account_holder_name="Jane",
        account_number="+2348000000000",
        network_code="nid",
        channel_id="cid",
        phone_number="+2348000000000",
        amount=1000,
        narration="payout",
        currency="NGN",
        transaction_channel="phone",
        provider_name="MTN",
        provider_code="mtn-gh",
    )

    assert out["success"] is True


@respx.mock
def test_merchant_payout() -> None:
    fixture = load_fixture("payouts", "merchant-response.json")
    respx.post("https://api.payd.money/api/v3/withdrawal").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(
        api_username="a",
        api_password="b",
        default_username="merchant",
        default_callback_url="https://example.com/hook",
    )

    out = client.payouts.merchant(
        amount=200,
        phone_number="+254700000000",
        narration="bill",
        business_account="123456",
        business_number="9876543210",
    )

    assert out["success"] is True
    assert out["transaction_reference"] == "9BD090722409eW"
