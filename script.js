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

// Progress state in localStorage (adds Champion when 3/3 complete)
const STATE_KEY = 'eveDetectiveProgress';
function getState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || { kids:false, teens:false, adults:false, champion:false }; }
  catch { return { kids:false, teens:false, adults:false, champion:false }; }
}
function setState(s){
  // If all three complete, unlock champion
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
    if (key === 'champion') {
      b.classList.toggle('badge-champion', true);
      b.classList.toggle('unlocked', s.champion);
      b.style.opacity = s.champion ? 1 : 0.7;
    } else {
      b.style.opacity = s[key] ? 1 : 0.9;
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

// Download the actual sticker image files
window.downloadBadge = function(key){
  // If you kept spaces in filenames, use this map:
  const map = {
    kids:      { file: 'assets/Beginner-sticker.jpeg',     name: 'Kids — EVE Detective.jpeg' },
    teens:     { file: 'assets/Intermediate-sticker.jpeg', name: 'Teens — EVE Evolution Expert.jpeg' },
    adults:    { file: 'assets/Advanced-sticker.jpeg',     name: 'Adults — Viral Immunity Expert.jpeg' },
    champion:  { file: 'assets/Champion-sticker.jpeg',     name: 'Champion — EVE Champion.jpeg' }
  };
  const item = map[key];
  if (!item) return;
  const a = document.createElement('a');
  a.href = item.file;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
  // Medal circle
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(160,225,90,0,Math.PI*2); ctx.fill();
  // Text
  ctx.fillStyle = '#0a1a2f';
  ctx.font = 'bold 40px "Playfair Display"';
  ctx.fillText(label, 320, 230);
  ctx.font = '20px Inter';
  ctx.fillText('EVE Detective — Royal Society Summer Science', 320, 270);
  // Download
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = label.replace(/\s+/g,'-').toLowerCase() + '.png';
  a.click();
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
