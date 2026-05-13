/* global React, AIS_DATA, AIS_UI */
const { STATUSES, STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, ORGS, I } = window.AIS_DATA;
const { Shell, PageHead, Badge, Avatar } = window.AIS_UI;

/* ============================================================
   Dashboards
   ============================================================ */

function Stat({ label, value, icon, trend }) {
  return (
    <div className="stat">
      <div className="stat-label">{icon}{label}</div>
      <div className="stat-value">{value}</div>
      {trend && <div className={`stat-trend ${trend.up ? 'up' : ''}`}>{I.arrowU}{trend.text}</div>}
    </div>
  );
}

function DashboardOwner({ openModal }) {
  return (
    <Shell role="owner" active="dashboard" openModal={openModal}>
      <PageHead
        title="Дашборд"
        sub="Сводка по системе на 09 мая 2026"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Экспорт в Excel</button>
          <button className="btn btn-primary btn-sm">{I.plus}Добавить</button>
        </>}
      />
      <div className="banner banner-bad">
        {I.alert}
        <div className="banner-body">
          <strong>3 заявки на удаление</strong> ожидают вашего решения. <a href="#" onClick={e => { e.preventDefault(); openModal('delreq'); }} style={{ color: 'inherit', textDecoration: 'underline' }}>Просмотреть заявки →</a>
        </div>
      </div>
      <div className="stats">
        <Stat label="Факультетов"  value="5"   icon={I.building}  trend={{ up: false, text: 'без изменений' }} />
        <Stat label="Групп"        value="24"  icon={I.users}     trend={{ up: true,  text: '+2 за месяц' }} />
        <Stat label="Студентов"    value="612" icon={I.badge}     trend={{ up: true,  text: '+18 за месяц' }} />
        <Stat label="Сотрудников"  value="38"  icon={I.briefcase} trend={{ up: true,  text: '+1 за месяц' }} />
      </div>
      <div className="card">
        <div className="card-head">
          <div className="title">{I.history}<span>Журнал изменений</span></div>
          <a href="#" style={{ fontSize: 12 }} onClick={e => e.preventDefault()}>Все записи →</a>
        </div>
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th><th>Объект</th></tr></thead>
            <tbody>
              {AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="mono muted">{a.ts}</td>
                  <td><span className="fwm">{a.user}</span></td>
                  <td><Badge>{a.label}</Badge></td>
                  <td>{a.obj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function OrganizationList({ openModal, onSwitch }) {
  const orgs = ORGS || [
    { code: 'КГ-1', name: 'Колледж №1', students: 612, employees: 38, active: true },
    { code: 'КГ-2', name: 'Колледж №2', students: 0,   employees: 0,  active: false },
  ];
  return (
    <Shell role="owner" active="org-list" openModal={openModal}>
      <PageHead
        title="Мои организации"
        sub="Выберите организацию для работы или добавьте новую"
        actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('orgForm')}>{I.plus}Добавить организацию</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {orgs.map(org => (
          <div key={org.code} className="card" style={{ border: org.active ? '2px solid var(--accent)' : '1px solid var(--border)', position: 'relative' }}>
            {org.active && (
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span className="badge badge-ok"><span className="dot"></span>Активна</span>
              </div>
            )}
            <div className="card-body" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: org.active ? 'var(--accent)' : 'var(--surface-2)', color: org.active ? '#fff' : 'var(--text-muted)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, border: '1px solid var(--border)' }}>
                  {org.code}
                </div>
                <div>
                  <div className="fwm" style={{ fontSize: 14 }}>{org.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>Код: {org.code}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{org.students}</div>
                  <div className="muted" style={{ fontSize: 11 }}>студентов</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{org.employees}</div>
                  <div className="muted" style={{ fontSize: 11 }}>сотрудников</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {org.active
                  ? <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>{I.pencil}Редактировать</button>
                  : <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onSwitch && onSwitch()}>{I.swap}Перейти</button>
                }
                <button className="btn btn-ghost btn-icon btn-sm">{I.more}</button>
              </div>
            </div>
          </div>
        ))}
        <div className="card" style={{ border: '2px dashed var(--border)', cursor: 'pointer' }} onClick={() => openModal('orgForm')}>
          <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, textAlign: 'center', color: 'var(--text-muted)' }}>
            {I.plus}
            <div style={{ marginTop: 8, fontSize: 13 }}>Добавить организацию</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function DashboardSuper({ openModal }) {
  return <DashboardOwner openModal={openModal} />;
}

function DashboardAdmin({ openModal }) {
  return (
    <Shell role="admin" active="dashboard" openModal={openModal}>
      <PageHead
        title="Дашборд"
        sub="Сводка по системе на 09 мая 2026"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Экспорт</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('studentForm')}>{I.plus}Добавить студента</button>
        </>}
      />
      <div className="stats">
        <Stat label="Факультетов" value="5"   icon={I.building} />
        <Stat label="Групп"       value="24"  icon={I.users}     trend={{ up: true, text: '+2 за месяц' }} />
        <Stat label="Студентов"   value="612" icon={I.badge}     trend={{ up: true, text: '+18 за месяц' }} />
        <Stat label="Сотрудников" value="38"  icon={I.briefcase} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head"><div className="title">Быстрые действия</div></div>
          <div className="card-body" style={{ display: 'grid', gap: 8 }}>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal('studentForm')}>{I.plus}Добавить студента</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal('employeeForm')}>{I.plus}Добавить сотрудника</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }} onClick={() => openModal('groupForm')}>{I.plus}Создать группу</button>
            <button className="btn btn-secondary" style={{ height: 44, justifyContent: 'flex-start' }}>{I.excel}Экспорт списка студентов</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="title">{I.history}<span>Последние действия</span></div></div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>Время</th><th>Действие</th><th>Объект</th></tr></thead>
              <tbody>
                {AUDIT.slice(0, 5).map((a, i) => (
                  <tr key={i}>
                    <td className="mono muted">{a.ts.slice(11)}</td>
                    <td><Badge>{a.label}</Badge></td>
                    <td>{a.obj}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function DashboardTeacher({ openModal }) {
  return (
    <Shell role="teacher" active="dashboard" openModal={openModal}>
      <PageHead title="Здравствуйте, Наталья Андреевна" sub="Ваши группы и предметы на текущий семестр" />
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
   Students list / detail / form
   ============================================================ */

function StudentList({ openModal }) {
  return (
    <Shell role="admin" active="students" openModal={openModal}>
      <PageHead
        crumbs={[{ label: 'Главная', href: true }, { label: 'Студенты' }]}
        title="Студенты"
        sub="Всего 612 человек, найдено по фильтрам — 8"
        actions={<>
          <button className="btn btn-secondary btn-sm">{I.excel}Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('studentForm')}>{I.plus}Добавить</button>
        </>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск по ФИО</label>
          <div className="input-with-icon">{I.search}<input className="input" placeholder="Иванов Иван…" /></div>
        </div>
        <div className="field"><label className="field-label">Факультет</label><select className="select"><option>— Все —</option><option>ФИТ</option><option>ФЭ</option><option>ФМН</option></select></div>
        <div className="field"><label className="field-label">Группа</label><select className="select"><option>— Все —</option><option>ПИ-301</option><option>ПИ-302</option></select></div>
        <div className="field"><label className="field-label">Статус</label><select className="select"><option>— Все —</option><option>Зачислен</option><option>Отчислен</option></select></div>
        <button className="btn btn-ghost btn-sm">Сбросить</button>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 50 }}></th><th>ФИО</th><th>Статус</th><th>Факультет</th><th>Группа</th><th>Контакт</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {STUDENTS.map(s => (
                <tr key={s.id} className="row-link" onClick={() => openModal('studentDetail', s)}>
                  <td className="muted">{s.id}</td>
                  <td><Avatar name={`${s.last} ${s.first}`} size="sm" av={s.av} /></td>
                  <td className="fwm">{s.last} {s.first} {s.mid}</td>
                  <td><Badge status={s.status} /></td>
                  <td>{s.fac}</td>
                  <td>{s.group}</td>
                  <td className="muted">{s.phone}</td>
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

function StudentDetail({ openModal }) {
  const s = STUDENTS[0];
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
              <Avatar name={`${s.last} ${s.first}`} size="lg" av={s.av} />
              <h3 style={{ marginTop: 14, marginBottom: 6 }}>{s.last} {s.first}</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{s.mid}</div>
              <Badge status={s.status} />
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
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
          <div className="card">
            <div className="card-head"><div className="title">{I.history}<span>История изменений</span></div></div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th></tr></thead>
                <tbody>
                  <tr><td className="mono muted">09.05.2026 14:32</td><td className="fwm">admin</td><td><Badge>Создал</Badge></td></tr>
                  <tr><td className="mono muted">09.05.2026 15:10</td><td className="fwm">admin</td><td><Badge>Изменил</Badge></td></tr>
                  <tr><td className="mono muted">10.05.2026 09:24</td><td className="fwm">teacher1</td><td><Badge>Изменил</Badge></td></tr>
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
   Employees list / detail
   ============================================================ */

function EmployeeList({ openModal }) {
  return (
    <Shell role="admin" active="employees" openModal={openModal}>
      <PageHead
        title="Сотрудники"
        sub="Всего 38 человек"
        actions={<>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('employeeForm')}>{I.plus}Добавить</button>
        </>}
      />
      <div className="filters">
        <div className="field grow-2">
          <label className="field-label">Поиск</label>
          <div className="input-with-icon">{I.search}<input className="input" placeholder="ФИО или должность…" /></div>
        </div>
        <div className="field"><label className="field-label">Должность</label><select className="select"><option>— Все —</option><option>Преподаватель</option><option>Декан</option></select></div>
        <div className="field"><label className="field-label">Тип</label><select className="select"><option>— Все —</option><option>Преподаватели</option><option>Только админ. персонал</option></select></div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 50 }}></th><th>ФИО</th><th>Должность</th><th>Преподаёт</th><th>Телефон</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {EMPLOYEES.map(e => (
                <tr key={e.id} className="row-link" onClick={() => openModal('employeeDetail', e)}>
                  <td className="muted">{e.id}</td>
                  <td><Avatar name={`${e.last} ${e.first}`} size="sm" av={e.av} /></td>
                  <td className="fwm">{e.last} {e.first} {e.mid}</td>
                  <td>{e.pos}</td>
                  <td>{e.teacher ? <Badge><span className="dot"></span>Да</Badge> : <span className="muted">—</span>}</td>
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
            <Avatar name={`${e.last} ${e.first}`} size="lg" av={e.av} />
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
                  <tr><td className="fwm"><a href="#">ПИ-301</a></td><td>ФИТ</td><td>28</td></tr>
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
   Groups list / detail; Faculties list / detail
   ============================================================ */

function GroupList({ openModal }) {
  return (
    <Shell role="admin" active="groups" openModal={openModal}>
      <PageHead
        title="Группы"
        sub="Всего 24 группы"
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
      <PageHead
        title="Факультеты"
        sub="Всего 5 факультетов"
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
   Admin: users / delete requests / audit / setup
   ============================================================ */

function UserList({ openModal }) {
  return (
    <Shell role="owner" active="users" openModal={openModal}>
      <PageHead
        title="Пользователи системы"
        sub="Учётные записи и роли"
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
                <tr key={u.login}>
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
    { id: 1, type: 'Студент',   target: 'Сидоров Алексей Петрович', author: 'admin',  date: '09.05.2026 11:20', reason: 'Отчислен по собственному желанию' },
    { id: 2, type: 'Опекун',    target: 'Петрова Светлана Ивановна', author: 'admin',  date: '08.05.2026 16:45', reason: 'Дубликат записи' },
    { id: 3, type: 'Сотрудник', target: 'Волков Андрей Степанович', author: 'admin2', date: '08.05.2026 09:30', reason: 'Уволен' },
  ];
  return (
    <Shell role="superadmin" active="delreq" openModal={openModal}>
      <PageHead
        title="Заявки на удаление"
        sub="Подтвердите или отклоните заявки от администраторов"
      />
      <div className="banner banner-info">
        {I.info}
        <div className="banner-body">Двухступенчатое удаление: администратор подаёт заявку, суперадмин подтверждает. До подтверждения объект остаётся в системе.</div>
      </div>
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
  const ext = [
    { ts: '09.05.2026 14:32:11', user: 'admin', action: 'create', label: 'Создал', obj: 'Студент #612 — Иванов И. И.', cls: 'badge-ok' },
    { ts: '09.05.2026 13:55:04', user: 'admin', action: 'update', label: 'Изменил', obj: 'Студент #610 — Петрова М. С.', cls: 'badge-warn' },
    { ts: '09.05.2026 12:10:48', user: 'teacher1', action: 'update', label: 'Изменил', obj: 'Группа ПИ-301', cls: 'badge-warn' },
    { ts: '08.05.2026 18:04:22', user: 'admin', action: 'delete', label: 'Удалил', obj: 'Опекун #45', cls: 'badge-bad' },
    { ts: '08.05.2026 17:30:00', user: 'superadmin', action: 'create', label: 'Создал', obj: 'Пользователь #8 — teacher2', cls: 'badge-ok' },
    { ts: '08.05.2026 16:48:15', user: 'admin', action: 'update', label: 'Изменил', obj: 'Сотрудник #4 — Лебедева И. Ю.', cls: 'badge-warn' },
    { ts: '07.05.2026 09:11:02', user: 'admin2', action: 'create', label: 'Создал', obj: 'Группа МН-101', cls: 'badge-ok' },
    { ts: '06.05.2026 22:14:55', user: 'admin', action: 'update', label: 'Изменил', obj: 'Факультет ФИТ', cls: 'badge-warn' },
  ];
  return (
    <Shell role="superadmin" active="audit" openModal={openModal}>
      <PageHead
        title="Журнал изменений"
        sub="Кто, что и когда менял в системе"
        actions={<button className="btn btn-secondary btn-sm">{I.excel}Экспорт</button>}
      />
      <div className="filters">
        <div className="field grow-2"><label className="field-label">Поиск по объекту</label><div className="input-with-icon">{I.search}<input className="input" placeholder="Студент, группа…" /></div></div>
        <div className="field"><label className="field-label">Пользователь</label><select className="select"><option>— Все —</option><option>admin</option><option>superadmin</option></select></div>
        <div className="field"><label className="field-label">Действие</label><select className="select"><option>— Все —</option><option>Создание</option><option>Изменение</option><option>Удаление</option></select></div>
        <div className="field"><label className="field-label">Период</label><select className="select"><option>За неделю</option><option>За месяц</option></select></div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Дата и время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th style={{ width: 100 }}>Diff</th></tr></thead>
            <tbody>
              {ext.map((a, i) => (
                <tr key={i} className="row-link" onClick={() => openModal('auditDiff', a)}>
                  <td className="mono muted">{a.ts}</td>
                  <td className="mono fwm">{a.user}</td>
                  <td><span className={`badge ${a.cls}`}><span className="dot"></span>{a.label}</span></td>
                  <td>{a.obj}</td>
                  <td><a href="#" onClick={ev => { ev.preventDefault(); ev.stopPropagation(); openModal('auditDiff', a); }}>Показать →</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function ParentList({ openModal }) {
  return (
    <Shell role="admin" active="parents" openModal={openModal}>
      <PageHead title="Опекуны и родители" sub="Всего 421 запись" actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('parentForm')}>{I.plus}Добавить</button>} />
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
                <tr key={i}>
                  <td className="fwm">{p.n}</td>
                  <td>{p.r}</td>
                  <td><a href="#">{p.s}</a></td>
                  <td className="muted">{p.p}</td>
                  <td className="muted">{p.e}</td>
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

function SubjectList({ openModal }) {
  return (
    <Shell role="admin" active="subjects" openModal={openModal}>
      <PageHead title="Предметы" sub="Всего 32 предмета" actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('subjectForm')}>{I.plus}Добавить</button>} />
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
                <tr key={s.n}>
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
      <PageHead title="Должности" sub="Справочник должностей сотрудников" actions={<button className="btn btn-primary btn-sm" onClick={() => openModal('positionForm')}>{I.plus}Добавить</button>} />
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
                <tr key={p.n}>
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

window.AIS_SCREENS = {
  DashboardOwner, DashboardSuper, DashboardAdmin, DashboardTeacher,
  OrganizationList,
  StudentList, StudentDetail,
  EmployeeList, EmployeeDetail,
  GroupList, GroupDetail,
  FacultyList,
  UserList, DeleteRequests, AuditLog,
  ParentList, SubjectList, PositionList,
};
