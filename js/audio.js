// audio.js — sonoridad del siglo XII, toda sintetizada con Web Audio
// Organum a quintas paralelas, susurros por revenant, campana, chirridos, latido.
'use strict';

const SND = {
  ctx: null, master: null, noiseBuf: null,
  muted: false,
  ambient: [], whispers: [],
  heartLast: 0, heartOn: false,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1.0;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 8;
    comp.attack.value = 0.004; comp.release.value = 0.28;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    const len = 2 * this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  // ---------- mundo por nivel ----------
  startWorld(nRevs) {
    if (!this.ctx) return;
    this.stopWorld();
    const t = this.ctx.currentTime;
    // organum: tónica, quinta paralela y sub-octava — polifonía primitiva
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.085;
    droneGain.gain.setValueAtTime(0.0001, t);
    droneGain.gain.exponentialRampToValueAtTime(0.085, t + 4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 260;
    lp.connect(droneGain); droneGain.connect(this.master);
    for (const [f, type, v] of [[73.42, 'sawtooth', 1], [110.0, 'sawtooth', 0.7], [36.71, 'triangle', 1]]) {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.value = v;
      o.connect(g); g.connect(lp);
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.06 + Math.random() * 0.05;
      const lg = this.ctx.createGain(); lg.gain.value = 2.5;
      lfo.connect(lg); lg.connect(o.detune);
      o.start(); lfo.start();
      this.ambient.push(o, lfo);
    }
    // viento en las bóvedas: ruido grave respirando
    const wind = this.ctx.createBufferSource();
    wind.buffer = this.noiseBuf; wind.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.6;
    const wg = this.ctx.createGain(); wg.gain.value = 0.028;
    const wLfo = this.ctx.createOscillator(); wLfo.frequency.value = 0.08;
    const wLg = this.ctx.createGain(); wLg.gain.value = 0.018;
    wLfo.connect(wLg); wLg.connect(wg.gain);
    wind.connect(bp); bp.connect(wg); wg.connect(this.master);
    wind.start(); wLfo.start();
    this.ambient.push(wind, wLfo);
    // un canal de susurro por revenant
    for (let i = 0; i < nRevs; i++) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const bpf = this.ctx.createBiquadFilter();
      bpf.type = 'bandpass'; bpf.frequency.value = 1000 + Math.random() * 400; bpf.Q.value = 2.5;
      const g = this.ctx.createGain(); g.gain.value = 0;
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      // gemido tonal propio de cada revenant
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 62 + Math.random() * 55;
      const og = this.ctx.createGain(); og.gain.value = 0.5;
      o.connect(og); og.connect(g); o.start();
      src.connect(bpf); bpf.connect(g);
      if (pan) { g.connect(pan); pan.connect(this.master); } else g.connect(this.master);
      src.start();
      this.whispers.push({ src, bpf, g, pan, o, og, nextJitter: 0 });
    }
  },

  stopWorld() {
    for (const n of this.ambient) { try { n.stop(); } catch (e) {} }
    for (const w of this.whispers) { try { w.src.stop(); w.o.stop(); } catch (e) {} }
    this.ambient = []; this.whispers = [];
    this.heartOn = false;
  },

  // ---------- susurros (volumen ∝ cercanía, al máximo cuando está encima) ----------
  setWhisper(i, level, pan, muffled, dt) {
    const w = this.whispers[i];
    if (!w) return;
    const t = this.ctx.currentTime;
    const target = Math.max(0, Math.min(1, level)) * (muffled ? 0.4 : 1) * 0.65;
    w.g.gain.setTargetAtTime(target, t, 0.12);
    if (w.pan) w.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.1);
    w.nextJitter -= dt;
    if (w.nextJitter <= 0) { // sílabas: el murmullo deambula en frecuencia
      w.bpf.frequency.setTargetAtTime(800 + Math.random() * 900, t, 0.05);
      w.o.frequency.setTargetAtTime(55 + Math.random() * 75, t, 0.3);
      w.nextJitter = 0.09 + Math.random() * 0.12;
    }
  },

  // ---------- latido cuando algo está encima ----------
  updateHeart(dist, now) {
    if (!this.ctx || dist >= 3.2) { this.heartOn = false; return; }
    const interval = 0.55 + (dist / 3.2) * 0.85;
    if (!this.heartOn || now - this.heartLast >= interval) {
      this.heartOn = true; this.heartLast = now;
      this.thump(0.22); setTimeout(() => this.thump(0.14), 190);
    }
  },
  thump(v) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(58, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  },

  // ---------- campana ----------
  bell(n = 1) {
    if (!this.ctx) return;
    const strike = () => {
      const t = this.ctx.currentTime;
      const base = 196 * (1 + (Math.random() - 0.5) * 0.01);
      for (const [mult, amp, dec] of [[1, 0.4, 5.5], [2.0, 0.18, 4.0], [2.74, 0.12, 2.6], [3.76, 0.07, 1.7], [5.4, 0.04, 1.0]]) {
        const o = this.ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = base * mult;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + dec + 0.1);
      }
    };
    for (let i = 0; i < n; i++) setTimeout(strike, i * 2600);
  },

  // ---------- chirrido de puerta ----------
  creak(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = kind === 'close' ? 150 : 175;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.5);
    const wob = this.ctx.createOscillator(); wob.frequency.value = 9;
    const wg = this.ctx.createGain(); wg.gain.value = 22;
    wob.connect(wg); wg.connect(o.frequency); wob.start(t); wob.stop(t + 0.6);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 3.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(bp); bp.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.6);
    for (let i = 0; i < 3; i++) { // rechinos de bisagra
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const sg = this.ctx.createGain();
      const ts = t + 0.1 + i * (0.14 + Math.random() * 0.1);
      sg.gain.setValueAtTime(0.0001, ts);
      sg.gain.exponentialRampToValueAtTime(0.06, ts + 0.03);
      sg.gain.exponentialRampToValueAtTime(0.0001, ts + 0.09);
      s.connect(hp); hp.connect(sg); sg.connect(this.master);
      s.start(ts); s.stop(ts + 0.12);
    }
  },

  // ---------- pasos sobre piedra ----------
  footstep() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.6 + Math.random() * 0.3;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14 + Math.random() * 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(lp); lp.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + 0.1);
  },

  // ---------- desvanecimiento de revenant ----------
  whoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.8;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(220, t + 0.55);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    s.connect(bp); bp.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + 0.65);
  },

  // ---------- voces de los muertos (stinger de amenaza / muerte) ----------
  shriek(big) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = big ? 0.17 : 0.09;
    for (let i = 0; i < 6; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = (Math.random() - 0.5) * 90;
      const f0 = 320 + Math.random() * 260;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * (big ? 3.4 : 2.4), t + 0.85);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 1.25 : 0.8));
      o.connect(hp); hp.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + (big ? 1.3 : 0.85));
    }
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(vol * 0.8, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    s.connect(bp); bp.connect(g2); g2.connect(this.master);
    s.start(t); s.stop(t + 0.75);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    return this.muted;
  },
};

if (typeof window !== 'undefined') window.SND = SND;
