/* NEXUS AI v0.2 — hybrid local AI + offline knowledge base */
(function () {
  if (window.NexusAssistant && window.NexusAssistant.__v === '0.2') return;

  const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const AI_BASE = 'http://localhost:11434';
  const AI_CHAT = AI_BASE + '/v1/chat/completions';
  const AI_TAGS = AI_BASE + '/api/tags';
  const STORAGE_KEY = 'nexus_ai_assistant_v02';
  const PREF_KEY = 'nexus_ai_assistant_pref';

  const SYSTEM_PROMPT = {
    role: 'system',
    content:
      'Ти — NEXUS AI v0.2, офіційний персональний помічник ERP/HR-порталу NEXUS Engineering (NEXUS OFFICE).\n' +
      'Працюєш ЛОКАЛЬНО всередині браузера користувача. Відповідай мовою користувача (українська/російська). Коротко, по суті, з кроками. Markdown дозволено.\n\n' +

      '# 1. ЩО ТАКЕ NEXUS\n' +
      'NEXUS — offline-first корпоративний портал у браузері без обовʼязкового сервера.\n' +
      'Усі бізнес-дані зберігаються в localStorage цього браузера (ключі з префіксом nexus_*).\n' +
      'Вхід: index.html → логін/пароль. Сесія ~12 годин (nexus_session_v1).\n' +
      'Користувачі: nexus_users_v1. Ролі: admin (Адміністратор), manager (Менеджер), viewer (Перегляд).\n' +
      'Адмін — повний доступ. Менеджер — робота з даними. Viewer — лише читання (кнопки змін заблоковані через NexusCore.canEdit).\n' +
      'Бекап усієї бази: Ctrl+Shift+B або меню користувача → «Завантажити бекап» / «Відновити з бекапу».\n' +
      'Тема: світла / темна / авто (кнопка в шапці). Мова інтерфейсу HR — uk (nexus_lang_v1).\n' +
      'Ядро: nexus-core.js (сесія, RBAC, audit, notifications, backup). UI: nexus-odoo-ui.css, portal, модулі.\n\n' +

      '# 2. ГОЛОВНА І КАБІНЕТ (index.html)\n' +
      'Після входу — портал з бічним меню модулів і «Мій кабінет».\n' +
      'Кабінет: привітання, KPI (відкриті задачі, авто, інвентар, документи, проекти), мої задачі, мої заявки, інвентар, документи, проекти.\n' +
      'Заявки в кабінеті: створення з шаблону, чернетка → на PM → на директора → схвалено/відхилено; друк схвалених.\n' +
      'Сповіщення і бейджі в меню. Перехід у модулі з карток або сайдбару.\n\n' +

      '# 3. КАДРОВИЙ ОБЛІК (hr.html, nexus_hr_ua_v2)\n' +
      'Співробітники: ПІБ, посада, відділ (departmentId), контакти, статус, проекти (projectIds), дата прийому, дата народження тощо.\n' +
      'Відділи: довідник departments[].\n' +
      'Відпустки/лікарняні: у картці співробітника (leaves / vacations).\n' +
      'Трудовий договір: номер, дати, текст, друк/скан у картці.\n' +
      'Вкладка «Заявки»: шаблони DOCX/текст (nexus_hr_requests_v1), плейсхолдери {{ПІБ}}, {{Прізвище}}, {{Ім\'я}}, {{ПоБатькові}}.\n' +
      'Подані заявки кабінету: nexus_hr_request_submissions_v1 → { items: [ { id, title, status, text, ... } ] }.\n' +
      'Статуси заявок: draft, pending_pm, pending_director, approved, rejected.\n' +
      'Користувача можна привʼязати до employeeId для кабінету/календаря.\n\n' +

      '# 4. АВТО І ПАЛИВО (fleet.html, nexus_fleet_v1)\n' +
      'Структура: { vehicles, fuel, cards, service, meta }.\n' +
      'Авто: plate (держ. номер), make, model, vin, status (active/repair/idle/sold), водій, витрата, страховка тощо.\n' +
      'Паливо: заправки (date, vehicleId, liters, amount, card…), імпорт OKKO «Звіт про рух».\n' +
      'Паливні картки: привʼязка до співробітника і авто; інакше «непривʼязане паливо».\n' +
      'Сервіс: роботи/матеріали як у рахунку СТО, підстава (договір з документів), суми.\n' +
      'Звіти Excel за період по авто (паливо + сервіс).\n' +
      'КРИТИЧНО: «заправка» = запис у fuel[]. «Заявка» = HR-заява. НІКОЛИ не плутай fleet_fuel_fillups із заявками на відпустку.\n\n' +

      '# 5. ІНВЕНТАР (inventory.html, nexus_inventory_v1)\n' +
      'Позиції: назва, інв. номер, категорія, відповідальний, кількість, локація, статус. Додавання через модалку. Excel-експорт.\n\n' +

      '# 6. СКЛАД (warehouse.html, nexus_warehouse_v1)\n' +
      'Складські залишки/номенклатура (items/stock/products). Облік окремо від інвентарю основних засобів.\n\n' +

      '# 7. ДОКУМЕНТООБІГ (documents.html, nexus_documents_v1)\n' +
      'Договори та документи: номер, назва, статус, дати. Договори підтягуються в сервіс авто як «Підстава».\n\n' +

      '# 8. ПРОЕКТИ (projects.html, nexus_projects_v1)\n' +
      'Реєстр projects[]: name, status, code, manager, managerUserId…. Центральна сутність: інші модулі можуть мати projectId / projectIds.\n' +
      'PM погоджує заявки, якщо він керівник проекту заявника.\n\n' +

      '# 9. ЗАДАЧІ (tasks.html, nexus_tasks_v1)\n' +
      'Канбан: tasks[] зі status (наприклад todo/progress/done), title, deadline, assignee. Роль viewer — без змін.\n\n' +

      '# 10. ФІНАНСИ (finance.html, nexus_finance_v1)\n' +
      'Операції: operations/transactions (дата, тип доход/витрата, сума, опис, категорія). Звіти/Excel.\n\n' +

      '# 11. CRM (crm.html, nexus_crm_v1)\n' +
      'Клієнти/компанії: name, phone, email, status.\n\n' +

      '# 12. КАЛЕНДАР (calendar.html, nexus_calendar_v1)\n' +
      'Події events. Якщо користувач не привʼязаний до співробітника — показується банер.\n\n' +

      '# 13. ПОШТА (mail.html, nexus_mail_v1)\n' +
      'Внутрішні/локальні поштові записи модуля.\n\n' +

      '# 14. ДАШБОРД KPI І ЗВІТИ (dashboard.html, reports.html)\n' +
      'Зведена аналітика: кадри, ФОП, відпустки, лікарняні, інвентар. Звіти з періодів і Excel у модулях.\n\n' +

      '# 15. АУДИТ І СПОВІЩЕННЯ\n' +
      'nexus_audit_v1 — журнал дій. nexus_notifications_v1 — сповіщення користувачу.\n\n' +

      '# 16. ЯК ВІДПОВІДАТИ НА ПИТАННЯ ПРО ДАНІ\n' +
      'У цьому ж діалозі нижче/поряд передається ЖИВИЙ зріз localStorage (ПІДСУМОК_ЧИСЕЛ + списки).\n' +
      'КРИТИЧНО:\n' +
      '- Тобі ВЖЕ є доступ до даних модулів через цей зріз. НІКОЛИ не кажи «немає доступу до модуля».\n' +
      '- Якщо лічильник 0 — кажи «у базі 0 записів», не вигадуй.\n' +
      '- employees_in_hr_module = люди в кадрах; system_users = логіни в систему (це різне).\n' +
      '- hr_cabinet_requests_* = заявки кабінету; fleet_fuel_fillups = заправки паливом.\n' +
      '- Цитуй конкретні title/ПІБ/номери зі зрізу. Не змішуй схожі слова.\n\n' +

      '# 17. ЯК ВІДПОВІДАТИ НА ПИТАННЯ ПРО ІНТЕРФЕЙС\n' +
      'Давай покрокові інструкції (який модуль у меню, яка кнопка). Не вигадуй неіснуючі пункти.\n' +
      'Типові: додати співробітника; імпорт OKKO; привʼязати картку; бекап; роль Перегляд блокує «Додати».\n\n' +

      'Поточна сторінка користувача: ' + PAGE + '.\n' +
      '\n# 18. ДІЇ В СИСТЕМІ\n' +
      'Користувач може попросити створити заявку на відпустку — система виконає це автоматично, якщо є дати.\n' +
      'Можна також вивести блок nexus_action JSON з action create_leave_request, dateFrom, dateTo, submit.\n' +
      'submit true = відправити на погодження PM (директор підписує окремо зі свого облікового запису).\n' +
      'Якщо питання загальне — орієнтуйся на цей модуль, але дані бери зі всього зрізу NEXUS.'
  };

  const KB = [
    {
      keys: ['бекап усієї', 'відновити бекап', 'резервна копія всі', 'backup all', 'import all'],
      answer: 'Повний бекап NEXUS:\n1. На головній натисніть на своє ім’я вгорі справа.\n2. «Завантажити бекап» — файл JSON на диск.\n3. «Відновити з бекапу» — оберіть файл; дані заміняться.\n\nРобіть бекап перед очищенням браузера або переносом на інший ПК.'
    },
    {
      keys: ['неприв', 'без авто палив', 'майстер карток'],
      answer: 'Якщо після OKKO паливо не в сумі авто:\n• жовте попередження «Неприв’язане паливо»\n• вкладка «Паливні картки» або майстер після імпорту\n• вкажіть співробітника і авто для кожної картки\nПісля прив’язки суми з’являться в автопарку за період.'
    },
    {
      keys: ['звіт за період', 'звіт по авто'],
      answer: 'Звіт по авто за період:\n1. Зверху оберіть «Період з / по» (або «Цей місяць»).\n2. Автопарк → «Звіт за період» (Excel).\nУ файлі: літри, гривні палива, сервіс і разом по кожному авто.'
    },

    {
      keys: ['привіт', 'привет', 'hello', 'hi', 'добрий', 'здрастуй', 'доброго'],
      answer: 'Вітаю! Я офлайн-помічник NEXUS.\nМожу підказати по всім модулям: кадри, інвентар, авто і паливо, сервіс, документи, проекти, задачі, фінанси.\nОберіть швидку тему нижче або напишіть питання своїми словами.'
    },
    {
      keys: ['допомога', 'help', 'що вмієш', 'команди', 'можливост', 'підказк', 'подсказ'],
      answer: 'Я підказую по NEXUS:\n• вхід, ролі, тема оформлення\n• кадровий облік, відділи, відпустки, трудові договори\n• інвентар (категорії, пошук, відповідальний)\n• автопарк, VIN, водії\n• паливо, імпорт OKKO, паливні картки\n• сервіс: роботи/матеріали як у рахунку, підстава, рахунок СТО\n• документи, проекти, задачі, фінанси, дашборд\n• бекап і типові проблеми\n\nПриклади запитів: «як імпортувати OKKO», «додати співробітника», «рядки сервісу», «прив’язати картку».'
    },
    {
      keys: ['вхід', 'логін', 'авториз', 'пароль', 'увійти', 'войти', 'сесі'],
      answer: 'Вхід у систему:\n1. Відкрийте index.html (головна порталу).\n2. Введіть логін і пароль у вікні «Вхід до системи NEXUS».\n3. Після успішного входу відкриється головна з модулями.\n\nЯкщо користувачів ще немає — перший адміністратор створюється при першому запуску кадрового модуля.\nСесія зберігається в браузері. Вийти можна через меню користувача в шапці.'
    },
    {
      keys: ['роль', 'прав', 'перегляд', 'viewer', 'менеджер', 'адмін', 'доступ'],
      answer: 'Ролі доступу:\n• Адміністратор — повний доступ до всіх модулів і налаштувань\n• Менеджер — робота з даними (додавання, редагування)\n• Перегляд — тільки читання, кнопки змін заблоковані\n\nЯкщо «Додати» не реагує — перевірте роль у правому верхньому куті (під іменем). Роль «Перегляд» навмисно не дозволяє змінювати дані.'
    },
    {
      keys: ['головн', 'портал', 'модул', 'меню', 'index', 'картк модул'],
      answer: 'Головна (index.html) — портал NEXUS.\nКартки модулів:\n• Кадровий облік\n• Інвентар\n• Авто і паливо\n• Документообіг\n• Проекти, Задачі, Фінанси, Дашборд\n\nКлік по картці відкриває модуль. Повернення на головну — стрілка «←» у шапці модуля або index.html.'
    },
    {
      keys: ['кадр', 'співробіт', 'сотрудник', 'hr', 'персонал', 'штат'],
      answer: 'Кадровий облік (hr.html):\n1. Відкрийте модуль з головної.\n2. Додайте співробітника (ПІБ, посада, відділ, контакти).\n3. У картці можна змінити відділ зі списку, посаду, статус.\n4. Ведеться облік відпусток і лікарняних.\n5. Трудовий договір: дати, текст, друк, скан.\n\nПошук і фільтри допомагають швидко знайти людину в списку.'
    },
    {
      keys: ['відділ', 'отдел', 'департамент', 'підрозділ'],
      answer: 'Відділи в кадрах:\n• створюються/ведуться в кадровому модулі\n• у картці співробітника поле «Відділ» — випадаючий список\n• можна змінити відділ і зберегти картку\n\nЯкщо списку немає — оновіть сторінку (Ctrl+F5) і відкрийте картку знову.'
    },
    {
      keys: ['відпустк', 'отпуск', 'лікарня', 'больнич', 'відсутн'],
      answer: 'Відпустки та лікарняні (кадри):\n• фіксуйте періоди в картці або відповідному розділі HR\n• вказуйте дати початку і закінчення\n• це допомагає контролювати відсутність і планувати заміну'
    },
    {
      keys: ['трудов', 'контракт співробіт', 'скан договор', 'друкувати договір'],
      answer: 'Трудовий договір (кадри):\n1. Відкрийте картку співробітника.\n2. Вкажіть дату укладення і дату закінчення (якщо є).\n3. Згенеруйте або відредагуйте текст договору.\n4. За потреби змініть посаду в тексті.\n5. Роздрукуйте, підпишіть, завантажте скан у картку.\n\nСистема показує, коли договір закінчується — зручно для продовження.'
    },
    {
      keys: ['посада', 'должность', 'змінити посаду'],
      answer: 'Посада:\n• у картці співробітника в HR\n• також можна оновити в тексті трудового договору\nПісля зміни збережіть картку.'
    },
    {
      keys: ['інвентар', 'инвентар', 'обладнання', 'техніка', 'меблі', 'предмет'],
      answer: 'Інвентар (inventory.html):\n1. «Додати предмет» — відкриється вікно (не розгорнута форма).\n2. Спочатку оберіть категорію.\n3. Назва, інв. №, вартість, статус, відповідальний.\n4. Збережіть.\n\nПошук: за назвою або інвентарним номером.\nКатегорії «транспорт / авто» тут немає — їх облік у модулі «Авто і паливо».'
    },
    {
      keys: ['категор', 'категорія інвентар', 'список категор'],
      answer: 'Категорії інвентаря:\nОбираються першими при додаванні предмета.\nТранспорт навмисно прибрано з інвентаря, щоб не дублювати «Авто і паливо».\nЯкщо потрібна нова категорія в майбутньому — можна розширити список у коді модуля.'
    },
    {
      keys: ['відповідальн', 'ответствен', 'закріпити інвентар'],
      answer: 'Відповідальний за інвентар:\nУ формі предмета оберіть співробітника зі списку (дані з кадрового обліку).\nТак видно, за ким закріплено техніку чи меблі.'
    },
    {
      keys: ['автопарк', 'додати авто', 'машин', 'держномер', 'номер авто', 'vin', 'він', 'колір авто'],
      answer: 'Автопарк (fleet.html → Автопарк):\n1. «Додати автомобіль» — модальне вікно.\n2. Держномер, марка/модель, рік, тип палива.\n3. Додатково: VIN, колір, опис.\n4. Водій — зі списку співробітників.\n5. Пробіг, статус (в роботі / ремонт / простій…).\n\nПошук — за номером або назвою. Є Excel-експорт списку авто.'
    },
    {
      keys: ['водій', 'водитель', 'закріпити водія'],
      answer: 'Водій авто:\nУ картці автомобіля оберіть співробітника з HR.\nУ звітах заправок OKKO ім’я часто вже є в «Картотримач» — додатково прив’яжіть паливну картку до цього ж співробітника.'
    },
    {
      keys: ['палив', 'заправ', 'витрата палив', 'літр'],
      answer: 'Витрата палива (fleet.html → Витрата палива):\n• ручне додавання заправки: авто, дата, літри, сума, пробіг, примітка\n• або масовий імпорт з OKKO Excel\n\nУ журналі видно: дату, авто/картку, водія, тип палива, літри, суму, АЗС.\nФільтр по авто і пошук доступні зверху.'
    },
    {
      keys: ['okko', 'окко', 'імпорт excel', 'импорт excel', 'звіт про рух', 'акт звірки'],
      answer: 'Імпорт OKKO (Excel «Звіт про рух» / акт звірки):\n1. Вкладка «Витрата палива».\n2. Кнопка «Імпорт OKKO Excel».\n3. Оберіть файл з комп’ютера (браузер сам папку не читає).\n4. Підтягуються рядки з паливом: дата, час, АЗС, товар, літри, сума зі знижкою, картка, картотримач.\n5. «Оплата», підсумки «Відпущено…», сальдо — пропускаються.\n6. Повторний імпорт того ж періоду не створює дублікати.\n\nПісля імпорту зайдіть у «Паливні картки» і прив’яжіть картки до людей/авто.'
    },
    {
      keys: ['паливн', 'картка okko', 'номер картки', 'картотрим'],
      answer: 'Паливні картки (fleet.html → Паливні картки):\n• номер картки OKKO\n• ім’я як у звіті (картотримач)\n• прив’язка до співробітника і/або авто\n\nКартки можуть створитися автоматично при імпорті.\nПісля прив’язки в журналі заправок видно «свого» водія, а не лише текст з OKKO.'
    },
    {
      keys: ['сервіс', 'сервис', 'то ', 'техобслуг', 'ремонт', 'сто', 'обслугов', 'діагност'],
      answer: 'Сервіс авто (fleet.html → Сервіс):\n1. «Додати сервіс».\n2. Авто, дата, статус робіт: заплановано / в роботі / виконано.\n3. Тип: ТО, ремонт, шини, олива, гальма…\n4. Підстава — договір з Документообігу.\n5. Номер рахунку СТО і назва СТО.\n6. Роботи та матеріали — таблиця як у рахунку.\n7. Пробіг, дата/км наступного сервісу.\n\nКлік по рядку відкриває деталі для бухгалтерії. Excel-звіт містить усі рядки робіт.'
    },
    {
      keys: ['рядок', 'матеріал', 'найменування', 'одиниця', 'к-сть', 'ціна', 'сума рядка', 'як у рахунку'],
      answer: 'Рядки сервісу (як у рахунку):\nКолонки:\n• Тип — Робота або Матеріал\n• Найменування\n• Од. (шт, л, компл, посл…)\n• К-сть\n• Ціна\n• Сума = к-сть × ціна (автоматично)\n\nКнопка «➕ Додати рядок» — нова позиція.\nПоле «Разом, грн» — підсумок усіх рядків (лише читання).\nПотрібен хоча б один рядок з назвою, щоб зберегти сервіс.'
    },
    {
      keys: ['підстав', 'основание', 'договір сервіс', 'прив’язати договір'],
      answer: 'Підстава в сервісі:\nЦе договір з модуля Документообіг (тип «Договір»).\n1. Спочатку створіть/перевірте договір у documents.html.\n2. У формі сервісу оберіть його в полі «Підстава».\n3. Окремо вкажіть номер рахунку, який виставило СТО.\n\nЯкщо список порожній — у документообігу ще немає договорів.'
    },
    {
      keys: ['простроч', 'наступний сервіс', 'плановий то'],
      answer: 'Нагадування по сервісу:\nВкажіть «Наступний сервіс (дата)» і/або «км».\nСтатуси:\n• Прострочено — дата минула або пробіг досягнуто\n• Скоро — протягом ~14 днів\n• Заплановано — усе в нормі\n\nСтатус робіт (заплановано/в роботі/виконано) — окремо від «наступного ТО».'
    },
    {
      keys: ['документ', 'документообіг', 'акт', 'додаток', 'наказ', 'рахунок документ'],
      answer: 'Документообіг (documents.html):\n• типи: договір, додаток, акт, рахунок, наказ тощо\n• додавання через модальне вікно (як у проектах)\n• договори потім доступні як «Підстава» в сервісі авто\n• можна вказувати контрагента, проект, суму, дати\n\nЗручно тримати всі юридичні підстави в одному місці.'
    },
    {
      keys: ['проект', 'projects', 'керівник проект'],
      answer: 'Проекти (projects.html):\n1. «Новий проект» — окреме вікно.\n2. Назва, код, статус, сума, керівник, договір.\n3. Збережіть — проект у списку.\n\nПроекти можна згадувати в документах і звітності.'
    },
    {
      keys: ['задач', 'канбан', 'tasks', 'дедлайн', 'пріоритет', 'дошка'],
      answer: 'Задачі (tasks.html):\n• канбан-дошка за статусами\n• пріоритет, відповідальний, дедлайн\n• перетягування карток (якщо роль дозволяє зміни)\nРоль «Перегляд» лише дивиться дошку.'
    },
    {
      keys: ['фінанс', 'финанс', 'грош', 'бюджет', 'витрат', 'доход'],
      answer: 'Фінанси (finance.html):\nОблік фінансових операцій у NEXUS.\nДля внесення змін потрібна роль Адміністратор або Менеджер.\nЗвіти по сервісу авто (вартість робіт) і паливу можна звіряти з бухгалтерією через Excel-експорт.'
    },
    {
      keys: ['дашборд', 'аналітик', 'статистик', 'звітність'],
      answer: 'Дашборд (dashboard.html):\nЗведена аналітика по системі.\nДетальні звіти також є всередині модулів (Excel-кнопки в інвентарі, авто, паливі, сервісі).'
    },
    {
      keys: ['тема', 'темн', 'світл', 'dark', 'light', 'оформлення'],
      answer: 'Тема оформлення:\nКнопка 🌗 у шапці:\nсвітла → темна → авто (як у Windows/macOS).\nВибір зберігається в браузері і застосовується в модулях.'
    },
    {
      keys: ['пошук', 'знайти', 'фільтр'],
      answer: 'Пошук у модулях:\n• Інвентар — назва або інв. №\n• Автопарк — номер або назва\n• Паливо — номер/примітка + фільтр по авто\n• Картки — номер картки або ПІБ\n• Сервіс — текст, рахунок, авто + фільтр статусу\n• Кадри — за ПІБ та іншими полями списку'
    },
    {
      keys: ['excel', 'експорт', 'вивантаж', 'звіт excel'],
      answer: 'Експорт Excel:\nУ більшості модулів є кнопка «Excel» / «Excel (звіт)».\nСервіс вивантажує кожен рядок робіт/матеріалів окремо — зручно для бухгалтерії.\nПаливо і автопарк також мають експорт списків.'
    },
    {
      keys: ['backup', 'бекап', 'резерв', 'зберегти дані', 'перенести', 'localstorage'],
      answer: 'Дані NEXUS лежать у localStorage браузера (на цьому ПК і профілі).\nРекомендації:\n1. Регулярно експортуйте Excel з важливих модулів.\n2. Не натискайте «очистити дані сайту» без бекапу.\n3. Інший комп’ютер = інші локальні дані, потрібен перенос через експорт/імпорт.\n4. Імпорт OKKO можна повторювати — дублікати відсікаються.'
    },
    {
      keys: ['помилка', 'баг', 'не працює', 'не реагує', 'кнопка', 'не відкри'],
      answer: 'Якщо щось не працює:\n1. Ctrl+F5 — жорстке оновлення.\n2. Перевірте, що ви увійшли (ім’я в шапці).\n3. Роль не «Перегляд».\n4. Додавання в інвентарі/авто/сервісі — через модальне вікно.\n5. Запускайте з index.html, щоб була сесія.\n6. Для OKKO — саме формат «Звіт про рух» з колонкою «Картка».\n\nОпишіть модуль і кнопку — підкажу точніше.'
    },
    {
      keys: ['офлайн', 'інтернет', 'без мережі', 'локальн'],
      answer: 'NEXUS працює офлайн: файли HTML/JS на диску, дані в браузері.\nІнтернет потрібен лише якщо ви самі відкриваєте зовнішні посилання.\nПомічник теж офлайн — відповідає з вбудованої бази підказок, без API.'
    },
    {
      keys: ['хто ти', 'помічник', 'асистент', 'бот'],
      answer: 'Я вбудований офлайн-помічник NEXUS.\nНе надсилаю ваші дані в інтернет і не підключаюсь до ChatGPT.\nЗнаю структуру ваших модулів і типові сценарії роботи. Якщо відповіді мало — сформулюйте питання конкретніше.'
    },
    {
      keys: ['версія', 'що нового', 'changelog'],
      answer: 'Актуальна лінійка: NEXUS HR v5.x (портал + модулі).\nСеред доопрацювань: модальні форми, авто і паливо, імпорт OKKO, паливні картки, сервіс з рядками як у рахунку, підстава з договорів, офлайн-помічник.\nДеталі також у README/CHANGELOG у папці проекту.'
    }
  ];;

  const QUICK = [
    { label: 'Вхід і ролі', q: 'як увійти і які ролі' },
    { label: 'Додати співробітника', q: 'як додати співробітника' },
    { label: 'Трудовий договір', q: 'трудовий договір скан' },
    { label: 'Інвентар', q: 'як додати інвентар' },
    { label: 'Додати авто', q: 'як додати авто VIN' },
    { label: 'Імпорт OKKO', q: 'як імпортувати OKKO' },
    { label: 'Паливні картки', q: 'прив’язати паливну картку' },
    { label: 'Сервіс і рядки', q: 'рядки сервісу як у рахунку' },
    { label: 'Підстава (договір)', q: 'підстава договір у сервісі' },
    { label: 'Excel і бекап', q: 'експорт excel бекап даних' }
  ];;

  // ---------- helpers ----------
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\u0400-\u04FFa-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pageHint() {
    const map = {
      'index.html': 'Ви на головній. Оберіть модуль у картках або спитайте, з чого почати.',
      'hr.html': 'Ви в кадровому обліку. Можу підказати по співробітниках, відпустках і трудових договорах.',
      'inventory.html': 'Ви в інвентарі. Додавання — через «Додати предмет». Категорія обирається першою.',
      'fleet.html': 'Ви в модулі «Авто і паливо»: автопарк, заправки/OKKO, картки, сервіс.',
      'documents.html': 'Ви в документообігу. Договори звідси підтягуються в сервіс авто як «Підстава».',
      'projects.html': 'Ви в проектах. Новий проект відкривається в окремому вікні.',
      'tasks.html': 'Ви в задачах (канбан).',
      'finance.html': 'Ви у фінансах.',
      'dashboard.html': 'Ви на дашборді аналітики.',
      'warehouse.html': 'Ви на складі.',
      'crm.html': 'Ви в CRM.',
      'calendar.html': 'Ви в календарі.',
      'reports.html': 'Ви у звітах.',
      'mail.html': 'Ви в пошті.'
    };
    return map[PAGE] || 'Я поруч і можу підказати по будь-якому модулю NEXUS.';
  }


  // ---------- Live NEXUS data context for AI ----------
  function safeParse(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function trunc(s, n) {
    s = String(s == null ? '' : s).trim();
    if (s.length <= n) return s;
    return s.slice(0, n - 1) + '…';
  }

  function empName(e) {
    if (!e) return '';
    return e.fullName || [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ') || e.name || e.id || '';
  }

  /** Build compact snapshot of all NEXUS localStorage data for the model */
  function buildNexusDataContext(maxChars) {
    maxChars = maxChars || 60000;

    function safeParse(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw == null) return null;
        try { return JSON.parse(raw); } catch (e) { return raw; }
      } catch (e) { return null; }
    }

    function isPlainObject(o) {
      return o && typeof o === 'object' && !Array.isArray(o);
    }

    function stripSecrets(obj) {
      if (Array.isArray(obj)) return obj.map(stripSecrets);
      if (!isPlainObject(obj)) return obj;
      const out = {};
      Object.keys(obj).forEach(function (k) {
        const lk = k.toLowerCase();
        if (lk === 'password' || lk === 'passwordhash' || lk === 'passhash' ||
            lk === 'hash' || lk === 'salt' || lk === 'token' || lk === 'secret' ||
            lk.indexOf('password') >= 0) {
          out[k] = '[приховано]';
        } else {
          out[k] = stripSecrets(obj[k]);
        }
      });
      return out;
    }

    function empName(e) {
      if (!e) return '';
      return e.fullName || [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ') || e.name || e.id || '';
    }

    function lineItem(obj, preferKeys) {
      if (obj == null) return '';
      if (typeof obj !== 'object') return String(obj);
      const parts = [];
      const seen = {};
      const keys = [];
      if (preferKeys && preferKeys.length) {
        preferKeys.forEach(function (k) {
          if (obj[k] != null && obj[k] !== '' && !seen[k]) { keys.push(k); seen[k] = 1; }
        });
      }
      Object.keys(obj).forEach(function (k) {
        if (!seen[k]) { keys.push(k); seen[k] = 1; }
      });
      keys.forEach(function (k) {
        const lk = k.toLowerCase();
        if (lk === 'password' || lk.indexOf('password') >= 0 || lk === 'salt' || lk === 'hash' || lk === 'token') return;
        let v = obj[k];
        if (v == null || v === '') return;
        if (typeof v === 'object') {
          try { v = JSON.stringify(v); } catch (e) { v = String(v); }
          if (v.length > 300) v = v.slice(0, 300) + '…';
        }
        parts.push(k + '=' + v);
      });
      return parts.join(' | ');
    }

    function dumpArray(title, arr, preferKeys) {
      const lines = [];
      if (!Array.isArray(arr)) {
        lines.push(title + ': (не масив)');
        return lines;
      }
      lines.push(title + ' — записів: ' + arr.length);
      for (let i = 0; i < arr.length; i++) {
        lines.push('  [' + i + '] ' + lineItem(arr[i], preferKeys));
      }
      return lines;
    }

    function dumpObject(title, obj, skipKeys) {
      const lines = [];
      if (!isPlainObject(obj)) return lines;
      skipKeys = skipKeys || [];
      lines.push(title + ':');
      Object.keys(obj).forEach(function (k) {
        if (skipKeys.indexOf(k) >= 0) return;
        const v = obj[k];
        if (Array.isArray(v)) {
          lines.push.apply(lines, dumpArray('  ' + k, v, null));
        } else if (isPlainObject(v)) {
          try {
            const s = JSON.stringify(stripSecrets(v));
            lines.push('  ' + k + ': ' + (s.length > 800 ? s.slice(0, 800) + '…' : s));
          } catch (e) {
            lines.push('  ' + k + ': [object]');
          }
        } else if (v != null && v !== '') {
          lines.push('  ' + k + ': ' + v);
        }
      });
      return lines;
    }

    const lines = [];
    lines.push('## ПОВНІ живі дані NEXUS (localStorage)');
    lines.push('Повний зріз даних. Відповідай ТІЛЬКИ на їх основі. Не вигадуй записи.');
    lines.push('Паролі/секрети приховані. Знімок: ' + new Date().toISOString());

    // --- QUICK STATS (unambiguous labels; never confuse with similar words) ---
    (function addQuickStats() {
      const hr = safeParse('nexus_hr_ua_v2') || {};
      const emps = Array.isArray(hr.employees) ? hr.employees : [];
      const users = safeParse('nexus_users_v1');
      const fleet = safeParse('nexus_fleet_v1') || {};
      const inv = safeParse('nexus_inventory_v1');
      let invCount = 0;
      if (Array.isArray(inv)) invCount = inv.length;
      else if (inv && Array.isArray(inv.items)) invCount = inv.items.length;
      else if (inv && Array.isArray(inv.inventory)) invCount = inv.inventory.length;
      const proj = safeParse('nexus_projects_v1');
      const projList = proj && Array.isArray(proj.projects) ? proj.projects : (Array.isArray(proj) ? proj : []);
      const tasksDb = safeParse('nexus_tasks_v1');
      const tasks = tasksDb && Array.isArray(tasksDb.tasks) ? tasksDb.tasks : [];
      const docs = safeParse('nexus_documents_v1');
      let docCount = 0;
      if (Array.isArray(docs)) docCount = docs.length;
      else if (docs && Array.isArray(docs.documents)) docCount = docs.documents.length;
      else if (docs && Array.isArray(docs.items)) docCount = docs.items.length;

      // Заявки кабінету (відпустка тощо)
      let subs = safeParse('nexus_hr_request_submissions_v1');
      if (subs && !Array.isArray(subs) && Array.isArray(subs.items)) subs = subs.items;
      if (subs && !Array.isArray(subs) && Array.isArray(subs.submissions)) subs = subs.submissions;
      if (!Array.isArray(subs)) subs = [];
      const leaveLike = subs.filter(function (s) {
        const t = String((s && (s.title || s.name || s.type || '')) || '').toLowerCase();
        return /відпуст|отпуск|leave|vacation|holiday/.test(t);
      });

      // Відпустки/лікарняні всередині карток співробітників
      let leaveRecords = 0;
      let sickRecords = 0;
      emps.forEach(function (e) {
        (e.leaves || []).forEach(function (l) {
          const typ = String((l && (l.type || l.kind || '')) || '').toLowerCase();
          if (/sick|лікар|больн/.test(typ)) sickRecords++;
          else leaveRecords++;
        });
        if (Array.isArray(e.vacations)) leaveRecords += e.vacations.length;
      });

      lines.push('');
      lines.push('### ПІДСУМОК_ЧИСЕЛ (це не відповідь користувачу, а довідник — читай назви уважно)');
      lines.push('employees_in_hr_module=' + emps.length + '  // співробітники в «Кадровий облік»');
      lines.push('system_users=' + (Array.isArray(users) ? users.length : 0) + '  // облікові записи входу');
      lines.push('hr_cabinet_requests_total=' + subs.length + '  // УСІ заявки кабінету (відпустка, інші)');
      lines.push('hr_cabinet_requests_vacation=' + leaveLike.length + '  // з них заявки з «відпустк» у назві');
      lines.push('hr_employee_leave_records=' + leaveRecords + '  // записи відпусток у картках співробітників');
      lines.push('hr_employee_sick_records=' + sickRecords + '  // лікарняні в картках');
      lines.push('fleet_vehicles=' + ((fleet.vehicles || []).length) + '  // автомобілі (НЕ заявки)');
      lines.push('fleet_fuel_fillups=' + ((fleet.fuel || []).length) + '  // заправки паливом OKKO (НЕ заявки на відпустку!)');
      lines.push('fleet_fuel_cards=' + ((fleet.cards || []).length));
      lines.push('fleet_service_records=' + ((fleet.service || []).length));
      lines.push('inventory_items=' + invCount);
      lines.push('projects_count=' + projList.length);
      lines.push('tasks_count=' + tasks.length);
      lines.push('documents_count=' + docCount);
      lines.push('');
      lines.push('УВАГА для моделі: слово «заправка» = паливо в авто. Слово «заявка» = HR-заява (відпустка тощо). НЕ плутай fleet_fuel_fillups із заявками на відпустку.');

      if (subs.length) {
        lines.push('Список заявок кабінету (усі):');
        subs.forEach(function (s, i) {
          lines.push(
            (i + 1) + '. title=' + (s.title || s.name || '—') +
            ' | status=' + (s.status || '—') +
            ' | id=' + (s.id || '') +
            (s.createdAt || s.date ? ' | date=' + (s.createdAt || s.date) : '')
          );
        });
      } else {
        lines.push('Заявок у кабінеті (nexus_hr_request_submissions_v1): 0');
      }

      if (emps.length) {
        lines.push('Список співробітників (кадри):');
        emps.forEach(function (e, i) {
          lines.push(
            (i + 1) + '. ' +
            (e.fullName || [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ') || e.name || e.id || '—') +
            (e.position ? ' — ' + e.position : '') +
            (e.status ? ' [' + e.status + ']' : '')
          );
        });
      } else {
        lines.push('У модулі «Кадровий облік» 0 співробітників (employees=[]).');
        if (Array.isArray(users) && users.length) {
          lines.push('Облікові записи системи:');
          users.forEach(function (u, i) {
            lines.push((i + 1) + '. ' + (u.fullName || u.username || u.id) + ' | role=' + (u.role || '—'));
          });
        }
      }
    })();

    const allKeys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('nexus_') === 0) allKeys.push(k);
      }
    } catch (e) {}
    allKeys.sort();
    lines.push('Ключі nexus_*: ' + allKeys.join(', '));

    const users = safeParse('nexus_users_v1');
    const session = safeParse('nexus_session_v1');
    if (Array.isArray(users)) {
      lines.push('\n### Користувачі системи');
      lines.push.apply(lines, dumpArray('users', stripSecrets(users), [
        'id', 'username', 'fullName', 'role', 'modules', 'active', 'email', 'phone'
      ]));
    }
    if (session) {
      lines.push('\n### Сесія');
      lines.push(lineItem(stripSecrets(session), ['userId', 'expiresAt', 'loginAt']));
      if (Array.isArray(users) && session.userId) {
        const cur = users.find(function (u) { return u.id === session.userId; });
        if (cur) lines.push('Поточний користувач: ' + lineItem(stripSecrets(cur), ['id', 'username', 'fullName', 'role']));
      }
    }

    const hr = safeParse('nexus_hr_ua_v2');
    if (hr && isPlainObject(hr)) {
      lines.push('\n### Кадри (nexus_hr_ua_v2)');
      const emps = hr.employees || [];
      const deps = hr.departments || [];
      lines.push('Співробітників: ' + emps.length + ', відділів: ' + deps.length);
      lines.push.apply(lines, dumpArray('departments', deps, ['id', 'name', 'title', 'code', 'head']));
      lines.push.apply(lines, dumpArray('employees', emps, [
        'id', 'fullName', 'lastName', 'firstName', 'middleName', 'position', 'jobTitle',
        'departmentId', 'status', 'phone', 'email', 'projectIds', 'projectId',
        'hireDate', 'birthDate', 'taxId', 'address'
      ]));
      emps.forEach(function (e, idx) {
        if (Array.isArray(e.leaves) && e.leaves.length) {
          lines.push.apply(lines, dumpArray('  leaves of [' + idx + '] ' + empName(e), e.leaves, null));
        }
        if (Array.isArray(e.vacations) && e.vacations.length) {
          lines.push.apply(lines, dumpArray('  vacations of [' + idx + '] ' + empName(e), e.vacations, null));
        }
        if (e.contract && isPlainObject(e.contract)) {
          lines.push('  contract of [' + idx + '] ' + empName(e) + ': ' + lineItem(e.contract, null));
        }
      });
      Object.keys(hr).forEach(function (k) {
        if (k === 'employees' || k === 'departments') return;
        const v = hr[k];
        if (Array.isArray(v)) lines.push.apply(lines, dumpArray(k, v, null));
        else if (v != null && typeof v !== 'object') lines.push(k + ': ' + v);
        else if (isPlainObject(v)) {
          try { lines.push(k + ': ' + JSON.stringify(v)); } catch (e) {}
        }
      });
    }

    ['nexus_hr_requests_v1', 'nexus_hr_request_submissions_v1'].forEach(function (key) {
      const d = safeParse(key);
      if (d == null) return;
      lines.push('\n### ' + key);
      if (Array.isArray(d)) lines.push.apply(lines, dumpArray(key, d, null));
      else if (isPlainObject(d)) lines.push.apply(lines, dumpObject(key, d, []));
      else lines.push(String(d));
    });

    const inv = safeParse('nexus_inventory_v1');
    if (inv != null) {
      lines.push('\n### Інвентар (nexus_inventory_v1)');
      if (Array.isArray(inv)) lines.push.apply(lines, dumpArray('items', inv, null));
      else if (isPlainObject(inv)) {
        const items = inv.items || inv.inventory || [];
        if (Array.isArray(items)) lines.push.apply(lines, dumpArray('items', items, [
          'id', 'name', 'title', 'invNumber', 'number', 'category', 'responsible', 'owner', 'qty', 'quantity', 'location', 'status'
        ]));
        lines.push.apply(lines, dumpObject('inventory meta', inv, ['items', 'inventory']));
      }
    }

    const fleet = safeParse('nexus_fleet_v1');
    if (fleet && isPlainObject(fleet)) {
      lines.push('\n### Автопарк / паливо / сервіс (nexus_fleet_v1)');
      lines.push.apply(lines, dumpArray('vehicles', fleet.vehicles || [], [
        'id', 'plate', 'make', 'model', 'year', 'vin', 'status', 'color', 'driver', 'driverName', 'driverId',
        'fuel', 'consumption', 'inv', 'value', 'notes'
      ]));
      lines.push.apply(lines, dumpArray('fuel', fleet.fuel || [], [
        'id', 'date', 'vehicleId', 'vehId', 'plate', 'liters', 'amount', 'sum', 'card', 'cardNumber', 'station', 'odometer', 'notes'
      ]));
      lines.push.apply(lines, dumpArray('cards', fleet.cards || [], null));
      lines.push.apply(lines, dumpArray('service', fleet.service || [], null));
      lines.push.apply(lines, dumpObject('fleet meta', fleet, ['vehicles', 'fuel', 'cards', 'service']));
    }

    const docs = safeParse('nexus_documents_v1');
    if (docs != null) {
      lines.push('\n### Документи (nexus_documents_v1)');
      if (Array.isArray(docs)) lines.push.apply(lines, dumpArray('documents', docs, null));
      else if (isPlainObject(docs)) {
        const list = docs.documents || docs.items || docs.list || [];
        if (Array.isArray(list)) lines.push.apply(lines, dumpArray('documents', list, null));
        lines.push.apply(lines, dumpObject('documents root', docs, ['documents', 'items', 'list']));
      }
    }

    const proj = safeParse('nexus_projects_v1');
    if (proj != null) {
      lines.push('\n### Проекти (nexus_projects_v1)');
      const list = isPlainObject(proj) ? (proj.projects || []) : (Array.isArray(proj) ? proj : []);
      lines.push.apply(lines, dumpArray('projects', list, null));
      if (isPlainObject(proj)) lines.push.apply(lines, dumpObject('projects root', proj, ['projects']));
    }

    const tasksDb = safeParse('nexus_tasks_v1');
    if (tasksDb != null) {
      lines.push('\n### Задачі (nexus_tasks_v1)');
      const tasks = isPlainObject(tasksDb) ? (tasksDb.tasks || []) : (Array.isArray(tasksDb) ? tasksDb : []);
      lines.push.apply(lines, dumpArray('tasks', tasks, null));
      if (isPlainObject(tasksDb)) lines.push.apply(lines, dumpObject('tasks root', tasksDb, ['tasks']));
    }

    const fin = safeParse('nexus_finance_v1');
    if (fin != null) {
      lines.push('\n### Фінанси (nexus_finance_v1)');
      if (Array.isArray(fin)) lines.push.apply(lines, dumpArray('operations', fin, null));
      else if (isPlainObject(fin)) {
        const ops = fin.operations || fin.transactions || fin.items || [];
        if (Array.isArray(ops)) lines.push.apply(lines, dumpArray('operations', ops, null));
        lines.push.apply(lines, dumpObject('finance root', fin, ['operations', 'transactions', 'items']));
      }
    }

    const crm = safeParse('nexus_crm_v1');
    if (crm != null) {
      lines.push('\n### CRM (nexus_crm_v1)');
      if (Array.isArray(crm)) lines.push.apply(lines, dumpArray('clients', crm, null));
      else if (isPlainObject(crm)) {
        const clients = crm.clients || crm.companies || [];
        if (Array.isArray(clients)) lines.push.apply(lines, dumpArray('clients', clients, null));
        lines.push.apply(lines, dumpObject('crm root', crm, ['clients', 'companies']));
      }
    }

    const wh = safeParse('nexus_warehouse_v1');
    if (wh != null) {
      lines.push('\n### Склад (nexus_warehouse_v1)');
      if (Array.isArray(wh)) lines.push.apply(lines, dumpArray('stock', wh, null));
      else if (isPlainObject(wh)) {
        const items = wh.items || wh.stock || wh.products || [];
        if (Array.isArray(items)) lines.push.apply(lines, dumpArray('stock', items, null));
        lines.push.apply(lines, dumpObject('warehouse root', wh, ['items', 'stock', 'products']));
      }
    }

    const cal = safeParse('nexus_calendar_v1');
    if (cal != null) {
      lines.push('\n### Календар (nexus_calendar_v1)');
      if (Array.isArray(cal)) lines.push.apply(lines, dumpArray('events', cal, null));
      else if (isPlainObject(cal)) {
        const ev = cal.events || cal.items || [];
        if (Array.isArray(ev)) lines.push.apply(lines, dumpArray('events', ev, null));
        lines.push.apply(lines, dumpObject('calendar root', cal, ['events', 'items']));
      }
    }

    const mail = safeParse('nexus_mail_v1');
    if (mail != null) {
      lines.push('\n### Пошта (nexus_mail_v1)');
      if (Array.isArray(mail)) lines.push.apply(lines, dumpArray('mail', mail, null));
      else if (isPlainObject(mail)) lines.push.apply(lines, dumpObject('mail', mail, []));
    }

    const notif = safeParse('nexus_notifications_v1');
    if (notif != null) {
      lines.push('\n### Сповіщення');
      if (Array.isArray(notif)) lines.push.apply(lines, dumpArray('notifications', notif, null));
      else lines.push(JSON.stringify(notif));
    }

    const audit = safeParse('nexus_audit_v1');
    if (audit != null) {
      lines.push('\n### Аудит (повний журнал)');
      if (Array.isArray(audit)) lines.push.apply(lines, dumpArray('audit', audit, null));
      else lines.push(String(typeof audit === 'string' ? audit : JSON.stringify(audit)));
    }

    const covered = {
      nexus_users_v1: 1, nexus_session_v1: 1, nexus_hr_ua_v2: 1,
      nexus_hr_requests_v1: 1, nexus_hr_request_submissions_v1: 1,
      nexus_inventory_v1: 1, nexus_fleet_v1: 1, nexus_documents_v1: 1,
      nexus_projects_v1: 1, nexus_tasks_v1: 1, nexus_finance_v1: 1,
      nexus_crm_v1: 1, nexus_warehouse_v1: 1, nexus_calendar_v1: 1,
      nexus_mail_v1: 1, nexus_notifications_v1: 1, nexus_audit_v1: 1,
      nexus_ai_assistant_v02: 1, nexus_ai_assistant_pref: 1,
      nexus_theme_v1: 1, nexus_lang_v1: 1, nexus_onboarding_hide: 1
    };
    allKeys.forEach(function (key) {
      if (covered[key]) return;
      const d = safeParse(key);
      if (d == null) return;
      lines.push('\n### Інше: ' + key);
      try {
        const cleaned = stripSecrets(d);
        const s = typeof cleaned === 'string' ? cleaned : JSON.stringify(cleaned);
        lines.push(s.length > 80000 ? s.slice(0, 80000) + '\n[…дуже великий ключ обрізано]' : s);
      } catch (e) {
        lines.push('[не вдалося серіалізувати]');
      }
    });

    try {
      if (window.NexusCore && typeof NexusCore.getStorageStats === 'function') {
        const st = NexusCore.getStorageStats();
        lines.push('\n### Сховище: ~' + (st.mb != null ? st.mb + ' МБ' : st.kb + ' КБ') + ', ключів: ' + st.keys + ', ' + st.pct + '%');
      }
    } catch (e) {}

    let text = lines.join('\n');
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + '\n\n[…контекст обрізано до ' + maxChars + ' символів через ліміт моделі. Уточніть модуль.]';
    }
    return text;
  }

  function offlineReply(text) {
    const q = normalize(text);
    if (!q) return 'Напишіть питання або оберіть швидку тему нижче.';
    let best = null;
    let bestScore = 0;
    KB.forEach(function (item) {
      let score = 0;
      item.keys.forEach(function (k) {
        if (q.includes(normalize(k))) score += k.length > 4 ? 2 : 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });
    if (best && bestScore > 0) return best.answer;
    return (
      'Не знайшов точної відповіді в офлайн-базі.\nСпробуйте інакше, наприклад:\n• «імпорт OKKO»\n• «додати сервіс»\n• «трудовий договір»\n• «ролі доступу»\n\n' +
      pageHint()
    );
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function savePrefs(p) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(p));
    } catch (e) {}
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { messages: [], api: [] };
      const d = JSON.parse(raw);
      return { messages: d.messages || [], api: d.api || [] };
    } catch (e) {
      return { messages: [], api: [] };
    }
  }
  function saveHistory(messages, api) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages, api: api, savedAt: Date.now() })
      );
    } catch (e) {}
  }

  // ---------- Markdown (optional CDN) ----------
  let mdReady = false;
  function ensureMarkdown(cb) {
    if (mdReady || (window.marked && window.DOMPurify)) {
      mdReady = true;
      cb();
      return;
    }
    if (window.__nxaMdLoading) {
      window.__nxaMdLoading.push(cb);
      return;
    }
    window.__nxaMdLoading = [cb];
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js';
    s1.onload = function () {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js';
      s2.onload = function () {
        mdReady = true;
        (window.__nxaMdLoading || []).forEach(function (fn) {
          try {
            fn();
          } catch (e) {}
        });
        window.__nxaMdLoading = null;
      };
      s2.onerror = function () {
        mdReady = false;
        (window.__nxaMdLoading || []).forEach(function (fn) {
          try {
            fn();
          } catch (e) {}
        });
        window.__nxaMdLoading = null;
      };
      document.head.appendChild(s2);
    };
    s1.onerror = function () {
      mdReady = false;
      (window.__nxaMdLoading || []).forEach(function (fn) {
        try {
          fn();
        } catch (e) {}
      });
      window.__nxaMdLoading = null;
    };
    document.head.appendChild(s1);
  }

  function renderMd(text) {
    if (window.marked && window.DOMPurify) {
      try {
        if (window.marked.setOptions) {
          window.marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
        }
        const raw = window.marked.parse(text || '');
        return window.DOMPurify.sanitize(raw, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'del', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'
          ]
        });
      } catch (e) {}
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- main mount ----------

  // ---------- Agent actions (create leave requests etc.) ----------
  function parseRuUaDate(s) {
    s = String(s || '').trim();
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    return null;
  }

  function extractLeaveIntent(text) {
    const t = String(text || '');
    const low = t.toLowerCase();
    const isLeave =
      /(створ|создай|створити|создать|оформи|завед).{0,40}(заявк|заявлен).{0,40}(відпуст|отпуск)/i.test(t) ||
      /(заявк|заявлен).{0,40}(відпуст|отпуск)/i.test(t) && /(створ|создай|оформи)/i.test(t) ||
      /відпустк.{0,20}з\s+\d/i.test(t) ||
      /отпуск.{0,20}с\s+\d/i.test(t);
    if (!isLeave) return null;

    // dates: from X to Y / с X по Y / з X до Y
    let from = null, to = null;
    let m = t.match(/(?:з|с|from)\s+(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})\s*(?:по|до|to|-|—)\s*(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (m) {
      from = parseRuUaDate(m[1]);
      to = parseRuUaDate(m[2]);
    } else {
      const all = t.match(/\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2}/g) || [];
      if (all.length >= 2) {
        from = parseRuUaDate(all[0]);
        to = parseRuUaDate(all[1]);
      }
    }
    const submit =
      /(відправ|отправ|погоджен|одобрен|approval|pm|менеджер|директор)/i.test(t);
    const forceApprove =
      /(схвал|одобри|force).{0,30}(директор|адмін|admin|повністю)/i.test(t);

    return { dateFrom: from, dateTo: to, submit: !!submit, forceApprove: !!forceApprove };
  }

  function tryExecuteLeaveAction(userText) {
    const intent = extractLeaveIntent(userText);
    if (!intent) return null;
    if (!intent.dateFrom || !intent.dateTo) {
      return {
        ok: false,
        message:
          'Зрозумів, що потрібна заявка на відпустку, але не розпізнав дати. Напишіть у форматі: з 01.12.2026 до 10.12.2026'
      };
    }
    if (!window.CabRequests || typeof window.CabRequests.createVacationRequest !== 'function') {
      return {
        ok: false,
        message:
          'Модуль заявок кабінету ще не завантажено на цій сторінці. Відкрийте головну (index.html) або кабінет і спробуйте знову.'
      };
    }
    try {
      const res = window.CabRequests.createVacationRequest({
        dateFrom: intent.dateFrom,
        dateTo: intent.dateTo,
        submit: intent.submit,
        forceApprove: intent.forceApprove
      });
      return res;
    } catch (e) {
      return { ok: false, message: 'Помилка створення заявки: ' + (e && e.message ? e.message : e) };
    }
  }

  function parseNexusActionBlocks(text) {
    const actions = [];
    const re = /```nexus_action\s*([\s\S]*?)```/gi;
    let m;
    while ((m = re.exec(String(text || '')))) {
      try {
        const obj = JSON.parse(m[1].trim());
        if (obj && obj.action) actions.push(obj);
      } catch (e) {}
    }
    return actions;
  }

  function runNexusActions(actions) {
    const results = [];
    (actions || []).forEach(function (a) {
      if (a.action === 'create_leave_request' || a.action === 'create_vacation_request') {
        if (!window.CabRequests || !window.CabRequests.createVacationRequest) {
          results.push({ ok: false, message: 'CabRequests недоступний на цій сторінці' });
          return;
        }
        try {
          results.push(
            window.CabRequests.createVacationRequest({
              dateFrom: a.dateFrom || a.from,
              dateTo: a.dateTo || a.to,
              title: a.title,
              text: a.text,
              submit: !!a.submit,
              forceApprove: !!a.forceApprove
            })
          );
        } catch (e) {
          results.push({ ok: false, message: String(e && e.message ? e.message : e) });
        }
      }
    });
    return results;
  }

  function mount() {
    if (document.getElementById('nxa-root')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'nexus-assistant.css';
    document.head.appendChild(link);

    ensureMarkdown(function () {});

    const prefs = loadPrefs();
    let preferAi = prefs.preferAi !== false; // default try AI
    let aiOnline = false;
    let isLoading = false;
    let abortController = null;
    let history = loadHistory();
    let uiMessages = history.messages.slice();
    let apiMessages = history.api.slice();

    const root = el('div', null);
    root.id = 'nxa-root';

    const btn = el('button', 'nxa-btn');
    btn.type = 'button';
    btn.title = 'Помічник NEXUS AI';
    btn.textContent = '💬';
    btn.setAttribute('aria-label', 'Відкрити помічника');

    const panel = el('div', 'nxa-panel');
    panel.innerHTML =
      '<div class="nxa-head" id="nxa-head">' +
        '<div><div class="nxa-head-title">NEXUS AI</div>' +
        '<div class="nxa-head-sub" id="nxa-sub">Запуск NEXUS AI v0.2…</div></div>' +
        '<div class="nxa-head-actions">' +
          '<button type="button" class="nxa-icon-btn" id="nxa-new" title="Новий діалог">✨</button>' +
          '<button type="button" class="nxa-icon-btn" id="nxa-refresh" title="Оновити моделі">🔄</button>' +
          '<button type="button" class="nxa-icon-btn nxa-x" aria-label="Закрити">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="nxa-toolbar" id="nxa-toolbar">' +
        '<label>Модель</label>' +
        '<select id="nxa-model"><option value="">—</option></select>' +
        '<button type="button" class="nxa-mode-toggle" id="nxa-mode" title="Перемкнути режим">AI</button>' +
      '</div>' +
      '<div class="nxa-msgs" id="nxa-msgs"></div>' +
      '<div class="nxa-quick" id="nxa-quick"></div>' +
      '<div class="nxa-input-row">' +
        '<textarea class="nxa-input" id="nxa-input" rows="1" placeholder="Напишіть питання…"></textarea>' +
        '<button type="button" class="nxa-send" id="nxa-send" title="Надіслати">▶</button>' +
        '<button type="button" class="nxa-stop" id="nxa-stop" title="Зупинити">⏹</button>' +
      '</div>' +
      '<div class="nxa-status" id="nxa-status">Локальний помічник</div>';

    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    const head = panel.querySelector('#nxa-head');
    const sub = panel.querySelector('#nxa-sub');
    const msgs = panel.querySelector('#nxa-msgs');
    const quick = panel.querySelector('#nxa-quick');
    const input = panel.querySelector('#nxa-input');
    const send = panel.querySelector('#nxa-send');
    const stop = panel.querySelector('#nxa-stop');
    const close = panel.querySelector('.nxa-x');
    const modelSelect = panel.querySelector('#nxa-model');
    const modeBtn = panel.querySelector('#nxa-mode');
    const statusEl = panel.querySelector('#nxa-status');
    const newBtn = panel.querySelector('#nxa-new');
    const refreshBtn = panel.querySelector('#nxa-refresh');

    QUICK.forEach(function (item) {
      const c = el('button', 'nxa-chip');
      c.type = 'button';
      c.textContent = item.label;
      c.onclick = function () {
        input.value = item.q;
        ask(item.q);
      };
      quick.appendChild(c);
    });

    function setStatus(t) {
      statusEl.textContent = t || '';
    }

    function updateModeUI() {
      const useAi = preferAi && aiOnline;
      if (useAi) {
        head.classList.add('ai-mode');
        btn.classList.add('ai-online');
        sub.textContent = 'NEXUS AI v0.2 · локально';
        modeBtn.textContent = 'AI';
        modeBtn.classList.add('active');
        modeBtn.title = 'Зараз: NEXUS AI v0.2. Клік — лише офлайн-підказки';
      } else {
        head.classList.remove('ai-mode');
        btn.classList.remove('ai-online');
        sub.textContent = aiOnline
          ? 'Офлайн-підказки (AI вимкнено)'
          : 'Офлайн-підказки · AI-ядро недоступне';
        modeBtn.textContent = 'KB';
        modeBtn.classList.remove('active');
        modeBtn.title = aiOnline
          ? 'Зараз: офлайн-база. Клік — увімкнути AI'
          : 'NEXUS AI v0.2 недоступний';
      }
    }

    function renderAll() {
      msgs.innerHTML = '';
      if (!uiMessages.length) {
        const welcome = el('div', 'nxa-msg bot');
        welcome.innerHTML = renderMd(
          'Привіт! Я **NEXUS AI**.\n\n' +
            pageHint() +
            '\n\nОберіть тему нижче або напишіть питання. У режимі **NEXUS AI v0.2** відповім через локальне AI-ядро.'
        );
        msgs.appendChild(welcome);
        return;
      }
      uiMessages.forEach(function (m) {
        const d = el('div', 'nxa-msg ' + (m.role === 'user' ? 'user' : 'bot'));
        if (m.role === 'user') d.textContent = m.content;
        else d.innerHTML = renderMd(m.content);
        msgs.appendChild(d);
      });
      msgs.scrollTop = msgs.scrollHeight;
    }

    function persist() {
      saveHistory(uiMessages, apiMessages);
    }

    function open() {
      panel.classList.add('open');
      btn.classList.add('open');
      btn.textContent = '×';
      input.focus();
    }
    function hide() {
      panel.classList.remove('open');
      btn.classList.remove('open');
      btn.textContent = '💬';
    }

    async function fetchModels() {
      try {
        setStatus('Отримання моделей…');
        const ac = new AbortController();
        const to = setTimeout(function () { ac.abort(); }, 4000);
        let res;
        try {
          res = await fetch(AI_TAGS, { signal: ac.signal });
        } finally {
          clearTimeout(to);
        }
        if (!res.ok) throw new Error('fail');
        const data = await res.json();
        modelSelect.innerHTML = '';
        if (!data.models || !data.models.length) {
          modelSelect.innerHTML = '<option value="">Немає моделей</option>';
          aiOnline = true;
          setStatus('AI-ядро є, але моделей немає. Завантажте модель у NEXUS AI runtime.');
        } else {
          data.models.forEach(function (m) {
            const o = document.createElement('option');
            o.value = m.name;
            o.textContent = m.name;
            modelSelect.appendChild(o);
          });
          if (prefs.model && [...modelSelect.options].some(function (o) { return o.value === prefs.model; })) {
            modelSelect.value = prefs.model;
          }
          aiOnline = true;
          setStatus('NEXUS AI v0.2 · ' + data.models.length + ' моделей');
        }
      } catch (e) {
        aiOnline = false;
        modelSelect.innerHTML = '<option value="">AI offline</option>';
        setStatus('NEXUS AI v0.2 недоступний — офлайн-база підказок');
      }
      updateModeUI();
    }

    async function streamAi(userText) {
      const model = modelSelect.value;
      if (!model) {
        setStatus('Оберіть модель');
        return;
      }

      uiMessages.push({ role: 'user', content: userText });
      apiMessages.push({ role: 'user', content: userText });
      renderAll();
      persist();

      isLoading = true;
      send.style.display = 'none';
      stop.style.display = 'flex';
      input.disabled = true;

      const typing = el('div', 'nxa-typing');
      typing.innerHTML =
        '<span class="nxa-dot"></span><span class="nxa-dot"></span><span class="nxa-dot"></span><span style="margin-left:6px">Думаю…</span>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;

      abortController = new AbortController();
      let full = '';
      const streamDiv = el('div', 'nxa-msg bot nxa-streaming');
      streamDiv.textContent = '';

      try {
        setStatus('Збір даних NEXUS…');
        let dataCtx = '';
        try {
          dataCtx = buildNexusDataContext(60000);
        } catch (e) {
          console.warn('buildNexusDataContext', e);
          dataCtx = '(не вдалося зібрати повні дані: ' + (e && e.message ? e.message : e) + ')';
        }
        var empHint = 0;
        try {
          var hrTmp = JSON.parse(localStorage.getItem('nexus_hr_ua_v2') || '{}');
          empHint = (hrTmp.employees && hrTmp.employees.length) || 0;
        } catch (e) {}
        setStatus('Дані зібрано · співробітників у кадрах: ' + empHint + ' · запит…');

        async function doChat(sysContent, useStream) {
          const payload = {
            model: model,
            messages: (function () {
              const statsMatch = dataCtx && dataCtx.match(/### ПІДСУМОК[\s\S]*?(?=\n### |\nКлючі |$)/);
              const statsBlock = statsMatch ? statsMatch[0] : (dataCtx ? dataCtx.slice(0, 2500) : '');
              const api = apiMessages.map(function (m, idx) {
                if (idx === apiMessages.length - 1 && m.role === 'user' && statsBlock) {
                  return {
                    role: 'user',
                    content: m.content + '\n\n---\n[Службові дані NEXUS — використовуй обовʼязково]\n' + statsBlock
                  };
                }
                return m;
              });
              return [{ role: 'system', content: sysContent }].concat(api);
            })(),
            temperature: 0.7,
            stream: !!useStream
          };
          const res = await fetch(AI_CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController.signal
          });
          return res;
        }

                let sysContent = SYSTEM_PROMPT.content + '\n\n' + dataCtx;
        // Soft limit: huge prompts freeze small models / browser
        if (sysContent.length > 100000) {
          setStatus('Дані дуже великі — скорочую…');
          try { dataCtx = buildNexusDataContext(20000); } catch (e) { dataCtx = ''; }
          sysContent = SYSTEM_PROMPT.content + (dataCtx ? '\n\n' + dataCtx : '');
        }
        setStatus('NEXUS AI v0.2 думає… (' + Math.round(sysContent.length / 1000) + 'k символів контексту)');
        let res = await doChat(sysContent, true);
        // If context too large or server error — retry with smaller / no data
        if (!res.ok) {
          let errBody = '';
          try { errBody = await res.text(); } catch (e) {}
          let errMsg = 'Помилка ' + res.status;
          try {
            const j = JSON.parse(errBody);
            errMsg = (j.error && (j.error.message || j.error)) || j.message || errMsg;
          } catch (e) {
            if (errBody) errMsg = errBody.slice(0, 300);
          }
          const tooBig = res.status === 400 || res.status === 500 || /context|length|token|too long|overflow/i.test(String(errMsg));
          if (tooBig && dataCtx) {
            setStatus('Контекст завеликий — стискаю дані…');
            try { dataCtx = buildNexusDataContext(12000); } catch (e) { dataCtx = ''; }
            sysContent = SYSTEM_PROMPT.content + (dataCtx ? '\n\n' + dataCtx : '');
            res = await doChat(sysContent, true);
          }
          if (!res.ok) {
            let err2 = errMsg;
            try {
              const t = await res.text();
              const j = JSON.parse(t);
              err2 = (j.error && (j.error.message || j.error)) || j.message || t.slice(0, 300) || err2;
            } catch (e) {}
            throw new Error(err2);
          }
        }

        typing.remove();
        msgs.appendChild(streamDiv);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
                if (delta) {
                  full += delta;
                  streamDiv.textContent = full;
                  msgs.scrollTop = msgs.scrollHeight;
                }
              } catch (e) {}
            }
          }
        }

        streamDiv.classList.remove('nxa-streaming');
        if (!full) {
          // Fallback: non-streaming request (some setups fail on stream)
          setStatus('Повтор без стрімінгу…');
          const res2 = await doChat(sysContent, false);
          if (res2.ok) {
            const data2 = await res2.json();
            full = (data2.choices && data2.choices[0] && data2.choices[0].message && data2.choices[0].message.content) || '';
          }
        }
        
        let finalText = full || '(порожня відповідь — перевірте, що модель завантажена в NEXUS AI runtime)';
        const acts = parseNexusActionBlocks(finalText);
        if (acts.length) {
          const results = runNexusActions(acts);
          results.forEach(function (r) {
            finalText += '\n\n' + (r.ok ? '✅ ' + (r.message || 'OK') : '⚠️ ' + (r.message || r.error || 'Помилка'));
          });
          // strip action fences from visible text
          finalText = finalText.replace(/```nexus_action[\s\S]*?```/gi, '').trim();
        }
        streamDiv.innerHTML = renderMd(finalText);
        uiMessages.push({ role: 'assistant', content: finalText });
        apiMessages.push({ role: 'assistant', content: finalText });
        persist();
        setStatus('Готово');
        prefs.model = model;
        savePrefs(prefs);
      } catch (err) {
        typing.remove();
        if (streamDiv.parentNode) streamDiv.remove();
        if (err.name === 'AbortError') {
          if (full) {
            const t = full + '\n\n*[Зупинено]*';
            uiMessages.push({ role: 'assistant', content: t });
            apiMessages.push({ role: 'assistant', content: t });
            persist();
            renderAll();
          }
          setStatus('Зупинено');
        } else {
          let msg = err.message || String(err);
          if (msg === 'Failed to fetch') {
            msg = "Немає зв'язку з NEXUS AI v0.2. Переконайтеся, що локальне AI-ядро запущене і дозволено доступ з браузера.";
            aiOnline = false;
            updateModeUI();
          }
          uiMessages.push({ role: 'assistant', content: '⚠️ ' + msg });
          persist();
          renderAll();
          setStatus('Помилка');
        }
      } finally {
        isLoading = false;
        abortController = null;
        send.style.display = 'flex';
        stop.style.display = 'none';
        input.disabled = false;
        input.focus();
        msgs.scrollTop = msgs.scrollHeight;
      }
    }

    function askOffline(userText) {
      uiMessages.push({ role: 'user', content: userText });
      const answer = offlineReply(userText);
      uiMessages.push({ role: 'assistant', content: answer });
      // offline does not pollute LLM history
      persist();
      renderAll();
      setStatus('Офлайн-відповідь');
    }

    function ask(text) {
      const q = String(text || '').trim();
      if (!q || isLoading) return;
      input.value = '';
      input.style.height = 'auto';

      // Agent: local leave-request intent (works even offline)
      const leaveRes = tryExecuteLeaveAction(q);
      if (leaveRes) {
        uiMessages.push({ role: 'user', content: q });
        const msg = leaveRes.ok
          ? '✅ ' + (leaveRes.message || 'Заявку створено.') +
            (leaveRes.id ? '\n\nID: `' + leaveRes.id + '` · статус: **' + leaveRes.status + '**' : '') +
            '\n\nВідкрийте **Мій кабінет → Мої заявки**, щоб переглянути або надрукувати.'
          : '⚠️ ' + (leaveRes.message || leaveRes.error || 'Не вдалося створити заявку');
        uiMessages.push({ role: 'assistant', content: msg });
        persist();
        renderAll();
        setStatus(leaveRes.ok ? 'Заявку створено через NEXUS AI' : 'Помилка заявки');
        // Optionally still ask AI to explain — skip for clarity
        return;
      }

      const useAi = preferAi && aiOnline && modelSelect.value;
      if (useAi) streamAi(q);
      else askOffline(q);
    }

    function newChat() {
      if (isLoading) return;
      uiMessages = [];
      apiMessages = [];
      persist();
      renderAll();
      setStatus('Новий діалог');
    }

    // events
    btn.onclick = function () {
      panel.classList.contains('open') ? hide() : open();
    };
    close.onclick = hide;
    send.onclick = function () {
      ask(input.value);
    };
    stop.onclick = function () {
      if (abortController) abortController.abort();
    };
    newBtn.onclick = newChat;
    refreshBtn.onclick = fetchModels;
    modeBtn.onclick = function () {
      if (!aiOnline) {
        fetchModels();
        return;
      }
      preferAi = !preferAi;
      prefs.preferAi = preferAi;
      savePrefs(prefs);
      updateModeUI();
    };
    modelSelect.onchange = function () {
      prefs.model = modelSelect.value;
      savePrefs(prefs);
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ask(input.value);
      }
      if (e.key === 'Escape' && isLoading) {
        if (abortController) abortController.abort();
      }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });

    renderAll();
    fetchModels();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.NexusAssistant = {
    __v: '0.2',
    reply: offlineReply,
    mount: mount
  };
})();
