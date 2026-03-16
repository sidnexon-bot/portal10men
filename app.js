let MEMBER = null


async function api(action, params = {}){

  const url = new URL(API_URL)

  url.searchParams.set("action", action)

  Object.keys(params).forEach(k=>{
    url.searchParams.set(k, params[k])
  })

  const res = await fetch(url)

  return res.json()

}



async function loadEvents(){

  const container = document.getElementById("content")

  container.innerHTML = "Načítám akce..."

  const events = await api("events")

  let html = "<div class='card'><h2>Akce</h2>"

  events.forEach(e=>{

    html += `
      <div class="event">
        <strong>${e.name}</strong><br>
        ${formatDate(e.date)}<br>
        ${e.place || ""}
      </div>
    `

  })

  html += "</div>"

  container.innerHTML = html
}



async function loadRepertoar(){

  const data = await api("repertoar")

  const container = document.getElementById("content")

  let html = "<div class='card'><h2>Repertoár</h2>"

  data.forEach(r=>{

    html += `
      <div class="event">
        <strong>${r.NAZEV || r.name}</strong>
      </div>
    `

  })

  html += "</div>"

  container.innerHTML = html
}



async function loadEnergie(){

  const data = await api("energie")

  const container = document.getElementById("content")

  let html = "<div class='card'><h2>Energie</h2>"

  data.forEach(e=>{

    html += `
      <div class="event">
        ${e.DATUM || e.date} : ${e.STAV || e.value}
      </div>
    `

  })

  html += "</div>"

  container.innerHTML = html
}



async function loadPlatby(){

  const data = await api("platby")

  const container = document.getElementById("content")

  let html = "<div class='card'><h2>Platby</h2>"

  data.forEach(p=>{

    html += `
      <div class="event">
        ${p.NAME || p.name} – ${p.AMOUNT || p.amount}
      </div>
    `

  })

  html += "</div>"

  container.innerHTML = html
}



function formatDate(d){

  if(!d) return ""

  const date = new Date(d)

  if(isNaN(date)) return ""

  return date.toLocaleDateString("cs-CZ")
}



function showPage(page){

  if(page === "overview") loadEvents()
  if(page === "repertoar") loadRepertoar()
  if(page === "energie") loadEnergie()
  if(page === "platby") loadPlatby()

}



function start(){

  loadEvents()

}

start()
