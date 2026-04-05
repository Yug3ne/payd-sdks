"""
Payd SDK error classes.

All errors inherit from PaydError so you can catch everything with:
    except PaydError as e: ...

Or catch specific types:
    except PaydValidationError as e:
        print(f"Bad field: {e.field}")
"""


class PaydError(Exception):
    """Base error class for all Payd SDK errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class PaydAuthenticationError(PaydError):
    """Thrown when API authentication fails (HTTP 401)."""

    def __init__(self, message: str = "Invalid API credentials. Check your api_username and api_password.") -> None:
        super().__init__(message)


class PaydValidationError(PaydError):
    """
    Thrown for client-side validation failures BEFORE the HTTP request is made.
    Examples: invalid phone format, amount out of range, missing required fields.
    """

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


class PaydAPIError(PaydError):
    """
    Thrown when the Payd API returns an error response.
    This includes both HTTP non-2xx responses AND HTTP 200 with success: false.
    """

    def __init__(self, status_code: int, message: str, detail: object = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


class PaydNetworkError(PaydError):
    """Thrown for network-level failures (connection refused, DNS errors, timeouts)."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class PaydWebhookVerificationError(PaydError):
    """Thrown when webhook signature verification fails."""

    def __init__(self, message: str = "Webhook signature verification failed.") -> None:
        super().__init__(message)
