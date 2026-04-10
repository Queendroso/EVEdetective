// Simple nav toggle
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open');
  });
}

// Tabs for challenges
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
    panels.forEach(p => p.classList.remove('is-active'));
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.getAttribute('aria-controls')).classList.add('is-active');
  });
});

// Gate downloads? Set to true if stickers should only download after earning the badge
const GATE_BADGE_DOWNLOADS = true;

// Progress state in localStorage (adds Champion when 3/3 complete)
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
  if (!s[key]) { s[key] = true; setState(s); }
}

// Kids challenge
window.runKids = function(){
  const val = (document.getElementById('kids-seq').value || '').toUpperCase().trim();
  if (!val) return setFeedback('kids-feedback', 'Try typing a few letters like AATCG!', false);
  const valid = val.replace(/[^ACGT]/g,'');
  const invalid = val.length - valid.length;
  const gc = valid.length ? Math.round(((valid.match(/[GC]/g)||[]).length/valid.length)*100) : 0;
  let msg = `Valid DNA letters: ${valid.length}. GC content: ${gc}%.`;
  if (invalid > 0) msg += ` (Removed ${invalid} invalid characters)`;
  setFeedback('kids-feedback', msg, true);
  if (valid.length >= 6) complete('kids');
};

// Teens challenge
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
    complete('teens');
  } else {
    setFeedback('teens-feedback','No in-frame stop found after ATG. Try another sequence.', false);
  }
};

// Adults challenge (checkboxes)
window.runAdults = function(){
  const hasLTR = document.getElementById('adults-found-ltr').checked;
  const hasORF = document.getElementById('adults-found-orf').checked;
  if (hasLTR && hasORF) {
    setFeedback('adults-feedback','Great! You identified key EVE-like signatures.', true);
    complete('adults');
  } else {
    setFeedback('adults-feedback','Hint: Look for paired [LTR] labels and an ORF (ATG..TAA/TAG/TGA).', false);
  }
};

function setFeedback(id, msg, ok){
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.color = ok ? '#0f766e' : '#b91c1c';
}

// Helper: try to fetch a file from a list of candidate paths
async function fetchFirstOk(candidates){
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache:'no-store' });
      if (res.ok) return await res.blob();
    }catch(e){}
  }
  throw new Error('No sticker file found');
}

// Download the actual sticker image files (supports hyphen-or-space filenames)
window.downloadBadge = async function(key){
  // If you renamed with hyphens, keep first path; the second is a fallback with space
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

  // Optional gating
  if (GATE_BADGE_DOWNLOADS) {
    const s = getState();
    if (key === 'champion' && !s.champion) {
      alert('Unlock Champion by earning all three badges first.');
      return;
    }
    if (['kids','teens','adults'].includes(key) && !s[key]) {
      alert('Complete this challenge to unlock the sticker.');
      return;
    }
  }

  const candidates = fileMap[key];
  if (!candidates) return;

  try{
    const blob = await fetchFirstOk(candidates);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nameMap[key] || 'sticker.jpeg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    // Fallback: open first candidate in a new tab so the user can save manually
    window.open(candidates[0], '_blank');
  }
};

// Share API
window.shareProgress = async function(){
  const s = getState();
  const earned = ['kids','teens','adults'].filter(k => s[k]).length;
  const text = s.champion
    ? 'I earned all EVE Detective badges and unlocked Champion!'
    : `I earned ${earned}/3 EVE Detective badges!`;
  const url = window.location.href;
  if (navigator.share) {
    try { await navigator.share({ title:'EVE Detective', text, url }); }
    catch(e){}
  } else {
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert('Progress link copied to clipboard!');
  }
};
