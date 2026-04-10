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
    if (id === 'teens') setTimeout(() => IntermediateGame.render(), 50);
    if (id === 'adults') setTimeout(() => AdvancedGame.init(), 50);
  });
});

// ---------------- Progress / badges ----------------
const GATE_BADGE_DOWNLOADS = true; // set to false to allow sticker downloads anytime
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

// ---------------- Beginner (Kids) — Magnifier Game ----------------
const KidsGame = (() => {
  const colors = { intact:'#22c55e', useful:'#ef4444', broken:'#6b7280', unique:'#d4a017' };
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
        const s=getState(); if(!s.kids){ s.kids=true; setState(s); toast('Beginner badge unlocked!', wrap); }
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
    const ring=document.getElementById('lens-ring'); ring.style.transition='transform .15s ease, box-shadow .3s ease';
    ring.style.transform='translate(-50%,-50%) scale(1.1)'; ring.style.boxShadow='0 0 0 6px rgba(212,160,23,.25) inset, 0 10px 24px rgba(2,6,23,.1)';
    setTimeout(()=>{ ring.style.transform='translate(-50%,-50%) scale(1.0)'; ring.style.boxShadow='0 0 0 4px rgba(14,138,104,.12) inset, 0 10px 24px rgba(2,6,23,.08)'; }, 600);
  }
  function reset(){ Array.from(found).forEach(k=>{ if(k.startsWith(current+':')) found.delete(k); }); drawOverlay(); updateCounts(); }
  function loadSpecies(name){
    current=name;
    const sel=document.getElementById('species-select'); if (sel && sel.value!==name) sel.value=name;
    const reg=document.getElementById('kids-region');
    const regions = {
      melanogaster: speciesConfigs.melanogaster.region,
      simulans: speciesConfigs.simulans.region,
      yakuba: speciesConfigs.yakuba.region,
      virilis: speciesConfigs.virilis.region,
      pseudoananassae: speciesConfigs.pseudoananassae.region
    };
    if (reg) reg.textContent='Genomic Region: '+(regions[name] || '');
    resize(); updateCounts();
  }
  function toggleReveal(on){ revealAll=!!on; drawOverlay(); }
  return { init, resize, giveHint, reset, loadSpecies, toggleReveal };
})();
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('kids-game')) KidsGame.init(); });

// ---------------- Intermediate (Teens) — Phylogeny Builder ----------------
const IntermediateGame = (() => {
  const S = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL = {
    melanogaster:'melanogaster',
    simulans:'simulans',
    yakuba:'yakuba',
    virilis:'virilis',
    pseudoananassae:'pseudoananassae'
  };

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
    renderPairs();
    renderTree();
    const m = document.getElementById('matrix');
    if (m) m.setAttribute('hidden','');
  }

  function render(){
    renderMatrix();
    renderPairs();
    renderTree();
  }

  function renderMatrix(){
    const el = document.getElementById('matrix');
    if (!el) return;
    const shared = pairwiseSharedCounts();
    const species = S.slice();
    const maxShared = maxSharedValue(shared);

    let html = '<table><thead><tr><th></th>';
    species.forEach(sp => html += `<th>${LABEL[sp]}</th>`);
    html += '</tr></thead><tbody>';

    species.forEach(rsp => {
      html += `<tr><th>${LABEL[rsp]}</th>`;
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
      '• Darker matrix cells = more shared EVEs (closer relatives).',
      '• Broken EVEs are older (shared deeper in the tree).',
      '• Unique EVEs arose after splits (tips).',
      '• Start by merging the pair with the highest shared count.',
      '• Then merge the next-most similar clades.'
    ].join('\n'));
  }

  function renderPairs(){
    const el = document.getElementById('pair-list');
    if (!el) return;
    const candidates = clusterCandidates();
    if (candidates.length===0){
      el.innerHTML = '<div class="muted">All merges complete. Click “Check my tree”.</div>';
      return;
    }
    let html = '';
    candidates.forEach(c => {
      const label = `{ ${c.a.join(', ')} } + { ${c.b.join(', ')} }`;
      html += `<div class="pair"><span>${label}</span><span class="score">Shared: ${c.score}</span><button class="btn small" onclick="IntermediateGame.merge('${c.a.join('|')}','${c.b.join('|')}')">Merge</button></div>`;
    });
    el.innerHTML = html;
  }

  function renderTree(){
    const el = document.getElementById('your-tree');
    const stepsEl = document.getElementById('build-steps');
    if (!el || !stepsEl) return;

    const keys = clusters.map(c => c.slice().sort().join('|'));
    const currentTrees = keys.map(k => treeMap.get(k) || `[${k}]`);
    if (currentTrees.length === 1) {
      el.textContent = currentTrees[0] + ';';
      drawTreeSVG(currentTrees[0]); // pretty tree
    } else {
      el.textContent = currentTrees.map(t => t).join('  |  ');
      drawTreeSVG(null); // clear
    }

    stepsEl.textContent = steps.length
      ? `Merges: ${steps.map(s => `{${s[0].join(', ')}}+{${s[1].join(', ')}}`).join(' → ')}`
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
    } else {
      const missing = [];
      GOLD_CLADE_STRS.forEach(k => { if (!leafSets.has(k)) missing.push(JSON.parse(k).join(' + ')); });
      alert(`Not quite. Re-check these clades:\n• ${missing.join('\n• ')}\nTip: Start with the darkest matrix cells.`);
    }
  }

  // ---- Helpers for matrix ----
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
  function countForSpecies(sp){
    let c=0;
    for (const k in EVE_DB){
      if (EVE_DB[k].present.has(sp)) c++;
    }
    return c;
  }
  function keyPair(a,b){ return [a,b].sort().join('|'); }
  function maxSharedValue(shared){ let m = 0; Object.values(shared).forEach(v => { if (v>m) m=v; }); return Math.max(m, 1); }
  function heatClass(val, diag, max){
    if (diag) return 'med';
    const r = val / max;
    if (r >= 0.95) return 'max';
    if (r >= 0.65) return 'high';
    if (r >= 0.35) return 'med';
    return 'low';
  }
  function sameSet(a,b){ if (a.length !== b.length) return false; return a.slice().sort().join('|') === b.slice().sort().join('|'); }
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

  // ---- Newick parsing + SVG tree ----
  function extractInternalClades(nw){
    const tokens = (nw||'').replace(/\s+/g,'');
    let i = 0;
    function parse(){
      if (tokens[i] === '('){
        i++; const children = [];
        while (i < tokens.length && tokens[i] !== ')'){
          children.push(parse());
          if (tokens[i] === ',') i++;
        }
        i++; return children;
      } else {
        let name = '';
        while (i < tokens.length && !',)'.includes(tokens[i])) { name += tokens[i++]; }
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
    const box = document.getElementById('tree-svg');
    if (!box) return;
    if (!nw){ box.innerHTML = ''; return; }
    // Parse Newick into nested arrays
    const tokens = nw.replace(/\s+/g,'');
    let i=0;
    function parse(){
      if (tokens[i] === '('){
        i++; const kids=[];
        while (i<tokens.length && tokens[i]!==')'){ kids.push(parse()); if (tokens[i]===',') i++; }
        i++; return kids;
      } else {
        let name=''; while (i<tokens.length && !',)'.includes(tokens[i])) name+=tokens[i++];
        return name;
      }
    }
    const tree = parse();
    // Collect leaves (tip order)
    const leaves = [];
    function collectLeaves(n){ if (typeof n==='string'){ leaves.push(n); } else { n.forEach(collectLeaves); } }
    collectLeaves(tree);
    const depth = maxDepth(tree);
    const margin = {l:12, r:12, t:12, b:12};
    const xStep = 110, yStep = 34;
    const width = margin.l + margin.r + (depth * xStep);
    const height = margin.t + margin.b + (leaves.length-1) * yStep;

    // Layout: assign y to leaves, x by depth
    const pos = new Map();
    leaves.forEach((leaf, idx) => pos.set(leaf, {x: margin.l + depth*xStep, y: margin.t + idx*yStep}));
    function layout(node, d){
      if (typeof node === 'string'){
        const p = pos.get(node); p.x = margin.l + d*xStep; return p;
      } else {
        const kids = node.map(k => layout(k, d+1));
        const y = (kids[0].y + kids[kids.length-1].y)/2;
        const p = {x: margin.l + d*xStep, y};
        pos.set(node, p);
        return p;
      }
    }
    layout(tree, 0);

    // Render SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Edges
    function drawEdges(node){
      const p = pos.get(node) || pos.get(JSON.stringify(node));
      if (typeof node !== 'string'){
        node.forEach(child => {
          const c = pos.get(child) || pos.get(JSON.stringify(child));
          // elbow: horizontal from parent to child.x, then vertical to child.y
          const hline = line(p.x, p.y, c.x, p.y);
          const vline = line(c.x, p.y, c.x, c.y);
          svg.appendChild(hline); svg.appendChild(vline);
          drawEdges(child);
        });
      }
    }
    function line(x1,y1,x2,y2){
      const el = document.createElementNS(svgNS, 'line');
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', x2); el.setAttribute('y2', y2);
      el.setAttribute('stroke', '#94a3b8'); el.setAttribute('stroke-width', '2');
      return el;
    }
    drawEdges(tree);
    // Leaf labels
    leaves.forEach(leaf => {
      const p = pos.get(leaf);
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', p.x + 6);
      text.setAttribute('y', p.y + 4);
      text.setAttribute('fill', '#0a1a2f');
      text.setAttribute('font-size', '12');
      text.textContent = leaf;
      svg.appendChild(text);
    });

    box.innerHTML = '';
    box.appendChild(svg);

    function maxDepth(n){ return typeof n==='string' ? 0 : 1 + Math.max(...n.map(maxDepth)); }
  }

  return {
    init,
    render,
    reset,
    merge,
    toggleMatrix,
    checkTree,
    showHints
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pair-list')) IntermediateGame.init();
});

// ---------------- Advanced (Adults) — Immunity game ----------------
const AdvancedGame = (() => {
  const SPECIES = ['melanogaster','simulans','yakuba','virilis','pseudoananassae'];
  const LABEL = {
    melanogaster:'D. melanogaster',
    simulans:'D. simulans',
    yakuba:'D. yakuba',
    virilis:'D. virilis',
    pseudoananassae:'D. pseudoananassae'
  };

  // EVE portfolios per species
  // type: 'retro' | 'dna'; state: 'useful' (piRNA active), 'intact' (present, maybe silent), 'silent' (potential), 'broken' (no help)
  const CATALOG = {
    melanogaster: [
      { id:'EVE-A', type:'retro', state:'useful', family:'RV1', note:'piRNAs active (retrovirus RV1)' },
      { id:'EVE-C', type:'retro', state:'broken', family:'RV0', note:'old, degraded' },
      { id:'EVE-D', type:'retro', state:'silent', family:'RV1', note:'silent copy; could re-activate' },
      { id:'EVE-X', type:'dna',   state:'useful', family:'DV2', note:'DNA virus DV2' }
    ],
    simulans: [
      { id:'EVE-A′', type:'retro', state:'intact', family:'RV1', note:'intact retroviral copy' },
      { id:'EVE-Z',  type:'dna',   state:'useful', family:'DV1', note:'DNA virus DV1' }
    ],
    yakuba: [
      { id:'EVE-Y1', type:'retro', state:'broken', family:'RV1', note:'degraded retroviral fragment' }
    ],
    virilis: [
      { id:'EVE-D1', type:'dna',   state:'useful', family:'DV1', note:'DNA virus DV1' }
    ],
    pseudoananassae: [
      { id:'EVE-P',  type:'retro', state:'useful', family:'RV1a', note:'piRNAs active (close to RV1)' }
    ]
  };

  // Scenario answers
  // Step 1: exact match RV1 in melanogaster => EVE-A (retro, useful, RV1)
  const STEP1_CORRECT = 'EVE-A';
  // Step 2: new retrovirus RV1a spreading => most resistant pseudoananassae (EVE-P useful to RV1a); most vulnerable yakuba (only broken retro)
  const STEP2_RESIST = 'pseudoananassae';
  const STEP2_VULN   = 'yakuba';
  // Step 3: mutated variant RV1b => likely protection in species with retro useful/intact to RV1/RV1a: melanogaster (EVE-A), simulans (EVE-A′ maybe), pseudoananassae (EVE-P)
  const STEP3_SET = new Set(['melanogaster','simulans','pseudoananassae']);

  let passed = { s1:false, s2:false, s3:false };

  function init(){
    // Render step 1 EVE cards for mel
    renderMelEves();
    // Render step 2 radios
    renderStep2Radios();
    // Render step 3 checks
    renderStep3Checks();
    // Render portfolios (hidden by default)
    renderPortfolios();
  }

  function renderMelEves(){
    const box = document.getElementById('adv-eves-mel');
    if (!box) return;
    const list = CATALOG.melanogaster;
    box.innerHTML = list.map((e,idx) => eveCardHTML(e, 'step1', idx)).join('');
    // radio names per step
  }

  function eveCardHTML(e, group, idx){
    const typeDot = e.type==='retro' ? 'dot-retro' : 'dot-dna';
    const stateDot = {
      useful:'dot-useful',
      intact:'dot-intact',
      broken:'dot-broken',
      silent:'dot-silent'
    }[e.state] || 'dot-intact';

    return `
      <label class="eve-card">
        <input type="radio" name="${group}-choice" value="${e.id}" />
        <div>
          <div><strong>${e.id}</strong></div>
          <div class="eve-meta">
            <span class="eve-chip"><span class="dot ${typeDot}"></span>${e.type}</span>
            <span class="eve-chip"><span class="dot ${stateDot}"></span>${e.state}</span>
            <span class="eve-chip">family: ${e.family}</span>
          </div>
          <div class="eve-meta">${e.note}</div>
        </div>
      </label>
    `;
  }

  function renderStep2Radios(){
    const r = document.getElementById('adv-resist-radios');
    const v = document.getElementById('adv-vuln-radios');
    if (!r || !v) return;
    r.innerHTML = SPECIES.map(s => `
      <label><input type="radio" name="adv-resist" value="${s}" /> ${LABEL[s]}</label>
    `).join('');
    v.innerHTML = SPECIES.map(s => `
      <label><input type="radio" name="adv-vuln" value="${s}" /> ${LABEL[s]}</label>
    `).join('');
  }

  function renderStep3Checks(){
    const c = document.getElementById('adv-mutation-checks');
    if (!c) return;
    c.innerHTML = SPECIES.map(s => `
      <label><input type="checkbox" name="adv-muta" value="${s}" /> ${LABEL[s]}</label>
    `).join('');
  }

  function togglePortfolios(){
    const p = document.getElementById('adv-portfolios');
    if (!p) return;
    const hidden = p.hasAttribute('hidden');
    if (hidden) p.removeAttribute('hidden'); else p.setAttribute('hidden','');
  }

  function renderPortfolios(){
    const p = document.getElementById('adv-portfolios');
    if (!p) return;
    p.innerHTML = SPECIES.map(s => {
      const rows = (CATALOG[s]||[]).map(e => {
        return `• ${e.id} — ${e.type}, ${e.state}, family ${e.family}${e.note?` (${e.note})`:''}`;
      }).join('<br>');
      return `
        <div class="portfolio">
          <h5>${LABEL[s]}</h5>
          <div class="eve-meta">${rows || 'No EVEs recorded'}</div>
        </div>
      `;
    }).join('');
  }

  function hint(step){
    if (step===1){
      alert('Match type and sequence: a retrovirus identical to RV1 is best blocked by a retro EVE that is active (piRNAs) and targets RV1.');
    } else if (step===2){
      alert('Most resistant: species with a useful retro EVE matching the new lineage (RV1a). Most vulnerable: species with only broken retro EVEs or only DNA-virus EVEs.');
    } else if (step===3){
      alert('Small mutations may still be recognized by piRNAs if the EVE is close (RV1 or RV1a) and active/intact. Broken EVEs won’t help; DNA-virus EVEs won’t help against a retrovirus.');
    }
  }

  function checkStep1(){
    const val = (document.querySelector('input[name="step1-choice"]:checked')||{}).value;
    const out = document.getElementById('adv-feedback-1');
    if (!val){ out.textContent='Select an EVE above.'; out.style.color='#b91c1c'; return; }
    if (val === STEP1_CORRECT){
      out.textContent='Correct: EVE-A is a retro EVE with active piRNAs against RV1 (exact match).';
      out.style.color='#0f766e';
      passed.s1 = true; maybeUnlock();
    } else {
      out.textContent='Not quite. Choose an active retro EVE that matches RV1 (not DNA virus, not broken).';
      out.style.color='#b91c1c';
    }
  }

  function checkStep2(){
    const resist = (document.querySelector('input[name="adv-resist"]:checked')||{}).value;
    const vuln = (document.querySelector('input[name="adv-vuln"]:checked')||{}).value;
    const out = document.getElementById('adv-feedback-2');
    if (!resist || !vuln){ out.textContent='Pick one species for each: most resistant and most vulnerable.'; out.style.color='#b91c1c'; return; }
    const ok = (resist===STEP2_RESIST) && (vuln===STEP2_VULN);
    if (ok){
      out.textContent = `Correct: ${LABEL[resist]} is most resistant (useful retro EVE to RV1a). ${LABEL[vuln]} is most vulnerable (only broken retro or only DNA-virus EVEs).`;
      out.style.color='#0f766e';
      passed.s2 = true; maybeUnlock();
    } else {
      out.textContent = 'Not quite. Look for a species with a useful/intact retro EVE close to RV1a (resistant) and one with only broken retro or only DNA-virus EVEs (vulnerable).';
      out.style.color='#b91c1c';
    }
  }

  function checkStep3(){
    const chosen = Array.from(document.querySelectorAll('input[name="adv-muta"]:checked')).map(x=>x.value);
    const out = document.getElementById('adv-feedback-3');
    if (chosen.length===0){ out.textContent='Select at least one species.'; out.style.color='#b91c1c'; return; }
    const set = new Set(chosen);
    let allOk = true;
    // Must include all expected and no unexpected
    for (const s of STEP3_SET){ if (!set.has(s)) allOk = false; }
    for (const s of set){ if (!STEP3_SET.has(s)) allOk = false; }

    if (allOk){
      out.textContent = 'Correct: melanogaster (EVE-A), pseudoananassae (EVE-P), and simulans (EVE-A′) likely retain some protection against RV1b.';
      out.style.color='#0f766e';
      passed.s3 = true; maybeUnlock();
    } else {
      out.textContent = 'Close. Think: active/intact retro EVEs targeting RV1 or RV1a may still recognize RV1b. Broken EVEs or DNA-virus EVEs won’t help.';
      out.style.color='#b91c1c';
    }
  }

  function maybeUnlock(){
    if (passed.s1 && passed.s2 && passed.s3){
      const s = getState();
      if (!s.adults){ s.adults = true; setState(s); toast('Advanced badge unlocked!'); }
    }
  }

  function reset(){
    passed = { s1:false, s2:false, s3:false };
    // Clear selections and feedback
    document.querySelectorAll('input[name="step1-choice"]').forEach(x => x.checked=false);
    document.querySelectorAll('input[name="adv-resist"]').forEach(x => x.checked=false);
    document.querySelectorAll('input[name="adv-vuln"]').forEach(x => x.checked=false);
    document.querySelectorAll('input[name="adv-muta"]').forEach(x => x.checked=false);
    ['adv-feedback-1','adv-feedback-2','adv-feedback-3'].forEach(id => { const el=document.getElementById(id); if (el){ el.textContent=''; } });
  }

  return {
    init,
    hint,
    checkStep1,
    checkStep2,
    checkStep3,
    togglePortfolios,
    reset
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adv-eves-mel')) AdvancedGame.init();
});
