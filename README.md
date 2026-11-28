# NEXUS ENGENEERING — HR / ERP портал

**Версія: 6.1.2** — offline polish (без сервера).

## Що нового в 6.1.2
- Єдиний `canEdit` через `NexusCore` у documents / projects / finance / fleet / tasks / crm / inventory
- Після «Відновити з бекапу» сторінка перезавантажується автоматично
- Стилі порожніх списків (`.nx-empty`)

## 6.1.0 merged
- База GitHub 5.0.1 (XSS, quota, UUID) + логіка чату: онбординг, бекап UX, finance↔документ, KPI
- Без теми Mercedes

## Запуск
Відкрийте `index.html`. Бекап: **Ctrl+Shift+B** або кнопка в меню. Відновлення: меню користувача → «Відновити з бекапу».

## Важливо
Дані в `localStorage` — окремо для кожного браузера. Спільна робота з різних браузерів/ПК потребує сервера (поки немає).


## 6.1.2
- Порожні списки (документи, проекти, фінанси) у стилі nx-empty
- Календар: банер, якщо користувач не привʼязаний до співробітника


## 6.1.3 — HR Заявки (DOCX)
- Вкладка «Заявки» поруч із «Співробітники»
- Завантаження шаблонів .docx у localStorage
- Заповнення ПІБ з картки співробітника (або профілю користувача)
- Плейсхолдери: {{ПІБ}}, {{Прізвище}}, {{Ім'я}}, {{ПоБатькові}}

## 6.2.0 — Professional UI
- Odoo-inspired design system (`nexus-odoo-ui.css`)
- Control panel (breadcrumbs, search, primary actions) on modules
- SVG icons in sidebar (instead of emoji)
- Unified list tables (`.nx-table` / wrap)
- Form view layout helpers (`.nx-form`, sheet, statusbar)
- Shared helpers: `nexus-ui.js`

## Гостьовий модуль кандидатів
- На екрані входу доступне посилання «Увійти як гість» на `guest.html`.
- Кандидат може надіслати контакти, повідомлення, резюме й скан-копії; файли зберігаються у приватному Supabase Storage bucket.
- Працівники HR переглядають анкети у вкладці «Кандидати» в `hr.html`; доступ і зміна статусу перевіряються RPC-функціями за правами HR.
- Для запуску ввімкніть Anonymous Sign-Ins у Supabase Auth, застосуйте `supabase/migrations/20261128060000_guest_applications.sql`, увійдіть у HR від імені потрібної компанії та натисніть «Підключити прийом анкет».

