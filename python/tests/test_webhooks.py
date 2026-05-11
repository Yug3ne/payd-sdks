import hashlib
import hmac
import json

import pytest

from payd.errors import PaydValidationError, PaydWebhookVerificationError
from payd.webhooks import Webhooks, derive_transaction_type
from helpers import load_fixture


def test_parse_kenya_success_fixture() -> None:
    raw = load_fixture("webhooks", "kenya-success.json")
    w = Webhooks()
    event = w.parse_event(raw)

    assert event["is_success"] is True
    assert event["transaction_type"] == "receipt"
    assert event["transaction_reference"] == "9BD103739849eR"


def test_derive_transaction_type_dot_es() -> None:
    assert derive_transaction_type("9BD12041887.eS") == "transfer"


def test_verify_accepts_valid_hmac() -> None:
    secret = "whsec_test"
    payload = {"amount": 10, "order_id": "a1"}
    body = json.dumps({k: payload[k] for k in sorted(payload.keys())}, separators=(",", ":"))
    sig = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()

    w = Webhooks()
    # Incoming body may use different key order; verify normalizes
    body_shuffled = '{"order_id":"a1","amount":10}'
    assert w.verify(body_shuffled, sig, secret) is True


def test_verify_rejects_bad_sig() -> None:
    w = Webhooks()
    with pytest.raises(PaydWebhookVerificationError):
        w.verify('{"a":1}', "00" * 32, "secret")


def test_parse_invalid_json_string() -> None:
    w = Webhooks()
    with pytest.raises(PaydValidationError):
        w.parse_event("not json")
