/* MetriX Train: personal workout logger. No dependencies. Data is stored in localStorage. */
(function () {
'use strict';
const VERSION = '1.1.0';
const P = window.PROGRAM, DAYS = P.days;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const rnd = x => Math.round(x * 100) / 100;
const clone = o => JSON.parse(JSON.stringify(o));
const fd = t => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
function fdur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
function LSget(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function LSset(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { toast('Could not save. Storage may be full or blocked.'); return false; }
}
function toast(m) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = m; t.className = 'show';
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = ''; }, 2600);
}

/* ---------- state ---------- */
let sessions = LSget('mx.sessions', []);        // completed workouts
let active = LSget('mx.active', null);          // workout in progress
let editing = null;                             // past session being edited (memory only)
let settings = Object.assign({ inc: {}, sound: true, vibrate: true, override: null }, LSget('mx.settings', {}));
let timer = LSget('mx.timer', null);
let daily = LSget('mx.daily', {});             // {YYYY-MM-DD: {steps, sleep}}
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const saveDaily = () => LSset('mx.daily', daily);
const fdk = k => { const [y, m, d] = k.split('-'); return fd(new Date(+y, +m - 1, +d).getTime()); };
let view = { name: 'home', params: {} };
let open = 0;
let persisted = null;

const slot = {};
DAYS.forEach(d => d.exercises.forEach((e, n) => { e.id = d.key + '-' + n; slot[e.id] = e; }));
const dayOf = k => DAYS.find(d => d.key === k);
const isNW = name => DAYS.some(d => d.exercises.some(e => e.name === name && e.noWeight));
const saveSessions = () => LSset('mx.sessions', sessions);
const saveSettings = () => LSset('mx.settings', settings);
const saveTimer = () => LSset('mx.timer', timer);
const cur = () => (view.params.edit ? editing : active);
const persist = () => { if (!view.params.edit) LSset('mx.active', active); };

const doneCount = s => s.exercises.reduce((n, x) => n + x.sets.filter(t => t.done).length, 0);
const totalCount = s => s.exercises.reduce((n, x) => n + x.sets.length, 0);
const volume = s => s.exercises.reduce((v, x) => v + x.sets.reduce((a, t) => a + (t.done ? t.w * t.r : 0), 0), 0);
const score = (w, r) => (w > 0 ? w * (1 + r / 30) : r);   // estimated 1RM, or reps for bodyweight work
const sortedDesc = () => sessions.slice().sort((a, b) => b.finishedAt - a.finishedAt);
const getInc = ex => settings.inc[ex.name] || 2.5;
const restTxt = r => ((r[0] >= 120 && r[0] % 60 === 0 && r[1] % 60 === 0)
  ? (r[0] / 60) + '-' + (r[1] / 60) + ' min' : (r[0] === r[1] ? r[0] + 's' : r[0] + '-' + r[1] + 's'));
const fmtSets = (ex, sets) => sets.map(t => (ex.noWeight ? t.r : rnd(t.w) + 'x' + t.r)).join(', ');

/* ---------- progression ---------- */
function nextWorkout() {
  if (settings.override) return settings.override;
  const l = sortedDesc()[0];
  if (!l) return { week: 1, dayKey: DAYS[0].key };
  const i = DAYS.findIndex(d => d.key === l.dayKey);
  return i >= 0 && i < DAYS.length - 1
    ? { week: l.week, dayKey: DAYS[i + 1].key }
    : { week: l.week + 1, dayKey: DAYS[0].key };
}

function prevFor(ex, excludeId) {
  const list = sortedDesc().filter(s => s.id !== excludeId);
  for (const s of list) {
    const x = s.exercises.find(y => y.slotId === ex.id), ds = x && x.sets.filter(t => t.done);
    if (ds && ds.length) return { s, sets: ds, same: true };
  }
  for (const s of list) {
    const x = s.exercises.find(y => y.name === ex.name), ds = x && x.sets.filter(t => t.done);
    if (ds && ds.length) return { s, sets: ds, same: false };
  }
  return null;
}

function suggest(ex, prev) {
  if (!prev) return { tag: 'FIRST TIME', text: `No history yet. Pick a weight you can move cleanly for about ${ex.lo} reps, then log it.` };
  const ps = prev.sets, topW = Math.max(...ps.map(t => t.w));
  const allTop = prev.same && ps.length >= ex.sets && ps.every(t => t.r >= ex.hi);
  if (allTop) {
    if (ex.noWeight) return { tag: 'TOP OF RANGE', text: `Every set reached ${ex.hi} reps. Make it harder: slower tempo or more resistance.` };
    const nw = rnd(topW + getInc(ex));
    return { tag: 'ADD WEIGHT', text: `Every set reached ${ex.hi} reps last time. Try ${nw} kg and build reps back up.`, apply: nw };
  }
  const src = prev.same ? '' : ` Last numbers are from ${(dayOf(prev.s.dayKey) || {}).name || 'another day'}, where the rep range may differ.`;
  return { tag: 'BEAT LAST TIME', text: `Match last time, then add a rep. Goal: every set at ${ex.hi} reps.${src}` };
}

function startSession(sel) {
  const day = dayOf(sel.dayKey) || DAYS[0];
  active = {
    id: uid(), week: sel.week, dayKey: day.key, name: day.name, startedAt: Date.now(),
    exercises: day.exercises.map(ex => {
      const prev = prevFor(ex);
      const sets = [...Array(ex.sets)].map((_, i) => {
        const p = prev ? (prev.sets[i] || prev.sets[prev.sets.length - 1]) : null;
        return { w: ex.noWeight ? 0 : (p ? p.w : 0), r: p ? p.r : ex.lo, done: false };
      });
      return { slotId: ex.id, name: ex.name, sets };
    })
  };
  settings.override = null; saveSettings(); LSset('mx.active', active);
  open = 0; go('workout');
}

function finishWorkout() {
  const c = active;
  const s = {
    id: c.id, week: c.week, dayKey: c.dayKey, name: c.name, startedAt: c.startedAt, finishedAt: Date.now(), note: '', updatedAt: Date.now(),
    exercises: c.exercises.map(x => ({ slotId: x.slotId, name: x.name, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true })) })).filter(x => x.sets.length)
  };
  sessions.push(s); saveSessions();
  active = null; LSset('mx.active', null);
  timer = null; saveTimer();
  settings.override = null; saveSettings();
  go('summary', { id: s.id }, true);
}

function setW(c, i, j, nw) {
  const sets = c.exercises[i].sets, old = sets[j].w;
  sets[j].w = nw;
  for (let k = j + 1; k < sets.length; k++) if (!sets[k].done && sets[k].w === old) sets[k].w = nw;
}
function syncInputs(i) {
  const c = cur(); if (!c) return;
  document.querySelectorAll('input[data-i="' + i + '"]').forEach(el => {
    const t = c.exercises[i].sets[+el.dataset.j];
    if (t) el.value = (el.dataset.act === 'w-in' ? t.w : t.r) || '';
  });
}

/* ---------- rest timer ---------- */
function startTimer(min, max) { timer = { start: Date.now(), min, max, f1: 0, f2: 0 }; saveTimer(); }
let actx = null;
function unlockAudio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
}
function beep(n) {
  if (!settings.sound || !actx) return;
  try {
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; g.gain.value = 0.18; o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime + i * 0.25; o.start(t); o.stop(t + 0.15);
    }
  } catch (e) {}
}
function buzz(p) { if (settings.vibrate && navigator.vibrate) navigator.vibrate(p); }
function alertUser(level) {
  if (level === 1) { beep(2); buzz([200, 100, 200]); } else { beep(3); buzz([300, 100, 300, 100, 300]); }
}
function tick() {
  const c = cur(), el = $('#elapsed');
  if (el && c) el.textContent = fdur(Date.now() - c.startedAt);
  if (!timer) return;
  const s = (Date.now() - timer.start) / 1000;
  if (!timer.f1 && s >= timer.min) { timer.f1 = 1; saveTimer(); alertUser(1); }
  if (!timer.f2 && timer.max > timer.min && s >= timer.max) { timer.f2 = 1; saveTimer(); alertUser(2); }
  const m = $('#tmr-main'); if (!m) return;
  const rem = timer.min - s;
  m.textContent = rem > 0 ? fdur(Math.ceil(rem) * 1000) : '+' + fdur(-rem * 1000);
  $('#tmr-lab').textContent = rem > 0 ? 'Rest, ready at ' + fdur(timer.min * 1000)
    : (s < timer.max ? 'Ready. Up to ' + fdur(timer.max * 1000) : 'Rest is over');
  $('#tmr-fill').style.width = Math.min(100, s / timer.max * 100) + '%';
}

/* ---------- wake lock ---------- */
let wl = null;
async function wake() {
  const need = view.name === 'workout';
  try {
    if (need && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    else if (!need && wl) { await wl.release(); wl = null; }
  } catch (e) {}
}

/* ---------- navigation ---------- */
function go(name, params, replace) {
  view = { name, params: params || {} };
  const st = { name: view.name, params: view.params };
  try { replace ? history.replaceState(st, '') : history.pushState(st, ''); } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}
  render();
}
window.addEventListener('popstate', e => { view = e.state || { name: 'home', params: {} }; render(); });
const tabOf = n => ({ workout: 'home', summary: 'home', session: 'history' }[n] || n);

function render() {
  const app = $('#app');
  try {
    app.innerHTML = views[view.name](view.params);
    $('#tabs').style.display = (view.name === 'workout' || view.name === 'summary') ? 'none' : 'flex';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === tabOf(view.name)));
    wake(); tick();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="card"><h3>Something broke</h3><p>' + esc(e.message) + '</p><button class="btn" data-act="reload">Reload</button></div>';
  }
}

/* ---------- views ---------- */
const views = {};
const homeBtn = '<button class="btn ghost" data-go="home">Back to Train</button>';

function dailyCard() {
  const t = daily[todayKey()] || {};
  return `<div class="card"><span class="tag">TODAY</span>
  <div class="row"><label style="flex:1;margin:0">Steps<input data-act="daily-in" data-f="steps" type="number" inputmode="numeric" min="0" value="${t.steps == null ? '' : t.steps}" placeholder="0"></label>
  <label style="flex:1;margin:0">Sleep (hours)<input data-act="daily-in" data-f="sleep" type="number" inputmode="decimal" step="any" min="0" max="24" value="${t.sleep == null ? '' : t.sleep}" placeholder="0"></label></div>
  <p style="margin:8px 0 0"><small>From Samsung Health. Saves as you type. Enter last night's sleep today.</small></p></div>`;
}
function dailySection() {
  const keys = Object.keys(daily).sort();
  if (!keys.length) return '';
  const part = (f, label, unit) => {
    const r = keys.filter(k => daily[k][f] != null).slice(-14);
    if (!r.length) return '';
    const avg = rnd(r.reduce((a, k) => a + daily[k][f], 0) / r.length);
    return `<div class="card"><b>${label}</b><p>Average of last ${r.length} days: ${avg.toLocaleString()} ${unit}</p>
    ${r.length >= 2 ? chart(r.map(k => daily[k][f]), r.map(fdk)) : ''}</div>`;
  };
  const rows = keys.slice(-14).reverse();
  return `<h2 style="margin-top:18px">Steps and sleep</h2>${part('steps', 'Steps', 'steps')}${part('sleep', 'Sleep', 'hours')}
  <div class="card"><table><tr><th>Date</th><th>Steps</th><th>Sleep</th></tr>${rows.map(k =>
    `<tr><td>${fdk(k)}</td><td>${daily[k].steps == null ? '-' : daily[k].steps.toLocaleString()}</td><td>${daily[k].sleep == null ? '-' : daily[k].sleep + ' h'}</td></tr>`).join('')}</table></div>`;
}

views.home = p => {
  const n = nextWorkout(), d = dayOf(n.dayKey) || DAYS[0];
  const l = sortedDesc()[0];
  const wk = sessions.filter(s => s.week === n.week);
  const chips = DAYS.map(x => {
    const dn = wk.some(s => s.dayKey === x.key), nx = x.key === n.dayKey;
    return `<div class="chip ${nx ? 'next' : dn ? 'dn' : ''}"><b>${esc(x.name)}</b><span>${dn ? 'DONE' : nx ? 'NEXT' : 'TO DO'}</span></div>`;
  }).join('');
  const resume = active ? `<div class="card hl"><span class="tag">IN PROGRESS</span><h3>${esc(active.name)}</h3>
    <p>Week ${active.week}, ${doneCount(active)}/${totalCount(active)} sets done</p>
    <div class="row"><button class="btn" data-act="resume">Resume</button><button class="btn ghost" data-act="discard">Discard</button></div></div>` : '';
  const picker = p.picker ? `<div class="card"><h3>Change what is next</h3>
    <label>Week<input id="pk-week" type="number" min="1" inputmode="numeric" value="${n.week}"></label>
    <label>Workout<select id="pk-day">${DAYS.map(x => `<option value="${x.key}" ${x.key === n.dayKey ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="pick-apply">Use this</button><button class="btn ghost" data-act="pick-cancel">Cancel</button></div></div>` : '';
  const meso = n.week === P.weeks ? '<p><b>Final week.</b> After it, review bodyweight, waist, photos and performance (see Info).</p>'
    : n.week > P.weeks ? '<p><b>Past week ' + P.weeks + '.</b> Decide whether to keep this setup or adjust it (see Info).</p>' : '';
  return `<h2>MetriX Train</h2>${resume}
  <div class="card"><span class="tag">NEXT UP, WEEK ${n.week} OF ${P.weeks}</span><h3 style="font-size:22px">${esc(d.name)}</h3>
    <p>${esc(d.blurb)}</p>${meso}
    <ul class="list">${d.exercises.map(e => `<li>${esc(e.name)}<span>${e.sets} x ${e.lo}-${e.hi}${e.side ? ' /side' : ''}</span></li>`).join('')}</ul>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="start">Start workout</button><button class="btn ghost" data-act="picker">Change</button></div></div>
  ${picker}
  ${dailyCard()}
  <div class="chips">${chips}</div>
  ${l ? `<p>Last workout: ${esc(l.name)} on ${fd(l.finishedAt)}, ${doneCount(l)} sets, ${Math.round(volume(l)).toLocaleString()} kg volume.</p>` : '<p>No workouts logged yet. Your first one sets the baseline.</p>'}`;
};

function stepper(k, i, j, v) {
  return `<div class="stp"><button data-act="${k}-" data-i="${i}" data-j="${j}" aria-label="decrease">&minus;</button>
  <input data-act="${k}-in" data-i="${i}" data-j="${j}" type="number" inputmode="${k === 'w' ? 'decimal' : 'numeric'}" step="any" min="0" value="${v || ''}" placeholder="0">
  <button data-act="${k}+" data-i="${i}" data-j="${j}" aria-label="increase">+</button></div>`;
}
function setRow(ex, t, i, j) {
  return `<div class="set ${t.done ? 'done' : ''} ${ex.noWeight ? 'nw' : ''}"><span class="sn">${j + 1}</span>
  ${ex.noWeight ? '' : stepper('w', i, j, t.w)}${stepper('r', i, j, t.r)}
  <button class="dn" data-act="done" data-i="${i}" data-j="${j}">${t.done ? 'DONE' : 'Done'}</button></div>`;
}
function exCard(c, x, i, edit) {
  const ex = slot[x.slotId] || { name: x.name, sets: x.sets.length, lo: 0, hi: 0, rest: [90, 120], cue: '' };
  const isOpen = open === i, dn = x.sets.filter(t => t.done).length, all = dn === x.sets.length;
  let body = '';
  if (isOpen) {
    const prev = prevFor(ex, c.id), sg = suggest(ex, prev);
    body = `<div class="bd">${ex.cue ? `<div class="cue">${esc(ex.cue)}</div>` : ''}
    ${edit ? '' : `<div class="sug"><span class="tag">${sg.tag}</span> ${esc(sg.text)}${sg.apply ? `<button class="mini" data-act="apply" data-i="${i}" data-w="${sg.apply}">Use ${sg.apply} kg</button>` : ''}</div>`}
    ${prev ? `<div class="last">Last time (${fd(prev.s.finishedAt)}): ${esc(fmtSets(ex, prev.sets))}</div>` : ''}
    <div class="cols ${ex.noWeight ? 'nw' : ''}"><span></span>${ex.noWeight ? '' : `<span>${esc(ex.wlabel || 'kg')}</span>`}<span>${ex.side ? 'reps per side' : 'reps'}</span><span></span></div>
    ${x.sets.map((t, j) => setRow(ex, t, i, j)).join('')}
    <div class="row"><button class="mini" data-act="addset" data-i="${i}">+ Set</button><button class="mini" data-act="rmset" data-i="${i}">- Set</button>
    ${ex.noWeight ? '' : `<button class="mini" data-act="inc" data-i="${i}">Step: ${getInc(ex)} kg</button>`}</div></div>`;
  }
  return `<section class="ex ${isOpen ? 'open' : ''} ${all ? 'complete' : ''}">
  <button class="exh" data-act="toggle" data-i="${i}"><div><b>${esc(x.name)}</b>${ex.note ? ` <small>(${esc(ex.note)})</small>` : ''}
  <div class="sub">${ex.sets} x ${ex.lo}-${ex.hi}${ex.side ? ' per side' : ''} &middot; rest ${restTxt(ex.rest)}</div></div>
  <span class="cnt">${dn}/${x.sets.length}${all ? ' DONE' : ''}</span></button>${body}</section>`;
}
function timerBar() {
  if (timer) return `<div class="tbar"><div id="tmr-fill" class="fill"></div><div class="tin"><div><b id="tmr-main">0:00</b><small id="tmr-lab"></small></div>
    <div class="row"><button class="mini" data-act="t+30">+30s</button><button class="mini" data-act="tskip">Skip</button></div></div></div>`;
  return `<div class="tbar"><div class="tin"><small>Rest timer</small><div class="row">${[60, 90, 120, 180].map(s => `<button class="mini" data-act="tpre" data-s="${s}">${fdur(s * 1000)}</button>`).join('')}</div></div></div>`;
}
views.workout = p => {
  const c = cur();
  if (!c) return '<div class="card"><h3>No workout open</h3>' + homeBtn + '</div>';
  const edit = !!p.edit;
  return `<div class="wh"><button class="mini" data-act="exit">${edit ? 'Cancel' : 'Exit'}</button>
  <div><b>${edit ? 'Editing ' : ''}${esc(c.name)}</b><small>Week ${c.week} &middot; ${doneCount(c)}/${totalCount(c)} sets${edit ? ' &middot; ' + fd(c.finishedAt) : ' &middot; <span id="elapsed"></span>'}</small></div></div>
  <div class="pad">${c.exercises.map((x, i) => exCard(c, x, i, edit)).join('')}
  <button class="btn" data-act="${edit ? 'save-edit' : 'finish'}" style="margin-top:6px">${edit ? 'Save changes' : 'Finish workout'}</button></div>${edit ? '' : timerBar()}`;
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
    if (score(mine.w, mine.r) > best + 1e-9) prs.push({ name: x.name, txt: isNW(x.name) ? mine.r + ' reps' : rnd(mine.w) + ' kg x ' + mine.r });
  });
  const n = nextWorkout(), nd = dayOf(n.dayKey) || DAYS[0];
  return `<h2>Workout saved</h2>
  <div class="card"><span class="tag">${esc(s.name.toUpperCase())}, WEEK ${s.week}</span>
  <ul class="list"><li>Time<span>${fdur(s.finishedAt - s.startedAt)}</span></li><li>Sets<span>${doneCount(s)}</span></li><li>Volume<span>${Math.round(volume(s)).toLocaleString()} kg</span></li></ul></div>
  ${prs.length ? `<div class="card hl"><span class="tag">PERSONAL RECORDS</span><ul class="list">${prs.map(r => `<li>PR ${esc(r.name)}<span>${esc(r.txt)}</span></li>`).join('')}</ul></div>` : ''}
  <div class="card"><label>Notes for this workout<textarea data-act="note-in" data-id="${s.id}" placeholder="How did it feel? Any pain or form notes?">${esc(s.note || '')}</textarea></label></div>
  <div class="card"><span class="tag">NEXT UP</span><h3>${esc(nd.name)}, week ${n.week}</h3></div>
  <button class="btn" data-act="summary-done">Done</button>`;
};

views.history = () => {
  const l = sortedDesc();
  if (!l.length) return '<h2>History</h2><div class="card"><p>Finished workouts show up here.</p></div>';
  return '<h2>History</h2>' + l.map(s => `<div class="card"><button class="item" data-act="open-session" data-id="${s.id}">
  <div><b>${esc(s.name)}</b><small>Week ${s.week} &middot; ${fd(s.finishedAt)}</small></div>
  <div class="r"><b>${doneCount(s)} sets</b><small>${Math.round(volume(s)).toLocaleString()} kg</small></div></button></div>`).join('');
};

views.session = p => {
  const s = sessions.find(x => x.id === p.id);
  if (!s) return '<div class="card"><h3>Session not found</h3>' + homeBtn + '</div>';
  return `<h2>${esc(s.name)}</h2><p>Week ${s.week} &middot; ${fd(s.finishedAt)} &middot; ${fdur(s.finishedAt - s.startedAt)} &middot; ${Math.round(volume(s)).toLocaleString()} kg volume</p>
  ${s.exercises.map(x => { const ex = slot[x.slotId] || { noWeight: isNW(x.name) }; return `<div class="card"><b>${esc(x.name)}</b><p>${esc(fmtSets(ex, x.sets))}</p></div>`; }).join('')}
  ${s.note ? `<div class="card"><span class="tag">NOTES</span><p>${esc(s.note)}</p></div>` : ''}
  <div class="row"><button class="btn" data-act="edit-session" data-id="${s.id}">Edit</button><button class="btn danger" data-act="delete-session" data-id="${s.id}">Delete</button></div>
  <div style="height:8px"></div><button class="btn ghost" data-go="history">Back to history</button>`;
};

function chart(points, labels) {
  const W = 320, H = 150, L = 38, R = 10, T = 14, B = 24;
  const mn = Math.min(...points), mx = Math.max(...points);
  const lo = mn === mx ? mn - 1 : mn, hi = mn === mx ? mx + 1 : mx;
  const x = i => L + (points.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (points.length - 1));
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pl = points.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Progress chart">
  <line x1="${L}" y1="${y(lo)}" x2="${W - R}" y2="${y(lo)}" stroke="#252e42"/>
  <polyline points="${pl}" fill="none" stroke="#9b7aff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${points.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="#9b7aff"/>`).join('')}
  <text x="${L - 6}" y="${y(hi) + 4}" text-anchor="end" fill="#93a0b4" font-size="11">${rnd(mx)}</text>
  <text x="${L - 6}" y="${y(lo) + 4}" text-anchor="end" fill="#93a0b4" font-size="11">${rnd(mn)}</text>
  <text x="${L}" y="${H - 6}" fill="#93a0b4" font-size="11">${esc(labels[0])}</text>
  <text x="${W - R}" y="${H - 6}" text-anchor="end" fill="#93a0b4" font-size="11">${esc(labels[labels.length - 1])}</text></svg>`;
}
views.progress = p => {
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))].sort();
  const sel = p.name || names[0], nw = isNW(sel);
  let m = p.metric || 'top'; if (nw && m === 'e1') m = 'top';
  const rows = [];
  sortedDesc().reverse().forEach(s => {
    const sets = s.exercises.filter(x => x.name === sel).flatMap(x => x.sets);
    if (!sets.length) return;
    const v = m === 'vol' ? sets.reduce((a, t) => a + (nw ? t.r : t.w * t.r), 0)
      : m === 'e1' ? Math.max(...sets.map(t => score(t.w, t.r)))
      : Math.max(...sets.map(t => (nw ? t.r : t.w)));
    rows.push({ s, sets, v: rnd(v) });
  });
  const segs = [['top', nw ? 'Top reps' : 'Top weight']].concat(nw ? [] : [['e1', 'Est. 1RM']]).concat([['vol', nw ? 'Total reps' : 'Volume']]);
  const unit = nw ? 'reps' : 'kg';
  return `<h2>Progress</h2>
  <label>Exercise<select data-act="ex-sel">${names.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <div class="seg">${segs.map(([k, l]) => `<button class="mini ${m === k ? 'on' : ''}" data-act="metric" data-m="${k}">${l}</button>`).join('')}</div>
  <div class="card">${rows.length >= 2 ? chart(rows.map(r => r.v), rows.map(r => fd(r.s.finishedAt)))
      : '<p>Log this exercise in at least two workouts to see a trend.</p>'}
  ${rows.length ? `<p>Latest: ${rows[rows.length - 1].v} ${m === 'vol' ? (nw ? 'reps' : 'kg total') : (m === 'e1' ? 'kg est. 1RM' : unit)}</p>` : ''}</div>
  ${rows.length ? `<div class="card"><table><tr><th>Date</th><th>Wk</th><th>Sets</th></tr>${rows.slice(-10).reverse().map(r =>
      `<tr><td>${fd(r.s.finishedAt)}</td><td>${r.s.week}</td><td>${esc(fmtSets({ noWeight: nw }, r.sets))}</td></tr>`).join('')}</table></div>` : ''}
  ${dailySection()}`;
};

views.info = () => '<h2>Program info</h2>' + window.INFO_HTML;

views.settings = () => `<h2>Settings</h2>
  <div class="card"><h3>Rest timer alerts</h3>
  <label class="chk"><input type="checkbox" data-act="sound-in" ${settings.sound ? 'checked' : ''}> Sound</label>
  <label class="chk"><input type="checkbox" data-act="vib-in" ${settings.vibrate ? 'checked' : ''}> Vibration</label></div>
  <div class="card"><h3>Your data</h3>
  <p>${sessions.length} workouts saved on this phone. Export a backup now and then.</p>
  <div class="row"><button class="btn" data-act="export">Export backup</button><button class="btn ghost" data-act="import-btn">Import</button></div>
  <input id="imp" type="file" accept="application/json,.json" data-act="import-in" style="display:none">
  <p style="margin-top:8px"><small>Storage protection: ${persisted === true ? 'granted' : persisted === false ? 'not granted (browser may clear data if the phone runs low on space)' : 'unknown'}</small></p></div>
  <div class="card"><h3>About</h3><p>MetriX Train ${VERSION}</p><button class="btn ghost" data-act="update">Update app</button></div>
  <button class="btn danger" data-act="reset">Delete all data</button>`;

/* ---------- actions ---------- */
function firstIncomplete(c) { const i = c.exercises.findIndex(x => x.sets.some(t => !t.done)); return i < 0 ? 0 : i; }

async function exportData() {
  const data = { app: 'metrix-train', schema: 1, exportedAt: new Date().toISOString(), sessions, daily, settings };
  const name = 'metrix-train-' + new Date().toISOString().slice(0, 10) + '.json';
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  try {
    const f = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'MetriX Train backup' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d || !Array.isArray(d.sessions)) throw new Error('Not a MetriX Train backup');
      let add = 0, upd = 0;
      d.sessions.forEach(s => {
        if (!s || !s.id || !Array.isArray(s.exercises)) return;
        const i = sessions.findIndex(x => x.id === s.id);
        if (i < 0) { sessions.push(s); add++; } else if ((s.updatedAt || 0) > (sessions[i].updatedAt || 0)) { sessions[i] = s; upd++; }
      });
      if (d.daily && typeof d.daily === 'object') { Object.keys(d.daily).forEach(k => { if (!daily[k]) daily[k] = d.daily[k]; }); saveDaily(); }
      saveSessions(); toast('Imported ' + add + ' new, ' + upd + ' updated'); render();
    } catch (e) { toast('Import failed: ' + e.message); }
  };
  fr.readAsText(file);
}

async function act(a, el) {
  const i = +el.dataset.i, j = +el.dataset.j;
  switch (a) {
    case 'start':
      if (active && !confirm('You have a workout in progress. Replace it?')) return;
      startSession(nextWorkout()); break;
    case 'resume': open = firstIncomplete(active); go('workout'); break;
    case 'discard': if (confirm('Discard the workout in progress?')) { active = null; LSset('mx.active', null); render(); } break;
    case 'picker': go('home', { picker: true }, true); break;
    case 'pick-cancel': go('home', {}, true); break;
    case 'pick-apply':
      settings.override = { week: Math.max(1, parseInt($('#pk-week').value, 10) || 1), dayKey: $('#pk-day').value };
      saveSettings(); go('home', {}, true); break;
    case 'toggle': open = open === i ? -1 : i; render(); break;
    case 'w+': case 'w-': {
      const c = cur(), x = c.exercises[i], ex = slot[x.slotId], inc = ex ? getInc(ex) : 2.5;
      setW(c, i, j, Math.max(0, rnd((x.sets[j].w || 0) + (a === 'w+' ? inc : -inc)))); persist(); render(); break;
    }
    case 'r+': case 'r-': {
      const t = cur().exercises[i].sets[j]; t.r = Math.max(0, (t.r || 0) + (a === 'r+' ? 1 : -1)); persist(); render(); break;
    }
    case 'w-in': {
      const v = parseFloat(String(el.value).replace(',', '.'));
      setW(cur(), i, j, isNaN(v) || v < 0 ? 0 : rnd(v)); persist(); syncInputs(i); break;
    }
    case 'r-in': {
      const v = parseInt(el.value, 10); cur().exercises[i].sets[j].r = isNaN(v) || v < 0 ? 0 : v; persist(); break;
    }
    case 'done': {
      const c = cur(), x = c.exercises[i], t = x.sets[j];
      t.done = !t.done;
      let moved = false;
      if (t.done) {
        buzz(20);
        if (!view.params.edit) { const ex = slot[x.slotId]; if (ex) startTimer(ex.rest[0], ex.rest[1]); }
        if (x.sets.every(s => s.done)) { const nx = c.exercises.findIndex((y, k) => k > i && y.sets.some(s => !s.done)); open = nx >= 0 ? nx : i; moved = nx >= 0; }
      }
      persist(); render();
      if (moved) setTimeout(() => { const e = document.querySelector('.ex.open'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
      break;
    }
    case 'apply': cur().exercises[i].sets.forEach(t => { if (!t.done) t.w = parseFloat(el.dataset.w); }); persist(); render(); break;
    case 'addset': { const s = cur().exercises[i].sets, l = s[s.length - 1] || { w: 0, r: 8 }; s.push({ w: l.w, r: l.r, done: false }); persist(); render(); break; }
    case 'rmset': {
      const s = cur().exercises[i].sets;
      if (s.length > 1 && !s[s.length - 1].done) { s.pop(); persist(); render(); } else toast('Only an unfinished last set can be removed.');
      break;
    }
    case 'inc': {
      const ex = slot[cur().exercises[i].slotId]; if (!ex) break;
      const steps = [1, 1.25, 2.5, 5, 10]; settings.inc[ex.name] = steps[(steps.indexOf(getInc(ex)) + 1) % steps.length];
      saveSettings(); render(); break;
    }
    case 'tpre': startTimer(+el.dataset.s, +el.dataset.s); render(); break;
    case 'tskip': timer = null; saveTimer(); render(); break;
    case 't+30': {
      timer.min += 30; timer.max += 30;
      const s = (Date.now() - timer.start) / 1000; timer.f1 = s >= timer.min ? 1 : 0; timer.f2 = s >= timer.max ? 1 : 0;
      saveTimer(); render(); break;
    }
    case 'exit':
      if (view.params.edit) { if (!confirm('Discard your edits?')) return; const id = editing.id; editing = null; go('session', { id }, true); }
      else go('home', {}, true);
      break;
    case 'finish': {
      const c = active, left = totalCount(c) - doneCount(c);
      if (doneCount(c) === 0) { toast('No sets logged yet.'); break; }
      if (left > 0 && !confirm(left + ' sets not done. Finish anyway? Unfinished sets are not saved.')) break;
      finishWorkout(); break;
    }
    case 'save-edit': {
      const e = editing;
      const ex = e.exercises.map(x => ({ slotId: x.slotId, name: x.name, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true })) })).filter(x => x.sets.length);
      if (!ex.length) { toast('A workout needs at least one done set. Use Delete in History instead.'); break; }
      const k = sessions.findIndex(s => s.id === e.id);
      if (k >= 0) sessions[k] = Object.assign({}, sessions[k], { exercises: ex, updatedAt: Date.now() });
      saveSessions(); editing = null; toast('Saved'); go('session', { id: e.id }, true); break;
    }
    case 'daily-in': {
      const k = todayKey(), f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      daily[k] = daily[k] || {};
      if (isNaN(v) || v < 0) delete daily[k][f]; else daily[k][f] = f === 'steps' ? Math.round(v) : rnd(v);
      if (!Object.keys(daily[k]).length) delete daily[k];
      saveDaily(); toast('Saved'); break;
    }
    case 'summary-done': go('home', {}, true); break;
    case 'note-in': { const s = sessions.find(x => x.id === el.dataset.id); if (s) { s.note = el.value; s.updatedAt = Date.now(); saveSessions(); } break; }
    case 'open-session': go('session', { id: el.dataset.id }); break;
    case 'edit-session': {
      const s = sessions.find(x => x.id === el.dataset.id); if (!s) break;
      editing = clone(s); editing.exercises.forEach(x => x.sets.forEach(t => { t.done = true; }));
      open = 0; go('workout', { edit: true }); break;
    }
    case 'delete-session':
      if (confirm('Delete this workout permanently?')) { sessions = sessions.filter(s => s.id !== el.dataset.id); saveSessions(); go('history', {}, true); }
      break;
    case 'ex-sel': go('progress', { name: el.value }, true); break;
    case 'metric': go('progress', { name: ($('[data-act="ex-sel"]') || {}).value, metric: el.dataset.m }, true); break;
    case 'sound-in': settings.sound = el.checked; saveSettings(); if (el.checked) { unlockAudio(); beep(1); } break;
    case 'vib-in': settings.vibrate = el.checked; saveSettings(); if (el.checked) buzz(100); break;
    case 'export': exportData(); break;
    case 'import-btn': $('#imp').click(); break;
    case 'import-in': if (el.files && el.files[0]) importData(el.files[0]); break;
    case 'update': {
      try {
        if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
      } catch (e) {}
      location.reload(); break;
    }
    case 'reset':
      if (confirm('Delete ALL workouts on this phone? Export a backup first.') && confirm('Really delete everything? This cannot be undone.')) {
        ['mx.sessions', 'mx.active', 'mx.settings', 'mx.timer', 'mx.daily'].forEach(k => localStorage.removeItem(k));
        sessions = []; daily = {}; active = null; timer = null; settings = { inc: {}, sound: true, vibrate: true, override: null };
        toast('All data deleted'); go('home', {}, true);
      }
      break;
    case 'reload': location.reload(); break;
  }
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]');
  if (!a || ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName)) return;
  act(a.dataset.act, a);
});
document.addEventListener('change', e => {
  const a = e.target.closest('[data-act]');
  if (a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName)) act(a.dataset.act, a);
});
document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); tick(); } });

/* ---------- init ---------- */
(function init() {
  if (timer) {
    const s = (Date.now() - timer.start) / 1000;
    if (s > timer.max + 900) { timer = null; saveTimer(); } else { timer.f1 = s >= timer.min ? 1 : 0; timer.f2 = s >= timer.max ? 1 : 0; }
  }
  if (active) { open = firstIncomplete(active); view = { name: 'workout', params: {} }; }
  try { history.replaceState({ name: view.name, params: view.params }, ''); } catch (e) {}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(r => { persisted = r; }).catch(() => {});
  render();
  setInterval(tick, 500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
})();
