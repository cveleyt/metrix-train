/* MetriX Train: private usage counter and after-workout notes. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* Counts live only on this phone (mx.usage, not synced). Feedback notes sync like other data. */
const FEATURES = [
  ['Log a set', 'a:done'], ['Rest timer', 'a:tstart'], ['Exercise notes', 'a:note-save'], ['Warm-up sets', 'a:warm-add'], ['Skip exercise', 'a:skip-do'], ['Add exercise', 'a:add-do'],
  ['Fuel, add food', 'a:food-add'], ['Saved foods used', 'a:food-pick'], ['AI food estimate', 'a:food-ai'], ['Barcode scan', 'a:scan-open'], ['Search food database', 'a:food-db'],
  ['Supplements ticked', 'a:supp-tick'], ['Check-in', 'a:ci-save'], ['Sleep times', 'a:sl-in'], ['Steps or weight log', 'a:daily-in'],
  ['Trends', 'v:trends'], ['Weekly review AI note', 'a:rv-ai'], ['Body measurements', 'a:meas-in'], ['Progress photos', 'a:ph-pick'], ['CSV export', 'a:csv'], ['Backup export', 'a:export'], ['Sync now', 'a:sync-now']
];
const USAGE_KEY = () => K('mx.usage');
let feedback = LSget('mx.feedback', []);
const saveFeedback = () => LSset('mx.feedback', feedback);
function track(key) {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY()) || '{}'), d = todayKey();
    (u[d] = u[d] || {})[key] = (u[d][key] || 0) + 1;
    const cut = kAdd(d, -30); Object.keys(u).forEach(k => { if (k < cut) delete u[k]; });
    localStorage.setItem(USAGE_KEY(), JSON.stringify(u));
  } catch (e) { /* storage full or blocked, skip */ }
}
function usageTotals() {
  const t = {};
  try { const u = JSON.parse(localStorage.getItem(USAGE_KEY()) || '{}'); Object.values(u).forEach(day => Object.keys(day).forEach(k => { t[k] = (t[k] || 0) + day[k]; })); } catch (e) {}
  return t;
}
function usageText() {
  const t = usageTotals(), used = FEATURES.filter(f => t[f[1]]).sort((a, b) => t[b[1]] - t[a[1]]), never = FEATURES.filter(f => !t[f[1]]);
  return 'MetriX Train ' + VERSION + ' usage, last 30 days\n' + used.map(f => f[0] + ': ' + t[f[1]]).join('\n') + '\nNever used: ' + (never.map(f => f[0]).join(', ') || 'none')
    + '\n\nNotes:\n' + (feedback.slice(-30).map(n => new Date(n.t).toISOString().slice(0, 10) + (n.tags && n.tags.length ? ' [' + n.tags.join(', ') + '] ' : ' ') + (n.note || '')).join('\n') || 'none');
}
views.usage = () => {
  const t = usageTotals(), used = FEATURES.filter(f => t[f[1]]).sort((a, b) => t[b[1]] - t[a[1]]), never = FEATURES.filter(f => !t[f[1]]), mx = used.length ? t[used[0][1]] : 1;
  return `<div class="row" style="justify-content:space-between"><button class="m" data-go="me">&lsaquo; ME</button><span class="m">USAGE</span></div><h2 style="margin:12px 0 4px;font-size:46px">Usage</h2>
  <p>Counts what you tap, last 30 days. Stored only on this phone. It decides what we keep, change or cut in the rebuild.</p>
  <div class="card" style="padding:4px 16px 8px"><div class="m" style="padding:10px 0 2px">MOST USED</div>${used.length ? used.map(f => `<div style="padding:9px 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span style="font-size:14px">${f[0]}</span><span class="n" style="font-size:18px">${t[f[1]]}</span></div><div style="height:6px;border-radius:3px;background:var(--line);margin-top:6px"><div style="height:6px;border-radius:3px;width:${Math.max(3, Math.round(t[f[1]] / mx * 100))}%;background:var(--acc)"></div></div></div>`).join('') : '<p>Nothing counted yet. Use the app and come back.</p>'}</div>
  <div class="card"><span class="m">NEVER USED</span><p style="margin:8px 0 0">${never.length ? never.map(f => f[0]).join(', ') : 'You have used everything.'}</p></div>
  <div class="card"><span class="m">YOUR NOTES (${feedback.length})</span>${feedback.length ? feedback.slice(-8).reverse().map(n => `<div style="padding:8px 0;border-top:1px solid var(--line)"><small>${new Date(n.t).toLocaleDateString()} ${(n.tags || []).join(', ')}</small><div style="font-size:14px">${esc(n.note || '')}</div></div>`).join('') : '<p>No notes yet. They are asked for after each workout.</p>'}</div>
  <div class="row"><button class="btn ghost" data-act="usage-share">Share list</button><button class="btn ghost" data-act="usage-reset">Reset counts</button></div>`;
};
const FB_TAGS = ['Bug', 'Too slow', 'Confusing', 'Missing', 'Idea'];
function feedbackCard(sid) {
  if (feedback.some(n => n.sid === sid)) return '<div class="card"><span class="m">NOTE SAVED</span><p style="margin:6px 0 0">Thanks. It is in Me, Usage.</p></div>';
  return `<div class="cut" id="fb-box"><span class="m">ANYTHING ANNOY YOU TODAY?</span><textarea id="fb-text" class="big" style="margin-top:10px" placeholder="The timer button covered the set count..."></textarea>
  <div class="mchips" role="group" aria-label="Note type" style="margin-top:8px">${FB_TAGS.map(g => `<button type="button" class="ntg" data-act="nt-tag" aria-pressed="false">${g}</button>`).join('')}</div>
  <div class="row"><button class="btn" data-act="fb-save" data-sid="${sid}">Save note</button><button class="btn ghost" data-act="fb-skip">Nothing today</button></div></div>`;
}
function usageAct(a, el) {
  switch (a) {
    case 'fb-save': {
      const note = ($('#fb-text').value || '').trim(), tags = [...document.querySelectorAll('#fb-box .ntg.on')].map(b => b.textContent);
      if (!note && !tags.length) { toast('Write a line or pick a tag'); return true; }
      feedback.push({ t: Date.now(), sid: el.dataset.sid, note, tags, ver: VERSION }); saveFeedback(); toast('Note saved'); render(); return true;
    }
    case 'fb-skip': { const b = $('#fb-box'); if (b) b.remove(); return true; }
    case 'usage-share': {
      const txt = usageText();
      (async () => { try { if (navigator.share) { await navigator.share({ text: txt, title: 'MetriX Train usage' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } try { await navigator.clipboard.writeText(txt); toast('Copied. Paste it to Claude'); } catch (e) { toast('Could not share'); } })();
      return true;
    }
    case 'usage-reset': if (confirm('Reset all usage counts on this phone? Your notes stay.')) { try { localStorage.removeItem(USAGE_KEY()); } catch (e) {} render(); } return true;
  }
  return false;
}
