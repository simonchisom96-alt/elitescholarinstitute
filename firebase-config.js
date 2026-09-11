/* ============================================================
   firebase-config.js
   The ONLY file in this project that holds keys/config. Nothing else
   (not notification.html, not password.js) should ever contain a
   firebaseConfig object or the admin email again — if you add a new
   page later, just load this file before your other script and use
   window.FIREBASE_CONFIG / window.ADMIN_EMAIL.

   Note on the apiKey: a Firebase Web API key is not a secret the way
   a server API key is — it's designed to be shipped to every browser
   that loads the page (Google's own docs say so). What actually
   protects your data is firebase-rules.json, enforced on Google's
   servers, not whether this string is visible. Keeping it in its own
   file is still good practice: it's the one place to rotate a key,
   and if you ever push this project to a public GitHub repo you can
   .gitignore this single file without breaking anything else.
============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM",
  authDomain: "elite-notification.firebaseapp.com",
  databaseURL: "https://elite-notification-default-rtdb.firebaseio.com",
  projectId: "elite-notification",
  storageBucket: "elite-notification.firebasestorage.app",
  messagingSenderId: "359910414254",
  appId: "1:359910414254:web:a1bafd3e23fd554a975a3f"
};

// The only account allowed to become admin. Real enforcement is the
// Firebase sign-in in password.js + firebase-rules.json (which checks
// auth.token.email against this exact address) — not this string.
window.ADMIN_EMAIL = "admin@elitescholarinstitute.app";
