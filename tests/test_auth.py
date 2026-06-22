"""Тесты: Авторизация и аутентификация"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()

    # Логин с правильными данными
    token = login("admin", "admin_-1")
    r.check("Логин owner — 200 + токен", token is not None, f"token={'yes' if token else 'no'}")
    if not token:
        r.fail("Пропуск остальных тестов — нет токена", "сервер не запущен?")
        return r.summary()

    # Логин с неверным паролем
    resp = requests.post(f"{BASE}/auth/login/", json={"username": "admin", "password": "wrong"}, timeout=5)
    r.check("Логин с неверным паролем — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # Логин с несуществующим пользователем
    resp = requests.post(f"{BASE}/auth/login/", json={"username": "no_such_user", "password": "x"}, timeout=5)
    r.check("Логин несуществующего — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # Доступ к защищённому эндпоинту с токеном
    resp = requests.get(f"{BASE}/me/", headers=h(token), timeout=5)
    r.check("GET /me/ с токеном — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # Поле role в ответе /me/
    data = resp.json() if resp.status_code == 200 else {}
    r.check("GET /me/ содержит role=owner", data.get("role") == "owner", f"role={data.get('role')}")

    # Доступ без токена
    resp = requests.get(f"{BASE}/me/", timeout=5)
    r.check("GET /me/ без токена — 401", resp.status_code == 401, f"HTTP {resp.status_code}")

    # Refresh токена
    full = requests.post(f"{BASE}/auth/login/", json={"username": "admin", "password": "admin_-1"}, timeout=5).json()
    refresh = full.get("refresh")
    if refresh:
        resp = requests.post(f"{BASE}/auth/refresh/", json={"refresh": refresh}, timeout=5)
        r.check("Refresh токена — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        r.check("Refresh возвращает access", "access" in resp.json(), f"keys: {list(resp.json().keys())}")
    else:
        r.fail("Refresh токен не получен")

    # Выход
    resp = requests.post(f"{BASE}/auth/logout/", headers=h(token), timeout=5)
    r.check("Logout — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
