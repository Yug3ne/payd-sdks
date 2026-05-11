import httpx
import pytest
import respx

from payd.client import PaydClient
from payd.errors import PaydValidationError
from helpers import load_fixture


@respx.mock
def test_discover_builds_helpers() -> None:
    fixture = load_fixture("networks", "discovery-response.json")
    respx.get("https://api.payd.money/v2/networks/grouped").mock(
        return_value=httpx.Response(200, json=fixture)
    )
    client = PaydClient(api_username="a", api_password="b")

    nets = client.networks.discover("receipt", "+256")

    assert len(nets.mobile) == 1
    mm = nets.find_mobile("Mobile")
    params = mm.to_payment_params()
    assert params["network_code"] == "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee"
    assert params["channel_id"] == "66666666-7777-4888-9999-aaaaaaaaaaaa"


def test_discover_requires_plus_dial_code() -> None:
    client = PaydClient(api_username="a", api_password="b")

    with pytest.raises(PaydValidationError):
        client.networks.discover("receipt", "256")
