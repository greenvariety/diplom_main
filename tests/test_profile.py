"""Тесты: Профиль пользователя (/api/me/...)"""
import requests
from ._base import BASE, login, h, Results

PUSER = "autotest_profile_9901"
PPASS = "Passw0rd!"


def _cleanup(owner_token):
    users = requests.get(f"{BASE}/users/", headers=h(owner_token), timeout=5).json()
    for u in (users if isinstance(users, list) else []):
        if u.get("username") == PUSER:
            requests.delete(
                f"{BASE}/users/{u['id']}/",
                json={"password": "admin_-1"},
                headers=h(owner_token),
                timeout=5,
            )


def run():
    r = Results()
    owner_token = login("admin", "admin_-1")
    if not owner_token:
        r.fail("Нет токена owner — пропуск тестов профиля")
        return r.summary()

    _cleanup(owner_token)

    # Создание тестового пользователя
    resp = requests.post(
        f"{BASE}/users/",
        json={
            "username": PUSER,
            "password": PPASS,
            "display_name": "Авто Тест Профиль",
            "role": "admin",
        },
        headers=h(owner_token),
        timeout=5,
    )
    r.check(
        "Создание тестового пользователя для профиля — 200 или 201",
        resp.status_code in (200, 201),
        f"HTTP {resp.status_code}",
    )
    user_id = resp.json().get("id") if resp.status_code in (200, 201) else None

    # Логин тестового пользователя
    user_token = login(PUSER, PPASS) if user_id else None
    r.check(
        "Логин тестового пользователя — токен получен",
        user_token is not None,
        f"token={'yes' if user_token else 'no'}",
    )

    if user_token:
        # GET /me/
        resp = requests.get(f"{BASE}/me/", headers=h(user_token), timeout=5)
        r.check("GET /me/ (profile user) — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        me_data = resp.json() if resp.status_code == 200 else {}
        r.check(
            "GET /me/ содержит поле role",
            "role" in me_data,
            f"keys: {list(me_data.keys())[:6]}",
        )

        # PATCH /me/update/ корректный display_name (3 слова кириллицей)
        resp = requests.patch(
            f"{BASE}/me/update/",
            json={"display_name": "Иванов Иван Иванович"},
            headers=h(user_token),
            timeout=5,
        )
        r.check(
            "PATCH /me/update/ display_name корректный — 200",
            resp.status_code == 200,
            f"HTTP {resp.status_code}",
        )

        # PATCH /me/update/ display_name с латиницей — 400
        resp = requests.patch(
            f"{BASE}/me/update/",
            json={"display_name": "Ivan Test User"},
            headers=h(user_token),
            timeout=5,
        )
        r.check(
            "PATCH /me/update/ display_name латиница — 400",
            resp.status_code == 400,
            f"HTTP {resp.status_code}",
        )

        # POST /me/change-password/ неверный текущий пароль
        resp = requests.post(
            f"{BASE}/me/change-password/",
            json={"current_password": "wrong_pass", "new_password": "NewPass1!"},
            headers=h(user_token),
            timeout=5,
        )
        r.check(
            "POST /me/change-password/ неверный текущий — 400",
            resp.status_code == 400,
            f"HTTP {resp.status_code}",
        )

        # POST /me/change-password/ слабый пароль (нет спецсимвола)
        resp = requests.post(
            f"{BASE}/me/change-password/",
            json={"current_password": PPASS, "new_password": "weakpassword1"},
            headers=h(user_token),
            timeout=5,
        )
        r.check(
            "POST /me/change-password/ слабый пароль — 400",
            resp.status_code == 400,
            f"HTTP {resp.status_code}",
        )

    if user_id:
        requests.delete(
            f"{BASE}/users/{user_id}/",
            json={"password": "admin_-1"},
            headers=h(owner_token),
            timeout=5,
        )

    return r.summary()
