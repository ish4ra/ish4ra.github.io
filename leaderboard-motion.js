'use strict';
(() => {
  const canvas = document.querySelector('#leaderboard-snake-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0, height = 0, dpr = 1, raf = 0, last = performance.now();
  let accent = '#c6f37b';
  const snakes = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function palette() {
    accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c6f37b';
  }

  function makeSnake(index = 0, visibleStart = false) {
    const compact = width < 700;
    const size = rand(compact ? 6 : 7.5, compact ? 8.5 : 11.5);
    const count = Math.round(rand(compact ? 8 : 10, compact ? 12 : 16));
    let x, y, angle;

    if (visibleStart) {
      if (index % 2 === 0) {
        x = width * rand(.08, .22);
        y = height * rand(.26, .52);
        angle = rand(-.2, .55);
      } else {
        x = width * rand(.78, .92);
        y = height * rand(.58, .82);
        angle = Math.PI + rand(-.45, .2);
      }
    } else {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = -40; y = rand(70, height - 70); angle = rand(-0.35, 0.35); }
      else if (side === 1) { x = width + 40; y = rand(70, height - 70); angle = Math.PI + rand(-0.35, 0.35); }
      else if (side === 2) { x = rand(70, width - 70); y = -40; angle = Math.PI / 2 + rand(-0.35, 0.35); }
      else { x = rand(70, width - 70); y = height + 40; angle = -Math.PI / 2 + rand(-0.35, 0.35); }
    }

    const segments = Array.from({length: count}, (_, i) => ({
      x: x - Math.cos(angle) * i * (size + 3),
      y: y - Math.sin(angle) * i * (size + 3)
    }));

    return {
      segments,
      angle,
      speed: rand(compact ? 30 : 38, compact ? 48 : 66),
      turn: rand(-0.4, 0.4),
      wobble: rand(0.45, 1.15),
      phase: rand(0, Math.PI * 2),
      size,
      alpha: rand(0.32, 0.5),
      headAlpha: rand(0.76, 0.96),
      index
    };
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wanted = width < 700 ? 2 : width < 1100 ? 3 : 4;
    while (snakes.length < wanted) {
      const index = snakes.length;
      snakes.push(makeSnake(index, index < 2));
    }
    while (snakes.length > wanted) snakes.pop();
  }

  function resetSnake(i) {
    snakes[i] = makeSnake(i, false);
  }

  function updateSnake(s, dt, now) {
    const head = s.segments[0];
    const edge = 85;
    const t = now * 0.001 * s.wobble + s.phase;
    s.angle += Math.sin(t) * 0.0025 + s.turn * dt * 0.03;

    if (head.x < edge) s.angle += (0 - s.angle) * dt * 0.025;
    if (head.x > width - edge) s.angle += (Math.PI - s.angle) * dt * 0.025;
    if (head.y < edge) s.angle += (Math.PI / 2 - s.angle) * dt * 0.025;
    if (head.y > height - edge) s.angle += (-Math.PI / 2 - s.angle) * dt * 0.025;

    head.x += Math.cos(s.angle) * s.speed * dt;
    head.y += Math.sin(s.angle) * s.speed * dt;

    const spacing = s.size + 3;
    for (let i = 1; i < s.segments.length; i++) {
      const prev = s.segments[i - 1], cur = s.segments[i];
      const dx = prev.x - cur.x, dy = prev.y - cur.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = (dist - spacing) / dist;
      cur.x += dx * pull;
      cur.y += dy * pull;
    }

    const margin = 120;
    if (head.x < -margin || head.x > width + margin || head.y < -margin || head.y > height + margin) {
      resetSnake(s.index);
    }
  }

  function tile(x, y, size, alpha, head = false) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = accent;
    if (head) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = size * 0.85;
    }
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - size / 2, y - size / 2, size, size, Math.min(3, size * .25));
    else ctx.rect(x - size / 2, y - size / 2, size, size);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawSnake(s) {
    for (let i = s.segments.length - 1; i >= 0; i--) {
      const p = s.segments[i];
      const fade = 1 - i / Math.max(1, s.segments.length - 1);
      tile(p.x, p.y, s.size, i === 0 ? s.headAlpha : s.alpha * (0.42 + fade * 0.58), i === 0);
    }
    const head = s.segments[0], neck = s.segments[1];
    if (!head || !neck) return;
    const dx = head.x - neck.x, dy = head.y - neck.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, eye = Math.max(1.2, s.size * .15);
    ctx.fillStyle = '#152014';
    ctx.globalAlpha = .9;
    for (const side of [-1, 1]) {
      const ex = head.x + ux * s.size * .2 - uy * side * s.size * .22;
      const ey = head.y + uy * s.size * .2 + ux * side * s.size * .22;
      ctx.fillRect(ex - eye / 2, ey - eye / 2, eye, eye);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    const dt = clamp((now - last) / 1000, 0, .04);
    last = now;
    ctx.clearRect(0, 0, width, height);
    if (!document.hidden) {
      snakes.forEach(s => updateSnake(s, dt, now));
      snakes.forEach(drawSnake);
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  palette();
  resize();
  start();
  addEventListener('resize', resize, {passive:true});
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
})();
