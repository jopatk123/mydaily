from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List
from datetime import date as dt_date
from database import create_db_and_tables, get_session
from models import DiaryEntry
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy import or_
from sqlalchemy import func

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "http://localhost:8000",
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
def read_entries(
    offset: int = 0,
    limit: int = 100,
    date: str | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(DiaryEntry)

    if date:
        try:
            filter_day = dt_date.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        stmt = stmt.where(func.date(DiaryEntry.created_at) == filter_day.isoformat())

    stmt = stmt.offset(offset).limit(limit).order_by(DiaryEntry.created_at.desc())
    return session.exec(stmt).all()


@app.get("/entries/dates/", response_model=List[str])
def read_entry_dates(session: Session = Depends(get_session)):
    created_at_values = session.exec(select(DiaryEntry.created_at)).all()
    dates = sorted({dt.date().isoformat() for dt in created_at_values if dt is not None})
    return dates


@app.get("/entries/search/", response_model=List[DiaryEntry])
def search_entries(
    q: str,
    offset: int = 0,
    limit: int = 100,
    date: str | None = None,
    session: Session = Depends(get_session),
):
    query = q.strip()
    if not query:
        return []

    stmt = select(DiaryEntry).where(
        or_(
            DiaryEntry.title.ilike(f"%{query}%"),
            DiaryEntry.content.ilike(f"%{query}%"),
        )
    )

    if date:
        try:
            filter_day = dt_date.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        stmt = stmt.where(func.date(DiaryEntry.created_at) == filter_day.isoformat())

    stmt = stmt.offset(offset).limit(limit).order_by(DiaryEntry.created_at.desc())
    return session.exec(stmt).all()

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

# 挂载静态文件服务（生产环境）
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/assets", StaticFiles(directory=str(static_path / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 路由已经在上面定义，这里处理前端路由
        if full_path.startswith("entries"):
            raise HTTPException(status_code=404)
        
        file_path = static_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # SPA fallback
        return FileResponse(static_path / "index.html")
