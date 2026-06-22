"""Тесты: Факультеты"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов факультетов")
        return r.summary()

    # Список факультетов
    resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    r.check("GET /faculties/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    r.check("Список факультетов — массив", isinstance(resp.json(), list), f"тип: {type(resp.json()).__name__}")

    # Создание факультета
    payload = {"full_name": "Тестовый факультет автотест", "short_name": "ТФ"}
    resp = requests.post(f"{BASE}/faculties/", json=payload, headers=h(token), timeout=5)
    r.check("POST /faculties/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    faculty_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание факультета — есть id", faculty_id is not None, f"id={faculty_id}")

    if faculty_id:
        # Детали факультета
        resp = requests.get(f"{BASE}/faculties/{faculty_id}/", headers=h(token), timeout=5)
        r.check("GET /faculties/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        r.check("Детали содержат full_name", "full_name" in resp.json(), f"keys: {list(resp.json().keys())[:5]}")

        # Обновление факультета
        patch = {"full_name": "Тестовый факультет (изменён)", "short_name": "ТФ"}
        resp = requests.patch(f"{BASE}/faculties/{faculty_id}/", json=patch, headers=h(token), timeout=5)
        r.check("PATCH /faculties/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Флаг
        resp = requests.post(f"{BASE}/faculties/{faculty_id}/flag/", headers=h(token), timeout=5)
        r.check("POST /faculties/{id}/flag/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Заявка на удаление
        resp = requests.post(
            f"{BASE}/faculties/{faculty_id}/delete-request/",
            json={"reason": "автотест"},
            headers=h(token),
            timeout=5,
        )
        r.check("POST delete-request — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
        r.check(
            "delete-request возвращает ok",
            resp.json().get("ok") is True or "id" in resp.json(),
            f"resp: {resp.json()}",
        )

        # Прямое удаление owner с паролем
        resp = requests.delete(
            f"{BASE}/faculties/{faculty_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /faculties/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
