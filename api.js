const API_URL = "https://script.google.com/macros/s/AKfycbzPxtiBJ3cK2-xgpYRRjD_PHzb8KNR1lwFqDyU7B_07BWjEW2AyOoCLCVDLVu8jyuvTlA/exec"

async function api(action, params = {}) {

  let url = API_URL + "?action=" + action

  for (const key in params) {
    url += "&" + key + "=" + encodeURIComponent(params[key])
  }

  const res = await fetch(url)
  const data = await res.json()

  return data
}
