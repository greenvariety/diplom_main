---
name: deployment
description: Как запустить проект локально, команды, адреса
type: project
---

# Запуск и деплой

## Требования

- Python 3.10+ с pip
- Node.js 18+ с npm

## Локальная разработка (Windows)

### Быстрый старт

Запустить `Запустить проект.bat` в корне проекта — он автоматически соберёт фронтенд и запустит Django-сервер.

### Вручную

```bash
# Активировать виртуальное окружение
venv\Scripts\activate

# Применить миграции (если нужно)
python manage.py migrate

# Создать суперадминистратора
python manage.py create_superadmin

# Заполнить тестовыми данными
python manage.py seed_data

# Собрать фронтенд (один раз или после изменений в frontend/src/)
cd frontend
npm install      # только при первом запуске или после npm install
npm run build
cd ..

# Запустить Django-сервер
python manage.py runserver
```

### Разработка фронтенда (с hot reload)

```bash
# Терминал 1 — Django API
python manage.py runserver

# Терминал 2 — Vite dev server (проксирует /api/ на Django)
cd frontend
npm run dev
# Открыть http://localhost:5173
```

### Адрес (production-режим через Django)

`http://127.0.0.1:8000/`

Django отдаёт `frontend/dist/index.html` — React SPA загружается в браузере.

### Учётные данные по умолчанию

После `create_superadmin` — смотреть вывод команды или код `core/management/commands/create_superadmin.py`.

## Зависимости

### Python (`requirements.txt`)

```
django==4.2
pillow               # обработка изображений
openpyxl             # экспорт в Excel
djangorestframework  # DRF — REST API
djangorestframework-simplejwt  # JWT-авторизация
django-cors-headers  # CORS для Vite dev server
```

Установка: `pip install -r requirements.txt`

### Node.js (`frontend/package.json`)

```
react, react-dom     # React 18
vite                 # сборщик
axios                # HTTP-клиент
```

Установка: `cd frontend && npm install`

## Настройки (`config/settings.py`)

| Параметр | Значение | Примечание |
|---|---|---|
| DEBUG | True | Для prod надо False |
| ALLOWED_HOSTS | ['*'] | Для prod ограничить |
| DATABASE | SQLite | `db.sqlite3` в корне |
| LANGUAGE_CODE | ru-ru | |
| TIME_ZONE | Europe/Moscow | |
| MEDIA_ROOT | `{BASE_DIR}/media/` | Загруженные документы |
| STATIC_ROOT | `{BASE_DIR}/staticfiles/` | |
| AUTH_USER_MODEL | `core.User` | |
| CORS_ALLOWED_ORIGINS | localhost:5173 | Для Vite dev server |
| JWT ACCESS_TOKEN_LIFETIME | 60 минут | |
| JWT REFRESH_TOKEN_LIFETIME | 30 дней | |
| DELETE_CONFIRMATION_PASSWORD | `DELETE_CONFIRM_2024` | |

## Production (не реализован)

Для деплоя потребуется:
1. Сменить `DEBUG = False`
2. Задать `SECRET_KEY` из переменной окружения
3. Настроить `ALLOWED_HOSTS`
4. Собрать фронтенд: `cd frontend && npm run build`
5. Запустить `python manage.py collectstatic`
6. Поставить Nginx + Gunicorn / или использовать `waitress` на Windows
7. Nginx отдаёт `/media/` и `frontend/dist/assets/` как статику, остальное → Gunicorn
8. Переключить БД на PostgreSQL при необходимости
