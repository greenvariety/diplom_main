# Tkinter-лаунчер для автотестов АИС.
# Запуск: venv\Scripts\python.exe test_runner.py
import sys
import os
import threading
import importlib
import tkinter as tk
from tkinter import ttk, font as tkfont

TESTS = [
    ("test_auth",            "Авторизация (auth)"),
    ("test_dashboard",       "Дашборд и организация"),
    ("test_faculties",       "Факультеты"),
    ("test_groups",          "Группы"),
    ("test_employees",       "Сотрудники"),
    ("test_students",        "Студенты"),
    ("test_parents",         "Родители"),
    ("test_subjects",        "Предметы"),
    ("test_documents",       "Документы"),
    ("test_delete_requests", "Заявки на удаление"),
    ("test_audit",           "Журнал изменений"),
    ("test_permissions",     "Права доступа (роли)"),
    ("test_positions",       "Должности"),
    ("test_users",           "Пользователи"),
    ("test_notes",           "Вопросы к записям"),
    ("test_profile",         "Профиль пользователя"),
    ("test_group_subjects",  "Назначения предметов в группы"),
]

BG       = "#1e1e2e"
BG2      = "#2a2a3d"
BG3      = "#313148"
FG       = "#cdd6f4"
FG_DIM   = "#7f849c"
GREEN    = "#a6e3a1"
RED      = "#f38ba8"
BLUE     = "#89b4fa"
YELLOW   = "#f9e2af"
ACCENT   = "#cba6f7"


class TestRunner(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Автотесты АИС - Тест-раннер")
        self.configure(bg=BG)
        self.resizable(True, True)
        self.minsize(860, 640)

        self._running = False
        self._vars = {}

        self._build_ui()
        self._center()

    # ------------------------------------------------------------------ UI
    def _center(self):
        self.update_idletasks()
        w, h = 1020, 740
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")

    def _build_ui(self):
        # ---- шрифты ----
        mono = tkfont.Font(family="Consolas", size=10)
        bold = tkfont.Font(family="Segoe UI", size=10, weight="bold")
        title_f = tkfont.Font(family="Segoe UI", size=13, weight="bold")

        # ---- заголовок ----
        header = tk.Frame(self, bg=BG2, pady=10)
        header.pack(fill="x")
        tk.Label(header, text="Автотесты АИС", bg=BG2, fg=ACCENT,
                 font=title_f).pack(side="left", padx=18)
        tk.Label(header, text="Выберите тесты и нажмите «Запустить»",
                 bg=BG2, fg=FG_DIM, font=("Segoe UI", 9)).pack(side="left")

        # ---- основная область ----
        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True, padx=12, pady=8)

        # Левая колонка — чекбоксы
        left = tk.Frame(body, bg=BG2, width=240, padx=10, pady=10)
        left.pack(side="left", fill="y", padx=(0, 8))
        left.pack_propagate(False)

        tk.Label(left, text="Тесты", bg=BG2, fg=FG, font=bold).pack(anchor="w", pady=(0, 6))

        for mod, label in TESTS:
            var = tk.BooleanVar(value=True)
            self._vars[mod] = var
            cb = tk.Checkbutton(
                left, text=label, variable=var,
                bg=BG2, fg=FG, selectcolor=BG3,
                activebackground=BG2, activeforeground=ACCENT,
                font=("Segoe UI", 9), anchor="w", cursor="hand2",
            )
            cb.pack(fill="x", pady=1)

        # кнопки выбора
        btn_frame = tk.Frame(left, bg=BG2)
        btn_frame.pack(fill="x", pady=(10, 0))
        tk.Button(btn_frame, text="Все", command=self._select_all,
                  bg=BG3, fg=FG, relief="flat", cursor="hand2",
                  font=("Segoe UI", 8), padx=6).pack(side="left", padx=(0, 4))
        tk.Button(btn_frame, text="Ни одного", command=self._select_none,
                  bg=BG3, fg=FG, relief="flat", cursor="hand2",
                  font=("Segoe UI", 8), padx=6).pack(side="left")

        # Правая колонка — вывод
        right = tk.Frame(body, bg=BG)
        right.pack(side="left", fill="both", expand=True)

        # Строка статуса / кнопка
        ctrl = tk.Frame(right, bg=BG, pady=4)
        ctrl.pack(fill="x")

        self._run_btn = tk.Button(
            ctrl, text="▶  Запустить выбранные",
            command=self._start_run,
            bg=ACCENT, fg=BG, font=bold,
            relief="flat", padx=14, pady=6, cursor="hand2",
        )
        self._run_btn.pack(side="left")

        self._clear_btn = tk.Button(
            ctrl, text="Очистить",
            command=self._clear_output,
            bg=BG3, fg=FG, font=("Segoe UI", 9),
            relief="flat", padx=10, pady=6, cursor="hand2",
        )
        self._clear_btn.pack(side="left", padx=(8, 0))

        self._status_var = tk.StringVar(value="Готов к запуску.")
        tk.Label(ctrl, textvariable=self._status_var,
                 bg=BG, fg=FG_DIM, font=("Segoe UI", 9)).pack(side="left", padx=14)

        # Счётчики
        counts = tk.Frame(right, bg=BG)
        counts.pack(fill="x", pady=(0, 4))
        self._pass_var = tk.StringVar(value="PASS: 0")
        self._fail_var = tk.StringVar(value="FAIL: 0")
        tk.Label(counts, textvariable=self._pass_var, bg=BG, fg=GREEN,
                 font=bold).pack(side="left")
        tk.Label(counts, textvariable=self._fail_var, bg=BG, fg=RED,
                 font=bold).pack(side="left", padx=(14, 0))

        # Текстовое поле вывода
        out_frame = tk.Frame(right, bg=BG3, bd=1, relief="flat")
        out_frame.pack(fill="both", expand=True)

        self._out = tk.Text(
            out_frame, bg=BG, fg=FG, font=mono,
            insertbackground=FG, relief="flat",
            wrap="none", state="disabled",
        )
        scroll_y = ttk.Scrollbar(out_frame, orient="vertical", command=self._out.yview)
        scroll_x = ttk.Scrollbar(out_frame, orient="horizontal", command=self._out.xview)
        self._out.configure(yscrollcommand=scroll_y.set, xscrollcommand=scroll_x.set)

        scroll_y.pack(side="right", fill="y")
        scroll_x.pack(side="bottom", fill="x")
        self._out.pack(fill="both", expand=True)

        # теги цветов
        self._out.tag_config("ok",      foreground=GREEN)
        self._out.tag_config("fail",    foreground=RED)
        self._out.tag_config("header",  foreground=BLUE)
        self._out.tag_config("summary", foreground=YELLOW)
        self._out.tag_config("dim",     foreground=FG_DIM)
        self._out.tag_config("accent",  foreground=ACCENT)

    # ---------------------------------------------------------------- helpers
    def _select_all(self):
        for v in self._vars.values():
            v.set(True)

    def _select_none(self):
        for v in self._vars.values():
            v.set(False)

    def _clear_output(self):
        self._out.configure(state="normal")
        self._out.delete("1.0", "end")
        self._out.configure(state="disabled")
        self._pass_var.set("PASS: 0")
        self._fail_var.set("FAIL: 0")
        self._status_var.set("Готов к запуску.")

    def _write(self, text, tag=""):
        self._out.configure(state="normal")
        self._out.insert("end", text, tag)
        self._out.see("end")
        self._out.configure(state="disabled")

    def _writeln(self, text="", tag=""):
        self._write(text + "\n", tag)

    # ------------------------------------------------------------------ run
    def _start_run(self):
        if self._running:
            return
        selected = [(mod, label) for mod, label in TESTS if self._vars[mod].get()]
        if not selected:
            self._status_var.set("Не выбран ни один тест.")
            return

        self._running = True
        self._run_btn.configure(state="disabled", text="Выполняется...")
        self._pass_var.set("PASS: 0")
        self._fail_var.set("FAIL: 0")
        self._status_var.set("Запуск...")

        thread = threading.Thread(target=self._run_tests, args=(selected,), daemon=True)
        thread.start()

    def _run_tests(self, selected):
        total_pass = 0
        total_fail = 0

        self._writeln()
        self._writeln("=" * 64, "dim")
        self._writeln(f"  Запуск {len(selected)} тест-модулей", "accent")
        self._writeln("=" * 64, "dim")

        for mod_name, label in selected:
            self._writeln()
            self._writeln(f"[ {label} ]", "header")
            self._writeln("-" * 50, "dim")

            try:
                mod = importlib.import_module(f"tests.{mod_name}")
                importlib.reload(mod)
                result = mod.run()
            except Exception as exc:
                self._writeln(f"  [ОШИБКА] {exc}", "fail")
                total_fail += 1
                self._update_counts(total_pass, total_fail)
                continue

            for line in result.get("log", []):
                if "[OK]" in line:
                    self._writeln(line, "ok")
                elif "[FAIL]" in line:
                    self._writeln(line, "fail")
                else:
                    self._writeln(line)

            p = len(result.get("pass", []))
            f = len(result.get("fail", []))
            total_pass += p
            total_fail += f
            self._update_counts(total_pass, total_fail)

            summary_tag = "ok" if f == 0 else "fail"
            self._writeln(f"  Итог: PASS {p}  FAIL {f}", summary_tag)

        self._writeln()
        self._writeln("=" * 64, "dim")
        final_tag = "ok" if total_fail == 0 else "fail"
        self._writeln(
            f"  ИТОГО: PASS {total_pass}  FAIL {total_fail}  "
            + ("-- ВСЕ ТЕСТЫ ПРОЙДЕНЫ" if total_fail == 0 else "-- ЕСТЬ ОШИБКИ"),
            final_tag,
        )
        self._writeln("=" * 64, "dim")

        self._running = False
        status = f"Готово. PASS: {total_pass}, FAIL: {total_fail}"
        self.after(0, lambda: self._run_btn.configure(state="normal", text="▶  Запустить выбранные"))
        self.after(0, lambda: self._status_var.set(status))

    def _update_counts(self, p, f):
        self.after(0, lambda: self._pass_var.set(f"PASS: {p}"))
        self.after(0, lambda: self._fail_var.set(f"FAIL: {f}"))


if __name__ == "__main__":
    # Убедимся, что папка tests в sys.path
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    app = TestRunner()
    app.mainloop()
