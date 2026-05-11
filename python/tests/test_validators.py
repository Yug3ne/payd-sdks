import pytest

from payd.errors import PaydValidationError
from payd.validators import (
    normalize_kenya_phone,
    validate_card_amount,
    validate_enum,
    validate_international_phone,
    validate_kenya_phone,
    validate_mpesa_amount,
    validate_positive_amount,
    validate_required,
)


def test_normalize_kenya_phone() -> None:
    assert normalize_kenya_phone("+254700000000") == "0700000000"


def test_kenya_phone_validation() -> None:
    validate_kenya_phone("0700000000")
    with pytest.raises(PaydValidationError):
        validate_kenya_phone("1700000000")


def test_international_phone() -> None:
    validate_international_phone("+2348000000000")
    with pytest.raises(PaydValidationError):
        validate_international_phone("0800")


def test_mpesa_amount_range() -> None:
    validate_mpesa_amount(10)
    validate_mpesa_amount(250_000)
    with pytest.raises(PaydValidationError):
        validate_mpesa_amount(9)
    with pytest.raises(PaydValidationError):
        validate_mpesa_amount(True)


def test_card_amount_minimum() -> None:
    validate_card_amount(100)
    with pytest.raises(PaydValidationError):
        validate_card_amount(99)


def test_positive_amount() -> None:
    validate_positive_amount(0.5)
    with pytest.raises(PaydValidationError):
        validate_positive_amount(0)
    with pytest.raises(PaydValidationError):
        validate_positive_amount(True)


def test_required_and_enum() -> None:
    validate_required({"a": "x"}, ["a"])
    with pytest.raises(PaydValidationError):
        validate_required({"a": ""}, ["a"])

    validate_enum("bank", ["bank", "phone"], "t")
    with pytest.raises(PaydValidationError):
        validate_enum("x", ["bank"], "t")
