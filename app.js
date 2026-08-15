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
let ZKUSEBNA_TAB = "repertoar" // "repertoar" | "klavesy" | "cvt"

const BULLETIN = `Koncert s Verum se blíží — sledujte detaily akce.`
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
  if(profileBtn){
    const authUser = JSON.parse(localStorage.getItem('10base_user') || 'null')
    const photoURL = authUser?.photoURL
    if(photoURL){
      profileBtn.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    }else{
      profileBtn.textContent = getInitials(MEMBER_NAME)
    }
  }

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

function renderPosadkyDetail(json){
  let posadky = []
  try{ posadky = JSON.parse(json) }catch(e){ return "" }
  if(!Array.isArray(posadky) || !posadky.length) return ""

  const members = window.MEMBERS || []
  const getName = id => {
    const m = members.find(m => (m.ID || m.id) === id)
    return m ? (m.NAME || m.name) : "—"
  }

  return posadky.map(p => `
    <div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
      <span class="small" style="display:block">Auto: ${escapeHtml(p.nazev || "—")}</span>
      <div>Řidič: <b>${escapeHtml(getName(p.ridic))}</b></div>
      ${Array.isArray(p.posadka) && p.posadka.length ? `<div>Posádka: ${p.posadka.map(id => escapeHtml(getName(id))).join(", ")}</div>` : ""}
    </div>
  `).join("")
}

function renderHarmonogramDetail(json){
  let items = []
  try{ items = JSON.parse(json) }catch(e){ return "" }
  if(!Array.isArray(items) || !items.length) return ""

  const validItems = items.filter(h => h.cas || h.popis)
  if(!validItems.length) return ""

  return `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
    <span class="small" style="display:block;margin-bottom:6px">Harmonogram akce</span>
    ${validItems.map(h => `
      <div style="display:flex;gap:10px;padding:4px 0;font-size:14px">
        <span style="font-weight:600;min-width:48px">${escapeHtml(h.cas || "—")}</span>
        <span>${escapeHtml(h.popis || "")}</span>
      </div>
    `).join("")}
  </div>`
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
  const sidebarAvatar = document.getElementById("sidebarAvatar")
  if(sidebarAvatar){
    const sbUser = JSON.parse(localStorage.getItem('10base_user') || 'null')
    if(sbUser?.photoURL){
      sidebarAvatar.innerHTML = `<img src="${sbUser.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    }else{
      sidebarAvatar.textContent = getInitials(MEMBER_NAME)
    }
  }
  document.getElementById("sidebarName").textContent = MEMBER_NAME || "—"
  document.getElementById("sidebarRole").textContent = MEMBER_ROLE || "—"

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

  const calBtn = document.createElement("button")
  calBtn.className = "sidebar-action"
  calBtn.style.cssText = "color:#007aff"
  calBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span> Odebírat kalendář`
  calBtn.onclick = () => window.open("https://calendar.google.com/calendar/ical/ccb0f336309267e9d6294869d04e326a7cec741cd19d31c8bed64c950a419e5a%40group.calendar.google.com/private-d5fa7e38852e961ae72298e6f6bcffea/basic.ics")
  document.querySelector(".sidebar-bottom").prepend(calBtn)

  const discordBtn = document.createElement("button")
  discordBtn.className = "sidebar-action"
  discordBtn.style.cssText = "color:#5865f2"
  discordBtn.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg></span> Discord 10men`
  discordBtn.onclick = () => window.open("https://discord.gg/8fmqSEQ2")
  document.querySelector(".sidebar-bottom").prepend(discordBtn)

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
                style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
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
                style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
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
 window.EDIT_RIDER = null
 window.EDIT_HARMONOGRAM = null
 window.EDIT_POSADKY = null

  let event = {}
  if(id){
    try{
      const data = await cachedApi("eventdetail", {id})
      event = data.event || {}
      window.EDIT_EVENT = event
      window.EDIT_PROGRAM = data.program || []
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
      <span>Potřebujeme program z repertoáru?</span>
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
        <span style="font-weight:600;font-size:15px">Vyplnit další podrobnosti</span>
        <span id="chevronEventFormExtra">›</span>
      </div>
      <div id="eventFormExtra" style="display:none;margin-top:12px">
        <!-- sem přijdou podmíněné fieldy -->
      </div>
    </div>

   <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
      <button onclick="saveEvent(${isEdit ? `'${id}'` : 'null'}, true)" style="width:100%;background:#d4f5e2;color:#1a7a3a">
        ${isEdit ? "Uložit a poslat do Discordu" : "Vytvořit a poslat do Discordu"}
      </button>
      <div class="btn-group">
        <button onclick="saveEvent(${isEdit ? `'${id}'` : 'null'}, false)" style="background:#e8e8ed;color:#000">Pouze uložit</button>
        <button onclick="closeEventFormModal()">Zrušit</button>
      </div>
    </div>
  </div>`

  document.getElementById("eventFormModalBody").innerHTML = html
  document.getElementById("eventFormModal").classList.remove("hidden")
}

function closeEventFormModal(){
  document.getElementById("eventFormModal").classList.add("hidden")
  window.EDIT_POSADKY = null
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
    const type2 = document.getElementById("fType")?.value || "Zkouška"
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
        <select id="fDoprava" onchange="toggleDopravaPosadky(this.value)">
          <option value="">Nezadáno</option>
          <option value="Veřejná doprava" ${window.EDIT_EVENT?.DOPRAVA === "Veřejná doprava" ? "selected" : ""}>Veřejná doprava</option>
          <option value="Auta" ${window.EDIT_EVENT?.DOPRAVA === "Auta" ? "selected" : ""}>Auta</option>
          <option value="Každý po své ose" ${window.EDIT_EVENT?.DOPRAVA === "Každý po své ose" ? "selected" : ""}>Každý po své ose</option>
        </select>
      </label>
      <div id="dopravaPosadky" style="display:${window.EDIT_EVENT?.DOPRAVA === "Auta" ? "block" : "none"};margin-top:12px">
        ${renderPosadkyHtml()}
      </div>
      <label style="margin-top:12px">Hospoda<br>
        <textarea id="fHospoda" style="width:100%;min-height:60px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px" placeholder="Název/adresa, čas rezervace, na jaké jméno...">${escapeHtml(window.EDIT_EVENT?.HOSPODA || "")}</textarea>
      </label>

      ${type2 === "Koncert" ? `
        <label style="margin-top:16px;display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="fIsSpolupraceVal" ${window.EDIT_EVENT?.IS_SPOLUPRACE ? "checked" : ""} style="width:auto;margin:0" onchange="toggleSpolupraceField(this.checked)">
          <span>Spolupráce s jiným tělesem</span>
        </label>
        <div id="spolupraceNazevWrap" style="display:${window.EDIT_EVENT?.IS_SPOLUPRACE ? "block" : "none"};margin-top:8px">
          <label>Název spolupracujícího tělesa<br>
            <input id="fSpolupraceNazev" type="text" value="${escapeHtml(window.EDIT_EVENT?.SPOLUPRACE_NAZEV || "")}" placeholder="např. Sbor XY">
          </label>
        </div>

        <div style="margin-top:16px">
          <span class="small" style="font-weight:600">Harmonogram akce</span>
          <div id="harmonogramList" style="margin-top:8px">
            ${renderHarmonogramHtml()}
          </div>
          <button type="button" onclick="addHarmonogramRow()" style="width:100%;margin-top:8px">+ Přidat položku</button>
        </div>
        ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? renderRiderToggleHtml() : ""}
      ` : ""}
      
      ${type2 === "Jiná akce" ? `
        <label style="margin-top:16px;display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="fIsGrilovacka" ${window.EDIT_EVENT?.IS_GRILOVACKA ? "checked" : ""} style="width:auto;margin:0">
          <span>Grilovačka 🔥 — zobrazit sdílený seznam věcí</span>
        </label>
      ` : ""}
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
      <label style="margin-top:12px">Doprava<br>
        <select id="fDoprava" onchange="toggleDopravaPosadky(this.value)">
          <option value="">Nezadáno</option>
          <option value="Veřejná doprava" ${window.EDIT_EVENT?.DOPRAVA === "Veřejná doprava" ? "selected" : ""}>Veřejná doprava</option>
          <option value="Auta" ${window.EDIT_EVENT?.DOPRAVA === "Auta" ? "selected" : ""}>Auta</option>
          <option value="Každý po své ose" ${window.EDIT_EVENT?.DOPRAVA === "Každý po své ose" ? "selected" : ""}>Každý po své ose</option>
        </select>
      </label>
      <div id="dopravaPosadky" style="display:${window.EDIT_EVENT?.DOPRAVA === "Auta" ? "block" : "none"};margin-top:12px">
        ${renderPosadkyHtml()}
      </div>
      <label style="margin-top:12px">Harmonogram<br>
        <textarea id="fHarmonogram" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(window.EDIT_EVENT?.HARMONOGRAM || "")}</textarea>
      </label>
    `
  }else{
    panel.innerHTML = `<p class="notice">Pro typ "${type}" nejsou k dispozici další informace.</p>`
  }
}

// =============================================
// RIDER — Garant, Přípravné akce, Ukončení akce
// (harmonogram koncertu se skladbami přidáme později)
// =============================================

let RIDER_OPEN = false

function toggleRiderAccordion(){
  RIDER_OPEN = !RIDER_OPEN
  const panel   = document.getElementById("riderPanel")
  const chevron = document.getElementById("chevronRider")
  if(panel)   panel.style.display = RIDER_OPEN ? "block" : "none"
  if(chevron) chevron.textContent = RIDER_OPEN ? "‹" : "›"
  if(RIDER_OPEN) renderRiderPanel()
}

function renderRiderToggleHtml(){
  return `
    <div style="margin-top:16px;border-top:1px solid rgba(128,128,128,0.15);padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleRiderAccordion()">
        <span style="font-weight:600;font-size:15px">Vyplnit podrobnosti pro 10space projekt</span>
        <span id="chevronRider">${RIDER_OPEN ? "‹" : "›"}</span>
      </div>
      <div id="riderPanel" style="display:${RIDER_OPEN ? "block" : "none"};margin-top:12px">
        ${RIDER_OPEN ? renderRiderPanelContent() : ""}
      </div>
    </div>
  `
}

function renderRiderPanel(){
  const panel = document.getElementById("riderPanel")
  if(panel) panel.innerHTML = renderRiderPanelContent()
}

function renderRiderPanelContent(){
  const members = (window.MEMBERS || []).filter(m => (m.ROLE || m.role || "").toUpperCase() !== "GUEST")
  const garantId = getRiderData().garant || ""

  return `
    <label>Garant akce<br>
      <select id="fRiderGarant" onchange="updateRiderField('garant', this.value)">
        <option value="">Nevybráno</option>
        ${members.map(m => `<option value="${escapeHtml(m.ID || m.id)}" ${garantId === (m.ID || m.id) ? "selected" : ""}>${escapeHtml(m.NAME || m.name)}</option>`).join("")}
      </select>
      <span class="small">Člen zodpovědný za organizační průběh akce</span>
    </label>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Přípravné akce</span>
      <div id="riderPripravneList" style="margin-top:8px">
        ${renderRiderListHtml('pripravne_akce')}
      </div>
      <button type="button" onclick="addRiderRow('pripravne_akce')" style="width:100%;margin-top:8px">+ Přidat položku</button>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Harmonogram koncertu</span>
      <div id="riderHarmonogramList" style="margin-top:8px">
        ${renderRiderHarmonogramHtml()}
      </div>
      <div class="btn-group" style="margin-top:8px;flex-wrap:wrap">
        <button type="button" onclick="addRiderBlokZeSkladeb()">+ Blok ze skladeb</button>
        <button type="button" onclick="addRiderHarmonogramItem('moderace')">+ Moderace</button>
        <button type="button" onclick="addRiderHarmonogramItem('pribeh')">+ Příchod/odchod</button>
        <button type="button" onclick="addRiderHarmonogramItem('spolecna')">+ Společná skladba</button>
      </div>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Ukončení akce</span>
      <div id="riderUkonceniList" style="margin-top:8px">
        ${renderRiderListHtml('ukonceni')}
      </div>
      <button type="button" onclick="addRiderRow('ukonceni')" style="width:100%;margin-top:8px">+ Přidat položku</button>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Hospoda</span>
      <label style="margin-top:8px">Název / adresa<br>
        <input type="text" value="${escapeHtml(getRiderData().hospoda?.nazev || "")}" oninput="updateRiderHospoda('nazev', this.value)">
      </label>
      <label style="margin-top:8px">Čas rezervace<br>
        <input type="time" value="${escapeHtml(getRiderData().hospoda?.cas || "")}" oninput="updateRiderHospoda('cas', this.value)">
      </label>
      <label style="margin-top:8px">Na jaké jméno<br>
        <input type="text" value="${escapeHtml(getRiderData().hospoda?.jmeno || "")}" oninput="updateRiderHospoda('jmeno', this.value)">
      </label>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">To-do — před koncertem</span>
      <div id="riderTodoPredList" style="margin-top:8px">
        ${renderRiderTodoHtml('todo_pred')}
      </div>
      <div class="btn-group" style="margin-top:8px">
        <button type="button" onclick="addRiderTodoItem('todo_pred')">+ Přidat úkol</button>
        <button type="button" onclick="addRiderTodoTemplate('todo_pred')">+ Přidat šablonu</button>
      </div>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">To-do — v den koncertu</span>
      <div id="riderTodoDenList" style="margin-top:8px">
        ${renderRiderTodoHtml('todo_den')}
      </div>
      <div class="btn-group" style="margin-top:8px">
        <button type="button" onclick="addRiderTodoItem('todo_den')">+ Přidat úkol</button>
        <button type="button" onclick="addRiderTodoTemplate('todo_den')">+ Přidat šablonu</button>
      </div>
    </div>
  `
}

// --- data helpers ---

function getRiderData(){
  if(window.EDIT_RIDER) return window.EDIT_RIDER

  let rider = {}
  try{
    rider = window.EDIT_EVENT?.RIDER
      ? JSON.parse(window.EDIT_EVENT.RIDER)
      : {}
  }catch(e){ rider = {} }

  if(!rider || typeof rider !== "object") rider = {}
  if(!Array.isArray(rider.pripravne_akce)) rider.pripravne_akce = []
  if(!Array.isArray(rider.harmonogram_koncertu)) rider.harmonogram_koncertu = []
  if(!Array.isArray(rider.ukonceni))       rider.ukonceni = []
  if(!rider.hospoda) rider.hospoda = { nazev: "", cas: "", jmeno: "" }
  if(!Array.isArray(rider.todo_pred)) rider.todo_pred = []
  if(!Array.isArray(rider.todo_den))  rider.todo_den = []

  window.EDIT_RIDER = rider
  return rider
}

function renderRiderListHtml(key){
  const rider = getRiderData()
  const items = rider[key] || []
  return items.map((item, idx) => `
    <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
      <input type="time" value="${escapeHtml(item.cas || "")}"
        oninput="updateRiderRow('${key}', ${idx}, 'cas', this.value)"
        style="width:100px;flex-shrink:0">
      <input type="text" value="${escapeHtml(item.nazev || "")}" placeholder="Název"
        oninput="updateRiderRow('${key}', ${idx}, 'nazev', this.value)"
        style="flex:1">
      <button type="button" onclick="removeRiderRow('${key}', ${idx})" style="width:auto;padding:8px 10px;background:#fde8e8;color:#c00;flex-shrink:0">✕</button>
    </div>
    <input type="text" value="${escapeHtml(item.poznamka || "")}" placeholder="Poznámka (volitelné)"
      oninput="updateRiderRow('${key}', ${idx}, 'poznamka', this.value)"
      style="margin-bottom:10px;font-size:13px">
  `).join("")
}

function addRiderRow(key){
  const rider = getRiderData()
  if(!Array.isArray(rider[key])) rider[key] = []
  rider[key].push({ cas: "", nazev: "", poznamka: "" })
  refreshRiderList(key)
}

function removeRiderRow(key, idx){
  const rider = getRiderData()
  rider[key].splice(idx, 1)
  refreshRiderList(key)
}

function updateRiderRow(key, idx, field, value){
  const rider = getRiderData()
  if(rider[key]?.[idx]) rider[key][idx][field] = value
}

function updateRiderField(field, value){
  const rider = getRiderData()
  rider[field] = value
}

function updateRiderHospoda(field, value){
  const rider = getRiderData()
  if(!rider.hospoda) rider.hospoda = {}
  rider.hospoda[field] = value
}

function refreshRiderList(key){
  const mapId = { pripravne_akce: "riderPripravneList", ukonceni: "riderUkonceniList" }
  const wrap = document.getElementById(mapId[key])
  if(wrap) wrap.innerHTML = renderRiderListHtml(key)
}

window.toggleRiderAccordion = toggleRiderAccordion
window.addRiderRow          = addRiderRow
window.removeRiderRow       = removeRiderRow
window.updateRiderRow       = updateRiderRow
window.updateRiderField     = updateRiderField
window.updateRiderHospoda   = updateRiderHospoda

// =============================================
// RIDER — Harmonogram koncertu (bloky skladeb, moderace)
// Vlož mezi Přípravné akce a Ukončení akce
// =============================================

function renderRiderHarmonogramHtml(){
  const rider = getRiderData()
  const items = rider.harmonogram_koncertu || []
  return items.map((item, idx) => renderRiderHarmonogramItem(item, idx)).join("")
}

function renderRiderHarmonogramItem(item, idx){
  const typLabel = {
    blok: "🎵 Blok skladeb",
    moderace: "🎤 Moderace",
    pribeh: "↔️ Příchod/odchod pódia",
    spolecna: "🤝 Společná skladba"
  }

  return `
    <div class="card" style="margin-bottom:10px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="small" style="font-weight:600">${typLabel[item.typ] || "Položka"}</span>
        <button type="button" onclick="removeRiderHarmonogramItem(${idx})" style="width:auto;padding:6px 10px;background:#fde8e8;color:#c00">✕</button>
      </div>

      <label>Název<br>
        <input type="text" value="${escapeHtml(item.nazev || "")}" placeholder="Název bloku / moderace"
          oninput="updateRiderHarmonogramField(${idx}, 'nazev', this.value)">
      </label>

      ${item.typ === "moderace" ? `
        <label style="margin-top:8px">Moderuje<br>
          <select onchange="updateRiderHarmonogramField(${idx}, 'moderator', this.value)">
            <option value="">Nevybráno</option>
            ${(window.MEMBERS || []).filter(m => (m.ROLE||m.role||"").toUpperCase() !== "GUEST").map(m => `
              <option value="${escapeHtml(m.ID||m.id)}" ${item.moderator === (m.ID||m.id) ? "selected" : ""}>${escapeHtml(m.NAME||m.name)}</option>
            `).join("")}
          </select>
        </label>
      ` : ""}

      ${item.typ === "blok" && Array.isArray(item.skladby) && item.skladby.length ? `
        <div style="margin-top:8px">
          <span class="small">Skladby v bloku:</span>
          ${item.skladby.map((s, sIdx) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
              <span>${sIdx+1}. ${escapeHtml(s.name)}</span>
              <button type="button" onclick="removeSongFromRiderBlock(${idx}, ${sIdx})" style="width:auto;padding:2px 8px;background:#fde8e8;color:#c00;font-size:11px">✕</button>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <label style="margin-top:8px">Odhad stopáže (min)<br>
        <input type="number" value="${escapeHtml(item.stopaz_min || "")}" placeholder="např. 12"
          oninput="updateRiderHarmonogramField(${idx}, 'stopaz_min', this.value)">
      </label>

      <label style="margin-top:8px">Poznámka<br>
        <input type="text" value="${escapeHtml(item.poznamka || "")}" placeholder="Volitelné"
          oninput="updateRiderHarmonogramField(${idx}, 'poznamka', this.value)">
      </label>
    </div>
  `
}

function addRiderHarmonogramItem(typ){
  const rider = getRiderData()
  if(!Array.isArray(rider.harmonogram_koncertu)) rider.harmonogram_koncertu = []
  rider.harmonogram_koncertu.push({ typ, nazev: "", stopaz_min: "", poznamka: "" })
  refreshRiderHarmonogram()
}

function addRiderBlokZeSkladeb(){
  const rider = getRiderData()
  if(!Array.isArray(rider.harmonogram_koncertu)) rider.harmonogram_koncertu = []

  const program = window.EDIT_PROGRAM || []
  if(!program.length){
    alert("Tato akce zatím nemá vyplněný program. Nejprve vytvoř program v sekci Program.")
    return
  }

  const skladby = program.map(p => ({ song_id: p.SONG_ID, name: p.NAME }))

  rider.harmonogram_koncertu.push({
    typ: "blok",
    nazev: "Blok — 10men",
    skladby,
    stopaz_min: "",
    poznamka: ""
  })
  refreshRiderHarmonogram()
}

function removeSongFromRiderBlock(itemIdx, songIdx){
  const rider = getRiderData()
  const item = rider.harmonogram_koncertu?.[itemIdx]
  if(item?.skladby) item.skladby.splice(songIdx, 1)
  refreshRiderHarmonogram()
}

function removeRiderHarmonogramItem(idx){
  const rider = getRiderData()
  rider.harmonogram_koncertu.splice(idx, 1)
  refreshRiderHarmonogram()
}

function updateRiderHarmonogramField(idx, field, value){
  const rider = getRiderData()
  if(rider.harmonogram_koncertu?.[idx]) rider.harmonogram_koncertu[idx][field] = value
}

function refreshRiderHarmonogram(){
  const wrap = document.getElementById("riderHarmonogramList")
  if(wrap) wrap.innerHTML = renderRiderHarmonogramHtml()
}

window.addRiderHarmonogramItem     = addRiderHarmonogramItem
window.addRiderBlokZeSkladeb       = addRiderBlokZeSkladeb
window.removeSongFromRiderBlock    = removeSongFromRiderBlock
window.removeRiderHarmonogramItem  = removeRiderHarmonogramItem
window.updateRiderHarmonogramField = updateRiderHarmonogramField

// =============================================
// RIDER — To-do list (Před koncertem / V den koncertu)
// =============================================

function renderRiderTodoHtml(fazeKey){
  const rider = getRiderData()
  const items = rider[fazeKey] || []
  return items.map((item, idx) => `
    <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;padding:8px;background:var(--card);border-radius:10px">
      <input type="checkbox" ${item.done ? "checked" : ""}
        onchange="updateRiderTodoField('${fazeKey}', ${idx}, 'done', this.checked)"
        style="width:auto;margin-top:10px;flex-shrink:0">
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <input type="text" value="${escapeHtml(item.co || "")}" placeholder="Co je třeba"
          oninput="updateRiderTodoField('${fazeKey}', ${idx}, 'co', this.value)"
          style="${item.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">
        <input type="text" value="${escapeHtml(item.kdo || "")}" placeholder="Kdo to zařídí"
          oninput="updateRiderTodoField('${fazeKey}', ${idx}, 'kdo', this.value)"
          style="font-size:13px">
        <input type="text" value="${escapeHtml(item.poznamka || "")}" placeholder="Poznámka (volitelné)"
          oninput="updateRiderTodoField('${fazeKey}', ${idx}, 'poznamka', this.value)"
          style="font-size:13px">
      </div>
      <button type="button" onclick="removeRiderTodoItem('${fazeKey}', ${idx})" style="width:auto;padding:6px 10px;background:#fde8e8;color:#c00;flex-shrink:0">✕</button>
    </div>
  `).join("")
}

function addRiderTodoItem(fazeKey, co){
  const rider = getRiderData()
  if(!Array.isArray(rider[fazeKey])) rider[fazeKey] = []
  rider[fazeKey].push({ co: co || "", kdo: "", poznamka: "", done: false })
  refreshRiderTodo(fazeKey)
}

function removeRiderTodoItem(fazeKey, idx){
  const rider = getRiderData()
  rider[fazeKey].splice(idx, 1)
  refreshRiderTodo(fazeKey)
}

function updateRiderTodoField(fazeKey, idx, field, value){
  const rider = getRiderData()
  if(rider[fazeKey]?.[idx]) rider[fazeKey][idx][field] = value
  if(field === "done") refreshRiderTodo(fazeKey)
}

function refreshRiderTodo(fazeKey){
  const mapId = { todo_pred: "riderTodoPredList", todo_den: "riderTodoDenList" }
  const wrap = document.getElementById(mapId[fazeKey])
  if(wrap) wrap.innerHTML = renderRiderTodoHtml(fazeKey)
}

const RIDER_TODO_TEMPLATE_PRED = [
  "Vytisknout programy", "QR program", "Cedule \"Vstupné dobrovolné\"",
  "Texty na moderace", "Kasička", "Djembe", "Nahrávadlo",
  "Mobil, držák, powerbanka", "Stativ", "Kontaktovat fotografa", "Rezervace v hospodě"
]

const RIDER_TODO_TEMPLATE_DEN = [
  "Odbaví lidi před začátkem", "Moderuje 10men 1", "Moderuje 10men 2",
  "Moderuje druhý sbor 1", "Moderuje druhý sbor 2", "Moderuje úvod",
  "Moderuje střed", "Zajistí stream", "Moderuje závěr",
  "Asistuje v případě potřeby", "Zajistí zvukový záznam"
]

function addRiderTodoTemplate(fazeKey){
  const rider = getRiderData()
  if(!Array.isArray(rider[fazeKey])) rider[fazeKey] = []
  const template = fazeKey === "todo_pred" ? RIDER_TODO_TEMPLATE_PRED : RIDER_TODO_TEMPLATE_DEN
  template.forEach(co => rider[fazeKey].push({ co, kdo: "", poznamka: "", done: false }))
  refreshRiderTodo(fazeKey)
}

window.addRiderTodoItem      = addRiderTodoItem
window.removeRiderTodoItem   = removeRiderTodoItem
window.updateRiderTodoField  = updateRiderTodoField
window.addRiderTodoTemplate  = addRiderTodoTemplate

// =============================================
// HARMONOGRAM (strukturovaný, čas + popis)
// =============================================

function getInitialHarmonogram(){
  if(window.EDIT_HARMONOGRAM) return window.EDIT_HARMONOGRAM

  let items = []
  try{
    items = window.EDIT_EVENT?.HARMONOGRAM_ITEMS
      ? JSON.parse(window.EDIT_EVENT.HARMONOGRAM_ITEMS)
      : []
  }catch(e){ items = [] }

  if(!Array.isArray(items)) items = []

  // pokud je prázdné a jde o novou akci, předvyplň výchozí položky
  if(!items.length && !window.EDIT_EVENT?.ID){
    const isSpolupraceNow = document.getElementById("fIsSpoluprace")?.checked || false
    const nazevSpoluprace = document.getElementById("fSpolupraceNazev")?.value || ""

    items = [
      { cas: "", popis: "Sraz" },
      { cas: "", popis: "Akustika 10men" },
    ]
    if(isSpolupraceNow){
      items.push({ cas: "", popis: "Akustika " + (nazevSpoluprace || "spolupráce") })
    }
    items.push({ cas: "", popis: "Pouštění lidí do sálu" })
    items.push({ cas: "", popis: "Začátek koncertu" })
    items.push({ cas: "", popis: "Hospoda" })
  }

  window.EDIT_HARMONOGRAM = items
  return items
}

function renderHarmonogramHtml(){
  const items = getInitialHarmonogram()
  return items.map((h, idx) => `
    <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
      <input type="time" value="${escapeHtml(h.cas || "")}"
        oninput="updateHarmonogramField(${idx}, 'cas', this.value)"
        style="width:110px;flex-shrink:0">
      <input type="text" value="${escapeHtml(h.popis || "")}" placeholder="Popis"
        oninput="updateHarmonogramField(${idx}, 'popis', this.value)"
        style="flex:1">
      <button type="button" onclick="removeHarmonogramRow(${idx})" style="width:auto;padding:8px 10px;background:#fde8e8;color:#c00;flex-shrink:0">✕</button>
    </div>
  `).join("")
}

function addHarmonogramRow(){
  const items = getInitialHarmonogram()
  items.push({ cas: "", popis: "" })
  refreshHarmonogramList()
}

function removeHarmonogramRow(idx){
  const items = getInitialHarmonogram()
  items.splice(idx, 1)
  refreshHarmonogramList()
}

function updateHarmonogramField(idx, key, value){
  const items = getInitialHarmonogram()
  if(items[idx]) items[idx][key] = value
}

function refreshHarmonogramList(){
  const wrap = document.getElementById("harmonogramList")
  if(wrap) wrap.innerHTML = renderHarmonogramHtml()
}

function toggleSpolupraceField(checked){
  const wrap = document.getElementById("spolupraceNazevWrap")
  if(wrap) wrap.style.display = checked ? "block" : "none"
}

window.addHarmonogramRow      = addHarmonogramRow
window.removeHarmonogramRow   = removeHarmonogramRow
window.updateHarmonogramField = updateHarmonogramField
window.toggleSpolupraceField  = toggleSpolupraceField

// =============================================
// POSÁDKY (Doprava: Auta)
// =============================================

function getInitialPosadky(){
  // window.EDIT_POSADKY drží pracovní stav (array objektů)
  if(window.EDIT_POSADKY) return window.EDIT_POSADKY

  let posadky = []
  try{
    posadky = window.EDIT_EVENT?.DOPRAVA_POSADKY
      ? JSON.parse(window.EDIT_EVENT.DOPRAVA_POSADKY)
      : []
  }catch(e){ posadky = [] }

  if(!Array.isArray(posadky)) posadky = []
  window.EDIT_POSADKY = posadky
  return posadky
}

function renderPosadkyHtml(){
  const posadky = getInitialPosadky()
  const members = (window.MEMBERS || []).filter(m => (m.ROLE || m.role || "").toUpperCase() !== "GUEST")

  return `
    <div class="small" style="font-weight:600;margin-bottom:8px">Posádky</div>
    <div id="posadkyList">
      ${posadky.map((p, idx) => renderPosadkaCard(p, idx, members, posadky)).join("")}
    </div>
    <button type="button" onclick="addPosadka()" style="width:100%;margin-top:8px">+ Přidat auto</button>
  `
}

function renderPosadkaCard(p, idx, members, allPosadky){
  // zjisti kdo už je přiřazen v jiných autech
  const obsazeniJinde = new Set()
  allPosadky.forEach((other, otherIdx) => {
    if(otherIdx === idx) return
    if(other.ridic) obsazeniJinde.add(other.ridic)
    if(Array.isArray(other.posadka)) other.posadka.forEach(id => obsazeniJinde.add(id))
  })

  const dostupniProRidice = members.filter(m => !obsazeniJinde.has(m.ID || m.id) || (m.ID || m.id) === p.ridic)
  const dostupniProPosadku = members.filter(m => {
    const mid = m.ID || m.id
    if(mid === p.ridic) return false
    return !obsazeniJinde.has(mid) || (Array.isArray(p.posadka) && p.posadka.includes(mid))
  })

  return `
    <div class="card" style="margin-bottom:10px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <label style="flex:1;margin:0">Auto<br>
          <input type="text" value="${escapeHtml(p.nazev || "")}" placeholder="A1"
            oninput="updatePosadkaField(${idx}, 'nazev', this.value)">
        </label>
        <button type="button" onclick="removePosadka(${idx})" style="margin-left:8px;background:#fde8e8;color:#c00;width:auto;padding:8px 12px">✕</button>
      </div>
      <label>Řidič<br>
        <select onchange="updatePosadkaField(${idx}, 'ridic', this.value)">
          <option value="">Vyber řidiče</option>
          ${dostupniProRidice.map(m => `<option value="${escapeHtml(m.ID || m.id)}" ${p.ridic === (m.ID || m.id) ? "selected" : ""}>${escapeHtml(m.NAME || m.name)}</option>`).join("")}
        </select>
      </label>
      <div style="margin-top:8px">
        <span class="small">Posádka</span>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
          ${dostupniProPosadku.map(m => {
            const mid = m.ID || m.id
            const checked = Array.isArray(p.posadka) && p.posadka.includes(mid)
            return `
              <label style="display:flex;align-items:center;gap:8px;margin:0;font-weight:normal">
                <input type="checkbox" value="${escapeHtml(mid)}" ${checked ? "checked" : ""}
                  onchange="togglePosadkaMember(${idx}, '${escapeHtml(mid)}', this.checked)"
                  style="width:auto;margin:0">
                <span>${escapeHtml(m.NAME || m.name)}</span>
              </label>
            `
          }).join("")}
        </div>
      </div>
    </div>
  `
}

function toggleDopravaPosadky(value){
  const el = document.getElementById("dopravaPosadky")
  if(!el) return
  if(value === "Auta"){
    el.style.display = "block"
    el.innerHTML = renderPosadkyHtml()
  }else{
    el.style.display = "none"
  }
}

function addPosadka(){
  const posadky = getInitialPosadky()
  posadky.push({ nazev: "", ridic: "", posadka: [] })
  refreshPosadkyList()
}

function removePosadka(idx){
  const posadky = getInitialPosadky()
  posadky.splice(idx, 1)
  refreshPosadkyList()
}

function updatePosadkaField(idx, key, value){
  const posadky = getInitialPosadky()
  if(posadky[idx]) posadky[idx][key] = value
}

function togglePosadkaMember(idx, memberId, checked){
  const posadky = getInitialPosadky()
  if(!posadky[idx]) return
  if(!Array.isArray(posadky[idx].posadka)) posadky[idx].posadka = []

  if(checked){
    if(!posadky[idx].posadka.includes(memberId)) posadky[idx].posadka.push(memberId)
  }else{
    posadky[idx].posadka = posadky[idx].posadka.filter(id => id !== memberId)
  }

  refreshPosadkyList()
}

function refreshPosadkyList(){
  const wrap = document.getElementById("dopravaPosadky")
  if(wrap) wrap.innerHTML = renderPosadkyHtml()
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
    console.log("eventdetail data:", data)
    const event      = data.event      || {}
    const program    = data.program    || []
    const attendance = data.attendance || []


    // --- HLAVIČKA ---
    let html = `
     ${!isDesktop ? `<button onclick="renderEvents()" style="margin-bottom:16px">← Zpět</button>` : ""}
     <h2 style="margin-bottom:4px">${escapeHtml(event.NAME)}</h2>
     ${event.TEMPLATE_ID ? `<div style="font-size:11px;color:#8e8e93;margin-bottom:8px;letter-spacing:0.05em">OPAKUJÍCÍ SE AKCE</div>` : ""}

     <div class="card" style="margin-bottom:16px">

       <!-- Typ akce -->
       <div style="margin-bottom:12px">
         <span class="small" style="display:block;margin-bottom:2px">Typ akce</span>
         <b>${escapeHtml(event.TYPE) || "Zkouška"}</b>
       </div>

       <!-- Datum a čas -->
       <div style="margin-bottom:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.1)">
         <span class="small" style="display:block;margin-bottom:2px">Datum</span>
         <b>${formatDate(event.DATE)}${event.DATE_END ? " – " + formatDate(event.DATE_END) : ""}</b>
       </div>
       <div style="margin-bottom:12px">
         <span class="small" style="display:block;margin-bottom:2px">Čas</span>
         <b>${event.START ? formatTime(event.START) : "—"}${event.END ? " – " + formatTime(event.END) : ""}</b>
       </div>

       <!-- Místo -->
       <div style="margin-bottom:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.1)">
         <span class="small" style="display:block;margin-bottom:2px">Místo</span>
         <b>${escapeHtml(event.PLACE) || (event.CALL_URL ? "Online" : "—")}</b>
       </div>

       <!-- Navigovat / Připojit se -->
       ${(event.PLACE || event.CALL_URL) ? `
         <div class="btn-group" style="margin-bottom:12px">
           ${event.PLACE ? `
             <a href="https://maps.google.com/?q=${encodeURIComponent(event.PLACE)}" target="_blank"
               style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                 <circle cx="12" cy="9" r="2.5"/>
               </svg>
               Navigovat
             </a>
           ` : ""}
           ${event.CALL_URL ? `
             <a href="${escapeHtml(event.CALL_URL)}" target="_blank"
               style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
               </svg>
               Připojit se
             </a>
           ` : ""}
         </div>
       ` : ""}

       <!-- Poznámka -->
       ${event.NOTE ? `
         <div style="padding-top:12px;border-top:1px solid rgba(128,128,128,0.15)">
           <span class="small" style="display:block;margin-bottom:4px">Poznámka</span>
           <div style="font-size:15px;white-space:pre-wrap">${escapeHtml(event.NOTE)}</div>
         </div>
       ` : ""}

     </div>`

    // --- DALŠÍ INFORMACE ---
    if(event.SRAZ || event.OBLECENI || event.DOPRAVA || event.HARMONOGRAM || event.HOSPODA || event.SPACAKY || event.STRAVA || event.OBLECENI_S){
      html += `<div class="event-card" style="margin-bottom:16px">
        <div class="event-label">Další informace</div>
        ${event.SRAZ      ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Sraz</span><b>${escapeHtml(event.SRAZ)}</b></div>` : ""}
        ${event.OBLECENI  ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Dresscode</span><b>${escapeHtml(formatObleceni(event.OBLECENI))}</b></div>` : ""}
        ${event.DOPRAVA ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Doprava</span><b>${escapeHtml(event.DOPRAVA)}</b></div>` : ""}
        ${event.DOPRAVA === "Auta" && event.DOPRAVA_POSADKY ? renderPosadkyDetail(event.DOPRAVA_POSADKY) : ""}
        ${event.HARMONOGRAM_ITEMS ? renderHarmonogramDetail(event.HARMONOGRAM_ITEMS) : (event.HARMONOGRAM ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block;margin-bottom:4px">Harmonogram akce</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HARMONOGRAM)}</div></div>` : "")}
        ${event.IS_SPOLUPRACE && event.SPOLUPRACE_NAZEV ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Spolupráce</span><b>${escapeHtml(event.SPOLUPRACE_NAZEV)}</b></div>` : ""}
        ${event.HOSPODA   ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Hospoda</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HOSPODA)}</div></div>` : ""}
        ${event.SPACAKY   ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Bereme spacáky a karimatky?</span><b>${escapeHtml(event.SPACAKY)}</b></div>` : ""}
        ${event.STRAVA    ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Je tam zajištěná strava?</span><b>${escapeHtml(event.STRAVA)}${event.STRAVA_NOTA ? " — " + escapeHtml(event.STRAVA_NOTA) : ""}</b></div>` : ""}
        ${event.OBLECENI_S ? `<div style="padding:8px 0"><span class="small" style="display:block">Bereme koncertní oblečení?</span><b>${escapeHtml(event.OBLECENI_S)}${event.OBLECENI_S_TYP ? " — " + escapeHtml(formatObleceni(event.OBLECENI_S_TYP)) : ""}</b></div>` : ""}
      </div>`
    }

    // --- GRILOVAČKA ---
    if(event.IS_GRILOVACKA){
     console.log("IS_GRILOVACKA true, loading items...")
     const grilovackaItems = await api("getgrilovacka", {id})
     console.log("grilovackaItems:", grilovackaItems)
      html += `<div class="event-card" style="margin-bottom:16px">
        <div class="event-label">Co s sebou 🔥</div>
        ${grilovackaItems.length ? `
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 4px;border-bottom:2px solid rgba(128,128,128,0.15)">Co</th>
                <th style="text-align:left;padding:6px 4px;border-bottom:2px solid rgba(128,128,128,0.15)">Kdo přinese</th>
                <th style="text-align:left;padding:6px 4px;border-bottom:2px solid rgba(128,128,128,0.15)">Kdo si dá</th>
                <th style="padding:6px 4px;border-bottom:2px solid rgba(128,128,128,0.15)"></th>
              </tr>
            </thead>
            <tbody>
              ${grilovackaItems.map(item => `
                <tr>
                  <td style="padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.08)">${escapeHtml(item.CO)}</td>
                  <td style="padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.08)">${escapeHtml(item.KDO_PRINESE)}</td>
                  <td style="padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.08)">${escapeHtml(item.KDO_SI_DA)}</td>
                  <td style="padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.08)">
                    ${item.ADDED_BY === MEMBER_EMAIL || MEMBER_ROLE === "ADMIN" ? `
                      <button onclick="deleteGrilovackaItem('${item.ID}','${id}')" style="background:#fde8e8;color:#c00;padding:4px 8px;font-size:11px;width:auto">✕</button>
                    ` : ""}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<p class="notice" style="margin:0">Zatím nikdo nic nepřidal.</p>`}
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(128,128,128,0.1)">
          <button onclick="openGrilovackaModal('${id}')" style="width:100%">+ Přidat položku</button>
        </div>
      </div>`
    }

    // --- PROGRAM ---
    const mainProgram   = program.filter(p => !p.ENCORE)
    const encoreProgram = program.filter(p => p.ENCORE)

    if(mainProgram.length){
      html += `<div class="event-card" style="margin-bottom:16px">
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
      html += `<div class="event-card" style="margin-bottom:16px">
        <div class="event-label">Program</div>
        <p class="notice" style="margin:0">Program není k dispozici</p>
        ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
            <button onclick="openProgramEditor('${id}')" style="width:100%">Vytvořit program</button>
          </div>
        ` : ""}
      </div>`
    }

   // --- TO-DO LIST (rider) ---
    if((MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") && event.RIDER){
      let riderData = {}
      try{ riderData = JSON.parse(event.RIDER) }catch(e){ riderData = {} }

      const todoPred = riderData.todo_pred || []
      const todoDen  = riderData.todo_den  || []

      if(todoPred.length || todoDen.length){
        html += `<div class="event-card" style="margin-bottom:16px">
          <div class="event-label">To-do list</div>
          ${todoPred.length ? `
            <div style="margin-bottom:12px">
              <span class="small" style="font-weight:600;display:block;margin-bottom:6px">Před koncertem</span>
              ${todoPred.map((t, idx) => `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.08)">
                  <input type="checkbox" ${t.done ? "checked" : ""} onchange="event.stopPropagation();toggleRiderTodoDetail('${id}','todo_pred',${idx},this.checked)" style="width:auto;margin-top:3px">
                  <div style="flex:1">
                    <div style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${escapeHtml(t.co)}</div>
                    ${t.kdo ? `<div class="small">${escapeHtml(t.kdo)}${t.poznamka ? ' · ' + escapeHtml(t.poznamka) : ''}</div>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}
          ${todoDen.length ? `
            <div>
              <span class="small" style="font-weight:600;display:block;margin-bottom:6px">V den koncertu</span>
              ${todoDen.map((t, idx) => `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.08)">
                  <input type="checkbox" ${t.done ? "checked" : ""} onchange="event.stopPropagation();toggleRiderTodoDetail('${id}','todo_den',${idx},this.checked)" style="width:auto;margin-top:3px">
                  <div style="flex:1">
                    <div style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${escapeHtml(t.co)}</div>
                    ${t.kdo ? `<div class="small">${escapeHtml(t.kdo)}${t.poznamka ? ' · ' + escapeHtml(t.poznamka) : ''}</div>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>`
      }
    }

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

    html += `<div class="event-card" style="margin-bottom:16px">
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

function openGrilovackaModal(akceId){
  openFormModal("Co vezmeš s sebou? 🔥", [
    {key: "gCo",         label: "Co s sebou",    type: "text", placeholder: "např. Hermelíny na grilování"},
    {key: "gKdoPrinese", label: "Kdo to přinese",  type: "text", placeholder: MEMBER_NAME || "Tvoje jméno"},
    {key: "gKdoSiDa",    label: "Kdo si to dá", type: "text", placeholder: "např. Všichni"}
  ], async (vals) => {
    await api("addgrilovacka", {
      akce_id:     akceId,
      co:          vals.gCo,
      kdo_prinese: vals.gKdoPrinese || MEMBER_NAME,
      kdo_si_da:   vals.gKdoSiDa,
      added_by:    MEMBER_EMAIL
    })
    invalidateCache("eventdetail", akceId)
    closeFormModal()
    openEvent(akceId)
  })
}

async function deleteGrilovackaItem(itemId, akceId){
  if(!confirm("Smazat tuto položku?")) return
  await api("deletegrilovacka", {id: itemId, akce_id: akceId})
  invalidateCache("eventdetail", akceId)
  openEvent(akceId)
}

async function toggleRiderTodoDetail(akceId, fazeKey, idx, done){
  try{
    await api("toggleridertodoo", {id: akceId, faze: fazeKey, idx, done})
    invalidateCache("eventdetail", akceId)
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

window.toggleRiderTodoDetail = toggleRiderTodoDetail

window.openGrilovackaModal  = openGrilovackaModal
window.deleteGrilovackaItem = deleteGrilovackaItem

function openDeleteEventModal(id){
  const cached    = lsGet("detail_" + id)
  const thisEvent = cached?.event || {}
  const isSeries  = !!(thisEvent?.TEMPLATE_ID)

  if(!isSeries){
    confirmModal("Opravdu smazat tuto akci? Bude odstraněna z 10base i z Google kalendáře.", async () => {

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
    <button onclick="closeProgramEditorModal()">Zrušit</button>
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

async function saveEvent(id, notify = true){

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
  const sraz            = document.getElementById("fSraz")?.value          ?? window.EDIT_EVENT?.SRAZ           ?? ""
  const obleceni        = document.getElementById("fObleceni")?.value      ?? window.EDIT_EVENT?.OBLECENI       ?? ""
  const doprava         = document.getElementById("fDoprava")?.value       ?? window.EDIT_EVENT?.DOPRAVA        ?? ""
  const dopravaPosadky  = doprava === "Auta" 
  ? JSON.stringify(window.EDIT_POSADKY || [])
  : ""
  const hospoda         = document.getElementById("fHospoda")?.value       ?? window.EDIT_EVENT?.HOSPODA        ?? ""
  const harmonogram     = document.getElementById("fHarmonogram")?.value   ?? window.EDIT_EVENT?.HARMONOGRAM    ?? ""
  const spacaky         = document.getElementById("fSpacaky")?.value       ?? window.EDIT_EVENT?.SPACAKY        ?? ""
  const strava          = document.getElementById("fStrava")?.value        ?? window.EDIT_EVENT?.STRAVA         ?? ""
  const stravaNota      = document.getElementById("fStravaNota")?.value    ?? window.EDIT_EVENT?.STRAVA_NOTA    ?? ""
  const obleceniS       = document.getElementById("fObleceniSoustredeni")?.value    ?? window.EDIT_EVENT?.OBLECENI_S     ?? ""
  const obleceniSTyp    = document.getElementById("fObleceniSoustredeniTyp")?.value ?? window.EDIT_EVENT?.OBLECENI_S_TYP ?? ""
  const isGrilovacka    = document.getElementById("fIsGrilovacka")?.checked ?? window.EDIT_EVENT?.IS_GRILOVACKA ?? false
  const isSpolupraceVal = document.getElementById("fIsSpoluprace")?.checked ?? window.EDIT_EVENT?.IS_SPOLUPRACE ?? false
  const spolupraceNazev = document.getElementById("fSpolupraceNazev")?.value ?? window.EDIT_EVENT?.SPOLUPRACE_NAZEV ?? ""
  const harmonogramItems = JSON.stringify(window.EDIT_HARMONOGRAM || [])
  const riderJson        = JSON.stringify(window.EDIT_RIDER || {})


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
        sraz, obleceni, doprava, doprava_posadky: dopravaPosadky, hospoda, harmonogram,
        harmonogram_items: harmonogramItems, is_spoluprace: isSpolupraceVal, spoluprace_nazev: spolupraceNazev, rider: riderJson,
        spacaky, strava, strava_nota: stravaNota,
        obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp,
        silent: !notify
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
        await api("deleteevent", {id, silent: !notify})

      }else{
        await api("updateevent", {id, name, date, date_end: dateEnd, start, end, place, note, type, status, requires_program: requiresProgram, call_url: callUrl,
          sraz, obleceni, doprava, doprava_posadky: dopravaPosadky, hospoda, harmonogram,
          harmonogram_items: harmonogramItems, is_spoluprace: isSpolupraceVal, spoluprace_nazev: spolupraceNazev, rider: riderJson,
          spacaky, strava, strava_nota: stravaNota,
          obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp,
          is_grilovacka: isGrilovacka,
          silent: !notify
        })
      }
      invalidateCache("events")
      invalidateCache("eventdetail", id)
      closeEventFormModal()
      hideSaving("Akce upravena ✓")
      openEvent(id)
    }else{
      await api("addevent", {name, date, date_end: dateEnd, start, end, place, note, type, status, requires_program: requiresProgram, call_url: callUrl,
        sraz, obleceni, doprava, doprava_posadky: dopravaPosadky, hospoda, harmonogram,
        harmonogram_items: harmonogramItems, is_spoluprace: isSpolupraceVal, spoluprace_nazev: spolupraceNazev, rider: riderJson,
        spacaky, strava, strava_nota: stravaNota,
        obleceni_s: obleceniS, obleceni_s_typ: obleceniSTyp,
        is_grilovacka: isGrilovacka,
        silent: !notify
      })
      invalidateCache("events")
      closeEventFormModal()
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
    const config = await api("getconfig")

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
     }

          // --- PLATEBNÍ ÚDAJE ---
             const account      = config?.payment_account      ? String(config.payment_account).trim()      : ""
             const iban         = config?.payment_iban          ? String(config.payment_iban).trim()          : ""
             const instructions = config?.payment_instructions  ? String(config.payment_instructions).trim()  : ""
             const qrUrl        = config?.payment_qr_url        ? String(config.payment_qr_url).trim()        : ""
         
             if(account || instructions || qrUrl){
               html += `<div class="card" style="margin-top:8px">
                 <div class="small" style="font-weight:600;margin-bottom:6px">Jak zaplatit</div>
                 ${instructions ? `<div class="small" style="margin-bottom:8px;line-height:1.5">${escapeHtml(instructions)}</div>` : ""}
                 ${account ? `<div class="small" style="margin-bottom:4px">Číslo účtu: <b>${escapeHtml(account)}</b></div>` : ""}
                 ${iban ? `<div class="small" style="margin-bottom:4px">IBAN: <b>${escapeHtml(iban)}</b></div>` : ""}
                 ${qrUrl ? `<div style="margin-top:12px;text-align:center"><img src="${escapeHtml(qrUrl)}" style="width:180px;height:180px;border-radius:8px" onerror="this.style.display='none'"></div>` : ""}
               </div>`
             }

    html += `<div class="card" style="margin-top:8px">
     <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('span:last-child').textContent=this.nextElementSibling.style.display==='block'?'‹':'›'">
       <span style="font-weight:600;font-size:14px">Proplacení výdajů a paliva</span>
       <span style="color:var(--muted)">›</span>
     </div>
     <div style="display:none;margin-top:10px">
       <p class="small" style="margin-bottom:12px;line-height:1.5">Pokud jsi 10menům platil něco z vlastní kapsy, nebo jsi kvůli akci 10men jel svým autem, můžeš si tyto výdaje nechat proplatit. Stáhni si příslušnou tabulku, vyplň ji a pošli ji Zdendovi. Pokud se jedná o běžný výdaj, pošli vyplněnou tabulku spolu s oskenovanou účtenkou (nebo dej originál Zdendovi). U cesťáku není účtenka potřeba, výdaj se spočítá na základě ujeté vzdálenosti a průměrné spotřeby paliva uvedené v techničáku tvého auta.</p>
       <div style="display:flex;gap:8px">
         <a href="https://docs.google.com/spreadsheets/d/1cp9n0VUQfyGpgBRmVp7YeYXKI6zC3HQ5/export?format=xlsx" target="_blank"
           style="flex:1;display:flex;align-items:center;justify-content:center;padding:6px 14px;min-height:36px;background:#e8f0fe;color:#007aff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;text-align:center">
           💸 Chci proplatit výdaje
         </a>
         <a href="https://docs.google.com/spreadsheets/d/1s_Yb04Wm6eH0yYex2gwVQZXg4Dec2kfG/export?format=xlsx" target="_blank"
           style="flex:1;display:flex;align-items:center;justify-content:center;padding:6px 14px;min-height:36px;background:#e8f0fe;color:#007aff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;text-align:center">
           ⛽ Chci proplatit palivo
         </a>
       </div>
     </div>
   </div>`

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
    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
    html += `<h2 style="margin:0 0 16px">Zkušebna</h2>`

    // --- PODZÁLOŽKY ---
    html += `<div class="btn-group" style="margin-bottom:16px">
      <button onclick="setZkusebnaTab('repertoar')" style="${ZKUSEBNA_TAB === 'repertoar' ? 'background:#007aff;color:#fff' : ''}">Repertoár</button>
      <button onclick="setZkusebnaTab('klavesy')" style="${ZKUSEBNA_TAB === 'klavesy' ? 'background:#007aff;color:#fff' : ''}">Klávesy</button>
      <button onclick="setZkusebnaTab('cvt')" style="${ZKUSEBNA_TAB === 'cvt' ? 'background:#007aff;color:#fff' : ''}">CVT</button>
    </div>`

   if(ZKUSEBNA_TAB === "klavesy"){
      html += renderKlavesyTab()
      if(isDesktop) html += `</div>`
      container().innerHTML = html
      restoreScroll(scroll)
      return
    }

    if(ZKUSEBNA_TAB === "cvt"){
      html += renderCvtTab()
      if(isDesktop) html += `</div>`
      container().innerHTML = html
      restoreScroll(scroll)
      return
    }

    // --- REPERTOÁR (původní obsah) ---
    const data      = await cachedApi("repertoar")
    const favorites = MEMBER_EMAIL ? await api("favorites", {email: MEMBER_EMAIL}) : {}

    if(!Array.isArray(data) || !data.length){
      html += `<div class="card">Žádné skladby</div>`
      if(isDesktop) html += `</div>`
      container().innerHTML = html
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

 // =============================================
   // KLÁVESY — část 1: základní klaviatura + zvuk
   // =============================================
   
   let KLAVESY_OCTAVE = 4 // C4 = střední C
   let KLAVESY_AUDIO_CTX = null
   
   const KLAVESY_NOTES = [
     { note: "C",  white: true,  offset: 0 },
     { note: "C#", white: false, offset: 1 },
     { note: "D",  white: true,  offset: 2 },
     { note: "D#", white: false, offset: 3 },
     { note: "E",  white: true,  offset: 4 },
     { note: "F",  white: true,  offset: 5 },
     { note: "F#", white: false, offset: 6 },
     { note: "G",  white: true,  offset: 7 },
     { note: "G#", white: false, offset: 8 },
     { note: "A",  white: true,  offset: 9 },
     { note: "A#", white: false, offset: 10 },
     { note: "B",  white: true,  offset: 11 },
   ]
   
   // Frekvence noty podle MIDI-like vzorce: A4 = 440Hz
   function noteFrequency(octave, semitoneOffset){
     // C4 = MIDI 60. A4 = MIDI 69 = 440Hz
     const midi = (octave + 1) * 12 + semitoneOffset
     return 440 * Math.pow(2, (midi - 69) / 12)
   }
   
   function getAudioCtx(){
     if(!KLAVESY_AUDIO_CTX){
       KLAVESY_AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)()
     }
     if(KLAVESY_AUDIO_CTX.state === "suspended"){
       KLAVESY_AUDIO_CTX.resume()
     }
     return KLAVESY_AUDIO_CTX
   }
   
   function playNote(frequency){
     const ctx = getAudioCtx()
     const now = ctx.currentTime
   
     // Harmonické složky a jejich relativní hlasitosti (napodobuje spektrum klavíru)
     const harmonics = [
       { mult: 1,    gain: 0.35 },  // základní tón
       { mult: 2,    gain: 0.18 },  // 1. harmonická (oktáva)
       { mult: 3,    gain: 0.08 },  // 2. harmonická
       { mult: 4,    gain: 0.05 },  // 3. harmonická
       { mult: 5,    gain: 0.02 },  // 4. harmonická
     ]
   
     const masterGain = ctx.createGain()
     masterGain.connect(ctx.destination)
   
     // ADSR-like envelope pro celkovou hlasitost
     masterGain.gain.setValueAtTime(0, now)
     masterGain.gain.linearRampToValueAtTime(1, now + 0.02)        // attack — 
     masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.15)  // decay — rychlý pokles
     masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2) // release — dlouhý dozvuk
   
     harmonics.forEach(h => {
       const osc  = ctx.createOscillator()
       const gain = ctx.createGain()
   
       osc.type = "sine"
       osc.frequency.value = frequency * h.mult
   
       gain.gain.value = h.gain
   
       osc.connect(gain)
       gain.connect(masterGain)
   
       osc.start(now)
       osc.stop(now + 2.3)
     })
   }
   
   // =============================================
   // VYKRESLENÍ KLAVIATURY (2 oktávy)
   // =============================================
   function renderKlavesyTab(){
     return `
       <div class="card" style="padding:24px;text-align:center">
         <p style="margin-bottom:16px">Klávesy se otevřou v celoobrazovkovém režimu.</p>
         <button onclick="openKlavesyOverlay()">🎹 Otevřít klávesy</button>
       </div>
     `
   }
   
   function renderPianoKeys(){
     // 2 oktávy = 24 bílých+černých kláves, ale bílých je 14 (7 na oktávu)
     const whiteKeys = []
     const blackKeys = []
   
     for(let oct = 0; oct < 2; oct++){
       KLAVESY_NOTES.forEach(n => {
         const octave = KLAVESY_OCTAVE + oct
         const freq = noteFrequency(octave, n.offset)
         if(n.white){
           whiteKeys.push({ note: n.note, octave, freq })
         }
       })
     }
   
     const whiteWidth = 100 / whiteKeys.length
   
     let html = ""
   
     // bílé klávesy
     whiteKeys.forEach((k, i) => {
       html += `
         <div class="piano-key-white"
           style="position:absolute;left:${i * whiteWidth}%;width:${whiteWidth}%;height:100%;background:#fff;border:1px solid #999;border-radius:0 0 6px 6px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;font-size:11px;color:#888;cursor:pointer;user-select:none"
           data-freq="${k.freq}"
           ontouchstart="klavesyKeyDown(this, event)"
           ontouchend="klavesyKeyUp(this, event)"
           onmousedown="klavesyKeyDown(this, event)"
           onmouseup="klavesyKeyUp(this, event)"
           onmouseleave="klavesyKeyUp(this, event)"

         >${k.note}${k.octave}</div>
       `
     })
   
     // černé klávesy — pozicujeme mezi bílé
     let whiteIndex = 0
     for(let oct = 0; oct < 2; oct++){
       KLAVESY_NOTES.forEach(n => {
         if(n.white){
           whiteIndex++
         }else{
           const octave = KLAVESY_OCTAVE + oct
           const freq = noteFrequency(octave, n.offset)
           const leftPct = whiteIndex * whiteWidth - (whiteWidth * 0.3)
           html += `
             <div class="piano-key-black"
               style="position:absolute;left:${leftPct}%;width:${whiteWidth * 0.6}%;height:60%;background:#1a1a1a;border-radius:0 0 4px 4px;z-index:2;cursor:pointer;user-select:none"
               data-freq="${freq}"
               ontouchstart="klavesyKeyDown(this, event)"
               ontouchend="klavesyKeyUp(this, event)"
               onmousedown="klavesyKeyDown(this, event)"
               onmouseup="klavesyKeyUp(this, event)"
               onmouseleave="klavesyKeyUp(this, event)"
             ></div>
           `
         }
       })
     }
   
     return html
   }
   
   function klavesyKeyDown(el, event){
     if(event) event.preventDefault()
     const freq = parseFloat(el.dataset.freq)
     playNote(freq)
     el.style.background = el.classList.contains("piano-key-black") ? "#444" : "#ddd"
   }
   
   function klavesyKeyUp(el, event){
     if(event) event.preventDefault()
     el.style.background = el.classList.contains("piano-key-black") ? "#1a1a1a" : "#fff"
   }

   function klavesyShiftOctave(dir){
     KLAVESY_OCTAVE = Math.max(0, Math.min(7, KLAVESY_OCTAVE + dir))
     renderKlavesyOverlay()
   }
   
   window.klavesyKeyDown    = klavesyKeyDown
   window.klavesyKeyUp      = klavesyKeyUp
   window.klavesyShiftOctave = klavesyShiftOctave

/* =============================================
   KLÁVESY — FULLSCREEN OVERLAY
============================================= */

function openKlavesyOverlay(){
  let overlay = document.getElementById("klavesyOverlay")
  if(!overlay){
    overlay = document.createElement("div")
    overlay.id = "klavesyOverlay"
    document.body.appendChild(overlay)
  }
  overlay.classList.remove("hidden")
  renderKlavesyOverlay()
}

function closeKlavesyOverlay(){
  metronomStop()
  const overlay = document.getElementById("klavesyOverlay")
  if(overlay) overlay.classList.add("hidden")
}

function renderKlavesyOverlay(){
  const overlay = document.getElementById("klavesyOverlay")
  if(!overlay) return

  overlay.innerHTML = `
    <div id="klavesyRotateWrap">
      <div id="klavesyTopBar">
        <button onclick="closeKlavesyOverlay()" class="klavesy-btn">✕</button>
        ${renderMetronom()}
        <div class="btn-group" style="width:auto">
          <button onclick="klavesyToggleMode('klaviatura')" class="klavesy-btn ${KLAVESY_MODE === 'klaviatura' ? 'active' : ''}">Klaviatura</button>
          <button onclick="klavesyToggleMode('akordy')" class="klavesy-btn ${KLAVESY_MODE === 'akordy' ? 'active' : ''}">Akordy</button>
        </div>
      </div>
      <div id="klavesyMainArea">
        ${KLAVESY_MODE === 'akordy' ? renderAkordyTab() : `
          <div id="klavesyOctaveBar">
            <button onclick="klavesyShiftOctave(-1)" class="klavesy-btn">‹</button>
            <span class="small">Oktáva: C${KLAVESY_OCTAVE} – C${KLAVESY_OCTAVE+2}</span>
            <button onclick="klavesyShiftOctave(1)" class="klavesy-btn">›</button>
          </div>
          <div id="klavesyKeyboard">
            ${renderPianoKeys()}
          </div>
        `}
      </div>
    </div>
  `
}

window.openKlavesyOverlay  = openKlavesyOverlay
window.closeKlavesyOverlay = closeKlavesyOverlay

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

// =============================================
// METRONOM
// =============================================

let METRONOM_BPM = 100
let METRONOM_PLAYING = false
let METRONOM_INTERVAL = null

function metronomTick(accent){
  const ctx = getAudioCtx()
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = "square"
  osc.frequency.value = accent ? 1500 : 1000

  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.05)
}

function metronomToggle(){
  if(METRONOM_PLAYING){
    metronomStop()
  }else{
    metronomStart()
  }
}

function metronomStart(){
  METRONOM_PLAYING = true
  let beatCount = 0
  const intervalMs = 60000 / METRONOM_BPM

  metronomTick(true) // první beat hned

  METRONOM_INTERVAL = setInterval(() => {
    beatCount = (beatCount + 1) % 4
    metronomTick(beatCount === 0)
  }, intervalMs)

  updateMetronomButton()
}

function metronomStop(){
  METRONOM_PLAYING = false
  if(METRONOM_INTERVAL){
    clearInterval(METRONOM_INTERVAL)
    METRONOM_INTERVAL = null
  }
  updateMetronomButton()
}

function metronomSetBpm(value){
  METRONOM_BPM = parseInt(value)
  const label = document.getElementById("metronomBpmLabel")
  if(label) label.textContent = METRONOM_BPM + " BPM"

  // pokud běží, restartuj s novým tempem
  if(METRONOM_PLAYING){
    metronomStop()
    metronomStart()
  }
}

function updateMetronomButton(){
  const btn = document.getElementById("metronomToggleBtn")
  if(!btn) return
  btn.textContent = METRONOM_PLAYING ? "⏹ Stop" : "▶ Metronom"
  btn.style.background = METRONOM_PLAYING ? "#ff3b30" : ""
  btn.style.color = METRONOM_PLAYING ? "#fff" : ""
}

function renderMetronom(){
  return `
    <div style="display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap">
      <button id="metronomToggleBtn" onclick="metronomToggle()" style="width:auto;padding:8px 16px">▶ Metronom</button>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="range" min="40" max="208" value="${METRONOM_BPM}" oninput="metronomSetBpm(this.value)" style="width:120px">
        <span id="metronomBpmLabel" class="small" style="min-width:60px;text-align:right">${METRONOM_BPM} BPM</span>
      </div>
    </div>
  `
}

window.metronomToggle = metronomToggle
window.metronomSetBpm = metronomSetBpm

// =============================================
// AKORDY
// =============================================

let KLAVESY_MODE = "klaviatura" // "klaviatura" | "akordy"
let AKORD_ROOT = "C"  // tónina
let AKORD_MODE = "dur" // "dur" | "moll"

// pořadí not chromaticky od C
const CHROMATIC_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

// Český zápis pro zobrazení (H místo B)
const NOTE_DISPLAY = {
  "C":"C", "C#":"C♯/D♭", "D":"D", "D#":"D♯/E♭", "E":"E", "F":"F",
  "F#":"F♯/G♭", "G":"G", "G#":"G♯/A♭", "A":"A", "A#":"A♯/H♭", "B":"H"
}

function noteIndex(note){
  return CHROMATIC_NOTES.indexOf(note)
}

// Diatonické stupně durové/mollové stupnice (v půltónech od tóniky)
const SCALE_STEPS = {
  dur:  [0, 2, 4, 5, 7, 9, 11],
  moll: [0, 2, 3, 5, 7, 8, 10]
}

// Kvalita akordu pro každý stupeň
const CHORD_QUALITY_DUR  = ["maj","min","min","maj","maj","min","dim"]
const CHORD_QUALITY_MOLL = ["min","dim","maj","min","min","maj","maj"]

// Intervaly v půltónech pro typ akordu (tercie + kvinta)
const CHORD_INTERVALS = {
  maj: [0,4,7],
  min: [0,3,7],
  dim: [0,3,6]
}

const CHORD_LABEL = {
  maj: "",
  min: "m",
  dim: "dim"
}

function generateScaleChords(){
  const rootIdx = noteIndex(AKORD_ROOT)
  const steps = SCALE_STEPS[AKORD_MODE]
  const qualities = AKORD_MODE === "dur" ? CHORD_QUALITY_DUR : CHORD_QUALITY_MOLL
  const roman = AKORD_MODE === "dur"
    ? ["I","ii","iii","IV","V","vi","vii°"]
    : ["i","ii°","III","iv","v","VI","VII"]

  return steps.map((step, idx) => {
    const noteIdx = (rootIdx + step) % 12
    const noteName = CHROMATIC_NOTES[noteIdx]
    const quality = qualities[idx]
    return {
      roman: roman[idx],
      root: noteName,
      quality,
      label: NOTE_DISPLAY[noteName] + CHORD_LABEL[quality]
    }
  })
}

// Zahraje akord
function playChord(rootNote, quality){
  const rootIdx = noteIndex(rootNote)
  const intervals = CHORD_INTERVALS[quality]

  intervals.forEach(interval => {
    const semitone = (rootIdx + interval) % 12
    const octaveShift = Math.floor((rootIdx + interval) / 12)
    const freq = noteFrequency(KLAVESY_OCTAVE + octaveShift, semitone)
    playNote(freq)
  })
}

function renderAkordyTab(){
  const chords = generateScaleChords()

  return `
    <div style="margin-bottom:16px">
      <div class="small" style="font-weight:600;margin-bottom:6px;text-align:center">Tónina</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px">
        ${CHROMATIC_NOTES.map(n => `
          <button onclick="setAkordRoot('${n}')" style="width:auto;padding:8px 12px;font-size:13px;${AKORD_ROOT === n ? 'background:#007aff;color:#fff' : ''}">
            ${NOTE_DISPLAY[n]}
          </button>
        `).join("")}
      </div>
      <div style="display:flex;gap:6px;justify-content:center">
        <button onclick="setAkordMode('dur')" style="width:auto;padding:8px 16px;${AKORD_MODE === 'dur' ? 'background:#007aff;color:#fff' : ''}">Dur</button>
        <button onclick="setAkordMode('moll')" style="width:auto;padding:8px 16px;${AKORD_MODE === 'moll' ? 'background:#007aff;color:#fff' : ''}">Moll</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(70px, 1fr));gap:10px">
      ${chords.map(c => `
        <button
          class="akord-pad"
          style="aspect-ratio:1;background:#2c2c2e;color:#fff;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:none;cursor:pointer;font-size:18px;font-weight:600;user-select:none"
          onmousedown="akordPadDown(this,'${c.root}','${c.quality}')"
          onmouseup="akordPadUp(this)"
          onmouseleave="akordPadUp(this)"
          ontouchstart="akordPadDown(this,'${c.root}','${c.quality}',event)"
          ontouchend="akordPadUp(this,event)"
        >
          <span>${c.label}</span>
          <span style="font-size:11px;font-weight:400;color:#999">${c.roman}</span>
        </button>
      `).join("")}
    </div>
  `
}

function setAkordRoot(note){
  AKORD_ROOT = note
  renderKlavesyOverlay()
}

function setAkordMode(mode){
  AKORD_MODE = mode
  renderKlavesyOverlay()
}

function akordPadDown(el, root, quality, event){
  if(event) event.preventDefault()
  playChord(root, quality)
  el.style.background = "#007aff"
}

function akordPadUp(el, event){
  if(event) event.preventDefault()
  el.style.background = "#2c2c2e"
}

function klavesyToggleMode(mode){
  KLAVESY_MODE = mode
  renderKlavesyOverlay()
}

window.setAkordRoot      = setAkordRoot
window.setAkordMode      = setAkordMode
window.akordPadDown      = akordPadDown
window.akordPadUp        = akordPadUp
window.klavesyToggleMode = klavesyToggleMode

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

function setZkusebnaTab(tab){
  ZKUSEBNA_TAB = tab
  renderRepertoar()
}

// =============================================
// CVT PRŮVODCE — rozšířená verze
// Nahraď CVT_CONTENT a renderCvtTab (a CVT_SECTION_OPEN)
// =============================================

let CVT_SECTION_OPEN = null

// --- SVG diagramy ---

// =============================================
// CVT PRŮVODCE — verze 3, rozšířená podle CVI
// Nahraď CVT_CONTENT a renderCvtTab (CVT_SECTION_OPEN zůstává)
// =============================================

// --- SVG diagramy ---

function svgLarynxPosition(){
  return `
    <svg viewBox="0 0 200 100" width="100%" height="auto" style="max-width:280px;display:block;margin:8px auto">
      <g>
        <line x1="40" y1="20" x2="40" y2="80" stroke="#999" stroke-width="2"/>
        <circle cx="40" cy="60" r="10" fill="#007aff" opacity="0.7"/>
        <text x="40" y="95" text-anchor="middle" font-size="10" fill="currentColor">Nízký hrtan</text>
        <text x="40" y="15" text-anchor="middle" font-size="9" fill="#999">(Neutral, Curbing)</text>
      </g>
      <g>
        <line x1="160" y1="20" x2="160" y2="80" stroke="#999" stroke-width="2"/>
        <circle cx="160" cy="35" r="10" fill="#ff9f0a" opacity="0.7"/>
        <text x="160" y="95" text-anchor="middle" font-size="10" fill="currentColor">Vysoký hrtan</text>
        <text x="160" y="15" text-anchor="middle" font-size="9" fill="#999">(Overdrive, Edge)</text>
      </g>
    </svg>
  `
}

function svgBreathSupport(){
  return `
    <svg viewBox="0 0 200 120" width="100%" height="auto" style="max-width:240px;display:block;margin:8px auto">
      <ellipse cx="100" cy="40" rx="25" ry="30" fill="none" stroke="#999" stroke-width="2"/>
      <path d="M 60 70 Q 100 55 140 70" fill="none" stroke="#ff3b30" stroke-width="2" stroke-dasharray="4 2"/>
      <text x="100" y="50" text-anchor="middle" font-size="9" fill="#999">plíce</text>
      <path d="M 60 85 Q 100 75 140 85" fill="none" stroke="#34c759" stroke-width="3"/>
      <text x="155" y="88" font-size="9" fill="#34c759">nádech</text>
      <text x="148" y="68" font-size="9" fill="#ff3b30">výdech</text>
      <line x1="100" y1="62" x2="100" y2="80" stroke="#34c759" stroke-width="2" marker-end="url(#arrowGreen)"/>
      <defs>
        <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#34c759"/>
        </marker>
      </defs>
      <text x="100" y="110" text-anchor="middle" font-size="10" fill="currentColor">Bránice klesá při nádechu, brání se výdechu</text>
    </svg>
  `
}

function svgRegisters(){
  return `
    <svg viewBox="0 0 200 120" width="100%" height="auto" style="max-width:240px;display:block;margin:8px auto">
      <rect x="30" y="20" width="20" height="80" fill="#34c759" opacity="0.3" rx="4"/>
      <text x="40" y="110" text-anchor="middle" font-size="9" fill="currentColor">Chest</text>
      <text x="40" y="15" text-anchor="middle" font-size="9" fill="#999">nízké tóny</text>

      <rect x="90" y="20" width="20" height="80" fill="#007aff" opacity="0.3" rx="4"/>
      <text x="100" y="110" text-anchor="middle" font-size="9" fill="currentColor">Mix</text>
      <text x="100" y="15" text-anchor="middle" font-size="9" fill="#999">přechod</text>

      <rect x="150" y="20" width="20" height="80" fill="#ff9f0a" opacity="0.3" rx="4"/>
      <text x="160" y="110" text-anchor="middle" font-size="9" fill="currentColor">Head</text>
      <text x="160" y="15" text-anchor="middle" font-size="9" fill="#999">vysoké tóny</text>

      <path d="M 30 60 Q 60 60 90 60 Q 120 60 170 60" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/>
    </svg>
  `
}

function svgTwang(){
  return `
    <svg viewBox="0 0 200 100" width="100%" height="auto" style="max-width:240px;display:block;margin:8px auto">
      <!-- nálevka -->
      <path d="M 60 20 L 140 20 L 110 80 L 90 80 Z" fill="none" stroke="#999" stroke-width="2"/>
      <text x="100" y="15" text-anchor="middle" font-size="9" fill="#999">epiglottický nálevkovitý prostor</text>

      <!-- zúžená verze -->
      <path d="M 70 20 L 130 20 L 102 70 L 98 70 Z" fill="#007aff" opacity="0.25"/>
      <text x="100" y="95" text-anchor="middle" font-size="10" fill="currentColor">Zúžením vzniká "twang" — jasnější, nosnější zvuk</text>
    </svg>
  `
}

function svgJawPosition(){
  return `
    <svg viewBox="0 0 200 100" width="100%" height="auto" style="max-width:240px;display:block;margin:8px auto">
      <!-- špatně - vysunutá čelist -->
      <g>
        <path d="M 30 30 Q 50 30 60 50 L 75 50 Q 60 60 50 75 Q 35 65 30 30 Z" fill="none" stroke="#ff3b30" stroke-width="2"/>
        <text x="50" y="92" text-anchor="middle" font-size="9" fill="#ff3b30">Vysunutá čelist ✗</text>
      </g>
      <!-- správně - zasunutá čelist -->
      <g>
        <path d="M 130 30 Q 150 30 155 50 L 165 50 Q 155 65 145 78 Q 130 70 130 30 Z" fill="none" stroke="#34c759" stroke-width="2"/>
        <text x="150" y="92" text-anchor="middle" font-size="9" fill="#34c759">Zasunutá čelist ✓</text>
      </g>
    </svg>
  `
}

const CVT_CONTENT = [
  {
    id: "philosophy",
    title: "🌱 Filosofie CVT",
    intro: null,
    items: [
      {
        name: "Zpívání není těžké",
        desc: "Hlas je nástroj, který má každý a denně ho používá. Hlas obvykle funguje perfektně, dokud ho v dětství nezačneme omezovat různými druhy napětí. Práce na technice je většinou o odstraňování tohoto napětí, aby hlas mohl fungovat volně.",
        howto: "Co z toho plyne: Pokud něco nezní dobře, nejde primárně o to \"přidat\" nějakou novou dovednost, ale často o to uvolnit nadbytečné napětí, které tam nemusí být."
      },
      {
        name: "Technika je prostředek, ne cíl",
        desc: "Nejdůležitější je vyjádření a sdělení — technika je pouze nástroj, jak toho dosáhnout. Co a jak chcete sdělit, je vždy umělecké rozhodnutí každého zpěváka.",
        howto: "Co z toho plyne: Při zkoušce nezapomínejte na emoci a smysl textu — technika má sloužit hudbě, ne naopak."
      },
      {
        name: "Funguje to hned, nebo to není správně",
        desc: "Pokud technika funguje správně, měla by mít okamžitý efekt. Pokud cvičení po více pokusech nepřináší žádné zlepšení nebo je nepříjemné, je pravděpodobně dělané špatně.",
        howto: "Co z toho plyne: Pokud něco bolí, je nepříjemné nebo \"nezní správně\" — věřte svému pocitu. Vaše tělo vám dává zpětnou vazbu, kterou nikdo jiný necítí."
      }
    ]
  },
  {
    id: "principles",
    title: "⚓ Tři základní principy",
    intro: "Tyto tři principy platí vždy, bez ohledu na to, v jakém módu, barvě zvuku nebo efektu zpíváte. Jsou základem zdravé techniky.",
    diagram: svgBreathSupport,
    items: [
      {
        name: "1. Opora dechu (Support)",
        desc: "Pro zpěv potřebujete dvě věci: proud vzduchu, který rozkmitá hlasivky, a tlak vzduchu pod hlasivkami, který dodá tónu objem a kontrolu. Opora znamená záměrně zpomalovat a prodlužovat výdech — pracovat proti přirozenému nutkání bránice rychle vypustit nadechnutý vzduch.",
        howto: "Jak na to: Při nádechu se mírně rozšíří pas a spodní žebra. Při zpěvu se snažte tento \"rozšířený\" pocit udržet co nejdéle — jako byste \"drželi\" nádech, zatímco zpíváte. Oporu šetřete na těžká místa (vysoké tóny, konce frází), nepoužívejte ji zbytečně brzy."
      },
      {
        name: "2. Nezbytný twang",
        desc: "Nad hlasivkami je prostor tvořící \"nálevku\" (epiglottický nálevkovitý prostor). Jejím zúžením zvuk zesvětlí, ztratí dýchavičnost a zesílí — to je twang. Většina zvuků potřebuje alespoň trochu twangu pro zdravou a snadnou produkci, u kovových módů je twang nutný vždy.",
        howto: "Jak na to: Zkuste napodobit zvuk kachny nebo komára — \"njeee\" s úzkým, nosovým zabarvením. U mnoha lidí tento twang nezní navenek \"nosově\" — je to hlavně pocit v krku, ne ve výsledném zvuku."
      },
      {
        name: "3. Nevysouvat čelist, neutahovat rty",
        desc: "Vysunutá spodní čelist a stažené rty (zejména ve vysokých tónech) mohou spustit nekontrolované sevření kolem hlasivek. Spodní čelist by měla být spíš zasunutá vzhledem k horní. Na vysokých i nízkých tónech otevírejte ústa víc než ve střední poloze.",
        diagram: svgJawPosition,
        howto: "Jak na to: Zkuste si test — zaklonit hlavu a vložit si prst mezi horní a dolní zuby, abyste našli uvolněnou polohu čelisti. Tuto polohu si pak zkuste udržet i bez prstu, zejména na vysokých tónech."
      }
    ]
  },
  {
    id: "modes",
    title: "🎤 Hlasové módy",
    intro: "Módy popisují základní \"nastavení\" hlasu — kombinaci množství kovového zabarvení (metalu), tlaku vzduchu a postavení hrtanu. Špatné použití módů je nejčastější příčinou problémů se zpěvem.",
    diagram: svgLarynxPosition,
    items: [
      {
        name: "Neutral",
        desc: "Jediný nekovový mód — 0% metalu. Charakter je čistý, otevřený, měkký, jako ukolébavka. Je to jediný mód, ve kterém lze zpívat se vzdušným (dechovým) zvukem bez poškození hlasu. Hlasitostně je to spíše tišší mód (pp až mp), ale ve vysoké poloze lze zpívat i nahlas.",
        howto: "Jak na to: Zkuste tiše a klidně zazpívat ukolébavku nebo zamumlat \"hmm\" — hrtan zůstává v klidové poloze, žádný tlak v krku. Zkuste i variantu se vzdušným, lehce \"foukaným\" zvukem — v Neutral je to bezpečné."
      },
      {
        name: "Curbing",
        desc: "Jediný \"polo-kovový\" mód, obsahuje různé množství metalu (cca 1–50 %). Charakter je trochu naříkavý nebo zdrženlivý — jako když naříkáte na bolest břicha. Hlasitostně zůstává ve středním pásmu (mp–mf), nelze v něm zpívat velmi tiše ani velmi nahlas. Nelze přidat vzdušný zvuk.",
        howto: "Jak na to: Najdete ho ustanovením lehkého \"zadržení\" (hold) — zkuste tón, který zní jako tiché stěžování si nebo lehký pláč, s mírně zvednutým hrtanem, ale uvolněnými rty a čelistí."
      },
      {
        name: "Overdrive",
        desc: "Jeden ze dvou plně kovových módů (1–100 % metalu). Charakter je přímý a hlasitý — jako když na někoho zavoláte \"hej!\" přes ulici. Typicky se používá v nízké a střední poloze hlasu při hlasitém mluvení nebo zpěvu. Nelze přidat vzdušný zvuk. Vhodné samohlásky jsou hlavně 'É' a 'Ó'.",
        howto: "Jak na to: Najdete ho ustanovením \"kousnutí\" (bite) — zkuste přímé, neomalené zavolání \"Hej!\" na někoho přes ulici a tento pocit přeneste do tónu. Tlak by měl jít z opory (bránice), ne ze sevřeného krku."
      },
      {
        name: "Edge",
        desc: "Druhý plně kovový mód (1–100 % metalu), dříve nazývaný \"Belting\". Charakter je lehčí, agresivnější a ostřejší než Overdrive — jako řítící se letadlo nebo křik. Nelze přidat vzdušný zvuk. Používají se jen tvangované samohlásky.",
        howto: "Jak na to: Najdete ho přidáním twangu k jasnému, otevřenému zvuku — zkuste napodobit kachní \"kvák\" nebo zvuk řítícího se/houkajícího letadla, velmi úzký a soustředěný. Tento mód je nejnáročnější, necvičte ho dlouho v kuse."
      }
    ]
  },
  {
    id: "colour",
    title: "🎨 Barva zvuku (Sound Colour)",
    intro: "Každý mód lze zesvětlit nebo ztemnit. Barva zvuku vzniká v hlasovém traktu — prostoru nad hlasivkami až ke rtům, včetně nosní dutiny. Velikost a tvar tohoto traktu určuje, jak tmavě/světle zní váš hlas — a každý ho má jinak velký, proto má každý svou osobní barvu zvuku.",
    diagram: svgTwang,
    items: [
      {
        name: "Tvar epiglottického nálevkovitého prostoru",
        desc: "Zúžení tohoto prostoru (twang) dělá zvuk světlejším a jasnějším.",
        howto: "Jak na to: Zkuste přepínat mezi zvukem \"kachny\" (úzký, twangovaný) a uvolněným \"á\" bez twangu — všimněte si rozdílu v jasnosti."
      },
      {
        name: "Poloha hrtanu",
        desc: "Zvednutý hrtan zesvětlí zvuk, snížený hrtan ho ztemní.",
        howto: "Jak na to: Zkuste plynule přejít mezi zvukem jako při polykání (hrtan nahoru, světlejší) a zíváním (hrtan dolů, temnější) — na stejném tónu."
      },
      {
        name: "Tvar jazyka",
        desc: "Plošší/širší jazyk zvuk ztmaví, stažený/užší jazyk zvuk zesvětlí.",
        howto: "Jak na to: Zazpívejte tón na \"á\" a zkuste jazyk nejprve co nejvíc \"rozprostřít\" do šířky, pak ho stáhnout doprostřed — sledujte, jak se barva zvuku mění."
      },
      {
        name: "Tvar rtů/ústních koutků",
        desc: "Úsměv (koutky nahoru) zesvětlí zvuk, uvolněné koutky ho ztemní.",
        howto: "Jak na to: Zazpívejte tón a zkuste na něm přejít z úsměvu do neutrálního, uvolněného výrazu — barva zvuku se mírně ztemní."
      },
      {
        name: "Poloha patra",
        desc: "Zvednuté patro (jako při zívnutí) ztmaví zvuk, uvolněné patro ho zesvětlí.",
        howto: "Jak na to: Zkuste na jednom tónu napodobit začátek zívnutí (patro nahoru) a pak ho uvolnit — všimněte si rozdílu v \"prostoru\" zvuku."
      },
      {
        name: "Otevření nosní dutiny",
        desc: "Otevřený nosní průchod dodá zvuku nosový přídech, uzavřený ho odstraní.",
        howto: "Jak na to: Zkuste zazpívat tón normálně a pak se zacpaným nosem — uslyšíte rozdíl v rezonanci."
      }
    ]
  },
  {
    id: "effects",
    title: "✨ Zvukové efekty",
    intro: "Efekty jsou zvuky nesouvisející s melodií nebo textem, které podtrhují výraz a styl. Jsou to pokročilé techniky — než je budete trénovat, měli byste mít pod kontrolou tři základní principy a volbu módu. Zkoušejte jen krátce a pokud cítíte škrábání, přestaňte.",
    items: [
      {
        name: "Distortion (zkreslení)",
        desc: "Drsný, chrčivý přídech ve zvuku — vzniká přidáním napětí ve falešných hlasivkách nad těmi pravými.",
        howto: "Jak na to: Zkuste lehce zachrčet jako při \"naštvané\" reakci — \"Grrr\". Začněte velmi mírně, jen náznak."
      },
      {
        name: "Creak / Creaking",
        desc: "Velmi nízký, vrzavý zvuk (podobný vrzání dveří), vznikající pomalým, nepravidelným kmitáním hlasivek na samé hranici jejich rozsahu.",
        howto: "Jak na to: Zkuste vydat nejnižší možný zvuk, jaký umíte — mělo by to znít jako tiché \"vrzání\" nebo praskání, ne jako tón."
      },
      {
        name: "Rattle (chrastění)",
        desc: "Krátké \"zachrastění\" — podobné lehkému zakuckání, dodává zpěvu syrovost a charakter.",
        howto: "Jak na to: Na začátku tónu zkuste krátké, lehké \"kch\" jako mírné zakašlání, hned přecházející do čistého tónu."
      },
      {
        name: "Growl (vrčení)",
        desc: "Hluboké vrčivé zabarvení — falešné hlasivky kmitají spolu s pravými.",
        howto: "Jak na to: Podobné vrčení motorky nebo psa — nízký, drsný tón. Vždy jen krátce, po rozezpívání."
      },
      {
        name: "Grunt (zabručení)",
        desc: "Krátký, drsný a silový zvuk na začátku tónu, podobný bručení nebo zafunění.",
        howto: "Jak na to: Zkuste krátké \"hmf\" jako při zdvihání něčeho těžkého, a hned poté přejděte do tónu."
      },
      {
        name: "Screams (screamy)",
        desc: "Velmi intenzivní, křičivé zvuky — od čistých vysokých výkřiků až po plně zkreslené screamy. Patří mezi nejnáročnější efekty.",
        howto: "Jak na to: Tento efekt vyžaduje výbornou kontrolu opory a twangu — doporučujeme zkoušet jen krátce, po důkladném rozezpívání, a okamžitě přestat při jakémkoli nepohodlí."
      },
      {
        name: "Intentional vocal breaks (úmyslné zlomy)",
        desc: "Náhlá, slyšitelná změna zvuku — typicky přechod do falzeta (Neutral ve falzetu) a zase zpět, jako \"praskání\" hlasu.",
        howto: "Jak na to: Zkuste na sjíždějícím tónu nechat hlas \"přeskočit\" do velmi lehkého, vzdušného zvuku (falzeta) a pak se vrátit zpět — jako u jódlování."
      },
      {
        name: "Audible Air (slyšitelný vzduch)",
        desc: "Vědomě přidaný dechový, vzdušný přízvuk ke zvuku. Bezpečně proveditelné pouze v módu Neutral.",
        howto: "Jak na to: V módu Neutral zkuste zazpívat tón tak, aby kromě tónu byl slyšet i lehký \"šum\" dechu — jako šeptaný zpěv s tónem."
      },
      {
        name: "Vibrato",
        desc: "Pravidelné kolísání výšky tónu — může vznikat z hrtanu (laryngeální vibrato) nebo jako pravidelné \"údery\" (hammer vibrato).",
        howto: "Jak na to: Začněte na pohodlném tónu a zkuste pomalu \"vlnit\" výšku nahoru-dolů o malý interval jako pomalou sirénu. Postupně zrychlujte, dokud nezní jako přirozené vibrato."
      },
      {
        name: "Ornamentace (rychlé běhy not)",
        desc: "Rychlé melodické ozdoby — během několika tónů nahoru/dolů kolem hlavní melodie, typické pro pop, R&B a gospel.",
        howto: "Jak na to: Vezměte krátký úsek melodie a zkuste velmi pomalu přidat 2–3 sousední tóny jako \"obtočení\" hlavní noty, postupně zrychlujte."
      }
    ]
  },
  {
    id: "registers",
    title: "🎵 Rejstříky",
    intro: "Rejstřík určuje, jakou částí hlasu zpíváte — od plného \"hrudního\" zvuku po lehký \"hlavový\".",
    diagram: svgRegisters,
    items: [
      {
        name: "Chest voice (hrudní rejstřík)",
        desc: "Plný, silný zvuk používaný v nižší a střední poloze. Cítíte vibrace v hrudi.",
        howto: "Jak na to: Zazpívejte pohodlný tón ve své mluvní poloze a položte si ruku na hrudní kost — měli byste cítit slabé vibrace."
      },
      {
        name: "Head voice (hlavový rejstřík)",
        desc: "Lehčí, vznosnější zvuk ve vyšší poloze, vibrace cítíte víc v hlavě.",
        howto: "Jak na to: Zazpívejte vyšší tón na slabiku \"hú\" nebo \"ní\", jako byste \"plavali\" zvukem nahoru."
      },
      {
        name: "Falzet",
        desc: "Velmi lehký, vzdušný zvuk v nejvyšší poloze — hlasivky se nedotýkají úplně.",
        howto: "Jak na to: Zkuste velmi tiše a vzdušně zazpívat vysoký tón, jako byste foukali přes hlas."
      },
      {
        name: "Mix (smíšený rejstřík)",
        desc: "Plynulý přechod mezi chest a head voice bez slyšitelného zlomu.",
        howto: "Jak na to: Zazpívejte pomalé glissando z nízkého do vysokého tónu na \"ú\" a snažte se, aby zvuk neměl žádný slyšitelný \"zlom\"."
      }
    ]
  },
  {
    id: "hoarseness",
    title: "🩺 Chrapot a péče o hlas",
    intro: "Chrapot zpravidla neznamená trvalé poškození — obvykle jde o nekontrolované sevření, které lze během pár hodin uvolnit. Pokud chrapot přetrvává dlouho, navštivte odborníka (foniatra/ORL).",
    items: [
      {
        name: "Proč hlas chraptí",
        desc: "Nejčastěji je to napětí/sevření způsobené nesprávnou technikou, stresem nebo emocemi. Další příčiny: zánět z kouře, vysychání hlasivek, infekce, alergie nebo refluxu.",
        howto: "Co dělat: Pokud nevíte proč chraptíte, zkuste si vzpomenout — necítili jste stres, nebyl jste v zakouřeném prostředí, nemáte rýmu? Identifikace příčiny pomáhá s řešením."
      },
      {
        name: "Ranní hlas je normální",
        desc: "Po probuzení zní hlas \"vlnitě\" — hlasivky byly přes noc vysychány proudem vzduchu, často i s pootevřenými ústy.",
        howto: "Co dělat: Nečistěte si hrudky v krku (nechrochtejte) — to jen vysušená místa znovu podráždí. Začněte mluvit/zpívat tiše a normálně, hleny se brzy uvolní samy."
      },
      {
        name: "Šeptání je horší než normální mluvení",
        desc: "Šeptání namáhá hlasivky více než běžná řeč, protože zvyšuje nekontrolované sevření.",
        howto: "Co dělat: Pokud musíte mluvit, mluvte normálně, jasně a s oporou — ne šeptem ani \"opatrně\". Je lepší zpívat/mluvit s menší oporou než šeptat."
      },
      {
        name: "Klid pro hlas (voice rest)",
        desc: "Pokud máte podezření na noduly nebo přetrvávající chrapot, doporučuje se 4–7 dní úplného hlasového klidu — žádné mluvení, šeptání ani chrochtání.",
        howto: "Co dělat: Pokud zkouška vyjde na období kdy chraptíte déle než pár dní, zvažte hlasový klid a komunikaci psaním. Je to nejrychlejší a nejlevnější řešení."
      },
      {
        name: "Napařování (steaming)",
        desc: "Inhalace páry zvlhčuje sliznice hlasivek a může pomoci při chrapotu.",
        howto: "Jak na to: Nalijte vroucí vodu do misky (případně s heřmánkem), přikryjte se ručníkem a inhalujte 10 minut. Po inhalaci nemluvte alespoň 30 minut. Přestaňte napařovat asi 4 hodiny před zpěvem."
      },
      {
        name: "Alkohol a kouření",
        desc: "Alkohol rozšiřuje cévy v hlasivkách a může způsobit jejich mírné otoky. Kouř dráždí a vysušuje sliznice.",
        howto: "Co dělat: Před zkouškou/koncertem omezte alkohol. Pokud kouříte, nepřestávejte těsně před důležitým výstupem — náhlá změna může hlas paradoxně rozhodit."
      }
    ]
  },
  {
    id: "tips",
    title: "💡 Tipy pro tenory a basy",
    intro: "Praktické rady k dechu, opoře a péči o hlas — relevantní pro všechny hlasové skupiny.",
    items: [
      {
        name: "Tenoři — vysoké tóny",
        desc: "Při tažení do výšek nepřitlačovat víc vzduchu — naopak uvolnit a najít \"mix\" mezi chest a head voice.",
        howto: "Jak na to: Před vysokým tónem si představte, že zvuk \"otáčíte\" nahoru a dozadu, jako by šel přes klenbu patra. Zkuste tón nejprve zazpívat tišeji než obvykle."
      },
      {
        name: "Basy — hloubka a opora",
        desc: "Hluboké tóny potřebují dobrou dechovou oporu (bránice), ne tlačení v krku.",
        howto: "Jak na to: Před nízkým tónem se nadechněte tak, aby se rozšířil pas/spodní žebra. Při zpěvu udržujte čelist uvolněnou, jako byste mírně \"otevírali\" zívnutí."
      },
      {
        name: "Rozezpívání před zkouškou",
        desc: "I 5-10 minut jemného rozezpívání výrazně sníží riziko přetížení hlasu během dvouhodinové zkoušky.",
        howto: "Jak na to: Začněte sirénami (\"ú\" z nejnižšího do nejvyššího pohodlného tónu) v pianissimu, pak krátké stupnice na \"mama\" ve středním rozsahu."
      },
      {
        name: "Pití vody",
        desc: "Hlasivky potřebují vlhkost — voda nepřichází přímo do styku s hlasivkami, ale celkové zvlhčení organismu pomáhá.",
        howto: "Jak na to: Pijte vodu pokojové teploty po malých dávkách v průběhu celé zkoušky. Vyhněte se velkému množství kofeinu před zpěvem."
      }
    ]
  }
]

function renderCvtTab(){
  let html = `<p class="small" style="margin-bottom:16px;color:var(--muted)">
    Stručný přehled techniky Complete Vocal Technique (CVT) podle Cathrine Sadolin. Slouží jako rychlá připomínka a inspirace pro domácí cvičení, nenahrazuje práci se sbormistrem nebo pedagogem.
  </p>`

  CVT_CONTENT.forEach(section => {
    const isOpen = CVT_SECTION_OPEN === section.id
    html += `
      <div class="card" style="margin-bottom:10px;padding:0;overflow:hidden">
        <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleCvtSection('${section.id}')">
          <span style="font-weight:600">${section.title}</span>
          <span style="color:var(--muted)">${isOpen ? "‹" : "›"}</span>
        </div>
        <div style="display:${isOpen ? "block" : "none"};padding:0 16px 16px">
          ${section.intro ? `<p class="small" style="margin-bottom:10px;color:var(--muted)">${section.intro}</p>` : ""}
          ${section.diagram ? section.diagram() : ""}
          ${section.items.map(item => `
            <div style="padding:10px 0;border-top:1px solid rgba(128,128,128,0.1)">
              <div style="font-weight:600;margin-bottom:4px">${item.name}</div>
              <div class="small" style="line-height:1.5;margin-bottom:6px">${item.desc}</div>
              ${item.diagram ? item.diagram() : ""}
              ${item.howto ? `<div class="small" style="line-height:1.5;padding:8px 10px;background:rgba(0,122,255,0.08);border-radius:8px;color:var(--text)">${item.howto}</div>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `
  })

  return html
}

function toggleCvtSection(id){
  CVT_SECTION_OPEN = CVT_SECTION_OPEN === id ? null : id
  renderRepertoar()
}

window.toggleCvtSection = toggleCvtSection

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
      ${m.PHONE ? `<a href="tel:${escapeHtml(m.PHONE)}" style="display:flex;align-items:center;justify-content:center;padding:6px 14px;min-height:36px;background:#d4f5e2;border-radius:8px;font-weight:600;font-size:14px;color:#1a7a3a;text-decoration:none">📞 Zavolat</a>` : ""}
      ${m.EMAIL ? `<a href="mailto:${escapeHtml(m.EMAIL)}" style="display:flex;align-items:center;justify-content:center;padding:6px 14px;min-height:36px;background:#e8f0fe;border-radius:8px;font-weight:600;font-size:14px;color:#007aff;text-decoration:none">✉️ Napsat e-mail</a>` : ""}
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
window.toggleDopravaPosadky = toggleDopravaPosadky
window.addPosadka           = addPosadka
window.removePosadka        = removePosadka
window.updatePosadkaField   = updatePosadkaField
window.togglePosadkaMember  = togglePosadkaMember
window.renderPosadkyDetail  = renderPosadkyDetail
window.toggleCvtSection     = toggleCvtSection
window.setZkusebnaTab       = setZkusebnaTab
window.renderHarmonogramDetail = renderHarmonogramDetail
