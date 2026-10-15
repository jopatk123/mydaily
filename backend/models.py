from datetime import datetime, timezone
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

TITLE_MAX_LENGTH = 200
CONTENT_MAX_LENGTH = 100_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _strip_text(value):
    if isinstance(value, str):
        return value.strip()
    return value


class DiaryEntryBase(SQLModel):
    title: str
    content: str


class DiaryEntryCreate(SQLModel):
    title: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    content: str = Field(min_length=1, max_length=CONTENT_MAX_LENGTH)

    @field_validator("title", "content", mode="before")
    @classmethod
    def strip_text(cls, value):
        return _strip_text(value)


class DiaryEntryUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=TITLE_MAX_LENGTH)
    content: Optional[str] = Field(default=None, min_length=1, max_length=CONTENT_MAX_LENGTH)

    @field_validator("title", "content", mode="before")
    @classmethod
    def strip_text(cls, value):
        return _strip_text(value)


class DiaryEntry(DiaryEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    is_pinned: bool = Field(default=False)
    pinned_at: Optional[datetime] = Field(default=None)


class TodoBase(SQLModel):
    title: str
    completed: bool = False


class TodoCreate(SQLModel):
    title: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    completed: bool = False

    @field_validator("title", mode="before")
    @classmethod
    def strip_text(cls, value):
        return _strip_text(value)


class TodoUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=TITLE_MAX_LENGTH)
    completed: Optional[bool] = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_text(cls, value):
        return _strip_text(value)


class Todo(TodoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)


class LoginRequest(SQLModel):
    password: str


class LoginResponse(SQLModel):
    token: str
