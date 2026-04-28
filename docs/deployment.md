---
name: deployment
description: Как запустить проект локально, команды, адреса
type: project
---

# Запуск и деплой

## Локальная разработка (Windows)

### Быстрый старт

Запустить `Запустить проект.bat` в корне проекта — он активирует venv и стартует dev-сервер.

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

# Запустить сервер
python manage.py runserver
```

### Адрес

`http://127.0.0.1:8000/`

Перенаправляет на `/dashboard/` (или `/login/` если не авторизован).

### Учётные данные по умолчанию

После `create_superadmin` — смотреть вывод команды или код `core/management/commands/create_superadmin.py`.

## Зависимости

```
django==4.2
pillow               # обработка изображений
django-crispy-forms  # красивые формы
crispy-bootstrap5    # Bootstrap 5 тема для crispy
openpyxl             # экспорт в Excel
```

Установка: `pip install -r requirements.txt`

## Настройки (config/settings.py)

| Параметр | Значение | Примечание |
|---|---|---|
| DEBUG | True | Для prod надо False |
| ALLOWED_HOSTS | ['*'] | Для prod ограничить |
| DATABASE | SQLite | `db.sqlite3` в корне |
| LANGUAGE_CODE | ru-ru | |
| TIME_ZONE | Europe/Moscow | |
| MEDIA_ROOT | `{BASE_DIR}/media/` | |
| STATIC_ROOT | `{BASE_DIR}/staticfiles/` | |
| AUTH_USER_MODEL | `core.User` | |
| LOGIN_URL | `/login/` | |
| DELETE_CONFIRMATION_PASSWORD | `DELETE_CONFIRM_2024` | Не используется — проверяется реальный пароль пользователя |

## Production (не реализован)

Для деплоя потребуется:
1. Сменить `DEBUG = False`
2. Задать `SECRET_KEY` из переменной окружения
3. Настроить `ALLOWED_HOSTS`
4. Запустить `python manage.py collectstatic`
5. Поставить Nginx + Gunicorn / или использовать `waitress` на Windows
6. Переключить БД на PostgreSQL при необходимости
