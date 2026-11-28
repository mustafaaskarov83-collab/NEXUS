/* NEXUS — HR cloud bridge v2.0
 * Supabase = єдине джерело даних для співробітників і відділів у модулі HR.
 * localStorage лишається лише кешем. Підключається в hr.html ДО app.js.
 *
 * Що робить (кожні 8 с, при поверненні на вкладку і після входу):
 *  1. тягне з бази відділи та співробітників (з відпустками, виплатами, лікарняними);
 *  2. оновлює локальний кеш і одразу перемальовує екран (App.reloadFromStorage);
 *  3. не чіпає запис, у якому є незбережені локальні зміни (замість цього надсилає його в базу);
 *  4. запис, який інший користувач видалив у базі, прибирає й з кешу;
 *  5. нові локальні записи з UUID надсилає в базу.
 * Скани договорів у базу не потрапляють (лишаються в браузері до переходу на Storage).
 */
(() => {
  'use strict';

  const HR_KEY = 'nexus_hr_ua_v2';
  const SEEN_KEY = 'nexus_hr_cloud_seen_v1';
  const PERIOD = 8000;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const DEF_HOL = ['01-01', '03-08', '05-01', '05-09', '06-28', '07-15', '08-24', '10-01', '12-25'];

  let timer = null, busy = false, warned = false, firstDone = false;

  const client = () => window.nexusSupabase || window.supabaseClient || null;
  const api = () => window.nexusData || null;
  const isUuid = v => UUID_RE.test(String(v || ''));
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const isEmpty = o => !o || typeof o !== 'object' || Object.keys(o).length === 0;
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const uiBusy = () => !!document.querySelector('#emp-modal.open,#dep-modal.open,#emp-form-modal.open,#user-modal.open');
  const appPending = () => !!(window.App && typeof App.hasPendingSync === 'function' && App.hasPendingSync());

  /* Детермінований JSON — для порівняння «було / стало» без залежності від порядку ключів */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    }
    const s = JSON.stringify(v);
    return s === undefined ? 'null' : s;
  }

  /* ── структура локальної бази ── */
  function ensureShape(db) {
    if (!db || typeof db !== 'object' || Array.isArray(db)) db = {};
    if (!Array.isArray(db.employees)) db.employees = [];
    if (!Array.isArray(db.departments)) db.departments = [];
    if (!Array.isArray(db.holidays)) db.holidays = DEF_HOL.slice();
    if (typeof db.useHolidays !== 'boolean') db.useHolidays = false;
    if (!db.baseLeaveDays) db.baseLeaveDays = 24;
    if (!db.company || typeof db.company !== 'object') db.company = { name: '', edrpou: '', city: '', director: '' };
    if (!db.meta || typeof db.meta !== 'object') db.meta = { created: todayStr() };
    return db;
  }

  /* Виконується при завантаженні скрипта — ще до app.js — і лікує зіпсовану базу */
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

  function readDB() {
    try { return ensureShape(JSON.parse(localStorage.getItem(HR_KEY) || '{}')); }
    catch (e) { return ensureShape({}); }
  }
  function writeDB(db) {
    try { localStorage.setItem(HR_KEY, JSON.stringify(db)); return true; }
    catch (e) { return false; }
  }
  function readSeen() {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function writeSeen(set) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* ігноруємо */ }
  }

  async function sessionOk() {
    const c = client();
    if (!c || !c.auth) return false;
    try {
      const { data } = await c.auth.getSession();
      return !!(data && data.session);
    } catch (e) { return false; }
  }

  /* ── відображення «рядок бази → запис додатка» ── */
  function fromCloud(row) {
    const md = row.metadata || {};
    return {
      id: row.id,
      fullName: row.full_name || '',
      position: row.position || '',
      departmentId: row.department_id || '',
      hireDate: row.hire_date || '',
      birthDate: row.birth_date || '',
      category: row.category || 'standard',
      status: row.status || 'active',
      baseLeaveDays: md.baseLeaveDays != null ? (Number(md.baseLeaveDays) || 24) : null,
      insuranceYears: md.insuranceYears != null ? (Number(md.insuranceYears) || 0) : null,
      projectIds: Array.isArray(md.projectIds) ? md.projectIds : [],
      contract: row.contract && typeof row.contract === 'object' ? row.contract : {},
      reservation: row.reservation && typeof row.reservation === 'object' ? row.reservation : {},
      personalData: row.personal_data && typeof row.personal_data === 'object' ? row.personal_data : {},
      metadata: md,
      leaves: Array.isArray(row.leaves) ? row.leaves : [],
      payments: Array.isArray(row.payments) ? row.payments : [],
      unpaidPeriods: Array.isArray(row.unpaidPeriods) ? row.unpaidPeriods : [],
      parentalPeriods: Array.isArray(row.parentalPeriods) ? row.parentalPeriods : [],
      sickLeaves: Array.isArray(row.sickLeaves) ? row.sickLeaves : []
    };
  }

  /* Скан договору живе лише в браузері: якщо локально є файл — залишаємо його */
  function mergeContract(cloudContract, localContract) {
    const out = Object.assign({}, cloudContract || {});
    const ls = localContract && localContract.scan;
    if (ls && ls.data) out.scan = ls;
    else if (!('scan' in out)) out.scan = null;
    return out;
  }

  function newFromCloud(row) {
    const e = fromCloud(row);
    if (e.baseLeaveDays == null) e.baseLeaveDays = 24;
    if (e.insuranceYears == null) e.insuranceYears = 0;
    e.contract = mergeContract(e.contract, null);
    e.createdAt = todayStr();
    return e;
  }

  function applyCloud(local, m) {
    if (!isUuid(local.id)) { local.legacyId = local.id; local.id = m.id; }
    local.fullName = m.fullName;
    local.position = m.position;
    local.departmentId = m.departmentId;
    local.hireDate = m.hireDate;
    local.birthDate = m.birthDate;
    local.category = m.category;
    local.status = m.status;
    if (m.baseLeaveDays != null) local.baseLeaveDays = m.baseLeaveDays;
    if (m.insuranceYears != null) local.insuranceYears = m.insuranceYears;
    local.projectIds = m.projectIds;
    local.contract = mergeContract(m.contract, local.contract);
    local.reservation = isEmpty(m.reservation) ? (local.reservation || {}) : m.reservation;
    local.personalData = m.personalData;
    local.metadata = m.metadata;
    local.leaves = m.leaves;
    local.payments = m.payments;
    local.unpaidPeriods = m.unpaidPeriods;
    local.parentalPeriods = m.parentalPeriods;
    local.sickLeaves = m.sickLeaves;
  }

  function findLocal(list, row) {
    return list.find(e => e.id === row.id)
      || list.find(e => e.cloudId === row.id)
      || list.find(e => !isUuid(e.id) && norm(e.fullName) && norm(e.fullName) === norm(row.full_name));
  }

  /* Чи є в локальному записі щось, чого ще немає в базі (тоді базу не перезаписуємо) */
  function localAhead(local, m) {
    const missing = (loc, cld, key) => {
      const set = new Set((cld || []).map(key));
      return (loc || []).some(x => !set.has(key(x)));
    };
    const byId = x => String(x.id);
    const byPer = x => x.start + '|' + x.end;
    const byPay = x => x.year + '-' + x.month;
    if (missing(local.leaves, m.leaves, byId) || missing(local.sickLeaves, m.sickLeaves, byId)) return true;
    if (missing(local.unpaidPeriods, m.unpaidPeriods, byPer) || missing(local.parentalPeriods, m.parentalPeriods, byPer)) return true;
    const cp = new Map((m.payments || []).map(p => [byPay(p), Number(p.amount) || 0]));
    if ((local.payments || []).some(p => !cp.has(byPay(p)) || cp.get(byPay(p)) !== (Number(p.amount) || 0))) return true;
    if (!m.position && local.position) return true;
    if (!m.hireDate && local.hireDate) return true;
    if (!m.departmentId && local.departmentId) return true;
    const lc = local.contract || {};
    if (isEmpty(m.contract) && (lc.number || lc.signedAt)) return true;
    const lr = local.reservation || {};
    if (isEmpty(m.reservation) && lr.status && lr.status !== 'none') return true;
    return false;
  }

  /* ── відділи ── */
  function remapDepartment(db, from, to) {
    db.departments.forEach(d => { if (d.parentId === from) d.parentId = to; });
    db.employees.forEach(e => { if (e.departmentId === from) e.departmentId = to; });
  }
  function mergeDepartments(db, cloudDeps) {
    cloudDeps.forEach(c => {
      let l = db.departments.find(x => x.id === c.id)
        || db.departments.find(x => norm(x.code) && norm(x.code) === norm(c.code));
      if (!l) {
        db.departments.push({
          id: c.id, code: c.code || '', name: c.name || '',
          parentId: c.parent_id || null, branchId: c.branch_id || null,
          managerEmployeeId: c.manager_employee_id || null,
          isActive: c.is_active !== false,
          createdAt: todayStr(), updatedAt: todayStr()
        });
        return;
      }
      if (l.id !== c.id) { remapDepartment(db, l.id, c.id); l.id = c.id; }
      l.code = c.code || l.code;
      l.name = c.name || l.name;
      l.parentId = c.parent_id || null;
      l.branchId = c.branch_id || null;
      l.isActive = c.is_active !== false;
      if (Object.prototype.hasOwnProperty.call(c, 'manager_employee_id')) {
        l.managerEmployeeId = c.manager_employee_id || null;
      }
    });
  }

  /* ── індикатор ── */
  function pill() {
    let el = document.getElementById('nexus-hr-bridge');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nexus-hr-bridge';
    el.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99998;display:none;align-items:center;gap:10px;' +
      'padding:10px 14px;border-radius:12px;font:600 12.5px/1.35 system-ui,sans-serif;' +
      'background:linear-gradient(135deg,#141E36,#0F1628);color:#E8EDFB;border:1px solid rgba(34,211,238,.45);' +
      'box-shadow:0 18px 40px -18px rgba(0,0,0,.8);cursor:pointer;max-width:min(360px,calc(100vw - 32px))';
    el.addEventListener('click', () => { el.style.display = 'none'; });
    document.body.appendChild(el);
    return el;
  }
  function showPill(text, color, ms) {
    const el = pill();
    el.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + color + '"></span>' +
      '<span style="flex:1">' + text + '</span>';
    el.style.display = 'flex';
    if (ms) setTimeout(() => { el.style.display = 'none'; }, ms);
  }
  function warnOnce(msg) {
    if (warned) return;
    warned = true;
    console.warn('[NEXUS HR]', msg);
    showPill(msg, '#FF3B47', 8000);
  }

  /* ── основний цикл ── */
  async function sync() {
    if (busy) return;
    const d = api();
    if (!d || typeof d.listEmployees !== 'function') return;
    if (!(await sessionOk())) return;
    if (uiBusy() || appPending()) return;

    busy = true;
    try {
      const [cloudEmps, cloudDeps] = await Promise.all([
        d.listEmployees(),
        typeof d.listDepartments === 'function' ? d.listDepartments() : Promise.resolve([])
      ]);
      if (!Array.isArray(cloudEmps)) return;
      /* за час запиту користувач міг відкрити форму або щось змінити */
      if (uiBusy() || appPending()) return;
      const deps = Array.isArray(cloudDeps) ? cloudDeps : [];

      const db = readDB();
      const before = stable([db.employees, db.departments]);
      const seen = readSeen();
      const cloudIds = new Set(cloudEmps.map(r => r.id));
      const cloudDepIds = new Set(deps.map(x => x.id));

      mergeDepartments(db, deps);

      const matched = new Set();
      const ahead = [];
      cloudEmps.forEach(row => {
        seen.add(row.id);
        const m = fromCloud(row);
        const local = findLocal(db.employees, row);
        if (!local) { db.employees.push(newFromCloud(row)); return; }
        matched.add(local);
        if (localAhead(local, m)) { ahead.push(local); return; }
        applyCloud(local, m);
      });

      /* локальні записи без пари в базі: або видалені іншим користувачем, або нові */
      const orphans = [];
      db.employees = db.employees.filter(e => {
        if (matched.has(e) || cloudIds.has(e.id)) return true;
        if (cloudEmps.length > 0 && seen.has(e.id)) return false; /* видалено в базі */
        orphans.push(e);
        return true;
      });

      writeSeen(seen);
      const changed = before !== stable([db.employees, db.departments]);
      if (changed) writeDB(db);
      if ((changed || !firstDone) && window.App && typeof App.reloadFromStorage === 'function') {
        App.reloadFromStorage();
      }
      firstDone = true;

      /* надсилаємо в базу те, чого там ще немає (тільки записи з UUID) */
      const toSend = ahead.concat(orphans).filter(e => isUuid(e.id) && e.fullName);
      let pushed = 0;
      for (const e of toSend) {
        try {
          if (e.departmentId && !cloudDepIds.has(e.departmentId) && typeof d.upsertDepartment === 'function') {
            const ld = db.departments.find(x => x.id === e.departmentId);
            if (ld && isUuid(ld.id)) {
              await d.upsertDepartment({
                id: ld.id, name: ld.name, code: ld.code,
                parentId: isUuid(ld.parentId) ? ld.parentId : null, branchId: null
              });
              cloudDepIds.add(ld.id);
            }
          }
          await d.upsertEmployee(Object.assign({}, e, {
            departmentId: cloudDepIds.has(e.departmentId) ? e.departmentId : null
          }));
          seen.add(e.id);
          pushed++;
        } catch (err) {
          warnOnce('Не вдалося надіслати «' + e.fullName + '» у базу: ' + (err && err.message || err));
        }
      }
      if (pushed > 0) {
        writeSeen(seen);
        showPill(pushed + ' записів надіслано в базу', '#7CFF4F', 4000);
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
      } catch (e) { /* ігноруємо */ }
    }
  }

  window.NexusHRBridge = { sync, stop() { if (timer) clearInterval(timer); timer = null; } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 900));
  } else {
    setTimeout(start, 900);
  }
})();
