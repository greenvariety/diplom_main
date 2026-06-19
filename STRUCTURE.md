# Структура проекта

```
├── config/               Django-настройки
│   ├── settings.py       конфигурация: БД, JWT, CORS, email, медиафайлы
│   ├── urls.py           корневые URL (подключает core/urls.py)
│   ├── asgi.py / wsgi.py точки входа для сервера
│
├── core/                 единственное Django-приложение
│   ├── models.py         все модели БД
│   ├── urls.py           все /api/... маршруты + catch-all → фронтенд
│   ├── views.py          serve_frontend() — отдаёт index.html
│   ├── utils.py          log_action, email-хелперы, декораторы ролей
│   ├── admin.py          регистрация моделей в Django Admin
│   │
│   ├── api_auth.py       логин, регистрация, восстановление пароля
│   ├── api_profile.py    профиль пользователя (смена пароля, email, логина)
│   ├── api_organizations.py  организации (CRUD, переключение)
│   ├── api_faculties.py  факультеты
│   ├── api_groups.py     группы и назначение предметов
│   ├── api_students.py   студенты, привязка опекунов
│   ├── api_employees.py  сотрудники, аккаунты, назначение предметов
│   ├── api_parents.py    опекуны, привязка студентов
│   ├── api_positions.py  должности
│   ├── api_subjects.py   предметы
│   ├── api_documents.py  документы (загрузка, удаление)
│   ├── api_delete_requests.py  заявки на удаление (список, одобрение)
│   ├── api_notes.py      вопросы к записям (RecordNote)
│   ├── api_audit.py      журнал изменений, откат, экспорт
│   ├── api_users.py      управление пользователями (owner)
│   ├── api_main.py       дашборд и вспомогательные эндпоинты
│   │
│   ├── migrations/       миграции БД (автогенерируются)
│   └── management/commands/
│       ├── create_superadmin.py  создать начальный аккаунт admin
│       ├── seed_data.py          тестовые данные (небольшой набор)
│       ├── seed_big.py           тестовые данные (большой набор)
│       └── seed_mkag*.py         специфичные наборы данных
│
├── frontend/             React 18 + Vite
│   ├── src/
│   │   ├── main.jsx      точка входа, роутинг, AuthFlow
│   │   ├── auth.jsx      экраны входа, регистрации, восстановления пароля
│   │   ├── shell.jsx     навигационная оболочка (sidebar + topbar)
│   │   ├── screens.jsx   все основные экраны (списки, детали)
│   │   ├── modals.jsx    все модальные формы
│   │   ├── profile.jsx   экран профиля пользователя
│   │   ├── utils.jsx     компоненты Field, LoadButton, useToast и др.
│   │   ├── api.js        Axios-клиент с JWT и автообновлением токена
│   │   ├── data.jsx      иконки (объект I)
│   │   └── styles.css    дизайн-система (CSS-переменные, классы)
│   ├── public/           статические ресурсы (favicon, иконки, логотип)
│   ├── dist/             собранный билд — отдаётся Django (не редактировать)
│   ├── package.json      зависимости Node.js
│   └── vite.config.js    настройки сборщика
│
├── launch/               скрипты запуска и установки
│   ├── setup.py          установка venv, пакетов, .env, миграций
│   ├── launcher.py       запуск Django-сервера
│   ├── run.py            сборка фронтенда + запуск сервера
│   └── manage.py         Django manage.py (вызывается из корня через bat)
│
├── env/                  конфигурация окружения
│   ├── .env              секреты (SECRET_KEY, email) — не коммитить
│   └── requirements.txt  Python-зависимости
│
├── data/                 данные проекта
│   ├── db.sqlite3        база данных SQLite
│   └── er диаграмма.drawio  ER-диаграмма базы данных
│
├── media/                загруженные пользователями файлы (фото, документы)
├── venv/                 виртуальное окружение Python
│
├── Установить зависимости.bat  запускает launch/setup.py
└── Запустить проект.bat        запускает launch/run.py
```
