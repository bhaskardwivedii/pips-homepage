/* Catch the Falling Dreams: a small canvas game (pointer, touch and keyboard). */
(() => {
  'use strict';
  const P = window.PipSite;
  P.safe('game', () => {
    const { $ } = P;
    const cv = $('#gameCanvas'), c = cv.getContext('2d'), wrap = $('#gameWrap');
    const overlay = $('#gameOverlay'), startBtn = $('#gameStart'), title = $('#goTitle'), sub = $('#goSub');
    const hudScore = $('#gScore'), hudTime = $('#gTime'), hudLives = $('#gLives'), bestEl = $('#gBest');
    const W = 360, H = 420, DUR = 30;
    let dpr = 1;
    function fit() { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); if (!state.on) drawScene(); }

    const state = { on: false, paused: false, score: 0, lives: 3, time: DUR, items: [], x: W / 2, tx: W / 2, keys: { l: false, r: false }, spawnT: 0, last: 0, combo: 0, shake: 0, raf: 0, blink: 0 };
    let best = P.store.get('gameBest', 0);
    bestEl.textContent = String(best);

    // background stars (static)
    const bg = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3, t: Math.random() * 6 }));

    function drawPip(x, y, hurt) {
      c.save(); c.translate(x, y);
      // cloud
      c.fillStyle = '#ffffff'; c.strokeStyle = '#5c4033'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(0, 26, 44, 12, 0, 0, 7); c.fill(); c.stroke();
      [[-24, 20, 13], [0, 16, 16], [24, 20, 13]].forEach(([cx, cy, r]) => { c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); });
      // head
      c.fillStyle = '#fdf6ea'; c.beginPath(); c.ellipse(0, -2, 24, 22, 0, 0, 7); c.fill(); c.stroke();
      // eyes
      c.fillStyle = '#3a2a2f';
      c.beginPath(); c.ellipse(-9, 0, 6.5, 7.5, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(9, 0, 6.5, 7.5, 0, 0, 7); c.fill();
      if (hurt) { c.strokeStyle = '#ffd27a'; c.lineWidth = 2; [-9, 9].forEach((ex) => { c.beginPath(); c.moveTo(ex - 4, -3); c.lineTo(ex + 4, 3); c.moveTo(ex + 4, -3); c.lineTo(ex - 4, 3); c.stroke(); }); }
      else { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(-9, 1, 2.2, 0, 7); c.fill(); c.beginPath(); c.arc(9, 1, 2.2, 0, 7); c.fill(); }
      c.strokeStyle = '#5c4033'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, 12); c.quadraticCurveTo(1, 16, 7, 11); c.stroke();
      // cap
      c.fillStyle = '#a34063'; c.strokeStyle = '#5c4033'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-25, -8); c.bezierCurveTo(-24, -34, 14, -40, 30, -18); c.bezierCurveTo(33, -12, 32, -4, 29, 0); c.bezierCurveTo(26, -10, 18, -14, 10, -15); c.bezierCurveTo(-4, -16, -16, -13, -25, -8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff8f1'; c.beginPath(); c.arc(29, 2, 5, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    function drawItem(it) {
      c.save(); c.translate(it.x, it.y); c.rotate(it.rot);
      c.font = it.size + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (it.kind !== 'clock') { c.shadowColor = it.kind === 'moon' ? '#fff4d6' : '#ffd27a'; c.shadowBlur = 14; }
      c.fillText(it.kind === 'star' ? '⭐' : it.kind === 'moon' ? '🌙' : '⏰', 0, 0);
      c.restore();
    }
    function drawScene(dt = 0) {
      c.clearRect(0, 0, W, H);
      c.save();
      if (state.shake > 0) c.translate(P.rand(-4, 4) * state.shake, P.rand(-4, 4) * state.shake);
      bg.forEach((s) => { s.t += dt * 0.05; c.globalAlpha = 0.4 + 0.4 * Math.sin(s.t); c.fillStyle = '#fff4d6'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); });
      c.globalAlpha = 1;
      // rooftops
      c.fillStyle = '#120e25';
      c.beginPath(); c.moveTo(0, H); c.lineTo(0, H - 40); c.lineTo(40, H - 64); c.lineTo(80, H - 40); c.lineTo(80, H - 54); c.lineTo(130, H - 86); c.lineTo(180, H - 54); c.lineTo(180, H - 36); c.lineTo(230, H - 70); c.lineTo(280, H - 36); c.lineTo(280, H - 50); c.lineTo(320, H - 76); c.lineTo(360, H - 50); c.lineTo(W, H); c.closePath(); c.fill();
      state.items.forEach(drawItem);
      drawPip(state.x, H - 70, state.blink > 0 && Math.floor(state.blink * 10) % 2 === 0);
      c.restore();
    }
    function hud() {
      hudScore.textContent = '★ ' + state.score;
      hudTime.textContent = '⏱ ' + Math.ceil(state.time);
      hudLives.textContent = '💖'.repeat(state.lives) + '🤍'.repeat(3 - state.lives);
    }
    function spawn() {
      const r = Math.random();
      const kind = r < 0.68 ? 'star' : r < 0.8 ? 'moon' : 'clock';
      const speed = (1.6 + (DUR - state.time) * 0.07) * (kind === 'moon' ? 1.25 : 1);
      state.items.push({ kind, x: P.rand(24, W - 24), y: -20, vy: speed * P.rand(0.85, 1.2), rot: 0, vr: P.rand(-0.04, 0.04), size: kind === 'moon' ? 30 : 28 });
    }
    function frame(now) {
      const dt = Math.min((now - state.last) / 16.67, 3); state.last = now;
      if (!state.on) return;
      if (state.paused) { state.raf = requestAnimationFrame(frame); return; }
      state.time -= dt / 60;
      if (state.keys.l) state.tx -= 7 * dt;
      if (state.keys.r) state.tx += 7 * dt;
      state.tx = P.clamp(state.tx, 30, W - 30);
      state.x += (state.tx - state.x) * Math.min(1, 0.3 * dt);
      state.spawnT -= dt;
      if (state.spawnT <= 0) { spawn(); state.spawnT = Math.max(14, 34 - (DUR - state.time) * 0.6); }
      const py = H - 78;
      for (let i = state.items.length - 1; i >= 0; i--) {
        const it = state.items[i];
        it.y += it.vy * dt; it.rot += it.vr * dt;
        if (Math.abs(it.x - state.x) < 36 && Math.abs(it.y - py) < 26) {
          state.items.splice(i, 1);
          if (it.kind === 'clock') {
            state.lives -= 1; state.combo = 0; state.shake = 1; state.blink = 1; P.sfx.bonk();
            if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* not allowed */ }
          } else {
            state.combo += 1; state.score += it.kind === 'moon' ? 5 : 1; P.sfx.catch(state.combo);
            const r = cv.getBoundingClientRect(), k = r.width / W;
            P.fx.burst(r.left + it.x * k, r.top + it.y * k, 8, 2.5);
          }
          continue;
        }
        if (it.y > H + 30) { state.items.splice(i, 1); if (it.kind !== 'clock') state.combo = 0; }
      }
      state.shake = Math.max(0, state.shake - 0.06 * dt); state.blink = Math.max(0, state.blink - 0.03 * dt);
      drawScene(dt); hud();
      if (state.lives <= 0 || state.time <= 0) return end();
      state.raf = requestAnimationFrame(frame);
    }
    function start() {
      P.audio.ensure();
      Object.assign(state, { on: true, paused: false, score: 0, lives: 3, time: DUR, items: [], x: W / 2, tx: W / 2, spawnT: 0, combo: 0, shake: 0, blink: 0, last: performance.now() });
      overlay.hidden = true;
      hud(); cv.focus({ preventScroll: true });
      cancelAnimationFrame(state.raf); state.raf = requestAnimationFrame(frame);
    }
    function end() {
      state.on = false;
      const isBest = state.score > best;
      if (isBest) { best = state.score; P.store.set('gameBest', best); bestEl.textContent = String(best); }
      title.textContent = state.lives <= 0 ? 'Too many alarm clocks! ⏰' : 'Time for bed! 🌙';
      sub.textContent = 'You caught ' + state.score + ' dream' + (state.score === 1 ? '' : 's') + (isBest ? '. New best! 🏆' : '.');
      startBtn.textContent = '↺ Play again';
      overlay.hidden = false;
      if (isBest && state.score > 0) { P.sfx.success(); P.narrate('New high score: ' + state.score + '! You\'re a natural Dream Engineer.'); }
      startBtn.focus({ preventScroll: true });
    }
    startBtn.addEventListener('click', start);
    P.gamePlaying = () => state.on && !state.paused;

    // pointer / touch steering
    function steer(e) { const r = cv.getBoundingClientRect(); state.tx = ((e.clientX - r.left) / r.width) * W; }
    wrap.addEventListener('pointerdown', (e) => { if (state.on) { steer(e); if (e.pointerType !== 'mouse') wrap.setPointerCapture(e.pointerId); } });
    wrap.addEventListener('pointermove', (e) => { if (state.on && (e.pointerType === 'mouse' || e.buttons)) steer(e); });
    // keyboard steering (only while playing, so the page still scrolls normally)
    cv.tabIndex = 0;
    const setKey = (e, v) => {
      if (!state.on) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { state.keys.l = v; e.preventDefault(); }
      if (k === 'arrowright' || k === 'd') { state.keys.r = v; e.preventDefault(); }
    };
    document.addEventListener('keydown', (e) => setKey(e, true));
    document.addEventListener('keyup', (e) => setKey(e, false));
    // pause when hidden or scrolled away
    document.addEventListener('visibilitychange', () => { state.paused = document.hidden; });
    new IntersectionObserver(([e]) => { state.paused = !e.isIntersecting; }, { threshold: 0.3 }).observe(wrap);

    fit(); addEventListener('resize', () => { if (!state.on) fit(); });
    drawScene();
  });
})();
