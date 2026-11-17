// NEON TIDE — the minimap in the top-right corner of the HUD.
// Roads, water, buildings, the mission marker, the player arrow,
// police in red and traffic in grey, all at a glance.

export function drawMinimap(ctx, G, x, y, w, h) {
  const sx = w / G.worldW;
  const sy = h / G.worldH;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  // Water: river at the top, sea at the bottom.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x, y, w, 96 * sy);
  ctx.fillRect(x, y + 2520 * sy, w, h - 2520 * sy);
  // Beach.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x, y + 2340 * sy, w, (2520 - 2340) * sy);

  // Roads.
  ctx.fillStyle = '#4a505c';
  for (const c of G.city.roadsV) ctx.fillRect(x + c * sx - 2, y, 4, h);
  for (const c of G.city.roadsH) ctx.fillRect(x, y + c * sy - 2, w, 4);

  // Buildings.
  ctx.fillStyle = '#d7dce4';
  for (const b of G.city.buildings) {
    ctx.fillRect(x + b.x * sx, y + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }

  // Traffic.
  ctx.fillStyle = '#c9c9c9';
  for (const c of G.cars) {
    if (c.kind === 'traffic' || c.kind === 'parked') {
      ctx.fillRect(x + c.x * sx - 1, y + c.y * sy - 1, 2, 2);
    }
  }

  // Mission marker, pulsing.
  const mk = G.mission.marker;
  if (mk) {
    const r = 4 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(x + mk.x * sx, y + mk.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Police in red.
  ctx.fillStyle = '#ff2e2e';
  for (const c of G.cars) {
    if (c.kind === 'police') {
      ctx.beginPath();
      ctx.arc(x + c.x * sx, y + c.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player arrow.
  const P = G.player;
  ctx.save();
  ctx.translate(x + P.x * sx, y + P.y * sy);
  ctx.rotate(P.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
