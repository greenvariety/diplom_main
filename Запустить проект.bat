@echo off
cd /d "%~dp0"
title Diplomniy proekt

:CHECK
cls
echo =============================================
echo   http://127.0.0.1:8000
echo =============================================
echo.

netstat -ano 2>nul | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo  [!] Server RUNNING: http://127.0.0.1:8000
    echo.
    echo  [1] Open site in browser
    echo  [2] Restart server
    echo  [3] Stop server
    echo  [0] Exit
) else (
    echo  [i] Server is NOT running.
    echo.
    echo  [1] Start server + open browser
    echo  [0] Exit
)

echo.
set choice=
set /p choice="Choice: "
echo.

if "%choice%"=="1" goto ACTION_1
if "%choice%"=="2" goto KILL_AND_START
if "%choice%"=="3" goto KILL_ONLY
if "%choice%"=="0" exit /b
goto CHECK

:ACTION_1
netstat -ano 2>nul | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    start http://127.0.0.1:8000
    goto CHECK
) else (
    goto START
)

:KILL_AND_START
call :KILL_PORT
goto START

:KILL_ONLY
call :KILL_PORT
echo  Server stopped.
pause
goto CHECK

:START
cls
echo  Building frontend...
echo.
cd frontend
call npm run build
cd ..
echo.
echo  Starting server...
echo.
if not exist "venv\Scripts\python.exe" (
    echo  ERROR: venv not found in %cd%
    pause
    goto CHECK
)
venv\Scripts\python.exe manage.py migrate --run-syncdb >nul 2>&1
start http://127.0.0.1:8000
echo  Server: http://127.0.0.1:8000
echo  Stop: Ctrl+C
echo.
venv\Scripts\python.exe manage.py runserver
echo.
echo  Server stopped.
pause
goto CHECK

:KILL_PORT
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
exit /b
