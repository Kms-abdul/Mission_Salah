from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AuditLog, FieldDef


def validate_values(db: Session, values: dict) -> dict[int, str | None]:
    """Validate submitted values against active field definitions. Returns cleaned strings."""
    fields = db.scalars(select(FieldDef).where(FieldDef.is_active.is_(True))).all()
    known = {f.id for f in fields}
    errors = [f"Unknown field id {fid}" for fid in values if fid not in known]
    cleaned: dict[int, str | None] = {}

    for f in fields:
        raw = values.get(f.id)
        raw = None if raw is None else str(raw).strip()
        if not raw:
            if f.is_required:
                errors.append(f"{f.label} is required")
            cleaned[f.id] = None
            continue
        try:
            if f.field_type == "INTEGER":
                raw = str(int(raw))
            elif f.field_type == "DECIMAL":
                d = Decimal(raw)
                if not d.is_finite():
                    raise InvalidOperation
                raw = str(d)
        except (ValueError, InvalidOperation):
            kind = "whole number" if f.field_type == "INTEGER" else "number"
            errors.append(f"{f.label} must be a valid {kind}")
            continue
        if len(raw) > 500:
            errors.append(f"{f.label} must be 500 characters or fewer")
            continue
        cleaned[f.id] = raw

    if errors:
        raise HTTPException(422, detail=errors)
    return cleaned


def values_json(cleaned: dict) -> dict:
    return {str(k): v for k, v in cleaned.items()}


def audit(db: Session, user_id: int, action: str, entity: str, entity_id: int | None = None,
          old: dict | None = None, new: dict | None = None) -> None:
    db.add(AuditLog(user_id=user_id, action=action, entity=entity, entity_id=entity_id,
                    old_value=old, new_value=new))