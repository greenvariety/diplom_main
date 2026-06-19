@echo off
chcp 65001 > nul
title Запуск проекта

if not exist venv\Scripts\python.exe (
    echo.
    echo [ОШИБКА] Проект не установлен!
    echo Сначала запустите 1_Установить.bat
    echo.
    pause
    exit /b 1
)

venv\Scripts\pythonw.exe launch\launcher.py
pause
