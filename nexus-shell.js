/* NEXUS — Persistent left navigation shell (all modules)
 * Injects a fixed sidebar on every page except when one already exists (index).
 * Layout: sidebar always left · module content fills the center.
 */
(() => {
  'use strict';
  if (window.__nexusShellLoaded) return;
  window.__nexusShellLoaded = true;

  const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase().split('?')[0].split('#')[0];
  // index.html already has full shell markup
  if (PAGE === 'index.html' || PAGE === '' || PAGE === '/') return;
  if (document.getElementById('nexus-sidebar')) return;

  const NAV = [
    { id: 'cabinet', href: 'index.html', icon: '🏠', label: 'Мій кабінет' },
    { section: 'Модулі' },
    { id: 'hr', href: 'hr.html', icon: '👥', label: 'Кадровий облік' },
    { id: 'projects', href: 'projects.html', icon: '📁', label: 'Проекти' },
    { id: 'tasks', href: 'tasks.html', icon: '✅', label: 'Задачі' },
    { id: 'calendar', href: 'calendar.html', icon: '📅', label: 'Календар' },
    { id: 'mail', href: 'mail.html', icon: '✉', label: 'Пошта' },
    { id: 'inventory', href: 'inventory.html', icon: '📦', label: 'Інвентар' },
    { id: 'fleet', href: 'fleet.html', icon: '🚗', label: 'Авто і паливо' },
    { id: 'warehouse', href: 'warehouse.html', icon: '🏬', label: 'Склад' },
    { id: 'documents', href: 'documents.html', icon: '📄', label: 'Документообіг' },
    { id: 'finance', href: 'finance.html', icon: '💰', label: 'Фінанси' },
    { id: 'crm', href: 'crm.html', icon: '🤝', label: 'CRM — Клієнти' },
    { id: 'dashboard', href: 'dashboard.html', icon: '📊', label: 'Дашборд KPI' },
    { id: 'reports', href: 'reports.html', icon: '📈', label: 'Звіти' },
    { id: 'audit', href: 'audit.html', icon: '📋', label: 'Аудит / Логи' }
  ];

  function currentUser() {
    if (window.NexusCore && NexusCore.getCurrentUser) return NexusCore.getCurrentUser();
    try {
      const s = JSON.parse(localStorage.getItem('nexus_session_v1') || 'null');
      if (!s || !s.userId || (s.expiresAt && s.expiresAt < Date.now())) return null;
      const users = JSON.parse(localStorage.getItem('nexus_users_v1') || '[]');
      return users.find(u => u.id === s.userId) || null;
    } catch (e) { return null; }
  }

  function hasAccess(modId, user) {
    if (!user) return false;
    if (modId === 'cabinet') return true;
    if (window.NexusCore && NexusCore.hasModuleAccess) return NexusCore.hasModuleAccess(modId, user);
    if (user.role === 'admin') return true;
    const mods = Array.isArray(user.modules) ? user.modules : [];
    return mods.includes('*') || mods.includes(modId);
  }

  function activeId() {
    const found = NAV.find(n => n.href === PAGE);
    return found ? found.id : null;
  }

  function injectStyles() {
    if (document.getElementById('nexus-shell-css')) return;
    const css = document.createElement('style');
    css.id = 'nexus-shell-css';
    css.textContent = `
/* NEXUS persistent shell — compact premium */
html.nexus-shell-on, body.nexus-shell-on { min-height: 100vh; }
body.nexus-shell-on {
  margin: 0;
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch;
}
#nexus-sidebar.nexus-shell-sidebar {
  width: 220px;
  min-width: 220px;
  flex-shrink: 0;
  background: #0a0f18;
  border-right: 1px solid rgba(255,255,255,.05);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 9000;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #e8eef6;
  -webkit-font-smoothing: antialiased;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.12) transparent;
}
.nx-shell-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 12px 8px;
}
.nx-shell-logo {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(145deg, #1a6bb5, #0a355c);
  color: #fff; font-weight: 800; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(15,76,129,.3);
}
.nx-shell-brand-n { font-weight: 700; font-size: 12.5px; letter-spacing: -.02em; }
.nx-shell-brand-t { font-size: 10px; color: #6b7c94; margin-top: 0; }
.nx-shell-user {
  display: flex; align-items: center; gap: 8px;
  margin: 2px 8px 10px; padding: 7px 8px;
  border-radius: 10px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.05);
}
.nx-shell-av {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(145deg, #1a6bb5, #0d9488);
  color: #fff; font-weight: 700; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  background-size: cover; background-position: center; flex-shrink: 0;
}
.nx-shell-un { font-weight: 600; font-size: 12px; line-height: 1.2; }
.nx-shell-ur { font-size: 10px; color: #6b7c94; margin-top: 1px; }
.nx-shell-nav { flex: 1; padding: 0 6px 8px; display: flex; flex-direction: column; gap: 0; }
.nx-shell-sec {
  font-size: 9.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .1em; color: #5a6b82; padding: 10px 10px 4px;
}
.nx-shell-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  color: #8b9bb4; text-decoration: none; font-size: 12.5px; font-weight: 500;
  transition: background .14s, color .14s;
  letter-spacing: -.01em;
}
.nx-shell-item:hover { background: rgba(255,255,255,.05); color: #e8eef6; }
.nx-shell-item.is-active {
  background: rgba(26,107,181,.28);
  color: #fff; font-weight: 600;
  box-shadow: inset 3px 0 0 #3b82f6;
  border-radius: 8px 8px 8px 8px;
}
.nx-shell-ico { width: 18px; text-align: center; flex-shrink: 0; font-size: 13px; opacity: .92; }
.nx-shell-lbl { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nx-shell-meta { font-size: 10px; color: #6b7c94; padding: 2px 10px 6px; line-height: 1.35; }
.nx-shell-foot {
  padding: 6px 6px 10px; border-top: 1px solid rgba(255,255,255,.05);
  display: flex; flex-direction: column; gap: 0;
}
.nx-shell-foot button {
  border: 0; background: transparent; color: #6b7c94;
  text-align: left; padding: 7px 10px; border-radius: 8px;
  cursor: pointer; font: inherit; font-size: 12px; font-weight: 500;
}
.nx-shell-foot button:hover { background: rgba(255,255,255,.05); color: #e8eef6; }
.nx-shell-foot .nx-shell-out:hover { color: #f87171; }
#nexus-shell-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: auto;
  animation: nxMainIn .38s cubic-bezier(.22,1,.36,1) both;
}
@keyframes nxMainIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

/* ═══ COMPACT MODULE LAYOUT (all pages under shell) ═══ */
#nexus-shell-main,
#nexus-shell-main #app {
  max-width: 100%;
}
#nexus-shell-main body,
body.nexus-shell-on {
  font-size: 13px !important;
  line-height: 1.45 !important;
}
/* Header bar — slim */
#nexus-shell-main .hd,
#nexus-shell-main header.hd {
  padding: 0 14px !important;
  min-height: 48px !important;
  height: auto !important;
}
#nexus-shell-main .hd-in {
  max-width: 100% !important;
  margin: 0 !important;
  min-height: 48px !important;
  height: 48px !important;
  gap: 10px !important;
  padding: 0 !important;
}
#nexus-shell-main .hd-br {
  gap: 8px !important;
  font-size: 13px !important;
}
#nexus-shell-main .hd-br .bn,
#nexus-shell-main .bn {
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: -.01em !important;
}
#nexus-shell-main .hd-br .bs,
#nexus-shell-main .bs,
#nexus-shell-main .bsub {
  font-size: 11px !important;
  opacity: .85 !important;
}
#nexus-shell-main .hd-home {
  width: 28px !important;
  height: 28px !important;
  font-size: 14px !important;
  border-radius: 7px !important;
}
#nexus-shell-main .hd-r,
#nexus-shell-main .hd-actions {
  gap: 6px !important;
  flex-wrap: wrap !important;
}
#nexus-shell-main .hd-u {
  padding: 3px 8px 3px 3px !important;
  gap: 6px !important;
}
#nexus-shell-main .hd-av {
  width: 26px !important;
  height: 26px !important;
  font-size: 11px !important;
}
#nexus-shell-main .hd-un { font-size: 11.5px !important; }
#nexus-shell-main .hd-ur { font-size: 10px !important; }

/* Main content — tighter */
#nexus-shell-main .mn,
#nexus-shell-main .main,
#nexus-shell-main main,
#nexus-shell-main .content,
#nexus-shell-main .page,
#nexus-shell-main .wrap {
  max-width: 100% !important;
  margin: 0 auto !important;
  padding: 12px 14px 20px !important;
}
#nexus-shell-main .panel,
#nexus-shell-main .card,
#nexus-shell-main .c,
#nexus-shell-main .box,
#nexus-shell-main .section,
#nexus-shell-main .sg {
  border-radius: 10px !important;
}
#nexus-shell-main .panel,
#nexus-shell-main .card,
#nexus-shell-main .c {
  padding: 12px 14px !important;
}
#nexus-shell-main .panel-head,
#nexus-shell-main .card-head,
#nexus-shell-main .toolbar,
#nexus-shell-main .filters,
#nexus-shell-main .bar {
  gap: 8px !important;
  margin-bottom: 10px !important;
  flex-wrap: wrap !important;
  align-items: center !important;
}
#nexus-shell-main .panel-head h2,
#nexus-shell-main h1,
#nexus-shell-main h2 {
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: -.01em !important;
  margin: 0 !important;
}
#nexus-shell-main h3 {
  font-size: 13px !important;
  margin: 12px 0 8px !important;
}

/* Stats / KPI chips */
#nexus-shell-main .sc,
#nexus-shell-main .stat,
#nexus-shell-main .kpi {
  padding: 10px 12px !important;
  border-radius: 10px !important;
}
#nexus-shell-main .scl,
#nexus-shell-main .stat-label {
  font-size: 10px !important;
}
#nexus-shell-main .scv,
#nexus-shell-main .stat-value {
  font-size: 18px !important;
}

/* Buttons — compact, always fit */
#nexus-shell-main .btn,
#nexus-shell-main button.btn,
#nexus-shell-main a.btn {
  padding: 6px 12px !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  white-space: nowrap !important;
  line-height: 1.3 !important;
  gap: 4px !important;
  min-height: 30px !important;
  box-sizing: border-box !important;
}
#nexus-shell-main .btn.bsm,
#nexus-shell-main .bsm {
  padding: 4px 10px !important;
  font-size: 12px !important;
  min-height: 26px !important;
}
#nexus-shell-main .btn.bxs,
#nexus-shell-main .bxs {
  padding: 2px 7px !important;
  font-size: 11px !important;
  min-height: 22px !important;
  border-radius: 6px !important;
}
#nexus-shell-main .hd .btn,
#nexus-shell-main .hd-actions .btn {
  padding: 5px 10px !important;
  font-size: 12px !important;
  min-height: 28px !important;
}

/* Forms */
#nexus-shell-main input,
#nexus-shell-main select,
#nexus-shell-main textarea {
  font-size: 13px !important;
  padding: 7px 10px !important;
  border-radius: 8px !important;
  max-width: 100% !important;
}
#nexus-shell-main .ff label,
#nexus-shell-main label {
  font-size: 11.5px !important;
  margin-bottom: 4px !important;
}
#nexus-shell-main .ff {
  margin-bottom: 8px !important;
}
#nexus-shell-main .fr,
#nexus-shell-main .form-row,
#nexus-shell-main .actions {
  gap: 8px !important;
  flex-wrap: wrap !important;
}

/* Tables */
#nexus-shell-main table,
#nexus-shell-main .dt {
  font-size: 12.5px !important;
}
#nexus-shell-main th,
#nexus-shell-main td {
  padding: 6px 8px !important;
}
#nexus-shell-main th {
  font-size: 11px !important;
  font-weight: 600 !important;
}

/* Modals inside modules */
#nexus-shell-main .mo .md,
#nexus-shell-main .modal-box,
#nexus-shell-main .modal .md {
  max-width: min(560px, 94vw) !important;
  border-radius: 14px !important;
}
#nexus-shell-main .md-h,
#nexus-shell-main .modal-head {
  padding: 12px 14px !important;
}
#nexus-shell-main .md-b,
#nexus-shell-main .modal-body {
  padding: 12px 14px 16px !important;
}

/* Kanban / boards */
#nexus-shell-main .kcol {
  min-height: 280px !important;
  padding: 10px !important;
}
#nexus-shell-main .kcard {
  padding: 10px !important;
}

/* Badges */
#nexus-shell-main .bg,
#nexus-shell-main .badge {
  font-size: 10.5px !important;
  padding: 2px 7px !important;
}

/* Hide redundant home arrow when shell sidebar exists */
#nexus-shell-main .hd-home { display: none !important; }

/* Prevent horizontal overflow from oversized toolbars */
#nexus-shell-main .hd-in,
#nexus-shell-main .toolbar,
#nexus-shell-main .panel-head {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}
#nexus-shell-main .hd-r,
#nexus-shell-main .hd-actions,
#nexus-shell-main .filters {
  flex-shrink: 1 !important;
  min-width: 0 !important;
}
.nx-shell-toggle {
  display: none;
  position: fixed;
  top: 10px; left: 10px;
  z-index: 9100;
  width: 36px; height: 36px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.1);
  background: #0a0f18;
  color: #e8eef6;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,.3);
}
#nexus-shell-backdrop {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 8990;
}
/* Module transition overlay */
#nx-transit {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  opacity: 0; pointer-events: none;
  transition: opacity .28s ease;
}
#nx-transit.is-on { opacity: 1; pointer-events: auto; }
.nx-transit-card {
  background: #0f1623;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  padding: 28px 36px;
  min-width: 260px;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0,0,0,.45);
  transform: translateY(12px) scale(.97);
  transition: transform .32s cubic-bezier(.22,1,.36,1);
}
#nx-transit.is-on .nx-transit-card { transform: none; }
.nx-transit-ico {
  width: 48px; height: 48px; margin: 0 auto 14px;
  border-radius: 14px;
  background: linear-gradient(145deg, #1a6bb5, #0a355c);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  box-shadow: 0 8px 24px rgba(15,76,129,.35);
}
.nx-transit-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .12em; color: #6b7c94; margin-bottom: 6px;
}
.nx-transit-title {
  font-size: 17px; font-weight: 700; color: #e8eef6;
  letter-spacing: -.02em; margin-bottom: 16px;
}
.nx-transit-bar {
  height: 2px; width: 120px; margin: 0 auto;
  background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden;
}
.nx-transit-bar > i {
  display: block; height: 100%; width: 0;
  background: linear-gradient(90deg, #1a6bb5, #3b82f6, #0d9488);
  border-radius: 2px;
  animation: nxBar .55s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes nxBar { to { width: 100%; } }
@media (max-width: 980px) {
  .nx-shell-toggle { display: flex; align-items: center; justify-content: center; }
  #nexus-sidebar.nexus-shell-sidebar {
    position: fixed;
    left: 0; top: 0;
    transform: translateX(-100%);
    transition: transform .28s cubic-bezier(.4,0,.2,1);
    box-shadow: 20px 0 40px rgba(0,0,0,.35);
  }
  body.nexus-shell-open #nexus-sidebar.nexus-shell-sidebar {
    transform: translateX(0);
  }
  body.nexus-shell-open #nexus-shell-backdrop { display: block; }
}
`;
    document.head.appendChild(css);
  }

  function buildSidebar(user) {
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    const name = user ? (user.fullName || user.username) : 'Гість';
    const role = user ? (roleMap[user.role] || user.role) : '—';
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const act = activeId();

    let navHtml = '';
    NAV.forEach(item => {
      if (item.section) {
        navHtml += '<div class="nx-shell-sec">' + item.section + '</div>';
        return;
      }
      if (user && item.id !== 'cabinet' && !hasAccess(item.id, user)) return;
      const active = item.id === act || item.href === PAGE;
      navHtml += '<a class="nx-shell-item' + (active ? ' is-active' : '') + '" href="' + item.href + '">' +
        '<span class="nx-shell-ico">' + item.icon + '</span>' +
        '<span class="nx-shell-lbl">' + item.label + '</span></a>';
    });

    const aside = document.createElement('aside');
    aside.id = 'nexus-sidebar';
    aside.className = 'nexus-shell-sidebar';
    aside.innerHTML =
      '<div class="nx-shell-brand">' +
        '<div class="nx-shell-logo">N</div>' +
        '<div><div class="nx-shell-brand-n">NEXUS</div><div class="nx-shell-brand-t">Engineering</div></div>' +
      '</div>' +
      '<div class="nx-shell-user">' +
        '<div class="nx-shell-av" id="nx-shell-av">' + (user && user.photo ? '' : initials) + '</div>' +
        '<div><div class="nx-shell-un">' + escapeHtml(name) + '</div>' +
        '<div class="nx-shell-ur">' + escapeHtml(role) + '</div></div>' +
      '</div>' +
      '<nav class="nx-shell-nav">' + navHtml + '</nav>' +
      '<div class="nx-shell-foot">' +
        '<div class="nx-shell-meta" id="nx-shell-meta" title="Ctrl+Shift+B — повний бекап"></div>' +
        '<button type="button" id="nx-shell-backup" title="Повний бекап (Ctrl+Shift+B)">💾 Бекап</button>' +
        '<button type="button" id="nx-shell-theme">🌗 Тема</button>' +
        '<button type="button" class="nx-shell-out" id="nx-shell-logout">🚪 Вийти</button>' +
      '</div>';

    return aside;
  }

  function refreshShellMeta() {
    const el = document.getElementById('nx-shell-meta');
    if (!el) return;
    let line = 'v' + ((window.NexusCore && NexusCore.VERSION) || '6.1');
    try {
      if (window.NexusCore && NexusCore.getStorageStats) {
        const st = NexusCore.getStorageStats();
        line += ' · ' + st.mb + ' МБ (' + st.pct + '%)';
        if (st.critical) el.style.color = '#f87171';
        else if (st.warning) el.style.color = '#fbbf24';
        else el.style.color = '#6b7c94';
      }
      if (window.NexusCore && NexusCore.daysSinceBackup) {
        const d = NexusCore.daysSinceBackup();
        if (d === null) line += ' · бекап: немає';
        else if (d === 0) line += ' · бекап: сьогодні';
        else line += ' · бекап: ' + d + ' дн.';
      }
    } catch (_) {}
    el.textContent = line;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function wrapMain() {
    // Move all body children except sidebar/scripts into main wrapper
    const main = document.createElement('div');
    main.id = 'nexus-shell-main';
    const nodes = Array.from(document.body.childNodes);
    nodes.forEach(n => {
      if (n.nodeType === 1) {
        const tag = n.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        if (n.id === 'nexus-sidebar' || n.id === 'nexus-shell-backdrop' || n.id === 'nexus-shell-toggle') return;
      }
      if (n.nodeType === 3 && !String(n.textContent).trim()) return;
      main.appendChild(n);
    });
    document.body.appendChild(main);
  }

  function ensureTransit() {
    let el = document.getElementById('nx-transit');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nx-transit';
    el.innerHTML =
      '<div class="nx-transit-card">' +
        '<div class="nx-transit-ico" id="nx-transit-ico">N</div>' +
        '<div class="nx-transit-label">NEXUS</div>' +
        '<div class="nx-transit-title" id="nx-transit-title">Завантаження…</div>' +
        '<div class="nx-transit-bar"><i></i></div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function navigateWithTransition(href, label, icon) {
    if (!href || href === '#' || href.indexOf('javascript:') === 0) return;
    const target = href.split('/').pop().split('?')[0].split('#')[0].toLowerCase();
    if (target === PAGE) return;
    const ov = ensureTransit();
    const title = document.getElementById('nx-transit-title');
    const ico = document.getElementById('nx-transit-ico');
    if (title) title.textContent = label || 'Перехід…';
    if (ico) ico.textContent = icon || 'N';
    // restart bar animation
    const bar = ov.querySelector('.nx-transit-bar > i');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    }
    ov.classList.add('is-on');
    document.body.classList.remove('nexus-shell-open');
    setTimeout(() => { location.href = href; }, 480);
  }

  // Global helper for portal / module cards
  window.NexusNavigate = navigateWithTransition;

  function bindActions() {
    const backupBtn = document.getElementById('nx-shell-backup');
    if (backupBtn) {
      backupBtn.onclick = () => {
        if (window.NexusCore && NexusCore.exportAll) NexusCore.exportAll();
        else alert('Ядро NEXUS не завантажено');
        setTimeout(refreshShellMeta, 300);
      };
    }
    window.addEventListener('nexus-backup-done', refreshShellMeta);
    refreshShellMeta();
    const themeBtn = document.getElementById('nx-shell-theme');
    if (themeBtn) {
      themeBtn.onclick = () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'auto';
        const next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('nexus_theme_v1', next); } catch (e) {}
      };
    }
    const outBtn = document.getElementById('nx-shell-logout');
    if (outBtn) {
      outBtn.onclick = () => {
        try { localStorage.removeItem('nexus_session_v1'); } catch (e) {}
        navigateWithTransition('index.html', 'Вихід', '🚪');
        setTimeout(() => { location.href = 'index.html'; }, 200);
      };
    }
    const toggle = document.getElementById('nexus-shell-toggle');
    const backdrop = document.getElementById('nexus-shell-backdrop');
    if (toggle) {
      toggle.onclick = () => document.body.classList.toggle('nexus-shell-open');
    }
    if (backdrop) {
      backdrop.onclick = () => document.body.classList.remove('nexus-shell-open');
    }
    document.querySelectorAll('#nexus-sidebar .nx-shell-item').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href');
        const label = (a.querySelector('.nx-shell-lbl') || a).textContent.trim();
        const icon = (a.querySelector('.nx-shell-ico') || {}).textContent || 'N';
        navigateWithTransition(href, label, icon);
      });
    });
  }

  function applyPhoto(user) {
    const av = document.getElementById('nx-shell-av');
    if (!av || !user || !user.photo) return;
    av.style.backgroundImage = 'url(' + user.photo + ')';
    av.textContent = '';
  }

  function mount() {
    injectStyles();
    const user = currentUser();
    document.documentElement.classList.add('nexus-shell-on');
    document.body.classList.add('nexus-shell-on');

    const backdrop = document.createElement('div');
    backdrop.id = 'nexus-shell-backdrop';
    document.body.insertBefore(backdrop, document.body.firstChild);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'nexus-shell-toggle';
    toggle.className = 'nx-shell-toggle';
    toggle.setAttribute('aria-label', 'Меню');
    toggle.textContent = '☰';
    document.body.insertBefore(toggle, document.body.firstChild);

    const aside = buildSidebar(user);
    document.body.insertBefore(aside, document.body.firstChild);

    wrapMain();
    applyPhoto(user);
    bindActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
