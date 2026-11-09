from datetime import date, datetime

from sqlalchemy import (JSON, Boolean, Column, Date, DateTime, Enum, ForeignKey, Index,
                        Integer, String, Table, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .config import now_ist
from .database import Base

ROLES = ("ADMIN", "ENTRY", "REPORT")
FIELD_TYPES = ("INTEGER", "DECIMAL", "TEXT")

user_branches = Table(
    "user_branches",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("branch_id", Integer, ForeignKey("branches.id", ondelete="CASCADE"), primary_key=True),
)


class Branch(Base):
    __tablename__ = "branches"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    principal: Mapped[str | None] = mapped_column(String(100))
    principal_email: Mapped[str | None] = mapped_column(String(100))
    strength: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(Enum(*ROLES, name="user_role"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    branches: Mapped[list[Branch]] = relationship(secondary=user_branches, lazy="selectin")


class FieldDef(Base):
    __tablename__ = "fields"
    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(30), default="OTHER", server_default="OTHER")
    field_type: Mapped[str] = mapped_column(Enum(*FIELD_TYPES, name="field_type"))
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("branch_id", "entry_date", name="uq_branch_date"),  # one entry per branch per day
        Index("ix_submissions_entry_date", "entry_date"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))
    entry_date: Mapped[date] = mapped_column(Date)
    submitted_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    branch: Mapped[Branch] = relationship()
    user: Mapped[User] = relationship()
    values: Mapped[list["SubmissionValue"]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class SubmissionValue(Base):
    __tablename__ = "submission_values"
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), primary_key=True)
    value: Mapped[str | None] = mapped_column(String(500))


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))
    entity: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    old_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    user: Mapped[User] = relationship()