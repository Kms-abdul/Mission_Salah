import os
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://branch_user:BranchPass123@localhost:3306/branch_app?charset=utf8mb4",
)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Current IST time as a naive datetime (stored as-is in MySQL)."""
    return datetime.now(IST).replace(tzinfo=None)


def today_ist():
    """The business date. Always decided by the server, never the client."""
    return datetime.now(IST).date()