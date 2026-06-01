# Структура проекта АИСК

---

## Корень проекта

| Файл / папка | Назначение |
|---|---|
| `Запустить проект.bat` | Двойной клик - открывается лаунчер, сервер запускается автоматически |
| `launcher.py` | GUI-лаунчер на Tkinter: запуск/остановка сервера, цветные логи, отображение email-кодов |
| `manage.py` | Django CLI - запуск команд: `runserver`, `migrate`, `makemigrations` и др. |
| `requirements.txt` | Python-зависимости. Установка: `pip install -r requirements.txt` |
| `db.sqlite3` | База данных SQLite - весь проект в одном файле. Не коммитится в git |
| `.env` | Секреты: `SECRET_KEY`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`. Не коммитится |
| `.gitignore` | Что git игнорирует: venv, .env, db.sqlite3, media, node_modules и др. |
| `STRUCTURE.md` | Этот файл - карта проекта |

---

## `config/` - настройки Django

| Файл | Назначение |
|---|---|
| `settings.py` | Главный конфиг: БД, JWT, CORS, Email (Gmail SMTP), пути к media/static |
| `urls.py` | Корневой роутер - подключает `core/urls.py`, отдаёт media в dev-режиме |
| `wsgi.py` | Точка входа для prod-серверов (Gunicorn и др.) |
| `asgi.py` | Точка входа для асинхронных серверов (не используется) |
| `__init__.py` | Служебный файл Python-пакета |

---

## `core/` - всё приложение

Единственное Django-приложение. Вся бизнес-логика здесь.

### Основные файлы

| Файл | Назначение |
|---|---|
| `models.py` | Все модели БД: User, Institution, Faculty, Group, Employee, Student, Parent, Subject, Document, AuditLog, DeleteRequest, RecordNote, EmailCode |
| `urls.py` | Все маршруты `/api/...` + catch-all → serve_frontend |
| `views.py` | Одна вьюха `serve_frontend()` - отдаёт `frontend/dist/index.html` |
| `utils.py` | Утилиты: `log_action()`, отправка email-кодов, проверка уникальности email/телефона, декораторы ролей |
| `admin.py` | Регистрация моделей в Django Admin (`/admin/`) |
| `apps.py` | Конфиг приложения `core` |
| `__init__.py` | Служебный файл Python-пакета |

### API-файлы

Один файл = одна сущность. Все файлы используют DRF `APIView`.

| Файл | Что обрабатывает |
|---|---|
| `api_auth.py` | Регистрация с email-кодом, вход, выход, восстановление пароля |
| `api_main.py` | Дашборд (статистика), валидация полей, данные текущего пользователя |
| `api_organizations.py` | Учебные заведения - CRUD, переключение активной организации |
| `api_faculties.py` | Факультеты - CRUD, флаг, заявка на удаление |
| `api_groups.py` | Группы - CRUD, назначение предметов, флаг, заявка на удаление |
| `api_students.py` | Студенты - CRUD, связи с опекунами, флаг, заявка на удаление |
| `api_employees.py` | Сотрудники - CRUD, назначение предметов/групп, создание аккаунта, флаг |
| `api_parents.py` | Опекуны - CRUD, связи со студентами, флаг, заявка на удаление |
| `api_subjects.py` | Предметы - CRUD, список преподавателей, заявка на удаление |
| `api_positions.py` | Должности - CRUD, заявка на удаление |
| `api_users.py` | Управление аккаунтами пользователей (admin/teacher) |
| `api_profile.py` | Профиль текущего пользователя: фото, пароль, email, удаление аккаунта |
| `api_documents.py` | Загрузка, скачивание и удаление документов (PDF, изображения) |
| `api_delete_requests.py` | Заявки на удаление: создание, одобрение, отклонение, отзыв |
| `api_audit.py` | Журнал изменений: просмотр, фильтрация, экспорт в Excel, откат полей |
| `api_notes.py` | Вопросы к записям: admin ставит вопрос на запись, owner закрывает |

### Подпапки `core/`

| Папка / файл | Назначение |
|---|---|
| `migrations/` | Миграции БД, сгенерированные Django. Не редактировать вручную |
| `management/commands/create_superadmin.py` | Команда `python manage.py create_superadmin` - создаёт owner-аккаунт |
| `management/commands/seed_data.py` | Команда `python manage.py seed_data` - заполняет БД тестовыми данными |

---

## `frontend/` - React SPA

### `src/` - исходный код

| Файл | Назначение |
|---|---|
| `main.jsx` | Точка входа: монтирует приложение, роутинг между экранами через state + History API |
| `shell.jsx` | Оболочка: сайдбар, топбар, `PageHead`, хлебные крошки, `Avatar`, `Badge` |
| `screens.jsx` | Все экраны: дашборды (owner/admin/teacher), списки и детальные карточки всех сущностей |
| `modals.jsx` | Все модальные окна: формы создания/редактирования, подтверждения, просмотр diff |
| `auth.jsx` | Экраны авторизации: вход, регистрация, подтверждение email, восстановление пароля |
| `profile.jsx` | Экран профиля пользователя |
| `api.js` | Axios-инстанс с JWT-токеном и автоматическим refresh при 401 |
| `data.jsx` | SVG-иконки (объект `I`) и константы |
| `utils.jsx` | Компоненты и хуки: Toast, Field, Combobox, Pager, сортировка, счётчики, скелетоны |
| `styles.css` | Все CSS-стили приложения: дизайн-система, компоненты, темная тема |

### `public/` - статические файлы

| Файл | Назначение |
|---|---|
| `favicon.svg` | Иконка вкладки браузера |
| `icons.svg` | SVG-спрайт иконок интерфейса |
| `logo.png` | Логотип приложения (используется в лаунчере и email-письмах) |

### `dist/` - собранный билд

Генерируется командой `npm run build`. Django отдаёт его как статику.

| Файл | Назначение |
|---|---|
| `index.html` | HTML-оболочка SPA |
| `assets/index-*.js` | Скомпилированный JavaScript (весь React-код) |
| `assets/index-*.css` | Скомпилированный CSS |
| `favicon.svg`, `icons.svg`, `logo.png` | Копии из `public/` |

### Конфигурационные файлы `frontend/`

| Файл | Назначение |
|---|---|
| `package.json` | Node-зависимости и npm-скрипты: `npm run dev` (dev-сервер), `npm run build` (сборка) |
| `vite.config.js` | Конфиг Vite: в dev-режиме проксирует `/api/` на Django порт 8000 |
| `eslint.config.js` | Правила линтера JavaScript |
| `index.html` | HTML-шаблон для Vite |
| `node_modules/` | Установленные npm-пакеты. Не коммитится в git |

---

## `media/` - файлы пользователей

Создаётся автоматически при первой загрузке файла. Не коммитится в git.

| Подпапка | Что хранит |
|---|---|
| `institutions/` | Фото учебных заведений |
| `employees/` | Фото сотрудников |
| `students/` | Фото студентов |
| `parents/` | Фото опекунов |
| `users/` | Фото профилей пользователей |
| `documents/` | Прикреплённые документы (PDF, изображения) |

---

## `venv/` - виртуальное окружение Python

Установленные Python-пакеты. Не коммитится в git.  
Создание: `python -m venv venv`  
Активация: `venv\Scripts\activate`  
Установка пакетов: `pip install -r requirements.txt`

---

## `static/` - статика Django Admin

Собирается командой `python manage.py collectstatic`.  
Нужна только для интерфейса `/admin/`. Само приложение использует `frontend/dist/`.
