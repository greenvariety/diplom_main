---
name: patterns
description: Правила написания кода — декораторы, аудит, API-паттерны, React-поля
type: project
---

# Паттерны кода

## Декораторы доступа (для Django-вьюх)

Используются только для Django-вьюх (не для DRF APIView) из `core/utils.py`:

```python
@owner_required       # только role == 'owner'
@admin_required       # role in ('owner', 'admin')
@superadmin_required  # алиас owner_required
```

В DRF APIView роль проверяется напрямую через `request.user.is_owner` / `request.user.is_admin`.

## Аудит изменений

Любое создание/изменение/удаление объекта должно вызывать `log_action`:

```python
from .utils import log_action, model_to_dict_safe

# Создание
obj = MyModel.objects.create(...)
log_action(request.user, 'created', obj, new_data=model_to_dict_safe(obj))

# Обновление — сохранить old_data ДО save()
old_data = model_to_dict_safe(instance)
# ... изменения ...
instance.save()
log_action(request.user, 'updated', instance, old_data=old_data, new_data=model_to_dict_safe(instance))

# Удаление
old_data = model_to_dict_safe(obj)
log_action(request.user, 'deleted', obj, old_data=old_data)
obj.delete()
```

## Фильтрация по организации (institution)

Все DRF-вьюхи фильтруют данные по текущей организации пользователя:

```python
from .utils import get_current_institution

institution = get_current_institution(request)
queryset = Faculty.objects.filter(institution=institution)
```

`get_current_institution` для `owner` берёт `institution_id` из сессии; для `admin`/`teacher` — из `request.user.institution`.

## Удаление объектов

Двухуровневый процесс:
1. **Администратор** → POST на `/api/<сущность>/<id>/delete-request/` с причиной.
2. **Владелец (owner)** → POST на `/api/delete-requests/<id>/approve/` с подтверждением пароля.

Owner может также удалять напрямую через DELETE `/api/<сущность>/<id>/`.

## DRF APIView паттерн

```python
from rest_framework.views import APIView
from rest_framework.response import Response

class ExampleView(APIView):
    def get(self, request):
        institution = get_current_institution(request)
        items = MyModel.objects.filter(institution=institution)
        return Response([{'id': i.pk, 'name': i.name} for i in items])

    def post(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Нет доступа'}, status=403)
        # ... создание ...
```

## API-маршруты (именование)

Формат: `/api/{сущность}/` и `/api/{сущность}/{pk}/`, например:
- `GET /api/faculties/` — список
- `POST /api/faculties/` — создать
- `GET /api/faculties/1/` — детали
- `PATCH /api/faculties/1/` — обновить
- `DELETE /api/faculties/1/` — удалить (owner)
- `POST /api/faculties/1/delete-request/` — заявка на удаление (admin)

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
- `Field` сам рендерит текст ошибки через `FadingError` (из `utils.jsx`) — отдельно добавлять не нужно
- CSS через `:has()` убирает рамку синхронно с текстом — ничего доделывать не нужно

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
if request.user.is_teacher_role and request.user.employee:
    allowed_groups = Group.objects.filter(
        Q(headteacher=request.user.employee) | Q(subject_assignments__employee=request.user.employee)
    ).distinct()
    queryset = queryset.filter(group__in=allowed_groups)
```
