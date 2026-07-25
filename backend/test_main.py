from datetime import datetime, timezone

from models import DiaryEntry

# ========== Auth Tests ==========


def test_login_success(login_client):
    response = login_client.post("/auth/login", json={"password": "asd123123123"})
    assert response.status_code == 200
    assert "token" in response.json()


def test_login_wrong_password(login_client):
    response = login_client.post("/auth/login", json={"password": "wrongpassword"})
    assert response.status_code == 401


def test_login_rate_limit(login_client):
    """After 10 failed attempts, the 11th should be rate-limited (HTTP 429)."""
    for _ in range(10):
        login_client.post("/auth/login", json={"password": "wrong"})
    response = login_client.post("/auth/login", json={"password": "wrong"})
    assert response.status_code == 429


# ========== Diary Entry Tests ==========


def test_create_entry(client):
    response = client.post(
        "/entries/",
        json={"title": "Test Entry", "content": "This is a test entry."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Entry"
    assert data["content"] == "This is a test entry."
    assert "id" in data


def test_read_entries(client):
    # Create an entry first
    client.post(
        "/entries/",
        json={"title": "Entry 1", "content": "Content 1"},
    )
    client.post(
        "/entries/",
        json={"title": "Entry 2", "content": "Content 2"},
    )

    response = client.get("/entries/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_read_entry(client):
    # Create an entry first
    create_response = client.post(
        "/entries/",
        json={"title": "Single Entry", "content": "Single Content"},
    )
    entry_id = create_response.json()["id"]

    response = client.get(f"/entries/{entry_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Single Entry"


def test_read_entry_not_found(client):
    response = client.get("/entries/999")
    assert response.status_code == 404


def test_delete_entry(client):
    # Create an entry first
    create_response = client.post(
        "/entries/",
        json={"title": "To Delete", "content": "Will be deleted"},
    )
    entry_id = create_response.json()["id"]

    response = client.delete(f"/entries/{entry_id}")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    # Verify it's deleted
    get_response = client.get(f"/entries/{entry_id}")
    assert get_response.status_code == 404


def test_delete_entry_not_found(client):
    response = client.delete("/entries/999")
    assert response.status_code == 404


def test_search_entries_by_title_and_content(client):
    client.post(
        "/entries/",
        json={"title": "Hello World", "content": "Something here"},
    )
    client.post(
        "/entries/",
        json={"title": "Other", "content": "Mention KEYWORD inside"},
    )

    response_title = client.get("/entries/search/", params={"q": "Hello"})
    assert response_title.status_code == 200
    data_title = response_title.json()
    assert len(data_title) == 1
    assert data_title[0]["title"] == "Hello World"

    response_content = client.get("/entries/search/", params={"q": "KEYWORD"})
    assert response_content.status_code == 200
    data_content = response_content.json()
    assert len(data_content) == 1
    assert data_content[0]["title"] == "Other"


def test_search_entries_empty_query_returns_empty_list(client):
    client.post(
        "/entries/",
        json={"title": "A", "content": "B"},
    )
    response = client.get("/entries/search/", params={"q": "   "})
    assert response.status_code == 200
    assert response.json() == []


def test_read_entry_dates(client, session):
    session.add(
        DiaryEntry(
            title="D1",
            content="C1",
            created_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.add(
        DiaryEntry(
            title="D2",
            content="C2",
            created_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.commit()

    response = client.get("/entries/dates/")
    assert response.status_code == 200
    dates = response.json()
    assert "2024-01-01" in dates
    assert "2024-01-02" in dates


def test_read_entries_filter_by_date(client, session):
    session.add(
        DiaryEntry(
            title="D1",
            content="C1",
            created_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.add(
        DiaryEntry(
            title="D2",
            content="C2",
            created_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.commit()

    response = client.get("/entries/", params={"date": "2024-01-01"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "D1"


def test_search_entries_filter_by_date(client, session):
    session.add(
        DiaryEntry(
            title="Hello",
            content="Same keyword",
            created_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.add(
        DiaryEntry(
            title="Hello",
            content="Same keyword",
            created_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 2, 9, 0, 0, tzinfo=timezone.utc),
        )
    )
    session.commit()

    response = client.get("/entries/search/", params={"q": "Hello", "date": "2024-01-02"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["created_at"].startswith("2024-01-02")


def test_invalid_date_filter_returns_400(client):
    response = client.get("/entries/", params={"date": "2024-13-40"})
    assert response.status_code == 400


def test_update_entry(client):
    create_response = client.post(
        "/entries/",
        json={"title": "Old", "content": "Old content"},
    )
    entry_id = create_response.json()["id"]

    update_response = client.put(
        f"/entries/{entry_id}",
        json={"title": "New", "content": "New content"},
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["title"] == "New"
    assert data["content"] == "New content"


def test_export_entries(client):
    client.post(
        "/entries/",
        json={"title": "Export 1", "content": "Content 1"},
    )
    client.post(
        "/entries/",
        json={"title": "Export 2", "content": "Content 2"},
    )

    response = client.get("/entries/export/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


# ========== Todo Tests ==========


def test_create_todo(client):
    response = client.post(
        "/todos/",
        json={"title": "买菜", "completed": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "买菜"
    assert data["completed"] is False
    assert "id" in data
    assert "created_at" in data


def test_read_todos(client):
    # 创建多个待办事项
    client.post("/todos/", json={"title": "任务1", "completed": False})
    client.post("/todos/", json={"title": "任务2", "completed": True})
    client.post("/todos/", json={"title": "任务3", "completed": False})

    response = client.get("/todos/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # 验证按创建时间倒序排列
    assert data[0]["title"] == "任务3"


def test_update_todo(client):
    create_response = client.post(
        "/todos/",
        json={"title": "学习 Python", "completed": False},
    )
    todo_id = create_response.json()["id"]

    # 更新为已完成
    update_response = client.put(
        f"/todos/{todo_id}",
        json={"title": "学习 Python", "completed": True},
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["completed"] is True


def test_update_todo_not_found(client):
    response = client.put(
        "/todos/999",
        json={"title": "不存在", "completed": True},
    )
    assert response.status_code == 404


def test_delete_todo(client):
    create_response = client.post(
        "/todos/",
        json={"title": "待删除任务", "completed": False},
    )
    todo_id = create_response.json()["id"]

    delete_response = client.delete(f"/todos/{todo_id}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    # 验证已被删除
    get_response = client.get("/todos/")
    todos = get_response.json()
    assert not any(t["id"] == todo_id for t in todos)


def test_delete_todo_not_found(client):
    response = client.delete("/todos/999")
    assert response.status_code == 404


def test_toggle_todo_completion(client):
    # 创建未完成的待办
    create_response = client.post(
        "/todos/",
        json={"title": "测试切换", "completed": False},
    )
    todo_id = create_response.json()["id"]

    # 切换为完成
    client.put(
        f"/todos/{todo_id}",
        json={"title": "测试切换", "completed": True},
    )

    # 再切换回未完成
    response = client.put(
        f"/todos/{todo_id}",
        json={"title": "测试切换", "completed": False},
    )
    assert response.status_code == 200
    assert response.json()["completed"] is False


# ========== Health & Auth Enforcement Tests ==========


def test_health_endpoint_no_auth_required(login_client):
    """未带 token 访问 /health 应该返回 200。"""
    response = login_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_route_without_token_returns_401(login_client):
    """未带 token 访问受保护路由应返回 401。"""
    response = login_client.get("/entries/")
    assert response.status_code == 401


def test_protected_route_with_malformed_token_returns_401(login_client):
    """格式错误的 token 应返回 401。"""
    response = login_client.get(
        "/entries/",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Malformed token"


def test_protected_route_with_wrong_token_returns_401(login_client):
    """签名不匹配的 token 应返回 401。"""
    # 构造一个 exp_ts 合法但签名错误的 token
    import time

    fake_token = f"{int(time.time()) + 3600}.deadbeef"
    response = login_client.get(
        "/entries/",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_expired_token_returns_401(login_client):
    """过期 token 应返回 401，提示需要重新登录。"""
    import hashlib
    import hmac as _hmac

    from auth import MYDAILY_PASSWORD, SECRET_KEY

    past_ts = 1  # 1970 年初，必定已过期
    payload = f"{MYDAILY_PASSWORD}:{past_ts}".encode()
    sig = _hmac.new(SECRET_KEY.encode(), payload, hashlib.sha256).hexdigest()
    expired_token = f"{past_ts}.{sig}"

    response = login_client.get(
        "/entries/",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"


def test_login_returns_token_with_expiry(login_client):
    """登录返回的 token 应包含 exp_timestamp 前缀。"""
    response = login_client.post("/auth/login", json={"password": "asd123123123"})
    assert response.status_code == 200
    token = response.json()["token"]
    assert "." in token
    exp_str, _ = token.split(".", 1)
    assert exp_str.isdigit()


def test_valid_token_grants_access(login_client):
    """登录拿到的 token 应能访问受保护路由。"""
    login_response = login_client.post("/auth/login", json={"password": "asd123123123"})
    token = login_response.json()["token"]

    response = login_client.get(
        "/entries/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


# ========== Pin Feature Tests ==========


def test_toggle_pin_entry(client):
    create_response = client.post(
        "/entries/",
        json={"title": "To Pin", "content": "Will be pinned"},
    )
    entry_id = create_response.json()["id"]
    assert create_response.json()["is_pinned"] is False

    # 置顶
    pin_response = client.patch(f"/entries/{entry_id}/pin")
    assert pin_response.status_code == 200
    pinned = pin_response.json()
    assert pinned["is_pinned"] is True
    assert pinned["pinned_at"] is not None

    # 取消置顶
    unpin_response = client.patch(f"/entries/{entry_id}/pin")
    assert unpin_response.status_code == 200
    unpinned = unpin_response.json()
    assert unpinned["is_pinned"] is False
    assert unpinned["pinned_at"] is None


def test_toggle_pin_entry_not_found(client):
    response = client.patch("/entries/999/pin")
    assert response.status_code == 404


def test_pinned_entries_sorted_first(client):
    """置顶日记应排在未置顶日记之前。"""
    client.post("/entries/", json={"title": "Normal A", "content": "c1"})
    pinned_resp = client.post("/entries/", json={"title": "Pinned B", "content": "c2"})
    client.post("/entries/", json={"title": "Normal C", "content": "c3"})

    client.patch(f"/entries/{pinned_resp.json()['id']}/pin")

    response = client.get("/entries/")
    data = response.json()
    assert data[0]["title"] == "Pinned B"
    assert data[0]["is_pinned"] is True


# ========== SQL LIKE Escape Tests ==========


def test_search_entries_escapes_percent_literal(client):
    """搜索包含 % 字符的内容时，% 应作为字面量而非通配符。"""
    client.post("/entries/", json={"title": "discount 50% off", "content": "no keyword"})
    client.post("/entries/", json={"title": "no match here", "content": "abcdef"})

    response = client.get("/entries/search/", params={"q": "50%"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "discount 50% off"


def test_search_entries_escapes_underscore_literal(client):
    """搜索包含 _ 字符的内容时，_ 应作为字面量而非单字符通配符。"""
    client.post("/entries/", json={"title": "foo_bar", "content": "x"})
    client.post("/entries/", json={"title": "fooxbar", "content": "x"})

    response = client.get("/entries/search/", params={"q": "foo_bar"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "foo_bar"


# ========== Query Validation Tests ==========


def test_read_entries_limit_upper_bound(client):
    """limit 超过 500 应返回 422 校验错误。"""
    response = client.get("/entries/", params={"limit": 1000})
    assert response.status_code == 422


def test_read_entries_limit_zero_returns_422(client):
    response = client.get("/entries/", params={"limit": 0})
    assert response.status_code == 422


def test_search_entries_query_too_long_returns_422(client):
    """搜索关键词超过 200 字符应返回 422。"""
    response = client.get("/entries/search/", params={"q": "a" * 201})
    assert response.status_code == 422


# ========== Rate Limiter Recovery Tests ==========


def test_login_rate_limit_recovers_after_window(login_client, monkeypatch):
    """限流窗口过后应恢复登录能力。"""
    # 灌满 10 次失败
    for _ in range(10):
        login_client.post("/auth/login", json={"password": "wrong"})
    # 第 11 次应被限流
    blocked = login_client.post("/auth/login", json={"password": "wrong"})
    assert blocked.status_code == 429

    # 模拟时间前进越过窗口期
    import time

    future = time.time() + 61
    monkeypatch.setattr(time, "time", lambda: future)

    # 窗口外应能再次尝试（即使是错误密码也应该返回 401 而非 429）
    response = login_client.post("/auth/login", json={"password": "wrong"})
    assert response.status_code == 401

    # 正确密码应能成功
    response = login_client.post("/auth/login", json={"password": "asd123123123"})
    assert response.status_code == 200
