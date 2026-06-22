"""Тесты: Назначение предметов в группы"""
import requests
from ._base import BASE, login, h, Results

FAC_NAME = "Авто-факультет-предметы-групп"
POS_NAME = "Авто-должность-препод-9902"
EMP_PHONE = "+79995556601"
SUBJ_NAME = "Авто-предмет-группы-9902"


def _cleanup(token):
    # Удалить тестового сотрудника
    emps = requests.get(f"{BASE}/employees/", headers=h(token), timeout=5).json()
    for e in (emps if isinstance(emps, list) else []):
        if e.get("phone") == EMP_PHONE:
            requests.delete(f"{BASE}/employees/{e['id']}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    # Удалить тестовую должность
    positions = requests.get(f"{BASE}/positions/", headers=h(token), timeout=5).json()
    for p in (positions if isinstance(positions, list) else []):
        if p.get("name") == POS_NAME:
            requests.delete(f"{BASE}/positions/{p['id']}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    # Удалить тестовый предмет
    subjects = requests.get(f"{BASE}/subjects/", headers=h(token), timeout=5).json()
    for s in (subjects if isinstance(subjects, list) else []):
        if s.get("name") == SUBJ_NAME:
            requests.delete(f"{BASE}/subjects/{s['id']}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов назначения предметов")
        return r.summary()

    _cleanup(token)

    # --- Подготовка: факультет ---
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []
    fac_id = faculties[0]["id"] if faculties else None
    created_fac = False
    if not fac_id:
        resp = requests.post(
            f"{BASE}/faculties/",
            json={"full_name": FAC_NAME, "short_name": "АПГ"},
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            fac_id = resp.json().get("id")
            created_fac = True
    r.check("Факультет для теста предметов — получен", fac_id is not None, f"id={fac_id}")

    # --- Подготовка: должность teacher ---
    resp = requests.post(
        f"{BASE}/positions/",
        json={"name": POS_NAME, "role_type": "teacher"},
        headers=h(token),
        timeout=5,
    )
    pos_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Должность teacher для теста — создана", pos_id is not None, f"id={pos_id}")

    # --- Подготовка: сотрудник-преподаватель ---
    emp_id = None
    if pos_id:
        resp = requests.post(
            f"{BASE}/employees/",
            json={
                "last_name": "АвтоПреп",
                "first_name": "Тест",
                "middle_name": "Тестович",
                "birth_date": "1985-01-01",
                "phone": EMP_PHONE,
                "email": "autotest_gsubj_emp@example.com",
                "position_id": pos_id,
            },
            headers=h(token),
            timeout=5,
        )
        emp_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Сотрудник-преподаватель — создан", emp_id is not None, f"id={emp_id}")

    # --- Подготовка: предмет ---
    resp = requests.post(
        f"{BASE}/subjects/",
        json={"name": SUBJ_NAME},
        headers=h(token),
        timeout=5,
    )
    subj_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Предмет для теста — создан", subj_id is not None, f"id={subj_id}")

    # --- Подготовка: добавить предмет в преподаваемые ---
    taught_ok = False
    if emp_id and subj_id:
        resp = requests.post(
            f"{BASE}/employees/{emp_id}/taught-subjects/",
            json={"subject_id": subj_id},
            headers=h(token),
            timeout=5,
        )
        taught_ok = resp.status_code in (200, 201)
    r.check(
        "Добавление предмета в преподаваемые сотрудника — ok",
        taught_ok,
        f"HTTP ok={taught_ok}",
    )

    # --- Подготовка: группа ---
    group_id = None
    if fac_id:
        resp = requests.post(
            f"{BASE}/groups/",
            json={"faculty_id": fac_id, "year": 2024},
            headers=h(token),
            timeout=5,
        )
        group_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Группа для теста — создана", group_id is not None, f"id={group_id}")

    assignment_id = None
    if group_id and emp_id and subj_id:
        # POST назначение предмета в группу
        resp = requests.post(
            f"{BASE}/groups/{group_id}/subjects/",
            json={"subject_id": subj_id, "employee_id": emp_id},
            headers=h(token),
            timeout=5,
        )
        r.check(
            "POST /groups/{id}/subjects/ назначение — 200 или 201",
            resp.status_code in (200, 201),
            f"HTTP {resp.status_code}",
        )
        assignment_id = resp.json().get("id") if resp.status_code in (200, 201) else None
        r.check("Назначение предмета — есть id", assignment_id is not None, f"id={assignment_id}")

        # POST дубль предмета в группе — 400
        resp = requests.post(
            f"{BASE}/groups/{group_id}/subjects/",
            json={"subject_id": subj_id, "employee_id": emp_id},
            headers=h(token),
            timeout=5,
        )
        r.check(
            "POST дубль предмета в группе — 400",
            resp.status_code == 400,
            f"HTTP {resp.status_code}",
        )

        if assignment_id:
            # DELETE назначения
            resp = requests.delete(
                f"{BASE}/groups/{group_id}/subjects/{assignment_id}/",
                headers=h(token),
                timeout=5,
            )
            r.check(
                "DELETE /groups/{id}/subjects/{id}/ — 200 или 204",
                resp.status_code in (200, 204),
                f"HTTP {resp.status_code}",
            )

    # Очистка: группа, сотрудник, должность, предмет
    if group_id:
        requests.delete(f"{BASE}/groups/{group_id}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    if emp_id:
        requests.delete(f"{BASE}/employees/{emp_id}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    if pos_id:
        requests.delete(f"{BASE}/positions/{pos_id}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    if subj_id:
        requests.delete(f"{BASE}/subjects/{subj_id}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)
    if created_fac and fac_id:
        requests.delete(f"{BASE}/faculties/{fac_id}/", json={"password": "admin_-1"}, headers=h(token), timeout=5)

    return r.summary()
