/* ===============================
   STAV APLIKACE
================================ */

let MEMBER_EMAIL = localStorage.getItem("memberEmail") || null
let MEMBER_NAME  = localStorage.getItem("memberName")  || null
let ACTIVE_TAB   = "dashboard"

function currentMember(){
  return MEMBER_EMAIL
}

/* ===============================
   HELPERS
================================ */

function escapeHtml(str){
  if(!str) return ""
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
}

function formatDate(d){
  if(!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("cs-CZ",{
    weekday: "short",
    day:     "numeric",
    month:   "numeric",
    year:    "numeric"
  })
}

function formatTime(t){
