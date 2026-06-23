# CLAUDE.md

АИС управления контингентом учебного заведения — дипломный проект.  
Стек: React 18 + Vite (SPA) + Django REST Framework + SQLite.

---

## Быстрый старт

```bash
# Создать виртуальное окружение и установить зависимости
python -m venv venv
venv\Scripts\activate
pip install -r env/requirements.txt

# Применить миграции и создать суперадмина
python manage.py migrate
python manage.py create_superadmin   # admin / admin_-1

# Заполнить тестовыми данными (опционально)
python manage.py seed_data

# Запустить сервер
python manage.py runserver           # http://127.0.0.1:8000/
```

Или просто запустить `Запустить проект.bat` в корне (Windows).

**Фронтенд (hot reload для разработки):**
```bash
# Терминал 1: python manage.py runserver
# Терминал 2: cd frontend && npm run dev   → http://localhost:5173
```

После изменений в `frontend/src/`: `cd frontend && npm run build`.

---

## Секреты

Все секреты в `env/.env` (в `.gitignore`, не коммитить):
- `SECRET_KEY` — секретный ключ Django
- `EMAIL_HOST_USER` — email отправителя (Gmail)
- `EMAIL_HOST_PASSWORD` — App Password Gmail (16 символов, без пробелов)

Образец без значений — `env/.env.example`.

---

## Архитектура

Весь код — в одном приложении `core`.

```
core/models.py      — все модели БД
core/views.py       — serve_frontend() → frontend/dist/index.html
core/api_*.py       — DRF APIView, один файл на сущность
core/api_auth.py    — логин, регистрация, восстановление пароля
core/urls.py        — /api/... маршруты + catch-all → serve_frontend
core/utils.py       — log_action(), email-хелперы, декораторы ролей
config/settings.py  — SQLite, DRF, JWT, CORS, Email (Gmail SMTP)

frontend/src/
  main.jsx          — точка входа, роутинг
  auth.jsx          — экраны авторизации
  shell.jsx         — навигационная оболочка (sidebar + topbar)
  screens.jsx       — все основные экраны (списки, детали)
  modals.jsx        — все модальные формы
  profile.jsx       — экран профиля
  utils.jsx         — Field, FadingError, LoadButton, useToast, PasswordInput
  api.js            — Axios-клиент с JWT + автообновление токена
  styles.css        — дизайн-система
frontend/dist/      — собранный билд (отдаётся Django)
```

Кастомная модель `core.User` с полем `role` (`owner` / `admin` / `teacher`).  
Мультитенантность: owner создаёт `Institution`, все сущности привязаны к ней.  
`Document` привязан через `owner_type` (строка) + `owner_id` (int) — без GenericForeignKey.

---

## Правила интерфейса

- **Только дефис `-`** в текстах. Длинное `—` и среднее `–` тире запрещены в JSX/JS-строках.
- **Никаких `placeholder`** на `<input>` и `<textarea>`.
- **Ограничение длины:** короткие поля — `maxLength={N}` на `<input>`; длинные (`<textarea>`) — счётчик `X / MAX символов` + ошибка при превышении.

### Компонент Field

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

CSS-классы: `input` / `select` / `textarea`. `Field` рендерит ошибку через `FadingError`.  
`is-error` — красная рамка. Оба исчезают через 15-20 сек.

**При сабмите (без touched):**
```jsx
<Field label="Название" required error={err && !name.trim() ? err : null}>
  <input className={`input ${err && !name.trim() ? 'is-error' : ''}`}
    onChange={e => { setName(e.target.value); setErr(''); }} ... />
</Field>
```

### Кнопки и уведомления

```jsx
import { LoadButton } from './utils.jsx';
<LoadButton loading={loading} onClick={handleSubmit}>Сохранить</LoadButton>

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

## Паттерны кода (бэкенд)

### Аудит изменений

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

### Фильтрация по организации

```python
institution = request.user.institution
queryset = Faculty.objects.filter(institution=institution)
```

### Проверка ролей в DRF

```python
if request.user.role not in ('owner', 'admin'):
    return Response({'error': 'Доступ запрещён'}, status=403)
# Свойства User: is_owner, is_admin, is_teacher_role
```

Декораторы `@owner_required` / `@admin_required` из `core/utils.py` — только для Django-вьюх, не DRF.

### Уникальность email и телефона

```python
from .utils import check_person_email_unique, check_person_phone_unique

err = check_person_email_unique(email, exclude_employee_pk=instance.pk)
if err:
    return Response({'error': err, 'field': 'email'}, status=400)
```

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

### Конвенция API-маршрутов

```
GET    /api/faculties/               — список
POST   /api/faculties/               — создать
GET    /api/faculties/1/             — детали
PATCH  /api/faculties/1/             — обновить
DELETE /api/faculties/1/             — удалить (owner + пароль в теле)
POST   /api/faculties/1/delete-request/  — заявка на удаление (admin)
POST   /api/faculties/1/flag/        — переключить флаг
```

---

## Бизнес-правила

### Роли и права

```
owner > admin > teacher
```

| Действие | teacher | admin | owner |
|---|:---:|:---:|:---:|
| Просмотр своих групп/студентов | + | + | + |
| Просмотр всех групп/студентов | - | + | + |
| Создание/редактирование сущностей | - | + | + |
| Управление пользователями и должностями | - | - | + |
| Удаление напрямую | - | - | + |
| Создание заявки на удаление | - | + | - |
| Одобрение/отклонение заявок | - | - | + |
| Просмотр журнала изменений (AuditLog) | - | - | + |
| Добавление вопроса к записи (RecordNote) | - | + | + |
| Закрытие вопроса к записи | - | - | + |

Преподаватель видит только группы, где он `headteacher`, и студентов этих групп.

### Должности (`Position.role_type`)

- `admin` — доступ уровня администратора
- `teacher` — доступ уровня преподавателя
- `none` — без системного доступа

Смена `role_type` заблокирована, если на должности уже есть сотрудники.

### Процесс удаления

**Admin** создаёт `DeleteRequest` с причиной → статус `pending`.  
**Owner** рассматривает: одобрить (ввести пароль → физическое удаление) или отклонить.  
Owner также может удалять напрямую через `DELETE /api/<сущность>/<id>/`.

### Статусы студента

```
pending_review → pending_enrollment → enrolled → pending_expulsion → expelled
                                                                   → transferred
```

### Группы

- `group_number` автогенерируется: кол-во групп на факультете + 1.
- Имя группы: `{faculty.short_name}-{group_number}-{year[-2:]}` (например `ИТ-1-23`).
- Один предмет в группе — один преподаватель (`unique_together = [('group', 'subject')]`).
- Студент может быть без группы, но факультет обязателен.

### Документы

- При удалении физически удаляется файл: `doc.file.delete(save=False)`.
- Изображения (`jpg/jpeg/png/gif/webp`) показываются inline.

### RecordNote (вопросы к записям)

- На одну запись — только один активный (незакрытый) вопрос.
- `POST /api/notes/` — добавить (admin+), `POST /api/notes/<pk>/resolve/` — закрыть (owner).

### Регистрация и auth

- Owner регистрируется публично через email-код (6 символов, 10 мин).
- Admin и teacher создаются owner'ом через `/api/users/`.
- JWT: access 60 мин, refresh 30 дней, автообновление в `api.js`.
- Смена пароля: мин. 8 символов, хотя бы цифра + латиница + спецсимвол.

---

## Схема базы данных

**СУБД**: SQLite (`data/db.sqlite3`, в `.gitignore`). Все модели: `core/models.py`.  
После изменения моделей: `python manage.py makemigrations && python manage.py migrate`.

| Модель | Ключевые поля |
|---|---|
| `Institution` | owner(FK→User), code(50), name(1000), founded_date, photo |
| `Faculty` | institution(FK), full_name(255), short_name(50), is_flagged |
| `Position` | institution(FK), name(255), role_type(admin/teacher/none) |
| `Employee` | institution(FK), ФИО(100), birth_date, phone, email, photo, position(FK PROTECT), is_flagged |
| `Group` | faculty(FK CASCADE), group_number(auto), year, headteacher(FK→Employee SET_NULL), is_flagged |
| `Student` | institution(FK), ФИО, birth_date, phone, email, photo, status, faculty(FK SET_NULL), group(FK SET_NULL), is_flagged |
| `Parent` | institution(FK), ФИО, birth_date, phone, email, photo, is_flagged |
| `StudentParent` | student(FK), parent(FK), relation_type(mother/father/guardian) |
| `Subject` | institution(FK), name(255) |
| `GroupSubjectEmployee` | group(FK), subject(FK), employee(FK) — unique_together(group,subject) |
| `Document` | owner_type(student/employee/parent), owner_id, name, doc_type, file, uploaded_at |
| `DeleteRequest` | user(FK), object_type, object_id, reason, status(pending/approved/rejected) |
| `RecordNote` | institution(FK), object_type, object_id, question(2000), is_resolved, created_by, resolved_by |
| `AuditLog` | user(FK), institution(FK), action(created/updated/deleted), object_type, object_id, old_data(JSON), new_data(JSON) |
| `EmailCode` | email, code(6), purpose(register/recover/delete_org/change_email), expires_at, used, attempts |

**User**: username, display_name, email, role(owner/admin/teacher), institution(FK SET_NULL), employee(OneToOne SET_NULL).  
Медиафайлы в `media/` (в `.gitignore`): `institutions/`, `employees/`, `students/`, `parents/`, `users/`, `documents/`.

---

## Git

Формат коммитов: `<тип>: <что сделано>`  
Типы: `feat` / `fix` / `refactor` / `docs` / `chore`  
Основная ветка: `main`.
