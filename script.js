// ---------------- Nav toggle ----------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open');
  });
}

// ---------------- Tabs ----------------
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
    panels.forEach(p => p.classList.remove('is-active'));
    tab.setAttribute('aria-selected', 'true');
    const id = tab.getAttribute('aria-controls');
    document.getElementById(id).classList.add('is-active');
    if (id === 'kids') setTimeout(() => KidsGame.resize(), 50);
    if (id === 'teens') setTimeout(() => { IntermediateGame.render(); Timer.start('teens', 60); }, 50);
    if (id === 'adults') setTimeout(() => { AdvancedGame.init(); Timer.start('adults', 60); }, 50);
  });
});

// ---------------- Progress / badges ----------------
const GATE_BADGE_DOWNLOADS = true;
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

function toast(msg, parent){
  const w = parent || document.body;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 1800);
}

// ---------- Confetti + Claps ----------
function confettiBurst(){
  let c = document.getElementById('confetti-canvas');
  if (!c){ c = document.createElement('canvas'); c.id='confetti-canvas'; document.body.appendChild(c); }
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = c.width = innerWidth*dpr, H = c.height = innerHeight*dpr;
  c.style.width = innerWidth+'px'; c.style.height = innerHeight+'px';
  const N = 150, parts=[];
  for(let i=0;i<N;i++){
    parts.push({
      x: Math.random()*W, y: -Math.random()*H*0.2, vy: 2+Math.random()*4, vx: (Math.random()-0.5)*2,
      w: 6*dpr, h: 10*dpr, r: Math.random()*Math.PI,
      col: ['#60a5fa','#34d399','#f472b6','#facc15','#a78bfa'][Math.floor(Math.random()*5)]
    });
  }
  let t=0; const T=90;
  function step(){
    ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.r+=0.1;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    });
    if (++t<T) requestAnimationFrame(step); else c.remove();
  }
  step();
}
function claps(){
  let e=document.querySelector('.claps'); if(!e){ e=document.createElement('div'); e.className='claps'; e.textContent='👏👏👏'; document.body.appendChild(e); }
  e.style.opacity=1; setTimeout(()=>{ e.style.opacity=0; }, 1200);
}

// ---------------- Sticker downloads ----------------
window.downloadBadge = async function(key){
  const fileMap = {
    kids:     ['assets/Beginner-sticker.jpeg',     'assets/Beginner sticker.jpeg'],
    teens:    ['assets/Intermediate-sticker.jpeg', 'assets/Intermediate sticker.jpeg'],
    adults:   ['assets/Advanced-sticker.jpeg',     'assets/Advanced sticker.jpeg'],
    champion: ['assets/Champion-sticker.jpeg',     'assets/Champion sticker.jpeg']
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
    if (['kids','teens','adults'].includes(key) && !s[key]) { alert('Complete this level to unlock the sticker.'); return; }
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

// ---------------- Share ----------------
window.shareProgress = async function(){
  const s = getState();
  const earned = ['kids','teens','adults'].filter(k => s[k]).length;
  const text = s.champion ? 'I earned all EVE Detective badges and unlocked Champion!' : `I earned ${earned}/3 EVE Detective badges!`;
  const url = window.location.href;
  if (navigator.share) { try { await navigator.share({ title:'EVE Detective', text, url }); } catch(e){} }
  else { await navigator.clipboard.writeText(`${text} ${url}`); alert('Progress link copied to clipboard!'); }
};

// ---------------- Timer ----------------
const Timer = (() => {
  let timers = {};
  function ensureBar(panelId){
    const panel = document.getElementById(panelId);
    if (!panel) return null;
    let wrap = panel.querySelector('.timer-wrap');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.className='timer-wrap';
      wrap.innerHTML = '<div class="timer-bar"><div class="timer-fill" style="width:100%"></div></div><strong class="tleft">60s</strong>';
      panel.insertBefore(wrap, panel.firstElementChild.nextSibling);
    }
    return wrap;
  }
  function start(panelId, seconds){
    const wrap = ensureBar(panelId);
    if (!wrap) return;
    stop(panelId);
    const fill = wrap.querySelector('.timer-fill');
    const tleft = wrap.querySelector('.tleft');
    let t = seconds;
    fill.style.width = '100%'; tleft.textContent = t+'s';
    timers[panelId] = setInterval(()=>{
      t = Math.max(0, t-1);
      const pct = (t/seconds)*100;
      fill.style.width = pct+'%';
      tleft.textContent = t+'s';
      if (t===0) stop(panelId);
    }, 1000);
  }
  function stop(panelId){
    if (timers[panelId]){ clearInterval(timers[panelId]); delete timers[panelId]; }
  }
  function timeLeft(panelId){
    const wrap = document.getElementById(panelId)?.querySelector('.tleft');
    if (!wrap) return 0;
    const v = parseInt(wrap.textContent||'0',10);
    return isNaN(v)?0:v;
  }
  return { start, stop, timeLeft };
})();

// ---------------- Beginner (Kids) — Magnifier Game ----------------
const KidsGame = (() => {
  const speciesConfigs = {
    melanogaster: { region: 'piRNA cluster 3R‑TAS (telomere‑associated sequence)',
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

  let overlay, bg, ctxO, ctxB, ring, wrap;
  let w=0,h=0; let current='melanogaster'; let found=new Set(); let revealAll=false;

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
    const cfg=speciesConfigs[current];
    const hit=cfg.eves.findIndex((ev,i)=>Math.hypot(ev.x*w-x, ev.y*h-y)<=16);
    if (hit>=0){ const key=`${current}:${hit}`; if (!found.has(key)){
      found.add(key); toast(foundMessage(cfg.eves[hit].type), wrap); drawOverlay(); updateCounts();
      if (foundCountForCurrent()>=cfg.eves.length){
        const s=getState(); if(!s.kids){ s.kids=true; setState(s); toast('Beginner badge unlocked!', wrap); confettiBurst(); claps(); }
      }
    }} else { toast('No EVE here—keep scanning!', wrap); }
  }
  function foundMessage(type){ return type==='intact'?'Intact EVE: viral DNA is complete'
    : type==='useful'?'Useful EVE: helps the fly resist viruses'
    : type==='broken'?'Broken EVE: grey/black, cannot do anything'
    : type==='unique'?'Unique EVE: special/rare insertion' : 'EVE found!'; }
  function drawBg(){ ctxB.clearRect(0,0,w,h); ctxB.fillStyle='rgba(10,26,47,0.06)'; ctxB.font='700 12px Inter, system-ui';
    const letters=['A','C','G','T']; for(let Y=24;Y<h;Y+=28){ let row=''; for(let i=0;i<Math.ceil(w/14);i++){ row+=letters[(i+Math.floor(Y))%4]; } ctxB.fillText(row,12,Y); } }
  function drawOverlay(){ const cfg=speciesConfigs[current]; ctxO.clearRect(0,0,w,h); if(!cfg)return;
    cfg.eves.forEach((ev,i)=>{ const ex=ev.x*w, ey=ev.y*h, key=`${current}:${i}`, isFound=found.has(key);
      ctxO.beginPath(); ctxO.arc(ex,ey,12,0,Math.PI*2); ctxO.closePath();
      ctxO.fillStyle={intact:'#22c55e',useful:'#ef4444',broken:'#6b7280',unique:'#d4a017'}[ev.type]||'#0ea5e9';
      ctxO.globalAlpha=isFound?1:0.9; ctxO.fill(); ctxO.lineWidth=2; ctxO.strokeStyle='rgba(0,0,0,0.15)'; ctxO.stroke();
      if(isFound){ ctxO.strokeStyle='rgba(10,26,47,0.8)'; ctxO.lineWidth=2; ctxO.beginPath(); ctxO.moveTo(ex-6,ey); ctxO.lineTo(ex-1,ey+5); ctxO.lineTo(ex+7,ey-6); ctxO.stroke(); }
    });
    const overlayEl=document.getElementById('eve-overlay');
    if (revealAll){ overlayEl.style.maskImage='none'; overlayEl.style.webkitMaskImage='none'; } else { overlayEl.style.maskImage=''; overlayEl.style.webkitMaskImage=''; }
  }
  function updateCounts(){ const cfg=speciesConfigs[current], f=document.getElementById('kids-found'), t=document.getElementById('kids-total');
    if (f) f.textContent=`Found: ${foundCountForCurrent()}`; if (t) t.textContent=`of ${cfg.eves.length} EVEs`; }
  function foundCountForCurrent(){ let c=0; const cfg=speciesConfigs[current]; cfg.eves.forEach((_,i)=>{ if(found.has(`${current}:${i}`)) c++; }); return c; }
  function giveHint(){ const cfg=speciesConfigs[current]; const idx=cfg.eves.findIndex((_,i)=>!found.has(`${current}:${i}`));
    if(idx===-1){ toast('All EVEs found!', wrap); return; }
    const ev=cfg.eves[idx]; const x=ev.x*w, y=ev.y*h; setMask(x,y);
    ring.style.transition='transform .15s ease, box-shadow .3s ease';
    ring.style.transform='translate(-50%,-50%) scale(1.1)'; ring.style.boxShadow='0 0 0 6px rgba(212,160,23,.25) inset, 0 10px 24px rgba(2,6,23,.1)';
    setTimeout(()=>{ ring.style.transform='translate(-50%,-50%) scale(1.0)'; ring.style.boxShadow='0 0 0 4px rgba(14,138,104,.12) inset, 0 10px 24px rgba(2,6,23,.08)'; }, 600);
  }
  function reset(){ Array.from(found).forEach(k=>{ if(k.startsWith(current+':')) found.delete(k); }); drawOverlay(); updateCounts(); }
  function loadSpecies(name){
    current=name;
    const sel=document.getElementById('species-select'); if (sel && sel.value!==name) sel.value=name;
    const reg=document.getElementById('kids-region');
    const regs = { melanogaster:'piRNA cluster 3R‑TAS (telomere‑associated sequence)', simulans:'Heterochromatin region 2L‑proximal', yakuba:'Centromere‑adjacent 3L', virilis:'Subtelomeric 2R', pseudoananassae:'piRNA cluster 4R‑distal' };
    if (reg) reg.textContent='Genomic Region: '+(regs[name] || '');
    resize(); updateCounts();
  }
  function toggleReveal(on){ revealAll=!!on; drawOverlay(); }
  return { init, resize, giveHint, reset, loadSpecies, toggleReveal };
})();
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('kids-game')) KidsGame.init(); });

// ---------------- Intermediate (Teens) — Phylogeny Builder ----------------
const IntermediateGame = (() => {
  const S = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL_FULL = { melanogaster:'melanogaster', simulans:'simulans', yakuba:'yakuba', virilis:'virilis', pseudoananassae:'pseudoananassae' };
  const LABEL_SHORT= { melanogaster:'D. mel.', simulans:'D. sim.', yakuba:'D. yak.', virilis:'D. vir.', pseudoananassae:'D. pse.' };
  let useShort = true;

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

  const GOLD_CLADE_STRS = new Set([
    JSON.stringify(['melanogaster','simulans'].sort()),
    JSON.stringify(['virilis','pseudoananassae'].sort()),
    JSON.stringify(['melanogaster','simulans','yakuba'].sort())
  ]);

  let clusters = [];
  let steps = [];
  let treeMap = new Map();

  function init(){
    reset();
    render();
  }

  function reset(){
    clusters = S.map(x=>[x]);
    steps = [];
    treeMap = new Map();
    S.forEach(sp => { treeMap.set(sp, sp); });
    renderMatrix();
    renderPairs();
    renderTree();
    ensureUIControls();
  }

  function ensureUIControls(){
    const head = document.querySelector('#teens .matrix-head');
    if (head && !head.querySelector('.lbl-toggle')){
      const wrap = document.createElement('label');
      wrap.className='lbl-toggle';
      wrap.style.marginLeft='auto';
      wrap.innerHTML = `<input type="checkbox" ${useShort?'checked':''} /> Short labels`;
      head.appendChild(wrap);
      wrap.querySelector('input').addEventListener('change', e => { useShort = e.target.checked; render(); });
    }
  }

  function render(){ renderMatrix(); renderPairs(); renderTree(); }

  function renderMatrix(){
    const el = document.getElementById('matrix'); if (!el) return;
    const shared = pairwiseSharedCounts();
    const species = S.slice();
    const maxShared = Math.max(1, ...Object.values(shared));
    let html = '<table><thead><tr><th></th>';
    species.forEach(sp => html += `<th>${(useShort?LABEL_SHORT:LABEL_FULL)[sp]}</th>`);
    html += '</tr></thead><tbody>';
    species.forEach(rsp => {
      html += `<tr><th>${(useShort?LABEL_SHORT:LABEL_FULL)[rsp]}</th>`;
      species.forEach(csp => {
        const val = rsp===csp ? countForSpecies(rsp) : (shared[keyPair(rsp,csp)]||0);
        const cls = heatClass(val, rsp===csp, maxShared);
        html += `<td class="heat ${cls}" title="${val}">${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }
  function toggleMatrix(){
    const el = document.getElementById('matrix');
    if (!el) return;
    const hidden = el.hasAttribute('hidden');
    if (hidden) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
  }
  function showHints(){
    alert([
      'Hints:',
      '• Darker cells = more shared EVEs (closer relatives).',
      '• Broken EVEs are older (shared deeper). Unique EVEs are recent (tips).',
      '• Merge the most similar pair first, then repeat.'
    ].join('\n'));
  }

  function renderPairs(){
    const el = document.getElementById('pair-list'); if (!el) return;
    const candidates = clusterCandidates();
    if (candidates.length===0){
      el.innerHTML = '<div class="muted">All merges complete. Click “Check my tree”.</div>';
      return;
    }
    let html = '';
    candidates.forEach(c => {
      const label = `{ ${c.a.map(s=> (useShort?LABEL_SHORT:LABEL_FULL)[s]).join(', ')} } + { ${c.b.map(s=> (useShort?LABEL_SHORT:LABEL_FULL)[s]).join(', ')} }`;
      html += `<div class="pair"><span>${label}</span><span class="score">Shared: ${c.score}</span><button class="btn small" onclick="IntermediateGame.merge('${c.a.join('|')}','${c.b.join('|')}')">Merge</button></div>`;
    });
    el.innerHTML = html;
  }

  function renderTree(){
    const el = document.getElementById('your-tree');
    const stepsEl = document.getElementById('build-steps');
    const svgBox = document.getElementById('tree-svg');
    if (!el || !stepsEl || !svgBox) return;

    const keys = clusters.map(c => c.slice().sort().join('|'));
    const currentTrees = keys.map(k => treeMap.get(k) || `[${k}]`);
    if (currentTrees.length === 1) {
      el.textContent = currentTrees[0] + ';';
      drawTreeSVG(currentTrees[0]);
    } else {
      el.textContent = currentTrees.map(t => t).join('  |  ');
      svgBox.innerHTML = '';
    }

    stepsEl.textContent = steps.length
      ? `Merges: ${steps.map(s => `{${s[0].map(x=> (useShort?LABEL_SHORT:LABEL_FULL)[x]).join(', ')}}+{${s[1].map(x=> (useShort?LABEL_SHORT:LABEL_FULL)[x]).join(', ')}}`).join(' → ')}`
      : 'No merges yet';
  }

  function merge(aStr, bStr){
    const a = aStr.split('|'), b = bStr.split('|');
    const idxA = clusters.findIndex(c => sameSet(c,a));
    const idxB = clusters.findIndex(c => sameSet(c,b));
    if (idxA<0 || idxB<0 || idxA===idxB) return;

    const merged = [...clusters[idxA], ...clusters[idxB]].sort();

    const keyA = clusters[idxA].slice().sort().join('|');
    const keyB = clusters[idxB].slice().sort().join('|');
    const newKey = merged.join('|');
    const left = treeMap.get(keyA) || `(${clusters[idxA].join(',')})`;
    const right = treeMap.get(keyB) || `(${clusters[idxB].join(',')})`;
    treeMap.delete(keyA); treeMap.delete(keyB);
    treeMap.set(newKey, `(${left},${right})`);

    steps.push([clusters[idxA].slice(), clusters[idxB].slice()]);
    clusters = clusters.filter((_,i)=>i!==idxA && i!==idxB);
    clusters.push(merged);

    renderPairs();
    renderTree();
  }

  function checkTree(){
    if (clusters.length!==1){
      toast('Finish merging until one tree remains.');
      return;
    }
    const rootKey = clusters[0].slice().sort().join('|');
    const newick = treeMap.get(rootKey);
    const leafSets = extractInternalClades(newick);

    let correct = 0;
    GOLD_CLADE_STRS.forEach(k => { if (leafSets.has(k)) correct++; });

    if (correct === GOLD_CLADE_STRS.size){
      toast('Excellent! Your tree matches the EVE evidence.');
      const s = getState(); if (!s.teens){ s.teens = true; setState(s); toast('Intermediate badge unlocked!'); }
      if (Timer.timeLeft('teens')>0){ confettiBurst(); claps(); }
      Timer.stop('teens');
    } else {
      const missing = [];
      GOLD_CLADE_STRS.forEach(k => { if (!leafSets.has(k)) missing.push(JSON.parse(k).map(x=> (useShort?LABEL_SHORT:LABEL_FULL)[x]).join(' + ')); });
      alert(`Not quite. Re-check these clades:\n• ${missing.join('\n• ')}\nTip: Start with the darkest matrix cells.`);
    }
  }

  // Helpers
  function pairwiseSharedCounts(){
    const out = {};
    for (let i=0;i<S.length;i++){
      for (let j=i+1;j<S.length;j++){
        const a=S[i], b=S[j];
        let count = 0;
        for (const k in EVE_DB){
          const p = EVE_DB[k].present;
          if (p.has(a) && p.has(b)) count++;
        }
        out[keyPair(a,b)] = count;
      }
    }
    return out;
  }
  function countForSpecies(sp){ let c=0; for (const k in EVE_DB){ if (EVE_DB[k].present.has(sp)) c++; } return c; }
  function keyPair(a,b){ return [a,b].sort().join('|'); }
  function heatClass(val, diag, max){
    if (diag) return 'med';
    const r = val / max;
    if (r >= 0.95) return 'max';
    if (r >= 0.65) return 'high';
    if (r >= 0.35) return 'med';
    return 'low';
  }
  function sameSet(a,b){ return a.slice().sort().join('|')===b.slice().sort().join('|'); }

  function clusterCandidates(){
    const cands = [];
    for (let i=0;i<clusters.length;i++){
      for (let j=i+1;j<clusters.length;j++){
        const a = clusters[i], b = clusters[j];
        const score = sharedAcrossClusters(a,b);
        cands.push({ a:a.slice(), b:b.slice(), score });
      }
    }
    cands.sort((x,y)=> y.score - x.score || x.a.join(',').localeCompare(y.a.join(',')));
    return cands.slice(0, 8);
  }
  function sharedAcrossClusters(a,b){
    let c = 0;
    for (const k in EVE_DB){
      const p = EVE_DB[k].present;
      const hitA = a.some(sp => p.has(sp));
      const hitB = b.some(sp => p.has(sp));
      if (hitA && hitB) c++;
    }
    return c;
  }

  function extractInternalClades(nw){
    const tokens = (nw||'').replace(/\s+/g,'');
    let i = 0;
    function parse(){
      if (tokens[i] === '('){
        i++; const children = [];
        while (i < tokens.length && tokens[i] !== ')'){ children.push(parse()); if (tokens[i] === ',') i++; }
        i++; return children;
      } else {
        let name = ''; while (i < tokens.length && !',)'.includes(tokens[i])) { name += tokens[i++]; }
        return name;
      }
    }
    if (!tokens) return new Set();
    const tree = parse();
    const leafSets = new Set();
    function collect(node){
      if (typeof node === 'string') return [node];
      const leaves = node.flatMap(collect);
      if (leaves.length > 1 && leaves.length < S.length){
        leafSets.add(JSON.stringify(leaves.slice().sort()));
      }
      return leaves;
    }
    collect(tree);
    return leafSets;
  }

  function drawTreeSVG(nw){
    const box = document.getElementById('tree-svg'); if (!box) return;
    if (!nw){ box.innerHTML = ''; return; }
    // Parse Newick
    const tokens = nw.replace(/\s+/g,''); let i=0;
    function parse(){
      if (tokens[i] === '('){
        i++; const kids=[]; while (i<tokens.length && tokens[i]!==')'){ kids.push(parse()); if (tokens[i]===',') i++; }
        i++; return kids;
      } else { let name=''; while (i<tokens.length && !',)'.includes(tokens[i])) name+=tokens[i++]; return name; }
    }
    const tree = parse();
    // Leaves order
    const leaves = []; (function collect(n){ if (typeof n==='string') leaves.push(n); else n.forEach(collect); })(tree);
    const depth = (function maxD(n){ return typeof n==='string' ? 0 : 1 + Math.max(...n.map(maxD)); })(tree);

    // Layout compact
    const margin = {l:8, r:8, t:8, b:8};
    const xStep = 80; const yStep = 30;
    const width = margin.l + margin.r + (depth * xStep);
    const height = margin.t + margin.b + (leaves.length-1) * yStep;

    const pos = new Map();
    leaves.forEach((leaf, idx) => pos.set(leaf, {x: margin.l + depth*xStep, y: margin.t + idx*yStep}));
    (function layout(node, d){
      if (typeof node === 'string'){ const p = pos.get(node); p.x = margin.l + d*xStep; return p; }
      const kids = node.map(k => layout(k, d+1));
      const y = (kids[0].y + kids[kids.length-1].y)/2;
      const p = {x: margin.l + d*xStep, y}; pos.set(node, p); return p;
    })(tree, 0);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width); svg.setAttribute('height', height);

    // Edges
    (function drawEdges(node){
      const p = pos.get(node) || pos.get(JSON.stringify(node));
      if (typeof node !== 'string'){
        node.forEach(child => {
          const c = pos.get(child) || pos.get(JSON.stringify(child));
          svg.appendChild(line(p.x, p.y, c.x, p.y, 'edge'));      // horizontal
          svg.appendChild(line(c.x, p.y, c.x, c.y, 'edge-vert'));  // vertical
          drawEdges(child);
        });
      }
    })(tree);
    function line(x1,y1,x2,y2, cls){
      const el = document.createElementNS(svgNS, 'line');
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', x2); el.setAttribute('y2', y2);
      el.setAttribute('class', cls);
      return el;
    }
    // Leaf labels (short/long)
    leaves.forEach(leaf => {
      const p = pos.get(leaf);
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', p.x + 6);
      text.setAttribute('y', p.y + 4);
      text.textContent = (useShort?LABEL_SHORT:LABEL_FULL)[leaf];
      svg.appendChild(text);
    });

    box.innerHTML = ''; box.appendChild(svg);
  }

  // Expose
  return {
    init, render, reset, merge, toggleMatrix, checkTree, showHints
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pair-list')) IntermediateGame.init();
});

// ---------------- Advanced (Adults) — Immunity game (visual cards) ----------------
const AdvancedGame = (() => {
  const SPECIES = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL = { melanogaster:'D. melanogaster', simulans:'D. simulans', yakuba:'D. yakuba', virilis:'D. virilis', pseudoananassae:'D. pseudoananassae' };

  // Portfolios (type: retro|dna; state: useful|intact|silent|broken)
  const CATALOG = {
    melanogaster: [
      { id:'EVE-A', type:'retro', state:'useful', family:'RV1', note:'piRNAs active' },
      { id:'EVE-D', type:'retro', state:'silent', family:'RV1', note:'may re-activate' },
      { id:'EVE-C', type:'retro', state:'broken', family:'RV0', note:'degraded' },
      { id:'EVE-X', type:'dna',   state:'useful', family:'DV2', note:'DNA virus' }
    ],
    simulans: [
      { id:'EVE-A′', type:'retro', state:'intact', family:'RV1', note:'intact copy' },
      { id:'EVE-Z',  type:'dna',   state:'useful', family:'DV1', note:'DNA virus' }
    ],
    yakuba: [
      { id:'EVE-Y1', type:'retro', state:'broken', family:'RV1', note:'fragment' }
    ],
    virilis: [
      { id:'EVE-D1', type:'dna',   state:'useful', family:'DV1', note:'DNA virus' }
    ],
    pseudoananassae: [
      { id:'EVE-P',  type:'retro', state:'useful', family:'RV1a', note:'close to RV1' }
    ]
  };

  const STEP1_CORRECT = 'EVE-A';                                    // exact RV1 in melanogaster
  const STEP2_RESIST = 'pseudoananassae', STEP2_VULN = 'yakuba';    // RV1a lineage
  const STEP3_SET = new Set(['melanogaster','simulans','pseudoananassae']); // RV1b slight mutation

  let passed = { s1:false, s2:false, s3:false };

  function init(){
    renderStep1();
    renderStep2();
    renderStep3();
  }

  // ---------- Chips ----------
  function chip(type, text){
    const cls = type==='retro' ? 'dot-retro' : type==='dna' ? 'dot-dna' : type;
    return `<span class="card-chip"><span class="dot ${cls}"></span>${text}</span>`;
  }

  // ---------- Step 1 ----------
  function renderStep1(){
    const box = document.getElementById('adv-eves-mel'); if (!box) return;
    const list = CATALOG.melanogaster;
    box.innerHTML = list.map(e => {
      const type = chip(e.type, e.type);
      const state = chip(e.state, e.state);
      const fam = chip('fam', `family ${e.family}`);
      return `
        <label class="eve-card">
          <input type="radio" name="step1-choice" value="${e.id}" />
          <div>
            <div><strong>${e.id}</strong></div>
            <div class="card-chips">${type}${state}${fam}</div>
            <div class="card-note">${e.note}</div>
          </div>
        </label>
      `;
    }).join('');
  }
  function hint(step){
    if (step===1){
      alert('Pick an active retro EVE that targets RV1 exactly (piRNAs active).');
    } else if (step===2){
      alert('Resistant = a species with a useful/intact retro EVE near RV1a; Vulnerable = only broken retro or only DNA-virus EVEs.');
    } else if (step===3){
      alert('Small mutations may still be blocked by active/intact retro EVEs against RV1/RV1a.');
    }
  }
  function checkStep1(){
    const val = (document.querySelector('input[name="step1-choice"]:checked')||{}).value;
    const out = document.getElementById('adv-feedback-1');
    if (!val){ out.textContent='Select an EVE above.'; out.style.color='#b91c1c'; return; }
    if (val === STEP1_CORRECT){
      out.textContent='Correct: EVE-A is a retro EVE with active piRNAs against RV1.';
      out.style.color='#0f766e';
      passed.s1 = true; maybeUnlock();
    } else {
      out.textContent='Not quite. Choose an active retro EVE matching RV1 (not DNA, not broken).';
      out.style.color='#b91c1c';
    }
  }

  // ---------- Step 2 (cards with portfolios visible) ----------
  function renderStep2(){
    const resistBox = document.getElementById('adv-resist-radios');
    const vulnBox = document.getElementById('adv-vuln-radios');
    if (!resistBox || !vulnBox) return;
    resistBox.className = 'species-cards'; vulnBox.className = 'species-cards';

    resistBox.innerHTML = SPECIES.map(s => speciesCardHTML(s, 'resist')).join('');
    vulnBox.innerHTML   = SPECIES.map(s => speciesCardHTML(s, 'vuln')).join('');

    resistBox.querySelectorAll('.species-card').forEach(el => {
      el.addEventListener('click', () => selectCard(resistBox, el));
    });
    vulnBox.querySelectorAll('.species-card').forEach(el => {
      el.addEventListener('click', () => selectCard(vulnBox, el));
    });
  }
  function speciesCardHTML(s, group){
    const eves = (CATALOG[s]||[]);
    const chips = eves.map(e => `${chip(e.type, e.type)}${chip(e.state, e.state)}${chip('fam', e.family)}`).join('');
    const notes = eves.map(e => e.id).join(', ') || 'No EVEs';
    return `
      <div class="species-card" data-group="${group}" data-species="${s}">
        <h5>${LABEL[s]}</h5>
        <div class="card-chips">${chips}</div>
        <div class="card-note">${notes}</div>
      </div>
    `;
  }
  function selectCard(container, el){
    container.querySelectorAll('.species-card').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
  }
  function checkStep2(){
    const resist = document.querySelector('#adv-resist-radios .species-card.selected')?.dataset.species;
    const vuln   = document.querySelector('#adv-vuln-radios .species-card.selected')?.dataset.species;
    const out = document.getElementById('adv-feedback-2');
    if (!resist || !vuln){ out.textContent='Select a species in each column.'; out.style.color='#b91c1c'; return; }
    const ok = (resist===STEP2_RESIST) && (vuln===STEP2_VULN);
    if (ok){
      out.textContent = `${LABEL[resist]} is most resistant (useful retro EVE to RV1a). ${LABEL[vuln]} is most vulnerable (only broken retro / only DNA EVEs).`;
      out.style.color='#0f766e';
      passed.s2 = true; maybeUnlock();
    } else {
      out.textContent = 'Try again: look for a useful/intact retro EVE near RV1a (resistant) and species lacking such retro EVEs (vulnerable).';
      out.style.color='#b91c1c';
    }
  }

  // ---------- Step 3 (multi-select species cards) ----------
  function renderStep3(){
    const c = document.getElementById('adv-mutation-checks'); if (!c) return;
    c.className = 'species-cards';
    c.innerHTML = SPECIES.map(s => speciesCardHTML(s, 'multi')).join('');
    c.querySelectorAll('.species-card').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('selected'));
    });
  }
  function checkStep3(){
    const chosen = Array.from(document.querySelectorAll('#adv-mutation-checks .species-card.selected')).map(x=>x.dataset.species);
    const out = document.getElementById('adv-feedback-3');
    if (chosen.length===0){ out.textContent='Select at least one species.'; out.style.color='#b91c1c'; return; }
    const set = new Set(chosen);
    let allOk = true;
    for (const s of STEP3_SET){ if (!set.has(s)) allOk = false; }
    for (const s of set){ if (!STEP3_SET.has(s)) allOk = false; }

    if (allOk){
      out.textContent = 'Correct: D. mel., D. sim., and D. pse. likely retain protection against RV1b.';
      out.style.color='#0f766e';
      passed.s3 = true; maybeUnlock();
    } else {
      out.textContent = 'Close—active/intact retro EVEs targeting RV1/RV1a may still recognize RV1b; broken or DNA-virus EVEs won’t.';
      out.style.color='#b91c1c';
    }
  }

  function maybeUnlock(){
    if (passed.s1 && passed.s2 && passed.s3){
      const s = getState();
      if (!s.adults){ s.adults = true; setState(s); toast('Advanced badge unlocked!'); if (Timer.timeLeft('adults')>0){ confettiBurst(); claps(); } }
      Timer.stop('adults');
    }
  }

  function reset(){
    passed = { s1:false, s2:false, s3:false };
    renderStep1(); renderStep2(); renderStep3();
    ['adv-feedback-1','adv-feedback-2','adv-feedback-3'].forEach(id => { const el=document.getElementById(id); if (el){ el.textContent=''; } });
  }

  return {
    init, hint, checkStep1, checkStep2, checkStep3, reset
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adv-eves-mel')) AdvancedGame.init();
});
