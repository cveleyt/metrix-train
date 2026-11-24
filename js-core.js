/* MetriX Train: personal workout logger. No dependencies. Data is stored in localStorage.
   The app is split into several classic scripts that share one global scope; load order matters (see index.html). */
/* Core: version, users, helpers, state, progression, rest timer, theme, navigation. */
'use strict';
const VERSION = '3.1.2';
const CHANGELOG = [
  { v: '3.1.2', items: ['Fuel: your saved foods are folded into one row you can open, with a search box. Matching foods still pop up while you type'] },
  { v: '3.1.1', items: ['Supplements: type the product and how much you take, and the AI looks up the label and works out what one dose gives you (caffeine, citrulline and so on). Check and edit before saving. Caffeine today shows on the stack'] },
  { v: '3.1.0', items: ['Daily check-in on Today: energy, soreness, stress and sleep quality, each on a 1 to 5 scale with words. Anytime, skip freely', 'Water tracking with quick add and undo, goal set in Goals', 'Supplements: add your own with dose and timing, tick them off each day', 'Sleep: type bed and wake time and the hours fill in', 'Streaks: days logged, training weeks and water goal days'] },
  { v: '3.0.0', items: ['Internal clean-up: the app code is split into several files so new features come faster and safer. Nothing should look different', 'Accessibility: clearer focus outlines and labels'] },
  { v: '2.9.0', items: ['Cloud accounts: log in with your username and password on any phone, and your data is backed up and synced automatically. You will need to log in once more after this update', 'Me shows the sync status and a Sync now button. Delete all data now also deletes your cloud copy'] },
  { v: '2.8.0', items: ['Notes on every exercise: a note dot, quick tags (Too heavy, Too easy, Pain, Form check, Change machine) and machine settings. They show up next time, and a new Notes tab in Trends lists them all', 'Rest timer: hiding it now shrinks it to a small round button you can drag. It keeps running and opens when tapped. Stop is only inside the open timer', 'Skip an exercise (with a reason) or add an exercise to today\'s workout'] },
  { v: '2.7.0', items: ['Trends: new Muscles tab (hard sets per muscle each week), Body tab (measurements and progress photos) and Review tab (weekly numbers, tips and an optional AI coach note)', 'Warm-up sets, optional how-hard rating per set (turn on in Me), and a deload week suggestion', 'Scan a barcode in Fuel to find a product', 'Switch between kg and lb, cm and inches in Me', 'Export workouts, food and body as CSV', 'Home screen shortcuts: hold the app icon'] },
  { v: '2.6.0', items: ['Goal can be both Lose fat and Build muscle (body recomposition)', 'Safer recommendations: calorie floor, health check and an option to hide calories', 'AI asks your OK before sending anything to Google', 'Backup reminder every week, fonts now stored in the app, easier keyboard and screen reader use'] },
  { v: '2.5.0', items: ['Users: each person logs in to their own program and their own data', 'Profile and AI recommendations for steps, calories, protein, carbs, fat, fiber and sleep', 'Update now asks first, then shows what is new'] },
  { v: '2.4.0', items: ['Meals: breakfast, snacks, lunch and dinner, picked from your text or with a tap'] },
  { v: '2.3.0', items: ['Today reworked: Fuel first, Next up with the program, compact Day Score', 'Bigger food box'] },
  { v: '2.2.0', items: ['Rest timer: adjust, start, pause, stop and log the rest'] }
];
const USERS = window.USERS || [];
let USER = null;
try { const id = localStorage.getItem('mx.user') || '', h = localStorage.getItem('mx.auth'); USER = window.MXSYNC ? (window.MXSYNC.has() ? USERS.find(u => u.id === id) || null : null) : (USERS.find(u => u.id === id && u.hash === h) || (!id && USERS[0] && USERS[0].hash === h ? USERS[0] : null)); } catch (e) {}
const KP = USER && !USER.legacy ? 'mx.' + USER.id + '.' : 'mx.';
const K = k => KP + k.slice(3);
const P = (USER && window.PROGRAMS && window.PROGRAMS[USER.program]) || window.PROGRAM, DAYS = P.days;

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
function LSget(k, d) { try { const v = localStorage.getItem(K(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function LSset(k, v) {
  try { localStorage.setItem(K(k), JSON.stringify(v)); return true; }
  catch (e) { toast('Could not save. Storage may be full or blocked.'); return false; }
}
function toast(m) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = m; t.className = 'show';
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = ''; }, 2600);
}

/* ---------- state ---------- */
let sessions = LSget('mx.sessions', []);        // completed workouts
let active = LSget('mx.active', null);          // workout in progress
let editing = null;                             // past session being edited (memory only)
let settings = Object.assign({ inc: {}, sound: true, vibrate: true, override: null }, LSget('mx.settings', {}));
settings.ai = Object.assign({ key: '', model: 'gemini-3.1-flash-lite' }, settings.ai || {});
settings.goals = Object.assign({ steps: 10000, sleep: 8, protein: 130, water: 2500 }, settings.goals || {});
let timer = LSget('mx.timer', null);
let daily = LSget('mx.daily', {});             // {YYYY-MM-DD: {steps, sleep}}
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const saveDaily = () => LSset('mx.daily', daily);
let food = LSget('mx.food', {});               // {YYYY-MM-DD: [{id, t, name, kcal, p, c}]}
const saveFood = () => LSset('mx.food', food);
let myfoods = LSget('mx.myfoods', []);        // [{id, name, kcal, p, c, n, last}]
const saveMy = () => LSset('mx.myfoods', myfoods);
let dbRes = [];
let notes = LSget('mx.notes', {});            // {exerciseName: {machine, note, tags, at}}
let notelog = LSget('mx.notelog', []);        // [{t, name, note, tags}]
const saveNotes = () => { LSset('mx.notes', notes); LSset('mx.notelog', notelog); };
const NTAGS = ['Too heavy', 'Too easy', 'Pain', 'Form check', 'Change machine'];
let fabMoved = false;
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

const doneCount = s => s.exercises.reduce((n, x) => x.skipped ? n : n + x.sets.filter(t => t.done).length, 0);
const totalCount = s => s.exercises.reduce((n, x) => x.skipped ? n : n + x.sets.length, 0);
const volume = s => s.exercises.reduce((v, x) => v + x.sets.reduce((a, t) => a + (t.done ? t.w * t.r : 0), 0), 0);
const score = (w, r) => (w > 0 ? w * (1 + r / 30) : r);   // estimated 1RM, or reps for bodyweight work
const sortedDesc = () => sessions.slice().sort((a, b) => b.finishedAt - a.finishedAt);
const getInc = ex => settings.inc[ex.name] || 2.5;
const restTxt = r => ((r[0] >= 120 && r[0] % 60 === 0 && r[1] % 60 === 0)
  ? (r[0] / 60) + '-' + (r[1] / 60) + ' min' : (r[0] === r[1] ? r[0] + 's' : r[0] + '-' + r[1] + 's'));
const fmtSets = (ex, sets) => sets.map(t => (ex.noWeight ? t.r : r1(dw(t.w)) + 'x' + t.r)).join(', ');

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
    return { tag: 'ADD WEIGHT', text: `Every set reached ${ex.hi} reps last time. Try ${r1(dw(nw))} ${UW()} and build reps back up.`, apply: nw };
  }
  const src = prev.same ? '' : ` Last numbers are from ${(dayOf(prev.s.dayKey) || {}).name || 'another day'}, where the rep range may differ.`;
  return { tag: 'BEAT LAST TIME', text: `Match last time, then add a rep. Goal: every set at ${ex.hi} reps.${src}` };
}

function startSession(sel) {
  const day = dayOf(sel.dayKey) || DAYS[0];
  active = {
    id: uid(), week: sel.week, dayKey: day.key, name: day.name, startedAt: Date.now(), deload: deloadOn() || undefined,
    exercises: day.exercises.map(ex => {
      const prev = prevFor(ex);
      const sets = [...Array(deloadOn() ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets)].map((_, i) => {
        const p = prev ? (prev.sets[i] || prev.sets[prev.sets.length - 1]) : null;
        return { w: ex.noWeight ? 0 : (p ? p.w : 0), r: p ? p.r : ex.lo, done: false };
      });
      return { slotId: ex.id, name: ex.name, sets };
    })
  };
  settings.override = null; saveSettings(); LSset('mx.active', active);
  open = 0; replacing = -1; go('workout');
}

function finishWorkout() {
  const c = active;
  const s = {
    id: c.id, week: c.week, dayKey: c.dayKey, name: c.name, startedAt: c.startedAt, finishedAt: Date.now(), deload: c.deload, skipped: c.exercises.filter(x => x.skipped && !x.sets.some(t => t.done)).map(x => ({ name: x.name, why: x.skipWhy || '' })), note: '', updatedAt: Date.now(),
    exercises: c.exercises.map(x => ({ slotId: x.orig ? null : x.slotId, name: x.name, nw: x.nw, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true, rest: t.rest, rpe: t.rpe })), warm: (x.warm || []).filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true })) })).filter(x => x.sets.length)
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
    if (el.dataset.act !== 'w-in' && el.dataset.act !== 'r-in') return;
    const t = c.exercises[i].sets[+el.dataset.j];
    if (t) el.value = (el.dataset.act === 'w-in' ? dw(t.w) : t.r) || '';
  });
}

/* ---------- rest timer ---------- */
const tel = t => ((t.acc || 0) + (t.state === 'run' && t.start ? (Date.now() - t.start) / 1000 : 0));
function startTimer(min, max, next, ref, force) {
  const run = force || settings.autoStart !== false;
  timer = { state: run ? 'run' : 'idle', start: run ? Date.now() : null, acc: 0, min, max, f1: 0, f2: 0, pop: true, next: next || '', ref: ref || null };
  saveTimer();
}
function stopTimer(log) {
  if (!timer) return;
  const el = Math.round(tel(timer)), ref = timer.ref;
  if (log && el > 0 && ref && active && active.exercises[ref.i] && active.exercises[ref.i].sets[ref.j]) { active.exercises[ref.i].sets[ref.j].rest = el; persist(); toast('Rest logged: ' + fdur(el * 1000)); }
  timer = null; saveTimer();
}
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
  const st = timer.state || 'run', s = tel(timer);
  if (st === 'run') {
    if (!timer.f1 && s >= timer.min) {
      timer.f1 = 1; timer.pop = true; saveTimer(); alertUser(1);
      if (view.name === 'workout' && !view.params.edit) { render(); return; }
    }
    if (!timer.f2 && timer.max > timer.min && s >= timer.max) { timer.f2 = 1; saveTimer(); alertUser(2); }
  }
  const ready = st !== 'idle' && s >= timer.min, rem = Math.max(0, timer.min - s);
  const pp = $('#pp-time');
  if (pp) {
    pp.textContent = st === 'idle' ? fdur(timer.min * 1000) : ready ? 'GO' : fdur(Math.ceil(rem) * 1000);
    $('#pp-label').textContent = st === 'idle' ? 'READY TO START' : st === 'pause' ? 'PAUSED' : ready ? 'READY FOR THE NEXT SET' : 'REST';
    $('#pp-sub').textContent = ready ? (timer.max > timer.min && s < timer.max ? 'up to ' + fdur(timer.max * 1000) : 'Rest complete') : 'ready at ' + fdur(timer.min * 1000) + (timer.max > timer.min ? ', up to ' + fdur(timer.max * 1000) : '');
    setTicks(st === 'idle' ? 0 : ready ? 1 : 1 - rem / timer.min);
    $('#pp-card').classList.toggle('ready', ready && st === 'run');
  }
  const m = $('#tmr-main'); if (!m) return;
  const r2 = timer.min - s;
  m.textContent = st === 'idle' ? fdur(timer.min * 1000) : r2 > 0 ? fdur(Math.ceil(r2) * 1000) : '+' + fdur(-r2 * 1000);
  $('#tmr-lab').textContent = st === 'idle' ? 'Ready to start' : st === 'pause' ? 'Paused' : r2 > 0 ? 'Rest, ready at ' + fdur(timer.min * 1000) : (s < timer.max ? 'Ready. Up to ' + fdur(timer.max * 1000) : 'Rest is over');
  $('#tmr-fill').style.width = Math.min(100, s / timer.max * 100) + '%';
  const fs = $('#tfab-st'); if (fs) fs.textContent = st === 'idle' ? 'START' : st === 'pause' ? 'PAUSED' : ready ? 'READY' : 'REST';
  const fb = $('#tfab'); if (fb) fb.classList.toggle('rdy', ready && st === 'run');
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

/* ---------- theme ---------- */
function applyTheme() {
  const t = settings.theme || 'system', r = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = r;
  document.documentElement.style.zoom = settings.scale || 0.8;
  const tc = $('#tc'); if (tc) tc.content = r === 'light' ? '#eef1fa' : '#080a14';
}
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if ((settings.theme || 'system') === 'system') applyTheme(); }); } catch (e) {}

/* ---------- navigation ---------- */
function go(name, params, replace) {
  view = { name, params: params || {} };
  const st = { name: view.name, params: view.params };
  try { replace ? history.replaceState(st, '') : history.pushState(st, ''); } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}
  render();
}
window.addEventListener('popstate', e => { view = e.state || { name: 'home', params: {} }; render(); });
const ALIAS = { history: 'trends', progress: 'trends', settings: 'me' };
const tabOf = n => ({ workout: 'train', summary: 'train', info: 'train', session: 'trends', day: 'trends', goals: 'me', profile: 'me' }[n] || n);

