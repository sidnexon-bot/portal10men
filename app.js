/* ===============================
   STAV APLIKACE
================================ */

let MEMBER_EMAIL = localStorage.getItem("memberEmail") || null
let MEMBER_NAME  = localStorage.getItem("memberName")  || null
let ACTIVE_TAB   = "dashboard"
let MEMBER_ROLE = localStorage.getItem("memberRole") || "MEMBER"

const BULLETIN = `Koncert s Verum a InVoice se blíží — sledujte detaily akce.
Proces obměny členů výboru probíhá, více info na zkoušce.`

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

/* ===============================
   START
================================ */

async function start(){

  try{

    setLoading()

    const members = await api("members")
    window.MEMBERS = members

    const profileBtn = document.getElementById("profileBtn")
    if(!profileBtn){ console.error("profileBtn nenalezen"); return }

    if(MEMBER_EMAIL){
      profileBtn.textContent = getInitials(MEMBER_NAME)
      setStatus(MEMBER_NAME)
    }

    profileBtn.onclick = () => openMemberModal()

    document.getElementById("btnDashboard").onclick = () => { setActiveTab("dashboard"); renderDashboard() }
    document.getElementById("btnEvents").onclick    = () => { setActiveTab("events");    renderEvents() }
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

    const events = await api("events")
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
          detail = await api("eventdetail", {id: upcoming.ID})
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
      spring.forEach(e => { html += concertRow(e, now) })
    }else{
      html += "<p class='notice'>Žádné koncerty</p>"
    }

    // --- KONCERTY PODZIM/ZIMA ---
    html += `<h3 class="season-title">🍂 Podzim / Zima</h3>`
    if(autumn.length){
      autumn.forEach(e => { html += concertRow(e, now) })
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

    const events = await api("events")

    if(!Array.isArray(events) || !events.length){
      setError("Žádné akce")
      return
    }

    events.sort((a,b) => new Date(a.DATE) - new Date(b.DATE))
     const now = new Date()
const filtered = events.filter(e => new Date(e.DATE) >= now)

if(!filtered.length){
  container().innerHTML = "<h2>Akce</h2><p class='notice'>Žádné nadcházející akce</p>"
  return
}

    let html = "<h2>Akce</h2>"

    filtered.forEach(e => {
      const probehlá = new Date(e.DATE) < new Date()
      html += `<div class="card${probehlá ? " muted" : ""}" onclick="openEvent('${escapeHtml(e.ID)}')">
        <b>${escapeHtml(e.NAME)}</b><br>
        <span class="small">
          ${formatDate(e.DATE)}
          ${e.START ? "· " + formatTime(e.START) : ""}
          ${e.END   ? "– " + formatTime(e.END)   : ""}
        </span><br>
        <span class="small">${escapeHtml(e.PLACE)}</span>
        ${probehlá ? "<span class='small'> · Proběhlá</span>" : ""}
      </div>`
    })

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání akcí: " + (err?.message || err))
  }

}

/* ===============================
   EVENT DETAIL
================================ */

async function openEvent(id){

  setLoading()

  try{

    const data       = await api("eventdetail", {id})
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
        ${program.map(p => `
          <div class="event-row">
            <div>
              <b>${escapeHtml(p.NAME)}</b>
              ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
            </div>
            ${p.LENGTH ? `<div class="small">${escapeHtml(p.LENGTH)}</div>` : ""}
          </div>
        `).join("")}
      </div>`
    }else{
      html += "<p class='notice'>Program není k dispozici</p>"
    }

    // poznámka
    html += `<div class="card">
      <textarea id="eventNote" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(event.NOTE || "")}</textarea>
      <button style="margin-top:8px" onclick="saveNote('${id}')">Uložit poznámku</button>
    </div>`

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

    html += `
<div class="card attendance-summary">

  <div class="summary-item">
    <span class="icon">${iconCheck()}</span>
    Přijdu <b>${yes}</b>
  </div>

  <div class="summary-item">
    <span class="icon">${iconMaybe()}</span>
    Možná <b>${maybe}</b>
  </div>

  <div class="summary-item">
    <span class="icon">${iconClose()}</span>
    Nepřijdu <b>${no}</b>
  </div>

  <div class="summary-item">
    <span class="icon">${iconQuestion()}</span>
    Nevyplněno <b>${open}</b>
  </div>

</div>
`

    html += "<div>"
    attendance.forEach(a => {
      const icon =
  a.STATUS === "Přijdu"   ? iconCheck() :
  a.STATUS === "Možná"    ? iconMaybe() :
  a.STATUS === "Nepřijdu" ? iconClose() :
                            iconQuestion()

html += `
<div class="small">
  <span class="icon">${icon}</span>
  ${escapeHtml(a.NAME)}
</div>`
    })
    html += "</div>"

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání akce: " + (err?.message || err))
  }

}

function renderAttendanceStatus(status){
  if(!status){
    return `<p class="notice">
      <span class="icon">${iconQuestion()}</span>
      Docházka nevyplněna
    </p>`
  }

  const icon =
    status === "Přijdu"   ? iconCheck() :
    status === "Možná"    ? iconMaybe() :
                            iconClose()

  return `
  <div class="attendance-status">
    Tvůj aktuální stav:
    <b>
      <span class="icon">${icon}</span>
      ${escapeHtml(status)}
    </b>
  </div>
  `
}

/* ===============================
   DOCHÁZKA
================================ */

async function doAttendance(eventId, status){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  try{
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status})
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
    if(ACTIVE_TAB === "dashboard") renderDashboard()
    else openEvent(eventId)
  }catch(err){
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

/* ===============================
   POZNÁMKA
================================ */

async function saveNote(eventId){
  const note = document.getElementById("eventNote")?.value ?? ""
  try{
    await api("updatenote", {id: eventId, note})
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
    const data = await api("payments")
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
    const events  = await api("events")
    const now     = new Date()
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

    const history = await api("energy")
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
    renderEnergy()
  }catch(err){
    alert("Chyba při ukládání: " + (err?.message || err))
  }
}

/* ===============================
   HEATMAPA
================================ */

let HEATMAP_MONTH = null // null = aktuální měsíc

async function renderHeatmap(){

  try{

    const data    = await api("heatmap")
    const events  = data.events  || []
    const members = data.members || []
    const rows    = data.rows    || []

    if(!events.length || !members.length) return ""

    // inicializuj měsíc na aktuální
    if(!HEATMAP_MONTH){
      const now = new Date()
      HEATMAP_MONTH = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0")
    }

    // filtr akcí podle vybraného měsíce
    const [year, month] = HEATMAP_MONTH.split("-").map(Number)
    const filtered = events.filter(e => {
      const d = new Date(e.DATE)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    // název měsíce
    const monthName = new Date(year, month - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})

    // lookup
    const lookup = {}
    rows.forEach(r => {
      lookup[r.ID_AKCE + "_" + r.EMAIL] = r.STATUS || ""
    })

    let html = `<h3 class="season-title"> Docházka skupiny</h3>`

    // navigace měsíců
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
    html += `<table class="heatmap">`
    html += `<thead><tr><th class="heatmap-event-col"></th>`

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
        html += `<td class="heatmap-cell" style="background:${color}" title="${escapeHtml(m.NAME)}: ${escapeHtml(status) || "nevyplněno"}">${icon}</td>`
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

/* ===============================
   INIT
================================ */

start()
