/* NEXUS — Склад (warehouse full module) */
const WH = (() => {
  'use strict';

  const SESSION_KEY = 'nexus_session_v1';
  const USERS_KEY = 'nexus_users_v1';
  const WH_KEY = 'nexus_warehouse_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let db = loadDB();
  let editingItemId = null;
  let currentTab = 'stock';

  const CATS = {
    materials: 'Матеріали',
    consumables: 'Витратні',
    tools: 'Інструмент',
    spare: 'Запчастини',
    other: 'Інше'
  };
  const MOVE = {
    in: { name: 'Прихід', icon: '➕', cls: 'bg-g' },
    out: { name: 'Витрата', icon: '➖', cls: 'bg-r' },
    adjust: { name: 'Інвентаризація', icon: '⚖️', cls: 'bg-b' }
  };
  const ORDER_ST = {
    draft: { name: 'Чернетка', cls: 'bg-gr', icon: '✏️' },
    pending_approval: { name: 'На узгодженні', cls: 'bg-o', icon: '⏳' },
    approved: { name: 'Узгоджено', cls: 'bg-g', icon: '✔️' },
    ordered: { name: 'Замовлено', cls: 'bg-b', icon: '🛒' },
    partial: { name: 'Частково', cls: 'bg-o', icon: '📦' },
    received: { name: 'Отримано', cls: 'bg-g', icon: '✅' },
    cancelled: { name: 'Скасовано', cls: 'bg-r', icon: '❌' }
  };
  const APPROVER_ROLES = {
    pm: { key: 'pm', label: 'Менеджер проєкту' },
    director: { key: 'director', label: 'Директор фірми' },
    cfo: { key: 'cfo', label: 'Фінансовий директор' }
  };
  function emptyApprovals() {
    return {
      pm: { approved: false, by: '', at: '', note: '' },
      director: { approved: false, by: '', at: '', note: '' },
      cfo: { approved: false, by: '', at: '', note: '' }
    };
  }
  function allApproved(o) {
    const a = o && o.approvals ? o.approvals : emptyApprovals();
    return !!(a.pm && a.pm.approved && a.director && a.director.approved && a.cfo && a.cfo.approved);
  }
  function ensureApprovals(o) {
    if (!o.approvals) o.approvals = emptyApprovals();
    ['pm', 'director', 'cfo'].forEach(k => {
      if (!o.approvals[k]) o.approvals[k] = { approved: false, by: '', at: '', note: '' };
    });
    return o.approvals;
  }
  let editingOrderId = null;
  let orderLineSeq = 0;

  function loadDB() {
    try {
      const r = localStorage.getItem(WH_KEY);
      if (r) {
        const p = JSON.parse(r);
        if (p && Array.isArray(p.items)) {
          if (!Array.isArray(p.moves)) p.moves = [];
          if (!Array.isArray(p.orders)) p.orders = [];
          if (!Array.isArray(p.warehouses)) p.warehouses = [];
          return p;
        }
      }
    } catch (e) {}
    return { items: [], moves: [], orders: [], warehouses: [], meta: { version: '1.0', created: today() } };
  }
  function saveDB() {
    try { localStorage.setItem(WH_KEY, JSON.stringify(db)); } catch (e) {}
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fN(n) {
    return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 3 }).format(Number(n) || 0);
  }
  function fD(s) {
    if (!s) return '—';
    const p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }
  function norm(s) { return String(s || '').toLowerCase().trim(); }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) { localStorage.removeItem(SESSION_KEY); return null; }
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) { return null; }
  }
  function canEdit() {
    const u = getCurrentUser();
    return !!(u && u.role !== 'viewer');
  }
  function denyEdit() { alert('Режим перегляду: зміни недоступні'); }

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

  function itemById(id) { return (db.items || []).find(x => x.id === id); }

  /** Balance from movements */
  function stockOf(itemId, warehouseId) {
    let moves = (db.moves || []).filter(m => m.itemId === itemId);
    if (warehouseId) moves = moves.filter(m => m.warehouseId === warehouseId);
    moves = moves.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    let q = 0;
    moves.forEach(m => {
      if (m.type === 'in') q += Number(m.qty) || 0;
      else if (m.type === 'out') q -= Number(m.qty) || 0;
      else if (m.type === 'adjust') q = Number(m.qty) || 0;
    });
    return Math.round(q * 1000) / 1000;
  }

  function supplierName(id) {
    if (!id || !window.NexusCore || !NexusCore.getCrmClient) return '—';
    const c = NexusCore.getCrmClient(id);
    return c ? c.name : '—';
  }

  function ensureWarehouses() {
    if (!Array.isArray(db.warehouses)) db.warehouses = [];
    if (!db.warehouses.length) {
      const id = uid('wloc');
      db.warehouses.push({
        id, name: 'Основний склад', city: '', address: '', notes: 'Створено автоматично',
        createdAt: today(), updatedAt: today()
      });
      // migrate old moves without warehouseId
      (db.moves || []).forEach(m => { if (!m.warehouseId) m.warehouseId = id; });
      (db.orders || []).forEach(o => { if (!o.warehouseId) o.warehouseId = id; });
      saveDB();
    }
  }
  function warehouseById(id) { return (db.warehouses || []).find(w => w.id === id); }
  function warehouseLabel(id) {
    const w = warehouseById(id);
    if (!w) return '—';
    return w.name + (w.city ? ' (' + w.city + ')' : '');
  }
  function getHRDB() {
    try {
      const h = JSON.parse(localStorage.getItem('nexus_hr_ua_v2') || '{}');
      return h && typeof h === 'object' ? h : {};
    } catch (e) { return {}; }
  }
  function getDepartments() {
    const list = getHRDB().departments || [];
    return Array.isArray(list) ? list.filter(d => d && d.id) : [];
  }
  function getEmployees() {
    const list = getHRDB().employees || getHRDB().staff || [];
    return Array.isArray(list) ? list.filter(e => e && e.id) : [];
  }
  function empName(id) {
    if (!id) return '—';
    const e = getEmployees().find(x => x.id === id);
    return e ? (e.fullName || e.name || '—') : '—';
  }
  function deptName(id) {
    if (!id) return '—';
    const d = getDepartments().find(x => x.id === id);
    if (!d) return '—';
    return (d.code ? d.code + ' · ' : '') + (d.name || '');
  }
  function fillDeptSelect(selected) {
    const sel = document.getElementById('m-dept');
    if (!sel) return;
    const deps = getDepartments().slice().sort((a, b) =>
      String(a.code || a.name || '').localeCompare(String(b.code || b.name || ''), 'uk')
    );
    sel.innerHTML = '<option value="">— оберіть відділ —</option>' +
      deps.map(d => '<option value="' + esc(d.id) + '">' + esc((d.code ? d.code + ' · ' : '') + (d.name || '')) + '</option>').join('');
    if (selected) sel.value = selected;
  }
  function onDeptChange() {
    const depId = document.getElementById('m-dept')?.value || '';
    fillEmployeeSelect('', depId);
  }
  function fillWarehouseSelects(selected) {
    const list = (db.warehouses || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'uk'));
    const html = '<option value="">— оберіть склад —</option>' +
      list.map(w => '<option value="' + esc(w.id) + '">' + esc(w.name) + (w.city ? ' · ' + esc(w.city) : '') + '</option>').join('');
    ['m-warehouse', 'o-warehouse', 'stock-wh'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const isFilter = id === 'stock-wh';
      const cur = selected != null ? selected : sel.value;
      sel.innerHTML = isFilter
        ? ('<option value="">Усі склади</option>' + list.map(w => '<option value="' + esc(w.id) + '">' + esc(w.name) + (w.city ? ' · ' + esc(w.city) : '') + '</option>').join(''))
        : html;
      if (cur) sel.value = cur;
      if (!isFilter && !sel.value && list.length === 1) sel.value = list[0].id;
    });
  }
  function fillEmployeeSelect(selected, departmentId) {
    const sel = document.getElementById('m-recv-emp');
    if (!sel) return;
    const depId = departmentId != null ? departmentId : (document.getElementById('m-dept')?.value || '');
    let emps = getEmployees().slice();
    if (depId) {
      emps = emps.filter(e => (e.departmentId || '') === depId);
    }
    emps.sort((a, b) => String(a.fullName || a.name || '').localeCompare(String(b.fullName || b.name || ''), 'uk'));
    if (!emps.length) {
      sel.innerHTML = depId
        ? '<option value="">— у цьому відділі немає співробітників —</option>'
        : '<option value="">— оберіть відділ або співробітника —</option>';
    } else {
      sel.innerHTML = '<option value="">— оберіть —</option>' +
        emps.map(e => '<option value="' + esc(e.id) + '">' + esc(e.fullName || e.name || '') +
          (e.position ? ' · ' + esc(e.position) : '') + '</option>').join('');
    }
    if (selected) sel.value = selected;
  }
  function fillRecvCrmSelect(selected) {
    const sel = document.getElementById('m-recv-crm');
    if (!sel) return;
    let list = [];
    if (window.NexusCore && NexusCore.getCrmClients) {
      list = NexusCore.getCrmClients('supplier');
      if (!list.length) list = NexusCore.getCrmClients();
    }
    sel.innerHTML = '<option value="">— оберіть —</option>' +
      list.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('');
    if (selected) sel.value = selected;
  }


  function fillCatFilters() {
    ['stock-cat', 'item-cat'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const v = sel.value;
      sel.innerHTML = '<option value="">Усі категорії</option>' +
        Object.keys(CATS).map(k => '<option value="' + k + '">' + CATS[k] + '</option>').join('');
      sel.value = v;
    });
  }

  function fillSupplierSelects() {
    const opts = () => {
      if (window.NexusCore && NexusCore.getCrmClients) {
        return NexusCore.getCrmClients('supplier').concat(
          NexusCore.getCrmClients().filter(c => (c.role || '') === 'both')
        ).filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
      }
      return [];
    };
    const list = opts();
    ['i-supplier', 'm-supplier', 'o-supplier'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="">— не вказано —</option>' +
        list.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + (c.edrpou ? ' · ' + esc(c.edrpou) : '') + '</option>').join('');
      if (cur) sel.value = cur;
    });
  }

  function fillItemSelect(selected) {
    const sel = document.getElementById('m-item');
    if (!sel) return;
    const list = (db.items || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    sel.innerHTML = '<option value="">— оберіть —</option>' +
      list.map(i => '<option value="' + esc(i.id) + '">' + esc(i.name) + (i.sku ? ' [' + esc(i.sku) + ']' : '') + ' · ' + fN(stockOf(i.id)) + ' ' + esc(i.unit || 'шт') + '</option>').join('');
    if (selected) sel.value = selected;
  }

  function fillProjectSelect() {
    const sel = document.getElementById('m-project');
    if (!sel) return;
    if (window.NexusCore && NexusCore.fillProjectSelect) {
      NexusCore.fillProjectSelect(sel, sel.value || '');
    }
  }

  function tab(name) {
    currentTab = name;
    document.querySelectorAll('.nb').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === name));
    document.querySelectorAll('.tp').forEach(s => {
      s.style.display = s.id === 'tab-' + name ? '' : 'none';
    });
    if (name === 'stock') renderStock();
    if (name === 'items') renderItems();
    if (name === 'moves') renderMoves();
    if (name === 'orders') renderOrders();
    if (name === 'warehouses') renderWarehouses();
  }

  /* ---- Items ---- */
  function openItem() {
    if (!canEdit()) return denyEdit();
    editingItemId = null;
    document.getElementById('item-form-title').textContent = 'Нова позиція';
    document.getElementById('i-name').value = '';
    document.getElementById('i-sku').value = '';
    document.getElementById('i-unit').value = 'шт';
    document.getElementById('i-cat').value = 'materials';
    document.getElementById('i-min').value = 0;
    document.getElementById('i-price').value = 0;
    fillSupplierSelects();
    document.getElementById('i-supplier').value = '';
    document.getElementById('i-notes').value = '';
    document.getElementById('item-modal').classList.add('open');
  }
  function closeItem() {
    document.getElementById('item-modal').classList.remove('open');
    editingItemId = null;
  }
  function editItem(id) {
    if (!canEdit()) return denyEdit();
    const it = itemById(id);
    if (!it) return;
    editingItemId = id;
    document.getElementById('item-form-title').textContent = 'Редагувати позицію';
    document.getElementById('i-name').value = it.name || '';
    document.getElementById('i-sku').value = it.sku || '';
    document.getElementById('i-unit').value = it.unit || 'шт';
    document.getElementById('i-cat').value = it.category || 'materials';
    document.getElementById('i-min').value = it.minStock || 0;
    document.getElementById('i-price').value = it.price || 0;
    fillSupplierSelects();
    document.getElementById('i-supplier').value = it.supplierId || '';
    document.getElementById('i-notes').value = it.notes || '';
    document.getElementById('item-modal').classList.add('open');
  }
  function saveItem() {
    if (!canEdit()) return denyEdit();
    const name = (document.getElementById('i-name')?.value || '').trim();
    if (!name) { alert('Вкажіть назву'); return; }
    const sku = (document.getElementById('i-sku')?.value || '').trim();
    if (sku) {
      const dup = (db.items || []).find(x => x.id !== editingItemId && norm(x.sku) === norm(sku));
      if (dup) { alert('Артикул уже є: ' + dup.name); return; }
    }
    const item = {
      id: editingItemId || uid('wh'),
      name,
      sku,
      unit: document.getElementById('i-unit')?.value || 'шт',
      category: document.getElementById('i-cat')?.value || 'materials',
      minStock: Number(document.getElementById('i-min')?.value) || 0,
      price: Number(document.getElementById('i-price')?.value) || 0,
      supplierId: document.getElementById('i-supplier')?.value || '',
      notes: (document.getElementById('i-notes')?.value || '').trim(),
      updatedAt: today(),
      createdAt: editingItemId ? (itemById(editingItemId)?.createdAt || today()) : today()
    };
    if (editingItemId) {
      const i = db.items.findIndex(x => x.id === editingItemId);
      if (i >= 0) db.items[i] = item;
    } else db.items.push(item);
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit(editingItemId ? 'warehouse.item.update' : 'warehouse.item.create', 'warehouse', { id: item.id, name: item.name });
    closeItem();
    renderAll();
  }
  function delItem(id) {
    if (!canEdit()) return denyEdit();
    const it = itemById(id);
    if (!it) return;
    const used = (db.moves || []).some(m => m.itemId === id);
    if (used && !confirm('По позиції є рух. Видалити позицію і весь її рух?')) return;
    if (!used && !confirm('Видалити «' + it.name + '»?')) return;
    db.items = db.items.filter(x => x.id !== id);
    db.moves = (db.moves || []).filter(m => m.itemId !== id);
    saveDB();
    renderAll();
  }

  /* ---- Moves ---- */
  function openMove(type) {
    if (!canEdit()) return denyEdit();
    ensureWarehouses();
    if (!(db.items || []).length) {
      alert('Спочатку додайте номенклатуру (вкладка «Номенклатура»)');
      tab('items');
      return;
    }
    if (!(db.warehouses || []).length) {
      alert('Спочатку додайте склад (вкладка «Склади»)');
      tab('warehouses');
      return;
    }
    document.getElementById('move-form-title').textContent = (MOVE[type] || MOVE.in).name;
    document.getElementById('m-type').value = type || 'in';
    document.getElementById('m-qty').value = 1;
    document.getElementById('m-date').value = today();
    document.getElementById('m-doc').value = '';
    document.getElementById('m-note').value = '';
    const site = document.getElementById('m-site'); if (site) site.value = '';
    fillWarehouseSelects('');
    fillItemSelect('');
    fillSupplierSelects();
    fillDeptSelect('');
    fillEmployeeSelect('', '');
    fillRecvCrmSelect('');
    fillProjectSelect();
    const rt = document.getElementById('m-recv-type'); if (rt) rt.value = 'employee';
    onRecvType();
    onMoveType();
    document.getElementById('move-modal').classList.add('open');
  }
  function closeMove() {
    document.getElementById('move-modal').classList.remove('open');
  }
  function onMoveType() {
    const t = document.getElementById('m-type')?.value || 'in';
    const sw = document.getElementById('m-supplier-wrap');
    const out = document.getElementById('m-out-block');
    const ql = document.getElementById('m-qty-label');
    if (sw) sw.style.display = t === 'in' ? '' : 'none';
    if (out) out.style.display = t === 'out' ? '' : 'none';
    if (ql) ql.innerHTML = t === 'adjust' ? 'Фактичний залишок <span class="rq">*</span>' : 'Кількість <span class="rq">*</span>';
  }
  function onRecvType() {
    const t = document.getElementById('m-recv-type')?.value || 'employee';
    const ew = document.getElementById('m-recv-emp-wrap');
    const cw = document.getElementById('m-recv-crm-wrap');
    if (ew) ew.style.display = t === 'employee' ? '' : 'none';
    if (cw) cw.style.display = t === 'contractor' ? '' : 'none';
  }
  function saveMove() {
    if (!canEdit()) return denyEdit();
    const itemId = document.getElementById('m-item')?.value || '';
    const warehouseId = document.getElementById('m-warehouse')?.value || '';
    if (!warehouseId) { alert('Оберіть склад'); return; }
    if (!itemId) { alert('Оберіть позицію'); return; }
    const type = document.getElementById('m-type')?.value || 'in';
    const qty = Number(document.getElementById('m-qty')?.value);
    if (!(qty >= 0) || (type !== 'adjust' && !(qty > 0))) { alert('Вкажіть коректну кількість'); return; }
    if (type === 'out') {
      const bal = stockOf(itemId, warehouseId);
      if (qty > bal + 1e-9) {
        if (!confirm('Видача ' + qty + ' більша за залишок на складі (' + bal + '). Продовжити?')) return;
      }
      const recvType = document.getElementById('m-recv-type')?.value || 'employee';
      if (recvType === 'employee' && !document.getElementById('m-recv-emp')?.value) {
        alert('Вкажіть, хто забирає (співробітник)'); return;
      }
      if (recvType === 'contractor' && !document.getElementById('m-recv-crm')?.value) {
        alert('Вкажіть підрядника, який забирає'); return;
      }
    }
    const u = getCurrentUser();
    const recvType = document.getElementById('m-recv-type')?.value || 'employee';
    const move = {
      id: uid('mv'),
      itemId,
      warehouseId,
      type,
      qty,
      date: document.getElementById('m-date')?.value || today(),
      docNum: (document.getElementById('m-doc')?.value || '').trim(),
      supplierId: type === 'in' ? (document.getElementById('m-supplier')?.value || '') : '',
      departmentId: type === 'out' ? (document.getElementById('m-dept')?.value || '') : '',
      department: type === 'out' ? deptName(document.getElementById('m-dept')?.value || '') : '',
      siteCode: type === 'out' ? (document.getElementById('m-site')?.value || '').trim() : '',
      projectId: type === 'out' ? (document.getElementById('m-project')?.value || '') : '',
      recipientType: type === 'out' ? recvType : '',
      recipientId: type === 'out' ? (recvType === 'employee' ? (document.getElementById('m-recv-emp')?.value || '') : (document.getElementById('m-recv-crm')?.value || '')) : '',
      note: (document.getElementById('m-note')?.value || '').trim(),
      userName: u ? (u.fullName || u.username) : '',
      createdAt: today()
    };
    if (!db.moves) db.moves = [];
    db.moves.push(move);
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('warehouse.move.' + type, 'warehouse', { itemId, warehouseId, qty, id: move.id });
    closeMove();
    renderAll();
  }

  function delMove(id) {

    if (!canEdit()) return denyEdit();
    if (!confirm('Видалити запис руху? Залишок перерахується.')) return;
    db.moves = (db.moves || []).filter(m => m.id !== id);
    saveDB();
    renderAll();
  }


  /* ---- Orders ---- */
  function orderById(id) { return (db.orders || []).find(x => x.id === id); }

  function addOrderLine(itemId, qty, price) {
    const box = document.getElementById('o-lines');
    if (!box) return;
    orderLineSeq++;
    const lid = 'ol_' + orderLineSeq;
    const items = (db.items || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const opts = items.map(i => '<option value="' + esc(i.id) + '"' + (itemId === i.id ? ' selected' : '') + '>' + esc(i.name) + (i.sku ? ' [' + esc(i.sku) + ']' : '') + '</option>').join('');
    const row = document.createElement('div');
    row.className = 'wh-grid';
    row.id = lid;
    row.style.marginBottom = '8px';
    row.style.padding = '10px';
    row.style.border = '1px solid var(--border)';
    row.style.borderRadius = '10px';
    row.innerHTML =
      '<div class="ff" style="grid-column:span 2"><label>Позиція</label><select class="ol-item"><option value="">—</option>' + opts + '</select></div>' +
      '<div class="ff"><label>К-сть</label><input type="number" class="ol-qty" min="0.001" step="0.01" value="' + (qty || 1) + '"></div>' +
      '<div class="ff"><label>Ціна ₴</label><input type="number" class="ol-price" min="0" step="0.01" value="' + (price || 0) + '"></div>' +
      '<div class="ff" style="grid-column:1/-1"><button type="button" class="btn bd bxs" onclick="document.getElementById(\'' + lid + '\').remove()">× прибрати</button></div>';
    box.appendChild(row);
    if (itemId) {
      const sel = row.querySelector('.ol-item');
      if (sel) sel.value = itemId;
    }
  }

  function collectOrderLines() {
    const rows = document.querySelectorAll('#o-lines [id^="ol_"]');
    const lines = [];
    rows.forEach(row => {
      const itemId = row.querySelector('.ol-item')?.value || '';
      const qty = Number(row.querySelector('.ol-qty')?.value) || 0;
      const price = Number(row.querySelector('.ol-price')?.value) || 0;
      if (itemId && qty > 0) lines.push({ itemId, qty, price, receivedQty: 0 });
    });
    return lines;
  }

  function openOrder() {
    if (!canEdit()) return denyEdit();
    if (!(db.items || []).length) {
      alert('Спочатку додайте номенклатуру');
      tab('items');
      return;
    }
    editingOrderId = null;
    document.getElementById('order-form-title').textContent = 'Нове замовлення';
    document.getElementById('o-date').value = today();
    document.getElementById('o-status').value = 'draft';
    document.getElementById('o-num').value = '';
    document.getElementById('o-eta').value = '';
    document.getElementById('o-note').value = '';
    fillSupplierSelects();
    fillWarehouseSelects('');
    if (window.NexusCore && NexusCore.fillProjectSelect) {
      NexusCore.fillProjectSelect(document.getElementById('o-project'), '');
    }
    document.getElementById('o-supplier').value = '';
    document.getElementById('o-lines').innerHTML = '';
    orderLineSeq = 0;
    addOrderLine();
    renderApprovalBox(null);
    document.getElementById('order-modal').classList.add('open');
  }

  function closeOrder() {
    document.getElementById('order-modal').classList.remove('open');
    editingOrderId = null;
  }

  function editOrder(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'received' || o.status === 'cancelled') {
      alert('Це замовлення вже завершене і не редагується. Можна лише переглянути в списку.');
      return;
    }
    editingOrderId = id;
    document.getElementById('order-form-title').textContent = 'Редагувати замовлення';
    document.getElementById('o-date').value = o.date || today();
    let st = o.status || 'draft';
    if (st === 'partial' || st === 'received') st = 'ordered';
    document.getElementById('o-status').value = st;
    document.getElementById('o-num').value = o.num || '';
    document.getElementById('o-eta').value = o.eta || '';
    document.getElementById('o-note').value = o.note || '';
    fillSupplierSelects();
    fillWarehouseSelects(o.warehouseId || '');
    if (window.NexusCore && NexusCore.fillProjectSelect) {
      NexusCore.fillProjectSelect(document.getElementById('o-project'), o.projectId || '');
    }
    document.getElementById('o-supplier').value = o.supplierId || '';
    document.getElementById('o-lines').innerHTML = '';
    orderLineSeq = 0;
    (o.lines || []).forEach(l => addOrderLine(l.itemId, l.qty, l.price));
    if (!(o.lines || []).length) addOrderLine();
    renderApprovalBox(o);
    document.getElementById('order-modal').classList.add('open');
  }

  function saveOrder() {
    if (!canEdit()) return denyEdit();
    const supplierId = document.getElementById('o-supplier')?.value || '';
    if (!supplierId) { alert('Оберіть постачальника з CRM'); return; }
    const lines = collectOrderLines();
    if (!lines.length) { alert('Додайте хоча б одну позицію'); return; }
    // preserve receivedQty on edit
    if (editingOrderId) {
      const prev = orderById(editingOrderId);
      if (prev && prev.lines) {
        lines.forEach(l => {
          const old = prev.lines.find(x => x.itemId === l.itemId);
          if (old) l.receivedQty = Number(old.receivedQty) || 0;
        });
      }
    }
    const warehouseId = document.getElementById('o-warehouse')?.value || '';
    if (!warehouseId) { alert('Оберіть склад оприбуткування'); return; }
    let status = document.getElementById('o-status')?.value || 'draft';
    const prev = editingOrderId ? orderById(editingOrderId) : null;
    const approvals = prev ? ensureApprovals(prev) : emptyApprovals();
    if (status === 'ordered' && !allApproved({ approvals })) {
      alert('Не можна встановити «Замовлено»: потрібні всі 3 узгодження (менеджер проєкту, директор, фін. директор).\nСпочатку статус «На узгодженні», потім підтвердження.');
      return;
    }
    if (status === 'approved' && !allApproved({ approvals })) {
      status = 'pending_approval';
    }
    if (allApproved({ approvals }) && (status === 'pending_approval' || status === 'draft')) {
      status = 'approved';
    }
    const order = {
      id: editingOrderId || uid('ord'),
      date: document.getElementById('o-date')?.value || today(),
      status,
      supplierId,
      warehouseId,
      projectId: document.getElementById('o-project')?.value || '',
      approvals: JSON.parse(JSON.stringify(approvals)),
      num: (document.getElementById('o-num')?.value || '').trim(),
      eta: document.getElementById('o-eta')?.value || '',
      note: (document.getElementById('o-note')?.value || '').trim(),
      lines,
      updatedAt: today(),
      createdAt: editingOrderId ? (orderById(editingOrderId)?.createdAt || today()) : today()
    };
    if (!db.orders) db.orders = [];
    if (editingOrderId) {
      const i = db.orders.findIndex(x => x.id === editingOrderId);
      if (i >= 0) {
        // keep status if partial
        if (db.orders[i].status === 'partial' || db.orders[i].status === 'received') {
          order.status = db.orders[i].status;
        }
        db.orders[i] = order;
      }
    } else db.orders.push(order);
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit(editingOrderId ? 'warehouse.order.update' : 'warehouse.order.create', 'warehouse', { id: order.id });
    closeOrder();
    renderAll();
  }

  function delOrder(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'received') { alert('Отримане замовлення не видаляється (історія приходів збережена в русі).'); return; }
    if (!confirm('Видалити замовлення?')) return;
    db.orders = (db.orders || []).filter(x => x.id !== id);
    saveDB();
    renderAll();
  }

  /** Оприбуткувати замовлення (повністю або залишкові кількості) */
  function receiveOrder(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'cancelled') { alert('Замовлення скасовано'); return; }
    if (o.status === 'received') { alert('Уже повністю отримано'); return; }
    if (o.status !== 'ordered' && o.status !== 'partial') {
      alert('Оприбуткувати можна лише після статусу «Замовлено» (після всіх узгоджень і замовлення у постачальника).');
      return;
    }
    const pending = (o.lines || []).map(l => {
      const left = (Number(l.qty) || 0) - (Number(l.receivedQty) || 0);
      return { ...l, left };
    }).filter(l => l.left > 0);
    if (!pending.length) {
      o.status = 'received';
      saveDB();
      renderAll();
      return;
    }
    ensureWarehouses();
    let warehouseId = o.warehouseId || '';
    if (!warehouseId && (db.warehouses || []).length) warehouseId = db.warehouses[0].id;
    if (!warehouseId) { alert('Немає складу для оприбуткування. Додайте склад.'); return; }
    if (!confirm('Оприбуткувати на «' + warehouseLabel(warehouseId) + '» ' + pending.length + ' позицій?')) return;
    if (!db.moves) db.moves = [];
    const u = getCurrentUser();
    pending.forEach(l => {
      db.moves.push({
        id: uid('mv'),
        itemId: l.itemId,
        warehouseId,
        type: 'in',
        qty: l.left,
        date: today(),
        docNum: o.num || ('Зам. ' + o.id),
        supplierId: o.supplierId || '',
        projectId: '',
        note: 'Оприбуткування замовлення' + (o.num ? ' №' + o.num : ''),
        orderId: o.id,
        userName: u ? (u.fullName || u.username) : '',
        createdAt: today()
      });
      const line = o.lines.find(x => x.itemId === l.itemId);
      if (line) line.receivedQty = (Number(line.receivedQty) || 0) + l.left;
    });
    const still = (o.lines || []).some(l => (Number(l.qty) || 0) > (Number(l.receivedQty) || 0));
    o.status = still ? 'partial' : 'received';
    o.updatedAt = today();
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('warehouse.order.receive', 'warehouse', { id: o.id, status: o.status });
    alert('✅ Оприбутковано на склад');
    renderAll();
  }

  function cancelOrder(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'received') { alert('Не можна скасувати отримане'); return; }
    if (!confirm('Скасувати замовлення?')) return;
    o.status = 'cancelled';
    o.updatedAt = today();
    saveDB();
    renderAll();
  }


  function renderApprovalBox(o) {
    const el = document.getElementById('o-approvals-status');
    if (!el) return;
    if (!o || !o.id) {
      el.innerHTML = 'Після збереження чернетки натисніть «На узгодження», потім зберіть 3 підписи.';
      return;
    }
    ensureApprovals(o);
    const roles = ['pm', 'director', 'cfo'];
    let h = '<div style="display:flex;flex-direction:column;gap:8px">';
    roles.forEach(k => {
      const a = o.approvals[k];
      const meta = APPROVER_ROLES[k];
      if (a.approved) {
        h += '<div>✅ <b>' + esc(meta.label) + '</b> — ' + esc(a.by || '—') +
          (a.at ? ' <span class="tmu">(' + esc(String(a.at).slice(0, 16).replace('T', ' ')) + ')</span>' : '') +
          (a.note ? '<div class="tmu">' + esc(a.note) + '</div>' : '') + '</div>';
      } else {
        h += '<div>⏳ <b>' + esc(meta.label) + '</b> — очікує підтвердження цін і замовлення</div>';
      }
    });
    h += '</div>';
    if (allApproved(o)) h += '<div style="margin-top:8px;color:var(--success);font-weight:700">Усі узгодження зібрано — можна замовляти у постачальника.</div>';
    el.innerHTML = h;
  }

  function submitForApproval(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'cancelled' || o.status === 'received') return;
    if (!(o.lines || []).length) { alert('Немає позицій'); return; }
    const missingPrice = (o.lines || []).some(l => !(Number(l.price) > 0));
    if (missingPrice && !confirm('Деякі позиції без ціни. Відправити на узгодження все одно?')) return;
    ensureApprovals(o);
    o.status = 'pending_approval';
    o.updatedAt = today();
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('warehouse.order.submit_approval', 'warehouse', { id: o.id });
    renderAll();
    alert('Замовлення на узгодженні. Потрібні 3 підтвердження.');
  }

  function approveOrder(id, roleKey) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (o.status === 'cancelled') { alert('Замовлення скасовано'); return; }
    if (o.status === 'draft') { alert('Спочатку відправте на узгодження'); return; }
    if (!APPROVER_ROLES[roleKey]) return;
    ensureApprovals(o);
    if (o.approvals[roleKey].approved) {
      alert('Це узгодження вже стоїть: ' + (o.approvals[roleKey].by || ''));
      return;
    }
    const role = APPROVER_ROLES[roleKey].label;
    const u = getCurrentUser();
    const who = u ? (u.fullName || u.username) : '';
    const note = prompt('Узгодження: ' + role + '\\nПідтверджуєте замовлення та ціни матеріалів?\\n\\nКоментар (необов’язково):', '');
    if (note === null) return; // cancelled prompt
    o.approvals[roleKey] = {
      approved: true,
      by: who || role,
      at: new Date().toISOString(),
      note: String(note || '').trim(),
      userId: u ? u.id : ''
    };
    if (allApproved(o)) {
      if (o.status === 'pending_approval' || o.status === 'draft') o.status = 'approved';
    } else {
      o.status = 'pending_approval';
    }
    o.updatedAt = today();
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('warehouse.order.approve', 'warehouse', { id: o.id, role: roleKey, by: who });
    renderAll();
    if (allApproved(o)) alert('✅ Усі 3 узгодження зібрано. Тепер можна натиснути «Замовити».');
    else alert('✅ Узгодження «' + role + '» збережено');
  }

  function markOrdered(id) {
    if (!canEdit()) return denyEdit();
    const o = orderById(id);
    if (!o) return;
    if (!allApproved(o)) {
      alert('Спочатку потрібні всі 3 узгодження');
      return;
    }
    if (!confirm('Підтвердити, що замовлення відправлено постачальнику?')) return;
    o.status = 'ordered';
    o.updatedAt = today();
    saveDB();
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('warehouse.order.ordered', 'warehouse', { id: o.id });
    renderAll();
  }

  function renderOrders() {
    renderStats();
    const el = document.getElementById('order-list');
    if (!el) return;
    const st = document.getElementById('order-status')?.value || '';
    const q = norm(document.getElementById('order-q')?.value);
    let list = (db.orders || []).slice();
    if (st) list = list.filter(o => o.status === st);
    if (q) list = list.filter(o => {
      const sup = supplierName(o.supplierId);
      return norm(o.num).includes(q) || norm(sup).includes(q) || norm(o.note).includes(q);
    });
    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const cnt = document.getElementById('order-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Замовлень немає. Створіть перше — оберіть постачальника з CRM і позиції зі складу.</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Дата</th><th>№</th><th>Постачальник</th><th>Статус</th><th>Позиції</th><th>Сума ₴</th><th></th></tr></thead><tbody>';
    list.forEach(o => {
      const stMeta = ORDER_ST[o.status] || ORDER_ST.draft;
      const lines = o.lines || [];
      const sum = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
      const linesTxt = lines.map(l => {
        const it = itemById(l.itemId);
        const rec = Number(l.receivedQty) || 0;
        return (it ? it.name : '?') + ' × ' + fN(l.qty) + (rec ? ' (отр. ' + fN(rec) + ')' : '');
      }).join('; ');
      h += '<tr>';
      h += '<td>' + fD(o.date) + (o.eta ? '<div class="tsm tmu">очікується ' + fD(o.eta) + '</div>' : '') + '</td>';
      h += '<td class="tmn">' + esc(o.num || '—') + '</td>';
      h += '<td><b>' + esc(supplierName(o.supplierId)) + '</b></td>';
      ensureApprovals(o);
      const ap = o.approvals;
      const apHtml = '<div class="tsm tmu" style="margin-top:4px">' +
        (ap.pm.approved ? '✅' : '⬜') + 'PM ' +
        (ap.director.approved ? '✅' : '⬜') + 'DIR ' +
        (ap.cfo.approved ? '✅' : '⬜') + 'CFO</div>';
      h += '<td><span class="bg ' + stMeta.cls + '">' + stMeta.icon + ' ' + stMeta.name + '</span>' + apHtml + '</td>';
      h += '<td class="tsm">' + esc(linesTxt) + '</td>';
      h += '<td class="tmn">' + fN(Math.round(sum * 100) / 100) + '</td>';
      h += '<td style="white-space:nowrap">';
      if (ce && o.status !== 'received' && o.status !== 'cancelled') {
        ensureApprovals(o);
        if (o.status === 'draft') {
          h += '<button class="btn bp bxs" type="button" title="На узгодження" onclick="WH.submitForApproval(\'' + o.id + '\')">⏳</button> ';
        }
        if (o.status === 'pending_approval' || o.status === 'approved') {
          if (!o.approvals.pm.approved) h += '<button class="btn bs bxs" type="button" title="Менеджер проєкту" onclick="WH.approveOrder(\'' + o.id + '\',\'pm\')">PM</button> ';
          if (!o.approvals.director.approved) h += '<button class="btn bs bxs" type="button" title="Директор" onclick="WH.approveOrder(\'' + o.id + '\',\'director\')">DIR</button> ';
          if (!o.approvals.cfo.approved) h += '<button class="btn bs bxs" type="button" title="Фін. директор" onclick="WH.approveOrder(\'' + o.id + '\',\'cfo\')">CFO</button> ';
        }
        if (o.status === 'approved' && allApproved(o)) {
          h += '<button class="btn bp bxs" type="button" title="Замовити у постачальника" onclick="WH.markOrdered(\'' + o.id + '\')">🛒</button> ';
        }
        if (o.status === 'ordered' || o.status === 'partial') {
          h += '<button class="btn bp bxs" type="button" title="Оприбуткувати" onclick="WH.receiveOrder(\'' + o.id + '\')">📥</button> ';
        }
        if (o.status === 'draft' || o.status === 'pending_approval') {
          h += '<button class="btn bs bxs" type="button" onclick="WH.editOrder(\'' + o.id + '\')">✏️</button> ';
          h += '<button class="btn bd bxs" type="button" onclick="WH.delOrder(\'' + o.id + '\')">×</button> ';
        }
        h += '<button class="btn bs bxs" type="button" onclick="WH.cancelOrder(\'' + o.id + '\')">✕</button>';
      }
      h += '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function exportOrders() {
    if (!window.XLSX) return alert('SheetJS не завантажено');
    const data = [['Дата', '№', 'Постачальник', 'Статус', 'Позиція', 'К-сть', 'Ціна', 'Отримано', 'Сума', 'ETA', 'Примітка']];
    (db.orders || []).forEach(o => {
      const st = (ORDER_ST[o.status] || {}).name || o.status;
      const sup = supplierName(o.supplierId);
      (o.lines || []).forEach(l => {
        const it = itemById(l.itemId);
        data.push([
          o.date, o.num || '', sup, st, it ? it.name : '', l.qty, l.price || 0, l.receivedQty || 0,
          Math.round((Number(l.qty) || 0) * (Number(l.price) || 0) * 100) / 100, o.eta || '', o.note || ''
        ]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Замовлення');
    XLSX.writeFile(wb, 'nexus-warehouse-orders.xlsx');
  }


  let editingWhId = null;
  function openWarehouse() {
    if (!canEdit()) return denyEdit();
    editingWhId = null;
    document.getElementById('wh-form-title').textContent = 'Новий склад';
    document.getElementById('w-name').value = '';
    document.getElementById('w-city').value = '';
    document.getElementById('w-address').value = '';
    document.getElementById('w-notes').value = '';
    document.getElementById('wh-modal').classList.add('open');
  }
  function closeWarehouse() {
    document.getElementById('wh-modal').classList.remove('open');
    editingWhId = null;
  }
  function editWarehouse(id) {
    if (!canEdit()) return denyEdit();
    const w = warehouseById(id);
    if (!w) return;
    editingWhId = id;
    document.getElementById('wh-form-title').textContent = 'Редагувати склад';
    document.getElementById('w-name').value = w.name || '';
    document.getElementById('w-city').value = w.city || '';
    document.getElementById('w-address').value = w.address || '';
    document.getElementById('w-notes').value = w.notes || '';
    document.getElementById('wh-modal').classList.add('open');
  }
  function saveWarehouse() {
    if (!canEdit()) return denyEdit();
    const name = (document.getElementById('w-name')?.value || '').trim();
    const city = (document.getElementById('w-city')?.value || '').trim();
    if (!name) { alert('Вкажіть назву складу'); return; }
    if (!city) { alert('Вкажіть місто'); return; }
    const row = {
      id: editingWhId || uid('wloc'),
      name, city,
      address: (document.getElementById('w-address')?.value || '').trim(),
      notes: (document.getElementById('w-notes')?.value || '').trim(),
      updatedAt: today(),
      createdAt: editingWhId ? (warehouseById(editingWhId)?.createdAt || today()) : today()
    };
    if (!db.warehouses) db.warehouses = [];
    if (editingWhId) {
      const i = db.warehouses.findIndex(x => x.id === editingWhId);
      if (i >= 0) db.warehouses[i] = row;
    } else db.warehouses.push(row);
    saveDB();
    closeWarehouse();
    fillWarehouseSelects();
    renderAll();
  }
  function delWarehouse(id) {
    if (!canEdit()) return denyEdit();
    const used = (db.moves || []).some(m => m.warehouseId === id);
    if (used) { alert('Не можна видалити: по складу є рух матеріалів'); return; }
    if ((db.warehouses || []).length <= 1) { alert('Має залишитись хоча б один склад'); return; }
    if (!confirm('Видалити склад?')) return;
    db.warehouses = db.warehouses.filter(w => w.id !== id);
    saveDB();
    renderAll();
  }
  function renderWarehouses() {
    renderStats();
    const el = document.getElementById('wh-list');
    if (!el) return;
    const list = (db.warehouses || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const cnt = document.getElementById('wh-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Складів немає</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Назва</th><th>Місто</th><th>Адреса</th><th>Позицій з залишком</th><th></th></tr></thead><tbody>';
    list.forEach(w => {
      let n = 0;
      (db.items || []).forEach(it => { if (stockOf(it.id, w.id) > 0) n++; });
      h += '<tr><td><b>' + esc(w.name) + '</b></td><td>' + esc(w.city) + '</td><td>' + esc(w.address || '—') + '</td>';
      h += '<td class="tmn">' + n + '</td><td style="white-space:nowrap">';
      if (ce) {
        h += '<button class="btn bs bxs" type="button" onclick="WH.editWarehouse(\'' + w.id + '\')">✏️</button> ';
        h += '<button class="btn bd bxs" type="button" onclick="WH.delWarehouse(\'' + w.id + '\')">×</button>';
      }
      h += '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  /* ---- Render ---- */
  function renderStats() {
    const el = document.getElementById('stats');
    if (!el) return;
    const items = db.items || [];
    let low = 0, value = 0;
    items.forEach(it => {
      const s = stockOf(it.id);
      if (s < (Number(it.minStock) || 0)) low++;
      value += s * (Number(it.price) || 0);
    });
    const openOrders = (db.orders || []).filter(o => ['draft','pending_approval','approved','ordered','partial'].includes(o.status)).length;
    el.innerHTML =
      '<div class="sc"><div class="scl">Позицій</div><div class="scv scv-b">' + items.length + '</div></div>' +
      '<div class="sc"><div class="scl">Рухів</div><div class="scv scv-g">' + (db.moves || []).length + '</div></div>' +
      '<div class="sc"><div class="scl">Нижче мінімуму</div><div class="scv scv-o">' + low + '</div></div>' +
      '<div class="sc"><div class="scl">Відкриті замовлення</div><div class="scv scv-b">' + openOrders + '</div></div>' +
      '<div class="sc"><div class="scl">Оцінка запасів</div><div class="scv scv-p" style="font-size:17px">' + fN(Math.round(value * 100) / 100) + ' ₴</div></div>';

    const al = document.getElementById('alerts');
    if (al) {
      if (low) al.innerHTML = '<div class="c" style="padding:12px 16px;margin-bottom:12px;border-left:4px solid var(--danger)"><b>⚠️ ' + low + '</b> позицій нижче мінімального залишку</div>';
      else al.innerHTML = '';
    }
  }

  function renderStock() {
    renderStats();
    const el = document.getElementById('stock-list');
    if (!el) return;
    fillWarehouseSelects();
    const q = norm(document.getElementById('stock-q')?.value);
    const cat = document.getElementById('stock-cat')?.value || '';
    const lowOnly = document.getElementById('stock-low-only')?.checked;
    const whFilter = document.getElementById('stock-wh')?.value || '';
    let items = (db.items || []).slice();
    if (cat) items = items.filter(i => i.category === cat);
    if (q) items = items.filter(i => norm(i.name).includes(q) || norm(i.sku).includes(q));
    const whs = whFilter ? [warehouseById(whFilter)].filter(Boolean) : (db.warehouses || []);
    const rows = [];
    items.forEach(it => {
      if (!whs.length) {
        rows.push({ it, stock: stockOf(it.id), wh: null });
      } else {
        whs.forEach(w => rows.push({ it, stock: stockOf(it.id, w.id), wh: w }));
      }
    });
    let out = rows;
    if (lowOnly) out = out.filter(x => x.stock < (Number(x.it.minStock) || 0));
    out.sort((a, b) => a.it.name.localeCompare(b.it.name, 'uk') || String(a.wh && a.wh.name || '').localeCompare(String(b.wh && b.wh.name || ''), 'uk'));
    document.getElementById('stock-count').textContent = out.length;
    if (!out.length) {
      el.innerHTML = '<div class="tm">Немає даних. Додайте склади, номенклатуру та зробіть прихід.</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Позиція</th><th>Склад</th><th>Категорія</th><th>Залишок</th><th>Мін.</th><th>Сума ₴</th><th></th></tr></thead><tbody>';
    out.forEach(({ it, stock, wh }) => {
      const min = Number(it.minStock) || 0;
      const low = stock < min;
      h += '<tr>';
      h += '<td><b>' + esc(it.name) + '</b>' + (it.sku ? '<div class="tsm tmu tmn">' + esc(it.sku) + '</div>' : '') + '</td>';
      h += '<td>' + esc(wh ? (wh.name + (wh.city ? ' · ' + wh.city : '')) : '—') + '</td>';
      h += '<td>' + esc(CATS[it.category] || it.category || '') + '</td>';
      h += '<td class="' + (low ? 'stock-low' : 'stock-ok') + '">' + fN(stock) + ' ' + esc(it.unit || 'шт') + '</td>';
      h += '<td class="tmn">' + fN(min) + '</td>';
      h += '<td class="tmn">' + fN(Math.round(stock * (Number(it.price) || 0) * 100) / 100) + '</td>';
      h += '<td style="white-space:nowrap">';
      if (ce) {
        h += '<button class="btn bs bxs" type="button" onclick="WH.openMove(\'in\')">➕</button> ';
        h += '<button class="btn bs bxs" type="button" onclick="WH.openMove(\'out\')">➖</button>';
      }
      h += '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function renderItems() {
    renderStats();
    const el = document.getElementById('item-list');
    if (!el) return;
    const q = norm(document.getElementById('item-q')?.value);
    const cat = document.getElementById('item-cat')?.value || '';
    let list = (db.items || []).slice();
    if (cat) list = list.filter(i => i.category === cat);
    if (q) list = list.filter(i => norm(i.name).includes(q) || norm(i.sku).includes(q));
    list.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    document.getElementById('item-count').textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Номенклатура порожня</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Назва</th><th>Артикул</th><th>Од.</th><th>Категорія</th><th>Мін.</th><th>Ціна</th><th>Постачальник</th><th></th></tr></thead><tbody>';
    list.forEach(it => {
      h += '<tr><td><b>' + esc(it.name) + '</b></td><td class="tmn">' + esc(it.sku || '—') + '</td><td>' + esc(it.unit) + '</td>';
      h += '<td>' + esc(CATS[it.category] || '') + '</td><td class="tmn">' + fN(it.minStock) + '</td><td class="tmn">' + fN(it.price) + '</td>';
      h += '<td>' + esc(supplierName(it.supplierId)) + '</td><td style="white-space:nowrap">';
      if (ce) {
        h += '<button class="btn bs bxs" type="button" onclick="WH.editItem(\'' + it.id + '\')">✏️</button> ';
        h += '<button class="btn bd bxs" type="button" onclick="WH.delItem(\'' + it.id + '\')">×</button>';
      }
      h += '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function renderMoves() {
    renderStats();
    const el = document.getElementById('move-list');
    if (!el) return;
    const from = document.getElementById('move-from')?.value || '';
    const to = document.getElementById('move-to')?.value || '';
    const mt = document.getElementById('move-type')?.value || '';
    const q = norm(document.getElementById('move-q')?.value);
    let list = (db.moves || []).slice();
    if (from) list = list.filter(m => (m.date || '') >= from);
    if (to) list = list.filter(m => (m.date || '') <= to);
    if (mt) list = list.filter(m => m.type === mt);
    if (q) {
      list = list.filter(m => {
        const it = itemById(m.itemId);
        return norm(it && it.name).includes(q) || norm(m.docNum).includes(q) || norm(m.note).includes(q);
      });
    }
    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    document.getElementById('move-count').textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Руху немає</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Дата</th><th>Тип</th><th>Позиція</th><th>К-сть</th><th>Документ</th><th>Деталі</th><th></th></tr></thead><tbody>';
    list.forEach(m => {
      const it = itemById(m.itemId);
      const meta = MOVE[m.type] || MOVE.in;
      h += '<tr><td>' + fD(m.date) + '</td>';
      h += '<td><span class="bg ' + meta.cls + '">' + meta.icon + ' ' + meta.name + '</span></td>';
      h += '<td><b>' + esc(it ? it.name : '—') + '</b></td>';
      h += '<td class="tmn">' + fN(m.qty) + (it ? ' ' + esc(it.unit) : '') + '</td>';
      h += '<td>' + esc(m.docNum || '—') + '</td>';
      h += '<td class="tsm">' + (m.type === 'in' ? esc(supplierName(m.supplierId)) : '') +
        (m.type === 'out' && m.projectId && window.NexusCore ? esc(NexusCore.projectLabel(m.projectId) || '') : '') +
        (m.note ? '<div>' + esc(m.note) + '</div>' : '') + '</td>';
      h += '<td>' + (ce ? '<button class="btn bd bxs" type="button" onclick="WH.delMove(\'' + m.id + '\')">×</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function exportStock() {
    if (!window.XLSX) return alert('SheetJS не завантажено');
    const data = [['Назва', 'Артикул', 'Категорія', 'Од.', 'Залишок', 'Мін.', 'Ціна', 'Сума ₴']];
    (db.items || []).forEach(it => {
      const s = stockOf(it.id);
      data.push([it.name, it.sku || '', CATS[it.category] || '', it.unit, s, it.minStock || 0, it.price || 0, Math.round(s * (it.price || 0) * 100) / 100]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Залишки');
    XLSX.writeFile(wb, 'nexus-warehouse-stock.xlsx');
  }
  function exportItems() {
    if (!window.XLSX) return alert('SheetJS не завантажено');
    const data = [['Назва', 'Артикул', 'Од.', 'Категорія', 'Мін.', 'Ціна', 'Постачальник', 'Примітка']];
    (db.items || []).forEach(it => {
      data.push([it.name, it.sku || '', it.unit, CATS[it.category] || '', it.minStock || 0, it.price || 0, supplierName(it.supplierId), it.notes || '']);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Номенклатура');
    XLSX.writeFile(wb, 'nexus-warehouse-items.xlsx');
  }
  function exportMoves() {
    if (!window.XLSX) return alert('SheetJS не завантажено');
    const data = [['Дата', 'Тип', 'Позиція', 'К-сть', 'Од.', 'Документ', 'Постачальник/Проект', 'Примітка', 'Користувач']];
    (db.moves || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(m => {
      const it = itemById(m.itemId);
      data.push([
        m.date, (MOVE[m.type] || {}).name || m.type, it ? it.name : '', m.qty, it ? it.unit : '',
        m.docNum || '', m.type === 'in' ? supplierName(m.supplierId) : (m.projectId && window.NexusCore ? NexusCore.projectLabel(m.projectId) : ''),
        m.note || '', m.userName || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Рух');
    XLSX.writeFile(wb, 'nexus-warehouse-moves.xlsx');
  }

  function renderAll() {
    renderStats();
    if (currentTab === 'stock') renderStock();
    if (currentTab === 'items') renderItems();
    if (currentTab === 'moves') renderMoves();
    if (currentTab === 'orders') renderOrders();
    if (currentTab === 'warehouses') renderWarehouses();
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('warehouse')) return;
    if (!initAuth()) return;
    initTheme();
    if (!db.moves) db.moves = [];
    if (!db.items) db.items = [];
    if (!db.orders) db.orders = [];
    if (!db.warehouses) db.warehouses = [];
    ensureWarehouses();
    fillCatFilters();
    fillSupplierSelects();
    fillWarehouseSelects();
    renderAll();
  }

  return {
    init, logout, tab, openItem, closeItem, saveItem, editItem, delItem,
    openMove, closeMove, saveMove, delMove, onMoveType,
    openOrder, closeOrder, saveOrder, editOrder, delOrder, receiveOrder, cancelOrder, addOrderLine,
    submitForApproval, approveOrder, markOrdered,
    openWarehouse, closeWarehouse, saveWarehouse, editWarehouse, delWarehouse,
    onRecvType, onDeptChange,
    renderStock, renderItems, renderMoves, renderOrders, renderWarehouses,
    exportStock, exportItems, exportMoves, exportOrders
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { WH.init(); } catch (e) { console.error(e); alert('Помилка складу: ' + e.message); }
});
