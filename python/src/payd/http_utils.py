"""HTTP helpers (match JS encodeURIComponent for path segments)."""

from urllib.parse import quote

# Characters not escaped by encodeURIComponent in common JS engines
_URI_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()"


def encode_uri_component(value: str) -> str:
    return quote(value, safe=_URI_SAFE)
