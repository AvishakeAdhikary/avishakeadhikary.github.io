import { biquad } from "../audio/mixer";
import { crackleBuffer, type Kit } from "./instruments";
import { makePhrase, STYLES, type MelodyNote, type StyleId } from "./styles";

const LOOKAHEAD = 0.14; // seconds scheduled ahead of the audio clock
const TICK_MS = 25;

const seeded = (seed: number) => () => {
  seed = (Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) >>> 0;
  return ((seed ^ (seed >>> 13)) >>> 0) / 4294967296;
};

/** Stereo impulse response: exponentially decaying noise (a small hall). */
function impulse(ctx: AudioContext, seconds = 2.8, decay = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/**
 * Composed, generative soundtrack. A lookahead scheduler places every note
 * on the AudioContext clock (sample-accurate, frame-rate independent),
 * walking through a song form of sections and a chord progression.
 * Mixing: instrument bus → tape tone → compressor → volume → analyser →
 * the shared mixer's music bus, with reverb and tempo-synced echo sends.
 */
export class MusicEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private bus: GainNode;
  private tone: BiquadFilterNode;
  private echo: DelayNode;
  private crackle: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode;
  private kit: Kit;
  private style = STYLES.lofi;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private phrases = new Map<string, MelodyNote[][]>();
  private rng = seeded(Date.now() & 0xffff);
  private volume = 0.6;

  constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.tone = biquad(ctx);
    this.tone.type = "lowpass";
    this.tone.Q.value = 0.4;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1;

    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const verbReturn = ctx.createGain();
    verbReturn.gain.value = 0.55;
    const verbIn = ctx.createGain();
    verbIn.connect(verb).connect(verbReturn).connect(this.tone);

    this.echo = ctx.createDelay(3);
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const echoTone = biquad(ctx);
    echoTone.type = "lowpass";
    echoTone.frequency.value = 2600;
    const echoIn = ctx.createGain();
    echoIn.connect(this.echo).connect(echoTone).connect(fb).connect(this.echo);
    echoTone.connect(this.tone);

    this.bus.connect(this.tone).connect(comp).connect(this.master).connect(this.analyser).connect(out);

    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    this.crackleGain.connect(this.tone);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this.kit = { ctx, out: this.bus, verb: verbIn, echo: echoIn, noise };
  }

  private applyStyle(id: StyleId) {
    this.style = STYLES[id];
    const now = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(this.style.tone, now, 0.3);
    this.echo.delayTime.setValueAtTime((60 / this.style.bpm) * this.style.echoBeats, now);
    if (this.style.crackle && !this.crackle) {
      this.crackle = this.ctx.createBufferSource();
      this.crackle.buffer = crackleBuffer(this.ctx);
      this.crackle.loop = true;
      this.crackle.connect(this.crackleGain);
      this.crackle.start();
    }
    this.crackleGain.gain.setTargetAtTime(this.style.crackle ? 0.5 : 0, now, 0.4);
    this.phrases.clear();
    this.step = 0;
  }

  private melodyFor(sectionKey: string, chords: () => Parameters<typeof makePhrase>[2]) {
    let p = this.phrases.get(sectionKey);
    if (!p) {
      p = makePhrase(this.style, this.rng, chords());
      this.phrases.set(sectionKey, p);
    }
    return p;
  }

  private schedule(time: number) {
    const st = this.style;
    const stepDur = 60 / st.bpm / 4;
    const barIdx = Math.floor(this.step / 16);
    const s = this.step % 16;
    const formBars = st.form.reduce((n, x) => n + x.bars, 0);
    const loop = Math.floor(barIdx / formBars);
    let inForm = barIdx % formBars;
    let sectionIdx = 0;
    while (inForm >= st.form[sectionIdx].bars) {
      inForm -= st.form[sectionIdx].bars;
      sectionIdx++;
    }
    const section = st.form[sectionIdx];
    const chordAt = (bar: number) => st.progression[Math.floor(bar / st.barsPerChord) % st.progression.length];
    const chord = chordAt(inForm);
    const nextChord = chordAt(inForm + 1);
    const t = time + (s % 2 === 1 ? st.swing * stepDur : 0) + (Math.random() - 0.5) * 0.006;

    // Phrase = 2 bars. A phrase is keyed by its position in the chord cycle,
    // so it repeats whenever the same chords come round (call → repeat), and
    // a fresh set is composed each time the form loops: coherent, never identical.
    const phraseStart = inForm - (inForm % 2);
    const cycleBars = st.progression.length * st.barsPerChord;
    const key = `${sectionIdx}-${loop}-${phraseStart % cycleBars}`;
    const melody = (bar: number) => this.melodyFor(key, () => [chordAt(phraseStart), chordAt(phraseStart + 1)])[bar % 2];

    st.play({ k: this.kit, t, s, bar: inForm, section, chord, nextChord, stepDur, rng: this.rng, melody });
  }

  private tick = () => {
    const stepDur = 60 / this.style.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      this.schedule(this.nextTime);
      this.nextTime += stepDur;
      this.step++;
    }
  };

  async start(style: StyleId, volume: number) {
    await this.ctx.resume();
    this.volume = volume;
    this.applyStyle(style);
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this.volume, now + 1.5);
    this.nextTime = now + 0.08;
    clearInterval(this.timer);
    this.timer = setInterval(this.tick, TICK_MS);
  }

  /** Crossfade to another style: duck, switch at a clean point, swell back. */
  setStyle(style: StyleId) {
    if (style === this.style.id) return;
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => {
      this.applyStyle(style);
      this.nextTime = this.ctx.currentTime + 0.05;
      const t = this.ctx.currentTime;
      this.bus.gain.cancelScheduledValues(t);
      this.bus.gain.setValueAtTime(0, t);
      this.bus.gain.linearRampToValueAtTime(1, t + 1.2);
    }, 650);
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.08);
  }

  /** Fade out, stop the scheduler and unplug from the mixer (the shared context stays). */
  async stop() {
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.7);
    await new Promise((r) => setTimeout(r, 750));
    clearInterval(this.timer);
    this.crackle?.stop();
    this.analyser.disconnect();
    this.master.disconnect();
  }
}
