@echo off
cd /d "%~dp0"

if not exist "venv\Scripts\pythonw.exe" (
    echo.
    echo  ОШИБКА: виртуальное окружение не найдено.
    echo  Сначала выполните: python -m venv venv ^&^& venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

start "" venv\Scripts\pythonw.exe launcher.py
