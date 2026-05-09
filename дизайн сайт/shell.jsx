/* global React, AIS_DATA */
const { STATUSES, STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, I } = window.AIS_DATA;
const { useState } = React;

/* ============================================================
   Reusable bits
   ============================================================ */

function Badge({ status, children }) {
  if (status) {
    const s = STATUSES[status] || { label: status, cls: 'badge-neutral' };
    return <span className={`badge ${s.cls}`}><span className="dot"></span>{s.label}</span>;
  }
  return <span className="badge badge-neutral">{children}</span>;
}

function Avatar({ name, size = 'md', av = 1 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'sm' ? 'avatar avatar-sm' : size === 'xl' ? 'avatar avatar-lg' : 'avatar';
  return <span className={`${cls} av-${((av - 1) % 8) + 1}`}>{initials}</span>;
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
   App shell (navbar + sidebar)
   ============================================================ */

const NAV_BY_ROLE = {
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

const ROLE_LABEL = { superadmin: 'Суперадминистратор', admin: 'Администратор', teacher: 'Преподаватель' };

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
          <div className="topbar-search">
            {I.search}
            <input placeholder="Поиск студента, группы, сотрудника…" />
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-icon" title="Уведомления">{I.bell}</button>
          <div className="user-chip">
            <Avatar name={role === 'superadmin' ? 'С А' : role === 'admin' ? 'А Д' : 'Т Е'} size="sm" av={role === 'superadmin' ? 5 : role === 'admin' ? 1 : 2} />
            <div>
              <div className="name">{role === 'superadmin' ? 'superadmin' : role === 'admin' ? 'admin' : 'teacher1'}</div>
              <div className="role">{ROLE_LABEL[role]}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" title="Выход" onClick={() => openModal && openModal('logout')}>{I.logout}</button>
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
                {typeof it.count === 'number' && <span className="count">{it.count}</span>}
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}

window.AIS_UI = { Shell, PageHead, Crumbs, Badge, Avatar };
