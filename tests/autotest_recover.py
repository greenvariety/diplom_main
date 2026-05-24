"""
Тест: восстановление пароля - rate limit, cooldown, запрет старого пароля
Запуск: python tests/autotest_recover.py (сервер должен быть запущен)
"""
import subprocess
import requests

BASE   = "http://127.0.0.1:8000/api"
PYTHON = r"venv\Scripts\python.exe"
CWD    = r"C:\Диплом\Программа"

PASS_LIST = []
FAIL_LIST = []

TEST_LOGIN = "autotest_recover_tmp"
TEST_EMAIL = "autotest_recover@test.local"
OLD_PASS   = "OldPass1!"
NEW_PASS   = "NewPass2@"


def ok(name, detail=""):
    PASS_LIST.append(name)
    print(f"  [OK]   {name}" + (f" -- {detail}" if detail else ""))

def fail(name, detail=""):
    FAIL_LIST.append(name)
    print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))

def check(name, condition, detail=""):
    ok(name, detail) if condition else fail(name, detail)

def shell(code):
    r = subprocess.run(
        [PYTHON, "manage.py", "shell", "-c", code],
        capture_output=True, text=True, encoding="utf-8", cwd=CWD
    )
    return r.stdout.strip()

def reset_code(code_str="CODE01", attempts=0):
    """Создаёт свежий код с известным значением."""
    shell(
        f"from core.models import EmailCode\n"
        f"from django.utils import timezone\n"
        f"from datetime import timedelta\n"
        f"EmailCode.objects.filter(login='{TEST_LOGIN}', purpose='recover').delete()\n"
        f"EmailCode.objects.create(\n"
        f"  email='{TEST_EMAIL}', login='{TEST_LOGIN}', code='{code_str}',\n"
        f"  purpose='recover', attempts={attempts},\n"
        f"  expires_at=timezone.now()+timedelta(minutes=10))"
    )

def recover(code, new_pw=NEW_PASS):
    return requests.post(f"{BASE}/auth/recover/", json={
        "login": TEST_LOGIN, "code": code, "new_password": new_pw
    })


# ── Setup ─────────────────────────────────────────────────────────────────────
print("\nSetup: создаём тестового пользователя...")
shell(
    f"from core.models import User, EmailCode\n"
    f"EmailCode.objects.filter(login='{TEST_LOGIN}').delete()\n"
    f"User.objects.filter(username='{TEST_LOGIN}').delete()\n"
    f"u = User(username='{TEST_LOGIN}', email='{TEST_EMAIL}', role='owner')\n"
    f"u.set_password('{OLD_PASS}')\n"
    f"u.save()"
)

# ── 1. Запрос кода через API ──────────────────────────────────────────────────
print("\n[1] Запрос кода восстановления через API")
r = requests.post(f"{BASE}/auth/recover/send-code/", json={"login": TEST_LOGIN})
check("SendCode -> 200", r.status_code == 200, f"status={r.status_code} {r.text[:80]}")
check("SendCode -> masked_email", bool(r.json().get("masked_email")), str(r.json()))

# ── 2. Cooldown 60 сек. между кодами ─────────────────────────────────────────
print("\n[2] Cooldown между повторными кодами")
r = requests.post(f"{BASE}/auth/recover/send-code/", json={"login": TEST_LOGIN})
check("Повторный запрос до cooldown -> 429", r.status_code == 429, f"{r.text[:80]}")
check("-> retry_after в ответе", "retry_after" in r.json(), str(r.json()))

# ── 3. Счётчик попыток: 5 неверных -> код мёртв ───────────────────────────────
print("\n[3] Счётчик попыток: 5 неверных -> код мёртв")
reset_code("TESTCD")

for i in range(1, 6):
    r = recover("WRONG1")
    check(f"Попытка {i}/5 -> 400 Неверный код",
          r.status_code == 400 and "Неверный" in r.json().get("error", ""),
          r.text[:60])

# 6-й вызов: attempts уже 5 -> "Превышено число попыток"
r = recover("WRONG1")
check("6-й вызов (wrong) -> 400 Превышено + need_resend",
      r.status_code == 400 and r.json().get("need_resend") is True,
      r.text[:80])
check("-> текст 'Превышено'", "Превышено" in r.json().get("error", ""), r.text[:80])

# Даже правильный код после exhausted -> 400
r = recover("TESTCD")
check("Правильный код после exhausted -> 400",
      r.status_code == 400 and "Превышено" in r.json().get("error", ""),
      r.text[:80])

# ── 4. Последний код из 5 + 5-я неверная -> 429 ──────────────────────────────
print("\n[4] Последний (5-й) код + 5-я неверная попытка -> 429")
# 4 кода в 15-мин окне + 1 активный (5-й)
shell(
    f"from core.models import EmailCode, User\n"
    f"from django.utils import timezone\n"
    f"from datetime import timedelta\n"
    f"u = User.objects.get(username='{TEST_LOGIN}')\n"
    f"EmailCode.objects.filter(login='{TEST_LOGIN}', purpose='recover').delete()\n"
    f"for i in range(4):\n"
    f"    EmailCode.objects.create(email=u.email, login='{TEST_LOGIN}',\n"
    f"        code='OLD00'+str(i), purpose='recover', used=True,\n"
    f"        expires_at=timezone.now()+timedelta(minutes=10))\n"
    f"EmailCode.objects.create(email=u.email, login='{TEST_LOGIN}',\n"
    f"    code='LAST01', purpose='recover', attempts=4,\n"
    f"    expires_at=timezone.now()+timedelta(minutes=10))"
)
r = recover("WRONG1")
check("Последний код, 5-я попытка -> 429",
      r.status_code == 429, f"status={r.status_code} {r.text[:80]}")
check("-> 'Запросы истекли'", "истекли" in r.json().get("error", ""), str(r.json()))

# ── 5. Исчерпание 5 кодов -> SendCode отдаёт 429 ─────────────────────────────
print("\n[5] 5 кодов исчерпано -> SendCode 429")
shell(
    f"from core.models import EmailCode, User\n"
    f"from django.utils import timezone\n"
    f"from datetime import timedelta\n"
    f"u = User.objects.get(username='{TEST_LOGIN}')\n"
    f"EmailCode.objects.filter(login='{TEST_LOGIN}', purpose='recover').delete()\n"
    f"for i in range(5):\n"
    f"    EmailCode.objects.create(email=u.email, login='{TEST_LOGIN}',\n"
    f"        code='TST0'+str(i), purpose='recover',\n"
    f"        expires_at=timezone.now()+timedelta(minutes=10))"
)
# Сбрасываем password_changed_at чтобы не мешало
shell(
    f"from core.models import User\n"
    f"u = User.objects.get(username='{TEST_LOGIN}')\n"
    f"u.password_changed_at = None\n"
    f"u.save()"
)
r = requests.post(f"{BASE}/auth/recover/send-code/", json={"login": TEST_LOGIN})
check("5 кодов -> SendCode 429", r.status_code == 429, f"{r.status_code} {r.text[:80]}")
check("-> 'Запросы истекли'", "истекли" in r.json().get("error", ""), str(r.json()))

# ── 6. Запрет старого пароля ──────────────────────────────────────────────────
print("\n[6] Запрет старого пароля")
reset_code("MYCODE")
r = recover("MYCODE", new_pw=OLD_PASS)
check("Старый пароль -> 400", r.status_code == 400, r.text[:80])
check("-> 'совпадает со старым'", "совпадает" in r.json().get("error", ""), str(r.json()))

# ── 7. Успешная смена пароля ──────────────────────────────────────────────────
print("\n[7] Успешная смена пароля")
reset_code("MYCODE")
r = recover("MYCODE", new_pw=NEW_PASS)
check("Смена -> 200 + access token", r.status_code == 200 and "access" in r.json(), r.text[:80])

r_new = requests.post(f"{BASE}/auth/login/", json={"username": TEST_LOGIN, "password": NEW_PASS})
check("Вход с новым паролем -> 200", r_new.status_code == 200, f"status={r_new.status_code}")

r_old = requests.post(f"{BASE}/auth/login/", json={"username": TEST_LOGIN, "password": OLD_PASS})
check("Вход со старым паролем -> 400", r_old.status_code == 400, f"status={r_old.status_code}")

# ── 8. Cooldown 10 мин после смены ───────────────────────────────────────────
print("\n[8] Cooldown 10 мин после смены пароля")
r = requests.post(f"{BASE}/auth/recover/send-code/", json={"login": TEST_LOGIN})
check("Сразу после смены -> 429", r.status_code == 429, f"{r.status_code} {r.text[:80]}")
check("-> recently_changed=true", r.json().get("recently_changed") is True, str(r.json()))
check("-> текст 'недавно сменили'", "недавно" in r.json().get("error", ""), str(r.json()))

# Проверяем: после 10 мин cooldown снимается
shell(
    f"from core.models import User\n"
    f"from django.utils import timezone\n"
    f"from datetime import timedelta\n"
    f"u = User.objects.get(username='{TEST_LOGIN}')\n"
    f"u.password_changed_at = timezone.now() - timedelta(minutes=11)\n"
    f"u.save()"
)
shell(
    f"from core.models import EmailCode\n"
    f"from django.utils import timezone\n"
    f"from datetime import timedelta\n"
    f"EmailCode.objects.filter(login='{TEST_LOGIN}', purpose='recover').update(\n"
    f"    created_at=timezone.now()-timedelta(minutes=20))"
)
r = requests.post(f"{BASE}/auth/recover/send-code/", json={"login": TEST_LOGIN})
check("После 10 мин cooldown -> 200", r.status_code == 200, f"{r.status_code} {r.text[:80]}")

# ── Cleanup ───────────────────────────────────────────────────────────────────
print("\nCleanup...")
shell(
    f"from core.models import User, EmailCode\n"
    f"EmailCode.objects.filter(login='{TEST_LOGIN}').delete()\n"
    f"User.objects.filter(username='{TEST_LOGIN}').delete()"
)

# ── Итог ──────────────────────────────────────────────────────────────────────
print(f"\n{'='*45}")
print(f"PASS: {len(PASS_LIST)}  FAIL: {len(FAIL_LIST)}")
if FAIL_LIST:
    print("Провалены:")
    for f in FAIL_LIST:
        print(f"  - {f}")
print('='*45)
