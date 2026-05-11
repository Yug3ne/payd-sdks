import pytest

from payd.errors import (
    PaydAPIError,
    PaydError,
    PaydNetworkError,
    PaydValidationError,
)


def test_validation_error_field() -> None:
    err = PaydValidationError("bad", field="phone_number")
    assert err.field == "phone_number"
    assert isinstance(err, PaydError)


def test_api_error_detail() -> None:
    err = PaydAPIError(400, "oops", detail={"success": False})
    assert err.status_code == 400
    assert err.detail == {"success": False}


def test_network_error_cause() -> None:
    inner = ValueError("x")
    err = PaydNetworkError("down", cause=inner)
    assert err.cause is inner
