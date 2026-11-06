"""Unit tests for deadlines, state machine, config loading, and the parse API."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.case_service import TransitionError, confirm_sent, create_case, resolve, escalate, bank_reply
from app.config_loader import (
    deadline_window_hours,
    resolve_deadline,
    deadlines,
    banks,
    escalation,
    clear_cache,
    PROBLEM_TYPES,
    CHANNELS,
)
from app.database import Base, engine, SessionLocal
from app.models import Case, STATUSES


client = TestClient(app)


# ----- Deadline calculation -----

@pytest.fixture(autouse=True)
def _clear_config_cache():
    clear_cache()
    yield
    clear_cache()


@pytest.fixture(autouse=True)
def _clear_db():
    """Clear the cases table before each DB test so IDs don't collide."""
    db = SessionLocal()
    try:
        db.query(Case).delete()
        db.commit()
    finally:
        db.close()


def test_deadline_atm_on_us():
    assert deadline_window_hours("atm_failure", "atm") == 48


def test_deadline_pos():
    assert deadline_window_hours("pos_web_failure", "pos") == 72


def test_deadline_web():
    assert deadline_window_hours("pos_web_failure", "web") == 72


def test_deadline_failed_transfer():
    assert deadline_window_hours("failed_transfer", "transfer") == 48


def test_deadline_duplicate_transfer():
    assert deadline_window_hours("duplicate_debit", "transfer") == 48


def test_deadline_duplicate_atm():
    assert deadline_window_hours("duplicate_debit", "atm") == 24


def test_deadline_wrong_account_none():
    assert deadline_window_hours("wrong_account", "transfer") is None


def test_resolve_deadline_verified_flags():
    d = resolve_deadline("failed_transfer", "transfer")
    assert d["is_estimate"] is True
    assert d["verified"] is False

    d2 = resolve_deadline("pos_web_failure", "pos")
    assert d2["is_estimate"] is False
    assert d2["verified"] is True


# ----- Config loading -----

def test_deadlines_loaded():
    data = deadlines()
    assert "items" in data
    keys = {item["key"] for item in data["items"]}
    assert "atm_not_dispensed_on_us" in keys
    assert "wrong_account" in keys


def test_banks_loaded():
    data = banks()
    assert "items" in data
    for bank in data["items"]:
        assert "key" in bank
        assert "name" in bank
        assert "dispute_email" in bank


def test_escalation_loaded():
    data = escalation()
    assert "items" in data
    tiers = {item["tier"] for item in data["items"]}
    assert tiers == {1, 2, 3}


# ----- Config endpoint -----

def test_config_endpoint():
    resp = client.get("/api/config")
    assert resp.status_code == 200
    body = resp.json()
    assert "deadlines" in body
    assert "banks" in body
    assert "escalation" in body


# ----- Case model / state machine -----

def _make_case(db, status="draft_ready", case_id="test-case-1", **overrides):
    data = dict(
        problem_type="failed_transfer",
        channel="transfer",
        bank_name="Test Bank",
        amount=100.0,
        txn_date="2026-10-13",
        txn_time="14:05",
        reference="REF123",
        complaint_text="Dear bank, I am disputing this debit.",
    )
    data.update(overrides)
    case = Case(id=case_id, status=status, **data)
    db.add(case)
    db.commit()
    return case


def test_create_case_transition_to_sent():
    db = SessionLocal()
    try:
        case = _make_case(db, status="draft_ready", case_id="tc-sent")
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        updated = confirm_sent(case, sent_at=now)
        assert updated.status == "sent"
        assert updated.sent_at == now
        assert updated.deadline_at is not None
    finally:
        db.close()


def test_confirm_sent_rejects_non_draft():
    db = SessionLocal()
    try:
        case = _make_case(db, status="sent", case_id="tc-nondraft")
        with pytest.raises(TransitionError) as exc:
            confirm_sent(case)
        assert exc.value.code == "invalid_transition"
    finally:
        db.close()


def test_bank_reply_only_from_sent():
    db = SessionLocal()
    try:
        case = _make_case(db, status="draft_ready", case_id="tc-br-draft")
        with pytest.raises(TransitionError) as exc:
            bank_reply(case, ticket="T1")
        assert exc.value.code == "invalid_transition"

        case2 = _make_case(db, status="sent", case_id="tc-br-sent")
        updated = bank_reply(case2, ticket="T1", note="received")
        assert updated.status == "bank_replied"
        assert updated.bank_ticket == "T1"
    finally:
        db.close()


def test_resolve_from_sent_or_bank_replied():
    db = SessionLocal()
    try:
        case = _make_case(db, status="sent", case_id="tc-res-sent")
        updated = resolve(case)
        assert updated.status == "resolved"

        case2 = _make_case(db, status="bank_replied", case_id="tc-res-br")
        updated2 = resolve(case2)
        assert updated2.status == "resolved"

        case3 = _make_case(db, status="draft_ready", case_id="tc-res-draft")
        with pytest.raises(TransitionError):
            resolve(case3)
    finally:
        db.close()


def test_resolved_is_final():
    db = SessionLocal()
    try:
        case = _make_case(db, status="resolved", case_id="tc-final")
        with pytest.raises(TransitionError):
            resolve(case)
        with pytest.raises(TransitionError):
            escalate(case, 1)
        with pytest.raises(TransitionError):
            bank_reply(case)
    finally:
        db.close()


def test_escalate_any_non_resolved():
    db = SessionLocal()
    try:
        for i, status in enumerate(("draft_ready", "sent", "bank_replied", "escalated")):
            case = _make_case(db, status=status, case_id=f"tc-esc-{i}")
            updated = escalate(case, 2)
            assert updated.status == "escalated"
            assert updated.escalation_tier == 2
    finally:
        db.close()


def test_escalate_invalid_tier():
    db = SessionLocal()
    try:
        case = _make_case(db, status="sent", case_id="tc-tier")
        with pytest.raises(TransitionError) as exc:
            escalate(case, 9)
        assert exc.value.code == "invalid_tier"
    finally:
        db.close()


# ----- Statuses constant -----

def test_statuses_constant():
    assert STATUSES == ("draft_ready", "sent", "bank_replied", "resolved", "escalated")


# ----- Parse API tests -----

def test_parse_text_success():
    with patch("app.parser_api.parse_alert") as mock_parse:
        mock_parse.return_value = {
            "amount": 200.0,
            "date": "2026-10-13",
            "time": "14:05",
            "channel": "pos",
            "bank": "ExampleBank",
            "reference": "12345",
        }
        resp = client.post("/api/parse-text", json={"text": "Debit NGN200.00 from ExampleBank on 13/10/2026 at 14:05 via POS. Ref:12345"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["amount"] == 200.0
        assert body["bank"] == "ExampleBank"


def test_parse_text_could_not_parse():
    with patch("app.parser_api.parse_alert") as mock_parse:
        mock_parse.return_value = {"error": "could_not_parse", "missing": ["amount", "date"]}
        resp = client.post("/api/parse-text", json={"text": "hello world"})
        assert resp.status_code == 200
        assert resp.json()["error"] == "could_not_parse"


def test_parse_text_empty():
    resp = client.post("/api/parse-text", json={"text": ""})
    assert resp.status_code == 200
    assert resp.json()["error"] == "could_not_parse"


def test_extract_image_text_wrong_type():
    resp = client.post(
        "/api/extract-image-text",
        files={"file": ("doc.txt", b"not an image", "text/plain")},
    )
    assert resp.status_code == 415


def test_extract_image_text_oversized():
    big = b"x" * (5 * 1024 * 1024)
    resp = client.post(
        "/api/extract-image-text",
        files={"file": ("big.png", big, "image/png")},
    )
    assert resp.status_code == 413


def test_parse_rate_limit():
    from app.rate_limit import parse_limiter
    parse_limiter._hits.clear()
    with patch("app.parser_api.parse_alert") as mock_parse:
        mock_parse.return_value = {"error": "could_not_parse", "missing": []}
        # Exhaust the 10/minute limit
        for i in range(10):
            resp = client.post("/api/parse-text", json={"text": "some text"})
            assert resp.status_code == 200, f"request {i} got {resp.status_code}"
        resp = client.post("/api/parse-text", json={"text": "some text"})
        assert resp.status_code == 429


# ----- Problem types and channels constants -----

def test_problem_types():
    assert PROBLEM_TYPES == {
        "failed_transfer",
        "duplicate_debit",
        "pos_web_failure",
        "atm_failure",
        "wrong_account",
    }


def test_channels():
    assert CHANNELS == {"atm", "pos", "transfer", "web"}
