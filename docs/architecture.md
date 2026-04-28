---
name: architecture
description: Стек технологий, структура папок, ключевые компоненты
type: project
---

# Архитектура

## Стек

| Слой | Технология |
|---|---|
| Backend | Django 4.2 (Python) |
| БД | SQLite (файл `db.sqlite3`) |
| Формы | django-crispy-forms + crispy-bootstrap5 |
| Шаблоны | Django Templates (Jinja-подобный синтаксис) |
| Фронтенд | Bootstrap 5 (CDN), без JS-фреймворков |
| Изображения | Pillow |
| Экспорт | openpyxl (Excel) |

## Структура папок

```
Программа/
├── config/                  # Настройки Django-проекта
│   ├── settings.py          # Вся конфигурация (DEBUG, DB, AUTH и т.д.)
│   ├── urls.py              # Корневые URL (подключает core.urls)
│   ├── asgi.py / wsgi.py
│
├── core/                    # Единственное Django-приложение
│   ├── models.py            # Все модели БД
│   ├── views.py             # Все представления (~1000 строк)
│   ├── urls.py              # URL-маршруты
│   ├── forms.py             # Django-формы
│   ├── utils.py             # log_action, декораторы ролей
│   ├── admin.py             # Django Admin (не используется активно)
│   ├── management/
│   │   └── commands/
│   │       ├── create_superadmin.py   # python manage.py create_superadmin
│   │       └── seed_data.py           # python manage.py seed_data
│   └── migrations/          # Миграции БД
│
├── templates/               # HTML-шаблоны
│   ├── base.html            # Базовый шаблон (navbar, сообщения)
│   ├── base_login.html      # Шаблон для страницы входа
│   └── core/                # Шаблоны приложения
│
├── docs/                    # База знаний (эта папка)
├── Reference materials/     # ТЗ и справочные материалы
├── manage.py
├── requirements.txt
└── Запустить проект.bat     # Скрипт запуска dev-сервера
```

## Архитектурные решения

- **Монолит**: весь код в одном приложении `core` — нормально для дипломного проекта такого масштаба.
- **Кастомная User-модель**: `core.User` наследует `AbstractBaseUser` + `PermissionsMixin`. Роли хранятся в поле `role`, не через Django groups.
- **Декораторы вместо миксинов**: `@admin_required`, `@superadmin_required` из `core/utils.py` — функциональные декораторы.
- **Generic relations через поля**: Document привязан к владельцу через `owner_type` (строка) + `owner_id` (int) вместо `GenericForeignKey` — проще для понимания.
