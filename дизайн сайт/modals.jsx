/* global React, AIS_DATA, AIS_UI */
const { STATUSES, STUDENTS, GROUPS, I } = window.AIS_DATA;
const { Badge, Avatar } = window.AIS_UI;
const { useEffect } = React;

function Modal({ size, title, sub, onClose, children, footer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="modal-close" onClick={onClose}>{I.x}</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Form modals
   ============================================================ */

function StudentFormModal({ data, onClose }) {
  const isEdit = !!data;
  return (
    <Modal
      size="lg"
      title={isEdit ? 'Редактировать студента' : 'Новый студент'}
      sub={isEdit ? `#${data.id} · ${data.fac}` : 'Заполните личные данные и распределение'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.check}Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <div className="field"><label className="field-label">Фамилия</label><input className="input" defaultValue={data?.last || ''} /></div>
        <div className="field"><label className="field-label">Имя</label><input className="input" defaultValue={data?.first || ''} /></div>
        <div className="field"><label className="field-label">Отчество</label><input className="input" defaultValue={data?.mid || ''} /></div>
        <div className="field"><label className="field-label">Дата рождения</label><input className="input" type="date" defaultValue="2004-03-15" /></div>
        <div className="field"><label className="field-label">Телефон</label><input className="input" defaultValue={data?.phone || '+7 '} /></div>
        <div className="field"><label className="field-label">Email</label><input className="input" defaultValue={data?.email || ''} /></div>
        <div className="field"><label className="field-label">Факультет</label><select className="select"><option>ФИТ — Факультет информационных технологий</option><option>ФЭ — Факультет экономики</option><option>ФМН — Факультет мат. наук</option></select></div>
        <div className="field"><label className="field-label">Группа</label><select className="select"><option>— Не указана —</option><option>ПИ-301</option><option>ПИ-302</option><option>ЭК-201</option></select></div>
        <div className="field"><label className="field-label">Статус</label><select className="select" defaultValue={data?.status || 'pending_review'}>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="field"><label className="field-label">Фото</label><input className="input" type="file" /></div>
        <div className="field field-full"><label className="field-label">Адрес проживания</label><input className="input" placeholder="г. Москва, ул. Ленина, д. 1" /></div>
        <div className="field field-full"><label className="field-label">Примечание</label><textarea className="textarea" placeholder="Дополнительная информация…"></textarea></div>
      </div>
    </Modal>
  );
}

function EmployeeFormModal({ data, onClose }) {
  return (
    <Modal
      size="lg"
      title={data ? 'Редактировать сотрудника' : 'Новый сотрудник'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.check}Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <div className="field"><label className="field-label">Фамилия</label><input className="input" defaultValue={data?.last || ''} /></div>
        <div className="field"><label className="field-label">Имя</label><input className="input" defaultValue={data?.first || ''} /></div>
        <div className="field"><label className="field-label">Отчество</label><input className="input" defaultValue={data?.mid || ''} /></div>
        <div className="field"><label className="field-label">Дата рождения</label><input className="input" type="date" /></div>
        <div className="field"><label className="field-label">Телефон</label><input className="input" defaultValue={data?.phone || '+7 '} /></div>
        <div className="field"><label className="field-label">Email</label><input className="input" /></div>
        <div className="field"><label className="field-label">Должность</label><select className="select"><option>Преподаватель</option><option>Декан</option><option>Зав. кафедрой</option><option>Методист</option></select></div>
        <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" defaultChecked={data?.teacher} /> Является преподавателем
          </label>
        </div>
      </div>
    </Modal>
  );
}

function GroupFormModal({ data, onClose }) {
  return (
    <Modal
      title={data ? 'Редактировать группу' : 'Новая группа'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.check}Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <div className="field field-full"><label className="field-label">Название</label><input className="input" defaultValue={data?.name || ''} placeholder="ПИ-301" /></div>
        <div className="field"><label className="field-label">Факультет</label><select className="select" defaultValue={data?.fac || 'ФИТ'}><option>ФИТ</option><option>ФЭ</option><option>ФМН</option></select></div>
        <div className="field"><label className="field-label">Год начала</label><input className="input" type="number" defaultValue={data?.year || 2025} /></div>
        <div className="field field-full"><label className="field-label">Классный руководитель</label><select className="select"><option>— Не назначен —</option><option>Кузнецова Н. А.</option><option>Морозов В. Г.</option></select></div>
      </div>
    </Modal>
  );
}

function FacultyFormModal({ data, onClose }) {
  return (
    <Modal
      title={data ? 'Редактировать факультет' : 'Новый факультет'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.check}Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <div className="field"><label className="field-label">Код</label><input className="input" defaultValue={data?.code || ''} placeholder="ФИТ" /></div>
        <div className="field"><label className="field-label">Декан</label><select className="select"><option>— Не назначен —</option><option>Сергеев П. И.</option></select></div>
        <div className="field field-full"><label className="field-label">Полное название</label><input className="input" defaultValue={data?.name || ''} /></div>
        <div className="field field-full"><label className="field-label">Описание</label><textarea className="textarea" /></div>
      </div>
    </Modal>
  );
}

function ParentFormModal({ data, onClose }) {
  return (
    <Modal
      title={data ? 'Редактировать опекуна' : 'Новый опекун'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.check}Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <div className="field"><label className="field-label">Фамилия</label><input className="input" /></div>
        <div className="field"><label className="field-label">Имя</label><input className="input" /></div>
        <div className="field"><label className="field-label">Отчество</label><input className="input" /></div>
        <div className="field"><label className="field-label">Связь</label><select className="select"><option>Мать</option><option>Отец</option><option>Опекун</option></select></div>
        <div className="field"><label className="field-label">Телефон</label><input className="input" defaultValue="+7 " /></div>
        <div className="field"><label className="field-label">Email</label><input className="input" /></div>
        <div className="field field-full"><label className="field-label">Студент</label><select className="select"><option>— Выберите —</option>{STUDENTS.map(s => <option key={s.id}>{s.last} {s.first} {s.mid}</option>)}</select></div>
      </div>
    </Modal>
  );
}

function SubjectFormModal({ onClose }) {
  return (
    <Modal title="Новый предмет" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><button className="btn btn-primary">{I.check}Сохранить</button></>}>
      <div className="form-grid">
        <div className="field field-full"><label className="field-label">Название</label><input className="input" placeholder="Базы данных" /></div>
        <div className="field"><label className="field-label">Факультет</label><select className="select"><option>ФИТ</option><option>ФЭ</option></select></div>
        <div className="field"><label className="field-label">Часов</label><input className="input" type="number" defaultValue="72" /></div>
      </div>
    </Modal>
  );
}

function PositionFormModal({ onClose }) {
  return (
    <Modal title="Новая должность" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><button className="btn btn-primary">{I.check}Сохранить</button></>}>
      <div className="form-grid">
        <div className="field field-full"><label className="field-label">Название</label><input className="input" /></div>
        <div className="field field-full"><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" /> Преподавательская должность</label></div>
      </div>
    </Modal>
  );
}

function UserFormModal({ onClose }) {
  return (
    <Modal title="Создать пользователя" sub="Учётная запись для входа в систему" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><button className="btn btn-primary">{I.check}Создать</button></>}>
      <div className="form-grid">
        <div className="field"><label className="field-label">Логин</label><input className="input" placeholder="teacher2" /></div>
        <div className="field"><label className="field-label">Роль</label><select className="select"><option>Преподаватель</option><option>Администратор</option><option>Суперадминистратор</option></select></div>
        <div className="field"><label className="field-label">Пароль</label><input className="input" type="password" /></div>
        <div className="field"><label className="field-label">Повторите</label><input className="input" type="password" /></div>
        <div className="field field-full"><label className="field-label">Привязать к сотруднику</label><select className="select"><option>— Не привязывать —</option><option>Кузнецова Н. А.</option></select></div>
      </div>
    </Modal>
  );
}

/* ============================================================
   Action modals
   ============================================================ */

function TransferModal({ data, onClose }) {
  return (
    <Modal
      title="Перевод студента"
      sub={`${data?.last || 'Иванов'} ${data?.first || 'Иван'} — текущая группа ${data?.group || 'ПИ-301'}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary">{I.swap}Перевести</button>
      </>}
    >
      <div className="banner banner-info">{I.info}<div className="banner-body">При переводе студент получает статус «Переведён» в текущей группе и «Зачислен» в новой.</div></div>
      <div className="field" style={{ marginBottom: 14 }}><label className="field-label">Новая группа</label><select className="select"><option>— Выберите —</option>{GROUPS.map(g => <option key={g.name}>{g.name} · {g.fac}</option>)}</select></div>
      <div className="field" style={{ marginBottom: 14 }}><label className="field-label">Дата перевода</label><input className="input" type="date" defaultValue="2026-05-09" /></div>
      <div className="field"><label className="field-label">Причина</label><textarea className="textarea" placeholder="Укажите причину перевода…"></textarea></div>
    </Modal>
  );
}

function DeleteConfirmModal({ data, onClose }) {
  return (
    <Modal
      title={`Удалить ${data?.type || 'запись'}?`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-danger-solid">{I.trash}Подать заявку на удаление</button>
      </>}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{I.alert}</div>
        <div>
          <p style={{ marginBottom: 8 }}>Будет создана заявка на удаление <strong>{data?.name || 'этой записи'}</strong>.</p>
          <p className="muted" style={{ fontSize: 13 }}>Запись будет удалена только после подтверждения суперадминистратором. До подтверждения объект остаётся видимым в системе.</p>
        </div>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label">Причина удаления (обязательно)</label>
        <textarea className="textarea" placeholder="Например: уволен, отчислен, дубликат…" />
      </div>
    </Modal>
  );
}

function ApproveDeleteModal({ data, onClose }) {
  return (
    <Modal
      title="Подтвердить удаление?"
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn btn-danger-solid">{I.check}Удалить навсегда</button>
      </>}
    >
      <div className="banner banner-bad">{I.alert}<div className="banner-body"><strong>Действие необратимо.</strong> Запись и связанные с ней данные будут удалены из системы.</div></div>
      <dl className="kv" style={{ padding: 0, marginTop: 12 }}>
        <dt>Тип</dt><dd><Badge>{data?.type || 'Студент'}</Badge></dd>
        <dt>Объект</dt><dd className="fwm">{data?.target || 'Сидоров А. П.'}</dd>
        <dt>Заявку подал</dt><dd className="mono">{data?.author || 'admin'} · {data?.date || '09.05.2026'}</dd>
        <dt>Причина</dt><dd className="muted">{data?.reason || 'Отчислен'}</dd>
      </dl>
    </Modal>
  );
}

function UploadDocModal({ onClose }) {
  return (
    <Modal title="Загрузить документ" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><button className="btn btn-primary">{I.upload}Загрузить</button></>}>
      <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 8, padding: 32, textAlign: 'center', background: 'var(--surface-alt)' }}>
        <div style={{ width: 40, height: 40, margin: '0 auto 12px', borderRadius: 8, background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>{I.upload}</div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Перетащите файл сюда</div>
        <div className="muted" style={{ fontSize: 12 }}>или <a href="#">выберите на компьютере</a> · PDF, JPG до 10 МБ</div>
      </div>
      <div className="field" style={{ marginTop: 14 }}><label className="field-label">Тип документа</label><select className="select"><option>Паспорт</option><option>Аттестат</option><option>Справка</option><option>Прочее</option></select></div>
    </Modal>
  );
}

function AssignSubjectModal({ onClose }) {
  return (
    <Modal title="Назначить предмет" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><button className="btn btn-primary">Назначить</button></>}>
      <div className="form-grid">
        <div className="field field-full"><label className="field-label">Предмет</label><select className="select"><option>Базы данных</option><option>Веб-программирование</option></select></div>
        <div className="field"><label className="field-label">Группа</label><select className="select">{GROUPS.map(g => <option key={g.name}>{g.name}</option>)}</select></div>
        <div className="field"><label className="field-label">Часов</label><input className="input" type="number" defaultValue="72" /></div>
      </div>
    </Modal>
  );
}

function AuditDiffModal({ data, onClose }) {
  return (
    <Modal
      size="lg"
      title="Изменение записи"
      sub={`${data?.user || 'admin'} · ${data?.ts || '09.05.2026'}`}
      onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>Закрыть</button>}
    >
      <dl className="kv" style={{ padding: 0, marginBottom: 16 }}>
        <dt>Действие</dt><dd><Badge>{data?.label || 'Изменил'}</Badge></dd>
        <dt>Объект</dt><dd className="fwm">{data?.obj || 'Студент #610'}</dd>
        <dt>IP</dt><dd className="mono muted">192.168.1.42</dd>
      </dl>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Изменённые поля</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <div style={{ background: 'var(--bad-bg)', color: 'var(--bad-fg)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>− phone: <span style={{ textDecoration: 'line-through' }}>+7 900 222-33-44</span></div>
        <div style={{ background: 'var(--ok-bg)', color: 'var(--ok-fg)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>+ phone: +7 900 222-33-99</div>
        <div style={{ background: 'var(--bad-bg)', color: 'var(--bad-fg)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>− status: pending_review</div>
        <div style={{ background: 'var(--ok-bg)', color: 'var(--ok-fg)', padding: '8px 12px' }}>+ status: enrolled</div>
      </div>
    </Modal>
  );
}

function LogoutModal({ onClose }) {
  return (
    <Modal title="Выйти из системы?" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Остаться</button><button className="btn btn-primary">{I.logout}Выйти</button></>}>
      <p>Вы уверены, что хотите выйти из учётной записи?</p>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Несохранённые изменения будут потеряны.</p>
    </Modal>
  );
}

/* ============================================================
   Detail-as-modal versions (used when navigating from list)
   ============================================================ */

function StudentDetailModal({ data, onClose, openModal }) {
  const s = data || STUDENTS[0];
  return (
    <Modal
      size="xl"
      title={`${s.last} ${s.first} ${s.mid}`}
      sub={`#${s.id} · ${s.fac} · ${s.group}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: `${s.last} ${s.first}`, type: 'студента' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={() => openModal('transfer', s)}>{I.swap}Перевести</button>
        <button className="btn btn-primary" onClick={() => openModal('studentForm', s)}>{I.pencil}Редактировать</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar name={`${s.last} ${s.first}`} size="lg" av={s.av} />
          <div style={{ marginTop: 12 }}><Badge status={s.status} /></div>
        </div>
        <div>
          <dl className="kv" style={{ padding: 0 }}>
            <dt>Дата рождения</dt><dd>{s.dob}</dd>
            <dt>Телефон</dt><dd>{s.phone}</dd>
            <dt>Email</dt><dd>{s.email}</dd>
            <dt>Факультет</dt><dd>{s.fac}</dd>
            <dt>Группа</dt><dd>{s.group}</dd>
            <dt>Опекунов</dt><dd>2</dd>
            <dt>Документов</dt><dd>3</dd>
          </dl>
        </div>
      </div>
    </Modal>
  );
}

function GroupDetailModal({ data, onClose, openModal }) {
  const g = data || GROUPS[0];
  return (
    <Modal
      size="lg"
      title={g.name}
      sub={`${g.fac} · ${g.year} · ${g.count} студентов`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: g.name, type: 'группу' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        <button className="btn btn-primary" onClick={() => openModal('groupForm', g)}>{I.pencil}Редактировать</button>
      </>}
    >
      <dl className="kv" style={{ padding: 0, marginBottom: 16 }}>
        <dt>Факультет</dt><dd>{g.fac}</dd>
        <dt>Год набора</dt><dd className="mono">{g.year}</dd>
        <dt>Классный руководитель</dt><dd>{g.curator}</dd>
        <dt>Студентов</dt><dd className="mono">{g.count}</dd>
      </dl>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Студенты группы</div>
      <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
        <thead><tr><th>ФИО</th><th>Статус</th></tr></thead>
        <tbody>
          {STUDENTS.slice(0, 4).map(s => (
            <tr key={s.id}><td className="fwm">{s.last} {s.first}</td><td><Badge status={s.status} /></td></tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

function FacultyDetailModal({ data, onClose, openModal }) {
  const f = data || { code: 'ФИТ', name: 'Факультет информационных технологий', dean: 'Сергеев П. И.', groups: 12, students: 312 };
  return (
    <Modal
      title={f.name}
      sub={`Код: ${f.code}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        <button className="btn btn-primary" onClick={() => openModal('facultyForm', f)}>{I.pencil}Редактировать</button>
      </>}
    >
      <dl className="kv" style={{ padding: 0 }}>
        <dt>Декан</dt><dd className="fwm">{f.dean}</dd>
        <dt>Групп</dt><dd className="mono">{f.groups}</dd>
        <dt>Студентов</dt><dd className="mono">{f.students}</dd>
      </dl>
    </Modal>
  );
}

function EmployeeDetailModal({ data, onClose, openModal }) {
  const e = data || { last: 'Кузнецова', first: 'Наталья', mid: 'Андреевна', pos: 'Преподаватель', teacher: true, phone: '+7 900 000-33-44', av: 4 };
  return (
    <Modal
      size="lg"
      title={`${e.last} ${e.first} ${e.mid}`}
      sub={e.pos}
      onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: `${e.last} ${e.first}`, type: 'сотрудника' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-primary" onClick={() => openModal('employeeForm', e)}>{I.pencil}Редактировать</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar name={`${e.last} ${e.first}`} size="lg" av={e.av} />
        </div>
        <dl className="kv" style={{ padding: 0 }}>
          <dt>Должность</dt><dd>{e.pos}</dd>
          <dt>Преподаёт</dt><dd>{e.teacher ? 'Да' : 'Нет'}</dd>
          <dt>Телефон</dt><dd>{e.phone}</dd>
          <dt>Email</dt><dd>—</dd>
          <dt>Классное руководство</dt><dd>{e.teacher ? 'ПИ-301' : '—'}</dd>
          <dt>Предметов</dt><dd>{e.teacher ? '2' : '0'}</dd>
        </dl>
      </div>
    </Modal>
  );
}

window.AIS_MODALS = {
  StudentFormModal, EmployeeFormModal, GroupFormModal, FacultyFormModal,
  ParentFormModal, SubjectFormModal, PositionFormModal, UserFormModal,
  TransferModal, DeleteConfirmModal, ApproveDeleteModal, UploadDocModal,
  AssignSubjectModal, AuditDiffModal, LogoutModal,
  StudentDetailModal, GroupDetailModal, FacultyDetailModal, EmployeeDetailModal,
};
