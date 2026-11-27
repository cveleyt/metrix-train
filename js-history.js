/* MetriX Train: History: trends, calendar, week, day and session views, program info. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- daily performance ---------- */
const dkey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const kDate = k => { const [y, m, d] = k.split('-'); return new Date(+y, +m - 1, +d); };
const kAdd = (k, n) => { const d = kDate(k); d.setDate(d.getDate() + n); return dkey(d); };
const kLong = k => kDate(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
let hist = { nq: '', mw: 0, bw: 0, pose: 'front', mode: 'review', logm: 'cal', range: 8, ex: null, metric: 'top', y: new Date().getFullYear(), m: new Date().getMonth(), wk: null, sel: null };
const SC_DEF = { workout: true, steps: true, sleep: true, protein: true, kcal: false, macros: false };
const scoreCfg = () => Object.assign({}, SC_DEF, settings.score || {});
function dayInfo(k) {
  const g = settings.goals, d = daily[k] || {}, f = foodTot(k), ss = sessions.filter(s => dkey(s.finishedAt) === k), sc = scoreCfg();
  const logged = ss.length || d.steps != null || d.sleep != null || d.weight != null || dayFood(k).length;
  const t = [];
  if (sc.workout && (ss.length || (k === todayKey() && active))) t.push(['Workout', ss.length > 0]);
  if (sc.steps) t.push(['Steps', d.steps != null && metV(d.steps, g.steps)]);
  if (sc.sleep) t.push(['Sleep', d.sleep != null && metV(d.sleep, g.sleep)]);
  if (sc.protein && g.protein > 0) t.push(['Protein', metV(f.p, g.protein)]);
  if (sc.kcal && g.calories > 0) t.push(['Energy', f.kcal > 0 && Math.abs(f.kcal - g.calories) <= 0.1 * g.calories]);
  if (sc.macros) {
    if (g.carbs > 0) t.push(['Carbs', f.c > 0 && Math.abs(f.c - g.carbs) <= 0.1 * g.carbs]);
    if (g.fat > 0) t.push(['Fat', f.f > 0 && f.f >= fatR(g)[0] && f.f <= fatR(g)[1]]);
    if (g.fiber > 0) t.push(['Fiber', metV(f.fi, g.fiber)]);
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
const LOGM = ['cal', 'week', 'list', 'notes'];
const histTabs = () => {
  const tabOn = LOGM.includes(hist.mode) ? 'log' : hist.mode === 'muscles' ? 'trends' : hist.mode;
  const top = [['review', 'Week', 'review'], ['trends', 'Lifts', 'trends'], ['body', 'Body', 'body'], [hist.logm || 'cal', 'Log', 'log']];
  let h = `<div class="seg" role="tablist" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${top.map(([m, l, key]) => `<button class="mini${tabOn === key ? ' on' : ''}" role="tab" data-act="hist-mode" data-m="${m}" aria-selected="${tabOn === key}">${l}</button>`).join('')}</div>`;
  if (tabOn === 'log') h += `<div class="seg" style="margin-top:8px">${[['cal', 'Calendar'], ['week', 'Week'], ['list', 'Workouts'], ['notes', 'Notes']].map(([m, l]) => `<button class="mini${hist.mode === m ? ' on' : ''}" data-act="hist-mode" data-m="${m}" aria-pressed="${hist.mode === m}">${l}</button>`).join('')}</div>`;
  return h;
};
function weekCard(head, sub, vals, goal, col, ds, label) {
  return `<div class="card" style="margin-top:12px"><div style="font-size:16px;font-weight:700;line-height:1.3">${esc(head)}</div><div class="dim" style="font-size:12px;margin:2px 0 10px">${esc(sub)}</div>${goalBars(vals, goal, col, ds.map(dayInit), label + '. ' + head)}</div>`;
}
function weekOverview() {
  const g = settings.goals, mon = mondayOf(todayKey()), wk = sessions.filter(s => inWeek(s, mon)), ds = lastDays(7);
  const doneN = DAYS.filter(x => wk.some(s => s.dayKey === x.key)).length;
  const blocks = DAYS.map(x => { const d = wk.some(s => s.dayKey === x.key); return `<div style="flex:1;min-width:0;border-radius:12px;padding:10px 3px;text-align:center;${d ? 'background:var(--accf);color:var(--onacc);border:1.5px solid var(--acc)' : 'border:1.5px dashed var(--line2);color:var(--dim)'}"><b style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.name)}</b><span class="mono" style="font-size:9px;font-weight:600">${d ? 'DONE' : 'TO DO'}</span></div>`; }).join('');
  let out = `<div style="font-size:18px;font-weight:700;line-height:1.3;margin:16px 0 0">${doneN} of ${DAYS.length} sessions done this week.</div><div class="m" style="margin-top:4px">WEEK OF ${esc(kDate(mon).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase())}</div>
  <div class="card" style="margin-top:12px"><div class="m" style="margin-bottom:8px">PROGRAM DAYS</div><div style="display:flex;gap:6px">${blocks}</div></div>`;
  if (g.protein > 0) {
    const v = ds.map(k => dayFood(k).length ? foodTot(k).p : null), have = v.filter(x => x != null).length, hit = v.filter(x => x != null && metV(x, g.protein)).length;
    out += have ? weekCard('Protein met on ' + hit + ' of ' + have + ' logged days.', 'Last 7 days, goal ' + g.protein + ' g. Filled = met, outline = short. Dot = nothing logged', v, g.protein, 'var(--prot)', ds, 'Protein, last 7 days') : '';
  }
  if (g.sleep > 0) {
    const v = ds.map(k => (daily[k] || {}).sleep == null ? null : daily[k].sleep), hv = v.filter(x => x != null);
    if (hv.length) { const av = hv.reduce((a, b) => a + b, 0) / hv.length, diff = Math.round((g.sleep - av) * 60); out += weekCard('Sleep averaged ' + sleepTxt(av) + (diff > 0 ? ', ' + diff + ' min under goal.' : ', on goal.'), 'Last 7 nights, goal ' + g.sleep + ' h. Filled = met, outline = short. Dot = nothing logged', v, g.sleep, 'var(--rest)', ds, 'Sleep, last 7 nights'); }
  }
  if (g.steps > 0) {
    const v = ds.map(k => (daily[k] || {}).steps == null ? null : daily[k].steps), hv = v.filter(x => x != null);
    if (hv.length) { const av = Math.round(hv.reduce((a, b) => a + b, 0) / hv.length); out += weekCard('Steps averaged ' + av.toLocaleString() + ', goal ' + g.steps.toLocaleString() + '.', 'Last 7 days. Filled = met, outline = short. Dot = nothing logged', v, g.steps, 'var(--move)', ds, 'Steps, last 7 days'); }
  }
  return out + '<div class="dl"><b></b><span class="m">WEEKLY REVIEW</span><b></b></div>' + reviewView();
}
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
  <p style="margin:10px 0 0"><small>Targets met per day, as set in Me, Goals and targets. Brighter means more. Tap a day for details.</small></p></div>
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
  dl.push(dial('Move', i.d.steps == null ? '-' : i.d.steps.toLocaleString(), 'steps', i.d.steps == null ? 0 : i.d.steps / g.steps, metV(i.d.steps, g.steps), i.d.steps == null ? 'NOT LOGGED' : metV(i.d.steps, g.steps) ? 'MET' : 'SHORT', 'var(--move)'));
  dl.push(dial('Rest', i.d.sleep == null ? '-' : sleepTxt(i.d.sleep), 'sleep', i.d.sleep == null ? 0 : i.d.sleep / g.sleep, metV(i.d.sleep, g.sleep), i.d.sleep == null ? 'NOT LOGGED' : metV(i.d.sleep, g.sleep) ? 'MET' : 'MISSED BY ' + Math.round((g.sleep - i.d.sleep) * 60) + ' MIN', 'var(--rest)'));
  dl.push(dial('Protein', i.f.p ? Math.round(i.f.p) + ' g' : '-', 'protein', g.protein > 0 ? i.f.p / g.protein : 0, metV(i.f.p, g.protein), !i.f.p ? 'NOT LOGGED' : metV(i.f.p, g.protein) ? 'MET' : 'MISSED BY ' + Math.round(g.protein - i.f.p) + ' G', 'var(--prot)'));
  const vol = s0 ? Math.round(volume(s0)) : null;
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:10px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-n="-7" aria-label="Previous week">&lsaquo;</button><b>Week of ${kLong(mon)}</b><button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-n="7" aria-label="Next week">&rsaquo;</button></div>
  <div class="wkrow">${days.map(x => `<button class="wkd${x.k === sel ? ' sel' : ''}" data-act="wk-sel" data-k="${x.k}" aria-label="${kLong(x.k)}"><span>${kDate(x.k).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</span><b>${kDate(x.k).getDate()}</b><span>${x.logged ? scoreTxt(x) || '-' : 'NONE'}</span></button>`).join('')}</div>
  <div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 style="margin:0">${kLong(sel)}</h3><span class="m">${i.logged && i.of ? i.hit + ' OF ' + i.of + ' MET' : 'NOTHING LOGGED'}</span></div><div class="rings">${dl.join('')}</div><button class="btn ghost" style="margin-top:14px" data-act="open-day" data-k="${sel}">Open full day</button></div>
  ${prevDays.length ? `<div class="card"><div class="m" style="margin-bottom:4px">VS YOUR AVERAGE OF THE PREVIOUS ${prevDays.length} LOGGED DAYS</div>
  ${cmp('Training volume', vol, avg(x => x.ss[0] ? volume(x.ss[0]) : null), v => Math.round(dw(v)).toLocaleString(), ' ' + UW())}
  ${cmp('Steps', i.d.steps == null ? null : i.d.steps, avg(x => x.d.steps), v => Math.round(v).toLocaleString())}
  ${cmp('Sleep', i.d.sleep == null ? null : i.d.sleep, avg(x => x.d.sleep), v => sleepTxt(v))}
  ${cmp('Body weight', i.d.weight == null ? null : i.d.weight, avg(x => x.d.weight), v => r1(dw(v)), ' ' + UW())}
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
  const card = (ic, col, lab, big, unit, tag, chart, foot) => `<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="m">${lab}</span><span class="t" style="color:${col}">${tag}</span></div>
    <div class="n" style="font-size:38px;margin:10px 0 2px">${big} <span style="font-size:15px;color:var(--dim)">${unit}</span></div><div style="margin:8px 0 6px">${chart}</div><div class="dim" style="font-size:12px">${foot}</div></div>`;
  // weekly volume
  const nw = R === 0 ? 12 : R, mons = [...Array(nw)].map((_, i) => kAdd(mondayOf(tk), -7 * (nw - 1 - i)));
  const vols = mons.map(m => sessions.filter(s => mondayOf(dkey(s.finishedAt)) === m).reduce((a, s) => a + volume(s), 0));
  const lv = vols[vols.length - 1], pv = vols[vols.length - 2];
  const volTag = lv > 0 && pv > 0 ? (Math.abs(lv - pv) < 0.01 * pv ? 'SAME' : (lv > pv ? 'UP ' : 'DOWN ') + Math.round(Math.abs(lv - pv) / pv * 100) + '%') : lv > 0 ? 'THIS WEEK' : 'NO DATA';
  const prs = sessions.reduce((a, s) => a + prCount(s), 0);
  const volCard = card('TR', 'var(--acct)', 'TRAINING VOLUME, WEEKLY', Math.round(dw(lv)).toLocaleString(), UW() + ' this week', volTag, miniBars(vols.map(v => v > 0 ? v : null), 'var(--acc)', 330, 64, 0, 'Weekly training volume'), `${sessions.length} workouts logged, ${prs} personal records. A dot is a week with no training.`);
  // exercise progress
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))].sort(), lastEx = (sortedDesc()[0] || { exercises: [] }).exercises.map(x => x.name).find(n => names.includes(n)), sel = hist.ex || lastEx || names[0], nwt = isNW(sel);
  let mt = hist.metric; if (nwt && mt === 'e1') mt = 'top';
  const rows = [];
  sortedDesc().reverse().forEach(s => {
    const sets = s.exercises.filter(x => x.name === sel).flatMap(x => x.sets.filter(t => t.done));
    if (!sets.length) return;
    const v = mt === 'vol' ? sets.reduce((a, t) => a + (nwt ? t.r : t.w * t.r), 0) : mt === 'e1' ? Math.max(...sets.map(t => score(t.w, t.r))) : Math.max(...sets.map(t => (nwt ? t.r : t.w)));
    rows.push({ s, sets, v: rnd(nwt ? v : dw(v)) });
  });
  const segs = [['top', nwt ? 'Top reps' : 'Top weight']].concat(nwt ? [] : [['e1', 'Est. 1RM']]).concat([['vol', nwt ? 'Total reps' : 'Volume']]);
  const exCard = `<div class="card"><div class="m" style="margin-bottom:8px">EXERCISE PROGRESS</div><label>Exercise<select data-act="ex-sel">${names.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <div class="seg">${segs.map(([k, l]) => `<button class="mini ${mt === k ? 'on' : ''}" data-act="metric" data-m="${k}">${l}</button>`).join('')}</div>
  ${rows.length >= 2 ? chart(rows.map(r => r.v), rows.map(r => fd(r.s.finishedAt))) : '<p>Log this exercise in at least two workouts to see a trend.</p>'}
  ${rows.length ? `<p>Latest: ${rows[rows.length - 1].v} ${mt === 'vol' ? (nwt ? 'reps' : UW() + ' total') : (mt === 'e1' ? UW() + ' est. 1RM' : nwt ? 'reps' : UW())}</p>` : ''}</div>`;
  // steps, sleep, protein
  const sv = days.map(k => (daily[k] || {}).steps), sa = avgOf(days, k => (daily[k] || {}).steps), spa = avgOf(prev, k => (daily[k] || {}).steps);
  const sh = sv.filter(v => metV(v, g.steps)).length, sn = sv.filter(v => v != null).length;
  const stepCard = card('MV', 'var(--move)', 'MOVE, DAILY STEPS', sa == null ? '-' : Math.round(sa).toLocaleString(), 'avg per day', tagOf(sa, spa, v => Math.round(v).toLocaleString()), miniBars(sv, 'var(--move)', 330, 60, g.steps, 'Daily steps'), `Dashed line is your ${g.steps.toLocaleString()} goal. Hit on ${sh} of ${sn} logged days.`);
  const lv2 = days.map(k => (daily[k] || {}).sleep), la = avgOf(days, k => (daily[k] || {}).sleep), lpa = avgOf(prev, k => (daily[k] || {}).sleep);
  const lh = lv2.filter(v => metV(v, g.sleep)).length, ln2 = lv2.filter(v => v != null).length;
  const sleepCard = card('RS', 'var(--rest)', 'REST, SLEEP', la == null ? '-' : sleepTxt(la), 'avg per night', tagOf(la, lpa, v => sleepTxt(v)), miniBars(lv2, 'var(--rest)', 330, 60, g.sleep, 'Nightly sleep'), `Dashed line is your ${g.sleep} h goal. Hit on ${lh} of ${ln2} logged nights.`);
  const fl = k => (dayFood(k).length ? foodTot(k) : null), pv2 = days.map(k => fl(k) ? fl(k).p : null), pa = avgOf(days, k => fl(k) ? fl(k).p : null), ppa = avgOf(prev, k => fl(k) ? fl(k).p : null);
  const fa = avgOf(days, k => fl(k) ? fl(k).f : null), fia = avgOf(days, k => fl(k) ? fl(k).fi : null), ka = avgOf(days, k => fl(k) ? fl(k).kcal : null);
  const fuelCard = card('FU', 'var(--prot)', 'FUEL, PROTEIN', pa == null ? '-' : Math.round(pa), 'g avg per day', tagOf(pa, ppa, v => Math.round(v) + ' g'), miniBars(pv2, 'var(--prot)', 330, 60, g.protein, 'Daily protein'), pa == null ? 'No food logged in this period.' : `Averages: ${Math.round(ka).toLocaleString()} kcal, fat ${Math.round(fa)} g, fiber ${Math.round(fia)} g.`);
  const wv = days.map(k => (daily[k] || {}).weight), wh = wv.filter(v => v != null), wa = avgOf(days, k => (daily[k] || {}).weight), wpa = avgOf(prev, k => (daily[k] || {}).weight);
  const bodyCard = card('BW', 'var(--body)', 'BODY WEIGHT', wa == null ? '-' : r1(dw(wa)), UW() + ' avg', tagOf(wa, wpa, v => r1(dw(v)) + ' ' + UW()), spark(wv, 'var(--body)', 330, 90, 'Body weight'), wh.length ? `Lowest ${wt(Math.min(...wh))}, highest ${wt(Math.max(...wh))}, ${wh.length} weigh-ins.${g.weight > 0 ? ' Target ' + wt(g.weight) + ', latest ' + wt(wh[wh.length - 1]) + '.' : ''}` : 'No weigh-ins in this period.');
  return `<div class="seg">${[[4, '4 weeks'], [8, '8 weeks'], [0, 'All time']].map(([r, l]) => `<button class="mini${R === r ? ' on' : ''}" data-act="range" data-r="${r}">${l}</button>`).join('')}</div>${volCard}${exCard}${bodyStrip()}${stepCard}${sleepCard}${fuelCard}`;
}
views.trends = () => `<div class="tblk"><span>MX / TRAIN</span><span>SHEET 04 INSIGHTS</span><span>${esc(APPV())}</span></div><h2 style="margin:0 0 14px">Insights</h2>${histTabs()}` + (hist.mode === 'trends' || hist.mode === 'muscles' ? trendsView() + '<div class="dl"><b></b><span class="m">MUSCLES, HARD SETS PER WEEK</span><b></b></div>' + muscleView() : hist.mode === 'body' ? bodyView() : hist.mode === 'review' ? weekOverview() : hist.mode === 'notes' ? notesView() : hist.mode === 'cal' ? calView() : hist.mode === 'week' ? weekView() : (() => {
  const l = sortedDesc();
  return !l.length ? '<div class="card"><p>Finished workouts show up here.</p></div>' : l.map(s => `<div class="card"><button class="item" data-act="open-session" data-id="${s.id}"><div><b>${esc(s.name)}</b><small>Week ${s.week} &middot; ${fd(s.finishedAt)}</small></div><div class="r"><b>${doneCount(s)} sets</b><small>${Math.round(dw(volume(s))).toLocaleString()} ${UW()}</small></div></button></div>`).join('');
})());
views.day = p => {
  const k = p.k, i = dayInfo(k), g = settings.goals, s = i.ss[0], today = todayKey(), f = i.f, d = i.d;
  const head = `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:12px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="day-nav" data-n="-1" aria-label="Previous day">&lsaquo;</button><div style="text-align:center"><div class="n" style="font-size:34px;text-transform:uppercase">${kLong(k)}</div>${s ? `<small>Week ${s.week}, ${esc(s.name)}</small>` : ''}</div><button class="mini" style="width:44px;height:44px;flex:none${k >= today ? ';opacity:.35' : ''}" data-act="day-nav" data-n="1" aria-label="Next day"${k >= today ? ' disabled' : ''}>&rsaquo;</button></div>`;
  if (!i.logged) return head + '<div class="card"><p>Nothing logged on this day.</p></div><button class="btn ghost" data-go="trends">Back to trends</button>';
  const hero = `<div class="cut" style="padding:18px 16px"><span class="m">DAY RESULT</span><div class="n" style="font-size:34px;margin:6px 0 10px;text-transform:uppercase">${i.of ? i.hit + ' of ' + i.of + ' targets met' : 'Logged'}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${i.t.map(([l, ok]) => `<span class="t" style="color:${ok ? 'var(--ok)' : 'var(--dim)'}">${l}: ${ok ? 'MET' : 'SHORT'}</span>`).join('')}</div></div>`;
  const prs = s ? prCount(s) : 0;
  const train = s ? `<div class="card"><div class="row" style="justify-content:space-between"><span class="m">TRAINING</span><small>${fdur(s.finishedAt - s.startedAt)}, ${doneCount(s)} of ${totalCount(s)} sets</small></div>
  <div class="row" style="gap:28px;margin:8px 0"><div><div class="n" style="font-size:32px">${Math.round(dw(volume(s))).toLocaleString()}</div><small>${UW()} volume</small></div><div><div class="n" style="font-size:32px">${prs}</div><small>personal records</small></div></div>
  ${s.exercises.map(x => { const ex = { noWeight: x.nw != null ? x.nw : (slot[x.slotId] ? slot[x.slotId].noWeight : isNW(x.name)) }; return `<div class="lift"><span>${esc(x.name)}</span><span>${esc(fmtSets(ex, x.sets.filter(t => t.done)))}</span></div>`; }).join('')}
  <button class="btn ghost" style="margin-top:10px" data-act="open-session" data-id="${s.id}">Open workout</button></div>` : '';
  const ent = dayFood(k);
  const nut = `<div class="card"><div class="m" style="margin-bottom:6px">NUTRITION</div><div class="brow"><span>Energy</span><span><b>${Math.round(f.kcal).toLocaleString()}</b> <small>kcal</small></span></div>${MAC.map(([kk, l, gk, col]) => macroRow(kk, l, 'g', f[kk], g[gk], col)).join('')}
  <p style="margin:8px 0 0"><small>${ent.length} ${ent.length === 1 ? 'entry' : 'entries'}${ent.length ? ': ' + ent.map(e => esc(e.name || 'food')).join(', ') : ''}</small></p></div>`;
  const row = (lab, v, goalTxt, pct, note, col) => `<div style="margin-top:12px"><div class="brow"><span>${lab}</span><span><b>${v}</b> <small>${goalTxt}</small></span></div><div class="bar"><i style="width:${Math.min(100, pct * 100).toFixed(0)}%;background:${col}"></i></div><div class="tg" style="color:${col}">${note}</div></div>`;
  const ss = `<div class="card"><div class="m">MOVE AND REST</div>
  ${row('Steps', d.steps == null ? '-' : d.steps.toLocaleString(), '/ ' + g.steps.toLocaleString(), d.steps == null ? 0 : d.steps / g.steps, d.steps == null ? 'NOT LOGGED' : metV(d.steps, g.steps) ? 'MET' : 'SHORT BY ' + (g.steps - d.steps).toLocaleString(), 'var(--move)')}
  ${d.weight != null ? `<div class="li" style="margin-top:10px"><span>Body weight</span><span><span class="n" style="font-size:22px;color:var(--ink)">${r1(dw(d.weight))} ${UW()}</span></span></div>` : ''}
  ${row('Sleep', d.sleep == null ? '-' : sleepTxt(d.sleep), '/ ' + g.sleep + 'h', d.sleep == null ? 0 : d.sleep / g.sleep, d.sleep == null ? 'NOT LOGGED' : metV(d.sleep, g.sleep) ? 'MET' : 'SHORT BY ' + Math.round((g.sleep - d.sleep) * 60) + ' MIN', 'var(--rest)')}</div>`;
  return head + hero + train + nut + ss + '<button class="btn ghost" data-go="trends">Back to trends</button>';
};

views.session = p => {
  const s = sessions.find(x => x.id === p.id);
  if (!s) return '<div class="card"><h3>Session not found</h3>' + homeBtn + '</div>';
  return `<h2>${esc(s.name)}</h2><p>Week ${s.week} &middot; ${fd(s.finishedAt)} &middot; ${fdur(s.finishedAt - s.startedAt)} &middot; ${Math.round(dw(volume(s))).toLocaleString()} ${UW()} volume</p>
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
views.info = () => '<div class="m">TRAIN</div><h2 style="font-size:46px">Program guide</h2>' + (P.info || (P === window.PROGRAM ? window.INFO_HTML : '<p>No guide for this program yet.</p>')) + '<button class="btn ghost" data-go="train">Back to Train</button>';

