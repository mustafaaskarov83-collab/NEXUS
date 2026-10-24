# Архитектура NEXUS 5

## Текущий слой

```text
UI modules
  ├── HR
  ├── Dashboard
  ├── Documents
  ├── Finance
  ├── Inventory
  └── Tasks
        │
        ▼
   nexus-core.js
        │
        ├── Session
        ├── RBAC
        ├── Audit
        ├── Notifications
        ├── Backup
        └── Error handling
        │
        ▼
    localStorage
```

## Production target

```text
Browser
  │ HTTPS
  ▼
FastAPI
  ├── Auth / Sessions
  ├── RBAC
  ├── HR
  ├── Documents
  ├── Finance
  ├── Inventory
  ├── Projects / Tasks
  ├── Notifications
  └── Audit
        │
        ▼
PostgreSQL
```

Текущая v5 — безопаснее и структурированнее v4.7 в рамках offline-first модели, но не должна восприниматься как серверная система безопасности.

## Project-centric model
`nexus_projects_v1` is the central project registry. Related entities keep `projectId` (employees use `projectIds[]`). The Projects module aggregates related records from HR, Documents, Inventory, Tasks and Finance without duplicating those records.
