// NEON TIDE — the player, on foot and behind the wheel.
// On foot: WASD to run, mouse to aim, click to shoot, E to take a car.
// Driving: W/S for gas and brake, A/D to steer, Space for the handbrake,
// E to step out. Stealing a car and hurting bystanders raise the heat.

import { clamp } from './state.js';
import { addMessage, addDamage } from './state.js';
import { blockedForCar, blockedForFoot } from './city.js';
import { knockDownPed } from './traffic.js';
import { fireBullet, spawnParticles, spawnSkid } from './combat.js';
import { addWanted } from './police.js';

export function screenToWorld(G, sx, sy) {
  return {
    x: G.camera.x + (sx - G.viewW / 2) / G.camera.zoom,
    y: G.camera.y + (sy - G.viewH / 2) / G.camera.zoom,
  };
}

export function updatePlayer(G, dt) {
  const P = G.player;
  const inp = G.input;
  if (P.hp <= 0) return;
  P.fireCooldown -= dt;
  G.enterCd -= dt;

  const mw = screenToWorld(G, inp.mouseX, inp.mouseY);
  P.aimAngle = Math.atan2(mw.y - P.y, mw.x - P.x);

  if (P.inCar && P.car) updateDriving(G, dt);
  else updateOnFoot(G, dt);

  const targetZoom = P.inCar ? 0.82 : 1.0;
  G.camera.zoom += (targetZoom - G.camera.zoom) * Math.min(1, dt * 2);
  G.camera.x += (P.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (P.y - G.camera.y) * Math.min(1, dt * 5);
  G.camera.shake = Math.max(0, G.camera.shake - dt * 2);
}

function updateOnFoot(G, dt) {
  const P = G.player;
  const inp = G.input;
  let dx = 0;
  let dy = 0;
  if (inp.keys['KeyW'] || inp.keys['ArrowUp']) dy -= 1;
  if (inp.keys['KeyS'] || inp.keys['ArrowDown']) dy += 1;
  if (inp.keys['KeyA'] || inp.keys['ArrowLeft']) dx -= 1;
  if (inp.keys['KeyD'] || inp.keys['ArrowRight']) dx += 1;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    const sprint = inp.keys['ShiftLeft'] || inp.keys['ShiftRight'];
    const speed = sprint ? 260 : 175;
    const nx = P.x + (dx / len) * speed * dt;
    const ny = P.y + (dy / len) * speed * dt;
    if (!blockedForFoot(G, nx, P.y, 12)) P.x = nx;
    if (!blockedForFoot(G, P.x, ny, 12)) P.y = ny;
    P.angle = Math.atan2(dy, dx);
  }

  if (inp.keys['KeyE'] && G.enterCd <= 0) tryEnterCar(G);

  if (inp.mouseDown && P.fireCooldown <= 0) {
    P.fireCooldown = 0.16;
    fireBullet(G, P.x + Math.cos(P.aimAngle) * 18, P.y + Math.sin(P.aimAngle) * 18, P.aimAngle, 'player', 34);
    G.stats.shotsFired++;
    G.audio.shot();
    G.camera.shake = Math.max(G.camera.shake, 0.12);
  }
}

function tryEnterCar(G) {
  const P = G.player;
  let best = null;
  let bestD = 80;
  for (const c of G.cars) {
    if (c.kind !== 'parked' && c.kind !== 'traffic') continue;
    const d = Math.hypot(c.x - P.x, c.y - P.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return;
  const stolen = best.kind === 'traffic';
  best.kind = 'player';
  best.driver = 'player';
  best.maxSpeed = 430;
  P.car = best;
  P.inCar = true;
  P.x = best.x;
  P.y = best.y;
  G.enterCd = 0.5;
  G.audio.pickup();
  if (stolen) {
    G.stats.carsStolen++;
    addWanted(G, 1, 'You stole a car');
  } else {
    addMessage(G, 'You took the car.');
  }
}

function updateDriving(G, dt) {
  const P = G.player;
  const inp = G.input;
  const car = P.car;

  if (inp.keys['KeyW'] || inp.keys['ArrowUp']) car.speed += 300 * dt;
  if (inp.keys['KeyS'] || inp.keys['ArrowDown']) car.speed -= 380 * dt;
  if (inp.keys['Space']) car.speed *= Math.max(0, 1 - 3 * dt);
  car.speed -= car.speed * 0.35 * dt;
  car.speed = clamp(car.speed, -140, car.maxSpeed);

  let steer = 0;
  if (inp.keys['KeyA'] || inp.keys['ArrowLeft']) steer -= 1;
  if (inp.keys['KeyD'] || inp.keys['ArrowRight']) steer += 1;
  const steerPower = 2.4 * clamp(Math.abs(car.speed) / 120, 0, 1);
  car.angle += steer * steerPower * dt * Math.sign(car.speed || 1);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (blockedForCar(G, nx, ny, 18)) {
    if (Math.abs(car.speed) > 150) {
      G.audio.crash();
      G.camera.shake = 0.6;
      spawnParticles(G, car.x, car.y, 10, '#ffb703', 160, 0.3);
    }
    car.speed *= -0.3;
    if (!blockedForCar(G, nx, car.y, 18)) car.x = nx;
    else if (!blockedForCar(G, car.x, ny, 18)) car.y = ny;
  } else {
    car.x = nx;
    car.y = ny;
  }

  // Skid marks when steering hard at speed.
  if (steer !== 0 && Math.abs(car.speed) > 200) {
    spawnSkid(G, car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, car.angle);
  }

  // Bump into other cars.
  for (const other of G.cars) {
    if (other === car || other.remove) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const ux = (other.x - car.x) / d;
      const uy = (other.y - car.y) / d;
      other.x += ux * push;
      other.y += uy * push;
      car.x -= ux * push * 0.4;
      car.y -= uy * push * 0.4;
      if (Math.abs(car.speed) > 120) {
        G.audio.crash();
        G.camera.shake = Math.max(G.camera.shake, 0.4);
        other.hp -= 15;
        car.speed *= 0.7;
        if (other.kind === 'police' && other.hp <= 0) {
          other.remove = true;
          addMessage(G, 'Police car wrecked.');
        }
      }
    }
  }

  // Run over pedestrians.
  for (const p of G.peds) {
    if (p.down > 0) continue;
    if (Math.hypot(p.x - car.x, p.y - car.y) < 30 && Math.abs(car.speed) > 60) {
      knockDownPed(G, p);
      spawnParticles(G, p.x, p.y, 10, '#d64545', 160, 0.4);
      addWanted(G, 1, 'You ran over a pedestrian');
      G.audio.crash();
    }
  }

  P.x = car.x;
  P.y = car.y;
  P.angle = car.angle;

  if (inp.keys['KeyE'] && G.enterCd <= 0) {
    G.enterCd = 0.5;
    const side = car.angle + Math.PI / 2;
    P.x = car.x + Math.cos(side) * 36;
    P.y = car.y + Math.sin(side) * 36;
    if (blockedForFoot(G, P.x, P.y, 12)) {
      P.x = car.x - Math.cos(side) * 36;
      P.y = car.y - Math.sin(side) * 36;
    }
    car.kind = 'parked';
    car.driver = null;
    car.speed = 0;
    P.car = null;
    P.inCar = false;
    addMessage(G, 'You stepped out.');
  }
}

export function drawPlayer(ctx, G) {
  const P = G.player;
  if (P.inCar || P.hp <= 0) return;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gun.
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(P.aimAngle) * 22, Math.sin(P.aimAngle) * 22);
  ctx.stroke();
  // Body.
  ctx.fillStyle = '#118ab2';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(Math.cos(P.aimAngle) * 3, Math.sin(P.aimAngle) * 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
