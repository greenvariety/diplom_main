import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { I } from './data.jsx';
import { useToast, PasswordRules, PasswordStrength, PasswordInput, FadingError, Field, LoadButton, pwStrength } from './utils.jsx';

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
  const [agree, setAgree] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  if (showTerms) {
    return <TermsScreen onBack={() => setShowTerms(false)} />;
  }

  const errs = {};
  if (!vals.login.trim()) errs.login = 'Введите логин';
  else if (vals.login.length < 3) errs.login = 'Минимум 3 символа';
  if (!vals.name.trim()) errs.name = 'Укажите ФИО';
  else if (!/^[А-ЯЁа-яё\s\-]+$/.test(vals.name.trim())) errs.name = 'Только кириллица';
  else if (vals.name.trim().split(/\s+/).filter(Boolean).length !== 3) errs.name = 'Введите фамилию, имя и отчество (3 слова)';
  if (!vals.email.trim()) errs.email = 'Введите email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email.trim())) errs.email = 'Некорректный email';
  if (!vals.pass) errs.pass = 'Введите пароль';
  else if (vals.pass.length < 8) errs.pass = 'Минимум 8 символов';
  else if (!/\d/.test(vals.pass)) errs.pass = 'Нужна хотя бы одна цифра';
  else if (!/[A-Za-z]/.test(vals.pass)) errs.pass = 'Нужна хотя бы одна латинская буква';
  else if (!/[_\-!@#$%^&*+.,;:?]/.test(vals.pass)) errs.pass = 'Нужен хотя бы один спецсимвол';
  if (!vals.pass2) errs.pass2 = 'Повторите пароль';
  else if (vals.pass && vals.pass !== vals.pass2) errs.pass2 = 'Пароли не совпадают';
  const pass2OK = vals.pass2 && vals.pass && vals.pass === vals.pass2;

  const submit = async () => {
    setTouched({ login: 1, name: 1, email: 1, pass: 1, pass2: 1 });
    setPw2Touched(true);
    setSubmitAttempted(true);
    if (Object.keys(errs).length) {
      return;
    }
    if (!agree) {
      return;
    }
    try {
      const res = await axios.post('/api/auth/register/', {
        login: vals.login,
        name: vals.name,
        email: vals.email,
        pass: vals.pass,
      });
      const msg = res.data.debug_code ? 'Email не настроен - код показан на экране' : 'Код отправлен на почту';
      toast.push(msg, { kind: 'ok' });
      onDone && onDone({ maskedEmail: res.data.masked_email, login: vals.login, debugCode: res.data.debug_code });
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
                  <FadingError error={touched.email && errs.email ? errs.email : null} />
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
                  <FadingError error={touched.pass && !vals.pass ? errs.pass : null} />
                  <PasswordRules value={vals.pass} show={pwFocus || !!vals.pass} />
                  {vals.pass && <PasswordStrength value={vals.pass} />}
                </div>

                <div className="field field-full">
                  <label className="field-label">Повторите пароль<span className="req">*</span></label>
                  <PasswordInput
                    value={vals.pass2}
                    onChange={(v) => { set('pass2', v); setPw2Touched(true); }}
                    onBlur={() => setTouched(t => ({ ...t, pass2: 1 }))}
                    hasError={(pw2Touched || touched.pass2) && !!errs.pass2}
                  />
                  {(pw2Touched || touched.pass2) && pass2OK && <div className="pw-rule ok" style={{ marginTop: 6, fontSize: 12 }}>
                    <span className="pw-mark"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    Пароли совпадают
                  </div>}
                  <FadingError error={(pw2Touched || touched.pass2) && errs.pass2 ? errs.pass2 : null} />
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={e => setAgree(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                  <span>
                    Я ознакомился(-лась) и согласен(-на) с{' '}
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); setShowTerms(true); }}
                      style={{ color: 'var(--accent)', fontWeight: 500 }}
                    >
                      пользовательским соглашением
                    </a>
                  </span>
                </label>
                <FadingError error={submitAttempted && !agree ? 'Необходимо принять соглашение для регистрации' : null} style={{ marginTop: 6 }} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Назад</button>
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
   CodeInput - 6 ячеек для ввода кода (только A-Z и 0-9)
   ============================================================ */
function CodeInput({ onChange, hasError, autoFocus }) {
  const refs = useRef([]);
  const [cells, setCells] = useState(['', '', '', '', '', '']);

  const focusAt = (i) => {
    const el = refs.current[i];
    if (el) { el.focus(); el.select(); }
  };

  const handleFocus = (idx) => {
    const firstEmpty = cells.findIndex(c => !c);
    if (firstEmpty !== -1 && firstEmpty < idx) {
      setTimeout(() => focusAt(firstEmpty), 0);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = [...cells];
      if (arr[idx]) {
        arr[idx] = '';
        setCells(arr);
        onChange(arr.join(''));
      } else if (idx > 0) {
        arr[idx - 1] = '';
        setCells(arr);
        onChange(arr.join(''));
        focusAt(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) focusAt(idx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < 5) focusAt(idx + 1);
    }
  };

  const handleChange = (idx, e) => {
    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    const arr = [...cells];
    arr[idx] = clean[clean.length - 1];
    setCells(arr);
    onChange(arr.join(''));
    if (idx < 5) focusAt(idx + 1);
  };

  const handlePaste = (idx, e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6 - idx);
    if (!pasted) return;
    const arr = [...cells];
    pasted.split('').forEach((c, i) => { if (idx + i < 6) arr[idx + i] = c; });
    setCells(arr);
    onChange(arr.join(''));
    focusAt(Math.min(idx + pasted.length, 5));
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {cells.map((ch, idx) => (
        <input
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          type="text"
          inputMode="text"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && idx === 0}
          maxLength={2}
          value={ch}
          className={`input${hasError ? ' is-error' : ''}`}
          style={{
            width: 44, height: 52,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 600,
            padding: 0,
          }}
          onChange={e => handleChange(idx, e)}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={e => handlePaste(idx, e)}
          onFocus={() => handleFocus(idx)}
        />
      ))}
    </div>
  );
}

/* ============================================================
   EmailVerifyScreen
   ============================================================ */
function EmailVerifyScreen({ maskedEmail, login, debugCode, onDone, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [codeKey, setCodeKey] = useState(0);
  const [touched, setTouched] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await axios.post('/api/auth/resend-register-code/', { login });
      toast.push('Новый код отправлен на почту', { kind: 'ok' });
      setCooldown(60);
      setCode('');
      setCodeKey(k => k + 1);
    } catch (err) {
      const retryAfter = err.response?.data?.retry_after;
      if (retryAfter) setCooldown(retryAfter);
      const msg = err.response?.data?.error || 'Ошибка отправки';
      toast.push(msg, { kind: 'err' });
    } finally {
      setResending(false);
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
            <div className="step is-done"><div className="step-num">{I.check}</div>Данные аккаунта</div>
            <div className="step-bar"></div>
            <div className="step is-active"><div className="step-num">2</div>Подтверждение Email</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Подтвердите email</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
                Мы отправили 6-значный код на адрес <strong>{maskedEmail}</strong>. Введите его ниже. Код действителен 10 минут.
              </p>

              {debugCode && (
                <div style={{ background: 'var(--warn-bg, #fffbeb)', border: '1px solid var(--warn-border, #fcd34d)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--warn-text, #92400e)' }}>
                  <strong>Режим разработки:</strong> email не настроен. Ваш код: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: 2 }}>{debugCode}</strong>
                </div>
              )}

              <Field label="Код подтверждения" required error={touched && code.length < 6 && code.length > 0 ? 'Введите все 6 символов' : null}>
                <CodeInput key={codeKey} onChange={setCode} hasError={touched && code.length < 6 && code.length > 0} autoFocus />
              </Field>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Не пришёл код?</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 13, minWidth: 160 }}
                  disabled={cooldown > 0 || resending}
                  onClick={resend}
                >
                  {cooldown > 0
                    ? `Отправить снова (${cooldown} сек.)`
                    : resending ? 'Отправляем...' : 'Отправить снова'}
                </button>
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
                  <CodeInput onChange={setCode} hasError={touched.all && code.length !== 6} autoFocus />
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

/* ============================================================
   TermsScreen - пользовательское соглашение
   ============================================================ */
function TermsScreen({ onBack }) {
  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap screen-fade-in" style={{ padding: '40px 24px', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <img src="/logo.png" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%' }} alt="" />
            <div style={{ fontWeight: 600 }}>АИСК</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 4 }}>Пользовательское соглашение</h2>
              <p className="muted" style={{ fontSize: 12, marginBottom: 24 }}>
                АИС «Учёт студентов» (АИСК) - версия 2.0 - действует с 2026 года
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>1. Предмет соглашения</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Настоящее пользовательское соглашение регулирует условия использования автоматизированной
                    информационной системы «Учёт студентов» (далее - Система), предназначенной для ведения
                    учёта студентов, сотрудников, групп и документов учебных заведений.
                  </p>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>2. Пользователи Системы</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-muted)' }}>
                    <div><strong style={{ color: 'var(--text)' }}>Владелец</strong> - физическое лицо, создающее аккаунт и управляющее одной или несколькими организациями в Системе.</div>
                    <div><strong style={{ color: 'var(--text)' }}>Администратор</strong> - сотрудник учебного заведения, которому Владелец предоставил расширенный доступ.</div>
                    <div><strong style={{ color: 'var(--text)' }}>Преподаватель</strong> - сотрудник учебного заведения с ограниченным доступом к данным своих групп.</div>
                  </div>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>3. Персональные данные</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-muted)' }}>
                    <div>3.1. При регистрации Владелец предоставляет: логин, ФИО и адрес электронной почты.</div>
                    <div>3.2. Данные хранятся на сервере, размещённом Владельцем организации, и не передаются третьим лицам.</div>
                    <div>3.3. Адрес электронной почты используется исключительно для подтверждения аккаунта, восстановления пароля и удаления организации.</div>
                    <div>3.4. Данные студентов, сотрудников и опекунов, вносимые в Систему, являются ответственностью Владельца и обрабатываются в соответствии с законодательством РФ о персональных данных.</div>
                  </div>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>4. Обязанности Пользователя</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-muted)' }}>
                    <div>4.1. Пользователь обязан обеспечивать конфиденциальность своих учётных данных (логина и пароля).</div>
                    <div>4.2. Запрещается передавать доступ к аккаунту третьим лицам без соответствующего оформления через Систему.</div>
                    <div>4.3. Пользователь несёт полную ответственность за все действия, совершённые с его аккаунта.</div>
                    <div>4.4. Запрещается использовать Систему в целях, нарушающих законодательство Российской Федерации.</div>
                    <div>4.5. Запрещается вносить заведомо ложные сведения о студентах, сотрудниках и иных лицах.</div>
                  </div>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>5. Права администрации</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-muted)' }}>
                    <div>5.1. Администрация вправе заблокировать или удалить аккаунт при нарушении настоящего соглашения.</div>
                    <div>5.2. Администрация вправе вносить изменения в функциональность Системы без предварительного уведомления.</div>
                  </div>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>6. Ограничение ответственности</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Система предоставляется «как есть». Администрация не несёт ответственности за возможные
                    технические сбои, потерю данных по причинам, не зависящим от Системы, а также за
                    корректность данных, внесённых Пользователями.
                  </p>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>7. Срок действия и расторжение</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Соглашение вступает в силу с момента завершения регистрации и действует бессрочно.
                    Пользователь вправе в любой момент прекратить использование Системы, удалив свой аккаунт
                    и все связанные с ним организации.
                  </p>
                </section>

                <section>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 15 }}>8. Применимое право</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Настоящее соглашение составлено и регулируется законодательством Российской Федерации.
                    Все споры разрешаются в судебном порядке по месту нахождения администрации Системы.
                  </p>
                </section>

              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Вернуться к регистрации</button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
            ГБПОУ МКАГ - Дипломная работа - Пушков Н. М. - Группа ИСиП-3-22 - 2026
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen, TermsScreen };
