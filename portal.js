/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING — Логика портала v1.1
   Проверка авторизации + умные редиректы
   ═══════════════════════════════════════════════════════════════════════ */

const Portal = (() => {

  /* Версія проєкту (портал). Для HR-ядра — APP_VERSION в app.js */
  const PORTAL_VERSION = '6.1.0';

  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const INV_KEY = 'nexus_inventory_v1';
  const SESSION_TTL = 12 * 60 * 60 * 1000;
  let authMode = 'login';

  /* Той самий хеш, що в app.js (HR) — спільні користувачі */
  function hp(pwd, salt) {
    const s = pwd + '::' + salt + '::nexus_v3';
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
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function loadUsers() {
    try {
      const r = localStorage.getItem(USERS_KEY);
      if (r) { const p = JSON.parse(r); if (Array.isArray(p)) return p; }
    } catch (e) {}
    return [];
  }
  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
  }
  function setSession(userId) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expiresAt: Date.now() + SESSION_TTL }));
    } catch (e) {}
  }

  /* --- Кто вошёл (из сессии) --- */
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

  function showAuth(msg) {
    const ov = document.getElementById('portal-auth-ov');
    if (ov) ov.classList.remove('hidden');
    document.body.classList.add('portal-locked');
    const err = document.getElementById('portal-auth-err');
    if (err) err.textContent = msg || '';
  }
  function hideAuth() {
    const ov = document.getElementById('portal-auth-ov');
    if (ov) ov.classList.add('hidden');
    document.body.classList.remove('portal-locked');
    const err = document.getElementById('portal-auth-err');
    if (err) err.textContent = '';
  }
  function setAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('portal-auth-t');
    const hint = document.getElementById('portal-auth-h');
    const conf = document.getElementById('portal-conf-f');
    const btn = document.getElementById('portal-auth-btn');
    if (mode === 'setup') {
      if (title) title.textContent = 'Перше налаштування';
      if (hint) hint.textContent = 'Створіть обліковий запис адміністратора';
      if (conf) conf.style.display = '';
      if (btn) btn.textContent = 'Створити адміністратора';
    } else {
      if (title) title.textContent = 'Вхід до системи NEXUS';
      if (hint) hint.textContent = 'Введіть облікові дані';
      if (conf) conf.style.display = 'none';
      if (btn) btn.textContent = 'Увійти';
    }
  }
  function submitAuth() {
    const username = (document.getElementById('portal-au')?.value || '').trim();
    const password = document.getElementById('portal-ap')?.value || '';
    const confirm = document.getElementById('portal-ac')?.value || '';
    const err = document.getElementById('portal-auth-err');
    const setErr = m => { if (err) err.textContent = m; };

    if (!username || username.length < 3) { setErr('Логін мінімум 3 символи'); return; }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(username)) { setErr('Тільки латиниця, цифри, _ . -'); return; }
    if (!password || password.length < 6) { setErr('Мінімум 6 символів'); return; }

    let users = loadUsers();

    if (authMode === 'setup' || !users.length) {
      if (password !== confirm) { setErr('Паролі не збігаються'); return; }
      const salt = uid() + uid();
      const nu = {
        id: uid(), username, fullName: username, role: 'admin',
        modules: ['*'],
        salt, hash: hp(password, salt),
        createdAt: new Date().toISOString().slice(0, 10)
      };
      users = [nu];
      saveUsers(users);
      setSession(nu.id);
      hideAuth();
      afterLogin();
      return;
    }

    const found = users.find(x => String(x.username || '').toLowerCase() === username.toLowerCase());
    if (!found || hp(password, found.salt) !== found.hash) {
      setErr("Невірне ім'я або пароль");
      return;
    }
    setSession(found.id);
    hideAuth();
    afterLogin();
  }
  function afterLogin() {
    renderVersion();
    renderGreeting();
    renderUser();
    applyModuleAccess();
    renderQuickStats();
    try { renderCabinet(); } catch (e) {}
    try {
      const redirect = sessionStorage.getItem('nexus_redirect_after_login');
      if (redirect && redirect !== 'index.html' && redirect !== './' && redirect !== '/') {
        sessionStorage.removeItem('nexus_redirect_after_login');
        setTimeout(() => { location.href = redirect; }, 200);
      }
    } catch (e) {}
  }
  function initAuthGate() {
    const users = loadUsers();
    if (!users.length) {
      setAuthMode('setup');
      showAuth();
      return false;
    }
    if (getCurrentUser()) {
      hideAuth();
      return true;
    }
    setAuthMode('login');
    showAuth();
    return false;
  }

  /* --- Кнопка юзера в шапке --- */
  function closeUserMenu() {
    const menu = document.getElementById('portal-user-menu');
    if (menu) menu.hidden = true;
  }
  function toggleUserMenu() {
    const menu = document.getElementById('portal-user-menu');
    if (!menu) return;
    menu.hidden = !menu.hidden;
  }
  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    closeUserMenu();
    setAuthMode(loadUsers().length ? 'login' : 'setup');
    showAuth();
    renderUser();
  }
  function setAvatarEl(el, user, initials) {
    if (!el) return;
    if (user && user.photo) {
      el.textContent = '';
      el.style.backgroundImage = 'url(' + user.photo + ')';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.color = 'transparent';
    } else {
      el.style.backgroundImage = '';
      el.textContent = initials || '?';
      el.style.background = 'linear-gradient(135deg,#fbbf24,#f59e0b)';
      el.style.color = '#78350f';
    }
  }

  function renderUser() {
    const btn = document.getElementById('portal-user-btn');
    const nameEl = document.getElementById('portal-user-name');
    const roleEl = document.getElementById('portal-user-role');
    const avEl = document.getElementById('portal-user-avatar');
    const menu = document.getElementById('portal-user-menu');
    if (!btn || !nameEl) return;

    const user = getCurrentUser();
    if (!user) {
      nameEl.textContent = 'Увійти';
      roleEl.textContent = 'потрібна авторизація';
      avEl.textContent = '→';
      avEl.style.backgroundImage = '';
      avEl.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
      avEl.style.color = '#fff';
      if (menu) menu.hidden = true;
      btn.onclick = () => { closeUserMenu(); setAuthMode('login'); showAuth(); };
      renderSidebarUser(null);
      return;
    }
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    const displayName = user.fullName || user.username;
    const roleLabel = roleMap[user.role] || user.role;
    nameEl.textContent = displayName;
    roleEl.textContent = roleLabel;
    const usersBtn = document.getElementById('portal-menu-users');
    if (usersBtn) usersBtn.style.display = user.role === 'admin' ? '' : 'none';
    const initials = displayName.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
    setAvatarEl(avEl, user, initials);

    const mn = document.getElementById('portal-menu-name');
    const mr = document.getElementById('portal-menu-role');
    if (mn) mn.textContent = displayName;
    if (mr) mr.textContent = roleLabel;

    btn.onclick = (e) => {
      e.stopPropagation();
      toggleUserMenu();
    };
    const outBtn = document.getElementById('portal-menu-logout');
    if (outBtn) outBtn.onclick = (e) => { e.stopPropagation(); logout(); };

    if (!window.__portalUserMenuBound) {
      window.__portalUserMenuBound = true;
      document.addEventListener('click', (ev) => {
        const wrap = document.querySelector('.portal-user-wrap');
        if (wrap && !wrap.contains(ev.target)) closeUserMenu();
      });
      const photoBtn = document.getElementById('portal-menu-photo');
      const photoFile = document.getElementById('portal-photo-file');
      if (photoBtn && photoFile) {
        photoBtn.onclick = (e) => { e.stopPropagation(); photoFile.click(); };
        photoFile.onchange = () => {
          const f = photoFile.files && photoFile.files[0];
          if (!f) return;
          if (f.size > 800 * 1024) { alert('Фото занадто велике (макс. 800 КБ)'); return; }
          const reader = new FileReader();
          reader.onload = () => {
            const me = getCurrentUser();
            if (!me) return;
            const users = loadUsers();
            const i = users.findIndex(u => u.id === me.id);
            if (i < 0) return;
            users[i].photo = reader.result;
            saveUsers(users);
            renderUser();
            renderCabinet();
            if (window.NexusCore && NexusCore.audit) NexusCore.audit('user.photo', 'user', { id: me.id });
          };
          reader.readAsDataURL(f);
          photoFile.value = '';
        };
      }
    }
    renderSidebarUser(user);
  }

  function renderSidebarUser(user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avEl = document.getElementById('sidebar-avatar');
    if (!nameEl) return;
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    if (!user) {
      nameEl.textContent = 'Гість';
      if (roleEl) roleEl.textContent = 'не авторизовано';
      if (avEl) { avEl.textContent = '?'; avEl.style.backgroundImage = ''; }
      return;
    }
    const displayName = user.fullName || user.username;
    nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = roleMap[user.role] || user.role;
    const initials = displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    setAvatarEl(avEl, user, initials);
  }

  /* --- Часы --- */
  function tickClock() {
    const el = document.getElementById('portal-clock');
    if (!el) return;
    const d = new Date();
    const wd = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()];
    const pad = n => String(n).padStart(2, '0');
    el.textContent = `${wd}, ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* --- Приветствие --- */
  function renderGreeting() {
    const el = document.getElementById('portal-greet');
    if (!el) return;
    const h = new Date().getHours();
    let word = 'Доброго дня';
    if (h < 6) word = 'Доброї ночі';
    else if (h < 12) word = 'Доброго ранку';
    else if (h < 18) word = 'Доброго дня';
    else word = 'Доброго вечора';
    const user = getCurrentUser();
    const suffix = user ? ', ' + (user.fullName || user.username).split(' ')[0] : '';
    el.textContent = word + suffix;
  }

  /* --- Мини-статистика --- */
  function renderQuickStats() {
    let employees = 0, onVac = 0, onSick = 0, invTotal = 0, invCost = 0;
    try {
      const db = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      const emps = db.employees || [];
      employees = emps.length;
      const today = new Date().toISOString().slice(0, 10);
      emps.forEach(e => {
        (e.leaves || []).forEach(l => { if (l.start <= today && l.end >= today) onVac++; });
        (e.sickLeaves || []).forEach(s => { if (s.start <= today && s.end >= today) onSick++; });
      });
    } catch(e){}

    try {
      const inv = JSON.parse(localStorage.getItem(INV_KEY) || '{}');
      const items = inv.items || [];
      invTotal = items.length;
      invCost = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
    } catch(e){}

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('qs-emp', employees);
    set('qs-vac', onVac);
    set('qs-sick', onSick);
    set('qs-inv', invTotal);

    const fmt = n => new Intl.NumberFormat('uk-UA').format(Math.round(n));
    const costEl = document.getElementById('qs-cost');
    if (costEl) costEl.textContent = fmt(invCost) + ' ₴';
  }

  /* --- Тема --- */
  function initTheme() {
    const KEY = 'nexus_theme_v1';
    let current = localStorage.getItem(KEY) || 'auto';
    document.documentElement.setAttribute('data-theme', current);

    const updateIcon = () => {
      const icons = { light: '☀️', dark: '🌙', auto: '🌗' };
      document.querySelectorAll('.portal-theme-btn').forEach(b => b.textContent = icons[current] || '🌗');
    };
    const MODES = ['light', 'dark', 'auto'];
    document.querySelectorAll('.portal-theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = MODES.indexOf(current);
        current = MODES[(idx + 1) % MODES.length];
        document.documentElement.setAttribute('data-theme', current);
        localStorage.setItem(KEY, current);
        updateIcon();
      });
    });
    updateIcon();
  }

  /* --- Professional module transition --- */
  function ensureTransit() {
    let el = document.getElementById('nx-transit');
    if (el) return el;
    if (!document.getElementById('nx-transit-css')) {
      const st = document.createElement('style');
      st.id = 'nx-transit-css';
      st.textContent =
        '#nx-transit{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(8,12,20,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .28s ease}' +
        '#nx-transit.is-on{opacity:1;pointer-events:auto}' +
        '.nx-transit-card{background:#0f1623;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px 36px;min-width:260px;text-align:center;' +
        'box-shadow:0 24px 64px rgba(0,0,0,.45);transform:translateY(12px) scale(.97);transition:transform .32s cubic-bezier(.22,1,.36,1)}' +
        '#nx-transit.is-on .nx-transit-card{transform:none}' +
        '.nx-transit-ico{width:48px;height:48px;margin:0 auto 14px;border-radius:14px;background:linear-gradient(145deg,#1a6bb5,#0a355c);' +
        'display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 24px rgba(15,76,129,.35)}' +
        '.nx-transit-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#6b7c94;margin-bottom:6px}' +
        '.nx-transit-title{font-size:17px;font-weight:700;color:#e8eef6;letter-spacing:-.02em;margin-bottom:16px}' +
        '.nx-transit-bar{height:2px;width:120px;margin:0 auto;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}' +
        '.nx-transit-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1a6bb5,#3b82f6,#0d9488);border-radius:2px;animation:nxBar .55s cubic-bezier(.4,0,.2,1) forwards}' +
        '@keyframes nxBar{to{width:100%}}';
      document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = 'nx-transit';
    el.innerHTML = '<div class="nx-transit-card"><div class="nx-transit-ico" id="nx-transit-ico">N</div>' +
      '<div class="nx-transit-label">NEXUS</div><div class="nx-transit-title" id="nx-transit-title">Завантаження…</div>' +
      '<div class="nx-transit-bar"><i></i></div></div>';
    document.body.appendChild(el);
    return el;
  }

  function navigateTransition(href, label, icon) {
    if (!href || href === '#' || href.indexOf('javascript:') === 0) return;
    if (window.NexusNavigate) {
      window.NexusNavigate(href, label, icon);
      return;
    }
    const ov = ensureTransit();
    const title = document.getElementById('nx-transit-title');
    const ico = document.getElementById('nx-transit-ico');
    if (title) title.textContent = label || 'Перехід…';
    if (ico) ico.textContent = icon || 'N';
    const bar = ov.querySelector('.nx-transit-bar > i');
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    ov.classList.add('is-on');
    setTimeout(() => { location.href = href; }, 480);
  }

  /* --- Редиректы --- */
  function initModuleCards() {
    document.querySelectorAll('.pmodule--soon').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const name = card.querySelector('.pmodule__title')?.textContent || 'Модуль';
        alert(`🔧 ${name}\n\nЦей модуль знаходиться у розробці.\nЗ'явиться найближчим часом.`);
      });
    });

    document.querySelectorAll('.pmodule[data-auth="1"], .qstat[data-auth="1"], .nexus-nav-item[href], a.cabinet-card__link[href]').forEach(card => {
      card.addEventListener('click', (e) => {
        const href = card.getAttribute('href');
        if (!href || href === '#') return;
        const user = getCurrentUser();
        if (!user && card.getAttribute('data-auth') === '1') {
          e.preventDefault();
          try { sessionStorage.setItem('nexus_redirect_after_login', href); } catch (err) {}
          setAuthMode(loadUsers().length ? 'login' : 'setup');
          showAuth('🔒 Увійдіть, щоб відкрити модуль');
          return;
        }
        if (href.indexOf('.html') !== -1) {
          e.preventDefault();
          const label =
            (card.querySelector('.nexus-nav-label') || {}).textContent ||
            (card.querySelector('.pmodule__title') || {}).textContent ||
            (card.querySelector('.qstat__label') || {}).textContent ||
            card.textContent.trim().replace(/→/g, '').trim() ||
            'Модуль';
          const icon =
            (card.querySelector('.nexus-nav-icon') || {}).textContent ||
            (card.querySelector('.pmodule__icon') || {}).textContent ||
            (card.querySelector('.qstat__icon') || {}).textContent ||
            'N';
          navigateTransition(href, String(label).trim(), String(icon || 'N').trim().slice(0, 3));
        }
      });
    });
  }

  /* --- Версія проєкту у футері --- */
  function renderVersion() {
    const el = document.getElementById('portal-version');
    if (el) el.textContent = 'NEXUS ENGENEERING · Головна v' + PORTAL_VERSION;
  }


  function bindUsersMenu() {
    const btn = document.getElementById('portal-menu-users');
    if (btn) btn.onclick = () => openUsersModal();
  }
  function bindBackupMenu() {
    const backupBtn = document.getElementById('portal-menu-backup');
    if (backupBtn) backupBtn.onclick = () => {
      closeUserMenu();
      if (window.NexusCore && NexusCore.exportAll) NexusCore.exportAll();
      else alert('NexusCore не завантажено');
    };
    const restoreBtn = document.getElementById('portal-menu-restore');
    const restoreFile = document.getElementById('portal-restore-file');
    if (restoreBtn && restoreFile) {
      restoreBtn.onclick = () => { closeUserMenu(); restoreFile.click(); };
      restoreFile.onchange = () => {
        const f = restoreFile.files && restoreFile.files[0];
        if (!f) return;
        if (!confirm('Відновити дані з бекапу? Поточні дані NEXUS буде замінено.')) {
          restoreFile.value = '';
          return;
        }
        if (!window.NexusCore || !NexusCore.importAll) {
          alert('NexusCore не завантажено');
          restoreFile.value = '';
          return;
        }
        NexusCore.importAll(f).then(n => {
          alert('Відновлено ключів: ' + n + '. Сторінку буде оновлено.');
          location.reload();
        }).catch(e => alert('Помилка відновлення: ' + e.message));
        restoreFile.value = '';
      };
    }
  }


  function renderOnboarding() {
    const box = document.getElementById('nexus-onboarding');
    if (!box) return;
    const user = getCurrentUser();
    if (!user) { box.hidden = true; return; }
    if (sessionStorage.getItem('nexus_onboarding_hide') === '1') { box.hidden = true; return; }

    function loadJson(key, fb) {
      try {
        if (window.NexusCore && NexusCore.read) return NexusCore.read(key, fb);
        const r = localStorage.getItem(key);
        return r ? JSON.parse(r) : fb;
      } catch (e) { return fb; }
    }
    const hr = loadJson('nexus_hr_ua_v2', { employees: [] });
    const emps = Array.isArray(hr.employees) ? hr.employees : [];
    const docs = loadJson('nexus_documents_v1', { docs: [] });
    const docList = Array.isArray(docs.docs) ? docs.docs : [];
    const proj = loadJson('nexus_projects_v1', { projects: [] });
    const projects = Array.isArray(proj.projects) ? proj.projects : [];
    let linked = false;
    try { linked = !!findLinkedEmployee(user); } catch (e) {}

    const steps = [
      { ok: emps.length > 0, html: '<a href="hr.html">Додайте співробітників</a> у кадровому обліку' },
      { ok: linked, html: '<a href="hr.html#settings">Прив’яжіть користувача</a> до картки співробітника' },
      { ok: projects.length > 0, html: '<a href="projects.html">Створіть проект</a>' },
      { ok: docList.some(d => d.type === 'contract'), html: '<a href="documents.html">Додайте договір</a> і прив’яжіть до проекту' },
      { ok: !!(window.NexusCore && NexusCore.getLastBackupAt && NexusCore.getLastBackupAt()), html: 'Зробіть <b>повний бекап</b> (кнопка нижче або Ctrl+Shift+B)' }
    ];
    if (steps.every(s => s.ok)) { box.hidden = true; return; }
    box.hidden = false;
    const list = document.getElementById('onboarding-list');
    if (list) {
      list.innerHTML = steps.map(s =>
        '<li class="' + (s.ok ? 'done' : '') + '">' + (s.ok ? '✓ ' : '') + s.html + '</li>'
      ).join('');
    }
    const st = document.getElementById('onboarding-storage');
    if (st && window.NexusCore && NexusCore.getStorageStats) {
      const s = NexusCore.getStorageStats();
      let msg = 'Сховище: ~' + s.mb + ' МБ (' + s.pct + '% від типового ліміту)';
      if (s.warning) msg += ' — бажано зробити бекап';
      st.textContent = msg;
      st.style.color = s.critical ? '#ef4444' : s.warning ? '#d97706' : '';
    }
    const hideBtn = document.getElementById('onboarding-hide');
    if (hideBtn) hideBtn.onclick = () => {
      sessionStorage.setItem('nexus_onboarding_hide', '1');
      box.hidden = true;
    };
    const bak = document.getElementById('onboarding-backup');
    if (bak) bak.onclick = () => {
      if (window.NexusCore && NexusCore.exportAll) NexusCore.exportAll();
      setTimeout(renderOnboarding, 400);
    };
  }

  function init() {
    // При відкритті index — спочатку вікно входу «Вхід до системи NEXUS».
    // Після успішної авторизації показується головна сторінка порталу.
    initTheme();
    initModuleCards();
    tickClock();
    setInterval(tickClock, 30000);
    setInterval(renderQuickStats, 10000);

    if (!initAuthGate()) return;
    renderVersion();
    renderGreeting();
    renderUser();
    bindBackupMenu();
    bindUsersMenu();
    applyModuleAccess();
    renderQuickStats();
    try { renderCabinet(); } catch (e) {}
  }


  /* --- Module access --- */
  let editingUserId = null;

  function moduleDefs() {
    if (window.NexusCore && NexusCore.MODULE_DEFS) return NexusCore.MODULE_DEFS;
    return [
      { id: 'dashboard', title: 'Дашборд' },
      { id: 'hr', title: 'Кадровий облік' },
      { id: 'inventory', title: 'Інвентар' },
      { id: 'fleet', title: 'Авто і паливо' },
      { id: 'documents', title: 'Документообіг' },
      { id: 'projects', title: 'Проекти' },
      { id: 'tasks', title: 'Задачі' },
      { id: 'finance', title: 'Фінанси' },
      { id: 'crm', title: 'CRM — Клієнти' },
      { id: 'calendar', title: 'Календар' },
      { id: 'mail', title: 'Пошта' },
      { id: 'reports', title: 'Звіти' },
      { id: 'audit', title: 'Аудит / Логи' },
      { id: 'warehouse', title: 'Склад' }
    ];
  }

  function userCanModule(user, modId) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (window.NexusCore && NexusCore.hasModuleAccess) return NexusCore.hasModuleAccess(modId, user);
    const mods = Array.isArray(user.modules) ? user.modules : [];
    return mods.includes('*') || mods.includes(modId);
  }

  function applyModuleAccess() {
    const user = getCurrentUser();
    document.querySelectorAll('[data-module]').forEach(el => {
      const mod = el.getAttribute('data-module');
      if (!mod) return;
      const ok = userCanModule(user, mod);
      if (ok) {
        el.classList.remove('is-locked');
        el.style.display = '';
        if (el.tagName === 'A') el.removeAttribute('aria-disabled');
      } else {
        el.classList.add('is-locked');
        el.style.display = 'none';
      }
    });
  }

  function openUsersModal() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      alert('Керувати користувачами може лише адміністратор');
      return;
    }
    closeUserMenu();
    cancelUserForm();
    renderUsersList();
    const m = document.getElementById('users-modal');
    if (m) m.classList.add('open');
  }
  function closeUsersModal() {
    const m = document.getElementById('users-modal');
    if (m) m.classList.remove('open');
    cancelUserForm();
  }

  function renderUsersList() {
    const el = document.getElementById('users-list');
    if (!el) return;
    const users = loadUsers();
    const emps = loadHrEmployees();
    const empMap = {};
    emps.forEach(e => { empMap[e.id] = e; });
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    if (!users.length) {
      el.innerHTML = '<div class="tm">Користувачів немає</div>';
      return;
    }
    let h = '<table class="users-table"><thead><tr><th>Логін</th><th>ПІБ</th><th>Співробітник (HR)</th><th>Роль</th><th>Модулі</th><th></th></tr></thead><tbody>';
    users.forEach(u => {
      let modsLabel;
      if (u.role === 'admin' || (Array.isArray(u.modules) && u.modules.includes('*'))) {
        modsLabel = 'Усі модулі';
      } else if (Array.isArray(u.modules) && u.modules.length) {
        const titles = moduleDefs().filter(m => u.modules.includes(m.id)).map(m => m.title);
        modsLabel = titles.length ? titles.join(', ') : '—';
      } else {
        modsLabel = 'Усі (за замовч.)';
      }
      const linked = u.employeeId && empMap[u.employeeId]
        ? empMap[u.employeeId].fullName + (empMap[u.employeeId].position ? ' — ' + empMap[u.employeeId].position : '')
        : (u.employeeId ? 'ID: ' + u.employeeId + ' (не знайдено)' : '— не привʼязано —');
      const linkedClass = u.employeeId && empMap[u.employeeId] ? '' : ' style="color:#f59e0b"';
      h += '<tr>' +
        '<td><b>' + escHtml(u.username) + '</b></td>' +
        '<td>' + escHtml(u.fullName || '—') + '</td>' +
        '<td' + linkedClass + '>' + escHtml(linked) + '</td>' +
        '<td>' + escHtml(roleMap[u.role] || u.role) + '</td>' +
        '<td style="max-width:220px">' + escHtml(modsLabel) + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn bs bsm" type="button" onclick="Portal.editUser(\'' + u.id + '\')">✏️</button> ' +
          (u.id !== (getCurrentUser() || {}).id
            ? '<button class="btn bd bsm" type="button" onclick="Portal.deleteUser(\'' + u.id + '\')">×</button>'
            : '') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderModuleChecks(selected, lockedAll) {
    const host = document.getElementById('u-modules');
    if (!host) return;
    if (lockedAll) {
      host.innerHTML = '<div class="tsm tmu">Адміністратор має доступ до всіх модулів автоматично.</div>';
      return;
    }
    const sel = new Set(selected || []);
    host.innerHTML = moduleDefs().map(m => {
      const checked = !selected || !selected.length || sel.has(m.id) || sel.has('*') ? ' checked' : '';
      return '<label><input type="checkbox" data-mod="' + m.id + '"' + checked + '> ' + escHtml(m.title) + '</label>';
    }).join('');
  }

  function loadHrEmployees() {
    try {
      const hr = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      const emps = Array.isArray(hr.employees) ? hr.employees : [];
      return emps
        .filter(e => e && e.id && e.fullName)
        .slice()
        .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), 'uk'));
    } catch (e) { return []; }
  }

  function fillEmployeeSelect(selectedId) {
    const sel = document.getElementById('u-employee');
    if (!sel) return;
    const emps = loadHrEmployees();
    const users = loadUsers();
    const taken = new Set(
      users
        .filter(u => u.employeeId && u.id !== editingUserId)
        .map(u => u.employeeId)
    );
    sel.innerHTML = '<option value="">— оберіть співробітника —</option>' +
      emps.map(e => {
        const used = taken.has(e.id) ? ' (вже привʼязаний)' : '';
        const dis = taken.has(e.id) ? ' disabled' : '';
        const pos = e.position ? ' — ' + e.position : '';
        return '<option value="' + escHtml(e.id) + '"' + dis +
          (selectedId === e.id ? ' selected' : '') + '>' +
          escHtml(e.fullName + pos + used) + '</option>';
      }).join('');
    if (selectedId) sel.value = selectedId;
    if (!emps.length) {
      sel.innerHTML = '<option value="">Немає співробітників у кадровому обліку</option>';
    }
  }

  function onEmployeeSelect() {
    const sel = document.getElementById('u-employee');
    const nameEl = document.getElementById('u-name');
    if (!sel || !nameEl) return;
    const id = sel.value;
    if (!id) return;
    const emp = loadHrEmployees().find(e => e.id === id);
    if (emp && emp.fullName) {
      nameEl.value = emp.fullName;
    }
  }

  function openUserForm() {
    editingUserId = null;
    document.getElementById('user-form-wrap').style.display = '';
    document.getElementById('user-form-title').textContent = 'Новий користувач';
    document.getElementById('u-login').value = '';
    document.getElementById('u-login').disabled = false;
    document.getElementById('u-name').value = '';
    document.getElementById('u-role').value = 'manager';
    document.getElementById('u-pass').value = '';
    document.getElementById('u-pass-hint').textContent = '*';
    fillEmployeeSelect('');
    renderModuleChecks(moduleDefs().map(m => m.id), false);
  }

  function cancelUserForm() {
    editingUserId = null;
    const w = document.getElementById('user-form-wrap');
    if (w) w.style.display = 'none';
  }

  function editUser(id) {
    const u = loadUsers().find(x => x.id === id);
    if (!u) return;
    editingUserId = id;
    document.getElementById('user-form-wrap').style.display = '';
    document.getElementById('user-form-title').textContent = 'Редагувати: ' + u.username;
    document.getElementById('u-login').value = u.username || '';
    document.getElementById('u-login').disabled = true;
    document.getElementById('u-name').value = u.fullName || '';
    document.getElementById('u-role').value = u.role || 'manager';
    document.getElementById('u-pass').value = '';
    document.getElementById('u-pass-hint').textContent = '(залиште порожнім, щоб не змінювати)';
    fillEmployeeSelect(u.employeeId || '');
    const isAdmin = u.role === 'admin';
    let mods = Array.isArray(u.modules) ? u.modules.slice() : moduleDefs().map(m => m.id);
    if (mods.includes('*')) mods = moduleDefs().map(m => m.id);
    renderModuleChecks(mods, isAdmin);
  }

  function onUserRoleChange() {
    const role = document.getElementById('u-role')?.value || 'manager';
    if (role === 'admin') renderModuleChecks([], true);
    else {
      const checked = [...document.querySelectorAll('#u-modules input[data-mod]:checked')].map(el => el.getAttribute('data-mod'));
      renderModuleChecks(checked.length ? checked : moduleDefs().map(m => m.id), false);
    }
  }

  function saveUser() {
    const me = getCurrentUser();
    if (!me || me.role !== 'admin') { alert('Лише адміністратор'); return; }
    const login = (document.getElementById('u-login')?.value || '').trim();
    const name = (document.getElementById('u-name')?.value || '').trim();
    const role = document.getElementById('u-role')?.value || 'manager';
    const pass = document.getElementById('u-pass')?.value || '';
    const employeeId = (document.getElementById('u-employee')?.value || '').trim();
    if (!login || login.length < 3) { alert('Логін мінімум 3 символи'); return; }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(login)) { alert('Логін: лише латиниця, цифри, _ . -'); return; }
    if (!employeeId) {
      alert('Оберіть співробітника з кадрового обліку — без цього користувач не отримає особисті задачі, авто та сповіщення');
      return;
    }
    const emp = loadHrEmployees().find(e => e.id === employeeId);
    if (!emp) { alert('Обраного співробітника не знайдено в кадровому обліку'); return; }

    let users = loadUsers();
    // one employee — one user
    const takenBy = users.find(u => u.employeeId === employeeId && u.id !== editingUserId);
    if (takenBy) {
      alert('Цей співробітник уже привʼязаний до користувача «' + (takenBy.username || '') + '»');
      return;
    }

    let modules;
    if (role === 'admin') modules = ['*'];
    else {
      modules = [...document.querySelectorAll('#u-modules input[data-mod]:checked')].map(el => el.getAttribute('data-mod'));
      if (!modules.length) { alert('Оберіть хоча б один модуль'); return; }
    }

    const displayName = name || emp.fullName || login;

    if (editingUserId) {
      const i = users.findIndex(x => x.id === editingUserId);
      if (i < 0) return;
      if (pass) {
        if (pass.length < 6) { alert('Пароль мінімум 6 символів'); return; }
        const salt = uid() + uid();
        users[i].salt = salt;
        users[i].hash = hp(pass, salt);
      }
      users[i].fullName = displayName;
      users[i].role = role;
      users[i].modules = modules;
      users[i].employeeId = employeeId;
      users[i].updatedAt = new Date().toISOString().slice(0, 10);
      if (window.NexusCore && NexusCore.audit) NexusCore.audit('users.update', 'user', { id: editingUserId, role, modules, employeeId });
    } else {
      if (!pass || pass.length < 6) { alert('Пароль мінімум 6 символів'); return; }
      if (users.some(x => String(x.username).toLowerCase() === login.toLowerCase())) {
        alert('Такий логін вже існує'); return;
      }
      const salt = uid() + uid();
      const nu = {
        id: uid(), username: login, fullName: displayName, role, modules,
        employeeId,
        salt, hash: hp(pass, salt),
        createdAt: new Date().toISOString().slice(0, 10)
      };
      users.push(nu);
      if (window.NexusCore && NexusCore.audit) NexusCore.audit('users.create', 'user', { id: nu.id, role, modules, employeeId });
    }
    saveUsers(users);
    cancelUserForm();
    renderUsersList();
    applyModuleAccess();
    try { renderCabinet(); } catch (e) {}
    alert('Збережено. Користувач привʼязаний до співробітника «' + emp.fullName + '»');
  }

  function deleteUser(id) {
    const me = getCurrentUser();
    if (!me || me.role !== 'admin') return;
    if (id === me.id) { alert('Не можна видалити себе'); return; }
    if (!confirm('Видалити користувача?')) return;
    let users = loadUsers().filter(x => x.id !== id);
    saveUsers(users);
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('users.delete', 'user', { id });
    renderUsersList();
  }


  /* ─── Personal Cabinet ─────────────────────────────────────────── */
  function normName(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findLinkedEmployee(user) {
    if (!user) return null;
    let hr = {};
    try { hr = JSON.parse(localStorage.getItem(HR_KEY) || '{}'); } catch (e) {}
    const emps = Array.isArray(hr.employees) ? hr.employees : [];
    if (user.employeeId) {
      const byId = emps.find(e => e && e.id === user.employeeId);
      if (byId) return byId;
    }
    const un = normName(user.fullName || user.username);
    if (!un) return null;
    return emps.find(e => {
      const n = normName(e.fullName);
      return n && (n === un || n.includes(un) || un.includes(n));
    }) || null;
  }

  function loadJson(key, fallback) {
    try {
      const r = localStorage.getItem(key);
      if (r == null) return fallback;
      return JSON.parse(r);
    } catch (e) { return fallback; }
  }

  function fmtDate(d) {
    if (!d) return '—';
    const s = String(d).slice(0, 10);
    const p = s.split('-');
    if (p.length === 3) return p[2] + '.' + p[1] + '.' + p[0];
    return s;
  }

  function fmtMoney(n) {
    const v = Number(n) || 0;
    return v.toLocaleString('uk-UA', { maximumFractionDigits: 0 }) + ' ₴';
  }

  function statusPill(status) {
    const s = String(status || '').toLowerCase();
    if (/done|завершен|викон|готово|paid|оплач/.test(s)) return '<span class="cab-pill cab-pill--ok">' + escHtml(status) + '</span>';
    if (/progress|в роботі|in_progress|active|актив/.test(s)) return '<span class="cab-pill cab-pill--info">' + escHtml(status) + '</span>';
    if (/overdue|просроч|danger|cancel/.test(s)) return '<span class="cab-pill cab-pill--danger">' + escHtml(status) + '</span>';
    if (/todo|new|нов|очік|wait|pending/.test(s)) return '<span class="cab-pill cab-pill--warn">' + escHtml(status) + '</span>';
    return '<span class="cab-pill cab-pill--info">' + escHtml(status || '—') + '</span>';
  }

  function renderCabinet() {
    const user = getCurrentUser();
    if (!user) return;
    const emp = findLinkedEmployee(user);
    const empId = emp ? emp.id : null;

    /* Tasks */
    const tasksDb = loadJson('nexus_tasks_v1', { tasks: [] });
    const allTasks = Array.isArray(tasksDb.tasks) ? tasksDb.tasks : (Array.isArray(tasksDb) ? tasksDb : []);
    const myTasks = empId
      ? allTasks.filter(t => t && t.employeeId === empId)
      : allTasks.filter(t => t && normName(t.assignee || t.employeeName || '') === normName(user.fullName));
    const openTasks = myTasks.filter(t => !/done|завершен|викон|скасов/i.test(String(t.status || '')));
    const tasksBody = document.getElementById('cab-tasks-body');
    if (tasksBody) {
      if (!myTasks.length) {
        tasksBody.innerHTML = '<div class="cabinet-empty">' + (emp ? 'Немає задач, призначених на вас' : 'Прив’яжіть користувача до співробітника (ПІБ) або додайте employeeId') + '</div>';
      } else {
        tasksBody.innerHTML = openTasks.slice(0, 8).map(t =>
          '<div class="cab-row"><div class="cab-row__icon">📌</div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml(t.title || t.name || 'Задача') + '</div>' +
          '<div class="cab-row__meta">' + statusPill(t.status || 'todo') +
          (t.deadline || t.due ? ' · до ' + fmtDate(t.deadline || t.due) : '') + '</div></div></div>'
        ).join('') || '<div class="cabinet-empty">Усі задачі виконано 🎉</div>';
      }
    }
    const badgeTasks = document.getElementById('nav-badge-tasks');
    if (badgeTasks) {
      if (openTasks.length) { badgeTasks.hidden = false; badgeTasks.textContent = String(openTasks.length); }
      else badgeTasks.hidden = true;
    }

    /* Fleet + fuel */
    const fleetDb = loadJson('nexus_fleet_v1', { vehicles: [], fuel: [] });
    const vehicles = Array.isArray(fleetDb.vehicles) ? fleetDb.vehicles : [];
    const fuel = Array.isArray(fleetDb.fuel) ? fleetDb.fuel : [];
    const myVehs = empId ? vehicles.filter(v => v && v.employeeId === empId) : [];
    const myVehIds = new Set(myVehs.map(v => v.id));
    const month = new Date().toISOString().slice(0, 7);
    const myFuel = fuel.filter(f => f && myVehIds.has(f.vehicleId) && String(f.date || '').startsWith(month));
    const fuelLiters = myFuel.reduce((s, f) => s + (Number(f.liters) || 0), 0);
    const fuelCost = myFuel.reduce((s, f) => s + (Number(f.cost) || 0), 0);
    const fleetBody = document.getElementById('cab-fleet-body');
    if (fleetBody) {
      if (!myVehs.length) {
        fleetBody.innerHTML = '<div class="cabinet-empty">' + (emp ? 'На вас не закріплено авто' : 'Немає зв’язку зі співробітником') + '</div>';
      } else {
        let h = myVehs.map(v =>
          '<div class="cab-row"><div class="cab-row__icon">🚗</div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml((v.plate || '') + ' — ' + [v.make, v.model].filter(Boolean).join(' ')) + '</div>' +
          '<div class="cab-row__meta">' + escHtml(v.fuelType || '') + (v.odometer ? ' · ' + Number(v.odometer).toLocaleString('uk-UA') + ' км' : '') + '</div>' +
          '</div></div>'
        ).join('');
        h += '<div class="cab-row"><div class="cab-row__icon">⛽</div><div class="cab-row__main">' +
          '<div class="cab-row__title">Паливо за цей місяць</div>' +
          '<div class="cab-row__meta">' + fuelLiters.toFixed(1) + ' л · ' + fmtMoney(fuelCost) + '</div></div></div>';
        fleetBody.innerHTML = h;
      }
    }
    const badgeFleet = document.getElementById('nav-badge-fleet');
    if (badgeFleet) {
      if (myVehs.length) { badgeFleet.hidden = false; badgeFleet.textContent = String(myVehs.length); }
      else badgeFleet.hidden = true;
    }

    /* Inventory */
    const invDb = loadJson(INV_KEY, { items: [] });
    const items = Array.isArray(invDb.items) ? invDb.items : (Array.isArray(invDb) ? invDb : []);
    const myInv = empId ? items.filter(it => it && it.employeeId === empId) : [];
    const invBody = document.getElementById('cab-inventory-body');
    if (invBody) {
      if (!myInv.length) {
        invBody.innerHTML = '<div class="cabinet-empty">' + (emp ? 'Немає закріпленого інвентарю' : 'Немає зв’язку зі співробітником') + '</div>';
      } else {
        invBody.innerHTML = myInv.slice(0, 10).map(it =>
          '<div class="cab-row"><div class="cab-row__icon">📦</div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml(it.name || it.title || 'Позиція') + '</div>' +
          '<div class="cab-row__meta">' + escHtml(it.category || it.invNumber || '') +
          (it.serial ? ' · s/n ' + escHtml(it.serial) : '') + '</div></div></div>'
        ).join('');
      }
    }
    const badgeInv = document.getElementById('nav-badge-inventory');
    if (badgeInv) {
      if (myInv.length) { badgeInv.hidden = false; badgeInv.textContent = String(myInv.length); }
      else badgeInv.hidden = true;
    }

    /* Documents linked to employee */
    const docsDb = loadJson('nexus_documents_v1', { documents: [] });
    const allDocs = Array.isArray(docsDb.documents) ? docsDb.documents : (Array.isArray(docsDb) ? docsDb : []);
    const myDocs = empId ? allDocs.filter(d => d && d.employeeId === empId) : [];
    const docsBody = document.getElementById('cab-docs-body');
    if (docsBody) {
      if (!myDocs.length) {
        docsBody.innerHTML = '<div class="cabinet-empty">' + (emp ? 'Немає документів, повʼязаних з вами' : 'Немає звʼязку зі співробітником') + '</div>';
      } else {
        docsBody.innerHTML = myDocs.slice(0, 8).map(d =>
          '<div class="cab-row"><div class="cab-row__icon cab-row__icon--doc"></div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml(d.title || d.number || d.type || 'Документ') + '</div>' +
          '<div class="cab-row__meta">' + escHtml(d.type || '') +
          (d.date || d.signedAt ? ' · ' + fmtDate(d.date || d.signedAt) : '') +
          (d.amount != null && d.amount !== '' ? ' · ' + fmtMoney(d.amount) : '') +
          '</div></div></div>'
        ).join('');
      }
    }

    /* Projects linked via employee.projectIds */
    const projDb = loadJson('nexus_projects_v1', { projects: [] });
    const allProjects = Array.isArray(projDb.projects) ? projDb.projects : [];
    const myProjIds = emp && Array.isArray(emp.projectIds) ? emp.projectIds : (emp && emp.projectId ? [emp.projectId] : []);
    const myProjects = allProjects.filter(p => p && myProjIds.includes(p.id));
    const projBody = document.getElementById('cab-projects-body');
    if (projBody) {
      if (!myProjects.length) {
        projBody.innerHTML = '<div class="cabinet-empty">' + (emp ? 'Ви не привʼязані до проектів' : 'Немає звʼязку зі співробітником') + '</div>';
      } else {
        projBody.innerHTML = myProjects.slice(0, 8).map(p =>
          '<div class="cab-row"><div class="cab-row__icon cab-row__icon--proj"></div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml((p.code ? p.code + ' — ' : '') + (p.name || 'Проект')) + '</div>' +
          '<div class="cab-row__meta">' + statusPill(p.status || 'active') +
          (p.client || p.customer ? ' · ' + escHtml(p.client || p.customer) : '') +
          '</div></div></div>'
        ).join('');
      }
    }

    /* Calendar preview — next events */
    const calDb = loadJson('nexus_calendar_v1', { events: [] });
    const calCustom = (Array.isArray(calDb.events) ? calDb.events : []).filter(e => !e.userId || e.userId === user.id);
    const todayIso = new Date().toISOString().slice(0, 10);
    const calPreview = [];
    // tasks deadlines
    openTasks.forEach(t => {
      const d = String(t.deadline || t.due || '').slice(0, 10);
      if (d && d >= todayIso) calPreview.push({ title: t.title || t.name || 'Задача', date: d, kind: 'задача' });
    });
    if (emp) {
      (Array.isArray(emp.leaves) ? emp.leaves : []).forEach(l => {
        const d = String(l.from || l.start || '').slice(0, 10);
        if (d && d >= todayIso) calPreview.push({ title: l.type || 'Відпустка', date: d, kind: 'відпустка' });
      });
    }
    calCustom.forEach(e => {
      if (e.start >= todayIso) calPreview.push({ title: e.title, date: e.start, kind: 'подія' });
    });
    calPreview.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const calBody = document.getElementById('cab-calendar-body');
    if (calBody) {
      if (!calPreview.length) {
        calBody.innerHTML = '<div class="cabinet-empty">Немає найближчих подій · <a href="calendar.html">відкрити календар</a></div>';
      } else {
        calBody.innerHTML = calPreview.slice(0, 6).map(e =>
          '<div class="cab-row"><div class="cab-row__icon">📅</div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + escHtml(e.title) + '</div>' +
          '<div class="cab-row__meta">' + fmtDate(e.date) + ' · ' + escHtml(e.kind) + '</div></div></div>'
        ).join('');
      }
    }

    /* Mail preview */
    const mailDb = loadJson('nexus_mail_v1', { messages: [] });
    const mails = Array.isArray(mailDb.messages) ? mailDb.messages : [];
    const inbox = mails.filter(m => m.toId === user.id && !m.archived).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const unreadMail = inbox.filter(m => !m.read).length;
    const mailBody = document.getElementById('cab-mail-body');
    if (mailBody) {
      if (!inbox.length) {
        mailBody.innerHTML = '<div class="cabinet-empty">Вхідних повідомлень немає · <a href="mail.html">написати</a></div>';
      } else {
        mailBody.innerHTML = inbox.slice(0, 5).map(m =>
          '<div class="cab-row"><div class="cab-row__icon">✉</div><div class="cab-row__main">' +
          '<div class="cab-row__title">' + (m.read ? '' : '<span class="cab-pill cab-pill--warn">нове</span> ') +
          escHtml(m.subject || '(без теми)') + '</div>' +
          '<div class="cab-row__meta">' + escHtml(m.fromName || '') + ' · ' + fmtDate(m.at) + '</div></div></div>'
        ).join('');
      }
    }
    const badgeMail = document.getElementById('nav-badge-mail');
    if (badgeMail) {
      if (unreadMail) { badgeMail.hidden = false; badgeMail.textContent = String(unreadMail); }
      else badgeMail.hidden = true;
    }

    /* Notifications */
    const ntf = loadJson('nexus_notifications_v1', []);
    const list = Array.isArray(ntf) ? ntf.slice().reverse() : [];
    const myNtf = list.filter(n => !n.userId || n.userId === user.id).slice(0, 12);
    const unread = myNtf.filter(n => !n.read).length;
    const ntfBody = document.getElementById('cab-notify-body');
    if (ntfBody) {
      if (!myNtf.length) {
        ntfBody.innerHTML = '<div class="cabinet-empty">Сповіщень поки немає</div>';
      } else {
        ntfBody.innerHTML = myNtf.map(n =>
          '<div class="cab-row"><div class="cab-row__icon">' + (n.type === 'error' ? '!' : n.type === 'success' ? '✓' : 'i') +
          '</div><div class="cab-row__main"><div class="cab-row__title">' + escHtml(n.message || '') +
          '</div><div class="cab-row__meta">' + fmtDate(n.at) + (n.read ? '' : ' · <span class="cab-pill cab-pill--warn">нове</span>') +
          '</div></div></div>'
        ).join('');
      }
    }
    const ntfCount = document.getElementById('portal-notify-count');
    if (ntfCount) {
      if (unread) { ntfCount.hidden = false; ntfCount.textContent = String(unread); }
      else ntfCount.hidden = true;
    }
    const badgeCab = document.getElementById('nav-badge-cabinet');
    if (badgeCab) {
      const total = openTasks.length + unread + unreadMail;
      if (total) { badgeCab.hidden = false; badgeCab.textContent = String(total); }
      else badgeCab.hidden = true;
    }

    /* HR summary — detailed */
    const hrBody = document.getElementById('cab-hr-body');
    if (hrBody) {
      if (!emp) {
        hrBody.innerHTML = '<div class="cabinet-empty">Користувача не привʼязано до співробітника. ' +
          'Адміністратор має обрати співробітника в «Користувачі та доступ».</div>';
      } else {
        const leaves = Array.isArray(emp.leaves) ? emp.leaves : [];
        const sick = Array.isArray(emp.sick) ? emp.sick : (Array.isArray(emp.sickLeaves) ? emp.sickLeaves : []);
        const pos = emp.position || '—';
        const hire = emp.hireDate ? fmtDate(emp.hireDate) : '—';
        const contract = emp.contract && emp.contract.number
          ? ('№ ' + emp.contract.number + (emp.contract.type ? ' · ' + emp.contract.type : ''))
          : 'не оформлено';
        const recentLeaves = leaves.slice(-3).reverse();
        const recentSick = sick.slice(-2).reverse();
        let h =
          '<div class="cab-hr-grid">' +
          '<div class="cab-hr-block"><div class="cab-hr-label">ПІБ</div><div class="cab-hr-val">' + escHtml(emp.fullName) + '</div></div>' +
          '<div class="cab-hr-block"><div class="cab-hr-label">Посада</div><div class="cab-hr-val">' + escHtml(pos) + '</div></div>' +
          '<div class="cab-hr-block"><div class="cab-hr-label">Прийнято</div><div class="cab-hr-val">' + hire + '</div></div>' +
          '<div class="cab-hr-block"><div class="cab-hr-label">Договір</div><div class="cab-hr-val">' + escHtml(contract) + '</div></div>' +
          '</div>';
        if (recentLeaves.length) {
          h += '<div class="cab-hr-section">Останні відпустки</div>';
          recentLeaves.forEach(l => {
            h += '<div class="cab-row"><div class="cab-row__main"><div class="cab-row__title">' +
              escHtml(l.type || 'Відпустка') + '</div><div class="cab-row__meta">' +
              fmtDate(l.from || l.start) + ' — ' + fmtDate(l.to || l.end) +
              (l.days ? ' · ' + l.days + ' дн.' : '') + '</div></div></div>';
          });
        }
        if (recentSick.length) {
          h += '<div class="cab-hr-section">Останні лікарняні</div>';
          recentSick.forEach(s => {
            h += '<div class="cab-row"><div class="cab-row__main"><div class="cab-row__title">' +
              escHtml(s.type || 'Лікарняний') + '</div><div class="cab-row__meta">' +
              fmtDate(s.from || s.start) + ' — ' + fmtDate(s.to || s.end) + '</div></div></div>';
          });
        }
        if (!recentLeaves.length && !recentSick.length) {
          h += '<div class="cabinet-empty" style="padding-top:8px">Відпусток і лікарняних поки немає</div>';
        }
        hrBody.innerHTML = h;
      }
    }

    /* Service records on my vehicles */
    const service = Array.isArray(fleetDb.service) ? fleetDb.service : [];
    const myService = service.filter(s => s && myVehIds.has(s.vehicleId)).slice(-5).reverse();

    /* Quick stats */
    const statsEl = document.getElementById('cabinet-quick-stats');
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="cab-stat"><div class="cab-stat__label">Відкриті задачі</div><div class="cab-stat__value cab-stat__value--blue">' + openTasks.length + '</div></div>' +
        '<div class="cab-stat"><div class="cab-stat__label">Авто</div><div class="cab-stat__value cab-stat__value--orange">' + myVehs.length + '</div></div>' +
        '<div class="cab-stat"><div class="cab-stat__label">Інвентар</div><div class="cab-stat__value cab-stat__value--green">' + myInv.length + '</div></div>' +
        '<div class="cab-stat"><div class="cab-stat__label">Документи</div><div class="cab-stat__value">' + myDocs.length + '</div></div>' +
        '<div class="cab-stat"><div class="cab-stat__label">Проекти</div><div class="cab-stat__value cab-stat__value--purple">' + myProjects.length + '</div></div>' +
        '<div class="cab-stat"><div class="cab-stat__label">Паливо / міс.</div><div class="cab-stat__value">' + fuelLiters.toFixed(0) + ' л</div></div>';
    }

    const titleEl = document.getElementById('cabinet-title');
    if (titleEl) titleEl.textContent = 'Мій кабінет';
    const subEl = document.getElementById('cabinet-subtitle');
    if (subEl && emp) {
      subEl.textContent = emp.fullName + (emp.position ? ' · ' + emp.position : '') +
        ' — персональні дані з усіх модулів NEXUS';
    }
  }

  function markNotificationsRead() {
    const user = getCurrentUser();
    if (!user) return;
    let list = loadJson('nexus_notifications_v1', []);
    if (!Array.isArray(list)) return;
    list = list.map(n => {
      if (!n.userId || n.userId === user.id) return Object.assign({}, n, { read: true });
      return n;
    });
    try { localStorage.setItem('nexus_notifications_v1', JSON.stringify(list)); } catch (e) {}
    renderCabinet();
  }

  function bindCabinetUi() {
    const markBtn = document.getElementById('cab-notify-mark');
    if (markBtn) markBtn.onclick = markNotificationsRead;
    const ntfBtn = document.getElementById('portal-notify-btn');
    if (ntfBtn) ntfBtn.onclick = () => {
      const el = document.getElementById('cab-notify');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const sideLogout = document.getElementById('sidebar-logout-btn');
    if (sideLogout) sideLogout.onclick = () => logout();
    const sideTheme = document.getElementById('sidebar-theme-btn');
    if (sideTheme) {
      sideTheme.onclick = () => {
        const btn = document.querySelector('.portal-theme-btn');
        if (btn) btn.click();
      };
    }
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.onclick = () => {
        document.querySelector('.nexus-shell')?.classList.toggle('sidebar-open');
      };
    }
  }

  /* patch init to also render cabinet */
  const _origInit = null;
  function initCabinetHooks() {
    bindCabinetUi();
    const user = getCurrentUser();
    if (user) {
      renderSidebarUser(user);
      renderCabinet();
    }
  }

  return { init, getCurrentUser, submitAuth, openUsersModal, closeUsersModal, openUserForm, cancelUserForm, editUser, saveUser, deleteUser, onUserRoleChange, onEmployeeSelect, applyModuleAccess, renderCabinet, findLinkedEmployee, initCabinetHooks };
})();

window.Portal = Portal;

document.addEventListener('DOMContentLoaded', () => {
  Portal.init();
  if (Portal.initCabinetHooks) Portal.initCabinetHooks();
});