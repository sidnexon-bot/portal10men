let member = null


async function init(){

  const members = await api("members")

  const select = document.getElementById("memberSelect")

  members.forEach(m=>{

    const opt = document.createElement("option")

    opt.value = m.ID
    opt.textContent = m.NAME

    select.appendChild(opt)

  })

  select.onchange = ()=>{

    member = select.value

    showDashboard()

  }

}

window.onload = init



/* ======================
   DASHBOARD
====================== */

async function showDashboard(){

  if(!member) return

  const data = await api("dashboard",{member})

  const c = document.getElementById("content")

  let html = ""

  const ev = data.nextEvent

  html += `
  <h2>Nejbližší akce</h2>

  <div class="card">

  <b>${ev.NAME}</b><br>
  ${ev.DATE}<br>
  ${ev.PLACE}

  </div>
  `

  html += `<h3>Program</h3>`

  data.program.forEach(p=>{

    html += `<div>${p.SKLADBA}</div>`

  })


  html += `<h3>Docházka</h3>`

  html += `
  <button onclick="attendance('${ev.ID}','yes')">Přijdu</button>
  <button onclick="attendance('${ev.ID}','maybe')">Možná</button>
  <button onclick="attendance('${ev.ID}','no')">Nepřijdu</button>
  `

  c.innerHTML = html

}



/* ======================
   EVENTS
====================== */

async function showEvents(){

  const events = await api("events")

  const c = document.getElementById("content")

  let html = `<h2>Akce</h2>`

  events.forEach(ev=>{

    html += `

    <div class="event" onclick="eventDetail('${ev.ID}')">

      <b>${ev.NAME}</b><br>
      ${ev.DATE}<br>
      ${ev.PLACE}

    </div>

    `

  })

  c.innerHTML = html

}



async function eventDetail(id){

  const data = await api("eventDetail",{id})

  const c = document.getElementById("content")

  const ev = data.event

  let html = `
  <h2>${ev.NAME}</h2>

  ${ev.DATE}<br>
  ${ev.PLACE}
  `

  html += `<h3>Program</h3>`

  data.program.forEach(p=>{

    html += `<div>${p.SKLADBA}</div>`

  })


  html += `<h3>Docházka</h3>`

  html += `
  <button onclick="attendance('${ev.ID}','yes')">Přijdu</button>
  <button onclick="attendance('${ev.ID}','maybe')">Možná</button>
  <button onclick="attendance('${ev.ID}','no')">Nepřijdu</button>
  `

  c.innerHTML = html

}



/* ======================
   ATTENDANCE
====================== */

async function attendance(eventId,status){

  let reason=""

  if(status==="no"){

    reason = prompt("Důvod neúčasti")

    if(!reason) return

  }

  await api("setAttendance",{

    event:eventId,
    member:member,
    status,
    reason

  })

  alert("Uloženo")

}



/* ======================
   PAYMENTS
====================== */

async function showPayments(){

  const collections = await api("collections")

  const payments = await api("payments")

  const c = document.getElementById("content")

  let html = `<h2>Platby</h2>`

  collections.forEach(col=>{

    html += `<h3>${col.NAME}</h3>`

    payments
      .filter(p=>p.ID_VYBER===col.ID)
      .forEach(p=>{

        html += `<div>${p.ID_MEMBER} : ${p.PAID}</div>`

      })

  })

  c.innerHTML = html

}



/* ======================
   ENERGY
====================== */

function showEnergy(){

  const c = document.getElementById("content")

  c.innerHTML = `

  <h2>Energie</h2>

  Začátek:<br>
  <input id="start"><br>

  Konec:<br>
  <input id="end"><br>

  <button onclick="saveEnergy()">Uložit</button>

  `

}



async function saveEnergy(){

  const start = document.getElementById("start").value
  const end = document.getElementById("end").value

  await api("setEnergy",{

    start,
    end

  })

  alert("Uloženo")

}
