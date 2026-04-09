import { auth } from 'JS/index.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE_URL = isLocal
  ? 'https://vanillachart-api.vercel.app'
  : 'https://vanillachart-api.vercel.app';

async function doLogin(event) {
  event.preventDefault();

  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;

  const tokenInput = document.querySelector('[name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : null;

  if (!token) {
    document.getElementById('login-err').innerText = "Attendi la verifica di sicurezza.";
    return;
  }

  try {
    // Step 1: verify captcha via Vercel
    const captchaRes = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken: token }) // only send the captcha token
    });

    const captchaResult = await captchaRes.json();

    if (!captchaRes.ok) {
      document.getElementById('login-err').innerText = captchaResult.error || "Verifica captcha fallita.";
      return;
    }

    // Step 2: captcha passed, now login with Firebase
    const userCredential = await firebase.auth().signInWithEmailAndPassword(user, pass);
    console.log("Firebase login ok:", userCredential.user);

    window.location.href = '/dashboard.html'; // redirect on success

  } catch (err) {
    console.error(err);
    // Firebase throws specific error codes
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      document.getElementById('login-err').innerText = "Username o password errati.";
    } else if (err.code === 'auth/too-many-requests') {
      document.getElementById('login-err').innerText = "Troppi tentativi. Riprova più tardi.";
    } else {
      document.getElementById('login-err').innerText = "Errore di connessione.";
    }
  }
}

/* ------------- REGISTER -------------

async function doRegister(event) {
  event.preventDefault(); 
  
  const user = document.getElementById('reg-user').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-pass').value;
  
  const formData = new FormData(event.target);
  const token = formData.get('cf-turnstile-response');

  if (!token) {
    document.getElementById('reg-err').innerText = "Attendi la verifica di sicurezza.";
    return;
  }

  try {
    // Point this to your new Vercel register endpoint
    const response = await fetch('https://vanillachart-api.vercel.app/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, email, pass, turnstileToken: token })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        document.getElementById('reg-err').innerText = result.error;
    } else {
        // Success!
        document.getElementById('reg-err').innerText = "";
        alert(result.message); // Or redirect them, show a success message, etc.
    }
  } catch (error) {
    document.getElementById('reg-err').innerText = "Errore di connessione.";
  }
}

// ------------- FORGOT PASSWORD -------------
async function doForgot(event) {
  event.preventDefault(); 
  
  const email = document.getElementById('forgot-email').value;
  
  const formData = new FormData(event.target);
  const token = formData.get('cf-turnstile-response');

  if (!token) {
    document.getElementById('forgot-err').innerText = "Attendi la verifica di sicurezza.";
    return;
  }

  try {
    // Point this to your new Vercel forgot endpoint
    const response = await fetch('https://vanillachart-api.vercel.app/api/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken: token })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        document.getElementById('forgot-err').innerText = result.error;
    } else {
        // Success!
        document.getElementById('forgot-err').innerText = "";
        document.getElementById('forgot-ok').innerText = result.message;
    }
  } catch (error) {
    document.getElementById('forgot-err').innerText = "Errore di connessione.";
  }
} */