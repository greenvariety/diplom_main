# testing.md — Правила автотестов

## Концепция

Автотесты — это **временные Python-скрипты**, которые обращаются к REST API напрямую через `requests`.  
Никакого Playwright и браузера — только HTTP-запросы к `http://127.0.0.1:8000/api/`.

**Цикл работы:**
1. Пишу скрипт `tests/autotest_<тема>.py`
2. Запускаю его через Bash
3. Читаю вывод (PASS/FAIL по каждой проверке)
4. Удаляю скрипт после анализа

Скрипты временные — после использования удалять обязательно.

---

## Структура скрипта

```python
"""
Тест: <что проверяется>
Запуск: python tests/autotest_<тема>.py (сервер должен быть запущен)
"""
import requests

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


# ── вспомогательные функции ──────────────────────────────────────────────────

def login(username, password):
    """Возвращает access-токен или None."""
    r = requests.post(f"{BASE}/auth/login/", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json().get("access")
    return None

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── тесты ────────────────────────────────────────────────────────────────────

def test_something(token):
    h = auth_headers(token)
    r = requests.get(f"{BASE}/some-endpoint/", headers=h)
    check("Название проверки", r.status_code == 200, f"status={r.status_code}")


# ── запуск ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    token = login("greenvariety", "Test_pass1!")
    if not token:
        print("[ERROR] Не удалось войти — проверь, что сервер запущен")
        raise SystemExit(1)

    test_something(token)

    print(f"\n{'='*40}")
    print(f"PASS: {len(PASS)}  FAIL: {len(FAIL)}")
    if FAIL:
        print("Провалены:")
        for f in FAIL:
            print(f"  - {f}")
    print('='*40)
```

---

## Правила написания

### Что тестировать через requests (предпочтительно)
- Статус-коды ответов (`200`, `400`, `403`, `404`)
- Тело ответа — наличие полей, значения
- Валидацию на сервере — передать невалидные данные, ожидать `400`
- Права доступа — запрос без токена → `401`, с чужим токеном → `403`/`404`
- Создание / изменение / удаление записей через API

### Когда и только тогда использовать Playwright
Только если нужно проверить **логику на фронтенде**, которая не видна через API:
- Валидация прямо в форме (до отправки на сервер)
- Отображение ошибок в UI
- Поведение кнопок/модалок

Если Playwright нужен — использовать стиль как в `tests/test_features.py`.

---

## Именование файлов

| Тема | Имя файла |
|------|-----------|
| Авторизация | `autotest_auth.py` |
| Факультеты | `autotest_faculties.py` |
| Студенты | `autotest_students.py` |
| Сотрудники | `autotest_employees.py` |
| Группы | `autotest_groups.py` |
| Документы | `autotest_documents.py` |
| Права доступа | `autotest_permissions.py` |
| Родители | `autotest_parents.py` |

---

## Тестовый пользователь

Логин: `greenvariety` / пароль: `Test_pass1!`  
Роль: `owner` (есть своё учреждение, факультеты, студенты)

Если нужны данные об учреждении — сначала сделать `GET /api/institutions/` с токеном owner'а.

---

## После запуска

1. Прочитать вывод — посмотреть на PASS/FAIL
2. Если есть FAIL — разобраться почему, исправить код или баг
3. **Удалить** скрипт `tests/autotest_*.py` после анализа
4. Скриншоты (`tests/screenshots/`) не создавать, если используется requests-подход

---

## Связанные документы

- [patterns.md](patterns.md) — структура API-эндпоинтов
- [business-rules.md](business-rules.md) — что какая роль может делать
- [database.md](database.md) — поля моделей (что ожидать в ответе)
