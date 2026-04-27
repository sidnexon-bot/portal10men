// api.js - Firebase wrapper
import { database, ref, get, set, update, remove, push, onValue } from "./firebase.js"

const DB = database

export function watchChanges(callback){
  onValue(ref(DB, "/dochazka"), () => callback("dochazka"))
  onValue(ref(DB, "/akce"),     () => callback("akce"))
  onValue(ref(DB, "/program"),  () => callback("program"))
}

window.watchChanges = watchChanges

// ===============================
// HELPERS
// ===============================

async function dbGet(path){
  const snapshot = await get(ref(DB, path))
  return snapshot.exists() ? snapshot.val() : null
}

async function dbSet(path, data){
  await set(ref(DB, path), data)
  return {status: "ok"}
}

async function dbUpdate(path, data){
  await update(ref(DB, path), data)
  return {status: "ok"}
}

async function dbRemove(path){
  await remove(ref(DB, path))
  return {status: "ok"}
}

function objToArray(obj){
  if(!obj) return []
  return Object.values(obj)
}

// ===============================
// API FUNKCE
// ===============================

async function getMembers(){
  const data = await dbGet("/members")
  return objToArray(data)
}

async function getEvents(){
  const data = await dbGet("/akce")
  return objToArray(data).map(e => ({
    ID:     e.id,
    NAME:   e.name,
    DATE:   e.date,
    START:  e.start,
    END:    e.end,
    PLACE:  e.place,
    NOTE:   e.note,
    STATUS: e.status,
    DOC_URL: e.doc_url || ""
  }))
}

async function getEventDetail(id){
  const akce      = await dbGet("/akce/" + id)
  const dochazka  = await dbGet("/dochazka")
  const program   = await dbGet("/program")
  const repertoar = await dbGet("/repertoar")
  const members   = await dbGet("/members")

  const attendance = objToArray(dochazka)
    .filter(d => d.id_akce === id)
    .map(d => {
      const m = objToArray(members).find(m => m.email === d.email) || {}
      return {
        ID:         d.id,
        ID_AKCE:    d.id_akce,
        EMAIL:      d.email,
        NAME:       m.name || d.email,
        VOICE:      m.voice || "",
        STATUS:     d.status || "",
        REASON:     d.reason || "",
        UPDATED_AT: d.updated_at || ""
      }
    })

  const prog = objToArray(program)
    .filter(p => p.id_akce === id)
    .sort((a,b) => Number(a.order) - Number(b.order))
    .map(p => {
      const song = objToArray(repertoar).find(r => r.id === p.song_id) || {}
      return {
        ID:      p.id,
        ORDER:   p.order,
        SONG_ID: p.song_id,
        NAME:    song.name   || "",
        AUTHOR:  song.author || "",
        PDF:     song.pdf    || "",
        ENCORE:  Number(p.order) >= 900
      }
    })

  return {
    event: {
      ID:      akce.id,
      NAME:    akce.name,
      DATE:    akce.date,
      START:   akce.start,
      END:     akce.end,
      PLACE:   akce.place,
      NOTE:    akce.note,
      STATUS:  akce.status,
      DOC_URL: akce.doc_url || ""
    },
    attendance,
    program: prog
  }
}

async function setAttendance(params){
  const dochazka = await dbGet("/dochazka")
  const entries  = objToArray(dochazka)
  const existing = entries.find(d => d.id_akce === params.event && d.email === params.member)

  const data = {
    id_akce:    params.event,
    email:      params.member,
    status:     params.status,
    reason:     params.reason || "",
    updated_by: params.member,
    updated_at: new Date().toISOString()
  }

  if(existing){
    data.id = existing.id
    await dbUpdate("/dochazka/" + existing.id, data)
  }else{
    const newRef = push(ref(DB, "/dochazka"))
    data.id = newRef.key
    await dbSet("/dochazka/" + data.id, data)
  }
  return {status: "saved"}
}

async function getMyAttendance(email){
  const dochazka = await dbGet("/dochazka")
  const map = {}
  objToArray(dochazka)
    .filter(d => d.email === email)
    .forEach(d => {
      map[d.id_akce] = {status: d.status || "", reason: d.reason || ""}
    })
  return map
}

async function getHeatmap(){
  const akce     = await dbGet("/akce")
  const members  = await dbGet("/members")
  const dochazka = await dbGet("/dochazka")

  return {
    events:  objToArray(akce).map(e => ({ID: e.id, NAME: e.name, DATE: e.date})),
    members: objToArray(members).map(m => ({EMAIL: m.email, NAME: m.name, VOICE: m.voice})),
    rows:    objToArray(dochazka).map(d => ({
      ID_AKCE: d.id_akce,
      EMAIL:   d.email,
      STATUS:  d.status || "",
      REASON:  d.reason || ""
    }))
  }
}

async function addEvent(params){
  const members = await dbGet("/members")
  const id = "a" + Date.now()

  await dbSet("/akce/" + id, {
    id,
    name:    params.name,
    date:    params.date,
    start:   params.start   || "",
    end:     params.end     || "",
    place:   params.place   || "",
    note:    params.note    || "",
    status:  params.status  || "Plánovaná",
    doc_url: ""
  })

  // vytvoř záznamy docházky pro všechny členy
  const memberList = objToArray(members)
  for(const m of memberList){
    const dRef = push(ref(DB, "/dochazka"))
    await dbSet("/dochazka/" + dRef.key, {
      id:         dRef.key,
      id_akce:    id,
      email:      m.email,
      status:     "",
      reason:     "",
      updated_by: "",
      updated_at: ""
    })
  }

  return {status: "created", id, attendanceRows: memberList.length}
}

async function updateEvent(params){
  await dbUpdate("/akce/" + params.id, {
    name:   params.name,
    date:   params.date,
    start:  params.start  || "",
    end:    params.end    || "",
    place:  params.place  || "",
    note:   params.note   || "",
    status: params.status || "Plánovaná"
  })
  return {status: "updated"}
}

async function deleteEvent(id){
  // smaž akci
  await dbRemove("/akce/" + id)

  // smaž docházku
  const dochazka = await dbGet("/dochazka")
  const toDelete = objToArray(dochazka).filter(d => d.id_akce === id)
  for(const d of toDelete) await dbRemove("/dochazka/" + d.id)

  // smaž program
  const program = await dbGet("/program")
  const progDel = objToArray(program).filter(p => p.id_akce === id)
  for(const p of progDel) await dbRemove("/program/" + p.id)

  return {status: "deleted"}
}

async function setDocUrl(params){
  await dbUpdate("/akce/" + params.id, {doc_url: params.url})
  return {status: "saved"}
}

async function setProgram(params){
  const program = await dbGet("/program")
  const toDelete = objToArray(program).filter(p => p.id_akce === params.id)
  for(const p of toDelete) await dbRemove("/program/" + p.id)

  const songs  = params.songs  ? JSON.parse(params.songs)  : []
  const encore = params.encore ? JSON.parse(params.encore) : []

  for(let i = 0; i < songs.length; i++){
    const pRef = push(ref(DB, "/program"))
    await dbSet("/program/" + pRef.key, {
      id:      pRef.key,
      id_akce: params.id,
      order:   i + 1,
      song_id: songs[i]
    })
  }

  for(let i = 0; i < encore.length; i++){
    const pRef = push(ref(DB, "/program"))
    await dbSet("/program/" + pRef.key, {
      id:      pRef.key,
      id_akce: params.id,
      order:   901 + i,
      song_id: encore[i]
    })
  }

  return {status: "saved"}
}

async function updateNote(params){
  await dbUpdate("/akce/" + params.id, {note: params.note})
  return {status: "saved"}
}

async function getRepertoar(){
  const data = await dbGet("/repertoar")
  return objToArray(data).map(r => ({
    ID:          r.id,
    NAME:        r.name,
    AUTHOR:      r.author      || "",
    ARRANGED_BY: r.arranged_by || "",
    TEXT_BY:     r.text_by     || "",
    LENGTH:      r.length      || "",
    STATUS:      r.status      || "",
    PDF:         r.pdf         || "",
    CODE:        r.code        || ""
  }))
}

async function getEnergy(){
  const energie = await dbGet("/energie")
  const akce    = await dbGet("/akce")
  return objToArray(energie).map(e => {
    const a = akce[e.id_akce] || {}
    return {
      ID:      e.id,
      ID_AKCE: e.id_akce,
      START:   e.start,
      END:     e.end,
      DATE:    a.date || e.date || ""
    }
  })
}

async function setEnergy(params){
  const akce  = await dbGet("/akce/" + params.event)
  const eRef  = push(ref(DB, "/energie"))
  await dbSet("/energie/" + eRef.key, {
    id:      eRef.key,
    id_akce: params.event,
    start:   Number(params.start),
    end:     Number(params.end),
    date:    akce ? akce.date : new Date().toISOString()
  })
  return {status: "saved"}
}

async function getPayments(email){
  const vybery  = await dbGet("/vybery")
  const platby  = await dbGet("/platby")
  const members = await dbGet("/members")
  const config  = await dbGet("/config")

  const active = objToArray(vybery).filter(v => v.active === "YES")

  return active.map(v => {
    const vsechnyPlatby = objToArray(platby).filter(p => p.id_vyberu === v.id)
    const mojePlatba   = vsechnyPlatby.find(p => p.email === email)

    const memberStatus = objToArray(members).map(m => {
      const p = vsechnyPlatby.find(x => x.email === m.email)
      return {
        name:  m.name,
        email: m.email,
        paid:  p ? Number(p.paid) || 0 : 0,
        date:  p ? p.date : null
      }
    })

    const totalPaid = vsechnyPlatby.reduce((sum, p) => sum + (Number(p.paid) || 0), 0)
    const remaining = (Number(v.amount) * objToArray(members).length) - totalPaid

    return {
      id:           v.id,
      name:         v.name,
      amount:       Number(v.amount),
      deadline:     v.deadline,
      totalPaid,
      remaining,
      myPaid:       mojePlatba ? Number(mojePlatba.paid) || 0 : 0,
      members:      memberStatus,
      account:      config.payment_account      || "",
      iban:         config.payment_iban         || "",
      instructions: config.payment_instructions || "",
      qrUrl:        config.payment_qr_url       || ""
    }
  })
}

async function setPayment(params){
  const platby   = await dbGet("/platby")
  const existing = objToArray(platby).find(p => p.id_vyberu === params.id_vyberu && p.email === params.email)

  if(existing){
    await dbUpdate("/platby/" + existing.id, {
      paid: Number(params.paid),
      date: new Date().toISOString()
    })
  }else{
    const pRef = push(ref(DB, "/platby"))
    await dbSet("/platby/" + pRef.key, {
      id:        pRef.key,
      id_vyberu: params.id_vyberu,
      email:     params.email,
      paid:      Number(params.paid),
      date:      new Date().toISOString()
    })
  }
  return {status: "saved"}
}

async function addCollection(params){
  const members = await dbGet("/members")
  const id = "v" + Date.now()

  await dbSet("/vybery/" + id, {
    id,
    name:     params.name,
    amount:   Number(params.amount),
    deadline: params.deadline || "",
    active:   "YES"
  })

  const memberList = objToArray(members)
  for(const m of memberList){
    const pRef = push(ref(DB, "/platby"))
    await dbSet("/platby/" + pRef.key, {
      id:        pRef.key,
      id_vyberu: id,
      email:     m.email,
      paid:      0,
      date:      ""
    })
  }

  return {status: "created", id}
}

async function deleteCollection(id){
  await dbRemove("/vybery/" + id)
  const platby   = await dbGet("/platby")
  const toDelete = objToArray(platby).filter(p => p.id_vyberu === id)
  for(const p of toDelete) await dbRemove("/platby/" + p.id)
  return {status: "deleted"}
}

async function verifyPin(params){
  const members = await dbGet("/members")
  const member  = objToArray(members).find(m => m.email === params.email)
  if(!member) return {success: false}
  return {success: String(member.pin) === String(params.pin)}
}

async function getLastModified(){
  const dochazka = await dbGet("/dochazka")
  const akce     = await dbGet("/akce")
  const program  = await dbGet("/program")

  const dArr = objToArray(dochazka)
  const aArr = objToArray(akce)
  const pArr = objToArray(program)

  const lastD = dArr.length
  const lastA = aArr.length
  const lastP = pArr.length

  const lastUpdated = dArr.reduce((latest, d) => {
    return d.updated_at > latest ? d.updated_at : latest
  }, "")

  return {
    signature: `${lastUpdated}_${lastA}_${lastP}_${lastD}`
  }
}

async function getAktuality(){
  const data = await dbGet("/aktuality")
  return objToArray(data).sort((a,b) => {
    const ad = a.date || ""
    const bd = b.date || ""
    return bd.localeCompare(ad)
  })
}

async function updateAktualita(params){
  await dbUpdate("/aktuality/" + params.id, {text: params.text, date: params.date})
  return {status: "saved"}
}

async function addAktualita(params){
  const aRef = push(ref(DB, "/aktuality"))
  await dbSet("/aktuality/" + aRef.key, {
    id:   aRef.key,
    text: params.text,
    date: params.date || ""
  })
  return {status: "created"}
}

async function getTodos(){
  const data = await dbGet("/todos")
  return objToArray(data).sort((a,b) => (a.deadline||"").localeCompare(b.deadline||""))
}

async function addTodo(params){
  const tRef = push(ref(DB, "/todos"))
  await dbSet("/todos/" + tRef.key, {
    id:       tRef.key,
    text:     params.text,
    deadline: params.deadline || "",
    done:     false
  })
  return {status: "created"}
}

async function updateTodo(params){
  await dbUpdate("/todos/" + params.id, {
    text:     params.text,
    deadline: params.deadline || "",
    done:     params.done === true || params.done === "true"
  })
  return {status: "saved"}
}

async function deleteTodo(id){
  await dbRemove("/todos/" + id)
  return {status: "deleted"}
}

// ===============================
// HLAVNÍ API FUNKCE
// ===============================

async function api(action, params = {}){
  switch(action){
    case "members":       return await getMembers()
    case "events":        return await getEvents()
    case "eventdetail":   return await getEventDetail(params.id)
    case "setattendance": return await setAttendance(params)
    case "myattendance":  return await getMyAttendance(params.email)
    case "heatmap":       return await getHeatmap()
    case "addevent":      return await addEvent(params)
    case "updateevent":   return await updateEvent(params)
    case "deleteevent":   return await deleteEvent(params.id)
    case "setdocurl":     return await setDocUrl(params)
    case "setprogram":    return await setProgram(params)
    case "updatenote":    return await updateNote(params)
    case "repertoar":     return await getRepertoar()
    case "energy":        return await getEnergy()
    case "setenergy":     return await setEnergy(params)
    case "payments":      return await getPayments(params.email)
    case "setpayment":    return await setPayment(params)
    case "addcollection": return await addCollection(params)
    case "deletecollection": return await deleteCollection(params.id)
    case "verifypin":     return await verifyPin(params)
    case "lastmodified": return await getLastModified()
    case "aktuality":        return await getAktuality()
    case "updateaktualita":  return await updateAktualita(params)
    case "addaktualita": return await addAktualita(params)
    case "todos":            return await getTodos()
    case "addtodo":          return await addTodo(params)
    case "updatetodo":       return await updateTodo(params)
    case "deletetodo":       return await deleteTodo(params.id)
    default: throw new Error("Unknown action: " + action)
  }
}

window.api = api
window.watchChanges = watchChanges

