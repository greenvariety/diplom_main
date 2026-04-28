# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Django-проект (дипломная работа) — АИС для управления студентами, сотрудниками, группами и документами учебного заведения.

---

## Команды разработки

```bash
# Запуск dev-сервера
python manage.py runserver

# Применить миграции
python manage.py migrate

# Создать миграцию после изменения models.py
python manage.py makemigrations

# Создать суперадминистратора
python manage.py create_superadmin

# Заполнить тестовыми данными
python manage.py seed_data
```

Виртуальное окружение: `venv\Scripts\activate` (Windows).  
Быстрый старт: `Запустить проект.bat` в корне.

Тестов нет — проверка вручную через браузер на `http://127.0.0.1:8000/`.

---

## Архитектура

Весь код — в одном приложении `core`. Нет микросервисов, нет API, нет JS-фреймворков.

```
core/models.py   — все модели БД (единственный источник истины о данных)
core/views.py    — все вьюхи (~1000 строк, функциональные, не class-based)
core/urls.py     — все маршруты
core/forms.py    — Django ModelForms
core/utils.py    — log_action(), model_to_dict_safe(), декораторы ролей
config/settings.py — конфигурация (SQLite, Bootstrap5 crispy, AUTH_USER_MODEL)
templates/core/  — HTML-шаблоны (Django Templates + Bootstrap 5)
```

Кастомная модель пользователя `core.User` с полем `role` (superadmin / admin / teacher) — вместо стандартных Django groups. Доступ к вьюхам через декораторы `@admin_required` / `@superadmin_required` из `core/utils.py`.

Document привязан к владельцу через `owner_type` (строка) + `owner_id` (int) — без GenericForeignKey.

---

## Карта: что меняешь → что читать

Перед изменением файла открой соответствующий документ из `docs/` — там полный контекст.

### `core/models.py`
→ Читай **[docs/database.md](docs/database.md)** — схема всех таблиц, поля, связи, ограничения.  
→ После изменения моделей — `python manage.py makemigrations && python manage.py migrate`.

### `core/views.py`
→ Читай **[docs/patterns.md](docs/patterns.md)** — обязательный вызов `log_action()`, декораторы ролей, паттерн удаления.  
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — таблица прав по ролям, какая роль что видит/может.

### `core/urls.py`
→ Читай **[docs/patterns.md](docs/patterns.md)** — соглашение об именовании URL (`{сущность}-{действие}`).

### `core/forms.py`
→ Читай **[docs/patterns.md](docs/patterns.md)** — как формы рендерятся, работа с файлами.  
→ Читай **[docs/ux-guidelines.md](docs/ux-guidelines.md)** — тексты, Bootstrap-паттерны.

### `core/utils.py`
→ Читай **[docs/patterns.md](docs/patterns.md)** — как работают `log_action` и декораторы.  
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — логика ролей.

### `templates/` (любой шаблон)
→ Читай **[docs/ux-guidelines.md](docs/ux-guidelines.md)** — базовые шаблоны, тексты кнопок, отображение прав.  
→ Читай **[docs/patterns.md](docs/patterns.md)** — URL-имена для `{% url %}`.

### `config/settings.py`
→ Читай **[docs/deployment.md](docs/deployment.md)** — что за какую настройку отвечает.

### Добавление новой сущности (модель + вьюхи + шаблоны)
→ Читай **[docs/database.md](docs/database.md)** — куда вписать новую модель.  
→ Читай **[docs/patterns.md](docs/patterns.md)** — полный паттерн CRUD.  
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — какие роли получат доступ.  
→ Читай **[docs/features.md](docs/features.md)** — обнови статус фичи после реализации.

### Изменение логики удаления / заявок
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — двухуровневый процесс удаления.

### Изменение статусов студента
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — граф переходов статусов.

### Изменение прав доступа / ролей
→ Читай **[docs/business-rules.md](docs/business-rules.md)** — таблица прав.  
→ Читай **[docs/patterns.md](docs/patterns.md)** — как применяются декораторы.

### `requirements.txt` / зависимости
→ Читай **[docs/deployment.md](docs/deployment.md)** — текущий стек и зависимости.

---

## Полная база знаний (`docs/`)

| Файл | Содержание |
|---|---|
| [project.md](docs/project.md) | Что это за система, аудитория, контекст диплома |
| [architecture.md](docs/architecture.md) | Стек, структура папок, ключевые архитектурные решения |
| [patterns.md](docs/patterns.md) | Паттерны кода — декораторы, аудит, формы, URL, фильтрация по роли |
| [features.md](docs/features.md) | Чеклист реализованных и нереализованных функций |
| [database.md](docs/database.md) | Все модели — поля, типы, связи, медиафайлы |
| [deployment.md](docs/deployment.md) | Запуск, зависимости, настройки settings.py |
| [business-rules.md](docs/business-rules.md) | Роли, права, удаление, статусы студентов, правила групп |
| [ux-guidelines.md](docs/ux-guidelines.md) | Шаблоны, Bootstrap-паттерны, тексты интерфейса |
| [git-workflow.md](docs/git-workflow.md) | Формат коммитов, ветки, .gitignore |
| [monitoring.md](docs/monitoring.md) | Аудит-лог, feedback-инструмент, дебаг |
| [roadmap.md](docs/roadmap.md) | Что готово, что в приоритете, что на потом |
