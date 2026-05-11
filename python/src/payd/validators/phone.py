"""Phone number validation and normalization."""

import re

from payd.errors import PaydValidationError

# Kenyan phone: exactly 10 digits starting with 0 (e.g., 0700000000)
KENYA_PHONE_REGEX = re.compile(r"^0\d{9}$")

# International phone: + followed by 7-15 digits (e.g., +2340000000000)
INTERNATIONAL_PHONE_REGEX = re.compile(r"^\+\d{7,15}$")


def validate_kenya_phone(phone: str, field: str = "phone_number") -> None:
    """Validate a Kenyan phone number (10 digits, starting with 0)."""
    if not phone:
        raise PaydValidationError(f"{field} is required", field=field)
    if not KENYA_PHONE_REGEX.match(phone):
        raise PaydValidationError(
            f'{field} must be exactly 10 digits starting with 0 (e.g., 0700000000). Got: "{phone}"',
            field=field,
        )


def validate_international_phone(phone: str, field: str = "phone_number") -> None:
    """Validate an international phone number (starts with +, 7-15 digits)."""
    if not phone:
        raise PaydValidationError(f"{field} is required", field=field)
    if not INTERNATIONAL_PHONE_REGEX.match(phone):
        raise PaydValidationError(
            f'{field} must start with + followed by 7-15 digits (e.g., +2340000000000). Got: "{phone}"',
            field=field,
        )


def normalize_kenya_phone(phone: str) -> str:
    """
    Convert +254XXXXXXXXX to 0XXXXXXXXX for Kenya endpoints.
    Returns the original number if it doesn't match the +254 pattern.
    """
    if phone.startswith("+254") and len(phone) == 13:
        return "0" + phone[4:]
    return phone
