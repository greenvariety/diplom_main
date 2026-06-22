import requests

BASE = "http://127.0.0.1:8000/api"


def login(username, password):
    r = requests.post(f"{BASE}/auth/login/", json={"username": username, "password": password}, timeout=5)
    if r.status_code == 200:
        return r.json().get("access")
    return None


def h(token):
    return {"Authorization": f"Bearer {token}"}


class Results:
    def __init__(self):
        self.passed = []
        self.failed = []
        self._log = []

    def ok(self, name, detail=""):
        self.passed.append(name)
        msg = f"  [OK]   {name}" + (f" -- {detail}" if detail else "")
        self._log.append(msg)
        print(msg)

    def fail(self, name, detail=""):
        self.failed.append(name)
        msg = f"  [FAIL] {name}" + (f" -- {detail}" if detail else "")
        self._log.append(msg)
        print(msg)

    def check(self, name, cond, detail=""):
        self.ok(name, detail) if cond else self.fail(name, detail)

    def summary(self):
        return {"pass": self.passed, "fail": self.failed, "log": self._log}
