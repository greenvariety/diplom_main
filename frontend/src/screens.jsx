import { useState, useMemo, useEffect, useRef } from 'react';
import { STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, ORGS, I } from './data.jsx';
import { Shell, PageHead, Badge, Avatar } from './shell.jsx';
import { StatNumber, useToast, Field, EmptyState, SkeletonRows, LoadButton, Combobox, Pager, usePager, useSortable, SortHeader } from './utils.jsx';
import api from './api.js';

const DOC_TYPE_LABEL = { passport: 'Паспорт', snils: 'СНИЛС', policy: 'Полис ОМС', certificate: 'Аттестат', order: 'Приказ', other: 'Прочее' };

/* ============================================================
   Dashboards
   ============================================================ */


function Stat({ label, value, icon, trend, onClick }) {
  return (
    <div className="stat" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
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
  const toast = useToast();
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
      />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Stat label="Факультеты"           value={stats.faculties     ?? '…'} icon={I.building}  onClick={() => onNavigate('faculties')} />
        <Stat label="Группы"               value={stats.groups        ?? '…'} icon={I.users}      onClick={() => onNavigate('groups')} />
        <Stat label="Студенты"             value={stats.students      ?? '…'} icon={I.badge}      onClick={() => onNavigate('students')} />
        <Stat label="Сотрудники"           value={stats.employees     ?? '…'} icon={I.briefcase}  onClick={() => onNavigate('employees')} />
        <Stat label="Пользователи"         value={stats.users         ?? '…'} icon={I.shield}     onClick={() => onNavigate('users')} />
        <Stat label="Предметы"             value={stats.subjects      ?? '…'} icon={I.book}       onClick={() => onNavigate('subjects')} />
        <Stat label="Опекуны"              value={stats.parents       ?? '…'} icon={I.heart}      onClick={() => onNavigate('parents')} />
        <Stat label="Должности"            value={stats.positions     ?? '…'} icon={I.settings}   onClick={() => onNavigate('positions')} />
        <Stat label="Заявки на удаление"   value={stats.pending_delreq ?? '…'} icon={I.trash}     onClick={() => onNavigate('delreq')} />
        <Stat label="Журнал изменений"     value={stats.audit         ?? '…'} icon={I.history}    onClick={() => onNavigate('audit')} />
      </div>
    </Shell>
  );
}

/* ============================================================
   OrganizationList - hover cards with real API
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
    if (org.active) {
      setSelectedOrg(org);
      return;
    }
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
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('orgForm', { onDone: load })}>{I.plus}</button>}
      />
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {orgs.map(org => (
            <div key={org.id} className="card" style={{ border: org.active ? '2px solid var(--accent)' : '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              {org.active && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                  <span className="badge badge-ok"><span className="dot"></span>Активна</span>
                </div>
              )}
              <div className="card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {org.photo ? (
                    <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <img src={org.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: org.active ? 'var(--accent)' : 'var(--surface-alt)', color: org.active ? '#fff' : 'var(--text-muted)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {org.code}
                    </div>
                  )}
                  <div>
                    <div className="fwm" style={{ fontSize: 14 }}>{org.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>Код: {org.code}{org.founded_date ? ` · Основана: ${org.founded_date}` : ''}</div>
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
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleSwitch(org)}>{I.swap}Перейти</button>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleEdit(org)}>{I.settings}Настроить</button>
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
   EmptyOrgOnboarding - new screen for owner who just created an org
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
        sub="Начните с настройки структуры - каждый шаг становится активным после завершения предыдущего."
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
                  {I.plus}
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
  const [stats, setStats] = useState({});
  useEffect(() => { api.get('/dashboard/').then(r => setStats(r.data?.stats || {})).catch(() => {}); }, []);
  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} onLogout={onLogout} openModal={openModal}>
      <PageHead title="Дашборд" sub="Сводка по системе" />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Stat label="Факультеты"          value={stats.faculties  ?? '…'} icon={I.building}  onClick={() => onNavigate('faculties')} />
        <Stat label="Группы"              value={stats.groups     ?? '…'} icon={I.users}      onClick={() => onNavigate('groups')} />
        <Stat label="Студенты"            value={stats.students   ?? '…'} icon={I.badge}      onClick={() => onNavigate('students')} />
        <Stat label="Сотрудники"          value={stats.employees  ?? '…'} icon={I.briefcase}  onClick={() => onNavigate('employees')} />
        <Stat label="Предметы"            value={stats.subjects   ?? '…'} icon={I.book}       onClick={() => onNavigate('subjects')} />
        <Stat label="Опекуны"             value={stats.parents    ?? '…'} icon={I.heart}      onClick={() => onNavigate('parents')} />
        <Stat label="Должности"           value={stats.positions  ?? '…'} icon={I.settings}   onClick={() => onNavigate('positions')} />
        <Stat label="Заявки на удаление"  value={stats.pending_delreq ?? '…'} icon={I.trash}  onClick={() => onNavigate('delreq')} />
        <Stat label="Журнал изменений"    value={stats.audit      ?? '…'} icon={I.history}    onClick={() => onNavigate('audit')} />
      </div>
    </Shell>
  );
}

function DashboardTeacher({ currentUser, onNavigate, onLogout, openModal }) {
  const [stats, setStats] = useState({});
  useEffect(() => { api.get('/dashboard/').then(r => setStats(r.data?.stats || {})).catch(() => {}); }, []);
  return (
    <Shell currentUser={currentUser} active="dashboard" onNavigate={onNavigate} onLogout={onLogout} openModal={openModal}>
      <PageHead title="Дашборд" sub="Сводка по системе" />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Мои группы"   value={stats.groups   ?? '…'} icon={I.users}  onClick={() => onNavigate('groups')} />
        <Stat label="Мои студенты" value={stats.students  ?? '…'} icon={I.badge}  onClick={() => onNavigate('students')} />
        <Stat label="Мои предметы" value={stats.subjects  ?? '…'} icon={I.book}   onClick={() => onNavigate('my-subjects')} />
      </div>
    </Shell>
  );
}


/* ============================================================
   StudentList - поиск + фильтры + пагинация (реальный API)
   ============================================================ */
function StudentList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);
  const sort = useSortable({ key: null, dir: 'asc' }, 'students-list');

  useEffect(() => { api.get('/faculties/').then(r => setFaculties(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (filterFaculty) {
      api.get(`/groups/?faculty_id=${filterFaculty}`).then(r => setGroups(r.data)).catch(() => {});
    } else {
      setGroups([]);
      setFilterGroup('');
    }
  }, [filterFaculty]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    if (filterFaculty) params.set('faculty_id', filterFaculty);
    if (filterGroup) params.set('group_id', filterGroup);
    api.get(`/students/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filterFaculty, filterGroup]);

  const handleSearch = () => { setPage(1); load(); };

  const hasFilters = q || filterFaculty || filterGroup;
  const reset = () => { setQ(''); setFilterFaculty(''); setFilterGroup(''); setPage(1); };

  return (
    <Shell currentUser={currentUser} active="students" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Студенты"
        sub={loading ? 'Загрузка…' : `Всего записей: ${data.count}`}
        actions={currentUser?.role !== 'teacher' ? (
          <button className="btn btn-primary btn-sm" onClick={() => openModal('studentForm', { onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить студента</button>
        ) : null}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Факультет</label>
          <select className="select" value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setFilterGroup(''); setPage(1); }}>
            <option value="">Все</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Группа</label>
          <select className="select" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(1); }} disabled={!filterFaculty}>
            <option value="">Все</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
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
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <th style={{ width: 50 }}></th>
                <SortHeader k="last_name" sort={sort}>ФИО</SortHeader>
                <SortHeader k="faculty_short" sort={sort}>Факультет</SortHeader>
                <SortHeader k="group_name" sort={sort}>Группа</SortHeader>
                <SortHeader k="phone" sort={sort}>Контакт</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              {loading
                ? <SkeletonRows rows={6} cols={8} />
                : <tbody>
                    {sort.sortFn(data.results, {
                        last_name: s => `${s.last_name} ${s.first_name}`,
                        faculty_short: s => s.faculty_short || '',
                        group_name: s => s.group_name || '',
                        phone: s => s.phone || '',
                      }).map((s, idx) => (
                      <tr key={s.id} className="row-link" onClick={() => onNavigate('student-detail', { studentId: s.id })}>
                        <td className="mono muted">{idx + 1}</td>
                        <td><Avatar name={`${s.last_name} ${s.first_name}`} size="sm" src={s.photo} /></td>
                        <td className="fwm">
                          {s.last_name} {s.first_name} {s.middle_name}
                          {s.has_pending_delreq && (
                            <span title="Подана заявка на удаление" style={{ marginLeft: 4, color: 'var(--bad-fg)', fontSize: 13, opacity: 0.8 }}>{I.trash}</span>
                          )}
                        </td>
                        <td>{s.faculty_short}</td>
                        <td>{s.group_name || <span className="muted">-</span>}</td>
                        <td className="muted">{s.phone}</td>
                        <td>{I.chevr}</td>
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
   StudentDetail - профиль, документы, опекуны, история (реальный API)
   ============================================================ */
function StudentDetail({ currentUser, openModal, onNavigate, studentId }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [over, setOver] = useState(false);
  const toast = useToast();
  const sortParents = useSortable({ key: null, dir: 'asc' }, 'std-parents');

  const load = () => {
    setLoading(true);
    api.get(`/students/${studentId}/`).then(r => {
      setStudent(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (studentId) load(); }, [studentId]);

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

  const handleDeleteRequest = async () => {
    try {
      await api.post(`/students/${studentId}/delete-request/`, {});
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
    } catch {
      toast.push('Не удалось создать заявку', { kind: 'err' });
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
        sub={currentUser?.role === 'teacher' ? (student.group_name || 'без группы') : `${student.faculty_short} · ${student.group_name || 'без группы'}`}
        actions={<>
          {['owner', 'admin'].includes(currentUser?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('studentForm', { student, onDone: load })}>{I.pencil}Редактировать</button>
          )}
          {currentUser?.role === 'owner' && (
            <button className="btn btn-danger btn-sm" onClick={() => openModal('ownerDirectDelete', { name: `${student.last_name} ${student.first_name}`, type: 'студента', url: `/students/${student.id}/`, onDone: () => onNavigate('students') })}>{I.trash}Удалить</button>
          )}
          {currentUser?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          )}
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
              {student.photo
                ? <img src={student.photo} alt="" style={{ width: 96, height: 96, borderRadius: 16, objectFit: 'cover' }} className="avatar-zoomy" />
                : <Avatar name={`${student.last_name} ${student.first_name}`} size="lg" className="avatar-zoomy" />
              }
              <h3 style={{ marginTop: 14, marginBottom: 12 }}>
                {[student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ')}
              </h3>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <dl className="kv">
                <dt>Дата рождения</dt><dd>{student.birth_date || '-'}</dd>
                <dt>Телефон</dt><dd>{student.phone || '-'}</dd>
                <dt>Email</dt><dd>{student.email || '-'}</dd>
                <dt>Факультет</dt><dd>{student.faculty_name}</dd>
                <dt>Группа</dt><dd>{student.group_name || <span className="muted">-</span>}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="card-stack">
          <div className="card">
            <div className="card-head">
              <div className="title">Опекуны и родители</div>
              {currentUser?.role !== 'teacher' && <button className="btn btn-secondary btn-sm" onClick={() => openModal('parentForm', { studentId, onDone: load })}>{I.plus}</button>}
            </div>
            <div className="card-body flush">
              {student.parents.length === 0 ? (
                <EmptyState icon={I.user} title="Опекуны не добавлены" sub="Нажмите + чтобы добавить опекуна" />
              ) : (
                <table className="tbl">
                  <thead><tr><th style={{ width: 50 }}></th><SortHeader k="parent_name" sort={sortParents}>ФИО</SortHeader><SortHeader k="relation_display" sort={sortParents}>Связь</SortHeader><SortHeader k="phone" sort={sortParents}>Телефон</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {sortParents.sortFn(student.parents).map(p => (
                      <tr key={p.id} className="row-link" onClick={() => onNavigate('parent-detail', { parentId: p.parent_id })}>
                        <td><Avatar name={p.parent_name} size="sm" src={p.parent_photo} /></td>
                        <td className="fwm">
                          {p.parent_name}
                        </td>
                        <td>{p.relation_display}</td>
                        <td className="muted">{p.phone || '-'}</td>
                        <td>{currentUser?.role !== 'teacher' && <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleRemoveParent(p.id); }}>{I.x}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {currentUser?.role !== 'teacher' && (
            <div className="card">
              <div className="card-head">
                <div className="title">Документы</div>
                <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc', { ownerId: studentId, ownerType: 'student', onDone: load })}>{I.upload}Загрузить</button>
              </div>
              <div className="card-body">
                <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ marginBottom: 12, padding: 16 }}
                  onDragOver={e => { e.preventDefault(); setOver(true); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
                  onDrop={handleDrop}
                >
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>
                    {over ? 'Отпустите для загрузки' : 'Перетащите файлы сюда или нажмите «Загрузить»'}
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
          )}

        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Employees list / detail
   ============================================================ */
function EmployeeList({ currentUser, openModal, onNavigate, filterPositionId, filterPositionName, filterPositionRoleType }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterPos, setFilterPos] = useState(filterPositionId || '');
  const [filterRole, setFilterRole] = useState('');
  const [positions, setPositions] = useState([]);
  const sort = useSortable({ key: null, dir: 'asc' }, 'employees-list');

  useEffect(() => { api.get('/positions/').then(r => setPositions(r.data)).catch(() => {}); }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (q) params.set('search', q);
    if (filterPos) params.set('position_id', filterPos);
    if (filterRole) params.set('role_type', filterRole);
    api.get(`/employees/?${params}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filterPos, filterRole]);

  const handleSearch = () => { setPage(1); load(); };
  const hasFilters = q || filterPos || filterRole;
  const reset = () => { setQ(''); setFilterPos(''); setFilterRole(''); setPage(1); };
  const canManage = ['owner', 'admin'].includes(currentUser?.role);

  const handleDeletePosition = async () => {
    if (currentUser?.role === 'owner') {
      openModal('ownerDirectDelete', {
        name: filterPositionName,
        type: 'должность',
        url: `/positions/${filterPositionId}/`,
        onDone: () => onNavigate('positions'),
      });
    } else {
      if (!window.confirm(`Отправить заявку на удаление должности «${filterPositionName}»?`)) return;
      try {
        await api.post(`/positions/${filterPositionId}/delete-request/`, { reason: `Удаление должности: ${filterPositionName}` });
        toast.push('Заявка на удаление отправлена', { kind: 'ok' });
      } catch (e) {
        toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
      }
    }
  };

  return (
    <Shell currentUser={currentUser} active="employees" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={filterPositionId ? [{ label: 'Должности', href: true, onClick: () => onNavigate('positions') }, { label: filterPositionName }] : undefined}
        title="Сотрудники"
        sub={loading ? 'Загрузка…' : `Всего записей: ${data.count}`}
        actions={<>
          {filterPositionId && canManage && <button className="btn btn-danger btn-sm" onClick={handleDeletePosition}>{I.trash}Удалить должность</button>}
          {filterPositionId && <button className="btn btn-secondary btn-sm" onClick={() => openModal('positionForm', { position: { id: filterPositionId, name: filterPositionName, role_type: filterPositionRoleType }, onDone: load })}>{I.pencil}Редактировать должность</button>}
          <button className="btn btn-primary btn-sm" onClick={() => openModal('employeeForm', { initialPositionId: filterPos || undefined, onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить сотрудника</button>
        </>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Должность</label>
          <select className="select" value={filterPos} onChange={e => { setFilterPos(e.target.value); setPage(1); }}>
            <option value="">Все</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Роль</label>
          <select className="select" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
            <option value="">Все</option>
            <option value="admin">Администратор</option>
            <option value="teacher">Преподаватель</option>
            <option value="none">Без доступа</option>
          </select>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && data.results.length === 0 ? (
            <EmptyState icon={I.search} title="Сотрудники не найдены" sub="Попробуйте изменить поисковый запрос" action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button>} />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <th style={{ width: 50 }}></th>
                <SortHeader k="full_name" sort={sort}>ФИО</SortHeader>
                <SortHeader k="position_name" sort={sort}>Должность</SortHeader>
                <SortHeader k="position_role_type" sort={sort}>Роль</SortHeader>
                <SortHeader k="phone" sort={sort}>Телефон</SortHeader>
                <SortHeader k="email" sort={sort}>Email</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={8} /> : sort.sortFn(data.results, {
                    full_name: e => e.full_name || '',
                    position_name: e => e.position_name || '',
                    position_role_type: e => ({ admin: 'Администратор', teacher: 'Преподаватель', none: 'Без доступа' }[e.position_role_type] || ''),
                    phone: e => e.phone || '',
                    email: e => e.email || '',
                  }).map((e, idx) => (
                  <tr key={e.id} className="row-link" onClick={() => onNavigate('employee-detail', { employeeId: e.id })}>
                    <td className="mono muted">{idx + 1}</td>
                    <td><Avatar name={e.full_name} size="sm" src={e.photo} /></td>
                    <td className="fwm">
                      {e.full_name}
                      {e.has_pending_delreq && (
                        <span title="Подана заявка на удаление" style={{ marginLeft: 4, color: 'var(--bad-fg)', fontSize: 13, opacity: 0.8 }}>{I.trash}</span>
                      )}
                    </td>
                    <td
                      className={e.position_id ? 'row-link' : ''}
                      style={e.position_id ? { cursor: 'pointer' } : {}}
                      onClick={e.position_id ? ev => { ev.stopPropagation(); onNavigate('employees', { filterPositionId: e.position_id, filterPositionName: e.position_name, filterPositionRoleType: e.position_role_type }); } : undefined}
                    >{e.position_name || <span className="muted">-</span>}</td>
                    <td className="muted">{{ admin: 'Администратор', teacher: 'Преподаватель', none: 'Без доступа' }[e.position_role_type] || <span className="muted">-</span>}</td>
                    <td className="muted">{e.phone || '-'}</td>
                    <td className="muted">{e.email || '-'}</td>
                    <td>{I.chevr}</td>
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

  // Account block state
  const [account, setAccount] = useState(undefined);
  const [accShowCreate, setAccShowCreate] = useState(false);
  const [accUsername, setAccUsername] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accPassword2, setAccPassword2] = useState('');
  const [accErr, setAccErr] = useState('');
  const [accSaving, setAccSaving] = useState(false);

  const [teacherTab, setTeacherTab] = useState('subjects');
  const sortEmpGroups = useSortable({ key: null, dir: 'asc' }, 'emp-groups');
  const sortEmpSubjects = useSortable({ key: null, dir: 'asc' }, 'emp-subjects');
  const sortEmpAssignments = useSortable({ key: null, dir: 'asc' }, 'emp-assignments');

  const loadAccount = () => {
    if (currentUser?.role !== 'owner') return;
    api.get(`/employees/${employeeId}/account/`)
      .then(r => {
        setAccount(r.data);
        if (r.data.exists) {
          setAccUsername(r.data.username);
          setAccPassword('');
          setAccPassword2('');
        }
      })
      .catch(() => setAccount(null));
  };

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

  useEffect(() => {
    if (employeeId) {
      load();
      loadAccount();
    }
  }, [employeeId]);

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

  const validateAccPassword = (pwd) => {
    const errs = [];
    if (pwd.length < 8) errs.push('не менее 8 символов');
    if (!/[A-Za-z]/.test(pwd)) errs.push('латинские буквы');
    if (!/\d/.test(pwd)) errs.push('цифра');
    return errs;
  };

  const handleCreateAccount = async () => {
    setAccErr('');
    if (!accUsername.trim()) { setAccErr('Введите логин'); return; }
    if (!accPassword) { setAccErr('Введите пароль'); return; }
    const pwdErrs = validateAccPassword(accPassword);
    if (pwdErrs.length) { setAccErr('Пароль должен содержать: ' + pwdErrs.join(', ')); return; }
    if (accPassword !== accPassword2) { setAccErr('Пароли не совпадают'); return; }
    setAccSaving(true);
    try {
      const r = await api.post(`/employees/${employeeId}/account/`, {
        username: accUsername.trim(), role: employee.position_role_type || 'teacher', password: accPassword,
      });
      setAccount(r.data);
      setAccShowCreate(false);
      setAccPassword('');
      setAccPassword2('');
      toast.push('Аккаунт создан', { kind: 'ok' });
    } catch (e) {
      setAccErr(e.response?.data?.error || 'Ошибка при создании');
    } finally {
      setAccSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    setAccErr('');
    if (!accUsername.trim()) { setAccErr('Введите логин'); return; }
    if (accPassword) {
      const pwdErrs = validateAccPassword(accPassword);
      if (pwdErrs.length) { setAccErr('Пароль должен содержать: ' + pwdErrs.join(', ')); return; }
      if (accPassword !== accPassword2) { setAccErr('Пароли не совпадают'); return; }
    }
    setAccSaving(true);
    try {
      const payload = { username: accUsername.trim(), role: employee.position_role_type || 'teacher' };
      if (accPassword) payload.password = accPassword;
      const r = await api.patch(`/employees/${employeeId}/account/`, payload);
      setAccount(r.data);
      setAccPassword('');
      setAccPassword2('');
      toast.push('Аккаунт обновлён', { kind: 'ok' });
    } catch (e) {
      setAccErr(e.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setAccSaving(false);
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
          {['owner', 'admin'].includes(currentUser?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('employeeForm', { employee, onDone: load })}>{I.pencil}Редактировать</button>
          )}
          {currentUser?.role === 'owner' && (
            <button className="btn btn-danger btn-sm" onClick={() => openModal('ownerDirectDelete', { name: employee.full_name, type: 'сотрудника', url: `/employees/${employeeId}/`, onDone: () => onNavigate('employees') })}>{I.trash}Удалить</button>
          )}
          {currentUser?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          )}
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
              {employee.photo
                ? <img src={employee.photo} alt="" style={{ width: 96, height: 96, borderRadius: 16, objectFit: 'cover' }} className="avatar-zoomy" />
                : <Avatar name={employee.full_name} size="lg" className="avatar-zoomy" />
              }
              <h3 style={{ marginTop: 14, marginBottom: 12 }}>
                {[employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' ')}
              </h3>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <dl className="kv">
                {employee.birth_date && <><dt>Дата рождения</dt><dd>{employee.birth_date}</dd></>}
                <dt>Телефон</dt><dd>{employee.phone || '-'}</dd>
                <dt>Email</dt><dd>{employee.email || '-'}</dd>
              </dl>
            </div>
          </div>

          {/* Account block - owner only */}
          {currentUser?.role === 'owner' && account !== undefined && employee.position_role_type !== 'none' && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <div className="title">{I.key}Аккаунт</div>
              </div>
              <div className="card-body">
                {!account?.exists ? (
                  !accShowCreate ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="muted" style={{ fontSize: 13 }}>Нет аккаунта</span>
                      <button className="btn btn-primary btn-sm" onClick={() => { setAccShowCreate(true); setAccUsername(''); setAccPassword(''); setAccErr(''); }}>
                        Создать аккаунт
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Field label="Логин" required>
                        <input className={`input${accErr && !accUsername.trim() ? ' is-error' : ''}`} value={accUsername} onChange={e => { setAccUsername(e.target.value.replace(/[^a-zA-Z0-9._\-]/g, '')); setAccErr(''); }} onBeforeInput={e => { if (e.data && /[^a-zA-Z0-9._\-]/.test(e.data)) e.preventDefault(); }} maxLength={150} />
                      </Field>
                      <Field label="Пароль" required>
                        <input type="password" className={`input${accErr && !accPassword ? ' is-error' : ''}`} value={accPassword} onChange={e => { setAccPassword(e.target.value.replace(/[^\x00-\x7F]/g, '')); setAccErr(''); }} maxLength={128} />
                      </Field>
                      {accPassword && validateAccPassword(accPassword).length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>Пароль должен содержать: {validateAccPassword(accPassword).join(', ')}</div>
                      )}
                      <Field label="Повторите пароль" required>
                        <input type="password" className={`input${accErr === 'Пароли не совпадают' ? ' is-error' : ''}`} value={accPassword2} onChange={e => { setAccPassword2(e.target.value.replace(/[^\x00-\x7F]/g, '')); setAccErr(''); }} maxLength={128} />
                      </Field>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Роль: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{{ admin: 'Администратор', teacher: 'Преподаватель', none: 'Прочие сотрудники' }[employee.position_role_type] || 'Не определена'}</span></div>
                      {accErr && <div style={{ color: 'var(--bad-fg)', fontSize: 13 }}>{accErr}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setAccShowCreate(false); setAccErr(''); setAccPassword(''); setAccPassword2(''); }}>Отмена</button>
                        <LoadButton className="btn btn-primary btn-sm" loading={accSaving} onClick={handleCreateAccount}>Создать</LoadButton>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Field label="Логин" required>
                      <input className={`input${accErr && !accUsername.trim() ? ' is-error' : ''}`} value={accUsername} onChange={e => { setAccUsername(e.target.value.replace(/[^a-zA-Z0-9._\-]/g, '')); setAccErr(''); }} onBeforeInput={e => { if (e.data && /[^a-zA-Z0-9._\-]/.test(e.data)) e.preventDefault(); }} maxLength={150} />
                    </Field>
                    <Field label="Новый пароль">
                      <input type="password" className="input" value={accPassword} onChange={e => { setAccPassword(e.target.value.replace(/[^\x00-\x7F]/g, '')); setAccErr(''); }} maxLength={128} />
                    </Field>
                    {accPassword && validateAccPassword(accPassword).length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>Пароль должен содержать: {validateAccPassword(accPassword).join(', ')}</div>
                    )}
                    {accPassword && (
                      <Field label="Повторите пароль">
                        <input type="password" className={`input${accErr === 'Пароли не совпадают' ? ' is-error' : ''}`} value={accPassword2} onChange={e => { setAccPassword2(e.target.value.replace(/[^\x00-\x7F]/g, '')); setAccErr(''); }} maxLength={128} />
                      </Field>
                    )}
                    {!accPassword && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>Оставьте пустым, чтобы не менять пароль</div>}
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Роль: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{{ admin: 'Администратор', teacher: 'Преподаватель', none: 'Прочие сотрудники' }[employee.position_role_type] || 'Не определена'}</span></div>
                    {accErr && <div style={{ color: 'var(--bad-fg)', fontSize: 13 }}>{accErr}</div>}
                    <LoadButton className="btn btn-primary btn-sm" loading={accSaving} onClick={handleSaveAccount}>Сохранить</LoadButton>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(employee.position_role_type === 'teacher' || (employee.taught_subjects || []).length > 0 || (employee.subjects || []).length > 0 || (employee.headed_groups || []).length > 0) && (
            <div className="card">
              <div className="card-head" style={{ flexWrap: 'wrap', gap: 0 }}>
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', width: '100%' }}>
                  {[
                    { key: 'subjects', label: 'Предметы' },
                    { key: 'assignments', label: 'Назначения' },
                    { key: 'headteacher', label: 'Классный руководитель' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTeacherTab(t.key)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px',
                        fontSize: 13, fontWeight: teacherTab === t.key ? 600 : 400,
                        color: teacherTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: teacherTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                        marginBottom: -2,
                      }}
                    >{t.label}</button>
                  ))}
                  <div style={{ flex: 1 }} />
                  {teacherTab === 'subjects' && ['owner', 'admin'].includes(currentUser?.role) && (
                    <button className="btn btn-secondary btn-sm" style={{ margin: '6px 8px' }}
                      onClick={() => openModal('employeeAddTaughtSubject', { employeeId, alreadyIds: (employee.taught_subjects || []).map(s => s.id), onDone: load })}>
                      {I.plus}
                    </button>
                  )}
                  {teacherTab === 'assignments' && ['owner', 'admin'].includes(currentUser?.role) && (
                    <button className="btn btn-secondary btn-sm" style={{ margin: '6px 8px' }}
                      onClick={() => openModal('employeeAssignSubject', { employeeId, taughtSubjects: employee.taught_subjects || [], onDone: load })}>
                      {I.plus}
                    </button>
                  )}
                  {teacherTab === 'headteacher' && ['owner', 'admin'].includes(currentUser?.role) && (
                    <button className="btn btn-secondary btn-sm" style={{ margin: '6px 8px' }}
                      onClick={() => openModal('employeeSetHeadteacher', { employeeId, employeeName: employee.full_name, alreadyGroupIds: (employee.headed_groups || []).map(g => g.id), onDone: load })}>
                      {I.plus}
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body flush">
                {teacherTab === 'subjects' && (
                  (employee.taught_subjects || []).length === 0
                    ? <EmptyState icon={I.briefcase} title="Предметы не добавлены" sub="Нажмите + чтобы добавить предмет" />
                    : (
                      <table className="tbl">
                        <thead><tr><SortHeader k="name" sort={sortEmpSubjects}>Предмет</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                        <tbody>
                          {sortEmpSubjects.sortFn(employee.taught_subjects || [], { name: s => s.name || '' }).map(s => (
                            <tr key={s.id}>
                              <td className="fwm row-link" style={{ cursor: 'pointer' }} onClick={() => onNavigate('subject-detail', { subjectId: s.id })}>{s.name}</td>
                              <td>
                                {['owner', 'admin'].includes(currentUser?.role) && (
                                  <button className="btn btn-ghost btn-icon btn-sm" title="Убрать"
                                    onClick={async () => {
                                      try {
                                        await api.delete(`/employees/${employeeId}/taught-subjects/${s.id}/`);
                                        load();
                                      } catch { }
                                    }}>{I.x}</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}
                {teacherTab === 'assignments' && (
                  (employee.subjects || []).length === 0
                    ? <EmptyState icon={I.briefcase} title="Назначений нет" sub="Нажмите + чтобы назначить предмет в группу" />
                    : (
                      <table className="tbl">
                        <thead><tr><SortHeader k="subject_name" sort={sortEmpAssignments}>Предмет</SortHeader><SortHeader k="group_name" sort={sortEmpAssignments}>Группа</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                        <tbody>
                          {sortEmpAssignments.sortFn(employee.subjects || [], {
                            subject_name: s => s.subject_name || '',
                            group_name: s => s.group_name || '',
                          }).map(s => (
                            <tr key={s.assignment_id}>
                              <td className="fwm row-link" style={{ cursor: 'pointer' }} onClick={() => onNavigate('subject-detail', { subjectId: s.subject_id })}>{s.subject_name}</td>
                              <td className="row-link" style={{ cursor: 'pointer' }} onClick={() => onNavigate('group-detail', { groupId: s.group_id })}>{s.group_name}</td>
                              <td>
                                {['owner', 'admin'].includes(currentUser?.role) && (
                                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeSubject(s.assignment_id)} title="Убрать">{I.x}</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}
                {teacherTab === 'headteacher' && (
                  (employee.headed_groups || []).length === 0
                    ? <EmptyState icon={I.users} title="Нет групп" sub="Этот преподаватель не является классным руководителем" />
                    : (
                      <table className="tbl">
                        <thead><tr><SortHeader k="name" sort={sortEmpGroups}>Группа</SortHeader><SortHeader k="faculty_short" sort={sortEmpGroups}>Факультет</SortHeader><SortHeader k="student_count" sort={sortEmpGroups}>Студентов</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                        <tbody>
                          {sortEmpGroups.sortFn(employee.headed_groups, {
                            name: g => g.name,
                            faculty_short: g => g.faculty_short || '',
                            student_count: g => g.student_count,
                          }).map(g => (
                            <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                              <td className="fwm">{g.name}</td>
                              <td>{g.faculty_short}</td>
                              <td className="mono">{g.student_count}</td>
                              <td>{I.chevr}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}
              </div>
            </div>
          )}
          {!['teacher', 'admin'].includes(employee.position_role_type) && employee.headed_groups?.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="title">Классное руководство</div></div>
              <div className="card-body flush">
                <table className="tbl">
                  <thead><tr><SortHeader k="name" sort={sortEmpGroups}>Группа</SortHeader><SortHeader k="faculty_short" sort={sortEmpGroups}>Факультет</SortHeader><SortHeader k="student_count" sort={sortEmpGroups}>Студентов</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {sortEmpGroups.sortFn(employee.headed_groups, {
                      name: g => g.name,
                      faculty_short: g => g.faculty_short || '',
                      student_count: g => g.student_count,
                    }).map(g => (
                      <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                        <td className="fwm">{g.name}</td>
                        <td>{g.faculty_short}</td>
                        <td className="mono">{g.student_count}</td>
                        <td>{I.chevr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-head">
              <div className="title">Документы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc', { ownerType: 'employee', ownerId: employeeId, onDone: load })}>{I.upload}Загрузить</button>
            </div>
            <div className="card-body">
              {!employee.documents?.length ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Документы не загружены</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {employee.documents.map(d => (
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

        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Groups list / detail; Faculties list
   ============================================================ */
function GroupList({ currentUser, openModal, onNavigate }) {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterHeadteacher, setFilterHeadteacher] = useState('');
  const sort = useSortable({ key: null, dir: 'asc' }, 'groups-list');

  const load = () => {
    setLoading(true);
    api.get('/groups/').then(r => {
      setGroups(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const faculties = [...new Map(groups.filter(g => g.faculty_id).map(g => [g.faculty_id, { id: g.faculty_id, short: g.faculty_short }])).values()].sort((a, b) => a.short.localeCompare(b.short));
  const years = [...new Set(groups.map(g => g.year))].sort((a, b) => a - b);
  const headteachers = [...new Map(groups.filter(g => g.headteacher_id).map(g => [g.headteacher_id, { id: g.headteacher_id, name: g.headteacher_name }])).values()].sort((a, b) => a.name.localeCompare(b.name));

  const filtered = sort.sortFn(
    groups.filter(g => {
      if (q && ![g.name, g.headteacher_name, g.faculty_short, g.faculty_name].some(v => v?.toLowerCase().includes(q.toLowerCase()))) return false;
      if (filterFaculty && String(g.faculty_id) !== filterFaculty) return false;
      if (filterYear && String(g.year) !== filterYear) return false;
      if (filterHeadteacher && String(g.headteacher_id) !== filterHeadteacher) return false;
      return true;
    }),
    { name: g => g.name, faculty_short: g => g.faculty_short || '', year: g => g.year, headteacher_name: g => g.headteacher_name || '', student_count: g => g.student_count }
  );

  const hasFilters = q || filterFaculty || filterYear || filterHeadteacher;
  const reset = () => { setQ(''); setFilterFaculty(''); setFilterYear(''); setFilterHeadteacher(''); };

  return (
    <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Группы"
        sub={loading ? '…' : `Всего записей: ${filtered.length}`}
        actions={currentUser?.role !== 'teacher' ? <button className="btn btn-primary btn-sm" onClick={() => openModal('groupForm', { onDone: load })}>{I.plus}Добавить группу</button> : null}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} /></div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Факультет</label>
          <select className="select" value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)}>
            <option value="">Все</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Год начала</label>
          <select className="select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">Все</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {currentUser?.role !== 'teacher' && (
          <div className="field grow-2">
            <label className="field-label">Классный руководитель</label>
            <select className="select" value={filterHeadteacher} onChange={e => setFilterHeadteacher(e.target.value)}>
              <option value="">Все</option>
              {headteachers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && filtered.length === 0 ? (
            <EmptyState icon={I.search} title="Группы не найдены" sub="Попробуйте изменить поисковый запрос" action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button>} />
          ) : (
          <table className="tbl">
            <thead><tr>
              <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
              <SortHeader k="name" sort={sort}>Название</SortHeader>
              <SortHeader k="faculty_short" sort={sort}>Факультет</SortHeader>
              <SortHeader k="year" sort={sort}>Год</SortHeader>
              {currentUser?.role !== 'teacher' && <SortHeader k="headteacher_name" sort={sort}>Классный руководитель</SortHeader>}
              <SortHeader k="student_count" sort={sort}>Студентов</SortHeader>
              <th style={{ width: 40 }}></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} rows={4} />
              ) : filtered.map((g, idx) => (
                <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                  <td className="mono muted">{idx + 1}</td>
                  <td className="fwm">
                    {g.name}
                    {g.has_pending_delreq && (
                      <span title="Подана заявка на удаление" style={{ marginLeft: 4, color: 'var(--bad-fg)', fontSize: 13, opacity: 0.8 }}>{I.trash}</span>
                    )}
                  </td>
                  <td>{g.faculty_short}</td>
                  <td className="mono muted">{g.year}</td>
                  {currentUser?.role !== 'teacher' && <td>{g.headteacher_name || '-'}</td>}
                  <td className="mono">{g.student_count}</td>
                  <td>{I.chevr}</td>
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

function GroupDetail({ currentUser, openModal, onNavigate, groupId }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sortGroupStudents = useSortable({ key: null, dir: 'asc' }, 'group-students');

  const load = () => {
    setLoading(true);
    setError(false);
    api.get(`/groups/${groupId}/`).then(r => {
      setGroup(r.data);
      setLoading(false);
    }).catch(() => { setLoading(false); setError(true); });
  };

  useEffect(() => { if (groupId) load(); }, [groupId]);

  if (loading) {
    return (
      <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  if (error || !group) {
    return (
      <Shell currentUser={currentUser} active="groups" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Не удалось загрузить группу</div>
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
        actions={currentUser?.role !== 'teacher' ? <>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('groupForm', { group, onDone: load })}>{I.pencil}Редактировать</button>
          {currentUser?.role === 'owner'
            ? <button className="btn btn-danger btn-sm" onClick={() => openModal('ownerDirectDelete', { name: group.name, type: 'группу', url: `/groups/${groupId}/`, onDone: () => onNavigate('groups') })}>{I.trash}Удалить</button>
            : <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          }
        </> : null}
      />
      {group.headteacher_name && (
        <div className="card" style={{ marginBottom: 16 }}>
          <table className="tbl">
            <tbody>
              <tr
                className={currentUser?.role !== 'teacher' ? 'row-link' : ''}
                onClick={currentUser?.role !== 'teacher' ? () => onNavigate('employee-detail', { employeeId: group.headteacher_id }) : undefined}
              >
                <td className="muted" style={{ width: 32 }}>{I.user}</td>
                <td className="muted" style={{ width: 180 }}>Классный руководитель</td>
                <td className="fwm">
                  {group.headteacher_name}
                </td>
                <td style={{ width: 32 }}>{currentUser?.role !== 'teacher' ? I.chevr : null}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="title">Студенты<span className="muted" style={{ fontWeight: 700 }}>: {group.students.length}</span></div>
            {['owner', 'admin'].includes(currentUser?.role) && (
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('studentForm', { preGroupId: groupId, preFacultyId: group.faculty_id, onDone: load })}>{I.plus}</button>
            )}
          </div>
          <div className="card-body flush">
            {group.students.length === 0 ? (
              <EmptyState icon={I.users} title="Студенты не добавлены" sub="Нажмите + чтобы добавить студента" />
            ) : (
              <table className="tbl">
                <thead><tr><SortHeader k="last_name" sort={sortGroupStudents}>ФИО</SortHeader><th></th></tr></thead>
                <tbody>
                  {sortGroupStudents.sortFn(group.students, {
                    last_name: s => `${s.last_name} ${s.first_name}`,
                  }).map(s => (
                    <tr key={s.id} className="row-link" onClick={() => onNavigate('student-detail', { studentId: s.id })}>
                      <td className="fwm">
                        {s.last_name} {s.first_name} {s.middle_name}
                      </td>
                      <td>{I.chevr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head">
              <div className="title">Предметы<span className="muted" style={{ fontWeight: 700 }}>: {group.subjects.length}</span></div>
              {currentUser?.role !== 'teacher' && <button className="btn btn-secondary btn-sm" onClick={() => openModal('assignSubject', { groupId, onDone: load })}>{I.plus}</button>}
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              {group.subjects.length === 0 ? (
                <EmptyState icon={I.book} title="Предметы не назначены" sub="Нажмите + чтобы добавить предмет" />
              ) : group.subjects.map(a => (
                <div key={a.id} style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, padding: '8px 0' }}>
                    <div
                      className="fwm"
                      style={{ fontSize: 13, cursor: currentUser?.role !== 'teacher' ? 'pointer' : 'default' }}
                      onClick={currentUser?.role !== 'teacher' ? () => onNavigate('subject-detail', { subjectId: a.subject_id }) : undefined}
                    >{a.subject_name}</div>
                    <div
                      className="muted"
                      style={{ fontSize: 11, cursor: currentUser?.role !== 'teacher' ? 'pointer' : 'default' }}
                      onClick={currentUser?.role !== 'teacher' ? () => onNavigate('employee-detail', { employeeId: a.employee_id }) : undefined}
                    >
                      {a.employee_name}
                    </div>
                  </div>
                  {currentUser?.role !== 'teacher' && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveSubject(a.id)}>{I.x}</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FacultyDetail({ currentUser, openModal, onNavigate, facultyId }) {
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const sortFacGroups = useSortable({ key: null, dir: 'asc' }, 'fac-groups');

  const load = () => {
    setLoading(true);
    api.get(`/faculties/${facultyId}/`).then(r => {
      setFaculty(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (facultyId) load(); }, [facultyId]);

  if (loading || !faculty) {
    return (
      <Shell currentUser={currentUser} active="faculties" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  const handleDeleteRequest = async () => {
    if (!confirm(`Отправить заявку на удаление факультета «${faculty.full_name}»?`)) return;
    try {
      await api.post(`/faculties/${facultyId}/delete-request/`, { reason: `Удаление факультета: ${faculty.full_name}` });
      onNavigate('faculties');
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка при отправке заявки');
    }
  };

  return (
    <Shell currentUser={currentUser} active="faculties" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Факультеты', href: true, onClick: () => onNavigate('faculties') }, { label: faculty.short_name }]}
        title={faculty.full_name}
        sub={`Код: ${faculty.short_name}`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('facultyForm', { faculty, onDone: load })}>{I.pencil}Редактировать</button>
          {currentUser?.role === 'owner'
            ? <button className="btn btn-danger btn-sm" onClick={() => openModal('ownerDirectDelete', { name: faculty.full_name, type: 'факультет', url: `/faculties/${facultyId}/`, onDone: () => onNavigate('faculties') })}>{I.trash}Удалить</button>
            : <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          }
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="title">Группы<span className="muted" style={{ fontWeight: 700 }}>: {faculty.groups.length}</span></div>
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('groupForm', { onDone: load, facultyId: faculty.id })}>{I.plus}</button>
          </div>
          <div className="card-body flush">
            {faculty.groups.length === 0 ? (
              <EmptyState icon={I.users} title="Групп нет" sub="Нажмите + чтобы создать группу" />
            ) : (
              <table className="tbl">
                <thead><tr><SortHeader k="name" sort={sortFacGroups}>Название</SortHeader><SortHeader k="year" sort={sortFacGroups}>Год набора</SortHeader><SortHeader k="student_count" sort={sortFacGroups}>Студентов</SortHeader><SortHeader k="headteacher_name" sort={sortFacGroups}>Кл. руководитель</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {sortFacGroups.sortFn(faculty.groups, {
                    name: g => g.name,
                    year: g => g.year,
                    student_count: g => g.student_count,
                    headteacher_name: g => g.headteacher_name || '',
                  }).map(g => (
                    <tr key={g.id} className="row-link" onClick={() => onNavigate('group-detail', { groupId: g.id })}>
                      <td className="fwm">{g.name}</td>
                      <td className="mono">{g.year}</td>
                      <td className="mono">{g.student_count}</td>
                      <td className="muted">{g.headteacher_name || '-'}</td>
                      <td>{I.chevr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="title">Сведения</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Аббревиатура: </span><span className="mono">{faculty.short_name}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Групп: </span><span className="mono">{faculty.group_count}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Студентов: </span><span className="mono">{faculty.student_count}</span></div>
            {faculty.created_at && <div><span style={{ color: 'var(--text-muted)' }}>Основан: </span><span>{faculty.created_at}</span></div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FacultyList({ currentUser, openModal, onNavigate }) {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const sort = useSortable({ key: null, dir: 'asc' }, 'faculties-list');

  const load = () => {
    setLoading(true);
    api.get('/faculties/').then(r => {
      setFaculties(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const displayFaculties = sort.sortFn(
    q ? faculties.filter(f => f.full_name.toLowerCase().includes(q.toLowerCase()) || f.short_name.toLowerCase().includes(q.toLowerCase())) : faculties,
    { short_name: f => f.short_name, full_name: f => f.full_name, group_count: f => f.group_count, student_count: f => f.student_count }
  );

  return (
    <Shell currentUser={currentUser} active="faculties" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Факультеты"
        sub={loading ? '…' : `Всего записей: ${displayFaculties.length}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('facultyForm', { onDone: load })}>{I.plus}Добавить факультет</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по названию или коду</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => setQ('')} disabled={!q}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && displayFaculties.length === 0 ? (
            <EmptyState icon={I.search} title="Факультеты не найдены" sub="Попробуйте изменить поисковый запрос" action={<button className="btn btn-secondary btn-sm" onClick={() => setQ('')}>Сбросить</button>} />
          ) : (
          <table className="tbl">
            <thead>
              <tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <SortHeader k="short_name" sort={sort}>Код</SortHeader>
                <SortHeader k="full_name" sort={sort}>Название</SortHeader>
                <SortHeader k="group_count" sort={sort}>Групп</SortHeader>
                <SortHeader k="student_count" sort={sort}>Студентов</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} rows={4} />
              ) : displayFaculties.map((f, idx) => (
                <tr key={f.id} className="row-link" onClick={() => onNavigate('faculty-detail', { facultyId: f.id })}>
                  <td className="mono muted">{idx + 1}</td>
                  <td className="mono">{f.short_name}</td>
                  <td className="fwm">{f.full_name}</td>
                  <td className="mono">{f.group_count}</td>
                  <td className="mono">{f.student_count}</td>
                  <td>{I.chevr}</td>
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

/* ============================================================
   Admin: users / delete requests / audit
   ============================================================ */
const ROLE_CLS = { owner: 'badge-bad', admin: 'badge-info', teacher: 'badge-ok' };

function UserList({ currentUser, openModal, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const sort = useSortable({ key: null, dir: 'asc' }, 'users-list');

  const load = () => {
    setLoading(true);
    api.get('/users/').then(r => {
      setUsers(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRowClick = (u) => {
    openModal('userForm', { user: u, onDone: load });
  };

  const ROLES = [{ v: 'owner', l: 'Владелец' }, { v: 'admin', l: 'Администратор' }, { v: 'teacher', l: 'Преподаватель' }];
  const hasFilters = q || filterRole;
  const reset = () => { setQ(''); setFilterRole(''); };

  return (
    <Shell currentUser={currentUser} active="users" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Пользователи системы"
        sub={loading ? 'Загрузка…' : `Всего записей: ${users.length}`}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Роль</label>
          <select className="select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Все</option>
            {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && users.length === 0 ? (
            <EmptyState icon={I.users} title="Пользователи не найдены" sub="Попробуйте изменить поисковый запрос" action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button>} />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <SortHeader k="employee_name" sort={sort}>Сотрудник</SortHeader>
                <SortHeader k="username" sort={sort}>Логин</SortHeader>
                <SortHeader k="role" sort={sort}>Роль</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={5} /> : sort.sortFn(
                  users.filter(u => {
                    if (q && !(u.employee_name || '').toLowerCase().includes(q.toLowerCase()) && !u.username.toLowerCase().includes(q.toLowerCase())) return false;
                    if (filterRole && u.role !== filterRole) return false;
                    return true;
                  }),
                  {
                    employee_name: u => u.employee_name || '',
                    username: u => u.username,
                    role: u => u.role_display || '',
                  }
                ).map((u, idx) => (
                  <tr key={u.id} className="row-link" onClick={() => handleRowClick(u)}>
                    <td className="mono muted">{idx + 1}</td>
                    <td className="fwm">{u.employee_name || <span className="muted">-</span>}</td>
                    <td className="mono">{u.username}</td>
                    <td>{u.role_display}</td>
                    <td>{I.chevr}</td>
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
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const toast = useToast();
  const sort = useSortable({ key: null, dir: 'asc' }, 'delreq-list');

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

  const cancel = async (id) => {
    try {
      await api.post(`/delete-requests/${id}/cancel/`);
      toast.push('Заявка отозвана', { kind: 'ok' });
      load();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
    }
  };

  const typeOpts = [...new Set(reqs.map(r => r.type_label).filter(Boolean))].sort();
  const lq = q.toLowerCase();
  const filtered = sort.sortFn(
    reqs.filter(r => {
      if (q && ![r.object_repr, r.author, r.type_label, r.reason].some(v => v?.toLowerCase().includes(lq))) return false;
      if (filterType && r.type_label !== filterType) return false;
      return true;
    }),
    {
      type_label: r => r.type_label || '',
      object_repr: r => r.object_repr || '',
      author: r => r.author || '',
      created_at: r => r.created_at || '',
    }
  );

  const hasFilters = q || filterType;
  const reset = () => { setQ(''); setFilterType(''); };

  return (
    <Shell currentUser={currentUser} active="delreq" openModal={openModal} onNavigate={onNavigate} onLogout={onLogout}>
      <PageHead title="Заявки на удаление" sub={loading ? 'Загрузка…' : `Всего записей: ${reqs.length}`} />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} /></div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Тип объекта</label>
          <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Все</option>
            {typeOpts.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          {loading ? (
            <table className="tbl"><thead><tr><SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader><th>Тип</th><th>Объект</th><th>Кто подал</th><th>Когда</th><th>Причина</th><th style={{ width: 200 }}>Действия</th></tr></thead><tbody><SkeletonRows cols={7} /></tbody></table>
          ) : filtered.length === 0 ? (
            <EmptyState icon={I.search} title="Заявки не найдены" sub="Попробуйте изменить поисковый запрос" action={hasFilters ? <button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button> : null} />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <SortHeader k="type_label" sort={sort}>Тип</SortHeader>
                <SortHeader k="object_repr" sort={sort}>Объект</SortHeader>
                <SortHeader k="author" sort={sort}>Кто подал</SortHeader>
                <SortHeader k="created_at" sort={sort}>Когда</SortHeader>
                <th>Причина</th>
                <th style={{ width: 200 }}>Действия</th>
              </tr></thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="mono muted">{idx + 1}</td>
                    <td><Badge>{r.type_label}</Badge></td>
                    <td className="fwm">{r.object_repr}</td>
                    <td className="mono">{r.author}</td>
                    <td className="mono muted">{r.created_at}</td>
                    <td className="muted">{r.reason}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {currentUser?.role === 'owner' ? <>
                          <button className="btn btn-danger-solid btn-sm" onClick={() => openModal('approveDelete', { ...r, onDone: load })}>{I.check}Одобрить</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => reject(r.id)}>Отклонить</button>
                        </> : (
                          <button className="btn btn-secondary btn-sm" onClick={() => cancel(r.id)}>Отозвать</button>
                        )}
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
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const toast = useToast();
  const sort = useSortable({ key: null, dir: 'asc' }, 'audit-list');

  const buildParams = (extra = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (filterAction) params.set('action', filterAction);
    if (filterRole) params.set('role', filterRole);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  const load = () => {
    setLoading(true);
    api.get(`/audit-log/?${buildParams({ page })}`).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filterAction, filterRole, dateFrom, dateTo]);

  const handleSearch = () => { setPage(1); load(); };
  const hasFilters = q || filterAction || filterRole || dateFrom || dateTo;
  const reset = () => { setQ(''); setFilterAction(''); setFilterRole(''); setDateFrom(''); setDateTo(''); setPage(1); };

  const doExport = async () => {
    setExpLoading(true);
    try {
      const r = await api.get(`/audit-log/export/?${buildParams({ sort_key: sort.sort.key || 'ts', sort_dir: sort.sort.dir || 'desc' })}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit_log.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      toast.push('Экспорт выполнен', { kind: 'ok' });
    } catch {
      toast.push('Ошибка при экспорте', { kind: 'err' });
    }
    setExpLoading(false);
  };

  return (
    <Shell currentUser={currentUser} active="audit" onNavigate={onNavigate} openModal={openModal}>
      <PageHead title="Журнал изменений"
        sub={loading ? 'Загрузка…' : `Всего записей: ${data.count}`}
        actions={<button className="btn btn-sm" style={{ background: 'var(--good-bg)', color: 'var(--good-fg)', border: 'none' }} onClick={doExport} disabled={expLoading}>{I.excel}{expLoading ? 'Загрузка…' : 'Экспорт в Excel'}</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} /></div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="filters" style={{ marginTop: -8 }}>
        <div className="field">
          <label className="field-label">Действие</label>
          <select className="select" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
            <option value="">Все действия</option>
            <option value="create">Создание</option>
            <option value="update">Изменение</option>
            <option value="delete">Удаление</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Роль пользователя</label>
          <select className="select" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
            <option value="">Все роли</option>
            <option value="owner">Суперадмин</option>
            <option value="admin">Администратор</option>
            <option value="teacher">Преподаватель</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Дата с</label>
          <input className="input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ height: 36 }} />
        </div>
        <div className="field">
          <label className="field-label">Дата по</label>
          <input className="input" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ height: 36 }} />
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          {loading
            ? <table className="tbl"><thead><tr><SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader><th>Дата и время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th style={{ width: 40 }}></th></tr></thead><tbody><SkeletonRows cols={6} /></tbody></table>
            : data.results.length === 0
              ? <EmptyState icon={I.history} title="Записи не найдены" sub="Попробуйте изменить поисковый запрос"
                  action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button>} />
              : <table className="tbl">
                  <thead><tr>
                    <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                    <SortHeader k="ts" sort={sort}>Дата и время</SortHeader>
                    <SortHeader k="user" sort={sort}>Пользователь</SortHeader>
                    <SortHeader k="label" sort={sort}>Действие</SortHeader>
                    <SortHeader k="obj" sort={sort}>Объект</SortHeader>
                    <th style={{ width: 40 }}></th>
                  </tr></thead>
                  <tbody>
                    {sort.sortFn(data.results, {
                        ts: a => a.ts,
                        user: a => a.user || '',
                        label: a => a.label || '',
                        obj: a => a.obj || '',
                      }).map((a, idx) => (
                      <tr key={a.id} className="row-link" onClick={() => openModal('auditDiff', a)}>
                        <td className="mono muted">{idx + 1}</td>
                        <td className="mono muted">{a.ts}</td>
                        <td>
                          <span className="fwm mono">{a.user}</span>
                          <div className="muted" style={{ fontSize: 11 }}>{a.userName} · {a.role}</div>
                        </td>
                        <td><span className={`badge ${a.cls}`}><span className="dot"></span>{a.label}</span></td>
                        <td>{a.obj}</td>
                        <td>{I.chevr}</td>
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
  const sort = useSortable({ key: null, dir: 'asc' }, 'parents-list');

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
  const hasFilters = q;
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
        title="Опекуны и родители"
        sub={loading ? 'Загрузка…' : `Всего записей: ${data.count}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('parentForm', { onDone: () => { setPage(1); load(); } })}>{I.plus}Добавить опекуна</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={handleSearch}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={reset} disabled={!hasFilters}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && data.results.length === 0 ? (
            <EmptyState icon={I.search} title="Опекуны не найдены" sub="Попробуйте изменить поисковый запрос" action={<button className="btn btn-secondary btn-sm" onClick={reset}>Сбросить</button>} />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <th style={{ width: 50 }}></th>
                <SortHeader k="full_name" sort={sort}>ФИО</SortHeader>
                <SortHeader k="phone" sort={sort}>Телефон</SortHeader>
                <SortHeader k="email" sort={sort}>Email</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={6} /> : sort.sortFn(data.results, {
                    full_name: p => p.full_name || '',
                    phone: p => p.phone || '',
                    email: p => p.email || '',
                  }).map((p, idx) => (
                  <tr key={p.id} className="row-link" onClick={() => onNavigate('parent-detail', { parentId: p.id })}>
                    <td className="mono muted">{idx + 1}</td>
                    <td><Avatar name={p.full_name} size="sm" src={p.photo} /></td>
                    <td className="fwm">
                      {p.full_name}
                    </td>
                    <td className="muted">{p.phone || '-'}</td>
                    <td className="muted">{p.email || '-'}</td>
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
  const sortParentStudents = useSortable({ key: null, dir: 'asc' }, 'parent-students');

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
          {['owner', 'admin'].includes(currentUser?.role) && (
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('parentForm', { parent, onDone: load })}>{I.pencil}Редактировать</button>
          )}
          {currentUser?.role === 'owner' && (
            <button className="btn btn-danger btn-sm" onClick={() => openModal('ownerDirectDelete', { name: parent.full_name, type: 'опекуна', url: `/parents/${parentId}/`, onDone: () => onNavigate('parents') })}>{I.trash}Удалить</button>
          )}
          {currentUser?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          )}
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            {parent.photo
              ? <img src={parent.photo} alt="" style={{ width: 96, height: 96, borderRadius: 16, objectFit: 'cover' }} className="avatar-zoomy" />
              : <Avatar name={parent.full_name} size="lg" className="avatar-zoomy" />
            }
            <h3 style={{ marginTop: 14, marginBottom: 12 }}>
              {[parent.last_name, parent.first_name, parent.middle_name].filter(Boolean).join(' ')}
            </h3>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <dl className="kv">
              {parent.birth_date && <><dt>Дата рождения</dt><dd>{parent.birth_date}</dd></>}
              <dt>Телефон</dt><dd>{parent.phone || '-'}</dd>
              <dt>Email</dt><dd>{parent.email || '-'}</dd>
            </dl>
          </div>
        </div>
        <div className="card-stack">
        <div className="card">
          <div className="card-head">
            <div className="title">Привязанные студенты</div>
            {currentUser?.role !== 'teacher' && (
              <button className="btn btn-secondary btn-sm"
                onClick={() => openModal('parentAddStudent', { parentId, onDone: load })}>
                {I.plus}
              </button>
            )}
          </div>
          <div className="card-body flush">
            {parent.students?.length === 0 ? (
              <EmptyState icon={I.search} title="Студенты не привязаны" sub="Нажмите «Привязать студента» чтобы добавить" />
            ) : (
              <table className="tbl">
                <thead><tr><SortHeader k="student_name" sort={sortParentStudents}>Студент</SortHeader><SortHeader k="relation_display" sort={sortParentStudents}>Связь</SortHeader><SortHeader k="group_name" sort={sortParentStudents}>Группа</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {sortParentStudents.sortFn(parent.students || [], {
                    student_name: s => s.student_name || '',
                    relation_display: s => s.relation_display || '',
                    group_name: s => s.group_name || '',
                  }).map(s => (
                    <tr key={s.sp_id} className="row-link" onClick={() => onNavigate('student-detail', { studentId: s.student_id })}>
                      <td className="fwm">{s.student_name}</td>
                      <td>{s.relation_display}</td>
                      <td>{s.group_name || '-'}</td>
                      <td>
                        {currentUser?.role !== 'teacher' && (
                          <button className="btn btn-ghost btn-icon btn-sm"
                            onClick={e => { e.stopPropagation(); removeStudent(s.sp_id); }} title="Открепить">{I.x}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {currentUser?.role !== 'teacher' && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head">
              <div className="title">Документы</div>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('uploadDoc', { ownerId: parentId, ownerType: 'parent', onDone: load })}>{I.upload}Загрузить</button>
            </div>
            <div className="card-body">
              {(parent.documents || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Документы не загружены</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {(parent.documents || []).map(d => (
                    <div key={d.id} className="doc-tile" style={{ position: 'relative' }}>
                      <a href={d.file_url} target="_blank" rel="noreferrer" style={{ display: 'contents' }}>
                        <div className="doc-icon">{I.doc}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="doc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                          <div className="doc-meta">{d.uploaded_at}</div>
                        </div>
                      </a>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', top: 4, right: 4 }} onClick={async () => { if (!confirm('Удалить документ?')) return; try { await api.delete(`/documents/${d.id}/`); load(); } catch { toast.push('Ошибка при удалении', { kind: 'err' }); } }}>{I.x}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </Shell>
  );
}

function SubjectDetail({ currentUser, openModal, onNavigate, subjectId, filterEmployeeId }) {
  const toast = useToast();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const sortSubjGroups = useSortable({ key: null, dir: 'asc' }, 'subj-groups');
  const sortSubjTeachers = useSortable({ key: null, dir: 'asc' }, 'subj-teachers');

  const load = () => {
    setLoading(true);
    api.get(`/subjects/${subjectId}/`).then(r => {
      setSubject(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (subjectId) load(); }, [subjectId]);

  const handleDelete = async () => {
    if (!confirm(`Удалить предмет «${subject.name}»?`)) return;
    try {
      await api.delete(`/subjects/${subjectId}/`);
      toast.push('Предмет удалён', { kind: 'ok' });
      onNavigate('subjects');
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка при удалении', { kind: 'err' });
    }
  };

  const handleDeleteRequest = async () => {
    try {
      await api.post(`/subjects/${subjectId}/delete-request/`, {});
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
    } catch {
      toast.push('Не удалось создать заявку', { kind: 'err' });
    }
  };

  if (loading || !subject) {
    return (
      <Shell currentUser={currentUser} active="subjects" onNavigate={onNavigate} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      </Shell>
    );
  }

  const uniqueTeachers = subject.teachers || [];

  const filteredAssignments = filterEmployeeId
    ? subject.assignments.filter(a => a.employee_id === filterEmployeeId)
    : subject.assignments;

  return (
    <Shell currentUser={currentUser} active={filterEmployeeId && currentUser?.role === 'teacher' ? 'my-subjects' : 'subjects'} onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        crumbs={filterEmployeeId && currentUser?.role === 'teacher'
          ? [{ label: 'Мои предметы', href: true, onClick: () => onNavigate('my-subjects') }, { label: subject.name }]
          : [{ label: 'Предметы', href: true, onClick: () => onNavigate('subjects') }, { label: subject.name }]}
        title={subject.name}
        actions={!filterEmployeeId ? <>
          <button className="btn btn-secondary btn-sm" onClick={() => openModal('subjectForm', { subject, onDone: load })}>{I.pencil}Редактировать</button>
          {currentUser?.role === 'owner' && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>{I.trash}Удалить</button>
          )}
          {currentUser?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
          )}
        </> : null}
      />
      <div style={{ display: 'grid', gridTemplateColumns: filterEmployeeId ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="title">Группы<span className="muted" style={{ fontWeight: 700 }}>: {filteredAssignments.length}</span></div>
            {!filterEmployeeId && (
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('assignSubject', { subjectId, subjectName: subject.name, onDone: load })}>{I.plus}</button>
            )}
          </div>
          <div className="card-body flush">
            {filteredAssignments.length === 0 ? (
              <EmptyState icon={I.book} title="Предмет не назначен ни одной группе" sub="Нажмите + чтобы назначить группу" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <SortHeader k="group_name" sort={sortSubjGroups}>Группа</SortHeader>
                    {!filterEmployeeId && <SortHeader k="employee_name" sort={sortSubjGroups}>Преподаватель</SortHeader>}
                    {!filterEmployeeId && ['owner', 'admin'].includes(currentUser?.role) && <th style={{ width: 40 }}></th>}
                    {filterEmployeeId && <th style={{ width: 40 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortSubjGroups.sortFn(filteredAssignments, {
                    group_name: a => a.group_name || '',
                    employee_name: a => a.employee_name || '',
                  }).map(a => {
                    const teacherReadonly = filterEmployeeId && currentUser?.role === 'teacher';
                    return (
                      <tr
                        key={a.id}
                        className={teacherReadonly ? '' : 'row-link'}
                        onClick={teacherReadonly ? undefined : () => onNavigate('group-detail', { groupId: a.group_id })}
                      >
                        <td className="fwm">{a.group_name}</td>
                        {!filterEmployeeId && <td className="muted">{a.employee_name}</td>}
                        {!filterEmployeeId && ['owner', 'admin'].includes(currentUser?.role) && (
                          <td onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Убрать" onClick={async () => {
                              try {
                                await api.delete(`/groups/${a.group_id}/subjects/${a.id}/`);
                                load();
                              } catch { toast.push('Ошибка при удалении', { kind: 'err' }); }
                            }}>{I.x}</button>
                          </td>
                        )}
                        {filterEmployeeId && !teacherReadonly && <td>{I.chevr}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {!filterEmployeeId && (
          <div className="card">
            <div className="card-head">
              <div className="title">Преподаватели<span className="muted" style={{ fontWeight: 700 }}>: {uniqueTeachers.length}</span></div>
              {['owner', 'admin'].includes(currentUser?.role) && (
                <button className="btn btn-secondary btn-sm" onClick={() => openModal('subjectAddTeacher', { subjectId, alreadyIds: uniqueTeachers.map(t => t.id), onDone: load })}>{I.plus}</button>
              )}
            </div>
            <div className="card-body flush">
              {uniqueTeachers.length === 0 ? (
                <EmptyState icon={I.user} title="Нет назначенных преподавателей" sub="Нажмите + чтобы добавить преподавателя" />
              ) : (
                <table className="tbl">
                  <thead><tr><SortHeader k="full_name" sort={sortSubjTeachers}>Преподаватель</SortHeader><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {sortSubjTeachers.sortFn(uniqueTeachers, {
                      full_name: t => t.full_name || '',
                    }).map(t => (
                      <tr
                        key={t.id}
                        className={currentUser?.role !== 'teacher' ? 'row-link' : ''}
                        onClick={currentUser?.role !== 'teacher' ? () => onNavigate('employee-detail', { employeeId: t.id }) : undefined}
                      >
                        <td className="fwm">{t.full_name}</td>
                        <td onClick={e => e.stopPropagation()}>
                          {['owner', 'admin'].includes(currentUser?.role) && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Убрать" onClick={async () => {
                              try {
                                await api.delete(`/subjects/${subjectId}/employees/${t.id}/`);
                                load();
                              } catch { toast.push('Ошибка при удалении', { kind: 'err' }); }
                            }}>{I.x}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function SubjectList({ currentUser, openModal, onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const sort = useSortable({ key: 'name', dir: 'asc' }, 'subjects-list');

  const load = () => {
    setLoading(true);
    api.get('/subjects/').then(r => {
      setSubjects(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Shell currentUser={currentUser} active="subjects" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Предметы"
        sub={loading ? 'Загрузка…' : `Всего записей: ${subjects.length}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('subjectForm', { onDone: load })}>{I.plus}Добавить предмет</button>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по названию</label>
          <div className="input-with-icon">{I.search}
            <input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => setQ('')} disabled={!q}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && subjects.length === 0 ? (
            <EmptyState icon={I.book} title="Предметы не добавлены" sub="Нажмите «Добавить» чтобы создать первый предмет" />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <SortHeader k="name" sort={sort}>Название</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={3} /> : sort.sortFn(subjects.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase())), {
                    name: s => s.name,
                  }).map((s, idx) => (
                  <tr key={s.id} className="row-link" onClick={() => onNavigate('subject-detail', { subjectId: s.id })}>
                    <td className="mono muted">{idx + 1}</td>
                    <td className="fwm">{s.name}</td>
                    <td>{I.chevr}</td>
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
  const [q, setQ] = useState('');
  const sort = useSortable({ key: null, dir: 'asc' }, 'positions-list');

  const load = () => {
    setLoading(true);
    api.get('/positions/').then(r => {
      setPositions(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = sort.sortFn(
    q ? positions.filter(p => p.name.toLowerCase().includes(q.toLowerCase())) : positions,
    { name: p => p.name, employee_count: p => p.employee_count }
  );

  return (
    <Shell currentUser={currentUser} active="positions" onNavigate={onNavigate} openModal={openModal}>
      <PageHead
        title="Должности"
        sub={loading ? 'Загрузка…' : `Всего записей: ${positions.length}`}
        actions={['owner', 'admin'].includes(currentUser?.role) ? (
          <button className="btn btn-primary btn-sm" onClick={() => openModal('positionForm', { onDone: load })}>{I.plus}Добавить должность</button>
        ) : null}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по названию</label>
          <div className="input-with-icon">{I.search}<input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setQ(q)} /></div>
        </div>
        <button className="btn btn-primary" style={{ height: 36 }} onClick={() => {}}>Найти</button>
        <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => setQ('')} disabled={!q}>Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          {!loading && positions.length === 0 ? (
            <EmptyState icon={I.briefcase} title="Должности не добавлены" sub="Нажмите «Добавить» чтобы создать первую должность" />
          ) : (
            <table className="tbl">
              <thead><tr>
                <SortHeader k="_rownum" sort={sort} width={44}>№</SortHeader>
                <SortHeader k="name" sort={sort}>Название</SortHeader>
                <SortHeader k="role_type" sort={sort}>Тип роли</SortHeader>
                <SortHeader k="employee_count" sort={sort}>Сотрудников</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={5} /> : filtered.map((p, idx) => (
                  <tr key={p.id} className="row-link" onClick={() => onNavigate('employees', { filterPositionId: p.id, filterPositionName: p.name, filterPositionRoleType: p.role_type })}>
                    <td className="mono muted">{idx + 1}</td>
                    <td className="fwm">{p.name}</td>
                    <td>{{ admin: 'Администратор', teacher: 'Преподаватель', none: 'Прочие сотрудники' }[p.role_type] || p.role_type}</td>
                    <td className="mono">{p.employee_count}</td>
                    <td>{I.chevr}</td>
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

function TeacherMySubjects({ currentUser, openModal, onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const sort = useSortable({ key: 'name', dir: 'asc' }, 'teacher-my-subjects');

  useEffect(() => {
    api.get('/teacher/my-subjects/').then(r => {
      setSubjects(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <Shell currentUser={currentUser} active="my-subjects" onNavigate={onNavigate} openModal={openModal}>
      <PageHead title="Мои предметы" sub={loading ? 'Загрузка…' : `Всего: ${subjects.length}`} />
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка…</div>
      ) : subjects.length === 0 ? (
        <div className="card"><div className="card-body">
          <EmptyState icon={I.book} title="Предметы не назначены" sub="Вам ещё не назначены предметы" />
        </div></div>
      ) : (
        <div className="card">
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr>
                <SortHeader k="name" sort={sort}>Предмет</SortHeader>
                <th style={{ width: 120 }}>Групп</th>
                <th style={{ width: 32 }}></th>
              </tr></thead>
              <tbody>
                {sort.sortFn(subjects, { name: s => s.name || '' }).map(s => (
                  <tr key={s.id} className="row-link" onClick={() => onNavigate('subject-detail', { subjectId: s.id, filterEmployeeId: currentUser?.employee_id })}>
                    <td className="fwm">{s.name}</td>
                    <td className="muted">{s.groups_count}</td>
                    <td>{I.chevr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

export {
  DashboardOwner, DashboardSuper, DashboardAdmin, DashboardTeacher,
  OrganizationList,
  StudentList, StudentDetail,
  EmployeeList, EmployeeDetail,
  GroupList, GroupDetail,
  FacultyList, FacultyDetail,
  UserList, DeleteRequests, AuditLog,
  ParentList, ParentDetail, SubjectList, SubjectDetail, PositionList,
  TeacherMySubjects,
};
