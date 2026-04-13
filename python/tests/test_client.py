import httpx
import pytest
import respx

from payd.client import PaydClient
from payd.errors import PaydAPIError, PaydAuthenticationError, PaydNetworkError


def test_constructor_requires_credentials() -> None:
    with pytest.raises(PaydAuthenticationError):
        PaydClient(api_username="", api_password="secret")


@respx.mock
def test_request_adds_basic_auth_header() -> None:
    route = respx.post("https://api.payd.money/api/v2/p2p").mock(
        return_value=httpx.Response(200, json={"success": True, "message": "ok"})
    )
    client = PaydClient(api_username="alice", api_password="secret")

    response = client.request("POST", "/api/v2/p2p", body={"x": 1})

    assert response["success"] is True
    assert route.called is True
    assert route.calls[0].request.headers["Authorization"].startswith("Basic ")


@respx.mock
def test_request_401_raises_auth_error() -> None:
    respx.get("https://api.payd.money/api/v1/status/abc").mock(
        return_value=httpx.Response(401, json={"success": False, "message": "unauthorized"})
    )
    client = PaydClient(api_username="alice", api_password="secret")

    with pytest.raises(PaydAuthenticationError):
        client.request("GET", "/api/v1/status/abc")


@respx.mock
def test_request_success_false_raises_api_error() -> None:
    respx.post("https://api.payd.money/api/v2/p2p").mock(
        return_value=httpx.Response(200, json={"success": False, "message": "bad request"})
    )
    client = PaydClient(api_username="alice", api_password="secret")

    with pytest.raises(PaydAPIError):
        client.request("POST", "/api/v2/p2p", body={"x": 1})


@respx.mock
def test_request_network_error_retries_and_raises() -> None:
    respx.post("https://api.payd.money/api/v2/p2p").mock(side_effect=httpx.ConnectError("boom"))
    client = PaydClient(api_username="alice", api_password="secret", max_retries=1)

    with pytest.raises(PaydNetworkError):
        client.request("POST", "/api/v2/p2p", body={"x": 1})
