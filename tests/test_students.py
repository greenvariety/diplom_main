"""Тесты: Студенты"""
import requests
from ._base import BASE, login, h, Results

PHONE = "+79992223301"
PHONE2 = "+79992223302"


def _cleanup(token):
    data = requests.get(f"{BASE}/students/", headers=h(token), timeout=5).json()
    students = data.get("results", data) if isinstance(data, dict) else data
    for s in (students if isinstance(students, list) else []):
        if s.get("phone") in (PHONE, PHONE2):
            requests.delete(
                f"{BASE}/students/{s['id']}/",
                json={"password": "admin_-1"},
                headers=h(token),
                timeout=5,
            )


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов студентов")
        return r.summary()

    _cleanup(token)

    # Нужен факультет
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []
    fac_id = faculties[0]["id"] if faculties else None

    if not fac_id:
        resp = requests.post(
            f"{BASE}/faculties/",
            json={"full_name": "Авто-факультет для студентов", "short_name": "АС"},
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            fac_id = resp.json().get("id")

    # GET список — пагинированный ответ
    resp = requests.get(f"{BASE}/students/", headers=h(token), timeout=5)
    r.check("GET /students/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    data = resp.json()
    r.check("Ответ /students/ пагинированный (есть results)", "results" in data, f"keys: {list(data.keys())}")

    if not fac_id:
        r.fail("Нет факультета — пропуск создания студента")
        return r.summary()

    # POST создание
    payload = {
        "last_name": "АвтоСтудент",
        "first_name": "Тест",
        "middle_name": "Тестович",
        "birth_date": "2005-03-15",
        "phone": PHONE,
        "email": "autotest_student@example.com",
        "faculty_id": fac_id,
    }
    resp = requests.post(f"{BASE}/students/", json=payload, headers=h(token), timeout=5)
    r.check("POST /students/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    student_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание студента — есть id", student_id is not None, f"id={student_id}")

    # Дубль телефона
    payload2 = {**payload, "email": "autotest_student2@example.com"}
    resp = requests.post(f"{BASE}/students/", json=payload2, headers=h(token), timeout=5)
    r.check("Дубль телефона студента -> 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    if student_id:
        # GET детали
        resp = requests.get(f"{BASE}/students/{student_id}/", headers=h(token), timeout=5)
        r.check("GET /students/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # PATCH (смена статуса)
        resp = requests.patch(
            f"{BASE}/students/{student_id}/",
            json={"status": "enrolled"},
            headers=h(token),
            timeout=5,
        )
        r.check("PATCH /students/{id}/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Поиск по фамилии
        resp = requests.get(f"{BASE}/students/?search=АвтоСтудент", headers=h(token), timeout=5)
        r.check("Поиск студента — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        results = resp.json().get("results", [])
        r.check(
            "Поиск студента — найден",
            any(s["id"] == student_id for s in results),
            f"{len(results)} результатов",
        )

        # Флаг
        resp = requests.post(f"{BASE}/students/{student_id}/flag/", headers=h(token), timeout=5)
        r.check("POST /students/{id}/flag/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # Фильтрация по факультету
        resp = requests.get(f"{BASE}/students/?faculty_id={fac_id}", headers=h(token), timeout=5)
        r.check("Фильтрация студентов по факультету — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        results_fac = resp.json().get("results", [])
        r.check(
            "Фильтрация по факультету — студент найден",
            any(s["id"] == student_id for s in results_fac),
            f"{len(results_fac)} записей",
        )

        # Фильтрация по статусу
        resp = requests.get(f"{BASE}/students/?status=enrolled", headers=h(token), timeout=5)
        r.check("Фильтрация студентов по статусу enrolled — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        r.check(
            "Фильтрация по статусу — список получен",
            isinstance(resp.json().get("results", []), list),
            f"тип results: {type(resp.json().get('results', None)).__name__}",
        )

        # Удаление
        resp = requests.delete(
            f"{BASE}/students/{student_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )
        r.check("DELETE /students/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    return r.summary()
