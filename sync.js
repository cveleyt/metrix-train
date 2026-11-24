/* MetriX cloud: login and sync with Supabase, using plain fetch (no library).
   Local first: the phone stays the source of truth and keeps working offline. The cloud keeps a copy
   so a new or lost phone gets everything back. The publishable key below is meant to be public;
   privacy comes from the row level security rules in supabase/schema.sql.
   Never put the secret / service_role key in this file. The Gemini key is never synced.

   How sync decides (per record, using a hash of what was last synced as the base):
   - only changed here: push. only changed in the cloud: pull. both changed: merge, see merge().
   - gone here but unchanged in the cloud: delete it in the cloud (and the reverse). */
(function () {
  const C = { url: 'https://mzmdtlvmlspbumtecnwv.supabase.co', key: 'sb_publishable_izDSYPFp3JNvUxen-9dgtw_JF64ANP9' };
  window.CLOUD = C;
  const LS = localStorage, now = () => Date.now();
  const rdj = k => { try { return JSON.parse(LS.getItem(k)); } catch (e) { return null; } };
  const pfx = () => LS.getItem('mx.pfx') || 'mx.';
  const S = { state: 'idle', at: +(LS.getItem('mx.sync.at') || 0), err: '' };
  const emit = () => { try { window.dispatchEvent(new Event('mxsync')); } catch (e) {} };
  const tok = () => rdj('mx.cloud');
  let busy = false;

  /* hashing */
  function canon(v) {
    if (v === undefined) return 'null';
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  function hash(v) {
    const s = canon(v); let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + s.length;
  }

  /* network */
  async function fetchT(url, opt, ms) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 20000);
    try { return await fetch(url, Object.assign({}, opt, { signal: ctl.signal })); }
    catch (e) { const n = new Error('No connection'); n.net = true; throw n; }
    finally { clearTimeout(to); }
  }
  async function authCall(grant, body) {
    const r = await fetchT(C.url + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.msg || j.message || 'Login failed'); e.status = r.status; throw e; }
    return { access: j.access_token, refresh: j.refresh_token, exp: now() + Math.max(60, (j.expires_in || 3600) - 60) * 1000, uid: j.user && j.user.id };
  }
  async function login(u, p) {
    const user = String(u || '').trim().toLowerCase();
    const t = await authCall('password', { email: user + '@mx.app', password: p });
    t.user = user; LS.setItem('mx.cloud', JSON.stringify(t)); return t;
  }
  function logout() { LS.removeItem('mx.cloud'); S.state = 'idle'; }
  async function token() {
    const t = tok(); if (!t) throw new Error('Not signed in');
    if (now() < t.exp) return t;
    try { const n = await authCall('refresh_token', { refresh_token: t.refresh }); n.user = t.user; LS.setItem('mx.cloud', JSON.stringify(n)); return n; }
    catch (e) { if (e.status >= 400 && e.status < 500) { LS.removeItem('mx.cloud'); S.state = 'login'; emit(); } throw e; }
  }
  async function rest(method, path, body, extra) {
    const t = await token();
    const r = await fetchT(C.url + '/rest/v1/' + path, { method, headers: Object.assign({ apikey: C.key, Authorization: 'Bearer ' + t.access, 'Content-Type': 'application/json' }, extra || {}), body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} throw new Error(m || 'Server error ' + r.status); }
    const txt = await r.text();
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  }
  async function all(table, cols, ord) {
    const out = [];
    for (let a = 0; ; a += 1000) { const rows = await rest('GET', table + '?select=' + cols + '&order=' + ord + '&limit=1000&offset=' + a); out.push(...rows); if (rows.length < 1000) break; }
    return out;
  }

  /* local records */
  const KV = ['settings', 'myfoods', 'meas', 'notes', 'notelog', 'feedback'];
  function stripSettings(o) { const c = JSON.parse(JSON.stringify(o)); if (c.ai) delete c.ai.key; return c; }
  function local(P) {
    const g = (k, d) => { const v = rdj(P + k); return v == null ? d : v; };
    const R = {};
    g('sessions', []).forEach(s => { if (s && s.id) R['s:' + s.id] = s; });
    const daily = g('daily', {}), food = g('food', {});
    new Set([...Object.keys(daily), ...Object.keys(food)]).forEach(d => {
      const a = daily[d] && Object.keys(daily[d]).length ? daily[d] : null, f = food[d] && food[d].length ? food[d] : null;
      if (a || f) R['d:' + d] = { daily: a, food: f };
    });
    KV.forEach(k => { const v = rdj(P + k); if (v != null) R['k:' + k] = k === 'settings' ? stripSettings(v) : v; });
    return R;
  }

  /* merge when both sides changed since the last sync */
  function merge(k, L, R, B) {
    if (k[0] === 'd') {
      const f = new Map(); [...(R.food || []), ...(L.food || [])].forEach(e => f.set(e.id || JSON.stringify(e), e));
      const food = [...f.values()].sort((a, b) => (a.t || 0) - (b.t || 0)), daily = Object.assign({}, R.daily || {}, L.daily || {});
      return { daily: Object.keys(daily).length ? daily : null, food: food.length ? food : null };
    }
    if (k === 'k:feedback') { const m = new Map(); [...R, ...L].forEach(n => m.set(n.t + '|' + (n.sid || ''), n)); return [...m.values()].sort((a, b) => a.t - b.t); }
    if (k === 'k:notelog') { const m = new Map(); [...R, ...L].forEach(n => m.set(n.t + '|' + n.name, n)); return [...m.values()].sort((a, b) => a.t - b.t); }
    if (k === 'k:notes' || k === 'k:meas') return Object.assign({}, R, L);
    if (k === 'k:myfoods') { const m = new Map(); [...R, ...L].forEach(x => m.set(JSON.stringify(x), x)); return [...m.values()]; }
    return B === undefined ? R : L;   // sessions, settings: remote wins on a first sync, otherwise this phone wins
  }

  /* the sync */
  let running = false, again = false, timer = null;
  async function core() {
    const t = await token(), uid = t.uid, P = pfx();
    const [rs, rd, rk] = await Promise.all([all('sessions', 'id,data,deleted', 'id'), all('day_logs', 'day,daily,food', 'day'), all('kv', 'key,value', 'key')]);
    const RM = {};
    rs.forEach(r => { if (!r.deleted) RM['s:' + r.id] = r.data; });
    rd.forEach(r => { RM['d:' + r.day] = { daily: r.daily, food: r.food }; });
    rk.forEach(r => { RM['k:' + r.key] = r.value; });
    const base = rdj(P + 'sync') || {}, L = local(P), nb = {}, up = {}, del = [], app = {};
    const hasActive = !!LS.getItem(P + 'active');
    for (const k of new Set([...Object.keys(L), ...Object.keys(RM), ...Object.keys(base)])) {
      const l = L[k], r = RM[k], B = base[k], hl = l !== undefined ? hash(l) : null, hr = r !== undefined ? hash(r) : null;
      const pull = v => { if (hasActive) { if (B !== undefined) nb[k] = B; } else { app[k] = v; nb[k] = v === undefined ? undefined : hash(v); } };
      if (l !== undefined && r === undefined) {
        if (B !== undefined && hl === B) pull(undefined);       // deleted in the cloud, unchanged here
        else { up[k] = l; nb[k] = hl; }                          // new or changed here
      } else if (l === undefined && r !== undefined) {
        if (B !== undefined && hr === B) { del.push(k); }        // deleted here, unchanged in the cloud
        else pull(r);                                            // new in the cloud
      } else if (l !== undefined && r !== undefined) {
        if (hl === hr) nb[k] = hl;
        else if (hl === B) pull(r);
        else if (hr === B) { up[k] = l; nb[k] = hl; }
        else { const m = merge(k, l, r, B), hm = hash(m); if (hm !== hr) up[k] = m; if (hm !== hl) pull(m); else nb[k] = hm; }
      }
    }
    /* push */
    const iso = new Date().toISOString(), rows = { sessions: [], day_logs: [], kv: [] };
    Object.keys(up).forEach(k => {
      const v = up[k];
      if (k[0] === 's') rows.sessions.push({ user_id: uid, id: k.slice(2), finished_at: v.finishedAt ? new Date(v.finishedAt).toISOString() : null, data: v, deleted: false, updated_at: iso });
      else if (k[0] === 'd') rows.day_logs.push({ user_id: uid, day: k.slice(2), daily: v.daily, food: v.food, updated_at: iso });
      else rows.kv.push({ user_id: uid, key: k.slice(2), value: v, updated_at: iso });
    });
    const conf = { sessions: 'user_id,id', day_logs: 'user_id,day', kv: 'user_id,key' };
    for (const tb of Object.keys(rows)) for (let i = 0; i < rows[tb].length; i += 150) await rest('POST', tb + '?on_conflict=' + conf[tb], rows[tb].slice(i, i + 150), { Prefer: 'resolution=merge-duplicates,return=minimal' });
    const col = { s: ['sessions', 'id'], d: ['day_logs', 'day'], k: ['kv', 'key'] };
    for (const c of ['s', 'd', 'k']) {
      const ids = del.filter(k => k[0] === c).map(k => k.slice(2));
      for (let i = 0; i < ids.length; i += 100) await rest('DELETE', col[c][0] + '?' + col[c][1] + '=in.(' + ids.slice(i, i + 100).join(',') + ')', null, { Prefer: 'return=minimal' });
    }
    /* apply what came from the cloud, unless this phone changed it in the meantime */
    const keys = Object.keys(app);
    if (keys.length) {
      const now2 = local(P), ok = keys.filter(k => (now2[k] !== undefined ? hash(now2[k]) : null) === (L[k] !== undefined ? hash(L[k]) : null));
      keys.filter(k => !ok.includes(k)).forEach(k => { delete nb[k]; if (base[k] !== undefined) nb[k] = base[k]; });
      busy = true;
      try {
        const sk = ok.filter(k => k[0] === 's'), dk = ok.filter(k => k[0] === 'd');
        if (sk.length) {
          const m = new Map((rdj(P + 'sessions') || []).map(s => [s.id, s]));
          sk.forEach(k => { if (app[k] === undefined) m.delete(k.slice(2)); else m.set(k.slice(2), app[k]); });
          LS.setItem(P + 'sessions', JSON.stringify([...m.values()].sort((a, b) => (a.finishedAt || 0) - (b.finishedAt || 0))));
        }
        if (dk.length) {
          const daily = rdj(P + 'daily') || {}, food = rdj(P + 'food') || {};
          dk.forEach(k => { const d = k.slice(2), v = app[k]; if (v === undefined) { delete daily[d]; delete food[d]; } else { if (v.daily) daily[d] = v.daily; else delete daily[d]; if (v.food) food[d] = v.food; else delete food[d]; } });
          LS.setItem(P + 'daily', JSON.stringify(daily)); LS.setItem(P + 'food', JSON.stringify(food));
        }
        ok.filter(k => k[0] === 'k').forEach(k => {
          let v = app[k]; const name = k.slice(2);
          if (v === undefined) { LS.removeItem(P + name); return; }
          if (name === 'settings') { const cur = rdj(P + 'settings') || {}; v = JSON.parse(JSON.stringify(v)); v.ai = Object.assign({}, v.ai, { key: (cur.ai && cur.ai.key) || '' }); }
          LS.setItem(P + name, JSON.stringify(v));
        });
      } finally { busy = false; }
      if (ok.length) reloadSoon(0);
    }
    busy = true; try { LS.setItem(P + 'sync', JSON.stringify(Object.fromEntries(Object.entries(nb).filter(e => e[1] !== undefined)))); } finally { busy = false; }
  }
  function reloadSoon(n) {
    if (n > 20) return;
    setTimeout(() => {
      const ae = document.activeElement, typing = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName);
      if (LS.getItem(pfx() + 'active') || typing) return reloadSoon(n + 1);
      location.reload();
    }, n ? 3000 : 400);
  }
  async function run() {
    if (!tok()) return;
    if (!navigator.onLine) { S.state = 'offline'; emit(); return; }
    if (running) { again = true; return; }
    running = true; S.state = 'syncing'; S.err = ''; emit();
    try { await core(); S.state = 'ok'; S.at = now(); LS.setItem('mx.sync.at', String(S.at)); }
    catch (e) { S.state = e.net ? 'offline' : (S.state === 'login' ? 'login' : 'error'); S.err = e.message || 'error'; }
    running = false; emit();
    if (again) { again = false; kick(2000); }
  }
  function kick(ms) { clearTimeout(timer); timer = setTimeout(run, ms == null ? 4000 : ms); }

  /* run on every save of synced data */
  const WATCH = /^mx\.(?:[a-z0-9_-]+\.)?(sessions|daily|food|myfoods|settings|meas|notes|notelog|feedback)$/;
  const _set = Storage.prototype.setItem, _rem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) { _set.call(this, k, v); if (this === LS && !busy && WATCH.test(k) && tok()) kick(); };
  Storage.prototype.removeItem = function (k) { _rem.call(this, k); if (this === LS && !busy && WATCH.test(k) && tok()) kick(); };
  window.addEventListener('online', () => kick(1000));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tok() && now() - S.at > 60000) kick(500); });
  setInterval(() => { if (document.visibilityState === 'visible' && tok() && now() - S.at > 300000) kick(0); }, 60000);
  if (tok()) setTimeout(run, 1200);

  window.MXSYNC = {
    login, logout, has: () => !!tok(), user: () => (tok() || {}).user || '', now: () => run(),
    status: () => S,
    label() {
      const hm = S.at ? new Date(S.at).toTimeString().slice(0, 5) : '';
      return S.state === 'syncing' ? 'SYNCING' : S.state === 'ok' ? 'SYNCED ' + hm : S.state === 'offline' ? 'OFFLINE, WILL RETRY' : S.state === 'login' ? 'SIGN IN AGAIN' : S.state === 'error' ? 'ERROR: ' + S.err : (S.at ? 'SYNCED ' + hm : 'WAITING');
    }
  };
})();
