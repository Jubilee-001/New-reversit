"""Customer case API. There are no accounts: the case id is the access key."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.case_service import (
    TransitionError,
    bank_reply,
    confirm_sent,
    create_case,
    escalate,
    mail_opened,
    parse_utc,
    resolve,
)
from app.config_loader import public_config
from app.database import get_db
from app.models import Case

router = APIRouter(prefix="/api", tags=["cases"])


class CaseCreate(BaseModel):
    problem_type: str
    channel: str
    bank_key: str | None = None
    bank_name: str
    amount: float
    txn_date: str
    txn_time: str
    reference: str
    account_last4: str | None = None
    to_email: str | None = ""


class CasePatch(BaseModel):
    complaint_text: str | None = None
    to_email: str | None = None
    status: Literal["sent"] | None = None
    sent_at: str | None = None


class ConfirmSent(BaseModel):
    sent_at: str | None = None


class BankReply(BaseModel):
    ticket: str | None = None
    note: str | None = None


class Escalate(BaseModel):
    tier: int


def get_case(db: Session, case_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Case not found."})
    return case


def fail(exc: TransitionError, status_code: int = 409):
    raise HTTPException(status_code=status_code, detail={"error": exc.code, "message": exc.message})


@router.get("/config")
def get_config():
    return public_config()


@router.post("/cases", status_code=201)
def post_case(payload: CaseCreate, db: Session = Depends(get_db)):
    try:
        case = create_case(db, payload.model_dump())
    except TransitionError as exc:
        fail(exc, 400)
    return case.to_dict()


@router.get("/cases/{case_id}")
def read_case(case_id: str, db: Session = Depends(get_db)):
    return get_case(db, case_id).to_dict()


@router.patch("/cases/{case_id}")
def update_case(case_id: str, payload: CasePatch, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    if payload.complaint_text is not None:
        text = payload.complaint_text.strip()
        if not text:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_complaint", "message": "The complaint cannot be empty."},
            )
        case.complaint_text = text[:20000]
    if payload.to_email is not None:
        case.to_email = payload.to_email.strip()[:200]
    if payload.sent_at is not None and payload.status != "sent":
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_sent_at", "message": "A send time requires status sent."},
        )
    if payload.status == "sent":
        try:
            sent_at = parse_utc(payload.sent_at) if payload.sent_at else None
            case = confirm_sent(case, sent_at=sent_at)
        except TransitionError as exc:
            fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.delete("/cases/{case_id}", status_code=204)
def delete_case(case_id: str, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    if case.status != "draft_ready":
        raise HTTPException(
            status_code=409,
            detail={"error": "case_not_draft", "message": "Only a draft case can be discarded."},
        )
    db.delete(case)
    db.commit()
    return Response(status_code=204)


@router.post("/cases/{case_id}/mail-opened")
def post_mail_opened(case_id: str, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    try:
        case = mail_opened(case)
    except TransitionError as exc:
        fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.post("/cases/{case_id}/confirm-sent")
def post_confirm_sent(case_id: str, payload: ConfirmSent, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    sent_at = parse_utc(payload.sent_at) if payload.sent_at else None
    try:
        case = confirm_sent(case, sent_at=sent_at)
    except TransitionError as exc:
        fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.post("/cases/{case_id}/bank-reply")
def post_bank_reply(case_id: str, payload: BankReply, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    try:
        case = bank_reply(case, ticket=payload.ticket, note=payload.note)
    except TransitionError as exc:
        fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.post("/cases/{case_id}/resolve")
def post_resolve(case_id: str, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    try:
        case = resolve(case)
    except TransitionError as exc:
        fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.post("/cases/{case_id}/escalate")
def post_escalate(case_id: str, payload: Escalate, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    try:
        case = escalate(case, payload.tier)
    except TransitionError as exc:
        fail(exc)
    db.commit()
    db.refresh(case)
    return case.to_dict()
