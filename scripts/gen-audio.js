/* eslint-disable */
// Generates placeholder sound effects + a looping ambient music bed as 16-bit
// PCM WAV files into assets/audio/. These are intentionally simple synthesized
// tones so the audio system works out of the box — replace the .wav files with
// real assets later (keep the same filenames and everything keeps working).
//
//   node scripts/gen-audio.js
//
const fs = require("fs");
const path = require("path");

const SR = 22050;
const OUT = path.join(__dirname, "..", "assets", "audio");
fs.mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  const n = samples.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log("wrote", name, (buf.length / 1024).toFixed(0) + "KB");
}

function tone(freq, dur, opts = {}) {
  const { vol = 0.5, attack = 0.005, release = 0.06, type = "sine" } = opts;
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const aN = Math.max(1, attack * SR);
  const rN = Math.max(1, release * SR);
  for (let i = 0; i < n; i++) {
    const ph = (2 * Math.PI * freq * i) / SR;
    let v;
    if (type === "square") v = Math.sin(ph) >= 0 ? 1 : -1;
    else if (type === "tri") v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else v = Math.sin(ph);
    let env = 1;
    if (i < aN) env = i / aN;
    if (i > n - rN) env = Math.max(0, (n - i) / rN);
    out[i] = v * vol * env;
  }
  return out;
}

function noise(dur, vol = 0.3) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = Math.max(0, 1 - i / n);
    out[i] = (Math.random() * 2 - 1) * vol * env;
  }
  return out;
}

function silence(dur) {
  return new Float32Array(Math.floor(dur * SR));
}

function concat(...arrs) {
  const total = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

function mix(...arrs) {
  const len = Math.max(...arrs.map((a) => a.length));
  const out = new Float32Array(len);
  for (const a of arrs) for (let i = 0; i < a.length; i++) out[i] += a[i];
  return out;
}

// --- tap: short soft blip --------------------------------------------------
writeWav("tap.wav", tone(880, 0.05, { vol: 0.35, release: 0.04 }));

// --- ring: classic two-tone telephone ring (440 + 480 Hz) ------------------
const ringBurst = mix(
  tone(440, 0.4, { vol: 0.3, release: 0.05 }),
  tone(480, 0.4, { vol: 0.3, release: 0.05 })
);
writeWav("ring.wav", concat(ringBurst, silence(0.18), ringBurst, silence(0.1)));

// --- dispatch: radio squelch + confirmation beep ---------------------------
writeWav(
  "dispatch.wav",
  concat(noise(0.05, 0.25), tone(1200, 0.13, { vol: 0.4, type: "square" }))
);

// --- success: rising C-E-G chime -------------------------------------------
writeWav(
  "success.wav",
  concat(
    tone(523.25, 0.12, { vol: 0.4 }),
    tone(659.25, 0.12, { vol: 0.4 }),
    tone(783.99, 0.22, { vol: 0.45 })
  )
);

// --- fail: descending buzzer -----------------------------------------------
writeWav(
  "fail.wav",
  concat(
    tone(330, 0.16, { vol: 0.3, type: "tri" }),
    tone(220, 0.3, { vol: 0.3, type: "tri" })
  )
);

// --- music-lobby: 6s seamless ambient pad (low, tense, loopable) -----------
(function () {
  const dur = 6;
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  // chord: A2, E3, A3 with a slow tremolo that completes whole cycles so the
  // loop is seamless (3 full LFO cycles over 6s = 0.5 Hz)
  const freqs = [110, 164.81, 220];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const lfo = 0.5 + 0.5 * Math.sin((2 * Math.PI * 0.5 * i) / SR);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    v /= freqs.length;
    out[i] = v * 0.22 * (0.4 + 0.6 * lfo);
  }
  writeWav("music-lobby.wav", out);
})();

console.log("done →", OUT);
