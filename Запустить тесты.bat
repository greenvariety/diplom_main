@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Запуск тест-раннера...
venv\Scripts\python.exe test_runner.py
pause
