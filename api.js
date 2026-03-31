// api.js - robustní wrapper s auth podporou
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbx74L6IrbOJmCdIEF4SxGOoS8aV3rTtVc2XIsGXgfu6OnO27Kh3KGLv4lwzdw6n1Qnzgw/exec";

  // Pomocná funkce: postaví URL s parametry (pro GET)
  function buildUrl(action, params){
    const u = new URL(API_URL);
    if(action) u.searchParams.set("action", action);
    if(params && typeof params === "object"){
      Object.keys(params).forEach(k=>{
        if(params[k] !== undefined && params[k] !== null) u.searchParams.set(k, String(params[k]));
      });
    }
    return u.toString();
  }

  // Získá token z sessionStorage (vloží Auth nebo přímý přístup)
  function getToken(){
    try{ return sessionStorage.getItem("10base_token") || null; }
    catch(e){ return null; }
  }

  // GET wrapper - beze změny, zpětná kompatibilita
  async function callGet(action, params){
    const url = buildUrl(action, params);
    const resp = await fetch(url, { cache: "no-store" });
    if(!resp.ok){
      const txt = await resp.text().catch(()=>"(no body)");
      throw new Error(`API error ${resp.status} ${resp.statusText} - ${txt}`);
    }
    const text = await resp.text();
    try{ return JSON.parse(text); }
    catch(e){ return { _raw: text }; }
  }

  // POST wrapper - pro autentizované akce, token v těle requestu
  async function callPost(action, params){
    const token = getToken();
    const body = {
      action,
      ...(params || {}),
      ...(token ? { idToken: token } : {})
    };
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(body)
    });
    if(!resp.ok){
      const txt = await resp.text().catch(()=>"(no body)");
      throw new Error(`API error ${resp.status} ${resp.statusText} - ${txt}`);
    }
    const text = await resp.text();
    try{ return JSON.parse(text); }
    catch(e){ return { _raw: text }; }
  }

  // Seznam akcí, které vyžadují POST + auth token
  // Rozšiřuj podle potřeby
  const POST_ACTIONS = new Set([
    "verifyUser",
    "getMembers",
    "getEvents",
    "addEventNote",
    "updateAttendance",
    "getAttendance"
  ]);

  const previousApi = (typeof window !== "undefined" && window.api) ? window.api : null;

  async function api(action, params){
    // zpětná kompatibilita se starými metodami
    try{
      if(previousApi && typeof previousApi === "object" && typeof previousApi[action] === "function"){
        const res = previousApi[action](params);
        if(res && typeof res.then === "function") return await res;
        return res;
      }
    }catch(e){
      console.warn("api wrapper: delegation to previous api failed:", e);
    }

    // POST pro autentizované akce, GET pro ostatní
    if(POST_ACTIONS.has(action)){
      return await callPost(action, params);
    }
    return await callGet(action, params);
  }

  // Helpery
  api.get  = (action, params) => callGet(action, params);
  api.post = (action, params) => callPost(action, params);
  api.call = (action, params) => api(action, params);

  // zachování starých metod
  if(previousApi && typeof previousApi === "object"){
    Object.keys(previousApi).forEach(k=>{
      if(!(k in api)){
        try{ api[k] = previousApi[k]; }catch(e){}
      }
    });
  }

  if(typeof window !== "undefined") window.api = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;

  try{
    if(window && window.console) window.console.info && window.console.info("api.js loaded - auth wrapper installed");
  }catch(e){}
})();
