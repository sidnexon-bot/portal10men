/* 10base – Nastavení člena (stránka z profilového menu), skrytí bočního panelu.
   • Přizpůsobit: výchozí režim (světlý / tmavý / podle systému) a karty Přehledu (zobrazit, odebrat, pořadí přetahováním),
   • Osobní údaje: jen pro čtení (jméno, datum narození, adresa, hlas, role, číslo účtu).
   Nastavení: /userActivity/{e-mail}/settings10base (smí jen sám člen) + localStorage.
   Moje auta: /memberAuta/{e-mail}/{id auta} (zapisuje člen sám a administrátor, čtou všichni členy; slouží k obsazenosti aut v posádkách akcí).
   Osobní údaje: /memberPrivate/{e-mail} (čte je člen sám a administrátor, zapisuje jen administrátor; viz database.rules.json).
   Rozhraní: window.tenSettings { boot, start, render, setTheme, dashboardCards, privateGet, privateSet }. */
import { database, auth, ref, get, set } from "./firebase.js"

const LS = "10base-theme", LSS = "10base-settings", SB = "10base-sidebar-collapsed"
const CARDS = [
  { id: "todos", title: "Úkoly", desc: "Moje úkoly a společné úkoly sboru (přepínač Moje / Všechny)" },
  { id: "nearest", title: "Nejbližší akce", desc: "Nejbližší akce s tvou docházkou" },
  { id: "aktuality", title: "Aktuality", desc: "Zprávy pro celý sbor" },
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
let started = false, saveTimer = 0, area = null, priv = null, sablony = null, sablonyMsg = {}, auta = null, autaMsg = {}, autoEdit = null

const user = () => { try { return JSON.parse(localStorage.getItem("10base_user") || "null") } catch (e) { return null } }
const keyOf = email => String(email || "").replace(/\./g, "_").replace(/@/g, "_")
const myKey = () => keyOf(user()?.email)

// Karty „Moje úkoly“ a „Úkoly“ jsou jedna karta „Úkoly“: stojí na dřívější z obou pozic a je skrytá jen tehdy, když byly skryté obě
function mergeTasks(d) {
  const ord = Array.isArray(d.order) ? d.order : [], hid = Array.isArray(d.hidden) ? d.hidden : []
  if (!ord.includes("mytasks") && !hid.includes("mytasks")) return d
  const shown = id => ord.includes(id) && !hid.includes(id)
  const order = []
  ord.forEach(i => { if (i === "mytasks" || i === "todos") { if (!order.includes("todos")) order.push("todos") } else order.push(i) })
  const hidden = hid.filter(i => i !== "mytasks" && i !== "todos")
  if (!shown("mytasks") && !shown("todos")) hidden.push("todos")
  return { order, hidden }
}
function cleanDash(d) {
  d = mergeTasks(d || {})
  const order = (Array.isArray(d.order) ? d.order : []).filter((i, p, a) => ids.includes(i) && a.indexOf(i) === p)
  const hidden = (Array.isArray(d.hidden) ? d.hidden : []).filter((i, p, a) => ids.includes(i) && a.indexOf(i) === p)
  // nová karta se zařadí podle výchozího pořadí (za předchozí kartu, která v pořadí je), ne na konec
  ids.forEach((i, k) => { if (!order.includes(i)) { const prev = ids.slice(0, k).reverse().find(p => order.includes(p)); order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, i) } })
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
  return { name: m.NAME || m.name || u.name || "", voice: m.VOICE || m.voice || "", role: (m.ROLE || m.role || u.role || "").toUpperCase(), email: u.email || "", since: m.SINCE || m.since || "" }
}
const ROLE_CS = { ADMIN: "Administrátor (ADMIN)", OWNER: "Vlastník (Owner)", MEMBER: "Člen (MEMBER)", ART: "Umělecký vedoucí (ART)", GUEST: "Host (GUEST)" }

/* ── moje auta (počet míst pro posádky akcí, palivo a spotřeba pro budoucí vyúčtování paliva) ── */
const PALIVA = ["Benzín", "Nafta", "LPG", "CNG", "Elektro", "Hybrid"]
const autaKey = () => String(user()?.email || "").toLowerCase().replace(/\./g, "_").replace(/@/g, "_")
async function autaLoad() {
  const k = autaKey(); if (!k) return
  try {
    const v = (await get(ref(database, "/memberAuta/" + k))).val() || {}
    auta = Object.entries(v).map(([id, a]) => ({ id, ...a })).sort((x, y) => String(x.nazev).localeCompare(String(y.nazev), "cs"))
  } catch (e) { auta = null }
  refresh()
}
async function autaWrite(list) {
  const out = {}
  list.forEach(a => {
    out[a.id] = { nazev: a.nazev, mist: a.mist }
    if (a.palivo) out[a.id].palivo = a.palivo
    if (a.spotreba) out[a.id].spotreba = a.spotreba
    if (a.vychozi) out[a.id].vychozi = true
  })
  await set(ref(database, "/memberAuta/" + autaKey()), list.length ? out : null)
}
function autoMsg(id, text) {
  autaMsg[id] = text
  const el = area && area.querySelector(`[data-auto="${id}"] [role=status]`)
  if (el) { el.textContent = text; el.style.color = autoMsgColor(text) }
}
const autoMsgColor = text => text && !/^Ukládám/.test(text) ? "#ff3b30" : ""   // chyba červeně, průběh šedě
function autoSouhrn(a) {
  const dily = [`${a.mist} ${a.mist === 1 ? "místo" : (a.mist >= 2 && a.mist <= 4 ? "místa" : "míst")}`]
  if (a.palivo) dily.push(a.palivo)
  dily.push(a.spotreba ? `${String(a.spotreba).replace(".", ",")} ${a.palivo === "Elektro" ? "kWh" : "l"}/100 km` : "doplň spotřebu")
  return dily.join(" · ")
}
/* živý náhled auta: místa jako dlaždice (řidič + spolucestující), název a souhrn přesně tak, jak je uvidí seznam aut */
const auUnit = palivo => palivo === "Elektro" ? "kWh/100 km" : "l/100 km"
const auFmt = n => String(n).replace(".", ",")
const AU_PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.9 3.1-6.4 7-6.4s7 2.5 7 6.4"/></svg>'
function auSeats(n, grew) {
  return Array.from({ length: n }, (_, i) => i === 0
    ? '<span class="au-seat au-drv" title="Ty (řidič)">Ty</span>'
    : `<span class="au-seat${grew && i === n - 1 ? " au-new" : ""}">${AU_PERSON}</span>`).join("")
}
function auSync(box, grew) {
  const q = s => box.querySelector(s)
  const mist = Number(q("[data-au-mist]").value) || 5, palivo = q("[data-au-palivo]").value
  const sp = Number(String(q("[data-au-spotreba]").value).replace(",", ".")) || 0
  const nazev = q("[data-au-nazev]").value.trim()
  q("[data-au-seats]").innerHTML = auSeats(mist, grew)
  q("[data-au-mistv]").textContent = mist
  const t = q("[data-au-pname]"); t.textContent = nazev || "Název auta"; t.classList.toggle("au-ph", !nazev)
  q("[data-au-psub]").textContent = autoSouhrn({ mist, palivo, spotreba: sp })
  q("[data-au-unit]").textContent = auUnit(palivo)
  q("[data-au-sslider]").classList.toggle("au-set", sp > 0)
  q("[data-au-spv]").textContent = sp > 0 ? auFmt(sp.toFixed(1)) + " " + auUnit(palivo) : "nezadáno"
}
function autoForm(a) {
  const isNew = !a, id = isNew ? "new" : a.id, msg = autaMsg[id] || ""
  const mist = isNew ? 5 : Math.min(9, Math.max(2, Number(a.mist) || 5))
  const palivo = isNew ? "" : (a.palivo || "")
  const sp = isNew || !a.spotreba ? "" : a.spotreba
  const vychozi = isNew ? !(auta || []).length : !!a.vychozi   // první auto je rovnou výchozí
  const fld = "width:100%;box-sizing:border-box"
  const el = palivo === "Elektro"
  return `<div class="card st-card" data-auto="${esc(id)}"><div class="event-label">${isNew ? "Nové auto" : "Upravit auto"}</div>
    <div class="au-prev"><div class="au-seats" data-au-seats>${auSeats(mist)}</div>
      <div class="au-pt"><b data-au-pname class="${isNew || !a.nazev ? "au-ph" : ""}">${esc(isNew || !a.nazev ? "Název auta" : a.nazev)}</b><span class="st-hint" data-au-psub style="margin:0">${esc(autoSouhrn({ mist, palivo, spotreba: Number(sp) || 0 }))}</span></div></div>
    <label class="st-name" for="au-n-${esc(id)}" style="display:block;margin-top:14px">Jak se auto jmenuje?</label>
    <input type="text" id="au-n-${esc(id)}" data-au-nazev maxlength="60" autocomplete="off" enterkeyhint="next" value="${esc(isNew ? "" : a.nazev)}" placeholder="např. Octavia kombi" style="${fld}">
    <div class="au-row"><label class="st-name" for="au-m-${esc(id)}">Kolik lidí se vejde (s řidičem)</label><output class="au-big" data-au-mistv>${mist}</output></div>
    <input type="range" class="au-range" id="au-m-${esc(id)}" data-au-mist min="2" max="9" step="1" value="${mist}" aria-valuetext="${mist} míst">
    <div class="au-ticks" aria-hidden="true">${[2, 3, 4, 5, 6, 7, 8, 9].map(n => `<span>${n}</span>`).join("")}</div>
    <div class="st-name" style="margin-top:14px" id="au-pl-${esc(id)}">Čím jezdí</div>
    <div class="au-chips" role="group" aria-labelledby="au-pl-${esc(id)}">${PALIVA.map(p => `<button type="button" class="au-chip${palivo === p ? " on" : ""}" data-au-pal="${p}" aria-pressed="${palivo === p}">${p}</button>`).join("")}</div>
    <input type="hidden" data-au-palivo value="${esc(palivo)}">
    <div class="au-row"><label class="st-name" for="au-s-${esc(id)}">Spotřeba</label><output class="au-big au-sm" data-au-spv>${sp ? esc(auFmt(Number(sp).toFixed(1))) + " " + auUnit(palivo) : "nezadáno"}</output></div>
    <input type="range" class="au-range au-s${sp ? " au-set" : ""}" data-au-sslider min="${el ? 8 : 3}" max="${el ? 30 : 20}" step="0.1" value="${sp || (el ? 16 : 7)}" aria-label="Spotřeba, posuvník">
    <div class="au-step"><button type="button" class="btn-secondary" data-au-step="-1" aria-label="Spotřeba o 0,1 méně">−</button>
      <input type="number" id="au-s-${esc(id)}" data-au-spotreba required min="0.1" max="40" step="0.1" inputmode="decimal" enterkeyhint="done" value="${esc(sp)}" placeholder="např. 5,4">
      <span class="st-hint" data-au-unit style="margin:0">${auUnit(palivo)}</span>
      <button type="button" class="btn-secondary" data-au-step="1" aria-label="Spotřeba o 0,1 více">+</button></div>
    <div class="st-hint" style="margin:6px 0 0">Zadej podle technického průkazu (posuvník je jen pomůcka, přesné číslo napiš do pole).</div>
    <label style="display:flex;align-items:center;gap:8px;margin:14px 0 0;font-weight:normal"><input type="checkbox" data-au-vychozi ${vychozi ? "checked" : ""} style="width:auto;margin:0"><span>Moje výchozí auto</span></label>
    <div class="st-hint" style="margin:2px 0 0 26px">Předvybere se, když si na akci bereš auto.</div>
    <div class="btn-group" style="margin-top:14px"><button type="button" class="btn-primary" data-au-save="${esc(id)}"><span>${isNew ? "Přidat auto" : "Uložit"}</span></button><button type="button" class="btn-secondary" data-au-cancel="1"><span>Zrušit</span></button>${isNew ? "" : `<button type="button" class="btn-danger" data-au-del="${esc(id)}"><span>Smazat</span></button>`}</div>
    <div role="status" class="st-hint" style="margin:8px 0 0;color:${autoMsgColor(msg) || "inherit"}">${esc(msg)}</div></div>`
}
function autoKarta(a) {
  return `<div role="button" tabindex="0" class="card st-card" data-au-open="${esc(a.id)}" aria-label="Upravit auto ${esc(a.nazev)}" style="cursor:pointer">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="min-width:0"><div class="st-name" style="font-weight:600">${esc(a.nazev)}${a.vychozi ? ' <span class="st-hint" style="margin:0 0 0 6px;font-weight:500">· Výchozí</span>' : ""}</div>
    <div class="st-hint" style="margin:4px 0 0">${esc(autoSouhrn(a))}</div></div><span class="st-ic" style="flex:none;pointer-events:none;display:inline-flex;align-items:center;justify-content:center" aria-hidden="true">${ICON.chev}</span></div></div>`
}
function autaHtml() {
  if (auta === null) return ""
  const karty = auta.map(a => autoEdit === a.id ? autoForm(a) : autoKarta(a)).join("")
  return `<h3 class="st-h">Moje auta</h3>
    <div class="card st-card"><p class="st-hint" style="margin-top:0">Až budeš na akci s dopravou „Auta“ brát auto (tlačítko „Vezmu auto“), vybereš si jedno odsud a ostatní uvidí, kolik v něm zbývá míst. Palivo a spotřeba se předvyplní při proplácení paliva v 10korun. Klepnutím na auto ho upravíš nebo smažeš.</p></div>
    ${autoEdit === "new" ? autoForm(null) : ""}${karty}
    ${autoEdit !== null ? "" : `<div class="st-foot" style="margin-top:12px"><button type="button" class="btn-primary st-add" data-au-new="1">${ICON.plus}<span>Přidat auto</span></button></div>`}`
}
async function saveAuto(btn) {
  const id = btn.dataset.auSave, box = btn.closest("[data-auto]"); if (!box) return
  const nazev = box.querySelector("[data-au-nazev]").value.trim()
  const mist = Math.round(Number(box.querySelector("[data-au-mist]").value))
  const palivo = box.querySelector("[data-au-palivo]").value
  const spotreba = Math.round(Number(String(box.querySelector("[data-au-spotreba]").value).replace(",", ".")) * 10) / 10 || 0
  const vychozi = box.querySelector("[data-au-vychozi]").checked
  if (!nazev) return autoMsg(id, "Zadej název auta.")
  if (!(mist >= 2 && mist <= 9)) return autoMsg(id, "Počet míst musí být 2 až 9.")
  if (!(spotreba > 0 && spotreba <= 40)) return autoMsg(id, "Zadej spotřebu podle technického průkazu (do 40 l/100 km, u elektřiny kWh/100 km).")
  const nove = { id: id === "new" ? "a" + Date.now().toString(36) : id, nazev, mist, palivo, spotreba, vychozi }
  const list = (auta || []).filter(a => a.id !== nove.id).map(a => vychozi ? { ...a, vychozi: false } : a).concat(nove)
  btn.disabled = true; autoMsg(id, "Ukládám…")
  try { await autaWrite(list); autaMsg = {}; autoEdit = null; await autaLoad() }
  catch (e) { btn.disabled = false; autoMsg(id, "Uložení se nepodařilo: " + (e && e.message || e)) }
}
async function delAuto(btn) {
  const id = btn.dataset.auDel, a = (auta || []).find(x => x.id === id)
  if (!a || !confirm(`Smazat auto „${a.nazev}“? V už uložených posádkách akcí zůstane.`)) return
  btn.disabled = true
  try { await autaWrite(auta.filter(x => x.id !== id)); autaMsg = {}; autoEdit = null; await autaLoad() }
  catch (e) { btn.disabled = false; autoMsg(id, "Smazání se nepodařilo: " + (e && e.message || e)) }
}

/* ── stránka ── */
const ICON = {
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
}
function infoRow(label, value) {
  return `<div class="st-row st-info"><div class="st-name">${esc(label)}</div><div class="st-val">${value ? esc(value) : '<span class="st-empty-v">nevyplněno</span>'}</div></div>`
}
/* ── šablony úkolů ke koncertu (vybírají se v podkladech akce; ukládá /config/todo_sablony přes api.js) ── */
const canEditSablony = () => ["ADMIN", "OWNER", "ART"].includes(me().role)
const sbRow = text => `<div class="st-row" data-sb-row style="gap:8px"><input type="text" data-sb-co maxlength="200" value="${esc(text)}" placeholder="Úkol" aria-label="Úkol" style="flex:1 1 auto;min-width:0"><button type="button" class="st-ic" data-sb-rm aria-label="Odebrat úkol" title="Odebrat">${ICON.minus}</button></div>`
function sablonyHtml() {
  if (!canEditSablony()) return ""
  const card = (sb, isNew) => {
    const id = isNew ? "new" : sb.id, msg = sablonyMsg[id], rows = (isNew ? [""] : sb.polozky)
    return `<div class="card st-card" data-sablona="${esc(id)}"><div class="event-label">${isNew ? "Nová šablona" : "Šablona"}</div>
      <label class="st-name" for="sb-n-${esc(id)}">Název</label>
      <input type="text" id="sb-n-${esc(id)}" data-sb-nazev maxlength="80" value="${esc(isNew ? "" : sb.nazev)}" placeholder="např. Koncert – standardní příprava" style="width:100%;box-sizing:border-box">
      <div class="st-name" style="margin-top:10px">Úkoly</div>
      <div data-sb-rows>${rows.map(sbRow).join("")}</div>
      <div class="st-acts" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button type="button" class="st-add" data-sb-add="${esc(id)}">${ICON.plus}<span>Přidat úkol</span></button><button type="button" class="st-add" data-sb-save="${esc(id)}"><span>Uložit šablonu</span></button>${isNew ? "" : `<button type="button" class="st-add" data-sb-del="${esc(id)}"><span>Smazat</span></button>`}<span class="st-hint" role="status" style="margin:0">${esc(msg || "")}</span></div></div>`
  }
  const list = (sablony || []).map(sb => card(sb, false)).join("")
  return `<h3 class="st-h">Šablony úkolů</h3>
    <div class="card st-card"><p class="st-hint" style="margin-top:0">Vlastní seznamy úkolů ke koncertům. V podkladech akce (To-do před koncertem i v den koncertu) vybereš šablonu a tlačítkem „Přidat šablonu“ se úkoly přidají k akci. Úpravy šablony se u akcí, kam už byla přidána, neprojeví.</p>${sablony === null ? '<p class="st-hint">Načítám…</p>' : ""}</div>
    ${list}${sablony === null ? "" : card(null, true)}`
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
    ${infoRow("Jméno a příjmení", m.name)}${infoRow("Datum narození", p ? fmtBirth(p.birth) : "")}${infoRow("Adresa", p ? p.address : "")}${infoRow("Hlas", m.voice)}${infoRow("V 10men působí od", m.since ? fmtBirth(m.since) : "")}${infoRow("Uživatelská role", ROLE_CS[m.role] || m.role)}
    <div class="st-sub">Platební údaje</div>${infoRow("Číslo účtu", p ? p.bank : "")}</div>`
  return `<div class="st-wrap"><button type="button" class="st-back" data-back="1">${ICON.back}<span>Zpět</span></button><h2 class="st-title">Nastavení</h2><h3 class="st-h">Přizpůsobit</h3>
    <div class="card st-card"><div class="event-label">Vzhled</div><div class="st-row st-row-seg"><div class="st-t"><div class="st-name">Výchozí režim</div><div class="st-desc">Světlý, tmavý, nebo podle nastavení telefonu či počítače. Platí na všech tvých zařízeních.</div></div><div class="st-seg" role="radiogroup" aria-label="Výchozí režim">${seg}</div></div></div>
    <div class="card st-card"><div class="event-label">Přehled</div><p class="st-hint">Vyber, které karty se na Přehledu zobrazují, a přetažením změň jejich pořadí.</p>${shown}</div>
    ${more ? `<div class="card st-card"><div class="event-label">Další karty</div>${more}</div>` : ""}
    <div class="st-foot"><button type="button" class="st-add" data-reset="1" ${isDefault ? "disabled" : ""}><span>Obnovit výchozí Přehled</span></button></div>
    ${sablonyHtml()}
    ${autaHtml()}
    <h3 class="st-h">Osobní údaje</h3>${personal}
    <h3 class="st-h">O aplikaci</h3>${aboutHtml()}</div>`
}
function refresh() {
  if (!area || !area.isConnected || !area.querySelector(".st-wrap")) return
  const y = window.scrollY; area.innerHTML = pageHtml(); window.scrollTo(0, y)
}
function back() { if (typeof window.__tenSettingsBack === "function") window.__tenSettingsBack() }
function onClick(e) {
  const t = e.target.closest && e.target.closest("[data-theme],[data-hide],[data-show],[data-reset],[data-back],[data-check-update],[data-sb-save],[data-sb-del],[data-sb-add],[data-sb-rm],[data-au-save],[data-au-del],[data-au-open],[data-au-new],[data-au-cancel],[data-au-pal],[data-au-step]")
  if (!t || !area || !area.contains(t)) return
  if (t.dataset.auPal != null) {   // palivo: volba se dá zrušit druhým klepnutím; posuvník spotřeby dostane rozsah podle paliva
    const box = t.closest("[data-auto]"), on = t.classList.contains("on")
    box.querySelectorAll("[data-au-pal]").forEach(c => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false") })
    if (!on) { t.classList.add("on"); t.setAttribute("aria-pressed", "true") }
    const p = on ? "" : t.dataset.auPal, sl = box.querySelector("[data-au-sslider]"), el = p === "Elektro"
    box.querySelector("[data-au-palivo]").value = p
    sl.min = el ? 8 : 3; sl.max = el ? 30 : 20
    if (!box.querySelector("[data-au-spotreba]").value) sl.value = el ? 16 : 7
    return auSync(box)
  }
  if (t.dataset.auStep != null) {   // spotřeba po 0,1
    const box = t.closest("[data-auto]"), inp = box.querySelector("[data-au-spotreba]"), sl = box.querySelector("[data-au-sslider]")
    const cur = Number(String(inp.value).replace(",", ".")) || Number(sl.value) || 0
    inp.value = Math.min(40, Math.max(0.1, Math.round((cur + 0.1 * Number(t.dataset.auStep)) * 10) / 10)).toFixed(1)
    sl.value = inp.value
    return auSync(box)
  }
  if (t.dataset.auOpen) { autoEdit = t.dataset.auOpen; autaMsg = {}; refresh(); const f = area.querySelector(`[data-auto="${autoEdit}"]`); if (f) { f.scrollIntoView({ block: "nearest" }); f.querySelector("[data-au-nazev]").focus() } return }
  if (t.dataset.auNew) { autoEdit = "new"; autaMsg = {}; refresh(); const f = area.querySelector('[data-auto="new"]'); if (f) { f.scrollIntoView({ block: "nearest" }); f.querySelector("[data-au-nazev]").focus() } return }
  if (t.dataset.auCancel) { autoEdit = null; autaMsg = {}; return refresh() }
  if (t.dataset.auSave) return saveAuto(t)
  if (t.dataset.auDel) return delAuto(t)
  if (t.dataset.sbSave) return saveSablona(t)
  if (t.dataset.sbDel) return delSablona(t)
  if (t.dataset.sbAdd) { const rows = t.closest("[data-sablona]").querySelector("[data-sb-rows]"); rows.insertAdjacentHTML("beforeend", sbRow("")); return rows.lastElementChild.querySelector("[data-sb-co]").focus() }
  if ("sbRm" in t.dataset) { const row = t.closest("[data-sb-row]"), rows = row.parentNode; row.remove(); if (!rows.children.length) rows.insertAdjacentHTML("beforeend", sbRow("")); return }
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

async function loadSablony() {
  if (!canEditSablony() || typeof window.api !== "function") return
  try { sablony = await window.api("gettodosablony") } catch (e) { sablony = [] }
  refresh()
}
function sablonaMsg(id, text) {
  sablonyMsg[id] = text
  const el = area && area.querySelector(`[data-sablona="${id}"] [role=status]`); if (el) el.textContent = text
}
async function saveSablona(btn) {
  const id = btn.dataset.sbSave, box = btn.closest("[data-sablona]"); if (!box) return
  const nazev = box.querySelector("[data-sb-nazev]").value.trim()
  const polozky = [...box.querySelectorAll("[data-sb-row]")].map(r => r.querySelector("[data-sb-co]").value.trim()).filter(Boolean)
  if (!nazev) return sablonaMsg(id, "Zadej název šablony.")
  if (!polozky.length) return sablonaMsg(id, "Přidej aspoň jeden úkol.")
  btn.disabled = true; sablonaMsg(id, "Ukládám…")
  try {
    await window.api("savetodosablona", { id: id === "new" ? undefined : id, nazev, polozky })
    sablonyMsg = {}; sablony = await window.api("gettodosablony"); refresh()
  } catch (e) { btn.disabled = false; sablonaMsg(id, "Uložení se nepodařilo: " + (e && e.message || e)) }
}
async function delSablona(btn) {
  const id = btn.dataset.sbDel, sb = (sablony || []).find(x => x.id === id)
  if (!sb || !confirm(`Smazat šablonu „${sb.nazev}“?`)) return
  btn.disabled = true
  try { await window.api("deletetodosablona", { id }); sablonyMsg = {}; sablony = await window.api("gettodosablony"); refresh() }
  catch (e) { btn.disabled = false; sablonaMsg(id, "Smazání se nepodařilo: " + (e && e.message || e)) }
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
  const k = e.target.closest && e.target.closest("[data-au-open]"); if (k && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return k.click() }
  const g = e.target.closest && e.target.closest(".st-grip"); if (!g || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
  e.preventDefault(); const id = g.dataset.grip; move(id, e.key === "ArrowUp" ? -1 : 1)
  const again = area && area.querySelector(`.st-grip[data-grip="${id}"]`); if (again) again.focus()
}
function onInput(e) {   // živé úpravy karty auta: nic se nepřekresluje, mění se jen to, co je vidět
  const t = e.target, box = t.closest && t.closest("[data-auto]"); if (!box) return
  if (t.matches("[data-au-mist]")) {
    const prev = box.querySelectorAll("[data-au-seats] .au-seat").length
    t.setAttribute("aria-valuetext", t.value + " míst"); auSync(box, Number(t.value) > prev)
  } else if (t.matches("[data-au-nazev]")) auSync(box)
  else if (t.matches("[data-au-sslider]")) { box.querySelector("[data-au-spotreba]").value = Number(t.value).toFixed(1); auSync(box) }
  else if (t.matches("[data-au-spotreba]")) { const v = Number(String(t.value).replace(",", ".")); if (v > 0) box.querySelector("[data-au-sslider]").value = v; auSync(box) }
}
async function render(el) {
  area = el; area.innerHTML = pageHtml()
  if (!area.__stBound) {
    area.__stBound = true; area.addEventListener("click", onClick); area.addEventListener("keydown", onKey); area.addEventListener("input", onInput)
    area.addEventListener("pointerdown", dragStart); area.addEventListener("pointermove", dragMove); area.addEventListener("pointerup", dragEnd); area.addEventListener("pointercancel", dragEnd)
  }
  const u = user(); if (u?.email) { priv = await privateGet(u.email); refresh() }
  loadSablony()
  autaLoad()
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
