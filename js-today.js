/* MetriX Train: Today and Fuel screens. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- today ---------- */
function tilesHTML() {
  const g = settings.goals, ds = lastDays(7), t = daily[todayKey()] || {};
  const tile = (ic, col, lab, big, unit, sub, tag, chart) => `<div class="card" style="padding:14px;margin:0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="ic" style="background:color-mix(in srgb,${col} 18%,transparent);color:${col}">${ic}</span><span class="t" style="color:${col}">${tag}</span></div>
  <div class="m" style="margin-top:10px">${lab}</div><div class="n" style="font-size:32px;margin:2px 0">${big}<span style="font-size:14px;color:var(--dim)"> ${unit}</span></div><div class="dim" style="font-size:12px;margin-bottom:8px">${sub}</div>${chart}</div>`;
  const sp = t.steps == null ? 0 : Math.round(t.steps / g.steps * 100);
  return `<div class="two">${tile('MV', 'var(--move)', 'MOVE', t.steps == null ? '-' : t.steps.toLocaleString(), 'steps', 'Goal ' + g.steps.toLocaleString(), t.steps == null ? 'NOT LOGGED' : sp + '%', miniBars(ds.map(k => (daily[k] || {}).steps), 'var(--move)', 130, 40, g.steps, 'Steps, last 7 days'))}
  ${tile('RS', 'var(--rest)', 'REST', t.sleep == null ? '-' : sleepTxt(t.sleep), '', 'Goal ' + g.sleep + ' h, last night', t.sleep == null ? 'NOT LOGGED' : t.sleep >= g.sleep ? 'HIT' : 'SHORT', miniBars(ds.map(k => (daily[k] || {}).sleep), 'var(--rest)', 130, 40, g.sleep, 'Sleep, last 7 days'))}</div>`;
}
const tilesAll = () => tilesHTML() + bodyTile();
function weekStrip() {
  const mon = mondayOf(todayKey()), tk = todayKey();
  return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:16px 0">${[0, 1, 2, 3, 4, 5, 6].map(n => {
    const k = kAdd(mon, n), i = dayInfo(k), today = k === tk, fut = k > tk;
    return `<button data-act="open-day" data-k="${k}" style="text-align:center" aria-label="${kLong(k)}${i.logged ? ', ' + i.hit + ' of ' + i.of : ''}"><div class="m" style="${today ? 'color:var(--ink)' : ''}">${kDate(k).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</div>${tickRing(42, i.logged && i.of ? i.hit / i.of : 0, today ? 'var(--acc)' : 'var(--move)', '', 24, 2.5, 7)}<div class="m" style="margin-top:2px;${today ? 'color:var(--ink)' : ''}">${fut ? '' : i.logged ? i.hit + '/' + i.of : '-'}</div></button>`;
  }).join('')}</div>`;
}
function fuelSummary() {
  const t = foodTot(todayKey()), g = settings.goals, list = dayFood(todayKey());
  return `<button class="card" data-go="fuel" style="display:block;width:100%;margin-top:12px" aria-label="Open Fuel"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><div class="m">FUEL TODAY</div><div class="n kc" style="font-size:40px;margin-top:6px">${Math.round(t.kcal).toLocaleString()} <span style="font-size:15px;color:var(--dim)">kcal</span></div></div><span class="t" style="color:var(--acct)">${list.length ? list.length + (list.length === 1 ? ' ENTRY' : ' ENTRIES') : 'LOG FOOD'}</span></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px">${MAC.map(([k, l, gk, col]) => `<div><div class="m" style="font-size:9px">${l.toUpperCase()}</div><div class="n" style="font-size:22px;margin:3px 0 5px">${Math.round(t[k])}<span style="font-size:11px;color:var(--dim)"> g</span></div><div class="bar" style="margin-top:0"><i style="width:${g[gk] > 0 ? Math.min(100, t[k] / g[gk] * 100).toFixed(0) : 0}%;background:${col}"></i></div></div>`).join('')}</div></button>`;
}
function logCard() {
  const t = daily[todayKey()] || {};
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">LOG TODAY</span><small>From Samsung Health</small></div>
  <div class="ins" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label>Steps<input data-act="daily-in" data-f="steps" type="number" inputmode="numeric" min="0" value="${t.steps == null ? '' : t.steps}" placeholder="0"></label>
  <label>Weight (${UW()})<input data-act="daily-in" data-f="weight" type="number" inputmode="decimal" step="any" min="0" max="400" value="${t.weight == null ? '' : r1(dw(t.weight))}" placeholder="0"></label></div>
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
function nextCompact() {
  const n = nextWorkout(), d = dayOf(n.dayKey) || DAYS[0], dayIdx = Math.max(0, DAYS.findIndex(x => x.key === n.dayKey)) + 1, wk = Math.min(n.week, P.weeks);
  const strip = [...Array(P.weeks)].map((_, k) => `<i style="height:6px;border-radius:2px;background:${k < wk - 1 ? '#fff' : k === wk - 1 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)'}"></i>`).join('');
  const top = active ? `<div><div class="m">IN PROGRESS, ${doneCount(active)}/${totalCount(active)} SETS</div><div class="n" style="font-size:44px;margin-top:4px;text-transform:uppercase">${esc(active.name)}</div></div><button class="cbtn" data-act="resume">Resume</button>`
    : `<div><div class="m">NEXT UP, DAY ${dayIdx} OF ${DAYS.length}</div><div class="n" style="font-size:44px;margin-top:4px;text-transform:uppercase">${esc(d.name)}</div></div><button class="cbtn" data-act="start">Start</button>`;
  return `<div class="hero" style="padding:14px 16px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:12px">${top}</div>
  <div class="row" style="justify-content:space-between;margin-top:12px"><span class="m">${P.weeks} WEEK PROGRAM</span><span class="m">WEEK ${wk} OF ${P.weeks}</span></div><div style="display:grid;grid-template-columns:repeat(${P.weeks},1fr);gap:4px;margin-top:8px">${strip}</div></div>`;
}
function scoreCompact() {
  const k = todayKey(), i = dayInfo(k), g = settings.goals, d = daily[k] || {}, f = foodTot(k);
  const row = (lab, tag, col) => `<div class="row" style="justify-content:space-between;margin-top:7px;flex-wrap:nowrap"><span style="font-size:13px">${lab}</span><span class="t" style="color:${col}">${tag}</span></div>`;
  const rows = row('Rest ' + (d.sleep == null ? '' : sleepTxt(d.sleep)), d.sleep == null ? 'NOT LOGGED' : d.sleep >= g.sleep ? 'HIT' : 'MISSED', 'var(--rest)')
    + row('Move ' + (d.steps == null ? '' : d.steps.toLocaleString()), d.steps == null ? 'NOT LOGGED' : d.steps >= g.steps ? 'HIT' : Math.round(d.steps / g.steps * 100) + '%', 'var(--move)')
    + row('Protein ' + (f.p ? Math.round(f.p) + ' g' : ''), !f.p ? 'NOT LOGGED' : g.protein > 0 && f.p >= g.protein ? 'HIT' : g.protein > 0 ? Math.round(f.p / g.protein * 100) + '%' : 'LOGGED', 'var(--prot)')
    + row('Train ' + (i.ss.length ? '' : active ? '' : (nextWorkout().dayKey ? (dayOf(nextWorkout().dayKey) || DAYS[0]).name : '')), i.ss.length ? 'DONE' : active ? 'IN PROGRESS' : 'NEXT', 'var(--acct)');
  return `<div class="cut" style="padding:14px 16px"><div class="row" style="gap:14px;flex-wrap:nowrap">${tickRing(120, i.of ? i.hit / i.of : 0, 'var(--acc)', `<div class="n" style="font-size:42px">${i.hit}<span style="font-size:20px;color:var(--dim)">/${i.of}</span></div>`, 48, 3, 10)}<div style="flex:1;min-width:0"><div class="m">DAY SCORE</div>${rows}</div></div></div>`;
}
function refreshRings() { const a = $('#tg'); if (a) a.innerHTML = todayGauges(); }
function backupBanner() {
  if (!sessions.length) return '';
  const lb = settings.lastBackup || 0, d = Math.floor((Date.now() - lb) / 864e5);
  if (lb && d < 7) return '';
  return `<div class="card" style="margin:12px 0 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:10px"><div><b>Backup due</b><br><small>${lb ? 'Last backup ' + d + ' days ago.' : 'No backup yet.'} Your data lives only on this phone.</small></div><div style="display:flex;gap:6px"><button class="mini" data-act="backup-later">Later</button><button class="mini" data-act="export">Export</button></div></div></div>`;
}
/* ---------- Today (direction A) ---------- */
let tapeSel = null, sessOpen = false;
const SVG_BM = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>', SVG_SCAN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16"/></svg>', SVG_SRCH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>';
const SVG_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const SVG_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
function gaugeData() {
  const k = todayKey(), g = settings.goals, d = daily[k] || {}, f = foodTot(k), out = [];
  if (g.steps > 0) out.push({ id: 'move', lab: 'Move', col: 'var(--move)', v: d.steps, pct: d.steps == null ? 0 : d.steps / g.steps, big: d.steps == null ? '-' : d.steps >= 1000 ? (d.steps / 1000).toFixed(1) + 'k' : String(d.steps), sub: 'of ' + (g.steps / 1000) + 'k steps today', tgt: (g.steps >= 1000 ? g.steps / 1000 + 'k' : g.steps), esub: 'steps to go today', say: 'steps', gap: g.steps - (d.steps || 0), unit: ' steps' });
  if (g.sleep > 0) out.push({ id: 'rest', lab: 'Rest', col: 'var(--rest)', v: d.sleep, pct: d.sleep == null ? 0 : d.sleep / g.sleep, big: d.sleep == null ? '-' : sleepTxt(d.sleep).replace(' ', '').replace(/m$/, ''), sub: 'of ' + g.sleep + ' h last night', tgt: g.sleep + 'h', esub: 'to log, last night', say: 'sleep', gap: 0, unit: '' });
  if (g.protein > 0) out.push({ id: 'prot', lab: 'Protein', col: 'var(--prot)', v: f.p || null, pct: f.p / g.protein, big: f.p ? Math.round(f.p) + '' : '-', sub: 'of ' + g.protein + ' g today', tgt: String(g.protein), esub: 'g to go today', say: 'protein', gap: g.protein - f.p, unit: ' g of protein' });
  if (g.calories > 0) out.push({ id: 'kcal', lab: 'Energy', col: 'var(--acct)', v: f.kcal || null, pct: f.kcal / g.calories, big: f.kcal ? Math.round(f.kcal).toLocaleString() : '-', sub: 'of ' + g.calories.toLocaleString() + ' kcal today', tgt: g.calories.toLocaleString(), esub: 'kcal to go today', say: 'energy', gap: g.calories - f.kcal, unit: ' kcal' });
  return out;
}
function todaySentence(gs) {
  const have = gs.filter(x => x.v != null);
  if (!gs.length) return 'Set your targets in Me to see how today is going.';
  if (!have.length) return 'Nothing logged yet today. Start with your first meal or your steps.';
  const open = gs.filter(x => x.pct < 1 && x.id !== 'rest' && x.id !== 'kcal');
  if (!open.length) return gs.every(x => x.pct >= 1 || x.v == null) ? 'Every target you have logged today is met.' : 'Protein and steps are on target today.';
  const w = open.sort((a, b) => a.pct - b.pct)[0];
  if (w.v == null) return (w.lab === 'Move' ? 'Steps are' : w.lab + ' is') + ' not logged yet today.';
  { const gl = Math.round(w.v + w.gap), u = w.say === 'protein' ? ' g' : ''; return (w.lab === 'Move' ? 'Steps are' : w.lab + ' is') + ' the gap: ' + Math.round(w.v).toLocaleString() + ' of ' + gl.toLocaleString() + u + ', ' + Math.round(w.gap).toLocaleString() + u + ' to go.'; }
}
function todayGauges() {
  const gs = gaugeData();
  const cells = gs.map(x => {
    const emp = x.v == null, big = emp ? x.tgt : x.big, sub = emp ? x.esub : x.sub;
    const lab = x.lab + (emp ? ', not logged, ' + x.tgt + ' ' + x.esub : ', ' + x.big + ' ' + x.sub + ', ' + Math.round(x.pct * 100) + ' percent');
    return `<div role="img" aria-label="${esc(lab)}">${tickRing(78, x.pct, x.col, `<div class="n" style="font-size:15px;${emp ? 'color:var(--dim)' : ''}">${esc(big)}</div>`, 40, 2.4, 8, `color-mix(in srgb, ${x.col} 26%, transparent)`)}<div class="gl" style="color:${x.col}">${x.lab}</div><div class="gs">${esc(sub)}</div></div>`;
  }).join('');
  return `<p class="sent" id="tsent">${esc(todaySentence(gs))}</p><div class="gg">${cells}</div>`;
}
function bodyStrip() {
  const tk = todayKey(), pts = [];
  for (let n = -20; n <= 0; n++) { const k = kAdd(tk, n), d = daily[k]; if (d && d.weight > 0) pts.push([n, d.weight]); }
  const goal = settings.goals.weight > 0 ? settings.goals.weight : 0, t = daily[tk] || {};
  const head = '<div class="dl"><b></b><span class="m">BODY</span><b></b></div>';
  const inputs = `<div class="ins" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px"><label>Steps<input data-act="daily-in" data-f="steps" type="number" inputmode="numeric" min="0" value="${t.steps == null ? '' : t.steps}" placeholder="0"></label>
  <label>Weight (${UW()})<input data-act="daily-in" data-f="weight" type="number" inputmode="decimal" step="any" min="0" max="400" value="${t.weight == null ? '' : r1(dw(t.weight))}" placeholder="0"></label></div><p style="margin:8px 0 0"><small>Saved as you type. Weigh yourself the same way each morning.</small></p>`;
  const last = pts.length ? pts[pts.length - 1][1] : 0;
  const big = last ? `<div style="display:flex;align-items:baseline;gap:8px;margin-top:6px"><span class="n" style="font-size:44px;line-height:1">${r1(dw(last))}</span><span class="dim">${UW()} now</span></div>` : '<div style="font-size:16px;font-weight:700;margin-top:6px">No weigh-ins yet.</div>';
  let prog = '';
  if (goal && pts.length >= 2) { const first = pts[0][1], span = goal - first, pc = span ? Math.max(0, Math.min(1, (last - first) / span)) : 1, left = goal - last; prog = `<div style="height:8px;border-radius:99px;background:var(--g3);margin:12px 0 6px" role="img" aria-label="${Math.round(pc * 100)} percent of the way to ${esc(wt(goal))}"><div style="width:${Math.round(pc * 100)}%;height:100%;border-radius:99px;background:var(--acc)"></div></div><small class="dim">${Math.abs(left) < 0.05 ? 'Goal reached.' : r1(Math.abs(dw(left))) + ' ' + UW() + ' to go to ' + esc(wt(goal)) + '.'}</small>`; }
  else if (goal) prog = `<small class="dim" style="display:block;margin-top:8px">Goal ${esc(wt(goal))}</small>`;
  let trend = '';
  if (pts.length >= 6) {
    const W = 300, H = 64, vs = pts.map(p => dw(p[1])), lo = Math.min(...vs), hi = Math.max(...vs), rg = (hi - lo) || 1;
    const X = n => 4 + (n + 20) / 20 * (W - 8), Y = v => H - 8 - (v - lo) / rg * (H - 16);
    const ma = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 3), i + 1); return [X(p[0]), Y(dw(w.reduce((a, q) => a + q[1], 0) / w.length))]; });
    const dots = pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(dw(p[1])).toFixed(1)}" r="2" style="fill:var(--dim)"/>`).join('');
    trend = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;margin-top:12px" role="img" aria-label="Weight, last 3 weeks, ${pts.length} weigh-ins">${dots}<polyline points="${ma.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" style="stroke:var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg><small class="dim">Dots are daily, line is the 4-day average</small>`;
  } else if (pts.length) trend = `<small class="dim" style="display:block;margin-top:6px">The trend line appears after 6 weigh-ins (${pts.length} so far).</small>`;
  return `${head}<div class="card" id="logcard"><div class="row" style="justify-content:space-between"><span class="m">BODY</span>${goal ? `<span class="m">GOAL ${esc(wt(goal))}</span>` : ''}</div>${big}${prog}${trend}${inputs}</div>`;
}
function nextStep() {
  const k = todayKey(), f = dayFood(k), d = daily[k] || {}, n = nextWorkout(), dn = (dayOf(n.dayKey) || DAYS[0]).name;
  if (!f.length) return ['Log your first meal', 'qa-food'];
  if (d.steps == null) return ['Log your steps', 'qa-log'];
  if (!sessions.some(s => dkey(s.finishedAt) === k) && !active) return ['Train: ' + dn, 'start'];
  return ['See how your week is going', 'go-trends'];
}
function ghostRow(e) {
  const pv = prevFor(e), sg = suggest(e, pv), rng = e.lo === e.hi ? e.lo : e.lo + '-' + e.hi;
  let last = 'FIRST TIME', right = '<span class="gtry"></span>';
  if (pv) {
    const top = pv.sets.reduce((b, t) => (t.w > b.w || (t.w === b.w && t.r > b.r)) ? t : b, pv.sets[0]);
    last = 'LAST TIME ' + (e.noWeight ? top.r + ' REPS' : r1(dw(top.w)) + ' x ' + top.r + ' ' + UW().toUpperCase());
    const tw = sg.apply || top.w;
    if (!e.noWeight) right = `<span class="gtry">TRY<br><b>${r1(dw(tw))}</b></span>`;
  }
  return `<div class="ex1 gx"><span><b>${esc(e.name)}</b> <span class="dim" style="font-size:12px">${e.sets} x ${rng}</span><span class="glast">${esc(last)}</span></span>${right}</div>`;
}
const SVG_CK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function doneToday() { const k = todayKey(); return sortedDesc().find(s => dkey(s.finishedAt) === k) || null; }
function doneCard(s) {
  const nb = []; s.exercises.forEach(x => { if (x.skipped) return; const ts = topSet(x), b = bestSet(x.name, s.id); if (ts && b && (ts.w > b.w || (ts.w === b.w && ts.r > b.r))) nb.push(x.name); });
  const mins = s.startedAt && s.finishedAt > s.startedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
  return `<div class="sess dnc"><div class="row" style="justify-content:space-between"><span class="m dtag">${SVG_CK} DONE TODAY</span><span class="m">${esc(fd(s.finishedAt).toUpperCase())}${mins ? ' &middot; ' + mins + ' MIN' : ''}</span></div>
  <div class="n" style="font-size:34px;margin:8px 0 4px">${esc(s.name)}</div><div style="font-weight:600">${doneCount(s)} sets &middot; ${Math.round(dw(volume(s))).toLocaleString()} ${UW()} volume</div>
  ${nb.length ? `<div style="margin-top:8px"><span class="tag">NEW BEST</span> <small class="dim">${esc(nb.slice(0, 3).join(', '))}</small></div>` : ''}
  <button class="btn" style="margin-top:14px" data-act="view-sum" data-id="${esc(s.id)}">View summary</button></div>`;
}
function nextRow() {
  const n = nextWorkout(), d = dayOf(n.dayKey) || DAYS[0], sets = d.exercises.reduce((a, e) => a + e.sets, 0);
  return `<div class="card nxr"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><span class="m">NEXT WORKOUT</span><div style="font-size:18px;font-weight:700;margin-top:3px">${esc(d.name)} <small class="dim" style="font-weight:500">&middot; ${d.exercises.length} exercises, ${sets} sets</small></div></div></div>
  <button class="lnk" data-act="start">Start ${esc(d.name)} anyway &rsaquo;</button></div>`;
}
function tapeBlocks(sel, live) {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week);
  return DAYS.map(x => {
    const dn = wk.some(s => s.dayKey === x.key), nx = x.key === n.dayKey, st = dn ? 'DONE' : nx ? 'NEXT' : 'TO DO', cls = 'tb ' + (x.key === sel ? 'sel ' : '') + (dn ? 'tdone' : '');
    const inner = `<b>${esc(x.name)}</b><span>${st}${dn ? ' ' + SVG_CK : ''}</span>`;
    return live ? `<button class="${cls}" data-act="tape-sel" data-k="${esc(x.key)}" aria-pressed="${x.key === sel}" aria-label="${esc(x.name)}, ${st}">${inner}</button>` : `<div class="${cls}" aria-label="${esc(x.name)}, ${st}">${inner}</div>`;
  }).join('');
}
function tapeBlock() {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week), sel = DAYS.some(x => x.key === tapeSel) ? tapeSel : n.dayKey;
  const blocks = tapeBlocks(sel, true), dtd = doneToday();
  let card;
  if (!active && dtd && sel === n.dayKey) card = doneCard(dtd) + nextRow();
  else if (active) {
    card = `<div class="sess"><div class="row" style="justify-content:space-between"><span class="m">IN PROGRESS</span><span class="t" style="color:var(--acct)">${doneCount(active)} OF ${totalCount(active)} SETS</span></div>
    <div class="n" style="font-size:30px;margin:8px 0 14px">${esc(active.name)}</div><button class="btn" data-act="resume">Resume ${esc(active.name)}</button></div>`;
  } else {
    const d = dayOf(sel) || DAYS[0], sets = d.exercises.reduce((a, e) => a + e.sets, 0), done = wk.some(s => s.dayKey === sel), first = d.exercises[0];
    card = `<div class="sess"><div class="row" style="justify-content:space-between"><span class="m">WEEK ${Math.min(n.week, P.weeks)} OF ${P.weeks}</span><span class="t" style="color:var(--dim)">${d.exercises.length} EXERCISES, ${sets} SETS</span></div>
    <div class="n" style="font-size:30px;margin:8px 0 8px">${esc(d.name)}</div>
    ${(sessOpen ? d.exercises : d.exercises.slice(0, 1)).map(ghostRow).join('')}
    <button class="btn" style="margin-top:12px" data-act="${sel === n.dayKey ? 'start' : 'start-day'}" data-k="${esc(sel)}">${done ? 'Do ' + esc(d.name) + ' again' : first ? 'Start with ' + esc(first.name) : 'Start ' + esc(d.name)}</button>
    ${d.exercises.length > 1 ? `<button class="sesst" data-act="sess-toggle" aria-expanded="${sessOpen}">${sessOpen ? 'Hide exercises' : 'Show all ' + d.exercises.length + ' exercises'}<span aria-hidden="true"> ${sessOpen ? '&#9652;' : '&#9662;'}</span></button>` : ''}</div>`;
  }
  return `<div class="tape" role="group" aria-label="Program days">${blocks}</div>${card}`;
}
function coachNoteCard() {
  const r = settings.review, tk = todayKey();
  if (!r || !r.text || r.at < kAdd(tk, -7)) return '';
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">COACH NOTE</span><span class="t" style="color:var(--dim)">THIS WEEK</span></div><p style="margin:8px 0 0;color:var(--ink2)">${esc(r.text)}</p></div>`;
}
views.home = () => {
  const dt = new Date(), date = dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(), light = document.documentElement.dataset.theme === 'light';
  const [nl, na] = nextStep();
  return `<div class="tblk"><span>MX / TRAIN</span><span>SHEET 01 TODAY</span><span>${esc(date)}</span></div>
  <div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:14px"><h2 style="margin:0">Today</h2><div class="row" style="gap:8px;flex-wrap:nowrap">
  <button class="ibtn" data-act="theme-flip" aria-label="${light ? 'Switch to dark theme' : 'Switch to light theme'}">${light ? SVG_MOON : SVG_SUN}</button>
  <button class="ibtn" data-go="me" aria-label="Open Me"><span class="n" style="font-size:17px">${esc((USER ? USER.name : 'E').charAt(0).toUpperCase())}</span></button></div></div>
  ${backupBanner()}${tapeBlock()}${deloadCard()}
  <div class="dl"><b></b><span class="m">TODAY SO FAR</span><b></b></div><div id="tg">${todayGauges()}</div>
  <button class="btn ghost" style="margin-top:14px" data-act="${na}">${esc(nl)}</button>
  ${bodyStrip()}${coachNoteCard()}${dailyCard()}${streakCard()}`;
};
const QI = { food: '<path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z"/>', wt: '<path d="M5 20h14l-2-12H7zM9 8a3 3 0 0 1 6 0"/>', ci: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 7 2 8 0M9 9.5h.01M15 9.5h.01"/>', pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/>', tr: '<path d="M3 9v6M7 6v12M17 6v12M21 9v6M7 12h10"/>', me: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' };
function quickAdd() {
  const row = (ic, t, s, a, tag, data) => `<button class="qa" data-act="${a}" ${data || ''}><span class="ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${QI[ic]}</svg></span><span style="flex:1">${t}<small class="dim">${s}</small></span>${tag ? `<span class="m" style="color:var(--ok);font-weight:700">${tag}</span>` : ''}</button>`;
  const dtd = !active && doneToday(), nn = esc((dayOf(nextWorkout().dayKey) || DAYS[0]).name);
  showModal(`<div class="m" style="color:var(--acct)">QUICK ADD</div><div style="margin-top:6px">
  ${row('food', 'Log food', 'Type, scan or pick a saved food', 'qa-food')}${row('wt', 'Weight and steps', 'Today\'s numbers', 'qa-log')}${row('ci', 'Check-in', 'Four taps on how you feel', 'qa-ci')}
  ${row('pill', 'Supplements', 'Tick your stack, sleep times', 'qa-daily')}${dtd ? row('tr', esc(dtd.name) + ' done today', 'Next: ' + nn + '. Tap to see the summary', 'view-sum', 'DONE', 'data-id="' + esc(dtd.id) + '"') : row('tr', active ? 'Resume workout' : 'Start workout', active ? esc(active.name) : 'Next up: ' + nn, active ? 'resume' : 'qa-start')}${row('me', 'Settings', 'Profile, goals, program, theme', 'qa-me')}</div>`);
  const m = $('#mdl'); if (m) m.classList.add('sheet');
}
function homeAct(a, el) {
  switch (a) {
    case 'theme-flip': { const light = document.documentElement.dataset.theme === 'light'; settings.theme = light ? 'dark' : 'light'; saveSettings(); applyTheme(); render(); return true; }
    case 'tape-sel': tapeSel = el.dataset.k; render(); return true;
    case 'food-edit': foodEdit(el.dataset.id); return true;
    case 'ef-meal': efMeal = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); return true;
    case 'food-save': {
      const k = todayKey(), e = dayFood(k).find(x => x.id === el.dataset.id); if (!e) { closeModal(); return true; }
      const num = key => { const v = parseFloat(String($('#ef-' + key).value).replace(',', '.')); return isNaN(v) || v < 0 ? 0 : Math.round(v * 10) / 10; };
      const nm = ($('#ef-name').value || '').trim();
      Object.assign(e, { name: nm, kcal: Math.round(num('kcal')), p: num('p'), c: num('c'), f: num('f'), fi: num('fi'), m: efMeal || mealOf(e), u: Date.now() });
      saveFood(); closeModal(); toast('Entry updated'); render(); return true;
    }
    case 'food-rm': { const k = todayKey(); food[k] = dayFood(k).filter(e => e.id !== el.dataset.id); if (!food[k].length) delete food[k]; saveFood(); closeModal(); toast('Entry removed'); render(); return true; }
    case 'fd-nums': case 'fd-mealtog': { const box = $(a === 'fd-nums' ? '#fd-numbers' : '#fd-mealbox'); if (box) { box.hidden = !box.hidden; el.setAttribute('aria-expanded', !box.hidden); el.innerHTML = el.innerHTML.replace(/[\u25BE\u25B4]|&#9662;|&#9652;/, box.hidden ? '\u25BE' : '\u25B4'); } return true; }
    case 'sess-toggle': sessOpen = !sessOpen; render(); return true;
    case 'start-day': if (active && !confirm('You have a workout in progress. Replace it?')) return true; startSession({ week: nextWorkout().week, dayKey: el.dataset.k }); tapeSel = null; return true;
    case 'start': tapeSel = null; return false;
    case 'qa-open': quickAdd(); return true;
    case 'qa-food': closeModal(); go('fuel'); setTimeout(() => { const i = $('#fd-name'); if (i) i.focus(); }, 80); return true;
    case 'qa-log': closeModal(); go('home'); setTimeout(() => { const c = $('#logcard'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = document.querySelector('#logcard input'); if (i) i.focus({ preventScroll: true }); }, 80); return true;
    case 'qa-ci': closeModal(); ciModal(); return true;
    case 'qa-daily': closeModal(); dailyOpen = true; go('home'); render(); return true;
    case 'qa-start': closeModal(); act('start', el); return true;
    case 'qa-me': closeModal(); go('me'); return true;
    case 'go-trends': go('trends'); return true;
    case 'view-sum': closeModal(); go('summary', { id: el.dataset.id }); return true;
  }
  return false;
}
function recentList() {
  const l = sortedDesc().slice(0, 3); if (!l.length) return '<p>No workouts logged yet. Your first one sets the baseline.</p>';
  return l.map(s => `<button class="card rcw" data-act="view-sum" data-id="${esc(s.id)}"><div><b>${esc(s.name)}</b><br><small class="dim">${esc(fd(s.finishedAt))} &middot; ${doneCount(s)} sets, ${Math.round(dw(volume(s))).toLocaleString()} ${UW()}</small></div><span class="dim">&rsaquo;</span></button>`).join('');
}
views.train = p => {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week), l = sortedDesc()[0];
  const chips = tapeBlocks(n.dayKey, false), dtd = doneToday();
  const picker = p.picker ? `<div class="card"><h3>Change what is next</h3><label>Week<input id="pk-week" type="number" min="1" inputmode="numeric" value="${n.week}"></label>
    <label>Workout<select id="pk-day">${DAYS.map(x => `<option value="${x.key}" ${x.key === n.dayKey ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="pick-apply">Use this</button><button class="btn ghost" data-act="pick-cancel">Cancel</button></div></div>` : '';
  return `<div class="m">WEEK ${n.week} OF ${P.weeks}</div><h2 style="margin:4px 0 14px;font-size:52px">Train</h2>${resumeCard()}${active ? '' : dtd ? doneCard(dtd) + nextRow() : nextHero(true)}${picker}
  <div class="dl"><b></b><span class="m">THIS WEEK</span><b></b></div><div class="tape" role="group" aria-label="Program days">${chips}</div>
  <div class="dl"><b></b><span class="m">RECENT WORKOUTS</span><b></b></div>${recentList()}
  <button class="card" data-go="info" style="display:block;width:100%"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><b>Program guide</b><br><small>Exercises, tempo, rest and progression rules</small></div><span class="dim">&rsaquo;</span></div></button>`;
};

/* ---------- shared data patterns (v3.7): tick gauge line, goal bars (filled = hit, outline = missed) ---------- */
function tickBar(pct, col) {
  const n = 40, k = Math.round(n * Math.max(0, Math.min(1, pct || 0)));
  return `<div class="tkb" aria-hidden="true">${[...Array(n)].map((_, i) => `<i style="background:${i < k ? col : 'color-mix(in srgb, ' + col + ' 22%, transparent)'};${i % 5 === 0 ? 'height:100%' : ''}"></i>`).join('')}</div>`;
}
function gaugeLine(label, val, goal, unit, col, cls) {
  const rem = goal > 0 ? goal - val : null;
  const tag = goal > 0 ? (rem > 0 ? Math.round(rem).toLocaleString() + ' ' + unit.toUpperCase() + ' TO GO TODAY' : rem >= -0.1 * goal ? 'GOAL REACHED' : 'OVER BY ' + Math.round(-rem).toLocaleString() + ' ' + unit.toUpperCase()) : 'NO GOAL SET';
  return `<div class="${cls || ''}" style="margin-top:14px" role="img" aria-label="${esc(label)} ${Math.round(val)} ${unit}${goal > 0 ? ' of ' + goal + ', ' + Math.round(Math.min(1, val / goal) * 100) + ' percent' : ''}"><div class="row" style="align-items:baseline;flex-wrap:nowrap"><span style="font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)">${label}</span><span><b style="font-size:16px">${Math.round(val).toLocaleString()}</b> <span class="mono dim" style="font-size:11px">${goal > 0 ? 'OF ' + goal.toLocaleString() + ' ' : ''}${unit.toUpperCase()}</span></span></div>${goal > 0 ? tickBar(val / goal, col) : ''}<div class="mono dim" style="font-size:10.5px;margin-top:4px">${tag}</div></div>`;
}
function goalBars(vals, goal, col, labels, label) {
  const W = 300, H = 70, mx = Math.max(goal, ...vals.filter(v => v != null), 1) * 1.12, n = vals.length, bw = W / n;
  const bars = vals.map((v, i) => { if (v == null) return `<circle cx="${(i * bw + bw / 2).toFixed(1)}" cy="${H - 4}" r="2.5" style="fill:var(--dim)" opacity=".6"/>`; const bh = Math.max(3, v / mx * (H - 4)), x = i * bw + 5, w = bw - 10, y = H - bh; return v >= goal ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" style="fill:${col}"/>` : `<rect x="${(x + 1).toFixed(1)}" y="${(y + 1).toFixed(1)}" width="${(w - 2).toFixed(1)}" height="${(bh - 2).toFixed(1)}" rx="4" fill="none" style="stroke:${col}" stroke-width="2"/>`; }).join('');
  const gy = H - goal / mx * (H - 4);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(label)}">${bars}<line x1="0" x2="${W}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--dim)" stroke-dasharray="4 4"/></svg><div class="mono dim" style="display:flex;font-size:9.5px;margin-top:4px">${labels.map(l => `<span style="flex:1;text-align:center">${l}</span>`).join('')}</div>`;
}
const dayInit = k => 'SMTWTFS'[kDate(k).getDay()];
function pbar(v, goal, col, h) {
  const over = goal > 0 && v > goal * 1.1;
  return `<div style="height:${h}px;border-radius:99px;background:var(--g3);overflow:hidden" aria-hidden="true"><div style="width:${goal > 0 ? Math.min(100, v / goal * 100).toFixed(0) : 0}%;height:100%;border-radius:99px;background:${col}"></div></div>`;
}
function leftTxt(v, goal, unit) {
  if (!(goal > 0)) return 'No goal set';
  const r = goal - v;
  return r > 0 ? Math.round(r).toLocaleString() + ' ' + unit + ' left' : r >= -0.1 * goal ? 'Goal reached' : 'Over by ' + Math.round(-r).toLocaleString() + ' ' + unit;
}
function fuelStatus(t, g) {
  const head = '<div class="dl"><b></b><span class="m">TODAY SO FAR</span><b></b></div>';
  let say;
  if (!t.kcal && !t.p) say = 'Nothing logged yet today. Add what you ate below.';
  else if (g.protein > 0) say = t.p >= g.protein ? 'Protein goal hit: ' + Math.round(t.p) + ' g.' : 'Protein is the gap: ' + Math.round(t.p) + ' of ' + g.protein + ' g, ' + Math.round(g.protein - t.p) + ' g to go.';
  else say = Math.round(t.kcal).toLocaleString() + ' kcal logged today.';
  const hero = `<div role="img" aria-label="Protein ${Math.round(t.p)} grams${g.protein > 0 ? ' of ' + g.protein + ', ' + leftTxt(t.p, g.protein, 'g') : ''}"><div class="mono dim" style="font-size:11px;letter-spacing:.6px">PROTEIN, TODAY</div><div style="display:flex;align-items:baseline;gap:8px;margin-top:4px"><span style="font-size:48px;font-weight:700;letter-spacing:-.03em;line-height:1">${Math.round(t.p)}</span><span class="dim" style="font-size:15px">${g.protein > 0 ? 'of ' + g.protein + ' g' : 'g'}</span></div>${g.protein > 0 ? `<div style="margin:10px 0 6px">${pbar(t.p, g.protein, 'var(--prot)', 16)}</div>` : ''}<div style="font-size:14px;font-weight:600">${esc(leftTxt(t.p, g.protein, 'g'))}</div></div>`;
  const en = `<div class="kc" style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)" role="img" aria-label="Energy ${Math.round(t.kcal)} kilocalories${g.calories > 0 ? ' of ' + g.calories : ''}"><div class="row" style="align-items:baseline;flex-wrap:nowrap"><span style="font-weight:600">Energy</span><span><b style="font-size:17px">${Math.round(t.kcal).toLocaleString()}</b><span class="dim" style="font-size:13px">${g.calories > 0 ? ' / ' + g.calories.toLocaleString() : ''} kcal</span></span></div>${g.calories > 0 ? `<div style="margin:7px 0 4px">${pbar(t.kcal, g.calories, 'var(--acct)', 10)}</div>` : ''}<div class="dim" style="font-size:12.5px;text-align:right">${esc(leftTxt(t.kcal, g.calories, 'kcal'))}</div></div>`;
  const tiles = MAC.slice(1).map(([kk, l, gk, col]) => `<div style="background:var(--g2);border-radius:14px;padding:12px 10px;min-width:0" role="img" aria-label="${l} ${Math.round(t[kk])} grams${g[gk] > 0 ? ' of ' + g[gk] + ', ' + leftTxt(t[kk], g[gk], 'g') : ''}"><div class="mono dim" style="font-size:10px;letter-spacing:.5px">${l.toUpperCase()}</div><div style="font-size:22px;font-weight:700;margin-top:4px;letter-spacing:-.02em">${Math.round(t[kk])}<span class="dim" style="font-size:12px;font-weight:500"> g</span></div><div class="dim" style="font-size:11.5px">${g[gk] > 0 ? 'of ' + g[gk] + ' g' : 'no goal'}</div>${g[gk] > 0 ? `<div style="margin:8px 0 5px">${pbar(t[kk], g[gk], col, 6)}</div>` : '<div style="height:19px"></div>'}<div style="font-size:11.5px;font-weight:600">${esc(g[gk] > 0 ? leftTxt(t[kk], g[gk], '').trim() : '')}</div></div>`).join('');
  return `${head}<p class="sent" style="margin-bottom:10px">${esc(say)}</p><div class="card">${hero}${en}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">${tiles}</div></div>`;
}
let efMeal = null;
function foodEdit(id) {
  const k = todayKey(), e = dayFood(k).find(x => x.id === id); if (!e) return;
  efMeal = mealOf(e);
  const n = (key, lab) => `<label>${lab}<input id="ef-${key}" type="number" inputmode="decimal" step="any" min="0" value="${e[key] || 0}"></label>`;
  showModal(`<div class="m" style="color:var(--acct)">EDIT ENTRY</div><div class="n" style="font-size:30px;margin:6px 0 10px">Edit food</div>
  <label>Name<input id="ef-name" type="text" autocomplete="off" value="${esc(e.name || '')}"></label>
  <div class="m" style="margin:4px 0 6px">MEAL</div><div class="row" style="gap:6px;margin-bottom:12px">${MEALS.map(([mk, ml]) => `<button class="mini${mk === efMeal ? ' on' : ''}" data-act="ef-meal" data-v="${mk}" aria-pressed="${mk === efMeal}">${ml}</button>`).join('')}</div>
  <div class="five">${n('kcal', 'Kcal')}${n('p', 'Prot')}${n('c', 'Carb')}${n('f', 'Fat')}${n('fi', 'Fiber')}</div>
  <div class="mrow" style="margin-top:14px"><button class="btn ghost" data-act="food-rm" data-id="${esc(id)}" style="border-color:var(--warn);color:var(--warn)">Remove meal</button><button class="btn" data-act="food-save" data-id="${esc(id)}">Save</button></div>`);
}
function fuelWeek() {
  const g = settings.goals; if (!(g.protein > 0)) return '';
  const ds = lastDays(7), vals = ds.map(k => { const f = dayFood(k); return f.length ? foodTot(k).p : null; });
  const hit = vals.filter(v => v != null && v >= g.protein).length, have = vals.filter(v => v != null).length;
  const head = have ? 'You hit protein on ' + hit + ' of ' + have + ' logged days.' : 'No food logged in the last 7 days.';
  return `<div class="dl"><b></b><span class="m">THIS WEEK</span><b></b></div><div class="card"><div style="font-size:16px;font-weight:700;line-height:1.3">${esc(head)}</div><div class="dim" style="font-size:12px;margin:2px 0 10px">Last 7 days, goal ${g.protein} g. Filled bar = goal hit, outline = missed</div>${goalBars(vals, g.protein, 'var(--prot)', ds.map(dayInit), 'Protein, last 7 days. ' + head)}<div class="mono dim" style="font-size:10.5px;margin-top:8px">TODAY IS STILL OPEN</div></div>`;
}
/* ---------- fuel ---------- */
views.fuel = () => {
  const k = todayKey(), t = foodTot(k), g = settings.goals, list = dayFood(k);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const energy = g.calories > 0
    ? `<div style="display:flex;align-items:center;gap:18px;margin-top:10px">${tickRing(150, t.kcal / g.calories, 'var(--carb)', `<div class="n" style="font-size:36px">${Math.round(t.kcal).toLocaleString()}</div><div class="m">KCAL</div>`, 60, 3, 12)}<div style="flex:1"><div class="m">${g.calories - t.kcal >= 0 ? 'REMAINING' : 'OVER BY'}</div><div class="n" style="font-size:40px;margin:4px 0 8px">${Math.abs(Math.round(g.calories - t.kcal)).toLocaleString()}</div><span class="t" style="color:var(--carb)">${Math.round(t.kcal / g.calories * 100)}% OF GOAL</span></div></div>`
    : `<div class="n" style="font-size:56px;margin:8px 0 4px">${Math.round(t.kcal).toLocaleString()} <span style="font-size:18px;color:var(--dim)">kcal</span></div><small>Set an energy goal in Me, Goals and targets, to see a ring here.</small>`;
  return `<div class="tblk"><span>MX / TRAIN</span><span>SHEET 03 FUEL</span><span>${esc(date)}</span></div><div class="row" style="justify-content:space-between"><div><div class="m">${esc(date)}</div><h2 style="margin:4px 0 0;font-size:52px">Fuel</h2></div><span class="t" style="color:var(--dim)">${list.length} ${list.length === 1 ? 'ENTRY' : 'ENTRIES'}</span></div>
  <div class="p"></div>
  ${fuelStatus(t, g)}
  <div class="card foodbox2" style="margin-top:12px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span style="font-size:20px;font-weight:700">Add food</span><span class="t" style="color:var(--move)">${settings.ai && settings.ai.key ? 'AI READY' : 'NO AI KEY'}</span></div>
  <textarea id="fd-name" rows="2" class="big" placeholder="What did you eat? e.g. 200 g chicken, a cup of rice" autocomplete="off" style="margin-top:10px"></textarea>
  <div class="sugs" id="fd-sug"></div>
  <div class="fb3"><button data-act="foods-toggle" aria-expanded="${foodsOpen}" ${myfoods.length ? '' : 'disabled'}>${SVG_BM}<span>Saved (${myfoods.length})</span></button><button data-act="scan-open" aria-label="Scan barcode">${SVG_SCAN}<span>Scan</span></button><button data-act="food-db" id="fd-db">${SVG_SRCH}<span>Search</span></button></div>
  <div id="fd-fold">${foodsFold()}</div>
  <div class="row" style="margin:12px 0 0;gap:8px;justify-content:flex-start"><button class="mini" id="fd-mealbtn" data-act="fd-mealtog" aria-expanded="false">Meal: ${esc(mealSel === 'auto' ? 'Auto' : (MEALS.find(m => m[0] === mealSel) || ['', 'Auto'])[1])} &#9662;</button><button class="mini" data-act="fd-nums" aria-expanded="false" id="fd-numbtn">Edit numbers &#9662;</button></div>
  <div id="fd-mealbox" hidden style="margin-top:10px">${mealChips()}<p class="m" style="margin:0 0 6px;font-size:9.5px">AUTO PICKS FROM YOUR TEXT, OR FROM THE TIME OF DAY</p></div>
  <p id="fd-aimsg" style="margin:0;min-height:0"><small></small></p><div id="fd-res"></div>
  <div id="fd-numbers" hidden style="margin-top:6px"><div class="five"><label>Kcal<input id="fd-kcal" type="number" inputmode="numeric" min="0" placeholder="0"></label><label style="color:var(--prot)">Prot<input id="fd-p" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--carb)">Carb<input id="fd-c" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fat)">Fat<input id="fd-f" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fib)">Fiber<input id="fd-fi" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label></div></div>
  <button class="btn" data-act="food-add" style="margin-top:12px">Add to today</button><button class="lnk" data-act="food-ai" id="fd-ai" style="display:block;margin:10px auto 0;text-align:center">Estimate numbers with AI</button></div>
  ${'<div class="dl"><b></b><span class="m">TODAY BY MEAL</span><b></b></div>'}${MEALS.map(([mk, ml]) => {
    const es = list.filter(e => mealOf(e) === mk).sort((x, y) => x.t - y.t);
    if (!es.length) return `<div class="card" style="padding:12px 16px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="t" style="color:var(--dim)">EMPTY</span></div></div>`;
    const kc = es.reduce((a, e) => a + (e.kcal || 0), 0);
    return `<div class="card" style="padding:12px 16px 4px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="n kc" style="font-size:20px">${Math.round(kc)}<span style="font-size:11px;color:var(--dim)"> kcal</span></span></div>${es.map(e => `<button class="frow" data-act="food-edit" data-id="${e.id}" aria-label="Edit ${esc(e.name || 'entry')}" style="width:100%;text-align:left;background:none"><div style="min-width:0"><div class="fname">${esc(e.name || 'Food')}</div><small><span style="color:var(--prot)">P ${r1(e.p || 0)}</span> &nbsp;<span style="color:var(--carb)">C ${r1(e.c || 0)}</span> &nbsp;<span style="color:var(--fat)">F ${r1(e.f || 0)}</span> &nbsp;<span style="color:var(--fib)">Fi ${r1(e.fi || 0)}</span></small></div><span class="dim" style="font-size:20px;flex:none" aria-hidden="true">&rsaquo;</span></button>`).join('')}</div>`;
  }).join('')}${fuelWeek()}`;
};

