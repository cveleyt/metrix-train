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
  <div class="ins" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label>Steps<input data-act="daily-in" data-f="steps" type="number" inputmode="numeric" min="0" value="${t.steps == null ? '' : t.steps}" placeholder="0"></label>
  <label>Sleep (h)<input data-act="daily-in" data-f="sleep" type="number" inputmode="decimal" step="any" min="0" max="24" value="${t.sleep == null ? '' : t.sleep}" placeholder="0"></label>
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
function refreshRings() { const a = $('#score-box'), b = $('#tiles'); if (a) a.innerHTML = scoreCompact(); if (b) b.innerHTML = tilesAll(); }
function backupBanner() {
  if (!sessions.length) return '';
  const lb = settings.lastBackup || 0, d = Math.floor((Date.now() - lb) / 864e5);
  if (lb && d < 7) return '';
  return `<div class="card" style="margin:12px 0 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:10px"><div><b>Backup due</b><br><small>${lb ? 'Last backup ' + d + ' days ago.' : 'No backup yet.'} Your data lives only on this phone.</small></div><div style="display:flex;gap:6px"><button class="mini" data-act="backup-later">Later</button><button class="mini" data-act="export">Export</button></div></div></div>`;
}
views.home = () => {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><div class="m">${esc(date)}</div><h2 style="margin:4px 0 0;font-size:52px">Today</h2></div>
  <button data-go="me" aria-label="Open Me" style="width:46px;height:46px;border-radius:15px;background:var(--g3);border:1px solid var(--line);display:flex;align-items:center;justify-content:center"><span class="n" style="font-size:24px">${esc((USER ? USER.name : 'E').charAt(0).toUpperCase())}</span></button></div>
  ${backupBanner()}<div style="height:16px"></div>${fuelSummary()}<div style="height:12px"></div>${nextCompact()}${deloadCard()}<div id="score-box">${scoreCompact()}</div>
  <div class="dl"><b></b><span class="m">LOGGED SO FAR</span><b></b></div><div id="tiles">${tilesAll()}</div>${logCard()}${weekStrip()}`;
};
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

/* ---------- fuel ---------- */
views.fuel = () => {
  const k = todayKey(), t = foodTot(k), g = settings.goals, list = dayFood(k);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const energy = g.calories > 0
    ? `<div style="display:flex;align-items:center;gap:18px;margin-top:10px">${tickRing(150, t.kcal / g.calories, 'var(--carb)', `<div class="n" style="font-size:36px">${Math.round(t.kcal).toLocaleString()}</div><div class="m">KCAL</div>`, 60, 3, 12)}<div style="flex:1"><div class="m">${g.calories - t.kcal >= 0 ? 'REMAINING' : 'OVER BY'}</div><div class="n" style="font-size:40px;margin:4px 0 8px">${Math.abs(Math.round(g.calories - t.kcal)).toLocaleString()}</div><span class="t" style="color:var(--carb)">${Math.round(t.kcal / g.calories * 100)}% OF GOAL</span></div></div>`
    : `<div class="n" style="font-size:56px;margin:8px 0 4px">${Math.round(t.kcal).toLocaleString()} <span style="font-size:18px;color:var(--dim)">kcal</span></div><small>Set an energy goal in Me, Goals and targets, to see a ring here.</small>`;
  return `<div class="row" style="justify-content:space-between"><div><div class="m">${esc(date)}</div><h2 style="margin:4px 0 0;font-size:52px">Fuel</h2></div><span class="t" style="color:var(--dim)">${list.length} ${list.length === 1 ? 'ENTRY' : 'ENTRIES'}</span></div>
  <div class="cut foodbox" style="margin-top:16px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="n" style="font-size:32px;text-transform:uppercase">What did you eat?</span><span class="t" style="color:var(--move)">${settings.ai && settings.ai.key ? 'AI READY' : 'NO AI KEY'}</span></div><p class="dim" style="margin:4px 0 12px;font-size:13px">Say the meal in your text, like "lunch: chicken and rice", or tap one below. No order needed.</p><textarea id="fd-name" rows="4" class="big" placeholder="e.g. 200 g grilled chicken breast, a cup of rice and a green salad with olive oil" autocomplete="off"></textarea>${mealChips()}<p class="m" style="margin:0 0 10px;font-size:9.5px">AUTO PICKS FROM YOUR TEXT, OR FROM THE TIME OF DAY</p>
  <div class="sugs" id="fd-sug">${sugHTML('')}</div>
  <div class="row" style="margin-bottom:6px"><button class="btn ghost" data-act="food-db" id="fd-db">Search database</button><button class="btn ghost" data-act="scan-open" aria-label="Scan barcode">Scan</button><button class="btn" data-act="food-ai" id="fd-ai">Estimate</button></div>
  <p id="fd-aimsg" style="margin:0 0 10px;min-height:18px"><small>Fills the numbers below as an estimate. Check them before adding.</small></p><div id="fd-res"></div>
  <div class="five"><label>Kcal<input id="fd-kcal" type="number" inputmode="numeric" min="0" placeholder="0"></label><label style="color:var(--prot)">Prot<input id="fd-p" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--carb)">Carb<input id="fd-c" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fat)">Fat<input id="fd-f" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label style="color:var(--fib)">Fiber<input id="fd-fi" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label></div>
  <button class="btn" data-act="food-add">Add to today</button></div>
  <div class="cut kc" style="margin-top:0"><div class="row" style="justify-content:space-between"><span class="m">ENERGY</span><span class="m">${g.calories > 0 ? 'GOAL ' + g.calories.toLocaleString() + ' KCAL' : 'NO GOAL'}</span></div>${energy}</div>
  <div class="card" style="padding:4px 16px 12px">${MAC.map(([kk, l, gk, col], ix) => macroRow(kk, l, 'g', t[kk], g[gk], col).replace(ix === 0 ? 'border-top:1px solid var(--line)' : '@@', '')).join('')}</div>
  ${'<div class="dl"><b></b><span class="m">TODAY BY MEAL</span><b></b></div>'}${MEALS.map(([mk, ml]) => {
    const es = list.filter(e => mealOf(e) === mk).sort((x, y) => x.t - y.t);
    if (!es.length) return `<div class="card" style="padding:12px 16px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="t" style="color:var(--dim)">EMPTY</span></div></div>`;
    const kc = es.reduce((a, e) => a + (e.kcal || 0), 0);
    return `<div class="card" style="padding:12px 16px 4px;margin-top:10px"><div class="row" style="justify-content:space-between"><span class="m">${ml.toUpperCase()}</span><span class="n kc" style="font-size:20px">${Math.round(kc)}<span style="font-size:11px;color:var(--dim)"> kcal</span></span></div>${es.map(e => `<div class="frow"><div><div style="font-weight:600">${esc(e.name || 'Food')}</div><small><span style="color:var(--prot)">P ${r1(e.p || 0)}</span> &nbsp;<span style="color:var(--carb)">C ${r1(e.c || 0)}</span> &nbsp;<span style="color:var(--fat)">F ${r1(e.f || 0)}</span> &nbsp;<span style="color:var(--fib)">Fi ${r1(e.fi || 0)}</span></small></div><div style="display:flex;align-items:center;gap:10px"><span class="n kc" style="font-size:22px">${e.kcal}<span style="font-size:11px;color:var(--dim)"> kcal</span></span><button class="mini" data-act="food-del" data-id="${e.id}" aria-label="Remove entry">Remove</button></div></div>`).join('')}</div>`;
  }).join('')}`;
};

