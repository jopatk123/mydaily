from sqlmodel import SQLModel, create_engine, Session
import os

# 使用 Docker volume 挂载的数据目录
data_dir = "/app/data"
os.makedirs(data_dir, exist_ok=True)

sqlite_file_name = f"{data_dir}/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
