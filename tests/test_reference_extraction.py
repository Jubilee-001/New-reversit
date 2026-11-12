from unittest.mock import patch

import pytest

import parse
from parse import SYSTEM_PROMPT, validate_extracted_data
from regex_parser import parse_with_regex


@pytest.mark.parametrize(
    ("label", "reference"),
    [
        ("Transaction ID", "TXN1234567890"),
        ("Trans ID", "TRANS12345678"),
        ("Txn ID", "TXN1234567890"),
        ("Session ID", "100004240512182008000012345678"),
        ("NIP Session ID", "100004240512182008000012345678"),
        ("Reference", "REF123456789"),
        ("Ref No", "REF123456789"),
        ("Payment Reference", "PAYREF123456"),
        ("Reference Number", "REFNUM123456"),
        ("Reference no", "REFNO123456"),
        ("Reference no.", "REFNO123456"),
        ("Reference Num", "REFNUM123456"),
        ("Reference Code", "REFCODE12345"),
        ("Ref no", "REFNO123456"),
        ("Ref no.", "REFNO123456"),
        ("Ref Num", "REFNUM123456"),
        ("Ref Code", "REFCODE12345"),
        ("Session No", "SESSION12345"),
        ("Transaction Num", "TRANS123456"),
        ("Txn Code", "TXNCODE12345"),
        ("Code", "CODE12345678"),
        ("RRN", "000048192031"),
        ("Retrieval Reference Number", "000048192031"),
        ("STAN", "STAN1234567"),
        ("Trace No", "TRACE1234567"),
        ("Order ID", "ORDER123456"),
        ("Payment ID", "PAYMENT12345"),
    ],
)
def test_recognizes_reference_label_synonyms(label, reference):
    result = parse_with_regex(f"Transfer sent NGN1,000. {label.lower()}: {reference}")

    assert result is not None
    assert result["reference"] == reference


@pytest.mark.parametrize(
    "candidate",
    [
        "MNP_1234567890",
        "550e8400-e29b-41d4-a716-446655440000",
    ],
)
def test_accepts_alphanumeric_and_uuid_references(candidate):
    result = parse_with_regex(f"Transfer sent NGN1,000. Payment ID: {candidate}")

    assert result is not None
    assert result["reference"] == candidate


@pytest.mark.parametrize(
    "candidate",
    [
        "07012345678",
        "08012345678",
        "08112345678",
        "09012345678",
        "09112345678",
        "+2348012345678",
        "2016439805",
        "20250512",
        "202505122008",
        "20:08:12",
        "93000",
        "45000",
    ],
)
def test_rejects_phone_account_date_time_and_amount_values(candidate):
    result = parse_with_regex(f"Transfer sent NGN1,000. Transaction ID: {candidate}")

    assert result is not None
    assert result["reference"] is None


def test_rejects_invalid_rrn_and_nip_session_lengths():
    rrn = parse_with_regex("Transfer sent NGN1,000. RRN: 00004819203")
    session = parse_with_regex("Transfer sent NGN1,000. NIP Session ID: 12345678901234567890123456789")

    assert rrn is not None and rrn["reference"] is None
    assert session is not None and session["reference"] is None


def test_does_not_guess_an_unlabeled_trailing_token():
    result = parse_with_regex("Transfer sent NGN1,000. Unlabeled token ABC123456789")

    assert result is not None
    assert result["reference"] is None


def test_extracts_standalone_nip_session_id():
    session_id = "999999999999999999999999999999"
    result = parse_with_regex(
        f"Transfer sent NGN1,000. NIP interbank session {session_id}"
    )

    assert result is not None
    assert result["reference"] == session_id


def test_reference_label_can_be_separated_from_value_by_newline():
    result = parse_with_regex(
        "Transfer sent NGN1,000. Reference no.\nREF123456"
    )

    assert result is not None
    assert result["reference"] == "REF123456"


def test_extracts_full_wrapped_moniepoint_reference_with_pipes():
    receipt = """Moniepoint
MICROFINANCE BANK
DEBIT
₦7,400.00
Transaction Date
Tuesday, October 27th, 2026 | 12:45 PM
Transaction Reference
CDS-27102026114154|2FBMQ979|740000|
124150_DEBIT_0"""

    result = parse_with_regex(receipt)

    assert result is not None
    assert result["reference"] == "CDS-27102026114154|2FBMQ979|740000|124150_DEBIT_0"
    assert len(result["reference"]) == 49
    assert result["date"] == "2026-10-27"
    assert result["time"] == "12:45"
    assert result["amount"] == 7400.0
    assert result["bank"] == "Moniepoint"


def test_extracts_shorter_pipe_delimited_moniepoint_reference():
    result = parse_with_regex(
        "Moniepoint DEBIT ₦1,000.00 Transaction Reference: "
        "TRF|2MPTqoc89|2116605855171567616"
    )

    assert result is not None
    assert result["reference"] == "TRF|2MPTqoc89|2116605855171567616"


def test_pipe_delimited_reference_supports_up_to_55_characters():
    maximum_reference = f"{'A' * 27}|{'B' * 27}"
    oversized_reference = f"{maximum_reference}C"

    accepted = parse_with_regex(f"DEBIT ₦1,000. Transaction Reference: {maximum_reference}")
    rejected = parse_with_regex(f"DEBIT ₦1,000. Transaction Reference: {oversized_reference}")

    assert accepted is not None and accepted["reference"] == maximum_reference
    assert rejected is not None and rejected["reference"] is None


@pytest.mark.parametrize(
    "reference",
    ["07012345678", "+2348012345678", "2016439805", "20250512", "93000"],
)
def test_llm_validation_rejects_non_reference_values(reference):
    data = {
        "amount": 1000,
        "date": "2025-05-12",
        "time": "20:08",
        "channel": "pos",
        "bank": "GTBank",
        "reference": reference,
    }

    valid, missing = validate_extracted_data(data)

    assert not valid
    assert missing == ["reference"]
    assert data["reference"] is None


def test_llm_system_prompt_contains_nigerian_reference_instruction():
    instruction = (
        "Identify the unique transaction identifier. On Nigerian receipts, this may be labeled "
        "'Transaction ID', 'Trans ID', 'Session ID', 'RRN', or 'Reference'. It is typically a "
        "12-digit RRN, a 30-digit NIP Session ID, or a distinct alphanumeric transaction code. "
        "DO NOT confuse phone numbers, account numbers, or timestamps with the reference."
    )

    assert instruction in SYSTEM_PROMPT


def test_llm_cannot_supply_a_reference_without_a_recognized_label():
    result = {
        "amount": 1000,
        "date": "2025-05-12",
        "time": "20:08",
        "channel": "pos",
        "bank": "GTBank",
        "reference": "MNP_1234567890",
    }
    with (
        patch("parse.parse_with_regex", return_value=None),
        patch("parse.parse_with_llm", return_value=result),
    ):
        parsed = parse.parse_alert(
            "Transfer sent NGN1,000 on 2025-05-12 at 20:08 via POS. MNP_1234567890"
        )

    assert parsed["error"] == "could_not_parse"
    assert parsed["missing"] == ["reference"]
