// ====== základní stav aplikace ======

let MEMBER = localStorage.getItem("member") || null



// ====== navigace ======

function showPage(page){

  if(page === "overview") loadEvents()
  if(page === "repertoire") loadTable("repertoire","Repertoár")
  if(page === "energy") loadTable("energy","Energie")
  if(page === "payments") loadTable("payments","Platby")

}



// ====== AKCE (speciální renderer kvůli docházce) ======

async function loadEvents(){

  const data = await api("events")

  if(!Array.isArray(data)){
    console.error("API error:",data)
    document.getElementById("content").innerHTML = "<p>Chyba načítání akcí</p>"
    return
  }

  let html = "<div class='card'><h2>Akce</h2>"

  data.forEach(e=>{

    const id = e.ID || e.id || ""
    const name = e.NAZEV || e.name || ""
    const date = e.DATUM || e.date || ""
    const place = e.MISTO || e.place || ""

    html += `
      <div class="event">

        <b>${name}</b><br>
        ${formatDate(date)}<br>
        ${place}

        <div class="attendance">

          <button onclick="setAttendance('${id}','yes')">
            Přijdu
          </button>

          <button onclick="setAttendance('${id}','maybe')">
            Možná
          </button>

          <button onclick="setAttendance('${id}','no')">
            Nepřijdu
          </button>

        </div>

      </div>
    `
  })

  html += "</div>"

  document.getElementById("content").innerHTML = html

}



// ====== univerzální renderer tabulek ======

async function loadTable(action,title){

  const data = await api(action)

  if(!Array.isArray(data)){
    console.error("API error:",data)
    document.getElementById("content").innerHTML = "<p>Chyba načítání dat</p>"
    return
  }

  if(data.length === 0){
    document.getElementById("content").innerHTML = "<p>Žádná data</p>"
    return
  }

  const headers = Object.keys(data[0])

  let html = `<div class="card"><h2>${title}</h2><table>`

  html += "<thead><tr>"

  headers.forEach(h=>{
    html += `<th>${h}</th>`
  })

  html += "</tr></thead><tbody>"

  data.forEach(row=>{

    html += "<tr>"

    headers.forEach(h=>{
      html += `<td>${row[h] ?? ""}</td>`
    })

    html += "</tr>"

  })

  html += "</tbody></table></div>"

  document.getElementById("content").innerHTML = html

}



// ====== docházka ======

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



// ====== pomocné funkce ======

function formatDate(d){

  if(!d) return ""

  const date = new Date(d)

  if(isNaN(date)) return d

  return date.toLocaleDateString("cs-CZ")
}



// ====== start aplikace ======

showPage("overview")
