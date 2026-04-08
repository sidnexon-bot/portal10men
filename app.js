/* ===============================
   STAV APLIKACE
================================ */

let MEMBER_EMAIL = null
let MEMBER_NAME  = null
let ACTIVE_TAB   = "dashboard"
let MEMBER_ROLE  = "MEMBER"
let AUTH_ROLE = null // původní role přihlášeného – nemění se při přepínání člena

const BULLETIN = `Koncert s Verum a InVoice se blíží — sledujte detaily akce.`
const INFODOC_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSevXNcXk9qR3YxiMI_k2OUIAgivQJW5mE-U4uodV91fJ-bWpg/viewform?usp=header"

// Inicializace identity z Google session (přihlášení přes login.html)
function initMemberFromSession(){
  const user = JSON.parse(localStorage.getItem('10base_user') || 'null');
  if(!user){
    window.location.href = 'login.html';
    return false;
  }
  MEMBER_EMAIL = user.email;
  MEMBER_NAME  = user.name;
  MEMBER_ROLE  = (user.role || 'member').toUpperCase();
  AUTH_ROLE    = MEMBER_ROLE; // zapamatuj původní roli

  updateProfileBtn();
  return true;
}

function updateProfileBtn(){
  const profileBtn = document.getElementById("profileBtn")
  if(profileBtn) profileBtn.textContent = getInitials(MEMBER_NAME)

  // Naplň menu daty přihlášeného (vždy původní user ze session)
  const user = JSON.parse(localStorage.getItem('10base_user') || 'null');
  if(user){
    document.getElementById("profileMenuName").textContent  = user.name;
    document.getElementById("profileMenuEmail").textContent = user.email;
    document.getElementById("profileMenuRole").textContent  = user.role;
    document.getElementById("profileMenuVoice").textContent  = user.voice;
  }

  // Přepínač jen pro admina
  const switchBtn = document.getElementById("profileMenuSwitchBtn")
  if(switchBtn){
    if(AUTH_ROLE === 'ADMIN'){
      switchBtn.classList.remove('hidden');
      switchBtn.onclick = () => { closeProfileMenu(); openMemberModal(); }
    } else {
      switchBtn.classList.add('hidden');
    }
  }
}

/* ===============================
   CACHE
================================ */

const CACHE_TTL = 30 * 60 * 1000  // 30 minut

function lsGet(key){
  try{
    const raw = localStorage.getItem("cache_" + key)
    if(!raw) return null
    const {data, ts} = JSON.parse(raw)
    if(Date.now() - ts > CACHE_TTL) return null
    return data
  }catch(e){ return null }
}

function lsSet(key, data){
  try{
    localStorage.setItem("cache_" + key, JSON.stringify({data, ts: Date.now()}))
  }catch(e){}
}

function lsDel(key){
  try{ localStorage.removeItem("cache_" + key) }catch(e){}
}

const CACHE = {
  detail: {},
  ts:     {}
}

function cacheValid(key){
  return CACHE.ts[key] && (Date.now() - CACHE.ts[key] < CACHE_TTL)
}

async function cachedApi(action, params){

  if(action === "eventdetail" && params?.id){
    const key = "detail_" + params.id
    if(CACHE.detail[params.id] && cacheValid(key)) return CACHE.detail[params.id]
    const stored = lsGet(key)
    if(stored){
      CACHE.detail[params.id] = stored
      CACHE.ts[key] = Date.now()
      api(action, params).then(fresh => {
        CACHE.detail[params.id] = fresh
        CACHE.ts[key] = Date.now()
        lsSet(key, fresh)
      }).catch(()=>{})
      return stored
    }
    const data = await api(action, params)
    CACHE.detail[params.id] = data
    CACHE.ts[key] = Date.now()
    lsSet(key, data)
    return data
  }

  if(action === "myattendance" && params?.email){
    const key = "myattendance_" + params.email
    const stored = lsGet(key)
    if(stored){
      api(action, params).then(fresh => lsSet(key, fresh)).catch(()=>{})
      return stored
    }
    const data = await api(action, params)
    lsSet(key, data)
    return data
  }

  const stored = lsGet(action)
  if(stored){
    api(action, params).then(fresh => lsSet(action, fresh)).catch(()=>{})
    return stored
  }

  const data = await api(action, params)
  lsSet(action, data)
  return data

}

function invalidateCache(action, id){
  if(id){
    delete CACHE.detail[id]
    delete CACHE.ts["detail_" + id]
    lsDel("detail_" + id)
  }else{
    lsDel(action)
  }
}

/* ===============================
   HELPERS
================================ */

function getInitials(name){
  if(!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase()
}

function currentMember(){
  return MEMBER_EMAIL
}

function escapeHtml(str){
  if(!str) return ""
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
}

function formatDate(d){
  if(!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("cs-CZ",{
    weekday: "short",
    day:     "numeric",
    month:   "numeric",
    year:    "numeric"
  })
}

function formatTime(t){
  if(!t && t !== 0) return ""
  if(typeof t === "number"){
    return String(Math.floor(t)).padStart(2,"0") + ":00"
  }
  if(typeof t === "string" && t.includes("T")){
    const d = new Date(t)
    return d.toLocaleTimeString("cs-CZ", {hour:"2-digit", minute:"2-digit", timeZone:"UTC"})
  }
  if(typeof t === "string" && t.includes(":")){
    return t.substring(0, 5)
  }
  return String(t).substring(0,5)
}

function isToday(date){
  const d = new Date(date)
  const t = new Date()
  return d.toDateString() === t.toDateString()
}

function container(){
  return document.getElementById("main")
}

function setLoading(){
  container().innerHTML = "<p class='notice'>Načítám…</p>"
}

function setError(msg){
  container().innerHTML = "<p class='notice'>" + escapeHtml(msg) + "</p>"
}

function setActiveTab(name){
  ACTIVE_TAB = name
  document.querySelectorAll(".bottom button").forEach(b => b.classList.remove("active"))
  const map = {
    dashboard: "btnDashboard",
    events:    "btnEvents",
    payments:  "btnPayments",
    energy:    "btnEnergy"
  }
  const btn = document.getElementById(map[name])
  if(btn) btn.classList.add("active")
}

function setStatus(msg){
  const el = document.getElementById("status")
  if(el) el.textContent = msg || "—"
}

function iconCheck(){
  return `<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>`
}

function iconMaybe(){
  return `<svg viewBox="0 0 24 24"><path d="M12 18h.01M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/></svg>`
}

function iconClose(){
  return `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12"/></svg>`
}

function iconQuestion(){
  return `<svg viewBox="0 0 24 24"><path d="M12 18h.01M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/></svg>`
}

function closeProfileMenu(){
  const menu = document.getElementById("profileMenu");
  if(menu) menu.classList.add("hidden");
}

/* ===============================
   START
================================ */

async function start(){

  try{

    // Nejdříve ověř session – pokud není, přesměruje na login
    if(!initMemberFromSession()) return;

    setLoading()

    const members = await cachedApi("members")
    window.MEMBERS = members

    const profileBtn = document.getElementById("profileBtn")
    if(!profileBtn){ console.error("profileBtn nenalezen"); return }

    // Identita už je nastavena z initMemberFromSession()
    setStatus(MEMBER_NAME)

    // Pouze admin může přepínat členy
    // Toggle profile menu – klikatelný pro všechny (menu má logout pro každého)
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById("profileMenu").classList.toggle("hidden");
    }

    // Zavři menu kliknutím mimo
    document.addEventListener("click", () => {
      const menu = document.getElementById("profileMenu");
      if(menu) menu.classList.add("hidden");
    })

    document.getElementById("btnDashboard").onclick = () => { setActiveTab("dashboard"); renderDashboard() }
    document.getElementById("btnEvents").onclick = () => {
      setActiveTab("events")
      window.EVENTS_MONTH = null
      renderEvents()
    }
    document.getElementById("btnPayments").onclick  = () => { setActiveTab("payments");  renderPayments() }
    document.getElementById("btnEnergy").onclick    = () => { setActiveTab("energy");    renderEnergy() }

    setActiveTab("dashboard")
    renderDashboard()
  
  }catch(err){
    setError("Chyba při načítání: " + (err?.message || err))
  }

}

/* ===============================
   MEMBER MODAL
================================ */

function openMemberModal(){
  // Pouze admin může přepínat členy
  if(MEMBER_ROLE.toLowerCase() !== 'admin') return;

  const modal = document.getElementById("memberModal")
  const list  = document.getElementById("memberList")
  if(!modal || !list) return

  list.innerHTML = ""

  window.MEMBERS.forEach(m => {
    const div = document.createElement("div")
    div.className = "member-row"
    div.textContent = m.NAME
    if(m.EMAIL === MEMBER_EMAIL){
      div.classList.add("active-member")
    }
    div.onclick = () => {
      selectMember(m)
      closeMemberModal()
    }
    list.appendChild(div)
  })

  modal.classList.remove("hidden")
}

function closeMemberModal(){
  const modal = document.getElementById("memberModal")
  if(modal) modal.classList.add("hidden")
}

function selectMember(m){
  MEMBER_EMAIL = m.EMAIL
  MEMBER_NAME  = m.NAME
  MEMBER_ROLE  = m.ROLE || "MEMBER"
  localStorage.setItem("memberEmail", MEMBER_EMAIL)
  localStorage.setItem("memberName",  MEMBER_NAME)
  localStorage.setItem("memberRole",  MEMBER_ROLE)

  const profileBtn = document.getElementById("profileBtn")
  if(profileBtn) profileBtn.textContent = getInitials(MEMBER_NAME)
  setStatus(MEMBER_NAME)

  renderDashboard()
}

/* ===============================
   DASHBOARD
================================ */

async function renderDashboard(){

  setLoading()

  try{

    const events = await cachedApi("events")
    const now    = new Date()

    const keywords = ["zkouška", "zkoušky", "plánování"]
    const concerts = events.filter(e => {
      const name = (e.NAME || "").toLowerCase()
      return !keywords.some(k => name.includes(k))
    })

    const spring = concerts.filter(e => {
      const m = new Date(e.DATE).getMonth() + 1
      return m >= 1 && m <= 6
    })
    const autumn = concerts.filter(e => {
      const m = new Date(e.DATE).getMonth() + 1
      return m >= 7 && m <= 12
    })

    const upcoming = events
      .filter(e => new Date(e.DATE) >= now)
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    let html = ""

if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
  html += `<div style="margin-bottom:16px">
    <a href="${INFODOC_FORM_URL}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:#f2f2f7;border-radius:12px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
      Vytvořit infodokument
    </a>
  </div>`
}

    // --- NEJBLIŽŠÍ AKCE ---
    if(upcoming){
      html += `<h3 class="season-title">📅 Nejbližší akce</h3>`
      html += `<div class="card next" onclick="openEvent('${escapeHtml(upcoming.ID)}')">
        <b>${escapeHtml(upcoming.NAME)}</b><br>
        <span class="small">
          ${formatDate(upcoming.DATE)}
          ${upcoming.START ? "· " + formatTime(upcoming.START) : ""}
          ${upcoming.END   ? "– " + formatTime(upcoming.END)   : ""}
        </span><br>
        <span class="small">${escapeHtml(upcoming.PLACE)}</span>
      </div>`

      if(MEMBER_EMAIL){
        let detail = {attendance:[]}
        try{
          detail = await cachedApi("eventdetail", {id: upcoming.ID})
        }catch(e){
          console.error("eventdetail fail", e)
        }
        const myRow    = (detail.attendance || []).find(a => a.EMAIL === MEMBER_EMAIL)
        const myStatus = myRow?.STATUS || ""

        html += `<div class="card">
          <b>Tvoje docházka:</b><br>
          ${renderAttendanceStatus(myStatus)}
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <button onclick="doAttendance('${upcoming.ID}','Přijdu')">Přijdu</button>
            <button onclick="doAttendance('${upcoming.ID}','Možná')">Možná</button>
            <button onclick="doAttendanceWithReason('${upcoming.ID}','Nepřijdu')">Nepřijdu</button>
          </div>
        </div>`
      }else{
        html += "<p class='notice'>Vyber člena pro zobrazení docházky.</p>"
      }
    }

    // --- AKTUALITY ---
    html += `<div class="card bulletin">
      <b>📋 Aktuality</b>
      <p>${escapeHtml(BULLETIN).replaceAll("\n","<br>")}</p>
    </div>`

    // --- KONCERTY JARO/LÉTO ---
html += `<h3 class="season-title">🌿 Jaro / Léto</h3>`
if(spring.length){
  html += `<div class="card" style="padding:0">`
  spring.forEach((e, i) => {
    const past = new Date(e.DATE) < now
    const border = i < spring.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
    html += `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
      <b style="font-size:15px">${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
      <span class="small" style="text-align:right;margin-left:12px;flex-shrink:0">${formatDate(e.DATE)}${e.PLACE ? "<br>" + escapeHtml(e.PLACE) : ""}</span>
    </div>`
  })
  html += `</div>`
}else{
  html += "<p class='notice'>Žádné koncerty</p>"
}

// --- KONCERTY PODZIM/ZIMA ---
html += `<h3 class="season-title">🍂 Podzim / Zima</h3>`
if(autumn.length){
  html += `<div class="card" style="padding:0">`
  autumn.forEach((e, i) => {
    const past = new Date(e.DATE) < now
    const border = i < autumn.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
    html += `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
      <b style="font-size:15px">${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
      <span class="small" style="text-align:right;margin-left:12px;flex-shrink:0">${formatDate(e.DATE)}${e.PLACE ? "<br>" + escapeHtml(e.PLACE) : ""}</span>
    </div>`
  })
  html += `</div>`
}else{
  html += "<p class='notice'>Žádné koncerty</p>"
}

    const heatmapHtml = await renderHeatmap()
    html += `<div id="heatmap-container">${heatmapHtml}</div>`

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání přehledu: " + (err?.message || err))
  }

}

function concertRow(e, now){
  const past = new Date(e.DATE) < now
  return `<div class="card concert-row${past ? " muted" : ""}" onclick="openEvent('${escapeHtml(e.ID)}')">
    <b>${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
    <span class="small concert-date">${formatDate(e.DATE)}${e.PLACE ? " · " + escapeHtml(e.PLACE) : ""}</span>
  </div>`
}

/* ===============================
   EVENTS
================================ */

async function renderEvents(){

  setLoading()

  try{

    const events = await cachedApi("events")
    let myAttendance = {}
if(MEMBER_EMAIL){
  try{
    myAttendance = await cachedApi("myattendance", {email: MEMBER_EMAIL}) || {}
  }catch(e){ console.error("myattendance fail", e) }
}

    if(!Array.isArray(events) || !events.length){
      setError("Žádné akce")
      return
    }

    events.sort((a,b) => new Date(a.DATE) - new Date(b.DATE))

    const now = new Date()
    now.setHours(0,0,0,0)

    // najdi aktuální měsíc nebo měsíc nejbližší akce
    if(!window.EVENTS_MONTH){
      const nextEvent = events.find(e => {
        const d = new Date(e.DATE)
        d.setHours(0,0,0,0)
        return d >= now
      })
      const ref = nextEvent ? new Date(nextEvent.DATE) : now
      window.EVENTS_MONTH = ref.getFullYear() + "-" + String(ref.getMonth() + 1).padStart(2,"0")
    }

    const [year, month] = window.EVENTS_MONTH.split("-").map(Number)
    const monthName = new Date(year, month - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})

    // filtr akcí pro vybraný měsíc
    const filtered = events.filter(e => {
      const d = new Date(e.DATE)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    // najdi nejbližší akci globálně
    const nextEvent = events.find(e => {
      const d = new Date(e.DATE)
      d.setHours(0,0,0,0)
      return d >= now
    })

    let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">Akce</h2>
      ${MEMBER_ROLE === "ADMIN" ? `<button onclick="openEventForm()">+ Přidat</button>` : ""}
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button onclick="eventsMonthPrev()" style="padding:8px 14px;font-size:16px">‹</button>
      <span style="flex:1;text-align:center;font-weight:600;font-size:16px">${escapeHtml(monthName)}</span>
      <button onclick="eventsMonthNext()" style="padding:8px 14px;font-size:16px">›</button>
    </div>`

    if(!filtered.length){
      html += "<p class='notice'>Žádné akce v tomto měsíci</p>"
      container().innerHTML = html
      return
    }

    filtered.forEach(e => {
      const d = new Date(e.DATE)
      d.setHours(0,0,0,0)
      const isPast     = d < now
      const isNext     = nextEvent && e.ID === nextEvent.ID
      const opacity    = isPast ? "0.4" : "1"
      const highlight  = isNext ? "border-left:3px solid #007aff;" : ""

      html += `<div class="swipe-wrapper" style="opacity:${opacity}">
  <div class="swipe-bg">
    <span class="swipe-bg-left">✓ Přijdu</span>
    <span class="swipe-bg-right">✗ Nepřijdu</span>
  </div>
  <div class="card swipe-card${isNext ? " next" : ""}" data-id="${escapeHtml(e.ID)}" style="${highlight}">
    ${isNext ? `<div style="font-size:11px;color:#007aff;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Nejbližší akce</div>` : ""}
    <b>${escapeHtml(e.NAME)}</b><br>
    <span class="small">
      ${formatDate(e.DATE)}
      ${e.START ? "· " + formatTime(e.START) : ""}
      ${e.END   ? "– " + formatTime(e.END)   : ""}
    </span><br>
    <span class="small">${escapeHtml(e.PLACE)}</span>
${(()=>{
  const a = myAttendance[e.ID]
  if(!a || !a.status) return ""
  const color = a.status === "Přijdu" ? "#34c759" : a.status === "Nepřijdu" ? "#ff3b30" : "#ff9f0a"
  return `<div style="margin-top:6px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em">${escapeHtml(a.status)}</div>`
})()}

  </div>
</div>`
    })

    container().innerHTML = html

    document.querySelectorAll(".swipe-card").forEach(card => {
      const id = card.dataset.id
      addSwipe(card, id)
    })

  }catch(err){
    setError("Chyba při načítání akcí: " + (err?.message || err))
  }

}

function eventsMonthPrev(){
  const [year, month] = window.EVENTS_MONTH.split("-").map(Number)
  const d = new Date(year, month - 2, 1)
  window.EVENTS_MONTH = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0")
  renderEvents()
}

function eventsMonthNext(){
  const [year, month] = window.EVENTS_MONTH.split("-").map(Number)
  const d = new Date(year, month, 1)
  window.EVENTS_MONTH = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0")
  renderEvents()
}

/* ===============================
   EVENT DETAIL
================================ */

async function openEvent(id){

  setLoading()

  try{

    const data       = await cachedApi("eventdetail", {id})
    const event      = data.event      || {}
    const program    = data.program    || []
    const attendance = data.attendance || []

    let html = `
    <button onclick="renderEvents()" style="margin-bottom:12px">← Zpět</button>
    <h2>${escapeHtml(event.NAME)}</h2>
    <div class="small">
      ${formatDate(event.DATE)}
      ${event.START ? "· " + formatTime(event.START) : ""}
      ${event.END   ? "– " + formatTime(event.END)   : ""}
      ${event.PLACE ? "· " + escapeHtml(event.PLACE) : ""}
    </div>
    ${event.NOTE ? "<div class='small' style='margin-top:4px'>" + escapeHtml(event.NOTE) + "</div>" : ""}
    `

    // program
    if(program.length){
      html += `<div class="event-card">
  <div class="event-label">Program</div>
  ${program.map((p, i) => `
    <div class="event-row">
      <div>
        <b>${i+1}. ${escapeHtml(p.NAME)}</b>
        ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${p.LENGTH ? `<span class="small">${escapeHtml(p.LENGTH)}</span>` : ""}
        ${p.PDF ? `<a href="${escapeHtml(p.PDF)}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none">📄 Noty</a>` : ""}
      </div>
    </div>
  `).join("")}
</div>`

    }else{
      html += "<p class='notice'>Program není k dispozici</p>"
    }

    // poznámka
    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
      html += `<div class="card">
        <textarea id="eventNote" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(event.NOTE || "")}</textarea>
        <button style="margin-top:8px" onclick="saveNote('${id}')">Uložit poznámku</button>
      </div>`
    }else if(event.NOTE){
      html += `<div class="card"><p class="small">${escapeHtml(event.NOTE)}</p></div>`
    }

    // docházka
    const myRow    = attendance.find(a => a.EMAIL === MEMBER_EMAIL)
    const myStatus = myRow?.STATUS || ""

    html += `<div class="event-card">
      <div class="event-label">Docházka</div>
      ${MEMBER_EMAIL ? `
        <div class="attendance-status">${renderAttendanceStatus(myStatus)}</div>
        <div class="attendance-buttons">
          <button onclick="doAttendance('${id}','Přijdu')">Přijdu</button>
          <button onclick="doAttendance('${id}','Možná')">Možná</button>
          <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>
        </div>
      ` : `<div class="muted">Vyber člena</div>`}
    </div>`

    // přehled skupiny
    const yes   = attendance.filter(a => a.STATUS === "Přijdu").length
    const maybe = attendance.filter(a => a.STATUS === "Možná").length
    const no    = attendance.filter(a => a.STATUS === "Nepřijdu").length
    const open  = attendance.filter(a => !a.STATUS).length

    html += `<div class="card attendance-summary">
      <div class="summary-item"><span class="icon">${iconCheck()}</span> Přijdu <b>${yes}</b></div>
      <div class="summary-item"><span class="icon">${iconMaybe()}</span> Možná <b>${maybe}</b></div>
      <div class="summary-item"><span class="icon">${iconClose()}</span> Nepřijdu <b>${no}</b></div>
      <div class="summary-item"><span class="icon">${iconQuestion()}</span> Nevyplněno <b>${open}</b></div>
    </div>`

    html += "<div>"
    attendance.forEach(a => {
      const icon = a.STATUS === "Přijdu"   ? iconCheck() :
                   a.STATUS === "Možná"    ? iconMaybe() :
                   a.STATUS === "Nepřijdu" ? iconClose() : iconQuestion()
      html += `<div class="small"><span class="icon">${icon}</span> ${escapeHtml(a.NAME)}</div>`
    })
    html += "</div>"

    // admin tlačítka
    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
  html += `<hr>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">`

  if(event.DOC_URL){
    html += `<a href="${escapeHtml(event.DOC_URL)}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:#f2f2f7;border-radius:12px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
   Otevřít infodokument
    </a>`
  }

  html += `<button onclick="uploadDocUrl('${id}')" style="width:100%">
     ${event.DOC_URL ? "Změnit infodokument" : "Nahrát infodokument"}
  </button>`

  html += `<button onclick="openProgramEditor('${id}')" style="width:100%">
    Vytvořit / upravit program
  </button>`

  if(MEMBER_ROLE === "ADMIN"){
    html += `<div style="display:flex;gap:8px">
      <button onclick="openEventForm('${id}')" style="flex:1">Upravit akci</button>
      <button onclick="deleteEvent('${id}')" style="flex:1;background:#fdecec;color:#c00">Smazat</button>
    </div>`
  }

  html += `</div>`
}


    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání akce: " + (err?.message || err))
  }

}

async function uploadDocUrl(eventId){
  const url = prompt("Vlož odkaz na infodokument:")
  if(!url || !url.startsWith("http")){ 
    if(url !== null) alert("Neplatný odkaz — musí začínat http")
    return 
  }
  try{
    await api("setdocurl", {id: eventId, url})
    invalidateCache("eventdetail", eventId)
    openEvent(eventId)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

async function openProgramEditor(eventId){

  setLoading()

  try{

    const repertoar = await cachedApi("repertoar")
    const detail    = await cachedApi("eventdetail", {id: eventId})
    const event     = detail.event   || {}
    const program   = detail.program || []

    const currentIds = program
      .sort((a,b) => Number(a.ORDER) - Number(b.ORDER))
      .map(p => p.SONG_ID)

    const active = repertoar.filter(r =>
      r.STATUS === "Aktivní" || r.STATUS === "aktivní"
    ).sort((a,b) => String(a.NAME).localeCompare(String(b.NAME), "cs"))

    // ulož do window pro přístup z search funkce
    window.PROG_SONGS   = active
    window.PROG_EVENT   = eventId
    window.PROG_CURRENT = [...currentIds]

    container().innerHTML = renderProgramEditor(active, currentIds, event)

  }catch(err){
    setError("Chyba: " + (err?.message || err))
  }

}

function renderProgramEditor(songs, currentIds, event){

  let html = `
  <button onclick="openEvent('${escapeHtml(window.PROG_EVENT)}')" style="margin-bottom:12px">← Zpět</button>
  <h2>Program: ${escapeHtml(event.NAME || "")}</h2>
  <p class="small">Vyber až 10 skladeb v požadovaném pořadí.</p>

  <div class="card" style="margin-bottom:16px">
    <input
      id="progSearch"
      placeholder="🔍 Hledat skladbu…"
      oninput="filterProgSongs(this.value)"
      style="margin-bottom:0"
    >
  </div>

  <div id="progSongList" style="max-height:260px;overflow-y:auto;margin-bottom:16px">`

  songs.forEach(r => {
    html += `<div class="prog-song-row" data-id="${escapeHtml(r.ID)}" data-name="${escapeHtml(r.NAME).toLowerCase()}" data-author="${escapeHtml(r.AUTHOR || "").toLowerCase()}"
      onclick="toggleProgSong('${escapeHtml(r.ID)}')"
      style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#fff;border-radius:12px;margin-bottom:6px;cursor:pointer">
      <div>
        <b style="font-size:15px">${escapeHtml(r.NAME)}</b>
        ${r.AUTHOR ? `<div class="small">${escapeHtml(r.AUTHOR)}</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${r.PDF ? `<a href="${escapeHtml(r.PDF)}" target="_blank" onclick="event.stopPropagation()" style="font-size:12px;color:#007aff;text-decoration:none">📄 Noty</a>` : ""}
        <span id="progcheck_${escapeHtml(r.ID)}" style="font-size:18px">${currentIds.includes(r.ID) ? "✅" : ""}</span>
      </div>
    </div>`
  })

  html += `</div>

  <div class="card" style="margin-bottom:16px">
    <div class="small" style="margin-bottom:8px;font-weight:600">Vybrané skladby (v pořadí):</div>
    <div id="progSelected">`

  if(currentIds.length){
    currentIds.forEach((id, i) => {
      const song = songs.find(r => r.ID === id)
      if(!song) return
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f7">
        <span>${i+1}. ${escapeHtml(song.NAME)}</span>
        <button onclick="removeProgSong('${escapeHtml(id)}')" style="padding:4px 10px;font-size:12px;background:#fdecec;color:#c00">✕</button>
      </div>`
    })
  }else{
    html += `<p class="notice" style="margin:0">Zatím žádné skladby</p>`
  }

  html += `</div></div>

  <div style="display:flex;gap:8px">
    <button onclick="saveProgram('${escapeHtml(window.PROG_EVENT)}')" style="flex:1;background:#eaf7ef;color:#1a7a3a">Uložit program</button>
    <button onclick="openEvent('${escapeHtml(window.PROG_EVENT)}')" style="flex:1">Zrušit</button>
  </div>`

  return html

}

function filterProgSongs(query){
  const q = query.toLowerCase().trim()
  document.querySelectorAll(".prog-song-row").forEach(row => {
    const name   = row.dataset.name   || ""
    const author = row.dataset.author || ""
    row.style.display = (!q || name.includes(q) || author.includes(q)) ? "" : "none"
  })
}

function toggleProgSong(songId){
  const idx = window.PROG_CURRENT.indexOf(songId)
  if(idx > -1){
    window.PROG_CURRENT.splice(idx, 1)
  }else{
    if(window.PROG_CURRENT.length >= 10){
      alert("Maximálně 10 skladeb")
      return
    }
    window.PROG_CURRENT.push(songId)
  }
  refreshProgSelected()
  // aktualizuj checkmark
  const check = document.getElementById("progcheck_" + songId)
  if(check) check.textContent = window.PROG_CURRENT.includes(songId) ? "✅" : ""
}

function removeProgSong(songId){
  const idx = window.PROG_CURRENT.indexOf(songId)
  if(idx > -1) window.PROG_CURRENT.splice(idx, 1)
  refreshProgSelected()
  const check = document.getElementById("progcheck_" + songId)
  if(check) check.textContent = ""
}

function refreshProgSelected(){
  const el = document.getElementById("progSelected")
  if(!el) return
  if(!window.PROG_CURRENT.length){
    el.innerHTML = `<p class="notice" style="margin:0">Zatím žádné skladby</p>`
    return
  }
  el.innerHTML = window.PROG_CURRENT.map((id, i) => {
    const song = window.PROG_SONGS.find(r => r.ID === id)
    if(!song) return ""
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f7">
      <span>${i+1}. ${escapeHtml(song.NAME)}</span>
      <button onclick="removeProgSong('${escapeHtml(id)}')" style="padding:4px 10px;font-size:12px;background:#fdecec;color:#c00">✕</button>
    </div>`
  }).join("")
}

async function saveProgram(eventId){
  console.log("saveProgram called, PROG_CURRENT:", window.PROG_CURRENT)
  const songs = window.PROG_CURRENT || []
  console.log("songs length:", songs.length)
  if(!songs.length){ alert("Vyber alespoň jednu skladbu"); return }
  try{
    await api("setprogram", {id: eventId, songs: JSON.stringify(songs)})
    invalidateCache("eventdetail", eventId)
    alert("Program uložen (" + songs.length + " skladeb)")
    openEvent(eventId)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

async function saveProgram(eventId){

  const songs = []
  for(let i = 0; i < 10; i++){
    const val = document.getElementById("prog_" + i)?.value
    if(val) songs.push(val)
  }

  if(!songs.length){
    alert("Vyber alespoň jednu skladbu")
    return
  }

  try{
    await api("setprogram", {id: eventId, songs: JSON.stringify(songs)})
    invalidateCache("eventdetail", eventId)
    lsDel("cache_repertoar")
    alert("Program uložen (" + songs.length + " skladeb)")
    openEvent(eventId)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }

}


function renderAttendanceStatus(status){
  if(!status){
    return `<p class="notice"><span class="icon">${iconQuestion()}</span> Docházka nevyplněna</p>`
  }
  const icon = status === "Přijdu" ? iconCheck() :
               status === "Možná"  ? iconMaybe() : iconClose()
  return `<div class="attendance-status">Tvůj aktuální stav: <b><span class="icon">${icon}</span> ${escapeHtml(status)}</b></div>`
}

/* ===============================
   DOCHÁZKA
================================ */

async function doAttendance(eventId, status){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  try{
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    if(ACTIVE_TAB === "dashboard") renderDashboard()
    else openEvent(eventId)
  }catch(err){
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

async function doAttendanceWithReason(eventId, status){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  const reason = prompt("Důvod nepřítomnosti:")
  if(reason === null) return
  try{
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status, reason})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    if(ACTIVE_TAB === "dashboard") renderDashboard()
    else openEvent(eventId)
  }catch(err){
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

/* ===============================
   SWIPE TO ACTION
================================ */

function addSwipe(el, eventId){

  let startX       = 0
  let startY       = 0
  let endY         = 0
  let currentX     = 0
  let isDragging   = false
  let isHorizontal = null
  let moved        = false
  const THRESHOLD  = 80

  el.addEventListener("click", () => {
    if(!moved) openEvent(eventId)
  })

  el.addEventListener("touchstart", e => {
    startX       = e.touches[0].clientX
    startY       = e.touches[0].clientY
    currentX     = 0
    isDragging   = true
    isHorizontal = null
    moved        = false
    el.style.transition = "none"
  }, {passive: true})

  el.addEventListener("touchmove", e => {
    if(!isDragging) return

    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY

    if(isHorizontal === null){
      if(Math.abs(dx) > Math.abs(dy) + 5){
        isHorizontal = true
      }else if(Math.abs(dy) > Math.abs(dx) + 5){
        isHorizontal = false
      }else{
        return
      }
    }

    if(!isHorizontal) return

    e.preventDefault()
    currentX = dx
    if(Math.abs(dx) > 8) moved = true

    el.style.transform = `translateX(${currentX}px)`

    let wrapper = el.parentElement
    if(currentX > 20){
      wrapper.classList.add("swiping-right")
      wrapper.classList.remove("swiping-left")
    }else if(currentX < -20){
      wrapper.classList.add("swiping-left")
      wrapper.classList.remove("swiping-right")
    }else{
      wrapper.classList.remove("swiping-right", "swiping-left")
    }

  }, {passive: false})

  el.addEventListener("touchend", e => {
    if(!isDragging){
      isDragging = false
      return
    }
    isDragging = false

    endY = e.changedTouches[0].clientY
    const totalMove = Math.abs(currentX) + Math.abs(endY - startY)

    if(!moved && totalMove < 12){
      el.style.transform = ""
      el.parentElement.classList.remove("swiping-right", "swiping-left")
      return
    }

    if(!isHorizontal){
      el.style.transform = ""
      el.parentElement.classList.remove("swiping-right", "swiping-left")
      return
    }

    el.style.transition = "transform 0.2s ease"

    if(currentX > THRESHOLD){
      el.style.transform = `translateX(110%)`
      setTimeout(() => {
        el.style.transform = ""
        el.parentElement.classList.remove("swiping-right", "swiping-left")
        confirmSwipe(eventId, "Přijdu", el)
      }, 200)
    }else if(currentX < -THRESHOLD){
      el.style.transform = `translateX(-110%)`
      setTimeout(() => {
        el.style.transform = ""
        el.parentElement.classList.remove("swiping-right", "swiping-left")
        confirmSwipeWithReason(eventId, el)
      }, 200)
    }else{
      el.style.transform = ""
      el.parentElement.classList.remove("swiping-right", "swiping-left")
    }
  })

}

async function confirmSwipe(eventId, status, el){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena"); return }
  try{
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

async function confirmSwipeWithReason(eventId, el){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena"); return }

  const reason = prompt("Důvod nepřítomnosti:")
  if(reason === null){
    el.style.transition = "transform 0.2s ease"
    el.style.transform = ""
    return
  }

  try{
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status: "Nepřijdu", reason})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

/* ===============================
   SPRÁVA AKCÍ (ADMIN)
================================ */

async function openEventForm(id){

  setLoading()

  let event = {}

  if(id){
    try{
      const data = await cachedApi("eventdetail", {id})
      event = data.event || {}
    }catch(e){
      setError("Chyba při načítání akce")
      return
    }
  }

  const isEdit = !!id
  const dateVal = event.DATE
    ? new Date(event.DATE).toISOString().substring(0,10)
    : ""

  let html = `
  <button onclick="renderEvents()" style="margin-bottom:12px">← Zpět</button>
  <h2>${isEdit ? "Upravit akci" : "Nová akce"}</h2>
  <div class="card">
    <label>Název<br>
      <input id="fName" value="${escapeHtml(event.NAME || "")}" placeholder="Název akce">
    </label>
    <label>Datum<br>
      <input id="fDate" type="date" value="${dateVal}">
    </label>
    <label>Čas začátku<br>
      <input id="fStart" type="time" value="${escapeHtml(event.START || "")}">
    </label>
    <label>Čas konce<br>
      <input id="fEnd" type="time" value="${escapeHtml(event.END || "")}">
    </label>
    <label>Místo<br>
      <input id="fPlace" value="${escapeHtml(event.PLACE || "")}" placeholder="Místo konání">
    </label>
    <label>Poznámka<br>
      <input id="fNote" value="${escapeHtml(event.NOTE || "")}" placeholder="Volitelná poznámka">
    </label>
    <label>Status<br>
      <select id="fStatus">
        <option value="Plánovaná" ${event.STATUS === "Plánovaná" ? "selected" : ""}>Plánovaná</option>
        <option value="Proběhlá"  ${event.STATUS === "Proběhlá"  ? "selected" : ""}>Proběhlá</option>
      </select>
    </label>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button onclick="saveEvent(${isEdit ? `'${id}'` : 'null'})" style="flex:1;background:#eaf7ef;color:#1a7a3a">
        ${isEdit ? "Uložit změny" : "Vytvořit akci"}
      </button>
      <button onclick="renderEvents()" style="flex:1">Zrušit</button>
    </div>
  </div>`

  container().innerHTML = html

}

async function saveEvent(id){

  const name   = document.getElementById("fName")?.value.trim()
  const date   = document.getElementById("fDate")?.value
  const start  = document.getElementById("fStart")?.value
  const end    = document.getElementById("fEnd")?.value
  const place  = document.getElementById("fPlace")?.value.trim()
  const note   = document.getElementById("fNote")?.value.trim()
  const status = document.getElementById("fStatus")?.value

  if(!name){ alert("Zadej název akce"); return }
  if(!date){ alert("Zadej datum"); return }

  try{
    if(id){
      await api("updateevent", {id, name, date, start, end, place, note, status})
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      alert("Akce upravena")
      openEvent(id)
    }else{
      const result = await api("addevent", {name, date, start, end, place, note, status})
      invalidateCache("events")
      alert("Akce vytvořena, vygenerováno " + result.attendanceRows + " řádků docházky")
      renderEvents()
    }
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }

}

async function deleteEvent(id){
  if(!confirm("Opravdu smazat tuto akci?")) return
  try{
    await api("deleteevent", {id})
    invalidateCache("events")
    invalidateCache("eventdetail", id)
    alert("Akce smazána")
    renderEvents()
  }catch(err){
    alert("Chyba při mazání: " + (err?.message || err))
  }
}

/* ===============================
   POZNÁMKA
================================ */

async function saveNote(eventId){
  const note = document.getElementById("eventNote")?.value ?? ""
  try{
    await api("updatenote", {id: eventId, note})
    invalidateCache("eventdetail", eventId)
    alert("Poznámka uložena")
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

/* ===============================
   PLATBY
================================ */

async function renderPayments(){
  setLoading()
  try{
    const data = await cachedApi("payments")
    let html = "<h2>Platby</h2>"
    if(!Array.isArray(data) || !data.length){
      html += "<div class='card'>Žádné platby</div>"
    }else{
      data.forEach(p => {
        html += `<div class="card">${escapeHtml(p.NAME)} – ${escapeHtml(p.STATUS)}</div>`
      })
    }
    container().innerHTML = html
  }catch(err){
    setError("Chyba při načítání plateb: " + (err?.message || err))
  }
}

/* ===============================
   ENERGIE
================================ */

async function renderEnergy(){
  setLoading()
  try{
    const events   = await cachedApi("events")
    const now      = new Date()
    const upcoming = events
      .filter(e => new Date(e.DATE) >= now)
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    let html = "<h2>Energie</h2>"
    html += `<div class="card">
      <label>Akce:<br>
        <select id="energyEvent" style="width:100%;margin:6px 0 12px">
          <option value="">Vyber akci</option>`

    events
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))
      .forEach(e => {
        const selected = upcoming && e.ID === upcoming.ID ? "selected" : ""
        html += `<option value="${escapeHtml(e.ID)}" ${selected}>${escapeHtml(e.NAME)} · ${formatDate(e.DATE)}</option>`
      })

    html += `</select></label>
      <label>Stav na začátku:<br>
        <input id="energyStart" type="number" style="width:100%;margin:6px 0 12px" placeholder="kWh">
      </label>
      <label>Stav na konci:<br>
        <input id="energyEnd" type="number" style="width:100%;margin:6px 0 12px" placeholder="kWh">
      </label>
      <button onclick="saveEnergy()">Uložit</button>
    </div>`

    const history = await cachedApi("energy")
    if(Array.isArray(history) && history.length){
      html += "<h3>Historie</h3>"
      history.reverse().forEach(r => {
        html += `<div class="card small">
          ${formatDate(r.DATE)} · start: ${escapeHtml(String(r.START))} · konec: ${escapeHtml(String(r.END))}
        </div>`
      })
    }

    container().innerHTML = html
  }catch(err){
    setError("Chyba při načítání energie: " + (err?.message || err))
  }
}

async function saveEnergy(){
  const eventId = document.getElementById("energyEvent")?.value
  const start   = document.getElementById("energyStart")?.value
  const end     = document.getElementById("energyEnd")?.value
  if(!eventId){ alert("Vyber akci"); return }
  if(!start)  { alert("Zadej stav na začátku"); return }
  if(!end)    { alert("Zadej stav na konci"); return }
  try{
    await api("setenergy", {event: eventId, start, end})
    invalidateCache("energy")
    renderEnergy()
  }catch(err){
    alert("Chyba při ukládání: " + (err?.message || err))
  }
}

/* ===============================
   HEATMAPA
================================ */

let HEATMAP_MONTH = null

async function renderHeatmap(){

  try{

    const data    = await cachedApi("heatmap")
    const events  = data.events  || []
    const members = data.members || []
    const rows    = data.rows    || []

    if(!events.length || !members.length) return ""

    if(!HEATMAP_MONTH){
      const now = new Date()
      HEATMAP_MONTH = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0")
    }

    const [year, month] = HEATMAP_MONTH.split("-").map(Number)
    const filtered = events.filter(e => {
      const d = new Date(e.DATE)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    const monthName = new Date(year, month - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})

    const lookup = {}
    rows.forEach(r => {
      lookup[r.ID_AKCE + "_" + r.EMAIL] = r.STATUS || ""
    })

    let html = `<h3 class="season-title">Docházka skupiny</h3>`
    html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <button onclick="heatmapPrev()" style="padding:6px 12px">‹</button>
      <span style="flex:1;text-align:center;font-weight:600">${escapeHtml(monthName)}</span>
      <button onclick="heatmapNext()" style="padding:6px 12px">›</button>
    </div>`

    if(!filtered.length){
      html += "<p class='notice'>Žádné akce v tomto měsíci</p>"
      return html
    }

    html += `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">`
    html += `<table class="heatmap"><thead><tr><th class="heatmap-event-col"></th>`

    members.forEach(m => {
      const initials = m.NAME.split(" ").map(n => n[0]).join("")
      html += `<th class="heatmap-th" title="${escapeHtml(m.NAME)}">${escapeHtml(initials)}</th>`
    })
    html += `</tr></thead><tbody>`

    filtered.forEach(e => {
      html += `<tr>`
      html += `<td class="heatmap-label">${escapeHtml(e.NAME)}<span class="heatmap-date"> ${formatDate(e.DATE)}</span></td>`
      members.forEach(m => {
        const status = lookup[e.ID + "_" + m.EMAIL] || ""
        const color  = status === "Přijdu"   ? "#d4f5e2" :
                       status === "Možná"    ? "#fff4dc" :
                       status === "Nepřijdu" ? "#fde8e8" : "#f2f2f7"
        const icon   = status === "Přijdu"   ? "✓" :
                       status === "Možná"    ? "?" :
                       status === "Nepřijdu" ? "✗" : ""
        const reason = rows.find(r => r.ID_AKCE === e.ID && r.EMAIL === m.EMAIL)?.REASON || ""
const clickInfo = status
  ? `heatmapInfo('${escapeHtml(m.NAME)}','${escapeHtml(e.NAME)}','${escapeHtml(status)}','${escapeHtml(reason)}')`
  : ""
html += `<td class="heatmap-cell" style="background:${color};${status ? 'cursor:pointer' : ''}" onclick="${clickInfo}">${icon}</td>`

      })
      html += `</tr>`
    })

    html += `</tbody></table></div>`
    return html

  }catch(err){
    console.error("Heatmap error:", err)
    return ""
  }

}

function heatmapPrev(){
  const [year, month] = HEATMAP_MONTH.split("-").map(Number)
  const d = new Date(year, month - 2, 1)
  HEATMAP_MONTH = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0")
  refreshHeatmap()
}

function heatmapNext(){
  const [year, month] = HEATMAP_MONTH.split("-").map(Number)
  const d = new Date(year, month, 1)
  HEATMAP_MONTH = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0")
  refreshHeatmap()
}

async function refreshHeatmap(){
  const el = document.getElementById("heatmap-container")
  if(!el) return
  el.innerHTML = "<p class='notice'>Načítám…</p>"
  el.innerHTML = await renderHeatmap()
}

function heatmapInfo(name, eventName, status, reason){
  const icon = status === "Přijdu" ? "✅" : status === "Nepřijdu" ? "❌" : "🤔"
  let msg = `${name}\n${eventName}\n\n${icon} ${status}`
  if(reason) msg += `\nDůvod: ${reason}`
  alert(msg)
}

/* ===============================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => start())
