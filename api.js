// api.js - robustní wrapper, který překryje staré api a nezničí existující metody
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbzPxtiBJ3cK2-xgpYRRjD_PHzb8KNR1lwFqDyU7B_07BWjEW2AyOoCLCVDLVu8jyuvTlA/exec";

  // Pomocná funkce: postaví URL s parametry
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

  // základní fetch wrapper - vrátí parsed JSON nebo {error:...}
  async function callApi(action, params){
    const url = buildUrl(action, params);
    const resp = await fetch(url, {cache: "no-store"});
    // pokud není 200, pokusíme se načíst text pro lepší chybovou hlášku
    if(!resp.ok){
      const txt = await resp.text().catch(()=>"(no body)");
      throw new Error(`API error ${resp.status} ${resp.statusText} - ${txt}`);
    }
    // pokusíme se o JSON
    const text = await resp.text();
    try{
      return JSON.parse(text);
    }catch(err){
      // pokud to není JSON, vrať text
      return { _raw: text };
    }
  }

  // pokud už existuje window.api, uložíme ho, abychom zachovali eventuální metody
  const previousApi = (typeof window !== "undefined" && window.api) ? window.api : null;

  // Hlavní funkce, kterou budou volat staré volání jako api("members", { event: id })
  async function api(action, params){
    // pokud někde jinde už byl objekt se stejnými metodami (např. api.members),
    // vyzkoušíme delegovat na něj — to zajistí zpětnou kompatibilitu.
    try{
      if(previousApi && typeof previousApi === "object" && typeof previousApi[action] === "function"){
        // delegujeme na starou implementaci (pokud je synchronní, budeme vracet hodnotu / Promise)
        const res = previousApi[action](params);
        // pokud vrací promise, počkej
        if(res && typeof res.then === "function") return await res;
        return res;
      }
    }catch(e){
      // pokud delegace selže, pokračujeme vlastní fetch logikou
      console.warn("api wrapper: delegation to previous api failed:", e);
    }

    // fallback: zavolat REST endpoint
    return await callApi(action, params);
  }

  // přidej pár helperů jako properties, aby kód, který očekává api.members() nebo api.getMembers() fungoval
  api.get = (action, params) => api(action, params);
  api.call = (action, params) => api(action, params);

  // pokud starý objekt obsahoval metody, zachovej je jako api.methodName
  if(previousApi && typeof previousApi === "object"){
    Object.keys(previousApi).forEach(k=>{
      if(!(k in api)){
        try{ api[k] = previousApi[k]; }catch(e){}
      }
    });
  }

  // předej na globální objekt (přepíše cokoli tam bylo)
  if(typeof window !== "undefined"){
    window.api = api;
  }
  // CommonJS compat pro testy/Node
  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }

  // Pro debug: log jednou
  try{
    if(window && window.console) window.console.info && window.console.info("api.js loaded - wrapper installed");
  }catch(e){}
})();
