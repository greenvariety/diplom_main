import { useState, useMemo, useEffect } from 'react';
import { STATUSES, STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, ORGS, I } from './data.jsx';
import { Shell, PageHead, Badge, Avatar } from './shell.jsx';
import { StatNumber, useToast, useDropdown, Field, EmptyState, SkeletonRows, LoadButton, Combobox, Pager, usePager, useSortable, SortHeader } from './utils.jsx';
import api from './api.js';

/* ============================================================
   Dashboards
   ============================================================ */

function Stat({ label, value, icon, trend }) {
  return (
    <div className="stat">
      <div className="stat-label">{icon}{label}</div>
      <div className="stat-value"><StatNumber value={value} /></div>
      {trend && <div className={`stat-trend ${trend.up ? 'up' : ''}`}>{trend.up && I.arrowU}{trend.text}</div>}
    </div>
  );
}

function DashboardOwner({ currentUser, onNavigate, onLogout, openModal }) {
  const [dashData, setDashData] = useState(null);
  const [q, setQ] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const sort = useSortable({ key: 'ts', dir: 'desc' }, 'owner-dash-audit');

  useEffect(() => {
    api.get('/dashboard/').then(r => setDashData(r.data)).catch(() => {});
  }, []);

  const stats = dashData?.stats || {};
  const ALL_AUDIT = dashData?.recent_audit || [];

  const filtered = useMemo(() => {
    return ALL_AUDIT.filter(a => {
      if (q && !`${a.obj} ${a.user} ${a.userName}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (userFilter && a.user !== userFilter) return false;
      if (actionFilter && a.action !== actionFilter) return false;
      return true;
    });
  }, [q, userFilter, actionFilter, ALL_AUDIT]);

  const sorted = sort.sortFn(filtered, {
    ts: a => a.ts,
    user: a => a.user,
    action: a => a.label,
    obj: a => a.obj,
  });

  const pager = usePager(sorted.length, { key: 'owner-dash-audit', defaultSize: 10 });
  const rows = pager.slice(sorted);

  const userOpts = useMemo(() => {
    const map = new Map();
    ALL_AUDIT.forEach(a => map.set(a.user, { value: a.user, label: a.user, sub: a.role }));
    return Array.from(map.values());
  }, [ALL_AUDIT]);

  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} onLogout={onLogout} openModal={openModal}>
      <PageHead
        title="Дашборд"
        sub="Сводка по системе"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Экспорт в Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal && openModal('studentForm')}>{I.plus}Добавить</button>
        </>}
      />
      {!currentUser?.institution && (
        <div className="banner banner-warn">
          {I.building}
          <div className="banner-body">
            <strong>Организация не выбрана.</strong> Выберите или создайте организацию для начала работы.{' '}
            <a href="#" onClick={e => { e.preventDefault(); onNavigate && onNavigate('org-picker'); }} style={{ color: 'inherit', textDecoration: 'underline' }}>Управление организациями →</a>
          </div>
        </div>
      )}
      {stats.pending_delreq > 0 && (
        <div className="banner banner-bad">
          {I.alert}
          <div className="banner-body" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bad-fg)', animation: 'pulse-dot 2s infinite', display: 'inline-block', flexShrink: 0 }}></span>
            <span><strong>{stats.pending_delreq} заявки на удаление</strong> ожидают вашего решения. <a href="#" onClick={e => { e.preventDefault(); onNavigate && onNavigate('delreq'); }} style={{ color: 'inherit', textDecoration: 'underline' }}>Просмотреть →</a></span>
          </div>
        </div>
      )}
      <div className="stats">
        <Stat label="Факультетов"  value={stats.faculties  ?? '…'} icon={I.building} />
        <Stat label="Групп"        value={stats.groups     ?? '…'} icon={I.users} />
        <Stat label="Студентов"    value={stats.students   ?? '…'} icon={I.badge} />
        <Stat label="Сотрудников"  value={stats.employees  ?? '…'} icon={I.briefcase} />
      </div>
      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="title">{I.history}<span>Журнал изменений</span><span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>· {filtered.length}</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 360 }}>
            <div className="input-with-icon" style={{ flex: '0 1 220px' }}>
              {I.search}<input className="input" style={{ height: 30 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по объекту…" />
            </div>
            <div style={{ width: 160 }}>
              <Combobox value={userFilter} onChange={setUserFilter} options={userOpts} placeholder="Все пользователи" />
            </div>
            <div style={{ width: 140 }}>
              <Combobox value={actionFilter} onChange={setActionFilter}
                options={[{ value: 'created', label: 'Создание' }, { value: 'updated', label: 'Изменение' }, { value: 'deleted', label: 'Удаление' }]}
                placeholder="Все действия" />
            </div>
          </div>
        </div>
        <div className="card-body flush">
          {!dashData
            ? <SkeletonRows rows={5} cols={4} />
            : sorted.length === 0
              ? <EmptyState icon={I.history} title="Записи не найдены" sub="Измените условия поиска" />
              : <table className="tbl">
                  <thead><tr>
                    <SortHeader k="ts"     sort={sort}>Дата и время</SortHeader>
                    <SortHeader k="user"   sort={sort}>Пользователь</SortHeader>
                    <SortHeader k="action" sort={sort}>Действие</SortHeader>
                    <SortHeader k="obj"    sort={sort}>Объект</SortHeader>
                  </tr></thead>
                  <tbody>
                    {rows.map((a, i) => (
                      <tr key={pager.start + i} className="row-link">
                        <td className="mono muted">{a.ts}</td>
                        <td>
                          <span className="fwm mono">{a.user}</span>
                          <div className="muted" style={{ fontSize: 11 }}>{a.userName} · {a.role}</div>
                        </td>
                        <td><span className={`badge ${a.cls}`}><span className="dot"></span>{a.label}</span></td>
                        <td>{a.obj}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>
        {sorted.length > 0 && <Pager pager={pager} total={sorted.length} />}
      </div>
    </Shell>
  );
}

/* ============================================================
   OrganizationList — hover cards with real API
   ============================================================ */
function OrganizationList({ currentUser, openModal, onNavigate, onUserRefresh }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get('/organizations/').then(r => {
      setOrgs(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (selectedOrg) {
    return <EmptyOrgOnboarding org={selectedOrg} currentUser={currentUser} onNavigate={onNavigate} openModal={openModal} onBack={() => setSelectedOrg(null)} />;
  }

  const handleSwitch = (org) => {
    api.post(`/organizations/${org.id}/switch/`).then(() => {
      setOrgs(prev => prev.map(o => ({ ...o, active: o.id === org.id })));
      onUserRefresh && onUserRefresh();
      toast.push(`Переключено на «${org.name}»`, { kind: 'ok' });
      setSelectedOrg(org);
    }).catch(() => toast.push('Ошибка переключения', { kind: 'err' }));
  };

  const handleEdit = (org) => {
    openModal('orgForm', { org, onDone: load });
  };

  const handleDelete = (org) => {
    if (!window.confirm(`Удалить организацию «${org.name}»?\nВсе данные (факультеты, группы, студенты) будут удалены.`)) return;
    api.delete(`/organizations/${org.id}/`).then(() => {
      setOrgs(prev => prev.filter(o => o.id !== org.id));
      toast.push('Организация удалена', { kind: 'ok' });
    }).catch(e => toast.push(e.response?.data?.error || 'Ошибка удаления', { kind: 'err' }));
  };

  return (
    <Shell currentUser={currentUser} active="org-list" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Мои организации"
        sub="Выберите организацию для работы или добавьте новую"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('orgForm', { onDone: load })}>{I.plus}Добавить организацию</button>}
      />
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {orgs.map(org => (
            <div key={org.id} className="card" style={{ border: org.active ? '2px solid var(--accent)' : '1px solid var(--border)', position: 'relative' }}>
              {org.active && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span className="badge badge-ok"><span className="dot"></span>Активна</span>
                </div>
              )}
              <div className="card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: org.active ? 'var(--accent)' : 'var(--surface-alt)', color: org.active ? '#fff' : 'var(--text-muted)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, border: '1px solid var(--border)' }}>
                    {org.code}
                  </div>
                  <div>
                    <div className="fwm" style={{ fontSize: 14 }}>{org.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>Код: {org.code} · {org.created_at}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}><StatNumber value={org.students} /></div>
                    <div className="muted" style={{ fontSize: 11 }}>студентов</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}><StatNumber value={org.employees} /></div>
                    <div className="muted" style={{ fontSize: 11 }}>сотрудников</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!org.active && (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleSwitch(org)}>{I.swap}Перейти</button>
                  )}
                  <button className="btn btn-secondary btn-sm" style={org.active ? { flex: 1 } : {}} onClick={() => handleEdit(org)}>{I.pencil}Редактировать</button>
                  {!org.active && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(org)} title="Удалить">{I.trash}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="card card-hover" style={{ border: '2px dashed var(--border)', cursor: 'pointer' }} onClick={() => openModal('orgForm', { onDone: load })}>
            <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-alt)', display: 'grid', placeItems: 'center', marginBottom: 8 }}>{I.plus}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Добавить организацию</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Создать новый колледж</div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ============================================================
   EmptyOrgOnboarding — new screen for owner who just created an org
   ============================================================ */
function EmptyOrgOnboarding({ org, currentUser, onNavigate, openModal, onBack }) {
  // progress state: faculties → groups → employees → students
  const [done, setDone] = useState({ fac: false, group: false, emp: false, stud: false });
  const steps = [
    { id: 'fac',   n: 1, title: 'Добавьте факультет',  sub: 'Создайте учебные направления для распределения групп', modal: 'facultyForm' },
    { id: 'group', n: 2, title: 'Создайте группы',     sub: 'Группы распределяются по факультетам',                  modal: 'groupForm',  lock: !done.fac },
    { id: 'emp',   n: 3, title: 'Добавьте сотрудников',sub: 'Преподаватели и административный персонал',             modal: 'employeeForm' },
    { id: 'stud',  n: 4, title: 'Добавьте студентов',  sub: 'Распределите по группам и заполните личные данные',     modal: 'studentForm', lock: !done.group },
  ];
  const total = steps.length;
  const doneCount = Object.values(done).filter(Boolean).length;

  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Организации', href: true, onClick: onBack }, { label: org.name }]}
        title={`Добро пожаловать в ${org.name}!`}
        sub="Начните с настройки структуры — каждый шаг становится активным после завершения предыдущего."
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Настройка организации</div>
            <div className="muted" style={{ fontSize: 13 }}>Прогресс: <strong style={{ color: 'var(--text)' }}>{doneCount}/{total}</strong> шагов выполнено</div>
            <div style={{ marginTop: 8, height: 6, background: 'var(--surface-alt)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(doneCount / total) * 100}%`, background: 'var(--accent)', transition: 'width .3s ease', borderRadius: 999 }}></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map((s, idx) => {
          const isDone = done[s.id];
          const isActive = !isDone && !s.lock;
          const isLocked = s.lock && !isDone;
          return (
            <div key={s.id} className={`onboarding-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}>
              <div className="step-num">{isDone ? I.check : s.n}</div>
              <div className="body">
                <div className="title">{s.title}</div>
                <div className="sub">{s.sub}{isLocked && ' · недоступно пока не выполнен предыдущий шаг'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isDone && <button className="btn btn-ghost btn-sm" onClick={() => setDone(d => ({ ...d, [s.id]: false }))}>Сбросить</button>}
                <button
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={isLocked}
                  onClick={() => { openModal(s.modal); setTimeout(() => setDone(d => ({ ...d, [s.id]: true })), 800); }}
                >
                  {isDone ? <>{I.plus}Добавить ещё</> : <>{I.plus}Добавить</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function DashboardSuper({ currentUser, onNavigate, onLogout, openModal }) {
  return <DashboardOwner currentUser={currentUser} onNavigate={onNavigate} onLogout={onLogout} openModal={openModal} />;
}

function DashboardAdmin({ currentUser, onNavigate, onLogout, openModal }) {
  const [dashData, setDashData] = useState(null);
  const [q, setQ] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const sort = useSortable({ key: 'ts', dir: 'desc' }, 'admin-dash-audit');

  useEffect(() => {
    api.get('/dashboard/').then(r => setDashData(r.data)).catch(() => {});
  }, []);

  const stats = dashData?.stats || {};
  const ALL = dashData?.recent_audit || [];

  const filtered = useMemo(() => ALL.filter(a => {
    if (q && !`${a.obj} ${a.user} ${a.userName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (userFilter && a.user !== userFilter) return false;
    return true;
  }), [ALL, q, userFilter]);
  const sorted = sort.sortFn(filtered, { ts: a => a.ts, user: a => a.user, action: a => a.label, obj: a => a.obj });
  const pager = usePager(sorted.length, { key: 'admin-dash-audit', defaultSize: 10 });
  const rows = pager.slice(sorted);

  const userOpts = useMemo(() => {
    const map = new Map();
    ALL.forEach(a => map.set(a.user, { value: a.user, label: a.user, sub: a.role }));
    return Array.from(map.values());
  }, [ALL]);

  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} onLogout={onLogout} openModal={openModal}>
      <PageHead
        title="Дашборд"
        sub="Сводка по системе"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Экспорт</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal && openModal('studentForm')}>{I.plus}Добавить студента</button>
        </>}
      />
      <div className="stats">
        <Stat label="Факультетов" value={stats.faculties  ?? '…'} icon={I.building} />
        <Stat label="Групп"       value={stats.groups     ?? '…'} icon={I.users} />
        <Stat label="Студентов"   value={stats.students   ?? '…'} icon={I.badge} />
        <Stat label="Сотрудников" value={stats.employees  ?? '…'} icon={I.briefcase} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head"><div className="title">Быстрые действия</div></div>
          <div className="card-body" style={{ display: 'grid', gap: 8 }}>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal && openModal('studentForm')}>{I.plus}Добавить студента</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal && openModal('employeeForm')}>{I.plus}Добавить сотрудника</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal && openModal('groupForm')}>{I.plus}Создать группу</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }}>{I.excel}Экспорт списка студентов</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="title">{I.history}<span>Последние действия</span><span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>· {filtered.length}</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-with-icon" style={{ width: 200 }}>
                {I.search}<input className="input" style={{ height: 30 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск…" />
              </div>
              <div style={{ width: 160 }}>
                <Combobox value={userFilter} onChange={setUserFilter} options={userOpts} placeholder="Все пользователи" />
              </div>
            </div>
          </div>
          <div className="card-body flush">
            {!dashData
              ? <SkeletonRows rows={5} cols={4} />
              : sorted.length === 0
                ? <EmptyState icon={I.history} title="Ничего не найдено" sub="Измените условия поиска" />
                : <table className="tbl">
                    <thead><tr>
                      <SortHeader k="ts"     sort={sort}>Время</SortHeader>
                      <SortHeader k="user"   sort={sort}>Кто</SortHeader>
                      <SortHeader k="action" sort={sort}>Действие</SortHeader>
                      <SortHeader k="obj"    sort={sort}>Объект</SortHeader>
                    </tr></thead>
                    <tbody>
                      {rows.map((a, i) => (
                        <tr key={pager.start + i} className="row-link">
                          <td className="mono muted">{a.ts.slice(11)}<div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{a.ts.slice(0, 10)}</div></td>
                          <td><span className="fwm mono">{a.user}</span><div className="muted" style={{ fontSize: 11 }}>{a.userName}</div></td>
                          <td><span className={`badge ${a.cls}`}><span className="dot"></span>{a.label}</span></td>
                          <td>{a.obj}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            }
          </div>
          {sorted.length > 0 && <Pager pager={pager} total={sorted.length} sizes={[10, 25, 50, 100]} />}
        </div>
      </div>
    </Shell>
  );
}

function DashboardTeacher({ currentUser, onNavigate, onLogout, openModal }) {
  const name = currentUser?.display_name || currentUser?.username || 'Преподаватель';
  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} onLogout={onLogout} openModal={openModal}>
      <PageHead title={`Здравствуйте, ${name}`} sub="Ваши группы и предметы на текущий семестр" />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Моих групп"     value="2"  icon={I.users} />
        <Stat label="Моих студентов" value="53" icon={I.badge} />
        <Stat label="Предметов"      value="3"  icon={I.book} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head"><div className="title">Мои группы</div></div>
          <div className="card-body" style={{ display: 'grid', gap: 8 }}>
            {[{ name: 'ПИ-301', count: 28, fac: 'ФИТ' }, { name: 'ПИ-302', count: 25, fac: 'ФИТ' }].map(g => (
              <div key={g.name} className="doc-tile" style={{ cursor: 'pointer' }}>
                <div className="doc-icon">{I.users}</div>
                <div style={{ flex: 1 }}>
                  <div className="doc-name">{g.name}</div>
                  <div className="doc-meta">{g.fac} · {g.count} студентов</div>
                </div>
                {I.chevr}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="title">Мои предметы</div></div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>Предмет</th><th>Группа</th></tr></thead>
              <tbody>
                <tr><td className="fwm">Базы данных</td><td><a href="#">ПИ-301</a></td></tr>
                <tr><td className="fwm">Веб-программирование</td><td><a href="#">ПИ-302</a></td></tr>
                <tr><td className="fwm">Алгоритмы и структуры данных</td><td><a href="#">ПИ-301</a></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Status inline-dropdown
   ============================================================ */
function StatusDropdown({ value, onChange }) {
  const { open, setOpen, wrapRef } = useDropdown();
  const cur = STATUSES[value] || { label: value, cls: 'badge-neutral' };
  return (
    <div ref={wrapRef} className="dd-wrap" style={{ display: 'inline-block' }}>
      <span className={`badge ${cur.cls} is-clickable`} onClick={() => setOpen(o => !o)}>
        <span className="dot"></span>{cur.label}
      </span>
      {open && (
        <div className="dd-menu" style={{ right: 'auto', left: 0, minWidth: 220 }}>
          {Object.entries(STATUSES).map(([k, v]) => (
            <div key={k} className="dd-item" onClick={() => { onChange && onChange(k); setOpen(false); }}>
              <span className={`badge ${v.cls}`} style={{ width: 'fit-content' }}><span className="dot"></span>{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   StudentList — поиск + фильтры + пагинация (реальный API)
   ============================================================ */
function StudentList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [facId, setFacId] = useState('');
  const [grpId, setGrpId] = useState('');
  const [stat, setStat] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    api.get('/faculties/').then(r => setFaculties(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (facId) {
      api.get(`/groups/?faculty_id=${facId}`).then(r => setGroups(r.data)).catch(() => {});
    } else {
      setGroups([]);
      setGrpId('');
    }
  }, [facId]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    if (stat) params.set('status', stat);
    if (facId) params.set('faculty_id', facId);
    if (grpId) params.set('group_id', grpId);
    api.get(`/students/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = () => { setPage(1); load(); };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await api.patch(`/students/${studentId}/`, { status: newStatus });
      toast.push(`Статус изменён на "${STATUSES[newStatus]?.label || newStatus}"`, { kind: 'ok' });
      load();
    } catch {
      toast.push('Не удалось изменить статус', { kind: 'err' });
    }
  };

  const reset = () => { setQ(''); setFacId(''); setGrpId(''); setStat(''); setPage(1); setTimeout(load, 0); };

  const activeFilters = [];
  if (facId) {
    const f = faculties.find(f => String(f.id) === String(facId));
    activeFilters.push({ k: 'fac', l: `Факультет: ${f?.short_name || facId}`, clr: () => { setFacId(''); setGrpId(''); } });
  }
  if (grpId) {
    const g = groups.find(g => String(g.id) === String(grpId));
    activeFilters.push({ k: 'grp', l: `Группа: ${g?.name || grpId}`, clr: () => setGrpId('') });
  }
  if (stat) activeFilters.push({ k: 'stat', l: `Статус: ${STATUSES[stat]?.label || stat}`, clr: () => setStat('') });

  return (
    <Shell currentUser={currentUser} active="students" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Студенты' }]}
        title="Студенты"
        sub={loading ? 'Загрузка…' : `Всего ${data.count} человек`}
        actions={<>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('studentForm', { onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить</button>
        </>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Иванов Иван…" />
          </div>
        </div>
        <div className="field"><label className="field-label">Факультет</label>
          <select className="select" value={facId} onChange={e => { setFacId(e.target.value); setGrpId(''); }}>
            <option value="">— Все —</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name}</option>)}
          </select>
        </div>
        <div className="field"><label className="field-label">Группа</label>
          <select className="select" value={grpId} onChange={e => setGrpId(e.target.value)} disabled={!facId}>
            <option value="">— Все —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="field"><label className="field-label">Статус</label>
          <select className="select" value={stat} onChange={e => setStat(e.target.value)}>
            <option value="">— Все —</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost btn-sm" onClick={reset}>Сбросить</button>
      </div>
      {activeFilters.length > 0 && (
        <div className="filter-chips" style={{ marginBottom: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>Активные фильтры:</span>
          {activeFilters.map(f => (
            <span key={f.k} className="filter-chip">{f.l}<button onClick={f.clr} aria-label="Убрать фильтр">{I.x}</button></span>
          ))}
        </div>
      )}
      <div className="card">
        <div className="card-body flush">
          {!loading && data.results.length === 0 ? (
            <EmptyState
              icon={I.search}
              title="Студенты не найдены"
              sub="Попробуйте изменить условия фильтрации или сбросить фильтры"
              action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить фильтры</button>}
            />
          ) : (
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 50 }}></th><th>ФИО</th><th>Статус</th><th>Факультет</th><th>Группа</th><th>Контакт</th></tr></thead>
              {loading
                ? <SkeletonRows rows={6} cols={7} />
                : <tbody>
                    {data.results.map(s => (
                      <tr key={s.id} className="row-link" onClick={() => onNavigate('student-detail', { studentId: s.id })}>
                        <td className="muted">{s.id}</td>
                        <td><Avatar name={`${s.last_name} ${s.first_name}`} size="sm" /></td>
                        <td className="fwm">{s.last_name} {s.first_name} {s.middle_name}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <StatusDropdown value={s.status} onChange={v => handleStatusChange(s.id, v)} />
                        </td>
                        <td>{s.faculty_short}</td>
                        <td>{s.group_name || <span className="muted">—</span>}</td>
                        <td className="muted">{s.phone}</td>
                      </tr>
                    ))}
                  </tbody>
              }
            </table>
          )}
        </div>
        {data.num_pages > 1 && (
          <div className="card-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
            <span className="muted" style={{ fontSize: 13 }}>Страница {page} из {data.num_pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.num_pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ============================================================
   StudentDetail — профиль, документы, опекуны, история (реальный API)
   ============================================================ */
function StudentDetail({ currentUser, openModal, onNavigate, studentId }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [over, setOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get(`/students/${studentId}/`).then(r => {
      setStudent(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (studentId) load(); }, [studentId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/students/${studentId}/`, { status: newStatus });
      toast.push(`Статус изменён на "${STATUSES[newStatus]?.label || newStatus}"`, { kind: 'ok' });
      load();
    } catch {
      toast.push('Не удалось изменить статус', { kind: 'err' });
    }
  };

  const handleRemoveParent = async (spId) => {
    if (!confirm('Убрать опекуна?')) return;
    try {
      await api.delete(`/students/${studentId}/parents/${spId}/`);
      toast.push('Опекун удалён', { kind: 'ok' });
      load();
    } catch {
      toast.push('Ошибка при удалении', { kind: 'err' });
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await api.delete(`/documents/${docId}/`);
      toast.push('Документ удалён', { kind: 'ok' });
      load();
    } catch {
      toast.push('Ошибка при удалении документа', { kind: 'err' });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openModal('uploadDoc', { file, ownerId: studentId, ownerType: 'student', onDone: load });
  };

  if (loading || !student) {
    return (
      <Shell currentUser={currentUser} active="students" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  return (
    <Shell currentUser={currentUser} active="students" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Студенты', href: true, onClick: () => onNavigate('students') }, { label: `${student.last_name} ${student.first_name}` }]}
        title={`${student.last_name} ${student.first_name} ${student.middle_name}`}
        sub={`#${student.id} · ${student.faculty_short} · ${student.group_name || 'без группы'}`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('studentForm', { student, onDone: load })}>{I.pencil}Редактировать</button>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('transfer', { student, onDone: load })}>{I.swap}Перевести</button>
          <button className="btn btn-danger btn-sm" onClick={() => openModal('deleteConfirm', { name: `${student.last_name} ${student.first_name}`, type: 'студента', studentId, onDone: () => onNavigate('students') })}>{I.trash}Удалить</button>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
              <Avatar name={`${student.last_name} ${student.first_name}`} size="lg" className="avatar-zoomy" />
              <h3 style={{ marginTop: 14, marginBottom: 6 }}>{student.last_name} {student.first_name}</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{student.middle_name}</div>
              <StatusDropdown value={student.status} onChange={handleStatusChange} />
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <dl className="kv">
                <dt>Дата рождения</dt><dd>{student.birth_date || '—'}</dd>
                <dt>Телефон</dt><dd>{student.phone || '—'}</dd>
                <dt>Email</dt><dd>{student.email || '—'}</dd>
                <dt>Факультет</dt><dd>{student.faculty_name}</dd>
                <dt>Группа</dt><dd>{student.group_name || <span className="muted">—</span>}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head">
              <div className="title">Опекуны и родители</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('parentForm', { studentId, onDone: load })}>{I.plus}Добавить</button>
            </div>
            <div className="card-body flush">
              {student.parents.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Опекуны не добавлены</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>ФИО</th><th>Связь</th><th>Телефон</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {student.parents.map(p => (
                      <tr key={p.id}>
                        <td className="fwm">{p.parent_name}</td>
                        <td>{p.relation_display}</td>
                        <td className="muted">{p.phone || '—'}</td>
                        <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveParent(p.id)}>{I.x}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="title">Документы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc', { ownerId: studentId, ownerType: 'student', onDone: load })}>{I.upload}Загрузить</button>
            </div>
            <div className="card-body">
              <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ marginBottom: 12, padding: 16 }}
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={handleDrop}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  {I.upload}{over ? 'Отпустите для загрузки' : 'Перетащите файлы сюда или нажмите «Загрузить»'}
                </div>
              </div>
              {student.documents.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Документы не загружены</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {student.documents.map(d => (
                    <div key={d.id} className="doc-tile" style={{ position: 'relative' }}>
                      <a href={d.file_url} target="_blank" rel="noreferrer" style={{ display: 'contents' }}>
                        <div className="doc-icon">{I.doc}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="doc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                          <div className="doc-meta">{d.uploaded_at}</div>
                        </div>
                      </a>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => handleDeleteDoc(d.id)}>{I.x}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ cursor: 'pointer' }} onClick={() => setHistoryOpen(o => !o)}>
              <div className="title">{I.history}<span>История изменений</span><span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>· {student.audit_log.length} событий</span></div>
              <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {historyOpen && (
              <div className="card-body flush">
                {student.audit_log.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>История пуста</div>
                ) : (
                  <table className="tbl">
                    <thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th></tr></thead>
                    <tbody>
                      {student.audit_log.map((l, i) => (
                        <tr key={i}>
                          <td className="mono muted">{l.created_at}</td>
                          <td className="fwm">{l.user}</td>
                          <td><Badge>{l.action}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Employees list / detail
   ============================================================ */
function EmployeeList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [posId, setPosId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    api.get('/positions/').then(r => setPositions(r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    if (posId) params.set('position_id', posId);
    api.get(`/employees/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = () => { setPage(1); load(); };
  const reset = () => { setQ(''); setPosId(''); setPage(1); setTimeout(load, 0); };

  return (
    <Shell currentUser={currentUser} active="employees" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Сотрудники' }]}
        title="Сотрудники"
        sub={loading ? 'Загрузка…' : `Всего ${data.count} человек`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('employeeForm', { onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Иванов Иван…" />
          </div>
        </div>
        <div className="field"><label className="field-label">Должность</label>
          <select className="select" value={posId} onChange={e => setPosId(e.target.value)}>
            <option value="">— Все —</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost btn-sm" onClick={reset}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && data.results.length === 0 ? (
            <EmptyState icon={I.search} title="Сотрудники не найдены" sub="Попробуйте изменить условия поиска" />
          ) : (
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th>ФИО</th><th>Должность</th><th>Телефон</th><th>Email</th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={5} /> : data.results.map(e => (
                  <tr key={e.id} className="row-link" onClick={() => onNavigate('employee-detail', { employeeId: e.id })}>
                    <td className="muted mono">{e.id}</td>
                    <td className="fwm">{e.full_name}</td>
                    <td>{e.position_name || <span className="muted">—</span>}</td>
                    <td className="muted">{e.phone || '—'}</td>
                    <td className="muted">{e.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data.num_pages > 1 && (
          <div className="card-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
            <span className="muted" style={{ fontSize: 13 }}>Страница {page} из {data.num_pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.num_pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function EmployeeDetail({ currentUser, openModal, onNavigate, employeeId }) {
  const toast = useToast();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/employees/${employeeId}/`).then(r => {
      setEmployee(r.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.push('Не удалось загрузить данные сотрудника', { kind: 'err' });
    });
  };

  useEffect(() => { if (employeeId) load(); }, [employeeId]);

  const removeSubject = async (assignmentId) => {
    try {
      await api.delete(`/employees/${employeeId}/subjects/${assignmentId}/`);
      toast.push('Назначение удалено', { kind: 'ok' });
      load();
    } catch {
      toast.push('Не удалось удалить назначение', { kind: 'err' });
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await api.delete(`/documents/${docId}/`);
      toast.push('Документ удалён', { kind: 'ok' });
      load();
    } catch {
      toast.push('Ошибка при удалении документа', { kind: 'err' });
    }
  };

  const handleDeleteRequest = async () => {
    if (!employee) return;
    try {
      await api.post(`/employees/${employeeId}/delete-request/`, {});
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
    } catch {
      toast.push('Не удалось создать заявку', { kind: 'err' });
    }
  };

  if (loading || !employee) {
    return (
      <Shell currentUser={currentUser} active="employees" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  return (
    <Shell currentUser={currentUser} active="employees" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Сотрудники', href: true, onClick: () => onNavigate('employees') }, { label: employee.full_name }]}
        title={employee.full_name}
        sub={employee.position_name || 'Сотрудник'}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('employeeForm', { employee, onDone: load })}>{I.pencil}Редактировать</button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Удалить</button>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <Avatar name={employee.full_name} size="lg" className="avatar-zoomy" />
            <h3 style={{ marginTop: 14, marginBottom: 6 }}>{employee.last_name} {employee.first_name}</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{employee.middle_name}</div>
            {employee.position_name && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <Badge>{employee.position_name}</Badge>
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <dl className="kv">
              {employee.birth_date && <><dt>Дата рождения</dt><dd>{employee.birth_date}</dd></>}
              <dt>Телефон</dt><dd>{employee.phone || '—'}</dd>
              <dt>Email</dt><dd>{employee.email || '—'}</dd>
            </dl>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {employee.headed_groups?.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="title">Классное руководство</div></div>
              <div className="card-body flush">
                <table className="tbl">
                  <thead><tr><th>Группа</th><th>Факультет</th><th>Студентов</th></tr></thead>
                  <tbody>
                    {employee.headed_groups.map(g => (
                      <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                        <td className="fwm">{g.name}</td>
                        <td>{g.faculty_short}</td>
                        <td className="mono">{g.student_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-head">
              <div className="title">Ведёт предметы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('employeeAssignSubject', { employeeId, onDone: load })}>{I.plus}Назначить</button>
            </div>
            <div className="card-body flush">
              {employee.subjects?.length === 0 ? (
                <EmptyState icon={I.briefcase} title="Предметы не назначены" sub="Нажмите «Назначить» чтобы добавить" />
              ) : (
                <table className="tbl">
                  <thead><tr><th>Предмет</th><th>Группа</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {employee.subjects?.map(s => (
                      <tr key={s.assignment_id}>
                        <td className="fwm">{s.subject_name}</td>
                        <td>{s.group_name}</td>
                        <td>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeSubject(s.assignment_id)} title="Убрать">{I.x}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="title">Документы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc', { ownerType: 'employee', ownerId: employeeId, onDone: load })}>{I.upload}Загрузить</button>
            </div>
            <div className="card-body flush">
              {!employee.documents?.length ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Документы не загружены</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Название</th><th>Тип</th><th>Дата</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {employee.documents.map(d => (
                      <tr key={d.id}>
                        <td className="fwm"><a href={d.file_url} target="_blank" rel="noreferrer">{d.name}</a></td>
                        <td>{d.doc_type || '—'}</td>
                        <td className="muted">{d.uploaded_at || '—'}</td>
                        <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteDoc(d.id)}>{I.x}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Groups list / detail; Faculties list
   ============================================================ */
function GroupList({ currentUser, openModal, onNavigate }) {
  const [groups, setGroups] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facultyFilter, setFacultyFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = (fid) => {
    const f = fid !== undefined ? fid : facultyFilter;
    setLoading(true);
    const params = f ? `?faculty_id=${f}` : '';
    api.get(`/groups/${params}`).then(r => {
      setGroups(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/faculties/').then(r => setFaculties(r.data)).catch(() => {});
    load('');
  }, []);

  const filtered = groups.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Группы"
        sub={loading ? '…' : `Всего ${filtered.length} групп`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('groupForm', { onDone: load })}>{I.plus}Создать группу</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Название группы…" /></div>
        </div>
        <div className="field">
          <label className="field-label">Факультет</label>
          <select className="select" value={facultyFilter} onChange={e => { setFacultyFilter(e.target.value); load(e.target.value); }}>
            <option value="">— Все —</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Название</th><th>Факультет</th><th>Год</th><th>Классный руководитель</th><th>Студентов</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} rows={4} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Группы не найдены</td></tr>
              ) : filtered.map(g => (
                <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                  <td className="fwm">{g.name}</td>
                  <td>{g.faculty_short}</td>
                  <td className="mono muted">{g.year}</td>
                  <td>{g.headteacher_name || '—'}</td>
                  <td className="mono">{g.student_count}</td>
                  <td>{I.chevr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function GroupDetail({ currentUser, openModal, onNavigate, groupId }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/groups/${groupId}/`).then(r => {
      setGroup(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (groupId) load(); }, [groupId]);

  if (loading || !group) {
    return (
      <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  const handleDeleteRequest = async () => {
    if (!confirm(`Отправить заявку на удаление группы ${group.name}?`)) return;
    try {
      await api.post(`/groups/${groupId}/delete-request/`);
      onNavigate('groups');
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка при отправке заявки');
    }
  };

  const handleRemoveSubject = async (assignmentId) => {
    if (!confirm('Убрать предмет из группы?')) return;
    try {
      await api.delete(`/groups/${groupId}/subjects/${assignmentId}/`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Группы', href: true, onClick: () => onNavigate('groups') }, { label: group.name }]}
        title={group.name}
        sub={`${group.faculty_name} · Год набора ${group.year}`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('groupForm', { group, onDone: load })}>{I.pencil}Редактировать</button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Удалить</button>
        </>}
      />
      {group.headteacher_name && (
        <div className="banner banner-info">
          {I.user}
          <div className="banner-body"><strong>Классный руководитель:</strong> {group.headteacher_name}</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="title">Студенты <span className="muted" style={{ fontWeight: 400 }}>· {group.students.length}</span></div>
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th>ФИО</th><th>Статус</th></tr></thead>
              <tbody>
                {group.students.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Студенты не добавлены</td></tr>
                ) : group.students.map(s => (
                  <tr key={s.id}>
                    <td className="muted">{s.id}</td>
                    <td className="fwm">{s.last_name} {s.first_name} {s.middle_name}</td>
                    <td><Badge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head">
              <div className="title">Предметы <span className="muted" style={{ fontWeight: 400 }}>· {group.subjects.length}</span></div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('assignSubject', { groupId, onDone: load })}>{I.plus}</button>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              {group.subjects.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Предметы не назначены</div>
              ) : group.subjects.map(a => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div className="fwm" style={{ fontSize: 13 }}>{a.subject_name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{a.employee_name}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveSubject(a.id)}>{I.x}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FacultyList({ currentUser, openModal, onNavigate }) {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/faculties/').then(r => {
      setFaculties(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Shell currentUser={currentUser} active="faculties" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Факультеты"
        sub={loading ? '…' : `Всего ${faculties.length} факультетов`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('facultyForm', { onDone: load })}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead>
              <tr><th>Код</th><th>Название</th><th>Групп</th><th>Студентов</th><th style={{ width: 40 }}></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={5} rows={4} />
              ) : faculties.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Факультеты не найдены</td></tr>
              ) : faculties.map(f => (
                <tr key={f.id} className="row-link" onClick={() => openModal('facultyDetail', { faculty: f, onDone: load })}>
                  <td><span className="badge badge-neutral mono" style={{ padding: '1px 6px' }}>{f.short_name}</span></td>
                  <td className="fwm">{f.full_name}</td>
                  <td className="mono">{f.group_count}</td>
                  <td className="mono">{f.student_count}</td>
                  <td>{I.chevr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Admin: users / delete requests / audit
   ============================================================ */
const ROLE_CLS = { owner: 'badge-bad', admin: 'badge-info', teacher: 'badge-ok' };

function UserList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/users/').then(r => {
      setUsers(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (u) => {
    if (!confirm(`Удалить пользователя «${u.username}»? Это действие необратимо.`)) return;
    try {
      await api.delete(`/users/${u.id}/`);
      toast.push('Пользователь удалён', { kind: 'ok' });
      load();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка при удалении', { kind: 'err' });
    }
  };

  return (
    <Shell currentUser={currentUser} active="users" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Пользователи системы' }]}
        title="Пользователи системы"
        sub={loading ? 'Загрузка…' : `Всего ${users.length}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('userForm', { onDone: load })}>{I.plus}Создать пользователя</button>}
      />
      <div className="card">
        <div className="card-body flush">
          {!loading && users.length === 0 ? (
            <EmptyState icon={I.users} title="Пользователи не найдены" sub="Нажмите «Создать пользователя» чтобы добавить первого" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Логин</th><th>ФИО</th><th>Роль</th><th>Организации</th><th>Последний вход</th><th>Статус</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={7} /> : users.map(u => (
                  <tr key={u.id}>
                    <td className="mono fwm">{u.username}</td>
                    <td>{u.display_name || '—'}</td>
                    <td><span className={`badge ${ROLE_CLS[u.role] || 'badge-neutral'}`}><span className="dot"></span>{u.role_display}</span></td>
                    <td>
                      {u.institution_codes && u.institution_codes.length > 0
                        ? u.institution_codes.map(c => (
                            <span key={c} className="badge badge-neutral" style={{ marginRight: 4 }}>{c}</span>
                          ))
                        : <span className="muted" style={{ fontSize: 12 }}>нет</span>
                      }
                    </td>
                    <td className="mono muted">{u.last_login || 'никогда'}</td>
                    <td>{u.is_active ? <span className="badge badge-ok"><span className="dot"></span>Активен</span> : <span className="badge badge-neutral"><span className="dot"></span>Неактивен</span>}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Редактировать"
                        onClick={() => openModal('userForm', { user: u, onDone: load })}>
                        {I.pencil}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Сменить пароль"
                        onClick={() => openModal('userSetPassword', { userId: u.id, username: u.username })}>
                        {I.shield}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Удалить"
                        onClick={() => handleDelete(u)}>
                        {I.trash}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

function DeleteRequests({ currentUser, openModal, onNavigate, onLogout }) {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/delete-requests/');
      setReqs(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const reject = async (id) => {
    try {
      await api.post(`/delete-requests/${id}/reject/`);
      toast.push('Заявка отклонена', { kind: 'ok' });
      load();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
    }
  };

  return (
    <Shell currentUser={currentUser} active="delreq" openModal={openModal} onNavigate={onNavigate} onLogout={onLogout}>
      <PageHead title="Заявки на удаление" sub="Подтвердите или отклоните заявки от администраторов" />
      <div className="banner banner-info">{I.info}<div className="banner-body">Двухступенчатое удаление: администратор подаёт заявку, суперадмин подтверждает. До подтверждения объект остаётся в системе.</div></div>
      <div className="card">
        <div className="card-body flush">
          {loading ? (
            <table className="tbl"><thead><tr><th>Тип</th><th>Объект</th><th>Кто подал</th><th>Когда</th><th>Причина</th><th style={{ width: 200 }}>Действия</th></tr></thead><tbody><SkeletonRows cols={6} /></tbody></table>
          ) : (
            <table className="tbl">
              <thead><tr><th>Тип</th><th>Объект</th><th>Кто подал</th><th>Когда</th><th>Причина</th><th style={{ width: 200 }}>Действия</th></tr></thead>
              <tbody>
                {reqs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }} className="muted">Нет заявок на удаление</td></tr>
                ) : reqs.map(r => (
                  <tr key={r.id}>
                    <td><Badge>{r.type_label}</Badge></td>
                    <td className="fwm">{r.object_repr}</td>
                    <td className="mono">{r.author}</td>
                    <td className="mono muted">{r.created_at}</td>
                    <td className="muted">{r.reason}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-danger-solid btn-sm" onClick={() => openModal('approveDelete', { ...r, onDone: load })}>{I.check}Одобрить</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => reject(r.id)}>Отклонить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

function AuditLog({ currentUser, openModal, onNavigate }) {
  const [q, setQ] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [userOpts, setUserOpts] = useState([]);

  useEffect(() => {
    api.get('/audit-log/users/').then(r => setUserOpts(r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    if (actionFilter) params.set('action', actionFilter);
    if (period && period !== 'all') params.set('period', period);
    if (userFilter) params.set('user_id', userFilter);
    api.get(`/audit-log/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = () => { setPage(1); load(); };
  const reset = () => { setQ(''); setUserFilter(''); setActionFilter(''); setPeriod('all'); setPage(1); setTimeout(load, 0); };

  const activeFilters = [];
  if (userFilter) {
    const u = userOpts.find(u => String(u.value) === String(userFilter));
    activeFilters.push({ k: 'u', l: `Пользователь: ${u?.label || userFilter}`, clr: () => setUserFilter('') });
  }
  if (actionFilter) activeFilters.push({ k: 'a', l: `Действие: ${actionFilter === 'create' ? 'Создание' : actionFilter === 'update' ? 'Изменение' : 'Удаление'}`, clr: () => setActionFilter('') });

  return (
    <Shell currentUser={currentUser} active="audit" onNavigate={onNavigate} openModal={openModal}>
      <PageHead title="Журнал изменений"
        sub={loading ? 'Загрузка…' : `Найдено: ${data.count} записей`}
        actions={<button className="btn btn-secondary btn-sm">{I.excel}Экспорт</button>}
      />
      <div className="filters">
        <div className="field grow-2"><label className="field-label">Поиск по объекту, пользователю или ФИО</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q}
            onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Студент, группа, admin1, Дмитриева…" /></div>
        </div>
        <div className="field"><label className="field-label">Пользователь</label>
          <Combobox value={userFilter} onChange={v => { setUserFilter(v); setPage(1); setTimeout(load, 0); }}
            options={userOpts} placeholder="Все пользователи" />
        </div>
        <div className="field"><label className="field-label">Действие</label>
          <Combobox value={actionFilter} onChange={v => { setActionFilter(v); setPage(1); setTimeout(load, 0); }}
            options={[{ value: 'create', label: 'Создание' }, { value: 'update', label: 'Изменение' }, { value: 'delete', label: 'Удаление' }]}
            placeholder="Все действия" />
        </div>
        <div className="field"><label className="field-label">Период</label>
          <Combobox value={period} onChange={v => { setPeriod(v); setPage(1); setTimeout(load, 0); }}
            options={[{ value: 'day', label: 'За сегодня' }, { value: 'week', label: 'За неделю' }, { value: 'month', label: 'За месяц' }, { value: 'all', label: 'За всё время' }]}
            placeholder="Период" allowClear={false} />
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="filter-chips" style={{ marginBottom: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>Активные фильтры:</span>
          {activeFilters.map(f => (
            <span key={f.k} className="filter-chip">{f.l}<button onClick={f.clr} aria-label="Убрать">{I.x}</button></span>
          ))}
        </div>
      )}
      <div className="card">
        <div className="card-body flush">
          {loading
            ? <table className="tbl"><thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th style={{ width: 100 }}>Diff</th></tr></thead><tbody><SkeletonRows cols={5} /></tbody></table>
            : data.results.length === 0
              ? <EmptyState icon={I.history} title="Записи не найдены" sub="Измените условия фильтрации или сбросьте фильтры"
                  action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить фильтры</button>} />
              : <table className="tbl">
                  <thead><tr>
                    <th>Дата и время</th>
                    <th>Пользователь</th>
                    <th>Действие</th>
                    <th>Объект</th>
                    <th style={{ width: 100 }}>Diff</th>
                  </tr></thead>
                  <tbody>
                    {data.results.map(a => (
                      <tr key={a.id} className="row-link" onClick={() => openModal('auditDiff', a)}>
                        <td className="mono muted">{a.ts}</td>
                        <td>
                          <span className="fwm mono">{a.user}</span>
                          <div className="muted" style={{ fontSize: 11 }}>{a.userName} · {a.role}</div>
                        </td>
                        <td><span className={`badge ${a.cls}`}><span className="dot"></span>{a.label}</span></td>
                        <td>{a.obj}</td>
                        <td><a href="#" onClick={ev => { ev.preventDefault(); ev.stopPropagation(); openModal('auditDiff', a); }}>Показать →</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>
        {data.num_pages > 1 && (
          <div className="card-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
            <span className="muted" style={{ fontSize: 13 }}>Страница {page} из {data.num_pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.num_pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function ParentList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    api.get(`/parents/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = () => { setPage(1); load(); };
  const reset = () => { setQ(''); setPage(1); setTimeout(load, 0); };

  const handleDeleteRequest = async (p) => {
    try {
      await api.post(`/parents/${p.id}/delete-request/`, {});
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
    } catch {
      toast.push('Не удалось создать заявку', { kind: 'err' });
    }
  };

  return (
    <Shell currentUser={currentUser} active="parents" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Опекуны и родители' }]}
        title="Опекуны и родители"
        sub={loading ? 'Загрузка…' : `Всего ${data.count} человек`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('parentForm', { onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Иванов Иван…" />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost btn-sm" onClick={reset}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && data.results.length === 0 ? (
            <EmptyState icon={I.search} title="Опекуны не найдены" sub="Попробуйте изменить условия поиска или добавьте нового опекуна" />
          ) : (
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th>ФИО</th><th>Телефон</th><th>Email</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={5} /> : data.results.map(p => (
                  <tr key={p.id} className="row-link" onClick={() => onNavigate('parent-detail', { parentId: p.id })}>
                    <td className="muted mono">{p.id}</td>
                    <td className="fwm">{p.full_name}</td>
                    <td className="muted">{p.phone || '—'}</td>
                    <td className="muted">{p.email || '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openModal('parentForm', { parent: p, onDone: load })}>
                        {I.pencil}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data.num_pages > 1 && (
          <div className="card-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
            <span className="muted" style={{ fontSize: 13 }}>Страница {page} из {data.num_pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.num_pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function ParentDetail({ currentUser, openModal, onNavigate, parentId }) {
  const toast = useToast();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/parents/${parentId}/`).then(r => {
      setParent(r.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.push('Не удалось загрузить данные опекуна', { kind: 'err' });
    });
  };

  useEffect(() => { if (parentId) load(); }, [parentId]);

  const removeStudent = async (spId) => {
    try {
      await api.delete(`/parents/${parentId}/students/${spId}/`);
      toast.push('Студент откреплён', { kind: 'ok' });
      load();
    } catch {
      toast.push('Не удалось открепить студента', { kind: 'err' });
    }
  };

  const handleDeleteRequest = async () => {
    if (!parent) return;
    try {
      await api.post(`/parents/${parentId}/delete-request/`, {});
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
    } catch {
      toast.push('Не удалось создать заявку', { kind: 'err' });
    }
  };

  if (loading || !parent) {
    return (
      <Shell currentUser={currentUser} active="parents" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  return (
    <Shell currentUser={currentUser} active="parents" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Опекуны и родители', href: true, onClick: () => onNavigate('parents') }, { label: parent.full_name }]}
        title={parent.full_name}
        sub="Опекун / родитель"
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('parentForm', { parent, onDone: load })}>{I.pencil}Редактировать</button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Удалить</button>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <Avatar name={parent.full_name} size="lg" className="avatar-zoomy" />
            <h3 style={{ marginTop: 14, marginBottom: 6 }}>{parent.last_name} {parent.first_name}</h3>
            <div className="muted" style={{ fontSize: 13 }}>{parent.middle_name}</div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <dl className="kv">
              {parent.birth_date && <><dt>Дата рождения</dt><dd>{parent.birth_date}</dd></>}
              <dt>Телефон</dt><dd>{parent.phone || '—'}</dd>
              <dt>Email</dt><dd>{parent.email || '—'}</dd>
            </dl>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="title">Привязанные студенты</div>
            <button className="btn btn-secondary btn-sm"
              onClick={() => openModal('parentAddStudent', { parentId, onDone: load })}>
              {I.plus}Привязать студента
            </button>
          </div>
          <div className="card-body flush">
            {parent.students?.length === 0 ? (
              <EmptyState icon={I.search} title="Студенты не привязаны" sub="Нажмите «Привязать студента» чтобы добавить" />
            ) : (
              <table className="tbl">
                <thead><tr><th>Студент</th><th>Связь</th><th>Группа</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {parent.students?.map(s => (
                    <tr key={s.sp_id}>
                      <td className="fwm">
                        <a href="#" onClick={e => { e.preventDefault(); onNavigate('student-detail', { studentId: s.student_id }); }}>
                          {s.student_name}
                        </a>
                      </td>
                      <td>{s.relation_display}</td>
                      <td>{s.group_name || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => removeStudent(s.sp_id)} title="Открепить">{I.x}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SubjectList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/subjects/').then(r => {
      setSubjects(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (s) => {
    if (!confirm(`Удалить предмет «${s.name}»?`)) return;
    try {
      await api.delete(`/subjects/${s.id}/`);
      toast.push('Предмет удалён', { kind: 'ok' });
      load();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка при удалении', { kind: 'err' });
    }
  };

  return (
    <Shell currentUser={currentUser} active="subjects" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Предметы' }]}
        title="Предметы"
        sub={loading ? 'Загрузка…' : `Всего ${subjects.length}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('subjectForm', { onDone: load })}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          {!loading && subjects.length === 0 ? (
            <EmptyState icon={I.book} title="Предметы не добавлены" sub="Нажмите «Добавить» чтобы создать первый предмет" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Название</th><th style={{ width: 80 }}></th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={2} /> : subjects.map(s => (
                  <tr key={s.id}>
                    <td className="fwm">{s.name}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openModal('subjectForm', { subject: s, onDone: load })}>
                        {I.pencil}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDelete(s)}>
                        {I.trash}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

function PositionList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/positions/').then(r => {
      setPositions(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Shell currentUser={currentUser} active="positions" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Должности' }]}
        title="Должности"
        sub={loading ? 'Загрузка…' : `Всего ${positions.length}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('positionForm', { onDone: load })}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          {!loading && positions.length === 0 ? (
            <EmptyState icon={I.briefcase} title="Должности не добавлены" sub="Нажмите «Добавить» чтобы создать первую должность" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Название</th><th>Сотрудников</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={3} /> : positions.map(p => (
                  <tr key={p.id}>
                    <td className="fwm">{p.name}</td>
                    <td className="mono">{p.employee_count}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openModal('positionForm', { position: p, onDone: load })}>
                        {I.pencil}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

export {
  DashboardOwner, DashboardSuper, DashboardAdmin, DashboardTeacher,
  OrganizationList,
  StudentList, StudentDetail,
  EmployeeList, EmployeeDetail,
  GroupList, GroupDetail,
  FacultyList,
  UserList, DeleteRequests, AuditLog,
  ParentList, ParentDetail, SubjectList, PositionList,
};
