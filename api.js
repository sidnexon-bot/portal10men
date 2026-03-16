const API_URL = "https://script.google.com/macros/s/AKfycbw0RznOh6HfuiT-Uzio6CRs2flSMxsBwmtAudGEgurLECX8FvN92bqVQyDJCJzVV8FnrA/exec"

async function api(action, params = {}) {

let url = API_URL + "?action=" + action

for (const key in params) {
url += "&" + key + "=" + encodeURIComponent(params[key])
}

const res = await fetch(url)

return res.json()

}
