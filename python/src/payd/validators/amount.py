"""Amount validation utilities."""

import math

from payd.errors import PaydValidationError


def _is_valid_number(amount: object) -> bool:
    return isinstance(amount, (int, float)) and not isinstance(amount, bool) and not math.isnan(amount)


def validate_amount(amount: int | float, min_val: int | float, max_val: int | float, context: str) -> None:
    """Validate an amount is within the allowed range."""
    if not _is_valid_number(amount):
        raise PaydValidationError("amount is required and must be a number", field="amount")
    if amount < min_val:
        raise PaydValidationError(
            f"amount must be at least {min_val} for {context}. Got: {amount}",
            field="amount",
        )
    if amount > max_val:
        raise PaydValidationError(
            f"amount must be at most {max_val} for {context}. Got: {amount}",
            field="amount",
        )


def validate_mpesa_amount(amount: int | float) -> None:
    """Validate M-Pesa amount (KES 10 - 250,000)."""
    validate_amount(amount, 10, 250_000, "M-Pesa transactions")


def validate_card_amount(amount: int | float) -> None:
    """Validate card payment amount (min KES 100)."""
    validate_amount(amount, 100, float("inf"), "card transactions")


def validate_positive_amount(amount: int | float) -> None:
    """Validate a positive amount (for Pan-African and transfers)."""
    if not _is_valid_number(amount):
        raise PaydValidationError("amount is required and must be a number", field="amount")
    if amount <= 0:
        raise PaydValidationError(
            f"amount must be greater than 0. Got: {amount}",
            field="amount",
        )
