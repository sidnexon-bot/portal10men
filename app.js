/* ==============================
   STAV APLIKACE
================================ */

import { } from "./api.js"

let MEMBER_EMAIL = null
let MEMBER_NAME  = null
let ACTIVE_TAB   = "dashboard"
let MEMBER_ROLE  = "MEMBER"
let AUTH_ROLE = null // původní role přihlášeného – nemění se při přepínání člena
let ACTIVE_DETAIL_ID = null
let SONG_SELECTED = null
let REPERTOAR_FILTER_OPEN = false
let REPERTOAR_ACTIVE_FILTERS = {status: "Vše", version: "Vše"}

const BULLETIN = `Koncert s Verum se blíží — sledujte detaily akce.`
const INFODOC_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSevXNcXk9qR3YxiMI_k2OUIAgivQJW5mE-U4uodV91fJ-bWpg/viewform?usp=header"
const isDesktop = window.innerWidth >= 1025

// Inicializace identity z Google session (přihlášení přes login.html)
function initMemberFromSession(){
  console.log("MEMBER_ROLE:", MEMBER_ROLE)
  console.log("user z localStorage:", JSON.parse(localStorage.getItem('10base_user')))
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
    switchBtn.classList.remove('hidden')
    switchBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Přepnout člena`
    switchBtn.onclick = () => { closeProfileMenu(); openMemberModal() }
  }else{
    switchBtn.classList.add('hidden')
  }
 }
   // Správa členů pro ADMIN a ART
const profileMenuMembers = document.getElementById("profileMenuMembers")
if(profileMenuMembers){
  if(AUTH_ROLE === "ADMIN" || AUTH_ROLE === "ART"){
    profileMenuMembers.classList.remove("hidden")
  }else{
    profileMenuMembers.classList.add("hidden")
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

function toggleAccordion(bodyId, chevronId){
  const el      = document.getElementById(bodyId)
  const chevron = document.getElementById(chevronId)
  if(!el) return
  const isOpen = el.classList.contains("open")
  el.classList.toggle("open", !isOpen)
  el.style.display = isOpen ? "none" : "block"
  if(chevron) chevron.textContent = isOpen ? "›" : "‹"
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
    repertoar: "btnRepertoar",
    members:   "btnMembers"
  }
  const btn = document.getElementById(map[name])
  if(btn) btn.classList.add("active")
  updateSidebarActive(name)

  const main = document.getElementById("main")
  if(main){
    main.style.opacity = "0"
    main.style.transform = "translateY(6px)"
    requestAnimationFrame(() => {
      main.style.transition = "opacity 0.2s ease, transform 0.2s ease"
      main.style.opacity = "1"
      main.style.transform = "translateY(0)"
    })
  }

  if(name === "dashboard")  renderDashboard()
  if(name === "events")     renderEvents()
  if(name === "payments")   renderPayments()
  if(name === "energy")     renderEnergy()
  if(name === "repertoar")  renderRepertoar()
  if(name === "members")    renderMembers()

  saveState()

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

function confirmModal(text, onConfirm){
  openFormModal(text, [], (values) => {
    closeFormModal()
    onConfirm()
  })
  // nahraď tlačítko Uložit za Potvrdit
  const btn = document.getElementById("formModalSubmit")
  if(btn) btn.textContent = "Potvrdit"
}

function promptModal(label, defaultValue, onConfirm){
  openFormModal(label, [
    {key: "value", label: "", type: "text", value: defaultValue || ""}
  ], (values) => {
    closeFormModal()
    onConfirm(values.value)
  })
}

function toggleRecurrenceUntil(val){
  const wrap = document.getElementById("recurrenceUntilWrap")
  if(wrap) wrap.style.display = val !== "none" ? "block" : "none"
}

function formatObleceni(val){
  const map = {
    "Formální":    "Formální — černé kalhoty a košile, červená kravata",
    "Neformální":  "Neformální — 10men tričko, civilní kalhoty",
    "Zimní civil": "Zimní civil - bunda/kabát"
  }
  return map[val] || val
}

function buildSongDetail(id){
  const card = document.querySelector(`.repertoar-row[data-id="${id}"]`)
  if(!card) return ""
  // potřebujeme data ze skladby — uložíme je do data atributů
  const note = card.dataset.note || ""
  const canEdit = MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"

  return `<div class="song-detail" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">
    ${note ? `<div class="small" style="margin-bottom:10px;white-space:pre-wrap">${escapeHtml(note)}</div>` : ""}
    ${canEdit ? `
      <div class="btn-group">
        <button onclick="event.stopPropagation();openEditSong('${id}')" style="background:#e8f0fe;color:#007aff">Upravit</button>
        <button onclick="event.stopPropagation();deleteSongItem('${id}')" style="background:#fde8e8;color:#c00">Smazat</button>
      </div>
    ` : ""}
  </div>`
}

function saveScroll(){
  return window.scrollY
}

function restoreScroll(pos){
  requestAnimationFrame(() => {
    window.scrollTo(0, pos)
  })
}

const SESSION_TTL = 10 * 60 * 1000 // 10 minut

function saveState(){
  const state = {
    tab:          ACTIVE_TAB,
    eventId:      window.ACTIVE_EVENT_ID || null,
    songSelected: SONG_SELECTED || null,
    eventsMonth:  window.EVENTS_MONTH || null,
    scroll:       window.scrollY,
    timestamp:    Date.now()
  }
  sessionStorage.setItem("10base_state", JSON.stringify(state))
}

function loadState(){
  try{
    const raw = sessionStorage.getItem("10base_state")
    if(!raw) return null
    const state = JSON.parse(raw)
    if(Date.now() - state.timestamp > SESSION_TTL) return null
    return state
  }catch(e){
    return null
  }
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
   NOTIFIKACE
================================ */

async function initPushNotifications(){
  try{
    if(!window.OneSignal) return

    const permission = await OneSignal.Notifications.permission

    if(!permission){
      // zobraz nenápadnou výzvu po 3 sekundách
      setTimeout(() => {
        showPushPrompt()
      }, 3000)
    }
  }catch(e){
    console.error("OneSignal init:", e)
  }
}

function showPushPrompt(){
  const existing = document.getElementById("pushPrompt")
  if(existing) return

  const prompt = document.createElement("div")
  prompt.id = "pushPrompt"
  prompt.style.cssText = `
    position:fixed;bottom:90px;left:16px;right:16px;
    background:var(--card);
    border-radius:16px;
    padding:14px 16px;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);
    display:flex;align-items:center;gap:12px;
    z-index:200;
    animation:fadeInUp 0.3s ease;
  `
  prompt.innerHTML = `
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px">Povolit notifikace</div>
      <div class="small">Dostávej upozornění na nové akce a změny</div>
    </div>
    <button onclick="enablePush()" style="background:#007aff;color:#fff;padding:8px 14px;font-size:13px">Povolit</button>
    <button onclick="document.getElementById('pushPrompt').remove()" style="background:none;color:var(--muted);padding:8px;font-size:13px">✕</button>
  `
  document.body.appendChild(prompt)
}

async function enablePush(){
  try{
    await OneSignal.Notifications.requestPermission()
    document.getElementById("pushPrompt")?.remove()
    showToast("Notifikace povoleny ✓")
  }catch(e){
    console.error("Push permission:", e)
  }
}

/* ===============================
   START
================================ */

async function start(){
  try{
    if(!initMemberFromSession()) return;
   
    initDarkMode()
    setLoading()

    const members = await cachedApi("members")
    window.MEMBERS = members

    const profileBtn = document.getElementById("profileBtn")
    if(!profileBtn){ console.error("profileBtn nenalezen"); return }

    setStatus(MEMBER_NAME)

    profileBtn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById("profileMenu").classList.toggle("hidden");
    }

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

    if(MEMBER_ROLE === "GUEST"){
      document.querySelector(".bottom-wrap")?.style.setProperty("display", "none", "important")
      const profileBtn = document.getElementById("profileBtn")
      if(profileBtn){
        profileBtn.onclick = (e) => {
          e.stopPropagation()
          Auth.logout()
        }
      }
      document.getElementById("btnDashboard").onclick = () => {}
      document.getElementById("btnEvents").onclick    = () => {}
      document.getElementById("btnPayments").onclick  = () => {}
      document.getElementById("btnEnergy").onclick    = () => {}
      document.getElementById("btnRepertoar").onclick = () => {}
      setActiveTab("events")
      renderGuestView()
      initPullToRefresh()
      initRealtime()

      const logoutBar = document.createElement("div")
      logoutBar.style.cssText = "position:fixed;top:16px;right:16px;z-index:100"
      logoutBar.innerHTML = `<button onclick="Auth.logout()" style="background:#fde8e8;color:#c00;padding:8px 14px;font-size:13px">Odhlásit se</button>`
      document.body.appendChild(logoutBar)

    }else{
      initPullToRefresh()
      initSidebar()
      initRealtime()
      initPushNotifications()

      const state = loadState()
      if(state){
        if(state.eventsMonth) window.EVENTS_MONTH = state.eventsMonth
        if(state.songSelected) SONG_SELECTED = state.songSelected
        await setActiveTab(state.tab)
        if(state.eventId && state.tab === "events"){
          await openEvent(state.eventId)
        }
        setTimeout(() => window.scrollTo(0, state.scroll || 0), 500)
      }else{
        setActiveTab("dashboard")
        renderDashboard()
      }
    }

   document.addEventListener("visibilitychange", () => {
     if(document.visibilityState === "hidden"){
       saveState()
     }
     // při návratu nic nepřekreslujeme — stránka zůstane jak byla
   })

  }catch(err){
    setError("Chyba při načítání: " + (err?.message || err))
  }
}

async function renderGuestView(){
  setLoading()
  try{
    const events = await cachedApi("events")
    const now    = new Date()
    now.setHours(0,0,0,0)

    const smetanovo = events
     .filter(e => (e.PLACE || "").includes("Smetanovo") && !e.IS_TEMPLATE)
     .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))


    const upcoming = smetanovo.filter(e => {
      const d = new Date(e.DATE); d.setHours(0,0,0,0); return d >= now
    })
    const past = smetanovo.filter(e => {
      const d = new Date(e.DATE); d.setHours(0,0,0,0); return d < now
    })

    const statusColor = s =>
      s === "Plánovaná" ? "#34c759" :
      s === "Zrušená"   ? "#ff3b30" :
      s === "Proběhlá"  ? "#8e8e93" : "#8e8e93"

    const renderRow = (e, i, arr) => {
      const border  = i < arr.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
      const crossed = e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted);" : ""
      return `<div style="padding:14px 16px;${border}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <b style="font-size:15px;${crossed}">${escapeHtml(e.NAME)}</b>
            <div class="small" style="margin-top:3px">${formatDate(e.DATE)}${e.START ? " · " + formatTime(e.START) : ""}${e.END ? " – " + formatTime(e.END) : ""}</div>
          </div>
          <div style="font-size:11px;font-weight:700;color:${statusColor(e.STATUS)};text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap">${escapeHtml(e.STATUS || "")}</div>
        </div>
      </div>`
    }

    let html = `<h2 style="margin:0 0 16px">Zkoušky 10men</h2>`

    if(upcoming.length){
      html += `<h3 class="season-title">Nadcházející</h3>
        <div class="card" style="padding:0">
          ${upcoming.map((e,i) => renderRow(e, i, upcoming)).join("")}
        </div>`
    }

    if(past.length){
      html += `<h3 class="season-title" style="margin-top:20px">Proběhlé</h3>
        <div class="card" style="padding:0;opacity:0.5">
          ${past.map((e,i) => renderRow(e, i, past)).join("")}
        </div>`
    }

    if(!smetanovo.length){
      html += `<p class="notice">Žádné akce</p>`
    }

    container().innerHTML = html

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
   if(AUTH_ROLE === "ADMIN" || AUTH_ROLE === "ART"){
  const membersBtn = document.createElement("button")
  membersBtn.className = "sidebar-action"
  membersBtn.id = "sidebarMembers"
  membersBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Správa členů`
  membersBtn.onclick = () => setActiveTab("members")
  document.querySelector(".sidebar-bottom").prepend(membersBtn)
}

  const driveBtn = document.createElement("button")
  driveBtn.className = "sidebar-action"
  driveBtn.style.cssText = "color:#007aff"
  driveBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 87.3 78" fill="none" stroke="currentColor" stroke-width="3">
  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.6 15.6 0 0 0 2.1 7.85z"/>
  <path d="M43.65 25L29.9 1.2a15.6 15.6 0 0 0-3.3 3.3L2.1 45.5A15.6 15.6 0 0 0 0 53.35h27.5z"/>
  <path d="M73.55 76.8a15.6 15.6 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25a15.6 15.6 0 0 0 2.1-7.85H60.8l5.85 11.5z"/>
  <path d="M43.65 25L57.4 1.2A15.6 15.6 0 0 0 49.55 0h-11.8a15.6 15.6 0 0 0-7.85 2.1z"/>
  <path d="M60.8 53.35H27.5L13.75 77.1a15.6 15.6 0 0 0 7.85 2.1h40.1a15.6 15.6 0 0 0 7.85-2.1z"/>
  <path d="M73.4 26.95l-13.2-22.85a15.6 15.6 0 0 0-2.8-2.9L43.65 25l17.15 28.35H87.3a15.6 15.6 0 0 0-2.1-7.85z"/>
</svg>
</span> Google Drive`
  driveBtn.onclick = () => window.open("https://drive.google.com/drive/folders/0B23cZAlYDWOndmtIZU45WWJrbWM?resourcekey=0-0z_Lh-UavGxU38cz60Bi2Q&usp=share_link")
  document.querySelector(".sidebar-bottom").prepend(driveBtn)

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
  const scroll = saveScroll()
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
    }).sort((a,b) => new Date(a.DATE) - new Date(b.DATE))

    const autumn = concerts.filter(e => {
      const m = new Date(e.DATE).getMonth() + 1
      return m >= 7 && m <= 12
    }).sort((a,b) => new Date(a.DATE) - new Date(b.DATE))

    const today = new Date()
    today.setHours(0,0,0,0)

    const upcoming = events
      .filter(e => {
        const d = new Date(e.DATE)
        d.setHours(0,0,0,0)
        return d >= today
      })
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]

    const aktuality = await cachedApi("aktuality")
    const todos     = await cachedApi("todos")

    // --- NEJBLIŽŠÍ AKCE data ---
    let myStatus = ""
    let attendanceCount = 0

    if(upcoming && MEMBER_EMAIL){
      try{
        const detail = await cachedApi("eventdetail", {id: upcoming.ID})
        const myRow  = (detail.attendance || []).find(a => a.EMAIL === MEMBER_EMAIL)
        myStatus        = myRow?.STATUS || ""
        attendanceCount = (detail.attendance || []).filter(a => a.STATUS === "Přijdu").length
      }catch(e){ console.error("eventdetail fail", e) }
    }

    const statusColor = myStatus === "Přijdu" ? "#34c759" : myStatus === "Možná" ? "#ff9f0a" : myStatus === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
    const statusText  = myStatus || "Nevyplněno"

    // --- HTML sestavení ---

    // pomocná funkce pro kartu nejbližší akce
    const nearestEventHtml = upcoming ? `
      <h3 class="season-title">📅 Nejbližší akce</h3>
      <div class="card" style="cursor:pointer" onclick="setActiveTab('events');openEvent('${escapeHtml(upcoming.ID)}')">
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          <b style="font-size:18px">${escapeHtml(upcoming.NAME)}</b>
          <div><span class="small">Datum</span><br><b>${formatDate(upcoming.DATE)}${upcoming.DATE_END ? " – " + formatDate(upcoming.DATE_END) : ""}</b></div>
          <div><span class="small">Čas</span><br><b>${upcoming.START ? formatTime(upcoming.START) : "—"}${upcoming.END ? " – " + formatTime(upcoming.END) : ""}</b></div>
          <div><span class="small">Místo</span><br><b>${escapeHtml(upcoming.PLACE) || (upcoming.CALL_URL ? "Online" : "—")}</b></div>
          <div><span class="small" style="display:block;margin-bottom:2px">Typ akce</span><b>${escapeHtml(upcoming.TYPE) || "Zkouška"}</b></div>
        </div>
        ${(upcoming.PLACE || upcoming.CALL_URL) ? `
          <div class="btn-group" style="margin-bottom:16px">
            ${upcoming.PLACE ? `
              <a href="https://maps.google.com/?q=${encodeURIComponent(upcoming.PLACE)}" target="_blank"
                onclick="event.stopPropagation()"
                style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#e8e8ed;border-radius:12px;font-size:13px;font-weight:600;color:#007aff;text-decoration:none">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                Navigovat
              </a>
            ` : ""}
            ${upcoming.CALL_URL ? `
              <a href="${escapeHtml(upcoming.CALL_URL)}" target="_blank"
                onclick="event.stopPropagation()"
                style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#e8e8ed;border-radius:12px;font-size:13px;font-weight:600;color:#007aff;text-decoration:none">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Připojit se
              </a>
            ` : ""}
          </div>
        ` : ""}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">
          <span style="font-size:13px;font-weight:700;color:${statusColor}">${statusText}</span>
          <span class="small dash-attendance-count">✓ Přijdu: <b>${attendanceCount}</b></span>
        </div>
      </div>
    ` : ""

    // pomocná funkce pro Jaro/Léto
    const springHtml = `
      <h3 class="season-title">🌿 Jaro / Léto</h3>
      ${spring.length ? `
        <div class="card" style="padding:0">
          ${spring.map((e, i) => {
            const todayCheck = new Date(e.DATE)
            todayCheck.setHours(0,0,0,0)
            const nowCheck = new Date()
            nowCheck.setHours(0,0,0,0)
            const past = todayCheck < nowCheck
            const border = i < spring.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
            return `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
              ${e.STATUS === "Zrušená" ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:2px;text-transform:uppercase">Zrušená</div>` : ""}
              <b style="font-size:15px;display:block;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}">${isToday(e.DATE) ? "DNES: " : ""}${escapeHtml(e.NAME)}</b>
              <div class="small" style="margin-top:3px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>
              ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
            </div>`
          }).join("")}
        </div>
      ` : "<p class='notice'>Žádné koncerty</p>"}
    `

    // pomocná funkce pro Podzim/Zima
    const autumnHtml = `
      <h3 class="season-title">🍂 Podzim / Zima</h3>
      ${autumn.length ? `
        <div class="card" style="padding:0">
          ${autumn.map((e, i) => {
            const todayCheck = new Date(e.DATE)
            todayCheck.setHours(0,0,0,0)
            const nowCheck = new Date()
            nowCheck.setHours(0,0,0,0)
            const past = todayCheck < nowCheck
            const border = i < autumn.length - 1 ? "border-bottom:1px solid #f2f2f7;" : ""
            return `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
              ${e.STATUS === "Zrušená" ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:2px;text-transform:uppercase">Zrušená</div>` : ""}
              <b style="font-size:15px;display:block;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}">${isToday(e.DATE) ? "DNES: " : ""}${escapeHtml(e.NAME)}</b>
              <div class="small" style="margin-top:3px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>
              ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
            </div>`
          }).join("")}
        </div>
      ` : "<p class='notice'>Žádné koncerty</p>"}
    `

    // pomocná funkce pro Aktuality
    const aktualityHtml = `
      <h3 class="season-title" style="margin-top:20px">📋 Aktuality</h3>
      <div class="card dash-aktuality" style="padding:0">
        ${Array.isArray(aktuality) && aktuality.length ? `
          ${aktuality.map((a, idx) => {
            const isSelected = MEMBER_ROLE === "ADMIN" && AKTUALITA_SELECTED === a.id
            const border = idx < aktuality.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
            return `<div
              style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"}${isSelected ? ";background:var(--card-selected)" : ""}"
              onclick="${MEMBER_ROLE === "ADMIN" ? "selectAktualita('" + escapeHtml(a.id) + "')" : ""}"
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
          }).join("")}
        ` : `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné aktuality</p></div>`}
        ${MEMBER_ROLE === "ADMIN" ? `
          <div style="padding:10px 16px;border-top:1px solid rgba(128,128,128,0.1)">
            <button onclick="addAktualita()" style="width:100%">+ Přidat aktualitu</button>
          </div>
        ` : ""}
      </div>
    `

    // pomocná funkce pro Úkoly
    const todosHtml = `
      <h3 class="season-title" style="margin-top:20px">✅ Úkoly</h3>
      <div class="card dash-todos" style="padding:0">
        ${Array.isArray(todos) && todos.length ? `
          ${todos.map((t, idx) => {
            const done       = t.done === true
            const isSelected = MEMBER_ROLE === "ADMIN" && TODO_SELECTED === t.id
            const border     = idx < todos.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.08);" : ""
            return `<div
              style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"}${isSelected ? ";background:var(--card-selected)" : ""}"
              onclick="${MEMBER_ROLE === "ADMIN" ? "selectTodo('" + escapeHtml(t.id) + "')" : ""}"
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
          }).join("")}
        ` : `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné úkoly</p></div>`}
        ${MEMBER_ROLE === "ADMIN" ? `
          <div style="padding:10px 16px;border-top:1px solid rgba(128,128,128,0.1)">
            <button onclick="addTodoItem()" style="width:100%">+ Přidat úkol</button>
          </div>
        ` : ""}
      </div>
    `

    // --- SESTAVENÍ HTML ---
    const heatmapHtml = await renderHeatmap()

    // --- KONTAKTY ---
      const members = await cachedApi("members")
      const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
      const sortedMembers = [...members]
     .filter(m => (m.ROLE || "").toUpperCase() !== "GUEST")
     .sort((a,b) => {
       const ai = voiceOrder.indexOf(a.VOICE)
       const bi = voiceOrder.indexOf(b.VOICE)
       return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
     })
     
      const contactsHtml = `
        <h3 class="season-title">👥 Kontakty</h3>
        <div class="card" style="padding:0">
          ${sortedMembers.map((m, i) => {
            const border = i < sortedMembers.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
            return `<div onclick="openContactModal('${escapeHtml(m.ID)}')"
              style="padding:14px 16px;${border}cursor:pointer">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:15px">${escapeHtml(m.NAME)}</div>
                  <div class="small">${escapeHtml(m.VOICE)}</div>
                </div>
                <div style="color:var(--muted)">›</div>
              </div>
            </div>`
          }).join("")}
        </div>
      `

   if(isDesktop){
     let html = ""
   
     html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:8px">`
     html += `<div>${nearestEventHtml}</div>`
     html += `<div>${springHtml}</div>`
     html += `</div>`
   
     html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:24px">`
     html += `<div>${aktualityHtml}${todosHtml}</div>`
     html += `<div>${autumnHtml}</div>`
     html += `</div>`
   
     html += `<div id="heatmap-container">${heatmapHtml}</div>`
     html += contactsHtml
   
     container().innerHTML = html
     restoreScroll(scroll)
   
   }else{
     let html = ""
     html += nearestEventHtml
     html += aktualityHtml
     html += todosHtml
     html += springHtml
     html += autumnHtml
     html += `<div id="heatmap-container">${heatmapHtml}</div>`
     html += contactsHtml
   
     container().innerHTML = html
     restoreScroll(scroll)
   }

  }catch(err){
    setError("Chyba při načítání přehledu: " + (err?.message || err))
  }

}

function toggleDashboardEvent(){
  toggleAccordion("dashEventDetail", "chevronDashEvent")
}

function toggleDashAttendance(){
  toggleAccordion("dashAttendanceButtons", "chevronDashAttendance")
}

function editDashNote(eventId, currentNote){
  openFormModal("Upravit poznámku", [
    {key: "note", label: "Poznámka", type: "textarea", value: currentNote}
  ], async (values) => {
    try{
      closeFormModal()
      showSaving()
      await api("updatenote", {id: eventId, note: values.note})
      invalidateCache("eventdetail", eventId)
      hideSaving("Poznámka uložena ✓")
      renderDashboard()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}


let AKTUALITA_SELECTED = null
let TODO_SELECTED = null

function toggleAktualita(id){
  toggleAccordion("detailAkt_" + id, "chevronAkt_" + id)
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
  confirmModal("Smazat úkol?", async () => {
    try{
      await api("deletetodo", {id})
      lsDel("todos")
      TODO_SELECTED = null
      renderDashboard()
    }catch(err){
      alert("Chyba: " + (err?.message || err))
    }
  })
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
  confirmModal("Smazat aktualitu?", async () => {
    try{
      await api("deleteaktualita", {id})
      lsDel("aktuality")
      AKTUALITA_SELECTED = null
      renderDashboard()
    }catch(err){
      alert("Chyba: " + (err?.message || err))
    }
  })
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

  ACTIVE_DETAIL_ID = null
  const scroll = saveScroll()
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

    // skryj šablony opakujících se sérií
    const visibleEvents = events.filter(e => !e.IS_TEMPLATE)

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

    const filtered = visibleEvents.filter(e => {
    const d = new Date(e.DATE)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })

    const nextEvent = visibleEvents.find(e => {
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

    const pastEvents   = filtered.filter(e => {
  const d = new Date(e.DATE); d.setHours(0,0,0,0); return d < now
})
const futureEvents = filtered.filter(e => {
  const d = new Date(e.DATE); d.setHours(0,0,0,0); return d >= now
})

// nejdřív budoucí akce
futureEvents.forEach(e => {
  const isNext      = nextEvent && e.ID === nextEvent.ID
  const isCancelled = e.STATUS === "Zrušená"
  const highlight   = isNext ? "border-left:3px solid #007aff;" : ""
  const opacity     = isCancelled ? "0.5" : "1"

  html += `<div class="swipe-wrapper" style="opacity:${opacity}">
    <div class="swipe-bg">
      <span class="swipe-bg-left">✓ Přijdu</span>
      <span class="swipe-bg-right">✗ Nepřijdu</span>
    </div>
    <div class="card swipe-card${isNext ? " next" : ""}" data-id="${escapeHtml(e.ID)}" style="${highlight}">
      ${isNext ? `<div style="font-size:11px;color:#007aff;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Nejbližší akce</div>` : ""}
      ${isCancelled ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Zrušená</div>` : ""}
      <b style="${isCancelled ? "text-decoration:line-through;color:var(--muted)" : ""}">${escapeHtml(e.NAME)}</b><br>
         <span class="small">
      ${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}
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

// pak proběhlé akce schované pod tlačítkem
if(pastEvents.length){
  html += `<div style="margin:8px 0">
    <button onclick="togglePastEvents()" id="btnPastEvents" style="width:100%;background:transparent;color:var(--muted);font-size:13px">
      ↓ Starší akce (${pastEvents.length})
    </button>
  </div>
  <div id="pastEventsList" style="display:none">`

  pastEvents.forEach(e => {
    html += `<div class="swipe-wrapper" style="opacity:0.4">
      <div class="swipe-bg">
        <span class="swipe-bg-left">✓ Přijdu</span>
        <span class="swipe-bg-right">✗ Nepřijdu</span>
      </div>
      <div class="card swipe-card" data-id="${escapeHtml(e.ID)}">
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

  html += `</div>`
}

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
     restoreScroll(scroll)

  }catch(err){
    setError("Chyba při načítání akcí: " + (err?.message || err))
  }

}

function togglePastEvents(){
  const list = document.getElementById("pastEventsList")
  const btn  = document.getElementById("btnPastEvents")
  if(!list) return
  const isOpen = list.style.display !== "none"
  list.style.display = isOpen ? "none" : "block"
  if(btn) btn.textContent = isOpen ? `↓ Starší akce` : `↑ Skrýt starší akce`
}

async function openEventForm(id){
  window.EDIT_EVENT = {}

  let event = {}
  if(id){
    try{
      const data = await cachedApi("eventdetail", {id})
      event = data.event || {}
      window.EDIT_EVENT = event
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
  <h2>${isEdit ? "Upravit akci" : "Nová akce"}</h2>
  <div class="card">
    <label>Název<br>
      <input id="fName" value="${escapeHtml(event.NAME || "")}" placeholder="Název akce">
    </label>
    <label>Datum<br>
      <input id="fDate" type="date" value="${dateVal}">
    </label>
    <label>Datum konce (pouze pro vícedenní akce)<br>
     <input id="fDateEnd" type="date" value="${event.DATE_END ? new Date(event.DATE_END).toISOString().substring(0,10) : ''}">
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
    <label>Odkaz na online call<br>
      <input id="fCallUrl" value="${escapeHtml(event.CALL_URL || "")}" placeholder="https://discord.gg/...">
    </label>
    <label>Poznámka<br>
      <textarea id="fNote" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(event.NOTE || "")}</textarea>
    </label>
    <label>Typ akce<br>
      <select id="fType">
        <option value="Zkouška"     ${(event.TYPE||"Zkouška") === "Zkouška"     ? "selected" : ""}>Zkouška</option>
        <option value="Koncert"     ${event.TYPE === "Koncert"     ? "selected" : ""}>Koncert</option>
        <option value="Soustředění" ${event.TYPE === "Soustředění" ? "selected" : ""}>Soustředění</option>
        <option value="Soutěž"      ${event.TYPE === "Soutěž"      ? "selected" : ""}>Soutěž</option>
        <option value="Jiná akce"   ${event.TYPE === "Jiná akce"   ? "selected" : ""}>Jiná akce</option>
      </select>
    </label>
    <label>Status<br>
      <select id="fStatus">
        <option value="Plánovaná" ${event.STATUS === "Plánovaná" ? "selected" : ""}>Plánovaná</option>
        <option value="Proběhlá"  ${event.STATUS === "Proběhlá"  ? "selected" : ""}>Proběhlá</option>
        <option value="Zrušená"   ${event.STATUS === "Zrušená"   ? "selected" : ""}>Zrušená</option>
      </select>
    </label>
    <label style="display:flex;align-items:center;gap:10px;margin-top:16px">
      <input type="checkbox" id="fRequiresProgram" ${event.REQUIRES_PROGRAM !== false ? "checked" : ""} style="width:auto;margin:0">
      <span>Vyžaduje program</span>
    </label>
    ${!isEdit ? `
    <label style="margin-top:16px;display:block">
      <span class="small" style="text-transform:uppercase;letter-spacing:0.05em">Opakování</span><br>
      <select id="fRecurrence" style="margin-top:6px" onchange="toggleRecurrenceUntil(this.value)">
        <option value="none">Jednorázová akce</option>
        <option value="weekly">Každý týden</option>
        <option value="biweekly">Každé dva týdny</option>
      </select>
    </label>
    <div id="recurrenceUntilWrap" style="display:none;margin-top:12px">
      <label>Opakovat do:<br>
        <input id="fRecurrenceUntil" type="date" style="margin-top:6px">
      </label>
    </div>
    ` : ""}

    <div style="margin-top:16px;border-top:1px solid rgba(128,128,128,0.15);padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleEventFormExtra()">
        <span style="font-weight:600;font-size:15px">Další informace</span>
        <span id="chevronEventFormExtra">›</span>
      </div>
      <div id="eventFormExtra" style="display:none;margin-top:12px">
        <!-- sem přijdou podmíněné fieldy -->
      </div>
    </div>

    <div class="btn-group" style="margin-top:16px">
      <button onclick="saveEvent(${isEdit ? `'${id}'` : 'null'})" style="background:#d4f5e2;color:#1a7a3a">
        ${isEdit ? "Uložit změny" : "Vytvořit akci"}
      </button>
      <button onclick="closeEventFormModal()">Zrušit</button>
    </div>
  </div>`

  document.getElementById("eventFormModalBody").innerHTML = html
  document.getElementById("eventFormModal").classList.remove("hidden")
}

function closeEventFormModal(){
  document.getElementById("eventFormModal").classList.add("hidden")
}

function toggleEventFormExtra(){
  const panel   = document.getElementById("eventFormExtra")
  const chevron = document.getElementById("chevronEventFormExtra")
  if(!panel) return
  const isOpen = panel.style.display !== "none"
  panel.style.display = isOpen ? "none" : "block"
  if(chevron) chevron.textContent = isOpen ? "›" : "‹"
  if(!isOpen) renderEventFormExtra()
}

function renderEventFormExtra(){
  const type  = document.getElementById("fType")?.value || "Zkouška"
  const panel = document.getElementById("eventFormExtra")
  if(!panel) return

  const isKoncert     = type === "Koncert" || type === "Jiná akce"
  const isSoustredeni = type === "Soustředění" || type === "Soutěž"

  if(isKoncert){
    panel.innerHTML = `
      <label>Čas srazu<br>
        <input id="fSraz" type="time" value="${escapeHtml(window.EDIT_EVENT?.SRAZ || "")}">
      </label>
      <label style="margin-top:12px">Oblečení<br>
        <select id="fObleceni">
          <option value="">Zatím nevíme</option>
          <option value="Formální" ${window.EDIT_EVENT?.OBLECENI === "Formální" ? "selected" : ""}>Formální — červená kravata</option>
          <option value="Neformální" ${window.EDIT_EVENT?.OBLECENI === "Neformální" ? "selected" : ""}>Neformální — 10men tričko</option>
          <option value="Zimní civil" ${window.EDIT_EVENT?.OBLECENI === "Zimní civil" ? "selected" : ""}>Zimní civil</option>
        </select>
      </label>
      <label style="margin-top:12px">Doprava<br>
        <select id="fDoprava">
          <option value="">Nezadáno</option>
          <option value="Veřejná doprava" ${window.EDIT_EVENT?.DOPRAVA === "Veřejná doprava" ? "selected" : ""}>Veřejná doprava</option>
          <option value="Auta" ${window.EDIT_EVENT?.DOPRAVA === "Auta" ? "selected" : ""}>Auta</option>
          <option value="Každý po své ose" ${window.EDIT_EVENT?.DOPRAVA === "Každý po své ose" ? "selected" : ""}>Každý po své ose</option>
        </select>
      </label>
      <label style="margin-top:12px">Hospoda<br>
        <textarea id="fHospoda" style="width:100%;min-height:60px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px" placeholder="Název/adresa, čas rezervace, na jaké jméno...">${escapeHtml(window.EDIT_EVENT?.HOSPODA || "")}</textarea>
      </label>
      <label style="margin-top:12px">Harmonogram<br>
        <textarea id="fHarmonogram" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(window.EDIT_EVENT?.HARMONOGRAM || "")}</textarea>
      </label>
    `
  }else if(isSoustredeni){
    panel.innerHTML = `
      <label>Spacáky a karimatky<br>
        <select id="fSpacaky">
          <option value="">Nezadáno</option>
          <option value="Ano" ${window.EDIT_EVENT?.SPACAKY === "Ano" ? "selected" : ""}>Ano</option>
          <option value="Ne" ${window.EDIT_EVENT?.SPACAKY === "Ne" ? "selected" : ""}>Ne</option>
          <option value="Vlastní uvážení" ${window.EDIT_EVENT?.SPACAKY === "Vlastní uvážení" ? "selected" : ""}>Vlastní uvážení</option>
        </select>
      </label>
      <label style="margin-top:12px">Strava<br>
        <select id="fStrava" onchange="toggleStravaNote(this.value)">
          <option value="">Nezadáno</option>
          <option value="Ano" ${window.EDIT_EVENT?.STRAVA === "Ano" ? "selected" : ""}>Ano</option>
          <option value="Ne" ${window.EDIT_EVENT?.STRAVA === "Ne" ? "selected" : ""}>Ne</option>
          <option value="Částečně" ${window.EDIT_EVENT?.STRAVA === "Částečně" ? "selected" : ""}>Částečně</option>
        </select>
      </label>
      <div id="stravaNote" style="display:${window.EDIT_EVENT?.STRAVA === "Částečně" ? "block" : "none"};margin-top:8px">
        <label>Specifikace stravy<br>
          <textarea id="fStravaNota" style="width:100%;min-height:60px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(window.EDIT_EVENT?.STRAVA_NOTA || "")}</textarea>
        </label>
      </div>
      <label style="margin-top:12px">Koncertní oblečení<br>
        <select id="fObleceniSoustredeni" onchange="toggleObleceniSoustredeniDetail(this.value)">
          <option value="Ne" ${window.EDIT_EVENT?.OBLECENI_S === "Ne" ? "selected" : ""}>Ne</option>
          <option value="Ano" ${window.EDIT_EVENT?.OBLECENI_S === "Ano" ? "selected" : ""}>Ano</option>
        </select>
      </label>
      <div id="obleceniSoustredeniDetail" style="display:${window.EDIT_EVENT?.OBLECENI_S === "Ano" ? "block" : "none"};margin-top:8px">
        <label>Jaké oblečení<br>
          <select id="fObleceniSoustredeniTyp">
            <option value="Formální" ${window.EDIT_EVENT?.OBLECENI_S_TYP === "Formální" ? "selected" : ""}>Formální — košile & červená kravata</option>
            <option value="Neformální" ${window.EDIT_EVENT?.OBLECENI_S_TYP === "Neformální" ? "selected" : ""}>Neformální — 10men tričko, civil kalhoty</option>
            <option value="Zimní civil" ${window.EDIT_EVENT?.OBLECENI_S_TYP === "Zimní civil" ? "selected" : ""}>Zimní civil</option>
            <option value="Vše" ${window.EDIT_EVENT?.OBLECENI_S_TYP === "Vše" ? "selected" : ""}>Vše</option>
          </select>
        </label>
      </div>
      <label style="margin-top:12px">Harmonogram<br>
        <textarea id="fHarmonogram" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(window.EDIT_EVENT?.HARMONOGRAM || "")}</textarea>
      </label>
    `
  }else{
    panel.innerHTML = `<p class="notice">Pro typ "${type}" nejsou k dispozici další informace.</p>`
  }
}

function toggleStravaNote(val){
  const el = document.getElementById("stravaNote")
  if(el) el.style.display = val === "Částečně" ? "block" : "none"
}

function toggleObleceniSoustredeniDetail(val){
  const el = document.getElementById("obleceniSoustredeniDetail")
  if(el) el.style.display = val === "Ano" ? "block" : "none"
}

async function openEvent(id){
   window.ACTIVE_EVENT_ID = id
   ACTIVE_DETAIL_ID = id
  
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
     ${event.TEMPLATE_ID ? `<div style="font-size:11px;color:#8e8e93;margin-bottom:8px;letter-spacing:0.05em">OPAKUJÍCÍ SE AKCE</div>` : ""}

     <div class="card" style="margin-bottom:20px">
       <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
         <div><span class="small" style="display:block;margin-bottom:2px">Datum</span><b>${formatDate(event.DATE)}${event.DATE_END ? " – " + formatDate(event.DATE_END) : ""}</b></div>
         <div><span class="small" style="display:block;margin-bottom:2px">Čas</span><b>${event.START ? formatTime(event.START) : "—"}${event.END ? " – " + formatTime(event.END) : ""}</b></div>
         <div><span class="small" style="display:block;margin-bottom:2px">Místo</span><b>${escapeHtml(event.PLACE) || (event.CALL_URL ? "Online" : "—")}</b></div>
         <div><span class="small" style="display:block;margin-bottom:2px">Typ akce</span><b>${escapeHtml(event.TYPE) || "Zkouška"}</b></div>
       </div>
   
       ${(event.PLACE || event.CALL_URL) ? `
         <div class="btn-group" style="margin-bottom:16px">
           ${event.PLACE ? `
             <a href="https://maps.google.com/?q=${encodeURIComponent(event.PLACE)}" target="_blank"
               style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#e8e8ed;border-radius:12px;font-size:13px;font-weight:600;color:#007aff;text-decoration:none">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                 <circle cx="12" cy="9" r="2.5"/>
               </svg>
               Navigovat
             </a>
           ` : ""}
           ${event.CALL_URL ? `
             <a href="${escapeHtml(event.CALL_URL)}" target="_blank"
               style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#e8e8ed;border-radius:12px;font-size:13px;font-weight:600;color:#007aff;text-decoration:none">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
               </svg>
               Připojit se
             </a>
           ` : ""}
         </div>
       ` : ""}
   
     ${event.NOTE ? `<div style="padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)"><span class="small" style="display:block;margin-bottom:4px">Poznámka</span><div style="font-size:15px;white-space:pre-wrap">${escapeHtml(event.NOTE)}</div></div>` : ""}
     </div>

     ${event.SRAZ || event.OBLECENI || event.DOPRAVA || event.HARMONOGRAM || event.SPACAKY || event.STRAVA ? `
        <div class="event-card" style="margin-top:12px">
          <div class="event-label">Detaily akce</div>
          ${event.SRAZ ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Sraz</span><b>${escapeHtml(event.SRAZ)}</b></div>` : ""}
          ${event.OBLECENI ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Oblečení</span><b>${escapeHtml(formatObleceni(event.OBLECENI))}</b></div>` : ""}
          ${event.DOPRAVA ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Doprava</span><b>${escapeHtml(event.DOPRAVA)}</b></div>` : ""}
          ${event.HOSPODA ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Hospoda</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HOSPODA)}</div></div>` : ""}
          ${event.SPACAKY ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Spacáky a karimatky</span><b>${escapeHtml(event.SPACAKY)}</b></div>` : ""}
          ${event.STRAVA ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Strava</span><b>${escapeHtml(event.STRAVA)}${event.STRAVA_NOTA ? " — " + escapeHtml(event.STRAVA_NOTA) : ""}</b></div>` : ""}
          ${event.OBLECENI_S ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Koncertní oblečení</span><b>${escapeHtml(event.OBLECENI_S)}${event.OBLECENI_S_TYP ? " — " + escapeHtml(formatObleceni(event.OBLECENI_S_TYP)) : ""}</b></div>` : ""}
          ${event.HARMONOGRAM ? `<div style="padding:8px 0"><span class="small" style="display:block;margin-bottom:4px">Harmonogram</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HARMONOGRAM)}</div></div>` : ""}
        </div>
      ` : ""}`

    // --- DOCHÁZKA ---
    const myRow    = attendance.find(a => a.EMAIL === MEMBER_EMAIL)
    const myStatus = myRow?.STATUS || ""
    const myReason = myRow?.REASON || ""

    const yes   = attendance.filter(a => a.STATUS === "Přijdu").length
    const maybe = attendance.filter(a => a.STATUS === "Možná").length
    const no    = attendance.filter(a => a.STATUS === "Nepřijdu").length
    const open  = attendance.filter(a => !a.STATUS).length

    const statusColor = myStatus === "Přijdu" ? "#34c759" : myStatus === "Možná" ? "#ff9f0a" : myStatus === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
    const statusText  = myStatus || "Nevyplněno"

    html += `<div class="event-card">
      <div class="event-label">Docházka</div>

      ${event.STATUS === "Zrušená" ? `
        <div style="padding:10px 0;color:#ff3b30;font-weight:600">Akce byla zrušena</div>
      ` : MEMBER_EMAIL ? `
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding-bottom:12px;border-bottom:1px solid rgba(128,128,128,0.1)" onclick="toggleAttendanceAccordion('${id}')">
          <div>
            <div style="font-weight:600;color:${statusColor}">${statusText}</div>
            ${myReason ? `<div class="small" style="margin-top:2px">${escapeHtml(myReason)}</div>` : ""}
          </div>
          <span style="color:var(--muted);font-size:18px" id="chevronAttendance_${id}">›</span>
        </div>
        <div id="attendanceDetail_${id}" style="display:none;padding:12px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
          <div class="small" style="font-weight:600;margin-bottom:8px">Změnit účast</div>
          <div class="btn-group">
            <button onclick="doAttendance('${id}','Přijdu')">Přijdu</button>
            <button onclick="doAttendanceMozna('${id}')">Možná</button>
            <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>
          </div>
        </div>
      ` : `<div class="muted">Vyber člena</div>`}

      <!-- Souhrn skupiny — vždy viditelný -->
      <div style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
          <span class="small">✓ Přijdu: <b>${yes}</b></span>
          <span class="small">? Možná: <b>${maybe}</b></span>
          <span class="small">✗ Nepřijdu: <b>${no}</b></span>
          <span class="small">— Nevyplněno: <b>${open}</b></span>
        </div>
        ${attendance.map(a => {
          const icon  = a.STATUS === "Přijdu"   ? iconCheck() :
                        a.STATUS === "Možná"    ? iconMaybe() :
                        a.STATUS === "Nepřijdu" ? iconClose() : iconQuestion()
          const color = a.STATUS === "Přijdu"   ? "#34c759" :
                        a.STATUS === "Možná"    ? "#ff9f0a" :
                        a.STATUS === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
          return `<div class="small" style="padding:4px 0;color:${color};border-bottom:1px solid rgba(128,128,128,0.08)">
            <span class="icon" style="color:${color}">${icon}</span>
            ${escapeHtml(a.NAME)}
            ${a.REASON ? `<span style="color:#999"> · ${escapeHtml(a.REASON)}</span>` : ""}
          </div>`
        }).join("")}
      </div>

    </div>`

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
          <button onclick="openEditEventModal('${id}')">Upravit akci</button>
          <button onclick="openDeleteEventModal('${id}')" style="background:#fde8e8;color:#c00">Smazat</button>
        </div>`
      }

      html += `</div>`
    }

    if(target){
      target.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:20px;max-height:90vh;overflow-y:auto">${html}</div>`
    }else{
      container().innerHTML = html
    }

  saveState()
     
  }catch(err){
    if(target){
      target.innerHTML = `<p class="notice">Chyba při načítání akce</p>`
    }else{
      setError("Chyba při načítání akce: " + (err?.message || err))
    }
  }

}

function openEditEventModal(id){
  const cached    = lsGet("detail_" + id)
  const thisEvent = cached?.event || {}
  const isSeries  = !!(thisEvent?.TEMPLATE_ID)

  if(!isSeries){
    openEventForm(id)
    return
  }

  const modal   = document.getElementById("formModal")
  const titleEl = document.getElementById("formModalTitle")
  const bodyEl  = document.getElementById("formModalBody")
  const btnGroup = document.querySelector("#formModal .btn-group")

  titleEl.textContent = "Upravit akci"
  bodyEl.innerHTML = `
    <p style="color:var(--text);margin:0 0 4px">Tato akce je součástí opakující se série.</p>
    <p class="small">Chceš upravit jen tuto akci, tuto a všechny následující, nebo celou sérii?</p>`

  btnGroup.innerHTML = `
    <button onclick="closeFormModal();openEventForm('${id}')" style="flex:1">Jen tuto akci</button>
    <button onclick="closeFormModal();openEditSeriesFrom('${id}')" style="flex:1;background:#e8e8ed;color:#007aff">Tuto a následující</button>`

  const row2 = document.createElement("div")
  row2.style.cssText = "display:flex;gap:8px;margin-top:8px;width:100%"
  row2.innerHTML = `
    <button onclick="closeFormModal();openEditSeriesFrom('all_${id}')" style="flex:1;background:#e8e8ed;color:#007aff">Celou sérii</button>
    <button onclick="closeFormModal()" style="flex:1;background:#f2f2f7;color:#8e8e93">Zrušit</button>`

  btnGroup.parentElement.querySelectorAll(".modal-row2").forEach(r => r.remove())
  row2.className = "modal-row2"
  btnGroup.parentElement.appendChild(row2)

  modal.classList.remove("hidden")
}

function openDeleteEventModal(id){
  const cached    = lsGet("detail_" + id)
  const thisEvent = cached?.event || {}
  const isSeries  = !!(thisEvent?.TEMPLATE_ID)

  if(!isSeries){
    confirmModal("Opravdu smazat tuto akci?", async () => {
      try{
        showSaving()
        await api("deleteevent", {id})
        invalidateCache("events")
        invalidateCache("eventdetail", id)
        hideSaving("Akce smazána ✓")
        renderEvents()
      }catch(err){
        hideSaving("Chyba ✗")
        alert("Chyba: " + (err?.message || err))
      }
    })
    return
  }

  const modal    = document.getElementById("formModal")
  const titleEl  = document.getElementById("formModalTitle")
  const bodyEl   = document.getElementById("formModalBody")
  const btnGroup = document.querySelector("#formModal .btn-group")

  titleEl.textContent = "Smazat akci"
  bodyEl.innerHTML = `
    <p style="color:var(--text);margin:0 0 4px">Tato akce je součástí opakující se série.</p>
    <p class="small">Chceš smazat jen tuto akci, tuto a všechny následující, nebo celou sérii?</p>`

  btnGroup.innerHTML = `
    <button class="btn-series-action" style="flex:1;background:#fde8e8;color:#c00">Jen tuto akci</button>
    <button class="btn-series-action" style="flex:1;background:#ff9f0a;color:#fff">Tuto a následující</button>`

  const row2 = document.createElement("div")
  row2.style.cssText = "display:flex;gap:8px;margin-top:8px;width:100%"
  row2.innerHTML = `
    <button class="btn-series-action" style="flex:1;background:#ff3b30;color:#fff">Celou sérii</button>
    <button class="btn-series-action" style="flex:1;background:#f2f2f7;color:#8e8e93">Zrušit</button>`

  btnGroup.parentElement.querySelectorAll(".modal-row2").forEach(r => r.remove())
  row2.className = "modal-row2"
  btnGroup.parentElement.appendChild(row2)

  // Přiřaď handlery až po vložení do DOM
  const btns = [...btnGroup.querySelectorAll(".btn-series-action"),
                ...row2.querySelectorAll(".btn-series-action")]

  btns[0].onclick = async () => {
    closeFormModal()
    try{ showSaving(); await api("deleterecurring", {id, mode: "single"}); invalidateCache("events"); invalidateCache("eventdetail", id); hideSaving("Akce smazána ✓"); renderEvents() }
    catch(err){ hideSaving("Chyba ✗"); alert("Chyba: " + (err?.message || err)) }
  }
  btns[1].onclick = async () => {
    closeFormModal()
    try{ showSaving(); await api("deleterecurring", {id, mode: "from_this"}); invalidateCache("events"); invalidateCache("eventdetail", id); hideSaving("Akce smazány ✓"); renderEvents() }
    catch(err){ hideSaving("Chyba ✗"); alert("Chyba: " + (err?.message || err)) }
  }
  btns[2].onclick = async () => {
    closeFormModal()
    try{ showSaving(); await api("deleterecurring", {id, mode: "series"}); invalidateCache("events"); hideSaving("Série smazána ✓"); renderEvents() }
    catch(err){ hideSaving("Chyba ✗"); alert("Chyba: " + (err?.message || err)) }
  }
  btns[3].onclick = () => closeFormModal()

  modal.classList.remove("hidden")
}

async function saveEntireSeries(id){
  const name            = document.getElementById("fName")?.value.trim()
  const date            = document.getElementById("fDate")?.value
  const start           = document.getElementById("fStart")?.value
  const end             = document.getElementById("fEnd")?.value
  const place           = document.getElementById("fPlace")?.value.trim()
  const callUrl         = document.getElementById("fCallUrl")?.value.trim()
  const note            = document.getElementById("fNote")?.value.trim()
  const status          = document.getElementById("fStatus")?.value
  const requiresProgram = document.getElementById("fRequiresProgram")?.checked ?? true

  if(!name){ alert("Zadej název akce"); return }

  try{
    showSaving()
    await api("updateentireseriesfrom", {
      id, name, start, end, place, note, status,
      requires_program: requiresProgram,
      call_url: callUrl
    })
    invalidateCache("events")
    hideSaving("Série upravena ✓")
    renderEvents()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

function toggleAttendanceAccordion(id){
  toggleAccordion("attendanceDetail_" + id, "chevronAttendance_" + id)
}

async function uploadDocUrl(eventId){
  promptModal("Vlož odkaz na infodokument:", "", async (url) => {
    if(!url) return
    if(!url.startsWith("http")){ alert("Neplatný odkaz — musí začínat http"); return }
    try{
      await api("setdocurl", {id: eventId, url})
      invalidateCache("eventdetail", eventId)
      openEvent(eventId)
    }catch(err){
      alert("Chyba: " + (err?.message || err))
    }
  })
}

async function openProgramEditor(eventId){

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

    document.getElementById("programEditorModalBody").innerHTML = `<div class="prog-wrapper">${html}</div>`
    document.getElementById("programEditorModal").classList.remove("hidden")

    refreshProgSelected()

  }catch(err){
    setError("Chyba: " + (err?.message || err))
  }
}

function closeProgramEditorModal(){
  document.getElementById("programEditorModal").classList.add("hidden")
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
    closeProgramEditorModal()
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

async function openEditSeriesFrom(id){
  await openEventForm(id)

  setTimeout(() => {
    const modal = document.getElementById("eventFormModalBody")

    const h2 = modal.querySelector("h2")
    if(h2) h2.textContent = "Upravit sérii od této akce"

    const btnGroup = modal.querySelector(".btn-group")
    if(btnGroup){
      const saveBtn = btnGroup.querySelector("button:first-child")
      if(saveBtn){
        saveBtn.textContent = "Uložit změny"
        saveBtn.style.background = "#007aff"
        saveBtn.style.color = "#fff"
        saveBtn.removeAttribute("onclick")
        saveBtn.onclick = () => saveSeriesFrom(id)
      }
    }
  }, 100)
}

async function saveSeriesFrom(id){
  const name            = document.getElementById("fName")?.value.trim()
  console.log("fName value:", name)
  const date            = document.getElementById("fDate")?.value
  console.log("fDate value:", date)
  const start           = document.getElementById("fStart")?.value
  const end             = document.getElementById("fEnd")?.value
  const place           = document.getElementById("fPlace")?.value.trim()
  const callUrl         = document.getElementById("fCallUrl")?.value.trim()
  const note            = document.getElementById("fNote")?.value.trim()
  const status          = document.getElementById("fStatus")?.value
  const requiresProgram = document.getElementById("fRequiresProgram")?.checked ?? true

  if(!name){ alert("Zadej název akce"); return }

  try{
    showSaving()
    console.log("date před odesláním:", date)
    const payload = { id, name, date, start, end, place, note, status,
       requires_program: requiresProgram,
       call_url: callUrl
    }
    console.log("payload:", payload)
    await api("updateseriesfrom", payload)
    invalidateCache("events")
    hideSaving("Série upravena ✓")
    renderEvents()
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
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
   SPRÁVA ČLENŮ
================================ */

async function openAddMember(){
  openFormModal("Nový člen", [
    {key: "name",  label: "Jméno",  type: "text"},
    {key: "email", label: "Email",  type: "text"},
    {key: "discord_id", label: "Discord ID", type: "text", value: m.DISCORD_ID || ""}, 
    {key: "phone", label: "Telefon", type: "text"},
    {key: "voice", label: "Hlas", type: "select", value: "1. TENOR", options: ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]},
    {key: "role",  label: "Role", type: "select", value: "MEMBER", options: ["MEMBER", "ADMIN", "ART", "GUEST"]}
  ], async (values) => {
    if(!values.name)  { alert("Zadej jméno"); return }
    if(!values.email) { alert("Zadej email"); return }
    try{
      closeFormModal()
      showSaving()
      await api("addmember", values)
      invalidateCache("members")
      hideSaving("Člen přidán ✓")
      renderMembers()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}

async function openEditMember(id){
  const members = await api("members")
  const m = members.find(m => m.ID === id)
  if(!m) return

  openFormModal("Upravit člena", [
    {key: "name",  label: "Jméno",   type: "text",   value: m.NAME},
    {key: "email", label: "Email",   type: "text",   value: m.EMAIL},
    {key: "discord_id", label: "Discord ID", type: "text", value: m.DISCORD_ID || ""},
    {key: "phone", label: "Telefon", type: "text",   value: m.PHONE || ""},
    {key: "voice", label: "Hlas",   type: "select", value: m.VOICE, options: ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]},
    {key: "role",  label: "Role",   type: "select", value: m.ROLE,  options: ["MEMBER", "ADMIN", "ART", "GUEST"]}
  ], async (values) => {
    if(!values.name)  { alert("Zadej jméno"); return }
    if(!values.email) { alert("Zadej email"); return }
    try{
      closeFormModal()
      showSaving()
      await api("updatemember", {id, ...values})
      invalidateCache("members")
      hideSaving("Člen upraven ✓")
      renderMembers()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}

async function deleteMemberItem(id){
  confirmModal("Opravdu smazat tohoto člena?", async () => {
    try{
      showSaving()
      await api("deletemember", {id})
      invalidateCache("members")
      hideSaving("Člen smazán ✓")
      renderMembers()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  })
}

async function renderMembers(){
  setLoading()
  try{
    const members = await api("members")
    const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
    const sorted = [...members].sort((a, b) => {
      const ai = voiceOrder.indexOf(a.VOICE)
      const bi = voiceOrder.indexOf(b.VOICE)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    let html = `<h2 style="margin:0 0 16px">Členové</h2>`
    html += `<div class="btn-group" style="margin-bottom:16px">
      <button onclick="openAddMember()">+ Přidat člena</button>
    </div>`

    const voiceGroups = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
    voiceGroups.forEach(voice => {
      const group = sorted.filter(m => m.VOICE === voice)
      if(!group.length) return

      html += `<h3 class="season-title">${voice}</h3>`
      html += `<div class="card" style="padding:0">`
      group.forEach((m, i) => {
        const border = i < group.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
        html += `<div style="padding:14px 16px;${border}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:600;font-size:15px">${escapeHtml(m.NAME)}</div>
              <div class="small">${escapeHtml(m.EMAIL)}</div>
              ${m.PHONE ? `<div class="small">${escapeHtml(m.PHONE)}</div>` : ""}
              <div class="small" style="margin-top:4px;font-weight:600;color:#007aff">${escapeHtml(m.ROLE)}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button onclick="openEditMember('${escapeHtml(m.ID)}')" style="background:#e8f0fe;color:#007aff;padding:8px 12px;font-size:13px">Upravit</button>
              <button onclick="deleteMemberItem('${escapeHtml(m.ID)}')" style="background:#fde8e8;color:#c00;padding:8px 12px;font-size:13px">Smazat</button>
            </div>
          </div>
        </div>`
      })
      html += `</div>`
    })

    container().innerHTML = html
  }catch(err){
    setError("Chyba při načítání členů: " + (err?.message || err))
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

  function setTransform(val){
     if(val){
       el.style.setProperty("transform", `translateX(${val})`, "important")
     }else{
       el.style.removeProperty("transform")
     }
   }

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

    setTransform(currentX + "px")

    const wrapper = el.parentElement
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
      setTransform("")
      el.parentElement.classList.remove("swiping-right", "swiping-left")
      return
    }

    if(!isHorizontal){
      setTransform("")
      el.parentElement.classList.remove("swiping-right", "swiping-left")
      return
    }

    el.style.setProperty("transition", "transform 0.2s ease", "important")

    if(currentX > THRESHOLD){
      setTransform("110%")
      setTimeout(() => {
        setTransform("")
        el.parentElement.classList.remove("swiping-right", "swiping-left")
        confirmSwipe(eventId, "Přijdu", el)
      }, 200)
    }else if(currentX < -THRESHOLD){
      setTransform("-110%")
      setTimeout(() => {
        setTransform("")
        el.parentElement.classList.remove("swiping-right", "swiping-left")
        confirmSwipeWithReason(eventId, el)
      }, 200)
    }else{
      setTransform("")
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

  const name            = document.getElementById("fName")?.value.trim()
  const date            = document.getElementById("fDate")?.value
  const dateEnd         = document.getElementById("fDateEnd")?.value || ""
  const start           = document.getElementById("fStart")?.value
  const end             = document.getElementById("fEnd")?.value
  const place           = document.getElementById("fPlace")?.value.trim()
  const callUrl         = document.getElementById("fCallUrl")?.value.trim()
  const note            = document.getElementById("fNote")?.value.trim()
  const type            = document.getElementById("fType")?.value || "Zkouška"
  const status          = document.getElementById("fStatus")?.value
  const requiresProgram = document.getElementById("fRequiresProgram")?.checked ?? true
  const recurrenceType  = document.getElementById("fRecurrence")?.value || "none"
  const recurrenceUntil = document.getElementById("fRecurrenceUntil")?.value || ""
  const sraz            = document.getElementById("fSraz")?.value          || ""
  const obleceni        = document.getElementById("fObleceni")?.value      || ""
  const doprava         = document.getElementById("fDoprava")?.value       || ""
  const hospoda         = document.getElementById("fHospoda")?.value       || ""
  const harmonogram     = document.getElementById("fHarmonogram")?.value   || ""
  const spacaky         = document.getElementById("fSpacaky")?.value       || ""
  const strava          = document.getElementById("fStrava")?.value        || ""
  const stravaNota      = document.getElementById("fStravaNota")?.value    || ""
  const obleceniS       = document.getElementById("fObleceniSoustredeni")?.value    || ""
  const obleceniSTyp    = document.getElementById("fObleceniSoustredeniTyp")?.value || ""

  if(!name){ alert("Zadej název akce"); return }
  if(!date){ alert("Zadej datum"); return }

     // Opakující se akce — jen při vytváření nové
  if(!id && recurrenceType !== "none"){
    if(!recurrenceUntil){ alert("Zadej datum konce opakování"); return }
    try{
      showSaving()
      const result = await api("addrecurring", {
        name, date, date_end: dateEnd, start, end, place, note, type, status,
        requires_program: requiresProgram,
        call_url: callUrl,
        recurrence_type: recurrenceType,
        recurrence_until: recurrenceUntil,
        sraz, obleceni, doprava, hospoda, harmonogram,
        spacaky, strava, strava_nota: stravaNota,
        obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp
      })
      invalidateCache("events")
      hideSaving(`Vytvořeno ${result.instances} akcí ✓`)
      closeEventFormModal()
      renderEvents()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
    return
  }

  try{
    showSaving()
    if(id){
      if(status === "Zrušená"){
        await api("cancelevent", {id, name, date, date_end: dateEnd, start, end, place, note, type, requires_program: requiresProgram, call_url: callUrl,
        sraz, obleceni, doprava, hospoda, harmonogram,
        spacaky, strava, strava_nota: stravaNota,
        obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp
      })
      }else{
        await api("updateevent", {id, name, date, date_end: dateEnd, start, end, place, note, type, status, requires_program: requiresProgram, call_url: callUrl,
          sraz, obleceni, doprava, hospoda, harmonogram,
          spacaky, strava, strava_nota: stravaNota,
          obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp
        })
      }
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      hideSaving("Akce upravena ✓")
      openEvent(id)
    }else{
      const result = await api("addevent", {name, date, date_end: dateEnd, start, end, place, note, type, status, requires_program: requiresProgram, call_url: callUrl,
        sraz, obleceni, doprava, hospoda, harmonogram,
        spacaky, strava, strava_nota: stravaNota,
        obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp
      })
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
  const events    = await cachedApi("events")
  const thisEvent = events.find(e => e.ID === id)
  const isSeries  = !!(thisEvent?.TEMPLATE_ID)

  if(isSeries){
    openDeleteSeriesModal(id)
  }else{
    confirmModal("Opravdu smazat tuto akci?", async () => {
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
    })
  }
}

function openDeleteSeriesModal(id){
  openFormModal("Smazat akci", [], () => {})

  const body   = document.getElementById("formModalBody")
  const submit = document.getElementById("formModalSubmit")

  body.innerHTML = `
    <p style="color:var(--text);margin:0 0 4px">Tato akce je součástí opakující se série.</p>
    <p class="small">Chceš smazat jen tuto akci, tuto a všechny následující, nebo celou sérii?</p>`

  submit.textContent      = "Jen tuto akci"
  submit.style.background = "#fde8e8"
  submit.style.color      = "#c00"
  submit.onclick = async () => {
    closeFormModal()
    try{
      showSaving()
      await api("deleterecurring", {id, mode: "single"})
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      hideSaving("Akce smazána ✓")
      renderEvents()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  }

  const btnGroup = document.querySelector("#formModal .btn-group")
  btnGroup.querySelectorAll(".btn-delete-series, .btn-delete-from").forEach(b => b.remove())

  // "Tuto a následující"
  const fromBtn = document.createElement("button")
  fromBtn.className     = "btn-delete-from"
  fromBtn.textContent   = "Tuto a následující"
  fromBtn.style.cssText = "background:#ff9f0a;color:#fff;flex:1"
  fromBtn.onclick = async () => {
    closeFormModal()
    try{
      showSaving()
      await api("deleterecurring", {id, mode: "from_this"})
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      hideSaving("Akce smazány ✓")
      renderEvents()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  }
  btnGroup.appendChild(fromBtn)

  // "Celou sérii"
  const seriesBtn = document.createElement("button")
  seriesBtn.className     = "btn-delete-series"
  seriesBtn.textContent   = "Celou sérii"
  seriesBtn.style.cssText = "background:#ff3b30;color:#fff;flex:1"
  seriesBtn.onclick = async () => {
    closeFormModal()
    try{
      showSaving()
      await api("deleterecurring", {id, mode: "series"})
      invalidateCache("events")
      hideSaving("Série smazána ✓")
      renderEvents()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  }
  btnGroup.appendChild(seriesBtn)
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
  const scroll = saveScroll()
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
    restoreScroll(scroll)

  }catch(err){
    setError("Chyba při načítání plateb: " + (err?.message || err))
  }
}

function toggleCollection(id){
  toggleAccordion("detail_" + id, "chevron_" + id)
}

async function deleteCollection(id){
  confirmModal("Opravdu smazat tento výběr včetně všech plateb?", async () => {
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
  })
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

window.ENERGY_EVENT    = null
let ENERGY_SELECTED    = null

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
        <select id="energyEvent" style="width:100%;margin:6px 0 12px" onchange="window.ENERGY_EVENT = this.value">`

    html += `<option value="">Vyber akci</option>`
    events
       events
         .filter(e => (e.PLACE || "").includes("Smetanovo"))
         .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))
         .forEach(e => {
        const selected = (window.ENERGY_EVENT && e.ID === window.ENERGY_EVENT) ||
                         (!window.ENERGY_EVENT && upcoming && e.ID === upcoming.ID) ? "selected" : ""
        if(selected) window.ENERGY_EVENT = e.ID
        html += `<option value="${escapeHtml(e.ID)}" ${selected}>${escapeHtml(e.NAME)} · ${formatDate(e.DATE)}</option>`
      })

    html += `</select></label>

      <div class="btn-group" style="margin-bottom:16px">
        <button onclick="setEnergyPhase('start')" id="btnPhaseStart" style="background:#007aff;color:#fff">Začátek zkoušky</button>
        <button onclick="setEnergyPhase('end')"   id="btnPhaseEnd">Konec zkoušky</button>
      </div>

      <div id="energyPhaseStart">
        <label>Stav elektroměru na začátku (kWh):<br>
          <input id="energyStart" type="number" style="width:100%;margin:6px 0 12px" placeholder="např. 4520.19">
        </label>
        <div class="btn-group">
          <button onclick="saveEnergyPhase('start')" style="background:#d4f5e2;color:#1a7a3a">Uložit stav na začátku</button>
        </div>
      </div>

      <div id="energyPhaseEnd" style="display:none">
        <label>Stav elektroměru na konci (kWh):<br>
          <input id="energyEnd" type="number" style="width:100%;margin:6px 0 12px" placeholder="např. 4527.43">
        </label>
        <div class="btn-group">
          <button onclick="saveEnergyPhase('end')" style="background:#d4f5e2;color:#1a7a3a">Uložit stav na konci</button>
        </div>
      </div>

    </div>`

    const history = await cachedApi("energy")
    if(Array.isArray(history) && history.length){
      html += `<h3 style="margin:16px 0 8px">Historie</h3>`
      html += `<div class="small" style="color:var(--muted);margin-bottom:10px">Klepni na záznam pro výběr</div>`
      html += `<div id="energyList">`

      history.slice().sort((a,b) => new Date(b.DATE) - new Date(a.DATE)).forEach(r => {
        const isSelected = ENERGY_SELECTED === r.ID
        const spotreba   = r.END && r.START ? (Number(r.END) - Number(r.START)).toFixed(2) : null

        html += `<div
          class="card energy-row"
          data-id="${escapeHtml(r.ID)}"
          onclick="selectEnergyRow('${escapeHtml(r.ID)}')"
          style="margin-bottom:8px;cursor:pointer;${isSelected ? "border:2px solid #007aff;background:var(--card-selected, #f0f6ff)" : ""}"
        >
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:14px;font-weight:600">${formatDate(r.DATE)}</div>
              <div class="small">Začátek: ${escapeHtml(String(r.START))} kWh</div>
              ${r.END ? `<div class="small">Konec: ${escapeHtml(String(r.END))} kWh</div>` : `<div class="small" style="color:#ff9f0a">Konec nezadán</div>`}
              ${spotreba ? `<div class="small">Spotřeba: <b>${spotreba} kWh</b></div>` : ""}
            </div>
            ${isSelected ? `<div style="color:#007aff;font-size:20px">✓</div>` : ""}
          </div>
          ${isSelected ? `
            <div class="btn-group" style="margin-top:10px">
              <button onclick="event.stopPropagation();editEnergyRow('${escapeHtml(r.ID)}',${r.START},${r.END||""})" style="background:#e8f0fe;color:#007aff">Upravit</button>
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

function setEnergyPhase(phase){
  document.getElementById("energyPhaseStart").style.display = phase === "start" ? "block" : "none"
  document.getElementById("energyPhaseEnd").style.display   = phase === "end"   ? "block" : "none"
  document.getElementById("btnPhaseStart").style.background = phase === "start" ? "#007aff" : ""
  document.getElementById("btnPhaseStart").style.color      = phase === "start" ? "#fff"    : ""
  document.getElementById("btnPhaseEnd").style.background   = phase === "end"   ? "#007aff" : ""
  document.getElementById("btnPhaseEnd").style.color        = phase === "end"   ? "#fff"    : ""
}

async function saveEnergyPhase(phase){
  const eventId = document.getElementById("energyEvent")?.value
  if(!eventId){ alert("Vyber akci"); return }

  if(phase === "start"){
    const start = document.getElementById("energyStart")?.value
    if(!start){ alert("Zadej stav na začátku"); return }
    try{
      showSaving()
      window.ENERGY_EVENT = eventId
      await api("setenergy", {event: eventId, start, end: null, phase: "start"})
      invalidateCache("energy")
      hideSaving("Stav na začátku uložen ✓")
      setEnergyPhase("end")
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  }else{
    const end = document.getElementById("energyEnd")?.value
    if(!end){ alert("Zadej stav na konci"); return }
    try{
      showSaving()
      await api("setenergy", {event: eventId, end, phase: "end"})
      invalidateCache("energy")
      window.ENERGY_EVENT = null
      hideSaving("Stav na konci uložen ✓")
      renderEnergy()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
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
    if(!values.start){ alert("Vyplň stav na začátku"); return }
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
  // nahrazeno saveEnergyPhase
}

/* ===============================
   REPERTOAR
================================ */

async function renderRepertoar(){
  const scroll = saveScroll()
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

    const filtered = sorted.filter(r => {
      const status  = REPERTOAR_ACTIVE_FILTERS.status
      const version = REPERTOAR_ACTIVE_FILTERS.version
      const isFav   = !!favorites[r.ID]
      const matchStatus  = status  === "Vše" ? true : status === "Oblíbené" ? isFav : r.STATUS === status
      const matchVersion = version === "Vše" ? true : (r.VERSION||"").toLowerCase() === version.toLowerCase()
      return matchStatus && matchVersion
    })

    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
    html += `<h2 style="margin:0 0 16px">Repertoár</h2>`
    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
      html += `<div class="btn-group" style="margin-bottom:16px">
        <button onclick="openAddSong()">+ Přidat skladbu</button>
      </div>`
    }

    html += `<div class="card" style="margin-bottom:16px">
      <input
        id="repertoarSearch"
        placeholder="🔍 Hledat skladbu, skladatele…"
        oninput="filterRepertoar(this.value)"
        style="margin-bottom:0"
      >
    </div>`

    html += `<div style="margin-bottom:8px">
      <button onclick="toggleRepertoarFilter()" style="width:100%;display:flex;justify-content:space-between;align-items:center">
        <span>Filtr</span>
        <span id="chevronRepertoarFilter">${REPERTOAR_FILTER_OPEN ? "‹" : "›"}</span>
      </button>
    
      <div id="repertoarFilterPanel" style="display:${REPERTOAR_FILTER_OPEN ? "block" : "none"};margin-top:8px;padding:12px;background:var(--card);border-radius:14px">
        
        <div class="small" style="font-weight:600;margin-bottom:6px">Status</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${["Vše", "Aktivní", "Neaktuální", "Mimo repertoár", "Oblíbené"].map(s => `
            <button onclick="setRepertoarFilter('status','${s}')"
              style="padding:10px 16px;font-size:14px;${REPERTOAR_ACTIVE_FILTERS.status === s ? "background:#007aff;color:#fff" : ""}">
              ${s}
            </button>
          `).join("")}
        </div>
    
        <div class="small" style="font-weight:600;margin-bottom:6px">Verze</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${["Vše", "TTBB", "SATB"].map(v => `
            <button onclick="setRepertoarFilter('version','${v}')"
              style="padding:10px 16px;font-size:14px;${REPERTOAR_ACTIVE_FILTERS.version === v ? "background:#007aff;color:#fff" : ""}">
              ${v}
            </button>
          `).join("")}
        </div>
    
      </div>
    </div>`

    html += `<div id="repertoarList" style="margin-top:12px">`

    filtered.forEach(r => {
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
        data-version="${escapeHtml(r.VERSION||"").toLowerCase()}"
        data-id="${escapeHtml(r.ID)}"
        data-note="${escapeHtml(r.NOTE||"")}"
        style="margin-bottom:10px;cursor:pointer"
        onclick="selectSong('${escapeHtml(r.ID)}')"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px">
              ${escapeHtml(r.NAME)}${r.VERSION ? ` <span style="font-weight:400;color:var(--muted)">· ${escapeHtml(r.VERSION)}</span>` : ""}
            </div>
            ${r.AUTHOR      ? `<div class="small">Skladatel: ${escapeHtml(r.AUTHOR)}</div>`     : ""}
            ${r.ARRANGED_BY ? `<div class="small">Aranžmá: ${escapeHtml(r.ARRANGED_BY)}</div>` : ""}
            ${r.TEXT_BY     ? `<div class="small">Text: ${escapeHtml(r.TEXT_BY)}</div>`         : ""}
            <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
              ${r.LENGTH ? `<span class="small">⏱ ${formatLength(r.LENGTH)}</span>` : ""}
              <span style="font-size:11px;font-weight:600;color:${statusColor}">${escapeHtml(r.STATUS)}</span>
              ${r.CODE ? `<span class="small" style="color:var(--muted)">${escapeHtml(r.CODE)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            ${r.PDF ? `
              <a href="${escapeHtml(r.PDF)}" target="_blank"
                onclick="event.stopPropagation()"
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
    
        ${SONG_SELECTED === r.ID ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">
            ${r.NOTE ? `<div class="small" style="margin-bottom:10px;white-space:pre-wrap">${escapeHtml(r.NOTE)}</div>` : ""}
            ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
              <div class="btn-group">
                <button onclick="event.stopPropagation();openEditSong('${escapeHtml(r.ID)}')" style="background:#e8f0fe;color:#007aff">Upravit</button>
                <button onclick="event.stopPropagation();deleteSongItem('${escapeHtml(r.ID)}')" style="background:#fde8e8;color:#c00">Smazat</button>
              </div>
            ` : ""}
          </div>
        ` : ""}
    
      </div>`
    })

    html += `</div>`
    if(isDesktop) html += `</div>`
    container().innerHTML = html
    restoreScroll(scroll)
     
  }catch(err){
    setError("Chyba při načítání repertoáru: " + (err?.message || err))
  }
}

function selectSong(id){
  const prev = SONG_SELECTED
  SONG_SELECTED = SONG_SELECTED === id ? null : id

  // aktualizuj starou kartu
  if(prev){
    const oldCard = document.querySelector(`.repertoar-row[data-id="${prev}"]`)
    if(oldCard) oldCard.querySelector(".song-detail")?.remove()
  }

  // aktualizuj novou kartu
  const card = document.querySelector(`.repertoar-row[data-id="${id}"]`)
  if(!card) return

  if(SONG_SELECTED === id){
    // přidej detail
    const detailHtml = buildSongDetail(id)
    card.insertAdjacentHTML("beforeend", detailHtml)
  }
}

function openAddSong(){
  openFormModal("Nová skladba", [
    {key: "name",        label: "Název",        type: "text"},
    {key: "author",      label: "Skladatel",    type: "text"},
    {key: "arranged_by", label: "Aranžmá",      type: "text"},
    {key: "text_by",     label: "Text",         type: "text"},
    {key: "status",      label: "Status",       type: "select",    value: "Aktivní",    options: ["Aktivní", "Neaktuální", "Mimo repertoár"]},
    {key: "version",     label: "Verze",        type: "select",    value: "",           options: ["", "TTBB", "SATB"]},
    {key: "pdf",         label: "Odkaz na noty (URL)", type: "text"},
    {key: "code",        label: "Kód",          type: "text"},
    {key: "note",        label: "Poznámka",     type: "textarea"}
  ], async (values) => {
    if(!values.name){ alert("Zadej název skladby"); return }
    try{
      closeFormModal()
      showSaving()
      await api("addsong", values)
      lsDel("repertoar")
      hideSaving("Skladba přidána ✓")
      renderRepertoar()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}

async function openEditSong(id){
  const data = await cachedApi("repertoar")
  const song = data.find(r => r.ID === id)
  if(!song) return

  openFormModal("Upravit skladbu", [
    {key: "name",        label: "Název",        type: "text",     value: song.NAME},
    {key: "author",      label: "Skladatel",    type: "text",     value: song.AUTHOR},
    {key: "arranged_by", label: "Aranžmá",      type: "text",     value: song.ARRANGED_BY},
    {key: "text_by",     label: "Text",         type: "text",     value: song.TEXT_BY},
    {key: "status",      label: "Status",       type: "select", value: song?.STATUS || "Aktivní", options: ["Aktivní", "Neaktuální", "Mimo repertoár"]},
    {key: "version",     label: "Verze",        type: "select", value: song?.VERSION || "", options: ["", "TTBB", "SATB"]},
    {key: "pdf",         label: "Odkaz na noty (URL)", type: "text", value: song.PDF},
    {key: "code",        label: "Kód",          type: "text",     value: song.CODE},
    {key: "note",        label: "Poznámka",     type: "textarea", value: song.NOTE}
  ], async (values) => {
    if(!values.name){ alert("Zadej název skladby"); return }
    try{
      closeFormModal()
      showSaving()
      await api("updatesong", {id, ...values})
      lsDel("repertoar")
      hideSaving("Skladba upravena ✓")
      renderRepertoar()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + err.message)
    }
  })
}

async function deleteSongItem(id){
  confirmModal("Opravdu smazat tuto skladbu?", async () => {
    try{
      showSaving()
      await api("deletesong", {id})
      lsDel("repertoar")
      hideSaving("Skladba smazána ✓")
      renderRepertoar()
    }catch(err){
      hideSaving("Chyba ✗")
      alert("Chyba: " + (err?.message || err))
    }
  })
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

function toggleRepertoarFilter(){
  REPERTOAR_FILTER_OPEN = !REPERTOAR_FILTER_OPEN
  const panel   = document.getElementById("repertoarFilterPanel")
  const chevron = document.getElementById("chevronRepertoarFilter")
  if(panel)   panel.style.display   = REPERTOAR_FILTER_OPEN ? "block" : "none"
  if(chevron) chevron.textContent   = REPERTOAR_FILTER_OPEN ? "‹" : "›"
}

function setRepertoarFilter(type, value){
  REPERTOAR_ACTIVE_FILTERS[type] = value
  REPERTOAR_FILTER_OPEN = true
  renderRepertoar()
}

function applyRepertoarFilter(){
  const search  = (document.getElementById("repertoarSearch")?.value || "").toLowerCase()
  const status  = REPERTOAR_ACTIVE_FILTERS.status
  const version = REPERTOAR_ACTIVE_FILTERS.version

  console.log("filter status:", status, "version:", version)

  document.querySelectorAll(".repertoar-row").forEach(row => {
    const name       = row.dataset.name     || ""
    const author     = row.dataset.author   || ""
    const arranged   = row.dataset.arranged || ""
    const text       = row.dataset.text     || ""
    const rowStatus  = row.dataset.status   || ""
    const rowFav     = row.dataset.fav      || "0"
    const rowVersion = row.dataset.version  || ""

    const matchSearch  = !search || name.includes(search) || author.includes(search) || arranged.includes(search) || text.includes(search)
    const matchStatus  = status  === "Vše" ? true : status === "Oblíbené" ? rowFav === "1" : rowStatus === status
    const matchVersion = version === "Vše" ? true : rowVersion === version.toLowerCase()

    row.style.display = matchSearch && matchStatus && matchVersion ? "" : "none"
  })
}

function filterRepertoar(query){
  applyRepertoarFilter()
}

/* ===============================
   HEATMAPA
================================ */

let HEATMAP_MONTH = null

async function renderHeatmap(){
  try{
    const data    = await cachedApi("heatmap")
    const events  = data.events  || []
    const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
    const members = (data.members || []).sort((a, b) => {
     const ai = voiceOrder.indexOf(a.VOICE)
     const bi = voiceOrder.indexOf(b.VOICE)
     return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

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
   }).sort((a, b) => new Date(a.DATE) - new Date(b.DATE))

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
          <div style="font-weight:600;cursor:pointer;color:#007aff;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}" onclick="setActiveTab('events');openEvent('${escapeHtml(e.ID)}')">${escapeHtml(e.NAME)}</div>
          ${e.STATUS === "Zrušená" ? `<div style="color:#ff3b30;font-size:11px;font-weight:600">Zrušená</div>` : `<div style="color:var(--muted);font-size:11px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>`}
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
        html += `<div style="font-weight:600;font-size:15px;margin-bottom:2px;cursor:pointer;color:#007aff;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}" onclick="setActiveTab('events');openEvent('${escapeHtml(e.ID)}')">${escapeHtml(e.NAME)}</div>`
        html += `${e.STATUS === "Zrušená" ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:4px;text-transform:uppercase">Zrušená</div>` : ""}`
        html += `<div class="small" style="margin-bottom:10px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>`

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
   KONTAKTY
================================ */

async function openContactModal(id){
  const members = await cachedApi("members")
  const m = members.find(m => m.ID === id)
  if(!m) return

  const canEdit = MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"

  document.getElementById("contactModalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:50%;background:#e5e5ea;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 12px">
        ${getInitials(m.NAME)}
      </div>
      <div style="font-size:20px;font-weight:700">${escapeHtml(m.NAME)}</div>
      <div class="small">${escapeHtml(m.VOICE)}</div>
      <div style="font-size:11px;font-weight:600;color:#007aff;margin-top:4px;text-transform:uppercase">${escapeHtml(m.ROLE)}</div>
    </div>

    <div style="margin-bottom:16px">
      ${m.EMAIL ? `<div style="padding:10px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
        <div class="small" style="margin-bottom:2px">Email</div>
        <div style="font-weight:500">${escapeHtml(m.EMAIL)}</div>
      </div>` : ""}
      ${m.PHONE ? `<div style="padding:10px 0">
        <div class="small" style="margin-bottom:2px">Telefon</div>
        <div style="font-weight:500">${escapeHtml(m.PHONE)}</div>
      </div>` : ""}
    </div>

    <div style="display:flex;flex-direction:column;gap:8px">
      ${m.PHONE ? `<a href="tel:${escapeHtml(m.PHONE)}" style="display:block;text-align:center;padding:14px;background:#d4f5e2;border-radius:14px;font-weight:600;color:#1a7a3a;text-decoration:none">📞 Zavolat</a>` : ""}
      ${m.EMAIL ? `<a href="mailto:${escapeHtml(m.EMAIL)}" style="display:block;text-align:center;padding:14px;background:#e8f0fe;border-radius:14px;font-weight:600;color:#007aff;text-decoration:none">✉️ Napsat e-mail</a>` : ""}
      ${canEdit ? `<button onclick="closeContactModal();openEditMember('${escapeHtml(m.ID)}')" style="width:100%">Upravit kontakt</button>` : ""}
      <button onclick="closeContactModal()" style="width:100%;background:#e8e8ed;color:#6b6b70">Zavřít</button>
    </div>
  `

  document.getElementById("contactModal").classList.remove("hidden")
}

function closeContactModal(){
  document.getElementById("contactModal").classList.add("hidden")
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
  Object.keys(localStorage)
    .filter(k => k.startsWith("cache_"))
    .forEach(k => localStorage.removeItem(k))

  if(MEMBER_ROLE === "GUEST"){
    renderGuestView()
  } else if(ACTIVE_TAB === "dashboard")  renderDashboard()
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
  const modal     = document.getElementById("formModal")
  const titleEl   = document.getElementById("formModalTitle")
  const bodyEl    = document.getElementById("formModalBody")
  const submitBtn = document.getElementById("formModalSubmit")

  titleEl.textContent = title
  bodyEl.innerHTML = fields.map(f => `
    <label style="display:block;margin-bottom:12px">
      ${f.label}<br>
      ${f.type === "textarea"
        ? `<textarea id="fModal_${f.key}" style="width:100%;min-height:80px;margin-top:4px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${f.value||""}</textarea>`
        : f.type === "select"
        ? `<select id="fModal_${f.key}" style="margin-top:4px">
            ${(f.options||[]).map(o => `<option value="${o}" ${f.value === o ? "selected" : ""}>${o}</option>`).join("")}
           </select>`
        : `<input id="fModal_${f.key}" type="${f.type||"text"}" value="${f.value||""}" placeholder="${f.placeholder||""}" style="margin-top:4px">`
      }
    </label>
  `).join("")

  // obnov uložený stav formuláře
  const savedForm = JSON.parse(sessionStorage.getItem("10base_form") || "null")
  if(savedForm && savedForm.title === title && Date.now() - savedForm.timestamp < SESSION_TTL){
    fields.forEach(f => {
      const el = document.getElementById("fModal_" + f.key)
      if(el && savedForm.fields[f.key] !== undefined) el.value = savedForm.fields[f.key]
    })
  }

  // ukládej průběžně
  fields.forEach(f => {
    const el = document.getElementById("fModal_" + f.key)
    if(el){
      el.addEventListener("input", () => {
        const formState = {}
        fields.forEach(f => {
          formState[f.key] = document.getElementById("fModal_" + f.key)?.value || ""
        })
        sessionStorage.setItem("10base_form", JSON.stringify({
          title,
          fields: formState,
          timestamp: Date.now()
        }))
      })
    }
  })

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
  sessionStorage.removeItem("10base_form")
  document.getElementById("formModal").classList.add("hidden")
}

/* ===============================
   REALTIME
================================ */

let REALTIME_DEBOUNCE = null

function initRealtime(){
  const tryInit = setInterval(() => {
    if(typeof window.watchChanges === "function"){
      clearInterval(tryInit)
      window.watchChanges((changed) => {
        clearTimeout(REALTIME_DEBOUNCE)
        REALTIME_DEBOUNCE = setTimeout(() => {
          handleRealtimeChange(changed)
        }, 500)
      })
    }
  }, 100)
}

async function handleRealtimeChange(changed){

   if(MEMBER_ROLE === "GUEST"){
    renderGuestView()
    return
  }

  if(changed === "dochazka"){
    lsDel("myattendance_" + MEMBER_EMAIL)
    Object.keys(localStorage)
      .filter(k => k.startsWith("cache_detail_"))
      .forEach(k => localStorage.removeItem(k))
    CACHE.detail = {}
    CACHE.ts     = {}
    if(ACTIVE_TAB === "dashboard")   updateDashboardAttendance()
    else if(ACTIVE_TAB === "events") updateEventsAttendance()

  }else if(changed === "akce"){
    lsDel("events")
    CACHE.detail = {}
    CACHE.ts     = {}
    if(ACTIVE_TAB === "dashboard")   renderDashboard()
    else if(ACTIVE_TAB === "events") renderEvents()

  }else if(changed === "program"){
    CACHE.detail = {}
    CACHE.ts     = {}
    // aktualizuj detail akce pokud je otevřený
    if(ACTIVE_TAB === "events"){
      const detailSlot = document.getElementById("detail-panel-slot")
      if(isDesktop && detailSlot && detailSlot.innerHTML.trim() !== ""){
        // najdi otevřenou akci podle aktivní karty
        const activeCard = document.querySelector(".swipe-card.next")
        if(activeCard?.dataset?.id) openEvent(activeCard.dataset.id)
      }
    }else if(ACTIVE_TAB === "dashboard"){
      // aktualizuj program v dashboardu
      updateDashboardAttendance()
    }

  }else if(changed === "aktuality"){
    lsDel("aktuality")
    if(ACTIVE_TAB === "dashboard"){
      // aktualizuj jen sekci aktualit
      updateDashboardAktuality()
    }

  }else if(changed === "todos"){
    lsDel("todos")
    if(ACTIVE_TAB === "dashboard"){
      updateDashboardTodos()
    }

  }else if(changed === "members"){
    lsDel("members")
    window.MEMBERS = await api("members")
  }

}

async function updateDashboardAktuality(){
  try{
    const aktuality = await api("aktuality")
    lsSet("aktuality", aktuality)

    const container = document.querySelector(".dash-aktuality")
    if(!container) return

    if(!Array.isArray(aktuality) || !aktuality.length){
      container.innerHTML = `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné aktuality</p></div>`
      return
    }

    container.innerHTML = aktuality.map((a, idx) => {
      const isSelected = MEMBER_ROLE === "ADMIN" && AKTUALITA_SELECTED === a.id
      const border = idx < aktuality.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.1);" : ""
      return `<div
        style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"}${isSelected ? ";background:var(--card-selected)" : ""}"
onclick="${MEMBER_ROLE === "ADMIN" ? "selectAktualita('" + escapeHtml(a.id) + "')" : ""}"
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
    }).join("")
  }catch(e){ console.error("updateDashboardAktuality:", e) }
}

async function updateDashboardTodos(){
  try{
    const todos = await api("todos")
    lsSet("todos", todos)

    const container = document.querySelector(".dash-todos")
    if(!container) return

    if(!Array.isArray(todos) || !todos.length){
      container.innerHTML = `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné úkoly</p></div>`
      return
    }

    container.innerHTML = todos.map((t, idx) => {
      const done       = t.done === true
      const isSelected = MEMBER_ROLE === "ADMIN" && TODO_SELECTED === t.id
      const border     = idx < todos.length - 1 ? "border-bottom:1px solid rgba(128,128,128,0.08);" : ""
      return `<div
        style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"}${isSelected ? ";background:var(--card-selected)" : ""}"
onclick="${MEMBER_ROLE === "ADMIN" ? "selectTodo('" + escapeHtml(t.id) + "')" : ""}"
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
    }).join("")
  }catch(e){ console.error("updateDashboardTodos:", e) }
}

async function updateDashboardAttendance(){
  try{
    const events = await cachedApi("events")
    const today  = new Date()
    today.setHours(0,0,0,0)
    const upcoming = events
      .filter(e => { const d = new Date(e.DATE); d.setHours(0,0,0,0); return d >= today })
      .sort((a,b) => new Date(a.DATE) - new Date(b.DATE))[0]
    if(!upcoming) return

    const detail = await api("eventdetail", {id: upcoming.ID})
    lsSet("detail_" + upcoming.ID, detail)

    // aktualizuj počet přítomných
    const count   = (detail.attendance || []).filter(a => a.STATUS === "Přijdu").length
    const countEl = document.querySelector(".dash-attendance-count")
    if(countEl) countEl.textContent = `✓ Přijdu: ${count}`

    // aktualizuj heatmapu
    lsDel("heatmap")
    const heatmapEl = document.getElementById("heatmap-container") || document.querySelector(".desktop-col-right")
    if(heatmapEl){
      heatmapEl.innerHTML = await renderHeatmap()
    }
  }catch(e){ console.error("updateDashboardAttendance:", e) }
}

async function updateEventsAttendance(){
  try{
    // aktualizuj badge na kartách v seznamu
    const myAttendance = await api("myattendance", {email: MEMBER_EMAIL})
    lsSet("myattendance_" + MEMBER_EMAIL, myAttendance)

    document.querySelectorAll(".swipe-card[data-id]").forEach(card => {
      const id = card.dataset.id
      const a  = myAttendance[id]
      if(!a || !a.status) return

      // smaž starý badge
      card.querySelectorAll(".attendance-badge, div[style*='text-transform:uppercase']").forEach(el => el.remove())

      // přidej nový
      const color = a.status === "Přijdu" ? "#34c759" : a.status === "Nepřijdu" ? "#ff3b30" : "#ff9f0a"
      const badge = document.createElement("div")
      badge.className = "attendance-badge"
      badge.style.cssText = `margin-top:6px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em`
      badge.textContent = a.status
      card.appendChild(badge)
    })

    // pokud je otevřený detail, aktualizuj docházkový přehled
    const detailSlot = document.getElementById("detail-panel-slot")
    if(detailSlot && detailSlot.innerHTML.trim() !== ""){
      const openCard = document.querySelector(".swipe-card[data-open='true']")
      if(openCard?.dataset?.id) openEvent(openCard.dataset.id)
    }
  }catch(e){ console.error("updateEventsAttendance:", e) }
}

function invalidateAllCache(){
  Object.keys(localStorage)
    .filter(k => k.startsWith("cache_"))
    .forEach(k => localStorage.removeItem(k))
  CACHE.detail = {}
  CACHE.ts     = {}
}

async function silentRefresh(){
  if(MEMBER_ROLE === "GUEST"){
    renderGuestView()
    return
  }
  if(ACTIVE_TAB === "dashboard"){
    renderDashboard()
  }else if(ACTIVE_TAB === "events"){
    await renderEvents()
    if(ACTIVE_DETAIL_ID){
      try{
        await openEvent(ACTIVE_DETAIL_ID)
      }catch(e){
        console.warn("silentRefresh openEvent failed:", e)
        ACTIVE_DETAIL_ID = null
      }
    }
  }else if(ACTIVE_TAB === "payments"){
    renderPayments()
  }else if(ACTIVE_TAB === "energy"){
    renderEnergy()
  }
}

document.addEventListener("visibilitychange", () => {
  if(!document.hidden){
    saveState()
    // silentRefresh záměrně vypnut — stav appky se obnovuje přes sessionStorage
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
window.addEventListener("scroll", () => {
  saveState()
}, {passive: true})

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
window.toggleDashboardEvent  = toggleDashboardEvent
window.toggleDashAttendance  = toggleDashAttendance
window.editDashNote         = editDashNote
window.toggleAktualita      = toggleAktualita
window.toggleCollection     = toggleCollection
window.recordPayment        = recordPayment
window.deleteCollection     = deleteCollection
window.openEvent            = openEvent
window.openEventForm        = openEventForm
window.openProgramEditor    = openProgramEditor
window.renderEvents         = renderEvents
window.togglePastEvents     = togglePastEvents
window.renderDashboard      = renderDashboard
window.renderPayments       = renderPayments
window.renderEnergy         = renderEnergy
window.renderRepertoar      = renderRepertoar
window.toggleFav            = toggleFav
window.doAttendance         = doAttendance
window.doAttendanceMozna    = doAttendanceMozna
window.doAttendanceWithReason = doAttendanceWithReason
window.toggleAttendanceAccordion = toggleAttendanceAccordion
window.confirmMozna         = confirmMozna
window.closeMoznaModal      = closeMoznaModal
window.saveEvent            = saveEvent
window.deleteEvent          = deleteEvent
window.toggleEventFormExtra = toggleEventFormExtra
window.renderEventFormExtra = renderEventFormExtra
window.toggleStravaNote     = toggleStravaNote
window.toggleObleceniSoustredeniDetail = toggleObleceniSoustredeniDetail
window.saveNote             = saveNote
window.saveProgram          = saveProgram
window.selectEnergyRow      = selectEnergyRow
window.editEnergyRow        = editEnergyRow
window.deleteEnergyRow      = deleteEnergyRow
window.saveEnergy           = saveEnergy
window.setEnergyPhase       = setEnergyPhase
window.saveEnergyPhase      = saveEnergyPhase
window.uploadDocUrl         = uploadDocUrl
window.toggleProgSong       = toggleProgSong
window.removeProgSong       = removeProgSong
window.moveProgSong         = moveProgSong
window.setProgSection       = setProgSection
window.filterProgSongs      = filterProgSongs
window.filterRepertoar      = filterRepertoar
window.toggleRepertoarFilter = toggleRepertoarFilter
window.setRepertoarFilter    = setRepertoarFilter
window.applyRepertoarFilter  = applyRepertoarFilter
window.selectSong           = selectSong
window.openAddSong          = openAddSong
window.openEditSong         = openEditSong
window.deleteSongItem       = deleteSongItem
window.heatmapPrev          = heatmapPrev
window.heatmapNext          = heatmapNext
window.heatmapInfo          = heatmapInfo
window.eventsMonthPrev      = eventsMonthPrev
window.eventsMonthNext      = eventsMonthNext
window.prefetchProgramPdfs  = prefetchProgramPdfs
window.Auth                 = Auth
window.toggleDarkMode       = toggleDarkMode
window.setActiveTab         = setActiveTab
window.enablePush           = enablePush
window.toggleAccordion      = toggleAccordion
window.confirmModal         = confirmModal
window.promptModal          = promptModal
window.toggleRecurrenceUntil  = toggleRecurrenceUntil
window.openDeleteSeriesModal  = openDeleteSeriesModal
window.openEditSeriesFrom   = openEditSeriesFrom
window.saveSeriesFrom       = saveSeriesFrom
window.openEditEventModal   = openEditEventModal
window.openDeleteEventModal = openDeleteEventModal
window.saveEntireSeries     = saveEntireSeries
window.renderGuestView      = renderGuestView
window.openAddMember        = openAddMember
window.openEditMember       = openEditMember
window.deleteMemberItem     = deleteMemberItem
window.renderMembers        = renderMembers
window.openContactModal     = openContactModal
window.closeContactModal    = closeContactModal
window.closeEventFormModal  = closeEventFormModal
window.closeProgramEditorModal = closeProgramEditorModal
