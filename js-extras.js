/* MetriX Train: Units, muscles, body and photos, weekly review, deload, warm-up, barcode, CSV. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- v2.7: units, muscles, body, review, deload, scan, csv ---------- */
const UW = () => (settings.units && settings.units.w) === 'lb' ? 'lb' : 'kg';
const UL = () => (settings.units && settings.units.l) === 'in' ? 'in' : 'cm';
const dw = v => UW() === 'lb' ? Math.round(v * 2.20462 * 10) / 10 : v;     // kg to display number
const fw = v => UW() === 'lb' ? v / 2.20462 : v;                            // display number to kg
const dl = v => UL() === 'in' ? Math.round(v / 2.54 * 10) / 10 : v;        // cm to display number
const fl = v => UL() === 'in' ? v * 2.54 : v;                               // display number to cm
const wt = v => r1(dw(v)) + ' ' + UW();
const rd = v => UW() === 'lb' ? r1(v) : rnd(v);
const incD = ex => UW() === 'kg' ? getInc(ex) : ((settings.incLb || {})[ex.name] || [1, 2.5, 5, 10].reduce((b, s) => Math.abs(s - getInc(ex) * 2.20462) < Math.abs(b - getInc(ex) * 2.20462) ? s : b, 5));
let meas = LSget('mx.meas', {});                                            // {mondayKey: {waist, chest, ...} in cm}
const saveMeas = () => LSset('mx.meas', meas);
const fday = k => kDate(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const wkTitle = o => o === 0 ? 'THIS WEEK' : o === -1 ? 'LAST WEEK' : -o + ' WEEKS AGO';
function weekNav(key) {
  const mon = kAdd(mondayOf(todayKey()), 7 * hist[key]);
  return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:12px"><button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-k="${key}" data-n="-1" aria-label="Previous week">&lsaquo;</button>
  <div style="text-align:center"><div class="n" style="font-size:24px">${fday(mon)} to ${fday(kAdd(mon, 6))}</div><span class="m">${wkTitle(hist[key])}</span></div>
  <button class="mini" style="width:44px;height:44px;flex:none" data-act="wk-nav" data-k="${key}" data-n="1" aria-label="Next week" ${hist[key] >= 0 ? 'disabled' : ''}>&rsaquo;</button></div>`;
}

/* muscles */
const MUSCLES = ['Chest', 'Back', 'Quads', 'Hamstrings', 'Glutes', 'Delts', 'Biceps', 'Triceps', 'Calves', 'Core', 'Shins'];
const MAIN7 = ['Chest', 'Back', 'Quads', 'Hamstrings', 'Delts', 'Biceps', 'Triceps'];
const MRULES = [
  [/reverse pec|rear delt|face pull/i, [['Delts', 1], ['Back', 0.5]]],
  [/pec deck|\bfly|flye|crossover/i, [['Chest', 1]]],
  [/triceps|skull|pressdown|pushdown|\bdip/i, [['Triceps', 1]]],
  [/leg curl|hamstring curl/i, [['Hamstrings', 1]]],
  [/curl/i, [['Biceps', 1]]],
  [/lateral raise|front raise|upright row/i, [['Delts', 1]]],
  [/shoulder press|overhead press|military|arnold/i, [['Delts', 1], ['Triceps', 0.5]]],
  [/chest press|bench|incline.*press|press.*incline|flat.*press|push-?up/i, [['Chest', 1], ['Triceps', 0.5], ['Delts', 0.5]]],
  [/pull-?up|chin-?up|pulldown|\brow\b/i, [['Back', 1], ['Biceps', 0.5]]],
  [/leg extension|squat|leg press|lunge|hack/i, [['Quads', 1], ['Glutes', 0.5]]],
  [/pull-?through|hip thrust|glute/i, [['Glutes', 1], ['Hamstrings', 0.5]]],
  [/deadlift|good morning|back extension|hyperextension/i, [['Hamstrings', 1], ['Glutes', 0.5], ['Back', 0.5]]],
  [/calf/i, [['Calves', 1]]],
  [/tibialis/i, [['Shins', 1]]],
  [/pallof|plank|crunch|\bab\b|sit-?up|leg raise|woodchop|core/i, [['Core', 1]]]
];
const musOf = n => { const r = MRULES.find(x => x[0].test(n || '')); return r ? r[1] : []; };
const inWeek = (s, mon) => mondayOf(dkey(s.finishedAt)) === mon;
function weekSets(mon) {
  const out = {}, lost = new Set();
  sessions.filter(s => inWeek(s, mon)).forEach(s => s.exercises.forEach(x => {
    const n = x.sets.filter(t => t.done).length; if (!n) return;
    const m = musOf(x.name); if (!m.length) lost.add(x.name);
    m.forEach(([k, w]) => { out[k] = (out[k] || 0) + n * w; });
  }));
  return { out, lost: [...lost] };
}
function muscleView() {
  const mon = kAdd(mondayOf(todayKey()), 7 * hist.mw), { out, lost } = weekSets(mon), n = sessions.filter(s => inWeek(s, mon)).length, tot = DAYS.length;
  const rows = MUSCLES.filter(m => out[m] > 0 || MAIN7.includes(m)), sc = Math.max(24, ...rows.map(m => (out[m] || 0) * 1.1));
  const body = rows.map(m => {
    const v = out[m] || 0, tag = v === 0 ? 'NONE' : v < 10 ? 'LOW' : v <= 20 ? 'IN RANGE' : 'HIGH', col = tag === 'IN RANGE' ? 'var(--ok)' : tag === 'HIGH' ? 'var(--rest)' : 'var(--dim)';
    return `<div style="padding:11px 0;border-top:1px solid var(--line)"><div class="brow"><span style="font-weight:600">${m}</span><span><b>${r1(v)}</b> <small>sets</small> <span class="t" style="color:${col}">${tag}</span></span></div>
    <div style="position:relative;height:10px;border-radius:5px;background:var(--bar);margin-top:8px;overflow:hidden" role="img" aria-label="${m}: ${r1(v)} hard sets, ${tag.toLowerCase()}"><div style="position:absolute;left:${10 / sc * 100}%;width:${10 / sc * 100}%;top:0;bottom:0;background:color-mix(in srgb,var(--ok) 28%,transparent)"></div><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, v / sc * 100).toFixed(1)}%;background:var(--acc);border-radius:5px"></i></div></div>`;
  }).join('');
  return `${weekNav('mw')}<div class="card"><div class="row" style="justify-content:space-between"><span class="m">HARD SETS PER MUSCLE</span><span class="t" style="color:${n >= tot ? 'var(--ok)' : 'var(--dim)'}">${n} OF ${tot} DONE</span></div>${body || '<p>No workouts in this week.</p>'}
  <p style="margin:8px 0 0"><small>The shaded band is 10 to 20 sets, a common range for muscle growth. A guide, not a rule.</small></p></div>
  <div class="card"><p style="margin:0"><small>A hard set is a finished set. Big lifts count in full for the main muscle and half for helpers (a chest press counts half for triceps and front delts). Exercises are matched to muscles by name from a built-in list.${lost.length ? ' Not matched this week: ' + esc(lost.join(', ')) + '.' : ''}</small></p></div>`;
}

/* body measurements and photos */
const MEAS = [['waist', 'Waist'], ['chest', 'Chest'], ['shoulders', 'Shoulders'], ['arm', 'Arm'], ['thigh', 'Thigh'], ['hips', 'Hips']];
const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
let phKeys = [];
const phDB = () => new Promise((res, rej) => { const r = indexedDB.open('mx-photos-' + (USER ? USER.id : 'x'), 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const phOp = (mode, fn) => phDB().then(db => new Promise((res, rej) => { const tx = db.transaction('p', mode), rq = fn(tx.objectStore('p')); tx.oncomplete = () => { db.close(); res(rq && rq.result); }; tx.onerror = () => rej(tx.error); }));
function phLoad() { phOp('readonly', s => s.getAllKeys()).then(k => { phKeys = (k || []).map(String); if (view.name === 'trends' && hist.mode === 'body') render(); }).catch(() => {}); }
function phFill() {
  document.querySelectorAll('img[data-ph]').forEach(im => {
    phOp('readonly', s => s.get(im.dataset.ph)).then(b => { if (b) { im.onload = () => URL.revokeObjectURL(im.src); im.src = URL.createObjectURL(b); } }).catch(() => {});
  });
}
async function phCompress(file) {
  const bmp = await createImageBitmap(file), sc = Math.min(1, 900 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not read the photo')), 'image/jpeg', 0.8));
}
function bodyView() {
  const mon = kAdd(mondayOf(todayKey()), 7 * hist.bw), m = meas[mon] || {}, lu = UL(), pose = hist.pose, key = mon + '|' + pose;
  const inputs = MEAS.map(([f, l]) => `<label>${l} (${lu})<input data-act="meas-in" data-f="${f}" data-mon="${mon}" type="number" inputmode="decimal" step="any" min="0" value="${m[f] ? r1(dl(m[f])) : ''}" placeholder="0"></label>`).join('');
  const weeks = [...Array(12)].map((_, i) => kAdd(mondayOf(todayKey()), -7 * (11 - i)));
  const chg = MEAS.map(([f, l]) => {
    const ks = Object.keys(meas).sort().filter(k => meas[k][f] > 0); if (!ks.length) return '';
    const a = meas[ks[0]][f], b = meas[ks[ks.length - 1]][f], d = r1(dl(b) - dl(a));
    return `<div class="li"><span>${l}</span><span>${r1(dl(b))} ${lu} <span class="t" style="color:var(--dim)">${ks.length < 2 ? 'FIRST ENTRY' : Math.abs(d) < 0.05 ? 'SAME' : (d > 0 ? 'UP ' : 'DOWN ') + Math.abs(d) + ' ' + lu}</span></span></div>`;
  }).join('');
  const ks = phKeys.filter(k => k.endsWith('|' + pose)).map(k => k.split('|')[0]).sort(), has = phKeys.includes(key);
  const img = (k, lab) => `<div style="flex:1;min-width:0"><div class="m" style="margin-bottom:6px">${lab}</div><img data-ph="${k}|${pose}" alt="${pose} photo, week of ${fday(k)}" style="width:100%;border-radius:12px;background:var(--g2);aspect-ratio:3/4;object-fit:cover"></div>`;
  return `${weekNav('bw')}<div class="card"><span class="m">MEASUREMENTS, ONCE A WEEK</span><div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">${inputs}</div>
  <p style="margin:6px 0 0"><small>Same time, same spot, relaxed. Saved as you type.</small></p></div>
  <div class="card"><span class="m">WAIST, LAST 12 WEEKS</span><div style="margin-top:8px">${spark(weeks.map(w => meas[w] && meas[w].waist > 0 ? dl(meas[w].waist) : null), 'var(--body)', 330, 90, 'Waist')}</div></div>
  ${chg ? `<div class="card" style="padding:6px 16px"><div class="m" style="padding:10px 0 2px">CHANGE SINCE FIRST ENTRY</div>${chg}</div>` : ''}
  <div class="card"><span class="m">PROGRESS PHOTOS</span><div class="seg" role="group" aria-label="Pose" style="margin-top:10px">${POSES.map(([v, l]) => `<button class="mini${pose === v ? ' on' : ''}" data-act="pose-set" data-v="${v}" aria-pressed="${pose === v}">${l}</button>`).join('')}</div>
  ${has ? `<div style="max-width:220px;margin:0 auto 10px">${img(mon, 'THIS WEEK').replace('flex:1;', '')}</div>` : '<p style="margin:0 0 10px">No photo for this week yet.</p>'}
  <div class="row"><button class="btn ghost" data-act="ph-pick">${has ? 'Replace photo' : 'Add photo'}</button>${has ? '<button class="btn ghost" data-act="ph-del" data-key="' + key + '">Remove</button>' : ''}</div>
  <input id="ph-file" type="file" accept="image/*" data-act="ph-in" data-key="${key}" style="display:none">
  ${ks.length >= 2 ? `<div class="m" style="margin:16px 0 8px">COMPARE, FIRST AND LATEST</div><div style="display:flex;gap:10px">${img(ks[0], 'WEEK OF ' + fday(ks[0]).toUpperCase())}${img(ks[ks.length - 1], 'WEEK OF ' + fday(ks[ks.length - 1]).toUpperCase())}</div>` : ''}
  <p style="margin:12px 0 0"><small>Photos stay on this phone only. They are not part of the JSON backup, so keep your own copy if they matter.</small></p></div>`;
}

/* weekly review */
function reviewData() {
  const tk = todayKey(), g = settings.goals, d7 = lastDays(7), p7 = [...Array(7)].map((_, i) => kAdd(tk, -(13 - i))), q7 = [...Array(7)].map((_, i) => kAdd(tk, -(20 - i)));
  const avg = (ks, f) => { const v = ks.map(f).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const fo = k => dayFood(k).length ? foodTot(k) : null, dd = k => daily[k] || {};
  const R = { tr: sessions.filter(s => d7.includes(dkey(s.finishedAt))).length, tot: DAYS.length };
  R.pro = avg(d7, k => fo(k) ? fo(k).p : null); R.kc = avg(d7, k => fo(k) ? fo(k).kcal : null);
  R.st = avg(d7, k => dd(k).steps); R.sl = avg(d7, k => dd(k).sleep);
  R.w0 = avg(d7, k => dd(k).weight); R.w1 = avg(p7, k => dd(k).weight); R.w2 = avg(q7, k => dd(k).weight);
  R.slope = R.w0 != null && R.w2 != null ? (R.w0 - R.w2) / 2 : R.w0 != null && R.w1 != null ? R.w0 - R.w1 : null;
  R.three = R.w0 != null && R.w1 != null && R.w2 != null;
  const tips = [], p = settings.profile || {}, goal = p.goal;
  if (R.tr < R.tot) tips.push({ t: 'You trained ' + R.tr + ' of ' + R.tot + ' days in the last 7. Plan the missing sessions on fixed days and keep them short if needed.' });
  if (g.protein > 0 && R.pro != null && R.pro < g.protein * 0.9) tips.push({ t: 'Protein averaged ' + Math.round(R.pro) + ' g, ' + Math.round(g.protein - R.pro) + ' g under your goal. A protein snack or shake closes most of that.' });
  if (g.steps > 0 && R.st != null && R.st < g.steps * 0.8) tips.push({ t: 'Steps averaged ' + Math.round(R.st).toLocaleString() + ', under 80% of your goal. A 15 minute walk after a meal adds about 1,500 steps.' });
  if (g.sleep > 0 && R.sl != null && R.sl < g.sleep - 0.75) tips.push({ t: 'Sleep averaged ' + sleepTxt(R.sl) + ', short of your ' + g.sleep + ' h goal. Poor sleep slows recovery and raises hunger.' });
  const mon0 = mondayOf(tk), pains = names => names, painWk = o => new Set(notelog.filter(n => (n.tags || []).includes('Pain') && mondayOf(dkey(n.t)) === kAdd(mon0, 7 * o)).map(n => n.name));
  const p0 = painWk(0), p1 = painWk(-1), pain = [...p0].filter(n => p1.has(n));
  if (pain.length) tips.unshift({ t: pain.slice(0, 2).join(' and ') + ' was tagged Pain two weeks in a row. Consider swapping it, lowering the weight, or having someone check your form.' });
  const floor = p.sex === 'f' ? 1200 : 1500;
  if (R.three && R.slope != null && g.calories > 0 && ['lose', 'gain'].includes(goal)) {
    const pct = R.slope / R.w0 * 100;
    if (goal === 'lose' && R.slope > -0.1 && g.calories - 150 >= floor) tips.push({ t: 'Weight has not dropped over 3 weeks. If you were consistent, lower calories by 150 kcal.', apply: -150 });
    else if (goal === 'lose' && pct < -1) tips.push({ t: 'Weight is falling faster than 1% a week, which can cost muscle. Consider adding 150 kcal.', apply: 150 });
    else if (goal === 'gain' && R.slope < 0.1) tips.push({ t: 'Weight has not risen over 3 weeks. If you were consistent, add 150 kcal.', apply: 150 });
    else if (goal === 'gain' && pct > 0.7) tips.push({ t: 'Weight is rising faster than 0.7% a week, which adds more fat than muscle. Consider lowering calories by 150 kcal.', apply: -150 });
  }
  if (!R.three && R.slope == null) tips.push({ t: 'Log your weight on 3 or more days a week to get a weight trend and calorie advice.' });
  R.tips = tips.slice(0, 3);
  return R;
}
function reviewView() {
  const R = reviewData(), g = settings.goals, cache = settings.review && settings.review.at === todayKey() ? settings.review.text : '';
  const row = (lab, v, goalTxt, tag, col) => `<div class="li"><span><b>${lab}</b><br><small>${goalTxt}</small></span><span><span class="n" style="font-size:24px;color:var(--ink)">${v}</span> <span class="t" style="color:${col || 'var(--dim)'}">${tag}</span></span></div>`;
  const vs = (v, goal, lo) => v == null ? ['NO DATA', 'var(--dim)'] : !(goal > 0) ? ['NO GOAL', 'var(--dim)'] : v >= goal * lo ? ['ON TARGET', 'var(--ok)'] : ['BELOW', 'var(--rest)'];
  const [a1, c1] = vs(R.pro, g.protein, 0.9), [a2, c2] = vs(R.st, g.steps, 0.9), [a3, c3] = vs(R.sl, g.sleep, 0.93);
  const kt = R.kc == null ? ['NO DATA', 'var(--dim)'] : !(g.calories > 0) ? ['NO GOAL', 'var(--dim)'] : R.kc > g.calories * 1.1 ? ['ABOVE', 'var(--rest)'] : R.kc < g.calories * 0.9 ? ['BELOW', 'var(--rest)'] : ['ON TARGET', 'var(--ok)'];
  const wTag = R.slope == null ? 'NO TREND' : Math.abs(R.slope) < 0.05 ? 'FLAT' : (R.slope > 0 ? 'UP ' : 'DOWN ') + r1(Math.abs(dw(R.slope))) + ' ' + UW() + ' A WEEK';
  const tr = ['TRAINING', R.tr + ' of ' + R.tot, 'Workouts in the last 7 days', R.tr >= R.tot ? 'ALL DONE' : 'BEHIND'];
  return `<div class="card" style="padding:6px 16px"><div class="m" style="padding:10px 0 2px">LAST 7 DAYS</div>
  ${row(tr[0], tr[1], tr[2], tr[3], R.tr >= R.tot ? 'var(--ok)' : 'var(--rest)')}
  ${row('PROTEIN', R.pro == null ? '-' : Math.round(R.pro) + ' g', 'Daily average, goal ' + (g.protein > 0 ? g.protein + ' g' : 'not set'), a1, c1)}
  <div class="kc">${row('CALORIES', R.kc == null ? '-' : Math.round(R.kc).toLocaleString(), 'Daily average, goal ' + (g.calories > 0 ? g.calories.toLocaleString() : 'not set'), kt[0], kt[1])}</div>
  ${row('STEPS', R.st == null ? '-' : Math.round(R.st).toLocaleString(), 'Daily average, goal ' + (g.steps || 0).toLocaleString(), a2, c2)}
  ${row('SLEEP', R.sl == null ? '-' : sleepTxt(R.sl), 'Nightly average, goal ' + g.sleep + ' h', a3, c3)}
  ${row('WEIGHT', R.w0 == null ? '-' : wt(R.w0), 'Average this week', wTag)}</div>
  <div class="cut"><div class="row" style="justify-content:space-between"><span class="m">SUGGESTIONS</span><span class="t" style="color:var(--move)">FROM YOUR NUMBERS</span></div>
  ${R.tips.length ? R.tips.map((t, i) => `<p style="margin:10px 0 0">${i + 1}. ${esc(t.t)}</p>${t.apply ? `<button class="btn ghost" data-act="rv-apply" data-d="${t.apply}" style="margin-top:8px">${t.apply < 0 ? 'Lower' : 'Raise'} calorie goal by 150</button>` : ''}`).join('') : '<p style="margin:10px 0 0">Everything is on track. Keep going.</p>'}
  <p style="margin:12px 0 0"><small>Nothing changes by itself. You decide. These are general tips, not medical advice.</small></p></div>
  <div class="card"><div class="row" style="justify-content:space-between"><span class="m">COACH NOTE</span><span class="t" style="color:var(--acct)">AI</span></div>
  ${cache ? `<p style="margin:10px 0">${esc(cache)}</p>` : `<p style="margin:10px 0"><small>${settings.ai.key ? 'Writes a short note about your week using your Gemini key. Only the averages above are sent.' : 'Add a Gemini key in Me to get a written note.'}</small></p>`}
  <button class="btn ghost" data-act="rv-ai" id="rv-ai" ${settings.ai.key ? '' : 'disabled'}>${cache ? 'Write it again' : 'Write my coach note'}</button></div>`;
}
async function reviewAi() {
  const R = reviewData(), g = settings.goals, p = settings.profile || {}, b = $('#rv-ai'); if (b) { b.disabled = true; b.textContent = 'Writing...'; }
  const f = (n, v, u) => v == null ? n + ': no data' : n + ': ' + v + u;
  const prompt = 'Write a short weekly coach note of 3 or 4 plain sentences for someone who lifts weights. Be warm and specific, no lists, no dashes, no medical claims, no new numbers. Goal: ' + (GOALTXT[p.goal] || 'general fitness') + '. Last 7 days: trained ' + R.tr + ' of ' + R.tot + ' days; ' + f('protein average', R.pro == null ? null : Math.round(R.pro), ' g (goal ' + (g.protein || 'none') + ')') + '; ' + f('calorie average', R.kc == null ? null : Math.round(R.kc), ' (goal ' + (g.calories || 'none') + ')') + '; ' + f('steps average', R.st == null ? null : Math.round(R.st), ' (goal ' + g.steps + ')') + '; ' + f('sleep average', R.sl == null ? null : r1(R.sl), ' h (goal ' + g.sleep + ')') + '; weight trend ' + (R.slope == null ? 'unknown' : r1(R.slope) + ' kg per week') + '.';
  const t = await aiText(prompt);
  if (t) { settings.review = { at: todayKey(), text: t }; saveSettings(); } else toast('The AI did not answer. Check your key and connection.');
  if (view.name === 'trends' && hist.mode === 'review') render();
}

/* deload */
const deloadOn = () => !!(settings.deload && settings.deload.week === mondayOf(todayKey()));
function deloadSuggest() {
  const mon = mondayOf(todayKey()), need = Math.max(2, Math.ceil(DAYS.length * 0.6));
  if (deloadOn() || settings.deloadNo === mon) return null;
  const cnt = o => sessions.filter(s => inWeek(s, kAdd(mon, 7 * o))).length;
  for (let o = -1; o >= -4; o--) if (cnt(o) < need) return null;
  if (settings.deload && settings.deload.week >= kAdd(mon, -28)) return null;
  const best = (o, n) => sessions.filter(s => inWeek(s, kAdd(mon, 7 * o))).reduce((m, s) => s.exercises.filter(x => x.name === n).reduce((m2, x) => x.sets.reduce((m3, t) => t.done ? Math.max(m3, score(t.w, t.r)) : m3, m2), m), 0);
  const names = [...new Set(DAYS.flatMap(d => d.exercises.map(e => e.name)))];
  const drops = names.filter(n => { const a = best(-1, n), b = best(-2, n); return a > 0 && b > 0 && a < b * 0.97; });
  return { drops };
}
function deloadCard() {
  if (deloadOn()) return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">DELOAD WEEK</span><span class="t" style="color:var(--ok)">ON</span></div><p style="margin:8px 0">Your next workouts use half the sets, with the same weights. Back to normal next Monday.</p><button class="mini" data-act="deload-off">Turn off</button></div>`;
  const d = deloadSuggest(); if (!d) return '';
  return `<div class="cut" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">DELOAD WEEK SUGGESTED</span><span class="t" style="color:var(--rest)">4 HARD WEEKS</span></div>
  <p style="margin:8px 0">You trained hard for 4 weeks in a row.${d.drops.length ? ' These lifts went down last week: ' + esc(d.drops.slice(0, 4).join(', ')) + '.' : ''} A lighter week helps you recover and come back stronger. It uses half the sets with the same weights.</p>
  <div class="row"><button class="btn" data-act="deload-yes">Start deload week</button><button class="btn ghost" data-act="deload-no">Not now</button></div></div>`;
}

/* warm-up and how hard */
function warmRow(ex, t, i, j) {
  return `<div class="set warm ${t.done ? 'done' : ''} ${ex.noWeight ? 'nw' : ''}"><span class="sn" title="Warm-up">W${j + 1}</span>
  ${ex.noWeight ? '' : stepper('ww', i, j, dw(t.w))}${stepper('wr', i, j, t.r)}<button class="dn" data-act="wdone" data-i="${i}" data-j="${j}">${t.done ? 'DONE' : 'Done'}</button></div>`;
}
const rpeRow = (i, j, t) => `<div class="rpe" role="group" aria-label="How hard was set ${j + 1}"><span class="m">HOW HARD</span>${[6, 7, 8, 9, 10].map(v => `<button data-act="rpe" data-i="${i}" data-j="${j}" data-v="${v}" class="${t.rpe === v ? 'on' : ''}" aria-pressed="${t.rpe === v}">${v}</button>`).join('')}</div>`;

/* barcode */
let scanStream = null, scanTimer = null;
function stopScan() { clearInterval(scanTimer); scanTimer = null; if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } }
const scMsg = h => { const e = $('#sc-msg'); if (e) e.innerHTML = '<small>' + h + '</small>'; };
async function openScan() {
  const sup = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  showModal(`<div class="m" style="color:var(--acct)">SCAN BARCODE</div>${sup ? '<video id="sc-v" playsinline muted style="width:100%;border-radius:14px;margin:10px 0;background:#000;aspect-ratio:4/3;object-fit:cover"></video>' : ''}
  <p id="sc-msg" role="status" style="margin:6px 0"><small>${sup ? 'Starting the camera...' : 'This browser cannot scan. Type the number under the barcode.'}</small></p>
  <label>Or type the barcode number<input id="sc-num" type="number" inputmode="numeric" placeholder="for example 5449000000996"></label>
  <div class="mrow"><button class="btn ghost" data-act="mdl-close">Close</button><button class="btn" data-act="scan-go">Look up</button></div>`);
  if (!sup) return;
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const v = $('#sc-v'); if (!v) { stopScan(); return; }
    v.srcObject = scanStream; await v.play(); scMsg('Point the camera at the barcode.');
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    scanTimer = setInterval(async () => { try { const r = await det.detect(v); if (r.length) { stopScan(); buzz(40); lookupCode(r[0].rawValue); } } catch (e) {} }, 350);
  } catch (e) { scMsg(esc(e && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow the camera for this site in Chrome, or type the number.' : 'Could not start the camera. Type the number instead.')); }
}
async function lookupCode(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 6) { scMsg('Type the full number printed under the barcode.'); return; }
  scMsg('Looking up ' + esc(code) + '...');
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=product_name,brands,nutriments,serving_quantity', { signal: ctl.signal });
    clearTimeout(to);
    const j = await r.json(), p = j && j.product;
    if (j && j.status === 1 && p && p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null) { closeModal(); pickProduct(p); }
    else scMsg('Not in the database yet. Close this and use Search database, or the AI estimate. Products from some countries are missing.');
  } catch (e) { scMsg(esc(e.name === 'AbortError' ? 'The database is slow right now. Try again.' : 'No connection.')); }
}
function pickProduct(p) {
  const box = $('#fd-res'); if (!box) return;
  box.innerHTML = `<div class="card sm" style="margin-bottom:10px"><b>${esc(p.product_name)}</b>${p.brands ? ' <small>' + esc(p.brands.split(',')[0]) + '</small>' : ''}<label style="margin:8px 0 0">Grams eaten<input id="fd-g" type="number" inputmode="decimal" min="0" value="${Math.round(p.serving_quantity) || 100}"></label></div>`;
  window.__dbp = p; if (!$('#fd-name').value.trim()) $('#fd-name').value = p.product_name;
  applyDb(); const m = $('#fd-aimsg'); if (m) m.innerHTML = '<small>Values are per 100 g from the database. Change the grams if needed, then tap Add to today.</small>';
}

/* csv export */
const csvEsc = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function csvRows(kind) {
  const rows = [];
  if (kind === 'workouts') {
    rows.push(['date', 'week', 'day', 'exercise', 'set', 'weight_kg', 'reps', 'how_hard', 'warm_up']);
    sortedDesc().slice().reverse().forEach(s => s.exercises.forEach(x => {
      (x.warm || []).forEach((t, j) => rows.push([dkey(s.finishedAt), s.week, s.name, x.name, j + 1, t.w, t.r, '', 'yes']));
      x.sets.forEach((t, j) => rows.push([dkey(s.finishedAt), s.week, s.name, x.name, j + 1, t.w, t.r, t.rpe || '', 'no']));
    }));
  } else if (kind === 'food') {
    rows.push(['date', 'time', 'meal', 'food', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g']);
    Object.keys(food).sort().forEach(k => food[k].forEach(e => rows.push([k, new Date(e.t).toTimeString().slice(0, 5), (MEALS.find(m => m[0] === mealOf(e)) || ['', ''])[1], e.name, e.kcal, e.p, e.c, e.f, e.fi])));
  } else {
    rows.push(['date', 'weight_kg', 'steps', 'sleep_h', 'waist_cm', 'chest_cm', 'shoulders_cm', 'arm_cm', 'thigh_cm', 'hips_cm']);
    [...new Set([...Object.keys(daily), ...Object.keys(meas)])].sort().forEach(k => { const d = daily[k] || {}, m = meas[k] || {}; rows.push([k, d.weight, d.steps, d.sleep, ...MEAS.map(([f]) => m[f])]); });
  }
  return rows;
}
async function shareFile(blob, name, mime, title) {
  try {
    const f = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function exportCsv(kind) {
  const rows = csvRows(kind);
  if (rows.length < 2) { toast('Nothing to export yet.'); return; }
  const txt = '﻿' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n');
  shareFile(new Blob([txt], { type: 'text/csv' }), 'metrix-' + kind + '-' + todayKey() + '.csv', 'text/csv', 'MetriX ' + kind);
}

