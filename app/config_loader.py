"""Load the JSON files that are the single source of truth for the app."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

PROBLEM_TYPES = {
    "failed_transfer",
    "duplicate_debit",
    "pos_web_failure",
    "atm_failure",
    "wrong_account",
}

CHANNELS = {"atm", "pos", "transfer", "web"}

PROBLEM_LABELS = {
    "failed_transfer": "failed transfer",
    "duplicate_debit": "duplicate debit",
    "pos_web_failure": "POS or web payment failure",
    "atm_failure": "ATM cash not dispensed",
    "wrong_account": "transfer sent to the wrong account",
}


def _load(name: str):
    with open(DATA / name, encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def deadlines() -> dict:
    return _load("deadlines.json")


@lru_cache(maxsize=1)
def banks() -> dict:
    return _load("banks.json")


@lru_cache(maxsize=1)
def escalation() -> dict:
    return _load("escalation.json")


def clear_cache() -> None:
    deadlines.cache_clear()
    banks.cache_clear()
    escalation.cache_clear()


def _deadline_entry(key: str) -> dict | None:
    for entry in deadlines()["items"]:
        if entry["key"] == key:
            return entry
    return None


def bank_by_key(key: str | None) -> dict | None:
    if not key:
        return None
    for bank in banks()["items"]:
        if bank["key"] == key:
            return bank
    return None


def bank_by_name(name: str | None) -> dict | None:
    if not name:
        return None
    lowered = name.strip().lower()
    for bank in banks()["items"]:
        if bank["name"].strip().lower() == lowered:
            return bank
    return None


def resolve_deadline(problem_type: str, channel: str) -> dict:
    """Return the display deadline for a problem/channel pair.

    The JSON files hold the timelines. This function only chooses which entry
    applies; it never contains a number of its own.
    """
    channel = (channel or "").strip().lower()

    if problem_type == "duplicate_debit":
        entry = _deadline_entry("duplicate_debit") or {}
        hours = (entry.get("window_by_channel") or {}).get(channel)
        resolved = dict(entry)
        resolved["window_hours"] = hours
        resolved["is_estimate"] = not entry.get("verified", False)
        return resolved

    if problem_type == "pos_web_failure":
        key = "web_checkout_failure" if channel == "web" else "pos_failure"
        entry = _deadline_entry(key) or {}
        resolved = dict(entry)
        resolved["is_estimate"] = not entry.get("verified", False)
        return resolved

    if problem_type == "atm_failure":
        not_on_us = _deadline_entry("atm_not_dispensed_not_on_us") or {}
        on_us = _deadline_entry("atm_not_dispensed_on_us") or {}
        resolved = dict(not_on_us)
        resolved["key"] = "atm_not_dispensed"
        resolved["label"] = "ATM cash not dispensed"
        resolved["window_hours"] = not_on_us.get("window_hours")
        resolved["note"] = (
            f"If the ATM belongs to your bank the window is "
            f"{on_us.get('window_hours')} hours. If it belongs to another bank it is "
            f"{not_on_us.get('window_hours')} hours. {not_on_us.get('note', '')}"
        ).strip()
        resolved["is_estimate"] = False
        return resolved

    key = problem_type if problem_type in {"failed_transfer", "wrong_account"} else "failed_transfer"
    entry = _deadline_entry(key) or {}
    resolved = dict(entry)
    resolved["is_estimate"] = not entry.get("verified", False)
    return resolved


def deadline_window_hours(problem_type: str, channel: str) -> int | None:
    return resolve_deadline(problem_type, channel).get("window_hours")


def public_config() -> dict:
    return {
        "deadlines": deadlines()["items"],
        "deadline_last_checked": deadlines().get("last_checked"),
        "deadline_disclaimer": deadlines().get("disclaimer", "Check the latest CBN circulars."),
        "banks": banks()["items"],
        "bank_disclaimer": banks().get(
            "disclaimer", "Check this address on your bank's website before sending."
        ),
        "escalation": escalation()["items"],
        "problem_labels": PROBLEM_LABELS,
    }
