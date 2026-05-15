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

---

## Задача 3 выполнена — Организации

**Что сделано:**

- Создан `core/api_organizations.py` с вьюхами:
  - `GET /api/organizations/` — список организаций текущего owner-пользователя с числом студентов и сотрудников.
  - `POST /api/organizations/` — создание; код автоматически генерируется из первых букв названия, если не указан.
  - `PATCH /api/organizations/{id}/` — редактирование названия.
  - `DELETE /api/organizations/{id}/` — удаление организации.
  - `POST /api/organizations/{id}/switch/` — переключение активной организации (меняет `user.institution`).
- В `config/urls.py` добавлены три маршрута для организаций.
- `frontend/src/modals.jsx` конвертирован из prototype-формата (`window.AIS_MODALS`, `React` global) в ES-модуль с `import`/`export`. Добавлен `OrgFormModal` с реальными API-вызовами (создание/редактирование).
- В `frontend/src/screens.jsx` обновлён `OrganizationList`: теперь загружает данные из `/api/organizations/`, поддерживает переключение, редактирование и удаление. `EmptyOrgOnboarding` получает `currentUser` и `onNavigate` через пропсы.
- `frontend/src/main.jsx` обновлён: добавлена модальная система (`openModal`/`closeModal`), добавлен экран `org-list`, `openModal` передаётся во все экраны через `sharedProps`, добавлена функция `loadUser` для обновления данных пользователя после переключения организации.
- `npm run build` — собирается без ошибок.

---

## Задача 4 выполнена — Факультеты

**Что сделано:**

- Создан `core/api_faculties.py` с тремя вьюхами:
  - `GET /api/faculties/` — список факультетов текущей организации с числом групп и студентов.
  - `POST /api/faculties/` — создание (поля: `full_name`, `short_name`). Доступно admin и owner.
  - `PATCH /api/faculties/{id}/` — редактирование. Доступно admin и owner.
  - `POST /api/faculties/{id}/delete-request/` — создание заявки на удаление (не удаляет сразу).
- Все изменения логируются через `log_action()`.
- В `config/urls.py` добавлены три маршрута для факультетов.
- `frontend/src/screens.jsx` — `FacultyList` переписан: загружает данные из API, показывает скелетон при загрузке, таблица с реальными данными (код, название, групп, студентов). Клик по строке открывает детальную модалку.
- `frontend/src/modals.jsx` — `FacultyFormModal` переписан: реальные вызовы POST/PATCH вместо mock. `FacultyDetailModal` переписан: кнопки «Редактировать» и «Удалить» (создаёт заявку на удаление с toast-уведомлением).
- `frontend/src/main.jsx` обновлён: добавлен экран `faculties`, добавлена обработка модалок `facultyForm` и `facultyDetail`.
- `npm run build` — собирается без ошибок.

---

## Задача 5 выполнена — Группы

**Что сделано:**

- Создан `core/api_groups.py` с вьюхами: список групп (с фильтром по факультету), детальная (студенты + предметы), создание, редактирование, заявка на удаление, назначение предмета, снятие предмета.
- Созданы минимальные `core/api_employees.py` (GET список) и `core/api_subjects.py` (GET список) для выпадающих списков в формах.
- В `config/urls.py` добавлены маршруты для групп, сотрудников и предметов.
- `frontend/src/screens.jsx` — `GroupList` переписан: реальные данные, фильтр по факультету, поиск. Клик навигирует на отдельную страницу группы.
- `frontend/src/screens.jsx` — `GroupDetail` переписан: загружает студентов и предметы, хлебные крошки, кнопки редактировать и удалить (заявка).
- `frontend/src/modals.jsx` — `GroupFormModal` и `AssignSubjectModal` переписаны на реальные API-вызовы.
- `frontend/src/main.jsx` обновлён: добавлены экраны `groups` и `group-detail` (с контекстом навигации через `navExtra`), модалки `groupForm` и `assignSubject`.
- `npm run build` — собирается без ошибок.

---

## Задача 6 выполнена — Студенты

**Что сделано:**

- Создан `core/api_students.py`: список с пагинацией и фильтрами, профиль со списком документов/опекунов/аудита, создание, редактирование, заявка на удаление, перевод в группу, добавление/удаление опекуна.
- Создан `core/api_documents.py`: загрузка файла (multipart), удаление документа.
- В `config/urls.py` добавлены маршруты для студентов и документов.
- `frontend/src/screens.jsx` — `StudentList`: реальные данные с пагинацией, фильтры по факультету/группе/статусу, поиск по ФИО, смена статуса из таблицы. `StudentDetail`: профиль, опекуны, документы (drag-drop, скачивание, удаление), история из аудит-лога.
- `frontend/src/modals.jsx` — обновлены: `StudentFormModal`, `TransferModal`, `UploadDocModal`, `ParentFormModal`, `DeleteConfirmModal` — все работают с реальным API.
- `frontend/src/shell.jsx` — добавлен `TopbarSearch`: поиск студентов в реальном времени с выпадающим списком.
- `frontend/src/main.jsx` — добавлены экраны `students` и `student-detail`, зарегистрированы новые модалки.
- `npm run build` — собирается без ошибок.

---

## Задача 7 выполнена — Сотрудники

**Что сделано:**

- Создан `core/api_employees.py`: список с пагинацией (фильтр по поиску и должности), детальная (предметы, классное руководство, документы), создание, редактирование, заявка на удаление, назначение предмета (группа + предмет), снятие предмета.
- Создан `core/api_positions.py`: список должностей с `employee_count` (аннотация Count), создание, редактирование.
- В `config/urls.py` добавлены маршруты для сотрудников и должностей.
- `frontend/src/screens.jsx` — `EmployeeList`: реальные данные с пагинацией, фильтр по должности, поиск по ФИО. `EmployeeDetail`: профиль, классное руководство, назначенные предметы, документы. `PositionList`: реальные данные вместо моков, кнопка редактировать на каждой строке.
- `frontend/src/modals.jsx` — `EmployeeFormModal`: поля ФИО, дата рождения, телефон, email, должность (выбор из API). `EmployeeAssignSubjectModal`: выбор группы и предмета из API. `PositionFormModal`: реальные POST/PATCH вместо заглушки-setTimeout.
- `frontend/src/main.jsx` — добавлены экраны `employees`, `employee-detail`, `positions`; зарегистрированы модалки `employeeForm`, `employeeAssignSubject`, `positionForm`.
- `npm run build` — собирается без ошибок.
