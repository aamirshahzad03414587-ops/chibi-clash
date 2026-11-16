import { CONFIG } from "./config.js";

const STORAGE_VOL = "chibiClash.volume";
const STORAGE_MUTE = "chibiClash.muted";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Cartoon chipmunk SFX made only with the Web Audio API.
 * High-pitched formant "voices" and blips — no recorded or copyrighted audio.
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = loadNumber(STORAGE_VOL, CONFIG.audio.defaultVolume);
    this.muted = loadBool(STORAGE_MUTE, false);
    this._unlocked = false;
  }

  _cue(name) {
    if (typeof this.onCue === "function") this.onCue(name);
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this._unlocked = true;
    return this.ctx;
  }

  setVolume(v) {
    this.volume = clamp(Number(v) || 0, 0, 1);
    localStorage.setItem(STORAGE_VOL, String(this.volume));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    localStorage.setItem(STORAGE_MUTE, this.muted ? "1" : "0");
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- Public cues (all short, cute, and high-pitched) ---

  join() {
    this._cue("join");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Chipmunk "hi-hi!" arpeggio.
    this._blip(t, 880, 0.07, "triangle", 0.2);
    this._blip(t + 0.07, 1174, 0.08, "triangle", 0.22);
    this._blip(t + 0.14, 1568, 0.1, "sine", 0.16);
    this._chirp(t, 0.22, 700, 1600);
  }

  jab() {
    this._cue("jab");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._noiseBurst(t, 0.04, 0.18, 2500, 7000);
    this._blip(t, 1480, 0.05, "square", 0.12);
    this._squeakVowel(t, 0.09, "i", 0.16);
  }

  punch() {
    this._cue("punch");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._noiseBurst(t, 0.05, 0.22, 800, 4000);
    this._blip(t, 220, 0.06, "sine", 0.18); // tiny body thud, still cute
    this._squeakVowel(t, 0.11, "a", 0.22);
    this._blip(t + 0.03, 1320, 0.06, "triangle", 0.14);
  }

  hit() {
    this._cue("hit");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._squeakVowel(t, 0.12, "ow", 0.24);
    this._blip(t, 980, 0.05, "square", 0.08);
  }

  block() {
    this._cue("block");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._blip(t, 1860, 0.04, "triangle", 0.16);
    this._blip(t + 0.03, 2480, 0.05, "sine", 0.12);
  }

  parry() {
    this._cue("parry");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._blip(t, 2090, 0.05, "square", 0.14);
    this._blip(t + 0.04, 2790, 0.07, "triangle", 0.16);
    this._chirp(t, 0.12, 1800, 3200);
  }

  dodge() {
    this._cue("dodge");
    const ctx = this.ensure();
    if (!ctx) return;
    this._chirp(ctx.currentTime, 0.12, 900, 2200);
  }

  dash() {
    this._cue("dash");
    const ctx = this.ensure();
    if (!ctx) return;
    this._chirp(ctx.currentTime, 0.14, 400, 1400);
  }

  special() {
    this._cue("special");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._squeakVowel(t, 0.16, "ya", 0.28);
    this._chirp(t, 0.2, 500, 2000);
    this._blip(t + 0.12, 1660, 0.1, "sawtooth", 0.1);
  }

  ko() {
    this._cue("ko");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Stretchy cartoon "waaaa" that flips up like a chipmunk, then a bounce.
    this._squeakVowel(t, 0.28, "wa", 0.32);
    this._chirp(t + 0.02, 0.3, 420, 980);
    this._blip(t + 0.28, 1480, 0.08, "triangle", 0.18);
    this._blip(t + 0.36, 980, 0.1, "sine", 0.14);
    this._blip(t + 0.46, 1320, 0.12, "sine", 0.12);
  }

  gift() {
    this._cue("gift");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._blip(t, 1046, 0.06, "sine", 0.16);
    this._blip(t + 0.06, 1318, 0.06, "sine", 0.16);
    this._blip(t + 0.12, 1568, 0.08, "sine", 0.18);
    this._blip(t + 0.2, 2093, 0.1, "triangle", 0.14);
  }

  slash() {
    this._cue("slash");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._chirp(t, 0.1, 1400, 2400);
    this._noiseBurst(t, 0.05, 0.16, 1800, 7000);
    this._blip(t + 0.02, 1760, 0.05, "triangle", 0.12);
  }

  clash() {
    this._cue("clash");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._blip(t, 1860, 0.05, "square", 0.16);
    this._blip(t + 0.03, 2480, 0.07, "triangle", 0.16);
    this._chirp(t, 0.12, 1600, 3200);
    this._noiseBurst(t, 0.04, 0.18, 2000, 8000);
  }

  roundEnd() {
    this._cue("roundEnd");
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    this._blip(t0, 784, 0.12, "triangle", 0.2);
    this._blip(t0 + 0.12, 988, 0.14, "triangle", 0.22);
    this._blip(t0 + 0.28, 1174, 0.22, "sine", 0.24);
    this._chirp(t0, 0.4, 400, 1400);
  }

  upgrade() {
    this._cue("upgrade");
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._blip(t, 1174, 0.06, "sine", 0.16);
    this._blip(t + 0.07, 1568, 0.07, "triangle", 0.18);
    this._blip(t + 0.15, 2093, 0.1, "sine", 0.16);
    this._chirp(t + 0.08, 0.16, 900, 2200);
  }

  // --- Building blocks ---

  _gain(t, attack, dur, peak, end = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, end), t + dur);
    g.connect(this.master);
    return g;
  }

  _blip(t, freq, dur, type, peak) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
    osc.connect(this._gain(t, 0.005, dur, peak));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _chirp(t, dur, from, to) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = (from + to) / 2;
    filter.Q.value = 4;
    osc.connect(filter);
    filter.connect(this._gain(t, 0.01, dur, 0.12));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noiseBurst(t, dur, peak, hp, lp) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const high = this.ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = hp;
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = lp;
    src.connect(high);
    high.connect(low);
    low.connect(this._gain(t, 0.002, dur, peak));
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /**
   * Tiny pitched-up "voice": pulse wave through two formant bandpasses.
   * Frequencies sit in a chipmunk / miniature range on purpose.
   */
  _squeakVowel(t, dur, kind, peak) {
    const vowels = {
      i: [420, 2800, 900],
      a: [900, 1600, 620],
      ow: [700, 1200, 540],
      ya: [500, 2200, 780],
      wa: [480, 900, 500],
    };
    const [f1, f2, f0] = vowels[kind] || vowels.a;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f0, t);
    if (kind === "wa" || kind === "ow") {
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    } else if (kind === "ya") {
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + dur);
    }

    const makeFormant = (freq, q) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      return bp;
    };

    const a = makeFormant(f1, 8);
    const b = makeFormant(f2, 10);
    const mix = this.ctx.createGain();
    mix.gain.value = 0.7;
    osc.connect(a);
    osc.connect(b);
    a.connect(mix);
    b.connect(mix);
    mix.connect(this._gain(t, 0.012, dur, peak));
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
}

function loadNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
}

function loadBool(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "1" || raw === "true";
}

export const sfx = new Sfx();
