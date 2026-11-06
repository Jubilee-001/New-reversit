"""Deterministic complaint text.

The complaint is built only from confirmed fields and the JSON deadline data.
No model writes this text.
"""

from __future__ import annotations

from datetime import datetime

from app.config_loader import PROBLEM_LABELS, resolve_deadline

CHANNEL_WORDS = {
    "atm": "ATM cash withdrawal",
    "pos": "POS payment",
    "transfer": "bank transfer",
    "web": "web checkout",
}


def _human_date(value: str) -> str:
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%d %B %Y")
    except (TypeError, ValueError):
        return value


def _money(value: float) -> str:
    return f"NGN {value:,.2f}"


def generate_complaint(case) -> str:
    deadline = resolve_deadline(case.problem_type, case.channel)
    problem = PROBLEM_LABELS.get(case.problem_type, case.problem_type.replace("_", " "))
    channel = CHANNEL_WORDS.get(case.channel, case.channel)
    when = f"{_human_date(case.txn_date)} at {case.txn_time} WAT"

    details = [
        f"Date and time: {when}",
        f"Amount: {_money(case.amount)}",
        f"Channel: {channel}",
        f"Reference: {case.reference}",
    ]
    if case.account_last4:
        details.append(f"Account: ending {case.account_last4}")

    hours = deadline.get("window_hours")
    if hours:
        timeline = (
            f"Please reverse or correct this debit within {hours} hours. "
            f"This timeline is based on {deadline.get('source')}. "
            f"{deadline.get('note', '')} Check the latest CBN circulars for any change."
        ).strip()
    else:
        timeline = (
            "There is no fixed CBN deadline for a transfer sent to the wrong account. "
            "Please help with a recall request. Whether the money can be recovered "
            "depends on the recipient and the bank."
        )

    lines = [
        f"Dear {case.bank_name},",
        "",
        "I am writing to formally complain about a debit on my account.",
        "",
        "Transaction details:",
        *[f"- {item}" for item in details],
        "",
        f"What went wrong: {problem}.",
        "",
        timeline,
        "",
        "Please acknowledge this complaint and give me a ticket or reference number within 3 days.",
        "",
        "If this is not resolved in time, I may escalate the complaint to the Consumer "
        "Protection Department of the Central Bank of Nigeria.",
        "",
        "Thank you,",
        "[Your name]",
    ]
    return "\n".join(lines)
