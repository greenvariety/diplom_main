import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api.js';

/* Стиль подсветки при наведении в режиме выбора */
const HIGHLIGHT_STYLE = '2px solid #e74c3c';
const HIGHLIGHT_BG = 'rgba(231,76,60,0.08)';

let _lastHighlighted = null;

function highlightEl(el) {
  if (_lastHighlighted && _lastHighlighted !== el) {
    _lastHighlighted.style.outline = '';
    _lastHighlighted.style.backgroundColor = '';
  }
  if (el) {
    el.style.outline = HIGHLIGHT_STYLE;
    el.style.backgroundColor = HIGHLIGHT_BG;
  }
  _lastHighlighted = el;
}

function clearHighlight() {
  if (_lastHighlighted) {
    _lastHighlighted.style.outline = '';
    _lastHighlighted.style.backgroundColor = '';
    _lastHighlighted = null;
  }
}

export function HtmlTasksPanel() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [desc, setDesc] = useState('');
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const panelRef = useRef(null);
  const PANEL_ID = 'dev-tasks-panel';

  const load = () => {
    api.get('/dev/html-tasks/').then(r => setTasks(r.data)).catch(() => {});
  };

  useEffect(() => { if (open) load(); }, [open]);

  /* ── режим выбора элемента ── */
  const startPicking = () => {
    setPicking(true);
    setOpen(false); // скрываем панель чтобы не мешала
  };

  const stopPicking = useCallback(() => {
    setPicking(false);
    clearHighlight();
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!picking) return;
    document.body.style.cursor = 'crosshair';

    const onMove = (e) => {
      const el = e.target;
      // не подсвечивать служебные элементы панели
      if (el.closest(`#${PANEL_ID}`) || el.id === 'dev-tasks-toggle') return;
      highlightEl(el);
    };

    const onClick = (e) => {
      const el = e.target;
      if (el.closest(`#${PANEL_ID}`) || el.id === 'dev-tasks-toggle') return;
      e.preventDefault();
      e.stopPropagation();

      // берём outerHTML, но обрезаем если очень длинный
      let captured = el.outerHTML;
      if (captured.length > 800) {
        // берём только открывающий тег
        const m = captured.match(/^(<[^>]+>)/);
        captured = m ? m[1] : captured.slice(0, 200) + '...';
      }

      clearHighlight();
      stopPicking();
      setHtml(captured);
      setOpen(true);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') stopPicking();
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      clearHighlight();
      document.body.style.cursor = '';
    };
  }, [picking, stopPicking]);

  const add = async () => {
    if (!desc.trim()) return;
    setSaving(true);
    try {
      await api.post('/dev/html-tasks/', { title: desc, description: '', html_code: html });
      setDesc(''); setHtml('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    await api.delete(`/dev/html-tasks/${id}/`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const disabled = saving || !desc.trim();

  return (
    <>
      {/* Кнопка-переключатель */}
      <button
        id="dev-tasks-toggle"
        onClick={() => { if (picking) { stopPicking(); } else { setOpen(o => !o); } }}
        style={{
          position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000,
          background: picking ? '#c0392b' : open ? '#2c3e50' : '#2c3e50',
          color: '#fff', border: 'none', borderRadius: 20, padding: '5px 16px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '.03em',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)', whiteSpace: 'nowrap',
          fontFamily: 'var(--font)',
        }}
      >
        {picking ? '✕ Отмена (Esc)' : open ? '✕ Закрыть' : '✏ Режим правок'}
      </button>

      {/* Подсказка в режиме выбора */}
      {picking && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000, background: 'rgba(0,0,0,.75)', color: '#fff',
          borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 500,
          pointerEvents: 'none',
        }}>
          Кликни на элемент - Esc для отмены
        </div>
      )}

      {/* Панель */}
      {open && (
        <div id={PANEL_ID} ref={panelRef} style={{
          position: 'fixed', top: 44, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: 480, maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 60px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
          display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)',
          overflow: 'hidden',
        }}>
          {/* Шапка */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1 }}>HTML.md - задачи ({tasks.length})</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
            >✕</button>
          </div>

          {/* Список задач */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {tasks.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                Нет задач. Добавьте первую.
              </div>
            )}
            {tasks.map(t => (
              <div key={t.id} style={{
                padding: '8px 10px', marginBottom: 6,
                background: 'var(--surface-alt)', borderRadius: 7,
                border: '1px solid var(--border)', position: 'relative',
              }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>
                  Задача {t.id}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: t.html_code ? 4 : 0 }}>
                  {t.title}
                </div>
                {t.html_code && (
                  <pre style={{
                    background: 'var(--bg)', borderRadius: 5, padding: '5px 8px',
                    fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'monospace',
                  }}>{t.html_code}</pre>
                )}
                <button
                  onClick={() => del(t.id)}
                  style={{
                    position: 'absolute', top: 6, right: 6, background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--bad-fg)',
                    fontSize: 13, padding: '2px 5px', borderRadius: 4,
                  }}
                  title="Удалить"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Форма */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            {/* Кнопка выбора элемента */}
            <button
              onClick={startPicking}
              style={{
                width: '100%', marginBottom: 8, padding: '6px',
                background: 'var(--surface-alt)', border: '1px dashed var(--border)',
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>⊕</span>
              {html ? 'Выбрать другой элемент' : 'Кликни на элемент на странице'}
            </button>

            {/* Превью выбранного HTML */}
            {html && (
              <pre style={{
                background: 'var(--bg)', border: '1px solid var(--accent)',
                borderRadius: 6, padding: '5px 8px', fontSize: 11, marginBottom: 8,
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                color: 'var(--text-muted)', fontFamily: 'monospace', maxHeight: 80, overflowY: 'auto',
              }}>{html}</pre>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Что нужно сделать</div>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
              style={{
                width: '100%', fontSize: 13, padding: '6px 8px', marginBottom: 6,
                border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--surface-alt)', color: 'var(--text)',
                boxSizing: 'border-box', fontFamily: 'var(--font)',
                resize: 'vertical', outline: 'none',
              }}
            />
            <button
              onClick={add}
              disabled={disabled}
              style={{
                width: '100%', background: disabled ? 'var(--border)' : 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 6, padding: '7px',
                fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Сохранение...' : '+ Добавить задачу'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
