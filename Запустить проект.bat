@echo off
chcp 65001 >nul
if not exist venv\Scripts\pythonw.exe (
    echo Ошибка: сначала запустите "Установить зависимости.bat"
    pause
    exit /b 1
)
venv\Scripts\pythonw.exe launch\launcher.py
