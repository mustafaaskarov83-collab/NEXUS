/* NEXUS — HR cloud bridge v1.1
 * Двостороння синхронізація співробітників: браузер ⇄ Supabase.
 * Підключається в hr.html. Не потребує інших файлів.
 * v1.1: гарантує повну структуру бази в localStorage (holidays, company, ...),
 *       щоб app.js не падав на db.holidays.length; плашка більше не ховається до перезавантаження.
 */
(() => {
  'use strict';

  const HR_KEY = 'nexus_hr_ua_v2';
  const PERIOD = 8000;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const DEF_HOL = ['01-01', '03-08', '05-01', '05-09', '06-28', '07-15', '08-24', '10-01', '12-25'];

  let timer = null, busy = false, warned = false, pendingCount = 0;

  const client = () => window.nexusSupabase || window.supabaseClient || null;
  const api = () => window.nexusData || null;
  const isUuid = v => UUID_RE.test(String(v || ''));
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function ensureShape(db) {
    if (!db || typeof db !== 'object' || Array.isArray(db)) db = {};
    if (!Array.isArray(db.employees)) db.employees = [];
    if (!Array.isArray(db.departments)) db.departments = [];
    if (!Array.isArray(db.holidays)) db.holidays = DEF_HOL.slice();
    if (typeof db.useHolidays !== 'boolean') db.useHolidays = false;
    if (!db.baseLeaveDays) db.baseLeaveDays = 24;
    if (!db.company || typeof db.company !== 'object') db.company = { name: '', edrpou: '', city: '', director: '' };
    if (!db.meta || typeof db.meta !== 'object') db.meta = { created: new Date().toISOString().slice(0, 10) };
    return db;
  }

  (function repairOnLoad() {
    try {
      const raw = localStorage.getItem(HR_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const fixed = ensureShape(parsed);
      if (JSON.stringify(fixed) !== JSON.stringify(parsed)) {
        localStorage.setItem(HR_KEY, JSON.stringify(fixed));
      }
    } catch (e) { /* ігноруємо */ }
  })();

  async function sessionOk() {
    const c = client();
    if (!c || !c.auth) return false;
    try {
      const { data } = await c.auth.getSession();
      return !!(data && data.session);
    } catch (e) { return false; }
  }

  function readDB() {
    try {
      const db = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      return ensureShape(db && typeof db === 'object' ? db : {});
    } catch (e) { return ensureShape({}); }
  }
  function readLocal() {
    const db = readDB();
    return Array.isArray(db.employees) ? db.employees : [];
  }
  function writeLocal(list) {
    try {
      const db = readDB();
      db.employees = list;
      localStorage.setItem(HR_KEY, JSON.stringify(db));
      return true;
    } catch (e) { return false; }
  }

  function cloudIdOf(e) {
    if (isUuid(e.cloudId)) return e.cloudId;
    if (isUuid(e.id)) return e.id;
    return null;
  }
  function legacyOf(row) {
    const md = row.metadata || {};
    return md.legacyId || null;
  }
  function samePerson(local, row) {
    const cid = cloudIdOf(local);
    if (cid && cid === row.id) return true;
    const lg = legacyOf(row);
    if (lg && String(lg) === String(local.id)) return true;
    const a = norm(local.fullName), b = norm(row.full_name || row.fullName);
    return !!a && a === b;
  }

  function mergeFromCloud(local, row) {
    const md = row.metadata || {};
    const before = JSON.stringify([local.fullName, local.position, local.department, local.hireDate, local.status]);
    local.cloudId = row.id;
    local.fullName = row.full_name || row.fullName || local.fullName || '';
    local.position = row.position || '';
    local.department = md.departmentName || row.department_name || local.department || '';
    local.departmentId = row.department_id || local.departmentId || null;
    local.hireDate = row.hire_date || local.hireDate || '';
    local.birthDate = row.birth_date || local.birthDate || '';
    local.category = row.category || local.category || 'standard';
    local.status = row.status || local.status || 'active';
    if (!Array.isArray(local.leaves)) local.leaves = [];
    if (!Array.isArray(local.payments)) local.payments = [];
    if (!Array.isArray(local.sickLeaves)) local.sickLeaves = [];
    if (!Array.isArray(local.unpaidPeriods)) local.unpaidPeriods = [];
    if (!Array.isArray(local.parentalPeriods)) local.parentalPeriods = [];
    const after = JSON.stringify([local.fullName, local.position, local.department, local.hireDate, local.status]);
    return before !== after;
  }

  function localFromCloud(row) {
    const e = {
      id: legacyOf(row) || row.id,
      cloudId: row.id,
      fullName: '', position: '', department: '', departmentId: null,
      hireDate: '', birthDate: '', category: 'standard', status: 'active',
      leaves: [], payments: [], sickLeaves: [], unpaidPeriods: [], parentalPeriods: [],
      projectIds: [], contract: {}, reservation: {}, personalData: {},
      createdAt: row.created_at || new Date().toISOString()
    };
    mergeFromCloud(e, row);
    return e;
  }

  function pill() {
    let el = document.getElementById('nexus-hr-bridge');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nexus-hr-bridge';
    el.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99998;display:none;align-items:center;gap:10px;' +
      'padding:10px 14px;border-radius:12px;font:600 12.5px/1.35 system-ui,sans-serif;' +
      'background:linear-gradient(135deg,#141E36,#0F1628);color:#E8EDFB;border:1px solid rgba(34,211,238,.45);' +
      'box-shadow:0 18px 40px -18px rgba(0,0,0,.8);cursor:pointer;max-width:min(360px,calc(100vw - 32px))';
    el.addEventListener('click', () => location.reload());
    document.body.appendChild(el);
    return el;
  }
  function showPill(text, color) {
    const el = pill();
    el.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + color + '"></span>' +
      '<span style="flex:1">' + text + '</span>' +
      '<span style="opacity:.65;font-size:11px">↻</span>';
    el.style.display = 'flex';
  }
  function hidePill() { const el = document.getElementById('nexus-hr-bridge'); if (el) el.style.display = 'none'; }

  function warnOnce(msg) {
    if (warned) return;
    warned = true;
    console.warn('[NEXUS HR]', msg);
    if (window.NexusCore && NexusCore.notify) {
      try { NexusCore.notify(msg, 'error'); return; } catch (e) {}
    }
    showPill(msg, '#FF3B47');
  }

  async function sync() {
    if (busy) return;
    const d = api();
    if (!d || typeof d.listEmployees !== 'function') return;
    if (!(await sessionOk())) return;

    busy = true;
    try {
      const cloudRows = await d.listEmployees();
      if (!Array.isArray(cloudRows)) return;

      const local = readLocal();
      let changed = false, added = 0;

      cloudRows.forEach(row => {
        const hit = local.find(e => samePerson(e, row));
        if (hit) {
          if (mergeFromCloud(hit, row)) changed = true;
        } else {
          local.push(localFromCloud(row));
          added++; changed = true;
        }
      });

      const orphans = local.filter(e => !cloudRows.some(row => samePerson(e, row)));
      let pushed = 0;
      for (const e of orphans) {
        if (!e || !e.fullName) continue;
        try {
          await d.upsertEmployee(e);
          pushed++;
        } catch (err) {
          warnOnce('Не вдалося надіслати «' + e.fullName + '» у базу: ' + (err && err.message || err));
        }
      }

      if (changed) writeLocal(local);
      pendingCount = added + pushed;

      if (added > 0) {
        showPill(added + ' нових записів із бази — натисніть, щоб оновити сторінку', '#22D3EE');
      } else if (pushed > 0) {
        showPill(pushed + ' записів надіслано в базу', '#7CFF4F');
        setTimeout(hidePill, 4000);
      }
    } catch (err) {
      warnOnce('Синхронізація кадрів недоступна: ' + (err && err.message || err));
    } finally {
      busy = false;
    }
  }

  function start() {
    if (timer) return;
    sync();
    timer = setInterval(sync, PERIOD);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    window.addEventListener('focus', sync);
    if (client() && client().auth && typeof client().auth.onAuthStateChange === 'function') {
      try {
        client().auth.onAuthStateChange((_e, s) => { if (s) setTimeout(sync, 400); });
      } catch (e) {}
    }
  }

  window.NexusHRBridge = { sync, stop() { if (timer) clearInterval(timer); timer = null; } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 900));
  } else {
    setTimeout(start, 900);
  }
})();
