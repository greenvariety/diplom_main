"""
Установка проекта: создание окружения, установка библиотек, миграции, создание администратора.
Запускается через 1_Установить.bat
"""
import subprocess, sys, os, pathlib, secrets

ROOT = pathlib.Path(__file__).parent.parent


def run(cmd, label=""):
    if label:
        print(f"\n{label}...")
    result = subprocess.run(cmd, cwd=str(ROOT))
    if result.returncode != 0:
        print(f"\n[ОШИБКА] Команда завершилась с ошибкой: {' '.join(str(c) for c in cmd)}")
        sys.exit(1)


def main():
    print("=" * 50)
    print("  Установка проекта")
    print("=" * 50)

    # Проверка версии Python
    major, minor = sys.version_info[:2]
    print(f"\nPython {major}.{minor} обнаружен")
    if major < 3 or (major == 3 and minor < 9):
        print("[ОШИБКА] Требуется Python 3.9 или выше")
        sys.exit(1)

    # Создание виртуального окружения
    venv_path = ROOT / "venv"
    if not venv_path.exists():
        run([sys.executable, "-m", "venv", str(venv_path)], "Создание виртуального окружения")
    else:
        print("\nВиртуальное окружение уже существует — пропускаю")

    # Пути к исполняемым файлам внутри venv
    if sys.platform == "win32":
        venv_python = str(venv_path / "Scripts" / "python.exe")
        venv_pip = str(venv_path / "Scripts" / "pip.exe")
    else:
        venv_python = str(venv_path / "bin" / "python")
        venv_pip = str(venv_path / "bin" / "pip")

    # Установка зависимостей
    run([venv_pip, "install", "-r", str(ROOT / "requirements.txt")], "Установка библиотек")

    # Создание .env если нет
    env_path = ROOT / ".env"
    if not env_path.exists():
        print("\nСоздание .env файла...")
        secret_key = "django-insecure-" + secrets.token_hex(32)
        env_path.write_text(
            f"SECRET_KEY={secret_key}\n"
            f"DEBUG=True\n"
            f"EMAIL_HOST_USER=\n"
            f"EMAIL_HOST_PASSWORD=\n",
            encoding="utf-8",
        )
        print(".env создан с автоматически сгенерированным SECRET_KEY")
    else:
        print("\n.env уже существует — пропускаю")

    # Применение миграций
    run([venv_python, str(ROOT / "launch" / "manage.py"), "migrate"], "Применение миграций базы данных")

    # Создание суперадминистратора
    run([venv_python, str(ROOT / "launch" / "manage.py"), "create_superadmin"], "Создание учётной записи администратора")

    print("\n" + "=" * 50)
    print("  Установка завершена успешно!")
    print("=" * 50)
    print("\nТеперь запустите 2_Запустить.bat\n")


if __name__ == "__main__":
    main()
