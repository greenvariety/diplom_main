# Руководство по логированию сессий

Каждая сессия создаёт файл `session_YYYY-MM-DD.md` в этой папке.
Если за один день несколько сессий — добавляй суффикс `_2`, `_3`.

---

## Формат файла сессии

```markdown
# Сессия YYYY-MM-DD

## Что делали
- Краткое описание задачи, которую решали

## Результаты тестирования функций

| Функция / URL | Статус | Замечание |
|---|---|---|
| login_view | ✅ OK | |
| dashboard | ✅ OK | |
| ... | ... | ... |

Статусы:
- ✅ OK — проверено, работает
- ❌ Bug — найден баг (описать ниже)
- ⚠️ Warning — работает, но есть нюанс
- — — не проверялось в эту сессию

## Баги найдены

### Bug #N — Название
- **Функция:** `views.py:строка`
- **Воспроизведение:** как воспроизвести
- **Ожидалось:** что должно быть
- **Получилось:** что произошло
- **Статус:** 🔴 Открыт / 🟡 В работе / 🟢 Исправлен

## Баги исправлены в эту сессию

- Bug #N — Название — ссылка на место исправления

## Ожидает следующей сессии

- [ ] Задача 1
- [ ] Задача 2
```

---

## Список всех отслеживаемых функций

### Auth
- `login_view` — `/login/`
- `logout_view` — `/logout/`

### Dashboard
- `dashboard` — `/dashboard/`

### Faculty
- `faculty_list` — `/faculties/`
- `faculty_add` — `/faculties/add/`
- `faculty_detail` — `/faculties/<pk>/`
- `faculty_edit` — `/faculties/<pk>/edit/`
- `faculty_delete_request` — `/faculties/<pk>/delete/`

### Group
- `group_list` — `/groups/`
- `group_add` — `/groups/add/`
- `group_detail` — `/groups/<pk>/`
- `group_edit` — `/groups/<pk>/edit/`
- `group_delete_request` — `/groups/<pk>/delete/`
- `group_subject_add` — `/groups/<pk>/subjects/add/`
- `group_subject_delete` — `/groups/<pk>/subjects/<pk>/delete/`

### Student
- `student_list` — `/students/`
- `student_add` — `/students/add/`
- `student_detail` — `/students/<pk>/`
- `student_edit` — `/students/<pk>/edit/`
- `student_delete_request` — `/students/<pk>/delete/`
- `student_add_parent` — `/students/<pk>/parents/add/`
- `student_remove_parent` — `/students/<pk>/parents/<pk>/remove/`
- `student_transfer` — `/students/<pk>/transfer/`

### Parent / Guardian
- `parent_list` — `/guardians/`
- `parent_add` — `/guardians/add/`
- `parent_detail` — `/guardians/<pk>/`
- `parent_edit` — `/guardians/<pk>/edit/`
- `parent_delete_request` — `/guardians/<pk>/delete/`
- `guardian_add_student` — `/guardians/<pk>/add-student/`

### Employee
- `employee_list` — `/employees/`
- `employee_add` — `/employees/add/`
- `employee_detail` — `/employees/<pk>/`
- `employee_edit` — `/employees/<pk>/edit/`
- `employee_delete_request` — `/employees/<pk>/delete/`
- `employee_subject_assign` — `/employees/<pk>/assign-subject/`

### Position
- `position_list` — `/positions/`
- `position_add` — `/positions/add/`
- `position_edit` — `/positions/<pk>/edit/`

### Subject
- `subject_list` — `/subjects/`
- `subject_add` — `/subjects/add/`
- `subject_detail` — `/subjects/<pk>/`
- `subject_edit` — `/subjects/<pk>/edit/`

### Document
- `document_upload` — `/documents/upload/<owner_type>/<owner_id>/`
- `document_detail` — `/documents/<pk>/`
- `document_delete` — `/documents/<pk>/delete/`

### Users (superadmin)
- `user_list` — `/users/`
- `user_add` — `/users/add/`
- `user_detail` — `/users/<pk>/`
- `user_edit` — `/users/<pk>/edit/`
- `user_set_password` — `/users/<pk>/password/`

### Delete system
- `direct_delete` — `/delete/<type>/<pk>/`
- `delete_request_list` — `/delete-requests/`
- `delete_request_approve` — `/delete-requests/<pk>/approve/`
- `delete_request_reject` — `/delete-requests/<pk>/reject/`

### Utilities
- `audit_log` — `/audit-log/`
- `export_students` — `/export/students/`
- `feedback_list` — `/feedback/`
- `feedback_save` — `/feedback/save/`
- `feedback_delete` — `/feedback/<pk>/delete/`
- `dev_reset_db` — `/dev/reset-db/`
