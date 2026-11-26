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
const SPACE_URL = "https://space.10men.cz"
// odkaz na noty vede do PDF vieweru v 10space, ne na Google Disk
function noteLink(url){
  const t = String(url || "").trim()
  const m = t.match(/\/d\/([\w-]{20,})/) || t.match(/[?&]id=([\w-]{20,})/) || t.match(/^([\w-]{20,})$/)
  return m ? `${SPACE_URL}/#/file/${m[1]}` : t
}
let ZKUSEBNA_TAB = "klavesy" // "klavesy" | "cvt"

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

/* Menu profilu: ikony jsou SVG ve společné sadě. Režim přepíná měsíc / slunce a text se už nepřepisuje emoji. */
const PM_ICON = {
  moon:   `<span class="pm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></span>`,
  sun:    `<span class="pm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></span>`,
  switch: `<span class="pm-icon pm-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg></span>`
}

function setDarkModeItem(btn, on){
  btn.innerHTML = (on ? PM_ICON.sun : PM_ICON.moon) + `<span class="pm-label">${on ? "Světlý režim" : "Tmavý režim"}</span>`
}

function fillProfileMenuAvatar(user){
  const el = document.getElementById("profileMenuAvatar")
  if(!el) return
  el.textContent = ""
  if(user.photoURL){
    const img = document.createElement("img")
    img.alt = ""
    img.referrerPolicy = "no-referrer"
    img.onerror = () => { el.textContent = getInitials(user.name) }
    img.src = user.photoURL
    el.appendChild(img)
  }else{
    el.textContent = getInitials(user.name)
  }
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
    fillProfileMenuAvatar(user)
  }

  // Přepínač jen pro admina
  const switchBtn = document.getElementById("profileMenuSwitchBtn")
if(switchBtn){
  if(AUTH_ROLE === 'ADMIN'){
    switchBtn.classList.remove('hidden')
    switchBtn.innerHTML = PM_ICON.switch + `<span class="pm-label">Přepnout člena</span>`
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
  const isOpen = el.style.display !== "none" && el.classList.contains("open")
  tenAcc.set(el, !isOpen, { display: "block", chevs: [chevron] })   // roleta (viz platform.js)
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

function dnyDo(datumString){
  const dnes = new Date().toISOString().split("T")[0]
  const diff = Math.ceil((new Date(datumString) - new Date(dnes)) / (1000 * 60 * 60 * 24))
  if(diff < 0) return null
  if(diff === 0) return "dnes"
  if(diff === 1) return "zítra"
  return `za ${diff} dní`
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
if(name !== "settings") window.__prevTab = name
ACTIVE_TAB = name
document.body.classList.toggle("settings-page", name === "settings") // v Nastavení bez spodní lišty
document.querySelectorAll(".bottom button").forEach(b => b.classList.remove("active"))
const map = {
dashboard: "btnDashboard",
events:    "btnEvents",
payments:  "btnPayments",
energy:    "btnEnergy",
repertoar: "btnRepertoar",
members:   "btnMembers"
}
const titleMap = {
  dashboard: "Přehled",
  events:    "Akce",
  payments:  "Platby",
  energy:    "Energie",
  repertoar: "Zkušebna",
  members:   "Členové",
  settings:  "Nastavení"
}
const pageTitle = document.getElementById("pageTitle")
if(pageTitle) pageTitle.textContent = titleMap[name] || "Přehled"

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
if(name === "settings")   renderSettings()
saveState()
}

function renderSettings(){
  window.tenSettings?.render(container())
}

function openSettings(){
  closeProfileMenu()
  setActiveTab("settings")
}

window.__tenSettingsBack = () => {
  const t = window.__prevTab && window.__prevTab !== "settings" ? window.__prevTab : "dashboard"
  setActiveTab(t)
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

function posadkaObsazenost(p){
  const mist = Number(p?.auto_mist) || 0
  if(!mist) return null
  const rez = Math.max(0, Math.floor(Number(p.auto_rezervovano) || 0))   // místa obsazená jinými lidmi než členy (rodina, hosté)
  const obs = (p.ridic ? 1 : 0) + (Array.isArray(p.posadka) ? p.posadka.length : 0) + rez
  return {mist, obs, rez, volno: mist - obs}
}

function renderHarmonogramDetail(json){
  let items = []
  try{ items = JSON.parse(json) }catch(e){ return "" }
  if(!Array.isArray(items) || !items.length) return ""

  const validItems = items.filter(h => h.cas || h.popis)
  if(!validItems.length) return ""

  // zjisti jestli je harmonogram vícedenní (má pole 'den')
  const hasDay = validItems.some(h => h.den)

  if(!hasDay){
    // jednodenní — původní zobrazení
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

  // vícedenní — seskup podle dne
  const days = [...new Set(validItems.map(h => h.den))].sort()

  return `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
    <span class="small" style="display:block;margin-bottom:6px">Harmonogram akce</span>
    ${days.map(day => {
      const dayLabel = new Date(day).toLocaleDateString("cs-CZ", {weekday: "long", day: "numeric", month: "numeric"})
      const dayItems = validItems.filter(h => h.den === day)
      return `
        <div style="margin-bottom:10px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;text-transform:capitalize;color:var(--muted)">${dayLabel}</div>
          ${dayItems.map(h => `
            <div style="display:flex;gap:10px;padding:4px 0;font-size:14px">
              <span style="font-weight:600;min-width:48px">${escapeHtml(h.cas || "—")}</span>
              <span>${escapeHtml(h.popis || "")}</span>
            </div>
          `).join("")}
        </div>
      `
    }).join("")}
  </div>`
}

function toggleDetailAccordion(key){
  const body    = document.getElementById("accBody_" + key)
  const chevron = document.getElementById("accChevron_" + key)
  if(!body) return
  const isOpen = body.style.display !== "none"
  tenAcc.set(body, !isOpen, { display: "block", chevs: [chevron] })
}

window.toggleDetailAccordion = toggleDetailAccordion

function isVicedenni(){
  const dateEnd = document.getElementById("fDateEnd")?.value
  const date    = document.getElementById("fDate")?.value
  return !!(dateEnd && date && dateEnd !== date)
}

function getEventDays(){
  const date    = document.getElementById("fDate")?.value
  const dateEnd = document.getElementById("fDateEnd")?.value
  if(!date) return []
  if(!dateEnd || dateEnd === date) return [date]

  const days = []
  let cur = new Date(date)
  const end = new Date(dateEnd)
  while(cur <= end){
    days.push(cur.toISOString().slice(0,10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function renderMultiDayHarmonogram(){
  const wrap = document.getElementById("harmonogramWrap")
  if(!wrap) return

  if(!isVicedenni()){
    // jednodenní — jednoduché textové pole jako dřív
    wrap.innerHTML = `<textarea id="fHarmonogram" style="width:100%;min-height:80px;border:1px solid #ddd;border-radius:6px;padding:8px;font-family:inherit;font-size:14px">${escapeHtml(window.EDIT_EVENT?.HARMONOGRAM || "")}</textarea>`
    return
  }

  // vícedenní — strukturovaný harmonogram po dnech
  const items = getInitialHarmonogram()
  const days = getEventDays()

  wrap.innerHTML = days.map(day => {
    const dayLabel = new Date(day).toLocaleDateString("cs-CZ", {weekday: "long", day: "numeric", month: "numeric"})
    const dayItems = items.filter(h => h.den === day)

    return `
      <div style="margin-bottom:16px">
        <div class="small" style="font-weight:600;margin-bottom:6px;text-transform:capitalize">${dayLabel}</div>
        <div id="harmonogramDay_${day}">
          ${dayItems.map((h) => {
            const idx = items.indexOf(h)
            return `
              <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
                <input type="time" value="${escapeHtml(h.cas || "")}"
                  oninput="updateHarmonogramField(${idx}, 'cas', this.value)"
                  style="width:100px;flex-shrink:0">
                <input type="text" value="${escapeHtml(h.popis || "")}" placeholder="Popis"
                  oninput="updateHarmonogramField(${idx}, 'popis', this.value)"
                  style="flex:1">
                <button class="btn-danger" type="button" onclick="removeHarmonogramRow(${idx});renderMultiDayHarmonogram()" style="width:auto;padding:8px 10px;flex-shrink:0">✕</button>
              </div>
            `
          }).join("")}
        </div>
        <button type="button" onclick="addHarmonogramRowForDay('${day}')" style="width:100%;margin-top:4px">+ Přidat položku</button>
      </div>
    `
  }).join("")
}

function addHarmonogramRowForDay(day){
  const items = getInitialHarmonogram()
  items.push({ den: day, cas: "", popis: "" })
  renderMultiDayHarmonogram()
}

window.renderMultiDayHarmonogram = renderMultiDayHarmonogram
window.addHarmonogramRowForDay   = addHarmonogramRowForDay

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
  if(window.tenSettings) return window.tenSettings.boot() // světlý / tmavý / podle systému (settings.js)
  const saved = localStorage.getItem("darkMode")
  if(saved === "1") applyDarkMode(true)
}

function applyDarkMode(on){
  document.body.classList.toggle("dark", on)
  const btn = document.getElementById("darkModeToggle")
  if(btn) setDarkModeItem(btn, on)

  // aktualizuj barvu status baru
  if(window.tenChrome) window.tenChrome(on)
  updateSidebarDarkLabel()
}

function toggleDarkMode(){
  const isDark = document.body.classList.contains("dark")
  if(window.tenSettings){ window.tenSettings.setTheme(isDark ? "light" : "dark"); closeProfileMenu(); return }
  applyDarkMode(!isDark)
  localStorage.setItem("darkMode", isDark ? "0" : "1")
  closeProfileMenu()
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
    window.tenSettings?.start()
    window.__tenSettingsChanged = () => { if(ACTIVE_TAB === "dashboard") renderDashboard() }

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
      logoutBar.innerHTML = `<button class="btn-danger" onclick="Auth.logout()" style="padding:8px 14px;font-size:13px">Odhlásit se</button>`
      document.body.appendChild(logoutBar)

    }else{
      initPullToRefresh()
      initSidebar()
      initRealtime()

      const state = loadState()
      if(state){
        if(state.eventsMonth) window.EVENTS_MONTH = state.eventsMonth
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
      // skryj splash screen po dokončení inicializace
    const splash = document.getElementById("splash")
    if(splash) splash.classList.add("hidden")

  }catch(err){
    setError("Chyba při načítání: " + (err?.message || err))
    // i při chybě skryj splash, ať uživatel vidí chybovou hlášku
    const splash = document.getElementById("splash")
    if(splash) splash.classList.add("hidden")
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

    const currentYear = new Date().getFullYear()

       const spring = concerts.filter(e => {
       const d = new Date(e.DATE)
       const m = d.getMonth() + 1
       return d.getFullYear() === currentYear && m >= 1 && m <= 6
     }).sort((a,b) => new Date(a.DATE) - new Date(b.DATE))
   
       const autumn = concerts.filter(e => {
       const d = new Date(e.DATE)
       const m = d.getMonth() + 1
       return d.getFullYear() === currentYear && m >= 7 && m <= 12
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
    let myTasks     = []
    try{ myTasks = await api("mytasks", {email: MEMBER_EMAIL}) }catch(e){ /* karta ukáže prázdný stav */ }
    let mkAll       = []
    try{ mkAll = await api("marketingtasks") }catch(e){ /* záložka Všechny bez marketingových úkolů */ }
    window.MK_ALL_LAST = mkAll

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
      <div class="card" style="cursor:pointer" onclick="setActiveTab('events');openEvent('${escapeHtml(upcoming.ID)}')">
        <div class="event-label">Nejbližší akce</div>
        <b style="font-size:18px;display:block;margin-bottom:8px">${escapeHtml(upcoming.NAME)}</b>
        <div class="info-row">
          <span class="info-label">Datum</span>
          <span class="info-value">${formatDate(upcoming.DATE)}${upcoming.DATE_END ? " – " + formatDate(upcoming.DATE_END) : ""}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Čas</span>
          <span class="info-value">${upcoming.START ? formatTime(upcoming.START) : "—"}${upcoming.END ? " – " + formatTime(upcoming.END) : ""}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Místo</span>
          <span class="info-value">${escapeHtml(upcoming.PLACE) || (upcoming.CALL_URL ? "Online" : "—")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Typ akce</span>
          <span class="info-value">${escapeHtml(upcoming.TYPE) || "Zkouška"}</span>
        </div>
        ${(upcoming.PLACE || upcoming.CALL_URL) ? `
          <div class="btn-group" style="margin-bottom:16px">
            ${upcoming.PLACE ? `
              <a class="ar-btn" href="https://maps.google.com/?q=${encodeURIComponent(upcoming.PLACE)}" target="_blank"
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
              <a class="ar-btn" href="${escapeHtml(upcoming.CALL_URL)}" target="_blank"
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
      ${spring.length ? `
        <div class="card" style="padding:0">
          <div class="event-label" style="padding:16px 16px 0">Jaro / Léto</div>
          ${spring.map((e, i) => {
            const todayCheck = new Date(e.DATE)
            todayCheck.setHours(0,0,0,0)
            const nowCheck = new Date()
            nowCheck.setHours(0,0,0,0)
            const past = todayCheck < nowCheck
            const border = i < spring.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
            const countdown = !past && e.STATUS !== "Zrušená" ? dnyDo(e.DATE) : null
            return `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
              ${e.STATUS === "Zrušená" ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:2px;text-transform:uppercase">Zrušená</div>` : ""}
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <b style="font-size:15px;display:block;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}">${isToday(e.DATE) ? "DNES: " : ""}${escapeHtml(e.NAME)}</b>
                ${countdown ? `<span class="days-badge">${countdown}</span>` : ""}
              </div>
              <div class="small" style="margin-top:3px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>
              ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
            </div>`
          }).join("")}
        </div>
      ` : `<div class="card"><div class="event-label">Jaro / Léto</div><p class='notice'>Žádné koncerty</p></div>`}
    `
    // pomocná funkce pro Podzim/Zima
    const autumnHtml = `
      ${autumn.length ? `
        <div class="card" style="padding:0">
          <div class="event-label" style="padding:16px 16px 0">Podzim / Zima</div>
          ${autumn.map((e, i) => {
            const todayCheck = new Date(e.DATE)
            todayCheck.setHours(0,0,0,0)
            const nowCheck = new Date()
            nowCheck.setHours(0,0,0,0)
            const past = todayCheck < nowCheck
            const border = i < autumn.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
            const countdown = !past && e.STATUS !== "Zrušená" ? dnyDo(e.DATE) : null
            return `<div onclick="openEvent('${escapeHtml(e.ID)}')" style="padding:14px 16px;cursor:pointer;${border}opacity:${past ? "0.4" : "1"}">
              ${e.STATUS === "Zrušená" ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:2px;text-transform:uppercase">Zrušená</div>` : ""}
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <b style="font-size:15px;display:block;${e.STATUS === "Zrušená" ? "text-decoration:line-through;color:var(--muted)" : ""}">${isToday(e.DATE) ? "DNES: " : ""}${escapeHtml(e.NAME)}</b>
                ${countdown ? `<span class="days-badge">${countdown}</span>` : ""}
              </div>
              <div class="small" style="margin-top:3px">${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}</div>
              ${e.PLACE ? `<div class="small">${escapeHtml(e.PLACE)}</div>` : ""}
            </div>`
          }).join("")}
        </div>
      ` : `<div class="card"><div class="event-label">Podzim / Zima</div><p class='notice'>Žádné koncerty</p></div>`}
    `

   // pomocná funkce pro Aktuality
    const aktualityHtml = `
      <div class="card dash-aktuality" style="padding:0">
        <div class="event-label" style="padding:16px 16px 0">Aktuality</div>
        ${Array.isArray(aktuality) && aktuality.length ? `
          ${aktuality.map((a, idx) => {
            const isSelected = MEMBER_ROLE === "ADMIN" && AKTUALITA_SELECTED === a.id
            const border = idx < aktuality.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
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
                  <button class="btn-info" onclick="event.stopPropagation();editAktualita('${escapeHtml(a.id)}','${escapeHtml(a.text||"").replaceAll("'","\\'")}','${a.date||""}')">Upravit</button>
                  <button class="btn-danger" onclick="event.stopPropagation();deleteAktualita('${escapeHtml(a.id)}')">Smazat</button>
                </div>
              ` : ""}
            </div>`
          }).join("")}
        ` : `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné aktuality</p></div>`}
        ${MEMBER_ROLE === "ADMIN" ? `
          <div style="padding:10px 16px;border-top:1px solid var(--card-border)">
            <button onclick="addAktualita()" style="width:100%">+ Přidat aktualitu</button>
          </div>
        ` : ""}
      </div>
    `
    const todosHtml = ukolyCardHtml(myTasks, todos, mkAll)   // jedna karta Úkoly s přepínačem Moje / Všechny

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
        <div class="card" style="padding:0">
          <div class="event-label" style="padding:16px 16px 0">Kontakty</div>
          ${sortedMembers.map((m, i) => {
            const border = i < sortedMembers.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
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

   // karty podle nastavení (Nastavení > Přehled): pořadí a výběr; na počítači do dvou sloupců zleva doprava
   const DASH = {
     nearest:   nearestEventHtml,
     spring:    springHtml,
     aktuality: aktualityHtml,
     autumn:    autumnHtml,
     todos:     todosHtml,
     heatmap:   `<div id="heatmap-container">${heatmapHtml}</div>`,
     contacts:  contactsHtml
   }
   const WIDE = ["heatmap", "contacts"]
   const order = window.tenSettings ? window.tenSettings.dashboardCards() : ["todos","nearest","aktuality","spring","autumn","heatmap","contacts"]
   let html = ""

   if(!order.length){
     html = `<div class="card"><p class="notice">Přehled je prázdný. Karty přidáš v <a href="#" onclick="openSettings();return false">Nastavení</a>.</p></div>`
   }else if(isDesktop && window.tenSettings?.isDefaultDash()){
     // výchozí Přehled: rozložení beze změny
     // dva nezávislé sloupce, aby pod nižší kartou nevznikala mezera
     html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:24px">`
     html += `<div>${todosHtml}${nearestEventHtml}${aktualityHtml}</div><div>${springHtml}${autumnHtml}</div></div>`
     html += DASH.heatmap + DASH.contacts
   }else if(isDesktop){
     let run = []
     const flush = () => {
       if(!run.length) return
       const left  = run.filter((_, i) => i % 2 === 0).map(id => DASH[id]).join("")
       const right = run.filter((_, i) => i % 2 === 1).map(id => DASH[id]).join("")
       html += `<div class="dash-cols"><div class="dash-col">${left}</div><div class="dash-col">${right}</div></div>`
       run = []
     }
     order.forEach(id => {
       if(WIDE.includes(id)){ flush(); html += DASH[id] } else run.push(id)
     })
     flush()
   }else{
     html = order.map(id => DASH[id]).join("")
   }

   container().innerHTML = html
   restoreScroll(scroll)

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

// Zodpovědná osoba: výběr ze členů. Hodnota ve formuláři je jméno, do databáze jde {email, name}.
const NOBODY = "— nikdo —"
let MEMBER_CHOICES = []
async function loadMemberChoices(){
  try{
    const m = await cachedApi("members")
    MEMBER_CHOICES = (Array.isArray(m) ? m : []).filter(x => x.NAME && x.EMAIL).sort((a, b) => a.NAME.localeCompare(b.NAME, "cs"))
  }catch(e){ /* bez seznamu zůstane jen „nikdo“ */ }
}
const assigneeOptions = () => [NOBODY, ...MEMBER_CHOICES.map(m => m.NAME)]
const assigneeFromName = name => {
  const m = MEMBER_CHOICES.find(x => x.NAME === name)
  return m ? {email: m.EMAIL, name: m.NAME} : null
}
const isMine = a => !!a && !!MEMBER_EMAIL && String(a.email).toLowerCase() === String(MEMBER_EMAIL).toLowerCase()
const assigneeLabel = a => a ? (isMine(a) ? "ty" : a.name) : ""

function toggleAktualita(id){
  toggleAccordion("detailAkt_" + id, "chevronAkt_" + id)
}

// Karta Přehledu „Úkoly“ s přepínačem Moje / Všechny. Moje = společné i marketingové úkoly přidělené přihlášenému,
// Všechny = společné úkoly sboru. Zvolená záložka se pamatuje; bez volby a bez vlastních úkolů se otevře Všechny.
const UKOLY_TAB_KEY = "10base-ukoly-tab"
function ukolyTab(myCount){
  let t = null
  try{ t = localStorage.getItem(UKOLY_TAB_KEY) }catch(e){ /* bez uložení */ }
  return t === "moje" || t === "vsechny" ? t : (myCount ? "moje" : "vsechny")
}
function ukolyMojeHtml(myTasks){
  const myToday = new Date().toLocaleDateString("sv-SE")
  return `
        ${myTasks.length ? myTasks.map((t, idx) => {
          const late = t.datum && t.datum < myToday
          const border = idx < myTasks.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
          const sub = [t.kind === "marketing" ? "Marketing · " + mkKanalyText(t) + (t.akceNazev ? " · " + t.akceNazev : "") : "Úkol sboru",
                       t.datum ? mkWhen(t) : ""].filter(Boolean).map(escapeHtml).join(" · ")
          const open = t.kind === "marketing" ? `openEvent('${escapeHtml(t.akceId)}')` : ""
          return `<div style="padding:12px 16px;${border}display:flex;align-items:flex-start;gap:10px">
            <input type="checkbox" aria-label="Hotovo: ${escapeHtml(t.text)}" onchange="finishMyTask('${t.kind}','${escapeHtml(t.akceId || "")}','${escapeHtml(t.id)}')" style="width:auto;margin-top:3px">
            <div style="flex:1;min-width:0;${open ? "cursor:pointer" : ""}" ${open ? `onclick="${open}"` : ""}>
              <div style="font-size:14px;font-weight:600">${escapeHtml(t.text)}</div>
              <div class="small">${sub}${late ? ` · <span style="color:#ff3b30;font-weight:600">po termínu</span>` : ""}</div>
            </div>
          </div>`
        }).join("") : `<div style="padding:14px 16px"><p class="notice" style="margin:0">Nic ti nepřipadlo.</p></div>`}
  `
}
// Marketingové úkoly akcí v záložce Všechny: odškrtnutí je stejné jako v detailu akce (/akce/{id}/marketing/ukoly/{id}/done)
function ukolyMarketingHtml(mkAll){
  if(!Array.isArray(mkAll) || !mkAll.length) return ""
  const myToday = new Date().toLocaleDateString("sv-SE")
  return `
        <div class="event-label" style="padding:14px 16px 4px;border-top:1px solid var(--card-border)">Marketing <span data-ukoly-mkcount style="text-transform:none;letter-spacing:normal;font-weight:400;color:var(--muted)">· ${mkAll.length}</span></div>
        ${mkAll.map((t, idx) => {
          const late = t.datum && t.datum < myToday
          const border = idx < mkAll.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
          const sub = [mkKanalyText(t), t.akceNazev, t.datum ? mkWhen(t) : ""].filter(Boolean).map(escapeHtml).join(" · ")
          return `<div style="padding:12px 16px;${border}display:flex;align-items:flex-start;gap:10px">
            <input type="checkbox" aria-label="Hotovo: ${escapeHtml(t.text)}" onchange="finishMyTask('marketing','${escapeHtml(t.akceId)}','${escapeHtml(t.id)}')" style="width:auto;margin-top:3px">
            <div style="flex:1;min-width:0;cursor:pointer" onclick="openEvent('${escapeHtml(t.akceId)}')">
              <div style="font-size:14px;font-weight:600">${escapeHtml(t.text)}</div>
              <div class="small">${sub}${late ? ` · <span style="color:#ff3b30;font-weight:600">po termínu</span>` : ""}</div>
              ${t.assignee ? `<div class="small" style="${isMine(t.assignee) ? "color:var(--blue,#007aff);font-weight:600" : ""}">${escapeHtml(assigneeLabel(t.assignee))}</div>` : ""}
            </div>
          </div>`
        }).join("")}
  `
}
function ukolyVsechnyHtml(todos, mkAll){
  return `
        ${Array.isArray(todos) && todos.length ? `
          ${todos.map((t, idx) => {
            const done       = t.done === true
            const isSelected = MEMBER_ROLE === "ADMIN" && TODO_SELECTED === t.id
            const border     = idx < todos.length - 1 ? "border-bottom:1px solid var(--card-border);" : ""
            return `<div
              style="padding:14px 16px;${border}cursor:${MEMBER_ROLE === "ADMIN" ? "pointer" : "default"}${isSelected ? ";background:var(--card-selected)" : ""}"
              onclick="${MEMBER_ROLE === "ADMIN" ? "selectTodo('" + escapeHtml(t.id) + "')" : ""}"
            >
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${done ? "#34c759" : "#c7c7cc"};background:${done ? "#34c759" : "transparent"};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${done ? `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fff;fill:none;stroke-width:3"><path d="M5 13l4 4L19 7"/></svg>` : ""}
                </div>
                <span style="flex:1;font-size:14px;${done ? "text-decoration:line-through;color:var(--muted)" : ""}">${escapeHtml(t.text)}</span>
                ${t.assignee ? `<span class="small" style="${isMine(t.assignee) ? "color:var(--blue,#007aff);font-weight:600" : ""}">${escapeHtml(assigneeLabel(t.assignee))}</span>` : ""}
                ${t.deadline ? `<span class="small">${formatDate(t.deadline)}</span>` : ""}
                ${isSelected ? `<div style="color:#007aff;font-size:20px">✓</div>` : ""}
              </div>
              ${isSelected ? `
                <div class="btn-group" style="margin-top:10px">
                  <button class="btn-info" onclick="event.stopPropagation();editTodoItem('${escapeHtml(t.id)}','${escapeHtml(t.text).replaceAll("'","\\'")}','${t.deadline||""}')">Upravit</button>
                  <button class="btn-danger" onclick="event.stopPropagation();deleteTodoItem('${escapeHtml(t.id)}')">Smazat</button>
                  <button class="btn-success" onclick="event.stopPropagation();toggleTodo('${escapeHtml(t.id)}',${!done})">${done ? "Znovu otevřít" : "Vyřešeno"}</button>
                </div>
              ` : ""}
            </div>`
          }).join("")}
        ` : `<div style="padding:14px 16px"><p class="notice" style="margin:0">Žádné úkoly</p></div>`}
        ${MEMBER_ROLE === "ADMIN" ? `
          <div style="padding:10px 16px;border-top:1px solid var(--card-border)">
            <button onclick="addTodoItem()" style="width:100%">+ Přidat úkol</button>
          </div>
        ` : ""}
        ${ukolyMarketingHtml(mkAll)}
  `
}
function ukolyCardHtml(myTasks, todos, mkAll){
  const tab = ukolyTab(myTasks.length)
  const openTodos = (Array.isArray(todos) ? todos.filter(t => t.done !== true).length : 0) + (Array.isArray(mkAll) ? mkAll.length : 0)
  const btn = (id, label, n) => `<button type="button" role="tab" data-ukoly-tab="${id}" class="${tab === id ? "on" : ""}" aria-selected="${tab === id}" onclick="setUkolyTab('${id}')">${label} <span data-ukoly-count="${id}" style="font-weight:400;opacity:.7">· ${n}</span></button>`
  return `
    <div class="card dash-todos" style="padding:0;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 16px 0">
        <span class="event-label" style="padding:0">Úkoly</span>
        <div class="st-seg" role="tablist" aria-label="Úkoly">${btn("moje", "Moje", myTasks.length)}${btn("vsechny", "Všechny", openTodos)}</div>
      </div>
      <div id="ukolyMoje" ${tab === "moje" ? "" : "hidden"}>${ukolyMojeHtml(myTasks)}</div>
      <div id="ukolyAll" ${tab === "vsechny" ? "" : "hidden"}>${ukolyVsechnyHtml(todos, mkAll)}</div>
    </div>
  `
}
window.setUkolyTab = (tab) => {
  if(tab !== "moje" && tab !== "vsechny") return
  try{ localStorage.setItem(UKOLY_TAB_KEY, tab) }catch(e){ /* bez uložení */ }
  document.querySelectorAll(".dash-todos [data-ukoly-tab]").forEach(b => { const on = b.dataset.ukolyTab === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", on) })
  const m = document.getElementById("ukolyMoje"), a = document.getElementById("ukolyAll")
  if(m) m.hidden = tab !== "moje"
  if(a) a.hidden = tab !== "vsechny"
}

// Odškrtnutí vlastního úkolu přímo z Přehledu (společný úkol i marketingový úkol akce)
async function finishMyTask(kind, akceId, id){
  try{
    if(kind === "marketing"){
      await api("setmarketingdone", {id: akceId, taskId: id, done: true, by: MEMBER_NAME || MEMBER_EMAIL || ""})
      invalidateCache("eventdetail", akceId)
    }else{
      await api("updatetodo", {id, done: true})
      lsDel("todos")
    }
    renderDashboard()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
    renderDashboard()
  }
}
window.finishMyTask = finishMyTask

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
  await loadMemberChoices()
  const cur = ((await cachedApi("todos")) || []).find(t => t.id === id)
  openFormModal("Upravit úkol", [
    {key: "text",     label: "Úkol",    type: "text", value: text},
    {key: "deadline", label: "Deadline", type: "date", value: deadline},
    {key: "assignee", label: "Zodpovědný", type: "select", options: assigneeOptions(), value: cur?.assignee?.name || NOBODY}
  ], async (values) => {
    if(!values.text){ alert("Zadej text úkolu"); return }
    try{
      closeFormModal()
      await api("updatetodo", {id, text: values.text, deadline: values.deadline, assignee: assigneeFromName(values.assignee), done: cur?.done === true})
      lsDel("todos")
      TODO_SELECTED = null
      renderDashboard()
    }catch(err){ alert("Chyba: " + err.message) }
  })
}

async function addTodoItem(){
  await loadMemberChoices()
  openFormModal("Nový úkol", [
    {key: "text",     label: "Úkol",    type: "text"},
    {key: "deadline", label: "Deadline", type: "date"},
    {key: "assignee", label: "Zodpovědný", type: "select", options: assigneeOptions(), value: NOBODY}
  ], async (values) => {
    if(!values.text){ alert("Zadej text úkolu"); return }
    try{
      closeFormModal()
      await api("addtodo", {text: values.text, deadline: values.deadline, assignee: assigneeFromName(values.assignee)})
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

   let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
     
    if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART"){
      html += `<div class="btn-group" style="margin-bottom:16px">`
      if(MEMBER_ROLE === "ADMIN"){
        html += `<button onclick="openEventForm()">+ Přidat novou akci</button>`
      }
      html += `</div>`
    }

    html += monthSliderHtml("events", window.EVENTS_MONTH)

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
  const countdown   = !isCancelled ? dnyDo(e.DATE) : null
  html += `<div class="swipe-wrapper" style="opacity:${opacity}">
    <div class="swipe-bg">
      <span class="swipe-bg-left">✓ Přijdu</span>
      <span class="swipe-bg-right">✗ Nepřijdu</span>
    </div>
    <div class="card swipe-card${isNext ? " next" : ""}" data-id="${escapeHtml(e.ID)}" style="${highlight}">
      ${isNext ? `<div style="font-size:11px;color:#007aff;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Nejbližší akce</div>` : ""}
      ${isCancelled ? `<div style="font-size:11px;color:#ff3b30;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Zrušená</div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <b style="${isCancelled ? "text-decoration:line-through;color:var(--muted)" : ""}">${escapeHtml(e.NAME)}</b>
        ${countdown ? `<span class="days-badge">${countdown}</span>` : ""}
      </div>
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

  const html = evFormHtml(isEdit, id, event, dateVal)

  document.getElementById("eventFormModalBody").innerHTML = html
  document.getElementById("eventFormModal").classList.remove("hidden")
  evFormInit(isEdit)
}

// =============================================
// FORMULÁŘ AKCE: průvodce (typ → kdy → kde → podrobnosti podle typu)
// Prvky mají stará id (fName, fDate, fStart, fType, fDoprava…), takže saveEvent() čte hodnoty jako dřív;
// volby jsou tlačítka (chipy), která zapisují do skrytých polí.
// =============================================
// EV_FORM_START
const EV_DOW   = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"]
const EV_DOW_V = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"]
const evPad   = n => String(n).padStart(2, "0")
const evParse = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }
const evDM    = d => `${d.getDate()}. ${d.getMonth() + 1}.`
const evMin   = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null }
const evHM    = min => `${evPad(Math.floor(min / 60) % 24)}:${evPad(min % 60)}`
const evToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()) }
const evCap   = s => s.charAt(0).toUpperCase() + s.slice(1)
const evDurText = min => min % 30 === 0 ? `${String(min / 60).replace(".", ",")} h` : `${Math.floor(min / 60)} h ${min % 60} min`
const evPlural = (n, one, few, many) => n === 1 ? one : (n >= 2 && n <= 4 ? few : many)

const evSvg = p => `<svg viewBox="0 0 24 24" class="ev-ic" aria-hidden="true">${p}</svg>`
const EV_ICON = {
  "Veřejná doprava":  evSvg('<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M8 20l1-3M16 20l-1-3"/>'),
  "Auta":             evSvg('<path d="M5 16v-5l2-5h10l2 5v5M3 16h18M5 16v2M19 16v2"/><circle cx="8" cy="13" r=".8"/><circle cx="16" cy="13" r=".8"/>'),
  "Každý po své ose": evSvg('<circle cx="13" cy="4.5" r="1.8"/><path d="M12 8l-3 4 3 2v6M12 8l3 3 3 1M9 12l-2 4"/>'),
  cal:   evSvg('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  check: evSvg('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
}
const EV_TYPES = ["Zkouška", "Koncert", "Soustředění", "Soutěž", "Jiná akce"]
window.EV_KEEP = {}
window.EV_NAME_AUTO = false

// hodnota pole: rozepsaná (při přepnutí typu), jinak z uložené akce, jinak výchozí
const evVal = (id, key, def = "") => { const k = window.EV_KEEP; return id in k ? k[id] : (window.EDIT_EVENT?.[key] ?? def) }
const evBool = (id, key, def = false) => { const k = window.EV_KEEP; return id in k ? !!k[id] : (window.EDIT_EVENT?.[key] ?? def) }

// přepínač voleb (segmentový): vždy je vybraná právě jedna volba, žádná se nedá omylem zrušit; vybraná volba se plynule přesune
// options: [hodnota, popisek, ikona?]; skrytý vstup s id drží hodnotu pro saveEvent()
function evSegHtml(id, options, value, onpick){
  const i = options.findIndex(o => o[0] === value)
  return `<input type="hidden" id="${id}" value="${escapeHtml(value || "")}">
    <div class="ev-seg${i < 0 ? " none" : ""}" role="radiogroup" data-ev-for="${id}">` +
    options.map(([v, l, ic], k) => `<button type="button" role="radio" class="ev-segb${k === i ? " on" : ""}" aria-checked="${k === i}" data-v="${escapeHtml(v)}" onclick="${onpick || "evPick"}('${id}', this)">${ic || ""}<span>${escapeHtml(l)}</span></button>`).join("") + `</div>`
}
// pilulka vybrané volby se přesouvá podle změřené polohy (volby mají různou šířku); ResizeObserver ji dopočítá, když se přepínač ukáže nebo změní velikost
function evSegLayout(seg){
  const on = seg.querySelector(".ev-segb.on")
  seg.classList.toggle("none", !on)
  if(!on || !on.offsetWidth) return
  seg.style.setProperty("--x", (on.offsetLeft - 3) + "px"); seg.style.setProperty("--w", on.offsetWidth + "px")
}
function evSegObserve(root){
  if(!window.ResizeObserver){ (root || document).querySelectorAll(".ev-seg").forEach(evSegLayout); return }
  if(!window.EV_RO) window.EV_RO = new ResizeObserver(es => es.forEach(e => evSegLayout(e.target)))
  ;(root || document).querySelectorAll(".ev-seg").forEach(s => { if(!s.__evObs){ s.__evObs = true; window.EV_RO.observe(s) } })
}
function evSegSet(seg, btn){
  const btns = [...seg.querySelectorAll(".ev-segb")]
  btns.forEach(b => { const on = b === btn; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)) })
  evSegLayout(seg)
}
function evPick(id, btn){
  const inp = document.getElementById(id); if(!inp) return
  inp.value = btn.dataset.v
  evSegSet(btn.closest(".ev-seg"), btn)
  inp.dispatchEvent(new Event("input", { bubbles: true }))
  if(id === "fStrava") toggleStravaNote(inp.value)
  if(id === "fRecurrence"){ toggleRecurrenceUntil(inp.value); evUpdateRecurrence() }
}
const evSwitch = (id, label, checked, onchange) =>
  `<label class="ev-sw"><span class="t">${label}</span><input type="checkbox" class="ev-swin" id="${id}" ${checked ? "checked" : ""}${onchange ? ` onchange="${onchange}"` : ""}></label>`
const evAcc = (title, fields, body, open) =>
  `<details class="ev-acc" data-ev-f="${fields}"${open ? " open" : ""}><summary><span class="ck">${EV_ICON.check}</span><span class="tt">${title}</span><small class="sm"></small></summary><div class="b">${body}</div></details>`

function evFormHtml(isEdit, id, event, dateVal){
  const type = isEdit ? (event.TYPE || "Zkouška") : ""
  const multi = !!event.DATE_END
  const dateEnd = event.DATE_END ? new Date(event.DATE_END).toISOString().substring(0, 10) : ""
  const status = event.STATUS === "Proběhlá" ? "Proběhlá" : "Plánovaná"
  const notify = (() => { try{ return localStorage.getItem("tenEvNotify") !== "0" }catch(e){ return true } })()
  return `
  <h2>${isEdit ? "Upravit akci" : "Nová akce"}</h2>
  <div class="card ev">
    <div class="ev-q">Co se chystá?</div>
    <input type="hidden" id="fType" value="${escapeHtml(type)}">
    <div id="evTypes">${evTypeHtml(type)}</div>

    <div id="evRest" style="${isEdit ? "" : "display:none"}">
      <div class="ev-sec"><div class="ev-q"><label for="fName">Název</label></div>
        <input id="fName" class="nm" value="${escapeHtml(event.NAME || "")}" placeholder="Název akce" oninput="window.EV_NAME_AUTO=false;evClearErr(this)"></div>

      <div class="ev-sec"><div class="ev-q">Kdy</div>
        <div class="ev-grid3">
          <div><label>Datum<input id="fDate" type="date" value="${dateVal}" onchange="evClearErr(this);evKdyUpdate();evUpdateRecurrence()"></label></div>
          <div><label>Začátek<input id="fStart" type="time" value="${escapeHtml(event.START || "")}" oninput="evKdyUpdate()"></label></div>
          <div><label>Konec<input id="fEnd" type="time" value="${escapeHtml(event.END || "")}" oninput="evKdyUpdate()"></label></div>
        </div>
        <div class="ev-q" style="margin-top:14px">Jak dlouho</div>
        <div class="ev-seg none" role="radiogroup" id="evDurSeg">${[[60, "1 h"], [120, "2 h"], [150, "2,5 h"], [180, "3 h"], [0, "Celý den"]].map(([m, l]) => `<button type="button" role="radio" class="ev-segb" aria-checked="false" data-ev-dur="${m}" onclick="evSetDur(${m})"><span>${l}</span></button>`).join("")}</div>
        <div class="ev-sum">${EV_ICON.cal}<div><div class="big" id="evSum1"></div><small id="evSum2"></small></div></div>
        ${evSwitch("fMulti", "Trvá víc dní", multi, "evMulti(this.checked)")}
        <div id="evEndWrap" style="display:${multi ? "block" : "none"}"><label>Datum konce<input id="fDateEnd" type="date" value="${dateEnd}" onchange="evClearErr(this);evKdyUpdate()"></label></div>
      </div>

      <div class="ev-sec"><div class="ev-q"><label for="fPlace">Kde</label></div>
        <input id="fPlace" class="nm" value="${escapeHtml(event.PLACE || "")}" placeholder="Místo konání">
        ${evSwitch("fOnline", "Online", !!event.CALL_URL, "evOnline(this.checked)")}
        <div id="evCallWrap" style="display:${event.CALL_URL ? "block" : "none"}"><label>Odkaz na online call<input id="fCallUrl" value="${escapeHtml(event.CALL_URL || "")}" placeholder="https://discord.gg/..."></label></div>
      </div>

      ${evSwitch("fRequiresProgram", "Potřebujeme program z repertoáru", event.REQUIRES_PROGRAM !== false)}

      ${isEdit ? `<div class="ev-sec"><div class="ev-q">Stav akce</div>${evSegHtml("fStatus", [["Plánovaná", "Plánovaná"], ["Proběhlá", "Proběhlá"]], status)}</div>` : `<input type="hidden" id="fStatus" value="Plánovaná">
      <div class="ev-sec"><div class="ev-q">Opakování</div>
        ${evSegHtml("fRecurrence", [["none", "Jednorázově"], ["weekly", "Týdně"], ["biweekly", "Co 2 týdny"]], "none")}
        <div id="recurrenceUntilWrap" style="display:none">
          <label>Opakovat do<input id="fRecurrenceUntil" type="date" oninput="evClearErr(this);evUpdateRecurrence()"></label>
          <div class="ev-hint" id="evRecHint"></div>
        </div>
      </div>`}

      <div class="ev-sec" id="evExtraSec"><div class="ev-q">Podrobnosti<small id="evProg"></small></div><div id="eventFormExtra"></div></div>

      <div class="ev-sec"><div class="ev-q"><label for="fNote">Poznámka</label></div>
        <textarea id="fNote" class="ev-ta" rows="3">${escapeHtml(event.NOTE || "")}</textarea></div>
    </div>

    <div class="form-foot ev-foot">
      <div class="ev-needs-type" style="${isEdit ? "" : "display:none"}">${evSwitch("fNotify", "Poslat do Discordu", notify)}</div>
      <div class="btn-group">
        <button type="button" class="btn-primary ev-needs-type" style="${isEdit ? "" : "display:none"}" onclick="saveEvent(${isEdit ? `'${id}'` : "null"}, evNotify())">${isEdit ? "Uložit" : "Vytvořit akci"}</button>
        <button type="button" class="btn-secondary" onclick="guardedClose('eventFormModal')">Zrušit</button>
        ${isEdit ? `<button type="button" class="btn-danger" onclick="evSmazat('${id}')">Smazat akci</button>` : ""}
      </div>
    </div>
  </div>`
}
function evTypeHtml(sel){
  const i = EV_TYPES.indexOf(sel)
  return `<div class="ev-seg ev-types${i < 0 ? " none" : ""}" role="radiogroup" aria-label="Typ akce">` +
    EV_TYPES.map((t, k) => `<button type="button" role="radio" class="ev-segb${k === i ? " on" : ""}" aria-checked="${k === i}" data-t="${t}" onclick="evOnType('${t}', this)"><span>${t === "Jiná akce" ? "Jiná" : t}</span></button>`).join("") + `</div>`
}

const evNotify = () => { const v = !!document.getElementById("fNotify")?.checked; try{ localStorage.setItem("tenEvNotify", v ? "1" : "0") }catch(e){} return v }
function evSmazat(id){ if(guardedClose("eventFormModal")) deleteEvent(id) }
function evMulti(on){ const w = document.getElementById("evEndWrap"); if(w) w.style.display = on ? "block" : "none"; if(!on){ const e = document.getElementById("fDateEnd"); if(e) e.value = "" } evKdyUpdate() }
function evOnline(on){ const w = document.getElementById("evCallWrap"); if(w) w.style.display = on ? "block" : "none"; if(!on){ const e = document.getElementById("fCallUrl"); if(e) e.value = "" } }
function evObS(on){ const h = document.getElementById("fObleceniSoustredeni"); if(h) h.value = on ? "Ano" : "Ne"; toggleObleceniSoustredeniDetail(h.value) }

// chyba přímo u pole (místo alert)
function evErr(id, msg){
  const el = document.getElementById(id); if(!el){ alert(msg); return }
  evClearErr(el); el.classList.add("ev-err")
  el.insertAdjacentHTML("afterend", `<div class="ev-errmsg" role="alert">${escapeHtml(msg)}</div>`)
  el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true })
}
function evClearErr(el){ if(!el) return; el.classList.remove("ev-err"); const n = el.nextElementSibling; if(n && n.classList.contains("ev-errmsg")) n.remove() }

function evOnType(t, btn){
  const inp = document.getElementById("fType"); if(!inp) return
  inp.value = t
  evSegSet(document.querySelector("#evTypes .ev-seg"), btn || document.querySelector(`#evTypes .ev-segb[data-t="${t}"]`))
  document.getElementById("evRest").style.display = ""
  document.querySelectorAll(".ev-needs-type").forEach(el => { el.style.display = "" })
  evCapture(); renderEventFormExtra(); evAutoName(); evKdyUpdate(); evSegObserve(document.getElementById("eventFormModalBody"))
  inp.dispatchEvent(new Event("input", { bubbles: true }))
}
function evCapture(){   // rozepsané hodnoty podrobností přežijí přepnutí typu
  const panel = document.getElementById("eventFormExtra"); if(!panel) return
  panel.querySelectorAll("[id]").forEach(el => { if(el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") window.EV_KEEP[el.id] = el.type === "checkbox" ? el.checked : el.value })
}
function evAutoName(){
  if(!window.EV_NAME_AUTO) return
  const n = document.getElementById("fName"), t = document.getElementById("fType")?.value; if(!n || !t) return
  const d = evParse(document.getElementById("fDate")?.value)
  n.value = t + (d ? " " + evDM(d) : "")
}
function evSetDur(min){
  const s = document.getElementById("fStart"), e = document.getElementById("fEnd")
  if(min === 0){ s.value = ""; e.value = "" }
  else{ if(evMin(s.value) == null) s.value = "18:00"; e.value = evHM(evMin(s.value) + min) }
  s.dispatchEvent(new Event("input", { bubbles: true })); evKdyUpdate()
}

function evKdyUpdate(){
  const $ = id => document.getElementById(id), date = $("fDate"); if(!date) return
  const d = evParse(date.value), st = $("fStart").value, en = $("fEnd").value
  const sm = evMin(st), em = evMin(en), dur = sm != null && em != null ? (em - sm + 1440) % 1440 : null
  const seg = $("evDurSeg")
  if(seg){ const hit = [...seg.querySelectorAll("[data-ev-dur]")].find(b => { const v = Number(b.dataset.evDur); return v === 0 ? (!st && !en && !!d) : dur === v }); evSegSet(seg, hit || null) }
  const s1 = $("evSum1"), s2 = $("evSum2"); if(!s1) return
  const dEnd = $("fMulti")?.checked ? evParse($("fDateEnd")?.value) : null
  s2.classList.remove("ev-warn")
  if(!d){ s1.textContent = "Vyber datum"; s2.textContent = ""; return }
  s1.textContent = evCap(EV_DOW[d.getDay()]) + " " + evDM(d) + (dEnd ? ` – ${EV_DOW[dEnd.getDay()]} ${evDM(dEnd)}` : "") + (st ? ` · ${st}${en ? "–" + en : ""}` : " · celý den")
  const n = Math.round((d - evToday()) / 86400000), parts = []
  parts.push(n === 0 ? "dnes" : n === 1 ? "zítra" : n === 2 ? "pozítří" : n > 0 ? `za ${n} ${evPlural(n, "den", "dny", "dní")}` : `datum je v minulosti (před ${-n} ${evPlural(-n, "dnem", "dny", "dny")})`)
  if(n < 0) s2.classList.add("ev-warn")
  if(dur) parts.push(evDurText(dur) + (sm != null && em != null && em < sm ? ", končí po půlnoci" : ""))
  if(dEnd && dEnd < d){ parts.push("konec je před začátkem"); s2.classList.add("ev-warn") }
  s2.textContent = parts.join(" · ")
  evAutoName()
}
function evUpdateRecurrence(){
  const h = document.getElementById("evRecHint"); if(!h) return
  const t = document.getElementById("fRecurrence")?.value, d = evParse(document.getElementById("fDate")?.value), u = evParse(document.getElementById("fRecurrenceUntil")?.value)
  if(!t || t === "none" || !d || !u || u < d){ h.textContent = ""; return }
  const step = t === "weekly" ? 7 : 14, n = Math.floor(Math.round((u - d) / 86400000) / step) + 1
  const st = document.getElementById("fStart")?.value, en = document.getElementById("fEnd")?.value
  h.textContent = `Vytvoří se ${n} ${evPlural(n, "akce", "akce", "akcí")}, vždy ${EV_DOW_V[d.getDay()]}${st ? " " + st + (en ? "–" + en : "") : ""}`
}
function evFormInit(isEdit){
  const body = document.getElementById("eventFormModalBody"); if(!body) return
  window.EV_KEEP = {}
  window.EV_NAME_AUTO = !isEdit
  if(!body.__evBound){
    body.__evBound = true
    const upd = e => { const d = e.target.closest && e.target.closest("details.ev-acc"); if(d){ evAccUpdate(d); evProgress() } }
    body.addEventListener("input", upd); body.addEventListener("change", upd)
  }
  if(isEdit) renderEventFormExtra()
  evKdyUpdate()
  evSegObserve(body)
}
function evAccUpdate(det){
  const ids = (det.dataset.evF || "").split(",").filter(Boolean)
  const vals = ids.map(id => { const el = document.getElementById(id); if(!el) return ""; return el.type === "checkbox" ? (el.checked ? "ano" : "") : String(el.value || "").trim() }).filter(Boolean)
  det.classList.toggle("done", vals.length > 0)
  const sm = det.querySelector(".sm"); if(sm) sm.textContent = ids.length ? (vals.length ? vals.join(" · ").slice(0, 36) : "nezadáno") : ""
}
function evProgress(){
  const all = [...document.querySelectorAll("#eventFormExtra details.ev-acc")].filter(d => d.dataset.evF)
  const el = document.getElementById("evProg"); if(!el) return
  el.textContent = all.length ? `${all.filter(d => d.classList.contains("done")).length} z ${all.length}` : ""
}
// EV_FORM_END

function closeEventFormModal(){
  document.getElementById("eventFormModal").classList.add("hidden")
}

function renderEventFormExtra(){
  const type  = document.getElementById("fType")?.value || ""
  const panel = document.getElementById("eventFormExtra")
  if(!panel) return
  const isKoncert     = type === "Koncert" || type === "Jiná akce"
  const isSoustredeni = type === "Soustředění" || type === "Soutěž"
  const dopravaAcc = () => evAcc("Doprava", "fDoprava",
    evSegHtml("fDoprava", [["", "Nezadáno"], ["Veřejná doprava", "Veřejná", EV_ICON["Veřejná doprava"]], ["Auta", "Auta", EV_ICON.Auta], ["Každý po své ose", "Po své ose", EV_ICON["Každý po své ose"]]], evVal("fDoprava", "DOPRAVA")), false)

  if(isKoncert){
    panel.innerHTML =
      evAcc("Sraz a oblečení", "fSraz,fObleceni",
        `<label>Čas srazu<input id="fSraz" type="time" value="${escapeHtml(evVal("fSraz", "SRAZ"))}"></label>
         <div class="ev-q" style="margin-top:14px">Oblečení</div>`
        + evSegHtml("fObleceni", [["", "Nezadáno"], ["Formální", "Formální"], ["Neformální", "Neformální"], ["Zimní civil", "Zimní civil"]], evVal("fObleceni", "OBLECENI")), true)
      + dopravaAcc()
      + evAcc("Hospoda", "fHospoda", `<textarea id="fHospoda" class="ev-ta" rows="3" placeholder="Název/adresa, čas rezervace, na jaké jméno...">${escapeHtml(evVal("fHospoda", "HOSPODA"))}</textarea>`, false)
      + (type === "Koncert" ? evAcc("Spolupráce s jiným tělesem", "fIsSpoluprace,fSpolupraceNazev",
          evSwitch("fIsSpoluprace", "Spolupracujeme s jiným tělesem", evBool("fIsSpoluprace", "IS_SPOLUPRACE"), "toggleSpolupraceField(this.checked)")
          + `<div id="spolupraceNazevWrap" style="display:${evBool("fIsSpoluprace", "IS_SPOLUPRACE") ? "block" : "none"};margin-top:8px"><label>Název spolupracujícího tělesa<input id="fSpolupraceNazev" type="text" value="${escapeHtml(evVal("fSpolupraceNazev", "SPOLUPRACE_NAZEV"))}" placeholder="např. Sbor XY"></label></div>`, false)
        + evAcc("Harmonogram dne", "",
          `<div id="harmonogramList">${renderHarmonogramHtml()}</div><div class="btn-group" style="margin-top:8px"><button type="button" class="btn-secondary" onclick="addHarmonogramRow()">Přidat položku</button></div>`, false)
        + ((MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? renderRiderToggleHtml() : "") : "")
      + (type === "Jiná akce" ? evSwitch("fIsGrilovacka", "Grilovačka (sdílený seznam věcí)", evBool("fIsGrilovacka", "IS_GRILOVACKA")) : "")
  }else if(isSoustredeni){
    const ob = evVal("fObleceniSoustredeni", "OBLECENI_S", "Ne") || "Ne"
    const strava = evVal("fStrava", "STRAVA")
    panel.innerHTML =
      evAcc("Spaní a strava", "fSpacaky,fStrava,fStravaNota",
        `<div class="ev-q">Spacáky a karimatky</div>` + evSegHtml("fSpacaky", [["", "Nezadáno"], ["Ano", "Ano"], ["Ne", "Ne"], ["Vlastní uvážení", "Dle uvážení"]], evVal("fSpacaky", "SPACAKY"))
        + `<div class="ev-q" style="margin-top:14px">Strava</div>` + evSegHtml("fStrava", [["", "Nezadáno"], ["Ano", "Ano"], ["Ne", "Ne"], ["Částečně", "Částečně"]], strava)
        + `<div id="stravaNote" style="display:${strava === "Částečně" ? "block" : "none"};margin-top:8px"><label>Specifikace stravy<textarea id="fStravaNota" class="ev-ta" rows="3">${escapeHtml(evVal("fStravaNota", "STRAVA_NOTA"))}</textarea></label></div>`, true)
      + evAcc("Koncertní oblečení", "fObleceniSoustredeni",
        `<input type="hidden" id="fObleceniSoustredeni" value="${ob}">`
        + evSwitch("fObleceniSoustredeniSw", "Bude se zpívat v koncertním oblečení", ob === "Ano", "evObS(this.checked)")
        + `<div id="obleceniSoustredeniDetail" style="display:${ob === "Ano" ? "block" : "none"};margin-top:10px">`
        + evSegHtml("fObleceniSoustredeniTyp", [["Formální", "Formální"], ["Neformální", "Neformální"], ["Zimní civil", "Zimní civil"], ["Vše", "Vše"]], evVal("fObleceniSoustredeniTyp", "OBLECENI_S_TYP", "Formální") || "Formální") + `</div>`, false)
      + dopravaAcc()
      + evAcc("Harmonogram po dnech", "", `<div id="harmonogramWrap"></div>`, false)
    setTimeout(() => renderMultiDayHarmonogram(), 0)
  }else{
    panel.innerHTML = ""
  }
  const sec = document.getElementById("evExtraSec"); if(sec) sec.style.display = panel.innerHTML.trim() ? "" : "none"
  panel.querySelectorAll("details.ev-acc").forEach(evAccUpdate)
  evProgress()
}

// =============================================
// RIDER — Garant, Přípravné akce, Ukončení akce
// (harmonogram koncertu se skladbami přidáme později)
// =============================================

let RIDER_OPEN = false
let TODO_SABLONY = []   // vlastní šablony úkolů (Nastavení), načtou se při otevření podkladů

async function loadTodoSablony(){
  try{
    const r = await api("gettodosablony")
    TODO_SABLONY = Array.isArray(r) ? r : []
  }catch(e){ /* zůstane poslední známý seznam, vestavěná šablona funguje dál */ }
}

function toggleRiderAccordion(){
  RIDER_OPEN = !RIDER_OPEN
  const panel   = document.getElementById("riderPanel")
  const chevron = document.getElementById("chevronRider")
  if(RIDER_OPEN){
    renderRiderPanel()
    // šablony se doptají na pozadí; změní-li se seznam, panel se vykreslí znovu (rider je v paměti, nic se neztratí)
    const before = JSON.stringify(TODO_SABLONY)
    loadTodoSablony().then(() => { if(RIDER_OPEN && JSON.stringify(TODO_SABLONY) !== before) renderRiderPanel() })
  }
  if(panel) tenAcc.set(panel, RIDER_OPEN, { display: "block", chevs: [chevron] })
}

function renderRiderToggleHtml(){
  return `
    <div style="margin-top:16px;border-top:1px solid rgba(128,128,128,0.15);padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleRiderAccordion()">
        <span style="font-weight:600;font-size:15px">Vyplnit podrobnosti pro 10space projekt</span>
        <span id="chevronRider" data-acc="${RIDER_OPEN ? "open" : "closed"}">${RIDER_OPEN ? "‹" : "›"}</span>
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
      <span class="small">Člen zodpovědný za organizační průběh akce. Jeho e-mail a telefon uvidí spolupracující skupiny ve sdíleném odkazu projektu (10space).</span>
    </label>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Přípravné akce</span>
      <div id="riderPripravneList" style="margin-top:8px">
        ${renderRiderListHtml('pripravne_akce')}
      </div>
      <button type="button" class="btn-secondary" onclick="addRiderRow('pripravne_akce')" style="width:100%;margin-top:8px">+ Přidat položku</button>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Harmonogram koncertu</span>
      <div id="riderHarmonogramList" style="margin-top:8px">
        ${renderRiderHarmonogramHtml()}
      </div>
      <div class="btn-group" style="margin-top:8px;flex-wrap:wrap">
        <button type="button" class="btn-secondary" onclick="addRiderBlokZeSkladeb()">+ Blok ze skladeb</button>
        <button type="button" class="btn-secondary" onclick="addRiderHarmonogramItem('moderace')">+ Moderace</button>
        <button type="button" class="btn-secondary" onclick="addRiderHarmonogramItem('pribeh')">+ Příchod/odchod</button>
        <button type="button" class="btn-secondary" onclick="addRiderHarmonogramItem('spolecna')">+ Společná skladba</button>
      </div>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">Ukončení akce</span>
      <div id="riderUkonceniList" style="margin-top:8px">
        ${renderRiderListHtml('ukonceni')}
      </div>
      <button type="button" class="btn-secondary" onclick="addRiderRow('ukonceni')" style="width:100%;margin-top:8px">+ Přidat položku</button>
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
        <button type="button" class="btn-secondary" onclick="addRiderTodoItem('todo_pred')">+ Přidat úkol</button>
        ${renderRiderTodoTemplatePicker('todo_pred')}
        <button type="button" class="btn-secondary" onclick="addRiderTodoTemplate('todo_pred')">+ Přidat šablonu</button>
      </div>
    </div>

    <div style="margin-top:16px">
      <span class="small" style="font-weight:600">To-do — v den koncertu</span>
      <div id="riderTodoDenList" style="margin-top:8px">
        ${renderRiderTodoHtml('todo_den')}
      </div>
      <div class="btn-group" style="margin-top:8px">
        <button type="button" class="btn-secondary" onclick="addRiderTodoItem('todo_den')">+ Přidat úkol</button>
        ${renderRiderTodoTemplatePicker('todo_den')}
        <button type="button" class="btn-secondary" onclick="addRiderTodoTemplate('todo_den')">+ Přidat šablonu</button>
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
      <button class="btn-danger" type="button" onclick="removeRiderRow('${key}', ${idx})" style="width:auto;padding:8px 10px;flex-shrink:0">✕</button>
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
        <button class="btn-danger" type="button" onclick="removeRiderHarmonogramItem(${idx})" style="width:auto;padding:6px 10px">✕</button>
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
              <button class="btn-danger" type="button" onclick="removeSongFromRiderBlock(${idx}, ${sIdx})" style="width:auto;padding:2px 8px;font-size:11px">✕</button>
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
  const mirror = fazeKey === "todo_pred" ? mkMirrorHtml(window.EDIT_EVENT?.MARKETING) : ""
  return mirror + items.map((item, idx) => `
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
      <button class="btn-danger" type="button" onclick="removeRiderTodoItem('${fazeKey}', ${idx})" style="width:auto;padding:6px 10px;flex-shrink:0">✕</button>
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

function renderRiderTodoTemplatePicker(fazeKey){
  if(!TODO_SABLONY.length) return ""
  return `<select id="riderTodoSablona_${fazeKey}" aria-label="Šablona úkolů" style="width:auto;max-width:100%">
    <option value="">Vestavěná šablona</option>
    ${TODO_SABLONY.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nazev)}</option>`).join("")}
  </select>`
}

function addRiderTodoTemplate(fazeKey){
  const rider = getRiderData()
  if(!Array.isArray(rider[fazeKey])) rider[fazeKey] = []
  const chosen = TODO_SABLONY.find(s => s.id === document.getElementById("riderTodoSablona_" + fazeKey)?.value)
  const template = chosen ? chosen.polozky
    : fazeKey === "todo_pred" ? RIDER_TODO_TEMPLATE_PRED : RIDER_TODO_TEMPLATE_DEN
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
      <button class="btn-danger" type="button" onclick="removeHarmonogramRow(${idx})" style="width:auto;padding:8px 10px;flex-shrink:0">✕</button>
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

// Auta členů z profilů: window.AUTA = { klíč e-mailu: { id auta: {nazev, mist, palivo, spotreba, vychozi} } }
const autaKey = email => String(email || "").toLowerCase().replace(/\./g, "_").replace(/@/g, "_")

async function loadAuta(){
  try{ window.AUTA = (await api("auta")) || {} }catch(e){ window.AUTA = window.AUTA || {} }
  window.AUTA_AT = Date.now()
}

// =============================================
// DOPRAVA: interaktivní karta v detailu akce (Doprava: Auta)
// Člen si vezme auto z profilu nebo carsharing (jen počet volných míst), ostatní si vyberou, s kým pojedou.
// Zapisuje se přes api("dopravazmena") do pole doprava_posadky; formulář akce posádky neupravuje.
// =============================================

window.DOPRAVA_UI = window.DOPRAVA_UI || {eventId: null, open: false, auto: "", volna: 3, busy: false, admin: false, moje: false, draft: null, ops: []}
const dopravaUiNew = eventId => ({eventId, open: false, auto: "", volna: 3, busy: false, admin: false, moje: false, draft: null, ops: []})

function dopravaJa(){
  const email = String(MEMBER_EMAIL || "").toLowerCase()
  const m = (window.MEMBERS || []).find(m => String(m.EMAIL || m.email || "").toLowerCase() === email)
  if(!m) return null
  const role = String(m.ROLE || m.role || "").toUpperCase()
  return {id: m.ID || m.id, host: role === "GUEST", admin: role === "ADMIN" || role === "OWNER"}
}

// Auta člena z profilu (window.AUTA se čte pro všechny členy, administrátor tak vybírá z aut řidiče)
function dopravaAutaClena(memberId){
  const m = (window.MEMBERS || []).find(m => (m.ID || m.id) === memberId)
  const mine = (window.AUTA || {})[autaKey(m?.EMAIL || m?.email)] || {}
  return Object.entries(mine).map(([id, a]) => ({id, ...a}))
    .sort((x, y) => (y.vychozi ? 1 : 0) - (x.vychozi ? 1 : 0) || String(x.nazev).localeCompare(String(y.nazev), "cs"))
}
const dopravaMojeAuta = () => dopravaAutaClena(dopravaJa()?.id)

function dopravaCardHtml(){
  const {eventId, event} = window.DOPRAVA_EVENT || {}
  if(!event) return ""
  let posadky = []
  try{ posadky = event.DOPRAVA_POSADKY ? JSON.parse(event.DOPRAVA_POSADKY) : [] }catch(e){ posadky = [] }
  if(!Array.isArray(posadky)) posadky = []
  const ui = window.DOPRAVA_UI
  if(ui.draft) posadky = ui.draft       // režim úprav: pracuje se s rozpracovanou verzí, na server jde až po Uložit
  const ja = dopravaJa()
  const muzu = !!ja && !ja.host
  const adminRezim = !!ja && ja.admin && ui.admin       // administrátor po kliknutí na „Upravit (admin)“
  const ridicRezim = !!ja && !ja.host && ui.moje && !adminRezim   // řidič po kliknutí na „Upravit“ u svého auta
  const upravy = adminRezim || ridicRezim
  const clenove = (window.MEMBERS || []).filter(m => String(m.ROLE || m.role || "").toUpperCase() !== "GUEST")
  const jmeno = id => { const m = (window.MEMBERS || []).find(m => (m.ID || m.id) === id); return m ? (m.NAME || m.name) : "—" }
  const jedu = muzu ? posadky.find(p => Array.isArray(p.posadka) && p.posadka.includes(ja.id)) : null
  const maMisto = !!(muzu && (posadky.some(p => p.ridic === ja.id) || jedu))
  const bezMista = clenove.filter(m => { const id = m.ID || m.id; return !posadky.some(p => p.ridic === id || (Array.isArray(p.posadka) && p.posadka.includes(id))) })
  const q = v => escapeHtml(String(v ?? "").replace(/['"\\]/g, ""))
  const box = "padding:12px;margin:12px 0;border:1px solid rgba(128,128,128,0.2);border-radius:12px"
  const volnaTxt = n => n <= 0 ? "plno" : `${n} ${n === 1 ? "volné místo" : (n <= 4 ? "volná místa" : "volných míst")}`

  // možnosti auta: auta daného řidiče z profilu + carsharing (+ uložené auto, které řidič mezitím smazal)
  const moznosti = (ridic, vybrane, ulozene) => {
    const auta = dopravaAutaClena(ridic)
    if(ulozene && ulozene.auto_id && ulozene.auto_id !== "carsharing" && !auta.some(a => a.id === ulozene.auto_id)) auta.push({id: ulozene.auto_id, nazev: ulozene.auto_nazev || "Auto", mist: ulozene.auto_mist})
    return (vybrane ? "" : `<option value="" selected disabled>Bez určení</option>`)
      + auta.map(a => `<option value="${escapeHtml(a.id)}" ${vybrane === a.id ? "selected" : ""}>${escapeHtml(a.nazev)} (${Number(a.mist) || "?"} míst)</option>`).join("")
      + `<option value="carsharing" ${vybrane === "carsharing" ? "selected" : ""}>Carsharing</option>`
  }

  const form = () => {
    const auta = dopravaMojeAuta()
    const vybrane = ui.auto || (auta[0] ? auta[0].id : "carsharing")
    return `
      <div style="${box}">
        <label style="display:block;margin:0">Čím pojedeš<br>
          <select onchange="dopravaVyberAuto(this.value)">${moznosti(ja.id, vybrane)}</select>
        </label>
        ${vybrane === "carsharing" ? `
        <label style="display:block;margin:10px 0 0">Volná místa pro ostatní (bez tebe)<br>
          <input type="number" id="dopravaVolna" min="1" max="8" step="1" inputmode="numeric" value="${Number(ui.volna) || 3}" onchange="dopravaVolna(this.value)">
        </label>` : (auta.length ? "" : `<div class="small" style="margin-top:8px">Vlastní auto si můžeš přidat v Nastavení → Moje auta.</div>`)}
        <div class="btn-group" style="margin-top:12px">
          <button type="button" class="btn-primary" ${ui.busy ? "disabled" : ""} onclick="dopravaVezmu()">Potvrdit</button>
          <button type="button" class="btn-secondary" onclick="dopravaForm(false)">Zrušit</button>
        </div>
      </div>`
  }

  const hlavicka = (p, o, barva) => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="min-width:0"><b>${escapeHtml(jmeno(p.ridic))}</b>
          <span class="small"> · ${escapeHtml(p.nazev ? p.nazev + " · " : "")}${escapeHtml(p.auto_nazev || "auto")}</span></div>
        ${o ? `<span style="flex:none;font-size:13px;font-weight:600;color:${barva};background:${barva}22;padding:2px 10px;border-radius:999px">${o.obs}/${o.mist}</span>` : ""}
      </div>`

  // administrátor, režim úpravy: vše se ukládá hned po změně, bez dalších tlačítek
  const kartaUprava = (p, omezene) => {
    const o = posadkaObsazenost(p)
    const barva = !o ? "#8e8e93" : (o.volno < 0 ? "#ff3b30" : (o.volno === 0 ? "#ff9500" : "#34c759"))
    const spolu = Array.isArray(p.posadka) ? p.posadka : []
    const r = q(p.ridic)
    const lbl = "display:block;margin:10px 0 0"
    return `
    <div style="padding:14px 0;border-top:1px solid rgba(128,128,128,0.1)">
      ${hlavicka(p, o, barva)}
      ${omezene ? "" : `<label style="${lbl}">Auto<br><select onchange="dopravaAdminAuto('${r}', this.value)">${moznosti(p.ridic, p.auto_id || "", p)}</select></label>`}
      <div style="display:flex;gap:10px;align-items:flex-end">
        ${omezene ? (p.carsharing ? `<label style="${lbl};flex:1">Volná místa<br><input type="number" min="1" max="8" step="1" inputmode="numeric" value="${Math.max(1, (Number(p.auto_mist) || 2) - 1)}" onchange="dopravaRidicVolna('${r}', this.value)"></label>` : "")
        : `<label style="${lbl};flex:1">Míst včetně řidiče<br><input type="number" min="2" max="9" step="1" inputmode="numeric" value="${Number(p.auto_mist) || ""}" onchange="dopravaAdminMist('${r}', this.value)"></label>`}
        <label style="${lbl};flex:1">Pro jiné než členy<br><input type="number" min="0" max="8" step="1" inputmode="numeric" value="${Number(p.auto_rezervovano) || 0}" onchange="dopravaAdminRez('${r}', this.value)"></label>
      </div>
      <div style="${lbl}"><span class="small">Spolucestující</span>
        ${spolu.length ? spolu.map(id => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px">
          <span>${escapeHtml(jmeno(id))}</span>
          <button type="button" class="btn-secondary" onclick="dopravaOdebrat('${r}', '${q(id)}')">Odebrat</button></div>`).join("") : `<div class="small" style="margin-top:4px">Zatím nikdo.</div>`}
        ${bezMista.length && !omezene ? `<select style="margin-top:8px" onchange="dopravaAdminPridat('${r}', this.value)"><option value="">+ Přidat spolucestujícího…</option>
          ${bezMista.map(m => `<option value="${escapeHtml(m.ID || m.id)}">${escapeHtml(m.NAME || m.name)}</option>`).join("")}</select>` : ""}
      </div>
      <div class="btn-group" style="margin-top:12px"><button type="button" class="btn-danger" onclick="dopravaZrusit('${r}')">Zrušit auto</button></div>
    </div>`
  }

  const karta = p => {
    if(adminRezim) return kartaUprava(p)
    if(ridicRezim && ja && p.ridic === ja.id) return kartaUprava(p, true)
    const o = posadkaObsazenost(p)
    const barva = !o ? "" : (o.volno < 0 ? "#ff3b30" : (o.volno === 0 ? "#ff9500" : "#34c759"))
    const seg = !o ? "" : (() => {
      const celkem = Math.min(o.mist, 12), clenoveObs = Math.max(0, o.obs - o.rez)
      return Array.from({length: celkem}, (_, i) => {
        const bg = o.volno < 0 ? "#ff3b30" : (i < clenoveObs ? barva : (i < clenoveObs + o.rez ? "rgba(128,128,128,0.55)" : "rgba(128,128,128,0.2)"))
        return `<span style="flex:1;height:6px;border-radius:3px;background:${bg}"></span>`
      }).join("")
    })()
    const moje = !!ja && p.ridic === ja.id
    const spolu = Array.isArray(p.posadka) ? p.posadka : []
    const plno = o && o.volno <= 0
    const r = q(p.ridic)
    return `
    <div style="padding:14px 0;border-top:1px solid rgba(128,128,128,0.1)">
      ${hlavicka(p, o, barva)}
      ${o ? `<div style="display:flex;gap:4px;margin:10px 0 8px">${seg}</div>
      <div class="small"><b style="color:${barva}">${o.volno < 0 ? `přeplněno o ${-o.volno}` : volnaTxt(o.volno)}</b>${o.rez ? ` · ${o.rez} pro jiné než členy` : ""}</div>` : ""}
      ${spolu.length ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
        ${spolu.map(id => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span>${escapeHtml(jmeno(id))}${ja && id === ja.id ? ` <span class="small">(ty)</span>` : ""}</span>
          ${moje ? `<button type="button" class="btn-secondary" onclick="dopravaOdebrat('${r}', '${q(id)}')">Odebrat</button>` : ""}
        </div>`).join("")}</div>` : ""}
      ${ridicRezim ? "" : `<div class="btn-group" style="margin-top:12px">
        ${muzu && !maMisto && !plno ? `<button type="button" class="btn-primary" onclick="dopravaPridat('${r}')">Pojedu tímto autem</button>` : ""}
        ${muzu && !maMisto && plno ? `<span class="small">Auto je plné.</span>` : ""}
        ${muzu && jedu === p ? `<button type="button" class="btn-secondary" onclick="dopravaOdejit()">Nepojedu</button>` : ""}
        ${moje ? `<button type="button" class="btn-secondary" onclick="dopravaRidic(true)">Upravit</button>` : ""}
        ${moje && p.carsharing ? `<button type="button" class="btn-secondary" onclick="dopravaMista()">Změnit počet míst</button>` : ""}
        ${moje ? `<button type="button" class="btn-danger" onclick="dopravaZrusit('${r}')">Zrušit auto</button>` : ""}
      </div>`}
    </div>`
  }

  return `
    <div class="event-label" style="margin:0">Doprava · auta</div>
    ${!upravy && muzu && !maMisto && !ui.open ? `<div class="btn-group" style="margin-top:10px"><button type="button" class="btn-primary" onclick="dopravaForm(true)">Vezmu auto</button></div>` : ""}
    ${upravy ? `<div class="small" style="margin-top:8px">Režim úprav${ridicRezim ? " tvého auta" : ""}: změny se uloží až tlačítkem Uložit, Zrušit je zahodí.</div>` : ""}
    ${!upravy && muzu && !maMisto && ui.open ? form() : ""}
    ${posadky.length ? posadky.map(karta).join("") : `<div class="small" style="margin-top:12px">Zatím nikdo nebere auto.</div>`}
    ${adminRezim && bezMista.length ? `<select style="margin-top:12px" onchange="dopravaAdminNovy(this.value)"><option value="">+ Přidat auto za řidiče…</option>
      ${bezMista.map(m => `<option value="${escapeHtml(m.ID || m.id)}">${escapeHtml(m.NAME || m.name)}</option>`).join("")}</select>` : ""}
    ${!muzu && ja && ja.host ? `<div class="small" style="margin-top:8px">Dopravu mohou měnit jen členové.</div>` : ""}
    ${(ja && ja.admin) || ridicRezim ? `<div class="btn-group" style="margin-top:12px">${upravy
      ? `<button type="button" class="btn-primary" ${ui.busy ? "disabled" : ""} onclick="dopravaAdminUlozit()">Uložit</button><button type="button" class="btn-secondary" ${ui.busy ? "disabled" : ""} onclick="dopravaAdmin(false)">Zrušit</button>`
      : `<button type="button" class="btn-secondary" onclick="dopravaAdmin(true)">Upravit (admin)</button>`}</div>` : ""}`
}

function renderDopravaCard(eventId, event){
  window.DOPRAVA_EVENT = {eventId, event}
  if(window.DOPRAVA_UI.eventId !== eventId) window.DOPRAVA_UI = dopravaUiNew(eventId)
  if(!window.AUTA){   // auta z profilů se dotáhnou při prvním zobrazení karty
    window.AUTA = {}
    loadAuta().then(refreshDopravaCard)
  }
  return `<div class="event-card" id="dopravaCard" style="margin-bottom:16px;padding:16px">${dopravaCardHtml()}</div>`
}

function refreshDopravaCard(){
  const el = document.getElementById("dopravaCard")
  if(el) el.innerHTML = dopravaCardHtml()
}

const dopravaCelaPosadka = () => { if(window.DOPRAVA_UI.draft) return window.DOPRAVA_UI.draft; try{ return JSON.parse(window.DOPRAVA_EVENT?.event?.DOPRAVA_POSADKY || "[]") }catch(e){ return [] } }
const dopravaCislo = (v, min, max, def) => Math.max(min, Math.min(max, Math.floor(Number(v) || def)))

function dopravaForm(open){ window.DOPRAVA_UI.open = open; refreshDopravaCard() }
function dopravaVyberAuto(v){ window.DOPRAVA_UI.auto = v; refreshDopravaCard() }
function dopravaVolna(v){ window.DOPRAVA_UI.volna = dopravaCislo(v, 1, 8, 1) }

async function dopravaOp(op, hotovo){
  const ui = window.DOPRAVA_UI, id = ui.eventId
  if(ui.busy || !id) return
  ui.busy = true
  let ok = false
  try{
    await api("dopravazmena", {id, ...op})
    ui.open = false
    showToast(hotovo || "Uloženo ✓")
    ok = true
  }catch(e){
    showToast(e.message || "Změnu se nepodařilo uložit")
  }
  ui.busy = false
  invalidateCache("eventdetail", id)
  if(ACTIVE_DETAIL_ID === id) openEvent(id)
  return ok
}

function dopravaVezmu(){
  const ui = window.DOPRAVA_UI
  const auto = ui.auto || (dopravaMojeAuta()[0]?.id) || "carsharing"
  const el = document.getElementById("dopravaVolna")
  if(el) dopravaVolna(el.value)
  dopravaOp({op: "vezmu", auto, volna: ui.volna}, "Auto přidáno ✓")
}
function dopravaPridat(ridic){ dopravaOp({op: "pridat", ridic}, "Jedeš s ním ✓") }
function dopravaOdejit(){ dopravaOp({op: "odejit"}, "Místo uvolněno") }
function dopravaOdebrat(ridic, clen){ dopravaZmena({op: "odebrat", ridic, clen}, "Odebráno") }
function dopravaZrusit(ridic){
  const moje = dopravaCelaPosadka().find(x => x.ridic === ridic)
  const n = moje && Array.isArray(moje.posadka) ? moje.posadka.length : 0
  if(!window.DOPRAVA_UI.draft && !confirm(n ? `Zrušit auto? Spolucestující (${n}) zůstanou bez dopravy.` : "Zrušit auto?")) return
  dopravaZmena({op: "zrusit", ridic}, "Auto zrušeno")
}
function dopravaMista(){
  const v = prompt("Kolik volných míst pro ostatní (bez tebe)?", "3")
  if(v === null) return
  dopravaOp({op: "mista", volna: v}, "Počet míst změněn ✓")
}
function dopravaRezervace(ridic){
  const v = prompt("Kolik míst v autě obsadí jiní než členové sboru (rodina, hosté)?", "0")
  if(v === null) return
  dopravaOp({op: "rezervace", ridic, pocet: v}, "Uloženo ✓")
}

// administrátor: režim úprav pracuje s rozpracovanou verzí (ui.draft); na server jde dávka změn až po Uložit
const dopravaAutaObj = ridic => Object.fromEntries(dopravaAutaClena(ridic).map(a => [a.id, a]))
function dopravaRezim(typ){   // typ: "admin" (všechna auta), "moje" (jen auto přihlášeného řidiče) nebo null (konec úprav)
  const ui = window.DOPRAVA_UI
  ui.admin = typ === "admin"
  ui.moje = typ === "moje"
  ui.draft = typ ? JSON.parse(JSON.stringify(dopravaCelaPosadka())) : null
  ui.ops = []
  refreshDopravaCard()
}
const dopravaAdmin = zapnout => dopravaRezim(zapnout ? "admin" : null)
const dopravaRidic = zapnout => dopravaRezim(zapnout ? "moje" : null)
function dopravaRidicVolna(ridic, v){ dopravaZmena({op: "mista", ridic, volna: v}) }
// změna se v režimu úprav jen zapíše do rozpracované verze (stejná kontrola jako na serveru), jinak se pošle hned
function dopravaZmena(op, hotovo){
  const ui = window.DOPRAVA_UI
  if(!ui.draft) return dopravaOp(op, hotovo)
  try{
    ui.draft = window.dopravaApply(ui.draft, op, {me: dopravaJa()?.id, admin: !!dopravaJa()?.admin, autaDe: dopravaAutaObj})
    ui.ops.push(op)
  }catch(e){ showToast(e.message || "Změna se nepodařila") }
  refreshDopravaCard()
}
async function dopravaAdminUlozit(){
  const ui = window.DOPRAVA_UI
  if(ui.busy) return
  if(!ui.ops.length){ dopravaAdmin(false); return }
  refreshDopravaCard()
  if(await dopravaOp({op: "davka", ops: ui.ops}, "Doprava uložena ✓")){ ui.admin = false; ui.moje = false; ui.draft = null; ui.ops = [] }
  refreshDopravaCard()
}
const dopravaCrew = ridic => dopravaCelaPosadka().find(x => x.ridic === ridic)
function dopravaAdminAuto(ridic, auto){
  const p = dopravaCrew(ridic)
  if(!p || !auto) return
  const a = dopravaAutaClena(ridic).find(x => x.id === auto)
  const mist = a && Number(a.mist) ? Number(a.mist) : (Number(p.auto_mist) || (auto === "carsharing" ? 4 : 5))   // místa z profilu auta, jinak beze změny
  dopravaZmena({op: "auto", ridic, auto, mist})
}
function dopravaAdminMist(ridic, v){
  const p = dopravaCrew(ridic)
  if(p) dopravaZmena({op: "auto", ridic, auto: p.auto_id || "", mist: v})
}
function dopravaAdminRez(ridic, v){ dopravaZmena({op: "rezervace", ridic, pocet: v}) }
function dopravaAdminPridat(ridic, clen){
  if(clen) dopravaZmena({op: "pridat", ridic, clen})
}
function dopravaAdminNovy(clen){   // auto za řidiče: výchozí auto z jeho profilu (jinak carsharing), počet míst se pak upraví v kartě
  if(!clen) return
  const auta = dopravaAutaClena(clen)
  dopravaZmena(auta[0] ? {op: "vezmu", za: clen, auto: auta[0].id} : {op: "vezmu", za: clen, auto: "carsharing", volna: 3})
}

window.dopravaForm = dopravaForm
window.dopravaVyberAuto = dopravaVyberAuto
window.dopravaVolna = dopravaVolna
window.dopravaVezmu = dopravaVezmu
window.dopravaPridat = dopravaPridat
window.dopravaOdejit = dopravaOdejit
window.dopravaOdebrat = dopravaOdebrat
window.dopravaZrusit = dopravaZrusit
window.dopravaMista = dopravaMista
window.dopravaRezervace = dopravaRezervace
window.dopravaAdmin = dopravaAdmin
window.dopravaRidic = dopravaRidic
window.dopravaRidicVolna = dopravaRidicVolna
window.dopravaAdminUlozit = dopravaAdminUlozit
window.dopravaAdminAuto = dopravaAdminAuto
window.dopravaAdminMist = dopravaAdminMist
window.dopravaAdminRez = dopravaAdminRez
window.dopravaAdminPridat = dopravaAdminPridat
window.dopravaAdminNovy = dopravaAdminNovy

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

  // Překreslení téhož detailu (po úpravě úkolu, změně od někoho jiného…): zachovat rozbalené sekce a pozici na stránce
  // a nezakrývat obsah načítacím kolečkem, ať uživatel nepřijde o místo, kde skončil.
  const refreshing = ACTIVE_DETAIL_ID === id && !!document.querySelector('[id^="accBody_"]')
  const keepOpen = refreshing
    ? [...document.querySelectorAll('[id^="accBody_"]')].filter(b => b.style.display !== "none" && getComputedStyle(b).display !== "none").map(b => b.id.slice(8))
    : []
  const keepScroll = refreshing ? saveScroll() : 0
  ACTIVE_DETAIL_ID = id

  if(!refreshing) setLoading()

  try{
    const data       = await cachedApi("eventdetail", {id})
    const event      = data.event      || {}
    const program    = data.program    || []
    const attendance = data.attendance || []
    const mkTasks    = Array.isArray(event.MARKETING) ? event.MARKETING : []
    const mkEdit     = await mkCanEdit()
    const mkAccess   = await mkHasMarketing()

    // garant akce: jméno z rideru (kontakt na něj je jen ve sdíleném projektu v 10space)
    let garantJmeno = ""
    try{
      const gid = event.RIDER ? JSON.parse(event.RIDER).garant : ""
      const g = gid ? (window.MEMBERS || []).find(m => (m.ID || m.id) === gid) : null
      garantJmeno = g ? (g.NAME || g.name || "") : ""
    }catch(e){ /* poškozený rider: garant se nezobrazí */ }

    // --- HLAVIČKA ---
   let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``
   html += `
   <button onclick="renderEvents()" style="margin-bottom:16px">← Zpět</button>
     <h2 style="margin-bottom:4px">${escapeHtml(event.NAME)}</h2>
   ${event.TEMPLATE_ID ? `<div style="font-size:11px;color:#8e8e93;margin-bottom:8px;letter-spacing:0.05em">Opakující se akce</div>` : ""}
        <div class="card" style="margin-bottom:16px">
          <div class="info-row">
            <span class="info-label">Typ akce</span>
            <span class="info-value">${escapeHtml(event.TYPE) || "Zkouška"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Datum</span>
            <span class="info-value">${formatDate(event.DATE)}${event.DATE_END ? " – " + formatDate(event.DATE_END) : ""}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Čas</span>
            <span class="info-value">${event.START ? formatTime(event.START) : "—"}${event.END ? " – " + formatTime(event.END) : ""}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Místo</span>
            <span class="info-value">${escapeHtml(event.PLACE) || (event.CALL_URL ? "Online" : "—")}</span>
          </div>
          ${garantJmeno ? `
          <div class="info-row">
            <span class="info-label">Garant</span>
            <span class="info-value">${escapeHtml(garantJmeno)}</span>
          </div>
          ` : ""}
          ${event.NOTE ? `
          <div class="info-row">
            <span class="info-label">Poznámka</span>
            <span class="info-value" style="white-space:pre-wrap">${escapeHtml(event.NOTE)}</span>
          </div>
          ` : ""}
   
          ${(event.PLACE || event.CALL_URL) ? `
            <div class="btn-group" style="margin-top:12px">
   ${event.PLACE ? `
                <a class="ar-btn" href="https://maps.google.com/?q=${encodeURIComponent(event.PLACE)}" target="_blank"
                  style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  Navigovat
                </a>
              ` : ""}
   ${event.CALL_URL ? `
                <a class="ar-btn" href="${escapeHtml(event.CALL_URL)}" target="_blank"
                  style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;min-height:36px;background:var(--btn-bg);border:1px solid var(--card-border);border-radius:8px;font-size:14px;font-weight:600;color:#007aff;text-decoration:none">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Připojit se
                </a>
              ` : ""}
            </div>
          ` : ""}
        </div>`

    // --- DOPRAVA (interaktivní karta: kdo vezme auto a s kým kdo jede) ---
    if(event.DOPRAVA === "Auta") html += renderDopravaCard(id, event)

    // --- DALŠÍ INFORMACE ---
    if(event.SRAZ || event.OBLECENI || event.DOPRAVA || event.HARMONOGRAM || event.HOSPODA || event.SPACAKY || event.STRAVA || event.OBLECENI_S){
      html += `<div class="event-card" style="margin-bottom:16px;padding:0">
        <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('info')">
          <span>Další informace</span>
          <span id="accChevron_info" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
        </div>
        <div id="accBody_info" style="display:none;padding:0 16px 16px">
        ${event.SRAZ      ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Sraz</span><b>${escapeHtml(event.SRAZ)}</b></div>` : ""}
        ${event.OBLECENI  ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Dresscode</span><b>${escapeHtml(formatObleceni(event.OBLECENI))}</b></div>` : ""}
        ${event.DOPRAVA ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Doprava</span><b>${escapeHtml(event.DOPRAVA)}</b></div>` : ""}
        ${event.HARMONOGRAM_ITEMS ? renderHarmonogramDetail(event.HARMONOGRAM_ITEMS) : (event.HARMONOGRAM ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block;margin-bottom:4px">Harmonogram akce</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HARMONOGRAM)}</div></div>` : "")}
        ${event.IS_SPOLUPRACE ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Spolupráce</span><b>${escapeHtml(event.SPOLUPRACE_NAZEV || "Ano")}</b></div>` : ""}
        ${event.HOSPODA   ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Hospoda</span><div style="white-space:pre-wrap;font-size:15px">${escapeHtml(event.HOSPODA)}</div></div>` : ""}
        ${event.SPACAKY   ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Bereme spacáky a karimatky?</span><b>${escapeHtml(event.SPACAKY)}</b></div>` : ""}
        ${event.STRAVA    ? `<div style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)"><span class="small" style="display:block">Je tam zajištěná strava?</span><b>${escapeHtml(event.STRAVA)}${event.STRAVA_NOTA ? " — " + escapeHtml(event.STRAVA_NOTA) : ""}</b></div>` : ""}
        ${event.OBLECENI_S ? `<div style="padding:8px 0"><span class="small" style="display:block">Bereme koncertní oblečení?</span><b>${escapeHtml(event.OBLECENI_S)}${event.OBLECENI_S === "Ano" && event.OBLECENI_S_TYP ? " — " + escapeHtml(formatObleceni(event.OBLECENI_S_TYP)) : ""}</b></div>` : ""}
        </div>
      </div>`
    }

    // --- GRILOVAČKA ---
    if(event.IS_GRILOVACKA){
     const grilovackaItems = await api("getgrilovacka", {id})
      html += `<div class="event-card" style="margin-bottom:16px;padding:0">
        <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('gril')">
          <span>Co s sebou 🔥</span>
          <span id="accChevron_gril" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
        </div>
        <div id="accBody_gril" style="display:none;padding:0 16px 16px">
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
                      <button class="btn-danger" onclick="deleteGrilovackaItem('${item.ID}','${id}')" style="padding:4px 8px;font-size:11px;width:auto">✕</button>
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
        </div>
      </div>`
    }

    // --- PROGRAM ---
    const mainProgram   = program.filter(p => !p.ENCORE)
    const encoreProgram = program.filter(p => p.ENCORE)
    const programSummary = mainProgram.length
      ? mainProgram.length + " skladeb" + (encoreProgram.length ? " + " + encoreProgram.length + " přídavek" : "")
      : "Program není k dispozici"

    html += `<div class="event-card" style="margin-bottom:16px;padding:0">
      <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('program')">
        <span>Program <span style="text-transform:none;letter-spacing:normal;font-weight:400;color:var(--muted)">· ${programSummary}</span></span>
        <span id="accChevron_program" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
      </div>
      <div id="accBody_program" style="display:none;padding:0 16px 16px">
      ${mainProgram.length ? `
        ${mainProgram.map((p, i) => `
          <div class="event-row">
            <div>
              <b>${i+1}. ${escapeHtml(p.NAME)}</b>
              ${p.AUTHOR ? `<div class="small">${escapeHtml(p.AUTHOR)}</div>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${p.PDF ? `<a href="${escapeHtml(noteLink(p.PDF))}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none;white-space:nowrap">Noty</a>` : ""}
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
                  ${p.PDF ? `<a href="${escapeHtml(noteLink(p.PDF))}" target="_blank" style="font-size:12px;color:#007aff;text-decoration:none;white-space:nowrap">Noty</a>` : ""}
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
      ` : `
        <p class="notice" style="margin:0">Program není k dispozici</p>
        ${(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f2f2f7">
            <button onclick="openProgramEditor('${id}')" style="width:100%">Vytvořit program</button>
          </div>
        ` : ""}
      `}
      </div>
    </div>`

   // --- TO-DO LIST (rider) ---
    if((MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") && (event.RIDER || mkTasks.length)){
      let riderData = {}
      try{ riderData = event.RIDER ? JSON.parse(event.RIDER) : {} }catch(e){ riderData = {} }
      const todoPred = riderData.todo_pred || []
      const todoDen  = riderData.todo_den  || []
      const totalTodos = todoPred.length + todoDen.length
      const doneTodos = todoPred.filter(t => t.done).length + todoDen.filter(t => t.done).length

      if(totalTodos > 0 || mkTasks.length){
        html += `<div class="event-card" style="margin-bottom:16px;padding:0">
          <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('todo')">
            <span>To-do list <span style="text-transform:none;letter-spacing:normal;font-weight:400;color:var(--muted)">· ${doneTodos}/${totalTodos}</span></span>
            <span id="accChevron_todo" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
          </div>
          <div id="accBody_todo" style="display:none;padding:0 16px 16px">
          ${(todoPred.length || mkTasks.length) ? `
            <div style="margin-bottom:12px">
              <span class="small" style="font-weight:600;display:block;margin-bottom:6px">Před koncertem</span>
              ${mkMirrorHtml(mkTasks)}
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
          </div>
        </div>`
      }
    }
     
    // --- MARKETING (úkoly z plánu Marka) ---
    html += renderMarketingHtml(id, event, mkTasks, mkEdit, mkAccess)

    // --- DOCHÁZKA ---
    const myRow    = attendance.find(a => a.EMAIL === MEMBER_EMAIL)
    const myStatus = myRow?.STATUS || ""
    const myReason = myRow?.REASON || ""
    const fin   = event.ATTENDANCE_FINAL === true   // docházka potvrzená administrátorem: platí skutečná účast
    const eff   = a => fin ? (a.ACTUAL === "yes" ? "Přijdu" : "Nepřijdu") : a.STATUS
    const yes   = attendance.filter(a => eff(a) === "Přijdu").length
    const maybe = attendance.filter(a => eff(a) === "Možná").length
    const no    = attendance.filter(a => eff(a) === "Nepřijdu").length
    const open  = attendance.filter(a => !eff(a)).length
    const startedAlready = new Date(event.DATE) <= new Date(new Date().setHours(23,59,59,999))
    const attAdminHtml = (MEMBER_ROLE === "ADMIN" && event.STATUS !== "Zrušená" && startedAlready) ? `
        <div class="att-admin">
          ${fin ? `<div class="small" style="margin-bottom:8px">✓ Docházka potvrzena${event.ATTENDANCE_FINAL_AT ? " " + escapeHtml(formatDate(event.ATTENDANCE_FINAL_AT)) : ""}. Do statistik se počítá skutečná účast.</div>` : `<div class="small" style="margin-bottom:8px">Označ, kdo opravdu přišel. Potvrzená docházka platí do statistik místo toho, co si členové zadali.</div>`}
          <div class="btn-group" data-ar-skip><button class="${fin ? "" : "btn-primary"}" onclick="openAttendanceCheck('${id}')">${fin ? "Upravit docházku" : "Odškrtnout docházku"}</button></div>
        </div>` : ""
    const statusColor = myStatus === "Přijdu" ? "#34c759" : myStatus === "Možná" ? "#ff9f0a" : myStatus === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
    const statusText  = myStatus || "Nevyplněno"

    html += `<div class="event-card" style="margin-bottom:16px;padding:0">
      <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('attendance')">
        <span>Docházka <span style="text-transform:none;letter-spacing:normal;font-weight:400;color:${statusColor}">· ${statusText}</span></span>
        <span id="accChevron_attendance" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
      </div>
      <div id="accBody_attendance" style="display:none;padding:0 16px 16px">
      ${event.STATUS === "Zrušená" ? `
        <div style="padding:10px 0;color:#ff3b30;font-weight:600">Akce byla zrušena</div>
      ` : MEMBER_EMAIL ? `
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding-bottom:12px;border-bottom:1px solid rgba(128,128,128,0.1)" onclick="event.stopPropagation();toggleAttendanceAccordion('${id}')">
          <div>
            <div style="font-weight:600;color:${statusColor}">${statusText}</div>
            ${myReason ? `<div class="small" style="margin-top:2px">${escapeHtml(myReason)}</div>` : ""}
          </div>
          <span style="color:var(--muted);font-size:18px" id="chevronAttendance_${id}">›</span>
        </div>
        <div id="attendanceDetail_${id}" style="display:none;padding:12px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
          <div class="small" style="font-weight:600;margin-bottom:8px">Změnit účast</div>
          <div class="btn-group" data-ar-skip>
            <button onclick="doAttendance('${id}','Přijdu')">Přijdu</button>
            <button onclick="doAttendanceMozna('${id}')">Možná</button>
            <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>
          </div>
        </div>
      ` : `<div class="muted">Vyber člena</div>`}
      <div style="margin-top:12px">
        ${attAdminHtml}
        <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
          <span class="small">✓ ${fin ? "Přišlo" : "Přijdu"}: <b>${yes}</b></span>
          ${fin ? "" : `<span class="small">? Možná: <b>${maybe}</b></span>`}
          <span class="small">✗ ${fin ? "Nepřišlo" : "Nepřijdu"}: <b>${no}</b></span>
          ${fin ? "" : `<span class="small">— Nevyplněno: <b>${open}</b></span>`}
        </div>
        ${attendance.map(a => {
          const st    = eff(a)
          const icon  = st === "Přijdu"   ? iconCheck() :
                        st === "Možná"    ? iconMaybe() :
                        st === "Nepřijdu" ? iconClose() : iconQuestion()
          const color = st === "Přijdu"   ? "#34c759" :
                        st === "Možná"    ? "#ff9f0a" :
                        st === "Nepřijdu" ? "#ff3b30" : "#8e8e93"
          return `<div class="small" style="padding:4px 0;color:${color};border-bottom:1px solid rgba(128,128,128,0.08)">
            <span class="icon" style="color:${color}">${icon}</span>
            ${escapeHtml(a.NAME)}
            ${fin && a.STATUS && a.STATUS !== st ? `<span style="color:#999"> · přihlášen(a): ${escapeHtml(a.STATUS)}</span>` : ""}
            ${a.REASON ? `<span style="color:#999"> · ${escapeHtml(a.REASON)}</span>` : ""}
          </div>`
        }).join("")}
      </div>
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
          <button class="btn-danger" onclick="openDeleteEventModal('${id}')">Smazat</button>
        </div>`
      }

      html += `</div>`
    }

        if(isDesktop) html += `</div>`  
        container().innerHTML = html

    if(refreshing){
      keepOpen.forEach(key => {
        const body = document.getElementById("accBody_" + key)
        if(!body) return
        // bez animace: sekce má být hned otevřená, jak ji uživatel nechal
        body.style.display = "block"
        body.setAttribute("data-acc", "open")
        body.classList.add("open")
        document.getElementById("accChevron_" + key)?.setAttribute("data-acc", "open")
      })
      restoreScroll(keepScroll)
    }

    saveState()

  }catch(err){
    setError("Chyba při načítání akce: " + (err?.message || err))
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

// =============================================
// MARKETING – úkoly z plánu Marka (/akce/{id}/marketing). Plán vzniká v Markovi („Převést do 10base“),
// tady se odškrtává a upravuje. V podkladech (To-do před koncertem) se tytéž úkoly jen zrcadlí, šedě a bez úprav.
// =============================================
const MK_KANALY = {
  facebook: "Facebook", instagram: "Instagram", plakat: "Plakát", newsletter: "Newsletter",
  udalost: "Událost na Facebooku", mistni: "Místní kanály", osobne: "Osobní pozvánky"
}
// Kanály úkolu jako text: víc kanálů se vypíše čárkou, starší úkoly mají jen `kanal`
function mkKanalyText(t){
  const k = Array.isArray(t?.kanaly) && t.kanaly.length ? t.kanaly : [t?.kanal].filter(Boolean)
  return k.map(x => MK_KANALY[x] || x).join(", ")
}
let MK_EDIT = null   // smí upravovat marketingové úkoly (ADMIN, ART, nebo člen v /marketingAccess)

const MAREK_URL = "https://marek.10men.cz/"
let MK_ACCESS = null   // člen je v /marketingAccess, tedy smí do Marka (Marek jinak vrátí 403)

async function mkHasMarketing(){
  if(MK_ACCESS === null){
    try{ MK_ACCESS = (await api("mymarketingaccess")) === true }catch(e){ return false }
  }
  return MK_ACCESS
}

async function mkCanEdit(){
  if(MEMBER_ROLE === "ADMIN" || MEMBER_ROLE === "ART") return true
  if(MK_EDIT === null){
    try{ MK_EDIT = (await api("mymarketingaccess")) === true }catch(e){ return false }
  }
  return MK_EDIT
}

const mkToday = () => new Date().toLocaleDateString("sv-SE")   // YYYY-MM-DD v místním čase
const mkLate  = t => !t.done && !!t.datum && t.datum < mkToday()
function mkWhen(t){
  if(!t.datum) return ""
  const d = new Date(t.datum + "T12:00:00")
  const den = d.toLocaleDateString("cs-CZ", {weekday: "short", day: "numeric", month: "numeric"})
  return den + (t.cas ? " · " + t.cas : "")
}
const mkTitle = t => t.ucel || t.napad || "Úkol"

function mkMirrorHtml(tasks){
  if(!Array.isArray(tasks) || !tasks.length) return ""
  return tasks.map(t => `
    <div data-mk-mirror="${escapeHtml(t.id)}" title="Spravuje se v sekci Marketing" style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.08);opacity:0.5;cursor:default">
      <input type="checkbox" disabled ${t.done ? "checked" : ""} aria-label="Marketingový úkol (jen informativně)" style="width:auto;margin-top:3px">
      <div style="flex:1">
        <div style="${t.done ? "text-decoration:line-through;" : ""}">${escapeHtml(mkTitle(t))}</div>
        <div class="small">Marketing · ${escapeHtml(mkKanalyText(t))}${t.datum ? " · " + escapeHtml(mkWhen(t)) : ""}</div>
      </div>
    </div>`).join("")
}

function mkAssigneeHtml(t){
  if(!t.assignee) return ""
  return `<div class="small" style="margin-top:2px;${isMine(t.assignee) ? "color:var(--blue,#007aff);font-weight:600" : ""}">Zodpovídá: ${escapeHtml(assigneeLabel(t.assignee))}</div>`
}

function renderMarketingHtml(id, event, tasks, canEdit, access){
  const external = ["Koncert", "Soutěž", "Jiná akce"].includes(event.TYPE)
  if(!tasks.length && !(canEdit && external)) return ""
  const done = tasks.filter(t => t.done).length, late = tasks.filter(mkLate).length
  const row = t => `
    <div data-mk-row="${escapeHtml(t.id)}" style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.08)">
      <input type="checkbox" ${t.done ? "checked" : ""} onchange="event.stopPropagation();toggleMarketingTask('${id}','${escapeHtml(t.id)}',this.checked)" aria-label="Hotovo: ${escapeHtml(mkTitle(t))}" style="width:auto;margin-top:3px">
      <div style="flex:1;min-width:0">
        <div data-mk-title style="font-weight:600;${t.done ? "text-decoration:line-through;color:var(--muted)" : ""}">${escapeHtml(mkTitle(t))}</div>
        <div class="small">${escapeHtml(mkKanalyText(t))}${t.format ? " · " + escapeHtml(t.format) : ""} · ${escapeHtml(mkWhen(t))}${t.datum && t.datum < mkToday() ? ` · <span data-mk-late style="color:#ff3b30;font-weight:600;display:${t.done ? "none" : "inline"}">po termínu</span>` : ""}</div>
        ${t.ucel && t.napad ? `<div class="small" style="margin-top:2px">${escapeHtml(t.napad)}</div>` : ""}
        ${mkAssigneeHtml(t)}
        ${t.done && t.doneBy ? `<div class="small" style="color:var(--muted)">Hotovo: ${escapeHtml(t.doneBy)}${t.doneVia === "marek" ? " (schválený text z Marka)" : ""}</div>` : ""}
      </div>
      ${canEdit ? `<div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn-info" type="button" onclick="event.stopPropagation();editMarketingTask('${id}','${escapeHtml(t.id)}')" style="width:auto;padding:6px 10px">Upravit</button>
        <button class="btn-danger" type="button" onclick="event.stopPropagation();deleteMarketingTask('${id}','${escapeHtml(t.id)}')" style="width:auto;padding:6px 10px" aria-label="Smazat úkol">✕</button>
      </div>` : ""}
    </div>`
  return `<div class="event-card" id="mkCard" style="margin-bottom:16px;padding:0">
    <div class="event-label" style="padding:16px 16px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleDetailAccordion('marketing')">
      <span>Marketing <span id="mkCount" style="text-transform:none;letter-spacing:normal;font-weight:400;color:var(--muted)">· ${tasks.length ? done + "/" + tasks.length : "žádné úkoly"}${late ? ` · <span style="color:#ff3b30">${late} po termínu</span>` : ""}</span></span>
      <span id="accChevron_marketing" style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:normal">›</span>
    </div>
    <div id="accBody_marketing" style="display:none;padding:0 16px 16px">
      ${access ? `<div class="small" style="margin-top:8px"><a href="${MAREK_URL}?prehled=1" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--blue,#007aff);font-weight:600">Přehled týmu, texty a přidělování v Markovi ›</a></div>` : ""}
      ${tasks.length ? tasks.map(row).join("") : `<p class="notice" style="margin:12px 0 0">Zatím žádné úkoly. Vygeneruj plán v Markovi a převeď ho sem, nebo přidej úkol ručně.</p>`}
      ${canEdit ? `<div class="btn-group" style="margin-top:12px"><button type="button" onclick="addMarketingTask('${id}')">+ Přidat úkol</button></div>` : ""}
    </div>
  </div>`
}

async function toggleMarketingTask(akceId, taskId, done){
  const row = document.querySelector(`[data-mk-row="${CSS.escape(taskId)}"]`)
  const mirror = document.querySelector(`[data-mk-mirror="${CSS.escape(taskId)}"]`)
  const paint = d => {
    row?.querySelector("[data-mk-title]")?.setAttribute("style", "font-weight:600;" + (d ? "text-decoration:line-through;color:var(--muted)" : ""))
    const lateEl = row?.querySelector("[data-mk-late]"); if(lateEl) lateEl.style.display = d ? "none" : "inline"
    if(mirror){
      mirror.querySelector("input").checked = d
      mirror.firstElementChild.nextElementSibling.firstElementChild.style.textDecoration = d ? "line-through" : ""
    }
    const all = document.querySelectorAll("[data-mk-row] input[type=checkbox]")
    const cnt = document.getElementById("mkCount")
    if(cnt) cnt.textContent = "· " + [...all].filter(i => i.checked).length + "/" + all.length
  }
  paint(done)
  try{
    await api("setmarketingdone", {id: akceId, taskId, done, by: MEMBER_NAME || MEMBER_EMAIL || ""})
    invalidateCache("eventdetail", akceId)
  }catch(err){
    paint(!done)
    if(row) row.querySelector("input[type=checkbox]").checked = !done
    alert("Chyba: " + (err?.message || err))
  }
}

function mkFields(t){
  t = t || {}
  return [
    {key: "assignee", label: "Zodpovědný", type: "select", options: assigneeOptions(), value: t.assignee?.name || NOBODY},
    {key: "datum",  label: "Termín",  type: "date", value: t.datum || ""},
    {key: "cas",    label: "Čas (volitelné)", type: "time", value: t.cas || ""},
    {key: "kanaly", label: "Kanály", type: "checkboxes", options: Object.values(MK_KANALY),
      value: (Array.isArray(t.kanaly) && t.kanaly.length ? t.kanaly : [t.kanal || "facebook"]).map(k => MK_KANALY[k]).filter(Boolean)},
    {key: "format", label: "Formát (např. fotka s popiskem)", type: "text", value: escapeHtml(t.format || "")},
    {key: "ucel",   label: "Co má úkol splnit", type: "text", value: escapeHtml(t.ucel || "")},
    {key: "napad",  label: "Nápad, text, poznámka", type: "textarea", value: escapeHtml(t.napad || "")}
  ]
}

function mkSubmit(akceId, taskId){
  return async values => {
    const kanaly = Object.keys(MK_KANALY).filter(k => values.kanaly.includes(MK_KANALY[k]))
    if(!kanaly.length){ alert("Vyber aspoň jeden kanál"); return }
    try{
      await api("savemarketingtask", {id: akceId, taskId, datum: values.datum, cas: values.cas, kanaly, format: values.format, ucel: values.ucel, napad: values.napad, assignee: assigneeFromName(values.assignee)})
      invalidateCache("eventdetail", akceId)
      closeFormModal()
      openEvent(akceId)
    }catch(err){
      alert(err?.message || err)
    }
  }
}

async function addMarketingTask(akceId){
  await loadMemberChoices()
  try{ sessionStorage.removeItem("10base_form") }catch(e){ /* bez uloženého stavu */ }
  openFormModal("Nový marketingový úkol", mkFields(null), mkSubmit(akceId, undefined))
}

async function editMarketingTask(akceId, taskId){
  const data = await cachedApi("eventdetail", {id: akceId})
  const t = (data.event?.MARKETING || []).find(x => x.id === taskId)
  if(!t){ alert("Úkol už neexistuje"); return }
  await loadMemberChoices()
  try{ sessionStorage.removeItem("10base_form") }catch(e){ /* nevracet rozepsaný formulář jiného úkolu */ }
  openFormModal("Upravit marketingový úkol", mkFields(t), mkSubmit(akceId, taskId))
}

function deleteMarketingTask(akceId, taskId){
  confirmModal("Smazat marketingový úkol?", async () => {
    try{
      await api("deletemarketingtask", {id: akceId, taskId})
      invalidateCache("eventdetail", akceId)
      openEvent(akceId)
    }catch(err){ alert("Chyba: " + (err?.message || err)) }
  })
}

window.toggleMarketingTask = toggleMarketingTask
window.addMarketingTask    = addMarketingTask
window.editMarketingTask   = editMarketingTask
window.deleteMarketingTask = deleteMarketingTask

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
    <button class="btn-danger btn-series-action" style="flex:1">Jen tuto akci</button>
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

  if(!name){ evErr("fName", "Zadej název akce"); return }

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
    window.PROG_EVENT_DATA = event
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

// Převzetí programu z minulé akce: nejbližší dřívější akce se stejným typem, která má program (jinak jakéhokoli typu)
async function copyProgramFromPrevious(){
  const btn = document.getElementById("progCopyBtn")
  if(!btn || btn.disabled) return
  const label = btn.textContent
  btn.disabled = true
  btn.textContent = "Hledám minulou akci…"
  try{
    const cur    = window.PROG_EVENT_DATA || {}
    const events = await cachedApi("events")
    const curT   = new Date(cur.DATE).getTime()
    const prev   = events
      .filter(e => !e.IS_TEMPLATE && e.ID !== window.PROG_EVENT && e.REQUIRES_PROGRAM !== false && new Date(e.DATE).getTime() < curT)
      .sort((a, b) => new Date(b.DATE) - new Date(a.DATE))
    const ordered = [...prev.filter(e => e.TYPE === cur.TYPE), ...prev.filter(e => e.TYPE !== cur.TYPE)].slice(0, 12)

    for(const e of ordered){
      const d    = await cachedApi("eventdetail", { id: e.ID })
      const prog = (d.program || []).filter(p => window.PROG_SONGS.some(s => s.ID === p.SONG_ID))
      if(!prog.length) continue

      const main   = prog.filter(p => !p.ENCORE).map(p => p.SONG_ID)
      const encore = prog.filter(p => p.ENCORE).map(p => p.SONG_ID).slice(0, 2)
      const have   = window.PROG_MAIN.length + window.PROG_ENCORE.filter(Boolean).length
      const when   = formatDate(e.DATE)
      if(have && !confirm(`Nahradit současný program programem z akce „${e.NAME}“ (${when})?`)) return

      window.PROG_MAIN   = main
      window.PROG_ENCORE = [encore[0] || "", encore[1] || ""]
      markModalDirty('programEditorModal')
      refreshProgSelected()
      showToast(`Převzato z „${e.NAME}“ (${when}): ${main.length} skladeb${encore.length ? " + " + encore.length + " přídavky" : ""}`, 3500)
      return
    }
    showToast("Žádná dřívější akce nemá vyplněný program")
  }catch(err){
    showToast("Program se nepodařilo načíst")
  }finally{
    btn.disabled = false
    btn.textContent = label
  }
}

// Převzetí programu z libovolné akce (dřívější i pozdější, jakéhokoli typu): seznam akcí, které mají program.
// Výchozí je nahrazení; se zaškrtnutým „Přidat k současnému“ se k programu doplní jen skladby, které v něm ještě nejsou.
async function toggleProgSource(){
  const panel = document.getElementById("progSrcPanel")
  const btn   = document.getElementById("progSrcBtn")
  if(!panel) return
  const open = panel.classList.contains("hidden")
  panel.classList.toggle("hidden", !open)
  btn.setAttribute("aria-expanded", open)
  if(!open) return
  const have = window.PROG_MAIN.length + window.PROG_ENCORE.filter(Boolean).length
  document.getElementById("progSrcAppend").checked = have > 0
  document.getElementById("progSrcList").innerHTML = `<div class="small" style="padding:10px 2px">Načítám akce…</div>`
  try{
    const [events, summary] = await Promise.all([cachedApi("events"), api("programsummary")])
    window.PROG_SRC = events
      .filter(e => !e.IS_TEMPLATE && e.ID !== window.PROG_EVENT && summary[e.ID] && (summary[e.ID].main + summary[e.ID].encore) > 0)
      .map(e => ({ID: e.ID, NAME: e.NAME || "", DATE: e.DATE || "", TYPE: e.TYPE || "", main: summary[e.ID].main, encore: summary[e.ID].encore}))
    // nejblíže aktuální akci nahoře (po datu), tedy nedávné zkoušky a koncerty dřív než staré
    const cur = new Date((window.PROG_EVENT_DATA || {}).DATE).getTime() || Date.now()
    window.PROG_SRC.sort((a, b) => Math.abs(new Date(a.DATE) - cur) - Math.abs(new Date(b.DATE) - cur))
    renderProgSource()
  }catch(err){
    document.getElementById("progSrcList").innerHTML = `<div class="small" style="padding:10px 2px">Akce se nepodařilo načíst</div>`
  }
}

function renderProgSource(){
  const list = document.getElementById("progSrcList")
  if(!list) return
  const q = (document.getElementById("progSrcSearch")?.value || "").toLowerCase().trim()
  const rows = (window.PROG_SRC || []).filter(e => !q || `${e.NAME} ${formatDate(e.DATE)} ${e.DATE} ${e.TYPE}`.toLowerCase().includes(q)).slice(0, 60)
  list.innerHTML = rows.length ? rows.map(e => `
    <div class="prog-src-row" role="button" tabindex="0" onclick="copyProgramFrom('${escapeHtml(e.ID)}')">
      <div class="prog-song-text">
        <b>${escapeHtml(e.NAME)}</b>
        <div class="small">${escapeHtml(formatDate(e.DATE))}${e.TYPE ? " · " + escapeHtml(e.TYPE) : ""}</div>
      </div>
      <span class="prog-badge" title="Skladeb v programu">${e.main}${e.encore ? " +" + e.encore : ""}</span>
    </div>`).join("") : `<div class="small" style="padding:10px 2px">Žádná akce s programem${q ? " pro toto hledání" : ""}</div>`
}

async function copyProgramFrom(eventId){
  const src = (window.PROG_SRC || []).find(e => e.ID === eventId)
  if(!src) return
  try{
    const d    = await cachedApi("eventdetail", {id: eventId})
    const prog = (d.program || []).filter(p => window.PROG_SONGS.some(s => s.ID === p.SONG_ID))
    if(!prog.length){ showToast("Program této akce se nepodařilo převzít"); return }
    const main   = prog.filter(p => !p.ENCORE).map(p => p.SONG_ID)
    const encore = prog.filter(p => p.ENCORE).map(p => p.SONG_ID).slice(0, 2)
    const append = document.getElementById("progSrcAppend")?.checked
    const when   = formatDate(src.DATE)
    const have   = window.PROG_MAIN.length + window.PROG_ENCORE.filter(Boolean).length

    if(append){
      const used = new Set([...window.PROG_MAIN, ...window.PROG_ENCORE.filter(Boolean)])
      const addMain = main.filter(id => !used.has(id))
      addMain.forEach(id => used.add(id))
      const slots = window.PROG_ENCORE.map(Boolean)
      const addEnc = []
      encore.filter(id => !used.has(id)).forEach(id => { const at = slots.indexOf(false); if(at > -1){ window.PROG_ENCORE[at] = id; slots[at] = true; addEnc.push(id) } })
      window.PROG_MAIN.push(...addMain)
      showToast(`Přidáno z „${src.NAME}“ (${when}): ${addMain.length} skladeb${addEnc.length ? " + " + addEnc.length + " přídavky" : ""}`, 3500)
    }else{
      if(have && !confirm(`Nahradit současný program programem z akce „${src.NAME}“ (${when})?`)) return
      window.PROG_MAIN   = main
      window.PROG_ENCORE = [encore[0] || "", encore[1] || ""]
      showToast(`Převzato z „${src.NAME}“ (${when}): ${main.length} skladeb${encore.length ? " + " + encore.length + " přídavky" : ""}`, 3500)
    }
    markModalDirty('programEditorModal')
    refreshProgSelected()
    document.getElementById("progSrcPanel")?.classList.add("hidden")
    document.getElementById("progSrcBtn")?.setAttribute("aria-expanded", "false")
  }catch(err){
    showToast("Program se nepodařilo načíst")
  }
}

/* ===============================
   OCHRANA OKEN PŘED NECHTĚNÝM ZAVŘENÍM
   Klik mimo okno jen zatřese (viz nudgeModal). Zrušit a Esc se u okna s neuloženými změnami nejdřív zeptají.
   =============================== */
const GUARDED_MODALS = {
  programEditorModal: closeProgramEditorModal,
  moznaModal:         closeMoznaModal,
  formModal:          closeFormModal,
  eventFormModal:     closeEventFormModal
}

function markModalDirty(id){
  const m = document.getElementById(id)
  if(m && !m.classList.contains("hidden")) m.dataset.dirty = "1"
}

function guardedClose(id){
  const m = document.getElementById(id)
  if(!m) return false
  if(m.dataset.dirty === "1" && !confirm("Zahodit neuložené změny?")) return false
  GUARDED_MODALS[id]()
  return true
}
window.guardedClose = guardedClose

function anyModalDirty(){
  return Object.keys(GUARDED_MODALS).some(id => { const m = document.getElementById(id); return m && !m.classList.contains("hidden") && m.dataset.dirty === "1" })
}

;(function initModalGuard(){
  const onEdit = e => {
    const m = e.target.closest && e.target.closest(".modal")
    if(m && GUARDED_MODALS[m.id] && e.target.id !== "progSearch" && e.target.id !== "progSrcSearch" && e.target.id !== "progSrcAppend") markModalDirty(m.id)
  }
  document.addEventListener("input", onEdit)
  document.addEventListener("change", onEdit)
  // při každém otevření a zavření okna se stav „změněno“ vynuluje
  Object.keys(GUARDED_MODALS).forEach(id => {
    const m = document.getElementById(id)
    if(m) new MutationObserver(() => { delete m.dataset.dirty }).observe(m, { attributes: true, attributeFilter: ["class"] })
  })
  document.addEventListener("keydown", e => {
    if(e.key !== "Escape" || e.defaultPrevented) return
    const id = Object.keys(GUARDED_MODALS).find(k => { const m = document.getElementById(k); return m && !m.classList.contains("hidden") })
    if(id){ e.preventDefault(); guardedClose(id) }
  })
  window.addEventListener("beforeunload", e => { if(anyModalDirty()){ e.preventDefault(); e.returnValue = "" } })
})()

function renderProgramEditor(songs, currentIds, event){

  let html = `
  <h2>Program: ${escapeHtml(event.NAME || "")}</h2>

  <div class="prog-copy-row">
    <button type="button" class="prog-copy" id="progCopyBtn" onclick="copyProgramFromPrevious()">Z minulé akce</button>
    <button type="button" class="prog-copy" id="progSrcBtn" aria-expanded="false" onclick="toggleProgSource()">Z jiné akce…</button>
  </div>
  <div class="prog-src hidden" id="progSrcPanel">
    <input id="progSrcSearch" class="prog-search" type="search" placeholder="Hledat akci nebo datum…" oninput="renderProgSource()">
    <label class="prog-src-mode"><input type="checkbox" id="progSrcAppend"> Přidat k současnému programu (nenahrazovat)</label>
    <div id="progSrcList" class="prog-src-list"></div>
  </div>

  <div class="prog-seg" role="tablist">
    <button type="button" role="tab" id="btnSectionMain" class="active" onclick="setProgSection('main')">Program <span class="prog-count" id="progCountMain">0</span></button>
    <button type="button" role="tab" id="btnSectionEncore" onclick="setProgSection('encore')">Přídavky <span class="prog-count" id="progCountEncore">0/2</span></button>
  </div>

  <div class="prog-selected" id="progSelected"></div>

  <div class="prog-add-title">Přidat skladbu</div>
  <input id="progSearch" class="prog-search" type="search" placeholder="Hledat skladbu…" oninput="filterProgSongs(this.value)">
  <div id="progSongList" class="prog-list">`

  songs.forEach(r => {
    html += `<div class="prog-song-row"
      data-id="${escapeHtml(r.ID)}"
      data-name="${escapeHtml(r.NAME).toLowerCase()}"
      data-author="${escapeHtml(r.AUTHOR || "").toLowerCase()}"
      onclick="toggleProgSong('${escapeHtml(r.ID)}')">
      <div class="prog-song-text">
        <b>${escapeHtml(r.NAME)}</b>
        ${r.AUTHOR ? `<div class="small">${escapeHtml(r.AUTHOR)}</div>` : ""}
      </div>
      <span class="prog-badge" aria-hidden="true">+</span>
    </div>`
  })

  html += `</div>

  <div class="prog-foot btn-group">
    <button class="btn-success ar-primary" onclick="saveProgram('${escapeHtml(window.PROG_EVENT)}')">Uložit program</button>
    <button onclick="guardedClose('programEditorModal')">Zrušit</button>
  </div>`

  return html
}

let PROG_ACTIVE_SECTION = "main"

function setProgSection(section){
  PROG_ACTIVE_SECTION = section
  const btnMain   = document.getElementById("btnSectionMain")
  const btnEncore = document.getElementById("btnSectionEncore")
  if(btnMain){   btnMain.classList.toggle("active",   section === "main");   btnMain.setAttribute("aria-selected",   section === "main") }
  if(btnEncore){ btnEncore.classList.toggle("active", section === "encore"); btnEncore.setAttribute("aria-selected", section === "encore") }
  refreshProgSelected()
}

/* ===============================
   POSUVNÝ PŘEPÍNAČ MĚSÍCŮ (Akce, Docházka skupiny)
   Uprostřed vybraný měsíc, vlevo předchozí, vpravo následující. Klepnutí na sousední měsíc ho vybere,
   tažení posouvá, švih nechá měsíce rotovat a pozvolna se zastaví na některém z nich. Obsah se překreslí až po zastavení.
   =============================== */
const MS_RANGE = 36
function monthKeyAdd(key, n){
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
}
function monthLabel(key){
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})
}
function monthSliderHtml(target, key){
  return `<div class="month-slider" data-target="${target}" data-month="${key}" role="slider" tabindex="0" aria-label="Měsíc" aria-valuetext="${escapeHtml(monthLabel(key))}"><div class="ms-track"></div></div>`
}

function selectSliderMonth(target, key){
  if(target === "events"){ window.EVENTS_MONTH = key; renderEvents() }
  else if(target === "heat"){ HEATMAP_MONTH = key; refreshHeatmap() }
}

function initMonthSlider(el){
  if(el.dataset.init) return
  el.dataset.init = "1"
  const base = el.dataset.month, target = el.dataset.target, N = MS_RANGE
  const track = el.querySelector(".ms-track")
  const keys = []
  for(let i = -N; i <= N; i++) keys.push(monthKeyAdd(base, i))
  track.innerHTML = keys.map(k => `<span class="ms-item">${escapeHtml(monthLabel(k))}</span>`).join("")
  const items = [...track.children]
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let w = 0, idx = N, raf = 0, drag = null

  const layout = () => {
    w = el.clientWidth / 3
    items.forEach(it => { it.style.width = w + "px" })
    paint()
  }
  const paint = () => {
    track.style.transform = `translateX(${el.clientWidth / 2 - (idx + 0.5) * w}px)`
    items.forEach((it, i) => {
      const d = Math.abs(i - idx), c = Math.min(d, 1)
      it.style.opacity = d > 1.7 ? "0" : String(1 - c * 0.62)
      it.style.transform = `scale(${1 - c * 0.18})`
      it.style.fontWeight = d < 0.5 ? "700" : "500"
    })
  }
  const clamp = v => Math.max(0, Math.min(2 * N, v))
  const commit = () => {
    const key = keys[Math.round(idx)]
    el.setAttribute("aria-valuetext", monthLabel(key))
    if(key !== base) selectSliderMonth(target, key)
  }
  const animateTo = (to, ms) => {
    cancelAnimationFrame(raf)
    to = clamp(to)
    if(reduced || ms <= 0){ idx = to; paint(); commit(); return }
    const from = idx, t0 = performance.now()
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 4)
      idx = from + (to - from) * e
      paint()
      if(t < 1) raf = requestAnimationFrame(step)
      else { idx = to; paint(); commit() }
    }
    raf = requestAnimationFrame(step)
  }

  el.addEventListener("pointerdown", e => {
    if(e.pointerType === "mouse" && e.button !== 0) return
    cancelAnimationFrame(raf)
    drag = { x0: e.clientX, i0: idx, id: e.pointerId, moved: false, s: [{ t: performance.now(), x: e.clientX }] }
  })
  el.addEventListener("pointermove", e => {
    if(!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x0
    if(!drag.moved && Math.abs(dx) > 6){ drag.moved = true; el.setPointerCapture?.(e.pointerId); el.classList.add("dragging") }
    if(!drag.moved) return
    idx = clamp(drag.i0 - dx / w)
    const now = performance.now()
    drag.s.push({ t: now, x: e.clientX })
    while(drag.s.length > 2 && now - drag.s[0].t > 100) drag.s.shift()
    paint()
  })
  const release = (e, cancelled) => {
    if(!drag || e.pointerId !== drag.id) return
    const d = drag; drag = null
    el.classList.remove("dragging")
    if(!d.moved){
      if(cancelled) return
      const off = Math.round(((e.clientX - el.getBoundingClientRect().left) - el.clientWidth / 2) / w)
      if(off !== 0) animateTo(Math.round(idx) + off, 280)
      return
    }
    const now = performance.now(), recent = d.s.filter(q => now - q.t <= 100)
    const a = recent[0], b = recent[recent.length - 1]
    const v = recent.length >= 2 && b.t > a.t && now - b.t <= 80 ? -(b.x - a.x) / (b.t - a.t) / w : 0        // měsíců za milisekundu; po zastavení prstu bez švihu
    const TAU = 380
    const to = clamp(Math.round(idx + v * TAU))
    animateTo(to, Math.max(300, Math.min(1900, 320 + Math.abs(to - idx) * 120)))
  }
  el.addEventListener("pointerup", e => release(e, false))
  el.addEventListener("pointercancel", e => release(e, true))
  el.addEventListener("keydown", e => {
    if(e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    e.preventDefault()
    animateTo(Math.round(idx) + (e.key === "ArrowLeft" ? -1 : 1), 240)
  })
  if(window.ResizeObserver) new ResizeObserver(layout).observe(el)
  layout()
}

function initMonthSliders(){ document.querySelectorAll(".month-slider:not([data-init])").forEach(initMonthSlider) }
new MutationObserver(initMonthSliders).observe(document.documentElement, { childList: true, subtree: true })
initMonthSliders()

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
  const main   = window.PROG_MAIN || []
  const encore = (window.PROG_ENCORE || []).filter(Boolean)
  const isEnc  = PROG_ACTIVE_SECTION === "encore"
  const cM = document.getElementById("progCountMain"), cE = document.getElementById("progCountEncore")
  if(cM) cM.textContent = main.length
  if(cE) cE.textContent = encore.length + "/2"

  const el = document.getElementById("progSelected")
  if(el){
    const ids = isEnc ? encore : main
    if(!ids.length){
      el.innerHTML = `<p class="prog-empty">${isEnc ? "Zatím žádné přídavky. Klepni na skladbu níže." : "Zatím žádné skladby. Klepni na skladbu níže."}</p>`
    }else{
      el.innerHTML = ids.map((id, i) => {
        const song = window.PROG_SONGS.find(r => r.ID === id)
        if(!song) return ""
        const encIdx = isEnc ? window.PROG_ENCORE.indexOf(id) : i
        return `<div class="prog-sel-row" data-i="${i}">
          <button type="button" class="prog-grip" aria-label="Změnit pořadí: ${escapeHtml(song.NAME)} (tažením nebo šipkami)">
            <svg viewBox="0 0 12 18" width="12" height="18" aria-hidden="true" fill="currentColor"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/></svg>
          </button>
          <span class="prog-num">${i+1}</span>
          <span class="prog-sel-name">${escapeHtml(song.NAME)}</span>
          <button type="button" class="prog-ico prog-del" aria-label="Odebrat" onclick="removeProgSong('${isEnc ? "encore" : "main"}',${isEnc ? encIdx : i})">✕</button>
        </div>`
      }).join("")
    }
  }

  // značky u skladeb v seznamu: pořadí v aktivní části, nebo informace, že je skladba v druhé
  const act = isEnc ? encore : main, other = isEnc ? main : encore
  document.querySelectorAll("#progSongList .prog-song-row").forEach(row => {
    const id = row.dataset.id, pos = act.indexOf(id), inOther = other.includes(id)
    const b = row.querySelector(".prog-badge")
    row.classList.toggle("selected", pos > -1)
    row.classList.toggle("in-other", pos === -1 && inOther)
    if(b) b.textContent = pos > -1 ? String(pos + 1) : (inOther ? "✓" : "+")
  })
}

function toggleProgSong(songId){
  markModalDirty('programEditorModal')
  if(PROG_ACTIVE_SECTION === "encore"){
    const at = window.PROG_ENCORE.indexOf(songId)
    if(at > -1){
      window.PROG_ENCORE[at] = ""
    }else{
      const free = window.PROG_ENCORE.indexOf("")
      if(free === -1){
        showToast("Přídavky jsou plné (max 2)")
        return
      }
      window.PROG_ENCORE[free] = songId
    }
  }else{
    const at = window.PROG_MAIN.indexOf(songId)
    if(at > -1) window.PROG_MAIN.splice(at, 1)
    else window.PROG_MAIN.push(songId)
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
  markModalDirty('programEditorModal')
  if(list === "main"){
    window.PROG_MAIN.splice(idx, 1)
  }else{
    window.PROG_ENCORE[idx] = ""
  }
  refreshProgSelected()
}

function reorderProg(list, from, to){
  if(from === to || from < 0 || to < 0) return
  const arr = list === "encore" ? window.PROG_ENCORE.filter(Boolean) : window.PROG_MAIN
  if(from >= arr.length || to >= arr.length) return
  const [it] = arr.splice(from, 1)
  arr.splice(to, 0, it)
  if(list === "encore") window.PROG_ENCORE = [arr[0] || "", arr[1] || ""]
  markModalDirty('programEditorModal')
  refreshProgSelected()
}

function moveProgSong(idx, dir){
  reorderProg(PROG_ACTIVE_SECTION === "encore" ? "encore" : "main", idx, idx + dir)
}

// Přetahování pořadí: úchyt vlevo, funguje myší i dotykem; šipky nahoru/dolů na úchytu přesouvají klávesnicí
let PROG_DRAG = null
document.addEventListener("pointerdown", e => {
  const grip = e.target.closest && e.target.closest(".prog-grip")
  if(!grip || (e.pointerType === "mouse" && e.button !== 0)) return
  const row = grip.closest(".prog-sel-row"), box = document.getElementById("progSelected")
  const scroller = document.querySelector("#programEditorModal .modal-content")
  if(!row || !box || !scroller) return
  e.preventDefault()
  const rows = [...box.querySelectorAll(".prog-sel-row")]
  const top0 = scroller.scrollTop
  PROG_DRAG = {
    grip, row, rows, scroller, from: rows.indexOf(row), to: rows.indexOf(row), y0: e.clientY, top0, id: e.pointerId,
    mid: rows.map(r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 + top0 }),
    h: row.getBoundingClientRect().height, lastY: e.clientY
  }
  grip.setPointerCapture?.(e.pointerId)
  row.classList.add("dragging")
  box.classList.add("is-dragging")
})

function progDragMove(){
  const d = PROG_DRAG
  if(!d) return
  const dy = (d.lastY - d.y0) + (d.scroller.scrollTop - d.top0)
  const center = d.mid[d.from] + dy
  let to = 0
  d.mid.forEach((m, i) => { if(i !== d.from && m < center) to++ })
  d.to = to
  d.rows.forEach((r, i) => {
    if(i === d.from){ r.style.transform = `translateY(${dy}px)`; return }
    let shift = 0
    if(d.from < to && i > d.from && i <= to) shift = -d.h
    else if(d.from > to && i >= to && i < d.from) shift = d.h
    r.style.transform = shift ? `translateY(${shift}px)` : ""
  })
}

document.addEventListener("pointermove", e => {
  const d = PROG_DRAG
  if(!d || e.pointerId !== d.id) return
  d.lastY = e.clientY
  const sb = d.scroller.getBoundingClientRect()
  if(e.clientY < sb.top + 50) d.scroller.scrollTop -= 12
  else if(e.clientY > sb.bottom - 50) d.scroller.scrollTop += 12
  progDragMove()
})

function progDragEnd(e, cancel){
  const d = PROG_DRAG
  if(!d || (e && e.pointerId !== d.id)) return
  PROG_DRAG = null
  d.rows.forEach(r => { r.style.transform = ""; r.classList.remove("dragging") })
  document.getElementById("progSelected")?.classList.remove("is-dragging")
  if(!cancel && d.to !== d.from) reorderProg(PROG_ACTIVE_SECTION === "encore" ? "encore" : "main", d.from, d.to)
}
document.addEventListener("pointerup", e => progDragEnd(e, false))
document.addEventListener("pointercancel", e => progDragEnd(e, true))

document.addEventListener("keydown", e => {
  const grip = e.target.closest && e.target.closest(".prog-grip")
  if(!grip || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
  e.preventDefault()
  const i = Number(grip.closest(".prog-sel-row").dataset.i)
  moveProgSong(i, e.key === "ArrowUp" ? -1 : 1)
  const ni = Math.max(0, i + (e.key === "ArrowUp" ? -1 : 1))
  document.querySelectorAll("#progSelected .prog-grip")[ni]?.focus()
})

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
  pdfs.forEach(p => window.open(noteLink(p.PDF), "_blank"))
  showToast(`Otevřeno ${pdfs.length} PDF ✓`)
}

async function openEditSeriesFrom(id){
  await openEventForm(id)

  setTimeout(() => {
    const modal = document.getElementById("eventFormModalBody")

    const h2 = modal.querySelector("h2")
    if(h2) h2.textContent = "Upravit sérii od této akce"

    const btnGroup = modal.querySelector(".form-foot .btn-group")
    if(btnGroup){
      const saveBtn = btnGroup.querySelector("button:first-child")
      if(saveBtn){
        saveBtn.textContent = "Uložit změny"
        saveBtn.removeAttribute("onclick")
        saveBtn.onclick = () => saveSeriesFrom(id)
      }
    }
    modal.querySelector("#fNotify")?.closest(".ev-sw")?.remove()   // uložení série Discord neposílá
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

  if(!name){ evErr("fName", "Zadej název akce"); return }

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
    {key: "discord_id", label: "Discord ID", type: "text"},
    {key: "phone", label: "Telefon", type: "text"},
    {key: "voice", label: "Hlas", type: "select", value: "1. TENOR", options: ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]},
    {key: "role",  label: "Role", type: "select", value: "MEMBER", options: ["MEMBER", "ADMIN", "ART", "GUEST"]},
    {key: "since", label: "V 10men působí od", type: "date"}
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
  const priv = (await window.tenSettings?.privateGet(m.EMAIL)) || {}

  openFormModal("Upravit člena", [
    {key: "name",  label: "Jméno",   type: "text",   value: m.NAME},
    {key: "email", label: "Email",   type: "text",   value: m.EMAIL},
    {key: "discord_id", label: "Discord ID", type: "text", value: m.DISCORD_ID || ""},
    {key: "phone", label: "Telefon", type: "text",   value: m.PHONE || ""},
    {key: "voice", label: "Hlas",   type: "select", value: m.VOICE, options: ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]},
    {key: "role",  label: "Role",   type: "select", value: m.ROLE,  options: ["MEMBER", "ADMIN", "ART", "GUEST"]},
    {key: "since", label: "V 10men působí od", type: "date", value: m.SINCE || ""},
    {key: "birth",   label: "Datum narození (jen pro čtení u člena)", type: "date", value: priv.birth || ""},
    {key: "address", label: "Adresa", type: "text", value: priv.address || ""},
    {key: "bank",    label: "Číslo účtu", type: "text", value: priv.bank || "", placeholder: "123456789/0100"}
  ], async (values) => {
    if(!values.name)  { alert("Zadej jméno"); return }
    if(!values.email) { alert("Zadej email"); return }
    try{
      closeFormModal()
      showSaving()
      const {birth, address, bank, ...member} = values
      await api("updatemember", {id, ...member})
      await window.tenSettings?.privateSet(values.email, {birth, address, bank})
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
              <button class="btn-info" onclick="openEditMember('${escapeHtml(m.ID)}')" style="padding:8px 12px;font-size:13px">Upravit</button>
              <button class="btn-danger" onclick="deleteMemberItem('${escapeHtml(m.ID)}')" style="padding:8px 12px;font-size:13px">Smazat</button>
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
  const hospoda         = document.getElementById("fHospoda")?.value       ?? window.EDIT_EVENT?.HOSPODA        ?? ""
  const harmonogram     = document.getElementById("fHarmonogram")?.value   ?? window.EDIT_EVENT?.HARMONOGRAM    ?? ""
  const spacaky         = document.getElementById("fSpacaky")?.value       ?? window.EDIT_EVENT?.SPACAKY        ?? ""
  const strava          = document.getElementById("fStrava")?.value        ?? window.EDIT_EVENT?.STRAVA         ?? ""
  const stravaNota      = document.getElementById("fStravaNota")?.value    ?? window.EDIT_EVENT?.STRAVA_NOTA    ?? ""
  const obleceniS       = document.getElementById("fObleceniSoustredeni")?.value    ?? window.EDIT_EVENT?.OBLECENI_S     ?? ""
  const obleceniSTyp    = document.getElementById("fObleceniSoustredeniTyp")?.value ?? window.EDIT_EVENT?.OBLECENI_S_TYP ?? ""
  const isGrilovacka    = document.getElementById("fIsGrilovacka")?.checked ?? window.EDIT_EVENT?.IS_GRILOVACKA ?? false
  const isSpolupraceVal = document.getElementById("fIsSpoluprace")?.checked ?? window.EDIT_EVENT?.IS_SPOLUPRACE ?? false
  const spolupraceNazev = isSpolupraceVal ? (document.getElementById("fSpolupraceNazev")?.value ?? window.EDIT_EVENT?.SPOLUPRACE_NAZEV ?? "") : ""

  // seřaď harmonogram chronologicky podle času (položky bez času zůstanou na konci v původním pořadí)
  function sortByTime(items){
    return [...items].sort((a, b) => {
      if(a.den || b.den){
        const denA = a.den || ""
        const denB = b.den || ""
        if(denA !== denB) return denA.localeCompare(denB)
      }
      if(!a.cas && !b.cas) return 0
      if(!a.cas) return 1
      if(!b.cas) return -1
      return a.cas.localeCompare(b.cas)
    })
  }

  const rawHarmonogram = window.EDIT_HARMONOGRAM || (window.EDIT_EVENT?.HARMONOGRAM_ITEMS ? JSON.parse(window.EDIT_EVENT.HARMONOGRAM_ITEMS) : [])
  const sortedHarmonogram = sortByTime(rawHarmonogram)
  const harmonogramItems  = JSON.stringify(sortedHarmonogram)

  const riderData = window.EDIT_RIDER || (window.EDIT_EVENT?.RIDER ? JSON.parse(window.EDIT_EVENT.RIDER) : {})
  if(Array.isArray(riderData.pripravne_akce))       riderData.pripravne_akce = sortByTime(riderData.pripravne_akce)
  if(Array.isArray(riderData.harmonogram_koncertu))  riderData.harmonogram_koncertu = sortByTime(riderData.harmonogram_koncertu)
  if(Array.isArray(riderData.ukonceni))              riderData.ukonceni = sortByTime(riderData.ukonceni)
  const riderJson = JSON.stringify(riderData)


  if(!name){ evErr("fName", "Zadej název akce"); return }
  if(!date){ evErr("fDate", "Zadej datum"); return }
  if(dateEnd && dateEnd < date){ evErr("fDateEnd", "Konec akce musí být až po začátku"); return }

  // Opakující se akce — jen při vytváření nové
  if(!id && recurrenceType !== "none"){
    if(!recurrenceUntil){ evErr("fRecurrenceUntil", "Zadej datum konce opakování"); return }
    if(recurrenceUntil < date){ evErr("fRecurrenceUntil", "Opakování musí končit po první akci"); return }
    try{
      showSaving()
      const result = await api("addrecurring", {
        name, date, date_end: dateEnd, start, end, place, note, type, status,
        requires_program: requiresProgram,
        call_url: callUrl,
        recurrence_type: recurrenceType,
        recurrence_until: recurrenceUntil,
        sraz, obleceni, doprava, hospoda, harmonogram,
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
          sraz, obleceni, doprava, hospoda, harmonogram,
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
        sraz, obleceni, doprava, hospoda, harmonogram,
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
                  <button class="btn-danger" onclick="event.stopPropagation();deleteCollection('${escapeHtml(v.id)}')">Smazat výběr</button>
                </div>
                <div class="small" style="font-weight:600;margin-bottom:8px">Zaznamenat platbu</div>
                <div class="btn-group">
                  <select id="payMember_${escapeHtml(v.id)}" style="flex:2" onclick="event.stopPropagation()">
                    ${v.members.map(m => `<option value="${escapeHtml(m.email)}">${escapeHtml(m.name)}</option>`).join("")}
                  </select>
                  <input id="payAmount_${escapeHtml(v.id)}" type="number" placeholder="Kč" style="width:80px;flex:1" value="${v.amount}" onclick="event.stopPropagation()">
                  <button class="btn-success" onclick="event.stopPropagation();recordPayment('${escapeHtml(v.id)}')">Uložit</button>
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
          <p class="small" style="margin-bottom:12px;line-height:1.5">Pokud jsi 10menům platil něco z vlastní kapsy, nebo jsi kvůli akci 10men jel svým autem, můžeš si tyto výdaje nechat proplatit. Pokud se jedná o běžný výdaj, přilož fotku nebo sken účtenky (nebo dej originál Zdendovi). U cesťáku není účtenka potřeba, výdaj se spočítá na základě ujeté vzdálenosti a průměrné spotřeby paliva uvedené v techničáku tvého auta.</p>
          <a href="https://cash.10men.cz/expenses.html" target="_blank" rel="noopener" class="btn-card-link">
            Proplatit výdaje
          </a>
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
        <button class="btn-primary" onclick="setEnergyPhase('start')" id="btnPhaseStart">Začátek zkoušky</button>
        <button onclick="setEnergyPhase('end')"   id="btnPhaseEnd">Konec zkoušky</button>
      </div>

      <div id="energyPhaseStart">
        <label>Stav elektroměru na začátku (kWh):<br>
          <input id="energyStart" type="number" style="width:100%;margin:6px 0 12px" placeholder="např. 4520.19">
        </label>
        <div class="btn-group">
          <button class="btn-success" onclick="saveEnergyPhase('start')">Uložit stav na začátku</button>
        </div>
      </div>

      <div id="energyPhaseEnd" style="display:none">
        <label>Stav elektroměru na konci (kWh):<br>
          <input id="energyEnd" type="number" style="width:100%;margin:6px 0 12px" placeholder="např. 4527.43">
        </label>
        <div class="btn-group">
          <button class="btn-success" onclick="saveEnergyPhase('end')">Uložit stav na konci</button>
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
              <button class="btn-info" onclick="event.stopPropagation();editEnergyRow('${escapeHtml(r.ID)}',${r.START},${r.END||""})">Upravit</button>
              <button class="btn-danger" onclick="event.stopPropagation();deleteEnergyRow('${escapeHtml(r.ID)}')">Smazat</button>
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
   ZKUŠEBNA (Klávesy, CVT)
================================ */

async function renderRepertoar(){
  const scroll = saveScroll()
  setLoading()
  try{
    let html = isDesktop ? `<div style="max-width:560px;margin:0 auto">` : ``

    // --- PODZÁLOŽKY ---
    html += `<div class="btn-group" style="margin-bottom:16px">
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

    html += renderKlavesyTab()
    if(isDesktop) html += `</div>`
    container().innerHTML = html
    restoreScroll(scroll)
  }catch(err){
    setError("Chyba při načítání zkušebny: " + (err?.message || err))
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

async function toggleFav(songId){
  if(!MEMBER_EMAIL) return
  try{
    await api("togglefavorite", {email: MEMBER_EMAIL, songId})
    renderRepertoar()
  }catch(err){
    alert("Chyba: " + (err?.message || err))
  }
}

function setZkusebnaTab(tab){
  ZKUSEBNA_TAB = tab === "cvt" ? "cvt" : "klavesy"
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
          <span class="acc-chev" id="cvtChev_${section.id}" data-acc="${isOpen ? "open" : "closed"}"></span>
        </div>
        <div id="cvtBody_${section.id}" style="display:${isOpen ? "block" : "none"};padding:0 16px 16px">
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
  const prev = CVT_SECTION_OPEN
  CVT_SECTION_OPEN = prev === id ? null : id
  const body = document.getElementById("cvtBody_" + id)
  if(!body){ renderRepertoar(); return }
  const setOne = (sid, open) => {
    const b = document.getElementById("cvtBody_" + sid)
    if(b) tenAcc.set(b, open, { display: "block", chevs: [document.getElementById("cvtChev_" + sid)] })
  }
  if(prev && prev !== id) setOne(prev, false)   // otevřená je vždy jen jedna sekce
  setOne(id, CVT_SECTION_OPEN === id)
}

window.toggleCvtSection = toggleCvtSection

/* ===============================
   HEATMAPA
================================ */

let HEATMAP_MONTH = null

/* Docházka skupiny: stav člena = Přijdu / Možná / Nepřijdu / bez odpovědi. Členové jsou seskupení podle hlasu, u každé akce je poměr
   přítomných a pruh se zastoupením stavů. Stav se rozliší i bez barvy (plná, tónovaná s přeškrtnutím, čárkovaný obrys). */
const HM_STATUS = { "Přijdu": "y", "Možná": "m", "Nepřijdu": "n" }
const HM_LABEL  = { y: "Přijde", m: "Možná", n: "Nepřijde", u: "Bez odpovědi" }
const HM_VOICES = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]

function hmVoiceName(v){
  return String(v).replace(/^(\d)\. (\S)(\S*)/, (_, n, a, b) => n + ". " + a + b.toLowerCase())
}

function hmGroups(members){
  const groups = HM_VOICES.map(v => ({ voice: v, list: members.filter(m => m.VOICE === v) })).filter(g => g.list.length)
  return groups   // členové bez hlasu (1./2. tenor, 1./2. bas) se do docházky nezapočítávají
}

// u akce s potvrzenou docházkou (FINAL) platí skutečná účast: přišel = y, nepřišel = n; jinak to, co člen sám zadal
function hmKey(lookup, e, m){
  const entry = lookup[e.ID + "_" + m.EMAIL] || {}
  if(e.FINAL) return entry.actual === "yes" ? "y" : "n"
  return HM_STATUS[entry.status || ""] || "u"
}

function hmLabel(e, k){
  return e.FINAL ? ({ y: "Přišel(a)", n: "Nepřišel(a)" }[k] || HM_LABEL[k]) : HM_LABEL[k]
}

function hmCounts(e, members, lookup){
  const c = { y: 0, m: 0, n: 0, u: 0 }
  members.forEach(m => { c[hmKey(lookup, e, m)]++ })
  return c
}

function hmClick(e, m){
  return `onclick="heatmapDetail('${escapeHtml(e.ID)}','${escapeHtml(m.EMAIL)}')"`
}

function hmIsPast(e){
  const end = new Date(e.DATE_END || e.DATE); end.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return end < today
}

function hmDateChip(e){
  const d = new Date(e.DATE)
  return `<div class="hm-date"><b>${d.getDate()}</b><span>${escapeHtml(d.toLocaleDateString("cs-CZ", {month: "short"}).replace(".", ""))}</span></div>`
}

function hmTitle(e){
  const cancelled = e.STATUS === "Zrušená"
  return `<div class="hm-title">
    <a class="${cancelled ? "hm-cancel" : ""}" onclick="setActiveTab('events');openEvent('${escapeHtml(e.ID)}')">${escapeHtml(e.NAME)}</a>
    ${cancelled ? `<small class="hm-badge">Zrušená</small>` : `<small>${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}${hmIsPast(e) ? " · proběhlo" : ""}${e.FINAL ? " · docházka potvrzena" : hmIsPast(e) && MEMBER_ROLE === "ADMIN" ? ` · <span class="hm-link" onclick="openAttendanceCheck('${escapeHtml(e.ID)}')">odškrtnout docházku</span>` : ""}</small>`}
  </div>`
}

function hmLegend(){
  return `<div class="hm-legend"><span><i class="hm-sw hm-y"></i>Přijde</span><span><i class="hm-sw hm-m"></i>Možná</span><span><i class="hm-sw hm-n"></i>Nepřijde</span><span><i class="hm-sw hm-u"></i>Bez odpovědi</span></div>`
}

function heatmapMobileHtml(events, members, lookup){
  const groups = hmGroups(members)
  return events.map(e => {
    const cancelled = e.STATUS === "Zrušená"
    const c = hmCounts(e, members, lookup)
    let body = ""
    if(!cancelled){
      const seg = ["y", "m", "n", "u"].filter(k => c[k]).map(k => `<i class="hm-seg hm-${k}" style="flex:${c[k]}"></i>`).join("")
      const voices = groups.map(g => {
        const yes = g.list.filter(m => hmKey(lookup, e, m) === "y").length
        const dots = g.list.map(m => {
          const k = hmKey(lookup, e, m)
          const initials = m.NAME.split(" ").map(n => n[0]).join("")
          return `<button type="button" class="hm-dot hm-${k}" title="${escapeHtml(m.NAME)}: ${hmLabel(e, k).toLowerCase()}" aria-label="${escapeHtml(m.NAME)}: ${hmLabel(e, k)}" ${hmClick(e, m)}>${escapeHtml(initials)}</button>`
        }).join("")
        return `<div class="hm-voice"><div class="hm-vh"><span>${escapeHtml(hmVoiceName(g.voice))}</span><b>${yes}<small>/${g.list.length}</small></b></div><div class="hm-dots">${dots}</div></div>`
      }).join("")
      body = `<div class="hm-bar" role="img" aria-label="Přijde ${c.y}, možná ${c.m}, nepřijde ${c.n}, bez odpovědi ${c.u}">${seg}</div><div class="hm-voices">${voices}</div>`
    }
    return `<div class="hm-event ${cancelled ? "hm-off" : ""} ${hmIsPast(e) ? "hm-past" : ""}">
      <div class="hm-head">${hmDateChip(e)}${hmTitle(e)}${cancelled ? "" : `<div class="hm-count" aria-label="${c.y} z ${members.length} přijde"><b>${c.y}</b><small>/${members.length}</small></div>`}</div>
      ${body}
    </div>`
  }).join("") + hmLegend()
}

function heatmapDesktopHtml(events, members, lookup){
  const groups = hmGroups(members)
  const head1 = `<th rowspan="2" class="hm-corner">Akce</th>`
    + groups.map((g, i) => `<th colspan="${g.list.length}" class="hm-vg ${i ? "hm-sep" : ""}">${escapeHtml(hmVoiceName(g.voice))}</th>`).join("")
    + `<th rowspan="2" class="hm-sum-h hm-sep">Přijde</th>`
  const head2 = groups.map((g, i) => g.list.map((m, j) =>
    `<th class="hm-mh ${i && !j ? "hm-sep" : ""}" title="${escapeHtml(m.NAME)}"><span>${escapeHtml(m.NAME.split(" ")[0])}</span><small>${escapeHtml(m.NAME.split(" ")[1] || "")}</small></th>`).join("")).join("")
  const rows = events.map(e => {
    const c = hmCounts(e, members, lookup)
    const cells = groups.map((g, i) => g.list.map((m, j) => {
      const k = hmKey(lookup, e, m)
      return `<td class="${i && !j ? "hm-sep" : ""}"><button type="button" class="hm-cell hm-${k}" title="${escapeHtml(m.NAME)}: ${hmLabel(e, k).toLowerCase()}" aria-label="${escapeHtml(m.NAME)}: ${hmLabel(e, k)}" ${hmClick(e, m)}>${{ y: "✓", m: "?", n: "✕", u: "" }[k]}</button></td>`
    }).join("")).join("")
    const cancelled = e.STATUS === "Zrušená"
    return `<tr class="${cancelled ? "hm-off" : ""} ${hmIsPast(e) ? "hm-past" : ""}"><th class="hm-ev" scope="row">${hmDateChip(e)}${hmTitle(e)}</th>${cells}<td class="hm-sum hm-sep">${cancelled ? "" : `<b>${c.y}</b><small>/${members.length}</small>${c.m ? `<em>+${c.m}?</em>` : ""}`}</td></tr>`
  }).join("")
  return `<div class="hm-scroll"><table class="hm-table"><thead><tr>${head1}</tr><tr>${head2}</tr></thead><tbody>${rows}</tbody></table></div>${hmLegend()}`
}

/* Okno s podrobnostmi člena: účast na vybrané akci, stav na další dvě akce a aktivita v procentech.
   Aktivita = podíl proběhlých akcí, na které člen potvrdil „Přijdu“ (zrušené se nepočítají), za aktuální kalendářní rok;
   1. ledna se počítá znovu od nuly. Má-li člen vyplněno „V 10men působí od“ a nastoupil během roku, počítá se až od toho data.
   0–30 % červeně, 31–65 % oranžově, 66–100 % zeleně. */
function hmActivity(member, events, lookup){
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const since = member.SINCE ? new Date(member.SINCE) : null
  if(since) since.setHours(0, 0, 0, 0)
  const bySince = !!(since && since > yearStart)
  const from = bySince ? since : yearStart
  const past = events.filter(e => e.STATUS !== "Zrušená" && new Date(e.DATE) < today && new Date(e.DATE) >= from)
  const yes = past.filter(e => {
    const entry = lookup[e.ID + "_" + member.EMAIL] || {}
    return e.FINAL ? entry.actual === "yes" : entry.status === "Přijdu"   // potvrzená docházka má přednost před tím, co člen zadal
  }).length
  const pct = past.length ? Math.round(yes / past.length * 100) : null
  const cls = pct === null ? "u" : pct <= 30 ? "n" : pct <= 65 ? "m" : "y"
  return { pct, cls, yes, total: past.length, from, bySince, year: today.getFullYear() }
}

function ensureHmModal(){
  let m = document.getElementById("hmModal")
  if(m) return m
  m = document.createElement("div")
  m.id = "hmModal"
  m.className = "modal hidden"
  m.innerHTML = `<div class="modal-backdrop" onclick="closeHeatmapDetail()"></div>
    <div class="modal-content" style="max-width:420px"><button type="button" class="modal-close hm-x" aria-label="Zavřít" onclick="closeHeatmapDetail()">✕</button><div id="hmModalBody"></div>
      <div class="btn-group" data-ar-skip><button type="button" onclick="closeHeatmapDetail()">Zavřít</button></div></div>`
  document.body.appendChild(m)
  return m
}

function heatmapDetail(eventId, email){
  const d = window.HM_DATA
  if(!d) return
  const member = d.members.find(m => m.EMAIL === email)
  const event  = d.events.find(e => e.ID === eventId)
  if(!member || !event) return
  const entry = d.lookup[eventId + "_" + email] || {}
  const k = hmKey(d.lookup, event, member)
  const when  = e => `${formatDate(e.DATE)}${e.DATE_END ? " – " + formatDate(e.DATE_END) : ""}`
  const short = e => new Date(e.DATE).toLocaleDateString("cs-CZ", {weekday: "short", day: "numeric", month: "numeric"})

  const sorted = d.events.filter(e => e.STATUS !== "Zrušená").sort((a, b) => new Date(a.DATE) - new Date(b.DATE))
  const next = sorted.filter(e => e.ID !== eventId && new Date(e.DATE) >= new Date(event.DATE) && !(e.DATE === event.DATE && e.ID < eventId)).slice(0, 2)
  const nextHtml = next.length
    ? next.map(e => {
        const kk = hmKey(d.lookup, e, member)
        return `<div class="hm-next-row"><span>${escapeHtml(e.NAME)} · ${escapeHtml(short(e))}</span><i class="hm-chip hm-${kk}">${hmLabel(e, kk)}</i></div>`
      }).join("")
    : `<div class="hm-next-row"><span>Žádná další akce v plánu</span></div>`

  const act = hmActivity(member, d.events, d.lookup)
  const actHtml = act.pct === null
    ? `<div class="hm-act"><span class="hm-act-l">Aktivita</span><b class="hm-pct hm-u">–</b><small>${act.bySince ? "od " + act.from.toLocaleDateString("cs-CZ") : "v roce " + act.year} zatím žádná proběhlá akce</small></div>`
    : `<div class="hm-act"><span class="hm-act-l">Aktivita</span><b class="hm-pct hm-${act.cls}">${act.pct} %</b>
        <div class="hm-act-bar"><i class="hm-${act.cls}" style="width:${act.pct}%"></i></div>
        <small>přišel(a) na ${act.yes} z ${act.total} proběhlých akcí ${act.bySince ? "od " + act.from.toLocaleDateString("cs-CZ") : "v roce " + act.year}</small></div>`

  ensureHmModal()
  document.getElementById("hmModalBody").innerHTML = `
    <div class="hm-dlg-name">${escapeHtml(member.NAME)}${member.VOICE ? `<small>${escapeHtml(hmVoiceName(member.VOICE))}</small>` : ""}</div>
    <div class="hm-dlg-main hm-${k}">
      <i class="hm-chip hm-${k}">${hmLabel(event, k)}</i>
      <div><b>${escapeHtml(event.NAME)}</b><small>${escapeHtml(when(event))}${event.FINAL ? " · docházka potvrzena" : ""}</small></div>
    </div>
    ${event.FINAL && entry.status && HM_STATUS[entry.status] !== k ? `<div class="hm-reason">Přihlásil(a) se: ${escapeHtml(entry.status)}</div>` : ""}
    ${entry.reason ? `<div class="hm-reason">Důvod: ${escapeHtml(entry.reason)}</div>` : ""}
    <div class="hm-next"><div class="hm-next-h">Další akce</div>${nextHtml}</div>
    ${actHtml}`
  document.getElementById("hmModal").classList.remove("hidden")
}

function closeHeatmapDetail(){
  document.getElementById("hmModal")?.classList.add("hidden")
}

/* ===============================
   ODŠKRTNUTÍ DOCHÁZKY (jen ADMIN)
   Administrátor po akci označí, kdo opravdu přišel, a uloží to jako finální stav. Skutečná účast se ukládá zvlášť
   (dochazka/actual), původní odpovědi členů zůstávají. Statistiky (aktivita) pak berou skutečnou účast.
================================ */

function ensureAttModal(){
  let m = document.getElementById("attModal")
  if(m) return m
  m = document.createElement("div")
  m.id = "attModal"
  m.className = "modal hidden"
  m.innerHTML = `<div class="modal-backdrop" onclick="closeAttendanceCheck()"></div>
    <div class="modal-content att-content" style="max-width:480px"><button type="button" class="modal-close hm-x" aria-label="Zavřít" onclick="closeAttendanceCheck()">✕</button><div id="attModalBody"></div></div>`
  document.body.appendChild(m)
  return m
}

const ATT_DECLARED = { "Přijdu": "slíbil(a)", "Možná": "možná", "Nepřijdu": "nepřijde" }

function attRender(){
  const c = window.ATT_CHECK
  if(!c) return
  const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
  const groups = voiceOrder.map(v => ({ voice: v, list: c.att.filter(a => a.VOICE === v) })).filter(g => g.list.length)
  const total = groups.reduce((n, g) => n + g.list.length, 0)
  const present = groups.reduce((n, g) => n + g.list.filter(a => c.checked.has(a.EMAIL)).length, 0)
  const rows = groups.map(g => {
    const here = g.list.filter(a => c.checked.has(a.EMAIL)).length
    return `<div class="att-group"><div class="att-gh"><span>${escapeHtml(hmVoiceName(g.voice))}</span><b>${here}<small>/${g.list.length}</small></b></div>
      ${g.list.map(a => {
        const on = c.checked.has(a.EMAIL)
        return `<button type="button" class="att-row ${on ? "on" : ""}" data-email="${escapeHtml(a.EMAIL)}" role="checkbox" aria-checked="${on}" onclick="toggleAttendanceRow('${escapeHtml(a.EMAIL)}')">
          <span class="att-box" aria-hidden="true">${on ? "✓" : ""}</span>
          <span class="att-name">${escapeHtml(a.NAME)}</span>
          <small class="att-decl">${escapeHtml(ATT_DECLARED[a.STATUS] || "bez odpovědi")}</small>
        </button>`
      }).join("")}</div>`
  }).join("")
  // zaškrtnutí překreslí celé okno; polohu rolování seznamu (i okna) a zaměřený řádek je potřeba zachovat, jinak skočí nahoru
  const body = document.getElementById("attModalBody"), card = body.closest(".att-content")
  const listTop = body.querySelector(".att-scroll")?.scrollTop || 0, cardTop = card ? card.scrollTop : 0
  const focused = document.activeElement?.closest?.(".att-row")?.dataset.email
  body.innerHTML = `
    <div class="att-head">
      <div class="hm-dlg-name">Odškrtnout docházku<small>${escapeHtml(c.event.NAME)} · ${escapeHtml(formatDate(c.event.DATE))}</small></div>
      <div class="att-sum"><b>${present}</b><small>/${total} přišlo</small>
        <span class="att-quick"><button type="button" onclick="attMark('promised')">Podle slibů</button><button type="button" onclick="attMark('none')">Nikdo</button></span></div>
    </div>
    <div class="att-scroll">${rows}</div>
    <div class="att-foot">
      <div class="btn-group" data-ar-skip>
        <button class="btn-primary" onclick="saveAttendanceCheck()">Uložit jako finální</button>
        <button onclick="closeAttendanceCheck()">Zrušit</button>
      </div>
      ${c.event.ATTENDANCE_FINAL ? `<div class="btn-group" data-ar-skip style="margin-top:8px"><button class="btn-danger" onclick="reopenAttendanceCheck()">Zrušit potvrzení docházky</button></div>` : ""}
    </div>`
  const list = body.querySelector(".att-scroll")
  if(list) list.scrollTop = listTop
  if(card) card.scrollTop = cardTop
  if(focused) [...body.querySelectorAll(".att-row")].find(r => r.dataset.email === focused)?.focus({preventScroll: true})
}

async function openAttendanceCheck(id){
  if(MEMBER_ROLE !== "ADMIN") return
  try{
    const d = await api("eventdetail", {id})
    const att = d.attendance || []
    const fin = d.event.ATTENDANCE_FINAL === true
    window.ATT_CHECK = {
      id, event: d.event, att,
      checked: new Set(att.filter(a => fin ? a.ACTUAL === "yes" : a.STATUS === "Přijdu").map(a => a.EMAIL))
    }
    ensureAttModal()
    attRender()
    document.getElementById("attModal").classList.remove("hidden")
  }catch(err){
    alert("Docházku se nepodařilo načíst: " + (err?.message || err))
  }
}

function toggleAttendanceRow(email){
  const c = window.ATT_CHECK
  if(!c) return
  c.checked.has(email) ? c.checked.delete(email) : c.checked.add(email)
  attRender()
}

function attMark(mode){
  const c = window.ATT_CHECK
  if(!c) return
  c.checked = new Set(mode === "promised" ? c.att.filter(a => a.STATUS === "Přijdu").map(a => a.EMAIL) : [])
  attRender()
}

function closeAttendanceCheck(){
  document.getElementById("attModal")?.classList.add("hidden")
}

function afterAttendanceChange(id, msg){
  invalidateCache("eventdetail", id)
  lsDel("heatmap")
  lsDel("events")
  hideSaving(msg)
  if(document.getElementById("heatmap-container")) refreshHeatmap()
  if(ACTIVE_DETAIL_ID === id) openEvent(id)
}

async function saveAttendanceCheck(){
  const c = window.ATT_CHECK
  if(!c || MEMBER_ROLE !== "ADMIN") return
  try{
    closeAttendanceCheck()
    showSaving()
    await api("finalizeattendance", {event: c.id, present: [...c.checked], by: MEMBER_EMAIL})
    afterAttendanceChange(c.id, "Docházka potvrzena ✓")
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba při ukládání docházky: " + (err?.message || err))
  }
}

async function reopenAttendanceCheck(){
  const c = window.ATT_CHECK
  if(!c || MEMBER_ROLE !== "ADMIN") return
  if(!confirm("Zrušit potvrzení docházky? Statistiky se pak znovu počítají podle toho, co členové zadali.")) return
  try{
    closeAttendanceCheck()
    showSaving()
    await api("reopenattendance", {event: c.id})
    afterAttendanceChange(c.id, "Potvrzení zrušeno ✓")
  }catch(err){
    hideSaving("Chyba ✗")
    alert("Chyba: " + (err?.message || err))
  }
}

async function renderHeatmap(){
  try{
    const data    = await cachedApi("heatmap")
    const events  = data.events  || []
    const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]
    // účty s rolí GUEST (např. testovací Host_ZV) do docházky nepatří; server je už vynechává, tohle hlídá i starou uloženou odpověď
    const guestEmails = new Set((window.MEMBERS || []).filter(m => (m.ROLE || m.role || "").toUpperCase() === "GUEST").map(m => (m.EMAIL || m.email || "").toLowerCase()))
    const members = (data.members || []).filter(m => (m.ROLE || "").toUpperCase() !== "GUEST" && !guestEmails.has((m.EMAIL || "").toLowerCase()) && voiceOrder.includes(m.VOICE)).sort((a, b) => {
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
     return d.getFullYear() === year && d.getMonth() + 1 === month
   }).sort((a, b) => new Date(a.DATE) - new Date(b.DATE))

    const monthName = new Date(year, month - 1, 1).toLocaleDateString("cs-CZ", {month: "long", year: "numeric"})

    const lookup = {}
    rows.forEach(r => {
      lookup[r.ID_AKCE + "_" + r.EMAIL] = {status: r.STATUS || "", reason: r.REASON || "", actual: r.ACTUAL || ""}
    })
    window.HM_DATA = { events, members, lookup }   // pro okno s podrobnostmi člena (heatmapDetail)

    let html = `<div class="card" style="padding:16px">
      <div class="event-label" style="margin-bottom:12px">Docházka skupiny</div>
      ${monthSliderHtml("heat", HEATMAP_MONTH)}`

    if(!filtered.length){
      html += "<p class='notice'>Žádné akce v tomto měsíci</p>"
      return html
    }

    html += `<div class="hm">${isDesktop ? heatmapDesktopHtml(filtered, members, lookup) : heatmapMobileHtml(filtered, members, lookup)}</div></div>`

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
    if(e.target.closest && e.target.closest(".modal:not(.hidden)")) return   // tažení uvnitř okna (bottom sheet) stránku neobnovuje
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

function readFormField(f){
  const el = document.getElementById("fModal_" + f.key)
  if(f.type === "checkboxes") return el ? [...el.querySelectorAll("input:checked")].map(i => i.value) : []
  return el?.value || ""
}

function openFormModal(title, fields, onSubmit){
  const modal     = document.getElementById("formModal")
  const titleEl   = document.getElementById("formModalTitle")
  const bodyEl    = document.getElementById("formModalBody")
  const submitBtn = document.getElementById("formModalSubmit")

  titleEl.textContent = title
  bodyEl.innerHTML = fields.map(f => `
    <label style="display:block;margin-bottom:12px">
      ${f.label}<br>
      ${f.type === "checkboxes"
        ? `<div id="fModal_${f.key}" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
            ${(f.options||[]).map(o => `<label style="display:flex;align-items:center;gap:8px;margin:0;font-weight:normal"><input type="checkbox" value="${escapeHtml(o)}" ${(f.value||[]).includes(o) ? "checked" : ""} style="width:auto;margin:0"><span>${escapeHtml(o)}</span></label>`).join("")}
           </div>`
        : f.type === "textarea"
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
      if(!el || savedForm.fields[f.key] === undefined) return
      if(f.type === "checkboxes") el.querySelectorAll("input").forEach(i => { i.checked = savedForm.fields[f.key].includes(i.value) })
      else el.value = savedForm.fields[f.key]
    })
  }

  // ukládej průběžně
  fields.forEach(f => {
    const el = document.getElementById("fModal_" + f.key)
    if(el){
      el.addEventListener("input", () => {
        const formState = {}
        fields.forEach(f => {
          formState[f.key] = readFormField(f)
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
      values[f.key] = f.type === "checkboxes" ? readFormField(f) : (document.getElementById("fModal_" + f.key)?.value.trim() || "")
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
    Object.keys(localStorage)
      .filter(k => k.startsWith("cache_detail_"))
      .forEach(k => localStorage.removeItem(k))   // jinak by se otevřený detail obnovil ze starého uloženého stavu
    CACHE.detail = {}
    CACHE.ts     = {}
    if(ACTIVE_TAB === "dashboard")   renderDashboard()
    else if(ACTIVE_TAB === "events"){
      // otevřený detail se jen obnoví na místě (sekce a pozice zůstanou), nevracíme uživatele do seznamu
      if(ACTIVE_DETAIL_ID) openEvent(ACTIVE_DETAIL_ID)
      else renderEvents()
    }

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
      // aktualizuj program v dashboardu a marketingové úkoly v kartě Úkoly (odškrtnuté v detailu akce nebo jinde)
      updateDashboardAttendance()
      updateDashboardTodos()
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
            <button class="btn-info" onclick="event.stopPropagation();editAktualita('${escapeHtml(a.id)}','${escapeHtml(a.text||"").replaceAll("'","\\'")}','${a.date||""}')">Upravit</button>
            <button class="btn-danger" onclick="event.stopPropagation();deleteAktualita('${escapeHtml(a.id)}')">Smazat</button>
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
    if(!document.querySelector(".dash-todos")) return

    // úkoly přidělené mně se mohly změnit také: když se je nepodaří načíst, panel Moje zůstane, jak je
    let my = null
    try{ my = await api("mytasks", {email: MEMBER_EMAIL}) }catch(e){ /* panel Moje beze změny */ }

    // marketingové úkoly se mohly změnit v detailu akce nebo u někoho jiného: když se nenačtou, zůstane předchozí stav
    let mk = null
    try{ mk = await api("marketingtasks") }catch(e){ /* sekce Marketing beze změny */ }

    const all = document.getElementById("ukolyAll")
    if(all) all.innerHTML = ukolyVsechnyHtml(todos, mk === null ? (window.MK_ALL_LAST || []) : mk)
    if(mk !== null) window.MK_ALL_LAST = mk
    const setCount = (id, n) => { const el = document.querySelector(`[data-ukoly-count="${id}"]`); if(el) el.textContent = "· " + n }
    setCount("vsechny", (Array.isArray(todos) ? todos.filter(t => t.done !== true).length : 0) + (window.MK_ALL_LAST || []).length)
    if(my){
      const mine = document.getElementById("ukolyMoje")
      if(mine) mine.innerHTML = ukolyMojeHtml(my)
      setCount("moje", my.length)
    }
  }catch(e){ console.error("updateDashboardTodos:", e) }
}

window.updateDashboardTodos = updateDashboardTodos

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
Object.assign(window, { evOnType, evPick, evSetDur, evKdyUpdate, evUpdateRecurrence, evMulti, evOnline, evObS, evSmazat, evNotify, evClearErr })
window.deleteEvent          = deleteEvent
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
window.copyProgramFromPrevious = copyProgramFromPrevious
window.toggleProgSource = toggleProgSource
window.renderProgSource = renderProgSource
window.copyProgramFrom = copyProgramFrom
window.filterProgSongs      = filterProgSongs
window.heatmapPrev          = heatmapPrev
window.heatmapNext          = heatmapNext
window.heatmapInfo          = heatmapInfo
window.heatmapDetail        = heatmapDetail
window.openAttendanceCheck  = openAttendanceCheck
window.toggleAttendanceRow  = toggleAttendanceRow
window.attMark              = attMark
window.closeAttendanceCheck = closeAttendanceCheck
window.saveAttendanceCheck  = saveAttendanceCheck
window.reopenAttendanceCheck = reopenAttendanceCheck
window.closeHeatmapDetail   = closeHeatmapDetail
window.eventsMonthPrev      = eventsMonthPrev
window.eventsMonthNext      = eventsMonthNext
window.prefetchProgramPdfs  = prefetchProgramPdfs
window.Auth                 = Auth
window.toggleDarkMode       = toggleDarkMode
window.setActiveTab         = setActiveTab
window.openSettings         = openSettings
window.applyDarkMode        = applyDarkMode
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
window.toggleCvtSection     = toggleCvtSection
window.setZkusebnaTab       = setZkusebnaTab
window.renderHarmonogramDetail = renderHarmonogramDetail
window.dnyDo = dnyDo
