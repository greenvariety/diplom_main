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
            ? <SkeletonRows n={5} cols={4} />
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
                  <button className="btn btn-secondary btn-sm" style={{ flex: org.active ? 1 : 0 }} onClick={() => handleEdit(org)}>{I.pencil}Редактировать</button>
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
              ? <SkeletonRows n={5} cols={4} />
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
   StudentList — search + filters + chips + count + skeleton
   ============================================================ */
function StudentList({ openModal }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [fac, setFac] = useState('');
  const [grp, setGrp] = useState('');
  const [stat, setStat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => STUDENTS.filter(s => {
    if (q && !`${s.last} ${s.first} ${s.mid}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fac && s.fac !== fac) return false;
    if (grp && s.group !== grp) return false;
    if (stat && s.status !== stat) return false;
    return true;
  }), [q, fac, grp, stat]);

  const activeFilters = [];
  if (fac)  activeFilters.push({ k: 'fac',  l: `Факультет: ${fac}`,    clr: () => setFac('') });
  if (grp)  activeFilters.push({ k: 'grp',  l: `Группа: ${grp}`,        clr: () => setGrp('') });
  if (stat) activeFilters.push({ k: 'stat', l: `Статус: ${STATUSES[stat]?.label || stat}`, clr: () => setStat('') });

  const reset = () => { setQ(''); setFac(''); setGrp(''); setStat(''); };

  return (
    <Shell role="admin" active="students" openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Студенты' }]}
        title="Студенты"
        sub={loading ? 'Загрузка…' : `Всего 612 человек, найдено по фильтрам — ${filtered.length}`}
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('studentForm')}>{I.plus}Добавить</button>
        </>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Иванов Иван…" /></div>
        </div>
        <div className="field"><label className="field-label">Факультет</label>
          <select className="select" value={fac} onChange={e => setFac(e.target.value)}>
            <option value="">— Все —</option><option>ФИТ</option><option>ФЭ</option><option>ФМН</option>
          </select>
        </div>
        <div className="field"><label className="field-label">Группа</label>
          <select className="select" value={grp} onChange={e => setGrp(e.target.value)}>
            <option value="">— Все —</option><option>ПИ-301</option><option>ПИ-302</option><option>ЭК-201</option><option>ЭК-202</option>
          </select>
        </div>
        <div className="field"><label className="field-label">Статус</label>
          <select className="select" value={stat} onChange={e => setStat(e.target.value)}>
            <option value="">— Все —</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!q && !fac && !grp && !stat}>Сбросить</button>
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
          {filtered.length === 0 && !loading ? (
            <EmptyState
              icon={I.search}
              title="Студенты не найдены"
              sub="Попробуйте изменить условия фильтрации или сбросить фильтры"
              action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить фильтры</button>}
            />
          ) : (
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 50 }}></th><th>ФИО</th><th>Статус</th><th>Факультет</th><th>Группа</th><th>Контакт</th><th style={{ width: 40 }}></th></tr></thead>
              {loading
                ? <SkeletonRows rows={6} cols={8} />
                : <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} className="row-link" onClick={() => openModal('studentDetail', s)}>
                        <td className="muted">{s.id}</td>
                        <td><Avatar name={`${s.last} ${s.first}`} size="sm" av={s.av} /></td>
                        <td className="fwm">{s.last} {s.first} {s.mid}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <StatusDropdown value={s.status} onChange={(v) => toast.push(`Статус изменён на "${STATUSES[v].label}"`, { kind: 'ok' })} />
                        </td>
                        <td>{s.fac}</td>
                        <td>{s.group}</td>
                        <td className="muted">{s.phone}</td>
                        <td><button className="btn btn-ghost btn-icon btn-sm" onClick={e => e.stopPropagation()}>{I.more}</button></td>
                      </tr>
                    ))}
                  </tbody>
              }
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   StudentDetail — drag-drop docs, status dropdown, collapse history
   ============================================================ */
function StudentDetail({ openModal }) {
  const s = STUDENTS[0];
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const onDrop = (e) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) toast.push(`Документ "${f.name}" подготовлен к загрузке`, { kind: 'info' });
  };

  return (
    <Shell role="admin" active="students" openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Студенты', href: true }, { label: `${s.last} ${s.first} ${s.mid}` }]}
        title={`${s.last} ${s.first} ${s.mid}`}
        sub={`#${s.id} · ${s.fac} · ${s.group}`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('studentForm', s)}>{I.pencil}Редактировать</button>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('transfer', s)}>{I.swap}Перевести</button>
          <button className="btn btn-danger btn-sm" onClick={() => openModal('deleteConfirm', { name: `${s.last} ${s.first}`, type: 'студента' })}>{I.trash}Удалить</button>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
              <Avatar name={`${s.last} ${s.first}`} size="lg" av={s.av} className="avatar-zoomy" />
              <h3 style={{ marginTop: 14, marginBottom: 6 }}>{s.last} {s.first}</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{s.mid}</div>
              <StatusDropdown value={s.status} onChange={(v) => toast.push(`Статус изменён на "${STATUSES[v].label}"`, { kind: 'ok' })} />
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <dl className="kv">
                <dt>Дата рождения</dt><dd>{s.dob}</dd>
                <dt>Телефон</dt><dd>{s.phone}</dd>
                <dt>Email</dt><dd>{s.email}</dd>
                <dt>Факультет</dt><dd>{s.fac}</dd>
                <dt>Группа</dt><dd><a href="#">{s.group}</a></dd>
              </dl>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head">
              <div className="title">Опекуны и родители</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('parentForm')}>{I.plus}Добавить</button>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>ФИО</th><th>Связь</th><th>Телефон</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  <tr><td className="fwm">Иванова Елена Васильевна</td><td>Мать</td><td className="muted">+7 900 765-43-21</td><td><button className="btn btn-ghost btn-icon btn-sm">{I.x}</button></td></tr>
                  <tr><td className="fwm">Иванов Иван Петрович</td><td>Отец</td><td className="muted">+7 900 111-22-33</td><td><button className="btn btn-ghost btn-icon btn-sm">{I.x}</button></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="title">Документы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc')}>{I.upload}Загрузить</button>
            </div>
            <div className="card-body">
              <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ marginBottom: 12, padding: 16 }}
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  {I.upload}{over ? 'Отпустите для загрузки' : 'Перетащите файлы сюда или нажмите «Загрузить»'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[{ n: 'Паспорт.pdf', d: '01.01.2026' }, { n: 'Справка.pdf', d: '15.04.2026' }, { n: 'Аттестат.pdf', d: '01.09.2022' }].map(d => (
                  <div key={d.n} className="doc-tile">
                    <div className="doc-icon">{I.doc}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="doc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.n}</div>
                      <div className="doc-meta">{d.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ cursor: 'pointer' }} onClick={() => setHistoryOpen(o => !o)}>
              <div className="title">{I.history}<span>История изменений</span><span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>· 3 события</span></div>
              <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {historyOpen && (
              <div className="card-body flush">
                <table className="tbl">
                  <thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th></tr></thead>
                  <tbody>
                    <tr><td className="mono muted">09.05.2026 14:32</td><td className="fwm">admin1</td><td><Badge>Создал</Badge></td></tr>
                    <tr><td className="mono muted">09.05.2026 15:10</td><td className="fwm">admin1</td><td><Badge>Изменил</Badge></td></tr>
                    <tr><td className="mono muted">10.05.2026 09:24</td><td className="fwm">teacher1</td><td><Badge>Изменил</Badge></td></tr>
                  </tbody>
                </table>
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
function EmployeeList({ openModal }) {
  const [q, setQ] = useState('');
  const filtered = EMPLOYEES.filter(e => !q || `${e.last} ${e.first} ${e.pos}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell role="admin" active="employees" openModal={openModal}>
      <PageHead title="Сотрудники" sub={`Всего 38 человек${q ? `, найдено ${filtered.length}` : ''}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('employeeForm')}>{I.plus}Добавить</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="ФИО или должность…" /></div>
        </div>
        <div className="field"><label className="field-label">Должность</label><select className="select"><option>— Все —</option><option>Преподаватель</option><option>Декан</option></select></div>
        <div className="field"><label className="field-label">Тип</label><select className="select"><option>— Все —</option><option>Преподаватели</option><option>Только админ. персонал</option></select></div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 50 }}></th><th>ФИО</th><th>Должность</th><th>Преподаёт</th><th>Телефон</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="row-link" onClick={() => openModal('employeeDetail', e)}>
                  <td className="muted">{e.id}</td>
                  <td><Avatar name={`${e.last} ${e.first}`} size="sm" av={e.av} /></td>
                  <td className="fwm">{e.last} {e.first} {e.mid}</td>
                  <td>{e.pos}</td>
                  <td>{e.teacher ? <Badge status="enrolled">Да</Badge> : <span className="muted">—</span>}</td>
                  <td className="muted">{e.phone}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" onClick={ev => ev.stopPropagation()}>{I.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function EmployeeDetail({ openModal }) {
  const e = EMPLOYEES[1];
  return (
    <Shell role="admin" active="employees" openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Сотрудники', href: true }, { label: `${e.last} ${e.first}` }]}
        title={`${e.last} ${e.first} ${e.mid}`}
        sub={`${e.pos}${e.teacher ? ' · преподаватель' : ''}`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('employeeForm', e)}>{I.pencil}Редактировать</button>
          <button className="btn btn-danger btn-sm" onClick={() => openModal('deleteConfirm', { name: `${e.last} ${e.first}`, type: 'сотрудника' })}>{I.trash}Удалить</button>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <Avatar name={`${e.last} ${e.first}`} size="lg" av={e.av} className="avatar-zoomy" />
            <h3 style={{ marginTop: 14, marginBottom: 6 }}>{e.last} {e.first}</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{e.mid}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Badge>{e.pos}</Badge>
              {e.teacher && <Badge status="enrolled">Преподаватель</Badge>}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <dl className="kv">
              <dt>Дата рождения</dt><dd>12.07.1985</dd>
              <dt>Телефон</dt><dd>{e.phone}</dd>
              <dt>Email</dt><dd>kuznetsova@edu.ru</dd>
            </dl>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head"><div className="title">Классное руководство</div></div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Группа</th><th>Факультет</th><th>Студентов</th></tr></thead>
                <tbody>
                  <tr className="row-link"><td className="fwm"><a href="#">ПИ-301</a></td><td>ФИТ</td><td className="mono">28</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="title">Ведёт предметы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('assignSubject')}>{I.plus}Назначить</button>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Предмет</th><th>Группа</th><th>Часов</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  <tr><td className="fwm">Базы данных</td><td><a href="#">ПИ-301</a></td><td className="mono">72</td><td><button className="btn btn-ghost btn-icon btn-sm">{I.x}</button></td></tr>
                  <tr><td className="fwm">Веб-программирование</td><td><a href="#">ПИ-302</a></td><td className="mono">54</td><td><button className="btn btn-ghost btn-icon btn-sm">{I.x}</button></td></tr>
                </tbody>
              </table>
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
function GroupList({ openModal }) {
  return (
    <Shell role="admin" active="groups" openModal={openModal}>
      <PageHead title="Группы" sub="Всего 24 группы"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('groupForm')}>{I.plus}Создать группу</button>}
      />
      <div className="filters">
        <div className="field grow-2"><label className="field-label">Поиск</label><div className="input-with-icon">{I.search}<input className="input" placeholder="Название группы…" /></div></div>
        <div className="field"><label className="field-label">Факультет</label><select className="select"><option>— Все —</option><option>ФИТ</option><option>ФЭ</option></select></div>
        <div className="field"><label className="field-label">Год начала</label><select className="select"><option>— Все —</option><option>2024</option><option>2023</option></select></div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Название</th><th>Факультет</th><th>Год</th><th>Классный руководитель</th><th>Студентов</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {GROUPS.map(g => (
                <tr key={g.name} className="row-link" onClick={() => openModal('groupDetail', g)}>
                  <td className="fwm">{g.name}</td>
                  <td>{g.fac}</td>
                  <td className="mono muted">{g.year}</td>
                  <td>{g.curator}</td>
                  <td className="mono">{g.count}</td>
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

function GroupDetail({ openModal }) {
  return (
    <Shell role="admin" active="groups" openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Группы', href: true }, { label: 'ПИ-301' }]}
        title="ПИ-301"
        sub="Факультет информационных технологий · Год набора 2022"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Excel</button>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('groupForm', GROUPS[0])}>{I.pencil}Редактировать</button>
          <button className="btn btn-danger btn-sm" onClick={() => openModal('deleteConfirm', { name: 'ПИ-301', type: 'группу' })}>{I.trash}Удалить</button>
        </>}
      />
      <div className="banner banner-info">
        {I.user}
        <div className="banner-body"><strong>Классный руководитель:</strong> Кузнецова Наталья Андреевна · <a href="#" style={{ color: 'inherit', textDecoration: 'underline' }}>Изменить</a></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="title">Студенты <span className="muted" style={{ fontWeight: 400 }}>· 28</span></div>
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('studentForm')}>{I.plus}Добавить</button>
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th style={{ width: 40 }}>#</th><th>ФИО</th><th>Статус</th></tr></thead>
              <tbody>
                {STUDENTS.slice(0, 5).map(s => (
                  <tr key={s.id} className="row-link" onClick={() => openModal('studentDetail', s)}>
                    <td className="muted">{s.id}</td>
                    <td className="fwm">{s.last} {s.first} {s.mid}</td>
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
              <div className="title">Предметы <span className="muted" style={{ fontWeight: 400 }}>· 3</span></div>
              <button className="btn btn-secondary btn-sm">{I.plus}</button>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              {[{ s: 'Базы данных', t: 'Кузнецова Н. А.' }, { s: 'Веб-программирование', t: 'Кузнецова Н. А.' }, { s: 'Алгоритмы', t: 'Морозов В. Г.' }].map(p => (
                <div key={p.s} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div className="fwm" style={{ fontSize: 13 }}>{p.s}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{p.t}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm">{I.x}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FacultyList({ openModal }) {
  return (
    <Shell role="admin" active="faculties" openModal={openModal}>
      <PageHead title="Факультеты" sub="Всего 5 факультетов"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('facultyForm')}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Код</th><th>Название</th><th>Декан</th><th>Групп</th><th>Студентов</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {FACULTIES.map(f => (
                <tr key={f.code} className="row-link" onClick={() => openModal('facultyDetail', f)}>
                  <td><span className="badge badge-neutral mono" style={{ padding: '1px 6px' }}>{f.code}</span></td>
                  <td className="fwm">{f.name}</td>
                  <td>{f.dean}</td>
                  <td className="mono">{f.groups}</td>
                  <td className="mono">{f.students}</td>
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
function UserList({ openModal }) {
  return (
    <Shell role="owner" active="users" openModal={openModal}>
      <PageHead title="Пользователи системы" sub="Учётные записи и роли"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('userForm')}>{I.plus}Создать пользователя</button>}
      />
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Логин</th><th>ФИО</th><th>Роль</th><th>Последний вход</th><th>Статус</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {[
                { login: 'admin1',   name: 'Дмитриева Ольга Петровна', role: 'Администратор', last: '09.05.2026 13:55', active: true,  cls: 'badge-info' },
                { login: 'admin2',   name: 'Романов Сергей Иванович',  role: 'Администратор', last: '07.05.2026 09:11', active: true,  cls: 'badge-info' },
                { login: 'teacher1', name: 'Кузнецова Наталья А.',     role: 'Преподаватель', last: '09.05.2026 12:10', active: true,  cls: 'badge-ok' },
                { login: 'teacher2', name: 'Морозов Виктор Г.',        role: 'Преподаватель', last: '04.05.2026 18:00', active: true,  cls: 'badge-ok' },
                { login: 'teacher3', name: 'Лебедева Ирина Юрьевна',   role: 'Преподаватель', last: 'никогда',          active: false, cls: 'badge-ok' },
              ].map(u => (
                <tr key={u.login} className="row-link">
                  <td className="mono fwm">{u.login}</td>
                  <td>{u.name}</td>
                  <td><span className={`badge ${u.cls}`}><span className="dot"></span>{u.role}</span></td>
                  <td className="mono muted">{u.last}</td>
                  <td>{u.active ? <Badge status="enrolled">Активен</Badge> : <span className="badge badge-neutral"><span className="dot"></span>Неактивен</span>}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm">{I.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function DeleteRequests({ openModal }) {
  const reqs = [
    { id: 1, type: 'Студент',   target: 'Сидоров Алексей Петрович', author: 'admin1',  date: '09.05.2026 11:20', reason: 'Отчислен по собственному желанию' },
    { id: 2, type: 'Опекун',    target: 'Петрова Светлана Ивановна', author: 'admin1',  date: '08.05.2026 16:45', reason: 'Дубликат записи' },
    { id: 3, type: 'Сотрудник', target: 'Волков Андрей Степанович', author: 'admin2',  date: '08.05.2026 09:30', reason: 'Уволен' },
  ];
  return (
    <Shell role="superadmin" active="delreq" openModal={openModal}>
      <PageHead title="Заявки на удаление" sub="Подтвердите или отклоните заявки от администраторов" />
      <div className="banner banner-info">{I.info}<div className="banner-body">Двухступенчатое удаление: администратор подаёт заявку, суперадмин подтверждает. До подтверждения объект остаётся в системе.</div></div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Тип</th><th>Объект</th><th>Кто подал</th><th>Когда</th><th>Причина</th><th style={{ width: 200 }}>Действия</th></tr></thead>
            <tbody>
              {reqs.map(r => (
                <tr key={r.id}>
                  <td><Badge>{r.type}</Badge></td>
                  <td className="fwm">{r.target}</td>
                  <td className="mono">{r.author}</td>
                  <td className="mono muted">{r.date}</td>
                  <td className="muted">{r.reason}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-danger-solid btn-sm" onClick={() => openModal('approveDelete', r)}>{I.check}Одобрить</button>
                      <button className="btn btn-secondary btn-sm">Отклонить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function AuditLog({ openModal }) {
  const ext = useMemo(() => [
    { ts: '09.05.2026 14:32:11', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'create', label: 'Создал',  obj: 'Студент #612 — Иванов И. И.',     cls: 'badge-ok' },
    { ts: '09.05.2026 13:55:04', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'update', label: 'Изменил', obj: 'Студент #610 — Петрова М. С.',    cls: 'badge-warn' },
    { ts: '09.05.2026 12:10:48', user: 'teacher1',   userName: 'Кузнецова Н. А.', role: 'Преподаватель', action: 'update', label: 'Изменил', obj: 'Группа ПИ-301',                   cls: 'badge-warn' },
    { ts: '08.05.2026 18:04:22', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'delete', label: 'Удалил',  obj: 'Опекун #45',                       cls: 'badge-bad' },
    { ts: '08.05.2026 17:30:00', user: 'superadmin', userName: 'Петров А. С.',    role: 'Суперадмин',    action: 'create', label: 'Создал',  obj: 'Пользователь #8 — teacher2',       cls: 'badge-ok' },
    { ts: '08.05.2026 16:48:15', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'update', label: 'Изменил', obj: 'Сотрудник #4 — Лебедева И. Ю.',    cls: 'badge-warn' },
    { ts: '07.05.2026 09:11:02', user: 'admin2',     userName: 'Романов С. И.',   role: 'Администратор', action: 'create', label: 'Создал',  obj: 'Группа МН-101',                   cls: 'badge-ok' },
    { ts: '06.05.2026 22:14:55', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'update', label: 'Изменил', obj: 'Факультет ФИТ',                    cls: 'badge-warn' },
    { ts: '06.05.2026 19:02:11', user: 'teacher2',   userName: 'Морозов В. Г.',   role: 'Преподаватель', action: 'update', label: 'Изменил', obj: 'Студент #609 — Захарова О. Н.',   cls: 'badge-warn' },
    { ts: '06.05.2026 11:48:30', user: 'admin2',     userName: 'Романов С. И.',   role: 'Администратор', action: 'create', label: 'Создал',  obj: 'Студент #608 — Морозов А. И.',    cls: 'badge-ok' },
    { ts: '05.05.2026 20:01:09', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'delete', label: 'Удалил',  obj: 'Опекун #42',                       cls: 'badge-bad' },
    { ts: '05.05.2026 15:44:21', user: 'teacher1',   userName: 'Кузнецова Н. А.', role: 'Преподаватель', action: 'update', label: 'Изменил', obj: 'Группа ПИ-302',                   cls: 'badge-warn' },
    { ts: '05.05.2026 10:18:50', user: 'superadmin', userName: 'Петров А. С.',    role: 'Суперадмин',    action: 'create', label: 'Создал',  obj: 'Факультет ФМН',                    cls: 'badge-ok' },
    { ts: '04.05.2026 14:23:00', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'update', label: 'Изменил', obj: 'Студент #605 — Новиков Д. О.',    cls: 'badge-warn' },
    { ts: '03.05.2026 11:02:09', user: 'admin2',     userName: 'Романов С. И.',   role: 'Администратор', action: 'delete', label: 'Удалил',  obj: 'Сотрудник #11 — Соколов И. К.',   cls: 'badge-bad' },
    { ts: '02.05.2026 09:30:15', user: 'admin1',     userName: 'Дмитриева О. П.', role: 'Администратор', action: 'create', label: 'Создал',  obj: 'Опекун #46 — Сидоров П. А.',      cls: 'badge-ok' },
  ], []);

  const [q, setQ] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [period, setPeriod] = useState('week');
  const sort = useSortable({ key: 'ts', dir: 'desc' }, 'audit-log');

  const userOpts = useMemo(() => {
    const map = new Map();
    ext.forEach(a => map.set(a.user, { value: a.user, label: a.user, sub: a.role }));
    return Array.from(map.values());
  }, [ext]);

  const filtered = useMemo(() => ext.filter(a => {
    if (q && !`${a.obj} ${a.user} ${a.userName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (userFilter && a.user !== userFilter) return false;
    if (actionFilter && a.action !== actionFilter) return false;
    return true;
  }), [ext, q, userFilter, actionFilter]);

  const sorted = sort.sortFn(filtered, {
    ts: a => a.ts, user: a => a.user, action: a => a.label, obj: a => a.obj,
  });

  const pager = usePager(sorted.length, { key: 'audit-log', defaultSize: 25 });
  const rows = pager.slice(sorted);

  const activeFilters = [];
  if (userFilter) activeFilters.push({ k: 'u', l: `Пользователь: ${userFilter}`, clr: () => setUserFilter('') });
  if (actionFilter) activeFilters.push({ k: 'a', l: `Действие: ${actionFilter === 'create' ? 'Создание' : actionFilter === 'update' ? 'Изменение' : 'Удаление'}`, clr: () => setActionFilter('') });

  return (
    <Shell role="superadmin" active="audit" openModal={openModal}>
      <PageHead title="Журнал изменений"
        sub={`Найдено: ${filtered.length} записей из ${ext.length}`}
        actions={<button className="btn btn-secondary btn-sm">{I.excel}Экспорт</button>}
      />
      <div className="filters">
        <div className="field grow-2"><label className="field-label">Поиск по объекту, пользователю или ФИО</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Студент, группа, admin1, Дмитриева…" /></div>
        </div>
        <div className="field"><label className="field-label">Пользователь</label>
          <Combobox value={userFilter} onChange={setUserFilter} options={userOpts} placeholder="Все пользователи" />
        </div>
        <div className="field"><label className="field-label">Действие</label>
          <Combobox value={actionFilter} onChange={setActionFilter}
            options={[{ value: 'create', label: 'Создание' }, { value: 'update', label: 'Изменение' }, { value: 'delete', label: 'Удаление' }]}
            placeholder="Все действия" />
        </div>
        <div className="field"><label className="field-label">Период</label>
          <Combobox value={period} onChange={setPeriod}
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
          {sorted.length === 0
            ? <EmptyState icon={I.history} title="Записи не найдены" sub="Измените условия фильтрации или сбросьте фильтры"
                action={<button className="btn btn-secondary btn-sm" onClick={() => { setQ(''); setUserFilter(''); setActionFilter(''); }}>Сбросить фильтры</button>} />
            : <table className="tbl">
                <thead><tr>
                  <SortHeader k="ts"     sort={sort}>Дата и время</SortHeader>
                  <SortHeader k="user"   sort={sort}>Пользователь</SortHeader>
                  <SortHeader k="action" sort={sort}>Действие</SortHeader>
                  <SortHeader k="obj"    sort={sort}>Объект</SortHeader>
                  <th style={{ width: 100 }}>Diff</th>
                </tr></thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={pager.start + i} className="row-link" onClick={() => openModal('auditDiff', a)}>
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
        {sorted.length > 0 && <Pager pager={pager} total={sorted.length} />}
      </div>
    </Shell>
  );
}

function ParentList({ openModal }) {
  return (
    <Shell role="admin" active="parents" openModal={openModal}>
      <PageHead title="Опекуны и родители" sub="Всего 421 запись"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('parentForm')}>{I.plus}Добавить</button>}
      />
      <div className="filters">
        <div className="field grow-2"><label className="field-label">Поиск</label><div className="input-with-icon">{I.search}<input className="input" placeholder="ФИО опекуна или студента…" /></div></div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>ФИО</th><th>Связь</th><th>Студент</th><th>Телефон</th><th>Email</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {[
                { n: 'Иванова Елена Васильевна', r: 'Мать',  s: 'Иванов Иван Иванович',     p: '+7 900 765-43-21', e: 'ivanova@mail.ru' },
                { n: 'Иванов Иван Петрович',     r: 'Отец',  s: 'Иванов Иван Иванович',     p: '+7 900 111-22-33', e: '—' },
                { n: 'Петрова Светлана Ивановна',r: 'Мать',  s: 'Петрова Мария Сергеевна',  p: '+7 900 222-44-55', e: 'petrova.s@mail.ru' },
                { n: 'Сидоров Пётр Алексеевич',  r: 'Отец',  s: 'Сидоров Алексей Петрович', p: '+7 900 333-22-11', e: '—' },
                { n: 'Козлов Дмитрий Олегович',  r: 'Опекун',s: 'Козлова Анна Дмитриевна',  p: '+7 900 444-77-88', e: 'kozlov@mail.ru' },
              ].map((p, i) => (
                <tr key={i} className="row-link">
                  <td className="fwm">{p.n}</td>
                  <td>{p.r}</td>
                  <td><a href="#" onClick={e => e.stopPropagation()}>{p.s}</a></td>
                  <td className="muted">{p.p}</td>
                  <td className="muted">{p.e}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" onClick={e => e.stopPropagation()}>{I.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function SubjectList({ openModal }) {
  return (
    <Shell role="admin" active="subjects" openModal={openModal}>
      <PageHead title="Предметы" sub="Всего 32 предмета"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('subjectForm')}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Название</th><th>Факультет</th><th>Часов</th><th>Преподавателей</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {[
                { n: 'Базы данных', f: 'ФИТ', h: 72, t: 2 },
                { n: 'Веб-программирование', f: 'ФИТ', h: 54, t: 1 },
                { n: 'Алгоритмы и структуры данных', f: 'ФИТ', h: 90, t: 2 },
                { n: 'Микроэкономика', f: 'ФЭ', h: 48, t: 1 },
                { n: 'Высшая математика', f: 'ФМН', h: 108, t: 3 },
              ].map(s => (
                <tr key={s.n} className="row-link">
                  <td className="fwm">{s.n}</td>
                  <td>{s.f}</td>
                  <td className="mono">{s.h}</td>
                  <td className="mono">{s.t}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm">{I.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function PositionList({ openModal }) {
  return (
    <Shell role="superadmin" active="positions" openModal={openModal}>
      <PageHead title="Должности" sub="Справочник должностей сотрудников"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('positionForm')}>{I.plus}Добавить</button>}
      />
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Название</th><th>Преподавательская</th><th>Сотрудников</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {[
                { n: 'Декан', t: false, c: 1 },
                { n: 'Зав. кафедрой', t: false, c: 3 },
                { n: 'Преподаватель', t: true, c: 24 },
                { n: 'Ст. преподаватель', t: true, c: 6 },
                { n: 'Методист', t: false, c: 2 },
                { n: 'Лаборант', t: false, c: 2 },
              ].map(p => (
                <tr key={p.n} className="row-link">
                  <td className="fwm">{p.n}</td>
                  <td>{p.t ? <Badge status="enrolled">Да</Badge> : <span className="badge badge-neutral"><span className="dot"></span>Нет</span>}</td>
                  <td className="mono">{p.c}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm">{I.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
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
  ParentList, SubjectList, PositionList,
};
