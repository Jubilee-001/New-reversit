"""
ReverseIt - Workstream 1: Alert Parsing

Public contract:
    parse_alert(text: str) -> dict        # pasted SMS / receipt text
    parse_screenshot(path: str) -> dict   # screenshot -> text -> parse_alert

Success: {"amount", "date", "time", "channel", "bank", "reference"}
Failure: {"error": "could_not_parse", "missing": [<field names>]}
"""
import json
import math
import os
import re
import time
from collections import deque
from datetime import datetime

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------
CHANNELS = ("atm", "pos", "transfer", "web")
REQUIRED_FIELDS = ["amount", "date", "time", "channel", "bank", "reference"]
DEFAULT_BANK = "Unknown"
EMPTY_MARKERS = {"", "unknown", "n/a", "na", "none", "null"}
REASON_CODES = (
    "empty",
    "too_long",
    "could_not_parse",
    "ai_unavailable",
    "ai_busy",
    "ai_error",
    "no_text",
    "invalid_file",
    "too_large",
    "bad_image",
)

# The project's Groq account currently exposes `qwen/qwen3.8-27b`, while the old
# llama names are stale or inaccessible on this account. Use the supported model
# by default and keep a small compatibility fallback chain.
TEXT_LLM_MODEL = os.getenv("GROQ_TEXT_MODEL") or os.getenv("GROQ_MODEL") or "qwen/qwen3.8-27b"
LLM_MODEL = TEXT_LLM_MODEL
LLM_MAX_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "400"))
AI_CALL_LIMIT_PER_MINUTE = int(os.getenv("GROQ_RATE_LIMIT_PER_MINUTE", "6"))
_AI_CALL_TIMES = deque()


def _model_candidates(env_name: str, defaults: tuple[str, ...]) -> list[str]:
    candidates: list[str] = []
    for raw in (os.getenv(env_name), *defaults):
        model = (raw or "").strip()
        if model and model not in candidates:
            candidates.append(model)
    return candidates


def _is_decommissioned_model_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "decommissioned" in message or "no longer supported" in message or "model_decommissioned" in message

# ---------------------------------------------------------------------
# Normalizers (shared by regex path, LLM path and validator)
# ---------------------------------------------------------------------
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d-%b-%Y",
    "%d-%B-%Y",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%B %d %Y",
    "%b %d %Y",
)


def normalize_date(raw) -> str | None:
    """Return YYYY-MM-DD or None if the value is not a recognizable date."""
    raw = re.sub(r"(?<=\d)(?:st|nd|rd|th)\b", "", str(raw).strip(), flags=re.IGNORECASE)
    raw = raw.replace(",", "")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


_TIME_RE = re.compile(
    r"^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?$",
    re.IGNORECASE,
)


def normalize_time(raw) -> str | None:
    """Return HH:MM (24h), accepting seconds and 12-hour AM/PM values."""
    m = _TIME_RE.match(str(raw).strip())
    if not m:
        return None
    hour = int(m.group(1))
    meridiem = (m.group(4) or "").upper()
    if meridiem:
        if not 1 <= hour <= 12:
            return None
        hour = hour % 12 + (12 if meridiem == "PM" else 0)
    elif hour > 23:
        return None
    return f"{hour:02d}:{m.group(2)}"


def normalize_amount(raw) -> float | None:
    """Return a positive finite float or None."""
    if isinstance(raw, bool):
        return None
    try:
        if isinstance(raw, str):
            raw = re.sub(r"[,\s₦$€£¥₹]|NGN|N(?=\d)", "", raw, flags=re.IGNORECASE)
        value = float(raw)
    except (ValueError, TypeError):
        return None
    if not math.isfinite(value) or value <= 0:
        return None
    return value


# ---------------------------------------------------------------------
# Tasks 1 & 2: Regex parser lives in regex_parser.py (teammate's module)
# ---------------------------------------------------------------------
try:
    from regex_parser import parse_with_regex
except ModuleNotFoundError:  # teammate's file not merged yet
    print("[Warning] regex_parser.py not found; using LLM only.")

    def parse_with_regex(text: str) -> dict | None:
        return None


# ---------------------------------------------------------------------
# Screenshot input lives in image_input.py (image -> text)
# ---------------------------------------------------------------------
try:
    from image_input import extract_text_from_image
except ModuleNotFoundError:  # image_input.py not in the folder
    print("[Warning] image_input.py not found; screenshot input disabled.")

    def extract_text_from_image(image_path: str) -> str | None:
        return None


# ---------------------------------------------------------------------
# Task 3: LLM fallback
# ---------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert Nigerian bank transaction parser.
Extract the transaction details from the alert text and return ONLY a valid JSON object.
Allowed channels: "atm", "pos", "transfer", "web".

JSON schema:
{
  "amount": number,
  "date": "YYYY-MM-DD",
  "time": "HH:MM" (24-hour),
  "channel": "pos" | "atm" | "transfer" | "web",
  "bank": "Bank Name",
  "reference": "reference or session number"
}

Rules:
- Use ONLY information present in the text. If a field is not present, set it to null.
- Never guess, infer, or invent amounts, dates, times, or reference numbers.
- If the text is not a bank debit alert or transaction description, set every field to null.
- Do not include markdown tags, commentary, or extra text."""


def _extract_json(content: str) -> dict | None:
    """Strip <think> blocks / code fences and pull out the first JSON object."""
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
    content = re.sub(r"```(?:json)?", "", content).strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not m:
            return None
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def _ai_call_allowed() -> bool:
    now = time.monotonic()
    window_seconds = 60
    while _AI_CALL_TIMES and now - _AI_CALL_TIMES[0] >= window_seconds:
        _AI_CALL_TIMES.popleft()
    if len(_AI_CALL_TIMES) >= AI_CALL_LIMIT_PER_MINUTE:
        return False
    _AI_CALL_TIMES.append(now)
    return True


def parse_with_llm(text: str) -> dict | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[Warning] GROQ_API_KEY not found in environment.")
        return {"_ai_error_reason": "ai_unavailable"}

    kwargs = {}
    effort = os.getenv("GROQ_REASONING_EFFORT")
    if effort:
        kwargs["reasoning_effort"] = effort

    client = Groq(api_key=api_key, timeout=15.0, max_retries=1)
    last_error: Exception | None = None
    for model in _model_candidates("GROQ_TEXT_MODEL", ("qwen/qwen3.8-27b", "llama-3.3-70b-versatile")):
        if not _ai_call_allowed():
            return {"_ai_error_reason": "ai_busy"}
        try:
            completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Alert text:\n{text}"},
                ],
                model=model,
                temperature=0.0,
                max_tokens=LLM_MAX_TOKENS,
                response_format={"type": "json_object"},
                **kwargs,
            )
            result = _extract_json(completion.choices[0].message.content or "")
            if isinstance(result, dict):
                return result
            return {"_ai_error_reason": "ai_error"}
        except Exception as e:  # noqa: BLE001 - Groq clients may raise provider-specific exceptions.
            last_error = e
            print(f"[LLM Error for model={model}]: {e}")
            if not _is_decommissioned_model_error(e):
                return {"_ai_error_reason": "ai_error"}
    if last_error is not None:
        print(f"[LLM Error]: {last_error}")
    return {"_ai_error_reason": "ai_error"}


# ---------------------------------------------------------------------
# Task 4: Strict validation
# ---------------------------------------------------------------------
def validate_extracted_data(data) -> tuple[bool, list[str]]:
    """
    Validate and normalize `data` IN PLACE.
    Returns (is_valid, missing) where `missing` contains only field names
    from REQUIRED_FIELDS (never free-text messages).
    A missing/empty bank is not an error; it defaults to "Unknown".
    """
    if not isinstance(data, dict):
        return False, [f for f in REQUIRED_FIELDS if f != "bank"]

    missing = []

    amount = normalize_amount(data.get("amount"))
    if amount is None:
        missing.append("amount")
    else:
        data["amount"] = amount

    date = normalize_date(data.get("date")) if data.get("date") else None
    if date is None:
        missing.append("date")
    else:
        data["date"] = date

    time = normalize_time(data.get("time")) if data.get("time") else None
    if time is None:
        missing.append("time")
    else:
        data["time"] = time

    channel = str(data.get("channel") or "").strip().lower()
    if channel not in CHANNELS:
        missing.append("channel")
    else:
        data["channel"] = channel

    reference = str(data.get("reference") or "").strip()
    if reference.lower() in EMPTY_MARKERS:
        missing.append("reference")
    else:
        data["reference"] = reference

    bank = str(data.get("bank") or "").strip()
    data["bank"] = DEFAULT_BANK if bank.lower() in EMPTY_MARKERS else bank

    return (len(missing) == 0), missing


def _warning_codes(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    warnings: list[dict[str, str]] = []

    if re.search(r"\b(credit|credited|received)\b", lower) and not re.search(
        r"\b(debit|debited|dr|withdrawal)\b",
        lower,
    ):
        warnings.append({
            "code": "credit_alert_suspected",
            "message": "This looks like money received, not a debit.",
        })

    if len(re.findall(r"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{1,2})?\b)", text, flags=re.IGNORECASE)) > 1:
        warnings.append({
            "code": "multiple_amounts",
            "message": "Multiple amounts were found; the final value was selected from the debit line.",
        })

    refs = re.findall(r"\b(?:ref(?:erence)?|session\s*id|rrn|stan|transaction\s*id|trans\s*id)\s*[:=]?\s*([A-Za-z0-9][A-Za-z0-9\-/]*)", text, re.IGNORECASE)
    if len(refs) > 1:
        warnings.append({
            "code": "multiple_references",
            "message": f"Multiple references were present; {refs[-1]} was chosen.",
        })

    if re.search(r"\b\d{1,2}\b.*\b\d{1,2}\b", text) and re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b", text, re.IGNORECASE):
        warnings.append({
            "code": "ambiguous_date",
            "message": "Multiple possible dates were found; the parser prefers the explicit debit-date text.",
        })

    if re.search(r"\b\d{1,2}:\d{2}\s*(?:am|pm)\b", lower):
        warnings.append({
            "code": "twelve_hour_time_converted",
            "message": "The time was interpreted in 12-hour format and converted to 24-hour time.",
        })

    if ("pos" in lower and ("transfer" in lower or "sent to" in lower)) or ("transfer" in lower and ("pos" in lower or "payment" in lower)):
        warnings.append({
            "code": "channel_conflict",
            "message": "Multiple channel hints were present; the parser resolved the strongest debit signal.",
        })

    return warnings


def _balance_or_fee_guard(text: str, amount: object) -> bool:
    lower = text.lower()
    if amount is None:
        return False
    norm = str(amount)
    balance_ctx = re.search(
        r"\b(?:available\s+bal|avail\s+bal|balance|bal|fee|charge|vat|commission)\b",
        lower,
    )
    amount_re = re.search(r"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{1,2})?\b)", lower)
    return bool(balance_ctx and amount_re and norm in lower)


def _result_payload(fields: dict | None, *, source: str, warnings: list[dict[str, str]], reason: str | None = None, message: str | None = None, missing: list[str] | None = None) -> dict:
    missing = list(missing or [])
    payload = {
        "ok": bool(fields and not missing),
        "fields": fields or {},
        "missing": missing,
        "reason": reason,
        "message": message,
        "source": source,
        "warnings": warnings,
    }
    if fields:
        payload.update(fields)
    return payload


MAX_INPUT_CHARS = 2000  # real alerts are short; cap cost and abuse


def ungrounded_fields(data: dict, text: str) -> list[str]:
    """
    Anti-hallucination check for LLM output: amount and reference must
    literally appear in the user's text. Returns the field names that don't.
    """
    bad = []
    flat = re.sub(r"\s+", "", text)
    ref = re.sub(r"\s+", "", str(data.get("reference", "")))
    if not ref or ref not in flat:
        bad.append("reference")

    plain = text.replace(",", "")
    amt = data.get("amount")
    cands = {f"{amt:.2f}", f"{amt:g}"}
    if float(amt).is_integer():
        cands.add(f"{amt:.0f}")
    if not any(re.search(rf"(?<![\d.]){re.escape(c)}(?![\d])", plain) for c in cands):
        bad.append("amount")
    return bad

# ---------------------------------------------------------------------
# Core pipeline (never raises)
# ---------------------------------------------------------------------
def _clean(result: dict) -> dict:
    return {
        "amount": result["amount"],
        "date": result["date"],
        "time": result["time"],
        "channel": result["channel"],
        "bank": result["bank"],
        "reference": result["reference"],
    }


def parse_alert_result(text: str) -> dict:
    """Return the richer parsing result used by the backend hardening brief.

    Legacy callers still receive the original simplified dict through parse_alert().
    """
    try:
        if not text or not isinstance(text, str) or not text.strip():
            return {
                "ok": False,
                "fields": {},
                "missing": ["text"],
                "reason": "empty",
                "message": "Input text is empty.",
                "source": "none",
                "warnings": _warning_codes(text or ""),
                "error": "could_not_parse",
            }

        clean_text = text.strip()
        if len(clean_text) > MAX_INPUT_CHARS:
            return {
                "ok": False,
                "fields": {},
                "missing": ["text"],
                "reason": "too_long",
                "message": "Input text exceeds the allowed length.",
                "source": "none",
                "warnings": _warning_codes(clean_text),
                "error": "could_not_parse",
            }

        warnings = _warning_codes(clean_text)

        try:
            regex_result = parse_with_regex(clean_text)
        except Exception as exc:  # pragma: no cover - defensive  # noqa: BLE001
            print(f"[Regex Exception]: {exc}")
            regex_result = None

        if isinstance(regex_result, dict) and "error" in regex_result:
            regex_result = None

        if isinstance(regex_result, dict):
            ok, missing = validate_extracted_data(regex_result)
            if ok and regex_result.get("bank") != DEFAULT_BANK:
                fields = {
                    "amount": regex_result["amount"],
                    "date": regex_result["date"],
                    "time": regex_result["time"],
                    "channel": regex_result["channel"],
                    "bank": regex_result["bank"],
                    "reference": regex_result["reference"],
                }
                result = {
                    "ok": True,
                    "fields": fields,
                    "missing": [],
                    "reason": None,
                    "message": None,
                    "source": "pattern",
                    "warnings": warnings,
                }
                result.update(fields)
                return result

        llm_result = parse_with_llm(clean_text)
        if isinstance(llm_result, dict) and "_ai_error_reason" in llm_result:
            return {
                "ok": False,
                "fields": {},
                "missing": ["text"],
                "reason": llm_result["_ai_error_reason"],
                "message": "The AI parser is unavailable right now.",
                "source": "none",
                "warnings": warnings,
                "error": "could_not_parse",
            }

        if not isinstance(llm_result, dict):
            return {
                "ok": False,
                "fields": {},
                "missing": list(REQUIRED_FIELDS),
                "reason": "could_not_parse",
                "message": "The parser could not extract a valid transaction.",
                "source": "none",
                "warnings": warnings,
                "error": "could_not_parse",
            }

        ok, missing = validate_extracted_data(llm_result)
        if ok:
            grounded = ungrounded_fields(llm_result, clean_text)
            amount_guard = _balance_or_fee_guard(clean_text, llm_result.get("amount"))
            if grounded or amount_guard:
                ok = False
                missing = sorted(set(missing + grounded + (["amount"] if amount_guard else [])))
        if ok:
            payload = _result_payload(
                {
                    "amount": llm_result["amount"],
                    "date": llm_result["date"],
                    "time": llm_result["time"],
                    "channel": llm_result["channel"],
                    "bank": llm_result["bank"],
                    "reference": llm_result["reference"],
                },
                source="ai",
                warnings=warnings,
            )
            payload["reason"] = None
            payload["message"] = None
            payload["error"] = None
            return payload

        return {
            "ok": False,
            "fields": {
                "amount": llm_result.get("amount"),
                "date": llm_result.get("date"),
                "time": llm_result.get("time"),
                "channel": llm_result.get("channel"),
                "bank": llm_result.get("bank"),
                "reference": llm_result.get("reference"),
            },
            "missing": missing,
            "reason": "could_not_parse",
            "message": "The parser could not confidently extract the debit alert.",
            "source": "ai",
            "warnings": warnings,
            "error": "could_not_parse",
        }
    except Exception as exc:  # last-resort guard: the contract says never crash  # noqa: BLE001
        print(f"[parse_alert Exception]: {exc}")
        return {
            "ok": False,
            "fields": {},
            "missing": list(REQUIRED_FIELDS),
            "reason": "could_not_parse",
            "message": "The parser could not extract a valid transaction.",
            "source": "none",
            "warnings": [],
            "error": "could_not_parse",
        }


def parse_alert(text: str) -> dict:
    """regex -> (validate) -> LLM fallback -> validate + grounding -> result."""
    result = parse_alert_result(text)
    if result.get("ok"):
        return {k: result[k] for k in REQUIRED_FIELDS if k in result}
    return {"error": "could_not_parse", "missing": result.get("missing", [])}


def parse_screenshot_result(image_path: str) -> dict:
    """Screenshot -> text (image_input.py) -> parse_alert_result. Never raises."""
    try:
        text = extract_text_from_image(image_path)
        if not text:
            return {
                "ok": False,
                "fields": {},
                "missing": ["image"],
                "reason": "no_text",
                "message": "No text could be extracted from the image.",
                "source": "none",
                "warnings": [],
                "error": "could_not_parse",
            }
        return parse_alert_result(text)
    except Exception as exc:  # noqa: BLE001 - screenshot extraction can fail at provider or filesystem layers.
        print(f"[parse_screenshot Exception]: {exc}")
        return {
            "ok": False,
            "fields": {},
            "missing": ["image"],
            "reason": "bad_image",
            "message": "The screenshot could not be read.",
            "source": "none",
            "warnings": [],
            "error": "could_not_parse",
        }


def parse_screenshot(image_path: str) -> dict:
    """Screenshot -> text (image_input.py) -> parse_alert. Never raises."""
    result = parse_screenshot_result(image_path)
    if result.get("ok"):
        return {k: result[k] for k in REQUIRED_FIELDS if k in result}
    return {"error": "could_not_parse", "missing": result.get("missing", ["image"])}


# ---------------------------------------------------------------------
# Quick manual runner (real test suite lives in tests/)
# ---------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    if len(sys.argv) == 2:  # python parse.py <screenshot>  -> parse that image
        print(json.dumps(parse_screenshot(sys.argv[1]), indent=2))
        sys.exit()

    samples = [
        "Acct: 012****789 Amt: NGN 25,000.00 Dr Desc: POS WDL / 0001293849182 / Opay Terminal Ikeja Date: 2026-10-14 14:32",
        "Debit Alert: Your Access Bank account was debited with 15000 NGN for ATM cash withdrawal at Victoria Island on 2026-10-13 18:20. Ref: 9948271038.",
        "Hello, I sent money to my sister yesterday morning and she has not received it yet.",
        "",
    ]
    for i, s in enumerate(samples, 1):
        print(f"--- Alert #{i} ---")
        print(json.dumps(parse_alert(s), indent=2))