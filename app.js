let MEMBERS = [];
let EVENTS = [];
let CURRENT_MEMBER = null;

async function start(){
  try{
    MEMBERS = await api.members();
    EVENTS = await api.events();
    renderMemberSelect();
    renderEvents();
  }catch(err){
    console.error("Start error", err);
    document.getElementById("main").innerText = "Chyba při načítání dat: " + (err && err.message || err);
  }
}

function renderMemberSelect(){
  const sel = document.getElementById("memberSelect");
  sel.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Vyber člena";
  sel.appendChild(opt);
  MEMBERS.forEach(m => {
    const o = document.createElement("option");
    o.value = m.ID || m.id || m.Id || "";
    o.textContent = m.NAME || m.Name || m.NAME_CLENA || (m.EMAIL || m.EMAIL_ADDRESS) || ("#" + o.value);
    sel.appendChild(o);
  });
  sel.addEventListener("change", e => {
    CURRENT_MEMBER = e.target.value || null;
  });
}

function renderEvents(){
  const container = document.getElementById("eventsList");
  container.innerHTML = "";
  if(!EVENTS || !Array.isArray(EVENTS)){
    container.textContent = "Žádné akce";
    return;
  }
  EVENTS.forEach(ev => {
    const card = document.createElement("div");
    card.className = "card eventCard";

    const title = document.createElement("h3");
    title.textContent = ev.NAME || ev.name || ev.NAZEV || "undefined";
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = (ev.DATE || ev.date || ev.DATUM || "");
    card.appendChild(meta);

    const btns = document.createElement("div");
    btns.className = "buttons";

    ["Přijdu","Možná","Nepřijdu"].forEach(statusLabel => {
      const b = document.createElement("button");
      b.textContent = statusLabel;
      b.className = "small";
      b.addEventListener("click", () => handleAttendance(ev, statusLabel));
      btns.appendChild(b);
    });

    card.appendChild(btns);
    container.appendChild(card);
  });
}

async function handleAttendance(ev, statusLabel){
  if(!CURRENT_MEMBER){
    alert("Vyber člena v horním menu (Jsem:).");
    return;
  }
  // map label to internal status (simple)
  const map = {"Přijdu":"yes","Možná":"maybe","Nepřijdu":"no"};
  const status = map[statusLabel] || statusLabel;
  try{
    const res = await api.setAttendance(ev.ID || ev.id || ev.Id, CURRENT_MEMBER, status, "");
    console.log("saveAttendance", res);
    alert("Uloženo: " + (res.status || JSON.stringify(res)));
  }catch(err){
    console.error("Attendance save error", err);
    alert("Chyba při ukládání docházky: " + err);
  }
}

window.addEventListener("load", start);
