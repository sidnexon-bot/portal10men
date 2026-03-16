const API_URL="https://script.google.com/macros/s/AKfycbz70NG30uR-bBHPzY0Yaw4BnTaSHfUFEJSz0eVIelceVYf6gf9NWjZdzOWiZ9kLY9l9OA/exec"

async function api(action,params={}){

let url=API_URL+"?action="+action

for(const key in params){
url+="&"+key+"="+encodeURIComponent(params[key])
}

const res=await fetch(url)

return res.json()

}
