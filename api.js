const API_URL = "https://script.google.com/macros/s/AKfycbyfab3QJfG16SEscB2pkSneGYQArlUH2br9HXmIQiW_QR3K7t4cI3vZazv-JsghWvavFg/exec"


async function api(action, params = {}){

  const url = new URL(API_URL)

  url.searchParams.set("action", action)

  Object.keys(params).forEach(key=>{
    url.searchParams.set(key, params[key])
  })

  const response = await fetch(url)

  return await response.json()

}
