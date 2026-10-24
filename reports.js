/* NEXUS — Professional Reports Hub */
const Reports = (() => {
  'use strict';

  const SESSION_KEY = 'nexus_session_v1';
  const USERS_KEY = 'nexus_users_v1';
  const THEME_KEY = 'nexus_theme_v1';

  let currentId = null;
  let lastRows = [];
  let lastHeaders = [];
  let lastTitle = '';
  let chartInstance = null;
  const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];


  const CATALOG = [
    { cat: 'Зведення', id: 'company_summary', title: 'Зведення по компанії', desc: 'Кадри, договори, фінанси, авто, CRM — ключові показники за період' },
    { cat: 'Зведення', id: 'pnl', title: 'Доходи та витрати (P&L)', desc: 'Прибуткові/витратні договори + фінансові операції за період' },
    { cat: 'Кадри', id: 'hr_staff', title: 'Список співробітників', desc: 'ПІБ, відділ, посада, статус, контакти' },
    { cat: 'Кадри', id: 'hr_contracts', title: 'Трудові договори', desc: 'Дати укладення та закінчення, посада' },
    { cat: 'Документи', id: 'doc_income', title: 'Прибуткові договори', desc: 'Замовники, суми, статуси, дати' },
    { cat: 'Документи', id: 'doc_expense', title: 'Витратні договори', desc: 'Підрядники, суми, статуси, дати' },
    { cat: 'Документи', id: 'doc_expiring', title: 'Договори що закінчуються', desc: 'Усі договори з датою «діє до» у періоді або найближчим часом' },
    { cat: 'Фінанси', id: 'fin_ops', title: 'Операції за період', desc: 'Усі доходи/витрати з категоріями та контрагентами' },
    { cat: 'Фінанси', id: 'fin_by_cat', title: 'Фінанси за категоріями', desc: 'Агрегація сум по категоріях' },
    { cat: 'Фінанси', id: 'fin_by_counter', title: 'Фінанси за контрагентами', desc: 'Обороти по контрагентах з CRM' },
    { cat: 'Авто', id: 'fleet_vehicles', title: 'Автопарк', desc: 'Авто, пробіг, страховка, ТО, гума, інв. №' },
    { cat: 'Авто', id: 'fleet_fuel_drivers', title: 'Паливо по водіях', desc: 'Літри та ₴ за період з журналу заправок' },
    { cat: 'Авто', id: 'fleet_fuel_vehicles', title: 'Паливо по авто', desc: 'Літри та ₴ там, де вказано авто' },
    { cat: 'Авто', id: 'fleet_service', title: 'Сервіс та ремонт', desc: 'Роботи, СТО, суми, підстави' },
    { cat: 'Авто', id: 'fleet_cost', title: 'Вартість утримання авто', desc: 'Паливо + сервіс по кожному авто за період' },
    { cat: 'Інвентар', id: 'inv_list', title: 'Інвентар (реєстр)', desc: 'Предмети, категорії, відповідальні, вартість' },
    { cat: 'Інвентар', id: 'inv_by_cat', title: 'Інвентар за категоріями', desc: 'Кількість і сума балансової вартості' },
    { cat: 'CRM', id: 'crm_all', title: 'Контрагенти CRM', desc: 'Замовники та підрядники, ролі, статуси' },
    { cat: 'CRM', id: 'crm_portfolio', title: 'Портфель контрагентів', desc: 'Суми прибуткових і витратних договорів по кожному' },
    { cat: 'Проекти', id: 'proj_list', title: 'Проекти', desc: 'Коди, статуси, суми, замовники' },
    { cat: 'Задачі', id: 'tasks_list', title: 'Задачі', desc: 'Статуси, пріоритети, відповідальні, дедлайни' }
  ];

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function monthStart() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fN(n) {
    return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(Number(n) || 0);
  }
  function fD(s) {
    if (!s) return '—';
    const p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }
  function readLS(key, fb) {
    if (window.NexusCore && NexusCore.read) return NexusCore.read(key, fb);
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : fb;
    } catch (e) { return fb; }
  }
  function inPeriod(dateStr, from, to) {
    if (!dateStr) return !from && !to;
    const d = String(dateStr).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  function getPeriod() {
    return {
      from: document.getElementById('r-from')?.value || '',
      to: document.getElementById('r-to')?.value || ''
    };
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY); return null;
      }
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) { return null; }
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

  /* data loaders */
  function employees() {
    const h = readLS('nexus_hr_ua_v2', {});
    return Array.isArray(h.employees) ? h.employees : (Array.isArray(h.staff) ? h.staff : []);
  }
  function docs() {
    const d = readLS('nexus_documents_v1', { docs: [] });
    return Array.isArray(d.docs) ? d.docs : [];
  }
  function fin() {
    const d = readLS('nexus_finance_v1', { ops: [] });
    return Array.isArray(d.ops) ? d.ops : [];
  }
  function fleet() {
    return readLS('nexus_fleet_v1', { vehicles: [], fuel: [], service: [], cards: [] });
  }
  function inv() {
    const d = readLS('nexus_inventory_v1', { items: [] });
    return Array.isArray(d.items) ? d.items : [];
  }
  function crm() {
    const d = readLS('nexus_crm_v1', { clients: [] });
    return Array.isArray(d.clients) ? d.clients : [];
  }
  function projects() {
    const d = readLS('nexus_projects_v1', { projects: [] });
    return Array.isArray(d.projects) ? d.projects : [];
  }
  function tasks() {
    const d = readLS('nexus_tasks_v1', { tasks: [] });
    if (Array.isArray(d.tasks)) return d.tasks;
    if (Array.isArray(d.items)) return d.items;
    return Array.isArray(d) ? d : [];
  }
  function empName(id) {
    const e = employees().find(x => x.id === id);
    return e ? (e.fullName || e.name || '—') : '—';
  }
  function vehTitle(v) {
    if (!v) return '—';
    return [v.make, v.model].filter(Boolean).join(' ') || v.model || '—';
  }

  /* UI catalog */
  function renderNav() {
    const el = document.getElementById('rep-nav');
    if (!el) return;
    let cat = '';
    let h = '';
    CATALOG.forEach(r => {
      if (r.cat !== cat) {
        cat = r.cat;
        h += '<div class="rep-nav-h">' + esc(cat) + '</div>';
      }
      h += '<button type="button" class="rep-item' + (currentId === r.id ? ' active' : '') +
        '" onclick="Reports.select(\'' + r.id + '\')">' + esc(r.title) +
        '<span>' + esc(r.desc) + '</span></button>';
    });
    el.innerHTML = h;
  }

  function select(id) {
    currentId = id;
    const r = CATALOG.find(x => x.id === id);
    if (!r) return;
    document.getElementById('rep-title').textContent = r.title;
    document.getElementById('rep-desc').textContent = r.desc;
    renderNav();
    renderFilters(r);
    document.getElementById('rep-meta').innerHTML = '';
    document.getElementById('rep-out').innerHTML = '<div class="rep-empty">Натисніть «Сформувати»</div>';
    lastRows = []; lastHeaders = []; lastTitle = r.title;
  }

  function renderFilters(r) {
    const needsPeriod = !['hr_staff', 'fleet_vehicles', 'inv_list', 'inv_by_cat', 'crm_all'].includes(r.id);
    const el = document.getElementById('rep-filters');
    let h = '';
    if (needsPeriod || true) {
      h += '<div class="ff"><label>Період з</label><input type="date" id="r-from" value="' + monthStart() + '"></div>';
      h += '<div class="ff"><label>по</label><input type="date" id="r-to" value="' + today() + '"></div>';
      h += '<button class="btn bs bsm" type="button" onclick="Reports.setMonth()">Цей місяць</button>';
      h += '<button class="btn bs bsm" type="button" onclick="Reports.setAll()">Весь час</button>';
    }
    el.innerHTML = h;
  }
  function setMonth() {
    const f = document.getElementById('r-from');
    const t = document.getElementById('r-to');
    if (f) f.value = monthStart();
    if (t) t.value = today();
  }
  function setAll() {
    const f = document.getElementById('r-from');
    const t = document.getElementById('r-to');
    if (f) f.value = '';
    if (t) t.value = '';
  }

  function destroyChart() {
    if (chartInstance) {
      try { chartInstance.destroy(); } catch (e) {}
      chartInstance = null;
    }
  }

  function themeText() {
    try {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--text').trim() || '#0f172a';
    } catch (e) { return '#0f172a'; }
  }

  function renderChartFromTable(headers, rows) {
    destroyChart();
    const wrap = document.getElementById('rep-chart-wrap');
    const canvas = document.getElementById('rep-chart');
    const titleEl = document.getElementById('rep-chart-title');
    if (!wrap || !canvas || !window.Chart) {
      if (wrap) wrap.style.display = 'none';
      return;
    }
    if (!rows.length || headers.length < 2) {
      wrap.style.display = 'none';
      return;
    }

    // Find first text column (labels) and numeric columns
    const numCols = [];
    for (let c = 0; c < headers.length; c++) {
      let nums = 0, total = 0;
      rows.forEach(r => {
        total++;
        if (typeof r[c] === 'number' || (r[c] !== '' && !isNaN(Number(r[c])) && String(r[c]).trim() !== '')) nums++;
      });
      if (total && nums / total >= 0.6) numCols.push(c);
    }
    if (!numCols.length) {
      wrap.style.display = 'none';
      return;
    }

    let labelCol = 0;
    for (let c = 0; c < headers.length; c++) {
      if (!numCols.includes(c)) { labelCol = c; break; }
    }

    // Limit series for readability
    const useCols = numCols.slice(0, 4);
    const maxRows = 12;
    // sort by first numeric col desc for top-N when many rows
    let dataRows = rows.slice();
    if (dataRows.length > maxRows) {
      const sc = useCols[0];
      dataRows = dataRows.slice().sort((a, b) => (Number(b[sc]) || 0) - (Number(a[sc]) || 0)).slice(0, maxRows);
    }

    const labels = dataRows.map(r => {
      const s = String(r[labelCol] == null ? '' : r[labelCol]);
      return s.length > 28 ? s.slice(0, 26) + '…' : s;
    });
    const datasets = useCols.map((c, i) => ({
      label: headers[c],
      data: dataRows.map(r => Number(r[c]) || 0),
      backgroundColor: useCols.length === 1
        ? CHART_COLORS.slice(0, dataRows.length)
        : CHART_COLORS[i % CHART_COLORS.length],
      borderColor: useCols.length === 1 ? undefined : CHART_COLORS[i % CHART_COLORS.length],
      borderRadius: 6,
      borderWidth: useCols.length === 1 ? 0 : 2,
      fill: false,
      tension: 0.3
    }));

    // Choose chart type
    let type = 'bar';
    if (currentId === 'pnl' || (useCols.length === 1 && dataRows.length <= 8 && dataRows.length >= 2)) {
      // doughnut for small single-series categorical
      if (currentId === 'pnl' || currentId === 'company_summary' || currentId === 'fin_by_cat' || currentId === 'inv_by_cat') {
        type = dataRows.length <= 8 && useCols.length === 1 ? 'doughnut' : 'bar';
      }
    }
    if (currentId === 'fin_ops' || currentId === 'fleet_fuel_drivers') type = useCols.length === 1 ? 'bar' : 'line';

    if (titleEl) titleEl.textContent = 'Візуалізація · ' + (lastTitle || 'Звіт');
    wrap.style.display = '';

    const textColor = themeText();
    Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
    Chart.defaults.color = textColor;

    const isDoughnut = type === 'doughnut';
    chartInstance = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: isDoughnut ? [{
          data: datasets[0].data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 0
        }] : datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isDoughnut || useCols.length > 1,
            position: isDoughnut ? 'right' : 'top',
            labels: { color: textColor, boxWidth: 12, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const v = ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed;
                return (ctx.dataset.label ? ctx.dataset.label + ': ' : '') + fN(v);
              }
            }
          }
        },
        scales: isDoughnut ? {} : {
          x: { ticks: { color: textColor, maxRotation: 45, minRotation: 0 }, grid: { color: 'rgba(148,163,184,.2)' } },
          y: { ticks: { color: textColor }, grid: { color: 'rgba(148,163,184,.2)' }, beginAtZero: true }
        }
      }
    });
  }

  function showResult(headers, rows, chips) {
    lastHeaders = headers;
    lastRows = rows;
    const meta = document.getElementById('rep-meta');
    meta.innerHTML = (chips || []).map(c => '<div class="chip">' + c + '</div>').join('');
    const out = document.getElementById('rep-out');
    if (!rows.length) {
      out.innerHTML = '<div class="rep-empty">Немає даних за обраними умовами</div>';
      destroyChart();
      const wrap = document.getElementById('rep-chart-wrap');
      if (wrap) wrap.style.display = 'none';
      return;
    }
    let h = '<table class="dt"><thead><tr>' + headers.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>';
    rows.forEach(row => {
      h += '<tr>' + row.map(cell => {
        const s = cell == null ? '' : String(cell);
        const num = typeof cell === 'number';
        return '<td' + (num ? ' class="tmn"' : '') + '>' + esc(s) + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody></table>';
    out.innerHTML = h;
    try { renderChartFromTable(headers, rows); } catch (e) { console.warn('chart', e); }
  }

  /* report builders */
  function build(id) {
    const { from, to } = getPeriod();
    const periodLabel = (from || to) ? (fD(from || '…') + ' — ' + fD(to || '…')) : 'увесь час';

    if (id === 'company_summary') {
      const staff = employees().filter(e => (e.status || 'active') !== 'fired' && (e.status || 'active') !== 'dismissed');
      const d = docs();
      const income = d.filter(x => x.type === 'contract' && x.contractKind !== 'expense');
      const expense = d.filter(x => x.type === 'contract' && x.contractKind === 'expense');
      const ops = fin().filter(o => inPeriod(o.date, from, to));
      const incOps = ops.filter(o => o.type === 'income').reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const expOps = ops.filter(o => o.type === 'expense').reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const fl = fleet();
      const fuel = (fl.fuel || []).filter(f => inPeriod(f.date, from, to));
      const svc = (fl.service || []).filter(s => inPeriod(s.date, from, to));
      const headers = ['Показник', 'Значення'];
      const rows = [
        ['Період', periodLabel],
        ['Співробітників (активні)', staff.length],
        ['Прибуткових договорів (усі)', income.length],
        ['Сума прибуткових договорів, ₴', Math.round(income.reduce((s, x) => s + (Number(x.amount) || 0), 0) * 100) / 100],
        ['Витратних договорів (усі)', expense.length],
        ['Сума витратних договорів, ₴', Math.round(expense.reduce((s, x) => s + (Number(x.amount) || 0), 0) * 100) / 100],
        ['Фінансові надходження за період, ₴', Math.round(incOps * 100) / 100],
        ['Фінансові витрати за період, ₴', Math.round(expOps * 100) / 100],
        ['Сальдо фінансів за період, ₴', Math.round((incOps - expOps) * 100) / 100],
        ['Авто в парку', (fl.vehicles || []).length],
        ['Заправок за період', fuel.length],
        ['Паливо за період, л', Math.round(fuel.reduce((s, f) => s + (Number(f.liters) || 0), 0) * 100) / 100],
        ['Паливо за період, ₴', Math.round(fuel.reduce((s, f) => s + (Number(f.cost) || 0), 0) * 100) / 100],
        ['Сервісів за період', svc.length],
        ['Сервіс за період, ₴', Math.round(svc.reduce((s, x) => s + (Number(x.cost) || 0), 0) * 100) / 100],
        ['Контрагентів CRM', crm().length],
        ['Позицій інвентаря', inv().length],
        ['Проектів', projects().length]
      ];
      showResult(headers, rows, ['Період: ' + periodLabel, 'Рядків: ' + rows.length]);
      return;
    }

    if (id === 'pnl') {
      const d = docs().filter(x => x.type === 'contract' && inPeriod(x.date, from, to));
      const ops = fin().filter(o => inPeriod(o.date, from, to));
      const di = d.filter(x => x.contractKind !== 'expense').reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const de = d.filter(x => x.contractKind === 'expense').reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const fi = ops.filter(o => o.type === 'income').reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const fe = ops.filter(o => o.type === 'expense').reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const headers = ['Стаття', 'Сума ₴'];
      const rows = [
        ['Договори прибуткові (за датою договору)', Math.round(di * 100) / 100],
        ['Договори витратні (за датою договору)', Math.round(de * 100) / 100],
        ['Фінансові надходження', Math.round(fi * 100) / 100],
        ['Фінансові витрати', Math.round(fe * 100) / 100],
        ['Разом доходи (договори + ops)', Math.round((di + fi) * 100) / 100],
        ['Разом витрати (договори + ops)', Math.round((de + fe) * 100) / 100],
        ['Різниця', Math.round((di + fi - de - fe) * 100) / 100]
      ];
      showResult(headers, rows, ['Період: ' + periodLabel]);
      return;
    }

    if (id === 'hr_staff') {
      const headers = ['ПІБ', 'Відділ', 'Посада', 'Статус', 'Телефон', 'Email', 'Дата прийому'];
      const rows = employees().map(e => [
        e.fullName || e.name || '', e.department || e.dept || '', e.position || e.title || '',
        e.status || 'active', e.phone || '', e.email || '', e.hireDate || e.startDate || ''
      ]);
      showResult(headers, rows, ['Співробітників: ' + rows.length]);
      return;
    }

    if (id === 'hr_contracts') {
      const headers = ['ПІБ', 'Посада', 'Дата укладення', 'Діє до', 'Статус'];
      const rows = [];
      employees().forEach(e => {
        const c = e.laborContract || e.contract || {};
        const start = c.start || c.date || e.contractStart || '';
        const end = c.end || c.until || e.contractEnd || '';
        if (from || to) {
          if (start && !inPeriod(start, from, to) && end && !inPeriod(end, from, to)) return;
        }
        rows.push([e.fullName || e.name || '', e.position || '', start, end, e.status || '']);
      });
      showResult(headers, rows, ['Записів: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'doc_income' || id === 'doc_expense') {
      const expense = id === 'doc_expense';
      const list = docs().filter(d => d.type === 'contract' && (expense ? d.contractKind === 'expense' : d.contractKind !== 'expense') && inPeriod(d.date, from, to));
      const headers = ['Назва', 'Номер', 'Дата', 'Діє до', 'Контрагент', 'ЄДРПОУ', 'Сума ₴', 'Статус'];
      const rows = list.map(d => [d.name || '', d.num || '', d.date || '', d.until || '', d.counter || '', d.edrpou || '', Number(d.amount) || 0, d.status || '']);
      const sum = list.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      showResult(headers, rows, ['Договорів: ' + rows.length, 'Сума: ' + fN(sum) + ' ₴', 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'doc_expiring') {
      const list = docs().filter(d => d.type === 'contract' && d.until && inPeriod(d.until, from || today(), to || '9999-12-31'));
      const headers = ['Назва', 'Вид', 'Контрагент', 'Діє до', 'Сума ₴', 'Статус'];
      const rows = list.map(d => [
        d.name || '', d.contractKind === 'expense' ? 'Витратний' : 'Прибутковий',
        d.counter || '', d.until || '', Number(d.amount) || 0, d.status || ''
      ]);
      showResult(headers, rows, ['Записів: ' + rows.length]);
      return;
    }

    if (id === 'fin_ops') {
      const list = fin().filter(o => inPeriod(o.date, from, to)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const headers = ['Дата', 'Тип', 'Категорія', 'Сума ₴', 'Рахунок', 'Контрагент', 'Опис'];
      const rows = list.map(o => [
        o.date || '', o.type === 'income' ? 'Дохід' : 'Витрата', o.category || o.cat || '',
        Number(o.amount) || 0, o.account || '', o.counter || '', o.note || o.desc || ''
      ]);
      showResult(headers, rows, ['Операцій: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fin_by_cat') {
      const list = fin().filter(o => inPeriod(o.date, from, to));
      const map = {};
      list.forEach(o => {
        const key = (o.type || '') + '|' + (o.category || o.cat || 'без категорії');
        if (!map[key]) map[key] = { type: o.type, cat: o.category || o.cat || 'без категорії', sum: 0, n: 0 };
        map[key].sum += Number(o.amount) || 0;
        map[key].n++;
      });
      const headers = ['Тип', 'Категорія', 'Операцій', 'Сума ₴'];
      const rows = Object.values(map).map(x => [x.type === 'income' ? 'Дохід' : 'Витрата', x.cat, x.n, Math.round(x.sum * 100) / 100]);
      showResult(headers, rows, ['Категорій: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fin_by_counter') {
      const list = fin().filter(o => inPeriod(o.date, from, to));
      const map = {};
      list.forEach(o => {
        const key = o.counter || o.clientId || '— без контрагента —';
        if (!map[key]) map[key] = { name: key, inc: 0, exp: 0, n: 0 };
        if (o.type === 'income') map[key].inc += Number(o.amount) || 0;
        else map[key].exp += Number(o.amount) || 0;
        map[key].n++;
      });
      const headers = ['Контрагент', 'Операцій', 'Надходження ₴', 'Витрати ₴', 'Сальдо ₴'];
      const rows = Object.values(map).map(x => [
        x.name, x.n, Math.round(x.inc * 100) / 100, Math.round(x.exp * 100) / 100, Math.round((x.inc - x.exp) * 100) / 100
      ]);
      showResult(headers, rows, ['Контрагентів: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fleet_vehicles') {
      const fl = fleet();
      const headers = ['Номер', 'Марка/модель', 'Тип', 'VIN', 'Пробіг', 'Інв.№', 'Страховка до', 'ТО до', 'Зимова гума', 'Водій', 'Статус'];
      const rows = (fl.vehicles || []).map(v => [
        v.plate || '', vehTitle(v), v.vehicleType || v.type || '', v.vin || '', v.odometer || 0,
        v.invNumber || '', v.insuranceTo || '', v.techUntil || '',
        v.winterTires === 'yes' ? 'Так' : 'Ні', empName(v.employeeId), v.status || ''
      ]);
      showResult(headers, rows, ['Авто: ' + rows.length]);
      return;
    }

    if (id === 'fleet_fuel_drivers') {
      const fl = fleet();
      const map = {};
      (fl.fuel || []).filter(f => inPeriod(f.date, from, to)).forEach(f => {
        const key = f.employeeId || f.holder || f.cardNumber || 'невідомо';
        if (!map[key]) map[key] = { name: f.employeeId ? empName(f.employeeId) : (f.holder || f.cardNumber || '—'), liters: 0, cost: 0, n: 0 };
        map[key].liters += Number(f.liters) || 0;
        map[key].cost += Number(f.cost) || 0;
        map[key].n++;
      });
      const headers = ['Водій', 'Заправок', 'Літри', 'Сума ₴'];
      const rows = Object.values(map).map(x => [x.name, x.n, Math.round(x.liters * 100) / 100, Math.round(x.cost * 100) / 100]);
      showResult(headers, rows, ['Водіїв: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fleet_fuel_vehicles') {
      const fl = fleet();
      const map = {};
      (fl.fuel || []).filter(f => inPeriod(f.date, from, to) && f.vehicleId).forEach(f => {
        const v = (fl.vehicles || []).find(x => x.id === f.vehicleId);
        const key = f.vehicleId;
        if (!map[key]) map[key] = { plate: v ? v.plate : '?', model: vehTitle(v), liters: 0, cost: 0, n: 0 };
        map[key].liters += Number(f.liters) || 0;
        map[key].cost += Number(f.cost) || 0;
        map[key].n++;
      });
      const headers = ['Номер', 'Модель', 'Заправок', 'Літри', 'Сума ₴'];
      const rows = Object.values(map).map(x => [x.plate, x.model, x.n, Math.round(x.liters * 100) / 100, Math.round(x.cost * 100) / 100]);
      showResult(headers, rows, ['Авто: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fleet_service') {
      const fl = fleet();
      const list = (fl.service || []).filter(s => inPeriod(s.date, from, to));
      const headers = ['Дата', 'Авто', 'Опис', 'СТО', 'Рахунок', 'Сума ₴', 'Наступне ТО'];
      const rows = list.map(s => {
        const v = (fl.vehicles || []).find(x => x.id === s.vehicleId);
        return [s.date || '', v ? v.plate : '', s.desc || s.description || '', s.vendor || '', s.invoice || '', Number(s.cost) || 0, s.nextDate || ''];
      });
      const sum = list.reduce((s, x) => s + (Number(x.cost) || 0), 0);
      showResult(headers, rows, ['Записів: ' + rows.length, 'Сума: ' + fN(sum) + ' ₴', 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'fleet_cost') {
      const fl = fleet();
      const headers = ['Номер', 'Модель', 'Паливо л', 'Паливо ₴', 'Сервіс ₴', 'Разом ₴'];
      const rows = (fl.vehicles || []).map(v => {
        let liters = 0, fuel = 0, svc = 0;
        (fl.fuel || []).filter(f => f.vehicleId === v.id && inPeriod(f.date, from, to)).forEach(f => {
          liters += Number(f.liters) || 0; fuel += Number(f.cost) || 0;
        });
        (fl.service || []).filter(s => s.vehicleId === v.id && inPeriod(s.date, from, to)).forEach(s => {
          svc += Number(s.cost) || 0;
        });
        return [v.plate || '', vehTitle(v), Math.round(liters * 100) / 100, Math.round(fuel * 100) / 100, Math.round(svc * 100) / 100, Math.round((fuel + svc) * 100) / 100];
      });
      showResult(headers, rows, ['Авто: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    if (id === 'inv_list') {
      const headers = ['Назва', 'Категорія', 'Інв.№', 'Статус', 'Відповідальний', 'Вартість ₴', 'Місце'];
      const rows = inv().map(i => [
        i.name || '', i.category || i.cat || '', i.invNumber || i.number || '', i.status || '',
        empName(i.employeeId || i.assigneeId), Number(i.value || i.cost) || 0, i.location || i.place || ''
      ]);
      showResult(headers, rows, ['Позицій: ' + rows.length]);
      return;
    }

    if (id === 'inv_by_cat') {
      const map = {};
      inv().forEach(i => {
        const k = i.category || i.cat || 'інше';
        if (!map[k]) map[k] = { n: 0, sum: 0 };
        map[k].n++;
        map[k].sum += Number(i.value || i.cost) || 0;
      });
      const headers = ['Категорія', 'Кількість', 'Вартість ₴'];
      const rows = Object.keys(map).map(k => [k, map[k].n, Math.round(map[k].sum * 100) / 100]);
      showResult(headers, rows, ['Категорій: ' + rows.length]);
      return;
    }

    if (id === 'crm_all') {
      const roleMap = { customer: 'Замовник', supplier: 'Підрядник', both: 'Обидва' };
      const stMap = { lead: 'Потенційний', negotiation: 'Переговори', active: 'Клієнт', archive: 'Архів' };
      const headers = ['Назва', 'Роль', 'Статус', 'ЄДРПОУ', 'Телефон', 'Email', 'Місто', 'Менеджер'];
      const rows = crm().map(c => [
        c.name || '', roleMap[c.role || 'customer'] || '', stMap[c.status] || c.status || '',
        c.edrpou || '', c.phone || '', c.email || '', c.city || '', empName(c.managerId)
      ]);
      showResult(headers, rows, ['Контрагентів: ' + rows.length]);
      return;
    }

    if (id === 'crm_portfolio') {
      const allDocs = docs().filter(d => d.type === 'contract');
      const headers = ['Контрагент', 'Роль', 'Прибуткових', 'Сума прибуток ₴', 'Витратних', 'Сума витрати ₴'];
      const rows = crm().map(c => {
        const code = String(c.edrpou || '').replace(/\s/g, '');
        const name = String(c.name || '').toLowerCase();
        const match = d => {
          if (d.clientId && d.clientId === c.id) return true;
          if (code && String(d.edrpou || '').replace(/\s/g, '') === code) return true;
          if (name && String(d.counter || '').toLowerCase() === name) return true;
          return false;
        };
        const inc = allDocs.filter(d => d.contractKind !== 'expense' && match(d));
        const exp = allDocs.filter(d => d.contractKind === 'expense' && match(d));
        const roleMap = { customer: 'Замовник', supplier: 'Підрядник', both: 'Обидва' };
        return [
          c.name || '', roleMap[c.role || 'customer'] || '',
          inc.length, Math.round(inc.reduce((s, d) => s + (Number(d.amount) || 0), 0) * 100) / 100,
          exp.length, Math.round(exp.reduce((s, d) => s + (Number(d.amount) || 0), 0) * 100) / 100
        ];
      });
      showResult(headers, rows, ['Контрагентів: ' + rows.length]);
      return;
    }

    if (id === 'proj_list') {
      const headers = ['Код', 'Назва', 'Статус', 'Сума ₴', 'Замовник', 'Початок', 'Кінець'];
      const rows = projects().filter(p => !from && !to ? true : inPeriod(p.startDate || p.start || p.createdAt, from, to) || true)
        .map(p => [
          p.code || '', p.name || '', p.status || '', Number(p.amount) || 0,
          p.customer || p.counter || '', p.startDate || p.start || '', p.endDate || p.end || ''
        ]);
      showResult(headers, rows, ['Проектів: ' + rows.length]);
      return;
    }

    if (id === 'tasks_list') {
      const list = tasks().filter(t => inPeriod(t.dueDate || t.deadline || t.createdAt || t.date, from, to) || (!from && !to));
      const headers = ['Назва', 'Статус', 'Пріоритет', 'Відповідальний', 'Дедлайн', 'Проект'];
      const rows = list.map(t => [
        t.title || t.name || '', t.status || '', t.priority || '',
        empName(t.assigneeId || t.employeeId) || t.assignee || '',
        t.dueDate || t.deadline || '', t.projectName || t.projectId || ''
      ]);
      showResult(headers, rows, ['Задач: ' + rows.length, 'Період: ' + periodLabel]);
      return;
    }

    showResult(['Інфо'], [['Звіт у розробці']], []);
  }

  function run() {
    if (!currentId) { alert('Оберіть звіт у каталозі ліворуч'); return; }
    lastTitle = (CATALOG.find(x => x.id === currentId) || {}).title || currentId;
    build(currentId);
  }

  function exportExcel() {
    if (!window.XLSX) { alert('SheetJS не завантажено'); return; }
    if (!lastRows.length) { alert('Спочатку сформуйте звіт'); return; }
    const data = [lastHeaders].concat(lastRows);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Звіт');
    const name = ('nexus-report-' + (currentId || 'data') + '.xlsx').replace(/\s+/g, '-');
    XLSX.writeFile(wb, name);
  }

  function print() {
    window.print();
  }

  function renderStats() {
    const el = document.getElementById('stats');
    if (!el) return;
    el.innerHTML =
      '<div class="sc"><div class="scl">Звітів у каталозі</div><div class="scv scv-b">' + CATALOG.length + '</div></div>' +
      '<div class="sc"><div class="scl">Модулів-джерел</div><div class="scv scv-g">8</div></div>' +
      '<div class="sc"><div class="scl">Експорт</div><div class="scv scv-p">Excel</div></div>' +
      '<div class="sc"><div class="scl">Період</div><div class="scv scv-o" style="font-size:14px">гнучкий</div></div>';
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('reports')) return;
    if (!initAuth()) return;
    initTheme();
    renderStats();
    renderNav();
    select('company_summary');
  }

  return { init, logout, select, run, exportExcel, print, setMonth, setAll };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { Reports.init(); } catch (e) { console.error(e); alert('Помилка звітів: ' + e.message); }
});
