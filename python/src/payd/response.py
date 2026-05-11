"""Helpers for normalizing API response fields."""

from __future__ import annotations


def resolve_transaction_reference(data: dict) -> str:
    """Return transaction id from whichever key the API used."""
    return (
        str(data.get("transaction_reference") or "")
        or str(data.get("correlator_id") or "")
        or str(data.get("payd_transaction_ref") or "")
    )
