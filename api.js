const API_URL = "https://script.google.com/macros/s/AKfycbz4B6maR68tYSfJLBe_jO3hDrvxdqpSslDNypdEEJdNLXKK0sdtgGBsQWNAeHmE1eOr/exec"



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
