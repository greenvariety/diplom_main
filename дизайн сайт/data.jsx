/* global React */
const { useState, useMemo, Fragment } = React;

/* ============================================================
   Icons (Lucide-style strokes)
   ============================================================ */
const I = {
  dashboard: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  building: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>,
  users: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  book: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  briefcase: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  badge: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/></svg>,
  heart: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  settings: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  trash: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  history: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>,
  download: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  search: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>,
  plus: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  pencil: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>,
  swap: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-4 4"/><path d="M21 7H7a4 4 0 0 0-4 4"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h14a4 4 0 0 0 4-4"/></svg>,
  alert: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  check: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  chevr: <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  more: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  excel: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 13 6 5M15 13l-6 5"/></svg>,
  doc: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
  log: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  bell: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  grad: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  logout: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  user: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  shield: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  arrowU: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  filter: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

/* ============================================================
   Demo data
   ============================================================ */

const STATUSES = {
  enrolled:           { label: 'Зачислен',          cls: 'badge-ok' },
  pending_review:     { label: 'На рассмотрении',   cls: 'badge-neutral' },
  pending_enrollment: { label: 'Ожид. зачисления',  cls: 'badge-info' },
  pending_expulsion:  { label: 'Ожид. отчисления',  cls: 'badge-warn' },
  expelled:           { label: 'Отчислен',          cls: 'badge-bad' },
  transferred:        { label: 'Переведён',         cls: 'badge-violet' },
};

const STUDENTS = [
  { id: 1, last: 'Иванов',   first: 'Иван',     mid: 'Иванович',     dob: '15.03.2004', phone: '+7 900 123-45-67', email: 'ivanov@edu.ru',    fac: 'ФИТ', group: 'ПИ-301', status: 'enrolled',           av: 1 },
  { id: 2, last: 'Петрова',  first: 'Мария',    mid: 'Сергеевна',    dob: '02.07.2004', phone: '+7 900 222-33-44', email: 'petrova@edu.ru',   fac: 'ФИТ', group: 'ПИ-301', status: 'enrolled',           av: 2 },
  { id: 3, last: 'Сидоров',  first: 'Алексей',  mid: 'Петрович',     dob: '11.11.2003', phone: '+7 900 333-44-55', email: 'sidorov@edu.ru',   fac: 'ФЭ',  group: 'ЭК-201', status: 'pending_expulsion',  av: 3 },
  { id: 4, last: 'Козлова',  first: 'Анна',     mid: 'Дмитриевна',   dob: '24.05.2005', phone: '+7 900 444-55-66', email: 'kozlova@edu.ru',   fac: 'ФИТ', group: '—',      status: 'pending_review',     av: 4 },
  { id: 5, last: 'Новиков',  first: 'Дмитрий',  mid: 'Олегович',     dob: '01.09.2003', phone: '—',                 email: '—',                 fac: 'ФЭ',  group: '—',      status: 'expelled',           av: 5 },
  { id: 6, last: 'Захарова', first: 'Ольга',    mid: 'Николаевна',   dob: '17.02.2004', phone: '+7 900 555-66-77', email: 'zaharova@edu.ru',  fac: 'ФИТ', group: 'ПИ-302', status: 'enrolled',           av: 6 },
  { id: 7, last: 'Морозов',  first: 'Артём',    mid: 'Игоревич',     dob: '08.12.2004', phone: '+7 900 666-77-88', email: 'morozov@edu.ru',   fac: 'ФИТ', group: 'ПИ-302', status: 'transferred',        av: 7 },
  { id: 8, last: 'Волкова',  first: 'Екатерина',mid: 'Андреевна',    dob: '13.04.2005', phone: '+7 900 777-88-99', email: 'volkova@edu.ru',   fac: 'ФЭ',  group: 'ЭК-202', status: 'pending_enrollment', av: 8 },
];

const EMPLOYEES = [
  { id: 1, last: 'Сергеев',   first: 'Пётр',    mid: 'Иванович',   pos: 'Декан',           teacher: true,  phone: '+7 900 000-11-22', av: 2 },
  { id: 2, last: 'Кузнецова', first: 'Наталья', mid: 'Андреевна',  pos: 'Преподаватель',   teacher: true,  phone: '+7 900 000-33-44', av: 4 },
  { id: 3, last: 'Волков',    first: 'Андрей',  mid: 'Степанович', pos: 'Методист',        teacher: false, phone: '+7 900 000-55-66', av: 3 },
  { id: 4, last: 'Лебедева',  first: 'Ирина',   mid: 'Юрьевна',    pos: 'Преподаватель',   teacher: true,  phone: '—',                 av: 5 },
  { id: 5, last: 'Новикова',  first: 'Светлана',mid: 'Павловна',   pos: 'Зав. кафедрой',   teacher: false, phone: '+7 900 000-77-88', av: 1 },
  { id: 6, last: 'Морозов',   first: 'Виктор',  mid: 'Геннадьевич',pos: 'Преподаватель',   teacher: true,  phone: '+7 900 000-99-00', av: 7 },
];

const GROUPS = [
  { name: 'ПИ-301', fac: 'ФИТ', curator: 'Кузнецова Н. А.', count: 28, year: 2022 },
  { name: 'ПИ-302', fac: 'ФИТ', curator: 'Морозов В. Г.',   count: 25, year: 2022 },
  { name: 'ПИ-401', fac: 'ФИТ', curator: '—',                count: 22, year: 2021 },
  { name: 'ЭК-201', fac: 'ФЭ',  curator: 'Сергеев П. И.',   count: 30, year: 2023 },
  { name: 'ЭК-202', fac: 'ФЭ',  curator: 'Лебедева И. Ю.',  count: 27, year: 2023 },
  { name: 'МН-101', fac: 'ФМН', curator: '—',                count: 18, year: 2024 },
];

const FACULTIES = [
  { code: 'ФИТ',  name: 'Факультет информационных технологий', dean: 'Сергеев П. И.',  groups: 12, students: 312 },
  { code: 'ФЭ',   name: 'Факультет экономики',                  dean: 'Новикова С. П.', groups: 8,  students: 218 },
  { code: 'ФМН',  name: 'Факультет мат. наук',                  dean: '—',               groups: 4,  students: 82  },
];

const AUDIT = [
  { ts: '09.05.2026 14:32:11', user: 'admin',      action: 'create', label: 'Создал',   obj: 'Студент #612 — Иванов И. И.' },
  { ts: '09.05.2026 13:55:04', user: 'admin',      action: 'update', label: 'Изменил',  obj: 'Студент #610 — Петрова М. С.' },
  { ts: '09.05.2026 12:10:48', user: 'teacher1',   action: 'update', label: 'Изменил',  obj: 'Группа ПИ-301' },
  { ts: '08.05.2026 18:04:22', user: 'admin',      action: 'delete', label: 'Удалил',   obj: 'Опекун #45' },
  { ts: '08.05.2026 17:30:00', user: 'superadmin', action: 'create', label: 'Создал',   obj: 'Пользователь #8 — teacher2' },
  { ts: '08.05.2026 16:48:15', user: 'admin',      action: 'update', label: 'Изменил',  obj: 'Сотрудник #4' },
];

window.AIS_DATA = { STATUSES, STUDENTS, EMPLOYEES, GROUPS, FACULTIES, AUDIT, I };
