// NEON TIDE — staged states for screenshots and playtests.
// ?demo=cover puts the player in a car on a busy road with the first
// mission live. ?demo=chase adds a three-star police chase.
// ?demo=mission puts the player on foot at the pier pickup.
// ?demo=city pulls the camera out for a wide look at Solara Bay.

import { startMission } from './missions.js';
import { spawnPoliceAt, addWanted } from './police.js';
import { makeCar } from './traffic.js';

export function applyDemo(G, mode) {
  const P = G.player;
  G.state = 'playing';

  if (mode === 'mission') {
    P.x = 1900;
    P.y = 2360;
    P.angle = -Math.PI / 2;
    P.inCar = false;
    P.car = null;
    startMission(G, 0);
    G.camera.x = P.x;
    G.camera.y = P.y;
    G.camera.zoom = 1;
    return;
  }

  const car = makeCar(G, 1900, 1500, 0, 'player', '#19c2b8');
  car.speed = 150;
  car.maxSpeed = 430;
  car.driver = 'player';
  G.cars.push(car);
  P.car = car;
  P.inCar = true;
  P.x = car.x;
  P.y = car.y;
  startMission(G, 0);
  G.camera.x = P.x;
  G.camera.y = P.y;

  if (mode === 'chase') {
    addWanted(G, 3);
    G.mission.index = 1;
    G.mission.stage = 0;
    G.mission.name = 'Mission 2 — Heat on the Strip';
    G.mission.text = 'Reach the Hideout and lose the cops';
    G.mission.marker = { x: G.city.spots.hideout.x, y: G.city.spots.hideout.y };
    G.messages = [];
    G.messages.push({ text: 'Mission 2 — Heat on the Strip: the cops are onto you.', t: G.time });
    for (let i = 0; i < 3; i++) spawnPoliceAt(G);
    const pols = G.cars.filter((c) => c.kind === 'police');
    pols.forEach((pc, i) => {
      pc.x = P.x - 260 - i * 90;
      pc.y = P.y + (i - 1) * 70;
      pc.angle = 0;
      pc.speed = 320;
    });
  }
  if (mode === 'city') G.camera.zoom = 0.62;
  if (mode === 'cover') G.camera.zoom = 0.9;
}
