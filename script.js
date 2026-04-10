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

// LocalStorage achievements
const STATE_KEY = 'eveDetectiveProgress';
function getState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || { kids:false, teens:false, adults:false }; }
  catch { return { kids:false, teens:false, adults:false }; }
}
function setState(s){ localStorage.setItem(STATE_KEY, JSON.stringify(s)); renderProgress(); }
function renderProgress(){
  const s = getState();
  const total = ['kids','teens','adults'].filter(k => s[k]).length;
  const pct = (total/3)*100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.querySelectorAll('.badge').forEach(b => {
    const key = b.getAttribute('data-badge');
    b.style.opacity = s[key] ? 1 : 0.7;
  });
}
renderProgress();

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

// Adults challenge (simplified)
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
  el.style.color = ok ? '#bbf7d0' : '#fca5a5';
}
function complete(key){
  const s = getState();
  if (!s[key]) { s[key] = true; setState(s); }
}

// Badge download (simple canvas PNG)
window.downloadBadge = function(key){
  const map = {
    kids: { label:'DNA Rookie', color:'#60a5fa' },
    teens:{ label:'Genome Scout', color:'#ffd166' },
    adults:{ label:'EVE Detective', color:'#22c55e' }
  };
  const {label,color} = map[key] || map.kids;
  const c = document.createElement('canvas');
  c.width = 600; c.height = 300;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,600,300);
  grad.addColorStop(0, '#0a2740'); grad.addColorStop(1, '#0e8a68');
  ctx.fillStyle = grad; ctx.fillRect(0,0,600,300);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(120,150,60,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px "Playfair Display"';
  ctx.fillText(label, 220, 150);
  ctx.font = '16px Inter';
  ctx.fillText('EVE Detective', 220, 180);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `${key}-badge.png`;
  a.click();
};

// Share API
window.shareProgress = async function(){
  const s = getState();
  const earned = ['kids','teens','adults'].filter(k => s[k]).length;
  const text = `I earned ${earned}/3 EVE Detective badges!`;
  const url = window.location.href;
  if (navigator.share) {
    try { await navigator.share({ title:'EVE Detective', text, url }); }
    catch(e){}
  } else {
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert('Progress link copied to clipboard!');
  }
};
