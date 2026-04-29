---
name: optimize
description: Что можно убрать и упростить перед защитой диплома
type: project
---

# Что убрать и упростить

Всё перечисленное ниже — избыточно для дипломной работы по теме «АИС учёта студентов».  
Проект уже соответствует требованиям: 8+ таблиц, 3 роли, полный CRUD, RBAC, экспорт.

---

## 🔴 Убрать однозначно

### 1. Сид-фраза для восстановления пароля
**Где:** `core/utils.py`, `core/forms.py`, `core/views.py`, `templates/core/forgot_password.html`, `templates/core/reset_password.html`

Что конкретно удалить:
- `_SEED_WORDS` — список 96 слов (`utils.py:12–25`)
- `generate_seed_phrase()` — функция генерации (`utils.py:28`)
- `seed_phrase_hash` — поле модели `User` (`models.py:376`)
- `forgot_password_view`, `reset_password_view` — два view (`views.py:70–99`)
- `ForgotPasswordForm`, `ResetPasswordForm` — два класса форм (`forms.py:68–96`)
- URL-маршруты `/forgot-password/` и `/reset-password/` (`urls.py:8–9`)
- Шаблоны `forgot_password.html` и `reset_password.html`
- Ссылку «Забыли пароль?» в `login.html` (если она есть)
- При создании `platform_owner` убрать генерацию сида и вывод `setup_complete.html` — просто редиректить на дашборд

**Почему:** Концепция из криптовалют, нетипична для академической системы. Смена пароля через `/users/<pk>/password/` уже есть — этого достаточно.

---

### 2. Мультиарендность (platform_owner + несколько учреждений)
**Где:** везде — каждый view, каждый queryset, middleware, session

Что конкретно удалить/изменить:
- Роль `platform_owner` из `User.ROLE_CHOICES` (`models.py:357`)
- `User.is_platform_owner` property (`models.py:393`)
- `platform_owner_required` декоратор (`utils.py:99–107`)
- `institution_list`, `institution_add`, `institution_enter`, `institution_exit` — 4 view (`views.py:132–178`)
- URL-маршруты `/institutions/...` — 4 маршрута (`urls.py:16–19`)
- Шаблоны `institution_list.html`, `institution_add.html`
- `setup_view`, `setup_complete_view` — заменить на `create_superadmin` management command
- Шаблоны `setup.html`, `setup_complete.html`
- `get_current_institution()` — заменить на `Institution.objects.first()` или константу (`utils.py:36–46`)
- `InitializationMiddleware` в `core/middleware.py` — упростить
- В каждом view убрать `institution = get_current_institution(request)` и `if institution is None: return redirect()`
- Поле `institution` из моделей: `Faculty`, `Position`, `Employee`, `Parent`, `Subject`, `User` — оставить только в `User`

**Почему:** Диплом про одно учреждение, не SaaS. Это убирает ~50 строк фильтрации queryset'ов и упрощает каждый view.

> ⚠️ Это большой рефактор — только если есть время. Система работает и сейчас, просто с лишней сложностью.

---

## 🟡 Упростить (небольшие правки)

### 3. Подтверждение пароля при удалении
**Где:** `core/views.py:1088`, `core/forms.py:600–604`, шаблоны `direct_delete_confirm.html`, `delete_request_approve.html`

Сейчас удаление требует ввода пароля суперадмина. Это нетипично — обычно достаточно confirm-кнопки.

Что изменить: убрать `DeleteConfirmForm` и проверку `check_password`, заменить на простую кнопку с `data-bs-confirm` или Bootstrap модал.

---

### 4. Document без FK (owner_type строка + owner_id int)
**Где:** `core/models.py:295–332`

Сейчас: `Document.owner_type = 'student'` + `Document.owner_id = 42` — нестандартный паттерн, нет каскадного удаления.

Что изменить: добавить три nullable FK вместо пары строка+int:
```python
student  = models.ForeignKey(Student,  null=True, blank=True, on_delete=models.CASCADE)
employee = models.ForeignKey(Employee, null=True, blank=True, on_delete=models.CASCADE)
parent   = models.ForeignKey(Parent,   null=True, blank=True, on_delete=models.CASCADE)
```
Тогда документы удаляются автоматически при удалении владельца, и не нужна функция `_redirect_to_owner`.

---

### 5. Position — отдельная модель для должности
**Где:** `core/models.py:50–64`

Сейчас должность — отдельная таблица с FK от Employee. Для диплома можно сделать просто `CharField` на модели Employee.

Что изменить: убрать модель `Position`, добавить `position = models.CharField(max_length=100, blank=True)` прямо в `Employee`.

> Убирает: модель, CRUD-вьюхи, шаблоны, маршруты должностей.

---

## 🟢 Мелкие улучшения кода

### 6. Нет каскадного удаления документов
**Где:** `core/views.py:1071–1115` — `direct_delete` и `_perform_delete`

При удалении студента/сотрудника/опекуна их документы остаются в БД и файлах.

Что добавить: в `_perform_delete` и `direct_delete` перед `obj.delete()` вызывать:
```python
Document.objects.filter(owner_type=object_type.lower(), owner_id=obj.pk).delete()
```

---

### 7. Аудит-лог не покрывает Subject и Document
**Где:** `core/views.py` — `subject_add`, `subject_edit`, `document_upload`, `document_delete`

`log_action()` не вызывается при создании/изменении предметов и документов.

Что добавить: `log_action(request.user, 'created', subject, ...)` в `subject_add` и `subject_edit`.

---

### 8. Валидация уникальности username при редактировании пользователя
**Где:** `core/forms.py` — `UserEditForm`

`UserCreateForm` проверяет уникальность через `clean_username`, `UserEditForm` — нет.

Что добавить в `UserEditForm`:
```python
def clean_username(self):
    username = self.cleaned_data['username']
    qs = User.objects.filter(username=username)
    if self.instance.pk:
        qs = qs.exclude(pk=self.instance.pk)
    if qs.exists():
        raise forms.ValidationError('Этот логин уже занят.')
    return username
```

---

## Итоговая таблица приоритетов

| # | Что | Усилие | Важность |
|---|---|---|---|
| 1 | Убрать сид-фразу | Малое | Высокая — убирает нетипичную концепцию |
| 2 | Убрать мультиарендность | Большое | Средняя — система работает и так |
| 3 | Убрать confirm-пароль при удалении | Малое | Средняя — упрощает UX |
| 4 | Document → нормальные FK | Среднее | Средняя — стандартный паттерн |
| 5 | Position → CharField | Малое | Низкая — чище код |
| 6 | Каскадное удаление документов | Малое | Высокая — баг, не фича |
| 7 | Логировать Subject/Document | Малое | Низкая — полнота аудита |
| 8 | Валидация username в UserEditForm | Малое | Высокая — баг |
