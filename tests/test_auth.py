"""
Playwright-тесты для проверки экранов авторизации АИСК.
Запуск: python tests/test_auth.py
Требует: pip install playwright && playwright install chromium
Сервер должен быть запущен: python manage.py runserver
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://127.0.0.1:8000"
SHOTS_DIR = Path(__file__).parent / "screenshots"
SHOTS_DIR.mkdir(exist_ok=True)

PAUSE = 0.6   # секунд между действиями — увеличь до 1.5 если хочешь смотреть медленнее
SLOW_MO = 120  # мс задержки между нажатиями клавиш


# ── утилиты ────────────────────────────────────────────────────────────────

results: list[dict] = []


def shot(page, name: str):
    path = SHOTS_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    return str(path)


def ok(name: str, detail: str = ""):
    results.append({"status": "PASS", "name": name, "detail": detail})
    suffix = f" -- {detail}" if detail else ""
    print(f"  [OK] {name}{suffix}")


def fail(name: str, detail: str = ""):
    results.append({"status": "FAIL", "name": name, "detail": detail})
    suffix = f" -- {detail}" if detail else ""
    print(f"  [FAIL] {name}{suffix}")


def check(page, test_name: str, selector: str, expected_text: str, shot_name: str):
    """Проверяет что элемент виден и содержит нужный текст. Делает скриншот."""
    time.sleep(PAUSE)
    shot(page, shot_name)
    try:
        el = page.locator(selector).first
        el.wait_for(state="visible", timeout=4000)
        text = el.inner_text()
        if expected_text.lower() in text.lower():
            ok(test_name, f'"{text}"')
        else:
            fail(test_name, f'Ожидал: "{expected_text}", получил: "{text}"')
    except Exception as e:
        fail(test_name, str(e))


# ── навигация ───────────────────────────────────────────────────────────────

def go_to_login(page):
    """Открывает главную страницу — экран логина."""
    page.goto(BASE_URL)
    page.wait_for_selector("form.login-form", timeout=8000)
    time.sleep(0.3)


def go_to_register(page):
    """Переходит на экран регистрации."""
    go_to_login(page)
    page.locator("a", has_text="Зарегистрироваться").click()
    page.wait_for_selector("text=Создание аккаунта владельца", timeout=5000)
    time.sleep(0.3)


def go_to_recover(page):
    """Переходит на экран восстановления пароля."""
    go_to_login(page)
    page.locator("a", has_text="Забыли пароль?").click()
    page.wait_for_selector("text=Восстановление пароля", timeout=5000)
    time.sleep(0.3)


# ══════════════════════════════════════════════════════════════════════════════
#  БЛОК 1 — ЛОГИН
# ══════════════════════════════════════════════════════════════════════════════

def test_login_empty_submit(page):
    print("\n[Логин] Пустая отправка формы")
    go_to_login(page)
    page.locator("button.login-btn").click()
    time.sleep(PAUSE)
    shot(page, "login_01_empty_submit")
    try:
        page.wait_for_selector("text=Введите логин", timeout=4000)
        ok("Пустой логин → ошибка 'Введите логин'")
    except Exception:
        fail("Пустой логин → ошибка 'Введите логин'", "Сообщение не появилось")


def test_login_cyrillic_blocked(page):
    print("\n[Логин] Кириллица фильтруется в поле логина")
    go_to_login(page)
    login_input = page.locator("form.login-form input[maxlength='150']").first
    # Вставляем через fill() — проверяем фильтрацию в onChange (более реалистично)
    login_input.fill("Привет123")
    page.keyboard.press("Tab")
    time.sleep(PAUSE)
    shot(page, "login_02_cyrillic_blocked")
    val = login_input.input_value()
    if not any(c in val for c in "ПриветАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"):
        ok("Кириллица в логине фильтруется через onChange", f'Результат: "{val}"')
    else:
        fail("Кириллица в логине НЕ фильтруется", f'В поле: "{val}"')


def test_login_wrong_credentials(page):
    print("\n[Логин] Неверные данные — ошибка от сервера")
    go_to_login(page)
    # логин
    page.locator("form.login-form input[maxlength='150']").first.fill("nonexistent_user_xyz")
    # пароль — PasswordInput скрыт за оберткой, ищем по type=password или по порядку
    page.locator("form.login-form input[type='password']").first.fill("WrongPass!1")
    page.locator("button.login-btn").click()
    check(page, "Неверный логин/пароль → ошибка сервера",
          ".field-error", "Неверный логин или пароль", "login_03_wrong_creds")


def test_login_navigate_to_register(page):
    print("\n[Логин] Переход на регистрацию")
    go_to_login(page)
    page.locator("a", has_text="Зарегистрироваться").click()
    time.sleep(PAUSE)
    shot(page, "login_04_to_register")
    try:
        page.wait_for_selector("text=Создание аккаунта владельца", timeout=4000)
        ok("Ссылка 'Зарегистрироваться' открывает форму регистрации")
    except Exception as e:
        fail("Ссылка 'Зарегистрироваться' открывает форму регистрации", str(e))


def test_login_navigate_to_recover(page):
    print("\n[Логин] Переход на восстановление пароля")
    go_to_login(page)
    page.locator("a", has_text="Забыли пароль?").click()
    time.sleep(PAUSE)
    shot(page, "login_05_to_recover")
    try:
        page.wait_for_selector("text=Восстановление пароля", timeout=4000)
        ok("Ссылка 'Забыли пароль?' открывает форму восстановления")
    except Exception as e:
        fail("Ссылка 'Забыли пароль?' открывает форму восстановления", str(e))


# ══════════════════════════════════════════════════════════════════════════════
#  БЛОК 2 — РЕГИСТРАЦИЯ
# ══════════════════════════════════════════════════════════════════════════════

def _get_reg_fields(page):
    """Возвращает поля формы регистрации по порядку."""
    inputs = page.locator(".card input[class*='input']")
    return inputs


def test_register_empty_submit(page):
    print("\n[Регистрация] Пустая отправка → все ошибки")
    go_to_register(page)
    page.locator("button", has_text="Далее").click()
    time.sleep(PAUSE)
    shot(page, "reg_01_empty_submit")
    errors = page.locator(".field-error, .is-error").all()
    if len(errors) >= 3:
        ok(f"Пустая отправка → {len(errors)} ошибки валидации")
    else:
        fail("Пустая отправка → ошибки валидации", f"Найдено только {len(errors)} ошибок")


def test_register_login_too_short(page):
    print("\n[Регистрация] Логин < 3 символов")
    go_to_register(page)
    login_input = page.locator(".card input.input").first
    login_input.fill("ab")
    login_input.blur()
    time.sleep(PAUSE)
    shot(page, "reg_02_login_too_short")
    try:
        page.wait_for_selector("text=Минимум 3 символа", timeout=3000)
        ok("Логин < 3 символов → 'Минимум 3 символа'")
    except Exception:
        fail("Логин < 3 символов → 'Минимум 3 символа'", "Сообщение не появилось")


def test_register_login_cyrillic_filtered(page):
    print("\n[Регистрация] Кириллица в логине фильтруется")
    go_to_register(page)
    login_input = page.locator(".card input.input").first
    login_input.type("Тест123")
    time.sleep(PAUSE)
    shot(page, "reg_03_login_cyrillic")
    val = login_input.input_value()
    if val == "123" or not any(c in val for c in "ТестАБВ"):
        ok("Кириллица в логине фильтруется", f'Осталось: "{val}"')
    else:
        fail("Кириллица в логине фильтруется", f'В поле: "{val}"')


def test_register_name_not_3_words(page):
    print("\n[Регистрация] ФИО — не 3 слова")
    go_to_register(page)
    inputs = page.locator(".card input.input").all()
    # Второй input — поле ФИО
    if len(inputs) >= 2:
        inputs[1].fill("Иванов Иван")
        inputs[1].blur()
    time.sleep(PAUSE)
    shot(page, "reg_04_name_2words")
    try:
        page.wait_for_selector("text=3 слова", timeout=3000)
        ok("ФИО из 2 слов → ошибка '3 слова'")
    except Exception:
        fail("ФИО из 2 слов → ошибка '3 слова'", "Сообщение не появилось")


def test_register_name_latin_filtered(page):
    print("\n[Регистрация] Латиница в ФИО фильтруется")
    go_to_register(page)
    inputs = page.locator(".card input.input").all()
    if len(inputs) >= 2:
        inputs[1].type("Ivan Ivanov Test")
    time.sleep(PAUSE)
    shot(page, "reg_05_name_latin")
    val = inputs[1].input_value() if len(inputs) >= 2 else ""
    if not any(c in val for c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"):
        ok("Латиница в ФИО фильтруется", f'Осталось: "{val}"')
    else:
        fail("Латиница в ФИО фильтруется", f'В поле: "{val}"')


def test_register_invalid_email(page):
    print("\n[Регистрация] Некорректный email")
    go_to_register(page)
    email_input = page.locator(".card input[type='email']").first
    email_input.fill("notanemail")
    email_input.blur()
    time.sleep(PAUSE)
    shot(page, "reg_06_bad_email")
    try:
        page.wait_for_selector("text=Некорректный email", timeout=3000)
        ok("Некорректный email → ошибка валидации")
    except Exception:
        fail("Некорректный email → ошибка валидации", "Сообщение не появилось")


def test_register_password_too_short(page):
    print("\n[Регистрация] Пароль слишком короткий")
    go_to_register(page)
    pw_inputs = page.locator(".card input[type='password']").all()
    if pw_inputs:
        pw_inputs[0].fill("abc")
        pw_inputs[0].blur()
    time.sleep(PAUSE)
    shot(page, "reg_07_pw_short")
    try:
        page.wait_for_selector("text=Минимум 8 символов", timeout=3000)
        ok("Пароль < 8 символов → 'Минимум 8 символов'")
    except Exception:
        fail("Пароль < 8 символов → 'Минимум 8 символов'", "Сообщение не появилось")


def test_register_password_no_digit(page):
    print("\n[Регистрация] Пароль без цифры")
    go_to_register(page)
    pw_inputs = page.locator(".card input[type='password']").all()
    if pw_inputs:
        pw_inputs[0].fill("Password!")
        pw_inputs[0].blur()
    time.sleep(PAUSE)
    shot(page, "reg_08_pw_no_digit")
    # PasswordRules показывает "Минимум 1 цифра" с классом bad
    try:
        page.wait_for_selector(".pw-rule.bad:has-text('цифра')", timeout=3000)
        ok("Пароль без цифры → правило 'Минимум 1 цифра' горит красным")
    except Exception:
        fail("Пароль без цифры → правило должно быть bad", "Класс .pw-rule.bad не найден")


def test_register_password_no_special(page):
    print("\n[Регистрация] Пароль без спецсимвола")
    go_to_register(page)
    pw_inputs = page.locator(".card input[type='password']").all()
    if pw_inputs:
        pw_inputs[0].fill("Password1")
        pw_inputs[0].blur()
    time.sleep(PAUSE)
    shot(page, "reg_09_pw_no_special")
    try:
        page.wait_for_selector("text=спецсимвол", timeout=3000)
        ok("Пароль без спецсимвола → ошибка")
    except Exception:
        fail("Пароль без спецсимвола → ошибка", "Сообщение не появилось")


def test_register_passwords_mismatch(page):
    print("\n[Регистрация] Пароли не совпадают")
    go_to_register(page)
    pw_inputs = page.locator(".card input[type='password']").all()
    if len(pw_inputs) >= 2:
        pw_inputs[0].fill("ValidPass1!")
        pw_inputs[1].fill("DifferentPass2!")
        pw_inputs[1].blur()
    time.sleep(PAUSE)
    shot(page, "reg_10_pw_mismatch")
    try:
        page.wait_for_selector("text=Пароли не совпадают", timeout=3000)
        ok("Пароли не совпадают → ошибка")
    except Exception:
        fail("Пароли не совпадают → ошибка", "Сообщение не появилось")


def test_register_no_agreement(page):
    print("\n[Регистрация] Отправка без согласия с соглашением")
    go_to_register(page)
    # Заполняем все поля корректно
    inputs = page.locator(".card input.input").all()
    email_input = page.locator(".card input[type='email']").first
    pw_inputs = page.locator(".card input[type='password']").all()

    if len(inputs) >= 2:
        inputs[0].fill("testlogin99")
        inputs[1].fill("Иванов Иван Иванович")
    email_input.fill("test99@example.com")
    if len(pw_inputs) >= 2:
        pw_inputs[0].fill("SecurePass1!")
        pw_inputs[1].fill("SecurePass1!")

    # Убеждаемся что чекбокс не отмечен
    checkbox = page.locator("input[type='checkbox']").last
    if checkbox.is_checked():
        checkbox.uncheck()

    page.locator("button", has_text="Далее").click()
    time.sleep(PAUSE)
    shot(page, "reg_11_no_agreement")
    try:
        page.wait_for_selector("text=Необходимо принять соглашение", timeout=3000)
        ok("Отправка без соглашения → ошибка")
    except Exception:
        fail("Отправка без соглашения → ошибка", "Сообщение не появилось")


def test_register_terms_page(page):
    print("\n[Регистрация] Открытие пользовательского соглашения")
    go_to_register(page)
    page.locator("a", has_text="пользовательским соглашением").click()
    time.sleep(PAUSE)
    shot(page, "reg_12_terms")
    try:
        page.wait_for_selector("text=Пользовательское соглашение", timeout=3000)
        ok("Ссылка на соглашение открывает страницу соглашения")
    except Exception as e:
        fail("Ссылка на соглашение открывает страницу соглашения", str(e))
    # Вернуться назад
    page.locator("button", has_text="Вернуться к регистрации").click()
    time.sleep(0.3)


# ══════════════════════════════════════════════════════════════════════════════
#  БЛОК 3 — ВОССТАНОВЛЕНИЕ ПАРОЛЯ
# ══════════════════════════════════════════════════════════════════════════════

def test_recover_empty_login(page):
    print("\n[Восстановление] Пустой логин")
    go_to_recover(page)
    page.locator("button", has_text="Получить код").click()
    time.sleep(PAUSE)
    shot(page, "recover_01_empty_login")
    try:
        page.wait_for_selector("text=Введите логин", timeout=3000)
        ok("Пустой логин при восстановлении → 'Введите логин'")
    except Exception:
        fail("Пустой логин при восстановлении → 'Введите логин'", "Сообщение не появилось")


def test_recover_nonexistent_user(page):
    print("\n[Восстановление] Несуществующий пользователь")
    go_to_recover(page)
    page.locator(".card input.input").first.fill("nonexistent_xyz_user_99")
    page.locator("button", has_text="Получить код").click()
    time.sleep(PAUSE * 2)  # ждём ответ сервера
    shot(page, "recover_02_nonexistent")
    try:
        page.wait_for_selector("text=не найден", timeout=4000)
        ok("Несуществующий пользователь → 'Пользователь не найден'")
    except Exception:
        fail("Несуществующий пользователь → 'Пользователь не найден'", "Сообщение не появилось")


def test_recover_back_to_login(page):
    print("\n[Восстановление] Кнопка 'Войти' возвращает на логин")
    go_to_recover(page)
    page.locator("button", has_text="Войти").click()
    time.sleep(PAUSE)
    shot(page, "recover_03_back")
    try:
        page.wait_for_selector("form.login-form", timeout=3000)
        ok("Кнопка 'Войти' возвращает на экран входа")
    except Exception as e:
        fail("Кнопка 'Войти' возвращает на экран входа", str(e))


# ══════════════════════════════════════════════════════════════════════════════
#  БЛОК 4 — ОБЩИЕ UX-ПРОВЕРКИ
# ══════════════════════════════════════════════════════════════════════════════

def test_page_loads(page):
    print("\n[Общее] Страница загружается")
    go_to_login(page)
    shot(page, "ux_01_page_load")
    try:
        page.wait_for_selector("text=АИСК", timeout=3000)
        ok("Главная страница загружается, виден бренд АИСК")
    except Exception as e:
        fail("Главная страница загружается", str(e))


def test_no_placeholders(page):
    print("\n[Общее] Нет placeholder в полях ввода")
    go_to_login(page)
    inputs = page.locator("input").all()
    bad = [i.get_attribute("placeholder") for i in inputs if i.get_attribute("placeholder")]
    if not bad:
        ok("Нет атрибута placeholder ни на одном input (логин)")
    else:
        fail("Нет placeholder", f"Найдены placeholder: {bad}")

    go_to_register(page)
    inputs = page.locator("input").all()
    bad = [i.get_attribute("placeholder") for i in inputs if i.get_attribute("placeholder")]
    if not bad:
        ok("Нет атрибута placeholder ни на одном input (регистрация)")
    else:
        fail("Нет placeholder (регистрация)", f"Найдены: {bad}")


def test_login_max_length(page):
    print("\n[Общее] maxLength на поле логина")
    go_to_login(page)
    login_input = page.locator("form.login-form input[maxlength='150']").first
    ml = login_input.get_attribute("maxlength")
    if ml:
        ok(f"Поле логина имеет maxLength={ml}")
    else:
        fail("Поле логина должно иметь maxLength")


# ══════════════════════════════════════════════════════════════════════════════
#  ЗАПУСК
# ══════════════════════════════════════════════════════════════════════════════

ALL_TESTS = [
    # UX-базовые
    test_page_loads,
    test_no_placeholders,
    test_login_max_length,
    # Логин
    test_login_empty_submit,
    test_login_cyrillic_blocked,
    test_login_wrong_credentials,
    test_login_navigate_to_register,
    test_login_navigate_to_recover,
    # Регистрация
    test_register_empty_submit,
    test_register_login_too_short,
    test_register_login_cyrillic_filtered,
    test_register_name_not_3_words,
    test_register_name_latin_filtered,
    test_register_invalid_email,
    test_register_password_too_short,
    test_register_password_no_digit,
    test_register_password_no_special,
    test_register_passwords_mismatch,
    test_register_no_agreement,
    test_register_terms_page,
    # Восстановление пароля
    test_recover_empty_login,
    test_recover_nonexistent_user,
    test_recover_back_to_login,
]


def main():
    print(f"\n{'='*60}")
    print(f"  AISK -- auto-tests (auth)")
    print(f"  Screenshots: {SHOTS_DIR}")
    print(f"{'='*60}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=SLOW_MO)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        for test_fn in ALL_TESTS:
            try:
                test_fn(page)
            except Exception as e:
                fail(test_fn.__name__, f"CRASH: {e}")

        browser.close()

    # Итог
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    print(f"\n{'='*60}")
    print(f"  Total: {total} | PASS: {passed} | FAIL: {failed}")
    print(f"{'='*60}\n")

    if failed:
        print("Failed tests:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  [FAIL] {r['name']}: {r['detail']}")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
