# NEXUS ENGENEERING — HR / ERP портал

**Версія: 6.1.0 (merged)** — база GitHub 5.0.1 + логіка з чату 6.x **без** теми Mercedes.

## Що всередині

- **Збережено з GitHub 5.0.1:** XSS-sanitization, localStorage quota, crypto.randomUUID, fix MutationObserver, поле проекту в документах, fin-chart, звʼязок contractId у проектах.
- **Додано з логіки 6.x:**
  - `NexusCore.canEdit` / `denyEdit` / `hashPassword`
  - індикатор сховища + дата бекапу + кнопка «Бекап» у sidebar
  - онбординг «Швидкий старт» на кабінеті
  - фінанси → поле «Договір / документ» (`documentId`)
  - розширені KPI на дашборді (finance / projects / tasks / fleet)
  - єдина версія **6.1.0**

## Модулі

Портал, кадри, проекти, задачі, календар, пошта, інвентар, авто, склад, документи, фінанси, CRM, дашборд, звіти, аудит.

## Запуск

Відкрийте `index.html` у браузері. Глобальний бекап: **Ctrl+Shift+B**.

## Обмеження

Offline-first на `localStorage`. Для спільної роботи кількох людей потрібен сервер (API + PostgreSQL).

## Дизайн

Ця збірка **без** `nexus-theme.css` (Mercedes). Візуал — як на GitHub 5.0.x.
