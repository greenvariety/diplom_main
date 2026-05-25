import { useState, useEffect, useRef } from 'react';
import api from './api.js';

const S = {
  btn: (active) => ({
    position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
    zIndex: 10000, background: active ? '#c0392b' : '#2c3e50',
    color: '#fff', border: 'none', borderRadius: 20, padding: '5px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '.03em',
    boxShadow: '0 2px 8px rgba(0,0,0,.25)', whiteSpace: 'nowrap',
    fontFamily: 'var(--font)',
  }),
  panel: {
    position: 'fixed', top: 44, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9999, width: 480, maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'calc(100vh - 60px)',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
    display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)',
    overflow: 'hidden',
  },
  head: {
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    fontWeight: 700, fontSize: 13, color: 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 12px' },
  task: {
    padding: '8px 10px', marginBottom: 6,
    background: 'var(--surface-alt)', borderRadius: 7,
    border: '1px solid var(--border)', position: 'relative',
  },
  taskNum: { fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 2 },
  taskTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 },
  taskDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 },
  code: {
    background: 'var(--bg)', borderRadius: 5, padding: '5px 8px',
    fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    color: 'var(--text-muted)', border: '1px solid var(--border)',
    fontFamily: 'monospace',
  },
  delBtn: {
    position: 'absolute', top: 6, right: 6, background: 'none',
    border: 'none', cursor: 'pointer', color: 'var(--bad-fg)',
    fontSize: 13, padding: '2px 5px', borderRadius: 4, lineHeight: 1,
  },
  form: { padding: '10px 12px', borderTop: '1px solid var(--border)' },
  label: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'block' },
  input: {
    width: '100%', fontSize: 13, padding: '6px 8px',
    border: '1px solid var(--border)', borderRadius: 6,
    background: 'var(--surface-alt)', color: 'var(--text)',
    boxSizing: 'border-box', fontFamily: 'var(--font)',
    outline: 'none', marginBottom: 6, resize: 'vertical',
  },
  addBtn: (disabled) => ({
    width: '100%', background: disabled ? 'var(--border)' : 'var(--accent)',
    color: '#fff', border: 'none', borderRadius: 6, padding: '7px',
    fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }),
};

export function HtmlTasksPanel() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);

  const load = () => {
    api.get('/dev/html-tasks/').then(r => setTasks(r.data)).catch(() => {});
  };

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const btn = document.getElementById('dev-tasks-toggle');
        if (btn && btn.contains(e.target)) return;
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const add = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/dev/html-tasks/', { title, description: desc, html_code: html });
      setTitle(''); setDesc(''); setHtml('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    await api.delete(`/dev/html-tasks/${id}/`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const disabled = saving || !title.trim();

  return (
    <>
      <button
        id="dev-tasks-toggle"
        style={S.btn(open)}
        onClick={() => setOpen(o => !o)}
      >
        {open ? '✕ Закрыть' : '✏ Режим правок'}
      </button>

      {open && (
        <div ref={panelRef} style={S.panel}>
          <div style={S.head}>
            <span>Задачи по правке - HTML.md ({tasks.length})</span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 2px' }}
              onClick={() => setOpen(false)}
            >✕</button>
          </div>

          <div style={S.list}>
            {tasks.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                Нет задач. Добавьте первую.
              </div>
            )}
            {tasks.map(t => (
              <div key={t.id} style={S.task}>
                <div style={S.taskNum}>Задача {t.id}</div>
                <div style={S.taskTitle}>{t.title}</div>
                {t.description && <div style={S.taskDesc}>{t.description}</div>}
                {t.html_code && <pre style={S.code}>{t.html_code}</pre>}
                <button style={S.delBtn} onClick={() => del(t.id)} title="Удалить задачу">✕</button>
              </div>
            ))}
          </div>

          <div style={S.form}>
            <label style={S.label}>Название задачи</label>
            <input
              style={{ ...S.input, resize: 'none', height: 32 }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
            />
            <label style={S.label}>Что нужно сделать (необязательно)</label>
            <textarea
              style={S.input}
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <label style={S.label}>HTML код элемента (необязательно)</label>
            <textarea
              style={{ ...S.input, fontFamily: 'monospace', fontSize: 12 }}
              rows={3}
              value={html}
              onChange={e => setHtml(e.target.value)}
            />
            <button style={S.addBtn(disabled)} onClick={add} disabled={disabled}>
              {saving ? 'Сохранение...' : '+ Добавить задачу'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
