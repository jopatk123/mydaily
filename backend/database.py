from sqlmodel import SQLModel, create_engine, Session
import os
from pathlib import Path

# 使用 Docker volume 挂载的数据目录或本地项目目录
if os.path.exists("/.dockerenv"):
    # 在 Docker 容器中
    data_dir = "/app/data"
else:
    # 在本地开发环境中，使用项目目录下的 data 文件夹
    data_dir = str(Path(__file__).parent.parent / "data")

os.makedirs(data_dir, exist_ok=True)

sqlite_file_name = f"{data_dir}/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _migrate_add_pin_columns()


def _migrate_add_pin_columns():
    """为已有数据库添加置顶字段（兼容迁移）。"""
    from sqlalchemy import text
    alter_stmts = [
        "ALTER TABLE diaryentry ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE diaryentry ADD COLUMN pinned_at DATETIME",
    ]
    with Session(engine) as session:
        for stmt in alter_stmts:
            try:
                session.exec(text(stmt))
                session.commit()
            except Exception:
                # 列已存在时 SQLite 会报错，忽略即可
                session.rollback()

def get_session():
    with Session(engine) as session:
        yield session
