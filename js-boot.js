/* MetriX Train: Modals, what is new popup and startup. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- modal and what's new ---------- */
let lastFocus = null;
function showModal(html) {
  let m = $('#mdl'); if (!m) { m = document.createElement('div'); m.id = 'mdl'; document.body.appendChild(m); lastFocus = document.activeElement; }
  m.innerHTML = '<div class="mdl-bg"></div><div class="mdl-box" role="dialog" aria-modal="true" aria-label="Message">' + html + '</div>';
  const f = m.querySelector('button'); if (f) f.focus();
}
function closeModal() { stopScan(); const m = $('#mdl'); if (m) m.remove(); try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {} lastFocus = null; }
document.addEventListener('keydown', e => {
  const m = $('#mdl'); if (!m) return;
  if (e.key === 'Escape') { const ok = m.querySelector('[data-act="whatsnew-ok"]'); if (ok) ok.click(); else closeModal(); return; }
  if (e.key === 'Tab') { const f = [...m.querySelectorAll('button')]; if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); } else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); } }
});
function askAi(next) {
  showModal(`<div class="m" style="color:var(--acct)">AI AND YOUR DATA</div><div class="n" style="font-size:34px;margin:8px 0;text-transform:uppercase">Send to Google Gemini?</div><p>To estimate food or write the reason for your targets, the app sends what you typed (the food text, your height, weight, age, sex and goal, or your weekly averages) to Google's Gemini AI, using your own key. Google's terms and privacy policy apply, and free requests may be used by Google to improve its products. Nothing is sent without this OK. You can always log food by typing the numbers.</p><div class="mrow"><button class="btn ghost" data-act="mdl-close">No thanks</button><button class="btn" data-act="ai-agree" data-next="${next}">I agree</button></div>`);
}
const applyCal = () => document.body.classList.toggle('nocal', !!settings.hideCal);
const vnum = v => v.split('.').reduce((a, x) => a * 1000 + (+x || 0), 0);
function whatsNew() {
  if (!USER) return;
  let seen = null; try { seen = localStorage.getItem('mx.seenVer') || localStorage.getItem('mx.fromVer'); } catch (e) {}
  if (!seen) seen = vnum(VERSION) > vnum('2.4.0') ? '2.4.0' : VERSION;
  if (seen === VERSION) { try { localStorage.setItem('mx.seenVer', VERSION); } catch (e) {} return; }
  const list = CHANGELOG.filter(c => vnum(c.v) > vnum(seen));
  if (!list.length) { try { localStorage.setItem('mx.seenVer', VERSION); } catch (e) {} return; }
  showModal(`<div class="m" style="color:var(--acct)">UPDATED</div><div class="n" style="font-size:38px;margin:8px 0 2px;text-transform:uppercase">Version ${VERSION}</div><p style="margin:0 0 6px"><small>You came from ${esc(seen)}. Here is what is new.</small></p>
  ${list.map((c, i) => `<div style="padding:12px 0;border-top:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="n" style="font-size:24px">${c.v}</span><span class="t" style="color:${i === 0 ? 'var(--acct)' : 'var(--dim)'}">${i === 0 ? 'NEW' : 'BEFORE'}</span></div>${c.items.map(t => `<div style="font-size:13.5px;line-height:1.45;margin-top:6px">- ${esc(t)}</div>`).join('')}</div>`).join('')}
  <button class="btn" data-act="whatsnew-ok" style="margin-top:14px">Got it</button>`);
}

/* ---------- init ---------- */
(function init() {
  applyTheme(); applyCal();
  if (LSget('mx.schema', 0) < 1) LSset('mx.schema', 1);
  if (!settings.lastBackup) { settings.lastBackup = Date.now(); saveSettings(); }
  if (timer) {
    if (!timer.state) { timer.state = 'run'; timer.acc = 0; }
    const s = tel(timer);
    if (timer.state === 'run' && s > timer.max + 900) { timer = null; saveTimer(); } else { timer.f1 = timer.state === 'run' && s >= timer.min ? 1 : 0; timer.f2 = timer.state === 'run' && s >= timer.max ? 1 : 0; }
  }
  phLoad(); autoSupps('daily');
  let goScan = false;
  try {
    const q = new URLSearchParams(location.search).get('go'), M = { train: 'train', fuel: 'fuel', scan: 'fuel', weight: 'home' };
    if (q && M[q] && isAuthed() && !active) { view = { name: M[q], params: {} }; goScan = q === 'scan'; }
    if (q) history.replaceState(null, '', location.pathname);
  } catch (e) {}
  if (active) { open = firstIncomplete(active); view = { name: 'workout', params: {} }; }
  try { history.replaceState({ name: view.name, params: view.params }, ''); } catch (e) {}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(r => { persisted = r; }).catch(() => {});
  render();
  if (goScan) openScan();
  whatsNew();
  setInterval(tick, 500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
