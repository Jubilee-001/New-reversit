from unittest.mock import patch

import parse


def test_normalize_time_handles_seconds_and_meridiem():
    assert parse.normalize_time("20:08:30") == "20:08"
    assert parse.normalize_time("08:08 PM") == "20:08"
    assert parse.normalize_time("12:08 AM") == "00:08"
    assert parse.normalize_time("13:08 PM") is None


def test_normalize_date_handles_ordinal_month_first_date():
    assert parse.normalize_date("May 12th, 2025") == "2025-05-12"
    assert parse.normalize_date("12th May, 2025") == "2025-05-12"


def test_parse_alert_returns_normalized_llm_fields():
    extracted = {
        "amount": "₦93,000",
        "date": "May 12th, 2025",
        "time": "08:08 PM",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF93000",
    }

    with (
        patch("parse.parse_with_regex", return_value=None),
        patch("parse.parse_with_llm", return_value=extracted),
    ):
        result = parse.parse_alert(
            "Debit ₦93,000 via POS on May 12th, 2025 at 08:08 PM. Ref: REF93000"
        )

    assert result == {
        "amount": 93000.0,
        "date": "2025-05-12",
        "time": "20:08",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF93000",
    }


def test_parse_screenshot_returns_normalized_fields():
    extracted = {
        "amount": "₦93,000",
        "date": "May 12th, 2025",
        "time": "08:08 PM",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF93000",
    }

    with (
        patch(
            "parse.extract_text_from_image",
            return_value="Debit ₦93,000 via POS on May 12th, 2025 at 08:08 PM. Ref: REF93000",
        ),
        patch("parse.parse_with_regex", return_value=None),
        patch("parse.parse_with_llm", return_value=extracted),
    ):
        result = parse.parse_screenshot("receipt.png")

    assert result == {
        "amount": 93000.0,
        "date": "2025-05-12",
        "time": "20:08",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF93000",
    }
