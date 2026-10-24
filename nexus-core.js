/* NEXUS ENGENEERING — NEXUS CORE v6.1.0 (merged)
 * Base: GitHub 5.0.1 (XSS/quota/UUID/observer) + chat logic 6.x without Mercedes theme.
 * Provides: session/auth helpers, RBAC, audit log, notifications, safe storage,
 * global error capture, backup/restore helpers and read-only enforcement.
 *
 * v5.0.1: HTML sanitization, quota handling, MutationObserver fix, crypto.randomUUID, validation
 * v6.1.0: canEdit/denyEdit/hashPassword, storage stats, last-backup tracking
 *
 * NOTE: localStorage authentication remains a local/offline mode; for real
 * multi-user deployment this layer should be backed by the server API.
 */
(() => {
  'use strict';

  const VERSION = '6.1.0';
  const KEYS = Object.freeze({
    users: 'nexus_users_v1',
    session: 'nexus_session_v1',
    audit: 'nexus_audit_v1',
    notifications: 'nexus_notifications_v1',
    theme: 'nexus_theme_v1',
    meta: 'nexus_core_meta_v1',
    lastBackup: 'nexus_last_backup_v1'
  });

  function getStorageStats() {
    let bytes = 0, keys = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('nexus_')) continue;
        keys++;
        const v = localStorage.getItem(k) || '';
        bytes += k.length + v.length;
      }
    } catch (_) {}
    const approxBytes = bytes * 2;
    const limit = 5 * 1024 * 1024;
    const pct = Math.min(100, Math.round((approxBytes / limit) * 1000) / 10);
    return {
      keys, bytes: approxBytes,
      kb: Math.round(approxBytes / 102.4) / 10,
      mb: Math.round(approxBytes / 10485.76) / 100,
      pct, limit,
      warning: pct >= 70, critical: pct >= 90
    };
  }

  function getLastBackupAt() {
    try {
      const raw = localStorage.getItem(KEYS.lastBackup);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p && p.at ? p.at : null;
    } catch (_) { return null; }
  }

  function markBackupDone() {
    try {
      localStorage.setItem(KEYS.lastBackup, JSON.stringify({ at: now(), version: VERSION }));
    } catch (_) {}
  }

  function daysSinceBackup() {
    const at = getLastBackupAt();
    if (!at) return null;
    const t = Date.parse(at);
    if (!t) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }

  const MODULES = Object.freeze({
    hr: 'hr.html', dashboard: 'dashboard.html', documents: 'documents.html',
    finance: 'finance.html', inventory: 'inventory.html', fleet: 'fleet.html', 
    tasks: 'tasks.html', projects: 'projects.html', crm: 'crm.html', 
    reports: 'reports.html', audit: 'audit.html', warehouse: 'warehouse.html',
    calendar: 'calendar.html', mail: 'mail.html'
  });

  const MODULE_DEFS = Object.freeze([
    { id: 'dashboard', title: 'Дашборд', file: 'dashboard.html' },
    { id: 'hr', title: 'Кадровий облік', file: 'hr.html' },
    { id: 'inventory', title: 'Інвентар', file: 'inventory.html' },
    { id: 'fleet', title: 'Авто і паливо', file: 'fleet.html' },
    { id: 'documents', title: 'Документообіг', file: 'documents.html' },
    { id: 'projects', title: 'Проекти', file: 'projects.html' },
    { id: 'tasks', title: 'Задачі', file: 'tasks.html' },
    { id: 'finance', title: 'Фінанси', file: 'finance.html' },
    { id: 'crm', title: 'CRM — Клієнти', file: 'crm.html' },
    { id: 'calendar', title: 'Календар', file: 'calendar.html' },
    { id: 'mail', title: 'Пошта', file: 'mail.html' },
    { id: 'reports', title: 'Звіти', file: 'reports.html' },
    { id: 'audit', title: 'Аудит / Логи', file: 'audit.html' },
    { id: 'warehouse', title: 'Склад', file: 'warehouse.html' }
  ]);

  function defaultModulesForRole(role) {
    if (role === 'admin') return ['*'];
    return MODULE_DEFS.map(m => m.id);
  }

  function normalizeModules(user) {
    if (!user) return [];
    if (user.role === 'admin') return ['*'];
    if (!Array.isArray(user.modules) || !user.modules.length) return defaultModulesForRole(user.role || 'manager');
    return user.modules;
  }

  function hasModuleAccess(moduleId, user=getCurrentUser()) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const mods = normalizeModules(user);
    if (mods.includes('*')) return true;
    return mods.includes(moduleId);
  }

  function requireModule(moduleId) {
    const user = getCurrentUser();
    if (!user) {
      try {
        sessionStorage.setItem('nexus_redirect_after_login', location.pathname.split('/').pop() || 'index.html');
      } catch (_) {}
      location.href = 'index.html';
      return false;
    }
    if (!hasModuleAccess(moduleId, user)) {
      notify('Немає доступу до модуля «' + (MODULE_DEFS.find(m => m.id === moduleId)?.title || moduleId) + '»', 'error');
      setTimeout(() => { location.href = 'index.html'; }, 600);
      return false;
    }
    return true;
  }

  function fileToModuleId(filename) {
    const f = String(filename || '').split('/').pop().split('#')[0].toLowerCase();
    const found = MODULE_DEFS.find(m => m.file === f);
    return found ? found.id : null;
  }

  /** Єдина база контрагентів (CRM) */
  function getCrmClients(filter) {
    const data = read('nexus_crm_v1', { clients: [] });
    let list = Array.isArray(data.clients) ? data.clients.filter(c => c && c.id && c.name) : [];
    if (filter === 'customer') {
      list = list.filter(c => {
        const r = c.role || 'customer';
        return r === 'customer' || r === 'both';
      });
    } else if (filter === 'supplier') {
      list = list.filter(c => {
        const r = c.role || 'customer';
        return r === 'supplier' || r === 'both';
      });
    }
    return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'uk'));
  }

  function getCrmClient(id) {
    if (!id) return null;
    return getCrmClients().find(c => c.id === id) || null;
  }

  function crmClientLabel(c) {
    if (!c) return '';
    const roleMap = { customer: 'замовник', supplier: 'підрядник', both: 'обидва' };
    const role = roleMap[c.role || 'customer'] || '';
    const ed = c.edrpou ? ' · ' + c.edrpou : '';
    return c.name + (role ? ' (' + role + ')' : '') + ed;
  }

  /**
   * Заповнює <select> контрагентами з CRM.
   * @param {HTMLSelectElement|string} select
   * @param {object} opts { selected, filter: 'customer'|'supplier'|null, emptyLabel, includeAll }
   */
  function fillCrmSelect(select, opts) {
    opts = opts || {};
    const sel = typeof select === 'string' ? document.getElementById(select) : select;
    if (!sel) return;
    const filter = opts.filter || null;
    let clients = getCrmClients(filter);
    if (filter && opts.includeAllFallback && !clients.length) clients = getCrmClients();
    const empty = opts.emptyLabel || '— оберіть з CRM —';
    const selected = opts.selected || '';
    sel.innerHTML = '<option value="">' + empty + '</option>' + clients.map(c => {
      const val = String(c.id).replace(/"/g, '');
      const lab = crmClientLabel(c).replace(/</g, '').replace(/&/g, '');
      return '<option value="' + val + '">' + lab + '</option>';
    }).join('');
    if (selected) sel.value = selected;
    if (selected && sel.value !== selected) {
      const phantom = document.createElement('option');
      phantom.value = selected;
      phantom.textContent = opts.fallbackName ? (opts.fallbackName + ' (немає в CRM)') : selected;
      sel.appendChild(phantom);
      sel.value = selected;
    }
  }

  function applyCrmClientToFields(clientId, fields) {
    fields = fields || {};
    const c = getCrmClient(clientId);
    if (!c) {
      if (fields.nameEl) fields.nameEl.value = '';
      if (fields.edrpouEl) fields.edrpouEl.value = '';
      return null;
    }
    if (fields.nameEl) fields.nameEl.value = c.name || '';
    if (fields.edrpouEl) fields.edrpouEl.value = c.edrpou || '';
    return c;
  }

  const PERMISSIONS = Object.freeze({
    admin: ['*'],
    manager: [
      'dashboard.read','hr.read','hr.write','documents.read','documents.write',
      'finance.read','finance.write','inventory.read','inventory.write','fleet.read','fleet.write',
      'crm.read','crm.write','reports.read','audit.read','warehouse.read','warehouse.write',
      'tasks.read','tasks.write','projects.read','projects.write','audit.read',
      'calendar.read','calendar.write','mail.read','mail.write'
    ],
    viewer: [
      'dashboard.read','hr.read','documents.read','finance.read',
      'inventory.read','fleet.read','crm.read','reports.read','warehouse.read',
      'tasks.read','projects.read','calendar.read','mail.read'
    ]
  });

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('[NEXUS] storage read failed:', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      const data = JSON.stringify(value);
      localStorage.setItem(key, data);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('[NEXUS] Переповнено сховище!');
        notify('⚠️ Увага: Закінчилося місце в браузері! Зробіть експорт даних та очистіть старі записи.', 'error');
        audit('storage.quota_exceeded', 'system', { key });
      } else {
        console.error('[NEXUS] Помилка запису:', e);
        notify('Помилка збереження даних: ' + e.message, 'error');
        audit('storage.write_failed', key, { error: e.message });
      }
      return false;
    }
  }

  function id(prefix='id') {
    // Використовуємо crypto.randomUUID() для унікальних ID (підготовка до сервера)
    if (window.crypto && window.crypto.randomUUID) {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }
    // Fallback для старих браузерів
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function now() { return new Date().toISOString(); }

  function getCurrentUser() {
    const session = read(KEYS.session, null);
    if (!session || !session.userId) return null;
    if (session.expiresAt && Number(session.expiresAt) <= Date.now()) {
      try { localStorage.removeItem(KEYS.session); } catch (_) {}
      return null;
    }
    const users = read(KEYS.users, []);
    return Array.isArray(users) ? (users.find(u => u && u.id === session.userId) || null) : null;
  }

  function hasPermission(permission, user=getCurrentUser()) {
    if (!user) return false;
    const list = PERMISSIONS[user.role] || [];
    return list.includes('*') || list.includes(permission);
  }

  function canWrite(module, user=getCurrentUser()) {
    return hasPermission(`${module}.write`, user);
  }

  function canEdit(moduleId, user=getCurrentUser()) {
    if (!user) return false;
    if (user.role === 'viewer') return false;
    if (user.role === 'admin') return true;
    if (moduleId) return canWrite(moduleId, user);
    return user.role === 'manager' || user.role === 'admin';
  }

  function denyEdit(msg) {
    const text = msg || 'Недостатньо прав: роль «Перегляд» не дозволяє змінювати дані.';
    try { notify(text, 'error'); } catch (_) { alert(text); }
    return false;
  }

  /** Same hash as portal/app (pwd + salt + nexus_v3) */
  function hashPassword(pwd, salt) {
    const s = String(pwd) + '::' + String(salt) + '::nexus_v3';
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  function getProjects() {
    const db = read('nexus_projects_v1', {projects:[]});
    return Array.isArray(db.projects) ? db.projects : [];
  }

  function projectLabel(id) {
    const p = getProjects().find(x => x.id === id);
    return p ? `${p.code} — ${p.name}` : '';
  }

  function fillProjectSelect(select, selected='') {
    if (!select) return;
    const projects = getProjects().filter(p => p.status !== 'cancelled').sort((a,b) => String(a.name).localeCompare(String(b.name)));
    select.innerHTML = '<option value="">— без проекту —</option>' + projects.map(p => `<option value="${String(p.id).replace(/"/g,'&quot;')}">${String(p.code).replace(/&/g,'&amp;').replace(/</g,'&lt;')} — ${String(p.name).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
    select.value = selected || '';
  }

  function getAuditLog() {
    return read(KEYS.audit, []);
  }

  function audit(action, entity, details={}) {
    const user = getCurrentUser();
    const list = read(KEYS.audit, []);
    list.push({
      id: id('audit'), at: now(), action, entity,
      userId: user?.id || null,
      userName: user?.fullName || user?.username || 'system',
      role: user?.role || 'system', details
    });
    const trimmed = list.slice(-2000);
    write(KEYS.audit, trimmed);
  }

  function notify(message, type='info', options={}) {
    const list = read(KEYS.notifications, []);
    list.push({
      id: id('ntf'), at: now(), type, message,
      userId: options.userId || null, read: false
    });
    write(KEYS.notifications, list.slice(-500));
    renderNotification(message, type);
  }

  function renderNotification(message, type='info') {
    let host = document.getElementById('nexus-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'nexus-toast-host';
      host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:360px;pointer-events:none';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.textContent = message;
    item.style.cssText = 'padding:12px 14px;border-radius:10px;background:var(--panel,#fff);color:var(--text,#111827);border:1px solid var(--border,#d1d5db);box-shadow:0 8px 30px rgba(0,0,0,.16);font:14px/1.4 system-ui;pointer-events:auto';
    if (type === 'error') item.style.borderColor = '#ef4444';
    if (type === 'success') item.style.borderColor = '#22c55e';
    host.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  function exportAll() {
    const data = {};
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('nexus_')) continue;
      try { data[key] = JSON.parse(localStorage.getItem(key)); }
      catch (_) { data[key] = localStorage.getItem(key); }
    }
    data.__nexus_backup = { version: VERSION, createdAt: now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    audit('backup.export', 'system', {keys:Object.keys(data).length});
    markBackupDone();
    notify('Резервну копію NEXUS створено', 'success');
    try { window.dispatchEvent(new CustomEvent('nexus-backup-done')); } catch (_) {}
  }

  function importAll(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || typeof data !== 'object' || !data.__nexus_backup) throw new Error('Невірний файл резервної копії NEXUS');
          const keys = Object.keys(data).filter(k => k.startsWith('nexus_'));
          keys.forEach(k => write(k, data[k]));
          audit('backup.import', 'system', {keys: keys.length, sourceVersion: data.__nexus_backup.version});
          resolve(keys.length);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
      reader.readAsText(file);
    });
  }

  // Зберігаємо посилання на observer для уникнення витоку пам'яті
  let readOnlyObserver = null;

  function enforceReadOnly() {
    const user = getCurrentUser();
    if (!user || user.role !== 'viewer') {
      // Відключаємо observer, якщо користувач не viewer
      if (readOnlyObserver) {
        readOnlyObserver.disconnect();
        readOnlyObserver = null;
      }
      document.documentElement.dataset.nexusReadonly = '0';
      return;
    }
    
    document.documentElement.dataset.nexusReadonly = '1';
    const selector = 'button, input[type="submit"], input[type="button"], [data-action="write"]';
    const isMutation = el => {
      if (el.dataset.nexusAllowViewer === '1') return false;
      if (el.dataset.action === 'write') return true;
      if (el.classList && el.classList.contains('nexus-write')) return true;
      const txt = `${el.textContent || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('onclick') || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      return /додат|створ|зберег|видал|редаг|імпорт|очист|розрахув|нова|добав|сохран|удал|измен|импорт|clear|delete|edit|save|add|create|write|нов(ий|а|е)|видалити|редагувати|зберегти/.test(txt);
    };
    const apply = root => {
      root.querySelectorAll?.(selector).forEach(el => {
        if (isMutation(el)) {
          el.disabled = true;
          el.setAttribute('aria-disabled', 'true');
          el.classList.add('nexus-readonly-disabled');
          if (el.tagName === 'A') {
            el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, true);
          }
        }
      });
      root.querySelectorAll?.('input[type="file"]').forEach(el => {
        if (el.dataset.nexusAllowViewer === '1') return;
        el.disabled = true;
        el.classList.add('nexus-readonly-disabled');
      });
    };
    apply(document);
    
    // Відключаємо старий observer перед створенням нового
    if (readOnlyObserver) {
      readOnlyObserver.disconnect();
    }
    
    // Створюємо новий observer
    readOnlyObserver = new MutationObserver(m => {
      m.forEach(x => x.addedNodes.forEach(n => {
        if (n.nodeType === 1) apply(n);
      }));
    });
    
    if (document.body) {
      readOnlyObserver.observe(document.body, {childList:true,subtree:true});
    }
  }

  function installGlobalHandlers() {
    window.addEventListener('error', e => {
      console.error('[NEXUS] runtime error', e.error || e.message);
      audit('error.runtime', 'javascript', {message:String(e.message || 'Unknown error')});
    });
    window.addEventListener('unhandledrejection', e => {
      console.error('[NEXUS] unhandled rejection', e.reason);
      audit('error.promise', 'javascript', {message:String(e.reason?.message || e.reason || 'Unknown rejection')});
    });
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        exportAll();
      }
    });
  }

  function loadPersistentShell() {
    try {
      const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (page === 'index.html' || page === '' || page === '/') return;
      if (document.getElementById('nexus-shell-script')) return;
      const s = document.createElement('script');
      s.id = 'nexus-shell-script';
      s.src = 'nexus-shell.js';
      s.async = false;
      (document.body || document.documentElement).appendChild(s);
    } catch (_) {}
  }

  function init() {
    try {
      const meta = read(KEYS.meta, null) || {createdAt: now()};
      meta.version = VERSION; meta.lastLoadedAt = now();
      write(KEYS.meta, meta);
    } catch (_) {}
    installGlobalHandlers();
    document.addEventListener('DOMContentLoaded', enforceReadOnly, {once:true});
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadPersistentShell, { once: true });
    } else {
      loadPersistentShell();
    }
  }

  window.NexusCore = Object.freeze({
    VERSION, KEYS, MODULES, MODULE_DEFS, PERMISSIONS,
    read, write, id, now, getCurrentUser,
    hasPermission, canWrite, canEdit, denyEdit, hashPassword,
    hasModuleAccess, requireModule,
    defaultModulesForRole, normalizeModules, fileToModuleId,
    getCrmClients, getCrmClient, crmClientLabel, fillCrmSelect, applyCrmClientToFields,
    getAuditLog, getProjects, projectLabel, fillProjectSelect,
    audit, notify, exportAll, importAll, enforceReadOnly,
    getStorageStats, getLastBackupAt, markBackupDone, daysSinceBackup
  });
  init();
})();
