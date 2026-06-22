"""Тесты: Родители и привязка к студентам"""
import requests
from ._base import BASE, login, h, Results

PARENT_PHONE = "+79993334401"
STUDENT_PHONE = "+79993334402"


def _cleanup(token):
    parents = requests.get(f"{BASE}/parents/", headers=h(token), timeout=5).json()
    for p in (parents if isinstance(parents, list) else []):
        if p.get("phone") == PARENT_PHONE:
            requests.delete(
                f"{BASE}/parents/{p['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )
    data = requests.get(f"{BASE}/students/", headers=h(token), timeout=5).json()
    students = data.get("results", data) if isinstance(data, dict) else data
    for s in (students if isinstance(students, list) else []):
        if s.get("phone") == STUDENT_PHONE:
            requests.delete(
                f"{BASE}/students/{s['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов родителей")
        return r.summary()

    _cleanup(token)

    # GET список родителей
    resp = requests.get(f"{BASE}/parents/", headers=h(token), timeout=5)
    r.check("GET /parents/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # POST создание родителя
    payload = {
        "last_name": "АвтоРодитель",
        "first_name": "Тест",
        "middle_name": "Тестович",
        "birth_date": "1975-06-20",
        "phone": PARENT_PHONE,
        "email": "autotest_parent@example.com",
    }
    resp = requests.post(f"{BASE}/parents/", json=payload, headers=h(token), timeout=5)
    r.check("POST /parents/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    parent_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание родителя — есть id", parent_id is not None, f"id={parent_id}")

    # Создадим студента для привязки
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []
    fac_id = faculties[0]["id"] if faculties else None

    student_id = None
    if fac_id:
        resp = requests.post(
            f"{BASE}/students/",
            json={
                "last_name": "АвтоСтуд2",
                "first_name": "Тест",
                "middle_name": "",
                "birth_date": "2005-01-01",
                "phone": STUDENT_PHONE,
                "email": "autotest_s2@example.com",
                "faculty_id": fac_id,
            },
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            student_id = resp.json().get("id")

    if parent_id and student_id:
        # Привязка родителя к студенту
        resp = requests.post(
            f"{BASE}/students/{student_id}/parents/",
            json={"parent_id": parent_id, "relation_type": "mother"},
            headers=h(token),
            timeout=5,
        )
        r.check("Привязка родителя к студенту — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")

        # Фильтрация родителей по студенту
        resp = requests.get(f"{BASE}/parents/?student={student_id}", headers=h(token), timeout=5)
        r.check("Фильтрация /parents/?student={id} — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        parents_list = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        r.check(
            "Родитель найден через фильтр",
            any(p["id"] == parent_id for p in parents_list),
            f"{len(parents_list)} родителей",
        )

        # Очистка студента
        requests.delete(
            f"{BASE}/students/{student_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )

    if parent_id:
        # GET детали
        resp = requests.get(f"{BASE}/parents/{parent_id}/", headers=h(token), timeout=5)
        r.check("GET /parents/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Флаг
        resp = requests.post(f"{BASE}/parents/{parent_id}/flag/", headers=h(token), timeout=5)
        r.check("POST /parents/{id}/flag/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Удаление
        resp = requests.delete(
            f"{BASE}/parents/{parent_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /parents/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
