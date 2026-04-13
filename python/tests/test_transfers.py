import httpx
import pytest
import respx

from payd.client import PaydClient
from payd.errors import PaydValidationError


@respx.mock
def test_send_transfer_success_with_defaults() -> None:
    route = respx.post("https://api.payd.money/api/v2/p2p").mock(
        return_value=httpx.Response(200, json={"success": True, "transaction_reference": "TX123"})
    )
    client = PaydClient(api_username="alice", api_password="secret", wallet_type="USD")

    data = client.transfers.send(receiver_username="bob", amount=500, narration="rent")

    assert data["success"] is True
    sent = route.calls[0].request.content.decode()
    assert '"wallet_type":"USD"' in sent


def test_send_transfer_requires_receiver_and_narration() -> None:
    client = PaydClient(api_username="alice", api_password="secret")

    with pytest.raises(PaydValidationError):
        client.transfers.send(receiver_username="", amount=100, narration="ok")


def test_send_transfer_validates_optional_phone() -> None:
    client = PaydClient(api_username="alice", api_password="secret")

    with pytest.raises(PaydValidationError):
        client.transfers.send(
            receiver_username="bob",
            amount=100,
            narration="test",
            phone_number="0700000000",
        )
