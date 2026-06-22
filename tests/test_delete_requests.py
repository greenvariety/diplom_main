"""Тесты: Заявки на удаление"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    owner_token = login("admin", "admin_-1")
    if not owner_token:
        r.fail("Нет токена — пропуск тестов заявок на удаление")
        return r.summary()

    # Создадим факультет для заявки
    resp = requests.post(
        f"{BASE}/faculties/",
        json={"full_name": "Факультет для заявки авто", "short_name": "ФЗА"},
        headers=h(owner_token),
        timeout=5,
    )
    fac_id = resp.json().get("id") if resp.status_code in (200, 201) else None

    if not fac_id:
        r.fail("Не удалось создать факультет для теста заявки")
        return r.summary()

    # GET список заявок
    resp = requests.get(f"{BASE}/delete-requests/", headers=h(owner_token), timeout=5)
    r.check("GET /delete-requests/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # GET счётчик
    resp = requests.get(f"{BASE}/delete-requests/count/", headers=h(owner_token), timeout=5)
    r.check("GET /delete-requests/count/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # POST заявка на удаление
    resp = requests.post(
        f"{BASE}/faculties/{fac_id}/delete-request/",
        json={"reason": "Тестовая заявка автотест"},
        headers=h(owner_token),
        timeout=5,
    )
    r.check("POST delete-request — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    dr_data = resp.json()
    r.check(
        "delete-request ответ содержит ok или id",
        dr_data.get("ok") is True or "id" in dr_data,
        f"resp: {dr_data}",
    )
    dr_id = dr_data.get("id")

    if dr_id:
        # Отклонить заявку
        resp = requests.post(
            f"{BASE}/delete-requests/{dr_id}/reject/",
            json={"reason": "автотест отклонение"},
            headers=h(owner_token),
            timeout=5,
        )
        r.check("POST /delete-requests/{id}/reject/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # Удаление факультета напрямую
    resp = requests.delete(
        f"{BASE}/faculties/{fac_id}/",
        json={"password": "admin_-1"},
        headers=h(owner_token),
        timeout=5,
    )
    r.check("Удаление факультета после теста — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
