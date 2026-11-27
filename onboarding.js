/* 10base – žádost o členství (onboarding.html).
   Postup: přihlášení Googlem → formulář o 4 krocích (O tobě, Kontakt a platby, Discord, Zkontroluj a potvrď) → žádost /memberRequests/{uid}
   → stav „čeká na schválení“. Admin ji potvrdí ve Správě členů (funkce decideMemberRequest), vznikne člen s rolí MEMBER.
   Kdo se sem dostal omylem, může kdykoli odejít (tlačítko „Nejsem z 10men“ odhlásí a vrátí na 10men.cz). */
import { auth, database, ref, get, set, remove, onValue, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "./firebase.js"

const HOME = "https://10men.cz"
const TERMS_VERSION = "2026-11-27"
const TERMS = [
  "Svým podpisem stvrzuji, že jsem se seznámil a souhlasím s platnými Stanovami spolku Vokální skupina 10men, z. s. (dále jen „Spolek“), jehož členem se chci stát. Jsem připraven respektovat výrok schůze výboru Spolku, který rozhoduje o členství.",
  "Stvrzuji, že v případě vzniku mého členství budu plnit veškerá práva a povinnosti člena Spolku, budu se aktivně podílet na spolupráci a naplňování cílů Spolku a budu se řídit stanovami a vnitřními předpisy Spolku, se kterými jsem se seznámil, stejně tak, jako rozhodnutími orgánů Spolku.",
  "Tímto souhlasím se správou, zpracováním a uchováním mých osobních údajů pro vnitřní potřeby Spolku. Tyto činnosti budou prováděny v souladu s příslušnými právními předpisy, zejména se zákonem č. 101/2000 Sb., o ochraně osobních údajů, v platném znění. Tento souhlas poskytuji na dobu mého členství ve Spolku.",
  "Potvrzuji, že uvedené údaje jsou pravdivé a přesné."
]
const VOICES = [["1. TENOR", "1. tenor"], ["2. TENOR", "2. tenor"], ["1. BAS", "1. bas"], ["2. BAS", "2. bas"], ["", "Zatím nevím"]]
const STEPS = ["O tobě", "Kontakt a platby", "Discord", "Zkontroluj a potvrď"]
const BLANK = { name: "", birth: "", phone: "", voice: "", address: "", bank: "", note: "", discord_id: "" }

const app = document.getElementById("app")
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
let user = null, req = null, data = { ...BLANK }, step = 0, errs = {}, unsub = null, createdAt = 0, waitTimer = 0, cancelling = false

try { const t = localStorage.getItem("10base-theme"); document.documentElement.classList.toggle("dark", t === "dark" || ((t === "system" || !t) && matchMedia("(prefers-color-scheme: dark)").matches)) } catch (e) { /* světlý vzhled */ }

const draftKey = () => "10base-onb:" + (user && user.uid)
const saveDraft = () => { try { localStorage.setItem(draftKey(), JSON.stringify({ data, step })) } catch (e) { /* bez uložení */ } }
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(draftKey()) || "null") } catch (e) { return null } }
const clearDraft = () => { try { localStorage.removeItem(draftKey()) } catch (e) { /* nic */ } }

function view(html, opts = {}) {
  app.innerHTML = html
  window.scrollTo(0, 0)
  const h = app.querySelector("h1"); if (h && !opts.keepFocus) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }) }
}
const leaveBtn = label => `<button type="button" class="leave" data-act="leave">${label || "Nejsem z 10men, odejít"}</button>`
const initials = n => String(n || "?").trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((c, k, a) => k === 0 || k === a.length - 1).join("").toUpperCase() || "?"
const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${+m[3]}. ${+m[2]}. ${m[1]}` : iso || "" }
const fmtTs = t => { const d = new Date(t); return isNaN(d) ? "" : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }

/* ── obrazovky ── */
function screenAuth(msg) {
  view(`<div class="onb-body hero"><svg class="logo" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="42" fill="#000"/><text x="42" y="51" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="-apple-system,Roboto,sans-serif">10</text></svg>
    <h1>Vítej v 10men</h1><p class="lead">Chceš se stát členem Vokální skupiny 10men? Přihlas se Googlem. Ověříme tak tvůj e-mail a předvyplníme jméno. Pak vyplníš krátkou žádost o členství, kterou potvrdí administrátor.</p>
    <p class="err" role="alert">${esc(msg || "")}</p></div>
    <div class="dock"><button type="button" class="btn" data-act="login">Pokračovat přes Google</button>
    <a class="btn sec" href="login.html">Už jsem člen: přihlásit do 10base</a>
    <a class="leave" href="${HOME}" style="text-align:center;line-height:44px;margin-top:6px">Jsem tu omylem, odejít na 10men.cz</a></div>`)
}
function screenMember() {
  view(`<div class="onb-body hero"><h1>Už jsi členem</h1><p class="lead">Tvůj účet ${esc(user.email)} je v seznamu členů. Můžeš rovnou do aplikace.</p></div>
    <div class="dock"><a class="btn" href="login.html">Otevřít 10base</a></div>`)
}
function screenApproved() {
  view(`<div class="onb-body hero"><h1>Vítej v 10men!</h1><p class="lead">Žádost je schválená a jsi členem. Přihlas se do 10base a podívej se na nejbližší akce.</p></div>
    <div class="dock"><a class="btn" href="login.html">Otevřít 10base</a></div>`)
}
function screenRejected() {
  view(`<div class="onb-body hero"><h1>Žádost nebyla přijata</h1><p class="lead">Administrátor tvou žádost zamítl.${req.reason ? "" : " Máš-li dotaz, ozvi se výboru spolku."}</p>
    ${req.reason ? `<div class="grp"><div class="row"><div><small>Důvod</small>${esc(req.reason)}</div></div></div><p class="hint">Máš-li dotaz, ozvi se výboru spolku.</p>` : ""}</div>
    <div class="dock">${leaveBtn("Odejít a odhlásit se")}</div>`)
}
function summaryRows(r, editable) {
  const row = (label, value, to) => `<div class="row"><div><small>${label}</small>${value ? esc(value) : '<span style="color:var(--muted)">nevyplněno</span>'}</div>${editable ? `<button type="button" class="onb-ghost edit" data-act="goto" data-step="${to}" aria-label="Upravit: ${label}">Upravit</button>` : ""}</div>`
  const v = (VOICES.find(x => x[0] === r.voice) || [])[1]
  return `<div class="grp">${row("Jméno a příjmení", r.name, 0)}${row("E-mail (ověřený Googlem)", r.email || user.email, -1).replace(/<button.*?<\/button>/, "")}${row("Datum narození", fmtDate(r.birth), 0)}${row("Telefon", r.phone, 0)}${row("Hlas", v || "zatím nevím", 0)}${row("Adresa", r.address, 1)}${row("Číslo účtu", r.bank, 1)}${row("Discord ID", r.discord_id, 2)}${r.note ? row("Poznámka", r.note, 1) : ""}</div>`
}
function screenStatus() {
  view(`<div class="onb-body"><h1>Žádost je odeslaná</h1><p class="lead">Dáme ti vědět, jakmile ji administrátor potvrdí. Tuto stránku můžeš nechat otevřenou, po schválení se sama změní.</p>
    <div class="grp step-list"><div class="stp"><div class="dot">✓</div><div><b>Odesláno</b><br><small style="color:var(--muted)">${esc(fmtTs(req.createdAt))}</small></div></div>
    <div class="stp"><div class="dot w">…</div><div><b>Čeká na schválení</b><br><small style="color:var(--muted)">Administrátor kontroluje údaje</small></div></div>
    <div class="stp"><div class="dot n">3</div><div><b>Vítej v 10men</b></div></div></div>
    <h2>Odeslané údaje</h2>${summaryRows(req, false)}</div>
    <div class="dock"><button type="button" class="btn sec" style="margin-top:0" data-act="edit">Upravit údaje</button><button type="button" class="btn sec danger" data-act="cancel">Zrušit žádost</button>${leaveBtn("Odejít a odhlásit se")}</div>`)
}
const fld = (key, label, attrs = {}) => `<label class="fld${errs[key] ? " bad" : ""}"><span>${label}</span>${attrs.area ? `<textarea data-k="${key}" rows="2" ${attrs.extra || ""}>${esc(data[key])}</textarea>` : `<input data-k="${key}" value="${esc(data[key])}" ${attrs.extra || ""}>`}</label>`
const errLine = keys => { const m = keys.map(k => errs[k]).filter(Boolean)[0]; return `<p class="err" role="alert">${esc(m || "")}</p>` }
function topbar() {
  return `<div class="onb-top"><button type="button" class="onb-ghost" data-act="back" ${step === 0 ? "disabled" : ""} aria-label="Zpět">‹ Zpět</button><div class="onb-bar" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div><span class="onb-step">${step + 1}/${STEPS.length}</span></div>`
}
function accountChip() {
  return `<div class="grp" style="margin-top:6px"><div class="row"><span class="av">${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(initials(user.displayName || user.email))}</span><div><b>${esc(user.displayName || user.email)}</b><small>${esc(user.email)} <span class="ok">✓ ověřeno</span></small></div></div></div>`
}
function screenForm() {
  let body = ""
  if (step === 0) {
    body = `${accountChip()}<h1>O tobě</h1><p class="lead">Údaje uvidí jen administrátoři spolku.</p>
      <div class="grp">${fld("name", "Jméno a příjmení", { extra: 'autocomplete="name" autocapitalize="words" maxlength="100"' })}${fld("birth", "Datum narození", { extra: 'type="date" autocomplete="bday" max="' + new Date().toISOString().slice(0, 10) + '"' })}${fld("phone", "Telefon", { extra: 'type="tel" autocomplete="tel" inputmode="tel" placeholder="+420 …" maxlength="30"' })}</div>
      <h2>Hlas</h2><div class="grp"><div class="chips" role="group" aria-label="Hlas">${VOICES.map(v => `<button type="button" class="chip" data-act="voice" data-v="${esc(v[0])}" aria-pressed="${data.voice === v[0] && (v[0] !== "" || data.voiceSet)}">${v[1]}</button>`).join("")}</div></div>${errLine(["name", "birth", "phone"])}`
  } else if (step === 1) {
    body = `<h1>Kontakt a platby</h1><p class="lead">Adresu potřebuje spolek do evidence členů. Číslo účtu se hodí k proplácení nákladů, můžeš ho doplnit i později v Nastavení.</p>
      <div class="grp">${fld("address", "Adresa trvalého bydliště", { area: true, extra: 'autocomplete="street-address" maxlength="200" placeholder="Ulice a č. p., PSČ, obec"' })}${fld("bank", "Číslo účtu (nepovinné)", { extra: 'inputmode="text" autocomplete="off" maxlength="60" placeholder="123456789/0100"' })}${fld("note", "Jak ses o nás dozvěděl, kdo tě doporučil? (nepovinné)", { area: true, extra: 'maxlength="500"' })}</div>${errLine(["address", "bank"])}`
  } else if (step === 2) {
    body = `<h1>Discord</h1><p class="lead">Domlouváme se přes Discord. Stáhni si aplikaci a vlož své Discord ID, ať tě můžeme přidat do skupiny a označovat u akcí.</p>
      <div class="grp"><div class="store"><a href="https://play.google.com/store/apps/details?id=com.discord" target="_blank" rel="noopener">Google Play</a><a href="https://apps.apple.com/app/discord-talk-play-hang-out/id985746746" target="_blank" rel="noopener">App Store</a><a href="https://discord.com/download" target="_blank" rel="noopener">Počítač</a></div></div>
      <h2>Tvoje Discord ID</h2><div class="grp">${fld("discord_id", "Discord ID (17 až 20 číslic)", { extra: 'inputmode="numeric" autocomplete="off" placeholder="123456789012345678" maxlength="20"' })}</div>${errLine(["discord_id"])}
      <p class="hint">Nejde o přezdívku ani o číslo za #, ale o dlouhé číslo.</p>
      <details open><summary>Jak najdu své Discord ID?</summary>
        <h3>V telefonu</h3><ol><li>Otevři Discord, klepni na svůj profilový obrázek vpravo dole a pak na ozubené kolečko (Nastavení).</li><li>V Nastavení aplikace otevři Pokročilé a zapni Vývojářský režim.</li><li>Vrať se na svůj profil, klepni na tři tečky vpravo nahoře a zvol Zkopírovat ID uživatele.</li><li>Vlož zkopírované číslo do pole výše.</li></ol>
        <h3>V počítači</h3><ol><li>Vlevo dole klikni na ozubené kolečko u svého jména a otevři Pokročilé, zapni Vývojářský režim.</li><li>Klikni pravým tlačítkem na své jméno nebo profilovou fotku a zvol Zkopírovat ID uživatele.</li></ol>
        <p class="hint" style="margin:0 0 12px">Názvy položek se mohou podle verze Discordu mírně lišit.</p></details>`
  } else {
    body = `<h1>Zkontroluj a potvrď</h1><p class="lead">Administrátor údaje před založením členství prověří. Adresu a číslo účtu vidí jen on a ty.</p>${summaryRows({ ...data, email: user.email }, true)}
      <h2>Podmínky členství</h2><div class="terms" tabindex="0" role="region" aria-label="Podmínky členství">${TERMS.map(p => `<p>${esc(p)}</p>`).join("")}</div>
      <label class="check"><input type="checkbox" id="agree" data-act="agree"><span>Přečetl(a) jsem si výše uvedené a potvrzuji to.</span></label>${errLine(["send"])}`
  }
  const last = step === STEPS.length - 1
  view(`${topbar()}<div class="onb-body">${body}</div><div class="dock"><button type="button" class="btn" data-act="${last ? "send" : "next"}" ${last ? "disabled" : ""}>${last ? "Odeslat žádost" : "Pokračovat"}</button>${step === 2 ? '<button type="button" class="btn sec" data-act="skipDiscord">Doplním později</button>' : ""}${leaveBtn()}</div>`)
}

/* ── logika ── */
function validate(s) {
  const e = {}
  if (s === 0) {
    if (String(data.name).trim().length < 3 || !/\s/.test(String(data.name).trim())) e.name = "Napiš jméno a příjmení."
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birth) || data.birth < "1920-01-01" || data.birth > new Date(Date.now() - 6 * 365 * 864e5).toISOString().slice(0, 10)) e.birth = "Vyplň datum narození."
    else if (String(data.phone).replace(/\D/g, "").length < 9) e.phone = "Napiš telefon včetně čísla, např. +420 777 123 456."
  } else if (s === 1) {
    if (String(data.address).trim().length < 5) e.address = "Vyplň adresu bydliště."
    else if (data.bank && !/^((\d{1,6}-)?\d{2,10}\/\d{4}|[A-Za-z]{2}\d{2}[A-Za-z0-9 ]{10,30})$/.test(String(data.bank).trim())) e.bank = "Číslo účtu zadej ve tvaru 123456789/0100 nebo jako IBAN, nebo políčko nech prázdné."
  } else if (s === 2) {
    if (data.discord_id && !/^\d{17,20}$/.test(String(data.discord_id).trim())) e.discord_id = "Discord ID je dlouhé číslo (17 až 20 číslic). Zkopíruj ho podle návodu níže, nebo zvol Doplním později."
  }
  return e
}
function go(s) { step = Math.max(0, Math.min(STEPS.length - 1, s)); errs = {}; saveDraft(); screenForm() }
function sync(t) { if (t.dataset.k) { data[t.dataset.k] = t.value; saveDraft() } }

async function send() {
  const btn = app.querySelector('[data-act="send"]'); if (btn) { btn.disabled = true; btn.textContent = "Odesílám…" }
  const now = Date.now()
  const payload = {
    email: String(user.email).toLowerCase(), name: data.name.trim(), birth: data.birth, phone: data.phone.trim(), voice: data.voice || "", address: data.address.trim(), bank: String(data.bank || "").trim(),
    discord_id: String(data.discord_id || "").trim(), note: String(data.note || "").trim(), termsAccepted: true, termsText: TERMS.join("\n\n"), termsVersion: TERMS_VERSION, termsAcceptedAt: now, status: "pending", createdAt: createdAt || now
  }
  try {
    await set(ref(database, "/memberRequests/" + user.uid), payload)
    clearDraft(); req = payload; watch(); screenStatus()
  } catch (e) {
    errs = { send: "Žádost se nepodařilo odeslat. Zkontroluj údaje a připojení a zkus to znovu. (" + (e && e.code ? e.code : "chyba") + ")" }
    screenForm(); const a = document.getElementById("agree"); if (a) { a.checked = true; app.querySelector('[data-act="send"]').disabled = false }
  }
}
async function cancelReq() {
  if (!confirm("Opravdu zrušit odeslanou žádost? Údaje se smažou a budeš ji muset vyplnit znovu.")) return
  cancelling = true
  try { await remove(ref(database, "/memberRequests/" + user.uid)) } catch (e) { cancelling = false; return alert("Žádost se nepodařilo zrušit. Zkus to znovu.") }
  cancelling = false; req = null; createdAt = 0; data = { ...BLANK, name: user.displayName || "" }; step = 0; screenForm()
}
async function leave() {
  try { if (unsub) unsub() } catch (e) { /* nic */ }
  try { await signOut(auth) } catch (e) { /* odejde se i bez odhlášení */ }
  location.href = HOME
}
async function waitForMembership(tries = 0) {   // žádost zmizela = schválena; přístup se propíše během pár vteřin
  clearTimeout(waitTimer)
  let member = false
  try { member = (await get(ref(database, "/membersByUid/" + user.uid))).exists() } catch (e) { /* ještě bez přístupu */ }
  if (member) return screenApproved()
  if (tries < 30) waitTimer = setTimeout(() => waitForMembership(tries + 1), 2000)
  else screenApproved()
}
function watch() {
  try { if (unsub) unsub() } catch (e) { /* nic */ }
  unsub = onValue(ref(database, "/memberRequests/" + user.uid), snap => {
    const v = snap.val()
    if (v && v.status === "rejected") { req = v; return screenRejected() }
    if (!v && req && req.status === "pending" && !cancelling && !app.querySelector('[data-act="send"]')) { req = null; waitForMembership() }
    else if (v && v.status === "pending") { const changed = !req || JSON.stringify(req) !== JSON.stringify(v); req = v; createdAt = v.createdAt; if (changed && app.querySelector(".step-list")) screenStatus() }
  }, () => { /* bez připojení platí zobrazený stav */ })
}

async function route() {
  let member = false
  try { member = (await get(ref(database, "/membersByUid/" + user.uid))).exists() } catch (e) { /* nečlen */ }
  if (member) return screenMember()
  try { req = (await get(ref(database, "/memberRequests/" + user.uid))).val() } catch (e) { req = null }
  if (req && req.status === "rejected") { watch(); return screenRejected() }
  if (req) { createdAt = req.createdAt; watch(); return screenStatus() }
  const d = loadDraft()
  data = { ...BLANK, name: user.displayName || "", ...(d && d.data ? d.data : {}) }
  step = d && Number.isInteger(d.step) ? d.step : 0
  watch(); screenForm()
}

app.addEventListener("input", e => { if (e.target.dataset && e.target.dataset.k) sync(e.target) })
app.addEventListener("change", e => {
  if (e.target.id === "agree") { const b = app.querySelector('[data-act="send"]'); if (b) b.disabled = !e.target.checked }
})
app.addEventListener("click", async e => {
  const t = e.target.closest("[data-act]"); if (!t) return
  const a = t.dataset.act
  if (a === "login") {
    t.disabled = true
    try { await signInWithPopup(auth, new GoogleAuthProvider()) } catch (x) { if (x && x.code !== "auth/popup-closed-by-user" && x.code !== "auth/cancelled-popup-request") screenAuth("Přihlášení se nepodařilo. Zkus to znovu."); else t.disabled = false }
  } else if (a === "leave") leave()
  else if (a === "voice") { data.voice = t.dataset.v; data.voiceSet = true; saveDraft(); app.querySelectorAll('[data-act="voice"]').forEach(b => b.setAttribute("aria-pressed", String(b === t))) }
  else if (a === "next") { errs = validate(step); if (Object.keys(errs).length) { screenForm(); const bad = app.querySelector(".fld.bad input, .fld.bad textarea"); if (bad) bad.focus() } else go(step + 1) }
  else if (a === "back") go(step - 1)
  else if (a === "goto") go(Number(t.dataset.step))
  else if (a === "skipDiscord") { data.discord_id = ""; go(step + 1) }
  else if (a === "send") {
    for (const s of [0, 1, 2]) { const er = validate(s); if (Object.keys(er).length) { errs = er; step = s; return screenForm() } }
    send()
  } else if (a === "edit") { data = { ...BLANK, ...req }; step = 0; screenForm() }
  else if (a === "cancel") cancelReq()
})

onAuthStateChanged(auth, u => {
  user = u
  clearTimeout(waitTimer)
  if (!u) { try { if (unsub) unsub() } catch (e) { /* nic */ } return screenAuth() }
  route()
})
