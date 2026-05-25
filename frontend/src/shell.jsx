import { useState, useEffect, useRef } from 'react';
import { I, STATUSES } from './data.jsx';
import { useDropdown, useToast } from './utils.jsx';
import api from './api.js';

/* ============================================================
   Reusable bits
   ============================================================ */

function Badge({ status, children, className = '' }) {
  if (status) {
    const s = STATUSES[status] || { label: status, cls: 'badge-neutral' };
    return <span className={`badge ${s.cls} ${className}`}><span className="dot"></span>{s.label}</span>;
  }
  return <span className={`badge badge-neutral ${className}`}>{children}</span>;
}

function Avatar({ name, size = 'md', av = 1, className = '' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'sm' ? 'avatar avatar-sm' : size === 'xl' ? 'avatar avatar-lg' : 'avatar';
  return <span className={`${cls} av-${((av - 1) % 8) + 1} ${className}`}>{initials}</span>;
}

function Crumbs({ items }) {
  return (
    <div className="crumbs">
      {items.map((it, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className="sep">/</span>}
          {it.href ? <a href="#" onClick={e => { e.preventDefault(); it.onClick && it.onClick(); }}>{it.label}</a> : <span>{it.label}</span>}
        </span>
      ))}
    </div>
  );
}

function PageHead({ crumbs, title, sub, actions }) {
  return (
    <div className="page-head">
      <div>
        {crumbs && <Crumbs items={crumbs} />}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ============================================================
   User chip with dropdown
   ============================================================ */
const ROLE_LABEL = { owner: 'Владелец', superadmin: 'Суперадминистратор', admin: 'Администратор', teacher: 'Преподаватель' };

function TopbarSearch({ onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      api.get(`/students/?search=${encodeURIComponent(q)}`).then(r => {
        setResults(r.data.results || []);
        setOpen(true);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (id) => {
    setQ(''); setOpen(false);
    onNavigate && onNavigate('student-detail', { studentId: id });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="topbar-search">
        {I.search}
        <input
          placeholder="Поиск студента…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 999, maxHeight: 240, overflowY: 'auto' }}>
          {results.map(s => (
            <div key={s.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onMouseDown={() => pick(s.id)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{s.last_name} {s.first_name} {s.middle_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.faculty_short} · {s.group_name || 'без группы'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserChip({ currentUser, onLogout, openModal }) {
  const { open, setOpen, wrapRef } = useDropdown();
  const toast = useToast();
  const name = currentUser?.display_name || currentUser?.username || '-';
  const role = currentUser?.role || 'admin';
  return (
    <div ref={wrapRef} className="dd-wrap">
      <button className="user-chip" onClick={() => setOpen(o => !o)} aria-haspopup="true" aria-expanded={open}>
        <Avatar name={name} size="sm" av={1} />
        <div>
          <div className="name">{name}</div>
          <div className="role">{ROLE_LABEL[role] || role}</div>
        </div>
        <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="dd-menu" role="menu">
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
            <div className="muted" style={{ fontSize: 11 }}>{ROLE_LABEL[role] || role}</div>
          </div>
          <div className="dd-item" onClick={() => { setOpen(false); toast.push('Открыт профиль', { kind: 'info' }); }}>
            {I.user}<span>Профиль</span>
          </div>
          <div className="dd-item" onClick={() => { setOpen(false); toast.push('Открыта смена пароля', { kind: 'info' }); }}>
            {I.shield}<span>Сменить пароль</span>
          </div>
          <div className="dd-sep" />
          <div className="dd-item danger" onClick={() => { setOpen(false); openModal && openModal('logout'); }}>
            {I.logout}<span>Выйти</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   App shell (navbar + sidebar)
   ============================================================ */

const NAV_BY_ROLE = {
  owner: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Учебная структура', items: [
      { key: 'faculties', label: 'Факультеты', icon: I.building },
      { key: 'groups',    label: 'Группы',     icon: I.users },
      { key: 'subjects',  label: 'Предметы',   icon: I.book },
    ]},
    { section: 'Люди', items: [
      { key: 'employees', label: 'Сотрудники', icon: I.briefcase },
      { key: 'students',  label: 'Студенты',   icon: I.badge },
      { key: 'parents',   label: 'Опекуны',    icon: I.heart },
    ]},
    { section: 'Администрирование', items: [
      { key: 'users',     label: 'Пользователи',       icon: I.shield },
      { key: 'positions', label: 'Должности',           icon: I.settings },
      { key: 'delreq',    label: 'Заявки на удаление',  icon: I.trash, badge: 'bad' },
      { key: 'audit',     label: 'Журнал изменений',    icon: I.history },
    ]},
  ],
  admin: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Учебная структура', items: [
      { key: 'faculties', label: 'Факультеты', icon: I.building },
      { key: 'groups',    label: 'Группы',     icon: I.users },
      { key: 'subjects',  label: 'Предметы',   icon: I.book },
    ]},
    { section: 'Люди', items: [
      { key: 'employees', label: 'Сотрудники', icon: I.briefcase },
      { key: 'students',  label: 'Студенты',   icon: I.badge },
      { key: 'parents',   label: 'Опекуны',    icon: I.heart },
    ]},
  ],
  teacher: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Мои данные', items: [
      { key: 'groups',   label: 'Мои группы',   icon: I.users },
      { key: 'students', label: 'Мои студенты', icon: I.badge },
    ]},
  ],
};
NAV_BY_ROLE.superadmin = NAV_BY_ROLE.owner;

function Shell({ currentUser, role: roleProp, active, onNavigate, onLogout, openModal, children }) {
  const role = currentUser?.role || roleProp || 'admin';
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin;
  const institutionName = currentUser?.institution?.name || '';
  const mockUser = currentUser || { role, username: role, display_name: role };
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== 'owner' && role !== 'superadmin') return;
    api.get('/delete-requests/count/').then(r => setPendingCount(r.data.count)).catch(() => {});
  }, [role, active]);

  return (
    <div className="app-shell">
      <div className="brand-cell">
        <div className="logo">У</div>
        <div>
          <div>Учёт студентов</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400, marginTop: -2 }}>АИС колледжа</div>
        </div>
      </div>
      <div className="topbar">
        <div className="topbar-left">
          {role === 'owner' || role === 'superadmin' ? (
            <button
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 6 }}
              onClick={() => onNavigate && onNavigate('org-picker')}
              title="Управление организациями"
            >
              {I.building}
              <span>Организация:</span>
              <strong style={{ color: 'var(--text)' }}>{institutionName || 'Не выбрана'}</strong>
              {I.chevr}
            </button>
          ) : (
            <TopbarSearch onNavigate={onNavigate} />
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-icon" title="Уведомления">{I.bell}</button>
          <UserChip currentUser={mockUser} onLogout={onLogout} openModal={openModal} />
        </div>
      </div>
      <nav className="sidebar">
        {nav.map((sec, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <div className="sidebar-section">{sec.section}</div>
            {sec.items.map(it => (
              <a
                className={`nav-item ${it.key === active ? 'active' : ''}`}
                key={it.key}
                href="#"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate(it.key); }}
              >
                {it.icon}
                <span>{it.label}</span>
                {it.key === 'delreq' && pendingCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--bad-fg)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '1px 7px', lineHeight: '18px' }}>
                    {pendingCount}
                  </span>
                )}
              </a>
            ))}
          </span>
        ))}
        <div style={{ flex: 1 }}></div>
      </nav>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}

export { Shell, PageHead, Crumbs, Badge, Avatar, ROLE_LABEL };
