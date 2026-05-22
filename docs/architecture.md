---
name: architecture
description: Стек технологий, структура папок, ключевые компоненты
type: project
---

# Архитектура

## Стек

| Слой | Технология |
|---|---|
| Backend | Django 4.2 (Python) + Django REST Framework |
| БД | SQLite (файл `db.sqlite3`) |
| Аутентификация | JWT (djangorestframework-simplejwt) |
| Фронтенд | React 18 + Vite (папка `frontend/`) |
| HTTP-клиент | Axios |
| Изображения | Pillow |
| Экспорт | openpyxl (Excel) |

## Структура папок

```
Программа/
├── config/                  # Настройки Django-проекта
│   ├── settings.py          # Вся конфигурация (DEBUG, DB, AUTH, DRF, JWT, Email)
│   ├── urls.py              # Корневые URL: /api/... + catch-all → React SPA
│   ├── asgi.py / wsgi.py
│
├── core/                    # Единственное Django-приложение
│   ├── models.py            # Все модели БД
│   ├── views.py             # serve_frontend — отдаёт frontend/dist/index.html
│   ├── middleware.py        # InitializationMiddleware (заглушка)
│   ├── urls.py              # Пустой (все роуты в config/urls.py)
│   ├── api_auth.py          # API: логин, регистрация с email-кодом, восстановление пароля
│   ├── api_main.py          # API: /me/, /dashboard/
│   ├── api_organizations.py # API: организации (Institution)
│   ├── api_faculties.py     # API: факультеты
│   ├── api_groups.py        # API: группы
│   ├── api_students.py      # API: студенты
│   ├── api_employees.py     # API: сотрудники
│   ├── api_parents.py       # API: родители/опекуны
│   ├── api_subjects.py      # API: предметы
│   ├── api_positions.py     # API: должности
│   ├── api_documents.py     # API: документы
│   ├── api_users.py         # API: пользователи системы
│   ├── api_delete_requests.py # API: заявки на удаление
│   ├── api_audit.py         # API: аудит-лог
│   ├── utils.py             # log_action(), email-хелперы, декораторы ролей
│   ├── admin.py             # Django Admin
│   └── management/
│       └── commands/
│           ├── create_superadmin.py   # python manage.py create_superadmin
│           └── seed_data.py           # python manage.py seed_data
│
├── frontend/                # React SPA (Vite)
│   ├── src/                 # Исходники
│   │   ├── main.jsx         # Точка входа + AuthFlow + OrgPickerScreen
│   │   ├── auth.jsx         # Экраны: Login, Register, EmailVerify, RecoverPassword
│   │   ├── shell.jsx        # Навигационная оболочка (sidebar + topbar)
│   │   ├── screens.jsx      # Все экраны приложения
│   │   ├── modals.jsx       # Модальные формы
│   │   ├── api.js           # Axios-клиент с JWT + автообновление токена
│   │   ├── utils.jsx        # Field, FadingError, LoadButton, useToast и др.
│   │   ├── data.jsx         # Иконки (I), константы
│   │   └── styles.css       # Дизайн-система
│   ├── dist/                # Собранный билд (отдаётся Django)
│   └── vite.config.js       # Настройки Vite + proxy на Django
│
├── docs/                    # База знаний (эта папка)
├── media/                   # Загруженные файлы (документы, фото)
├── manage.py
├── requirements.txt
└── Запустить проект.bat     # Скрипт: сборка фронта + запуск Django
```

## Архитектурные решения

- **SPA + API**: фронтенд — React SPA в `frontend/`, бэкенд — Django REST Framework в `core/api_*.py`. Django не рендерит HTML страниц — только отдаёт данные через `/api/`.
- **JWT-авторизация**: access-токен (60 мин) + refresh-токен (30 дней). Хранятся в `localStorage`. Axios-интерцептор автоматически обновляет access при 401.
- **Кастомная User-модель**: `core.User` с полем `role` (`owner` / `admin` / `teacher`). Роли проверяются в DRF-вьюхах через `request.user.role`.
- **Мультитенантность**: владелец (`owner`) создаёт учебные заведения (`Institution`). Все сущности (факультеты, сотрудники и т.д.) привязаны к `Institution` через FK.
- **Email-верификация**: регистрация нового `owner` требует подтверждения email через 6-символьный код (модель `EmailCode`). Аналогично — восстановление пароля.
- **Монолит**: весь бэкенд-код в одном приложении `core` — нормально для дипломного проекта.
- **Generic relations через поля**: Document привязан к владельцу через `owner_type` (строка) + `owner_id` (int) вместо `GenericForeignKey`.
- **Двухуровневое удаление**: admin создаёт `DeleteRequest`, owner одобряет → объект удаляется реально.
- **Django как SPA-хост**: `serve_frontend` в `core/views.py` отдаёт `frontend/dist/index.html` для всех путей кроме `/api/` и `/media/`.
