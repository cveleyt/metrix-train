/* MetriX Train: personal workout logger. No dependencies. Data is stored in localStorage. */
(function () {
'use strict';
const VERSION = '2.2.0';
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
settings.ai = Object.assign({ key: '', model: 'gemini-3.1-flash-lite' }, settings.ai || {});
settings.goals = Object.assign({ steps: 10000, sleep: 8, protein: 130 }, settings.goals || {});
let timer = LSget('mx.timer', null);
let daily = LSget('mx.daily', {});             // {YYYY-MM-DD: {steps, sleep}}
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const saveDaily = () => LSset('mx.daily', daily);
let food = LSget('mx.food', {});               // {YYYY-MM-DD: [{id, t, name, kcal, p, c}]}
const saveFood = () => LSset('mx.food', food);
let myfoods = LSget('mx.myfoods', []);        // [{id, name, kcal, p, c, n, last}]
const saveMy = () => LSset('mx.myfoods', myfoods);
let dbRes = [];
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
  open = 0; replacing = -1; go('workout');
}

function finishWorkout() {
  const c = active;
  const s = {
    id: c.id, week: c.week, dayKey: c.dayKey, name: c.name, startedAt: c.startedAt, finishedAt: Date.now(), note: '', updatedAt: Date.now(),
    exercises: c.exercises.map(x => ({ slotId: x.orig ? null : x.slotId, name: x.name, nw: x.nw, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true, rest: t.rest })) })).filter(x => x.sets.length)
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
const tabOf = n => ({ workout: 'train', summary: 'train', info: 'train', session: 'trends', day: 'trends', goals: 'me' }[n] || n);

/* ---------- login gate (device lock, not server security) ---------- */
const AUTH_HASH = '0123ff82cefb4c6119472a6f8fcf5bc0e5a5e518a0258a530becf887baf78f0f';
const isAuthed = () => { try { return localStorage.getItem('mx.auth') === AUTH_HASH; } catch (e) { return false; } };
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const loginHTML = err => `<form id="login" autocomplete="on" style="padding-top:8vh;text-align:center">
  <div style="display:flex;justify-content:center">${tickRing(150, 1, 'var(--acc)', '<div class="n" style="font-size:54px;color:var(--acct)">MX</div>', 60, 3, 12)}</div>
  <h2 style="margin:18px 0 4px;font-size:46px">MetriX Train</h2><p>Log in to continue</p>
  <div style="text-align:left;margin-top:22px"><label>Username<input id="lg-u" name="username" autocomplete="username" autocapitalize="none" required style="height:54px"></label>
  <label>Password<input id="lg-p" name="password" type="password" autocomplete="current-password" required style="height:54px"></label>
  ${err ? '<p role="alert" class="tg" style="color:var(--rest);margin:8px 0 12px">WRONG USERNAME OR PASSWORD</p>' : ''}</div>
  <button class="btn" type="submit">Log in</button></form>`;
document.addEventListener('submit', async e => {
  if (e.target.id !== 'login') return;
  e.preventDefault();
  const u = $('#lg-u').value.trim().toLowerCase(), p = $('#lg-p').value;
  let h = ''; try { h = await sha256('mx-train|' + u + '|' + p); } catch (x) {}
  if (h === AUTH_HASH) { try { localStorage.setItem('mx.auth', AUTH_HASH); } catch (x) {} render(); }
  else { $('#app').innerHTML = loginHTML(true); }
});

function render() {
  const app = $('#app');
  if (ALIAS[view.name]) view.name = ALIAS[view.name];
  if (!views[view.name]) view.name = 'home';
  if (!isAuthed()) { app.innerHTML = loginHTML(false); $('#tabs').style.display = 'none'; return; }
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
const homeBtn = '<button class="btn ghost" data-go="home">Back to Today</button>';

const dateKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const sleepTxt = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };
const RC = 2 * Math.PI * 40;
function tickRing(sz, pct, col, ctr, n, w, ln) {
  n = n || 60; w = w || 3; ln = ln || 10;
  const r2 = sz / 2 - 2, r1 = r2 - ln, c = sz / 2, k = Math.round(n * Math.max(0, Math.min(1, pct || 0))); let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 360 / n - 90) * Math.PI / 180;
    s += `<line x1="${(c + r1 * Math.cos(a)).toFixed(1)}" y1="${(c + r1 * Math.sin(a)).toFixed(1)}" x2="${(c + r2 * Math.cos(a)).toFixed(1)}" y2="${(c + r2 * Math.sin(a)).toFixed(1)}" style="stroke:${i < k ? col : 'var(--bar)'}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  return `<div style="position:relative;width:${sz}px;height:${sz}px;flex:none"><svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-hidden="true">${s}</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">${ctr}</div></div>`;
}
function miniBars(vals, col, w, h, goal, label) {
  const have = vals.filter(v => v != null), mx = (Math.max(goal || 0, ...have, 1)) * 1.08, n = vals.length, bw = w / n;
  let s = vals.map((v, i) => v == null ? '' : `<rect x="${(i * bw + 1).toFixed(1)}" y="${(h - Math.max(2, v / mx * (h - 2))).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${Math.max(2, v / mx * (h - 2)).toFixed(1)}" rx="2" style="fill:${col}" opacity="${i === n - 1 ? 1 : 0.55}"/>`).join('');
  if (goal > 0) { const gy = h - goal / mx * (h - 2); s += `<line x1="0" x2="${w}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--dim)" stroke-dasharray="3 3"/>`; }
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(label || 'Chart')}">${s}</svg>`;
}
function spark(vals, col, w, h, label) {
  const pts = vals.map((v, i) => v == null ? null : [i, v]).filter(Boolean);
  if (pts.length < 2) return `<div class="dim" style="font-size:12px;padding:10px 0">Log at least two days to see the trend.</div>`;
  const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])), n = vals.length, pad = 6;
  const x = i => pad + i * (w - 2 * pad) / Math.max(1, n - 1), y = v => h - pad - (v - lo) / ((hi - lo) || 1) * (h - 2 * pad);
  const line = pts.map(p => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(label || 'Trend')}"><polyline points="${line}" fill="none" style="stroke:${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${pts.map(p => `<circle cx="${x(p[0]).toFixed(1)}" cy="${y(p[1]).toFixed(1)}" r="${n > 30 ? 2 : 3.5}" style="fill:${col}"/>`).join('')}</svg>`;
}
function bodyTile() {
  const ds = lastDays(14), vals = ds.map(k => (daily[k] || {}).weight), have = vals.filter(v => v != null);
  const latest = have.length ? have[have.length - 1] : null, t = (daily[todayKey()] || {}).weight;
  const a = vals.slice(7).filter(v => v != null), b = vals.slice(0, 7).filter(v => v != null);
  const av = x => x.reduce((p, q) => p + q, 0) / x.length;
  let tag = latest == null ? 'NOT LOGGED' : 'LOGGED', sub = '7 day average: -';
  if (a.length) { sub = '7 day avg ' + r1(av(a)) + ' kg'; if (b.length) { const d = av(a) - av(b); tag = Math.abs(d) < 0.05 ? 'SAME' : (d > 0 ? 'UP ' : 'DOWN ') + Math.abs(r1(d)) + ' KG'; } }
  const tw = settings.goals.weight;
  if (tw > 0 && latest != null) { const dd = r1(latest - tw); sub += '. Target ' + tw + ' kg, ' + (Math.abs(dd) < 0.05 ? 'reached' : Math.abs(dd) + ' kg ' + (dd > 0 ? 'to lose' : 'to gain')); }
  return `<div class="card" style="padding:14px;margin:12px 0 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="ic" style="background:color-mix(in srgb,var(--body) 18%,transparent);color:var(--body)">BW</span><span class="t" style="color:var(--body)">${tag}</span></div>
  <div class="m" style="margin-top:10px">BODY WEIGHT${t == null && latest != null ? ', LAST LOGGED' : ''}</div><div class="n" style="font-size:32px;margin:2px 0">${latest == null ? '-' : r1(latest)}<span style="font-size:14px;color:var(--dim)"> kg</span></div><div class="dim" style="font-size:12px;margin-bottom:6px">${sub}</div>${spark(vals, 'var(--body)', 330, 56, 'Body weight, last 14 days')}</div>`;
} const lastDays = n => { const o = []; for (let i = n - 1; i >= 0; i--) o.push(kAdd(todayKey(), -i)); return o; };
const dayFood = k => food[k] || [];
const foodTot = k => dayFood(k).reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0), fi: a.fi + (e.fi || 0) }), { kcal: 0, p: 0, c: 0, f: 0, fi: 0 });
const MAC = [['p', 'Protein', 'protein', 'var(--prot)'], ['c', 'Carbs', 'carbs', 'var(--carb)'], ['f', 'Fat', 'fat', 'var(--fat)'], ['fi', 'Fiber', 'fiber', 'var(--fib)']];
const r1 = v => Math.round(v * 10) / 10;
function applyDb() {
  const p = window.__dbp, g = parseFloat(($('#fd-g') || {}).value); if (!p || isNaN(g)) return;
  const n = p.nutriments, f = g / 100;
  $('#fd-kcal').value = Math.round((n['energy-kcal_100g'] || 0) * f);
  $('#fd-p').value = r1((n.proteins_100g || 0) * f);
  $('#fd-c').value = r1((n.carbohydrates_100g || 0) * f);
  $('#fd-f').value = r1((n.fat_100g || 0) * f);
  $('#fd-fi').value = r1((n.fiber_100g || 0) * f);
}
function sugHTML(q) {
  q = (q || '').trim().toLowerCase();
  const list = myfoods.filter(f => !q || f.name.toLowerCase().includes(q)).sort((a, b) => (q ? b.n - a.n : b.last - a.last)).slice(0, 5);
  if (!list.length) return '';
  return (q ? '' : '<small style="width:100%">Your foods, tap to fill instantly</small>') + list.map(f => `<button data-act="food-pick" data-id="${f.id}">${esc(f.name)} <small>${f.kcal} kcal</small></button>`).join('');
}
function macroRow(k, label, unit, val, goal, col) {
  const rem = goal > 0 ? goal - val : null, hit = k === 'p' || k === 'fi';
  const tag = goal > 0 ? (rem > 0 ? Math.round(rem) + ' ' + unit.toUpperCase() + ' TO GO' : (hit ? 'GOAL HIT' : rem >= -0.1 * goal ? 'GOAL REACHED' : 'OVER BY ' + Math.round(-rem) + ' ' + unit.toUpperCase())) : 'NO GOAL SET';
  return `<div style="padding:12px 0;border-top:1px solid var(--line)"><div class="brow"><span style="font-weight:600">${label}</span><span><b>${Math.round(val).toLocaleString()}</b> <small>${goal > 0 ? '/ ' + goal.toLocaleString() + ' ' : ''}${unit}</small></span></div>
  ${goal > 0 ? `<div class="bar" role="img" aria-label="${label} ${Math.round(Math.min(1, val / goal) * 100)} percent of goal"><i style="width:${(Math.min(1, val / goal) * 100).toFixed(0)}%;background:${col}"></i></div>` : ''}<div class="tg" style="color:${col}">${tag}</div></div>`;
}

/* ---------- today ---------- */
function scoreCard() {
  const k = todayKey(), i = dayInfo(k), g = settings.goals, d = daily[k] || {}, f = foodTot(k);
  const row = (lab, val, tag, col) => `<div class="li" style="padding:11px 0"><span>${lab} <small>${val}</small></span><span><span class="t" style="color:${col}">${tag}</span></span></div>`;
  const rows = [
    row('Rest', d.sleep == null ? '' : sleepTxt(d.sleep), d.sleep == null ? 'NOT LOGGED' : d.sleep >= g.sleep ? 'HIT' : 'MISSED BY ' + Math.round((g.sleep - d.sleep) * 60) + ' MIN', 'var(--rest)'),
    row('Move', d.steps == null ? '' : d.steps.toLocaleString() + ' steps', d.steps == null ? 'NOT LOGGED' : d.steps >= g.steps ? 'HIT' : 'IN PROGRESS', 'var(--move)'),
    row('Fuel', g.protein > 0 ? Math.round(f.p) + ' of ' + g.protein + ' g protein' : '', !f.p ? 'NOT LOGGED' : g.protein > 0 && f.p >= g.protein ? 'HIT' : 'IN PROGRESS', 'var(--prot)'),
    row('Train', '', i.ss.length ? 'DONE' : active ? 'IN PROGRESS' : 'NEXT', 'var(--acct)')
  ].join('');
  return `<div class="cut" style="padding:18px 16px 8px"><div class="row" style="justify-content:space-between"><span class="m">DAY SCORE</span><span class="m">${esc(fd(Date.now()))}</span></div>
  <div style="display:flex;justify-content:center;margin:10px 0 8px">${tickRing(196, i.of ? i.hit / i.of : 0, 'var(--acc)', `<div class="n" style="font-size:76px">${i.hit}<span style="font-size:34px;color:var(--dim)">/${i.of}</span></div><div class="m" style="margin-top:4px">TARGETS HIT</div>`, 72, 3.5, 14)}</div>${rows}</div>`;
}
function tilesHTML() {
  const g = settings.goals, ds = lastDays(7), t = daily[todayKey()] || {};
  const tile = (ic, col, lab, big, unit, sub, tag, chart) => `<div class="card" style="padding:14px;margin:0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="ic" style="background:color-mix(in srgb,${col} 18%,transparent);color:${col}">${ic}</span><span class="t" style="color:${col}">${tag}</span></div>
  <div class="m" style="margin-top:10px">${lab}</div><div class="n" style="font-size:32px;margin:2px 0">${big}<span style="font-size:14px;color:var(--dim)"> ${unit}</span></div><div class="dim" style="font-size:12px;margin-bottom:8px">${sub}</div>${chart}</div>`;
  const sp = t.steps == null ? 0 : Math.round(t.steps / g.steps * 100);
  return `<div class="two">${tile('MV', 'var(--move)', 'MOVE', t.steps == null ? '-' : t.steps.toLocaleString(), 'steps', 'Goal ' + g.steps.toLocaleString(), t.steps == null ? 'NOT LOGGED' : sp + '%', miniBars(ds.map(k => (daily[k] || {}).steps), 'var(--move)', 130, 40, g.steps, 'Steps, last 7 days'))}
  ${tile('RS', 'var(--rest)', 'REST', t.sleep == null ? '-' : sleepTxt(t.sleep), '', 'Goal ' + g.sleep + ' h, last night', t.sleep == null ? 'NOT LOGGED' : t.sleep >= g.sleep ? 'HIT' : 'SHORT', miniBars(ds.map(k => (daily[k] || {}).sleep), 'var(--rest)', 130, 40, g.sleep, 'Sleep, last 7 days'))}</div>`;
}
const tilesAll = () => tilesHTML() + bodyTile();
function refreshRings() { const a = $('#score-box'), b = $('#tiles'); if (a) a.innerHTML = scoreCard(); if (b) b.innerHTML = tilesAll(); }
function weekStrip() {
  const mon = mondayOf(todayKey()), tk = todayKey();
  return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:16px 0">${[0, 1, 2, 3, 4, 5, 6].map(n => {
    const k = kAdd(mon, n), i = dayInfo(k), today = k === tk, fut = k > tk;
    return `<button data-act="open-day" data-k="${k}" style="text-align:center" aria-label="${kLong(k)}${i.logged ? ', ' + i.hit + ' of ' + i.of : ''}"><div class="m" style="${today ? 'color:var(--ink)' : ''}">${kDate(k).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</div>${tickRing(42, i.logged && i.of ? i.hit / i.of : 0, today ? 'var(--acc)' : 'var(--move)', '', 24, 2.5, 7)}<div class="m" style="margin-top:2px;${today ? 'color:var(--ink)' : ''}">${fut ? '' : i.logged ? i.hit + '/' + i.of : '-'}</div></button>`;
  }).join('')}</div>`;
}
function fuelSummary() {
  const t = foodTot(todayKey()), g = settings.goals, list = dayFood(todayKey());
  return `<button class="card" data-go="fuel" style="display:block;width:100%;margin-top:12px" aria-label="Open Fuel"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><div class="m">FUEL TODAY</div><div class="n" style="font-size:40px;margin-top:6px">${Math.round(t.kcal).toLocaleString()} <span style="font-size:15px;color:var(--dim)">kcal</span></div></div><span class="t" style="color:var(--acct)">${list.length ? list.length + (list.length === 1 ? ' ENTRY' : ' ENTRIES') : 'LOG FOOD'}</span></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px">${MAC.map(([k, l, gk, col]) => `<div><div class="m" style="font-size:9px">${l.toUpperCase()}</div><div class="n" style="font-size:22px;margin:3px 0 5px">${Math.round(t[k])}<span style="font-size:11px;color:var(--dim)"> g</span></div><div class="bar" style="margin-top:0"><i style="width:${g[gk] > 0 ? Math.min(100, t[k] / g[gk] * 100).toFixed(0) : 0}%;background:${col}"></i></div></div>`).join('')}</div></button>`;
}
function logCard() {
  const t = daily[todayKey()] || {};
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">LOG TODAY</span><small>From Samsung Health</small></div>
  <div class="ins" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label>Steps<input data-act="daily-in" data-f="steps" type="number" inputmode="numeric" min="0" value="${t.steps == null ? '' : t.steps}" placeholder="0"></label>
  <label>Sleep (h)<input data-act="daily-in" data-f="sleep" type="number" inputmode="decimal" step="any" min="0" max="24" value="${t.sleep == null ? '' : t.sleep}" placeholder="0"></label>
  <label>Weight (kg)<input data-act="daily-in" data-f="weight" type="number" inputmode="decimal" step="any" min="0" max="400" value="${t.weight == null ? '' : t.weight}" placeholder="0"></label></div>
  <p style="margin:10px 0 0;text-align:center"><small>Type today's numbers. Weigh yourself the same way each morning for a clean trend.</small></p></div>`;
}
function resumeCard() {
  return active ? `<div class="card hl"><span class="tag">IN PROGRESS</span><h3>${esc(active.name)}</h3><p>Week ${active.week}, ${doneCount(active)}/${totalCount(active)} sets done</p>
  <div class="row"><button class="btn" data-act="resume">Resume</button><button class="btn ghost" data-act="discard">Discard</button></div></div>` : '';
}
function nextHero(withChange) {
  const n = nextWorkout(), d = dayOf(n.dayKey) || DAYS[0], setTotal = d.exercises.reduce((a, e) => a + e.sets, 0), more = d.exercises.length - 3;
  const meso = n.week === P.weeks ? '<p><b>Final week.</b> After it, review bodyweight, waist, photos and performance (see Program guide).</p>' : n.week > P.weeks ? '<p><b>Past week ' + P.weeks + '.</b> Decide whether to keep this setup or adjust it.</p>' : '';
  const dayIdx = Math.max(0, DAYS.findIndex(x => x.key === n.dayKey)) + 1;
  return `<div class="hero"><div class="mt"><span class="m">NEXT UP, DAY ${dayIdx} OF ${DAYS.length}</span><span class="m">WEEK ${n.week}</span></div><div class="name">${esc(d.name)}</div>
  <p style="font-weight:500;margin-bottom:12px">${d.exercises.length} exercises, ${setTotal} sets. ${d.exercises.slice(0, 3).map(e => esc(e.name)).join(', ')}${more > 0 ? ' and ' + more + ' more' : ''}</p>${meso}
  <div class="row"><button class="btn" data-act="start">Start workout</button>${withChange ? '<button class="btn ghost sm" data-act="picker">Change</button>' : ''}</div></div>`;
}
const programStrip = () => { const n = nextWorkout(); return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">${P.weeks} WEEK PROGRAM</span><span class="m">WEEK ${Math.min(n.week, P.weeks)} OF ${P.weeks}</span></div><div style="display:grid;grid-template-columns:repeat(${P.weeks},1fr);gap:4px;margin-top:12px">${[...Array(P.weeks)].map((_, k) => `<i style="height:8px;border-radius:2px;background:${k < n.week ? 'var(--acc)' : 'var(--bar)'}"></i>`).join('')}</div></div>`; };
views.home = () => {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><div class="m">${esc(date)}</div><h2 style="margin:4px 0 0;font-size:52px">Today</h2></div>
  <button data-go="me" aria-label="Open Me" style="width:46px;height:46px;border-radius:15px;background:var(--g3);border:1px solid var(--line);display:flex;align-items:center;justify-content:center"><span class="n" style="font-size:24px">E</span></button></div>
  ${weekStrip()}<div id="score-box">${scoreCard()}</div>
  <div style="height:12px"></div>${active ? resumeCard() : nextHero(false)}
  ${'<div class="dl"><b></b><span class="m">LOGGED SO FAR</span><b></b></div>'}<div id="tiles">${tilesAll()}</div>${logCard()}${fuelSummary()}${programStrip()}`;
};
views.train = p => {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week), l = sortedDesc()[0];
  const chips = DAYS.map(x => { const dn = wk.some(s => s.dayKey === x.key), nx = x.key === n.dayKey; return `<div class="chip ${nx ? 'next' : dn ? 'dn' : ''}"><b>${esc(x.name)}</b><span>${dn ? 'DONE' : nx ? 'NEXT' : 'TO DO'}</span></div>`; }).join('');
  const picker = p.picker ? `<div class="card"><h3>Change what is next</h3><label>Week<input id="pk-week" type="number" min="1" inputmode="numeric" value="${n.week}"></label>
    <label>Workout<select id="pk-day">${DAYS.map(x => `<option value="${x.key}" ${x.key === n.dayKey ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="pick-apply">Use this</button><button class="btn ghost" data-act="pick-cancel">Cancel</button></div></div>` : '';
  return `<div class="m">WEEK ${n.week} OF ${P.weeks}</div><h2 style="margin:4px 0 14px;font-size:52px">Train</h2>${resumeCard()}${active ? '' : nextHero(true)}${picker}
  <div class="dl"><b></b><span class="m">THIS WEEK</span><b></b></div><div class="chips">${chips}</div>
  ${l ? `<p>Last workout: ${esc(l.name)} on ${fd(l.finishedAt)}, ${doneCount(l)} sets, ${Math.round(volume(l)).toLocaleString()} kg volume.</p>` : '<p>No workouts logged yet. Your first one sets the baseline.</p>'}
  <button class="card" data-go="info" style="display:block;width:100%"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><b>Program guide</b><br><small>Exercises, tempo, rest and progression rules</small></div><span class="dim">&rsaquo;</span></div></button>`;
};

/* ---------- fuel ---------- */
views.fuel = () => {
  const k = todayKey(), t = foodTot(k), g = settings.goals, list = dayFood(k);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const energy = g.calories > 0
    ? `<div style="display:flex;align-items:center;gap:18px;margin-top:10px">${tickRing(150, t.kcal / g.calories, 'var(--carb)', `<div class="n" style="font-size:36px">${Math.round(t.kcal).toLocaleString()}</div><div class="m">KCAL</div>`, 60, 3, 12)}<div style="flex:1"><div class="m">${g.calories - t.kcal >= 0 ? 'REMAINING' : 'OVER BY'}</div><div class="n" style="font-size:40px;margin:4px 0 8px">${Math.abs(Math.round(g.calories - t.kcal)).toLocaleString()}</div><span class="t" style="color:var(--carb)">${Math.round(t.kcal / g.calories * 100)}% OF GOAL</span></div></div>`
    : `<div class="n" style="font-size:56px;margin:8px 0 4px">${Math.round(t.kcal).toLocaleString()} <span style="font-size:18px;color:var(--dim)">kcal</span></div><small>Set an energy goal in Me, Goals and targets, to see a ring here.</small>`;
  return `<div class="row" style="justify-content:space-between"><div><div class="m">${esc(date)}</div><h2 style="margin:4px 0 0;font-size:52px">Fuel</h2></div><span class="t" style="color:var(--dim)">${list.length} ${list.length === 1 ? 'ENTRY' : 'ENTRIES'}</span></div>
  <div class="cut" style="margin-top:16px"><div class="row" style="justify-content:space-between"><span class="m">ENERGY</span><span class="m">${g.calories > 0 ? 'GOAL ' + g.calories.toLocaleString() + ' KCAL' : 'NO GOAL'}</span></div>${energy}</div>
  <div class="card" style="padding:4px 16px 12px">${MAC.map(([kk, l, gk, col], ix) => macroRow(kk, l, 'g', t[kk], g[gk], col).replace(ix === 0 ? 'border-top:1px solid var(--line)' : '@@', '')).join('')}</div>
  <div class="dl"><b></b><span class="m">LOG A MEAL</span><b></b></div>
  <div class="card"><label>What did you eat<input id="fd-name" type="text" placeholder="e.g. 200 g chicken breast, rice and a salad" autocomplete="off"></label>
  <div class="sugs" id="fd-sug">${sugHTML('')}</div>
  <div class="row" style="margin-bottom:6px"><button class="btn ghost" data-act="food-db" id="fd-db">Search database</button><button class="btn" data-act="food-ai" id="fd-ai">Estimate with AI</button></div>
  <p id="fd-aimsg" style="margin:0 0 10px;min-height:18px"><small>Fills the numbers below as an estimate. Check them before adding.</small></p><div id="fd-res"></div>
  <div class="five"><label>Kcal<input id="fd-kcal" type="number" inputmode="numeric" min="0" placeholder="0"></label><label style="color:var(--prot)">Prot<input id="fd-p" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--carb)">Carb<input id="fd-c" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fat)">Fat<input id="fd-f" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fib)">Fiber<input id="fd-fi" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label></div>
  <button class="btn" data-act="food-add">Add to today</button></div>
  ${list.length ? `<div class="dl"><b></b><span class="m">TODAY</span><b></b></div><div class="card" style="padding:4px 16px">${list.slice().reverse().map(e => `<div class="frow"><div><div style="font-weight:600">${esc(e.name || 'Food')}</div><small><span style="color:var(--prot)">P ${r1(e.p || 0)}</span> &nbsp;<span style="color:var(--carb)">C ${r1(e.c || 0)}</span> &nbsp;<span style="color:var(--fat)">F ${r1(e.f || 0)}</span> &nbsp;<span style="color:var(--fib)">Fi ${r1(e.fi || 0)}</span></small></div><div style="display:flex;align-items:center;gap:10px"><span class="n" style="font-size:22px">${e.kcal}<span style="font-size:11px;color:var(--dim)"> kcal</span></span><button class="mini" data-act="food-del" data-id="${e.id}" aria-label="Remove entry">Remove</button></div></div>`).join('')}</div>` : ''}`;
};

function stepper(k, i, j, v) {
  return `<div class="stp"><button data-act="${k}-" data-i="${i}" data-j="${j}" aria-label="decrease">&minus;</button>
  <input data-act="${k}-in" data-i="${i}" data-j="${j}" type="number" inputmode="${k === 'w' ? 'decimal' : 'numeric'}" step="any" min="0" value="${v || ''}" placeholder="0">
  <button data-act="${k}+" data-i="${i}" data-j="${j}" aria-label="increase">+</button></div>`;
}
function setRow(ex, t, i, j) {
  return `<div class="set ${t.done ? 'done' : ''} ${ex.noWeight ? 'nw' : ''}"><span class="sn">${j + 1}</span>
  ${ex.noWeight ? '' : stepper('w', i, j, t.w)}${stepper('r', i, j, t.r)}
  <button class="dn" data-act="done" data-i="${i}" data-j="${j}">${t.done ? 'DONE' : 'Done'}</button></div>${t.rest ? `<div class="m" style="text-align:right;margin:-4px 2px 6px;font-size:9.5px">REST ${fdur(t.rest * 1000)}</div>` : ''}`;
}
let replacing = -1;
function exOf(x) {
  const b = slot[x.slotId] || { name: x.name, sets: x.sets.length, lo: 0, hi: 0, rest: [90, 120], cue: '', noWeight: isNW(x.name) };
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
  const isOpen = open === i, dn = x.sets.filter(t => t.done).length, all = dn === x.sets.length;
  let body = '';
  if (isOpen) {
    const prev = prevFor(ex, c.id), sg = suggest(ex, prev);
    body = `<div class="bd">${edit ? '' : replacePanel(x, i)}${ex.cue ? `<div class="cue">${esc(ex.cue)}</div>` : ''}
    ${edit ? '' : `<div class="sug"><span class="tag">${sg.tag}</span> ${esc(sg.text)}${sg.apply ? `<button class="mini" data-act="apply" data-i="${i}" data-w="${sg.apply}">Use ${sg.apply} kg</button>` : ''}</div>`}
    ${prev ? `<div class="last">Last time (${fd(prev.s.finishedAt)}): ${esc(fmtSets(ex, prev.sets))}</div>` : ''}
    <div class="cols ${ex.noWeight ? 'nw' : ''}"><span></span>${ex.noWeight ? '' : `<span>${esc(ex.wlabel || 'kg')}</span>`}<span>${ex.side ? 'reps per side' : 'reps'}</span><span></span></div>
    ${x.sets.map((t, j) => setRow(ex, t, i, j)).join('')}
    <div class="row"><button class="mini" data-act="addset" data-i="${i}">+ Set</button><button class="mini" data-act="rmset" data-i="${i}">- Set</button>
    ${ex.noWeight ? '' : `<button class="mini" data-act="inc" data-i="${i}">Step: ${getInc(ex)} kg</button>`}</div></div>`;
  }
  return `<section class="ex ${isOpen ? 'open' : ''} ${all ? 'complete' : ''}">
  <button class="exh" data-act="toggle" data-i="${i}"><div><b>${esc(x.name)}</b>${ex.note ? ` <small>(${esc(ex.note)})</small>` : ''}
  <div class="sub">${x.orig ? x.sets.length + ' sets' : ex.sets + ' x ' + ex.lo + '-' + ex.hi}${ex.side ? ' per side' : ''} &middot; rest ${restTxt(ex.rest)}</div></div>
  <span class="cnt">${dn}/${x.sets.length}${all ? ' DONE' : ''}</span></button>${body}</section>`;
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
  const hint = st === 'idle' ? 'Set the rest you want, then start. Applies to this set only.' : 'Stop ends the rest and logs how long you rested.';
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
    return `<div class="tbar"><div id="tmr-fill" class="fill"></div><div class="tin"><div><b id="tmr-main">0:00</b><small id="tmr-lab"></small></div>
    <div class="row"><button class="mini" data-act="tshow">Expand</button>${mid}<button class="mini" data-act="${st === 'idle' ? 'tskip' : 'tstop'}">${st === 'idle' ? 'Skip' : 'Stop'}</button></div></div></div>`;
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

/* ---------- daily performance ---------- */
const dkey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const kDate = k => { const [y, m, d] = k.split('-'); return new Date(+y, +m - 1, +d); };
const kAdd = (k, n) => { const d = kDate(k); d.setDate(d.getDate() + n); return dkey(d); };
const kLong = k => kDate(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
let hist = { mode: 'trends', range: 8, ex: null, metric: 'top', y: new Date().getFullYear(), m: new Date().getMonth(), wk: null, sel: null };
const SC_DEF = { workout: true, steps: true, sleep: true, protein: true, kcal: false, macros: false };
const scoreCfg = () => Object.assign({}, SC_DEF, settings.score || {});
function dayInfo(k) {
  const g = settings.goals, d = daily[k] || {}, f = foodTot(k), ss = sessions.filter(s => dkey(s.finishedAt) === k), sc = scoreCfg();
  const logged = ss.length || d.steps != null || d.sleep != null || d.weight != null || dayFood(k).length;
  const t = [];
  if (sc.workout && (ss.length || (k === todayKey() && active))) t.push(['Workout', ss.length > 0]);
  if (sc.steps) t.push(['Steps', d.steps != null && d.steps >= g.steps]);
  if (sc.sleep) t.push(['Sleep', d.sleep != null && d.sleep >= g.sleep]);
  if (sc.protein && g.protein > 0) t.push(['Protein', f.p >= g.protein]);
  if (sc.kcal && g.calories > 0) t.push(['Energy', f.kcal > 0 && Math.abs(f.kcal - g.calories) <= 0.1 * g.calories]);
  if (sc.macros) {
    if (g.carbs > 0) t.push(['Carbs', f.c > 0 && Math.abs(f.c - g.carbs) <= 0.1 * g.carbs]);
    if (g.fat > 0) t.push(['Fat', f.f > 0 && Math.abs(f.f - g.fat) <= 0.1 * g.fat]);
    if (g.fiber > 0) t.push(['Fiber', f.fi >= g.fiber]);
  }
  return { k, d, f, ss, logged, hit: t.filter(x => x[1]).length, of: t.length, t };
}
const scoreTxt = i => (i.logged && i.of ? i.hit + '/' + i.of : '');
const mondayOf = k => { const d = kDate(k), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return dkey(d); };
function prCount(s) {
  const prior = sessions.filter(o => o.finishedAt < s.finishedAt);
  let n = 0;
  s.exercises.forEach(x => {
    const best = a => a.reduce((m, o) => o.exercises.filter(y => y.name === x.name).reduce((m2, y) => y.sets.reduce((m3, t) => t.done ? Math.max(m3, score(t.w, t.r)) : m3, m2), m), 0);
    const mine = x.sets.reduce((m, t) => t.done ? Math.max(m, score(t.w, t.r)) : m, 0);
    if (mine > 0 && prior.length && mine > best(prior)) n++;
  });
  return n;
}
const histTabs = () => `<div class="seg" role="tablist">${[['trends', 'Trends'], ['cal', 'Calendar'], ['week', 'Week'], ['list', 'Workouts']].map(([m, l]) => `<button class="mini${hist.mode === m ? ' on' : ''}" data-act="hist-mode" data-m="${m}" aria-pressed="${hist.mode === m}">${l}</button>`).join('')}</div>`;
function calView() {
  const first = new Date(hist.y, hist.m, 1), lead = (first.getDay() + 6) % 7, dim = new Date(hist.y, hist.m + 1, 0).getDate(), today = todayKey();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div></div>');
  let wo = 0, full = 0, stepsSum = 0, stepsN = 0;
  for (let d = 1; d <= dim; d++) {
    const k = dkey(new Date(hist.y, hist.m, d)), i = dayInfo(k), r = i.logged && i.of ? i.hit / i.of : -1;
    if (i.ss.length) wo++;
    if (i.logged && i.of && i.hit === i.of) full++;
    if (i.d.steps != null) { stepsSum += i.d.steps; stepsN++; }
    const a = r < 0 ? 0 : r >= 1 ? 0.9 : r >= 0.75 ? 0.5 : 0.26;
    cells.push(`<button class="cal${k === today ? ' tod' : ''}" data-act="open-day" data-k="${k}" aria-label="${kLong(k)}${i.logged ? ', ' + i.hit + ' of ' + i.of + ' targets' : ', nothing logged'}" style="${r >= 0 ? 'background:rgba(143,139,255,' + a + ');' : ''}${r >= 1 ? 'color:#fff' : ''}"><span>${d}</span><small>${scoreTxt(i) || (k === today ? 'TODAY' : '')}</small></button>`);
  }
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:10px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="cal-nav" data-n="-1" aria-label="Previous month">&lsaquo;</button><div class="n" style="font-size:30px;white-space:nowrap">${title}</div><button class="mini" style="width:44px;height:44px;flex:none" data-act="cal-nav" data-n="1" aria-label="Next month">&rsaquo;</button></div>
  <div class="card" style="padding:12px"><div class="calg">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(x => `<div class="dh">${x}</div>`).join('')}${cells.join('')}</div>
  <p style="margin:10px 0 0"><small>Targets hit per day, as set in Me, Goals and targets. Brighter means more. Tap a day for details.</small></p></div>
  <div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center"><div><div class="n" style="font-size:32px">${wo}</div><div class="m" style="font-size:9.5px">WORKOUTS</div></div><div><div class="n" style="font-size:32px">${full}</div><div class="m" style="font-size:9.5px">ALL TARGETS</div></div><div><div class="n" style="font-size:32px">${stepsN ? Math.round(stepsSum / stepsN).toLocaleString() : '-'}</div><div class="m" style="font-size:9.5px">AVG STEPS</div></div></div>`;
}
function weekView() {
  const mon = hist.wk || mondayOf(todayKey()), days = [0, 1, 2, 3, 4, 5, 6].map(n => dayInfo(kAdd(mon, n))), today = todayKey();
  const sel = hist.sel && days.some(x => x.k === hist.sel) ? hist.sel : (days.some(x => x.k === today) ? today : days[0].k);
  const i = days.find(x => x.k === sel), g = settings.goals;
  const prevDays = [1, 2, 3, 4, 5, 6, 7].map(n => dayInfo(kAdd(sel, -n))).filter(x => x.logged);
  const avg = f => { const v = prevDays.map(f).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const cmp = (label, val, a, fmt, unit) => {
    let tag = '';
    if (val != null && a != null) { const df = val - a; tag = Math.abs(df) < 0.02 * Math.max(1, a) ? 'SAME' : (df > 0 ? 'UP ' : 'DOWN ') + fmt(Math.abs(df)) + (unit || ''); }
    return `<div class="cmp"><span>${label}</span><span>${val == null ? '-' : fmt(val) + (unit || '')} <small>${tag}</small></span></div>`;
  };
  const dial = (label, txt, sub, pct, hit, note, col) => `<div class="ringbox">${tickRing(96, pct, hit ? col : 'var(--dim)', `<b style="font-family:var(--disp);font-size:19px;line-height:1">${txt}</b><small style="font-size:10px">${sub}</small>`, 36, 3, 9)}<div style="font-size:13px;font-weight:600;margin-top:6px">${label}</div><div class="tg" style="color:${col}">${note}</div></div>`;
  const s0 = i.ss[0], sets = s0 ? doneCount(s0) : 0, tot = s0 ? totalCount(s0) : 0, dl = [];
  if (s0) dl.push(dial('Workout', sets + '/' + tot, 'sets', tot ? sets / tot : 1, true, 'DONE', 'var(--acct)'));
  dl.push(dial('Move', i.d.steps == null ? '-' : i.d.steps.toLocaleString(), 'steps', i.d.steps == null ? 0 : i.d.steps / g.steps, i.d.steps >= g.steps, i.d.steps == null ? 'NOT LOGGED' : i.d.steps >= g.steps ? 'HIT' : 'MISSED', 'var(--move)'));
  dl.push(dial('Rest', i.d.sleep == null ? '-' : sleepTxt(i.d.sleep), 'sleep', i.d.sleep == null ? 0 : i.d.sleep / g.sleep, i.d.sleep >= g.sleep, i.d.sleep == null ? 'NOT LOGGED' : i.d.sleep >= g.sleep ? 'HIT' : 'MISSED BY ' + Math.round((g.sleep - i.d.sleep) * 60) + ' MIN', 'var(--rest)'));
  dl.push(dial('Protein', i.f.p ? Math.round(i.f.p) + ' g' : '-', 'protein', g.protein > 0 ? i.f.p / g.protein : 0, i.f.p >= g.protein, !i.f.p ? 'NOT LOGGED' : i.f.p >= g.protein ? 'HIT' : 'MISSED BY ' + Math.round(g.protein - i.f.p) + ' G', 'var(--prot)'));
  const vol = s0 ? Math.round(volume(s0)) : null;
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:10px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-n="-7" aria-label="Previous week">&lsaquo;</button><b>Week of ${kLong(mon)}</b><button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-n="7" aria-label="Next week">&rsaquo;</button></div>
  <div class="wkrow">${days.map(x => `<button class="wkd${x.k === sel ? ' sel' : ''}" data-act="wk-sel" data-k="${x.k}" aria-label="${kLong(x.k)}"><span>${kDate(x.k).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</span><b>${kDate(x.k).getDate()}</b><span>${x.logged ? scoreTxt(x) || '-' : 'NONE'}</span></button>`).join('')}</div>
  <div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 style="margin:0">${kLong(sel)}</h3><span class="m">${i.logged && i.of ? i.hit + ' OF ' + i.of + ' HIT' : 'NOTHING LOGGED'}</span></div><div class="rings">${dl.join('')}</div><button class="btn ghost" style="margin-top:14px" data-act="open-day" data-k="${sel}">Open full day</button></div>
  ${prevDays.length ? `<div class="card"><div class="m" style="margin-bottom:4px">VS YOUR AVERAGE OF THE PREVIOUS ${prevDays.length} LOGGED DAYS</div>
  ${cmp('Training volume', vol, avg(x => x.ss[0] ? volume(x.ss[0]) : null), v => Math.round(v).toLocaleString(), ' kg')}
  ${cmp('Steps', i.d.steps == null ? null : i.d.steps, avg(x => x.d.steps), v => Math.round(v).toLocaleString())}
  ${cmp('Sleep', i.d.sleep == null ? null : i.d.sleep, avg(x => x.d.sleep), v => sleepTxt(v))}
  ${cmp('Body weight', i.d.weight == null ? null : i.d.weight, avg(x => x.d.weight), v => r1(v), ' kg')}
  ${cmp('Calories', i.f.kcal || null, avg(x => x.f.kcal || null), v => Math.round(v).toLocaleString())}
  ${cmp('Protein', i.f.p || null, avg(x => x.f.p || null), v => Math.round(v), ' g')}
  ${cmp('Fat', i.f.f || null, avg(x => x.f.f || null), v => Math.round(v), ' g')}
  ${cmp('Fiber', i.f.fi || null, avg(x => x.f.fi || null), v => Math.round(v), ' g')}</div>` : ''}`;
}
function trendsView() {
  const R = hist.range, g = settings.goals, tk = todayKey();
  const keys = [...Object.keys(daily), ...Object.keys(food), ...sessions.map(s => dkey(s.finishedAt))].sort();
  let nd = R === 0 ? 120 : R * 7;
  if (R === 0 && keys.length) nd = Math.max(14, Math.min(120, Math.round((kDate(tk) - kDate(keys[0])) / 864e5) + 1));
  const days = lastDays(nd), prev = [...Array(nd)].map((_, i) => kAdd(tk, -(2 * nd - 1 - i)));
  const avgOf = (ks, f) => { const v = ks.map(f).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const tagOf = (cur, pr, fmt) => { if (cur == null) return 'NO DATA'; if (pr == null) return 'NEW'; const d = cur - pr; return Math.abs(d) < 0.02 * Math.max(1, pr) ? 'SAME' : (d > 0 ? 'UP ' : 'DOWN ') + fmt(Math.abs(d)); };
  const card = (ic, col, lab, big, unit, tag, chart, foot) => `<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="display:flex;align-items:center;gap:10px"><span class="ic" style="background:color-mix(in srgb,${col} 18%,transparent);color:${col}">${ic}</span><span class="m">${lab}</span></div><span class="t" style="color:${col}">${tag}</span></div>
    <div class="n" style="font-size:38px;margin:10px 0 2px">${big} <span style="font-size:15px;color:var(--dim)">${unit}</span></div><div style="margin:8px 0 6px">${chart}</div><div class="dim" style="font-size:12px">${foot}</div></div>`;
  // weekly volume
  const nw = R === 0 ? 12 : R, mons = [...Array(nw)].map((_, i) => kAdd(mondayOf(tk), -7 * (nw - 1 - i)));
  const vols = mons.map(m => sessions.filter(s => mondayOf(dkey(s.finishedAt)) === m).reduce((a, s) => a + volume(s), 0));
  const lv = vols[vols.length - 1], pv = vols[vols.length - 2];
  const volTag = lv > 0 && pv > 0 ? (Math.abs(lv - pv) < 0.01 * pv ? 'SAME' : (lv > pv ? 'UP ' : 'DOWN ') + Math.round(Math.abs(lv - pv) / pv * 100) + '%') : lv > 0 ? 'THIS WEEK' : 'NO DATA';
  const prs = sessions.reduce((a, s) => a + prCount(s), 0);
  const volCard = card('TR', 'var(--acct)', 'TRAINING VOLUME, WEEKLY', Math.round(lv).toLocaleString(), 'kg this week', volTag, miniBars(vols, 'var(--acc)', 330, 70, 0, 'Weekly training volume'), `${sessions.length} workouts logged, ${prs} personal records.`);
  // exercise progress
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))].sort(), sel = hist.ex || names[0], nwt = isNW(sel);
  let mt = hist.metric; if (nwt && mt === 'e1') mt = 'top';
  const rows = [];
  sortedDesc().reverse().forEach(s => {
    const sets = s.exercises.filter(x => x.name === sel).flatMap(x => x.sets.filter(t => t.done));
    if (!sets.length) return;
    const v = mt === 'vol' ? sets.reduce((a, t) => a + (nwt ? t.r : t.w * t.r), 0) : mt === 'e1' ? Math.max(...sets.map(t => score(t.w, t.r))) : Math.max(...sets.map(t => (nwt ? t.r : t.w)));
    rows.push({ s, sets, v: rnd(v) });
  });
  const segs = [['top', nwt ? 'Top reps' : 'Top weight']].concat(nwt ? [] : [['e1', 'Est. 1RM']]).concat([['vol', nwt ? 'Total reps' : 'Volume']]);
  const exCard = `<div class="card"><div class="m" style="margin-bottom:8px">EXERCISE PROGRESS</div><label>Exercise<select data-act="ex-sel">${names.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <div class="seg">${segs.map(([k, l]) => `<button class="mini ${mt === k ? 'on' : ''}" data-act="metric" data-m="${k}">${l}</button>`).join('')}</div>
  ${rows.length >= 2 ? chart(rows.map(r => r.v), rows.map(r => fd(r.s.finishedAt))) : '<p>Log this exercise in at least two workouts to see a trend.</p>'}
  ${rows.length ? `<p>Latest: ${rows[rows.length - 1].v} ${mt === 'vol' ? (nwt ? 'reps' : 'kg total') : (mt === 'e1' ? 'kg est. 1RM' : nwt ? 'reps' : 'kg')}</p>` : ''}</div>`;
  // steps, sleep, protein
  const sv = days.map(k => (daily[k] || {}).steps), sa = avgOf(days, k => (daily[k] || {}).steps), spa = avgOf(prev, k => (daily[k] || {}).steps);
  const sh = sv.filter(v => v != null && v >= g.steps).length, sn = sv.filter(v => v != null).length;
  const stepCard = card('MV', 'var(--move)', 'MOVE, DAILY STEPS', sa == null ? '-' : Math.round(sa).toLocaleString(), 'avg per day', tagOf(sa, spa, v => Math.round(v).toLocaleString()), miniBars(sv, 'var(--move)', 330, 60, g.steps, 'Daily steps'), `Dashed line is your ${g.steps.toLocaleString()} goal. Hit on ${sh} of ${sn} logged days.`);
  const lv2 = days.map(k => (daily[k] || {}).sleep), la = avgOf(days, k => (daily[k] || {}).sleep), lpa = avgOf(prev, k => (daily[k] || {}).sleep);
  const lh = lv2.filter(v => v != null && v >= g.sleep).length, ln2 = lv2.filter(v => v != null).length;
  const sleepCard = card('RS', 'var(--rest)', 'REST, SLEEP', la == null ? '-' : sleepTxt(la), 'avg per night', tagOf(la, lpa, v => sleepTxt(v)), miniBars(lv2, 'var(--rest)', 330, 60, g.sleep, 'Nightly sleep'), `Dashed line is your ${g.sleep} h goal. Hit on ${lh} of ${ln2} logged nights.`);
  const fl = k => (dayFood(k).length ? foodTot(k) : null), pv2 = days.map(k => fl(k) ? fl(k).p : null), pa = avgOf(days, k => fl(k) ? fl(k).p : null), ppa = avgOf(prev, k => fl(k) ? fl(k).p : null);
  const fa = avgOf(days, k => fl(k) ? fl(k).f : null), fia = avgOf(days, k => fl(k) ? fl(k).fi : null), ka = avgOf(days, k => fl(k) ? fl(k).kcal : null);
  const fuelCard = card('FU', 'var(--prot)', 'FUEL, PROTEIN', pa == null ? '-' : Math.round(pa), 'g avg per day', tagOf(pa, ppa, v => Math.round(v) + ' g'), miniBars(pv2, 'var(--prot)', 330, 60, g.protein, 'Daily protein'), pa == null ? 'No food logged in this period.' : `Averages: ${Math.round(ka).toLocaleString()} kcal, fat ${Math.round(fa)} g, fiber ${Math.round(fia)} g.`);
  const wv = days.map(k => (daily[k] || {}).weight), wh = wv.filter(v => v != null), wa = avgOf(days, k => (daily[k] || {}).weight), wpa = avgOf(prev, k => (daily[k] || {}).weight);
  const bodyCard = card('BW', 'var(--body)', 'BODY WEIGHT', wa == null ? '-' : r1(wa), 'kg avg', tagOf(wa, wpa, v => r1(v) + ' kg'), spark(wv, 'var(--body)', 330, 90, 'Body weight'), wh.length ? `Lowest ${r1(Math.min(...wh))} kg, highest ${r1(Math.max(...wh))} kg, ${wh.length} weigh-ins.${g.weight > 0 ? ' Target ' + g.weight + ' kg, latest ' + r1(wh[wh.length - 1]) + ' kg.' : ''}` : 'No weigh-ins in this period.');
  return `<div class="seg">${[[4, '4 weeks'], [8, '8 weeks'], [0, 'All time']].map(([r, l]) => `<button class="mini${R === r ? ' on' : ''}" data-act="range" data-r="${r}">${l}</button>`).join('')}</div>${volCard}${exCard}${bodyCard}${stepCard}${sleepCard}${fuelCard}`;
}
views.trends = () => `<h2 style="font-size:52px">Trends</h2>${histTabs()}` + (hist.mode === 'trends' ? trendsView() : hist.mode === 'cal' ? calView() : hist.mode === 'week' ? weekView() : (() => {
  const l = sortedDesc();
  return !l.length ? '<div class="card"><p>Finished workouts show up here.</p></div>' : l.map(s => `<div class="card"><button class="item" data-act="open-session" data-id="${s.id}"><div><b>${esc(s.name)}</b><small>Week ${s.week} &middot; ${fd(s.finishedAt)}</small></div><div class="r"><b>${doneCount(s)} sets</b><small>${Math.round(volume(s)).toLocaleString()} kg</small></div></button></div>`).join('');
})());
views.day = p => {
  const k = p.k, i = dayInfo(k), g = settings.goals, s = i.ss[0], today = todayKey(), f = i.f, d = i.d;
  const head = `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:12px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="day-nav" data-n="-1" aria-label="Previous day">&lsaquo;</button><div style="text-align:center"><div class="n" style="font-size:34px;text-transform:uppercase">${kLong(k)}</div>${s ? `<small>Week ${s.week}, ${esc(s.name)}</small>` : ''}</div><button class="mini" style="width:44px;height:44px;flex:none${k >= today ? ';opacity:.35' : ''}" data-act="day-nav" data-n="1" aria-label="Next day"${k >= today ? ' disabled' : ''}>&rsaquo;</button></div>`;
  if (!i.logged) return head + '<div class="card"><p>Nothing logged on this day.</p></div><button class="btn ghost" data-go="trends">Back to trends</button>';
  const hero = `<div class="cut" style="padding:18px 16px"><span class="m">DAY RESULT</span><div class="n" style="font-size:54px;margin:6px 0 10px;text-transform:uppercase">${i.of ? i.hit + ' of ' + i.of + ' targets hit' : 'Logged'}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${i.t.map(([l, ok]) => `<span class="t" style="color:${ok ? 'var(--ok)' : 'var(--dim)'}">${l}: ${ok ? 'HIT' : 'MISSED'}</span>`).join('')}</div></div>`;
  const prs = s ? prCount(s) : 0;
  const train = s ? `<div class="card"><div class="row" style="justify-content:space-between"><span class="m">TRAINING</span><small>${fdur(s.finishedAt - s.startedAt)}, ${doneCount(s)} of ${totalCount(s)} sets</small></div>
  <div class="row" style="gap:28px;margin:8px 0"><div><div class="n" style="font-size:32px">${Math.round(volume(s)).toLocaleString()}</div><small>kg volume</small></div><div><div class="n" style="font-size:32px">${prs}</div><small>personal records</small></div></div>
  ${s.exercises.map(x => { const ex = { noWeight: x.nw != null ? x.nw : (slot[x.slotId] ? slot[x.slotId].noWeight : isNW(x.name)) }; return `<div class="lift"><span>${esc(x.name)}</span><span>${esc(fmtSets(ex, x.sets.filter(t => t.done)))}</span></div>`; }).join('')}
  <button class="btn ghost" style="margin-top:10px" data-act="open-session" data-id="${s.id}">Open workout</button></div>` : '';
  const ent = dayFood(k);
  const nut = `<div class="card"><div class="m" style="margin-bottom:6px">NUTRITION</div><div class="brow"><span>Energy</span><span><b>${Math.round(f.kcal).toLocaleString()}</b> <small>kcal</small></span></div>${MAC.map(([kk, l, gk, col]) => macroRow(kk, l, 'g', f[kk], g[gk], col)).join('')}
  <p style="margin:8px 0 0"><small>${ent.length} ${ent.length === 1 ? 'entry' : 'entries'}${ent.length ? ': ' + ent.map(e => esc(e.name || 'food')).join(', ') : ''}</small></p></div>`;
  const row = (lab, v, goalTxt, pct, note, col) => `<div style="margin-top:12px"><div class="brow"><span>${lab}</span><span><b>${v}</b> <small>${goalTxt}</small></span></div><div class="bar"><i style="width:${Math.min(100, pct * 100).toFixed(0)}%;background:${col}"></i></div><div class="tg" style="color:${col}">${note}</div></div>`;
  const ss = `<div class="card"><div class="m">MOVE AND REST</div>
  ${row('Steps', d.steps == null ? '-' : d.steps.toLocaleString(), '/ ' + g.steps.toLocaleString(), d.steps == null ? 0 : d.steps / g.steps, d.steps == null ? 'NOT LOGGED' : d.steps >= g.steps ? 'GOAL HIT' : 'SHORT BY ' + (g.steps - d.steps).toLocaleString(), 'var(--move)')}
  ${d.weight != null ? `<div class="li" style="margin-top:10px"><span>Body weight</span><span><span class="n" style="font-size:22px;color:var(--ink)">${r1(d.weight)} kg</span></span></div>` : ''}
  ${row('Sleep', d.sleep == null ? '-' : sleepTxt(d.sleep), '/ ' + g.sleep + 'h', d.sleep == null ? 0 : d.sleep / g.sleep, d.sleep == null ? 'NOT LOGGED' : d.sleep >= g.sleep ? 'GOAL HIT' : 'SHORT BY ' + Math.round((g.sleep - d.sleep) * 60) + ' MIN', 'var(--rest)')}</div>`;
  return head + hero + train + nut + ss + '<button class="btn ghost" data-go="trends">Back to trends</button>';
};

views.session = p => {
  const s = sessions.find(x => x.id === p.id);
  if (!s) return '<div class="card"><h3>Session not found</h3>' + homeBtn + '</div>';
  return `<h2>${esc(s.name)}</h2><p>Week ${s.week} &middot; ${fd(s.finishedAt)} &middot; ${fdur(s.finishedAt - s.startedAt)} &middot; ${Math.round(volume(s)).toLocaleString()} kg volume</p>
  ${s.exercises.map(x => { const ex = { noWeight: x.nw != null ? x.nw : (slot[x.slotId] ? slot[x.slotId].noWeight : isNW(x.name)) }; return `<div class="card"><b>${esc(x.name)}</b><p>${esc(fmtSets(ex, x.sets))}</p>${x.sets.some(t => t.rest) ? `<p><small>Rest: ${x.sets.map(t => t.rest ? fdur(t.rest * 1000) : '-').join(', ')}</small></p>` : ''}</div>`; }).join('')}
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
  <line x1="${L}" y1="${y(lo)}" x2="${W - R}" y2="${y(lo)}" style="stroke:var(--line2)"/>
  <polyline points="${pl}" fill="none" style="stroke:var(--move)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${points.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" style="fill:var(--move)"/>`).join('')}
  <text x="${L - 6}" y="${y(hi) + 4}" text-anchor="end" style="fill:var(--dim)" font-size="11">${rnd(mx)}</text>
  <text x="${L - 6}" y="${y(lo) + 4}" text-anchor="end" style="fill:var(--dim)" font-size="11">${rnd(mn)}</text>
  <text x="${L}" y="${H - 6}" style="fill:var(--dim)" font-size="11">${esc(labels[0])}</text>
  <text x="${W - R}" y="${H - 6}" text-anchor="end" style="fill:var(--dim)" font-size="11">${esc(labels[labels.length - 1])}</text></svg>`;
}
views.info = () => '<div class="m">TRAIN</div><h2 style="font-size:46px">Program guide</h2>' + window.INFO_HTML + '<button class="btn ghost" data-go="train">Back to Train</button>';

/* ---------- me ---------- */
const CHEV = '<svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>';
const lrow = (l, v, go) => `<button class="li" data-go="${go}"><span>${l}</span><span>${v || ''}${CHEV}</span></button>`;
const trow = (l, act, on, key) => `<div class="li"><span>${l}</span><label class="swl"><input type="checkbox" data-act="${act}" ${key ? 'data-k="' + key + '"' : ''} ${on ? 'checked' : ''} aria-label="${l}"><span class="sw"></span></label></div>`;
const grp = (title, inner) => `<div class="dl"><b></b><span class="m">${title}</span><b></b></div><div class="card" style="padding:2px 16px">${inner}</div>`;
views.me = () => {
  const g = settings.goals, n = nextWorkout(), th = settings.theme || 'system', sc = scoreCfg();
  const gv = (v, u) => v > 0 ? v.toLocaleString() + (u ? ' ' + u : '') : 'Not set';
  return `<h2 style="font-size:52px">Me</h2>
  <div class="cut" style="display:flex;align-items:center;gap:14px;flex-wrap:nowrap"><div style="width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;display:flex;align-items:center;justify-content:center;flex:none"><span class="n" style="font-size:34px">E</span></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:18px">Elie</div><div class="dim" style="font-size:13px;margin-top:2px">${P.weeks} week hypertrophy, week ${Math.min(n.week, P.weeks)}</div></div><span class="t" style="color:var(--acct)">LOCAL ACCOUNT</span></div>
  ${grp('GOALS AND TARGETS', lrow('Daily steps', gv(g.steps), 'goals') + lrow('Sleep', g.sleep + ' h', 'goals') + lrow('Target weight', gv(g.weight, 'kg'), 'goals') + lrow('Energy', gv(g.calories, 'kcal'), 'goals') + lrow('Protein', gv(g.protein, 'g'), 'goals') + lrow('Carbs', gv(g.carbs, 'g'), 'goals') + lrow('Fat', gv(g.fat, 'g'), 'goals') + lrow('Fiber', gv(g.fiber, 'g'), 'goals') + lrow('Targets that count for Day Score', Object.keys(sc).filter(k => sc[k]).length + ' on', 'goals'))}
  <div class="dl"><b></b><span class="m">APPEARANCE</span><b></b></div><div class="seg" role="group" aria-label="Theme">${[['system', 'System'], ['dark', 'Dark'], ['light', 'Light']].map(([v, l]) => `<button class="mini${th === v ? ' on' : ''}" data-act="theme-set" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div>
  <div class="m" style="margin:2px 0 8px">TEXT AND SCREEN SIZE</div><div class="seg" role="group" aria-label="Text size">${[[0.72, 'Small'], [0.8, 'Medium'], [0.9, 'Large']].map(([v, l]) => `<button class="mini${(settings.scale || 0.8) === v ? ' on' : ''}" data-act="scale-set" data-v="${v}" aria-pressed="${(settings.scale || 0.8) === v}">${l}</button>`).join('')}</div>
  ${grp('TRAINING', trow('Auto-start rest timer', 'auto-in', settings.autoStart !== false) + trow('Rest timer sound', 'sound-in', settings.sound) + trow('Vibration', 'vib-in', settings.vibrate) + lrow('Program guide', '', 'info'))}
  <div class="dl"><b></b><span class="m">NUTRITION AND AI</span><b></b></div><div class="card"><p>Type what you ate in Fuel and the AI fills in calories, protein, carbs, fat and fiber. It uses Google's Gemini. Get a free key at aistudio.google.com and paste it here. The key stays on this phone and is never included in backups. What you type is sent to Google to get the estimate.</p>
  <label>Gemini API key<input data-act="ai-key-in" type="password" autocomplete="off" value="${esc(settings.ai.key)}" placeholder="Paste key"></label>
  <label style="margin-bottom:0">Model<input data-act="ai-model-in" type="text" autocomplete="off" value="${esc(settings.ai.model)}"></label>
  <div class="row" style="margin-top:10px"><span class="t" style="color:${settings.ai.key ? 'var(--ok)' : 'var(--dim)'}">${settings.ai.key ? 'KEY SAVED' : 'NO KEY'}</span><span class="t" style="color:var(--dim)">${myfoods.length} FOODS SAVED</span></div></div>
  <div class="dl"><b></b><span class="m">DATA AND SYNC</span><b></b></div><div class="card"><p>${sessions.length} workouts saved on this phone. Export a backup now and then.</p>
  <div class="row"><button class="btn" data-act="export">Export backup</button><button class="btn ghost" data-act="import-btn">Import</button></div><input id="imp" type="file" accept="application/json,.json" data-act="import-in" style="display:none">
  <div class="li" style="margin-top:6px"><span>Protected storage</span><span>${persisted === true ? 'Granted' : persisted === false ? 'Not granted' : 'Unknown'}</span></div><div class="li"><span>Cloud sync</span><span>Off, coming with accounts</span></div></div>
  ${grp('APP', `<div class="li"><span>Version</span><span>${VERSION}</span></div>` + `<button class="li" data-act="update"><span>Update app</span><span>${CHEV}</span></button><button class="li" data-act="logout"><span>Log out</span><span>${CHEV}</span></button>`)}
  <div style="height:16px"></div><button class="btn danger" data-act="reset">Delete all data</button>`;
};
views.goals = () => {
  const g = settings.goals, sc = scoreCfg();
  const stp = (f, l, u, step, min, v, col) => `<div style="padding:14px 0;border-top:1px solid var(--line)"><div style="font-weight:600;font-size:15px;margin-bottom:8px;color:${col}">${l}</div>
  <div style="display:grid;grid-template-columns:52px 1fr 52px;gap:8px;align-items:center"><button class="mini" style="height:46px;font-size:22px;text-align:center" data-act="goal-step" data-f="${f}" data-d="-${step}" aria-label="Decrease ${l}">-</button>
  <div style="position:relative"><input id="gi-${f}" data-act="goal-in" data-f="${f}" type="number" inputmode="decimal" step="any" min="${min}" value="${v > 0 ? v : ''}" placeholder="No goal" style="width:100%;height:46px;text-align:center;font-family:var(--disp);font-size:26px;font-weight:700;background:var(--g1);border:1.5px solid var(--line);border-radius:12px;padding:0 34px 0 8px"><span class="m" style="position:absolute;right:10px;top:50%;transform:translateY(-50%)">${u}</span></div>
  <button class="mini" style="height:46px;font-size:22px;text-align:center" data-act="goal-step" data-f="${f}" data-d="${step}" aria-label="Increase ${l}">+</button></div></div>`;
  const box = inner => `<div class="card" style="padding:2px 16px 4px">${inner.replace('border-top:1px solid var(--line)', '')}</div>`;
  return `<div class="row" style="justify-content:space-between"><button class="m" data-go="me">&lsaquo; ME</button><span class="m">GOALS AND TARGETS</span></div><h2 style="margin:12px 0 4px;font-size:46px">Goals</h2><p>Set each target and choose which ones count toward your Day Score.</p>
  <div class="dl"><b></b><span class="m">MOVE AND REST</span><b></b></div>${box(stp('steps', 'Daily steps', 'STEPS', 500, 1, g.steps, 'var(--move)') + stp('sleep', 'Sleep', 'HOURS', 0.25, 1, g.sleep, 'var(--rest)'))}
  <div class="dl"><b></b><span class="m">BODY</span><b></b></div>${box(stp('weight', 'Target weight', 'KG', 0.5, 0, g.weight, 'var(--body)'))}
  <div class="dl"><b></b><span class="m">FUEL</span><b></b></div>${box(stp('calories', 'Energy', 'KCAL', 50, 0, g.calories, 'var(--carb)') + stp('protein', 'Protein', 'G', 5, 0, g.protein, 'var(--prot)') + stp('carbs', 'Carbs', 'G', 10, 0, g.carbs, 'var(--carb)') + stp('fat', 'Fat', 'G', 5, 0, g.fat, 'var(--fat)') + stp('fiber', 'Fiber', 'G', 2, 0, g.fiber, 'var(--fib)'))}
  <div class="dl"><b></b><span class="m">DAY SCORE COUNTS</span><b></b></div><div class="card" style="padding:2px 16px">${trow('Workout, on days you trained', 'score-in', sc.workout, 'workout')}${trow('Steps', 'score-in', sc.steps, 'steps')}${trow('Sleep', 'score-in', sc.sleep, 'sleep')}${trow('Protein', 'score-in', sc.protein, 'protein')}${trow('Energy, within 10% of goal', 'score-in', sc.kcal, 'kcal')}${trow('Carbs, fat and fiber', 'score-in', sc.macros, 'macros')}</div>
  <p style="margin:10px 4px 16px"><small>A target only counts if it has a goal. Changes apply to every day, including past days.</small></p><button class="btn" data-go="me">Done</button>`;
};

/* ---------- actions ---------- */
function firstIncomplete(c) { const i = c.exercises.findIndex(x => x.sets.some(t => !t.done)); return i < 0 ? 0 : i; }

async function exportData() {
  const data = { app: 'metrix-train', schema: 1, exportedAt: new Date().toISOString(), sessions, daily, food, myfoods, settings: Object.assign({}, settings, { ai: undefined }) };
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
      if (Array.isArray(d.myfoods)) { d.myfoods.forEach(f => { if (f && f.name && !myfoods.some(x => x.name.toLowerCase() === f.name.toLowerCase())) myfoods.push(f); }); saveMy(); }
      if (d.food && typeof d.food === 'object') {
        Object.keys(d.food).forEach(k => { if (!Array.isArray(d.food[k])) return; food[k] = food[k] || []; d.food[k].forEach(e => { if (e && e.id && !food[k].some(x => x.id === e.id)) food[k].push(e); }); });
        saveFood();
      }
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
    case 'picker': go('train', { picker: true }, true); break;
    case 'pick-cancel': go('train', {}, true); break;
    case 'pick-apply':
      settings.override = { week: Math.max(1, parseInt($('#pk-week').value, 10) || 1), dayKey: $('#pk-day').value };
      saveSettings(); go('train', {}, true); break;
    case 'toggle': open = open === i ? -1 : i; render(); break;
    case 'w+': case 'w-': {
      const c = cur(), x = c.exercises[i], inc = getInc(exOf(x));
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
        if (!view.params.edit) {
          const ex = exOf(x), k = x.sets.findIndex(q => !q.done);
          let nt;
          if (k >= 0) nt = 'set ' + (k + 1) + ', ' + x.name;
          else { const n2 = c.exercises.findIndex(y => y.sets.some(q => !q.done)); nt = n2 >= 0 ? c.exercises[n2].name + ', set ' + (c.exercises[n2].sets.findIndex(q => !q.done) + 1) : 'all sets done, tap Finish'; }
          startTimer(ex.rest[0], ex.rest[1], nt, { i, j });
        }
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
      const ex = exOf(cur().exercises[i]);
      const steps = [1, 1.25, 2.5, 5, 10]; settings.inc[ex.name] = steps[(steps.indexOf(getInc(ex)) + 1) % steps.length];
      saveSettings(); render(); break;
    }
    case 'tpre': startTimer(+el.dataset.s, +el.dataset.s, '', null, true); render(); break;
    case 'tskip': timer = null; saveTimer(); render(); break;
    case 'tstart': if (timer) { timer.state = 'run'; timer.start = Date.now(); timer.acc = 0; timer.f1 = 0; timer.f2 = 0; saveTimer(); render(); } break;
    case 'tpause': if (timer && timer.state === 'run') { timer.acc = tel(timer); timer.state = 'pause'; timer.start = null; saveTimer(); render(); } break;
    case 'tresume': if (timer && timer.state === 'pause') { timer.state = 'run'; timer.start = Date.now(); saveTimer(); render(); } break;
    case 'tstop': stopTimer(true); render(); break;
    case 'auto-in': settings.autoStart = el.checked; saveSettings(); break;
    case 'tmin': if (timer) { timer.pop = false; saveTimer(); } render(); break;
    case 'tshow': if (timer) { timer.pop = true; saveTimer(); } render(); break;
    case 't+30': case 't-30': {
      if (!timer) break;
      const d = a === 't+30' ? 30 : -30;
      timer.min = Math.max(10, timer.min + d); timer.max = Math.max(timer.min, timer.max + d);
      const s = tel(timer), run = (timer.state || 'run') === 'run'; timer.f1 = run && s >= timer.min ? 1 : 0; timer.f2 = run && s >= timer.max ? 1 : 0;
      saveTimer(); tick(); break;
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
      const ex = e.exercises.map(x => ({ slotId: x.slotId, name: x.name, nw: x.nw, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true })) })).filter(x => x.sets.length);
      if (!ex.length) { toast('A workout needs at least one done set. Use Delete in History instead.'); break; }
      const k = sessions.findIndex(s => s.id === e.id);
      if (k >= 0) sessions[k] = Object.assign({}, sessions[k], { exercises: ex, updatedAt: Date.now() });
      saveSessions(); editing = null; toast('Saved'); go('session', { id: e.id }, true); break;
    }
    case 'daily-in': {
      const k = todayKey(), f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      daily[k] = daily[k] || {};
      if (isNaN(v) || v < 0) delete daily[k][f]; else daily[k][f] = f === 'steps' ? Math.round(v) : f === 'weight' ? r1(v) : rnd(v);
      if (!Object.keys(daily[k]).length) delete daily[k];
      saveDaily(); refreshRings(); break;
    }
    case 'goal-in': {
      const f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      if (v > 0) settings.goals[f] = v;
      else if (f === 'steps') settings.goals[f] = 10000;
      else if (f === 'sleep') settings.goals[f] = 8;
      else delete settings.goals[f];
      saveSettings(); break;
    }
    case 'rep-open': replacing = i; render(); break;
    case 'rep-cancel': replacing = -1; render(); break;
    case 'rep-undo': {
      const x = active.exercises[i];
      if (x.sets.some(t => t.done) && !confirm('Switch back and reset this exercise\'s sets?')) break;
      x.name = x.orig; delete x.orig; delete x.nw; resetSets(x); persist(); render(); break;
    }
    case 'rep-apply': {
      const x = active.exercises[i], name = ($('#rep-in').value || '').trim();
      if (!name) { toast('Type the exercise name.'); break; }
      if (x.sets.some(t => t.done) && !confirm('This resets the sets already marked done for this exercise. Continue?')) break;
      if (!x.orig) x.orig = x.name;
      if (name === x.orig) { x.name = x.orig; delete x.orig; delete x.nw; } else { x.name = name; x.nw = $('#rep-nw').checked; }
      replacing = -1; resetSets(x); persist(); render(); break;
    }
    case 'cancel-workout':
      if (confirm('Cancel this workout? Everything you logged in it will be deleted.')) {
        active = null; LSset('mx.active', null); timer = null; saveTimer(); replacing = -1; toast('Workout cancelled'); go('home', {}, true);
      }
      break;
    case 'food-ai': {
      const txt = ($('#fd-name').value || '').trim(), msg = $('#fd-aimsg'), btn = $('#fd-ai');
      const say = m => { msg.innerHTML = '<small>' + esc(m) + '</small>'; };
      if (!txt) { say('Type what you ate first, with amounts if you know them.'); break; }
      const hit = myfoods.find(f => f.name.toLowerCase() === txt.toLowerCase());
      if (hit) { $('#fd-kcal').value = hit.kcal; $('#fd-p').value = hit.p; $('#fd-c').value = hit.c; $('#fd-f').value = hit.f || 0; $('#fd-fi').value = hit.fi || 0; say('From your foods, instant. Tap Add to today.'); break; }
      if (!settings.ai.key) { say('Add your free Gemini key in Me, under Nutrition and AI.'); break; }
      btn.disabled = true; btn.textContent = 'Estimating...'; say('Asking the AI...');
      try {
        const prompt = 'Estimate the total nutrition for this meal or food: "' + txt + '". Use the amounts given. If an amount is missing, assume one typical serving. Cooked weights unless stated otherwise. Return JSON with kcal (calories), protein_g, carbs_g, fat_g and fiber_g as numbers for the whole thing combined.';
        const body = JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json',
            responseSchema: { type: 'OBJECT', properties: { kcal: { type: 'NUMBER' }, protein_g: { type: 'NUMBER' }, carbs_g: { type: 'NUMBER' }, fat_g: { type: 'NUMBER' }, fiber_g: { type: 'NUMBER' } }, required: ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] } }
        });
        const models = [...new Set([settings.ai.model, 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'])];
        const ctls = []; let done = false;
        const sleep = ms => new Promise(res => setTimeout(res, ms));
        const tryModel = async m => {
          let last = 0;
          for (let a = 0; a < 2; a++) {
            const ctl = new AbortController(); ctls.push(ctl); const to = setTimeout(() => ctl.abort(), 15000);
            let r;
            try {
              r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent', {
                method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.ai.key }, body
              });
            } catch (err) { if (done) throw err; last = 0; continue; } finally { clearTimeout(to); }
            if (r.ok) { const j = await r.json(); return { m, j }; }
            last = r.status;
            if (r.status === 400 || r.status === 403) {
              const t = await r.clone().text().catch(() => ''); const e = new Error('x'); e.key = /api key|API_KEY|permission/i.test(t); e.status = r.status; throw e;
            }
            if (r.status === 404) { const e = new Error('x'); e.status = 404; throw e; }
            if (a === 0) await sleep(800);
          }
          const e = new Error('x'); e.status = last || 503; throw e;
        };
        const race = async list => {
          try { const w = await Promise.any(list.map(tryModel)); done = true; ctls.forEach(c => c.abort()); return w; }
          catch (agg) { return agg; }
        };
        let w = await race(models.slice(0, 3));
        if (w instanceof AggregateError && !w.errors.some(x => x.key)) { say('Those models are busy, trying others...'); w = await race(models.slice(3)); }
        if (w instanceof AggregateError) {
          const keyBad = w.errors.some(x => x.key), st = Math.max(0, ...w.errors.map(x => x.status || 0));
          throw new Error(keyBad ? 'Google rejected the key. Check it in Me.' : st === 429 ? 'Free limit reached or too many requests. Wait a minute and try again.' : 'Google\'s AI is overloaded on every model right now. Try the database search, or type the numbers.');
        }
        const used = w.m;
        const out = JSON.parse(w.j.candidates[0].content.parts[0].text);
        const k = Math.round(+out.kcal), p = r1(+out.protein_g), c = r1(+out.carbs_g), fa = r1(+out.fat_g || 0), fi = r1(+out.fiber_g || 0);
        if ([k, p, c, fa, fi].some(v => isNaN(v) || v < 0)) throw new Error('The AI gave an unusable answer. Try rewording.');
        $('#fd-kcal').value = k; $('#fd-p').value = p; $('#fd-c').value = c; $('#fd-f').value = fa; $('#fd-fi').value = fi;
        say('Estimate: ' + k + ' kcal, ' + p + ' g protein, ' + c + ' g carbs, ' + fa + ' g fat, ' + fi + ' g fiber. Edit if needed, then tap Add to today.' + (used && used !== settings.ai.model ? ' (answered by ' + used + ')' : ''));
      } catch (e) {
        say(e.name === 'AbortError' ? 'Timed out. Check your connection and try again.' : (e instanceof TypeError ? 'No connection. You can still type the numbers yourself.' : e.message));
      }
      btn.disabled = false; btn.textContent = 'Estimate with AI';
      break;
    }
    case 'ai-key-in': settings.ai.key = el.value.trim(); saveSettings(); toast(settings.ai.key ? 'Key saved on this phone' : 'Key removed'); break;
    case 'ai-model-in': settings.ai.model = el.value.trim() || 'gemini-3.1-flash-lite'; saveSettings(); break;
    case 'food-pick': {
      const f = myfoods.find(x => x.id === el.dataset.id); if (!f) break;
      $('#fd-name').value = f.name; $('#fd-kcal').value = f.kcal; $('#fd-p').value = f.p; $('#fd-c').value = f.c; $('#fd-f').value = f.f || 0; $('#fd-fi').value = f.fi || 0;
      $('#fd-aimsg').innerHTML = '<small>From your foods. Tap Add to today.</small>'; $('#fd-res').innerHTML = ''; break;
    }
    case 'food-db': {
      const q = ($('#fd-name').value || '').trim(), msg = $('#fd-aimsg'), box = $('#fd-res'), btn = $('#fd-db');
      if (!q) { msg.innerHTML = '<small>Type a food or product name first.</small>'; break; }
      btn.disabled = true; btn.textContent = 'Searching...'; msg.innerHTML = '<small>Searching Open Food Facts...</small>'; box.innerHTML = '';
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
        const r = await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments,serving_quantity', { signal: ctl.signal });
        clearTimeout(to);
        if (!r.ok) throw new Error('The database returned an error (' + r.status + ').');
        const j = await r.json();
        dbRes = (j.products || []).filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null).slice(0, 5);
        if (!dbRes.length) msg.innerHTML = '<small>No matches. Try the AI estimate or type the numbers.</small>';
        else {
          msg.innerHTML = '<small>Pick one, then set the grams you ate. Values are per 100 g from the database.</small>';
          box.innerHTML = dbRes.map((p, k) => `<button class="dbr" data-act="food-db-pick" data-i="${k}"><b>${esc(p.product_name)}</b>${p.brands ? ' <small>' + esc(p.brands.split(',')[0]) + '</small>' : ''}<small>${Math.round(p.nutriments['energy-kcal_100g'])} kcal, ${Math.round((p.nutriments.proteins_100g || 0) * 10) / 10} g protein, ${Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10} g carbs per 100 g</small></button>`).join('');
        }
      } catch (err) {
        msg.innerHTML = '<small>' + esc(err.name === 'AbortError' ? 'The database is slow right now. Try the AI estimate or type the numbers.' : err instanceof TypeError ? 'No connection.' : err.message) + '</small>';
      }
      btn.disabled = false; btn.textContent = 'Search database';
      break;
    }
    case 'food-db-pick': {
      const p = dbRes[i]; if (!p) break;
      $('#fd-res').innerHTML = `<div class="card sm" style="margin-bottom:10px"><b>${esc(p.product_name)}</b><label style="margin:8px 0 0">Grams eaten<input id="fd-g" type="number" inputmode="decimal" min="0" value="${Math.round(p.serving_quantity) || 100}"></label></div>`;
      window.__dbp = p; if (!$('#fd-name').value.trim()) $('#fd-name').value = p.product_name;
      applyDb(); $('#fd-aimsg').innerHTML = '<small>Numbers fill from the database. Change the grams if needed, then tap Add to today.</small>';
      break;
    }
    case 'food-add': {
      const num = id => { const v = parseFloat(String($('#' + id).value).replace(',', '.')); return isNaN(v) || v < 0 ? 0 : Math.round(v * 10) / 10; };
      const e = { id: uid(), t: Date.now(), name: ($('#fd-name').value || '').trim(), kcal: Math.round(num('fd-kcal')), p: num('fd-p'), c: num('fd-c'), f: num('fd-f'), fi: num('fd-fi') };
      if (!e.kcal && !e.p && !e.c && !e.f && !e.fi) { toast('Enter calories or a nutrient.'); break; }
      const k = todayKey(); food[k] = food[k] || []; food[k].push(e); saveFood();
      if (e.name) {
        const m = myfoods.find(f => f.name.toLowerCase() === e.name.toLowerCase());
        if (m) { m.kcal = e.kcal; m.p = e.p; m.c = e.c; m.f = e.f; m.fi = e.fi; m.n++; m.last = Date.now(); }
        else { myfoods.push({ id: uid(), name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f, fi: e.fi, n: 1, last: Date.now() }); if (myfoods.length > 300) myfoods.sort((a, b) => b.last - a.last).length = 300; }
        saveMy();
      }
      toast('Added'); render(); break;
    }
    case 'food-del': {
      const k = todayKey(); food[k] = dayFood(k).filter(e => e.id !== el.dataset.id);
      if (!food[k].length) delete food[k];
      saveFood(); render(); break;
    }
    case 'summary-done': go('home', {}, true); break;
    case 'note-in': { const s = sessions.find(x => x.id === el.dataset.id); if (s) { s.note = el.value; s.updatedAt = Date.now(); saveSessions(); } break; }
    case 'hist-mode': hist.mode = el.dataset.m; render(); break;
    case 'cal-nav': { const d = new Date(hist.y, hist.m + (+el.dataset.n), 1); hist.y = d.getFullYear(); hist.m = d.getMonth(); render(); break; }
    case 'wk-nav': hist.wk = kAdd(hist.wk || mondayOf(todayKey()), +el.dataset.n); hist.sel = null; render(); break;
    case 'wk-sel': hist.sel = el.dataset.k; render(); break;
    case 'open-day': go('day', { k: el.dataset.k }); break;
    case 'day-nav': { const k = kAdd(view.params.k, +el.dataset.n); if (k <= todayKey()) go('day', { k }, true); break; }
    case 'open-session': go('session', { id: el.dataset.id }); break;
    case 'edit-session': {
      const s = sessions.find(x => x.id === el.dataset.id); if (!s) break;
      editing = clone(s); editing.exercises.forEach(x => x.sets.forEach(t => { t.done = true; }));
      open = 0; go('workout', { edit: true }); break;
    }
    case 'delete-session':
      if (confirm('Delete this workout permanently?')) { sessions = sessions.filter(s => s.id !== el.dataset.id); saveSessions(); go('history', {}, true); }
      break;
    case 'ex-sel': hist.ex = el.value; render(); break;
    case 'metric': hist.metric = el.dataset.m; render(); break;
    case 'range': hist.range = +el.dataset.r; render(); break;
    case 'scale-set': settings.scale = parseFloat(el.dataset.v); saveSettings(); applyTheme(); render(); break;
    case 'theme-set': settings.theme = el.dataset.v; saveSettings(); applyTheme(); render(); break;
    case 'score-in': settings.score = Object.assign({}, settings.score || {}, { [el.dataset.k]: el.checked }); saveSettings(); break;
    case 'goal-step': {
      const f = el.dataset.f, lw = Object.keys(daily).sort().map(k => daily[k].weight).filter(v => v != null).pop(), cur = settings.goals[f] || (f === 'weight' ? (lw || 70) - parseFloat(el.dataset.d) : 0), min = (f === 'steps' || f === 'sleep') ? 1 : 0;
      const nv = Math.max(min, Math.round((cur + parseFloat(el.dataset.d)) * 100) / 100);
      if (nv > 0) settings.goals[f] = nv; else delete settings.goals[f];
      saveSettings(); const inp = $('#gi-' + f); if (inp) inp.value = nv > 0 ? nv : ''; break;
    }
    case 'sound-in': settings.sound = el.checked; saveSettings(); if (el.checked) { unlockAudio(); beep(1); } break;
    case 'vib-in': settings.vibrate = el.checked; saveSettings(); if (el.checked) buzz(100); break;
    case 'export': exportData(); break;
    case 'import-btn': $('#imp').click(); break;
    case 'import-in': if (el.files && el.files[0]) importData(el.files[0]); break;
    case 'logout': try { localStorage.removeItem('mx.auth'); } catch (x) {} render(); break;
    case 'update': {
      try {
        if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
      } catch (e) {}
      location.replace(location.pathname + '?r=' + Date.now()); break;
    }
    case 'reset':
      if (confirm('Delete ALL workouts on this phone? Export a backup first.') && confirm('Really delete everything? This cannot be undone.')) {
        ['mx.sessions', 'mx.active', 'mx.settings', 'mx.timer', 'mx.daily', 'mx.food', 'mx.myfoods'].forEach(k => localStorage.removeItem(k));
        sessions = []; daily = {}; food = {}; myfoods = []; active = null; timer = null; settings = { inc: {}, sound: true, vibrate: true, override: null, theme: 'system', goals: { steps: 10000, sleep: 8, protein: 130 }, ai: { key: '', model: 'gemini-3.1-flash-lite' } };
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
document.addEventListener('input', e => {
  if (e.target.id === 'fd-name') { const b = $('#fd-sug'); if (b) b.innerHTML = sugHTML(e.target.value); }
  else if (e.target.id === 'fd-g') applyDb();
});
document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); tick(); } });

/* ---------- init ---------- */
(function init() {
  applyTheme();
  if (timer) {
    if (!timer.state) { timer.state = 'run'; timer.acc = 0; }
    const s = tel(timer);
    if (timer.state === 'run' && s > timer.max + 900) { timer = null; saveTimer(); } else { timer.f1 = timer.state === 'run' && s >= timer.min ? 1 : 0; timer.f2 = timer.state === 'run' && s >= timer.max ? 1 : 0; }
  }
  if (active) { open = firstIncomplete(active); view = { name: 'workout', params: {} }; }
  try { history.replaceState({ name: view.name, params: view.params }, ''); } catch (e) {}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(r => { persisted = r; }).catch(() => {});
  render();
  setInterval(tick, 500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
})();
