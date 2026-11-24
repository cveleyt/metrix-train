/* MetriX Train: Daily inputs (check-in, water, supplements, sleep times, streaks). Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* Data lives inside daily[day]: ci {e,s,st,q}, water (ml), waterLog [[t,ml]], supp {id:1}, bed, wake ('HH:MM'). Supplement list is settings.supps. Both already sync. */
const CI = [
  ['e', 'ENERGY', ['Drained', 'Low', 'OK', 'Good', 'Great']],
  ['s', 'MUSCLE SORENESS', ['None', 'Light', 'Some', 'Sore', 'Wrecked']],
  ['st', 'STRESS', ['Calm', 'Low', 'OK', 'High', 'Maxed']],
  ['q', 'SLEEP QUALITY', ['Awful', 'Poor', 'OK', 'Good', 'Great']]
];
const SUPP_WHEN = ['Morning', 'With a meal', 'After workout', 'Evening', 'Any time'];
const waterGoal = () => settings.goals.water || 2500;
const lit = ml => (ml / 1000).toFixed(ml % 100 ? 2 : 1).replace(/0$/, '').replace(/\.$/, '');
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
function waterCard() {
  const d = dayD(todayKey()), w = d.water || 0, g = waterGoal(), log = d.waterLog || [];
  const last = log.length ? log[log.length - 1] : null;
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">WATER</span><span class="t" style="color:var(--dim)">${w >= g ? 'GOAL HIT' : Math.round(w / g * 100) + '%'}</span></div>
  <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:center;margin-top:6px"><div><span class="n" style="font-size:40px">${lit(w)}</span><span class="dim"> of ${lit(g)} L</span></div>${tickRing(78, Math.min(1, w / g), 'var(--rest)', `<span class="n" style="font-size:18px">${Math.round(w / g * 100)}%</span>`, 40, 3, 8)}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">${[250, 500, 750].map(v => `<button class="mini" style="height:46px;font-size:15px;text-align:center" data-act="water-add" data-v="${v}" aria-label="Add ${v} millilitres of water">+${v} ml</button>`).join('')}</div>
  <div class="row" style="justify-content:space-between;margin-top:10px;flex-wrap:nowrap"><small>${last ? 'Last: ' + last[1] + ' ml at ' + new Date(last[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nothing logged yet'}</small>${last ? '<button class="mini" data-act="water-undo">Undo</button>' : ''}</div></div>`;
}
function stackCard() {
  const l = suppList(), t = dayD(todayKey()).supp || {}, n = l.filter(s => t[s.id]).length;
  if (!l.length) return `<div class="card" style="margin-top:12px"><span class="m">SUPPLEMENTS</span><p style="margin:8px 0 12px">Track creatine, whey, vitamins or anything you take daily. You choose the names, doses and timing.</p><button class="btn ghost" data-act="supp-edit" data-i="-1">Add supplement</button></div>`;
  return `<div class="card" style="margin-top:12px;padding-bottom:6px"><div class="row" style="justify-content:space-between"><span class="m">SUPPLEMENTS</span><span class="t" style="color:var(--dim)">${n} OF ${l.length} TAKEN</span></div>
  ${l.map((s, i) => `<div class="li" style="padding:11px 0"><button data-act="supp-edit" data-i="${i}" style="text-align:left;flex:1" aria-label="Edit ${esc(s.name)}"><span style="font-weight:600">${esc(s.name)}</span><br><span class="dim" style="font-size:12px">${esc([s.dose, s.when].filter(Boolean).join(', '))}</span></button>
  <button data-act="supp-tick" data-id="${s.id}" role="checkbox" aria-checked="${!!t[s.id]}" aria-label="${esc(s.name)} taken" style="width:34px;height:34px;border-radius:50%;border:1.5px solid ${t[s.id] ? 'var(--acct)' : 'var(--line2)'};background:${t[s.id] ? 'var(--acct)' : 'transparent'};color:#fff;font-weight:700">${t[s.id] ? '&#10003;' : ''}</button></div>`).join('')}
  <button class="mini" data-act="supp-edit" data-i="-1" style="margin:4px 0 8px">+ Add supplement</button></div>`;
}
function sleepCard() {
  const k = todayKey(), d = dayD(k), g = settings.goals.sleep, ds = lastDays(7), v = ds.map(x => dayD(x).sleep || 0), have = v.filter(x => x > 0);
  const avg = have.length ? have.reduce((a, b) => a + b, 0) / have.length : 0;
  return `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="m">SLEEP, LAST NIGHT</span><span class="t" style="color:var(--dim)">${d.sleep == null ? 'NOT LOGGED' : d.sleep >= g ? 'HIT' : 'SHORT ' + Math.round((g - d.sleep) * 60) + ' MIN'}</span></div>
  <div class="n" style="font-size:36px;margin:6px 0 10px">${d.sleep == null ? '-' : sleepTxt(d.sleep)}</div>
  <div class="ins" style="grid-template-columns:1fr 1fr"><label>Bed time<input data-act="sl-in" data-f="bed" type="time" value="${d.bed || ''}"></label><label>Wake time<input data-act="sl-in" data-f="wake" type="time" value="${d.wake || ''}"></label></div>
  <div style="margin-top:12px">${miniBars(v.map(x => x || null), 'var(--rest)', 330, 56, g, 'Sleep last 7 nights')}</div><small>${have.length ? 'Last 7 nights, average ' + sleepTxt(avg) : 'Enter bed and wake times and the hours fill in by themselves.'}</small></div>`;
}
/* ---------- streaks ---------- */
function dayHas(k) { const d = dayD(k); return !!(dayInfo(k).logged || d.water || d.ci || (d.supp && Object.keys(d.supp).length)); }
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
  const a = streakDays(dayHas), b = streakWeeks(), c = streakDays(k => dayD(k).water >= waterGoal());
  const cell = (v, l) => `<div style="text-align:center"><div class="n" style="font-size:32px">${v}</div><div class="m" style="font-size:9px;margin-top:2px">${l}</div></div>`;
  return `<div class="card" style="margin-top:12px"><span class="m">STREAKS</span><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">${cell(a, 'DAYS LOGGED')}${cell(b, 'TRAINING WEEKS')}${cell(c, 'WATER GOAL DAYS')}</div>
  <p style="margin:12px 0 0"><small>A rest day does not break the training streak, only a week with no workout does. A missed day just starts the count again.</small></p></div>`;
}
/* ---------- modals ---------- */
function ciModal() {
  const c = dayD(todayKey()).ci || {};
  showModal(`<div class="m" style="color:var(--acct)">CHECK-IN</div><div class="n" style="font-size:32px;margin:6px 0 4px;text-transform:uppercase">How are you?</div>
  ${CI.map(([f, l, w]) => `<div class="m" style="margin:12px 0 6px">${l}</div><div class="cis" role="group" aria-label="${l}" data-f="${f}">${w.map((x, i) => `<button type="button" class="cib${c[f] === i + 1 ? ' on' : ''}" data-act="ci-pick" data-f="${f}" data-v="${i + 1}" aria-pressed="${c[f] === i + 1}"><b>${i + 1}</b><span>${x}</span></button>`).join('')}</div>`).join('')}
  <div class="mrow" style="margin-top:16px"><button class="btn ghost" data-act="mdl-close">Not now</button><button class="btn" data-act="ci-save">Save</button></div>`);
}
function suppModal(i) {
  const s = i >= 0 ? suppList()[i] : { name: '', dose: '', when: 'Morning' };
  showModal(`<div class="m" style="color:var(--acct)">SUPPLEMENT</div><div class="n" style="font-size:30px;margin:6px 0 10px;text-transform:uppercase">${i >= 0 ? 'Edit' : 'Add'}</div>
  <label>Name<input id="sp-name" type="text" autocomplete="off" value="${esc(s.name)}" placeholder="Creatine"></label><label>Dose<input id="sp-dose" type="text" autocomplete="off" value="${esc(s.dose)}" placeholder="5 g"></label>
  <div class="m" style="margin:10px 0 6px">WHEN</div><div class="mchips" role="group" aria-label="When">${SUPP_WHEN.map(w => `<button type="button" class="ntg${s.when === w ? ' on' : ''}" data-act="sp-when" aria-pressed="${s.when === w}">${w}</button>`).join('')}</div>
  <div class="mrow"><button class="btn ghost" data-act="mdl-close">Cancel</button><button class="btn" data-act="supp-save" data-i="${i}">Save</button></div>${i >= 0 ? `<button class="mini" data-act="supp-del" data-i="${i}" style="margin-top:10px">Remove this supplement</button>` : ''}`);
}
/* ---------- actions (return true when handled) ---------- */
function dailyAct(a, el) {
  const k = todayKey();
  switch (a) {
    case 'ci-open': ciModal(); return true;
    case 'ci-pick': { const f = el.dataset.f; el.parentNode.querySelectorAll('.cib').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); el.classList.add('on'); el.setAttribute('aria-pressed', 'true'); return true; }
    case 'ci-save': {
      const ci = Object.assign({}, dayD(k).ci || {});
      document.querySelectorAll('#mdl .cis').forEach(g => { const b = g.querySelector('.cib.on'); if (b) ci[g.dataset.f] = +b.dataset.v; });
      if (!Object.keys(ci).length) { closeModal(); return true; }
      ensureDay(k).ci = ci; saveDaily(); closeModal(); toast('Check-in saved'); render(); return true;
    }
    case 'water-add': { const d = ensureDay(k), v = +el.dataset.v; d.water = (d.water || 0) + v; (d.waterLog = d.waterLog || []).push([Date.now(), v]); saveDaily(); render(); return true; }
    case 'water-undo': { const d = ensureDay(k), l = d.waterLog || []; if (!l.length) return true; const x = l.pop(); d.water = Math.max(0, (d.water || 0) - x[1]); if (!d.water) delete d.water; if (!l.length) delete d.waterLog; tidyDay(k); saveDaily(); render(); return true; }
    case 'supp-tick': { const d = ensureDay(k); d.supp = d.supp || {}; if (d.supp[el.dataset.id]) delete d.supp[el.dataset.id]; else d.supp[el.dataset.id] = 1; if (!Object.keys(d.supp).length) delete d.supp; tidyDay(k); saveDaily(); render(); return true; }
    case 'supp-edit': suppModal(+el.dataset.i); return true;
    case 'sp-when': el.parentNode.querySelectorAll('.ntg').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); el.classList.add('on'); el.setAttribute('aria-pressed', 'true'); return true;
    case 'supp-save': {
      const name = ($('#sp-name').value || '').trim(); if (!name) { toast('Give it a name'); return true; }
      const w = document.querySelector('#mdl .ntg.on'), s = { name, dose: ($('#sp-dose').value || '').trim(), when: w ? w.textContent : 'Any time' }, i = +el.dataset.i;
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
