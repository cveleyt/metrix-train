/* MetriX Train: Daily inputs (check-in, supplements, sleep times, streaks). Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* Data lives inside daily[day]: ci {e,s,st,q}, supp {id:1}, bed, wake ('HH:MM'). Supplement list is settings.supps. Both already sync. */
const CI = [
  ['e', 'ENERGY', ['Drained', 'Low', 'OK', 'Good', 'Great']],
  ['s', 'MUSCLE SORENESS', ['None', 'Light', 'Some', 'Sore', 'Wrecked']],
  ['st', 'STRESS', ['Calm', 'Low', 'OK', 'High', 'Maxed']],
  ['q', 'SLEEP QUALITY', ['Awful', 'Poor', 'OK', 'Good', 'Great']]
];
const SUPP_WHEN = ['Morning', 'With a meal', 'Before workout', 'During workout', 'After workout', 'Evening', 'Any time'];
const SUPP_AUTO = [['manual', 'Manual'], ['train', 'Training days'], ['daily', 'Every day']];
/* daily[day].supp[id]: 1 = you ticked it, 2 = assumed by the auto setting. daily[day].suppAuto[id] marks that auto already ran, so an untick sticks. */
function autoSupps(mode) {
  const k = todayKey(), l = suppList().filter(s => s.auto === 'daily' || (mode === 'train' && s.auto === 'train')); if (!l.length) return;
  const d = ensureDay(k); let ch = false;
  l.forEach(s => { d.suppAuto = d.suppAuto || {}; if (d.suppAuto[s.id]) return; d.suppAuto[s.id] = 1; d.supp = d.supp || {}; if (!d.supp[s.id]) d.supp[s.id] = 2; ch = true; });
  if (ch) saveDaily(); else tidyDay(k);
}
const dayD = k => daily[k] || {};
function ensureDay(k) { daily[k] = daily[k] || {}; return daily[k]; }
function tidyDay(k) { const d = daily[k]; if (d && !Object.keys(d).length) delete daily[k]; }
const suppList = () => settings.supps || [];

/* ---------- today cards ---------- */
function checkinCard() {
  const c = dayD(todayKey()).ci, n = c ? CI.filter(([f]) => c[f]).length : 0;
  if (n === 4) {
    return `<button class="card" data-act="ci-open" style="display:block;width:100%;margin-top:12px;text-align:left" aria-label="Edit today's check-in"><div class="row" style="justify-content:space-between"><span class="m">CHECK-IN</span><span class="t" style="color:var(--acct)">DONE</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">${CI.map(([f, l, w]) => `<div><div class="m" style="font-size:9px">${l.split(' ').pop()}</div><div class="n" style="font-size:20px">${c[f]}<span style="font-size:11px;color:var(--dim)"> ${w[c[f] - 1]}</span></div></div>`).join('')}</div></button>`;
  }
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">CHECK-IN</span><span class="t" style="color:var(--acct)">${n ? n + ' OF 4' : '30 SECONDS'}</span></div>
  <p style="margin:8px 0 12px">How do you feel today? Four taps. It helps the coach and your weekly review.</p><button class="btn" data-act="ci-open">${n ? 'Continue check-in' : 'Start check-in'}</button></div>`;
}
let suppDet = {};
function stackCard() {
  const l = suppList(), t = dayD(todayKey()).supp || {}, n = l.filter(s => t[s.id]).length;
  if (!l.length) return `<div class="card" style="margin-top:12px"><span class="m">SUPPLEMENTS</span><p style="margin:8px 0 12px">Track creatine, whey, vitamins or anything you take daily. You choose the names, doses and timing.</p><button class="btn ghost" data-act="supp-edit" data-i="-1">Add supplement</button></div>`;
  return `<div class="card" style="margin-top:12px;padding-bottom:6px"><div class="row" style="justify-content:space-between"><span class="m">SUPPLEMENTS</span><span class="t" style="color:var(--dim)">${n} OF ${l.length} TAKEN</span></div>
  ${l.map((s, i) => { const det = suppDet[s.id], extra = [s.auto === 'train' ? 'Auto on training days' : s.auto === 'daily' ? 'Auto every day' : '', (s.facts || []).slice(0, 3).join(', ')].filter(Boolean); return `<div class="li" style="padding:11px 0"><div style="text-align:left;flex:1;min-width:0"><button data-act="supp-edit" data-i="${i}" style="text-align:left;display:block;width:100%" aria-label="Edit ${esc(s.name)}"><span style="font-weight:700;font-size:16px">${esc(s.name)}</span>${t[s.id] === 2 ? ' <span class="t" style="color:var(--acct)">AUTO</span>' : ''}<br><span class="dim" style="font-size:12.5px">${esc([s.dose, s.when].filter(Boolean).join(' · '))}</span></button>${extra.length ? `<button class="lnk" style="margin-top:4px" data-act="supp-det" data-id="${s.id}" aria-expanded="${!!det}">Details ${det ? '&#9652;' : '&#9662;'}</button>${det ? `<div class="dim" style="font-size:12px;margin-top:4px">${extra.map(esc).join('<br>')}</div>` : ''}` : ''}</div>
  <button class="stick${t[s.id] ? ' on' : ''}" data-act="supp-tick" data-id="${s.id}" role="checkbox" aria-checked="${!!t[s.id]}" aria-label="${esc(s.name)} taken">${SVG_CK}</button></div>`; }).join('')}
  ${caffToday() ? `<div class="row" style="justify-content:space-between;padding:10px 0;border-top:1px solid var(--line)"><span class="m">CAFFEINE TODAY</span><span><span class="n" style="font-size:22px">${Math.round(caffToday())}</span><span class="dim"> of 400 mg suggested limit</span> <span class="t" style="color:${caffToday() > 400 ? 'var(--acct)' : 'var(--dim)'}">${caffToday() > 400 ? 'OVER' : 'OK'}</span></span></div>` : ''}
  <button class="mini" data-act="supp-edit" data-i="-1" style="margin:4px 0 8px">+ Add supplement</button></div>`;
}
function sleepCard() {
  const k = todayKey(), d = dayD(k), g = settings.goals.sleep, ds = lastDays(7), v = ds.map(x => dayD(x).sleep || 0), have = v.filter(x => x > 0);
  const avg = have.length ? have.reduce((a, b) => a + b, 0) / have.length : 0;
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">SLEEP, LAST NIGHT</span><span class="t" style="color:var(--dim)">${d.sleep == null ? 'NOT LOGGED' : metV(d.sleep, g) ? 'MET' : 'SHORT ' + Math.round((g - d.sleep) * 60) + ' MIN'}</span></div>
  <div class="n" style="font-size:36px;margin:6px 0 10px">${d.sleep == null ? '-' : sleepTxt(d.sleep)}</div>
  <div class="ins" style="grid-template-columns:1fr 1fr"><label>Bed time<input data-act="sl-in" data-f="bed" type="time" value="${d.bed || ''}"></label><label>Wake time<input data-act="sl-in" data-f="wake" type="time" value="${d.wake || ''}"></label></div>
  <div style="margin-top:12px">${miniBars(v.map(x => x || null), 'var(--rest)', 330, 56, g, 'Sleep last 7 nights')}</div><small>${have.length ? 'Last 7 nights, average ' + sleepTxt(avg) : 'Enter bed and wake times and the hours fill in by themselves.'}</small></div>`;
}
/* ---------- streaks ---------- */
function dayHas(k) { const d = dayD(k); return !!(dayInfo(k).logged || d.ci || (d.supp && Object.keys(d.supp).length)); }
function streakDays(test) {
  let k = todayKey(), n = 0;
  if (!test(k)) k = kAdd(k, -1);
  while (test(k) && n < 3650) { n++; k = kAdd(k, -1); }
  return n;
}
function streakWeeks() {
  const have = new Set(sessions.map(s => mondayOf(dkey(s.finishedAt))));
  let m = mondayOf(todayKey()), n = 0;
  if (!have.has(m)) m = kAdd(m, -7);
  while (have.has(m) && n < 520) { n++; m = kAdd(m, -7); }
  return n;
}
function streakCard() {
  const b = streakWeeks();
  return `<div class="row" style="justify-content:space-between;margin-top:12px;padding:0 4px"><span class="m">TRAINING STREAK</span><span><span class="n" style="font-size:24px">${b}</span><span class="dim" style="font-size:12px"> week${b === 1 ? '' : 's'} in a row</span></span></div>`;
}
let dailyOpen = false;
function dailyCard() {
  const d = dayD(todayKey()), c = d.ci ? CI.filter(([f]) => d.ci[f]).length : 0, l = suppList(), t = d.supp || {}, n = l.filter(s => t[s.id]).length;
  const sum = ['Check-in ' + c + ' of 4', l.length ? 'Stack ' + n + ' of ' + l.length : 'No supplements', 'Sleep ' + (d.sleep == null ? 'not logged' : sleepTxt(d.sleep))].join('  /  ');
  return `<div class="card" style="margin-top:12px;padding:12px 14px"><button data-act="daily-toggle" aria-expanded="${dailyOpen}" style="display:block;width:100%;text-align:left"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span><b>Daily</b> <small>${dailyOpen ? '' : 'tap to open'}</small></span><span aria-hidden="true">${dailyOpen ? '&#9652;' : '&#9662;'}</span></div>${dailyOpen ? '' : `<small style="display:block;margin-top:6px;line-height:1.5">${sum}</small>`}</button></div>${dailyOpen ? checkinCard() + stackCard() + sleepCard() : ''}`;
}
/* ---------- modals ---------- */
function ciModal() {
  const c = dayD(todayKey()).ci || {};
  showModal(`<div class="m" style="color:var(--acct)">CHECK-IN</div><div class="n" style="font-size:32px;margin:6px 0 4px">How are you?</div><div class="dim" style="font-size:12.5px">Tap what applies. Skip any you do not want to answer.</div>
  ${CI.map(([f, l, w]) => `<div class="m" style="margin:12px 0 6px">${l}</div><div class="cis" role="group" aria-label="${l}" data-f="${f}">${w.map((x, i) => `<button type="button" class="cib${c[f] === i + 1 ? ' on' : ''}" data-act="ci-pick" data-f="${f}" data-v="${i + 1}" aria-pressed="${c[f] === i + 1}"><b>${i + 1}</b><span>${x}</span></button>`).join('')}</div>`).join('')}
  <div class="mrow" style="margin-top:16px"><button class="btn ghost" data-act="mdl-close">Not now</button><button class="btn" data-act="ci-save">Save</button></div>`);
}
let spDraft = null;
function suppModal(i, dr) {
  const s = dr || (i >= 0 ? suppList()[i] : { name: '', dose: '', when: 'Morning' });
  const facts = (s.facts || []).join('\n');
  showModal(`<div class="n" style="font-size:30px;margin:6px 0 10px">${i >= 0 ? 'Edit supplement' : 'Add supplement'}</div>
  <label>Name and brand<input id="sp-name" type="text" autocomplete="off" value="${esc(s.name)}" placeholder="Pre-workout, Ghost Legend"></label><label>How much per dose<input id="sp-dose" type="text" autocomplete="off" value="${esc(s.dose)}" placeholder="2 scoops, or 5 g"></label>
  <div class="m" style="margin:10px 0 6px">WHEN</div><div class="mchips" role="group" aria-label="When">${SUPP_WHEN.map(w => `<button type="button" class="ntg${s.when === w ? ' on' : ''}" data-act="sp-when" aria-pressed="${s.when === w}">${w}</button>`).join('')}</div>
  <div class="m" style="margin:12px 0 6px">AUTO TICK</div><div class="mchips" role="group" aria-label="Auto tick">${SUPP_AUTO.map(([v, l]) => `<button type="button" class="ntg au${(s.auto || 'manual') === v ? ' on' : ''}" data-act="sp-auto" data-v="${v}" aria-pressed="${(s.auto || 'manual') === v}">${l}</button>`).join('')}</div><small style="display:block;margin-top:4px">Training days: ticked when you save a workout. Every day: ticked when you open the app. You can still untick it.</small>
  <button class="btn ghost" id="sp-look" data-act="sp-look" style="margin-top:10px">Look it up with AI</button>
  <p id="sp-msg" style="margin:6px 0;min-height:18px"><small>Finds what one dose gives you, such as caffeine. You check it before saving.</small></p>
  <div id="sp-facts-box" ${facts ? '' : 'hidden'}><label>What one dose gives you, one per line<textarea id="sp-facts" class="big" placeholder="Caffeine 300 mg">${esc(facts)}</textarea></label><p id="sp-src" style="margin:0 0 6px"><small>${esc(s.src || '')}</small></p></div>
  <div class="mrow"><button class="btn ghost" data-act="mdl-close">Cancel</button><button class="btn" data-act="supp-save" data-i="${i}">Save</button></div>${i >= 0 ? `<button class="mini" data-act="supp-del" data-i="${i}" style="margin-top:10px">Remove this supplement</button>` : ''}`);
}
const suppMg = (s, re) => { const m = (s.facts || []).map(x => String(x).match(re)).find(Boolean); return m ? parseFloat(m[1]) : 0; };
const CAFF = /caffeine\D{0,12}(\d+(?:\.\d+)?)\s*mg/i;
const caffToday = () => { const t = dayD(todayKey()).supp || {}; return suppList().filter(s => t[s.id]).reduce((a, s) => a + suppMg(s, CAFF), 0); };
async function suppLook(i) {
  const name = ($('#sp-name').value || '').trim(), dose = ($('#sp-dose').value || '').trim(), msg = $('#sp-msg'), btn = $('#sp-look');
  if (!name) { msg.innerHTML = '<small>Type the product name first.</small>'; return; }
  if (!settings.ai.key) { msg.innerHTML = '<small>Add your free Gemini key in Me, under Nutrition and AI.</small>'; return; }
  btn.disabled = true; btn.textContent = 'Looking it up...'; msg.innerHTML = '<small>Searching for the label...</small>';
  const prompt = 'Find the supplement facts label for this product: "' + name + '". The person takes this much per dose: "' + (dose || '1 serving') + '". Work out the TOTAL active amounts in that dose (for example caffeine, creatine, citrulline, beta-alanine, taurine, vitamins). Reply in exactly this format and nothing else. Lines 1 to 8: "Ingredient amount unit" one per line, totals for the whole dose, numbers only with mg, g, mcg or IU. Last line: "SOURCE: " then one short sentence naming the label or serving size you used. If you cannot find the product, reply only "UNKNOWN". Never use em dashes.';
  const t = await aiText(prompt, true);
  btn.disabled = false; btn.textContent = 'Look it up with AI';
  if (!t || /^UNKNOWN/i.test(t)) { msg.innerHTML = '<small>Could not find it. Check the name, or type the amounts yourself below.</small>'; $('#sp-facts-box').hidden = false; return; }
  const lines = t.split('\n').map(x => x.replace(/^[-*\s]+/, '').trim()).filter(Boolean), src = lines.find(x => /^SOURCE:/i.test(x)) || '';
  $('#sp-facts').value = lines.filter(x => !/^SOURCE:/i.test(x)).join('\n'); $('#sp-src').innerHTML = '<small>' + esc(src.replace(/^SOURCE:\s*/i, 'Based on: ')) + ' Estimate, compare with your tub.</small>';
  $('#sp-facts-box').hidden = false; msg.innerHTML = '<small>Check the numbers, edit if needed, then Save.</small>';
}
/* ---------- actions (return true when handled) ---------- */
function dailyAct(a, el) {
  const k = todayKey();
  switch (a) {
    case 'daily-toggle': dailyOpen = !dailyOpen; render(); return true;
    case 'ci-open': ciModal(); return true;
    case 'ci-pick': { const f = el.dataset.f; el.parentNode.querySelectorAll('.cib').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); el.classList.add('on'); el.setAttribute('aria-pressed', 'true'); return true; }
    case 'ci-save': {
      const ci = Object.assign({}, dayD(k).ci || {});
      document.querySelectorAll('#mdl .cis').forEach(g => { const b = g.querySelector('.cib.on'); if (b) ci[g.dataset.f] = +b.dataset.v; });
      if (!Object.keys(ci).length) { closeModal(); return true; }
      ensureDay(k).ci = ci; saveDaily(); closeModal(); toast('Check-in saved'); render(); return true;
    }
    case 'supp-tick': { const d = ensureDay(k); d.supp = d.supp || {}; if (d.supp[el.dataset.id]) delete d.supp[el.dataset.id]; else d.supp[el.dataset.id] = 1; if (!Object.keys(d.supp).length) delete d.supp; tidyDay(k); saveDaily(); render(); return true; }
    case 'supp-det': suppDet[el.dataset.id] = !suppDet[el.dataset.id]; render(); return true;
    case 'supp-edit': suppModal(+el.dataset.i); return true;
    case 'sp-look': {
      const i = +($('#mdl [data-act=supp-save]') || { dataset: { i: -1 } }).dataset.i, w = document.querySelector('#mdl .ntg:not(.au).on');
      if (settings.ai.key && !settings.aiOk) { spDraft = { i, s: { name: $('#sp-name').value, dose: $('#sp-dose').value, when: w ? w.textContent : 'Any time', auto: (document.querySelector('#mdl .ntg.au.on') || { dataset: {} }).dataset.v || 'manual', facts: [], src: '' } }; askAi('sp-resume'); return true; }
      suppLook(i); return true;
    }
    case 'sp-resume': if (spDraft) { suppModal(spDraft.i, spDraft.s); spDraft = null; suppLook(0); } return true;
    case 'sp-when': case 'sp-auto': el.parentNode.querySelectorAll('.ntg').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); el.classList.add('on'); el.setAttribute('aria-pressed', 'true'); return true;
    case 'supp-save': {
      const name = ($('#sp-name').value || '').trim(); if (!name) { toast('Give it a name'); return true; }
      const w = document.querySelector('#mdl .ntg:not(.au).on'), s = { name, dose: ($('#sp-dose').value || '').trim(), when: w ? w.textContent : 'Any time', auto: (document.querySelector('#mdl .ntg.au.on') || { dataset: {} }).dataset.v || 'manual', facts: ($('#sp-facts') ? $('#sp-facts').value : '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12), src: ($('#sp-src') ? $('#sp-src').textContent : '').trim() }, i = +el.dataset.i;
      const l = suppList().slice(); if (i >= 0) l[i] = Object.assign({}, l[i], s); else l.push(Object.assign({ id: 's' + Date.now().toString(36) }, s));
      settings.supps = l; saveSettings(); closeModal(); render(); return true;
    }
    case 'supp-del': { const i = +el.dataset.i, s = suppList()[i]; if (s && confirm('Remove ' + s.name + '? Past days keep their ticks.')) { settings.supps = suppList().filter((x, n) => n !== i); saveSettings(); closeModal(); render(); } return true; }
    case 'sl-in': {
      const d = ensureDay(k); if (el.value) d[el.dataset.f] = el.value; else delete d[el.dataset.f];
      if (d.bed && d.wake) { const m = t => { const [h, n] = t.split(':').map(Number); return h * 60 + n; }; let x = m(d.wake) - m(d.bed); if (x <= 0) x += 1440; d.sleep = rnd(x / 60); }
      tidyDay(k); saveDaily(); render(); return true;
    }
  }
  return false;
}
