from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import require_roles
from ..models import Branch, FieldDef, Submission, User

router = APIRouter(prefix="/reports", tags=["reports"])
reader = require_roles("REPORT", "ADMIN")
MAX_RANGE_DAYS = 366


def _branch_scope(user: User, branch_id: int | None):
    allowed = None if user.role == "ADMIN" else {b.id for b in user.branches}
    if branch_id is not None:
        if allowed is not None and branch_id not in allowed:
            raise HTTPException(403, "This branch is not assigned to you")
        return [branch_id]
    return None if allowed is None else list(allowed)


def _fetch(db: Session, user: User, date_from: date, date_to: date, branch_id: int | None):
    if date_from > date_to:
        raise HTTPException(400, "'From' date must be before 'To' date")
    if (date_to - date_from).days > MAX_RANGE_DAYS:
        raise HTTPException(400, f"Date range cannot exceed {MAX_RANGE_DAYS} days")
    q = (select(Submission)
         .options(selectinload(Submission.branch), selectinload(Submission.user))
         .where(Submission.entry_date.between(date_from, date_to))
         .order_by(Submission.entry_date.desc(), Submission.branch_id))
    scope = _branch_scope(user, branch_id)
    if scope is not None:
        q = q.where(Submission.branch_id.in_(scope))
    return db.scalars(q).all()


def _all_fields(db: Session):
    return db.scalars(select(FieldDef).order_by(FieldDef.sort_order, FieldDef.id)).all()


@router.get("/entries")
def report_entries(date_from: date, date_to: date, branch_id: int | None = None,
                   user: User = Depends(reader), db: Session = Depends(get_db)):
    subs = _fetch(db, user, date_from, date_to, branch_id)
    return {
        "fields": [{"id": f.id, "label": f.label, "field_type": f.field_type, "is_active": f.is_active}
                   for f in _all_fields(db)],
        "rows": [{
            "id": s.id,
            "entry_date": s.entry_date.isoformat(),
            "branch_id": s.branch_id,
            "branch_code": s.branch.code,
            "branch_name": s.branch.name,
            "submitted_by": s.user.full_name or s.user.username,
            "submitted_at": s.submitted_at.isoformat(),
            "values": {v.field_id: v.value for v in s.values},
        } for s in subs],
    }


@router.get("/pending")
def pending_branches(on_date: date, user: User = Depends(reader), db: Session = Depends(get_db)):
    q = select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.code)
    if user.role != "ADMIN":
        q = q.where(Branch.id.in_([b.id for b in user.branches]))
    branches = db.scalars(q).all()
    done = set(db.scalars(select(Submission.branch_id).where(Submission.entry_date == on_date)).all())
    return [{"id": b.id, "code": b.code, "name": b.name} for b in branches if b.id not in done]


def _cell(field: FieldDef, value):
    if value is None:
        return None
    try:
        if field.field_type == "INTEGER":
            return int(value)
        if field.field_type == "DECIMAL":
            return float(value)
    except ValueError:
        pass
    return value


@router.get("/export")
def export_excel(date_from: date, date_to: date, branch_id: int | None = None,
                 user: User = Depends(reader), db: Session = Depends(get_db)):
    subs = _fetch(db, user, date_from, date_to, branch_id)
    fields = _all_fields(db)
    wb = Workbook()
    ws = wb.active
    ws.title = "Entries"
    ws.append(["Date", "Branch Code", "Branch Name", *[f.label for f in fields], "Submitted By", "Submitted At"])
    for c in ws[1]:
        c.font = Font(bold=True)
    for s in subs:
        vals = {v.field_id: v.value for v in s.values}
        ws.append([s.entry_date, s.branch.code, s.branch.name,
                   *[_cell(f, vals.get(f.id)) for f in fields],
                   s.user.full_name or s.user.username, s.submitted_at])
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="report_{date_from}_{date_to}.xlsx"'},
    )