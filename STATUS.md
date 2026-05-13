## Задача 0 выполнена — Инфраструктура DRF + React + JWT

**Что сделано:**

- Установлены Python-пакеты: `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers` (добавлены в `requirements.txt`, установлены в venv).
- В `config/settings.py` добавлены: `rest_framework` и `corsheaders` в `INSTALLED_APPS`; `CorsMiddleware` первым в `MIDDLEWARE`; настройки `CORS_ALLOWED_ORIGINS`, `REST_FRAMEWORK` (JWT-аутентификация по умолчанию), `SIMPLE_JWT` (access 60 мин, refresh 30 дней).
- Создан React-проект в `frontend/` через Vite (шаблон `react`, plain JavaScript). Установлен `axios`.
- Файлы прототипа скопированы в `frontend/src/`: `styles.css`, `shell.jsx`, `screens.jsx`, `modals.jsx`, `auth.jsx`, `data.jsx`, `utils.jsx`, `tweaks-panel.jsx`.
- Создан `frontend/src/api.js` — axios-клиент с JWT: автоматически добавляет `Authorization: Bearer`, при 401 делает авто-refresh через `/api/auth/refresh/`, при неудаче — редирект на логин.
- `frontend/vite.config.js` настроен: proxy `/api` и `/media` на `http://127.0.0.1:8000`.
- `frontend/src/main.jsx` — заглушка "Готово".
- `config/urls.py` — добавлен пустой DRF router на `/api/`.
- `npm run build` — собирается без ошибок. `python manage.py check` — ошибок нет.

---

## Задача 1 выполнена — Авторизация (Login, Register, Recover, Seed Phrase)

**Что сделано:**

- Создан `core/api_auth.py` с четырьмя DRF-вьюхами: LoginView, RegisterView, LogoutView, RecoverView.
  - Логин: принимает `{username, password}`, возвращает JWT-токены и данные пользователя.
  - Регистрация: принимает `{login, name, pass}`, создаёт User (owner) + Institution + SeedPhrase (12 случайных слов), возвращает токены и слова сид-фразы.
  - Выход: возвращает 200 (токен удаляется на клиенте).
  - Восстановление: принимает `{login, seed_words, new_password}`, проверяет сид-фразу по хэшу, меняет пароль, возвращает новые токены.
- В `config/urls.py` добавлены маршруты: `/api/auth/login/`, `/api/auth/register/`, `/api/auth/refresh/`, `/api/auth/logout/`, `/api/auth/recover/`.
- `frontend/src/data.jsx` и `frontend/src/utils.jsx` конвертированы из глобальных переменных (`window.AIS_DATA`, `window.AIS_UTILS`, `React`) в нормальные ES-модули с `import`/`export`.
- `frontend/src/auth.jsx` переписан: вместо mock-данных — реальные вызовы API через axios. Токены сохраняются в `localStorage`. Ошибки API показываются через toast-уведомления.
- `frontend/src/main.jsx` обновлён: если нет `access_token` в localStorage — показывается экран авторизации (LoginScreen); если токен есть — заглушка приложения (будет заменена в Задаче 2). Навигация между экранами авторизации управляется state-машиной.
- `npm run build` — собирается без ошибок.

---

## Задача 2 выполнена — Навигационная оболочка + Дашборд

**Что сделано:**

- Создан `core/api_main.py` с двумя эндпоинтами:
  - `GET /api/me/` — возвращает данные текущего пользователя (id, username, display_name, role, institution).
  - `GET /api/dashboard/` — возвращает статистику (факультеты, группы, студенты, сотрудники, число заявок на удаление) и последние 14 записей аудит-лога.
- В `config/urls.py` добавлены роуты `/api/me/` и `/api/dashboard/`.
- `frontend/src/shell.jsx` конвертирован из window-глобалей в ES-модуль: теперь принимает `currentUser` (из API), `onNavigate` (для переключения экранов), `onLogout` (выход). Кнопка «Выйти» удаляет токены и сбрасывает состояние.
- `frontend/src/screens.jsx` конвертирован в ES-модуль. DashboardOwner, DashboardAdmin, DashboardTeacher принимают `currentUser` и при монтировании загружают данные из `/api/dashboard/`. Пока нет данных — показывается скелетон загрузки.
- `frontend/src/main.jsx` обновлён: при наличии токена рендерится `AppShell`, который загружает `/api/me/`, управляет `currentScreen`-состоянием и отображает нужный дашборд по роли пользователя. Клики по пунктам меню переключают экраны. Другие разделы показывают заглушку.
- `npm run build` — собирается без ошибок.
