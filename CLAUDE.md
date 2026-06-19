# CLAUDE.md

Django-проект (дипломная работа) — АИС для управления студентами, сотрудниками, группами и документами учебного заведения.

---

## ОБЯЗАТЕЛЬНО В НАЧАЛЕ КАЖДОГО ЧАТА

> **ВАЖНО:** Все задачи пользователь пишет напрямую в чат. Никаких TASK.md, PLAN.md и других файлов задач не существует. Выполнять только то, что написано в текущем сообщении чата.

> **ГЛАВНЫЙ ДОКУМЕНТ ПРОЕКТА:** `env/ПУШКОВ-3-22.docx` — это дипломная работа, на требования которой нужно равняться при любых решениях по функциональности, структуре и логике системы.

---

## Команды разработки

```bash
python manage.py runserver        # запуск dev-сервера
python manage.py migrate          # применить миграции
python manage.py makemigrations   # создать миграцию после изменения models.py
python manage.py create_superadmin  # создать admin / admin_-1
python manage.py seed_data        # заполнить тестовыми данными
```

Виртуальное окружение: `venv\Scripts\activate` (Windows).  
Быстрый старт: `Запустить проект.bat` в корне.  
Адрес: `http://127.0.0.1:8000/`. Тестов нет — проверка вручную через браузер.

Фронтенд (hot reload):
```bash
# Терминал 1: python manage.py runserver
# Терминал 2: cd frontend && npm run dev   → http://localhost:5173
```

После изменений в `frontend/src/`: `cd frontend && npm run build`.

---

## Секреты и переменные окружения

Все секреты только в `env/.env` (в `.gitignore`, никогда не коммитить):
- `SECRET_KEY` — секретный ключ Django
- `EMAIL_HOST_USER` — email отправителя (Gmail)
- `EMAIL_HOST_PASSWORD` — App Password Gmail (16 символов, без пробелов)

При добавлении нового секрета: записать в `env/.env`, читать через `os.environ.get(...)` в `settings.py`.  
Образец без значений — `env/.env.example` (можно коммитить).

---

## Архитектура

Весь код — в одном приложении `core`. Архитектура: **React SPA + Django REST Framework API**.

```
core/models.py      — все модели БД (единственный источник истины о данных)
core/views.py       — serve_frontend() — отдаёт frontend/dist/index.html
core/api_*.py       — DRF APIView-классы, один файл на сущность
core/api_auth.py    — логин, регистрация с email-кодом, восстановление пароля
core/urls.py        — все /api/... маршруты + catch-all → serve_frontend
core/utils.py       — log_action(), email-хелперы, декораторы ролей
config/settings.py  — SQLite, DRF, JWT, CORS, Email (Gmail SMTP)
frontend/src/       — React 18 + Vite
  main.jsx          — точка входа, роутинг
  auth.jsx          — экраны авторизации
  shell.jsx         — навигационная оболочка (sidebar + topbar)
  screens.jsx       — все основные экраны (списки, детали)
  modals.jsx        — все модальные формы
  profile.jsx       — экран профиля
  utils.jsx         — Field, FadingError, LoadButton, useToast, PasswordInput
  api.js            — Axios-клиент с JWT + автообновление токена
  styles.css        — дизайн-система
frontend/dist/      — собранный билд, отдаётся Django
```

Кастомная модель `core.User` с полем `role` (`owner` / `admin` / `teacher`).  
Мультитенантность: owner создаёт `Institution`, все сущности привязаны к ней.  
`Document` привязан через `owner_type` (строка) + `owner_id` (int) — без GenericForeignKey.

---

## Правила интерфейса

- **Только дефис `-`** в текстах. Длинное тире `—` и среднее `–` запрещены в JSX/JS-строках.
- **Никаких `placeholder`** на `<input>` и `<textarea>`. Label над полем достаточно.
- **Ограничение длины:**
  - Короткие поля (имена, коды, телефон) — `maxLength={N}` прямо на `<input>`.
  - Длинные поля (`<textarea>`) — без `maxLength`, показывать счётчик `X / MAX символов` + ошибку при превышении.

### Компонент Field (обязательный шаблон для полей ввода)

```jsx
import { Field } from './utils.jsx';

<Field label="Название" required error={touched.name && errs.name}>
  <input
    className={`input ${touched.name && errs.name ? 'is-error' : ''}`}
    value={name}
    onChange={e => setName(e.target.value)}
    onBlur={() => setTouched(t => ({ ...t, name: 1 }))}
    maxLength={255}
  />
</Field>
```

CSS-классы: `input` для `<input>`, `select` для `<select>`, `textarea` для `<textarea>`.  
`Field` рендерит ошибку через `FadingError` — отдельно добавлять не нужно.  
Класс `is-error` добавляет красную рамку. Оба исчезают через 15-20 сек автоматически.

**С err (при сабмите):**
```jsx
<Field label="Название" required error={err && !name.trim() ? err : null}>
  <input className={`input ${err && !name.trim() ? 'is-error' : ''}`}
    onChange={e => { setName(e.target.value); setErr(''); }} ... />
</Field>
```

### Кнопка с лоадером

```jsx
import { LoadButton } from './utils.jsx';
<LoadButton loading={loading} onClick={handleSubmit}>Сохранить</LoadButton>
```

### Toast-уведомления

```jsx
const toast = useToast();
toast.push('Сотрудник добавлен.', { kind: 'ok' });
toast.push('Неверный пароль.', { kind: 'err' });
```

### Права в интерфейсе

```jsx
{user.role !== 'teacher' && <button>Добавить студента</button>}
{user.role === 'owner' && <button>Журнал</button>}
```

---

## Паттерны кода

### Аудит изменений (обязателен при любом create/update/delete)

```python
from .utils import log_action, model_to_dict_safe

# Создание
obj = MyModel.objects.create(...)
log_action(request.user, 'created', obj, new_data=model_to_dict_safe(obj), institution=institution)

# Обновление — сохранить old_data ДО save()
old_data = model_to_dict_safe(instance)
instance.save()
log_action(request.user, 'updated', instance, old_data=old_data, new_data=model_to_dict_safe(instance), institution=institution)

# Удаление
old_data = model_to_dict_safe(obj)
log_action(request.user, 'deleted', obj, old_data=old_data, institution=institution)
obj.delete()
```

### Фильтрация по организации (обязательна во всех DRF-вьюхах)

```python
institution = request.user.institution  # для admin/teacher
# для owner — из сессии, если нужно поддержать переключение организаций
queryset = Faculty.objects.filter(institution=institution)
```

### Проверка ролей в DRF APIView

```python
# В DRF — напрямую:
if request.user.role not in ('owner', 'admin'):
    return Response({'error': 'Доступ запрещён'}, status=403)

# Свойства User: is_owner, is_admin, is_teacher_role
```

Декораторы `@owner_required` / `@admin_required` из `core/utils.py` — только для Django-вьюх (не для DRF).

### Уникальность email и телефона для персон

```python
from .utils import check_person_email_unique, check_person_phone_unique

err = check_person_email_unique(email, exclude_employee_pk=instance.pk)
if err:
    return Response({'error': err, 'field': 'email'}, status=400)

err = check_person_phone_unique(phone, exclude_employee_pk=instance.pk)
if err:
    return Response({'error': err, 'field': 'phone'}, status=400)
```

Хелперы проверяют глобально по всем Employee, Student, Parent, User. Параметры `exclude_*_pk` нужны при редактировании.

### Флаг (race-safe)

```python
with transaction.atomic():
    obj = Model.objects.select_for_update().get(pk=pk)
    obj.is_flagged = not obj.is_flagged
    obj.save(update_fields=['is_flagged'])
```

### Фильтрация для преподавателя

```python
if request.user.is_teacher_role and request.user.employee:
    allowed_groups = Group.objects.filter(
        Q(headteacher=request.user.employee) | Q(subject_assignments__employee=request.user.employee)
    ).distinct()
    queryset = queryset.filter(group__in=allowed_groups)
```

### API-маршруты (именование)

```
GET  /api/faculties/         — список
POST /api/faculties/         — создать
GET  /api/faculties/1/       — детали
PATCH /api/faculties/1/      — обновить
DELETE /api/faculties/1/     — удалить (owner + пароль)
POST /api/faculties/1/delete-request/  — заявка на удаление (admin)
POST /api/faculties/1/flag/  — переключить флаг
```

---

## Бизнес-правила

### Роли и права

```
owner > admin > teacher
```

| Действие | teacher | admin | owner |
|---|:---:|:---:|:---:|
| Просмотр своих групп/студентов | ✓ | ✓ | ✓ |
| Просмотр всех групп/студентов | - | ✓ | ✓ |
| Создание/редактирование сущностей | - | ✓ | ✓ |
| Управление пользователями и должностями | - | - | ✓ |
| Удаление напрямую | - | - | ✓ |
| Создание заявки на удаление | - | ✓ | - |
| Одобрение/отклонение заявок | - | - | ✓ |
| Просмотр журнала изменений (AuditLog) | - | - | ✓ |
| Добавление вопроса к записи (RecordNote) | - | ✓ | ✓ |
| Закрытие вопроса к записи | - | - | ✓ |

Преподаватель видит только группы, где он является классным руководителем (`headteacher`), и только студентов этих групп.

### Должности (`Position.role_type`)

- `admin` — системный доступ уровня администратора
- `teacher` — системный доступ уровня преподавателя
- `none` — без системного доступа (должность есть, аккаунта нет)

Смена `role_type` заблокирована, если на должности уже есть сотрудники.

### Процесс удаления объектов

**Admin** — создаёт `DeleteRequest` (`POST /api/<сущность>/<id>/delete-request/`) с причиной → статус `pending`.  
**Owner** — рассматривает заявки `/api/delete-requests/`:
- Одобрить: вводит пароль → объект удаляется физически → AuditLog пишет `deleted`.
- Отклонить: статус `rejected`, объект остаётся.

Owner может также удалять напрямую через `DELETE /api/<сущность>/<id>/` (с паролем в теле запроса).

### Статусы студента

```
pending_review → pending_enrollment → enrolled → pending_expulsion → expelled
                                                                   → transferred
```

Статус меняется вручную администратором через форму редактирования.

### Группы

- Номер группы (`group_number`) автогенерируется: количество групп на факультете + 1.
- Имя группы — вычисляемое свойство: `{faculty.short_name}-{group_number}-{year[-2:]}` (например `ИТ-1-23`).
- Один предмет в группе — только один преподаватель (`unique_together = [('group', 'subject')]`).
- Студент может быть без группы (`group = NULL`), но факультет обязателен.

### Документы

- `owner_type` + `owner_id` вместо GenericForeignKey.
- При удалении документа — физически удаляется файл с диска (`doc.file.delete(save=False)`).
- Изображения (`jpg/jpeg/png/gif/webp`) показываются inline.

### Вопросы к записям (RecordNote)

- На одну запись (`object_type` + `object_id`) — только один активный (незакрытый) вопрос.
- `POST /api/notes/` — добавить (admin+), `POST /api/notes/<pk>/resolve/` — закрыть (owner).

### Регистрация и auth

- Owner регистрируется публично через email-код (6 символов, 10 мин).
- Admin и teacher создаются owner'ом через `/api/users/`.
- JWT: access 60 мин, refresh 30 дней, автообновление в `api.js`.
- Смена пароля: мин. 8 символов, хотя бы цифра + латиница + спецсимвол.

---

## Схема базы данных

**СУБД**: SQLite (`db.sqlite3`). Все модели: `core/models.py`.  
После изменения моделей: `python manage.py makemigrations && python manage.py migrate`.

### Основные модели

| Модель | Ключевые поля |
|---|---|
| `Institution` | owner(FK→User), code(50), name(1000), founded_date, photo |
| `Faculty` | institution(FK), full_name(255), short_name(50), created_at, is_flagged |
| `Position` | institution(FK), name(255), role_type(admin/teacher/none) |
| `Employee` | institution(FK), ФИО(100), birth_date, phone, email, photo, position(FK→Position PROTECT), is_flagged |
| `Group` | faculty(FK CASCADE), group_number(auto), year, headteacher(FK→Employee SET_NULL), is_flagged |
| `Student` | institution(FK), ФИО, birth_date, phone, email, photo, status, faculty(FK SET_NULL), group(FK SET_NULL), is_flagged |
| `Parent` | institution(FK), ФИО, birth_date, phone, email, photo, is_flagged |
| `StudentParent` | student(FK), parent(FK), relation_type(mother/father/guardian) — unique_together(student,parent) |
| `Subject` | institution(FK), name(255) |
| `GroupSubjectEmployee` | group(FK), subject(FK), employee(FK) — unique_together(group,subject) |
| `Document` | owner_type(student/employee/parent), owner_id, name, doc_type, file, uploaded_at |
| `DeleteRequest` | user(FK), object_type, object_id, reason, status(pending/approved/rejected) |
| `RecordNote` | institution(FK), object_type, object_id, question(2000), is_resolved, created_by, resolved_by |
| `AuditLog` | user(FK), institution(FK), action(created/updated/deleted), object_type, object_id, old_data(JSON), new_data(JSON) |
| `EmailCode` | email, code(6), purpose(register/recover/delete_org/change_email), expires_at, used, attempts |

**User** (`AUTH_USER_MODEL = 'core.User'`): username, display_name, email, role(owner/admin/teacher), institution(FK SET_NULL), allowed_institutions(M2M), employee(OneToOne SET_NULL).  
Свойства: `is_owner`, `is_admin`, `is_teacher_role`, `is_superadmin` (алиас is_owner).

Медиафайлы в `media/`: `institutions/`, `employees/`, `students/`, `parents/`, `users/`, `documents/`.

---

## Автотесты

Временные Python-скрипты через `requests` к REST API. Цикл:
1. Написать `tests/autotest_<тема>.py`
2. Запустить через PowerShell / Bash
3. Прочитать PASS/FAIL
4. **Удалить скрипт и папку `tests/`**

**Тестовый пользователь:** `admin` / `admin_-1` (owner, создаётся через `create_superadmin`).

Шаблон скрипта:

```python
import requests

BASE = "http://127.0.0.1:8000/api"
PASS = []; FAIL = []

def ok(name, detail=""): PASS.append(name); print(f"  [OK]   {name}" + (f" -- {detail}" if detail else ""))
def fail(name, detail=""): FAIL.append(name); print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))
def check(name, cond, detail=""): ok(name, detail) if cond else fail(name, detail)

def login(u, p):
    r = requests.post(f"{BASE}/auth/login/", json={"username": u, "password": p})
    return r.json().get("access") if r.status_code == 200 else None

def h(token): return {"Authorization": f"Bearer {token}"}

if __name__ == "__main__":
    token = login("admin", "admin_-1")
    if not token: raise SystemExit("[ERROR] Сервер не запущен или неверный пароль")

    # ... тесты ...

    print(f"\nPASS: {len(PASS)}  FAIL: {len(FAIL)}")
```

---

## Git

Формат коммитов: `<тип>: <что сделано>`  
Типы: `feat` / `fix` / `refactor` / `docs` / `chore`  
Основная ветка: `main`.
