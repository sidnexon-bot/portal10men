let MEMBER = null


async function api(action, params = {}) {


for (const key in params) {
url += "&" + key + "=" + encodeURIComponent(params[key])
}

const res = await fetch(url)
return res.json()

}


async function selectMember() {

const stored = localStorage.getItem("member")

if (stored) {
MEMBER = stored
return
}

const members = await api("members")

let html = "<div class='card'><h3>Kdo jsi?</h3>"

members.forEach(m => {

html += `<button onclick="setMember('${m.id}')">${m.name}</button><br><br>`

})

html += "</div>"

document.getElementById("content").innerHTML = html

}


function setMember(id) {

localStorage.setItem("member", id)

location.reload()

}


async function loadEvents() {

const container = document.getElementById("events")

container.innerHTML = "Načítám..."

try {

const events = await api("events")

container.innerHTML = ""

events.forEach(e => {

const div = document.createElement("div")

div.className = "event"

div.innerHTML = `

<strong>${e.name || "Akce"}</strong><br>
${formatDate(e.date)}<br>
${e.place || ""}

<br><br>

<button class="green" onclick="attendance('${e.id}','yes')">Přijdu</button>
<button class="yellow" onclick="attendance('${e.id}','maybe')">Možná</button>
<button class="red" onclick="attendance('${e.id}','no')">Nepřijdu</button>

`

container.appendChild(div)

})

} catch (e) {

container.innerHTML = "Chyba načítání akcí"

}

}


function formatDate(d) {

if (!d) return ""

const date = new Date(d)

if (isNaN(date)) return ""

return date.toLocaleDateString("cs-CZ")

}


async function attendance(eventId, status) {

if (!MEMBER) {
alert("Nejprve vyber člena.")
return
}

await api("setAttendance", {
event: eventId,
member: MEMBER,
status: status
})

alert("Docházka uložena")

}


function showPage(page) {

alert("Stránka " + page + " zatím není hotová")

}


async function start() {

await selectMember()

MEMBER = localStorage.getItem("member")

loadEvents()

}


start()
