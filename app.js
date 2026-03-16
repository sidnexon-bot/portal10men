let MEMBER_ID = null

function currentMember(){
  return MEMBER_ID
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
    weekday:"short",
    day:"numeric",
    month:"numeric",
    year:"numeric"
  }) + " " +
  date.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})
}

function container(){
  return document.getElementById("main")
}

function setLoading(){
  container().innerHTML = "Načítám..."
}

async function start(){

  try{

    setLoading()

    const members = await api("members")

    const select = document.getElementById("memberSelect")

    members.forEach(m=>{
      const opt = document.createElement("option")
      opt.value = m.ID
      opt.textContent = m.NAME || m.JMENO
      select.appendChild(opt)
    })

    select.onchange = () => {
      MEMBER_ID = select.value
      renderOverview()
    }

    renderOverview()

  }catch(err){

    container().innerText = "Chyba při načítání dat: " + (err?.message || err)

  }

}

async function renderOverview(){

  setLoading()

  const events = await api("events")

  if(!Array.isArray(events)){
    container().innerText = "Nepodařilo se načíst akce"
    return
  }

  const upcoming = events
    .filter(e => new Date(e.DATE) >= new Date())
    .sort((a,b)=> new Date(a.DATE) - new Date(b.DATE))[0]

  let html = ""

  html += `<h2>Nejbližší akce</h2>`

  if(!upcoming){

    html += `<div>Žádná akce</div>`

  }else{

    html += `
    <div class="card" onclick="openEvent('${upcoming.ID}')">
      <b>${escapeHtml(upcoming.NAME || upcoming.NAZEV)}</b><br>
      ${formatDate(upcoming.DATE)}<br>
      ${escapeHtml(upcoming.PLACE)}
    </div>
    `

  }

  container().innerHTML = html

}

async function renderEvents(){

  setLoading()

  const events = await api("events")

  if(!Array.isArray(events)){
    container().innerText = "Nepodařilo se načíst akce"
    return
  }

  events.sort((a,b)=> new Date(a.DATE) - new Date(b.DATE))

  let html = "<h2>Akce</h2>"

  events.forEach(e=>{

    html += `
    <div class="card" onclick="openEvent('${e.ID}')">
      <b>${escapeHtml(e.NAME || e.NAZEV)}</b><br>
      ${formatDate(e.DATE)}<br>
      ${escapeHtml(e.PLACE)}
    </div>
    `

  })

  container().innerHTML = html

}

async function openEvent(id){

  setLoading()

  const events = await api("events")
  const event = events.find(e => String(e.ID) === String(id))

  if(!event){
    container().innerText = "Akce nenalezena"
    return
  }

  const program = await api("program",{event:id})

  let html = ""

  html += `<h2>${escapeHtml(event.NAME || event.NAZEV)}</h2>`
  html += `<div class="small">${formatDate(event.DATE)} – ${escapeHtml(event.PLACE)}</div>`

  html += `<hr><h3>Program</h3>`

  if(Array.isArray(program) && program.length){

    program.forEach(p=>{
      html += `<div>${escapeHtml(p.NAME || p.SKLADBA)}</div>`
    })

  }else{

    html += `<div class="small">Program není k dispozici</div>`

  }

  html += `<hr><h3>Docházka</h3>`

  html += `
  <div style="margin-top:10px">
    <button onclick="doAttendance('${id}','Přijdu')">Přijdu</button>
    <button onclick="doAttendance('${id}','Možná')">Možná</button>
    <button onclick="doAttendanceWithReason('${id}','Nepřijdu')">Nepřijdu</button>
  </div>
  `

  container().innerHTML = html

}

async function doAttendance(eventId,status){

  const member = currentMember()

  if(!member){
    alert("Vyber člena")
    return
  }

  await api("setAttendance",{
    event:eventId,
    member:member,
    status:status
  })

  alert("Docházka uložena")

}

async function doAttendanceWithReason(eventId,status){

  const reason = prompt("Důvod nepřítomnosti")

  if(!reason) return

  const member = currentMember()

  await api("setAttendance",{
    event:eventId,
    member:member,
    status:status,
    reason:reason
  })

  alert("Docházka uložena")

}

async function renderPayments(){

  setLoading()

  const data = await api("payments")

  let html = "<h2>Platby</h2>"

  if(!Array.isArray(data) || !data.length){

    html += "<div>Žádné platby</div>"

  }else{

    data.forEach(p=>{
      html += `<div class="card">${escapeHtml(p.NAME)} – ${escapeHtml(p.STATUS)}</div>`
    })

  }

  container().innerHTML = html

}

async function renderEnergy(){

  setLoading()

  const data = await api("energy")

  let html = "<h2>Energie</h2>"

  html += `
  <div class="card">
  Stav elektroměru na začátku:<br>
  <input id="energyStart"><br><br>
  Stav elektroměru na konci:<br>
  <input id="energyEnd"><br><br>
  <button onclick="saveEnergy()">Uložit</button>
  </div>
  `

  container().innerHTML = html

}

async function saveEnergy(){

  const start = document.getElementById("energyStart").value
  const end = document.getElementById("energyEnd").value

  alert("Energie zapsána (zatím pouze UI)")

}

window.start = start
window.renderOverview = renderOverview
window.renderEvents = renderEvents
window.renderPayments = renderPayments
window.renderEnergy = renderEnergy
window.openEvent = openEvent
window.doAttendance = doAttendance
window.doAttendanceWithReason = doAttendanceWithReason
