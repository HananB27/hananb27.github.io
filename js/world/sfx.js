/** Tiny WebAudio blips for game mode. Off until the player enters the game. */
let ctx;
let enabled = false;
let muted = false;
try {
  muted = localStorage.getItem("hb-muted") === "1";
} catch {
  /* storage blocked: stay unmuted */
}

function tone(freq, start, duration, { type = "square", volume = 0.04, slide = 0 } = {}) {
  if (!enabled || muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq + slide, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  } catch {
    /* audio unavailable */
  }
}

export const sfx = {
  setEnabled(value) {
    enabled = value;
  },
  get muted() {
    return muted;
  },
  setMuted(value) {
    muted = value;
    try {
      localStorage.setItem("hb-muted", value ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  jump: () => tone(300, 0, 0.14, { type: "triangle", slide: 360 }),
  dash: () => tone(180, 0, 0.18, { type: "sawtooth", slide: 520, volume: 0.03 }),
  collect() {
    tone(660, 0, 0.1);
    tone(990, 0.09, 0.16);
  },
  squash() {
    tone(220, 0, 0.12, { type: "sawtooth", slide: -140 });
    tone(520, 0.05, 0.1, { type: "triangle" });
  },
  bump: () => tone(110, 0, 0.18, { type: "sawtooth", slide: -50 }),
  open: () => tone(520, 0, 0.12, { type: "triangle", slide: 400 }),
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, { type: "triangle" }));
  },
};
