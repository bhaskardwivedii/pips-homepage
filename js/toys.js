/* Pip's projects: Lullaby Lab, Nightlights, Dream Delivery Routes, Storybook, Growth Chart, scroll story. */
(() => {
  'use strict';
  const P = window.PipSite;
  const { $, $$ } = P;

  /* =========================================================
     1. THE LULLABY LAB: Web Audio music box
     ========================================================= */
  P.safe('lullaby lab', () => {
    const NOTES = [
      { n: 'C', f: 523.25 }, { n: 'D', f: 587.33 }, { n: 'E', f: 659.25 }, { n: 'G', f: 783.99 },
      { n: 'A', f: 880.0 }, { n: 'C', f: 1046.5 }, { n: 'D', f: 1174.66 }, { n: 'E', f: 1318.51 }
    ];
    const keysEl = $('#keys'), fly = $('#notesFly'), box = $('#musicbox'), status = $('#labStatus');
    const playBtn = $('#lullabyBtn'), dreamBtn = $('#dreamTuneBtn');
    const keyBtns = NOTES.map((note, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'key';
      b.setAttribute('aria-label', 'Play note ' + note.n + (i > 4 ? ' high' : '') + ' (key ' + (i + 1) + ')');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#star5"/></svg><span aria-hidden="true">' + note.n + '</span>';
      b.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button === 0) hit(i, true); });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(i, true); } });
      keysEl.appendChild(b);
      return b;
    });
    function flash(i) {
      const b = keyBtns[i]; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 170);
      if (P.reduced()) return;
      const s = document.createElement('span');
      s.textContent = P.pick(['♪', '♫', '♩', '♬']);
      s.style.left = (10 + (i / 7) * 75) + '%';
      s.style.setProperty('--dx', P.rand(-30, 30) + 'px'); s.style.setProperty('--rot', P.rand(-30, 30) + 'deg');
      fly.appendChild(s); setTimeout(() => s.remove(), 1650);
    }
    function hit(i, byHand) {
      P.audio.ensure();
      P.audio.musicBox(NOTES[i].f, 0, 0.26);
      flash(i);
      if (byHand && P.audio.isMuted() && !hit.warned) { hit.warned = true; P.toast('🔇 Sound is off. Tap 🔇 in the top bar to hear the music box!'); }
    }
    // keyboard 1–8 plays notes while the lab is on screen
    let labVisible = false;
    new IntersectionObserver(([e]) => { labVisible = e.isIntersecting; }, { threshold: 0.2 }).observe($('#lab'));
    document.addEventListener('keydown', (e) => {
      if (!labVisible || P.isTyping(e) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 8) hit(n - 1, true);
    });

    // Pip's Lullaby (original), in 3/4: [note index, beats]
    const PIP_LULLABY = [[2, 1], [3, 1], [4, 1], [3, 2], [2, 1], [1, 1], [0, 2], [-1, 1], [1, 1], [2, 1], [3, 1], [2, 2], [1, 1], [0, 3],
      [2, 1], [3, 1], [5, 1], [4, 2], [3, 1], [2, 1], [3, 2], [-1, 1], [1, 1], [2, 1], [1, 1], [0, 3]];
    let timers = [], voices = [], playing = false;
    function stop(msg) {
      timers.forEach(clearTimeout); timers = []; playing = false;
      P.audio.kill(voices);
      box.classList.remove('playing');
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.textContent = '🗝️ Wind the key';
      status.textContent = msg || 'Now playing: nothing (it\'s too quiet!)';
    }
    function play(seq, title) {
      stop();
      P.audio.ensure();
      playing = true; box.classList.add('playing');
      playBtn.setAttribute('aria-pressed', 'true'); playBtn.textContent = '⏹ Stop';
      status.textContent = 'Now playing: ' + title + (P.audio.isMuted() ? ' (sound is off 🔇)' : '');
      const beat = 0.42; let t = 0;
      seq.forEach(([i, len]) => {
        if (i >= 0) {
          P.audio.musicBox(NOTES[i].f, t, 0.24, voices);
          if (i <= 2) P.audio.musicBox(NOTES[i].f / 2, t, 0.08, voices);
          timers.push(setTimeout(() => flash(i), t * 1000));
        }
        t += len * beat;
      });
      timers.push(setTimeout(() => { stop('Finished: ' + title + '. Did anyone fall asleep? 😴'); }, t * 1000 + 400));
    }
    playBtn.addEventListener('click', () => { if (playing) stop(); else play(PIP_LULLABY, '“Pip\'s Lullaby” (original, by Pip)'); });
    dreamBtn.addEventListener('click', () => {
      // generative: a gentle random walk over the pentatonic scale, always landing home
      const seq = []; let i = P.pick([0, 2, 4]);
      for (let k = 0; k < 15; k++) { seq.push([i, P.pick([1, 1, 1, 2])]); i = P.clamp(i + P.pick([-2, -1, -1, 1, 1, 2]), 0, 7); }
      seq.push([0, 3]);
      play(seq, 'a brand-new dream tune #' + ((Math.random() * 900 + 100) | 0));
    });
    P.on('mute', (m) => { if (m && playing) stop('Paused because sound was muted.'); });
    P.playLullaby = () => play(PIP_LULLABY, '“Pip\'s Lullaby” (original, by Pip)');
  });

  /* =========================================================
     2. NIGHTLIGHT COLLECTION: canvas nightlight cursor + lamps
     ========================================================= */
  P.safe('nightlights', () => {
    const room = $('#darkroom'), cv = $('#darkVeil'), c = cv.getContext('2d');
    const lamps = $$('.lamp', room), boo = $('#boo'), status = $('#lampStatus');
    let W = 0, H = 0, dpr = 1, lx = -999, ly = -999, active = false, lastInput = 0, visible = false, raf = 0, t0 = performance.now();
    const R = () => Math.max(90, Math.min(W, H) * 0.32);

    function fit() {
      const r = room.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function hole(x, y, r, a = 1) {
      const g = c.createRadialGradient(x, y, r * 0.25, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    function draw() {
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(8,5,22,0.92)'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out';
      const rr = room.getBoundingClientRect();
      lamps.forEach((l) => {
        if (l.getAttribute('aria-pressed') !== 'true') return;
        const b = l.getBoundingClientRect();
        hole(b.left - rr.left + b.width / 2, b.top - rr.top + b.height * 0.4, Math.max(b.width, b.height) * 0.95);
      });
      if (lx > -900) hole(lx, ly, R());
      c.globalCompositeOperation = 'source-over';
    }
    function loop(now) {
      raf = 0;
      if (!visible) return;
      if (now - lastInput > 2200) {
        // when nobody is steering, the nightlight drifts by itself
        const t = (now - t0) / 1000;
        lx = W * (0.5 + 0.38 * Math.sin(t * 0.55)); ly = H * (0.45 + 0.28 * Math.sin(t * 0.9 + 1));
      }
      draw();
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }
    function point(e) {
      const r = room.getBoundingClientRect();
      lx = e.clientX - r.left; ly = e.clientY - r.top; lastInput = performance.now(); active = true; kick();
    }
    room.addEventListener('pointermove', point, { passive: true });
    room.addEventListener('pointerdown', point, { passive: true });
    room.addEventListener('focusin', (e) => {
      const b = e.target.getBoundingClientRect(), r = room.getBoundingClientRect();
      lx = b.left - r.left + b.width / 2; ly = b.top - r.top + b.height / 2; lastInput = performance.now() + 4000; kick();
    });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { fit(); kick(); } }, { threshold: 0 }).observe(room);
    new ResizeObserver(fit).observe(room);

    function updateStatus() {
      const on = lamps.filter((l) => l.getAttribute('aria-pressed') === 'true').length;
      status.textContent = on + ' of ' + lamps.length + ' lamps glowing' + (on === lamps.length ? ', the whole nursery is cozy! ✨' : '');
      return on;
    }
    lamps.forEach((l, i) => {
      l.style.setProperty('--lamp', l.dataset.glow);
      l.addEventListener('click', () => {
        const on = l.getAttribute('aria-pressed') !== 'true';
        l.setAttribute('aria-pressed', String(on));
        if (on) { P.audio.musicBox([783.99, 880, 1046.5, 1174.66, 1318.51][i], 0, 0.2); const b = l.getBoundingClientRect(); P.fx.burst(b.left + b.width / 2, b.top + b.height / 3, 14, 3); }
        else P.sfx.boop();
        const n = updateStatus();
        if (on && n === lamps.length) { P.narrate('ALL the lamps! The nursery has never been this glowy. 🥹'); P.sfx.success(); }
        draw();
      });
    });
    $('#allLampsBtn').addEventListener('click', () => {
      lamps.forEach((l, i) => setTimeout(() => { if (l.getAttribute('aria-pressed') !== 'true') l.click(); }, i * 140));
    });
    boo.addEventListener('click', () => {
      boo.classList.remove('found'); void boo.offsetWidth; boo.classList.add('found');
      P.sfx.giggle();
      const first = P.eggs.find('boo');
      P.narrate(first ? '👻 You found Boo! He hides here because the lamps make him feel brave.' : 'Boo says hi again! 👻');
    });
    updateStatus();
  });

  /* =========================================================
     3. DREAM DELIVERY ROUTES: SVG path motion synced to scroll
     ========================================================= */
  P.safe('dream routes', () => {
    const map = $('#routeMap'), path = $('#routePath'), pip = $('#routePip'), count = $('#routeCount');
    const len = path.getTotalLength();
    path.style.strokeDasharray = len + ' ' + len;
    path.style.strokeDashoffset = String(len);
    // find how far along the path each house sits (closest point to its chimney)
    // sample the path once (cheap), then find how far along it each house sits
    let houses = null, visible = false;
    function measureHouses() {
      const pts = [];
      for (let s = 0; s <= len; s += 12) pts.push([s, path.getPointAtLength(s)]);
      houses = $$('#routeHouses g').map((g) => {
        const hx = +g.dataset.x, hy = +g.dataset.y; let best = 0, bd = Infinity;
        pts.forEach(([s, p]) => { const d = Math.hypot(p.x - hx, p.y - hy); if (d < bd) { bd = d; best = s; } });
        return { g, at: best / len, lit: false };
      });
    }
    let ticking = false, lastP = -1;
    function update() {
      ticking = false;
      if (!visible) return;
      if (!houses) measureHouses();
      const r = map.getBoundingClientRect(), vh = innerHeight;
      const p = P.clamp((vh * 0.9 - r.top) / (vh * 0.75 + r.height * 0.4), 0, 1);
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      path.style.strokeDashoffset = String(len * (1 - p));
      const d = Math.max(0.5, p * len);
      const a = path.getPointAtLength(d), b = path.getPointAtLength(Math.min(len, d + 3));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 57.3;
      pip.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + (ang * 0.35).toFixed(1) + ')');
      let n = 0;
      houses.forEach((h, i) => {
        const should = p >= h.at;
        if (should) n++;
        if (should !== h.lit) {
          h.lit = should; h.g.classList.toggle('lit', should);
          if (should) P.audio.musicBox([523.25, 659.25, 783.99, 880, 1046.5, 1318.51][i], 0, 0.1);
        }
      });
      count.textContent = String(n);
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) onScroll(); }, { rootMargin: '200px 0px' }).observe(map);
  });

  /* =========================================================
     4. BEDTIME STORYBOOK: page-turn flip, touch + keyboard
     ========================================================= */
  P.safe('storybook', () => {
    const book = $('#book-el'), pages = $$('.page', book), label = $('#bookPage');
    const prev = $('#bookPrev'), next = $('#bookNext');
    let cur = 0;
    pages.forEach((p, i) => { p.style.zIndex = String(pages.length - i); p.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'); });
    function go(n, sound = true) {
      n = P.clamp(n, 0, pages.length - 1);
      if (n === cur) return;
      cur = n;
      pages.forEach((p, i) => { p.classList.toggle('turned', i < cur); p.setAttribute('aria-hidden', String(i !== cur)); });
      label.textContent = cur === 0 ? 'Cover' : (cur === pages.length - 1 ? 'The End' : 'Page ' + cur + ' of ' + (pages.length - 2));
      prev.disabled = cur === 0;
      next.textContent = cur === pages.length - 1 ? '↺ Read again' : 'Turn ▶';
      if (sound) P.sfx.page();
      if (cur === pages.length - 1) P.narrate('The end! Did you like it? I drew everything myself. 🖍️');
    }
    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => { if (cur === pages.length - 1) { go(0); } else go(cur + 1); });
    book.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    let sx = null, sy = null;
    book.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    book.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next.click(); else go(cur - 1); }
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        const r = book.getBoundingClientRect();
        if (e.clientX > r.left + r.width / 2) next.click(); else go(cur - 1);
      }
    });
    book.addEventListener('pointercancel', () => { sx = null; });
    prev.disabled = true;
  });

  /* =========================================================
     5. GROWTH CHART: crayons grow when seen
     ========================================================= */
  P.safe('growth chart', () => {
    const chart = $('#growthChart');
    new IntersectionObserver(([e], ob) => {
      if (!e.isIntersecting) return;
      chart.classList.add('grown'); ob.disconnect();
      [0, 1, 2, 3, 4, 5].forEach((i) => setTimeout(() => P.audio.musicBox(523.25 * Math.pow(2, i * 2 / 12), 0, 0.08), i * 120));
    }, { threshold: 0.4 }).observe(chart);
  });

  /* =========================================================
     6. MY STORY: scroll-driven scenes on a sticky stage
     ========================================================= */
  P.safe('story', () => {
    const story = $('#story'), stage = $('#storyStage');
    const items = $$('#scenes li'), dots = $$('.story-dots button');
    const N = items.length;
    let cur = -1, ticking = false;
    function setScene(i) {
      if (i === cur) return;
      cur = i; stage.dataset.scene = String(i);
      items.forEach((li, k) => { li.classList.toggle('on', k === i); li.setAttribute('aria-hidden', String(k !== i)); });
      dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      if (i === 2) P.sfx.yawn();
      if (i === 1) P.audio.musicBox(659.25, 0, 0.12);
      if (i === 4) P.sfx.sparkle();
    }
    function progress() {
      const r = story.getBoundingClientRect();
      const total = r.height - innerHeight;
      return total > 0 ? P.clamp(-r.top / total, 0, 0.9999) : 0;
    }
    function update() { ticking = false; setScene(Math.floor(progress() * N)); }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    dots.forEach((d, k) => d.addEventListener('click', () => {
      const r = story.getBoundingClientRect();
      const total = r.height - innerHeight;
      const y = scrollY + r.top + total * ((k + 0.5) / N);
      scrollTo({ top: y, behavior: P.reduced() ? 'auto' : 'smooth' });
    }));
    setScene(0); update();
  });
})();
