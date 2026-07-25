import logging
import os
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine, text

logger = logging.getLogger(__name__)

# 数据目录优先级：
#   1. MYDAILY_DATA_DIR 环境变量（显式配置，推荐生产使用）
#   2. Docker 容器默认路径 /app/data
#   3. 本地开发使用项目根目录下的 data 文件夹
_env_data_dir = os.getenv("MYDAILY_DATA_DIR")
if _env_data_dir:
    data_dir = _env_data_dir
elif os.path.exists("/.dockerenv"):
    data_dir = "/app/data"
else:
    data_dir = str(Path(__file__).parent.parent / "data")

os.makedirs(data_dir, exist_ok=True)

sqlite_file_name = str(Path(data_dir) / "database.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def _column_exists(session: Session, table: str, column: str) -> bool:
    """检查 SQLite 表中是否存在指定列，避免靠异常判断的迁移逻辑。"""
    rows = session.exec(text(f"PRAGMA table_info({table})")).all()
    return any(row[1] == column for row in rows)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _migrate_add_pin_columns()


def _migrate_add_pin_columns():
    """为已有数据库添加置顶字段（兼容迁移）。

    TODO: 长期应迁移到 Alembic。当前保留以兼容旧版本数据库，
    通过 PRAGMA table_info 检查列存在性，避免每次启动都触发 ALTER TABLE 异常。
    """
    with Session(engine) as session:
        for stmt in (
            "ALTER TABLE diaryentry ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE diaryentry ADD COLUMN pinned_at DATETIME",
        ):
            column_name = stmt.split("ADD COLUMN ")[1].split()[0]
            if _column_exists(session, "diaryentry", column_name):
                continue
            session.exec(text(stmt))
            session.commit()
            logger.info("Applied migration: added column %s to diaryentry", column_name)


def get_session():
    with Session(engine) as session:
        yield session
