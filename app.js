let MEMBER = null


function setMain(html){
  document.getElementById("main").innerHTML = html
}


async function start(){

  try{

    const members = await api("members")

    const select = document.getElementById("memberSelect")

    members.forEach(m=>{

      const opt = document.createElement("option")

      opt.value = m.ID
      opt.textContent = m.NAME

      select.appendChild(opt)

    })

    select.onchange = ()=>{
      MEMBER = select.value
      showDashboard()
    }

  }catch(err){

    setMain("Chyba při načítání dat: "+err)

  }

}


window.onload = start



/* =======================
   DASHBOARD
======================= */

async function showDashboard(){

  if(!MEMBER){
    setMain("Vyber člena")
    return
  }

  const events = await api("events")

  if(!events || !events.length){
    setMain("Žádné akce")
    return
  }

  const event = events[0]

  const program = await api("program",{event:event.ID})

  let html = `
  <h2>Nejbližší akce</h2>

  <div class="card">
  <b>${event.NAME}</b><br>
  ${event.DATE}<br>
  ${event.PLACE}
  </div>

  <h3>Program</h3>
  `

  if(program && program.length){

    program.forEach(p=>{
      html += `<div>${p.NAME || p.SKLADBA}</div>`
    })

  }else{

    html += `<div class="small">Program není k dispozici</div>`

  }


  html += `

  <h3>Docházka</h3>

  <button onclick="attendance('${event.ID}','yes')">Přijdu</button>
  <button onclick="attendance('${event.ID}','maybe')">Možná</button>
  <button onclick="attendance('${event.ID}','no')">Nepřijdu</button>
  `

  setMain(html)

}



/* =======================
   EVENTS
======================= */

async function showEvents(){

  const events = await api("events")

  let html = "<h2>Akce</h2>"

  if(events && events.length){

    events.forEach(e=>{

      html += `
      <div class="event" onclick="eventDetail('${e.ID}')">
        <b>${e.NAME}</b><br>
        ${e.DATE}
      </div>
      `

    })

  }else{

    html += `<div class="small">Žádné akce</div>`

  }

  setMain(html)

}



async function eventDetail(id){

  const data = await api("eventDetail",{id})

  const e = data.event

  let html = `
  <h2>${e.NAME}</h2>

  ${e.DATE}<br>
  ${e.PLACE}

  <h3>Program</h3>
  `

  if(data.program && data.program.length){

    data.program.forEach(p=>{
      html += `<div>${p.NAME || p.SKLADBA}</div>`
    })

  }else{

    html += `<div class="small">Program není k dispozici</div>`

  }


  html += `
  <h3>Docházka</h3>

  <button onclick="attendance('${e.ID}','yes')">Přijdu</button>
  <button onclick="attendance('${e.ID}','maybe')">Možná</button>
  <button onclick="attendance('${e.ID}','no')">Nepřijdu</button>
  `

  setMain(html)

}



/* =======================
   ATTENDANCE
======================= */

async function attendance(eventId,status){

  if(!MEMBER){
    alert("Vyber člena")
    return
  }

  let reason = ""

  if(status==="no"){

    reason = prompt("Důvod nepřítomnosti")

    if(!reason) return

  }

  await api("setAttendance",{

    event:eventId,
    member:MEMBER,
    status:status,
    reason:reason

  })

  alert("Uloženo")

}



/* =======================
   PAYMENTS
======================= */

async function showPayments(){

  const collections = await api("collections")
  const payments = await api("payments")

  let html = "<h2>Platby</h2>"

  if(collections && collections.length){

    collections.forEach(c=>{

      html += `<h3>${c.NAME}</h3>`

      payments
        .filter(p=>p.ID_VYBER===c.ID)
        .forEach(p=>{
          html += `<div>${p.ID_MEMBER}: ${p.PAID}</div>`
        })

    })

  }else{

    html += `<div class="small">Žádné aktivní výběry</div>`

  }

  setMain(html)

}



/* =======================
   ENERGY
======================= */

function showEnergy(){

  setMain(`

  <h2>Energie</h2>

  Start:<br>
  <input id="start"><br>

  End:<br>
  <input id="end"><br>

  <button onclick="saveEnergy()">Uložit</button>

  `)

}



async function saveEnergy(){

  const start = document.getElementById("start").value
  const end = document.getElementById("end").value

  await api("setEnergy",{
    start:start,
    end:end
  })

  alert("Uloženo")

}
