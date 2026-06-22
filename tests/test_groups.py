"""Тесты: Группы"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов групп")
        return r.summary()

    # Нужен факультет
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []

    created_faculty = False
    if not faculties:
        resp = requests.post(
            f"{BASE}/faculties/",
            json={"full_name": "Авто-факультет для групп", "short_name": "АФ"},
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            faculties = [resp.json()]
            created_faculty = True

    fac_id = faculties[0]["id"] if faculties else None

    # GET список групп
    resp = requests.get(f"{BASE}/groups/", headers=h(token), timeout=5)
    r.check("GET /groups/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    if not fac_id:
        r.fail("Нет факультета — пропуск создания группы")
        return r.summary()

    # POST создание группы
    payload = {"faculty_id": fac_id, "year": 2024}
    resp = requests.post(f"{BASE}/groups/", json=payload, headers=h(token), timeout=5)
    r.check("POST /groups/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    group_data = resp.json() if resp.status_code in (200, 201) else {}
    group_id = group_data.get("id")
    r.check("Создание группы — есть id", group_id is not None, f"id={group_id}")
    r.check("Группа содержит поле name (вычисляемое)", "name" in group_data, f"keys: {list(group_data.keys())[:6]}")

    if group_id:
        # GET детали
        resp = requests.get(f"{BASE}/groups/{group_id}/", headers=h(token), timeout=5)
        r.check("GET /groups/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Флаг
        resp = requests.post(f"{BASE}/groups/{group_id}/flag/", headers=h(token), timeout=5)
        r.check("POST /groups/{id}/flag/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Удаление
        resp = requests.delete(
            f"{BASE}/groups/{group_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /groups/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    if created_faculty and fac_id:
        requests.delete(
            f"{BASE}/faculties/{fac_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )

    return r.summary()
