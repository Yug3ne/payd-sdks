"""Core Payd HTTP client."""

from __future__ import annotations

import base64
import time
from urllib.parse import urlencode

import httpx

from payd.errors import PaydAPIError, PaydAuthenticationError, PaydNetworkError
from payd.resources.transfers import Transfers

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

        self.defaults = {
            "wallet_type": wallet_type,
            "callback_url": default_callback_url,
            "username": default_username,
        }

        self.transfers = Transfers(self)

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

        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    response = client.request(
                        method=method.upper(),
                        url=url,
                        headers=headers,
                        json=body if method.upper() == "POST" else None,
                    )

                if response.status_code == 401:
                    raise PaydAuthenticationError()

                try:
                    data = response.json()
                except ValueError as exc:
                    raise PaydAPIError(
                        response.status_code,
                        f"Failed to parse API response (HTTP {response.status_code})",
                    ) from exc

                is_http_ok = 200 <= response.status_code < 300
                if (not is_http_ok) or (isinstance(data, dict) and data.get("success") is False):
                    message = "API request failed"
                    if isinstance(data, dict) and data.get("message"):
                        message = str(data["message"])
                    raise PaydAPIError(response.status_code, message, detail=data)

                if not isinstance(data, dict):
                    raise PaydAPIError(response.status_code, "API response must be a JSON object", detail=data)

                return data
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.NetworkError) as exc:
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
