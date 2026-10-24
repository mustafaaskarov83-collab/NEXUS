/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING — Модуль переключения темы (v3.6)
   Три режима: light / dark / auto
   ═══════════════════════════════════════════════════════════════════════ */

const Theme = (() => {
  const KEY = 'nexus_theme_v1';
  const MODES = ['light', 'dark', 'auto'];
  const ICONS = { light: '☀️', dark: '🌙', auto: '🌗' };
  const LABELS = {
    uk: { light: 'Світла тема', dark: 'Темна тема', auto: 'Системна тема' },
    ru: { light: 'Светлая тема', dark: 'Тёмная тема', auto: 'Системная тема' },
    tr: { light: 'Açık tema', dark: 'Koyu tema', auto: 'Sistem teması' }
  };

  let current = localStorage.getItem(KEY) || 'auto';

  function getLang() { return localStorage.getItem('nexus_lang_v1') || 'uk'; }

  function labelFor(mode) {
    const dict = LABELS[getLang()] || LABELS.uk;
    return dict[mode] || mode;
  }

  function apply(mode) {
    if (!MODES.includes(mode)) mode = 'auto';
    current = mode;
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(KEY, mode);
    updateButton();
  }

  function cycle() {
    const idx = MODES.indexOf(current);
    const next = MODES[(idx + 1) % MODES.length];
    apply(next);
    // Небольшая подсказка в консоли
    console.log('%c Тема: ' + next + ' ' + ICONS[next],
      'color:#3b82f6;font-weight:600;font-size:12px');
  }

  function updateButton() {
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach(b => {
      b.textContent = ICONS[current] || '🌗';
      const label = labelFor(current) + ' (натисніть, щоб змінити)';
      b.setAttribute('title', label);
      b.setAttribute('aria-label', label);
    });
  }

  function init() {
    // Применить сразу, чтобы избежать мигания
    document.documentElement.setAttribute('data-theme', current);

    // Кнопки в шапке
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-btn')) {
        e.stopPropagation();
        cycle();
      }
    });

    // Слежение за системной темой (при auto)
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (current === 'auto') updateButton();
      });
    }

    // Обновить иконку после отрисовки интерфейса
    setTimeout(updateButton, 100);
    setTimeout(updateButton, 500);
  }

  return { init, cycle, apply, get current() { return current; } };
})();

window.Theme = Theme;

// Применяем тему максимально рано — до DOMContentLoaded
(function() {
  const saved = localStorage.getItem('nexus_theme_v1') || 'auto';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {
  try { Theme.init(); } catch(e) { console.error('Theme init error:', e); }
});