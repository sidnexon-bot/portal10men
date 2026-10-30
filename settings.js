/* 10base – Nastavení člena (stránka z profilového menu), skrytí bočního panelu.
   • Přizpůsobit: výchozí režim (světlý / tmavý / podle systému) a karty Přehledu (zobrazit, odebrat, pořadí přetahováním),
   • Osobní údaje: jen pro čtení (jméno, datum narození, adresa, hlas, role, číslo účtu).
   Nastavení: /userActivity/{e-mail}/settings10base (smí jen sám člen) + localStorage.
   Osobní údaje: /memberPrivate/{e-mail} (čte je člen sám a administrátor, zapisuje jen administrátor; viz database.rules.json).
   Rozhraní: window.tenSettings { boot, start, render, setTheme, dashboardCards, privateGet, privateSet }. */
import { database, auth, ref, get, set } from "./firebase.js"

const LS = "10base-theme", LSS = "10base-settings", SB = "10base-sidebar-collapsed"
const CARDS = [
  { id: "nearest", title: "Nejbližší akce", desc: "Nejbližší akce s tvou docházkou" },
  { id: "aktuality", title: "Aktuality", desc: "Zprávy pro celý sbor" },
  { id: "todos", title: "Úkoly", desc: "Společné úkoly sboru" },
  { id: "spring", title: "Jaro / Léto", desc: "Koncerty od ledna do června" },
  { id: "autumn", title: "Podzim / Zima", desc: "Koncerty od července do prosince" },
  { id: "heatmap", title: "Docházka skupiny", desc: "Přehled docházky na zkoušky" },
  { id: "contacts", title: "Kontakty", desc: "Kontakty na členy sboru" }
]
const THEMES = [["light", "Světlý"], ["dark", "Tmavý"], ["system", "Podle systému"]]
const ids = CARDS.map(c => c.id)
const card = id => CARDS.find(c => c.id === id)
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null
let S = { theme: "light", dashboard: { order: ids.slice(), hidden: [] } }
let started = false, saveTimer = 0, area = null, priv = null

const user = () => { try { return JSON.parse(localStorage.getItem("10base_user") || "null") } catch (e) { return null } }
const keyOf = email => String(email || "").replace(/\./g, "_").replace(/@/g, "_")
const myKey = () => keyOf(user()?.email)

function cleanDash(d) {
  d = d || {}
  const order = (Array.isArray(d.order) ? d.order : []).filter((i, p, a) => ids.includes(i) && a.indexOf(i) === p)
  const hidden = (Array.isArray(d.hidden) ? d.hidden : []).filter((i, p, a) => ids.includes(i) && a.indexOf(i) === p)
  ids.forEach(i => { if (!order.includes(i)) order.push(i) })
  return { order, hidden }
}
const legacyTheme = () => { try { return localStorage.getItem("darkMode") === "1" ? "dark" : "light" } catch (e) { return "light" } }
function loadLocal() {
  try { const t = localStorage.getItem(LS); S.theme = (t === "light" || t === "dark" || t === "system") ? t : legacyTheme() } catch (e) { S.theme = "light" }
  try { const raw = localStorage.getItem(LSS + ":" + myKey()); if (raw) S.dashboard = cleanDash(JSON.parse(raw).dashboard) } catch (e) { /* výchozí */ }
}
const isDark = () => S.theme === "dark" || (S.theme === "system" && !!mq && mq.matches)
function persist() {
  try { localStorage.setItem(LS, S.theme); localStorage.setItem("darkMode", isDark() ? "1" : "0"); localStorage.setItem(LSS + ":" + myKey(), JSON.stringify({ dashboard: S.dashboard })) } catch (e) { /* bez uložení */ }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!myKey() || !auth.currentUser || navigator.onLine === false) return
    set(ref(database, "/userActivity/" + myKey() + "/settings10base"), { theme: S.theme, dashboard: S.dashboard }).catch(() => { /* příště */ })
  }, 600)
}

/* ── vzhled ── */
function applyTheme() { const d = isDark(); if (window.applyDarkMode) window.applyDarkMode(d); else { document.body.classList.toggle("dark", d); window.tenChrome && window.tenChrome(d) } }
function setTheme(mode) { if (!["light", "dark", "system"].includes(mode)) return; S.theme = mode; applyTheme(); persist(); refresh() }
if (mq) (mq.addEventListener ? mq.addEventListener("change", () => { if (S.theme === "system") applyTheme() }) : mq.addListener(() => { if (S.theme === "system") applyTheme() }))

/* ── karty Přehledu ── */
const isDefaultDash = () => JSON.stringify(S.dashboard) === JSON.stringify(cleanDash(null))
const dashboardCards = () => S.dashboard.order.filter(i => !S.dashboard.hidden.includes(i))
function setDash(next) { S.dashboard = cleanDash(next); persist(); refresh() }
function move(id, dir) {
  const vis = dashboardCards(), i = vis.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= vis.length) return
  const order = S.dashboard.order.slice(), a = order.indexOf(vis[i]), b = order.indexOf(vis[j]); [order[a], order[b]] = [order[b], order[a]]
  setDash({ order, hidden: S.dashboard.hidden })
}
const hide = id => setDash({ order: S.dashboard.order, hidden: S.dashboard.hidden.concat(id) })
const show = id => setDash({ order: S.dashboard.order.filter(i => i !== id).concat(id), hidden: S.dashboard.hidden.filter(i => i !== id) })

/* ── osobní údaje (jen pro čtení) ── */
async function privateGet(email) {
  const k = keyOf(email); if (!k) return null
  try { return (await get(ref(database, "/memberPrivate/" + k))).val() || {} } catch (e) { return null }
}
async function privateSet(email, data) {
  const k = keyOf(email); if (!k) throw new Error("Chybí e-mail člena.")
  const clean = { birth: String(data.birth || "").trim(), address: String(data.address || "").trim(), bank: String(data.bank || "").trim() }
  await set(ref(database, "/memberPrivate/" + k), clean)
}
const fmtBirth = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? `${+m[3]}. ${+m[2]}. ${m[1]}` : (v || "") }
function me() {
  const u = user() || {}, list = window.MEMBERS || []
  const m = list.find(x => (x.EMAIL || x.email || "").toLowerCase() === String(u.email || "").toLowerCase()) || {}
  return { name: m.NAME || m.name || u.name || "", voice: m.VOICE || m.voice || "", role: (m.ROLE || m.role || u.role || "").toUpperCase(), email: u.email || "" }
}
const ROLE_CS = { ADMIN: "Administrátor (ADMIN)", OWNER: "Vlastník (Owner)", MEMBER: "Člen (MEMBER)", ART: "Umělecký vedoucí (ART)", GUEST: "Host (GUEST)" }

/* ── stránka ── */
const ICON = {
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
}
function infoRow(label, value) {
  return `<div class="st-row st-info"><div class="st-name">${esc(label)}</div><div class="st-val">${value ? esc(value) : '<span class="st-empty-v">nevyplněno</span>'}</div></div>`
}
function aboutHtml() {
  const V = globalThis.TEN_VERSION || {}
  return `<div class="card st-card"><div class="st-row st-row-seg"><div class="st-t"><div class="st-name">10base ${esc(V.version || "")}</div><div class="st-desc">Vydáno ${esc(V.date || "")}. Aplikace sama nabídne obnovení, jakmile vyjde novější verze.</div></div><div class="st-acts"><button type="button" class="st-add" data-check-update="1"><span id="st-upd-label">Zkontrolovat aktualizace</span></button></div></div></div>`
}
function pageHtml() {
  const vis = dashboardCards(), hidden = S.dashboard.hidden
  const shown = vis.length ? `<div class="st-list" id="st-list">${vis.map(id => { const c = card(id); return `<div class="st-row" data-card="${id}"><button type="button" class="st-grip" data-grip="${id}" aria-label="Přesunout kartu ${esc(c.title)} (šipky nahoru a dolů)" title="Přetáhni">${ICON.grip}</button><div class="st-t"><div class="st-name">${esc(c.title)}</div><div class="st-desc">${esc(c.desc)}</div></div><div class="st-acts"><button type="button" class="st-ic" data-hide="${id}" aria-label="Odebrat z Přehledu: ${esc(c.title)}" title="Odebrat">${ICON.minus}</button></div></div>` }).join("")}</div>` : `<div class="st-empty">Přehled je prázdný. Přidej karty níže.</div>`
  const more = hidden.map(id => { const c = card(id); return `<div class="st-row" data-card="${id}"><div class="st-t"><div class="st-name">${esc(c.title)}</div><div class="st-desc">${esc(c.desc)}</div></div><div class="st-acts"><button type="button" class="st-add" data-show="${id}">${ICON.plus}<span>Přidat</span></button></div></div>` }).join("")
  const seg = THEMES.map(t => `<button type="button" role="radio" aria-checked="${S.theme === t[0]}" class="${S.theme === t[0] ? "on" : ""}" data-theme="${t[0]}">${t[1]}</button>`).join("")
  const isDefault = JSON.stringify(S.dashboard) === JSON.stringify(cleanDash(null))
  const m = me()
  const p = priv
  const personal = `<div class="card st-card"><p class="st-hint" style="margin-top:0">Údaje jsou jen pro čtení. Změnu nebo doplnění ti udělá administrátor.</p>
    ${infoRow("Jméno a příjmení", m.name)}${infoRow("Datum narození", p ? fmtBirth(p.birth) : "")}${infoRow("Adresa", p ? p.address : "")}${infoRow("Hlas", m.voice)}${infoRow("Uživatelská role", ROLE_CS[m.role] || m.role)}
    <div class="st-sub">Platební údaje</div>${infoRow("Číslo účtu", p ? p.bank : "")}</div>`
  return `<div class="st-wrap"><button type="button" class="st-back" data-back="1">${ICON.back}<span>Zpět</span></button><h2 class="st-title">Nastavení</h2><h3 class="st-h">Přizpůsobit</h3>
    <div class="card st-card"><div class="event-label">Vzhled</div><div class="st-row st-row-seg"><div class="st-t"><div class="st-name">Výchozí režim</div><div class="st-desc">Světlý, tmavý, nebo podle nastavení telefonu či počítače. Platí na všech tvých zařízeních.</div></div><div class="st-seg" role="radiogroup" aria-label="Výchozí režim">${seg}</div></div></div>
    <div class="card st-card"><div class="event-label">Přehled</div><p class="st-hint">Vyber, které karty se na Přehledu zobrazují, a přetažením změň jejich pořadí.</p>${shown}</div>
    ${more ? `<div class="card st-card"><div class="event-label">Další karty</div>${more}</div>` : ""}
    <div class="st-foot"><button type="button" class="st-add" data-reset="1" ${isDefault ? "disabled" : ""}><span>Obnovit výchozí Přehled</span></button></div>
    <h3 class="st-h">Osobní údaje</h3>${personal}
    <h3 class="st-h">O aplikaci</h3>${aboutHtml()}</div>`
}
function refresh() {
  if (!area || !area.isConnected || !area.querySelector(".st-wrap")) return
  const y = window.scrollY; area.innerHTML = pageHtml(); window.scrollTo(0, y)
}
function back() { if (typeof window.__tenSettingsBack === "function") window.__tenSettingsBack() }
function onClick(e) {
  const t = e.target.closest && e.target.closest("[data-theme],[data-hide],[data-show],[data-reset],[data-back],[data-check-update]")
  if (!t || !area || !area.contains(t)) return
  if (t.dataset.theme) return setTheme(t.dataset.theme)
  if (t.dataset.checkUpdate) {
    const lb = document.getElementById("st-upd-label"); if (lb) lb.textContent = "Kontroluji…"
    return (window.tenVersionCheck ? window.tenVersionCheck(true) : Promise.resolve(null)).then(r => { const l2 = document.getElementById("st-upd-label"); if (l2) l2.textContent = r === false ? "Máte nejnovější verzi" : r === null ? "Nepodařilo se zjistit" : "Nová verze " + r })
  }
  if (t.dataset.back) return back()
  if (t.dataset.hide) return hide(t.dataset.hide)
  if (t.dataset.show) return show(t.dataset.show)
  if (t.dataset.reset) return setDash(null)
}

/* přetahování karet (myš, dotyk, pero) a klávesnice (šipky na úchytu) */
let D = null
function dragStart(e) {
  const g = e.target.closest && e.target.closest(".st-grip"); if (!g || (e.button && e.button !== 0)) return
  const row = g.closest(".st-row"), list = row && row.parentNode; if (!list) return
  e.preventDefault()
  D = { row, list, startY: e.clientY, pid: e.pointerId, grip: g }
  try { g.setPointerCapture(e.pointerId) } catch (x) { /* bez zachycení */ }
  row.classList.add("dragging"); list.classList.add("is-dragging")
}
function relayout(fn) { const r = D.row; r.style.transform = "none"; const t0 = r.getBoundingClientRect().top; fn(); D.startY += r.getBoundingClientRect().top - t0 }
function dragMove(e) {
  if (!D || e.pointerId !== D.pid) return
  D.row.style.transform = `translateY(${e.clientY - D.startY}px)`
  for (let k = 0; k < 4; k++) {
    const rr = D.row.getBoundingClientRect(), c = rr.top + rr.height / 2, prev = D.row.previousElementSibling, next = D.row.nextElementSibling
    if (prev && c < prev.getBoundingClientRect().top + prev.offsetHeight / 2) relayout(() => D.list.insertBefore(D.row, prev))
    else if (next && c > next.getBoundingClientRect().top + next.offsetHeight / 2) relayout(() => D.list.insertBefore(next, D.row))
    else break
    D.row.style.transform = `translateY(${e.clientY - D.startY}px)`
  }
}
function dragEnd(e) {
  if (!D || (e && e.pointerId !== D.pid)) return
  const d = D; D = null
  try { d.grip.releasePointerCapture(d.pid) } catch (x) { /* už uvolněno */ }
  d.row.style.transform = ""; d.row.classList.remove("dragging"); d.list.classList.remove("is-dragging")
  const order = [...d.list.querySelectorAll(".st-row")].map(r => r.dataset.card)
  if (order.join() !== dashboardCards().join()) setDash({ order: order.concat(S.dashboard.order.filter(i => !order.includes(i))), hidden: S.dashboard.hidden })
}
function onKey(e) {
  const g = e.target.closest && e.target.closest(".st-grip"); if (!g || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
  e.preventDefault(); const id = g.dataset.grip; move(id, e.key === "ArrowUp" ? -1 : 1)
  const again = area && area.querySelector(`.st-grip[data-grip="${id}"]`); if (again) again.focus()
}
async function render(el) {
  area = el; area.innerHTML = pageHtml()
  if (!area.__stBound) {
    area.__stBound = true; area.addEventListener("click", onClick); area.addEventListener("keydown", onKey)
    area.addEventListener("pointerdown", dragStart); area.addEventListener("pointermove", dragMove); area.addEventListener("pointerup", dragEnd); area.addEventListener("pointercancel", dragEnd)
  }
  const u = user(); if (u?.email) { priv = await privateGet(u.email); refresh() }
}

/* ── boční panel jen s ikonami ── */
function applySidebar(c) {
  document.body.classList.toggle("sb-collapsed", c)
  const b = document.getElementById("sidebarCollapse"); if (!b) return
  const t = c ? "Zobrazit panel" : "Skrýt panel"; b.setAttribute("aria-pressed", String(c)); b.setAttribute("aria-label", t); b.title = t
  const l = b.querySelector(".sidebar-collapse-label"); if (l) l.textContent = t
}
function initSidebar() {
  const bottom = document.querySelector(".sidebar-bottom"); if (!bottom || document.getElementById("sidebarCollapse")) return
  bottom.insertAdjacentHTML("beforeend", `<div class="sidebar-action-sep" role="separator"></div><button type="button" class="sidebar-action sidebar-collapse" id="sidebarCollapse" aria-pressed="false"><span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></span><span class="sidebar-collapse-label">Skrýt panel</span></button>`)
  document.getElementById("sidebarCollapse").addEventListener("click", () => { const c = !document.body.classList.contains("sb-collapsed"); applySidebar(c); try { localStorage.setItem(SB, c ? "1" : "0") } catch (e) { /* bez uložení */ } })
  document.addEventListener("mouseover", e => { const el = e.target.closest && e.target.closest(".sb-collapsed .sidebar-nav-item, .sb-collapsed .sidebar-action"); if (el) el.title = el.textContent.replace(/\s+/g, " ").trim() })
  let c = false; try { c = localStorage.getItem(SB) === "1" } catch (e) { /* bez uložení */ }
  applySidebar(c)
}

/* ── start ── */
function boot() { loadLocal(); applyTheme() }
async function start() {
  initSidebar()
  if (started || !myKey()) return; started = true
  loadLocal(); applyTheme()
  try {
    const v = (await get(ref(database, "/userActivity/" + myKey() + "/settings10base"))).val()
    if (!v) { persist(); return }
    if (["light", "dark", "system"].includes(v.theme)) S.theme = v.theme
    if (v.dashboard) S.dashboard = cleanDash(v.dashboard)
    applyTheme()
    try { localStorage.setItem(LS, S.theme); localStorage.setItem(LSS + ":" + myKey(), JSON.stringify({ dashboard: S.dashboard })) } catch (e) { /* bez uložení */ }
    refresh(); if (typeof window.__tenSettingsChanged === "function") window.__tenSettingsChanged()
  } catch (e) { /* bez připojení platí místní nastavení */ }
}

window.tenSettings = { boot, start, render, setTheme, dashboardCards, privateGet, privateSet, isDefaultDash, theme: () => S.theme, isDark, _state: () => S }
