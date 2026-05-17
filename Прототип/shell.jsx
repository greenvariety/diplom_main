/* global React, AIS_DATA, AIS_UTILS */
const { STATUSES, STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, I } = window.AIS_DATA;
const { useDropdown, useToast } = window.AIS_UTILS;
const { useState, useEffect } = React;

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
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {it.href ? <a href="#" onClick={e => { e.preventDefault(); it.onClick && it.onClick(); }}>{it.label}</a> : <span>{it.label}</span>}
        </React.Fragment>
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
function UserChip({ role, av, openModal }) {
  const { open, setOpen, wrapRef } = useDropdown();
  const toast = useToast();
  const login = ROLE_LOGIN[role] || role;
  return (
    <div ref={wrapRef} className="dd-wrap">
      <button className="user-chip" onClick={() => setOpen(o => !o)} aria-haspopup="true" aria-expanded={open}>
        <Avatar name={login} size="sm" av={av} />
        <div>
          <div className="name">{login}</div>
          <div className="role">{ROLE_LABEL[role]}</div>
        </div>
        <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="dd-menu" role="menu">
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{login}</div>
            <div className="muted" style={{ fontSize: 11 }}>{ROLE_LABEL[role]}</div>
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
    { section: 'Организации', items: [
      { key: 'org-list', label: 'Мои организации', icon: I.building, count: 2 },
    ]},
    { section: 'Учебная структура', items: [
      { key: 'faculties', label: 'Факультеты', icon: I.building, count: 5 },
      { key: 'groups',    label: 'Группы',     icon: I.users,    count: 24 },
      { key: 'subjects',  label: 'Предметы',   icon: I.book,     count: 32 },
    ]},
    { section: 'Люди', items: [
      { key: 'employees', label: 'Сотрудники', icon: I.briefcase, count: 38 },
      { key: 'students',  label: 'Студенты',   icon: I.badge,     count: 612 },
      { key: 'parents',   label: 'Опекуны',    icon: I.heart,     count: 421 },
    ]},
    { section: 'Администрирование', items: [
      { key: 'users',     label: 'Пользователи',      icon: I.shield,   count: 4 },
      { key: 'positions', label: 'Должности',          icon: I.settings, count: 7 },
      { key: 'delreq',    label: 'Заявки на удаление', icon: I.trash,    count: 3, badge: 'bad' },
      { key: 'audit',     label: 'Журнал изменений',   icon: I.history },
    ]},
  ],
  superadmin: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Учебная структура', items: [
      { key: 'faculties', label: 'Факультеты', icon: I.building, count: 5 },
      { key: 'groups',    label: 'Группы',     icon: I.users,    count: 24 },
      { key: 'subjects',  label: 'Предметы',   icon: I.book,     count: 32 },
    ]},
    { section: 'Люди', items: [
      { key: 'employees', label: 'Сотрудники', icon: I.briefcase, count: 38 },
      { key: 'students',  label: 'Студенты',   icon: I.badge,     count: 612 },
      { key: 'parents',   label: 'Опекуны',    icon: I.heart,     count: 421 },
    ]},
    { section: 'Администрирование', items: [
      { key: 'users',     label: 'Пользователи',     icon: I.shield,   count: 12 },
      { key: 'positions', label: 'Должности',         icon: I.settings, count: 7 },
      { key: 'delreq',    label: 'Заявки на удаление', icon: I.trash,    count: 3, badge: 'bad' },
      { key: 'audit',     label: 'Журнал изменений',  icon: I.history },
    ]},
  ],
  admin: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Учебная структура', items: [
      { key: 'faculties', label: 'Факультеты', icon: I.building, count: 5 },
      { key: 'groups',    label: 'Группы',     icon: I.users,    count: 24 },
      { key: 'subjects',  label: 'Предметы',   icon: I.book,     count: 32 },
    ]},
    { section: 'Люди', items: [
      { key: 'employees', label: 'Сотрудники', icon: I.briefcase, count: 38 },
      { key: 'students',  label: 'Студенты',   icon: I.badge,     count: 612 },
      { key: 'parents',   label: 'Опекуны',    icon: I.heart,     count: 421 },
    ]},
  ],
  teacher: [
    { section: 'Главное', items: [{ key: 'dashboard', label: 'Дашборд', icon: I.dashboard }] },
    { section: 'Мои данные', items: [
      { key: 'groups',   label: 'Мои группы',   icon: I.users,    count: 2 },
      { key: 'students', label: 'Мои студенты', icon: I.badge,    count: 53 },
    ]},
  ],
};

const ROLE_LABEL = { owner: 'Владелец', superadmin: 'Суперадминистратор', admin: 'Администратор', teacher: 'Преподаватель' };
const ROLE_LOGIN = { owner: 'owner1', superadmin: 'superadmin', admin: 'admin1', teacher: 'teacher1' };
const ROLE_ORG = { owner: 'Колледж №1' };

function Shell({ role, active, children, openModal }) {
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin;
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
          {role === 'owner' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              {I.building}
              <span>Организация:</span>
              <strong style={{ color: 'var(--text)' }}>{ROLE_ORG[role] || 'Колледж №1'}</strong>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 2 }} title="Сменить организацию">
                {I.swap}
                Сменить
              </button>
            </div>
          ) : (
            <div className="topbar-search">
              {I.search}
              <input placeholder="Поиск студента, группы, сотрудника…" />
            </div>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-icon has-notif" title="Уведомления">{I.bell}</button>
          <UserChip role={role} av={role === 'owner' ? 3 : role === 'admin' ? 1 : 2} openModal={openModal} />
        </div>
      </div>
      <nav className="sidebar">
        {nav.map((sec, i) => (
          <React.Fragment key={i}>
            <div className="sidebar-section">{sec.section}</div>
            {sec.items.map(it => (
              <a className={`nav-item ${it.key === active ? 'active' : ''}`} key={it.key} href="#" onClick={e => e.preventDefault()}>
                {it.icon}
                <span>{it.label}</span>
                {it.badge === 'bad' && typeof it.count === 'number'
                  ? <span className="badge-mini with-pulse">{it.count}</span>
                  : (typeof it.count === 'number' && <span className="count">{it.count}</span>)
                }
              </a>
            ))}
          </React.Fragment>
        ))}
        <div style={{ flex: 1 }}></div>
      </nav>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}

window.AIS_UI = { Shell, PageHead, Crumbs, Badge, Avatar, ROLE_LABEL, ROLE_LOGIN };
