/* NEXUS — Audit / Logs (enterprise-grade viewer) */
const Audit = (() => {
  'use strict';

  const SESSION_KEY = 'nexus_session_v1';
  const USERS_KEY = 'nexus_users_v1';
  const AUDIT_KEY = 'nexus_audit_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let cache = [];

  const ACTION_LABELS = {
    'backup.export': 'Експорт бекапу',
    'backup.import': 'Імпорт бекапу',
    'users.create': 'Створення користувача',
    'users.update': 'Оновлення користувача',
    'users.delete': 'Видалення користувача',
    'crm.client.create': 'CRM: новий контрагент',
    'crm.client.update': 'CRM: зміна контрагента',
    'error.runtime': 'Помилка JS',
    'error.promise': 'Помилка Promise'
  };

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fDT(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 19).replace('T', ' ');
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    } catch (e) { return String(iso); }
  }
  function dayOf(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 10);
      const pad = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    } catch (e) { return String(iso).slice(0, 10); }
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY); return null;
      }
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) { return null; }
  }

  function initAuth() {
    const u = getCurrentUser();
    const ov = document.getElementById('auth-ov');
    const app = document.getElementById('app');
    if (!u) {
      if (ov) ov.classList.remove('hidden');
      if (app) app.classList.remove('vis');
      return false;
    }
    if (ov) ov.classList.add('hidden');
    if (app) app.classList.add('vis');
    const name = u.fullName || u.username || '?';
    const av = document.getElementById('av');
    const hun = document.getElementById('hun');
    const hur = document.getElementById('hur');
    if (av) av.textContent = name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
    if (hun) hun.textContent = name;
    if (hur) hur.textContent = ({ admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' })[u.role] || u.role;
    const btn = document.getElementById('btn-clear');
    if (btn) btn.style.display = u.role === 'admin' ? '' : 'none';
    return true;
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    location.href = 'index.html';
  }

  function initTheme() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.onclick = () => {
        const a = ['light', 'dark', 'auto'];
        const c = document.documentElement.getAttribute('data-theme') || 'auto';
        const n = a[(a.indexOf(c) + 1) % 3];
        document.documentElement.setAttribute('data-theme', n);
        try { localStorage.setItem(THEME_KEY, n); } catch (e) {}
      };
    });
  }

  function loadLogs() {
    try {
      if (window.NexusCore && NexusCore.read) {
        const list = NexusCore.read(AUDIT_KEY, []);
        cache = Array.isArray(list) ? list.slice() : [];
      } else {
        const raw = localStorage.getItem(AUDIT_KEY);
        cache = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(cache)) cache = [];
      }
    } catch (e) { cache = []; }
    cache.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }

  function actionKind(action) {
    const a = String(action || '').toLowerCase();
    if (a.includes('error')) return 'error';
    if (a.includes('delete') || a.includes('del')) return 'delete';
    if (a.includes('create') || a.includes('add') || a.includes('import')) return 'create';
    if (a.includes('update') || a.includes('edit') || a.includes('save')) return 'update';
    if (a.includes('backup') || a.includes('export')) return 'backup';
    if (a.includes('login') || a.includes('auth') || a.includes('logout')) return 'login';
    return 'system';
  }

  function actionLabel(action) {
    if (ACTION_LABELS[action]) return ACTION_LABELS[action];
    return String(action || '—').replace(/\./g, ' · ');
  }

  function detailsPreview(d) {
    if (d == null || d === '') return '—';
    if (typeof d === 'string') return d.slice(0, 160);
    try {
      const s = JSON.stringify(d);
      return s.length > 160 ? s.slice(0, 160) + '…' : s;
    } catch (e) { return String(d).slice(0, 160); }
  }

  function fillFilters() {
    const actions = new Set();
    const entities = new Set();
    const users = new Set();
    cache.forEach(e => {
      if (e.action) actions.add(e.action);
      if (e.entity) entities.add(e.entity);
      if (e.userName) users.add(e.userName);
    });
    const fa = document.getElementById('f-action');
    const fe = document.getElementById('f-entity');
    const fu = document.getElementById('f-user');
    const keepA = fa.value, keepE = fe.value, keepU = fu.value;
    fa.innerHTML = '<option value="">Усі дії</option>' +
      [...actions].sort().map(a => '<option value="' + esc(a) + '">' + esc(actionLabel(a)) + '</option>').join('');
    fe.innerHTML = '<option value="">Усі сутності</option>' +
      [...entities].sort().map(a => '<option value="' + esc(a) + '">' + esc(a) + '</option>').join('');
    fu.innerHTML = '<option value="">Усі</option>' +
      [...users].sort().map(a => '<option value="' + esc(a) + '">' + esc(a) + '</option>').join('');
    fa.value = keepA; fe.value = keepE; fu.value = keepU;
  }

  function filtered() {
    const q = (document.getElementById('q')?.value || '').toLowerCase().trim();
    const fa = document.getElementById('f-action')?.value || '';
    const fe = document.getElementById('f-entity')?.value || '';
    const fu = document.getElementById('f-user')?.value || '';
    const from = document.getElementById('f-from')?.value || '';
    const to = document.getElementById('f-to')?.value || '';
    return cache.filter(e => {
      if (fa && e.action !== fa) return false;
      if (fe && e.entity !== fe) return false;
      if (fu && e.userName !== fu) return false;
      const day = dayOf(e.at);
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;
      if (q) {
        const blob = [e.action, e.entity, e.userName, e.role, detailsPreview(e.details), e.id]
          .join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  function renderStats() {
    const el = document.getElementById('stats');
    if (!el) return;
    const list = cache;
    const todayStr = today();
    const todayN = list.filter(e => dayOf(e.at) === todayStr).length;
    const errors = list.filter(e => actionKind(e.action) === 'error').length;
    const users = new Set(list.map(e => e.userName).filter(Boolean)).size;
    el.innerHTML =
      '<div class="sc"><div class="scl">Подій у журналі</div><div class="scv scv-b">' + list.length + '</div></div>' +
      '<div class="sc"><div class="scl">Сьогодні</div><div class="scv scv-g">' + todayN + '</div></div>' +
      '<div class="sc"><div class="scl">Помилки</div><div class="scv scv-o">' + errors + '</div></div>' +
      '<div class="sc"><div class="scl">Учасників</div><div class="scv scv-p">' + users + '</div></div>';
  }

  function render() {
    renderStats();
    const list = filtered();
    const feed = document.getElementById('feed');
    if (!feed) return;
    if (!list.length) {
      feed.innerHTML = '<div class="aud-empty">Немає записів за обраними фільтрами.<br><span class="tsm">Дії в модулях (збереження, бекап, CRM…) з’являться тут автоматично.</span></div>';
      return;
    }
    let h = '<div class="aud-row head"><div>Час</div><div>Дія</div><div>Деталі</div><div>Користувач</div><div></div></div>';
    list.forEach(e => {
      const kind = actionKind(e.action);
      h += '<div class="aud-row" role="button" tabindex="0" onclick="Audit.openDetail(\'' + esc(e.id) + '\')">';
      h += '<div class="aud-time">' + esc(fDT(e.at)) + '</div>';
      h += '<div><span class="badge-act ' + kind + '">' + esc(actionLabel(e.action)) + '</span>';
      h += '<div class="aud-entity">' + esc(e.entity || '—') + '</div></div>';
      h += '<div class="aud-details">' + esc(detailsPreview(e.details)) + '</div>';
      h += '<div class="aud-user">' + esc(e.userName || 'system');
      h += '<div class="tsm tmu">' + esc(e.role || '') + '</div></div>';
      h += '<div><button class="btn bs bxs" type="button" onclick="event.stopPropagation();Audit.openDetail(\'' + esc(e.id) + '\')">👁</button></div>';
      h += '</div>';
    });
    feed.innerHTML = h;
  }

  function openDetail(id) {
    const e = cache.find(x => x.id === id);
    if (!e) return;
    let details = e.details;
    try {
      details = typeof e.details === 'string' ? e.details : JSON.stringify(e.details || {}, null, 2);
    } catch (err) { details = String(e.details); }
    const body = document.getElementById('detail-body');
    body.innerHTML =
      '<div class="crm-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
      '<div><div class="tsm tmu">Час</div><b>' + esc(fDT(e.at)) + '</b></div>' +
      '<div><div class="tsm tmu">ID</div><span class="tmn">' + esc(e.id) + '</span></div>' +
      '<div><div class="tsm tmu">Дія</div><b>' + esc(actionLabel(e.action)) + '</b><div class="tsm tmu">' + esc(e.action) + '</div></div>' +
      '<div><div class="tsm tmu">Сутність</div><b>' + esc(e.entity || '—') + '</b></div>' +
      '<div><div class="tsm tmu">Користувач</div><b>' + esc(e.userName || 'system') + '</b></div>' +
      '<div><div class="tsm tmu">Роль</div><b>' + esc(e.role || '—') + '</b></div>' +
      '</div>' +
      '<div class="tsm tmu" style="margin-bottom:6px">Деталі (JSON)</div>' +
      '<div class="aud-json">' + esc(details) + '</div>' +
      '<div class="fg" style="margin-top:14px"><button class="btn bs" type="button" onclick="Audit.closeDetail()">Закрити</button></div>';
    document.getElementById('detail-modal').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('detail-modal').classList.remove('open');
  }

  function refresh() {
    loadLogs();
    fillFilters();
    render();
  }

  function exportExcel() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const list = filtered();
    if (!list.length) { alert('Немає даних для експорту'); return; }
    const data = [['Час', 'Дія', 'Код дії', 'Сутність', 'Користувач', 'Роль', 'User ID', 'Деталі']];
    list.forEach(e => {
      let det = '';
      try { det = typeof e.details === 'string' ? e.details : JSON.stringify(e.details || {}); } catch (err) { det = String(e.details); }
      data.push([fDT(e.at), actionLabel(e.action), e.action || '', e.entity || '', e.userName || '', e.role || '', e.userId || '', det]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Аудит');
    XLSX.writeFile(wb, 'nexus-audit-log.xlsx');
  }

  function clearLogs() {
    const u = getCurrentUser();
    if (!u || u.role !== 'admin') { alert('Очищення доступне лише адміністратору'); return; }
    if (!confirm('Очистити весь журнал аудиту?\nЦю дію не можна скасувати.')) return;
    if (!confirm('Підтвердіть ще раз: видалити всі записи логів?')) return;
    try {
      if (window.NexusCore && NexusCore.write) NexusCore.write(AUDIT_KEY, []);
      else localStorage.setItem(AUDIT_KEY, '[]');
      if (window.NexusCore && NexusCore.audit) {
        NexusCore.audit('audit.clear', 'system', { by: u.username || u.id });
      }
    } catch (e) {}
    refresh();
    alert('Журнал очищено');
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('audit')) return;
    if (!initAuth()) return;
    initTheme();
    refresh();
    // seed notice if empty — optional system event
    if (!cache.length && window.NexusCore && NexusCore.audit) {
      NexusCore.audit('audit.module.open', 'system', { note: 'Модуль аудиту відкрито вперше' });
      refresh();
    }
  }

  return { init, logout, render, refresh, openDetail, closeDetail, exportExcel, clearLogs };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { Audit.init(); } catch (e) { console.error(e); alert('Помилка аудиту: ' + e.message); }
});
