"""Тесты: Сотрудники"""
import requests
from ._base import BASE, login, h, Results

PHONE = "+79991112201"
PHONE2 = "+79991112202"


def _cleanup(token):
    emps = requests.get(f"{BASE}/employees/", headers=h(token), timeout=5).json()
    for e in (emps if isinstance(emps, list) else []):
        if e.get("phone") in (PHONE, PHONE2):
            requests.delete(
                f"{BASE}/employees/{e['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов сотрудников")
        return r.summary()

    _cleanup(token)

    # Нужна должность
    pos_resp = requests.get(f"{BASE}/positions/", headers=h(token), timeout=5)
    positions = pos_resp.json() if pos_resp.status_code == 200 else []
    pos_id = positions[0]["id"] if positions else None

    # GET список
    resp = requests.get(f"{BASE}/employees/", headers=h(token), timeout=5)
    r.check("GET /employees/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    if not pos_id:
        r.fail("Нет должностей — пропуск создания сотрудника")
        return r.summary()

    # POST создание
    payload = {
        "last_name": "Автотест",
        "first_name": "Тест",
        "middle_name": "Тестович",
        "birth_date": "1990-01-01",
        "phone": PHONE,
        "email": "autotest_emp@example.com",
        "position_id": pos_id,
    }
    resp = requests.post(f"{BASE}/employees/", json=payload, headers=h(token), timeout=5)
    r.check("POST /employees/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    emp_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание сотрудника — есть id", emp_id is not None, f"id={emp_id}")

    # Дубль телефона
    payload2 = {**payload, "email": "autotest_emp2@example.com"}
    resp = requests.post(f"{BASE}/employees/", json=payload2, headers=h(token), timeout=5)
    r.check("Дубль телефона -> 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    if emp_id:
        # GET детали
        resp = requests.get(f"{BASE}/employees/{emp_id}/", headers=h(token), timeout=5)
        r.check("GET /employees/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # PATCH
        resp = requests.patch(
            f"{BASE}/employees/{emp_id}/",
            json={"phone": PHONE2},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /employees/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Флаг
        resp = requests.post(f"{BASE}/employees/{emp_id}/flag/", headers=h(token), timeout=5)
        r.check("POST /employees/{id}/flag/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Удаление
        resp = requests.delete(
            f"{BASE}/employees/{emp_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /employees/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
