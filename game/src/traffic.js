// NEON TIDE — traffic cars, parked cars and pedestrians.
// Traffic follows the road grid in right-hand lanes and turns at
// intersections; pedestrians stroll the sidewalks. Cars are drawn here
// too, including the player's car and police cars.

import { clamp, rand, choice } from './state.js';
import { ROADS_V, ROADS_H, ROAD_W, hitsBuilding, laneOffset } from './city.js';

const CAR_COLORS = [
  '#d64545', '#3f6fb5', '#e8b93c', '#7fb069', '#c77dff',
  '#e07a5f', '#4cc9f0', '#f4f1de', '#90be6d', '#f3722c',
];
const PED_COLORS = [
  '#e63946', '#f1fa8c', '#a8dadc', '#457b9d',
  '#ffbe0b', '#fb8500', '#8338ec', '#06d6a0',
];

export function makeCar(G, x, y, angle, kind, color) {
  return {
    x, y, angle,
    speed: 0,
    maxSpeed: kind === 'police' ? 400 : 300,
    cruise: rand(60, 110),
    color: color || choice(CAR_COLORS),
    kind, // traffic | parked | police | player
    hp: kind === 'police' ? 60 : 100,
    driver: kind === 'traffic' ? 'ai' : null,
    axis: 'x',
    dir: 1,
    road: 0,
    lane: 24,
    turnCd: 0,
    shootCd: 0,
    siren: 0,
    special: null,
    remove: false,
  };
}

export function spawnTraffic(G) {
  for (let i = 0; i < 16; i++) {
    const vertical = Math.random() < 0.5;
    let car;
    if (vertical) {
      const road = choice(ROADS_V);
      const dir = Math.random() < 0.5 ? 1 : -1;
      car = makeCar(G, road + laneOffset('y', dir), rand(150, 2250), dir > 0 ? Math.PI / 2 : -Math.PI / 2, 'traffic');
      car.axis = 'y';
      car.dir = dir;
      car.road = road;
      car.lane = laneOffset('y', dir);
      car.speed = car.cruise;
    } else {
      const road = choice(ROADS_H);
      const dir = Math.random() < 0.5 ? 1 : -1;
      car = makeCar(G, rand(150, 3450), road + laneOffset('x', dir), dir > 0 ? 0 : Math.PI, 'traffic');
      car.axis = 'x';
      car.dir = dir;
      car.road = road;
      car.lane = laneOffset('x', dir);
      car.speed = car.cruise;
    }
    G.cars.push(car);
  }
  for (let i = 0; i < 10; i++) {
    const vertical = Math.random() < 0.5;
    let car = null;
    // Parked cars sit at the curb, inside the asphalt: offset 36 from the
    // road centre keeps them clear of the block edge (62) so they can
    // always pull out. Road and lane are set so traffic brakes behind them.
    for (let tries = 0; tries < 6 && !car; tries++) {
      let cand;
      if (vertical) {
        const road = choice(ROADS_V);
        cand = makeCar(G, road + ROAD_W / 2 - 12, rand(200, 2200), Math.PI / 2, 'parked');
        cand.axis = 'y';
        cand.road = road;
        cand.lane = ROAD_W / 2 - 12;
      } else {
        const road = choice(ROADS_H);
        cand = makeCar(G, rand(200, 3400), road + ROAD_W / 2 - 12, 0, 'parked');
        cand.axis = 'x';
        cand.road = road;
        cand.lane = ROAD_W / 2 - 12;
      }
      if (!hitsBuilding(G, cand.x, cand.y, 26)) car = cand;
    }
    if (car) G.cars.push(car);
  }
}

export function spawnPedestrians(G) {
  for (let i = 0; i < 26; i++) G.peds.push(makePed(G));
}

function makePed(G) {
  const p = {
    x: rand(200, 3400),
    y: rand(200, 2250),
    tx: 0,
    ty: 0,
    angle: 0,
    speed: rand(28, 55),
    color: choice(PED_COLORS),
    down: 0,
    downT: 0,
  };
  pickPedTarget(G, p);
  return p;
}

function pickPedTarget(G, p) {
  const vertical = Math.random() < 0.5;
  if (vertical) {
    const road = choice(ROADS_V);
    p.tx = road + (Math.random() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14);
    p.ty = rand(150, 2280);
  } else {
    const road = choice(ROADS_H);
    p.tx = rand(150, 3450);
    p.ty = road + (Math.random() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14);
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic') continue;
    car.turnCd -= dt;
    // Brake for a car ahead in the same lane.
    let target = car.cruise;
    for (const other of G.cars) {
      if (other === car || other.kind === 'parked') continue;
      if (other.axis !== car.axis || other.dir !== car.dir) continue;
      if (Math.abs(other.road + other.lane - (car.road + car.lane)) > 30) continue;
      const ahead = car.axis === 'y'
        ? (other.y - car.y) * car.dir
        : (other.x - car.x) * car.dir;
      if (ahead > 0 && ahead < 85) { target = 0; break; }
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
    if (car.axis === 'y') {
      car.y += car.dir * car.speed * dt;
      car.x = car.road + car.lane;
      if (car.y < 130 || car.y > 2290) {
        car.dir *= -1;
        car.lane = laneOffset('y', car.dir);
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (car.turnCd <= 0) {
        for (const h of ROADS_H) {
          if (Math.abs(car.y - h) < 26 && Math.random() < 0.3) {
            car.axis = 'x';
            car.road = h;
            car.dir = Math.random() < 0.5 ? 1 : -1;
            car.lane = laneOffset('x', car.dir);
            car.angle = car.dir > 0 ? 0 : Math.PI;
            car.turnCd = 2;
            break;
          }
        }
      }
    } else {
      car.x += car.dir * car.speed * dt;
      car.y = car.road + car.lane;
      if (car.x < 130 || car.x > 3470) {
        car.dir *= -1;
        car.lane = laneOffset('x', car.dir);
        car.angle = car.dir > 0 ? 0 : Math.PI;
      }
      if (car.turnCd <= 0) {
        for (const v of ROADS_V) {
          if (Math.abs(car.x - v) < 26 && Math.random() < 0.3) {
            car.axis = 'y';
            car.road = v;
            car.dir = Math.random() < 0.5 ? 1 : -1;
            car.lane = laneOffset('y', car.dir);
            car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.turnCd = 2;
            break;
          }
        }
      }
    }
  }
}

export function updatePeds(G, dt) {
  for (const p of G.peds) {
    if (p.down > 0) {
      p.downT += dt;
      if (p.downT > 5) Object.assign(p, makePed(G));
      continue;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      pickPedTarget(G, p);
      continue;
    }
    const nx = p.x + (dx / d) * p.speed * dt;
    const ny = p.y + (dy / d) * p.speed * dt;
    if (hitsBuilding(G, nx, ny, 10)) {
      pickPedTarget(G, p);
      continue;
    }
    p.x = nx;
    p.y = ny;
    p.angle = Math.atan2(dy, dx);
  }
}

// A pedestrian is knocked down (shot or run over). Callers add wanted level.
export function knockDownPed(G, p) {
  if (p.down > 0) return;
  p.down = 1;
  p.downT = 0;
}

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x + 4, car.y + 5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 13, car.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Wheels.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-18, -14, 10, 5);
  ctx.fillRect(8, -14, 10, 5);
  ctx.fillRect(-18, 9, 10, 5);
  ctx.fillRect(8, 9, 10, 5);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-23, -12, 46, 24, 6);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-23, -12, 10, 24);
    ctx.fillRect(13, -12, 10, 24);
  }
  if (car.special === 'getaway') {
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-23, -12, 46, 24, 6);
    ctx.stroke();
  }
  // Windshield and roof.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(8, -9, 8, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-6, -9, 12, 18);
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(-18, -9, 6, 18);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(21, -9, 3, 5);
  ctx.fillRect(21, 4, 3, 5);
  // Police light bar, flashing.
  if (car.kind === 'police') {
    const phase = Math.floor(t * 4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-4, -12, 8, 5);
    ctx.fillStyle = phase ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(-4, 7, 8, 5);
  }
  ctx.restore();
}

export function drawPeds(ctx, G) {
  for (const p of G.peds) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.down > 0) {
      ctx.globalAlpha = clamp(1 - p.downT / 5, 0.15, 1);
      ctx.rotate(p.angle + Math.PI / 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
