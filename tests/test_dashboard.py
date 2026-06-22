"""Тесты: Dashboard и организация"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов дашборда")
        return r.summary()

    # GET дашборд
    resp = requests.get(f"{BASE}/dashboard/", headers=h(token), timeout=5)
    r.check("GET /dashboard/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    data = resp.json()
    r.check("Dashboard содержит stats", "stats" in data, f"keys: {list(data.keys())}")
    r.check("Dashboard содержит recent_audit", "recent_audit" in data, f"keys: {list(data.keys())}")

    stats = data.get("stats", {})
    r.check("Dashboard stats содержит faculties", "faculties" in stats, f"stats keys: {list(stats.keys())}")
    r.check("Dashboard stats содержит students", "students" in stats, f"stats keys: {list(stats.keys())}")
    r.check("Dashboard stats содержит employees", "employees" in stats, f"stats keys: {list(stats.keys())}")

    # GET организации
    resp = requests.get(f"{BASE}/organizations/", headers=h(token), timeout=5)
    r.check("GET /organizations/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    orgs = resp.json()
    r.check(
        "Организации — список или объект",
        isinstance(orgs, (list, dict)),
        f"тип: {type(orgs).__name__}",
    )

    return r.summary()
