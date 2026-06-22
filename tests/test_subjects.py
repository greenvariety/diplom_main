"""Тесты: Предметы"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов предметов")
        return r.summary()

    # GET список
    resp = requests.get(f"{BASE}/subjects/", headers=h(token), timeout=5)
    r.check("GET /subjects/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # POST создание
    resp = requests.post(
        f"{BASE}/subjects/",
        json={"name": "Авто-предмет тест 9999"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST /subjects/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    subj_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание предмета — есть id", subj_id is not None, f"id={subj_id}")

    if subj_id:
        # GET детали
        resp = requests.get(f"{BASE}/subjects/{subj_id}/", headers=h(token), timeout=5)
        r.check("GET /subjects/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # PATCH
        resp = requests.patch(
            f"{BASE}/subjects/{subj_id}/",
            json={"name": "Авто-предмет (изменён)"},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /subjects/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Удаление через owner
        resp = requests.delete(
            f"{BASE}/subjects/{subj_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /subjects/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
