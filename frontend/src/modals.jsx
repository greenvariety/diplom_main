import { useEffect, useState, useRef } from 'react';
import { STATUSES, STUDENTS, GROUPS, FACULTIES, EMPLOYEES, I } from './data.jsx';
import { Badge, Avatar } from './shell.jsx';
import { useToast, FadingError, Field, LoadButton, Combobox, PasswordInput } from './utils.jsx';
import api from './api.js';

/* ============================================================
   Phone mask helpers
   ============================================================ */
function applyPhoneMask(raw) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  let n = digits;
  if (n[0] === '7') n = '8' + n.slice(1);
  else if (n[0] === '9') n = '8' + n;
  n = n.slice(0, 11);
  if (n.length <= 1) return n;
  let r = n[0] + ' (';
  r += n.slice(1, Math.min(4, n.length));
  if (n.length >= 4) r += ') ' + n.slice(4, Math.min(7, n.length));
  if (n.length >= 7) r += '-' + n.slice(7, Math.min(9, n.length));
  if (n.length >= 9) r += '-' + n.slice(9, 11);
  return r;
}

const PHONE_RE = /^8 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRANSLIT_MAP = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
  'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
};
function translit(str) {
  return str.toLowerCase().split('').map(c => TRANSLIT_MAP[c] ?? c).join('');
}
function genUsername(emp) {
  const fi = translit(emp.first_name || '').replace(/[^a-z]/g, '').charAt(0);
  const ln = translit(emp.last_name || '').replace(/[^a-z0-9]/g, '');
  return fi && ln ? `${fi}.${ln}` : (ln || fi);
}

function validatePhone(v) {
  if (!v) return null;
  return PHONE_RE.test(v) ? null : 'Формат: 8 (900) 123-45-67';
}
function validateEmail(v) {
  if (!v) return null;
  return EMAIL_RE.test(v) ? null : 'Некорректный email';
}

function filterName(str) { return str.replace(/[^А-ЯЁа-яё\s\-]/g, ''); }
function filterLogin(str) { return str.replace(/[^a-zA-Z0-9._\-]/g, ''); }
const NAME_INPUT_PROPS = {
  onBeforeInput: e => { if (e.data && /[^А-ЯЁа-яё\s\-]/.test(e.data)) e.preventDefault(); },
};
const LOGIN_INPUT_PROPS = {
  onBeforeInput: e => { if (e.data && /[^a-zA-Z0-9._\-]/.test(e.data)) e.preventDefault(); },
};

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
  const { student, onDone, preGroupId, preFacultyId } = data || {};
  const isEdit = !!student;
  const toast = useToast();
  const fileRef = useRef(null);
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [vals, setVals] = useState({
    last_name: student?.last_name || '',
    first_name: student?.first_name || '',
    middle_name: student?.middle_name || '',
    birth_date: student?.birth_date || '',
    phone: student?.phone || '',
    email: student?.email || '',
    faculty_id: student?.faculty_id ? String(student.faculty_id) : (preFacultyId ? String(preFacultyId) : ''),
    group_id: student?.group_id ? String(student.group_id) : (preGroupId ? String(preGroupId) : ''),
    status: student?.status || 'pending_review',
  });
  const [touched, setTouched] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student?.photo || null);
  const [dragOver, setDragOver] = useState(false);
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
  const phoneErr = validatePhone(vals.phone);
  if (phoneErr) errs.phone = phoneErr;
  const emailErr = validateEmail(vals.email);
  if (emailErr) errs.email = emailErr;
  if (!vals.faculty_id) errs.faculty_id = 'Выберите факультет';

  const handlePhoto = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.push('Фото слишком большое - максимум 5 МБ', { kind: 'err' }); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 2000 || img.height > 2000) { toast.push('Размер фото превышает 2000x2000 пикселей', { kind: 'err' }); return; }
        setPhoto(file);
        setPhotoPreview(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    setTouched({ last_name: 1, first_name: 1, phone: 1, email: 1, faculty_id: 1 });
    if (Object.keys(errs).length) {
      const missing = [];
      if (errs.last_name) missing.push('фамилию');
      if (errs.first_name) missing.push('имя');
      if (errs.faculty_id) missing.push('факультет');
      if (errs.phone) missing.push('корректный телефон');
      if (errs.email) missing.push('корректный email');
      toast.push(`Проверьте: ${missing.join(', ')}`, { kind: 'err' });
      return;
    }
    setErr('');
    try {
      const fd = new FormData();
      fd.append('last_name', vals.last_name.trim());
      fd.append('first_name', vals.first_name.trim());
      fd.append('middle_name', vals.middle_name.trim());
      fd.append('birth_date', vals.birth_date || '');
      fd.append('phone', vals.phone.trim());
      fd.append('email', vals.email.trim());
      fd.append('status', vals.status);
      fd.append('faculty_id', vals.faculty_id);
      fd.append('group_id', vals.group_id || '');
      if (photo) fd.append('photo', photo);
      if (isEdit) {
        await api.patch(`/students/${student.id}/`, fd);
        toast.push(`Студент ${vals.last_name} обновлён`, { kind: 'ok' });
      } else {
        await api.post('/students/', fd);
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
      sub={isEdit ? student.faculty_short : 'Заполните личные данные и распределение'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 8, marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handlePhoto(e.dataTransfer.files[0]); }}
          style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0, border: dragOver ? '2px solid var(--accent)' : '2px dashed var(--border)', background: dragOver ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s, background .15s' }}
        >
          {photoPreview
            ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 24, opacity: 0.3 }}>🖼</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Фото студента</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{photoPreview ? 'Нажмите на квадрат, чтобы заменить фото' : 'Нажмите на квадрат или перетащите изображение'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>Максимум 5 МБ, не более 2000x2000 пикселей</div>
          {photoPreview && <button onClick={removePhoto} style={{ marginTop: 6, fontSize: 11, color: 'var(--bad-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Удалить фото</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
      </div>
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required error={touched.last_name && errs.last_name} className="field-full">
            <input className={`input ${touched.last_name && errs.last_name ? 'is-error' : ''}`} value={vals.last_name} onChange={e => set('last_name', e.target.value)} onBlur={() => setTouched(t => ({ ...t, last_name: 1 }))} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); set('last_name', (vals.last_name + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
          </Field>
          <Field label="Имя" required error={touched.first_name && errs.first_name} className="field-full">
            <input className={`input ${touched.first_name && errs.first_name ? 'is-error' : ''}`} value={vals.first_name} onChange={e => set('first_name', e.target.value)} onBlur={() => setTouched(t => ({ ...t, first_name: 1 }))} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); set('first_name', (vals.first_name + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
          </Field>
          <Field label="Отчество" className="field-full"><input className="input" value={vals.middle_name} onChange={e => set('middle_name', e.target.value)} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); set('middle_name', (vals.middle_name + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} /></Field>
          <Field label="Дата рождения"><input className="input" type="date" value={vals.birth_date || ''} onChange={e => set('birth_date', e.target.value)} /></Field>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон" error={touched.phone && errs.phone}>
            <input className={`input ${touched.phone && errs.phone ? 'is-error' : ''}`} value={vals.phone} onChange={e => set('phone', applyPhoneMask(e.target.value))} onBlur={() => setTouched(t => ({ ...t, phone: 1 }))} maxLength={18} />
          </Field>
          <Field label="Email" error={touched.email && errs.email}>
            <input className={`input ${touched.email && errs.email ? 'is-error' : ''}`} value={vals.email} onChange={e => set('email', e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: 1 }))} maxLength={254} />
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
  const fileRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const [lastName, setLastName] = useState(employee?.last_name || '');
  const [firstName, setFirstName] = useState(employee?.first_name || '');
  const [middleName, setMiddleName] = useState(employee?.middle_name || '');
  const [birthDate, setBirthDate] = useState(employee?.birth_date || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [positionId, setPositionId] = useState(employee?.position_id?.toString() || '');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(employee?.photo || null);
  const [dragOver, setDragOver] = useState(false);
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState('');
  const touch = (f) => setTouched(t => ({ ...t, [f]: 1 }));

  const fieldErrs = {};
  if (!lastName.trim()) fieldErrs.last_name = 'Обязательно';
  if (!firstName.trim()) fieldErrs.first_name = 'Обязательно';
  const empPhoneErr = validatePhone(phone);
  if (empPhoneErr) fieldErrs.phone = empPhoneErr;
  const empEmailErr = validateEmail(email);
  if (empEmailErr) fieldErrs.email = empEmailErr;

  useEffect(() => {
    api.get('/positions/').then(r => setPositions(r.data)).catch(() => {});
  }, []);

  const handlePhoto = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.push('Фото слишком большое - максимум 5 МБ', { kind: 'err' }); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 2000 || img.height > 2000) { toast.push('Размер фото превышает 2000x2000 пикселей', { kind: 'err' }); return; }
        setPhoto(file);
        setPhotoPreview(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    setTouched({ last_name: 1, first_name: 1, phone: 1, email: 1 });
    if (Object.keys(fieldErrs).length) {
      const msgs = [];
      if (fieldErrs.last_name) msgs.push('фамилию');
      if (fieldErrs.first_name) msgs.push('имя');
      if (fieldErrs.phone) msgs.push('корректный телефон');
      if (fieldErrs.email) msgs.push('корректный email');
      toast.push(`Проверьте: ${msgs.join(', ')}`, { kind: 'err' });
      return;
    }
    setErr('');
    try {
      const fd = new FormData();
      fd.append('last_name', lastName.trim());
      fd.append('first_name', firstName.trim());
      fd.append('middle_name', middleName.trim());
      fd.append('birth_date', birthDate || '');
      fd.append('phone', phone.trim());
      fd.append('email', email.trim());
      fd.append('position_id', positionId || '');
      if (photo) fd.append('photo', photo);
      if (isEdit) {
        await api.patch(`/employees/${employee.id}/`, fd);
        toast.push('Сотрудник обновлён', { kind: 'ok' });
      } else {
        await api.post('/employees/', fd);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 8, marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handlePhoto(e.dataTransfer.files[0]); }}
          style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0, border: dragOver ? '2px solid var(--accent)' : '2px dashed var(--border)', background: dragOver ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s, background .15s' }}
        >
          {photoPreview
            ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 24, opacity: 0.3 }}>🖼</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Фото сотрудника</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{photoPreview ? 'Нажмите на квадрат, чтобы заменить фото' : 'Нажмите на квадрат или перетащите изображение'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>Максимум 5 МБ, не более 2000x2000 пикселей</div>
          {photoPreview && <button onClick={removePhoto} style={{ marginTop: 6, fontSize: 11, color: 'var(--bad-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Удалить фото</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
      </div>
      <div className="form-section">
        <div className="form-section-title">Личные данные</div>
        <div className="form-grid">
          <Field label="Фамилия" required error={touched.last_name && fieldErrs.last_name} className="field-full">
            <input className={`input ${touched.last_name && fieldErrs.last_name ? 'is-error' : ''}`} value={lastName} onChange={e => { setLastName(e.target.value); setErr(''); }} onBlur={() => touch('last_name')} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setLastName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
          </Field>
          <Field label="Имя" required error={touched.first_name && fieldErrs.first_name} className="field-full">
            <input className={`input ${touched.first_name && fieldErrs.first_name ? 'is-error' : ''}`} value={firstName} onChange={e => { setFirstName(e.target.value); setErr(''); }} onBlur={() => touch('first_name')} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setFirstName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
          </Field>
          <Field label="Отчество" className="field-full">
            <input className="input" value={middleName} onChange={e => setMiddleName(e.target.value)} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setMiddleName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
          </Field>
          <Field label="Дата рождения">
            <input className="input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">Контакты</div>
        <div className="form-grid">
          <Field label="Телефон" error={touched.phone && fieldErrs.phone}>
            <input className={`input ${touched.phone && fieldErrs.phone ? 'is-error' : ''}`} value={phone} onChange={e => setPhone(applyPhoneMask(e.target.value))} onBlur={() => touch('phone')} maxLength={18} />
          </Field>
          <Field label="Email" error={touched.email && fieldErrs.email}>
            <input className={`input ${touched.email && fieldErrs.email ? 'is-error' : ''}`} value={email} onChange={e => { setEmail(e.target.value); }} onBlur={() => touch('email')} maxLength={254} />
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
  const { group, onDone, facultyId: presetFacultyId } = data || {};
  const isEdit = !!group;
  const [faculties, setFaculties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [facultyId, setFacultyId] = useState(group?.faculty_id?.toString() || presetFacultyId?.toString() || '');
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
        {!presetFacultyId && (
          <Field label="Факультет" required error={err && !facultyId ? err : null}>
            <select className={`select ${err && !facultyId ? 'is-error' : ''}`} value={facultyId} onChange={e => { setFacultyId(e.target.value); setErr(''); }}>
              <option value="">- Выберите факультет -</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.short_name} - {f.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Год начала" required error={err && facultyId && !year ? err : null}>
          <input className={`input ${err && facultyId && !year ? 'is-error' : ''}`} type="number" value={year} onChange={e => { setYear(e.target.value); setErr(''); }} min={2000} max={2099} />
        </Field>
        <div className="field field-full">
          <label className="field-label">Классный руководитель</label>
          <select className="select" value={headteacherId} onChange={e => setHeadteacherId(e.target.value)}>
            <option value="">- Не назначен -</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        {err && facultyId && year && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
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
  const [codeManual, setCodeManual] = useState(isEdit);
  const [err, setErr] = useState('');

  const isUC = (c) => c && ((c >= 'А' && c <= 'Я') || c === 'Ё');
  const isLC = (c) => c && ((c >= 'а' && c <= 'я') || c === 'ё');
  const autoCode = (n) => { const s = n.trim(); if (!s) return ''; const hasLower = [...s].some(c => isLC(c)); if (!hasLower) { const ws = s.split(/\s+/).filter(w => w && isUC(w[0])); return (ws.length === 1 ? [...ws[0]].filter(c => isUC(c)) : ws.map(w => w[0])).join('').slice(0, 50); } const r = []; let i = 0; while (i < s.length) { if (!isUC(s[i])) { i++; continue; } let j = i; while (j < s.length && isUC(s[j])) j++; for (let k = i; k < j; k++) r.push(s[k]); i = j; while (i < s.length && isLC(s[i])) i++; } return r.join('').slice(0, 50); };
  const autoName = (n) => { let exp = ''; for (let i = 0; i < n.length; i++) { if (isUC(n[i]) && i > 0 && n[i-1] !== ' ' && isLC(n[i-1])) exp += ' '; exp += n[i]; } const s = exp.trim().replace(/\s+/g, ' '); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; };

  const save = async () => {
    if (!fullName.trim()) { setErr('Введите полное название'); return; }
    if (!shortName.trim()) { setErr('Введите код факультета'); return; }
    setErr('');
    try {
      const formattedName = autoName(fullName.trim());
      if (isEdit) {
        await api.patch(`/faculties/${faculty.id}/`, { full_name: formattedName, short_name: shortName.trim() });
        toast.push('Факультет обновлён', { kind: 'ok' });
      } else {
        await api.post('/faculties/', { full_name: formattedName, short_name: shortName.trim() });
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
        <Field label="Полное название" required error={err && !fullName.trim() ? err : null}>
          <input className={`input ${err && !fullName.trim() ? 'is-error' : ''}`} value={fullName} onChange={e => { const next = e.target.value; setFullName(next); if (!codeManual) setShortName(autoCode(next)); setErr(''); }} maxLength={255} onBeforeInput={e => { if (e.data && /[A-Za-z]/.test(e.data)) e.preventDefault(); }} onPaste={e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[A-Za-z]/g, ''); const next = fullName + t; setFullName(next); if (!codeManual) setShortName(autoCode(next)); setErr(''); }} />
        </Field>
        <Field label="Код (аббревиатура)" required error={err && fullName.trim() && !shortName.trim() ? err : null} hint={!isEdit && !codeManual ? 'Формируется автоматически по названию' : null}>
          <input className={`input ${err && fullName.trim() && !shortName.trim() ? 'is-error' : ''}`} value={shortName} onChange={e => { setShortName(e.target.value.toUpperCase()); setCodeManual(true); setErr(''); }} maxLength={50} />
        </Field>
        {err && shortName.trim() && fullName.trim() && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

function ParentFormModal({ data, onClose }) {
  const { studentId, parent, onDone } = data || {};
  const isEdit = !!parent;
  const isStudentContext = !!studentId;
  const toast = useToast();
  const fileRef = useRef(null);
  const [lastName, setLastName] = useState(parent?.last_name || '');
  const [firstName, setFirstName] = useState(parent?.first_name || '');
  const [middleName, setMiddleName] = useState(parent?.middle_name || '');
  const [phone, setPhone] = useState(parent?.phone || '');
  const [email, setEmail] = useState(parent?.email || '');
  const [relationType, setRelationType] = useState('guardian');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(parent?.photo || null);
  const [dragOver, setDragOver] = useState(false);
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState('');
  const touchP = (f) => setTouched(t => ({ ...t, [f]: 1 }));

  const pErrs = {};
  if (!lastName.trim()) pErrs.last_name = 'Обязательно';
  if (!firstName.trim()) pErrs.first_name = 'Обязательно';
  const pPhoneErr = validatePhone(phone);
  if (pPhoneErr) pErrs.phone = pPhoneErr;
  const pEmailErr = validateEmail(email);
  if (pEmailErr) pErrs.email = pEmailErr;

  const handlePhoto = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.push('Фото слишком большое - максимум 5 МБ', { kind: 'err' }); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 2000 || img.height > 2000) { toast.push('Размер фото превышает 2000x2000 пикселей', { kind: 'err' }); return; }
        setPhoto(file);
        setPhotoPreview(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    setTouched({ last_name: 1, first_name: 1, phone: 1, email: 1 });
    if (Object.keys(pErrs).length) {
      const msgs = [];
      if (pErrs.last_name) msgs.push('фамилию');
      if (pErrs.first_name) msgs.push('имя');
      if (pErrs.phone) msgs.push('корректный телефон');
      if (pErrs.email) msgs.push('корректный email');
      toast.push(`Проверьте: ${msgs.join(', ')}`, { kind: 'err' });
      return;
    }
    setErr('');
    try {
      const fd = new FormData();
      fd.append('last_name', lastName.trim());
      fd.append('first_name', firstName.trim());
      fd.append('middle_name', middleName.trim());
      fd.append('phone', phone.trim());
      fd.append('email', email.trim());
      if (photo) fd.append('photo', photo);
      if (isEdit) {
        await api.patch(`/parents/${parent.id}/`, fd);
        toast.push('Опекун обновлён', { kind: 'ok' });
      } else if (isStudentContext) {
        fd.append('relation_type', relationType);
        await api.post(`/students/${studentId}/parents/`, fd);
        toast.push('Опекун добавлен', { kind: 'ok' });
      } else {
        await api.post('/parents/', fd);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 8, marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handlePhoto(e.dataTransfer.files[0]); }}
          style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0, border: dragOver ? '2px solid var(--accent)' : '2px dashed var(--border)', background: dragOver ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s, background .15s' }}
        >
          {photoPreview
            ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 24, opacity: 0.3 }}>🖼</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Фото опекуна</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{photoPreview ? 'Нажмите на квадрат, чтобы заменить фото' : 'Нажмите на квадрат или перетащите изображение'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>Максимум 5 МБ, не более 2000x2000 пикселей</div>
          {photoPreview && <button onClick={removePhoto} style={{ marginTop: 6, fontSize: 11, color: 'var(--bad-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Удалить фото</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
      </div>
      <div className="form-grid">
        <Field label="Фамилия" required error={touched.last_name && pErrs.last_name} className="field-full">
          <input className={`input ${touched.last_name && pErrs.last_name ? 'is-error' : ''}`} value={lastName} onChange={e => { setLastName(e.target.value); setErr(''); }} onBlur={() => touchP('last_name')} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setLastName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
        </Field>
        <Field label="Имя" required error={touched.first_name && pErrs.first_name} className="field-full">
          <input className={`input ${touched.first_name && pErrs.first_name ? 'is-error' : ''}`} value={firstName} onChange={e => { setFirstName(e.target.value); setErr(''); }} onBlur={() => touchP('first_name')} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setFirstName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
        </Field>
        <Field label="Отчество" className="field-full">
          <input className="input" value={middleName} onChange={e => setMiddleName(e.target.value)} maxLength={100} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setMiddleName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 100)); }} />
        </Field>
        {isStudentContext && !isEdit && (
          <Field label="Связь" required>
            <select className="select" value={relationType} onChange={e => setRelationType(e.target.value)}>
              <option value="mother">Мать</option>
              <option value="father">Отец</option>
              <option value="guardian">Опекун</option>
            </select>
          </Field>
        )}
        <Field label="Телефон" error={touched.phone && pErrs.phone}>
          <input className={`input ${touched.phone && pErrs.phone ? 'is-error' : ''}`} value={phone} onChange={e => setPhone(applyPhoneMask(e.target.value))} onBlur={() => touchP('phone')} maxLength={18} />
        </Field>
        <Field label="Email" error={touched.email && pErrs.email}>
          <input className={`input ${touched.email && pErrs.email ? 'is-error' : ''}`} value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touchP('email')} maxLength={254} />
        </Field>
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
          <input className={`input ${err && !name.trim() ? 'is-error' : ''}`} value={name} onChange={e => { setName(e.target.value); setErr(''); }} maxLength={255} />
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
          <input className={`input ${err && !name.trim() ? 'is-error' : ''}`} value={name} onChange={e => { setName(e.target.value); setErr(''); }} maxLength={255} />
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

  const handleEmployeeChange = (val) => {
    setEmployeeId(val);
    if (!isEdit && val) {
      const emp = employees.find(e => String(e.id) === val);
      if (emp) {
        setDisplayName(emp.full_name || '');
        setUsername(genUsername(emp));
      }
    }
  };

  const pwdErrs = [];
  if (!isEdit && password) {
    if (password.length < 8) pwdErrs.push('не менее 8 символов');
    if (!/[A-Za-z]/.test(password)) pwdErrs.push('латинские буквы');
    if (!/\d/.test(password)) pwdErrs.push('цифра');
  }

  const save = async () => {
    setErr('');
    if (!isEdit && !username.trim()) { setErr('Введите логин'); return; }
    if (!isEdit && !displayName.trim()) { setErr('Введите ФИО'); return; }
    if (!isEdit && !password) { setErr('Введите пароль'); return; }
    if (!isEdit && pwdErrs.length) { setErr(`Пароль должен содержать: ${pwdErrs.join(', ')}`); return; }
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
          <Field label="Логин" required error={err && !username.trim() ? err : null} className="field-full">
            <input className={`input ${err && !username.trim() ? 'is-error' : ''}`} value={username} onChange={e => { setUsername(e.target.value); setErr(''); }} maxLength={150} {...LOGIN_INPUT_PROPS} onPaste={e => { e.preventDefault(); setUsername(p => (p + filterLogin(e.clipboardData.getData('text') || '')).slice(0, 150)); setErr(''); }} />
          </Field>
        )}
        <Field label="ФИО" required={!isEdit} error={err && !isEdit && !displayName.trim() ? err : null} className="field-full">
          <input className={`input ${err && !isEdit && !displayName.trim() ? 'is-error' : ''}`} value={displayName} onChange={e => { setDisplayName(e.target.value); setErr(''); }} maxLength={150} {...NAME_INPUT_PROPS} onPaste={e => { e.preventDefault(); setDisplayName(p => (p + filterName(e.clipboardData.getData('text') || '')).slice(0, 150)); setErr(''); }} />
        </Field>
        <Field label="Роль" required className="field-full">
          <select className="select" value={role} onChange={e => setRole(e.target.value)}>
            {REAL_ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {!isEdit && <>
          <Field label="Пароль" required error={err && (!password || pwdErrs.length) ? (err || null) : null}>
            <input className={`input ${err && (!password || pwdErrs.length) ? 'is-error' : ''}`} type="password" value={password} onChange={e => { setPassword(e.target.value.replace(/[^\x00-\x7F]/g, '')); setErr(''); }} />
          </Field>
          <Field label="Повторите пароль" required error={err && password && password !== password2 ? err : null}>
            <input className={`input ${err && password && password !== password2 ? 'is-error' : ''}`} type="password" value={password2} onChange={e => { setPassword2(e.target.value.replace(/[^\x00-\x7F]/g, '')); setErr(''); }} />
          </Field>
          {password && pwdErrs.length > 0 && (
            <div className="field field-full">
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Пароль должен содержать: {pwdErrs.join(', ')}</div>
            </div>
          )}
        </>}
        <div className="field field-full">
          <label className="field-label">Привязать к сотруднику</label>
          <Combobox
            options={employeeOpts}
            value={employeeId}
            onChange={handleEmployeeChange}
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
      {err && username.trim() && (isEdit || (password && password === password2)) && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
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
        <Field label="Новый пароль" required error={err && !password ? err : null}>
          <input className={`input ${err && !password ? 'is-error' : ''}`} type="password" value={password} onChange={e => { setPassword(e.target.value.replace(/[^\x00-\x7F]/g, '')); setErr(''); }} />
        </Field>
        <Field label="Повторите" required error={err && password && password !== password2 ? err : null}>
          <input className={`input ${err && password && password !== password2 ? 'is-error' : ''}`} type="password" value={password2} onChange={e => { setPassword2(e.target.value.replace(/[^\x00-\x7F]/g, '')); setErr(''); }} />
        </Field>
      </div>
      {err && password && password === password2 && <div style={{ color: 'var(--bad-fg)', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </Modal>
  );
}

/* ============================================================
   Action modals - transfer, delete (with shake), approve, upload
   ============================================================ */
function TransferModal({ data, onClose }) {
  const { student, currentUser, onDone } = data || {};
  const toast = useToast();
  const isOwner = currentUser?.role === 'owner';

  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState('');

  const [crossOrg, setCrossOrg] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [targetFaculties, setTargetFaculties] = useState([]);
  const [targetFacultyId, setTargetFacultyId] = useState('');
  const [targetGroups, setTargetGroups] = useState([]);
  const [targetGroupId, setTargetGroupId] = useState('');

  useEffect(() => {
    api.get('/groups/').then(r => setGroups(r.data)).catch(() => {});
    if (isOwner) {
      api.get('/organizations/').then(r => setOrgs(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!targetOrgId || !crossOrg) return;
    setTargetFaculties([]); setTargetFacultyId(''); setTargetGroups([]); setTargetGroupId('');
    api.get(`/faculties/?institution_id=${targetOrgId}`).then(r => setTargetFaculties(r.data)).catch(() => {});
  }, [targetOrgId]);

  useEffect(() => {
    if (!targetFacultyId || !crossOrg) return;
    setTargetGroups([]); setTargetGroupId('');
    api.get(`/groups/?faculty_id=${targetFacultyId}&institution_id=${targetOrgId}`).then(r => setTargetGroups(r.data)).catch(() => {});
  }, [targetFacultyId]);

  const submit = async () => {
    setTouched(true);
    setErr('');
    if (crossOrg) {
      if (!targetOrgId) { toast.push('Выберите организацию', { kind: 'err' }); return; }
      if (!targetFacultyId) { toast.push('Выберите факультет', { kind: 'err' }); return; }
      try {
        await api.post(`/students/${student.id}/transfer-institution/`, {
          faculty_id: parseInt(targetFacultyId),
          group_id: targetGroupId ? parseInt(targetGroupId) : null,
        });
        toast.push(`${student.last_name} переведён в другую организацию`, { kind: 'ok' });
        onDone && onDone();
        onClose && onClose();
      } catch (e) {
        setErr(e.response?.data?.error || 'Ошибка при переводе');
      }
    } else {
      if (!groupId) { toast.push('Выберите новую группу', { kind: 'err' }); return; }
      try {
        await api.post(`/students/${student.id}/transfer/`, { group_id: parseInt(groupId) });
        toast.push(`${student.last_name} переведён`, { kind: 'ok' });
        onDone && onDone();
        onClose && onClose();
      } catch (e) {
        setErr(e.response?.data?.error || 'Ошибка при переводе');
      }
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
      <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>При переводе студент получает статус «Переведён» и привязывается к новой группе и факультету.</p>
      {isOwner && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={crossOrg} onChange={e => { setCrossOrg(e.target.checked); setErr(''); setTouched(false); setGroupId(''); setTargetOrgId(''); setTargetFacultyId(''); setTargetGroupId(''); }} />
          Перевод в другую организацию
        </label>
      )}
      {!crossOrg ? (
        <Field label="Новая группа" required error={touched && !groupId ? 'Выберите группу' : null}>
          <select className={`select ${touched && !groupId ? 'is-error' : ''}`} value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="">- Выберите группу -</option>
            {groups.filter(g => !student?.group_id || g.id !== student.group_id).map(g => (
              <option key={g.id} value={g.id}>{g.name} - {g.faculty_name}</option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Организация" required error={touched && !targetOrgId ? 'Выберите организацию' : null}>
            <select className={`select ${touched && !targetOrgId ? 'is-error' : ''}`} value={targetOrgId} onChange={e => setTargetOrgId(e.target.value)}>
              <option value="">- Выберите организацию -</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Факультет" required error={touched && !targetFacultyId ? 'Выберите факультет' : null}>
            <select className={`select ${touched && !targetFacultyId ? 'is-error' : ''}`} value={targetFacultyId} onChange={e => setTargetFacultyId(e.target.value)} disabled={!targetOrgId}>
              <option value="">- Выберите факультет -</option>
              {targetFaculties.map(f => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Группа">
            <select className="select" value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)} disabled={!targetFacultyId}>
              <option value="">- Без группы -</option>
              {targetGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
        </>
      )}
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
    if (!confirmed || !reason.trim() || reason.length > 1000) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (!reason.trim() && !confirmed) toast.push('Укажите причину удаления и подтвердите действие', { kind: 'err' });
      else if (!reason.trim()) toast.push('Укажите причину удаления', { kind: 'err' });
      else if (reason.length > 1000) toast.push('Причина не должна превышать 1000 символов', { kind: 'err' });
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
          <textarea className={`textarea ${(shake && !reason.trim()) || reason.length > 1000 ? 'is-error' : ''}`} value={reason} onChange={e => setReason(e.target.value)} />
          <FadingError error={reason.length > 1000 ? 'Максимум 1000 символов' : null} />
          <div style={{ fontSize: 11, color: reason.length > 1000 ? 'var(--bad-fg)' : 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>{reason.length} / 1000</div>
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
        <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={255} />
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
  const { groupId: preGroupId, subjectId: preSubjectId, subjectName: preSubjectName, onDone } = data || {};
  const isSubjectFixed = !!preSubjectId;
  const isGroupFixed = !!preGroupId;

  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [subjectId, setSubjectId] = useState(preSubjectId?.toString() || '');
  const [groupId, setGroupId] = useState(preGroupId?.toString() || '');
  const [employeeId, setEmployeeId] = useState('');
  const [employeesFallback, setEmployeesFallback] = useState(false);
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!isSubjectFixed) api.get('/subjects/').then(r => setSubjects(r.data)).catch(() => {});
    if (!isGroupFixed) api.get('/groups/').then(r => setGroups(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) { setEmployees([]); setEmployeesFallback(false); return; }
    api.get(`/subjects/${subjectId}/employees/`).then(r => {
      if (r.data.length > 0) {
        setEmployees(r.data);
        setEmployeesFallback(false);
      } else {
        api.get('/employees/').then(r2 => {
          setEmployees(r2.data);
          setEmployeesFallback(true);
        }).catch(() => {});
      }
    }).catch(() => {});
    setEmployeeId('');
    setErr('');
  }, [subjectId]);

  const save = async () => {
    if (!subjectId) { setErr('Выберите предмет'); return; }
    if (!groupId) { setErr('Выберите группу'); return; }
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
        {!isSubjectFixed && (
          <Field label="Предмет" required>
            <select className="select" value={subjectId} onChange={e => { setSubjectId(e.target.value); setErr(''); }}>
              <option value="">- Выберите предмет -</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        {!isGroupFixed && (
          <Field label="Группа" required>
            <select className="select" value={groupId} onChange={e => { setGroupId(e.target.value); setErr(''); }}>
              <option value="">- Выберите группу -</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Преподаватель" required>
          <select className="select" value={employeeId} onChange={e => { setEmployeeId(e.target.value); setErr(''); }} disabled={!subjectId}>
            <option value="">- Выберите преподавателя -</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          {employeesFallback && subjectId && (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Показаны все сотрудники - для этого предмета ещё нет назначенных преподавателей</div>
          )}
        </Field>
        {err && <div className="field field-full"><span style={{ color: 'var(--bad-fg)', fontSize: 12 }}>{err}</span></div>}
      </div>
    </Modal>
  );
}

const AUDIT_NAV_MAP = {
  Student:  (id, nav) => nav('student-detail',  { studentId:  id }),
  Employee: (id, nav) => nav('employee-detail', { employeeId: id }),
  Group:    (id, nav) => nav('group-detail',    { groupId:    id }),
  Parent:   (id, nav) => nav('parent-detail',   { parentId:   id }),
  Faculty:  (_,  nav) => nav('faculties'),
};

function AuditDiffModal({ data, onClose, onNavigate }) {
  const toast = useToast();
  const changes = data?.changes || [];
  const actorRole = data?.role || '-';
  const actorPosition = data?.userPosition || null;
  const objType = data?.obj_type || '';
  const objName = data?.obj_name || '';
  const isCreate = data?.action === 'create';
  const isUpdate = data?.action === 'update';

  const [confirmRollback, setConfirmRollback] = useState(false);

  const navFn = AUDIT_NAV_MAP[data?.object_type_raw];
  const isDeleted = data?.action === 'delete';

  const handleGo = () => {
    if (!navFn || isDeleted || !onNavigate) return;
    navFn(data.object_id, onNavigate);
    onClose();
  };

  const handleRollback = async () => {
    try {
      await api.post(`/audit-log/${data.id}/rollback/`);
      toast.push('Откат выполнен - данные восстановлены', { kind: 'ok' });
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Ошибка при откате';
      toast.push(msg, { kind: 'error' });
      setConfirmRollback(false);
    }
  };

  const footer = (
    <>
      {navFn && (
        <button
          className="btn btn-primary"
          onClick={handleGo}
          disabled={isDeleted}
          title={isDeleted ? 'Объект был удалён' : undefined}
        >
          Перейти к записи
        </button>
      )}
      <div style={{ flex: 1 }} />
      {isUpdate && changes.length > 0 && !confirmRollback && (
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmRollback(true)}>
          Откатить изменение
        </button>
      )}
      {confirmRollback && (
        <>
          <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>Восстановить предыдущие значения?</span>
          <LoadButton className="btn btn-danger btn-sm" onClick={handleRollback}>
            Да, откатить
          </LoadButton>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRollback(false)}>
            Отмена
          </button>
        </>
      )}
      {!confirmRollback && <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>}
    </>
  );

  return (
    <Modal size="lg" title="Запись журнала изменений"
      sub={`Кто: ${data?.user || '-'}  Когда: ${data?.ts || '-'}`}
      onClose={onClose}
      footer={footer}>
      <dl className="kv" style={{ padding: 0, marginBottom: 16 }}>
        <dt>Кто:</dt>
        <dd>
          <span className="fwm mono">{data?.user || '-'}</span>
          <span className="muted" style={{ marginLeft: 6 }}>- {actorRole}{actorPosition ? ` - ${actorPosition}` : ''}</span>
        </dd>
        <dt>Запись:</dt>
        <dd className="fwm">{objName || '-'}</dd>
        <dt>Тип:</dt>
        <dd>{objType || '-'}</dd>
        <dt>Когда:</dt><dd className="mono">{data?.ts || '-'}</dd>
        <dt>Действие:</dt><dd><span className={`badge ${data?.cls || 'badge-neutral'}`}><span className="dot"></span>{data?.label || '-'}</span></dd>
      </dl>
      <div className="form-section-title" style={{ marginBottom: 10 }}>
        {isCreate ? 'Поля записи' : `Изменённые поля - ${changes.length}`}
      </div>
      <div className="diff-grid">
        {changes.map((c) => (
          <div key={c.key} className="diff-card">
            <div className="diff-card-head">
              <span>{c.label}</span>
              {!isCreate && <span className="field-key">{c.key}</span>}
            </div>
            {isCreate ? (
              <div className="diff-row-plain">{String(c.to)}</div>
            ) : (
              <>
                <div className="diff-row removed">
                  <span className="diff-sign">-</span>
                  <span className="diff-val removed-val">{String(c.from)}</span>
                </div>
                <div className="diff-row added">
                  <span className="diff-sign">+</span>
                  <span className="diff-val">{String(c.to)}</span>
                </div>
              </>
            )}
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
    <Modal size="xl" title={`${s.last} ${s.first} ${s.mid}`} sub={`${s.fac} · ${s.group}`} onClose={onClose}
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
  const currentRole = data?.currentRole;
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
    <Modal title={f.full_name || f.name} onClose={onClose}
      footer={<>
        {currentRole === 'owner'
          ? <button className="btn btn-danger" onClick={() => { onClose(); openModal('ownerDirectDelete', { name: f.full_name, type: 'факультет', url: `/faculties/${f.id}/`, onDone }); }}>{I.trash}Удалить</button>
          : <button className="btn btn-danger" onClick={handleDeleteRequest}>{I.trash}Подать заявку</button>
        }
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        <button className="btn btn-primary" onClick={() => openModal('facultyForm', { faculty: f, onDone })}>{I.pencil}Редактировать</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Код: </span><span className="mono">{f.short_name || f.code || '-'}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Групп: </span><span className="mono">{f.group_count ?? f.groups ?? '-'}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Студентов: </span><span className="mono">{f.student_count ?? f.students ?? '-'}</span></div>
      </div>
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
  const fileRef = useRef(null);
  const [name, setName] = useState(org?.name || '');
  const [code, setCode] = useState(org?.code || '');
  const [codeManual, setCodeManual] = useState(isEdit);
  const [description, setDescription] = useState(org?.description || '');

  const isUC = (c) => c && ((c >= 'А' && c <= 'Я') || c === 'Ё');
  const isLC = (c) => c && ((c >= 'а' && c <= 'я') || c === 'ё');
  const autoCode = (n) => { const s = n.trim(); if (!s) return ''; const hasLower = [...s].some(c => isLC(c)); if (!hasLower) { const ws = s.split(/\s+/).filter(w => w && isUC(w[0])); return (ws.length === 1 ? [...ws[0]].filter(c => isUC(c)) : ws.map(w => w[0])).join('').slice(0, 20); } const r = []; let i = 0; while (i < s.length) { if (!isUC(s[i])) { i++; continue; } let j = i; while (j < s.length && isUC(s[j])) j++; for (let k = i; k < j; k++) r.push(s[k]); i = j; while (i < s.length && isLC(s[i])) i++; } return r.join('').slice(0, 20); };
  const autoName = (n) => { let exp = ''; for (let i = 0; i < n.length; i++) { if (isUC(n[i]) && i > 0 && n[i-1] !== ' ' && isLC(n[i-1])) exp += ' '; exp += n[i]; } const s = exp.trim().replace(/\s+/g, ' '); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; };
  const [foundedDate, setFoundedDate] = useState(
    org?.founded_date
      ? (() => {
          const parts = org.founded_date.split('.');
          return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : org.founded_date;
        })()
      : ''
  );
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(org?.photo || null);
  const [dragOver, setDragOver] = useState(false);
  const [errs, setErrs] = useState({ name: '', date: '' });
  const setErr = (f, msg) => setErrs(e => ({ ...e, [f]: msg }));
  const clearErr = (f) => setErrs(e => ({ ...e, [f]: '' }));
  const [touched, setTouched] = useState({ name: false, code: false, description: false });
  const touch = (f) => setTouched(t => ({ ...t, [f]: true }));

  const PHOTO_MAX_MB = 5;
  const PHOTO_MAX_PX = 2000;

  const handlePhoto = (file) => {
    if (!file) return;
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      toast.push(`Фото слишком большое - максимум ${PHOTO_MAX_MB} МБ`, { kind: 'err' });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        if (img.width > PHOTO_MAX_PX || img.height > PHOTO_MAX_PX) {
          toast.push(`Размер фото превышает ${PHOTO_MAX_PX}x${PHOTO_MAX_PX} пикселей`, { kind: 'err' });
          return;
        }
        setPhoto(file);
        setPhotoPreview(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nameErr = !name.trim() ? 'Введите название' : '';
    const dateErr = !foundedDate ? 'Укажите дату основания' : foundedDate > today ? 'Дата не может быть в будущем' : '';
    if (nameErr || dateErr) { setErrs({ name: nameErr, date: dateErr }); return; }
    if (description.length > 5000) { toast.push('Описание не должно превышать 5000 символов', { kind: 'err' }); return; }
    setErrs({ name: '', date: '' });
    try {
      const fd = new FormData();
      fd.append('name', autoName(name.trim()));
      if (code.trim()) fd.append('code', code.trim());
      fd.append('description', description.trim());
      fd.append('founded_date', foundedDate);
      if (photo) fd.append('photo', photo);
      if (isEdit) {
        const r = await api.patch(`/organizations/${org.id}/`, fd);
        toast.push('Организация обновлена', { kind: 'ok' });
        onDone && onDone(r.data);
      } else {
        const r = await api.post('/organizations/', fd);
        toast.push('Организация создана', { kind: 'ok' });
        onDone && onDone(r.data);
      }
      onClose && onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка при сохранении', { kind: 'err' });
    }
  };

  return (
    <Modal
      size="lg"
      title={isEdit ? 'Редактировать организацию' : 'Новая организация'}
      sub={isEdit ? `Код: ${org.code}` : 'Заполните данные учебного заведения'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={save}>{I.check}Сохранить</LoadButton>
      </>}
    >
      {/* Полоса фото */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 8, marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handlePhoto(e.dataTransfer.files[0]); }}
          style={{
            width: 72, height: 72, borderRadius: 8, flexShrink: 0,
            border: dragOver ? '2px solid var(--accent)' : '2px dashed var(--border)',
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface)',
            cursor: 'pointer', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color .15s, background .15s',
          }}
        >
          {photoPreview
            ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 24, opacity: 0.3 }}>🖼</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Фото организации</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {photoPreview ? 'Нажмите на квадрат, чтобы заменить фото' : 'Нажмите на квадрат или перетащите изображение'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
            Максимум 5 МБ, не более 2000x2000 пикселей
          </div>
          {photoPreview && (
            <button
              onClick={removePhoto}
              style={{ marginTop: 6, fontSize: 11, color: 'var(--bad-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Удалить фото
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
      </div>

      {/* Поля */}
      <div className="form-grid">
        <Field label="Название организации" required error={errs.name} hint={touched.name && !errs.name ? 'Обязательное поле' : null} extraClass="field-full">
          <input
            className={`input ${errs.name ? 'is-error' : ''}`}
            value={name}
            onBeforeInput={e => { if (e.data && /[A-Za-z]/.test(e.data)) e.preventDefault(); }}
            onPaste={e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[A-Za-z]/g, ''); const next = name + t; setName(next); if (!codeManual) setCode(autoCode(next)); clearErr('name'); }}
            onChange={e => { const next = e.target.value; setName(next); if (!codeManual) setCode(autoCode(next)); clearErr('name'); }}
            onFocus={() => touch('name')}
            maxLength={1000}
          />
        </Field>
        <Field label="Код организации" hint={touched.code ? 'Если не указать - сгенерируется автоматически' : null}>
          <input
            className="input"
            value={code}
            onBeforeInput={e => { if (e.data && /[A-Za-z\s]/.test(e.data)) e.preventDefault(); }}
            onPaste={e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[A-Za-z\s]/g, '').toUpperCase(); setCode(prev => (prev + t).slice(0, 50)); setCodeManual(true); }}
            onChange={e => { setCode(e.target.value.toUpperCase()); setCodeManual(true); }}
            onFocus={() => touch('code')}
            maxLength={50}
          />
        </Field>
        <Field label="Дата основания" required error={errs.date}>
          <input
            className={`input ${errs.date ? 'is-error' : ''}`}
            type="date"
            value={foundedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => { setFoundedDate(e.target.value); clearErr('date'); }}
          />
        </Field>
        <Field label="Описание" hint={touched.description ? 'Необязательное поле' : null} extraClass="field-full">
          <textarea
            className={`textarea ${description.length > 5000 ? 'is-error' : ''}`}
            rows={4}
            value={description}
            onBeforeInput={e => { if (e.data && /[A-Za-z]/.test(e.data)) e.preventDefault(); }}
            onPaste={e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[A-Za-z]/g, ''); setDescription(prev => prev + t); }}
            onChange={e => setDescription(e.target.value)}
            onFocus={() => touch('description')}
            style={{ resize: 'none' }}
          />
          <FadingError error={description.length > 5000 ? 'Максимум 5000 символов' : null} />
          <div style={{ fontSize: 11, color: description.length > 5000 ? 'var(--bad-fg)' : 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>{description.length} / 5000</div>
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
  const [step, setStep] = useState(1);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [shake, setShake] = useState(false);

  const sendCode = async () => {
    try {
      const res = await api.post(`/organizations/${org.id}/send-delete-code/`);
      setMaskedEmail(res.data.masked_email);
      setStep(2);
      toast.push('Код отправлен на почту', { kind: 'ok' });
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка отправки кода', { kind: 'err' });
    }
  };

  const submit = async () => {
    if (code.trim().length !== 6) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      toast.push('Введите 6-значный код', { kind: 'err' });
      return;
    }
    try {
      await api.delete(`/organizations/${org.id}/`, { data: { code: code.trim().toUpperCase() } });
      toast.push('Организация удалена', { kind: 'ok' });
      onDone && onDone(org.id);
      onClose();
    } catch (e) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      toast.push(e.response?.data?.error || 'Ошибка удаления', { kind: 'err' });
    }
  };

  if (step === 1) {
    return (
      <Modal title="Удалить организацию?" kind="danger" onClose={onClose} allowOverlayClose={false}
        footer={<>
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <LoadButton className="btn btn-danger-solid" onClick={sendCode}>Отправить код на почту</LoadButton>
        </>}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{I.alert}</div>
          <div>
            <p style={{ marginBottom: 4 }}>Будет удалена организация <strong>{org?.name}</strong>.</p>
            <p className="muted" style={{ fontSize: 13 }}>Все данные организации будут удалены безвозвратно. Для подтверждения мы отправим код на ваш email.</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Подтвердите удаление" kind="danger" onClose={onClose} allowOverlayClose={false}
      footer={<>
        <button className="btn btn-secondary" onClick={() => { setStep(1); setCode(''); }}>Назад</button>
        <LoadButton className={`btn btn-danger-solid ${shake ? 'shake' : ''}`} onClick={submit}>{I.trash}Удалить навсегда</LoadButton>
      </>}>
      <div className={shake ? 'shake' : ''}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Код подтверждения отправлен на <strong>{maskedEmail}</strong>. Введите его ниже.
        </p>
        <Field label="Код подтверждения" required>
          <input
            className={`input ${shake && code.trim().length !== 6 ? 'is-error' : ''}`}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: '0.2em', textAlign: 'center', maxWidth: 180 }}
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />
        </Field>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          Не пришёл код?{' '}
          <a href="#" onClick={e => { e.preventDefault(); sendCode(); }} style={{ color: 'var(--accent)' }}>
            Отправить повторно
          </a>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   OwnerDirectDeleteModal - суперадмин удаляет запись напрямую с паролем
   ============================================================ */
function OwnerDirectDeleteModal({ data, onClose }) {
  const { name, type, url, onDone } = data || {};
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!password.trim()) {
      setShake(true); setTimeout(() => setShake(false), 400);
      toast.push('Введите пароль', { kind: 'err' });
      return;
    }
    setErr('');
    try {
      await api.delete(url, { data: { password } });
      toast.push(`${name || 'Запись'} удалена`, { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error || 'Ошибка при удалении';
      setErr(msg);
      setShake(true); setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <Modal title={`Удалить ${type || 'запись'}?`} kind="danger" onClose={onClose} allowOverlayClose={false}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className={`btn btn-danger-solid ${shake ? 'shake' : ''}`} onClick={submit}>{I.trash}Удалить навсегда</LoadButton>
      </>}>
      <div className={shake ? 'shake' : ''}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{I.alert}</div>
          <div>
            <p style={{ marginBottom: 4 }}>Будет безвозвратно удалена запись <strong>{name || 'объект'}</strong>.</p>
            <p className="muted" style={{ fontSize: 13 }}>Это действие нельзя отменить. Для подтверждения введите свой пароль.</p>
          </div>
        </div>
        <Field label="Ваш пароль" required error={err}>
          <input className={`input ${err ? 'is-error' : ''}`} type="password" value={password} onChange={e => { setPassword(e.target.value); setErr(''); }} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   NoteModal - добавить / просмотреть / закрыть вопрос по записи
   ============================================================ */
function NoteModal({ data, onClose }) {
  const { objectType, objectId, onDone, currentUserRole } = data || {};
  const toast = useToast();
  const [note, setNote] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!objectType || !objectId) { setLoading(false); return; }
    api.get(`/notes/?object_type=${objectType}&object_id=${objectId}&resolved=false`)
      .then(r => { setNote(r.data[0] || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!question.trim()) { setErr('Введите вопрос'); return; }
    if (question.length > 2000) { setErr('Максимум 2000 символов'); return; }
    setErr('');
    try {
      await api.post('/notes/', { object_type: objectType, object_id: objectId, question: question.trim() });
      toast.push('Вопрос добавлен', { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Ошибка');
    }
  };

  const resolve = async () => {
    try {
      await api.post(`/notes/${note.id}/resolve/`);
      toast.push('Вопрос закрыт', { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/notes/${note.id}/`);
      toast.push('Вопрос удалён', { kind: 'ok' });
      onDone && onDone();
      onClose();
    } catch (e) {
      toast.push(e.response?.data?.error || 'Ошибка', { kind: 'err' });
    }
  };

  if (loading) {
    return (
      <Modal title="Вопрос по записи" onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Закрыть</button>}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Загрузка…</div>
      </Modal>
    );
  }

  if (note) {
    return (
      <Modal title="Вопрос по записи" onClose={onClose}
        footer={<>
          {currentUserRole === 'owner' && (
            <LoadButton className="btn btn-primary" onClick={resolve}>{I.check}Закрыть вопрос</LoadButton>
          )}
          <button className="btn btn-danger" onClick={remove}>{I.trash}Удалить</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        </>}>
        <div className="banner banner-warn" style={{ marginBottom: 16 }}>
          {I.alert}
          <div className="banner-body">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Открытый вопрос</div>
            <div style={{ fontSize: 13 }}>{note.question}</div>
          </div>
        </div>
        <dl className="kv" style={{ padding: 0 }}>
          <dt>Автор</dt><dd className="fwm">{note.created_by_name}</dd>
          <dt>Дата</dt><dd className="mono">{note.created_at}</dd>
        </dl>
        {currentUserRole !== 'owner' && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Суперадминистратор увидит этот вопрос и сможет его закрыть.</p>
        )}
      </Modal>
    );
  }

  return (
    <Modal title="Добавить вопрос" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <LoadButton className="btn btn-primary" onClick={submit}>{I.check}Отправить</LoadButton>
      </>}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Опишите проблему или вопрос. Суперадминистратор увидит его рядом с записью и сможет ответить.
      </p>
      <div className="field">
        <label className="field-label">Вопрос <span className="req">*</span></label>
        <textarea
          className={`textarea ${err ? 'is-error' : ''}`}
          rows={4}
          value={question}
          onChange={e => { setQuestion(e.target.value); setErr(''); }}
          style={{ resize: 'none' }}
        />
        {question.length > 0 && (
          <div style={{ fontSize: 11, color: question.length > 2000 ? 'var(--bad-fg)' : 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
            {question.length} / 2000
          </div>
        )}
        {err && <div style={{ color: 'var(--bad-fg)', fontSize: 12, marginTop: 4 }}>{err}</div>}
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
  OrgFormModal, OrgDeleteConfirmModal, OwnerDirectDeleteModal,
  NoteModal,
};
