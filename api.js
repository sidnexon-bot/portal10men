const API_URL = "https://script.google.com/macros/s/AKfycbzPxtiBJ3cK2-xgpYRRjD_PHzb8KNR1lwFqDyU7B_07BWjEW2AyOoCLCVDLVu8jyuvTlA/exec"



async function api(action, params = {}) {

  try {

    let url = API_URL + "?action=" + action

    // přidání parametrů
    for (const key in params) {
      url += "&" + key + "=" + encodeURIComponent(params[key])
    }

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error("HTTP error " + res.status)
    }

    const data = await res.json()

    return data

  } catch (err) {

    console.error("API error:", err)

    return []

  }

}
