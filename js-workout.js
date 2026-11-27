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
  <button class="dn" data-act="done" data-i="${i}" data-j="${j}">${t.done ? 'DONE' : 'Done'}</button></div>${rpeOn() && t.done ? rpeRow(i, j, t) : ''}${t.rest ? `<div class="m" style="text-align:right;margin:-4px 2px 6px;font-size:9.5px">REST ${fdur(t.rest * 1000)}</div>` : ''}`;
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
/* R1 set card (v3.5): finished sets as compact rows, one big card for the current set. */
function old_rows(ex, x, i, sg) {
  return `<div class="cols ${ex.noWeight ? 'nw' : ''}"><span></span>${ex.noWeight ? '' : `<span>${esc(ex.wlabel || UW())}</span>`}<span>${ex.side ? 'reps per side' : 'reps'}</span><span></span></div>`
    + x.sets.map((t, j) => setRow(ex, t, i, j)).join('');
}
function centerReps() { document.querySelectorAll('.rnums').forEach(r => { const s = r.querySelector('.rn.s'); if (s) r.scrollLeft = s.offsetLeft - (r.clientWidth - s.offsetWidth) / 2; }); }
function psTot(x, w) { const o = exOpt(x.name); if (!o.ps) return ''; const t = 2 * w + (o.bar || 0); return (o.bar ? '+ bar ' + r1(dw(o.bar)) + ' ' + UW() + ' = ' : '') + r1(dw(t)) + ' ' + UW() + ' total'; }
function r1Sets(ex, x, i, sg, prev) {
  const sets = x.sets, cj = sets.findIndex(t => !t.done);
  const dtxt = (t, j) => {
    const p = prev ? (prev.sets[j] || prev.sets[prev.sets.length - 1]) : null; if (!p) return '';
    if (!ex.noWeight && t.w !== p.w) return (t.w > p.w ? '+' : '') + r1(dw(t.w - p.w)) + ' ' + UW() + ' vs last';
    return t.r === p.r ? 'same as last' : (t.r > p.r ? '+' : '') + (t.r - p.r) + (Math.abs(t.r - p.r) === 1 ? ' rep' : ' reps') + ' vs last';
  };
  const po = exOpt(x.name), lastDone = sets.reduce((m, t, j) => t.done ? j : m, -1);
  const fresh = j => flashSet && flashSet.i === i && flashSet.j === j && Date.now() - flashSet.t < 1700;
  const doneRows = sets.map((t, j) => !t.done ? '' : `<button class="sdone${fresh(j) ? ' sfresh' : ''}" data-act="done" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} logged, ${ex.noWeight ? '' : r1(dw(t.w)) + ' ' + UW() + ', '}${t.r} reps. Tap to undo"><span class="mono dim">${j + 1}</span><span><b>${ex.noWeight ? '' : r1(dw(t.w)) + ' ' + UW() + (po.ps ? ' each' : '') + ' x '}${t.r}</b> <small class="dim">${esc(dtxt(t, j))}</small></span><span class="mono" style="color:var(--ok);font-weight:700">${t.rpe ? 'RPE ' + t.rpe + (RPE_W[t.rpe] || '') : '&#10003; LOGGED'}</span></button>`).join('');
  if (cj < 0) return doneRows + `<div class="sug" style="margin-top:8px"><span class="tag">ALL SETS LOGGED</span> Add a set below, or move to the next exercise.</div>`;
  const t = sets[cj], pv = prev ? (prev.sets[cj] || prev.sets[prev.sets.length - 1]) : null, st = incD(ex);
  const lo = ex.lo || 8, hi = ex.hi || 12;
  const top = Math.max(50, t.r || 0); const nums = []; for (let n = 1; n <= top; n++) nums.push(n);
  const cur_ = r1(dw(t.w || 0)), tryW = sg && sg.apply ? sg.apply : 0, lastW = pv ? pv.w : 0, prevW = cj > 0 && sets[cj - 1].done && sets[cj - 1].w ? sets[cj - 1].w : 0;
  const chip = (lab, w, d, on) => `<button class="rchip${on ? ' on' : ''}" data-act="wchip" data-i="${i}" data-j="${cj}" ${w != null ? 'data-w="' + w + '"' : 'data-d="' + d + '"'}>${lab}</button>`;
  const wt = ex.noWeight ? '' : `<div class="m" style="margin-top:12px">${esc(ex.wlabel || 'WEIGHT')} &middot; TAP TO TYPE</div>
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:baseline"><label class="wbig" style="margin:0"><input data-act="w-in" data-i="${i}" data-j="${cj}" type="number" inputmode="decimal" step="any" min="0" value="${t.w ? cur_ : ''}" placeholder="0" aria-label="Weight of set ${cj + 1}"><span class="mono dim">${UW()}${po.ps ? ' each side' : ''}</span></label>${prevW && t.w === prevW ? `<span class="mono" style="color:var(--acct);font-size:12px">SAME AS SET ${cj}</span>` : pv && t.w !== pv.w ? `<span class="mono" style="color:var(--acct);font-size:12px">${t.w > pv.w ? '+' : ''}${r1(dw(t.w - pv.w))} VS LAST</span>` : ''}</div>
    ${po.ps ? `<div class="dim" style="font-size:12.5px;margin-top:4px" id="pstot-${i}">${psTot(x, t.w || 0)}</div>` : ''}
    <div class="rchips">${chip('&minus;' + st, null, '-', false)}${prevW ? chip('SET ' + cj + ' ' + r1(dw(prevW)), prevW, 0, t.w === prevW) : ''}${lastW && lastW !== prevW ? chip('LAST ' + r1(dw(lastW)), lastW, 0, t.w === lastW) : ''}${tryW && tryW !== lastW ? chip('TRY ' + r1(dw(tryW)), tryW, 0, t.w === tryW) : ''}${chip('+' + st, null, '+', false)}</div>`;
  const reps = `<div class="m" style="margin-top:16px">${ex.side ? 'REPS PER SIDE' : 'REPS'} &middot; TARGET ${lo} TO ${hi}</div>
    <div class="rnums" role="group" aria-label="Reps, drag sideways for more">${nums.map(n => `<button class="rn${t.r === n ? ' s' : ''}${n < lo || n > hi ? ' o' : ''}" data-act="rpick" data-i="${i}" data-j="${cj}" data-v="${n}" aria-pressed="${t.r === n}">${n}</button>`).join('')}</div>`;
  const beat = pv ? `BEAT ${ex.noWeight ? '' : r1(dw(pv.w)) + ' x '}${pv.r}` : 'FIRST TIME';
  const left = sets.length - cj - 1;
  return doneRows + `<div class="r1c"><div class="m">${pv ? 'LAST TIME ' + (ex.noWeight ? '' : r1(dw(pv.w)) + ' x ') + pv.r : 'FIRST TIME'}</div>${wt}${reps}
    ${rpeOn() ? rpeRow(i, cj, t).replace('HOW HARD', 'HOW HARD? OPTIONAL') + '<div class="mono dim" style="font-size:10px;margin:2px 0 0">6 EASY, 8 HARD, 10 MAX</div>' : ''}
    <button class="r1go" data-act="done" data-i="${i}" data-j="${cj}"><span>Log set ${cj + 1}</span><span aria-hidden="true">&#10003;</span></button></div>`;
}
function bestSet(name, excludeId) {
  let b = null;
  sessions.forEach(se => { if (se.id === excludeId) return; (se.exercises || []).forEach(e => { if (e.name !== name || e.skipped) return; (e.sets || []).forEach(t => { if (t.done && (!b || t.w > b.w || (t.w === b.w && t.r > b.r))) b = t; }); }); });
  return b;
}
function topSet(x) { return x.sets.filter(t => t.done).reduce((b, t) => (!b || t.w > b.w || (t.w === b.w && t.r > b.r)) ? t : b, null); }
function setStrip(x) {
  const cj = x.sets.findIndex(t => !t.done);
  return `<div class="sgs" aria-hidden="true">${x.sets.map((t, j) => `<i class="${t.done ? 'f' : j === cj ? 'c' : ''}"></i>`).join('')}</div>`;
}
let flashSet = null, moreOpen = -1;
function exCard(c, x, i, edit) {
  const ex = exOf(x);
  const isOpen = open === i, dn = x.sets.filter(t => t.done).length, all = dn === x.sets.length && !x.skipped;
  let body = '';
  if (isOpen && x.skipped) body = `<div class="bd"><p style="margin:0 0 8px">Skipped${x.skipWhy ? ': ' + esc(x.skipWhy) : ''}. It is not counted as missed.</p><button class="mini" data-act="skip-undo" data-i="${i}">Undo skip</button></div>`;
  else if (isOpen) {
    const prev = prevFor(ex, c.id), sg = suggest(ex, prev);
    const nt = notes[x.name];
    const more = `${edit ? '' : replacePanel(x, i)}${nt ? `<div class="sug"><span class="tag">YOUR NOTE</span> ${nt.machine ? '<b>Machine:</b> ' + esc(nt.machine) + '<br>' : ''}${esc(nt.note || '')} ${(nt.tags || []).map(g => `<span class="t" style="color:${g === 'Pain' ? 'var(--rest)' : 'var(--dim)'}">${esc(g.toUpperCase())}</span>`).join(' ')} <small>(${fd(nt.at)})</small></div>` : ''}${ex.note ? `<div class="cue">${esc(ex.note)}</div>` : ''}${ex.cue ? `<div class="cue">${esc(ex.cue)}</div>` : ''}
    ${edit ? '' : `<div class="sug"><span class="tag">${sg.tag}</span> ${esc(sg.text)}${sg.apply ? `<button class="mini" data-act="apply" data-i="${i}" data-w="${sg.apply}">Use ${r1(dw(sg.apply))} ${UW()}</button>` : ''}</div>`}
    ${edit || exOf(x).noWeight ? '' : `<div class="row" style="align-items:center;margin:8px 0"><button class="mini${exOpt(x.name).ps ? ' on' : ''}" data-act="ps-tog" data-n="${esc(x.name)}" aria-pressed="${exOpt(x.name).ps}">Weight per side: ${exOpt(x.name).ps ? 'ON' : 'OFF'}</button>${exOpt(x.name).ps ? `<label class="mono dim" style="font-size:11px">BAR <input data-act="bar-in" data-n="${esc(x.name)}" type="number" inputmode="decimal" step="any" min="0" value="${exOpt(x.name).bar ? r1(dw(exOpt(x.name).bar)) : ''}" placeholder="0" style="width:64px"> ${UW()}</label>` : ''}</div>`}
    <div class="row"><button class="mini" data-act="addset" data-i="${i}">+ Set</button><button class="mini" data-act="rmset" data-i="${i}">- Set</button>${edit ? '' : `<button class="mini" data-act="warm-add" data-i="${i}">+ Warm-up</button>${(x.warm || []).length ? `<button class="mini" data-act="warm-rm" data-i="${i}">- Warm-up</button>` : ''}`}
    ${ex.noWeight ? '' : `<button class="mini" data-act="inc" data-i="${i}">Step: ${incD(ex)} ${UW()}</button>`}${edit ? '' : `<button class="mini" data-act="skip-open" data-i="${i}">Skip exercise</button>`}</div>`;
    const mo = edit || moreOpen === i;
    body = `<div class="bd">${edit ? '' : (x.warm || []).map((t, j) => warmRow(ex, t, i, j)).join('')}${edit ? old_rows(ex, x, i, sg) : r1Sets(ex, x, i, sg, prev)}
    ${edit ? '' : `<button class="morerow" data-act="more" data-i="${i}" aria-expanded="${mo}"><span>More</span><small>${mo ? 'hide' : 'notes, replace, add set, step'}</small><span aria-hidden="true">${mo ? '&#9652;' : '&#9662;'}</span></button>`}${mo ? `<div class="morebox">${more}</div>` : ''}</div>`;
  }
  const n = x.sets.length, cj = x.sets.findIndex(t => !t.done), ts = all ? topSet(x) : null;
  let nb = false;
  if (all && ts) { const bs = bestSet(x.name, c.id); nb = !!bs && (ex.noWeight ? ts.r > bs.r : (ts.w > bs.w || (ts.w === bs.w && ts.r > bs.r))); }
  const spec = (x.orig || x.extra || !ex.lo) ? n + ' sets' : n + ' &times; ' + ex.lo + '-' + ex.hi + (ex.side ? ' per side' : '');
  const lab = x.skipped ? 'Skipped' : all ? 'Done' : dn > 0 || isOpen ? 'Set ' + (cj + 1) + ' of ' + n : n + ' sets';
  const sub = all && ts ? n + ' sets, top set ' + (ex.noWeight ? '' : r1(dw(ts.w)) + ' ' + UW() + ' x ') + ts.r : (x.orig || x.extra ? n + ' sets' : ex.sets + ' x ' + ex.lo + '-' + ex.hi) + (ex.side ? ' per side' : '') + ' &middot; rest ' + restTxt(ex.rest);
  return `<section class="ex ${isOpen ? 'open' : ''} ${all ? 'complete' : ''} ${x.skipped ? 'skipped' : ''}">
  <div class="exw"><button class="exh" data-act="toggle" data-i="${i}" aria-expanded="${isOpen}"><div style="flex:1;min-width:0"><b>${esc(x.name)}</b> <span class="spec">&middot; ${spec}</span>
  ${all && ts ? `<div class="sub">${sub}</div>` : ''}${x.skipped ? '' : `<div class="sgrow">${setStrip(x)}<span class="sgl">${all ? '&#10003; DONE' : lab}</span></div>`}${nb ? '<div class="nbest"><span class="tag">NEW BEST</span></div>' : ''}</div>
  ${x.skipped ? '<span class="cnt">SKIPPED</span>' : ''}</button>${edit ? '' : `<button class="ndot${notes[x.name] ? ' has' : ''}" data-act="note-open" data-i="${i}" aria-label="${notes[x.name] ? 'Edit note' : 'Add note'} for ${esc(x.name)}">${notes[x.name] ? 'NOTE' : '+'}</button>`}</div>${body}</section>`;
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
  const rowsT = s.exercises.map(x => {
    const ts = topSet(x), sk = x.skipped || !ts, bs = ts && bestSet(x.name, s.id), nb = !!ts && !!bs && (isNW(x.name) ? ts.r > bs.r : (ts.w > bs.w || (ts.w === bs.w && ts.r > bs.r)));
    return `<div class="row" style="padding:11px 0;border-top:1px solid var(--line);align-items:center;flex-wrap:nowrap"><div><b>${esc(x.name)}</b><br><small class="dim">${sk ? 'Skipped' : doneCount({ exercises: [x] }) + ' sets'}</small></div><div style="text-align:right">${nb ? otag('NEW BEST', true) + '<br>' : ''}<small class="dim">${sk ? '' : isNW(x.name) ? ts.r + ' reps' : r1(dw(ts.w)) + ' ' + UW() + ' x ' + ts.r}</small></div></div>`;
  }).join('');
  const saved = feedback.find(f => f.sid === s.id);
  return `<h2>Workout saved</h2>
  <div class="card"><span class="tag">${esc(s.name.toUpperCase())}, WEEK ${s.week}</span>
  <ul class="list"><li>Time<span>${fdur(s.finishedAt - s.startedAt)}</span></li><li>Sets<span>${doneCount(s)}</span></li><li>Volume<span>${Math.round(dw(volume(s))).toLocaleString()} ${UW()}</span></li></ul></div>
  <div class="dl"><b></b><span class="m">TOP SET PER EXERCISE</span><b></b></div>
  <div class="card" style="padding:2px 16px">${rowsT}</div>
  <div class="card" id="fb-box"><b style="font-size:16px">Anything to note?</b><textarea id="fb-text" class="big" style="margin-top:10px" placeholder="How did it feel? Pain, form, or something the app got wrong.">${esc(s.note || (saved && saved.note) || '')}</textarea>
  <div class="mchips" role="group" aria-label="Note type" style="margin-top:8px">${FB_TAGS.map(g => `<button type="button" class="ntg${saved && (saved.tags || []).includes(g) ? ' on' : ''}" data-act="nt-tag" aria-pressed="${!!(saved && (saved.tags || []).includes(g))}">${g}</button>`).join('')}</div>
  <small class="dim" style="display:block;margin-top:8px">Saved when you tap Done. Leave it empty to skip.</small></div>
  <div class="card"><span class="tag">NEXT WORKOUT</span><h3>${esc(nd.name)}, week ${n.week}</h3></div>
  <div style="position:sticky;bottom:0;padding:14px 0 18px;background:linear-gradient(transparent,var(--bg) 30%)"><button class="btn" data-act="summary-done" data-id="${esc(s.id)}">Done</button></div>`;
};

