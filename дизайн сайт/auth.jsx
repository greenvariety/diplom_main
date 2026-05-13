/* global React, AIS_DATA, AIS_UI */
const { I } = window.AIS_DATA;
const { useState } = React;

function LoginScreen({ onLogin, onRegister, onRecover }) {
  const [user, setUser] = useState('owner1');
  return (
    <div className="login-wrap">
      <div className="login-side">
        <div className="brand-row"><div className="logo">У</div>Учёт студентов</div>
        <div className="login-pitch">
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 500, borderRadius: 999, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>АИС колледжа · v2.0</div>
          <h1>Один источник правды о студентах, сотрудниках и группах.</h1>
          <p>Замена бумажных журналов и Excel-таблиц. Личные данные, статусы, перевод и отчисление, документы, журнал изменений — всё в одном месте.</p>
        </div>
        <div className="login-foot">© Колледж · Дипломная работа · 2026</div>
        <div className="login-art"></div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={e => { e.preventDefault(); onLogin && onLogin(user); }}>
          <h2>Вход в систему</h2>
          <div className="sub">Введите логин и пароль для продолжения</div>
          <div className="field">
            <label className="field-label">Логин</label>
            <div className="input-with-icon">{I.user}<input className="input" defaultValue={user} onChange={e => setUser(e.target.value)} /></div>
          </div>
          <div className="field">
            <label className="field-label">Пароль</label>
            <input className="input" type="password" defaultValue="••••••••" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <input type="checkbox" /> Запомнить меня на этом устройстве
          </label>
          <button className="login-btn" type="submit">Войти</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 10 }}>
            <a href="#" onClick={e => { e.preventDefault(); onRegister && onRegister(); }} style={{ color: 'var(--accent)', fontWeight: 500 }}>Зарегистрироваться</a>
            <a href="#" onClick={e => { e.preventDefault(); onRecover && onRecover(); }} style={{ color: 'var(--text-muted)' }}>Восстановить через сид-фразу</a>
          </div>
          <div className="login-tip">
            <strong style={{ color: 'var(--text)' }}>Демо-доступы:</strong>
            <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
              <div><code>owner1</code> · <code>admin1</code> · <code>teacher1</code></div>
              <div className="muted">пароль: <code>demo_1234</code></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function RegisterScreen({ onDone, onBack }) {
  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Регистрация владельца</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Создайте аккаунт. После регистрации вы получите сид-фразу для восстановления пароля — сохраните её в надёжном месте.</p>
              <div className="form-grid">
                <div className="field field-full">
                  <label className="field-label">Логин</label>
                  <input className="input" placeholder="owner1" />
                </div>
                <div className="field field-full">
                  <label className="field-label">Имя (отображается в системе)</label>
                  <input className="input" placeholder="Иванов Иван Иванович" />
                </div>
                <div className="field">
                  <label className="field-label">Пароль</label>
                  <input className="input" type="password" placeholder="••••••••" />
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Минимум 8 символов, буквы + цифры</div>
                </div>
                <div className="field">
                  <label className="field-label">Повторите пароль</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Войти</button>
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-primary" onClick={() => onDone && onDone()}>Зарегистрироваться {I.chevr}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SEED_WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident'];

function SeedPhraseScreen({ onDone }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <div className="banner banner-bad" style={{ marginBottom: 20 }}>
                {I.alert}
                <div className="banner-body"><strong>Запишите эти 12 слов!</strong> Они показываются только один раз. Без сид-фразы восстановить пароль невозможно.</div>
              </div>
              <h2 style={{ marginBottom: 16 }}>Ваша сид-фраза</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {SEED_WORDS.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 18, fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{w}</span>
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
              <button className="btn btn-primary" disabled={!confirmed} onClick={() => onDone && onDone()} style={{ opacity: confirmed ? 1 : 0.5 }}>Продолжить {I.chevr}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoverPasswordScreen({ onBack }) {
  const words = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 6 }}>Восстановление пароля</h2>
              <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Введите логин и все 12 слов вашей сид-фразы, затем задайте новый пароль.</p>
              <div className="field" style={{ marginBottom: 16 }}>
                <label className="field-label">Логин</label>
                <input className="input" placeholder="owner1" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {words.map(n => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 18, fontFamily: 'var(--font-mono)' }}>{n}.</span>
                    <input className="input" style={{ fontSize: 12, padding: '6px 8px' }} placeholder={`слово ${n}`} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Новый пароль</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
                <div className="field">
                  <label className="field-label">Повторите</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => onBack && onBack()}>{I.back}Войти</button>
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-primary">{I.check}Сменить пароль</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AIS_AUTH = { LoginScreen, RegisterScreen, SeedPhraseScreen, RecoverPasswordScreen };
