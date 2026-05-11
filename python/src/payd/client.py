"""Core Payd HTTP client."""

from __future__ import annotations

import base64
import json
import time
from urllib.parse import urlencode

import httpx

from payd.errors import PaydAPIError, PaydAuthenticationError, PaydNetworkError
from payd.resources.balances import Balances
from payd.resources.collections import Collections
from payd.resources.networks import Networks
from payd.resources.payouts import Payouts
from payd.resources.transactions import Transactions
from payd.resources.transfers import Transfers
from payd.webhooks import Webhooks

DEFAULT_BASE_URL = "https://api.payd.money"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 2


class PaydClient:
    """Main SDK client that handles auth, retries, and resource namespaces."""

    def __init__(
        self,
        api_username: str,
        api_password: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        wallet_type: str | None = None,
        default_callback_url: str | None = None,
        default_username: str | None = None,
        debug: bool = False,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        if not api_username or not api_password:
            raise PaydAuthenticationError(
                "api_username and api_password are required to create a PaydClient."
            )

        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._debug = debug
        self._max_retries = max_retries

        credentials = f"{api_username}:{api_password}".encode("utf-8")
        encoded = base64.b64encode(credentials).decode("utf-8")
        self._auth_header = f"Basic {encoded}"

        self.defaults: dict[str, str | None] = {
            "wallet_type": wallet_type,
            "callback_url": default_callback_url,
            "username": default_username,
        }

        self.collections = Collections(self)
        self.payouts = Payouts(self)
        self.transfers = Transfers(self)
        self.networks = Networks(self)
        self.transactions = Transactions(self)
        self.balances = Balances(self)
        self.webhooks = Webhooks()

    def request(
        self,
        method: str,
        path: str,
        body: dict | None = None,
        query: dict[str, str] | None = None,
    ) -> dict:
        """Perform an authenticated API request with retry behavior."""
        url = self._build_url(path, query)
        headers = {
            "Authorization": self._auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        if self._debug:
            print(f"[Payd SDK] {method.upper()} {url}")
            if body and method.upper() == "POST":
                print(f"[Payd SDK] Body: {json.dumps(body, indent=2)}")

        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    response = client.request(
                        method=method.upper(),
                        url=url,
                        headers=headers,
                        json=body if method.upper() == "POST" and body is not None else None,
                    )

                if response.status_code == 401:
                    raise PaydAuthenticationError()

                if self._debug:
                    print(f"[Payd SDK] Response: {response.status_code} {response.reason_phrase}")

                try:
                    data = response.json()
                except ValueError as exc:
                    raise PaydAPIError(
                        response.status_code,
                        f"Failed to parse API response (HTTP {response.status_code})",
                    ) from exc

                if self._debug and isinstance(data, dict):
                    print(f"[Payd SDK] Data: {json.dumps(data, indent=2)}")

                is_http_ok = 200 <= response.status_code < 300
                if (not is_http_ok) or (isinstance(data, dict) and data.get("success") is False):
                    message = (
                        str(data.get("message"))
                        if isinstance(data, dict) and data.get("message")
                        else f"API request failed (HTTP {response.status_code})"
                    )
                    status_code = response.status_code
                    if isinstance(data, dict) and isinstance(data.get("status"), int):
                        status_code = data["status"]
                    raise PaydAPIError(status_code, message, detail=data)

                if not isinstance(data, dict):
                    raise PaydAPIError(response.status_code, "API response must be a JSON object", detail=data)

                return data
            except httpx.RequestError as exc:
                last_error = exc
            except PaydAPIError as exc:
                if exc.status_code < 500:
                    raise
                last_error = exc
            except PaydAuthenticationError:
                raise

            if attempt < self._max_retries:
                time.sleep(0.2 * (2**attempt))

        raise PaydNetworkError(
            f"Request to {path} failed after {self._max_retries + 1} attempts",
            cause=last_error,
        )

    def _build_url(self, path: str, query: dict[str, str] | None) -> str:
        url = f"{self._base_url}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"
        return url
