from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import now_ist, today_ist
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Branch, FieldDef, Submission, SubmissionValue, User
from ..schemas import EntryIn, FieldOut
from ..services import audit, validate_values, values_json

router = APIRouter(tags=["entries"])


def _assigned_branch(user: User, branch_id: int) -> Branch:
    for b in user.branches:
        if b.id == branch_id and b.is_active:
            return b
    raise HTTPException(403, "This branch is not assigned to you")


@router.get("/fields", response_model=list[FieldOut])
def active_fields(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(FieldDef).where(FieldDef.is_active.is_(True)).order_by(FieldDef.sort_order, FieldDef.id)
    ).all()


@router.get("/me/branches")
def my_branches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = today_ist()
    if user.role == "ADMIN":
        branches = db.scalars(select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.code)).all()
    else:
        branches = sorted((b for b in user.branches if b.is_active), key=lambda b: b.code)
    ids = [b.id for b in branches]
    done = set()
    if ids:
        done = set(db.scalars(
            select(Submission.branch_id).where(Submission.entry_date == today, Submission.branch_id.in_(ids))
        ).all())
    return {
        "date": today.isoformat(),
        "branches": [{"id": b.id, "code": b.code, "name": b.name, "submitted": b.id in done} for b in branches],
    }


@router.get("/entries/today/{branch_id}")
def today_entry(branch_id: int, user: User = Depends(require_roles("ENTRY")), db: Session = Depends(get_db)):
    _assigned_branch(user, branch_id)
    sub = db.scalar(select(Submission).where(Submission.branch_id == branch_id,
                                             Submission.entry_date == today_ist()))
    if not sub:
        return {"submitted": False}
    return {
        "submitted": True,
        "submitted_at": sub.submitted_at.isoformat(),
        "values": {v.field_id: v.value for v in sub.values},
    }


@router.post("/entries", status_code=201)
def submit_entry(data: EntryIn, user: User = Depends(require_roles("ENTRY")), db: Session = Depends(get_db)):
    _assigned_branch(user, data.branch_id)
    today = today_ist()  # server decides the date; past/future dates are impossible
    cleaned = validate_values(db, data.values)
    sub = Submission(
        branch_id=data.branch_id, entry_date=today, submitted_by=user.id, submitted_at=now_ist(),
        values=[SubmissionValue(field_id=fid, value=val) for fid, val in cleaned.items()],
    )
    db.add(sub)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Data for this branch has already been submitted today")
    audit(db, user.id, "SUBMIT", "submission", sub.id, new=values_json(cleaned))
    db.commit()
    return {"id": sub.id, "entry_date": today.isoformat()}