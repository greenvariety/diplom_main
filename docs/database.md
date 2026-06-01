---
name: database
description: Схема БД — все модели, поля, связи
type: project
---

# База данных

**СУБД**: SQLite (`db.sqlite3` в корне проекта)  
**Все модели**: `core/models.py`

## Модели

### Institution (Учебное заведение)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | Авто |
| owner | FK → User | Владелец (роль owner), `CASCADE` |
| code | CharField(50) | Короткий код организации |
| name | CharField(1000) | Полное название |
| description | TextField(5000) | Описание (необязательно) |
| photo | ImageField | `upload_to='institutions/'`, необязательно |
| founded_date | DateField | Дата основания, необязательно |
| created_at | DateTimeField | `auto_now_add=True` |

Ограничение: `unique_together = [('owner', 'code')]`

### Faculty (Факультет)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | Авто |
| institution | FK → Institution | `CASCADE`, необязательно |
| full_name | CharField(255) | Полное название |
| short_name | CharField(50) | Аббревиатура |
| created_at | DateField | Дата создания факультета, необязательно |
| is_flagged | BooleanField | Отмечен флагом (default=False) |

### Position (Должность)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| institution | FK → Institution | `CASCADE`, необязательно |
| name | CharField(255) | Название |
| role_type | CharField(20) | admin / teacher / none (default='teacher') |

`role_type` определяет уровень доступа сотрудника при создании аккаунта: `admin`, `teacher` или `none` (без доступа к системе). `unique_together = [('institution', 'name')]`.

### Employee (Сотрудник)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| institution | FK → Institution | `CASCADE`, необязательно |
| last_name, first_name, middle_name | CharField(100) | ФИО |
| birth_date | DateField | Необязательно |
| phone | CharField(20) | |
| email | EmailField | |
| photo | ImageField | `upload_to='employees/'` |
| position | FK → Position | `on_delete=PROTECT`, необязательно |
| is_flagged | BooleanField | Отмечен флагом (default=False) |

### Group (Группа)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| group_number | PositiveIntegerField | Автозаполняется при создании |
| year | IntegerField | Год начала обучения |
| faculty | FK → Faculty | `on_delete=CASCADE` |
| headteacher | FK → Employee | Классный руководитель, `SET_NULL` |
| is_flagged | BooleanField | Отмечен флагом (default=False) |

`name` — вычисляемое свойство: `{faculty.short_name}-{group_number}-{year[-2:]}`, например `ИТ-1-23`.

### Student (Студент)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| last_name, first_name, middle_name | CharField(100) | |
| birth_date | DateField | |
| phone, email | CharField/EmailField | |
| photo | ImageField | `upload_to='students/'` |
| status | CharField(30) | pending_review / pending_enrollment / enrolled / pending_expulsion / expelled / transferred |
| is_flagged | BooleanField | Отмечен флагом (default=False) |
| institution | FK → Institution | `CASCADE`, необязательно |
| group | FK → Group | `SET_NULL` (студент без группы возможен) |
| faculty | FK → Faculty | `SET_NULL` |

### Parent (Опекун)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| institution | FK → Institution | `CASCADE`, необязательно |
| last_name, first_name, middle_name | CharField(100) | |
| birth_date, phone, email | | |
| photo | ImageField | `upload_to='parents/'` |
| is_flagged | BooleanField | Отмечен флагом (default=False) |

### StudentParent (Связь студент-опекун)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| student | FK → Student | `CASCADE` |
| parent | FK → Parent | `CASCADE` |
| relation_type | CharField(20) | mother / father / guardian |

Ограничение: `unique_together = [('student', 'parent')]`

### Subject (Предмет)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| institution | FK → Institution | `CASCADE`, необязательно |
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
| display_name | CharField(150) | Отображаемое имя |
| email | EmailField | Email пользователя |
| role | CharField(20) | owner / admin / teacher |
| institution | FK → Institution | Текущая организация пользователя, `SET_NULL` |
| allowed_institutions | M2M → Institution | Организации с доступом (для non-owner) |
| employee | OneToOneField → Employee | Привязка к сотруднику, `CASCADE` + `SET_NULL` |
| photo | ImageField | `upload_to='users/'`, необязательно |
| is_active | BooleanField | |
| is_staff | BooleanField | Для Django Admin |
| password_changed_at | DateTimeField | Время последней смены пароля, необязательно |

Кастомная модель: `AUTH_USER_MODEL = 'core.User'`

Свойства:
- `is_owner` — `role == 'owner'`
- `is_superadmin` — алиас `is_owner`
- `is_admin` — `role in ('owner', 'admin')`
- `is_teacher_role` — `role == 'teacher'`

### EmailCode (Email-код подтверждения)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| email | EmailField | Получатель |
| login | CharField(150) | Логин (для регистрации/восстановления) |
| code | CharField(6) | 6-символьный код (хранится без дефиса: ABCDEF) |
| purpose | CharField(20) | register / recover / delete_org / change_email |
| payload | TextField | JSON с данными (для регистрации — данные аккаунта) |
| expires_at | DateTimeField | Время истечения (10 минут от создания) |
| used | BooleanField | Использован |
| attempts | IntegerField | Количество неверных попыток |
| created_at | DateTimeField | `auto_now_add=True` |

### DeleteRequest (Заявка на удаление)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| user | FK → User | Инициатор |
| object_type | CharField(50) | Faculty / Group / Position / Student / Employee / Parent |
| object_id | IntegerField | ID удаляемого объекта |
| reason | TextField | Причина |
| status | CharField(20) | pending / approved / rejected |
| created_at | DateTimeField | `auto_now_add` |

### RecordNote (Вопрос по записи)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| institution | FK → Institution | `CASCADE` |
| object_type | CharField(50) | Тип объекта: Student / Employee / Group и т.д. |
| object_id | IntegerField | ID объекта |
| question | TextField(2000) | Текст вопроса |
| is_resolved | BooleanField | Закрыт (default=False) |
| created_by | FK → User | Автор вопроса, `SET_NULL` |
| created_at | DateTimeField | `auto_now_add=True` |
| resolved_by | FK → User | Кто закрыл, `SET_NULL`, необязательно |
| resolved_at | DateTimeField | Когда закрыт, необязательно |

Правило: на одну запись (object_type + object_id + institution) может быть только один активный (незакрытый) вопрос.

### AuditLog (Журнал изменений)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| user | FK → User | `SET_NULL` |
| institution | FK → Institution | `SET_NULL`, необязательно |
| action | CharField(20) | created / updated / deleted |
| object_type | CharField(50) | Имя модели |
| object_id | IntegerField | |
| old_data | TextField | JSON до изменения |
| new_data | TextField | JSON после изменения |
| created_at | DateTimeField | |

### FeedbackComment (Комментарий к UI — legacy)
| Поле | Тип | Описание |
|---|---|---|
| id | PK | |
| page_url | CharField(500) | URL страницы |
| selector | TextField | CSS-селектор элемента |
| element_preview | CharField(200) | Текст элемента (превью) |
| comment | TextField | Комментарий |
| created_at | DateTimeField | |

> Модель есть в БД (через миграции), но API-эндпоинтов и UI для неё нет. Фактически не используется.

## Медиафайлы

Хранятся локально в `media/`:
- `media/institutions/` — фото организаций
- `media/employees/` — фото сотрудников
- `media/students/` — фото студентов
- `media/parents/` — фото опекунов
- `media/users/` — фото профилей пользователей
- `media/documents/` — загруженные документы
