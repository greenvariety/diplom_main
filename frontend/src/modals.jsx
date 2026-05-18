import { useEffect, useState, useRef } from 'react';
import { STATUSES, STUDENTS, GROUPS, FACULTIES, EMPLOYEES, I } from './data.jsx';
import { Badge, Avatar } from './shell.jsx';
import { useToast, Field, LoadButton, Combobox, PasswordInput } from './utils.jsx';
import api from './api.js';

/* ============================================================
   Shared option lists
   ============================================================ */
const FAC_OPTS = [
  { value: 'ФИТ', label: 'ФИТ - Факультет информационных технологий' },
  { value: 'ФЭ',  label: 'ФЭ - Факультет экономики' },
  { value: 'ФМН', label: 'ФМН - Факультет мат. наук' },
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
   Animated Modal shell - close uses a fade-out, esc, overlay click,
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
  // No-op - modal owns closing animation. Cancel buttons just call onClose.
  return onClose;
}

/* ============================================================
   StudentFormModal - создать / редактировать студента (реальный API)
   ============================================================ */
function StudentFormModal({ data, onClose }) {
  const { student, onDone } = data || {};
  const isEdit = !!student;
  const toast = useToast();
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [vals, setVals] = useState({
    last_name: student?.last_name || '',
    first_name: student?.first_name || '',
    middle_name: student?.middle_name || '',
    birth_date: student?.birth_date || '',
    phone: student?.phone || '',
    email: student?.email || '',
    faculty_id: student?.faculty_id ? String(student.faculty_id) : '',
    group_id: student?.group_id ? String(student.group_id) : '',
    status: student?.status || 'pending_review',
  });
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState('');
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/faculties/').then(r => setFaculties(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (vals.faculty_id) {
      api.get(`/groups/?faculty_id=${vals.faculty_id}`).then(r => setGroups(r.data)).catch(() => {});
    } else {
      setGroups([]);
      set('group_id', '');
    }
  }, [vals.faculty_id]);

  const errs = {};
  if (!vals.last_name.trim()) errs.last_name = 'Обязательно';
  if (!vals.first_name.trim()) errs.first_name = 'Обязательно';
  if (vals.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) errs.email = 'Некорректный email';
  if (!vals.faculty_id) errs.faculty_id = 'Выберите факультет';

  const save = async () => {
    setTouched({ last_name: 1, first_name: 1, email: 1, faculty_id: 1 });
    if (Object.keys(errs).length) {
      const missing = [];
      if (errs.last_name) missing.push('фамилию');
      if (errs.first_name) missing.push('имя');
      if (errs.faculty_id) missing.push('факультет');
      if (errs.email) missing.push('корректный email');
      toast.push(`Введите: ${missing.join(', ')}`, { kind: 'err' });
      return;
    }
    setErr('');
    try {
      const payload = {
        last_name: vals.last_name.trim(),
        first_name: vals.first_name.trim(),
        middle_name: vals.middle_name.trim(),
        birth_date: vals.birth_date || null,
        phone: vals.phone.trim(),
        email: vals.email.trim(),
        status: vals.status,
        faculty_id: parseInt(vals.faculty_id),
        group_id: vals.group_id ? parseInt(vals.group_id) : null,
      };
      if (isEdit) {
        await api.patch(`/students/${student.id}/`, payload);
        toast.push(`Студент ${vals.last_name} обновлён`, { kind: 'ok' });
      } else {
        await api.post('/students/', payload);
        toast.push(`Студент ${vals.last_name} добавлен`, { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal
      size="lg"
      title={isEdit ? 'Редактировать студента' : 'Новый студент'}
      sub={isEdit ? `#${student.id} · ${student.faculty_short}` : 'Заполните личные данные и распределение'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}
    >
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required error={touched.last_name && errs.last_name}>
            <input className={`input ${touched.last_name && errs.last_name ? 'is-error' : ''}`} value={vals.last_name} onChange={e => set('last_name', e.target.value)} onBlur={() => setTouched(t => ({ ...t, last_name: 1 }))} />
          </Field>
          <Field label="Имя" required error={touched.first_name && errs.first_name}>
            <input className={`input ${touched.first_name && errs.first_name ? 'is-error' : ''}`} value={vals.first_name} onChange={e => set('first_name', e.target.value)} onBlur={() => setTouched(t => ({ ...t, first_name: 1 }))} />
          </Field>
          <Field label="Отчество"><input className="input" value={vals.middle_name} onChange={e => set('middle_name', e.target.value)} /></Field>
          <Field label="Дата рождения"><input className="input" type="date" value={vals.birth_date || ''} onChange={e => set('birth_date', e.target.value)} /></Field>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон"><input className="input" value={vals.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Email" error={touched.email && errs.email}>
            <input className={`input ${touched.email && errs.email ? 'is-error' : ''}`} value={vals.email} onChange={e => set('email', e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: 1 }))} />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Учёба</div>
        <div className="form-grid">
          <Field label="Факультет" required error={touched.faculty_id && errs.faculty_id}>
            <select className={`select ${touched.faculty_id && errs.faculty_id ? 'is-error' : ''}`}
              value={vals.faculty_id}
              onChange={e => { set('faculty_id', e.target.value); set('group_id', ''); setTouched(t => ({ ...t, faculty_id: 1 })); }}>
              <option value="">- Выберите факультет -</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name} - {f.full_name}</option>)}
            </select>
          </Field>
          <Field label="Группа">
            <select className="select" value={vals.group_id} onChange={e => set('group_id', e.target.value)} disabled={!vals.faculty_id}>
              <option value="">- Без группы -</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Статус">
            <select className="select" value={vals.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
      </div>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </Modal>
  );
}

/* ============================================================
   Other entity forms - sections + required + saving feedback
   ============================================================ */
function EmployeeFormModal({ data, onClose }) {
  const employee = data?.employee;
  const onDone = data?.onDone;
  const isEdit = !!employee;
  const toast = useToast();
  const [positions, setPositions] = useState([]);
  const [lastName, setLastName] = useState(employee?.last_name || '');
  const [firstName, setFirstName] = useState(employee?.first_name || '');
  const [middleName, setMiddleName] = useState(employee?.middle_name || '');
  const [birthDate, setBirthDate] = useState(employee?.birth_date || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [positionId, setPositionId] = useState(employee?.position_id?.toString() || '');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/positions/').then(r => setPositions(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!lastName.trim()) { setErr('Введите фамилию'); return; }
    if (!firstName.trim()) { setErr('Введите имя'); return; }
    setErr('');
    try {
      const payload = {
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        birth_date: birthDate || null,
        phone: phone.trim(),
        email: email.trim(),
        position_id: positionId ? parseInt(positionId) : null,
      };
      if (isEdit) {
        await api.patch(`/employees/${employee.id}/`, payload);
        toast.push('Сотрудник обновлён', { kind: 'ok' });
      } else {
        await api.post('/employees/', payload);
        toast.push('Сотрудник добавлен', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal size="lg" title={isEdit ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required error={err && !lastName.trim() ? err : ''}>
            <input className="input" value={lastName} onChange={e => { setLastName(e.target.value); setErr(''); }} />
          </Field>
          <Field label="Имя" required>
            <input className="input" value={firstName} onChange={e => { setFirstName(e.target.value); setErr(''); }} />
          </Field>
          <Field label="Отчество">
            <input className="input" value={middleName} onChange={e => setMiddleName(e.target.value)} />
          </Field>
          <Field label="Дата рождения">
            <input className="input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон">
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">Работа</div>
        <div className="form-grid">
          <Field label="Должность">
            <select className="select" value={positionId} onChange={e => setPositionId(e.target.value)}>
              <option value="">- Не указана -</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </div>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 12, padding: '0 4px' }}>{err}</div>}
    </Modal>
  );
}

function EmployeeAssignSubjectModal({ data, onClose }) {
  const { employeeId, onDone } = data || {};
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/groups/').then(r => setGroups(r.data)).catch(() => {});
    api.get('/subjects/').then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!groupId) { setErr('Выберите группу'); return; }
    if (!subjectId) { setErr('Выберите предмет'); return; }
    setErr('');
    try {
      await api.post(`/employees/${employeeId}/subjects/`, {
        group_id: parseInt(groupId),
        subject_id: parseInt(subjectId),
      });
      toast.push('Предмет назначен', { kind: 'ok' });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при назначении');
    }
  };

  return (
    <Modal title="Назначить предмет сотруднику" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>Назначить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Группа" required>
          <select className="select" value={groupId} onChange={e => { setGroupId(e.target.value); setErr(''); }}>
            <option value="">- Выберите группу -</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Предмет" required>
          <select className="select" value={subjectId} onChange={e => { setSubjectId(e.target.value); setErr(''); }}>
            <option value="">- Выберите предмет -</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
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
            <option value="">- Выберите факультет -</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name} - {f.full_name}</option>)}
          </select>
        </Field>
        <Field label="Год начала" required>
          <input className="input" type="number" value={year} onChange={e => { setYear(e.target.value); setErr(''); }} min={2000} max={2099} />
        </Field>
        <div className="field field-full">
          <label className="field-label">Классный руководитель</label>
          <select className="select" value={headteacherId} onChange={e => setHeadteacherId(e.target.value)}>
            <option value="">- Не назначен -</option>
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
          <input className="input" value={shortName} onChange={e => { setShortName(e.target.value.toUpperCase()); setErr(''); }} maxLength={50} />
        </Field>
        <Field label="Полное название" required>
          <input className="input" value={fullName} onChange={e => { setFullName(e.target.value); setErr(''); }} />
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function ParentFormModal({ data, onClose }) {
  const { studentId, parent, onDone } = data || {};
  const isEdit = !!parent;
  const isStudentContext = !!studentId;
  const toast = useToast();
  const [lastName, setLastName] = useState(parent?.last_name || '');
  const [firstName, setFirstName] = useState(parent?.first_name || '');
  const [middleName, setMiddleName] = useState(parent?.middle_name || '');
  const [phone, setPhone] = useState(parent?.phone || '');
  const [email, setEmail] = useState(parent?.email || '');
  const [relationType, setRelationType] = useState('guardian');
  const [err, setErr] = useState('');

  const save = async () => {
    if (!lastName.trim()) { setErr('Введите фамилию'); return; }
    if (!firstName.trim()) { setErr('Введите имя'); return; }
    setErr('');
    const payload = {
      last_name: lastName.trim(),
      first_name: firstName.trim(),
      middle_name: middleName.trim(),
      phone: phone.trim(),
      email: email.trim(),
    };
    try {
      if (isEdit) {
        await api.patch(`/parents/${parent.id}/`, payload);
        toast.push('Опекун обновлён', { kind: 'ok' });
      } else if (isStudentContext) {
        await api.post(`/students/${studentId}/parents/`, { ...payload, relation_type: relationType });
        toast.push('Опекун добавлен', { kind: 'ok' });
      } else {
        await api.post('/parents/', payload);
        toast.push('Опекун добавлен', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title={isEdit ? 'Редактировать опекуна' : 'Новый опекун'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}>
      <div className="form-grid">
        <Field label="Фамилия" required><input className="input" value={lastName} onChange={e => { setLastName(e.target.value); setErr(''); }} /></Field>
        <Field label="Имя" required><input className="input" value={firstName} onChange={e => { setFirstName(e.target.value); setErr(''); }} /></Field>
        <Field label="Отчество"><input className="input" value={middleName} onChange={e => setMiddleName(e.target.value)} /></Field>
        {isStudentContext && !isEdit && (
          <Field label="Связь" required>
            <select className="select" value={relationType} onChange={e => setRelationType(e.target.value)}>
              <option value="mother">Мать</option>
              <option value="father">Отец</option>
              <option value="guardian">Опекун</option>
            </select>
          </Field>
        )}
        <Field label="Телефон"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function SubjectFormModal({ data, onClose }) {
  const subject = data?.subject;
  const onDone = data?.onDone;
  const isEdit = !!subject;
  const toast = useToast();
  const [name, setName] = useState(subject?.name || '');
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('Введите название предмета'); return; }
    setErr('');
    try {
      if (isEdit) {
        await api.patch(`/subjects/${subject.id}/`, { name: name.trim() });
        toast.push('Предмет обновлён', { kind: 'ok' });
      } else {
        await api.post('/subjects/', { name: name.trim() });
        toast.push('Предмет добавлен', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title={isEdit ? 'Редактировать предмет' : 'Новый предмет'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Название" required error={err}>
          <input className="input" value={name} onChange={e => { setName(e.target.value); setErr(''); }} />
        </Field>
      </div>
    </Modal>
  );
}

function PositionFormModal({ data, onClose }) {
  const position = data?.position;
  const onDone = data?.onDone;
  const isEdit = !!position;
  const toast = useToast();
  const [name, setName] = useState(position?.name || '');
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('Введите название должности'); return; }
    setErr('');
    try {
      if (isEdit) {
        await api.patch(`/positions/${position.id}/`, { name: name.trim() });
        toast.push('Должность обновлена', { kind: 'ok' });
      } else {
        await api.post('/positions/', { name: name.trim() });
        toast.push('Должность добавлена', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title={isEdit ? 'Редактировать должность' : 'Новая должность'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton></>}>
      <div className="form-grid">
        <Field label="Название" required error={err}>
          <input className="input" value={name} onChange={e => { setName(e.target.value); setErr(''); }} />
        </Field>
      </div>
    </Modal>
  );
}

const REAL_ROLE_OPTS = [
  { value: 'admin', label: 'Администратор' },
  { value: 'teacher', label: 'Преподаватель' },
];

function UserFormModal({ data, onClose }) {
  const { user, onDone } = data || {};
  const isEdit = !!user;
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [role, setRole] = useState(user?.role || 'teacher');
  const [employeeId, setEmployeeId] = useState(user?.employee_id ? String(user.employee_id) : '');
  const [institutionIds, setInstitutionIds] = useState(user?.institution_ids || []);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/employees/').then(r => setEmployees(r.data)).catch(() => {});
    api.get('/organizations/').then(r => setOrgs(r.data)).catch(() => {});
  }, []);

  const toggleOrg = (id) => {
    setInstitutionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const employeeOpts = employees.map(e => ({ value: String(e.id), label: e.full_name, sub: e.position_name || '' }));

  const save = async () => {
    setErr('');
    if (!isEdit && !username.trim()) { setErr('Введите логин'); return; }
    if (!isEdit && !password) { setErr('Введите пароль'); return; }
    if (!isEdit && password !== password2) { setErr('Пароли не совпадают'); return; }
    if (institutionIds.length === 0) { setErr('Выберите хотя бы одну организацию'); return; }
    try {
      if (isEdit) {
        await api.patch(`/users/${user.id}/`, {
          display_name: displayName,
          role,
          employee_id: employeeId ? parseInt(employeeId) : null,
          institution_ids: institutionIds,
        });
        toast.push('Пользователь обновлён', { kind: 'ok' });
      } else {
        await api.post('/users/', {
          username,
          display_name: displayName,
          role,
          password,
          employee_id: employeeId ? parseInt(employeeId) : null,
          institution_ids: institutionIds,
        });
        toast.push('Пользователь создан', { kind: 'ok' });
      }
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal
      title={isEdit ? 'Редактировать пользователя' : 'Создать пользователя'}
      sub="Учётная запись для входа в систему"
      onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.check}{isEdit ? 'Сохранить' : 'Создать'}</LoadButton></>}
    >
      <div className="form-grid">
        {!isEdit && (
          <Field label="Логин" required>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
          </Field>
        )}
        <Field label="ФИО">
          <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Роль" required>
          <select className="select" value={role} onChange={e => setRole(e.target.value)}>
            {REAL_ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {!isEdit && <>
          <Field label="Пароль" required>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value.replace(/[^\x00-\x7F]/g, ''))} />
          </Field>
          <Field label="Повторите" required>
            <input className="input" type="password" value={password2} onChange={e => setPassword2(e.target.value.replace(/[^\x00-\x7F]/g, ''))} />
          </Field>
        </>}
        <div className="field field-full">
          <label className="field-label">Привязать к сотруднику</label>
          <Combobox
            options={employeeOpts}
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="Начните вводить ФИО сотрудника…"
          />
        </div>
        <div className="field field-full">
          <label className="field-label">Доступ к организациям <span className="req">*</span></label>
          {orgs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Нет организаций</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {orgs.map(org => (
                <label key={org.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={institutionIds.includes(org.id)}
                    onChange={() => toggleOrg(org.id)}
                  />
                  <span style={{ fontWeight: 500 }}>{org.code}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{org.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </Modal>
  );
}

function UserSetPasswordModal({ data, onClose }) {
  const { userId, username } = data || {};
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    if (!password) { setErr('Введите новый пароль'); return; }
    if (password !== password2) { setErr('Пароли не совпадают'); return; }
    try {
      await api.post(`/users/${userId}/set-password/`, { new_password: password });
      toast.push('Пароль изменён', { kind: 'ok' });
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при смене пароля');
    }
  };

  return (
    <Modal
      title="Сменить пароль"
      sub={`Учётная запись: ${username || ''}`}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={save}>{I.shield}Сменить</LoadButton></>}
    >
      <div className="form-grid">
        <Field label="Новый пароль" required>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value.replace(/[^\x00-\x7F]/g, ''))} />
        </Field>
        <Field label="Повторите" required>
          <input className="input" type="password" value={password2} onChange={e => setPassword2(e.target.value.replace(/[^\x00-\x7F]/g, ''))} />
        </Field>
      </div>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </Modal>
  );
}

/* ============================================================
   Action modals - transfer, delete (with shake), approve, upload
   ============================================================ */
function TransferModal({ data, onClose }) {
  const { student, onDone } = data || {};
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/groups/').then(r => setGroups(r.data)).catch(() => {});
  }, []);

  const submit = async () => {
    setTouched(true);
    if (!groupId) { toast.push('Выберите новую группу', { kind: 'err' }); return; }
    setErr('');
    try {
      await api.post(`/students/${student.id}/transfer/`, { group_id: parseInt(groupId) });
      toast.push(`${student.last_name} переведён`, { kind: 'ok' });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при переводе');
    }
  };

  return (
    <Modal title="Перевод студента"
      sub={`${student?.last_name || ''} ${student?.first_name || ''} - текущая группа: ${student?.group_name || 'не назначена'}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={submit}>{I.swap}Перевести</LoadButton>
      </>}>
      <div className="banner banner-info">{I.info}<div className="banner-body">При переводе студент получает статус «Переведён» и привязывается к новой группе и факультету.</div></div>
      <Field label="Новая группа" required error={touched && !groupId ? 'Выберите группу' : null}>
        <select className={`select ${touched && !groupId ? 'is-error' : ''}`} value={groupId} onChange={e => setGroupId(e.target.value)}>
          <option value="">- Выберите группу -</option>
          {groups.filter(g => !student?.group_id || g.id !== student.group_id).map(g => (
            <option key={g.id} value={g.id}>{g.name} - {g.faculty_name}</option>
          ))}
        </select>
      </Field>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </Modal>
  );
}

function DeleteConfirmModal({ data, onClose }) {
  const { name, type, studentId, onDone } = data || {};
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [shake, setShake] = useState(false);
  const ref = useRef(null);

  const submit = async () => {
    if (!confirmed || !reason.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (!reason.trim() && !confirmed) toast.push('Укажите причину удаления и подтвердите действие', { kind: 'err' });
      else if (!reason.trim()) toast.push('Укажите причину удаления', { kind: 'err' });
      else toast.push('Подтвердите действие', { kind: 'err' });
      return;
    }
    try {
      if (studentId) {
        await api.post(`/students/${studentId}/delete-request/`, { reason: reason.trim() });
      }
      toast.push(`Заявка на удаление "${name || 'записи'}" отправлена`, { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка при отправке заявки', { kind: 'err' });
    }
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
          <textarea className={`textarea ${shake && !reason.trim() ? 'is-error' : ''}`} value={reason} onChange={e => setReason(e.target.value)} />
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
  const [err, setErr] = useState('');
  const submit = async () => {
    setErr('');
    try {
      await api.post(`/delete-requests/${data.id}/approve/`);
      toast.push(`${data?.object_repr || 'Запись'} удалена навсегда`, { kind: 'ok' });
      data?.onDone && data.onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при удалении');
    }
  };
  return (
    <Modal title="Подтвердить удаление?" kind="danger" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-danger-solid" onClick={submit}>{I.check}Удалить навсегда</LoadButton>
      </>}>
      <div className="banner banner-bad">{I.alert}<div className="banner-body"><strong>Действие необратимо.</strong> Запись и связанные с ней данные будут удалены из системы.</div></div>
      <dl className="kv" style={{ padding: 0, marginTop: 12 }}>
        <dt>Тип</dt><dd><Badge>{data?.type_label || 'Объект'}</Badge></dd>
        <dt>Объект</dt><dd className="fwm">{data?.object_repr || '-'}</dd>
        <dt>Заявку подал</dt><dd className="mono">{data?.author || '-'} · {data?.created_at || '-'}</dd>
        <dt>Причина</dt><dd className="muted">{data?.reason || '-'}</dd>
      </dl>
      {err && <div className="banner banner-bad" style={{ marginTop: 8 }}>{I.alert}<div className="banner-body">{err}</div></div>}
    </Modal>
  );
}

function UploadDocModal({ data, onClose }) {
  const { ownerId, ownerType, onDone, file: initFile } = data || {};
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [file, setFile] = useState(initFile || null);
  const [name, setName] = useState(initFile?.name || '');
  const [docType, setDocType] = useState('other');
  const [err, setErr] = useState('');

  useEffect(() => { if (initFile) setName(initFile.name); }, []);

  const submit = async () => {
    if (!file) { toast.push('Выберите файл', { kind: 'err' }); return; }
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim() || file.name);
      fd.append('doc_type', docType);
      fd.append('owner_type', ownerType || 'student');
      fd.append('owner_id', ownerId);
      await api.post('/documents/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.push(`Документ "${name || file.name}" загружен`, { kind: 'ok' });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при загрузке');
    }
  };

  return (
    <Modal title="Загрузить документ" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Отмена</button><LoadButton className="btn btn-primary" onClick={submit}>{I.upload}Загрузить</LoadButton></>}>
      <label
        className={`dropzone ${over ? 'is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setName(f.name); } }}
      >
        <div className="dropzone-ico">{I.upload}</div>
        {file
          ? <>
              <div style={{ fontWeight: 500 }}>{file.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{(file.size / 1024).toFixed(1)} КБ</div>
            </>
          : <>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Перетащите файл сюда</div>
              <div className="muted" style={{ fontSize: 12 }}>или нажмите чтобы выбрать · PDF, JPG до 10 МБ</div>
            </>
        }
        <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setName(f.name); } }} />
      </label>
      <Field label="Название документа">
        <input className="input" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Тип документа">
        <select className="select" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="passport">Паспорт</option>
          <option value="snils">СНИЛС</option>
          <option value="policy">Полис ОМС</option>
          <option value="certificate">Аттестат</option>
          <option value="order">Приказ</option>
          <option value="other">Прочее</option>
        </select>
      </Field>
      {err && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
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
            <option value="">- Выберите предмет -</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Преподаватель" required>
          <select className="select" value={employeeId} onChange={e => { setEmployeeId(e.target.value); setErr(''); }}>
            <option value="">- Выберите преподавателя -</option>
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
  // No IP shown - only when/who/what.
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
        <dt>Кто</dt><dd className="fwm"><span className="mono">{data?.user || 'admin1'}</span> <span className="muted">- {data?.userName || 'Дмитриева О. П.'}</span></dd>
        <dt>Когда</dt><dd className="mono">{data?.ts || '09.05.2026 13:55:04'}</dd>
        <dt>Действие</dt><dd><Badge>{data?.label || 'Изменил'}</Badge></dd>
        <dt>Объект</dt><dd className="fwm">{data?.obj || 'Студент #610 - Петрова М. С.'}</dd>
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

function LogoutModal({ onClose, onLogout }) {
  const toast = useToast();
  const submit = async () => {
    await new Promise(r => setTimeout(r, 400));
    toast.push('Сеанс завершён', { kind: 'info' });
    onClose();
    onLogout && onLogout();
  };
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
        <dt>Групп</dt><dd className="mono">{f.group_count ?? f.groups ?? '-'}</dd>
        <dt>Студентов</dt><dd className="mono">{f.student_count ?? f.students ?? '-'}</dd>
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
          <dt>Email</dt><dd>-</dd>
          <dt>Классное руководство</dt><dd>{e.teacher ? 'ПИ-301' : '-'}</dd>
          <dt>Предметов</dt><dd>{e.teacher ? '2' : '0'}</dd>
        </dl>
      </div>
    </Modal>
  );
}

/* ============================================================
   OrgFormModal - create / edit organization
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
          />
        </Field>
        <Field label="Код организации" hint="Автоматически из первых букв названия, если не указан">
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={20}
          />
        </Field>
      </div>
    </Modal>
  );
}

function ParentAddStudentModal({ data, onClose }) {
  const { parentId, onDone } = data || {};
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [relationType, setRelationType] = useState('guardian');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/students/').then(r => {
      const items = Array.isArray(r.data) ? r.data : (r.data.results || []);
      setStudents(items);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!studentId) { setErr('Выберите студента'); return; }
    setErr('');
    try {
      await api.post(`/parents/${parentId}/students/`, { student_id: parseInt(studentId), relation_type: relationType });
      toast.push('Студент привязан', { kind: 'ok' });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  return (
    <Modal title="Привязать студента" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Привязать</LoadButton>
      </>}>
      <div className="form-grid">
        <div className="field field-full">
          <label className="field-label">Студент<span className="req">*</span></label>
          <select className="select" value={studentId} onChange={e => { setStudentId(e.target.value); setErr(''); }}>
            <option value="">- Выберите студента -</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name || `${s.last_name} ${s.first_name}`}</option>)}
          </select>
        </div>
        <Field label="Связь" required>
          <select className="select" value={relationType} onChange={e => setRelationType(e.target.value)}>
            <option value="mother">Мать</option>
            <option value="father">Отец</option>
            <option value="guardian">Опекун</option>
          </select>
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function OrgDeleteConfirmModal({ data, onClose }) {
  const { org, onDone } = data || {};
  const toast = useToast();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [words, setWords] = useState(Array(12).fill(''));
  const [shake, setShake] = useState(false);

  const blockPaste = (e) => e.preventDefault();
  const filled = words.filter(Boolean).length;
  const canSubmit = p1 && p1 === p2 && filled === 12;

  const submit = async () => {
    if (!canSubmit) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      const noPass = !p1;
      const noSeed = filled === 0;
      if (noPass && noSeed) toast.push('Введите пароль и сид-фразу', { kind: 'err' });
      else if (noPass) toast.push('Введите пароль', { kind: 'err' });
      else if (p1 !== p2) toast.push('Пароли не совпадают', { kind: 'err' });
      else if (noSeed) toast.push('Введите сид-фразу', { kind: 'err' });
      else toast.push('Введите все 12 слов сид-фразы', { kind: 'err' });
      return;
    }
    try {
      await api.delete(`/organizations/${org.id}/`, { data: { password: p1, seed_words: words } });
      toast.push('Организация удалена', { kind: 'ok' });
      onDone && onDone(org.id);
      onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка удаления', { kind: 'err' });
    }
  };

  return (
    <Modal title="Удалить организацию?" kind="danger" onClose={onClose} allowOverlayClose={false}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className={`btn btn-danger-solid ${shake ? 'shake' : ''}`} onClick={submit}>{I.trash}Удалить навсегда</LoadButton>
      </>}>
      <div className={shake ? 'shake' : ''}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{I.alert}</div>
          <div>
            <p style={{ marginBottom: 4 }}>Будет удалена организация <strong>{org?.name}</strong>.</p>
            <p className="muted" style={{ fontSize: 13 }}>Все данные организации, будут удалены безвозвратно. Это действие нельзя отменить!</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Пароль" required>
            <PasswordInput value={p1} onChange={setP1} onPaste={blockPaste} autoComplete="off" hasError={shake && !p1} />
          </Field>
          <Field label="Повторите пароль" required error={p2 && p1 !== p2 ? 'Не совпадает' : null} success={p2 && p1 === p2}>
            <PasswordInput value={p2} onChange={setP2} onPaste={blockPaste} autoComplete="off" hasError={shake && (!p2 || p1 !== p2)} />
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
          <div className="form-section-title" style={{ margin: 0 }}>Сид-фраза</div>
          <span className="muted" style={{ fontSize: 12 }}>{filled} / 12 введено</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {words.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 20, fontFamily: 'var(--font-mono)' }}>{String(i + 1).padStart(2, '0')}.</span>
              <input
                className={`input ${shake && !w ? 'is-error' : ''}`}
                style={{ fontSize: 12, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}
                placeholder=""
                value={w}
                autoComplete="off"
                onChange={e => { const a = [...words]; a[i] = e.target.value.trim(); setWords(a); }}
                onPaste={blockPaste}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export {
  StudentFormModal, EmployeeFormModal, GroupFormModal, FacultyFormModal,
  ParentFormModal, ParentAddStudentModal, SubjectFormModal, PositionFormModal, UserFormModal, UserSetPasswordModal,
  TransferModal, DeleteConfirmModal, ApproveDeleteModal, UploadDocModal,
  AssignSubjectModal, EmployeeAssignSubjectModal, AuditDiffModal, LogoutModal,
  StudentDetailModal, GroupDetailModal, FacultyDetailModal, EmployeeDetailModal,
  OrgFormModal, OrgDeleteConfirmModal,
};
