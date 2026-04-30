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
    if (id === 'teens') setTimeout(() => { IntermediateGame.init(); startSimpleTimer('teens', 60); }, 50);
    if (id === 'adults') setTimeout(() => { AdvancedGame.init(); startSimpleTimer('adults', 60); }, 50);
  });
});

/*
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
*/

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

// ==================== SIMPLE WORKING TIMER ====================
// Remove all other timer code and use only this

let simpleTimer = null;

function startTimer(panelId, seconds) {
  // Stop any existing timer
  if (simpleTimer) {
    clearInterval(simpleTimer);
  }
  
  const panel = document.getElementById(panelId);
  if (!panel) return;
  
  // Get the fill element and text element
  const fill = panel.querySelector('.timer-fill');
  const tleft = panel.querySelector('.tleft');
  
  if (!fill || !tleft) {
    console.error('Timer elements not found');
    return;
  }
  
  let timeLeft = seconds;
  
  // Set initial state
  fill.style.width = '100%';
  fill.style.backgroundColor = '#22c55e';
  tleft.textContent = timeLeft + 's';
  
  simpleTimer = setInterval(function() {
    timeLeft--;
    
    // Update the text
    tleft.textContent = timeLeft + 's';
    
    // Update the bar width
    const percent = (timeLeft / seconds) * 100;
    fill.style.width = percent + '%';
    
    console.log('Timer tick:', timeLeft, 'Percent:', percent + '%'); // Debug line
    
    // When time is up
    if (timeLeft <= 0) {
      clearInterval(simpleTimer);
      simpleTimer = null;
      fill.style.backgroundColor = '#ef4444';
      fill.style.width = '0%';
    }
  }, 1000);
}

function resetTimer(panelId, seconds) {
  // Stop timer
  if (simpleTimer) {
    clearInterval(simpleTimer);
    simpleTimer = null;
  }
  
  const panel = document.getElementById(panelId);
  if (panel) {
    const fill = panel.querySelector('.timer-fill');
    const tleft = panel.querySelector('.tleft');
    if (fill) {
      fill.style.width = '100%';
      fill.style.backgroundColor = '#22c55e';
    }
    if (tleft) tleft.textContent = seconds + 's';
  }
}

// Make them global
window.startTimer = startTimer;
window.resetTimer = resetTimer;

// ---------- Confetti (10 seconds) + Claps (3 seconds) + Sound ----------
function confettiBurst(){
  // Create canvas if it doesn't exist
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
  }
  
  // Set canvas size to full screen
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  
  // Create confetti particles
  const particles = [];
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#16a34a', '#ef4444', '#f59e0b', '#0ea5e9'];
  
  for (let i = 0; i < 300; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 10 + 5,
      speedX: (Math.random() - 0.5) * 8,
      speedY: Math.random() * 12 + 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  
  let startTime = Date.now();
  const duration = 10000; // 10 seconds
  
  function animate() {
    const now = Date.now();
    const elapsed = now - startTime;
    
    if (elapsed >= duration) {
      // Stop after 10 seconds
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.remove();
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let p of particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      
      // Reset particles that fall off the bottom
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      // Reset particles that go off sides
      if (p.x < -50) p.x = canvas.width + 50;
      if (p.x > canvas.width + 50) p.x = -50;
      
      // Draw confetti (rotated rectangles)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size/2);
      ctx.restore();
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
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

/* ==================== TEENS GAME — Images-as-cards, square slots, curved tree + time axis ====================
   Species: melanogaster, simulans, yakuba, virilis, pseudoobscura
   Correct placements:
     - Pair A (closest): melanogaster + simulans
     - Pair B (next):    yakuba + virilis
     - Outgroup:         pseudoobscura
   Notes:
     - Put your images in assets/species/<species>.png (or .jpg / .svg). Examples:
         assets/species/melanogaster.png
         assets/species/simulans.png
         assets/species/yakuba.png
         assets/species/virilis.png
         assets/species/pseudoobscura.png
     - Timeline values (Mya) are editable below in TIMELINE. They set the x-position of nodes and axis ticks.
*/
const IntermediateGame = (() => {
  const S = ['melanogaster','simulans','yakuba','virilis','pseudoobscura'];
  const LABEL_FULL = {
    melanogaster:'D. melanogaster',
    simulans:'D. simulans',
    yakuba:'D. yakuba',
    virilis:'D. virilis',
    pseudoobscura:'D. pseudoobscura'
  };
  const LABEL_SHORT= {
    melanogaster:'D. mel.', simulans:'D. sim.',
    yakuba:'D. yak.', virilis:'D. vir.', pseudoobscura:'D. pse.'
  };
  let useShort = true;

  // EDIT THESE timeline values (in millions of years ago)
  //  - mel_sim: MRCA of D. mel. & D. sim.
  //  - yak_vir: MRCA of D. yak. & D. vir.
  //  - ab: MRCA of the two pairs (mel/sim) + (yak/vir)
  //  - out: split of pseudoobscura from the rest
  //  - max: length of time axis (must be >= largest of above)
  const TIMELINE = { mel_sim: 2, yak_vir: 15, ab: 25, out: 40, max: 50 };

  // Correct mapping
  const GOLD = {
    pairA: new Set(['melanogaster','simulans']),
    pairB: new Set(['yakuba','virilis']),
    out:   'pseudoobscura'
  };

  // Runtime state
  const assign = new Map();          // socketId -> species
  const placedBySpecies = new Map(); // species -> socketId
  let deckBuilt = false;
  let cssInjected = false;

  function injectCSS() {
    if (cssInjected) return; cssInjected = true;
    const css = `
      #teens .tree-svg { position: relative; min-height: 360px; }
      #teens .tree-svg svg { display:block; width:100%; height:auto; max-height:460px; }
      #teens .branch { stroke:#60a5fa; stroke-width:3; fill:none; stroke-linecap:round; }
      #teens .socket-label { font-size: 12px; fill: #0a1a2f; opacity:.95; }

      /* Square slots */
      #teens .socket-slot { fill:#f8fafc; stroke:#2563eb; stroke-width:2; }
      #teens .socket.hover .socket-slot { stroke:#0ea5e9; stroke-width:3; }
      #teens .socket.occupied .socket-slot { fill:#e0f2fe; }

      /* Deck: image as the card (no coloured bars) */
      #teens .deck { display:flex; flex-wrap:wrap; gap:.5rem; background:#fff; border:1px solid var(--ash-200); border-radius:.5rem; padding:.5rem; }
      #teens .species-card {
        position:relative; display:inline-block; background:#fff; border:1px solid var(--ash-200);
        border-radius:.75rem; overflow:hidden; cursor:grab; user-select:none;
        width: 180px; height: 110px;
      }
      #teens .species-card:active { cursor:grabbing; }
      #teens .species-card img {
        width:100%; height:100%; object-fit:cover; display:block;
      }
      #teens .label-overlay {
        position:absolute; left:0; right:0; bottom:0;
        background:linear-gradient(180deg, transparent, rgba(0,0,0,.55));
        color:#fff; font:700 12px/1.2 Inter, system-ui; padding:6px 8px; text-shadow:0 1px 2px rgba(0,0,0,.35);
      }

      /* Hide the old builder grid */
      #teens .drag-builder { display:none !important; }

      /* Axis styling */
      #teens .axis { stroke:#94a3b8; stroke-width:1.5; }
      #teens .tick { stroke:#94a3b8; stroke-width:1; }
      #teens .axis-label, #teens .tick-label, #teens .node-time {
        font: 600 11px/1.1 Inter, system-ui; fill: #475569;
      }
      #teens .node-time { fill:#0f766e; }
    `;
    const el = document.createElement('style');
    el.id = 'teens-tree-css-imgcards';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function init() {
    // Reset to ensure a fresh build
    assign.clear(); placedBySpecies.clear(); deckBuilt = false;

    const sl = document.getElementById('short-labels');
    if (sl) { useShort = sl.checked; sl.onchange = (e)=>setShort(e.target.checked); }

    injectCSS();
    renderDeck();
    renderTree();
    renderMatrix(); // optional helper — still available if you show it
  }

  function setShort(on) {
    useShort = !!on;
    renderDeck(true);
    renderMatrix();
  }

  /* ---------- Image loading with robust fallback (png -> jpg -> svg -> logo) ---------- */
  function imgCandidates(sp) {
    const baseA = `assets/species/${sp}`;
    const baseB = `assets/${sp}`;
    return [`${baseA}.png`, `${baseA}.jpg`, `${baseA}.svg`, `${baseB}.png`, `${baseB}.jpg`, 'assets/eve_logo.webp'];
  }
  function nextImg(img) {
    const rest = img.getAttribute('data-cand');
    if (!rest) { img.onerror = null; img.src = 'assets/eve_logo.webp'; return; }
    const list = rest.split('|').filter(Boolean);
    const nx = list.shift();
    img.setAttribute('data-cand', list.join('|'));
    img.src = nx || 'assets/eve_logo.webp';
  }

  /* ---------- Deck: image-only cards with overlay label ---------- */
  function speciesCardHTML(sp) {
    const label = useShort ? LABEL_SHORT[sp] : LABEL_FULL[sp];
    const cands = imgCandidates(sp);
    const first = cands.shift();
    return `
      <div class="species-card" draggable="true" data-sp="${sp}" aria-label="${label}">
        <img src="${first}" alt="${label}" data-cand="${cands.join('|')}" onerror="IntermediateGame._nextImg(this)">
        <div class="label-overlay">${label}</div>
      </div>
    `;
  }

  function renderDeck(rebuild=false) {
    const deck = document.getElementById('species-deck');
    if (!deck) return;
    if (!deckBuilt || rebuild) {
      const placedSet = new Set(placedBySpecies.keys());
      deck.innerHTML = S.map(sp => placedSet.has(sp) ? '' : speciesCardHTML(sp)).join('');
      deck.querySelectorAll('.species-card[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', onDragStart);
      });
      // Return-to-deck drop
      deck.addEventListener('dragover', e => e.preventDefault());
      deck.addEventListener('drop', e => {
        e.preventDefault();
        const sp = e.dataTransfer.getData('text/sp');
        if (!sp) return;
        returnToDeck(sp);
      });
      deckBuilt = true;
    }
  }

  // Small drag ghost (chip)
  function smallGhost(sp) {
    const label = useShort ? LABEL_SHORT[sp] : LABEL_FULL[sp];
    const g = document.createElement('div');
    g.style.cssText = 'position:absolute;top:-1000px;left:-1000px;pointer-events:none;background:#fff;border:1px solid #e5e9ef;border-radius:10px;padding:3px 6px;display:flex;gap:6px;align-items:center;font:600 12px Inter,system-ui';
    const img = document.createElement('img');
    img.src = imgCandidates(sp)[0];
    img.width = 18; img.height = 18;
    img.style.cssText = 'border-radius:6px;object-fit:cover;border:1px solid #e5e9ef';
    img.onerror = () => { img.src='assets/eve_logo.webp'; };
    const t = document.createElement('span'); t.textContent = label; t.style.color = '#0a1a2f';
    g.appendChild(img); g.appendChild(t);
    document.body.appendChild(g);
    return g;
  }

  function onDragStart(e) {
    const sp = e.currentTarget.getAttribute('data-sp');
    e.dataTransfer.setData('text/sp', sp);
    const ghost = smallGhost(sp);
    e.dataTransfer.setDragImage(ghost, 12, 12);
    setTimeout(() => { try { document.body.removeChild(ghost); } catch(_){} }, 0);
  }

  /* ---------- Tree: time-calibrated curved branches + small square slots ---------- */
  function renderTree() {
    const box = document.getElementById('tree-svg');
    if (!box) return;

    const w = Math.max(700, Math.min(960, box.clientWidth || 800));
    const hBase = 420;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');

    // Leaf and axis positions
    const LEAF_X = w - 90;            // present
    const ROOT_X = 90;                // left margin (oldest time)
    const pxPerMya = (LEAF_X - ROOT_X) / TIMELINE.max;
    const XfromMYA = (mya) => LEAF_X - mya*pxPerMya;

    // Vertical layout (5 evenly spaced rows)
    const SLOT = 56;         // square slot size
    const GAP = SLOT + 22;   // spacing between rows
    const TOP = 60;
    const Y = {
      aTop: TOP,
      aBot: TOP + GAP,
      out:  TOP + GAP*2,
      bTop: TOP + GAP*3,
      bBot: TOP + GAP*4,
      root: TOP + GAP*2
    };
    const h = Math.max(hBase, TOP + GAP*4 + SLOT + 60);

    // Node x-positions from timeline
    const x_melsim = XfromMYA(TIMELINE.mel_sim); // Pair A node
    const x_yakvir = XfromMYA(TIMELINE.yak_vir); // Pair B node
    const x_ab     = XfromMYA(TIMELINE.ab);      // MRCA of (A & B)
    const x_root   = XfromMYA(TIMELINE.out);     // outgroup split

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);

    // Curved branches
    function curvePath(x1,y1,x2,y2, bend=0.45) {
      const dx = x2 - x1;
      const c1x = x1 + dx * bend, c1y = y1;
      const c2x = x2 - dx * bend, c2y = y2;
      return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    }
    function curve(x1,y1,x2,y2) {
      const p = document.createElementNS(svgNS,'path');
      p.setAttribute('d', curvePath(x1,y1,x2,y2));
      p.setAttribute('class','branch');
      return p;
    }

    // Build tree geometry using node x-positions and row y-positions
    // Root split: root -> out leaf, and root -> (A+B) MRCA
    svg.appendChild(curve(x_root, Y.root, LEAF_X, Y.out));         // out branch to present
    svg.appendChild(curve(x_root, Y.root, x_ab, (Y.aTop+Y.bBot)/2));// root to AB MRCA

    // AB MRCA splits to A and B nodes
    svg.appendChild(curve(x_ab, (Y.aTop+Y.bBot)/2, x_melsim, (Y.aTop+Y.aBot)/2)); // to A node
    svg.appendChild(curve(x_ab, (Y.aTop+Y.bBot)/2, x_yakvir, (Y.bTop+Y.bBot)/2)); // to B node

    // A node to A leaves
    svg.appendChild(curve(x_melsim, (Y.aTop+Y.aBot)/2, LEAF_X, Y.aTop));
    svg.appendChild(curve(x_melsim, (Y.aTop+Y.aBot)/2, LEAF_X, Y.aBot));

    // B node to B leaves
    svg.appendChild(curve(x_yakvir, (Y.bTop+Y.bBot)/2, LEAF_X, Y.bTop));
    svg.appendChild(curve(x_yakvir, (Y.bTop+Y.bBot)/2, LEAF_X, Y.bBot));

    // Time axis (bottom)
    const axisY = h - 28;
    const axis = document.createElementNS(svgNS,'line');
    axis.setAttribute('x1', ROOT_X); axis.setAttribute('y1', axisY);
    axis.setAttribute('x2', LEAF_X); axis.setAttribute('y2', axisY);
    axis.setAttribute('class','axis');
    svg.appendChild(axis);

    // Ticks every 10 Mya (edit if you prefer 5)
    for (let t=0; t<=TIMELINE.max; t+=10) {
      const x = XfromMYA(t);
      const tick = document.createElementNS(svgNS,'line');
      tick.setAttribute('x1', x); tick.setAttribute('y1', axisY);
      tick.setAttribute('x2', x); tick.setAttribute('y2', axisY+6);
      tick.setAttribute('class','tick');
      svg.appendChild(tick);

      const lab = document.createElementNS(svgNS,'text');
      lab.setAttribute('x', x); lab.setAttribute('y', axisY+18);
      lab.setAttribute('text-anchor', 'middle');
      lab.setAttribute('class','tick-label');
      lab.textContent = t === 0 ? '0 (present)' : `${t}`;
      svg.appendChild(lab);
    }
    const axLabel = document.createElementNS(svgNS,'text');
    axLabel.setAttribute('x', (ROOT_X+LEAF_X)/2);
    axLabel.setAttribute('y', axisY+34);
    axLabel.setAttribute('text-anchor', 'middle');
    axLabel.setAttribute('class','axis-label');
    axLabel.textContent = 'Time (Mya)';
    svg.appendChild(axLabel);

    // Node time labels near nodes
    function nodeTimeLabel(x,y,text) {
      const lab = document.createElementNS(svgNS,'text');
      lab.setAttribute('x', x - 6);
      lab.setAttribute('y', y - 8);
      lab.setAttribute('text-anchor', 'end');
      lab.setAttribute('class','node-time');
      lab.textContent = text;
      svg.appendChild(lab);
    }
    nodeTimeLabel(x_melsim, (Y.aTop+Y.aBot)/2, `${TIMELINE.mel_sim} Mya`);
    nodeTimeLabel(x_yakvir, (Y.bTop+Y.bBot)/2, `${TIMELINE.yak_vir} Mya`);
    nodeTimeLabel(x_ab, (Y.aTop+Y.bBot)/2, `${TIMELINE.ab} Mya`);
    nodeTimeLabel(x_root, Y.root, `${TIMELINE.out} Mya`);

    // Square slot builder
    const SLOT = 56; // side length
    function slot(socketId, cx, cy, tag='') {
      const g = document.createElementNS(svgNS,'g');
      g.setAttribute('data-socket', socketId);
      g.setAttribute('class','socket');

      const x = LEAF_X - SLOT/2, y = cy - SLOT/2; // align slots at present
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', SLOT); rect.setAttribute('height', SLOT);
      rect.setAttribute('rx', 8); rect.setAttribute('ry', 8);
      rect.setAttribute('class','socket-slot');

      if (tag) {
        const label = document.createElementNS(svgNS,'text');
        label.setAttribute('x', x + 2);
        label.setAttribute('y', y - 8);
        label.setAttribute('class','socket-label');
        label.textContent = tag;
        g.appendChild(label);
      }

      g.appendChild(rect);

      // Drop target
      g.addEventListener('dragover', e => { e.preventDefault(); g.classList.add('hover'); });
      g.addEventListener('dragleave', () => g.classList.remove('hover'));
      g.addEventListener('drop', e => {
        e.preventDefault(); g.classList.remove('hover');
        const sp = e.dataTransfer.getData('text/sp');
        if (sp) placeOnSocket(socketId, sp);
      });

      return g;
    }

    // Create 5 square slots at present
    const sA1 = slot('A1', LEAF_X, Y.aTop, 'Pair A (closest)');
    const sA2 = slot('A2', LEAF_X, Y.aBot);
    const sB1 = slot('B1', LEAF_X, Y.bTop, 'Pair B (next closest)');
    const sB2 = slot('B2', LEAF_X, Y.bBot);
    const sO  = slot('O',  LEAF_X, Y.out,  'Outgroup (oldest)');

    svg.appendChild(sA1); svg.appendChild(sA2);
    svg.appendChild(sB1); svg.appendChild(sB2);
    svg.appendChild(sO);

    // Mount svg
    box.innerHTML = '';
    box.appendChild(svg);

    // Reapply any placements
    for (const [sock, sp] of assign.entries()) {
      if (sp) mountTokenOnSocket(sock, sp, SLOT);
    }
  }

  // Placement helpers
  function placeOnSocket(socketId, sp) {
    const existingSock = placedBySpecies.get(sp);
    if (existingSock && existingSock !== socketId) clearSocket(existingSock);
    const current = assign.get(socketId);
    if (current && current !== sp) returnToDeck(current);
    assign.set(socketId, sp);
    placedBySpecies.set(sp, socketId);
    mountTokenOnSocket(socketId, sp);
    document.querySelector(`#species-deck .species-card[data-sp="${sp}"]`)?.remove();
  }

  function mountTokenOnSocket(socketId, sp, SLOT=56) {
    const svg = document.querySelector('#teens .tree-svg svg');
    if (!svg) return;
    const g = svg.querySelector(`[data-socket="${socketId}"]`);
    if (!g) return;
    g.classList.add('occupied');

    g.querySelector('foreignObject')?.remove();

    const rect = g.querySelector('.socket-slot');
    const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y'));

    // Insert the image inside the square slot
    const fo = document.createElementNS('http://www.w3.org/2000/svg','foreignObject');
    fo.setAttribute('x', x + 2);
    fo.setAttribute('y', y + 2);
    fo.setAttribute('width', SLOT - 4);
    fo.setAttribute('height', SLOT - 4);

    const label = useShort ? LABEL_SHORT[sp] : LABEL_FULL[sp];

    const div = document.createElement('div');
    div.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
    div.style.cssText = `
      width:100%; height:100%; border-radius:8px; overflow:hidden;
      border:1px solid #e2e8f0; background:#fff; display:block;
    `;

    const img = document.createElement('img');
    const cands = imgCandidates(sp);
    img.src = cands[0];
    img.setAttribute('data-cand', cands.slice(1).join('|'));
    img.onerror = () => nextImg(img);
    img.alt = label;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';

    div.appendChild(img);
    fo.appendChild(div);
    g.appendChild(fo);
  }

  function clearSocket(socketId) {
    const sp = assign.get(socketId);
    if (!sp) return;
    assign.delete(socketId);
    placedBySpecies.delete(sp);
    const g = document.querySelector(`#teens .tree-svg svg [data-socket="${socketId}"]`);
    if (g) {
      g.classList.remove('occupied');
      g.querySelector('foreignObject')?.remove();
    }
  }

  function returnToDeck(sp) {
    const sock = placedBySpecies.get(sp);
    if (sock) clearSocket(sock);
    const deck = document.getElementById('species-deck');
    if (!deck) return;
    if (!deck.querySelector(`.species-card[data-sp="${sp}"]`)) {
      deck.insertAdjacentHTML('beforeend', speciesCardHTML(sp));
      deck.querySelector(`.species-card[data-sp="${sp}"]`).addEventListener('dragstart', onDragStart);
    }
  }

  /* ---------- Matrix helper (optional) ---------- */
  function renderMatrix() {
    const el = document.getElementById('matrix'); if (!el) return;
    // Simple placeholder matrix now that coloured bars are removed
    let html = '<table><thead><tr><th></th>';
    S.forEach(sp => html += `<th>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</th>`);
    html += '</tr></thead><tbody>';
    S.forEach(rsp => {
      html += `<tr><th>${(useShort?LABEL_SHORT:LABEL_FULL)[rsp]}</th>`;
      S.forEach(csp => {
        const val = rsp===csp ? '—' : '';
        html += `<td>${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // Image onerror fallback (used by inline attribute)
  function _nextImg(img){ nextImg(img); }

  /* ---------- Public actions ---------- */
  function checkTree() {
    const A = [assign.get('A1'), assign.get('A2')].filter(Boolean);
    const B = [assign.get('B1'), assign.get('B2')].filter(Boolean);
    const O = assign.get('O');

    if (A.length!==2 || B.length!==2 || !O) {
      toast('Place all five species onto the tree: Pair A (2), Pair B (2), Outgroup (1).', document.getElementById('teens'));
      return;
    }

        const okA = setEquals(new Set(A), GOLD.pairA);
    const okB = setEquals(new Set(B), GOLD.pairB);
    const okO = (O === GOLD.out);

    const txt = document.getElementById('your-tree');
    if (txt) {
      txt.textContent = `((${A.join(',')}),(${B.join(',')}),${O});`;
    }

    if (okA && okB && okO){
      toast('Excellent! Your tree matches the EVE evidence.', document.getElementById('teens'));
      if (!IntermediateGame._won){
        IntermediateGame._won = true;
        window.Achievements?.markComplete('teens');
        if (typeof confettiBurst === 'function') confettiBurst();
        if (typeof claps === 'function') claps();
        if (typeof playChime === 'function') playChime();
      }
      const steps = document.getElementById('build-steps');
      if (steps) steps.textContent = `Pairs: {${A.join(', ')}} and {${B.join(', ')}}, Outgroup: ${O}`;
    } else {
      alert('Not quite. Hint: (D. mel. + D. sim.) are closest; (D. yak. + D. vir.) next; D. pse. is the outgroup.');
    }
  }

  function clearDrops() {
    for (const sock of ['A1','A2','B1','B2','O']) clearSocket(sock);
    const deck = document.getElementById('species-deck');
    if (!deck) return;
    deck.innerHTML = '';
    S.forEach(sp => {
      deck.insertAdjacentHTML('beforeend', speciesCardHTML(sp));
    });
    deck.querySelectorAll('.species-card').forEach(el => el.addEventListener('dragstart', onDragStart));
  }

  function toggleMatrix(){
    const el = document.getElementById('matrix'); if (!el) return;
    if (el.hasAttribute('hidden')) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
  }

  function showHints(){
    alert([
      'How to play:',
      '1) Look at each species card image.',
      '2) Drag the two closest into Pair A; the next closest into Pair B.',
      '3) Place the most different as Outgroup. Then click “Build & Check Tree”.'
    ].join('\n'));
  }

  return {
    init, setShort, toggleMatrix, showHints,
    checkTree, clearDrops, _nextImg
  };
})();

// Build Teens when Teens panel exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('teens')) IntermediateGame.init();
});

// Fallback helper if not already defined elsewhere
if (typeof setEquals !== 'function') {
  function setEquals(a,b){ if (a.size!==b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }
}





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

// ==================== TEENS TREE GAME (Drag & Drop) ====================
const TeensTreeGame = (() => {
  // Species data with EVE bands (using your actual EVE_DB data)
  const speciesList = [
    { id: 'melanogaster', name: 'D. melanogaster', 
      eves: ['E3', 'E4'], 
      bandColors: ['intact', 'useful'],
      sharedWith: 'simulans (shares E3 intact)' },
    { id: 'simulans', name: 'D. simulans', 
      eves: ['E3', 'E5'], 
      bandColors: ['intact', 'intact'],
      sharedWith: 'melanogaster (shares E3 intact)' },
    { id: 'virilis', name: 'D. virilis', 
      eves: ['E6'], 
      bandColors: ['intact'],
      sharedWith: 'pseudoananassae (shares E6 intact)' },
    { id: 'pseudoananassae', name: 'D. pseudoananassae', 
      eves: ['E6', 'E7'], 
      bandColors: ['intact', 'useful'],
      sharedWith: 'virilis (shares E6 intact)' },
    { id: 'yakuba', name: 'D. yakuba', 
      eves: ['E2', 'E8'], 
      bandColors: ['broken', 'unique'],
      sharedWith: 'none - outgroup species' }
  ];

  // Correct tree mapping (slot -> species id)
  const correctTree = {
    top1: 'melanogaster',
    top2: 'simulans',
    mid1: 'virilis',
    mid2: 'pseudoananassae',
    outgroup: 'yakuba'
  };

  let currentDrops = {};

  function init() {
    renderSpeciesDeck();
    renderMatrix();
    setupDragAndDrop();
  }

  function renderSpeciesDeck() {
    const deck = document.getElementById('teens-species-deck');
    if (!deck) return;
    
    deck.innerHTML = speciesList.map(sp => `
      <div class="species-card-drag" draggable="true" data-species-id="${sp.id}" data-species-name="${sp.name}" 
           style="width: 150px; background: white; border: 2px solid #cbd5e1; border-radius: 16px; padding: 12px; cursor: grab; text-align: center; transition: all 0.2s ease;">
        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 8px;">${sp.name}</div>
        <div class="chromosome" style="display: flex; justify-content: center; gap: 8px; margin: 10px 0;">
          ${sp.bandColors.map(color => `<span class="eve-band ${color}" style="width: 22px; height: 22px; border-radius: 50%; background: ${color === 'intact' ? '#16a34a' : color === 'useful' ? '#ef4444' : color === 'broken' ? '#111827' : '#f59e0b'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block;"></span>`).join('')}
        </div>
        <div style="font-size: 0.7rem; color: #0e8a68; margin-top: 6px;">🔍 Shares: ${sp.sharedWith}</div>
        <div style="font-size: 0.65rem; color: #64748b; margin-top: 4px;">📌 Drag to tree</div>
      </div>
    `).join('');
    
    // Make draggable
    document.querySelectorAll('.species-card-drag').forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    });
  }

  function handleDragStart(e) {
    const card = e.target.closest('.species-card-drag');
    if (!card) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: card.dataset.speciesId,
      name: card.dataset.speciesName
    }));
    e.dataTransfer.effectAllowed = 'copy';
    card.style.opacity = '0.5';
  }

  function handleDragEnd(e) {
    const card = e.target.closest('.species-card-drag');
    if (card) card.style.opacity = '1';
  }

  function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-slot');
    
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        zone.style.fill = '#e8f7f1';
        zone.style.stroke = '#0e8a68';
      });
      
      zone.addEventListener('dragleave', (e) => {
        zone.style.fill = '#f0fdf4';
        zone.style.stroke = '#22c55e';
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.fill = '#f0fdf4';
        zone.style.stroke = '#22c55e';
        
        const slotId = zone.dataset.slot;
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        
        const species = JSON.parse(rawData);
        
        // Remove from previous slot if exists
        for (let [prevSlot, prevSpecies] of Object.entries(currentDrops)) {
          if (prevSpecies === species.id) {
            const prevSlotEl = document.querySelector(`.drop-slot[data-slot="${prevSlot}"]`);
            if (prevSlotEl) {
              // Clear the text content
              const textEl = prevSlotEl.querySelector('.slot-text');
              if (textEl) textEl.remove();
              prevSlotEl.classList.remove('dropped');
            }
            delete currentDrops[prevSlot];
          }
        }
        
        // Add to new slot
        currentDrops[slotId] = species.id;
        
        // Add text to the drop zone
        const existingText = zone.querySelector('.slot-text');
        if (existingText) existingText.remove();
        
        const textSpan = document.createElement('text');
        textSpan.className = 'slot-text';
        textSpan.setAttribute('x', zone.getAttribute('x') || '620');
        textSpan.setAttribute('y', zone.getAttribute('y') || '75');
        textSpan.setAttribute('font-size', '11');
        textSpan.setAttribute('fill', '#0e8a68');
        textSpan.setAttribute('font-weight', 'bold');
        textSpan.setAttribute('text-anchor', 'middle');
        textSpan.textContent = species.name;
        zone.appendChild(textSpan);
        zone.classList.add('dropped');
        
        // Update feedback to show progress
        updateProgressFeedback();
      });
    });
  }

  function updateProgressFeedback() {
    let correctCount = 0;
    for (let [slot, speciesId] of Object.entries(currentDrops)) {
      if (correctTree[slot] === speciesId) correctCount++;
    }
    const feedback = document.getElementById('teens-feedback');
    if (feedback && correctCount < 5) {
      feedback.innerHTML = `📊 Progress: ${correctCount}/5 species placed correctly. Keep going!`;
      feedback.style.color = '#0e8a68';
    }
  }

  function renderMatrix() {
    const container = document.getElementById('teens-matrix');
    if (!container) return;
    
    container.innerHTML = `
      <table style="border-collapse: collapse; width: 100%; font-size: 13px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #0e8a68; color: white;">
            <th style="padding: 10px;">Species Pair</th>
            <th style="padding: 10px;">Shared EVEs</th>
            <th style="padding: 10px;">Relationship</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;"><strong>D. melanogaster</strong> + <strong>D. simulans</strong></td>
            <td style="padding: 10px;"><span class="chip chip-intact" style="background:#16a34a20; padding:4px 12px;">E3 (Intact)</span></td>
            <td style="padding: 10px; color: #0e8a68;">⭐ Closest relatives</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;"><strong>D. virilis</strong> + <strong>D. pseudoananassae</strong></td>
            <td style="padding: 10px;"><span class="chip chip-intact" style="background:#16a34a20; padding:4px 12px;">E6 (Intact)</span></td>
            <td style="padding: 10px; color: #0e8a68;">📌 Next closest relatives</td>
          </tr>
          <tr>
            <td style="padding: 10px;"><strong>D. yakuba</strong></td>
            <td style="padding: 10px;"><span class="chip chip-broken" style="background:#11182720; padding:4px 12px;">E2 (Broken)</span> + <span class="chip chip-unique" style="background:#f59e0b20; padding:4px 12px;">E8 (Unique)</span></td>
            <td style="padding: 10px; color: #b91c1c;">🌳 Outgroup (oldest lineage)</td>
          </tr>
        </tbody>
      </table>
      <p class="muted" style="margin-top: 12px; font-size: 12px; text-align: center;">💡 <strong>How to read this:</strong> Species that share more EVEs (especially Intact/Useful ones) are more closely related. D. yakuba has unique EVEs, making it the outgroup.</p>
    `;
  }

  function toggleMatrix() {
    const matrix = document.getElementById('teens-matrix');
    const hint = document.getElementById('matrix-hint');
    if (matrix) {
      if (matrix.style.display === 'none') {
        matrix.style.display = 'block';
        if (hint) hint.style.display = 'none';
      } else {
        matrix.style.display = 'none';
        if (hint) hint.style.display = 'block';
      }
    }
  }

  function showHints() {
    alert("🔍 HINTS (not answers):\n\n" +
          "1️⃣ Compare the coloured bands on each species card.\n" +
          "2️⃣ 🟢 Green bands (Intact) = complete viral sequences\n" +
          "3️⃣ 🔴 Red bands (Useful) = provide immunity\n" +
          "4️⃣ ⚫ Grey bands (Broken) = degraded, no function\n" +
          "5️⃣ 🟡 Gold bands (Unique) = rare, lineage-specific\n\n" +
          "❓ Which two species share a green (Intact) band?\n" +
          "❓ Which two species share another green band?\n" +
          "❓ Which species has unique gold and grey bands?\n\n" +
          "📌 The more bands two species share, the closer they are on the tree!");
  }

  function clearTree() {
    currentDrops = {};
    document.querySelectorAll('.drop-slot').forEach(slot => {
      const textEl = slot.querySelector('.slot-text');
      if (textEl) textEl.remove();
      slot.classList.remove('dropped');
      slot.style.fill = '#f0fdf4';
      slot.style.stroke = '#22c55e';
    });
    document.getElementById('teens-feedback').innerHTML = '';
  }

  function checkTree() {
    let correctCount = 0;
    let wrongSlots = [];
    
    for (let [slot, speciesId] of Object.entries(currentDrops)) {
      if (correctTree[slot] === speciesId) {
        correctCount++;
      } else {
        wrongSlots.push(slot);
      }
    }
    
    const feedback = document.getElementById('teens-feedback');
    if (correctCount === 5) {
      feedback.innerHTML = '✓ PERFECT! Your tree matches the EVE evidence. You earned the Teens badge! 🎉';
      feedback.style.color = '#0f766e';
      feedback.style.fontSize = '1rem';
      feedback.style.fontWeight = 'bold';
      if (typeof window.Achievements !== 'undefined') window.Achievements.markComplete('teens');
      if (typeof confettiBurst === 'function') { confettiBurst(); claps(); playChime(); }
      if (typeof resetSimpleTimer === 'function') resetSimpleTimer('teens', 60);
    } else {
      feedback.innerHTML = `📊 You have ${correctCount}/5 correct. ${wrongSlots.length > 0 ? 'Try swapping the species in the wrong slots.' : 'Keep dragging species onto the tree!'}`;
      feedback.style.color = '#b91c1c';
      
      // Highlight wrong slots briefly
      wrongSlots.forEach(slotId => {
        const slot = document.querySelector(`.drop-slot[data-slot="${slotId}"]`);
        if (slot) {
          slot.style.stroke = '#ef4444';
          slot.style.strokeWidth = '3';
          setTimeout(() => {
            slot.style.stroke = '#22c55e';
            slot.style.strokeWidth = '2';
          }, 1500);
        }
      });
    }
  }

  return { init, toggleMatrix, showHints, clearTree, checkTree };
})();

// Auto-initialize TeensTreeGame when teens tab becomes active
document.addEventListener('DOMContentLoaded', () => {
  const teensTab = document.getElementById('tab-teens');
  if (teensTab) {
    teensTab.addEventListener('click', () => {
      setTimeout(() => TeensTreeGame.init(), 150);
    });
  }
  if (document.getElementById('teens') && document.getElementById('teens').classList.contains('is-active')) {
    setTimeout(() => TeensTreeGame.init(), 150);
  }
});
