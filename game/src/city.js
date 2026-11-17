// NEON TIDE — the city of Solara Bay.
// A fixed-seed grid city: roads, blocks of buildings, parks, a beach
// with a pier along the south edge, a river with a bridge at the north
// edge, and the story landmarks (pier, Tide Bar, hideout, warehouse,
// North Bridge). Also answers collision questions for cars and people.

import { clamp } from './state.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ROADS_V = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const ROADS_H = [300, 700, 1100, 1500, 1900, 2200];
export const ROAD_W = 96;
export const BEACH_TOP = 2340;
export const WATER_TOP = 2520;

const PALETTE = [
  '#c96f4a', '#d9a441', '#7fa8a0', '#b56576', '#8d99ae',
  '#e07a5f', '#81b29a', '#f2cc8f', '#a8dadc', '#e5989b',
];

export function buildCity(G) {
  const rng = mulberry32(20261117);
  const buildings = [];
  const trees = [];
  const parks = [];
  const spots = {
    pier: { x: 1900, y: 2440, label: 'SOLARA PIER' },
    bar: { x: 2900, y: 500, label: 'TIDE BAR' },
    hideout: { x: 500, y: 2050, label: 'HIDEOUT' },
    warehouse: { x: 900, y: 900, label: 'WAREHOUSE' },
    bridge: { x: 3100, y: 60, label: 'NORTH BRIDGE' },
    hospital: { x: 1500, y: 1100, label: 'SOLARA GENERAL' },
  };

  const parkBlocks = new Set(['2,1', '4,3', '1,3', '5,0']);
  for (let i = 0; i < ROADS_V.length - 1; i++) {
    for (let j = 0; j < ROADS_H.length - 1; j++) {
      const x0 = ROADS_V[i] + ROAD_W / 2 + 14;
      const x1 = ROADS_V[i + 1] - ROAD_W / 2 - 14;
      const y0 = ROADS_H[j] + ROAD_W / 2 + 14;
      const y1 = ROADS_H[j + 1] - ROAD_W / 2 - 14;
      const key = i + ',' + j;
      if (parkBlocks.has(key)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let t = 0; t < 7; t++) {
          trees.push({
            x: x0 + 30 + rng() * (x1 - x0 - 60),
            y: y0 + 30 + rng() * (y1 - y0 - 60),
            r: 12 + rng() * 10,
          });
        }
        continue;
      }
      if (i === 1 && j === 1) {
        buildings.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color: '#8d6b4f', kind: 'warehouse' });
        continue;
      }
      if (i === 6 && j === 0) {
        buildings.push({ x: x0 + 20, y: y0 + 20, w: x1 - x0 - 40, h: y1 - y0 - 40, color: '#3d5a80', kind: 'bar' });
        continue;
      }
      if (i === 0 && j === 4) {
        buildings.push({ x: x0 + 40, y: y0 + 30, w: 120, h: 110, color: '#e07a5f', kind: 'house' });
        continue;
      }
      const bw = (x1 - x0) / 2 - 16;
      const bh = (y1 - y0) / 2 - 16;
      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          if (rng() < 0.18) {
            trees.push({
              x: x0 + a * (bw + 16) + bw / 2,
              y: y0 + b * (bh + 16) + bh / 2,
              r: 16,
            });
            continue;
          }
          buildings.push({
            x: x0 + a * (bw + 16),
            y: y0 + b * (bh + 16),
            w: bw * (0.75 + rng() * 0.25),
            h: bh * (0.75 + rng() * 0.25),
            color: PALETTE[Math.floor(rng() * PALETTE.length)],
            kind: 'block',
          });
        }
      }
    }
  }

  for (let i = 0; i < 60; i++) {
    const v = ROADS_V[Math.floor(rng() * ROADS_V.length)];
    const y = 120 + rng() * 2100;
    trees.push({ x: v + (rng() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14), y, r: 10 + rng() * 8 });
  }

  G.city = { buildings, trees, parks, spots, roadsV: ROADS_V, roadsH: ROADS_H };
}

export function hitsBuilding(G, x, y, r) {
  const bs = G.city.buildings;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function blockedForCar(G, x, y, r) {
  const onBridge = x > 3040 && x < 3160;
  if (x < 20 + r || x > G.worldW - 20 - r) return true;
  if (y < 100 + r && !onBridge) return true;
  if (y > BEACH_TOP - r) return true;
  return !!hitsBuilding(G, x, y, r);
}

export function blockedForFoot(G, x, y, r) {
  const onPier = x > 1840 && x < 1960;
  if (x < 10 + r || x > G.worldW - 10 - r) return true;
  if (y < 100 + r) return true;
  if (onPier) {
    if (y > 2560 - r) return true;
  } else if (y > WATER_TOP - r + 10) {
    return true;
  }
  return !!hitsBuilding(G, x, y, r);
}

// Right-hand lane offset for a road of the given axis and direction.
export function laneOffset(axis, dir) {
  if (axis === 'y') return dir > 0 ? -24 : 24;
  return dir > 0 ? 24 : -24;
}

export function drawCity(ctx, G, vw, vh) {
  const t = G.time;
  const zoom = G.camera.zoom;
  const x0 = G.camera.x - vw / 2 / zoom - 80;
  const y0 = G.camera.y - vh / 2 / zoom - 80;
  const x1 = G.camera.x + vw / 2 / zoom + 80;
  const y1 = G.camera.y + vh / 2 / zoom + 80;

  // Grass base.
  ctx.fillStyle = '#79b264';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  // Parks.
  for (const p of G.city.parks) {
    if (p.x > x1 || p.x + p.w < x0 || p.y > y1 || p.y + p.h < y0) continue;
    ctx.fillStyle = '#5da24f';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#c9b18a';
    ctx.fillRect(p.x + p.w / 2 - 8, p.y, 16, p.h);
  }

  // Beach sand and water along the south edge.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x0, BEACH_TOP, x1 - x0, WATER_TOP - BEACH_TOP);
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x0, WATER_TOP, x1 - x0, G.worldH - WATER_TOP);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    const wy = WATER_TOP + 14 + k * 22;
    ctx.beginPath();
    for (let x = Math.max(0, x0); x <= Math.min(G.worldW, x1); x += 40) {
      const yy = wy + Math.sin(x * 0.02 + t * 1.4 + k * 2) * 4;
      if (x === Math.max(0, x0)) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Foam at the shoreline.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = Math.max(0, x0); x <= Math.min(G.worldW, x1); x += 40) {
    const yy = WATER_TOP + Math.sin(x * 0.03 + t * 2) * 3;
    if (x === Math.max(0, x0)) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();

  // River along the north edge.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x0, 0, x1 - x0, 96);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    const wy = 26 + k * 30;
    ctx.beginPath();
    for (let x = Math.max(0, x0); x <= Math.min(G.worldW, x1); x += 40) {
      const yy = wy + Math.sin(x * 0.025 + t * 1.2 + k) * 3;
      if (x === Math.max(0, x0)) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // Roads: sidewalk, asphalt, centre dashes.
  for (const c of ROADS_V) {
    ctx.fillStyle = '#b7bcc4';
    ctx.fillRect(c - ROAD_W / 2 - 10, 96, ROAD_W + 20, G.worldH - 96 - (G.worldH - BEACH_TOP));
    ctx.fillStyle = '#3c414d';
    ctx.fillRect(c - ROAD_W / 2, 96, ROAD_W, BEACH_TOP - 96);
    ctx.fillStyle = '#e8c33a';
    for (let y = 120; y < BEACH_TOP; y += 46) {
      let nearCross = false;
      for (const h of ROADS_H) if (Math.abs(y - h) < 62) { nearCross = true; break; }
      if (!nearCross) ctx.fillRect(c - 3, y, 6, 24);
    }
  }
  for (const c of ROADS_H) {
    ctx.fillStyle = '#b7bcc4';
    ctx.fillRect(0, c - ROAD_W / 2 - 10, G.worldW, ROAD_W + 20);
    ctx.fillStyle = '#3c414d';
    ctx.fillRect(0, c - ROAD_W / 2, G.worldW, ROAD_W);
    ctx.fillStyle = '#e8c33a';
    for (let x = 24; x < G.worldW; x += 46) {
      let nearCross = false;
      for (const v of ROADS_V) if (Math.abs(x - v) < 62) { nearCross = true; break; }
      if (!nearCross) ctx.fillRect(x, c - 3, 24, 6);
    }
  }

  // North Bridge deck over the river.
  ctx.fillStyle = '#4a505c';
  ctx.fillRect(3052, 0, 96, 110);
  ctx.fillStyle = '#e8c33a';
  for (let y = 8; y < 104; y += 24) ctx.fillRect(3097, y, 6, 12);
  ctx.fillStyle = '#8a8f99';
  ctx.fillRect(3046, 0, 6, 110);
  ctx.fillRect(3148, 0, 6, 110);

  // Pier planks over the sand and water.
  ctx.fillStyle = '#8a6a45';
  ctx.fillRect(1850, BEACH_TOP, 100, 220);
  ctx.strokeStyle = '#6d5233';
  ctx.lineWidth = 2;
  for (let y = BEACH_TOP + 16; y < BEACH_TOP + 220; y += 18) {
    ctx.beginPath();
    ctx.moveTo(1850, y);
    ctx.lineTo(1950, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#5d4429';
  ctx.beginPath();
  ctx.arc(1858, 2548, 6, 0, Math.PI * 2);
  ctx.arc(1942, 2548, 6, 0, Math.PI * 2);
  ctx.fill();

  // Buildings.
  for (const b of G.city.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 5;
    ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    if (b.kind === 'warehouse') {
      ctx.fillStyle = '#5d4429';
      ctx.fillRect(b.x + b.w / 2 - 40, b.y + b.h - 46, 80, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let wx = b.x + 24; wx < b.x + b.w - 24; wx += 34) {
        ctx.fillRect(wx, b.y + 22, 16, 12);
      }
    } else if (b.kind === 'bar') {
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(b.x + 10, b.y + 8, b.w - 20, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIDE BAR', b.x + b.w / 2, b.y + 27);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let wx = b.x + 14; wx < b.x + b.w - 12; wx += 26) {
        for (let wy = b.y + 14; wy < b.y + b.h - 12; wy += 30) {
          ctx.fillRect(wx, wy, 10, 12);
        }
      }
    }
  }

  // Trees.
  for (const tr of G.city.trees) {
    if (tr.x < x0 || tr.x > x1 || tr.y < y0 || tr.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(tr.x + 3, tr.y + 4, tr.r, tr.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e7d32';
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#66bb4a';
    ctx.beginPath();
    ctx.arc(tr.x - tr.r * 0.25, tr.y - tr.r * 0.25, tr.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Landmark labels on the ground.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(G.city.spots)) {
    const s = G.city.spots[key];
    if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1) continue;
    if (key === 'bar') continue;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(s.label, s.x, s.y - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(s.label, s.x, s.y - 14);
  }
}
