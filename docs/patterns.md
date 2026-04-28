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

## Фильтрация данных для преподавателя

Преподаватель видит только свои группы. Шаблон фильтрации:

```python
if user.is_teacher_role and user.employee:
    allowed_groups = Group.objects.filter(
        Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee)
    ).distinct()
    queryset = queryset.filter(group__in=allowed_groups)
```
