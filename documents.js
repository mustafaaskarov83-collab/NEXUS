/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING — Модуль документообігу v1.0.1
   ═══════════════════════════════════════════════════════════════════════ */

const Doc = (() => {

  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const DOC_KEY = 'nexus_documents_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let db = loadDB();
  let editingId = null;

  const TYPES = {
    contract: { icon: '📝', name: 'Договір' },
    addendum: { icon: '📎', name: 'Додаток до договору №' },
    act:      { icon: '📋', name: 'Акт' },
    invoice:  { icon: '💵', name: 'Рахунок' },
    order:    { icon: '📢', name: 'Наказ' },
    letter:   { icon: '✉️', name: 'Лист' },
    report:   { icon: '📊', name: 'Звіт' },
    other:    { icon: '📎', name: 'Інше' }
  };
  const STATUSES = {
    draft:     { icon: '✏️', name: 'Чернетка',  cls: 'bg-gr' },
    active:    { icon: '🟢', name: 'Активний',  cls: 'bg-g' },
    done:      { icon: '✅', name: 'Виконано',  cls: 'bg-b' },
    archive:   { icon: '📦', name: 'Архів',     cls: 'bg-gr' },
    cancelled: { icon: '❌', name: 'Скасовано', cls: 'bg-r' }
  };
  const CONTRACT_KINDS = {
    income:  { icon: '💰', name: 'Прибутковий', short: 'Прибуток', cls: 'bg-g' },
    expense: { icon: '📉', name: 'Витратний',   short: 'Витрата',  cls: 'bg-o' }
  };

  function loadDB() {
    try {
      const r = localStorage.getItem(DOC_KEY);
      if (r) { const p = JSON.parse(r); if (p && p.docs) return p; }
    } catch(e){}
    return { docs: [], meta: { created: new Date().toISOString().slice(0,10), version: '1.0' } };
  }

  function saveDB() {
    try { localStorage.setItem(DOC_KEY, JSON.stringify(db)); } catch(e){}
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
    } catch(e) { return null; }
  }

  function getEmployees() {
    try {
      const h = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      return (h.employees || []).slice().sort((a,b) => (a.fullName||'').localeCompare(b.fullName||''));
    } catch(e) { return []; }
  }

  /* --- Права доступу: роль «Перегляд» (viewer) не змінює дані --- */
  function canEdit() {
    if (window.NexusCore && typeof NexusCore.canEdit === 'function') return NexusCore.canEdit('documents');
    const u = getCurrentUser();
    return !!u && u.role !== 'viewer';
  }
  function denyEdit() {
    alert('Недостатньо прав: роль «Перегляд» не дозволяє змінювати дані.');
    return false;
  }

  /* --- Екранування перед вставкою в HTML --- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* --- Безпечні посилання (заборона javascript: та data:) --- */
  function safeUrl(u) {
    const s = String(u == null ? '' : u).trim();
    return /^(https?:\/\/|mailto:|\/)/i.test(s) ? s : '';
  }

  function initAuth() {
    const user = getCurrentUser();
    if (!user) {
      try { sessionStorage.setItem('nexus_redirect_after_login', 'documents.html'); } catch(e){}
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
    const initials = (user.fullName || user.username).split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    if (av) av.textContent = initials;
    if (hun) hun.textContent = user.fullName || user.username;
    if (hur) hur.textContent = roleMap[user.role] || user.role;

    return true;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.href = 'index.html';
  }

  function initTheme() {
    let current = localStorage.getItem(THEME_KEY) || 'auto';
    document.documentElement.setAttribute('data-theme', current);
    const updateIcon = () => {
      const icons = { light:'☀️', dark:'🌙', auto:'🌗' };
      document.querySelectorAll('.theme-btn').forEach(b => b.textContent = icons[current] || '🌗');
    };
    const MODES = ['light','dark','auto'];
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = MODES.indexOf(current);
        current = MODES[(idx+1) % MODES.length];
        document.documentElement.setAttribute('data-theme', current);
        localStorage.setItem(THEME_KEY, current);
        updateIcon();
      });
    });
    updateIcon();
  }


  function getCrmClients() {
    try {
      const raw = localStorage.getItem('nexus_crm_v1');
      if (!raw) return [];
      const p = JSON.parse(raw);
      return Array.isArray(p.clients) ? p.clients.filter(c => c && c.id && c.name) : [];
    } catch (e) { return []; }
  }

  function fillClientSelect(selectedId) {
    if (window.NexusCore && NexusCore.fillCrmSelect) {
      NexusCore.fillCrmSelect('f-client', {
        selected: selectedId || '',
        emptyLabel: '— оберіть з CRM —'
      });
      return;
    }
    const sel = document.getElementById('f-client');
    if (!sel) return;
    const clients = getCrmClients().slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'uk'));
    const roleLabel = { customer: 'замовник', supplier: 'підрядник', both: 'обидва' };
    sel.innerHTML = '<option value="">— оберіть з CRM —</option>' + clients.map(c => {
      const role = roleLabel[c.role || 'customer'] || '';
      const ed = c.edrpou ? ' · ' + c.edrpou : '';
      return '<option value="' + String(c.id).replace(/"/g, '') + '">' +
        String(c.name).replace(/</g, '') + (role ? ' (' + role + ')' : '') + ed + '</option>';
    }).join('');
    if (selectedId) sel.value = selectedId;
  }

  function onClientPick() {
    const id = document.getElementById('f-client')?.value || '';
    const c = getCrmClients().find(x => x.id === id);
    const counter = document.getElementById('f-counter');
    const edrpou = document.getElementById('f-edrpou');
    if (!c) {
      if (counter) counter.value = '';
      if (edrpou) edrpou.value = '';
      return;
    }
    if (counter) counter.value = c.name || '';
    if (edrpou) edrpou.value = c.edrpou || '';
    // optional: suggest contract kind from role
    const kind = document.getElementById('f-contract-kind');
    if (kind && c.role === 'supplier' && kind.value !== 'expense') {
      // don't force if user already chose — only when empty default
    }
  }

  function fillDocProject(selected) {
    const sel = document.getElementById('f-project');
    if (!sel) return;
    const value = selected != null ? selected : (sel.value || '');
    if (window.NexusCore && NexusCore.fillProjectSelect) NexusCore.fillProjectSelect(sel, value);
    if (value && sel.value !== value) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = 'Проект (немає в довіднику)';
      sel.appendChild(opt);
      sel.value = value;
    }
  }

  function projectFromForm() {
    const projSel = document.getElementById('f-project');
    if (projSel) {
      const projectId = projSel.value || '';
      if (!projectId) return { projectId: '', projectCode: '', projectName: '' };
      let projectCode = '', projectName = '';
      const projects = (window.NexusCore && NexusCore.getProjects) ? NexusCore.getProjects() : [];
      const pr = projects.find(x => x.id === projectId);
      if (pr) {
        projectCode = pr.code || '';
        projectName = pr.name || '';
      } else {
        const label = (projSel.options[projSel.selectedIndex]?.textContent || '').trim();
        const parts = label.split(' — ');
        if (parts.length > 1) {
          projectCode = parts[0];
          projectName = parts.slice(1).join(' — ');
        } else projectName = label;
      }
      return { projectId, projectCode, projectName };
    }
    if (editingId) {
      const prev = db.docs.find(x => x.id === editingId);
      if (prev) return { projectId: prev.projectId || '', projectCode: prev.projectCode || '', projectName: prev.projectName || '' };
    }
    return {
      projectId: '',
      projectCode: (document.getElementById('f-project-code')?.value || '').trim(),
      projectName: (document.getElementById('f-project-name')?.value || '').trim()
    };
  }

  function fillEmployeeSelect() {
    const sels = [document.getElementById('f-emp'), document.getElementById('f-addendum-emp')].filter(Boolean);
    const emps = getEmployees();
    sels.forEach(sel => {
      const current = sel.value;
      sel.innerHTML = '<option value="">— не вказано —</option>' +
        emps.map(e => `<option value="${e.id}">${esc(e.fullName)}</option>`).join('');
      if (current) sel.value = current;
    });
    if (window.NexusCore) fillDocProject(document.getElementById('f-project')?.value || '');
    fillParentContractSelect(document.getElementById('f-parent-contract')?.value || '');
  }

  function fillParentContractSelect(currentId = '') {
    const sel = document.getElementById('f-parent-contract');
    if (!sel) return;
    const contracts = db.docs.filter(d => d.type === 'contract').slice().sort((a,b) => {
      const na = String(a.num || a.name || '');
      const nb = String(b.num || b.name || '');
      return na.localeCompare(nb, 'uk');
    });
    sel.innerHTML = '<option value="">— оберіть договір —</option>' + contracts.map(d => {
      const label = d.num ? `Договір № ${d.num} — ${d.name || 'Без назви'}` : (d.name || 'Договір без номера');
      return `<option value="${d.id}">${esc(label)}</option>`;
    }).join('');
    if (currentId) sel.value = currentId;
  }

  function typeChanged() {
    const type = document.getElementById('f-type')?.value || 'contract';
    const contract = document.getElementById('contract-form-fields');
    const addendum = document.getElementById('addendum-form-fields');
    if (contract) contract.style.display = type === 'addendum' ? 'none' : '';
    if (addendum) addendum.style.display = type === 'addendum' ? '' : 'none';
    if (type === 'addendum') {
      fillParentContractSelect(document.getElementById('f-parent-contract')?.value || '');
      fillEmployeeSelect();
      const date = document.getElementById('f-addendum-date');
      if (date && !date.value) date.value = new Date().toISOString().slice(0,10);
    }
  }

  function syncParentContract() {
    const id = document.getElementById('f-parent-contract')?.value;
    const contract = db.docs.find(d => d.id === id && d.type === 'contract');
    const project = document.getElementById('f-addendum-project');
    const counter = document.getElementById('f-addendum-counter');
    if (!contract) {
      if (project) project.value = '';
      if (counter) counter.value = '';
      return;
    }
    if (project) project.value = NexusCore && NexusCore.projectLabel ? NexusCore.projectLabel(contract.projectId) || contract.projectName || contract.projectCode || '' : (contract.projectName || contract.projectCode || '');
    if (counter) counter.value = contract.counter || '';
  }

  function syncProject() {
    const id=document.getElementById('f-project')?.value;
    if(!id || !window.NexusCore) return;
    const p=NexusCore.getProjects().find(x=>x.id===id);
    if(!p) return;
    const code=document.getElementById('f-project-code'), name=document.getElementById('f-project-name');
    if(code) code.value=p.code||''; if(name) name.value=p.name||'';
  }

  function openForm() {
    reset();
    fillClientSelect('');
    const m = document.getElementById('doc-form-modal');
    if (m) m.classList.add('open');
    const title = document.getElementById('form-title');
    if (title) title.textContent = 'Додати документ';
    const bs = document.getElementById('btn-save');
    if (bs) bs.textContent = 'Додати документ';
    const br = document.getElementById('btn-reset');
    if (br) br.style.display = '';
    setTimeout(() => {
      const t = document.getElementById('f-type');
      if (t) t.focus();
    }, 100);
  }
  function closeForm() {
    const m = document.getElementById('doc-form-modal');
    if (m) m.classList.remove('open');
    reset();
  }
  function toggleForm() { openForm(); }
  function collapseForm() {
    const m = document.getElementById('doc-form-modal');
    if (m) m.classList.remove('open');
  }
  function expandForm() {
    const m = document.getElementById('doc-form-modal');
    if (m) m.classList.add('open');
  }

  function reset() {
    editingId = null;
    ['f-name','f-num','f-project-code','f-project-name','f-counter','f-edrpou','f-link','f-notes','f-addendum-num','f-addendum-project','f-addendum-counter','f-addendum-link','f-addendum-notes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const amount = document.getElementById('f-amount'); if (amount) amount.value = 0;
    const ck = document.getElementById('f-contract-kind'); if (ck) ck.value = 'income';
    const addAmount = document.getElementById('f-addendum-amount'); if (addAmount) addAmount.value = 0;
    const project = document.getElementById('f-project'); if (project) project.value = '';
    const date = document.getElementById('f-date'); if (date) date.value = new Date().toISOString().slice(0,10);
    const addDate = document.getElementById('f-addendum-date'); if (addDate) addDate.value = new Date().toISOString().slice(0,10);
    const until = document.getElementById('f-until'); if (until) until.value = '';
    const addUntil = document.getElementById('f-addendum-until'); if (addUntil) addUntil.value = '';
    const type = document.getElementById('f-type'); if (type) type.value = 'contract';
    const status = document.getElementById('f-status'); if (status) status.value = 'active';
    const addStatus = document.getElementById('f-addendum-status'); if (addStatus) addStatus.value = 'active';
    const emp = document.getElementById('f-emp'); if (emp) emp.value = '';
    const addEmp = document.getElementById('f-addendum-emp'); if (addEmp) addEmp.value = '';
    const parent = document.getElementById('f-parent-contract'); if (parent) parent.value = '';
    fillParentContractSelect();
    typeChanged();
    document.getElementById('form-title').textContent = 'Додати документ';
    document.getElementById('btn-save').textContent = 'Додати документ';
    document.getElementById('btn-reset').style.display = 'none';
  }

  function save() {
    if (!canEdit()) { denyEdit(); return; }
    const type = document.getElementById('f-type').value;

    if (type === 'addendum') {
      const addNum = document.getElementById('f-addendum-num').value.trim();
      const parentId = document.getElementById('f-parent-contract').value;
      const dateVal = document.getElementById('f-addendum-date').value;
      const parent = db.docs.find(d => d.id === parentId && d.type === 'contract');
      if (!addNum) { alert('Вкажіть номер додатка'); return; }
      if (!parent) { alert('Оберіть договір, до якого додається додаток'); return; }
      if (!dateVal) { alert('Вкажіть дату додатка'); return; }

      const doc = {
        id: editingId || 'doc_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36),
        name: `Додаток №${addNum} до договору №${parent.num || '—'}`,
        type: 'addendum',
        num: addNum,
        parentContractId: parent.id,
        parentContractNum: parent.num || '',
        projectId: parent.projectId || '',
        projectCode: parent.projectCode || '',
        projectName: parent.projectName || '',
        date: dateVal,
        until: document.getElementById('f-addendum-until').value,
        amount: Number(document.getElementById('f-addendum-amount').value) || 0,
        contractKind: parent.contractKind || '',
        clientId: parent.clientId || '',
        counter: parent.counter || '',
        edrpou: parent.edrpou || '',
        status: document.getElementById('f-addendum-status').value,
        employeeId: document.getElementById('f-addendum-emp').value,
        link: document.getElementById('f-addendum-link').value.trim(),
        notes: document.getElementById('f-addendum-notes').value.trim(),
        updatedAt: new Date().toISOString().slice(0,10)
      };
      if (editingId) {
        const idx = db.docs.findIndex(x => x.id === editingId);
        if (idx >= 0) { doc.createdAt = db.docs[idx].createdAt || new Date().toISOString().slice(0,10); db.docs[idx] = doc; }
        alert('✅ Додаток оновлено');
      } else {
        doc.createdAt = new Date().toISOString().slice(0,10);
        db.docs.push(doc);
        alert('✅ Додаток додано');
      }
      saveDB(); reset(); collapseForm(); render(); return;
    }

    const name = document.getElementById('f-name').value.trim();
    if (!name) { alert('Вкажіть назву документу'); return; }
    const dateVal = document.getElementById('f-date').value;
    if (!dateVal) { alert('Вкажіть дату документу'); return; }

    const clientId = document.getElementById('f-client')?.value || '';
    if (type === 'contract' && !clientId) {
      alert('Оберіть контрагента з CRM.\nЯкщо його немає — спочатку додайте в модулі CRM.');
      return;
    }
    onClientPick();

    const link = projectFromForm();
    const projectId = link.projectId, projectCode = link.projectCode, projectName = link.projectName;

    const kindVal = type === 'contract'
      ? (document.getElementById('f-contract-kind')?.value || 'income')
      : '';
    if (type === 'contract' && kindVal !== 'income' && kindVal !== 'expense') {
      alert('Оберіть вид договору: прибутковий або витратний');
      return;
    }

    const doc = {
      id: editingId || 'doc_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36),
      name, type, num: document.getElementById('f-num').value.trim(),
      projectId, projectCode, projectName,
      date: dateVal, until: document.getElementById('f-until').value,
      amount: Number(document.getElementById('f-amount').value) || 0,
      contractKind: kindVal,
      clientId: clientId || '',
      counter: (document.getElementById('f-counter')?.value || '').trim(),
      edrpou: (document.getElementById('f-edrpou')?.value || '').trim(),
      status: document.getElementById('f-status')?.value || 'active',
      employeeId: document.getElementById('f-emp')?.value || '',
      link: (document.getElementById('f-link')?.value || '').trim(),
      notes: (document.getElementById('f-notes')?.value || '').trim(),
      updatedAt: new Date().toISOString().slice(0,10)
    };
    if (editingId) {
      const idx = db.docs.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        doc.createdAt = db.docs[idx].createdAt || new Date().toISOString().slice(0,10);
        db.docs[idx] = doc;
      } else {
        db.docs.push(doc);
      }
      alert('✅ Документ оновлено');
    } else {
      doc.createdAt = new Date().toISOString().slice(0,10);
      db.docs.push(doc);
      alert('✅ Документ додано');
    }
    saveDB();
    // скинути фільтри, щоб новий документ точно було видно
    const search = document.getElementById('search'); if (search) search.value = '';
    const ftype = document.getElementById('filter-type'); if (ftype) ftype.value = '';
    const fkind = document.getElementById('filter-contract-kind'); if (fkind) fkind.value = '';
    const fstat = document.getElementById('filter-status'); if (fstat) fstat.value = '';
    reset();
    collapseForm();
    render();
  }

  function edit(id) {
    const doc = db.docs.find(x => x.id === id);
    if (!doc) return;
    editingId = id;
    document.getElementById('f-type').value = doc.type || 'contract';
    typeChanged();

    if (doc.type === 'addendum') {
      fillParentContractSelect(doc.parentContractId || '');
      document.getElementById('f-addendum-num').value = doc.num || '';
      document.getElementById('f-addendum-date').value = doc.date || '';
      document.getElementById('f-addendum-until').value = doc.until || '';
      document.getElementById('f-addendum-amount').value = doc.amount || 0;
      document.getElementById('f-addendum-status').value = doc.status || 'active';
      document.getElementById('f-addendum-emp').value = doc.employeeId || '';
      document.getElementById('f-addendum-link').value = doc.link || '';
      document.getElementById('f-addendum-notes').value = doc.notes || '';
      syncParentContract();
    } else {
      document.getElementById('f-name').value = doc.name || '';
      document.getElementById('f-num').value = doc.num || '';
      document.getElementById('f-date').value = doc.date || '';
      document.getElementById('f-until').value = doc.until || '';
      document.getElementById('f-amount').value = doc.amount || 0;
      const ck = document.getElementById('f-contract-kind');
      if (ck) ck.value = doc.contractKind === 'expense' ? 'expense' : 'income';
      if (typeof fillClientSelect === 'function') {
        fillClientSelect(doc.clientId || '');
        if (!doc.clientId && (doc.edrpou || doc.counter)) {
          const clients = typeof getCrmClients === 'function' ? getCrmClients() : [];
          const match = clients.find(c =>
            (doc.edrpou && String(c.edrpou || '').replace(/\s/g, '') === String(doc.edrpou).replace(/\s/g, '')) ||
            (doc.counter && String(c.name || '').toLowerCase() === String(doc.counter).toLowerCase())
          );
          if (match) fillClientSelect(match.id);
        }
      }
      if (typeof onClientPick === 'function') onClientPick();
      document.getElementById('f-counter').value = doc.counter || '';
      document.getElementById('f-edrpou').value = doc.edrpou || '';
      document.getElementById('f-status').value = doc.status || 'active';
      document.getElementById('f-emp').value = doc.employeeId || '';
      document.getElementById('f-link').value = doc.link || '';
      document.getElementById('f-notes').value = doc.notes || '';
      fillDocProject(doc.projectId || '');
    }

    document.getElementById('form-title').textContent = doc.type === 'addendum' ? 'Редагувати додаток' : 'Редагувати документ';
    document.getElementById('btn-save').textContent = 'Зберегти зміни';
    document.getElementById('btn-reset').style.display = '';
    expandForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function del(id) {
    if (!canEdit()) { denyEdit(); return; }
    const doc = db.docs.find(x => x.id === id);
    if (!doc) return;
    if (!confirm('Видалити «' + doc.name + '»?')) return;
    db.docs = db.docs.filter(x => x.id !== id);
    saveDB();
    render();
  }

  function render() {
    renderStats();
    renderTable();
  }

  function renderStats() {
    const docs = db.docs;
    const total = docs.length;
    const active = docs.filter(d => d.status === 'active').length;
    const incomeAmt = docs.filter(d => d.type === 'contract' && d.contractKind === 'income').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const expenseAmt = docs.filter(d => d.type === 'contract' && d.contractKind === 'expense').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const fmt = n => new Intl.NumberFormat('uk-UA').format(Math.round(n));

    document.getElementById('stats').innerHTML = `
      <div class="sc"><div class="scl">Всього документів</div>
        <div class="scv scv-b">${total}</div></div>
      <div class="sc"><div class="scl">Активні</div>
        <div class="scv scv-g">${active}</div></div>
      <div class="sc"><div class="scl">Договори (прибуток)</div>
        <div class="scv scv-g" style="font-size:18px">${fmt(incomeAmt)} ₴</div></div>
      <div class="sc"><div class="scl">Договори (витрати)</div>
        <div class="scv scv-o" style="font-size:18px">${fmt(expenseAmt)} ₴</div></div>`;
  }

  function renderTable() {
    const el = document.getElementById('doc-list');
    const q = (document.getElementById('search').value || '').toLowerCase().trim();
    const ft = document.getElementById('filter-type').value;
    const fs = document.getElementById('filter-status').value;

    let list = db.docs.slice();
    if (q) list = list.filter(d =>
      (d.name||'').toLowerCase().includes(q) ||
      (d.num||'').toLowerCase().includes(q) ||
      (d.projectCode||'').toLowerCase().includes(q) ||
      (d.projectName||'').toLowerCase().includes(q) ||
      (d.counter||'').toLowerCase().includes(q) ||
      (d.edrpou||'').toLowerCase().includes(q)
    );
    if (ft) list = list.filter(d => d.type === ft);
    if (fs) list = list.filter(d => d.status === fs);
    const fk = document.getElementById('filter-contract-kind')?.value || '';
    if (fk) {
      list = list.filter(d => {
        if (d.type === 'contract') return (d.contractKind || 'income') === fk;
        if (d.type === 'addendum' && d.parentContractId) {
          const parent = db.docs.find(x => x.id === d.parentContractId);
          return parent && (parent.contractKind || 'income') === fk;
        }
        return false;
      });
    }

    list.sort((a,b) => (b.date||'').localeCompare(a.date||''));

    document.getElementById('doc-count').textContent = list.length;

    if (!list.length) {
      el.innerHTML = '<div class="tm">' + (q || ft || fs || (document.getElementById('filter-contract-kind')?.value) ? 'Нічого не знайдено за фільтрами' : 'Документів ще немає. Додайте перший.') + '</div>';
      return;
    }

    const emps = getEmployees();
    const empMap = {};
    emps.forEach(e => empMap[e.id] = e.fullName);

    let html = '<table class="dt"><thead><tr>' +
      '<th>Документ</th><th>Тип</th><th>Дата</th><th>Контрагент</th>' +
      '<th>Сума</th><th>Статус</th><th>Відповідальний</th><th></th>' +
      '</tr></thead><tbody>';

    list.forEach(d => {
      const tp = TYPES[d.type] || TYPES.other;
      const st = STATUSES[d.status] || STATUSES.active;
      const emp = d.employeeId ? (empMap[d.employeeId] || '—') : '—';
      const amount = Number(d.amount) || 0;
      let kind = d.contractKind;
      if (!kind && d.type === 'addendum' && d.parentContractId) {
        const parent = db.docs.find(x => x.id === d.parentContractId);
        kind = parent && parent.contractKind;
      }
      const kindMeta = kind && CONTRACT_KINDS[kind] ? CONTRACT_KINDS[kind] : null;
      const kindBadge = kindMeta
        ? `<div style="margin-top:4px"><span class="bg ${kindMeta.cls}">${kindMeta.icon} ${kindMeta.short}</span></div>`
        : '';

      html += `<tr>
        <td><b>${esc(d.name)}</b>${d.num ? '<div class="tsm tmu tmn">№ ' + esc(d.num) + '</div>' : ''}</td>
        <td>${tp.icon} ${tp.name}${kindBadge}</td>
        <td>${d.date ? d.date.split('-').reverse().join('.') : '—'}</td>
        <td>${esc(d.counter) || '—'}${d.edrpou ? '<div class="tsm tmu tmn">' + esc(d.edrpou) + '</div>' : ''}</td>
        <td class="amount">${amount ? new Intl.NumberFormat('uk-UA').format(amount) + ' ₴' : '—'}</td>
        <td><span class="bg ${st.cls}">${st.icon} ${st.name}</span></td>
        <td>${esc(emp)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn bs bxs" onclick="Doc.openDetail('${d.id}')">👁</button>
          ${canEdit() ? `<button class="btn bs bxs" onclick="Doc.edit('${d.id}')">✏️</button>
          <button class="btn bd bxs" onclick="Doc.del('${d.id}')">×</button>` : ''}
        </td></tr>`;
    });

    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function filter() { renderTable(); }

  function openDetail(id) {
    const d = db.docs.find(x => x.id === id);
    if (!d) return;
    const tp = TYPES[d.type] || TYPES.other;
    const st = STATUSES[d.status] || STATUSES.active;
    const emps = getEmployees();
    const emp = d.employeeId ? (emps.find(e => e.id === d.employeeId) || {}).fullName : null;
    const fmt = n => new Intl.NumberFormat('uk-UA', {minimumFractionDigits:2}).format(n || 0);

    document.getElementById('detail-title').textContent = tp.icon + ' ' + d.name;

    const row = (lbl, val) => `<div class="detail-row"><div class="lbl">${lbl}</div><div class="val">${val || '—'}</div></div>`;

    const linkHtml = safeUrl(d.link)
      ? `<a href="${esc(safeUrl(d.link))}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:none">🔗 Відкрити файл</a>`
      : '—';

    document.getElementById('detail-body').innerHTML = `
      ${row('Тип', tp.name)}
      ${row('Номер', esc(d.num))}
      ${d.type === 'addendum' ? row('До договору', esc(d.parentContractNum ? '№ ' + d.parentContractNum : '')) : ''}
      ${row('Код проекту', esc(d.projectCode))}
      ${row('Назва проекту', esc(d.projectName))}
      ${row('Дата', d.date ? d.date.split('-').reverse().join('.') : '')}
      ${row('Діє до', d.until ? d.until.split('-').reverse().join('.') : '')}
      ${row('Сума', d.amount ? fmt(d.amount) + ' ₴' : '')}
      ${row('Контрагент', esc(d.counter))}
      ${row('ЄДРПОУ', esc(d.edrpou))}
      ${row('Статус', '<span class="bg ' + st.cls + '">' + st.icon + ' ' + st.name + '</span>')}
      ${row('Відповідальний', esc(emp))}
      ${row('Файл', linkHtml)}
      ${row('Примітки', esc(d.notes))}
      ${row('Додано', d.createdAt ? d.createdAt.split('-').reverse().join('.') : '')}
      ${row('Оновлено', d.updatedAt ? d.updatedAt.split('-').reverse().join('.') : '')}
      <div class="fg" style="margin-top:20px">
        ${canEdit() ? `<button class="btn bp" onclick="Doc.closeDetail();Doc.edit('${d.id}')">✏️ Редагувати</button>` : ''}
        <button class="btn bs" onclick="Doc.printDetail('${d.id}')">🖨️ Друкувати</button>
      </div>
    `;

    document.getElementById('detail-modal').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('detail-modal').classList.remove('open');
  }

  function printDetail(id) {
    const d = db.docs.find(x => x.id === id);
    if (!d) return;
    const tp = TYPES[d.type] || TYPES.other;
    const st = STATUSES[d.status] || STATUSES.active;
    const emps = getEmployees();
    const emp = d.employeeId ? (emps.find(e => e.id === d.employeeId) || {}).fullName : '—';
    const hr = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
    const co = hr.company || {};
    const fmt = n => new Intl.NumberFormat('uk-UA', {minimumFractionDigits:2}).format(n || 0);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(d.name)}</title>
    <style>
      body{font-family:'Times New Roman',serif;padding:40px;max-width:750px;margin:0 auto;color:#000;font-size:13pt}
      .hdr{text-align:center;margin-bottom:20px;font-size:11pt;color:#666}
      h1{font-size:16pt;border-bottom:2px solid #1e40af;padding-bottom:10px;color:#1e3a8a;text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12pt}
      td{padding:10px 12px;border-bottom:1px solid #ddd;vertical-align:top}
      td:first-child{color:#555;width:40%;font-weight:500}
      td:last-child{font-weight:600}
      .foot{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:10pt;color:#888;text-align:center}
      .sign{margin-top:60px;display:flex;justify-content:space-between}
      .sign div{border-top:1px solid #333;padding-top:5px;width:220px;text-align:center;font-size:11pt}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="hdr">${esc(co.name) || 'NEXUS ENGENEERING'}${co.edrpou ? ' · ЄДРПОУ ' + esc(co.edrpou) : ''}</div>
    <h1>${tp.icon} ${esc(d.name)}</h1>
    <table>
      <tr><td>Тип документу</td><td>${tp.name}</td></tr>
      <tr><td>Номер</td><td>${esc(d.num) || '—'}</td></tr>
      <tr><td>Код проекту</td><td>${esc(d.projectCode) || '—'}</td></tr>
      <tr><td>Назва проекту</td><td>${esc(d.projectName) || '—'}</td></tr>
      <tr><td>Дата</td><td>${d.date ? d.date.split('-').reverse().join('.') : '—'}</td></tr>
      <tr><td>Діє до</td><td>${d.until ? d.until.split('-').reverse().join('.') : '—'}</td></tr>
      <tr><td>Сума</td><td>${d.amount ? fmt(d.amount) + ' ₴' : '—'}</td></tr>
      <tr><td>Контрагент</td><td>${esc(d.counter) || '—'}</td></tr>
      <tr><td>ЄДРПОУ контрагента</td><td>${esc(d.edrpou) || '—'}</td></tr>
      <tr><td>Статус</td><td>${st.name}</td></tr>
      <tr><td>Відповідальний</td><td>${esc(emp)}</td></tr>
      <tr><td>Примітки</td><td>${esc(d.notes) || '—'}</td></tr>
    </table>
    <div class="sign">
      <div>Підпис відповідальної особи</div>
      <div>${esc(co.director) || 'Підпис керівника'}</div>
    </div>
    <div class="foot">Документ сформовано ${new Date().toLocaleString('uk-UA')} · NEXUS ENGENEERING</div>
    <script>setTimeout(function(){window.print()},300)<\/script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    w.document.write(html);
    w.document.close();
  }

  function exportExcel() {
    if (!db.docs.length) { alert('Немає даних'); return; }
    const emps = getEmployees();
    const empMap = {};
    emps.forEach(e => empMap[e.id] = e.fullName);

    const data = [
      ['Назва','Тип','Номер','Код проекту','Назва проекту','Дата','Діє до','Сума','Контрагент','ЄДРПОУ','Статус','Відповідальний','Посилання','Примітки']
    ];
    db.docs.forEach(d => {
      data.push([
        d.name,
        (TYPES[d.type] || TYPES.other).name,
        (CONTRACT_KINDS[d.contractKind] || {}).name || '',
        d.num || '',
        d.projectCode || '',
        d.projectName || '',
        d.date || '',
        d.until || '',
        Number(d.amount) || 0,
        d.counter || '',
        d.edrpou || '',
        (STATUSES[d.status] || STATUSES.active).name,
        d.employeeId ? (empMap[d.employeeId] || '') : '',
        d.link || '',
        d.notes || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch:30},{wch:14},{wch:12},{wch:16},{wch:25},{wch:12},{wch:12},{wch:14},{wch:25},{wch:14},{wch:14},{wch:25},{wch:30},{wch:25}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Документи');
    XLSX.writeFile(wb, 'documents-' + new Date().toISOString().slice(0,10) + '.xlsx');
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'documents-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(ev) {
    if (!canEdit()) { denyEdit(); ev.target.value = ''; return; }
    const f = ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d.docs) throw new Error('Невірний формат');
        db = d;
        saveDB();
        render();
        alert('✅ Імпортовано: ' + d.docs.length + ' документів');
      } catch(e) { alert('Помилка: ' + e.message); }
    };
    r.readAsText(f);
    ev.target.value = '';
  }

  function clearAll() {
    if (!canEdit()) { denyEdit(); return; }
    if (!confirm('Видалити ВСІ документи?')) return;
    if (!confirm('Точно видалити ' + db.docs.length + ' документів?')) return;
    db.docs = [];
    saveDB();
    render();
    alert('🗑️ Документи очищено');
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('documents')) return;
    if (!initAuth()) return;
    initTheme();
    fillEmployeeSelect();
    fillClientSelect('');
    reset();
    render();
    setInterval(fillEmployeeSelect, 15000);
  }

  return {
    init, save, reset, edit, del, toggleForm, openForm, closeForm, collapseForm, expandForm, filter, onClientPick, fillClientSelect,
    openDetail, closeDetail, printDetail,
    exportExcel, exportJSON, importJSON, clearAll,
    logout, syncProject, typeChanged, syncParentContract
  };
})();

window.Doc = Doc;

document.addEventListener('DOMContentLoaded', () => Doc.init());