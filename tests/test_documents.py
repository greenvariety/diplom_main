"""Тесты: Документы"""
import io
import requests
from ._base import BASE, login, h, Results

DOC_STUDENT_PHONE = "+79994445501"


def _cleanup(token):
    data = requests.get(f"{BASE}/students/", headers=h(token), timeout=5).json()
    students = data.get("results", data) if isinstance(data, dict) else data
    for s in (students if isinstance(students, list) else []):
        if s.get("phone") == DOC_STUDENT_PHONE:
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
        r.fail("Нет токена — пропуск тестов документов")
        return r.summary()

    _cleanup(token)

    # Нужен студент
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []
    fac_id = faculties[0]["id"] if faculties else None

    student_id = None
    if fac_id:
        resp = requests.post(
            f"{BASE}/students/",
            json={
                "last_name": "ДокТест",
                "first_name": "Авто",
                "middle_name": "",
                "birth_date": "2004-04-04",
                "phone": DOC_STUDENT_PHONE,
                "email": "autotest_doc_s@example.com",
                "faculty_id": fac_id,
            },
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            student_id = resp.json().get("id")

    if not student_id:
        r.fail("Нет студента для документа — пропуск")
        return r.summary()

    # Загрузка документа (txt-файл)
    file_content = b"autotest document content"
    resp = requests.post(
        f"{BASE}/documents/upload/",
        headers={"Authorization": f"Bearer {token}"},
        data={"owner_type": "student", "owner_id": student_id, "name": "Авто-документ", "doc_type": "other"},
        files={"file": ("autotest.txt", io.BytesIO(file_content), "text/plain")},
        timeout=10,
    )
    r.check("POST /documents/upload/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    doc_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Загрузка документа — есть id", doc_id is not None, f"id={doc_id}")

    if doc_id:
        # GET /documents/{id}/ — скачивание файла
        resp = requests.get(f"{BASE}/documents/{doc_id}/", headers=h(token), timeout=5)
        r.check("GET /documents/{id}/ (скачивание) — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # POST без файла — 400
    resp = requests.post(
        f"{BASE}/documents/upload/",
        headers={"Authorization": f"Bearer {token}"},
        data={"owner_type": "student", "owner_id": student_id, "name": "Без файла", "doc_type": "other"},
        timeout=10,
    )
    r.check("POST /documents/upload/ без файла — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # POST с неверным owner_type — 400
    resp = requests.post(
        f"{BASE}/documents/upload/",
        headers={"Authorization": f"Bearer {token}"},
        data={"owner_type": "invalid_type", "owner_id": student_id, "name": "Тест", "doc_type": "other"},
        files={"file": ("t.txt", io.BytesIO(b"x"), "text/plain")},
        timeout=10,
    )
    r.check("POST /documents/upload/ неверный owner_type — 400", resp.status_code == 400, f"HTTP {resp.status_code}")

    # DELETE документа
    if doc_id:
        resp = requests.delete(f"{BASE}/documents/{doc_id}/", headers=h(token), timeout=5)
        r.check("DELETE /documents/{id}/ — 200 или 204", resp.status_code in (200, 204), f"HTTP {resp.status_code}")

    # Очистка студента
    requests.delete(
        f"{BASE}/students/{student_id}/",
        json={"password": "admin_-1"},
        headers=h(token),
        timeout=5,
    )

    return r.summary()
