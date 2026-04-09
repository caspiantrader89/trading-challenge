import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCk4EmpRqx0RH3qUh_YNp1u4eylYgfbCgo",
  authDomain: "trading-challenge-f3eb1.firebaseapp.com",
  projectId: "trading-challenge-f3eb1",
  storageBucket: "trading-challenge-f3eb1.firebasestorage.app",
  messagingSenderId: "349225228306",
  appId: "1:349225228306:web:294ae3bd5bee71c9d7a0cb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const FIREBASE_CONFIGURED = true;

let currentUser = null;
let currentState = null;
let currentRR = 2;
let isReadOnly = false;
let unsubscribe = null;
let unsubLb = null;

// ── HELPERS ──
function getPhase(cap) {
  if (cap < 500)   return 1;
  if (cap < 2000)  return 2;
  if (cap < 10000) return 3;
  if (cap < 40000) return 4;
  return 5;
}
function getRisk(phase) {
  if (phase === 1) return { pct: 15,  cls: 'phase1', label: 'Fase 1 — Aggressiva',       range: '$100 → $500' };
  if (phase === 2) return { pct: 10,  cls: 'phase2', label: 'Fase 2 — Crescita',          range: '$500 → $2.000' };
  if (phase === 3) return { pct: 7,   cls: 'phase3', label: 'Fase 3 — Moderata',          range: '$2.000 → $10.000' };
  if (phase === 4) return { pct: 4,   cls: 'phase4', label: 'Fase 4 — Conservativa',      range: '$10.000 → $40.000' };
  return             { pct: 2.5, cls: 'phase5', label: 'Fase 5 — Protezione capitale', range: '$40.000 → $100.000' };
}
function fmt(n) { return '$' + Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function calcProbability(state) {
  const total = state.trades.length;
  if (total < 5) return null;
  const wins = state.trades.filter(t => t.outcome === 'win').length;
  // Bayesian smoothing with very conservative prior (30% WR)
  const wr = (wins + 2) / (total + 8);
  const cap = state.capital;
  if (cap <= 0) return 0;
  const TARGET = 100000;
  const MAX_TRADES = 600;
  let successes = 0;
  const RUNS = 8000;
  for (let i = 0; i < RUNS; i++) {
    let c = cap, consLoss = 0;
    for (let t = 0; t < MAX_TRADES; t++) {
      if (c <= 0) break;
      const sl = c * getRisk(getPhase(c)).pct / 100;
      if (Math.random() < wr) { c += sl * 2; consLoss = 0; }
      else { c -= sl; consLoss++; if (consLoss >= 3) { c *= 0.95; consLoss = 0; } }
      if (c >= TARGET) { successes++; break; }
    }
  }
  // Apply harsh reality penalty: prop challenges are brutal
  const raw = successes / RUNS;
  const penalized = Math.pow(raw, 2.5);
  return Math.round(penalized * 100);
}

// ── RENDER ──
function setRR(rr) {
  currentRR = rr;
  [1,2,3].forEach(r => document.getElementById('rr-'+r).classList.toggle('active', r===rr));
  renderTP();
}
function renderTP() {
  const cap = currentState ? currentState.capital : 100;
  const slAmt = cap * getRisk(getPhase(cap)).pct / 100;
  document.getElementById('tp-full').textContent = '+' + fmt(slAmt * 2);
  document.getElementById('tp-half').textContent = '+' + fmt(slAmt);
  document.getElementById('tp-sl').textContent = '−' + fmt(slAmt);
}
window.renderTP = renderTP;

function renderProb() {
  const pct = currentState && currentState.trades.length >= 5 ? calcProbability(currentState) : null;
  const descEl = document.getElementById('prob-desc');
  if (pct === null) {
    descEl.innerHTML = 'Aggiungi almeno 5 trade per calcolare la probabilità.';
    return;
  }
  const rawWr = Math.round(currentState.trades.filter(t=>t.outcome==='win').length / currentState.trades.length * 100);
  let color, verdict, detail;
  if (pct >= 50)      { color='var(--win)';    verdict='Buona';   detail='Win rate reale ' + rawWr + '% — traiettoria positiva. Mantieni la disciplina.'; }
  else if (pct >= 20) { color='var(--phase2)'; verdict='Media';   detail='Win rate reale ' + rawWr + '% — possibilità reali ma ogni trade è determinante.'; }
  else if (pct >= 8)  { color='var(--loss)';   verdict='Bassa';   detail='Win rate reale ' + rawWr + '% — percorso difficile. Rivedi la strategia.'; }
  else                { color='var(--loss)';   verdict='Critica'; detail='Win rate reale ' + rawWr + '% — matematicamente quasi impossibile. Stop e analisi.'; }
  descEl.innerHTML = '<strong style="color:' + color + ';font-size:15px">' + verdict + '</strong> — ' + detail;
}

function renderState(state) {
  currentState = state;
  const cap = state.capital;
  const phase = getPhase(cap);
  const risk = getRisk(phase);
  document.getElementById('m-capital').textContent = fmt(cap);
  document.getElementById('m-phase').textContent = phase;
  document.getElementById('m-trades').textContent = state.trades.length;
  document.getElementById('m-streak').textContent = state.consecutiveLoss;
  document.getElementById('header-user').textContent = state.username || '—';
  const rb = document.getElementById('risk-box');
  rb.className = 'risk-box ' + risk.cls;
  document.getElementById('risk-label').textContent = risk.label;
  document.getElementById('risk-pct').textContent = risk.pct + '%';
  document.getElementById('risk-amt').textContent = 'stop loss: ' + fmt(cap * risk.pct / 100);
  const _sl = cap * risk.pct / 100;
  const _tp = _sl * 2;
  if(document.getElementById('auto-win-sub')) document.getElementById('auto-win-sub').textContent = '+' + fmt(_tp) + ' calcolato auto';
  if(document.getElementById('auto-loss-sub')) document.getElementById('auto-loss-sub').textContent = '\u2212' + fmt(_sl) + ' calcolato auto';
  document.getElementById('risk-range').textContent = risk.range;
  // Stop banner con timer 1 settimana
  const stopBanner = document.getElementById('stop-banner');
  const stopDaysEl = document.getElementById('stop-banner-days');
  if (state.consecutiveLoss >= 3) {
    // Se non c'è ancora il timestamp, lo salviamo ora
    if (!state.stopBannerAt && !isReadOnly) {
      saveState({...state, stopBannerAt: Date.now()});
    }
    const bannerTs = state.stopBannerAt || Date.now();
    const elapsed  = Date.now() - bannerTs;
    const oneWeek  = 7 * 24 * 60 * 60 * 1000;
    if (elapsed < oneWeek) {
      stopBanner.classList.add('visible');
      const daysLeft = Math.ceil((oneWeek - elapsed) / (24*60*60*1000));
      stopDaysEl.textContent = '(' + daysLeft + (daysLeft===1?' giorno rimasto':' giorni rimasti') + ')';
    } else {
      stopBanner.classList.remove('visible');
    }
  } else {
    stopBanner.classList.remove('visible');
    stopDaysEl.textContent = '';
  }
  const pct = cap / 100000 * 100;
  document.getElementById('prog-label').textContent = fmt(cap) + ' / $100.000';
  document.getElementById('prog-pct').textContent = pct.toFixed(2) + '%';
  document.getElementById('prog-fill').style.width = Math.max(pct, 0.05) + '%';
  const wins = state.trades.filter(t => t.outcome === 'win').length;
  const total = state.trades.length;
  const totalPnl = state.trades.reduce((a,t) => a + t.pnl, 0);
  const best = total > 0 ? Math.max(...state.trades.map(t => t.pnl)) : null;
  document.getElementById('s-winrate').textContent = total > 0 ? Math.round(wins/total*100)+'%' : '—';
  document.getElementById('s-winrate').className = 'sv ' + (total>0 && wins/total>=0.5 ? 'pos' : 'neg');
  document.getElementById('s-profit').textContent = total > 0 ? (totalPnl>=0?'+':'−')+fmt(Math.abs(totalPnl)) : '—';
  document.getElementById('s-profit').className = 'sv ' + (totalPnl>=0?'pos':'neg');
  document.getElementById('s-best').textContent = best!==null ? (best>=0?'+':'−')+fmt(Math.abs(best)) : '—';
  document.getElementById('s-best').className = 'sv ' + (best!==null&&best>=0?'pos':'neg');
  const list = document.getElementById('trade-list');
  if (!state.trades.length) { list.innerHTML = '<div class="empty">Nessun trade registrato</div>'; }
  else {
    list.innerHTML = [...state.trades].reverse().map((t,i) => {
      const num = state.trades.length - i;
      const sign = t.pnl >= 0 ? '+' : '−';
      const symTag = t.symbol ? `<span style="font-size:10px;color:var(--text-muted);margin-right:4px">${t.symbol}</span>` : '';
      const modeTag = t.mode === 'bitget' ? `<span style="font-size:9px;padding:1px 5px;border-radius:2px;background:rgba(0,212,170,0.1);color:#00d4aa;margin-left:3px;letter-spacing:0.05em">Bitget</span>` : '';
      return `<div class="trade-item">
        <span class="trade-num">#${num}</span>
        <span class="trade-meta">${symTag}F${t.phase}${t.rr?' · '+t.rr+':1R':''} · ${t.date}${modeTag}</span>
        <span class="trade-pnl ${t.pnl>=0?'pos':'neg'}">${sign}${fmt(Math.abs(t.pnl))}</span>
        <span class="badge ${t.outcome}">${t.outcome==='win'?'Vincente':'Perdente'}</span>
        <span class="trade-cap">${fmt(t.capAfter)}</span>
      </div>`;
    }).join('');
  }
  renderTP(); renderProb();
  updateChStats(state.trades);
  drawEquityCurve(state.trades);
  checkCooldown(state);
}

function renderLeaderboard(entries, myUsername) {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  if (!entries.length) { list.innerHTML = '<div class="empty">Nessun trader ancora.</div>'; return; }
  const sorted = [...entries].sort((a,b) => b.capital - a.capital);
  list.innerHTML = sorted.map((e, i) => {
    const rank = i+1;
    const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'#'+rank;
    const isMe = e.username === myUsername;
    const phase = getPhase(e.capital);
    const phaseColors = ['','var(--phase1)','var(--phase2)','var(--phase3)','var(--phase4)','var(--phase5)'];
    const phaseBgs = ['','var(--phase1-bg)','var(--phase2-bg)','var(--phase3-bg)','var(--phase4-bg)','var(--phase5-bg)'];
    return '<div style="display:grid;grid-template-columns:36px 1fr auto auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<span style="font-size:15px;text-align:center">' + medal + '</span>'
      + '<a href="?u=' + encodeURIComponent(e.username) + '" target="_blank" style="font-size:13px;font-weight:500;color:' + (isMe?'var(--accent)':'var(--text)') + ';text-decoration:none;">' + e.username + (isMe?' (tu)':'') + '</a>'
      + '<span style="font-size:10px;padding:2px 8px;border-radius:3px;background:' + phaseBgs[phase] + ';color:' + phaseColors[phase] + ';text-transform:uppercase;letter-spacing:0.06em">F' + phase + '</span>'
      + '<span style="font-family:var(--display);font-weight:700;font-size:14px">' + fmt(e.capital) + '</span>'
      + '</div>';
  }).join('').replace(/border-bottom[^"]+">(?=[^<]*<\/div>\s*$)/,'">');
}

let appInitialized = false;

function showApp(state, readOnly=false) {
  isReadOnly = readOnly;

  if (!appInitialized) {
    appInitialized = true;
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    document.getElementById('share-btn').style.display = readOnly ? 'none' : 'inline-block';
    document.getElementById('journal-btn').style.display = readOnly ? 'none' : 'inline-block';
    document.getElementById('profile-btn').style.display = readOnly ? 'none' : 'inline-flex';
    document.getElementById('trade-form-section').style.display = readOnly ? 'none' : 'block';
    if (readOnly) {
      document.getElementById('readonly-banner').classList.add('visible');
      document.getElementById('readonly-name').textContent = state.username;
    }
    if (!readOnly) syncKeysFromFirestore().then(() => initBitgetDashboard()).catch(() => {});
    if (unsubLb) unsubLb();
    unsubLb = onSnapshot(collection(db, 'challenges'), snap => {
      const entries = snap.docs.map(d => d.data()).filter(d => d.username && d.capital !== undefined);
      renderLeaderboardByMode(entries, state.username);
    });
  }

  // render AFTER the screen is visible
  renderState(state);
}

function showAuth() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  if (!FIREBASE_CONFIGURED) document.getElementById('config-notice').style.display = 'block';
}

// ── AUTH ACTIONS ──
window.switchTab = function(tab) {
  ['login','register','forgot'].forEach(t => {
    document.getElementById('form-'+t).classList.toggle('hidden', t!==tab);
    document.querySelectorAll('.auth-tab')[['login','register','forgot'].indexOf(t)].classList.toggle('active', t===tab);
  });
};

window.doLogin = async function(event) {
  event.preventDefault();
  if (!FIREBASE_CONFIGURED) { document.getElementById('login-err').textContent = 'Firebase non configurato.'; return; }

  // 1. Check captcha first
  const tokenInput = document.querySelector('[name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : null;
  if (!token) {
    document.getElementById('login-err').textContent = 'Attendi la verifica di sicurezza.';
    return;
  }

  try {
    const captchaRes = await fetch('https://vanillachart-api.vercel.app/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken: token })
    });
    const captchaResult = await captchaRes.json();
    if (!captchaRes.ok) {
      document.getElementById('login-err').textContent = captchaResult.error || 'Verifica captcha fallita.';
      return;
    }
  } catch(e) {
    document.getElementById('login-err').textContent = 'Errore di connessione al server.';
    return;
  }

  // 2. Captcha passed — proceed with Firebase login (your existing code)
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!user || !pass) { document.getElementById('login-err').textContent = 'Compila tutti i campi.'; return; }
  const btn = document.getElementById('login-btn');
  btn.disabled = true; document.getElementById('login-err').textContent = '';
  try {
    const q = query(collection(db, 'usernames'), where('username', '==', user.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) { document.getElementById('login-err').textContent = 'Username non trovato.'; btn.disabled=false; return; }
    const email = snap.docs[0].data().email;
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    document.getElementById('login-err').textContent = e.code === 'auth/wrong-password' ? 'Password errata.' : 'Errore: ' + e.message;
    btn.disabled = false;
  }
};

window.doRegister = async function(event) {
  event.preventDefault();
  if (!FIREBASE_CONFIGURED) { document.getElementById('reg-err').textContent = 'Firebase non configurato — vedi istruzioni.'; return; }

  // 1. Captcha check
  const tokenInput = document.querySelector('#form-register [name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : null;
  if (!token) {
    document.getElementById('reg-err').textContent = 'Attendi la verifica di sicurezza.';
    return;
  }

  try {
    const captchaRes = await fetch('https://vanillachart-api.vercel.app/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken: token })
    });
    const captchaResult = await captchaRes.json();
    if (!captchaRes.ok) {
      document.getElementById('reg-err').textContent = captchaResult.error || 'Verifica captcha fallita.';
      return;
    }
  } catch(e) {
    document.getElementById('reg-err').textContent = 'Errore di connessione al server.';
    return;
  }

  // 2. Captcha passed — proceed with Firebase registration
  const user = document.getElementById('reg-user').value.trim().toLowerCase();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const gdprOk = document.getElementById('reg-gdpr')?.checked;
  const marketingOk = document.getElementById('reg-marketing')?.checked || false;

  if (!gdprOk) { document.getElementById('reg-err').textContent = 'Devi accettare la Privacy Policy per registrarti.'; return; }
  if (!user || !email || !pass) { document.getElementById('reg-err').textContent = 'Compila tutti i campi.'; return; }
  if (user.length < 3) { document.getElementById('reg-err').textContent = 'Username minimo 3 caratteri.'; return; }
  if (pass.length < 6) { document.getElementById('reg-err').textContent = 'Password minimo 6 caratteri.'; return; }

  const btn = document.getElementById('reg-btn');
  btn.disabled = true; document.getElementById('reg-err').textContent = '';

  try {
    // Check username availability
    const unameDoc = await getDoc(doc(db, 'usernames', user));
    if (unameDoc.exists()) { document.getElementById('reg-err').textContent = 'Username già in uso.'; btn.disabled=false; return; }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Save username → email mapping
    await setDoc(doc(db, 'usernames', user), { username: user, email: email, uid: cred.user.uid });

    // Create initial challenge data
    const initState = {
      username: user, capital: 100, trades: [], consecutiveLoss: 0,
      createdAt: Date.now(),
      gdprConsentAt: Date.now(),
      marketingConsent: marketingOk,
      marketingConsentAt: marketingOk ? Date.now() : null
    };
    await setDoc(doc(db, 'challenges', cred.user.uid), initState);

    // Save GDPR consent to localStorage
    localStorage.setItem('gdpr_consent', 'accepted');
    document.getElementById('gdpr-banner').style.display = 'none';

  } catch(e) {
    let msg = e.message;
    if (e.code === 'auth/email-already-in-use') msg = 'Email già registrata.';
    if (e.code === 'auth/invalid-email') msg = 'Email non valida.';
    document.getElementById('reg-err').textContent = msg;
    btn.disabled = false;
  }
};

window.doForgot = async function(event) {
  event.preventDefault();
  if (!FIREBASE_CONFIGURED) { document.getElementById('forgot-err').textContent = 'Firebase non configurato.'; return; }

  // 1. Captcha check
  const tokenInput = document.querySelector('#form-forgot [name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : null;
  if (!token) {
    document.getElementById('forgot-err').textContent = 'Attendi la verifica di sicurezza.';
    return;
  }

  try {
    const captchaRes = await fetch('https://vanillachart-api.vercel.app/api/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken: token })
    });
    const captchaResult = await captchaRes.json();
    if (!captchaRes.ok) {
      document.getElementById('forgot-err').textContent = captchaResult.error || 'Verifica captcha fallita.';
      return;
    }
  } catch(e) {
    document.getElementById('forgot-err').textContent = 'Errore di connessione al server.';
    return;
  }

  // 2. Captcha passed — proceed with Firebase password reset
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { document.getElementById('forgot-err').textContent = 'Inserisci la tua email.'; return; }

  const btn = document.getElementById('forgot-btn');
  btn.disabled = true;
  document.getElementById('forgot-err').textContent = '';
  document.getElementById('forgot-ok').textContent = '';

  try {
    await sendPasswordResetEmail(auth, email);
    document.getElementById('forgot-ok').textContent = 'Email inviata! Controlla la tua casella.';
    document.getElementById('forgot-err').textContent = '';
  } catch(e) {
    document.getElementById('forgot-err').textContent = 'Email non trovata o errore.';
    document.getElementById('forgot-ok').textContent = '';
  }

  btn.disabled = false;
};

window.doRegister = async function() {
  if (!FIREBASE_CONFIGURED) { document.getElementById('reg-err').textContent = 'Firebase non configurato — vedi istruzioni.'; return; }
  const user = document.getElementById('reg-user').value.trim().toLowerCase();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const gdprOk = document.getElementById('reg-gdpr')?.checked;
  const marketingOk = document.getElementById('reg-marketing')?.checked || false;
  if (!gdprOk) { document.getElementById('reg-err').textContent = 'Devi accettare la Privacy Policy per registrarti.'; return; }
  if (!user || !email || !pass) { document.getElementById('reg-err').textContent = 'Compila tutti i campi.'; return; }
  if (user.length < 3) { document.getElementById('reg-err').textContent = 'Username minimo 3 caratteri.'; return; }
  if (pass.length < 6) { document.getElementById('reg-err').textContent = 'Password minimo 6 caratteri.'; return; }
  const btn = document.getElementById('reg-btn');
  btn.disabled = true; document.getElementById('reg-err').textContent = '';
  try {
    // Check username availability
    const unameDoc = await getDoc(doc(db, 'usernames', user));
    if (unameDoc.exists()) { document.getElementById('reg-err').textContent = 'Username già in uso.'; btn.disabled=false; return; }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // Save username → email mapping
    await setDoc(doc(db, 'usernames', user), { username: user, email: email, uid: cred.user.uid });
    // Create initial challenge data — include GDPR + marketing consent timestamp
    const initState = {
      username: user, capital: 100, trades: [], consecutiveLoss: 0,
      createdAt: Date.now(),
      gdprConsentAt: Date.now(),
      marketingConsent: marketingOk,
      marketingConsentAt: marketingOk ? Date.now() : null
    };
    await setDoc(doc(db, 'challenges', cred.user.uid), initState);
    // Salva consenso anche in localStorage
    localStorage.setItem('gdpr_consent', 'accepted');
    document.getElementById('gdpr-banner').style.display = 'none';
  } catch(e) {
    let msg = e.message;
    if (e.code === 'auth/email-already-in-use') msg = 'Email già registrata.';
    if (e.code === 'auth/invalid-email') msg = 'Email non valida.';
    document.getElementById('reg-err').textContent = msg;
    btn.disabled = false;
  }
};

window.doForgot = async function() {
  if (!FIREBASE_CONFIGURED) { document.getElementById('forgot-err').textContent = 'Firebase non configurato.'; return; }
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { document.getElementById('forgot-err').textContent = 'Inserisci la tua email.'; return; }
  const btn = document.getElementById('forgot-btn');
  btn.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    document.getElementById('forgot-ok').textContent = 'Email inviata! Controlla la tua casella.';
    document.getElementById('forgot-err').textContent = '';
  } catch(e) {
    document.getElementById('forgot-err').textContent = 'Email non trovata o errore.';
    document.getElementById('forgot-ok').textContent = '';
  }
  btn.disabled = false;
};

window.doLogout = async function() {
  appInitialized = false; // add this line
  if (unsubscribe) unsubscribe();
  if (unsubJournal) { unsubJournal(); unsubJournal = null; }
  journalEntries = [];
  await signOut(auth);
  currentUser = null; currentState = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('readonly-banner').classList.remove('visible');
  showAuth();
};

// ── TRADE ACTIONS ──
function getTimestamp() {
  const d = new Date();
  return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
}
async function saveState(ns) { await setDoc(doc(db,'challenges',currentUser.uid), ns); }

window.addAutoTrade = async function(outcome) {
  if (isReadOnly || !currentUser) return;
  const cap = currentState.capital;
  const sl = cap * getRisk(getPhase(cap)).pct / 100;
  const pnl = outcome === 'win' ? sl * 2 : -sl;
  const capAfter = Math.max(cap + pnl, 0);
  const newLoss = outcome==='loss' ? currentState.consecutiveLoss+1 : 0;
  await saveState({...currentState, capital: capAfter,
    consecutiveLoss: newLoss,
    stopBannerAt: newLoss === 0 ? null : currentState.stopBannerAt,
    trades: [...currentState.trades, {phase:getPhase(cap),outcome,pnl,capAfter,date:getTimestamp(),mode:'auto',mood:currentChMood}]
  });
};

window.addManualTrade = async function(outcome) {
  if (isReadOnly || !currentUser) return;
  const capInput = parseFloat(document.getElementById('m-cap').value);
  const amount = parseFloat(document.getElementById('m-amount').value);
  if (isNaN(amount) || amount <= 0) { alert('Inserisci un importo valido.'); return; }
  const cap = isNaN(capInput) ? currentState.capital : capInput;
  const pnl = outcome === 'win' ? amount : -amount;
  const capAfter = Math.max(cap + pnl, 0);
  document.getElementById('m-cap').value = '';
  document.getElementById('m-amount').value = '';
  await saveState({...currentState, capital: capAfter,
    consecutiveLoss: outcome==='loss' ? currentState.consecutiveLoss+1 : 0,
    trades: [...currentState.trades, {phase:getPhase(cap),outcome,pnl,capAfter,date:getTimestamp(),mode:'manuale',mood:currentChMood}]
  });
};

window.confirmReset = async function() {
  if (isReadOnly || !currentUser) return;
  if (confirm('Sei sicuro? Tutti i trade verranno cancellati.')) {
    await saveState({...currentState, capital:100, trades:[], consecutiveLoss:0, stopBannerAt:null});
  }
};

// ── SHARE ──
window.openShareModal = function() {
  if (!currentState) return;
  const url = window.location.origin + window.location.pathname + '?u=' + encodeURIComponent(currentState.username);
  document.getElementById('share-link-box').textContent = url;
  document.getElementById('copy-hint').textContent = 'Clicca per copiare';
  document.getElementById('modal-share').classList.remove('hidden');
};
window.copyLink = function() {
  const url = document.getElementById('share-link-box').textContent;
  navigator.clipboard.writeText(url).then(() => {
    document.getElementById('copy-hint').textContent = 'Copiato!';
    setTimeout(() => document.getElementById('copy-hint').textContent = 'Clicca per copiare', 2000);
  });
};

// ── INIT ──
async function init() {
  if (!FIREBASE_CONFIGURED) { showAuth(); return; }
  // Check if viewing a shared challenge
  const params = new URLSearchParams(window.location.search);
  const sharedUser = params.get('u');

  if (sharedUser) {

    // Public read-only view — no auth needed
    try {
      const q = query(collection(db, 'usernames'), where('username', '==', sharedUser.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uid = snap.docs[0].data().uid;
        const challengeDoc = await getDoc(doc(db, 'challenges', uid));
        if (challengeDoc.exists()) {
          showApp(challengeDoc.data(), true);
          // Carica snapshot Bitget pubblico
          try {
            const pubSnap = await getDoc(doc(db, 'bitgetPublic', uid));
            if (pubSnap.exists()) renderReadonlyBitgetDashboard(pubSnap.data());
          } catch(e) {}
          // Live updates for read-only view
          onSnapshot(doc(db, 'challenges', uid), d => { if (d.exists()) renderState(d.data()); });
          onSnapshot(doc(db, 'bitgetPublic', uid), d => { if (d.exists()) renderReadonlyBitgetDashboard(d.data()); });
          return;
        }
      }
    } catch(e) {}
    document.getElementById('loading-screen').innerHTML = '<div class="loading-text" style="color:var(--text-muted)">Challenge non trovata.</div>';
    return;
  }

  // Normal auth flow
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      if (unsubscribe) unsubscribe();
      unsubscribe = onSnapshot(doc(db, 'challenges', user.uid), d => {
        if (d.exists()) {
          showApp(d.data(), false);
          loadUserProfile();
        } else {
          // Documento non ancora creato — mostra auth
          document.getElementById('loading-screen').style.display = 'none';
          showAuth();
        }
      }, err => {
        console.error('onSnapshot error:', err);
        document.getElementById('loading-screen').style.display = 'none';
        showAuth();
      });
    } else {
      currentUser = null;
      document.getElementById('app-screen').style.display = 'none';
      showAuth();
    }
  });
  
}

// ── TRADING JOURNAL ──
let journalEntries = [];
let unsubJournal = null;
let tpEnabled = [false, false, false];

window.toggleTP = function(n) {
  const idx = n - 1;
  tpEnabled[idx] = !tpEnabled[idx];
  const btn = document.getElementById('toggle-tp' + n);
  const block = document.getElementById('tp-block-' + n);
  if (tpEnabled[idx]) {
    btn.classList.add('active'); btn.textContent = '✕ TP' + n;
    block.style.display = 'block';
    if (n < 3) document.getElementById('toggle-tp' + (n+1)).disabled = false;
  } else {
    btn.classList.remove('active'); btn.textContent = '+ TP' + n;
    block.style.display = 'none';
    for (let i = n; i < 3; i++) {
      tpEnabled[i] = false;
      document.getElementById('toggle-tp'+(i+1)).classList.remove('active');
      document.getElementById('toggle-tp'+(i+1)).textContent = '+ TP'+(i+1);
      document.getElementById('toggle-tp'+(i+1)).disabled = true;
      document.getElementById('tp-block-'+(i+1)).style.display = 'none';
    }
  }
  calcJournalPnl();
};

window.calcJournalPnl = function() {
  const entry  = parseFloat(document.getElementById('jf-entry').value);
  const sl     = parseFloat(document.getElementById('jf-sl').value);
  const size   = parseFloat(document.getElementById('jf-size').value);
  const exit   = parseFloat(document.getElementById('jf-exit').value);
  const isLong = document.getElementById('jf-dir').value === 'long';

  ['tp1-preview','tp2-preview','tp3-preview','exit-preview'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });
  document.getElementById('jf-calc-row').style.display = 'none';
  document.getElementById('jf-residuo-label').textContent = '';
  if (isNaN(entry) || isNaN(sl) || isNaN(size) || size <= 0) return;
  const slDist = Math.abs(entry - sl);
  if (slDist === 0) return;

  let totalPnl = 0, weightedRR = 0, totalWeight = 0, remainingSize = size;
  let hasEnoughData = true;

  for (let i = 0; i < 3; i++) {
    if (!tpEnabled[i]) break;
    const n = i + 1;
    const tpPrice = parseFloat(document.getElementById('jf-tp'+n+'-price').value);
    const tpPct   = parseFloat(document.getElementById('jf-tp'+n+'-pct').value);
    if (isNaN(tpPrice) || isNaN(tpPct) || tpPct <= 0) { hasEnoughData = false; break; }
    const closed = remainingSize * (tpPct / 100);
    const diff   = isLong ? (tpPrice - entry) : (entry - tpPrice);
    const pPnl   = (diff / entry) * closed;
    totalPnl += pPnl; weightedRR += (diff/slDist)*closed; totalWeight += closed;
    remainingSize -= closed;
    const resEl = document.getElementById('tp'+n+'-residuo');
    if (resEl) resEl.textContent = '(residuo: $' + remainingSize.toFixed(2) + ')';
    const prevEl = document.getElementById('tp'+n+'-preview');
    if (prevEl) prevEl.innerHTML = `<span style="color:${pPnl>=0?'var(--win)':'var(--loss)'};font-weight:600">${pPnl>=0?'+':''}$${pPnl.toFixed(2)}</span><br>Chiudi $${closed.toFixed(2)}`;
  }

  document.getElementById('jf-residuo-label').textContent = remainingSize < size ? '(residuo: $'+remainingSize.toFixed(2)+')' : '';

  if (!isNaN(exit) && remainingSize > 0) {
    const diff  = isLong ? (exit - entry) : (entry - exit);
    const fPnl  = (diff / entry) * remainingSize;
    totalPnl += fPnl; weightedRR += (diff/slDist)*remainingSize; totalWeight += remainingSize;
    const ep = document.getElementById('exit-preview');
    if (ep) ep.innerHTML = `<span style="color:${fPnl>=0?'var(--win)':'var(--loss)'};font-weight:600">${fPnl>=0?'+':''}$${fPnl.toFixed(2)}</span><br>Chiudi $${remainingSize.toFixed(2)}`;
  } else if (remainingSize > 0) { hasEnoughData = false; }

  if (!hasEnoughData && totalWeight === 0) return;
  const avgRR = totalWeight > 0 ? weightedRR / totalWeight : 0;
  const slHit = isLong ? (!isNaN(exit) && exit <= sl) : (!isNaN(exit) && exit >= sl);
  const outcome = slHit ? 'loss' : (Math.abs(totalPnl) < size*0.001 ? 'be' : (totalPnl > 0 ? 'win' : 'loss'));

  document.getElementById('jf-calc-row').style.display = 'block';
  const pnlEl = document.getElementById('jf-calc-pnl');
  pnlEl.textContent = (totalPnl>=0?'+':'−')+'$'+Math.abs(totalPnl).toFixed(2);
  pnlEl.style.color = totalPnl >= 0 ? 'var(--win)' : 'var(--loss)';
  document.getElementById('jf-calc-rr').textContent = avgRR.toFixed(2)+':1';
  const outEl = document.getElementById('jf-calc-outcome');
  outEl.textContent = outcome==='win'?'✅ Win':outcome==='loss'?'❌ Loss':'➖ Break Even';
  outEl.style.color = outcome==='win'?'var(--win)':outcome==='loss'?'var(--loss)':'var(--accent)';
};

window.openJournal = async function() {
  if (!currentUser) return;
  const today = new Date().toISOString().split('T')[0];
  const df = document.getElementById('jf-date');
  if (df && !df.value) df.value = today;
  if (unsubJournal) unsubJournal();
  unsubJournal = onSnapshot(doc(db, 'journals', currentUser.uid), snap => {
    journalEntries = snap.exists() ? (snap.data().entries || []) : [];
    renderJournal();
  });
  document.getElementById('journal-overlay').classList.remove('hidden');
};

window.closeJournal = function() {
  if (unsubJournal) { unsubJournal(); unsubJournal = null; }
  document.getElementById('journal-overlay').classList.add('hidden');
};

window.saveJournalEntry = async function() {
  if (!currentUser) return;
  const btn = document.querySelector('.jbtn-save');
  btn.disabled = true; btn.textContent = 'Salvataggio...';

  const date   = document.getElementById('jf-date').value;
  const symbol = document.getElementById('jf-symbol').value.trim().toUpperCase();
  const dir    = document.getElementById('jf-dir').value;
  const entryP = parseFloat(document.getElementById('jf-entry').value);
  const slP    = parseFloat(document.getElementById('jf-sl').value);
  const size   = parseFloat(document.getElementById('jf-size').value);
  const exitP  = parseFloat(document.getElementById('jf-exit').value);
  const setup  = document.getElementById('jf-setup').value.trim();
  const tf     = document.getElementById('jf-tf').value;
  const notes  = document.getElementById('jf-notes').value.trim();
  const isLong = dir === 'long';

  if (!symbol) { alert('Inserisci il Pair.'); btn.disabled=false; btn.textContent='+ Aggiungi al Journal'; return; }
  if (isNaN(entryP)||isNaN(slP)||isNaN(size)||size<=0) { alert('Inserisci Entry, SL e Size.'); btn.disabled=false; btn.textContent='+ Aggiungi al Journal'; return; }
  if (isNaN(exitP)) { alert('Inserisci il prezzo di uscita finale.'); btn.disabled=false; btn.textContent='+ Aggiungi al Journal'; return; }

  const slDist = Math.abs(entryP - slP);
  let totalPnl = 0, weightedRR = 0, totalWeight = 0, remainingSize = size;
  const tps = [];

  for (let i = 0; i < 3; i++) {
    if (!tpEnabled[i]) break;
    const n = i+1;
    const tpPrice = parseFloat(document.getElementById('jf-tp'+n+'-price').value);
    const tpPct   = parseFloat(document.getElementById('jf-tp'+n+'-pct').value);
    if (isNaN(tpPrice)||isNaN(tpPct)||tpPct<=0) { alert('Compila prezzo e % per TP'+n+'.'); btn.disabled=false; btn.textContent='+ Aggiungi al Journal'; return; }
    const closed = remainingSize * (tpPct/100);
    const diff   = isLong ? (tpPrice-entryP) : (entryP-tpPrice);
    const pPnl   = (diff/entryP)*closed;
    totalPnl += pPnl; weightedRR += (diff/slDist)*closed; totalWeight += closed;
    tps.push({ price:tpPrice, pct:tpPct, closedSize:parseFloat(closed.toFixed(4)), pnl:parseFloat(pPnl.toFixed(4)) });
    remainingSize -= closed;
  }

  const finalDiff = isLong ? (exitP-entryP) : (entryP-exitP);
  const finalPnl  = (finalDiff/entryP)*remainingSize;
  totalPnl += finalPnl; weightedRR += (finalDiff/slDist)*remainingSize; totalWeight += remainingSize;

  const avgRR  = totalWeight>0 ? parseFloat((weightedRR/totalWeight).toFixed(2)) : null;
  const slHit  = isLong ? exitP<=slP : exitP>=slP;
  const outcome = slHit ? 'loss' : (Math.abs(totalPnl)<size*0.001 ? 'be' : (totalPnl>0 ? 'win' : 'loss'));

  const entryId = Date.now();
  // Carica screenshot su Firebase Storage
  const screenshotUrl = await uploadScreenshot(entryId);

  const entryObj = {
    id:entryId, date:date||new Date().toISOString().split('T')[0],
    symbol, dir, outcome, pnl:parseFloat(totalPnl.toFixed(2)), rr:avgRR,
    setup, tf, notes, entryPrice:entryP, slPrice:slP, exitPrice:exitP, size, tps, pnlIsR:false,
    mood:document.getElementById('jf-mood')?.value||'', screenshot:screenshotUrl
  };
  await setDoc(doc(db,'journals',currentUser.uid), { entries:[entryObj,...journalEntries] });

  ['jf-symbol','jf-entry','jf-sl','jf-size','jf-exit','jf-setup','jf-notes',
   'jf-tp1-price','jf-tp1-pct','jf-tp2-price','jf-tp2-pct','jf-tp3-price','jf-tp3-pct']
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('jf-dir').value='long'; document.getElementById('jf-tf').value='';
  document.getElementById('jf-calc-row').style.display='none';
  tpEnabled=[false,false,false];
  [1,2,3].forEach(n => {
    document.getElementById('toggle-tp'+n).classList.remove('active');
    document.getElementById('toggle-tp'+n).textContent='+ TP'+n;
    document.getElementById('tp-block-'+n).style.display='none';
  });
  document.getElementById('toggle-tp2').disabled=true;
  document.getElementById('jf-mood').value=''; screenshotB64=''; screenshotFile=null;
  document.querySelectorAll('#journal-overlay .mood-btn').forEach(b=>b.classList.remove('active'));
  const sp=document.getElementById('screenshot-preview'); if(sp){sp.style.display='none';sp.src='';}
  const sz=document.getElementById('screenshot-zone'); if(sz) sz.classList.remove('has-img');
  document.getElementById('toggle-tp3').disabled=true;
  btn.disabled=false; btn.textContent='+ Aggiungi al Journal';
};

window.deleteJournalEntry = async function(id) {
  if (!currentUser) return;
  if (!confirm('Eliminare questo trade dal journal?')) return;
  await setDoc(doc(db,'journals',currentUser.uid), { entries:journalEntries.filter(e=>e.id!==id) });
};

// ── EDIT JOURNAL ENTRY ──
window.editJournalEntry = function(id) {
  const e = journalEntries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('ej-id').value = id;
  document.getElementById('ej-date').value = e.date || '';
  document.getElementById('ej-symbol').value = e.symbol || '';
  document.getElementById('ej-dir').value = e.dir || 'long';
  document.getElementById('ej-entry').value = e.entryPrice ?? '';
  document.getElementById('ej-sl').value = e.slPrice ?? '';
  document.getElementById('ej-exit').value = e.exitPrice ?? '';
  document.getElementById('ej-size').value = e.size ?? '';
  document.getElementById('ej-pnl').value = e.pnl ?? '';
  document.getElementById('ej-outcome').value = e.outcome || 'win';
  document.getElementById('ej-setup').value = e.setup || '';
  document.getElementById('ej-tf').value = e.tf || '';
  document.getElementById('ej-mood').value = e.mood || '';
  document.getElementById('ej-notes').value = e.notes || '';
  document.getElementById('ej-msg').textContent = '';
  const overlay = document.getElementById('journal-edit-overlay');
  overlay.style.display = 'flex';
};

window.closeEditJournal = function() {
  document.getElementById('journal-edit-overlay').style.display = 'none';
};

window.saveEditJournal = async function() {
  if (!currentUser) return;
  const id = parseInt(document.getElementById('ej-id').value);
  const msg = document.getElementById('ej-msg');
  msg.textContent = 'Salvataggio...'; msg.style.color = 'var(--text-muted)';

  const pnl = parseFloat(document.getElementById('ej-pnl').value);
  const outcome = document.getElementById('ej-outcome').value;

  const updated = journalEntries.map(e => {
    if (e.id !== id) return e;
    return {
      ...e,
      date:       document.getElementById('ej-date').value || e.date,
      symbol:     document.getElementById('ej-symbol').value.trim().toUpperCase() || e.symbol,
      dir:        document.getElementById('ej-dir').value,
      entryPrice: parseFloat(document.getElementById('ej-entry').value) || e.entryPrice,
      slPrice:    parseFloat(document.getElementById('ej-sl').value) || e.slPrice,
      exitPrice:  parseFloat(document.getElementById('ej-exit').value) || e.exitPrice,
      size:       parseFloat(document.getElementById('ej-size').value) || e.size,
      pnl:        isNaN(pnl) ? e.pnl : pnl,
      outcome:    outcome,
      setup:      document.getElementById('ej-setup').value.trim(),
      tf:         document.getElementById('ej-tf').value,
      mood:       document.getElementById('ej-mood').value,
      notes:      document.getElementById('ej-notes').value.trim(),
    };
  });

  try {
    await setDoc(doc(db,'journals',currentUser.uid), { entries: updated });
    msg.textContent = '✓ Salvato!'; msg.style.color = 'var(--win)';
    setTimeout(() => closeEditJournal(), 800);
  } catch(err) {
    msg.textContent = 'Errore: ' + err.message; msg.style.color = 'var(--loss)';
  }
};

// ── RESET JOURNAL ──
window.confirmResetJournal = async function() {
  if (!currentUser) return;
  if (!confirm('Sei sicuro? Tutti i trade del journal verranno eliminati definitivamente.')) return;
  await setDoc(doc(db,'journals',currentUser.uid), { entries: [] });
};

// ── IMPORTA DA BITGET → JOURNAL ──
// ── Fetch paginato di tutti i fills Bitget ──
// Prima chiamata: ultimi 90 giorni. Chiamate successive: solo dall'ultimo timestamp importato.
async function fetchAllBitgetFills(sinceTimestamp = null) {
  const allFills = [];
  const LIMIT = 100;
  // startTime: se sinceTimestamp è noto partiamo da lì, altrimenti 90 giorni fa
  const startTime = sinceTimestamp
    ? String(sinceTimestamp + 1)
    : String(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let endTime = String(Date.now());
  let page = 0;
  const MAX_PAGES = 50; // sicurezza: max 5000 fill

  while (page < MAX_PAGES) {
    let data;
    try {
      data = await bitgetFuturesRequest('/api/v2/mix/order/fills', {
        productType: 'USDT-FUTURES',
        limit: String(LIMIT),
        startTime,
        endTime
      });
    } catch(e) {
      console.warn('fetchAllBitgetFills page', page, 'error:', e.message);
      break;
    }

    const fills = data.data?.fillList || data.data?.orderList || data.data || [];
    if (!Array.isArray(fills) || fills.length === 0) break;

    allFills.push(...fills);

    // Se abbiamo ricevuto meno del limite siamo arrivati alla fine
    if (fills.length < LIMIT) break;

    // Pagina successiva: endTime = timestamp del fill più vecchio ricevuto - 1
    const timestamps = fills.map(f => parseInt(f.cTime || f.createTime || f.updateTime || 0)).filter(Boolean);
    if (timestamps.length === 0) break;
    const oldest = Math.min(...timestamps);
    if (oldest <= parseInt(startTime)) break;
    endTime = String(oldest - 1);
    page++;
  }

  return allFills;
}

window.importBitgetToJournal = async function() {
  if (!currentUser) { alert('Utente non autenticato.'); return; }
  const { apiKey, secret } = loadBitgetKeys();
  if (!apiKey || !secret) { alert('API Bitget non configurate. Configurale nel profilo prima.'); return; }

  const btn = document.getElementById('jbtn-bitget-import');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Importazione...'; }

  try {
    // Trova il timestamp dell'ultimo fill già importato — per fetch incrementale
    const importedEntries = journalEntries.filter(e => e.bitgetOrderId && e.lastFillTs);
    const lastTs = importedEntries.length > 0
      ? Math.max(...importedEntries.map(e => e.lastFillTs))
      : null; // null = prima volta → scarica 90 giorni

    if (btn) btn.textContent = lastTs
      ? '⏳ Aggiornamento...'
      : '⏳ Prima importazione (90gg)...';

    const orders = await fetchAllBitgetFills(lastTs);

    // ID già importati nel journal
    const importedJournalIds = new Set(journalEntries.map(e => e.bitgetOrderId).filter(Boolean));

    // Filtra solo chiusure non già importate
    const closeFills = orders.filter(o => {
      const tradeSide = o.tradeSide || o.side || '';
      const isClose = tradeSide.startsWith('close') || tradeSide === 'sell';
      if (!isClose) return false;
      const orderId = String(o.orderId || o.fillId || '');
      return orderId && !importedJournalIds.has(orderId);
    });

    // Raggruppa per orderId
    const orderMap = new Map();
    for (const o of closeFills) {
      const orderId = String(o.orderId || o.fillId || '');
      if (!orderMap.has(orderId)) orderMap.set(orderId, []);
      orderMap.get(orderId).push(o);
    }

    if (orderMap.size === 0) {
      alert('Nessun nuovo trade da importare.');
      return;
    }

    const newEntries = [];
    for (const [orderId, fills] of orderMap) {
      const first = fills[0];
      const totalPnl = fills.reduce((s, o) => s + parseFloat(o.profit || o.pnl || o.realizedPnl || 0), 0);
      const sym = (first.symbol || '').replace('_UMCBL','').replace('_DMCBL','').replace('USDT','') || '?';
      const tradeSide = first.tradeSide || first.side || '';
      const dir = (tradeSide === 'close_short') ? 'short' : 'long';
      const ts = parseInt(first.cTime || first.createTime || first.updateTime || Date.now());
      const dateStr = new Date(ts).toISOString().split('T')[0];
      const entryPrice = parseFloat(first.price || first.fillPrice || first.avgEntryPrice || 0) || null;
      const size = parseFloat(first.baseVolume || first.size || first.vol || 0) || null;
      const outcome = totalPnl > 0 ? 'win' : totalPnl < 0 ? 'loss' : 'be';

      newEntries.push({
        id: Date.now() + Math.random(),
        date: dateStr,
        symbol: sym,
        dir,
        outcome,
        pnl: parseFloat(totalPnl.toFixed(2)),
        rr: null,
        entryPrice,
        slPrice: null,
        exitPrice: null,
        size,
        tps: [],
        setup: '',
        tf: '',
        notes: '',
        mood: '',
        screenshot: null,
        pnlIsR: false,
        bitgetOrderId: orderId,
        lastFillTs: ts, // salviamo il timestamp per il prossimo fetch incrementale
        source: 'bitget'
      });
    }

    // Ordina i nuovi per data crescente prima di metterli in cima
    newEntries.sort((a, b) => a.lastFillTs - b.lastFillTs);

    // Salva — nuovi in cima
    await setDoc(doc(db,'journals',currentUser.uid), { entries: [...newEntries, ...journalEntries] });
    alert(`✓ Importati ${newEntries.length} trade da Bitget nel journal.`);

  } catch(e) {
    alert('Errore importazione: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Importa Bitget'; }
  }
};

function fmtPnl(n) {
  return (n>=0?'+':'−')+'$'+Math.abs(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function drawPieChart(wins, losses, bes) {
  const canvas = document.getElementById('journal-pie'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const total = wins+losses+bes;
  ctx.clearRect(0,0,100,100);
  if (total===0) {
    ctx.beginPath(); ctx.arc(50,50,40,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fill();
    document.getElementById('journal-pie-legend').textContent='Nessun dato'; return;
  }
  const slices=[{val:wins,color:'#3d9e60'},{val:losses,color:'#e05a2b'},{val:bes,color:'#5b8cf7'}].filter(s=>s.val>0);
  let a=-Math.PI/2;
  slices.forEach(s=>{ const ang=(s.val/total)*Math.PI*2; ctx.beginPath(); ctx.moveTo(50,50); ctx.arc(50,50,42,a,a+ang); ctx.closePath(); ctx.fillStyle=s.color; ctx.fill(); a+=ang; });
  ctx.beginPath(); ctx.arc(50,50,24,0,Math.PI*2); ctx.fillStyle='#181818'; ctx.fill();
  ctx.fillStyle='#f0ede8'; ctx.font='bold 13px Syne,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(Math.round(wins/total*100)+'%',50,50);
  const leg=[`✅ ${wins}W`,`❌ ${losses}L`]; if(bes>0) leg.push(`➖ ${bes}BE`);
  document.getElementById('journal-pie-legend').textContent=leg.join('  ');
}

function renderJournal() {
  const entries=journalEntries, total=entries.length;
  const wins=entries.filter(e=>e.outcome==='win').length;
  const losses=entries.filter(e=>e.outcome==='loss').length;
  const bes=entries.filter(e=>e.outcome==='be').length;
  const totalPnl=entries.reduce((a,e)=>a+e.pnl,0);
  const best=total>0?Math.max(...entries.map(e=>e.pnl)):null;
  const rrVals=entries.filter(e=>e.rr&&e.rr>0).map(e=>e.rr);
  const avgRR=rrVals.length>0?(rrVals.reduce((a,b)=>a+b,0)/rrVals.length).toFixed(2):null;
  const wrPct=total>0?Math.round(wins/total*100):null;

  document.getElementById('jst-total').textContent=total;
  const wrEl=document.getElementById('jst-wr');
  wrEl.textContent=wrPct!==null?wrPct+'%':'—';
  wrEl.className='jval '+(wrPct!==null?(wrPct>=50?'pos':'neg'):'neutral');
  const pnlEl=document.getElementById('jst-pnl');
  pnlEl.textContent=total>0?fmtPnl(totalPnl):'$0';
  pnlEl.className='jval '+(totalPnl>=0?'pos':'neg');
  document.getElementById('jst-best').textContent=best!==null?fmtPnl(best):'—';
  document.getElementById('jst-rr').textContent=avgRR?avgRR+':1':'—';
  drawPieChart(wins,losses,bes);
  renderJournalAdvStats(entries);

  const setupMap={};
  entries.forEach(e=>{ if(!e.setup) return; if(!setupMap[e.setup]) setupMap[e.setup]={wins:0,total:0,pnl:0}; setupMap[e.setup].total++; if(e.outcome==='win') setupMap[e.setup].wins++; setupMap[e.setup].pnl+=e.pnl; });
  const setups=Object.entries(setupMap).sort((a,b)=>b[1].pnl-a[1].pnl);
  const lbEl=document.getElementById('journal-setup-lb');
  lbEl.innerHTML=setups.length===0?'<div class="empty" style="padding:1rem">Aggiungi trade con un setup per vedere la classifica.</div>':setups.map(([name,s],i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1);
    const wr=Math.round(s.wins/s.total*100); const pc=s.pnl>=0?'var(--win)':'var(--loss)';
    return `<div style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:14px;text-align:center">${medal}</span><span style="font-size:13px;font-weight:500">${name}</span><span style="font-size:11px;color:var(--text-muted)">${s.total} trade · ${wr}% WR</span><span style="font-family:var(--display);font-weight:700;font-size:14px;color:${pc}">${fmtPnl(s.pnl)}</span></div>`;
  }).join('');

  const tbody=document.getElementById('journal-tbody'); const emptyMsg=document.getElementById('journal-empty');
  if(!entries.length){ tbody.innerHTML=''; emptyMsg.style.display='block'; return; }
  emptyMsg.style.display='none';
  tbody.innerHTML=entries.map((e,i)=>{
    const dl=e.dir==='long'?'Long':'Short'; const dc=e.dir==='long'?'long':'short';
    const ol=e.outcome==='win'?'Win':e.outcome==='loss'?'Loss':'BE';
    const nt=e.notes?(e.notes.length>35?e.notes.substring(0,35)+'…':e.notes):'—';
    const tpB=e.tps&&e.tps.length>0?e.tps.map((_,ti)=>`<span style="font-size:9px;padding:1px 5px;border-radius:2px;background:var(--phase2-bg);color:var(--phase2);margin-left:3px">TP${ti+1}</span>`).join(''):'';
    return `<tr><td style="color:var(--text-dim);font-size:11px">${entries.length-i}</td><td style="color:var(--text-muted);white-space:nowrap">${e.date}</td><td style="font-weight:500">${e.symbol}${tpB}</td><td><span class="jt-dir ${dc}">${dl}</span></td><td><span class="jt-outcome ${e.outcome}">${ol}</span></td><td><span class="jt-pnl ${e.pnl>=0?'pos':'neg'}">${fmtPnl(e.pnl)}</span></td><td style="color:var(--text-muted)">${e.rr?e.rr+':1':'—'}</td><td style="color:var(--text-muted);font-size:11px;white-space:nowrap">${e.entryPrice??'—'} / ${e.exitPrice??'—'}</td><td style="color:var(--text-muted);font-size:12px">${e.setup||'—'}</td><td style="color:var(--text-muted);font-size:11px">${e.tf||'—'}</td><td style="color:var(--text-muted);font-size:11px;max-width:120px" title="${e.notes||''}">${nt}</td><td>${e.screenshot?`<img src="${e.screenshot}" style="width:48px;height:36px;object-fit:cover;border-radius:3px;cursor:pointer" onclick="showScreenshotModal(\`${e.screenshot}\`)" title="Vedi screenshot"/>`:'—'}</td><td style="display:flex;gap:4px"><button class="jt-del" onclick="editJournalEntry(${e.id})" title="Modifica" style="background:var(--accent-bg);border-color:var(--accent-border);color:var(--accent)">✎</button><button class="jt-del" onclick="deleteJournalEntry(${e.id})" title="Elimina">✕</button></td></tr>`;
  }).join('');
}


// ── MOOD HELPERS ──
let currentChMood = '';
window.selectMood = function(btn) {
  document.querySelectorAll('#journal-overlay .mood-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('jf-mood').value = btn.dataset.mood;
};
window.selectChMood = function(btn) {
  document.querySelectorAll('#ch-mood-row .mood-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentChMood = btn.dataset.mood;
  document.getElementById('ch-mood').value = currentChMood;
};

// ── SCREENSHOT HANDLER ──
let screenshotFile = null;
let screenshotB64 = ''; // preview locale
window.handleScreenshot = function(input) {
  const file = input.files[0]; if (!file) return;
  screenshotFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    screenshotB64 = e.target.result;
    const preview = document.getElementById('screenshot-preview');
    preview.src = screenshotB64; preview.style.display = 'block';
    document.getElementById('screenshot-zone').classList.add('has-img');
  };
  reader.readAsDataURL(file);
};

async function uploadScreenshot(entryId) {
  if (!screenshotFile || !storage || !currentUser) return '';
  try {
    const ext = screenshotFile.name.split('.').pop();
    const storageRef = ref(storage, `screenshots/${currentUser.uid}/${entryId}.${ext}`);
    await uploadBytes(storageRef, screenshotFile);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch(e) {
    console.warn('Screenshot upload failed:', e);
    return '';
  }
}

// ── EQUITY CURVE ──
function drawEquityCurve(trades) {
  const canvas = document.getElementById('equity-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 700; const H = 140;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const points = [100];
  trades.forEach(t => points.push(t.capAfter));
  if (points.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#444'; ctx.font = '12px DM Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText('Aggiungi trade per vedere la curva', W/2, H/2);
    return;
  }
  const min = Math.min(...points)*0.97, max = Math.max(...points)*1.03;
  const xS = W/(points.length-1), yS = (H-24)/(max-min);
  const toX = i => i*xS, toY = v => H-12-(v-min)*yS;

  // gradient fill
  const grad = ctx.createLinearGradient(0,0,0,H);
  const lastVal = points[points.length-1];
  const col = lastVal >= 100 ? '61,158,96' : '224,90,43';
  grad.addColorStop(0, `rgba(${col},0.3)`);
  grad.addColorStop(1, `rgba(${col},0)`);
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0]));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(i), toY(points[i]));
  ctx.lineTo(toX(points.length-1), H); ctx.lineTo(toX(0), H);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0]));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(i), toY(points[i]));
  ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 2; ctx.stroke();

  // start/end labels
  ctx.fillStyle = '#888'; ctx.font = '10px DM Mono,monospace'; ctx.textAlign = 'left';
  ctx.fillText('$'+points[0].toFixed(0), 4, 14);
  ctx.textAlign = 'right';
  const lc = lastVal >= 100 ? '#3d9e60' : '#e05a2b';
  ctx.fillStyle = lc;
  ctx.fillText('$'+lastVal.toFixed(2), W-4, 14);
}

// ── ADVANCED STATS CALCULATOR ──
function calcAdvStats(trades) {
  const wins = trades.filter(t => t.outcome==='win');
  const losses = trades.filter(t => t.outcome==='loss');
  const totalWin = wins.reduce((a,t)=>a+t.pnl,0);
  const totalLoss = Math.abs(losses.reduce((a,t)=>a+t.pnl,0));
  const pf = totalLoss > 0 ? (totalWin/totalLoss).toFixed(2) : wins.length > 0 ? '∞' : '—';
  const avgWin = wins.length > 0 ? (totalWin/wins.length).toFixed(2) : null;
  const avgLoss = losses.length > 0 ? (totalLoss/losses.length).toFixed(2) : null;
  const exp = avgWin && avgLoss && trades.length > 0 ?
    ((wins.length/trades.length)*parseFloat(avgWin) - (losses.length/trades.length)*parseFloat(avgLoss)).toFixed(2) : null;
  // streaks
  let maxWs=0,maxLs=0,ws=0,ls=0;
  trades.forEach(t => {
    if(t.outcome==='win'){ws++;ls=0;if(ws>maxWs)maxWs=ws;}
    else if(t.outcome==='loss'){ls++;ws=0;if(ls>maxLs)maxLs=ls;}
  });
  // today count
  const today = new Date().toISOString().split('T')[0];
  const todayCount = trades.filter(t => (t.date||'').startsWith(today) || (t.date||'').includes(new Date().toLocaleDateString('it-IT').split('/').reverse().join('-').slice(-5))).length;
  // max drawdown for challenge trades
  let peak=100, mdd=0;
  const caps = trades.map(t=>t.capAfter);
  if(caps.length>0) caps.forEach(c=>{ if(c>peak) peak=c; const dd=peak>0?(peak-c)/peak*100:0; if(dd>mdd) mdd=dd; });
  // avg rr wins (journal)
  const rrWins = wins.filter(t=>t.rr&&t.rr>0).map(t=>t.rr);
  const avgRRWin = rrWins.length > 0 ? (rrWins.reduce((a,b)=>a+b,0)/rrWins.length).toFixed(2) : null;
  return {pf, avgWin, avgLoss, maxWs, maxLs, exp, todayCount, mdd: mdd>0?mdd.toFixed(1):null, avgRRWin};
}

function updateChStats(trades) {
  const s = calcAdvStats(trades);
  const set = (id,val,cls) => { const el=document.getElementById(id); if(el){el.textContent=val||'—'; if(cls) el.className='av '+cls;} };
  set('ch-pf', s.pf, s.pf!=='—'&&parseFloat(s.pf)>1?'pos':'neg');
  set('ch-avgwin', s.avgWin?'+$'+s.avgWin:'—', 'pos');
  set('ch-avgloss', s.avgLoss?'-$'+s.avgLoss:'—', 'neg');
  set('ch-wstreak', s.maxWs||'0', 'pos');
  set('ch-lstreak', s.maxLs||'0', 'neg');
  set('ch-exp', s.exp?(parseFloat(s.exp)>=0?'+$'+s.exp:'-$'+Math.abs(s.exp)):'—', s.exp&&parseFloat(s.exp)>=0?'pos':'neg');
  set('ch-today', s.todayCount, 'neutral');
  set('ch-mdd', s.mdd?s.mdd+'%':'—', 'neg');
  // alerts
  const ot = document.getElementById('alert-overtrading');
  if(ot) ot.classList.toggle('visible', s.todayCount > 5);
  // milestones
  const cap = trades.length>0 ? trades[trades.length-1].capAfter : 100;
  ['ms-500','ms-2k','ms-10k','ms-40k','ms-100k'].forEach((id,i)=>{
    const targets=[500,2000,10000,40000,100000];
    const el=document.getElementById(id); if(el) el.classList.toggle('achieved', cap>=targets[i]);
  });
  // 🎉 100k celebration
  if (cap >= 100000 && !document.getElementById('challenge-complete-overlay')) {
    launchCelebration();
  }
  // 💀 Challenge persa (capitale a 0)
  if (cap <= 0 && trades.length > 0 && !document.getElementById('challenge-lost-overlay')) {
    launchLoss();
  }
}

// ── MOOD ANALYSIS (journal) ──
function renderMoodAnalysis(entries) {
  const tbody = document.getElementById('mood-analysis-tbody'); if (!tbody) return;
  const moods = { sicuro:'🟢 Sicuro', neutro:'⚪ Neutro', in_dubbio:'🟡 In dubbio', emotivo:'🔴 Emotivo' };
  const map = {};
  entries.forEach(e => {
    const m = e.mood||''; if(!m) return;
    if(!map[m]) map[m]={total:0,wins:0,pnl:0,rr:[]};
    map[m].total++; if(e.outcome==='win') map[m].wins++;
    map[m].pnl+=e.pnl; if(e.rr) map[m].rr.push(e.rr);
  });
  const rows = Object.entries(map);
  if(!rows.length){tbody.innerHTML='<tr><td colspan="5" style="color:var(--text-dim);font-size:11px;padding:1rem">Aggiungi trade con stato mentale per vedere l&#39;analisi.</td></tr>';return;}
  tbody.innerHTML = rows.map(([m,s])=>{
    const wr = Math.round(s.wins/s.total*100);
    const pnlCol = s.pnl>=0?'var(--win)':'var(--loss)';
    const avgRR = s.rr.length>0?(s.rr.reduce((a,b)=>a+b,0)/s.rr.length).toFixed(2):'-';
    return `<tr><td>${moods[m]||m}</td><td>${s.total}</td><td style="color:${wr>=50?'var(--win)':'var(--loss)'}">${wr}%</td><td style="color:${pnlCol}">${s.pnl>=0?'+':''}$${Math.abs(s.pnl).toFixed(2)}</td><td style="color:var(--accent)">${avgRR}:1</td></tr>`;
  }).join('');
}

// ── LEADERBOARD TABS ──
let lbMode = 'capitale';
let lbAllEntries = [];
window.switchLbTab = function(mode, btn) {
  lbMode = mode;
  document.querySelectorAll('.lb-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderLeaderboardByMode(lbAllEntries, currentState?.username);
};
function renderLeaderboardByMode(entries, myUsername) {
  lbAllEntries = entries;
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  if (!entries.length) { list.innerHTML = '<div class="empty">Nessun trader ancora.</div>'; return; }
  let sorted;
  if (lbMode === 'capitale') sorted = [...entries].sort((a,b)=>b.capital-a.capital);
  else if (lbMode === 'winrate') sorted = [...entries].filter(e=>e.trades&&e.trades.length>=3).sort((a,b)=>{
    const wrA=a.trades.filter(t=>t.outcome==='win').length/a.trades.length;
    const wrB=b.trades.filter(t=>t.outcome==='win').length/b.trades.length;
    return wrB-wrA;
  });
  else if (lbMode === 'disciplina') sorted = [...entries].sort((a,b)=>{
    const lsA=a.consecutiveLoss||0, lsB=b.consecutiveLoss||0;
    return lsA-lsB;
  });
  else if (lbMode === 'streak') sorted = [...entries].sort((a,b)=>{
    const lsA=a.consecutiveLoss||0, lsB=b.consecutiveLoss||0;
    return lsB-lsA;
  });
  const phase = getPhase; const fmt2=fmt;
  const phaseColors=['','var(--phase1)','var(--phase2)','var(--phase3)','var(--phase4)','var(--phase5)'];
  const phaseBgs=['','var(--phase1-bg)','var(--phase2-bg)','var(--phase3-bg)','var(--phase4-bg)','var(--phase5-bg)'];
  list.innerHTML = sorted.map((e,i)=>{
    const rank=i+1;
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'#'+rank;
    const isMe=e.username===myUsername;
    const ph=getPhase(e.capital);
    let extra='';
    if(lbMode==='winrate'&&e.trades&&e.trades.length>0){
      const wr=Math.round(e.trades.filter(t=>t.outcome==='win').length/e.trades.length*100);
      extra=`<span style="font-size:12px;color:${wr>=50?'var(--win)':'var(--loss)'}">${wr}% WR</span>`;
    } else if(lbMode==='disciplina'||lbMode==='streak'){
      extra=`<span style="font-size:12px;color:var(--loss)">${e.consecutiveLoss||0} loss</span>`;
    } else {
      extra=`<span style="font-family:var(--display);font-weight:700;font-size:14px">${fmt2(e.capital)}</span>`;
    }
    return '<div style="display:grid;grid-template-columns:36px 1fr auto auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<span style="font-size:15px;text-align:center">'+medal+'</span>'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +(e.avatarUrl?`<img src="${e.avatarUrl}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid var(--border-hover);flex-shrink:0" onerror="this.style.display='none'"/>`:'<span style="width:26px;height:26px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">👤</span>')
      +'<a href="?u='+encodeURIComponent(e.username)+'" target="_blank" style="font-size:13px;font-weight:500;color:'+(isMe?'var(--accent)':'var(--text)')+';text-decoration:none;">'+e.username+(isMe?' (tu)':'')+'</a>'
      +'</div>'
      +'<span style="font-size:10px;padding:2px 8px;border-radius:3px;background:'+phaseBgs[ph]+';color:'+phaseColors[ph]+';text-transform:uppercase;letter-spacing:0.06em">F'+ph+'</span>'
      +extra+'</div>';
  }).join('');
}

// ── COOLDOWN CHECK ──
function checkCooldown(state) {
  const banner = document.getElementById('cooldown-banner'); if(!banner) return;
  banner.classList.toggle('visible', state.consecutiveLoss === 2);
}

// ── PDF EXPORT ──
window.exportJournalPDF = function() {
  if (!journalEntries.length) { alert('Nessun trade da esportare.'); return; }
  const wins=journalEntries.filter(e=>e.outcome==='win').length;
  const total=journalEntries.length;
  const totalPnl=journalEntries.reduce((a,e)=>a+e.pnl,0);
  const wr=Math.round(wins/total*100);
  const s=calcAdvStats(journalEntries);
  const now=new Date().toLocaleDateString('it-IT');
  const moodLabels={sicuro:'🟢 Sicuro',neutro:'⚪ Neutro',in_dubbio:'🟡 In dubbio',emotivo:'🔴 Emotivo'};
  const rows = journalEntries.map((e,i)=>`
    <tr class="${e.pnl>=0?'win-row':'loss-row'}">
      <td>${total-i}</td><td>${e.date||''}</td><td><b>${e.symbol}</b></td>
      <td>${e.dir==='long'?'Long':'Short'}</td>
      <td>${e.outcome==='win'?'Win':e.outcome==='loss'?'Loss':'BE'}</td>
      <td style="color:${e.pnl>=0?'#3d9e60':'#e05a2b'};font-weight:600">${e.pnl>=0?'+':'-'}$${Math.abs(e.pnl).toFixed(2)}</td>
      <td>${e.rr?e.rr+':1':'—'}</td>
      <td>${e.setup||'—'}</td>
      <td>${e.tf||'—'}</td>
      <td>${moodLabels[e.mood]||'—'}</td>
      <td style="font-size:11px;color:#666">${(e.notes||'').substring(0,50)}</td>
      <td>${e.screenshot?`<img src="${e.screenshot}" style="width:60px;height:45px;object-fit:cover;border-radius:3px"/>`:''}</td>
    </tr>`).join('');
  const logoSrc = 'data:image/webp;base64,UklGRkAMAABXRUJQVlA4IDQMAACwWwCdASqQAZABPlEokkajoqGhIrSoaHAKCWdu4T7f+ubgfdmHNFjcKz4TZe+/lz0lvF3hXKi/Ffz7/Tf338sfnd6K/MA/gn84/VvrM+YD9qv2q9+z0qf2b1AP4z/ef///+e0O9ADyxv2o/9/yh/2L/ffuj7Xn//9gD//8E76L9Nd7JuQ4R7OZXcVFkXy/OSoeZ8HBCkK3x5XoaSOFHpXDDAv/o0eWC3SBxLWT4Eca/xJHCkC3bQ9LEm0oyZn9k2scKPQGo6T3E+wlbtwJGYca9zRvPLi2f9SLvzl59rtQTgmnMsY8zdJhf9821rg00kPNpLMz9ho56PJH2YR6lnN+ltEYMZ4FPBC+/ScTG0Ohm9G7/vzJ02vIBF0TxGI0ui9ilzLGNML49hP2H2Ju5yFr+lXKcKYJ5XCMZluxj9zf5/Bx8Nwq69/NKJ3baxhSt+2iaAJfDoHLu1oQLiRGFdBrWITe6DKHaL+ntwyfKDjwo0EBqPQUxYx5QRMvG+vsB+i6gPSlyKs5wdyrSJmB4VVoTV6PykdFymrcEpVxQTdsgW40XKHd7I9B5WWcipmqefRxrBNOR2qjoho8augsEd4EQTMZ7+lZbN4PsFcmmA/mitkNCV88i+0eHYhgMRkzWpqIT3kgqHpJJTjUcqoKCsP6SBbi3zZFLo5+kHM4zzYcwcC9JixExyoRjhW+wK5RE0tzP0dUJTjyetQqoZo3RV2tLl2b74+1zHzBeyblHUNH+FMaLXRfzEGo17mk0Z6c8+uAH5x3ZNgq/Ebw54UYzJdt7lMHE1p6JeGvacErwcjGwUbSPM0mnr6C7oWCYP0rfG2n11UQvgJ7oKh6eQwb5KbqWsclKYTDRje4qmmFFItUqTeptJHCj0rfHleZc3Uwij6Vs2GCiE/z1hT4EzK3zDxmkjhR6YvPK6iurPxmkjjXqFHp05jhvfHHDLWOFHpW+PK+OERELNqFH7Melb48r4ath7xmaRRgAP76fRrU0Ohshp6X6nUb8zgACQEQ9ueODuXquMXWygSkYWOt5+mIZBTfrz6Cl27W1INnt55Z5YS8M21MDAREntq9Jm0WY0NTTjhQfQPvIKGDWmfVgpNYikXoUBgcQWm+ds2A5+R4sQ7qPRZvuiWBoTuCjGKBTCsyByvGt5pwbJpmbkD2Z2vHJVkRG005oUfkr+wNl/3TDOE78x5uMC3bS02mUPHfXtkOLUeCshM51b2C4LvdKCCt197on7vK9Xq5711rVN322XDcnh3KQOnG8T4kiWwoN7RR3q+kfbKmYFgCNVDpzJyf+mxvrmB1oH8maBFGV3B+AtB7peNAkwoDEESgn+1ROUHfMPmK8FLCGlofHdOk2T3XTDIa368XUn19tsN0IFFlPHY/8i2ozPdH+H83JeaYnp6YkWSU9v9VfXi6U3s+Wt+VFp+fOsJKzHhgdQ8sHuh19Cr87hDPgwq27eF1qIZ13G7zI03hU+NEppA9/5wZuLBeD3UuefZzT81oGlsfLUahx9Go571I4yOMVDCwA99uQOOd499ltFdetqq3ZoXPV5/1S9Chlpx+QoPaXMrjrdvsBMuZg/qTeHUI04b0JhFSrvav4+lafzayqN/AuE2y1t5Bg0CmBJykn+nWzuunNft6FVfiXYAVpzDy7eeNqPR64GoXqAAPAwYB5NLa5UycnPdBuaGeNQnMZspyKdSZlQHfEVNl/CjM8N3Gne3ao6b1geLEXHqL+9SroB+eCITS5uQ735/Ij+T7xX/GLotZQTyA0YFCgWVfACN+BYZ8kmm8eM+iDDtp2nX4ronauEUhqmT3rBDvzmoLTY/itnAW3shlWvdmS32bNrnzJj6kdPCyLBKHZRIPbyldSoM/E11ThEiYsAGeHTMP1oWejYQypsVIsSxh/y9n/HRJb1PrZIk95zDoMyYGOQWSn22msK2uOvI6I+IBfiKN8np7oULk6ynMtzOEsvptfK2ZOdBcpMLSukf0OSIjykVBcWNxhK0WSz0PTfXwBw3aL8rH3mrUZASaFRfySKOINtMC407YSUS+L5qreObUytpT6lscWfqHENZ2GKDWNmQohl/BlWImiYRkLsz5KZz7JLnCKIM3noy7zEGvr6QZDWqcu8HQccKcXMPv0HMK3fOtjlKbBJ7Y89cKsDFAsLF9nFej3U1Lf2JxKwOJ2CqibDuXZB/r4JZL8t/u92qGL5gOeAecH5d36v94a4WtxrnqIkQD9DFy+UlnWqx+Z6EqfzeMgEu/rChoJ/EHIGG4gZi2MykOxgX8FcaAZVNODbfIaM2ODrq2/nS213+eeIY4KTMBwNLzvGA/yDhY+oahOhrieIN5bvNjzlnOzbbSyvHGZpa22637cEylDr3g4e6OUByhr8WqA1QZn3eWG2CExBFgHY6V2dunNjlva7ANgnez/0js+GsdPExd7Bdxf4qDOD62FlTkvzUydahOlstKXhVdy/xrgS0OLUOEPLo3t6f2KWZ5BxgwJp0G0T5FZ3YGwxgWwSiBd4WjEQ0Dmfgrj1E4DKaFL1RmyrpjKkdPQX4UeNX+GVbidOsl6keL5l8GOlJ0b+EO8hnYKjjPWdJtOgDTnuXYZJbksvKNCFU2sNg4jCkemW10iXhWeGIvp1IJ3rPFiJ3TpgC/POj7H4KCL/EA72/fAsFGjVEjTVxxqQkAKDTIlh0kpBh0unEl+MHXzZu0iNzCjBGsOgUFIwsMZuwSF0e0Eaf+udj0RSzk9Oo0v9Sgng5GnqGNVKZbbFxmIjIht3DTtYWDAflIV5HU3EBw339QqSBqy+LY7yiceyqN1wwD0z8UxKfszI3xHR+L+N1cHBAkxmZwfTWJWOaGAcc49xE2GT+8JlBF4FCq0z+hPZzq5thgkRIG8lGGjgoJ6FuS5UGu/Hmf39HtM111ZJXumyB/QYcUUkYvTjMdB+AxNV3MEKpQBmQioY0FhKLcQQ/B/3BVNZCIdRIEQJ5Xf8WehcjQlFXKxuTxAWa3fAcva3A7vT8p3Y5Wqv50cZ6nKEwsqHvrhoFpwTgcnlTH6Ytjw5GglQV6r+g7zZ0xy0TkmjV73fzhMU9XE96CFA8wWoylLcxtjBp+zpNZlgP/gMGDB3/YxGjt0st+KwAkaVVDVjIHqH/AtaSV3v2GYAVdEWBhzc4t0s87+3oYhMbi5wPfiQPAeYs7wnglNYK+o93ymHK+QAfiD6TzmkhhuTKVWTMn2yDakTLVfYWD2/+GWf7ZwhAfa7AVBFUgZO1dP+aXw6xUQ/QUGqFt9ZmuyaN18xkEeQ36NWEt62mj2gmlsd19h4AZHydXXpQ+LPIaKpY//6PEm/X/Nm0nLX7abo5QN3Tr9yKBjSFCjuKWrZbDpYT7PV20gmAR1TfERdETSN/1MHn220aQLA9t82sWHHfV7mm42yXwFOJzPTy+QPeh+BsByLPYHeZ046DECn9Y9+Gsufi3OILIQiHuuUN5Dihv2/mXeUUKnDuchYo3410jVlntbsg8KFWZdUMYorCR/CnlWKfYyy+3ffmUY8Z/2dIX6ikltkFCabGTc4/1SQmFPKdUTd6FZL9dspnJEu/7BXJyQLvVhHFVLQwXP3AdxOF8HH7PbxsGK1RQo2nyaMZgIlM94Ck4A9SkTpRC1eoEtvtgOpSj0cHLa5Sb11wveNV6fRKGrgKxiYHu89M18PkMm8rE/eiNxOH6FUcYJrgpnrIpPj+/U3jZ/BDhoRKfI3W5kEgZxSq0UXTWv1erpSzVIeeXPitl9x1Jrx+ijvVHNHlnvOhe66mjB6D2+hfuKb/b1SBGruyJBdM4zNAzRYHBGoD/z2EMZWMJ74vkOU5X1hrXP4H8uLfIjiZTCLyj4/SvnhLNLWIIcAQAmIYAcqcAugIhWkXP70b5AhPfbaclAPetc77xH5G+gGJPXV1siH/C8bFzc7EH6WJHLi6OxxnPgSgBSt2FT2ZZyfv/urhHeJ8UgUiuATOdOOnXWICA0n8G3wAmbfxyAZ0EKUvp482eAVsMSMdPjzaxOqYkaHng5F1CIymib5TJ2CoTDMocZ1ww6rfWXSFQrIMRl+dSxEwmCFUEV36lt+Vi8Rei8djw+uMchDjBe1fAcWgBIFLFh0fbD60kAkGLVmI5kwMiiRzz8YMlkmH7G5lyJTIJQ+DijDs8KM3ogQeAABfUKyg3lpgyAAAA';
  const html2 = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Trading Journal — ${now}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;background:#fff}
    .header{display:flex;align-items:center;gap:12px;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:14px}
    .header img{width:44px;height:44px;border-radius:8px}
    .header h1{font-size:20px;font-weight:900;margin:0}
    .header .sub{font-size:11px;color:#666;margin-top:2px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
    .sum-card{border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}
    .sum-card .lbl{font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#666;margin-bottom:4px}
    .sum-card .val{font-size:18px;font-weight:700}
    .sum-card .val.pos{color:#3d9e60}.sum-card .val.neg{color:#e05a2b}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#f5f5f5;border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#444}
    td{border:1px solid #eee;padding:5px 8px;vertical-align:middle}
    .win-row td{background:rgba(61,158,96,0.04)}.loss-row td{background:rgba(224,90,43,0.04)}
    .footer{margin-top:20px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
    .adv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
    .adv-card{border:1px solid #ddd;border-radius:6px;padding:8px;text-align:center}
    .adv-card .al{font-size:9px;text-transform:uppercase;color:#666;margin-bottom:3px}
    .adv-card .av{font-size:15px;font-weight:700}
    @media print{body{padding:10px}}
  <\/style><\/head><body>
  <div class="header"><img src="${logoSrc}" alt="logo"/><div><div class="h1" style="font-size:20px;font-weight:900">$100 → $100k · Trading Journal</div><div class="sub">Esportato il ${now} · ${total} trade totali</div></div></div>
  <div class="summary">
    <div class="sum-card"><div class="lbl">Trade totali</div><div class="val">${total}</div></div>
    <div class="sum-card"><div class="lbl">Win rate</div><div class="val ${wr>=50?'pos':'neg'}">${wr}%</div></div>
    <div class="sum-card"><div class="lbl">P&L totale</div><div class="val ${totalPnl>=0?'pos':'neg'}">${totalPnl>=0?'+':'-'}$${Math.abs(totalPnl).toFixed(2)}</div></div>
    <div class="sum-card"><div class="lbl">Profit Factor</div><div class="val">${s.pf}</div></div>
  </div>
  <div class="adv">
    <div class="adv-card"><div class="al">Avg Win</div><div class="av">${s.avgWin?'+$'+s.avgWin:'—'}</div></div>
    <div class="adv-card"><div class="al">Avg Loss</div><div class="av">${s.avgLoss?'-$'+s.avgLoss:'—'}</div></div>
    <div class="adv-card"><div class="al">Streak Win</div><div class="av">${s.maxWs}</div></div>
    <div class="adv-card"><div class="al">Streak Loss</div><div class="av">${s.maxLs}</div></div>
    <div class="adv-card"><div class="al">Expectancy</div><div class="av">${s.exp?(parseFloat(s.exp)>=0?'+$'+s.exp:'-$'+Math.abs(s.exp)):'—'}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Data</th><th>Pair</th><th>Dir</th><th>Esito</th><th>P&L</th><th>R:R</th><th>Setup</th><th>TF</th><th>Stato</th><th>Note</th><th>📷</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">VanillaChart · Trading Challenge Tracker · $100 → $100k</div>
  <\/body><\/html>`;
  const w = window.open('','_blank');
  w.document.write(html2);
  w.document.close();
  setTimeout(()=>w.print(), 800);
};

// ── JOURNAL ADV STATS RENDER ──
function renderJournalAdvStats(entries) {
  const s = calcAdvStats(entries);
  const set=(id,val,cls)=>{ const el=document.getElementById(id); if(el){el.textContent=val||'—'; if(cls) el.className='av '+cls;} };
  const total=entries.length;
  const wins=entries.filter(e=>e.outcome==='win');
  const losses=entries.filter(e=>e.outcome==='loss');
  const totalWin=wins.reduce((a,e)=>a+e.pnl,0);
  const totalLoss=Math.abs(losses.reduce((a,e)=>a+e.pnl,0));
  const pf=totalLoss>0?(totalWin/totalLoss).toFixed(2):wins.length>0?'∞':'—';
  const avgWin=wins.length>0?(totalWin/wins.length).toFixed(2):null;
  const avgLoss=losses.length>0?(totalLoss/losses.length).toFixed(2):null;
  let maxWs=0,maxLs=0,ws=0,ls=0;
  entries.forEach(e=>{if(e.outcome==='win'){ws++;ls=0;if(ws>maxWs)maxWs=ws;}else if(e.outcome==='loss'){ls++;ws=0;if(ls>maxLs)maxLs=ls;}});
  const exp=avgWin&&avgLoss&&total>0?((wins.length/total)*parseFloat(avgWin)-(losses.length/total)*parseFloat(avgLoss)).toFixed(2):null;
  const today=new Date().toISOString().split('T')[0];
  const todayCount=entries.filter(e=>(e.date||'').startsWith(today)).length;
  const rrWins=wins.filter(e=>e.rr&&e.rr>0).map(e=>e.rr);
  const avgRRWin=rrWins.length>0?(rrWins.reduce((a,b)=>a+b,0)/rrWins.length).toFixed(2):null;
  set('jst-pf',pf,parseFloat(pf)>1?'pos':'neg');
  set('jst-avgwin',avgWin?'+$'+avgWin:'—','pos');
  set('jst-avgloss',avgLoss?'-$'+avgLoss:'—','neg');
  set('jst-wstreak',maxWs||'0','pos');
  set('jst-lstreak',maxLs||'0','neg');
  set('jst-exp',exp?(parseFloat(exp)>=0?'+$'+exp:'-$'+Math.abs(exp)):'—',exp&&parseFloat(exp)>=0?'pos':'neg');
  set('jst-today',todayCount,'neutral');
  set('jst-rrwin',avgRRWin?avgRRWin+':1':'—','neutral');
  // cooldown journal
  const jCool = document.getElementById('j-cooldown');
  if(jCool){
    let consLossJ=0,maxCl=0;
    entries.forEach(e=>{if(e.outcome==='loss'){consLossJ++;if(consLossJ>maxCl)maxCl=consLossJ;}else consLossJ=0;});
    jCool.classList.toggle('visible', maxCl>=2);
  }
  // overtrading journal
  const jOt = document.getElementById('j-overtrading');
  if(jOt) jOt.classList.toggle('visible', todayCount>5);
  renderMoodAnalysis(entries);
}


window.showScreenshotModal = function(src) {
  const modal = document.getElementById('screenshot-modal');
  document.getElementById('screenshot-modal-img').src = src;
  modal.style.display = 'flex';
};

// ── PROFILO UTENTE ──
let userProfile = { avatarUrl: '', username: '', email: '' };

async function loadUserProfile() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
    if (snap.exists()) {
      userProfile = { ...userProfile, ...snap.data() };
    }
    userProfile.email = currentUser.email || '';
  } catch(e) {}
  updateHeaderAvatar();
}

function updateHeaderAvatar() {
  const wrap = document.getElementById('header-avatar-wrap');
  if (!wrap) return;
  if (userProfile.avatarUrl) {
    wrap.innerHTML = `<img src="${userProfile.avatarUrl}" class="profile-avatar-sm" alt="avatar"/>`;
  } else {
    wrap.textContent = '👤';
  }
}

window.openProfile = async function() {
  await loadUserProfile();
  // Popola campi
  const uEl = document.getElementById('profile-username-display');
  const eEl = document.getElementById('profile-email-display');
  if (uEl) uEl.value = currentState?.username || userProfile.username || '—';
  if (eEl) eEl.value = userProfile.email || currentUser?.email || '—';
  // Avatar
  const img = document.getElementById('profile-avatar-img');
  const emoji = document.getElementById('profile-avatar-emoji');
  if (userProfile.avatarUrl && img) {
    img.src = userProfile.avatarUrl; img.style.display = 'block';
    if (emoji) emoji.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    if (emoji) emoji.style.display = 'block';
  }
  // Reset password fields
  ['profile-cur-pass','profile-new-pass','profile-confirm-pass'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('profile-pass-msg').textContent = '';
  document.getElementById('profile-overlay').classList.remove('hidden');
};

window.closeProfile = function() {
  document.getElementById('profile-overlay').classList.add('hidden');
};

window.handleProfilePic = async function(input) {
  const file = input.files[0]; if (!file || !currentUser) return;
  const uploadingEl = document.getElementById('profile-pic-uploading');
  if (uploadingEl) { uploadingEl.textContent = 'Caricamento in corso...'; uploadingEl.style.display = 'block'; }

  try {
    // Comprimi l'immagine a 100x100px via canvas → base64 piccolo (~5-10KB)
    const base64 = await compressImage(file, 100, 100, 0.75);

    userProfile.avatarUrl = base64;

    // Salva su Firestore profiles
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      avatarUrl: base64,
      username: currentState?.username || '',
      updatedAt: Date.now()
    });

    // Aggiorna challenges per la classifica
    if (currentState) {
      await setDoc(doc(db, 'challenges', currentUser.uid), {
        ...currentState, avatarUrl: base64
      });
    }

    // Aggiorna UI
    const img = document.getElementById('profile-avatar-img');
    const emoji = document.getElementById('profile-avatar-emoji');
    if (img) { img.src = base64; img.style.display = 'block'; }
    if (emoji) emoji.style.display = 'none';
    updateHeaderAvatar();
    if (uploadingEl) { uploadingEl.textContent = '✅ Foto caricata!'; setTimeout(() => { uploadingEl.style.display = 'none'; }, 2000); }

  } catch(e) {
    console.error('Avatar error:', e);
    if (uploadingEl) { uploadingEl.textContent = '❌ Errore nel caricamento.'; setTimeout(() => { uploadingEl.style.display = 'none'; }, 3000); }
  }
};

function compressImage(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        // Mantieni proporzioni, ritaglia quadrato dal centro
        const size = Math.min(w, h);
        const sx = (w - size) / 2;
        const sy = (h - size) / 2;
        canvas.width = maxW; canvas.height = maxH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxW, maxH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.changePassword = async function() {
  const curPass  = document.getElementById('profile-cur-pass').value;
  const newPass  = document.getElementById('profile-new-pass').value;
  const confPass = document.getElementById('profile-confirm-pass').value;
  const msgEl    = document.getElementById('profile-pass-msg');
  const btn      = document.getElementById('profile-pass-btn');

  msgEl.textContent = ''; msgEl.className = 'profile-msg';

  if (!curPass || !newPass || !confPass) {
    msgEl.textContent = 'Compila tutti i campi.'; msgEl.className = 'profile-msg err'; return;
  }
  if (newPass.length < 6) {
    msgEl.textContent = 'La nuova password deve essere di almeno 6 caratteri.'; msgEl.className = 'profile-msg err'; return;
  }
  if (newPass !== confPass) {
    msgEl.textContent = 'Le password non coincidono.'; msgEl.className = 'profile-msg err'; return;
  }

  btn.disabled = true; btn.textContent = 'Aggiornamento...';
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, curPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
    msgEl.textContent = '✅ Password aggiornata con successo!'; msgEl.className = 'profile-msg ok';
    ['profile-cur-pass','profile-new-pass','profile-confirm-pass'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  } catch(e) {
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      msgEl.textContent = 'Password attuale errata.';
    } else {
      msgEl.textContent = 'Errore: ' + e.message;
    }
    msgEl.className = 'profile-msg err';
  }
  btn.disabled = false; btn.textContent = 'Aggiorna password';
};

// ── GDPR ──
window.openPrivacy = function() {
  document.getElementById('privacy-overlay').classList.remove('hidden');
};
window.closePrivacy = function() {
  document.getElementById('privacy-overlay').classList.add('hidden');
};
window.gdprAccept = function() {
  localStorage.setItem('gdpr_consent', 'accepted');
  localStorage.setItem('gdpr_analytics', 'true');
  document.getElementById('gdpr-banner').style.display = 'none';
  document.getElementById('gdpr-settings-panel').style.display = 'none';
};
window.gdprReject = function() {
  localStorage.setItem('gdpr_consent', 'necessary');
  localStorage.setItem('gdpr_analytics', 'false');
  document.getElementById('gdpr-banner').style.display = 'none';
};
window.gdprSaveSettings = function() {
  const analytics = document.getElementById('cookie-analytics')?.checked;
  localStorage.setItem('gdpr_consent', 'custom');
  localStorage.setItem('gdpr_analytics', analytics ? 'true' : 'false');
  document.getElementById('gdpr-settings-panel').style.display = 'none';
  document.getElementById('gdpr-banner').style.display = 'none';
};
window.closeGdprSettings = function() {
  document.getElementById('gdpr-settings-panel').style.display = 'none';
};
window.openCookieSettings = function() {
  const panel = document.getElementById('gdpr-settings-panel');
  const analyticsEl = document.getElementById('cookie-analytics');
  if (analyticsEl) analyticsEl.checked = localStorage.getItem('gdpr_analytics') === 'true';
  panel.style.display = 'block';
};
function checkGDPR() {
  const consent = localStorage.getItem('gdpr_consent');
  if (!consent) {
    setTimeout(() => {
      document.getElementById('gdpr-banner').style.display = 'flex';
    }, 1000);
  }
}
checkGDPR();

// ── RISK CALCULATOR ──
let calcMarket = 'crypto';

window.setCalcMarket = function(market, btn) {
  calcMarket = market;
  document.querySelectorAll('.calc-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('calc-crypto-fields').style.display = market === 'crypto' ? 'block' : 'none';
  document.getElementById('calc-forex-fields').style.display  = market === 'forex'  ? 'block' : 'none';
  document.getElementById('calc-indici-fields').style.display = market === 'indici' ? 'block' : 'none';
  calcRisk();
};

// Pip value per lotto standard (in USD)
const FOREX_PIP = {
  EURUSD: 10, GBPUSD: 10, AUDUSD: 10, NZDUSD: 10,
  USDJPY: 9.09, USDCHF: 11.2, USDCAD: 7.7,
  EURGBP: 12.5, EURJPY: 9.09, GBPJPY: 9.09
};
const LOT_UNITS = { standard: 100000, mini: 10000, micro: 1000 };
const INDICE_POINT = { SP500: 50, NAS100: 20, DOW: 5, DAX: 25, FTSE: 10, custom: null };

// Mostra/nascondi campo custom indice
document.addEventListener('DOMContentLoaded', () => {
  const indSel = document.getElementById('calc-indice');
  if (indSel) {
    indSel.addEventListener('change', () => {
      const wrap = document.getElementById('calc-indice-custom-wrap');
      if (wrap) wrap.style.display = indSel.value === 'custom' ? 'block' : 'none';
    });
  }
});

window.calcRisk = function() {
  if (!currentState) return;
  const capital = currentState.capital;
  const phase   = getPhase(capital);
  const risk    = getRisk(phase);
  const riskPct = risk.pct / 100;
  const riskUSD = capital * riskPct;

  const entry  = parseFloat(document.getElementById('calc-entry').value);
  const sl     = parseFloat(document.getElementById('calc-sl').value);

  const resultsEl = document.getElementById('calc-results');
  const warnEl    = document.getElementById('calc-warning');

  if (isNaN(entry) || isNaN(sl) || entry <= 0 || sl <= 0 || entry === sl) {
    resultsEl.style.display = 'none';
    warnEl.classList.remove('visible');
    const badge = document.getElementById('calc-dir-badge');
    if (badge) { badge.classList.remove('visible','long','short'); }
    return;
  }
  warnEl.classList.remove('visible');

  // Auto-detect direzione
  const isLong  = sl < entry;
  const dirLabel = isLong ? 'Long 📈' : 'Short 📉';
  const slDist    = Math.abs(entry - sl);
  const slDistPct = slDist / entry;

  let sizeLabel = 'Size posizione';
  let sizeValue = '—';
  let sizeSub   = '';
  let levaValue = '—';
  let levaSub   = '';
  let warning   = '';
  let leva      = 0;
  let summaryText = '';

  if (calcMarket === 'crypto') {
    const sizeUSDT = riskUSD / slDistPct;
    leva = sizeUSDT / capital;
    const qty = (sizeUSDT / entry).toFixed(6);
    const maxLev = parseFloat(document.getElementById('calc-crypto-maxlev').value) || 50;
    sizeLabel = 'Size (USDT)';
    sizeValue = '$' + sizeUSDT.toFixed(2);
    sizeSub   = qty + ' token · ' + dirLabel;
    levaValue = leva.toFixed(2) + 'x';
    levaSub   = 'su capitale challenge';
    const margine = sizeUSDT / leva;
    summaryText = `Entra con <strong>$${margine.toFixed(2)}</strong> · leva <strong>${leva.toFixed(2)}x</strong>`;
    if (leva > maxLev) warning = `⚠️ Leva ${leva.toFixed(1)}x supera il massimo del broker (${maxLev}x). Riduci la size o allarga lo SL.`;

  } else if (calcMarket === 'forex') {
    const pairKey   = document.getElementById('calc-forex-pair').value;
    const lotType   = document.getElementById('calc-forex-lottype').value;
    const pipValStd = FOREX_PIP[pairKey] || 10;
    const units     = LOT_UNITS[lotType];
    const pipValLot = pipValStd * (units / 100000);
    const isJPY     = pairKey.includes('JPY');
    const pipSize   = isJPY ? 0.01 : 0.0001;
    const slPips    = slDist / pipSize;
    const lots      = riskUSD / (slPips * pipValLot);
    const sizeUnits = lots * units;
    leva = sizeUnits / capital;
    sizeLabel = 'Lotti';
    sizeValue = lots.toFixed(2) + ' lot';
    sizeSub   = slPips.toFixed(1) + ' pips SL · ' + dirLabel;
    levaValue = leva.toFixed(1) + 'x';
    levaSub   = 'leva stimata';
    summaryText = `Entra con <strong>${lots.toFixed(2)} lot</strong> · <strong>${sizeUnits.toLocaleString()} unità</strong> · leva <strong>${leva.toFixed(1)}x</strong>`;
    if (lots < 0.01) warning = '⚠️ Size troppo piccola (<0.01 lot). SL troppo largo o capitale insufficiente.';

  } else if (calcMarket === 'indici') {
    const indice = document.getElementById('calc-indice').value;
    let pointVal = INDICE_POINT[indice];
    if (indice === 'custom') pointVal = parseFloat(document.getElementById('calc-indice-custom').value) || null;
    if (!pointVal) { resultsEl.style.display = 'none'; return; }
    const slPoints  = slDist;
    const contracts = riskUSD / (slPoints * pointVal);
    const notional  = contracts * entry * pointVal;
    leva = notional / capital;
    sizeLabel = 'Contratti';
    sizeValue = contracts.toFixed(4);
    sizeSub   = slPoints.toFixed(1) + ' punti SL · ' + dirLabel;
    levaValue = leva.toFixed(1) + 'x';
    levaSub   = 'leva stimata';
    summaryText = `Entra con <strong>${contracts.toFixed(4)} contratti</strong> · nozionale <strong>$${notional.toFixed(2)}</strong> · leva <strong>${leva.toFixed(1)}x</strong>`;
    if (contracts < 0.001) warning = '⚠️ Size troppo piccola. SL troppo largo rispetto al capitale.';
  }

  resultsEl.style.display = 'grid';
  document.getElementById('cr-rischio').textContent     = '$' + riskUSD.toFixed(2);
  document.getElementById('cr-rischio-pct').textContent = risk.pct + '% · Fase ' + phase + ' · ' + dirLabel;
  document.getElementById('cr-size-label').textContent  = sizeLabel;
  document.getElementById('cr-size').textContent        = sizeValue;
  document.getElementById('cr-size-sub').textContent    = sizeSub;
  document.getElementById('cr-leva').textContent        = levaValue;
  document.getElementById('cr-leva-sub').textContent    = levaSub;

  const summaryEl = document.getElementById('calc-summary');
  if (summaryEl) { summaryEl.innerHTML = summaryText; summaryEl.style.display = 'block'; }

  // Direction badge
  const badge = document.getElementById('calc-dir-badge');
  if (badge) {
    badge.classList.remove('long','short');
    badge.classList.add('visible', isLong ? 'long' : 'short');
    document.getElementById('calc-dir-icon').textContent  = isLong ? '📈' : '📉';
    document.getElementById('calc-dir-label').textContent = isLong ? 'Long' : 'Short';
  }

  if (warning) { warnEl.textContent = warning; warnEl.classList.add('visible'); }
  else { warnEl.classList.remove('visible'); }
};

// ── CELEBRATION ──
function launchCelebration() {
  const colors = ['#3d9e60','#5b8cf7','#d4a017','#e05a2b','#a855f7','#f0ede8'];
  const pieces = [];
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = (Math.random() * 8 + 5) + 'px';
    el.style.height = (Math.random() * 8 + 5) + 'px';
    el.style.animationDuration = (Math.random() * 3 + 2) + 's';
    el.style.animationDelay = (Math.random() * 2) + 's';
    document.body.appendChild(el);
    pieces.push(el);
    el.addEventListener('animationend', () => el.remove());
  }

  const overlay = document.createElement('div');
  overlay.id = 'challenge-complete-overlay';
  overlay.innerHTML = `
    <div class="celeb-trophy">🏆</div>
    <h2>COMPLIMENTI!<br>HAI COMPLETATO<br>LA CHALLENGE</h2>
    <p>Hai trasformato <strong style="color:var(--text)">$100</strong> in <strong style="color:var(--win)">$100.000</strong>.<br>Un risultato straordinario.</p>
    <button class="celeb-close" id="celeb-close-btn">Continua →</button>
  `;
  document.body.appendChild(overlay);

  document.getElementById('celeb-close-btn').addEventListener('click', () => {
    pieces.forEach(p => p.remove());
    overlay.remove();
  });
}

// ── LOSS ──
function launchLoss() {
  const pieces = [];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'skull-piece';
    el.textContent = '💀';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-60px';
    el.style.fontSize = (Math.random() * 20 + 18) + 'px';
    el.style.animationDuration = (Math.random() * 3 + 2) + 's';
    el.style.animationDelay = (Math.random() * 2.5) + 's';
    document.body.appendChild(el);
    pieces.push(el);
    el.addEventListener('animationend', () => el.remove());
  }

  const overlay = document.createElement('div');
  overlay.id = 'challenge-lost-overlay';
  overlay.innerHTML = `
    <div class="lost-skull-big">💀</div>
    <h2>HAI PERSO</h2>
    <p>La challenge è terminata.<br>Il capitale è andato sotto il limite consentito.<br><strong style="color:var(--text)">Analizza i tuoi errori e riparti più forte.</strong></p>
    <button class="lost-close" id="lost-close-btn">Ricomincia →</button>
  `;
  document.body.appendChild(overlay);

  document.getElementById('lost-close-btn').addEventListener('click', () => {
    pieces.forEach(p => p.remove());
    overlay.remove();
  });
}

// ── BITGET API INTEGRATION ──────────────────────────────────────────────────

const BITGET_PROXY = 'https://bitget-proxy-mze2.onrender.com'; // Replit proxy

// Genera firma HMAC-SHA256
async function hmacSHA256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── CRYPTO AES-GCM per cifrare API keys su Firestore ──
const CRYPTO_SALT = 'vanillachart-bitget-v1';

async function deriveKey(uid) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(uid + CRYPTO_SALT), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(CRYPTO_SALT), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptStr(uid, plaintext) {
  const key = await deriveKey(uid);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptStr(uid, b64) {
  try {
    const key = await deriveKey(uid);
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const dec = new TextDecoder();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return dec.decode(plain);
  } catch { return ''; }
}

async function saveKeysToFirestore(uid, apiKey, secret, passphrase) {
  if (!uid || !db) return;
  try {
    const [encKey, encSecret, encPass] = await Promise.all([
      encryptStr(uid, apiKey),
      encryptStr(uid, secret),
      encryptStr(uid, passphrase || '')
    ]);
    await setDoc(doc(db, 'apiKeys', uid), {
      exchange: 'bitget',
      encKey, encSecret, encPass,
      updatedAt: Date.now()
    });
  } catch(e) {
    console.warn('saveKeysToFirestore error:', e.message);
  }
}

async function loadKeysFromFirestore(uid) {
  if (!uid || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'apiKeys', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const [apiKey, secret, passphrase] = await Promise.all([
      decryptStr(uid, d.encKey || ''),
      decryptStr(uid, d.encSecret || ''),
      decryptStr(uid, d.encPass || '')
    ]);
    return { apiKey, secret, passphrase };
  } catch(e) {
    console.warn('loadKeysFromFirestore error:', e.message);
    return null;
  }
}

async function deleteKeysFromFirestore(uid) {
  if (!uid || !db) return;
  try {
    await setDoc(doc(db, 'apiKeys', uid), { exchange: 'bitget', encKey: '', encSecret: '', encPass: '', updatedAt: Date.now() });
  } catch(e) {
    console.warn('deleteKeysFromFirestore error:', e.message);
  }
}

// Carica chiavi — localStorage (fast path)
function loadBitgetKeys() {
  return {
    apiKey: localStorage.getItem('bitget_api_key') || '',
    secret: localStorage.getItem('bitget_api_secret') || '',
    passphrase: localStorage.getItem('bitget_api_passphrase') || ''
  };
}

// Sincronizza da Firestore → localStorage all'avvio (se localStorage vuoto)
async function syncKeysFromFirestore() {
  if (!currentUser) return;
  const keys = await loadKeysFromFirestore(currentUser.uid);
  if (!keys || !keys.apiKey) return;
  if (!localStorage.getItem('bitget_api_key')) {
    localStorage.setItem('bitget_api_key', keys.apiKey);
    localStorage.setItem('bitget_api_secret', keys.secret);
    if (keys.passphrase) localStorage.setItem('bitget_api_passphrase', keys.passphrase);
    console.log('Bitget keys ripristinate da Firestore');
  }
}

// Aggiorna UI stato connessione
function updateBitgetUI(state) {
  // state: 'disconnected' | 'connected' | 'error'
  const dot = document.getElementById('bitget-profile-dot');
  const badge = document.getElementById('bitget-profile-status');
  const hdrDot = document.getElementById('bitget-hdr-dot');
  const hdrLabel = document.getElementById('bitget-hdr-label');
  const hdrIndicator = document.getElementById('bitget-hdr-indicator');
  const liveData = document.getElementById('bitget-live-data');
  const disconnectBtn = document.getElementById('bitget-disconnect-btn');
  const connectBtn = document.getElementById('bitget-connect-btn');

  if (!dot) return;

  dot.className = 'bitget-dot ' + state;
  badge.className = 'bitget-status-badge ' + state;

  if (state === 'connected') {
    badge.textContent = 'Connessa ✓';
    if (hdrDot) { hdrDot.className = 'bitget-hdr-dot connected'; }
    if (hdrLabel) hdrLabel.textContent = 'Bitget ✓';
    if (hdrIndicator) hdrIndicator.className = 'bitget-hdr-indicator connected';
    if (liveData) liveData.style.display = 'block';
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (connectBtn) connectBtn.textContent = '⚡ Riconetti & Testa';
  } else if (state === 'error') {
    badge.textContent = 'Errore API';
    if (hdrDot) hdrDot.className = 'bitget-hdr-dot error';
    if (hdrLabel) hdrLabel.textContent = 'Bitget ✗';
    if (hdrIndicator) hdrIndicator.className = 'bitget-hdr-indicator';
    if (liveData) liveData.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    badge.textContent = 'Non connessa';
    if (hdrDot) hdrDot.className = 'bitget-hdr-dot';
    if (hdrLabel) hdrLabel.textContent = 'Bitget';
    if (hdrIndicator) hdrIndicator.className = 'bitget-hdr-indicator';
    if (liveData) liveData.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (connectBtn) connectBtn.textContent = '⚡ Connetti & Testa';
  }
}

// Chiamata autenticata all'API Bitget Futures (via Cloudflare Worker proxy)
async function bitgetFuturesRequest(endpoint, params = {}) {
  const { apiKey, secret, passphrase } = loadBitgetKeys();
  if (!apiKey || !secret) throw new Error('Chiavi API non configurate');

  const qstr = new URLSearchParams({ endpoint, ...params }).toString();
  const res = await fetch(`${BITGET_PROXY}?${qstr}`, {
    headers: {
      'x-bitget-key':        apiKey,
      'x-bitget-secret':     secret,
      'x-bitget-passphrase': passphrase || '',
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.code && data.code !== "00000" && data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || `Errore API: ${data.code}`);
  }
  return data;
}

// Salva API keys e testa la connessione
window.saveBitgetApiKeys = async function() {
  const keyInput = document.getElementById('bitget-api-key-input');
  const secretInput = document.getElementById('bitget-api-secret-input');
  const msg = document.getElementById('bitget-profile-msg');
  const btn = document.getElementById('bitget-connect-btn');

  const apiKey = (keyInput.value || '').trim();
  const secret = (secretInput.value || '').trim();

  if (!apiKey || !secret) {
    msg.textContent = '⚠ Inserisci sia API Key che Secret Key.';
    msg.className = 'bitget-msg err';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connessione in corso…';
  msg.textContent = '';

  const passphrase = (document.getElementById('bitget-api-passphrase-input')?.value || '').trim();
  localStorage.setItem('bitget_api_key', apiKey);
  localStorage.setItem('bitget_api_secret', secret);
  if (passphrase) localStorage.setItem('bitget_api_passphrase', passphrase);

  try {
    await fetchBitgetData();
    msg.textContent = '✓ Connessione Bitget riuscita! Dati caricati.';
    msg.className = 'bitget-msg ok';
    updateBitgetUI('connected');
    secretInput.value = '••••••••••••••••';
    // Salva anche su Firestore (cifrato) per sync multi-device e cron server
    if (currentUser) {
      await saveKeysToFirestore(currentUser.uid, apiKey, secret, passphrase);
      msg.textContent = '✓ Connessione riuscita! Chiavi salvate in modo sicuro.';
    }
  } catch(e) {
    msg.textContent = '✗ ' + e.message + ' — Verifica le chiavi e i permessi di lettura.';
    msg.className = 'bitget-msg err';
    updateBitgetUI('error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Riconnetti & Testa';
  }
};

// Disconnetti Bitget
window.disconnectBitget = async function() {
  localStorage.removeItem('bitget_api_key');
  localStorage.removeItem('bitget_api_secret');
  localStorage.removeItem('bitget_api_passphrase');
  // Cancella anche da Firestore
  if (currentUser) await deleteKeysFromFirestore(currentUser.uid);
  const keyInput = document.getElementById('bitget-api-key-input');
  const secretInput = document.getElementById('bitget-api-secret-input');
  const msg = document.getElementById('bitget-profile-msg');
  if (keyInput) keyInput.value = '';
  if (secretInput) secretInput.value = '';
  if (msg) { msg.textContent = 'API Bitget disconnessa.'; msg.className = 'bitget-msg'; }
  updateBitgetUI('disconnected');
  document.getElementById('bitget-bankroll').textContent = '—';
  document.getElementById('bitget-unrealized-pnl').textContent = '—';
  document.getElementById('bitget-open-positions').textContent = '—';
};

// Fetch dati Bitget: bilancio + posizioni + trade recenti
window.fetchBitgetData = async function() {
  const syncIcon = document.getElementById('bitget-sync-icon');
  if (syncIcon) syncIcon.className = 'bitget-syncing';

  try {
    // 1. Bilancio account futures USDT-M (Bitget v2)
    const balanceData = await bitgetFuturesRequest('/api/v2/mix/account/accounts', { productType: 'USDT-FUTURES' });
    // Bitget v2 può restituire array o oggetto singolo dentro data
    let rawAssets = balanceData.data || [];
    if (!Array.isArray(rawAssets)) rawAssets = [rawAssets];
    const usdtAsset = rawAssets.find(a => (a.marginCoin || '').toUpperCase() === 'USDT') || rawAssets[0];
    if (usdtAsset) {
      // Bitget v2 usa "equity" o "usdtEquity"; fallback su crossedMaxAvailable/available
      const equity = parseFloat(
        usdtAsset.accountEquity || usdtAsset.usdtEquity || usdtAsset.equity ||
        usdtAsset.crossedMaxAvailable || usdtAsset.available || 0
      );
      // PnL non realizzato: unrealizedPL / unrealizedProfit / crossedUnrealizedPL
      const unrealized = parseFloat(
        usdtAsset.unrealizedPL || usdtAsset.unrealizedProfit ||
        usdtAsset.crossedUnrealizedPL || 0
      );
      document.getElementById('bitget-bankroll').textContent = '$' + equity.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pnlEl = document.getElementById('bitget-unrealized-pnl');
      pnlEl.textContent = (unrealized >= 0 ? '+' : '') + '$' + unrealized.toFixed(2);
      pnlEl.style.color = unrealized >= 0 ? 'var(--win)' : 'var(--loss)';
    }

    // 2. Posizioni aperte
    const posData = await bitgetFuturesRequest('/api/v2/mix/position/all-position', { productType: 'USDT-FUTURES', marginCoin: 'USDT' });
    const positions = (posData.data || []).filter(p => parseFloat(p.total || p.openDelegateSize || p.available || 0) > 0);
    document.getElementById('bitget-open-positions').textContent = positions.length;

    // 3. Ordini storici recenti — su Bitget v2 /order/history richiede symbol,
    //    quindi usiamo /order/fills (fill history) che accetta solo productType
    let orders = [];
    try {
      const histData = await bitgetFuturesRequest('/api/v2/mix/order/fills', { productType: 'USDT-FUTURES', limit: '20' });
      orders = histData.data?.fillList || histData.data?.orderList || histData.data || [];
    } catch(histErr) {
      console.warn('fills endpoint error, fallback empty:', histErr.message);
    }

    updateBitgetUI('connected');

  } catch(e) {
    const msg = document.getElementById('bitget-profile-msg');
    if (msg) {
      msg.textContent = '✗ ' + (e.message || 'Errore sconosciuto');
      msg.className = 'bitget-msg err';
    }
    updateBitgetUI('error');
    throw e;
  } finally {
    if (syncIcon) syncIcon.className = '';
  }
};

// Stub fallback (non usato con Bitget v2)
async function fetchBitgetDataV2() {
  throw new Error('Endpoint non disponibile. Verifica API Key e Passphrase Bitget.');
}

// Render lista trade Bitget

// Init Bitget: carica chiavi esistenti e popola i campi
function initBitgetApi() {
  const { apiKey, secret, passphrase } = loadBitgetKeys();
  const keyInput = document.getElementById('bitget-api-key-input');
  const secretInput = document.getElementById('bitget-api-secret-input');

  const passphraseInput = document.getElementById('bitget-api-passphrase-input');
  if (keyInput && apiKey) keyInput.value = apiKey;
  if (secretInput && secret) secretInput.value = '••••••••••••••••';
  if (passphraseInput && passphrase) passphraseInput.value = '••••••••';

  if (apiKey && secret) {
    updateBitgetUI('connected');
    // Fetch silenzioso dei dati
    fetchBitgetData().catch(() => updateBitgetUI('error'));
  } else {
    updateBitgetUI('disconnected');
  }
}

// Chiamata all'init Bitget quando il profilo viene aperto
const _origOpenProfile = window.openProfile;
window.openProfile = async function(...args) {
  if (_origOpenProfile) await _origOpenProfile(...args);
  setTimeout(initBitgetApi, 100);
};

// Init Bitget anche all'avvio (per aggiornare l'indicatore header)
document.addEventListener('DOMContentLoaded', () => {
  const { apiKey, secret } = loadBitgetKeys();
  if (apiKey && secret) updateBitgetUI('connected');
});

// ── BITGET DASHBOARD INTEGRATION ─────────────────────────────────────────

let bitgetAutoInterval = null;

// Sync button in main dashboard
window.bitgetDashSync = async function() {
  const btn = document.getElementById('bitget-dash-sync-btn');
  const icon = document.getElementById('bitget-dash-sync-icon');
  if (btn) btn.disabled = true;
  if (icon) icon.className = 'bitget-spinning';
  try {
    await fetchAndRenderDashboard();
  } catch(e) {
    console.warn('Bitget sync error:', e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.className = '';
  }
};

// Apply Bitget balance to challenge capital
window.bitgetApplyBalance = async function() {
  if (!currentUser) { alert('Utente non autenticato.'); return; }
  if (isReadOnly) { alert('Modalità sola lettura.'); return; }
  if (!currentState) { alert('Stato challenge non caricato, riprova.'); return; }

  const balEl = document.getElementById('bitget-dash-balance');
  const normalized = balEl ? balEl.getAttribute('data-raw') : null;
  if (!balEl || normalized === null) { alert('Saldo Bitget non ancora caricato, attendi il sync.'); return; }

  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) { alert('Valore non valido: ' + normalized); return; }

  const btn = document.getElementById('bitget-apply-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio…'; }

  try {
    const newState = Object.assign({}, currentState, { capital: val });
    console.log('bitgetApplyBalance → saving capital:', val, 'state:', newState);
    await saveState(newState);
    console.log('bitgetApplyBalance → saved OK');

    if (btn) {
      btn.textContent = '✓ Salvato!';
      btn.style.color = 'var(--win)';
      btn.style.borderColor = 'var(--win-border)';
      setTimeout(() => {
        btn.textContent = '↑ Aggiorna capitale challenge';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
      }, 2000);
    }
  } catch(e) {
    console.error('bitgetApplyBalance error:', e);
    alert('Errore salvataggio: ' + e.message);
    if (btn) { btn.textContent = '↑ Aggiorna capitale challenge'; btn.disabled = false; }
  }
};

// Main dashboard fetch and render
async function fetchAndRenderDashboard() {
  const { apiKey, secret } = loadBitgetKeys();
  if (!apiKey || !secret) {
    showBitgetDashDisconnected();
    return;
  }

  let usdt = null;

  try {
    // 1. Balance
    const balData = await bitgetFuturesRequest('/api/v2/mix/account/accounts', { productType: 'USDT-FUTURES' });
    let rawBal = balData.data || [];
    if (!Array.isArray(rawBal)) rawBal = [rawBal];
    usdt = rawBal.find(a => (a.marginCoin || '').toUpperCase() === 'USDT') || rawBal[0];

    if (usdt) {
      const equity = parseFloat(
        usdt.accountEquity || usdt.usdtEquity || usdt.equity ||
        usdt.crossedMaxAvailable || usdt.available || 0
      );
      const upnl = parseFloat(
        usdt.unrealizedPL || usdt.unrealizedProfit ||
        usdt.crossedUnrealizedPL || 0
      );

      const balEl = document.getElementById('bitget-dash-balance');
      if (balEl) {
        balEl.setAttribute('data-raw', equity);
        balEl.textContent = '$' + equity.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      const upnlEl = document.getElementById('bitget-dash-upnl');
      if (upnlEl) {
        upnlEl.textContent = (upnl >= 0 ? '+' : '') + '$' + upnl.toFixed(2);
        upnlEl.className = 'bdm-val ' + (upnl > 0 ? 'pnl-pos' : upnl < 0 ? 'pnl-neg' : '');
      }
      const upnlSub = document.getElementById('bitget-dash-upnl-sub');
      if (upnlSub) upnlSub.textContent = upnl !== 0 ? (upnl > 0 ? 'profitto aperto' : 'perdita aperta') : 'nessuna posizione';

      // ── AUTO-AGGIORNA CAPITALE CHALLENGE ──
      // Salva direttamente il bankroll Bitget come capitale della challenge (solo se loggato e non read-only)
      if (currentUser && !isReadOnly && currentState && equity > 0) {
        if (Math.abs(equity - currentState.capital) >= 0.01) {
          try {
            await saveState(Object.assign({}, currentState, { capital: equity }));
          } catch(saveErr) {
            console.warn('Auto-save capital error:', saveErr.message);
          }
        }
      }
    }

    // 2. Positions
    const posData = await bitgetFuturesRequest('/api/v2/mix/position/all-position', {
      productType: 'USDT-FUTURES', marginCoin: 'USDT'
    });
    const positions = (posData.data || []).filter(p => parseFloat(p.total || p.available || 0) > 0);

    const posCountEl = document.getElementById('bitget-dash-pos-count');
    if (posCountEl) posCountEl.textContent = positions.length;

    const posSub = document.getElementById('bitget-dash-pos-sub');
    if (posSub) posSub.textContent = positions.length === 0 ? 'nessuna aperta' : positions.length === 1 ? '1 posizione attiva' : positions.length + ' posizioni attive';

    renderDashPositions(positions);

    // 3. Recent orders — fills endpoint
    let orders = [];
    try {
      const histData = await bitgetFuturesRequest('/api/v2/mix/order/fills', {
        productType: 'USDT-FUTURES', limit: '20'
      });
      orders = histData.data?.fillList || histData.data?.orderList || histData.data || [];
    } catch(e2) {
      console.warn('fills error in dashboard:', e2.message);
    }

    // ── IMPORTA TRADE DA API NELLO STORICO CHALLENGE ──
    if (currentUser && !isReadOnly && currentState && orders.length > 0) {
      try {
        await importBitgetTradesIntoChallenge(orders);
      } catch(importErr) {
        console.warn('Import trades error:', importErr.message);
      }
    }

    // ── SNAPSHOT PUBBLICO su collezione separata (non triggerà onSnapshot di /challenges) ──
    if (currentUser && !isReadOnly && usdt) {
      try {
        const snapEquity = parseFloat(usdt.accountEquity || usdt.usdtEquity || usdt.equity || usdt.crossedMaxAvailable || usdt.available || 0);
        const snapUpnl   = parseFloat(usdt.unrealizedPL || usdt.unrealizedProfit || usdt.crossedUnrealizedPL || 0);
        const posSnap = positions.map(p => ({
          symbol: (p.symbol||'').replace('_UMCBL','').replace('_DMCBL',''),
          holdSide: p.holdSide||'',
          unrealizedPL: parseFloat(p.unrealizedPL||p.unrealizedProfitLoss||0),
          leverage: p.leverage||'',
          total: parseFloat(p.total||p.available||0),
          openPriceAvg: parseFloat(p.openPriceAvg||p.averageOpenPrice||0),
          liquidationPrice: parseFloat(p.liquidationPrice||p.liqPx||0),
          marginSize: parseFloat(p.marginSize||p.margin||0),
        }));
        await setDoc(doc(db, 'bitgetPublic', currentUser.uid), {
          equity: snapEquity, upnl: snapUpnl, positions: posSnap, syncedAt: Date.now()
        });
      } catch(snapErr) { console.warn('snapshot save error:', snapErr.message); }
    }

    // Show connected state
    showBitgetDashConnected();

    // Update sync time
    const timeEl = document.getElementById('bitget-sync-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = 'Aggiornato ' + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
    }

    // Also update profile panel values
    const profBal = document.getElementById('bitget-bankroll');
    if (profBal && usdt) {
      const eq = parseFloat(usdt.accountEquity || usdt.usdtEquity || usdt.equity || usdt.crossedMaxAvailable || 0);
      profBal.textContent = '$' + eq.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

  } catch(e) {
    console.warn('Bitget dashboard error:', e.message);
    const timeEl = document.getElementById('bitget-sync-time');
    if (timeEl) timeEl.textContent = 'Errore: ' + e.message.slice(0, 30);
    throw e;
  }
}

// ── IMPORTA FILLS BITGET NELLO STORICO CHALLENGE ──
// Importa solo i fill chiusi (con profitto/perdita realizzata), evitando duplicati tramite bitgetFillId
async function importBitgetTradesIntoChallenge(orders) {
  if (!currentState || !currentUser || isReadOnly) return;

  // Set degli ID già importati (salvato nello state)
  const importedIds = new Set(currentState.bitgetImportedIds || []);
  const newIds = [];

  // Step 1: filtra solo i fill di chiusura non ancora importati
  const closeFills = orders.filter(o => {
    const tradeSide = o.tradeSide || o.side || '';
    const isClose = tradeSide.startsWith('close') || tradeSide === 'sell' || tradeSide === 'buy_to_cover';
    if (!isClose) return false;
    const pnl = parseFloat(o.profit || o.pnl || o.realizedPnl || 0);
    if (pnl === 0 && !o.profit && !o.realizedPnl) return false;
    return true;
  });

  // Step 2: raggruppa per orderId — se ci sono più fill dello stesso ordine (scaling out parziale)
  // li sommiamo in un singolo trade
  const orderMap = new Map();
  for (const o of closeFills) {
    const orderId = String(o.orderId || o.fillId || o.id || '');
    if (!orderId) continue;
    if (importedIds.has(orderId)) continue;

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, { fills: [], orderId });
    }
    orderMap.get(orderId).fills.push(o);
  }

  if (orderMap.size === 0) return;

  // Step 3: costruisci i trade aggregati con capAfter progressivo
  let runningCap = currentState.capital;
  const newTrades = [];

  for (const [orderId, group] of orderMap) {
    const fills = group.fills;
    // Somma PnL di tutti i fill dello stesso ordine
    const totalPnl = fills.reduce((sum, o) => sum + parseFloat(o.profit || o.pnl || o.realizedPnl || 0), 0);
    const outcome = totalPnl >= 0 ? 'win' : 'loss';

    // Usa il primo fill per metadata
    const first = fills[0];
    const sym = (first.symbol || '').replace('_UMCBL','').replace('_DMCBL','').replace('USDT','') || '?';
    const ts = first.cTime || first.createTime || first.updateTime;
    const dateStr = ts
      ? new Date(parseInt(ts)).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' })
        + ' ' + new Date(parseInt(ts)).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })
      : getTimestamp();

    const capBefore = runningCap;
    const capAfter = Math.max(capBefore + totalPnl, 0);
    runningCap = capAfter; // aggiorna capitale progressivo per il prossimo trade

    newTrades.push({
      phase: getPhase(capBefore),
      outcome,
      pnl: parseFloat(totalPnl.toFixed(2)),
      capAfter,
      date: dateStr,
      mode: 'bitget',
      symbol: sym,
      mood: '',
      bitgetOrderId: orderId
    });
    newIds.push(orderId);
  }

  if (newTrades.length === 0) return;

  // Calcola consecutiveLoss aggiornato
  let consecutiveLoss = currentState.consecutiveLoss;
  for (const t of newTrades) {
    if (t.outcome === 'loss') { consecutiveLoss++; }
    else { consecutiveLoss = 0; }
  }

  const updatedImportedIds = [...Array.from(importedIds), ...newIds];

  await saveState(Object.assign({}, currentState, {
    trades: [...currentState.trades, ...newTrades],
    consecutiveLoss,
    bitgetImportedIds: updatedImportedIds
  }));
}

function showBitgetDashConnected() {
  const d = document.getElementById('bitget-dash-disconnected');
  const c = document.getElementById('bitget-dash-connected');
  const dot = document.getElementById('bitget-dash-dot');
  const badge = document.getElementById('bitget-auto-badge');
  if (d) d.style.display = 'none';
  if (c) c.style.display = 'block';
  if (dot) { dot.className = 'bdot'; }
  if (badge) badge.style.display = '';
}

function showBitgetDashDisconnected() {
  const d = document.getElementById('bitget-dash-disconnected');
  const c = document.getElementById('bitget-dash-connected');
  const dot = document.getElementById('bitget-dash-dot');
  const badge = document.getElementById('bitget-auto-badge');
  if (d) d.style.display = 'block';
  if (c) c.style.display = 'none';
  if (dot) dot.className = 'bdot off';
  if (badge) badge.style.display = 'none';
}

function renderDashPositions(positions) {
  const wrap = document.getElementById('bitget-dash-positions');
  const wrapOuter = document.getElementById('bitget-dash-positions-wrap');
  if (!wrap) return;

  if (positions.length === 0) {
    if (wrapOuter) wrapOuter.style.display = 'none';
    return;
  }
  if (wrapOuter) wrapOuter.style.display = 'block';

  wrap.innerHTML = positions.map(p => {
    const side = (p.holdSide === 'long') ? 'long' : 'short';
    const pnl = parseFloat(p.unrealizedPL || p.unrealizedProfitLoss || 0);
    const sym = (p.symbol || '').replace('_UMCBL','').replace('_DMCBL','').replace('USDT','');
    const lev = p.leverage || '—';
    const size = parseFloat(p.total || p.available || 0);
    const entry = parseFloat(p.openPriceAvg || p.averageOpenPrice || 0);
    const liqPrice = parseFloat(p.liquidationPrice || p.liqPx || 0);
    const margin = parseFloat(p.marginSize || p.margin || 0);
    const pnlPct = margin > 0 ? (pnl / margin * 100) : 0;
    const barW = Math.min(Math.abs(pnlPct) * 2, 100).toFixed(1);
    const pnlCls = pnl >= 0 ? 'pos' : 'neg';
    return `<div class="bitget-pos-card ${side}">
      <div class="bitget-pos-top">
        <div class="bitget-pos-top-left">
          <span class="bitget-pos-sym">${sym}</span>
          <span class="bitget-pos-dir ${side}">${side === 'long' ? '↑ Long' : '↓ Short'}</span>
          <span class="bitget-pos-stat-val lev">${lev}x</span>
        </div>
        <div style="text-align:right">
          <div class="bitget-pos-pnl ${pnlCls}">${(pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2)}</div>
          <div style="font-size:10px;color:${pnl >= 0 ? 'var(--win)' : 'var(--loss)'};${pnl === 0 ? 'color:var(--text-dim)' : ''}">${(pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2)}%</div>
        </div>
      </div>
      <div class="bitget-pos-grid">
        <div class="bitget-pos-stat">
          <div class="bitget-pos-stat-label">Entry</div>
          <div class="bitget-pos-stat-val">${entry > 0 ? '$' + entry.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:4}) : '—'}</div>
        </div>
        <div class="bitget-pos-stat">
          <div class="bitget-pos-stat-label">Size</div>
          <div class="bitget-pos-stat-val">${size > 0 ? size.toFixed(4) : '—'}</div>
        </div>
        <div class="bitget-pos-stat">
          <div class="bitget-pos-stat-label">Margine</div>
          <div class="bitget-pos-stat-val">${margin > 0 ? '$' + margin.toFixed(2) : '—'}</div>
        </div>
        <div class="bitget-pos-stat">
          <div class="bitget-pos-stat-label">Liquidazione</div>
          <div class="bitget-pos-stat-val liq">${liqPrice > 0 ? '$' + liqPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:4}) : '—'}</div>
        </div>
      </div>
      <div class="bitget-pos-bar-wrap">
        <div class="bitget-pos-bar ${pnlCls}" style="width:${barW}%"></div>
      </div>
    </div>`;
  }).join('');
}


// Init dashboard on page load
function initBitgetDashboard() {
  const { apiKey, secret } = loadBitgetKeys();
  if (apiKey && secret) {
    showBitgetDashConnected();
    fetchAndRenderDashboard().catch(() => {});
    // Auto-refresh ogni 30 secondi
    if (bitgetAutoInterval) clearInterval(bitgetAutoInterval);
    bitgetAutoInterval = setInterval(() => {
      fetchAndRenderDashboard().catch(() => {});
    }, 30000);
  } else {
    showBitgetDashDisconnected();
  }
}

// Override saveBitgetApiKeys to also init dashboard after connection
const _origSaveBitgetKeys = window.saveBitgetApiKeys;
window.saveBitgetApiKeys = async function(...args) {
  await _origSaveBitgetKeys(...args);
  // After successful connection, init the dashboard too
  setTimeout(initBitgetDashboard, 500);
};


// also init bitget dashboard on load
document.addEventListener("DOMContentLoaded", initBitgetDashboard);



// ── READONLY BITGET DASHBOARD ──
function renderReadonlyBitgetDashboard(snap) {
  if (!snap || !snap.syncedAt) return;
  const disconnectedEl = document.getElementById('bitget-dash-disconnected');
  const connectedEl    = document.getElementById('bitget-dash-connected');
  const dot   = document.getElementById('bitget-dash-dot');
  const badge = document.getElementById('bitget-auto-badge');
  if (disconnectedEl) disconnectedEl.style.display = 'none';
  if (connectedEl) connectedEl.style.display = 'block';
  if (dot) dot.className = 'bdot';
  if (badge) { badge.style.display = ''; badge.textContent = '📸 Snapshot'; }
  const balEl = document.getElementById('bitget-dash-balance');
  if (balEl) balEl.textContent = '$' + parseFloat(snap.equity||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const upnlEl = document.getElementById('bitget-dash-upnl');
  if (upnlEl) { const u=parseFloat(snap.upnl||0); upnlEl.textContent=(u>=0?'+':'')+'$'+u.toFixed(2); upnlEl.className='bdm-val '+(u>0?'pnl-pos':u<0?'pnl-neg':''); }
  const upnlSub = document.getElementById('bitget-dash-upnl-sub');
  if (upnlSub) { const u=parseFloat(snap.upnl||0); upnlSub.textContent=u!==0?(u>0?'profitto aperto':'perdita aperta'):'nessuna posizione'; }
  const positions = snap.positions || [];
  const posCountEl = document.getElementById('bitget-dash-pos-count');
  if (posCountEl) posCountEl.textContent = positions.length;
  const posSub = document.getElementById('bitget-dash-pos-sub');
  if (posSub) posSub.textContent = positions.length===0?'nessuna aperta':positions.length===1?'1 posizione attiva':positions.length+' posizioni attive';
  renderDashPositions(positions);
  const timeEl = document.getElementById('bitget-sync-time');
  if (timeEl) { const d=new Date(snap.syncedAt); timeEl.textContent='Snapshot '+d.toLocaleDateString('it-IT')+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }
  const applyBtn = document.getElementById('bitget-apply-btn');
  if (applyBtn) applyBtn.style.display = 'none';
  const syncBtn = document.getElementById('bitget-dash-sync-btn');
  if (syncBtn) syncBtn.style.display = 'none';
}

init();