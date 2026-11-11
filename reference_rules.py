import re
from datetime import datetime


NIGERIAN_REFERENCE_INSTRUCTION = (
    "Identify the unique transaction identifier. On Nigerian receipts, this may be labeled "
    "'Transaction ID', 'Trans ID', 'Session ID', 'RRN', or 'Reference'. It is typically a "
    "12-digit RRN, a 30-digit NIP Session ID, or a distinct alphanumeric transaction code. "
    "DO NOT confuse phone numbers, account numbers, or timestamps with the reference."
)

REFERENCE_PATTERN = re.compile(
    r"(?P<label>(?<![A-Za-z0-9])(?:"
    r"nip\s+session\s+id|retrieval\s+reference\s+number|payment\s+reference|"
    r"(?:reference|ref)\s*(?:no\.?|num(?:ber)?|code|id)?|"
    r"(?:transaction|trans|txn|session|order|payment|trace)"
    r"\s*(?:no\.?|num(?:ber)?|code|id)|"
    r"rrn|stan|code|id"
    r")(?![A-Za-z0-9]))[\s:：=#-]*",
    re.IGNORECASE,
)
NIP_SESSION_PATTERN = re.compile(r"\b\d{30}\b")
_REFERENCE_TOKEN_PATTERN = re.compile(r"\+?[A-Za-z0-9][A-Za-z0-9_-]*")
_PHONE_NUMBER_PATTERN = re.compile(r"(?:070|080|081|090|091)\d{8}")
_INTERNATIONAL_NIGERIAN_PHONE_PATTERN = re.compile(r"\+?234\d{10}")
_DATE_OR_TIMESTAMP_PATTERN = re.compile(
    r"(?:\d{8}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}/\d{1,2}/\d{4})"
)


def is_valid_reference(value: str, *, minimum_length: int = 10) -> bool:
    """Return whether a candidate has a plausible transaction-reference shape."""
    candidate = value.strip()
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])", candidate):
        return False
    if not minimum_length <= len(candidate) <= 36:
        return False

    compact = re.sub(r"[-_]", "", candidate)
    if re.fullmatch(r"(?:NGN|N)\d+(?:\.\d{1,2})?", candidate, re.IGNORECASE):
        return False
    if _DATE_OR_TIMESTAMP_PATTERN.fullmatch(compact):
        return False
    if len(compact) in {12, 14}:
        try:
            datetime.strptime(compact[:8], "%Y%m%d")
        except ValueError:
            pass
        else:
            return False
    if re.fullmatch(r"\d{10}", compact):
        return False
    if _PHONE_NUMBER_PATTERN.fullmatch(compact):
        return False
    if _INTERNATIONAL_NIGERIAN_PHONE_PATTERN.fullmatch(compact):
        return False
    return True


def extract_reference_candidates(text: str) -> list[str]:
    """Return valid values attached to recognized reference labels."""
    candidates = []
    for match in REFERENCE_PATTERN.finditer(text):
        label = re.sub(r"\s+", " ", match.group("label").lower()).strip().rstrip(".")
        remainder = text[match.end():]
        token = _REFERENCE_TOKEN_PATTERN.match(remainder.lstrip())
        if not token:
            continue
        candidate = token.group()

        if label == "nip session id":
            valid = bool(re.fullmatch(r"\d{30}", candidate)) and is_valid_reference(candidate)
        elif label in {"rrn", "retrieval reference number"}:
            valid = bool(re.fullmatch(r"\d{12}", candidate)) and is_valid_reference(candidate)
        else:
            valid = is_valid_reference(candidate, minimum_length=6)
        if valid:
            candidates.append(candidate)

    for match in NIP_SESSION_PATTERN.finditer(text):
        candidate = match.group()
        if candidate not in candidates and is_valid_reference(candidate, minimum_length=30):
            candidates.append(candidate)
    return candidates
