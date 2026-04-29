# Полная спецификация АИС учебного заведения

Django-проект. Одно приложение `core`. Нет REST API, нет JS-фреймворков. Только server-side рендеринг, Django Templates, Bootstrap 5.

---

## 1. Стек

| Компонент | Технология |
|---|---|
| Backend | Django 4.x, Python 3.x |
| БД | SQLite (`db.sqlite3`) |
| Формы | Django ModelForms + crispy-forms + crispy-bootstrap5 |
| UI | Bootstrap 5 |
| Экспорт | openpyxl |
| Хеширование сид-фразы | Django `make_password` / `check_password` |
| Медиафайлы | локальная папка `media/` |

---

## 2. Мультиарендность (multi-tenant)

Система обслуживает несколько учебных заведений. Изоляция — не на уровне БД-схем, а через поле `institution` (FK) на каждой сущности.

**Как работает:**
- `platform_owner` — единственный суперпользователь всей платформы. Он создаёт заведения и входит в них через сессию (`request.session['institution_id']`).
- Все остальные роли (`superadmin`, `admin`, `teacher`) привязаны к конкретному заведению через `User.institution`.
- Вспомогательная функция `get_current_institution(request)` в `core/utils.py` возвращает нужное заведение: для `platform_owner` — из сессии, для остальных — из `user.institution`.
- Все queryset'ы в views фильтруются через `institution` — ни один объект одного заведения не виден пользователям другого.

---

## 3. Модели данных (`core/models.py`)

### 3.1 Institution (Учебное заведение)
**Файл:** `core/models.py:9`

| Поле | Тип | Описание |
|---|---|---|
| `code` | CharField(20), unique | Короткий код, пример: `МКАГ` |
| `name` | CharField(255) | Полное название |
| `notes` | TextField, blank | Заметки |
| `created_at` | DateTimeField, auto | Дата создания |

**Связи:** является корневым объектом для `Faculty`, `Position`, `Employee`, `Parent`, `Subject`, `User`.

---

### 3.2 Faculty (Факультет / Специальность)
**Файл:** `core/models.py:28`

| Поле | Тип | Описание |
|---|---|---|
| `institution` | FK → Institution, CASCADE | Принадлежность заведению |
| `full_name` | CharField(255) | Полное название |
| `short_name` | CharField(50) | Аббревиатура, используется в имени группы |
| `created_at` | DateField, null/blank | Дата создания факультета (влияет на валидацию года группы) |

**Связи:**
- Имеет множество `Group` (related_name `groups`)
- Имеет множество `Student` (related_name `students`)

---

### 3.3 Position (Должность)
**Файл:** `core/models.py:50`

| Поле | Тип | Описание |
|---|---|---|
| `institution` | FK → Institution, CASCADE | Принадлежность заведению |
| `name` | CharField(255) | Название должности |
| `is_teacher` | BooleanField | Признак «преподавательская» (влияет на фильтр учителей в subject_detail) |

**Связи:** на Position ссылается `Employee.position`.

---

### 3.4 Employee (Сотрудник)
**Файл:** `core/models.py:71`

| Поле | Тип | Описание |
|---|---|---|
| `institution` | FK → Institution, CASCADE | Принадлежность заведению |
| `last_name` | CharField(100) | Фамилия |
| `first_name` | CharField(100) | Имя |
| `middle_name` | CharField(100), blank | Отчество |
| `birth_date` | DateField, null/blank | Дата рождения |
| `phone` | CharField(20), blank | Телефон |
| `email` | EmailField, blank | Email |
| `photo` | ImageField, upload `employees/` | Фото |
| `position` | FK → Position, PROTECT, null | Должность |

**Связи:**
- Является классным руководителем групп: `Group.headteacher` (related_name `headed_groups`)
- Ведёт предметы в группах: `GroupSubjectEmployee` (related_name `subject_assignments`)
- Может быть привязан к учётной записи: `User.employee` (OneToOne, related_name `user_account`)
- Документы: `Document` (owner_type=`employee`, owner_id=pk)
- Заявки на удаление: `DeleteRequest` (object_type=`Employee`)

---

### 3.5 Group (Группа)
**Файл:** `core/models.py:104`

| Поле | Тип | Описание |
|---|---|---|
| `group_number` | PositiveIntegerField | Порядковый номер группы внутри факультета (авто-инкремент при создании) |
| `year` | IntegerField | Год начала обучения |
| `faculty` | FK → Faculty, CASCADE | Факультет |
| `headteacher` | FK → Employee, SET_NULL, null | Классный руководитель |

**Вычисляемое поле:** `name` (property) = `{faculty.short_name}-{group_number}-{year[-2:]}`, пример: `ИС-3-24`.

**Авто-нумерация:** при создании (`not self.pk`) считает количество существующих групп на факультете и присваивает `group_number = count + 1`.

**Связи:**
- Студенты: `Student.group` (related_name `students`)
- Предметы: `GroupSubjectEmployee` (related_name `subject_assignments`)
- Заявки на удаление: `DeleteRequest` (object_type=`Group`)

---

### 3.6 Student (Студент)
**Файл:** `core/models.py:141`

| Поле | Тип | Описание |
|---|---|---|
| `last_name` | CharField(100) | Фамилия |
| `first_name` | CharField(100) | Имя |
| `middle_name` | CharField(100), blank | Отчество |
| `birth_date` | DateField, null/blank | Дата рождения |
| `phone` | CharField(20), blank | Телефон |
| `email` | EmailField, blank | Email |
| `photo` | ImageField, upload `students/` | Фото |
| `status` | CharField(30), choices | Статус (см. ниже) |
| `group` | FK → Group, SET_NULL, null | Группа (null = абитуриент) |
| `faculty` | FK → Faculty, CASCADE | Факультет |

**Статусы студента:**

| Код | Отображение |
|---|---|
| `pending_review` | На рассмотрении |
| `pending_enrollment` | На зачисление |
| `enrolled` | Зачислен |
| `pending_expulsion` | На отчисление |
| `expelled` | Отчислен |
| `transferred` | Переведён |

**Связи:**
- Опекуны: через промежуточную модель `StudentParent` (related_name `student_parents`)
- Документы: `Document` (owner_type=`student`, owner_id=pk)
- История изменений: `AuditLog` (object_type=`Student`, object_id=pk)
- Заявки на удаление: `DeleteRequest` (object_type=`Student`)

---

### 3.7 Parent (Опекун / Родитель)
**Файл:** `core/models.py:187`

| Поле | Тип | Описание |
|---|---|---|
| `institution` | FK → Institution, CASCADE | Принадлежность заведению |
| `last_name` | CharField(100) | Фамилия |
| `first_name` | CharField(100) | Имя |
| `middle_name` | CharField(100), blank | Отчество |
| `birth_date` | DateField, null/blank | Дата рождения |
| `phone` | CharField(20), blank | Телефон |
| `email` | EmailField, blank | Email |
| `photo` | ImageField, upload `parents/` | Фото |

**Связи:**
- Студенты: через `StudentParent` (related_name `student_parents`)
- Документы: `Document` (owner_type=`parent`, owner_id=pk)
- Заявки на удаление: `DeleteRequest` (object_type=`Parent`)

---

### 3.8 StudentParent (Связь студент ↔ опекун)
**Файл:** `core/models.py:216`

Промежуточная таблица many-to-many с типом связи.

| Поле | Тип | Описание |
|---|---|---|
| `student` | FK → Student, CASCADE | Студент |
| `parent` | FK → Parent, CASCADE | Опекун |
| `relation_type` | CharField(20), choices | Тип связи |

**Типы связи:**

| Код | Отображение |
|---|---|
| `mother` | Мать |
| `father` | Отец |
| `guardian` | Опекун |

**Ограничение:** `unique_together = [('student', 'parent')]` — пара студент+опекун уникальна.

**Где создаётся связь:**
1. Со стороны студента: `POST /students/<pk>/parents/add/` → view `student_add_parent` (`core/views.py:575`) — форма `StudentParentForm`, выбирается существующий опекун + тип связи.
2. Со стороны опекуна: `POST /guardians/<pk>/add-student/` → view `guardian_add_student` (`core/views.py:687`) — сырой POST с полями `student` и `relation_type`, использует `get_or_create`.

**Где удаляется связь:**
- `POST /students/<pk>/parents/<sp_pk>/remove/` → view `student_remove_parent` (`core/views.py:588`)

---

### 3.9 Subject (Предмет)
**Файл:** `core/models.py:248`

| Поле | Тип | Описание |
|---|---|---|
| `institution` | FK → Institution, CASCADE | Принадлежность заведению |
| `name` | CharField(255) | Название предмета |

**Связи:** назначается в группы через `GroupSubjectEmployee`.

---

### 3.10 GroupSubjectEmployee (Предмет в группе)
**Файл:** `core/models.py:268`

Тройная связь: предмет + группа + преподаватель.

| Поле | Тип | Описание |
|---|---|---|
| `group` | FK → Group, CASCADE | Группа |
| `subject` | FK → Subject, CASCADE | Предмет |
| `employee` | FK → Employee, CASCADE | Преподаватель |

**Ограничение:** `unique_together = [('group', 'subject')]` — в одной группе предмет ведёт ровно один преподаватель.

**Где создаётся:**
1. Из группы: `POST /groups/<pk>/subjects/add/` → `group_subject_add` (`core/views.py:431`) — форма `GroupSubjectEmployeeForm`, выбор предмета + сотрудника.
2. Из сотрудника: `POST /employees/<pk>/assign-subject/` → `employee_subject_assign` (`core/views.py:792`) — форма `EmployeeSubjectAssignForm`, выбор группы + предмета. Если пара (group, subject) уже существует — обновляет сотрудника (перепривязка).

**Где удаляется:**
- `POST /groups/<pk>/subjects/<assignment_pk>/delete/` → `group_subject_delete` (`core/views.py:444`)

---

### 3.11 Document (Документ)
**Файл:** `core/models.py:295`

| Поле | Тип | Описание |
|---|---|---|
| `owner_type` | CharField(20), choices | Тип владельца: `student`, `employee`, `parent` |
| `owner_id` | IntegerField | ID владельца (без FK, без GenericForeignKey) |
| `name` | CharField(255) | Название документа |
| `description` | TextField, blank | Описание |
| `doc_type` | CharField(20), choices, blank | Тип: `passport`, `snils`, `policy`, `certificate`, `order`, `other` |
| `file` | FileField, upload `documents/` | Файл |
| `uploaded_at` | DateField, auto | Дата загрузки |

**Property `is_image`:** проверяет расширение файла (jpg/jpeg/png/gif/webp).

**URL загрузки:** `/documents/upload/<owner_type>/<owner_id>/` — универсальный для всех владельцев.

**Форма:** `DocumentForm` — не ModelForm, а простая Form; поддерживает мультизагрузку (`files` = FileField с `multiple=True`). При сохранении создаётся несколько объектов Document в цикле.

---

### 3.12 User (Пользователь)
**Файл:** `core/models.py:355`

Кастомная модель, наследует `AbstractBaseUser + PermissionsMixin`. `AUTH_USER_MODEL = 'core.User'`.

| Поле | Тип | Описание |
|---|---|---|
| `username` | CharField(150), unique | Логин |
| `display_name` | CharField(150), blank | Отображаемое имя |
| `role` | CharField(20), choices | Роль (см. ниже) |
| `institution` | FK → Institution, CASCADE, null | Заведение (null для platform_owner) |
| `employee` | OneToOneField → Employee, SET_NULL, null | Привязка к сотруднику |
| `seed_phrase_hash` | CharField(256), blank | Хэш сид-фразы (для восстановления пароля) |
| `is_active` | BooleanField | Активен |
| `is_staff` | BooleanField | Доступ к Django Admin |

**Роли:**

| Код | Отображение | Уровень |
|---|---|---|
| `platform_owner` | Владелец платформы | Глобальный |
| `superadmin` | Суперадминистратор | В рамках заведения |
| `admin` | Администратор | В рамках заведения |
| `teacher` | Преподаватель | В рамках своих групп |

**Properties:**

| Property | Истина если |
|---|---|
| `is_platform_owner` | `role == 'platform_owner'` |
| `is_superadmin` | `role in ('superadmin', 'platform_owner')` |
| `is_admin` | `role in ('superadmin', 'admin', 'platform_owner')` |
| `is_teacher_role` | `role == 'teacher'` |

---

### 3.13 DeleteRequest (Заявка на удаление)
**Файл:** `core/models.py:413`

| Поле | Тип | Описание |
|---|---|---|
| `user` | FK → User, CASCADE | Инициатор |
| `object_type` | CharField(50), choices | Тип: `Faculty`, `Group`, `Student`, `Employee`, `Parent` |
| `object_id` | IntegerField | ID объекта |
| `reason` | TextField | Причина удаления |
| `status` | CharField(20) | `pending`, `approved`, `rejected` |
| `created_at` | DateTimeField, auto | Дата создания |

---

### 3.14 FeedbackComment (Комментарий к интерфейсу)
**Файл:** `core/models.py:455`

Инструмент разработки. Позволяет оставлять замечания к UI прямо с указанием CSS-селектора элемента.

| Поле | Тип | Описание |
|---|---|---|
| `page_url` | CharField(500) | URL страницы |
| `selector` | TextField | CSS-селектор элемента |
| `element_preview` | CharField(200), blank | Текст превью элемента |
| `comment` | TextField | Комментарий |
| `created_at` | DateTimeField, auto | Дата |

---

### 3.15 AuditLog (Журнал изменений)
**Файл:** `core/models.py:475`

| Поле | Тип | Описание |
|---|---|---|
| `user` | FK → User, SET_NULL, null | Кто совершил действие |
| `action` | CharField(20), choices | `created`, `updated`, `deleted` |
| `object_type` | CharField(50) | Тип объекта (имя класса модели) |
| `object_id` | IntegerField | ID объекта |
| `old_data` | TextField | JSON до изменения |
| `new_data` | TextField | JSON после изменения |
| `created_at` | DateTimeField, auto | Метка времени |

---

## 4. Ролевой доступ

### 4.1 Декораторы (`core/utils.py`)

| Декоратор | Разрешает | Файл |
|---|---|---|
| `@login_required` | Любой авторизованный пользователь | Django built-in |
| `@admin_required` | `is_admin` = superadmin + admin + platform_owner | `utils.py:88` |
| `@superadmin_required` | `is_superadmin` = superadmin + platform_owner | `utils.py:77` |
| `@platform_owner_required` | только `platform_owner` | `utils.py:99` |

### 4.2 Матрица прав по действиям

| Действие | teacher | admin | superadmin | platform_owner |
|---|---|---|---|---|
| Просмотр своих групп/студентов | ✅ | ✅ | ✅ | ✅ |
| Просмотр всех студентов заведения | ❌ | ✅ | ✅ | ✅ |
| Создание/редактирование студентов | ❌ | ✅ | ✅ | ✅ |
| Создание/редактирование факультетов | ❌ | ✅ | ✅ | ✅ |
| Создание/редактирование групп | ❌ | ✅ | ✅ | ✅ |
| Создание/редактирование сотрудников | ❌ | ✅ | ✅ | ✅ |
| Создание/редактирование опекунов | ❌ | ✅ | ✅ | ✅ |
| Загрузка документов | ❌ | ✅ | ✅ | ✅ |
| Управление должностями | ❌ | ❌ | ✅ | ✅ |
| Управление пользователями | ❌ | ❌ | ✅ | ✅ |
| Просмотр журнала аудита | ❌ | ❌ | ✅ | ✅ |
| Просмотр заявок на удаление | ❌ | ❌ | ✅ | ✅ |
| Одобрение/отклонение заявок | ❌ | ❌ | ✅ | ✅ |
| Прямое удаление | ❌ | ❌ | ✅ | ✅ |
| Отправка заявок на удаление | ❌ | ✅ | → прямое удаление | ✅ |
| Управление заведениями | ❌ | ❌ | ❌ | ✅ |
| Вход в заведение по сессии | ❌ | ❌ | ❌ | ✅ |

### 4.3 Ограничения преподавателя

Преподаватель (`teacher`) видит только те группы и студентов, где:
- он является `headteacher` группы, **или**
- у него есть запись `GroupSubjectEmployee` с этой группой.

Логика — queryset-фильтрация в views:
- `student_list` — `core/views.py:469`
- `group_list` — `core/views.py:333`
- `group_detail` — `core/views.py:393`
- `student_detail` — `core/views.py:517`

---

## 5. Функциональные модули

### 5.1 Инициализация платформы (`setup`)

**URL:** `/setup/`  
**View:** `setup_view` (`core/views.py:36`)  
**Доступ:** только если нет ни одного `platform_owner`; иначе редирект на `/login/`.

**Алгоритм:**
1. Валидация формы `PlatformSetupForm` (имя, логин, пароль ×2).
2. Генерация 12-словной сид-фразы через `generate_seed_phrase()` (`utils.py:28`) из словаря русских слов.
3. Создание пользователя `role=platform_owner`, `is_staff=True`, `is_superuser=True`.
4. Хэш сид-фразы через `make_password` → сохраняется в `user.seed_phrase_hash`.
5. Сид-фраза (чистый текст) кладётся в сессию `request.session['setup_seed']`.
6. Редирект на `/setup/complete/` — там выводится сид-фраза пользователю **один раз** и удаляется из сессии.

---

### 5.2 Восстановление пароля

**URLs:** `/forgot-password/`, `/reset-password/`  
**Views:** `forgot_password_view`, `reset_password_view` (`core/views.py:70,87`)  
**Доступ:** публичный (без авторизации).

**Алгоритм:**
1. Пользователь вводит логин + сид-фразу (12 слов).
2. Находится пользователь по логину.
3. Проверяется `hash_check(seed_phrase, user.seed_phrase_hash)`.
4. При успехе `request.session['reset_user_id'] = user.pk` → редирект на `/reset-password/`.
5. На странице сброса вводится новый пароль (с валидацией сложности).
6. `user.set_password(new_password)` → сессия `reset_user_id` очищается → редирект на логин.

---

### 5.3 Управление заведениями (`institution`)

**URLs:** `/institutions/`, `/institutions/add/`, `/institutions/<pk>/enter/`, `/institutions/exit/`  
**Views:** `institution_list`, `institution_add`, `institution_enter`, `institution_exit` (`core/views.py:132–178`)  
**Доступ:** только `platform_owner`.

**Создание заведения (`institution_add`):**
1. Форма `InstitutionForm`: поля заведения (code, name, notes) + данные первого суперадмина (display_name, username, password).
2. Код заведения приводится к верхнему регистру.
3. Создаётся `Institution`.
4. Сразу создаётся `User(role='superadmin', institution=institution)` — первый суперадмин заведения.

**Вход в заведение:**
- `institution_enter` записывает `institution.pk` в сессию.
- `institution_exit` удаляет из сессии.
- Dashboard и все views читают текущее заведение через `get_current_institution(request)`.

**Список заведений аннотируется:** `user_count`, `faculty_count` через `Count`.

---

### 5.4 Факультеты

**URLs:** `/faculties/`, `/faculties/add/`, `/faculties/<pk>/`, `/faculties/<pk>/edit/`, `/faculties/<pk>/delete/`

| View | Доступ | Описание |
|---|---|---|
| `faculty_list` | `@login_required` | Список с поиском по `q` (full_name, short_name). Аннотируется `group_count`. |
| `faculty_add` | `@admin_required` | Форма создания. Привязывает `institution` из сессии. Логирует `log_action('created')`. |
| `faculty_edit` | `@admin_required` | Форма редактирования. Логирует `log_action('updated')` со старыми данными. |
| `faculty_detail` | `@login_required` | Список групп факультета, аннотирован `student_count`. |
| `faculty_delete_request` | `@admin_required` | Если superadmin — редирект на `direct_delete`. Если admin — создаёт `DeleteRequest`. |

---

### 5.5 Группы

**URLs:** `/groups/`, `/groups/add/`, `/groups/<pk>/`, `/groups/<pk>/edit/`, `/groups/<pk>/delete/`, `/groups/<pk>/subjects/add/`, `/groups/<pk>/subjects/<assignment_pk>/delete/`

| View | Доступ | Описание |
|---|---|---|
| `group_list` | `@login_required` | Admin видит все. Teacher видит только свои. Поиск по `q`. |
| `group_add` | `@admin_required` | Форма `GroupForm`. Год ≥ года создания факультета (валидация в форме). |
| `group_edit` | `@admin_required` | Редактирование. Логирование. |
| `group_detail` | `@login_required` | Список студентов + список предметов. Teacher проверяется по headteacher/subject_assignments. |
| `group_delete_request` | `@admin_required` | Аналогично факультетам. |
| `group_subject_add` | `@admin_required` | Добавляет `GroupSubjectEmployee`. Форма `GroupSubjectEmployeeForm`. |
| `group_subject_delete` | `@admin_required` | Удаляет `GroupSubjectEmployee` по pk. |

---

### 5.6 Студенты

**URLs:** `/students/`, `/students/add/`, `/students/<pk>/`, `/students/<pk>/edit/`, `/students/<pk>/delete/`, `/students/<pk>/parents/add/`, `/students/<pk>/parents/<sp_pk>/remove/`, `/students/<pk>/transfer/`

| View | Доступ | Описание |
|---|---|---|
| `student_list` | `@login_required` | Фильтры: поиск по ФИО, факультет, группа, статус. Teacher — только свои группы. |
| `student_add` | `@admin_required` | Форма `StudentForm`. Файлы. Логирование. |
| `student_detail` | `@login_required` | Показывает: личные данные, опекунов, документы, историю AuditLog. Teacher проверяет право через группу. |
| `student_edit` | `@admin_required` | Редактирование. Логирование. |
| `student_delete_request` | `@admin_required` | Двухуровневое удаление. |
| `student_add_parent` | `@admin_required` | Привязка опекуна к студенту. Форма `StudentParentForm` (выбор из Parent + тип). |
| `student_remove_parent` | `@admin_required` | Удаление `StudentParent` по `sp_pk`. |
| `student_transfer` | `@admin_required` | Перевод студента: меняет faculty + group + status → `transferred`. Форма `StudentTransferForm`. Логирование с полем `transfer_reason`. |

---

### 5.7 Опекуны (Parent / Guardian)

**URLs:** `/guardians/`, `/guardians/add/`, `/guardians/<pk>/`, `/guardians/<pk>/edit/`, `/guardians/<pk>/delete/`, `/guardians/<pk>/add-student/`

| View | Доступ | Описание |
|---|---|---|
| `parent_list` | `@admin_required` | Список с поиском по ФИО. |
| `parent_add` | `@admin_required` | Форма `ParentForm`. Привязывает institution. Логирование. |
| `parent_edit` | `@admin_required` | Редактирование. Логирование. |
| `parent_detail` | `@admin_required` | Список привязанных студентов + документы + список доступных для привязки студентов (не привязанных). |
| `parent_delete_request` | `@admin_required` | Двухуровневое удаление. |
| `guardian_add_student` | `@admin_required` | Привязка студента к опекуну (со стороны опекуна). Сырой POST: поля `student` и `relation_type`. `get_or_create`. |

---

### 5.8 Сотрудники

**URLs:** `/employees/`, `/employees/add/`, `/employees/<pk>/`, `/employees/<pk>/edit/`, `/employees/<pk>/delete/`, `/employees/<pk>/assign-subject/`

| View | Доступ | Описание |
|---|---|---|
| `employee_list` | `@admin_required` | Список с поиском по ФИО. |
| `employee_add` | `@admin_required` | Форма `EmployeeForm`. Если нет должностей — флаг `no_positions` в шаблон. |
| `employee_edit` | `@admin_required` | Редактирование. Логирование. |
| `employee_detail` | `@admin_required` | Список групп (headteacher) + список предметов (subject_assignments) + документы. |
| `employee_delete_request` | `@admin_required` | Двухуровневое удаление. |
| `employee_subject_assign` | `@admin_required` | Назначение предмета в группу от лица сотрудника. `get_or_create` + обновление employee если уже есть. |

---

### 5.9 Должности

**URLs:** `/positions/`, `/positions/add/`, `/positions/<pk>/edit/`  
**Доступ:** `@superadmin_required`

Простой справочник: название. Флаг `is_teacher` (влияет на отображение в `subject_detail` — список «все учителя»).

---

### 5.10 Предметы

**URLs:** `/subjects/`, `/subjects/add/`, `/subjects/<pk>/`, `/subjects/<pk>/edit/`  
**Доступ:** `@admin_required`

| View | Описание |
|---|---|
| `subject_list` | Список с поиском, счётчик `total`. |
| `subject_add` | Форма `SubjectForm`. Привязывает institution. |
| `subject_edit` | Редактирование. |
| `subject_detail` | Список всех групп, где ведётся предмет (`GroupSubjectEmployee`). Список всех преподавателей с `position.is_teacher=True`. Множество `assigned_employee_ids` для подсветки в шаблоне. |

---

### 5.11 Документы

**URLs:** `/documents/upload/<owner_type>/<owner_id>/`, `/documents/<pk>/`, `/documents/<pk>/delete/`

| View | Доступ | Описание |
|---|---|---|
| `document_upload` | `@admin_required` | Мультизагрузка файлов. Форма `DocumentForm` (name + description + files[multiple]). Для каждого файла создаётся отдельный `Document`. После загрузки — редирект на страницу владельца через `_redirect_to_owner`. |
| `document_detail` | `@login_required` | Просмотр одного документа. Если `doc.is_image` — отображается как картинка. |
| `document_delete` | `@admin_required` | Удаляет файл с диска (`doc.file.delete(save=False)`) + запись из БД. Редирект на владельца. |

**Вспомогательная функция** `_redirect_to_owner(owner_type, owner_id)` (`core/views.py:990`) — маршрутизирует назад на student-detail / employee-detail / parent-detail.

---

### 5.12 Управление пользователями

**URLs:** `/users/`, `/users/add/`, `/users/<pk>/`, `/users/<pk>/edit/`, `/users/<pk>/password/`  
**Доступ:** `@superadmin_required`

| View | Описание |
|---|---|
| `user_list` | Список пользователей заведения. Поиск по логину. |
| `user_add` | Форма `UserCreateForm`: логин, имя, роль (только `superadmin/admin/teacher`), привязка к сотруднику, пароль ×2. Логирование. |
| `user_edit` | Форма `UserEditForm`: те же поля без пароля. |
| `user_detail` | Просмотр одного пользователя с привязанным сотрудником. |
| `user_set_password` | Форма `PasswordChangeCustomForm`: новый пароль ×2. |

**Важно:** `platform_owner` создаётся только через setup, создать его через user_add нельзя — форма ограничивает choices до `INSTITUTION_ROLE_CHOICES`.

---

### 5.13 Процесс удаления (двухуровневый)

**Концепция:** admin не может удалять напрямую — только запрашивает. superadmin одобряет или отклоняет.

**Поток для admin:**
1. `POST /faculty/<pk>/delete/` → создаётся `DeleteRequest(status='pending')`.
2. superadmin видит в `/delete-requests/`.
3. `POST /delete-requests/<pk>/approve/` → форма `DeleteConfirmForm` (пароль) → `_perform_delete()` → `dr.status = 'approved'`.
4. `POST /delete-requests/<pk>/reject/` → `dr.status = 'rejected'`.

**Поток для superadmin:**
1. `POST /faculty/<pk>/delete/` → сразу редирект на `direct_delete`.
2. `POST /delete/<object_type>/<pk>/` → форма `DeleteConfirmForm` (пароль суперадмина) → `obj.delete()` + `log_action('deleted')`.

**Объекты поддерживают удаление:** Faculty, Group, Student, Employee, Parent.

**Важно:** Position, Subject — не удаляются через этот механизм (нет маршрутов).

---

### 5.14 Журнал аудита

**URL:** `/audit-log/`  
**View:** `audit_log` (`core/views.py:1186`)  
**Доступ:** `@superadmin_required`

Показывает последние 200 записей `AuditLog` заведения. Сортировка `-created_at`.

**Что логируется:**
- Создание: Faculty, Group, Student, Employee, Parent, User, Position
- Изменение: Faculty, Group, Student, Employee, Parent
- Удаление: Faculty, Group, Student, Employee, Parent (через прямое удаление или одобрение заявки)

**Что НЕ логируется:** Subject, Document, StudentParent, GroupSubjectEmployee, User изменение.

**Вспомогательные функции (`utils.py`):**
- `log_action(user, action, obj, old_data, new_data)` — создаёт AuditLog.
- `model_to_dict_safe(instance)` — сериализует все поля модели в dict (значения через `str()`).

---

### 5.15 Экспорт студентов в Excel

**URL:** `/export/students/?group=<id>&faculty=<id>`  
**View:** `export_students` (`core/views.py:1198`)  
**Доступ:** `@admin_required`

Выгружает студентов заведения в `.xlsx`. Фильтры через GET-параметры `group` или `faculty`.

**Колонки:** №, Фамилия, Имя, Отчество, Дата рождения, Телефон, Email, Статус, Факультет, Группа.

Заголовки жирным (`Font(bold=True)`). Имя файла — `students.xlsx`.

---

### 5.16 Dashboard

**URL:** `/dashboard/`  
**View:** `dashboard` (`core/views.py:186`)  
**Доступ:** `@login_required`

Содержимое зависит от роли:

| Роль | Показывает |
|---|---|
| superadmin | Счётчики (факультеты, группы, студенты, сотрудники), `pending_requests`, последние 10 записей AuditLog |
| admin | Счётчики (факультеты, группы, студенты, сотрудники) |
| teacher | `my_groups` — группы где он headteacher или ведёт предмет; `my_subjects` — его назначения |

Если `institution is None` → редирект на `institution-list`.

---

### 5.17 Feedback-инструмент (dev tool)

**URLs:** `/feedback/`, `/feedback/save/`, `/feedback/<pk>/delete/`

Позволяет кликать по элементам UI и оставлять текстовые замечания. Сохраняется CSS-селектор + превью + комментарий + URL страницы.

- `feedback_save` — принимает JSON POST без `@login_required`.
- `feedback_list` — список всех комментариев (`@login_required`).
- `feedback_delete` — DELETE через POST (`@login_required`).

---

### 5.18 Dev: сброс БД

**URL:** `/dev/reset-db/`  
**View:** `dev_reset_db` (`core/views.py:1292`)  
**Доступ:** `@login_required` + `request.user.is_superadmin`

Удаляет все данные заведения в правильном порядке (зависимости):
AuditLog → DeleteRequest → GroupSubjectEmployee → StudentParent → Student → Parent → Employee → Group → Faculty → Position → Subject → User (кроме текущего).

---

## 6. Валидация паролей

Функция `validate_password_strength` (`core/forms.py:11`) — используется на всех полях пароля:
- Минимум 8 символов.
- Только латиница, цифры, `_` и `-`.
- Обязательно ≥1 цифра.
- Обязательно ≥1 спецсимвол (`_` или `-`).

Применяется в: `PlatformSetupForm`, `ResetPasswordForm`, `UserCreateForm`, `PasswordChangeCustomForm`, `InstitutionForm` (admin_password).

---

## 7. Middleware

**Файл:** `core/middleware.py` (реализация не показана, подключён в `settings.py`)  
**Класс:** `InitializationMiddleware`

Судя по поведению системы (редирект на setup при первом запуске) — проверяет наличие `platform_owner` и редиректит на `/setup/` если его нет.

---

## 8. Все URL-маршруты

```
GET/POST  /setup/                                        setup_view
GET       /setup/complete/                               setup_complete_view
GET/POST  /forgot-password/                              forgot_password_view
GET/POST  /reset-password/                               reset_password_view
GET/POST  /login/                                        login_view
POST      /logout/                                       logout_view

GET       /institutions/                                 institution_list       [platform_owner]
GET/POST  /institutions/add/                             institution_add        [platform_owner]
GET       /institutions/<pk>/enter/                      institution_enter      [platform_owner]
GET       /institutions/exit/                            institution_exit       [platform_owner]

GET       /                                              dashboard
GET       /dashboard/                                    dashboard

GET       /faculties/                                    faculty_list
GET/POST  /faculties/add/                                faculty_add            [admin]
GET       /faculties/<pk>/                               faculty_detail
GET/POST  /faculties/<pk>/edit/                          faculty_edit           [admin]
GET/POST  /faculties/<pk>/delete/                        faculty_delete_request [admin]

GET       /groups/                                       group_list
GET/POST  /groups/add/                                   group_add              [admin]
GET       /groups/<pk>/                                  group_detail
GET/POST  /groups/<pk>/edit/                             group_edit             [admin]
GET/POST  /groups/<pk>/delete/                           group_delete_request   [admin]
GET/POST  /groups/<pk>/subjects/add/                     group_subject_add      [admin]
POST      /groups/<pk>/subjects/<assignment_pk>/delete/  group_subject_delete   [admin]

GET       /students/                                     student_list
GET/POST  /students/add/                                 student_add            [admin]
GET       /students/<pk>/                                student_detail
GET/POST  /students/<pk>/edit/                           student_edit           [admin]
GET/POST  /students/<pk>/delete/                         student_delete_request [admin]
GET/POST  /students/<pk>/parents/add/                    student_add_parent     [admin]
POST      /students/<pk>/parents/<sp_pk>/remove/         student_remove_parent  [admin]
GET/POST  /students/<pk>/transfer/                       student_transfer       [admin]

GET       /guardians/                                    parent_list            [admin]
GET/POST  /guardians/add/                                parent_add             [admin]
GET       /guardians/<pk>/                               parent_detail          [admin]
GET/POST  /guardians/<pk>/edit/                          parent_edit            [admin]
GET/POST  /guardians/<pk>/delete/                        parent_delete_request  [admin]
POST      /guardians/<pk>/add-student/                   guardian_add_student   [admin]

GET       /employees/                                    employee_list          [admin]
GET/POST  /employees/add/                                employee_add           [admin]
GET       /employees/<pk>/                               employee_detail        [admin]
GET/POST  /employees/<pk>/edit/                          employee_edit          [admin]
GET/POST  /employees/<pk>/delete/                        employee_delete_request[admin]
GET/POST  /employees/<pk>/assign-subject/                employee_subject_assign[admin]

GET       /positions/                                    position_list          [superadmin]
GET/POST  /positions/add/                                position_add           [superadmin]
GET/POST  /positions/<pk>/edit/                          position_edit          [superadmin]

GET       /subjects/                                     subject_list           [admin]
GET/POST  /subjects/add/                                 subject_add            [admin]
GET       /subjects/<pk>/                                subject_detail         [admin]
GET/POST  /subjects/<pk>/edit/                           subject_edit           [admin]

GET/POST  /documents/upload/<owner_type>/<owner_id>/     document_upload        [admin]
GET       /documents/<pk>/                               document_detail
GET/POST  /documents/<pk>/delete/                        document_delete        [admin]

GET       /users/                                        user_list              [superadmin]
GET/POST  /users/add/                                    user_add               [superadmin]
GET       /users/<pk>/                                   user_detail            [superadmin]
GET/POST  /users/<pk>/edit/                              user_edit              [superadmin]
GET/POST  /users/<pk>/password/                          user_set_password      [superadmin]

GET/POST  /delete/<object_type>/<pk>/                    direct_delete          [superadmin]

GET       /delete-requests/                              delete_request_list    [superadmin]
GET/POST  /delete-requests/<pk>/approve/                 delete_request_approve [superadmin]
POST      /delete-requests/<pk>/reject/                  delete_request_reject  [superadmin]

GET       /audit-log/                                    audit_log              [superadmin]

GET       /export/students/                              export_students        [admin]

GET       /feedback/                                     feedback_list
POST      /feedback/save/                                feedback_save
POST      /feedback/<pk>/delete/                         feedback_delete

POST      /dev/reset-db/                                 dev_reset_db           [superadmin]
```

---

## 9. Граф связей между моделями

```
Institution
 ├── Faculty (FK institution)
 │    └── Group (FK faculty)
 │         ├── Student (FK group, FK faculty)
 │         │    └── StudentParent (FK student + FK parent)
 │         └── GroupSubjectEmployee (FK group + FK subject + FK employee)
 ├── Employee (FK institution)
 │    ├── Group.headteacher (FK employee)
 │    ├── GroupSubjectEmployee (FK employee)
 │    └── User.employee (OneToOne)
 ├── Position (FK institution) ← Employee.position
 ├── Subject (FK institution) ← GroupSubjectEmployee
 ├── Parent (FK institution)
 │    └── StudentParent (FK parent)
 └── User (FK institution)
      ├── AuditLog (FK user)
      └── DeleteRequest (FK user)

Document (owner_type + owner_id → Student | Employee | Parent)
AuditLog (object_type + object_id → любая модель)
DeleteRequest (object_type + object_id → Faculty | Group | Student | Employee | Parent)
```

---

## 10. Ключевые особенности и потенциальные проблемы

### 10.1 Document — нет FK (только owner_type + owner_id)
- Нет каскадного удаления. При удалении студента/сотрудника/опекуна документы **не удаляются** автоматически — остаются «висячими» записями в БД.
- Файл удаляется вручную только через `document_delete` (`doc.file.delete(save=False)`).

### 10.2 AuditLog — нет FK на объект
- Аналогично: `object_type` + `object_id` без FK. При удалении объекта его лог остаётся.

### 10.3 Отсутствие пагинации
- `audit_log` ограничен срезом `[:200]`, остальные списки — без пагинации.

### 10.4 Нет select_related / prefetch_related на ряде списков
- `parent_list` — нет prefetch `student_parents`.
- `employee_list` — есть `select_related('position')`.
- `student_list` — есть `select_related('faculty', 'group', 'group__faculty')`.

### 10.5 group_number — не редактируемый
- Авто-инкремент при создании: `count + 1`. При удалении группы номера не пересчитываются.

### 10.6 StudentParent — привязка возможна с двух сторон
- Со стороны студента: форма `StudentParentForm`.
- Со стороны опекуна: сырой POST без валидации через форму — нет проверки принадлежности студента к текущему заведению... Нет, проверка есть: `get_object_or_404(Student, pk=student_id, faculty__institution=institution)`.

### 10.7 Position.is_teacher не используется при назначении предметов
- `GroupSubjectEmployeeForm` и `EmployeeSubjectAssignForm` не фильтруют сотрудников по `is_teacher`. Любого сотрудника можно назначить на предмет.
- `is_teacher` используется только в `subject_detail` для отображения списка «всех учителей».

### 10.8 Нет мягкого удаления (soft delete)
- Все удаления физические. Исторические данные в AuditLog сохраняются как JSON-снимок.
