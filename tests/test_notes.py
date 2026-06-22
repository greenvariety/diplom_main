"""Тесты: Вопросы к записям (RecordNote)"""
import requests
from ._base import BASE, login, h, Results


def run():
    r = Results()
    token = login("admin", "admin_-1")
    if not token:
        r.fail("Нет токена — пропуск тестов заметок")
        return r.summary()

    # Нужен факультет для привязки заметок
    fac_resp = requests.get(f"{BASE}/faculties/", headers=h(token), timeout=5)
    faculties = fac_resp.json() if fac_resp.status_code == 200 else []
    created_fac = False
    if not faculties:
        resp = requests.post(
            f"{BASE}/faculties/",
            json={"full_name": "Авто-факультет для заметок", "short_name": "АЗ"},
            headers=h(token),
            timeout=5,
        )
        if resp.status_code in (200, 201):
            faculties = [resp.json()]
            created_fac = True

    fac_id = faculties[0]["id"] if faculties else None
    if not fac_id:
        r.fail("Нет факультета — пропуск тестов заметок")
        return r.summary()

    # POST создание заметки
    resp = requests.post(
        f"{BASE}/notes/",
        json={
            "object_type": "Faculty",
            "object_id": fac_id,
            "question": "Автотест: проверочный вопрос к факультету?",
        },
        headers=h(token),
        timeout=5,
    )
    r.check("POST /notes/ — 200 или 201", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    note_id = resp.json().get("id") if resp.status_code in (200, 201) else None
    r.check("Создание заметки — есть id", note_id is not None, f"id={note_id}")

    # POST второй вопрос для той же записи — один активный
    resp = requests.post(
        f"{BASE}/notes/",
        json={
            "object_type": "Faculty",
            "object_id": fac_id,
            "question": "Второй вопрос к тому же факультету?",
        },
        headers=h(token),
        timeout=5,
    )
    r.check(
        "POST второй вопрос для той же записи — 400",
        resp.status_code == 400,
        f"HTTP {resp.status_code}",
    )

    # GET фильтрация по object_type и object_id
    resp = requests.get(
        f"{BASE}/notes/?object_type=Faculty&object_id={fac_id}",
        headers=h(token),
        timeout=5,
    )
    r.check("GET /notes/?object_type=Faculty — 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    notes_list = resp.json() if isinstance(resp.json(), list) else []
    r.check(
        "Фильтрация заметок — заметка найдена",
        any(n.get("id") == note_id for n in notes_list),
        f"{len(notes_list)} заметок",
    )

    # GET незакрытые заметки
    resp = requests.get(f"{BASE}/notes/?resolved=false", headers=h(token), timeout=5)
    r.check("GET /notes/?resolved=false — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    if note_id:
        # POST закрыть заметку (owner)
        resp = requests.post(f"{BASE}/notes/{note_id}/resolve/", headers=h(token), timeout=5)
        r.check("POST /notes/{id}/resolve/ — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # GET закрытые заметки
        resp = requests.get(f"{BASE}/notes/?resolved=true", headers=h(token), timeout=5)
        r.check("GET /notes/?resolved=true — 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    if created_fac and fac_id:
        requests.delete(
            f"{BASE}/faculties/{fac_id}/",
            json={"password": "admin_-1"},
            headers=h(token),
            timeout=5,
        )

    return r.summary()
