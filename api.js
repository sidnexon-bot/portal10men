const API_URL = "https://script.google.com/macros/s/AKfycby4EOosB3W72SdGpqdkue3nY0zGdti1pMT9mi9IM6hbj6kQu3wr-96KySw7CHAmF2TU1A/exec"

async function api(action, params = {}) {

let url = API_URL + "?action=" + action

for (const key in params) {
url += "&" + key + "=" + encodeURIComponent(params[key])
}

const res = await fetch(url)

return res.json()

}
