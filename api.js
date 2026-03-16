const API_URL = "https://script.google.com/macros/s/AKfycbxLbVj0tO8JTdRC34DO7yRmvH6JtIJ58kMTyf4e6FA8Ed0SUe-x3HaQeVJtgenhcpSidg/exec"

async function api(action, params = {}) {

let url = API_URL + "?action=" + action

for (const key in params) {
url += "&" + key + "=" + encodeURIComponent(params[key])
}

const res = await fetch(url)

return res.json()

}
