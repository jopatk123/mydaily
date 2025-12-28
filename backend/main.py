from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import create_db_and_tables, get_session
from models import DiaryEntry
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/entries/", response_model=DiaryEntry)
def create_entry(entry: DiaryEntry, session: Session = Depends(get_session)):
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@app.get("/entries/", response_model=List[DiaryEntry])
def read_entries(offset: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    entries = session.exec(select(DiaryEntry).offset(offset).limit(limit).order_by(DiaryEntry.created_at.desc())).all()
    return entries

@app.get("/entries/{entry_id}", response_model=DiaryEntry)
def read_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}
