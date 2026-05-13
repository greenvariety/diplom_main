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
