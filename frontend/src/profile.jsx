import { useState, useEffect } from 'react';
import { I } from './data.jsx';
import { PasswordRules, PasswordStrength, PasswordInput, FadingError, Field, LoadButton } from './utils.jsx';
import { CodeInput, RecoverPasswordScreen } from './auth.jsx';
import api from './api.js';

function daysSince(isoStr) {
  if (!isoStr) return null;
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 86400000);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return '1 день назад';
  if (diff < 5) return `${diff} дня назад`;
  return `${diff} дней назад`;
}

function TabBar({ tab, setTab, role }) {
  const canDelete = role === 'owner' || role === 'superadmin';
  const tabs = [
    { key: 'data',     label: 'Основные данные' },
    { key: 'password', label: 'Пароль' },
    { key: 'email',    label: 'Email' },
    ...(canDelete ? [{ key: 'delete', label: 'Удалить аккаунт', danger: true }] : []),
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
      {tabs.map(t => {
        const active = tab === t.key;
        const danger = t.danger;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 18px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              color: active ? (danger ? 'var(--bad-fg)' : 'var(--accent)') : (danger ? 'var(--bad-fg)' : 'var(--text-muted)'),
              borderBottom: active ? `2px solid ${danger ? 'var(--bad-fg)' : 'var(--accent)'}` : '2px solid transparent',
              marginBottom: -2,
              transition: 'color .15s',
              fontFamily: 'var(--font)',
              opacity: danger && !active ? 0.7 : 1,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Вкладка: Основные данные ───────────────────────────────── */
function TabData({ currentUser, onUserUpdated }) {
  const [name, setName] = useState(currentUser?.display_name || '');
  const [login, setLogin] = useState(currentUser?.username || '');
  const [errs, setErrs] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [saved, setSaved] = useState(false);

  const nameErr = !name.trim() ? 'Введите ФИО'
    : !/^[А-ЯЁа-яё\s\-]+$/.test(name.trim()) ? 'Только кириллица'
    : name.trim().split(/\s+/).filter(Boolean).length !== 3 ? 'Введите 3 слова (фамилия имя отчество)'
    : null;

  const loginErr = !login.trim() ? 'Введите логин'
    : login.length < 3 ? 'Минимум 3 символа'
    : !/^[A-Za-z0-9_.\-]+$/.test(login) ? 'Только латиница, цифры и _ . -'
    : null;

  const save = async () => {
    setErrs({ name: nameErr, login: loginErr });
    setServerErr('');
    if (nameErr || loginErr) return;

    const payload = {};
    if (name.trim() !== currentUser?.display_name) payload.display_name = name.trim();
    if (login.trim() !== currentUser?.username) payload.username = login.trim();

    if (!Object.keys(payload).length) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }

    try {
      const r = await api.patch('/me/update/', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onUserUpdated && onUserUpdated(r.data);
    } catch (e) {
      const data = e.response?.data;
      if (data?.field === 'username') setErrs(v => ({ ...v, login: data.error }));
      else if (data?.field === 'display_name') setErrs(v => ({ ...v, name: data.error }));
      else setServerErr(data?.error || 'Ошибка сохранения');
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <Field label="ФИО" error={errs.name}>
        <input
          className={`input ${errs.name ? 'is-error' : ''}`}
          value={name}
          onChange={e => { setName(e.target.value.replace(/[^А-ЯЁа-яё\s\-]/g, '')); setErrs(v => ({ ...v, name: null })); setSaved(false); }}
          onKeyDown={e => { if (e.key.length === 1 && !/[А-ЯЁа-яё\s\-]/.test(e.key)) e.preventDefault(); }}
          maxLength={150}
        />
      </Field>

      <Field label="Логин" error={errs.login} style={{ marginTop: 16 }}>
        <input
          className={`input ${errs.login ? 'is-error' : ''}`}
          value={login}
          onChange={e => { setLogin(e.target.value.replace(/[^A-Za-z0-9_.\-]/g, '')); setErrs(v => ({ ...v, login: null })); setSaved(false); }}
          onKeyDown={e => { if (e.key.length === 1 && !/[A-Za-z0-9_.\-]/.test(e.key)) e.preventDefault(); }}
          maxLength={20}
        />
      </Field>

      {serverErr && <div className="field-error" style={{ marginTop: 8 }}>{serverErr}</div>}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check} Сохранить</LoadButton>
        {saved && <span style={{ color: 'var(--ok-fg)', fontSize: 13, fontWeight: 500 }}>Сохранено</span>}
      </div>
    </div>
  );
}

/* ── Вкладка: Пароль ────────────────────────────────────────── */
function TabPassword({ currentUser, onShowRecover }) {
  const [cur, setCur] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [p2Touched, setP2Touched] = useState(false);
  const [curErr, setCurErr] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [saved, setSaved] = useState(false);

  const changedAt = currentUser?.password_changed_at;
  const changedLabel = changedAt ? daysSince(changedAt) : null;

  const p1Err = !p1 ? 'Введите новый пароль'
    : p1.length < 8 ? 'Минимум 8 символов'
    : !/\d/.test(p1) ? 'Нужна хотя бы одна цифра'
    : !/[A-Za-z]/.test(p1) ? 'Нужна хотя бы одна латинская буква'
    : !/[_\-!@#$%^&*+.,;:?]/.test(p1) ? 'Нужен хотя бы один спецсимвол'
    : null;
  const p2Err = !p2 ? 'Повторите пароль' : p1 !== p2 ? 'Пароли не совпадают' : null;
  const p2OK = p2 && p1 === p2;

  const save = async () => {
    setSubmitted(true);
    setP2Touched(true);
    setCurErr(''); setWrongPassword(false); setFormErr('');

    if (!cur) { setCurErr('Введите текущий пароль'); return; }
    if (p1Err) { setFormErr(p1Err); return; }
    if (p2Err) { setFormErr(p2Err); return; }

    try {
      const r = await api.post('/me/change-password/', { current_password: cur, new_password: p1 });
      localStorage.setItem('access_token', r.data.access);
      localStorage.setItem('refresh_token', r.data.refresh);
      setSaved(true);
      setCur(''); setP1(''); setP2('');
      setSubmitted(false); setP2Touched(false);
      setCurErr(''); setWrongPassword(false); setFormErr('');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.error || 'Ошибка смены пароля';
      if (data?.field === 'current_password') {
        setCurErr(msg);
        setWrongPassword(true);
      } else {
        setFormErr(msg);
      }
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {changedLabel && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {I.history}
          <span>Пароль последний раз изменён <strong style={{ color: 'var(--text)' }}>{changedLabel}</strong></span>
        </div>
      )}

      <div className="field">
        <label className="field-label">Текущий пароль</label>
        <PasswordInput
          value={cur}
          onChange={v => { setCur(v); setCurErr(''); setWrongPassword(false); setFormErr(''); setSaved(false); }}
          onBlur={() => { if (!cur) setCurErr('Введите текущий пароль'); }}
          hasError={!!curErr}
          autoComplete="current-password"
        />
        {curErr && (
          <div className="field-error" style={{ marginTop: 4 }}>
            {I.alert}{curErr}
            {wrongPassword && (
              <span style={{ marginLeft: 8 }}>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); onShowRecover && onShowRecover(); }}
                  style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 500 }}
                >
                  Забыли пароль?
                </a>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label">Новый пароль</label>
        <PasswordInput
          value={p1}
          onChange={v => { setP1(v); setFormErr(''); setSaved(false); }}
          onFocus={() => setPwFocus(true)}
          onBlur={() => setPwFocus(false)}
          hasError={!!(submitted && p1Err)}
          autoComplete="new-password"
        />
        <PasswordRules value={p1} show={pwFocus || !!p1} />
        {p1 && <PasswordStrength value={p1} />}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label">Повторите новый пароль</label>
        <PasswordInput
          value={p2}
          onChange={v => { setP2(v); setP2Touched(true); setFormErr(''); setSaved(false); }}
          onBlur={() => setP2Touched(true)}
          hasError={!!(p2Touched && p2Err)}
          autoComplete="new-password"
        />
        {p2Touched && p2OK && (
          <div className="pw-rule ok" style={{ marginTop: 6, fontSize: 12 }}>
            <span className="pw-mark"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
            Пароли совпадают
          </div>
        )}
        {p2Touched && p2Err && <div className="field-error" style={{ marginTop: 4 }}>{p2Err}</div>}
      </div>

      {formErr && (
        <div className="field-error" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8 }}>
          {I.alert}{formErr}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check} Сменить пароль</LoadButton>
        {saved && <span style={{ color: 'var(--ok-fg)', fontSize: 13, fontWeight: 500 }}>Пароль изменён</span>}
      </div>
    </div>
  );
}

/* ── Вкладка: Email ─────────────────────────────────────────── */
function TabEmail({ currentUser, onUserUpdated }) {
  const [newEmail, setNewEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeKey, setCodeKey] = useState(0);
  const [codeErr, setCodeErr] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [saved, setSaved] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    const v = newEmail.trim().toLowerCase();
    if (!v) { setEmailErr('Введите новый email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailErr('Некорректный email'); return; }
    setSendLoading(true);
    try {
      const r = await api.post('/me/change-email/', { new_email: v });
      setMaskedEmail(r.data.masked_email);
      setCooldown(60);
      setStep('code');
    } catch (e) {
      const data = e.response?.data;
      const retryAfter = data?.retry_after;
      if (retryAfter) setCooldown(retryAfter);
      setEmailErr(data?.error || 'Ошибка отправки');
    } finally {
      setSendLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setSendLoading(true);
    try {
      const r = await api.post('/me/change-email/', { new_email: newEmail.trim().toLowerCase() });
      setMaskedEmail(r.data.masked_email);
      setCooldown(60);
      setCode('');
      setCodeKey(k => k + 1);
      setCodeErr('');
    } catch (e) {
      const data = e.response?.data;
      const retryAfter = data?.retry_after;
      if (retryAfter) setCooldown(retryAfter);
      setCodeErr(data?.error || 'Ошибка отправки');
    } finally {
      setSendLoading(false);
    }
  };

  const confirmCode = async () => {
    if (code.length !== 6) { setCodeErr('Введите все 6 символов'); return; }
    try {
      const r = await api.post('/me/confirm-email/', { code: code.toUpperCase() });
      setSaved(true);
      setStep('form');
      setNewEmail('');
      onUserUpdated && onUserUpdated({ email: r.data.email });
      setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      const data = e.response?.data;
      setCodeErr(data?.error || 'Неверный код');
      if (data?.need_resend) setCooldown(0);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Текущий email</div>
        <div style={{ fontWeight: 500 }}>{currentUser?.email || <span style={{ color: 'var(--text-faint)' }}>Не указан</span>}</div>
      </div>

      {saved && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--ok-soft, #d1fae5)', color: 'var(--ok-fg)', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
          Email успешно изменён
        </div>
      )}

      {step === 'form' ? (
        <>
          <Field label="Новый email" error={emailErr}>
            <input
              className={`input ${emailErr ? 'is-error' : ''}`}
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setEmailErr(''); }}
            />
          </Field>
          <div style={{ marginTop: 16 }}>
            <LoadButton className="btn btn-primary" onClick={sendCode} disabled={sendLoading}>
              {I.mail} Получить код на новый email
            </LoadButton>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Код отправлен на <strong>{maskedEmail}</strong>. Введите его ниже. Код действителен 10 минут.
          </p>
          <Field label="Код из письма" error={codeErr}>
            <CodeInput key={codeKey} onChange={v => { setCode(v); setCodeErr(''); }} hasError={!!codeErr} autoFocus />
          </Field>
          {codeErr && <div className="field-error" style={{ marginTop: 4 }}>{codeErr}</div>}

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <LoadButton className="btn btn-primary" onClick={confirmCode}>{I.check} Подтвердить</LoadButton>
            <button
              className="btn btn-secondary btn-sm"
              disabled={cooldown > 0 || sendLoading}
              onClick={resend}
              style={{ fontSize: 12 }}
            >
              {cooldown > 0 ? `Отправить снова (${cooldown} сек.)` : 'Отправить снова'}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setStep('form'); setCodeErr(''); setCode(''); }}
              style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {I.back} Изменить email
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Вкладка: Удалить аккаунт ───────────────────────────────── */
function TabDeleteAccount({ currentUser, onLogout }) {
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p1Err, setP1Err] = useState('');
  const [p2Err, setP2Err] = useState('');
  const [serverErr, setServerErr] = useState('');
  const [code, setCode] = useState('');
  const [codeKey, setCodeKey] = useState(0);
  const [codeErr, setCodeErr] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setP1Err('');
    setP2Err('');
    setServerErr('');
    if (!p1) { setP1Err('Введите пароль'); return; }
    if (!p2) { setP2Err('Повторите пароль'); return; }
    if (p1 !== p2) { setP2Err('Пароли не совпадают'); return; }
    setSending(true);
    try {
      const r = await api.post('/me/delete-account/send-code/', { password: p1 });
      setMaskedEmail(r.data.masked_email);
      setCooldown(60);
      setStep('code');
    } catch (e) {
      const data = e.response?.data;
      if (data?.retry_after) setCooldown(data.retry_after);
      if (data?.field === 'password') setP1Err(data.error);
      else setServerErr(data?.error || 'Ошибка отправки кода');
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setSending(true);
    try {
      const r = await api.post('/me/delete-account/send-code/', { password: p1 });
      setMaskedEmail(r.data.masked_email);
      setCooldown(60);
      setCode('');
      setCodeKey(k => k + 1);
      setCodeErr('');
    } catch (e) {
      const data = e.response?.data;
      if (data?.retry_after) setCooldown(data.retry_after);
      setCodeErr(data?.error || 'Ошибка отправки кода');
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (code.length !== 6) { setCodeErr('Введите все 6 символов'); return; }
    try {
      await api.post('/me/delete-account/confirm/', { code: code.toUpperCase() });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      onLogout && onLogout();
    } catch (e) {
      const data = e.response?.data;
      setCodeErr(data?.error || 'Неверный код');
      if (data?.need_resend) setCooldown(0);
    }
  };

  if (step === 'code') {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
          <strong>Аккаунт будет удален безвозвратно.</strong> После подтверждения восстановление невозможно.
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Код отправлен на <strong>{maskedEmail}</strong>. Введите его ниже. Код действителен 10 минут.
        </p>
        <Field label="Код из письма" error={codeErr}>
          <CodeInput key={codeKey} onChange={v => { setCode(v); setCodeErr(''); }} hasError={!!codeErr} autoFocus />
        </Field>
        {codeErr && <div className="field-error" style={{ marginTop: 4 }}>{codeErr}</div>}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <LoadButton className="btn btn-danger-solid" onClick={confirmDelete}>
            {I.trash} Удалить аккаунт навсегда
          </LoadButton>
          <button
            className="btn btn-secondary btn-sm"
            disabled={cooldown > 0 || sending}
            onClick={resend}
            style={{ fontSize: 12 }}
          >
            {cooldown > 0 ? `Отправить снова (${cooldown} сек.)` : 'Отправить снова'}
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('form'); setCodeErr(''); setCode(''); }}
            style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {I.back} Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 20, padding: '16px 18px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
        <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 8, fontSize: 14 }}>
          {I.alert} Внимание - это действие необратимо
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#7f1d1d', fontSize: 13, lineHeight: 1.7 }}>
          <li>Ваш аккаунт будет удален без возможности восстановления</li>
          <li>Все ваши организации и все их данные будут удалены: факультеты, группы, студенты, сотрудники, должности, опекуны, предметы, документы</li>
          <li>Аккаунты сотрудников, привязанных к вашим организациям, останутся, но потеряют привязку</li>
          <li>Вы немедленно будете выведены из системы</li>
          <li>Войти с этим логином или email будет невозможно</li>
        </ul>
      </div>

      <Field label="Пароль" error={p1Err}>
        <PasswordInput
          value={p1}
          onChange={v => { setP1(v); setP1Err(''); setServerErr(''); }}
          hasError={!!p1Err}
          autoComplete="current-password"
        />
      </Field>

      <Field label="Подтвердите пароль" error={p2Err} style={{ marginTop: 16 }}>
        <PasswordInput
          value={p2}
          onChange={v => { setP2(v); setP2Err(''); setServerErr(''); }}
          hasError={!!p2Err}
          autoComplete="current-password"
        />
      </Field>

      {serverErr && <div className="field-error" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8 }}>{I.alert}{serverErr}</div>}

      <div style={{ marginTop: 20 }}>
        <LoadButton className="btn btn-danger-solid" onClick={sendCode} disabled={sending}>
          Получить код подтверждения
        </LoadButton>
      </div>
    </div>
  );
}

/* ── Основной компонент ─────────────────────────────────────── */
function ProfileScreen({ currentUser: initUser, onNavigate, onUserUpdated, onLogout }) {
  const [tab, setTab] = useState('data');
  const [user, setUser] = useState(initUser);
  const [showRecover, setShowRecover] = useState(false);

  const handleUpdated = (data) => {
    setUser(u => ({ ...u, ...data }));
    onUserUpdated && onUserUpdated(data);
  };

  const goBack = () => onNavigate(user?.institution ? 'dashboard' : 'org-picker');

  if (showRecover) {
    return (
      <RecoverPasswordScreen
        onBack={() => setShowRecover(false)}
        onDone={() => { setShowRecover(false); }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <img src="/logo.png" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%' }} alt="" />
          <div style={{ fontWeight: 600 }}>АИСК</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={goBack}>{I.back} Назад</button>
          </div>
        </div>

        <div className="card screen-fade-in">
          <div className="card-body" style={{ padding: '24px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Мой профиль</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user?.display_name || user?.username}</div>
            </div>
            <TabBar tab={tab} setTab={setTab} role={user?.role} />
            {tab === 'data'     && <TabData     currentUser={user} onUserUpdated={handleUpdated} />}
            {tab === 'password' && <TabPassword currentUser={user} onShowRecover={() => setShowRecover(true)} />}
            {tab === 'email'    && <TabEmail    currentUser={user} onUserUpdated={handleUpdated} />}
            {tab === 'delete'   && <TabDeleteAccount currentUser={user} onLogout={onLogout} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProfileScreen };
