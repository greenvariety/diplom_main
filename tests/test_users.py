"""Тесты: Управление пользователями"""
import requests
from ._base import BASE, login, h, Results

USERNAME = "autotest_user_9901"
PASSWORD = "Passw0rd!"
NEW_PASS = "Passw1rd@2"


def _cleanup(token):
    users = requests.get(f"{BASE}/users/", headers=h(token), timeout=5).json()
    for u in (users if isinstance(users, list) else []):
        if u.get("username") in (USERNAME,):
            requests.delete(
                f"{BASE}/users/{u['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена owner — пропуск тестов пользователей")
        return r.summary()

    _cleanup(token)

    # GET список пользователей (owner)
    resp = requests.get(f"{BASE}/users/", headers=h(token), timeout=5)
    r.check("GET /users/ owner — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    r.check(
        "Список users — массив",
        isinstance(resp.json(), list),
        f"тип: {type(resp.json()).__name__}",
    )

    # POST создание admin-пользователя
    resp = requests.post(
        f"{BASE}/users/",
        json={
            "username": USERNAME,
            "password": PASSWORD,
            "display_name": "Авто Тест Пользователь",
            "role": "admin",
        },
        headers=h(token),
        timeout=5,
    )
    r.check("POST /users/ создать admin — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    user_data = resp.json() if resp.status_code in (200, 201) else {}
    user_id = user_data.get("id")
    r.check("Создание user — есть id", user_id is not None, f"id={user_id}")

    # POST дубль username
    resp = requests.post(
        f"{BASE}/users/",
        json={"username": USERNAME, "password": PASSWORD, "role": "admin"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST дубль username — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # POST роль owner запрещена (разрешены только admin/teacher)
    resp = requests.post(
        f"{BASE}/users/",
        json={"username": "autotest_bad_role", "password": PASSWORD, "role": "owner"},
        headers=h(token),
        timeout=5,
    )
    r.check("POST роль owner — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    if user_id:
        # Логин созданного пользователя
        user_token = login(USERNAME, PASSWORD)
        r.check(
            "Логин созданного admin — токен получен",
            user_token is not None,
            f"token={'yes' if user_token else 'no'}",
        )

        if user_token:
            # Admin не должен видеть /users/
            resp = requests.get(f"{BASE}/users/", headers=h(user_token), timeout=5)
            r.check("Admin: GET /users/ — 403", resp.status_code == 403, f"HTTP {resp.status_code}")

        # PATCH display_name (owner)
        resp = requests.patch(
            f"{BASE}/users/{user_id}/",
            json={"display_name": "Обновлённый Тест Пользователь"},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /users/{id}/ display_name — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # POST set-password
        resp = requests.post(
            f"{BASE}/users/{user_id}/set-password/",
            json={"new_password": NEW_PASS},
            headers=h(token),
            timeout=5,
        )
        r.check("POST /users/{id}/set-password/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # DELETE user
        resp = requests.delete(
            f"{BASE}/users/{user_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /users/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
