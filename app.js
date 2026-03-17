/* ===============================
   STAV APLIKACE
================================ */

let MEMBER_EMAIL = localStorage.getItem("memberEmail") || null
let MEMBER_NAME  = localStorage.getItem("memberName")  || null
let ACTIVE_TAB   = "dashboard"
const BULLETIN = `Koncert s Verum a InVoice se blíží — sledujte detaily akce.
Proces obměny členů výboru probíhá, více info na zkoušce.`

const profileBtn = document.getElementById("profileBtn")

function getInitials(name){
  if(!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase()
}

// nastavení iniciál
if(MEMBER_NAME){
  profileBtn.textContent = getInitials(MEMBER_NAME)
}
function currentMember(){
  return MEMBER_EMAIL
}

/* ===============================
   HELPERS
================================ */

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
  // celé číslo = hodina (18 → "18:00")
  if(typeof t === "number"){
    return String(Math.floor(t)).padStart(2,"0") + ":00"
  }
  // string s T = ISO datum
if(typeof t === "string" && t.includes("T")){
  const d = new Date(t)
  return d.toLocaleTimeString("cs-CZ", {hour:"2-digit", minute:"2-digit", timeZone:"UTC"})
}
// string ve formátu HH:MM:SS
if(typeof t === "string" && t.includes(":")){
  return t.substring(0, 5)
}

  return String(t).substring(0,5)
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

function isToday(date){
  const d = new Date(date)
  const t = new Date()
  return d.toDateString() === t.toDateString()
}

/* ===============================
   START
================================ */

async function start(){

  try{

    setLoading()

    const members = await api("members")

    const select = document.getElementById("memberSelect")

    members.forEach(m => {
      const opt = document.createElement("option")
      opt.value = m.EMAIL
      opt.textContent = m.NAME
      opt.dataset.name = m.NAME
      select.appendChild(opt)
    })

    // obnov uložený výběr
    if(MEMBER_EMAIL){
      select.value = MEMBER_EMAIL
      setStatus(MEMBER_NAME)
    }

    select.onchange = () => {
      const opt = select.options[select.selectedIndex]
      MEMBER_EMAIL = select.value
      MEMBER_NAME  = opt.dataset.name || ""
      localStorage.setItem("memberEmail", MEMBER_EMAIL)
      localStorage.setItem("memberName",  MEMBER_NAME)
      setStatus(MEMBER_NAME)
      renderDashboard()
    }

    // zapoj navigaci
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
   DASHBOARD
================================ */

async function renderDashboard(){

  setLoading()

  try{

    const events = await api("events")
    const now    = new Date()

    // filtr koncertů — vynechat zkoušky a plánování
    const keywords = ["zkouška", "zkoušky", "plánování"]
    const concerts = events.filter(e => {
      const name = (e.NAME || "").toLowerCase()
      return !keywords.some(k => name.includes(k))
    })

    // sezóny
    const spring = concerts.filter(e => {
      const m = new Date(e.DATE).getMonth() + 1
      return m >= 1 && m <= 6
    })
    const autumn = concerts.filter(e => {
      const m = new Date(e.DATE).getMonth() + 1
      return m >= 7 && m <= 12
    })

    // nejbližší akce (včetně zkoušek)
    const upcoming = events
      .filter(e => new Date(e.DATE) >= now)
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    let html = ""

     // --- NEJBLIŽŠÍ AKCE (HERO) ---
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
        <button onclick="doAttendance('${upcoming.ID}','Přijdu')">✅ Přijdu</button>
        <button onclick="doAttendance('${upcoming.ID}','Možná')">🤔 Možná</button>
        <button onclick="doAttendanceWithReason('${upcoming.ID}','Nepřijdu')">❌ Nepřijdu</button>
      </div>
    </div>`
  }

}
     
    // --- AKTUALITY ---
    html += `
    <div class="card bulletin">
      <b>📋 Aktuality</b>
      <p>${escapeHtml(BULLETIN).replaceAll("\n","<br>")}</p>
    </div>`

    // --- KONCERTY JARO/LÉTO ---
    html += `<h3 class="season-title">🌿 Jaro / Léto</h3>`
    if(spring.length){
      spring.forEach(e => {
        html += concertRow(e, now)
      })
    }else{
      html += "<p class='notice'>Žádné koncerty</p>"
    }

    // --- KONCERTY PODZIM/ZIMA ---
    html += `<h3 class="season-title">🍂 Podzim / Zima</h3>`
    if(autumn.length){
      autumn.forEach(e => {
        html += concertRow(e, now)
      })
    }else{
      html += "<p class='notice'>Žádné koncerty</p>"
    }

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání přehledu: " + (err?.message || err))
  }

}

function concertRow(e, now){
  const past = new Date(e.DATE) < now
  return `<div class="concert-row${past ? " muted" : ""}" onclick="openEvent('${escapeHtml(e.ID)}')">
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

    let html = "<h2>Akce</h2>"

    events.forEach(e => {
      const probehlá = new Date(e.DATE) < new Date()
      html += `
      <div class="card${probehlá ? " muted" : ""}" onclick="openEvent('${escapeHtml(e.ID)}')">
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
    html += "<hr><h3>Program</h3>"
    if(program.length){
      program.forEach(p => {
        html += `<div class="card">
          <b>${escapeHtml(p.NAME)}</b>
          ${p.AUTHOR ? "<span class='small'> · " + escapeHtml(p.AUTHOR) + "</span>" : ""}
          ${p.LENGTH ? "<span class='small'> · " + escapeHtml(p.LENGTH) + "</span>" : ""}
        </div>`
      })
    }else{
      html += "<p class='notice'>Program není k dispozici</p>"
    }
    // poznámka k akci
    html += `<hr><h3>Poznámka</h3>`
    html += `<div class="card">
      <textarea id="eventNote" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(event.NOTE || "")}</textarea>
      <button style="margin-top:8px" onclick="saveNote('${id}')">Uložit poznámku</button>
    </div>`
     
    // docházka — tlačítka
    html += "<hr><h3>Docházka</h3>"

    if(MEMBER_EMAIL){
      const myRow    = attendance.find(a => a.EMAIL === MEMBER_EMAIL)
      const myStatus = myRow?.STATUS || ""

      html += renderAttendanceStatus(myStatus)
      html += `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="doAttendance('${id}','Přijdu')">✅ Přijdu</button>
        <button onclick="doAttendance('${id}','Možná')">🤔 Možná</button>
        <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">❌ Nepřijdu</button>
      </div>`
    }else{
      html += "<p class='notice'>Vyber člena pro zapsání docházky.</p>"
    }

    // přehled docházky skupiny
    html += "<hr><h3>Přehled skupiny</h3>"
    const yes   = attendance.filter(a => a.STATUS === "Přijdu").length
    const maybe = attendance.filter(a => a.STATUS === "Možná").length
    const no    = attendance.filter(a => a.STATUS === "Nepřijdu").length
    const open  = attendance.filter(a => !a.STATUS).length

    html += `<div class="card">
      ✅ Přijdu: <b>${yes}</b> &nbsp;
      🤔 Možná: <b>${maybe}</b> &nbsp;
      ❌ Nepřijdu: <b>${no}</b> &nbsp;
      ❓ Nevyplněno: <b>${open}</b>
    </div>`

    // seznam členů
    html += "<div>"
    attendance.forEach(a => {
      const icon = a.STATUS === "Přijdu" ? "✅" :
                   a.STATUS === "Možná"  ? "🤔" :
                   a.STATUS === "Nepřijdu" ? "❌" : "❓"
      html += `<div class="small" style="padding:4px 0">
        ${icon} ${escapeHtml(a.NAME)}
        ${a.REASON ? "<span style='color:#999'> · " + escapeHtml(a.REASON) + "</span>" : ""}
      </div>`
    })
    html += "</div>"

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání akce: " + (err?.message || err))
  }

}

function renderAttendanceStatus(status){
  if(!status) return "<p class='notice'>Docházka nevyplněna</p>"
  const icon = status === "Přijdu" ? "✅" : status === "Možná" ? "🤔" : "❌"
  return `<p>Tvůj aktuální stav: <b>${icon} ${escapeHtml(status)}</b></p>`
}

/* ===============================
   DOCHÁZKA
================================ */

async function doAttendance(eventId, status){

  if(!MEMBER_EMAIL){
    alert("Nejdřív vyber člena nahoře")
    return
  }

  try{
    await api("setattendance", {
      event:  eventId,
      member: MEMBER_EMAIL,
      status: status
    })
    // obnov aktuální pohled
    if(ACTIVE_TAB === "dashboard") renderDashboard()
    else openEvent(eventId)
  }catch(err){
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }

}

async function doAttendanceWithReason(eventId, status){

  if(!MEMBER_EMAIL){
    alert("Nejdřív vyber člena nahoře")
    return
  }

  const reason = prompt("Důvod nepřítomnosti:")
  if(reason === null) return  // zrušeno

  try{
    await api("setattendance", {
      event:  eventId,
      member: MEMBER_EMAIL,
      status: status,
      reason: reason
    })
    if(ACTIVE_TAB === "dashboard") renderDashboard()
    else openEvent(eventId)
  }catch(err){
    alert("Chyba při ukládání docházky: " + (err?.message || err))
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

    const events = await api("events")
    const now    = new Date()
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

    // historie
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
   INIT
================================ */

start()
