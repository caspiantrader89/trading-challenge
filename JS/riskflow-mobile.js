// ─── RISKFLOW MOBILE JS — STANDALONE ───
// Auth Firebase propria, nessuna dipendenza da riskflow.js

// ── FIREBASE CONFIG ──
const FB_CONFIG = {
  apiKey: "AIzaSyCk4EmpRqx0RH3qUh_YNp1u4eylYgfbCgo",
  authDomain: "trading-challenge-f3eb1.firebaseapp.com",
  projectId: "trading-challenge-f3eb1",
  storageBucket: "trading-challenge-f3eb1.firebasestorage.app",
};

// ── STATO MOBILE ──
const MS = {
  activeTab: 'calc',
  tpEnabled: false,
  currentUser: null,
  db: null,
  auth: null,
};

// ── INIT FIREBASE ──
async function mInitFirebase() {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const fbApp = initializeApp(FB_CONFIG, 'mobile-app');
  MS.auth = getAuth(fbApp);
  MS.db   = getFirestore(fbApp);

  onAuthStateChanged(MS.auth, async user => {
    if (user) {
      MS.currentUser = user;
      try {
        const snap = await getDoc(doc(MS.db, 'profiles', user.uid));
        const username = snap.exists() ? snap.data().username : user.email;
        mShowApp(username);
      } catch {
        mShowApp(user.email);
      }
    } else {
      MS.currentUser = null;
      document.getElementById('mAuthOverlay').classList.remove('hidden');
    }
  });

  // ── LOGIN ──
  window.mRfDoLogin = async function() {
    const user  = document.getElementById('mrf-login-user').value.trim();
    const pass  = document.getElementById('mrf-login-pass').value;
    const errEl = document.getElementById('mrf-login-err');
    const btn   = document.querySelector('#mrf-form-login .m-auth-btn');
    if (!user || !pass) { errEl.textContent = 'Compila tutti i campi.'; return; }
    btn.disabled = true; errEl.textContent = '';
    try {
      const q    = query(collection(MS.db, 'usernames'), where('username', '==', user.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) { errEl.textContent = 'Username non trovato.'; btn.disabled = false; return; }
      await signInWithEmailAndPassword(MS.auth, snap.docs[0].data().email, pass);
      // onAuthStateChanged si occupa del resto
    } catch(e) {
      errEl.textContent = e.code === 'auth/wrong-password' ? 'Password errata.' : 'Credenziali non valide.';
      btn.disabled = false;
    }
  };

  // ── REGISTER ──
  window.mRfDoRegister = async function() {
    const user  = document.getElementById('mrf-reg-user').value.trim().toLowerCase();
    const email = document.getElementById('mrf-reg-email').value.trim();
    const pass  = document.getElementById('mrf-reg-pass').value;
    const gdpr  = document.getElementById('mrf-reg-gdpr').checked;
    const errEl = document.getElementById('mrf-reg-err');
    const btn   = document.querySelector('#mrf-form-register .m-auth-btn');
    if (!gdpr)  { errEl.textContent = 'Accetta la Privacy Policy.'; return; }
    if (!user || !email || !pass) { errEl.textContent = 'Compila tutti i campi.'; return; }
    if (user.length < 3) { errEl.textContent = 'Username minimo 3 caratteri.'; return; }
    if (pass.length < 6) { errEl.textContent = 'Password minimo 6 caratteri.'; return; }
    btn.disabled = true; errEl.textContent = '';
    try {
      const unameDoc = await getDoc(doc(MS.db, 'usernames', user));
      if (unameDoc.exists()) { errEl.textContent = 'Username già in uso.'; btn.disabled = false; return; }
      const cred = await createUserWithEmailAndPassword(MS.auth, email, pass);
      await setDoc(doc(MS.db, 'usernames', user), { username: user, email, uid: cred.user.uid });
      await setDoc(doc(MS.db, 'profiles', cred.user.uid), { username: user, createdAt: Date.now() });
      // onAuthStateChanged si occupa del resto
    } catch(e) {
      let msg = 'Errore durante la registrazione.';
      if (e.code === 'auth/email-already-in-use') msg = 'Email già registrata.';
      if (e.code === 'auth/invalid-email') msg = 'Email non valida.';
      errEl.textContent = msg; btn.disabled = false;
    }
  };

  // ── FORGOT ──
  window.mRfDoForgot = async function() {
    const email = document.getElementById('mrf-forgot-email').value.trim();
    const errEl = document.getElementById('mrf-forgot-err');
    const okEl  = document.getElementById('mrf-forgot-ok');
    const btn   = document.querySelector('#mrf-form-forgot .m-auth-btn');
    if (!email) { errEl.textContent = 'Inserisci la tua email.'; return; }
    btn.disabled = true;
    try {
      await sendPasswordResetEmail(MS.auth, email);
      okEl.textContent = 'Email inviata!'; errEl.textContent = '';
    } catch {
      errEl.textContent = 'Email non trovata.'; okEl.textContent = '';
    }
    btn.disabled = false;
  };

  // ── LOGOUT ──
  window.mRfDoLogout = async function() {
    await signOut(MS.auth);
    document.getElementById('mAuthOverlay').classList.remove('hidden');
    document.getElementById('mLogoutBtn').style.display = 'none';
  };
}

// ── SHOW APP POST-LOGIN ──
function mShowApp(username) {
  document.getElementById('mAuthOverlay').classList.add('hidden');
  document.getElementById('mLogoutBtn').style.display = '';
  const uEl = document.getElementById('mUsername');
  if (uEl) uEl.textContent = username;
  // Carica chart
  if (window.loadCandles) loadCandles(S.symbol, S.tf);
  if (window.startTick)   startTick(S.symbol);
}

// ── TAB AUTH SWITCH ──
function mRfSwitchTab(tab) {
  ['login', 'register', 'forgot'].forEach(t => {
    document.getElementById('mrf-form-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.m-auth-tab').forEach((b, i) => {
    b.classList.toggle('active', ['login', 'register', 'forgot'][i] === tab);
  });
}

// ── TAB UI ──
function mSwitchTab(tab) {
  MS.activeTab = tab;
  document.querySelectorAll('.m-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.m-pane').forEach(p => p.classList.toggle('active', p.id === 'mpane-' + tab));
}

// ── DIREZIONE ──
function mSetDir(dir) {
  S.dir = dir;
  document.getElementById('mDirLong').classList.toggle('active', dir === 'long');
  document.getElementById('mDirShort').classList.toggle('active', dir === 'short');
  const btn = document.getElementById('mOpenBtn');
  btn.className = 'm-open-btn ' + dir;
  btn.textContent = 'OPEN ' + dir.toUpperCase();
  mCalc();
}

// ── RISK MODE ──
function mSetRiskMode(m) {
  S.riskMode = m;
  document.querySelectorAll('.risk-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
  const u = document.getElementById('mRiskUnit');
  if (u) u.textContent = m === 'pct' ? '%' : 'USDT';
  mCalc();
}

// ── LEVERAGE PRESETS ──
function mSetLev(v) {
  document.getElementById('mLevVal').value = v;
  document.querySelectorAll('.lev-p').forEach(b => b.classList.toggle('active', parseInt(b.dataset.lev) === v));
  mCalc();
}

// ── TOGGLE TP ──
function mToggleTP() {
  MS.tpEnabled = !MS.tpEnabled;
  const sw  = document.getElementById('mTpSw');
  const lbl = document.getElementById('mTpLbl');
  sw.classList.toggle('on', MS.tpEnabled);
  lbl.textContent = MS.tpEnabled ? 'ON' : 'OFF';
  document.querySelectorAll('.m-tp-row').forEach(r => r.classList.toggle('on', MS.tpEnabled));
  mCalc();
}

// ── CALCOLO ──
function mCalc() {
  const entry = parseFloat(document.getElementById('mEntryVal').value);
  const sl    = parseFloat(document.getElementById('mSlVal').value);
  const lev   = parseFloat(document.getElementById('mLevVal').value) || 10;
  const risk  = parseFloat(document.getElementById('mRiskVal').value);

  if (!entry || !sl || !risk) {
    document.getElementById('mCalcSize').textContent   = '—';
    document.getElementById('mCalcMargin').textContent = '—';
    document.getElementById('mCdSlDist').textContent   = '—';
    document.getElementById('mCdRiskUsd').textContent  = '—';
    document.getElementById('mCdRR').textContent       = '—';
    return;
  }

  const balance = S.balance || 4250;
  const riskUsd = S.riskMode === 'pct' ? balance * (risk / 100) : risk;
  const slDist  = Math.abs(entry - sl);
  const slPct   = slDist / entry;
  if (slPct <= 0) return;

  const posSize = riskUsd / slPct;
  const margin  = posSize / lev;

  document.getElementById('mCalcSize').textContent   = fmt(posSize);
  document.getElementById('mCalcMargin').textContent = fmt(margin) + ' USDT';
  document.getElementById('mCdSlDist').textContent   = fmtPrice(slDist);
  document.getElementById('mCdRiskUsd').textContent  = '$' + fmt(riskUsd);

  const tp1 = parseFloat(document.getElementById('mTp1').value);
  if (tp1 && MS.tpEnabled) {
    const tpDist = Math.abs(tp1 - entry);
    const rr = (tpDist / slDist).toFixed(2);
    document.getElementById('mCdRR').textContent = rr + ':1';
    document.getElementById('mRr1').textContent  = rr + ':1';
  } else {
    document.getElementById('mCdRR').textContent = '—';
  }

  S.balance = balance;
}

// ── SYNC FIELD → CHART ──
function mSyncLine(type) {
  const idMap = { mEntryVal: 'entry', mSlVal: 'sl', mTp1: 'tp1', mTp2: 'tp2', mTp3: 'tp3' };
  const lineType = idMap[type];
  if (!lineType) return;
  const val = parseFloat(document.getElementById(type).value);
  if (val && val > 0) {
    DRAG_PRICES[lineType] = val;
    setChartLine(lineType, val);
    drawCanvas();
  }
  mCalc();
}

// ── SET FIELD DA CHART ──
function mSetField(type, price) {
  const idMap = { entry: 'mEntryVal', sl: 'mSlVal', tp1: 'mTp1', tp2: 'mTp2', tp3: 'mTp3' };
  const elId = idMap[type];
  if (!elId) return;
  const el = document.getElementById(elId);
  if (el) el.value = fmtPrice(price);
  DRAG_PRICES[type] = price;
  setChartLine(type, price);
  drawCanvas();
  mCalc();
  mNotify('Set ' + type.toUpperCase() + ' → $' + fmtPrice(price), 'ok');
}

// ── NOTIFICA MOBILE ──
function mNotify(msg, type) {
  const el = document.getElementById('mNotif');
  el.textContent = msg;
  el.className = 'm-notif show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'm-notif', 2200);
}

// ─── LONG PRESS → CONTEXT MENU ───
let _lpTimer = null;
let _lpX = 0, _lpY = 0;
let _lpPrice = null;
let _lpMoved = false;

const mChartEl   = document.getElementById('mChart');
const mChartWrap = document.getElementById('mChartWrap');
const lpMenu     = document.getElementById('mLpMenu');
const lpRipple   = document.getElementById('mLpRipple');

function mShowLpMenu(clientX, clientY) {
  const menuW = 175, menuH = 190;
  let mx = clientX + 8;
  let my = clientY - 20;
  if (mx + menuW > window.innerWidth)  mx = clientX - menuW - 8;
  if (my + menuH > window.innerHeight) my = clientY - menuH;
  lpMenu.style.left = mx + 'px';
  lpMenu.style.top  = my + 'px';
  const isMarket = S.orderType === 'market';
  document.getElementById('mLpEntry').style.display = isMarket ? 'none' : 'flex';
  lpMenu.classList.add('open');
}

function mCloseLpMenu() {
  lpMenu.classList.remove('open');
  lpRipple.classList.remove('show');
}

mChartEl.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  _lpMoved = false;
  const t = e.touches[0];
  _lpX = t.clientX; _lpY = t.clientY;
  const wrap = mChartWrap.getBoundingClientRect();
  lpRipple.style.left = (_lpX - wrap.left) + 'px';
  lpRipple.style.top  = (_lpY - wrap.top) + 'px';
  _lpTimer = setTimeout(() => {
    if (_lpMoved) return;
    const rect = mChartEl.getBoundingClientRect();
    _lpPrice = mCandleSeries.coordinateToPrice(_lpY - rect.top);
    if (!_lpPrice) return;
    lpRipple.classList.add('show');
    if (navigator.vibrate) navigator.vibrate(30);
    mShowLpMenu(_lpX, _lpY);
  }, 500);
}, { passive: true });

mChartEl.addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (Math.abs(t.clientX - _lpX) > 8 || Math.abs(t.clientY - _lpY) > 8) {
    _lpMoved = true;
    clearTimeout(_lpTimer);
    mCloseLpMenu();
  }
}, { passive: true });

mChartEl.addEventListener('touchend', () => {
  clearTimeout(_lpTimer);
  if (!lpMenu.classList.contains('open')) lpRipple.classList.remove('show');
});

document.addEventListener('touchstart', e => {
  if (!lpMenu.contains(e.target) && !mChartEl.contains(e.target)) mCloseLpMenu();
}, { passive: true });

function mLpSet(type) {
  if (!_lpPrice) return;
  mSetField(type, _lpPrice);
  mCloseLpMenu();
}

// ─── TOUCH DRAG LINEE ───
const mDc  = document.getElementById('mDragCanvas');
const mCtx = mDc.getContext('2d');
let mDragState = null;
const M_GRAB_PX = 22;

function mResizeCanvas() {
  mDc.width  = mChartWrap.offsetWidth;
  mDc.height = mChartWrap.offsetHeight;
}

function mLineAtY(clientY) {
  const rect = mChartWrap.getBoundingClientRect();
  const y = clientY - rect.top;
  for (const type of ['entry', 'sl', 'tp1', 'tp2', 'tp3']) {
    const price = DRAG_PRICES[type];
    if (!price) continue;
    const lineY = mCandleSeries.priceToCoordinate(price);
    if (lineY === null) continue;
    if (Math.abs(y - lineY) <= M_GRAB_PX) return type;
  }
  return null;
}

mDc.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  const type = mLineAtY(t.clientY);
  if (type) {
    mDragState = { type };
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(15);
  }
}, { passive: false });

mDc.addEventListener('touchmove', e => {
  if (!mDragState || e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  const rect = mChartWrap.getBoundingClientRect();
  const y = t.clientY - rect.top;
  const price = mCandleSeries.coordinateToPrice(y);
  if (!price || price <= 0) return;
  DRAG_PRICES[mDragState.type] = price;
  const idMap = { entry: 'mEntryVal', sl: 'mSlVal', tp1: 'mTp1', tp2: 'mTp2', tp3: 'mTp3' };
  const el = document.getElementById(idMap[mDragState.type]);
  if (el) el.value = fmtPrice(price);
  setChartLine(mDragState.type, price);
  drawCanvas();
  mCalc();
}, { passive: false });

mDc.addEventListener('touchend', () => {
  if (mDragState) {
    mNotify('Set ' + mDragState.type.toUpperCase() + ' → $' + fmtPrice(DRAG_PRICES[mDragState.type]), 'ok');
    mDragState = null;
  }
});

function mUpdateCanvas() {
  const hasLine = Object.values(DRAG_PRICES).some(v => v !== null);
  mDc.classList.toggle('active', hasLine);
}

// ─── PAIR MODAL MOBILE ───
let _mPmCat = 'All';

function mOpenPairModal() {
  document.getElementById('mPairModal').classList.add('open');
  document.getElementById('mPmSearch').value = '';
  mRenderPairCats();
  mRenderPairs('');
  setTimeout(() => document.getElementById('mPmSearch').focus(), 100);
}

function mClosePairModal() {
  document.getElementById('mPairModal').classList.remove('open');
}

function mRenderPairCats() {
  const cats = ['All', ...new Set(ASSETS.map(a => a.cat))].sort();
  const el = document.getElementById('mPmCats');
  el.innerHTML = cats.map(c =>
    `<button class="mpm-cat${c === _mPmCat ? ' active' : ''}" onclick="mSetPmCat('${c}')">${c}</button>`
  ).join('');
}

function mSetPmCat(cat) {
  _mPmCat = cat;
  mRenderPairCats();
  mRenderPairs(document.getElementById('mPmSearch').value);
}

function mRenderPairs(filter) {
  filter = filter.toUpperCase();
  let list = ASSETS;
  if (_mPmCat !== 'All') list = list.filter(a => a.cat === _mPmCat);
  if (filter) list = list.filter(a => a.sym.includes(filter));
  const el = document.getElementById('mPmBody');
  if (!list.length) { el.innerHTML = '<div class="no-pos" style="padding:24px">Nessun pair trovato</div>'; return; }
  el.innerHTML = '<div class="mpm-grid">' + list.slice(0, 120).map(a => {
    const base = a.sym.replace('USDT', '');
    return `<div class="mpm-item${a.sym === S.symbol ? ' active' : ''}" onclick="mSelectPair('${a.sym}')">
      <div class="mpm-sym">${base}</div>
      <div class="mpm-base">USDT</div>
    </div>`;
  }).join('') + '</div>';
}

function mSelectPair(sym) {
  S.symbol = sym;
  document.getElementById('mSymName').textContent = sym.replace('USDT', '') + '/USDT';
  mClosePairModal();
  loadCandles(sym, S.tf);
  startTick(sym);
}

// ── TF BUTTONS ──
function mSetTF(tf) {
  S.tf = tf;
  document.querySelectorAll('.m-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  loadCandles(S.symbol, tf);
}

// ── UPDATE PRICE ──
function mUpdatePrice(price) {
  const el = document.getElementById('mPrice');
  if (el) el.textContent = fmtPrice(price);
}

// ── OPEN TRADE ──
function mOpenTrade() {
  const sync = [
    ['mEntryVal', 'entryVal'], ['mSlVal', 'slVal'],
    ['mTp1', 'tp1'], ['mTp2', 'tp2'], ['mTp3', 'tp3'],
    ['mLevVal', 'levVal'], ['mRiskVal', 'riskVal'],
  ];
  sync.forEach(([mId, dId]) => {
    const mEl = document.getElementById(mId);
    const dEl = document.getElementById(dId);
    if (mEl && dEl) dEl.value = mEl.value;
  });
  S.tpEnabled = MS.tpEnabled;
  openModal();
}

// ── RESIZE ──
window.addEventListener('resize', () => {
  mResizeCanvas();
  if (typeof mChart !== 'undefined') {
    mChart.resize(mChartWrap.offsetWidth, mChartWrap.offsetHeight);
  }
  drawCanvas();
});

// ── activateMClick ──
function activateMClick(type) {
  S.clickMode = type;
  mNotify('Tocca la chart per impostare ' + type.toUpperCase(), '');
  if (window.mChart) {
    mChart.subscribeClick(function handler(param) {
      if (!S.clickMode) return;
      const price = mCandleSeries.coordinateToPrice(param.point.y);
      if (price) {
        mSetField(S.clickMode, price);
        S.clickMode = null;
        mChart.unsubscribeClick(handler);
      }
    });
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  mResizeCanvas();
  mSwitchTab('calc');
  mSetDir('long');
  mSetRiskMode('pct');

  // Avvia Firebase auth autonoma
  mInitFirebase().catch(e => console.error('Firebase mobile init error:', e));

  // Patch updatePriceDisp
  const origUpdatePriceDisp = window.updatePriceDisp;
  window.updatePriceDisp = function(price, prev) {
    if (origUpdatePriceDisp) origUpdatePriceDisp(price, prev);
    mUpdatePrice(price);
    if (S.orderType === 'market') {
      const el = document.getElementById('mEntryVal');
      if (el) el.value = fmtPrice(price);
      mCalc();
    }
  };

  // Patch drawCanvas
  const origDrawCanvas = window.drawCanvas;
  window.drawCanvas = function() {
    if (origDrawCanvas) origDrawCanvas();
    mUpdateCanvas();
  };

  // Chart mobile
  const mChartWrapEl = document.getElementById('mChartWrap');
  if (window.LightweightCharts && mChartEl) {
    window.mChart = LightweightCharts.createChart(mChartEl, {
      width: mChartWrapEl.offsetWidth,
      height: mChartWrapEl.offsetHeight,
      layout: { background: { color: '#07070a' }, textColor: '#686878', fontFamily: 'DM Mono', fontSize: 11 },
      grid: {
        vertLines: { color: '#12121680', style: LightweightCharts.LineStyle.Dotted },
        horzLines: { color: '#12121680', style: LightweightCharts.LineStyle.Dotted },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: '#a855f750', width: 1, labelBackgroundColor: '#1c1c24' },
        horzLine: { color: '#a855f750', width: 1, labelBackgroundColor: '#1c1c24' },
      },
      rightPriceScale: { borderColor: '#1a1a22', textColor: '#686878', scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: '#1a1a22', timeVisible: true, secondsVisible: false },
      handleScale: { mouseWheel: false, pinch: true },
      handleScroll: { pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    });

    window.mCandleSeries = mChart.addCandlestickSeries({
      upColor: '#00d17a', downColor: '#ff2d4a',
      borderUpColor: '#00d17a', borderDownColor: '#ff2d4a',
      wickUpColor: '#00d17a', wickDownColor: '#ff2d4a',
    });

    // Override loadCandles per mobile
    const _origLoadCandles = window.loadCandles;
    window.loadCandles = async function(sym, tf) {
      const loadingEl = document.getElementById('mChartLoading');
      if (loadingEl) loadingEl.classList.remove('hidden');
      try {
        let data;
        const ex = (window.S && S.exchange) || localStorage.getItem('rf_exchange') || 'bitget';
        if (ex === 'bybit' || ex === 'bybit_demo') data = await fetchBybitCandles(sym, tf);
        else if (ex === 'weex') data = await fetchWeexCandles(sym, tf);
        else if (ex === 'bingx') data = await fetchBingxCandles(sym, tf);
        else data = await fetchCandles(sym, tf);
        if (data && data.length) {
          mCandleSeries.setData(data);
          mChart.timeScale().fitContent();
        }
      } catch(e) { console.warn('mobile loadCandles', e); }
      if (loadingEl) loadingEl.classList.add('hidden');
    };
  }
});
