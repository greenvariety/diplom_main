"""Тесты: Права доступа (owner / admin / teacher)"""
import requests
from ._base import BASE, login, h, Results


def _create_user(token, username, password, role):
    payload = {"username": username, "password": password, "display_name": username, "role": role}
    resp = requests.post(f"{BASE}/users/", json=payload, headers=h(token), timeout=5)
    return resp.json().get("id") if resp.status_code in (200, 201) else None


def run():
    r = Results()
    owner_token = login("admin", "admin_-1")
    if not owner_token:
        r.fail("Нет токена owner — пропуск тестов прав")
        return r.summary()

    admin_name = "autotest_admin_perm"
    teacher_name = "autotest_teacher_perm"
    admin_pass = "Passw0rd!"
    teacher_pass = "Passw0rd!"

    # Создаём пользователей
    admin_id = _create_user(owner_token, admin_name, admin_pass, "admin")
    teacher_id = _create_user(owner_token, teacher_name, teacher_pass, "teacher")

    admin_token = login(admin_name, admin_pass) if admin_id else None
    teacher_token = login(teacher_name, teacher_pass) if teacher_id else None

    r.check("Создание admin-пользователя", admin_id is not None, f"id={admin_id}")
    r.check("Создание teacher-пользователя", teacher_id is not None, f"id={teacher_id}")

    if admin_token:
        # Admin не должен видеть /audit-log/
        resp = requests.get(f"{BASE}/audit-log/", headers=h(admin_token), timeout=5)
        r.check("Admin: GET /audit-log/ — 403", resp.status_code == 403, f"HTTP {resp.status_code}")

        # Admin не должен видеть /users/
        resp = requests.get(f"{BASE}/users/", headers=h(admin_token), timeout=5)
        r.check("Admin: GET /users/ — 403", resp.status_code == 403, f"HTTP {resp.status_code}")

        # Admin может видеть студентов
        resp = requests.get(f"{BASE}/students/", headers=h(admin_token), timeout=5)
        r.check("Admin: GET /students/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    if teacher_token:
        # Teacher не может создавать студентов
        resp = requests.post(
            f"{BASE}/students/",
            json={
                "last_name": "Запрещено",
                "first_name": "Тест",
                "birth_date": "2000-01-01",
                "phone": "+70000000000",
                "email": "x@x.com",
            },
            headers=h(teacher_token),
            timeout=5,
        )
        r.check("Teacher: POST /students/ — 403", resp.status_code == 403, f"HTTP {resp.status_code}")

        # Teacher может просматривать студентов
        resp = requests.get(f"{BASE}/students/", headers=h(teacher_token), timeout=5)
        r.check("Teacher: GET /students/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # Owner: доступ к /users/ и /audit-log/
    resp = requests.get(f"{BASE}/users/", headers=h(owner_token), timeout=5)
    r.check("Owner: GET /users/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    resp = requests.get(f"{BASE}/audit-log/", headers=h(owner_token), timeout=5)
    r.check("Owner: GET /audit-log/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # Очистка пользователей
    for uid in [admin_id, teacher_id]:
        if uid:
            requests.delete(
                f"{BASE}/users/{uid}/",
                headers=h(owner_token),
                json={"password": "admin_-1"},
                timeout=5,
            )

    return r.summary()
