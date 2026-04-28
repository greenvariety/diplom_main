---
name: database
description: Схема БД — все модели, поля, связи
type: project
---

# База данных

**СУБД**: SQLite (`db.sqlite3` в корне проекта)  
**Все модели**: `core/models.py`

## Модели

### Faculty (Факультет)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | Авто |
| full_name | CharField(255) | Полное название |
| short_name | CharField(50) | Аббревиатура |
| created_at | DateField | Дата создания факультета |

### Position (Должность)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| name | CharField(255) | Название |
| is_teacher | BooleanField | Является ли преподавательской |

### Employee (Сотрудник)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| last_name, first_name, middle_name | CharField | ФИО |
| birth_date | DateField | |
| phone | CharField(20) | |
| email | EmailField | |
| photo | ImageField | `upload_to='employees/'` |
| position | FK → Position | `on_delete=PROTECT` |

### Group (Группа)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| group_number | PositiveIntegerField | Автозаполняется при создании |
| year | IntegerField | Год начала обучения |
| faculty | FK → Faculty | `on_delete=CASCADE` |
| headteacher | FK → Employee | Классный руководитель, `SET_NULL` |

`name` — вычисляемое свойство: `{faculty.short_name}-{group_number}-{year[-2:]}`, например `ИТ-1-23`.

### Student (Студент)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| last_name, first_name, middle_name | CharField | |
| birth_date | DateField | |
| phone, email | CharField/EmailField | |
| photo | ImageField | `upload_to='students/'` |
| status | CharField(30) | pending_review / pending_enrollment / enrolled / pending_expulsion / expelled / transferred |
| group | FK → Group | `SET_NULL` (студент без группы возможен) |
| faculty | FK → Faculty | `CASCADE` |

### Parent (Опекун)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| last_name, first_name, middle_name | CharField | |
| birth_date, phone, email | | |
| photo | ImageField | `upload_to='parents/'` |

### StudentParent (Связь студент-опекун)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| student | FK → Student | `CASCADE` |
| parent | FK → Parent | `CASCADE` |
| relation_type | CharField | mother / father / guardian |

Ограничение: `unique_together = [('student', 'parent')]`

### Subject (Предмет)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| name | CharField(255) | |

### GroupSubjectEmployee (Предмет в группе)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| group | FK → Group | `CASCADE` |
| subject | FK → Subject | `CASCADE` |
| employee | FK → Employee | `CASCADE` |

Ограничение: `unique_together = [('group', 'subject')]` — один предмет в группе ведёт только один преподаватель.

### Document (Документ)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| owner_type | CharField(20) | 'student' / 'employee' / 'parent' |
| owner_id | IntegerField | ID владельца в своей таблице |
| name | CharField(255) | Название документа |
| description | TextField | Описание |
| doc_type | CharField(20) | passport / snils / policy / certificate / order / other |
| file | FileField | `upload_to='documents/'` |
| uploaded_at | DateField | `auto_now_add=True` |

### User (Пользователь системы)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| username | CharField(150) | Уникальный логин |
| role | CharField(20) | superadmin / admin / teacher |
| employee | OneToOneField → Employee | Привязка к сотруднику, `SET_NULL` |
| is_active | BooleanField | |
| is_staff | BooleanField | Для Django Admin |

Кастомная модель: `AUTH_USER_MODEL = 'core.User'`

### DeleteRequest (Заявка на удаление)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| user | FK → User | Инициатор |
| object_type | CharField(50) | Faculty / Group / Student / Employee / Parent |
| object_id | IntegerField | ID удаляемого объекта |
| reason | TextField | Причина |
| status | CharField(20) | pending / approved / rejected |
| created_at | DateTimeField | `auto_now_add` |

### AuditLog (Журнал изменений)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| user | FK → User | `SET_NULL` |
| action | CharField(20) | created / updated / deleted |
| object_type | CharField(50) | Имя модели |
| object_id | IntegerField | |
| old_data | TextField | JSON до изменения |
| new_data | TextField | JSON после изменения |
| created_at | DateTimeField | |

### FeedbackComment (Комментарий к UI)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| page_url | CharField(500) | URL страницы |
| selector | TextField | CSS-селектор элемента |
| element_preview | CharField(200) | Текст элемента (превью) |
| comment | TextField | Комментарий |
| created_at | DateTimeField | |

## Медиафайлы

Хранятся локально в `media/`:
- `media/employees/` — фото сотрудников
- `media/students/` — фото студентов
- `media/parents/` — фото опекунов
- `media/documents/` — загруженные документы
