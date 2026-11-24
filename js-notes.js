/* MetriX Train: Exercise notes, skip and add exercise, floating timer drag. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- v2.8: notes, skip, add ---------- */
function notesView() {
  const q = (hist.nq || '').toLowerCase();
  return `<div class="card"><label style="margin:0">Search notes<input id="nt-q" data-act="nq-in" type="search" value="${esc(hist.nq || '')}" placeholder="Exercise, tag or word" autocomplete="off"></label></div><div id="nt-list">${notesList(q)}</div>`;
}
function notesList(q) {
  const cur = Object.keys(notes).filter(n => !q || (n + ' ' + (notes[n].machine || '') + ' ' + (notes[n].note || '') + ' ' + (notes[n].tags || []).join(' ')).toLowerCase().includes(q)).sort();
  const log = notelog.slice().reverse().filter(n => !q || (n.name + ' ' + (n.note || '') + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));
  const tg = a => (a || []).map(g => `<span class="t" style="color:${g === 'Pain' ? 'var(--rest)' : 'var(--dim)'}">${esc(g.toUpperCase())}</span>`).join(' ');
  return `<div class="card" style="padding:6px 16px"><div class="m" style="padding:10px 0 2px">CURRENT, PER EXERCISE</div>${cur.length ? cur.map(n => `<div class="li" style="align-items:flex-start"><span><b>${esc(n)}</b><br><small>${notes[n].machine ? 'Machine: ' + esc(notes[n].machine) + '. ' : ''}${esc(notes[n].note || '')}</small></span><span>${tg(notes[n].tags)}</span></div>`).join('') : '<p style="margin:8px 0">No notes yet. Tap the dot on an exercise during a workout.</p>'}</div>
  <div class="card" style="padding:6px 16px"><div class="m" style="padding:10px 0 2px">HISTORY</div>${log.length ? log.slice(0, 60).map(n => `<div class="li" style="align-items:flex-start"><span><b>${esc(n.name)}</b> <small>${fd(n.t)}</small><br><small>${esc(n.note || '')}</small></span><span>${tg(n.tags)}</span></div>`).join('') : '<p style="margin:8px 0">Nothing yet.</p>'}</div>`;
}
function noteModal(i) {
  const x = cur().exercises[i], nt = notes[x.name] || {};
  showModal(`<div class="m" style="color:var(--acct)">NOTE</div><div class="n" style="font-size:30px;margin:6px 0 10px;text-transform:uppercase">${esc(x.name)}</div>
  <div class="mchips" role="group" aria-label="Quick tags">${NTAGS.map(g => `<button type="button" class="ntg${(nt.tags || []).includes(g) ? ' on' : ''}" data-act="nt-tag" aria-pressed="${(nt.tags || []).includes(g)}">${g}</button>`).join('')}</div>
  <label>Machine settings<input id="nt-machine" type="text" autocomplete="off" value="${esc(nt.machine || '')}" placeholder="Seat 4, pad 2, handle low"></label>
  <label>Note for next time<textarea id="nt-text" class="big" placeholder="Left shoulder tight, try a slower negative">${esc(nt.note || '')}</textarea></label>
  <div class="mrow"><button class="btn ghost" data-act="mdl-close">Cancel</button><button class="btn" data-act="note-save" data-i="${i}">Save</button></div>${notes[x.name] ? `<button class="mini" data-act="note-clear" data-i="${i}" style="margin-top:10px">Clear note</button>` : ''}`);
}
function skipModal(i) {
  const x = cur().exercises[i];
  showModal(`<div class="m" style="color:var(--acct)">SKIP</div><div class="n" style="font-size:30px;margin:6px 0 10px;text-transform:uppercase">${esc(x.name)}</div><p style="margin:0 0 10px">Why? It is not counted as missed.</p>
  ${['Equipment busy', 'Pain', 'No time', 'Other'].map(w => `<button class="btn ghost" data-act="skip-do" data-i="${i}" data-why="${w}" style="margin-bottom:8px">${w}</button>`).join('')}<button class="mini" data-act="mdl-close">Cancel</button>`);
}
function addModal() {
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))].sort();
  showModal(`<div class="m" style="color:var(--acct)">ADD EXERCISE</div><div class="n" style="font-size:30px;margin:6px 0 10px;text-transform:uppercase">For today</div>
  <label>Exercise<input id="ad-name" list="adlist" placeholder="Type or pick a name" autocomplete="off"></label><datalist id="adlist">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  <label>Sets<input id="ad-sets" type="number" inputmode="numeric" min="1" max="10" value="3"></label>
  <label class="chk" style="margin-bottom:10px"><input type="checkbox" id="ad-nw"> Reps only, no weight</label>
  <div class="mrow"><button class="btn ghost" data-act="mdl-close">Cancel</button><button class="btn" data-act="add-do">Add</button></div>`);
}
(function () {
  let d = null;
  document.addEventListener('pointerdown', e => { const f = e.target.closest && e.target.closest('.tfab'); if (f) d = { x: e.clientX, y: e.clientY, moved: false, f }; });
  document.addEventListener('pointermove', e => {
    if (!d) return; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.moved = true; const fx = Math.min(0.92, Math.max(0.08, e.clientX / innerWidth)), fy = Math.min(0.9, Math.max(0.1, e.clientY / innerHeight));
    d.f.style.left = fx * 100 + '%'; d.f.style.top = fy * 100 + '%'; d.pos = { fx, fy };
  });
  document.addEventListener('pointerup', () => { if (d && d.moved) { fabMoved = true; setTimeout(() => { fabMoved = false; }, 350); try { localStorage.setItem('mx.fab', JSON.stringify(d.pos)); } catch (e) {} } d = null; });
})();

