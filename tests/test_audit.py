"""Тесты: Журнал изменений (AuditLog)"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов аудита")
        return r.summary()

    # GET список
    resp = requests.get(f"{BASE}/audit-log/", headers=h(token), timeout=5)
    r.check("GET /audit-log/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    data = resp.json()
    r.check(
        "Аудит-лог содержит results или список",
        isinstance(data, (list, dict)),
        f"тип: {type(data).__name__}",
    )

    # Экспорт Excel
    resp = requests.get(f"{BASE}/audit-log/export/", headers=h(token), timeout=10)
    r.check("GET /audit-log/export/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    ct = resp.headers.get("Content-Type", "")
    r.check(
        "Экспорт — Content-Type xlsx",
        "spreadsheet" in ct or "xlsx" in ct or "excel" in ct or "octet-stream" in ct,
        f"Content-Type: {ct}",
    )

    # Список пользователей для фильтрации
    resp = requests.get(f"{BASE}/audit-log/users/", headers=h(token), timeout=5)
    r.check("GET /audit-log/users/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # Фильтрация по action
    resp = requests.get(f"{BASE}/audit-log/?action=created", headers=h(token), timeout=5)
    r.check("GET /audit-log/?action=created — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    data2 = resp.json()
    r.check(
        "Фильтр по action — список или пагинация",
        isinstance(data2, (list, dict)),
        f"тип: {type(data2).__name__}",
    )

    # Фильтрация по object_type
    resp = requests.get(f"{BASE}/audit-log/?object_type=Faculty", headers=h(token), timeout=5)
    r.check(
        "GET /audit-log/?object_type=Faculty — 200",
        resp.status_code == 200,
        f"HTTP {resp.status_code}",
    )

    return r.summary()
