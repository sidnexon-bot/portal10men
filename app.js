/* ==============================
   STAV APLIKACE
================================ */

import { } from "./api.js"

let MEMBER_EMAIL = null
let MEMBER_NAME  = null
let ACTIVE_TAB   = "dashboard"
let MEMBER_ROLE  = "MEMBER"
let AUTH_ROLE = null // původní role přihlášeného – nemění se při přepínání člena

const BULLETIN = `Koncert s Verum a InVoice se blíží — sledujte detaily akce.`
const INFODOC_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSevXNcXk9qR3YxiMI_k2OUIAgivQJW5mE-U4uodV91fJ-bWpg/viewform?usp=header"
const isDesktop = window.innerWidth >= 1025

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

   if(action === "payments" && params?.email){
  const key = "payments_" + params.email
  const stored = lsGet(key)
  if(stored){
    api(action, params).then(fresh => lsSet(key, fresh)).catch(()=>{})
    return stored
  }
  const data = await api(action, params)
  lsSet(key, data)
  return data
 }

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

function formatLength(t){
  if(!t) return ""
  if(typeof t === "string" && t.includes("T")){
    const parts = t.split("T")[1].split(".")[0].split(":")
    const m = parseInt(parts[1])
    const s = parseInt(parts[2])
    if(isNaN(m) || isNaN(s)) return ""
    return `${m}:${String(s).padStart(2,"0")}`
  }
  if(typeof t === "string" && t.includes(":")){
    const parts = t.split(":")
    const m = parseInt(parts[1] || parts[0])
    const s = parseInt(parts[2] || 0)
    if(isNaN(m)) return ""
    return `${m}:${String(s).padStart(2,"0")}`
  }
  return ""
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
  container().innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line tall"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton skeleton-line tall"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton skeleton-line tall"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
  `
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
    energy:    "btnEnergy",
    repertoar: "btnRepertoar"

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

function detailPanel(){
  return document.getElementById("detail-panel")
}

function updateAttendanceBadge(eventId, status){
  const card = document.querySelector(`.swipe-card[data-id="${eventId}"]`)
  if(!card) return

  // smaž všechny divy s uppercase stylem (starý badge)
  card.querySelectorAll("div[style*='text-transform:uppercase']").forEach(el => el.remove())
  card.querySelectorAll(".attendance-badge").forEach(el => el.remove())

  const color = status === "Přijdu" ? "#34c759" : status === "Nepřijdu" ? "#ff3b30" : "#ff9f0a"
  const badge = document.createElement("div")
  badge.className = "attendance-badge"
  badge.style.cssText = `margin-top:6px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em`
  badge.textContent = status
  card.appendChild(badge)
}

/* ===============================
   TOAST & LOADING
================================ */

function showToast(msg, duration = 2000){
  let toast = document.getElementById("toast")
  if(!toast){
    toast = document.createElement("div")
    toast.id = "toast"
    toast.className = "toast"
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.classList.add("show")
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.classList.remove("show")
  }, duration)
}

function showSaving(){
  let overlay = document.getElementById("saving-overlay")
  if(!overlay){
    overlay = document.createElement("div")
    overlay.id = "saving-overlay"
    overlay.style.cssText = `
      position:fixed;inset:0;
      background:rgba(242,242,247,0.6);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      z-index:500;
      pointer-events:all;
      transition:opacity 0.2s ease;
    `
    document.body.appendChild(overlay)
  }
  showToast("Ukládám…", 10000)
}


function hideSaving(successMsg = "Uloženo ✓"){
  const overlay = document.getElementById("saving-overlay")
  if(overlay) overlay.remove()
  showToast(successMsg, 1500)
}

/* ===============================
   DARK MODE
================================ */

function initDarkMode(){
  const saved = localStorage.getItem("darkMode")
  if(saved === "1") applyDarkMode(true)
}

function applyDarkMode(on){
  document.body.classList.toggle("dark", on)
  const btn = document.getElementById("darkModeToggle")
  if(btn) btn.textContent = on ? "☀️ Světlý režim" : "🌙 Tmavý režim"

  // aktualizuj barvu status baru
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if(meta) meta.content = on ? "#1c1c1e" : "#f2f2f7"
  updateSidebarDarkLabel()
}

function toggleDarkMode(){
  const isDark = document.body.classList.contains("dark")
  applyDarkMode(!isDark)
  localStorage.setItem("darkMode", isDark ? "0" : "1")
  closeProfileMenu()
}


/* ===============================
   START
================================ */

async function start(){

  try{

    // Nejdříve ověř session – pokud není, přesměruje na login
    if(!initMemberFromSession()) return;
   
    initDarkMode()

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
    document.getElementById("btnRepertoar").onclick = () => { setActiveTab("repertoar"); renderRepertoar() }


    setActiveTab("dashboard")
    renderDashboard()
    initPullToRefresh()
    initSidebar()
    initRealtime()

  }catch(err){
    setError("Chyba při načítání: " + (err?.message || err))
  }

}

/* ===============================
   SIDEBAR (desktop)
================================ */

function initSidebar(){
  const sidebar = document.getElementById("sidebar")
  if(!sidebar) return

  // zobraz sidebar jen na desktopu
  if(window.innerWidth >= 768){
    sidebar.style.display = "flex"
  }

  window.addEventListener("resize", () => {
    sidebar.style.display = window.innerWidth >= 768 ? "flex" : "none"
  })

  // naplň profil
  document.getElementById("sidebarAvatar").textContent = getInitials(MEMBER_NAME)
  document.getElementById("sidebarName").textContent   = MEMBER_NAME  || "—"
  document.getElementById("sidebarRole").textContent   = MEMBER_ROLE  || "—"

   if(AUTH_ROLE === "ADMIN"){
  const switchBtn = document.createElement("button")
  switchBtn.className = "sidebar-action"
  switchBtn.style.cssText = "color:#007aff;margin-top:8px"
  switchBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Přepnout člena`
  switchBtn.onclick = () => openMemberModal()
  document.querySelector(".sidebar-bottom").prepend(switchBtn)
}

  // navigace
  document.getElementById("sidebarDashboard").onclick = () => { setActiveTab("dashboard"); renderDashboard(); updateSidebarActive("dashboard") }
  document.getElementById("sidebarEvents").onclick    = () => { setActiveTab("events");    window.EVENTS_MONTH = null; renderEvents();   updateSidebarActive("events") }
  document.getElementById("sidebarPayments").onclick  = () => { setActiveTab("payments");  renderPayments();  updateSidebarActive("payments") }
  document.getElementById("sidebarEnergy").onclick    = () => { setActiveTab("energy");    renderEnergy();    updateSidebarActive("energy") }
  document.getElementById("sidebarRepertoar").onclick = () => { setActiveTab("repertoar");  renderRepertoar();  updateSidebarActive("repertoar") }

  // dark mode label
  updateSidebarDarkLabel()
}

function updateSidebarActive(tab){
  const map = {
    dashboard: "sidebarDashboard",
    events:    "sidebarEvents",
    payments:  "sidebarPayments",
    energy:    "sidebarEnergy",
    repertoar: "sidebarRepertoar"

  }
  document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"))
  const btn = document.getElementById(map[tab])
  if(btn) btn.classList.add("active")
}

function updateSidebarDarkLabel(){
  const label = document.getElementById("sidebarDarkLabel")
  if(label) label.textContent = document.body.classList.contains("dark") ? "Světlý režim" : "Tmavý režim"
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
    div.textContent = m.NAME || m.name
    if((m.EMAIL || m.email) === MEMBER_EMAIL){
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
  MEMBER_EMAIL = m.EMAIL || m.email
  MEMBER_NAME  = m.NAME  || m.name
  MEMBER_ROLE  = m.ROLE  || m.role || "MEMBER"
  MEMBER_ROLE  = MEMBER_ROLE.toUpperCase()

  const profileBtn = document.getElementById("profileBtn")
  if(profileBtn) profileBtn.textContent = getInitials(MEMBER_NAME)
  document.getElementById("sidebarAvatar").textContent = getInitials(MEMBER_NAME)
  document.getElementById("sidebarName").textContent   = MEMBER_NAME
  document.getElementById("sidebarRole").textContent   = MEMBER_ROLE
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

    const today = new Date()
    today.setHours(0,0,0,0)

    const upcoming = events
      .filter(e => {
        const d = new Date(e.DATE)
        d.setHours(0,0,0,0)
        return d >= today
      })
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    let html = isDesktop ? `<div class="desktop-grid"><div class="desktop-col-left">` : ""

    // --- NEJBLIŽŠÍ AKCE ---
    if(upcoming){
      html += `<h3 class="season-title">📅 Nejbližší akce</h3>`

      let myStatus = ""
      let attendanceCount = 0
      let detail = {attendance:[], program:[]}

      if(MEMBER_EMAIL){
        try{
          detail = await cachedApi("eventdetail", {id: upcoming.ID})
          const myRow = (detail.attendance || []).find(a => a.EMAIL === MEMBER_EMAIL)
          myStatus = myRow?.STATUS || ""
          attendanceCount = (detail.attendance || []).filter(a => a.STATUS === "Přijdu").length
        }catch(e){ console.error("eventdetail fail", e) }
      }

      const statusColor = myStatus === "Přijdu" ? "#34c759" : myStatus === "Možná" ? "#ff9f0a" : myStatus === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
      const statusText  = myStatus || "Nevyplněno"

      html += `<div class="card" style="padding:0">
        <div onclick="toggleDashboardEvent()" style="padding:16px;cursor:pointer">
          <b style="font-size:18px;display:block;margin-bottom:6px">${escapeHtml(upcoming.NAME)}</b>
          <div class="small">${formatDate(upcoming.DATE)}${upcoming.START ? " · " + formatTime(upcoming.START) : ""}${upcoming.END ? " – " + formatTime(upcoming.END) : ""}</div>
          <div class="small">${escapeHtml(upcoming.PLACE)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
            <span style="font-size:13px;font-weight:700;color:${statusColor}">${statusText}</span>
            <span class="small">✓ Přijdu: <b>${attendanceCount}</b></span>
          </div>
        </div>

        <div id="dashEventDetail" style="display:none;border-top:1px solid rgba(128,128,128,0.15)">
          <div style="padding:16px">

            <div class="btn-group" style="margin-bottom:16px">
              <button onclick="doAttendance('${upcoming.ID}','Přijdu')">Přijdu</button>
              <button onclick="doAttendanceMozna('${upcoming.ID}')">Možná</button>
              <button onclick="doAttendanceWithReason('${upcoming.ID}','Nepřijdu')">Nepřijdu</button>
            </div>

            ${upcoming.NOTE ? `<div style="margin-bottom:12px"><span class="small" style="display:block;margin-bottom:4px">Poznámka</span><div style="font-size:15px;white-space:pre-wrap">${escapeHtml(upcoming.NOTE)}</div></div>` : ""}

            ${(()=>{
              const mainProgram   = (detail.program || []).filter(p => !p.ENCORE)
              const encoreProgram = (detail.program || []).filter(p => p.ENCORE)
              if(!mainProgram.length) return `<p class="notice">Program není k dispozici</p>`
              return `<div class="event-card">
                <div class="event-label">Program</div>
                ${mainProgram.map((p,i) => `
                  <div class="event-row">
                    <div>
                      <b>${i+1}. ${escapeHtml(p.NAME)}</b>
                      ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
                    </div>
                    ${p.PDF ? `<a href="${escapeHtml(p.PDF)}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none">📄 Noty</a>` : ""}
                  </div>
                `).join("")}
                ${encoreProgram.length ? `
                  <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
                    <div class="event-label" style="margin-bottom:6px">Přídavky</div>
                    ${encoreProgram.map((p,i) => `
                      <div class="event-row">
                        <div>
                          <b>${i+1}. ${escapeHtml(p.NAME)}</b>
                          ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
                        </div>
                        ${p.PDF ? `<a href="${escapeHtml(p.PDF)}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none">📄 Noty</a>` : ""}
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>`
            })()}

            ${upcoming.DOC_URL ? `
              <a href="${escapeHtml(upcoming.DOC_URL)}" target="_blank"
                style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:#f2f2f7;border-radius:12px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none;margin-top:12px">
                Otevřít infodokument
              </a>
            ` : ""}

            ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
              <hr style="margin:16px 0;border:none;border-top:1px solid rgba(128,128,128,0.15)">
              <div class="btn-group">
                ${MEMBER_ROLE === "ADMIN" ? `<button onclick="openEventForm('${upcoming.ID}')">Upravit akci</button>` : ""}
                <button onclick="openProgramEditor('${upcoming.ID}')">Upravit program</button>
                <button onclick="uploadDocUrl('${upcoming.ID}')">Infodokument</button>
              </div>
            ` : ""}

          </div>
        </div>
      </div>`
    }

    // --- AKTUALITY ---
const aktuality = await cachedApi("aktuality")
const todos     = await cachedApi("todos")
html += `<h3 class="season-title" style="margin-top:20px">📋 Aktuality</h3>`
html += `<div class="card" style="padding:0">`

if(Array.isArray(aktuality) && aktuality.length){
  aktuality.forEach((a, idx) => {
    const isSelected = MEMBER_ROLE === "ADMIN" && AKTUALITA_SELECTED === a.id
    const border = idx < aktuality.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
    html += `<div
      style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"};${isSelected ? "background:#f0f6ff;" : ""}"
      onclick="${MEMBER_ROLE === "ADMIN" ? `selectAktualita('${escapeHtml(a.id)}')` : ""}"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:15px;white-space:pre-wrap">${escapeHtml(a.text||"")}</div>
          ${a.date ? `<div class="small" style="margin-top:4px">Přidáno dne: ${formatDate(a.date)}</div>` : ""}
        </div>
        ${isSelected ? `<div style="color:#007aff;font-size:20px;margin-left:10px">✓</div>` : ""}
      </div>
      ${isSelected ? `
        <div class="btn-group" style="margin-top:10px">
          <button onclick="event.stopPropagation();editAktualita('${escapeHtml(a.id)}','${escapeHtml(a.text||"").replaceAll("'","\\'")}','${a.date||""}')" style="background:#e8f0fe;color:#007aff">Upravit</button>
          <button onclick="event.stopPropagation();deleteAktualita('${escapeHtml(a.id)}')" style="background:#fde8e8;color:#c00">Smazat</button>
        </div>
      ` : ""}
    </div>`
  })
}else{
  html += `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné aktuality</p></div>`
}

if(MEMBER_ROLE === "ADMIN"){
  html += `<div style="padding:10px 16px;border-top:1px solid rgba(128,128,128,0.1)">
    <button onclick="addAktualita()" style="width:100%">+ Přidat aktualitu</button>
  </div>`
}

html += `</div>`

// --- TO-DO LIST ---
html += `<h3 class="season-title" style="margin-top:20px">✅ Úkoly</h3>`
html += `<div class="card" style="padding:0">`

if(Array.isArray(todos) && todos.length){
  todos.forEach((t, idx) => {
    const done       = t.done === true
    const isSelected = MEMBER_ROLE === "ADMIN" && TODO_SELECTED === t.id
    const border     = idx < todos.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.08);" : ""
    html += `<div
      style="padding:10px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"};${isSelected ? "background:#f0f6ff;" : ""}"
      onclick="${MEMBER_ROLE === "ADMIN" ? `selectTodo('${escapeHtml(t.id)}')` : ""}"
    >
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${done ? "#34c759" : "#c7c7cc"};background:${done ? "#34c759" : "transparent"};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${done ? `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fff;fill:none;stroke-width:3"><path d="M5 13l4 4L19 7"/></svg>` : ""}
        </div>
        <span style="flex:1;font-size:14px;${done ? "text-decoration:line-through;color:var(--muted)" : ""}">${escapeHtml(t.text)}</span>
        ${t.deadline ? `<span class="small">${formatDate(t.deadline)}</span>` : ""}
        ${isSelected ? `<div style="color:#007aff;font-size:20px">✓</div>` : ""}
      </div>
      ${isSelected ? `
        <div class="btn-group" style="margin-top:10px">
          <button onclick="event.stopPropagation();editTodoItem('${escapeHtml(t.id)}','${escapeHtml(t.text).replaceAll("'","\\'")}','${t.deadline||""}')" style="background:#e8f0fe;color:#007aff">Upravit</button>
          <button onclick="event.stopPropagation();deleteTodoItem('${escapeHtml(t.id)}')" style="background:#fde8e8;color:#c00">Smazat</button>
          <button onclick="event.stopPropagation();toggleTodo('${escapeHtml(t.id)}',${!done})" style="background:#d4f5e2;color:#1a7a3a">${done ? "Znovu otevřít" : "Vyřešeno"}</button>
        </div>
      ` : ""}
    </div>`
  })
}else{
  html += `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné úkoly</p></div>`
}

if(MEMBER_ROLE === "ADMIN"){
  html += `<div style="padding:10px 16px;border-top:1px solid rgba(128,128,128,0.1)">
    <button onclick="addTodoItem()" style="width:100%">+ Přidat úkol</button>
  </div>`
}

html += `</div>`

    // --- KONCERTY JARO/LÉTO ---
    html += `<h3 class="season-title">🌿 Jaro / Léto</h3>`
    if(spring.length){
      html += `<div class="card" style="padding:0">`
      spring.forEach((e, i) => {
        const past   = new Date(e.DATE) < now
        const border = i < spring.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
        html += `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
          <b style="font-size:15px;display:block">${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
          <div class="small" style="margin-top:3px">${formatDate(e.DATE)}</div>
          ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
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
        const past   = new Date(e.DATE) < now
        const border = i < autumn.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
        html += `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
          <b style="font-size:15px;display:block">${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
          <div class="small" style="margin-top:3px">${formatDate(e.DATE)}</div>
          ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
        </div>`
      })
      html += `</div>`
    }else{
      html += "<p class='notice'>Žádné koncerty</p>"
    }

    const heatmapHtml = await renderHeatmap()
    if(isDesktop){
      html += `</div><div class="desktop-col-right">${heatmapHtml}</div></div>`
    }else{
      html += `<div id="heatmap-container">${heatmapHtml}</div>`
    }

    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání přehledu: " + (err?.message || err))
  }

}

function toggleDashboardEvent(){
  const el      = document.getElementById("dashEventDetail")
  if(!el) return
  const isOpen  = el.style.display !== "none"
  el.style.display = isOpen ? "none" : "block"
}

let AKTUALITA_SELECTED = null
let TODO_SELECTED = null

function toggleAktualita(id){
  const el      = document.getElementById("detailAkt_" + id)
  const chevron = document.getElementById("chevronAkt_" + id)
  if(!el) return
  const isOpen  = el.style.display !== "none"
  el.style.display  = isOpen ? "none" : "block"
  if(chevron) chevron.textContent = isOpen ? "›" : "‹"
}

async function toggleTodo(id, done){
  try{
    await api("updatetodo", {id, done})
    lsDel("todos")
    renderDashboard()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

async function deleteTodoItem(id){
  if(!confirm("Smazat úkol?")) return
  try{
    await api("deletetodo", {id})
    lsDel("todos")
    renderDashboard()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

function concertRow(e, now){
  const past = new Date(e.DATE) < now
  return `<div class="card concert-row${past ? " muted" : ""}" onclick="openEvent('${escapeHtml(e.ID)}')">
    <b>${isToday(e.DATE) ? "🔥 " : ""}${escapeHtml(e.NAME)}</b>
    <span class="small concert-date">${formatDate(e.DATE)}${e.PLACE ? " · " + escapeHtml(e.PLACE) : ""}</span>
  </div>`
}

async function addAktualita(){
  openFormModal("Nová aktualita", [
    {key: "text", label: "Text", type: "textarea"},
    {key: "date", label: "Datum", type: "date"}
  ], async (values) => {
    if(!values.text){ alert("Zadej text"); return }
    try{
      closeFormModal()
      await api("addaktualita", {text: values.text, date: values.date})
      lsDel("aktuality")
      renderDashboard()
    }catch(err){ alert("Chyba: " + err.message) }
  })
}

async function editAktualita(id, text, date){
  openFormModal("Upravit aktualitu", [
    {key: "text", label: "Text", type: "textarea", value: text},
    {key: "date", label: "Datum", type: "date", value: date}
  ], async (values) => {
    if(!values.text){ alert("Zadej text"); return }
    try{
      closeFormModal()
      await api("updateaktualita", {id, text: values.text, date: values.date})
      lsDel("aktuality")
      renderDashboard()
    }catch(err){ alert("Chyba: " + err.message) }
  })
}

async function deleteAktualita(id){
  if(!confirm("Smazat aktualitu?")) return
  try{
    await api("deleteaktualita", {id})
    lsDel("aktuality")
    renderDashboard()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

function selectAktualita(id){
  AKTUALITA_SELECTED = AKTUALITA_SELECTED === id ? null : id
  renderDashboard()
}

function selectTodo(id){
  TODO_SELECTED = TODO_SELECTED === id ? null : id
  renderDashboard()
}

async function editTodoItem(id, text, deadline){
  openFormModal("Upravit úkol", [
    {key: "text",     label: "Úkol",    type: "text", value: text},
    {key: "deadline", label: "Deadline", type: "date", value: deadline}
  ], async (values) => {
    if(!values.text){ alert("Zadej text úkolu"); return }
    try{
      closeFormModal()
      await api("updatetodo", {id, text: values.text, deadline: values.deadline})
      lsDel("todos")
      TODO_SELECTED = null
      renderDashboard()
    }catch(err){ alert("Chyba: " + err.message) }
  })
}

async function addTodoItem(){
  openFormModal("Nový úkol", [
    {key: "text",     label: "Úkol",    type: "text"},
    {key: "deadline", label: "Deadline", type: "date"}
  ], async (values) => {
    if(!values.text){ alert("Zadej text úkolu"); return }
    try{
      closeFormModal()
      await api("addtodo", {text: values.text, deadline: values.deadline})
      lsDel("todos")
      renderDashboard()
    }catch(err){ alert("Chyba: " + err.message) }
  })
}

function openAddCollection(){
  openFormModal("Nový výběr", [
    {key: "name",     label: "Název výběru",        type: "text"},
    {key: "amount",   label: "Částka na osobu (Kč)", type: "number"},
    {key: "deadline", label: "Deadline",              type: "date"}
  ], async (values) => {
    if(!values.name)  { alert("Zadej název"); return }
    if(!values.amount){ alert("Zadej částku"); return }
    try{
      closeFormModal()
      await saveCollection(values.name, values.amount, values.deadline)
    }catch(err){ alert("Chyba: " + err.message) }
  })
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

    const filtered = events.filter(e => {
      const d = new Date(e.DATE)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    const nextEvent = events.find(e => {
      const d = new Date(e.DATE)
      d.setHours(0,0,0,0)
      return d >= now
    })

    let html = `<h2 style="margin:0 0 12px">Akce</h2>`

    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
      html += `<div class="btn-group" style="margin-bottom:16px">`
      html += `<a href="${INFODOC_FORM_URL}" target="_blank" style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;font-size:15px;font-weight:600;background:#e8e8ed;color:#007aff;text-decoration:none">Vytvořit infodokument</a>`
      if(MEMBER_ROLE === "ADMIN"){
        html += `<button onclick="openEventForm()">+ Přidat novou akci</button>`
      }
      html += `</div>`
    }

    html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button onclick="eventsMonthPrev()" style="padding:8px 14px;font-size:16px">‹</button>
      <span style="flex:1;text-align:center;font-weight:600;font-size:16px">${escapeHtml(monthName)}</span>
      <button onclick="eventsMonthNext()" style="padding:8px 14px;font-size:16px">›</button>
    </div>`

    if(!filtered.length){
      html += "<p class='notice'>Žádné akce v tomto měsíci</p>"
      if(isDesktop){
        container().innerHTML = `<div class="events-layout" id="events-layout">
          <div id="events-list">${html}</div>
          <div id="detail-panel-slot"></div>
          <div id="edit-panel-slot"></div>
        </div>`
      }else{
        container().innerHTML = html
      }
      return
    }

    filtered.forEach(e => {
      const d = new Date(e.DATE)
      d.setHours(0,0,0,0)
      const isPast    = d < now
      const isNext    = nextEvent && e.ID === nextEvent.ID
      const opacity   = isPast ? "0.4" : "1"
      const highlight = isNext ? "border-left:3px solid #007aff;" : ""

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

    if(isDesktop){
      container().innerHTML = `<div class="events-layout" id="events-layout">
        <div id="events-list">${html}</div>
        <div id="detail-panel-slot" style="position:sticky;top:40px"></div>
        <div id="edit-panel-slot" style="position:sticky;top:40px"></div>
      </div>`
    }else{
      container().innerHTML = html
    }

    document.querySelectorAll(".swipe-card").forEach(card => {
      const id = card.dataset.id
      addSwipe(card, id)
    })

  }catch(err){
    setError("Chyba při načítání akcí: " + (err?.message || err))
  }

}

async function openEventForm(id){

  const editSlot = document.getElementById("edit-panel-slot")
  const target = (isDesktop && ACTIVE_TAB === "events" && editSlot) ? editSlot : null

  if(target){
    const layout = document.getElementById("events-layout")
    if(layout){
      layout.classList.remove("two-col", "three-col")
      layout.classList.add("three-col")
    }
    target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px">
      <div class="skeleton-card" style="background:transparent">
        <div class="skeleton skeleton-line tall"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>`
  }else{
    setLoading()
  }

  let event = {}
  if(id){
    try{
      const data = await cachedApi("eventdetail", {id})
      event = data.event || {}
    }catch(e){
      if(target){
        target.innerHTML = `<p class="notice">Chyba při načítání akce</p>`
      }else{
        setError("Chyba při načítání akce")
      }
      return
    }
  }

  const isEdit = !!id
  const dateVal = event.DATE
    ? new Date(event.DATE).toISOString().substring(0,10)
    : ""

  let html = `
  ${!isDesktop ? `<button onclick="renderEvents()" style="margin-bottom:12px">← Zpět</button>` : ""}
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
      <textarea id="fNote" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(event.NOTE || "")}</textarea>
    </label>
    <label>Status<br>
      <select id="fStatus">
        <option value="Plánovaná" ${event.STATUS === "Plánovaná" ? "selected" : ""}>Plánovaná</option>
        <option value="Proběhlá"  ${event.STATUS === "Proběhlá"  ? "selected" : ""}>Proběhlá</option>
      </select>
    </label>
    <div class="btn-group" style="margin-top:16px">
      <button onclick="saveEvent(${isEdit ? `'${id}'` : 'null'})" style="background:#d4f5e2;color:#1a7a3a">
        ${isEdit ? "Uložit změny" : "Vytvořit akci"}
      </button>
      <button onclick="${isDesktop ? (id ? `openEvent('${id}')` : "renderEvents()") : "renderEvents()"}">Zrušit</button>
    </div>
  </div>`

  if(target){
    target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px;max-height:90vh;overflow-y:auto">${html}</div>`
  }else{
    container().innerHTML = html
  }

}

async function openEvent(id){

  const slotEl = document.getElementById("detail-panel-slot")
  const target = (isDesktop && ACTIVE_TAB === "events" && slotEl) ? slotEl : null

  if(target){
    const layout = document.getElementById("events-layout")
    if(layout){
      layout.classList.remove("two-col", "three-col")
      layout.classList.add("two-col")
      // smaž edit panel při otevření nového detailu
      const editSlot = document.getElementById("edit-panel-slot")
      if(editSlot) editSlot.innerHTML = ""
    }
    target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px">
      <div class="skeleton-card" style="background:transparent">
        <div class="skeleton skeleton-line tall"></div>
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>`
  }else{
    setLoading()
  }

  try{

    const data       = await cachedApi("eventdetail", {id})
    const event      = data.event      || {}
    const program    = data.program    || []
    const attendance = data.attendance || []

    let html = `
      ${!isDesktop ? `<button onclick="renderEvents()" style="margin-bottom:16px">← Zpět</button>` : ""}
      <h2 style="margin-bottom:16px">${escapeHtml(event.NAME)}</h2>

      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div><span class="small" style="display:block;margin-bottom:2px">Datum</span><b>${formatDate(event.DATE)}</b></div>
          <div><span class="small" style="display:block;margin-bottom:2px">Čas</span><b>${event.START ? formatTime(event.START) : "—"}${event.END ? " – " + formatTime(event.END) : ""}</b></div>
          <div><span class="small" style="display:block;margin-bottom:2px">Místo</span><b>${escapeHtml(event.PLACE) || "—"}</b></div>
          ${event.NOTE ? `<div style="padding-top:8px;border-top:1px solid rgba(128,128,128,0.15)"><span class="small" style="display:block;margin-bottom:4px">Poznámka</span><div style="font-size:15px;white-space:pre-wrap">${escapeHtml(event.NOTE)}</div></div>` : ""}
        </div>
      </div>`

    // --- DOCHÁZKA ---
    const myRow    = attendance.find(a => a.EMAIL === MEMBER_EMAIL)
    const myStatus = myRow?.STATUS || ""

    html += `<div class="event-card">
      <div class="event-label">Docházka</div>
      ${MEMBER_EMAIL ? `
        <div class="attendance-status">${renderAttendanceStatus(myStatus)}</div>
        <div class="btn-group">
          <button onclick="doAttendance('${id}','Přijdu')">Přijdu</button>
          <button onclick="doAttendanceMozna('${id}')">Možná</button>
          <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>
        </div>
      ` : `<div class="muted">Vyber člena</div>`}
    </div>`

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

    html += `<div style="margin-bottom:20px">`
    attendance.forEach(a => {
      const icon  = a.STATUS === "Přijdu"   ? iconCheck() :
                    a.STATUS === "Možná"    ? iconMaybe() :
                    a.STATUS === "Nepřijdu" ? iconClose() : iconQuestion()
      const color = a.STATUS === "Přijdu"   ? "#34c759" :
                    a.STATUS === "Možná"    ? "#ff9f0a" :
                    a.STATUS === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
      html += `<div class="small" style="padding:3px 0;color:${color}">
        <span class="icon" style="color:${color}">${icon}</span>
        ${escapeHtml(a.NAME)}
        ${a.REASON ? `<span style="color:#999"> · ${escapeHtml(a.REASON)}</span>` : ""}
      </div>`
    })
    html += `</div>`

    // --- PROGRAM ---
    const mainProgram   = program.filter(p => !p.ENCORE)
    const encoreProgram = program.filter(p => p.ENCORE)

    if(mainProgram.length){
      html += `<div class="event-card">
        <div class="event-label">Program</div>
        ${mainProgram.map((p, i) => `
          <div class="event-row">
            <div>
              <b>${i+1}. ${escapeHtml(p.NAME)}</b>
              ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${p.PDF ? `<a href="${escapeHtml(p.PDF)}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none;white-space:nowrap">📄 Noty</a>` : ""}
            </div>
          </div>
        `).join("")}
        ${encoreProgram.length ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
            <div class="event-label" style="margin-bottom:6px">Přídavky</div>
            ${encoreProgram.map((p, i) => `
              <div class="event-row">
                <div>
                  <b>${i+1}. ${escapeHtml(p.NAME)}</b>
                  ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  ${p.PDF ? `<a href="${escapeHtml(p.PDF)}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none;white-space:nowrap">📄 Noty</a>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        ` : ""}
        ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
            <button onclick="openProgramEditor('${id}')" style="width:100%">Upravit program</button>
          </div>
        ` : ""}
      </div>`
    }else{
      html += `<div class="event-card">
        <div class="event-label">Program</div>
        <p class="notice" style="margin:0">Program není k dispozici</p>
        ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
            <button onclick="openProgramEditor('${id}')" style="width:100%">Vytvořit program</button>
          </div>
        ` : ""}
      </div>`
    }

    // --- INFODOKUMENT ---
    if(event.DOC_URL){
      html += `<a href="${escapeHtml(event.DOC_URL)}" target="_blank"
        style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:#f2f2f7;border-radius:12px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none;margin-bottom:12px">
        Otevřít infodokument
      </a>`
    }

    // --- ADMIN PANEL ---
    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
      html += `<hr>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">`

      html += `<div class="btn-group">
        <button onclick="uploadDocUrl('${id}')" style="width:100%">
          ${event.DOC_URL ? "Změnit infodokument" : "Nahrát infodokument"}
        </button>
      </div>`

      if(MEMBER_ROLE === "ADMIN"){
        html += `<div class="btn-group">
          <button onclick="openEventForm('${id}')">Upravit akci</button>
          <button onclick="deleteEvent('${id}')" style="background:#fde8e8;color:#c00">Smazat</button>
        </div>`
      }

      html += `</div>`
    }

    if(target){
      target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px;max-height:90vh;overflow-y:auto">${html}</div>`
    }else{
      container().innerHTML = html
    }

  }catch(err){
    if(target){
      target.innerHTML = `<p class="notice">Chyba při načítání akce</p>`
    }else{
      setError("Chyba při načítání akce: " + (err?.message || err))
    }
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

  const editSlot = document.getElementById("edit-panel-slot")
  const target = (isDesktop && ACTIVE_TAB === "events" && editSlot) ? editSlot : null

  if(target){
    const layout = document.getElementById("events-layout")
    if(layout){
      layout.classList.remove("two-col", "three-col")
      layout.classList.add("three-col")
    }
    target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px">
      <div class="skeleton-card" style="background:transparent">
        <div class="skeleton skeleton-line tall"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>`
  }else{
    setLoading()
  }

  try{

    const repertoar = await cachedApi("repertoar")
    const detail    = await cachedApi("eventdetail", {id: eventId})
    const event     = detail.event   || {}
    const program   = detail.program || []

    const mainProgram   = program.filter(p => !p.ENCORE)
    const encoreProgram = program.filter(p => p.ENCORE)

    const active = repertoar
      .sort((a,b) => String(a.NAME).localeCompare(String(b.NAME), "cs"))

    window.PROG_SONGS   = active
    window.PROG_EVENT   = eventId
    window.PROG_MAIN    = mainProgram.map(p => p.SONG_ID)
    window.PROG_ENCORE  = [
      encoreProgram[0]?.SONG_ID || "",
      encoreProgram[1]?.SONG_ID || ""
    ]
    window.PROG_CURRENT = []
    PROG_ACTIVE_SECTION = "main"

    const html = renderProgramEditor(active, [], event)

    if(target){
      target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px;max-height:90vh;overflow-y:auto">${html}</div>`
    }else{
      container().innerHTML = `<div class="prog-wrapper">${html}</div>`
    }

    refreshProgSelected()

  }catch(err){
    if(target){
      target.innerHTML = `<p class="notice">Chyba při načítání programu</p>`
    }else{
      setError("Chyba: " + (err?.message || err))
    }
  }

}

function renderProgramEditor(songs, currentIds, event){

  let html = `
  <button onclick="openEvent('${escapeHtml(window.PROG_EVENT)}')" style="margin-bottom:12px">← Zpět</button>
  <h2>Program: ${escapeHtml(event.NAME || "")}</h2>

  <div class="card" style="margin-bottom:12px">
    <div class="small" style="font-weight:600;margin-bottom:8px">Program</div>
    <div id="progSelected"></div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="small" style="font-weight:600;margin-bottom:8px">Přídavky</div>
    <div id="progEncores"></div>
  </div>

  <div class="card" style="margin-bottom:16px;width:100%">
    <div class="small" style="font-weight:600;margin-bottom:8px">
      Přidávám do: 
      <button onclick="setProgSection('main')"   id="btnSectionMain"   style="padding:4px 10px;font-size:12px;background:#007aff;color:#fff">Program</button>
      <button onclick="setProgSection('encore')" id="btnSectionEncore" style="padding:4px 10px;font-size:12px;background:#e8e8ed;color:#000">Přídavky</button>
    </div>
    <input id="progSearch" placeholder="🔍 Hledat skladbu…" oninput="filterProgSongs(this.value)" style="margin-bottom:12px">
    <div id="progSongList" style="max-height:240px;overflow-y:auto">`

  songs.forEach(r => {
    html += `<div class="prog-song-row"
      data-id="${escapeHtml(r.ID)}"
      data-name="${escapeHtml(r.NAME).toLowerCase()}"
      data-author="${escapeHtml(r.AUTHOR || "").toLowerCase()}"
      onclick="toggleProgSong('${escapeHtml(r.ID)}')"
      style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f2f2f7;cursor:pointer">
      <div>
        <b style="font-size:15px">${escapeHtml(r.NAME)}</b>
        ${r.AUTHOR ? `<div class="small">${escapeHtml(r.AUTHOR)}</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${r.PDF ? `<a href="${escapeHtml(r.PDF)}" target="_blank" onclick="event.stopPropagation()" style="font-size:12px;color:#007aff;text-decoration:none">📄</a>` : ""}
      </div>
    </div>`
  })

  html += `</div></div>

  <div class="btn-group">
    <button onclick="saveProgram('${escapeHtml(window.PROG_EVENT)}')" style="background:#d4f5e2;color:#1a7a3a">Uložit program</button>
    <button onclick="openEvent('${escapeHtml(window.PROG_EVENT)}')">Zrušit</button>
  </div>`

  return html
}

let PROG_ACTIVE_SECTION = "main"

function setProgSection(section){
  PROG_ACTIVE_SECTION = section
  const btnMain   = document.getElementById("btnSectionMain")
  const btnEncore = document.getElementById("btnSectionEncore")
  if(btnMain){
    btnMain.style.background   = section === "main"   ? "#007aff" : "#e8e8ed"
    btnMain.style.color        = section === "main"   ? "#fff"    : "#000"
  }
  if(btnEncore){
    btnEncore.style.background = section === "encore" ? "#007aff" : "#e8e8ed"
    btnEncore.style.color      = section === "encore" ? "#fff"    : "#000"
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

function refreshProgSelected(){
  const el = document.getElementById("progSelected")
  if(el){
    if(!window.PROG_MAIN.length){
      el.innerHTML = `<p class="notice" style="margin:0">Zatím žádné skladby</p>`
    }else{
      el.innerHTML = window.PROG_MAIN.map((id, i) => {
        const song = window.PROG_SONGS.find(r => r.ID === id)
        if(!song) return ""
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f7">
          <span style="flex:1">${i+1}. ${escapeHtml(song.NAME)}</span>
          <div style="display:flex;gap:4px">
            <button onclick="moveProgSong(${i},-1)" style="padding:4px 8px;font-size:13px;background:#e8e8ed;color:#000" ${i===0?"disabled":""}>↑</button>
            <button onclick="moveProgSong(${i},1)"  style="padding:4px 8px;font-size:13px;background:#e8e8ed;color:#000" ${i===window.PROG_MAIN.length-1?"disabled":""}>↓</button>
            <button onclick="removeProgSong('main',${i})" style="padding:4px 8px;font-size:12px;background:#fde8e8;color:#c00">✕</button>
          </div>
        </div>`
      }).join("")
    }
  }

  const ee = document.getElementById("progEncores")
  if(ee){
    const encores = window.PROG_ENCORE.filter(Boolean)
    if(!encores.length){
      ee.innerHTML = `<p class="notice" style="margin:0">Zatím žádné přídavky</p>`
    }else{
      ee.innerHTML = encores.map((id, i) => {
        const song = window.PROG_SONGS.find(r => r.ID === id)
        if(!song) return ""
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f7">
          <span style="flex:1">${i+1}. ${escapeHtml(song.NAME)}</span>
          <button onclick="removeProgSong('encore',${i})" style="padding:4px 8px;font-size:12px;background:#fde8e8;color:#c00">✕</button>
        </div>`
      }).join("")
    }
  }
}

function toggleProgSong(songId){
  if(PROG_ACTIVE_SECTION === "encore"){
    const filled = window.PROG_ENCORE.filter(Boolean).length
    if(filled >= 2){
      showToast("Přídavky jsou plné (max 2)")
      return
    }
    const free = window.PROG_ENCORE.indexOf("")
    if(free > -1) window.PROG_ENCORE[free] = songId
  }else{
    window.PROG_MAIN.push(songId)
  }
  refreshProgSelected()
}

function filterProgSongs(query){
  const q = query.toLowerCase().trim()
  document.querySelectorAll("#progSongList .prog-song-row").forEach(row => {
    const name   = row.dataset.name   || ""
    const author = row.dataset.author || ""
    row.style.display = (!q || name.includes(q) || author.includes(q)) ? "" : "none"
  })
}

function removeProgSong(list, idx){
  if(list === "main"){
    window.PROG_MAIN.splice(idx, 1)
  }else{
    window.PROG_ENCORE[idx] = ""
  }
  refreshProgSelected()
}

function moveProgSong(idx, dir){
  const arr    = window.PROG_MAIN
  const newIdx = idx + dir
  if(newIdx < 0 || newIdx >= arr.length) return
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
  refreshProgSelected()
}

async function saveProgram(eventId){
  const main   = window.PROG_MAIN   || []
  const encore = (window.PROG_ENCORE || []).filter(Boolean)
  try{
    showSaving()
    await api("setprogram", {
      id:     eventId,
      songs:  JSON.stringify(main),
      encore: JSON.stringify(encore)
    })
    invalidateCache("eventdetail", eventId)
    lsDel("cache_repertoar")
    hideSaving("Program uložen ✓")
    openEvent(eventId)
  }catch(err){
    hideSaving("Chyba ✗")
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

function prefetchProgramPdfs(program){
  const pdfs = program.filter(p => p.PDF)
  if(!pdfs.length){ showToast("Program nemá žádné noty"); return }
  pdfs.forEach(p => window.open(p.PDF, "_blank"))
  showToast(`Otevřeno ${pdfs.length} PDF ✓`)
}

/* ===============================
   DOCHÁZKA
================================ */

async function doAttendance(eventId, status){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  try{
    showSaving()
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    hideSaving("Docházka uložena ✓")
    if(ACTIVE_TAB === "dashboard") setTimeout(() => renderDashboard(), 800)
    else openEvent(eventId)
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

async function doAttendanceWithReason(eventId, status){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  const reason = prompt("Důvod nepřítomnosti:")
  if(reason === null) return
  try{
    showSaving()
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status, reason})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    hideSaving("Docházka uložena ✓")
    if(ACTIVE_TAB === "dashboard") setTimeout(() => renderDashboard(), 800)
    else openEvent(eventId)
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

let MOZNA_EVENT_ID = null

function doAttendanceMozna(eventId){
  if(!MEMBER_EMAIL){ alert("Nejdřív vyber člena nahoře"); return }
  MOZNA_EVENT_ID = eventId
  const modal = document.getElementById("moznaModal")
  const input = document.getElementById("moznaReason")
  if(input) input.value = ""
  if(modal) modal.classList.remove("hidden")
}

function closeMoznaModal(){
  const modal = document.getElementById("moznaModal")
  if(modal) modal.classList.add("hidden")
  MOZNA_EVENT_ID = null
}

async function confirmMozna(choice){
  const eventId = MOZNA_EVENT_ID
  const reason  = document.getElementById("moznaReason")?.value.trim() || ""

  if(!reason){
    document.getElementById("moznaReason").style.border = "2px solid #ff3b30"
    document.getElementById("moznaReason").placeholder  = "Důvod je povinný"
    return
  }

  document.getElementById("moznaReason").style.border = ""
  const detailReason = (choice === "spise-ano" ? "Spíše ano" : "Spíše ne") + ": " + reason

  closeMoznaModal()

  if(!eventId){ alert("Chyba: ID akce nenalezeno"); return }

  try{
    showSaving()
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status: "Možná", reason: detailReason})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    hideSaving("Docházka uložena ✓")
    if(ACTIVE_TAB === "dashboard") setTimeout(() => renderDashboard(), 800)
    else openEvent(eventId)
  }catch(err){
    hideSaving("Chyba ✗")
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
    showSaving()
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    hideSaving("Docházka uložena ✓")
    // aktualizuj badge na kartě
    updateAttendanceBadge(eventId, status)
  }catch(err){
    hideSaving("Chyba ✗")
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
    showSaving()
    await api("setattendance", {event: eventId, member: MEMBER_EMAIL, status: "Nepřijdu", reason})
    invalidateCache("eventdetail", eventId)
    lsDel("myattendance_" + MEMBER_EMAIL)
    hideSaving("Nepřijdu ✓")
    updateAttendanceBadge(eventId, "Nepřijdu")
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
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
    showSaving()
    if(id){
      await api("updateevent", {id, name, date, start, end, place, note, status})
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      hideSaving("Akce upravena ✓")
      openEvent(id)
    }else{
      const result = await api("addevent", {name, date, start, end, place, note, status})
      invalidateCache("events")
      hideSaving("Akce vytvořena ✓")
      renderEvents()
    }
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }

}

async function deleteEvent(id){
  if(!confirm("Opravdu smazat tuto akci?")) return
  try{
    showSaving()
    await api("deleteevent", {id})
    invalidateCache("events")
    invalidateCache("eventdetail", id)
    hideSaving("Akce smazána ✓")
    renderEvents()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba při mazání: " + (err?.message || err))
  }
}

/* ===============================
   POZNÁMKA
================================ */

async function saveNote(eventId){
  const note = document.getElementById("eventNote")?.value ?? ""
  try{
    showSaving()
    await api("updatenote", {id: eventId, note})
    invalidateCache("eventdetail", eventId)
    hideSaving("Poznámka uložena ✓")
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

/* ===============================
   PLATBY
================================ */

async function renderPayments(){
  setLoading()
  try{
    const data = await cachedApi("payments", {email: MEMBER_EMAIL})

    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
    html += `<h2 style="margin:0 0 16px">Platby</h2>`

    if(MEMBER_ROLE === "ADMIN"){
      html += `<div class="btn-group" style="margin-bottom:16px">
        <button onclick="openAddCollection()">+ Přidat výběr</button>
      </div>`
    }

    if(!Array.isArray(data) || !data.length){
      html += `<div class="card">Žádné aktivní výběry</div>`
    }else{
      data.forEach(v => {
        const myPaid      = v.myPaid || 0
        const isPaid      = myPaid >= v.amount
        const statusColor = isPaid ? "#34c759" : "#ff3b30"
        const statusText  = isPaid ? "Zaplaceno" : "Nezaplaceno"

        html += `
        <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="toggleCollection('${escapeHtml(v.id)}')">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <b style="font-size:16px">${escapeHtml(v.name)}</b>
              <div class="small" style="margin-top:2px">
                ${v.amount} Kč
                ${v.deadline ? " · do " + formatDate(v.deadline) : ""}
              </div>
            </div>
            <div style="text-align:right">
              <b style="color:${statusColor};font-size:13px">${statusText}</b>
              ${myPaid > 0 && !isPaid ? `<div class="small">${myPaid} Kč zaplaceno</div>` : ""}
              <div style="font-size:18px;color:var(--muted);margin-top:2px" id="chevron_${escapeHtml(v.id)}">›</div>
            </div>
          </div>

          <div id="detail_${escapeHtml(v.id)}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">

            <div class="small" style="font-weight:600;margin-bottom:8px">Přehled skupiny</div>
            ${v.members.map(m => {
              const paid  = m.paid >= v.amount
              const color = paid ? "#34c759" : "#ff3b30"
              const icon  = paid ? "✓" : "✗"
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.08)">
                <span style="font-size:14px;color:${color}">${icon} ${escapeHtml(m.name)}</span>
                <span class="small">${m.paid > 0 ? m.paid + " Kč" : "—"}${m.date ? " · " + formatDate(m.date) : ""}</span>
              </div>`
            }).join("")}

            <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(128,128,128,0.15)">
              <span class="small">Vybráno: <b>${v.totalPaid} Kč</b></span>
              <span class="small">Zbývá: <b>${v.remaining} Kč</b></span>
            </div>

            ${MEMBER_ROLE === "ADMIN" ? `
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">
                <div class="btn-group" style="margin-bottom:12px">
                  <button onclick="event.stopPropagation();deleteCollection('${escapeHtml(v.id)}')" style="background:#fde8e8;color:#c00">Smazat výběr</button>
                </div>
                <div class="small" style="font-weight:600;margin-bottom:8px">Zaznamenat platbu</div>
                <div class="btn-group">
                  <select id="payMember_${escapeHtml(v.id)}" style="flex:2" onclick="event.stopPropagation()">
                    ${v.members.map(m => `<option value="${escapeHtml(m.email)}">${escapeHtml(m.name)}</option>`).join("")}
                  </select>
                  <input id="payAmount_${escapeHtml(v.id)}" type="number" placeholder="Kč" style="width:80px;flex:1" value="${v.amount}" onclick="event.stopPropagation()">
                  <button onclick="event.stopPropagation();recordPayment('${escapeHtml(v.id)}')" style="background:#d4f5e2;color:#1a7a3a">Uložit</button>
                </div>
              </div>
            ` : ""}

          </div>
        </div>`
      })

      // --- FIXNÍ SPODNÍ PANEL ---
      const first = data[0]
      if(first.instructions || first.account || first.qrUrl){
        html += `<div class="card" style="margin-top:8px">
          <div class="small" style="font-weight:600;margin-bottom:6px">Jak zaplatit</div>
          ${first.instructions ? `<div class="small" style="margin-bottom:8px">${escapeHtml(first.instructions)}</div>` : ""}
          ${first.account ? `<div class="small">Účet: <b>${escapeHtml(first.account)}</b></div>` : ""}
          ${first.iban ? `<div class="small">IBAN: <b>${escapeHtml(first.iban)}</b></div>` : ""}
          ${first.qrUrl ? `<div style="margin-top:12px;text-align:center"><img src="${escapeHtml(first.qrUrl)}" style="width:160px;height:160px;border-radius:8px" onerror="this.style.display='none'"></div>` : ""}
        </div>`
      }
    }

    if(isDesktop) html += `</div>`
    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání plateb: " + (err?.message || err))
  }
}

function toggleCollection(id){
  const detail  = document.getElementById("detail_" + id)
  const chevron = document.getElementById("chevron_" + id)
  if(!detail) return
  const isOpen = detail.style.display !== "none"
  detail.style.display  = isOpen ? "none" : "block"
  if(chevron) chevron.textContent = isOpen ? "›" : "‹"
}

async function deleteCollection(id){
  if(!confirm("Opravdu smazat tento výběr včetně všech plateb?")) return
  try{
    showSaving()
    await api("deletecollection", {id})
    lsDel("payments_" + MEMBER_EMAIL)
    hideSaving("Výběr smazán ✓")
    renderPayments()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

async function recordPayment(vyberuvId){
  const email  = document.getElementById("payMember_" + vyberuvId)?.value
  const amount = document.getElementById("payAmount_"  + vyberuvId)?.value
  if(!email || !amount){ alert("Vyber člena a zadej částku"); return }
  try{
    showSaving()
    await api("setpayment", {id_vyberu: vyberuvId, email, paid: amount})
    lsDel("payments")
    hideSaving("Platba uložena ✓")
    renderPayments()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

async function saveCollection(name, amount, deadline){
  try{
    showSaving()
    await api("addcollection", {name, amount, deadline})
    lsDel("payments")
    hideSaving("Výběr vytvořen ✓")
    renderPayments()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

/* ===============================
   ENERGIE
================================ */

let ENERGY_SELECTED = null

async function renderEnergy(){
  setLoading()
  try{
    const events   = await cachedApi("events")
    const now      = new Date()
    const upcoming = events
      .filter(e => new Date(e.DATE) >= now)
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
    html += "<h2>Energie</h2>"
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

  <div class="btn-group" style="margin-bottom:16px">
    <button onclick="setEnergyMode('manual')" id="btnEnergyManual" style="background:#007aff;color:#fff">Zadat ručně</button>
    <button onclick="setEnergyMode('scan')"   id="btnEnergyScan">📷 Skenovat</button>
  </div>

  <div id="energyManual">
    <label>Stav na začátku:<br>
      <input id="energyStart" type="number" style="width:100%;margin:6px 0 12px" placeholder="kWh">
    </label>
    <label>Stav na konci:<br>
      <input id="energyEnd" type="number" style="width:100%;margin:6px 0 12px" placeholder="kWh">
    </label>
  </div>

  <div id="energyScan" style="display:none">
    <div style="margin-bottom:12px">
      <div class="small" style="font-weight:600;margin-bottom:8px">Stav na začátku</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="energyStartScan" type="number" style="flex:1" placeholder="kWh">
        <button onclick="scanMeter('energyStart')" style="flex-shrink:0;padding:10px 14px;font-size:13px">📷</button>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div class="small" style="font-weight:600;margin-bottom:8px">Stav na konci</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="energyEndScan" type="number" style="flex:1" placeholder="kWh">
        <button onclick="scanMeter('energyEnd')" style="flex-shrink:0;padding:10px 14px;font-size:13px">📷</button>
      </div>
    </div>
  </div>

  <div class="btn-group" style="margin-top:8px">
    <button onclick="saveEnergy()">Uložit</button>
  </div>
</div>

<input type="file" id="meterInput" accept="image/*" capture="environment" style="display:none" onchange="processMeterPhoto(this)">`

    const history = await cachedApi("energy")
    if(Array.isArray(history) && history.length){
      html += `<h3 style="margin:16px 0 8px">Historie</h3>`
      html += `<div class="small" style="color:var(--muted);margin-bottom:10px">Klepni na záznam pro výběr</div>`
      html += `<div id="energyList">`

      history.slice().reverse().forEach(r => {
        const isSelected = ENERGY_SELECTED === r.ID
        html += `<div
          class="card energy-row"
          data-id="${escapeHtml(r.ID)}"
          onclick="selectEnergyRow('${escapeHtml(r.ID)}')"
          style="margin-bottom:8px;cursor:pointer;transition:all 0.15s;${isSelected ? "border:2px solid #007aff;background:#f0f6ff" : ""}"
        >
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:14px;font-weight:600">${formatDate(r.DATE)}</div>
              <div class="small">Start: ${escapeHtml(String(r.START))} · Konec: ${escapeHtml(String(r.END))}</div>
              <div class="small">Spotřeba: <b>${(Number(r.END) - Number(r.START)).toFixed(2)} kWh</b></div>
            </div>
            ${isSelected ? `<div style="color:#007aff;font-size:20px">✓</div>` : ""}
          </div>
          ${isSelected ? `
            <div class="btn-group" style="margin-top:10px">
              <button onclick="event.stopPropagation();editEnergyRow('${escapeHtml(r.ID)}',${r.START},${r.END})" style="background:#e8f0fe;color:#007aff">Upravit</button>
              <button onclick="event.stopPropagation();deleteEnergyRow('${escapeHtml(r.ID)}')" style="background:#fde8e8;color:#c00">Smazat</button>
            </div>
          ` : ""}
        </div>`
      })

      html += `</div>`
    }

    if(isDesktop) html += `</div>`
    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání energie: " + (err?.message || err))
  }
}

function setEnergyMode(mode){
  document.getElementById("energyManual").style.display = mode === "manual" ? "block" : "none"
  document.getElementById("energyScan").style.display   = mode === "scan"   ? "block" : "none"
  document.getElementById("btnEnergyManual").style.background = mode === "manual" ? "#007aff" : ""
  document.getElementById("btnEnergyManual").style.color      = mode === "manual" ? "#fff"    : ""
  document.getElementById("btnEnergyScan").style.background   = mode === "scan"   ? "#007aff" : ""
  document.getElementById("btnEnergyScan").style.color        = mode === "scan"   ? "#fff"    : ""
}

let METER_TARGET = null

function scanMeter(targetId){
  METER_TARGET = targetId
  const input = document.getElementById("meterInput")
  if(input) input.click()
}

async function processMeterPhoto(input){
  const file = input.files[0]
  if(!file) return

  showSaving()
  showToast("Rozpoznávám číslice…", 10000)

  try{
    const result = await Tesseract.recognize(file, "eng", {
      tessedit_char_whitelist: "0123456789.",
      psm: 7
    })

    let text = result.data.text.trim()
    text = text.replace(/[^0-9.,]/g, "")
    text = text.replace(",", ".")
    const value = parseFloat(text)

    if(isNaN(value)){
      hideSaving("Nepodařilo se přečíst ✗")
      alert("Nepodařilo se rozpoznat číslo. Zkus lepší osvětlení nebo zadej ručně.")
      return
    }

    const targetInput = document.getElementById(METER_TARGET)
    if(targetInput) targetInput.value = value
    hideSaving("Přečteno: " + value + " kWh ✓")

  }catch(err){
    hideSaving("Chyba OCR ✗")
    alert("Chyba při rozpoznávání: " + (err?.message || err))
  }finally{
    input.value = ""
  }
}

function selectEnergyRow(id){
  ENERGY_SELECTED = ENERGY_SELECTED === id ? null : id
  renderEnergy()
}

function editEnergyRow(id, start, end){
  openFormModal("Upravit záznam", [
    {key: "start", label: "Stav na začátku (kWh)", type: "number", value: start},
    {key: "end",   label: "Stav na konci (kWh)",   type: "number", value: end}
  ], async (values) => {
    if(!values.start || !values.end){ alert("Vyplň obě hodnoty"); return }
    try{
      closeFormModal()
      showSaving()
      await api("updateenergie", {id, start: values.start, end: values.end})
      lsDel("energy")
      ENERGY_SELECTED = null
      hideSaving("Záznam upraven ✓")
      renderEnergy()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}

async function deleteEnergyRow(id){
  if(!confirm("Smazat tento záznam?")) return
  try{
    showSaving()
    await api("deleteenergie", {id})
    lsDel("energy")
    ENERGY_SELECTED = null
    hideSaving("Záznam smazán ✓")
    renderEnergy()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
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
    showSaving()
    await api("setenergy", {event: eventId, start, end})
    invalidateCache("energy")
    hideSaving("Energie uložena ✓")
    renderEnergy()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba při ukládání: " + (err?.message || err))
  }
}

/* ===============================
   REPERTOAR
================================ */

async function renderRepertoar(){
  setLoading()
  try{
    const data      = await cachedApi("repertoar")
    const favorites = MEMBER_EMAIL ? await api("favorites", {email: MEMBER_EMAIL}) : {}

    if(!Array.isArray(data) || !data.length){
      container().innerHTML = `<h2>Repertoár</h2><div class="card">Žádné skladby</div>`
      return
    }

    const sorted = [...data].sort((a,b) => {
      const af = favorites[a.ID] ? 1 : 0
      const bf = favorites[b.ID] ? 1 : 0
      if(bf !== af) return bf - af
      return String(a.NAME).localeCompare(String(b.NAME), "cs")
    })

    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
    html += `<h2 style="margin:0 0 16px">Repertoár</h2>`

    html += `<div class="card" style="margin-bottom:16px">
      <input
        id="repertoarSearch"
        placeholder="🔍 Hledat skladbu, skladatele…"
        oninput="filterRepertoar(this.value)"
        style="margin-bottom:0"
      >
    </div>`

    html += `<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap">`
    const statusy = ["Vše", "Oblíbené", "Aktivní", "Neaktuální", "Mimo repertoár"]
    statusy.forEach(s => {
      html += `<button
        id="filterBtn_${s}"
        onclick="filterRepertoarStatus('${s}')"
        style="padding:6px 14px;font-size:13px;${s === "Vše" ? "background:#007aff;color:#fff" : ""}"
      >${s}</button>`
    })
    html += `</div>`

    html += `<div id="repertoarList" style="margin-top:12px">`

        sorted.forEach(r => {
      const isFav = !!favorites[r.ID]
      const statusColor = r.STATUS === "Aktivní"    ? "#34c759" :
                          r.STATUS === "Neaktuální" ? "#ff9f0a" :
                          r.STATUS === "Mimo rep"   ? "#ff3b30" : "#8e8e93"

      html += `<div class="repertoar-row card"
        data-name="${escapeHtml(r.NAME).toLowerCase()}"
        data-author="${escapeHtml(r.AUTHOR||"").toLowerCase()}"
        data-arranged="${escapeHtml(r.ARRANGED_BY||"").toLowerCase()}"
        data-text="${escapeHtml(r.TEXT_BY||"").toLowerCase()}"
        data-status="${escapeHtml(r.STATUS)}"
        data-fav="${isFav ? "1" : "0"}"
        style="margin-bottom:10px"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px">${escapeHtml(r.NAME)}</div>
            ${r.AUTHOR      ? `<div class="small">Skladatel: ${escapeHtml(r.AUTHOR)}</div>`      : ""}
            ${r.ARRANGED_BY ? `<div class="small">Aranžmá: ${escapeHtml(r.ARRANGED_BY)}</div>`  : ""}
            ${r.TEXT_BY     ? `<div class="small">Text: ${escapeHtml(r.TEXT_BY)}</div>`          : ""}
            <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
              ${r.LENGTH ? `<span class="small">⏱ ${formatLength(r.LENGTH)}</span>` : ""}
              <span style="font-size:11px;font-weight:600;color:${statusColor}">${escapeHtml(r.STATUS)}</span>
              ${r.CODE ? `<span class="small" style="color:var(--muted)">${escapeHtml(r.CODE)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            ${r.PDF ? `
              <a href="${escapeHtml(r.PDF)}" target="_blank"
                style="padding:8px 14px;background:#e8e8ed;border-radius:10px;font-size:13px;font-weight:600;color:#007aff;text-decoration:none;white-space:nowrap">
                Noty
              </a>
            ` : ""}
            <button
              onclick="event.stopPropagation();toggleFav('${escapeHtml(r.ID)}')"
              style="background:none;border:none;padding:4px;cursor:pointer;display:flex;align-items:center;justify-content:center"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="${isFav ? "#ff3b30" : "#c7c7cc"}" fill="${isFav ? "#ff3b30" : "none"}" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`
    })
         html += `</div>`
    if(isDesktop) html += `</div>`
    container().innerHTML = html

  }catch(err){
    setError("Chyba při načítání repertoáru: " + (err?.message || err))
  }
}

async function toggleFav(songId){
  if(!MEMBER_EMAIL) return
  try{
    await api("togglefavorite", {email: MEMBER_EMAIL, songId})
    renderRepertoar()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

function filterRepertoar(query){
  const q = query.toLowerCase().trim()
  document.querySelectorAll(".repertoar-row").forEach(row => {
    const name     = row.dataset.name     || ""
    const author   = row.dataset.author   || ""
    const arranged = row.dataset.arranged || ""
    const text     = row.dataset.text     || ""
    const match = !q || name.includes(q) || author.includes(q) || arranged.includes(q) || text.includes(q)
    row.style.display = match ? "" : "none"
  })
}

function filterRepertoarStatus(status){
  document.querySelectorAll("[id^='filterBtn_']").forEach(btn => {
    btn.style.background = ""
    btn.style.color = ""
  })
  const activeBtn = document.getElementById("filterBtn_" + status)
  if(activeBtn){
    activeBtn.style.background = "#007aff"
    activeBtn.style.color = "#fff"
  }

  document.querySelectorAll(".repertoar-row").forEach(row => {
    if(status === "Vše"){
      row.style.display = ""
    }else if(status === "Oblíbené"){
      row.style.display = row.dataset.fav === "1" ? "" : "none"
    }else{
      row.style.display = row.dataset.status === status ? "" : "none"
    }
  })

  const search = document.getElementById("repertoarSearch")
  if(search) search.value = ""
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
    const today = new Date()
    today.setHours(0,0,0,0)

    const filtered = events.filter(e => {
      const d = new Date(e.DATE)
      d.setHours(0,0,0,0)
      return d.getFullYear() === year && d.getMonth() + 1 === month && d >= today
    })


    const monthName = new Date(year, month - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})

    const lookup = {}
    rows.forEach(r => {
      lookup[r.ID_AKCE + "_" + r.EMAIL] = {status: r.STATUS || "", reason: r.REASON || ""}
    })

    let html = `<h3 class="season-title">Docházka skupiny</h3>`
    html += `<div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;background:var(--card);border-radius:12px;padding:6px 10px">
      <button onclick="heatmapPrev()" style="padding:4px 10px;font-size:16px">‹</button>
      <span style="font-weight:600;font-size:14px">${escapeHtml(monthName)}</span>
      <button onclick="heatmapNext()" style="padding:4px 10px;font-size:16px">›</button>
    </div>`

    if(!filtered.length){
      html += "<p class='notice'>Žádné akce v tomto měsíci</p>"
      return html
    }

    if(isDesktop){

      html += `<div style="overflow-x:auto">
      <table class="heatmap heatmap-desktop" style="width:auto;border-collapse:separate;border-spacing:0 4px"><thead><tr>
        <th style="text-align:left;padding:6px 16px 6px 0;font-size:12px;color:var(--muted);font-weight:600">Akce</th>`

      members.forEach(m => {
        html += `<th style="padding:6px 8px;font-size:11px;color:var(--muted);font-weight:600;text-align:center;white-space:nowrap;min-width:60px">
          ${escapeHtml(m.NAME.split(" ")[0])}<br>
          <span style="font-weight:400">${escapeHtml(m.NAME.split(" ")[1]||"")}</span>
        </th>`
      })
      html += `</tr></thead><tbody>`

      filtered.forEach(e => {
        html += `<tr style="border-top:1px solid rgba(128,128,128,0.1)">`
        html += `<td style="padding:8px 16px 8px 0;font-size:12px;white-space:nowrap;vertical-align:middle">
          <div style="font-weight:600">${escapeHtml(e.NAME)}</div>
          <div style="color:var(--muted);font-size:11px">${formatDate(e.DATE)}</div>
        </td>`
        members.forEach(m => {
          const entry  = lookup[e.ID + "_" + m.EMAIL] || {}
          const status = entry.status || ""
          const reason = entry.reason || ""
          const color  = status === "Přijdu"   ? "#d4f5e2" :
                         status === "Možná"    ? "#fff4dc" :
                         status === "Nepřijdu" ? "#fde8e8" : "#f2f2f7"
          const icon   = status === "Přijdu"   ? "✓" :
                         status === "Možná"    ? "?" :
                         status === "Nepřijdu" ? "✗" : ""
          const click  = status ? `heatmapInfo('${escapeHtml(m.NAME)}','${escapeHtml(e.NAME)}','${escapeHtml(status)}','${escapeHtml(reason)}')` : ""
          html += `<td style="padding:2px 4px;text-align:center;vertical-align:middle">
            <div style="background:${color};${status?"cursor:pointer;":""}width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto" onclick="${click}">${icon}</div>
          </td>`
        })
        html += `</tr>`
      })

      html += `</tbody></table></div>`

    }else{

      // Mobil — jeden blok s kartičkami
      html += `<div class="card" style="padding:0">`

      filtered.forEach((e, idx) => {
        const border = idx < filtered.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.15);" : ""

        html += `<div style="padding:14px 16px;${border}">`

        // název a datum
        html += `<div style="font-weight:600;font-size:15px;margin-bottom:2px">${escapeHtml(e.NAME)}</div>`
        html += `<div class="small" style="margin-bottom:10px">${formatDate(e.DATE)}</div>`

        // avatary
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`

        members.forEach(m => {
          const entry    = lookup[e.ID + "_" + m.EMAIL] || {}
          const status   = entry.status || ""
          const reason   = entry.reason || ""
          const initials = m.NAME.split(" ").map(n => n[0]).join("")

          const bg = status === "Přijdu"   ? "#34c759" :
                     status === "Možná"    ? "#ff9f0a" :
                     status === "Nepřijdu" ? "#ff3b30" : "#c7c7cc"

          const click = status
            ? `heatmapInfo('${escapeHtml(m.NAME)}','${escapeHtml(e.NAME)}','${escapeHtml(status)}','${escapeHtml(reason)}')`
            : ""

          html += `<div
            onclick="${click}"
            style="width:32px;height:32px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;cursor:${status ? "pointer" : "default"};flex-shrink:0"
            title="${escapeHtml(m.NAME)}: ${escapeHtml(status) || "nevyplněno"}"
          >${escapeHtml(initials)}</div>`
        })

        html += `</div>`

        // shrnutí docházky
        const prijdu  = members.filter(m => (lookup[e.ID + "_" + m.EMAIL]?.status || "") === "Přijdu")
        const total   = prijdu.length
        const byVoice = {}
        prijdu.forEach(m => {
          const voice = m.VOICE || "?"
          byVoice[voice] = (byVoice[voice] || 0) + 1
        })

        html += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(128,128,128,0.1)">`
        html += `<div class="small" style="margin-bottom:4px">Přítomno: <b>${total} členů</b></div>`
        html += `<div style="display:flex;gap:12px;flex-wrap:wrap">`
        const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
Object.entries(byVoice)
  .sort((a, b) => {
    const ai = voiceOrder.indexOf(a[0])
    const bi = voiceOrder.indexOf(b[0])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  .forEach(([voice, count]) => {

          html += `<span class="small">${escapeHtml(voice)}: <b>${count}</b></span>`
        })
        html += `</div></div>`

        html += `</div>` // konec řádku akce
      })

      html += `</div>` // konec card bloku
    }

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
  const el = document.getElementById("heatmap-container") || document.querySelector(".desktop-col-right")
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
   PULL TO REFRESH
================================ */

function initPullToRefresh(){
  let startY     = 0
  let pulling    = false
  let indicator  = null
  const THRESHOLD = 80

  document.addEventListener("touchstart", e => {
    if(window.scrollY === 0){
      startY  = e.touches[0].clientY
      pulling = true
    }
  }, {passive: true})

  document.addEventListener("touchmove", e => {
    if(!pulling) return
    const dy = e.touches[0].clientY - startY
    if(dy <= 0) return

    if(!indicator){
      indicator = document.createElement("div")
      indicator.id = "pull-indicator"
      indicator.style.cssText = `
        position:fixed;top:0;left:0;right:0;
        display:flex;align-items:center;justify-content:center;
        height:0;overflow:hidden;
        background:rgba(242,242,247,0.9);
        backdrop-filter:blur(10px);
        font-size:13px;color:#8e8e93;font-weight:600;
        transition:height 0.1s;
        z-index:50;
      `
      document.body.prepend(indicator)
    }

    const progress = Math.min(dy / THRESHOLD, 1)
    const height   = Math.min(dy * 0.4, 60)
    indicator.style.height = height + "px"

    if(progress < 1){
      indicator.textContent = "↓ Potáhni pro obnovení"
    }else{
      indicator.textContent = "↑ Uvolni pro obnovení"
    }

  }, {passive: true})

  document.addEventListener("touchend", e => {
    if(!pulling) return
    pulling = false

    const dy = e.changedTouches[0].clientY - startY

    if(indicator){
      indicator.style.height = "0"
      setTimeout(() => {
        indicator?.remove()
        indicator = null
      }, 200)
    }

    if(dy >= THRESHOLD && window.scrollY === 0){
      // invaliduj cache a refresh
      Object.keys(localStorage)
        .filter(k => k.startsWith("cache_"))
        .forEach(k => localStorage.removeItem(k))

      // obnov aktuální tab
      if(ACTIVE_TAB === "dashboard")  renderDashboard()
      else if(ACTIVE_TAB === "events") renderEvents()
      else if(ACTIVE_TAB === "payments") renderPayments()
      else if(ACTIVE_TAB === "energy") renderEnergy()
    }
  })
}

/* ===============================
   FORMULÁŘ
================================ */

function openFormModal(title, fields, onSubmit){
  const modal = document.getElementById("formModal")
  const titleEl = document.getElementById("formModalTitle")
  const bodyEl  = document.getElementById("formModalBody")
  const submitBtn = document.getElementById("formModalSubmit")

  titleEl.textContent = title
  bodyEl.innerHTML = fields.map(f => `
    <label style="display:block;margin-bottom:12px">
      ${f.label}<br>
      ${f.type === "textarea"
        ? `<textarea id="fModal_${f.key}" style="width:100%;min-height:80px;margin-top:4px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${f.value||""}</textarea>`
        : `<input id="fModal_${f.key}" type="${f.type||"text"}" value="${f.value||""}" placeholder="${f.placeholder||""}" style="margin-top:4px">`
      }
    </label>
  `).join("")

  submitBtn.onclick = () => {
    const values = {}
    fields.forEach(f => {
      values[f.key] = document.getElementById("fModal_" + f.key)?.value.trim() || ""
    })
    onSubmit(values)
  }

  modal.classList.remove("hidden")
}

function closeFormModal(){
  document.getElementById("formModal").classList.add("hidden")
}

/* ===============================
   REALTIME
================================ */

function initRealtime(){
  if(typeof watchChanges === "function"){
    watchChanges((changed) => {
      console.log("Firebase change:", changed)
      invalidateAllCache()
      silentRefresh()
    })
  }
}

function invalidateAllCache(){
  Object.keys(localStorage)
    .filter(k => k.startsWith("cache_"))
    .forEach(k => localStorage.removeItem(k))
  CACHE.detail = {}
  CACHE.ts     = {}
}

async function silentRefresh(){
  if(ACTIVE_TAB === "dashboard")     renderDashboard()
  else if(ACTIVE_TAB === "events")   renderEvents()
  else if(ACTIVE_TAB === "payments") renderPayments()
  else if(ACTIVE_TAB === "energy")   renderEnergy()
}

document.addEventListener("visibilitychange", () => {
  if(!document.hidden){
    // při návratu na stránku jen invaliduj cache a refreshni
    invalidateAllCache()
    silentRefresh()
  }
})

document.addEventListener("DOMContentLoaded", () => {
  const waitForApi = setInterval(() => {
    if(typeof window.api === "function"){
      clearInterval(waitForApi)
      start()
    }
  }, 100)
})

/* ===============================
   INIT
================================ */

// Globální funkce dostupné z HTML
window.openFormModal        = openFormModal
window.closeFormModal       = closeFormModal
window.addAktualita         = addAktualita
window.editAktualita        = editAktualita
window.deleteAktualita      = deleteAktualita
window.selectAktualita      = selectAktualita
window.selectTodo           = selectTodo
window.editTodoItem         = editTodoItem
window.addTodoItem          = addTodoItem
window.toggleTodo           = toggleTodo
window.deleteTodoItem       = deleteTodoItem
window.openAddCollection    = openAddCollection
window.toggleDashboardEvent = toggleDashboardEvent
window.toggleAktualita      = toggleAktualita
window.toggleCollection     = toggleCollection
window.recordPayment        = recordPayment
window.deleteCollection     = deleteCollection
window.openEvent            = openEvent
window.openEventForm        = openEventForm
window.openProgramEditor    = openProgramEditor
window.renderEvents         = renderEvents
window.renderDashboard      = renderDashboard
window.renderPayments       = renderPayments
window.renderEnergy         = renderEnergy
window.renderRepertoar      = renderRepertoar
window.toggleFav            = toggleFav
window.doAttendance         = doAttendance
window.doAttendanceMozna    = doAttendanceMozna
window.doAttendanceWithReason = doAttendanceWithReason
window.confirmMozna         = confirmMozna
window.closeMoznaModal      = closeMoznaModal
window.saveEvent            = saveEvent
window.deleteEvent          = deleteEvent
window.saveNote             = saveNote
window.saveProgram          = saveProgram
window.selectEnergyRow      = selectEnergyRow
window.editEnergyRow        = editEnergyRow
window.deleteEnergyRow      = deleteEnergyRow
window.saveEnergy           = saveEnergy
window.setEnergyMode        = setEnergyMode
window.uploadDocUrl         = uploadDocUrl
window.toggleProgSong       = toggleProgSong
window.removeProgSong       = removeProgSong
window.moveProgSong         = moveProgSong
window.setProgSection       = setProgSection
window.filterProgSongs      = filterProgSongs
window.filterRepertoar      = filterRepertoar
window.filterRepertoarStatus = filterRepertoarStatus
window.heatmapPrev          = heatmapPrev
window.heatmapNext          = heatmapNext
window.heatmapInfo          = heatmapInfo
window.eventsMonthPrev      = eventsMonthPrev
window.eventsMonthNext      = eventsMonthNext
window.prefetchProgramPdfs  = prefetchProgramPdfs
window.Auth                 = Auth
window.toggleDarkMode       = toggleDarkMode

