// NEON TIDE — shared game state and small helpers.
// Every module reads and writes the same game object G, created here.

export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function rand(a, b) {
  if (b === undefined) {
    b = a;
    a = 0;
  }
  return a + Math.random() * (b - a);
}

export function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

// Shortest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * t;
}

export function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function createGame() {
  return {
    time: 0,
    state: 'menu', // menu | playing | dead | complete
    paused: false,
    worldW: 3600,
    worldH: 2600,
    viewW: 1280,
    viewH: 720,
    player: {
      x: 1500,
      y: 1100,
      angle: 0,
      speed: 0,
      hp: 100,
      cash: 250,
      inCar: false,
      car: null,
      aimAngle: 0,
      fireCooldown: 0,
    },
    cars: [],
    peds: [],
    rivals: [],
    bullets: [],
    particles: [],
    skid: [],
    wanted: 0,
    crimeTimer: 0,
    wantedTick: 0,
    mission: {
      index: 0,
      stage: 0,
      name: '',
      text: '',
      marker: null,
      done: false,
      allDone: false,
      hintT: -10,
    },
    camera: { x: 1800, y: 1300, zoom: 1, shake: 0 },
    messages: [],
    bannerText: '',
    bannerT: -10,
    hurtFlash: 0,
    enterCd: 0,
    save: null,
    saveT: 0,
    city: null,
    input: null,
    audio: null,
    stats: { carsStolen: 0, missionsDone: 0, shotsFired: 0 },
  };
}

export function addMessage(G, text) {
  G.messages.push({ text, t: G.time });
  if (G.messages.length > 5) G.messages.shift();
}

export function addDamage(G, n) {
  const P = G.player;
  if (P.hp <= 0) return;
  P.hp = Math.max(0, P.hp - n);
  G.hurtFlash = 0.35;
  G.camera.shake = Math.max(G.camera.shake, 0.4);
  if (P.hp <= 0) {
    G.state = 'dead';
    if (G.audio) G.audio.explosion();
  }
}

export function showBanner(G, text) {
  G.bannerText = text;
  G.bannerT = G.time;
}
