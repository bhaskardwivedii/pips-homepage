/* Live guestbook + hit counter odometer. Uses Supabase when js/config.js is filled in,
   otherwise stays fully working in this browser only (and says so honestly). */
(() => {
  'use strict';
  const P = window.PipSite;
  const { $ } = P;
  const cfg = window.PIP_CONFIG || {};
  const ONLINE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const BASE = ONLINE ? cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' : '';

  async function sb(path, opts = {}) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(BASE + path, {
        ...opts, signal: ctl.signal,
        headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json', ...(opts.headers || {}) }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(t); }
  }

  /* =========================================================
     HIT COUNTER ODOMETER
     ========================================================= */
  P.safe('odometer', () => {
    const odo = $('#odometer'), label = $('#counterLabel'), srText = $('#odoText');
    const DIGITS = 6;
    function build() {
      odo.querySelectorAll('.odo-d').forEach((d) => d.remove());
      for (let i = 0; i < DIGITS; i++) {
        const d = document.createElement('span'); d.className = 'odo-d'; d.setAttribute('aria-hidden', 'true');
        const s = document.createElement('span'); s.className = 'odo-strip';
        for (let n = 0; n <= 9; n++) { const x = document.createElement('span'); x.textContent = String(n); s.appendChild(x); }
        d.appendChild(s); odo.appendChild(d);
      }
    }
    function show(n) {
      const str = String(Math.max(0, n | 0)).padStart(DIGITS, '0').slice(-DIGITS);
      srText.textContent = String(n);
      odo.querySelectorAll('.odo-strip').forEach((s, i) => { s.style.transform = 'translateY(' + (-1.3 * +str[i]) + 'em)'; });
    }
    build(); show(0);
    const roll = (n) => { if (P.reduced()) { show(n); return; } setTimeout(() => show(n), 400); };

    async function run() {
      if (ONLINE) {
        try {
          let n;
          if (!P.session.get('bumped')) {
            n = await sb('rpc/bump_visits', { method: 'POST', body: '{}' });
            P.session.set('bumped', '1');
          } else {
            const rows = await sb('counters?key=eq.visits&select=value');
            n = rows && rows[0] ? rows[0].value : 0;
          }
          label.textContent = 'You are visitor no.';
          roll(Number(n) || 0);
          return;
        } catch (e) { console.warn('[pip] counter offline, using this browser only:', e.message); }
      }
      label.textContent = 'Your visits to Pip:';
      roll(P.visitor.data.visits);
    }
    run();
  });

  /* =========================================================
     LIVE GUESTBOOK
     ========================================================= */
  P.safe('guestbook', () => {
    const form = $('#gbForm'), nameIn = $('#gbName'), msgIn = $('#gbMsg'), chars = $('#gbChars');
    const list = $('#gbList'), mode = $('#gbMode'), status = $('#gbStatus'), submit = $('#gbSubmit');
    const RESIDENTS = [
      { name: 'Boo (little ghost)', message: 'pip sang to me and i slept for 9 whole hours!! 👻💤', sticker: '👻', resident: true },
      { name: 'The Moon', message: 'Finally got some rest thanks to that tiny nightlight. 10/10 would nap again.', sticker: '🌙', resident: true },
      { name: 'Night Nanny', message: 'So proud of you, Pip. Now please stop eating the crayons.', sticker: '🧸', resident: true }
    ];
    let usingServer = ONLINE;
    if (P.visitor.data.name) nameIn.value = P.visitor.data.name;
    P.on('name', (n) => { if (!nameIn.value.trim()) nameIn.value = n; });

    const fmt = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    function entryEl(e) {
      const li = document.createElement('li'); li.className = 'gb-entry';
      const stk = document.createElement('span'); stk.className = 'stk'; stk.setAttribute('aria-hidden', 'true'); stk.textContent = e.sticker || '🌙';
      const meta = document.createElement('div'); meta.className = 'meta';
      const b = document.createElement('b'); b.textContent = e.name;
      meta.appendChild(b);
      if (e.resident) { const r = document.createElement('span'); r.className = 'res'; r.textContent = 'nursery resident'; meta.appendChild(r); }
      else { const d = document.createElement('span'); d.textContent = fmt(e.created_at); meta.appendChild(d); }
      const p = document.createElement('p'); p.textContent = e.message;
      li.append(stk, meta, p);
      return li;
    }
    function render(entries) {
      list.textContent = '';
      entries.forEach((e) => list.appendChild(entryEl(e)));
      RESIDENTS.forEach((e) => list.appendChild(entryEl(e)));
    }
    function setMode() {
      mode.textContent = usingServer
        ? '🟢 Live guestbook: every visitor sees these wishes.'
        : '🏠 Guestbook in cozy local mode: your wishes are saved in this browser.';
    }
    const local = () => { const v = P.store.get('guestbook', []); return Array.isArray(v) ? v : []; };

    async function load() {
      setMode();
      if (usingServer) {
        try {
          const rows = await sb('guestbook?select=name,message,sticker,created_at&order=created_at.desc&limit=40');
          render(rows || []); return;
        } catch (e) { console.warn('[pip] guestbook offline, using this browser only:', e.message); usingServer = false; setMode(); }
      }
      render(local());
    }

    msgIn.addEventListener('input', () => { chars.textContent = msgIn.value.length + '/140'; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.website.value) return; // bot trap
      const name = nameIn.value.trim().replace(/\s+/g, ' ').slice(0, 24);
      const message = msgIn.value.trim().replace(/\s+/g, ' ').slice(0, 140);
      const sticker = (form.querySelector('input[name="sticker"]:checked') || {}).value || '🌙';
      if (!name) { status.textContent = 'Pip needs to know your name! ✏️'; nameIn.focus(); return; }
      if (message.length < 2) { status.textContent = 'Write a little dream wish first! 🌙'; msgIn.focus(); return; }
      const lastPost = P.store.get('gbLast', 0);
      if (Date.now() - lastPost < 20000) { status.textContent = 'Shh, Pip is still reading your last wish. Try again in a few seconds. 💤'; return; }
      submit.disabled = true; status.textContent = 'Pip is writing it down in crayon…';
      const entry = { name, message, sticker, created_at: new Date().toISOString() };
      try {
        if (usingServer) await sb('guestbook', { method: 'POST', body: JSON.stringify({ name, message, sticker }), headers: { Prefer: 'return=minimal' } });
        else { const arr = local(); arr.unshift(entry); P.store.set('guestbook', arr.slice(0, 50)); }
        P.store.set('gbLast', Date.now());
        P.visitor.setName(name);
        list.insertBefore(entryEl(entry), list.firstChild);
        msgIn.value = ''; chars.textContent = '0/140';
        status.textContent = 'Signed! Pip will build your dream tonight. ✨';
        P.sfx.success();
        const r = submit.getBoundingClientRect(); P.fx.burst(r.left + r.width / 2, r.top, 30, 5);
        P.narrate('Thank you, ' + name + '! I\'ll build that dream tonight. 🛠️🌙');
      } catch (err) {
        status.textContent = 'Oops, the guestbook fell asleep. Please try again in a moment. 😴';
      } finally { submit.disabled = false; }
    });
    load();
  });
})();
