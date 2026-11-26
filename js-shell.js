/* MetriX Train: Shell: login screen, render(), shared widgets (rings, charts, food helpers). Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- login gate (device lock, not server security) ---------- */
const isAuthed = () => !!USER;
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const loginHTML = (err, msg) => `<form id="login" autocomplete="on" style="padding-top:8vh;text-align:center">
  <div style="display:flex;justify-content:center">${tickRing(150, 1, 'var(--acc)', '<div class="n" style="font-size:54px;color:var(--acct)">MX</div>', 60, 3, 12)}</div>
  <h2 style="margin:18px 0 4px;font-size:46px">MetriX Train</h2><p>Log in to your own program</p>
  <div style="text-align:left;margin-top:22px"><label>Username<input id="lg-u" name="username" autocomplete="username" autocapitalize="none" required style="height:54px"></label>
  <label>Password<input id="lg-p" name="password" type="password" autocomplete="current-password" required style="height:54px"></label>
  ${err ? '<p role="alert" class="tg" style="color:var(--rest);margin:8px 0 12px">' + ({ net: 'NO CONNECTION, TRY AGAIN', noprog: 'NO PROGRAM ASSIGNED TO THIS USER YET' }[err] || 'WRONG USERNAME OR PASSWORD') + '</p>' + (msg && !/invalid login credentials/i.test(msg) ? '<p style="margin:0 0 10px"><small>' + esc(msg) + '</small></p>' : '') : ''}</div>
  <button class="btn" type="submit">Log in</button></form>`;
document.addEventListener('submit', async e => {
  if (e.target.id !== 'login') return;
  e.preventDefault();
  const u = $('#lg-u').value.trim().toLowerCase(), p = $('#lg-p').value;
  if (window.MXSYNC) {
    const b = e.target.querySelector('button[type=submit]'); if (b) { b.disabled = true; b.textContent = 'Logging in...'; }
    try {
      await window.MXSYNC.login(u, p);
      const u2 = USERS.find(x => x.id === u);
      if (!u2) { window.MXSYNC.logout(); $('#app').innerHTML = loginHTML('noprog'); return; }
      localStorage.setItem('mx.auth', 'cloud'); localStorage.setItem('mx.user', u2.id); localStorage.setItem('mx.pfx', u2.legacy ? 'mx.' : 'mx.' + u2.id + '.');
      location.replace(location.pathname);
    } catch (x) { $('#app').innerHTML = loginHTML(x && x.net ? 'net' : 'bad', x && x.message); }
    return;
  }
  let h = ''; try { h = await sha256('mx-train|' + u + '|' + p); } catch (x) {}
  const u2 = USERS.find(x => x.hash === h);
  if (h && u2) { try { localStorage.setItem('mx.auth', h); localStorage.setItem('mx.user', u2.id); localStorage.setItem('mx.pfx', u2.legacy ? 'mx.' : 'mx.' + u2.id + '.'); } catch (x) {} location.replace(location.pathname); }
  else { $('#app').innerHTML = loginHTML(true); }
});

function render() {
  const app = $('#app');
  if (ALIAS[view.name]) view.name = ALIAS[view.name];
  if (!views[view.name]) view.name = 'home';
  if (!isAuthed()) { app.innerHTML = loginHTML(false); $('#tabs').style.display = 'none'; return; }
  try {
    app.innerHTML = views[view.name](view.params); track('v:' + view.name);
    $('#tabs').style.display = (view.name === 'workout' || view.name === 'summary') ? 'none' : 'flex';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === tabOf(view.name)));
    wake(); tick(); if (view.name === 'workout') centerReps(); if (view.name === 'trends' && hist.mode === 'body') phFill();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="card"><h3>Something broke</h3><p>' + esc(e.message) + '</p><button class="btn" data-act="reload">Reload</button></div>';
  }
}

/* ---------- views ---------- */
const views = {};
const homeBtn = '<button class="btn ghost" data-go="home">Back to Today</button>';

const sleepTxt = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };
function tickRing(sz, pct, col, ctr, n, w, ln, track) {
  n = n || 60; w = w || 3; ln = ln || 10;
  const r2 = sz / 2 - 2, r1 = r2 - ln, c = sz / 2, k = Math.round(n * Math.max(0, Math.min(1, pct || 0))); let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 360 / n - 90) * Math.PI / 180;
    s += `<line x1="${(c + r1 * Math.cos(a)).toFixed(1)}" y1="${(c + r1 * Math.sin(a)).toFixed(1)}" x2="${(c + r2 * Math.cos(a)).toFixed(1)}" y2="${(c + r2 * Math.sin(a)).toFixed(1)}" style="stroke:${i < k ? col : (track || 'var(--bar)')}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  return `<div style="position:relative;width:${sz}px;height:${sz}px;flex:none"><svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-hidden="true">${s}</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">${ctr}</div></div>`;
}
function miniBars(vals, col, w, h, goal, label) {
  const have = vals.filter(v => v != null), mx = (Math.max(goal || 0, ...have, 1)) * 1.08, n = vals.length, bw = w / n;
  let s = vals.map((v, i) => v == null ? `<circle cx="${(i * bw + bw / 2).toFixed(1)}" cy="${h - 3}" r="2" style="fill:var(--dim)" opacity=".6"/>` : `<rect x="${(i * bw + 1).toFixed(1)}" y="${(h - Math.max(2, v / mx * (h - 2))).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${Math.max(2, v / mx * (h - 2)).toFixed(1)}" rx="2" style="fill:${col}" opacity="${i === n - 1 ? 1 : 0.55}"/>`).join('');
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
  if (a.length) { sub = '7 day avg ' + r1(dw(av(a))) + ' ' + UW(); if (b.length) { const d = av(a) - av(b); tag = Math.abs(d) < 0.05 ? 'SAME' : (d > 0 ? 'UP ' : 'DOWN ') + Math.abs(r1(dw(d))) + ' ' + UW().toUpperCase(); } }
  const tw = settings.goals.weight;
  if (tw > 0 && latest != null) { const dd = r1(latest - tw); sub += '. Target ' + r1(dw(tw)) + ' ' + UW() + ', ' + (Math.abs(dd) < 0.05 ? 'reached' : r1(dw(Math.abs(dd))) + ' ' + UW() + ' ' + (dd > 0 ? 'to lose' : 'to gain')); }
  return `<div class="card" style="padding:14px;margin:12px 0 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="ic" style="background:color-mix(in srgb,var(--body) 18%,transparent);color:var(--body)">BW</span><span class="t" style="color:var(--body)">${tag}</span></div>
  <div class="m" style="margin-top:10px">BODY WEIGHT${t == null && latest != null ? ', LAST LOGGED' : ''}</div><div class="n" style="font-size:32px;margin:2px 0">${latest == null ? '-' : r1(dw(latest))}<span style="font-size:14px;color:var(--dim)"> ${UW()}</span></div><div class="dim" style="font-size:12px;margin-bottom:6px">${sub}</div>${spark(vals, 'var(--body)', 330, 56, 'Body weight, last 14 days')}</div>`;
} const lastDays = n => { const o = []; for (let i = n - 1; i >= 0; i--) o.push(kAdd(todayKey(), -i)); return o; };
const dayFood = k => food[k] || [];
const foodTot = k => dayFood(k).reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0), fi: a.fi + (e.fi || 0) }), { kcal: 0, p: 0, c: 0, f: 0, fi: 0 });
const MAC = [['p', 'Protein', 'protein', 'var(--prot)'], ['c', 'Carbs', 'carbs', 'var(--carb)'], ['f', 'Fat', 'fat', 'var(--fat)'], ['fi', 'Fiber', 'fiber', 'var(--fib)']];
const r1 = v => Math.round(v * 10) / 10;
function applyDb() {
  const p = window.__dbp, g = parseFloat(($('#fd-g') || {}).value); if (!p || isNaN(g)) return;
  const n = p.nutriments, f = g / 100;
  revealNums(); $('#fd-kcal').value = Math.round((n['energy-kcal_100g'] || 0) * f);
  $('#fd-p').value = r1((n.proteins_100g || 0) * f);
  $('#fd-c').value = r1((n.carbohydrates_100g || 0) * f);
  $('#fd-f').value = r1((n.fat_100g || 0) * f);
  $('#fd-fi').value = r1((n.fiber_100g || 0) * f);
}
const MEALS = [['b', 'Breakfast'], ['s1', 'Snack AM'], ['l', 'Lunch'], ['s2', 'Snack PM'], ['d', 'Dinner'], ['s3', 'Snack night']];
let mealSel = 'auto';
function mealByTime(t) { const h = new Date(t).getHours() + new Date(t).getMinutes() / 60; return h < 10.5 ? 'b' : h < 12 ? 's1' : h < 15 ? 'l' : h < 18 ? 's2' : h < 21 ? 'd' : 's3'; }
const MEAL_RE = /^\s*(?:(morning|am|afternoon|pm|evening|night|late)\s+)?(breakfast|brunch|lunch|dinner|supper|snack)\s*(?:[:\-]\s*)?/i;
function mealParse(txt) {
  const m = MEAL_RE.exec(txt || ''); if (!m) return { key: null, clean: (txt || '').trim() };
  const w = m[2].toLowerCase(), q = (m[1] || '').toLowerCase(); let key;
  if (w === 'breakfast' || w === 'brunch') key = 'b'; else if (w === 'lunch') key = 'l'; else if (w === 'dinner' || w === 'supper') key = 'd';
  else key = q === 'morning' || q === 'am' ? 's1' : q === 'afternoon' || q === 'pm' ? 's2' : q === 'evening' || q === 'night' || q === 'late' ? 's3' : null;
  const rest = txt.slice(m[0].length).trim();
  if (w === 'snack' && !key) key = '*';
  return { key, clean: rest || txt.trim() };
}
const mealOf = e => e.m || mealByTime(e.t);
function mealChips() {
  return `<div class="mchips" id="fd-meals" role="group" aria-label="Meal">${[['auto', 'Auto']].concat(MEALS).map(([k, l]) => `<button type="button" data-act="meal-set" data-m="${k}" class="${mealSel === k ? 'on' : ''}" aria-pressed="${mealSel === k}">${l}</button>`).join('')}</div>`;
}
function sugHTML(q) {
  q = (q || '').trim().toLowerCase();
  const list = q ? myfoods.filter(f => f.name.toLowerCase().includes(q)).sort((a, b) => b.n - a.n).slice(0, 5) : [];
  if (!list.length) return '';
  return (q ? '' : '') + list.map(f => `<button data-act="food-pick" data-id="${f.id}">${esc(f.name)} <small>${f.kcal} kcal</small></button>`).join('');
}
let foodsOpen = false;
const TOL = () => { const t = +(settings.tol || 80); return (t >= 70 && t <= 100 ? t : 80) / 100; };
const metV = (v, goal) => goal > 0 && v != null && v >= goal * TOL() - 1e-9;
const fatR = g => g.fat > 0 ? [g.fatLo > 0 ? g.fatLo : Math.round(g.fat * 0.9), g.fatHi > 0 ? g.fatHi : Math.round(g.fat * 1.1)] : null;
const lastKg = () => { const k = Object.keys(daily).sort().map(x => daily[x].weight).filter(v => v != null).pop(); return k || settings.goals.weight || 70; };
const fatRec = (kcal, kg) => { const lo = Math.round(kcal * 0.25 / 9), hi = Math.round(kcal * 0.30 / 9), fl = Math.round(0.6 * kg); return { lo, hi, fl, ok: lo >= fl }; };
const otag = (t, on) => `<span class="otg${on ? ' on' : ''}">${t}</span>`;
function revealNums() { const b = $('#fd-numbers'); if (b && b.hidden) { b.hidden = false; const t = $('#fd-numbtn'); if (t) { t.setAttribute('aria-expanded', 'true'); t.innerHTML = 'Edit numbers \u25B4'; } } }
function foodsList(q) {
  q = (q || '').trim().toLowerCase();
  const l = myfoods.filter(f => !q || f.name.toLowerCase().includes(q)).sort((a, b) => b.last - a.last).slice(0, 40);
  return l.length ? l.map(f => `<button class="li" data-act="food-pick" data-id="${f.id}" style="width:100%;padding:10px 0;text-align:left"><span style="font-size:14px">${esc(f.name)}</span><span class="dim" style="font-size:12px;flex:none;margin-left:10px">${f.kcal} kcal</span></button>`).join('') : '<small>No match.</small>';
}
function foodsFold() {
  if (!myfoods.length || !foodsOpen) return '';
  return `<div style="border:1px solid var(--line);border-radius:14px;padding:10px 14px 4px;margin:10px 0 0"><input id="fd-fq" type="search" autocomplete="off" placeholder="Search your foods" aria-label="Search your foods" style="width:100%;margin-bottom:6px"><div id="fd-fl" style="max-height:300px;overflow:auto">${foodsList('')}</div><small style="display:block;padding:6px 0 8px">Tap one to fill the numbers instantly.</small></div>`;
}
function macroRow(k, label, unit, val, goal, col) {
  const rem = goal > 0 ? goal - val : null, hit = k === 'p' || k === 'fi';
  const tag = goal > 0 ? (rem > 0 ? Math.round(rem) + ' ' + unit.toUpperCase() + ' TO GO' : (hit ? 'GOAL HIT' : rem >= -0.1 * goal ? 'GOAL REACHED' : 'OVER BY ' + Math.round(-rem) + ' ' + unit.toUpperCase())) : 'NO GOAL SET';
  return `<div style="padding:12px 0;border-top:1px solid var(--line)"><div class="brow"><span style="font-weight:600">${label}</span><span><b>${Math.round(val).toLocaleString()}</b> <small>${goal > 0 ? '/ ' + goal.toLocaleString() + ' ' : ''}${unit}</small></span></div>
  ${goal > 0 ? `<div class="bar" role="img" aria-label="${label} ${Math.round(Math.min(1, val / goal) * 100)} percent of goal"><i style="width:${(Math.min(1, val / goal) * 100).toFixed(0)}%;background:${col}"></i></div>` : ''}<div class="tg" style="color:${col}">${tag}</div></div>`;
}

