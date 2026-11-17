// NEON TIDE — the HUD and the menu / death / pause / complete screens.
// Health, cash, wanted stars, the mission objective, an off-screen
// objective arrow, the message feed, speed, controls and the minimap.

import { clamp } from './state.js';
import { drawMinimap } from './minimap.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,10,0.35)';
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
}

export function drawHUD(ctx, G) {
  if (G.state === 'menu') return;
  const vw = G.viewW;
  const vh = G.viewH;
  const P = G.player;

  // Top-left: title, health, cash, wanted stars.
  panel(ctx, 12, 12, 268, 92);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('NEON TIDE', 24, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('$' + P.cash, 200, 34);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  rr(ctx, 24, 46, 180, 12, 6);
  ctx.fill();
  ctx.fillStyle = P.hp > 40 ? '#06d6a0' : '#ef476f';
  if (P.hp > 0) {
    rr(ctx, 24, 46, 180 * (P.hp / 100), 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('HP ' + Math.ceil(P.hp), 212, 56);
  // Wanted stars.
  ctx.font = '20px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.3)';
    ctx.fillText(i < G.wanted ? '★' : '☆', 24 + i * 24, 92);
  }

  // Objective panel.
  if (G.mission.text) {
    const d = G.mission.marker ? Math.round(Math.hypot(P.x - G.mission.marker.x, P.y - G.mission.marker.y) / 10) : 0;
    panel(ctx, 12, 114, 380, 64);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(G.mission.name || 'NEON TIDE', 24, 136);
    if (G.mission.marker) {
      ctx.textAlign = 'right';
      ctx.fillText(d + ' m', 380, 136);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(G.mission.text, 24, 156);
  }

  // Minimap, top-right.
  drawMinimap(ctx, G, vw - 222, 12, 210, 150);

  // Off-screen objective arrow.
  const mk = G.mission.marker;
  if (mk) {
    const sx = vw / 2 + (mk.x - G.camera.x) * G.camera.zoom;
    const sy = vh / 2 + (mk.y - G.camera.y) * G.camera.zoom;
    if (sx < 40 || sx > vw - 40 || sy < 40 || sy > vh - 40) {
      const cx = clamp(sx, 60, vw - 60);
      const cy = clamp(sy, 60, vh - 60);
      const a = Math.atan2(sy - vh / 2, sx - vw / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Message feed, top-centre.
  ctx.textAlign = 'center';
  let my = 30;
  const now = G.time;
  for (let i = G.messages.length - 1; i >= 0; i--) {
    const m = G.messages[i];
    const age = now - m.t;
    if (age > 6) continue;
    ctx.globalAlpha = clamp(1 - (age - 4) / 2, 0, 1);
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(m.text, vw / 2, my);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(m.text, vw / 2, my);
    my += 22;
  }
  ctx.globalAlpha = 1;

  // Mission-complete banner.
  if (G.bannerText && now - G.bannerT < 3) {
    ctx.globalAlpha = clamp(1 - (now - G.bannerT - 2), 0, 1);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(G.bannerText, vw / 2, vh / 2 - 120);
    ctx.fillStyle = '#ffd60a';
    ctx.fillText(G.bannerText, vw / 2, vh / 2 - 120);
    ctx.globalAlpha = 1;
  }

  // Bottom-left: controls.
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const hint = P.inCar
    ? 'W/S drive · A/D steer · Space handbrake · E step out · P pause · M mute'
    : 'WASD move · Mouse aim · Click shoot · E enter car · Shift run · P pause · M mute';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(hint, 14, vh - 16);
  ctx.fillText(hint, 14, vh - 16);

  // Bottom-right: speed while driving.
  if (P.inCar && P.car) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const kmh = Math.round(Math.abs(P.car.speed) * 0.55);
    ctx.strokeText(kmh + ' km/h', vw - 16, vh - 16);
    ctx.fillText(kmh + ' km/h', vw - 16, vh - 16);
  }

  // Hurt flash.
  if (G.hurtFlash > 0) {
    ctx.fillStyle = 'rgba(255,30,30,' + (G.hurtFlash * 0.5) + ')';
    ctx.fillRect(0, 0, vw, vh);
  }
}

function overlay(ctx, G) {
  ctx.fillStyle = 'rgba(8,12,24,0.72)';
  ctx.fillRect(0, 0, G.viewW, G.viewH);
}

function titleBlock(ctx, G, title, sub) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(title, G.viewW / 2, G.viewH / 2 - 130);
  ctx.fillText(title, G.viewW / 2, G.viewH / 2 - 130);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(sub, G.viewW / 2, G.viewH / 2 - 96);
}

export function drawMenu(ctx, G) {
  overlay(ctx, G);
  titleBlock(ctx, G, 'NEON TIDE', 'An open-world crime story in Solara Bay');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'Kai is a courier driver with one bad night ahead of him.',
    'Steal cars, outrun the Solara Bay police, and finish three jobs',
    'for the crew that owns the neon on the strip.',
    '',
    'WASD move / drive · Mouse aim · Click shoot · E enter or steal a car',
    'Space handbrake · P pause · M mute · progress saves automatically',
  ];
  lines.forEach((line, i) => ctx.fillText(line, G.viewW / 2, G.viewH / 2 - 56 + i * 24));
  if (G.save && G.save.mission > 0) {
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(
      'Save found — Mission ' + (G.save.mission + 1) + ' · $' + G.save.cash,
      G.viewW / 2, G.viewH / 2 + 118,
    );
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  const blink = Math.sin(G.time * 4) > -0.2;
  if (blink) ctx.fillText('PRESS ENTER OR CLICK TO PLAY', G.viewW / 2, G.viewH / 2 + 152);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('An original game — its city, people, cars and story are invented, no real brands.', G.viewW / 2, G.viewH - 24);
}

export function drawDead(ctx, G) {
  overlay(ctx, G);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef476f';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText('WASTED', G.viewW / 2, G.viewH / 2 - 40);
  ctx.fillText('WASTED', G.viewW / 2, G.viewH / 2 - 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('You were taken down in Solara Bay.', G.viewW / 2, G.viewH / 2 + 4);
  ctx.fillText('Press R to get back on your feet — the hospital takes $100.', G.viewW / 2, G.viewH / 2 + 32);
}

export function drawPaused(ctx, G) {
  ctx.fillStyle = 'rgba(8,12,24,0.6)';
  ctx.fillRect(0, 0, G.viewW, G.viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', G.viewW / 2, G.viewH / 2);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('P to resume · M to mute', G.viewW / 2, G.viewH / 2 + 32);
}

export function drawComplete(ctx, G) {
  overlay(ctx, G);
  titleBlock(ctx, G, 'THE LAST RUN', 'Kai owns the night in Solara Bay');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Missions finished: ' + G.stats.missionsDone + '  ·  Cash: $' + G.player.cash + '  ·  Cars stolen: ' + G.stats.carsStolen, G.viewW / 2, G.viewH / 2 - 40);
  ctx.fillText('The city is yours now — cruise Solara Bay, chase the heat, or start over.', G.viewW / 2, G.viewH / 2 - 8);
  ctx.font = 'bold 18px system-ui, sans-serif';
  if (Math.sin(G.time * 4) > -0.2) ctx.fillText('PRESS ENTER TO KEEP CRUISING', G.viewW / 2, G.viewH / 2 + 40);
}
