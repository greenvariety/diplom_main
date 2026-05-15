import { useEffect, useState, useRef } from 'react';
import { STATUSES, STUDENTS, GROUPS, FACULTIES, EMPLOYEES, I } from './data.jsx';
import { Badge, Avatar } from './shell.jsx';
import { useToast, Field, LoadButton, Combobox } from './utils.jsx';
import api from './api.js';

/* ============================================================
   Shared option lists
   ============================================================ */
const FAC_OPTS = [
  { value: 'ФИТ', label: 'ФИТ — Факультет информационных технологий' },
  { value: 'ФЭ',  label: 'ФЭ — Факультет экономики' },
  { value: 'ФМН', label: 'ФМН — Факультет мат. наук' },
];
const FAC_SHORT_OPTS = [
  { value: 'ФИТ', label: 'ФИТ' },
  { value: 'ФЭ',  label: 'ФЭ' },
  { value: 'ФМН', label: 'ФМН' },
];
const POSITION_OPTS = ['Преподаватель', 'Ст. преподаватель', 'Декан', 'Зав. кафедрой', 'Методист', 'Лаборант'].map(p => ({ value: p, label: p }));
const ROLE_OPTS = ['Преподаватель', 'Администратор', 'Суперадминистратор'].map(p => ({ value: p, label: p }));
const RELATION_OPTS = ['Мать', 'Отец', 'Опекун'].map(p => ({ value: p, label: p }));
const DOC_TYPE_OPTS = ['Паспорт', 'Аттестат', 'Справка', 'Полис ОМС', 'СНИЛС', 'Прочее'].map(d => ({ value: d, label: d }));
const TEACHER_OPTS = EMPLOYEES.map(e => ({ value: `${e.last} ${e.first[0]}. ${e.mid[0]}.`, label: `${e.last} ${e.first} ${e.mid}`, sub: e.pos }));
const SUBJECT_OPTS = ['Базы данных', 'Веб-программирование', 'Алгоритмы и структуры данных', 'Высшая математика', 'Микроэкономика'].map(s => ({ value: s, label: s }));
const STATUS_OPTS = Object.entries(STATUSES).map(([k, v]) => ({ value: k, label: v.label }));
const STUDENT_OPTS = STUDENTS.map(s => ({ value: s.id, label: `${s.last} ${s.first} ${s.mid}`, sub: `${s.fac} · ${s.group}` }));
const GROUP_OPTS_ALL = GROUPS.map(g => ({ value: g.name, label: g.name, sub: g.fac }));

/* ============================================================
   Animated Modal shell — close uses a fade-out, esc, overlay click,
   focus trap on first input, no shrink on overlay click for danger.
   ============================================================ */
function Modal({ size, title, sub, kind, onClose, children, footer, allowOverlayClose = true }) {
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  const doClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose && onClose(), 160);
  };

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') doClose(); };
    window.addEventListener('keydown', onKey);
    // Focus first input
    setTimeout(() => {
      const el = modalRef.current?.querySelector('input, select, textarea, button');
      el && el.focus();
    }, 50);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onOverlay = (e) => {
    if (!allowOverlayClose) return;
    if (e.target === overlayRef.current) doClose();
  };

  return (
    <div ref={overlayRef} className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={onOverlay}>
      <div ref={modalRef} className={`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <div className="modal-title" style={kind === 'danger' ? { color: 'var(--bad-fg)' } : null}>{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="modal-close" onClick={doClose} aria-label="Закрыть">{I.x}</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* Re-export close intent so child triggers (cancel button) can animate too. */
function useClosable(onClose) {
  // No-op — modal owns closing animation. Cancel buttons just call onClose.
  return onClose;
}

/* ============================================================
   StudentFormModal — sectioned, required asterisks, live validation,
   focus-flow, loading save button, focus border via .input:focus
   ============================================================ */
function StudentFormModal({ data, onClose }) {
  const isEdit = !!data;
  const toast = useToast();
  const [vals, setVals] = useState({
    last: data?.last || '', first: data?.first || '', mid: data?.mid || '',
    dob: '2004-03-15', phone: data?.phone || '+7 ', email: data?.email || '',
    fac: data?.fac || 'ФИТ', group: data?.group || '—', status: data?.status || 'pending_review',
    addr: '', note: '',
  });
  const [touched, setTouched] = useState({});
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const errs = {};
  if (!vals.last.trim()) errs.last = 'Обязательно';
  if (!vals.first.trim()) errs.first = 'Обязательно';
  if (vals.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) errs.email = 'Некорректный email';

  const save = async () => {
    setTouched({ last: 1, first: 1, email: 1 });
    if (Object.keys(errs).length) {
      toast.push('Проверьте обязательные поля', { kind: 'err' });
      return;
    }
    await new Promise(r => setTimeout(r, 700));
    toast.push(`Студент ${vals.last} ${vals.first[0] || ''}. ${isEdit ? 'обновлён' : 'добавлен'}`, { kind: 'ok' });
    onClose && onClose();
  };

  return (
    <Modal
      size="lg"
      title={isEdit ? 'Редактировать студента' : 'Новый студент'}
      sub={isEdit ? `#${data.id} · ${data.fac}` : 'Заполните личные данные и распределение'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}
    >
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required error={touched.last && errs.last}>
            <input className={`input ${touched.last && errs.last ? 'is-error' : ''}`} value={vals.last} onChange={e => set('last', e.target.value)} onBlur={() => setTouched(t => ({ ...t, last: 1 }))} />
          </Field>
          <Field label="Имя" required error={touched.first && errs.first}>
            <input className={`input ${touched.first && errs.first ? 'is-error' : ''}`} value={vals.first} onChange={e => set('first', e.target.value)} onBlur={() => setTouched(t => ({ ...t, first: 1 }))} />
          </Field>
          <Field label="Отчество"><input className="input" value={vals.mid} onChange={e => set('mid', e.target.value)} /></Field>
          <Field label="Дата рождения" required><input className="input" type="date" value={vals.dob} onChange={e => set('dob', e.target.value)} /></Field>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон"><input className="input" value={vals.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Email" error={touched.email && errs.email}>
            <input className={`input ${touched.email && errs.email ? 'is-error' : ''}`} value={vals.email} onChange={e => set('email', e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: 1 }))} />
          </Field>
          <div className="field field-full"><label className="field-label">Адрес проживания</label><input className="input" value={vals.addr} onChange={e => set('addr', e.target.value)} placeholder="г. Москва, ул. Ленина, д. 1" /></div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Учёба</div>
        <div className="form-grid">
          <Field label="Факультет" required>
            <Combobox value={vals.fac} onChange={(v) => set('fac', v)} options={FAC_OPTS} placeholder="Начните вводить название факультета…" />
          </Field>
          <Field label="Группа">
            <Combobox value={vals.group} onChange={(v) => set('group', v)} options={GROUP_OPTS_ALL.filter(g => !vals.fac || g.sub === vals.fac)} placeholder="Выберите группу" />
          </Field>
          <Field label="Статус">
            <Combobox value={vals.status} onChange={(v) => set('status', v)} options={STATUS_OPTS} placeholder="Выберите статус" allowClear={false} />
          </Field>
          <Field label="Фото"><input className="input" type="file" /></Field>
          <div className="field field-full"><label className="field-label">Примечание</label><textarea className="textarea" value={vals.note} onChange={e => set('note', e.target.value)} placeholder="Дополнительная информация…"></textarea></div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   Other entity forms — sections + required + saving feedback
   ============================================================ */
function EmployeeFormModal({ data, onClose }) {
  const toast = useToast();
  const save = async () => { await new Promise(r => setTimeout(r, 700)); toast.push(`Сотрудник ${data ? 'обновлён' : 'добавлен'}`, { kind: 'ok' }); onClose(); };
  return (
    <Modal size="lg" title={data ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required><input className="input" defaultValue={data?.last || ''} /></Field>
          <Field label="Имя" required><input className="input" defaultValue={data?.first || ''} /></Field>
          <Field label="Отчество"><input className="input" defaultValue={data?.mid || ''} /></Field>
          <Field label="Дата рождения"><input className="input" type="date" /></Field>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон"><input className="input" defaultValue={data?.phone || '+7 '} /></Field>
          <Field label="Email"><input className="input" /></Field>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">Работа</div>
        <div className="form-grid">
          <Field label="Должность" required>
            <Combobox options={POSITION_OPTS} placeholder="Начните вводить должность…" />
          </Field>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" defaultChecked={data?.teacher} /> Является преподавателем
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GroupFormModal({ data, onClose }) {
  const { group, onDone } = data || {};
  const isEdit = !!group;
  const [faculties, setFaculties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [facultyId, setFacultyId] = useState(group?.faculty_id?.toString() || '');
  const [year, setYear] = useState(group?.year?.toString() || new Date().getFullYear().toString());
  const [headteacherId, setHeadteacherId] = useState(group?.headteacher_id?.toString() || '');
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/faculties/').then(r => setFaculties(r.data)).catch(() => {});
    api.get('/employees/').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!facultyId) { setErr('Выберите факультет'); return; }
    if (!year) { setErr('Укажите год начала'); return; }
    setErr('');
    try {
      const payload = {
        faculty_id: parseInt(facultyId),
        year: parseInt(year),
        headteacher_id: headteacherId ? parseInt(headteacherId) : null,
      };
      if (isEdit) {
        await api.patch(`/groups/${group.id}/`, payload);
        toast.push('Группа обновлена', { kind: 'ok' });
      } else {
        await api.post('/groups/', payload);
        toast.push('Группа создана', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title={isEdit ? 'Редактировать группу' : 'Новая группа'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-grid">
        <Field label="Факультет" required>
          <select className="select" value={facultyId} onChange={e => { setFacultyId(e.target.value); setErr(''); }}>
            <option value="">— Выберите факультет —</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name} — {f.full_name}</option>)}
          </select>
        </Field>
        <Field label="Год начала" required>
          <input className="input" type="number" value={year} onChange={e => { setYear(e.target.value); setErr(''); }} min={2000} max={2099} />
        </Field>
        <div className="field field-full">
          <label className="field-label">Классный руководитель</label>
          <select className="select" value={headteacherId} onChange={e => setHeadteacherId(e.target.value)}>
            <option value="">— Не назначен —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function FacultyFormModal({ data, onClose }) {
  const faculty = data?.faculty;
  const onDone = data?.onDone;
  const isEdit = !!faculty;
  const toast = useToast();
  const [fullName, setFullName] = useState(faculty?.full_name || '');
  const [shortName, setShortName] = useState(faculty?.short_name || '');
  const [err, setErr] = useState('');

  const save = async () => {
    if (!fullName.trim()) { setErr('Введите полное название'); return; }
    if (!shortName.trim()) { setErr('Введите код факультета'); return; }
    setErr('');
    try {
      if (isEdit) {
        await api.patch(`/faculties/${faculty.id}/`, { full_name: fullName.trim(), short_name: shortName.trim() });
        toast.push('Факультет обновлён', { kind: 'ok' });
      } else {
        await api.post('/faculties/', { full_name: fullName.trim(), short_name: shortName.trim() });
        toast.push('Факультет создан', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title={isEdit ? 'Редактировать факультет' : 'Новый факультет'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-grid">
        <Field label="Код (аббревиатура)" required>
          <input className="input" value={shortName} onChange={e => { setShortName(e.target.value.toUpperCase()); setErr(''); }} placeholder="ФИТ" maxLength={50} />
        </Field>
        <Field label="Полное название" required>
          <input className="input" value={fullName} onChange={e => { setFullName(e.target.value); setErr(''); }} placeholder="Факультет информационных технологий" />
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function ParentFormModal({ data, onClose }) {
  const toast = useToast();
  const save = async () => { await new Promise(r => setTimeout(r, 600)); toast.push('Опекун добавлен', { kind: 'ok' }); onClose(); };
  return (
    <Modal title={data ? 'Редактировать опекуна' : 'Новый опекун'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-grid">
        <Field label="Фамилия" required><input className="input" /></Field>
        <Field label="Имя" required><input className="input" /></Field>
        <Field label="Отчество"><input className="input" /></Field>
        <Field label="Связь" required>
          <Combobox options={RELATION_OPTS} placeholder="Кем приходится…" allowClear={false} />
        </Field>
        <Field label="Телефон"><input className="input" defaultValue="+7 " /></Field>
        <Field label="Email"><input className="input" /></Field>
        <div className="field field-full">
          <label className="field-label">Студент<span className="req">*</span></label>
          <Combobox options={STUDENT_OPTS} placeholder="Начните вводить фамилию студента…" />
        </div>
      </div>
    </Modal>
  );
}

function SubjectFormModal({ onClose }) {
  const toast = useToast();
  const save = async () => { await new Promise(r => setTimeout(r, 600)); toast.push('Предмет добавлен', { kind: 'ok' }); onClose(); };
  return (
    <Modal title="Новый предмет" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Название" required><input className="input" placeholder="Базы данных" /></Field>
        <Field label="Факультет"><Combobox options={FAC_SHORT_OPTS} placeholder="Выберите факультет" /></Field>
        <Field label="Часов" required><input className="input" type="number" defaultValue="72" /></Field>
      </div>
    </Modal>
  );
}

function PositionFormModal({ onClose }) {
  const toast = useToast();
  const save = async () => { await new Promise(r => setTimeout(r, 600)); toast.push('Должность добавлена', { kind: 'ok' }); onClose(); };
  return (
    <Modal title="Новая должность" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Название" required><input className="input" /></Field>
        <div className="field field-full"><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" /> Преподавательская должность</label></div>
      </div>
    </Modal>
  );
}

function UserFormModal({ onClose }) {
  const toast = useToast();
  const save = async () => { await new Promise(r => setTimeout(r, 700)); toast.push('Пользователь создан', { kind: 'ok' }); onClose(); };
  return (
    <Modal title="Создать пользователя" sub="Учётная запись для входа в систему" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}Создать</LoadButton></>}>
      <div className="form-grid">
        <Field label="Логин" required><input className="input" placeholder="teacher2" /></Field>
        <Field label="Роль" required>
          <Combobox options={ROLE_OPTS} placeholder="Выберите роль" allowClear={false} />
        </Field>
        <Field label="Пароль" required><input className="input" type="password" /></Field>
        <Field label="Повторите" required><input className="input" type="password" /></Field>
        <div className="field field-full">
          <label className="field-label">Привязать к сотруднику</label>
          <Combobox options={TEACHER_OPTS} placeholder="Начните вводить ФИО сотрудника…" />
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   Action modals — transfer, delete (with shake), approve, upload
   ============================================================ */
function TransferModal({ data, onClose }) {
  const toast = useToast();
  const [grp, setGrp] = useState('');
  const [touched, setTouched] = useState(false);
  const submit = async () => {
    setTouched(true);
    if (!grp) { toast.push('Выберите новую группу', { kind: 'err' }); return; }
    await new Promise(r => setTimeout(r, 700));
    toast.push(`${data?.last || 'Студент'} переведён в ${grp}`, { kind: 'ok' });
    onClose();
  };
  return (
    <Modal title="Перевод студента"
      sub={`${data?.last || 'Иванов'} ${data?.first || 'Иван'} — текущая группа ${data?.group || 'ПИ-301'}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={submit}>{I.swap}Перевести</LoadButton>
      </>}>
      <div className="banner banner-info">{I.info}<div className="banner-body">При переводе студент получает статус «Переведён» в текущей группе и «Зачислен» в новой.</div></div>
      <Field label="Новая группа" required error={touched && !grp ? 'Выберите группу' : null}>
        <Combobox
          value={grp}
          onChange={(v) => setGrp(v)}
          options={GROUPS.filter(g => g.name !== data?.group).map(g => ({ value: g.name, label: g.name, sub: g.fac }))}
          placeholder="Начните вводить название группы…"
          error={touched && !grp}
        />
      </Field>
      <Field label="Дата перевода" required><input className="input" type="date" defaultValue="2026-05-09" /></Field>
      <Field label="Причина"><textarea className="textarea" placeholder="Укажите причину перевода…"></textarea></Field>
    </Modal>
  );
}

function DeleteConfirmModal({ data, onClose }) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [shake, setShake] = useState(false);
  const ref = useRef(null);

  const submit = async () => {
    if (!confirmed || !reason.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      toast.push(!reason.trim() ? 'Укажите причину удаления' : 'Подтвердите действие', { kind: 'err' });
      return;
    }
    await new Promise(r => setTimeout(r, 700));
    toast.push(`Заявка на удаление "${data?.name || 'записи'}" отправлена`, { kind: 'ok' });
    onClose();
  };

  return (
    <Modal title={`Удалить ${data?.type || 'запись'}?`} kind="danger" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className={`btn btn-danger-solid ${shake ? 'shake' : ''}`} onClick={submit}>{I.trash}Подать заявку на удаление</LoadButton>
      </>}>
      <div ref={ref} className={shake ? 'shake' : ''}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{I.alert}</div>
          <div>
            <p style={{ marginBottom: 8 }}>Будет создана заявка на удаление <strong>{data?.name || 'этой записи'}</strong>.</p>
            <p className="muted" style={{ fontSize: 13 }}>Запись будет удалена только после подтверждения суперадминистратором. До подтверждения объект остаётся видимым в системе.</p>
          </div>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label className="field-label">Причина удаления<span className="req">*</span></label>
          <textarea className={`textarea ${shake && !reason.trim() ? 'is-error' : ''}`} value={reason} onChange={e => setReason(e.target.value)} placeholder="Например: уволен, отчислен, дубликат…" />
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
          <span>Я понимаю последствия и хочу подать заявку</span>
        </label>
      </div>
    </Modal>
  );
}

function ApproveDeleteModal({ data, onClose }) {
  const toast = useToast();
  const submit = async () => { await new Promise(r => setTimeout(r, 800)); toast.push(`${data?.target || 'Запись'} удалена навсегда`, { kind: 'ok' }); onClose(); };
  return (
    <Modal title="Подтвердить удаление?" kind="danger" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-danger-solid" onClick={submit}>{I.check}Удалить навсегда</LoadButton>
      </>}>
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
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [file, setFile] = useState(null);
  const submit = async () => {
    if (!file) { toast.push('Выберите файл', { kind: 'err' }); return; }
    await new Promise(r => setTimeout(r, 800));
    toast.push(`Документ "${file.name}" загружен`, { kind: 'ok' });
    onClose();
  };
  return (
    <Modal title="Загрузить документ" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={submit}>{I.upload}Загрузить</LoadButton></>}>
      <label
        className={`dropzone ${over ? 'is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
      >
        <div className="dropzone-ico">{I.upload}</div>
        {file
          ? <>
              <div style={{ fontWeight: 500 }}>{file.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{(file.size / 1024).toFixed(1)} КБ — нажмите «Загрузить»</div>
            </>
          : <>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Перетащите файл сюда</div>
              <div className="muted" style={{ fontSize: 12 }}>или нажмите чтобы выбрать · PDF, JPG до 10 МБ</div>
            </>
        }
        <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0])} />
      </label>
      <Field label="Тип документа" required>
        <Combobox options={DOC_TYPE_OPTS} placeholder="Начните вводить тип…" allowClear={false} />
      </Field>
    </Modal>
  );
}

function AssignSubjectModal({ data, onClose }) {
  const { groupId, onDone } = data || {};
  const [subjects, setSubjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/subjects/').then(r => setSubjects(r.data)).catch(() => {});
    api.get('/employees/').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!subjectId) { setErr('Выберите предмет'); return; }
    if (!employeeId) { setErr('Выберите преподавателя'); return; }
    setErr('');
    try {
      await api.post(`/groups/${groupId}/subjects/`, {
        subject_id: parseInt(subjectId),
        employee_id: parseInt(employeeId),
      });
      toast.push('Предмет назначен', { kind: 'ok' });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при назначении');
    }
  };

  return (
    <Modal title="Назначить предмет" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>Назначить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Предмет" required>
          <select className="select" value={subjectId} onChange={e => { setSubjectId(e.target.value); setErr(''); }}>
            <option value="">— Выберите предмет —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Преподаватель" required>
          <select className="select" value={employeeId} onChange={e => { setEmployeeId(e.target.value); setErr(''); }}>
            <option value="">— Выберите преподавателя —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function AuditDiffModal({ data, onClose }) {
  // Render each changed field as its own card; old/new are clearly separated.
  // No IP shown — only when/who/what.
  const changes = data?.changes || [
    { key: 'phone',  label: 'Телефон',  from: '+7 900 222-33-44',  to: '+7 900 222-33-99' },
    { key: 'status', label: 'Статус',   from: 'pending_review',    to: 'enrolled' },
  ];
  return (
    <Modal size="lg" title="Изменение записи"
      sub={`${data?.user || 'admin1'} · ${data?.ts || '09.05.2026 13:55:04'}`}
      onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>Закрыть</button>}>
      <dl className="kv" style={{ padding: 0, marginBottom: 16 }}>
        <dt>Кто</dt><dd className="fwm"><span className="mono">{data?.user || 'admin1'}</span> <span className="muted">— {data?.userName || 'Дмитриева О. П.'}</span></dd>
        <dt>Когда</dt><dd className="mono">{data?.ts || '09.05.2026 13:55:04'}</dd>
        <dt>Действие</dt><dd><Badge>{data?.label || 'Изменил'}</Badge></dd>
        <dt>Объект</dt><dd className="fwm">{data?.obj || 'Студент #610 — Петрова М. С.'}</dd>
      </dl>
      <div className="form-section-title" style={{ marginBottom: 10 }}>Изменённые поля · {changes.length}</div>
      <div className="diff-grid">
        {changes.map((c) => (
          <div key={c.key} className="diff-card">
            <div className="diff-card-head">
              <span>{c.label}</span>
              <span className="field-key">{c.key}</span>
            </div>
            <div className="diff-row removed">
              <span className="diff-sign">−</span>
              <span className="diff-val removed-val">{String(c.from)}</span>
            </div>
            <div className="diff-row added">
              <span className="diff-sign">+</span>
              <span className="diff-val">{String(c.to)}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LogoutModal({ onClose }) {
  const toast = useToast();
  const submit = async () => { await new Promise(r => setTimeout(r, 500)); toast.push('Сеанс завершён', { kind: 'info' }); onClose(); };
  return (
    <Modal title="Выйти из системы?" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Остаться</button><LoadButton className="btn btn-primary" onClick={submit}>{I.logout}Выйти</LoadButton></>}>
      <p>Вы уверены, что хотите выйти из учётной записи?</p>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Несохранённые изменения будут потеряны.</p>
    </Modal>
  );
}

/* ============================================================
   Detail-as-modal versions
   ============================================================ */
function StudentDetailModal({ data, onClose, openModal }) {
  const s = data || STUDENTS[0];
  return (
    <Modal size="xl" title={`${s.last} ${s.first} ${s.mid}`} sub={`#${s.id} · ${s.fac} · ${s.group}`} onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: `${s.last} ${s.first}`, type: 'студента' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={() => openModal('transfer', s)}>{I.swap}Перевести</button>
        <button className="btn btn-primary" onClick={() => openModal('studentForm', s)}>{I.pencil}Редактировать</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar name={`${s.last} ${s.first}`} size="lg" av={s.av} className="avatar-zoomy" />
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
    <Modal size="lg" title={g.name} sub={`${g.fac} · ${g.year} · ${g.count} студентов`} onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: g.name, type: 'группу' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        <button className="btn btn-primary" onClick={() => openModal('groupForm', g)}>{I.pencil}Редактировать</button>
      </>}>
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
  const f = data?.faculty || data;
  const onDone = data?.onDone;
  const toast = useToast();

  const handleDeleteRequest = async () => {
    if (!window.confirm(`Отправить заявку на удаление факультета «${f.full_name}»?`)) return;
    try {
      await api.post(`/faculties/${f.id}/delete-request/`, { reason: `Удаление факультета: ${f.full_name}` });
      toast.push('Заявка на удаление отправлена', { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
    }
  };

  return (
    <Modal title={f.full_name || f.name} sub={`Код: ${f.short_name || f.code}`} onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={handleDeleteRequest}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        <button className="btn btn-primary" onClick={() => openModal('facultyForm', { faculty: f, onDone })}>{I.pencil}Редактировать</button>
      </>}>
      <dl className="kv" style={{ padding: 0 }}>
        <dt>Групп</dt><dd className="mono">{f.group_count ?? f.groups ?? '—'}</dd>
        <dt>Студентов</dt><dd className="mono">{f.student_count ?? f.students ?? '—'}</dd>
      </dl>
    </Modal>
  );
}

function EmployeeDetailModal({ data, onClose, openModal }) {
  const e = data || { last: 'Кузнецова', first: 'Наталья', mid: 'Андреевна', pos: 'Преподаватель', teacher: true, phone: '+7 900 000-33-44', av: 4 };
  return (
    <Modal size="lg" title={`${e.last} ${e.first} ${e.mid}`} sub={e.pos} onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => openModal('deleteConfirm', { name: `${e.last} ${e.first}`, type: 'сотрудника' })}>{I.trash}Удалить</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-primary" onClick={() => openModal('employeeForm', e)}>{I.pencil}Редактировать</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar name={`${e.last} ${e.first}`} size="lg" av={e.av} className="avatar-zoomy" />
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

/* ============================================================
   OrgFormModal — create / edit organization
   ============================================================ */
function OrgFormModal({ data, onClose }) {
  const org = data?.org;
  const onDone = data?.onDone;
  const isEdit = !!org;
  const toast = useToast();
  const [name, setName] = useState(org?.name || '');
  const [code, setCode] = useState(org?.code || '');
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('Введите название организации'); return; }
    setErr('');
    try {
      if (isEdit) {
        await api.patch(`/organizations/${org.id}/`, { name: name.trim(), code: code.trim() || undefined });
        toast.push('Организация обновлена', { kind: 'ok' });
      } else {
        await api.post('/organizations/', { name: name.trim(), code: code.trim() || undefined });
        toast.push('Организация создана', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal
      title={isEdit ? 'Редактировать организацию' : 'Новая организация'}
      sub={isEdit ? `Код: ${org.code}` : 'Заполните название учебного заведения'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}
    >
      <div className="form-grid">
        <Field label="Название организации" required error={err}>
          <input
            className="input"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            placeholder="Колледж информатики и технологий"
          />
        </Field>
        <Field label="Код организации" hint="Автоматически из первых букв названия, если не указан">
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="КИТ"
            maxLength={20}
          />
        </Field>
      </div>
    </Modal>
  );
}

export {
  StudentFormModal, EmployeeFormModal, GroupFormModal, FacultyFormModal,
  ParentFormModal, SubjectFormModal, PositionFormModal, UserFormModal,
  TransferModal, DeleteConfirmModal, ApproveDeleteModal, UploadDocModal,
  AssignSubjectModal, AuditDiffModal, LogoutModal,
  StudentDetailModal, GroupDetailModal, FacultyDetailModal, EmployeeDetailModal,
  OrgFormModal,
};
