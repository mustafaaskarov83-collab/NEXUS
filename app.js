/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING HR
   Версія проєкту визначається в ОДНОМУ місці — константі APP_VERSION.
   ═══════════════════════════════════════════════════════════════════════ */

const APP_VERSION='5.0.0';

const LANG = {
uk:{brand:'Кадровий облік',
login:'Вхід до системи',loginH:'Введіть облікові дані',setup:'Перше налаштування',setupH:'Створіть обліковий запис адміністратора',
user:"Ім'я користувача",pwd:'Пароль',pwdC:'Підтвердіть пароль',loginB:'Увійти',setupB:'Створити адміністратора',
logout:'Вийти',chPwd:'Змінити пароль',users:'Користувачі',usersH:'Керування доступом',addU:'Додати користувача',
role:'Роль',roleA:'Адміністратор',roleM:'Менеджер',roleV:'Перегляд',you:'ви',
errInv:"Невірне ім'я або пароль",errShort:'Мінімум 6 символів',errMatch:'Паролі не збігаються',
errExist:'Користувач існує',errFill:'Заповніть поля',errUL:'Логін мінімум 3 символи',
errUC:'Тільки латиниця, цифри, _ . -',errLastA:'Не можна видалити останнього адміна',
errSelf:'Не можна видалити себе',errCur:'Невірний поточний пароль',
okPwd:'Пароль змінено',okAddU:'Користувача додано',okDelU:'Користувача видалено',
confDelU:'Видалити "{name}"?',expired:'Сесія завершена',denied:'Недостатньо прав',
navDash:'Панель',navEmp:'Співробітники',navImp:'Імпорт Excel',navCalc:'Розрахунок',navLaws:'Законодавство',navSet:'Налаштування',
dashT:'Загальна статистика',dashS:'Огляд станом на',upc:'Найближчі відпустки',
sEmp:'Всього',sEarn:'Зароблено днів',sUsed:'Використано',sLeft:'Залишок',sLeave:'У відпустці',
noUpc:'Немає запланованих відпусток',
addT:'Додати співробітника',name:'ПІБ',pos:'Посада',hire:'Дата прийняття',birth:'Дата народження',
cat:'Категорія',leave:'Відпустка (к.д.)',addB:'Додати',demoB:'Демо-дані',listT:'Список співробітників',
noEmp:'Співробітників немає',noFind:'Нічого не знайдено',
c1:'Звичайна (24 к.д.)',c2:'Інвалідність I–II (30 к.д.)',c3:'Інвалідність III (26 к.д.)',c4:'Неповнолітній (31 к.д.)',c5:'Педагог (56 к.д.)',
tName:'ПІБ',tPos:'Посада',tHire:'Прийнято',tLeave:'Відпустка',tEarn:'Зароблено',tUsed:'Використано',
tLeft:'Залишок',tStat:'Статус',tCard:'Картка',tEmp:'Співробітник',tStart:'Початок',tEnd:'Кінець',tDays:'Днів',
stOk:'ОК',stAcc:'Накопичення',stViol:'⚠ Порушення',
impT:'Імпорт персоналу з Excel',impS:'Формати .xlsx, .xls, .csv',dropT:'Перетягніть Excel-файл',
dropH:'або натисніть для вибору',cols:'Колонки: ПІБ, Посада, Дата прийняття, Дата народження, Відпустка, Категорія.',
tpl:'📥 Шаблон Excel',expT:'Експорт даних',expX:'📊 Excel',expJ:'💾 JSON',impJ:'📥 Імпорт JSON',
reading:'⏳ Читання...',imported:'✅ Імпортовано: {n}',skip:'Пропущено: {n}.',warns:'⚠️ Попередження:',
impErr:'❌ Помилка: {msg}',impReadErr:'Не вдалося прочитати',preview:'Передпросмотр:',
rowErr:'Рядок {n}: дата «{val}»',fileEmpty:'Файл порожній',noCols:'Не знайдено колонки ПІБ',
noValid:'Немає коректних рядків.',
calcT:'Калькулятор відпускних',calcS:'Порядок № 100',cEmp:'Співробітник',cStart:'Дата початку',
cDays:'Днів',cB:'Розрахувати',cSel:'— виберіть —',cPer:'Розрахунковий період',cTotal:'Сума виплат',
cCal:'Календарних днів',cHol:'Святкових днів',cCalc:'Днів для розрахунку',cAvg:'Середньоденна',
cPay:'Відпускні за {n} к.д.',cur:'грн',
compT:'Компенсація при звільненні',mDate:'Дата звільнення',mEarn:'Зароблено днів',mUsed:'Використано',
mDays:'Днів для компенсації',mComp:'Компенсація',
lawsT:'Офіційні джерела',lawsS:'Портал ВРУ',checkB:'🔍 Перевірити',refT:'Довідник норм',
refS:'Ключові норми',nN:'Норма',nV:'Значення',nB:'Підстава',
l504:'Закон «Про відпустки»',l504d:'Всі види відпусток',lkz:'КЗпП України',lkzd:'Загальні норми',
lp100:'Порядок № 100',lp100d:'Середня зарплата',l2136:'Воєнний стан',l2136d:'Спецправила',
l2352:'Оптимізація',l2352d:'Зміни 2022–2026',lportal:'Портал ВРУ',lportald:'CSV, JSON, XML',
n1:'Мінімальна щорічна',n2:'Інвалідність I–II',n3:'Інвалідність III',n4:'Неповнолітні',
n5:'Педагоги',n6:'Максимальна',n7:'Мінімальна безперервна',n8:'Перший рік',n8v:'після 6 міс.',
n9:'Розрахунковий період',n9v:'12 міс.',n10:'Без ЗП у стажі',n10v:'до 15 к.д./рік',
b6:'ст. 6 Закону № 504/96-ВР',b10:'ст. 10',b12:'ст. 12',b25:'ст. 25–26',bp100:'п. 2 Порядку № 100',
setT:'Загальні налаштування',setBase:'Базова відпустка (к.д.)',setMode:'Режим свят',
setM1:'Воєнний стан — святкові не виключаються',setM2:'Мирний час — святкові виключаються',
setSave:'Зберегти',setMil:'Під час воєнного стану ст. 73 КЗпП не застосовується.',
holT:'Святкові дні',holS:'Формат MM-DD. Лише для мирного часу.',holAdd:'Додати (MM-DD)',holB:'Додати',
dataT:'Управління даними',dataClear:'🗑️ Очистити все',
companyT:'Дані підприємства',companyH:'Використовується для друку наказів (форма П-3)',
coName:'Назва підприємства',coEdrpou:'Код ЄДРПОУ',coCity:'Місто',coDirector:'Керівник (ПІБ, посада)',
coSave:'Зберегти',
modal:'Картка співробітника',mHired:'Прийнято',mLeave:'Відпустка',mEarn:'Зароблено',mUsed:'Використано',
mLeft:'Залишок',mPerY:'к.д./рік',mOk:'✅ Відповідає нормам',mViol:'⚠ Порушення:',
mUsedL:'📅 Використані відпустки',mPay:'💰 Виплати',mYear:'Рік',mMonth:'Місяць',mAmt:'Сума, грн',
mPerT:'📋 Не враховуються до стажу',mPerH:'Без ЗП: 15 к.д./рік. Догляд до 3 років — не враховується.',
mUnp:'Без ЗП',mPar:'Догляд за дитиною',mType:'Тип',mUnp2:'Без збереження ЗП',mPar2:'Догляд за дитиною',
mNoRec:'Немає записів',mNoPay:'Немає виплат',mNoPer:'Немає періодів',mAdd:'Додати',
orderPrint:'🖨️ Наказ (П-3)',
aFill:'Заповніть ПІБ та дату',aDel:'Видалити "{name}"?',aDemo:'Демо завантажено',aSave:'Збережено',
aImp:'Імпортовано',aClear:'Очищено',aConfClear:'Видалити ВСІ дані?',aNoExp:'Немає даних',
aFmt:'Формат: MM-DD',aErrSave:'Помилка збереження',aBadFile:'Невірний файл',
aReadErr:'Помилка читання: ',aViol:'Порушення:\n\n',aAllOk:'✅ Всі відповідають нормам',
aFillAll:'Заповніть поля',aFillYMA:'Заповніть рік/місяць/суму',aDates:'Вкажіть дати',
aCoSave:'Дані підприємства збережено',
comp_std:'Тривалість {n} к.д. < 24',comp_12:'Мінімум 30 к.д. (ст. 6)',
comp_3:'Мінімум 26 к.д. (ст. 6)',comp_min:'Мінімум 31 к.д.',comp_tch:'Мінімум 56 к.д.',
plEmp:'{n} співробітників',
exp:'Страховий стаж (р.)',expHint:'авто з дати прийняття',
sick:'🏥 Лікарняні',sickFrom:'Дата початку',sickTo:'Дата закінчення',sickType:'Тип',
sickTypeSick:'Хвороба',sickTypeChild:'Догляд за дитиною',
sickEsv:'Враховувати ліміт ЄСВ (172 940 грн/міс)',
sickCalc:'Розрахувати лікарняний',sickDays:'Днів хвороби',sickPer:'Розрахунковий період',
sickPay:'Сума виплат',sickCal:'Календарних днів',sickAvg:'Середньоденна',
sickPercent:'Відсоток за стажем',sickDayPay:'Оплата за день',sickTotal:'Всього до виплати',
sickEmployer:'Роботодавець (перші 5 днів)',sickFund:'ПФУ (з 6-го дня)',
sickYearShort:'р.',sickNoRec:'Немає лікарняних',
sickPrint:'🖨️ Друкувати',sickExport:'📊 CSV',
sickLimit:'⚠️ Застосовано ліміт',sickSaved:'Лікарняний додано',
sickDel:'Видалити лікарняний?',sickStazh:'Страховий стаж',
ctrT:'📄 Трудовий договір',ctrNum:'Номер договору',ctrSigned:'Дата укладення',ctrEnd:'Діє до',
ctrType:'Тип договору',ctrIndef:'Безстроковий',ctrFixed:'Строковий',
ctrNone:'Не оформлено',ctrActive:'Діє',ctrSoon:'Закінчується',ctrExpired:'Закінчився',
ctrSave:'Зберегти договір',ctrNote:'Примітка',ctrHint:'Для безстрокового залиште «Діє до» порожнім',
ctrCol:'Договір',ctrSaved:'Договір збережено',ctrDaysLeft:'залишилось {n} дн.',
ctrPrint:'🖨️ Друкувати договір',ctrPreview:'👁 Зразок договору',
ctrScan:'📎 Підписаний скан',ctrScanUp:'Завантажити скан',ctrScanOpen:'Відкрити скан',
ctrScanDel:'Видалити скан',ctrScanOk:'Скан прикріплено',ctrScanNone:'Скан не завантажено',
ctrScanBig:'Файл занадто великий (макс. 1,5 МБ)',ctrScanBad:'Підтримуються PDF, JPG, PNG',
ctrScanDelQ:'Видалити прикріплений скан?',
ctrText:'Текст договору',ctrTextHint:'Можна змінити будь-який абзац. Порожньо = стандартний зразок.',
ctrTextSave:'Зберегти текст',ctrTextFill:'Підставити зразок',ctrTextReset:'Скинути текст',
ctrTextSaved:'Текст договору збережено',ctrPos:'Посада',ctrPosSave:'Зберегти посаду',ctrPosSaved:'Посаду оновлено'
},
ru:{brand:'Кадровый учёт',
login:'Вход в систему',loginH:'Введите учётные данные',setup:'Первоначальная настройка',setupH:'Создайте учётную запись администратора',
user:'Имя пользователя',pwd:'Пароль',pwdC:'Подтвердите пароль',loginB:'Войти',setupB:'Создать администратора',
logout:'Выйти',chPwd:'Изменить пароль',users:'Пользователи',usersH:'Управление доступом',addU:'Добавить пользователя',
role:'Роль',roleA:'Администратор',roleM:'Менеджер',roleV:'Просмотр',you:'вы',
errInv:'Неверное имя или пароль',errShort:'Минимум 6 символов',errMatch:'Пароли не совпадают',
errExist:'Пользователь существует',errFill:'Заполните поля',errUL:'Логин минимум 3 символа',
errUC:'Только латиница, цифры, _ . -',errLastA:'Нельзя удалить последнего админа',
errSelf:'Нельзя удалить себя',errCur:'Неверный текущий пароль',
okPwd:'Пароль изменён',okAddU:'Пользователь добавлен',okDelU:'Пользователь удалён',
confDelU:'Удалить "{name}"?',expired:'Сессия завершена',denied:'Недостаточно прав',
navDash:'Панель',navEmp:'Сотрудники',navImp:'Импорт Excel',navCalc:'Расчёт',navLaws:'Законодательство',navSet:'Настройки',
dashT:'Общая статистика',dashS:'Обзор на',upc:'Ближайшие отпуска',
sEmp:'Всего',sEarn:'Заработано дней',sUsed:'Использовано',sLeft:'Остаток',sLeave:'В отпуске',
noUpc:'Нет запланированных отпусков',
addT:'Добавить сотрудника',name:'ФИО',pos:'Должность',hire:'Дата приёма',birth:'Дата рождения',
cat:'Категория',leave:'Отпуск (к.д.)',addB:'Добавить',demoB:'Демо-данные',listT:'Список сотрудников',
noEmp:'Сотрудников нет',noFind:'Ничего не найдено',
c1:'Обычная (24)',c2:'Инвалид I–II (30)',c3:'Инвалид III (26)',c4:'Несовершеннолетний (31)',c5:'Педагог (56)',
tName:'ФИО',tPos:'Должность',tHire:'Принят',tLeave:'Отпуск',tEarn:'Заработано',tUsed:'Использовано',
tLeft:'Остаток',tStat:'Статус',tCard:'Карточка',tEmp:'Сотрудник',tStart:'Начало',tEnd:'Конец',tDays:'Дней',
stOk:'ОК',stAcc:'Накопление',stViol:'⚠ Нарушение',
impT:'Импорт персонала',impS:'.xlsx, .xls, .csv',dropT:'Перетащите файл',
dropH:'или нажмите для выбора',cols:'Колонки: ФИО, Должность, Дата, Рождение, Отпуск, Категория.',
tpl:'📥 Шаблон',expT:'Экспорт данных',expX:'📊 Excel',expJ:'💾 JSON',impJ:'📥 Импорт JSON',
reading:'⏳ Чтение...',imported:'✅ Импортировано: {n}',skip:'Пропущено: {n}.',warns:'⚠️ Предупреждения:',
impErr:'❌ Ошибка: {msg}',impReadErr:'Ошибка чтения',preview:'Предпросмотр:',
rowErr:'Строка {n}: «{val}»',fileEmpty:'Пустой файл',noCols:'Не найдены колонки ФИО',
noValid:'Нет валидных строк.',
calcT:'Калькулятор отпускных',calcS:'Порядок № 100',cEmp:'Сотрудник',cStart:'Дата начала',
cDays:'Дней',cB:'Рассчитать',cSel:'— выберите —',cPer:'Расчётный период',cTotal:'Выплаты',
cCal:'Календарных дней',cHol:'Праздничных',cCalc:'Дней для расчёта',cAvg:'Среднедневная',
cPay:'Отпускные за {n} к.д.',cur:'грн',
compT:'Компенсация при увольнении',mDate:'Дата увольнения',mEarn:'Заработано',mUsed:'Использовано',
mDays:'Дней для компенсации',mComp:'Компенсация',
lawsT:'Официальные источники',lawsS:'Портал ВРУ',checkB:'🔍 Проверить',refT:'Справочник норм',
refS:'Ключевые нормы',nN:'Норма',nV:'Значение',nB:'Основание',
l504:'Закон «Об отпусках»',l504d:'Все виды отпусков',lkz:'КЗоТ Украины',lkzd:'Общие нормы',
lp100:'Порядок № 100',lp100d:'Средняя зарплата',l2136:'Военное положение',l2136d:'Спецправила',
l2352:'Оптимизация',l2352d:'Изменения 2022–2026',lportal:'Портал ВРУ',lportald:'CSV, JSON, XML',
n1:'Мин. ежегодный',n2:'Инвалиды I–II',n3:'Инвалиды III',n4:'Несовершеннолетние',
n5:'Педагоги',n6:'Максимальная',n7:'Мин. непрерывная',n8:'Первый год',n8v:'после 6 мес.',
n9:'Расчётный период',n9v:'12 мес.',n10:'Без ЗП в стаже',n10v:'до 15 к.д./год',
b6:'ст. 6 Закона № 504',b10:'ст. 10',b12:'ст. 12',b25:'ст. 25–26',bp100:'п. 2 Порядка № 100',
setT:'Общие настройки',setBase:'Базовая (к.д.)',setMode:'Режим праздников',
setM1:'Военное положение',setM2:'Мирное время',
setSave:'Сохранить',setMil:'Ст. 73 КЗоТ не применяется.',
holT:'Праздничные дни',holS:'Формат MM-DD.',holAdd:'Добавить (MM-DD)',holB:'Добавить',
dataT:'Управление данными',dataClear:'🗑️ Очистить',
companyT:'Данные предприятия',companyH:'Используется для печати приказов (форма П-3)',
coName:'Название предприятия',coEdrpou:'Код ЕГРПОУ',coCity:'Город',coDirector:'Руководитель (ФИО, должность)',
coSave:'Сохранить',
modal:'Карточка',mHired:'Принят',mLeave:'Отпуск',mEarn:'Заработано',mUsed:'Использовано',
mLeft:'Остаток',mPerY:'к.д./год',mOk:'✅ Соответствует',mViol:'⚠ Нарушения:',
mUsedL:'📅 Использованные отпуска',mPay:'💰 Выплаты',mYear:'Год',mMonth:'Месяц',mAmt:'Сумма',
mPerT:'📋 Периоды не в стаж',mPerH:'До 15 к.д./год. Уход до 3 лет — не учитывается.',
mUnp:'Без ЗП',mPar:'Уход за ребёнком',mType:'Тип',mUnp2:'Без ЗП',mPar2:'Уход за ребёнком',
mNoRec:'Нет записей',mNoPay:'Нет выплат',mNoPer:'Нет периодов',mAdd:'Добавить',
orderPrint:'🖨️ Приказ (П-3)',
aFill:'Заполните ФИО и дату',aDel:'Удалить "{name}"?',aDemo:'Демо загружено',aSave:'Сохранено',
aImp:'Импортировано',aClear:'Очищено',aConfClear:'Удалить ВСЕ данные?',aNoExp:'Нет данных',
aFmt:'Формат: MM-DD',aErrSave:'Ошибка сохранения',aBadFile:'Неверный файл',
aReadErr:'Ошибка: ',aViol:'Нарушения:\n\n',aAllOk:'✅ Все соответствуют',
aFillAll:'Заполните',aFillYMA:'Год/месяц/сумма',aDates:'Укажите даты',
aCoSave:'Данные предприятия сохранены',
comp_std:'{n} к.д. < 24',comp_12:'Минимум 30',comp_3:'Минимум 26',comp_min:'Минимум 31',comp_tch:'Минимум 56',
plEmp:'{n} сотрудников',
exp:'Страховой стаж (лет)',expHint:'авто от даты приёма',
sick:'🏥 Больничные',sickFrom:'Дата начала',sickTo:'Дата окончания',sickType:'Тип',
sickTypeSick:'Болезнь',sickTypeChild:'Уход за ребёнком',
sickEsv:'Учитывать лимит ЕСВ (172 940 грн/мес)',
sickCalc:'Рассчитать больничный',sickDays:'Дней болезни',sickPer:'Расчётный период',
sickPay:'Сумма выплат',sickCal:'Календарных дней',sickAvg:'Среднедневная',
sickPercent:'Процент по стажу',sickDayPay:'Оплата за день',sickTotal:'Всего к выплате',
sickEmployer:'Работодатель (первые 5 дней)',sickFund:'ПФУ (с 6-го дня)',
sickYearShort:'л.',sickNoRec:'Нет больничных',
sickPrint:'🖨️ Печать',sickExport:'📊 CSV',
sickLimit:'⚠️ Применён лимит',sickSaved:'Больничный добавлен',
sickDel:'Удалить больничный?',sickStazh:'Страховой стаж',
ctrT:'📄 Трудовой договор',ctrNum:'Номер договора',ctrSigned:'Дата заключения',ctrEnd:'Действует до',
ctrType:'Тип договора',ctrIndef:'Бессрочный',ctrFixed:'Срочный',
ctrNone:'Не оформлен',ctrActive:'Действует',ctrSoon:'Истекает',ctrExpired:'Истёк',
ctrSave:'Сохранить договор',ctrNote:'Примечание',ctrHint:'Для бессрочного оставьте «Действует до» пустым',
ctrCol:'Договор',ctrSaved:'Договор сохранён',ctrDaysLeft:'осталось {n} дн.',
ctrPrint:'🖨️ Печать договора',ctrPreview:'👁 Образец договора',
ctrScan:'📎 Подписанный скан',ctrScanUp:'Загрузить скан',ctrScanOpen:'Открыть скан',
ctrScanDel:'Удалить скан',ctrScanOk:'Скан прикреплён',ctrScanNone:'Скан не загружен',
ctrScanBig:'Файл слишком большой (макс. 1,5 МБ)',ctrScanBad:'Поддерживаются PDF, JPG, PNG',
ctrScanDelQ:'Удалить прикреплённый скан?',
ctrText:'Текст договора',ctrTextHint:'Можно изменить любой абзац. Пусто = стандартный образец.',
ctrTextSave:'Сохранить текст',ctrTextFill:'Подставить образец',ctrTextReset:'Сбросить текст',
ctrTextSaved:'Текст договора сохранён',ctrPos:'Должность',ctrPosSave:'Сохранить должность',ctrPosSaved:'Должность обновлена'
},
tr:{brand:'Personel Yönetimi',
login:'Sisteme Giriş',loginH:'Bilgilerinizi girin',setup:'İlk Kurulum',setupH:'Yönetici hesabı oluşturun',
user:'Kullanıcı Adı',pwd:'Şifre',pwdC:'Şifreyi Onayla',loginB:'Giriş Yap',setupB:'Yönetici Oluştur',
logout:'Çıkış',chPwd:'Şifre Değiştir',users:'Kullanıcılar',usersH:'Erişim yönetimi',addU:'Kullanıcı Ekle',
role:'Rol',roleA:'Yönetici',roleM:'Müdür',roleV:'İzleyici',you:'siz',
errInv:'Geçersiz bilgiler',errShort:'En az 6 karakter',errMatch:'Şifreler eşleşmiyor',
errExist:'Kullanıcı var',errFill:'Doldurun',errUL:'En az 3 karakter',
errUC:'Sadece latin, rakam, _ . -',errLastA:'Son yönetici silinemez',
errSelf:'Kendinizi silemezsiniz',errCur:'Mevcut şifre yanlış',
okPwd:'Şifre değişti',okAddU:'Eklendi',okDelU:'Silindi',
confDelU:'"{name}" silinsin mi?',expired:'Oturum sona erdi',denied:'Yetki yok',
navDash:'Panel',navEmp:'Çalışanlar',navImp:'Excel',navCalc:'Hesaplama',navLaws:'Mevzuat',navSet:'Ayarlar',
dashT:'İstatistikler',dashS:'Özet:',upc:'Yaklaşan İzinler',
sEmp:'Toplam',sEarn:'Kazanılan',sUsed:'Kullanılan',sLeft:'Kalan',sLeave:'İzinde',
noUpc:'İzin yok',
addT:'Çalışan Ekle',name:'Ad Soyad',pos:'Pozisyon',hire:'İşe Alınma',birth:'Doğum',
cat:'Kategori',leave:'İzin',addB:'Ekle',demoB:'Demo',listT:'Çalışanlar',
noEmp:'Çalışan yok',noFind:'Bulunamadı',
c1:'Standart (24)',c2:'Engelli I–II (30)',c3:'Engelli III (26)',c4:'Reşit Olmayan (31)',c5:'Eğitim (56)',
tName:'Ad',tPos:'Pozisyon',tHire:'İşe Alındı',tLeave:'İzin',tEarn:'Kazanıldı',tUsed:'Kullanıldı',
tLeft:'Kalan',tStat:'Durum',tCard:'Kart',tEmp:'Çalışan',tStart:'Başlangıç',tEnd:'Bitiş',tDays:'Gün',
stOk:'TAMAM',stAcc:'Birikim',stViol:'⚠ İhlal',
impT:'Personel İçe Aktar',impS:'.xlsx, .xls, .csv',dropT:'Dosyayı sürükleyin',
dropH:'veya tıklayın',cols:'Ad, Pozisyon, İşe Alınma, Doğum, İzin, Kategori.',
tpl:'📥 Şablon',expT:'Dışa Aktar',expX:'📊 Excel',expJ:'💾 JSON',impJ:'📥 JSON',
reading:'⏳ Okunuyor...',imported:'✅ {n} aktarıldı',skip:'Atlandı: {n}.',warns:'⚠️ Uyarılar:',
impErr:'❌ Hata: {msg}',impReadErr:'Okunamadı',preview:'Önizleme:',
rowErr:'Satır {n}: «{val}»',fileEmpty:'Boş',noCols:'Sütun yok',
noValid:'Geçerli satır yok.',
calcT:'İzin Ücreti',calcS:'Yönetmelik 100',cEmp:'Çalışan',cStart:'Başlangıç',
cDays:'Gün',cB:'Hesapla',cSel:'— seçin —',cPer:'Dönem',cTotal:'Ödemeler',
cCal:'Takvim günü',cHol:'Tatil günü',cCalc:'Hesap günü',cAvg:'Ortalama',
cPay:'{n} gün izin ücreti',cur:'UAH',
compT:'Tazminat',mDate:'Çıkış tarihi',mEarn:'Kazanıldı',mUsed:'Kullanıldı',
mDays:'Tazminat günü',mComp:'Tazminat',
lawsT:'Kaynaklar',lawsS:'VRU portalı',checkB:'🔍 Kontrol',refT:'Normlar',
refS:'Temel normlar',nN:'Norm',nV:'Değer',nB:'Dayanak',
l504:'İzinler Kanunu',l504d:'Temel belge',lkz:'İş Kanunu',lkzd:'Genel',
lp100:'Yönetmelik 100',lp100d:'Ortalama ücret',l2136:'Sıkıyönetim',l2136d:'Özel kurallar',
l2352:'Optimizasyon',l2352d:'2022–2026',lportal:'Açık Veri',lportald:'CSV, JSON, XML',
n1:'Yıllık izin',n2:'Engelli I–II',n3:'Engelli III',n4:'Reşit olmayan',
n5:'Eğitim',n6:'Maksimum',n7:'Min. kesintisiz',n8:'İlk yıl',n8v:'6 ay sonra',
n9:'Dönem',n9v:'12 ay',n10:'Ücretsiz izin',n10v:'15 gün/yıl',
b6:'md. 6 (504/96)',b10:'md. 10',b12:'md. 12',b25:'md. 25–26',bp100:'md. 2 (100)',
setT:'Ayarlar',setBase:'Temel (gün)',setMode:'Tatil modu',
setM1:'Sıkıyönetim',setM2:'Barış',
setSave:'Kaydet',setMil:'md. 73 uygulanmaz.',
holT:'Tatiller',holS:'Format: MM-DD.',holAdd:'Ekle (MM-DD)',holB:'Ekle',
dataT:'Veri',dataClear:'🗑️ Temizle',
companyT:'Şirket Bilgileri',companyH:'Sipariş yazdırmak için (Form P-3)',
coName:'Şirket Adı',coEdrpou:'EDRPOU Kodu',coCity:'Şehir',coDirector:'Yönetici (Ad, Pozisyon)',
coSave:'Kaydet',
modal:'Kart',mHired:'İşe Alındı',mLeave:'İzin',mEarn:'Kazanıldı',mUsed:'Kullanıldı',
mLeft:'Kalan',mPerY:'gün/yıl',mOk:'✅ Uygun',mViol:'⚠ İhlaller:',
mUsedL:'📅 Kullanılan İzinler',mPay:'💰 Ödemeler',mYear:'Yıl',mMonth:'Ay',mAmt:'Tutar',
mPerT:'📋 Sayılmayan Dönemler',mPerH:'15 gün/yıl. Bakım 3 yaş — sayılmaz.',
mUnp:'Ücretsiz',mPar:'Bakım',mType:'Tür',mUnp2:'Ücretsiz',mPar2:'Bakım',
mNoRec:'Kayıt yok',mNoPay:'Ödeme yok',mNoPer:'Dönem yok',mAdd:'Ekle',
orderPrint:'🖨️ Emir (P-3)',
aFill:'Ad ve tarihi doldurun',aDel:'"{name}" silinsin mi?',aDemo:'Demo yüklendi',aSave:'Kaydedildi',
aImp:'İçe aktarıldı',aClear:'Temizlendi',aConfClear:'TÜM veriler silinsin mi?',aNoExp:'Veri yok',
aFmt:'Format: MM-DD',aErrSave:'Kayıt hatası',aBadFile:'Geçersiz',
aReadErr:'Hata: ',aViol:'İhlaller:\n\n',aAllOk:'✅ Tümü uygun',
aFillAll:'Doldurun',aFillYMA:'Yıl/ay/tutar',aDates:'Tarihleri girin',
aCoSave:'Şirket bilgileri kaydedildi',
comp_std:'{n} < 24',comp_12:'Min. 30',comp_3:'Min. 26',comp_min:'Min. 31',comp_tch:'Min. 56',
plEmp:'{n} çalışan',
exp:'Sigorta süresi (yıl)',expHint:'işe alınmadan otomatik',
sick:'🏥 Hastalık izinleri',sickFrom:'Başlangıç',sickTo:'Bitiş',sickType:'Tür',
sickTypeSick:'Hastalık',sickTypeChild:'Çocuk bakımı',
sickEsv:'ESV limitini uygula (172 940 UAH/ay)',
sickCalc:'Hesapla',sickDays:'Gün sayısı',sickPer:'Dönem',sickPay:'Ödemeler',
sickCal:'Takvim günü',sickAvg:'Ortalama',sickPercent:'Kıdeme göre %',sickDayPay:'Günlük',
sickTotal:'Toplam',sickEmployer:'İşveren (ilk 5 gün)',sickFund:'PFU (6. günden)',
sickYearShort:'y.',sickNoRec:'Kayıt yok',
sickPrint:'🖨️ Yazdır',sickExport:'📊 CSV',
sickLimit:'⚠️ Limit uygulandı',sickSaved:'Kaydedildi',
sickDel:'Silinsin mi?',sickStazh:'Sigorta süresi',
ctrT:'📄 İş sözleşmesi',ctrNum:'Sözleşme no',ctrSigned:'İmza tarihi',ctrEnd:'Bitiş tarihi',
ctrType:'Tür',ctrIndef:'Süresiz',ctrFixed:'Süreli',
ctrNone:'Yok',ctrActive:'Geçerli',ctrSoon:'Bitiyor',ctrExpired:'Bitti',
ctrSave:'Kaydet',ctrNote:'Not',ctrHint:'Süresiz için bitiş tarihini boş bırakın',
ctrCol:'Sözleşme',ctrSaved:'Kaydedildi',ctrDaysLeft:'{n} gün kaldı',
ctrPrint:'🖨️ Yazdır',ctrPreview:'👁 Örnek sözleşme',
ctrScan:'📎 İmzalı tarama',ctrScanUp:'Tara yükle',ctrScanOpen:'Aç',
ctrScanDel:'Sil',ctrScanOk:'Eklendi',ctrScanNone:'Yok',
ctrScanBig:'Dosya çok büyük (max 1.5 MB)',ctrScanBad:'PDF, JPG, PNG',
ctrScanDelQ:'Taramayı sil?',
ctrText:'Sözleşme metni',ctrTextHint:'Metni düzenleyebilirsiniz. Boş = standart örnek.',
ctrTextSave:'Metni kaydet',ctrTextFill:'Örneği doldur',ctrTextReset:'Sıfırla',
ctrTextSaved:'Kaydedildi',ctrPos:'Pozisyon',ctrPosSave:'Kaydet',ctrPosSaved:'Güncellendi'
}};

const LK='nexus_lang_v1';
let CL=localStorage.getItem(LK)||'uk';
function t(k,p){const d=LANG[CL]||LANG.uk;let s=d[k]!==undefined?d[k]:(LANG.uk[k]||k);
if(p)Object.keys(p).forEach(x=>{s=s.replace(new RegExp('\\{'+x+'\\}','g'),p[x])});return s}

const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const tISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fISO=s=>new Date(s+'T00:00:00');
const today=()=>tISO(new Date());
const addD=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const fD=s=>{if(!s)return'—';const[y,m,d]=s.split('-');return`${d}.${m}.${y}`};
const fN=n=>new Intl.NumberFormat(({uk:'uk-UA',ru:'ru-RU',tr:'tr-TR'})[CL]||'uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
function eachD(s,e,cb){let d=fISO(s);const end=fISO(e);let g=0;while(d<=end&&g++<50000){cb(tISO(d));d=addD(d,1)}}
function cntD(s,e){const a=fISO(s),b=fISO(e);if(b<a)return 0;return Math.round((b-a)/86400000)+1}
function pJ(s,f){try{return JSON.parse(s)||f}catch{return f}}

/* Дозволяє відкривати потрібну вкладку через хеш: hr.html#settings, hr.html#calendar ... */
function applyTabFromHash(){
  const id=(location.hash||'').replace(/^#/,'').trim();
  if(!id)return;
  const b=document.querySelector('.nb[data-tab="'+id+'"]');
  if(b&&!b.hidden)b.click();
}

/* ═══════ AUTH ═══════ */
const Auth=(()=>{
const UK='nexus_users_v1',SK='nexus_session_v1',TO=12*60*60*1000;
let users=[],currentUser=null,timer=null,mode='login';

function hp(pwd,salt){
  const s=pwd+'::'+salt+'::nexus_v3';
  let h1=0xdeadbeef,h2=0x41c6ce57;
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);
    h1=Math.imul(h1^c,2654435761);
    h2=Math.imul(h2^c,1597334677);
  }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return(h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
}
function gs(){return uid()+uid()+Math.random().toString(36).slice(2)}
function lu(){try{const r=localStorage.getItem(UK);if(r){const p=JSON.parse(r);if(Array.isArray(p))return p}}catch{}return[]}
function su(){try{localStorage.setItem(UK,JSON.stringify(users))}catch{}}
function lsess(){try{const r=localStorage.getItem(SK);return r?JSON.parse(r):null}catch{return null}}
function ssess(s){try{localStorage.setItem(SK,JSON.stringify(s))}catch{}}
function csess(){try{localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch{}if(timer){clearTimeout(timer);timer=null}}
function touch(){if(!currentUser)return;ssess({userId:currentUser.id,expiresAt:Date.now()+TO});resetT()}
function resetT(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{if(currentUser){logout();showAuth(t('expired'))}},TO)}

function init(){
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('hr')) return;
  users=lu();
  if(!users.length){setMode('setup');showAuth();return false}
  const s=lsess();
  if(s&&s.expiresAt>Date.now()){
    const u=users.find(x=>x.id===s.userId);
    if(u){currentUser=u;resetT();hideAuth();onLogin();return true}
  }
  setMode('login');showAuth();return false;
}
function showAuth(msg){
  $('#auth-ov').classList.remove('hidden');
  $('#app').classList.remove('vis');
  if(msg)$('#auth-err').textContent=msg;
}
function hideAuth(){
  $('#auth-ov').classList.add('hidden');
  $('#app').classList.add('vis');
  $('#auth-err').textContent='';
}
function setMode(m){
  mode=m;
  if(m==='setup'){
    $('#auth-t').textContent=t('setup');
    $('#auth-h').textContent=t('setupH');
    $('#conf-f').style.display='flex';
    $('#auth-btn-t').textContent=t('setupB');
    $('#pwd-s').style.display='block';
  }else{
    $('#auth-t').textContent=t('login');
    $('#auth-h').textContent=t('loginH');
    $('#conf-f').style.display='none';
    $('#auth-btn-t').textContent=t('loginB');
    $('#pwd-s').style.display='none';
  }
  $('#auth-err').textContent='';
  $('#au').value='';$('#ap').value='';$('#ac').value='';
  setTimeout(()=>$('#au').focus(),50);
}
function refreshUI(){
  if(!$('#auth-ov').classList.contains('hidden')){
    const title=$('#auth-t').textContent;
    const isSetup=title.includes('Перше')||title.includes('Первонач')||title.includes('İlk');
    setMode(isSetup?'setup':'login');
  }
  renderUsers();updateHeader();
}
function vU(u){if(!u||u.length<3)return t('errUL');if(!/^[a-zA-Z0-9_\-\.]+$/.test(u))return t('errUC');return null}
function vP(p){if(!p||p.length<6)return t('errShort');return null}

function submit(){
  const u=$('#au').value.trim(),p=$('#ap').value,c=$('#ac').value,e=$('#auth-err');
  if(!u||!p){e.textContent=t('errFill');return}
  if(mode==='setup'){
    const ue=vU(u);if(ue){e.textContent=ue;return}
    const pe=vP(p);if(pe){e.textContent=pe;return}
    if(p!==c){e.textContent=t('errMatch');return}
    if(users.some(x=>x.username.toLowerCase()===u.toLowerCase())){e.textContent=t('errExist');return}
    const salt=gs(),hash=hp(p,salt);
    const nu={id:uid(),username:u,fullName:u,role:'admin',salt,hash,createdAt:today()};
    users.push(nu);su();
    currentUser=nu;
    ssess({userId:nu.id,expiresAt:Date.now()+TO});
    resetT();hideAuth();onLogin();
    return;
  }
  const user=users.find(x=>x.username.toLowerCase()===u.toLowerCase());
  if(!user){e.textContent=t('errInv');return}
  const hash=hp(p,user.salt);
  if(hash!==user.hash){e.textContent=t('errInv');return}
  currentUser=user;
  ssess({userId:user.id,expiresAt:Date.now()+TO});
  resetT();hideAuth();onLogin();
}
function onLogin(){
  updateHeader();renderUsers();
  if(window.App&&App.renderAll)App.renderAll();
  $$('.nb').forEach((b,i)=>b.classList.toggle('active',i===0));
  $$('.tp').forEach((p,i)=>p.classList.toggle('active',i===0));
  setTimeout(applyTabFromHash,0);
  try{
    const redirect=sessionStorage.getItem('nexus_redirect_after_login');
    if(redirect && redirect!=='hr.html'){
      sessionStorage.removeItem('nexus_redirect_after_login');
      setTimeout(()=>{location.href=redirect;},300);
    }
  }catch(e){}
}
function logout(){
  currentUser=null;csess();
  setMode(users.length?'login':'setup');
  showAuth();
  $('#um').classList.remove('open');
}
function toggleMenu(e){if(e)e.stopPropagation();$('#um').classList.toggle('open')}
document.addEventListener('click',e=>{
  const m=$('#um');if(!m)return;
  if(!m.contains(e.target)&&!e.target.closest('.hd-u'))m.classList.remove('open');
});
function updateHeader(){
  if(!currentUser)return;
  const i=(currentUser.fullName||currentUser.username).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const rk=currentUser.role==='admin'?'roleA':currentUser.role==='manager'?'roleM':'roleV';
  $('#av').textContent=i;
  $('#hun').textContent=currentUser.fullName||currentUser.username;
  $('#hur').textContent=t(rk);
  $('#umn').textContent=currentUser.fullName||currentUser.username;
  $('#umr').textContent=t(rk);
}
function renderUsers(){
  const el=$('#users-list');if(!el)return;
  const isA=currentUser&&currentUser.role==='admin';
  const ab=$('#add-user-bl');if(ab)ab.style.display=isA?'block':'none';
  if(!users.length){el.innerHTML='<div class="tm">—</div>';return}
  let h=`<table class="dt"><thead><tr><th>${t('user')}</th><th>${t('role')}</th><th>${t('tHire')}</th><th></th></tr></thead><tbody>`;
  users.forEach(u=>{
    const me=currentUser&&u.id===currentUser.id;
    const rc=u.role==='admin'?'p':u.role==='manager'?'b':'gr';
    const rk=u.role==='admin'?'roleA':u.role==='manager'?'roleM':'roleV';
    const canD=isA&&!me&&!(u.role==='admin'&&users.filter(x=>x.role==='admin').length===1);
    h+=`<tr><td><b>${u.fullName||u.username}</b>${me?`<span class="bg bg-g" style="margin-left:6px">${t('you')}</span>`:''}
      <div class="tsm tmu tmn">@${u.username}</div></td>
      <td><span class="bg bg-${rc}">${t(rk)}</span></td>
      <td>${fD(u.createdAt)}</td>
      <td style="text-align:right">${canD?`<button class="btn bd bxs" onclick="Auth.deleteUser('${u.id}')">×</button>`:''}</td></tr>`;
  });
  h+='</tbody></table>';el.innerHTML=h;
}
function openAddUser(){
  if(!can('settings')){alert(t('denied'));return}
  $('#user-mt').textContent=t('addU');
  $('#user-mb').innerHTML=`
    <div class="ff mb16"><label>${t('user')} <span class="rq">*</span></label><input id="nu-u"></div>
    <div class="ff mb16"><label>${t('pwd')} <span class="rq">*</span></label><input id="nu-p" type="password"></div>
    <div class="ff mb16"><label>${t('role')}</label><select id="nu-r">
      <option value="admin">${t('roleA')}</option><option value="manager" selected>${t('roleM')}</option>
      <option value="viewer">${t('roleV')}</option></select></div>
    <div class="auth-err" id="nu-err"></div>
    <button class="btn bp" style="width:100%;justify-content:center" onclick="Auth.addUser()">${t('addU')}</button>`;
  $('#user-modal').classList.add('open');
}
function closeUserModal(){$('#user-modal').classList.remove('open')}
function addUser(){
  const u=$('#nu-u').value.trim(),p=$('#nu-p').value,r=$('#nu-r').value,e=$('#nu-err');
  if(!u||!p){e.textContent=t('errFill');return}
  const ue=vU(u);if(ue){e.textContent=ue;return}
  const pe=vP(p);if(pe){e.textContent=pe;return}
  if(users.some(x=>x.username.toLowerCase()===u.toLowerCase())){e.textContent=t('errExist');return}
  const salt=gs(),hash=hp(p,salt);
  users.push({id:uid(),username:u,fullName:u,role:r,salt,hash,createdAt:today()});
  su();closeUserModal();renderUsers();alert(t('okAddU'));
}
function deleteUser(id){
  if(!can('settings')){alert(t('denied'));return}
  const u=users.find(x=>x.id===id);if(!u)return;
  if(currentUser&&currentUser.id===id){alert(t('errSelf'));return}
  if(u.role==='admin'&&users.filter(x=>x.role==='admin').length===1){alert(t('errLastA'));return}
  if(!confirm(t('confDelU',{name:u.fullName||u.username})))return;
  users=users.filter(x=>x.id!==id);su();renderUsers();alert(t('okDelU'));
}
function openChangePwd(){
  $('#um').classList.remove('open');
  $('#user-mt').textContent=t('chPwd');
  $('#user-mb').innerHTML=`
    <div class="ff mb16"><label>${t('pwd')} (current) <span class="rq">*</span></label><input id="cp-c" type="password"></div>
    <div class="ff mb16"><label>${t('pwd')} (new) <span class="rq">*</span></label><input id="cp-n" type="password"></div>
    <div class="ff mb16"><label>${t('pwdC')} <span class="rq">*</span></label><input id="cp-r" type="password"></div>
    <div class="auth-err" id="cp-err"></div>
    <button class="btn bp" style="width:100%;justify-content:center" onclick="Auth.changePwd()">${t('chPwd')}</button>`;
  $('#user-modal').classList.add('open');
}
function changePwd(){
  const o=$('#cp-c').value,n=$('#cp-n').value,c=$('#cp-r').value,e=$('#cp-err');
  if(!o||!n||!c){e.textContent=t('errFill');return}
  if(n!==c){e.textContent=t('errMatch');return}
  const pe=vP(n);if(pe){e.textContent=pe;return}
  const oh=hp(o,currentUser.salt);
  if(oh!==currentUser.hash){e.textContent=t('errCur');return}
  const ns=gs(),nh=hp(n,ns);
  const i=users.findIndex(x=>x.id===currentUser.id);
  users[i].salt=ns;users[i].hash=nh;currentUser=users[i];
  su();closeUserModal();alert(t('okPwd'));
}
function getC(){return currentUser}
function can(a){
  if(!currentUser)return false;
  if(currentUser.role==='admin')return true;
  if(currentUser.role==='manager')return['read','edit'].includes(a);
  if(currentUser.role==='viewer')return a==='read';
  return false;
}
function initTrack(){
  ['click','keydown','mousemove','touchstart'].forEach(ev=>{
    document.addEventListener(ev,()=>{if(currentUser)touch()},{passive:true});
  });
}

return{
  init,submit,logout,toggleMenu,can,touch,refreshUI,
  openAddUser,addUser,deleteUser,closeUserModal,
  openChangePwd,changePwd,getC,initTrack
};
})();
window.Auth=Auth;
/* ═══════ APP ═══════ */
const App=(()=>{
const STORAGE='nexus_hr_ua_v2';
const LAW={MIN:24,D12:30,D3:26,MINOR:31,TCH:56,MAX:59,MINC:14,UNP:15};
const DEF_HOL=['01-01','03-08','05-01','05-09','06-28','07-15','08-24','10-01','12-25'];
const CMAP={'піб':'fullName','фио':'fullName','ad soyad':'fullName','adsoyad':'fullName',
  "прізвище ім'я по батькові":'fullName','прізвище имя по батькові':'fullName',
  'посада':'position','должность':'position','pozisyon':'position',
  'дата прийняття':'hireDate','дата прийняття на роботу':'hireDate','дата прийому':'hireDate',
  'дата приема':'hireDate','işe alınma tarihi':'hireDate',
  'дата народження':'birthDate','дата рождения':'birthDate','doğum tarihi':'birthDate',
  'тривалість відпустки':'baseLeaveDays','продолжительность отпуска':'baseLeaveDays','izin süresi':'baseLeaveDays',
  'категорія':'category','категория':'category','kategori':'category'};

let db=loadDB(),curEmpId=null;
function escH(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function loadDB(){
  try{
    const r=localStorage.getItem(STORAGE);
    if(r){
      const p=pJ(r,null);
      if(p&&p.employees){
        if(!Array.isArray(p.departments))p.departments=[];
        p.employees.forEach(e=>{if(!Object.prototype.hasOwnProperty.call(e,'departmentId'))e.departmentId='';});
        return p;
      }
    }
  }catch{}
  return{employees:[],departments:[],holidays:[...DEF_HOL],baseLeaveDays:LAW.MIN,useHolidays:false,
    company:{name:'',edrpou:'',city:'',director:''},meta:{created:today(),version:APP_VERSION}};
}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(db))}catch{alert(t('aErrSave'))}}

/* --- Трудовий договір (опційно, зворотно сумісно) --- */
function ensureContract(e){
  if(!e.contract||typeof e.contract!=='object'){
    e.contract={number:'',type:'indefinite',signedAt:'',endAt:'',note:'',fullText:'',scan:null};
  }
  if(!e.contract.type)e.contract.type=e.contract.endAt?'fixed':'indefinite';
  if(typeof e.contract.fullText!=='string')e.contract.fullText=e.contract.fullText||'';
  return e.contract;
}
function contractStatus(e){
  const c=ensureContract(e);
  const has=!!(c.signedAt||c.number||c.endAt);
  if(!has)return{key:'none',label:t('ctrNone'),cls:'bg-gr',days:null};
  if(c.type==='indefinite'||!c.endAt)return{key:'active',label:t('ctrActive'),cls:'bg-g',days:null};
  const end=fISO(c.endAt),now=fISO(today());
  const days=Math.round((end-now)/86400000);
  if(days<0)return{key:'expired',label:t('ctrExpired'),cls:'bg-r',days};
  if(days<=30)return{key:'soon',label:t('ctrSoon'),cls:'bg-o',days};
  return{key:'active',label:t('ctrActive'),cls:'bg-g',days};
}
function contractBadge(e){
  const st=contractStatus(e);
  const c=ensureContract(e);
  let extra='';
  if(st.key==='soon'&&st.days!=null)extra=' · '+t('ctrDaysLeft',{n:st.days});
  else if(st.key==='expired'&&c.endAt)extra=' · '+fD(c.endAt);
  else if(st.key==='active'&&c.endAt)extra=' · '+fD(c.endAt);
  else if(st.key==='active'&&!c.endAt)extra=' · ∞';
  return `<span class="bg ${st.cls}" title="${escH((c.number?c.number+' · ':'')+(c.signedAt?fD(c.signedAt):''))}">${st.label}${extra}</span>`;
}

/* ─── Бронювання військовозобов'язаних (Постанова КМУ №76) ─── */
function defaultReservation(){
  return {
    status:'none',           // none | pending | active | expired | cancelled
    basis:'enterprise',      // enterprise | critical_infra | defense | other
    decisionNumber:'',
    decisionDate:'',
    validFrom:'',
    validTo:'',
    authority:'',            // Дія / ТЦК / орган
    salaryMeetsThreshold:false, // ≥ 3 МЗП (25 941 грн у 2026)
    militaryRegistered:true,
    vos:'',                  // ВОс
    rank:'',
    note:'',
    updatedAt:''
  };
}
function ensureReservation(e){
  if(!e.reservation||typeof e.reservation!=='object') e.reservation=defaultReservation();
  const r=e.reservation;
  if(!r.status) r.status='none';
  return r;
}
function reservationEffectiveStatus(e){
  const r=ensureReservation(e);
  if(r.status==='none'||r.status==='cancelled') return r.status;
  if(r.status==='pending') return 'pending';
  if(r.validTo){
    const end=fISO(r.validTo), now=fISO(today());
    if(end<now) return 'expired';
    const days=Math.round((end-now)/86400000);
    if(days<=30) return 'soon';
  }
  return r.status==='active'?'active':r.status;
}
function reservationBadge(e){
  const st=reservationEffectiveStatus(e);
  const r=ensureReservation(e);
  const map={
    none:{label:'—',cls:'bg-gr'},
    pending:{label:'На розгляді',cls:'bg-o'},
    active:{label:'Заброньований',cls:'bg-g'},
    soon:{label:'Бронь закінчується',cls:'bg-o'},
    expired:{label:'Бронь закінчилась',cls:'bg-r'},
    cancelled:{label:'Скасовано',cls:'bg-r'}
  };
  const m=map[st]||map.none;
  let tip=r.decisionNumber||'';
  if(r.validTo) tip+=(tip?' · ':'')+'до '+fD(r.validTo);
  return `<span class="bg ${m.cls}" title="${escH(tip)}">${m.label}</span>`;
}
function reservationSectionHtml(e,canE){
  const r=ensureReservation(e);
  const st=reservationEffectiveStatus(e);
  const dis=canE?'':'disabled';
  return `<div class="c mb16" style="padding:14px;background:var(--g50);border:1px solid var(--g200);border-radius:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <div style="font-weight:700">🛡 Бронювання (військовий облік)</div>
      ${reservationBadge(e)}
    </div>
    <div class="tsm tmu" style="margin-bottom:10px;line-height:1.45">
      Облік згідно з Постановою КМУ №76 (зі змінами 2024–2026). Фактичне бронювання оформлюється через Портал Дія / ТЦК.
      Загальні умови: підприємство в Єдиному переліку критично важливих; працівник на військовому обліку;
      зарплата зазвичай ≥ 3 МЗП (у 2026 — 25&nbsp;941&nbsp;грн/міс., винятки — окремі категорії); квота зазвичай до 50% військовозобов’язаних.
    </div>
    <div class="fr" style="gap:10px;flex-wrap:wrap">
      <div class="ff" style="min-width:140px"><label>Статус</label>
        <select id="res-status" ${dis}>
          <option value="none" ${r.status==='none'?'selected':''}>Немає броні</option>
          <option value="pending" ${r.status==='pending'?'selected':''}>Заявка / на розгляді</option>
          <option value="active" ${r.status==='active'?'selected':''}>Активна бронь</option>
          <option value="expired" ${r.status==='expired'?'selected':''}>Закінчилась</option>
          <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Скасовано</option>
        </select></div>
      <div class="ff" style="min-width:160px"><label>Підстава</label>
        <select id="res-basis" ${dis}>
          <option value="enterprise" ${r.basis==='enterprise'?'selected':''}>Критично важливе підприємство</option>
          <option value="critical_infra" ${r.basis==='critical_infra'?'selected':''}>Критична інфраструктура</option>
          <option value="defense" ${r.basis==='defense'?'selected':''}>ОПК / потреби Сил оборони</option>
          <option value="other" ${r.basis==='other'?'selected':''}>Інша підстава</option>
        </select></div>
      <div class="ff"><label>№ рішення / витяг</label>
        <input type="text" id="res-num" value="${escH(r.decisionNumber||'')}" placeholder="Дія / наказ" ${dis}></div>
      <div class="ff"><label>Дата рішення</label>
        <input type="date" id="res-decision" value="${escH(r.decisionDate||'')}" ${dis}></div>
      <div class="ff"><label>Діє з</label>
        <input type="date" id="res-from" value="${escH(r.validFrom||'')}" ${dis}></div>
      <div class="ff"><label>Діє до</label>
        <input type="date" id="res-to" value="${escH(r.validTo||'')}" ${dis}></div>
      <div class="ff"><label>Орган / канал</label>
        <input type="text" id="res-auth" value="${escH(r.authority||'')}" placeholder="Дія, ТЦК…" ${dis}></div>
      <div class="ff"><label>ВОс</label>
        <input type="text" id="res-vos" value="${escH(r.vos||'')}" placeholder="код / назва" ${dis}></div>
      <div class="ff"><label>Звання</label>
        <input type="text" id="res-rank" value="${escH(r.rank||'')}" ${dis}></div>
    </div>
    <div class="fr" style="gap:16px;margin-top:10px;flex-wrap:wrap;align-items:center">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="res-salary" ${r.salaryMeetsThreshold?'checked':''} ${dis}>
        Зарплата ≥ 3 МЗП (вимога п. 8 Порядку №76)
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="res-milreg" ${r.militaryRegistered!==false?'checked':''} ${dis}>
        На військовому обліку
      </label>
    </div>
    <div class="ff" style="margin-top:8px"><label>Примітка</label>
      <input type="text" id="res-note" value="${escH(r.note||'')}" placeholder="Квота, сумісництво, інша відстрочка…" ${dis}></div>
    ${st==='soon'?`<div class="cc cc-w" style="margin-top:10px">⚠️ Бронь закінчується ${r.validTo?fD(r.validTo):''}. Варто продовжити через Дію / профільний орган.</div>`:''}
    ${st==='expired'?`<div class="cc cc-w" style="margin-top:10px">⛔ Строк бронювання минув ${r.validTo?fD(r.validTo):''}.</div>`:''}
    ${canE?`<div style="margin-top:12px"><button class="btn bp bsm" type="button" onclick="App.saveEmployeeReservation()">Зберегти бронювання</button></div>`:
      '<div class="tsm tmu" style="margin-top:8px">Тільки перегляд</div>'}
  </div>`;
}
function saveEmployeeReservation(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const r=ensureReservation(e);
  r.status=($('#res-status')&&$('#res-status').value)||'none';
  r.basis=($('#res-basis')&&$('#res-basis').value)||'enterprise';
  r.decisionNumber=($('#res-num')&&$('#res-num').value.trim())||'';
  r.decisionDate=($('#res-decision')&&$('#res-decision').value)||'';
  r.validFrom=($('#res-from')&&$('#res-from').value)||'';
  r.validTo=($('#res-to')&&$('#res-to').value)||'';
  r.authority=($('#res-auth')&&$('#res-auth').value.trim())||'';
  r.vos=($('#res-vos')&&$('#res-vos').value.trim())||'';
  r.rank=($('#res-rank')&&$('#res-rank').value.trim())||'';
  r.salaryMeetsThreshold=!!($('#res-salary')&&$('#res-salary').checked);
  r.militaryRegistered=!!($('#res-milreg')&&$('#res-milreg').checked);
  r.note=($('#res-note')&&$('#res-note').value.trim())||'';
  r.updatedAt=new Date().toISOString();
  save();
  if(window.NexusCore)NexusCore.audit('employee.reservation.update','employee',{employeeId:e.id,status:r.status});
  renderEmp();renderModal();
}

function isH(d){return db.useHolidays&&db.holidays.includes(d.slice(5))}
function cntH(s,e){let c=0;eachD(s,e,d=>{if(isH(d))c++});return c}
function excD(emp){
  const ex=new Set();
  (emp.parentalPeriods||[]).forEach(p=>{if(p.start&&p.end)eachD(p.start,p.end,d=>ex.add(d))});
  const byY={};
  (emp.unpaidPeriods||[]).forEach(p=>{
    if(p.start&&p.end)eachD(p.start,p.end,d=>{const y=d.slice(0,4);(byY[y]=byY[y]||[]).push(d)});
  });
  Object.values(byY).forEach(a=>{a.sort();a.slice(LAW.UNP).forEach(d=>ex.add(d))});
  return ex;
}
function earned(emp,asOf){
  if(!emp.hireDate)return 0;
  const end=asOf||today();
  if(fISO(end)<fISO(emp.hireDate))return 0;
  const ex=excD(emp);
  let sd=0,hs=0;
  eachD(emp.hireDate,end,d=>{if(ex.has(d))return;sd++;if(isH(d))hs++});
  const b=emp.baseLeaveDays||db.baseLeaveDays;
  const hy=db.useHolidays?db.holidays.length:0;
  const den=365-hy;if(den<=0)return 0;
  return Math.round(b*(sd-hs)/den*100)/100;
}
function used(emp){return(emp.leaves||[]).filter(l=>l.type==='annual').reduce((s,l)=>s+(Number(l.days)||0),0)}
function calcPay(emp,start,days){
  const s=fISO(start);
  const lm=new Date(s.getFullYear(),s.getMonth(),0);
  let fm=new Date(lm.getFullYear(),lm.getMonth()-11,1);
  const h=fISO(emp.hireDate);if(h>fm)fm=new Date(h.getFullYear(),h.getMonth(),1);
  const ps=tISO(fm),pe=tISO(lm);
  let tot=0;const months=[];let cur=new Date(fm);
  while(cur<=lm){
    const y=cur.getFullYear(),m=cur.getMonth()+1;
    const p=(emp.payments||[]).find(x=>x.year===y&&x.month===m);
    const a=p?Number(p.amount)||0:0;
    tot+=a;months.push({y,m,amount:a});cur=new Date(y,m,1);
  }
  const cal=cntD(ps,pe),hol=cntH(ps,pe),calc=cal-hol;
  const avg=calc>0?tot/calc:0;
  return{ps,pe,months,tot,cal,hol,calc,avg,pay:avg*days};
}

function calcInsuranceYears(hireDate){
  if(!hireDate)return 0;
  const now=new Date(),h=fISO(hireDate);
  let y=now.getFullYear()-h.getFullYear();
  const m=now.getMonth()-h.getMonth();
  if(m<0||(m===0&&now.getDate()<h.getDate()))y--;
  return Math.max(0,y);
}
function stazhPercent(y){if(y<3)return 50;if(y<5)return 60;if(y<8)return 70;return 100}

function calcSick(emp,start,end,opts){
  opts=opts||{};
  const MAX_ESV=172940,MAX_DAILY=5681.34,MIN_DAILY=284.07;
  const days=cntD(start,end)-cntH(start,end);
  if(days<=0)return null;
  const s=fISO(start);
  const lm=new Date(s.getFullYear(),s.getMonth(),0);
  let fm=new Date(lm.getFullYear(),lm.getMonth()-11,1);
  const h=fISO(emp.hireDate);if(h>fm)fm=new Date(h.getFullYear(),h.getMonth(),1);
  const ps=tISO(fm),pe=tISO(lm);
  let tot=0,hasLimit=false;const months=[];let cur=new Date(fm);
  while(cur<=lm){
    const y=cur.getFullYear(),m=cur.getMonth()+1;
    const p=(emp.payments||[]).find(x=>x.year===y&&x.month===m);
    let a=p?Number(p.amount)||0:0;
    if(opts.useEsv&&a>MAX_ESV){a=MAX_ESV;hasLimit=true}
    tot+=a;months.push({y,m,amount:a});cur=new Date(y,m,1);
  }
  const cal=cntD(ps,pe);
  let avg=cal>0?tot/cal:0;
  let maxApplied=false;
  if(avg>MAX_DAILY){avg=MAX_DAILY;maxApplied=true}
  const years=Number(emp.insuranceYears)||calcInsuranceYears(emp.hireDate);
  const pct=stazhPercent(years);
  let dayPay=avg*pct/100;
  let shortApplied=false;
  if(years<1&&dayPay>MIN_DAILY){dayPay=MIN_DAILY;shortApplied=true}
  const total=dayPay*days;
  const empDays=Math.min(5,days),pfDays=Math.max(0,days-5);
  return{days,ps,pe,months,tot,cal,avg,pct,years,dayPay,total,empDays,pfDays,
    empSum:dayPay*empDays,pfSum:dayPay*pfDays,hasLimit,maxApplied,shortApplied,opts};
}

function comp(emp){
  const i=[],c=emp.category;
  if(c==='standard'&&emp.baseLeaveDays<LAW.MIN)i.push(t('comp_std',{n:emp.baseLeaveDays}));
  if(c==='disabled_1_2'&&emp.baseLeaveDays<LAW.D12)i.push(t('comp_12'));
  if(c==='disabled_3'&&emp.baseLeaveDays<LAW.D3)i.push(t('comp_3'));
  if(c==='minor'&&emp.baseLeaveDays<LAW.MINOR)i.push(t('comp_min'));
  if(c==='teacher'&&emp.baseLeaveDays<LAW.TCH)i.push(t('comp_tch'));
  return i;
}

function reqEdit(){if(!Auth.can('edit')){alert(t('denied'));return false}return true}
function reqSet(){if(!Auth.can('settings')){alert(t('denied'));return false}return true}

function applyRoles(){
  $$('[data-role]').forEach(el=>{
    const r=el.dataset.role;let s=false;
    if(r==='edit')s=Auth.can('edit');
    if(r==='settings')s=Auth.can('settings');
    el.hidden=!s;
    if(el.classList.contains('c'))el.style.display=s?'':'none';
  });
}
function initTabs(){
  $$('.nb').forEach(b=>b.addEventListener('click',()=>{
    $$('.nb').forEach(x=>x.classList.remove('active'));
    $$('.tp').forEach(p=>p.classList.remove('active'));
    b.classList.add('active');
    const p=$('#tp-'+b.dataset.tab);if(p)p.classList.add('active');
    if(b.dataset.tab==='calc')refreshSel();
    if(b.dataset.tab==='dashboard')renderDash();
    if(b.dataset.tab==='settings'){Auth.refreshUI();renderCompany()}
  }));
}

function renderDash(){
  const emps=db.employees;
  $('#dash-date').textContent=fD(today());
  let te=0,tu=0,tl=0,ol=0;
  emps.forEach(e=>{
    const er=earned(e),us=used(e);
    te+=er;tu+=us;tl+=er-us;
    (e.leaves||[]).forEach(l=>{if(l.start<=today()&&l.end>=today())ol++});
  });
  $('#stats').innerHTML=`
    <div class="sc"><div class="scl">${t('sEmp')}</div><div class="scv scv-b">${emps.length}</div></div>
    <div class="sc"><div class="scl">${t('sEarn')}</div><div class="scv">${te.toFixed(1)}</div></div>
    <div class="sc"><div class="scl">${t('sUsed')}</div><div class="scv scv-o">${tu.toFixed(1)}</div></div>
    <div class="sc"><div class="scl">${t('sLeft')}</div><div class="scv scv-g">${tl.toFixed(1)}</div></div>
    <div class="sc"><div class="scl">${t('sLeave')}</div><div class="scv">${ol}</div></div>`;
  const up=[];
  emps.forEach(e=>(e.leaves||[]).forEach(l=>{if(l.start>today())up.push({n:e.fullName,s:l.start,e:l.end,d:l.days})}));
  up.sort((a,b)=>a.s.localeCompare(b.s));
  if(up.length){
    $('#upcoming').innerHTML=`<table class="dt"><thead><tr>
      <th>${t('tEmp')}</th><th>${t('tStart')}</th><th>${t('tEnd')}</th><th>${t('tDays')}</th></tr></thead><tbody>
      ${up.map(u=>`<tr><td><b>${u.n}</b></td><td>${fD(u.s)}</td><td>${fD(u.e)}</td>
      <td><span class="bg bg-b">${u.d}</span></td></tr>`).join('')}</tbody></table>`;
  }else{
    $('#upcoming').innerHTML=`<div class="tm">${t('noUpc')}</div>`;
  }
}


let curDepartmentId='';

function renderDepartmentSelects(){
  const selects=[$('#ed'),$('#emp-department')].filter(Boolean);
  selects.forEach(sel=>{
    const current=sel.value;
    sel.innerHTML='<option value="">— Оберіть відділ —</option>'+
      (db.departments||[]).slice().sort((a,b)=>a.code.localeCompare(b.code,'uk')).map(d=>
        `<option value="${d.id}">${escH(d.code)} — ${escH(d.name)}</option>`).join('');
    if(current && (db.departments||[]).some(d=>d.id===current))sel.value=current;
  });
}

function renderDepartments(){
  const el=$('#departments-list');
  if(!el)return;
  const deps=(db.departments||[]).slice().sort((a,b)=>a.code.localeCompare(b.code,'uk'));
  if(!deps.length){
    el.innerHTML='<div class="tm">Відділів ще немає. Додайте перший відділ вище.</div>';
    renderDepartmentSelects();
    return;
  }
  el.innerHTML=`<table class="dt"><thead><tr>
    <th>Код відділу</th><th>Назва відділу</th><th>Співробітників</th><th></th>
  </tr></thead><tbody>${deps.map(d=>{
    const count=db.employees.filter(e=>e.departmentId===d.id).length;
    return `<tr>
      <td><b>${escH(d.code)}</b></td>
      <td>${escH(d.name)}</td>
      <td><span class="bg bg-b">${count}</span></td>
      <td style="text-align:right"><button class="btn bs bxs" onclick="App.editDepartment('${d.id}')">Редагувати</button></td>
    </tr>`;
  }).join('')}</tbody></table>`;
  renderDepartmentSelects();
}

function saveDepartment(){
  if(!reqEdit())return;
  const code=$('#dep-code').value.trim().toUpperCase();
  const name=$('#dep-name').value.trim();
  const editId=$('#dep-edit-id').value;
  if(!code||!name){alert('Вкажіть код і назву відділу.');return}
  if(!/^[A-ZА-ЯІЇЄ0-9][A-ZА-ЯІЇЄ0-9._-]*$/i.test(code)){
    alert('Код відділу може містити лише літери, цифри, крапку, дефіс та підкреслення.');return;
  }
  const duplicate=(db.departments||[]).some(d=>d.id!==editId&&String(d.code).toLowerCase()===code.toLowerCase());
  if(duplicate){alert('Відділ з таким кодом уже існує.');return}
  if(editId){
    const d=db.departments.find(x=>x.id===editId);
    if(!d)return;
    d.code=code;d.name=name;d.updatedAt=today();
  }else{
    db.departments.push({id:uid(),code,name,createdAt:today(),updatedAt:today()});
  }
  save();
  closeDepartmentForm();
  renderDepartments();
  renderEmp($('#search').value);
}

function editDepartment(id){
  if(!reqEdit())return;
  const d=(db.departments||[]).find(x=>x.id===id);if(!d)return;
  $('#dep-edit-id').value=d.id;
  $('#dep-code').value=d.code;
  $('#dep-name').value=d.name;
  $('#dep-save').textContent='Зберегти зміни';
  const dc=$('#dep-cancel'); if(dc) dc.style.display='';
  const mt=$('#dep-mt'); if(mt) mt.textContent='Редагувати відділ';
  const m=$('#dep-modal'); if(m) m.classList.add('open');
  setTimeout(()=>{$('#dep-code').focus();},80);
}

function cancelDepartmentEdit(){
  $('#dep-edit-id').value='';
  $('#dep-code').value='';
  $('#dep-name').value='';
  $('#dep-save').textContent='Додати відділ';
  const dc=$('#dep-cancel'); if(dc) dc.style.display='none';
  const mt=$('#dep-mt'); if(mt) mt.textContent='Додати відділ';
}
function openDepartmentForm(){
  if(!reqEdit())return;
  cancelDepartmentEdit();
  const m=$('#dep-modal'); if(m) m.classList.add('open');
  setTimeout(()=>{const c=$('#dep-code'); if(c) c.focus();},80);
}
function closeDepartmentForm(){
  cancelDepartmentEdit();
  const m=$('#dep-modal'); if(m) m.classList.remove('open');
}
function openEmployeeForm(){
  if(!reqEdit())return;
  // clear form fields
  ['en','ep','eh','eb'].forEach(id=>{const e=$('#'+id); if(e) e.value='';});
  const el=$('#el'); if(el) el.value='24';
  const ee=$('#ee'); if(ee) ee.value='0';
  const ec=$('#ec'); if(ec) ec.value='standard';
  if($('#e-ctr-num'))$('#e-ctr-num').value='';
  if($('#e-ctr-signed'))$('#e-ctr-signed').value='';
  if($('#e-ctr-end'))$('#e-ctr-end').value='';
  const mt=$('#emp-form-mt'); if(mt) mt.textContent='Додати співробітника';
  const ba=$('#btn-add'); if(ba) ba.textContent='Додати';
  renderDepartmentSelects();
  refreshSel();
  const ed=$('#ed'); if(ed) ed.value='';
  const ps=$('#e-projects'); if(ps) Array.from(ps.options).forEach(o=>o.selected=false);
  const m=$('#emp-form-modal'); if(m) m.classList.add('open');
  setTimeout(()=>{const n=$('#en'); if(n) n.focus();},80);
}
function closeEmployeeForm(){
  const m=$('#emp-form-modal'); if(m) m.classList.remove('open');
}

function addEmp(){
  if(!reqEdit())return;
  const n=$('#en').value.trim(),h=$('#eh').value,departmentId=$('#ed').value;
  if(!n||!h){alert(t('aFill'));return}
  if(!departmentId){alert('Оберіть відділ для співробітника.');return}
  const ctrNum=($('#e-ctr-num')&&$('#e-ctr-num').value||'').trim();
  const ctrSigned=($('#e-ctr-signed')&&$('#e-ctr-signed').value)||h||'';
  const ctrEnd=($('#e-ctr-end')&&$('#e-ctr-end').value)||'';
  const ctrType=ctrEnd?'fixed':'indefinite';
  db.employees.push({
    id:uid(),fullName:n,position:$('#ep').value.trim(),departmentId,
    hireDate:h,birthDate:$('#eb').value||'',
    baseLeaveDays:Number($('#el').value)||LAW.MIN,
    insuranceYears:Number($('#ee').value)||calcInsuranceYears(h),
    category:$('#ec').value,
    projectIds: Array.from(document.querySelectorAll('#e-projects option:checked')).map(o=>o.value).filter(Boolean),
    contract:{number:ctrNum,type:ctrType,signedAt:ctrSigned,endAt:ctrEnd,note:''},
    reservation: defaultReservation(),
    payments:[],leaves:[],unpaidPeriods:[],parentalPeriods:[],sickLeaves:[],
    createdAt:today()
  });
  save();
  closeEmployeeForm();
  $('#en').value='';$('#ep').value='';$('#eh').value='';$('#eb').value='';
  $('#ee').value='0';$('#ee-hint').textContent='';$('#ed').value=''; if($('#e-projects')) Array.from($('#e-projects').options).forEach(o=>o.selected=false);
  if($('#e-ctr-num'))$('#e-ctr-num').value='';if($('#e-ctr-signed'))$('#e-ctr-signed').value='';if($('#e-ctr-end'))$('#e-ctr-end').value='';
  renderDepartments();renderEmp();refreshSel();renderDash();
}
function delEmp(id){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===id);
  if(!confirm(t('aDel',{name:e.fullName})))return;
  db.employees=db.employees.filter(x=>x.id!==id);
  save();renderDepartments();renderEmp();refreshSel();renderDash();
}
function filterEmp(){renderEmp($('#search').value.toLowerCase().trim())}
function renderEmp(q){
  db.employees.forEach(e=>{if(!Array.isArray(e.projectIds))e.projectIds=e.projectId?[e.projectId]:[]});
  const el=$('#emp-list');q=(q||'').toLowerCase().trim();
  let list=db.employees;
  if(q)list=list.filter(e=>{
    const d=(db.departments||[]).find(x=>x.id===e.departmentId);
    return e.fullName.toLowerCase().includes(q)||(e.position||'').toLowerCase().includes(q)||
      (d&&((d.code+' '+d.name).toLowerCase().includes(q)));
  });
  $('#emp-count').textContent=list.length;
  if(!list.length){el.innerHTML=`<div class="tm">${q?t('noFind'):t('noEmp')}</div>`;return}
  const ce=Auth.can('edit');
  let h=`<table class="dt"><thead><tr>
    <th>${t('tName')}</th><th>${t('tPos')}</th><th>Відділ</th><th>Бронь</th><th>Проекти</th><th>${t('tHire')}</th><th>${t('ctrCol')}</th><th>${t('tLeave')}</th>
    <th>${t('tEarn')}</th><th>${t('tUsed')}</th><th>${t('tLeft')}</th><th>${t('tStat')}</th><th></th>
    </tr></thead><tbody>`;
  list.forEach(e=>{
    const er=earned(e),us=used(e),left=er-us;
    const cc=comp(e);
    const st=cc.length?`<span class="bg bg-r">${t('stViol')}</span>`:left>20?`<span class="bg bg-o">${t('stAcc')}</span>`:`<span class="bg bg-g">${t('stOk')}</span>`;
    const dep=(db.departments||[]).find(d=>d.id===e.departmentId);
    h+=`<tr><td><b>${escH(e.fullName)}</b></td><td>${escH(e.position||'—')}</td><td>${dep?`<span class="bg bg-b">${escH(dep.code)} — ${escH(dep.name)}</span>`:'<span class="bg bg-o">Не призначено</span>'}</td>
      <td>${reservationBadge(e)}</td>
      <td>${(e.projectIds||[]).length}</td><td>${fD(e.hireDate)}</td>
      <td>${contractBadge(e)}</td>
      <td>${e.baseLeaveDays}</td><td class="tmn">${er.toFixed(2)}</td><td class="tmn">${us.toFixed(2)}</td>
      <td><span class="bg ${left>0?'bg-g':'bg-gr'}">${left.toFixed(2)}</span></td>
      <td>${st}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn bs bxs" onclick="App.openEmp('${e.id}')">${t('tCard')}</button>
        ${ce?`<button class="btn bd bxs" onclick="App.delEmp('${e.id}')">×</button>`:''}
      </td></tr>`;
  });
  h+='</tbody></table>';el.innerHTML=h;
}

function openEmp(id){curEmpId=id;renderModal();$('#emp-modal').classList.add('open')}
function closeModal(){
  $('#emp-modal').classList.remove('open');
  curEmpId=null;renderEmp();refreshSel();renderDash();
}

function saveEmployeeDepartment(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const depId=$('#emp-department').value;
  if(!depId){alert('Оберіть відділ для співробітника.');return}
  e.departmentId=depId;
  save();renderEmp();renderModal();
}

function saveEmployeePosition(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const pos=($('#emp-position')?.value||'').trim();
  e.position=pos;
  save();
  if(window.NexusCore)NexusCore.audit('employee.position.update','employee',{employeeId:e.id,position:pos});
  renderEmp();renderModal();
  alert(t('ctrPosSaved'));
}

function saveEmployeeProjects(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId); if(!e)return;
  e.projectIds=Array.from(document.querySelectorAll('#emp-projects option:checked')).map(o=>o.value).filter(Boolean);
  delete e.projectId;
  save(); renderEmp(); renderModal();
  if(window.NexusCore) NexusCore.audit('employee.projects.update','employee',{employeeId:e.id,projectIds:e.projectIds});
  alert('Проекти співробітника збережено');
}

function onContractTypeChange(){
  const type=$('#ctr-type')?.value||'indefinite';
  const wrap=$('#ctr-end-wrap');
  const end=$('#ctr-end');
  if(wrap)wrap.style.opacity=type==='fixed'?'1':'.55';
  if(type==='indefinite'&&end)end.value='';
}

function saveEmployeeContract(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const type=$('#ctr-type')?.value||'indefinite';
  const signed=($('#ctr-signed')?.value||'').trim();
  const end=type==='fixed'?(($('#ctr-end')?.value||'').trim()):'';
  if(type==='fixed'&&!end){alert(t('aDates'));return}
  if(end&&signed&&end<signed){alert(t('aDates'));return}
  const prev=ensureContract(e);
  e.contract={
    number:($('#ctr-num')?.value||'').trim(),
    type,
    signedAt:signed||e.hireDate||'',
    endAt:end,
    note:($('#ctr-note')?.value||'').trim(),
    scan:prev.scan||null,
    fullText:prev.fullText||''
  };
  save();
  if(window.NexusCore)NexusCore.audit('employee.contract.update','employee',{employeeId:e.id,contract:{number:e.contract.number,type:e.contract.type,signedAt:e.contract.signedAt,endAt:e.contract.endAt}});
  renderEmp();renderModal();
  alert(t('ctrSaved'));
}

function buildDefaultContractText(e){
  const c=ensureContract(e);
  const co=db.company||{};
  const dep=(db.departments||[]).find(d=>d.id===e.departmentId);
  const city=co.city||'___________';
  const coName=co.name||'ТОВ «NEXUS ENGENEERING»';
  const edrpou=co.edrpou||'___________';
  const director=co.director||'___________________________';
  const num=c.number||'____';
  const signed=c.signedAt||e.hireDate||today();
  const end=c.endAt||'';
  const isFixed=c.type==='fixed'&&end;
  const termText=isFixed
    ?('строковий: з '+fD(signed)+' по '+fD(end))
    :('безстроковий: з '+fD(signed)+' (на невизначений строк)');
  const pos=e.position||'________________';
  const depName=dep?(dep.code+' — '+dep.name):'________________';
  const months=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
  const sd=fISO(signed);
  const dateLong='«'+String(sd.getDate()).padStart(2,'0')+'» '+months[sd.getMonth()]+' '+sd.getFullYear()+' р.';
  const lines=[
    city+'                                                    '+dateLong,
    '',
    'ТРУДОВИЙ ДОГОВІР № '+num,
    '',
    'Роботодавець: '+coName+', код ЄДРПОУ '+edrpou+', в особі '+director+', з однієї сторони, та',
    '',
    'Працівник: '+e.fullName+(e.birthDate?', дата народження '+fD(e.birthDate):'')+', з іншої сторони, уклали цей договір про таке:',
    '',
    '1. Предмет договору',
    '1.1. Працівник приймається на роботу на посаду: '+pos+'.',
    '1.2. Структурний підрозділ: '+depName+'.',
    '1.3. Дата прийняття на роботу: '+fD(e.hireDate||signed)+'.',
    '1.4. Строк дії договору: '+termText+'.',
    '',
    '2. Обов\'язки сторін',
    '2.1. Працівник зобов\'язується особисто виконувати роботу, визначену цим договором, дотримуватися правил внутрішнього трудового розпорядку та вимог охорони праці.',
    '2.2. Роботодавець зобов\'язується забезпечити умови праці, передбачені законодавством України, своєчасно виплачувати заробітну плату та надавати відпустки згідно із законом.',
    '',
    '3. Режим роботи та відпочинку',
    '3.1. Режим роботи встановлюється правилами внутрішнього трудового розпорядку Роботодавця.',
    '3.2. Тривалість щорічної основної відпустки: '+(e.baseLeaveDays||db.baseLeaveDays||24)+' календарних днів.',
    '',
    '4. Інші умови',
    '4.1. Умови цього договору можуть бути змінені лише за згодою сторін у письмовій формі.',
    '4.2. У питаннях, не врегульованих цим договором, сторони керуються Кодексом законів про працю України та іншими нормативно-правовими актами.'
  ];
  if(c.note)lines.push('4.3. Примітка: '+c.note);
  lines.push('',
    '5. Реквізити та підписи сторін',
    '',
    'Роботодавець: _________________ / '+director+' /',
    'Працівник:    _________________ / '+e.fullName+' /'
  );
  return lines.join('\n');
}

function fillContractTemplate(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const ta=$('#ctr-fulltext');
  if(ta)ta.value=buildDefaultContractText(e);
}

function saveContractText(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const c=ensureContract(e);
  c.fullText=($('#ctr-fulltext')?.value||'').trim();
  e.contract=c;
  save();
  if(window.NexusCore)NexusCore.audit('employee.contract.text','employee',{employeeId:e.id,len:(c.fullText||'').length});
  alert(t('ctrTextSaved'));
}

function resetContractText(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  if(!confirm(t('ctrTextReset')+'?'))return;
  const c=ensureContract(e);
  c.fullText='';
  e.contract=c;
  save();
  const ta=$('#ctr-fulltext');
  if(ta)ta.value='';
  renderModal();
}

function printContract(empId){
  const e=db.employees.find(x=>x.id===(empId||curEmpId));
  if(!e)return;
  const c=ensureContract(e);
  const bodyText=(c.fullText&&c.fullText.trim())?c.fullText.trim():buildDefaultContractText(e);
  const title='Трудовий договір — '+e.fullName;
  const html='<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8">'+
    '<title>'+escH(title)+'</title><style>'+
    '@page{size:A4;margin:18mm 16mm}'+
    'body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.5;margin:0;padding:16px;white-space:pre-wrap}'+
    '.print-btn{position:fixed;top:16px;right:16px;padding:12px 22px;background:#1e40af;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:sans-serif;z-index:9}'+
    '@media print{.print-btn{display:none}}'+
    '</style></head><body>'+
    '<button class="print-btn" onclick="window.print()">🖨️ Друкувати</button>'+
    escH(bodyText)+
    '</body></html>';
  const w=window.open('','_blank','width=900,height=1100');
  if(!w){alert('Дозвольте спливаючі вікна для друку');return}
  w.document.write(html);
  w.document.close();
}

const CTR_SCAN_MAX=1.5*1024*1024;
const CTR_SCAN_TYPES=['application/pdf','image/jpeg','image/png','image/jpg','image/webp'];

function attachContractScan(ev){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const f=ev&&ev.target&&ev.target.files&&ev.target.files[0];
  if(!f)return;
  if(f.size>CTR_SCAN_MAX){alert(t('ctrScanBig'));ev.target.value='';return}
  const okType=CTR_SCAN_TYPES.includes(f.type)||/\.(pdf|jpe?g|png|webp)$/i.test(f.name||'');
  if(!okType){alert(t('ctrScanBad'));ev.target.value='';return}
  const reader=new FileReader();
  reader.onload=()=>{
    const c=ensureContract(e);
    c.scan={name:f.name,type:f.type||'application/octet-stream',size:f.size,data:String(reader.result||''),uploadedAt:today()};
    e.contract=c;
    save();
    if(window.NexusCore)NexusCore.audit('employee.contract.scan','employee',{employeeId:e.id,name:f.name,size:f.size});
    renderModal();
    alert(t('ctrScanOk'));
  };
  reader.onerror=()=>alert(t('aReadErr')+(reader.error&&reader.error.message||''));
  reader.readAsDataURL(f);
  ev.target.value='';
}

function openContractScan(empId){
  const e=db.employees.find(x=>x.id===(empId||curEmpId));if(!e)return;
  const c=ensureContract(e);
  if(!c.scan||!c.scan.data){alert(t('ctrScanNone'));return}
  const w=window.open('','_blank');
  if(!w){
    const a=document.createElement('a');
    a.href=c.scan.data;a.download=c.scan.name||'contract-scan';a.click();
    return;
  }
  if((c.scan.type||'').startsWith('image/')){
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+escH(c.scan.name||'scan')+'</title></head><body style="margin:0;background:#111;display:flex;justify-content:center">'+
      '<img src="'+c.scan.data+'" style="max-width:100%;height:auto" alt="scan"></body></html>');
    w.document.close();
  }else if((c.scan.type||'')==='application/pdf'||/\.pdf$/i.test(c.scan.name||'')){
    w.location.href=c.scan.data;
  }else{
    const a=document.createElement('a');
    a.href=c.scan.data;a.download=c.scan.name||'contract-scan';a.target='_blank';a.click();
    w.close();
  }
}

function removeContractScan(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const c=ensureContract(e);
  if(!c.scan){alert(t('ctrScanNone'));return}
  if(!confirm(t('ctrScanDelQ')))return;
  c.scan=null;
  e.contract=c;
  save();
  renderModal();
}

function renderModal(){
  const e=db.employees.find(x=>x.id===curEmpId);if(!e)return;
  const er=earned(e),us=used(e),left=er-us;
  const cc=comp(e);const cur=t('cur');const canE=Auth.can('edit');
  const stazh=Number(e.insuranceYears)||calcInsuranceYears(e.hireDate);
  $('#emp-mt').textContent=e.fullName;

  const lh=(e.leaves||[]).length
    ?(e.leaves||[]).slice().sort((a,b)=>b.start.localeCompare(a.start)).map(l=>`
      <div class="tmi"><div><b>${fD(l.start)} — ${fD(l.end)}</b>
        <span class="bg bg-b" style="margin-left:6px">${l.days}</span></div>
        <div style="display:flex;gap:6px">
          <button class="btn bs bxs" onclick="App.printOrder('${e.id}','${l.id}')">${t('orderPrint')}</button>
          ${canE?`<button class="btn bd bxs" onclick="App.delLeave('${l.id}')">×</button>`:''}
        </div></div>`).join('')
    :`<div class="tm">${t('mNoRec')}</div>`;

  const ph=(e.payments||[]).length
    ?(e.payments||[]).slice().sort((a,b)=>b.year-a.year||b.month-a.month).map(p=>`
      <div class="tmi"><span>${String(p.month).padStart(2,'0')}.${p.year}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <b class="tmn">${fN(p.amount)} ${cur}</b>
          ${canE?`<button class="btn bd bxs" onclick="App.delPay(${p.year},${p.month})">×</button>`:''}
        </div></div>`).join('')
    :`<div class="tm">${t('mNoPay')}</div>`;

  const prh=[
    ...(e.unpaidPeriods||[]).map((p,i)=>`
      <div class="tmi"><div><span class="bg bg-gr">${t('mUnp')}</span> ${fD(p.start)} — ${fD(p.end)}</div>
        ${canE?`<button class="btn bd bxs" onclick="App.delPer('unpaidPeriods',${i})">×</button>`:''}</div>`).join(''),
    ...(e.parentalPeriods||[]).map((p,i)=>`
      <div class="tmi"><div><span class="bg bg-gr">${t('mPar')}</span> ${fD(p.start)} — ${fD(p.end)}</div>
        ${canE?`<button class="btn bd bxs" onclick="App.delPer('parentalPeriods',${i})">×</button>`:''}</div>`).join('')
  ].join('')||`<div class="tm">${t('mNoPer')}</div>`;

  const slh=(e.sickLeaves||[]).length
    ?(e.sickLeaves||[]).slice().reverse().map((sl,idx)=>{
      const realIdx=e.sickLeaves.length-1-idx;
      const r=calcSick(e,sl.start,sl.end,{useEsv:sl.useEsv});
      if(!r)return '';
      return `<div class="tmi" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
          <div><span class="bg bg-o">${sl.type==='child'?t('sickTypeChild'):t('sickTypeSick')}</span>
            <b style="margin-left:6px">${fD(sl.start)} — ${fD(sl.end)}</b>
            <span class="bg bg-b" style="margin-left:6px">${r.days} ${t('tDays').toLowerCase()}</span></div>
          <div style="display:flex;gap:6px">
            <button class="btn bs bxs" onclick="App.printSick('${e.id}',${realIdx})">${t('sickPrint')}</button>
            <button class="btn bs bxs" onclick="App.exportSick('${e.id}',${realIdx})">${t('sickExport')}</button>
            ${canE?`<button class="btn bd bxs" onclick="App.delSick('${e.id}',${realIdx})">×</button>`:''}
          </div></div>
        <div style="font-size:12px;color:var(--g500)">
          ${t('sickAvg')}: <b>${fN(r.avg)} ${cur}</b> × ${r.pct}% = <b>${fN(r.dayPay)} ${cur}/${t('sickDays').toLowerCase()}</b>
          ${r.hasLimit?' · '+t('sickLimit'):''}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding-top:6px;border-top:1px dashed var(--g200)">
          <span>${t('sickTotal')}:</span><b style="color:var(--primary-d);font-size:15px">${fN(r.total)} ${cur}</b>
        </div></div>`;
    }).join('')
    :`<div class="tm">${t('sickNoRec')}</div>`;

  $('#emp-mb').innerHTML=`
    <div class="sg mb16">
      <div class="sc"><div class="scl">${t('mHired')}</div>
        <div class="scv scv-b" style="font-size:15px">${fD(e.hireDate)}</div></div>
      <div class="sc"><div class="scl">${t('mLeave')}</div>
        <div class="scv" style="font-size:15px">${e.baseLeaveDays} ${t('mPerY')}</div></div>
      <div class="sc"><div class="scl">${t('sickStazh')}</div>
        <div class="scv scv-b" style="font-size:15px">${stazh} ${t('sickYearShort')} · ${stazhPercent(stazh)}%</div></div>
      <div class="sc"><div class="scl">${t('mEarn')}</div><div class="scv scv-b">${er.toFixed(2)}</div></div>
      <div class="sc"><div class="scl">${t('mUsed')}</div><div class="scv scv-o">${us.toFixed(2)}</div></div>
      <div class="sc"><div class="scl">${t('mLeft')}</div>
        <div class="scv ${left>0?'scv-g':'scv-o'}">${left.toFixed(2)}</div></div>
    </div>
    <div class="c mb16" style="padding:14px;background:var(--g50);border:1px solid var(--g200);border-radius:10px">
      <div style="font-weight:700;margin-bottom:8px">👤 ${t('ctrPos')} / 🏢 Відділ</div>
      <div class="fr" style="gap:10px">
        <div class="ff" style="flex:1"><label>${t('ctrPos')}</label>
          <input type="text" id="emp-position" value="${escH(e.position||'')}" placeholder="Менеджер" ${canE?'':'disabled'}></div>
        <div class="ff" style="flex:1"><label>Відділ</label>
          <select id="emp-department" style="width:100%" ${canE?'':'disabled'}></select></div>
      </div>
      ${canE?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn bp bsm" type="button" onclick="App.saveEmployeePosition()">${t('ctrPosSave')}</button>
        <button class="btn bs bsm" type="button" onclick="App.saveEmployeeDepartment()">Зберегти відділ</button>
      </div>`:'<div class="tsm tmu" style="margin-top:8px">Тільки перегляд</div>'}
    </div>
    <div class="c mb16" style="padding:14px;background:var(--g50);border:1px solid var(--g200);border-radius:10px">
      <div style="font-weight:700;margin-bottom:8px">📁 Проекти співробітника</div>
      <select id="emp-projects" multiple size="4" style="width:100%">${(window.NexusCore?NexusCore.getProjects():[]).filter(p=>p.status!=='cancelled').map(p=>`<option value="${p.id}" ${(Array.isArray(e.projectIds)?e.projectIds:(e.projectId?[e.projectId]:[])).includes(p.id)?'selected':''}>${p.code} — ${p.name}</option>`).join('')}</select>
      ${canE?`<div style="margin-top:8px"><button class="btn bp bsm" onclick="App.saveEmployeeProjects()">Зберегти проекти</button></div>`:'<div class="tsm tmu">Тільки перегляд</div>'}
    </div>
    ${(()=>{
      const c=ensureContract(e);const st=contractStatus(e);
      return `<div class="c mb16" style="padding:14px;background:var(--g50);border:1px solid var(--g200);border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <div style="font-weight:700">${t('ctrT')}</div>
        ${contractBadge(e)}
      </div>
      <div class="fr" style="gap:10px">
        <div class="ff"><label>${t('ctrNum')}</label>
          <input type="text" id="ctr-num" value="${escH(c.number||'')}" placeholder="ТД-001" ${canE?'':'disabled'}></div>
        <div class="ff"><label>${t('ctrType')}</label>
          <select id="ctr-type" ${canE?'':'disabled'} onchange="App.onContractTypeChange()">
            <option value="indefinite" ${c.type!=='fixed'?'selected':''}>${t('ctrIndef')}</option>
            <option value="fixed" ${c.type==='fixed'?'selected':''}>${t('ctrFixed')}</option>
          </select></div>
        <div class="ff"><label>${t('ctrSigned')}</label>
          <input type="date" id="ctr-signed" value="${escH(c.signedAt||e.hireDate||'')}" ${canE?'':'disabled'}></div>
        <div class="ff" id="ctr-end-wrap" style="${c.type==='fixed'||c.endAt?'':'opacity:.55'}">
          <label>${t('ctrEnd')}</label>
          <input type="date" id="ctr-end" value="${escH(c.endAt||'')}" ${canE?'':'disabled'}></div>
      </div>
      <div class="ff" style="margin-top:8px"><label>${t('ctrNote')}</label>
        <input type="text" id="ctr-note" value="${escH(c.note||'')}" placeholder="—" ${canE?'':'disabled'}></div>
      <div class="tsm tmu" style="margin-top:6px">${t('ctrHint')}</div>
      ${st.key==='soon'?`<div class="cc cc-w" style="margin-top:10px">⚠️ ${t('ctrSoon')}: ${t('ctrDaysLeft',{n:st.days})} (${fD(c.endAt)})</div>`:''}
      ${st.key==='expired'?`<div class="cc cc-w" style="margin-top:10px">⛔ ${t('ctrExpired')}: ${fD(c.endAt)}</div>`:''}
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button class="btn bs bsm" type="button" onclick="App.printContract('${e.id}')">${t('ctrPreview')}</button>
        ${canE?`<button class="btn bp bsm" type="button" onclick="App.saveEmployeeContract()">${t('ctrSave')}</button>`:''}
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--g200)">
        <div style="font-weight:600;margin-bottom:6px">${t('ctrText')}</div>
        <div class="tsm tmu" style="margin-bottom:6px">${t('ctrTextHint')}</div>
        <textarea id="ctr-fulltext" rows="12" style="width:100%;font-family:inherit;font-size:13px;line-height:1.45;padding:10px;border:1px solid var(--g200);border-radius:8px;resize:vertical;background:var(--bg-card, #fff);color:inherit" ${canE?'':'readonly'}>${escH(c.fullText||'')}</textarea>
        ${canE?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn bs bsm" type="button" onclick="App.fillContractTemplate()">${t('ctrTextFill')}</button>
          <button class="btn bp bsm" type="button" onclick="App.saveContractText()">${t('ctrTextSave')}</button>
          <button class="btn bd bsm" type="button" onclick="App.resetContractText()">${t('ctrTextReset')}</button>
        </div>`:''}
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--g200)">
        <div style="font-weight:600;margin-bottom:6px">${t('ctrScan')}</div>
        ${c.scan&&c.scan.data
          ?`<div class="tsm" style="margin-bottom:8px">✅ ${escH(c.scan.name||'file')} · ${Math.round((c.scan.size||0)/1024)} КБ · ${c.scan.uploadedAt?fD(c.scan.uploadedAt):'—'}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button class="btn bs bsm" type="button" onclick="App.openContractScan('${e.id}')">${t('ctrScanOpen')}</button>
              ${canE?`<button class="btn bd bsm" type="button" onclick="App.removeContractScan()">${t('ctrScanDel')}</button>`:''}
            </div>`
          :`<div class="tsm tmu" style="margin-bottom:8px">${t('ctrScanNone')}</div>
            ${canE?`<label class="btn bs bsm" style="display:inline-block;cursor:pointer">
              ${t('ctrScanUp')}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" style="display:none" onchange="App.attachContractScan(event)">
            </label>`:''}`}
      </div>
      ${canE?'':'<div class="tsm tmu" style="margin-top:8px">Тільки перегляд</div>'}
    </div>`;
    })()}
    ${reservationSectionHtml(e,canE)}
    ${cc.length?`<div class="cc cc-w mb16"><b>${t('mViol')}</b><br>${cc.map(c=>'• '+c).join('<br>')}</div>`
      :`<div class="cc cc-ok mb16">${t('mOk')}</div>`}

    <h3 style="font-size:14px;margin:20px 0 10px;font-weight:700">${t('sick')}</h3>
    ${slh}
    ${canE?`<div class="fr mt-8" style="align-items:flex-end">
      <div class="ff"><label>${t('sickFrom')}</label><input type="date" id="sl-s"></div>
      <div class="ff"><label>${t('sickTo')}</label><input type="date" id="sl-e"></div>
      <div class="ff"><label>${t('sickType')}</label>
        <select id="sl-t"><option value="sick">${t('sickTypeSick')}</option>
        <option value="child">${t('sickTypeChild')}</option></select></div>
      <div class="ff ffn" style="align-self:center">
        <label style="display:flex;gap:6px;align-items:center;font-weight:500;font-size:12px">
          <input type="checkbox" id="sl-esv" style="width:auto"> ${t('sickEsv')}</label></div>
      <div class="ff ffn"><label>&nbsp;</label>
        <button class="btn bp bsm" onclick="App.addSick()">${t('sickCalc')}</button></div>
    </div>`:''}

    <h3 style="font-size:14px;margin:20px 0 10px;font-weight:700">${t('mUsedL')}</h3>
    ${lh}
    ${canE?`<div class="fr mt-8" style="align-items:flex-end">
      <div class="ff"><label>${t('tStart')}</label><input type="date" id="nl-s"></div>
      <div class="ff"><label>${t('tEnd')}</label><input type="date" id="nl-e"></div>
      <div class="ff ffn"><label>&nbsp;</label>
        <button class="btn bp bsm" onclick="App.addLeave()">${t('mAdd')}</button></div>
    </div>`:''}

    <h3 style="font-size:14px;margin:20px 0 10px;font-weight:700">${t('mPay')}</h3>
    ${ph}
    ${canE?`<div class="fr mt-8" style="align-items:flex-end">
      <div class="ff ffn"><label>${t('mYear')}</label><input type="number" id="np-y" value="${new Date().getFullYear()}"></div>
      <div class="ff ffn"><label>${t('mMonth')}</label><input type="number" id="np-m" min="1" max="12" value="${new Date().getMonth()+1}"></div>
      <div class="ff"><label>${t('mAmt')}</label><input type="number" id="np-a" placeholder="20000"></div>
      <div class="ff ffn"><label>&nbsp;</label>
        <button class="btn bp bsm" onclick="App.addPay()">${t('mAdd')}</button></div>
    </div>`:''}

    <h3 style="font-size:14px;margin:20px 0 10px;font-weight:700">${t('mPerT')}</h3>
    <div class="tsm tmu mb16">${t('mPerH')}</div>
    ${prh}
    ${canE?`<div class="fr mt-8" style="align-items:flex-end">
      <div class="ff"><label>${t('mType')}</label>
        <select id="nper-t"><option value="unpaidPeriods">${t('mUnp2')}</option>
        <option value="parentalPeriods">${t('mPar2')}</option></select></div>
      <div class="ff"><label>${t('tStart')}</label><input type="date" id="nper-s"></div>
      <div class="ff"><label>${t('tEnd')}</label><input type="date" id="nper-e"></div>
      <div class="ff ffn"><label>&nbsp;</label>
        <button class="btn bp bsm" onclick="App.addPer()">${t('mAdd')}</button></div>
    </div>`:''}`;
  renderDepartmentSelects();
  const depSel=$('#emp-department');
  if(depSel) depSel.value=e.departmentId||'';
}

function addLeave(){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  const s=$('#nl-s').value,en=$('#nl-e').value;
  if(!s||!en){alert(t('aDates'));return}
  const d=cntD(s,en)-cntH(s,en);
  e.leaves.push({id:uid(),start:s,end:en,days:d,type:'annual'});
  save();renderModal();
}
function delLeave(id){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  e.leaves=e.leaves.filter(l=>l.id!==id);save();renderModal();
}
function addPay(){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  const y=Number($('#np-y').value),m=Number($('#np-m').value),a=Number($('#np-a').value);
  if(!y||!m||m<1||m>12||!a){alert(t('aFillYMA'));return}
  e.payments=(e.payments||[]).filter(p=>!(p.year===y&&p.month===m));
  e.payments.push({year:y,month:m,amount:a});save();renderModal();
}
function delPay(y,m){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  e.payments=(e.payments||[]).filter(p=>!(p.year===y&&p.month===m));save();renderModal();
}
function addPer(){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  const tt=$('#nper-t').value,s=$('#nper-s').value,en=$('#nper-e').value;
  if(!s||!en){alert(t('aDates'));return}
  (e[tt]=e[tt]||[]).push({start:s,end:en});save();renderModal();
}
function delPer(tt,i){if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  e[tt].splice(i,1);save();renderModal();
}

function addSick(){
  if(!reqEdit())return;
  const e=db.employees.find(x=>x.id===curEmpId);
  const s=$('#sl-s').value,en=$('#sl-e').value;
  const type=$('#sl-t').value;
  const useEsv=$('#sl-esv').checked;
  if(!s||!en){alert(t('aDates'));return}
  const r=calcSick(e,s,en,{useEsv});
  if(!r){alert(t('aDates'));return}
  e.sickLeaves=e.sickLeaves||[];
  e.sickLeaves.push({id:uid(),start:s,end:en,type,useEsv,
    total:r.total,dayPay:r.dayPay,days:r.days,pct:r.pct});
  save();renderModal();
  alert(t('sickSaved')+': '+fN(r.total)+' '+t('cur'));
}
function delSick(empId,idx){
  if(!reqEdit())return;
  if(!confirm(t('sickDel')))return;
  const e=db.employees.find(x=>x.id===empId);
  e.sickLeaves.splice(idx,1);save();renderModal();
}

function printSick(empId,idx){
  const e=db.employees.find(x=>x.id===empId);
  const sl=e.sickLeaves[idx];
  const r=calcSick(e,sl.start,sl.end,{useEsv:sl.useEsv});
  if(!r)return;
  const cur=t('cur');
  const w=window.open('','_blank','width=800,height=900');
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Likarnianyi</title>'+
    '<style>body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:750px;margin:0 auto}'+
    'h1{font-size:20px;border-bottom:2px solid #1e40af;padding-bottom:10px;color:#1e3a8a}'+
    'table{width:100%;border-collapse:collapse;margin-top:15px;font-size:13px}'+
    'td{padding:8px 12px;border-bottom:1px solid #ddd}'+
    'td:first-child{color:#666;width:60%}'+
    'td:last-child{text-align:right;font-weight:600;font-family:monospace}'+
    '.total{margin-top:20px;padding:16px;background:#eff6ff;border-radius:8px;display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1e3a8a}'+
    '.foot{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:11px;color:#888;text-align:center}'+
    '.sign{margin-top:60px;display:flex;justify-content:space-between}'+
    '.sign div{border-top:1px solid #333;padding-top:5px;width:200px;text-align:center;font-size:12px}'+
    '@media print{body{padding:20px}}</style></head><body>'+
    '<h1>Розрахунок лікарняного</h1>'+
    '<table>'+
      '<tr><td>Співробітник</td><td>'+e.fullName+'</td></tr>'+
      '<tr><td>Посада</td><td>'+(e.position||'—')+'</td></tr>'+
      '<tr><td>Страховий стаж</td><td>'+r.years+' '+t('sickYearShort')+' ('+r.pct+'%)</td></tr>'+
      '<tr><td>Період хвороби</td><td>'+fD(sl.start)+' — '+fD(sl.end)+'</td></tr>'+
      '<tr><td>Кількість днів</td><td>'+r.days+'</td></tr>'+
      '<tr><td>Середньоденна</td><td>'+fN(r.avg)+' '+cur+'</td></tr>'+
      '<tr><td>Оплата за день</td><td>'+fN(r.dayPay)+' '+cur+'</td></tr>'+
      '<tr><td>'+t('sickEmployer')+'</td><td>'+fN(r.empSum)+' '+cur+' ('+r.empDays+' д.)</td></tr>'+
      '<tr><td>'+t('sickFund')+'</td><td>'+fN(r.pfSum)+' '+cur+' ('+r.pfDays+' д.)</td></tr>'+
    '</table>'+
    '<div class="total"><span>'+t('sickTotal')+'</span><span>'+fN(r.total)+' '+cur+'</span></div>'+
    '<div class="sign"><div>Підпис роботодавця</div><div>Підпис працівника</div></div>'+
    '<div class="foot">NEXUS ENGENEERING · '+fD(today())+'</div>'+
    '<script>setTimeout(function(){window.print()},300)<\/script>'+
    '</body></html>';
  w.document.write(html);
  w.document.close();
}

function exportSick(empId,idx){
  const e=db.employees.find(x=>x.id===empId);
  const sl=e.sickLeaves[idx];
  const r=calcSick(e,sl.start,sl.end,{useEsv:sl.useEsv});
  if(!r)return;
  const rows=[
    ['ПІБ',e.fullName],['Посада',e.position||''],
    ['Страховий стаж',r.years+' р.'],['Відсоток',r.pct+'%'],
    ['Початок',sl.start],['Кінець',sl.end],['Днів',r.days],
    ['Середньоденна',r.avg.toFixed(2)],
    ['Оплата за день',r.dayPay.toFixed(2)],
    ['Роботодавець',r.empSum.toFixed(2)],
    ['ПФУ',r.pfSum.toFixed(2)],['Всього',r.total.toFixed(2)]
  ];
  const csv=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='likarnianyi-'+e.fullName.replace(/\s+/g,'_')+'-'+sl.start+'.csv';
  a.click();URL.revokeObjectURL(a.href);
}

function printOrder(empId,leaveId){
  const e=db.employees.find(x=>x.id===empId);
  if(!e)return;
  const l=(e.leaves||[]).find(x=>x.id===leaveId);
  if(!l)return;
  const hire=fISO(e.hireDate);
  const leaveStart=fISO(l.start);
  let wYearStart=new Date(hire);
  let guard=0;
  while(guard++<50){
    const nextYear=new Date(wYearStart);
    nextYear.setFullYear(nextYear.getFullYear()+1);
    nextYear.setDate(nextYear.getDate()-1);
    if(leaveStart<=nextYear)break;
    wYearStart=new Date(nextYear);
    wYearStart.setDate(wYearStart.getDate()+1);
  }
  const wYearEnd=new Date(wYearStart);
  wYearEnd.setFullYear(wYearEnd.getFullYear()+1);
  wYearEnd.setDate(wYearEnd.getDate()-1);

  const co=db.company||{};
  const orderNum=String(Math.floor(Math.random()*900)+100)+'-в';
  const orderDate=fD(today());
  const cityStr=co.city||'___________';
  const months=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];

  const html='<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8">'+
    '<title>Наказ П-3</title><style>'+
    '@page { size: A4; margin: 20mm 15mm; }'+
    'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; line-height: 1.4; }'+
    '.header { text-align: center; margin-bottom: 20px; }'+
    '.header .company { font-weight: bold; text-transform: uppercase; font-size: 13pt; }'+
    '.header .edrpou { font-size: 11pt; margin-top: 4px; }'+
    '.header .form-name { font-size: 11pt; margin-top: 10px; }'+
    '.header .form-code { font-size: 10pt; }'+
    '.order-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 30px 0 20px; }'+
    '.order-line { display: flex; justify-content: space-between; margin-bottom: 20px; }'+
    '.field { margin-bottom: 14px; }'+
    '.field .label { display: inline-block; min-width: 200px; vertical-align: top; }'+
    '.value-inline { border-bottom: 1px solid #000; padding: 0 6px; display: inline-block; min-width: 60px; }'+
    '.underline { border-bottom: 1px solid #000; display: inline-block; min-width: 150px; padding: 0 4px; }'+
    'table.info { width: 100%; border-collapse: collapse; margin: 16px 0; }'+
    'table.info th, table.info td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; }'+
    'table.info th { background: #f0f0f0; text-align: center; font-weight: bold; }'+
    '.signatures { display: flex; justify-content: space-between; margin-top: 50px; }'+
    '.signatures .sig { width: 45%; }'+
    '.signatures .sig .line { border-bottom: 1px solid #000; height: 25px; margin-bottom: 4px; }'+
    '.signatures .sig .caption { font-size: 10pt; color: #555; text-align: center; }'+
    '.acquaint { margin-top: 40px; padding-top: 20px; border-top: 1px solid #999; }'+
    '.print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #1e40af; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: sans-serif; }'+
    '@media print { .print-btn { display: none; } }'+
    '</style></head><body>'+
    '<button class="print-btn" onclick="window.print()">🖨️ Друкувати</button>'+
    '<div class="header">'+
      '<div class="company">'+(co.name||'ТОВ «NEXUS ENGENEERING»')+'</div>'+
      '<div class="edrpou">ЄДРПОУ: '+(co.edrpou||'___________')+'</div>'+
      '<div class="form-name">Типова форма № П-3</div>'+
      '<div class="form-code">ЗАТВЕРДЖЕНО<br>Наказ Держкомстату України<br>05.12.2008 № 489</div>'+
    '</div>'+
    '<div class="order-line">'+
      '<div>«'+cityStr+'»</div>'+
      '<div>№ <span class="value-inline">'+orderNum+'</span> від <span class="value-inline">'+orderDate+'</span></div>'+
    '</div>'+
    '<div class="order-title">НАКАЗ (РОЗПОРЯДЖЕННЯ)<br>про надання відпустки</div>'+
    '<table class="info"><tr>'+
      '<th style="width:40%;">Прізвище, ім\'я, по батькові</th>'+
      '<th style="width:30%;">Посада</th>'+
      '<th style="width:30%;">Структурний підрозділ</th></tr>'+
      '<tr><td>'+e.fullName+'</td><td>'+(e.position||'—')+'</td><td>—</td></tr></table>'+
    '<div class="field"><span class="label">Вид відпустки:</span><span class="underline">Щорічна основна</span></div>'+
    '<div class="field"><span class="label">Період роботи, за який надається відпустка:</span><br>'+
      'з «'+String(wYearStart.getDate()).padStart(2,'0')+'» '+months[wYearStart.getMonth()]+' '+wYearStart.getFullYear()+' р. '+
      'по «'+String(wYearEnd.getDate()).padStart(2,'0')+'» '+months[wYearEnd.getMonth()]+' '+wYearEnd.getFullYear()+' р.</div>'+
    '<div class="field"><span class="label">Кількість календарних днів відпустки:</span><span class="value-inline">'+l.days+'</span></div>'+
    '<div class="field"><span class="label">Дата початку відпустки:</span><span class="value-inline">'+fD(l.start)+'</span>'+
      '&nbsp;&nbsp;<span class="label" style="min-width:auto;">Дата закінчення:</span><span class="value-inline">'+fD(l.end)+'</span></div>'+
    '<div class="signatures">'+
      '<div class="sig"><div class="line"></div><div class="caption">Керівник підприємства</div></div>'+
      '<div class="sig"><div class="line"></div><div class="caption">'+(co.director||'ПІБ керівника')+'</div></div>'+
    '</div>'+
    '<div class="acquaint"><div style="display:flex;justify-content:space-between;">'+
      '<div>З наказом ознайомлений(а):</div><div>Підпис: _______________</div>'+
      '<div>«___» ____________ 20___ р.</div></div></div>'+
    '<div style="margin-top:30px;font-size:10pt;color:#666;text-align:center;">'+
      'Документ сформовано автоматично системою NEXUS ENGENEERING</div>'+
    '<script>setTimeout(function(){window.print()},500)<\/script>'+
    '</body></html>';

  const w=window.open('','_blank','width=900,height=1000');
  w.document.write(html);
  w.document.close();
}
function nH(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[''`]/g,"'")}
function pDate(v){
  if(v==null||v==='')return'';
  if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return tISO(d)}
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if(m){let[,d,mo,y]=m;if(y.length===2)y=(Number(y)>50?'19':'20')+y;
    return y.padStart(4,'0')+'-'+mo.padStart(2,'0')+'-'+d.padStart(2,'0')}
  const dt=new Date(s);if(!isNaN(dt))return tISO(dt);
  return'';
}
function pCat(r){
  const s=nH(r);if(!s)return'standard';
  if(/інвал|инвал|engel/.test(s))return/3|iii/.test(s)?'disabled_3':'disabled_1_2';
  if(/неповноліт|несовершеннолет|reşit/.test(s))return'minor';
  if(/педагог|освіт|учител|eğitim/.test(s))return'teacher';
  return'standard';
}

function fromWB(wb){
  const sn=wb.SheetNames[0],sh=wb.Sheets[sn];
  const rows=XLSX.utils.sheet_to_json(sh,{header:1,raw:true,defval:''});
  if(!rows.length)throw new Error(t('fileEmpty'));
  let hi=0;
  for(let i=0;i<Math.min(rows.length,10);i++){
    if(rows[i].filter(c=>String(c).trim()!=='').length>=2){hi=i;break}
  }
  const hs=rows[hi].map(nH);const ci={};
  hs.forEach((h,i)=>{const k=CMAP[h];if(k&&ci[k]===undefined)ci[k]=i});
  if(ci.fullName===undefined||ci.hireDate===undefined)throw new Error(t('noCols'));
  const imp=[],errs=[];
  for(let r=hi+1;r<rows.length;r++){
    const row=rows[r];
    if(!row||row.every(c=>String(c).trim()===''))continue;
    const fn=String(row[ci.fullName]||'').trim();
    if(!fn)continue;
    const hd=pDate(row[ci.hireDate]);
    if(!hd){errs.push(t('rowErr',{n:r+1,val:row[ci.hireDate]}));continue}
    const bd=ci.birthDate!==undefined?pDate(row[ci.birthDate]):'';
    const ct=ci.category!==undefined?pCat(row[ci.category]):'standard';
    let bl=ci.baseLeaveDays!==undefined?Number(row[ci.baseLeaveDays])||0:0;
    if(!bl){const mp={disabled_1_2:30,disabled_3:26,minor:31,teacher:56};bl=mp[ct]||db.baseLeaveDays}
    imp.push({
      id:uid(),fullName:fn,
      position:ci.position!==undefined?String(row[ci.position]||'').trim():'',
      hireDate:hd,birthDate:bd,baseLeaveDays:bl,
      insuranceYears:calcInsuranceYears(hd),category:ct,
      payments:[],leaves:[],unpaidPeriods:[],parentalPeriods:[],sickLeaves:[],
      createdAt:today()
    });
  }
  if(!imp.length)throw new Error(t('noValid'));
  let added=0,skip=0;
  imp.forEach(e=>{
    const d=db.employees.some(x=>x.fullName.toLowerCase()===e.fullName.toLowerCase()&&x.hireDate===e.hireDate);
    if(d){skip++;return}
    db.employees.push(e);added++;
  });
  save();renderEmp();refreshSel();renderDash();
  return{added,skip,errs,preview:imp.slice(0,10)};
}

function handleXls(f){
  if(!reqEdit())return;
  const st=$('#imp-status');
  st.innerHTML='<div class="tsm tmu m16">'+t('reading')+'</div>';
  $('#xls-preview').innerHTML='';
  const r=new FileReader();
  r.onload=e=>{
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array',cellDates:false});
      const res=fromWB(wb);
      let h='<div class="cc cc-ok m16">'+t('imported',{n:res.added})+(res.skip?' '+t('skip',{n:res.skip}):'')+'</div>';
      if(res.errs.length)h+='<div class="cc cc-w m8">'+t('warns')+'<br>'+res.errs.map(x=>'• '+x).join('<br>')+'</div>';
      st.innerHTML=h;
      if(res.preview.length){
        $('#xls-preview').innerHTML='<div class="m16"><div class="tsm tmu mb16">'+t('preview')+'</div>'+
          '<div style="max-height:300px;overflow:auto;border:1px solid var(--g200);border-radius:8px">'+
          '<table class="dt"><thead><tr><th>'+t('tName')+'</th><th>'+t('tPos')+'</th>'+
          '<th>'+t('tHire')+'</th><th>'+t('tLeave')+'</th><th>'+t('cat')+'</th></tr></thead><tbody>'+
          res.preview.map(p=>'<tr><td>'+p.fullName+'</td><td>'+(p.position||'—')+'</td>'+
            '<td>'+fD(p.hireDate)+'</td><td>'+p.baseLeaveDays+'</td><td>'+p.category+'</td></tr>').join('')+
          '</tbody></table></div></div>';
      }
    }catch(err){
      st.innerHTML='<div class="cc cc-w m16">'+t('impErr',{msg:err.message})+'</div>';
    }
  };
  r.onerror=()=>{st.innerHTML='<div class="tsm m16" style="color:var(--danger)">'+t('impReadErr')+'</div>'};
  r.readAsArrayBuffer(f);
}

function tpl(){
  const data=[
    ['ПІБ / ФИО / Ad Soyad','Посада / Должность / Pozisyon',
     'Дата прийняття / Дата приёма / İşe Alınma Tarihi',
     'Дата народження / Дата рождения / Doğum Tarihi',
     'Тривалість / Продолжительность / İzin Süresi',
     'Категорія / Категория / Kategori'],
    ['Петренко Олена Іванівна','Бухгалтер','2023-03-15','1990-05-20',24,'standard'],
    ['Ковальчук Іван Петрович','Інженер','2022-09-01','1985-11-10',30,'disabled_1_2'],
    ['Сидоренко Марія Олексіївна','Вчитель','2021-08-25','1988-02-14',56,'teacher']
  ];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:32},{wch:22},{wch:22},{wch:22},{wch:20},{wch:16}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Employees');
  XLSX.writeFile(wb,'nexus-hr-template.xlsx');
}

function expXls(){
  if(!db.employees.length){alert(t('aNoExp'));return}
  const data=[[t('tName'),t('tPos'),t('tHire'),t('birth'),t('leave'),t('cat'),t('tEarn'),t('tUsed'),t('tLeft')]];
  db.employees.forEach(e=>{
    const er=earned(e),us=used(e);
    data.push([e.fullName,e.position||'',e.hireDate,e.birthDate||'',e.baseLeaveDays,e.category,
      Number(er.toFixed(2)),Number(us.toFixed(2)),Number((er-us).toFixed(2))]);
  });
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:30},{wch:20},{wch:15},{wch:15},{wch:18},{wch:18},{wch:15},{wch:16},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'HR');
  XLSX.writeFile(wb,'nexus-hr-export-'+today()+'.xlsx');
}

function refreshSel(){
  const ps=window.NexusCore ? NexusCore.getProjects() : [];
  const ep=$('#e-projects'); if(ep){ const selected=new Set(Array.from(ep.selectedOptions||[]).map(o=>o.value)); ep.innerHTML=ps.filter(p=>p.status!=='cancelled').map(p=>'<option value="'+p.id+'">'+p.code+' — '+p.name+'</option>').join(''); Array.from(ep.options).forEach(o=>o.selected=selected.has(o.value)); }
  const o=db.employees.map(e=>'<option value="'+e.id+'">'+e.fullName+'</option>').join('');
  ['#ce','#me'].forEach(s=>{
    const el=$(s);if(!el)return;
    const c=el.value;
    el.innerHTML='<option value="">'+t('cSel')+'</option>'+o;
    if(c)el.value=c;
  });
}

function runCalc(){
  const id=$('#ce').value,s=$('#cs').value,d=Number($('#cd').value);
  if(!id||!s||!d){alert(t('aFillAll'));return}
  const e=db.employees.find(x=>x.id===id);
  const r=calcPay(e,s,d);
  const cur=t('cur');
  const mh=r.months.map(m=>'<div class="rr"><span class="rl">'+String(m.m).padStart(2,'0')+'.'+m.y+'</span>'+
    '<span class="rv">'+fN(m.amount)+' '+cur+'</span></div>').join('');
  $('#calc-out').innerHTML='<div class="res">'+
    '<div style="font-weight:700;margin-bottom:12px">'+t('cPer')+': '+fD(r.ps)+' — '+fD(r.pe)+'</div>'+
    '<div style="max-height:280px;overflow-y:auto;margin-bottom:12px">'+mh+'</div>'+
    '<div class="rr t"><span>'+t('cTotal')+'</span><span>'+fN(r.tot)+' '+cur+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('cCal')+'</span><span class="rv">'+r.cal+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('cHol')+'</span><span class="rv">'+r.hol+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('cCalc')+'</span><span class="rv">'+r.calc+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('cAvg')+'</span><span class="rv">'+fN(r.avg)+' '+cur+'</span></div>'+
    '<div class="rr t"><span>'+t('cPay',{n:d})+'</span><span>'+fN(r.pay)+' '+cur+'</span></div></div>';
}

function runComp(){
  const id=$('#me').value,d=$('#md').value;
  if(!id||!d){alert(t('aFillAll'));return}
  const e=db.employees.find(x=>x.id===id);
  const er=earned(e,d),us=used(e),cd=Math.max(0,er-us);
  const r=calcPay(e,d,1),ca=r.avg*cd;
  const cur=t('cur');
  $('#comp-out').innerHTML='<div class="res">'+
    '<div class="rr"><span class="rl">'+t('mDate')+'</span><span class="rv">'+fD(d)+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('mEarn')+'</span><span class="rv">'+er.toFixed(2)+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('mUsed')+'</span><span class="rv">'+us.toFixed(2)+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('mDays')+'</span><span class="rv">'+cd.toFixed(2)+'</span></div>'+
    '<div class="rr"><span class="rl">'+t('cAvg')+'</span><span class="rv">'+fN(r.avg)+' '+cur+'</span></div>'+
    '<div class="rr t"><span>'+t('mComp')+'</span><span>'+fN(ca)+' '+cur+'</span></div></div>';
}

function checkAll(){
  const i=[];
  db.employees.forEach(e=>comp(e).forEach(c=>i.push(e.fullName+': '+c)));
  if(i.length)alert(t('aViol')+i.join('\n'));
  else alert(t('aAllOk'));
}

function renderSet(){
  $('#set-base').value=db.baseLeaveDays;
  $('#set-hol').value=db.useHolidays?'1':'0';
  const ce=Auth.can('settings');
  $('#hol-list').innerHTML=db.holidays.length
    ?db.holidays.map((h,i)=>'<div class="tmi"><span><b class="tmn">'+h+'</b></span>'+
      (ce?'<button class="btn bd bxs" onclick="App.delHol('+i+')">×</button>':'')+'</div>').join('')
    :'<div class="tm">—</div>';
}

function renderCompany(){
  $('#co-name').value=db.company&&db.company.name?db.company.name:'';
  $('#co-edrpou').value=db.company&&db.company.edrpou?db.company.edrpou:'';
  $('#co-city').value=db.company&&db.company.city?db.company.city:'';
  $('#co-director').value=db.company&&db.company.director?db.company.director:'';
}

function saveCompany(){
  if(!reqSet())return;
  db.company={
    name:$('#co-name').value.trim(),
    edrpou:$('#co-edrpou').value.trim(),
    city:$('#co-city').value.trim(),
    director:$('#co-director').value.trim()
  };
  save();alert(t('aCoSave'));
}

function saveSet(){
  if(!reqSet())return;
  db.baseLeaveDays=Number($('#set-base').value)||LAW.MIN;
  db.useHolidays=$('#set-hol').value==='1';
  save();renderEmp();renderDash();renderSet();alert(t('aSave'));
}
function addHol(){
  if(!reqSet())return;
  const v=$('#new-hol').value.trim();
  if(!/^\d{2}-\d{2}$/.test(v)){alert(t('aFmt'));return}
  if(!db.holidays.includes(v))db.holidays.push(v);
  db.holidays.sort();save();
  $('#new-hol').value='';renderSet();renderEmp();renderDash();
}
function delHol(i){if(!reqSet())return;db.holidays.splice(i,1);save();renderSet();renderEmp();renderDash()}

function expJ(){
  const b=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='nexus-hr-backup-'+today()+'.json';
  a.click();URL.revokeObjectURL(a.href);
}
function impJ(ev){
  if(!reqSet()){ev.target.value='';return}
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d.employees)throw new Error(t('aBadFile'));
      db=d;if(!db.company)db.company={};
      save();renderAll();alert(t('aImp'));
    }catch(e){alert(t('aReadErr')+e.message)}
  };
  r.readAsText(f);ev.target.value='';
}
function clearAll(){
  if(!reqSet())return;
  if(!confirm(t('aConfClear')))return;
  localStorage.removeItem(STORAGE);
  db=loadDB();renderAll();alert(t('aClear'));
}

function loadDemo(){
  if(!reqEdit())return;
  const cy=new Date().getFullYear();
  const dm=[
    {fullName:'Петренко Олена Іванівна',position:'Бухгалтер',hireDate:cy-2+'-03-15',birthDate:'1990-05-20',baseLeaveDays:24,category:'standard'},
    {fullName:'Ковальчук Іван Петрович',position:'Інженер-програміст',hireDate:cy-1+'-09-01',birthDate:'1985-11-10',baseLeaveDays:30,category:'disabled_1_2'},
    {fullName:'Сидоренко Марія Олексіївна',position:'Вчитель математики',hireDate:cy-3+'-08-25',birthDate:'1988-02-14',baseLeaveDays:56,category:'teacher'}
  ];
  dm.forEach(d=>{
    const e=Object.assign({id:uid()},d);
    e.insuranceYears=calcInsuranceYears(d.hireDate);
    e.payments=[];e.leaves=[];e.unpaidPeriods=[];e.parentalPeriods=[];e.sickLeaves=[];
    e.createdAt=today();
    for(let i=0;i<12;i++){
      const dt=new Date();dt.setMonth(dt.getMonth()-i-1);
      e.payments.push({year:dt.getFullYear(),month:dt.getMonth()+1,amount:22000});
    }
    const ls=new Date();ls.setMonth(ls.getMonth()-6);
    e.leaves.push({id:uid(),start:tISO(ls),end:tISO(addD(ls,13)),days:14,type:'annual'});
    const ss=new Date();ss.setMonth(ss.getMonth()-2);
    const se=addD(ss,9);
    e.sickLeaves.push({id:uid(),start:tISO(ss),end:tISO(se),type:'sick',useEsv:false});
    db.employees.push(e);
  });
  save();renderAll();alert(t('aDemo'));
}

function renderAll(){
  refreshSel();
  applyRoles();renderDepartments();renderEmp();renderSet();renderCompany();
  refreshSel();renderDash();
  if(Auth.refreshUI)Auth.refreshUI();
}

function applyI18n(){
  $('#abs').textContent=t('brand');const brandSub=$('#brand-sub');if(brandSub)brandSub.textContent=t('brand');
  $('#lbu').textContent=t('user');$('#lbp').textContent=t('pwd');$('#lbc').textContent=t('pwdC');
  $('#nb-dash').textContent=t('navDash');$('#nb-emp').textContent=t('navEmp');
  $('#nb-imp').textContent=t('navImp');$('#nb-calc').textContent=t('navCalc');
  $('#nb-laws').textContent=t('navLaws');$('#nb-set').textContent=t('navSet');
  $('#t-dash').textContent=t('dashT');$('#t-dash-sub').textContent=t('dashS');$('#t-up').textContent=t('upc');
  $('#t-add').textContent=t('addT');$('#l-name').textContent=t('name');$('#l-pos').textContent=t('pos');
  $('#l-hire').textContent=t('hire');$('#l-birth').textContent=t('birth');$('#l-cat').textContent=t('cat');
  $('#l-leave').textContent=t('leave');$('#btn-add').textContent=t('addB');const bd=$('#btn-demo');if(bd)bd.textContent=t('demoB');
  $('#l-exp').textContent=t('exp');$('#t-list').textContent=t('listT');
  $('#c1').textContent=t('c1');$('#c2').textContent=t('c2');$('#c3').textContent=t('c3');
  $('#c4').textContent=t('c4');$('#c5').textContent=t('c5');
  $('#t-imp').textContent=t('impT');$('#t-imp-sub').textContent=t('impS');$('#t-dz').textContent=t('dropT');
  $('#t-dzh').textContent=t('dropH');$('#t-cols').textContent=t('cols');$('#t-tpl').textContent=t('tpl');
  $('#t-exp').textContent=t('expT');$('#t-exx').textContent=t('expX');$('#t-exj').textContent=t('expJ');$('#t-inj').textContent=t('impJ');
  $('#t-calc').textContent=t('calcT');$('#t-calc-sub').textContent=t('calcS');
  $('#l-cEmp').textContent=t('cEmp');$('#l-cStart').textContent=t('cStart');$('#l-cDays').textContent=t('cDays');
  $('#btn-calc').textContent=t('cB');
  $('#t-comp').textContent=t('compT');$('#l-mEmp').textContent=t('cEmp');
  $('#l-mDate').textContent=t('mDate');$('#btn-comp').textContent=t('cB');
  $('#t-laws').textContent=t('lawsT');$('#t-laws-sub').textContent=t('lawsS');$('#btn-check').textContent=t('checkB');
  $('#t-ref').textContent=t('refT');$('#t-ref-sub').textContent=t('refS');
  $('#th-n').textContent=t('nN');$('#th-v').textContent=t('nV');$('#th-b').textContent=t('nB');
  $('#t-users').textContent=t('users');$('#t-users-sub').textContent=t('usersH');$('#btn-add-u').textContent=t('addU');
  $('#t-set').textContent=t('setT');$('#l-base').textContent=t('setBase');$('#l-mode').textContent=t('setMode');
  $('#m1').textContent=t('setM1');$('#m2').textContent=t('setM2');$('#btn-save').textContent=t('setSave');
  $('#t-mil').textContent=t('setMil');
  $('#t-hol').textContent=t('holT');$('#t-hol-sub').textContent=t('holS');
  $('#l-hAdd').textContent=t('holAdd');$('#btn-hAdd').textContent=t('holB');
  $('#t-company').textContent=t('companyT');$('#t-company-h').textContent=t('companyH');
  $('#l-co-name').textContent=t('coName');$('#l-co-edrpou').textContent=t('coEdrpou');
  $('#l-co-city').textContent=t('coCity');$('#l-co-director').textContent=t('coDirector');
  $('#btn-save-co').textContent=t('coSave');
  $('#t-data').textContent=t('dataT');$('#t-dEx').textContent=t('expJ');
  $('#t-dIm').textContent=t('impJ');$('#t-clear').textContent=t('dataClear');
  $('#um-cp').textContent=t('chPwd');$('#um-lo').textContent=t('logout');
  renderLaws();renderNorms();
  $$('.lb,.auth-lb').forEach(b=>b.classList.toggle('active',b.dataset.lang===CL));
  document.title='NEXUS ENGENEERING - '+t('brand');
  const v=$('#app-version');if(v)v.textContent='NEXUS v'+APP_VERSION;
}

function renderLaws(){
  $('#laws-list').innerHTML=
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/504/96-вр" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">'+t('l504')+'</div><div class="li-d">'+t('l504d')+'</div><div class="li-n">№ 504/96-ВР</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/322-08" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">'+t('lkz')+'</div><div class="li-d">'+t('lkzd')+'</div><div class="li-n">№ 322-VIII</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/100-95-п" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">'+t('lp100')+'</div><div class="li-d">'+t('lp100d')+'</div><div class="li-n">Постанова КМУ № 100</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/1266-2001-п" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">Порядок обчислення лікарняних</div><div class="li-d">Розрахунок лікарняних та декретних</div><div class="li-n">Постанова КМУ № 1266</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/v0489202-08" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">Типова форма № П-3</div><div class="li-d">Наказ про надання відпустки</div><div class="li-n">Наказ Держкомстату № 489</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/2136-20" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">'+t('l2136')+'</div><div class="li-d">'+t('l2136d')+'</div><div class="li-n">№ 2136-IX</div></div></a>'+
    '<a class="li" href="https://zakon.rada.gov.ua/laws/show/2352-20" target="_blank"><div class="li-i">📜</div>'+
      '<div><div class="li-t">'+t('l2352')+'</div><div class="li-d">'+t('l2352d')+'</div><div class="li-n">№ 2352-IX</div></div></a>'+
    '<a class="li" href="https://data.rada.gov.ua/open/data/laws" target="_blank"><div class="li-i">🗄️</div>'+
      '<div><div class="li-t">'+t('lportal')+'</div><div class="li-d">'+t('lportald')+'</div></div></a>';
}

function renderNorms(){
  $('#norms-body').innerHTML=
    '<tr><td>'+t('n1')+'</td><td><b>24</b></td><td>'+t('b6')+'</td></tr>'+
    '<tr><td>'+t('n2')+'</td><td><b>30</b></td><td>'+t('b6')+'</td></tr>'+
    '<tr><td>'+t('n3')+'</td><td><b>26</b></td><td>'+t('b6')+'</td></tr>'+
    '<tr><td>'+t('n4')+'</td><td><b>31</b></td><td>'+t('b6')+'</td></tr>'+
    '<tr><td>'+t('n5')+'</td><td><b>56</b></td><td>'+t('b6')+'</td></tr>'+
    '<tr><td>'+t('n6')+'</td><td><b>59</b></td><td>'+t('b10')+'</td></tr>'+
    '<tr><td>'+t('n7')+'</td><td><b>14</b></td><td>'+t('b12')+'</td></tr>'+
    '<tr><td>'+t('n8')+'</td><td><b>'+t('n8v')+'</b></td><td>'+t('b10')+'</td></tr>'+
    '<tr><td>'+t('n9')+'</td><td><b>'+t('n9v')+'</b></td><td>'+t('bp100')+'</td></tr>'+
    '<tr><td>'+t('n10')+'</td><td><b>'+t('n10v')+'</b></td><td>'+t('b25')+'</td></tr>'+
    '<tr><td>Стаж до 3 років → 50%</td><td><b>50%</b></td><td>ст. 24 Закону № 1105</td></tr>'+
    '<tr><td>Стаж 3–5 років → 60%</td><td><b>60%</b></td><td>ст. 24 Закону № 1105</td></tr>'+
    '<tr><td>Стаж 5–8 років → 70%</td><td><b>70%</b></td><td>ст. 24 Закону № 1105</td></tr>'+
    '<tr><td>Стаж >8 років → 100%</td><td><b>100%</b></td><td>ст. 24 Закону № 1105</td></tr>'+
    '<tr><td>Перші 5 днів оплачує роботодавець</td><td><b>5 днів</b></td><td>ст. 22 Закону № 1105</td></tr>'+
    '<tr><td>Макс. база ЄСВ 2026</td><td><b>172 940 грн</b></td><td>Закон № 1105</td></tr>'+
    '<tr><td>Макс. середньоденна для лікарняного</td><td><b>5 681,34 грн</b></td><td>Порядок № 1266</td></tr>';
}

function initLang(){
  $$('.lb,.auth-lb').forEach(b=>b.addEventListener('click',()=>{
    CL=b.dataset.lang;
    localStorage.setItem(LK,CL);
    applyI18n();
    if(Auth.getC())renderAll();
    Auth.refreshUI();
  }));
}

function init(){
  applyI18n();
  initTabs();
  initLang();
  const d=new Date();
  const cs=$('#cs'); if(cs) cs.value=tISO(d);
  const md=$('#md'); if(md) md.value=tISO(d);

  const hI=$('#eh');
  if(hI)hI.addEventListener('change',()=>{
    const h=hI.value;
    if(!h){$('#ee').value=0;$('#ee-hint').textContent='';return}
    const y=calcInsuranceYears(h);
    $('#ee').value=y;
    $('#ee-hint').textContent=t('expHint')+': '+y+' '+t('sickYearShort');
  });

  const pi=$('#ap');
  if(pi)pi.addEventListener('input',()=>{
    const b=$('#pwd-sb'),p=pi.value;
    b.className='pwd-sb';
    if(!p)return;
    let s=0;
    if(p.length>=6)s++;if(p.length>=10)s++;
    if(/[A-ZА-Я]/.test(p))s++;if(/[0-9]/.test(p))s++;
    if(/[^A-Za-zА-Яа-я0-9]/.test(p))s++;
    if(s<=2)b.classList.add('weak');
    else if(s<=3)b.classList.add('medium');
    else b.classList.add('strong');
  });

  const dz=$('#dz'),xi=$('#xls-in');
  if(dz&&xi){
    dz.addEventListener('click',()=>xi.click());
    xi.addEventListener('change',e=>{
      if(e.target.files[0])handleXls(e.target.files[0]);
      e.target.value='';
    });
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{
      e.preventDefault();e.stopPropagation();dz.classList.add('dg');
    }));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{
      e.preventDefault();e.stopPropagation();dz.classList.remove('dg');
    }));
    dz.addEventListener('drop',e=>{
      const f=e.dataTransfer.files[0];
      if(f)handleXls(f);
    });
  }

  Auth.init();
  Auth.initTrack();
  window.addEventListener('hashchange',applyTabFromHash);
  console.log('%c NEXUS v'+APP_VERSION+' ','background:#1e40af;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold');
}

return{
  addEmployee:addEmp,delEmp,filterEmp,openEmp,closeModal,
  addLeave,delLeave,addPay,delPay,addPer,delPer,
  addSick,delSick,printSick,exportSick,printOrder,
  runCalc,runComp,checkAll,loadDemo,
  exportExcel:expXls,downloadTemplate:tpl,
  exportJSON:expJ,importJSON:impJ,
  saveSettings:saveSet,addHoliday:addHol,delHol,clearAll,
  saveCompany,renderAll,init,handleXls,saveEmployeeProjects,saveEmployeeContract,onContractTypeChange,
  printContract,attachContractScan,openContractScan,removeContractScan,
  fillContractTemplate,saveContractText,resetContractText,saveEmployeePosition,
  saveDepartment,editDepartment,cancelDepartmentEdit,openDepartmentForm,closeDepartmentForm,openEmployeeForm,closeEmployeeForm,saveEmployeeDepartment,
  saveEmployeeReservation
};
})();
window.App=App;

document.addEventListener('DOMContentLoaded',()=>{
  try{App.init()}catch(e){console.error(e);alert('Помилка: '+e.message)}
});