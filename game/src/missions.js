// NEON TIDE — the story: three linked missions for Kai, a courier
// driver in Solara Bay. Each mission sets an objective and a map marker;
// reaching the marker advances the story. Finishing all three ends the
// story and opens free roam.

import { saveGame } from './save.js';
import { showBanner, addMessage } from './state.js';
import { addWanted, spawnPoliceAt } from './police.js';
import { makeCar } from './traffic.js';

const MISSIONS = [
  {
    name: 'Mission 1 — The Pickup',
    stages: [
      { text: 'Pick up the package at Solara Pier', spot: 'pier' },
      { text: 'Deliver the package to the Tide Bar', spot: 'bar' },
    ],
    reward: 500,
  },
  {
    name: 'Mission 2 — Heat on the Strip',
    stages: [
      { text: 'Reach the Hideout and lose the cops', spot: 'hideout' },
    ],
    reward: 750,
  },
  {
    name: 'Mission 3 — The Last Run',
    stages: [
      { text: 'Steal the getaway car at the Warehouse', spot: 'warehouse' },
      { text: 'Drive to the North Bridge — outrun the law', spot: 'bridge' },
    ],
    reward: 1500,
  },
];

export function startMission(G, index) {
  G.mission.index = index;
  G.mission.stage = 0;
  G.mission.done = false;
  const m = MISSIONS[index];
  const stage = m.stages[0];
  G.mission.name = m.name;
  G.mission.text = stage.text;
  G.mission.marker = { x: G.city.spots[stage.spot].x, y: G.city.spots[stage.spot].y };
  addMessage(G, m.name + ': ' + stage.text);
  if (index === 1) {
    addWanted(G, 3, 'The cops spotted the handoff');
    spawnPoliceAt(G);
    spawnPoliceAt(G);
  }
  if (index === 2) spawnRivalsAndGetaway(G);
}

function spawnRivalsAndGetaway(G) {
  const w = G.city.spots.warehouse;
  const offsets = [[-70, -50], [60, -70], [-40, 70], [80, 40]];
  for (const [ox, oy] of offsets) {
    G.rivals.push({ x: w.x + ox, y: w.y + oy, hp: 50, angle: 0, shootCd: 1, speed: 120 });
  }
  const car = makeCar(G, w.x + 160, w.y + 60, 0, 'parked', '#ffd60a');
  car.special = 'getaway';
  G.cars.push(car);
  addMessage(G, 'Rival crew is guarding the warehouse. The gold car is yours if you can take it.');
}

function advanceStage(G) {
  const m = MISSIONS[G.mission.index];
  G.mission.stage++;
  const stage = m.stages[G.mission.stage];
  G.mission.text = stage.text;
  G.mission.marker = { x: G.city.spots[stage.spot].x, y: G.city.spots[stage.spot].y };
}

function completeMission(G) {
  const m = MISSIONS[G.mission.index];
  G.player.cash += m.reward;
  G.stats.missionsDone++;
  G.audio.missionDone();
  G.audio.cash();
  showBanner(G, m.name + ' complete — $' + m.reward + ' earned');
  addMessage(G, m.name + ' complete — $' + m.reward + ' earned.');
  saveGame(G);
  if (G.mission.index + 1 < MISSIONS.length) {
    startMission(G, G.mission.index + 1);
  } else {
    G.mission.allDone = true;
    G.mission.text = 'Free roam — Solara Bay is yours.';
    G.mission.marker = null;
    G.state = 'complete';
  }
}

export function updateMissions(G, dt) {
  if (G.mission.allDone) return;
  const P = G.player;
  const mk = G.mission.marker;
  if (!mk) return;
  const d = Math.hypot(P.x - mk.x, P.y - mk.y);
  if (d >= 80) return;
  const idx = G.mission.index;
  const st = G.mission.stage;

  if (idx === 0 && st === 0) {
    G.audio.pickup();
    addMessage(G, 'Package secured — get it to the Tide Bar.');
    advanceStage(G);
    return;
  }
  if (idx === 2 && st === 0) {
    if (P.inCar && P.car && P.car.special === 'getaway') {
      addWanted(G, 2, 'The getaway is hot — the law is coming');
      spawnPoliceAt(G);
      spawnPoliceAt(G);
      G.audio.pickup();
      advanceStage(G);
    } else if (G.time - G.mission.hintT > 3) {
      G.mission.hintT = G.time;
      addMessage(G, 'You need the gold getaway car — press E next to it.');
    }
    return;
  }
  if (idx === 1) G.wanted = 0;
  completeMission(G);
}

export function drawMissionBeacon(ctx, G) {
  const mk = G.mission.marker;
  if (!mk || G.state === 'menu') return;
  const pulse = 1 + Math.sin(G.time * 4) * 0.15;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,214,10,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(mk.x, mk.y, 46 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,10,0.25)';
  ctx.beginPath();
  ctx.arc(mk.x, mk.y, 46 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Light beam.
  ctx.fillStyle = 'rgba(255,214,10,0.18)';
  ctx.fillRect(mk.x - 10, mk.y - 260, 20, 260);
  // Down arrow.
  const bob = Math.sin(G.time * 4) * 6;
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.moveTo(mk.x, mk.y - 78 + bob);
  ctx.lineTo(mk.x - 14, mk.y - 100 + bob);
  ctx.lineTo(mk.x + 14, mk.y - 100 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
