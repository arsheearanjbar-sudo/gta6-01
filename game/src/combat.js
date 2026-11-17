// NEON TIDE — combat, particles and rival gang members.
// Bullets, muzzle sparks, explosions, skid marks and the armed rivals
// who show up for the final mission.

import { rand } from './state.js';
import { hitsBuilding } from './city.js';
import { addDamage, addMessage } from './state.js';
import { knockDownPed } from './traffic.js';

export function fireBullet(G, x, y, angle, from, damage) {
  G.bullets.push({
    x, y,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.9,
    from, // player | cop | rival
    damage,
  });
  spawnParticles(G, x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, 3, '#ffd60a', 120, 0.12);
}

export function spawnParticles(G, x, y, n, color, speed, life) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(speed * 0.3, speed);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * rand(0.6, 1.2),
      maxLife: life,
      color,
      size: rand(2, 5),
    });
  }
  if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
}

export function spawnSkid(G, x, y, angle) {
  G.skid.push({ x, y, angle, life: 6 });
  if (G.skid.length > 220) G.skid.shift();
}

export function explodeCar(G, car) {
  spawnParticles(G, car.x, car.y, 34, '#ff7b00', 320, 0.7);
  spawnParticles(G, car.x, car.y, 20, '#ffd60a', 240, 0.5);
  spawnParticles(G, car.x, car.y, 14, '#6c757d', 90, 1.4);
  G.camera.shake = 1;
  G.audio.explosion();
}

function carHit(b, c) {
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const cos = Math.cos(-c.angle);
  const sin = Math.sin(-c.angle);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) < 25 && Math.abs(ly) < 14;
}

export function updateBullets(G, dt) {
  const P = G.player;
  for (const b of G.bullets) {
    if (b.life <= 0) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (hitsBuilding(G, b.x, b.y, 2)) {
      b.life = 0;
      spawnParticles(G, b.x, b.y, 4, '#ffb703', 90, 0.2);
      continue;
    }
    if (b.from === 'player') {
      let hit = false;
      for (const c of G.cars) {
        if (c.kind === 'player' || c.remove) continue;
        if (carHit(b, c)) {
          b.life = 0;
          hit = true;
          c.hp -= b.damage;
          spawnParticles(G, b.x, b.y, 6, '#ffb703', 140, 0.25);
          if (c.hp <= 0) {
            explodeCar(G, c);
            c.remove = true;
            if (c.kind === 'police') addMessage(G, 'Police car destroyed.');
          }
          break;
        }
      }
      if (hit) continue;
      for (const p of G.peds) {
        if (p.down > 0) continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) < 13) {
          b.life = 0;
          knockDownPed(G, p);
          spawnParticles(G, p.x, p.y, 8, '#d64545', 120, 0.4);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const r of G.rivals) {
        if (r.hp <= 0) continue;
        if (Math.hypot(b.x - r.x, b.y - r.y) < 14) {
          b.life = 0;
          r.hp -= b.damage;
          spawnParticles(G, r.x, r.y, 6, '#d64545', 120, 0.3);
          if (r.hp <= 0) {
            P.cash += 50;
            addMessage(G, 'Rival down — $50.');
            spawnParticles(G, r.x, r.y, 16, '#d64545', 160, 0.5);
          }
          break;
        }
      }
    } else {
      // Cop or rival bullet: only the player can be hit.
      if (P.inCar && P.car) {
        if (carHit(b, P.car)) {
          b.life = 0;
          addDamage(G, 3);
          spawnParticles(G, b.x, b.y, 5, '#ffb703', 120, 0.2);
        }
      } else if (Math.hypot(b.x - P.x, b.y - P.y) < 14) {
        b.life = 0;
        addDamage(G, b.damage);
        spawnParticles(G, P.x, P.y, 5, '#d64545', 120, 0.3);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  G.cars = G.cars.filter((c) => !c.remove);
  G.rivals = G.rivals.filter((r) => r.hp > 0);
}

export function updateRivals(G, dt) {
  const P = G.player;
  for (const r of G.rivals) {
    if (r.hp <= 0) continue;
    r.shootCd -= dt;
    const dx = P.x - r.x;
    const dy = P.y - r.y;
    const d = Math.hypot(dx, dy);
    r.angle = Math.atan2(dy, dx);
    if (d > 90 && d < 650) {
      const nx = r.x + (dx / d) * r.speed * dt;
      const ny = r.y + (dy / d) * r.speed * dt;
      if (!hitsBuilding(G, nx, ny, 10)) {
        r.x = nx;
        r.y = ny;
      }
    }
    // Run over by the player's car.
    if (P.inCar && P.car && Math.abs(P.car.speed) > 60 && Math.hypot(P.x - r.x, P.y - r.y) < 30) {
      r.hp = 0;
      P.cash += 50;
      addMessage(G, 'Rival down — $50.');
      spawnParticles(G, r.x, r.y, 16, '#d64545', 180, 0.5);
      continue;
    }
    if (d < 320 && r.shootCd <= 0) {
      r.shootCd = 1.3;
      const a = r.angle + rand(-0.1, 0.1);
      fireBullet(G, r.x, r.y, a, 'rival', 6);
      G.audio.enemyShot();
    }
  }
}

export function updateParticles(G, dt) {
  for (const p of G.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
    p.life -= dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const s of G.skid) s.life -= dt;
  G.skid = G.skid.filter((s) => s.life > 0);
}

export function drawBullets(ctx, G) {
  ctx.fillStyle = '#ffe66d';
  for (const b of G.bullets) {
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  }
}

export function drawParticles(ctx, G) {
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

export function drawSkid(ctx, G) {
  ctx.strokeStyle = 'rgba(20,20,20,0.4)';
  ctx.lineWidth = 4;
  for (const s of G.skid) {
    ctx.globalAlpha = Math.max(0, s.life / 6) * 0.7;
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 8, s.y - Math.sin(s.angle) * 8);
    ctx.lineTo(s.x + Math.cos(s.angle) * 8, s.y + Math.sin(s.angle) * 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawRivals(ctx, G) {
  for (const r of G.rivals) {
    if (r.hp <= 0) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7b2d26';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(Math.cos(r.angle) * 3, Math.sin(r.angle) * 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(r.angle) * 20, Math.sin(r.angle) * 20);
    ctx.stroke();
    // Health bar.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-12, -20, 24, 4);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(-12, -20, 24 * (r.hp / 50), 4);
    ctx.restore();
  }
}
