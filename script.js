// --------------- Nav toggle ---------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open');
  });
}

// --------------- Tabs ---------------
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
    panels.forEach(p => p.classList.remove('is-active'));
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.getAttribute('aria-controls')).classList.add('is-active');
    if (tab.getAttribute('aria-controls') === 'kids') {
      setTimeout(() => KidsGame.resize(), 50);
    }
  });
});

// --------------- Progress / badges ---------------
const GATE_BADGE_DOWNLOADS = true; // set false if you want stickers downloadable anytime
const STATE_KEY = 'eveDetectiveProgress';
function getState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || { kids:false, teens:false, adults:false, champion:false }; }
  catch { return { kids:false, teens:false, adults:false, champion:false }; }
}
function setState(s){
  if (s.kids && s.teens && s.adults) s.champion = true;
  localStorage.setItem(STATE_KEY, JSON.stringify(s));
  renderProgress();
}
function renderProgress(){
  const s = getState();
  const done = ['kids','teens','adults'].filter(k => s[k]).length;
  const pct = (done/3)*100;
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = pct + '%';
  document.querySelectorAll('.badge').forEach(b => {
    const key = b.getAttribute('data-badge');
    const btn = b.querySelector('button');
    if (key === 'champion') {
      b.classList.add('badge-champion');
      b.classList.toggle('unlocked', s.champion);
      b.style.opacity = s.champion ? 1 : 0.7;
      if (btn && GATE_BADGE_DOWNLOADS) btn.disabled = !s.champion;
      if (btn) btn.setAttribute('aria-disabled', btn && btn.disabled ? 'true' : 'false');
    } else {
      b.style.opacity = s[key] ? 1 : 0.95;
      if (btn && GATE_BADGE_DOWNLOADS) btn.disabled = !s[key];
      if (btn) btn.setAttribute('aria-disabled', btn && btn.disabled ? 'true' : 'false');
    }
  });
}
renderProgress();
function complete(key){
  const s = getState();
  if (!s[key]) { s[key] = true; setState(s); toast('Kids badge unlocked!'); }
}

// --------------- Teens challenge (unchanged) ---------------
window.runTeens = function(){
  const seq = (document.getElementById('teens-seq').value || '').toUpperCase().replace(/[^ACGT]/g,'');
  if (seq.length < 9) return setFeedback('teens-feedback','Paste a longer DNA sequence (>= 9 bases).', false);
  const start = seq.indexOf('ATG');
  const stops = ['TAA','TAG','TGA'];
  let found = false;
  if (start >= 0) {
    for (let i=start+3; i<seq.length-2; i+=3) {
      const codon = seq.slice(i,i+3);
      if (stops.includes(codon)) { found = true; break; }
    }
  }
  if (found) {
    setFeedback('teens-feedback','Nice! Found an in-frame start and stop.', true);
    const s = getState(); if (!s.teens) { s.teens = true; setState(s); toast('Teens badge progress!'); }
  } else {
    setFeedback('teens-feedback','No in-frame stop found after ATG. Try another sequence.', false);
  }
};

// --------------- Adults challenge (unchanged) ---------------
window.runAdults = function(){
  const hasLTR = document.getElementById('adults-found-ltr').checked;
  const hasORF = document.getElementById('adults-found-orf').checked;
  if (hasLTR && hasORF) {
    setFeedback('adults-feedback','Great! You identified key EVE-like signatures.', true);
    const s = getState(); if (!s.adults) { s.adults = true; setState(s); toast('Adults badge progress!'); }
  } else {
    setFeedback('adults-feedback','Hint: Look for paired [LTR] labels and an ORF (ATG..TAA/TAG/TGA).', false);
  }
};

// --------------- Feedback + Toast ---------------
function setFeedback(id, msg, ok){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#0f766e' : '#b91c1c';
}
function toast(msg){
  const w = document.querySelector('.game-wrap') || document.body;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 1800);
}

// --------------- Sticker downloads ---------------
window.downloadBadge = async function(key){
  const fileMap = {
    kids:     ['assets/Beginner-sticker.jpeg',    'assets/Beginner sticker.jpeg'],
    teens:    ['assets/Intermediate-sticker.jpeg','assets/Intermediate sticker.jpeg'],
    adults:   ['assets/Advanced-sticker.jpeg',    'assets/Advanced sticker.jpeg'],
    champion: ['assets/Champion-sticker.jpeg',    'assets/Champion sticker.jpeg']
  };
  const nameMap = {
    kids:     'Kids — EVE Detective.jpeg',
    teens:    'Teens — EVE Evolution Expert.jpeg',
    adults:   'Adults — Viral Immunity Expert.jpeg',
    champion: 'Champion — EVE Champion.jpeg'
  };
  if (GATE_BADGE_DOWNLOADS) {
    const s = getState();
    if (key === 'champion' && !s.champion) { alert('Unlock Champion by earning all three badges first.'); return; }
    if (['kids','teens','adults'].includes(key) && !s[key]) { alert('Complete this challenge to unlock the sticker.'); return; }
  }
  const candidates = fileMap[key];
  if (!candidates) return;
  try{
    const blob = await fetchFirstOk(candidates);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nameMap[key] || 'sticker.jpeg';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    window.open(candidates[0], '_blank');
  }
};
async function fetchFirstOk(candidates){
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache:'no-store' });
      if (res.ok) return await res.blob();
    }catch(e){}
  }
  throw new Error('Not found');
}

// --------------- Share ---------------
window.shareProgress = async function(){
  const s = getState();
  const earned = ['kids','teens','adults'].filter(k => s[k]).length;
  const text = s.champion ? 'I earned all EVE Detective badges and unlocked Champion!' : `I earned ${earned}/3 EVE Detective badges!`;
  const url = window.location.href;
  if (navigator.share) { try { await navigator.share({ title:'EVE Detective', text, url }); } catch(e){} }
  else { await navigator.clipboard.writeText(`${text} ${url}`); alert('Progress link copied to clipboard!'); }
};

// --------------- Kids Magnifier Game ---------------
const KidsGame = (() => {
  // Relative positions (0..1) per species. Adjust or add more.
  const speciesConfigs = {
    melanogaster: {
      region: 'piRNA cluster 3R‑TAS (telomere‑associated sequence)',
      eves: [
        { x:.15,y:.35,type:'intact'  },
        { x:.30,y:.55,type:'useful'  },
        { x:.55,y:.25,type:'broken'  },
        { x:.72,y:.60,type:'unique'  },
        { x:.85,y:.40,type:'intact'  }
      ]
    },
    simulans: {
      region: 'Heterochromatin region 2L‑proximal',
      eves: [
        { x:.12,y:.50,type:'broken'  },
        { x:.28,y:.30,type:'useful'  },
        { x:.43,y:.62,type:'intact'  },
        { x:.67,y:.40,type:'intact'  },
        { x:.82,y:.55,type:'unique'  }
      ]
    },
    yakuba: {
      region: 'Centromere‑adjacent 3L',
      eves: [
        { x:.18,y:.40,type:'useful'  },
        { x:.36,y:.58,type:'intact'  },
        { x:.50,y:.28,type:'broken'  },
        { x:.70,y:.45,type:'intact'  }
      ]
    },
    virilis: {
      region: 'Subtelomeric 2R',
      eves: [
        { x:.22,y:.42,type:'broken'  },
        { x:.41,y:.24,type:'intact'  },
        { x:.58,y:.55,type:'useful'  },
        { x:.80,y:.36,type:'unique'  }
      ]
    },
    pseudoananassae: {
      region: 'piRNA cluster 4R‑distal',
      eves: [
        { x:.10,y:.32,type:'intact'  },
        { x:.27,y:.57,type:'intact'  },
        { x:.49,y:.38,type:'useful'  },
        { x:.66,y:.22,type:'broken'  },
        { x:.84,y:.58,type:'unique'  }
      ]
    }
  };

  const colors = { intact:'#22c55e', useful:'#ef4444', broken:'#6b7280', unique:'#d4a017' };
  let overlay, bg, ctxO, ctxB, ring, wrap;
  let lensR = 80;
  let w = 0, h = 0;
  let current = 'melanogaster';
  let found = new Set();
  let revealAll = false;

  function init(){
    wrap = document.getElementById('kids-game');
    overlay = document.getElementById('eve-overlay');
    bg = document.getElementById('bg-canvas');
    ring = document.getElementById('lens-ring');
    if (!overlay || !bg || !wrap) return;

    ctxO = overlay.getContext('2d');
    ctxB = bg.getContext('2d');

    // Mouse move: move lens and update mask center
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', () => {
      setMask(-200,-200);
      ring.style.opacity = 0.0;
    });
    wrap.addEventListener('mouseenter', () => { ring.style.opacity = 0.9; });
    wrap.addEventListener('click', onClick);

    window.addEventListener('resize', resize);
    loadSpecies(current); // default
  }

  function resize(){
    if (!wrap) return;
    const bb = wrap.getBoundingClientRect();
    w = Math.floor(bb.width);
    h = Math.floor(bb.height);
    [overlay,bg].forEach(c => { c.width = w; c.height = h; });
    drawBg();
    drawOverlay();
  }

  function setMask(x,y){
    overlay.style.setProperty('--lx', x+'px');
    overlay.style.setProperty('--ly', y+'px');
    ring.style.left = x+'px';
    ring.style.top = y+'px';
  }

  function onMove(e){
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setMask(x,y);
  }

  function onClick(e){
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    // Hit test nearest EVE within radius
    const cfg = speciesConfigs[current];
    const hit = cfg.eves.findIndex(ev => {
      const ex = ev.x * w, ey = ev.y * h;
      const d = Math.hypot(ex - x, ey - y);
      return d <= 16; // hit radius
    });
    if (hit >= 0){
      const key = `${current}:${hit}`;
      if (!found.has(key)){
        found.add(key);
        toast(foundMessage(cfg.eves[hit].type));
        drawOverlay();
        updateCounts();
        // Complete Kids when all found
        const total = cfg.eves.length;
        const count = foundCountForCurrent();
        if (count >= total){
          const s = getState(); if (!s.kids){ s.kids = true; setState(s); }
        }
      }
    } else {
      toast('No EVE here—keep scanning!');
    }
  }

  function foundMessage(type){
    switch(type){
      case 'intact':  return 'Intact EVE: viral DNA is complete';
      case 'useful':  return 'Useful EVE: helps the fly resist viruses';
      case 'broken':  return 'Broken EVE: grey/black, cannot do anything';
      case 'unique':  return 'Unique EVE: a special/rare insertion';
      default: return 'EVE found!';
    }
  }

  function drawBg(){
    // Soft grid already via CSS. Optionally draw faint DNA glyphs:
    ctxB.clearRect(0,0,w,h);
    ctxB.fillStyle = 'rgba(10,26,47,0.06)';
    ctxB.font = '700 12px Inter, system-ui';
    const letters = ['A','C','G','T'];
    for (let y=24; y<h; y+=28){
      let row = '';
      for (let i=0; i<Math.ceil(w/14); i++){
        row += letters[(i + Math.floor(y)) % 4];
      }
      ctxB.fillText(row, 12, y);
    }
  }

  function drawOverlay(){
    const cfg = speciesConfigs[current];
    ctxO.clearRect(0,0,w,h);
    if (!cfg) return;

    cfg.eves.forEach((ev, i) => {
      const ex = ev.x * w, ey = ev.y * h;
      const key = `${current}:${i}`;
      const isFound = found.has(key);
      // Draw EVE marker
      ctxO.beginPath();
      ctxO.arc(ex, ey, 12, 0, Math.PI*2);
      ctxO.closePath();
      ctxO.fillStyle = colors[ev.type] || '#0ea5e9';
      ctxO.globalAlpha = isFound ? 1.0 : 0.9;
      ctxO.fill();

      // Outline to help visibility under lens
      ctxO.lineWidth = 2;
      ctxO.strokeStyle = 'rgba(0,0,0,0.15)';
      ctxO.stroke();

      // If found, draw a tick mark
      if (isFound){
        ctxO.strokeStyle = 'rgba(10,26,47,0.8)';
        ctxO.lineWidth = 2;
        ctxO.beginPath();
        ctxO.moveTo(ex-6, ey);
        ctxO.lineTo(ex-1, ey+5);
        ctxO.lineTo(ex+7, ey-6);
        ctxO.stroke();
      }
    });

    // If revealAll is on, disable mask so markers are visible
    if (revealAll){
      overlay.style.maskImage = 'none';
      overlay.style.webkitMaskImage = 'none';
    } else {
      overlay.style.maskImage = '';
      overlay.style.webkitMaskImage = '';
    }
  }

  function updateCounts(){
    const cfg = speciesConfigs[current];
    const total = cfg.eves.length;
    const count = foundCountForCurrent();
    const f = document.getElementById('kids-found');
    const t = document.getElementById('kids-total');
    if (f) f.textContent = `Found: ${count}`;
    if (t) t.textContent = `of ${total} EVEs`;
  }

  function foundCountForCurrent(){
    let c = 0;
    const cfg = speciesConfigs[current];
    cfg.eves.forEach((_,i) => { if (found.has(`${current}:${i}`)) c++; });
    return c;
  }

  function giveHint(){
    const cfg = speciesConfigs[current];
    // Pick first not-found EVE and briefly expand lens + pulse ring over it
    const idx = cfg.eves.findIndex((_,i)=>!found.has(`${current}:${i}`));
    if (idx === -1) { toast('All EVEs found!'); return; }
    const ev = cfg.eves[idx];
    const x = ev.x * w, y = ev.y * h;
    // Move lens there
    setMask(x,y);
    // Pulse ring
    ring.style.transition = 'transform .15s ease, box-shadow .3s ease';
    ring.style.transform = 'translate(-50%,-50%) scale(1.1)';
    ring.style.boxShadow = '0 0 0 6px rgba(212,160,23,.25) inset, 0 10px 24px rgba(2,6,23,.1)';
    setTimeout(()=>{
      ring.style.transform = 'translate(-50%,-50%) scale(1.0)';
      ring.style.boxShadow = '0 0 0 4px rgba(14,138,104,.12) inset, 0 10px 24px rgba(2,6,23,.08)';
    }, 600);
  }

  function reset(){
    // Clear found for current species only
    const keys = Array.from(found);
    keys.forEach(k => { if (k.startsWith(current+':')) found.delete(k); });
    drawOverlay();
    updateCounts();
  }

  function loadSpecies(name){
    current = name in speciesConfigs ? name : 'melanogaster';
    const el = document.getElementById('species-select');
    if (el && el.value !== current) el.value = current;
    const reg = document.getElementById('kids-region');
    if (reg) reg.textContent = 'Genomic Region: ' + speciesConfigs[current].region;
    resize();
    updateCounts();
  }

  function toggleReveal(on){
    revealAll = !!on;
    drawOverlay();
  }

  // public API
  return { init, resize, giveHint, reset, loadSpecies, toggleReveal };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Only init if the Kids panel exists
  if (document.getElementById('kids-game')) {
    KidsGame.init();
  }
});
