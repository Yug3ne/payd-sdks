"""General parameter validation utilities."""

from payd.errors import PaydValidationError


def validate_required(params: dict, required_fields: list[str]) -> None:
    """
    Validate that required fields are present and non-empty.

    Raises PaydValidationError if any field is None or empty string.
    """
    for field in required_fields:
        value = params.get(field)
        if value is None or value == "":
            raise PaydValidationError(
                f"{field} is required and cannot be empty",
                field=field,
            )


def validate_enum(value: str, allowed: list[str], field: str) -> None:
    """
    Validate that a value is one of the allowed options.

    Example: validate_enum("bank", ["bank", "phone"], "account_name")
    """
    if value not in allowed:
        raise PaydValidationError(
            f'{field} must be one of: {", ".join(allowed)}. Got: "{value}"',
            field=field,
        )
