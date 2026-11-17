// NEON TIDE — entry point: the game loop, screen flow and rendering.
// Menu pans over the city; playing updates the player, traffic,
// pedestrians, police, bullets, rivals and missions, then draws the
// world through a camera that follows the player.

import { createGame } from './state.js';
import { createInput } from './input.js';
import { SoundEngine } from './audio.js';
import { buildCity, drawCity } from './city.js';
import { spawnTraffic, spawnPedestrians, updateTraffic, updatePeds, drawCar, drawPeds } from './traffic.js';
import { updatePlayer, drawPlayer } from './player.js';
import { updatePolice } from './police.js';
import { updateBullets, updateParticles, updateRivals, drawBullets, drawRivals, drawParticles, drawSkid } from './combat.js';
import { updateMissions, startMission, drawMissionBeacon } from './missions.js';
import { drawHUD, drawMenu, drawDead, drawPaused, drawComplete } from './hud.js';
import { loadGame, saveGame } from './save.js';
import { applyDemo } from './demo.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const G = createGame();
G.input = createInput(canvas);
G.audio = new SoundEngine();
window.__game = G;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  G.viewW = canvas.width;
  G.viewH = canvas.height;
}
window.addEventListener('resize', resize);
resize();

buildCity(G);
spawnTraffic(G);
spawnPedestrians(G);
const save = loadGame();
if (save) {
  G.save = save;
  G.player.cash = save.cash || 250;
  if (save.stats) G.stats = save.stats;
}

const params = new URLSearchParams(location.search);
const demo = params.get('demo');
if (demo) {
  applyDemo(G, demo);
} else {
  startMission(G, 0);
  G.state = 'menu';
  G.camera.x = 1800;
  G.camera.y = 1300;
}

function startGame() {
  G.input.mouseDown = false;
  G.input.clicked = false;
  G.input.anyKey = false;
  if (G.save && G.save.mission > 0 && G.save.mission < 3 && !G.save.done) {
    startMission(G, G.save.mission);
  }
  G.state = 'playing';
  G.audio.ensure();
}

function respawn() {
  const P = G.player;
  P.hp = 100;
  P.x = 1500;
  P.y = 1100;
  P.inCar = false;
  if (P.car) {
    P.car.kind = 'parked';
    P.car.driver = null;
    P.car.speed = 0;
    P.car = null;
  }
  P.cash = Math.max(0, P.cash - 100);
  G.wanted = 0;
  G.camera.x = P.x;
  G.camera.y = P.y;
  G.state = 'playing';
  saveGame(G);
}

let last = performance.now();
let pToggle = false;
let mToggle = false;

function update(dt) {
  G.time += dt;
  G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2);

  if (G.state === 'menu') {
    G.camera.x = 1800 + Math.cos(G.time * 0.05) * 500;
    G.camera.y = 1300 + Math.sin(G.time * 0.04) * 300;
    if (G.input.anyKey || G.input.clicked) startGame();
    return;
  }

  if (G.state === 'dead') {
    if (G.input.keys['KeyR'] || G.input.clicked) {
      G.input.clicked = false;
      respawn();
    }
    return;
  }

  if (G.state === 'complete') {
    if (G.input.keys['Enter'] || G.input.clicked) {
      G.input.clicked = false;
      G.state = 'playing';
    }
    return;
  }

  if (G.state !== 'playing') return;

  if (G.input.keys['KeyP'] && !pToggle) {
    G.paused = !G.paused;
    pToggle = true;
  }
  if (!G.input.keys['KeyP']) pToggle = false;
  if (G.paused) return;

  if (G.input.keys['KeyM'] && !mToggle) {
    G.audio.toggleMute();
    mToggle = true;
  }
  if (!G.input.keys['KeyM']) mToggle = false;

  G.audio.ensure();
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateRivals(G, dt);
  updateMissions(G, dt);
  updateParticles(G, dt);
  G.audio.update(dt, G);

  G.saveT += dt;
  if (G.saveT > 30) {
    G.saveT = 0;
    saveGame(G);
  }
}

function render() {
  const vw = G.viewW;
  const vh = G.viewH;
  ctx.fillStyle = '#79b264';
  ctx.fillRect(0, 0, vw, vh);

  const zoom = G.camera.zoom;
  const shX = G.camera.shake > 0 ? (Math.random() - 0.5) * G.camera.shake * 14 : 0;
  const shY = G.camera.shake > 0 ? (Math.random() - 0.5) * G.camera.shake * 14 : 0;

  ctx.save();
  ctx.translate(vw / 2, vh / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-G.camera.x + shX, -G.camera.y + shY);
  drawCity(ctx, G, vw, vh);
  drawSkid(ctx, G);
  drawMissionBeacon(ctx, G);
  drawPeds(ctx, G);
  for (const car of G.cars) drawCar(ctx, car, G.time);
  drawRivals(ctx, G);
  if (!G.player.inCar) drawPlayer(ctx, G);
  drawBullets(ctx, G);
  drawParticles(ctx, G);
  ctx.restore();

  drawHUD(ctx, G);
  if (G.state === 'menu') drawMenu(ctx, G);
  if (G.state === 'dead') drawDead(ctx, G);
  if (G.paused) drawPaused(ctx, G);
  if (G.state === 'complete') drawComplete(ctx, G);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
