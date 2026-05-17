/* global React, AIS_DATA, AIS_UTILS */
const { I } = window.AIS_DATA;
const { useState, useEffect, useRef } = React;
const { useToast, PasswordRules, PasswordStrength, PasswordInput, Field, LoadButton, pwStrength } = window.AIS_UTILS;

/* ============================================================
   LoginScreen - chips for demo, password show/hide, validation
   ============================================================ */
function LoginScreen({ onLogin, onRegister, onRecover }) {
  const toast = useToast();
  const [user, setUser]   = useState('owner1');
  const [pass, setPass]   = useState('demo_1234');
  const [errs, setErrs]   = useState({});
  const [touched, setTouched] = useState({});
  const userRef = useRef(null);

  const validate = (vals) => {
    const e = {};
    if (!vals.user.trim()) e.user = 'Введите логин';
    if (!vals.pass) e.pass = 'Введите пароль';
    else if (vals.pass.length < 4) e.pass = 'Слишком короткий пароль';
    return e;
  };

  const onBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrs(validate({ user, pass }));
  };
  // After first error, re-validate on every change
  useEffect(() => {
    if (Object.keys(touched).length) setErrs(validate({ user, pass }));
  }, [user, pass]);

  const pickDemo = (login) => {
    setUser(login);
    setPass('demo_1234');
    setTouched({});
    setErrs({});
    if (userRef.current) {
      const el = userRef.current;
      el.classList.remove('flash');
      void el.offsetWidth; // restart anim
      el.classList.add('flash');
    }
  };

  const submit = async (e) => {
    e && e.preventDefault();
    const v = validate({ user, pass });
    setErrs(v); setTouched({ user: 1, pass: 1 });
    if (Object.keys(v).length) {
      toast.push('Проверьте поля формы', { kind: 'err' });
      return;
    }
    await new Promise(r => setTimeout(r, 700));
    toast.push(`Добро пожаловать, ${user}`, { kind: 'ok' });
    onLogin && onLogin(user);
  };

  return (
    <div className="login-wrap">
      <div className="login-side">
        <div className="brand-row"><div className="logo">У</div>Учёт студентов</div>
        <div className="login-pitch">
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 500, borderRadius: 999, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>АИС колледжа · v2.0</div>
          <h1>Один источник правды о&nbsp;студентах, сотрудниках и&nbsp;группах.</h1>
          <p>Замена бумажных журналов и Excel-таблиц. Личные данные, статусы, перевод и&nbsp;отчисление, документы, журнал изменений - всё в одном месте.</p>
        </div>
        <div className="login-foot">© Колледж · Дипломная работа · 2026</div>
        <div className="login-art"></div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form screen-fade-in" onSubmit={submit} noValidate>
          <h2>Вход в систему</h2>
          <div className="sub">Введите логин и пароль для продолжения</div>

          <Field label="Логин" error={touched.user && errs.user}>
            <div className="input-with-icon">
              {I.user}
              <input
                ref={userRef}
                className={`input ${touched.user && errs.user ? 'is-error' : ''}`}
                value={user}
                onChange={e => setUser(e.target.value)}
                onBlur={() => onBlur('user')}
                autoComplete="username"
              />
            </div>
          </Field>

          <Field label="Пароль" error={touched.pass && errs.pass}>
            <PasswordInput
              value={pass}
              onChange={setPass}
              onBlur={() => onBlur('pass')}
              hasError={touched.pass && !!errs.pass}
              autoComplete="current-password"
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <input type="checkbox" defaultChecked /> Запомнить меня на этом устройстве
          </label>

          <LoadButton className="btn login-btn" type="submit" onClick={submit}>Войти</LoadButton>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 10 }}>
            <a href="#" onClick={e => { e.preventDefault(); onRegister && onRegister(); }} style={{ color: 'var(--accent)', fontWeight: 500 }}>Зарегистрироваться</a>
            <a href="#" onClick={e => { e.preventDefault(); onRecover && onRecover(); }} style={{ color: 'var(--text-muted)' }}>Восстановить через сид-фразу</a>
          </div>

          <div className="login-tip">
            <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Демо-доступы - клик для быстрого входа:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { l: 'owner1',   t: 'Владелец' },
                { l: 'admin1',   t: 'Админ' },
                { l: 'teacher1', t: 'Преп.' },
              ].map(d => (
                <button type="button" key={d.l} className="demo-chip" onClick={() => pickDemo(d.l)} title={`Войти как ${d.t}`}>
                  <span>{d.l}</span>
                  <span className="muted" style={{ fontSize: 10 }}>· {d.t}</span>
                </button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Пароль для всех: <code>demo_1234</code></div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   RegisterScreen - live password rules, strength, step indicator
   ============================================================ */
function RegisterScreen({ onDone, onBack }) {
  const toast = useToast();
  const [vals, setVals] = useState({ login: '', name: '', pass: '', pass2: '' });
  const [touched, setTouched] = useState({});
  const [pwFocus, setPwFocus] = useState(false);
  const [pw2Touched, setPw2Touched] = useState(false);
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const errs = {};
  if (!vals.login.trim()) errs.login = 'Введите логин';
  else if (!/^[a-z0-9_]{3,20}$/.test(vals.login)) errs.login = 'Только латиница, цифры и _, 3–20 символов';
  if (!vals.name.trim()) errs.name = 'Укажите имя для отображения';
  if (vals.pass) {
    if (vals.pass.length < 8) errs.pass = 'Минимум 8 символов';
    else if (!/\d/.test(vals.pass)) errs.pass = 'Нужна хотя бы одна цифра';
    else if (!/[_\-!@#$%^&*+.,;:?]/.test(vals.pass)) errs.pass = 'Нужен хотя бы один спецсимвол';
  }
  if (vals.pass2 && vals.pass !== vals.pass2) errs.pass2 = 'Пароли не совпадают';
  const pass2OK = vals.pass2 && vals.pass && vals.pass === vals.pass2;

  const submit = async () => {
    const full = {
      ...(!vals.login.trim() ? { login: 'Введите логин' } : {}),
      ...(!vals.name.trim() ? { name: 'Введите имя' } : {}),
      ...(!vals.pass ? { pass: 'Введите пароль' } : {}),
      ...(vals.pass && vals.pass.length < 8 ? { pass: 'Минимум 8 символов' } : {}),
      ...(vals.pass && !/\d/.test(vals.pass) ? { pass: 'Нужна хотя бы одна цифра' } : {}),
      ...(vals.pass && !/[_\-!@#$%^&*+.,;:?]/.test(vals.pass) ? { pass: 'Нужен спецсимвол' } : {}),
      ...(!vals.pass2 ? { pass2: 'Повторите пароль' } : {}),
      ...(vals.pass && vals.pass2 && vals.pass !== vals.pass2 ? { pass2: 'Пароли не совпадают' } : {}),
    };
    setTouched({ login: 1, name: 1, pass: 1, pass2: 1 });
    if (Object.keys(full).length) {
      toast.push('Исправьте ошибки в форме', { kind: 'err' });
      return;
    }
    await new Promise(r => setTimeout(r, 700));
    toast.push('Аккаунт создан. Сохраните сид-фразу!', { kind: 'ok' });
    onDone && onDone();
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>

          <div className="steps" style={{ justifyContent: 'center' }}>
            <div className="step is-active"><div className="step-num">1</div>Данные аккаунта</div>
            <div className="step-bar"></div>
            <div className="step"><div className="step-num">2</div>Сид-фраза</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Регистрация владельца</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Создайте аккаунт. После регистрации вы получите сид-фразу для восстановления пароля - сохраните её в надёжном месте.</p>

              <div className="form-grid">
                <Field label="Логин" required hint="Латиница, цифры и подчёркивание · 3–20 симв." error={touched.login && errs.login}>
                  <input className={`input ${touched.login && errs.login ? 'is-error' : ''}`} placeholder="owner1"
                    value={vals.login}
                    onChange={e => set('login', e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, login: 1 }))}
                  />
                </Field>
                <Field label="Имя (отображается в системе)" required error={touched.name && errs.name}>
                  <input className={`input ${touched.name && errs.name ? 'is-error' : ''}`} placeholder="Иванов Иван Иванович"
                    value={vals.name}
                    onChange={e => set('name', e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, name: 1 }))}
                  />
                </Field>

                <div className="field field-full">
                  <label className="field-label">Пароль<span className="req">*</span></label>
                  <PasswordInput
                    value={vals.pass}
                    onChange={(v) => set('pass', v)}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => { setPwFocus(false); setTouched(t => ({ ...t, pass: 1 })); }}
                    hasError={touched.pass && !!errs.pass}
                  />
                  <PasswordRules value={vals.pass} show={pwFocus || !!vals.pass} />
                  {vals.pass && <PasswordStrength value={vals.pass} />}
                </div>

                <div className="field field-full">
                  <label className="field-label">Повторите пароль<span className="req">*</span></label>
                  <PasswordInput
                    value={vals.pass2}
                    onChange={(v) => { set('pass2', v); setPw2Touched(true); }}
                    onBlur={() => setTouched(t => ({ ...t, pass2: 1 }))}
                    hasError={pw2Touched && !!errs.pass2}
                  />
                  {pw2Touched && pass2OK && <div className="pw-rule ok" style={{ marginTop: 6, fontSize: 12 }}>
                    <span className="pw-mark"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    Пароли совпадают
                  </div>}
                  {pw2Touched && errs.pass2 && <div className="field-error">{I.alert}{errs.pass2}</div>}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Войти</button>
              <div style={{ flex: 1 }}></div>
              <LoadButton className="btn btn-primary" onClick={submit}>Зарегистрироваться {I.chevr}</LoadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Seed phrase
   ============================================================ */
const SEED_WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident'];

function SeedPhraseScreen({ onDone }) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(SEED_WORDS.join(' '));
    } catch {}
    setCopied(true);
    toast.push('Сид-фраза скопирована в буфер', { kind: 'ok' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>

          <div className="steps" style={{ justifyContent: 'center' }}>
            <div className="step is-done"><div className="step-num">{I.check}</div>Данные аккаунта</div>
            <div className="step-bar"></div>
            <div className="step is-active"><div className="step-num">2</div>Сид-фраза</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <div className="banner banner-bad" style={{ marginBottom: 20 }}>
                {I.alert}
                <div className="banner-body"><strong>Запишите эти 12 слов!</strong> Они показываются только один раз. Без сид-фразы восстановить пароль невозможно.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2>Ваша сид-фраза</h2>
                <button className="btn btn-secondary btn-sm" onClick={doCopy} style={{ minWidth: 130 }}>
                  {copied
                    ? <>{I.check}Скопировано</>
                    : <><svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Скопировать</>
                  }
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {SEED_WORDS.map((w, i) => (
                  <div key={i} className="seed-tile">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="word">{w}</span>
                  </div>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                <span>Я записал(а) сид-фразу и понимаю, что без неё восстановление пароля невозможно</span>
              </label>
            </div>
            <div className="modal-foot">
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-primary" disabled={!confirmed} onClick={() => { toast.push('Регистрация завершена', { kind: 'ok' }); onDone && onDone(); }} style={{ opacity: confirmed ? 1 : 0.55, transition: 'opacity .2s' }}>Продолжить {I.chevr}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Recover password
   ============================================================ */
function RecoverPasswordScreen({ onBack }) {
  const toast = useToast();
  const [login, setLogin] = useState('');
  const [words, setWords] = useState(Array(12).fill(''));
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [touched, setTouched] = useState({});
  const filled = words.filter(Boolean).length;

  const submit = async () => {
    setTouched({ all: 1 });
    if (!login.trim() || filled < 12 || pwStrength(p1) < 3 || p1 !== p2) {
      toast.push('Заполните логин, все 12 слов и пароль', { kind: 'err' });
      return;
    }
    await new Promise(r => setTimeout(r, 800));
    toast.push('Пароль успешно изменён', { kind: 'ok' });
    onBack && onBack();
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Восстановление пароля</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Введите логин и все 12 слов вашей сид-фразы, затем задайте новый пароль.</p>

              <Field label="Логин" required error={touched.all && !login.trim() ? 'Введите логин' : null}>
                <input className={`input ${touched.all && !login.trim() ? 'is-error' : ''}`} placeholder="owner1" value={login} onChange={e => setLogin(e.target.value)} />
              </Field>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                <div className="form-section-title" style={{ margin: 0 }}>Сид-фраза</div>
                <span className="muted" style={{ fontSize: 12 }}>{filled} / 12 введено</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
                {words.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 20, fontFamily: 'var(--font-mono)' }}>{String(i + 1).padStart(2, '0')}.</span>
                    <input className={`input ${touched.all && !w ? 'is-error' : ''}`} style={{ fontSize: 12, padding: '6px 8px', fontFamily: 'var(--font-mono)' }} placeholder={`слово ${i + 1}`} value={w}
                      onChange={e => { const a = [...words]; a[i] = e.target.value.trim(); setWords(a); }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Новый пароль" required>
                  <PasswordInput value={p1} onChange={setP1} hasError={touched.all && pwStrength(p1) < 3} />
                  {p1 && <PasswordStrength value={p1} />}
                </Field>
                <Field label="Повторите" required error={touched.all && p1 !== p2 ? 'Не совпадает' : null} success={p2 && p1 === p2}>
                  <PasswordInput value={p2} onChange={setP2} hasError={touched.all && (p1 !== p2)} />
                </Field>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Войти</button>
              <div style={{ flex: 1 }}></div>
              <LoadButton className="btn btn-primary" onClick={submit}>{I.check}Сменить пароль</LoadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AIS_AUTH = { LoginScreen, RegisterScreen, SeedPhraseScreen, RecoverPasswordScreen };
