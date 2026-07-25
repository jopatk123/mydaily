from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DiaryEntryBase(SQLModel):
    title: str
    content: str


class DiaryEntryCreate(DiaryEntryBase):
    pass


class DiaryEntryUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None


class DiaryEntry(DiaryEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    is_pinned: bool = Field(default=False)
    pinned_at: Optional[datetime] = Field(default=None)


class TodoBase(SQLModel):
    title: str
    completed: bool = False


class TodoCreate(TodoBase):
    pass


class TodoUpdate(SQLModel):
    title: Optional[str] = None
    completed: Optional[bool] = None


class Todo(TodoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)


class LoginRequest(SQLModel):
    password: str


class LoginResponse(SQLModel):
    token: str
