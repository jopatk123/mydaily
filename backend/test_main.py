from datetime import datetime, timezone

from models import DiaryEntry, Todo
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
