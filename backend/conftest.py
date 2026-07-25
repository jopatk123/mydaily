import os

# 测试环境固定密码/密钥——必须在导入 auth/main 之前设置，
# 否则 auth 模块加载时会因 fail-closed 直接抛 RuntimeError。
os.environ.setdefault("MYDAILY_PASSWORD", "asd123123123")
os.environ.setdefault("MYDAILY_SECRET_KEY", "test-secret-key-for-pytest-only")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402
from sqlmodel.pool import StaticPool  # noqa: E402

from auth import login_limiter, verify_auth  # noqa: E402
from database import get_session  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[verify_auth] = lambda: None
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="login_client")
def login_client_fixture(session: Session):
    """A client that does NOT bypass auth — used for testing the login endpoint."""

    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the login rate limiter before every test to prevent state bleed."""
    login_limiter.reset()
    yield
