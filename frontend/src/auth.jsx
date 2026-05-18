import { useState, useEffect } from 'react';
import axios from 'axios';
import { I } from './data.jsx';
import { useToast, PasswordRules, PasswordStrength, PasswordInput, Field, LoadButton, pwStrength } from './utils.jsx';

/* ============================================================
   LoginScreen
   ============================================================ */
function LoginScreen({ onLogin, onRegister, onRecover }) {
  const toast = useToast();
  const [user, setUser]   = useState('');
  const [pass, setPass]   = useState('');
  const [errs, setErrs]   = useState({});
  const [touched, setTouched] = useState({});

  const validate = (vals) => {
    const e = {};
    if (!vals.user.trim()) e.user = 'Введите логин';
    if (!vals.pass) e.pass = 'Введите пароль';
    return e;
  };

  const onBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrs(validate({ user, pass }));
  };
  useEffect(() => {
    if (Object.keys(touched).length) setErrs(validate({ user, pass }));
  }, [user, pass]);

  const submit = async (e) => {
    e && e.preventDefault();
    const v = validate({ user, pass });
    setErrs(v); setTouched({ user: 1, pass: 1 });
    if (Object.keys(v).length) {
      toast.push('Проверьте поля формы', { kind: 'err' });
      return;
    }
    try {
      const res = await axios.post('/api/auth/login/', { username: user, password: pass });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      toast.push(`Добро пожаловать, ${res.data.user.full_name || user}`, { kind: 'ok' });
      onLogin && onLogin(res.data.user);
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка входа';
      toast.push(msg, { kind: 'err' });
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-side">
        <div className="brand-row"><img src="/logo.png" className="logo" alt="" style={{ objectFit: 'contain' }} />АИСК</div>
        <div className="login-pitch">
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 500, borderRadius: 999, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>АИС колледжа · v2.0</div>
          <h1>Единая система учета студентов и&nbsp;преподавателей.</h1>
          <p>Замена бумажных журналов и Excel-таблиц. Личные данные, статусы, перевод и отчисление, документы, журнал изменений - всё в одном месте.</p>
        </div>
        <div className="login-foot">© ГБПОУ МКАГ · Дипломная работа · Пушков Н. М. · Группа ИСиП-3-22 · 2026</div>
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
                className={`input ${touched.user && errs.user ? 'is-error' : ''}`}
                value={user}
                onChange={e => setUser(e.target.value)}
                onKeyDown={e => { if (e.key.length === 1 && /[А-ЯЁа-яё]/i.test(e.key)) e.preventDefault(); }}
                onPaste={e => {
                  e.preventDefault();
                  const inp = e.target;
                  const clean = (e.clipboardData.getData('text') || '').replace(/[А-ЯЁа-яё]/g, '');
                  setUser(inp.value.slice(0, inp.selectionStart) + clean + inp.value.slice(inp.selectionEnd));
                }}
                onBlur={() => onBlur('user')}
                autoComplete="username"
                maxLength={150}
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
            <a href="#" onClick={e => { e.preventDefault(); onRecover && onRecover(); }} style={{ color: 'var(--text-muted)' }}>Забыли пароль?</a>
          </div>

        </form>
      </div>
    </div>
  );
}

/* ============================================================
   RegisterScreen
   ============================================================ */
function RegisterScreen({ onDone, onBack }) {
  const toast = useToast();
  const [vals, setVals] = useState({ login: '', name: '', email: '', pass: '', pass2: '' });
  const [touched, setTouched] = useState({});
  const [pwFocus, setPwFocus] = useState(false);
  const [pw2Touched, setPw2Touched] = useState(false);
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const errs = {};
  if (!vals.login.trim()) errs.login = 'Введите логин';
  else if (vals.login.length < 3) errs.login = 'Минимум 3 символа';
  if (!vals.name.trim()) errs.name = 'Укажите ФИО';
  else if (!/^[А-ЯЁа-яё\s\-]+$/.test(vals.name.trim())) errs.name = 'Только кириллица';
  else if (vals.name.trim().split(/\s+/).filter(Boolean).length !== 3) errs.name = 'Введите фамилию, имя и отчество (3 слова)';
  if (!vals.email.trim()) errs.email = 'Введите email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email.trim())) errs.email = 'Некорректный email';
  if (vals.pass) {
    if (vals.pass.length < 8) errs.pass = 'Минимум 8 символов';
    else if (!/\d/.test(vals.pass)) errs.pass = 'Нужна хотя бы одна цифра';
    else if (!/[A-Za-z]/.test(vals.pass)) errs.pass = 'Нужна хотя бы одна латинская буква';
    else if (!/[_\-!@#$%^&*+.,;:?]/.test(vals.pass)) errs.pass = 'Нужен хотя бы один спецсимвол';
  }
  if (vals.pass2 && vals.pass !== vals.pass2) errs.pass2 = 'Пароли не совпадают';
  const pass2OK = vals.pass2 && vals.pass && vals.pass === vals.pass2;

  const submit = async () => {
    const full = {
      ...(!vals.login.trim() ? { login: 'Введите логин' } : {}),
      ...(!vals.name.trim() ? { name: 'Введите ФИО' } : {}),
      ...(!vals.email.trim() ? { email: 'Введите email' } : {}),
      ...(!vals.pass ? { pass: 'Введите пароль' } : {}),
      ...(!vals.pass2 ? { pass2: 'Повторите пароль' } : {}),
      ...(vals.pass && vals.pass2 && vals.pass !== vals.pass2 ? { pass2: 'Пароли не совпадают' } : {}),
    };
    setTouched({ login: 1, name: 1, email: 1, pass: 1, pass2: 1 });
    if (Object.keys(full).length || Object.keys(errs).length) {
      toast.push('Исправьте ошибки в форме', { kind: 'err' });
      return;
    }
    try {
      const res = await axios.post('/api/auth/register/', {
        login: vals.login,
        name: vals.name,
        email: vals.email,
        pass: vals.pass,
      });
      toast.push('Код отправлен на почту', { kind: 'ok' });
      onDone && onDone({ maskedEmail: res.data.masked_email, login: vals.login });
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка регистрации';
      toast.push(msg, { kind: 'err' });
    }
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
            <img src="/logo.png" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%' }} alt="" />
            <div style={{ fontWeight: 600 }}>АИСК</div>
          </div>

          <div className="steps" style={{ justifyContent: 'center' }}>
            <div className="step is-active"><div className="step-num">1</div>Данные аккаунта</div>
            <div className="step-bar"></div>
            <div className="step"><div className="step-num">2</div>Подтверждение Email</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Создание аккаунта владельца</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>После заполнения формы мы отправим 6-значный код на вашу почту для подтверждения.</p>

              <div className="form-grid">
                <Field
                  label="Логин" required
                  error={touched.login && errs.login}
                  hint={touched.login && vals.login && !errs.login ? 'Доступен только вам' : null}
                  success={!!(touched.login && vals.login && !errs.login)}
                >
                  <input className={`input ${touched.login && errs.login ? 'is-error' : ''}`}
                    value={vals.login}
                    onChange={e => set('login', e.target.value.replace(/[А-ЯЁа-яё]/gi, ''))}
                    onKeyDown={e => { if (e.key.length === 1 && /[А-ЯЁа-яё]/i.test(e.key)) e.preventDefault(); }}
                    onBlur={() => setTouched(t => ({ ...t, login: 1 }))}
                    maxLength={20}
                  />
                </Field>
                <Field
                  label="ФИО" required
                  error={touched.name && errs.name}
                  hint={touched.name && vals.name && !errs.name ? 'Отображается в системе' : null}
                  success={!!(touched.name && vals.name && !errs.name)}
                >
                  <input className={`input ${touched.name && errs.name ? 'is-error' : ''}`}
                    value={vals.name}
                    onChange={e => set('name', e.target.value)}
                    onKeyDown={e => { if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) e.preventDefault(); }}
                    onPaste={e => {
                      e.preventDefault();
                      const inp = e.target;
                      const clean = (e.clipboardData.getData('text') || '').replace(/[A-Za-z]/g, '');
                      set('name', inp.value.slice(0, inp.selectionStart) + clean + inp.value.slice(inp.selectionEnd));
                    }}
                    onBlur={() => setTouched(t => ({ ...t, name: 1 }))}
                    maxLength={150}
                  />
                </Field>

                <div className="field field-full">
                  <label className="field-label">Email<span className="req">*</span></label>
                  <input
                    className={`input ${touched.email && errs.email ? 'is-error' : ''}`}
                    type="email"
                    value={vals.email}
                    onChange={e => set('email', e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, email: 1 }))}
                    autoComplete="email"
                  />
                  {touched.email && errs.email && (
                    <div className="field-error">{I.alert}{errs.email}</div>
                  )}
                  {touched.email && vals.email && !errs.email && (
                    <div className="field-hint">На этот адрес придёт код подтверждения</div>
                  )}
                </div>

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
              <LoadButton className="btn btn-primary" onClick={submit}>Далее {I.chevr}</LoadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EmailVerifyScreen
   ============================================================ */
function EmailVerifyScreen({ maskedEmail, login, onDone, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = async () => {
    setTouched(true);
    if (code.trim().length !== 6) {
      toast.push('Введите 6-значный код', { kind: 'err' });
      return;
    }
    try {
      const res = await axios.post('/api/auth/verify-email/', {
        login,
        code: code.trim().toUpperCase(),
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      toast.push('Регистрация завершена!', { kind: 'ok' });
      onDone && onDone(res.data.user);
    } catch (err) {
      const msg = err.response?.data?.error || 'Неверный код';
      toast.push(msg, { kind: 'err' });
    }
  };

  const resend = async () => {
    toast.push('Для повторной отправки вернитесь на шаг регистрации', { kind: 'warn' });
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
            <img src="/logo.png" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%' }} alt="" />
            <div style={{ fontWeight: 600 }}>АИСК</div>
          </div>

          <div className="steps" style={{ justifyContent: 'center' }}>
            <div className="step is-done"><div className="step-num">{I.check}</div>Данные аккаунта</div>
            <div className="step-bar"></div>
            <div className="step is-active"><div className="step-num">2</div>Подтверждение Email</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Подтвердите email</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
                Мы отправили 6-значный код на адрес <strong>{maskedEmail}</strong>. Введите его ниже. Код действителен 15 минут.
              </p>

              <Field label="Код подтверждения" required error={touched && code.trim().length !== 6 && code !== '' ? 'Код должен содержать 6 символов' : null}>
                <input
                  className={`input ${touched && code.trim().length !== 6 && code !== '' ? 'is-error' : ''}`}
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 22, letterSpacing: '0.25em', textAlign: 'center', maxWidth: 200 }}
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                />
              </Field>

              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                Не пришёл код?{' '}
                <a href="#" onClick={e => { e.preventDefault(); onBack && onBack(); }} style={{ color: 'var(--accent)' }}>
                  Вернуться и отправить снова
                </a>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Назад</button>
              <div style={{ flex: 1 }}></div>
              <LoadButton className="btn btn-primary" onClick={submit}>{I.check}Подтвердить</LoadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RecoverPasswordScreen - 2 шага: запрос кода + ввод кода
   ============================================================ */
function RecoverPasswordScreen({ onBack, onDone }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [login, setLogin] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [touched, setTouched] = useState({});

  const sendCode = async () => {
    setTouched({ all: 1 });
    if (!login.trim()) {
      toast.push('Введите логин', { kind: 'err' });
      return;
    }
    try {
      const res = await axios.post('/api/auth/recover/send-code/', { login: login.trim() });
      setMaskedEmail(res.data.masked_email);
      setStep(2);
      toast.push('Код отправлен на почту', { kind: 'ok' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка отправки кода';
      toast.push(msg, { kind: 'err' });
    }
  };

  const submit = async () => {
    setTouched({ all: 1 });
    if (code.trim().length !== 6 || pwStrength(p1) < 3 || p1 !== p2) {
      toast.push('Заполните код и пароль', { kind: 'err' });
      return;
    }
    try {
      const res = await axios.post('/api/auth/recover/', {
        login: login.trim(),
        code: code.trim().toUpperCase(),
        new_password: p1,
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      toast.push('Пароль успешно изменён', { kind: 'ok' });
      onDone && onDone();
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка восстановления';
      toast.push(msg, { kind: 'err' });
    }
  };

  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <img src="/logo.png" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%' }} alt="" />
            <div style={{ fontWeight: 600 }}>АИСК</div>
          </div>

          {step === 1 ? (
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <h2 style={{ marginBottom: 6 }}>Восстановление пароля</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Введите ваш логин. Мы отправим код восстановления на привязанный email.</p>

                <Field label="Логин" required error={touched.all && !login.trim() ? 'Введите логин' : null}>
                  <input
                    className={`input ${touched.all && !login.trim() ? 'is-error' : ''}`}
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    onKeyDown={e => { if (e.key.length === 1 && /[А-ЯЁа-яё]/i.test(e.key)) e.preventDefault(); }}
                    maxLength={150}
                    autoFocus
                  />
                </Field>
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Войти</button>
                <div style={{ flex: 1 }}></div>
                <LoadButton className="btn btn-primary" onClick={sendCode}>Получить код {I.chevr}</LoadButton>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <h2 style={{ marginBottom: 6 }}>Введите код и новый пароль</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
                  Код отправлен на <strong>{maskedEmail}</strong>. Введите его и задайте новый пароль.
                </p>

                <Field label="Код из письма" required>
                  <input
                    className={`input ${touched.all && code.trim().length !== 6 ? 'is-error' : ''}`}
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: '0.2em', textAlign: 'center', maxWidth: 180 }}
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  <Field label="Новый пароль" required>
                    <PasswordInput value={p1} onChange={setP1} hasError={touched.all && pwStrength(p1) < 3} />
                    {p1 && <PasswordStrength value={p1} />}
                  </Field>
                  <Field label="Повторите" required error={touched.all && p1 !== p2 ? 'Не совпадает' : null} success={p2 && p1 === p2}>
                    <PasswordInput value={p2} onChange={setP2} hasError={touched.all && (p1 !== p2)} />
                  </Field>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  Не пришёл код?{' '}
                  <a href="#" onClick={e => { e.preventDefault(); setStep(1); setCode(''); }} style={{ color: 'var(--accent)' }}>
                    Отправить снова
                  </a>
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>{I.back}Назад</button>
                <div style={{ flex: 1 }}></div>
                <LoadButton className="btn btn-primary" onClick={submit}>{I.check}Сменить пароль</LoadButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen };
