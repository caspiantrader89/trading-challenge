// ─── RISKFLOW MOBILE JS ───
// Gestisce: tab UI, long press, touch drag linee, pair modal mobile

// ── STATO MOBILE ──
const MS = {
  activeTab: 'calc',
  tpEnabled: false,
};

// ── TAB SWITCHING ──
function mSwitchTab(tab) {
  MS.activeTab = tab;
  document.querySelectorAll('.m-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.m-pane').forEach(p => p.classList.toggle('active', p.id === 'mpane-' + tab));
}

// ── DIREZIONE LONG/SHORT ──
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
  const sw = document.getElementById('mTpSw');
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
    document.getElementById('mCalcSize').textContent = '—';
    document.getElementById('mCalcMargin').textContent = '—';
    document.getElementById('mCdSlDist').textContent = '—';
    document.getElementById('mCdRiskUsd').textContent = '—';
    document.getElementById('mCdRR').textContent = '—';
    return;
  }

  const balance = S.balance || 4250;
  const riskUsd = S.riskMode === 'pct' ? balance * (risk / 100) : risk;
  const slDist  = Math.abs(entry - sl);
  const slPct   = slDist / entry;
  if (slPct <= 0) return;

  const posSize = riskUsd / slPct;
  const margin  = posSize / lev;

  document.getElementById('mCalcSize').textContent = fmt(posSize);
  document.getElementById('mCalcMargin').textContent = fmt(margin) + ' USDT';
  document.getElementById('mCdSlDist').textContent = fmtPrice(slDist);
  document.getElementById('mCdRiskUsd').textContent = '$' + fmt(riskUsd);

  // R:R
  const tp1 = parseFloat(document.getElementById('mTp1').value);
  if (tp1 && MS.tpEnabled) {
    const tpDist = Math.abs(tp1 - entry);
    const rr = (tpDist / slDist).toFixed(2);
    document.getElementById('mCdRR').textContent = rr + ':1';
    document.getElementById('mRr1').textContent = rr + ':1';
  } else {
    document.getElementById('mCdRR').textContent = '—';
  }

  // sync con S per quando viene usato openModal
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

// ── SET FIELD FROM CHART PRICE ──
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

const mChartEl = document.getElementById('mChart');
const mChartWrap = document.getElementById('mChartWrap');
const lpMenu = document.getElementById('mLpMenu');
const lpRipple = document.getElementById('mLpRipple');

function mShowLpMenu(clientX, clientY) {
  const wrap = mChartWrap.getBoundingClientRect();
  const x = clientX - wrap.left;
  const y = clientY - wrap.top;

  // posizione menu dentro lo schermo
  const menuW = 175, menuH = 190;
  let mx = clientX + 8;
  let my = clientY - 20;
  if (mx + menuW > window.innerWidth) mx = clientX - menuW - 8;
  if (my + menuH > window.innerHeight) my = clientY - menuH;

  lpMenu.style.left = mx + 'px';
  lpMenu.style.top  = my + 'px';

  // mostra/nascondi voci in base al mode
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
  _lpX = t.clientX;
  _lpY = t.clientY;

  // ripple visivo
  const wrap = mChartWrap.getBoundingClientRect();
  lpRipple.style.left = (_lpX - wrap.left) + 'px';
  lpRipple.style.top  = (_lpY - wrap.top) + 'px';

  _lpTimer = setTimeout(() => {
    if (_lpMoved) return;
    // calcola prezzo
    const rect = mChartEl.getBoundingClientRect();
    _lpPrice = mCandleSeries.coordinateToPrice(_lpY - rect.top);
    if (!_lpPrice) return;
    lpRipple.classList.add('show');
    // vibrazione haptica
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
  if (!lpMenu.classList.contains('open')) {
    lpRipple.classList.remove('show');
  }
});

document.addEventListener('touchstart', e => {
  if (!lpMenu.contains(e.target) && !mChartEl.contains(e.target)) {
    mCloseLpMenu();
  }
}, { passive: true });

// voci menu
function mLpSet(type) {
  if (!_lpPrice) return;
  mSetField(type, _lpPrice);
  mCloseLpMenu();
}

// ─── TOUCH DRAG LINEE ───
const mDc = document.getElementById('mDragCanvas');
const mCtx = mDc.getContext('2d');
let mDragState = null;
const M_GRAB_PX = 22; // più ampio su touch

function mResizeCanvas() {
  mDc.width  = mChartWrap.offsetWidth;
  mDc.height = mChartWrap.offsetHeight;
}

function mLineAtY(clientY) {
  const rect = mChartWrap.getBoundingClientRect();
  const y = clientY - rect.top;
  for (const type of ['entry','sl','tp1','tp2','tp3']) {
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
    mDc.style.cursor = 'ns-resize';
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
  const idMap = { entry:'mEntryVal', sl:'mSlVal', tp1:'mTp1', tp2:'mTp2', tp3:'mTp3' };
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

// aggiorna pointer-events canvas quando ci sono linee
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
    const base = a.sym.replace('USDT','');
    return `<div class="mpm-item${a.sym === S.symbol ? ' active' : ''}" onclick="mSelectPair('${a.sym}')">
      <div class="mpm-sym">${base}</div>
      <div class="mpm-base">USDT</div>
    </div>`;
  }).join('') + '</div>';
}

function mSelectPair(sym) {
  S.symbol = sym;
  document.getElementById('mSymName').textContent = sym.replace('USDT','') + '/USDT';
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

// ── UPDATE PRICE DISPLAY ──
function mUpdatePrice(price, prev) {
  const el = document.getElementById('mPrice');
  if (el) el.textContent = fmtPrice(price);
  const chg = document.getElementById('mChg');
  // chg viene aggiornato dal ticker
}

// ── OPEN TRADE (riusa logica desktop) ──
function mOpenTrade() {
  // sync i valori mobile → S e campi desktop (per riusare openModal/executeOrder)
  const sync = [
    ['mEntryVal','entryVal'],['mSlVal','slVal'],
    ['mTp1','tp1'],['mTp2','tp2'],['mTp3','tp3'],
    ['mLevVal','levVal'],['mRiskVal','riskVal'],
  ];
  sync.forEach(([mId, dId]) => {
    const mEl = document.getElementById(mId);
    const dEl = document.getElementById(dId);
    if (mEl && dEl) dEl.value = mEl.value;
  });
  S.tpEnabled = MS.tpEnabled;
  document.getElementById('tp1en').checked = document.getElementById('mTp1en').checked;
  document.getElementById('tp2en').checked = document.getElementById('mTp2en').checked;
  document.getElementById('tp3en').checked = document.getElementById('mTp3en').checked;
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

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  mResizeCanvas();
  mSwitchTab('calc');
  mSetDir('long');
  mSetRiskMode('pct');

  // sync prezzi da chart quando aggiornati
  const origUpdatePriceDisp = window.updatePriceDisp;
  window.updatePriceDisp = function(price, prev) {
    if (origUpdatePriceDisp) origUpdatePriceDisp(price, prev);
    mUpdatePrice(price, prev);
    // aggiorna entry se in market mode
    if (S.orderType === 'market') {
      const el = document.getElementById('mEntryVal');
      if (el) el.value = fmtPrice(price);
      mCalc();
    }
  };

  // osserva drawCanvas per aggiornare pointer-events
  const origDrawCanvas = window.drawCanvas;
  window.drawCanvas = function() {
    if (origDrawCanvas) origDrawCanvas();
    mUpdateCanvas();
  };
});
