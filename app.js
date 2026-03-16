// app.js
let MEMBER = "";

const $ = id => document.getElementById(id);
const content = $("content");
const statusEl = $("status");

function setStatus(text){
  statusEl.textContent = text;
}

async function init(){
  setStatus('Načítám členy...');
  const members = await api('members');
  if (members && members.error) {
    setStatus('Chyba: ' + members.error);
    content.innerHTML = `<div class="card debug">Chyba načtení členů: ${escapeHtml(members.error)}</div>`;
    return;
  }
  const sel = $("memberSelect");
  // vyčistit
  sel.innerHTML = `<option value="">Vyber člena</option>`;
  (members || []).forEach(m=>{
    const o = document.createElement('option');
    o.value = m.ID || m.id || "";
    o.textContent = m.NAME || m.NAME || (m.name||"neznámý");
    sel.appendChild(o);
  });
  sel.onchange = ()=>{
    MEMBER = sel.value;
    setStatus(MEMBER ? `Vybrán: ${sel.options[sel.selectedIndex].text}` : '—');
    showDashboard();
  };

  // tlačítka
  $("btnDashboard").onclick = showDashboard;
  $("btnEvents").onclick = showEvents;
  $("btnPayments").onclick = showPayments;
  $("btnEnergy").onclick = showEnergy;

  // první pohled
  setStatus('Hotovo');
  content.innerHTML = `<p class="notice">Vyber člena a stiskni "Přehled" nebo "Akce".</p>`;
}

window.addEventListener('load', init);


/* ========== Dashboard ========== */
async function showDashboard(){
  content.innerHTML = `<p class="notice">Načítám přehled…</p>`;
  if(!MEMBER){
    content.innerHTML = `<div class="card"><p class="notice">Vyber člena v horním řádku.</p></div>`;
    return;
  }

  // pokus o získání nejbližší akce: použijeme events a vyber první
  const eventsResp = await api('events');
  if (eventsResp && eventsResp.error) {
    content.innerHTML = `<div class="card debug">Chyba při načítání akcí: ${escapeHtml(eventsResp.error)}</div>`;
    return;
  }

  const events = Array.isArray(eventsResp) ? eventsResp : [];
  // pokud prázdné
  if (!events.length) {
    content.innerHTML = `<div class="card"><p class="notice">Žádné akce.</p></div>`;
    return;
  }

  // pokusit se seřadit podle DATE pokud existuje
  events.sort((a,b)=>{
    const da = new Date(a.DATE || a.date || 0).getTime();
    const db = new Date(b.DATE || b.date || 0).getTime();
    return da - db;
  });

  const next = events[0];
  // načíst program pro tu akci
  const programResp = await api('program', { event: next.ID || next.id });
  const program = Array.isArray(programResp) ? programResp : [];

  let html = `<h2>Nejbližší akce</h2>`;
  html += `<div class="card">`;
  html += `<b>${escapeHtml(next.NAME||next.name||'bez názvu')}</b><br>`;
  html += `<div class="small">${escapeHtml(next.DATE||next.date||'bez data')}</div>`;
  html += `<div class="small">${escapeHtml(next.PLACE||next.place||'')}</div>`;
  html += `<hr>`;
  html += `<h3>Program</h3>`;
  if(program.length) program.forEach(p=>{
    html += `<div>${escapeHtml(p.NAME || p.SKLADBA || p.name || p.SKLADBA || JSON.stringify(p))}</div>`;
  });
  else html += `<div class="small">Program není dostupný.</div>`;

  html += `<hr>`;
  html += `<div class="small">Potvrď docházku:</div>`;
  html += `<div style="margin-top:8px">`;
  html += `<button onclick="doAttendance('${next.ID}','Přijdu')">Přijdu</button> `;
  html += `<button onclick="doAttendance('${next.ID}','Možná')">Možná</button> `;
  html += `<button onclick="doAttendanceWithReason('${next.ID}','Nepřijdu')">Nepřijdu</button>`;
  html += `</div>`;

  html += `</div>`;

  content.innerHTML = html;
}

/* ========== Events ========== */
async function showEvents(){
  content.innerHTML = `<p class="notice">Načítám akce…</p>`;
  const resp = await api('events');
  if (resp && resp.error){
    content.innerHTML = `<div class="card debug">Chyba: ${escapeHtml(resp.error)}</div>`;
    return;
  }
  const events = Array.isArray(resp) ? resp : [];
  if(!events.length){
    content.innerHTML = `<div class="card"><p class="notice">Žádné akce.</p></div>`;
    return;
  }

  // seřadit pokud lze
  events.sort((a,b)=> new Date(a.DATE||a.date||0) - new Date(b.DATE||b.date||0));

  let html = `<h2>Akce</h2>`;
  events.forEach(ev=>{
    html += `<div class="event" onclick="showEventDetail('${escapeHtml(ev.ID||ev.id)}')">`;
    html += `<b>${escapeHtml(ev.NAME||ev.name||'')}</b>`;
    html += `<div class="small">${escapeHtml(ev.DATE||ev.date||'')}</div>`;
    html += `<div class="small">${escapeHtml(ev.PLACE||ev.place||'')}</div>`;
    html += `</div>`;
  });

  content.innerHTML = html;
}

async function showEventDetail(id){
  content.innerHTML = `<p class="notice">Načítám detail…</p>`;
  const resp = await api('program', { event: id });
  if (resp && resp.error){
    content.innerHTML = `<div class="card debug">Chyba: ${escapeHtml(resp.error)}</div>`;
    return;
  }
  // najdi základní info v events (opakované volání events, nebo upravíš backend)
  const eventsResp = await api('events');
  const ev = (Array.isArray(eventsResp) ? eventsResp.find(x => (x.ID||x.id)==id) : null) || {};
  let html = `<h2>${escapeHtml(ev.NAME||ev.name||'Detail akce')}</h2>`;
  html += `<div class="card">`;
  html += `<div class="small">${escapeHtml(ev.DATE||ev.date||'')}</div>`;
  html += `<div class="small">${escapeHtml(ev.PLACE||ev.place||'')}</div>`;

  html += `<hr><h3>Program</h3>`;
  const program = Array.isArray(resp) ? resp : [];
  if(program.length) program.forEach(p=>{
    html += `<div>${escapeHtml(p.NAME || p.SKLADBA || p.name || JSON.stringify(p))}</div>`;
  }) else html += `<div class="small">Program není k dispozici.</div>`;

  html += `<hr>`;
  html += `<div class="small">Potvrdit docházku:</div>`;
  html += `<div style="margin-top:8px">`;
  html += `<button onclick="doAttendance('${id}','Přijdu')">Přijdu</button> `;
  html += `<button onclick="doAttendance('${id}','Možná')">Možná</button> `;
  html += `<button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>`;
  html += `</div>`;

  html += `</div>`;
  content.innerHTML = html;
}

/* ========== Attendance ========== */
async function doAttendance(eventId, status){
  if(!MEMBER) { alert('Vyber člena.'); return; }
  setStatus('Ukládám docházku...');
  const res = await api('setAttendance', { event: eventId, member: MEMBER, status });
  setStatus(res && res.status ? `OK: ${res.status}` : (res.error ? 'Chyba: ' + res.error : 'Hotovo'));
  if(res && res.error) alert('Chyba: ' + res.error);
}

async function doAttendanceWithReason(eventId, status){
  const reason = prompt('Zadej krátký důvod nepřítomnosti:');
  if(reason === null) return; // zrušeno
  if(!reason.trim()) { alert('Důvod je povinný.'); return; }
  await doAttendanceWithReasonInternal(eventId, status, reason);
}

async function doAttendanceWithReasonInternal(eventId, status, reason){
  if(!MEMBER) { alert('Vyber člena.'); return; }
  setStatus('Ukládám docházku...');
  const res = await api('setAttendance', { event: eventId, member: MEMBER, status, reason });
  setStatus(res && res.status ? `OK: ${res.status}` : (res.error ? 'Chyba: ' + res.error : 'Hotovo'));
  if(res && res.error) alert('Chyba: ' + res.error);
}

/* ========== Payments ========== */
async function showPayments(){
  content.innerHTML = `<p class="notice">Načítám platby…</p>`;
  const cols = await api('collections'); // VYBERY
  const payments = await api('payments'); // PLATBY
  if((cols && cols.error) || (payments && payments.error)){
    content.innerHTML = `<div class="card debug">Chyba: ${(cols.error||payments.error)}</div>`;
    return;
  }
  const C = Array.isArray(cols) ? cols : [];
  const P = Array.isArray(payments) ? payments : [];
  let html = `<h2>Platby / výběry</h2>`;
  if(!C.length) html += `<div class="card"><div class="small">Žádné aktivní výběry.</div></div>`;
  C.forEach(col=>{
    html += `<div class="card"><b>${escapeHtml(col.NAME || col.name || 'Výběr')}</b>`;
    const items = P.filter(p => (p.ID_VYBER === col.ID) || (p.ID_VYBER === col.id));
    if(!items.length) html += `<div class="small">Zatím nikdo nezaplatil</div>`;
    items.forEach(it=>{
      html += `<div class="small">${escapeHtml(it.ID_MEMBER || it.member || it.ID || '')} — ${escapeHtml(it.PAID || it.PAID || it.value || '')}</div>`;
    });
    html += `</div>`;
  });

  content.innerHTML = html;
}

/* ========== Energy ========== */
async function showEnergy(){
  content.innerHTML = `<p class="notice">Načítám záznamy energie…</p>`;
  const resp = await api('energy');
  if(resp && resp.error){ content.innerHTML = `<div class="card debug">Chyba: ${escapeHtml(resp.error)}</div>`; return; }
  const items = Array.isArray(resp) ? resp : [];
  let html = `<h2>Energie</h2>`;
  if(!items.length) html += `<div class="card"><div class="small">Žádné záznamy.</div></div>`;
  else {
    html += `<div class="card"><table>`;
    html += `<tr><th>ID</th><th>DATE</th><th>DETAIL</th></tr>`;
    items.forEach(it=>{
      html += `<tr><td class="small">${escapeHtml(it.ID || it.id || '')}</td><td class="small">${escapeHtml(it.DATE || it.date || '')}</td><td class="small">${escapeHtml(JSON.stringify(it))}</td></tr>`;
    });
    html += `</table></div>`;
  }
  content.innerHTML = html;
}

/* ========== Helpers ========== */
function escapeHtml(s){
  if(s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
