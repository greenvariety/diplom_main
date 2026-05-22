---
name: ux-guidelines
description: Гайд по дизайну React-интерфейса — компоненты, сообщения, паттерны
type: project
---

# UX-гайдлайны

## Структура frontend/src/

| Файл | Что содержит |
|---|---|
| `main.jsx` | Точка входа, AuthFlow, OrgPickerScreen, роутинг экранов |
| `auth.jsx` | LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen |
| `shell.jsx` | Shell — навигационная оболочка (sidebar + topbar) |
| `screens.jsx` | Все основные экраны (списки, детали) |
| `modals.jsx` | Все модальные формы |
| `utils.jsx` | Field, FadingError, LoadButton, useToast, PasswordInput и др. |
| `data.jsx` | Иконки (I), справочные данные |
| `api.js` | Axios-клиент с JWT + автообновление токена |
| `styles.css` | Дизайн-система (CSS-переменные, классы) |

## Сообщения пользователю (Toast)

Используется `useToast` из `utils.jsx`:

```jsx
const toast = useToast();
toast.push('Сотрудник добавлен.', { kind: 'ok' });
toast.push('Неверный пароль.', { kind: 'err' });
```

Тексты — на русском, без технических деталей. Только дефис `-`, никаких длинных тире `—`.

## Поля ввода — компонент Field

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

- `label` — подпись над полем (вместо placeholder)
- `error` — строка ошибки или `null`/`false`
- `required` — добавляет визуальную метку
- CSS-классы: `input` для `<input>`, `select` для `<select>`, `textarea` для `<textarea>`
- Класс `is-error` добавляет красную рамку

## Ограничения длины полей

- **Короткие поля** (имена, коды, телефон и т.п.) — ставить `maxLength={N}` прямо на `<input>`. Пользователь просто не может написать больше.
- **Длинные поля** (`<textarea>`) — НЕ ставить `maxLength`. Показывать счётчик `X / MAX символов` и ошибку при превышении.

## Кнопки и тексты

| Действие | Текст |
|---|---|
| Создание | «Добавить {сущность}» |
| Редактирование | «Редактировать» / «Сохранить» |
| Удаление | «Удалить» |
| Возврат | «Назад» |
| Отмена | «Отмена» |

Все тексты — на русском. Только дефис `-`, никаких `—` или `–`.  
Не добавлять `placeholder` на `<input>` и `<textarea>`.

## Кнопка с лоадером (LoadButton)

```jsx
import { LoadButton } from './utils.jsx';

<LoadButton loading={loading} onClick={handleSubmit}>
  Сохранить
</LoadButton>
```

## Навигационные экраны

Поток после входа:
1. `LoginScreen` (или `RegisterScreen` → `EmailVerifyScreen`)
2. `OrgPickerScreen` — выбор/создание организации (для owner)
3. `Shell` с боковым меню + текущий экран из `screens.jsx`

## Права в интерфейсе

Видимость кнопок управляется через `user.role`:

```jsx
{user.role !== 'teacher' && (
  <button onClick={openAddForm}>Добавить студента</button>
)}
{user.role === 'owner' && (
  <button onClick={openAuditLog}>Журнал</button>
)}
```

## Дашборд

Для разных ролей отображаются разные компоненты:
- `DashboardOwner` — статистика + последние логи + счётчик заявок на удаление
- `DashboardAdmin` — общая статистика
- `DashboardTeacher` — свои группы и предметы
