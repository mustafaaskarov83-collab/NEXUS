/* NEXUS UI helpers v6.2 — Control panel, icons, form/table polish
 * Loaded after nexus-core on every module page.
 */
(() => {
  'use strict';
  if (window.__nexusUiLoaded) return;
  window.__nexusUiLoaded = true;

  /* ── SVG icon set (Odoo / Lucide style, 16–18px) ───────────────────── */
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"/><path d="M4 7l8 6 8-6"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.5 8.5L12 13l8.5-4.5M12 13v9"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h-1a1 1 0 01-1-1v-3.5L5 7h14l2 5.5V16a1 1 0 01-1 1h-1"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 12h14"/></svg>',
    warehouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21V12h6v9"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
    users2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="M8 17V10M12 17V7M16 17v-4"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M14 4v4h4M8 13h8M8 17h5"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 016 6c0 4-3 7-6 9-3-2-6-5-6-9a6 6 0 016-6z"/><path d="M12 3v18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    kanban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7v5l-4 2v-7L4 5z"/></svg>'
  };

  const MODULE_ICONS = {
    cabinet: 'home',
    hr: 'users',
    projects: 'folder',
    tasks: 'check',
    calendar: 'calendar',
    mail: 'mail',
    inventory: 'box',
    fleet: 'car',
    warehouse: 'warehouse',
    documents: 'file',
    finance: 'money',
    crm: 'users2',
    dashboard: 'chart',
    reports: 'report',
    audit: 'audit'
  };

  function icon(name, cls) {
    const svg = ICONS[name] || ICONS.file;
    return '<span class="nx-ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + svg + '</span>';
  }

  /* ── Control panel (Odoo-style) ─────────────────────────────────────── */
  /**
   * mountControlPanel(options)
   * options: {
   *   target: selector|element (default: first main / .mn / #app > main),
   *   title: string,
   *   breadcrumbs: [{label, href?}],
   *   search: { placeholder, id, oninput } | false,
   *   actions: [{ label, class, onclick, id, primary }],
   *   extraHtml: string
   * }
   */
  function mountControlPanel(opts) {
    opts = opts || {};
    const existing = document.getElementById('nx-cp');
    if (existing) existing.remove();

    let target = opts.target
      ? (typeof opts.target === 'string' ? document.querySelector(opts.target) : opts.target)
      : document.querySelector('#nexus-shell-main main, #nexus-shell-main .mn, #app > main, #app .mn, main, .mn');

    if (!target) return null;

    const crumbs = Array.isArray(opts.breadcrumbs) ? opts.breadcrumbs : [];
    let crumbsHtml = '';
    if (crumbs.length) {
      crumbsHtml = '<nav class="nx-cp__crumbs">' + crumbs.map((c, i) => {
        const sep = i ? '<span class="nx-cp__sep">/</span>' : '';
        if (c.href) return sep + '<a href="' + c.href + '">' + escapeHtml(c.label) + '</a>';
        return sep + '<span class="nx-cp__current">' + escapeHtml(c.label) + '</span>';
      }).join('') + '</nav>';
    }

    let searchHtml = '';
    let existingSearch = null;
    if (opts.search !== false && opts.search) {
      const sid = opts.search.id || 'nx-cp-search';
      const ph = opts.search.placeholder || 'Пошук…';
      const on = opts.search.oninput || '';
      existingSearch = document.getElementById(sid);
      if (existingSearch) {
        // wrap existing input into CP look
        searchHtml = '<div class="nx-cp__search" id="nx-cp-search-wrap"></div>';
      } else {
        searchHtml =
          '<div class="nx-cp__search">' +
          icon('search', 'nx-cp__search-ico') +
          '<input type="search" id="' + sid + '" placeholder="' + escapeHtml(ph) + '" ' +
          (on ? 'oninput="' + on + '"' : '') + ' autocomplete="off">' +
          '</div>';
      }
    }

    let actionsHtml = '';
    if (Array.isArray(opts.actions) && opts.actions.length) {
      actionsHtml = '<div class="nx-cp__actions">' + opts.actions.map(a => {
        const cls = 'btn ' + (a.primary ? 'bp' : 'bs') + (a.class ? ' ' + a.class : '');
        const id = a.id ? ' id="' + a.id + '"' : '';
        const oc = a.onclick ? ' onclick="' + a.onclick + '"' : '';
        const ico = a.icon ? icon(a.icon) + ' ' : '';
        return '<button type="button" class="' + cls + '"' + id + oc + '>' + ico + escapeHtml(a.label || '') + '</button>';
      }).join('') + '</div>';
    }

    const el = document.createElement('div');
    el.id = 'nx-cp';
    el.className = 'nx-cp';
    el.innerHTML =
      '<div class="nx-cp__left">' +
        crumbsHtml +
        (opts.title ? '<h1 class="nx-cp__title">' + escapeHtml(opts.title) + '</h1>' : '') +
        (opts.extraHtml || '') +
      '</div>' +
      '<div class="nx-cp__right">' +
        searchHtml +
        actionsHtml +
      '</div>';

    // Insert at top of target
    if (target.firstChild) target.insertBefore(el, target.firstChild);
    else target.appendChild(el);
    // Relocate existing search input into control panel
    if (opts.search && opts.search.id) {
      const wrap = el.querySelector('#nx-cp-search-wrap');
      const inp = document.getElementById(opts.search.id);
      if (wrap && inp && !wrap.contains(inp)) {
        wrap.innerHTML = icon('search', 'nx-cp__search-ico');
        // remove from old toolbar parent clutter if empty-ish
        const oldParent = inp.parentElement;
        wrap.appendChild(inp);
        inp.setAttribute('placeholder', opts.search.placeholder || inp.placeholder || 'Пошук…');
        if (opts.search.oninput) inp.setAttribute('oninput', opts.search.oninput);
        if (oldParent && oldParent.children.length === 0) oldParent.remove();
      }
    }
    return el;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Auto control panel for known modules ───────────────────────────── */
  const PAGE_META = {
    'hr.html': { title: 'Кадровий облік', module: 'hr', search: false },
    'projects.html': {
      title: 'Проекти',
      module: 'projects',
      search: { id: 'search', placeholder: 'Пошук проектів…', oninput: 'if(window.Projects&&Projects.render)Projects.render()' },
      actions: [{ label: 'Новий проект', primary: true, icon: 'plus', onclick: 'if(window.Projects&&Projects.openForm)Projects.openForm()' }]
    },
    'tasks.html': {
      title: 'Задачі',
      module: 'tasks',
      search: { id: 'search', placeholder: 'Пошук задач…', oninput: 'if(window.Tasks&&Tasks.filter)Tasks.filter()' },
      actions: [{ label: 'Нова задача', primary: true, icon: 'plus', onclick: 'if(window.Tasks&&Tasks.openForm)Tasks.openForm()' }]
    },
    'finance.html': {
      title: 'Фінанси',
      module: 'finance',
      search: { id: 'search', placeholder: 'Пошук операцій…', oninput: 'if(window.Finance&&Finance.filter)Finance.filter()' },
      actions: [{ label: 'Нова операція', primary: true, icon: 'plus', onclick: 'if(window.Finance&&Finance.openForm)Finance.openForm()' }]
    },
    'documents.html': {
      title: 'Документообіг',
      module: 'documents',
      search: { id: 'nx-cp-search', placeholder: 'Пошук документів…' },
      actions: [{ label: 'Новий документ', primary: true, icon: 'plus', onclick: 'if(window.Documents&&Documents.openForm)Documents.openForm()' }]
    },
    'inventory.html': {
      title: 'Інвентар',
      module: 'inventory',
      search: { id: 'nx-cp-search', placeholder: 'Пошук інвентарю…' },
      actions: [{ label: 'Додати', primary: true, icon: 'plus', onclick: 'if(window.Inventory&&Inventory.openForm)Inventory.openForm()' }]
    },
    'fleet.html': {
      title: 'Авто і паливо',
      module: 'fleet',
      search: { id: 'nx-cp-search', placeholder: 'Пошук авто…' },
      actions: [{ label: 'Додати авто', primary: true, icon: 'plus', onclick: 'if(window.Fleet&&Fleet.openForm)Fleet.openForm()' }]
    },
    'warehouse.html': {
      title: 'Склад',
      module: 'warehouse',
      search: { id: 'nx-cp-search', placeholder: 'Пошук номенклатури…' },
      actions: [{ label: 'Додати', primary: true, icon: 'plus', onclick: 'if(window.Warehouse&&Warehouse.openForm)Warehouse.openForm()' }]
    },
    'crm.html': {
      title: 'CRM — Клієнти',
      module: 'crm',
      search: { id: 'nx-cp-search', placeholder: 'Пошук клієнтів…' },
      actions: [{ label: 'Новий клієнт', primary: true, icon: 'plus', onclick: 'if(window.CRM&&CRM.openForm)CRM.openForm()' }]
    },
    'dashboard.html': { title: 'Дашборд KPI', module: 'dashboard', search: false },
    'reports.html': { title: 'Звіти', module: 'reports', search: false },
    'audit.html': { title: 'Аудит / Логи', module: 'audit', search: false },
    'calendar.html': { title: 'Календар', module: 'calendar', search: false },
    'mail.html': { title: 'Пошта', module: 'mail', search: false }
  };

  function autoControlPanel() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    const meta = PAGE_META[page];
    if (!meta) return;
    // Delay so shell wraps content first
    setTimeout(() => {
      if (document.getElementById('nx-cp')) return;
      mountControlPanel({
        title: meta.title,
        breadcrumbs: [
          { label: 'NEXUS', href: 'index.html' },
          { label: meta.title }
        ],
        search: meta.search === false ? false : (meta.search || false),
        actions: meta.actions || []
      });
    }, 80);
  }

  /* ── Replace emoji icons in shell sidebar with SVG ──────────────────── */
  function upgradeShellIcons() {
    const map = {
      '🏠': 'home', '👥': 'users', '📁': 'folder', '✅': 'check',
      '📅': 'calendar', '✉': 'mail', '📦': 'box', '🚗': 'car',
      '🏬': 'warehouse', '📄': 'file', '💰': 'money', '🤝': 'users2',
      '📊': 'chart', '📈': 'report', '📋': 'audit'
    };
    document.querySelectorAll('.nx-shell-item, .nexus-nav-item').forEach(a => {
      const ico = a.querySelector('.nx-shell-ico, .nexus-nav-icon');
      if (!ico) return;
      const text = (ico.textContent || '').trim();
      const name = map[text];
      if (name && ICONS[name]) {
        ico.classList.add('nx-ico', 'nx-ico--nav');
        ico.innerHTML = ICONS[name];
      }
    });
  }

  /* ── Polish tables: add nx-table class to .dt tables ─────────────────── */
  function polishTables() {
    document.querySelectorAll('table.dt, table.tbl, table.data-table, table.users-table').forEach(t => {
      t.classList.add('nx-table');
      if (!t.parentElement.classList.contains('nx-table-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'nx-table-wrap';
        t.parentNode.insertBefore(wrap, t);
        wrap.appendChild(t);
      }
    });
  }

  /* ── Form view helpers (Odoo-like layout) ───────────────────────────── */
  function enhanceForms() {
    document.querySelectorAll('form.form, .form-grid, .emp-form, #project-form, .modal form, .md form').forEach(f => {
      f.classList.add('nx-form');
    });
    // Label + input groups
    document.querySelectorAll('.nx-form label, form label').forEach(lab => {
      if (!lab.classList.contains('nx-field') && lab.querySelector('input,select,textarea')) {
        lab.classList.add('nx-field');
      }
    });
  }

  function init() {
    autoControlPanel();
    // After shell mounts
    setTimeout(() => {
      upgradeShellIcons();
      polishTables();
      enhanceForms();
    }, 200);
    // Observe dynamic content
    const obs = new MutationObserver(() => {
      polishTables();
    });
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NexusUI = {
    icon,
    ICONS,
    MODULE_ICONS,
    mountControlPanel,
    upgradeShellIcons,
    polishTables,
    enhanceForms
  };
})();
