from unittest.mock import patch

import parse
from regex_parser import parse_with_regex


def test_normalize_time_handles_seconds_and_meridiem():
    assert parse.normalize_time("20:08:30") == "20:08"
    assert parse.normalize_time("08:08 PM") == "20:08"
    assert parse.normalize_time("12:08 AM") == "00:08"
    assert parse.normalize_time("13:08 PM") is None


def test_normalize_date_handles_ordinal_month_first_date():
    assert parse.normalize_date("May 12th, 2025") == "2025-05-12"
    assert parse.normalize_date("12th May, 2025") == "2025-05-12"
    assert parse.normalize_date("05/12/2025") == "2025-05-12"


def test_parse_alert_returns_normalized_llm_fields():
    extracted = {
        "amount": "₦93,000",
        "date": "May 12th, 2025",
        "time": "08:08 PM",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF9300000",
    }

    with (
        patch("parse.parse_with_regex", return_value=None),
        patch("parse.parse_with_llm", return_value=extracted),
    ):
        result = parse.parse_alert(
            "Debit ₦93,000 via POS on May 12th, 2025 at 08:08 PM. Ref: REF9300000"
        )

    assert result == {
        "amount": 93000.0,
        "date": "2025-05-12",
        "time": "20:08",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF9300000",
    }


def test_parse_screenshot_returns_normalized_fields():
    extracted = {
        "amount": "₦93,000",
        "date": "May 12th, 2025",
        "time": "08:08 PM",
        "channel": "pos",
        "bank": "Example Bank",
        "reference": "REF9300000",
    }

    with (
        patch(
            "parse.extract_text_from_image",
            return_value="Debit ₦93,000 via POS on May 12th, 2025 at 08:08 PM. Ref: REF9300000",
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
        "reference": "REF9300000",
    }


def test_opay_receipt_keeps_labeled_reference_when_date_and_time_are_missing():
    receipt = """OPay
Transaction Receipt
₦10,000.00
SUCCESS
Transaction Type
Transfer to bank
Recipient Details
LAKAL AMOJURUWAO OLUWASEUN
Guaranty Trust Bank 2016439805
Sender Details
Ibrahim Akosile ololere
OPay 1806 932 1 133
Remarks
akosileololere
Transaction Reference
221231020422440454
Currency
₦50004234301051319221PNO067
To report
+234 700 200 0000"""
    regex_result = parse_with_regex(receipt)

    assert regex_result is not None
    assert regex_result["reference"] == "221231020422440454"
    assert regex_result["amount"] == 10000.0
    assert regex_result["channel"] == "transfer"
    assert regex_result["bank"] == "OPay"
    assert regex_result["date"] is None
    assert regex_result["time"] is None

    with patch("parse.parse_with_llm", return_value={"_ai_error_reason": "ai_unavailable"}):
        parsed = parse.parse_alert(receipt)

    assert parsed["reference"] == "221231020422440454"
    assert parsed["amount"] == 10000.0
    assert "reference" not in parsed["missing"]
    assert "date" in parsed["missing"]
    assert "time" in parsed["missing"]
