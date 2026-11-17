// NEON TIDE — all sound is synthesized with WebAudio.
// Engine hum, police siren, gunshots, pickups and a small synthwave
// bass sequencer. No audio files, no network. Everything starts on
// the first user gesture; if audio is unavailable the game stays silent.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenHigh = false;
    this.sirenTimer = 0;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    // A minor-ish bass walk, one note per step, 0 = rest.
    this.bassNotes = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 58.27, 0, 73.42, 0];
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();

      this.nextNoteTime = this.ctx.currentTime + 0.1;
    } catch (e) {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  toneAt(freq, when, dur, type, vol) {
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(when);
      o.stop(when + dur + 0.02);
    } catch (e) {}
  }

  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq || 1200;
      const g = this.ctx.createGain();
      g.gain.value = vol || 0.25;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch (e) {}
  }

  shot() {
    this.noise(0.12, 0.3, 3000);
    this.tone(180, 0.08, 'square', 0.12, 60);
  }

  enemyShot() {
    this.noise(0.1, 0.14, 2200);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.18, 990);
  }

  cash() {
    this.tone(880, 0.1, 'triangle', 0.15);
    setTimeout(() => this.tone(1320, 0.14, 'triangle', 0.15), 90);
  }

  missionDone() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.18), i * 110));
  }

  crash() {
    this.noise(0.25, 0.35, 500);
  }

  explosion() {
    this.noise(0.7, 0.5, 300);
    this.tone(60, 0.6, 'sine', 0.3, 30);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.45;
    return this.muted;
  }

  update(dt, G) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const speed = G.player.inCar && G.player.car ? Math.abs(G.player.car.speed) : 0;
    if (this.engineGain) {
      this.engineGain.gain.value = G.player.inCar ? 0.02 + Math.min(0.06, (speed / 420) * 0.05) : 0;
    }
    if (this.engineOsc) this.engineOsc.frequency.value = 45 + speed * 0.35;
    if (this.sirenGain) {
      this.sirenTimer += dt;
      if (this.sirenTimer > 0.45) {
        this.sirenTimer = 0;
        this.sirenHigh = !this.sirenHigh;
        if (this.sirenOsc) this.sirenOsc.frequency.value = this.sirenHigh ? 920 : 660;
      }
      const target = G.wanted > 0 ? 0.022 : 0;
      this.sirenGain.gain.value += (target - this.sirenGain.gain.value) * Math.min(1, dt * 4);
    }
    if (!this.muted) {
      while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
        const step = this.musicStep % 16;
        const bass = this.bassNotes[step];
        if (bass) this.toneAt(bass, this.nextNoteTime, 0.2, 'triangle', 0.09);
        if (step === 0 || step === 8) this.toneAt(220, this.nextNoteTime, 0.9, 'sine', 0.03);
        if (step === 4 || step === 12) this.toneAt(277.18, this.nextNoteTime, 0.9, 'sine', 0.025);
        this.nextNoteTime += 0.21;
        this.musicStep++;
      }
    }
  }
}
