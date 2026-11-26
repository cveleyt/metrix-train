/* MetriX Train: Me screen, profile and AI recommendations. Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- me ---------- */
const CHEV = '<svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>';
const lrow = (l, v, go) => `<button class="li" data-go="${go}"><span>${l}</span><span>${v || ''}${CHEV}</span></button>`;
const trow = (l, act, on, key) => `<div class="li"><span>${l}</span><label class="swl"><input type="checkbox" data-act="${act}" ${key ? 'data-k="' + key + '"' : ''} ${on ? 'checked' : ''} aria-label="${l}"><span class="sw"></span></label></div>`;
const grp = (title, inner) => `<div class="dl"><b></b><span class="m">${title}</span><b></b></div><div class="card" style="padding:2px 16px">${inner}</div>`;
views.me = () => {
  const g = settings.goals, n = nextWorkout(), th = settings.theme || 'system', sc = scoreCfg();
  const gv = (v, u) => v > 0 ? v.toLocaleString() + (u ? ' ' + u : '') : 'Not set';
  return `<div class="tblk"><span>MX / TRAIN</span><span>SHEET 05 ME</span><span>${esc(APPV())}</span></div><div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:14px"><h2 style="margin:0">Me</h2><button class="ibtn" data-act="theme-flip" aria-label="Switch theme">${document.documentElement.dataset.theme === 'light' ? SVG_MOON : SVG_SUN}</button></div>
  <div class="cut" style="display:flex;align-items:center;gap:14px;flex-wrap:nowrap"><div style="width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;display:flex;align-items:center;justify-content:center;flex:none"><span class="n" style="font-size:34px">${esc((USER ? USER.name : 'E').charAt(0).toUpperCase())}</span></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:18px">${esc(USER ? USER.name : 'Elie')}</div><div class="dim" style="font-size:13px;margin-top:2px">${P.weeks} week hypertrophy, week ${Math.min(n.week, P.weeks)}</div></div><span class="t" style="color:var(--acct)">${USER && USER.owner ? 'OWNER' : 'USER'}</span></div>
  ${grp('GOALS AND TARGETS', lrow('Daily steps', gv(g.steps), 'goals') + lrow('Sleep', g.sleep + ' h', 'goals') + lrow('Target weight', gv(g.weight > 0 ? dw(g.weight) : 0, UW()), 'goals') + lrow('Energy', gv(g.calories, 'kcal'), 'goals') + lrow('Protein', gv(g.protein, 'g'), 'goals') + lrow('Carbs', gv(g.carbs, 'g'), 'goals') + lrow('Fat', gv(g.fat, 'g'), 'goals') + lrow('Fiber', gv(g.fiber, 'g'), 'goals') + lrow('Targets that count for Day Score', Object.keys(sc).filter(k => sc[k]).length + ' on', 'goals'))}
  ${grp('PROGRAM', `<button class="li" data-act="prog-open"><span>Program editor</span><span>${P.weeks} weeks, ${DAYS.length} days${CHEV}</span></button>` + lrow('Profile and recommendations', ((settings.profile || {}).h ? '' : 'Set up'), 'profile') + lrow('Program guide', '', 'info'))}
  <div class="dl"><b></b><span class="m">LOOK AND UNITS</span><b></b></div><div class="card"><div class="m" style="margin:0 0 8px">THEME</div><div class="seg" role="group" aria-label="Theme">${[['system', 'System'], ['dark', 'Dark'], ['light', 'Light']].map(([v, l]) => `<button class="mini${th === v ? ' on' : ''}" data-act="theme-set" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div><div class="m" style="margin:14px 0 8px">METRIC COLORS</div><div class="seg" role="group" aria-label="Metric colors">${[['', 'Standard'], ['safe', 'Color-safe'], ['one', 'One color']].map(([v, l]) => `<button class="mini${(settings.cs || '') === v ? ' on' : ''}" data-act="cs-set" data-v="${v}" aria-pressed="${(settings.cs || '') === v}">${l}</button>`).join('')}</div><p style="margin:8px 0 0"><small>Color-safe uses blues, yellows and white. One color uses the accent for everything. Words carry the meaning either way.</small></p>
  <div class="m" style="margin:14px 0 8px">UNITS</div><div class="seg" role="group" aria-label="Weight unit">${[['kg', 'kg'], ['lb', 'lb']].map(([v, l]) => `<button class="mini${UW() === v ? ' on' : ''}" data-act="unit-set" data-f="w" data-v="${v}" aria-pressed="${UW() === v}">Weight ${l}</button>`).join('')}</div><div class="seg" role="group" aria-label="Length unit">${[['cm', 'cm'], ['in', 'in']].map(([v, l]) => `<button class="mini${UL() === v ? ' on' : ''}" data-act="unit-set" data-f="l" data-v="${v}" aria-pressed="${UL() === v}">Length ${l}</button>`).join('')}</div>
  <div class="m" style="margin:14px 0 8px">TEXT AND SCREEN SIZE</div><div class="seg" role="group" aria-label="Text size">${[[0.72, 'Small'], [0.8, 'Medium'], [0.9, 'Large']].map(([v, l]) => `<button class="mini${(settings.scale || 0.8) === v ? ' on' : ''}" data-act="scale-set" data-v="${v}" aria-pressed="${(settings.scale || 0.8) === v}">${l}</button>`).join('')}</div></div>
  ${grp('TRAINING', trow('Auto-start rest timer', 'auto-in', settings.autoStart !== false) + trow('Ask how hard each set was (6 to 10)', 'rpe-in', !!settings.rpe) + trow('Rest timer sound', 'sound-in', settings.sound) + trow('Vibration', 'vib-in', settings.vibrate))}
  ${grp('MORE', lrow('Nutrition and AI', settings.ai.key ? 'Key saved' : 'No key', 'nutai') + `<button class="li" data-act="qa-daily"><span>Supplements</span><span>${suppList().length} in stack${CHEV}</span></button>` + lrow('Data and sync', window.MXSYNC && MXSYNC.has() ? MXSYNC.label() : 'Off', 'datasync') + lrow('Usage and your notes', feedback.length ? feedback.length + ' notes' : '', 'usage'))}
  ${grp('APP', `<div class="li"><span>Version</span><span>${VERSION}</span></div>` + `<button class="li" data-act="update"><span>Update app</span><span>${CHEV}</span></button><button class="li" data-act="logout"><span>Log out</span><span>${CHEV}</span></button>`)}
  <div style="height:16px"></div><button class="btn danger" data-act="reset">Delete all data</button>`;
};
const APPV = () => new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
views.nutai = () => `<button class="mini" data-go="me" style="margin-bottom:10px">&lsaquo; Me</button><h2>Nutrition and AI</h2>
<div class="card"><p>Type what you ate in Fuel and the AI fills in calories, protein, carbs, fat and fiber. It uses Google's Gemini. Get a free key at aistudio.google.com and paste it here. The key stays on this phone and is never included in backups. What you type is sent to Google to get the estimate.</p>
${trow('Hide calories (show only protein, carbs, fat and fiber)', 'hidecal-in', !!settings.hideCal)}
<label>Gemini API key<input data-act="ai-key-in" type="password" autocomplete="off" value="${esc(settings.ai.key)}" placeholder="Paste key"></label>
<label style="margin-bottom:0">Model<input data-act="ai-model-in" type="text" autocomplete="off" value="${esc(settings.ai.model)}"></label>
<div class="row" style="margin-top:10px"><span class="t" style="color:${settings.ai.key ? 'var(--ok)' : 'var(--dim)'}">${settings.ai.key ? 'KEY SAVED' : 'NO KEY'}</span><span class="t" style="color:var(--dim)">${myfoods.length} FOODS SAVED</span></div></div>`;
views.datasync = () => `<button class="mini" data-go="me" style="margin-bottom:10px">&lsaquo; Me</button><h2>Data and sync</h2>
<div class="card"><p>${sessions.length} workouts saved on this phone. Export a backup now and then.</p>
<div class="row"><button class="btn" data-act="export">Export backup</button><button class="btn ghost" data-act="import-btn">Import</button></div><div class="m" style="margin:14px 0 6px">EXPORT AS CSV, FOR EXCEL</div><div class="row"><button class="mini" data-act="csv" data-k="workouts">Workouts</button><button class="mini" data-act="csv" data-k="food">Food</button><button class="mini" data-act="csv" data-k="body">Body</button></div><input id="imp" type="file" accept="application/json,.json" data-act="import-in" style="display:none">
<div class="li" style="margin-top:6px"><span>Protected storage</span><span>${persisted === true ? 'Granted' : persisted === false ? 'Not granted' : 'Unknown'}</span></div><div class="li"><span>Cloud sync</span><span id="sync-st">${window.MXSYNC && MXSYNC.has() ? MXSYNC.label() : 'OFF'}</span></div>${window.MXSYNC && MXSYNC.has() ? `<div class="li"><span>Signed in as</span><span>${esc(MXSYNC.user())}</span></div><button class="li" data-act="sync-now"><span>Sync now</span><span>${CHEV}</span></button>` : ''}</div>`;
/* ---------- profile and recommendations ---------- */
const ACT = { low: 1.4, med: 1.55, high: 1.7 };
function weightNow() { const ks = Object.keys(daily).filter(k => daily[k] && daily[k].weight > 0).sort(); return ks.length ? daily[ks[ks.length - 1]].weight : ((settings.profile || {}).w || 0); }
function recCalc() {
  const p = settings.profile || {}, w = weightNow(), h = +p.h, a = +p.age;
  if (!(w >= 30 && w <= 300 && h >= 120 && h <= 230 && a >= 14 && a <= 90) || !p.sex || !p.goal || !p.act) return { err: 'Fill in height, weight, age, sex, goal and activity first.' };
  if (a < 18) return { err: 'Targets for under 18 should come from a doctor or coach, so none are calculated here.' };
  if (!p.ok) return { err: 'Please read and tick the health check first.' };
  const g = p.goal, lose = g === 'lose' || g === 'recomp', bmi = w / Math.pow(h / 100, 2);
  if (lose && bmi < 18.5) return { err: 'Your BMI is under 18.5, so no fat loss targets are given. Pick Maintain or Build muscle, and talk to a doctor before trying to change your weight.' };
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161), tdee = bmr * ACT[p.act];
  let kcal = g === 'lose' ? Math.max(tdee * 0.8, bmr * 1.1) : g === 'gain' ? tdee * 1.1 : g === 'recomp' ? tdee * 0.95 : tdee;
  kcal = Math.round(kcal / 10) * 10;
  const floor = p.sex === 'm' ? 1500 : 1200; let note = '';
  if (lose && kcal < floor) { kcal = floor; note = 'Calories were raised to ' + floor + ', the lowest amount that is safe without a doctor.'; }
  const protein = Math.round(w * (lose ? 2.2 : g === 'gain' ? 2.0 : 1.8)), fat = Math.round(w * (lose ? 0.8 : 0.9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)), fiber = Math.min(40, Math.round(14 * kcal / 1000));
  return { w, tdee: Math.round(tdee), note, vals: { steps: lose ? 10000 : g === 'gain' ? 9000 : 8000, calories: kcal, protein, carbs, fat, fiber, sleep: 8 } };
}
const RECS = [['steps', 'Steps', ' /day'], ['calories', 'Calories', ' kcal'], ['protein', 'Protein', ' g'], ['carbs', 'Carbs', ' g'], ['fat', 'Fat', ' g'], ['fiber', 'Fiber', ' g'], ['sleep', 'Sleep', ' h']];
const GOALTXT = { lose: 'losing fat', gain: 'building muscle', recomp: 'losing fat and building muscle together', maintain: 'staying at the same weight' };
async function aiWhy(r) {
  const p = settings.profile, v = r.vals;
  const prompt = 'In 2 or 3 short plain sentences, explain why these daily targets suit this person. No lists, no dashes, no medical claims. Person: ' + p.age + ' years, ' + (p.sex === 'm' ? 'male' : 'female') + ', ' + p.h + ' cm, ' + r.w + ' kg, goal ' + GOALTXT[p.goal] + ', does strength training. Estimated daily burn ' + r.tdee + ' kcal. Targets: ' + v.calories + ' kcal, ' + v.protein + ' g protein, ' + v.carbs + ' g carbs, ' + v.fat + ' g fat, ' + v.fiber + ' g fiber, ' + v.steps + ' steps, ' + v.sleep + ' h sleep.';
  return aiText(prompt);
}
async function aiText(prompt, search) {
  const models = search ? ['gemini-2.5-flash', 'gemini-flash-latest'] : [...new Set([settings.ai.model, 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'])];
  for (const m of models) {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.ai.key }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 }, ...(search ? { tools: [{ google_search: {} }] } : {}) }) });
      clearTimeout(to);
      if (res.status === 400 || res.status === 403) { if (search) break; return ''; }
      if (!res.ok) continue;
      const j = await res.json(); const t = j.candidates && j.candidates[0] && j.candidates[0].content.parts[0].text;
      if (t) return t.replace(/[–—]/g, ',').trim();
    } catch (e) { /* try next model */ }
  }
  return search ? aiText(prompt) : '';
}
function recBlock() {
  const rc = settings.rec; if (!rc) return '';
  const g = settings.goals, fmt = (k, v) => v > 0 ? v.toLocaleString() : 'not set';
  const rows = RECS.map(([k, l, u]) => `<div class="li" style="padding:12px 0"><span><b>${l}</b><br><small>Now ${fmt(k, g[k])}</small></span><span><span class="n" style="font-size:26px;color:var(--ink)">${rc.vals[k].toLocaleString()}</span><small>${u}</small>${g[k] === rc.vals[k] ? '<span class="t" style="color:var(--ok)">SET</span>' : `<button class="mini" data-act="rec-use" data-k="${k}">Use</button>`}</span></div>`).join('');
  return `<div class="cut"><div class="row" style="justify-content:space-between"><span class="m">RECOMMENDED DAILY TARGETS</span><span class="t" style="color:var(--move)">${rc.why ? 'AI' : 'FORMULA'}</span></div>
  <p style="margin:8px 0 4px;font-size:12.5px">${esc(rc.why || 'Calculated from standard formulas using your profile. Add a Gemini key in Me to get a written reason.')}</p>${rc.note ? `<p style="margin:4px 0"><span class="t" style="color:var(--rest)">NOTE</span> <small>${esc(rc.note)}</small></p>` : ''}${rows}
  <button class="btn" data-act="rec-all" style="margin-top:8px">Use all targets</button><p style="font-size:11.5px;margin:12px 0 0"><small>A starting point from standard formulas, not medical advice. Check your progress after 2 to 3 weeks and adjust.</small></p></div>`;
}
views.profile = () => {
  const p = settings.profile || {}, w = weightNow();
  const seg = (f, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="mini${p[f] === v ? ' on' : ''}" data-act="prof-set" data-f="${f}" data-v="${v}" aria-pressed="${p[f] === v}">${l}</button>`).join('')}</div>`;
  const dailyW = Object.keys(daily).some(k => daily[k] && daily[k].weight > 0);
  return `<div class="m">ME</div><h2 style="margin:4px 0 14px;font-size:52px">Profile</h2>
  <div class="card" style="padding:6px 16px"><div class="li"><span>User</span><span>${esc(USER ? USER.name : '')} ${USER && USER.owner ? '<span class="t" style="color:var(--acct)">OWNER</span>' : ''}</span></div><div class="li"><span>Program</span><span>${esc(P.name)}</span></div></div>
  <div class="card"><span class="m">ABOUT YOU</span><div class="three" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px">
  <label>Height (${UL()})<input data-act="prof-in" data-f="h" type="number" inputmode="decimal" step="any" min="0" value="${p.h ? r1(dl(p.h)) : ''}" placeholder="0"></label>
  <label>Weight (${UW()})<input data-act="prof-in" data-f="w" type="number" inputmode="decimal" step="any" min="0" value="${w ? r1(dw(w)) : ''}" placeholder="0" ${dailyW ? 'disabled' : ''}></label>
  <label>Age<input data-act="prof-in" data-f="age" type="number" inputmode="numeric" min="0" value="${p.age || ''}" placeholder="0"></label></div>
  ${dailyW ? '<p style="margin:0 0 10px"><small>Weight follows your latest daily weigh-in.</small></p>' : ''}
  <div class="m" style="margin:6px 0 6px">SEX</div>${seg('sex', [['m', 'Male'], ['f', 'Female']])}
  <div class="m" style="margin:6px 0 6px">GOAL, PICK ONE OR TWO</div><div class="seg" role="group" aria-label="Goal">${[['lose', 'Lose fat'], ['gain', 'Build muscle'], ['maintain', 'Maintain']].map(([v, l]) => { const on = v === 'maintain' ? p.goal === 'maintain' : (p.goal === v || p.goal === 'recomp'); return `<button class="mini${on ? ' on' : ''}" data-act="goal-tog" data-v="${v}" aria-pressed="${on}">${l}</button>`; }).join('')}</div>${p.goal === 'recomp' ? '<p style="margin:-4px 0 10px"><span class="t" style="color:var(--move)">BOTH: BODY RECOMPOSITION</span></p>' : ''}
  <div class="m" style="margin:6px 0 6px">DAILY ACTIVITY OUTSIDE TRAINING</div>${seg('act', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']])}
  <label class="chk" style="margin:4px 0 12px;align-items:flex-start"><input type="checkbox" data-act="prof-ok" ${p.ok ? 'checked' : ''}><span style="font-size:13px;line-height:1.4">Health check: I have no condition that needs a doctor to supervise my diet or training (for example pregnancy, diabetes, heart or kidney disease, or an eating disorder), or my doctor has cleared me.</span></label>
  <p id="rec-msg" role="status" style="margin:0 0 10px;min-height:18px"><small></small></p><button class="btn" data-act="rec-go" id="rec-btn">Get recommendations</button></div>
  <div id="rec-box">${recBlock()}</div>`;
};

function tolList() {
  const g = settings.goals, t = TOL(), li = (a, b) => `<div class="row" style="padding:10px 0;border-top:1px solid var(--line);font-size:14.5px"><span>${a}</span><span class="dim">${b}</span></div>`, o = [];
  if (g.protein > 0) o.push(li('Protein ' + g.protein + ' g', 'met from ' + Math.round(g.protein * t) + ' g'));
  if (g.steps > 0) o.push(li('Steps ' + g.steps.toLocaleString(), 'met from ' + Math.round(g.steps * t).toLocaleString()));
  if (g.sleep > 0) { const m = Math.round(g.sleep * t * 60); o.push(li('Sleep ' + g.sleep + ' h', 'met from ' + Math.floor(m / 60) + ' h ' + (m % 60) + ' m')); }
  o.push(li('Training, 5 per week', 'met at ' + Math.round(5 * t)));
  return o.join('').replace('border-top:1px solid var(--line);', '');
}
views.goals = () => {
  const g = settings.goals, sc = scoreCfg();
  const stp = (f, l, u, step, min, v, col) => `<div style="padding:14px 0;border-top:1px solid var(--line)"><div style="font-weight:600;font-size:15px;margin-bottom:8px;color:${col}">${l}</div>
  <div style="display:grid;grid-template-columns:52px 1fr 52px;gap:8px;align-items:center"><button class="mini" style="height:46px;font-size:22px;text-align:center" data-act="goal-step" data-f="${f}" data-d="-${step}" aria-label="Decrease ${l}">-</button>
  <div style="position:relative"><input id="gi-${f}" data-act="goal-in" data-f="${f}" type="number" inputmode="decimal" step="any" min="${min}" value="${v > 0 ? v : ''}" placeholder="No goal" style="width:100%;height:46px;text-align:center;font-family:var(--disp);font-size:26px;font-weight:700;background:var(--g1);border:1.5px solid var(--line);border-radius:12px;padding:0 34px 0 8px"><span class="m" style="position:absolute;right:10px;top:50%;transform:translateY(-50%)">${u}</span></div>
  <button class="mini" style="height:46px;font-size:22px;text-align:center" data-act="goal-step" data-f="${f}" data-d="${step}" aria-label="Increase ${l}">+</button></div></div>`;
  const box = inner => `<div class="card" style="padding:2px 16px 4px">${inner.replace('border-top:1px solid var(--line)', '')}</div>`;
  return `<div class="row" style="justify-content:space-between"><button class="m" data-go="me">&lsaquo; ME</button><span class="m">GOALS AND TARGETS</span></div><h2 style="margin:12px 0 4px;font-size:46px">Goals</h2><p>Set each target and choose which ones count toward your Day Score.</p>
  <div class="dl"><b></b><span class="m">HOW STRICT</span><b></b></div><div class="card"><div class="row" style="align-items:center;flex-wrap:nowrap"><div><div style="font-size:16px;font-weight:700">Counts as met at</div><div class="dim" style="font-size:12.5px;margin-top:2px">Not strict. Close enough is a win.</div></div><b id="tol-v" class="n" style="font-size:32px">${Math.round(TOL() * 100)}%</b></div>
  <input id="tol-r" data-act="tol-in" type="range" min="70" max="100" step="5" value="${Math.round(TOL() * 100)}" aria-label="Counts as met at, percent" style="width:100%;margin:14px 0 0;accent-color:var(--acc)"><div class="mono dim" style="display:flex;justify-content:space-between;font-size:10px"><span>70%</span><span>80%</span><span>90%</span><span>100%</span></div>
  <div id="tol-l" style="margin-top:12px;border-top:1px solid var(--line)">${tolList()}</div><p style="margin:8px 0 0"><small>Energy uses its own band of plus or minus 10%, because going over matters too.</small></p></div>
  <div class="dl"><b></b><span class="m">MOVE AND REST</span><b></b></div>${box(stp('steps', 'Daily steps', 'STEPS', 500, 1, g.steps, 'var(--move)') + stp('sleep', 'Sleep', 'HOURS', 0.25, 1, g.sleep, 'var(--rest)'))}
  <div class="dl"><b></b><span class="m">BODY</span><b></b></div>${box(stp('weight', 'Target weight', UW().toUpperCase(), 0.5, 0, g.weight > 0 ? dw(g.weight) : 0, 'var(--body)'))}
  <div class="dl"><b></b><span class="m">FUEL</span><b></b></div>${box(stp('calories', 'Energy', 'KCAL', 50, 0, g.calories, 'var(--carb)') + stp('protein', 'Protein', 'G', 5, 0, g.protein, 'var(--prot)') + stp('carbs', 'Carbs', 'G', 10, 0, g.carbs, 'var(--carb)') + stp('fat', 'Fat', 'G', 5, 0, g.fat, 'var(--fat)') + `<div style="padding:0 0 14px"><small class="dim">${g.fat > 0 ? 'Range ' + fatR(g)[0] + ' to ' + fatR(g)[1] + ' g. ' : ''}</small><button class="lnk" data-act="fat-rec">Recommend from my calories</button></div>` + stp('fiber', 'Fiber', 'G', 2, 0, g.fiber, 'var(--fib)'))}
  <div class="dl"><b></b><span class="m">DAY SCORE COUNTS</span><b></b></div><div class="card" style="padding:2px 16px">${trow('Workout, on days you trained', 'score-in', sc.workout, 'workout')}${trow('Steps', 'score-in', sc.steps, 'steps')}${trow('Sleep', 'score-in', sc.sleep, 'sleep')}${trow('Protein', 'score-in', sc.protein, 'protein')}${trow('Energy, within 10% of goal', 'score-in', sc.kcal, 'kcal')}${trow('Carbs, fat and fiber', 'score-in', sc.macros, 'macros')}</div>
  <p style="margin:10px 4px 16px"><small>A target only counts if it has a goal. Changes apply to every day, including past days.</small></p><button class="btn" data-go="me">Done</button>`;
};

