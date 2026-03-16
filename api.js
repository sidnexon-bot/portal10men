const API_URL = "https://script.google.com/macros/s/AKfycbw0RznOh6HfuiT-Uzio6CRs2flSMxsBwmtAudGEgurLECX8FvN92bqVQyDJCJzVV8FnrA/exec"

async function api(action, params = {}) {

  try {

    let url = API_URL + "?action=" + action

    for (const key in params) {
      url += "&" + key + "=" + encodeURIComponent(params[key])
    }

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error("HTTP error " + res.status)
    }

    const data = await res.json()

    if (data && data.error) {
      console.error("API error:", data.error)
      return []
    }

    return data

  } catch (err) {

    console.error("API request failed:", err)

    return []

  }
}
