"""
Запуск сервера и открытие браузера.
Запускается через 2_Запустить.bat
"""
import subprocess, pathlib, webbrowser, time, sys

ROOT = pathlib.Path(__file__).parent.parent
URL = "http://127.0.0.1:8000"

if sys.platform == "win32":
    VENV_PYTHON = str(ROOT / "venv" / "Scripts" / "python.exe")
else:
    VENV_PYTHON = str(ROOT / "venv" / "bin" / "python")

if not pathlib.Path(VENV_PYTHON).exists():
    print("[ОШИБКА] Виртуальное окружение не найдено.")
    print("Сначала запустите 1_Установить.bat")
    input("\nНажмите Enter для выхода...")
    sys.exit(1)


def main():
    print("=" * 50)
    print("  Запуск проекта")
    print("=" * 50)
    print(f"\nАдрес: {URL}")
    print("Для остановки нажмите Ctrl+C\n")

    proc = subprocess.Popen(
        [VENV_PYTHON, str(ROOT / "launch" / "manage.py"), "runserver"],
        cwd=str(ROOT),
    )

    # Ждём пока сервер поднимется, потом открываем браузер
    time.sleep(2)
    webbrowser.open(URL)

    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\nОстановка сервера...")
        proc.terminate()
        proc.wait()
        print("Сервер остановлен")


if __name__ == "__main__":
    main()
