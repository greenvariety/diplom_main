# AUTOTEST — План автотестов

Django `unittest` + `TestCase`. Все тесты в `core/tests/`.
Запуск: `python manage.py test core`

---

## 1. Тесты моделей (`test_models.py`)

### 1.1 Group — автогенерация номера группы
- Создать факультет, создать первую группу → `group_number == 1`
- Создать вторую группу на том же факультете → `group_number == 2`
- При редактировании существующей группы (есть `pk`) → `group_number` не меняется

### 1.2 Group — свойство `name`
- Факультет `short_name="ИТ"`, год=2023, `group_number=3` → `name == "ИТ-3-23"`

### 1.3 User — свойства ролей
- Пользователь с `role="owner"` → `is_owner=True`, `is_superadmin=True`, `is_admin=True`, `is_teacher_role=False`
- Пользователь с `role="admin"` → `is_owner=False`, `is_superadmin=False`, `is_admin=True`, `is_teacher_role=False`
- Пользователь с `role="teacher"` → `is_owner=False`, `is_admin=False`, `is_teacher_role=True`

### 1.4 Document — свойство `is_image`
- Файл `photo.jpg` → `is_image=True`
- Файл `photo.PNG` → `is_image=True`
- Файл `contract.pdf` → `is_image=False`
- Файл `table.docx` → `is_image=False`

### 1.5 Institution — unique_together (owner, code)
- Один и тот же владелец не может создать две организации с одинаковым кодом → `IntegrityError`
- Разные владельцы могут иметь одинаковый код → без ошибок

### 1.6 GroupSubjectEmployee — unique_together (group, subject)
- Нельзя назначить двух преподавателей на один предмет в одной группе → `IntegrityError`

### 1.7 StudentParent — unique_together (student, parent)
- Нельзя привязать одного опекуна к студенту дважды → `IntegrityError`

### 1.8 Employee `full_name()`
- Все три поля заполнены → возвращает `"Фамилия Имя Отчество"`
- Без отчества → возвращает `"Фамилия Имя"` (без лишнего пробела)

---

## 2. Тесты авторизации (`test_auth.py`)

### 2.1 Вход
- POST `/login/` с верными логином/паролем → 302, пользователь залогинен
- POST `/login/` с неверным паролем → 200, форма с ошибкой, пользователь не залогинен
- POST `/login/` с пустым логином → 200, форма с ошибкой

### 2.2 Выход
- GET `/logout/` под авторизованным → 302 на `/login/`
- После выхода: запрос к `/dashboard/` → редирект на `/login/`

### 2.3 Защита маршрутов
- Неавторизованный GET `/dashboard/` → 302 на `/login/`
- Неавторизованный GET `/students/` → 302 на `/login/`

---

## 3. Тесты выбора организации (`test_org_picker.py`)

### 3.1 После логина — нет организаций
- Владелец без организаций → попадает на `/organizations/` с формой создания (пусто)
- Не-владелец без организаций → попадает на `/organizations/` (пустой список)

### 3.2 После логина — одна организация
- Не-владелец (admin/teacher) с одной организацией в `allowed_institutions` → сразу на `/dashboard/`, пикер не показывается

### 3.3 После логина — несколько организаций
- Не-владелец с несколькими организациями в `allowed_institutions` → попадает на `/organizations/` с выбором

### 3.4 После логина — владелец с организациями
- Владелец с одной и более организациями → попадает на `/organizations/` (видит свои + кнопку создать)

### 3.5 Создание организации
- POST `/organizations/create/` с валидными данными → создаётся Institution, пользователь становится owner

### 3.6 Переключение организации
- POST `/organizations/switch/<id>/` → активная организация меняется в сессии

---

## 4. Тесты прав доступа (`test_permissions.py`)

### Подготовка: 3 пользователя — owner, admin, teacher + организация

### 4.1 Teacher не может попасть в admin-зоны
- `/faculties/create/` → 403
- `/students/create/` → 403
- `/employees/create/` → 403
- `/groups/create/` → 403

### 4.2 Admin не может попасть в superadmin-зоны
- `/users/` → 403
- `/positions/` → 403
- `/audit-log/` → 403
- `/delete-requests/` → 403
- `/delete/Student/1/` → 403

### 4.3 Admin может создавать заявки на удаление
- POST `/faculties/<id>/delete-request/` → 302, создаётся `DeleteRequest` в статусе `pending`

### 4.4 Owner видит все разделы
- `/users/` → 200
- `/positions/` → 200
- `/audit-log/` → 200
- `/delete-requests/` → 200

---

## 5. Тесты факультетов (`test_faculties.py`)

### 5.1 Список
- admin: GET `/faculties/` → 200, показывает все факультеты организации
- teacher: GET `/faculties/` → 403 (нет доступа)

### 5.2 Создание
- admin POST `/faculties/create/` с валидными данными → создаётся факультет, редирект на список
- admin POST с пустым `full_name` → 200, форма с ошибкой

### 5.3 Редактирование
- admin POST `/faculties/<id>/edit/` → обновляются данные

### 5.4 Удаление (owner — напрямую)
- owner POST `/delete/Faculty/<id>/` → факультет удалён из БД

### 5.5 Заявка на удаление (admin)
- admin POST `/faculties/<id>/delete-request/` → `DeleteRequest` создан, факультет не удалён

### 5.6 Детальная страница
- GET `/faculties/<id>/` → 200, виден список групп факультета

---

## 6. Тесты групп (`test_groups.py`)

### 6.1 Автогенерация номера при создании
- Создать группу через вьюху POST `/groups/create/` → `group_number` установлен автоматически

### 6.2 Teacher видит только свои группы
- Создать группу где teacher — классный руководитель → виден в `/groups/`
- Создать группу где teacher не участвует → НЕ виден в `/groups/`

### 6.3 Teacher видит только свои группы через `GroupSubjectEmployee`
- Назначить teacher через `GroupSubjectEmployee` на группу → видит эту группу в списке

### 6.4 Admin видит все группы
- admin GET `/groups/` → видит все группы организации

### 6.5 Добавление предмета в группу
- POST `/groups/<id>/subjects/add/` → создаётся `GroupSubjectEmployee`
- Попытка добавить тот же предмет снова → ошибка (unique_together)

### 6.6 Удаление предмета из группы
- POST `/groups/<id>/subjects/remove/<gse_id>/` → запись `GroupSubjectEmployee` удалена

---

## 7. Тесты студентов (`test_students.py`)

### 7.1 Создание студента
- admin POST `/students/create/` → создаётся студент со статусом `pending_review`

### 7.2 Фильтрация списка
- Создать студентов разных статусов; фильтр по статусу `enrolled` → показывает только зачисленных
- Фильтр по группе → только студенты этой группы
- Поиск по фамилии → находит нужного

### 7.3 Изменение статуса
- admin POST `/students/<id>/edit/` с `status=enrolled` → статус обновлён

### 7.4 Teacher видит только студентов своих групп
- Студент в группе teacher → виден
- Студент в другой группе → НЕ виден

### 7.5 Перевод студента
- POST `/students/<id>/transfer/` с новой группой → группа студента изменена, статус `transferred`

### 7.6 Привязка/отвязка опекуна
- POST `/students/<id>/guardians/add/` → создаётся `StudentParent`
- POST `/students/<id>/guardians/remove/<sp_id>/` → `StudentParent` удалён

### 7.7 Экспорт в Excel
- admin GET `/export/students/` → ответ с `Content-Type: application/vnd.ms-excel` или `.xlsx`

### 7.8 Заявка на удаление
- admin: создаётся `DeleteRequest`, студент не удалён
- owner: прямое удаление → студент удалён из БД

---

## 8. Тесты опекунов (`test_guardians.py`)

### 8.1 Список — только admin+
- teacher GET `/guardians/` → 403

### 8.2 Создание и редактирование
- admin POST `/guardians/create/` с валидными данными → создаётся Parent

### 8.3 Привязка студентов к опекуну
- POST `/guardians/<id>/students/add/` → создаётся `StudentParent`

### 8.4 Заявка на удаление / прямое удаление
- admin создаёт заявку → `DeleteRequest` создан
- owner удаляет напрямую → Parent удалён

---

## 9. Тесты сотрудников (`test_employees.py`)

### 9.1 Список — только admin+
- teacher GET `/employees/` → 403

### 9.2 Создание
- admin POST `/employees/create/` → создаётся Employee в текущей организации

### 9.3 Назначение на несколько организаций
- owner добавляет сотрудника в `allowed_institutions` второй организации → сотрудник виден в обеих

### 9.4 Удаление из одной организации
- Убрать организацию из `allowed_institutions` → сотрудник исчезает из этой организации, остаётся в другой

### 9.5 Назначение предметов
- Через вьюху назначить сотрудника на предмет в группе → создаётся `GroupSubjectEmployee`

---

## 10. Тесты должностей (`test_positions.py`)

### 10.1 Доступ
- owner GET `/positions/` → 200
- admin GET `/positions/` → 403
- teacher GET `/positions/` → 403

### 10.2 CRUD
- owner POST `/positions/create/` → создаётся Position
- owner POST `/positions/<id>/edit/` → обновляется
- owner POST `/positions/<id>/delete/` → удаляется

---

## 11. Тесты предметов (`test_subjects.py`)

### 11.1 Доступ
- admin GET `/subjects/` → 200
- teacher GET `/subjects/` → 403

### 11.2 CRUD
- admin POST `/subjects/create/` → создаётся Subject
- admin POST `/subjects/<id>/edit/` → обновляется

### 11.3 Детальная страница
- GET `/subjects/<id>/` → 200, виден список преподавателей и групп

---

## 12. Тесты документов (`test_documents.py`)

### 12.1 Загрузка документа
- admin POST `/documents/upload/` с файлом → создаётся Document, файл сохранён

### 12.2 Просмотр документа
- GET `/documents/<id>/` → 200
- Изображение (jpg) → в ответе есть тег `<img`
- PDF → нет `<img`, есть ссылка на файл

### 12.3 Удаление документа
- admin POST `/documents/<id>/delete/` → Document удалён из БД, файл удалён с диска

### 12.4 Доступ преподавателя
- teacher → не может удалять документы (403)

---

## 13. Тесты пользователей (`test_users.py`)

### 13.1 Доступ
- owner GET `/users/` → 200
- admin GET `/users/` → 403
- teacher GET `/users/` → 403

### 13.2 Создание пользователя
- owner POST `/users/create/` → создаётся User

### 13.3 Смена пароля
- owner POST `/users/<id>/password/` с корректным паролем → пароль обновлён, вход работает с новым

### 13.4 Привязка к сотруднику
- owner POST `/users/<id>/edit/` с `employee=<id>` → `user.employee` установлен

---

## 14. Тесты заявок на удаление (`test_delete_requests.py`)

### 14.1 Создание заявки администратором
- admin POST на URL заявки → создаётся `DeleteRequest` со статусом `pending`
- admin не может создать заявку на уже удалённый объект

### 14.2 Одобрение с верным паролем
- owner POST `/delete-requests/<id>/approve/` с верным паролем → объект удалён из БД, статус `approved`

### 14.3 Одобрение с неверным паролем
- owner POST с неверным паролем → объект НЕ удалён, статус остаётся `pending`, показывается ошибка

### 14.4 Отклонение заявки
- owner POST `/delete-requests/<id>/reject/` → статус `rejected`, объект не удалён

### 14.5 Доступ
- admin GET `/delete-requests/` → 403

---

## 15. Тесты аудит-лога (`test_audit.py`)

### 15.1 Запись создаётся при создании объекта
- Создать факультет через вьюху → `AuditLog` содержит запись с `action="created"`, `object_type="Faculty"`

### 15.2 Запись создаётся при обновлении
- Обновить факультет → `AuditLog` содержит `action="updated"`, поля `old_data` и `new_data` заполнены

### 15.3 Запись создаётся при удалении
- owner удаляет студента → `AuditLog` содержит `action="deleted"`

### 15.4 Доступ к странице аудит-лога
- owner GET `/audit-log/` → 200
- admin GET `/audit-log/` → 403
- teacher GET `/audit-log/` → 403

---

## 16. Тесты дашборда (`test_dashboard.py`)

### 16.1 Owner
- GET `/dashboard/` → 200, есть блок статистики, последние записи аудит-лога, счётчик заявок

### 16.2 Admin
- GET `/dashboard/` → 200, есть блок статистики, НЕТ аудит-лога, НЕТ заявок

### 16.3 Teacher
- GET `/dashboard/` → 200, виден список только своих групп и предметов, НЕТ общей статистики

---

## Порядок написания тестов

1. `test_models.py` — самые быстрые, без HTTP
2. `test_auth.py` — основа для всех остальных
3. `test_permissions.py` — проверить что роли работают
4. `test_org_picker.py` — логика выбора организации
5. `test_faculties.py` — простейший CRUD
6. `test_groups.py`
7. `test_students.py` — самый большой блок
8. `test_guardians.py`
9. `test_employees.py`
10. `test_positions.py`
11. `test_subjects.py`
12. `test_documents.py`
13. `test_users.py`
14. `test_delete_requests.py` — двухуровневое удаление
15. `test_audit.py` — зависит от работающих вьюх
16. `test_dashboard.py`

---

## Вспомогательные фикстуры (в `tests/helpers.py`)

```python
def make_owner(username="owner") -> User
def make_admin(username="admin", institution=None) -> User
def make_teacher(username="teacher", institution=None) -> User
def make_institution(owner) -> Institution
def make_faculty(institution) -> Faculty
def make_group(faculty) -> Group
def make_student(faculty, group=None) -> Student
def make_employee(institution) -> Employee
```
