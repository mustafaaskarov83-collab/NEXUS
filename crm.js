/* NEXUS CRM — professional client relations module */
const CRM = (() => {
  'use strict';

  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const DOC_KEY = 'nexus_documents_v1';
  const CRM_KEY = 'nexus_crm_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let db = loadDB();
  let editingId = null;
  let detailId = null;
  let currentTab = 'list';

  const STATUSES = {
    lead: { name: 'Потенційний клієнт', cls: 'bg-b', icon: '🎯', order: 1 },
    negotiation: { name: 'Переговори', cls: 'bg-o', icon: '💬', order: 2 },
    active: { name: 'Клієнт', cls: 'bg-g', icon: '✅', order: 3 },
    archive: { name: 'Архів', cls: 'bg-gr', icon: '📦', order: 4 }
  };
  const TYPES = { company: 'Юр. особа', person: 'ФОП / фіз. особа' };
  const ROLES = {
    customer: { name: 'Замовник', cls: 'bg-g', icon: '💰', short: 'Замовник' },
    supplier: { name: 'Підрядник', cls: 'bg-o', icon: '🔧', short: 'Підрядник' },
    both: { name: 'Обидва', cls: 'bg-b', icon: '🔀', short: 'Обидва' }
  };
  const SOURCES = {
    referral: 'Рекомендація', site: 'Сайт', cold: 'Холодний контакт',
    partner: 'Партнер', tender: 'Тендер', other: 'Інше'
  };
  const ACT = {
    call: { name: 'Дзвінок', icon: '📞' },
    meeting: { name: 'Зустріч', icon: '🤝' },
    email: { name: 'Лист', icon: '✉️' },
    note: { name: 'Примітка', icon: '📝' },
    task: { name: 'Задача', icon: '✅' }
  };

  function loadDB() {
    try {
      const r = localStorage.getItem(CRM_KEY);
      if (r) {
        const p = JSON.parse(r);
        if (p && Array.isArray(p.clients)) {
          if (!Array.isArray(p.activities)) p.activities = [];
          return p;
        }
      }
    } catch (e) {}
    return { clients: [], activities: [], meta: { version: '2.0', created: today() } };
  }
  function saveDB() {
    try { localStorage.setItem(CRM_KEY, JSON.stringify(db)); } catch (e) {}
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fN(n) { return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(Number(n) || 0); }
  function fD(s) {
    if (!s) return '—';
    const p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function normCode(s) { return String(s || '').replace(/\s+/g, '').trim(); }

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

  function getEmployees() {
    try {
      const h = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      const list = h.employees || h.staff || [];
      return Array.isArray(list) ? list.filter(e => e && e.id) : [];
    } catch (e) { return []; }
  }
  function empName(id) {
    if (!id) return '—';
    const e = getEmployees().find(x => x.id === id);
    return e ? (e.fullName || e.name || '—') : '—';
  }
  function getDocuments() {
    try {
      const d = JSON.parse(localStorage.getItem(DOC_KEY) || '{}');
      return Array.isArray(d.docs) ? d.docs : [];
    } catch (e) { return []; }
  }

  function clientById(id) { return (db.clients || []).find(c => c.id === id); }

  function matchDocToClient(d, c) {
    if (!d || !c) return false;
    if (d.clientId && d.clientId === c.id) return true;
    const code = normCode(c.edrpou);
    const name = norm(c.name);
    if (code && normCode(d.edrpou) === code) return true;
    if (name && norm(d.counter)) {
      const cn = norm(d.counter);
      if (cn === name || cn.includes(name) || name.includes(cn)) return true;
    }
    return false;
  }

  function contractsForClient(c, kind) {
    if (!c) return [];
    return getDocuments().filter(d => {
      if (d.type !== 'contract') return false;
      if (kind === 'income' && d.contractKind === 'expense') return false;
      if (kind === 'expense' && d.contractKind !== 'expense') return false;
      if (kind === 'income' && d.contractKind && d.contractKind !== 'income') return false;
      return matchDocToClient(d, c);
    });
  }

  function clientTotals(c) {
    const income = contractsForClient(c, 'income');
    const expense = contractsForClient(c, 'expense');
    return {
      incomeCount: income.length,
      incomeAmount: income.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      expenseCount: expense.length,
      expenseAmount: expense.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      count: income.length + expense.length,
      amount: income.reduce((s, d) => s + (Number(d.amount) || 0), 0)
    };
  }

  function activitiesForClient(id) {
    return (db.activities || []).filter(a => a.clientId === id)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
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

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nb').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    document.querySelectorAll('.tp').forEach(s => {
      s.style.display = s.id === 'tab-' + tab ? '' : 'none';
      s.classList.toggle('active', s.id === 'tab-' + tab);
    });
    if (tab === 'list') renderList();
    if (tab === 'pipeline') renderPipeline();
    if (tab === 'activity') renderActivities();
  }

  function fillManagerSelect(selected) {
    const sel = document.getElementById('c-manager');
    if (!sel) return;
    const emps = getEmployees().slice().sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), 'uk'));
    sel.innerHTML = '<option value="">— не вказано —</option>' +
      emps.map(e => '<option value="' + esc(e.id) + '">' + esc(e.fullName || e.name) + '</option>').join('');
    if (selected) sel.value = selected;
  }

  function openForm() {
    if (!canEdit()) return denyEdit();
    editingId = null;
    document.getElementById('form-title').textContent = 'Новий клієнт';
    document.getElementById('btn-save').textContent = 'Зберегти клієнта';
    ['c-name','c-edrpou','c-phone','c-email','c-contact','c-position','c-city','c-address','c-notes','c-website','c-tags'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('c-type').value = 'company';
    const roleEl = document.getElementById('c-role'); if (roleEl) roleEl.value = 'customer';
    document.getElementById('c-status').value = 'lead';
    document.getElementById('c-source').value = '';
    fillManagerSelect('');
    document.getElementById('cli-form-modal').classList.add('open');
  }
  function closeForm() {
    document.getElementById('cli-form-modal').classList.remove('open');
    editingId = null;
  }

  function save() {
    if (!canEdit()) return denyEdit();
    const name = (document.getElementById('c-name')?.value || '').trim();
    if (!name) { alert('Вкажіть назву клієнта'); return; }
    const edrpou = (document.getElementById('c-edrpou')?.value || '').trim();
    if (edrpou) {
      const dup = (db.clients || []).find(x => x.id !== editingId && normCode(x.edrpou) === normCode(edrpou));
      if (dup) { alert('Клієнт з таким ЄДРПОУ вже є: ' + dup.name); return; }
    }
    const prev = editingId ? clientById(editingId) : null;
    const item = {
      id: editingId || uid('cli'),
      type: document.getElementById('c-type')?.value || 'company',
      role: document.getElementById('c-role')?.value || 'customer',
      name,
      edrpou,
      status: document.getElementById('c-status')?.value || 'lead',
      source: document.getElementById('c-source')?.value || '',
      managerId: document.getElementById('c-manager')?.value || '',
      website: (document.getElementById('c-website')?.value || '').trim(),
      tags: (document.getElementById('c-tags')?.value || '').trim(),
      contact: (document.getElementById('c-contact')?.value || '').trim(),
      position: (document.getElementById('c-position')?.value || '').trim(),
      phone: (document.getElementById('c-phone')?.value || '').trim(),
      email: (document.getElementById('c-email')?.value || '').trim(),
      city: (document.getElementById('c-city')?.value || '').trim(),
      address: (document.getElementById('c-address')?.value || '').trim(),
      notes: (document.getElementById('c-notes')?.value || '').trim(),
      updatedAt: today(),
      createdAt: prev ? (prev.createdAt || today()) : today()
    };
    if (editingId) {
      const i = db.clients.findIndex(x => x.id === editingId);
      if (i >= 0) db.clients[i] = item;
    } else {
      db.clients.push(item);
    }
    saveDB();
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit(editingId ? 'crm.client.update' : 'crm.client.create', 'client', { id: item.id, name: item.name });
    }
    closeForm();
    renderAll();
  }

  function edit(id) {
    if (!canEdit()) return denyEdit();
    const c = clientById(id);
    if (!c) return;
    editingId = id;
    document.getElementById('form-title').textContent = 'Редагувати клієнта';
    document.getElementById('btn-save').textContent = 'Зберегти';
    document.getElementById('c-type').value = c.type || 'company';
    const roleEl = document.getElementById('c-role'); if (roleEl) roleEl.value = c.role || 'customer';
    document.getElementById('c-name').value = c.name || '';
    document.getElementById('c-edrpou').value = c.edrpou || '';
    document.getElementById('c-status').value = c.status || 'lead';
    document.getElementById('c-source').value = c.source || '';
    fillManagerSelect(c.managerId || '');
    document.getElementById('c-website').value = c.website || '';
    document.getElementById('c-tags').value = c.tags || '';
    document.getElementById('c-contact').value = c.contact || '';
    document.getElementById('c-position').value = c.position || '';
    document.getElementById('c-phone').value = c.phone || '';
    document.getElementById('c-email').value = c.email || '';
    document.getElementById('c-city').value = c.city || '';
    document.getElementById('c-address').value = c.address || '';
    document.getElementById('c-notes').value = c.notes || '';
    document.getElementById('cli-form-modal').classList.add('open');
  }

  function del(id) {
    if (!canEdit()) return denyEdit();
    const c = clientById(id);
    if (!c) return;
    if (!confirm('Видалити клієнта «' + c.name + '» та його активності?')) return;
    db.clients = db.clients.filter(x => x.id !== id);
    db.activities = (db.activities || []).filter(a => a.clientId !== id);
    saveDB();
    closeDetail();
    renderAll();
  }

  function setStatus(id, status) {
    if (!canEdit()) return denyEdit();
    const c = clientById(id);
    if (!c || !STATUSES[status]) return;
    c.status = status;
    c.updatedAt = today();
    saveDB();
    renderAll();
    if (detailId === id) openDetail(id);
  }

  function openDetail(id) {
    const c = clientById(id);
    if (!c) return;
    detailId = id;
    const st = STATUSES[c.status] || STATUSES.lead;
    const tot = clientTotals(c);
    const contracts = contractsForClient(c);
    const acts = activitiesForClient(id);
    const ce = canEdit();

    document.getElementById('detail-title').textContent = c.name;
    let h = '<div class="detail-hero">';
    const role = ROLES[c.role || 'customer'] || ROLES.customer;
    h += '<div><span class="bg ' + st.cls + '">' + st.icon + ' ' + st.name + '</span> ';
    h += '<span class="bg bg-b">' + esc(TYPES[c.type] || c.type || '') + '</span> ';
    h += '<span class="bg ' + role.cls + '">' + role.icon + ' ' + role.name + '</span></div>';
    h += '<div class="detail-hero-sum">';
    h += '<div class="tsm tmu">Прибуток: <b>' + fN(tot.incomeAmount) + ' ₴</b> (' + tot.incomeCount + ')</div>';
    h += '<div class="tsm tmu">Витрати: <b>' + fN(tot.expenseAmount) + ' ₴</b> (' + tot.expenseCount + ')</div>';
    h += '</div></div>';

    h += '<div class="crm-grid crm-grid-3 detail-meta">';
    h += cell('ЄДРПОУ / ІПН', c.edrpou || '—', true);
    h += cell('Менеджер', empName(c.managerId));
    h += cell('Джерело', SOURCES[c.source] || '—');
    h += cell('Телефон', c.phone || '—');
    h += cell('Email', c.email || '—');
    h += cell('Сайт', c.website || '—');
    h += cell('Контакт', [c.contact, c.position].filter(Boolean).join(', ') || '—');
    h += cell('Місто', c.city || '—');
    h += cell('Теги', c.tags || '—');
    h += '<div style="grid-column:1/-1">' + cell('Адреса', c.address || '—') + '</div>';
    if (c.notes) h += '<div style="grid-column:1/-1">' + cell('Примітка', c.notes) + '</div>';
    h += '</div>';

    if (ce) {
      h += '<div class="status-actions">';
      Object.keys(STATUSES).forEach(k => {
        if (k === c.status) return;
        h += '<button class="btn bs bsm" type="button" onclick="CRM.setStatus(\'' + c.id + '\',\'' + k + '\')">' +
          STATUSES[k].icon + ' → ' + STATUSES[k].name + '</button>';
      });
      h += '</div>';
    }

    function renderContractTable(list, emptyMsg) {
      if (!list.length) return '<div class="tm">' + emptyMsg + '</div>';
      let t = '<table class="dt"><thead><tr><th>Договір</th><th>Дата</th><th>Сума</th><th>Статус</th></tr></thead><tbody>';
      list.forEach(d => {
        t += '<tr><td><b>' + esc(d.name) + '</b>' + (d.num ? '<div class="tsm tmu">№ ' + esc(d.num) + '</div>' : '') + '</td>';
        t += '<td>' + fD(d.date) + '</td><td class="tmn">' + fN(d.amount) + ' ₴</td><td>' + esc(d.status || '—') + '</td></tr>';
      });
      return t + '</tbody></table>';
    }
    const incomeDocs = contractsForClient(c, 'income');
    const expenseDocs = contractsForClient(c, 'expense');
    h += '<div class="detail-block"><div class="detail-block-t">💰 Прибуткові договори</div>';
    h += renderContractTable(incomeDocs, 'Немає прибуткових договорів (або немає збігу за ЄДРПОУ / назвою).');
    h += '</div>';
    h += '<div class="detail-block"><div class="detail-block-t">📉 Витратні договори</div>';
    h += renderContractTable(expenseDocs, 'Немає витратних договорів з цим контрагентом.');
    h += '</div>';

    h += '<div class="detail-block"><div class="detail-block-t">🗓 Активності</div>';
    if (ce) {
      h += '<div class="fg" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">';
      h += '<select id="d-act-type"><option value="call">📞 Дзвінок</option><option value="meeting">🤝 Зустріч</option><option value="email">✉️ Лист</option><option value="note">📝 Примітка</option><option value="task">✅ Задача</option></select>';
      h += '<input id="d-act-text" placeholder="Короткий опис…" style="flex:1;min-width:180px">';
      h += '<button class="btn bp bsm" type="button" onclick="CRM.quickActivity(\'' + c.id + '\')">Додати</button></div>';
    }
    if (!acts.length) h += '<div class="tm">Поки немає записів</div>';
    else {
      acts.forEach(a => {
        const t = ACT[a.type] || ACT.note;
        h += '<div class="note-item"><div class="tsm tmu">' + t.icon + ' ' + t.name + ' · ' + fD(a.date) +
          (a.author ? ' · ' + esc(a.author) : '') + '</div><div>' + esc(a.text) + '</div></div>';
      });
    }
    h += '</div>';

    h += '<div class="veh-actions">';
    if (ce) h += '<button class="btn bp" type="button" onclick="CRM.closeDetail();CRM.edit(\'' + c.id + '\')">Редагувати</button> ';
    if (ce) h += '<button class="btn bd" type="button" onclick="CRM.del(\'' + c.id + '\')">Видалити</button> ';
    h += '<button class="btn bs" type="button" onclick="CRM.closeDetail()">Закрити</button></div>';

    document.getElementById('detail-body').innerHTML = h;
    document.getElementById('cli-detail-modal').classList.add('open');
  }
  function cell(label, val, mono) {
    return '<div><div class="tsm tmu">' + esc(label) + '</div><div' + (mono ? ' class="tmn"' : '') + '><b>' + esc(val) + '</b></div></div>';
  }
  function closeDetail() {
    document.getElementById('cli-detail-modal').classList.remove('open');
    detailId = null;
  }

  function quickActivity(clientId) {
    if (!canEdit()) return denyEdit();
    const text = (document.getElementById('d-act-text')?.value || '').trim();
    if (!text) { alert('Введіть опис'); return; }
    const type = document.getElementById('d-act-type')?.value || 'note';
    pushActivity(clientId, type, text);
    openDetail(clientId);
    renderActivities();
  }

  function pushActivity(clientId, type, text) {
    const u = getCurrentUser();
    if (!db.activities) db.activities = [];
    db.activities.push({
      id: uid('act'),
      clientId,
      type,
      text,
      date: today(),
      author: u ? (u.fullName || u.username) : '',
      createdAt: today()
    });
    const c = clientById(clientId);
    if (c) { c.updatedAt = today(); c.lastActivityAt = today(); }
    saveDB();
  }

  function openActivityForm() {
    if (!canEdit()) return denyEdit();
    const sel = document.getElementById('a-client');
    const list = (db.clients || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    sel.innerHTML = '<option value="">— оберіть —</option>' +
      list.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('');
    document.getElementById('a-type').value = 'call';
    document.getElementById('a-date').value = today();
    document.getElementById('a-text').value = '';
    document.getElementById('act-form-modal').classList.add('open');
  }
  function closeActivityForm() {
    document.getElementById('act-form-modal').classList.remove('open');
  }
  function saveActivity() {
    if (!canEdit()) return denyEdit();
    const clientId = document.getElementById('a-client')?.value || '';
    const text = (document.getElementById('a-text')?.value || '').trim();
    if (!clientId) { alert('Оберіть клієнта'); return; }
    if (!text) { alert('Введіть опис'); return; }
    const type = document.getElementById('a-type')?.value || 'note';
    const date = document.getElementById('a-date')?.value || today();
    const u = getCurrentUser();
    if (!db.activities) db.activities = [];
    db.activities.push({
      id: uid('act'), clientId, type, text, date,
      author: u ? (u.fullName || u.username) : '', createdAt: today()
    });
    const c = clientById(clientId);
    if (c) { c.updatedAt = today(); c.lastActivityAt = date; }
    saveDB();
    closeActivityForm();
    renderAll();
  }

  function importFromContracts() {
    if (!canEdit()) return denyEdit();
    const docs = getDocuments().filter(d => d.type === 'contract' && (d.counter || d.edrpou));
    let added = 0, skipped = 0, updated = 0;
    docs.forEach(d => {
      const code = normCode(d.edrpou);
      const name = (d.counter || '').trim();
      if (!name && !code) return;
      const exists = (db.clients || []).find(c =>
        (code && normCode(c.edrpou) === code) ||
        (name && norm(c.name) === norm(name))
      );
      const isExpense = d.contractKind === 'expense';
      const roleFromDoc = isExpense ? 'supplier' : 'customer';
      if (exists) {
        if (exists.role === 'customer' && roleFromDoc === 'supplier') { exists.role = 'both'; updated++; }
        else if (exists.role === 'supplier' && roleFromDoc === 'customer') { exists.role = 'both'; updated++; }
        else if (!exists.role) { exists.role = roleFromDoc; updated++; }
        skipped++;
        return;
      }
      db.clients.push({
        id: uid('cli'),
        type: 'company',
        role: roleFromDoc,
        name: name || ('ЄДРПОУ ' + code),
        edrpou: d.edrpou || '',
        status: isExpense ? 'active' : 'active',
        source: 'other',
        managerId: d.employeeId || '',
        website: '', tags: '', contact: '', position: '',
        phone: '', email: '', city: '', address: '',
        notes: 'Імпортовано з ' + (isExpense ? 'витратного' : 'прибуткового') + ' договору' + (d.num ? ' №' + d.num : ''),
        createdAt: today(), updatedAt: today()
      });
      added++;
    });
    saveDB();
    renderAll();
    alert('Імпорт завершено.\nНових: ' + added + '\nВже були: ' + skipped + '\nОновлено роль: ' + updated);
  }

  function renderStats() {
    const el = document.getElementById('stats');
    if (!el) return;
    const list = db.clients || [];
    const by = k => list.filter(c => c.status === k).length;
    const roleOf = r => list.filter(c => {
      const x = c.role || 'customer';
      return x === r || x === 'both';
    }).length;
    let incomeSum = 0, expenseSum = 0;
    list.forEach(c => {
      const t = clientTotals(c);
      incomeSum += t.incomeAmount;
      expenseSum += t.expenseAmount;
    });
    el.innerHTML =
      '<div class="sc"><div class="scl">Контрагентів</div><div class="scv scv-b">' + list.length + '</div></div>' +
      '<div class="sc"><div class="scl">Замовники</div><div class="scv scv-g">' + roleOf('customer') + '</div></div>' +
      '<div class="sc"><div class="scl">Підрядники</div><div class="scv scv-o">' + roleOf('supplier') + '</div></div>' +
      '<div class="sc"><div class="scl">Прибуток (договори)</div><div class="scv scv-g" style="font-size:16px">' + fN(incomeSum) + ' ₴</div></div>' +
      '<div class="sc"><div class="scl">Витрати (договори)</div><div class="scv scv-o" style="font-size:16px">' + fN(expenseSum) + ' ₴</div></div>';
  }

  function filteredClients() {
    const q = norm(document.getElementById('search')?.value);
    const fs = document.getElementById('filter-status')?.value || '';
    const ft = document.getElementById('filter-type')?.value || '';
    const fr = document.getElementById('filter-role')?.value || '';
    let list = (db.clients || []).slice();
    if (fs) list = list.filter(c => c.status === fs);
    if (ft) list = list.filter(c => (c.type || 'company') === ft);
    if (fr) {
      list = list.filter(c => {
        const r = c.role || 'customer';
        if (fr === 'both') return r === 'both';
        return r === fr || r === 'both';
      });
    }
    if (q) {
      list = list.filter(c =>
        norm(c.name).includes(q) ||
        normCode(c.edrpou).includes(q.replace(/\s/g, '')) ||
        norm(c.phone).includes(q) ||
        norm(c.email).includes(q) ||
        norm(c.contact).includes(q) ||
        norm(c.city).includes(q) ||
        norm(c.tags).includes(q)
      );
    }
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'uk'));
    return list;
  }

  function renderList() {
    renderStats();
    const el = document.getElementById('cli-list');
    if (!el) return;
    const list = filteredClients();
    const cnt = document.getElementById('cli-count');
    if (cnt) cnt.textContent = list.length;
    if (!list.length) {
      el.innerHTML = '<div class="tm">Клієнтів не знайдено. Додайте вручну або імпортуйте з прибуткових договорів.</div>';
      return;
    }
    const ce = canEdit();
    let h = '<table class="dt"><thead><tr><th>Контрагент</th><th>Роль</th><th>Статус</th><th>Контакти</th><th>Менеджер</th><th>Договори</th><th></th></tr></thead><tbody>';
    list.forEach(c => {
      const st = STATUSES[c.status] || STATUSES.lead;
      const role = ROLES[c.role || 'customer'] || ROLES.customer;
      const tot = clientTotals(c);
      h += '<tr>';
      h += '<td><b>' + esc(c.name) + '</b>';
      h += '<div class="tsm tmu">' + esc(TYPES[c.type] || '') +
        (c.edrpou ? ' · <span class="tmn">' + esc(c.edrpou) + '</span>' : '') + '</div>';
      if (c.tags) h += '<div class="tsm tmu">' + esc(c.tags) + '</div>';
      h += '</td>';
      h += '<td><span class="bg ' + role.cls + '">' + role.icon + ' ' + role.short + '</span></td>';
      h += '<td><span class="bg ' + st.cls + '">' + st.icon + ' ' + st.name + '</span></td>';
      h += '<td class="tsm">' + esc(c.phone || '—');
      if (c.email) h += '<div>' + esc(c.email) + '</div>';
      if (c.contact) h += '<div class="tmu">' + esc(c.contact) + (c.position ? ' · ' + esc(c.position) : '') + '</div>';
      h += '</td>';
      h += '<td>' + esc(empName(c.managerId)) + '</td>';
      h += '<td class="tmn tsm">💰 ' + fN(tot.incomeAmount) + '<div class="tmu">📉 ' + fN(tot.expenseAmount) + '</div></td>';
      h += '<td class="row-actions">';
      h += '<button class="btn bs bxs" type="button" onclick="CRM.openDetail(\'' + c.id + '\')">👁</button> ';
      if (ce) {
        h += '<button class="btn bs bxs" type="button" onclick="CRM.edit(\'' + c.id + '\')">✏️</button> ';
        h += '<button class="btn bd bxs" type="button" onclick="CRM.del(\'' + c.id + '\')">×</button>';
      }
      h += '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function renderPipeline() {
    renderStats();
    const board = document.getElementById('pipeline-board');
    if (!board) return;
    const ce = canEdit();
    const order = ['lead', 'negotiation', 'active', 'archive'];
    let h = '';
    order.forEach(st => {
      const meta = STATUSES[st];
      const items = (db.clients || []).filter(c => (c.status || 'lead') === st);
      h += '<div class="pipe-col"><div class="pipe-col-h">' + meta.icon + ' ' + meta.name +
        ' <span class="bg bg-b">' + items.length + '</span></div>';
      if (!items.length) h += '<div class="tm pipe-empty">Порожньо</div>';
      items.forEach(c => {
        const tot = clientTotals(c);
        h += '<div class="pipe-card" onclick="CRM.openDetail(\'' + c.id + '\')">';
        h += '<div class="pipe-card-t">' + esc(c.name) + '</div>';
        h += '<div class="tsm tmu">' + esc(empName(c.managerId)) + '</div>';
        h += '<div class="pipe-card-m">' + fN(tot.amount) + ' ₴</div>';
        if (ce) {
          h += '<div class="pipe-card-a" onclick="event.stopPropagation()">';
          order.forEach(s2 => {
            if (s2 === st) return;
            h += '<button class="btn bs bxs" type="button" title="' + STATUSES[s2].name +
              '" onclick="CRM.setStatus(\'' + c.id + '\',\'' + s2 + '\')">' + STATUSES[s2].icon + '</button> ';
          });
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    });
    board.innerHTML = h;
  }

  function renderActivities() {
    renderStats();
    const el = document.getElementById('activity-list');
    if (!el) return;
    const list = (db.activities || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (!list.length) {
      el.innerHTML = '<div class="tm">Активностей ще немає</div>';
      return;
    }
    let h = '<table class="dt"><thead><tr><th>Дата</th><th>Тип</th><th>Клієнт</th><th>Опис</th><th>Автор</th></tr></thead><tbody>';
    list.forEach(a => {
      const t = ACT[a.type] || ACT.note;
      const c = clientById(a.clientId);
      h += '<tr><td>' + fD(a.date) + '</td><td>' + t.icon + ' ' + t.name + '</td>';
      h += '<td>' + (c ? '<a href="#" onclick="CRM.openDetail(\'' + a.clientId + '\');return false">' + esc(c.name) + '</a>' : '—') + '</td>';
      h += '<td>' + esc(a.text) + '</td><td class="tsm">' + esc(a.author || '—') + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function exportExcel() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    const data = [['Назва','Тип','Роль','ЄДРПОУ','Статус','Джерело','Телефон','Email','Контакт','Посада','Місто','Адреса','Сайт','Теги','Менеджер','Прибуток ₴','Витрати ₴','Примітка']];
    (db.clients || []).forEach(c => {
      const tot = clientTotals(c);
      data.push([
        c.name, TYPES[c.type] || c.type, (ROLES[c.role || 'customer'] || {}).name || '',
        c.edrpou || '',
        (STATUSES[c.status] || {}).name || c.status, SOURCES[c.source] || '',
        c.phone || '', c.email || '', c.contact || '', c.position || '',
        c.city || '', c.address || '', c.website || '', c.tags || '',
        empName(c.managerId),
        Math.round(tot.incomeAmount * 100) / 100,
        Math.round(tot.expenseAmount * 100) / 100,
        c.notes || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Клієнти');
    XLSX.writeFile(wb, 'nexus-crm-clients.xlsx');
  }

  function renderAll() {
    renderStats();
    if (currentTab === 'list') renderList();
    if (currentTab === 'pipeline') renderPipeline();
    if (currentTab === 'activity') renderActivities();
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('crm')) return;
    if (!initAuth()) return;
    initTheme();
    if (!db.activities) db.activities = [];
    // migrate old statuses
    (db.clients || []).forEach(c => {
      if (!c.status) c.status = 'lead';
      if (!c.role) c.role = 'customer';
    });
    renderAll();
    if (window.NexusCore && NexusCore.enforceReadOnly) NexusCore.enforceReadOnly();
  }

  return {
    init, logout, switchTab, openForm, closeForm, save, edit, del, setStatus,
    openDetail, closeDetail, quickActivity, openActivityForm, closeActivityForm, saveActivity,
    importFromContracts, renderList, exportExcel, render: renderList
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { CRM.init(); } catch (e) { console.error(e); alert('Помилка CRM: ' + e.message); }
});
