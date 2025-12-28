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
