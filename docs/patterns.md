---
name: patterns
description: Правила написания кода — декораторы, аудит, формы, шаблоны
type: project
---

# Паттерны кода

## Декораторы доступа

Все защищённые вьюхи используют декораторы из `core/utils.py`:

```python
@login_required        # любой авторизованный
@admin_required        # роль admin или superadmin
@superadmin_required   # только superadmin
```

Порядок: декоратор ставится непосредственно над `def`.

## Аудит изменений

Любое создание/изменение/удаление объекта должно вызывать `log_action`:

```python
from .utils import log_action, model_to_dict_safe

# Создание
obj = form.save()
log_action(request.user, 'created', obj, new_data=model_to_dict_safe(obj))

# Обновление — сохранить old_data ДО save()
old_data = model_to_dict_safe(instance)
instance = form.save()
log_action(request.user, 'updated', instance, old_data=old_data, new_data=model_to_dict_safe(instance))

# Удаление
old_data = model_to_dict_safe(obj)
log_action(request.user, 'deleted', obj, old_data=old_data)
obj.delete()
```

## Удаление объектов

Двухуровневый процесс:
1. **Администратор** → создаёт `DeleteRequest` с причиной.
2. **Суперадминистратор** → одобряет через `direct_delete` или `delete_request_approve`, вводит свой пароль для подтверждения (`DELETE_CONFIRMATION_PASSWORD` не используется — проверяется реальный пароль пользователя через `request.user.check_password(entered)`).

Суперадмин может удалять напрямую (минует создание заявки, редиректится на `direct-delete`).

## Формы

- Все формы — `django.forms.ModelForm` или `django.forms.Form`.
- Рендеринг через `{% crispy form %}` (crispy-bootstrap5).
- Файлы: формы с файлами принимают `request.FILES` → передаются вторым аргументом в `Form(request.POST, request.FILES)`.

## Шаблоны

- `base.html` — базовый шаблон с navbar и блоком `{% block content %}`.
- `base_login.html` — для страницы входа (без navbar).
- Все шаблоны приложения в `templates/core/`.
- Сообщения пользователю через `messages.success(request, '...')` / `messages.error(...)`.

## URL-имена

Формат: `{сущность}-{действие}`, например:
- `student-list`, `student-detail`, `student-add`, `student-edit`, `student-delete-request`
- В шаблонах: `{% url 'student-detail' pk=student.pk %}`

## Ошибки полей ввода (React-фронтенд)

**Правило:** каждое обязательное поле при ошибке показывает красную рамку + красный текст под полем. Оба исчезают через 15-20 секунд автоматически — дополнительного кода для этого не нужно.

Шаблон:

```jsx
<Field label="Название поля" required error={условие ? 'Текст ошибки' : null}>
  <input className={`input ${условие ? 'is-error' : ''}`} ... />
</Field>
```

- Для `<select>` - класс `select` вместо `input`
- Для `<textarea>` - класс `textarea` вместо `input`
- `Field` сам рендерит текст ошибки через `FadingError` (из `utils.jsx`) - отдельно добавлять не нужно
- CSS через `:has()` убирает рамку синхронно с текстом - ничего доделывать не нужно

**С touched (валидация при blur):**
```jsx
<Field label="Имя" required error={touched.name && errs.name}>
  <input className={`input ${touched.name && errs.name ? 'is-error' : ''}`}
    onBlur={() => setTouched(t => ({ ...t, name: 1 }))} ... />
</Field>
```

**С err (валидация при сабмите):**
```jsx
<Field label="Название" required error={err && !name.trim() ? err : null}>
  <input className={`input ${err && !name.trim() ? 'is-error' : ''}`}
    onChange={e => { setName(e.target.value); setErr(''); }} ... />
</Field>
```

## Фильтрация данных для преподавателя

Преподаватель видит только свои группы. Шаблон фильтрации:

```python
if user.is_teacher_role and user.employee:
    allowed_groups = Group.objects.filter(
        Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee)
    ).distinct()
    queryset = queryset.filter(group__in=allowed_groups)
```
