from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from ..config import now_ist, today_ist
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import AuditLog, Branch, FieldDef, Submission, SubmissionValue, User
from ..schemas import (AdminEntryIn, BranchIn, BranchOut, EntryUpdate, FieldIn, FieldOut,
                       UserIn, UserOut, UserUpdate)
from ..security import hash_password
from ..services import audit, validate_values, values_json

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles("ADMIN"))])


def _get(db: Session, model, obj_id: int):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(404, f"{model.__name__} not found")
    return obj


def _flush(db: Session, conflict_msg: str):
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, conflict_msg)


# ---------- Branches ----------
@router.get("/branches", response_model=list[BranchOut])
def list_branches(db: Session = Depends(get_db)):
    return db.scalars(select(Branch).order_by(Branch.code)).all()


@router.post("/branches", response_model=BranchOut, status_code=201)
def create_branch(data: BranchIn, admin: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = Branch(**data.model_dump())
    db.add(b)
    _flush(db, "Branch code already exists")
    audit(db, admin.id, "CREATE", "branch", b.id, new=data.model_dump())
    db.commit()
    return b


@router.put("/branches/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: int, data: BranchIn, admin: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    b = _get(db, Branch, branch_id)
    old = BranchIn.model_validate(b, from_attributes=True).model_dump()
    for k, v in data.model_dump().items():
        setattr(b, k, v)
    _flush(db, "Branch code already exists")
    audit(db, admin.id, "UPDATE", "branch", b.id, old=old, new=data.model_dump())
    db.commit()
    return b


# ---------- Fields ----------
@router.get("/fields", response_model=list[FieldOut])
def list_fields(db: Session = Depends(get_db)):
    return db.scalars(select(FieldDef).order_by(FieldDef.sort_order, FieldDef.id)).all()


@router.post("/fields", response_model=FieldOut, status_code=201)
def create_field(data: FieldIn, admin: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = FieldDef(**data.model_dump())
    db.add(f)
    db.flush()
    audit(db, admin.id, "CREATE", "field", f.id, new=data.model_dump())
    db.commit()
    return f


@router.put("/fields/{field_id}", response_model=FieldOut)
def update_field(field_id: int, data: FieldIn, admin: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    f = _get(db, FieldDef, field_id)
    old = FieldIn.model_validate(f, from_attributes=True).model_dump()
    for k, v in data.model_dump().items():
        setattr(f, k, v)
    audit(db, admin.id, "UPDATE", "field", f.id, old=old, new=data.model_dump())
    db.commit()
    return f


# ---------- Users ----------
def _user_out(u: User) -> UserOut:
    return UserOut(id=u.id, username=u.username, full_name=u.full_name, role=u.role,
                   is_active=u.is_active, branch_ids=[b.id for b in u.branches])


def _user_audit(u: User) -> dict:
    return {"username": u.username, "full_name": u.full_name, "role": u.role,
            "is_active": u.is_active, "branch_ids": [b.id for b in u.branches]}


def _load_branches(db: Session, ids: list[int]) -> list[Branch]:
    if not ids:
        return []
    branches = db.scalars(select(Branch).where(Branch.id.in_(ids))).all()
    if len(branches) != len(set(ids)):
        raise HTTPException(400, "One or more branch IDs are invalid")
    return list(branches)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return [_user_out(u) for u in db.scalars(select(User).order_by(User.username)).all()]


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserIn, admin: User = Depends(get_current_user), db: Session = Depends(get_db)):
    u = User(username=data.username, password_hash=hash_password(data.password), full_name=data.full_name,
             role=data.role, is_active=data.is_active,
             branches=[] if data.role == "ADMIN" else _load_branches(db, data.branch_ids))
    db.add(u)
    _flush(db, "User ID already exists")
    audit(db, admin.id, "CREATE", "user", u.id, new=_user_audit(u))
    db.commit()
    db.refresh(u)
    return _user_out(u)


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, admin: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    u = _get(db, User, user_id)
    changes = data.model_dump(exclude_unset=True)
    if u.id == admin.id and (changes.get("is_active") is False or changes.get("role", "ADMIN") != "ADMIN"):
        raise HTTPException(400, "You cannot deactivate or demote your own account")
    old = _user_audit(u)
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(422, "Password must be at least 6 characters")
        u.password_hash = hash_password(data.password)
    for k in ("full_name", "role", "is_active"):
        if changes.get(k) is not None:
            setattr(u, k, changes[k])
    if data.branch_ids is not None:
        u.branches = _load_branches(db, data.branch_ids)
    if u.role == "ADMIN":
        u.branches = []
    db.flush()
    new = _user_audit(u)
    if data.password:
        new["password_changed"] = True
    audit(db, admin.id, "UPDATE", "user", u.id, old=old, new=new)
    db.commit()
    db.refresh(u)
    return _user_out(u)


# ---------- Entries (admin-only create for missed days / edit) ----------
@router.post("/entries", status_code=201)
def admin_create_entry(data: AdminEntryIn, admin: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if data.entry_date > today_ist():
        raise HTTPException(400, "Cannot create an entry for a future date")
    _get(db, Branch, data.branch_id)
    cleaned = validate_values(db, data.values)
    sub = Submission(branch_id=data.branch_id, entry_date=data.entry_date, submitted_by=admin.id,
                     submitted_at=now_ist(),
                     values=[SubmissionValue(field_id=fid, value=val) for fid, val in cleaned.items()])
    db.add(sub)
    _flush(db, "An entry already exists for this branch and date. Edit it instead.")
    audit(db, admin.id, "ADMIN_CREATE", "submission", sub.id,
          new={"branch_id": data.branch_id, "entry_date": data.entry_date.isoformat(),
               "values": values_json(cleaned)})
    db.commit()
    return {"id": sub.id}


@router.put("/entries/{sub_id}")
def admin_edit_entry(sub_id: int, data: EntryUpdate, admin: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    sub = _get(db, Submission, sub_id)
    cleaned = validate_values(db, data.values)
    existing = {v.field_id: v for v in sub.values}
    old = {str(k): v.value for k, v in existing.items()}
    for fid, val in cleaned.items():
        if fid in existing:
            existing[fid].value = val
        else:
            sub.values.append(SubmissionValue(field_id=fid, value=val))
    audit(db, admin.id, "ADMIN_EDIT", "submission", sub.id, old=old, new=values_json(cleaned))
    db.commit()
    return {"id": sub.id}


# ---------- Audit ----------
@router.get("/audit")
def audit_log(limit: int = Query(200, ge=1, le=1000), db: Session = Depends(get_db)):
    logs = db.scalars(select(AuditLog).options(selectinload(AuditLog.user))
                      .order_by(AuditLog.id.desc()).limit(limit)).all()
    return [{"id": l.id, "created_at": l.created_at.isoformat(), "username": l.user.username,
             "action": l.action, "entity": l.entity, "entity_id": l.entity_id,
             "old_value": l.old_value, "new_value": l.new_value} for l in logs]