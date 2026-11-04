from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routers import admin, auth, entries, reports

app = FastAPI(title="Branch Daily Entry API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, entries.router, reports.router, admin.router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"status": "ok"}