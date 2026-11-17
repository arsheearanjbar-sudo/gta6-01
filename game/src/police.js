// NEON TIDE — the wanted level and the police who respond to it.
// Crimes raise the heat; police spawn on nearby roads, chase the player,
// ram cars, shoot at a player on foot, and lose the trail when the
// player stays clean and out of sight for a while.

import { clamp, angleDiff, rand } from './state.js';
import { addMessage, addDamage } from './state.js';
import { ROADS_V, ROADS_H, blockedForCar } from './city.js';
import { makeCar } from './traffic.js';
import { fireBullet } from './combat.js';

export function addWanted(G, n, reason) {
  G.wanted = clamp(G.wanted + n, 0, 5);
  G.crimeTimer = 0;
  if (reason) addMessage(G, reason + ' — wanted level ' + G.wanted + '.');
}

export function updatePolice(G, dt) {
  const P = G.player;
  if (G.wanted > 0) {
    G.crimeTimer += dt;
    let nearest = 1e9;
    for (const c of G.cars) {
      if (c.kind === 'police') nearest = Math.min(nearest, Math.hypot(c.x - P.x, c.y - P.y));
    }
    if (G.crimeTimer > 18 && nearest > 700) {
      G.wantedTick += dt;
      if (G.wantedTick > 6) {
        G.wanted--;
        G.wantedTick = 0;
        if (G.wanted === 0) addMessage(G, 'You lost them. The heat is off.');
      }
    }
  } else {
    G.wantedTick = 0;
  }

  const want = G.wanted > 0 ? Math.min(G.wanted + (G.wanted >= 4 ? 1 : 0), 5) : 0;
  let count = 0;
  for (const c of G.cars) if (c.kind === 'police') count++;
  if (count < want) spawnPolice(G);

  for (const c of G.cars) {
    if (c.kind !== 'police') continue;
    c.siren += dt;
    const dx = P.x - c.x;
    const dy = P.y - c.y;
    const d = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);
    const diff = angleDiff(c.angle, desired);
    c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const target = d > 120 ? 380 : 240;
    c.speed += (target - c.speed) * Math.min(1, dt * 1.2);
    let nx = c.x + Math.cos(c.angle) * c.speed * dt;
    let ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (blockedForCar(G, nx, ny, 20)) {
      c.angle += 3.6 * dt;
      c.speed *= 0.6;
      nx = c.x;
      ny = c.y;
    }
    c.x = nx;
    c.y = ny;

    c.shootCd -= dt;
    c.ramCd = (c.ramCd || 0) - dt;
    if (d < 46 && c.ramCd <= 0) {
      c.ramCd = 0.8;
      if (P.inCar && P.car) {
        P.car.speed *= 0.55;
        addDamage(G, 4);
        G.camera.shake = 0.5;
        G.audio.crash();
        c.speed *= 0.4;
      } else {
        addDamage(G, 12);
      }
    }

    if (!P.inCar && d < 340 && d > 60 && G.wanted >= 2 && c.shootCd <= 0) {
      c.shootCd = 1.1;
      const a = Math.atan2(P.y - c.y, P.x - c.x) + rand(-0.12, 0.12);
      fireBullet(G, c.x, c.y, a, 'cop', 6);
      G.audio.enemyShot();
    }

    if (G.wanted === 0 && d > 1600) c.remove = true;
  }
  G.cars = G.cars.filter((c) => !c.remove);
}

export function spawnPolice(G) {
  return spawnPoliceAt(G);
}

export function spawnPoliceAt(G) {
  const P = G.player;
  let x = P.x;
  let y = P.y;
  let tries = 0;
  do {
    const a = rand(0, Math.PI * 2);
    x = P.x + Math.cos(a) * 850;
    y = P.y + Math.sin(a) * 850;
    let bv = ROADS_V[0];
    let bd = 1e9;
    for (const r of ROADS_V) {
      if (Math.abs(r - x) < bd) { bd = Math.abs(r - x); bv = r; }
    }
    let bh = ROADS_H[0];
    let bd2 = 1e9;
    for (const r of ROADS_H) {
      if (Math.abs(r - y) < bd2) { bd2 = Math.abs(r - y); bh = r; }
    }
    if (bd < bd2) x = bv;
    else y = bh;
    x = clamp(x, 150, G.worldW - 150);
    y = clamp(y, 150, 2250);
    tries++;
  } while (tries < 8 && blockedForCar(G, x, y, 20));
  const car = makeCar(G, x, y, Math.atan2(P.y - y, P.x - x), 'police', '#f8f9fa');
  car.speed = 200;
  G.cars.push(car);
  return car;
}
