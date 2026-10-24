/* NEXUS ENGENEERING — Projects v1.0 */
const Projects = (() => {
  const KEY='nexus_projects_v1', USERS='nexus_users_v1', SESSION='nexus_session_v1';
  const DOC='nexus_documents_v1', INV='nexus_inventory_v1', HR='nexus_hr_ua_v2', TASK='nexus_tasks_v1', FIN='nexus_finance_v1';
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  let db=load(), editingId=null;
  const STATUS={planning:['Планування','bg-b'],active:['Активний','bg-g'],paused:['Призупинено','bg-o'],done:['Завершено','bg-gr'],cancelled:['Скасовано','bg-r']};
  function load(){const d=read(KEY);return d&&Array.isArray(d.projects)?d:{projects:[],meta:{version:'1.0',created:new Date().toISOString().slice(0,10)}}}
  function save(){localStorage.setItem(KEY,JSON.stringify(db)); if(window.NexusCore) NexusCore.audit('project.save','project',{count:db.projects.length});}
  function user(){const s=read(SESSION);if(!s?.userId)return null;return (read(USERS)||[]).find(x=>x.id===s.userId)||null}
  function canEdit(){return !!user()&&user().role!=='viewer'}
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const fmt=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(Number(n)||0);
  function getData(key,prop){const d=read(key);return d&&Array.isArray(d[prop])?d[prop]:[]}
  function getEmployees(){const d=read(HR);return d&&Array.isArray(d.employees)?d.employees.slice().sort((a,b)=>(a.fullName||'').localeCompare(b.fullName||'')):[]}
  function getContracts(){return getData(DOC,'docs').filter(d=>d.type==='contract').slice().sort((a,b)=>String(a.num||a.name||'').localeCompare(String(b.num||b.name||''),'uk'));}
  function fillContractSelect(selected=''){const el=document.getElementById('f-contract');if(!el)return;const contracts=getContracts();el.innerHTML='<option value="">— оберіть договір —</option>'+contracts.map(d=>`<option value="${esc(d.id)}">${esc(d.num?`Договір № ${d.num} — ${d.name||'Без назви'}`:(d.name||'Договір без номера'))}</option>`).join('');if(selected)el.value=selected;contractChanged();}
  function contractChanged(){const id=document.getElementById('f-contract')?.value||'';const c=getContracts().find(d=>d.id===id);const amount=document.getElementById('f-amount'),customer=document.getElementById('f-customer'),currency=document.getElementById('f-currency'),start=document.getElementById('f-start'),end=document.getElementById('f-end');if(amount)amount.value=c?(Number(c.amount)||0):0;if(customer)customer.value=c?(c.counter||''):'';if(currency)currency.value=c?(c.currency||'UAH'):'UAH';if(start)start.value=c?(c.date||''):'';if(end)end.value=c?(c.until||''):'';fillAddendumSelect();}
  function getAddendumsForContract(contractId){
    if(!contractId) return [];
    return getData(DOC,'docs').filter(d=>d.type==='addendum'&&d.parentContractId===contractId)
      .slice().sort((a,b)=>String(a.num||a.name||'').localeCompare(String(b.num||b.name||''),'uk'));
  }
  function fillAddendumSelect(selected=''){
    const el=document.getElementById('f-addendum');
    if(!el)return;
    const contractId=document.getElementById('f-contract')?.value||'';
    const list=getAddendumsForContract(contractId);
    const hint=document.getElementById('addendum-hint');
    if(!contractId){
      el.innerHTML='<option value="">— спочатку оберіть договір —</option>';
      el.disabled=true;
      if(hint)hint.textContent='Спочатку оберіть договір — тоді з’являться додатки саме до нього.';
    } else if(!list.length){
      el.innerHTML='<option value="">— додатків до цього договору немає —</option>';
      el.disabled=true;
      if(hint)hint.textContent='Для обраного договору додатків у «Документообігу» ще немає.';
    } else {
      el.disabled=false;
      el.innerHTML='<option value="">— без додатка —</option>'+list.map(d=>{
        const label=d.num?`Додаток № ${d.num} — ${d.name||'Без назви'}`:(d.name||'Додаток без номера');
        return `<option value="${esc(d.id)}">${esc(label)}</option>`;
      }).join('');
      if(selected) el.value=selected;
      if(hint)hint.textContent='Оберіть додаток, якщо проект ведеться саме по ньому (необов’язково).';
    }
    addendumChanged();
  }
  function addendumChanged(){
    const id=document.getElementById('f-addendum')?.value||'';
    const contractId=document.getElementById('f-contract')?.value||'';
    const a=id?getAddendumsForContract(contractId).find(d=>d.id===id):null;
    const amount=document.getElementById('f-addendum-amount');
    const date=document.getElementById('f-addendum-date');
    const until=document.getElementById('f-addendum-until');
    if(amount)amount.value=a?(Number(a.amount)||0):0;
    if(date)date.value=a?(a.date||''):'';
    if(until)until.value=a?(a.until||''):'';
    recalcProjectAmount();
  }
  function recalcProjectAmount(){
    const cAmt=Number(document.getElementById('f-amount')?.value)||0;
    const aAmt=Number(document.getElementById('f-addendum-amount')?.value)||0;
    const src=document.getElementById('f-amount-source')?.value||'contract';
    let total=cAmt;
    if(src==='addendum') total=aAmt;
    else if(src==='sum') total=cAmt+aAmt;
    const el=document.getElementById('f-project-amount');
    if(el) el.value=total;
    return total;
  }
  function toggleAddendum(){
    const body=document.getElementById('addendum-body');
    const icon=document.getElementById('addendum-toggle-icon');
    if(!body)return;
    const open=!body.classList.contains('hidden');
    if(open){body.classList.add('hidden');if(icon)icon.textContent='▾';}
    else{body.classList.remove('hidden');if(icon)icon.textContent='▴';}
  }
  function showAddendumSection(open){
    const body=document.getElementById('addendum-body');
    const icon=document.getElementById('addendum-toggle-icon');
    if(!body)return;
    if(open){body.classList.remove('hidden');if(icon)icon.textContent='▴';}
    else{body.classList.add('hidden');if(icon)icon.textContent='▾';}
  }
  function fillManagerSelect(selected=''){
    const sel=document.getElementById('f-manager');
    if(!sel)return;
    const current=selected||sel.value||'';
    const emps=getEmployees();
    sel.innerHTML='<option value="">— не вказано —</option>'+emps.map(e=>`<option value="${esc(e.id)}">${esc(e.fullName||e.username||'Працівник')}</option>`).join('');
    if(current){
      const match=emps.find(e=>e.id===current||(e.fullName||'')===current);
      sel.value=match?match.id:'';
    }
  }
  function refs(p){
    const all=getData(DOC,'docs');
    const extra=new Set([p&&p.contractId,p&&p.addendumId].filter(Boolean));
    const docs=all.filter(x=>x&&(x.projectId===p.id||(!x.projectId&&p.code&&x.projectCode===p.code)||extra.has(x.id)||(p.contractId&&x.parentContractId===p.contractId)));
    const inv=getData(INV,'items').filter(x=>x.projectId===p.id);
    const emps=getData(HR,'employees').filter(x=>Array.isArray(x.projectIds)?x.projectIds.includes(p.id):x.projectId===p.id);
    const tasks=getData(TASK,'tasks').filter(x=>x.projectId===p.id);
    const ops=getData(FIN,'ops').filter(x=>x.projectId===p.id);
    const contracts=docs.filter(x=>x.type==='contract');
    const seen=new Set();
    const contractSum=contracts.reduce((sum,x)=>{
      if(x.id&&seen.has(x.id))return sum;
      if(x.id)seen.add(x.id);
      return sum+(Number(x.amount)||0);
    },0);
    return {docs,contracts,contractSum,inv,emps,tasks,ops};
  }
  function linkProjectDocs(p, prev){
    const raw=read(DOC);
    if(!raw||!Array.isArray(raw.docs))return;
    const ids=new Set([p.contractId,p.addendumId].filter(Boolean));
    const prevContract=prev&&prev.contractId;
    let changed=false;
    raw.docs.forEach(d=>{
      if(!d||!d.id)return;
      const belongs=ids.has(d.id)||(p.contractId&&d.parentContractId===p.contractId);
      const was=prev&&(d.id===prev.contractId||d.id===prev.addendumId||(prevContract&&d.parentContractId===prevContract));
      if(belongs){
        if(d.projectId!==p.id||d.projectCode!==(p.code||'')||d.projectName!==(p.name||'')){
          d.projectId=p.id; d.projectCode=p.code||''; d.projectName=p.name||''; changed=true;
        }
      }else if(was&&prev&&d.projectId===prev.id){
        d.projectId=''; d.projectCode=''; d.projectName=''; changed=true;
      }
    });
    if(changed){ try{ localStorage.setItem(DOC, JSON.stringify(raw)); }catch(e){} }
  }
  function fillSelect(id,selected){const el=document.getElementById(id);if(!el)return;el.innerHTML='<option value="">— без проекту —</option>'+db.projects.filter(p=>p.status!=='cancelled').sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${esc(p.id)}">${esc(p.code)} — ${esc(p.name)}</option>`).join('');if(selected)el.value=selected;}
  function reset(){editingId=null;['f-code','f-name','f-contract','f-addendum','f-addendum-amount','f-addendum-date','f-addendum-until','f-manager','f-start','f-end','f-amount','f-project-amount','f-customer','f-description'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});const manager=document.getElementById('f-manager');if(manager)manager.value='';document.getElementById('f-status').value='planning';document.getElementById('f-currency').value='UAH';const as=document.getElementById('f-amount-source');if(as)as.value='contract';document.getElementById('form-title').textContent='Новий проект';document.getElementById('btn-save').textContent='Створити проект';const br=document.getElementById('btn-reset');if(br)br.style.display='';showAddendumSection(false);fillContractSelect();}

  function saveProject(){if(!canEdit()){alert('Недостатньо прав.');return}const contractId=document.getElementById('f-contract').value;const contract=getContracts().find(d=>d.id===contractId);if(!contract){alert('Оберіть договір для проекту');return}const addendumId=document.getElementById('f-addendum')?.value||'';const addendum=addendumId?getAddendumsForContract(contractId).find(d=>d.id===addendumId):null;const managerId=document.getElementById('f-manager').value;const managerName=managerId?(getEmployees().find(e=>e.id===managerId)?.fullName||''):'';const code=String(document.getElementById('f-code')?.value||'').trim();const name=String(document.getElementById('f-name')?.value||'').trim();if(!code||!name){alert('Вкажіть код і назву проекту');return}const prev=editingId?db.projects.find(x=>x.id===editingId)||null:null;const p={id:editingId||'prj_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),code:code||('PRJ-'+Date.now()),name,contractId,contractName:contract.name||'',contractNum:contract.num||'',addendumId:addendum?addendum.id:'',addendumNum:addendum?(addendum.num||''):'',addendumName:addendum?(addendum.name||''):'',customer:contract.counter||'',manager:managerName,managerId:managerId||'',start:document.getElementById('f-start').value,end:document.getElementById('f-end').value,status:document.getElementById('f-status').value,currency:contract.currency||'UAH',amountSource:(document.getElementById('f-amount-source')?.value||'contract'),contractAmount:recalcProjectAmount(),addendumAmount:addendum?(Number(addendum.amount)||0):0,description:document.getElementById('f-description').value.trim(),updatedAt:new Date().toISOString()};if(editingId){const i=db.projects.findIndex(x=>x.id===editingId);if(i>=0)db.projects[i]=p}else{p.createdAt=new Date().toISOString();db.projects.push(p)}linkProjectDocs(p, prev);save();reset();hideForm();render();fillProjectSelectors();}

  function edit(id){const p=db.projects.find(x=>x.id===id);if(!p)return;editingId=id;fillContractSelect(p.contractId||'');fillAddendumSelect(p.addendumId||'');for(const [fid,val] of [['f-code',p.code],['f-name',p.name],['f-customer',p.customer],['f-description',p.description]]){const e=document.getElementById(fid);if(e)e.value=val||''}fillManagerSelect(p.managerId||p.manager||'');document.getElementById('f-status').value=p.status||'planning';document.getElementById('f-currency').value=p.currency||'UAH';const as=document.getElementById('f-amount-source');if(as)as.value=p.amountSource||'contract';recalcProjectAmount();document.getElementById('form-title').textContent='Редагувати проект';document.getElementById('btn-save').textContent='Зберегти зміни';const br=document.getElementById('btn-reset');if(br)br.style.display='';if(p.addendumId)showAddendumSection(true);else showAddendumSection(false);showForm();window.scrollTo({top:0,behavior:'smooth'});}
  function del(id){if(!canEdit())return;const p=db.projects.find(x=>x.id===id);if(!p)return;const r=refs(p);if(r.docs.length||r.inv.length||r.emps.length||r.tasks.length||r.ops.length){alert('Проект має повʼязані дані. Спочатку змініть їх проект або переведіть проект у «Скасовано». Видалення заблоковано.');return}if(confirm(`Видалити проект «${p.name}»?`)){db.projects=db.projects.filter(x=>x.id!==id);save();render();fillProjectSelectors();}}
  function open(id){const p=db.projects.find(x=>x.id===id);if(!p)return;const r=refs(p), st=STATUS[p.status]||STATUS.planning;
    const amountSrc={contract:'Сума договору',addendum:'Сума додатку',sum:'Договір + додаток'}[p.amountSource]||'Сума договору';
    document.getElementById('detail-title').textContent=`${p.code} — ${p.name}`;
    document.getElementById('detail-body').innerHTML=`<div class="proj-hero"><div><div class="proj-code">${esc(p.code)}</div><h2>${esc(p.name)}</h2><div class="proj-muted">${esc(p.customer||'Замовник не вказаний')}</div></div><span class="bg ${st[1]}">${st[0]}</span></div><div class="proj-kpis"><div><b>${r.emps.length}</b><span>Персонал</span></div><div><b>${r.inv.length}</b><span>Інвентар</span></div><div><b>${r.contracts.length}</b><span>Договори</span></div><div><b>${r.tasks.length}</b><span>Задачі</span></div><div><b>${fmt(r.ops.reduce((s,x)=>s+(Number(x.amount)||0)*(x.type==='expense'?-1:1),0))} ₴</b><span>Фінансовий рух</span></div></div><div class="proj-grid"><div><h3>Основна інформація</h3>${row('Керівник',p.manager)}${row('Період',p.start||p.end?`${p.start||'—'} — ${p.end||'—'}`:'—')}${row('Договір',p.contractNum||p.contractName?`${p.contractNum?`№ ${p.contractNum}`:''}${p.contractName?` — ${p.contractName}`:''}`:'—')}${row('Додаток',p.addendumNum||p.addendumName?`${p.addendumNum?`№ ${p.addendumNum}`:''}${p.addendumName?` — ${p.addendumName}`:''}`:'—')}${row('Сума рахується як',amountSrc)}${row('Сума проекту',p.contractAmount?fmt(p.contractAmount)+' '+(p.currency||'UAH'):'—')}${row('Опис',p.description)}</div><div><h3>Повʼязані дані</h3><div class="rel-list"><a href="documents.html">📄 ${r.contracts.length} договорів · ${r.docs.length} документів</a><a href="inventory.html">📦 ${r.inv.length} одиниць інвентарю</a><a href="hr.html">👥 ${r.emps.length} співробітників</a><a href="tasks.html">✅ ${r.tasks.length} задач</a></div></div></div>`;
    document.getElementById('detail-modal').classList.add('vis');}
  function row(a,b){return `<div class="detail-row"><span>${a}</span><b>${esc(b||'—')}</b></div>`}
  function close(){document.getElementById('detail-modal').classList.remove('vis')}
  function render(){const q=(document.getElementById('search')?.value||'').toLowerCase();const status=document.getElementById('filter-status')?.value||'';const list=db.projects.filter(p=>(!q||[p.code,p.name,p.customer,p.manager].join(' ').toLowerCase().includes(q))&&(!status||p.status===status));document.getElementById('count').textContent=list.length;document.getElementById('stats').innerHTML=stats();const el=document.getElementById('project-list');if(!list.length){el.innerHTML='<div class="empty">Проектів поки немає. Створіть перший проект вище.</div>';return}el.innerHTML=list.map(p=>card(p)).join('');}
  function card(p){const r=refs(p),st=STATUS[p.status]||STATUS.planning;const amount=Number(p.contractAmount)||0;const cur=esc(p.currency||'UAH');
    const docLine=[
      p.contractNum||p.contractName?`📝 Договір${p.contractNum?` № ${esc(p.contractNum)}`:''}${p.contractName?` — ${esc(p.contractName)}`:''}`:null,
      p.addendumId||p.addendumNum||p.addendumName?`📎 Додаток${p.addendumNum?` № ${esc(p.addendumNum)}`:''}${p.addendumName?` — ${esc(p.addendumName)}`:''}`:null
    ].filter(Boolean).join('<br>');
    return `<div class="project-card"><div class="project-card-head"><div><div class="project-code">${esc(p.code)}</div><h3>${esc(p.name)}</h3><div class="project-customer">${esc(p.customer||'Замовник не вказаний')}</div>${docLine?`<div class="project-muted" style="margin-top:6px;font-size:12.5px;line-height:1.45">${docLine}</div>`:''}</div><span class="bg ${st[1]}">${st[0]}</span></div><div class="project-meta"><span>👥 <b>${r.emps.length}</b> персоналу</span><span>📦 <b>${r.inv.length}</b> інвентарю</span><span>📝 <b>${r.contracts.length}</b> договорів</span><span>📄 <b>${r.docs.length}</b> документів</span><span>✅ <b>${r.tasks.length}</b> задач</span></div><div class="project-money"><div><small>Сума проекту</small><b>${amount?fmt(amount)+' '+cur:'—'}</b></div><div><small>Період</small><b>${esc(p.start||'—')} ${p.end?'→ '+esc(p.end):''}</b></div></div><div class="project-actions"><button class="btn bs bsm" onclick="Projects.open('${p.id}')">Переглянути</button><button class="btn bs bsm" onclick="Projects.edit('${p.id}')">Редагувати</button><button class="btn bd bsm" onclick="Projects.del('${p.id}')">Видалити</button></div></div>`}
  function stats(){const total=db.projects.length,active=db.projects.filter(p=>p.status==='active').length,done=db.projects.filter(p=>p.status==='done').length,amount=db.projects.reduce((s,p)=>s+(Number(p.contractAmount)||0),0);const contractTotal=db.projects.reduce((s,p)=>s+refs(p).contractSum,0);return `<div class="stat"><small>Всього проектів</small><b>${total}</b></div><div class="stat"><small>Активні</small><b>${active}</b></div><div class="stat"><small>Завершені</small><b>${done}</b></div><div class="stat"><small>Сума повʼязаних договорів</small><b>${fmt(contractTotal)} ₴</b></div>`}
  function fillProjectSelectors(){['f-project','t-project','fin-project','f-inv-project'].forEach(id=>fillSelect(id,document.getElementById(id)?.value||''));}
  function init(){if(window.NexusCore&&NexusCore.requireModule&&!NexusCore.requireModule('projects'))return;const u=user();if(!u){sessionStorage.setItem('nexus_redirect_after_login','projects.html');location.href='index.html';return}document.getElementById('av').textContent=(u.fullName||u.username).split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();document.getElementById('hun').textContent=u.fullName||u.username;document.getElementById('hur').textContent=({admin:'Адміністратор',manager:'Менеджер',viewer:'Перегляд'})[u.role]||u.role;document.documentElement.setAttribute('data-theme',localStorage.getItem('nexus_theme_v1')||'auto');fillManagerSelect();fillContractSelect();fillProjectSelectors();reset();render();document.querySelectorAll('.theme-btn').forEach(b=>b.onclick=()=>{const a=['light','dark','auto'],c=document.documentElement.getAttribute('data-theme')||'auto',n=a[(a.indexOf(c)+1)%3];document.documentElement.setAttribute('data-theme',n);localStorage.setItem('nexus_theme_v1',n)});}
  function openForm(){reset();const m=document.getElementById('project-form-modal');if(m)m.classList.add('vis');const title=document.getElementById('form-title');if(title)title.textContent='Новий проект';const bs=document.getElementById('btn-save');if(bs)bs.textContent='Створити проект';const br=document.getElementById('btn-reset');if(br)br.style.display='';setTimeout(()=>{const c=document.getElementById('f-code');if(c)c.focus();},100);}
  function closeForm(){const m=document.getElementById('project-form-modal');if(m)m.classList.remove('vis');reset();}
  function showForm(){const m=document.getElementById('project-form-modal');if(m)m.classList.add('vis');}
  function hideForm(){const m=document.getElementById('project-form-modal');if(m)m.classList.remove('vis');}
  function toggleForm(){openForm();}
  function cancelForm(){closeForm();}
  return {init,save:saveProject,reset,edit,del,open,close,render,fillProjectSelectors,contractChanged,addendumChanged,toggleAddendum,recalcProjectAmount,canEdit,toggleForm,hideForm,cancelForm,openForm,closeForm,showForm};
})();
window.Projects=Projects;document.addEventListener('DOMContentLoaded',Projects.init);
