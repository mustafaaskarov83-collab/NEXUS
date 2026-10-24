/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING — Задачі та проєкти v1.0.1
   Kanban-дошка з drag-and-drop
   ═══════════════════════════════════════════════════════════════════════ */

const Tasks = (() => {

  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const TASK_KEY = 'nexus_tasks_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let db = loadDB();
  let editingId = null;
  let draggingId = null;

  const COLUMNS = [
    { id: 'backlog',  title: '💡 Ідеї',       cls: 'kcol--backlog' },
    { id: 'todo',     title: '📋 До виконання', cls: 'kcol--todo' },
    { id: 'progress', title: '⚙️ В роботі',    cls: 'kcol--progress' },
    { id: 'done',     title: '✅ Готово',       cls: 'kcol--done' }
  ];

  const PRIORITIES = {
    low:    { name: 'Низький',    cls: 'low' },
    normal: { name: 'Звичайний',  cls: 'normal' },
    high:   { name: 'Високий',    cls: 'high' },
    urgent: { name: 'Терміново',  cls: 'urgent' }
  };

  function loadDB() {
    try {
      const r = localStorage.getItem(TASK_KEY);
      if (r) { const p = JSON.parse(r); if (p && p.tasks) return p; }
    } catch(e){}
    return { tasks: [], meta: { created: new Date().toISOString().slice(0,10), version: '1.0' } };
  }

  function saveDB() {
    try { localStorage.setItem(TASK_KEY, JSON.stringify(db)); } catch(e){}
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
    const u = getCurrentUser();
    return !!u && u.role !== 'viewer';
  }
  function denyEdit() {
    alert('Недостатньо прав: роль «Перегляд» не дозволяє змінювати дані.');
    return false;
  }

  function initAuth() {
    const user = getCurrentUser();
    if (!user) {
      try { sessionStorage.setItem('nexus_redirect_after_login', 'tasks.html'); } catch(e){}
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

  function formatDate(s) {
    if (!s) return '';
    return s.split('-').reverse().join('.');
  }

  function dateState(deadline) {
    if (!deadline) return '';
    const today = new Date().toISOString().slice(0,10);
    if (deadline < today) return 'overdue';
    if (deadline === today) return 'today';
    return '';
  }

  function daysLeft(deadline) {
    if (!deadline) return '';
    const d1 = new Date(deadline + 'T00:00:00');
    const d2 = new Date();
    d2.setHours(0,0,0,0);
    const diff = Math.round((d1 - d2) / 86400000);
    if (diff < 0) return 'прострочено';
    if (diff === 0) return 'сьогодні';
    if (diff === 1) return 'завтра';
    return 'через ' + diff + ' д.';
  }

  function fillEmployeeFilter() {
    const sel = document.getElementById('filter-emp');
    if (!sel) return;
    const current = sel.value;
    const emps = getEmployees();
    sel.innerHTML = '<option value="">Всі виконавці</option>' +
      emps.map(e => `<option value="${e.id}">${e.fullName}</option>`).join('');
    if (current) sel.value = current;
  }

  function render() {
    renderStats();
    renderKanban();
  }

  function renderStats() {
    const tasks = db.tasks;
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.deadline && dateState(t.deadline) === 'overdue' && t.status !== 'done').length;

    document.getElementById('stats').innerHTML = `
      <div class="sc"><div class="scl">Всього задач</div>
        <div class="scv scv-b">${total}</div></div>
      <div class="sc"><div class="scl">В роботі</div>
        <div class="scv scv-o">${inProgress}</div></div>
      <div class="sc"><div class="scl">Готово</div>
        <div class="scv scv-g">${done}</div></div>
      <div class="sc"><div class="scl">Прострочено</div>
        <div class="scv scv-r">${overdue}</div></div>`;
  }

  function getFilteredTasks() {
    const q = (document.getElementById('search').value || '').toLowerCase().trim();
    const fp = document.getElementById('filter-priority').value;
    const fe = document.getElementById('filter-emp').value;

    let list = db.tasks.slice();
    if (q) list = list.filter(t =>
      (t.title||'').toLowerCase().includes(q) ||
      (t.description||'').toLowerCase().includes(q)
    );
    if (fp) list = list.filter(t => t.priority === fp);
    if (fe) list = list.filter(t => t.employeeId === fe);
    return list;
  }

  function renderKanban() {
    const el = document.getElementById('kanban');
    if (!el) return;

    const tasks = getFilteredTasks();
    const emps = getEmployees();
    const empMap = {};
    emps.forEach(e => empMap[e.id] = e.fullName);

    el.innerHTML = COLUMNS.map(col => {
      const colTasks = tasks.filter(t => t.status === col.id);
      return `<div class="kcol ${col.cls}" data-status="${col.id}">
        <div class="kcol__head">
          <div class="kcol__title">${col.title}</div>
          <div class="kcol__count">${colTasks.length}</div>
        </div>
        <div class="kcol__body" data-status="${col.id}">
          ${colTasks.length ? colTasks.map(t => renderCard(t, empMap)).join('')
            : '<div class="empty-col">Перетягніть задачу сюди</div>'}
        </div>
      </div>`;
    }).join('');

    attachDragEvents();
  }

  function renderCard(t, empMap) {
    const p = PRIORITIES[t.priority] || PRIORITIES.normal;
    const dState = dateState(t.deadline);
    const emp = t.employeeId ? empMap[t.employeeId] : null;
    const project = window.NexusCore ? NexusCore.projectLabel(t.projectId) : null;

    return `<div class="tcard tcard--${p.cls}" draggable="${canEdit() ? 'true' : 'false'}" data-id="${t.id}">
      <div class="tcard__actions">
        <button onclick="event.stopPropagation();Tasks.openDetail('${t.id}')" title="Деталі">👁</button>
        ${canEdit() ? `<button onclick="event.stopPropagation();Tasks.openForm('${t.id}')" title="Редагувати">✏️</button>` : ''}
      </div>
      <div class="tcard__title">${t.title}</div>
      <div class="tcard__meta">
        <span class="tcard__tag tcard__tag--${p.cls}">${p.name}</span>
        ${t.deadline ? `<span class="tcard__deadline ${dState}">📅 ${daysLeft(t.deadline)}</span>` : ''}
        ${project ? `<span class="tcard__emp">📁 ${project.split(' — ')[0]}</span>` : ''}${emp ? `<span class="tcard__emp">👤 ${emp.split(' ')[0]}</span>` : ''}
      </div>
    </div>`;
  }

  function attachDragEvents() {
    document.querySelectorAll('.tcard').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggingId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggingId);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggingId = null;
      });
      card.addEventListener('click', () => {
        openDetail(card.dataset.id);
      });
    });

    document.querySelectorAll('.kcol__body').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.closest('.kcol').classList.add('dragover');
      });
      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.closest('.kcol').classList.remove('dragover');
        }
      });
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.closest('.kcol').classList.remove('dragover');
        if (!canEdit()) { denyEdit(); return; }
        const id = e.dataTransfer.getData('text/plain') || draggingId;
        const newStatus = col.dataset.status;
        if (!id || !newStatus) return;

        const task = db.tasks.find(x => x.id === id);
        if (!task || task.status === newStatus) return;

        task.status = newStatus;
        task.updatedAt = new Date().toISOString().slice(0,10);
        saveDB();
        render();
      });
    });
  }

  function openForm(id) {
    if (!canEdit()) { denyEdit(); return; }
    editingId = id || null;
    const t = id ? db.tasks.find(x => x.id === id) : null;

    document.getElementById('task-mt').textContent = id ? 'Редагувати задачу' : 'Нова задача';

    const emps = getEmployees();
    const empOpts = emps.map(e =>
      `<option value="${e.id}" ${t && t.employeeId === e.id ? 'selected' : ''}>${e.fullName}</option>`
    ).join('');

    document.getElementById('task-mb').innerHTML = `
      <div class="ff mb16">
        <label>Назва <span class="rq">*</span></label>
        <input id="t-title" value="${t ? esc(t.title) : ''}" placeholder="Що потрібно зробити?">
      </div>
      <div class="ff mb16">
        <label>Опис</label>
        <input id="t-desc" value="${t ? esc(t.description || '') : ''}" placeholder="Деталі задачі (необов'язково)">
      </div>
      <div class="fr">
        <div class="ff">
          <label>Статус</label>
          <select id="t-status">
            ${COLUMNS.map(c => `<option value="${c.id}" ${t && t.status === c.id ? 'selected' : (c.id === 'todo' && !t ? 'selected' : '')}>${c.title}</option>`).join('')}
          </select>
        </div>
        <div class="ff">
          <label>Пріоритет</label>
          <select id="t-priority">
            <option value="low" ${t && t.priority === 'low' ? 'selected' : ''}>🟢 Низький</option>
            <option value="normal" ${t && t.priority === 'normal' ? 'selected' : (!t ? 'selected' : '')}>🔵 Звичайний</option>
            <option value="high" ${t && t.priority === 'high' ? 'selected' : ''}>🟠 Високий</option>
            <option value="urgent" ${t && t.priority === 'urgent' ? 'selected' : ''}>🔴 Терміново</option>
          </select>
        </div>
      </div>
      <div class="fr">
        <div class="ff">
          <label>Дедлайн</label>
          <input type="date" id="t-deadline" value="${t && t.deadline ? t.deadline : ''}">
        </div>
        <div class="ff">
          <label>Виконавець</label>
          <select id="t-emp">
            <option value="">— не вказано —</option>
            ${empOpts}
          </select>
        </div>
        <div class="ff">
          <label>Проект</label><select id="t-project"><option value="">— без проекту —</option></select>
        </div>
      </div>
      <div class="fg" style="margin-top:20px;justify-content:space-between">
        <div>
          ${t ? `<button class="btn bd" onclick="Tasks.del('${t.id}')">🗑️ Видалити</button>` : ''}
        </div>
        <div class="fg">
          <button class="btn bs" onclick="Tasks.closeForm()">Скасувати</button>
          <button class="btn bp" onclick="Tasks.save()">${t ? 'Зберегти' : 'Створити'}</button>
        </div>
      </div>
    `;

    document.getElementById('task-modal').classList.add('open');
    setTimeout(() => {
      if (window.NexusCore) NexusCore.fillProjectSelect(document.getElementById('t-project'), t?.projectId || '');
      const inp = document.getElementById('t-title');
      if (inp) inp.focus();
    }, 100);
  }

  function esc(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function closeForm() {
    document.getElementById('task-modal').classList.remove('open');
    editingId = null;
  }

  function save() {
    if (!canEdit()) { denyEdit(); return; }
    const title = document.getElementById('t-title').value.trim();
    if (!title) { alert('Вкажіть назву задачі'); return; }

    const task = {
      id: editingId || 'task_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36),
      title,
      description: document.getElementById('t-desc').value.trim(),
      status: document.getElementById('t-status').value,
      priority: document.getElementById('t-priority').value,
      deadline: document.getElementById('t-deadline').value || '',
      employeeId: document.getElementById('t-emp').value || '',
      projectId: document.getElementById('t-project')?.value || '',
      updatedAt: new Date().toISOString().slice(0,10)
    };

    if (editingId) {
      const idx = db.tasks.findIndex(x => x.id === editingId);
      if (idx >= 0) db.tasks[idx] = task;
    } else {
      task.createdAt = new Date().toISOString().slice(0,10);
      db.tasks.push(task);
    }

    saveDB();
    closeForm();
    render();
  }

  function del(id) {
    if (!canEdit()) { denyEdit(); return; }
    const t = db.tasks.find(x => x.id === id);
    if (!t) return;
    if (!confirm('Видалити задачу «' + t.title + '»?')) return;
    db.tasks = db.tasks.filter(x => x.id !== id);
    saveDB();
    closeForm();
    closeDetail();
    render();
  }

  function openDetail(id) {
    const t = db.tasks.find(x => x.id === id);
    if (!t) return;

    const p = PRIORITIES[t.priority] || PRIORITIES.normal;
    const col = COLUMNS.find(c => c.id === t.status) || COLUMNS[0];
    const emps = getEmployees();
    const emp = t.employeeId ? (emps.find(e => e.id === t.employeeId) || {}).fullName : null;

    document.getElementById('detail-title').textContent = t.title;

    const row = (lbl, val) => `<div class="detail-row"><div class="lbl">${lbl}</div><div class="val">${val || '—'}</div></div>`;

    document.getElementById('detail-body').innerHTML = `
      ${t.description ? row('Опис', t.description) : ''}
      ${row('Статус', col.title)}
      ${row('Пріоритет', `<span class="tcard__tag tcard__tag--${p.cls}">${p.name}</span>`)}
      ${row('Дедлайн', t.deadline ? formatDate(t.deadline) + ' (' + daysLeft(t.deadline) + ')' : '')}
      ${row('Виконавець', emp)}
      ${row('Створено', t.createdAt ? formatDate(t.createdAt) : '')}
      ${row('Оновлено', t.updatedAt ? formatDate(t.updatedAt) : '')}
      <div class="fg" style="margin-top:20px">
        ${canEdit() ? `<button class="btn bp" onclick="Tasks.closeDetail();Tasks.openForm('${t.id}')">✏️ Редагувати</button>
        <button class="btn bs" onclick="Tasks.del('${t.id}')">🗑️ Видалити</button>` : ''}
      </div>
    `;

    document.getElementById('detail-modal').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('detail-modal').classList.remove('open');
  }

  function filter() {
    renderKanban();
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('tasks')) return;
    if (!initAuth()) return;
    initTheme();
    fillEmployeeFilter();
    render();
    setInterval(fillEmployeeFilter, 15000);
  }

  return {
    init, save, del, openForm, closeForm,
    openDetail, closeDetail,
    filter, logout
  };
})();

window.Tasks = Tasks;

document.addEventListener('DOMContentLoaded', () => Tasks.init());