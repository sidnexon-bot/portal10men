import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getDatabase, ref, onValue, set, push, update, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js"
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"

const firebaseConfig = {
  apiKey: "AIzaSyAjDCB3gpqytTHnG7zKLKJGXMNeW5vyC_I",
  authDomain: "base-39f52.firebaseapp.com",
  databaseURL: "https://base-39f52-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "base-39f52",
  storageBucket: "base-39f52.firebasestorage.app",
  messagingSenderId: "20753597026",
  appId: "1:20753597026:web:bec0c5a784492206f3c73b"
}

const app      = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth     = getAuth(app)

export { database, auth, ref, onValue, set, push, update, remove, get, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut }
