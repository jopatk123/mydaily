from datetime import datetime, timezone

from models import DiaryEntry
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
