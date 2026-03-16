async function loadEvents(){

const container=document.getElementById("events")

try{

const events=await api("events")

container.innerHTML=""

events.forEach(e=>{

const div=document.createElement("div")

div.className="event"

div.innerHTML=`

<strong>${e.name||"Akce"}</strong><br>
${formatDate(e.date)}<br>
${e.place||""}

<br><br>

<button class="green" onclick="attendance('${e.id}','yes')">Přijdu</button>
<button class="yellow" onclick="attendance('${e.id}','maybe')">Možná</button>
<button class="red" onclick="attendance('${e.id}','no')">Nepřijdu</button>

`

container.appendChild(div)

})

}
catch(e){

container.innerHTML="Chyba načítání akcí"

}

}

function formatDate(d){

if(!d) return ""

const date=new Date(d)

if(isNaN(date)) return ""

return date.toLocaleDateString("cs-CZ")

}

async function attendance(eventId,status){

await api("setAttendance",{
event:eventId,
member:"zdenda",
status:status
})

alert("Uloženo")

}

function showPage(page){

alert("Stránka "+page+" zatím není hotová")

}

loadEvents()
