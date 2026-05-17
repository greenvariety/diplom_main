## PLAN задачи 8 и 9 выполнены — Создан файл AUTOTEST.md

**Что сделано:**

Создан файл `AUTOTEST.md` с полным планом автотестов для Django-проекта.
Файл содержит 16 разделов (по одному на каждый модуль системы) с конкретными сценариями:
тесты моделей, авторизации, прав доступа, выбора организации, факультетов, групп, студентов, опекунов, сотрудников, должностей, предметов, документов, пользователей, заявок на удаление, аудит-лога и дашборда.
Указан порядок написания тестов и шаблон вспомогательных фикстур.

---

## Задача 6 выполнена — Две кнопки на карточке организации

**Что сделано:**

На карточке каждой организации теперь всегда две кнопки:
- **«Перейти»** — заходит в организацию. Если организация уже активна, сразу открывает её экран. Если нет — сначала переключает, потом открывает.
- **«Настроить»** — открывает форму редактирования организации (название, код).

Раньше у активной организации была только кнопка «Редактировать», кнопки «Перейти» не было.

---

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

---

## Задача 8 выполнена — Родители/Опекуны

**Что сделано:**

- Создан `core/api_parents.py`: список с пагинацией и поиском по ФИО, детальная страница со списком привязанных студентов, создание, редактирование, заявка на удаление, привязка/отвязка студента.
- В `config/urls.py` добавлены маршруты: `GET/POST /api/parents/`, `GET/PATCH /api/parents/{id}/`, `POST /api/parents/{id}/delete-request/`, `POST /api/parents/{id}/students/`, `DELETE /api/parents/{id}/students/{sp_id}/`.
- `frontend/src/screens.jsx` — `ParentList` переписан: реальные данные с пагинацией и поиском, клик по строке → навигация на детальную. Добавлен `ParentDetail`: профиль опекуна, таблица привязанных студентов с кнопкой открепить, кнопки «Редактировать» и «Удалить».
- `frontend/src/modals.jsx` — `ParentFormModal` расширен: три режима — редактирование, создание и привязка к студенту (из StudentDetail), standalone-создание (из списка). Добавлен `ParentAddStudentModal`: выбор студента + тип связи.
- `frontend/src/main.jsx` — импортированы `ParentList`, `ParentDetail`, `ParentAddStudentModal`; добавлены экраны `parents` и `parent-detail`; зарегистрирована модалка `parentAddStudent`.

---

## Задача 9 выполнена — Предметы

**Что сделано:**

- `core/api_subjects.py` расширен: добавлены `POST /api/subjects/` (создание) и `SubjectDetailView` с `PATCH /api/subjects/{id}/` (редактирование) и `DELETE /api/subjects/{id}/` (удаление с проверкой — если предмет назначен группам, удаление запрещается с ошибкой). Все изменения логируются через `log_action()`.
- В `config/urls.py` добавлен маршрут `api/subjects/<int:pk>/` для `SubjectDetailView`.
- `frontend/src/screens.jsx` — `SubjectList` переписан: загружает реальные данные из API, показывает скелетон при загрузке, кнопки «Редактировать» и «Удалить» на каждой строке.
- `frontend/src/modals.jsx` — `SubjectFormModal` переписан: поддерживает создание и редактирование, реальные вызовы `POST`/`PATCH`, показывает ошибки валидации.
- `frontend/src/main.jsx` — импортированы `SubjectList` и `SubjectFormModal`, добавлен экран `subjects`, зарегистрирована модалка `subjectForm`.

---

## Задача 11 выполнена — Пользователи системы

**Что сделано:**

- Создан `core/api_users.py` с четырьмя вьюхами (доступ только для role='owner'):
  - `GET /api/users/` — список пользователей текущей организации (username, display_name, role, is_active, last_login, employee).
  - `POST /api/users/` — создание пользователя (поля: username, display_name, role, password, employee_id). Роли admin/teacher, нельзя создать второго owner. Проверяется уникальность логина.
  - `PATCH /api/users/{id}/` — редактирование (display_name, role, is_active, employee_id). Все изменения логируются.
  - `DELETE /api/users/{id}/` — удаление. Нельзя удалить свой аккаунт.
  - `POST /api/users/{id}/set-password/` — смена пароля пользователя.
- В `config/urls.py` добавлены три маршрута: `/api/users/`, `/api/users/{id}/`, `/api/users/{id}/set-password/`.
- `frontend/src/screens.jsx` — `UserList` переписан: загружает реальных пользователей из API, таблица с логином, ФИО, цветным бейджем роли, датой последнего входа, статусом активности. Кнопки: редактировать (pencil), сменить пароль (shield), удалить (trash).
- `frontend/src/modals.jsx` — `UserFormModal` переписан: поддерживает создание и редактирование (accept `data.user`). При создании — поля логин, пароль, подтверждение. При редактировании — только ФИО, роль, сотрудник. Добавлен `UserSetPasswordModal`: форма с новым паролем и подтверждением.
- `frontend/src/main.jsx` — импортированы `UserList`, `UserFormModal`, `UserSetPasswordModal`; добавлен экран `users`; зарегистрированы модалки `userForm` и `userSetPassword`.
- `npm run build` — собирается без ошибок.

---

## Задача 12 выполнена — Заявки на удаление

**Что сделано:**

- Создан `core/api_delete_requests.py` с четырьмя вьюхами:
  - `GET /api/delete-requests/` — список pending-заявок для текущей организации (доступно admin и owner). Для каждой заявки подгружается строковое представление объекта.
  - `POST /api/delete-requests/{id}/approve/` — одобрение: физически удаляет объект из БД, логирует через `log_action()`, помечает заявку как `approved`. Доступно только owner.
  - `POST /api/delete-requests/{id}/reject/` — отклонение: статус → `rejected`, логируется. Доступно только owner.
  - `GET /api/delete-requests/count/` — количество pending-заявок для badge в sidebar.
- В `config/urls.py` добавлены четыре маршрута для заявок на удаление.
- `frontend/src/screens.jsx` — `DeleteRequests` переписан: загружает реальные данные из API, показывает тип объекта, его имя, автора, дату, причину. Кнопка «Одобрить» открывает `ApproveDeleteModal`, кнопка «Отклонить» напрямую вызывает POST/reject. Список обновляется после каждого действия.
- `frontend/src/modals.jsx` — `ApproveDeleteModal` переписан: реальный вызов `POST /api/delete-requests/{id}/approve/`, показывает данные из заявки, ошибки API отображаются в форме.
- `frontend/src/shell.jsx` — добавлен счётчик pending-заявок: Shell делает `GET /api/delete-requests/count/` при каждой смене активного раздела и отображает красный badge с числом рядом с пунктом «Заявки на удаление» в сайдбаре.
- `frontend/src/main.jsx` — добавлен экран `delreq`, импортированы `DeleteRequests` и `ApproveDeleteModal`, зарегистрирована модалка `approveDelete`.

---

## Задача 13 выполнена — Аудит-лог

**Что сделано:**

- Создан `core/api_audit.py` с двумя вьюхами:
  - `GET /api/audit-log/` — список записей аудит-лога текущей организации с пагинацией (50 на страницу). Фильтры: `search` (объект, логин, имя), `action` (create/update/delete), `period` (day/week/month/all), `user_id`. Каждая запись содержит: id, ts, user (логин), userName, role, action, label, cls, obj, changes. Поле `changes` вычисляется на сервере: сравниваются `old_data` и `new_data` (JSON), возвращается массив `[{key, label, from, to}]`.
  - `GET /api/audit-log/users/` — список уникальных пользователей с записями в аудит-логе (для фильтра-комбобокса).
- В `config/urls.py` добавлены маршруты `/api/audit-log/` и `/api/audit-log/users/`.
- `frontend/src/screens.jsx` — `AuditLog` переписан: вместо mock-данных — загрузка из API с серверной фильтрацией и пагинацией (prev/next кнопки). Поиск по Enter, фильтры по пользователю/действию/периоду отправляются на сервер. Скелетон при загрузке.
- `frontend/src/main.jsx` — импортированы `AuditLog` и `AuditDiffModal`, добавлен экран `audit`, зарегистрирована модалка `auditDiff`. Клик по строке таблицы открывает `AuditDiffModal` с реальными данными о изменениях.
- `AuditDiffModal` уже корректно отображает реальные `changes` — показывает diff-карточки с полем «до» и «после».

---

## Задача 10 выполнена — Должности

**Что сделано:**

- Задача реализована в рамках Задачи 7 (Сотрудники). `core/api_positions.py` создан тогда же: список должностей с количеством сотрудников, создание (POST), редактирование (PATCH).
- В `config/urls.py` добавлены маршруты `GET/POST /api/positions/` и `PATCH /api/positions/{id}/`.
- `frontend/src/screens.jsx` — `PositionList`: таблица с реальными данными (название, кол-во сотрудников), кнопка «Редактировать» на каждой строке, состояние загрузки со скелетоном.
- `frontend/src/modals.jsx` — `PositionFormModal`: создание и редактирование должности, реальные вызовы API, валидация и показ ошибок.
- `frontend/src/main.jsx` — экран `positions` зарегистрирован, модалка `positionForm` подключена.

---

## Задача 14 выполнена — Документы

**Что сделано:**

- `core/api_documents.py` — добавлен GET-метод в `DocumentDetailView`: `GET /api/documents/{id}/` скачивает файл как attachment (FileResponse), не требует отдельного маршрута — уже был в `config/urls.py`.
- `frontend/src/screens.jsx` — в `EmployeeDetail` добавлена функция `handleDeleteDoc` (удаление документа через `DELETE /api/documents/{id}/`).
- Секция документов в `EmployeeDetail` теперь отображается всегда (не только когда `length > 0`): показывает заглушку «Документы не загружены» при пустом списке, кнопку «Загрузить» всегда видна.
- В таблице документов сотрудника добавлена кнопка удаления в последней колонке.
- Поведение теперь идентично секции документов в `StudentDetail`.

---

## Исправление: кнопка «Выйти» (PLAN задача 1)

**Что сделано:**

- `frontend/src/shell.jsx` — кнопка «Выйти» теперь открывает модал подтверждения (`openModal('logout')`), а не вызывает logout напрямую.
- `frontend/src/modals.jsx` — `LogoutModal` получил проп `onLogout`; при нажатии «Выйти» в модале реально вызывается `onLogout()` (удаление токенов + переход на экран входа). Раньше модал только закрывал сам себя.
- `frontend/src/main.jsx` — добавлен импорт `LogoutModal` и обработчик `modal.name === 'logout'` в `renderModal`, а также слушатель события `auth:logout` в компоненте `App` для плавного выхода без перезагрузки страницы.
- `frontend/src/api.js` — заменены оба вызова `window.location.href = '/'` на `window.dispatchEvent(new Event('auth:logout'))`. Теперь при истечении токена нет полной перезагрузки страницы — приложение плавно показывает экран входа.
- Фронтенд пересобран (`npm run build`).

---

## PLAN задача 2 выполнена — Экран выбора/создания организации после входа

**Что сделано:**

- В `frontend/src/main.jsx` добавлен компонент `OrgPickerScreen`.
  - Показывается автоматически, если у вошедшего пользователя `institution === null`.
  - Для роли `owner`: загружает список организаций через `GET /api/organizations/`. Если организаций нет — показывает пустое состояние с формой создания. Если есть — показывает список кликабельных карточек (код, название, число студентов/сотрудников, дата). Клик на карточку вызывает `POST /api/organizations/{id}/switch/`.
  - Кнопка «Создать организацию» раскрывает inline-форму с полем названия; создание вызывает `POST /api/organizations/`, затем автоматически переключается на новую организацию через `POST /api/organizations/{id}/switch/`.
  - Для роли `admin` / `teacher` без назначенной организации — показывает экран ожидания «Ожидайте назначения» с кнопкой «Выйти».
  - После успешного выбора/создания вызывается `loadUser()`, что обновляет `currentUser.institution` и убирает пикер, открывая основное приложение.
- В `AppShell` добавлена проверка: сразу после загрузки пользователя, если `!currentUser.institution` — рендерится `OrgPickerScreen` вместо основного контента.
- Добавлены импорты `useToast`, `LoadButton` из `./utils.jsx` и `I` из `./data.jsx`.
- `npm run build` — собирается без ошибок.

---

## PLAN задача 3 выполнена — Назначение организаций преподавателям/рабочим

**Что сделано:**

- В модели `User` (`core/models.py`) добавлено поле `allowed_institutions = ManyToManyField(Institution, blank=True, related_name='allowed_users')` — хранит список организаций, к которым у пользователя есть доступ.
- Создана и применена миграция `0009_user_allowed_institutions.py`.
- В `core/api_users.py`:
  - `_user_data()` теперь возвращает `institution_ids` (список ID) и `institution_codes` (список кодов) разрешённых организаций.
  - POST `/api/users/` — при создании пользователя автоматически добавляет текущую организацию в `allowed_institutions`. Если в запросе переданы `institution_ids` — ставит именно их.
  - PATCH `/api/users/{id}/` — если переданы `institution_ids`, обновляет M2M. Если активная организация пользователя исчезла из списка — сбрасывает `institution` на первую из разрешённых (или None).
  - GET `/api/users/` — теперь фильтрует по `allowed_institutions=institution` вместо `institution=institution`, чтобы видеть пользователей из нескольких орг.
  - Добавлены `prefetch_related('allowed_institutions')` для оптимизации запросов.
- В `frontend/src/modals.jsx` — `UserFormModal` расширен:
  - При загрузке запрашивает `/api/organizations/` — список организаций владельца.
  - Показывает блок «Доступ к организациям» с чекбоксами для каждой организации (код + название).
  - Исходное состояние чекбоксов берётся из `user.institution_ids`.
  - Выбранные `institution_ids` отправляются в POST/PATCH запросах.
  - Валидация: нельзя сохранить без выбранной хотя бы одной организации.
- В `frontend/src/screens.jsx` — таблица `UserList` получила новую колонку «Организации», показывающую коды организаций в виде бейджей (или «нет» если пусто).
- `npm run build` — собирается без ошибок.

---

## Задача 15 выполнена — Финальная очистка

**Что сделано:**

- Удалена папка `templates/` — все HTML-шаблоны Django больше не нужны (фронт в React).
- `core/views.py` заменён на минимальный файл: только функция `serve_frontend`, которая отдаёт `frontend/dist/index.html` (или статические файлы из `frontend/dist/`, если они существуют).
- `core/urls.py` очищен — все маршруты уже в `config/urls.py`.
- В `config/urls.py` добавлен catch-all маршрут для React SPA: все пути, не начинающиеся с `/api/` или `/media/`, отдаются через `serve_frontend`.
- Из `requirements.txt` удалены `django-crispy-forms` и `crispy-bootstrap5`.
- Из `config/settings.py` убраны: `crispy_forms`, `crispy_bootstrap5` из INSTALLED_APPS, настройки CRISPY_*, LOGIN_URL/LOGIN_REDIRECT_URL/LOGOUT_REDIRECT_URL, несуществующая `STATICFILES_DIRS`, устаревший контекст-процессор.
- `Запустить проект.bat` обновлён: при запуске сервера автоматически выполняется `npm run build` в папке `frontend/`.
- Обновлена документация: `docs/architecture.md` и `docs/deployment.md` отражают новый стек (React SPA + DRF вместо Django Templates).
- Проверено: `python manage.py check` — 0 ошибок; `GET http://127.0.0.1:8000/` — HTTP 200, React SPA загружается.

---

## PLAN задача 5 выполнена — Комплексное исправление визуальных ошибок по всему сайту

**Что исправлено:**

- `frontend/src/shell.jsx` — три несуществующие CSS-переменные: `--border-faint` → `--border`, `--surface-hover` → `--surface-alt`, `--danger` → `--bad-fg`. Из-за них: границы между результатами поиска были невидимы, hover-фон в поиске не срабатывал, бейдж счётчика заявок на удаление в сайдбаре был прозрачным (невидимым).
- `frontend/src/screens.jsx` — `EmployeeList` и `ParentList`: компонент `Pager` вызывался с неправильными пропами (`page`/`numPages`/`onPage` вместо объекта `pager` от `usePager`). Это вызывало краш при наличии 2+ страниц. Заменено на ручную навигацию (←/→ кнопки) — как в StudentList и AuditLog.
- `frontend/src/screens.jsx` — `UserList`: бейдж статуса пользователя показывал "Зачислен" вместо "Активен" (Badge с `status="enrolled"` игнорировал переданный текст). Исправлено на прямой span с классом `badge-ok`.
- `frontend/src/screens.jsx` — карточки организаций: кнопка «Редактировать» имела `flex: 0` для неактивных организаций (css-сокращение устанавливало `flex-basis: 0`). Заменено на `{}` — кнопка занимает естественный размер.
- `frontend/src/screens.jsx` — `SkeletonRows` в двух местах вызывался с `n={5}` вместо `rows={5}`, пропс игнорировался (фалбэк на дефолт 5 — незаметно, но неправильно). Исправлено.
- `frontend/src/main.jsx` — `OrgPickerScreen`: кнопка «Выйти из аккаунта» находилась в `div.modal-foot` (который имеет `justify-content: flex-end`), из-за чего прижималась к правому краю карточки. Заменено на обычный div с границей сверху — кнопка теперь слева.
- Фронтенд пересобран (`npm run build` — успешно, ошибок нет).

---

## PLAN задача 4 выполнена — Автоматический выбор организации для преподавателя/рабочего

**Что сделано:**

- `core/api_organizations.py` — добавлен `AllowedOrganizationsView` (GET `/api/organizations/allowed/`): возвращает список разрешённых организаций для текущего non-owner пользователя. Также исправлен `OrganizationSwitchView` — теперь admin/teacher может переключаться между своими `allowed_institutions`.
- `config/urls.py` — добавлен маршрут `/api/organizations/allowed/`.
- `frontend/src/main.jsx` — `OrgPickerScreen`:
  - Для admin/teacher: загружает `/api/organizations/allowed/`.
  - Если 1 организация — автоматически переключается на неё и заходит в систему.
  - Если несколько — показывает экран выбора (список карточек, без кнопки создания).
  - Если 0 — показывает экран «Ожидайте назначения».
- Фронтенд пересобран (`npm run build` — успешно).

---

## PLAN задача 7 выполнена — Организации это не вкладка + владелец без требования орг

**Что сделано:**

- `frontend/src/shell.jsx` — удалена секция «Организации» с пунктом «Мои организации» из боковой навигации владельца. Организации больше не раздел в сайдбаре.
- `frontend/src/shell.jsx` — строка «Организация: [Название]» в топбаре стала кликабельной кнопкой: клик открывает экран управления организациями (`org-picker`). Рядом с названием добавлен шеврон.
- `frontend/src/main.jsx` — владелец (`role === 'owner`) больше не блокируется экраном выбора организации: если нет активной организации — он попадает прямо в приложение (не на OrgPickerScreen).
- `frontend/src/main.jsx` — `OrgPickerScreen` полностью переработан:
  - Добавлен проп `onBack` — если передан, в подвале появляется кнопка «Назад».
  - Для каждой организации добавлены кнопки редактирования (inline-форма) и удаления (с подтверждением).
  - Функция загрузки вынесена в отдельный `load()` для повторного вызова после изменений.
  - Отображается количество студентов, сотрудников, дата создания и признак «активна».
- `frontend/src/main.jsx` — экран `'org-picker'` зарегистрирован в `renderScreen` (вместо `'org-list'`). Переход со страницы приложения: после выбора — перезагрузка данных пользователя + переход на дашборд.
- `frontend/src/screens.jsx` — `DashboardOwner`: добавлен жёлтый баннер «Организация не выбрана» с ссылкой на `org-picker` — показывается только если у владельца нет активной организации.
- `npm run build` — собирается без ошибок.
