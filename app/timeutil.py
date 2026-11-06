"""UTC storage helpers. Times are stored in UTC and displayed in WAT."""

from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def iso_utc(value: datetime | None) -> str | None:
    value = ensure_utc(value)
    if value is None:
        return None
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")
