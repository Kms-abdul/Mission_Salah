from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["ADMIN", "ENTRY", "REPORT"]
FieldType = Literal["INTEGER", "DECIMAL", "TEXT"]
FieldCategory = Literal["STUDENTS", "TEACHING", "NON_TEACHING", "OTHER"]
Values = dict[int, str | int | float | None]


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    role: Role
    full_name: str


class BranchIn(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    principal: str | None = Field(default=None, max_length=100)
    principal_email: str | None = Field(default=None, max_length=100)
    strength: int | None = Field(default=None, ge=0)
    is_active: bool = True


class BranchOut(BranchIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class FieldIn(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    category: FieldCategory = "OTHER"
    field_type: FieldType
    is_required: bool = True
    sort_order: int = 0
    is_active: bool = True


class FieldOut(FieldIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class UserIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=72)
    full_name: str | None = Field(default=None, max_length=100)
    role: Role
    is_active: bool = True
    branch_ids: list[int] = []


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, max_length=72)
    full_name: str | None = Field(default=None, max_length=100)
    role: Role | None = None
    is_active: bool | None = None
    branch_ids: list[int] | None = None


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str | None
    role: Role
    is_active: bool
    branch_ids: list[int]


class EntryIn(BaseModel):
    branch_id: int
    values: Values


class AdminEntryIn(EntryIn):
    entry_date: date


class EntryUpdate(BaseModel):
    values: Values