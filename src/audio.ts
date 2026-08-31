// All sound is synthesised. A game that has to load a music file has a first
// second where it is silent and a deploy that can 404; an oscillator has
// neither. The bed is a slow four-chord loop under a pentatonic arpeggio, so
// nothing it plays can clash with anything else it plays.

const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic, semitones
const ROOTS = [0, -2, 3, -4]; // chord roots, one per bar

function hz(semitonesFromA2: number): number {
  return 110 * Math.pow(2, semitonesFromA2 / 12);
}

export interface Audio {
  /** Must be called synchronously inside the first user gesture. */
  resume(): void;
  music(on: boolean): void;
  engine(throttle: number, speed: number): void;
  thump(force: number): void;
  chime(): void;
  sting(kind: "flipped" | "out-of-fuel" | "arrived"): void;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let musicGain: GainNode;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode;
  let engineFilter: BiquadFilterNode;
  let timer: number | null = null;
  let step = 0;
  let nextTime = 0;

  function ensure(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.85;

    // One shared reverb-ish tail, so every voice sits in the same room.
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    conv.connect(wet).connect(master);
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    musicGain.connect(conv);

    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 420;
    engineOsc = ctx.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 46;
    engineOsc.connect(engineFilter).connect(engineGain).connect(master);
    engineOsc.start();

    return ctx;
  }

  function voice(freq: number, at: number, dur: number, gain: number, type: OscillatorType): void {
    const c = ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    // Never assign gain.value mid-note: pin the ramp to the current value
    // first, or it jumps from a stale scheduled target.
    g.gain.cancelScheduledValues(at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(musicGain);
    o.start(at);
    o.stop(at + dur + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  function schedule(): void {
    const c = ctx!;
    while (nextTime < c.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % ROOTS.length;
      const root = ROOTS[bar];
      if (step % 8 === 0) {
        voice(hz(root - 12), nextTime, 3.6, 0.075, "triangle");
        voice(hz(root - 5), nextTime, 3.6, 0.05, "sine");
      }
      const note = SCALE[(step * 3) % SCALE.length] + root + (step % 16 < 8 ? 12 : 19);
      voice(hz(note), nextTime, 0.5, 0.055, "square");
      nextTime += 0.235;
      step++;
    }
  }

  return {
    resume(): void {
      const c = ensure();
      // Synchronous: iOS will not resume a context from inside a promise
      // continuation, and a first tap that makes no sound wastes the moment.
      void c.resume();
    },
    music(on: boolean): void {
      if (!ctx) return;
      const now = ctx.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(on ? 0.9 : 0, now + (on ? 1.2 : 0.5));
      if (on && timer === null) {
        nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
        timer = window.setInterval(schedule, 90);
      } else if (!on && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    },
    engine(throttle: number, speed: number): void {
      if (!ctx || !engineOsc) return;
      const now = ctx.currentTime;
      const target = 0.02 + throttle * 0.1;
      engineGain.gain.cancelScheduledValues(now);
      engineGain.gain.setValueAtTime(engineGain.gain.value, now);
      engineGain.gain.linearRampToValueAtTime(target, now + 0.08);
      engineOsc.frequency.cancelScheduledValues(now);
      engineOsc.frequency.setValueAtTime(engineOsc.frequency.value, now);
      engineOsc.frequency.linearRampToValueAtTime(38 + speed * 1.9 + throttle * 26, now + 0.1);
      engineFilter.frequency.value = 360 + throttle * 700;
    },
    thump(force: number): void {
      if (!ctx) return;
      const c = ctx;
      const at = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.22);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 200 + force * 240;
      const g = c.createGain();
      g.gain.value = Math.min(0.5, 0.12 + force * 0.3);
      src.connect(f).connect(g).connect(master);
      src.start(at);
      src.onended = () => {
        src.disconnect();
        g.disconnect();
      };
    },
    chime(): void {
      if (!ctx) return;
      const at = ctx.currentTime;
      for (const [i, n] of [12, 19, 24].entries()) {
        voice(hz(n), at + i * 0.055, 0.5, 0.09, "sine");
      }
    },
    sting(kind): void {
      if (!ctx) return;
      const at = ctx.currentTime;
      if (kind === "arrived") {
        for (const [i, n] of [0, 7, 12, 19].entries()) voice(hz(n + 12), at + i * 0.11, 1.1, 0.11, "triangle");
      } else {
        const fall = kind === "flipped" ? [7, 3, 0, -5] : [3, 0, -4, -9];
        for (const [i, n] of fall.entries()) voice(hz(n + 12), at + i * 0.13, 0.8, 0.1, "sawtooth");
      }
    },
  };
}
