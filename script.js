// ---------------------------------
// Nav toggle + close on anchor tap
// ---------------------------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open');
  });
}
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', () => {
    if (nav && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded','false');
    }
  });
});

// ---------------- Tabs ----------------
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
    panels.forEach(p => p.classList.remove('is-active'));
    tab.setAttribute('aria-selected', 'true');
    const id = tab.getAttribute('aria-controls');
    document.getElementById(id)?.classList.add('is-active');

    if (id === 'kids') setTimeout(() => KidsGame.resize(), 50);
    if (id === 'teens') setTimeout(() => { IntermediateGame.init(); startTimer('teens', 60); }, 50);
    if (id === 'adults') setTimeout(() => { AdvancedGame.init(); startTimer('adults', 60); }, 50);
  });
});

// ==================== WORKING COUNTERS (localStorage) ====================
let visitCount = parseInt(localStorage.getItem('eve_visits') || '0');
let downloadCount = parseInt(localStorage.getItem('eve_downloads') || '0');

// Count visit once per session
if (!sessionStorage.getItem('eve_visited')) {
  sessionStorage.setItem('eve_visited', '1');
  visitCount++;
  localStorage.setItem('eve_visits', visitCount);
}

// Display counts
const visitsEl = document.getElementById('visits-count');
const downloadsEl = document.getElementById('dl-total-count');
if (visitsEl) visitsEl.textContent = visitCount;
if (downloadsEl) downloadsEl.textContent = downloadCount;

// Track downloads
function trackDownload() {
  downloadCount++;
  localStorage.setItem('eve_downloads', downloadCount);
  if (downloadsEl) downloadsEl.textContent = downloadCount;
}

// ---------------- Achievements (badges) ----------------
function achvToast(msg){
  const el = document.getElementById('achv-toast');
  if(!el) { alert(msg); return; }
  el.textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

(function(){
  const STORAGE_KEY = 'eveDetective.achievements.v1';
  const BADGE_FILES = {
    kids:     ['assets/Beginner-sticker.jpeg','assets/Beginner sticker.jpeg'],
    teens:    ['assets/Intermediate-sticker.jpeg','assets/Intermediate sticker.jpeg'],
    adults:   ['assets/Advanced-sticker.jpeg','assets/Advanced sticker.jpeg'],
    champion: ['assets/Champion-sticker.jpeg','assets/Champion sticker.jpeg']
  };

  const Achievements = {
    state: { kids:false, teens:false, adults:false },
    load(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const p = JSON.parse(raw);
          this.state = { kids:!!p.kids, teens:!!p.teens, adults:!!p.adults };
        }
      } catch(_){}
    },
    save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); },
    isUnlocked(level){
      return level==='champion' ? (this.state.kids&&this.state.teens&&this.state.adults) : !!this.state[level];
    },
    markComplete(level){
      if(!['kids','teens','adults'].includes(level)) return;
      if(!this.state[level]){
        this.state[level] = true; this.save(); this.render();
        achvToast(`Unlocked: ${level.charAt(0).toUpperCase()+level.slice(1)} badge!`);
        this.render();
      }
    },
    async _fetchFirstOk(urls){
      for (const u of urls){
        try{ const r=await fetch(u,{cache:'no-store'}); if(r.ok) return await r.blob(); }catch(_){}
      }
      throw new Error('not-found');
    },
    async download(level){
      if(!['kids','teens','adults','champion'].includes(level)) return;
      if(!this.isUnlocked(level)){
        achvToast(`Play the ${level} challenge to unlock this sticker.`);
        return;
      }
      const candidates = BADGE_FILES[level] || [];
      try{
        const blob = await this._fetchFirstOk(candidates);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nice = level==='kids'?'Kids':level==='teens'?'Teens':level==='adults'?'Adults':'Champion';
        a.href = url; a.download = `EVE-Detective-${nice}-Sticker.jpeg`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        trackDownload();
      }catch(_){
        const a = document.createElement('a');
        a.href = candidates[0] || '#'; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        trackDownload();
      }
    },
    render(){
      ['kids','teens','adults','champion'].forEach(level => {
        const card = document.querySelector(`.badge[data-badge="${level}"]`);
        if(!card) return;
        const btn = card.querySelector('button');
        const unlocked = this.isUnlocked(level);
        if(level==='champion'){
          card.classList.toggle('unlocked', unlocked);
          card.style.opacity = unlocked ? 1 : 0.7;
          if (btn) { btn.disabled = !unlocked; btn.setAttribute('aria-disabled', btn.disabled ? 'true':'false'); }
        }else{
          card.classList.toggle('locked', !unlocked);
          card.classList.toggle('unlocked', unlocked);
          card.style.opacity = unlocked ? 1 : 0.95;
          if (btn) { btn.disabled = !unlocked; btn.setAttribute('aria-disabled', btn.disabled ? 'true':'false'); }
        }
      });
      const done = ['kids','teens','adults'].filter(k => this.state[k]).length;
      const pct = Math.round((done/3)*100);
      const bar = document.getElementById('progress-bar');
      if (bar) bar.style.width = pct + '%';
    }
  };

  window.Achievements = Achievements;
  window.downloadBadge = (level) => Achievements.download(level);
  window.shareProgress = async function(){
    const s = Achievements.state;
    const earned = ['kids','teens','adults'].filter(k => s[k]).length;
    const text = earned===3 ? 'I earned all EVE Detective badges and unlocked Champion!' : `I earned ${earned}/3 EVE Detective badges!`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title:'EVE Detective', text, url }); } catch(_){}
    } else {
      try { await navigator.clipboard?.writeText(`${text} ${url}`); achvToast('Progress copied to clipboard!'); } catch(_){ alert(text + ' ' + url); }
    }
  };

  document.addEventListener('DOMContentLoaded', () => { Achievements.load(); Achievements.render(); });
})();

// ==================== WORKING TIMER ====================
let timerIntervals = {};

function startTimer(panelId, seconds) {
  console.log(`startTimer(${panelId}, ${seconds})`);
  
  if (timerIntervals[panelId]) {
    clearInterval(timerIntervals[panelId]);
  }
  
  const panel = document.getElementById(panelId);
  if (!panel) return;
  
  let fill = panel.querySelector('.timer-fill');
  let tleft = panel.querySelector('.tleft');
  
  if (!fill || !tleft) {
    let wrap = panel.querySelector('.timer-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'timer-wrap';
      wrap.innerHTML = `
        <div class="timer-bar"><div class="timer-fill" style="width:100%; background: linear-gradient(90deg, #0e8a68, #22c55e);"></div></div>
        <strong class="tleft">${seconds}s</strong>
        <button class="btn small" onclick="startTimer('${panelId}', ${seconds})">Start 60s</button>
        <button class="btn small" onclick="resetTimer('${panelId}', ${seconds})">Reset</button>
      `;
      panel.insertBefore(wrap, panel.firstChild.nextSibling);
      fill = wrap.querySelector('.timer-fill');
      tleft = wrap.querySelector('.tleft');
    }
  }
  
  if (!fill || !tleft) return;
  
  let timeLeft = seconds;
  fill.style.width = '100%';
  fill.style.background = 'linear-gradient(90deg, #0e8a68, #22c55e)';
  tleft.textContent = timeLeft + 's';
  
  timerIntervals[panelId] = setInterval(function() {
    timeLeft--;
    const percent = (timeLeft / seconds) * 100;
    fill.style.width = Math.max(0, percent) + '%';
    tleft.textContent = timeLeft + 's';
    
    if (timeLeft <= 0) {
      clearInterval(timerIntervals[panelId]);
      delete timerIntervals[panelId];
      fill.style.background = '#ef4444';
      fill.style.width = '0%';
    }
  }, 1000);
}

function resetTimer(panelId, seconds) {
  if (timerIntervals[panelId]) {
    clearInterval(timerIntervals[panelId]);
    delete timerIntervals[panelId];
  }
  const panel = document.getElementById(panelId);
  if (panel) {
    const fill = panel.querySelector('.timer-fill');
    const tleft = panel.querySelector('.tleft');
    if (fill) {
      fill.style.width = '100%';
      fill.style.background = 'linear-gradient(90deg, #0e8a68, #22c55e)';
    }
    if (tleft) tleft.textContent = seconds + 's';
  }
}

// Make timers globally accessible
window.startTimer = startTimer;
window.resetTimer = resetTimer;

// ---------- Confetti (10 seconds) + Claps (3 seconds) + Sound ----------
function confettiBurst(){
  let c = document.getElementById('confetti-canvas');
  if (!c){ c = document.createElement('canvas'); c.id='confetti-canvas'; document.body.appendChild(c); }
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = c.width = innerWidth*dpr, H = c.height = innerHeight*dpr;
  c.style.width = innerWidth+'px'; c.style.height = innerHeight+'px';
  const N = 300, parts=[];
  for(let i=0;i<N;i++){
    parts.push({ x: Math.random()*W, y: -Math.random()*H*0.2, vy: 2+Math.random()*5, vx: (Math.random()-0.5)*3,
      w: 8*dpr, h: 12*dpr, r: Math.random()*Math.PI,
      col: ['#60a5fa','#34d399','#f472b6','#facc15','#a78bfa','#ef4444','#16a34a'][Math.floor(Math.random()*7)] });
  }
  let frames = 0;
  function step(){
    ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.r+=0.1;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    });
    frames++;
    if (frames < 300) requestAnimationFrame(step);
    else c.remove();
  }
  step();
}

function claps(){
  let e = document.querySelector('.claps');
  if(!e){
    e = document.createElement('div');
    e.className = 'claps';
    e.innerHTML = '👏👏👏👏👏';
    e.style.position = 'fixed';
    e.style.left = '50%';
    e.style.top = '50%';
    e.style.transform = 'translate(-50%, -50%)';
    e.style.fontSize = '4rem';
    e.style.transition = 'opacity 0.8s ease';
    e.style.zIndex = '9999';
    e.style.background = 'rgba(0,0,0,0.8)';
    e.style.padding = '30px 50px';
    e.style.borderRadius = '80px';
    e.style.color = 'white';
    e.style.textAlign = 'center';
    e.style.whiteSpace = 'nowrap';
    document.body.appendChild(e);
  }
  e.style.opacity = '1';
  setTimeout(() => { e.style.opacity = '0'; }, 3000);
}

function playChime(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const now = ctx.currentTime;
    [0,0.12,0.24].forEach((dt,i)=>{
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value = 880 + i*120;
      g.gain.setValueAtTime(0.0001, now+dt);
      g.gain.exponentialRampToValueAtTime(0.2, now+dt+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now+dt+0.25);
      o.connect(g).connect(ctx.destination);
      o.start(now+dt); o.stop(now+dt+0.26);
    });
  }catch(e){ console.log('Audio not supported'); }
}

function toast(msg, parent){
  const w = parent || document.body;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 1800);
}

// ==================== KIDS GAME ====================
const KidsGame = (() => {
  const speciesConfigs = {
    melanogaster: { region: 'piRNA cluster 3R‑TAS',
      eves:[{x:.15,y:.35,type:'intact'},{x:.30,y:.55,type:'useful'},{x:.55,y:.25,type:'broken'},{x:.72,y:.60,type:'unique'},{x:.85,y:.40,type:'intact'}]},
    simulans: { region: 'Heterochromatin region 2L‑proximal',
      eves:[{x:.12,y:.50,type:'broken'},{x:.28,y:.30,type:'useful'},{x:.43,y:.62,type:'intact'},{x:.67,y:.40,type:'intact'},{x:.82,y:.55,type:'unique'}]},
    yakuba: { region: 'Centromere‑adjacent 3L',
      eves:[{x:.18,y:.40,type:'useful'},{x:.36,y:.58,type:'intact'},{x:.50,y:.28,type:'broken'},{x:.70,y:.45,type:'intact'}]},
    virilis: { region: 'Subtelomeric 2R',
      eves:[{x:.22,y:.42,type:'broken'},{x:.41,y:.24,type:'intact'},{x:.58,y:.55,type:'useful'},{x:.80,y:.36,type:'unique'}]},
    pseudoananassae: { region: 'piRNA cluster 4R‑distal',
      eves:[{x:.10,y:.32,type:'intact'},{x:.27,y:.57,type:'intact'},{x:.49,y:.38,type:'useful'},{x:.66,y:.22,type:'broken'},{x:.84,y:.58,type:'unique'}]}
  };
  const SPECIES = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];

  let overlay, bg, ctxO, ctxB, ring, wrap;
  let w=0,h=0; let current='melanogaster';
  let found=new Set();
  let completed = new Set();
  let revealAll=false;

  function init(){
    wrap = document.getElementById('kids-game');
    if (!wrap) return;
    overlay = document.getElementById('eve-overlay');
    bg = document.getElementById('bg-canvas');
    ring = document.getElementById('lens-ring');
    ctxO = overlay.getContext('2d'); ctxB = bg.getContext('2d');
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', () => { setMask(-200,-200); ring.style.opacity=0; });
    wrap.addEventListener('mouseenter', () => { ring.style.opacity=.9; });
    wrap.addEventListener('click', onClick);
    window.addEventListener('resize', resize);
    updateSpeciesProgress();
    loadSpecies(current);
  }
  function resize(){ if (!wrap) return;
    const bb=wrap.getBoundingClientRect(); w=Math.floor(bb.width); h=Math.floor(bb.height);
    [overlay,bg].forEach(c=>{c.width=w;c.height=h}); drawBg(); drawOverlay();
  }
  function setMask(x,y){ overlay.style.setProperty('--lx',x+'px'); overlay.style.setProperty('--ly',y+'px'); ring.style.left=x+'px'; ring.style.top=y+'px'; }
  function onMove(e){ const r=wrap.getBoundingClientRect(); setMask(e.clientX-r.left, e.clientY-r.top); }
  function onClick(e){
    const r=wrap.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
    const cfg=speciesConfigs[current]; if (!cfg) return;
    const hit=cfg.eves.findIndex((ev,i)=>Math.hypot(ev.x*w-x, ev.y*h-y)<=16);
    if (hit>=0){
      const key=`${current}:${hit}`;
      if (!found.has(key)){
        found.add(key);
        toast(foundMessage(cfg.eves[hit].type), wrap);
        drawOverlay(); updateCounts();
        if (foundCountForCurrent()>=cfg.eves.length){
          if (!completed.has(current)){
            completed.add(current);
            updateSpeciesProgress();
            if (completed.size === SPECIES.length && !KidsGame._won){
              KidsGame._won = true;
              window.Achievements?.markComplete('kids');
              toast('Great work! All 5 species complete — Kids badge unlocked!', wrap);
              confettiBurst(); claps(); playChime();
            } else {
              toast(`Nice! ${completed.size}/${SPECIES.length} species complete — click "Next species"`, wrap);
              document.getElementById('kids-next')?.classList.add('pulse-once');
              setTimeout(()=>document.getElementById('kids-next')?.classList.remove('pulse-once'), 1500);
            }
          }
        }
      }
    } else {
      toast('No EVE here—keep scanning!', wrap);
    }
  }
  function foundMessage(type){ return type==='intact'?'Intact EVE: viral DNA is complete'
    : type==='useful'?'Useful EVE: helps the fly resist viruses'
    : type==='broken'?'Broken EVE: grey/black, cannot do anything'
    : type==='unique'?'Unique EVE: special/rare insertion' : 'EVE found!'; }
  function drawBg(){
    ctxB.clearRect(0,0,w,h);
    ctxB.fillStyle='rgba(10,26,47,0.06)';
    ctxB.font='700 12px Inter, system-ui';
    const letters=['A','C','G','T'];
    for(let Y=24;Y<h;Y+=28){
      let row=''; for(let i=0;i<Math.ceil(w/14);i++){ row+=letters[(i+Math.floor(Y))%4]; }
      ctxB.fillText(row,12,Y);
    }
  }
  function drawOverlay(){
    const cfg=speciesConfigs[current]; ctxO.clearRect(0,0,w,h); if(!cfg)return;
    cfg.eves.forEach((ev,i)=>{ const ex=ev.x*w, ey=ev.y*h, key=`${current}:${i}`, isFound=found.has(key);
      ctxO.beginPath(); ctxO.arc(ex,ey,12,0,Math.PI*2); ctxO.closePath();
      ctxO.fillStyle={intact:'#22c55e',useful:'#ef4444',broken:'#6b7280',unique:'#d4a017'}[ev.type]||'#0ea5e9';
      ctxO.globalAlpha=isFound?1:0.9; ctxO.fill(); ctxO.lineWidth=2; ctxO.strokeStyle='rgba(0,0,0,0.15)'; ctxO.stroke();
      if(isFound){
        ctxO.strokeStyle='rgba(10,26,47,0.8)'; ctxO.lineWidth=2;
        ctxO.beginPath(); ctxO.moveTo(ex-6,ey); ctxO.lineTo(ex-1,ey+5); ctxO.lineTo(ex+7,ey-6); ctxO.stroke();
      }
    });
    const overlayEl=document.getElementById('eve-overlay');
    if (revealAll){ overlayEl.style.maskImage='none'; overlayEl.style.webkitMaskImage='none'; }
    else { overlayEl.style.maskImage=''; overlayEl.style.webkitMaskImage=''; }
  }
  function updateCounts(){
    const cfg=speciesConfigs[current], f=document.getElementById('kids-found'), t=document.getElementById('kids-total');
    if (f) f.textContent=`Found: ${foundCountForCurrent()}`;
    if (t) t.textContent=`of ${cfg.eves.length} EVEs`;
  }
  function updateSpeciesProgress(){
    const sp = document.getElementById('kids-species-progress');
    if (sp) sp.textContent = `Species complete: ${completed.size}/${SPECIES.length}`;
  }
  function foundCountForCurrent(){ let c=0; const cfg=speciesConfigs[current]; cfg.eves.forEach((_,i)=>{ if(found.has(`${current}:${i}`)) c++; }); return c; }
  function giveHint(){}
  function reset(){ Array.from(found).forEach(k=>{ if(k.startsWith(current+':')) found.delete(k); }); drawOverlay(); updateCounts(); }
  function loadSpecies(name){
    if (!speciesConfigs[name]) return;
    current = name;
    const sel = document.getElementById('species-select'); if (sel && sel.value !== name) sel.value = name;
    const reg=document.getElementById('kids-region'); if(reg) reg.textContent = speciesConfigs[current].region || '';
    resize(); updateCounts();
  }
  function next(){
    const i = SPECIES.indexOf(current);
    const nextIdx = (i >= 0) ? (i+1) % SPECIES.length : 0;
    loadSpecies(SPECIES[nextIdx]);
  }
  function toggleReveal(on){ revealAll=!!on; drawOverlay(); }
  return { init, resize, giveHint, reset, loadSpecies, toggleReveal, next };
})();
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('kids-game')) KidsGame.init(); });

// ==================== TEENS GAME ====================
const IntermediateGame = (() => {
  const S = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL_FULL = { melanogaster:'D. melanogaster', simulans:'D. simulans', yakuba:'D. yakuba', virilis:'D. virilis', pseudoananassae:'D. pseudoananassae' };
  const LABEL_SHORT= { melanogaster:'D. mel.', simulans:'D. sim.', yakuba:'D. yak.', virilis:'D. vir.', pseudoananassae:'D. pse.' };
  let useShort = true, compareMode = false;

  const EVE_DB = {
    E1:{ state:'broken',  present:new Set(S) },
    E2:{ state:'broken',  present:new Set(['melanogaster','simulans','yakuba']) },
    E3:{ state:'intact',  present:new Set(['melanogaster','simulans']) },
    E4:{ state:'useful',  present:new Set(['melanogaster']) },
    E5:{ state:'intact',  present:new Set(['simulans']) },
    E6:{ state:'intact',  present:new Set(['virilis','pseudoananassae']) },
    E7:{ state:'useful',  present:new Set(['pseudoananassae']) },
    E8:{ state:'unique',  present:new Set(['yakuba']) }
  };
  const EVE_ORDER = ['E1','E2','E3','E4','E5','E6','E7','E8'];

  const GOLD = {
    pairA: new Set(['melanogaster','simulans']),
    pairB: new Set(['virilis','pseudoananassae']),
    out:   'yakuba'
  };

  let selectedForCompare = [];
  let wiredDrops = false;

  function init(){
    const sl = document.getElementById('short-labels');
    if (sl) { useShort = sl.checked; sl.onchange = (e)=>setShort(e.target.checked); }
    renderMatrix(); renderInspect(); renderDeck();
    if (!wiredDrops) { wireDrops(); wiredDrops = true; }
    drawTree();
  }

  function renderMatrix(){
    const el = document.getElementById('matrix'); if (!el) return;
    const shared = pairwiseSharedCounts();
    const maxShared = Math.max(1, ...Object.values(shared));
    let html = '<table><thead><tr><th></th>';
    S.forEach(sp => html += `<th>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</th>`);
    html += '</tr></thead><tbody>';
    S.forEach(rsp => {
      html += `<tr><th>${(useShort?LABEL_SHORT:LABEL_FULL)[rsp]}</th>`;
      S.forEach(csp => {
        const val = rsp===csp ? countFor(rsp) : (shared[keyPair(rsp,csp)]||0);
        html += `<td class="heat ${heatClass(val, rsp===csp, maxShared)}" title="${val}">${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }
  function toggleMatrix(){
    const el = document.getElementById('matrix'); if (!el) return;
    const hidden = el.hasAttribute('hidden');
    if (hidden) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
  }
  function showHints(){
    alert([
      'How to play:',
      '1) Click species cards to flip EVEs; in Compare mode, pick two and shared EVEs glow.',
      '2) Drag the two closest into Pair A; next closest into Pair B; place the outgroup.',
      '3) Build & Check. Use the matrix if you need a hint.'
    ].join('\n'));
  }
  function setShort(on){ useShort = !!on; renderMatrix(); renderInspect(); renderDeck(); drawTree(); }
  function toggleCompare(){ compareMode = !compareMode; selectedForCompare.length = 0; updateCompareGlow(); }

  function renderInspect(){
    const grid = document.getElementById('inspect-grid'); if (!grid) return;
    grid.innerHTML = S.map(sp => {
      const label = (useShort?LABEL_SHORT:LABEL_FULL)[sp];
      const strips = EVE_ORDER.map(e => {
        const present = EVE_DB[e].present.has(sp);
        const cls = 'strip' + (present ? ` has ${EVE_DB[e].state}` : '');
        return `<div class="${cls}" data-e="${e}"></div>`;
      }).join('');
      return `
        <div class="inspect-card" data-sp="${sp}" onclick="IntermediateGame.flipCard('${sp}')">
          <h5>${label}</h5>
          <div class="barcode" data-sp="${sp}">${strips}</div>
          <div class="card-note muted">Tap to reveal</div>
        </div>
      `;
    }).join('');
  }
  function flipCard(sp){
    const card = document.querySelector(`.inspect-card[data-sp="${sp}"]`); if (!card) return;
    card.classList.toggle('revealed');
    if (compareMode){
      if (card.classList.contains('selected')){
        card.classList.remove('selected');
        selectedForCompare = selectedForCompare.filter(x=>x!==sp);
      } else if (selectedForCompare.length < 2){
        card.classList.add('selected'); selectedForCompare.push(sp);
      }
      if (selectedForCompare.length > 2){
        const first = selectedForCompare.shift();
        document.querySelector(`.inspect-card[data-sp="${first}"]`)?.classList.remove('selected');
      }
      updateCompareGlow();
    }
  }
  function updateCompareGlow(){
    document.querySelectorAll('.strip').forEach(s=>s.classList.remove('glow'));
    if (selectedForCompare.length !== 2) return;
    const [a,b] = selectedForCompare;
    EVE_ORDER.forEach(e => {
      if (EVE_DB[e].present.has(a) && EVE_DB[e].present.has(b)){
        document.querySelector(`.barcode[data-sp="${a}"] .strip[data-e="${e}"]`)?.classList.add('glow');
        document.querySelector(`.barcode[data-sp="${b}"] .strip[data-e="${e}"]`)?.classList.add('glow');
      }
    });
  }

  function renderDeck(){
    const deck = document.getElementById('species-deck'); if (!deck) return;
    deck.innerHTML = S.map(sp => {
      const label = (useShort?LABEL_SHORT:LABEL_FULL)[sp];
      return `<div class="badge-draggable" draggable="true" data-sp="${sp}" ondragstart="IntermediateGame.onDragStart(event)"><span class="dot"></span>${label}</div>`;
    }).join('');
  }
  function wireDrops(){
    document.querySelectorAll('.slot').forEach(slot => {
      slot.addEventListener('dragover', e => e.preventDefault());
      slot.addEventListener('drop', onDrop);
    });
    const deck = document.getElementById('species-deck');
    if (deck){
      deck.addEventListener('dragover', e => e.preventDefault());
      deck.addEventListener('drop', e => {
        e.preventDefault();
        const sp = e.dataTransfer.getData('text/sp');
        if (!sp) return;
        document.querySelectorAll(`.slot .badge-draggable[data-sp="${sp}"]`).forEach(el=>el.remove());
        if (!deck.querySelector(`.badge-draggable[data-sp="${sp}"]`)){
          deck.insertAdjacentHTML('beforeend', `<div class="badge-draggable" draggable="true" data-sp="${sp}" ondragstart="IntermediateGame.onDragStart(event)"><span class="dot"></span>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</div>`);
        }
        drawTree();
      });
    }
  }
  function onDragStart(e){ const sp = e.target.getAttribute('data-sp'); e.dataTransfer.setData('text/sp', sp); }
  function onDrop(e){
    e.preventDefault();
    const sp = e.dataTransfer.getData('text/sp');
    if (!sp) return;
    if (this.querySelector(`.badge-draggable[data-sp="${sp}"]`)) return;
    document.querySelector(`#species-deck .badge-draggable[data-sp="${sp}"]`)?.remove();
    if (this.querySelector('.badge-draggable')){
      const old = this.querySelector('.badge-draggable');
      document.getElementById('species-deck').appendChild(old);
    }
    this.insertAdjacentHTML('beforeend', `<div class="badge-draggable" draggable="true" data-sp="${sp}" ondragstart="IntermediateGame.onDragStart(event)"><span class="dot"></span>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</div>`);
    drawTree();
  }
  function clearDrops(){
    document.querySelectorAll('.slot .badge-draggable').forEach(el=>{
      const sp = el.getAttribute('data-sp'); el.remove();
      if (!document.querySelector(`#species-deck .badge-draggable[data-sp="${sp}"]`)){
        document.getElementById('species-deck').insertAdjacentHTML('beforeend', `<div class="badge-draggable" draggable="true" data-sp="${sp}" ondragstart="IntermediateGame.onDragStart(event)"><span class="dot"></span>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</div>`);
      }
    });
    drawTree();
  }

  function checkTree(){
    const A = Array.from(document.querySelectorAll('[data-slot="A1"] .badge-draggable, [data-slot="A2"] .badge-draggable')).map(x=>x.getAttribute('data-sp'));
    const B = Array.from(document.querySelectorAll('[data-slot="B1"] .badge-draggable, [data-slot="B2"] .badge-draggable')).map(x=>x.getAttribute('data-sp'));
    const O = Array.from(document.querySelectorAll('[data-slot="O"] .badge-draggable')).map(x=>x.getAttribute('data-sp'))[0];

    if (A.length!==2 || B.length!==2 || !O) { toast('Fill Pair A (2), Pair B (2), and Outgroup (1).'); return; }

    const okA = setEquals(new Set(A), GOLD.pairA);
    const okB = setEquals(new Set(B), GOLD.pairB);
    const okO = (O === GOLD.out);

    const txt = document.getElementById('your-tree');
    const steps = document.getElementById('build-steps');

    const newick = `((${A.join(',')}),(${B.join(',')}),${O})`;
    if (txt) txt.textContent = newick + ';';
    drawTree(newick);

    if (okA && okB && okO){
      toast('Excellent! Your tree matches the EVE evidence.');
      if (!IntermediateGame._won){
        IntermediateGame._won = true;
        window.Achievements?.markComplete('teens');
        confettiBurst(); claps(); playChime();
        resetTimer('teens', 60);
      }
      if (steps) steps.textContent = `Pairs: {${A.join(', ')}} and {${B.join(', ')}}, Outgroup: ${O}`;
    } else {
      alert('Not quite. Hint: (D. mel. + D. sim.) are closest; (D. vir. + D. pse.) next; D. yak. is outgroup.');
    }
  }

  function drawTree(nw){
    const box = document.getElementById('tree-svg'); if (!box) return;
    if (!nw){ box.innerHTML = ''; return; }
    const tokens = nw.replace(/\s+/g,''); let i=0;
    function parse(){
      if (tokens[i]==='('){
        i++; const kids=[];
        while(tokens[i]!==')'){ kids.push(parse()); if(tokens[i]===',') i++; }
        i++; return kids;
      } else {
        let name=''; while(i<tokens.length && !',)'.includes(tokens[i])) name+=tokens[i++]; return name;
      }
    }
    const tree = parse();
    const leaves=[]; (function cl(n){ if (typeof n==='string') leaves.push(n); else n.forEach(cl);} )(tree);
    const depth = (function d(n){ return typeof n==='string' ? 0 : 1 + Math.max(...n.map(d)); })(tree);
    const margin={l:8,r:8,t:8,b:8}, xStep=80, yStep=30;
    const width = margin.l+margin.r + depth*xStep, height = margin.t+margin.b + (leaves.length-1)*yStep;
    const pos=new Map();
    leaves.forEach((lf,i)=>pos.set(lf,{x:margin.l+depth*xStep,y:margin.t+i*yStep}));
    (function layout(n,depthLvl){
      if (typeof n==='string'){ const p=pos.get(n); p.x=margin.l+depthLvl*xStep; return p; }
      const kids=n.map(k=>layout(k,depthLvl+1)); const y=(kids[0].y+kids[kids.length-1].y)/2; const p={x:margin.l+depthLvl*xStep,y}; pos.set(n,p); return p;
    })(tree,0);
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg'); svg.setAttribute('viewBox',`0 0 ${width} ${height}`); svg.setAttribute('width',width); svg.setAttribute('height',height);
    (function edges(n){
      const p=pos.get(n);
      if (typeof n!=='string'){
        n.forEach(ch=>{
          const c=pos.get(ch);
          svg.appendChild(line(p.x,p.y,c.x,p.y,'edge'));
          svg.appendChild(line(c.x,p.y,c.x,c.y,'edge-vert'));
          edges(ch);
        });
      }
    })(tree);
    function line(x1,y1,x2,y2,cls){ const el=document.createElementNS(svgNS,'line'); el.setAttribute('x1',x1); el.setAttribute('y1',y1); el.setAttribute('x2',x2); el.setAttribute('y2',y2); el.setAttribute('class',cls); return el; }
    leaves.forEach(lf=>{ const p=pos.get(lf); const t=document.createElementNS(svgNS,'text'); t.setAttribute('x',p.x+6); t.setAttribute('y',p.y+4); const name=useShort ? LABEL_SHORT[lf] : LABEL_FULL[lf]; t.textContent=name; svg.appendChild(t); });
    box.innerHTML=''; box.appendChild(svg);
  }

  function keyPair(a,b){ return [a,b].sort().join('|'); }
  function pairwiseSharedCounts(){
    const out={};
    for (let i=0;i<S.length;i++){
      for (let j=i+1;j<S.length;j++){
        const a=S[i], b=S[j]; let c=0;
        EVE_ORDER.forEach(e=>{ const p=EVE_DB[e].present; if (p.has(a)&&p.has(b)) c++; });
        out[keyPair(a,b)] = c;
      }
    }
    return out;
  }
  function countFor(sp){ let c=0; EVE_ORDER.forEach(e=>{ if (EVE_DB[e].present.has(sp)) c++; }); return c; }
  function heatClass(val, diag, max){ if (diag) return 'med'; const r = val/max; return r>=0.95?'max': r>=0.65?'high': r>=0.35?'med':'low'; }
  function setEquals(a,b){ if (a.size!==b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }

  return {
    init, toggleMatrix, showHints, setShort, toggleCompare, flipCard,
    onDragStart, checkTree, clearDrops
  };
})();
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('inspect-grid')) IntermediateGame.init(); });

// ==================== ADULTS GAME ====================
const AdvancedGame = (() => {
  const SPECIES = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL = { melanogaster:'D. melanogaster', simulans:'D. simulans', yakuba:'D. yakuba', virilis:'D. virilis', pseudoananassae:'D. pseudoananassae' };

  const CATALOG = {
    melanogaster: [
      { id:'EVE-A', type:'retro', state:'useful', family:'RV1', note:'piRNAs active' },
      { id:'EVE-D', type:'retro', state:'silent', family:'RV1', note:'may re-activate' },
      { id:'EVE-C', type:'retro', state:'broken', family:'RV0', note:'degraded' },
      { id:'EVE-X', type:'dna',   state:'useful', family:'DV2', note:'DNA virus' }
    ],
    simulans: [
      { id:"EVE-A'", type:'retro', state:'intact', family:'RV1', note:'intact copy' },
      { id:'EVE-Z',  type:'dna',   state:'useful', family:'DV1', note:'DNA virus' }
    ],
    yakuba: [{ id:'EVE-Y1', type:'retro', state:'broken', family:'RV1', note:'fragment' }],
    virilis:[{ id:'EVE-D1', type:'dna',   state:'useful', family:'DV1', note:'DNA virus' }],
    pseudoananassae:[{ id:'EVE-P', type:'retro', state:'useful', family:'RV1a', note:'close to RV1' }]
  };

  const STEP1_CORRECT = 'EVE-A';
  const STEP2_RESIST = 'pseudoananassae';
  const STEP2_VULN = 'yakuba';

  let passed = { s1:false, s2:false, s3:false };
  let adultsWon = false;

  function init(){
    renderStep1(); renderStep2(); renderStep3(); clearFeedback();
  }
  
  function clearFeedback(){
    const o1 = document.getElementById('adv-feedback-1'); if (o1) o1.textContent='';
    const o2 = document.getElementById('adv-feedback-2'); if (o2) o2.textContent='';
    const o3 = document.getElementById('adv-feedback-3'); if (o3) o3.textContent='';
  }
  
  function renderStep1(){
    const box = document.getElementById('adv-eves-mel'); if (!box) return;
    const list = CATALOG.melanogaster;
    box.innerHTML = list.map(e => {
      let stateColour = '';
      if (e.state === 'useful') stateColour = '#ef4444';
      else if (e.state === 'intact') stateColour = '#16a34a';
      else if (e.state === 'silent') stateColour = '#f59e0b';
      else if (e.state === 'broken') stateColour = '#111827';
      
      const typeColour = e.type === 'retro' ? '#0ea5e9' : '#a16207';
      const icon = e.type === 'retro' ? '🦠' : '🧬';
      
      return `
        <label class="eve-card" style="display: flex; align-items: center; gap: 12px; padding: 12px; margin: 8px 0; background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; cursor: pointer;">
          <input type="radio" name="step1-choice" value="${e.id}" style="transform: scale(1.2); margin-right: 4px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${typeColour}, ${typeColour}cc); display: flex; align-items: center; justify-content: center; font-size: 24px;">${icon}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 1rem;">${e.id}</strong>
              <span style="background: ${typeColour}20; color: ${typeColour}; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">${e.type}</span>
              <span style="display: inline-flex; align-items: center; gap: 5px; background: ${stateColour}20; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">
                <span style="color: ${stateColour}; font-size: 1rem;">●</span> ${e.state}
              </span>
              <span style="background: #64748b20; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem;">family ${e.family}</span>
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">${e.note}</div>
          </div>
        </label>
      `;
    }).join('');
  }
  
  function renderStep2(){
    const resistBox = document.getElementById('adv-resist-radios');
    const vulnBox = document.getElementById('adv-vuln-radios');
    if (!resistBox || !vulnBox) return;
    
    resistBox.innerHTML = '';
    vulnBox.innerHTML = '';
    
    SPECIES.forEach(s => {
      const eves = CATALOG[s] || [];
      let chipsHtml = '';
      eves.forEach(eve => {
        let stateColour = '';
        if (eve.state === 'useful') stateColour = '#ef4444';
        else if (eve.state === 'intact') stateColour = '#16a34a';
        else if (eve.state === 'silent') stateColour = '#f59e0b';
        else if (eve.state === 'broken') stateColour = '#111827';
        const typeColour = eve.type === 'retro' ? '#0ea5e9' : '#a16207';
        const icon = eve.type === 'retro' ? '🦠' : '🧬';
        
        chipsHtml += `
          <div style="display: inline-flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 4px 12px 4px 6px;">
            <span style="background: ${typeColour}; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">${icon}</span>
            <span style="font-weight: 600; font-size: 0.8rem;">${eve.id}</span>
            <span style="background: ${typeColour}20; color: ${typeColour}; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">${eve.type}</span>
            <span style="display: inline-flex; align-items: center; gap: 3px; background: ${stateColour}20; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">
              <span style="color: ${stateColour};">●</span> ${eve.state}
            </span>
            <span style="background: #64748b20; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">${eve.family}</span>
          </div>
        `;
      });
      
      resistBox.innerHTML += `
        <label class="species-card" style="display: block; padding: 12px; margin: 8px 0; background: #fff; border: 2px solid #e5e9ef; border-radius: 16px; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <input type="radio" name="resist" value="${s}">
            <strong style="font-size: 0.95rem;">${LABEL[s]}</strong>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">${chipsHtml}</div>
        </label>
      `;
      
      vulnBox.innerHTML += `
        <label class="species-card" style="display: block; padding: 12px; margin: 8px 0; background: #fff; border: 2px solid #e5e9ef; border-radius: 16px; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <input type="radio" name="vuln" value="${s}">
            <strong style="font-size: 0.95rem;">${LABEL[s]}</strong>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">${chipsHtml}</div>
        </label>
      `;
    });
  }
  
  function renderStep3(){
    const c = document.getElementById('adv-mutation-checks'); if (!c) return;
    c.innerHTML = '';
    
    SPECIES.forEach(s => {
      const eves = CATALOG[s] || [];
      let chipsHtml = '';
      eves.forEach(eve => {
        let stateColour = '';
        if (eve.state === 'useful') stateColour = '#ef4444';
        else if (eve.state === 'intact') stateColour = '#16a34a';
        else if (eve.state === 'silent') stateColour = '#f59e0b';
        else if (eve.state === 'broken') stateColour = '#111827';
        const typeColour = eve.type === 'retro' ? '#0ea5e9' : '#a16207';
        const icon = eve.type === 'retro' ? '🦠' : '🧬';
        
        chipsHtml += `
          <div style="display: inline-flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 4px 12px 4px 6px;">
            <span style="background: ${typeColour}; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">${icon}</span>
            <span style="font-weight: 600; font-size: 0.8rem;">${eve.id}</span>
            <span style="background: ${typeColour}20; color: ${typeColour}; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">${eve.type}</span>
            <span style="display: inline-flex; align-items: center; gap: 3px; background: ${stateColour}20; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">
              <span style="color: ${stateColour};">●</span> ${eve.state}
            </span>
            <span style="background: #64748b20; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem;">${eve.family}</span>
          </div>
        `;
      });
      
      c.innerHTML += `
        <label class="species-card" style="display: block; padding: 12px; margin: 8px 0; background: #fff; border: 2px solid #e5e9ef; border-radius: 16px; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <input type="checkbox" value="${s}">
            <strong style="font-size: 0.95rem;">${LABEL[s]}</strong>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">${chipsHtml}</div>
        </label>
      `;
    });
  }
  
  function hint(step){
    if (step===1){ alert('Pick an active retro EVE that matches RV1.'); }
    else if (step===2){ alert('Resistant: useful/intact retro near RV1a. Vulnerable: only broken retro or only DNA EVEs.'); }
    else if (step===3){ alert('Active/intact retro vs RV1/RV1a may still recognize RV1b.'); }
  }
  
  function checkStep1(){
    const val = (document.querySelector('input[name="step1-choice"]:checked')||{}).value;
    const out = document.getElementById('adv-feedback-1');
    if (!val){ out.textContent='Select an EVE above.'; out.style.color='#b91c1c'; return; }
    if (val === STEP1_CORRECT){
      out.innerHTML='✓ Task 1 Complete! EVE-A is a retro EVE with active piRNAs against RV1.'; out.style.color='#0f766e';
      passed.s1=true; maybeUnlock();
    } else {
      out.innerHTML='✗ Not quite. Choose an active retro EVE matching RV1 (not DNA, not broken).'; out.style.color='#b91c1c';
    }
  }
  
  function checkStep2(){
    const resist = document.querySelector('input[name="resist"]:checked')?.value;
    const vuln = document.querySelector('input[name="vuln"]:checked')?.value;
    const out = document.getElementById('adv-feedback-2');
    if (!resist || !vuln){ out.innerHTML='Select a species in each column.'; out.style.color='#b91c1c'; return; }
    const ok = (resist === STEP2_RESIST) && (vuln === STEP2_VULN);
    if (ok){
      out.innerHTML = `✓ Task 2 Complete! ${LABEL[resist]} is most resistant; ${LABEL[vuln]} is most vulnerable.`; out.style.color='#0f766e';
      passed.s2=true; maybeUnlock();
    } else {
      out.innerHTML = '✗ Try again: look for useful/intact retro near RV1a (resistant) and species lacking such retro EVEs (vulnerable).'; out.style.color='#b91c1c';
    }
  }
  
  function checkStep3(){
    const chosen = Array.from(document.querySelectorAll('#adv-mutation-checks input:checked')).map(cb => cb.value);
    const out = document.getElementById('adv-feedback-3');
    if (!chosen.length){ out.innerHTML='Select at least one species.'; out.style.color='#b91c1c'; return; }
    const correct = ['melanogaster', 'simulans', 'pseudoananassae'];
    const allCorrect = correct.every(s => chosen.includes(s)) && chosen.length === 3;
    if (allCorrect){
      out.innerHTML='✓ Task 3 Complete! D. mel., D. sim., and D. pse. likely retain protection against RV1b.'; out.style.color='#0f766e';
      passed.s3=true; maybeUnlock();
    } else {
      out.innerHTML='✗ Close—active/intact retro EVEs vs RV1/RV1a may still recognize RV1b; broken or DNA EVEs won\'t.'; out.style.color='#b91c1c';
    }
  }
  
  function maybeUnlock(){
    if (passed.s1 && passed.s2 && passed.s3 && !adultsWon){
      adultsWon = true;
      window.Achievements?.markComplete('adults');
      toast('🎉 Advanced badge unlocked! 🎉');
      confettiBurst(); claps(); playChime();
      resetTimer('adults', 60);
    }
  }
  
  function reset(){
    passed = { s1:false, s2:false, s3:false };
    adultsWon = false;
    renderStep1(); renderStep2(); renderStep3(); clearFeedback();
    resetTimer('adults', 60);
  }
  
  function restart(){ reset(); startTimer('adults', 60); }
  function togglePortfolios(){}

  return { init, hint, checkStep1, checkStep2, checkStep3, reset, restart, togglePortfolios };
})();
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('adv-eves-mel')) AdvancedGame.init(); });

function setEquals(a,b){ if (a.size!==b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }
