"""
Тест: уникальность логина и email у пользователей
Запуск: python tests/autotest_unique.py (сервер должен быть запущен)
"""
import requests
import time

BASE = "http://127.0.0.1:8000/api"
PASS = []
FAIL = []


def ok(name, detail=""):
    PASS.append(name)
    print(f"  [OK]   {name}" + (f" -- {detail}" if detail else ""))


def fail(name, detail=""):
    FAIL.append(name)
    print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))


def check(name, condition, detail=""):
    ok(name, detail) if condition else fail(name, detail)


def login(username, password):
    r = requests.post(f"{BASE}/auth/login/", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json().get("access")
    return None


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── 1. Нельзя зарегистрировать owner с уже занятым логином ──────────────────
def test_register_duplicate_login():
    print("\n[1] Регистрация с занятым логином")
    r = requests.post(f"{BASE}/auth/register/", json={
        "login": "greenvariety",     # уже существующий owner
        "name": "Тест Тест Тест",
        "email": "newemail_unique_test@example.com",
        "pass": "Test_pass1!",
    })
    check("Занятый логин → 400", r.status_code == 400, f"status={r.status_code}, body={r.text[:100]}")
    if r.status_code == 400:
        check("Сообщение об ошибке логина", 'field' in r.json() and r.json()['field'] == 'login',
              f"json={r.json()}")


# ── 2. Нельзя зарегистрировать owner с уже занятым email ────────────────────
def test_register_duplicate_email(owner_email):
    print("\n[2] Регистрация с занятым email")
    r = requests.post(f"{BASE}/auth/register/", json={
        "login": "totally_unique_login_xyz_999",
        "name": "Тест Тест Тест",
        "email": owner_email,        # email уже существующего owner
        "pass": "Test_pass1!",
    })
    check("Занятый email → 400", r.status_code == 400, f"status={r.status_code}, body={r.text[:100]}")
    if r.status_code == 400:
        check("Сообщение об ошибке email", 'field' in r.json() and r.json()['field'] == 'email',
              f"json={r.json()}")


# ── 3. Нельзя создать admin/teacher с уже занятым логином ───────────────────
def test_create_user_duplicate_login(token):
    print("\n[3] Создание сотрудника-пользователя с занятым логином")
    h = auth_headers(token)
    r = requests.post(f"{BASE}/users/", headers=h, json={
        "username": "greenvariety",  # занятый логин
        "role": "teacher",
        "password": "Test_pass1!",
    })
    check("Создание с занятым логином → 400", r.status_code == 400,
          f"status={r.status_code}, body={r.text[:100]}")
    if r.status_code == 400:
        check("Текст об ошибке логина", 'логин' in r.json().get('error', '').lower() or 'логин' in r.json().get('error', ''),
              f"error={r.json().get('error')}")


# ── 4. Нельзя создать двух пользователей с одинаковым логином ───────────────
def test_create_user_then_duplicate(token):
    print("\n[4] Создание двух пользователей с одним логином")
    h = auth_headers(token)
    unique_login = f"testuser_auto_{int(time.time())}"

    # Создаём первого
    r1 = requests.post(f"{BASE}/users/", headers=h, json={
        "username": unique_login,
        "role": "teacher",
        "password": "Test_pass1!",
    })
    check("Первый пользователь создан", r1.status_code == 201, f"status={r1.status_code}, body={r1.text[:100]}")

    if r1.status_code != 201:
        return None

    user_id = r1.json()['id']

    # Пытаемся создать второго с тем же логином
    r2 = requests.post(f"{BASE}/users/", headers=h, json={
        "username": unique_login,
        "role": "admin",
        "password": "Test_pass1!",
    })
    check("Дубликат логина → 400", r2.status_code == 400, f"status={r2.status_code}, body={r2.text[:100]}")

    return user_id


# ── 5. Нельзя сменить свой логин на уже занятый ─────────────────────────────
def test_profile_update_duplicate_login(token):
    print("\n[5] Смена логина профиля на уже занятый")
    h = auth_headers(token)
    # Сначала создаём второго пользователя
    unique_login = f"temp_user_{int(time.time())}"
    r = requests.post(f"{BASE}/users/", headers=h, json={
        "username": unique_login,
        "role": "teacher",
        "password": "Test_pass1!",
    })
    if r.status_code != 201:
        fail("Не удалось создать пользователя для теста", r.text[:80])
        return None

    uid = r.json()['id']

    # Пытаемся сменить логин owner на логин только что созданного пользователя
    r2 = requests.patch(f"{BASE}/profile/update/", headers=h, json={
        "username": unique_login,
    })
    check("Смена логина на занятый → 400", r2.status_code == 400,
          f"status={r2.status_code}, body={r2.text[:100]}")
    if r2.status_code == 400:
        check("Поле ошибки = username", r2.json().get('field') == 'username',
              f"field={r2.json().get('field')}")

    return uid


# ── 6. CheckAvailability: логин и email ─────────────────────────────────────
def test_check_availability(owner_email):
    print("\n[6] API check_availability")
    # Занятый логин
    r = requests.post(f"{BASE}/auth/check-availability/", json={"field": "login", "value": "greenvariety"})
    check("CheckAvailability: занятый логин → taken=true",
          r.status_code == 200 and r.json().get('taken') is True,
          f"json={r.json()}")

    # Свободный логин
    r = requests.post(f"{BASE}/auth/check-availability/", json={"field": "login", "value": "totally_free_login_zzz_12345"})
    check("CheckAvailability: свободный логин → taken=false",
          r.status_code == 200 and r.json().get('taken') is False,
          f"json={r.json()}")

    # Занятый email
    r = requests.post(f"{BASE}/auth/check-availability/", json={"field": "email", "value": owner_email})
    check("CheckAvailability: занятый email → taken=true",
          r.status_code == 200 and r.json().get('taken') is True,
          f"json={r.json()}")

    # Свободный email
    r = requests.post(f"{BASE}/auth/check-availability/", json={"field": "email", "value": "totally_free@example.xyz"})
    check("CheckAvailability: свободный email → taken=false",
          r.status_code == 200 and r.json().get('taken') is False,
          f"json={r.json()}")


# ── 7. Нельзя начать смену email на уже занятый ─────────────────────────────
def test_change_email_to_existing(token, owner_email):
    print("\n[7] Смена email на уже привязанный")
    # Создадим второго owner вручную через БД не получится через API,
    # но мы можем попробовать отправить сам email owner на себя (должно быть «совпадает с текущим»)
    h = auth_headers(token)
    r = requests.post(f"{BASE}/profile/change-email/", headers=h, json={"new_email": owner_email})
    # Либо "совпадает с текущим" либо "уже зарегистрирован" — в любом случае 400
    check("Смена email на текущий свой → 400", r.status_code == 400,
          f"status={r.status_code}, body={r.text[:100]}")


# ── 8. Логин admin/teacher не пересекается с owner ──────────────────────────
def test_admin_login_unique_across_roles(token):
    print("\n[8] Логин admin/teacher не совпадает с owner")
    h = auth_headers(token)
    # Пытаемся создать пользователя с логином owner'а
    r = requests.post(f"{BASE}/users/", headers=h, json={
        "username": "greenvariety",
        "role": "admin",
        "password": "Test_pass1!",
    })
    check("Admin с логином owner → 400", r.status_code == 400,
          f"status={r.status_code}, body={r.text[:100]}")


# ── Очистка: удаляем созданных тестовых пользователей ───────────────────────
def cleanup(token, user_ids):
    if not user_ids:
        return
    h = auth_headers(token)
    for uid in user_ids:
        if uid:
            requests.delete(f"{BASE}/users/{uid}/", headers=h)


# ── Запуск ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Входим как greenvariety...")
    token = login("greenvariety", "Test_pass1!")
    if not token:
        print("[ERROR] Не удалось войти — проверь, что сервер запущен")
        raise SystemExit(1)

    # Получаем текущий email owner
    r = requests.get(f"{BASE}/profile/", headers=auth_headers(token))
    owner_email = ""
    if r.status_code == 200:
        owner_email = r.json().get("email", "")
        print(f"Owner email: {owner_email}")
    else:
        print(f"[WARN] Не удалось получить профиль: {r.status_code} {r.text[:80]}")

    created_ids = []

    test_register_duplicate_login()
    if owner_email:
        test_register_duplicate_email(owner_email)
    else:
        print("\n[2] ПРОПУЩЕН — email owner не известен")

    test_create_user_duplicate_login(token)

    uid4 = test_create_user_then_duplicate(token)
    created_ids.append(uid4)

    uid5 = test_profile_update_duplicate_login(token)
    created_ids.append(uid5)

    if owner_email:
        test_check_availability(owner_email)
    else:
        print("\n[6] ПРОПУЩЕН — email owner не известен")

    if owner_email:
        test_change_email_to_existing(token, owner_email)
    else:
        print("\n[7] ПРОПУЩЕН — email owner не известен")

    test_admin_login_unique_across_roles(token)

    cleanup(token, created_ids)

    print(f"\n{'='*45}")
    print(f"PASS: {len(PASS)}  FAIL: {len(FAIL)}")
    if FAIL:
        print("Провалены:")
        for f in FAIL:
            print(f"  - {f}")
    print('='*45)
