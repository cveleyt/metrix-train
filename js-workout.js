/* MetriX Train: Workout screen: sets, exercise cards, rest timer popup, summary. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
function stepper(k, i, j, v) {
  const what = (k[0] === 'w' && k !== 'wr' ? 'weight' : 'reps') + (k === 'ww' || k === 'wr' ? ' of warm-up ' : ' of set ') + (j + 1);
  return `<div class="stp"><button data-act="${k}-" data-i="${i}" data-j="${j}" aria-label="Decrease ${what}">&minus;</button>
  <input data-act="${k}-in" data-i="${i}" data-j="${j}" type="number" inputmode="${k === 'w' || k === 'ww' ? 'decimal' : 'numeric'}" step="any" min="0" value="${v || ''}" placeholder="0" aria-label="${what[0].toUpperCase() + what.slice(1)}">
  <button data-act="${k}+" data-i="${i}" data-j="${j}" aria-label="Increase ${what}">+</button></div>`;
}
function setRow(ex, t, i, j) {
  return `<div class="set ${t.done ? 'done' : ''} ${ex.noWeight ? 'nw' : ''}"><span class="sn">${j + 1}</span>
  ${ex.noWeight ? '' : stepper('w', i, j, dw(t.w))}${stepper('r', i, j, t.r)}
  <button class="dn" data-act="done" data-i="${i}" data-j="${j}">${t.done ? 'DONE' : 'Done'}</button></div>${settings.rpe && t.done ? rpeRow(i, j, t) : ''}${t.rest ? `<div class="m" style="text-align:right;margin:-4px 2px 6px;font-size:9.5px">REST ${fdur(t.rest * 1000)}</div>` : ''}`;
}
let replacing = -1;
function exOf(x) {
  const b = slot[x.slotId] || { name: x.name, sets: x.sets.length, lo: x.extra ? 8 : 0, hi: x.extra ? 12 : 0, rest: [90, 120], cue: '', noWeight: isNW(x.name) };
  if (!x.orig && x.nw == null) return b;
  return Object.assign({}, b, { name: x.name, id: null, noWeight: x.nw != null ? x.nw : b.noWeight, side: x.orig ? false : b.side, cue: x.orig ? '' : b.cue, note: x.orig ? 'replaced for today' : b.note });
}
function replacePanel(x, i) {
  if (replacing !== i) return `<div class="row" style="margin:0 0 8px"><button class="mini" data-act="rep-open" data-i="${i}">Replace exercise</button>${x.orig ? `<button class="mini" data-act="rep-undo" data-i="${i}">Back to ${esc(x.orig)}</button>` : ''}</div>`;
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))].sort();
  return `<div class="sug"><b>Replace for this workout only</b>
  <label style="margin:8px 0">New exercise<input id="rep-in" list="exlist" placeholder="Type or pick a name" autocomplete="off"></label>
  <datalist id="exlist">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  <label class="chk" style="margin-bottom:8px"><input type="checkbox" id="rep-nw" ${x.nw ? 'checked' : ''}> Reps only, no weight</label>
  <div class="row" style="margin:0"><button class="mini" data-act="rep-apply" data-i="${i}" style="margin:0;display:inline-block;background:var(--acc);border-color:var(--acc);color:#0b0c10">Replace</button><button class="mini" data-act="rep-cancel" data-i="${i}" style="margin:0;display:inline-block">Cancel</button></div></div>`;
}
function resetSets(x) {
  const ex = exOf(x), prev = prevFor(ex, active && active.id), n = x.sets.length;
  x.sets = [...Array(n)].map((_, k) => {
    const p = prev ? (prev.sets[k] || prev.sets[prev.sets.length - 1]) : null;
    return { w: ex.noWeight ? 0 : (p ? p.w : 0), r: p ? p.r : (ex.lo || 8), done: false };
  });
}
function exCard(c, x, i, edit) {
  const ex = exOf(x);
  const isOpen = open === i, dn = x.sets.filter(t => t.done).length, all = dn === x.sets.length && !x.skipped;
  let body = '';
  if (isOpen && x.skipped) body = `<div class="bd"><p style="margin:0 0 8px">Skipped${x.skipWhy ? ': ' + esc(x.skipWhy) : ''}. It is not counted as missed.</p><button class="mini" data-act="skip-undo" data-i="${i}">Undo skip</button></div>`;
  else if (isOpen) {
    const prev = prevFor(ex, c.id), sg = suggest(ex, prev);
    const nt = notes[x.name];
    body = `<div class="bd">${edit ? '' : replacePanel(x, i)}${nt ? `<div class="sug"><span class="tag">YOUR NOTE</span> ${nt.machine ? '<b>Machine:</b> ' + esc(nt.machine) + '<br>' : ''}${esc(nt.note || '')} ${(nt.tags || []).map(g => `<span class="t" style="color:${g === 'Pain' ? 'var(--rest)' : 'var(--dim)'}">${esc(g.toUpperCase())}</span>`).join(' ')} <small>(${fd(nt.at)})</small></div>` : ''}${ex.cue ? `<div class="cue">${esc(ex.cue)}</div>` : ''}
    ${edit ? '' : `<div class="sug"><span class="tag">${sg.tag}</span> ${esc(sg.text)}${sg.apply ? `<button class="mini" data-act="apply" data-i="${i}" data-w="${sg.apply}">Use ${r1(dw(sg.apply))} ${UW()}</button>` : ''}</div>`}
    ${prev ? `<div class="last">Last time (${fd(prev.s.finishedAt)}): ${esc(fmtSets(ex, prev.sets))}</div>` : ''}
    <div class="cols ${ex.noWeight ? 'nw' : ''}"><span></span>${ex.noWeight ? '' : `<span>${esc(ex.wlabel || UW())}</span>`}<span>${ex.side ? 'reps per side' : 'reps'}</span><span></span></div>
    ${edit ? '' : (x.warm || []).map((t, j) => warmRow(ex, t, i, j)).join('')}${x.sets.map((t, j) => setRow(ex, t, i, j)).join('')}
    <div class="row"><button class="mini" data-act="addset" data-i="${i}">+ Set</button><button class="mini" data-act="rmset" data-i="${i}">- Set</button>${edit ? '' : `<button class="mini" data-act="warm-add" data-i="${i}">+ Warm-up</button>${(x.warm || []).length ? `<button class="mini" data-act="warm-rm" data-i="${i}">- Warm-up</button>` : ''}`}
    ${ex.noWeight ? '' : `<button class="mini" data-act="inc" data-i="${i}">Step: ${incD(ex)} ${UW()}</button>`}${edit ? '' : `<button class="mini" data-act="skip-open" data-i="${i}">Skip exercise</button>`}</div></div>`;
  }
  return `<section class="ex ${isOpen ? 'open' : ''} ${all ? 'complete' : ''} ${x.skipped ? 'skipped' : ''}">
  <div class="exw"><button class="exh" data-act="toggle" data-i="${i}" aria-expanded="${isOpen}"><div><b>${esc(x.name)}</b>${ex.note ? ` <small>(${esc(ex.note)})</small>` : ''}
  <div class="sub">${x.orig || x.extra ? x.sets.length + ' sets' : ex.sets + ' x ' + ex.lo + '-' + ex.hi}${ex.side ? ' per side' : ''} &middot; rest ${restTxt(ex.rest)}</div></div>
  <span class="cnt">${x.skipped ? 'SKIPPED' : dn + '/' + x.sets.length + (all ? ' DONE' : '')}</span></button>${edit ? '' : `<button class="ndot${notes[x.name] ? ' has' : ''}" data-act="note-open" data-i="${i}" aria-label="${notes[x.name] ? 'Edit note' : 'Add note'} for ${esc(x.name)}">${notes[x.name] ? 'NOTE' : '+'}</button>`}</div>${body}</section>`;
}
const TK = 90;
function tkSvg(sz) {
  const r2 = sz / 2 - 2, r1 = r2 - 18, c = sz / 2; let o = '';
  for (let i = 0; i < TK; i++) { const a = (i * 360 / TK - 90) * Math.PI / 180; o += `<line x1="${(c + r1 * Math.cos(a)).toFixed(1)}" y1="${(c + r1 * Math.sin(a)).toFixed(1)}" x2="${(c + r2 * Math.cos(a)).toFixed(1)}" y2="${(c + r2 * Math.sin(a)).toFixed(1)}" stroke-width="3.5" stroke-linecap="round" style="stroke:var(--bar)"/>`; }
  return `<svg id="pp-tk" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-hidden="true">${o}</svg>`;
}
function setTicks(frac) {
  const ls = $('#pp-tk'); if (!ls) return; const k = Math.round(TK * Math.max(0, Math.min(1, frac)));
  [...ls.children].forEach((l, i) => { l.style.stroke = i < k ? 'var(--acc)' : 'var(--bar)'; });
}
function popupHTML() {
  if (!timer || !timer.pop) return '';
  const st = timer.state || 'run';
  const main = st === 'idle' ? '<button class="btn" data-act="tstart">Start timer</button><div style="height:8px"></div><button class="btn ghost" data-act="tskip">Skip rest</button>'
    : st === 'run' ? '<div class="row"><button class="btn ghost" data-act="tpause">Pause</button><button class="btn" data-act="tstop">Stop</button></div>'
    : '<div class="row"><button class="btn" data-act="tresume">Resume</button><button class="btn ghost" data-act="tstop">Stop</button></div>';
  const hint = st === 'idle' ? 'Set the rest you want, then start. Applies to this set only.' : 'Hide keeps it running as a small button. Stop ends the rest and logs how long you rested.';
  return `<div class="ovl" data-act="tmin"></div>
  <div class="tpop" id="pp-card" role="dialog" aria-label="Rest timer"><button class="mini hide" data-act="tmin">Hide</button>
  <div class="pl" id="pp-label">REST</div>
  <div class="pw">${tkSvg(250)}
  <div class="pc"><b id="pp-time">0:00</b><small id="pp-sub"></small></div></div>
  ${timer.next ? `<div class="pn">Next: ${esc(timer.next)}</div>` : ''}
  <div class="row" style="margin-bottom:10px"><button class="btn ghost" data-act="t-30" style="font-size:18px;padding:11px">- 30 s</button><button class="btn ghost" data-act="t+30" style="font-size:18px;padding:11px">+ 30 s</button></div>
  ${main}<p style="margin:10px 0 0"><small>${hint}</small></p></div>`;
}
function timerBar() {
  if (timer) {
    const st = timer.state || 'run';
    const mid = st === 'idle' ? '<button class="mini" data-act="tstart">Start</button>' : st === 'run' ? '<button class="mini" data-act="tpause">Pause</button>' : '<button class="mini" data-act="tresume">Resume</button>';
    let fp = null; try { fp = JSON.parse(localStorage.getItem('mx.fab')); } catch (e) {}
    return `<button class="tfab" id="tfab" data-act="tshow" aria-label="Open rest timer" style="${fp ? 'left:' + fp.fx * 100 + '%;top:' + fp.fy * 100 + '%' : ''}"><div id="tmr-fill" class="fill"></div><b id="tmr-main">0:00</b><span class="fs" id="tfab-st"></span><small id="tmr-lab"></small></button>`;
  }
  return `<div class="tbar"><div class="tin"><small>Rest timer</small><div class="row">${[60, 90, 120, 180].map(s => `<button class="mini" data-act="tpre" data-s="${s}">${fdur(s * 1000)}</button>`).join('')}</div></div></div>`;
}
views.workout = p => {
  const c = cur();
  if (!c) return '<div class="card"><h3>No workout open</h3>' + homeBtn + '</div>';
  const edit = !!p.edit;
  return `<div class="wh"><button class="mini" data-act="exit">${edit ? 'Cancel' : 'Exit'}</button>
  <div><b>${edit ? 'Editing ' : ''}${esc(c.name)}</b><small>Week ${c.week} &middot; ${doneCount(c)}/${totalCount(c)} sets${edit ? ' &middot; ' + fd(c.finishedAt) : ' &middot; <span id="elapsed"></span>'}</small></div>
  <div class="pbar"><i style="width:${totalCount(c) ? Math.round(doneCount(c) / totalCount(c) * 100) : 0}%"></i></div></div>
  <div class="pad">${c.exercises.map((x, i) => exCard(c, x, i, edit)).join('')}
  ${edit ? '' : '<button class="btn ghost" data-act="add-open" style="margin-top:6px">+ Add exercise</button>'}
  <button class="btn" data-act="${edit ? 'save-edit' : 'finish'}" style="margin-top:6px">${edit ? 'Save changes' : 'Finish workout'}</button>
  ${edit ? '' : '<button class="btn danger" data-act="cancel-workout" style="margin-top:10px">Cancel workout</button>'}</div>${edit ? '' : timerBar() + popupHTML()}`;
};

views.summary = p => {
  const s = sessions.find(x => x.id === p.id);
  if (!s) return '<div class="card"><h3>Session not found</h3>' + homeBtn + '</div>';
  const prs = [];
  s.exercises.forEach(x => {
    const others = sessions.filter(o => o.id !== s.id).flatMap(o => o.exercises.filter(y => y.name === x.name).flatMap(y => y.sets));
    if (!others.length) return;
    const best = Math.max(...others.map(t => score(t.w, t.r)));
    const mine = x.sets.reduce((b, t) => (score(t.w, t.r) > score(b.w, b.r) ? t : b), x.sets[0]);
    if (score(mine.w, mine.r) > best + 1e-9) prs.push({ name: x.name, txt: isNW(x.name) ? mine.r + ' reps' : r1(dw(mine.w)) + ' ' + UW() + ' x ' + mine.r });
  });
  const n = nextWorkout(), nd = dayOf(n.dayKey) || DAYS[0];
  return `<h2>Workout saved</h2>
  <div class="card"><span class="tag">${esc(s.name.toUpperCase())}, WEEK ${s.week}</span>
  <ul class="list"><li>Time<span>${fdur(s.finishedAt - s.startedAt)}</span></li><li>Sets<span>${doneCount(s)}</span></li><li>Volume<span>${Math.round(dw(volume(s))).toLocaleString()} ${UW()}</span></li>${s.skipped && s.skipped.length ? '<li>Skipped<span>' + esc(s.skipped.map(k => k.name).join(', ')) + '</span></li>' : ''}</ul></div>
  ${prs.length ? `<div class="card hl"><span class="tag">PERSONAL RECORDS</span><ul class="list">${prs.map(r => `<li>PR ${esc(r.name)}<span>${esc(r.txt)}</span></li>`).join('')}</ul></div>` : ''}
  <div class="card"><label>Notes for this workout<textarea data-act="note-in" data-id="${s.id}" placeholder="How did it feel? Any pain or form notes?">${esc(s.note || '')}</textarea></label></div>
  <div class="card"><span class="tag">NEXT UP</span><h3>${esc(nd.name)}, week ${n.week}</h3></div>
  <button class="btn" data-act="summary-done">Done</button>`;
};

