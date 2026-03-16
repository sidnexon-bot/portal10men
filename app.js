let currentMember = null



async function start(){

  await loadMembers()

  showPage("events")

}



async function loadMembers(){

  const members = await api("members")

  const select = document.getElementById("memberSelect")

  select.innerHTML = '<option value="">Vyber člena</option>'

  members.forEach(m => {

    const opt = document.createElement("option")

    opt.value = m.ID
    opt.textContent = m.NAME

    select.appendChild(opt)

  })



  select.addEventListener("change", e => {

    currentMember = e.target.value

  })

}



function showPage(page){

  if(page === "events") loadEvents()
  if(page === "repertoire") loadRepertoire()
  if(page === "energy") loadEnergy()
  if(page === "payments") loadPayments()

}



async function loadEvents(){

  const data = await api("events")

  const container = document.getElementById("content")

  let html = "<h2>Akce</h2>"

  data.forEach(e => {

    html += `
      <div class="event">

        <div class="event-title">
          ${e.NAME || ""}
        </div>

        <div class="event-meta">
          ${e.DATE || ""} ${e.START || ""} — ${e.PLACE || ""}
        </div>

        <div class="attendance-buttons">

          <button onclick="setAttendance('${e.ID}','yes')">
            Přijdu
          </button>

          <button onclick="setAttendance('${e.ID}','maybe')">
            Možná
          </button>

          <button onclick="setAttendance('${e.ID}','no')">
            Nepřijdu
          </button>

        </div>

      </div>
    `

  })

  container.innerHTML = html

}



async function setAttendance(eventId,status){

  if(!currentMember){

    alert("Vyber nejdřív člena")

    return

  }

  await api("setAttendance",{
    event:eventId,
    member:currentMember,
    status:status
  })

  alert("Docházka uložena")

}



async function loadRepertoire(){

  const data = await api("repertoire")

  const container = document.getElementById("content")

  let html = "<h2>Repertoár</h2>"

  html += "<table class='table'>"

  html += `
    <tr>
      <th>ID</th>
      <th>NÁZEV</th>
      <th>AUTOR</th>
      <th>ARRANGE</th>
      <th>TEXT</th>
      <th>STATUS</th>
      <th>PDF</th>
    </tr>
  `

  data.forEach(r => {

    html += `
      <tr>
        <td>${r.ID || ""}</td>
        <td>${r.NAME || ""}</td>
        <td>${r.AUTHOR || ""}</td>
        <td>${r.ARRANGED_BY || ""}</td>
        <td>${r.TEXT_BY || ""}</td>
        <td>${r.STATUS || ""}</td>
        <td>${r.PDF || ""}</td>
      </tr>
    `

  })

  html += "</table>"

  container.innerHTML = html

}



async function loadEnergy(){

  const data = await api("energy")

  const container = document.getElementById("content")

  let html = "<h2>Energie</h2>"

  html += "<table class='table'>"

  html += `
    <tr>
      <th>ID</th>
      <th>AKCE</th>
      <th>START</th>
      <th>END</th>
      <th>DATE</th>
    </tr>
  `

  data.forEach(r => {

    html += `
      <tr>
        <td>${r.ID || ""}</td>
        <td>${r.ID_AKCE || ""}</td>
        <td>${r.START || ""}</td>
        <td>${r.END || ""}</td>
        <td>${r.DATE || ""}</td>
      </tr>
    `

  })

  html += "</table>"

  container.innerHTML = html

}



async function loadPayments(){

  const data = await api("payments")

  const container = document.getElementById("content")

  let html = "<h2>Platby</h2>"

  html += "<table class='table'>"

  data.forEach(p => {

    html += `
      <tr>
        <td>${p.ID || ""}</td>
        <td>${p.MEMBER || ""}</td>
        <td>${p.AMOUNT || ""}</td>
        <td>${p.DATE || ""}</td>
      </tr>
    `

  })

  html += "</table>"

  container.innerHTML = html

}
