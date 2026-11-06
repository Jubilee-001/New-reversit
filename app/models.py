"""The customer case record.

Only the last four digits of an account number are ever stored. Times are UTC.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.config_loader import resolve_deadline
from app.database import Base
from app.timeutil import ensure_utc, iso_utc, utcnow

STATUSES = ("draft_ready", "sent", "bank_replied", "resolved", "escalated")
NON_RESOLVED = ("draft_ready", "sent", "bank_replied", "escalated")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    problem_type = Column(String(40), nullable=False)
    channel = Column(String(20), nullable=False)
    bank_key = Column(String(60), nullable=True)
    bank_name = Column(String(120), nullable=False)

    amount = Column(Float, nullable=False)
    txn_date = Column(String(10), nullable=False)
    txn_time = Column(String(5), nullable=False)
    reference = Column(String(120), nullable=False)
    account_last4 = Column(String(4), nullable=True)

    complaint_text = Column(Text, nullable=False)
    to_email = Column(String(200), nullable=False, default="")

    status = Column(String(20), nullable=False, default="draft_ready", index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    sent_at_source = Column(String(20), nullable=True)
    deadline_at = Column(DateTime(timezone=True), nullable=True)
    bank_ticket = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    escalation_tier = Column(Integer, nullable=True)
    mail_opened_at = Column(DateTime(timezone=True), nullable=True)

    def overdue(self, now: datetime | None = None) -> bool:
        deadline = ensure_utc(self.deadline_at)
        if deadline is None or self.status == "resolved":
            return False
        return (now or utcnow()) > deadline

    def to_dict(self) -> dict:
        deadline = resolve_deadline(self.problem_type, self.channel)
        return {
            "id": self.id,
            "created_at": iso_utc(self.created_at),
            "updated_at": iso_utc(self.updated_at),
            "problem_type": self.problem_type,
            "channel": self.channel,
            "bank_key": self.bank_key,
            "bank_name": self.bank_name,
            "amount": self.amount,
            "txn_date": self.txn_date,
            "txn_time": self.txn_time,
            "reference": self.reference,
            "account_last4": self.account_last4,
            "complaint_text": self.complaint_text,
            "to_email": self.to_email,
            "status": self.status,
            "sent_at": iso_utc(self.sent_at),
            "sent_at_source": self.sent_at_source,
            "deadline_at": iso_utc(self.deadline_at),
            "bank_ticket": self.bank_ticket,
            "notes": self.notes,
            "resolved_at": iso_utc(self.resolved_at),
            "escalated_at": iso_utc(self.escalated_at),
            "escalation_tier": self.escalation_tier,
            "mail_opened": self.mail_opened_at is not None,
            "overdue": self.overdue(),
            "deadline": {
                "key": deadline.get("key"),
                "label": deadline.get("label"),
                "window_hours": deadline.get("window_hours"),
                "verified": bool(deadline.get("verified", False)) and not deadline.get("is_estimate", False),
                "is_estimate": bool(deadline.get("is_estimate", False)),
                "source": deadline.get("source", ""),
                "note": deadline.get("note", ""),
            },
        }


__all__ = ["Case", "STATUSES", "NON_RESOLVED"]
