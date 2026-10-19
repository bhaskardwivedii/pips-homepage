/* Pip the character: eyes, expressions, blinking, naps, tickles, the hero bubble and the narrator. */
(() => {
  'use strict';
  const P = window.PipSite;
  const { $, $$ } = P;
  const root = document.documentElement;
  const svg = $('#pip'), head = $('#pipHead'), pupils = [$('#pupilL'), $('#pupilR')];
  const bubble = $('#pipBubble');
  const EYE = [{ x: 92, y: 122 }, { x: 148, y: 122 }];
  const MAX = 8; // how far pupils roam, in SVG units

  /* ---------- speech bubble with typewriter ---------- */
  let typeT = null;
  P.say = (text, { type = true } = {}) => {
    clearInterval(typeT);
    if (!type || P.reduced()) { bubble.textContent = text; return; }
    let i = 0; bubble.textContent = '';
    typeT = setInterval(() => { bubble.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeT); }, 28);
  };

  /* ---------- expressions ---------- */
  const baseExpr = () => (root.dataset.mood === 'night' ? 'sleepy' : 'awake');
  let exprT = null, asleep = false;
  function setExpr(name, ms = 0) {
    clearTimeout(exprT);
    svg.dataset.expr = name;
    if (ms) exprT = setTimeout(() => { if (!asleep) svg.dataset.expr = baseExpr(); }, ms);
  }
  P.pipExpr = setExpr;
  P.on('mood', (m) => {
    if (asleep) return;
    setExpr(m === 'night' ? 'sleepy' : 'wow', m === 'night' ? 0 : 900);
    P.say(m === 'night' ? '*yaaawn* is it bedtime already? 🌙' : 'good morning!! ☀️ I\'m awake! mostly.');
    if (m === 'night') P.sfx.yawn();
  });
  setExpr(baseExpr());

  /* ---------- eyes and head follow the pointer (or finger) ---------- */
  let tx = 0, ty = 0, cx = 0, cy = 0, tilt = 0, ctilt = 0, raf = 0, lastMove = 0;
  function aim(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const scale = r.width / 240;
    const ex = r.left + 120 * scale, ey = r.top + 122 * scale;
    const dx = clientX - ex, dy = clientY - ey, dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist / (160 * scale + 60), 1);
    tx = (dx / dist) * MAX * k; ty = (dy / dist) * MAX * k;
    tilt = P.clamp(dx / innerWidth, -1, 1) * 9;
    lastMove = performance.now();
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; ctilt += (tilt - ctilt) * 0.12;
    const t = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
    pupils.forEach((p) => { p.style.transform = t; });
    head.style.transform = `rotate(${ctilt.toFixed(2)}deg)`;
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(tilt - ctilt) > 0.05) raf = requestAnimationFrame(step);
    else raf = 0;
  }
  addEventListener('pointermove', (e) => aim(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', (e) => aim(e.clientX, e.clientY), { passive: true });
  // Touch fallback: no hover on phones, so Pip looks around on his own between taps.
  setInterval(() => {
    if (performance.now() - lastMove < 3500 || asleep || document.hidden) return;
    const r = svg.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const a = Math.random() * Math.PI * 2;
    tx = Math.cos(a) * MAX * 0.8; ty = Math.sin(a) * MAX * 0.6; tilt = Math.cos(a) * 4;
    if (!raf) raf = requestAnimationFrame(step);
  }, 2200);

  /* ---------- blinking ---------- */
  (function blink() {
    setTimeout(() => {
      if (!asleep && svg.dataset.expr !== 'giggle') {
        svg.classList.add('blink'); setTimeout(() => svg.classList.remove('blink'), 130);
      }
      blink();
    }, P.rand(2400, 5600));
  })();

  /* ---------- boop / tickle (egg: 5 fast taps, or type "pip") ---------- */
  let taps = [];
  function tickle(fromKeyboard) {
    setExpr('giggle', 2600);
    P.sfx.giggle(); setTimeout(() => P.sfx.giggle(), 650);
    const r = svg.getBoundingClientRect();
    ['hehe!', 'hihi!', 'stop it!', 'hehehe', '🤭'].forEach((w, i) => setTimeout(() => P.floatWord(w, r.left + P.rand(0.15, 0.75) * r.width, r.top + P.rand(0.1, 0.5) * r.height), i * 160));
    P.say(fromKeyboard ? 'you typed my name!! hehehe 🤭' : 'HEHEHE that tickles!! 🤭');
    P.eggs.find('tickle');
  }
  svg.addEventListener('click', (e) => {
    if (e.target.closest('#capStar')) return;
    if (asleep) { wake(); return; }
    const now = performance.now();
    taps = taps.filter((t) => now - t < 1800); taps.push(now);
    if (taps.length >= 5) { taps = []; tickle(false); return; }
    setExpr('wow', 650);
    P.sfx.boop();
    P.fx.burst(e.clientX, e.clientY, 10, 3);
    P.say(P.pick(['boop! 👆', 'hi hi hi!', 'oh! hello!', 'tee-hee, that tickles!', 'again? again!']), { type: false });
  });
  P.on('typedpip', () => tickle(true));

  /* ---------- the shiny cap star (egg) ---------- */
  const star = $('#capStar');
  function starStruck(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (asleep) wake(true);
    setExpr('giggle', 2400);
    P.fx.confetti(160);
    P.sfx.chime();
    const first = P.eggs.find('star');
    P.say(first ? '✨ you found my lucky star! ✨' : 'still shiny! ✨', { type: false });
  }
  star.addEventListener('click', starStruck);
  star.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') starStruck(e); });

  /* ---------- naptime (egg): sit still and Pip falls asleep ---------- */
  const NAP_AFTER = 22000;
  let idleT = null;
  function fallAsleep() {
    if (document.hidden || (P.gamePlaying && P.gamePlaying())) { resetIdle(); return; }
    asleep = true; setExpr('asleep');
    P.say('zzz… zzz… 💤', { type: false });
    P.sfx.snore();
  }
  function wake(silent) {
    asleep = false; setExpr('wow', 1200);
    if (silent === true) return;
    P.say('huh?! I wasn\'t sleeping! I was… testing dreams. 😳');
    P.sfx.boop();
    P.eggs.find('nap');
  }
  function resetIdle() {
    clearTimeout(idleT);
    if (asleep) wake();
    idleT = setTimeout(fallAsleep, NAP_AFTER);
  }
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, resetIdle, { passive: true }));
  resetIdle();

  /* ---------- greeting + reacting to the rest of the site ---------- */
  setTimeout(() => P.say(P.visitor.greeting()), 700);
  P.on('resized', () => P.say(P.sizeLine()));
  P.on('chaos', (on) => { if (!asleep) { setExpr(on ? 'giggle' : 'awake', 1600); P.say(on ? 'WHEEE! CHAOS! 🌀' : 'okay okay… calm baby mode. 😌'); } });
  P.on('egg', ({ total }) => { if (total < 5) P.narrate('That\'s ' + total + ' of 5 secrets! Check the 🥚 for hints.'); });

  /* ---------- Golden nightcap: all eggs found ---------- */
  function goldify() { svg.classList.add('golden'); }
  if (P.eggs.count() === P.eggs.list.length) goldify();
  P.on('alleggs', () => {
    goldify();
    const cert = $('#certificate'); cert.hidden = false;
    P.fx.confetti(220); P.sfx.success();
    $('#certClose').focus();
  });
  $('#certClose').addEventListener('click', () => { $('#certificate').hidden = true; });

  /* =========================================================
     Secret Dream Room (egg): Konami code, or hold the footer moon
     ========================================================= */
  const room = $('#secretRoom');
  const SECRET = [[659.25, 0], [783.99, 0.4], [880, 0.8], [783.99, 1.2], [659.25, 1.6], [587.33, 2.2], [523.25, 2.6], [587.33, 3.0], [659.25, 3.4], [523.25, 4.2]];
  let lastFocus = null;
  function openRoom() {
    if (!room.hidden) return;
    lastFocus = document.activeElement;
    room.hidden = false;
    P.eggs.find('room');
    P.audio.ensure();
    SECRET.forEach(([f, w]) => P.audio.musicBox(f, w, 0.2));
    if (P.audio.isMuted()) P.toast('🔇 Psst, the secret lullaby is playing silently. Turn sound on to hear it.');
    P.fx.confetti(80);
    $('#secretClose').focus();
  }
  function closeRoom() { room.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#secretClose').addEventListener('click', closeRoom);
  room.addEventListener('click', (e) => { if (e.target === room) closeRoom(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!room.hidden) closeRoom();
    const cert = $('#certificate'); if (!cert.hidden) cert.hidden = true;
  });
  P.on('konami', openRoom);

  const moon = $('#footerMoon');
  let holdT = null;
  const startHold = (e) => { e.preventDefault(); moon.classList.add('holding'); holdT = setTimeout(() => { moon.classList.remove('holding'); openRoom(); }, 900); };
  const endHold = () => { clearTimeout(holdT); moon.classList.remove('holding'); };
  moon.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => moon.addEventListener(t, endHold));
  moon.addEventListener('contextmenu', (e) => e.preventDefault());
  moon.addEventListener('click', () => P.toast('🌙 the moon is sleepy. maybe… hold it gently?'));
  moon.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.shiftKey) openRoom(); });

  /* =========================================================
     Narrator Pip: the host follows you through every section
     ========================================================= */
  const narr = $('#narrator'), nb = $('#narrBubble'), npip = $('#narrPip');
  let nT = null;
  P.narrate = (text, ms = innerWidth < 600 ? 3800 : 5200) => {
    if (!narr.classList.contains('show')) return;
    nb.textContent = text; nb.classList.add('on');
    clearTimeout(nT); nT = setTimeout(() => nb.classList.remove('on'), ms);
  };
  const FACTS = [
    'Fun fact: I have never once been scared of the dark. The dark is scared of my nightlights.',
    'Fun fact: my nightcap has exactly 3 stars. One of them is a secret. 👀',
    'Fun fact: skulls are just faces that are extra good at smiling.',
    'Fun fact: I can nap in 0.4 seconds. World record.',
    'Try pressing N for night, M for sound, C for chaos!',
    'Did you sign my guestbook yet? 🥺'
  ];
  npip.addEventListener('click', () => { P.narrate(P.pick(FACTS)); P.sfx.boop(); });
  nb.addEventListener('click', () => { nb.classList.remove('on'); clearTimeout(nT); });

  const heroIO = new IntersectionObserver(([e]) => {
    narr.classList.toggle('show', !e.isIntersecting);
    if (e.isIntersecting) nb.classList.remove('on');
  }, { threshold: 0.15 });
  heroIO.observe($('#top'));

  const seen = new WeakMap();
  const lineIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = performance.now();
      if (seen.has(e.target) && t - seen.get(e.target) < 20000) return;
      seen.set(e.target, t);
      P.narrate(e.target.dataset.pipLine);
    });
  }, { rootMargin: '-38% 0px -42% 0px', threshold: 0 });
  $$('[data-pip-line]').forEach((el) => lineIO.observe(el));
})();
