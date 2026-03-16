const API_URL = "https://script.google.com/macros/s/AKfycbyfab3QJfG16SEscB2pkSneGYQArlUH2br9HXmIQiW_QR3K7t4cI3vZazv-JsghWvavFg/exec";

async function apiFetch(action, params = {}){
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach(k => {
    if(params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k]);
  });
  const res = await fetch(url.toString(), {cache: "no-store"});
  const json = await res.json();
  return json;
}

// přehledné wrappery
const api = {
  members: () => apiFetch("members"),
  events: () => apiFetch("events"),
  repertoire: () => apiFetch("repertoire"),
  energy: () => apiFetch("energy"),
  payments: () => apiFetch("payments"),
  collections: () => apiFetch("collections"),
  program: (eventId) => apiFetch("program", {event: eventId}),
  attendanceList: (eventId) => apiFetch("attendanceList", {event: eventId}),
  setAttendance: (eventId, memberId, status, reason="") =>
    apiFetch("setAttendance", {event: eventId, member: memberId, status: status, reason: reason}),
  table: (sheetName) => apiFetch("table", {sheet: sheetName})
};
