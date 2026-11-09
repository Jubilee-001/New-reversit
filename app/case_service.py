"""Case creation and the state machine.

The only way into `sent` is confirm-sent. Transitions that the brief does not
allow are rejected with a clear message.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.complaint import generate_complaint
from app.config_loader import (
    CHANNELS,
    PROBLEM_TYPES,
    bank_by_key,
    bank_by_name,
    deadline_window_hours,
)
from app.models import Case
from app.timeutil import ensure_utc, utcnow

SENT_TOLERANCE = timedelta(minutes=2)


class TransitionError(Exception):
    def __init__(self, message: str, code: str = "invalid_transition"):
        super().__init__(message)
        self.message = message
        self.code = code


def new_case_id() -> str:
    # 32 bytes -> 256 bits of entropy, unguessable.
    return secrets.token_urlsafe(32)


def parse_utc(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise TransitionError("The date and time could not be read.", "invalid_datetime") from exc
    parsed = ensure_utc(parsed)
    if parsed is None:
        raise TransitionError("The date and time could not be read.", "invalid_datetime")
    return parsed


def create_case(db: Session, data: dict) -> Case:
    problem_type = (data.get("problem_type") or "").strip()
    channel = (data.get("channel") or "").strip().lower()
    bank_name = (data.get("bank_name") or "").strip()
    reference = (data.get("reference") or "").strip()
    txn_date = (data.get("txn_date") or "").strip()
    txn_time = (data.get("txn_time") or "").strip()
    account_last4 = (data.get("account_last4") or "").strip() or None

    if problem_type not in PROBLEM_TYPES:
        raise TransitionError("Choose what went wrong.", "invalid_problem")
    if channel not in CHANNELS:
        raise TransitionError("Choose the payment channel.", "invalid_channel")
    if not bank_name:
        raise TransitionError("Enter the bank name.", "invalid_bank")
    if not reference:
        raise TransitionError("Enter the transaction reference.", "invalid_reference")

    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        raise TransitionError("Enter a valid amount.", "invalid_amount")
    if amount <= 0:
        raise TransitionError("Enter a valid amount.", "invalid_amount")

    try:
        datetime.strptime(txn_date, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise TransitionError("Enter the transaction date.", "invalid_date")
    try:
        datetime.strptime(txn_time, "%H:%M")
    except (TypeError, ValueError):
        raise TransitionError("Enter the transaction time.", "invalid_time")

    if account_last4 is not None and not (len(account_last4) == 4 and account_last4.isdigit()):
        raise TransitionError("Enter only the last 4 digits of the account.", "invalid_last4")

    bank_key = (data.get("bank_key") or "").strip() or None
    bank = bank_by_key(bank_key) if bank_key else bank_by_name(bank_name)
    if bank:
        bank_key = bank["key"]
        bank_name = bank["name"]

    to_email = (data.get("to_email") or "").strip()
    if not to_email and bank:
        to_email = bank.get("dispute_email") or ""

    case = Case(
        id=new_case_id(),
        created_at=utcnow(),
        updated_at=utcnow(),
        problem_type=problem_type,
        channel=channel,
        bank_key=bank_key,
        bank_name=bank_name,
        amount=amount,
        txn_date=txn_date,
        txn_time=txn_time,
        reference=reference,
        account_last4=account_last4,
        to_email=to_email,
        status="draft_ready",
    )
    case.complaint_text = generate_complaint(case)
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def mail_opened(case: Case, now: datetime | None = None) -> Case:
    if case.status != "draft_ready":
        raise TransitionError(
            f"A case that is {case.status.replace('_', ' ')} cannot open a draft email again."
        )
    case.mail_opened_at = now or utcnow()
    case.updated_at = utcnow()
    return case


def confirm_sent(case: Case, sent_at: datetime | None = None, now: datetime | None = None) -> Case:
    if case.status != "draft_ready":
        raise TransitionError(
            f"Only a draft can be marked as sent; this case is {case.status.replace('_', ' ')}."
        )

    now = ensure_utc(now) or utcnow()
    created = ensure_utc(case.created_at) or now
    source = "confirmed_now"
    if sent_at is None:
        sent_at = now
    else:
        sent_at = ensure_utc(sent_at)
        source = "user_entered"

    if sent_at > now + SENT_TOLERANCE:
        raise TransitionError("The send time cannot be in the future.", "sent_in_future")
    if sent_at < created:
        raise TransitionError(
            "The send time cannot be before you started this case.", "sent_before_created"
        )

    hours = deadline_window_hours(case.problem_type, case.channel)
    case.status = "sent"
    case.sent_at = sent_at
    case.sent_at_source = source
    case.deadline_at = sent_at + timedelta(hours=hours) if hours else None
    case.updated_at = now
    return case


def bank_reply(case: Case, ticket: str | None = None, note: str | None = None) -> Case:
    if case.status != "sent":
        raise TransitionError(
            f"Only a sent case can record a bank reply; this case is {case.status.replace('_', ' ')}."
        )
    case.status = "bank_replied"
    if ticket:
        case.bank_ticket = ticket.strip()[:120]
    if note:
        case.notes = note.strip()[:4000]
    case.updated_at = utcnow()
    return case


def resolve(case: Case) -> Case:
    if case.status not in {"sent", "bank_replied"}:
        raise TransitionError(
            f"Only a sent or replied case can be resolved; this case is {case.status.replace('_', ' ')}."
        )
    case.status = "resolved"
    case.resolved_at = utcnow()
    case.updated_at = case.resolved_at
    return case


def escalate(case: Case, tier: int) -> Case:
    if case.status == "resolved":
        raise TransitionError("A resolved case cannot be escalated.")
    if tier not in {1, 2, 3}:
        raise TransitionError("Choose escalation tier 1, 2 or 3.", "invalid_tier")
    case.status = "escalated"
    case.escalated_at = utcnow()
    case.escalation_tier = tier
    case.updated_at = case.escalated_at
    return case
