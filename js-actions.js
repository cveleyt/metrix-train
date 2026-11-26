/* MetriX Train: All button and input actions (act). Classic script, shares one global scope with the other app files. Load order matters. */
'use strict';
/* ---------- actions ---------- */
function firstIncomplete(c) { const i = c.exercises.findIndex(x => !x.skipped && x.sets.some(t => !t.done)); return i < 0 ? 0 : i; }

async function exportData() {
  settings.lastBackup = Date.now(); saveSettings();
  const data = { app: 'metrix-train', schema: 1, exportedAt: new Date().toISOString(), sessions, daily, food, myfoods, meas, notes, notelog, feedback, settings: Object.assign({}, settings, { ai: undefined }) };
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
      if (d.schema && d.schema > 1) throw new Error('This backup is from a newer version. Update the app first');
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
      if (d.notes && typeof d.notes === 'object') { Object.keys(d.notes).forEach(k => { if (!notes[k]) notes[k] = d.notes[k]; }); }
      if (Array.isArray(d.notelog)) { d.notelog.forEach(n => { if (n && n.t && !notelog.some(x => x.t === n.t && x.name === n.name)) notelog.push(n); }); notelog.sort((a, b) => a.t - b.t); }
      saveNotes();
      if (Array.isArray(d.feedback)) { d.feedback.forEach(n => { if (n && n.t && !feedback.some(x => x.t === n.t)) feedback.push(n); }); feedback.sort((a, b) => a.t - b.t); saveFeedback(); }
      if (d.meas && typeof d.meas === 'object') { Object.keys(d.meas).forEach(k => { if (!meas[k]) meas[k] = d.meas[k]; }); saveMeas(); }
      if (d.daily && typeof d.daily === 'object') { Object.keys(d.daily).forEach(k => { if (!daily[k]) daily[k] = d.daily[k]; }); saveDaily(); }
      saveSessions(); toast('Imported ' + add + ' new, ' + upd + ' updated'); render();
    } catch (e) { toast('Import failed: ' + e.message); }
  };
  fr.readAsText(file);
}

async function act(a, el) {
  const i = +el.dataset.i, j = +el.dataset.j;
  track('a:' + a);
  if (dailyAct(a, el) || usageAct(a, el) || progAct(a, el) || homeAct(a, el)) return;
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
    case 'more': moreOpen = moreOpen === i ? -1 : i; render(); break;
    case 'toggle': open = open === i ? -1 : i; render(); break;
    case 'note-open': noteModal(i); break;
    case 'nt-tag': el.classList.toggle('on'); el.setAttribute('aria-pressed', el.classList.contains('on')); break;
    case 'note-save': {
      const x = cur().exercises[i], machine = ($('#nt-machine').value || '').trim(), note = ($('#nt-text').value || '').trim(), tags = [...document.querySelectorAll('#mdl .ntg.on')].map(b => b.textContent);
      if (!machine && !note && !tags.length) delete notes[x.name];
      else { notes[x.name] = { machine, note, tags, at: Date.now() }; if (note || tags.length) notelog.push({ t: Date.now(), name: x.name, note, tags }); }
      saveNotes(); closeModal(); toast('Note saved'); render(); break;
    }
    case 'note-clear': { const x = cur().exercises[i]; delete notes[x.name]; saveNotes(); closeModal(); render(); break; }
    case 'nq-in': { hist.nq = el.value; const l = $('#nt-list'); if (l) l.innerHTML = notesList((hist.nq || '').toLowerCase()); break; }
    case 'skip-open': { const x = cur().exercises[i]; if (x.sets.some(t => t.done)) { toast('This exercise already has sets logged.'); break; } skipModal(i); break; }
    case 'skip-do': {
      const x = cur().exercises[i], why = el.dataset.why; x.skipped = true; x.skipWhy = why;
      if (why === 'Pain') { const prev = notes[x.name] || { machine: '', note: '', tags: [] }; if (!prev.tags.includes('Pain')) prev.tags.push('Pain'); prev.at = Date.now(); notes[x.name] = prev; notelog.push({ t: Date.now(), name: x.name, note: 'Skipped because of pain', tags: ['Pain'] }); saveNotes(); }
      closeModal(); const nx = firstIncomplete(cur()); open = nx; persist(); render(); break;
    }
    case 'skip-undo': { const x = cur().exercises[i]; delete x.skipped; delete x.skipWhy; persist(); render(); break; }
    case 'add-open': addModal(); break;
    case 'add-do': {
      const name = ($('#ad-name').value || '').trim(), n = Math.max(1, Math.min(10, parseInt($('#ad-sets').value, 10) || 3));
      if (!name) { toast('Type the exercise name.'); break; }
      const nw = $('#ad-nw').checked || isNW(name), ex = { name, id: null, noWeight: nw, lo: 8, hi: 12 }, prev = prevFor(ex);
      const sets = [...Array(n)].map((_, k) => { const p = prev ? (prev.sets[k] || prev.sets[prev.sets.length - 1]) : null; return { w: nw ? 0 : (p ? p.w : 0), r: p ? p.r : 10, done: false }; });
      const c = cur(); c.exercises.push({ slotId: null, name, sets, extra: true, nw: nw || undefined });
      open = c.exercises.length - 1; closeModal(); persist(); render();
      setTimeout(() => { const e = document.querySelector('.ex.open'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); break;
    }
    case 'warm-add': {
      const x = cur().exercises[i], ex = exOf(x); x.warm = x.warm || [];
      const top = x.sets[0] ? dw(x.sets[0].w) : 0, d = incD(ex), f = x.warm.length ? 0.7 : 0.5;
      x.warm.push({ w: ex.noWeight ? 0 : Math.max(0, rnd(fw(rd(Math.round(top * f / d) * d)))), r: x.warm.length ? 5 : 8, done: false }); persist(); render(); break;
    }
    case 'warm-rm': { const x = cur().exercises[i]; if (x.warm && x.warm.length) x.warm.pop(); persist(); render(); break; }
    case 'ww+': case 'ww-': { const x = cur().exercises[i], d = incD(exOf(x)), t = x.warm[j]; t.w = Math.max(0, rnd(fw(rd(dw(t.w || 0) + (a === 'ww+' ? d : -d))))); persist(); render(); break; }
    case 'wr+': case 'wr-': { const t = cur().exercises[i].warm[j]; t.r = Math.max(0, (t.r || 0) + (a === 'wr+' ? 1 : -1)); persist(); render(); break; }
    case 'ww-in': { const v = parseFloat(String(el.value).replace(',', '.')); cur().exercises[i].warm[j].w = isNaN(v) || v < 0 ? 0 : rnd(fw(v)); persist(); break; }
    case 'wr-in': { const v = parseInt(el.value, 10); cur().exercises[i].warm[j].r = isNaN(v) || v < 0 ? 0 : v; persist(); break; }
    case 'wdone': { const t = cur().exercises[i].warm[j]; t.done = !t.done; if (t.done) buzz(20); persist(); render(); break; }
    case 'rpe': { const t = cur().exercises[i].sets[j], v = +el.dataset.v; t.rpe = t.rpe === v ? undefined : v; persist(); render(); break; }
    case 'rpe-in': settings.rpe = el.checked; saveSettings(); break;
    case 'unit-set': settings.units = Object.assign({}, settings.units, { [el.dataset.f]: el.dataset.v }); saveSettings(); render(); break;
    case 'csv': exportCsv(el.dataset.k); break;
    case 'wk-nav': hist[el.dataset.k] = Math.min(0, hist[el.dataset.k] + (+el.dataset.n)); render(); break;
    case 'meas-in': {
      const mon = el.dataset.mon, f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      meas[mon] = meas[mon] || {};
      if (isNaN(v) || v <= 0) delete meas[mon][f]; else meas[mon][f] = rnd(fl(v));
      if (!Object.keys(meas[mon]).length) delete meas[mon];
      saveMeas(); break;
    }
    case 'pose-set': hist.pose = el.dataset.v; render(); break;
    case 'ph-pick': $('#ph-file').click(); break;
    case 'ph-in': {
      const f = el.files && el.files[0]; if (!f) break;
      try { const b = await phCompress(f); await phOp('readwrite', s => s.put(b, el.dataset.key)); if (!phKeys.includes(el.dataset.key)) phKeys.push(el.dataset.key); toast('Photo saved'); }
      catch (e) { toast('Could not save the photo: ' + (e.message || 'error')); }
      render(); break;
    }
    case 'ph-del':
      if (confirm('Remove this photo from the phone?')) { try { await phOp('readwrite', s => s.delete(el.dataset.key)); phKeys = phKeys.filter(k => k !== el.dataset.key); } catch (e) { toast('Could not remove the photo.'); } render(); }
      break;
    case 'rv-ai': if (!settings.aiOk) { askAi('rv-ai'); break; } await reviewAi(); break;
    case 'rv-apply': {
      const d = +el.dataset.d, n = (settings.goals.calories || 0) + d;
      if (n > 0 && confirm('Change your calorie goal from ' + settings.goals.calories + ' to ' + n + ' kcal?')) { settings.goals.calories = n; saveSettings(); toast('Calorie goal is now ' + n); render(); }
      break;
    }
    case 'deload-yes': settings.deload = { week: mondayOf(todayKey()) }; saveSettings(); render(); break;
    case 'deload-no': settings.deloadNo = mondayOf(todayKey()); saveSettings(); render(); break;
    case 'deload-off': settings.deload = null; saveSettings(); render(); break;
    case 'scan-open': openScan(); break;
    case 'scan-go': lookupCode(($('#sc-num') || {}).value); break;
    case 'w+': case 'w-': {
      const c = cur(), x = c.exercises[i], d = incD(exOf(x));
      setW(c, i, j, Math.max(0, rnd(fw(rd(dw(x.sets[j].w || 0) + (a === 'w+' ? d : -d)))))); persist(); render(); break;
    }
    case 'r+': case 'r-': {
      const t = cur().exercises[i].sets[j]; t.r = Math.max(0, (t.r || 0) + (a === 'r+' ? 1 : -1)); persist(); render(); break;
    }
    case 'w-in': {
      const v = parseFloat(String(el.value).replace(',', '.'));
      setW(cur(), i, j, isNaN(v) || v < 0 ? 0 : rnd(fw(v))); persist(); syncInputs(i); break;
    }
    case 'r-in': {
      const v = parseInt(el.value, 10); cur().exercises[i].sets[j].r = isNaN(v) || v < 0 ? 0 : v; persist(); break;
    }
    case 'done': {
      const c = cur(), x = c.exercises[i], t = x.sets[j];
      t.done = !t.done;
      let moved = false;
      if (t.done) {
        buzz(20); flashSet = { i, j, t: Date.now() };
        if (!view.params.edit && t.w) x.sets.forEach((q, n) => { if (n > j && !q.done) q.w = t.w; });
        if (!view.params.edit) {
          const ex = exOf(x), k = x.sets.findIndex(q => !q.done);
          let nt;
          if (k >= 0) nt = 'set ' + (k + 1) + ', ' + x.name;
          else { const n2 = c.exercises.findIndex(y => !y.skipped && y.sets.some(q => !q.done)); nt = n2 >= 0 ? c.exercises[n2].name + ', set ' + (c.exercises[n2].sets.findIndex(q => !q.done) + 1) : 'all sets done, tap Finish'; }
          startTimer(ex.rest[0], ex.rest[1], nt, { i, j });
        }
        if (x.sets.every(s => s.done)) { open = -1; }
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
      if (UW() === 'lb') { const st = [1, 2.5, 5, 10]; settings.incLb = settings.incLb || {}; settings.incLb[ex.name] = st[(st.indexOf(incD(ex)) + 1) % st.length]; }
      else { const steps = [1, 1.25, 2.5, 5, 10]; settings.inc[ex.name] = steps[(steps.indexOf(getInc(ex)) + 1) % steps.length]; }
      saveSettings(); render(); break;
    }
    case 'tpre': startTimer(+el.dataset.s, +el.dataset.s, '', null, true); render(); break;
    case 'tskip': timer = null; saveTimer(); render(); break;
    case 'tstart': if (timer) { timer.state = 'run'; timer.start = Date.now(); timer.acc = 0; timer.f1 = 0; timer.f2 = 0; saveTimer(); render(); } break;
    case 'tpause': if (timer && timer.state === 'run') { timer.acc = tel(timer); timer.state = 'pause'; timer.start = null; saveTimer(); render(); } break;
    case 'tresume': if (timer && timer.state === 'pause') { timer.state = 'run'; timer.start = Date.now(); saveTimer(); render(); } break;
    case 'tstop': if (timer && (timer.state || 'run') !== 'idle' && tel(timer) < timer.min && !confirm('Stop the rest timer early?')) break; stopTimer(true); render(); break;
    case 'auto-in': settings.autoStart = el.checked; saveSettings(); break;
    case 'tmin': if (timer) { timer.pop = false; saveTimer(); } render(); break;
    case 'tshow': if (fabMoved) { fabMoved = false; break; } if (timer) { timer.pop = true; saveTimer(); } render(); break;
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
      const ex = e.exercises.map(x => ({ slotId: x.slotId, name: x.name, nw: x.nw, sets: x.sets.filter(t => t.done).map(t => ({ w: t.w, r: t.r, done: true, rpe: t.rpe })), warm: x.warm })).filter(x => x.sets.length);
      if (!ex.length) { toast('A workout needs at least one done set. Use Delete in History instead.'); break; }
      const k = sessions.findIndex(s => s.id === e.id);
      if (k >= 0) sessions[k] = Object.assign({}, sessions[k], { exercises: ex, updatedAt: Date.now() });
      saveSessions(); editing = null; toast('Saved'); go('session', { id: e.id }, true); break;
    }
    case 'daily-in': {
      const k = todayKey(), f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      daily[k] = daily[k] || {};
      if (isNaN(v) || v < 0) delete daily[k][f]; else daily[k][f] = f === 'steps' ? Math.round(v) : f === 'weight' ? (UW() === 'lb' ? rnd(fw(v)) : r1(v)) : rnd(v);
      if (!Object.keys(daily[k]).length) delete daily[k];
      saveDaily(); refreshRings(); break;
    }
    case 'tol-in': {
      const v = Math.min(100, Math.max(70, parseInt(el.value, 10) || 80)); settings.tol = v; saveSettings();
      const a = $('#tol-v'), l = $('#tol-l'); if (a) a.textContent = v + '%'; if (l) l.innerHTML = tolList(); break;
    }
    case 'fat-rec': {
      const g = settings.goals; if (!(g.calories > 0)) { toast('Set your energy goal first'); break; }
      const kg = lastKg(), r = fatRec(g.calories, kg), cur = g.fat > 0 ? Math.round(g.fat * 9 / g.calories * 100) : 0;
      const tr = (a, b) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--line);font-size:14px"><span class="dim">${a}</span><b>${b}</b></div>`;
      showModal(`<div class="m" style="color:var(--acct)">FAT GOAL</div><div class="n" style="font-size:44px;margin:6px 0 2px">${r.lo} to ${r.hi}<span class="dim" style="font-size:16px"> g per day</span></div>
      <p><small>${g.fat > 0 ? 'Your current goal is ' + g.fat + ' g, which is ' + cur + '% of your energy. The usual range is 25 to 30%.' : 'No fat goal yet.'}</small></p>
      <div class="m" style="margin:10px 0 2px">HOW THE NUMBER IS BUILT</div>${tr('Energy goal', g.calories.toLocaleString() + ' kcal')}${tr('Fat share, 25 to 30%', Math.round(g.calories * .25) + ' to ' + Math.round(g.calories * .3) + ' kcal')}${tr('Divided by 9 kcal per g', r.lo + ' to ' + r.hi + ' g')}${tr('Floor, 0.6 g per kg x ' + r1(kg) + ' kg', r.fl + ' g, ' + (r.ok ? 'passed' : 'raised'))}
      <p style="margin-top:10px"><small>The numbers come from a formula, not from the AI. You choose.</small></p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn2" style="flex:1" data-act="mdl-close">${g.fat > 0 ? 'Keep ' + g.fat + ' g' : 'Not now'}</button><button class="btn" style="flex:1" data-act="fat-use" data-lo="${Math.max(r.lo, r.fl)}" data-hi="${Math.max(r.hi, r.fl)}">Use ${Math.max(r.lo, r.fl)} to ${Math.max(r.hi, r.fl)} g</button></div>`);
      break;
    }
    case 'fat-use': {
      const lo = +el.dataset.lo, hi = +el.dataset.hi; settings.goals.fat = Math.round((lo + hi) / 2); settings.goals.fatLo = lo; settings.goals.fatHi = hi; saveSettings(); closeModal(); render(); break;
    }
    case 'goal-in': {
      const f = el.dataset.f, v = parseFloat(String(el.value).replace(',', '.'));
      if (v > 0) settings.goals[f] = f === 'weight' ? rnd(fw(v)) : v;
      else if (f === 'steps') settings.goals[f] = 10000;
      else if (f === 'sleep') settings.goals[f] = 8;
      else delete settings.goals[f];
      if (f === 'fat') { delete settings.goals.fatLo; delete settings.goals.fatHi; }
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
      const txt = mealParse(($('#fd-name').value || '').trim()).clean, msg = $('#fd-aimsg'), btn = $('#fd-ai');
      const say = m => { msg.innerHTML = '<small>' + esc(m) + '</small>'; };
      if (!txt) { say('Type what you ate first, with amounts if you know them.'); break; }
      const hit = myfoods.find(f => f.name.toLowerCase() === txt.toLowerCase());
      if (hit) { revealNums(); $('#fd-kcal').value = hit.kcal; $('#fd-p').value = hit.p; $('#fd-c').value = hit.c; $('#fd-f').value = hit.f || 0; $('#fd-fi').value = hit.fi || 0; say('From your foods, instant. Tap Add to today.'); break; }
      if (!settings.ai.key) { say('Add your free Gemini key in Me, under Nutrition and AI.'); break; }
      if (!settings.aiOk) { askAi('food-ai'); break; }
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
        revealNums(); $('#fd-kcal').value = k; $('#fd-p').value = p; $('#fd-c').value = c; $('#fd-f').value = fa; $('#fd-fi').value = fi;
        say('Estimate: ' + k + ' kcal, ' + p + ' g protein, ' + c + ' g carbs, ' + fa + ' g fat, ' + fi + ' g fiber. Edit if needed, then tap Add to today.' + (used && used !== settings.ai.model ? ' (answered by ' + used + ')' : ''));
      } catch (e) {
        say(e.name === 'AbortError' ? 'Timed out. Check your connection and try again.' : (e instanceof TypeError ? 'No connection. You can still type the numbers yourself.' : e.message));
      }
      btn.disabled = false; btn.textContent = 'Estimate';
      break;
    }
    case 'ai-key-in': settings.ai.key = el.value.trim(); saveSettings(); toast(settings.ai.key ? 'Key saved on this phone' : 'Key removed'); break;
    case 'ai-model-in': settings.ai.model = el.value.trim() || 'gemini-3.1-flash-lite'; saveSettings(); break;
    case 'meal-set': { mealSel = el.dataset.m; { const mb = $('#fd-mealbtn'); if (mb) mb.innerHTML = 'Meal: ' + esc(mealSel === 'auto' ? 'Auto' : (MEALS.find(m => m[0] === mealSel) || ['', 'Auto'])[1]) + (($('#fd-mealbox') || {}).hidden ? ' \u25BE' : ' \u25B4'); } document.querySelectorAll('#fd-meals button').forEach(b => { const on = b.dataset.m === mealSel; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); break; }
    case 'foods-toggle': foodsOpen = !foodsOpen; $('#fd-fold').innerHTML = foodsFold(); break;
    case 'food-pick': {
      const f = myfoods.find(x => x.id === el.dataset.id); if (!f) break;
      $('#fd-name').value = f.name; revealNums(); $('#fd-kcal').value = f.kcal; $('#fd-p').value = f.p; $('#fd-c').value = f.c; $('#fd-f').value = f.f || 0; $('#fd-fi').value = f.fi || 0;
      $('#fd-aimsg').innerHTML = '<small>From your foods. Tap Add to today.</small>'; $('#fd-res').innerHTML = ''; if (foodsOpen) { foodsOpen = false; $('#fd-fold').innerHTML = foodsFold(); } break;
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
      const mp = mealParse(($('#fd-name').value || '').trim()), now = Date.now(), mk = mealSel !== 'auto' ? mealSel : (mp.key && mp.key !== '*' ? mp.key : mealByTime(now));
      const e = { id: uid(), t: now, m: mk, name: mp.clean, kcal: Math.round(num('fd-kcal')), p: num('fd-p'), c: num('fd-c'), f: num('fd-f'), fi: num('fd-fi') };
      if (!e.kcal && !e.p && !e.c && !e.f && !e.fi) { toast('Enter calories or a nutrient.'); break; }
      const k = todayKey(); food[k] = food[k] || []; food[k].push(e); saveFood();
      if (e.name) {
        const m = myfoods.find(f => f.name.toLowerCase() === e.name.toLowerCase());
        if (m) { m.kcal = e.kcal; m.p = e.p; m.c = e.c; m.f = e.f; m.fi = e.fi; m.n++; m.last = Date.now(); }
        else { myfoods.push({ id: uid(), name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f, fi: e.fi, n: 1, last: Date.now() }); if (myfoods.length > 300) myfoods.sort((a, b) => b.last - a.last).length = 300; }
        saveMy();
      }
      toast('Added to ' + (MEALS.find(x => x[0] === mk) || [0, 'today'])[1].toLowerCase()); mealSel = 'auto'; render(); break;
    }
    case 'food-del': {
      const k = todayKey(); food[k] = dayFood(k).filter(e => e.id !== el.dataset.id);
      if (!food[k].length) delete food[k];
      saveFood(); render(); break;
    }
    case 'summary-done': {
      const sx = sessions.find(x => x.id === el.dataset.id), tb = $('#fb-text');
      if (sx && tb) {
        const note = (tb.value || '').trim(), tags = [...document.querySelectorAll('#fb-box .ntg.on')].map(b => b.textContent);
        if (note !== (sx.note || '')) { sx.note = note; sx.updatedAt = Date.now(); saveSessions(); }
        feedback = feedback.filter(f => f.sid !== sx.id);
        if (note || tags.length) { feedback.push({ t: Date.now(), sid: sx.id, note, tags, ver: VERSION }); toast('Note saved'); }
        saveFeedback();
      }
      go('home', {}, true); break;
    }
    case 'note-in': { const s = sessions.find(x => x.id === el.dataset.id); if (s) { s.note = el.value; s.updatedAt = Date.now(); saveSessions(); } break; }
    case 'hist-mode': hist.mode = el.dataset.m; if (LOGM.includes(hist.mode)) hist.logm = hist.mode; render(); break;
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
      if (f === 'weight') {
        const d = parseFloat(el.dataset.d), cd = settings.goals.weight ? dw(settings.goals.weight) : dw(lw || 70) - d, nd = Math.max(0, Math.round((cd + d) * 10) / 10);
        if (nd > 0) settings.goals.weight = rnd(fw(nd)); else delete settings.goals.weight;
        saveSettings(); const inp = $('#gi-weight'); if (inp) inp.value = nd > 0 ? nd : ''; break;
      }
      const nv = Math.max(min, Math.round((cur + parseFloat(el.dataset.d)) * 100) / 100);
      if (nv > 0) settings.goals[f] = nv; else delete settings.goals[f];
      saveSettings(); const inp = $('#gi-' + f); if (inp) inp.value = nv > 0 ? nv : ''; break;
    }
    case 'sound-in': settings.sound = el.checked; saveSettings(); if (el.checked) { unlockAudio(); beep(1); } break;
    case 'vib-in': settings.vibrate = el.checked; saveSettings(); if (el.checked) buzz(100); break;
    case 'export': exportData(); break;
    case 'import-btn': $('#imp').click(); break;
    case 'import-in': if (el.files && el.files[0]) importData(el.files[0]); break;
    case 'goal-tog': {
      settings.profile = settings.profile || {}; const cur = settings.profile.goal || '', v = el.dataset.v; let n;
      if (v === 'maintain') n = 'maintain'; else if (cur === '' || cur === 'maintain') n = v; else if (cur === v) n = ''; else if (cur === 'recomp') n = v === 'lose' ? 'gain' : 'lose'; else n = 'recomp';
      settings.profile.goal = n; saveSettings(); render(); break;
    }
    case 'prof-ok': { settings.profile = settings.profile || {}; settings.profile.ok = el.checked; saveSettings(); break; }
    case 'hidecal-in': settings.hideCal = el.checked; saveSettings(); applyCal(); render(); break;
    case 'ai-agree': { settings.aiOk = true; saveSettings(); closeModal(); const nx = el.dataset.next; if (nx) act(nx, el); break; }
    case 'backup-later': settings.lastBackup = Date.now() - 4 * 864e5; saveSettings(); render(); break;
    case 'prof-in': { settings.profile = settings.profile || {}; const v = parseFloat(String(el.value).replace(',', '.')); { const f = el.dataset.f; settings.profile[f] = isNaN(v) || v < 0 ? 0 : f === 'h' ? r1(fl(v)) : f === 'w' ? rnd(fw(v)) : v; } saveSettings(); break; }
    case 'prof-set': { settings.profile = settings.profile || {}; settings.profile[el.dataset.f] = el.dataset.v; saveSettings(); render(); break; }
    case 'rec-go': {
      const r = recCalc(), msg = $('#rec-msg');
      if (r.err) { msg.innerHTML = '<small style="color:var(--rest)">' + esc(r.err) + '</small>'; break; }
      settings.rec = { vals: r.vals, why: '', note: r.note, at: Date.now() }; saveSettings(); $('#rec-box').innerHTML = recBlock();
      if (settings.ai.key && !settings.aiOk) { askAi('rec-go'); break; }
      if (settings.ai.key) {
        const b = $('#rec-btn'); b.disabled = true; b.textContent = 'Writing the reason...';
        const why = await aiWhy(r); b.disabled = false; b.textContent = 'Get recommendations';
        if (why) { settings.rec.why = why; saveSettings(); }
      }
      if ($('#rec-box')) $('#rec-box').innerHTML = recBlock();
      break;
    }
    case 'rec-use': { if (settings.rec) { settings.goals[el.dataset.k] = settings.rec.vals[el.dataset.k]; saveSettings(); toast('Target updated'); $('#rec-box').innerHTML = recBlock(); } break; }
    case 'rec-all': { if (settings.rec) { Object.assign(settings.goals, settings.rec.vals); saveSettings(); toast('All targets updated'); $('#rec-box').innerHTML = recBlock(); } break; }
    case 'sync-now': if (window.MXSYNC) { toast('Syncing...'); window.MXSYNC.now(); } break;
    case 'logout': try { if (window.MXSYNC) window.MXSYNC.logout(); ['mx.auth', 'mx.user', 'mx.pfx'].forEach(k => localStorage.removeItem(k)); } catch (x) {} location.replace(location.pathname); break;
    case 'update': showModal(`<div class="m" style="color:var(--acct)">UPDATE APP</div><div class="n" style="font-size:38px;margin:8px 0;text-transform:uppercase">Are you sure?</div><p>The app reloads and gets the newest version. Your workouts, food and settings stay on this phone.</p><div class="mrow"><button class="btn ghost" data-act="mdl-close">Cancel</button><button class="btn" data-act="update-yes">Yes, update</button></div>`); break;
    case 'update-yes': {
      try { localStorage.setItem('mx.fromVer', VERSION); } catch (e) {}
      try {
        if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
      } catch (e) {}
      location.replace(location.pathname + '?r=' + Date.now()); break;
    }
    case 'mdl-close': closeModal(); break;
    case 'whatsnew-ok': try { localStorage.setItem('mx.seenVer', VERSION); localStorage.removeItem('mx.fromVer'); } catch (e) {} closeModal(); break;
    case 'reset':
      if (confirm('Delete ALL your data on this phone and your cloud copy? Export a backup first.') && confirm('Really delete everything? This cannot be undone.')) {
        ['mx.sessions', 'mx.active', 'mx.settings', 'mx.timer', 'mx.daily', 'mx.food', 'mx.myfoods', 'mx.meas', 'mx.notes', 'mx.notelog', 'mx.feedback', 'mx.usage'].forEach(k => localStorage.removeItem(K(k)));
        sessions = []; daily = {}; food = {}; myfoods = []; meas = {}; notes = {}; notelog = []; feedback = []; phKeys = []; try { indexedDB.deleteDatabase('mx-photos-' + (USER ? USER.id : 'x')); } catch (e) {} active = null; timer = null; settings = { inc: {}, sound: true, vibrate: true, override: null, theme: 'system', goals: { steps: 10000, sleep: 8, protein: 130 }, ai: { key: '', model: 'gemini-3.1-flash-lite' } };
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
  else if (e.target.id === 'fd-fq') { $('#fd-fl').innerHTML = foodsList(e.target.value); }
  else if (e.target.id === 'nt-q') act('nq-in', e.target);
  else if (e.target.id === 'tol-r') act('tol-in', e.target);
});
window.addEventListener('mxsync', () => { const e = $('#sync-st'); if (e && window.MXSYNC) e.textContent = MXSYNC.label(); });
document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); tick(); autoSupps('daily'); } });

