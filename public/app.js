let me = null;
let contributors = [], expenses = [], users = [];
let tab = 'dash';

function fmt(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }
function esc(s){ return String(s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

async function api(path, opts={}) {
  const res = await fetch('/api'+path, {
    method: opts.method||'GET',
    headers: {'Content-Type':'application/json'},
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- Login ----------
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

async function doLogin(){
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const data = await api('/login', { method:'POST', body:{ username, password } });
    me = data.user;
    showApp();
  }catch(e){ errEl.textContent = e.message; }
}

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await api('/logout', { method:'POST' });
  me = null;
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginUsername').value='';
  document.getElementById('loginPassword').value='';
});

async function checkSession(){
  try{
    const data = await api('/me');
    if (data.user){ me = data.user; showApp(); }
  }catch(e){}
}

function showApp(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('roleBadge').textContent = me.role === 'admin' ? 'Admin' : 'Viewer';
  loadAll();
}

async function loadAll(){
  [contributors, expenses] = await Promise.all([ api('/contributors'), api('/expenses') ]);
  if (me.role === 'admin') users = await api('/users');
  render();
}

document.querySelectorAll('.tab[data-tab]').forEach(b=>b.addEventListener('click', ()=>{
  document.querySelectorAll('.tab[data-tab]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); tab = b.dataset.tab; render();
}));

function totals(){
  const collected = contributors.reduce((s,c)=>s+Number(c.amount||0),0);
  const spent = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  return { collected, spent, balance: collected-spent, count: contributors.length };
}
function isAdmin(){ return me && me.role === 'admin'; }
function isMe(c){ return me && c.user_id === me.id; }

function render(){
  const app = document.getElementById('app');
  const t = totals();
  if (tab==='dash') app.innerHTML = dashHTML(t);
  else if (tab==='contrib') app.innerHTML = contribHTML(t);
  else if (tab==='exp') app.innerHTML = expHTML(t);
  else if (tab==='sum') app.innerHTML = sumHTML(t);
  else app.innerHTML = accountHTML();
  wireEvents();
  if (window.lucide) lucide.createIcons();
}

function dashHTML(t){
  return `<div class="cards">
    <div class="card c-collect"><div class="icon-wrap"><i data-lucide="trending-up"></i></div><div class="v c-collect">${fmt(t.collected)}</div><div class="l">Total Collected</div></div>
    <div class="card c-count"><div class="icon-wrap"><i data-lucide="users"></i></div><div class="v">${t.count} People</div><div class="l">Contributors</div></div>
    <div class="card c-spend-card"><div class="icon-wrap"><i data-lucide="receipt"></i></div><div class="v c-spend">${fmt(t.spent)}</div><div class="l">Total Expenses</div></div>
    <div class="card c-bal-card"><div class="icon-wrap"><i data-lucide="wallet"></i></div><div class="v c-bal">${fmt(t.balance)}</div><div class="l">Remaining Balance</div></div>
  </div>
  <div class="section"><h2><i data-lucide="history"></i> Recent Contributors</h2>${miniTable(contributors.slice(0,5),'contrib')}</div>
  <div class="section"><h2><i data-lucide="history"></i> Recent Expenses</h2>${miniTable(expenses.slice(0,5),'exp')}</div>`;
}
function miniTable(list, kind){
  if (!list.length) return `<div class="empty">Nothing added yet.</div>`;
  if (kind==='contrib') return `<div class="scrollx"><table><tbody>${list.map(c=>`<tr class="${isMe(c)?'me':''}"><td>${esc(c.name)}</td><td>${fmt(c.amount)}</td><td>${c.date}</td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="scrollx"><table><tbody>${list.map(e=>`<tr><td>${esc(e.title)}</td><td>${fmt(e.amount)}</td><td>${e.date}</td></tr>`).join('')}</tbody></table></div>`;
}

function contribHTML(t){
  return `
  <div class="section">
    <h2><i data-lucide="users"></i> Contributors</h2>
    <div class="row">
      <input id="searchC" placeholder="Search name…" style="flex:1;min-width:140px">
      <select id="sortC"><option value="date">Sort: Date</option><option value="amount">Sort: Amount</option><option value="name">Sort: Name</option></select>
      ${isAdmin()?'<button id="addC"><i data-lucide="user-plus"></i> Add Contributor</button>':''}
    </div>
    <div class="muted small" style="margin-bottom:8px;">Total Contributors: ${t.count} &nbsp;•&nbsp; Total Collected: ${fmt(t.collected)}</div>
    <div class="scrollx"><table><thead><tr><th>Name</th><th>Amount</th><th>Date</th>${isAdmin()?'<th></th>':'<th></th>'}</tr></thead>
    <tbody id="cBody">${renderContribRows()}</tbody></table></div>
  </div>`;
}
function renderContribRows(){
  const sortKey = document.getElementById('sortC')?.value || 'date';
  let rows = [...contributors];
  if (sortKey==='amount') rows.sort((a,b)=>b.amount-a.amount);
  else if (sortKey==='name') rows.sort((a,b)=>a.name.localeCompare(b.name));
  else rows.sort((a,b)=>b.date.localeCompare(a.date));
  if (!rows.length) return `<tr><td colspan="4" class="empty">No contributors yet.</td></tr>`;
  return rows.map(c=>`<tr class="${isMe(c)?'me':''}" data-id="${c.id}">
    <td>${esc(c.name)}${isMe(c)?' <small>(You)</small>':''}</td><td>${fmt(c.amount)}</td><td>${c.date}</td>
    <td>${isAdmin()?`<button class="small secondary editC" data-id="${c.id}"><i data-lucide="pencil"></i>Edit</button> <button class="small danger delC" data-id="${c.id}"><i data-lucide="trash-2"></i>Del</button>`:''}</td>
  </tr>`).join('');
}

function expHTML(t){
  return `
  <div class="section">
    <h2><i data-lucide="receipt"></i> Expenses</h2>
    <div class="row">
      <input id="searchE" placeholder="Search expense…" style="flex:1;min-width:140px">
      <input id="filterDate" type="date">
      ${isAdmin()?'<button id="addE"><i data-lucide="plus-circle"></i> Add Expense</button>':''}
    </div>
    <div class="muted small" style="margin-bottom:8px;">Total Expenses: ${fmt(t.spent)}</div>
    <div class="scrollx"><table><thead><tr><th>Expense</th><th>Description</th><th>Amount</th><th>Date</th><th></th></tr></thead>
    <tbody id="eBody">${renderExpRows()}</tbody></table></div>
  </div>`;
}
function renderExpRows(){
  if (!expenses.length) return `<tr><td colspan="5" class="empty">No expenses yet.</td></tr>`;
  return [...expenses].map(e=>`<tr data-id="${e.id}"><td>${esc(e.title)}</td><td>${esc(e.description||'')}</td><td>${fmt(e.amount)}</td><td>${e.date}</td>
    <td>${isAdmin()?`<button class="small secondary editE" data-id="${e.id}"><i data-lucide="pencil"></i>Edit</button> <button class="small danger delE" data-id="${e.id}"><i data-lucide="trash-2"></i>Del</button>`:''}</td></tr>`).join('');
}

function sumHTML(t){
  const circumference = 2 * Math.PI * 54;
  const spentShare = t.collected > 0 ? Math.min(t.spent / t.collected, 1) : 0;
  const balanceShare = t.collected > 0 ? Math.max(t.balance / t.collected, 0) : 0;
  const spentLength = circumference * spentShare;
  const spentPercent = Math.round(spentShare * 100);
  const balancePercent = Math.round(balanceShare * 100);
  return `<div class="section summary-section">
    <div class="summary-heading"><div><span class="summary-kicker">FESTIVAL FINANCES</span><h2><i data-lucide="pie-chart"></i> Financial Summary</h2></div><span class="summary-status"><i data-lucide="check-circle-2"></i> Live totals</span></div>
    <div class="summary-panel">
      <div class="summary-metrics">
        <div class="summary-row"><span><i data-lucide="arrow-down-left"></i> Total money collected</span><strong class="c-collect">${fmt(t.collected)}</strong></div>
        <div class="summary-row"><span><i data-lucide="arrow-up-right"></i> Total money spent</span><strong class="c-spend">${fmt(t.spent)}</strong></div>
        <div class="summary-row summary-balance"><span><i data-lucide="wallet"></i> Remaining balance</span><strong class="c-bal">${fmt(t.balance)}</strong></div>
      </div>
      <div class="summary-chart-wrap">
        <div class="summary-chart" role="img" aria-label="${spentPercent}% of collected funds spent, ${balancePercent}% remaining">
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle class="chart-track" cx="70" cy="70" r="54"></circle>
            <circle class="chart-spent" cx="70" cy="70" r="54" stroke-dasharray="${spentLength} ${circumference - spentLength}"></circle>
          </svg>
          <div class="chart-center"><strong>${spentPercent}%</strong><span>spent</span></div>
        </div>
        <div class="chart-legend">
          <div><span class="legend-dot spent-dot"></span><span>Spent</span><strong>${spentPercent}%</strong></div>
          <div><span class="legend-dot balance-dot"></span><span>Remaining</span><strong>${balancePercent}%</strong></div>
        </div>
      </div>
    </div>
  </div>`;
}

function accountHTML(){
  let usersSection = '';
  if (isAdmin()){
    usersSection = `<div class="section"><h2><i data-lucide="shield-check"></i> Login Accounts</h2>
      <div class="scrollx"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th></th></tr></thead>
      <tbody>${users.map(u=>`<tr data-id="${u.id}"><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${u.role}</td>
      <td>${u.id!==me.id?`<button class="small danger delU" data-id="${u.id}"><i data-lucide="user-x"></i>Remove</button>`:''}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  }
  return `<div class="section"><h2><i data-lucide="key-round"></i> Change Password</h2>
    <div class="card" style="max-width:360px;">
      <label>Current Password</label><input id="curPass" type="password">
      <label>New Password</label><input id="newPass" type="password">
      <button id="savePass" style="margin-top:12px;"><i data-lucide="check"></i> Update Password</button>
      <div id="passMsg" class="error"></div>
    </div>
  </div>${usersSection}`;
}

function esc_(s){return s;}

function openModal(html){
  const bg=document.createElement('div'); bg.className='modal-bg'; bg.id='modalBg';
  bg.innerHTML=`<div class="modal">${html}</div>`;
  bg.addEventListener('click', e=>{ if(e.target===bg) bg.remove(); });
  document.body.appendChild(bg);
}
function closeModal(){ document.getElementById('modalBg')?.remove(); }

function contribForm(existing){
  const c = existing || {};
  openModal(`<h3>${existing?'Edit':'Add'} Contributor</h3>
    <label>Name</label><input id="fName" value="${esc(c.name||'')}">
    <label>Amount (₹)</label><input id="fAmount" type="number" value="${c.amount||''}">
    <label>Date</label><input id="fDate" type="date" value="${c.date||new Date().toISOString().slice(0,10)}">
    ${!existing?`<label class="checkline"><input type="checkbox" id="fCreateAcc"> Create a login account for this contributor</label>
    <div id="accFields" class="hidden">
      <label>Username</label><input id="fUsername">
      <label>Password</label><input id="fPassword" type="password">
    </div>`:''}
    <div class="row" style="margin-top:14px;justify-content:flex-end;">
      <button class="secondary" id="cancelForm"><i data-lucide="x"></i>Cancel</button><button id="saveForm"><i data-lucide="check"></i>Save</button>
    </div>`);
  if (window.lucide) lucide.createIcons();
  document.getElementById('cancelForm').onclick = closeModal;
  document.getElementById('fCreateAcc')?.addEventListener('change', e=>{
    document.getElementById('accFields').classList.toggle('hidden', !e.target.checked);
  });
  document.getElementById('saveForm').onclick = async ()=>{
    const name = document.getElementById('fName').value.trim();
    const amount = Number(document.getElementById('fAmount').value);
    const date = document.getElementById('fDate').value;
    if (!name || !amount || !date){ toast('Name, amount and date are required'); return; }
    const body = { name, amount, date };
    if (!existing && document.getElementById('fCreateAcc')?.checked){
      body.createAccount = true;
      body.username = document.getElementById('fUsername').value.trim();
      body.password = document.getElementById('fPassword').value;
    }
    try{
      if (existing) await api('/contributors/'+existing.id, { method:'PUT', body });
      else await api('/contributors', { method:'POST', body });
      closeModal(); toast('Saved'); loadAll();
    }catch(e){ toast(e.message); }
  };
}

function expForm(existing){
  const e = existing || {};
  openModal(`<h3>${existing?'Edit':'Add'} Expense</h3>
    <label>Expense Title</label><input id="fTitle" value="${esc(e.title||'')}">
    <label>Description</label><textarea id="fDesc" rows="2">${esc(e.description||'')}</textarea>
    <label>Amount (₹)</label><input id="fAmt" type="number" value="${e.amount||''}">
    <label>Date</label><input id="fDate2" type="date" value="${e.date||new Date().toISOString().slice(0,10)}">
    <div class="row" style="margin-top:14px;justify-content:flex-end;">
      <button class="secondary" id="cancelForm2"><i data-lucide="x"></i>Cancel</button><button id="saveForm2"><i data-lucide="check"></i>Save</button>
    </div>`);
  if (window.lucide) lucide.createIcons();
  document.getElementById('cancelForm2').onclick = closeModal;
  document.getElementById('saveForm2').onclick = async ()=>{
    const title = document.getElementById('fTitle').value.trim();
    const description = document.getElementById('fDesc').value.trim();
    const amount = Number(document.getElementById('fAmt').value);
    const date = document.getElementById('fDate2').value;
    if (!title || !amount || !date){ toast('Title, amount and date are required'); return; }
    try{
      if (existing) await api('/expenses/'+existing.id, { method:'PUT', body:{title,description,amount,date} });
      else await api('/expenses', { method:'POST', body:{title,description,amount,date} });
      closeModal(); toast('Saved'); loadAll();
    }catch(err){ toast(err.message); }
  };
}

function confirmDelete(msg, fn){
  openModal(`<h3><i data-lucide="alert-triangle"></i> Confirm Delete</h3><p>${msg}</p>
    <div class="row" style="justify-content:flex-end;"><button class="secondary" id="noDel"><i data-lucide="x"></i>Cancel</button><button class="danger" id="yesDel"><i data-lucide="trash-2"></i>Delete</button></div>`);
  if (window.lucide) lucide.createIcons();
  document.getElementById('noDel').onclick = closeModal;
  document.getElementById('yesDel').onclick = async ()=>{ await fn(); closeModal(); };
}

function wireEvents(){
  document.getElementById('addC')?.addEventListener('click', ()=>contribForm());
  document.getElementById('addE')?.addEventListener('click', ()=>expForm());
  document.querySelectorAll('.editC').forEach(b=>b.onclick=()=>contribForm(contributors.find(c=>c.id==b.dataset.id)));
  document.querySelectorAll('.editE').forEach(b=>b.onclick=()=>expForm(expenses.find(e=>e.id==b.dataset.id)));
  document.querySelectorAll('.delC').forEach(b=>b.onclick=()=>confirmDelete('Delete this contributor record?', async ()=>{
    try{ await api('/contributors/'+b.dataset.id, { method:'DELETE' }); toast('Deleted'); loadAll(); }catch(e){ toast(e.message); }
  }));
  document.querySelectorAll('.delE').forEach(b=>b.onclick=()=>confirmDelete('Delete this expense record?', async ()=>{
    try{ await api('/expenses/'+b.dataset.id, { method:'DELETE' }); toast('Deleted'); loadAll(); }catch(e){ toast(e.message); }
  }));
  document.querySelectorAll('.delU').forEach(b=>b.onclick=()=>confirmDelete('Remove this login account?', async ()=>{
    try{ await api('/users/'+b.dataset.id, { method:'DELETE' }); toast('Removed'); loadAll(); }catch(e){ toast(e.message); }
  }));
  document.getElementById('sortC')?.addEventListener('change', ()=>{ document.getElementById('cBody').innerHTML = renderContribRows(); wireEvents(); });
  document.getElementById('searchC')?.addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#cBody tr').forEach(tr=>{ tr.style.display = tr.textContent.toLowerCase().includes(q)?'':'none'; });
  });
  document.getElementById('searchE')?.addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#eBody tr').forEach(tr=>{ tr.style.display = tr.textContent.toLowerCase().includes(q)?'':'none'; });
  });
  document.getElementById('filterDate')?.addEventListener('change', e=>{
    const d = e.target.value;
    document.querySelectorAll('#eBody tr').forEach(tr=>{
      if (!d){ tr.style.display=''; return; }
      tr.style.display = tr.textContent.includes(d) ? '' : 'none';
    });
  });
  document.getElementById('savePass')?.addEventListener('click', async ()=>{
    const currentPassword = document.getElementById('curPass').value;
    const newPassword = document.getElementById('newPass').value;
    const msg = document.getElementById('passMsg');
    try{
      await api('/change-password', { method:'POST', body:{ currentPassword, newPassword } });
      msg.style.color = 'var(--good)'; msg.textContent = 'Password updated.';
      document.getElementById('curPass').value=''; document.getElementById('newPass').value='';
    }catch(e){ msg.style.color='var(--bad)'; msg.textContent = e.message; }
  });
}

checkSession();
