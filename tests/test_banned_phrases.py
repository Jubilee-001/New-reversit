"""Banned-phrase scan: fails if any prohibited marketing/claims phrase appears in source."""

from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

BANNED_PHRASES = [
    "Zero hallucinations",
    "zero hallucinations",
    "Certified",
    "certified",
    "Staff Portal",
    "staff portal",
    "Operations Console",
    "Bank-Grade Encryption",
    "bank-grade",
    "Local PII Redaction",
    "masked on your device",
    "automated balance redaction",
    "confidence",
    "Template verified",
    "Smart Reversal",
    "simulated",
    "Simulated",
    "NIP-DEMO",
    "provisional credit",
    "zero customer liability",
    "funds fully guaranteed",
    "Official Bank Credit Advice",
    "Credit Advice Slip",
    "Switch Interrogation",
    "Reconciliation & Safety Audit",
    "Ledger Reversal & Credit",
    "8-Check Gate",
    "AI suggestion",
    "switch telemetry",
    "real-time NIBSS",
    "connected to your bank",
    "instant refund",
    "guaranteed refund",
    "we reverse",
    "we refund",
    "multilingual voice",
    "Hausa",
    "Yoruba",
    "Igbo",
    "Pidgin",
    "Notification Hub",
    "WhatsApp",
    "Maker-Checker",
    "DEMO-BANK",
]


def _collect_source_files() -> list[Path]:
    files: list[Path] = []
    for base in ["apps/web/src", "app", "tests"]:
        root = ROOT / base
        if not root.exists():
            continue
        for pattern in ("**/*.ts", "**/*.tsx", "**/*.py"):
            for f in root.glob(pattern):
                if f.name == "test_banned_phrases.py":
                    continue
                files.append(f)
    return files


def test_no_banned_phrases_in_source():
    violations: list[tuple[str, str, int]] = []
    for path in _collect_source_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for line_no, line in enumerate(text.splitlines(), start=1):
            for phrase in BANNED_PHRASES:
                if phrase in line:
                    violations.append((str(path.relative_to(ROOT)), phrase, line_no))

    assert not violations, (
        "Banned phrases found in source code:\n"
        + "\n".join(f"  {f}:{l}: contains '{p}'" for f, p, l in violations)
    )
