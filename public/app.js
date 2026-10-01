let me = null;
let contributors = [], expenses = [], users = [];
let tab = 'dash';
let language = localStorage.getItem('fundLanguage') || 'en';
const originalText = new WeakMap();

const hindi = {
  'Sign in to continue':'जारी रखने के लिए लॉग इन करें', 'Username':'यूज़रनेम', 'Password':'पासवर्ड',
  'Login':'लॉग इन', 'Continue as viewer':'दर्शक के रूप में जारी रखें',
  'Sign in with the account credentials provided by your administrator.':'एडमिन द्वारा दिए गए खाते से लॉग इन करें।',
  'Dashboard':'डैशबोर्ड', 'Contributors':'योगदानकर्ता', 'Expenses':'खर्च', 'Summary':'सारांश',
  'Account':'खाता', 'Logout':'लॉग आउट', 'Admin':'एडमिन', 'Viewer':'दर्शक',
  'Download CSV':'CSV डाउनलोड', 'Total Collected':'कुल जमा', 'People':'लोग', 'Total Expenses':'कुल खर्च',
  'Remaining Balance':'बाकी राशि', 'Recent Contributors':'हाल के योगदानकर्ता', 'Recent Expenses':'हाल के खर्च',
  'Nothing added yet.':'अभी तक कुछ नहीं जोड़ा गया।', 'Search name…':'नाम खोजें…',
  'Sort: Date':'क्रम: तारीख', 'Sort: Amount':'क्रम: राशि', 'Sort: Name':'क्रम: नाम',
  'Add Contributor':'योगदानकर्ता जोड़ें', 'Total Contributors:':'कुल योगदानकर्ता:',
  'Name':'नाम', 'Amount':'राशि', 'Date':'तारीख', 'No contributors yet.':'अभी कोई योगदानकर्ता नहीं है।',
  'Edit':'बदलें', 'Del':'हटाएं', 'Search expense…':'खर्च खोजें…', 'Add Expense':'खर्च जोड़ें',
  'Expense':'खर्च', 'Description':'विवरण', 'No expenses yet.':'अभी कोई खर्च नहीं है।',
  'FESTIVAL FINANCES':'उत्सव का हिसाब', 'Financial Summary':'वित्तीय सारांश', 'Live totals':'वर्तमान योग',
  'Total money collected':'कुल जमा राशि', 'Total money spent':'कुल खर्च राशि', 'Remaining balance':'बाकी राशि',
  'spent':'खर्च', 'Spent':'खर्च', 'Remaining':'बाकी', 'Change Password':'पासवर्ड बदलें',
  'Current Password':'मौजूदा पासवर्ड', 'New Password':'नया पासवर्ड', 'Update Password':'पासवर्ड अपडेट करें',
  'Password updated.':'पासवर्ड अपडेट हो गया।', 'Login Accounts':'लॉगिन खाते', 'Role':'भूमिका',
  'Remove':'हटाएं', 'Viewer access':'दर्शक की पहुंच',
  'You are viewing this page without an account. Changes are only available to an administrator.':'आप बिना खाते के यह पेज देख रहे हैं। बदलाव केवल एडमिन कर सकता है।',
  'Add':'जोड़ें', 'Contributor':'योगदानकर्ता', 'Amount (₹)':'राशि (₹)',
  'Create a login account for this contributor':'इस योगदानकर्ता के लिए लॉगिन खाता बनाएं',
  'Title':'शीर्षक', 'Expense Title':'खर्च का शीर्षक', 'Cancel':'रद्द करें', 'Save':'सेव करें',
  'Confirm Delete':'हटाने की पुष्टि करें', 'Delete':'हटाएं', 'Delete this contributor record?':'यह योगदान रिकॉर्ड हटाएं?',
  'Delete this expense record?':'यह खर्च रिकॉर्ड हटाएं?', 'Remove this login account?':'यह लॉगिन खाता हटाएं?',
  'Name, amount and date are required':'नाम, राशि और तारीख जरूरी हैं',
  'Title, amount and date are required':'शीर्षक, राशि और तारीख जरूरी हैं', 'Saved':'सेव हो गया',
  'Deleted':'हटा दिया गया', 'Removed':'हटा दिया गया', 'You cannot delete your own account':'आप अपना खाता नहीं हटा सकते',
  'New password must be at least 6 characters':'नया पासवर्ड कम से कम 6 अक्षर का होना चाहिए',
  'Current password is incorrect':'मौजूदा पासवर्ड गलत है', 'Invalid username or password':'यूज़रनेम या पासवर्ड गलत है',
  'Username and password required':'यूज़रनेम और पासवर्ड जरूरी हैं', 'Not logged in':'लॉगिन नहीं है',
  'Admin access required':'केवल एडमिन यह कर सकता है', 'CSV downloaded':'CSV डाउनलोड हो गई',
  'Contributor':'योगदानकर्ता', 'Type':'प्रकार', 'Metric':'माप', 'Value':'मान', 'Account':'खाता',
  'Edit Contributor':'योगदानकर्ता बदलें', 'Add Contributor':'योगदानकर्ता जोड़ें',
  'Edit Expense':'खर्च बदलें', 'Add Expense':'खर्च जोड़ें', 'Username already taken':'यह यूज़रनेम पहले से मौजूद है',
  'user':'उपयोगकर्ता', 'admin':'एडमिन',
  'Login Accounts':'लॉगिन खाते', 'Guest viewer':'अतिथि दर्शक', 'You':'आप'
};

function translateText(text){
  const trimmed = text.trim();
  if (language === 'en') return text;
  if (hindi[trimmed]) return text.replace(trimmed, hindi[trimmed]);
  const peopleCount = trimmed.match(/^(\d+) People$/);
  if (peopleCount) return text.replace(trimmed, `${peopleCount[1]} लोग`);
  if (trimmed.startsWith('Total Contributors:')) {
    return text.replace('Total Contributors:', hindi['Total Contributors:']).replace('Total Collected:', 'कुल जमा:');
  }
  return text;
}

function translatePage(){
  document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('td') && !node.parentElement.closest('button') && !node.parentElement.classList.contains('empty')) continue;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    node.nodeValue = translateText(originalText.get(node));
  }
  document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(input=>{
    if (!input.dataset.englishPlaceholder) input.dataset.englishPlaceholder = input.placeholder;
    input.placeholder = language === 'hi' ? (hindi[input.dataset.englishPlaceholder] || input.dataset.englishPlaceholder) : input.dataset.englishPlaceholder;
  });
  document.querySelectorAll('[data-language-toggle]').forEach(button=>{
    button.textContent = language === 'hi' ? 'English' : 'हिंदी';
  });
}

document.querySelectorAll('[data-language-toggle]').forEach(button=>button.addEventListener('click', ()=>{
  language = language === 'en' ? 'hi' : 'en';
  localStorage.setItem('fundLanguage', language);
  translatePage();
}));

function fmt(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }
function esc(s){ return String(s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=translateText(msg); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

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
document.getElementById('guestLoginBtn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const data = await api('/guest-login', { method:'POST' });
    me = data.user;
    showApp();
  }catch(e){ errEl.textContent = translateText(e.message); }
});

async function doLogin(){
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const data = await api('/login', { method:'POST', body:{ username, password } });
    me = data.user;
    showApp();
  }catch(e){ errEl.textContent = translateText(e.message); }
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
  document.getElementById('downloadBtn').classList.toggle('hidden', !isAdmin());
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
function label(text){ return language === 'hi' ? (hindi[text] || text) : text; }

function csvCell(value){
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCurrentPage(){
  const t = totals();
  const headers = ['Type','Name','Amount','Date','Description'].map(label);
  let rows = [];
  if (tab === 'contrib'){
    rows = contributors.map(c=>[label('Contributor'),c.name,fmt(c.amount),c.date,'']);
  }else if (tab === 'exp'){
    rows = expenses.map(e=>[label('Expense'),e.title,fmt(e.amount),e.date,e.description||'']);
  }else if (tab === 'account' && isAdmin()){
    rows = users.map(u=>[label('Login Accounts'),u.name,u.username,u.role,'']);
  }else if (tab === 'account'){
    rows = [[label('Account'),me.name,me.role,'','']];
  }else{
    rows = [
      [label('Summary'),label('Total Collected'),fmt(t.collected),'',''],
      [label('Summary'),label('Total Expenses'),fmt(t.spent),'',''],
      [label('Summary'),label('Remaining Balance'),fmt(t.balance),'','']
    ];
    const contributorRows = tab === 'dash' ? contributors.slice(0,5) : contributors;
    const expenseRows = tab === 'dash' ? expenses.slice(0,5) : expenses;
    rows.push(...contributorRows.map(c=>[label('Contributor'),c.name,fmt(c.amount),c.date,'']));
    rows.push(...expenseRows.map(e=>[label('Expense'),e.title,fmt(e.amount),e.date,e.description||'']));
  }
  const csv = '\uFEFF' + [headers, ...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `navratri-${tab}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast(label('CSV downloaded'));
}

document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPage);

function render(){
  const app = document.getElementById('app');
  const t = totals();
  if (tab==='dash') app.innerHTML = dashHTML(t);
  else if (tab==='contrib') app.innerHTML = contribHTML(t);
  else if (tab==='exp') app.innerHTML = expHTML(t);
  else if (tab==='sum') app.innerHTML = sumHTML(t);
  else app.innerHTML = accountHTML();
  wireEvents();
  translatePage();
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
  if (me.role === 'viewer') return `<div class="section"><h2><i data-lucide="eye"></i> Viewer access</h2>
    <p class="muted">You are viewing this page without an account. Changes are only available to an administrator.</p>
  </div>`;
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
  translatePage();
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
  document.getElementById('sortC')?.addEventListener('change', ()=>{ document.getElementById('cBody').innerHTML = renderContribRows(); wireEvents(); translatePage(); });
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
      msg.style.color = 'var(--good)'; msg.textContent = translateText('Password updated.');
      document.getElementById('curPass').value=''; document.getElementById('newPass').value='';
    }catch(e){ msg.style.color='var(--bad)'; msg.textContent = translateText(e.message); }
  });
}

translatePage();
checkSession();
