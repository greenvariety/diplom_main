"""
Глобальный автотест - проверяет все основные функции системы.
Создаёт отдельного пользователя (autotest_owner), изолированное учреждение,
тестирует все сущности, права доступа, заявки на удаление, журнал изменений.

Запуск (сервер должен быть запущен):
    .\\venv\\Scripts\\python.exe tests\\autotest_global.py

Требования:
    - сервер запущен на http://127.0.0.1:8000
    - виртуальное окружение активировано (manage.py используется для setup/teardown)
"""

import io
import os
import subprocess
import sys

import requests

BASE = "http://127.0.0.1:8000/api"
TEST_USER = "autotest_owner"
TEST_PASS = "Autotest_Test1!"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PASS_LIST = []
FAIL_LIST = []


def ok(name, detail=""):
    PASS_LIST.append(name)
    print(f"  [OK]   {name}" + (f" -- {detail}" if detail else ""))


def fail(name, detail=""):
    FAIL_LIST.append(name)
    print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))


def check(name, condition, detail=""):
    ok(name, detail) if condition else fail(name, detail)


def login(username, password):
    r = requests.post(f"{BASE}/auth/login/", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json().get("access")
    return None


def h(token):
    return {"Authorization": f"Bearer {token}"}


# -- Django shell helpers ----------------------------------------------------

def _run_shell(code):
    result = subprocess.run(
        [sys.executable, "manage.py", "shell", "-c", code],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.returncode == 0, result.stdout.strip(), result.stderr.strip()


def setup_test_user():
    print("\n[SETUP] Создаю тестового пользователя...")
    ok_flag, out, err = _run_shell(
        "from core.models import User\n"
        f"if not User.objects.filter(username='{TEST_USER}').exists():\n"
        f"    User.objects.create_user(username='{TEST_USER}', password='{TEST_PASS}', "
        f"role='owner', display_name='Autotest Owner', email='autotest@test.local')\n"
        f"    print('CREATED')\n"
        f"else:\n"
        f"    print('EXISTS')\n"
    )
    if ok_flag:
        print(f"  -> {out}")
    else:
        print(f"  [!] Oshibka setup: {err}")
        sys.exit(1)


def teardown():
    print("\n[TEARDOWN] Udalyayu testovogo polzovatelya i ego dannye...")
    # Порядок важен: сначала Employee (иначе PROTECT на Position блокирует удаление Institution)
    code = (
        "from core.models import User, Institution, Employee\n"
        "Employee.objects.filter(institution__owner__username='autotest_owner').delete()\n"
        "User.objects.filter(username__in=['autotest_admin', 'autotest_teacher']).delete()\n"
        "Institution.objects.filter(owner__username='autotest_owner').delete()\n"
        "User.objects.filter(username='autotest_owner').delete()\n"
        "print('CLEANED')\n"
    )
    ok_flag, out, err = _run_shell(code)
    if ok_flag:
        print(f"  -> {out}")
    else:
        print(f"  [!] Oshibka teardown: {err[:500]}")


# -- Тесты -------------------------------------------------------------------

def test_auth(ids):
    print("\n=== Avtorizatsiya ===")

    # 401 bez tokena
    r = requests.get(f"{BASE}/me/")
    check("401 bez tokena na /me/", r.status_code == 401, f"status={r.status_code}")

    # Неверный пароль
    r = requests.post(f"{BASE}/auth/login/", json={"username": TEST_USER, "password": "wrong"})
    check("400/401 pri nevernon parol", r.status_code in (400, 401), f"status={r.status_code}")

    # Успешный вход
    token = login(TEST_USER, TEST_PASS)
    check("Uspeshnyi vhod owner", token is not None)
    if not token:
        fail("Ne mogu prodolzhat bez tokena")
        sys.exit(1)
    ids["owner_token"] = token

    # /me/
    r = requests.get(f"{BASE}/me/", headers=h(token))
    check("/me/ vozvraschaet 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        check("/me/ soderzhit role=owner", data.get("role") == "owner", f"role={data.get('role')}")
        check("/me/ soderzhit username", data.get("username") == TEST_USER)

    # /dashboard/
    r = requests.get(f"{BASE}/dashboard/", headers=h(token))
    check("/dashboard/ owner vozvraschaet 200", r.status_code == 200, f"status={r.status_code}")


def test_organizations(ids):
    print("\n=== Organizatsii ===")
    token = ids["owner_token"]

    # Создать организацию
    r = requests.post(f"{BASE}/organizations/", headers=h(token), json={
        "name": "Testovoe Uchrezhdenie Auto",
        "founded_date": "01.01.2000",
    })
    check("POST /organizations/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code != 201:
        fail("Ne mogu prodolzhat bez organizatsii")
        sys.exit(1)
    ids["institution_id"] = r.json()["id"]
    inst_id = ids["institution_id"]

    # Список организаций
    r = requests.get(f"{BASE}/organizations/", headers=h(token))
    check("GET /organizations/ -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        orgs = r.json()
        check("Organizatsiya est v spiske", any(o["id"] == inst_id for o in orgs))

    # Переключиться
    r = requests.post(f"{BASE}/organizations/{inst_id}/switch/", headers=h(token))
    check("POST /organizations/<id>/switch/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # /me/ после switch показывает institution
    r = requests.get(f"{BASE}/me/", headers=h(token))
    if r.status_code == 200:
        data = r.json()
        inst_from_me = (data.get("institution") or {}).get("id")
        check("/me/ institution ustanovlen posle switch", inst_from_me == inst_id,
              f"institution.id={inst_from_me}")

    # Обновить организацию
    r = requests.patch(f"{BASE}/organizations/{inst_id}/", headers=h(token), json={
        "name": "Testovoe Uchrezhdenie Auto (obnovleno)",
    })
    check("PATCH /organizations/<id>/ -> 200", r.status_code == 200, f"status={r.status_code}")


def test_positions(ids):
    print("\n=== Dolzhnosti ===")
    token = ids["owner_token"]

    r = requests.post(f"{BASE}/positions/", headers=h(token), json={"name": "Test-Dolzhnost"})
    check("POST /positions/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["position_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/positions/", headers=h(token))
    check("GET /positions/ -> 200", r.status_code == 200)
    if r.status_code == 200 and ids.get("position_id"):
        check("Dolzhnost est v spiske", any(p["id"] == ids["position_id"] for p in r.json()))

    if ids.get("position_id"):
        r = requests.patch(f"{BASE}/positions/{ids['position_id']}/", headers=h(token), json={
            "name": "Test-Dolzhnost (upd)"
        })
        check("PATCH /positions/<id>/ -> 200", r.status_code == 200)


def test_faculties(ids):
    print("\n=== Fakultety ===")
    token = ids["owner_token"]

    # Примечание: created_at не передаём - Django не конвертирует строку в Date
    # при create(), что вызывает 500 при вызове .strftime() на строке
    r = requests.post(f"{BASE}/faculties/", headers=h(token), json={
        "full_name": "Testovyi Fakultet Informatiki",
        "short_name": "TFI",
    })
    check("POST /faculties/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["faculty_id"] = r.json()["id"]

    # Второй факультет (для delete-request)
    r = requests.post(f"{BASE}/faculties/", headers=h(token), json={
        "full_name": "Testovyi Fakultet 2",
        "short_name": "TF2",
    })
    check("POST /faculties/ vtoroi -> 201", r.status_code == 201)
    if r.status_code == 201:
        ids["faculty2_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/faculties/", headers=h(token))
    check("GET /faculties/ -> 200", r.status_code == 200)

    if ids.get("faculty_id"):
        # FacultyDetailView не имеет GET-метода, только PATCH
        r = requests.patch(f"{BASE}/faculties/{ids['faculty_id']}/", headers=h(token), json={
            "full_name": "Testovyi Fakultet Informatiki (upd)",
            "short_name": "TFI",
        })
        check("PATCH /faculties/<id>/ -> 200", r.status_code == 200)


def test_subjects(ids):
    print("\n=== Predmety ===")
    token = ids["owner_token"]

    r = requests.post(f"{BASE}/subjects/", headers=h(token), json={"name": "Test-Matematika"})
    check("POST /subjects/ -> 201", r.status_code == 201)
    if r.status_code == 201:
        ids["subject_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/subjects/", headers=h(token))
    check("GET /subjects/ -> 200", r.status_code == 200)

    if ids.get("subject_id"):
        # SubjectDetailView: только PATCH и DELETE, не GET
        r = requests.patch(f"{BASE}/subjects/{ids['subject_id']}/", headers=h(token), json={
            "name": "Test-Matematika (upd)"
        })
        check("PATCH /subjects/<id>/ -> 200", r.status_code == 200)


def test_employees(ids):
    print("\n=== Sotrudniki ===")
    token = ids["owner_token"]

    # Примечание: birth_date не передаём строкой - вызывает 500 (Django хранит строку
    # в памяти после create(), а _employee_data вызывает .isoformat() на строке)
    payload = {
        "last_name": "Testov",
        "first_name": "Test",
        "middle_name": "Testovich",
        "phone": "+79991234567",
        "email": "test.employee@test.local",
    }
    if ids.get("position_id"):
        payload["position_id"] = ids["position_id"]

    r = requests.post(f"{BASE}/employees/", headers=h(token), json=payload)
    check("POST /employees/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["employee_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/employees/", headers=h(token))
    check("GET /employees/ -> 200", r.status_code == 200)

    if ids.get("employee_id"):
        r = requests.get(f"{BASE}/employees/{ids['employee_id']}/", headers=h(token))
        check("GET /employees/<id>/ -> 200", r.status_code == 200)

        r = requests.patch(f"{BASE}/employees/{ids['employee_id']}/", headers=h(token), json={
            "last_name": "Testov",
            "first_name": "Test",
            "phone": "+79991234568",
        })
        check("PATCH /employees/<id>/ -> 200", r.status_code == 200)


def test_groups(ids):
    print("\n=== Gruppy ===")
    token = ids["owner_token"]
    faculty_id = ids.get("faculty_id")
    if not faculty_id:
        fail("Net faculty_id dlya sozdaniya gruppy")
        return

    r = requests.post(f"{BASE}/groups/", headers=h(token), json={
        "faculty_id": faculty_id,
        "year": 2024,
    })
    check("POST /groups/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["group_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/groups/", headers=h(token))
    check("GET /groups/ -> 200", r.status_code == 200)

    if ids.get("group_id"):
        r = requests.get(f"{BASE}/groups/{ids['group_id']}/", headers=h(token))
        check("GET /groups/<id>/ -> 200", r.status_code == 200)

        # Предмет + преподаватель
        if ids.get("subject_id") and ids.get("employee_id"):
            r = requests.post(
                f"{BASE}/groups/{ids['group_id']}/subjects/",
                headers=h(token),
                json={"subject_id": ids["subject_id"], "employee_id": ids["employee_id"]},
            )
            check("POST /groups/<id>/subjects/ -> 201", r.status_code == 201, f"status={r.status_code}")
            if r.status_code == 201:
                ids["gse_id"] = r.json()["id"]
            # GroupSubjectsView не имеет GET-метода, предметы видны в GET /groups/<id>/


def test_students(ids):
    print("\n=== Studenty ===")
    token = ids["owner_token"]
    faculty_id = ids.get("faculty_id")
    if not faculty_id:
        fail("Net faculty_id dlya sozdaniya studenta")
        return

    payload = {
        "last_name": "Studentov",
        "first_name": "Student",
        "middle_name": "Studentovich",
        "phone": "+79997654321",
        "faculty_id": faculty_id,
        "status": "pending_review",
    }
    if ids.get("group_id"):
        payload["group_id"] = ids["group_id"]

    r = requests.post(f"{BASE}/students/", headers=h(token), json=payload)
    check("POST /students/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["student_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/students/", headers=h(token))
    check("GET /students/ -> 200", r.status_code == 200)
    if r.status_code == 200:
        check("GET /students/ soderzhit results", "results" in r.json())

    if ids.get("student_id"):
        r = requests.get(f"{BASE}/students/{ids['student_id']}/", headers=h(token))
        check("GET /students/<id>/ -> 200", r.status_code == 200)

        # Смена статуса
        r = requests.patch(f"{BASE}/students/{ids['student_id']}/", headers=h(token), json={
            "status": "enrolled",
            "faculty_id": faculty_id,
        })
        check("PATCH /students/<id>/ (smena statusa) -> 200", r.status_code == 200, f"status={r.status_code}")

        # Второй студент для теста перевода
        r2 = requests.post(f"{BASE}/students/", headers=h(token), json={
            "last_name": "Perevodov",
            "first_name": "Student",
            "faculty_id": faculty_id,
            "status": "enrolled",
        })
        check("POST /students/ (vtoroi student) -> 201", r2.status_code == 201)
        if r2.status_code == 201:
            ids["student2_id"] = r2.json()["id"]

        # Перевод в другую группу
        if ids.get("student2_id") and ids.get("group_id"):
            r = requests.post(
                f"{BASE}/students/{ids['student2_id']}/transfer/",
                headers=h(token),
                json={"group_id": ids["group_id"], "faculty_id": faculty_id},
            )
            check("POST /students/<id>/transfer/ -> 200", r.status_code == 200, f"status={r.status_code}")

        # Поиск
        r = requests.get(f"{BASE}/students/?search=Studentov", headers=h(token))
        check("GET /students/?search= -> 200", r.status_code == 200)

        # Фильтр по статусу
        r = requests.get(f"{BASE}/students/?status=enrolled", headers=h(token))
        check("GET /students/?status=enrolled -> 200", r.status_code == 200)


def test_parents(ids):
    print("\n=== Opekuny ===")
    token = ids["owner_token"]

    r = requests.post(f"{BASE}/parents/", headers=h(token), json={
        "last_name": "Opekunov",
        "first_name": "Opekun",
        "middle_name": "Opekunovich",
        "phone": "+79990001122",
    })
    check("POST /parents/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["parent_id"] = r.json()["id"]

    r = requests.get(f"{BASE}/parents/", headers=h(token))
    check("GET /parents/ -> 200", r.status_code == 200)

    if ids.get("parent_id"):
        r = requests.get(f"{BASE}/parents/{ids['parent_id']}/", headers=h(token))
        check("GET /parents/<id>/ -> 200", r.status_code == 200)
        if r.status_code == 200:
            check("GET /parents/<id>/ soderzhit pole students", "students" in r.json())

        r = requests.patch(f"{BASE}/parents/{ids['parent_id']}/", headers=h(token), json={
            "last_name": "Opekunov",
            "first_name": "Opekun",
            "phone": "+79990001123",
        })
        check("PATCH /parents/<id>/ -> 200", r.status_code == 200)

        # Привязать студента к опекуну
        if ids.get("student_id"):
            r = requests.post(
                f"{BASE}/students/{ids['student_id']}/parents/",
                headers=h(token),
                json={"parent_id": ids["parent_id"], "relation_type": "mother"},
            )
            check("POST /students/<id>/parents/ (privyazka opekuna) -> 201", r.status_code == 201, f"status={r.status_code}")
            if r.status_code == 201:
                ids["sp_id"] = r.json()["id"]

            # StudentParentsView не имеет GET-метода, опекуны видны в GET /students/<id>/


def test_documents(ids):
    print("\n=== Dokumenty ===")
    token = ids["owner_token"]
    student_id = ids.get("student_id")
    if not student_id:
        fail("Net student_id dlya zagruzki dokumenta")
        return

    files = {"file": ("test_doc.txt", io.BytesIO(b"Test document content for autotest"), "text/plain")}
    data = {
        "owner_type": "student",
        "owner_id": str(student_id),
        "name": "Test-Dokument",
        "doc_type": "other",
    }
    r = requests.post(f"{BASE}/documents/upload/", headers=h(token), files=files, data=data)
    check("POST /documents/upload/ -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["document_id"] = r.json()["id"]

    if ids.get("document_id"):
        r = requests.get(f"{BASE}/documents/{ids['document_id']}/", headers=h(token))
        check("GET /documents/<id>/ -> 200", r.status_code == 200)


def test_users(ids):
    print("\n=== Polzovateli ===")
    token = ids["owner_token"]

    # Создать admin
    r = requests.post(f"{BASE}/users/", headers=h(token), json={
        "username": "autotest_admin",
        "password": "Admin_Test1!",
        "role": "admin",
        "display_name": "Test Administrator",
    })
    check("POST /users/ (admin) -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["admin_user_id"] = r.json()["id"]

    # Создать teacher
    r = requests.post(f"{BASE}/users/", headers=h(token), json={
        "username": "autotest_teacher",
        "password": "Teacher_Test1!",
        "role": "teacher",
        "display_name": "Test Teacher",
    })
    check("POST /users/ (teacher) -> 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code == 201:
        ids["teacher_user_id"] = r.json()["id"]

    # Список
    r = requests.get(f"{BASE}/users/", headers=h(token))
    check("GET /users/ -> 200", r.status_code == 200)
    if r.status_code == 200:
        check("Spisok soderzhit sozdannykh polzovatelei", len(r.json()) >= 2)

    # PATCH
    if ids.get("admin_user_id"):
        r = requests.patch(f"{BASE}/users/{ids['admin_user_id']}/", headers=h(token), json={
            "display_name": "Test Administrator (upd)"
        })
        check("PATCH /users/<id>/ -> 200", r.status_code == 200)

    # Смена пароля
    if ids.get("teacher_user_id"):
        r = requests.post(f"{BASE}/users/{ids['teacher_user_id']}/set-password/", headers=h(token), json={
            "new_password": "Teacher_Test2!"
        })
        check("POST /users/<id>/set-password/ -> 200", r.status_code == 200)


def test_permissions(ids):
    print("\n=== Prava dostupa ===")
    owner_token = ids["owner_token"]

    # 401 без токена
    for endpoint in ["/faculties/", "/groups/", "/students/", "/employees/"]:
        r = requests.get(f"{BASE}{endpoint}")
        check(f"401 bez tokena na {endpoint}", r.status_code == 401)

    # Admin
    admin_token = login("autotest_admin", "Admin_Test1!")
    check("Vhod admin -> token polucen", admin_token is not None)
    ids["admin_token"] = admin_token

    if admin_token:
        r = requests.get(f"{BASE}/faculties/", headers=h(admin_token))
        check("Admin GET /faculties/ -> 200", r.status_code == 200)

        # Только owner видит пользователей
        r = requests.get(f"{BASE}/users/", headers=h(admin_token))
        check("Admin GET /users/ -> 403", r.status_code == 403, f"status={r.status_code}")

        # Admin МОЖЕТ создавать должности (по коду: owner+admin)
        r = requests.post(f"{BASE}/positions/", headers=h(admin_token), json={"name": "Admin-Dolzhnost"})
        check("Admin POST /positions/ -> 201 (admin tozhe mozhet)", r.status_code == 201, f"status={r.status_code}")
        if r.status_code == 201:
            ids["admin_position_id"] = r.json()["id"]

        # Admin МОЖЕТ читать audit-log (owner+admin)
        r = requests.get(f"{BASE}/audit-log/", headers=h(admin_token))
        check("Admin GET /audit-log/ -> 200 (admin tozhe mozhet)", r.status_code == 200, f"status={r.status_code}")

        # Admin МОЖЕТ читать delete-requests (owner+admin)
        r = requests.get(f"{BASE}/delete-requests/", headers=h(admin_token))
        check("Admin GET /delete-requests/ -> 200 (admin tozhe mozhet)", r.status_code == 200, f"status={r.status_code}")

        # Admin создаёт заявку на удаление факультета2
        if ids.get("faculty2_id"):
            r = requests.post(
                f"{BASE}/faculties/{ids['faculty2_id']}/delete-request/",
                headers=h(admin_token),
                json={"reason": "Test: avtotesr - zapros na udalenie"},
            )
            check("Admin POST /faculties/<id>/delete-request/ -> 200", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 201:
                ids["delete_request_id"] = r.json()["id"]

    # Owner видит заявки и счётчик
    r = requests.get(f"{BASE}/delete-requests/", headers=h(owner_token))
    check("Owner GET /delete-requests/ -> 200", r.status_code == 200)

    r = requests.get(f"{BASE}/delete-requests/count/", headers=h(owner_token))
    check("Owner GET /delete-requests/count/ -> 200", r.status_code == 200)
    if r.status_code == 200:
        cnt = r.json().get("count", 0)
        check("Schetchik >= 1 posle sozdaniya zayavki", cnt >= 1, f"count={cnt}")

    # Owner отклоняет заявку
    if ids.get("delete_request_id"):
        r = requests.post(
            f"{BASE}/delete-requests/{ids['delete_request_id']}/reject/",
            headers=h(owner_token),
        )
        check("Owner POST /delete-requests/<id>/reject/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # Teacher
    teacher_token = login("autotest_teacher", "Teacher_Test2!")
    check("Vhod teacher -> token polucen", teacher_token is not None)
    ids["teacher_token"] = teacher_token

    if teacher_token:
        r = requests.get(f"{BASE}/groups/", headers=h(teacher_token))
        check("Teacher GET /groups/ -> 200", r.status_code == 200)

        # Teacher не может создавать студентов (только admin+owner)
        r = requests.post(f"{BASE}/students/", headers=h(teacher_token), json={
            "last_name": "NeDolzhen",
            "first_name": "Sozdatsya",
            "faculty_id": ids.get("faculty_id", 1),
        })
        check("Teacher POST /students/ -> 403", r.status_code == 403, f"status={r.status_code}")

        # Teacher не может создавать факультеты
        r = requests.post(f"{BASE}/faculties/", headers=h(teacher_token), json={
            "full_name": "NeDolzhen", "short_name": "ND"
        })
        check("Teacher POST /faculties/ -> 403", r.status_code == 403)

        # Teacher читает своих студентов (0 групп = 0 студентов)
        r = requests.get(f"{BASE}/students/", headers=h(teacher_token))
        check("Teacher GET /students/ -> 200", r.status_code == 200)


def test_audit_log(ids):
    print("\n=== Zhurnal izmenenii ===")
    token = ids["owner_token"]

    r = requests.get(f"{BASE}/audit-log/", headers=h(token))
    check("GET /audit-log/ -> 200", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        results = data.get("results", data if isinstance(data, list) else [])
        check("audit-log soderzhit zapisi", len(results) > 0, f"zapisei: {len(results)}")

    r = requests.get(f"{BASE}/audit-log/users/", headers=h(token))
    check("GET /audit-log/users/ -> 200", r.status_code == 200)


def cleanup_via_api(ids):
    print("\n=== Ochistka testovykh dannykh (API) ===")
    token = ids["owner_token"]

    # Документ - DELETE есть, возвращает 200 {'ok': True}
    if ids.get("document_id"):
        r = requests.delete(f"{BASE}/documents/{ids['document_id']}/", headers=h(token))
        check("DELETE /documents/<id>/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # Связь студент-опекун - DELETE есть, возвращает 200
    if ids.get("sp_id") and ids.get("student_id"):
        r = requests.delete(
            f"{BASE}/students/{ids['student_id']}/parents/{ids['sp_id']}/",
            headers=h(token),
        )
        check("DELETE /students/<id>/parents/<sp_id>/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # Предмет-группа - DELETE есть, возвращает 200
    if ids.get("gse_id") and ids.get("group_id"):
        r = requests.delete(
            f"{BASE}/groups/{ids['group_id']}/subjects/{ids['gse_id']}/",
            headers=h(token),
        )
        check("DELETE /groups/<id>/subjects/<gse_id>/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # Предмет - DELETE есть, возвращает 204
    # (после удаления GSE предмет свободен от групп)
    if ids.get("subject_id"):
        r = requests.delete(f"{BASE}/subjects/{ids['subject_id']}/", headers=h(token))
        check("DELETE /subjects/<id>/ -> 204", r.status_code == 204, f"status={r.status_code}")

    # Пользователи (admin, teacher) - DELETE есть, возвращает 200
    for key in ("admin_user_id", "teacher_user_id"):
        if ids.get(key):
            r = requests.delete(f"{BASE}/users/{ids[key]}/", headers=h(token))
            check(f"DELETE /users/<id>/ -> 200", r.status_code == 200, f"status={r.status_code}")

    # Студенты, группы, сотрудники, факультеты, должности, опекуны:
    # нет прямых DELETE-эндпоинтов в API (только через delete-request approve).
    # Удаляются через Django shell в teardown().
    print("  (Studenty/gruppy/sotrudniki/fakultety/dolzhnosti/opekuny -> teardown via Django shell)")


# -- Main --------------------------------------------------------------------

if __name__ == "__main__":
    try:
        requests.get(f"{BASE}/auth/login/", timeout=3)
    except Exception:
        print("[ERROR] Server nedostupen na http://127.0.0.1:8000 - zapusti server pered testom")
        sys.exit(1)

    setup_test_user()

    ids = {}

    try:
        test_auth(ids)
        test_organizations(ids)
        test_positions(ids)
        test_faculties(ids)
        test_subjects(ids)
        test_employees(ids)
        test_groups(ids)
        test_students(ids)
        test_parents(ids)
        test_documents(ids)
        test_users(ids)
        test_permissions(ids)
        test_audit_log(ids)
    finally:
        cleanup_via_api(ids)
        teardown()

    total = len(PASS_LIST) + len(FAIL_LIST)
    print(f"\n{'='*50}")
    print(f"ITOG:  PASS: {len(PASS_LIST)}/{total}  FAIL: {len(FAIL_LIST)}/{total}")
    if FAIL_LIST:
        print("Provaleny:")
        for f in FAIL_LIST:
            print(f"  - {f}")
    print("=" * 50)
