# Полная карта проекта — АИС колледжа

> Документ создан для подготовки к сдаче дипломной работы.  
> Содержит исчерпывающее описание проекта на основе анализа исходного кода.

---

## 1. Технологический стек

### Бэкенд

| Технология | Версия | Роль |
|---|---|---|
| Python | ~3.11+ | Основной язык бэкенда |
| Django | 4.2 | Веб-фреймворк |
| Django REST Framework | последняя | REST API |
| djangorestframework-simplejwt | последняя | JWT-аутентификация |
| django-cors-headers | последняя | CORS для dev-окружения |
| Pillow | последняя | Обработка изображений (загрузка фото) |
| openpyxl | последняя | Экспорт в Excel |

### Фронтенд

| Технология | Версия | Роль |
|---|---|---|
| React | 19.2.6 | UI-фреймворк (SPA) |
| Vite | 8.0.12 | Сборщик, dev-сервер |
| Axios | 1.16.0 | HTTP-клиент к API |
| CSS (кастомный) | - | `styles.css` - вся стилизация без UI-библиотек |

### База данных

| Технология | Роль |
|---|---|
| SQLite | Единственная СУБД (файл `db.sqlite3`) |
| Django ORM | Все запросы к БД только через ORM |

### Архитектура

**React SPA + Django REST API** - не MVC, а разделённый фронт/бэк:
- Django отдаёт `frontend/dist/index.html` на все маршруты кроме `/api/*`
- React управляет маршрутизацией внутри SPA (через `window.history.pushState`)
- Вся бизнес-логика - в DRF APIView-классах

---

## 2. Структура проекта

```
Программа/
├── config/                   — конфигурация Django-проекта
│   ├── settings.py           — настройки (БД, JWT, Email, CORS)
│   ├── urls.py               — все маршруты (API + catch-all → SPA)
│   ├── wsgi.py / asgi.py     — точки входа для деплоя
├── core/                     — единственное Django-приложение
│   ├── models.py             — все 14 моделей БД
│   ├── views.py              — serve_frontend() — отдаёт SPA
│   ├── utils.py              — log_action(), email-хелперы, декораторы ролей
│   ├── api_auth.py           — авторизация, регистрация, восстановление пароля
│   ├── api_main.py           — /me/, /dashboard/, валидация полей
│   ├── api_organizations.py  — учебные заведения
│   ├── api_faculties.py      — факультеты
│   ├── api_groups.py         — группы + предметы в группах
│   ├── api_employees.py      — сотрудники + аккаунты
│   ├── api_students.py       — студенты + опекуны студента
│   ├── api_parents.py        — опекуны + студенты опекуна
│   ├── api_subjects.py       — предметы
│   ├── api_positions.py      — должности
│   ├── api_documents.py      — документы (загрузка файлов)
│   ├── api_users.py          — управление пользователями
│   ├── api_delete_requests.py — заявки на удаление
│   ├── api_audit.py          — журнал изменений + откат + экспорт
│   ├── api_notes.py          — вопросы к записям
│   ├── api_profile.py        — профиль текущего пользователя
│   ├── api_dev.py            — dev-инструменты (HTML-задачи)
│   ├── middleware.py         — InitializationMiddleware
│   ├── admin.py              — Django admin
│   ├── migrations/           — 4 файла миграций
│   ├── management/commands/  — create_superadmin, seed_data, create_demo_users
│   └── tests/                — 15 файлов автотестов (requests к API)
├── frontend/
│   ├── src/
│   │   ├── main.jsx          — точка входа React, корневой App, роутинг
│   │   ├── shell.jsx         — Shell (navbar + sidebar), Avatar, Crumbs
│   │   ├── screens.jsx       — все основные экраны (списки, детали)
│   │   ├── modals.jsx        — все модальные окна (формы, подтверждения)
│   │   ├── auth.jsx          — экраны авторизации (Login, Register, Recover)
│   │   ├── profile.jsx       — экран профиля владельца
│   │   ├── api.js            — axios-инстанс с JWT-перехватчиком
│   │   ├── data.jsx          — иконки (I), константы
│   │   ├── utils.jsx         — useToast, usePager, useSortable, Field, LoadButton
│   │   ├── styles.css        — все CSS-стили (custom properties, компоненты)
│   │   ├── dev-tasks.jsx     — панель HTML-задач (dev-инструмент)
│   │   └── tweaks-panel.jsx  — пикер элементов интерфейса (dev-инструмент)
│   ├── dist/                 — собранный билд (отдаётся Django)
│   ├── package.json          — зависимости фронтенда
│   └── vite.config.js        — конфигурация Vite
├── media/                    — загруженные файлы (фото, документы)
├── docs/                     — проектная документация (.md файлы)
├── db.sqlite3                — база данных SQLite
├── manage.py                 — Django CLI
├── requirements.txt          — зависимости Python
├── .env.example              — пример переменных окружения
└── CLAUDE.md                 — инструкции для AI-ассистента
```

---

## 3. База данных

### Таблица: `core_institution` — Учебное заведение

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| owner_id | FK → User | Владелец |
| code | VARCHAR(50) | Короткий код (уникален по owner) |
| name | VARCHAR(1000) | Полное название |
| description | TEXT | Описание |
| photo | ImageField | Фото (upload: institutions/) |
| founded_date | DATE | Дата основания |
| created_at | DATETIME | Дата добавления |

### Таблица: `core_faculty` — Факультет

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| full_name | VARCHAR(255) | Полное название |
| short_name | VARCHAR(50) | Аббревиатура |
| created_at | DATE | Дата создания |
| is_flagged | BOOLEAN | Флаг внимания |

Ограничение: unique_together = (institution, full_name), (institution, short_name)

### Таблица: `core_position` — Должность

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| name | VARCHAR(255) | Название |
| role_type | VARCHAR(20) | admin / teacher / none |

### Таблица: `core_employee` — Сотрудник

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| last_name | VARCHAR(100) | Фамилия |
| first_name | VARCHAR(100) | Имя |
| middle_name | VARCHAR(100) | Отчество |
| birth_date | DATE | |
| phone | VARCHAR(20) | |
| email | EmailField | |
| photo | ImageField | upload: employees/ |
| is_flagged | BOOLEAN | |
| position_id | FK → Position (SET_NULL) | |

Дополнительно: M2M `taught_subjects` → Subject (ведёт предмет вообще)

### Таблица: `core_group` — Учебная группа

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| group_number | POSITIVE INT | Автогенерируется при создании |
| year | INT | Год начала |
| faculty_id | FK → Faculty (CASCADE) | |
| headteacher_id | FK → Employee (SET_NULL) | Классный руководитель |
| is_flagged | BOOLEAN | |

Имя группы - вычисляемое свойство: `{faculty.short_name}-{group_number}-{year[-2:]}`

### Таблица: `core_student` — Студент

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| last_name | VARCHAR(100) | Фамилия |
| first_name | VARCHAR(100) | Имя |
| middle_name | VARCHAR(100) | Отчество |
| birth_date | DATE | |
| phone | VARCHAR(20) | |
| email | EmailField | |
| photo | ImageField | upload: students/ |
| is_flagged | BOOLEAN | |
| group_id | FK → Group (SET_NULL) | Может быть NULL |
| faculty_id | FK → Faculty (SET_NULL) | |

### Таблица: `core_parent` — Опекун/родитель

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| last_name | VARCHAR(100) | |
| first_name | VARCHAR(100) | |
| middle_name | VARCHAR(100) | |
| birth_date | DATE | |
| phone | VARCHAR(20) | |
| email | EmailField | |
| photo | ImageField | upload: parents/ |
| is_flagged | BOOLEAN | |

### Таблица: `core_studentparent` — Связь студент-опекун

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| student_id | FK → Student (CASCADE) | |
| parent_id | FK → Parent (CASCADE) | |
| relation_type | VARCHAR(20) | mother / father / guardian |

Ограничение: unique_together = (student, parent)

### Таблица: `core_subject` — Учебный предмет

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution | |
| name | VARCHAR(255) | Название |

### Таблица: `core_groupsubjectemployee` — Предмет в группе

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| group_id | FK → Group (CASCADE) | |
| subject_id | FK → Subject (CASCADE) | |
| employee_id | FK → Employee (CASCADE) | Преподаватель |

Ограничение: unique_together = (group, subject) — один предмет в группе, один преподаватель

### Таблица: `core_document` — Документ

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| owner_type | VARCHAR(20) | student / employee / parent |
| owner_id | INT | ID владельца (без GenericForeignKey) |
| name | VARCHAR(255) | Название |
| description | TEXT | |
| doc_type | VARCHAR(20) | passport / snils / policy / certificate / order / other |
| file | FileField | upload: documents/ |
| uploaded_at | DATE | |

### Таблица: `core_user` — Пользователь системы (кастомная модель)

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| username | VARCHAR(150) unique | Логин |
| display_name | VARCHAR(150) | Отображаемое имя |
| email | EmailField | |
| role | VARCHAR(20) | owner / admin / teacher |
| institution_id | FK → Institution (SET_NULL) | Текущая организация |
| employee_id | OneToOne → Employee (CASCADE) | Привязка к сотруднику |
| allowed_institutions | M2M → Institution | Доступные организации (для owner) |
| photo | ImageField | upload: users/ |
| is_active | BOOLEAN | |
| is_staff | BOOLEAN | |
| password_changed_at | DATETIME | |

### Таблица: `core_emailcode` — Коды подтверждения email

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| email | EmailField | |
| login | VARCHAR(150) | |
| code | VARCHAR(6) | 6-символьный код |
| purpose | VARCHAR(20) | register / recover / delete_org / change_email / delete_account |
| payload | TEXT | JSON-данные |
| expires_at | DATETIME | |
| used | BOOLEAN | |
| attempts | INT | Количество неверных попыток |
| created_at | DATETIME | |

### Таблица: `core_deleterequest` — Заявка на удаление

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → User (CASCADE) | Инициатор |
| object_type | VARCHAR(50) | Faculty / Group / Position / Student / Employee / Parent / Subject |
| object_id | INT | ID объекта |
| reason | TEXT | Причина |
| status | VARCHAR(20) | pending / approved / rejected / cancelled |
| created_at | DATETIME | |

### Таблица: `core_recordnote` — Вопрос к записи

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| institution_id | FK → Institution (CASCADE) | |
| object_type | VARCHAR(50) | Тип объекта |
| object_id | INT | ID объекта |
| question | TEXT(2000) | Вопрос |
| is_resolved | BOOLEAN | |
| created_by_id | FK → User (SET_NULL) | |
| resolved_by_id | FK → User (SET_NULL) | |
| created_at | DATETIME | |
| resolved_at | DATETIME | |

### Таблица: `core_auditlog` — Журнал изменений

| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → User (SET_NULL) | |
| institution_id | FK → Institution (SET_NULL) | |
| action | VARCHAR(20) | created / updated / deleted |
| object_type | VARCHAR(50) | Тип изменённого объекта |
| object_id | INT | ID изменённого объекта |
| old_data | TEXT | JSON-снимок до изменения |
| new_data | TEXT | JSON-снимок после изменения |
| created_at | DATETIME | |

### Таблица: `core_feedbackcomment` — Комментарий к интерфейсу (dev)

| Поле | Тип |
|---|---|
| page_url | VARCHAR(500) |
| selector | TEXT |
| element_preview | VARCHAR(200) |
| comment | TEXT |
| created_at | DATETIME |

### Схема связей

```
User ──M2M──> Institution (allowed_institutions)
User ──FK──>  Institution (текущая)
User ──1:1──> Employee

Institution <──FK── Faculty
Institution <──FK── Position
Institution <──FK── Employee
Institution <──FK── Student
Institution <──FK── Parent
Institution <──FK── Subject
Institution <──FK── User

Faculty <──FK── Group
Group ──FK──> Employee (headteacher)
Group <──M2M── Subject (через GroupSubjectEmployee + Employee)

Student ──FK──> Group
Student ──FK──> Faculty
Student <──M2M── Parent (через StudentParent + relation_type)

Document — привязан к student/employee/parent через owner_type + owner_id
AuditLog — привязан к User + Institution
DeleteRequest — привязан к User
RecordNote — привязан к Institution + User
```

---

## 4. Маршруты и API (70 эндпоинтов)

### Аутентификация

| Метод | Маршрут | Функция |
|---|---|---|
| POST | `/api/auth/login/` | Вход, получение JWT |
| POST | `/api/auth/register/` | Шаг 1 регистрации - отправка кода на email |
| POST | `/api/auth/verify-email/` | Шаг 2 - подтверждение кода, создание аккаунта |
| POST | `/api/auth/resend-register-code/` | Повторная отправка кода |
| POST | `/api/auth/refresh/` | Обновление JWT |
| POST | `/api/auth/logout/` | Выход |
| POST | `/api/auth/recover/send-code/` | Запрос кода восстановления пароля |
| POST | `/api/auth/recover/` | Смена пароля по коду |
| GET | `/api/auth/check-availability/` | Проверка доступности логина/email |

### Профиль текущего пользователя

| Метод | Маршрут | Функция |
|---|---|---|
| GET | `/api/me/` | Данные текущего пользователя |
| PATCH | `/api/me/update/` | Изменение имени/логина |
| POST | `/api/me/change-password/` | Смена пароля |
| POST | `/api/me/change-email/` | Запрос смены email (отправка кода) |
| POST | `/api/me/confirm-email/` | Подтверждение нового email |
| POST | `/api/me/delete-account/send-code/` | Запрос кода удаления аккаунта |
| POST | `/api/me/delete-account/confirm/` | Подтверждение удаления аккаунта |
| PATCH | `/api/me/photo/` | Загрузка фото профиля |

### Основные данные

| Метод | Маршрут | Функция |
|---|---|---|
| GET | `/api/dashboard/` | Статистика по роли пользователя |
| GET | `/api/teacher/my-subjects/` | Предметы преподавателя |
| POST | `/api/validate-person-field/` | Валидация уникальности email/телефона |

### Организации

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/organizations/` | Список / создание |
| GET | `/api/organizations/allowed/` | Доступные организации |
| GET/PUT/DELETE | `/api/organizations/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/organizations/<pk>/switch/` | Переключение организации |
| POST | `/api/organizations/<pk>/send-delete-code/` | Код подтверждения удаления |

### Факультеты

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/faculties/` | Список / создание |
| GET/PUT/DELETE | `/api/faculties/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/faculties/<pk>/delete-request/` | Заявка на удаление |
| POST | `/api/faculties/<pk>/flag/` | Установка/снятие флага |

### Группы

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/groups/` | Список / создание |
| GET/PUT/DELETE | `/api/groups/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/groups/<pk>/delete-request/` | Заявка на удаление |
| POST | `/api/groups/<pk>/flag/` | Флаг |
| GET/POST | `/api/groups/<pk>/subjects/` | Предметы группы / добавить предмет |
| DELETE | `/api/groups/<pk>/subjects/<assignment_pk>/` | Убрать предмет из группы |

### Сотрудники

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/employees/` | Список / создание |
| GET/PUT/DELETE | `/api/employees/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/employees/<pk>/delete-request/` | Заявка на удаление |
| POST | `/api/employees/<pk>/flag/` | Флаг |
| GET/POST/DELETE | `/api/employees/<pk>/account/` | Управление аккаунтом сотрудника |
| GET/POST | `/api/employees/<pk>/subjects/` | Предметы в группах |
| DELETE | `/api/employees/<pk>/subjects/<assignment_pk>/` | Убрать из группы |
| GET/POST | `/api/employees/<pk>/taught-subjects/` | Ведёт предметы (список) |
| DELETE | `/api/employees/<pk>/taught-subjects/<subject_pk>/` | Убрать предмет |

### Предметы

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/subjects/` | Список / создание |
| GET/PUT/DELETE | `/api/subjects/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/subjects/<pk>/delete-request/` | Заявка на удаление |
| GET | `/api/subjects/<pk>/employees/` | Преподаватели предмета |
| DELETE | `/api/subjects/<pk>/employees/<employee_pk>/` | Убрать преподавателя |

### Студенты

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/students/` | Список / создание |
| GET/PUT/DELETE | `/api/students/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/students/<pk>/delete-request/` | Заявка на удаление |
| POST | `/api/students/<pk>/flag/` | Флаг |
| GET/POST | `/api/students/<pk>/parents/` | Опекуны студента / добавить |
| DELETE | `/api/students/<pk>/parents/<sp_pk>/` | Убрать опекуна |

### Должности

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/positions/` | Список / создание |
| GET/PUT/DELETE | `/api/positions/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/positions/<pk>/delete-request/` | Заявка на удаление |

### Опекуны

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/parents/` | Список / создание |
| GET/PUT/DELETE | `/api/parents/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/parents/<pk>/delete-request/` | Заявка на удаление |
| POST | `/api/parents/<pk>/flag/` | Флаг |
| GET | `/api/parents/<pk>/students/` | Студенты опекуна |
| DELETE | `/api/parents/<pk>/students/<sp_pk>/` | Убрать студента |

### Документы

| Метод | Маршрут | Функция |
|---|---|---|
| POST | `/api/documents/upload/` | Загрузка документа |
| GET/DELETE | `/api/documents/<pk>/` | Просмотр / удаление |

### Пользователи

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/users/` | Список / создание |
| GET/PUT/DELETE | `/api/users/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/users/<pk>/set-password/` | Смена пароля пользователя |

### Заявки на удаление

| Метод | Маршрут | Функция |
|---|---|---|
| GET | `/api/delete-requests/` | Список заявок |
| GET | `/api/delete-requests/count/` | Счётчик ожидающих заявок |
| POST | `/api/delete-requests/<pk>/approve/` | Одобрить (с паролем) |
| POST | `/api/delete-requests/<pk>/reject/` | Отклонить |
| POST | `/api/delete-requests/<pk>/cancel/` | Отозвать |

### Журнал изменений

| Метод | Маршрут | Функция |
|---|---|---|
| GET | `/api/audit-log/` | Список записей (пагинация PAGE_SIZE=50) |
| GET | `/api/audit-log/export/` | Экспорт в Excel (.xlsx) |
| GET | `/api/audit-log/users/` | Пользователи для фильтра |
| POST | `/api/audit-log/<pk>/rollback/` | Откат изменений |

### Вопросы к записям

| Метод | Маршрут | Функция |
|---|---|---|
| GET/POST | `/api/notes/` | Список / создание вопроса |
| GET/PUT/DELETE | `/api/notes/<pk>/` | Получение / редактирование / удаление |
| POST | `/api/notes/<pk>/resolve/` | Закрыть вопрос |

### Catch-all

| Метод | Маршрут | Функция |
|---|---|---|
| GET | `/*` | serve_frontend → `frontend/dist/index.html` |

---

## 5. Роли и права доступа

### Список ролей

- **owner** — Владелец: создаёт организации, управляет всем
- **admin** — Администратор: управляет данными, создаёт заявки на удаление
- **teacher** — Преподаватель: видит только свои группы и студентов

### Таблица прав

| Возможность | teacher | admin | owner |
|---|:---:|:---:|:---:|
| Вход в систему | + | + | + |
| Просмотр своих групп и студентов | + | + | + |
| Просмотр всех данных организации | - | + | + |
| Создание и редактирование записей | - | + | + |
| Создание заявки на удаление | - | + | - |
| Прямое удаление | - | - | + |
| Одобрение/отклонение заявок | - | - | + |
| Управление пользователями | - | - | + |
| Управление должностями | - | - | + |
| Управление организациями | - | - | + |
| Просмотр журнала изменений | - | - | + |
| Добавление вопроса к записи | - | + | + |
| Закрытие вопроса | - | - | + |
| Откат изменений в журнале | - | + | + |
| Экспорт в Excel | - | + | + |

### Особенности

- `teacher` видит только группы, где он назначен классным руководителем (`headteacher`)
- `owner` создаёт пользователей `admin` и `teacher` вручную через `/api/users/`
- `owner` может иметь несколько организаций и переключаться между ними
- `owner` регистрируется самостоятельно через публичную форму с подтверждением email
- Должность (`Position`) имеет `role_type`, который определяет роль пользователя при создании аккаунта сотруднику

### Двухуровневое удаление

Объекты никогда не удаляются мгновенно через `admin`:

1. `admin` создаёт `DeleteRequest` с указанием причины - статус `pending`
2. `owner` просматривает заявки и:
   - **Одобряет**: вводит свой пароль → объект физически удаляется → в `AuditLog` пишется `deleted`
   - **Отклоняет**: статус `rejected`, объект остаётся
3. `owner` может удалять объекты и **напрямую** через DELETE-запросы

---

## 6. Функциональные возможности

### Авторизация

- Вход по логину и паролю (JWT: access 60 мин, refresh 30 дней)
- Регистрация `owner` через форму с подтверждением email (6-символьный код, 15 мин)
- Повторная отправка кода (cooldown 60 сек, не более 3 запросов за 15 мин)
- Восстановление пароля через email-код
- Автообновление JWT (axios-перехватчик при 401)
- Правила пароля: 8+ символов, цифра, латинская буква, спецсимвол

### Мультитенантность (несколько организаций)

- `owner` создаёт одну или несколько `Institution`
- После входа выбирает текущую организацию (OrgPickerScreen)
- Все данные (факультеты, студенты, сотрудники и т.д.) привязаны к конкретной `Institution`
- Переключение организации через `/api/organizations/<pk>/switch/`
- Удаление организации требует подтверждения email-кодом

### Факультеты

- Список с поиском
- Создание и редактирование (admin+)
- Детальная страница с группами факультета
- Флаг внимания
- Заявки на удаление / прямое удаление (owner)

### Группы

- Список с поиском (teacher видит только свои)
- Создание и редактирование (admin+)
- Автогенерация номера группы: count(groups in faculty) + 1
- Детальная страница: список студентов, список предметов с преподавателями
- Добавление/удаление предметов в группе (один предмет - один преподаватель)
- Назначение классного руководителя
- Флаг, заявки на удаление

### Студенты

- Список с фильтрами: поиск, факультет, группа, статус
- Создание и редактирование (admin+)
- Статусы с переходами:
  - `pending_review` (на рассмотрении)
  - `pending_enrollment` (на зачисление)
  - `enrolled` (зачислен)
  - `pending_expulsion` (на отчисление)
  - `expelled` (отчислен)
  - `transferred` (переведён)
- Детальная страница: личные данные, опекуны, документы, вопросы
- Привязка/отвязка опекунов с типом связи (мать/отец/опекун)
- Загрузка документов
- Экспорт в Excel
- Флаг, заявки на удаление

### Сотрудники

- Список с поиском (admin+)
- Создание и редактирование с загрузкой фото
- Детальная страница: данные, группы, предметы, документы
- Назначение преподаваемых предметов (taught_subjects - M2M)
- Назначение в качестве классного руководителя
- Создание учётной записи (роль берётся из `position.role_type`)
- Удаление учётной записи
- Флаг, заявки на удаление

### Опекуны

- Список с поиском (admin+)
- Создание и редактирование
- Детальная страница: данные, студенты, документы
- Привязка/отвязка студентов
- Флаг, заявки на удаление

### Предметы

- CRUD (admin+)
- Детальная страница: какие преподаватели ведут, в каких группах

### Должности

- CRUD (owner only)
- Поле `role_type`: определяет роль при создании аккаунта сотруднику
- Заявки на удаление / прямое удаление

### Документы

- Загрузка любых файлов для студента, сотрудника, опекуна
- Просмотр inline для изображений (jpg, jpeg, png, gif, webp)
- Типы: паспорт, СНИЛС, полис ОМС, аттестат, приказ, прочее
- Автоудаление файла с диска при удалении записи (сигналы Django)
- Автозамена старого файла при обновлении (сигналы pre_save)

### Пользователи

- Список и управление (owner only)
- Создание с указанием логина, пароля, роли
- Привязка к конкретному сотруднику (user.employee)
- Смена пароля любого пользователя

### Заявки на удаление

- Двухуровневый процесс: admin создаёт → owner одобряет/отклоняет
- Счётчик ожидающих заявок в сайдбаре (у owner и admin)
- Одобрение требует ввода пароля владельца
- Поддерживаемые типы объектов: Faculty, Group, Position, Student, Employee, Parent, Subject

### Журнал изменений

- Автоматическая запись всех create/update/delete операций (через `log_action()`)
- Хранение JSON-снимков данных до и после изменения
- Фильтры: поиск, действие, период, дата, пользователь, роль, тип объекта
- Пагинация (50 записей на страницу)
- Откат изменений для `updated`-записей (Student, Employee, Faculty, Group, Parent)
- Экспорт в Excel

### Вопросы к записям (RecordNote)

- Привязка вопроса к любому объекту системы
- На одну запись - только один активный (незакрытый) вопрос
- admin создаёт, owner закрывает
- Создатель или owner может удалить вопрос

### Дашборд

**Owner:**
- 10 кликабельных счётчиков: факультеты, группы, студенты, сотрудники, пользователи, предметы, опекуны, должности, заявки, записей в журнале
- Клик по счётчику - переход в соответствующий раздел

**Admin:**
- Статистика по организации

**Teacher:**
- Свои группы (где является классным руководителем)
- Свои предметы

---

## 7. Страницы интерфейса

Маршрутизация - внутри SPA через `window.history.pushState`, без изменения URL.  
Навигация через боковое меню (sidebar) - состав меню зависит от роли.

### Авторизация (без sidebar)

| Экран | Что можно делать |
|---|---|
| Вход | Ввод логина/пароля, переход к регистрации и восстановлению пароля |
| Регистрация | Форма регистрации owner (логин, email, пароль) |
| Подтверждение email | Ввод 6-символьного кода из письма, повторная отправка |
| Настройка организации | Создание первой организации после регистрации |
| Восстановление пароля | Email → код → новый пароль |
| Выбор организации | Выбор активной организации из списка (для owner с несколькими) |

### Основные экраны (с sidebar)

| Экран | Роли | Что можно делать |
|---|---|---|
| Дашборд (owner) | owner | 10 счётчиков с навигацией |
| Дашборд (admin) | admin | Статистика организации |
| Дашборд (teacher) | teacher | Свои группы и предметы |
| Факультеты | admin, owner | Список с поиском, создание, флаг, детальная страница |
| Детальная факультета | admin, owner | Редактирование, список групп, удаление |
| Группы | все | Список с поиском, создание, детальная страница |
| Детальная группы | все | Список студентов, предметы группы, редактирование |
| Студенты | все | Список с фильтрами, создание, экспорт в Excel |
| Детальная студента | все | Редактирование, смена статуса, опекуны, документы, вопросы |
| Сотрудники | admin, owner | Список с поиском, создание, управление аккаунтами |
| Детальная сотрудника | admin, owner | Редактирование, предметы, руководство группами, документы |
| Предметы | admin, owner | Список, создание, детальная страница |
| Детальная предмета | admin, owner | Преподаватели, группы, редактирование |
| Опекуны | admin, owner | Список с поиском, создание |
| Детальная опекуна | admin, owner | Редактирование, студенты, документы |
| Должности | owner | CRUD должностей с role_type |
| Пользователи | owner | Создание, редактирование, смена пароля, привязка к сотруднику |
| Заявки на удаление | owner, admin | Список, одобрение с паролем, отклонение |
| Журнал изменений | owner | Список с фильтрами, откат, экспорт |
| Мои предметы | teacher | Список предметов с группами |
| Мои данные | admin, teacher | Данные сотрудника, привязанного к аккаунту |
| Профиль | owner | Смена имени/логина, пароля, email, фото, удаление аккаунта |

### Состав бокового меню по ролям

**Owner:**
- Главное: Дашборд
- Учебная структура: Факультеты, Группы, Предметы
- Люди: Сотрудники, Студенты, Опекуны
- Администрирование: Пользователи, Должности, Заявки на удаление (со счётчиком), Журнал изменений

**Admin:**
- Главное: Дашборд
- Личный кабинет: Мои данные
- Учебная структура: Группы, Предметы
- Люди: Сотрудники, Студенты, Опекуны
- Прочее: Заявки на удаление (со счётчиком)

**Teacher:**
- Главное: Дашборд
- Личный кабинет: Мои данные
- Рабочее: Мои предметы, Мои группы, Мои студенты

### Адаптивность

Мобильной вёрстки нет. Интерфейс рассчитан на десктоп с фиксированным sidebar.

---

## 8. Сигналы и автоматизация

### Удаление файлов (сигналы Django)

При удалении записи автоматически удаляются файлы с диска:
- `post_delete` → `Institution.photo`
- `post_delete` → `Employee.photo`
- `post_delete` → `Student.photo`
- `post_delete` → `Parent.photo`
- `post_delete` → `User.photo`
- `post_delete` → `Document.file`

При обновлении записи старый файл заменяется:
- `pre_save` → проверка изменения photo у Institution, Employee, Student, Parent, User

### Автогенерация номера группы

При создании новой группы `group_number` вычисляется автоматически:
```python
count = Group.objects.filter(faculty_id=self.faculty_id, year=self.year).count()
self.group_number = count + 1
```

### Аудит (log_action)

Функция `log_action()` в `core/utils.py` вызывается при каждом create/update/delete.  
Записывает в `AuditLog`: пользователь, организация, действие, тип объекта, ID, JSON до/после.

---

## 9. Аутентификация и безопасность

### JWT

- Access token: 60 минут
- Refresh token: 30 дней
- Хранение: `localStorage` (access_token, refresh_token)
- Автообновление: axios-перехватчик при получении 401 вызывает `/api/auth/refresh/`
- При неудаче обновления: emit `auth:logout`, очистка localStorage

### Email-коды

- 6 символов, TTL 15 минут
- Не более 5 неверных попыток
- Cooldown 60 секунд между повторными отправками
- Не более 3 запросов за 15 минут
- Транспорт: Gmail SMTP (SSL, порт 465)

### Пароль

Правила нового пароля:
- Минимум 8 символов
- Хотя бы одна цифра
- Хотя бы одна латинская буква
- Хотя бы один спецсимвол: `_-!@#$%^&*+.,;:?`
- Нельзя использовать текущий пароль повторно

### Изоляция данных

Все запросы к данным фильтруются по `institution` текущего пользователя.  
`teacher` дополнительно фильтруется только по своим группам (headteacher).

---

## 10. Управляющие команды

```bash
# Создание суперадминистратора (owner)
python manage.py create_superadmin

# Заполнение тестовыми данными
python manage.py seed_data

# Создание демо-пользователей
python manage.py create_demo_users

# Применение миграций
python manage.py migrate

# Запуск dev-сервера
python manage.py runserver
```

---

## 11. Переменные окружения (.env)

| Переменная | Описание |
|---|---|
| `SECRET_KEY` | Секретный ключ Django |
| `EMAIL_HOST_USER` | Gmail-адрес отправителя |
| `EMAIL_HOST_PASSWORD` | App Password Gmail (16 символов) |

---

## 12. Тесты

Папка `core/tests/` содержит 15 файлов автотестов:

| Файл | Что тестируется |
|---|---|
| `test_auth.py` | Регистрация, вход, JWT, восстановление пароля |
| `test_dashboard.py` | Дашборд по ролям |
| `test_faculties.py` | CRUD факультетов, права доступа |
| `test_groups.py` | CRUD групп, предметы в группах |
| `test_students.py` | CRUD студентов, статусы, опекуны |
| `test_employees.py` | CRUD сотрудников, аккаунты |
| `test_guardians.py` | CRUD опекунов |
| `test_subjects.py` | CRUD предметов |
| `test_positions.py` | CRUD должностей |
| `test_users.py` | Управление пользователями |
| `test_delete_requests.py` | Заявки на удаление |
| `test_audit.py` | Журнал изменений, откат |
| `test_permissions.py` | Проверка прав по ролям |
| `test_models.py` | Модели БД |
| `test_org_picker.py` | Выбор организации |

Тесты используют библиотеку `requests` к реальному API (не mock).  
Запуск: `python -m pytest core/tests/` или отдельный файл.
