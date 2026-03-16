const API_URL = "https://script.google.com/macros/s/AKfycbyTF8rG2v50v8DMThZdYLhU1EN5VkIcBmLSuevV1FjdggTu9g9qOwMTE72KDBRNtPD9Ww/exec"

async function api(action, params = {}) {

let url = API_URL + "?action=" + action

for (const key in params) {
url += "&" + key + "=" + encodeURIComponent(params[key])
}

const res = await fetch(url)

return res.json()

}
