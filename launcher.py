#!/usr/bin/env python3
"""АИСК — Лаунчер сервера разработки"""
import os
import re
import queue
import threading
import webbrowser
import subprocess
from datetime import datetime
import tkinter as tk

BASE = os.path.dirname(os.path.abspath(__file__))
PY   = os.path.join(BASE, 'venv', 'Scripts', 'python.exe')
MGR  = os.path.join(BASE, 'manage.py')
URL  = 'http://127.0.0.1:8000'

P = {
    'bg':      '#0f0f1a',
    'panel':   '#161625',
    'accent':  '#2b5351',
    'accent2': '#3d7a76',
    'text':    '#d8dde6',
    'dim':     '#555f6e',
    'green':   '#22c55e',
    'red':     '#ef4444',
    'logbg':   '#0a0a14',
    'lognorm': '#b0bec5',
    'logdim':  '#3d4f61',
    'loghttp': '#79c0ff',
    'logok':   '#56d364',
    'logerr':  '#ff7b72',
    'logwarn': '#e3b341',
    'emfg':    '#111111',
    'embg':    '#fbbf24',
    'btn_g':   '#166534',
    'btn_r':   '#7f1d1d',
    'btn_b':   '#1e3a8a',
    'btn_gr':  '#1f2937',
}


class App:
    def __init__(self, root: tk.Tk):
        self.root   = root
        self.proc   = None
        self.q      = queue.Queue()
        self._alive = False
        self._busy  = False
        self._build_ui()
        self._poll()
        root.protocol('WM_DELETE_WINDOW', self._close)
        self._sys('Лаунчер готов. Нажмите «Запустить» для старта сервера.')

    # ── UI ───────────────────────────────────────────────────────────────────

    def _build_ui(self):
        r = self.root
        r.title('АИСК — Сервер разработки')
        r.geometry('1000x700')
        r.minsize(720, 480)
        r.configure(bg=P['bg'])

        # Try to set window icon
        for name in ('logo.ico', 'logo.png'):
            path = os.path.join(BASE, name)
            if os.path.exists(path):
                try:
                    if name.endswith('.ico'):
                        r.iconbitmap(path)
                    else:
                        img = tk.PhotoImage(file=path)
                        r.iconphoto(True, img)
                    break
                except Exception:
                    pass

        # Header
        hdr = tk.Frame(r, bg=P['accent'], pady=11, padx=16)
        hdr.pack(fill='x')
        tk.Label(hdr, text='АИСК', font=('Segoe UI', 17, 'bold'),
                 bg=P['accent'], fg='white').pack(side='left')
        tk.Label(hdr, text='  ·  Управление сервером разработки',
                 font=('Segoe UI', 10), bg=P['accent'], fg='#a8d5d1').pack(side='left')

        # Status strip
        s = tk.Frame(r, bg=P['panel'], pady=8, padx=16)
        s.pack(fill='x')
        self.dot = tk.Label(s, text='●', font=('Segoe UI', 13),
                            bg=P['panel'], fg=P['red'])
        self.dot.pack(side='left')
        self.st_lbl = tk.Label(s, text='  Сервер остановлен',
                               font=('Segoe UI', 10), bg=P['panel'], fg=P['text'])
        self.st_lbl.pack(side='left')
        self.url_lbl = tk.Label(s, text='', font=('Segoe UI', 10, 'underline'),
                                bg=P['panel'], fg=P['accent2'], cursor='hand2')
        self.url_lbl.pack(side='left', padx=(6, 0))
        self.url_lbl.bind('<Button-1>', lambda _: webbrowser.open(URL))

        # Buttons
        bar = tk.Frame(r, bg=P['bg'], pady=10, padx=16)
        bar.pack(fill='x')

        def mkbtn(text, cmd, color):
            return tk.Button(bar, text=text, command=cmd,
                             bg=color, fg='white', font=('Segoe UI', 9),
                             relief='flat', padx=11, pady=5,
                             cursor='hand2', bd=0,
                             activebackground=color, activeforeground='white')

        self.b_start   = mkbtn('▶  Запустить',       self._start,               P['btn_g'])
        self.b_restart = mkbtn('↺  Перезапустить',    self._restart,             P['btn_b'])
        self.b_stop    = mkbtn('■  Остановить',       self._stop,                P['btn_r'])
        self.b_browser = mkbtn('⬡  Открыть сайт',    lambda: webbrowser.open(URL), P['btn_gr'])
        self.b_clear   = mkbtn('✕  Очистить логи',    self._clear,               P['btn_gr'])

        for b in (self.b_start, self.b_restart, self.b_stop, self.b_browser, self.b_clear):
            b.pack(side='left', padx=(0, 7))

        self.b_restart.config(state='disabled')
        self.b_stop.config(state='disabled')

        self.do_build = tk.BooleanVar(value=True)
        tk.Checkbutton(bar, text='Собирать фронтенд при старте',
                       variable=self.do_build, bg=P['bg'], fg=P['text'],
                       selectcolor=P['panel'], activebackground=P['bg'],
                       activeforeground=P['text'],
                       font=('Segoe UI', 9)).pack(side='left', padx=(10, 0))

        # Divider + log header
        tk.Frame(r, bg=P['accent'], height=1).pack(fill='x')
        lh = tk.Frame(r, bg=P['panel'], pady=5, padx=16)
        lh.pack(fill='x')
        tk.Label(lh, text='ЖУРНАЛ СОБЫТИЙ',
                 font=('Segoe UI', 8, 'bold'), bg=P['panel'], fg=P['dim']).pack(side='left')

        # Log area
        lo = tk.Frame(r, bg=P['logbg'])
        lo.pack(fill='both', expand=True)

        self.txt = tk.Text(lo, bg=P['logbg'], fg=P['lognorm'],
                           font=('Consolas', 9), wrap='word', state='disabled',
                           relief='flat', padx=14, pady=10)
        vsb = tk.Scrollbar(lo, command=self.txt.yview,
                           bg=P['panel'], troughcolor=P['logbg'])
        self.txt.configure(yscrollcommand=vsb.set)
        vsb.pack(side='right', fill='y')
        self.txt.pack(fill='both', expand=True)

        # Text tags
        self.txt.tag_config('ts',   foreground=P['logdim'])
        self.txt.tag_config('sys',  foreground=P['dim'], font=('Consolas', 8))
        self.txt.tag_config('http', foreground=P['loghttp'])
        self.txt.tag_config('ok',   foreground=P['logok'])
        self.txt.tag_config('err',  foreground=P['logerr'])
        self.txt.tag_config('warn', foreground=P['logwarn'])
        # email code highlighting
        self.txt.tag_config('emb',  foreground=P['emfg'], background=P['embg'],
                            font=('Consolas', 9, 'bold'))
        self.txt.tag_config('emc',  foreground=P['emfg'], background=P['embg'],
                            font=('Consolas', 20, 'bold'))

    # ── Logging ──────────────────────────────────────────────────────────────

    def _ts(self):
        return datetime.now().strftime('%H:%M:%S')

    def _sys(self, msg):
        self.txt.config(state='normal')
        self.txt.insert('end', f'[{self._ts()}] ○ {msg}\n', 'sys')
        self.txt.config(state='disabled')
        self.txt.see('end')

    def _emit(self, raw: str):
        line = raw.rstrip()
        if not line:
            return

        # Email code – primary format: [EMAIL-DEV] to=email purpose=X code=ABC-DEF
        m = re.search(r'\[EMAIL-DEV\].*?to=(\S+)\s+purpose=(\S+)\s+code=(\S+)', line)
        if m:
            self._code_box(m.group(1), m.group(2), m.group(3))
            return

        # Email code – SMTP-fail fallback: code for email (purpose): ABC-DEF
        m = re.search(r'\[EMAIL-DEV\].*?code for (\S+)\s*\((\S+)\):\s+(\S+)', line)
        if m:
            self._code_box(m.group(1), m.group(2), m.group(3))
            return

        self.txt.config(state='normal')
        self.txt.insert('end', f'[{self._ts()}] ', 'ts')

        low = line.lower()
        if re.search(r'"(GET|POST|PUT|PATCH|DELETE|HEAD)\s', line):
            if re.search(r'" [45]\d\d ', line):
                tag = 'err'
            elif re.search(r'" 2\d\d ', line):
                tag = 'ok'
            else:
                tag = 'http'
        elif any(x in low for x in ('error', 'traceback', 'exception', 'errno')):
            tag = 'err'
        elif 'warning' in low:
            tag = 'warn'
        elif any(x in line for x in ('Django version', 'Starting development server',
                                      'Quit the server', 'System check')):
            tag = 'ok'
        else:
            tag = ''

        self.txt.insert('end', line + '\n', tag)
        self.txt.config(state='disabled')
        self.txt.see('end')

    def _code_box(self, email: str, purpose: str, code: str):
        labels = {
            'register':    'Регистрация',
            'recover':     'Восстановление пароля',
            'delete_org':  'Удаление организации',
            'change_email':'Смена email',
        }
        label = labels.get(purpose, purpose)
        sep = '━' * 56

        self.txt.config(state='normal')
        self.txt.insert('end', '\n')
        self.txt.insert('end', f'  {sep}\n',                             'emb')
        self.txt.insert('end', f'  КОД ПОДТВЕРЖДЕНИЯ  [{label}]\n',     'emb')
        self.txt.insert('end', f'  Кому: {email}\n',                     'emb')
        self.txt.insert('end',  '  \n',                                  'emb')
        self.txt.insert('end',  '      ',                                'emb')
        self.txt.insert('end', f'   {code}   ',                         'emc')
        self.txt.insert('end',  '\n',                                    'emb')
        self.txt.insert('end',  '  \n',                                  'emb')
        self.txt.insert('end', f'  {sep}\n',                             'emb')
        self.txt.insert('end', '\n')
        self.txt.config(state='disabled')
        self.txt.see('end')

    # ── Queue polling ─────────────────────────────────────────────────────────

    def _poll(self):
        try:
            while True:
                m = self.q.get_nowait()
                if   m[0] == 'line':    self._emit(m[1])
                elif m[0] == 'sys':     self._sys(m[1])
                elif m[0] == 'running': self._set_alive(True)
                elif m[0] == 'stopped': self._set_alive(False)
        except queue.Empty:
            pass
        self.root.after(40, self._poll)

    def _set_alive(self, yes: bool):
        self._alive = yes
        self._busy  = False
        if yes:
            self.dot.config(fg=P['green'])
            self.st_lbl.config(text='  Сервер запущен')
            self.url_lbl.config(text=URL)
            self.b_start.config(state='disabled')
            self.b_restart.config(state='normal')
            self.b_stop.config(state='normal')
        else:
            self.dot.config(fg=P['red'])
            self.st_lbl.config(text='  Сервер остановлен')
            self.url_lbl.config(text='')
            self.b_start.config(state='normal')
            self.b_restart.config(state='disabled')
            self.b_stop.config(state='disabled')

    # ── Actions ───────────────────────────────────────────────────────────────

    def _start(self):
        if self._alive or self._busy:
            return
        self._busy = True
        self.b_start.config(state='disabled')
        self._sys('Запуск...')
        build = self.do_build.get()
        threading.Thread(target=self._worker, args=(build,), daemon=True).start()

    def _stop(self):
        if not self.proc or self._busy:
            return
        self._busy = True
        self.b_stop.config(state='disabled')
        self.b_restart.config(state='disabled')
        self._sys('Остановка сервера...')
        self._kill(self.proc)

    def _restart(self):
        self._sys('Перезапуск...')
        self._stop()
        threading.Thread(target=self._wait_then_start, daemon=True).start()

    def _wait_then_start(self):
        import time
        for _ in range(60):
            if not self._alive:
                break
            time.sleep(0.1)
        time.sleep(0.4)
        self.root.after(0, self._start)

    def _clear(self):
        self.txt.config(state='normal')
        self.txt.delete('1.0', 'end')
        self.txt.config(state='disabled')
        self._sys('Логи очищены')

    def _close(self):
        if self.proc:
            self._kill(self.proc)
        self.root.destroy()

    def _kill(self, proc):
        try:
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)],
                           capture_output=True)
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass

    # ── Background worker ─────────────────────────────────────────────────────

    def _worker(self, build: bool):
        if not os.path.exists(PY):
            self.q.put(('sys', f'Python не найден: {PY}'))
            self.q.put(('stopped',))
            return

        # npm run build
        if build:
            self.q.put(('sys', 'Сборка фронтенда (npm run build)...'))
            fe = os.path.join(BASE, 'frontend')
            try:
                p = subprocess.Popen(
                    'npm run build', cwd=fe, shell=True,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                )
                for raw in iter(p.stdout.readline, b''):
                    self.q.put(('line', raw.decode('utf-8', errors='replace')))
                p.wait()
                if p.returncode != 0:
                    self.q.put(('sys', f'Ошибка сборки фронтенда (код {p.returncode})'))
                    self.q.put(('stopped',))
                    return
                self.q.put(('sys', 'Фронтенд собран успешно'))
            except Exception as e:
                self.q.put(('sys', f'npm error: {e}'))
                self.q.put(('stopped',))
                return

        # migrate
        self.q.put(('sys', 'Применение миграций...'))
        try:
            r = subprocess.run(
                [PY, MGR, 'migrate', '--run-syncdb'],
                cwd=BASE, capture_output=True,
                text=True, encoding='utf-8', errors='replace',
            )
            for ln in (r.stdout + r.stderr).splitlines():
                if ln.strip():
                    self.q.put(('line', ln))
        except Exception as e:
            self.q.put(('sys', f'migrate error: {e}'))

        # runserver
        self.q.put(('sys', f'Запуск сервера: {URL}'))
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        try:
            proc = subprocess.Popen(
                [PY, '-u', MGR, 'runserver'],
                cwd=BASE, env=env,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            )
            self.proc = proc
            self.q.put(('running',))
            for raw in iter(proc.stdout.readline, b''):
                self.q.put(('line', raw.decode('utf-8', errors='replace')))
            proc.wait()
            if self.proc is proc:
                self.proc = None
                self.q.put(('sys', f'Сервер остановлен (код {proc.returncode})'))
                self.q.put(('stopped',))
        except Exception as e:
            self.q.put(('sys', f'Ошибка запуска сервера: {e}'))
            self.q.put(('stopped',))


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        # Write crash log if GUI fails to start
        import traceback
        log_path = os.path.join(BASE, 'launcher_crash.log')
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(f'\n--- {datetime.now()} ---\n')
            traceback.print_exc(file=f)
        # Show error via basic tkinter messagebox
        try:
            import tkinter.messagebox as mb
            root2 = tk.Tk()
            root2.withdraw()
            mb.showerror('Ошибка лаунчера', str(e))
            root2.destroy()
        except Exception:
            pass
