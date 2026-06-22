"""Тесты: Должности"""
import requests
from ._base import BASE, login, h, Results

NAME = "Авто-должность-тест-9901"


def _cleanup(token):
    positions = requests.get(f"{BASE}/positions/", headers=h(token), timeout=5).json()
    for p in (positions if isinstance(positions, list) else []):
        if NAME in str(p.get("name", "")):
            requests.delete(
                f"{BASE}/positions/{p['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов должностей")
        return r.summary()

    _cleanup(token)

    # GET список должностей
    resp = requests.get(f"{BASE}/positions/", headers=h(token), timeout=5)
    r.check("GET /positions/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    r.check(
        "Список должностей — массив",
        isinstance(resp.json(), list),
        f"тип: {type(resp.json()).__name__}",
    )

    # POST создание должности
    resp = requests.post(
        f"{BASE}/positions/",
        json={"name": NAME, "role_type": "teacher"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST /positions/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    pos_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание должности — есть id", pos_id is not None, f"id={pos_id}")

    # POST дубль названия
    resp = requests.post(
        f"{BASE}/positions/",
        json={"name": NAME, "role_type": "teacher"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST дубль названия должности — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # POST неверный role_type
    resp = requests.post(
        f"{BASE}/positions/",
        json={"name": f"{NAME}-Б", "role_type": "superadmin"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST неверный role_type — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    if pos_id:
        # PATCH имя
        resp = requests.patch(
            f"{BASE}/positions/{pos_id}/",
            json={"name": f"{NAME}-изм", "role_type": "teacher"},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /positions/{id}/ имя — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # PATCH смена role_type (нет сотрудников)
        resp = requests.patch(
            f"{BASE}/positions/{pos_id}/",
            json={"name": f"{NAME}-изм", "role_type": "none"},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /positions/{id}/ role_type — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # DELETE неверный пароль
        resp = requests.delete(
            f"{BASE}/positions/{pos_id}/",
            json={"password": "wrong_password"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /positions/{id}/ неверный пароль — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

        # DELETE с паролем
        resp = requests.delete(
            f"{BASE}/positions/{pos_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /positions/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
