import hmac
import os
from contextlib import asynccontextmanager
from datetime import date as dt_date
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_
from sqlmodel import Session, select

from auth import MYDAILY_PASSWORD, generate_token, login_limiter, verify_auth
from database import create_db_and_tables, get_session
from models import (
    DiaryEntry,
    DiaryEntryCreate,
    DiaryEntryUpdate,
    LoginRequest,
    LoginResponse,
    Todo,
    TodoCreate,
    TodoUpdate,
)


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _apply_date_filter(stmt, date_str: str):
    """Apply a ``date=YYYY-MM-DD`` filter to a DiaryEntry select statement.

    Raises HTTPException(400) on invalid date format.
    """
    try:
        filter_day = dt_date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    return stmt.where(func.date(DiaryEntry.created_at) == filter_day.isoformat())


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

# CORS origins 可通过环境变量配置，逗号分隔；默认覆盖常见本地开发端口
_default_origins = "http://localhost:5173,http://localhost:3000,http://localhost:8000"
_cors_env = os.getenv("MYDAILY_CORS_ORIGINS", _default_origins)
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Public endpoints ───────────────────────────────────────────────


@app.get("/health")
def health():
    """Lightweight readiness probe — no auth required."""
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not login_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")
    if not hmac.compare_digest(body.password, MYDAILY_PASSWORD):
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
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    date: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(DiaryEntry)
    if date:
        stmt = _apply_date_filter(stmt, date)
    stmt = stmt.offset(offset).limit(limit).order_by(DiaryEntry.is_pinned.desc(), DiaryEntry.created_at.desc())
    return session.exec(stmt).all()


@router.get("/entries/export/", response_model=List[DiaryEntry])
def export_entries(session: Session = Depends(get_session)):
    stmt = select(DiaryEntry).order_by(DiaryEntry.is_pinned.desc(), DiaryEntry.created_at.desc())
    return session.exec(stmt).all()


@router.get("/entries/dates/", response_model=List[str])
def read_entry_dates(session: Session = Depends(get_session)):
    # 在 SQL 中做 DISTINCT + 排序，避免把全部 created_at 拉到内存
    stmt = select(func.date(DiaryEntry.created_at)).distinct().order_by(func.date(DiaryEntry.created_at))
    return [d for d in session.exec(stmt).all() if d]


@router.get("/entries/search/", response_model=List[DiaryEntry])
def search_entries(
    q: str = Query(..., max_length=200),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    date: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = q.strip()
    if not query:
        return []

    escaped = _escape_like(query)
    stmt = select(DiaryEntry).where(
        or_(
            DiaryEntry.title.ilike(f"%{escaped}%", escape="\\"),
            DiaryEntry.content.ilike(f"%{escaped}%", escape="\\"),
        )
    )

    if date:
        stmt = _apply_date_filter(stmt, date)

    stmt = stmt.offset(offset).limit(limit).order_by(DiaryEntry.is_pinned.desc(), DiaryEntry.created_at.desc())
    return session.exec(stmt).all()


@router.patch("/entries/{entry_id}/pin", response_model=DiaryEntry)
def toggle_pin_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.is_pinned = not entry.is_pinned
    entry.pinned_at = datetime.now(timezone.utc) if entry.is_pinned else None
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


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
def read_todos(session: Session = Depends(get_session)):
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
        if full_path.startswith(("entries", "todos", "auth", "health")):
            raise HTTPException(status_code=404)

        file_path = static_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # SPA fallback
        return FileResponse(static_path / "index.html")
