/* NEXUS ENGENEERING — Авто і витрата палива v1.0 */
const Fleet = (() => {
  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const FLEET_KEY = 'nexus_fleet_v1';
  const DOC_KEY = 'nexus_documents_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let db = loadDB();
  let editingVehId = null;
  let editingFuelId = null;

  const FUEL_TYPES = {
    petrol: '⛽ Бензин', diesel: '🛢 Дизель', gas: '🔥 Газ',
    hybrid: '🔋 Гібрид', electric: '⚡ Електро'
  };
  const STATUSES = {
    active: { name: 'В роботі', cls: 'bg-g' },
    repair: { name: 'На ремонті', cls: 'bg-o' },
    idle: { name: 'Простій', cls: 'bg-b' },
    sold: { name: 'Продано / списано', cls: 'bg-gr' }
  };
  const VEH_TYPES = {
    passenger: 'Легковий',
    cargo: 'Вантажний',
    van: 'Фургон / мікроавтобус',
    bus: 'Автобус',
    special: 'Спецтехніка',
    moto: 'Мото / квадро',
    trailer: 'Причіп / напівпричіп',
    other: 'Інше'
  };
  function vehTitle(v) {
    if (!v) return '—';
    const parts = [v.make, v.model].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return v.model || '—';
  }
  function nextVehicleInv() {
    let max = 0;
    const re = /^інв_авт_(\d+)$/i;
    (db.vehicles || []).forEach(v => {
      const m = String(v.invNumber || '').trim().match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    });
    const next = max + 1;
    return 'інв_авт_' + String(next).padStart(7, '0');
  }
  const OWN_TYPES = {
    own: 'Власне',
    leasing: 'Лізинг',
    rent: 'Оренда',
    other: 'Інше'
  };
  function insuranceStatus(v) {
    if (!v || !v.insuranceTo) return null;
    const d = String(v.insuranceTo).slice(0, 10);
    if (d < today()) return { text: 'Страховка прострочена', cls: 'bg-r' };
    const t0 = new Date(today() + 'T00:00:00');
    const t1 = new Date(d + 'T00:00:00');
    const days = (t1 - t0) / 86400000;
    if (days <= 30) return { text: 'Страховка до ' + fD(d), cls: 'bg-o' };
    return { text: 'Страховка до ' + fD(d), cls: 'bg-g' };
  }

  function loadDB() {
    try {
      const r = localStorage.getItem(FLEET_KEY);
      if (r) {
        const p = JSON.parse(r);
        if (p && Array.isArray(p.vehicles)) {
          if (!Array.isArray(p.fuel)) p.fuel = [];
          if (!Array.isArray(p.cards)) p.cards = [];
          if (!Array.isArray(p.service)) p.service = [];
          return p;
        }
      }
    } catch (e) {}
    return { vehicles: [], fuel: [], cards: [], service: [], meta: { version: '1.0', created: new Date().toISOString().slice(0, 10) } };
  }
  function saveDB() {
    try { localStorage.setItem(FLEET_KEY, JSON.stringify(db)); } catch (e) {}
  }
  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function getPeriod() {
    const from = document.getElementById('period-from')?.value || '';
    const to = document.getElementById('period-to')?.value || '';
    return { from, to };
  }
  function inPeriod(dateStr) {
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    const { from, to } = getPeriod();
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  function updatePeriodLabel() {
    const el = document.getElementById('period-label');
    if (!el) return;
    const { from, to } = getPeriod();
    if (!from && !to) el.textContent = 'Фільтр періоду: увесь час';
    else el.textContent = 'Фільтр періоду: ' + (from ? fD(from) : '…') + ' — ' + (to ? fD(to) : '…');
  }
  function applyPeriod() {
    updatePeriodLabel();
    renderStats();
    renderVehicles();
    renderFuel();
    renderService();
    renderUnlinkedFuelBanner();
  }
  function setPeriodMonth() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const from = y + '-' + m + '-01';
    const last = new Date(y, d.getMonth() + 1, 0).getDate();
    const to = y + '-' + m + '-' + String(last).padStart(2, '0');
    const a = document.getElementById('period-from');
    const b = document.getElementById('period-to');
    if (a) a.value = from;
    if (b) b.value = to;
    applyPeriod();
  }
  function setPeriodAll() {
    const a = document.getElementById('period-from');
    const b = document.getElementById('period-to');
    if (a) a.value = '';
    if (b) b.value = '';
    applyPeriod();
  }
  function fD(s) {
    if (!s) return '—';
    const p = String(s).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }
  function fN(n) {
    return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) { return null; }
  }
  function getEmployees() {
    try {
      const h = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      return (h.employees || []).slice().sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'uk'));
    } catch (e) { return []; }
  }
  function getContracts() {
    try {
      const d = JSON.parse(localStorage.getItem(DOC_KEY) || '{}');
      const docs = d.docs || d.documents || [];
      return docs.filter(x => x.type === 'contract')
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    } catch (e) { return []; }
  }
  function contractLabel(id) {
    if (!id) return '—';
    const c = getContracts().find(x => x.id === id);
    if (!c) return '—';
    const num = c.num || c.number || '';
    const name = c.name || 'Договір';
    return (num ? (num + ' — ') : '') + name;
  }
  function canEdit() {
    const u = getCurrentUser();
    return !!u && u.role !== 'viewer';
  }
  function denyEdit() {
    alert('Недостатньо прав: роль «Перегляд» не дозволяє змінювати дані.');
    return false;
  }
  function vehById(id) {
    return (db.vehicles || []).find(v => v.id === id) || null;
  }
  function empName(id) {
    if (!id) return '—';
    const e = getEmployees().find(x => x.id === id);
    return e ? e.fullName : '—';
  }

  function initAuth() {
    const user = getCurrentUser();
    if (!user) {
      try { sessionStorage.setItem('nexus_redirect_after_login', 'fleet.html'); } catch (e) {}
      location.href = 'index.html';
      return false;
    }
    const auth = document.getElementById('auth-ov');
    const app = document.getElementById('app');
    if (auth) auth.classList.add('hidden');
    if (app) app.classList.add('vis');
    const av = document.getElementById('av');
    const hun = document.getElementById('hun');
    const hur = document.getElementById('hur');
    const initials = (user.fullName || user.username).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    if (av) av.textContent = initials;
    if (hun) hun.textContent = user.fullName || user.username;
    if (hur) hur.textContent = roleMap[user.role] || user.role;
    return true;
  }
  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    location.href = 'index.html';
  }

  function initTheme() {
    let current = localStorage.getItem(THEME_KEY) || 'auto';
    const btn = document.querySelector('.theme-btn');
    const update = () => {
      document.documentElement.setAttribute('data-theme', current);
      if (btn) btn.textContent = ({ light: '☀️', dark: '🌙', auto: '🌗' })[current] || '🌗';
    };
    update();
    if (btn) btn.onclick = () => {
      const modes = ['light', 'dark', 'auto'];
      current = modes[(modes.indexOf(current) + 1) % 3];
      localStorage.setItem(THEME_KEY, current);
      update();
    };
  }

  function initTabs() {
    document.querySelectorAll('.nb').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.nb').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const tab = b.dataset.tab;
        const veh = document.getElementById('tab-vehicles');
        const fuel = document.getElementById('tab-fuel');
        const cards = document.getElementById('tab-cards');
        const svc = document.getElementById('tab-service');
        if (veh) veh.style.display = tab === 'vehicles' ? '' : 'none';
        if (fuel) fuel.style.display = tab === 'fuel' ? '' : 'none';
        if (cards) cards.style.display = tab === 'cards' ? '' : 'none';
        if (svc) svc.style.display = tab === 'service' ? '' : 'none';
        if (tab === 'fuel') {
          fillVehicleSelects();
          renderFuel();
        }
        if (tab === 'cards') {
          fillCardSelects();
          renderCards();
        }
        if (tab === 'service') {
          fillServiceSelects();
          renderService();
        }
      });
    });
  }

  function fillEmployeeSelect() {
    const sel = document.getElementById('v-emp');
    if (!sel) return;
    const cur = sel.value;
    const emps = getEmployees();
    sel.innerHTML = '<option value="">— не закріплено —</option>' +
      emps.map(e => '<option value="' + esc(e.id) + '">' + esc(e.fullName) + '</option>').join('');
    if (cur) sel.value = cur;
  }

  function fillVehicleSelects() {
    const opts = '<option value="">— оберіть авто —</option>' +
      (db.vehicles || []).filter(v => v.status !== 'sold')
        .map(v => '<option value="' + esc(v.id) + '">' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('');
    const filterOpts = '<option value="">Усі авто</option>' +
      (db.vehicles || []).map(v => '<option value="' + esc(v.id) + '">' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('');
    const fv = document.getElementById('f-vehicle');
    const ff = document.getElementById('fuel-filter-veh');
    if (fv) {
      const cur = fv.value;
      fv.innerHTML = opts;
      if (cur) fv.value = cur;
    }
    if (ff) {
      const cur = ff.value;
      ff.innerHTML = filterOpts;
      if (cur) ff.value = cur;
    }
  }

  function renderStats() {
    const el = document.getElementById('stats');
    if (!el) return;
    const vehs = db.vehicles || [];
    const fuel = db.fuel || [];
    const active = vehs.filter(v => v.status === 'active').length;
    const month = today().slice(0, 7);
    const monthFuel = fuel.filter(f => (f.date || '').startsWith(month));
    const liters = monthFuel.reduce((s, f) => s + (Number(f.liters) || 0), 0);
    const cost = monthFuel.reduce((s, f) => s + (Number(f.cost) || 0), 0);
    el.innerHTML =
      '<div class="sc"><div class="scl">АВТО В ПАРКУ</div><div class="scv scv-b">' + vehs.length + '</div></div>' +
      '<div class="sc"><div class="scl">В РОБОТІ</div><div class="scv scv-g">' + active + '</div></div>' +
      '<div class="sc"><div class="scl">ПАЛИВО ЗА МІСЯЦЬ</div><div class="scv scv-o">' + fN(liters) + ' л</div></div>' +
      '<div class="sc"><div class="scl">ВИТРАТИ ЗА МІСЯЦЬ</div><div class="scv">' + fN(cost) + ' ₴</div></div>';
  }

  /* --- Vehicles --- */
  function openVehicleForm() {
    if (!canEdit()) return denyEdit();
    resetVehicle();
    fillEmployeeSelect();
    const m = document.getElementById('veh-form-modal');
    if (m) m.classList.add('open');
  }
  function closeVehicleForm() {
    const m = document.getElementById('veh-form-modal');
    if (m) m.classList.remove('open');
    resetVehicle();
  }
  function toggleVehForm() { openVehicleForm(); }

  function resetVehicle() {
    editingVehId = null;
    ['v-plate', 'v-make', 'v-model', 'v-vin', 'v-color', 'v-notes', 'v-engine', 'v-consumption', 'v-reg-date', 'v-inv', 'v-value', 'v-insurance-to', 'v-policy-series', 'v-policy-number', 'v-tech-until'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const y = document.getElementById('v-year'); if (y) y.value = '';
    const o = document.getElementById('v-odometer'); if (o) o.value = '0';
    const f = document.getElementById('v-fuel'); if (f) f.value = 'petrol';
    const s = document.getElementById('v-status'); if (s) s.value = 'active';
    const e = document.getElementById('v-emp'); if (e) e.value = '';
    const tit = document.getElementById('veh-form-title'); if (tit) tit.textContent = 'Додати автомобіль';
    const bs = document.getElementById('veh-btn-save'); if (bs) bs.textContent = 'Додати автомобіль';
  }

  function saveVehicle() {
    if (!canEdit()) return denyEdit();
    const plate = (document.getElementById('v-plate')?.value || '').trim().toUpperCase();
    const make = (document.getElementById('v-make')?.value || '').trim();
    const model = (document.getElementById('v-model')?.value || '').trim();
    if (!plate) { alert('Вкажіть державний номер'); return; }
    if (!make) { alert('Вкажіть марку'); return; }
    if (!model) { alert('Вкажіть модель'); return; }
    const plateNorm = plate.replace(/\s+/g, '').toUpperCase();
    const dupPlate = (db.vehicles || []).find(x => x.id !== editingVehId && String(x.plate || '').replace(/\s+/g, '').toUpperCase() === plateNorm);
    if (dupPlate) { alert('Авто з номером «' + plate + '» вже є в автопарку'); return; }
    const vinRaw = (document.getElementById('v-vin')?.value || '').trim().toUpperCase();
    if (vinRaw) {
      const dupVin = (db.vehicles || []).find(x => x.id !== editingVehId && String(x.vin || '').replace(/\s+/g, '').toUpperCase() === vinRaw.replace(/\s+/g, ''));
      if (dupVin) { alert('Авто з таким VIN вже є: ' + (dupVin.plate || '')); return; }
    }
    const item = {
      id: editingVehId || uid('veh'),
      plate,
      make,
      model,
      vehicleType: document.getElementById('v-type')?.value || 'passenger',
      year: Number(document.getElementById('v-year')?.value) || null,
      fuelType: document.getElementById('v-fuel')?.value || 'petrol',
      status: document.getElementById('v-status')?.value || 'active',
      employeeId: document.getElementById('v-emp')?.value || '',
      odometer: Number(document.getElementById('v-odometer')?.value) || 0,
      vin: (document.getElementById('v-vin')?.value || '').trim().toUpperCase(),
      color: (document.getElementById('v-color')?.value || '').trim(),
      engineVolume: (function(){ const v = document.getElementById('v-engine')?.value; return v === '' || v == null ? null : Number(v); })(),
      consumption: (function(){ const v = document.getElementById('v-consumption')?.value; return v === '' || v == null ? null : Number(v); })(),
      regDate: document.getElementById('v-reg-date')?.value || '',
      ownership: document.getElementById('v-ownership')?.value || 'own',
      invNumber: editingVehId
        ? ((document.getElementById('v-inv')?.value || '').trim() || nextVehicleInv())
        : nextVehicleInv(),
      bookValue: (function(){ const v = document.getElementById('v-value')?.value; return v === '' || v == null ? null : Number(v); })(),
      insuranceTo: document.getElementById('v-insurance-to')?.value || '',
      policySeries: (document.getElementById('v-policy-series')?.value || '').trim(),
      policyNumber: (document.getElementById('v-policy-number')?.value || '').trim(),
      winterTires: document.getElementById('v-winter-tires')?.value || 'no',
      techInspection: document.getElementById('v-tech-inspection')?.value || 'no',
      techUntil: document.getElementById('v-tech-until')?.value || '',
      notes: (document.getElementById('v-notes')?.value || '').trim(),
      updatedAt: today()
    };
    if (editingVehId) {
      const i = db.vehicles.findIndex(x => x.id === editingVehId);
      if (i >= 0) {
        item.createdAt = db.vehicles[i].createdAt || today();
        db.vehicles[i] = item;
      }
      alert('Автомобіль оновлено');
    } else {
      item.createdAt = today();
      db.vehicles.push(item);
      alert('Автомобіль додано');
    }
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit(editingVehId ? 'fleet.vehicle.update' : 'fleet.vehicle.create', 'vehicle', { id: item.id, plate: item.plate });
    closeVehicleForm();
    renderVehicles();
    fillVehicleSelects();
    renderStats();
  }

  function editVehicle(id) {
    if (!canEdit()) return denyEdit();
    const v = vehById(id);
    if (!v) return;
    editingVehId = id;
    document.getElementById('v-plate').value = v.plate || '';
    if (v.make) {
      document.getElementById('v-make').value = v.make || '';
      document.getElementById('v-model').value = v.model || '';
    } else {
      // старі записи: все було в model
      const full = (v.model || '').trim();
      const sp = full.indexOf(' ');
      if (sp > 0) {
        document.getElementById('v-make').value = full.slice(0, sp);
        document.getElementById('v-model').value = full.slice(sp + 1);
      } else {
        document.getElementById('v-make').value = full;
        document.getElementById('v-model').value = '';
      }
    }
    const typeEl = document.getElementById('v-type'); if (typeEl) typeEl.value = v.vehicleType || 'passenger';
    document.getElementById('v-year').value = v.year || '';
    document.getElementById('v-fuel').value = v.fuelType || 'petrol';
    document.getElementById('v-status').value = v.status || 'active';
    document.getElementById('v-emp').value = v.employeeId || '';
    document.getElementById('v-odometer').value = v.odometer || 0;
    const vinEl = document.getElementById('v-vin'); if (vinEl) vinEl.value = v.vin || '';
    const colEl = document.getElementById('v-color'); if (colEl) colEl.value = v.color || '';
    const engEl = document.getElementById('v-engine'); if (engEl) engEl.value = v.engineVolume != null ? v.engineVolume : '';
    const consEl = document.getElementById('v-consumption'); if (consEl) consEl.value = v.consumption != null ? v.consumption : '';
    const rd = document.getElementById('v-reg-date'); if (rd) rd.value = v.regDate || '';
    const ow = document.getElementById('v-ownership'); if (ow) ow.value = v.ownership || 'own';
    const inv = document.getElementById('v-inv'); if (inv) inv.value = v.invNumber || '';
    const bv = document.getElementById('v-value'); if (bv) bv.value = v.bookValue != null ? v.bookValue : '';
    const ins = document.getElementById('v-insurance-to'); if (ins) ins.value = v.insuranceTo || '';
    const ps = document.getElementById('v-policy-series'); if (ps) ps.value = v.policySeries || '';
    const pn = document.getElementById('v-policy-number'); if (pn) pn.value = v.policyNumber || '';
    const wt = document.getElementById('v-winter-tires'); if (wt) wt.value = v.winterTires === 'yes' ? 'yes' : 'no';
    const ti = document.getElementById('v-tech-inspection'); if (ti) ti.value = v.techInspection === 'yes' ? 'yes' : 'no';
    const tu = document.getElementById('v-tech-until'); if (tu) tu.value = v.techUntil || '';
    document.getElementById('v-notes').value = v.notes || '';
    document.getElementById('veh-form-title').textContent = 'Редагувати автомобіль';
    document.getElementById('veh-btn-save').textContent = 'Зберегти';
    fillEmployeeSelect();
    const m = document.getElementById('veh-form-modal');
    if (m) m.classList.add('open');
  }

  function delVehicle(id) {
    if (!canEdit()) return denyEdit();
    const v = vehById(id);
    if (!v) return;
    if (!confirm('Видалити авто «' + v.plate + '» разом із заправками та сервісом по ньому?')) return;
    db.vehicles = db.vehicles.filter(x => x.id !== id);
    db.fuel = (db.fuel || []).filter(f => f.vehicleId !== id);
    db.service = (db.service || []).filter(s => s.vehicleId !== id);
    (db.cards || []).forEach(c => {
      if (c.vehicleId === id) { c.vehicleId = ''; c.updatedAt = today(); }
    });
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('fleet.vehicle.delete', 'vehicle', { id, plate: v.plate });
    renderVehicles();
    fillVehicleSelects();
    renderFuel();
    renderService();
    renderCards();
    renderStats();
  }


  function countUnlinkedFuel() {
    let n = 0;
    (db.fuel || []).forEach(f => {
      if (!inPeriod(f.date)) return;
      if (f.vehicleId && vehById(f.vehicleId)) return;
      if (f.cardId) {
        const c = (db.cards || []).find(x => x.id === f.cardId);
        if (c && c.vehicleId && vehById(c.vehicleId)) return;
      }
      if (f.cardNumber) {
        const num = String(f.cardNumber).replace(/\s+/g, '');
        const c = (db.cards || []).find(x => String(x.number || '').replace(/\s+/g, '') === num);
        if (c && c.vehicleId && vehById(c.vehicleId)) return;
      }
      n++;
    });
    return n;
  }
  function renderUnlinkedFuelBanner() {
    const host = document.getElementById('fleet-alerts');
    if (!host) return;
    const n = countUnlinkedFuel();
    const overdue = (db.service || []).filter(s => {
      if ((s.workStatus || 'done') === 'done' && s.nextDate && s.nextDate < today()) return true;
      if (s.nextDate && s.nextDate < today() && (s.workStatus || '') !== 'done') return true;
      // next service overdue regardless of work status if nextDate set and past
      return !!(s.nextDate && s.nextDate < today());
    });
    // unique vehicles with overdue next service
    const overdueVeh = new Set();
    (db.service || []).forEach(s => {
      if (s.nextDate && s.nextDate < today() && s.vehicleId) overdueVeh.add(s.vehicleId);
    });
    let html = '';
    if (n > 0) {
      html += '<div class="c" style="padding:12px 16px;margin-bottom:12px;border-left:4px solid #f59e0b;background:var(--g50)">' +
        '<b>ℹ Заправки без авто:</b> ' + n + ' за період. Паливо враховано по водію/картці. ' +
        'Якщо знаєте машину — оберіть її в журналі заправок у колонці «Авто». ' +
        'Основне авто можна задати в картці водія.' +
        ' <button class="btn bs bsm" type="button" onclick="document.querySelector(\'[data-tab=fuel]\')?.click()">Журнал заправок</button></div>';
    }
    if (overdueVeh.size > 0) {
      html += '<div class="c" style="padding:12px 16px;margin-bottom:12px;border-left:4px solid #ef4444;background:var(--g50)">' +
        '<b>🔧 Прострочений сервіс:</b> ' + overdueVeh.size + ' авто з датою наступного ТО/сервісу в минулому. ' +
        '<button class="btn bs bsm" type="button" onclick="document.querySelector(\'[data-tab=service]\')?.click()">Відкрити сервіс</button></div>';
    }
    
    const insOver = (db.vehicles || []).filter(v => v.insuranceTo && String(v.insuranceTo).slice(0, 10) < today());
    const techOver = (db.vehicles || []).filter(v => v.techUntil && String(v.techUntil).slice(0, 10) < today());
    if (insOver.length) {
      html += '<div class="c" style="padding:12px 16px;margin-bottom:12px;border-left:4px solid #ef4444;background:var(--g50)">' +
        '<b>🛡 Страховка прострочена:</b> ' + insOver.length + ' авто (' +
        insOver.slice(0, 5).map(v => esc(v.plate)).join(', ') + (insOver.length > 5 ? '…' : '') + '). ' +
        '<button class="btn bs bsm" type="button" onclick="document.querySelector(\'[data-tab=vehicles]\')?.click()">Автопарк</button></div>';
    }

    
    if (typeof techOver !== 'undefined' && techOver.length) {
      html += '<div class="c" style="padding:12px 16px;margin-bottom:12px;border-left:4px solid #f59e0b;background:var(--g50)">' +
        '<b>🔧 Техогляд прострочений:</b> ' + techOver.length + ' авто (' +
        techOver.slice(0, 5).map(v => esc(v.plate)).join(', ') + (techOver.length > 5 ? '…' : '') + ').</div>';
    }

    host.innerHTML = html;
  }

  function vehicleFuelTotals(vehicleId) {
    let liters = 0, cost = 0;
    const cardIds = new Set((db.cards || []).filter(c => c.vehicleId === vehicleId).map(c => c.id));
    const cardNums = new Set((db.cards || []).filter(c => c.vehicleId === vehicleId).map(c => String(c.number || '').replace(/\s+/g, '')));
    (db.fuel || []).forEach(f => {
      if (!inPeriod(f.date)) return;
      const byVeh = f.vehicleId === vehicleId;
      const byCard = (f.cardId && cardIds.has(f.cardId)) ||
        (f.cardNumber && cardNums.has(String(f.cardNumber).replace(/\s+/g, '')));
      if (byVeh || byCard) {
        liters += Number(f.liters) || 0;
        cost += Number(f.cost) || 0;
      }
    });
    return { liters, cost };
  }
  function vehicleServiceTotal(vehicleId) {
    let cost = 0;
    (db.service || []).forEach(s => {
      if (s.vehicleId === vehicleId && inPeriod(s.date)) cost += Number(s.cost) || 0;
    });
    return cost;
  }
  function renderVehicles() {
    const el = document.getElementById('veh-list');
    if (!el) return;
    const q = (document.getElementById('veh-search')?.value || '').toLowerCase().trim();
    let list = (db.vehicles || []).slice();
    if (q) {
      list = list.filter(v =>
        String(v.plate || '').toLowerCase().includes(q) ||
        String(v.make || '').toLowerCase().includes(q) ||
        String(v.model || '').toLowerCase().includes(q) ||
        String(vehTitle(v)).toLowerCase().includes(q) ||
        String(v.vin || '').toLowerCase().includes(q) ||
        String(v.color || '').toLowerCase().includes(q) ||
        empName(v.employeeId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || ''), 'uk'));
    const cnt = document.getElementById('veh-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Автомобілів немає</div>';
      return;
    }
    const ce = canEdit();
    let totalL = 0, totalFuel = 0, totalSvc = 0;
    let h = '<table class="dt"><thead><tr>' +
      '<th>Номер</th><th>Модель</th><th>Паливо</th><th>Пробіг</th><th>Водій</th><th>Статус</th>' +
      '<th>Паливо, л</th><th>Паливо, ₴</th><th>Сервіс, ₴</th><th>Разом, ₴</th><th></th>' +
      '</tr></thead><tbody>';
    list.forEach(v => {
      const st = STATUSES[v.status] || STATUSES.active;
      const ft = vehicleFuelTotals(v.id);
      const svc = vehicleServiceTotal(v.id);
      const sum = ft.cost + svc;
      totalL += ft.liters;
      totalFuel += ft.cost;
      totalSvc += svc;
      h += '<tr>' +
        '<td><b>' + esc(v.plate) + '</b></td>' +
        '<td><b>' + esc(vehTitle(v)) + '</b>' +
          (v.vehicleType ? ' <span class="bg bg-b" style="font-size:10px">' + esc(VEH_TYPES[v.vehicleType] || v.vehicleType) + '</span>' : '') +
          (v.year ? ' <span class="tsm tmu">(' + v.year + ')</span>' : '') +
          (v.color ? '<div class="tsm tmu">' + esc(v.color) + '</div>' : '') +
          (v.engineVolume != null ? '<div class="tsm tmu">' + esc(v.engineVolume) + ' л</div>' : '') +
          (v.consumption != null ? '<div class="tsm tmu">' + esc(v.consumption) + ' л/100 км</div>' : '') +
          (v.vin ? '<div class="tsm tmu tmn">' + esc(v.vin) + '</div>' : '') + '</td>' +
        '<td>' + esc(FUEL_TYPES[v.fuelType] || v.fuelType || '—') + '</td>' +
        '<td class="tmn">' + (Number(v.odometer) || 0).toLocaleString('uk-UA') + ' км</td>' +
        '<td>' + esc(empName(v.employeeId)) + '</td>' +
        '<td><span class="bg ' + st.cls + '">' + st.name + '</span>' +
          (function(){ const ins = insuranceStatus(v); return ins ? '<div style="margin-top:4px"><span class="bg ' + ins.cls + '" style="font-size:10px">' + esc(ins.text) + '</span></div>' : ''; })() +
          (v.ownership && v.ownership !== 'own' ? '<div class="tsm tmu">' + esc(OWN_TYPES[v.ownership] || v.ownership) + '</div>' : '') +
          (v.invNumber ? '<div class="tsm tmu">інв. ' + esc(v.invNumber) + '</div>' : '') +
          ((v.policySeries || v.policyNumber) ? '<div class="tsm tmu">поліс ' + esc([v.policySeries, v.policyNumber].filter(Boolean).join(' ')) + '</div>' : '') +
          '<div class="tsm tmu">' +
            (v.winterTires === 'yes' ? '❄ гума ✓' : '❄ гума ✗') + ' · ' +
            (v.techInspection === 'yes'
              ? ('ТО ✓' + (v.techUntil ? ' до ' + fD(v.techUntil) : ''))
              : 'ТО ✗') +
          '</div>' +
        '</td>' +
        '<td class="tmn">' + fN(ft.liters) + '</td>' +
        '<td class="tmn">' + fN(ft.cost) + '</td>' +
        '<td class="tmn">' + fN(svc) + '</td>' +
        '<td class="tmn"><b>' + fN(sum) + '</b></td>' +
        '<td style="text-align:right;white-space:nowrap">' +
        (ce ? '<button class="btn bs bxs" type="button" onclick="Fleet.editVehicle(\'' + v.id + '\')">✏️</button> ' : '') +
        (ce ? '<button class="btn bd bxs" type="button" onclick="Fleet.delVehicle(\'' + v.id + '\')">×</button>' : '') +
        '</td></tr>';
    });
    h += '</tbody><tfoot><tr style="background:var(--g50);font-weight:700">' +
      '<td colspan="6" style="text-align:right">Підсумок по списку</td>' +
      '<td class="tmn">' + fN(totalL) + ' л</td>' +
      '<td class="tmn">' + fN(totalFuel) + ' ₴</td>' +
      '<td class="tmn">' + fN(totalSvc) + ' ₴</td>' +
      '<td class="tmn">' + fN(totalFuel + totalSvc) + ' ₴</td>' +
      '<td></td></tr></tfoot></table>';
    el.innerHTML = h;
  }


  function exportPeriodReport() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const { from, to } = getPeriod();
    const data = [['Номер', 'Модель', 'Водій', 'Паливо л', 'Паливо ₴', 'Сервіс ₴', 'Разом ₴', 'Період з', 'Період по']];
    (db.vehicles || []).slice().sort((a,b) => String(a.plate).localeCompare(String(b.plate),'uk')).forEach(v => {
      const ft = vehicleFuelTotals(v.id);
      const svc = vehicleServiceTotal(v.id);
      data.push([
        v.plate, vehTitle(v), empName(v.employeeId),
        Math.round(ft.liters*100)/100, Math.round(ft.cost*100)/100,
        Math.round(svc*100)/100, Math.round((ft.cost+svc)*100)/100,
        from || '', to || ''
      ]);
    });
    // unlinked fuel row
    let ul = 0, uc = 0;
    (db.fuel || []).forEach(f => {
      if (!inPeriod(f.date)) return;
      let linked = false;
      if (f.vehicleId && vehById(f.vehicleId)) linked = true;
      else if (f.cardId) {
        const c = (db.cards || []).find(x => x.id === f.cardId);
        if (c && c.vehicleId && vehById(c.vehicleId)) linked = true;
      }
      if (!linked) { ul += Number(f.liters)||0; uc += Number(f.cost)||0; }
    });
    if (ul || uc) data.push(['(без авто)', '', '', Math.round(ul*100)/100, Math.round(uc*100)/100, 0, Math.round(uc*100)/100, from||'', to||'']);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Звіт за період');
    XLSX.writeFile(wb, 'nexus-fleet-period-report.xlsx');
  }

  function exportVehicles() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const data = [['Номер', 'Марка', 'Модель', 'Тип авто', 'Рік', 'VIN', 'Колір', 'Об\'єм двигуна л', 'Витрата л/100км', 'Тип палива', 'Пробіг', 'Водій', 'Статус', 'Дата постановки', 'Володіння', 'Інв. №', 'Вартість', 'Серія поліса', 'Номер поліса', 'Поліс діє до', 'Зимова гума', 'Техогляд', 'Техогляд діє до', 'Паливо л', 'Паливо ₴', 'Сервіс ₴', 'Разом ₴', 'Опис']];
    (db.vehicles || []).forEach(v => {
      const ft = vehicleFuelTotals(v.id);
      const svc = vehicleServiceTotal(v.id);
      data.push([
        v.plate, v.make || '', v.model || '', VEH_TYPES[v.vehicleType] || v.vehicleType || '',
        v.year || '', v.vin || '', v.color || '',
        v.engineVolume != null ? v.engineVolume : '',
        v.consumption != null ? v.consumption : '',
        FUEL_TYPES[v.fuelType] || v.fuelType || '',
        v.odometer || 0, empName(v.employeeId),
        (STATUSES[v.status] || {}).name || v.status,
        v.regDate || '', OWN_TYPES[v.ownership] || v.ownership || '',
        v.invNumber || '', v.bookValue != null ? v.bookValue : '',
        v.policySeries || '', v.policyNumber || '',
        v.insuranceTo || '',
        v.winterTires === 'yes' ? 'Так' : 'Ні',
        v.techInspection === 'yes' ? 'Так' : 'Ні',
        v.techUntil || '',
        Math.round(ft.liters * 100) / 100, Math.round(ft.cost * 100) / 100,
        Math.round(svc * 100) / 100, Math.round((ft.cost + svc) * 100) / 100,
        v.notes || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Автопарк');
    XLSX.writeFile(wb, 'nexus-fleet-vehicles.xlsx');
  }

  /* --- Fuel --- */
  function openFuelForm() {
    if (!canEdit()) return denyEdit();
    resetFuel();
    fillVehicleSelects();
    const m = document.getElementById('fuel-form-modal');
    if (m) m.classList.add('open');
  }
  function closeFuelForm() {
    const m = document.getElementById('fuel-form-modal');
    if (m) m.classList.remove('open');
    resetFuel();
  }

  function resetFuel() {
    editingFuelId = null;
    const d = document.getElementById('f-date'); if (d) d.value = today();
    const l = document.getElementById('f-liters'); if (l) l.value = '';
    const c = document.getElementById('f-cost'); if (c) c.value = '0';
    const o = document.getElementById('f-odometer'); if (o) o.value = '';
    const n = document.getElementById('f-note'); if (n) n.value = '';
    const v = document.getElementById('f-vehicle'); if (v) v.value = '';
    const tit = document.getElementById('fuel-form-title'); if (tit) tit.textContent = 'Додати заправку';
  }

  function saveFuel() {
    if (!canEdit()) return denyEdit();
    const vehicleId = document.getElementById('f-vehicle')?.value || '';
    const date = document.getElementById('f-date')?.value || '';
    const liters = Number(document.getElementById('f-liters')?.value) || 0;
    if (!date) { alert('Вкажіть дату'); return; }
    if (liters <= 0) { alert('Вкажіть кількість літрів'); return; }
    const odometer = document.getElementById('f-odometer')?.value;
    const prev = editingFuelId ? (db.fuel || []).find(x => x.id === editingFuelId) : null;
    const item = {
      id: editingFuelId || uid('fuel'),
      vehicleId,
      cardId: prev ? (prev.cardId || '') : '',
      cardNumber: prev ? (prev.cardNumber || '') : '',
      holder: prev ? (prev.holder || '') : '',
      employeeId: prev ? (prev.employeeId || '') : '',
      date,
      liters,
      cost: Number(document.getElementById('f-cost')?.value) || 0,
      odometer: odometer === '' || odometer == null ? null : Number(odometer),
      note: (document.getElementById('f-note')?.value || '').trim(),
      updatedAt: today()
    };
    if (editingFuelId) {
      const i = db.fuel.findIndex(x => x.id === editingFuelId);
      if (i >= 0) {
        item.createdAt = db.fuel[i].createdAt || today();
        db.fuel[i] = item;
      }
      alert('Заправку оновлено');
    } else {
      item.createdAt = today();
      db.fuel.push(item);
      alert('Заправку додано');
    }
    // update vehicle odometer if higher
    if (item.odometer != null && vehicleId) {
      const v = vehById(vehicleId);
      if (v && item.odometer > (Number(v.odometer) || 0)) {
        v.odometer = item.odometer;
        v.updatedAt = today();
      }
    }
    saveDB();
    closeFuelForm();
    renderFuel();
    renderVehicles();
    renderStats();
  }

  function editFuel(id) {
    if (!canEdit()) return denyEdit();
    const f = (db.fuel || []).find(x => x.id === id);
    if (!f) return;
    editingFuelId = id;
    fillVehicleSelects();
    document.getElementById('f-vehicle').value = f.vehicleId || '';
    document.getElementById('f-date').value = f.date || '';
    document.getElementById('f-liters').value = f.liters || '';
    document.getElementById('f-cost').value = f.cost || 0;
    document.getElementById('f-odometer').value = f.odometer != null ? f.odometer : '';
    document.getElementById('f-note').value = f.note || '';
    document.getElementById('fuel-form-title').textContent = 'Редагувати заправку';
    const m = document.getElementById('fuel-form-modal');
    if (m) m.classList.add('open');
  }

  function delFuel(id) {
    if (!canEdit()) return denyEdit();
    if (!confirm('Видалити запис заправки?')) return;
    db.fuel = (db.fuel || []).filter(x => x.id !== id);
    saveDB();
    renderFuel();
    renderStats();
  }


  function setFuelVehicle(fuelId, vehicleId) {
    if (!canEdit()) return denyEdit();
    const f = (db.fuel || []).find(x => x.id === fuelId);
    if (!f) return;
    f.vehicleId = vehicleId || '';
    f.updatedAt = today();
    saveDB();
    renderFuel();
    renderVehicles();
    renderStats();
    renderUnlinkedFuelBanner();
  }

  function renderFuel() {
    const el = document.getElementById('fuel-list');
    if (!el) return;
    const filter = document.getElementById('fuel-filter-veh')?.value || '';
    const q = (document.getElementById('fuel-search')?.value || '').toLowerCase().trim();
    let list = (db.fuel || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    list = list.filter(f => inPeriod(f.date));
    if (filter) list = list.filter(f => f.vehicleId === filter);
    if (q) {
      const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
      const qq = norm(q).replace(/[\s-]/g, '');
      list = list.filter(f => {
        const v = vehById(f.vehicleId);
        const plate = norm(v && v.plate).replace(/[\s-]/g, '');
        const model = norm(v && vehTitle(v));
        const note = norm(f.note);
        return plate.includes(qq) || model.includes(norm(q)) || note.includes(norm(q));
      });
    }
    const cnt = document.getElementById('fuel-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Заправок немає</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Дата</th><th>Авто (можна змінити)</th><th>Водій</th><th>Паливо</th><th>Літри</th><th>Сума</th><th>₴/л</th><th>АЗС</th><th></th></tr></thead><tbody>';
    list.forEach(f => {
      const v = vehById(f.vehicleId);
      const perL = f.liters ? (Number(f.cost) || 0) / f.liters : 0;
      const driver = f.employeeId ? empName(f.employeeId) : (f.holder || '—');
      let vehSelect = '<select class="fuel-veh-sel" style="max-width:160px;font-size:12px" ' +
        (ce ? '' : 'disabled ') +
        'onchange="Fleet.setFuelVehicle(\'' + f.id + '\', this.value)">' +
        '<option value="">— без авто —</option>';
      (db.vehicles || []).forEach(vv => {
        vehSelect += '<option value="' + esc(vv.id) + '"' + (f.vehicleId === vv.id ? ' selected' : '') + '>' +
          esc(vv.plate + ' ' + vehTitle(vv)) + '</option>';
      });
      vehSelect += '</select>';
      const cardHint = f.cardNumber ? ('<div class="tsm tmu tmn">' + esc(f.cardNumber) + '</div>') : '';
      h += '<tr>' +
        '<td>' + fD(f.date) + (f.time ? '<div class="tsm tmu">' + esc(f.time) + '</div>' : '') + '</td>' +
        '<td>' + vehSelect + cardHint + '</td>' +
        '<td><b>' + esc(driver) + '</b>' + (f.holder && f.employeeId ? '<div class="tsm tmu">' + esc(f.holder) + '</div>' : '') + '</td>' +
        '<td>' + esc(f.product || '—') + '</td>' +
        '<td class="tmn">' + fN(f.liters) + '</td>' +
        '<td class="tmn">' + fN(f.cost) + ' ₴</td>' +
        '<td class="tmn">' + fN(perL) + '</td>' +
        '<td class="tsm">' + esc(f.station || f.note || '—') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' +
        (ce ? '<button class="btn bs bxs" type="button" onclick="Fleet.editFuel(\'' + f.id + '\')">✏️</button> ' : '') +
        (ce ? '<button class="btn bd bxs" type="button" onclick="Fleet.delFuel(\'' + f.id + '\')">×</button>' : '') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }


  function exportDriverFuelReport() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const { from, to } = getPeriod();
    const map = {};
    (db.fuel || []).filter(f => inPeriod(f.date)).forEach(f => {
      const key = f.employeeId || ('holder:' + (f.holder || f.cardNumber || 'unknown'));
      if (!map[key]) {
        map[key] = {
          driver: f.employeeId ? empName(f.employeeId) : (f.holder || 'Невідомий'),
          cards: new Set(),
          liters: 0,
          cost: 0,
          count: 0,
          withVeh: 0,
          withoutVeh: 0
        };
      }
      const row = map[key];
      if (f.cardNumber) row.cards.add(String(f.cardNumber));
      row.liters += Number(f.liters) || 0;
      row.cost += Number(f.cost) || 0;
      row.count += 1;
      if (f.vehicleId && vehById(f.vehicleId)) row.withVeh += 1;
      else row.withoutVeh += 1;
    });
    const data = [['Водій', 'Картки', 'Заправок', 'Літри', 'Сума ₴', 'З авто', 'Без авто', 'Період з', 'Період по']];
    Object.values(map).sort((a, b) => a.driver.localeCompare(b.driver, 'uk')).forEach(r => {
      data.push([
        r.driver, [...r.cards].join(', '), r.count,
        Math.round(r.liters * 100) / 100, Math.round(r.cost * 100) / 100,
        r.withVeh, r.withoutVeh, from || '', to || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Паливо по водіях');
    XLSX.writeFile(wb, 'nexus-fuel-by-drivers.xlsx');
  }

  function exportFuel() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    /* export respects period filter via filtered loop below */
    const data = [['Дата', 'Водій', 'Картка', 'Авто', 'Модель', 'Літри', 'Сума', '₴/л', 'Пробіг', 'Примітка']];
    (db.fuel || []).filter(f => inPeriod(f.date)).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(f => {
      const v = vehById(f.vehicleId);
      const perL = f.liters ? (Number(f.cost) || 0) / f.liters : 0;
      const driver = f.employeeId ? empName(f.employeeId) : (f.holder || '');
      data.push([
        f.date, driver, f.cardNumber || '', v ? v.plate : '', v ? vehTitle(v) : '',
        f.liters, f.cost, Number(perL.toFixed(2)),
        f.odometer != null ? f.odometer : '', f.note || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Паливо');
    XLSX.writeFile(wb, 'nexus-fleet-fuel.xlsx');
  }


  /* --- Fuel cards --- */
  let editingCardId = null;

  function cardByNumber(num) {
    const n = String(num || '').replace(/\s+/g, '');
    return (db.cards || []).find(c => String(c.number || '').replace(/\s+/g, '') === n) || null;
  }
  function cardById(id) {
    return (db.cards || []).find(c => c.id === id) || null;
  }

  function fillCardSelects() {
    const emp = document.getElementById('c-emp');
    const veh = document.getElementById('c-veh');
    if (emp) {
      const cur = emp.value;
      emp.innerHTML = '<option value="">— не прив’язано —</option>' +
        getEmployees().map(e => '<option value="' + esc(e.id) + '">' + esc(e.fullName) + '</option>').join('');
      if (cur) emp.value = cur;
    }
    if (veh) {
      const cur = veh.value;
      veh.innerHTML = '<option value="">— не прив’язано —</option>' +
        (db.vehicles || []).map(v => '<option value="' + esc(v.id) + '">' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('');
      if (cur) veh.value = cur;
    }
  }

  function openCardForm() {
    if (!canEdit()) return denyEdit();
    resetCard();
    fillCardSelects();
    const m = document.getElementById('card-form-modal');
    if (m) m.classList.add('open');
  }
  function closeCardForm() {
    const m = document.getElementById('card-form-modal');
    if (m) m.classList.remove('open');
    resetCard();
  }
  function resetCard() {
    editingCardId = null;
    ['c-number', 'c-holder', 'c-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const e = document.getElementById('c-emp'); if (e) e.value = '';
    const v = document.getElementById('c-veh'); if (v) v.value = '';
    const t = document.getElementById('card-form-title'); if (t) t.textContent = 'Додати паливну картку';
    const bs = document.getElementById('card-btn-save'); if (bs) bs.textContent = 'Зберегти картку';
  }
  function saveCard() {
    if (!canEdit()) return denyEdit();
    const number = (document.getElementById('c-number')?.value || '').replace(/\s+/g, '');
    if (!number) { alert('Вкажіть номер картки'); return; }
    const employeeId = document.getElementById('c-emp')?.value || '';
    if (!employeeId) { alert('Прив\u2019яжіть картку до водія (співробітника)'); return; }
    const exists = cardByNumber(number);
    if (exists && exists.id !== editingCardId) {
      alert('Картка з таким номером вже є');
      return;
    }
    const vehicleId = document.getElementById('c-veh')?.value || '';
    const item = {
      id: editingCardId || uid('card'),
      number,
      holder: (document.getElementById('c-holder')?.value || '').trim(),
      employeeId,
      vehicleId,
      note: (document.getElementById('c-note')?.value || '').trim(),
      updatedAt: today()
    };
    if (editingCardId) {
      const i = db.cards.findIndex(x => x.id === editingCardId);
      if (i >= 0) {
        item.createdAt = db.cards[i].createdAt || today();
        db.cards[i] = item;
      }
    } else {
      item.createdAt = today();
      if (!db.cards) db.cards = [];
      db.cards.push(item);
    }
    (db.fuel || []).forEach(f => {
      const sameCard = (f.cardId && f.cardId === item.id) ||
        (f.cardNumber && String(f.cardNumber).replace(/\s+/g, '') === number);
      if (!sameCard) return;
      if (!f.employeeId && item.employeeId) f.employeeId = item.employeeId;
      if (!f.vehicleId && item.vehicleId) f.vehicleId = item.vehicleId;
    });
    saveDB();
    closeCardForm();
    renderCards();
    renderFuel();
    renderVehicles();
    renderUnlinkedFuelBanner();
  }
  function editCard(id) {
    if (!canEdit()) return denyEdit();
    const c = cardById(id);
    if (!c) return;
    editingCardId = id;
    fillCardSelects();
    document.getElementById('c-number').value = c.number || '';
    document.getElementById('c-holder').value = c.holder || '';
    document.getElementById('c-emp').value = c.employeeId || '';
    document.getElementById('c-veh').value = c.vehicleId || '';
    document.getElementById('c-note').value = c.note || '';
    document.getElementById('card-form-title').textContent = 'Редагувати картку';
    document.getElementById('card-btn-save').textContent = 'Зберегти';
    const m = document.getElementById('card-form-modal');
    if (m) m.classList.add('open');
  }
  function delCard(id) {
    if (!canEdit()) return denyEdit();
    const c = cardById(id);
    if (!c) return;
    if (!confirm('Видалити картку «' + c.number + '»? Заправки залишаться.')) return;
    db.cards = (db.cards || []).filter(x => x.id !== id);
    saveDB();
    renderCards();
  }
  function renderCards() {
    const el = document.getElementById('card-list');
    if (!el) return;
    const q = (document.getElementById('card-search')?.value || '').toLowerCase().trim();
    let list = (db.cards || []).slice();
    if (q) {
      list = list.filter(c =>
        String(c.number || '').toLowerCase().includes(q) ||
        String(c.holder || '').toLowerCase().includes(q) ||
        empName(c.employeeId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => String(a.number).localeCompare(String(b.number)));
    const cnt = document.getElementById('card-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Карток немає. Додайте вручну або імпортуйте звіт OKKO — картки підтягнуться автоматично.</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Номер картки</th><th>Картотримач (OKKO)</th><th>Співробітник</th><th>Авто</th><th></th></tr></thead><tbody>';
    list.forEach(c => {
      const v = c.vehicleId ? vehById(c.vehicleId) : null;
      h += '<tr>' +
        '<td class="tmn"><b>' + esc(c.number) + '</b></td>' +
        '<td>' + esc(c.holder || '—') + '</td>' +
        '<td><b>' + esc(empName(c.employeeId)) + '</b></td>' +
        '<td>' + (v ? esc(v.plate + ' — ' + vehTitle(v)) : '<span class="tsm tmu">основне авто не задано</span>') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' +
        (ce ? '<button class="btn bs bxs" type="button" onclick="Fleet.editCard(\'' + c.id + '\')">✏️</button> ' : '') +
        (ce ? '<button class="btn bd bxs" type="button" onclick="Fleet.delCard(\'' + c.id + '\')">×</button>' : '') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  /* --- OKKO Excel import --- */
  function parseUaDate(s) {
    // 03.09.2026 -> 2026-09-03
    if (!s) return '';
    if (s instanceof Date && !isNaN(s)) {
      const y = s.getFullYear(), m = String(s.getMonth() + 1).padStart(2, '0'), d = String(s.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
    const str = String(s).trim();
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return '';
  }
  function fuelFingerprint(row) {
    return [row.card, row.date, row.time || '', row.liters, row.cost, row.product || ''].join('|');
  }
  function tryMatchPlate(holder) {
    if (!holder) return null;
    const m = String(holder).toUpperCase().match(/[A-ZА-ЯІЇЄҐ]{2}\s?\d{4}\s?[A-ZА-ЯІЇЄҐ]{2}/);
    if (!m) return null;
    const plate = m[0].replace(/\s+/g, '');
    return (db.vehicles || []).find(v => String(v.plate || '').replace(/\s+/g, '').toUpperCase() === plate) || null;
  }

  function openCardLinkWizard() {
    const list = (db.cards || []).filter(c => !c.vehicleId || !c.employeeId);
    const body = document.getElementById('card-wizard-body');
    const modal = document.getElementById('card-wizard-modal');
    if (!body || !modal) {
      // fallback: switch to cards tab
      document.querySelector('[data-tab="cards"]')?.click();
      renderCards();
      return;
    }
    if (!list.length) {
      body.innerHTML = '<div class="tm">Усі картки вже прив’язані.</div>';
    } else {
      const emps = getEmployees();
      const vehs = db.vehicles || [];
      let h = '<div class="tsm tmu" style="margin-bottom:10px">Прив’яжіть картки до співробітника та авто — тоді паливо потрапить у звіт по автопарку.</div>';
      h += '<table class="dt"><thead><tr><th>Картка</th><th>Картотримач</th><th>Співробітник</th><th>Авто</th></tr></thead><tbody>';
      list.forEach(c => {
        h += '<tr data-card="' + esc(c.id) + '">' +
          '<td class="tmn"><b>' + esc(c.number) + '</b></td>' +
          '<td>' + esc(c.holder || '—') + '</td>' +
          '<td><select class="cw-emp">' +
            '<option value="">—</option>' +
            emps.map(e => '<option value="' + esc(e.id) + '"' + (c.employeeId === e.id ? ' selected' : '') + '>' + esc(e.fullName) + '</option>').join('') +
          '</select></td>' +
          '<td><select class="cw-veh">' +
            '<option value="">—</option>' +
            vehs.map(v => '<option value="' + esc(v.id) + '"' + (c.vehicleId === v.id ? ' selected' : '') + '>' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('') +
          '</select></td></tr>';
      });
      h += '</tbody></table>';
      body.innerHTML = h;
    }
    modal.classList.add('open');
  }
  function closeCardLinkWizard() {
    const modal = document.getElementById('card-wizard-modal');
    if (modal) modal.classList.remove('open');
  }
  function saveCardLinkWizard() {
    if (!canEdit()) return denyEdit();
    const body = document.getElementById('card-wizard-body');
    if (!body) return;
    let n = 0;
    body.querySelectorAll('tr[data-card]').forEach(tr => {
      const id = tr.getAttribute('data-card');
      const c = (db.cards || []).find(x => x.id === id);
      if (!c) return;
      const emp = tr.querySelector('.cw-emp')?.value || '';
      const veh = tr.querySelector('.cw-veh')?.value || '';
      if (emp !== c.employeeId || veh !== c.vehicleId) {
        c.employeeId = emp;
        c.vehicleId = veh;
        c.updatedAt = today();
        n++;
      }
    });
    saveDB();
    closeCardLinkWizard();
    renderCards();
    renderFuel();
    renderVehicles();
    renderUnlinkedFuelBanner();
    renderStats();
    alert(n ? ('Оновлено карток: ' + n) : 'Змін не було');
  }

  function importOkko(ev) {
    if (!canEdit()) { denyEdit(); ev.target.value = ''; return; }
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!window.XLSX) { alert('SheetJS не завантажено'); ev.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // find header row with Картка
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
          const line = rows[i].map(x => String(x || '')).join(' ');
          if (line.includes('Картка') && line.includes('Дата')) { headerIdx = i; break; }
        }
        if (headerIdx < 0) {
          alert('Не знайдено заголовок звіту OKKO (колонка «Картка»).');
          return;
        }
        const header = rows[headerIdx].map(x => String(x || '').trim());
        const col = (names) => {
          for (const n of names) {
            const i = header.findIndex(h => h.toLowerCase().includes(n.toLowerCase()));
            if (i >= 0) return i;
          }
          return -1;
        };
        // fixed positions from known OKKO layout as fallback
        const cDate = col(['Дата']) >= 0 ? col(['Дата']) : 2;
        const cTime = col(['Час']) >= 0 ? col(['Час']) : 3;
        const cAddr = col(['Адреса']) >= 0 ? col(['Адреса']) : 4;
        const cProd = col(['Товар']) >= 0 ? col(['Товар']) : 7;
        const cQty = col(['К-сть', 'Кількість']) >= 0 ? col(['К-сть', 'Кількість']) : 9;
        const cSum = col(['Сума зі знижкою']) >= 0 ? col(['Сума зі знижкою']) : 13;
        const cCard = col(['Картка']) >= 0 ? col(['Картка']) : 16;
        const cHold = col(['Картотримач']) >= 0 ? col(['Картотримач']) : 17;

        const existingFp = new Set((db.fuel || []).map(f => f.importKey).filter(Boolean));
        let added = 0, skipped = 0, cardsNew = 0;
        if (!db.cards) db.cards = [];
        if (!db.fuel) db.fuel = [];

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || !r.length) continue;
          const card = String(r[cCard] || '').replace(/\s+/g, '').trim();
          const product = String(r[cProd] || '').trim();
          const liters = Number(String(r[cQty]).toString().replace(',', '.')) || 0;
          // skip totals / payments
          const rowText = r.map(x => String(x || '')).join(' ');
          if (/Відпущено|Оплати за період|Сальдо|Підсумки|Взаєморозрахунки|Штрафи/i.test(rowText) && !card) {
            continue;
          }
          if (!card || card.length < 8) continue;
          if (!product || /^оплата$/i.test(product)) { skipped++; continue; }
          if (liters <= 0) { skipped++; continue; }

          const date = parseUaDate(r[cDate]);
          if (!date) { skipped++; continue; }
          const time = String(r[cTime] || '').trim();
          const cost = Number(String(r[cSum]).toString().replace(',', '.')) || 0;
          const station = String(r[cAddr] || '').trim();
          const holder = String(r[cHold] || '').trim();

          const parsed = { card, date, time, liters, cost, product, station, holder };
          const key = 'okko|' + fuelFingerprint(parsed);
          if (existingFp.has(key)) { skipped++; continue; }

          // ensure card registry
          let cardRec = cardByNumber(card);
          if (!cardRec) {
            const matchedVeh = tryMatchPlate(holder);
            cardRec = {
              id: uid('card'),
              number: card,
              holder: holder,
              employeeId: '',
              vehicleId: matchedVeh ? matchedVeh.id : '',
              note: 'Авто з імпорту OKKO',
              createdAt: today(),
              updatedAt: today()
            };
            db.cards.push(cardRec);
            cardsNew++;
          } else if (holder && !cardRec.holder) {
            cardRec.holder = holder;
          }

          const vehId = cardRec.vehicleId || '';
          db.fuel.push({
            id: uid('fuel'),
            vehicleId: vehId,
            cardId: cardRec.id,
            cardNumber: card,
            holder: holder || cardRec.holder || '',
            employeeId: cardRec.employeeId || '',
            date,
            time,
            liters,
            cost,
            product,
            note: station ? ('OKKO: ' + station) : 'OKKO',
            station,
            source: 'okko',
            importKey: key,
            odometer: null,
            createdAt: today(),
            updatedAt: today()
          });
          existingFp.add(key);
          added++;
        }
        saveDB();
        renderFuel();
        renderCards();
        renderStats();
        fillVehicleSelects();
        if (window.NexusCore && NexusCore.audit) NexusCore.audit('fleet.okko.import', 'fuel', { added: added, skipped: skipped, cardsNew: cardsNew });
        const unbound = (db.cards || []).filter(c => !c.vehicleId || !c.employeeId);
        let msg = 'Імпорт OKKO завершено.\nДодано заправок: ' + added +
          '\nПропущено (дублікати / не паливо): ' + skipped +
          '\nНових карток: ' + cardsNew;
        if (unbound.length) {
          msg += '\n\nКарток без повної прив\u2019язки: ' + unbound.length + '. Відкрити майстер прив\u2019язки?';
          if (confirm(msg)) openCardLinkWizard();
        } else {
          alert(msg);
        }
        renderUnlinkedFuelBanner();
      } catch (err) {
        console.error(err);
        alert('Помилка імпорту: ' + err.message);
      }
      ev.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }


  /* --- Service --- */
  let editingSvcId = null;
  const SVC_TYPES = {
    to: 'ТО',
    repair: 'Ремонт',
    tires: 'Шини / диски',
    oil: 'Заміна оливи',
    brakes: 'Гальма',
    diagnostics: 'Діагностика',
    body: 'Кузов / фарбування',
    other: 'Інше'
  };


  function emptyServiceLine() {
    return { kind: 'work', name: '', unit: 'шт', qty: 1, price: 0, sum: 0 };
  }
  function renderServiceLines(lines) {
    const body = document.getElementById('s-lines-body');
    if (!body) return;
    const list = (lines && lines.length) ? lines : [emptyServiceLine()];
    body.innerHTML = list.map((ln, i) => {
      const qty = Number(ln.qty) || 0;
      const price = Number(ln.price) || 0;
      const sum = Math.round(qty * price * 100) / 100;
      return '<tr data-i="' + i + '">' +
        '<td><select class="sl-kind" onchange="Fleet.recalcServiceLines()">' +
          '<option value="work"' + (ln.kind === 'work' ? ' selected' : '') + '>Робота</option>' +
          '<option value="material"' + (ln.kind === 'material' ? ' selected' : '') + '>Матеріал</option>' +
        '</select></td>' +
        '<td><input class="sl-name" value="' + esc(ln.name || '') + '" placeholder="Найменування" oninput="Fleet.recalcServiceLines()"></td>' +
        '<td><input class="sl-unit" value="' + esc(ln.unit || 'шт') + '" placeholder="шт" style="width:64px" oninput="Fleet.recalcServiceLines()"></td>' +
        '<td><input class="sl-qty" type="number" min="0" step="0.01" value="' + qty + '" style="width:84px" oninput="Fleet.recalcServiceLines()"></td>' +
        '<td><input class="sl-price" type="number" min="0" step="0.01" value="' + price + '" style="width:96px" oninput="Fleet.recalcServiceLines()"></td>' +
        '<td><input class="sl-sum" type="number" readonly value="' + sum + '" style="width:96px;font-weight:700;background:var(--g50)"></td>' +
        '<td><button type="button" class="btn bd bxs" onclick="Fleet.removeServiceLine(' + i + ')">×</button></td>' +
      '</tr>';
    }).join('');
    recalcServiceLines();
  }
  function collectServiceLines() {
    const body = document.getElementById('s-lines-body');
    if (!body) return [];
    return Array.from(body.querySelectorAll('tr')).map(tr => {
      const qty = Number(tr.querySelector('.sl-qty')?.value) || 0;
      const price = Number(tr.querySelector('.sl-price')?.value) || 0;
      return {
        kind: tr.querySelector('.sl-kind')?.value || 'work',
        name: (tr.querySelector('.sl-name')?.value || '').trim(),
        unit: (tr.querySelector('.sl-unit')?.value || 'шт').trim() || 'шт',
        qty,
        price,
        sum: Math.round(qty * price * 100) / 100
      };
    }).filter(ln => ln.name);
  }
  function recalcServiceLines() {
    const body = document.getElementById('s-lines-body');
    if (!body) return;
    let total = 0;
    body.querySelectorAll('tr').forEach(tr => {
      const qty = Number(tr.querySelector('.sl-qty')?.value) || 0;
      const price = Number(tr.querySelector('.sl-price')?.value) || 0;
      const sum = Math.round(qty * price * 100) / 100;
      const sumEl = tr.querySelector('.sl-sum');
      if (sumEl) sumEl.value = sum;
      total += sum;
    });
    const cost = document.getElementById('s-cost');
    if (cost) cost.value = Math.round(total * 100) / 100;
  }
  function addServiceLine() {
    const lines = collectServiceLines();
    // also keep incomplete current rows
    const body = document.getElementById('s-lines-body');
    if (body) {
      const current = Array.from(body.querySelectorAll('tr')).map(tr => ({
        kind: tr.querySelector('.sl-kind')?.value || 'work',
        name: tr.querySelector('.sl-name')?.value || '',
        unit: tr.querySelector('.sl-unit')?.value || 'шт',
        qty: Number(tr.querySelector('.sl-qty')?.value) || 0,
        price: Number(tr.querySelector('.sl-price')?.value) || 0
      }));
      current.push(emptyServiceLine());
      renderServiceLines(current);
    } else {
      lines.push(emptyServiceLine());
      renderServiceLines(lines);
    }
  }
  function removeServiceLine(idx) {
    const body = document.getElementById('s-lines-body');
    if (!body) return;
    const current = Array.from(body.querySelectorAll('tr')).map(tr => ({
      kind: tr.querySelector('.sl-kind')?.value || 'work',
      name: tr.querySelector('.sl-name')?.value || '',
      unit: tr.querySelector('.sl-unit')?.value || 'шт',
      qty: Number(tr.querySelector('.sl-qty')?.value) || 0,
      price: Number(tr.querySelector('.sl-price')?.value) || 0
    }));
    current.splice(idx, 1);
    renderServiceLines(current.length ? current : [emptyServiceLine()]);
  }


  let pendingInvoiceScan = null; // { name, type, dataUrl }
  function onInvoiceScanChange(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) { pendingInvoiceScan = null; return; }
    if (file.size > 4 * 1024 * 1024) {
      alert('Файл завеликий (макс. 4 МБ)');
      ev.target.value = '';
      pendingInvoiceScan = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingInvoiceScan = { name: file.name, type: file.type, dataUrl: reader.result };
      const lab = document.getElementById('s-scan-label');
      if (lab) lab.textContent = file.name;
    };
    reader.readAsDataURL(file);
  }
  function clearInvoiceScan() {
    pendingInvoiceScan = null;
    const inp = document.getElementById('s-scan');
    if (inp) inp.value = '';
    const lab = document.getElementById('s-scan-label');
    if (lab) lab.textContent = 'Файл не обрано';
  }

  function fillServiceSelects() {
    const opts = '<option value="">— оберіть авто —</option>' +
      (db.vehicles || []).map(v => '<option value="' + esc(v.id) + '">' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('');
    const filterOpts = '<option value="">Усі авто</option>' +
      (db.vehicles || []).map(v => '<option value="' + esc(v.id) + '">' + esc(v.plate + ' — ' + vehTitle(v)) + '</option>').join('');
    const sv = document.getElementById('s-vehicle');
    const sf = document.getElementById('svc-filter-veh');
    if (sv) {
      const cur = sv.value;
      sv.innerHTML = opts;
      if (cur) sv.value = cur;
    }
    if (sf) {
      const cur = sf.value;
      sf.innerHTML = filterOpts;
      if (cur) sf.value = cur;
    }
    const sc = document.getElementById('s-contract');
    if (sc) {
      const cur = sc.value;
      const contracts = getContracts();
      sc.innerHTML = '<option value="">— без договору —</option>' +
        contracts.map(c => {
          const num = c.num || c.number || '';
          const label = (num ? num + ' — ' : '') + (c.name || 'Договір') + (c.counter ? ' (' + c.counter + ')' : '');
          return '<option value="' + esc(c.id) + '">' + esc(label) + '</option>';
        }).join('');
      if (cur) sc.value = cur;
    }
  }


  function fillServiceVendorSelect(selected, fallbackName) {
    if (window.NexusCore && NexusCore.fillCrmSelect) {
      NexusCore.fillCrmSelect('s-vendor-id', {
        selected: selected || '',
        filter: 'supplier',
        emptyLabel: '— підрядник / СТО з CRM —',
        includeAllFallback: true,
        fallbackName: fallbackName || ''
      });
      // if empty after supplier filter, refill all
      const sel = document.getElementById('s-vendor-id');
      if (sel && sel.options.length <= 1) {
        NexusCore.fillCrmSelect('s-vendor-id', {
          selected: selected || '',
          emptyLabel: '— з CRM —',
          fallbackName: fallbackName || ''
        });
      }
    }
  }
  function onServiceVendorPick() {
    const id = document.getElementById('s-vendor-id')?.value || '';
    const hid = document.getElementById('s-vendor');
    if (window.NexusCore && NexusCore.getCrmClient) {
      const c = NexusCore.getCrmClient(id);
      if (hid) hid.value = c ? (c.name || '') : '';
    } else if (hid && !id) hid.value = '';
  }

  function openServiceForm() {
    if (!canEdit()) return denyEdit();
    resetService();
    fillServiceSelects();
    const m = document.getElementById('svc-form-modal');
    if (m) m.classList.add('open');
  }
  function closeServiceForm() {
    const m = document.getElementById('svc-form-modal');
    if (m) m.classList.remove('open');
    resetService();
  }
  function resetService() {
    editingSvcId = null;
    const d = document.getElementById('s-date'); if (d) d.value = today();
    ['s-desc', 's-vendor', 's-note', 's-invoice'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    fillServiceVendorSelect('');
    const c = document.getElementById('s-cost'); if (c) c.value = '0';
    renderServiceLines([emptyServiceLine()]);
    const o = document.getElementById('s-odometer'); if (o) o.value = '';
    const nd = document.getElementById('s-next-date'); if (nd) nd.value = '';
    const nk = document.getElementById('s-next-km'); if (nk) nk.value = '';
    const ty = document.getElementById('s-type'); if (ty) ty.value = 'to';
    const st = document.getElementById('s-status'); if (st) st.value = 'done';
    const v = document.getElementById('s-vehicle'); if (v) v.value = '';
    const ct = document.getElementById('s-contract'); if (ct) ct.value = '';
    clearInvoiceScan();
    const t = document.getElementById('svc-form-title'); if (t) t.textContent = 'Додати сервіс';
    const bs = document.getElementById('svc-btn-save'); if (bs) bs.textContent = 'Зберегти';
  }
  function saveService() {
    if (!canEdit()) return denyEdit();
    const vehicleId = document.getElementById('s-vehicle')?.value || '';
    const date = document.getElementById('s-date')?.value || '';
    const lines = collectServiceLines();
    if (!vehicleId) { alert('Оберіть автомобіль'); return; }
    if (!date) { alert('Вкажіть дату'); return; }
    if (!lines.length) { alert('Додайте хоча б один рядок робіт або матеріалів'); return; }
    const descComment = (document.getElementById('s-desc')?.value || '').trim();
    const desc = lines.map(ln => {
      const kind = ln.kind === 'material' ? 'Матеріал' : 'Робота';
      return kind + ': ' + ln.name + ' — ' + ln.qty + ' ' + ln.unit + ' × ' + ln.price + ' = ' + ln.sum + ' грн';
    }).join('\n') + (descComment ? ('\n' + descComment) : '');
    const odoRaw = document.getElementById('s-odometer')?.value;
    const nextKmRaw = document.getElementById('s-next-km')?.value;
    recalcServiceLines();
    const item = {
      id: editingSvcId || uid('svc'),
      vehicleId,
      date,
      type: document.getElementById('s-type')?.value || 'other',
      workStatus: document.getElementById('s-status')?.value || 'done',
      contractId: document.getElementById('s-contract')?.value || '',
      invoice: (document.getElementById('s-invoice')?.value || '').trim(),
      lines,
      description: desc,
      comment: descComment,
      cost: Number(document.getElementById('s-cost')?.value) || 0,
      odometer: odoRaw === '' || odoRaw == null ? null : Number(odoRaw),
      nextDate: document.getElementById('s-next-date')?.value || '',
      nextKm: nextKmRaw === '' || nextKmRaw == null ? null : Number(nextKmRaw),
      vendorId: document.getElementById('s-vendor-id')?.value || '',
      vendor: (function(){ const id = document.getElementById('s-vendor-id')?.value || ''; if (id && window.NexusCore && NexusCore.getCrmClient) { const c = NexusCore.getCrmClient(id); if (c) return c.name || ''; } return (document.getElementById('s-vendor')?.value || '').trim(); })(),
      note: (document.getElementById('s-note')?.value || '').trim(),
      updatedAt: today()
    };
    if (pendingInvoiceScan) {
      item.invoiceScan = pendingInvoiceScan;
    } else if (editingSvcId) {
      const prev = (db.service || []).find(x => x.id === editingSvcId);
      if (prev && prev.invoiceScan) item.invoiceScan = prev.invoiceScan;
    }
    if (!db.service) db.service = [];
    if (editingSvcId) {
      const i = db.service.findIndex(x => x.id === editingSvcId);
      if (i >= 0) {
        item.createdAt = db.service[i].createdAt || today();
        db.service[i] = item;
      }
      alert('Запис оновлено');
    } else {
      item.createdAt = today();
      db.service.push(item);
      alert('Сервіс додано');
    }
    if (window.NexusCore && NexusCore.audit) NexusCore.audit(editingSvcId ? 'fleet.service.update' : 'fleet.service.create', 'service', { id: item.id, vehicleId: item.vehicleId, cost: item.cost });
    if (item.odometer != null) {
      const v = vehById(vehicleId);
      if (v && item.odometer > (Number(v.odometer) || 0)) {
        v.odometer = item.odometer;
        v.updatedAt = today();
      }
    }
    saveDB();
    closeServiceForm();
    renderService();
    renderVehicles();
    renderStats();
  }
  function editService(id) {
    if (!canEdit()) return denyEdit();
    const s = (db.service || []).find(x => x.id === id);
    if (!s) return;
    editingSvcId = id;
    fillServiceSelects();
    document.getElementById('s-vehicle').value = s.vehicleId || '';
    document.getElementById('s-date').value = s.date || '';
    document.getElementById('s-type').value = s.type || 'other';
    const wst = document.getElementById('s-status'); if (wst) wst.value = s.workStatus || 'done';
    const sco = document.getElementById('s-contract'); if (sco) sco.value = s.contractId || '';
    const sin = document.getElementById('s-invoice'); if (sin) sin.value = s.invoice || '';
    document.getElementById('s-desc').value = s.comment || '';
    document.getElementById('s-cost').value = s.cost || 0;
    if (Array.isArray(s.lines) && s.lines.length) {
      renderServiceLines(s.lines);
    } else if (s.description) {
      renderServiceLines([{ kind: 'work', name: s.description.split('\n')[0].slice(0, 120), unit: 'посл', qty: 1, price: Number(s.cost) || 0, sum: Number(s.cost) || 0 }]);
    } else {
      renderServiceLines([emptyServiceLine()]);
    }
    document.getElementById('s-odometer').value = s.odometer != null ? s.odometer : '';
    document.getElementById('s-next-date').value = s.nextDate || '';
    document.getElementById('s-next-km').value = s.nextKm != null ? s.nextKm : '';
    fillServiceVendorSelect(s.vendorId || '', s.vendor || '');
    if (!s.vendorId && s.vendor && window.NexusCore) {
      const match = (NexusCore.getCrmClients() || []).find(c => (c.name || '').toLowerCase() === String(s.vendor).toLowerCase());
      if (match) fillServiceVendorSelect(match.id, s.vendor);
    }
    onServiceVendorPick();
    if (s.vendor) { const hv = document.getElementById('s-vendor'); if (hv) hv.value = s.vendor; }
    document.getElementById('s-note').value = s.note || '';
    pendingInvoiceScan = null;
    const lab = document.getElementById('s-scan-label');
    if (lab) lab.textContent = (s.invoiceScan && s.invoiceScan.name) ? ('Прикріплено: ' + s.invoiceScan.name) : 'Файл не обрано';
    document.getElementById('svc-form-title').textContent = 'Редагувати сервіс';
    document.getElementById('svc-btn-save').textContent = 'Зберегти';
    const m = document.getElementById('svc-form-modal');
    if (m) m.classList.add('open');
  }
  function delService(id) {
    if (!canEdit()) return denyEdit();
    if (!confirm('Видалити запис сервісу?')) return;
    db.service = (db.service || []).filter(x => x.id !== id);
    saveDB();
    renderService();
  }
  function serviceStatus(s) {
    if (!s.nextDate && s.nextKm == null) return { text: '—', cls: 'bg-gr' };
    const todayStr = today();
    let overdue = false, soon = false;
    if (s.nextDate && s.nextDate < todayStr) overdue = true;
    else if (s.nextDate) {
      const d1 = new Date(s.nextDate + 'T00:00:00');
      const d0 = new Date(todayStr + 'T00:00:00');
      const days = (d1 - d0) / 86400000;
      if (days <= 14) soon = true;
    }
    const v = vehById(s.vehicleId);
    if (s.nextKm != null && v && (Number(v.odometer) || 0) >= s.nextKm) overdue = true;
    if (overdue) return { text: 'Прострочено', cls: 'bg-r' };
    if (soon) return { text: 'Скоро', cls: 'bg-o' };
    return { text: 'Заплановано', cls: 'bg-g' };
  }
  function workStatusBadge(ws) {
    const map = {
      planned: { text: 'Заплановано', cls: 'bg-b' },
      in_progress: { text: 'В роботі', cls: 'bg-o' },
      done: { text: 'Виконано', cls: 'bg-g' }
    };
    return map[ws] || map.done;
  }
  function renderService() {
    const el = document.getElementById('svc-list');
    if (!el) return;
    const q = (document.getElementById('svc-search')?.value || '').toLowerCase().trim();
    const filter = document.getElementById('svc-filter-veh')?.value || '';
    const fs = document.getElementById('svc-filter-status')?.value || '';
    let list = (db.service || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    list = list.filter(s => inPeriod(s.date));
    if (filter) list = list.filter(s => s.vehicleId === filter);
    if (fs) list = list.filter(s => (s.workStatus || 'done') === fs);
    if (q) {
      list = list.filter(s => {
        const v = vehById(s.vehicleId);
        return (s.description || '').toLowerCase().includes(q) ||
          (s.vendor || '').toLowerCase().includes(q) ||
          (s.invoice || '').toLowerCase().includes(q) ||
          (s.note || '').toLowerCase().includes(q) ||
          contractLabel(s.contractId).toLowerCase().includes(q) ||
          (v && ((v.plate || '').toLowerCase().includes(q) || (v.model || '').toLowerCase().includes(q)));
      });
    }
    const cnt = document.getElementById('svc-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Записів сервісу немає</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Дата</th><th>Авто</th><th>Статус</th><th>Тип</th><th>Деталі</th><th>Підстава / рахунок</th><th>Вартість</th><th>Наступний</th><th></th></tr></thead><tbody>';
    list.forEach(s => {
      const v = vehById(s.vehicleId);
      const wb = workStatusBadge(s.workStatus || 'done');
      const next = [];
      if (s.nextDate) next.push(fD(s.nextDate));
      if (s.nextKm != null) next.push(Number(s.nextKm).toLocaleString('uk-UA') + ' км');
      const descShort = (s.description || '—');
      const descShow = descShort.length > 80 ? descShort.slice(0, 80) + '…' : descShort;
      const basis = [];
      if (s.contractId) basis.push(contractLabel(s.contractId));
      if (s.invoice) basis.push('Рах. ' + s.invoice);
      h += '<tr style="cursor:pointer" onclick="Fleet.openServiceDetail(\'' + s.id + '\')">' +
        '<td>' + fD(s.date) + '</td>' +
        '<td><b>' + esc(v ? v.plate : '—') + '</b>' + (v ? '<div class="tsm tmu">' + esc(v.model) + '</div>' : '') + '</td>' +
        '<td><span class="bg ' + wb.cls + '">' + wb.text + '</span></td>' +
        '<td>' + esc(SVC_TYPES[s.type] || s.type || '—') + '</td>' +
        '<td>' + esc(descShow) + (s.vendor ? '<div class="tsm tmu">' + esc(s.vendor) + '</div>' : '') + '</td>' +
        '<td class="tsm">' + (basis.length ? esc(basis.join(' · ')) : '—') + '</td>' +
        '<td class="tmn">' + fN(s.cost) + ' ₴</td>' +
        '<td class="tsm">' + (next.length ? next.join('<br>') : '—') + '</td>' +
        '<td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">' +
        '<button class="btn bs bxs" type="button" title="Деталі" onclick="Fleet.openServiceDetail(\'' + s.id + '\')">👁</button> ' +
        (ce ? '<button class="btn bs bxs" type="button" onclick="Fleet.editService(\'' + s.id + '\')">✏️</button> ' : '') +
        (ce ? '<button class="btn bd bxs" type="button" onclick="Fleet.delService(\'' + s.id + '\')">×</button>' : '') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }
  function openServiceDetail(id) {
    const s = (db.service || []).find(x => x.id === id);
    if (!s) return;
    const v = vehById(s.vehicleId);
    const wb = workStatusBadge(s.workStatus || 'done');
    const title = document.getElementById('svc-detail-title');
    const body = document.getElementById('svc-detail-body');
    if (title) title.textContent = 'Сервіс · ' + (v ? v.plate : 'авто');
    if (body) {
      body.innerHTML =
        '<div class="detail-row"><span class="lbl">Дата</span><span class="val">' + esc(fD(s.date)) + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Автомобіль</span><span class="val">' + esc(v ? (v.plate + ' — ' + vehTitle(v)) : '—') + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Статус робіт</span><span class="val"><span class="bg ' + wb.cls + '">' + wb.text + '</span></span></div>' +
        '<div class="detail-row"><span class="lbl">Тип</span><span class="val">' + esc(SVC_TYPES[s.type] || s.type || '—') + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Підстава (договір)</span><span class="val">' + esc(contractLabel(s.contractId)) + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Номер рахунку СТО</span><span class="val">' + esc(s.invoice || '—') + '</span></div>' +
        '<div class="detail-row"><span class="lbl">СТО / виконавець</span><span class="val">' + esc(s.vendor || '—') + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Вартість</span><span class="val">' + fN(s.cost) + ' ₴</span></div>' +
        '<div class="detail-row"><span class="lbl">Пробіг</span><span class="val">' + (s.odometer != null ? Number(s.odometer).toLocaleString('uk-UA') + ' км' : '—') + '</span></div>' +
        '<div class="detail-row"><span class="lbl">Наступний сервіс</span><span class="val">' +
          esc([s.nextDate ? fD(s.nextDate) : '', s.nextKm != null ? (Number(s.nextKm).toLocaleString('uk-UA') + ' км') : ''].filter(Boolean).join(' / ') || '—') +
        '</span></div>' +
        (function(){
          const lines = Array.isArray(s.lines) ? s.lines : [];
          if (!lines.length) {
            return '<div style="margin-top:14px"><div class="tsm tmu" style="margin-bottom:6px">Деталі робіт (бухгалтерія)</div>' +
              '<div style="white-space:pre-wrap;line-height:1.5;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--g50)">' +
              esc(s.description || '—') + '</div></div>';
          }
          let tbl = '<div style="margin-top:14px"><div class="tsm tmu" style="margin-bottom:6px">Роботи та матеріали</div>' +
            '<table class="dt"><thead><tr><th>Тип</th><th>Найменування</th><th>Од.</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr></thead><tbody>';
          lines.forEach(ln => {
            tbl += '<tr><td>' + esc(ln.kind === 'material' ? 'Матеріал' : 'Робота') + '</td>' +
              '<td>' + esc(ln.name) + '</td><td>' + esc(ln.unit || 'шт') + '</td>' +
              '<td class="tmn">' + fN(ln.qty) + '</td><td class="tmn">' + fN(ln.price) + '</td><td class="tmn">' + fN(ln.sum) + ' ₴</td></tr>';
          });
          tbl += '</tbody></table></div>';
          if (s.comment) tbl += '<div style="margin-top:10px"><div class="tsm tmu">Коментар</div><div>' + esc(s.comment) + '</div></div>';
          return tbl;
        })() +
        (s.note ? '<div style="margin-top:12px"><div class="tsm tmu">Примітки</div><div>' + esc(s.note) + '</div></div>' : '') +
        (s.invoiceScan && s.invoiceScan.dataUrl
          ? '<div style="margin-top:12px"><div class="tsm tmu">Скан рахунку СТО</div><a href="' + s.invoiceScan.dataUrl + '" download="' + esc(s.invoiceScan.name || 'rahunok') + '" target="_blank" rel="noopener">📎 ' + esc(s.invoiceScan.name || 'Відкрити файл') + '</a></div>'
          : '') +
        '<div class="fg m16">' +
        (canEdit() ? '<button class="btn bp" type="button" onclick="Fleet.closeServiceDetail();Fleet.editService(\'' + s.id + '\')">Редагувати</button> ' : '') +
        '<button class="btn bs" type="button" onclick="Fleet.closeServiceDetail()">Закрити</button></div>';
    }
    const m = document.getElementById('svc-detail-modal');
    if (m) m.classList.add('open');
  }
  function closeServiceDetail() {
    const m = document.getElementById('svc-detail-modal');
    if (m) m.classList.remove('open');
  }
  function exportService() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const data = [['Дата', 'Номер', 'Модель', 'Статус', 'Тип сервісу', 'Тип рядка', 'Найменування', 'Од.', 'К-сть', 'Ціна', 'Сума рядка', 'Договір', 'Рахунок СТО', 'Вартість всього', 'Пробіг', 'СТО', 'Примітка']];
    (db.service || []).filter(s => inPeriod(s.date)).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(s => {
      const v = vehById(s.vehicleId);
      const wb = workStatusBadge(s.workStatus || 'done');
      const lines = Array.isArray(s.lines) && s.lines.length ? s.lines : [{ kind: 'work', name: s.description || '', unit: '', qty: '', price: '', sum: s.cost || 0 }];
      lines.forEach(ln => {
        data.push([
          s.date, v ? v.plate : '', v ? vehTitle(v) : '', wb.text, SVC_TYPES[s.type] || s.type || '',
          ln.kind === 'material' ? 'Матеріал' : 'Робота', ln.name || '', ln.unit || '',
          ln.qty, ln.price, ln.sum, contractLabel(s.contractId), s.invoice || '',
          s.cost || 0, s.odometer != null ? s.odometer : '', s.vendor || '', s.note || ''
        ]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Сервіс');
    XLSX.writeFile(wb, 'nexus-fleet-service.xlsx');
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('fleet')) return;
    if (!initAuth()) return;
    initTheme();
    initTabs();
    fillEmployeeSelect();
    fillVehicleSelects();
    resetVehicle();
    resetFuel();
    setPeriodMonth();
    if (window.NexusCore && NexusCore.enforceReadOnly) NexusCore.enforceReadOnly();
  }

  return {
    init, logout, toggleVehForm, openVehicleForm, closeVehicleForm, saveVehicle, resetVehicle, editVehicle, delVehicle,
    renderVehicles, exportVehicles, openFuelForm, closeFuelForm, saveFuel, resetFuel, editFuel, delFuel, renderFuel, exportFuel,
    openCardForm, closeCardForm, saveCard, editCard, delCard, renderCards, importOkko,
    openServiceForm, closeServiceForm, saveService, editService, delService, renderService, exportService,
    openServiceDetail, closeServiceDetail, addServiceLine, removeServiceLine, recalcServiceLines,
    applyPeriod, setPeriodMonth, setPeriodAll, exportPeriodReport, exportDriverFuelReport, setFuelVehicle,
    onInvoiceScanChange, clearInvoiceScan, openCardLinkWizard, closeCardLinkWizard, saveCardLinkWizard, onServiceVendorPick, fillServiceVendorSelect
  };
})();
window.Fleet = Fleet;
document.addEventListener('DOMContentLoaded', () => {
  try { Fleet.init(); } catch (e) { console.error(e); alert('Помилка: ' + e.message); }
});
