// api.js - Firebase wrapper
import { database, ref, get, set, update, remove, push, onValue } from "./firebase.js"

const DB = database

export function watchChanges(callback){
  onValue(ref(DB, "/dochazka"),  () => callback("dochazka"))
  onValue(ref(DB, "/akce"),      () => callback("akce"))
  onValue(ref(DB, "/program"),   () => callback("program"))
  onValue(ref(DB, "/aktuality"), () => callback("aktuality"))
  onValue(ref(DB, "/todos"),     () => callback("todos"))
  onValue(ref(DB, "/members"),   () => callback("members"))
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

function genId(prefix = "a"){
  return prefix + Date.now() + "_" + Math.random().toString(36).substr(2, 6)
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
    ID:               e.id,
    NAME:             e.name,
    DATE:             e.date,
    DATE_END:         e.date_end || "",
    START:            e.start,
    END:              e.end,
    PLACE:            e.place,
    CALL_URL:         e.call_url || "",
    NOTE:             e.note,
    STATUS:           e.status,
    DOC_URL:          e.doc_url || "",
    REQUIRES_PROGRAM: e.requires_program !== false,
    IS_TEMPLATE:      e.is_template === true,
    TEMPLATE_ID:      e.template_id     || "",
    RECURRENCE_TYPE:  e.recurrence_type || ""
  }))
}

async function getEventDetail(id){
  const akce = await dbGet("/akce/" + id)
  if(!akce) throw new Error("Akce nenalezena: " + id)
  const dochazka  = await dbGet("/dochazka")
  const program   = await dbGet("/program")
  const repertoar = await dbGet("/repertoar")
  const members   = await dbGet("/members")

  const voiceOrder = ["1. TENOR", "2. TENOR", "1. BAS", "2. BAS"]

const attendance = objToArray(dochazka)
  .filter(d => d.id_akce === id)
  .filter(d => {
    const m = objToArray(members).find(m => m.email === d.email)
    return !m || (m.role || "").toUpperCase() !== "GUEST"
  })
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
    .sort((a, b) => {
    console.log(a.NAME, a.VOICE, b.NAME, b.VOICE)
    const ai = voiceOrder.indexOf(a.VOICE)
    const bi = voiceOrder.indexOf(b.VOICE)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
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
      ID:              akce.id,
      NAME:            akce.name,
      DATE:            akce.date,
      DATE_END:        akce.date_end || "",
      START:           akce.start,
      END:             akce.end,
      PLACE:           akce.place,
      CALL_URL:        akce.call_url      || "",
      NOTE:            akce.note,
      STATUS:          akce.status,
      DOC_URL:         akce.doc_url       || "",
      TEMPLATE_ID:     akce.template_id   || "",
      RECURRENCE_TYPE: akce.recurrence_type || ""
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
    events: objToArray(akce)
      .filter(e => !e.is_template)
      .map(e => ({ID: e.id, NAME: e.name, DATE: e.date, DATE_END: e.date_end || "", STATUS: e.status || ""})),
    members: objToArray(members)
      .filter(m => (m.role || "").toUpperCase() !== "GUEST")
      .map(m => ({EMAIL: m.email, NAME: m.name, VOICE: m.voice})),
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
  const id = genId("a")

  await dbSet("/akce/" + id, {
    id,
    name:             params.name,
    date:             params.date,
    date_end:         params.date_end || "",
    start:            params.start   || "",
    end:              params.end     || "",
    place:            params.place   || "",
    call_url:         params.call_url || "",
    note:             params.note    || "",
    status:           params.status  || "Plánovaná",
    requires_program: params.requires_program !== false,
    doc_url:          "",
    is_template:      false,
    template_id:      "",
    recurrence_type:  ""
  })

  // vytvoř záznamy docházky pro všechny členy
  const memberList = objToArray(members).filter(m => (m.role || "").toUpperCase() !== "GUEST")
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
    name:             params.name,
    date:             params.date,
    date_end:         params.date_end || "",
    start:            params.start  || "",
    end:              params.end    || "",
    place:            params.place  || "",
    call_url:         params.call_url || "",
    note:             params.note   || "",
    status:           params.status || "Plánovaná",
    requires_program: params.requires_program !== false
  })
  return {status: "updated"}
}

async function deleteEvent(id){
  await dbRemove("/akce/" + id)

  const dochazka = await dbGet("/dochazka")
  const toDelete = objToArray(dochazka).filter(d => d.id_akce === id)
  for(const d of toDelete) await dbRemove("/dochazka/" + d.id)

  const program = await dbGet("/program")
  const progDel = objToArray(program).filter(p => p.id_akce === id)
  for(const p of progDel) await dbRemove("/program/" + p.id)

  return {status: "deleted"}
}

async function cancelEvent(params){
  const id = typeof params === "string" ? params : params.id
  if(!id){ console.error("cancelEvent: missing id"); return {error: "missing id"} }
  const members  = await dbGet("/members")
  const dochazka = await dbGet("/dochazka")
  const memberList = objToArray(members).filter(m => (m.role || "").toUpperCase() !== "GUEST")
  const dochazkaList = objToArray(dochazka)

  await dbUpdate("/akce/" + params.id, {
    name:             params.name    || "",
    date:             params.date    || "",
    start:            params.start   || "",
    end:              params.end     || "",
    place:            params.place   || "",
    note:             params.note    || "",
    call_url:         params.call_url || "",
    requires_program: params.requires_program !== false,
    status:           "Zrušená"
  })

  for(const m of memberList){
    const existing = dochazkaList.find(d => d.id_akce === params.id && d.email === m.email)
    const data = {
      id_akce:    params.id,
      email:      m.email,
      status:     "Nepřijdu",
      reason:     "Zrušeno",
      updated_by: "system",
      updated_at: new Date().toISOString()
    }
    if(existing){
      await dbUpdate("/dochazka/" + existing.id, data)
    }else{
      const dRef = push(ref(DB, "/dochazka"))
      data.id = dRef.key
      await dbSet("/dochazka/" + dRef.key, data)
    }
  }

  return {status: "cancelled"}
}

async function setProgram(params){
  const id     = params.id
  const songs  = JSON.parse(params.songs  || "[]")
  const encore = JSON.parse(params.encore || "[]")

  const program  = await dbGet("/program")
  const toDelete = objToArray(program).filter(p => p.id_akce === id)
  for(const p of toDelete) await dbRemove("/program/" + p.id)

  for(let i = 0; i < songs.length; i++){
    const pRef = push(ref(DB, "/program"))
    await dbSet("/program/" + pRef.key, {
      id:      pRef.key,
      id_akce: id,
      order:   i + 1,
      song_id: songs[i]
    })
  }

  for(let i = 0; i < encore.length; i++){
    const pRef = push(ref(DB, "/program"))
    await dbSet("/program/" + pRef.key, {
      id:      pRef.key,
      id_akce: id,
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

async function setDocUrl(params){
  await dbUpdate("/akce/" + params.id, {doc_url: params.url})
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
    CODE:        r.code        || "",
    VERSION:     r.version     || "",
    NOTE:        r.note        || ""
  }))
}

async function addSong(params){
  const id = "r" + Date.now()
  await dbSet("/repertoar/" + id, {
    id,
    name:        params.name        || "",
    author:      params.author      || "",
    arranged_by: params.arranged_by || "",
    text_by:     params.text_by     || "",
    length:      params.length      || "",
    status:      params.status      || "Aktivní",
    pdf:         params.pdf         || "",
    code:        params.code        || "",
    note:        params.note        || "",
    version:     params.version     || ""
  })
  return {status: "created", id}
}

async function updateSong(params){
  await dbUpdate("/repertoar/" + params.id, {
    name:        params.name        || "",
    author:      params.author      || "",
    arranged_by: params.arranged_by || "",
    text_by:     params.text_by     || "",
    length:      params.length      || "",
    status:      params.status      || "Aktivní",
    pdf:         params.pdf         || "",
    code:        params.code        || "",
    note:        params.note        || "",
    version:     params.version     || ""
  })
  return {status: "updated"}
}

async function deleteSong(id){
  await dbRemove("/repertoar/" + id)
  return {status: "deleted"}
}

async function updateEntireSeries(params){
  const akce = await dbGet("/akce/" + params.id)
  const templateId = akce?.template_id
  if(!templateId) return { status: "no_template" }

  const vsechnyAkce = await dbGet("/akce")
  const toUpdate = objToArray(vsechnyAkce).filter(e => e.template_id === templateId)

  for(const inst of toUpdate){
    await dbUpdate("/akce/" + inst.id, {
      name:             params.name,
      start:            params.start            || "",
      end:              params.end              || "",
      place:            params.place            || "",
      call_url:         params.call_url         || "",
      note:             params.note             || "",
      status:           params.status           || "Plánovaná",
      requires_program: params.requires_program !== false
      // date záměrně NEměníme u celé série
    })
  }

  return { status: "entire_series_updated", count: toUpdate.length }
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

async function getFavorites(email){
  const data = await dbGet("/favorites/" + email.replace(/\./g,"_").replace(/@/g,"_at_"))
  return data || {}
}

async function toggleFavorite(params){
  const key  = params.email.replace(/\./g,"_").replace(/@/g,"_at_")
  const path = "/favorites/" + key + "/" + params.songId
  const existing = await dbGet(path)
  if(existing){
    await dbRemove(path)
    return {status: "removed"}
  }else{
    await dbSet(path, true)
    return {status: "added"}
  }
}

async function setEnergy(params){
  const akce = await dbGet("/akce/" + params.event)

  if(params.phase === "start"){
    const eRef = push(ref(DB, "/energie"))
    await dbSet("/energie/" + eRef.key, {
      id:      eRef.key,
      id_akce: params.event,
      start:   Number(params.start),
      end:     null,
      date:    akce ? akce.date : new Date().toISOString()
    })
    return {status: "start_saved"}

  }else if(params.phase === "end"){
    const energie = await dbGet("/energie")
    const existing = objToArray(energie).find(e =>
      e.id_akce === params.event && (e.end === null || e.end === undefined || e.end === "")
    )

    if(existing){
      await dbUpdate("/energie/" + existing.id, {end: Number(params.end)})
      return {status: "end_saved"}
    }else{
      const eRef = push(ref(DB, "/energie"))
      await dbSet("/energie/" + eRef.key, {
        id:      eRef.key,
        id_akce: params.event,
        start:   null,
        end:     Number(params.end),
        date:    akce ? akce.date : new Date().toISOString()
      })
      return {status: "end_saved_new"}
    }

  }else{
    const eRef = push(ref(DB, "/energie"))
    await dbSet("/energie/" + eRef.key, {
      id:      eRef.key,
      id_akce: params.event,
      start:   Number(params.start),
      end:     Number(params.end),
      date:    akce ? akce.date : new Date().toISOString()
    })
    return {status: "saved"}
  }
}

async function updateEnergie(params){
  await dbUpdate("/energie/" + params.id, {
    start: Number(params.start),
    end:   Number(params.end)
  })
  return {status: "updated"}
}

async function deleteEnergie(id){
  await dbRemove("/energie/" + id)
  return {status: "deleted"}
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

    const memberStatus = objToArray(members)
  .filter(m => (m.role || "").toUpperCase() !== "GUEST")
  .map(m => {
    const p = vsechnyPlatby.find(x => x.email === m.email)
    return {
      name:  m.name,
      email: m.email,
      paid:  p ? Number(p.paid) || 0 : 0,
      date:  p ? p.date : null
    }
  })

    const totalPaid = vsechnyPlatby.reduce((sum, p) => sum + (Number(p.paid) || 0), 0)
    const remaining = (Number(v.amount) * objToArray(members).filter(m => (m.role || "").toUpperCase() !== "GUEST").length)
 - totalPaid

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

  const memberList = objToArray(members).filter(m => (m.role || "").toUpperCase() !== "GUEST")
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

  const lastUpdated = dArr.reduce((latest, d) => {
    return d.updated_at > latest ? d.updated_at : latest
  }, "")

  return {
    signature: `${lastUpdated}_${aArr.length}_${pArr.length}_${dArr.length}`
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

async function deleteAktualita(id){
  await dbRemove("/aktuality/" + id)
  return {status: "deleted"}
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
  const updates = {done: params.done === true || params.done === "true"}
  if(params.text     !== undefined) updates.text     = params.text
  if(params.deadline !== undefined) updates.deadline = params.deadline
  await dbUpdate("/todos/" + params.id, updates)
  return {status: "saved"}
}

async function deleteTodo(id){
  await dbRemove("/todos/" + id)
  return {status: "deleted"}
}

// ===============================
// OPAKUJÍCÍ SE UDÁLOSTI
// ===============================

function generateRecurrenceDates(startDate, type, until){
  const dates    = []
  const end      = new Date(until)
  end.setHours(23, 59, 59)
  const current  = new Date(startDate)
  const stepDays = type === "biweekly" ? 14 : 7

  while(current <= end){
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, "0")
    const d = String(current.getDate()).padStart(2, "0")
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + stepDays)
  }

  return dates
}

async function addRecurring(params){
  const members    = await dbGet("/members")
  const memberList = objToArray(members).filter(m => (m.role || "").toUpperCase() !== "GUEST")

  const templateId = "tmpl_" + Date.now()

  // Ulož šablonu (skrytá)
  await dbSet("/akce/" + templateId, {
    id:               templateId,
    name:             params.name,
    date:             params.date,
    start:            params.start            || "",
    end:              params.end              || "",
    place:            params.place            || "",
    call_url:         params.call_url         || "",
    note:             params.note             || "",
    status:           params.status           || "Plánovaná",
    requires_program: params.requires_program !== false,
    doc_url:          "",
    is_template:      true,
    recurrence_type:  params.recurrence_type,
    recurrence_until: params.recurrence_until
  })

  const dates = generateRecurrenceDates(
    params.date,
    params.recurrence_type,
    params.recurrence_until
  )

  const createdIds = []

  for(let i = 0; i < dates.length; i++){
    // Malá pauza aby Date.now() byl unikátní pro každé ID
    const id = "a" + (Date.now() + i) + "_" + Math.random().toString(36).substr(2, 6)

    await dbSet("/akce/" + id, {
      id,
      name:             params.name,
      date:             dates[i],
      start:            params.start            || "",
      end:              params.end              || "",
      place:            params.place            || "",
      call_url:         params.call_url         || "",
      note:             params.note             || "",
      status:           params.status           || "Plánovaná",
      requires_program: params.requires_program !== false,
      doc_url:          "",
      is_template:      false,
      template_id:      templateId,
      recurrence_type:  params.recurrence_type
    })

    createdIds.push(id)

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
  }

  return { status: "created", templateId, instances: createdIds.length }
}

async function deleteRecurring(params){
  // mode: "single" | "series" | "from_this"

  if(params.mode === "series" || params.mode === "from_this"){
    const akce = await dbGet("/akce/" + params.id)
    const templateId = akce?.template_id

    if(!templateId){
      await deleteEvent(params.id)
      return { status: "single_deleted_no_template" }
    }

    const vsechnyAkce = await dbGet("/akce")
    const dochazka    = await dbGet("/dochazka")
    const program     = await dbGet("/program")

    let toDelete = objToArray(vsechnyAkce).filter(e =>
      e.template_id === templateId || e.id === templateId
    )

    if(params.mode === "from_this"){
      // zachovej šablonu a instance PŘED touto akcí
      const thisDate = akce.date
      toDelete = toDelete.filter(e =>
        e.is_template !== true && e.date >= thisDate
      )
    }

    for(const inst of toDelete){
      await dbRemove("/akce/" + inst.id)

      const dDel = objToArray(dochazka).filter(d => d.id_akce === inst.id)
      for(const d of dDel) await dbRemove("/dochazka/" + d.id)

      const pDel = objToArray(program).filter(p => p.id_akce === inst.id)
      for(const p of pDel) await dbRemove("/program/" + p.id)
    }

    return { status: params.mode === "from_this" ? "from_this_deleted" : "series_deleted", count: toDelete.length }

  }else{
    await deleteEvent(params.id)
    return { status: "single_deleted" }
  }
}

async function updateSeriesFrom(params){
  console.log("params:", params)
  const akce = await dbGet("/akce/" + params.id)
  const templateId = akce?.template_id
  if(!templateId) return { status: "no_template" }

  const vsechnyAkce = await dbGet("/akce")

  function normalizeDate(d){
    if(!d) return ""
    const parsed = new Date(d)
    if(isNaN(parsed)) return ""
    const y   = parsed.getFullYear()
    const m   = String(parsed.getMonth() + 1).padStart(2, "0")
    const day = String(parsed.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const thisDate = normalizeDate(akce.date)

  const toUpdate = objToArray(vsechnyAkce)
    .filter(e => e.template_id === templateId && normalizeDate(e.date) >= thisDate)
    .sort((a,b) => normalizeDate(a.date) > normalizeDate(b.date) ? 1 : -1)

  console.log("templateId:", templateId)
  console.log("thisDate:", thisDate)
  console.log("toUpdate.length:", toUpdate.length)
  console.log("vsechnyAkce s template_id:", objToArray(vsechnyAkce).filter(e => e.template_id === templateId).map(e => ({id: e.id, date: e.date})))

  if(!toUpdate.length) return { status: "nothing_to_update" }

  const oldFirst = new Date(normalizeDate(toUpdate[0].date))
  const newFirst = new Date(params.date)
  const diffMs   = newFirst - oldFirst

  console.log("oldFirst raw:", toUpdate[0].date)
  console.log("oldFirst normalized:", normalizeDate(toUpdate[0].date))
  console.log("oldFirst parsed:", new Date(normalizeDate(toUpdate[0].date)))
  console.log("newFirst:", newFirst)
  console.log("diffMs:", diffMs)

  for(const inst of toUpdate){
    const origDate = new Date(inst.date)
    if(isNaN(origDate)){
      console.warn("Preskakuji akci s neplatnym datem:", inst.id, inst.date)
      continue
    }

    const newDate = new Date(origDate.getTime() + diffMs)
    const y   = newDate.getFullYear()
    const m   = String(newDate.getMonth() + 1).padStart(2, "0")
    const d   = String(newDate.getDate()).padStart(2, "0")

    await dbUpdate("/akce/" + inst.id, {
      name:             params.name,
      date:             `${y}-${m}-${d}`,
      start:            params.start            || "",
      end:              params.end              || "",
      place:            params.place            || "",
      call_url:         params.call_url         || "",
      note:             params.note             || "",
      status:           params.status           || "Plánovaná",
      requires_program: params.requires_program !== false
    })
  }

  return { status: "series_updated", count: toUpdate.length }
}

// ===============================
// HLAVNÍ API FUNKCE
// ===============================

async function api(action, params = {}){
  switch(action){
    case "members":          return await getMembers()
    case "events":           return await getEvents()
    case "eventdetail":      return await getEventDetail(params.id)
    case "setattendance":    return await setAttendance(params)
    case "myattendance":     return await getMyAttendance(params.email)
    case "heatmap":          return await getHeatmap()
    case "addevent":         return await addEvent(params)
    case "updateevent":      return await updateEvent(params)
    case "deleteevent":      return await deleteEvent(params.id)
    case "cancelevent":      return await cancelEvent(params)
    case "setdocurl":        return await setDocUrl(params)
    case "setprogram":       return await setProgram(params)
    case "updatenote":       return await updateNote(params)
    case "repertoar":        return await getRepertoar()
    case "addsong":          return await addSong(params)
    case "updatesong":       return await updateSong(params)
    case "deletesong":       return await deleteSong(params.id)
    case "favorites":        return await getFavorites(params.email)
    case "togglefavorite":   return await toggleFavorite(params)
    case "energy":           return await getEnergy()
    case "setenergy":        return await setEnergy(params)
    case "updateenergie":    return await updateEnergie(params)
    case "deleteenergie":    return await deleteEnergie(params.id)
    case "payments":         return await getPayments(params.email)
    case "setpayment":       return await setPayment(params)
    case "addcollection":    return await addCollection(params)
    case "deletecollection": return await deleteCollection(params.id)
    case "verifypin":        return await verifyPin(params)
    case "lastmodified":     return await getLastModified()
    case "aktuality":        return await getAktuality()
    case "updateaktualita":  return await updateAktualita(params)
    case "deleteaktualita":  return await deleteAktualita(params.id)
    case "addaktualita":     return await addAktualita(params)
    case "todos":            return await getTodos()
    case "addtodo":          return await addTodo(params)
    case "updatetodo":       return await updateTodo(params)
    case "deletetodo":       return await deleteTodo(params.id)
    case "addrecurring":     return await addRecurring(params)
    case "deleterecurring":  return await deleteRecurring(params)
    case "getrawakce":       return await dbGet("/akce/" + params.id)
    case "updateseriesfrom": return await updateSeriesFrom(params)
    case "updateentireseriesfrom": return await updateEntireSeries(params)
    default: throw new Error("Unknown action: " + action)
  }
}

window.api = api
window.watchChanges = watchChanges
