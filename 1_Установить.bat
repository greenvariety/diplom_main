@echo off
chcp 65001 > nul
title Установка проекта

python --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Python не найден!
    echo Установите Python 3.9 или выше с сайта https://python.org
    echo При установке обязательно отметьте "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

python launch\setup.py
pause
