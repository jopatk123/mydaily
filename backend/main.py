from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List
from datetime import date as dt_date
from datetime import datetime, timezone
from database import create_db_and_tables, get_session
from models import (
    DiaryEntry, DiaryEntryCreate, DiaryEntryUpdate,
    Todo, TodoCreate, TodoUpdate,
    LoginRequest, LoginResponse,
)
from auth import MYDAILY_PASSWORD, generate_token, verify_auth
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy import or_, func


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Public auth endpoint ────────────────────────────────────────────


@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    import hmac as _hmac

    if not _hmac.compare_digest(body.password, MYDAILY_PASSWORD):
        raise HTTPException(status_code=401, detail="密码不正确")
    return LoginResponse(token=generate_token(body.password))


# ── Protected API routes ────────────────────────────────────────────

router = APIRouter(dependencies=[Depends(verify_auth)])

@router.post("/entries/", response_model=DiaryEntry)
def create_entry(entry: DiaryEntryCreate, session: Session = Depends(get_session)):
    db_entry = DiaryEntry(title=entry.title, content=entry.content)
    session.add(db_entry)
    session.commit()
    session.refresh(db_entry)
    return db_entry

@router.get("/entries/", response_model=List[DiaryEntry])
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


@router.get("/entries/export/", response_model=List[DiaryEntry])
def export_entries(session: Session = Depends(get_session)):
    stmt = select(DiaryEntry).order_by(DiaryEntry.created_at.desc())
    return session.exec(stmt).all()


@router.get("/entries/dates/", response_model=List[str])
def read_entry_dates(session: Session = Depends(get_session)):
    created_at_values = session.exec(select(DiaryEntry.created_at)).all()
    dates = sorted({dt.date().isoformat() for dt in created_at_values if dt is not None})
    return dates


@router.get("/entries/search/", response_model=List[DiaryEntry])
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

    escaped = _escape_like(query)
    stmt = select(DiaryEntry).where(
        or_(
            DiaryEntry.title.ilike(f"%{escaped}%"),
            DiaryEntry.content.ilike(f"%{escaped}%"),
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

@router.get("/entries/{entry_id}", response_model=DiaryEntry)
def read_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/entries/{entry_id}", response_model=DiaryEntry)
def update_entry(entry_id: int, payload: DiaryEntryUpdate, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)
    entry.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}


@router.post("/todos/", response_model=Todo)
def create_todo(todo: TodoCreate, session: Session = Depends(get_session)):
    db_todo = Todo(title=todo.title, completed=todo.completed)
    session.add(db_todo)
    session.commit()
    session.refresh(db_todo)
    return db_todo


@router.get("/todos/", response_model=List[Todo])
def read_todos(
    session: Session = Depends(get_session)
):
    # Sort by created_at desc (newest first)
    todos = session.exec(select(Todo).order_by(Todo.created_at.desc())).all()
    return todos


@router.put("/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo: TodoUpdate, session: Session = Depends(get_session)):
    db_todo = session.get(Todo, todo_id)
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    todo_data = todo.model_dump(exclude_unset=True)
    for key, value in todo_data.items():
        setattr(db_todo, key, value)
    
    session.add(db_todo)
    session.commit()
    session.refresh(db_todo)
    return db_todo


@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    session.delete(todo)
    session.commit()
    return {"ok": True}


app.include_router(router)


# ── Static files / SPA (production) ─────────────────────────────────

static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/assets", StaticFiles(directory=str(static_path / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 路由已经在上面定义，这里处理前端路由
        if full_path.startswith(("entries", "todos", "auth")):
            raise HTTPException(status_code=404)
        
        file_path = static_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # SPA fallback
        return FileResponse(static_path / "index.html")
