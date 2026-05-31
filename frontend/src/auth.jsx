import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from './api.js';
import { I } from './data.jsx';
import { PasswordRules, PasswordStrength, PasswordInput, FadingError, Field, LoadButton, pwStrength } from './utils.jsx';

/* ============================================================
   LoginScreen
   ============================================================ */
function LoginScreen({ onLogin, onRegister, onRecover }) {
  const [user, setUser]   = useState('');
  const [pass, setPass]   = useState('');
  const [errs, setErrs]   = useState({});
  const [touched, setTouched] = useState({});
  const [loginError, setLoginError] = useState('');

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
      return;
    }
    try {
      const res = await axios.post('/api/auth/login/', { username: user, password: pass });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      onLogin && onLogin(res.data.user);
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка входа';
      setLoginError(msg);
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
                onChange={e => { setUser(e.target.value.replace(/[А-ЯЁа-яё]/g, '')); if (loginError) setLoginError(''); }}
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
              onChange={v => { setPass(v); if (loginError) setLoginError(''); }}
              onBlur={() => onBlur('pass')}
              hasError={touched.pass && !!errs.pass}
              autoComplete="current-password"
            />
          </Field>

          {loginError && <div className="field-error" style={{ marginTop: 4 }}>{loginError}</div>}
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
function RegisterScreen({ onDone, onBack, initialVals }) {
  const [vals, setVals] = useState(initialVals || { login: '', name: '', email: '', pass: '', pass2: '' });
  const [touched, setTouched] = useState({});
  const [pwFocus, setPwFocus] = useState(false);
  const [pw2Touched, setPw2Touched] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [serverErrs, setServerErrs] = useState({});
  const [submitError, setSubmitError] = useState('');
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const checkField = async (field, value) => {
    if (!value) return;
    try {
      const r = await axios.post('/api/auth/check-availability/', { field, value });
      if (r.data.taken) {
        setServerErrs(s => ({ ...s, [field]: r.data.error }));
      }
    } catch {}
  };

  if (showTerms) {
    return <TermsScreen onBack={() => setShowTerms(false)} />;
  }

  const errs = {};
  if (!vals.login.trim()) errs.login = 'Введите логин';
  else if (vals.login.length < 3) errs.login = 'Минимум 3 символа';
  else if (!/^[A-Za-z0-9_.\-]+$/.test(vals.login.trim())) errs.login = 'Только латиница, цифры и символы _ . -';
  if (!vals.name.trim()) errs.name = 'Укажите ФИО';
  else if (!/^[А-ЯЁа-яё\s]+$/.test(vals.name.trim())) errs.name = 'Только кириллица, без спецсимволов';
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
    if (Object.keys(errs).length || serverErrs.login || serverErrs.email) {
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
      onDone && onDone({ maskedEmail: res.data.masked_email, login: vals.login, formVals: vals });
    } catch (err) {
      const data = err.response?.data;
      if (data?.field === 'login') {
        setServerErrs(s => ({ ...s, login: data.error }));
        setTouched(t => ({ ...t, login: 1 }));
      } else if (data?.field === 'email') {
        setServerErrs(s => ({ ...s, email: data.error }));
        setTouched(t => ({ ...t, email: 1 }));
      } else {
        setSubmitError(data?.error || 'Ошибка регистрации');
      }
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
                <div>
                  <Field
                    label="Логин" required
                    error={touched.login && errs.login}
                    hint={touched.login && vals.login && !errs.login && !serverErrs.login ? 'Доступен только вам' : null}
                    success={!!(touched.login && vals.login && !errs.login && !serverErrs.login)}
                  >
                    <input className={`input ${(touched.login && errs.login) || serverErrs.login ? 'is-error' : ''}`}
                      value={vals.login}
                      onChange={e => { set('login', e.target.value.replace(/[^A-Za-z0-9_.\-]/g, '')); setServerErrs(s => ({ ...s, login: null })); }}
                      onKeyDown={e => { if (e.key.length === 1 && !/[A-Za-z0-9_.\-]/.test(e.key)) e.preventDefault(); }}
                      onBlur={() => {
                        setTouched(t => ({ ...t, login: 1 }));
                        const v = vals.login.trim();
                        if (v.length >= 3 && /^[A-Za-z0-9_.\-]+$/.test(v)) checkField('login', v);
                      }}
                      maxLength={20}
                    />
                  </Field>
                  {serverErrs.login && <div className="field-error">{serverErrs.login}</div>}
                </div>
                <Field
                  label="ФИО" required
                  error={touched.name && errs.name}
                  hint={touched.name && vals.name && !errs.name ? 'Отображается в системе' : null}
                  success={!!(touched.name && vals.name && !errs.name)}
                >
                  <input className={`input ${touched.name && errs.name ? 'is-error' : ''}`}
                    value={vals.name}
                    onChange={e => set('name', e.target.value.replace(/[^А-ЯЁа-яё\s]/g, ''))}
                    onKeyDown={e => { if (e.key.length === 1 && !/[А-ЯЁа-яё\s]/.test(e.key)) e.preventDefault(); }}
                    onPaste={e => {
                      e.preventDefault();
                      const inp = e.target;
                      const clean = (e.clipboardData.getData('text') || '').replace(/[^А-ЯЁа-яё\s]/g, '');
                      set('name', inp.value.slice(0, inp.selectionStart) + clean + inp.value.slice(inp.selectionEnd));
                    }}
                    onBlur={() => setTouched(t => ({ ...t, name: 1 }))}
                    maxLength={150}
                  />
                </Field>

                <div className="field field-full">
                  <label className="field-label">Email<span className="req">*</span></label>
                  <input
                    className={`input ${(touched.email && errs.email) || serverErrs.email ? 'is-error' : ''}`}
                    type="email"
                    value={vals.email}
                    onChange={e => { set('email', e.target.value); setServerErrs(s => ({ ...s, email: null })); }}
                    onBlur={() => {
                      setTouched(t => ({ ...t, email: 1 }));
                      const v = vals.email.trim();
                      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) checkField('email', v.toLowerCase());
                    }}
                    autoComplete="email"
                  />
                  <FadingError error={touched.email && errs.email ? errs.email : null} />
                  {serverErrs.email && <div className="field-error">{serverErrs.email}</div>}
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
              {submitError && <div className="field-error" style={{ marginTop: 12 }}>{submitError}</div>}
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
  const cellsRef = useRef(['', '', '', '', '', '']);
  const moving = useRef(false);

  const updateCells = (arr) => {
    cellsRef.current = arr;
    setCells(arr);
    onChange(arr.join(''));
  };

  const focusAt = (i) => {
    const el = refs.current[i];
    if (el) {
      moving.current = true;
      el.focus();
      el.select();
    }
  };

  const handleFocus = (idx) => {
    // If focus was moved programmatically (via focusAt), skip the redirect logic
    if (moving.current) { moving.current = false; return; }
    const firstEmpty = cellsRef.current.findIndex(c => !c);
    if (firstEmpty !== -1 && firstEmpty < idx) {
      setTimeout(() => focusAt(firstEmpty), 0);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = [...cellsRef.current];
      if (arr[idx]) {
        arr[idx] = '';
        updateCells(arr);
      } else if (idx > 0) {
        arr[idx - 1] = '';
        updateCells(arr);
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
    const arr = [...cellsRef.current];
    arr[idx] = clean[clean.length - 1];
    updateCells(arr);
    if (idx < 5) focusAt(idx + 1);
  };

  const handlePaste = (idx, e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6 - idx);
    if (!pasted) return;
    const arr = [...cellsRef.current];
    pasted.split('').forEach((c, i) => { if (idx + i < 6) arr[idx + i] = c; });
    updateCells(arr);
    focusAt(Math.min(idx + pasted.length, 5));
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {cells.map((ch, idx) => (
        <React.Fragment key={idx}>
          {idx === 3 && (
            <span style={{ fontSize: 24, fontWeight: 300, color: 'var(--text-muted)', userSelect: 'none', marginInline: 2 }}>-</span>
          )}
          <input
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
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================================================
   EmailVerifyScreen
   ============================================================ */
function EmailVerifyScreen({ maskedEmail, login, onDone, onBack }) {
  const [code, setCode] = useState('');
  const [codeKey, setCodeKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    setSubmitted(true);
    if (code.trim().length !== 6) {
      setCodeError('Введите все 6 символов');
      return;
    }
    try {
      const res = await axios.post('/api/auth/verify-email/', {
        login,
        code: code.trim().toUpperCase(),
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      onDone && onDone(res.data.user);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || 'Неверный код';
      if (err.response?.status === 429) setIsBlocked(true);
      setCodeError(msg);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await axios.post('/api/auth/resend-register-code/', { login });
      setCooldown(60);
      setCode('');
      setCodeKey(k => k + 1);
      setSubmitted(false);
      setCodeError('');
    } catch (err) {
      const retryAfter = err.response?.data?.retry_after;
      const msg = err.response?.data?.error || 'Ошибка отправки';
      if (err.response?.status === 429) setIsBlocked(true);
      if (retryAfter) setCooldown(retryAfter);
      setCodeError(msg);
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

              <Field label="Код подтверждения" required error={submitted && code.length !== 6 ? 'Введите все 6 символов' : null}>
                <CodeInput key={codeKey} onChange={(v) => { setCode(v); if (submitted) setSubmitted(false); if (codeError && !isBlocked) setCodeError(''); }} hasError={submitted && code.length !== 6} autoFocus />
              </Field>
              {codeError && (
                <div className="field-error" style={{ marginTop: 4 }}>{codeError}</div>
              )}

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Не пришёл код?</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 13, minWidth: 160 }}
                  disabled={cooldown > 0 || resending || isBlocked}
                  onClick={resend}
                >
                  {isBlocked
                    ? 'Недоступно'
                    : cooldown > 0
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
  const [step, setStep] = useState(1);
  const [login, setLogin] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeKey, setCodeKey] = useState(0);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [touched, setTouched] = useState({});
  const [pwFocus, setPwFocus] = useState(false);
  const [p1Touched, setP1Touched] = useState(false);
  const [pw2Touched, setPw2Touched] = useState(false);
  const [sendError, setSendError] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [recentlyChanged, setRecentlyChanged] = useState(false);
  const [recentlyChangedMsg, setRecentlyChangedMsg] = useState('');

  const p1Err = !p1 ? 'Введите пароль'
    : p1.length < 8 ? 'Минимум 8 символов'
    : !/\d/.test(p1) ? 'Нужна хотя бы одна цифра'
    : !/[A-Za-z]/.test(p1) ? 'Нужна хотя бы одна латинская буква'
    : !/[_\-!@#$%^&*+.,;:?]/.test(p1) ? 'Нужен хотя бы один спецсимвол'
    : null;
  const p2Err = !p2 ? 'Повторите пароль' : p1 !== p2 ? 'Пароли не совпадают' : null;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setTouched({ all: 1 });
    if (!login.trim()) {
      setSendError('Введите логин');
      return;
    }
    try {
      const res = await axios.post('/api/auth/recover/send-code/', { login: login.trim() });
      setMaskedEmail(res.data.masked_email);
      setCooldown(60);
      setStep(2);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429 && data?.recently_changed) {
        setRecentlyChanged(true);
        setRecentlyChangedMsg(data.error);
        setMaskedEmail('');
        setStep(2);
        return;
      }
      setSendError(data?.error || 'Ошибка отправки кода');
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await axios.post('/api/auth/recover/send-code/', { login: login.trim() });
      setCooldown(60);
      setCode('');
      setCodeKey(k => k + 1);
      setRecoverError('');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429 && data?.recently_changed) {
        setRecentlyChanged(true);
        setRecentlyChangedMsg(data.error);
        return;
      }
      const retryAfter = data?.retry_after;
      const msg = data?.error || 'Ошибка отправки';
      if (err.response?.status === 429) setIsBlocked(true);
      if (retryAfter) setCooldown(retryAfter);
      setRecoverError(msg);
    } finally {
      setResending(false);
    }
  };

  const submit = async () => {
    setTouched({ all: 1 });
    setP1Touched(true);
    setPw2Touched(true);
    if (code.trim().length !== 6 || p1Err || p2Err) {
      return;
    }
    try {
      const res = await axios.post('/api/auth/recover/', {
        login: login.trim(),
        code: code.trim().toUpperCase(),
        new_password: p1,
      });
      onDone && onDone();
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка восстановления';
      if (err.response?.status === 429) setIsBlocked(true);
      setRecoverError(msg);
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
            /* шаг 1 */
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <h2 style={{ marginBottom: 6 }}>Восстановление пароля</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Введите ваш логин. Мы отправим код восстановления на привязанный email.</p>

                <Field label="Логин" required error={touched.all && !login.trim() ? 'Введите логин' : null}>
                  <input
                    className={`input ${touched.all && !login.trim() ? 'is-error' : ''}`}
                    value={login}
                    onChange={e => { setLogin(e.target.value); if (sendError) setSendError(''); }}
                    onKeyDown={e => { if (e.key.length === 1 && /[А-ЯЁа-яё]/i.test(e.key)) e.preventDefault(); }}
                    maxLength={150}
                    autoFocus
                  />
                </Field>
                {sendError && <div className="field-error" style={{ marginTop: 8 }}>{sendError}</div>}
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Назад</button>
                <div style={{ flex: 1 }}></div>
                <LoadButton className="btn btn-primary" onClick={sendCode}>Получить код {I.chevr}</LoadButton>
              </div>
            </div>
          ) : recentlyChanged ? (
            /* шаг 2 — недавно меняли пароль */
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <h2 style={{ marginBottom: 6 }}>Восстановление пароля</h2>
                <div className="field-error" style={{ marginTop: 12, padding: '14px 16px', borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                  {recentlyChangedMsg}
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => { setStep(1); setRecentlyChanged(false); setRecentlyChangedMsg(''); setSendError(''); }}>{I.back}Назад</button>
              </div>
            </div>
          ) : (
            /* шаг 2 — обычная форма */
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <h2 style={{ marginBottom: 6 }}>Введите код и новый пароль</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
                  Код отправлен на <strong>{maskedEmail}</strong>. Введите его и задайте новый пароль.
                </p>

                <Field label="Код из письма" required>
                  <CodeInput key={codeKey} onChange={setCode} hasError={touched.all && code.length !== 6} autoFocus />
                </Field>

                <div className="field field-full" style={{ marginTop: 16 }}>
                  <label className="field-label">Новый пароль<span className="req">*</span></label>
                  <PasswordInput
                    value={p1}
                    onChange={(v) => setP1(v)}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => { setPwFocus(false); setP1Touched(true); }}
                    hasError={(p1Touched || touched.all) && !!p1Err}
                  />
                  <FadingError error={(p1Touched || touched.all) && !p1 ? p1Err : null} />
                  <PasswordRules value={p1} show={pwFocus || !!p1} />
                  {p1 && <PasswordStrength value={p1} />}
                </div>

                <div className="field field-full">
                  <label className="field-label">Повторите пароль<span className="req">*</span></label>
                  <PasswordInput
                    value={p2}
                    onChange={(v) => { setP2(v); setPw2Touched(true); }}
                    onBlur={() => setPw2Touched(true)}
                    hasError={(pw2Touched || touched.all) && !!p2Err}
                  />
                  {(pw2Touched || touched.all) && p2 && p1 === p2 && (
                    <div className="pw-rule ok" style={{ marginTop: 6, fontSize: 12 }}>
                      <span className="pw-mark"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                      Пароли совпадают
                    </div>
                  )}
                  <FadingError error={(pw2Touched || touched.all) && p2Err ? p2Err : null} />
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Не пришёл код?</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: 13, minWidth: 160 }}
                    disabled={cooldown > 0 || resending || isBlocked}
                    onClick={resend}
                  >
                    {isBlocked
                      ? 'Недоступно'
                      : cooldown > 0
                        ? `Отправить снова (${cooldown} сек.)`
                        : resending ? 'Отправляем...' : 'Отправить снова'}
                  </button>
                </div>
                {recoverError && <div className="field-error" style={{ marginTop: 8 }}>{recoverError}</div>}
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => { setStep(1); setRecentlyChanged(false); setRecentlyChangedMsg(''); }}>{I.back}Назад</button>
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

/* ============================================================
   OrgSetupScreen - шаг 3 регистрации: создание организации
   ============================================================ */
function OrgSetupScreen({ onDone }) {
  const [vals, setVals] = useState({ name: '', code: '', date: '' });
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const errs = {};
  if (!vals.name.trim()) errs.name = 'Введите название организации';
  if (!vals.code.trim()) errs.code = 'Введите аббревиатуру';
  if (!vals.date.trim()) errs.date = 'Укажите дату основания';

  const submit = async () => {
    setTouched({ name: 1, code: 1, date: 1 });
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setErr('');
    try {
      await api.post('/organizations/', { name: vals.name.trim(), code: vals.code.trim(), founded_date: vals.date.trim() });
      onDone && onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при создании организации');
      setSubmitting(false);
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
            <div className="step is-done"><div className="step-num">{I.check}</div>Подтверждение Email</div>
            <div className="step-bar"></div>
            <div className="step is-active"><div className="step-num">3</div>Организация</div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Настройка организации</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Заполните основные данные вашего учебного заведения. Это можно изменить позже.</p>

              <Field label="Название организации" required error={touched.name && errs.name}>
                <input
                  className={`input ${touched.name && errs.name ? 'is-error' : ''}`}
                  value={vals.name}
                  onBeforeInput={e => { if (e.data && /[A-Za-z]/.test(e.data)) e.preventDefault(); }}
                  onPaste={e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[A-Za-z]/g, ''); set('name', vals.name + t); }}
                  onChange={e => set('name', e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, name: 1 }))}
                  maxLength={1000}
                  autoFocus
                />
              </Field>

              <Field label="Аббревиатура" required error={touched.code && errs.code}>
                <input
                  className={`input ${touched.code && errs.code ? 'is-error' : ''}`}
                  value={vals.code}
                  onChange={e => set('code', e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, code: 1 }))}
                  maxLength={50}
                />
              </Field>

              <Field label="Дата основания" required error={touched.date && errs.date}>
                <input
                  type="date"
                  className={`input ${touched.date && errs.date ? 'is-error' : ''}`}
                  value={vals.date}
                  onChange={e => set('date', e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, date: 1 }))}
                />
              </Field>

              {err && <div className="field-error" style={{ marginTop: 8 }}>{err}</div>}
            </div>
            <div className="modal-foot">
              <div style={{ flex: 1 }}></div>
              <LoadButton className="btn btn-primary" onClick={submit} disabled={submitting}>
                {I.check} Создать и войти
              </LoadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen, TermsScreen, CodeInput, OrgSetupScreen };
