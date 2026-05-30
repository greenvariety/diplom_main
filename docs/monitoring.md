---
name: monitoring
description: Где смотреть логи и отладочную информацию
type: project
---

# Мониторинг и логи

## Журнал изменений в системе

API: `GET /api/audit-log/` (owner и admin)

Показывает записи `AuditLog` отфильтрованные по текущей организации:
- Кто из пользователей сделал действие
- Что за действие (создал / изменил / удалил / перевёл студента)
- Какой объект
- JSON данных до и после изменения
- Пагинация: PAGE_SIZE=50

Admin видит записи всех пользователей кроме owner.

Дополнительно:
- `GET /api/audit-log/users/` — список пользователей для фильтра
- `GET /api/audit-log/export/` — экспорт в Excel (owner и admin)
- `POST /api/audit-log/<pk>/rollback/` — откат изменений (только для `action='updated'`, типы: Student/Employee/Faculty/Group/Parent)

## Django Debug Toolbar / Ошибки

В режиме `DEBUG = True` (текущий):
- Ошибки Django показываются прямо в браузере с traceback.
- Консоль `runserver` выводит все HTTP-запросы и SQL-ошибки.

## Логи сервера

При запуске `python manage.py runserver` — всё выводится в терминал:
```
[28/Apr/2026 12:00:00] "GET /api/faculties/ HTTP/1.1" 200 1234
[28/Apr/2026 12:00:01] "POST /api/students/ HTTP/1.1" 201 0
```

## Email-отладка

Если `EMAIL_HOST_USER` не задан в `.env`, письма не отправляются — вместо этого код печатается в консоль:
```
[EMAIL] to=user@example.com purpose=register code=ABC-DEF
```

## Feedback-комментарии

Инструмент разработки — модель `FeedbackComment` в БД. Позволяет сохранять комментарии к элементам интерфейса с CSS-селектором и URL страницы.

## Отладка данных

Заполнение тестовыми данными: `python manage.py seed_data`.
