// ─── ASSETS ───
// Caricati dinamicamente da Bitget all'avvio
let ASSETS = [];

// Categorie euristiche basate su simbolo
function guessCat(sym){
  const s = sym.replace('USDT','').replace('PERP','');

  // Prefisso 1000x/10000x → sempre Meme
  if(/^1000|^10000/.test(s)) return 'Meme';

  const MAJOR   = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','TRX','SHIB','LTC','BCH','DOT','LINK','XLM','UNI','ATOM','ETC','SUI','STX','FIL','HBAR','IMX','VET','OP','ARB','MKR','AAVE','APT','NEAR','ICP']);
  const MEME    = new Set(['PEPE','WIF','BONK','FLOKI','MEME','POPCAT','BRETT','DOGS','NEIRO','TURBO','MOG','BABYDOGE','SAMO','CHEEMS','MYRO','BOME','SLERF','PONKE','GIGA','PNUT','GOAT','MOODENG','FWOG','SUNDOG','HMSTR','CATI','DOGE2','BABYPEPE','PEPE2','LADYS','SNEK','COQ','KISHU','AKITA','ELON','BOOMER','NORMIE','TOSHI','DEGEN','HIGHER','BENJI','ROCKY','BILLY','ANDY','RATS','ORDI','PIZZA','KEKIUS','SIGMA','GORK','CROC','LANDWOLF','WOJAK','COPE','CHAD','CULT','FOXY','SILLY']);
  const DEFI    = new Set(['UNI','AAVE','MKR','CRV','SNX','COMP','LDO','RUNE','JUP','RAY','DYDX','GMX','PENDLE','ENA','EIGEN','CAKE','BAL','1INCH','SUSHI','YFI','CVX','FXS','OSMO','KAVA','TIA','PYTH','ORCA','PERP','DODO','ALPHA','BOND','BIFI','BADGER','ANKR','CREAM','WEN','MNGO']);
  const L1L2    = new Set(['ARB','OP','SUI','APT','NEAR','FTM','ALGO','ATOM','ICP','FIL','HBAR','EGLD','FLOW','XTZ','MINA','KAS','STX','INJ','SEI','TAO','TON','MATIC','POL','ONE','CELO','ZIL','IOTA','THETA','QTUM','WAVES','NEO','LUNA','LUNC','KLAY','ROSE','MOVR','GLMR','ASTR','SDN','STRK','ZETA','METIS','BOBA','CELR','SKL','LRC','DUSK','XDC','STORJ','NKN','BERA','HYPE','MOVE','VIRTUAL','ZK','MANTA','ALT','SONIC','S','BLAST','SCROLL']);
  const AI      = new Set(['FET','RENDER','WLD','ARKM','AGIX','OCEAN','GRT','TAO','AI','NMR','CTXC','ORAI','ALI','AIOZ','RNDR','RSS3','LPT','GRASS','AKT','IO','AIUS','VANA','MASA','TRAC','CERE']);
  const GAMING  = new Set(['AXS','SAND','MANA','ENJ','GALA','ALICE','TLM','SLP','GHST','ILV','YGG','GODS','MC','RACA','MOBOX','SKILL','TOWER','DOSE','SPS','GLX','PIXEL','PORTAL','RON','BEAM','PRIME','GMEE','COMBO','PROM','CHESS','VOXEL','WEMIX','OAS','ACE','XAI','DRIFT','DUEL']);
  const EXCHANGE= new Set(['OKB','GT','HT','FTT','CRO','KCS','MX','WOO','NEXO','LEO','VGX']);

  if(MEME.has(s))     return 'Meme';
  if(MAJOR.has(s))    return 'Major';
  if(GAMING.has(s))   return 'Gaming';
  if(AI.has(s))       return 'AI';
  if(DEFI.has(s))     return 'DeFi';
  if(L1L2.has(s))     return 'L1/L2';
  if(EXCHANGE.has(s)) return 'Exchange';
  // Pattern meme aggiuntivi per nuovi token non in lista
  if(/(INU|MOON|SAFE|ELON|PEPE|SHIB|FLOKI|DOGE|APE|CHAD|WOJAK|CULT|COPE|BONK|WIF)/.test(s)) return 'Meme';
  return 'Altcoin';
}

async function loadBitgetPairs(){
  try{
    const r = await fetch('https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES');
    const j = await r.json();
    if(j.code==='00000' && j.data?.length){
      ASSETS = j.data
        .filter(x=>x.symbol&&x.symbol.endsWith('USDT'))
        .map(x=>({ sym:x.symbol, cat:guessCat(x.symbol) }))
        .sort((a,b)=>a.sym.localeCompare(b.sym));
    }
  }catch(e){
    console.warn('Bitget contracts fallback',e);
  }
  // Fallback se API non risponde
  if(!ASSETS.length){
    ASSETS = [
      {sym:'BTCUSDT',cat:'Major'},{sym:'ETHUSDT',cat:'Major'},{sym:'SOLUSDT',cat:'Major'},
      {sym:'BNBUSDT',cat:'Major'},{sym:'XRPUSDT',cat:'Major'},{sym:'ADAUSDT',cat:'Major'},
      {sym:'DOGEUSDT',cat:'Major'},{sym:'AVAXUSDT',cat:'Major'},{sym:'TRXUSDT',cat:'Major'},
      {sym:'LTCUSDT',cat:'Major'},{sym:'BCHUSDT',cat:'Major'},{sym:'DOTUSDT',cat:'Major'},
      {sym:'LINKUSDT',cat:'Major'},{sym:'UNIUSDT',cat:'DeFi'},{sym:'AAVEUSDT',cat:'DeFi'},
      {sym:'SUIUSDT',cat:'L1/L2'},{sym:'APTUSDT',cat:'L1/L2'},{sym:'ARBUSDT',cat:'L1/L2'},
      {sym:'OPUSDT',cat:'L1/L2'},{sym:'NEARUSDT',cat:'L1/L2'},{sym:'INJUSDT',cat:'L1/L2'},
      {sym:'PEPEUSDT',cat:'Meme'},{sym:'WIFUSDT',cat:'Meme'},{sym:'BONKUSDT',cat:'Meme'},
      {sym:'FETUSDT',cat:'AI'},{sym:'RENDERUSDT',cat:'AI'},{sym:'WLDUSDT',cat:'AI'},
    ];
  }
}

// ─── STATE ───
const S = {
  dir:'long', orderType:'market', riskMode:'pct', marginMode:'crossed',
  tpEnabled:false, balance:4250, symbol:'BTCUSDT', tf:'15m',
  lastPrice:null, clickMode:null, tickTimer:null,
};

// ─── CHART ───
const chartEl = document.getElementById('chart');
const chartWrap = document.getElementById('chartWrap');
const chart = LightweightCharts.createChart(chartEl,{
  width:chartEl.offsetWidth, height:chartEl.offsetHeight,
  layout:{background:{color:'#07070a'},textColor:'#686878',fontFamily:'DM Mono',fontSize:11},
  grid:{vertLines:{color:'#12121680',style:LightweightCharts.LineStyle.Dotted},horzLines:{color:'#12121680',style:LightweightCharts.LineStyle.Dotted}},
  crosshair:{mode:LightweightCharts.CrosshairMode.Normal,
    vertLine:{color:'#a855f750',width:1,style:LightweightCharts.LineStyle.Solid,labelBackgroundColor:'#1c1c24'},
    horzLine:{color:'#a855f750',width:1,style:LightweightCharts.LineStyle.Solid,labelBackgroundColor:'#1c1c24'}},
  rightPriceScale:{borderColor:'#1a1a22',textColor:'#686878',scaleMargins:{top:0.08,bottom:0.08}},
  timeScale:{borderColor:'#1a1a22',timeVisible:true,secondsVisible:false},
  handleScroll:{mouseWheel:true,pressedMouseMove:true},
  handleScale:{mouseWheel:true,pinch:true},
});
const candleSeries = chart.addCandlestickSeries({
  upColor:'#00d17a',downColor:'#ff2d4a',
  borderUpColor:'#00d17a',borderDownColor:'#ff2d4a',
  wickUpColor:'#00d17a88',wickDownColor:'#ff2d4a88',
  priceLineVisible:false,
});

// price lines registry
const LINES = {}; // key → priceLine object

const LINE_CFG = {
  entry:{color:'#ffc940',title:' ENTRY',lineWidth:1,lineStyle:0},
  sl:   {color:'#ff2d4a',title:' SL',   lineWidth:2,lineStyle:2},
  tp1:  {color:'#00d17a',title:' TP1',  lineWidth:1,lineStyle:2},
  tp2:  {color:'#00ffcc',title:' TP2',  lineWidth:1,lineStyle:2},
  tp3:  {color:'#3dddff',title:' TP3',  lineWidth:1,lineStyle:2},
};

// draggable line prices (independent from chart lines)
const DRAG_PRICES = {entry:null, sl:null, tp1:null, tp2:null, tp3:null};

function setChartLine(type, price){
  if(LINES[type]) candleSeries.removePriceLine(LINES[type]);
  if(!price){ LINES[type]=null; return; }
  LINES[type] = candleSeries.createPriceLine({price:parseFloat(price),axisLabelVisible:true,...LINE_CFG[type]});
  DRAG_PRICES[type] = parseFloat(price);
}
function removeChartLine(type){
  if(LINES[type]){ candleSeries.removePriceLine(LINES[type]); LINES[type]=null; }
  DRAG_PRICES[type]=null;
}

// sync chart line from input field
function syncLine(type){
  const idMap={entry:'entryVal',sl:'slVal',tp1:'tp1',tp2:'tp2',tp3:'tp3'};
  const v = parseFloat(document.getElementById(idMap[type]).value);
  if(v) setChartLine(type,v); else removeChartLine(type);
  drawCanvas();
}

// ═══════════════════════════════════════════════════
// DRAG CANVAS — tutte le linee draggabili
// Il canvas copre tutta la chart.
// pointer-events:none di default → la chart funziona normalmente.
// Quando una linea è impostata → pointer-events:all sul canvas,
// ma passiamo i click/scroll alla chart se non siamo in zona drag.
// ═══════════════════════════════════════════════════
const dc = document.getElementById('dragCanvas');
const ctx = dc.getContext('2d');

let dragState = null; // {type, startY, startPrice}
const GRAB_PX = 14; // zone in pixel attorno alla linea per iniziare drag

function resizeCanvas(){
  const r = chartWrap.getBoundingClientRect();
  dc.width  = r.width;
  dc.height = r.height;
}

function drawCanvas(){
  resizeCanvas();
  ctx.clearRect(0,0,dc.width,dc.height);
  window._closeZones = {}; // reset hit zones ogni frame

  // disegna tutte le linee che hanno un prezzo impostato
  let types;
  if(S.orderType==='market'){
    types = ['sl','tp1','tp2','tp3'];
  } else if(S.orderType==='ladder'){
    // ladder: linee ld1..ld4 + sl + tp
    types = [];
    for(let i=1;i<=4;i++) types.push('ld'+i);
    types.push('sl','tp1','tp2','tp3');
  } else {
    types = ['entry','sl','tp1','tp2','tp3'];
  }

  types.forEach(t => {
    const price = DRAG_PRICES[t];
    if(!price) return;
    const y = candleSeries.priceToCoordinate(price);
    if(y===null||y===undefined) return;
    drawDragLine(t, price, y);
  });

  // disegna overlay posizioni aperte (stile TradingView)
  drawPosLines();

  // aggiorna pointer-events: attivo se c'è almeno una linea
  const hasLine = types.some(t=>DRAG_PRICES[t]!=null)
    || (window._positions && window._positions.length > 0)
    || (window._posSLLines && Object.values(window._posSLLines).some(l=>l&&l.price))
    || (window._posTPLines && Object.values(window._posTPLines).some(l=>l&&l.price));
  dc.style.pointerEvents = hasLine ? 'all' : 'none';
}

// registry delle zone ✕ per hit-test nel mousedown
if(!window._closeZones) window._closeZones = {};

function drawDragLine(type, price, y){
  const W = dc.width;
  const colors = {
    entry:'#ffc940', sl:'#ff2d4a',
    tp1:'#00d17a',   tp2:'#00ffcc', tp3:'#3dddff',
    ld1:LADDER_COLORS[0], ld2:LADDER_COLORS[1], ld3:LADDER_COLORS[2], ld4:LADDER_COLORS[3],
  };
  const labels = {entry:'ENTRY',sl:'SL',tp1:'TP1',tp2:'TP2',tp3:'TP3',
    ld1:'L1',ld2:'L2',ld3:'L3',ld4:'L4'};
  const c = colors[type] || '#aaa';

  // Per linee ladder: mostra info size/% nel badge
  const isLadder = type.startsWith('ld');
  const lIdx = isLadder ? parseInt(type[2])-1 : -1;

  ctx.save();
  // linea tratteggiata
  ctx.strokeStyle = c;
  ctx.lineWidth = type==='sl' ? 1.5 : 1;
  ctx.setLineDash(type==='entry'?[]:[6,4]);
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // handle centrale — grippy
  const hw=70, hh=16;
  const hx=W/2-hw/2, hy=y-hh/2;
  ctx.fillStyle=c;
  rrect(ctx,hx,hy,hw,hh,4); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.8)';
  ctx.font='bold 9px "DM Mono",monospace';
  ctx.textAlign='center';
  ctx.fillText('⇅  '+labels[type]+'  ⇅', W/2, y+3.5);
  ctx.textAlign='left';

  // ✕ remove button — cerchietto SOPRA la linea, centrato sull'handle
  const xBtnX = W/2;
  const xBtnY = y - hh/2 - 10; // sopra l'handle
  const xBtnR = 7;
  // cerchio sfondo
  ctx.beginPath();
  ctx.arc(xBtnX, xBtnY, xBtnR, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(14,14,16,0.95)';
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // × symbol
  ctx.fillStyle = c;
  ctx.font = 'bold 9px "DM Mono",monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', xBtnX, xBtnY);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  // registra zona click per hit-test
  window._closeZones[type] = { x: xBtnX, y: xBtnY, r: xBtnR };

  // badge prezzo destra
  const pt='$'+fmtPrice(price);
  ctx.font='9px "DM Mono",monospace';
  const pw=ctx.measureText(pt).width+12;
  const px=W-pw-6;
  ctx.fillStyle=c; rrect(ctx,px,y-9,pw,18,3); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.9)';
  ctx.fillText(pt,px+6,y+3.5);

  // helper: pill centrato sulla linea, testo colore customizzabile
  const drawInfoPill = (text, offsetX, textColor) => {
    ctx.font = 'bold 9px "DM Mono",monospace';
    const tw = ctx.measureText(text).width;
    const pw = tw + 14, ph = 17;
    const px = W/2 + offsetX;
    const py = y - ph/2;
    ctx.fillStyle = c;
    rrect(ctx, px, py, pw, ph, 4); ctx.fill();
    ctx.fillStyle = textColor || 'rgba(255,255,255,0.95)';
    ctx.fillText(text, px + 7, y + 3.5);
  };

  // badge ENTRY: size USDT a sinistra, qty coin a destra — testo nero
  if(type==='entry'){
    const sl      = parseFloat(document.getElementById('slVal').value);
    const riskRaw = parseFloat(document.getElementById('riskVal').value);
    const bal     = S.balance||1000;
    if(sl && riskRaw && price){
      const slDist    = Math.abs(price - sl);
      const slDistPct = slDist / price * 100;
      if(slDistPct > 0){
        const riskUsd  = S.riskMode==='pct' ? (bal*riskRaw/100) : riskRaw;
        const sizeUsdt = riskUsd / (slDistPct/100);
        const coin     = sizeUsdt / price;
        const sym      = S.symbol.replace('USDT','');
        const leftText  = '$'+fmt(sizeUsdt)+' USDT';
        const rightText = fmt(coin)+' '+sym;
        ctx.font = 'bold 12px "DM Mono",monospace';
        const lw = ctx.measureText(leftText).width + 20;
        const lx = W/2 - 35 - lw - 8;
        const entPy = y - 22/2;
        ctx.fillStyle = c; rrect(ctx, lx, entPy, lw, 22, 5); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillText(leftText, lx+10, y+4.5);
        const rw = ctx.measureText(rightText).width + 20;
        const rx = W/2 + 35 + 8;
        ctx.fillStyle = c; rrect(ctx, rx, entPy, rw, 22, 5); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillText(rightText, rx+10, y+4.5);
      }
    }
  }

  // badge SL: a sinistra del handle "% Δprice", a destra "-$risk" — testo bianco
  if(type==='sl'){
    const entry = S.orderType==='market' ? S.lastPrice : parseFloat(document.getElementById('entryVal').value);
    if(entry){
      const dist    = Math.abs(entry-price);
      const pct     = (dist/entry*100).toFixed(2);
      const riskRaw = parseFloat(document.getElementById('riskVal').value);
      const bal     = S.balance||1000;
      const riskUsd = riskRaw ? (S.riskMode==='pct' ? (bal*riskRaw/100) : riskRaw) : null;
      // pill a sinistra del handle centrale (handle è centrato in W/2 ± 35px)
      const leftText  = pct+'%';
      const rightText = riskUsd ? '–$'+fmt(riskUsd)+' RISK' : null;
      ctx.font = 'bold 12px "DM Mono",monospace';
      const lw = ctx.measureText(leftText).width + 20;
      const lx = W/2 - 35 - lw - 8;
      const py = y - 22/2;
      ctx.fillStyle = c; rrect(ctx, lx, py, lw, 22, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(leftText, lx+10, y+4.5);
      if(rightText){
        const rw = ctx.measureText(rightText).width + 20;
        const rx = W/2 + 35 + 8;
        ctx.fillStyle = c; rrect(ctx, rx, py, rw, 22, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(rightText, rx+10, y+4.5);
      }
    }
  }

  // badge TP: a sinistra "+$gain  %" e a destra "R:R 1:x" — testo nero
  if(type==='tp1'||type==='tp2'||type==='tp3'){
    const entry = S.orderType==='market' ? S.lastPrice : parseFloat(document.getElementById('entryVal').value);
    const sl    = parseFloat(document.getElementById('slVal').value);
    if(entry && sl){
      const slDist  = Math.abs(entry-sl);
      const tpDist  = Math.abs(price-entry);
      const pct     = (tpDist/entry*100).toFixed(2);
      const rr      = slDist>0 ? (tpDist/slDist).toFixed(2) : null;
      const riskRaw = parseFloat(document.getElementById('riskVal').value);
      const bal     = S.balance||1000;
      const riskUsd = riskRaw ? (S.riskMode==='pct' ? (bal*riskRaw/100) : riskRaw) : null;
      const tpNum = type==='tp1'?1:type==='tp2'?2:3;
      const tpPctEl = document.getElementById('tpPct'+tpNum);
      const tpPct = tpPctEl ? parseFloat(tpPctEl.value)||100 : 100;
      const gainUsd = (riskUsd && slDist>0) ? riskUsd*(tpDist/slDist)*(tpPct/100) : null;
      const leftText  = (gainUsd ? '+$'+fmt(gainUsd)+'  ' : '') + pct+'%';
      const rightText = rr ? 'R:R  1:'+rr : null;
      ctx.font = 'bold 12px "DM Mono",monospace';
      const lw = ctx.measureText(leftText).width + 20;
      const lx = W/2 - 35 - lw - 8;
      const py = y - 22/2;
      ctx.fillStyle = c; rrect(ctx, lx, py, lw, 22, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(leftText, lx+10, y+4.5);
      if(rightText){
        const rw = ctx.measureText(rightText).width + 20;
        const rx = W/2 + 35 + 8;
        ctx.fillStyle = c; rrect(ctx, rx, py, rw, 22, 5); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillText(rightText, rx+10, y+4.5);
      }
    }
  }

  // badge LADDER: mostra % peso e size
  if(isLadder){
    const sl = parseFloat(document.getElementById('slVal').value);
    const riskRaw = parseFloat(document.getElementById('riskVal').value);
    const bal = S.balance||1000;
    const lev = parseFloat(document.getElementById('levVal').value)||1;
    const riskUsd = S.riskMode==='pct' ? (bal*riskRaw/100) : riskRaw;

    // Find weight for this order
    const n = LADDER.n;
    const activeOrders = [];
    for(let i=0;i<n;i++){
      const o=LADDER.orders[i];
      if(o.enabled!==false && o.price && o.price>0) activeOrders.push({i,price:o.price});
    }
    const aIdx = activeOrders.findIndex(o=>o.i===lIdx);
    if(aIdx>=0 && sl && riskRaw){
      const prices = activeOrders.map(o=>o.price);
      const weights = getLadderWeights(activeOrders.length, prices);
      const w = weights[aIdx]/100;
      const orderRisk = riskUsd * w;
      const slDist = Math.abs(price - sl);
      const slDistPct = slDist / price * 100;
      const size = slDistPct>0 ? orderRisk/(slDistPct/100) : 0;
      const pctText = weights[aIdx].toFixed(1)+'%';
      const sizeText = '$'+fmt(size);
      ctx.font = 'bold 11px "DM Mono",monospace';
      const lw = ctx.measureText(pctText).width + 16;
      const lx = W/2 - 35 - lw - 8;
      const py2 = y - 20/2;
      ctx.fillStyle = c; rrect(ctx,lx,py2,lw,20,4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(pctText, lx+8, y+3.5);
      const rw = ctx.measureText(sizeText).width + 16;
      const rx = W/2 + 35 + 8;
      ctx.fillStyle = c; rrect(ctx,rx,py2,rw,20,4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(sizeText, rx+8, y+3.5);
    }
  }

  ctx.restore();
}

function rrect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y);
  c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r);
  c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h);
  c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r);
  c.quadraticCurveTo(x,y,x+r,y);
  c.closePath();
}

// ═══════════════════════════════════════════════════════════════
// POSITION OVERLAY LINES — TradingView-style labels per posizioni
// ═══════════════════════════════════════════════════════════════

// Registry hit zones per click su TP/SL buttons e X delle pos lines
if(!window._posLineZones) window._posLineZones = {};

function drawPosLines() {
  if (!window._positions || !window._positions.length) return;
  window._posLineZones = {};

  window._positions.forEach((p, idx) => {
    const side   = (p.holdSide || 'long').toLowerCase();
    const entry  = parseFloat(p.openPriceAvg || p.averageOpenPrice || p.openAvgPrice || 0);
    const size   = parseFloat(p.total || p.available || 0);
    const upnl   = parseFloat(p.unrealizedPL || p.unrealizedProfitLoss || p.unrealizedPnl || 0);
    const sl     = parseFloat(p.stopLoss || p.stopLossPrice || p.presetStopLossPrice || 0);
    const tp     = parseFloat(p.takeProfit || p.takeProfitPrice || p.presetTakeProfitPrice || 0);
    const sym    = (p.symbol || '').replace(/_?UMCBL|_?DMCBL/g, '').replace('USDT', '');

    // Mostra la posizione solo se il simbolo corrisponde al grafico attivo
    const currentSym = (S.symbol || '').replace('USDT', '');
    if (sym !== currentSym) return;

    if (!entry || entry <= 0) return;

    const entryY = candleSeries.priceToCoordinate(entry);
    if (entryY === null || entryY === undefined) return;

    const isLong = side === 'long';
    const entryColor = isLong ? '#2962ff' : '#f7525f'; // blu per long, rosso per short
    const pnlColor   = upnl >= 0 ? '#26a69a' : '#ef5350';

    const W = dc.width;

    // ── ENTRY LINE ──────────────────────────────────────────────
    // Linea sottile solida
    ctx.save();
    ctx.strokeStyle = entryColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(0, entryY); ctx.lineTo(W, entryY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Label principale CENTRATA: "Long  0.0018 BTC  +11.20 USD"
    const sideLabel  = isLong ? 'Long' : 'Short';
    const coinStr    = fmt6(size) + ' ' + sym;
    const pnlStr     = (upnl >= 0 ? '+' : '') + fmt(upnl) + ' USD';

    const FONT_LABEL = 'bold 11px "DM Mono",monospace';
    ctx.font = FONT_LABEL;

    // misure testo
    const sideW  = ctx.measureText(sideLabel).width;
    ctx.font = '11px "DM Mono",monospace';
    const coinW  = ctx.measureText(coinStr).width;
    const pnlW   = ctx.measureText(pnlStr).width;

    const PAD = 8, GAP = 6, H = 22, R = 4;

    // Calcola larghezza totale del gruppo di pill
    const sidePillW = sideW + PAD * 2;
    const coinPillW = coinW + PAD * 2;
    const pnlPillW  = pnlW  + PAD * 2;
    const totalGroupW = sidePillW + GAP + coinPillW + GAP + pnlPillW;

    // Centra il gruppo sull'asse X della chart
    const groupStartX = W / 2 - totalGroupW / 2;
    const pillY       = entryY - H / 2;

    // pill Side (sfondo entryColor)
    const startX = groupStartX;
    ctx.fillStyle = entryColor;
    rrect(ctx, startX, pillY, sidePillW, H, R); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = FONT_LABEL;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sideLabel, startX + PAD, entryY);

    // pill Coin (sfondo scuro bordo entryColor)
    const coinX = startX + sidePillW + GAP;
    ctx.fillStyle = 'rgba(20,20,28,0.92)';
    rrect(ctx, coinX, pillY, coinPillW, H, R); ctx.fill();
    ctx.strokeStyle = entryColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = entryColor;
    ctx.font = '11px "DM Mono",monospace';
    ctx.fillText(coinStr, coinX + PAD, entryY);

    // pill PnL (sfondo scuro bordo pnlColor)
    const pnlX = coinX + coinPillW + GAP;
    ctx.fillStyle = 'rgba(20,20,28,0.92)';
    rrect(ctx, pnlX, pillY, pnlPillW, H, R); ctx.fill();
    ctx.strokeStyle = pnlColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = pnlColor;
    ctx.fillText(pnlStr, pnlX + PAD, entryY);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    // ── SL LINE ─────────────────────────────────────────────────
    // Priorità: registry _posSLLines (aggiornato da drag/sync) > campo grezzo posizione
    const slPrice = (window._posSLLines && window._posSLLines[idx] && window._posSLLines[idx].price)
      ? window._posSLLines[idx].price : sl;
    if (slPrice && slPrice > 0) {
      const slY = candleSeries.priceToCoordinate(slPrice);
      if (slY !== null && slY !== undefined) {
        _drawPosSubLine(idx, 'sl', slPrice, slY, upnl, entry, size, sym, isLong, W);
      }
    }

    // ── TP LINE ─────────────────────────────────────────────────
    // Priorità: registry _posTPLines > campo grezzo posizione
    const tpPrice = (window._posTPLines && window._posTPLines[idx+'_1'] && window._posTPLines[idx+'_1'].price)
      ? window._posTPLines[idx+'_1'].price : tp;
    if (tpPrice && tpPrice > 0) {
      const tpY = candleSeries.priceToCoordinate(tpPrice);
      if (tpY !== null && tpY !== undefined) {
        _drawPosSubLine(idx, 'tp', tpPrice, tpY, upnl, entry, size, sym, isLong, W);
      }
    }
  });
}

function fmt6(n) {
  if (!n) return '0';
  // mostra fino a 6 decimali significativi
  const s = n.toPrecision(4);
  return parseFloat(s).toString();
}

function _drawPosSubLine(idx, lineType, price, y, upnl, entry, size, sym, isLong, W) {
  const isSL = lineType === 'sl';
  const lineColor = isSL ? '#f7525f' : '#00b96b';

  ctx.save();

  // ── LINEA tratteggiata ──
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = isSL ? 1.5 : 1;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ── calcola P&L a questo livello ──
  const pnlAtLevel = (isLong ? (price - entry) : (entry - price)) * size;
  const pnlColor   = pnlAtLevel >= 0 ? '#26a69a' : '#ef5350';
  const pnlStr     = (pnlAtLevel >= 0 ? '+' : '') + fmt(pnlAtLevel) + ' USD';

  // distanza % dall'entry
  const distPct = entry > 0 ? ((Math.abs(price - entry) / entry) * 100).toFixed(2) + '%' : '';

  // ── GRUPPO 3 PILL CENTRATO (identico alla entry line) ──
  // pill 1: tipo SL/TP (sfondo pieno lineColor)
  // pill 2: quantità token (sfondo scuro bordo lineColor)
  // pill 3: PnL at level (sfondo scuro bordo pnlColor)
  const typeLabel = (isSL ? 'SL' : 'TP') + '#' + (idx + 1);
  const coinStr   = fmt6(size) + ' ' + sym;

  const FONT_BOLD = 'bold 11px "DM Mono",monospace';
  const FONT_REG  = '11px "DM Mono",monospace';
  ctx.font = FONT_BOLD;
  const typeW = ctx.measureText(typeLabel).width;
  ctx.font = FONT_REG;
  const coinW = ctx.measureText(coinStr).width;
  const pnlW  = ctx.measureText(pnlStr).width;

  const PAD = 8, GAP = 6, H = 22, R = 4;
  const typePillW = typeW + PAD * 2;
  const coinPillW = coinW + PAD * 2;
  const pnlPillW  = pnlW  + PAD * 2;
  const totalGroupW = typePillW + GAP + coinPillW + GAP + pnlPillW;

  const groupStartX = W / 2 - totalGroupW / 2;
  const pillY = y - H / 2;

  // pill tipo
  ctx.fillStyle = lineColor;
  rrect(ctx, groupStartX, pillY, typePillW, H, R); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeLabel, groupStartX + PAD, y);

  // pill coin
  const coinX = groupStartX + typePillW + GAP;
  ctx.fillStyle = 'rgba(20,20,28,0.92)';
  rrect(ctx, coinX, pillY, coinPillW, H, R); ctx.fill();
  ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = lineColor;
  ctx.font = FONT_REG;
  ctx.fillText(coinStr, coinX + PAD, y);

  // pill PnL
  const pnlX = coinX + coinPillW + GAP;
  ctx.fillStyle = 'rgba(20,20,28,0.92)';
  rrect(ctx, pnlX, pillY, pnlPillW, H, R); ctx.fill();
  ctx.strokeStyle = pnlColor; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = pnlColor;
  ctx.fillText(pnlStr, pnlX + PAD, y);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // ── ✕ remove button — cerchietto SOPRA il gruppo, centrato ──
  const xBtnX = W / 2;
  const xBtnY = pillY - 10;
  const xBtnR = 7;
  ctx.beginPath();
  ctx.arc(xBtnX, xBtnY, xBtnR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,14,16,0.95)'; ctx.fill();
  ctx.strokeStyle = lineColor; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = lineColor;
  ctx.font = 'bold 9px "DM Mono",monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✕', xBtnX, xBtnY);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  window._posLineZones[`${lineType}_x_${idx}`] = { x: xBtnX - xBtnR, y: xBtnY - xBtnR, w: xBtnR * 2, h: xBtnR * 2, idx, action: `remove_${lineType}` };

  // ── badge distanza % a SINISTRA del gruppo ──
  if (distPct) {
    ctx.font = 'bold 10px "DM Mono",monospace';
    const dw = ctx.measureText(distPct).width + 14;
    const dx = groupStartX - 8 - dw;
    const dy = y - 18 / 2;
    ctx.fillStyle = 'rgba(20,20,28,0.92)';
    rrect(ctx, dx, dy, dw, 18, 3); ctx.fill();
    ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = lineColor;
    ctx.fillText(distPct, dx + 7, y + 3.5);
  }

  // ── BE button a DESTRA del gruppo (solo SL) ──
  if (isSL) {
    const beLabel = 'BE';
    ctx.font = 'bold 9px "DM Mono",monospace';
    const beW = ctx.measureText(beLabel).width + 16;
    const beH = 18;
    const beX = groupStartX + totalGroupW + 8;
    const beY = y - beH / 2;
    ctx.fillStyle = '#ffc940';
    rrect(ctx, beX, beY, beW, beH, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(beLabel, beX + beW / 2, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    window._posLineZones[`sl_be_${idx}`] = { x: beX, y: beY, w: beW, h: beH, idx, action: 'be' };
  }

  // ── badge prezzo vicino asse Y (destra) ──
  const priceStr = '$' + fmtPrice(price);
  ctx.font = '9px "DM Mono",monospace';
  const priceW2 = ctx.measureText(priceStr).width + 12;
  const priceX2 = W - priceW2 - 6;
  ctx.fillStyle = lineColor;
  rrect(ctx, priceX2, y - 9, priceW2, 18, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillText(priceStr, priceX2 + 6, y + 3.5);

  ctx.restore();
}

function lineAtY(clientY){
  // returns the type of the line closest to clientY, or null
  const rect = chartWrap.getBoundingClientRect();
  const y = clientY - rect.top;
  let types;
  if(S.orderType==='market'){
    types=['sl','tp1','tp2','tp3'];
  } else if(S.orderType==='ladder'){
    types=['ld1','ld2','ld3','ld4','sl','tp1','tp2','tp3'];
  } else {
    types=['entry','sl','tp1','tp2','tp3'];
  }
  let best=null, bestD=GRAB_PX;
  types.forEach(t=>{
    const p=DRAG_PRICES[t]; if(!p) return;
    const ly=candleSeries.priceToCoordinate(p);
    if(ly===null) return;
    const d=Math.abs(y-ly);
    if(d<bestD){bestD=d;best=t;}
  });
  return best;
}

// CANVAS EVENTS
dc.addEventListener('mousedown', e=>{
  if(S.clickMode) return;
  // ── controlla click su ✕ ──
  const rect0 = chartWrap.getBoundingClientRect();
  const cx = e.clientX - rect0.left, cy = e.clientY - rect0.top;
  // ── controlla click su zone posizioni aperte (TP btn, SL btn, X, BE) ──
  if(window._posLineZones){
    for(const [key,z] of Object.entries(window._posLineZones)){
      const hit = cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;
      if(hit){
        const idx = z.idx;
        const action = z.action;
        if(action === 'tp'){
          const el = document.getElementById('pos-tp1-input-'+idx);
          if(el){ el.focus(); el.select(); }
          notify('Modifica TP posizione '+(idx+1),'');
        } else if(action === 'sl'){
          const el = document.getElementById('pos-sl-input-'+idx);
          if(el){ el.focus(); el.select(); }
          notify('Modifica SL posizione '+(idx+1),'');
        } else if(action === 'be'){
          // BE button dalla chart — chiama moveToBreakeven
          if(window.moveToBreakeven) window.moveToBreakeven(idx);
        } else if(action === 'remove_sl'){
          const slLine = window._posSLLines && window._posSLLines[idx];
          if(slLine && slLine.priceLine){
            try{ candleSeries.removePriceLine(slLine.priceLine); }catch(_){}
            slLine.priceLine = null; slLine.price = null;
          }
          if(window._positions && window._positions[idx]) window._positions[idx].stopLoss = 0;
          drawCanvas();
          notify('Linea SL rimossa dalla chart','');
        } else if(action === 'remove_tp'){
          const tpLine = window._posTPLines && window._posTPLines[idx+'_1'];
          if(tpLine && tpLine.priceLine){
            try{ candleSeries.removePriceLine(tpLine.priceLine); }catch(_){}
            tpLine.priceLine = null; tpLine.price = null;
          }
          if(window._positions && window._positions[idx]) window._positions[idx].takeProfit = 0;
          drawCanvas();
          notify('Linea TP rimossa dalla chart','');
        }
        e.preventDefault(); e.stopPropagation(); return;
      }
    }
  }
  if(window._closeZones){
    for(const [t,z] of Object.entries(window._closeZones)){
      if(Math.hypot(cx-z.x, cy-z.y) <= z.r+4){
        const idMap={entry:'entryVal',sl:'slVal',tp1:'tp1',tp2:'tp2',tp3:'tp3'};
        if(t.startsWith('ld')){
          const lIdx=parseInt(t[2])-1;
          LADDER.orders[lIdx].price=null;
          if(LADDER.orders[lIdx].priceLine){
            try{candleSeries.removePriceLine(LADDER.orders[lIdx].priceLine);}catch(_){}
            LADDER.orders[lIdx].priceLine=null;
          }
          DRAG_PRICES[t]=null;
          const el2=document.getElementById('ladd-price-'+lIdx); if(el2) el2.value='';
          calcLadder();
        } else {
          if(idMap[t]) document.getElementById(idMap[t]).value='';
          removeChartLine(t);
          if(t==='entry'){ DRAG_PRICES.entry=null; }
        }
        drawCanvas(); calc();
        notify('Rimossa linea '+t.toUpperCase(),'');
        e.preventDefault(); e.stopPropagation(); return;
      }
    }
  }
  // ── controlla drag posizioni SL/TP ──
  const posLine = posLineAtY(e.clientY);
  if(posLine){
    window._posDragState = posLine;
    dc.style.cursor = 'ns-resize';
    e.preventDefault(); e.stopPropagation(); return;
  }
  const type = lineAtY(e.clientY);
  if(!type){
    // nessuna linea vicina — passa evento alla chart
    dc.style.pointerEvents='none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if(el) el.dispatchEvent(new MouseEvent('mousedown', e));
    setTimeout(()=>{ if(!dragState) dc.style.pointerEvents='all'; },100);
    return;
  }
  dragState = {type};
  dc.style.cursor='ns-resize';
  e.preventDefault();
  e.stopPropagation();
});

dc.addEventListener('wheel', e=>{
  // passa sempre lo scroll alla chart sotto
  dc.style.pointerEvents='none';
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if(el) el.dispatchEvent(new WheelEvent('wheel', e));
  setTimeout(()=>{ dc.style.pointerEvents='all'; },50);
}, {passive:false});

dc.addEventListener('mousemove', e=>{
  if(!dragState && !window._posDragState){
    const rect0 = chartWrap.getBoundingClientRect();
    const cx = e.clientX - rect0.left, cy = e.clientY - rect0.top;
    // controlla hover su zone posizioni (TP btn, SL btn, X, BE)
    if(window._posLineZones){
      for(const z of Object.values(window._posLineZones)){
        if(cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h){
          dc.style.cursor='pointer';
          return;
        }
      }
    }
    // controlla hover su ✕
    if(window._closeZones){
      for(const z of Object.values(window._closeZones)){
        if(Math.hypot(cx-z.x, cy-z.y) <= z.r+4){
          dc.style.cursor='pointer';
          return;
        }
      }
    }
    // controlla hover su pos lines
    const posLine = posLineAtY(e.clientY);
    if(posLine){ dc.style.cursor='ns-resize'; return; }

    const nearLine = lineAtY(e.clientY);
    dc.style.cursor = nearLine ? 'ns-resize' : 'default';
    if(!nearLine){
      // passa il mousemove alla chart per pan verticale
      dc.style.pointerEvents='none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if(el) el.dispatchEvent(new MouseEvent('mousemove', e));
      setTimeout(()=>{ if(!dragState && !window._posDragState) dc.style.pointerEvents='all'; },50);
    }
    return;
  }

  e.preventDefault();
  const rect=chartWrap.getBoundingClientRect();
  const y=e.clientY-rect.top;
  const price=candleSeries.coordinateToPrice(y);
  if(!price||price<=0) return;

  // ── DRAG pos SL/TP ──
  if(window._posDragState){
    const pd = window._posDragState;
    if(pd.type === 'sl'){
      const entry = window._posSLLines[pd.idx];
      if(!entry) return;
      // aggiorna prezzo
      entry.price = price;
      // aggiorna priceLine
      if(entry.priceLine){ try{candleSeries.removePriceLine(entry.priceLine);}catch(_){} }
      entry.priceLine = candleSeries.createPriceLine({
        price, color:'#ff2d4a', lineWidth:1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible:true, title:` SL#${pd.idx+1}`,
      });
      // aggiorna input nel pannello
      const inp = document.getElementById('pos-sl-input-'+pd.idx);
      if(inp) inp.value = fmtPrice(price);
      // aggiorna posizione in memoria per drawCanvas
      if(window._positions && window._positions[pd.idx]) window._positions[pd.idx].stopLoss = price;
    } else if(pd.type === 'tp'){
      const key = pd.key || `${pd.idx}_${pd.tpN||1}`;
      const entry = window._posTPLines[key];
      if(!entry) return;
      entry.price = price;
      if(entry.priceLine){ try{candleSeries.removePriceLine(entry.priceLine);}catch(_){} }
      entry.priceLine = candleSeries.createPriceLine({
        price, color: entry.color || '#00d17a', lineWidth:1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible:true, title:` TP${entry.tpN}#${entry.posIdx+1}`,
      });
      const inp = document.getElementById(`pos-tp${entry.tpN}-input-${entry.posIdx}`);
      if(inp) inp.value = fmtPrice(price);
      if(window._positions && window._positions[entry.posIdx]) window._positions[entry.posIdx].takeProfit = price;
    }
    drawCanvas();
    return;
  }

  DRAG_PRICES[dragState.type]=price;

  // aggiorna campo input
  const idMap={entry:'entryVal',sl:'slVal',tp1:'tp1',tp2:'tp2',tp3:'tp3'};
  if(dragState.type.startsWith('ld')){
    // aggiorna prezzo ordine ladder
    const lIdx = parseInt(dragState.type[2])-1;
    LADDER.orders[lIdx].price = price;
    const el2 = document.getElementById('ladd-price-'+lIdx);
    if(el2) el2.value = fmtPrice(price);
    // aggiorna priceLine
    if(LADDER.orders[lIdx].priceLine){
      try{ candleSeries.removePriceLine(LADDER.orders[lIdx].priceLine); }catch(_){}
    }
    LADDER.orders[lIdx].priceLine = candleSeries.createPriceLine({
      price, color:LADDER_COLORS[lIdx], title:' L'+(lIdx+1),
      lineWidth:1, lineStyle:0, axisLabelVisible:true,
    });
    calcLadder();
  } else {
    const el=document.getElementById(idMap[dragState.type]);
    if(el) el.value=fmtPrice(price);
    // aggiorna linea
    setChartLine(dragState.type, price);
  }
  drawCanvas();
});

dc.addEventListener('mouseup', e=>{
  // ── fine drag pos SL/TP → applica valore al pannello e mostra notify ──
  if(window._posDragState){
    const pd = window._posDragState;
    window._posDragState = null;
    dc.style.cursor = 'default';
    if(pd.type === 'sl'){
      const entry = window._posSLLines[pd.idx];
      if(entry && entry.price){
        // Aggiorna l'input nel pannello già fatto in mousemove; qui solo notify
        notify(`⇅ SL#${pd.idx+1} → $${fmtPrice(entry.price)} — premi Set SL per confermare`, '');
      }
    } else if(pd.type === 'tp'){
      const key = pd.key || `${pd.idx}_${pd.tpN||1}`;
      const entry = window._posTPLines[key];
      if(entry && entry.price){
        notify(`⇅ TP${entry.tpN}#${entry.posIdx+1} → $${fmtPrice(entry.price)} — premi Set per confermare`, '');
      }
    }
    drawCanvas();
    return;
  }
  if(dragState){
    const t=dragState.type;
    dragState=null;
    dc.style.cursor='default';
    if(t.startsWith('ld')){
      calcLadder();
      notify('Set '+t.toUpperCase()+' → $'+fmtPrice(DRAG_PRICES[t]),'ok');
    } else {
      calc(); // calc solo al rilascio, non durante il drag
      notify('Set '+t.toUpperCase()+' → $'+fmtPrice(DRAG_PRICES[t]),'ok');
    }
  }
});

document.addEventListener('mouseup',()=>{ dragState=null; window._posDragState=null; });

// ridisegna se la chart scrolla/zooma
chart.timeScale().subscribeVisibleTimeRangeChange(()=>drawCanvas());
chart.subscribeCrosshairMove(()=>{ if(!dragState) drawCanvas(); });
window.addEventListener('resize',()=>{
  chart.resize(chartEl.offsetWidth,chartEl.offsetHeight);
  drawCanvas();
});

// ─── RIGHT CLICK CONTEXT MENU ───
let ctxPrice=null;
chartEl.addEventListener('contextmenu',e=>{
  e.preventDefault();
  const rect=chartEl.getBoundingClientRect();
  ctxPrice=candleSeries.coordinateToPrice(e.clientY-rect.top);
  if(!ctxPrice) return;
  const m=document.getElementById('ctxMenu');
  // in market mode, hide "Set Entry"
  m.children[0].style.display = S.orderType==='market'?'none':'flex';
  // In ladder mode: show Set L1..L4 instead of Entry
  const isLadder = S.orderType==='ladder';
  m.children[0].style.display = (!isLadder && S.orderType!=='market') ? 'flex' : 'none';
  // Ladder-specific items (children 5-8)
  for(let i=5;i<=8;i++){
    const el=m.children[i]; if(!el) continue;
    el.style.display=isLadder?'flex':'none';
  }
  m.style.display='block';
  m.style.left=e.clientX+'px';
  m.style.top=e.clientY+'px';
  document.getElementById('chartHint').classList.add('hidden');
});

document.addEventListener('click',()=>{
  document.getElementById('ctxMenu').style.display='none';
  // pair modal closed via closePairModal()
});

function ctxSet(type){
  if(!ctxPrice) return;
  if(type==='entry'&&S.orderType==='market') return;
  setField(type,ctxPrice);
  document.getElementById('ctxMenu').style.display='none';
}

function ctxSetLadder(i){
  if(!ctxPrice||S.orderType!=='ladder') return;
  LADDER.orders[i].price=ctxPrice;
  const el=document.getElementById('ladd-price-'+i);
  if(el) el.value=fmtPrice(ctxPrice);
  // aggiorna drag price e priceLine
  const k='ld'+(i+1);
  DRAG_PRICES[k]=ctxPrice;
  if(LADDER.orders[i].priceLine){
    try{candleSeries.removePriceLine(LADDER.orders[i].priceLine);}catch(_){}
  }
  LADDER.orders[i].priceLine=candleSeries.createPriceLine({
    price:ctxPrice, color:LADDER_COLORS[i], title:' L'+(i+1),
    lineWidth:1, lineStyle:0, axisLabelVisible:true,
  });
  calcLadder(); drawCanvas();
  notify('Set L'+(i+1)+' → $'+fmtPrice(ctxPrice),'ok');
  document.getElementById('ctxMenu').style.display='none';
}

// click-to-set mode (from ⊕ buttons)
chart.subscribeClick(param=>{
  if(!S.clickMode) return;
  const price=candleSeries.coordinateToPrice(param.point.y);
  if(price){ setField(S.clickMode,price); S.clickMode=null; chartEl.style.cursor='default'; }
});

function activateClick(type){
  if(type==='entry'&&S.orderType==='market') return;
  S.clickMode=type;
  chartEl.style.cursor='crosshair';
  notify('Click sulla chart → '+type.toUpperCase(),'');
}

function setField(type,price){
  const idMap={entry:'entryVal',sl:'slVal',tp1:'tp1',tp2:'tp2',tp3:'tp3'};
  document.getElementById(idMap[type]).value=fmtPrice(price);
  if(type.startsWith('tp')&&!S.tpEnabled) toggleTP();
  setChartLine(type,price);
  drawCanvas();
  calc();
  notify('Set '+type.toUpperCase()+' → $'+fmtPrice(price),'ok');
}

// ─── BITGET FUTURES API ───
// USDT-M perpetuals — public endpoints, no auth required
// Docs: https://www.bitget.com/api-doc/contract/market/Get-History-Candles
const BITGET_BASE = 'https://api.bitget.com/api/v2/mix/market';

async function fetchCandles(symbol,tf){
  const granMap={'1m':'1m','5m':'5m','15m':'15m','1H':'1H','4H':'4H','1D':'1Dutc'};
  const granularity = granMap[tf]||'15m';
  const msPerCandle={'1m':60000,'5m':300000,'15m':900000,'1H':3600000,'4H':14400000,'1D':86400000}[tf]||900000;

  // No artificial target — keep paginating until Bitget returns less than PER_CALL (= end of history)
  const PER_CALL = 1000; // Bitget max per call
  const MAX_CALLS = 200; // safety ceiling: 200 × 1000 = 200k candles max
  const sym = symbol.endsWith('USDT') ? symbol : symbol+'USDT';

  try{
    let allCandles=[];
    let endTime = Date.now();

    for(let i=0;i<MAX_CALLS;i++){
      const url=`${BITGET_BASE}/candles?symbol=${sym}&productType=USDT-FUTURES&granularity=${granularity}&endTime=${endTime}&limit=${PER_CALL}`;
      const ctrl=new AbortController();
      const tid=setTimeout(()=>ctrl.abort(),12000);
      let r;
      try{ r=await fetch(url,{signal:ctrl.signal}); } finally{ clearTimeout(tid); }
      if(!r||!r.ok){ console.warn('Bitget /candles HTTP',r?.status); break; }
      const j=await r.json();
      if(j.code&&j.code!=='00000'){ console.warn('Bitget /candles err',j.code,j.msg); break; }
      const rows=j.data;
      if(!rows||!rows.length) break;
      // /candles returns descending (newest first)
      const candles=rows.map(d=>({
        time:Math.floor(parseInt(d[0])/1000),
        open:parseFloat(d[1]),high:parseFloat(d[2]),
        low:parseFloat(d[3]),close:parseFloat(d[4]),
      }));
      allCandles = candles.concat(allCandles);
      // oldest ts in this batch — go further back
      const oldestTs = Math.min(...rows.map(d=>parseInt(d[0])));
      endTime = oldestTs - 1;
      if(rows.length < PER_CALL) break; // no more history
    }

    if(!allCandles.length){ console.warn('Bitget: no candles for',sym,tf); return null; }
    const seen=new Set();
    return allCandles
      .filter(c=>{ if(seen.has(c.time)) return false; seen.add(c.time); return true; })
      .sort((a,b)=>a.time-b.time);
  }catch(e){ console.error('Bitget fetchCandles',e); return null; }
}

async function fetchTicker(symbol){
  const sym = symbol.endsWith('USDT') ? symbol : symbol+'USDT';
  try{
    const ctrl=new AbortController();
    const tid=setTimeout(()=>ctrl.abort(),5000);
    let r;
    try{ r=await fetch(`${BITGET_BASE}/ticker?symbol=${sym}&productType=USDT-FUTURES`,{signal:ctrl.signal}); }
    finally{ clearTimeout(tid); }
    if(!r||!r.ok) throw new Error('HTTP '+r?.status);
    const j=await r.json();
    if(j.code&&j.code!=='00000') throw new Error(j.msg);
    // data can be array or object depending on whether symbol is passed
    const d=Array.isArray(j.data)?j.data[0]:j.data;
    if(!d||!d.lastPr) throw new Error('no lastPr');
    return {
      last    : parseFloat(d.lastPr),
      open24h : parseFloat(d.open24h  || d.openUtc  || d.lastPr),
      high24h : parseFloat(d.high24h  || d.lastPr),
      low24h  : parseFloat(d.low24h   || d.lastPr),
    };
  }catch(e){ console.warn('Bitget fetchTicker',e); return null; }
}

async function loadCandles(symbol,tf){
  document.getElementById('chartLoading').classList.remove('hidden');
  const data = await fetchCandles(symbol,tf);
  document.getElementById('chartLoading').classList.add('hidden');
  if(data&&data.length){
    candleSeries.setData(data);
    chart.timeScale().fitContent();
    const last=data[data.length-1];
    S.lastPrice=last.close;
    S._prevClose=last.close; // usato da startTick come open della candela live
    updatePriceDisp(last.close,data[data.length-2]?.close||last.open);
    startTick(symbol);
    notify('Bitget Futures: '+symbol,'ok');
  } else {
    console.error('Bitget: no data for',symbol,tf);
    notify('Bitget offline — demo data','err');
    loadDemo(symbol,tf);
  }
  onPriceUpdate();
  // Ricarica linee SL/TP/posizioni filtrate per il simbolo appena caricato
  if (window._positions && window._positions.length) {
    if (window.refreshPosSLLines) window.refreshPosSLLines(window._positions);
    if (window.refreshPosTPLines) window.refreshPosTPLines([], window._positions);
    drawCanvas();
  }
}

function startTick(symbol){
  if(S.tickTimer) clearInterval(S.tickTimer);

  let currentCandleOpen = null;
  let currentCandleHigh = null;
  let currentCandleLow  = null;
  let firstTick = true;

  S.tickTimer=setInterval(async()=>{
    const t=await fetchTicker(symbol);
    if(!t) return;

    S.lastPrice=t.last;
    _priceCache[symbol] = t.last;
    updatePriceDisp(t.last, t.open24h);
    onPriceUpdate();

    try{
      const tfSec={'1m':60,'5m':300,'15m':900,'1H':3600,'4H':14400,'1D':86400}[S.tf]||900;
      const nowSec = Math.floor(Date.now()/1000);
      const candleTime = Math.floor(nowSec/tfSec)*tfSec;

      // Nuovo periodo o primo tick: reset OHLC
      if(currentCandleOpen===null || S._lastCandleTime!==candleTime){
        // open = close candela precedente — no gap
        currentCandleOpen = S._prevClose || t.last;
        currentCandleHigh = Math.max(currentCandleOpen, t.last);
        currentCandleLow  = Math.min(currentCandleOpen, t.last);
        S._lastCandleTime = candleTime;
      }

      currentCandleHigh = Math.max(currentCandleHigh, t.last);
      currentCandleLow  = Math.min(currentCandleLow,  t.last);
      S._prevClose = t.last;

      candleSeries.update({
        time : candleTime,
        open : currentCandleOpen,
        high : currentCandleHigh,
        low  : currentCandleLow,
        close: t.last,
      });

      // Al primo tick: fitContent per centrare sul range corretto del nuovo pair
      if(firstTick){
        chart.timeScale().fitContent();
        firstTick = false;
      }
    }catch(_){}
  },1500);
}

// ─── REALTIME PnL UPDATE per posizioni aperte ───
// Cache prezzi condivisa — popolata da startTick e dal fetcher background
const _priceCache = {};

let _rtPnlTimer = null;
let _bgPriceFetcher = null;

function _startBgPriceFetch() {
  if (_bgPriceFetcher) clearInterval(_bgPriceFetcher);
  _bgPriceFetcher = setInterval(async () => {
    if (!window._positions || !window._positions.length) return;
    const syms = [...new Set(window._positions.map(p =>
      (p.symbol||'').replace(/_?(UMCBL|DMCBL)/gi,'').replace(/USDT$/,'')
    ))].filter(s => s !== S.symbol);
    if (!syms.length) return;
    await Promise.all(syms.map(async sym => {
      try {
        const t = await fetchTicker(sym);
        if (t) _priceCache[sym] = t.last;
      } catch(_) {}
    }));
  }, 2000);
}

function startRealtimePnl() {
  if (_rtPnlTimer) clearInterval(_rtPnlTimer);
  _startBgPriceFetch();
  _rtPnlTimer = setInterval(() => {
    if (!_positions || !_positions.length) return;

    let totalUnrealizedPnl = 0;
    _positions.forEach((p, idx) => {
      const sym = (p.symbol||'').replace(/_?(UMCBL|DMCBL)/gi,'').replace(/USDT$/,'');
      const markPx = _priceCache[sym];
      if (!markPx) return;

      const entry = parseFloat(p.openPriceAvg||p.averageOpenPrice||p.openAvgPrice||0);
      const size  = parseFloat(p.total||p.available||p.totalPos||0);
      const lev   = parseFloat(p.leverage||1);
      const side  = (p.holdSide||'long').toLowerCase();
      const notional = size * markPx;
      const margin   = notional / lev;
      const upnl     = side === 'long'
        ? (markPx - entry) * size
        : (entry - markPx) * size;
      const roe = margin > 0 ? (upnl / margin * 100) : 0;

      const pnlEl      = document.getElementById('pos-pnl-' + idx);
      const markEl     = document.getElementById('pos-mark-' + idx);
      const marginEl   = document.getElementById('pos-margin-' + idx);
      const notionalEl = document.getElementById('pos-notional-' + idx);

      // Aggiorna upnl nella struttura dati per drawCanvas (overlay chart realtime)
      p.unrealizedPL = upnl;
      p.markPrice = markPx;

      if (pnlEl) {
        pnlEl.className = 'pnl ' + (upnl >= 0 ? 'pos' : 'neg');
        pnlEl.innerHTML = `${upnl>=0?'+':'-'}$${fmt(Math.abs(upnl))} <span style="font-size:9px;opacity:.7">(${roe>=0?'+':''}${roe.toFixed(2)}%)</span>`;
      }
      if (markEl)     markEl.textContent = '$' + fmtPrice(markPx);
      if (marginEl)   marginEl.textContent = '$' + fmt(margin);
      if (notionalEl) notionalEl.textContent = fmt(size) + ' cont · $' + fmt(notional);

      // Accumula PnL totale per aggiornare topbar
      totalUnrealizedPnl += upnl;
    });

    // Aggiorna topbar PnL in tempo reale
    const tEl = document.getElementById('tbPnl');
    if (tEl) {
      tEl.textContent = (totalUnrealizedPnl>=0?'+':'-')+'$'+fmt(Math.abs(totalUnrealizedPnl));
      tEl.className = 'tv ' + (totalUnrealizedPnl>=0?'pos':'neg');
    }
    const pEl = document.getElementById('accPnl');
    if (pEl) {
      pEl.textContent = (totalUnrealizedPnl>=0?'+':'-')+'$'+fmt(Math.abs(totalUnrealizedPnl));
      pEl.className = 'av ' + (totalUnrealizedPnl>=0?'pos':'neg');
    }
    // Ridisegna overlay chart con PnL aggiornato in tempo reale
    drawCanvas();
  }, 500);
}

function stopRealtimePnl() {
  if (_rtPnlTimer) { clearInterval(_rtPnlTimer); _rtPnlTimer = null; }
  if (_bgPriceFetcher) { clearInterval(_bgPriceFetcher); _bgPriceFetcher = null; }
}

function onPriceUpdate(){
  // In MARKET mode: entry line follows live price, SL is fixed
  if(S.orderType==='market'&&S.lastPrice){
    document.getElementById('entryMktVal').value=fmtPrice(S.lastPrice);
    setChartLine('entry',S.lastPrice);
    calc();
    drawCanvas();
  }
  // In LADDER mode: aggiorna badge
  if(S.orderType==='ladder'){
    calcLadder();
    drawCanvas();
  }
}

function loadDemo(symbol,tf){
  const seeds={BTCUSDT:83000,ETHUSDT:3200,SOLUSDT:178,BNBUSDT:560,XRPUSDT:0.52};
  let price=seeds[symbol]||100;
  const now=Math.floor(Date.now()/1000);
  const iv={1:60,'1m':60,'5m':300,'15m':900,'1H':3600,'4H':14400,'1D':86400}[tf]||900;
  const data=[];
  for(let i=200;i>=0;i--){
    const t=now-i*iv, vol=price*.012, open=price;
    const change=(Math.random()-.48)*vol, close=open+change;
    data.push({time:t,open,high:Math.max(open,close)+Math.random()*vol*.5,low:Math.min(open,close)-Math.random()*vol*.5,close});
    price=close;
  }
  S.lastPrice=data[data.length-1].close;
  updatePriceDisp(S.lastPrice,data[data.length-2].close);
  candleSeries.setData(data);
  chart.timeScale().fitContent();
  onPriceUpdate();
}

function updatePriceDisp(price,prev){
  const chg=(price-prev)/prev*100;
  document.getElementById('topPrice').textContent='$'+fmtPrice(price);
  const el=document.getElementById('topChg');
  el.textContent=(chg>=0?'+':'')+chg.toFixed(2)+'%';
  el.className='price-chg '+(chg>=0?'pos':'neg');
}

// ─── ORDER TYPE ───
function setOType(t){
  S.orderType=t;
  // update buttons — handle Market, Limit, Ladder
  ['otMarket','otLimit','otLadder'].forEach(id=>{
    const btn = document.getElementById(id);
    if(!btn) return;
    const bt = id==='otMarket'?'market':id==='otLimit'?'limit':'ladder';
    btn.className='otype-btn'+(t===bt?' active':'');
  });

  const isMarket = t==='market';
  const isLadder = t==='ladder';

  // entry rows visibility
  document.getElementById('entryRow').style.display     = (t==='limit')?'flex':'none';
  document.getElementById('entryMktRow').style.display  = isMarket?'flex':'none';
  document.getElementById('mktBanner').classList.toggle('hidden',!isMarket);

  // ladder panel
  document.getElementById('ladderPanel').style.display = isLadder ? 'block' : 'none';

  // in limit: rimuovi entry line live e rimetti quella manuale
  if(t==='limit'){
    removeChartLine('entry');
    DRAG_PRICES.entry=null;
    const v=parseFloat(document.getElementById('entryVal').value);
    if(v) setChartLine('entry',v);
  } else if(isMarket){
    // torna in market: ripristina live entry
    if(S.lastPrice){ setChartLine('entry',S.lastPrice); DRAG_PRICES.entry=S.lastPrice; }
    document.getElementById('entryMktVal').value=S.lastPrice?fmtPrice(S.lastPrice):'';
  } else if(isLadder){
    // ladder: rimuovi entry singola, mantieni linee ladder
    removeChartLine('entry');
    DRAG_PRICES.entry=null;
    renderLadderOrders();
  }

  drawCanvas();
  calc();
}

// ─── LADDER STATE ───
const LADDER = {
  n: 4,          // numero ordini attivi
  orders: [],    // [{price, pct, enabled, priceLine, dragPrice}]
};

// Aggiungi DRAG_PRICES ladder
for(let i=1;i<=4;i++) DRAG_PRICES['ld'+i] = null;

// Colori linee ladder
const LADDER_COLORS = ['#ffc940','#f59e0b','#fb923c','#ef4444'];

function setLadderN(n){
  LADDER.n = n;
  document.querySelectorAll('.ladder-n').forEach(el=>{
    const v = parseInt(el.textContent);
    el.className = 'lev-p ladder-n' + (v===n?' active':'');
  });
  renderLadderOrders();
  calcLadder();
  syncLadderLinesToChart();
}

function getLadderWeights(n, prices){
  // Pesi proporzionali alla distanza dal prezzo top (più lontano = peso maggiore)
  // prices = [p1, p2, ..., pn] ordinati dal più vicino al più lontano (top→bottom per long, bottom→top per short)
  if(!prices || prices.length < 2){
    // equidistribuzione come fallback
    const w = 100/n;
    return Array(n).fill(w).map((v,i)=> parseFloat(v.toFixed(1)));
  }
  const top = prices[0];
  const dists = prices.map(p => Math.abs(p - top) + 0.0001); // dist dal primo livello
  const totalDist = dists.reduce((a,b)=>a+b, 0);
  const rawWeights = dists.map(d => d/totalDist * 100);
  // Normalizza a 100%
  const sum = rawWeights.reduce((a,b)=>a+b, 0);
  const normalized = rawWeights.map(w => w/sum*100);
  // Arrotonda e aggiusta per avere esattamente 100
  const rounded = normalized.map(w => Math.round(w*10)/10);
  const diff = 100 - rounded.reduce((a,b)=>a+b,0);
  rounded[rounded.length-1] = Math.round((rounded[rounded.length-1]+diff)*10)/10;
  return rounded;
}

function renderLadderOrders(){
  if(S.orderType !== 'ladder') return;
  const container = document.getElementById('ladderOrders');
  const n = LADDER.n;

  // Mantieni i prezzi già impostati
  while(LADDER.orders.length < 4) LADDER.orders.push({price:null, enabled:true, priceLine:null});

  let html = '';
  for(let i=0;i<n;i++){
    const idx = i+1;
    const order = LADDER.orders[i];
    const enabled = order.enabled !== false;
    html += `
    <div class="ladd-order ${enabled?'active':'inactive'}" id="ladd-row-${i}">
      <div class="ladd-num" style="color:${LADDER_COLORS[i]}">L${idx}</div>
      <div class="ladd-price-wrap" style="border-color:${LADDER_COLORS[i]}44">
        <input type="number" id="ladd-price-${i}" placeholder="${idx===1?'Top':'Bottom'==='Bottom'&&i===n-1?'Bottom':'prezzo'}" 
          step="0.01" value="${order.price?fmtPrice(order.price):''}"
          oninput="onLadderPriceInput(${i})" style="color:${LADDER_COLORS[i]}"/>
      </div>
      <div class="ladd-pct" id="ladd-pct-${i}">—</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
        <div class="ladd-size" id="ladd-size-${i}">— USDT</div>
        <button class="ladd-toggle ${enabled?'on':'off'}" onclick="toggleLadderOrder(${i})" id="ladd-tog-${i}">${enabled?'✓':'○'}</button>
      </div>
    </div>`;
  }
  container.innerHTML = html;
  calcLadder();
}

function toggleLadderOrder(i){
  LADDER.orders[i].enabled = !LADDER.orders[i].enabled;
  renderLadderOrders();
  syncLadderLinesToChart();
}

function onLadderInput(){
  // Quando cambiano i prezzi top/bottom, distribuisce i livelli equidistanti
  const top = parseFloat(document.getElementById('ladderTop').value);
  const bot = parseFloat(document.getElementById('ladderBottom').value);
  const n = LADDER.n;
  if(!top || !bot) return;

  for(let i=0;i<n;i++){
    const price = top + (bot-top)*(i/(n-1));
    LADDER.orders[i].price = price;
    const el = document.getElementById('ladd-price-'+i);
    if(el) el.value = fmtPrice(price);
  }
  calcLadder();
  syncLadderLinesToChart();
}

function onLadderPriceInput(i){
  const el = document.getElementById('ladd-price-'+i);
  const price = parseFloat(el.value);
  LADDER.orders[i].price = price || null;
  calcLadder();
  syncLadderLinesToChart();
}

function calcLadder(){
  if(S.orderType !== 'ladder') return;

  const sl      = parseFloat(document.getElementById('slVal').value);
  const riskRaw = parseFloat(document.getElementById('riskVal').value);
  const lev     = parseFloat(document.getElementById('levVal').value)||1;
  const bal     = S.balance||1000;
  const n       = LADDER.n;

  const riskUsd = S.riskMode==='pct' ? (bal*riskRaw/100) : riskRaw;

  // Filtra ordini attivi con prezzo valido
  const activeOrders = [];
  for(let i=0;i<n;i++){
    const o = LADDER.orders[i];
    if(o.enabled !== false && o.price && o.price > 0) activeOrders.push({i, price:o.price});
  }

  if(!activeOrders.length || !sl || !riskRaw){
    // Azzera display
    for(let i=0;i<n;i++){
      const pc = document.getElementById('ladd-pct-'+i);
      const sz = document.getElementById('ladd-size-'+i);
      if(pc) pc.textContent = '—';
      if(sz) sz.textContent = '— USDT';
    }
    document.getElementById('ladderSummary').style.display='none';
    document.getElementById('chartCalcBtn').classList.remove('visible');
    return;
  }

  // Calcola pesi basati sulla distanza dal primo livello
  const prices = activeOrders.map(o=>o.price);
  const weights = getLadderWeights(activeOrders.length, prices);

  // Calcola la size totale come: rischio totale / media ponderata delle distanze SL
  // Per mantenere il rischio costante: ogni ordine ha un proprio rischio proporzionale al suo peso
  let totalSize = 0;
  let totalRisk = 0;
  let weightedEntry = 0;
  let totalWeight = 0;

  const orderData = activeOrders.map((o, j) => {
    const w = weights[j] / 100;
    const orderRisk = riskUsd * w;
    const slDist = Math.abs(o.price - sl);
    const slDistPct = slDist / o.price * 100;
    const size = slDistPct > 0 ? orderRisk / (slDistPct/100) : 0;
    const margin = size / lev;
    return { ...o, weight:w, pct:weights[j], risk:orderRisk, size, margin, slDistPct };
  });

  // Aggiorna display ordini
  for(let i=0;i<n;i++){
    const pc = document.getElementById('ladd-pct-'+i);
    const sz = document.getElementById('ladd-size-'+i);
    const od = orderData.find(o=>o.i===i);
    if(!od){
      if(pc) pc.textContent='—';
      if(sz) sz.textContent='— USDT';
      continue;
    }
    if(pc) pc.textContent = od.pct.toFixed(1)+'%';
    if(sz) sz.textContent = fmt(od.size)+' U';
    totalSize += od.size;
    totalRisk += od.risk;
    weightedEntry += od.price * od.weight;
    totalWeight += od.weight;
  }

  const avgEntry = totalWeight > 0 ? weightedEntry / totalWeight : 0;

  // Summary
  const sumEl = document.getElementById('ladderSummary');
  sumEl.style.display = 'block';
  document.getElementById('laddTotalSize').textContent = fmt(totalSize)+' USDT';
  document.getElementById('laddTotalRisk').textContent = '$'+fmt(totalRisk);
  document.getElementById('laddAvgEntry').textContent  = '$'+fmtPrice(avgEntry);

  // Update chart calc button
  document.getElementById('chartCalcSize').textContent = fmt(totalSize);
  document.getElementById('chartCalcBtn').classList.add('visible');

  // Auto-switch direction
  const firstActive = activeOrders[0];
  if(firstActive && sl < firstActive.price && S.dir !== 'long') setDir('long');
  if(firstActive && sl > firstActive.price && S.dir !== 'short') setDir('short');

  drawCanvas();
}

function syncLadderLinesToChart(){
  // Rimuovi linee precedenti
  for(let i=1;i<=4;i++){
    const k='ld'+i;
    if(DRAG_PRICES[k] !== null){
      // rimuovi priceline
      if(LADDER.orders[i-1]?.priceLine){
        try{ candleSeries.removePriceLine(LADDER.orders[i-1].priceLine); }catch(_){}
        LADDER.orders[i-1].priceLine=null;
      }
      DRAG_PRICES[k]=null;
    }
  }
  if(S.orderType!=='ladder') return;

  const n = LADDER.n;
  for(let i=0;i<n;i++){
    const o = LADDER.orders[i];
    if(!o.price || o.enabled===false) continue;
    const k='ld'+(i+1);
    DRAG_PRICES[k]=o.price;
    o.priceLine = candleSeries.createPriceLine({
      price:o.price,
      color:LADDER_COLORS[i],
      title:' L'+(i+1),
      lineWidth:1,
      lineStyle:0,
      axisLabelVisible:true,
    });
  }
  drawCanvas();
}

// ─── SYMBOL / TF ───
function changeSymbol(){
  const sym=document.getElementById('symInput').textContent.toUpperCase().trim();
  if(!sym) return;
  S.symbol=sym; clearAll(); loadCandles(sym,S.tf);
}
function setTF(tf){
  S.tf=tf;
  document.querySelectorAll('.tf-btn').forEach(b=>{
    b.className='tf-btn'+(b.textContent===({1:'1m','1m':'1m','5m':'5m','15m':'15m','1H':'1h','4H':'4h','1D':'1D'}[tf])?' active':'');
  });
  loadCandles(S.symbol,tf);
}

// ─── PAIR MODAL ───
let _pmActiveCat = 'All';

function openPairModal(){
  _pmActiveCat = 'All';
  document.getElementById('pairModal').classList.add('open');
  renderPairCats();
  renderPairModal('');
  setTimeout(()=>document.getElementById('pmSearch').focus(),80);
}
function closePairModal(){
  document.getElementById('pairModal').classList.remove('open');
  document.getElementById('pmSearch').value='';
}

function renderPairCats(){
  const cats = ['All', ...new Set(ASSETS.map(a=>a.cat))];
  const el = document.getElementById('pmCats');
  el.innerHTML = cats.map(c=>
    `<button class="pm-cat-btn${c===_pmActiveCat?' active':''}" onclick="setPmCat('${c}')">${c}</button>`
  ).join('');
}
function setPmCat(cat){
  _pmActiveCat = cat;
  renderPairCats();
  renderPairModal(document.getElementById('pmSearch').value);
}

function renderPairModal(filter=''){
  const fl = filter.toUpperCase().trim();
  let list = ASSETS.filter(a=>{
    const matchCat = _pmActiveCat==='All' || a.cat===_pmActiveCat;
    const matchSym = !fl || a.sym.includes(fl) || a.sym.replace('USDT','').includes(fl);
    return matchCat && matchSym;
  });

  const bycat = {};
  list.forEach(a=>{ if(!bycat[a.cat]) bycat[a.cat]=[]; bycat[a.cat].push(a); });

  const body = document.getElementById('pmBody');
  if(!list.length){
    body.innerHTML='<div class="pm-empty">Nessun pair trovato</div>';
    return;
  }

  let h='';
  for(const cat in bycat){
    if(_pmActiveCat==='All') h+=`<div class="pm-section-title">${cat}</div>`;
    h+=`<div class="pm-grid">`;
    bycat[cat].forEach(a=>{
      const base = a.sym.replace('USDT','');
      h+=`<div class="pm-item${a.sym===S.symbol?' active':''}" onclick="selectPair('${a.sym}')">
        <span class="pm-item-sym">${base}/USDT</span>
        <span class="pm-item-base">${a.cat}</span>
      </div>`;
    });
    h+=`</div>`;
  }
  body.innerHTML = h;
}

function selectPair(sym){
  S.symbol = sym;
  document.getElementById('symInput').textContent = sym;
  closePairModal();
  clearAll();
  loadCandles(sym, S.tf);
}

// ESC chiude la modal
document.addEventListener('keydown', e=>{
  if(e.key==='Escape') closePairModal();
});

// ─── DIRECTION ───
function setDir(dir){
  S.dir=dir;
  document.getElementById('btnLong').className='dir-btn long'+(dir==='long'?' active':'');
  document.getElementById('btnShort').className='dir-btn short'+(dir==='short'?' active':'');
  document.getElementById('btnOpen').textContent=dir==='long'?'OPEN LONG':'OPEN SHORT';
  document.getElementById('btnOpen').className='btn-open '+dir;
  calc();
}

// ─── MARGIN MODE ───
function setMarginMode(m){
  S.marginMode = m === 'isolated' ? 'isolated' : 'crossed';
  document.getElementById('tabCross').className = 'risk-tab' + (m==='cross' ? ' active' : '');
  document.getElementById('tabIso').className   = 'risk-tab' + (m==='isolated' ? ' active' : '');
}

// ─── RISK MODE ───
function setRiskMode(m){
  const prevMode = S.riskMode;
  const riskEl = document.getElementById('riskVal');
  const bal = S.balance || 1000;

  if(prevMode === 'pct' && m === 'usd'){
    // Converti: da % a USDT
    const pct = parseFloat(riskEl.value) || 0;
    const usdt = parseFloat((bal * pct / 100).toFixed(2));
    riskEl.value = usdt;
    riskEl.step = '1';
  } else if(prevMode === 'usd' && m === 'pct'){
    // Converti: da USDT a %
    const usdt = parseFloat(riskEl.value) || 0;
    const pct = parseFloat((usdt / bal * 100).toFixed(2));
    riskEl.value = pct;
    riskEl.step = '0.5';
  }

  S.riskMode = m;
  document.getElementById('tabPct').className = 'risk-tab' + (m==='pct' ? ' active' : '');
  document.getElementById('tabUsd').className = 'risk-tab' + (m==='usd' ? ' active' : '');
  document.getElementById('riskUnit').textContent = m==='pct' ? '%' : '$';
  // Aggiorna anche i bottoni stepper delta
  document.querySelector('.stpr-btn[onclick="step(\'riskVal\',.5)"]').setAttribute('onclick', m==='pct' ? "step('riskVal',.5)" : "step('riskVal',10)");
  document.querySelector('.stpr-btn[onclick*="step(\'riskVal\',-.5)"]')?.setAttribute('onclick', m==='pct' ? "step('riskVal',-.5)" : "step('riskVal',-10)");
  calc();
}

// ─── LEVERAGE ───
function setLev(v){ document.getElementById('levVal').value=v; updateLevPresets(); calc(); }
function updateLevPresets(){
  const v=parseInt(document.getElementById('levVal').value);
  document.querySelectorAll('.lev-p').forEach(el=>{
    el.className='lev-p'+(parseInt(el.textContent)===v?' active':'');
  });
}

// ─── STEPPERS ───
function step(id,d){
  const el=document.getElementById(id);
  el.value=Math.max(parseFloat(el.min||0),parseFloat(el.value||0)+d);
  calc();
}
function stepP(id,dir){
  const el=document.getElementById(id);
  const v=parseFloat(el.value||S.lastPrice||100);
  const tick=v>10000?10:v>1000?1:v>100?.1:v>1?.01:.0001;
  el.value=(v+dir*tick).toFixed(getPDec(v));
  const type=id==='entryVal'?'entry':id==='slVal'?'sl':id.replace('Val','');
  syncLine(type);
}

// ─── TP TOGGLE ───
function toggleTP(){
  S.tpEnabled=!S.tpEnabled;
  document.getElementById('tpSw').className='tgl-sw'+(S.tpEnabled?' on':'');
  document.getElementById('tpLbl').textContent=S.tpEnabled?'ON':'OFF';
  ['tpRow1','tpRow2','tpRow3'].forEach(id=>{
    document.getElementById(id).className='tp-row-grid'+(S.tpEnabled?' on':'');
  });
  calc();
}

// ─── CALC ───
function calc(){
  // entry: in market mode = S.lastPrice; in limit/stop = campo input
  const entry = S.orderType==='market'
    ? S.lastPrice
    : parseFloat(document.getElementById('entryVal').value);
  const sl      = parseFloat(document.getElementById('slVal').value);
  const riskRaw = parseFloat(document.getElementById('riskVal').value);
  const lev     = parseFloat(document.getElementById('levVal').value)||1;
  const bal     = S.balance||1000;

  const ids=['calcSize','calcMargin','cdSlDist','cdRiskUsd','cdRR'];
  if(!entry||!sl||!riskRaw){
    ids.forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('chartCalcBtn').classList.remove('visible');
    updateTPRR(entry,sl); return;
  }

  const slDist=Math.abs(entry-sl);
  const slDistPct=slDist/entry*100;
  if(!slDistPct) return;

  // Auto-switch direction based on SL position
  if(sl<entry && S.dir!=='long')  setDir('long');
  if(sl>entry && S.dir!=='short') setDir('short');

  const riskUsd=S.riskMode==='pct'?(bal*riskRaw/100):riskRaw;
  const size=riskUsd/(slDistPct/100);
  const margin=size/lev;

  document.getElementById('calcSize').textContent=fmt(size);
  document.getElementById('calcMargin').textContent='$'+fmt(margin);
  document.getElementById('cdSlDist').textContent=slDistPct.toFixed(2)+'%';
  document.getElementById('cdRiskUsd').textContent='$'+fmt(riskUsd);

  document.getElementById('chartCalcSize').textContent=fmt(size);
  document.getElementById('chartCalcBtn').classList.add('visible');

  const tp1=parseFloat(document.getElementById('tp1').value);
  document.getElementById('cdRR').textContent=tp1&&S.tpEnabled?'1:'+(Math.abs(tp1-entry)/slDist).toFixed(2):'—';

  updateTPRR(entry,sl);
  drawCanvas(); // ridisegna badge distanza SL aggiornato
}

function updateTPRR(entry,sl){
  if(!entry||!sl) return;
  const d=Math.abs(entry-sl);
  [1,2,3].forEach(n=>{
    const tp=parseFloat(document.getElementById('tp'+n).value);
    document.getElementById('rr'+n).textContent=tp&&d?'1:'+(Math.abs(tp-entry)/d).toFixed(1):'—';
  });
}

// ─── MODAL ───
async function openModal(){
  if(S.orderType==='ladder'){
    await openLadderModal(); return;
  }
  const size=document.getElementById('calcSize').textContent;
  if(size==='—'){notify('Imposta Risk e SL prima','err');return;}
  const entry=S.orderType==='market'?S.lastPrice:parseFloat(document.getElementById('entryVal').value);
  const sl=document.getElementById('slVal').value;
  const lev=document.getElementById('levVal').value;
  const margin=document.getElementById('calcMargin').textContent;
  const riskUsd=document.getElementById('cdRiskUsd').textContent;
  const slDist=document.getElementById('cdSlDist').textContent;
  let tpH='';
  if(S.tpEnabled)[1,2,3].forEach(n=>{
    const tp=document.getElementById('tp'+n).value;
    const en=document.getElementById('tp'+n+'en').checked;
    if(tp&&en) tpH+=`<div class="mrow"><span class="ml">TP${n}</span><span class="mv grn">$${tp}</span></div>`;
  });
  document.getElementById('modalRows').innerHTML=`
    <div class="mrow"><span class="ml">Symbol</span><span class="mv acc">${S.symbol}</span></div>
    <div class="mrow"><span class="ml">Direction</span><span class="mv" style="color:var(--${S.dir==='long'?'green':'red'})">${S.dir.toUpperCase()}</span></div>
    <div class="mrow"><span class="ml">Type</span><span class="mv">${S.orderType.toUpperCase()}</span></div>
    <div class="mrow"><span class="ml">Entry</span><span class="mv">$${fmtPrice(entry)}${S.orderType==='market'?' <span style="font-size:8px;color:var(--muted2)">(market)</span>':''}</span></div>
    <div class="mrow"><span class="ml">Leva</span><span class="mv">${lev}x</span></div>
    <div class="mdiv"></div>
    <div class="mrow"><span class="ml">Size</span><span class="mv acc">${size} USDT</span></div>
    <div class="mrow"><span class="ml">Margin</span><span class="mv">${margin}</span></div>
    <div class="mrow"><span class="ml">Stop Loss</span><span class="mv red">$${sl} <span style="font-size:8px;color:var(--muted2)">(${slDist})</span></span></div>
    <div class="mrow"><span class="ml">Max Risk</span><span class="mv red">${riskUsd}</span></div>
    ${tpH}`;
  document.getElementById('modalBg').className='modal-bg open';
}
function closeModal(){ document.getElementById('modalBg').className='modal-bg'; }

async function openLadderModal(){
  const totalSize = document.getElementById('laddTotalSize').textContent;
  if(!totalSize || totalSize==='—'){notify('Imposta Range, Risk e SL prima','err');return;}
  const sl=parseFloat(document.getElementById('slVal').value);
  const lev=document.getElementById('levVal').value;
  const lev2=parseFloat(lev)||1;
  const totalRisk=document.getElementById('laddTotalRisk').textContent;
  const avgEntry=document.getElementById('laddAvgEntry').textContent;
  const n=LADDER.n;
  const riskRaw=parseFloat(document.getElementById('riskVal').value);
  const bal=S.balance||1000;
  const riskUsd=S.riskMode==='pct'?(bal*riskRaw/100):riskRaw;

  // Fetcha contract info per sapere minTradeNum e step prima ancora di aprire il modal
  const cInfo = await fetchContractInfo(S.symbol);
  const {pricePlace,sizeMultiplier,minTradeNum}=cInfo;

  const activeOrders=[];
  for(let i=0;i<n;i++){
    const o=LADDER.orders[i];
    if(o.enabled!==false&&o.price&&o.price>0) activeOrders.push({i,price:o.price});
  }
  if(!activeOrders.length){notify('Nessun ordine ladder con prezzo impostato','err');return;}

  const prices=activeOrders.map(o=>o.price);
  const weights=getLadderWeights(activeOrders.length,prices);

  // Calcola per ogni ordine: size, contratti, se eseguibile
  let ordersHtml='';
  let executableCount=0;
  let skippedCount=0;
  let executableTotalSize=0;
  let executableTotalRisk=0;

  const orderDetails = activeOrders.map((o,j)=>{
    const w=weights[j]/100;
    const orderRisk=riskUsd*w;
    const slDist=Math.abs(o.price-sl);
    const slDistPct=slDist/o.price*100;
    const size=slDistPct>0?orderRisk/(slDistPct/100):0;
    const rawContracts=size/o.price;
    const contracts=Math.floor(rawContracts/sizeMultiplier)*sizeMultiplier;
    const margin=size/lev2;
    const ok=contracts>=minTradeNum && size>0;
    return {o, j, w, orderRisk, size, contracts, margin, ok, pct:weights[j]};
  });

  orderDetails.forEach(d=>{
    if(d.ok){
      executableCount++;
      executableTotalSize+=d.size;
      executableTotalRisk+=d.orderRisk;
      ordersHtml+=`
        <div class="mrow">
          <span class="ml" style="color:${LADDER_COLORS[d.o.i]}">L${d.o.i+1} <span style="color:var(--muted2);font-size:8px">${d.pct.toFixed(1)}%</span></span>
          <span class="mv">
            <span style="color:var(--text)">$${fmtPrice(d.o.price)}</span>
            <span style="color:var(--muted2);font-size:9px"> → </span>
            <span style="color:var(--accent)">${fmt(d.size)} USDT</span>
            <span style="color:var(--muted2);font-size:8px"> (margin $${fmt(d.margin)})</span>
          </span>
        </div>`;
    } else {
      skippedCount++;
      // Motivo skip
      let reason='';
      if(d.size<=0) reason='SL coincide con entry';
      else if(d.contracts<minTradeNum){
        const needed=(minTradeNum*d.o.price).toFixed(2);
        reason=`size troppo piccola (min ~$${needed})`;
      }
      ordersHtml+=`
        <div class="mrow" style="opacity:.5">
          <span class="ml" style="color:${LADDER_COLORS[d.o.i]}">L${d.o.i+1} <span style="color:var(--yellow);font-size:8px">⚠ SKIP</span></span>
          <span class="mv" style="color:var(--muted2);font-size:9px">${reason}</span>
        </div>`;
    }
  });

  // Warning block se ci sono ordini saltati
  let warningHtml='';
  if(skippedCount>0 && executableCount>0){
    warningHtml=`
      <div style="background:var(--yellow-dim);border:1px solid var(--yellow);border-radius:5px;padding:7px 9px;margin:6px 0;font-size:9px;color:var(--yellow);line-height:1.5">
        ⚠ <strong>${skippedCount} ordine/i saltati</strong> — size troppo piccola per il balance disponibile.<br>
        Verranno inviati solo i <strong>${executableCount}</strong> ordini validi.<br>
        <span style="color:var(--muted2)">Aumenta il Risk%, la Leva, o usa un range più stretto.</span>
      </div>`;
  } else if(executableCount===0){
    warningHtml=`
      <div style="background:var(--red-dim);border:1px solid var(--red);border-radius:5px;padding:7px 9px;margin:6px 0;font-size:9px;color:var(--red);line-height:1.5">
        ✕ <strong>Nessun ordine eseguibile</strong> — tutte le size sono sotto il minimo di Bitget.<br>
        <span style="color:var(--muted2)">Aumenta il Risk%, la Leva, o riduci il numero di livelli.</span>
      </div>`;
    // Disabilita il bottone Confirm se non ci sono ordini eseguibili
    setTimeout(()=>{
      const btn=document.getElementById('modalConfirmBtn')||document.querySelector('.modal-btn.confirm');
      if(btn){ btn.disabled=true; btn.style.opacity='0.4'; btn.style.cursor='not-allowed'; }
    },50);
  }

  // Se tutti ok, re-abilita il bottone
  if(executableCount>0){
    setTimeout(()=>{
      const btn=document.getElementById('modalConfirmBtn')||document.querySelector('.modal-btn.confirm');
      if(btn){ btn.disabled=false; btn.style.opacity=''; btn.style.cursor=''; }
    },50);
  }

  let tpH='';
  if(S.tpEnabled)[1,2,3].forEach(nn=>{
    const tp=document.getElementById('tp'+nn).value;
    const en=document.getElementById('tp'+nn+'en').checked;
    if(tp&&en) tpH+=`<div class="mrow"><span class="ml">TP${nn}</span><span class="mv grn">$${tp}</span></div>`;
  });

  document.getElementById('modalRows').innerHTML=`
    <div class="mrow"><span class="ml">Symbol</span><span class="mv acc">${S.symbol}</span></div>
    <div class="mrow"><span class="ml">Direction</span><span class="mv" style="color:var(--${S.dir==='long'?'green':'red'})">${S.dir.toUpperCase()}</span></div>
    <div class="mrow"><span class="ml">Mode</span><span class="mv">LADDER — ${executableCount}/${activeOrders.length} ordini</span></div>
    <div class="mrow"><span class="ml">Entry avg</span><span class="mv">${avgEntry}</span></div>
    <div class="mrow"><span class="ml">Leva</span><span class="mv">${lev}x</span></div>
    <div class="mdiv"></div>
    ${ordersHtml}
    ${warningHtml}
    <div class="mdiv"></div>
    <div class="mrow"><span class="ml">Size effettiva</span><span class="mv acc">${fmt(executableTotalSize)} USDT</span></div>
    <div class="mrow"><span class="ml">Stop Loss</span><span class="mv red">$${sl}</span></div>
    <div class="mrow"><span class="ml">Risk effettivo</span><span class="mv red">$${fmt(executableTotalRisk)}</span></div>
    ${tpH}`;
  document.getElementById('modalBg').className='modal-bg open';
}

// ─── FETCH CONTRACT INFO (tick size + size precision) ───
// Mette in cache per simbolo per non rifetchare ogni volta
const _contractInfoCache = {};
async function fetchContractInfo(symbol){
  if(_contractInfoCache[symbol]) return _contractInfoCache[symbol];
  try {
    const url = `https://api.bitget.com/api/v2/mix/market/contracts?symbol=${symbol}&productType=USDT-FUTURES`;
    const res = await fetch(url);
    const json = await res.json();
    const data = json?.data?.[0];
    if(!data) throw new Error('No contract info');
    const info = {
      pricePlace:    parseInt(data.pricePlace    ?? 2),   // decimali del prezzo
      sizeMultiplier: parseFloat(data.sizeMultiplier ?? 1), // step size contratti
      minTradeNum:   parseFloat(data.minTradeNum ?? 0.001),
    };
    _contractInfoCache[symbol] = info;
    return info;
  } catch(e){
    console.warn('fetchContractInfo fallback:', e.message);
    // fallback generico sicuro
    return { pricePlace: 4, sizeMultiplier: 0.001, minTradeNum: 0.001 };
  }
}

// Arrotonda un prezzo al tick size corretto del simbolo
function roundToTick(price, pricePlace){
  const factor = Math.pow(10, pricePlace);
  return Math.round(price * factor) / factor;
}

// Arrotonda la size al multiplo corretto di sizeMultiplier
function roundToSizeStep(size, step){
  if(!step || step <= 0) return size;
  return Math.floor(size / step) * step;
}

async function executeOrder(){
  closeModal();
  if(S.orderType==='ladder'){
    await executeLadderOrders(); return;
  }
  // Raccoglie tutti i parametri dell'ordine
  const entry   = S.orderType==='market' ? null : parseFloat(document.getElementById('entryVal').value);
  const sl      = parseFloat(document.getElementById('slVal').value);
  const size    = document.getElementById('calcSize').textContent;
  const lev     = document.getElementById('levVal').value;
  const tpList  = [];
  if(S.tpEnabled){
    [1,2,3].forEach(n=>{
      const v=parseFloat(document.getElementById('tp'+n).value);
      const en=document.getElementById('tp'+n+'en').checked;
      if(v&&en) tpList.push(v);
    });
  }

  // Chiave ordine per Bitget
  const side      = S.dir==='long' ? 'buy' : 'sell';
  const tradeSide = 'open';
  const orderType = S.orderType==='market' ? 'market' : 'limit';

  const sizeUsdt    = parseFloat(size.replace(/,/g,''));
  const entryPrice  = S.orderType==='market' ? S.lastPrice : entry;
  if (!entryPrice || entryPrice <= 0) { notify('Prezzo entry non disponibile','err'); return; }

  notify('Invio ordine...','');

  // ── Fetch contract info per tick size corretto ──
  const cInfo = await fetchContractInfo(S.symbol);
  const { pricePlace, sizeMultiplier, minTradeNum } = cInfo;

  // Helper: converte prezzo al formato stringa corretto per Bitget
  const fmtBitgetPrice = (p) => roundToTick(p, pricePlace).toFixed(pricePlace);

  // Numero di contratti arrotondato al step size del simbolo
  const rawContracts = sizeUsdt / entryPrice;
  const contracts    = roundToSizeStep(rawContracts, sizeMultiplier);
  if (contracts < minTradeNum) { notify('Size troppo piccola per questo simbolo','err'); return; }
  const contractStr  = contracts.toFixed(String(sizeMultiplier).split('.')[1]?.length ?? 3);

  try {
    // 0. Imposta margin mode
    await window._bitgetRequest('/api/v2/mix/account/set-margin-mode',{},{
      method:'POST',
      body: JSON.stringify({symbol:S.symbol,productType:'USDT-FUTURES',marginCoin:'USDT',marginMode:S.marginMode})
    });
  } catch(e){ console.warn('set-margin-mode error:',e.message); }

  try {
    // 1. Imposta leva
    await window._bitgetRequest('/api/v2/mix/account/set-leverage',{},{
      method:'POST',
      body: JSON.stringify({symbol:S.symbol,productType:'USDT-FUTURES',marginCoin:'USDT',leverage:lev,holdSide:S.dir==='long'?'long':'short'})
    });
  } catch(e){ console.warn('set-leverage error:',e.message); }

  try {
    // 2. Piazza ordine principale con SL/TP come preset (funziona per market e limit)
    const orderBody = {
      symbol: S.symbol,
      productType: 'USDT-FUTURES',
      marginMode: S.marginMode,
      marginCoin: 'USDT',
      size: contractStr,
      side,
      tradeSide,
      orderType,
      ...(orderType==='limit' ? {price: fmtBitgetPrice(entry)} : {}),
      clientOid: 'rf_'+Date.now(),
    };
    if (sl)               orderBody.presetStopLossPrice    = fmtBitgetPrice(sl);
    if (tpList.length>0)  orderBody.presetTakeProfitPrice  = fmtBitgetPrice(tpList[0]);

    await window._bitgetRequest('/api/v2/mix/order/place-order',{},{
      method:'POST',
      body: JSON.stringify(orderBody)
    });

    notify('✓ Ordine inviato su Bitget!','ok');
    clearAll();
    setTimeout(()=>window.refreshAccount(), 2000);

  } catch(e){
    notify('✗ Errore ordine: '+e.message,'err');
    console.error('executeOrder error:', e);
  }
}
document.getElementById('modalBg').addEventListener('click',e=>{ if(e.target===document.getElementById('modalBg')) closeModal(); });

async function executeLadderOrders(){
  const sl      = parseFloat(document.getElementById('slVal').value);
  const lev     = document.getElementById('levVal').value;
  const riskRaw = parseFloat(document.getElementById('riskVal').value);
  const bal     = S.balance||1000;
  const lev2    = parseFloat(lev)||1;
  const riskUsd = S.riskMode==='pct'?(bal*riskRaw/100):riskRaw;
  const n       = LADDER.n;

  const activeOrders=[];
  for(let i=0;i<n;i++){
    const o=LADDER.orders[i];
    if(o.enabled!==false&&o.price&&o.price>0) activeOrders.push({i,price:o.price});
  }
  if(!activeOrders.length){notify('Nessun ordine ladder valido','err');return;}

  const prices=activeOrders.map(o=>o.price);
  const weights=getLadderWeights(activeOrders.length,prices);
  const side      = S.dir==='long'?'buy':'sell';
  const tradeSide = 'open';

  notify('Invio '+activeOrders.length+' ordini ladder...','');
  const cInfo = await fetchContractInfo(S.symbol);
  const {pricePlace,sizeMultiplier,minTradeNum}=cInfo;
  const fmtBP=(p)=>Math.round(p*Math.pow(10,pricePlace))/Math.pow(10,pricePlace);

  try{
    // Imposta margin mode e leva
    await window._bitgetRequest('/api/v2/mix/account/set-margin-mode',{},{
      method:'POST',
      body:JSON.stringify({symbol:S.symbol,productType:'USDT-FUTURES',marginCoin:'USDT',marginMode:S.marginMode})
    });
    await window._bitgetRequest('/api/v2/mix/account/set-leverage',{},{
      method:'POST',
      body:JSON.stringify({symbol:S.symbol,productType:'USDT-FUTURES',marginCoin:'USDT',leverage:lev,holdSide:S.dir==='long'?'long':'short'})
    });

    let placed=0, skipped=0;
    const skippedDetails=[];
    for(let j=0;j<activeOrders.length;j++){
      const o=activeOrders[j];
      const w=weights[j]/100;
      const orderRisk=riskUsd*w;
      const slDist=Math.abs(o.price-sl);
      const slDistPct=slDist/o.price*100;
      const size=slDistPct>0?orderRisk/(slDistPct/100):0;
      const rawContracts=size/o.price;
      const contracts=Math.floor(rawContracts/sizeMultiplier)*sizeMultiplier;
      if(contracts<minTradeNum){
        skipped++;
        const needed=(minTradeNum*o.price).toFixed(2);
        skippedDetails.push(`L${o.i+1}: size troppo piccola (min ~$${needed})`);
        continue;
      }
      const contractStr=contracts.toFixed(String(sizeMultiplier).split('.')[1]?.length??3);
      const orderBody={
        symbol:S.symbol, productType:'USDT-FUTURES',
        marginMode:S.marginMode, marginCoin:'USDT',
        size:contractStr, side, tradeSide, orderType:'limit',
        price:fmtBP(o.price).toFixed(pricePlace),
        clientOid:'rf_ladd_'+Date.now()+'_'+j,
      };
      if(sl) orderBody.presetStopLossPrice=fmtBP(sl).toFixed(pricePlace);
      await window._bitgetRequest('/api/v2/mix/order/place-order',{},{
        method:'POST', body:JSON.stringify(orderBody)
      });
      placed++;
    }
    if(placed===0){
      notify('✗ Nessun ordine inviato — size troppo piccole','err');
      console.warn('Ladder skipped all:', skippedDetails);
      return;
    }
    let msg = '✓ '+placed+' ordini ladder inviati!';
    if(skipped>0) msg += ' ('+skipped+' saltati — size sotto min)';
    notify(msg, skipped>0?'':'ok');
    if(skipped>0) console.warn('Ordini ladder saltati:\n'+skippedDetails.join('\n'));
    clearAll();
    setTimeout(()=>window.refreshAccount(),2000);
  }catch(e){
    notify('✗ Errore ladder: '+e.message,'err');
    console.error('executeLadderOrders error:',e);
  }
}

// ─── CLEAR ───
function clearAll(){
  ['slVal','tp1','tp2','tp3'].forEach(id=>document.getElementById(id).value='');
  if(S.orderType!=='market') document.getElementById('entryVal').value='';
  Object.keys(DRAG_PRICES).forEach(t=>{
    if(t==='entry'&&S.orderType==='market') return;
    DRAG_PRICES[t]=null;
    if(!t.startsWith('ld')) removeChartLine(t);
  });
  // Clear ladder
  LADDER.orders.forEach((o,i)=>{
    if(o.priceLine){ try{candleSeries.removePriceLine(o.priceLine);}catch(_){} o.priceLine=null; }
    o.price=null;
    const el=document.getElementById('ladd-price-'+i); if(el) el.value='';
  });
  const top=document.getElementById('ladderTop'); if(top) top.value='';
  const bot=document.getElementById('ladderBottom'); if(bot) bot.value='';
  document.getElementById('chartCalcBtn').classList.remove('visible');
  drawCanvas(); calc();
}

// ═══════════════════════════════════════════════════════════════
// POSITION SL LINES — linee SL draggabili per posizioni aperte
// ═══════════════════════════════════════════════════════════════

// Registry: posIdx → { price, side, symbol, priceLine }
window._posSLLines = {};

// Chiamato quando renderBitgetPositions popola _positions
// Crea/aggiorna le linee SL sul grafico per ogni posizione
window.refreshPosSLLines = function(positions, tpslMap) {
  // Rimuovi price lines precedenti
  Object.values(window._posSLLines).forEach(l => {
    if (l.priceLine) { try { candleSeries.removePriceLine(l.priceLine); } catch(_){} }
  });
  window._posSLLines = {};

  const map = tpslMap || window._tpslOrdersMap || {};

  positions.forEach((p, idx) => {
    const side   = (p.holdSide || 'long').toLowerCase();
    const posSym = (p.symbol || '').replace(/_?(UMCBL|DMCBL)/gi, '').replace(/USDT$/, '');
    const curSym = (S.symbol || '').replace(/USDT$/, '');

    // Cerca SL: prima negli ordini TPSL (piu affidabile), poi nel campo grezzo
    const tpslKey  = (p.symbol || '').replace(/_?(UMCBL|DMCBL)/gi, '') + '_' + side;
    const tpslList = map[tpslKey] || [];
    const slOrder  = tpslList.find(o => o.type === 'sl');
    const slRaw    = parseFloat(p.stopLoss || p.stopLossPrice || p.presetStopLossPrice || 0);
    const sl       = slOrder ? slOrder.price : slRaw;

    window._posSLLines[idx] = {
      price: sl > 0 ? sl : null,
      side, symbol: p.symbol,
      orderId: slOrder ? slOrder.orderId : (p.stopLossId || ''),
      idx, priceLine: null,
    };

    // Crea priceLine solo se il simbolo corrisponde al grafico attivo
    if (!sl || sl <= 0 || posSym !== curSym) return;

    const priceLine = candleSeries.createPriceLine({
      price: sl, color: '#ff2d4a', lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true, title: ` SL#${idx+1}`,
    });
    window._posSLLines[idx].priceLine = priceLine;

    const inp = document.getElementById('pos-sl-input-'+idx);
    if (inp) inp.value = fmtPrice(sl);
  });

  drawCanvas();
};

// Sincronizza la linea sul grafico quando l'utente digita nel campo
window.syncPosSlLine = function(idx) {
  const inp = document.getElementById('pos-sl-input-'+idx);
  if (!inp) return;
  const price = parseFloat(inp.value);
  const entry = window._posSLLines[idx];
  if (!entry) return;

  if (entry.priceLine) {
    try { candleSeries.removePriceLine(entry.priceLine); } catch(_){}
  }
  if (price && price > 0) {
    entry.priceLine = candleSeries.createPriceLine({
      price, color:'#ff2d4a', lineWidth:1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible:true, title:` SL#${idx+1}`,
    });
    entry.price = price;
  }
  drawCanvas();
};

// Drag linee SL/TP posizioni rimosso — modifica manuale via input nel pannello

// ═══════════════════════════════════════════════════════════════
// POSITION LINE DRAG — drag handle per SL e TP delle posizioni
// ═══════════════════════════════════════════════════════════════

// Registry drag attivo per pos lines: { type:'sl'|'tp', idx, tpN }
window._posDragState = null;

// Grab zone: entro quanti px dalla linea si attiva il drag
const POS_GRAB_PX = 14;

// Trova linea SL/TP di posizione più vicina a clientY
function posLineAtY(clientY) {
  const rect = chartWrap.getBoundingClientRect();
  const y = clientY - rect.top;
  let best = null, bestD = POS_GRAB_PX;

  // SL lines
  if (window._posSLLines) {
    Object.entries(window._posSLLines).forEach(([idxStr, entry]) => {
      if (!entry || !entry.price) return;
      // Solo simbolo corrente
      const posSym = (entry.symbol || '').replace(/_?(UMCBL|DMCBL)/gi,'').replace(/USDT$/,'');
      const curSym = (S.symbol || '').replace(/USDT$/,'');
      if (posSym !== curSym) return;
      const ly = candleSeries.priceToCoordinate(entry.price);
      if (ly === null) return;
      const d = Math.abs(y - ly);
      if (d < bestD) { bestD = d; best = { type: 'sl', idx: parseInt(idxStr) }; }
    });
  }

  // TP lines
  if (window._posTPLines) {
    Object.entries(window._posTPLines).forEach(([key, entry]) => {
      if (!entry || !entry.price) return;
      const posSym = (entry.symbol || '').replace(/_?(UMCBL|DMCBL)/gi,'').replace(/USDT$/,'');
      const curSym = (S.symbol || '').replace(/USDT$/,'');
      if (posSym !== curSym) return;
      const ly = candleSeries.priceToCoordinate(entry.price);
      if (ly === null) return;
      const d = Math.abs(y - ly);
      if (d < bestD) { bestD = d; best = { type: 'tp', idx: entry.posIdx, tpN: entry.tpN, key }; }
    });
  }

  return best;
}

// ═══════════════════════════════════════════════════════════════
// POSITION TP LINES — linee TP draggabili per posizioni aperte
// ═══════════════════════════════════════════════════════════════

// Registry: key `${posIdx}_${tpN}` → { price, orderId, posIdx, tpN, priceLine }
window._posTPLines = {};

const TP_COLORS = ['#00d17a', '#00ffcc', '#3dddff'];

window.refreshPosTPLines = function(tpOrders, positions, tpslMap) {
  // Rimuovi linee precedenti
  Object.values(window._posTPLines).forEach(l => {
    if (l.priceLine) { try { candleSeries.removePriceLine(l.priceLine); } catch(_){} }
  });
  window._posTPLines = {};

  const map = tpslMap || window._tpslOrdersMap || {};

  positions.forEach((p, posIdx) => {
    const side   = (p.holdSide || 'long').toLowerCase();
    const posSym = (p.symbol || '').replace(/_?(UMCBL|DMCBL)/gi, '').replace(/USDT$/, '');
    const curSym = (S.symbol || '').replace(/USDT$/, '');

    // Cerca TP: prima negli ordini TPSL, poi nel campo grezzo
    const tpslKey  = (p.symbol || '').replace(/_?(UMCBL|DMCBL)/gi, '') + '_' + side;
    const tpslList = map[tpslKey] || [];
    const tpOrders2 = tpslList.filter(o => o.type === 'tp').sort((a,b) => a.price - b.price);
    const tpRaw    = parseFloat(p.takeProfit || p.takeProfitPrice || p.presetTakeProfitPrice || 0);

    // Se ci sono ordini TP dal map, usa quelli (supporta multipli TP1/TP2/TP3)
    const tpPrices = tpOrders2.length > 0
      ? tpOrders2.map(o => o.price)
      : (tpRaw > 0 ? [tpRaw] : []);

    tpPrices.forEach((tp, tpIdx) => {
      const tpN  = tpIdx + 1;
      const color = TP_COLORS[tpIdx] || TP_COLORS[0];
      const key  = `${posIdx}_${tpN}`;
      const ord  = tpOrders2[tpIdx];

      window._posTPLines[key] = {
        price: tp,
        orderId: ord ? ord.orderId : (p.takeProfitId || ''),
        posIdx, tpN, priceLine: null, color,
        symbol: p.symbol, holdSide: side,
        size: (ord && ord.size) ? String(ord.size) : (p.total || p.available || '0'),
      };

      // Crea priceLine solo se simbolo corrisponde al grafico attivo
      if (posSym !== curSym) return;

      const priceLine = candleSeries.createPriceLine({
        price: tp, color, lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true, title: ` TP${tpN}#${posIdx+1}`,
      });
      window._posTPLines[key].priceLine = priceLine;

      const inp = document.getElementById(`pos-tp${tpN}-input-${posIdx}`);
      if (inp) inp.value = fmtPrice(tp);

      const badge = document.getElementById(`pos-tp${tpN}-badge-${posIdx}`);
      if (badge) { badge.textContent = '$'+fmtPrice(tp); badge.className = 'pos-tp-badge'; }
    });
  });

  drawCanvas();
};

window.syncPosTpLine = function(posIdx, tpN) {
  const inp = document.getElementById(`pos-tp${tpN}-input-${posIdx}`);
  if (!inp) return;
  const price = parseFloat(inp.value);
  const key = `${posIdx}_${tpN}`;
  const entry = window._posTPLines[key];
  if (!entry) return;

  if (entry.priceLine) { try { candleSeries.removePriceLine(entry.priceLine); } catch(_){} }
  if (price && price > 0) {
    entry.priceLine = candleSeries.createPriceLine({
      price, color: entry.color, lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true, title: ` TP${tpN}#${posIdx+1}`,
    });
    entry.price = price;
  }
  drawCanvas();
};

// TP drag gestito dal sistema posLineAtY sopra

// ─── EXPORT ───

// ─── ACCOUNT (reale via Bitget, chiamato dopo login) ───
function loadAccount(){
  // mostra dash vuota — verrà popolata da fetchBitgetDashboard dopo login
  document.getElementById('accBalance').textContent='—';
  document.getElementById('accAvail').textContent='—';
  document.getElementById('accPnl').textContent='—';
  document.getElementById('accMargin').textContent='—';
  document.getElementById('tbBalance').textContent='—';
  document.getElementById('tbPnl').textContent='—';
  document.getElementById('posCount').textContent='0';
  document.getElementById('posList').innerHTML='<div class="no-pos">Connetti Bitget per vedere le posizioni</div>';
}
// refreshAccount è ridefinita nel blocco Firebase dopo login

// ─── UTILS ───
function notify(msg,type){
  const el=document.getElementById('notif');
  el.textContent=msg;
  el.className='notif show'+(type?' '+type:'');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.className='notif',2200);
}
function fmt(n){ return parseFloat(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPrice(p){
  if(!p) return '0.00';
  if(p>10000) return p.toFixed(1);
  if(p>1000)  return p.toFixed(2);
  if(p>100)   return p.toFixed(3);
  if(p>1)     return p.toFixed(4);
  return p.toFixed(6);
}
function getPDec(p){
  if(p>10000) return 1; if(p>1000) return 2; if(p>100) return 3; if(p>1) return 4; return 6;
}

// ─── GOTO PRICE ───
function gotoPrice(){
  chart.timeScale().scrollToRealTime();
  chart.timeScale().fitContent();   // riadatta zoom e proporzioni
}

// ─── PANEL RESIZE ───
(function(){
  const handle = document.getElementById('panelResize');
  const panel  = document.getElementById('panel');
  if (!handle || !panel) return;
  const MIN = 220, MAX = 520;
  let dragging = false, startX = 0, startW = 0;

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startW = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = startX - e.clientX;
    const newW  = Math.min(MAX, Math.max(MIN, startW + delta));
    panel.style.width = newW + 'px';
    document.documentElement.style.setProperty('--panel', newW + 'px');
    // Forza il chart a ridimensionarsi in tempo reale
    if (typeof chart !== 'undefined') {
      const chartEl = document.getElementById('chart');
      if (chartEl) chart.resize(chartEl.offsetWidth, chartEl.offsetHeight);
    }
    if (typeof resizeCanvas === 'function') resizeCanvas();
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try { localStorage.setItem('rf_panel_w', panel.offsetWidth); } catch(_){}
    if (typeof chart !== 'undefined') {
      const chartEl = document.getElementById('chart');
      if (chartEl) chart.resize(chartEl.offsetWidth, chartEl.offsetHeight);
    }
    if (typeof resizeCanvas === 'function') resizeCanvas();
  });

  // Ripristina larghezza salvata
  try {
    const saved = parseInt(localStorage.getItem('rf_panel_w'));
    if (saved >= MIN && saved <= MAX) {
      panel.style.width = saved + 'px';
      document.documentElement.style.setProperty('--panel', saved + 'px');
      setTimeout(() => {
        if (typeof chart !== 'undefined') {
          const chartEl = document.getElementById('chart');
          if (chartEl) chart.resize(chartEl.offsetWidth, chartEl.offsetHeight);
        }
        if (typeof resizeCanvas === 'function') resizeCanvas();
      }, 50);
    }
  } catch(_){}
})();

// ─── INIT ───
loadAccount();
updateLevPresets();
setOType('market');
resizeCanvas();
// Init ladder orders array con 4 slots vuoti
for(let i=LADDER.orders.length;i<4;i++) LADDER.orders.push({price:null,enabled:true,priceLine:null});
// Imposta bottone 4 come attivo di default
document.querySelectorAll('.ladder-n').forEach(el=>{
  el.className='lev-p ladder-n'+(parseInt(el.textContent)===4?' active':'');
});
// loadCandles viene chiamato dopo il login

// ─── MONEYSHOT ───
window.openMoneyShot = function(idx) {
  // Get position from _positions (exposed below after Firebase init)
  const p = window._getPosition ? window._getPosition(idx) : null;
  if (!p) { notify('Posizione non trovata','err'); return; }
  drawMoneyShotCanvas(p);
  document.getElementById('moneyShotModal').classList.add('open');
};
window.closeMoneyShotModal = function() {
  document.getElementById('moneyShotModal').classList.remove('open');
};
window.msSave = function() {
  const c = document.getElementById('msShotCanvas');
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'moneyshot_'+Date.now()+'.png';
  a.click();
};

function drawMoneyShotCanvas(p) {
  const canvas = document.getElementById('msShotCanvas');
  const W = 520, H = 780;
  canvas.width = W; canvas.height = H;
  const cx = canvas.getContext('2d');

  const sym    = (p.symbol||'').replace(/_?UMCBL|_?DMCBL/g,'');
  const base   = sym.replace('USDT','').replace('USD','');
  const side   = (p.holdSide||'long').toLowerCase();
  const upnl   = parseFloat(p.unrealizedPL||p.unrealizedProfitLoss||p.unrealizedPnl||0);
  const entry  = parseFloat(p.openPriceAvg||p.averageOpenPrice||p.openAvgPrice||0);
  const markPx = parseFloat(p.markPrice||p.marketPrice||entry);
  const lev    = parseFloat(p.leverage||1);
  const size   = parseFloat(p.total||p.available||p.totalPos||0);
  const notional = size*(markPx||entry);
  const margin   = notional/lev;
  const roe    = margin>0 ? (upnl/margin*100) : 0;
  const isWin  = upnl >= 0;
  const now    = new Date();
  const dateStr = now.toISOString().slice(0,10)+' '+now.toTimeString().slice(0,5)+' UTC';
  const accentColor = isWin ? '#3dffa0' : '#ff3d5a';

  // ── SEED RNG (deterministic per frame) ──
  const rng = (seed) => { let x=Math.sin(seed+1)*10000; return x-Math.floor(x); };

  // ── BACKGROUND ──
  const bg = cx.createLinearGradient(0,0,W,H);
  if(isWin){
    bg.addColorStop(0,'#060e09'); bg.addColorStop(0.6,'#07100a'); bg.addColorStop(1,'#040a06');
  } else {
    bg.addColorStop(0,'#0e0608'); bg.addColorStop(0.6,'#100407'); bg.addColorStop(1,'#0a0306');
  }
  cx.fillStyle=bg; cx.fillRect(0,0,W,H);

  // subtle grid
  cx.save(); cx.globalAlpha=0.035; cx.strokeStyle='#fff'; cx.lineWidth=1;
  for(let gx=0;gx<W;gx+=40){ cx.beginPath();cx.moveTo(gx,0);cx.lineTo(gx,H);cx.stroke(); }
  for(let gy=0;gy<H;gy+=40){ cx.beginPath();cx.moveTo(0,gy);cx.lineTo(W,gy);cx.stroke(); }
  cx.restore();

  // noise grain
  for(let i=0;i<3500;i++){
    cx.fillStyle='rgba(255,255,255,'+Math.random()*0.025+')';
    cx.fillRect(Math.random()*W,Math.random()*H,1,1);
  }

  // glow blob center
  const blob = cx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,240);
  blob.addColorStop(0, isWin?'rgba(61,255,160,0.10)':'rgba(255,61,90,0.10)');
  blob.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=blob; cx.fillRect(0,0,W,H);

  // ── TOP BAR: RISKFLOW logo (protagonist) ──
  cx.save();
  // "RISKFLOW" big + accent green
  cx.font = 'bold 22px "Syne",sans-serif';
  cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
  cx.fillStyle = '#ffffff';
  cx.fillText('Risk', 28, 46);
  const _riskW = cx.measureText('Risk').width;
  cx.fillStyle = '#a855f7';
  cx.fillText('Flow', 28+_riskW, 46);
  // "by vanillachart.com" small muted
  cx.font = '9px "DM Mono",monospace';
  cx.fillStyle = 'rgba(255,255,255,0.3)';
  cx.fillText('by vanillachart.com', 28, 62);
  // date top-right
  cx.textAlign = 'right';
  cx.font = '9px "DM Mono",monospace';
  cx.fillStyle = 'rgba(255,255,255,0.28)';
  cx.fillText(dateStr, W-28, 46);
  cx.restore();

  // separator
  cx.save(); cx.globalAlpha=0.12; cx.strokeStyle='#fff'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(28,74); cx.lineTo(W-28,74); cx.stroke();
  cx.restore();

  // ── CHARACTER ──
  const charCX = W/2, charCY = 205;

  // Helper: disegna emoji grande su canvas
  function drawEmoji(em, x, y, size){
    cx.save();
    cx.font = size+'px serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(em, x, y);
    cx.restore();
  }

  if(isWin){
    // ── WIN: glow verde + emoji stack ──
    cx.save();
    const glowWin = cx.createRadialGradient(charCX,charCY,0,charCX,charCY,160);
    glowWin.addColorStop(0,'rgba(61,255,160,0.20)');
    glowWin.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=glowWin; cx.fillRect(charCX-160,charCY-160,320,320);
    cx.restore();

    // Emoji principale — faccia con occhiali da sole
    cx.save();
    cx.shadowColor='#3dffa0'; cx.shadowBlur=40;
    drawEmoji('🤑', charCX, charCY-10, 120);
    cx.shadowBlur=0;
    cx.restore();

    // Emoji decorativi intorno
    const winDecos = [
      { em:'🚀', x:charCX-130, y:charCY-90, sz:38, rot:-0.4 },
      { em:'💰', x:charCX+135, y:charCY-75, sz:36, rot:0.3 },
      { em:'💸', x:charCX-145, y:charCY+40, sz:32, rot:-0.6 },
      { em:'💎', x:charCX+140, y:charCY+50, sz:34, rot:0.5 },
      { em:'🏆', x:charCX-70,  y:charCY-130, sz:30, rot:-0.2 },
      { em:'⭐', x:charCX+75,  y:charCY-125, sz:28, rot:0.4 },
      { em:'💵', x:charCX+160, y:charCY-10,  sz:28, rot:0.6 },
      { em:'💵', x:charCX-160, y:charCY+5,   sz:26, rot:-0.5 },
      { em:'🎯', x:charCX,     y:charCY+120, sz:30, rot:0 },
    ];
    winDecos.forEach(d=>{
      cx.save();
      cx.translate(d.x, d.y); cx.rotate(d.rot);
      cx.globalAlpha = 0.75 + rng(d.sz)*0.25;
      cx.font = d.sz+'px serif';
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(d.em, 0, 0);
      cx.restore();
    });

    // Sparkle stelle dorate
    [[charCX-80,charCY-100],[charCX+85,charCY-95],[charCX-55,charCY-118],[charCX+65,charCY-108]].forEach(([sx,sy],i)=>{
      cx.save(); cx.globalAlpha=0.6+rng(i)*0.3;
      cx.fillStyle='#ffc940'; cx.strokeStyle='#ffc940'; cx.lineWidth=1.5;
      cx.translate(sx,sy);
      for(let s=0;s<4;s++){ cx.rotate(Math.PI/4); cx.beginPath(); cx.moveTo(0,0); cx.lineTo(0,6+i); cx.stroke(); }
      cx.restore();
    });

  } else {
    // ── LOSS: glow rosso + emoji stack ──
    cx.save();
    const glowLoss = cx.createRadialGradient(charCX,charCY,0,charCX,charCY,160);
    glowLoss.addColorStop(0,'rgba(255,61,90,0.22)');
    glowLoss.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=glowLoss; cx.fillRect(charCX-160,charCY-160,320,320);
    cx.restore();

    // Emoji principale — faccia che piange / rekt
    cx.save();
    cx.shadowColor='#ff3d5a'; cx.shadowBlur=40;
    drawEmoji('😭', charCX, charCY-10, 120);
    cx.shadowBlur=0;
    cx.restore();

    // Emoji decorativi loss
    const lossDecos = [
      { em:'📉', x:charCX+140, y:charCY-80, sz:40, rot:0.2 },
      { em:'🔥', x:charCX-140, y:charCY-70, sz:38, rot:-0.3 },
      { em:'💀', x:charCX-130, y:charCY+55, sz:34, rot:-0.5 },
      { em:'🩸', x:charCX+135, y:charCY+60, sz:30, rot:0.4 },
      { em:'😱', x:charCX-65,  y:charCY-130, sz:30, rot:-0.3 },
      { em:'⚠️', x:charCX+70,  y:charCY-120, sz:28, rot:0.2 },
      { em:'💸', x:charCX+160, y:charCY+5,   sz:28, rot:0.7 },
      { em:'🪦', x:charCX,     y:charCY+120, sz:32, rot:0 },
    ];
    lossDecos.forEach(d=>{
      cx.save();
      cx.translate(d.x, d.y); cx.rotate(d.rot);
      cx.globalAlpha = 0.70 + rng(d.sz)*0.28;
      cx.font = d.sz+'px serif';
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(d.em, 0, 0);
      cx.restore();
    });

    // Testo ironico REKT
    cx.save();
    cx.textAlign='center'; cx.textBaseline='middle';
    cx.font='bold 13px "DM Mono",monospace';
    cx.fillStyle='rgba(255,61,90,0.45)';
    cx.fillText('G G', charCX, charCY+148);
    cx.restore();

    // Particelle rosse
    for(let i=0;i<10;i++){
      cx.save(); cx.globalAlpha=0.2+rng(i*9)*0.3;
      cx.fillStyle='#ff3d5a';
      cx.beginPath(); cx.arc(50+rng(i*5)*420, 80+rng(i*11)*220, 2+rng(i)*3, 0, Math.PI*2); cx.fill();
      cx.restore();
    }
  }

  // ── SYMBOL BLOCK — dark pill with pair name ──
  cx.save();
  cx.textAlign = 'center';
  // dark rounded bg for symbol
  const symPillW = 220, symPillH = 52, symPillX = W/2-symPillW/2, symPillY = 290;
  cx.fillStyle = 'rgba(10,10,13,0.72)';
  roundRect(cx, symPillX, symPillY, symPillW, symPillH, 14); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,0.08)'; cx.lineWidth = 1;
  roundRect(cx, symPillX, symPillY, symPillW, symPillH, 14); cx.stroke();
  // pair text
  cx.font = 'bold 26px "Syne",sans-serif';
  cx.fillStyle = '#ffffff';
  cx.fillText(base+'/USDT', W/2, symPillY+32);
  cx.restore();

  // side + leverage pill
  cx.save(); cx.textAlign='center';
  const pillW2=110, pillH2=24, pillX2=W/2-pillW2/2, pillY2=352;
  cx.fillStyle = isWin?'rgba(61,255,160,0.13)':'rgba(255,61,90,0.13)';
  roundRect(cx,pillX2,pillY2,pillW2,pillH2,12); cx.fill();
  cx.strokeStyle=accentColor; cx.lineWidth=1;
  roundRect(cx,pillX2,pillY2,pillW2,pillH2,12); cx.stroke();
  cx.font='bold 11px "DM Mono",monospace';
  cx.fillStyle=accentColor;
  cx.fillText((side==='long'?'▲ LONG':'▼ SHORT')+' · '+lev+'x', W/2, pillY2+16);
  cx.restore();

  // ── PNL BIG ──
  cx.save(); cx.textAlign='center';
  const pnlStr=(upnl>=0?'+':'-')+' $'+fmt(Math.abs(upnl));
  cx.shadowColor=accentColor; cx.shadowBlur=35;
  cx.font='bold 72px "Syne",sans-serif';
  cx.fillStyle=accentColor;
  cx.fillText(pnlStr, W/2, 460);
  cx.shadowBlur=0;
  cx.font='bold 18px "DM Mono",monospace';
  cx.fillStyle=isWin?'rgba(61,255,160,0.6)':'rgba(255,61,90,0.6)';
  cx.fillText((roe>=0?'+':'')+roe.toFixed(2)+'%  ROE', W/2, 486);
  cx.restore();

  // ── DIVIDER ──
  cx.save(); cx.globalAlpha=0.10; cx.strokeStyle='#fff'; cx.lineWidth=1;
  cx.setLineDash([4,6]);
  cx.beginPath(); cx.moveTo(28,508); cx.lineTo(W-28,508); cx.stroke();
  cx.setLineDash([]); cx.restore();

  // ── STATS ROW — only ENTRY + MARK ──
  const stats=[
    {l:'ENTRY', v:'$'+fmtPrice(entry)},
    {l:'MARK',  v:'$'+fmtPrice(markPx)},
  ];
  cx.save(); cx.textAlign='center';
  stats.forEach((s,i)=>{
    const sx = W/4 + i*(W/2);
    cx.font='8px "DM Mono",monospace';
    cx.fillStyle='rgba(255,255,255,0.32)';
    cx.fillText(s.l, sx, 530);
    cx.font='bold 15px "DM Mono",monospace';
    cx.fillStyle='rgba(255,255,255,0.88)';
    cx.fillText(s.v, sx, 552);
    if(i===0){
      cx.save(); cx.globalAlpha=0.1;
      cx.strokeStyle='#fff'; cx.lineWidth=1;
      cx.beginPath(); cx.moveTo(W/2,518); cx.lineTo(W/2,558); cx.stroke();
      cx.restore();
    }
  });
  cx.restore();

  // ── BOTTOM BRANDING ──
  cx.save(); cx.globalAlpha=0.08; cx.strokeStyle='#fff'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(28,580); cx.lineTo(W-28,580); cx.stroke();
  cx.restore();

  cx.save();
  cx.textAlign='center';
  // "Risk" bianco + "Flow" viola — grande centrato
  const brandY = 635;
  cx.font='bold 52px "Syne",sans-serif';
  // misura "Risk" per posizionare "Flow" subito dopo
  const riskW = cx.measureText('Risk').width;
  const flowW = cx.measureText('Flow').width;
  const totalW = riskW + flowW;
  const startX = W/2 - totalW/2;
  cx.textAlign='left'; cx.textBaseline='alphabetic';
  // glow viola su Flow
  cx.fillStyle='#a855f7';
  cx.fillText('Flow', startX+riskW, brandY);
  cx.fillStyle='#ffffff';
  cx.fillText('Risk', startX, brandY);
  // vanillachart.com sotto centrato
  cx.textAlign='center';
  cx.font='12px "DM Mono",monospace';
  cx.fillStyle='rgba(255,255,255,0.35)';
  cx.fillText('vanillachart.com', W/2, brandY+22);
  // disclaimer piccolo
  cx.font='8px "DM Mono",monospace';
  cx.fillStyle='rgba(255,255,255,0.12)';
  cx.fillText('Not financial advice', W/2, brandY+38);
  cx.restore();

  // accent corner dots
  [[28,H-28],[W-28,H-28]].forEach(([dx,dy])=>{
    cx.save(); cx.globalAlpha=0.25;
    cx.fillStyle=accentColor;
    cx.beginPath(); cx.arc(dx,dy,3,0,Math.PI*2); cx.fill();
    cx.restore();
  });
}

function roundRect(cx,x,y,w,h,r){
  cx.beginPath();
  cx.moveTo(x+r,y); cx.lineTo(x+w-r,y);
  cx.quadraticCurveTo(x+w,y,x+w,y+r);
  cx.lineTo(x+w,y+h-r);
  cx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  cx.lineTo(x+r,y+h);
  cx.quadraticCurveTo(x,y+h,x,y+h-r);
  cx.lineTo(x,y+r);
  cx.quadraticCurveTo(x,y,x+r,y);
  cx.closePath();
}

// ─── FIREBASE + BITGET SYSTEM ───
(async () => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const firebaseConfig = {
    apiKey: "AIzaSyCk4EmpRqx0RH3qUh_YNp1u4eylYgfbCgo",
    authDomain: "trading-challenge-f3eb1.firebaseapp.com",
    projectId: "trading-challenge-f3eb1",
    storageBucket: "trading-challenge-f3eb1.firebasestorage.app",
  };

  const fbApp = initializeApp(firebaseConfig);
  const auth  = getAuth(fbApp);
  const db    = getFirestore(fbApp);
  let currentUser = null;

  // ── BITGET PROXY ──
  const BITGET_PROXY = 'https://bitget-proxy-mze2.onrender.com';

  // ── CRYPTO AES-GCM ──
  const CRYPTO_SALT = 'vanillachart-bitget-v1';
  async function deriveKey(uid) {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey('raw', enc.encode(uid+CRYPTO_SALT), {name:'PBKDF2'}, false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode(CRYPTO_SALT),iterations:100000,hash:'SHA-256'}, km, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  }
  async function encryptStr(uid, pt) {
    const key = await deriveKey(uid);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, new TextEncoder().encode(pt));
    const combined = new Uint8Array(iv.byteLength+ct.byteLength);
    combined.set(iv,0); combined.set(new Uint8Array(ct),iv.byteLength);
    return btoa(String.fromCharCode(...combined));
  }
  async function decryptStr(uid, b64) {
    try {
      const key = await deriveKey(uid);
      const combined = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
      const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:combined.slice(0,12)}, key, combined.slice(12));
      return new TextDecoder().decode(plain);
    } catch { return ''; }
  }

  // ── FIRESTORE KEY HELPERS ──
  async function saveKeysToFirestore(uid, apiKey, secret, passphrase) {
    const [encKey,encSecret,encPass] = await Promise.all([encryptStr(uid,apiKey),encryptStr(uid,secret),encryptStr(uid,passphrase||'')]);
    await setDoc(doc(db,'apiKeys',uid), {exchange:'bitget',encKey,encSecret,encPass,updatedAt:Date.now()});
  }
  async function loadKeysFromFirestore(uid) {
    const snap = await getDoc(doc(db,'apiKeys',uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const [apiKey,secret,passphrase] = await Promise.all([decryptStr(uid,d.encKey||''),decryptStr(uid,d.encSecret||''),decryptStr(uid,d.encPass||'')]);
    return {apiKey,secret,passphrase};
  }
  async function deleteKeysFromFirestore(uid) {
    await setDoc(doc(db,'apiKeys',uid), {exchange:'bitget',encKey:'',encSecret:'',encPass:'',updatedAt:Date.now()});
  }

  // ── LOCALSTORAGE HELPERS ──
  function loadBitgetKeys() {
    return {
      apiKey: localStorage.getItem('bitget_api_key')||'',
      secret: localStorage.getItem('bitget_api_secret')||'',
      passphrase: localStorage.getItem('bitget_api_passphrase')||''
    };
  }
  async function syncKeysFromFirestore(uid) {
    const keys = await loadKeysFromFirestore(uid);
    if (!keys||!keys.apiKey) return;
    if (!localStorage.getItem('bitget_api_key')) {
      localStorage.setItem('bitget_api_key', keys.apiKey);
      localStorage.setItem('bitget_api_secret', keys.secret);
      if (keys.passphrase) localStorage.setItem('bitget_api_passphrase', keys.passphrase);
    }
  }

  // ── BITGET REQUEST via Proxy ──
  async function bitgetRequest(endpoint, params={}, options={}) {
    const {apiKey,secret,passphrase} = loadBitgetKeys();
    if (!apiKey||!secret) throw new Error('Chiavi API non configurate');
    const method = options.method||'GET';
    let url, fetchOpts;
    if(method==='GET'){
      const qstr = new URLSearchParams({endpoint,...params}).toString();
      url = `${BITGET_PROXY}?${qstr}`;
      fetchOpts = {method:'GET', headers:{'x-bitget-key':apiKey,'x-bitget-secret':secret,'x-bitget-passphrase':passphrase||''}};
    } else {
      url = `${BITGET_PROXY}?endpoint=${encodeURIComponent(endpoint)}`;
      fetchOpts = {method:'POST', headers:{'x-bitget-key':apiKey,'x-bitget-secret':secret,'x-bitget-passphrase':passphrase||'','Content-Type':'application/json'}, body:options.body||'{}'};
    }
    const res = await fetch(url, fetchOpts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.code && data.code!=='00000' && data.code!==0) throw new Error(data.msg||`Errore API: ${data.code}`);
    return data;
  }
  // Esponi globalmente per executeOrder
  window._bitgetRequest = bitgetRequest;

  // ── FETCH ORDINI PENDING ──
  async function fetchBitgetOrders() {
    const {apiKey} = loadBitgetKeys();
    if (!apiKey) return;
    try {
      const data = await bitgetRequest('/api/v2/mix/order/orders-pending', {
        productType: 'USDT-FUTURES',
      });
      const orders = data.data?.entrustedList || data.data || [];
      renderBitgetOrders(Array.isArray(orders) ? orders : []);
    } catch(e) {
      console.warn('fetchBitgetOrders:', e.message);
    }
  }

  function renderBitgetOrders(orders) {
    const list = document.getElementById('ordList');
    const badge = document.getElementById('ordCount');
    if (!list) return;
    if (!orders.length) {
      list.innerHTML = '<div class="no-ord">Nessun ordine pending</div>';
      badge.textContent = '0';
      return;
    }
    badge.textContent = orders.length;
    list.innerHTML = orders.map(o => {
      const sym    = (o.symbol||'').replace('_UMCBL','').replace('_DMCBL','').replace('UMCBL','').replace('DMCBL','');
      const side   = (o.side||'buy').toLowerCase();
      const isLong = side === 'buy' || side === 'open_long';
      const price  = parseFloat(o.price||o.triggerPrice||0);
      const size   = parseFloat(o.size||o.baseVolume||0);
      const type   = (o.orderType||o.planType||'limit').replace('_',' ');
      const ordId  = o.orderId||o.clientOid||'';
      return `<div class="ord-item ${isLong?'long':'short'}">
        <div class="ord-top">
          <div class="ord-l">
            <div class="op">${sym} <span style="font-size:9px;color:var(--${isLong?'green':'red'})">${isLong?'▲ LONG':'▼ SHORT'}</span></div>
            <div class="od">${type.toUpperCase()} · ${size} cont</div>
          </div>
          <div class="ord-r">
            <span class="ord-price" style="color:var(--accent)">$${fmtPrice(price)}</span>
            <button class="ord-cancel" onclick="cancelBitgetOrder('${o.symbol}','${ordId}')">✕ Cancella</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  window.closeAllPositions = async function() {
    if (!_positions.length) { notify('Nessuna posizione aperta','err'); return; }
    if (!confirm(`Chiudere tutte le ${_positions.length} posizioni?`)) return;
    notify('Chiusura posizioni...','');
    let ok=0, fail=0;
    for (const p of _positions) {
      const side = (p.holdSide||'long').toLowerCase();
      try {
        await bitgetRequest('/api/v2/mix/order/close-positions', {}, {
          method: 'POST',
          body: JSON.stringify({
            symbol: p.symbol,
            productType: 'USDT-FUTURES',
            holdSide: side,
          }),
        });
        ok++;
      } catch(e) { fail++; console.warn('closeAll error:', p.symbol, e.message); }
    }
    notify(fail===0 ? `✓ ${ok} posizioni chiuse` : `${ok} chiuse, ${fail} errori`, fail===0?'ok':'err');
    setTimeout(()=>fetchBitgetDashboard(), 1500);
  };

  window.cancelBitgetOrder = async function(symbol, orderId) {
    if (!confirm('Cancellare questo ordine?')) return;
    try {
      await bitgetRequest('/api/v2/mix/order/cancel-order', {}, {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          productType: 'USDT-FUTURES',
          orderId,
        }),
      });
      notify('Ordine cancellato ✓', 'ok');
      fetchBitgetOrders();
    } catch(e) {
      notify('Errore cancellazione: ' + e.message, 'err');
    }
  };

  // ── FETCH BALANCE + POSIZIONI ──
  async function fetchBitgetDashboard() {
    const statusEl = document.getElementById('apiStatus');
    const balEl    = document.getElementById('apiBitgetBalance');
    const upnlEl   = document.getElementById('apiBitgetUpnl');
    const posEl    = document.getElementById('apiBitgetPositions');
    const syncEl   = document.getElementById('apiSyncTime');

    try {
      // Balance
      const balData = await bitgetRequest('/api/v2/mix/account/accounts', {productType:'USDT-FUTURES'});
      let rawBal = balData.data||[];
      if (!Array.isArray(rawBal)) rawBal=[rawBal];
      const usdt = rawBal.find(a=>(a.marginCoin||'').toUpperCase()==='USDT')||rawBal[0];
      if (usdt) {
        const equity    = parseFloat(usdt.accountEquity||usdt.usdtEquity||usdt.equity||usdt.crossedMaxAvailable||usdt.available||0);
        const available = parseFloat(usdt.crossedMaxAvailable||usdt.available||usdt.maxOpenPosAvailable||0);
        const upnl      = parseFloat(usdt.unrealizedPL||usdt.unrealizedProfit||usdt.crossedUnrealizedPL||0);
        const margin    = parseFloat(usdt.crossedRiskRate||usdt.locked||usdt.margin||0);

        if (balEl) balEl.textContent = '$'+equity.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
        if (upnlEl) { upnlEl.textContent=(upnl>=0?'+':'-')+'$'+Math.abs(upnl).toFixed(2); upnlEl.style.color=upnl>=0?'var(--green)':'var(--red)'; }

        // Panel account
        document.getElementById('accBalance').textContent='$'+fmt(equity);
        document.getElementById('accAvail').textContent='$'+fmt(available);
        const pEl=document.getElementById('accPnl');
        pEl.textContent=(upnl>=0?'+':'-')+'$'+fmt(Math.abs(upnl));
        pEl.className='av '+(upnl>=0?'pos':'neg');
        document.getElementById('accMargin').textContent='$'+fmt(Math.abs(margin));

        // Topbar
        document.getElementById('tbBalance').textContent='$'+fmt(equity);
        const tEl=document.getElementById('tbPnl');
        tEl.textContent=(upnl>=0?'+':'-')+'$'+fmt(Math.abs(upnl));
        tEl.className='tv '+(upnl>=0?'pos':'neg');

        S.balance = equity;
      }
      // Posizioni
      const posData = await bitgetRequest('/api/v2/mix/position/all-position', {productType:'USDT-FUTURES',marginCoin:'USDT'});
      const positions = (posData.data||[]).filter(p=>parseFloat(p.total||p.available||0)>0);
      if (posEl) posEl.textContent = positions.length;
      renderBitgetPositions(positions);
      // Carica ordini TP/SL attivi per le posizioni
      fetchPositionTPSLOrders(positions);

      if (statusEl) { statusEl.textContent='✓ Connesso'; statusEl.className='api-status ok'; }
      if (syncEl) { const n=new Date(); syncEl.textContent='Sync '+n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0')+':'+n.getSeconds().toString().padStart(2,'0'); }
      notify('Bitget sync ✓','ok');
      fetchBitgetOrders();
    } catch(e) {
      if (statusEl) { statusEl.textContent='✗ '+e.message; statusEl.className='api-status err'; }
      notify('Bitget: '+e.message,'err');
    }
  }

    // Store positions globally for modal access
  let _positions = [];
  window._getPosition = function(idx){ return _positions[idx]||null; };

  function renderBitgetPositions(positions) {
    _positions = positions;
    window._positions = positions;
    const list = document.getElementById('posList');
    if (!list) return;
    if (!positions.length) {
      list.innerHTML='<div class="no-pos">No open positions</div>';
      // Rimuovi tutte le linee SL dal grafico
      if (window.refreshPosSLLines) window.refreshPosSLLines([]);
      stopRealtimePnl();
      return;
    }
    list.innerHTML = positions.map((p,idx)=>{
      const sym   = (p.symbol||'').replace('_UMCBL','').replace('_DMCBL','').replace('UMCBL','').replace('DMCBL','');
      const side  = (p.holdSide||'long').toLowerCase();
      const upnl  = parseFloat(p.unrealizedPL||p.unrealizedProfitLoss||p.unrealizedPnl||0);
      const entry = parseFloat(p.openPriceAvg||p.averageOpenPrice||p.openAvgPrice||0);
      const markPx= parseFloat(p.markPrice||p.marketPrice||0);
      const size  = parseFloat(p.total||p.available||p.totalPos||0);
      const notional = size * (markPx||entry);
      const lev   = parseFloat(p.leverage||1);
      const margin = notional / lev;
      const roe   = margin>0 ? (upnl/margin*100) : 0;
      const liqPx = parseFloat(p.liquidationPrice||p.liqPrice||0);
      const slPx  = parseFloat(p.stopLoss||p.stopLossPrice||p.presetStopLossPrice||0);
      const tpPx  = parseFloat(p.takeProfit||p.takeProfitPrice||p.presetTakeProfitPrice||0);
      const slDist = slPx>0 && entry>0 ? Math.abs(entry-slPx)/entry*100 : 0;
      return `<div class="pos-item ${side}" id="pos-item-${idx}" onclick="togglePosExpand(${idx})"
          data-entry="${entry}" data-size="${size}" data-lev="${lev}" data-side="${side}" data-sym="${sym}">
        <div class="pos-top">
          <div class="pos-l">
            <div class="pp">${sym} <span style="font-size:9px;color:var(--muted2)">${lev}x</span></div>
            <div class="pd">${side.toUpperCase()} · Entry $${fmtPrice(entry)}</div>
          </div>
          <div class="pos-r">
            <div class="pnl ${upnl>=0?'pos':'neg'}" id="pos-pnl-${idx}">${upnl>=0?'+':'-'}$${fmt(Math.abs(upnl))} <span style="font-size:9px;opacity:.7">(${roe>=0?'+':''}${roe.toFixed(2)}%)</span></div>
            <div class="psz" id="pos-notional-${idx}">${fmt(size)} cont · $${fmt(notional)}</div>
          </div>
        </div>
        <div class="pos-expand" id="pos-exp-${idx}">
          <div class="pos-stats">
            <div class="ps-cell"><div class="psl">Mark</div><div class="psv" id="pos-mark-${idx}">$${fmtPrice(markPx||entry)}</div></div>
            <div class="ps-cell"><div class="psl">Margin</div><div class="psv" id="pos-margin-${idx}">$${fmt(margin)}</div></div>
            <div class="ps-cell"><div class="psl">Liq.</div><div class="psv" style="color:var(--red)">${liqPx>0?'$'+fmtPrice(liqPx):'—'}</div></div>
          </div>
          <!-- SL/TP correnti — popolato da fetchPositionTPSLOrders -->
          <div id="pos-tpsl-info-${idx}" style="display:flex;gap:4px;margin-bottom:8px">
            <div style="flex:1;background:var(--red-dim);border:1px solid var(--red);border-radius:4px;padding:5px 8px">
              <div style="font-size:8px;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Stop Loss</div>
              <div style="font-size:12px;font-weight:700;color:var(--red);font-family:'Syne',sans-serif">${slPx>0?'$'+fmtPrice(slPx):'Caricamento...'}</div>
              ${slPx>0&&slDist>0?`<div style="font-size:9px;color:var(--muted2);margin-top:1px">−${slDist.toFixed(2)}% dall'entry</div>`:''}
            </div>
            <div style="flex:1;background:var(--green-dim);border:1px solid var(--green);border-radius:4px;padding:5px 8px">
              <div style="font-size:8px;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Take Profit</div>
              <div style="font-size:12px;font-weight:700;color:var(--green);font-family:'Syne',sans-serif">${tpPx>0?'$'+fmtPrice(tpPx):'—'}</div>
            </div>
          </div>
          <!-- Mod SL -->
          <div class="pos-modify-sl" onclick="event.stopPropagation()">
            <span class="pml">Mod SL</span>
            <div class="pos-sl-wrap">
              <input type="number" id="pos-sl-input-${idx}" placeholder="${liqPx>0?'Liq $'+fmtPrice(liqPx):'es. '+fmtPrice(entry*(side==='long'?0.98:1.02))}" step="0.01"
                onclick="event.stopPropagation()" oninput="event.stopPropagation();syncPosSlLine(${idx})" value=""/>
              <span class="unit">$</span>
            </div>
            <button class="pos-sl-btn" onclick="event.stopPropagation();modifyPositionSL(${idx})">Set SL</button>
            <button class="pos-be-btn" onclick="event.stopPropagation();moveToBreakeven(${idx})" title="Sposta SL all'entry (Breakeven)">BE</button>
          </div>
          <!-- Mod TP -->
          <div class="pos-modify-tp" onclick="event.stopPropagation()">
            ${[1,2,3].map(n=>`
            <div class="pos-tp-row" onclick="event.stopPropagation()">
              <span class="pml">TP${n}</span>
              <div class="pos-tp-wrap">
                <input type="number" id="pos-tp${n}-input-${idx}" placeholder="—" step="0.01"
                  onclick="event.stopPropagation()" oninput="event.stopPropagation();syncPosTpLine(${idx},${n})" value=""/>
                <span class="unit">$</span>
              </div>
              <span class="pos-tp-badge empty" id="pos-tp${n}-badge-${idx}">—</span>
              <button class="pos-tp-btn" onclick="event.stopPropagation();modifyPositionTP(${idx},${n})">Set</button>
            </div>`).join('')}
          </div>
          <!-- Partial close slider -->
          <div class="pct-row" onclick="event.stopPropagation()" style="margin-top:8px">
            <span class="pct-label">Close</span>
            <input type="range" class="pct-slider" id="pct-slider-${idx}" min="1" max="100" value="25"
              onclick="event.stopPropagation()" oninput="event.stopPropagation();updatePctDisplay(${idx},${size},${upnl})"/>
            <span class="pct-val" id="pct-val-${idx}">25%</span>
          </div>
          <div class="pct-usd" id="pct-usd-${idx}">${upnl>=0?'+':''}$${fmt(upnl*0.25)} P&L · ${fmt(size*0.25)} cont</div>
          <div class="pct-presets" onclick="event.stopPropagation()">
            <div class="pct-preset" onclick="event.stopPropagation();setPct(${idx},25,${size},${upnl})">25%</div>
            <div class="pct-preset" onclick="event.stopPropagation();setPct(${idx},50,${size},${upnl})">50%</div>
            <div class="pct-preset" onclick="event.stopPropagation();setPct(${idx},75,${size},${upnl})">75%</div>
            <div class="pct-preset active" onclick="event.stopPropagation();setPct(${idx},100,${size},${upnl})">100%</div>
          </div>
          <div class="pos-btns" onclick="event.stopPropagation()">
            <button class="pos-btn-partial" onclick="event.stopPropagation();openPosModal(${idx},'partial')">⚡ Parziale</button>
            <button class="pos-btn-close"   onclick="event.stopPropagation();openPosModal(${idx},'full')">✕ Chiudi tutto</button>
          </div>
          <button class="pos-btn-shot" onclick="event.stopPropagation();openMoneyShot(${idx})">📸 Money Shot</button>
        </div>
      </div>`;
    }).join('');
    document.getElementById('posCount').textContent = positions.length;
    // Aggiorna le linee SL sul grafico
    if (window.refreshPosSLLines) window.refreshPosSLLines(positions, window._tpslOrdersMap);
    if (window.refreshPosTPLines) window.refreshPosTPLines([], positions, window._tpslOrdersMap);
    // Avvia il loop realtime PnL
    startRealtimePnl();
  }

  // ── FETCH ORDINI TPSL ATTIVI DA BITGET ──
  // Registry globale: "SYMBOL_SIDE" → [ {type:'sl'|'tp', price, orderId, size}, ... ]
  window._tpslOrdersMap = {};

  async function fetchPositionTPSLOrders(positions) {
    try {
      // Prova orders-tpsl-pending (endpoint corretto per SL/TP su posizioni)
      let orders = [];
      try {
        const data = await bitgetRequest('/api/v2/mix/order/orders-plan-pending', {
          productType: 'USDT-FUTURES',
          planType: 'profit_loss',
        });
        let raw = data.data?.entrustedList || data.data?.list || data.data || [];
        if (!Array.isArray(raw)) raw = raw ? [raw] : [];
        orders = orders.concat(raw);
      } catch(e) { console.warn('[TPSL] tpsl-pending failed:', e.message); }

      // Prova anche senza planType nel caso il parametro causi problemi
      if (orders.length === 0) {
        try {
          const data2 = await bitgetRequest('/api/v2/mix/order/orders-plan-pending', {
            productType: 'USDT-FUTURES',
          });
          let raw2 = data2.data?.entrustedList || data2.data?.list || data2.data || [];
          if (!Array.isArray(raw2)) raw2 = raw2 ? [raw2] : [];
          orders = orders.concat(raw2);
        } catch(e) { console.warn('[TPSL] tpsl-pending no planType failed:', e.message); }
      }

      // Costruisci mappa: chiave = "SYMBOL_side"
      const map = {};
      orders.forEach(o => {
        const sym   = (o.symbol||'').replace(/_?(UMCBL|DMCBL)/gi,'');
        const side  = (o.posSide||o.holdSide||'').toLowerCase();
        const pt    = (o.planType||'').toLowerCase();
        const price = parseFloat(o.triggerPrice||o.stopLossTriggerPrice||0);
        if (!sym || !side || !price) return;
        const key = sym+'_'+side;
        if (!map[key]) map[key] = [];
        map[key].push({
          type: pt.includes('loss') ? 'sl' : 'tp',
          price, orderId: o.orderId||'', planType: o.planType||'',
          size: parseFloat(o.size||0),
        });
      });
      window._tpslOrdersMap = map;

      positions.forEach((p, idx) => {
        const sym  = (p.symbol||'').replace(/_?(UMCBL|DMCBL)/gi,'');
        const side = (p.holdSide||'long').toLowerCase();
        const key  = sym+'_'+side;
        updatePosSLTPDisplay(idx, map[key]||[], p);
      });

      if (window.refreshPosSLLines) window.refreshPosSLLines(positions, map);
      if (window.refreshPosTPLines) window.refreshPosTPLines([], positions, map);
    } catch(e) {
      console.warn('[TPSL] error generale:', e.message);
      positions.forEach((p, idx) => updatePosSLTPDisplay(idx, [], p));
    }
  }

  // Cancella singolo ordine TPSL
  window.cancelTpslOrder = async function(symbol, orderId, planType, label) {
    if (!confirm(`Eliminare ${label}?`)) return;
    try {
      const res = await bitgetRequest('/api/v2/mix/order/cancel-plan-order', {}, {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          productType: 'USDT-FUTURES',
          marginCoin: 'USDT',
          orderId,
          planType,
        }),
      });
      notify(`✓ ${label} eliminato`, 'ok');
      setTimeout(() => fetchBitgetDashboard(), 1200);
    } catch(e) {
      console.error('[cancelTpsl] error:', e.message);
      notify('✗ Errore: ' + e.message, 'err');
    }
  };

  // Aggiorna il box SL/TP nel pannello posizione con i dati reali degli ordini TPSL
  function updatePosSLTPDisplay(idx, tpslList, p) {
    const container = document.getElementById('pos-tpsl-info-'+idx);
    if (!container) return;

    const entry  = parseFloat(p.openPriceAvg||p.averageOpenPrice||p.openAvgPrice||0);
    const symbol = p.symbol || '';
    const slOrders = tpslList.filter(o => o.type === 'sl').sort((a,b)=>a.price-b.price);
    const tpOrders = tpslList.filter(o => o.type === 'tp').sort((a,b)=>a.price-b.price);

    const slFallback = parseFloat(p.stopLoss||p.stopLossPrice||p.presetStopLossPrice||0);
    const tpFallback = parseFloat(p.takeProfit||p.takeProfitPrice||p.presetTakeProfitPrice||0);

    const xBtn = (orderId, planType, label) => orderId
      ? `<button onclick="event.stopPropagation();cancelTpslOrder('${symbol}','${orderId}','${planType}','${label}')"
           style="background:none;border:1px solid rgba(255,255,255,0.12);border-radius:3px;color:var(--muted2);
                  font-size:9px;cursor:pointer;padding:1px 5px;line-height:1.4;flex-shrink:0;transition:all .12s"
           onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
           onmouseout="this.style.borderColor='rgba(255,255,255,0.12)';this.style.color='var(--muted2)'">✕</button>`
      : '';

    let slHtml = '';
    if (slOrders.length > 0) {
      slOrders.forEach((o,i) => {
        const dist = entry>0 ? Math.abs(entry-o.price)/entry*100 : 0;
        slHtml += `<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;${i>0?'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,45,74,0.2)':''}">
          <span style="font-size:${slOrders.length>1?'11':'12'}px;font-weight:700;color:var(--red);font-family:'Syne',sans-serif">$${fmtPrice(o.price)}</span>
          <span style="font-size:8px;color:var(--muted2);flex:1">${o.size>0?o.size+' cont':''} −${dist.toFixed(2)}%</span>
          ${xBtn(o.orderId, o.planType, 'SL $'+fmtPrice(o.price))}
        </div>`;
      });
    } else if (slFallback > 0) {
      const dist = entry>0 ? Math.abs(entry-slFallback)/entry*100 : 0;
      slHtml = `<div style="font-size:12px;font-weight:700;color:var(--red);font-family:'Syne',sans-serif">$${fmtPrice(slFallback)}</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:1px">−${dist.toFixed(2)}% dall'entry</div>`;
    } else {
      slHtml = `<div style="font-size:11px;color:var(--muted2);font-style:italic">Non impostato</div>`;
    }

    let tpHtml = '';
    if (tpOrders.length > 0) {
      tpOrders.forEach((o,i) => {
        tpHtml += `<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;${i>0?'margin-top:4px;padding-top:4px;border-top:1px solid rgba(0,209,122,0.2)':''}">
          <span style="font-size:${tpOrders.length>1?'11':'12'}px;font-weight:700;color:var(--green);font-family:'Syne',sans-serif">$${fmtPrice(o.price)}</span>
          ${o.size>0?`<span style="font-size:8px;color:var(--muted2);flex:1">${o.size} cont</span>`:'<span style="flex:1"></span>'}
          ${xBtn(o.orderId, o.planType, 'TP $'+fmtPrice(o.price))}
        </div>`;
      });
    } else if (tpFallback > 0) {
      tpHtml = `<div style="font-size:12px;font-weight:700;color:var(--green);font-family:'Syne',sans-serif">$${fmtPrice(tpFallback)}</div>`;
    } else {
      tpHtml = `<div style="font-size:11px;color:var(--muted2);font-style:italic">—</div>`;
    }

    container.innerHTML = `
      <div style="flex:1;background:var(--red-dim);border:1px solid var(--red);border-radius:4px;padding:5px 8px">
        <div style="font-size:8px;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">
          Stop Loss${slOrders.length>1?' ('+slOrders.length+')':''}
        </div>
        ${slHtml}
      </div>
      <div style="flex:1;background:var(--green-dim);border:1px solid var(--green);border-radius:4px;padding:5px 8px">
        <div style="font-size:8px;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">
          Take Profit${tpOrders.length>1?' ('+tpOrders.length+')':''}
        </div>
        ${tpHtml}
      </div>
    `;
  }

  // ── MODIFY TP POSIZIONE ──
  window.modifyPositionTP = async function(posIdx, tpN) {
    const p = _positions[posIdx];
    if (!p) return;

    const inp = document.getElementById(`pos-tp${tpN}-input-${posIdx}`);
    let newTP = inp ? parseFloat(inp.value) : 0;

    const key = `${posIdx}_${tpN}`;
    if (!newTP && window._posTPLines[key]?.price) newTP = window._posTPLines[key].price;
    if (!newTP || newTP <= 0) { notify('Inserisci un prezzo TP valido', 'err'); return; }

    const side  = (p.holdSide || 'long').toLowerCase();
    const entry = parseFloat(p.openPriceAvg || p.averageOpenPrice || p.openAvgPrice || 0);

    if (side === 'long'  && newTP <= entry) { notify('TP long deve essere sopra l\'entry', 'err'); return; }
    if (side === 'short' && newTP >= entry) { notify('TP short deve essere sotto l\'entry', 'err'); return; }

    notify(`Modifica TP${tpN} in corso...`, '');

    try {
      const cInfo = await fetchContractInfo(p.symbol);
      const tpStr = roundToTick(newTP, cInfo.pricePlace).toFixed(cInfo.pricePlace);
      const existingEntry = window._posTPLines[key];
      const orderId = existingEntry?.orderId || p.takeProfitId || '';
      const size = existingEntry?.size || String(parseFloat(p.total||p.available||0));

      if (orderId) {
        try {
          await bitgetRequest('/api/v2/mix/order/modify-tpsl-order', {}, {
            method: 'POST',
            body: JSON.stringify({
              symbol: p.symbol,
              productType: 'USDT-FUTURES',
              marginCoin: 'USDT',
              orderId,
              triggerPrice: tpStr,
              triggerType: 'mark_price',
            }),
          });
          notify(`✓ TP${tpN}#${posIdx+1} aggiornato a $${fmtPrice(newTP)}`, 'ok');
          setTimeout(() => fetchBitgetDashboard(), 1200);
          return;
        } catch(e) { console.warn('modify-tp fallback to place:', e.message); }
      }

      // Nessun ordine esistente — piazza nuovo TP
      await bitgetRequest('/api/v2/mix/order/place-tpsl-order', {}, {
        method: 'POST',
        body: JSON.stringify({
          symbol: p.symbol,
          productType: 'USDT-FUTURES',
          marginCoin: 'USDT',
          planType: 'profit_plan',
          triggerPrice: tpStr,
          triggerType: 'mark_price',
          executePrice: '0',
          holdSide: side,
          size: String(size),
          clientOid: 'rf_modtp'+tpN+'_'+Date.now(),
        }),
      });
      notify(`✓ TP${tpN}#${posIdx+1} impostato a $${fmtPrice(newTP)}`, 'ok');
      setTimeout(() => fetchBitgetDashboard(), 1200);

    } catch(e) {
      notify(`✗ Errore TP${tpN}: ` + e.message, 'err');
      console.error('modifyPositionTP:', e);
    }
  };

  // ── MODIFY STOP LOSS POSIZIONE ──
  window.modifyPositionSL = async function(idx) {
    const p = _positions[idx];
    if (!p) return;

    // Prendi il prezzo dal campo input OPPURE dalla linea draggata
    const inp = document.getElementById('pos-sl-input-'+idx);
    let newSL = inp ? parseFloat(inp.value) : 0;

    // Fallback: usa il prezzo dalla linea se l'input è vuoto
    if (!newSL && window._posSLLines[idx]?.price) {
      newSL = window._posSLLines[idx].price;
    }

    if (!newSL || newSL <= 0) {
      notify('Inserisci un prezzo SL valido', 'err');
      return;
    }

    const side     = (p.holdSide || 'long').toLowerCase();
    const entry    = parseFloat(p.openPriceAvg || p.averageOpenPrice || p.openAvgPrice || 0);
    const sym      = (p.symbol||'').replace('_UMCBL','').replace('_DMCBL','');
    const symClean = sym.replace('UMCBL','').replace('DMCBL','');

    // Validazione direzione
    if (side === 'long'  && newSL >= entry) { notify('SL long deve essere sotto l\'entry', 'err'); return; }
    if (side === 'short' && newSL <= entry) { notify('SL short deve essere sopra l\'entry', 'err'); return; }

    notify('Modifica SL in corso...', '');

    try {
      const cInfo = await fetchContractInfo(p.symbol);
      const slStr = roundToTick(newSL, cInfo.pricePlace).toFixed(cInfo.pricePlace);

      // 1. Prendi LIVE tutti gli ordini TPSL pending per questo simbolo+lato
      let existingSLIds = [];
      try {
        const tpslData = await bitgetRequest('/api/v2/mix/order/orders-plan-pending', {
          productType: 'USDT-FUTURES',
          planType: 'profit_loss',
        });
        let tpslArr = tpslData.data?.entrustedList || tpslData.data?.list || tpslData.data || [];
        if (!Array.isArray(tpslArr)) tpslArr = tpslArr ? [tpslArr] : [];

        existingSLIds = tpslArr
          .filter(o => {
            const oSide = (o.posSide||o.holdSide||'').toLowerCase();
            const pt    = (o.planType||'').toLowerCase();
            return pt.includes('loss') && oSide === side;
          })
          .map(o => ({ orderId: o.orderId, planType: o.planType }))
          .filter(o => o.orderId);

      } catch(e) { console.warn('[modSL] fetch tpsl pending failed:', e.message); }

      // 2. Cancella tutti gli SL trovati
      for (const slOrd of existingSLIds) {
        try {
          const cres = await bitgetRequest('/api/v2/mix/order/cancel-plan-order', {}, {
            method: 'POST',
            body: JSON.stringify({
              symbol: p.symbol,
              productType: 'USDT-FUTURES',
              marginCoin: 'USDT',
              orderId: slOrd.orderId,
              planType: slOrd.planType,
            }),
          });
        } catch(e) { console.warn('[modSL] cancel failed:', slOrd.orderId, e.message); }
      }

      // 3. Piazza il nuovo SL unico
      const slBody = {
        symbol: p.symbol,
        productType: 'USDT-FUTURES',
        marginCoin: 'USDT',
        planType: 'loss_plan',
        triggerPrice: slStr,
        triggerType: 'mark_price',
        executePrice: '0',
        holdSide: side,
        size: String(parseFloat(p.total || p.available || 0)),
        clientOid: 'rf_modsl_'+Date.now(),
      };
      await bitgetRequest('/api/v2/mix/order/place-tpsl-order', {}, {
        method: 'POST', body: JSON.stringify(slBody),
      });

      const msg = existingSLIds.length > 0
        ? `✓ SL aggiornato a $${fmtPrice(newSL)} (rimossi ${existingSLIds.length} SL precedenti)`
        : `✓ SL impostato a $${fmtPrice(newSL)}`;
      notify(msg, 'ok');
      setTimeout(() => fetchBitgetDashboard(), 1500);

    } catch(e) {
      notify('✗ Errore SL: ' + e.message, 'err');
      console.error('modifyPositionSL:', e);
    }
  };

  // ── MOVE TO BREAKEVEN ──
  window.moveToBreakeven = async function(idx) {
    const p = _positions[idx];
    if (!p) return;

    const entry = parseFloat(p.openPriceAvg || p.averageOpenPrice || p.openAvgPrice || 0);
    if (!entry || entry <= 0) { notify('Prezzo entry non disponibile', 'err'); return; }

    const side = (p.holdSide || 'long').toLowerCase();
    const sym  = (p.symbol || '').replace('_UMCBL','').replace('_DMCBL','').replace('UMCBL','').replace('DMCBL','');

    if (!confirm('Spostare lo SL a Breakeven ($'+fmtPrice(entry)+') per '+sym+' '+side.toUpperCase()+'?')) return;

    notify('Imposto BE in corso...', '');

    try {
      const cInfo = await fetchContractInfo(p.symbol);
      const beStr = roundToTick(entry, cInfo.pricePlace).toFixed(cInfo.pricePlace);

      // Cancella SL esistenti
      let existingSLIds = [];
      try {
        const tpslData = await bitgetRequest('/api/v2/mix/order/orders-plan-pending', { productType: 'USDT-FUTURES', planType: 'profit_loss' });
        let tpslArr = tpslData.data?.entrustedList || tpslData.data?.list || tpslData.data || [];
        if (!Array.isArray(tpslArr)) tpslArr = tpslArr ? [tpslArr] : [];
        existingSLIds = tpslArr
          .filter(o => {
            const oSide = (o.posSide || o.holdSide || '').toLowerCase();
            const pt    = (o.planType || '').toLowerCase();
            return pt.includes('loss') && oSide === side;
          })
          .map(o => ({ orderId: o.orderId, planType: o.planType }))
          .filter(o => o.orderId);
      } catch(e) { console.warn('[BE] fetch tpsl failed:', e.message); }

      for (const slOrd of existingSLIds) {
        try {
          await bitgetRequest('/api/v2/mix/order/cancel-plan-order', {}, {
            method: 'POST',
            body: JSON.stringify({ symbol: p.symbol, productType: 'USDT-FUTURES', marginCoin: 'USDT', orderId: slOrd.orderId, planType: slOrd.planType }),
          });
        } catch(e) { console.warn('[BE] cancel SL failed:', e.message); }
      }

      // Piazza nuovo SL all'entry (breakeven)
      await bitgetRequest('/api/v2/mix/order/place-tpsl-order', {}, {
        method: 'POST',
        body: JSON.stringify({
          symbol: p.symbol,
          productType: 'USDT-FUTURES',
          marginCoin: 'USDT',
          planType: 'loss_plan',
          triggerPrice: beStr,
          triggerType: 'mark_price',
          executePrice: '0',
          holdSide: side,
          size: String(parseFloat(p.total || p.available || 0)),
          clientOid: 'rf_be_' + Date.now(),
        }),
      });

      // Aggiorna input SL col valore BE per feedback visivo
      const inp = document.getElementById('pos-sl-input-' + idx);
      if (inp) { inp.value = fmtPrice(entry); syncPosSlLine(idx); }

      notify('✓ BE impostato a $'+fmtPrice(entry)+' per '+sym, 'ok');
      setTimeout(() => fetchBitgetDashboard(), 1500);

    } catch(e) {
      notify('✗ Errore BE: ' + e.message, 'err');
      console.error('moveToBreakeven:', e);
    }
  };

  window.togglePosExpand = function(idx) {
    const exp = document.getElementById('pos-exp-'+idx);
    if (!exp) return;
    const isOpen = exp.classList.contains('open');
    document.querySelectorAll('.pos-expand').forEach(e=>e.classList.remove('open'));
    if (!isOpen) {
      exp.classList.add('open');
      // Switch chart al simbolo della posizione
      const p = _positions[idx];
      if (p) {
        const sym = (p.symbol || '').replace(/_?(UMCBL|DMCBL)/gi,'');
        if (sym && sym !== S.symbol) {
          S.symbol = sym;
          document.getElementById('symInput').textContent = sym;
          clearAll();
          loadCandles(sym, S.tf);
        }
      }
    }
  };

  window.updatePctDisplay = function(idx, size, upnl) {
    const slider = document.getElementById('pct-slider-'+idx);
    const pct = parseInt(slider.value);
    const pnlSlice = upnl*(pct/100);
    document.getElementById('pct-val-'+idx).textContent = pct+'%';
    document.getElementById('pct-usd-'+idx).textContent =
      (pnlSlice>=0?'+':'')+'$'+fmt(pnlSlice)+' P&L · '+fmt(size*(pct/100))+' cont';
    document.querySelectorAll(`#pos-exp-${idx} .pct-preset`).forEach(el=>{
      el.classList.toggle('active', parseInt(el.textContent)===pct);
    });
  };

  window.setPct = function(idx, pct, size, upnl) {
    const slider = document.getElementById('pct-slider-'+idx);
    if (!slider) return;
    slider.value = pct;
    updatePctDisplay(idx, size, upnl);
  };

  // ── POSITION MODAL ──
  let _posAction = null; // {idx, type:'partial'|'full'}

  window.openPosModal = function(idx, type) {
    event.stopPropagation();
    const p = _positions[idx];
    if (!p) return;
    const sym   = (p.symbol||'').replace('_UMCBL','').replace('_DMCBL','').replace('UMCBL','').replace('DMCBL','');
    const side  = (p.holdSide||'long').toLowerCase();
    const upnl  = parseFloat(p.unrealizedPL||p.unrealizedProfitLoss||p.unrealizedPnl||0);
    const entry = parseFloat(p.openPriceAvg||p.averageOpenPrice||p.openAvgPrice||0);
    const markPx= parseFloat(p.markPrice||p.marketPrice||entry);
    const size  = parseFloat(p.total||p.available||p.totalPos||0);
    const notional = size*(markPx||entry);
    const lev   = parseFloat(p.leverage||1);
    const margin = notional/lev;

    const slider = document.getElementById('pct-slider-'+idx);
    const pct = type==='full' ? 100 : (slider ? parseInt(slider.value) : 25);
    const closeSize = size*(pct/100);
    const closeNotional = notional*(pct/100);
    const closePnl = upnl*(pct/100);

    _posAction = {idx, type, pct, sym, side, closeSize, p};

    document.getElementById('pmTitle').textContent = type==='full' ? 'Chiudi posizione' : 'Chiudi parziale';
    document.getElementById('pmSub').textContent = sym+' · '+side.toUpperCase()+' · Market';
    document.getElementById('pmRows').innerHTML = `
      <div class="pos-modal-row"><span class="pml">Chiudi</span><span class="pmv acc">${pct}% · ${fmt(closeSize)} cont</span></div>
      <div class="pos-modal-divider"></div>
      <div class="pos-modal-row"><span class="pml" style="font-size:11px;color:var(--text)">P&L stimato</span><span class="pmv" style="font-size:16px;font-family:'Syne',sans-serif;font-weight:700;color:var(--${closePnl>=0?'green':'red'})">${closePnl>=0?'+':''}$${fmt(Math.abs(closePnl))}</span></div>
      <div class="pos-modal-divider"></div>
      <div class="pos-modal-row"><span class="pml">Valore chiuso</span><span class="pmv">$${fmt(closeNotional)}</span></div>
      <div class="pos-modal-row"><span class="pml">Rimane aperto</span><span class="pmv yel">${fmt(size-closeSize)} cont (${100-pct}%)</span></div>
    `;
    const btn = document.getElementById('pmConfirmBtn');
    btn.textContent = type==='full' ? 'Chiudi tutto' : `Chiudi ${pct}%`;
    btn.className = 'pmb-confirm '+(type==='full'?'full':'partial');
    document.getElementById('posModal').classList.add('open');
  };

  window.closePosModal = function() {
    document.getElementById('posModal').classList.remove('open');
    _posAction = null;
  };

  window.executePosAction = async function() {
    if (!_posAction) return;
    const {idx, type, pct, sym, side, p} = _posAction;
    const btn = document.getElementById('pmConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Invio...';

    try {
      const closeSide = side==='long' ? 'buy' : 'sell'; // hedge mode: close long=buy, close short=sell

      const totalSize = parseFloat(p.total||p.totalPos||p.available||0);
      if (!totalSize || totalSize <= 0) throw new Error('Nessuna posizione aperta');

      let endpoint, body;

      if (type === 'full') {
        endpoint = '/api/v2/mix/order/close-positions';
        body = JSON.stringify({
          symbol: p.symbol,
          productType: 'USDT-FUTURES',
          holdSide: side,
        });
      } else {
        const raw = totalSize * (pct / 100);
        // Arrotonda al numero di decimali della size originale (max 4)
        const srcDecimals = (String(totalSize).split('.')[1]||'').length;
        const decimals = Math.min(srcDecimals, 4);
        const factor = Math.pow(10, decimals);
        const qty = decimals > 0
          ? Math.floor(raw * factor) / factor
          : Math.floor(raw);
        // Se qty è 0 (size troppo piccola) usa close-positions
        if (qty <= 0) {
          endpoint = '/api/v2/mix/order/close-positions';
          body = JSON.stringify({
            symbol: p.symbol,
            productType: 'USDT-FUTURES',
            holdSide: side,
          });
        } else {
          endpoint = '/api/v2/mix/order/place-order';
          body = JSON.stringify({
            symbol: p.symbol,
            productType: 'USDT-FUTURES',
            marginMode: p.marginMode||'crossed',
            marginCoin: 'USDT',
            size: String(qty),
            side: closeSide,
            tradeSide: 'close',
            orderType: 'market',
          });
        }
      }

      await bitgetRequest(endpoint, {}, {method:'POST', body});
      closePosModal();
      notify(type==='full'?`Chiusa ${sym}`:`Parziale ${sym} -${pct}%`, 'ok');
      setTimeout(()=>fetchBitgetDashboard(), 1500);
    } catch(e) {
      notify('Errore: '+e.message, 'err');
      btn.disabled = false;
      btn.textContent = type==='full' ? 'Chiudi tutto' : `Chiudi ${pct}%`;
    }
  }

  // ── AUTH STATE ──
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      try {
        const snap = await getDoc(doc(db,'profiles',user.uid));
        const username = snap.exists() ? snap.data().username : user.email;
        await syncKeysFromFirestore(user.uid);
        rfShowApp(username);
        // Auto-fetch Bitget se keys presenti
        const {apiKey} = loadBitgetKeys();
        if (apiKey) setTimeout(()=>fetchBitgetDashboard(), 1500);
      } catch { rfShowApp(user.email); }
    } else {
      currentUser = null;
      document.getElementById('auth-overlay').classList.remove('hidden');
      document.getElementById('userBadge').classList.remove('visible');
    }
  });

  let _appInitDone = false;
  function rfShowApp(username) {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('userBadge').classList.add('visible');
    document.getElementById('rfUsername').textContent = username;
    if(!_appInitDone){ _appInitDone=true; loadBitgetPairs().then(()=>loadCandles(S.symbol, S.tf)); }
  }

  // ── TAB SWITCH ──
  window.rfSwitchTab = function(tab) {
    ['login','register','forgot'].forEach((t,i)=>{
      document.getElementById('rf-form-'+t).classList.toggle('hidden',t!==tab);
      document.querySelectorAll('.auth-tab')[i].classList.toggle('active',t===tab);
    });
  };

  // ── LOGIN ──
  window.rfDoLogin = async function() {
    const user = document.getElementById('rf-login-user').value.trim();
    const pass = document.getElementById('rf-login-pass').value;
    const errEl = document.getElementById('rf-login-err');
    const btn   = document.getElementById('rf-login-btn');
    if (!user||!pass) { errEl.textContent='Compila tutti i campi.'; return; }
    btn.disabled=true; errEl.textContent='';
    try {
      const q = query(collection(db,'usernames'), where('username','==',user.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) { errEl.textContent='Username non trovato.'; btn.disabled=false; return; }
      await signInWithEmailAndPassword(auth, snap.docs[0].data().email, pass);
    } catch(e) {
      errEl.textContent = e.code==='auth/wrong-password' ? 'Password errata.' : 'Credenziali non valide.';
      btn.disabled=false;
    }
  };

  // ── REGISTER ──
  window.rfDoRegister = async function() {
    const user  = document.getElementById('rf-reg-user').value.trim().toLowerCase();
    const email = document.getElementById('rf-reg-email').value.trim();
    const pass  = document.getElementById('rf-reg-pass').value;
    const gdpr  = document.getElementById('rf-reg-gdpr').checked;
    const errEl = document.getElementById('rf-reg-err');
    const btn   = document.getElementById('rf-reg-btn');
    if (!gdpr)  { errEl.textContent='Accetta la Privacy Policy.'; return; }
    if (!user||!email||!pass) { errEl.textContent='Compila tutti i campi.'; return; }
    if (user.length<3) { errEl.textContent='Username minimo 3 caratteri.'; return; }
    if (pass.length<6) { errEl.textContent='Password minimo 6 caratteri.'; return; }
    btn.disabled=true; errEl.textContent='';
    try {
      const unameDoc = await getDoc(doc(db,'usernames',user));
      if (unameDoc.exists()) { errEl.textContent='Username già in uso.'; btn.disabled=false; return; }
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db,'usernames',user), {username:user,email,uid:cred.user.uid});
      await setDoc(doc(db,'profiles',cred.user.uid), {username:user,createdAt:Date.now()});
    } catch(e) {
      let msg='Errore durante la registrazione.';
      if (e.code==='auth/email-already-in-use') msg='Email già registrata.';
      if (e.code==='auth/invalid-email') msg='Email non valida.';
      errEl.textContent=msg; btn.disabled=false;
    }
  };

  // ── FORGOT ──
  window.rfDoForgot = async function() {
    const email = document.getElementById('rf-forgot-email').value.trim();
    const errEl = document.getElementById('rf-forgot-err');
    const okEl  = document.getElementById('rf-forgot-ok');
    const btn   = document.getElementById('rf-forgot-btn');
    if (!email) { errEl.textContent='Inserisci la tua email.'; return; }
    btn.disabled=true;
    try {
      await sendPasswordResetEmail(auth, email);
      okEl.textContent='Email inviata!'; errEl.textContent='';
    } catch { errEl.textContent='Email non trovata.'; okEl.textContent=''; }
    btn.disabled=false;
  };

  // ── LOGOUT ──
  window.rfDoLogout = async function() {
    await signOut(auth);
    localStorage.removeItem('bitget_api_key');
    localStorage.removeItem('bitget_api_secret');
    localStorage.removeItem('bitget_api_passphrase');
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('userBadge').classList.remove('visible');
  };

  // ── API KEYS UI ──
  window.rfLoadApiKeysUI = async function() {
    if (!currentUser) return;
    const statusEl = document.getElementById('apiStatus');
    try {
      const snap = await getDoc(doc(db,'apiKeys',currentUser.uid));
      if (snap.exists() && snap.data().encKey) {
        const d = snap.data();
        const [k,s,p] = await Promise.all([decryptStr(currentUser.uid,d.encKey),decryptStr(currentUser.uid,d.encSecret||''),decryptStr(currentUser.uid,d.encPass||'')]);
        document.getElementById('apiKeyInput').value=k;
        document.getElementById('apiSecretInput').value=s?'••••••••••••••••':'';
        document.getElementById('apiPassInput').value=p?'••••••••':'';
        if (statusEl) { statusEl.textContent='✓ API keys salvate'; statusEl.className='api-status ok'; }
      } else {
        if (statusEl) { statusEl.textContent='Nessuna API key salvata'; statusEl.className='api-status err'; }
      }
    } catch { if(statusEl){statusEl.textContent='Errore caricamento';statusEl.className='api-status err';} }
  };

  window.rfSaveApiKeys = async function() {
    if (!currentUser) { notify('Devi essere loggato','err'); return; }
    const k = document.getElementById('apiKeyInput').value.trim();
    const s = document.getElementById('apiSecretInput').value.trim();
    const p = document.getElementById('apiPassInput').value.trim();
    const statusEl = document.getElementById('apiStatus');
    if (!k||!s) { if(statusEl){statusEl.textContent='API Key e Secret obbligatori';statusEl.className='api-status err';} return; }
    // Se contengono •, mantieni i valori esistenti
    const finalK = k.includes('•') ? localStorage.getItem('bitget_api_key')||k : k;
    const finalS = s.includes('•') ? localStorage.getItem('bitget_api_secret')||s : s;
    const finalP = p.includes('•') ? localStorage.getItem('bitget_api_passphrase')||p : p;
    if (statusEl) { statusEl.textContent='Salvataggio...'; statusEl.className='api-status'; }
    try {
      await saveKeysToFirestore(currentUser.uid, finalK, finalS, finalP);
      localStorage.setItem('bitget_api_key', finalK);
      localStorage.setItem('bitget_api_secret', finalS);
      if (finalP) localStorage.setItem('bitget_api_passphrase', finalP);
      document.getElementById('apiModal').classList.remove('open');
      notify('API keys salvate ✓','ok');
      // Test connessione
      setTimeout(()=>fetchBitgetDashboard(), 500);
    } catch(e) { if(statusEl){statusEl.textContent='✗ '+e.message;statusEl.className='api-status err';} }
  };

  window.rfDeleteApiKeys = async function() {
    if (!currentUser) return;
    if (!confirm('Eliminare le API keys?')) return;
    await deleteKeysFromFirestore(currentUser.uid);
    localStorage.removeItem('bitget_api_key');
    localStorage.removeItem('bitget_api_secret');
    localStorage.removeItem('bitget_api_passphrase');
    document.getElementById('apiKeyInput').value='';
    document.getElementById('apiSecretInput').value='';
    document.getElementById('apiPassInput').value='';
    document.getElementById('apiModal').classList.remove('open');
    document.getElementById('accBalance').textContent='—';
    S.balance=4250;
    notify('API keys eliminate','ok');
  };

  // ── SYNC MANUALE ──
  window.rfBitgetSync = function() { fetchBitgetDashboard(); };

  // Esponi per il refresh button del panel
  window.refreshAccount = function() { 
    const {apiKey} = loadBitgetKeys();
    if (apiKey) fetchBitgetDashboard();
    else notify('API Bitget non configurate','err');
  };

})();
