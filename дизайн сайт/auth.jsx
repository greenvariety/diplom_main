/* global React, AIS_DATA, AIS_UI */
const { I } = window.AIS_DATA;
const { useState } = React;

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('admin');
  return (
    <div className="login-wrap">
      <div className="login-side">
        <div className="brand-row"><div className="logo">У</div>Учёт студентов</div>
        <div className="login-pitch">
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 500, borderRadius: 999, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>АИС колледжа · v1.0</div>
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
          <div className="login-tip">
            <strong style={{ color: 'var(--text)' }}>Демо-доступы:</strong>
            <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
              <div><code>superadmin</code> · <code>admin</code> · <code>teacher1</code></div>
              <div className="muted">пароль: <code>password</code></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetupScreen() {
  const [step, setStep] = useState(1);
  return (
    <div className="login-wrap" style={{ gridTemplateColumns: '1fr' }}>
      <div className="login-form-wrap" style={{ padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>У</div>
            <div style={{ fontWeight: 600 }}>Учёт студентов</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: 32, height: 4, borderRadius: 2, background: s <= step ? 'var(--accent)' : 'var(--border)' }}></div>
            ))}
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Шаг {step} из 3</div>
              {step === 1 && <>
                <h2 style={{ marginBottom: 6 }}>Учётное заведение</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Эта информация будет использоваться в отчётах и заголовках документов.</p>
                <div className="form-grid">
                  <div className="field field-full"><label className="field-label">Полное название</label><input className="input" placeholder="Государственный колледж №…" /></div>
                  <div className="field"><label className="field-label">Сокращение</label><input className="input" placeholder="ГК-15" /></div>
                  <div className="field"><label className="field-label">Город</label><input className="input" /></div>
                </div>
              </>}
              {step === 2 && <>
                <h2 style={{ marginBottom: 6 }}>Создание суперадминистратора</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>Этот пользователь будет иметь полный доступ ко всем разделам системы.</p>
                <div className="form-grid">
                  <div className="field"><label className="field-label">Логин</label><input className="input" defaultValue="superadmin" /></div>
                  <div className="field"><label className="field-label">ФИО</label><input className="input" /></div>
                  <div className="field"><label className="field-label">Пароль</label><input className="input" type="password" /></div>
                  <div className="field"><label className="field-label">Повторите</label><input className="input" type="password" /></div>
                </div>
              </>}
              {step === 3 && <>
                <h2 style={{ marginBottom: 6 }}>Готово!</h2>
                <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Система настроена и готова к работе.</p>
                <div className="banner banner-ok">{I.check}<div className="banner-body"><strong>Учётная запись создана.</strong> Войдите, чтобы начать работу с системой.</div></div>
                <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Дальше: добавьте факультеты и группы, заведите сотрудников, начните вносить студентов.</p>
              </>}
            </div>
            <div className="modal-foot">
              {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>{I.back}Назад</button>}
              <div style={{ flex: 1 }}></div>
              {step < 3
                ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Дальше {I.chevr}</button>
                : <button className="btn btn-primary">{I.check}Перейти ко входу</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AIS_AUTH = { LoginScreen, SetupScreen };
