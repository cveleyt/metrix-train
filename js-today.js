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
let tapeSel = null;
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
  return w.lab + ' is the gap: ' + Math.round(w.pct * 100) + '% of today\'s target, ' + Math.round(w.gap).toLocaleString() + w.unit + ' to go.';
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
  const goal = settings.goals.weight > 0 ? settings.goals.weight : 0;
  const head = '<div class="dl"><b></b><span class="m">BODY</span><b></b></div>';
  if (pts.length < 2) return `${head}<div class="card"><div style="font-size:16px;font-weight:700;line-height:1.3">${pts.length ? 'One weigh-in so far.' : 'No weigh-ins yet.'}</div><div class="dim" style="font-size:12px;margin:2px 0 10px">Weigh yourself the same way each morning. Two or more weigh-ins start the trend line.</div><button class="mini" data-act="qa-log">Log weight</button></div>`;
  const avg = (a, b) => { const v = pts.filter(p => p[0] > a && p[0] <= b).map(p => p[1]); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const now = avg(-7, 0), prior = avg(-14, -7);
  let sentence;
  if (now != null && prior != null) { const d = dw(now) - dw(prior); sentence = Math.abs(d) < 0.1 ? 'Weight is steady this week.' : (d < 0 ? 'Down ' : 'Up ') + r1(Math.abs(d)) + ' ' + UW() + ' this week.'; }
  else sentence = pts.length + ' weigh-ins in the last 3 weeks.';
  const W = 300, H = 64, vs = pts.map(p => dw(p[1])), lo = Math.min(...vs), hi = Math.max(...vs), rg = (hi - lo) || 1;
  const X = n => 4 + (n + 20) / 20 * (W - 8), Y = v => H - 8 - (v - lo) / rg * (H - 16);
  const ma = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 3), i + 1); return [X(p[0]), Y(dw(w.reduce((a, q) => a + q[1], 0) / w.length))]; });
  const dots = pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(dw(p[1])).toFixed(1)}" r="2" style="fill:var(--dim)"/>`).join('');
  const label = 'Weight, last 3 weeks, ' + pts.length + ' weigh-ins. ' + sentence + ' Now ' + wt(pts[pts.length - 1][1]) + '.';
  return `${head}<div class="card"><div style="font-size:16px;font-weight:700;line-height:1.3">${esc(sentence)}</div><div class="dim" style="font-size:12px;margin:2px 0 6px">Last 3 weeks, ${pts.length} weigh-ins. Dots are daily, line is the 4-day average</div>
  <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(label)}">${dots}<polyline points="${ma.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" style="stroke:var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
  <div class="row" style="margin-top:6px;justify-content:space-between"><span class="m">${wt(pts[pts.length - 1][1])} NOW${goal ? ' &middot; GOAL ' + wt(goal) : ''}</span><button class="mini" data-act="qa-log">Weigh in</button></div></div>`;
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
function tapeBlock() {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week), sel = DAYS.some(x => x.key === tapeSel) ? tapeSel : n.dayKey;
  const blocks = DAYS.map(x => {
    const dn = wk.some(s => s.dayKey === x.key), nx = x.key === n.dayKey, st = dn ? 'DONE' : nx ? 'NEXT' : 'TO DO';
    return `<button class="tb ${x.key === sel ? 'sel' : ''} ${dn ? 'tdone' : ''}" data-act="tape-sel" data-k="${esc(x.key)}" aria-pressed="${x.key === sel}" aria-label="${esc(x.name)}, ${st}"><b>${esc(x.name)}</b><span>${st}</span></button>`;
  }).join('');
  let card;
  if (active) {
    card = `<div class="sess"><div class="row" style="justify-content:space-between"><span class="m">IN PROGRESS</span><span class="t" style="color:var(--acct)">${doneCount(active)} OF ${totalCount(active)} SETS</span></div>
    <div class="n" style="font-size:30px;margin:8px 0 14px">${esc(active.name)}</div><button class="btn" data-act="resume">Resume ${esc(active.name)}</button></div>`;
  } else {
    const d = dayOf(sel) || DAYS[0], sets = d.exercises.reduce((a, e) => a + e.sets, 0), done = wk.some(s => s.dayKey === sel), first = d.exercises[0];
    card = `<div class="sess"><div class="row" style="justify-content:space-between"><span class="m">WEEK ${Math.min(n.week, P.weeks)} OF ${P.weeks}</span><span class="t" style="color:var(--dim)">${d.exercises.length} EXERCISES, ${sets} SETS</span></div>
    <div class="n" style="font-size:30px;margin:8px 0 8px">${esc(d.name)}</div>
    ${d.exercises.slice(0, 4).map(ghostRow).join('')}${d.exercises.length > 4 ? `<div class="ex1"><span class="dim">and ${d.exercises.length - 4} more</span><span></span></div>` : ''}
    <button class="btn" style="margin-top:12px" data-act="${sel === n.dayKey ? 'start' : 'start-day'}" data-k="${esc(sel)}">${done ? 'Do ' + esc(d.name) + ' again' : first ? 'Start with ' + esc(first.name) : 'Start ' + esc(d.name)}</button></div>`;
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
  ${bodyStrip()}${coachNoteCard()}${dailyCard()}<div id="logcard">${logCard()}</div>${streakCard()}`;
};
function quickAdd() {
  const row = (ic, t, s, a) => `<button class="qa" data-act="${a}"><span class="ic">${ic}</span><span>${t}<small class="dim">${s}</small></span></button>`;
  showModal(`<div class="m" style="color:var(--acct)">QUICK ADD</div><div style="margin-top:6px">
  ${row('FD', 'Log food', 'Type, scan or pick a saved food', 'qa-food')}${row('WT', 'Weight and steps', 'Today\'s numbers', 'qa-log')}${row('CI', 'Check-in', 'Four taps on how you feel', 'qa-ci')}
  ${row('SP', 'Supplements', 'Tick your stack, sleep times', 'qa-daily')}${row('TR', 'Start workout', 'Next up: ' + esc((dayOf(nextWorkout().dayKey) || DAYS[0]).name), 'qa-start')}${row('ME', 'Settings', 'Profile, goals, program, theme', 'qa-me')}</div>
  <button class="btn ghost" style="margin-top:12px" data-act="mdl-close">Close</button>`);
  const m = $('#mdl'); if (m) m.classList.add('sheet');
}
function homeAct(a, el) {
  switch (a) {
    case 'theme-flip': { const light = document.documentElement.dataset.theme === 'light'; settings.theme = light ? 'dark' : 'light'; saveSettings(); applyTheme(); render(); return true; }
    case 'tape-sel': tapeSel = el.dataset.k; render(); return true;
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
  }
  return false;
}
views.train = p => {
  const n = nextWorkout(), wk = sessions.filter(s => s.week === n.week), l = sortedDesc()[0];
  const chips = DAYS.map(x => { const dn = wk.some(s => s.dayKey === x.key), nx = x.key === n.dayKey; return `<div class="chip ${nx ? 'next' : dn ? 'dn' : ''}"><b>${esc(x.name)}</b><span>${dn ? 'DONE' : nx ? 'NEXT' : 'TO DO'}</span></div>`; }).join('');
  const picker = p.picker ? `<div class="card"><h3>Change what is next</h3><label>Week<input id="pk-week" type="number" min="1" inputmode="numeric" value="${n.week}"></label>
    <label>Workout<select id="pk-day">${DAYS.map(x => `<option value="${x.key}" ${x.key === n.dayKey ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="pick-apply">Use this</button><button class="btn ghost" data-act="pick-cancel">Cancel</button></div></div>` : '';
  return `<div class="m">WEEK ${n.week} OF ${P.weeks}</div><h2 style="margin:4px 0 14px;font-size:52px">Train</h2>${resumeCard()}${active ? '' : nextHero(true)}${picker}
  <div class="dl"><b></b><span class="m">THIS WEEK</span><b></b></div><div class="chips">${chips}</div>
  ${l ? `<p>Last workout: ${esc(l.name)} on ${fd(l.finishedAt)}, ${doneCount(l)} sets, ${Math.round(dw(volume(l))).toLocaleString()} ${UW()} volume.</p>` : '<p>No workouts logged yet. Your first one sets the baseline.</p>'}
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
  const W = 300, H = 90, mx = Math.max(goal, ...vals, 1) * 1.12, n = vals.length, bw = W / n;
  const bars = vals.map((v, i) => { if (v == null) return ''; const bh = Math.max(3, v / mx * (H - 4)), x = i * bw + 5, w = bw - 10, y = H - bh; return v >= goal ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" style="fill:${col}"/>` : `<rect x="${(x + 1).toFixed(1)}" y="${(y + 1).toFixed(1)}" width="${(w - 2).toFixed(1)}" height="${(bh - 2).toFixed(1)}" rx="4" fill="none" style="stroke:${col}" stroke-width="2"/>`; }).join('');
  const gy = H - goal / mx * (H - 4);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(label)}">${bars}<line x1="0" x2="${W}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--dim)" stroke-dasharray="4 4"/></svg><div class="mono dim" style="display:flex;font-size:9.5px;margin-top:4px">${labels.map(l => `<span style="flex:1;text-align:center">${l}</span>`).join('')}</div>`;
}
const dayInit = k => 'SMTWTFS'[kDate(k).getDay()];
function fuelStatus(t, g) {
  const head = '<div class="dl"><b></b><span class="m">TODAY SO FAR</span><b></b></div>';
  let say;
  if (!t.kcal && !t.p) say = 'Nothing logged yet today. Type what you ate above.';
  else if (g.protein > 0) say = t.p >= g.protein ? 'Protein goal hit: ' + Math.round(t.p) + ' g.' : 'Protein is the gap: ' + Math.round(t.p) + ' of ' + g.protein + ' g, ' + Math.round(g.protein - t.p) + ' g to go.';
  else say = Math.round(t.kcal).toLocaleString() + ' kcal logged today.';
  return `${head}<p class="sent" style="margin-bottom:0">${esc(say)}</p><div class="card" style="padding:2px 16px 16px">${gaugeLine('Energy', t.kcal, g.calories, 'kcal', 'var(--acct)', 'kc')}${MAC.map(([kk, l, gk, col]) => gaugeLine(l, t[kk], g[gk], 'g', col)).join('')}</div>`;
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
  <div class="cut foodbox" style="margin-top:16px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="n" style="font-size:32px;text-transform:uppercase">What did you eat?</span><span class="t" style="color:var(--move)">${settings.ai && settings.ai.key ? 'AI READY' : 'NO AI KEY'}</span></div><p class="dim" style="margin:4px 0 12px;font-size:13px">Say the meal in your text, like "lunch: chicken and rice", or tap one below. No order needed.</p><textarea id="fd-name" rows="4" class="big" placeholder="e.g. 200 g grilled chicken breast, a cup of rice and a green salad with olive oil" autocomplete="off"></textarea>${mealChips()}<p class="m" style="margin:0 0 10px;font-size:9.5px">AUTO PICKS FROM YOUR TEXT, OR FROM THE TIME OF DAY</p>
  <div class="sugs" id="fd-sug"></div><div id="fd-fold">${foodsFold()}</div>
  <div class="row" style="margin-bottom:6px"><button class="btn ghost" data-act="food-db" id="fd-db">Search database</button><button class="btn ghost" data-act="scan-open" aria-label="Scan barcode">Scan</button><button class="btn" data-act="food-ai" id="fd-ai">Estimate</button></div>
  <p id="fd-aimsg" style="margin:0 0 10px;min-height:18px"><small>Fills the numbers below as an estimate. Check them before adding.</small></p><div id="fd-res"></div>
  <div class="five"><label>Kcal<input id="fd-kcal" type="number" inputmode="numeric" min="0" placeholder="0"></label><label style="color:var(--prot)">Prot<input id="fd-p" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--carb)">Carb<input id="fd-c" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fat)">Fat<input id="fd-f" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fib)">Fiber<input id="fd-fi" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label></div>
  <button class="btn" data-act="food-add">Add to today</button></div>
  ${fuelStatus(t, g)}
  ${'<div class="dl"><b></b><span class="m">TODAY BY MEAL</span><b></b></div>'}${MEALS.map(([mk, ml]) => {
    const es = list.filter(e => mealOf(e) === mk).sort((x, y) => x.t - y.t);
    if (!es.length) return `<div class="card" style="padding:12px 16px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="t" style="color:var(--dim)">EMPTY</span></div></div>`;
    const kc = es.reduce((a, e) => a + (e.kcal || 0), 0);
    return `<div class="card" style="padding:12px 16px 4px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="n kc" style="font-size:20px">${Math.round(kc)}<span style="font-size:11px;color:var(--dim)"> kcal</span></span></div>${es.map(e => `<div class="frow"><div><div style="font-weight:600">${esc(e.name || 'Food')}</div><small><span style="color:var(--prot)">P ${r1(e.p || 0)}</span> &nbsp;<span style="color:var(--carb)">C ${r1(e.c || 0)}</span> &nbsp;<span style="color:var(--fat)">F ${r1(e.f || 0)}</span> &nbsp;<span style="color:var(--fib)">Fi ${r1(e.fi || 0)}</span></small></div><div style="display:flex;align-items:center;gap:10px"><span class="n kc" style="font-size:22px">${e.kcal}<span style="font-size:11px;color:var(--dim)"> kcal</span></span><button class="mini" data-act="food-del" data-id="${e.id}" aria-label="Remove entry">Remove</button></div></div>`).join('')}</div>`;
  }).join('')}${fuelWeek()}`;
};

