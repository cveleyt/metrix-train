/* MetriX Train: In-app program editor and overload hint. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* The edited program is saved in settings.prog ({weeks, days}) and applied over the bundled one at startup. Exercise ids stay stable so history keeps matching. */
const cloneJ = o => JSON.parse(JSON.stringify(o));
let pdraft = null, pdi = 0;
const PROG_NOW = () => ({ weeks: P.weeks, days: cloneJ(DAYS) });
function applyProg(src) {
  P.weeks = src.weeks;
  DAYS.length = 0; src.days.forEach(d => DAYS.push(cloneJ(d)));
  Object.keys(slot).forEach(k => delete slot[k]);
  DAYS.forEach(d => d.exercises.forEach((e, n) => { e.id = e.id || (d.key + '-' + n); slot[e.id] = e; }));
}
function progWarn() {
  const bad = [];
  pdraft.days.forEach(d => { if (!d.name.trim()) bad.push('A day has no name'); if (!d.exercises.length) bad.push(d.name + ' has no exercises'); d.exercises.forEach(e => { if (!e.name.trim()) bad.push('An exercise in ' + d.name + ' has no name'); if (!(e.sets >= 1)) bad.push(e.name + ' needs at least 1 set'); if (e.hi && e.lo > e.hi) bad.push(e.name + ': low reps is above high reps'); }); });
  if (!(pdraft.weeks >= 1)) bad.push('Weeks must be at least 1');
  return bad;
}
views.prog = () => {
  if (!pdraft) pdraft = PROG_NOW();
  const tot = d => d.exercises.reduce((a, e) => a + e.sets, 0);
  return `<div class="row" style="justify-content:space-between"><button class="m" data-act="prog-cancel">&lsaquo; ME</button><span class="m">PROGRAM</span></div><h2 style="margin:12px 0 4px;font-size:46px">Program</h2>
  <p>Edit your days and exercises. Changes apply to future workouts. Past workouts are never rewritten.</p>
  <div class="card"><div class="row" style="justify-content:space-between"><span><b>${esc(P.name || 'My program')}</b><br><small>${pdraft.days.length} days</small></span>${settings.prog ? '<span class="t" style="color:var(--acct)">EDITED</span>' : '<span class="t" style="color:var(--dim)">ORIGINAL</span>'}</div></div>
  <div class="dl"><b></b><span class="m">DAYS</span><b></b></div><div class="card" style="padding:2px 16px">${pdraft.days.map((d, i) => `<div class="li" style="padding:12px 0"><button data-act="pd-open" data-i="${i}" style="text-align:left;flex:1" aria-label="Edit ${esc(d.name)}"><b>${esc(d.name)}</b><br><small>${d.exercises.length} exercises, ${tot(d)} sets</small></button><span style="display:flex;gap:6px"><button class="mini" data-act="pd-up" data-i="${i}" aria-label="Move ${esc(d.name)} up">&#9650;</button><button class="mini" data-act="pd-down" data-i="${i}" aria-label="Move ${esc(d.name)} down">&#9660;</button></span></div>`).join('')}</div>
  <div class="row"><button class="btn ghost" data-act="pd-add">+ Add day</button></div>
  <div class="ins" style="grid-template-columns:1fr 1fr"><label>Weeks in the program<input data-act="pw-in" type="number" inputmode="numeric" min="1" max="52" value="${pdraft.weeks}"></label></div>
  <div class="row"><button class="btn" data-act="prog-save">Save program</button><button class="btn ghost" data-act="prog-reset">Reset to original</button></div>`;
};
views.progday = p => {
  if (!pdraft) pdraft = PROG_NOW();
  const d = pdraft.days[pdi]; if (!d) return '<div class="card"><h3>Day not found</h3><button class="btn" data-act="prog-back">Back</button></div>';
  const names = [...new Set(DAYS.flatMap(x => x.exercises.map(e => e.name)))].sort();
  const f = (e, i, k, l, v) => `<label style="font-size:9px">${l}<input data-act="pe-in" data-i="${i}" data-f="${k}" type="number" inputmode="numeric" min="0" value="${v}"></label>`;
  return `<div class="row" style="justify-content:space-between"><button class="m" data-act="prog-back">&lsaquo; PROGRAM</button><span class="m">EDIT DAY</span></div><h2 style="margin:12px 0 8px;font-size:46px">${esc(d.name)}</h2>
  <label>Day name<input data-act="pd-name" type="text" autocomplete="off" value="${esc(d.name)}"></label>
  <div class="card" style="padding:2px 16px">${d.exercises.map((e, i) => `<div style="padding:12px 0;${i ? 'border-top:1px solid var(--line)' : ''}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(e.name)}</b><span style="display:flex;gap:6px"><button class="mini" data-act="pe-up" data-i="${i}" aria-label="Move ${esc(e.name)} up">&#9650;</button><button class="mini" data-act="pe-down" data-i="${i}" aria-label="Move ${esc(e.name)} down">&#9660;</button><button class="mini" data-act="pe-del" data-i="${i}" aria-label="Remove ${esc(e.name)}">&#10005;</button></span></div>
  <div class="ins" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:8px">${f(e, i, 'sets', 'SETS', e.sets)}${f(e, i, 'lo', 'REPS LOW', e.lo)}${f(e, i, 'hi', 'REPS HIGH', e.hi)}${f(e, i, 'rest', 'REST SEC', (e.rest || [90])[0])}</div></div>`).join('') || '<p style="padding:12px 0">No exercises yet.</p>'}</div>
  <label>Add exercise<input id="pe-new" list="pexlist" placeholder="Type or pick a name" autocomplete="off"></label><datalist id="pexlist">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  <div class="row"><button class="btn ghost" data-act="pe-add">+ Add exercise</button></div>
  <p><small>Notes and machine settings stay attached to the exercise name. Removing a day or exercise never deletes your history.</small></p>
  <div class="row"><button class="btn" data-act="prog-back">Done</button></div>`;
};
/* overload hint: grey suggested weight under a set that is below it */
function ghostHint(sg, t, i, j) {
  if (!sg || !sg.apply || t.done || t.w >= sg.apply) return '';
  return `<button class="ghostw" data-act="ghost-use" data-i="${i}" data-j="${j}" data-w="${sg.apply}" aria-label="Use suggested weight ${r1(dw(sg.apply))} ${UW()} for set ${j + 1}">try ${r1(dw(sg.apply))} ${UW()}</button>`;
}
function progAct(a, el) {
  const i = +el.dataset.i, d = pdraft && pdraft.days[pdi];
  const mv = (arr, i, n) => { const k = i + n; if (k < 0 || k >= arr.length) return false; [arr[i], arr[k]] = [arr[k], arr[i]]; return true; };
  switch (a) {
    case 'prog-open': pdraft = PROG_NOW(); go('prog'); return true;
    case 'prog-cancel': pdraft = null; go('me'); return true;
    case 'prog-back': go(view.name === 'progday' ? 'prog' : 'me'); return true;
    case 'pd-open': pdi = i; go('progday'); return true;
    case 'pd-up': if (mv(pdraft.days, i, -1)) render(); return true;
    case 'pd-down': if (mv(pdraft.days, i, 1)) render(); return true;
    case 'pd-add': pdraft.days.push({ key: 'd' + uid(), name: 'New day', blurb: '', exercises: [] }); pdi = pdraft.days.length - 1; go('progday'); return true;
    case 'pw-in': pdraft.weeks = Math.max(1, Math.min(52, parseInt(el.value) || P.weeks)); return true;
    case 'pd-name': d.name = el.value.trim() || d.name; return true;
    case 'pe-in': { const e = d.exercises[i], f = el.dataset.f, v = parseInt(el.value); if (isNaN(v) || v < 0) return true; if (f === 'rest') e.rest = [v, v + 30]; else e[f] = v; return true; }
    case 'pe-up': if (mv(d.exercises, i, -1)) render(); return true;
    case 'pe-down': if (mv(d.exercises, i, 1)) render(); return true;
    case 'pe-del': if (confirm('Remove ' + d.exercises[i].name + ' from ' + d.name + '? Your history stays.')) { d.exercises.splice(i, 1); render(); } return true;
    case 'pe-add': {
      const n = ($('#pe-new').value || '').trim(); if (!n) { toast('Type an exercise name'); return true; }
      const known = DAYS.flatMap(x => x.exercises).find(e => e.name.toLowerCase() === n.toLowerCase());
      d.exercises.push(known ? Object.assign(cloneJ(known), { id: 'x' + uid() }) : { name: n, sets: 3, lo: 8, hi: 12, rest: [90, 120], cue: '', id: 'x' + uid() });
      render(); return true;
    }
    case 'prog-save': {
      const bad = progWarn(); if (bad.length) { toast(bad[0]); return true; }
      settings.prog = cloneJ(pdraft); saveSettings(); applyProg(settings.prog); pdraft = null; toast('Program saved. Applies to your next workout'); go('me'); return true;
    }
    case 'prog-reset': if (confirm('Go back to the original program? Your history stays.')) { delete settings.prog; saveSettings(); applyProg(PROG_ORIG); pdraft = PROG_NOW(); render(); } return true;
    case 'wchip': { const c = cur(), x = c.exercises[i], t = x.sets[+el.dataset.j]; if (!t || t.done) return true; const ex = exOf(x);
      const nw = el.dataset.w != null ? parseFloat(el.dataset.w) : Math.max(0, rnd(fw(rd(dw(t.w || 0) + (el.dataset.d === '+' ? 1 : -1) * incD(ex)))));
      setW(c, i, +el.dataset.j, nw); persist(); render(); return true; }
    case 'rpick': { const t = cur().exercises[i].sets[+el.dataset.j]; if (t && !t.done) { t.r = +el.dataset.v; persist(); render(); } return true; }
    case 'ghost-use': { const t = cur().exercises[i].sets[+el.dataset.j]; if (t && !t.done) { t.w = parseFloat(el.dataset.w); persist(); render(); } return true; }
  }
  return false;
}
