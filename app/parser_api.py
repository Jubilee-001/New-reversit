"""HTTP surface for the alert parser.

Two endpoints, both rate limited per IP:

* POST /api/parse-text          -> parse_alert(text)
* POST /api/extract-image-text  -> extract_text_from_image(path)

No alert text or image is logged. Images are written to a private temporary
file, read once and removed immediately.
"""

from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from app.parser_adapter import (
    extract_text_from_image,
    normalize_date,
    normalize_time,
    parse_alert,
)
from app.rate_limit import image_limiter, parse_limiter

router = APIRouter(prefix="/api", tags=["parser"])

MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_TEXT_CHARS = 2000

PROVIDER_ERROR_MESSAGE = (
    "We couldn’t read this right now. Try again in a minute, or type the details yourself."
)

MAGIC = {
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".webp": [b"RIFF"],
}
MIME_TO_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}


class ParseTextInput(BaseModel):
    text: str = Field(..., description="Pasted debit alert text")


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _extension(file: UploadFile) -> str | None:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext in MAGIC:
        return ext
    return MIME_TO_EXT.get((file.content_type or "").lower())


def _looks_like(ext: str, data: bytes) -> bool:
    if ext == ".webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return any(data.startswith(magic) for magic in MAGIC[ext])


def _normalize_parse_response(result: dict) -> dict:
    if result.get("error"):
        return result

    normalized = result.copy()
    missing = []
    for field, normalizer in (("date", normalize_date), ("time", normalize_time)):
        value = normalizer(normalized.get(field))
        if value is None:
            missing.append(field)
        else:
            normalized[field] = value
    if missing:
        return {"error": "could_not_parse", "missing": missing}
    return normalized


@router.post("/parse-text")
def parse_text(payload: ParseTextInput, request: Request):
    if not parse_limiter.allow(client_key(request)):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "message": "Too many requests. Try again in a minute."},
        )

    text = (payload.text or "").strip()
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
    if not text:
        return {"error": "could_not_parse", "missing": ["text"]}

    try:
        result = parse_alert(text)
        if not isinstance(result, dict):
            print("[parse-text] parser returned a non-dict payload")
            return {"error": "could_not_parse", "missing": ["text"]}
        return _normalize_parse_response(result)
    except Exception as exc:  # noqa: BLE001 - parser wrappers should never crash the FastAPI route.
        print(f"[parse-text] failed to parse alert: {exc}")
        return {"error": "could_not_parse", "missing": ["text"]}


@router.post("/extract-image-text")
def extract_image_text(request: Request, file: UploadFile = File(...)) -> dict:
    if not image_limiter.allow(client_key(request)):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "message": "Too many requests. Try again in a minute."},
        )

    ext = _extension(file)
    if ext is None:
        print(f"[extract-image-text] unsupported file upload: filename={file.filename!r}, content_type={file.content_type!r}")
        raise HTTPException(
            status_code=415,
            detail={"error": "unsupported_type", "message": "Use a PNG, JPG, JPEG or WebP image."},
        )

    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(
            status_code=422,
            detail={"error": "empty_file", "message": "That file is empty."},
        )
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"error": "too_large", "message": "Images must be 4 MB or smaller."},
        )
    if not _looks_like(ext, data):
        print(f"[extract-image-text] file signature did not match image type {ext}: filename={file.filename!r}")
        raise HTTPException(
            status_code=415,
            detail={"error": "unsupported_type", "message": "That file is not a PNG, JPG, JPEG or WebP image."},
        )

    path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(data)
            path = tmp.name
        text = extract_text_from_image(path)
    except Exception as exc:
        print(f"[extract-image-text] OCR failed: {exc}")
        text = None
    finally:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError as exc:
                print(f"[extract-image-text] temporary file cleanup failed: {exc}")

    if not text:
        print("[extract-image-text] OCR returned empty text")
        return {"text": "", "error": "could_not_read"}

    return {"text": text}
