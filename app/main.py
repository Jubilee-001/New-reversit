"""ReverseIt — customer-only complaint and deadline API."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.cases_api import router as cases_router
from app.parser_api import router as parser_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ReverseIt", lifespan=lifespan)

origins = [
    origin.strip()
    for origin in os.getenv(
        "WEB_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(parser_router)
app.include_router(cases_router)


@app.get("/")
def root():
    return {"status": "ok", "app": "ReverseIt"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
