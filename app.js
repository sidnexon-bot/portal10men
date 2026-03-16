let MEMBER = localStorage.getItem("member") || null


async function init(){

  if(!MEMBER){
    await selectMember()
  }

  showPage("overview")

}


async function selectMember(){

  const members = await api("members")

  if(!Array.isArray(members)){
    alert("Nelze načíst členy")
    return
  }

  let html = "<div class='card'><h2>Vyber člena</h2>"

  members.forEach(m => {

    html += `
    <button onclick="setMember('${m.ID}')">
    ${m.NAME}
    </button><br><br>
    `

  })

  html += "</div>"

  document.getElementById("content").innerHTML = html

}


function setMember(id){

  MEMBER = id
  localStorage.setItem("member",id)

  showPage("overview")

}


function showPage(page){

  if(page === "overview") loadEvents()
  if(page === "repertoire") loadRepertoire()
  if(page === "energy") loadEnergy()
  if(page === "payments") loadPayments()

}


async function loadEvents(){

  const events = await api("events")

  if(!Array.isArray(events)){
    console.error(events)
    return
  }

  let html = "<div class='card'><h2>Akce</h2>"

  for(const e of events){

    html += `
    <div class="event">

    <b>${e.NAME}</b><br>
    ${formatDate(e.DATE)}<br>
    ${e.PLACE || ""}

    <div class="attendance">

    <button onclick="setAttendance('${e.ID}','yes')">Přijdu</button>
    <button onclick="setAttendance('${e.ID}','maybe')">Možná</button>
    <button onclick="setAttendance('${e.ID}','no')">Nepřijdu</button>

    </div>

    <button onclick="showProgram('${e.ID}')">
    Program
    </button>

    </div>
    `

  }

  html += "</div>"

  document.getElementById("content").innerHTML = html

}


async function showProgram(eventId){

  const program = await api("program",{event:eventId})
  const repertoire = await api("repertoire")

  if(!Array.isArray(program)){
    alert("Program nenalezen")
    return
  }

  let html = "<div class='card'><h2>Program</h2>"

  program.sort((a,b)=>a.ORDER-b.ORDER)

  program.forEach(p => {

    const song = repertoire.find(r => r.ID === p.SONG_ID)

    html += `
    <div class="song">
    ${song ? song.NAME : p.SONG_ID}
    </div>
    `

  })

  html += "<br><button onclick='showPage(\"overview\")'>Zpět</button>"
  html += "</div>"

  document.getElementById("content").innerHTML = html

}


async function loadRepertoire(){

  const data = await api("repertoire")

  if(!Array.isArray(data)) return

  let html = "<div class='card'><h2>Repertoár</h2>"

  data.forEach(s => {

    html += `
    <div class="song">
    ${s.NAME}
    </div>
    `

  })

  html += "</div>"

  document.getElementById("content").innerHTML = html

}


async function loadEnergy(){

  const data = await api("energy")

  if(!Array.isArray(data)) return

  let html = "<div class='card'><h2>Energie</h2>"

  data.forEach(e => {

    html += `
    <div class="energy">
    ${e.DATE || ""}
    </div>
    `

  })

  html += "</div>"

  document.getElementById("content").innerHTML = html

}


async function loadPayments(){

  const data = await api("payments")

  if(!Array.isArray(data)) return

  let html = "<div class='card'><h2>Platby</h2>"

  data.forEach(p => {

    html += `
    <div class="payment">
    ${p.ID_VYBERU || ""} – ${p.PAID || ""}
    </div>
    `

  })

  html += "</div>"

  document.getElementById("content").innerHTML = html

}


async function setAttendance(eventId,status){

  if(!MEMBER){
    alert("Nejprve vyber člena")
    return
  }

  await api("setAttendance",{
    event:eventId,
    member:MEMBER,
    status:status
  })

  alert("Docházka uložena")

}


function formatDate(d){

  if(!d) return ""

  const date = new Date(d)

  if(isNaN(date)) return d

  return date.toLocaleDateString("cs-CZ")

}


init()
