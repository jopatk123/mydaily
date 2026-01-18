from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime


class DiaryEntryBase(SQLModel):
    title: str
    content: str


class DiaryEntryCreate(DiaryEntryBase):
    pass


class DiaryEntryUpdate(DiaryEntryBase):
    pass


class DiaryEntry(DiaryEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
