/* ============================================================
   Core utilities: toasts, counters, dropdowns, validation, etc.
   ============================================================ */
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { I } from './data.jsx';

/* ---------- Toast system ---------- */
const ToastCtx = createContext({ push: () => {}, remove: () => {} });

function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setItems((cur) => cur.map(i => i.id === id ? { ...i, leaving: true } : i));
    setTimeout(() => setItems((cur) => cur.filter(i => i.id !== id)), 220);
  }, []);

  const push = useCallback((msg, opts = {}) => {
    const id = ++idRef.current;
    const item = { id, msg, kind: opts.kind || 'info', leaving: false };
    setItems((cur) => [...cur, item]);
    const ttl = opts.duration ?? 3000;
    if (ttl > 0) setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ push, remove }}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind} ${t.leaving ? 'toast-out' : ''}`}>
            <div className="toast-ico">
              {t.kind === 'ok' ? I.check : t.kind === 'err' ? I.alert : I.info}
            </div>
            <div className="toast-msg">{t.msg}</div>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Закрыть">{I.x}</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

/* ---------- Animated counter ---------- */
function useCountUp(target, { duration = 600, run = true } = {}) {
  const [n, setN] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) { setN(target); return; }
    const start = performance.now();
    const from = 0;
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setN(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return n;
}

function StatNumber({ value }) {
  // Animate only on first mount per session per value key.
  const keyRef = useRef(`stat-${value}-${Math.random()}`);
  const seenRef = useRef(false);
  const n = useCountUp(Number.isFinite(+value) ? +value : 0, { run: !seenRef.current });
  useEffect(() => { seenRef.current = true; }, []);
  if (!Number.isFinite(+value)) return <span>{value}</span>;
  return <span>{n}</span>;
}

/* ---------- Dropdown (click-outside) ---------- */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current || !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, wrapRef };
}

/* ---------- Password validation rules ---------- */
const PW_RULES = [
  { id: 'len',    label: 'Минимум 8 символов',          test: (s) => s.length >= 8 },
  { id: 'digit',  label: 'Минимум 1 цифра',             test: (s) => /\d/.test(s) },
  { id: 'latin',  label: 'Минимум 1 латинская буква',   test: (s) => /[A-Za-z]/.test(s) },
  { id: 'spec',   label: 'Минимум 1 спецсимвол (_ -)',  test: (s) => /[_\-!@#$%^&*+.,;:?]/.test(s) },
];

function PasswordRules({ value, show }) {
  const results = PW_RULES.map(r => ({ ...r, ok: r.test(value || '') }));
  return (
    <div className="pw-rules" style={{ height: show ? 'auto' : 0, overflow: 'hidden', opacity: show ? 1 : 0, transition: 'opacity .15s' }}>
      {results.map(r => (
        <div key={r.id} className={`pw-rule ${r.ok ? 'ok' : (value ? 'bad' : '')}`}>
          <span className="pw-mark">
            {r.ok
              ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
          </span>
          {r.label}
        </div>
      ))}
    </div>
  );
}

function pwStrength(s) {
  if (!s) return 0;
  let score = 0;
  if (s.length >= 8) score++;
  if (/\d/.test(s)) score++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) score++;
  if (/[_\-!@#$%^&*+.,;:?]/.test(s)) score++;
  return score;
}
function PasswordStrength({ value }) {
  const s = pwStrength(value);
  const labels = ['', 'Слабый', 'Средний', 'Хороший', 'Сильный'];
  return (
    <>
      <div className="pw-strength"><div className={`pw-strength-fill s${s}`} /></div>
      <div className="pw-strength-label">
        <span>Сложность пароля</span>
        <span>{labels[s] || '-'}</span>
      </div>
    </>
  );
}

/* ---------- Password input with show/hide ---------- */
function PasswordInput({ value, onChange, onFocus, onBlur, onPaste, placeholder, autoComplete, className, hasError }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-pw-wrap">
      <input
        className={`input ${hasError ? 'is-error' : ''} ${className || ''}`}
        type={show ? 'text' : 'password'}
        value={value || ''}
        placeholder={placeholder || ''}
        autoComplete={autoComplete}
        onChange={(e) => onChange && onChange(e.target.value.replace(/[^\x00-\x7F]/g, ''))}
        onFocus={onFocus}
        onBlur={onBlur}
        onPaste={onPaste}
      />
      <button type="button" className="input-pw-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Скрыть' : 'Показать'} tabIndex={-1}>
        {show
          ? <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
      </button>
    </div>
  );
}

/* ---------- Fading error message ---------- */
function FadingError({ error, style }) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef(null);
  const hideRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    clearTimeout(hideRef.current);
    if (error) {
      setFading(false);
      setHidden(false);
      timerRef.current = setTimeout(() => setFading(true), 15000);
      hideRef.current = setTimeout(() => setHidden(true), 20000);
    } else {
      setFading(false);
      setHidden(false);
    }
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(hideRef.current);
    };
  }, [error]);

  if (!error || hidden) return null;
  return (
    <div className={`field-error${fading ? ' is-fading' : ''}`} style={style}>
      {I.alert}{error}
    </div>
  );
}

/* ---------- Field wrapper ---------- */
function Field({ label, required, error, success, children, hint, className }) {
  return (
    <div className={`field${className ? ' ' + className : ''}`}>
      {label && <label className="field-label">{label}{required && <span className="req">*</span>}</label>}
      <div style={{ position: 'relative' }}>
        {children}
        {success && !error && <span className="field-success">{I.check}</span>}
      </div>
      <FadingError error={error} />
      {hint && !error && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || I.search}</div>
      <h3>{title}</h3>
      {sub && <div className="sub">{sub}</div>}
      {action}
    </div>
  );
}

/* ---------- Skeleton row helpers ---------- */
function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}><div className="skeleton" style={{ height: 14, width: c === 0 ? 28 : c === 1 ? 60 : '70%' }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ---------- Loadable button (handles is-loading state) ---------- */
function LoadButton({ className = 'btn btn-primary', children, onClick, type = 'button', delay = 800, disabled, style }) {
  const [loading, setLoading] = useState(false);
  const handler = async (e) => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const out = onClick && onClick(e);
      if (out && typeof out.then === 'function') await out;
      else await new Promise(r => setTimeout(r, delay));
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type={type} className={`${className} ${loading ? 'is-loading' : ''}`} onClick={handler} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

/* ---------- Screen transition wrapper ---------- */
function ScreenTransition({ keyId, children }) {
  return <div key={keyId} className="screen-fade-in" style={{ height: '100%' }}>{children}</div>;
}

/* ============================================================
   Combobox - searchable select with autocomplete
   options:
     - [{ value, label, sub? }]  // sub renders dim, e.g. faculty after group
     - or [string]
   value: option.value (or string)
   ============================================================ */
function Combobox({ value, onChange, options, placeholder = 'Выберите…', error, allowClear = true, autoFocus, onBlur }) {
  const norm = useMemo(() => (options || []).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  ), [options]);
  const selected = norm.find(o => o.value === value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return norm;
    const t = q.toLowerCase();
    return norm.filter(o => (o.label || '').toLowerCase().includes(t) || (o.sub || '').toLowerCase().includes(t));
  }, [norm, q]);

  useEffect(() => { setCursor(0); }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current || !wrapRef.current.contains(e.target)) {
        setOpen(false); setQ('');
        onBlur && onBlur();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onBlur]);

  const display = open ? q : (selected ? selected.label : '');
  const openIt = () => { setOpen(true); setQ(''); setTimeout(() => inputRef.current?.select?.(), 0); };

  const pick = (opt) => {
    onChange && onChange(opt.value);
    setOpen(false); setQ('');
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setCursor(c => Math.min(filtered.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') {
      if (open && filtered[cursor]) { e.preventDefault(); pick(filtered[cursor]); }
    } else if (e.key === 'Escape') { setOpen(false); setQ(''); }
    else if (e.key === 'Tab') { setOpen(false); setQ(''); }
  };

  const highlight = (label) => {
    if (!q.trim()) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return label;
    return (<>
      {label.slice(0, idx)}
      <mark>{label.slice(idx, idx + q.length)}</mark>
      {label.slice(idx + q.length)}
    </>);
  };

  return (
    <div ref={wrapRef} className={`cbx ${open ? 'is-open' : ''}`}>
      <input
        ref={inputRef}
        className={`cbx-input ${!selected && !open ? 'placeholder-empty' : ''} ${error ? 'is-error' : ''}`}
        type="text"
        value={display}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={openIt}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKey}
        autoComplete="off"
        spellCheck={false}
      />
      {allowClear && selected && !open && (
        <button type="button" className="cbx-clear" onClick={(e) => { e.stopPropagation(); onChange && onChange(''); }} tabIndex={-1} aria-label="Очистить">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
      <span className="cbx-caret">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
      {open && (
        <div className="cbx-menu" role="listbox">
          {filtered.length === 0
            ? <div className="cbx-empty">Ничего не найдено</div>
            : filtered.map((o, i) => (
                <div
                  key={o.value}
                  className={`cbx-opt ${i === cursor ? 'is-cursor' : ''} ${o.value === value ? 'is-selected' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(o)}
                  role="option"
                  aria-selected={o.value === value}
                >
                  <span>{highlight(o.label)}</span>
                  {o.sub && <span className="cbx-opt-sub">{o.sub}</span>}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Pager + usePager (persisted via localStorage)
   ============================================================ */
function usePager(total, { key, defaultSize = 10 } = {}) {
  const [size, setSize] = useState(() => {
    if (!key) return defaultSize;
    try { const v = parseInt(localStorage.getItem(`pager.${key}.size`) || '', 10); return Number.isFinite(v) ? v : defaultSize; }
    catch { return defaultSize; }
  });
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => { if (page >= pages) setPage(pages - 1); }, [pages, page]);
  const setSizePersist = (s) => {
    setSize(s); setPage(0);
    if (key) { try { localStorage.setItem(`pager.${key}.size`, String(s)); } catch {} }
  };
  const start = page * size;
  const end = Math.min(total, start + size);
  const slice = (arr) => arr.slice(start, end);
  return { size, setSize: setSizePersist, page, setPage, pages, start, end, slice };
}

function Pager({ pager, total, sizes = [10, 25, 50, 100] }) {
  const { size, setSize, page, setPage, pages, start, end } = pager;
  const buttons = [];
  const add = (label, p, opts = {}) => buttons.push({ label, p, ...opts });
  // Compact pagination: first, prev, 1..pages window of 5, next, last
  const windowSize = 5;
  let from = Math.max(0, page - Math.floor(windowSize / 2));
  let to = Math.min(pages, from + windowSize);
  from = Math.max(0, to - windowSize);
  for (let p = from; p < to; p++) add(String(p + 1), p, { cur: p === page });

  return (
    <div className="pager">
      <div className="pager-left">
        <span>Показывать по</span>
        <select value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))}>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span>· {total === 0 ? '0' : `${start + 1}-${end}`} из {total}</span>
      </div>
      <div className="pager-right">
        <button disabled={page === 0} onClick={() => setPage(0)} aria-label="Первая">«</button>
        <button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Предыдущая">‹</button>
        {buttons.map(b => (
          <button key={b.label} className={b.cur ? 'is-cur' : ''} onClick={() => setPage(b.p)}>{b.label}</button>
        ))}
        <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Следующая">›</button>
        <button disabled={page >= pages - 1} onClick={() => setPage(pages - 1)} aria-label="Последняя">»</button>
      </div>
    </div>
  );
}

/* ============================================================
   Sortable column helper
   ============================================================ */
function useSortable(initial = { key: null, dir: 'asc' }, persistKey) {
  const [sort, setSort] = useState(() => {
    if (persistKey) {
      try { const v = JSON.parse(localStorage.getItem(`sort.${persistKey}`) || 'null'); if (v) return v; } catch {}
    }
    return initial;
  });
  const apply = (k) => {
    const next = sort.key === k ? { key: k, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' };
    setSort(next);
    if (persistKey) { try { localStorage.setItem(`sort.${persistKey}`, JSON.stringify(next)); } catch {} }
  };
  const sortFn = (arr, accessors = {}) => {
    if (!sort.key) return arr;
    const acc = accessors[sort.key] || (x => x[sort.key]);
    return [...arr].sort((a, b) => {
      const av = acc(a), bv = acc(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const r = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'ru');
      return sort.dir === 'asc' ? r : -r;
    });
  };
  return { sort, apply, sortFn };
}

function SortHeader({ k, sort, onClick, children, width }) {
  const active = sort.sort.key === k;
  return (
    <th className={`sortable ${active ? 'is-sorted' : ''}`} style={width ? { width } : null} onClick={() => sort.apply(k)}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
        <span className="sort-ico">
          {active
            ? (sort.sort.dir === 'asc'
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>)
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 10 12 5 17 10"/><polyline points="7 14 12 19 17 14"/></svg>
          }
        </span>
      </span>
    </th>
  );
}

export {
  ToastProvider, useToast,
  useCountUp, StatNumber,
  useDropdown,
  PasswordRules, PasswordStrength, PasswordInput, pwStrength,
  FadingError, Field, EmptyState, SkeletonRows, LoadButton, ScreenTransition,
  Combobox, Pager, usePager, useSortable, SortHeader,
};
