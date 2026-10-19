/* Core: helpers, storage, events, sound engine, effects, eggs, mood, chaos, sizes, memory. */
(() => {
  'use strict';
  const P = (window.PipSite = window.PipSite || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  P.$ = $; P.$$ = $$;
  P.reduced = () => rmq.matches;
  P.rand = (a, b) => a + Math.random() * (b - a);
  P.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  P.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- storage that never throws (private mode, blocked storage) ---------- */
  P.store = {
    get(k, d) { try { const v = localStorage.getItem('pip:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pip:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  P.session = {
    get(k) { try { return sessionStorage.getItem('pip:' + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem('pip:' + k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- tiny event bus ---------- */
  const bus = new EventTarget();
  P.on = (t, fn) => bus.addEventListener(t, (e) => fn(e.detail));
  P.emit = (t, d) => bus.dispatchEvent(new CustomEvent(t, { detail: d }));

  /* Run a feature so that one failure can never break the rest of the page. */
  P.safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[pip] ' + name + ' was skipped:', e); } };

  P.isTyping = (e) => {
    const t = e.target;
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
  };

  /* =========================================================
     SOUND: everything is synthesized with the Web Audio API.
     The AudioContext is only created inside a user gesture, so
     browsers never log autoplay warnings.
     ========================================================= */
  P.audio = (() => {
    let ctx = null, master = null, wet = null, noiseBuf = null;
    let muted = !!P.store.get('muted', false);
    const VOL = 0.7;

    function create() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      // soft nursery reverb from a generated impulse
      const conv = ctx.createConvolver();
      const len = (ctx.sampleRate * 2.2) | 0, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      conv.buffer = ir;
      wet = ctx.createGain(); wet.gain.value = 0.32;
      wet.connect(conv); conv.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function unlock() {
      if (muted) return;
      const c = create();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    }
    ['pointerdown', 'keydown', 'touchend'].forEach((t) => addEventListener(t, unlock, { capture: true, passive: true }));

    const live = () => !!ctx && !muted;
    function tone({ freq, type = 'sine', when = 0, dur = 0.3, vol = 0.2, attack = 0.006, glide = null, reverb = true, sink = null }) {
      if (!live()) return;
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); if (reverb) g.connect(wet);
      o.start(t); o.stop(t + dur + 0.05);
      if (sink) sink.push({ o, g });
    }
    // Hard-stop a set of still-scheduled notes right now (used by Stop buttons,
    // so a long sequence doesn't keep sounding after the UI says it stopped).
    function kill(sink) {
      if (!ctx || !sink || !sink.length) return;
      const now = ctx.currentTime;
      sink.forEach(({ o, g }) => {
        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          o.stop(now + 0.08);
        } catch (e) { /* already stopped */ }
      });
      sink.length = 0;
    }
    function noise({ when = 0, dur = 0.06, vol = 0.12, freq = 3500, q = 1.2, sweep = null }) {
      if (!live()) return;
      const t = ctx.currentTime + when;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.05);
    }
    function musicBox(freq, when = 0, vol = 0.22, sink = null) {
      tone({ freq, when, dur: 1.8, vol, sink });
      tone({ freq: freq * 2, when, dur: 0.7, vol: vol * 0.32, sink });
      tone({ freq: freq * 4.01, when, dur: 0.18, vol: vol * 0.14, type: 'triangle', sink });
    }
    const sfx = {
      click() { tone({ freq: 1500, type: 'triangle', dur: 0.05, vol: 0.06, reverb: false }); },
      pop() { tone({ freq: 480, glide: 980, dur: 0.12, vol: 0.14 }); },
      boop() { tone({ freq: 660, glide: 440, dur: 0.16, vol: 0.14 }); },
      chime() { [0, 0.09, 0.18, 0.3].forEach((w, i) => musicBox([659.25, 783.99, 1046.5, 1318.5][i], w, 0.15)); },
      sparkle() { musicBox(P.pick([1568, 1760, 2093, 2349]), 0, 0.08); },
      giggle() { for (let i = 0; i < 7; i++) tone({ freq: P.rand(720, 980), glide: P.rand(1000, 1300), type: 'triangle', when: i * 0.085, dur: 0.07, vol: 0.1 }); },
      rattle() { for (let i = 0; i < 5; i++) noise({ when: i * 0.045, dur: 0.035, freq: 4200 + i * 300, vol: 0.12 }); },
      bonk() { tone({ freq: 240, glide: 110, type: 'square', dur: 0.18, vol: 0.06, reverb: false }); noise({ dur: 0.08, freq: 900, vol: 0.08 }); },
      whoosh() { noise({ dur: 0.45, freq: 400, sweep: 2600, q: 0.8, vol: 0.1 }); },
      page() { noise({ dur: 0.25, freq: 2500, sweep: 900, q: 0.6, vol: 0.09 }); },
      yawn() { tone({ freq: 440, glide: 200, dur: 1.1, vol: 0.08, attack: 0.2 }); },
      snore() { noise({ dur: 0.9, freq: 220, sweep: 160, q: 2, vol: 0.06 }); tone({ freq: 90, glide: 70, dur: 0.9, vol: 0.04, attack: 0.3, type: 'triangle' }); },
      success() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => musicBox(f, i * 0.08, 0.14)); },
      catch(n) { musicBox(523.25 * Math.pow(2, (Math.min(n, 12) * 2) / 12), 0, 0.14); }
    };
    function setMuted(m) {
      muted = !!m; P.store.set('muted', muted);
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.04);
        if (!muted && ctx.state === 'suspended') ctx.resume().catch(() => {});
      }
      P.emit('mute', muted);
    }
    return { sfx, tone, musicBox, kill, setMuted, isMuted: () => muted, live, time: () => (ctx ? ctx.currentTime : 0), ensure: unlock };
  })();
  P.sfx = P.audio.sfx;

  /* ---------- toasts ---------- */
  const toastBox = $('#toasts');
  P.toast = (msg, kind = '') => {
    if (!toastBox) return;
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el.textContent = msg;
    toastBox.appendChild(el);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, kind === 'egg' ? 4200 : 2800);
  };

  /* =========================================================
     FX canvas: sparkle cursor trail (stars, dreamy bones, bubbles) + confetti
     The loop only runs while particles are alive.
     ========================================================= */
  P.fx = (() => {
    const cv = $('#fx'); const c = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [], running = false, last = 0, lx = -99, ly = -99;
    function fit() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    let sized = false;
    addEventListener('resize', () => { if (sized) fit(); });
    const palettes = { day: ['#ff9ec0', '#ffc94d', '#8fc8ff', '#c39cff', '#a34063'], night: ['#ffe29a', '#fff4d6', '#ffb3cf', '#b7d9ff'], chaos: ['#ff6fa5', '#ffc94d', '#57d18a', '#5aa9ff', '#a77bff'] };
    const palette = () => palettes[root.dataset.chaos === 'on' ? 'chaos' : (root.dataset.mood === 'night' ? 'night' : 'day')];
    function star(x, y, s) { c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.38 : s; const a = (i * Math.PI) / 4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
    function bone(x, y, s, rot) {
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = '#fdf6ea'; c.strokeStyle = '#5c4033'; c.lineWidth = 1.2;
      const k = s * 0.45; c.beginPath(); c.roundRect ? c.roundRect(-s, -k * 0.45, s * 2, k * 0.9, k * 0.4) : c.rect(-s, -k * 0.45, s * 2, k * 0.9); c.fill(); c.stroke();
      [[-s, -k * 0.45], [-s, k * 0.45], [s, -k * 0.45], [s, k * 0.45]].forEach(([bx, by]) => { c.beginPath(); c.arc(bx, by, k * 0.55, 0, 7); c.fill(); c.stroke(); });
      c.restore();
    }
    function spawn(x, y, opts = {}) {
      const pal = palette();
      parts.push({
        x, y, vx: opts.vx ?? P.rand(-0.8, 0.8), vy: opts.vy ?? P.rand(-0.4, 0.9), g: opts.g ?? 0.02,
        life: 1, decay: opts.decay ?? P.rand(0.016, 0.03), s: opts.s ?? P.rand(3, 7), rot: P.rand(0, 6), vr: P.rand(-0.1, 0.1),
        kind: opts.kind || (root.dataset.chaos === 'on' && Math.random() < 0.35 ? 'bone' : (root.dataset.mood === 'day' && Math.random() < 0.3 ? 'bubble' : 'star')),
        col: opts.col || P.pick(pal)
      });
      if (parts.length > 260) parts.splice(0, parts.length - 260);
      if (!sized) { sized = true; fit(); }
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }
    function loop(now) {
      const dt = Math.min((now - last) / 16.67, 3); last = now;
      c.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
        c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        if (p.kind === 'bone') bone(p.x, p.y, p.s * 1.3, p.rot);
        else if (p.kind === 'bubble') { c.strokeStyle = p.col; c.lineWidth = 1.6; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.stroke(); }
        else if (p.kind === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9); c.restore(); }
        else { c.fillStyle = p.col; star(p.x, p.y, p.s); }
      }
      c.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(loop); else { running = false; c.clearRect(0, 0, W, H); }
    }
    addEventListener('pointermove', (e) => {
      if (P.reduced()) return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < 9) return;
      lx = e.clientX; ly = e.clientY;
      spawn(e.clientX, e.clientY);
      if (d > 30) spawn(e.clientX + P.rand(-6, 6), e.clientY + P.rand(-6, 6));
    }, { passive: true });
    function burst(x, y, n = 24, spread = 4) { if (P.reduced()) return; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = P.rand(1, spread); spawn(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.06, decay: P.rand(0.012, 0.022), s: P.rand(4, 8) }); } }
    function confetti(n = 140) {
      if (P.reduced()) return;
      const cols = ['#ffc94d', '#ff9ec0', '#a34063', '#8fc8ff', '#c39cff', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const fromLeft = i % 2 === 0;
        spawn(fromLeft ? -10 : W + 10, H * P.rand(0.35, 0.7), { kind: Math.random() < 0.7 ? 'confetti' : 'star', vx: (fromLeft ? 1 : -1) * P.rand(4, 11), vy: P.rand(-13, -5), g: 0.22, decay: P.rand(0.005, 0.009), s: P.rand(4, 7), col: P.pick(cols) });
      }
    }
    return { burst, confetti, spawn };
  })();

  /* Floating words ("hehe!") */
  P.floatWord = (text, x, y) => {
    const el = document.createElement('span');
    el.className = 'float-word'; el.textContent = text; el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--rot', P.rand(-20, 20) + 'deg');
    document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
  };

  /* =========================================================
     EASTER EGGS: five secrets, tracked and remembered
     ========================================================= */
  const EGGS = [
    { id: 'star', icon: '⭐', name: 'Star-struck', hint: 'Something on Pip\'s nightcap is extra shiny.' },
    { id: 'tickle', icon: '🤭', name: 'Tickle monster', hint: 'Tap Pip five times fast (or type p-i-p).' },
    { id: 'boo', icon: '👻', name: 'Hide and Boo', hint: 'Someone small hides in the Nightlight room.' },
    { id: 'nap', icon: '😴', name: 'Shh, naptime', hint: 'Sit very, very still for a little while…' },
    { id: 'room', icon: '🗝️', name: 'Secret Dream Room', hint: '↑↑↓↓←→←→BA, or hold the moon in the footer.' }
  ];
  P.eggs = (() => {
    let found = P.store.get('eggs', []);
    if (!Array.isArray(found)) found = [];
    const btn = $('#eggBtn'), count = $('#eggCount'), panel = $('#eggPanel'), list = $('#eggList');
    function render() {
      count.textContent = found.length + '/' + EGGS.length;
      btn.setAttribute('aria-label', 'Easter eggs found ' + found.length + '/' + EGGS.length);
      list.textContent = '';
      EGGS.forEach((e) => {
        const got = found.includes(e.id);
        const li = document.createElement('li'); li.className = got ? 'got' : '';
        const ic = document.createElement('span'); ic.className = 'e-ico'; ic.textContent = got ? e.icon : '🥚';
        const tx = document.createElement('div');
        const b = document.createElement('b'); b.textContent = got ? e.name : '???';
        const sm = document.createElement('small'); sm.textContent = got ? 'Found!' : 'Hint: ' + e.hint;
        tx.append(b, sm); li.append(ic, tx); list.appendChild(li);
      });
      if (found.length === EGGS.length) root.classList.add('all-eggs');
    }
    function find(id) {
      const egg = EGGS.find((e) => e.id === id);
      if (!egg || found.includes(id)) return false;
      found.push(id); P.store.set('eggs', found); render();
      btn.classList.remove('found'); void btn.offsetWidth; btn.classList.add('found');
      P.toast('🥚 Easter egg found! ' + egg.icon + ' ' + egg.name + ' (' + found.length + '/' + EGGS.length + ')', 'egg');
      P.sfx.success();
      P.emit('egg', { id, total: found.length });
      if (found.length === EGGS.length) setTimeout(() => P.emit('alleggs'), 1200);
      return true;
    }
    function openPanel(open) {
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) $('#eggClose').focus();
    }
    btn.addEventListener('click', () => openPanel(panel.hidden));
    $('#eggClose').addEventListener('click', () => { openPanel(false); btn.focus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { openPanel(false); btn.focus(); } });
    document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) openPanel(false); });
    render();
    return { find, has: (id) => found.includes(id), count: () => found.length, list: EGGS, nextHint: () => { const e = EGGS.find((x) => !found.includes(x.id)); return e ? e.hint : null; } };
  })();

  /* =========================================================
     DAY / NIGHT MOOD
     ========================================================= */
  const moodBtn = $('#moodBtn'), themeMeta = $('meta[name="theme-color"]');
  P.setMood = (m, { announce = false, save = false } = {}) => {
    root.dataset.mood = m;
    const night = m === 'night';
    moodBtn.querySelector('.ico').textContent = night ? '☀️' : '🌙';
    moodBtn.querySelector('.lbl').textContent = night ? 'Day' : 'Night';
    moodBtn.setAttribute('aria-label', night ? 'Switch to day' : 'Switch to night');
    moodBtn.setAttribute('aria-pressed', String(night));
    themeMeta.content = night ? '#17122b' : '#fff8f1';
    if (save) P.store.set('mood', m);
    P.emit('mood', m);
    if (announce) P.toast(night ? '🌙 Lights down. Pip is getting sleepy…' : '☀️ Good morning! Pip is wide awake.');
  };
  P.toggleMood = () => { P.setMood(root.dataset.mood === 'night' ? 'day' : 'night', { announce: true, save: true }); P.sfx.whoosh(); };
  moodBtn.addEventListener('click', P.toggleMood);

  /* =========================================================
     SOUND TOGGLE (required, always visible)
     ========================================================= */
  const muteBtn = $('#muteBtn');
  function renderMute(m) {
    muteBtn.querySelector('.ico').textContent = m ? '🔇' : '🔊';
    muteBtn.querySelector('.lbl').textContent = m ? 'Muted' : 'Sound on';
    muteBtn.setAttribute('aria-label', m ? 'Sound is off. Turn sound on' : 'Sound is on. Mute all sounds');
    muteBtn.setAttribute('aria-pressed', String(m));
  }
  P.toggleMute = () => {
    const m = !P.audio.isMuted();
    P.audio.setMuted(m);
    if (!m) { P.audio.ensure(); P.sfx.chime(); }
    P.toast(m ? '🔇 Shh. All sounds off.' : '🔊 Sound on! Everything you poke makes a noise.');
  };
  muteBtn.addEventListener('click', P.toggleMute);
  P.on('mute', renderMute);
  renderMute(P.audio.isMuted());

  /* soft click on every button and link (the click-sounds side quest) */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, .qr, label');
    if (!el || el.closest('#muteBtn, .key, #pip, #capStar, .lamp, #boo')) return;
    P.sfx.click();
  });

  /* =========================================================
     RESPONSIVE CHAOS MODE: names your screen and reshapes the nursery
     ========================================================= */
  const SIZES = [
    { max: 420, id: 'pocket', name: 'Pocket 🧸', line: 'Ooh, pocket-sized! Let me squish in.' },
    { max: 720, id: 'crib', name: 'Crib 🍼', line: 'Crib-sized. Cozy. I approve.' },
    { max: 1080, id: 'playpen', name: 'Playpen 🧩', line: 'Playpen-sized! Room to wobble.' },
    { max: 1500, id: 'nursery', name: 'Nursery 🌙', line: 'Nursery-sized. Just right.' },
    { max: Infinity, id: 'whole-house', name: 'Whole House 🏠', line: 'WHOLE HOUSE size?! I can stretch!' }
  ];
  const sizeName = $('#sizeName'), sizeChip = $('#sizeChip');
  let sizeId = null;
  function measure() {
    const w = innerWidth, s = SIZES.find((x) => w <= x.max);
    if (s.id === sizeId) return;
    const first = sizeId === null;
    sizeId = s.id; root.dataset.size = s.id;
    sizeName.textContent = s.name;
    sizeChip.title = 'Your screen is ' + s.name.replace(/[^\w ]/g, '').trim() + ' sized (' + w + 'px). Try resizing!';
    if (!first) {
      sizeChip.classList.remove('wiggle'); void sizeChip.offsetWidth; sizeChip.classList.add('wiggle');
      P.emit('resized', s);
    }
    $$('.work-grid > .project').forEach((el, i) => el.style.setProperty('--i', String(i)));
  }
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(measure, 120); });
  measure();
  P.sizeLine = () => SIZES.find((x) => x.id === sizeId).line;

  const chaosBtn = $('#chaosBtn');
  P.setChaos = (on) => {
    if (on) root.dataset.chaos = 'on'; else delete root.dataset.chaos;
    chaosBtn.setAttribute('aria-pressed', String(on));
    chaosBtn.setAttribute('aria-label', on ? 'Turn chaos mode off' : 'Turn chaos mode on');
    $('#marqueeTrack').querySelectorAll('span').forEach((s) => {
      s.textContent = on
        ? '★ CHAOS MODE ★ Everything is wobbly ★ Click anywhere for stickers ★ Drag the windows around ★ Resize your screen, I dare you ★ Pip is VERY awake now ★'
        : '★ Welcome to Pip\'s Homepage ★ Now with 100% more lullabies ★ Best viewed at bedtime ★ Under construction since last night ★ Sign my guestbook!! ★ No monsters allowed (except friendly ones) ★';
    });
    if (!on) $$('.win').forEach((w) => { w.style.translate = ''; });
    P.emit('chaos', on);
  };
  chaosBtn.addEventListener('click', () => {
    const on = root.dataset.chaos !== 'on';
    P.setChaos(on);
    P.sfx[on ? 'rattle' : 'boop']();
    if (on) { P.fx.confetti(60); P.toast('🌀 CHAOS MODE! Click anywhere, drag windows, resize your screen!'); }
    else P.toast('😌 Calm again. Phew.');
  });
  // chaos: click anywhere to drop a sticker
  document.addEventListener('pointerdown', (e) => {
    if (root.dataset.chaos !== 'on' || e.target.closest('button, a, input, textarea, label, .win-bar, canvas, #pip, .book')) return;
    const s = document.createElement('span');
    s.className = 'sticker-drop'; s.setAttribute('aria-hidden', 'true');
    s.textContent = P.pick(['⭐', '🌙', '💀', '🍼', '🧸', '☁️', '✨', '🦴', '💤', '🎀']);
    s.style.left = (e.pageX - 16) + 'px'; s.style.top = (e.pageY - 20) + 'px'; s.style.rotate = P.rand(-30, 30) + 'deg';
    document.body.appendChild(s); setTimeout(() => s.remove(), 4100);
    P.sfx.pop();
  });
  // chaos: drag windows by their title bars (mouse/pen only; touch keeps scrolling)
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (root.dataset.chaos !== 'on' || e.pointerType === 'touch') return;
    const bar = e.target.closest('.win-bar'); if (!bar || e.target.closest('button')) return;
    const win = bar.closest('.win');
    const cur = (win.style.translate || '0px 0px').split(' ').map(parseFloat);
    drag = { win, sx: e.clientX, sy: e.clientY, ox: cur[0] || 0, oy: cur[1] || 0, id: e.pointerId };
    win.classList.add('dragging'); bar.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.win.style.translate = (drag.ox + e.clientX - drag.sx) + 'px ' + (drag.oy + e.clientY - drag.sy) + 'px';
  });
  const endDrag = () => { if (drag) { drag.win.classList.remove('dragging'); drag = null; } };
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

  /* =========================================================
     KEYBOARD SHORTCUTS + KONAMI CODE
     ========================================================= */
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kpos = 0, typed = '';
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || P.isTyping(e)) return;
    const k = e.key.toLowerCase();
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) { kpos = 0; P.emit('konami'); return; }
    typed = (typed + k).slice(-3);
    if (typed === 'pip') { typed = ''; P.emit('typedpip'); }
    if (e.repeat) return;
    if (k === 'm') P.toggleMute();
    else if (k === 'n') P.toggleMood();
    else if (k === 'c') chaosBtn.click();
  });

  /* =========================================================
     VISITOR MEMORY (Tier 3): Pip remembers you
     ========================================================= */
  P.visitor = (() => {
    const v = P.store.get('visitor', { visits: 0, first: Date.now(), last: 0, name: '' });
    const prevLast = v.last;
    if (!P.session.get('counted')) { v.visits += 1; P.session.set('counted', '1'); }
    v.last = Date.now();
    P.store.set('visitor', v);
    function setName(n) { v.name = String(n).slice(0, 24); P.store.set('visitor', v); P.emit('name', v.name); }
    function greeting() {
      const h = new Date().getHours();
      const nm = v.name ? ', ' + v.name : '';
      if (v.visits <= 1) return h >= 22 || h < 5 ? '*yawn* you\'re up late! hi, I\'m Pip! 🌙' : 'oh! a new friend! hi, I\'m Pip! 👋';
      const days = prevLast ? Math.floor((Date.now() - prevLast) / 864e5) : 0;
      if (days >= 2) return 'you came back' + nm + '! it\'s been ' + days + ' sleeps! 🥹';
      return 'welcome back' + nm + '! visit #' + v.visits + '. I saved you a dream. 💛';
    }
    return { data: v, setName, greeting };
  })();

  /* Pause CSS animations in parts of the page that are off screen (saves battery + CPU). */
  P.safe('animation pausing', () => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('zz-off', !e.isIntersecting)), { rootMargin: '120px 0px' });
    $$('.marquee, .hero, #about, .project, .story-stage, #chat, #guestbook, .footer').forEach((el) => io.observe(el));
  });

  /* Webring */
  $$('.ring-btn').forEach((b) => b.addEventListener('click', () => {
    const ids = ['about', 'work', 'story', 'chat', 'guestbook'];
    const el = document.getElementById(P.pick(ids));
    P.toast('🕸️ The Midnight Nursery Webring only has one site so far. It\'s mine! Hehe.');
    el.scrollIntoView({ behavior: P.reduced() ? 'auto' : 'smooth' });
  }));
})();
