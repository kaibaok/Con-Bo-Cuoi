'use strict';
/* Âm thanh tổng hợp bằng WebAudio, không cần tệp ngoài. */
const Sound = (() => {
  let ctx, master, musicG, sfxG, noiseBuf, timer = null, step = 0, nextT = 0, musicOn = true, sfxOn = true;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
    musicG = ctx.createGain(); musicG.gain.value = musicOn ? .38 : 0; musicG.connect(master);
    sfxG = ctx.createGain(); sfxG.gain.value = sfxOn ? 1 : 0; sfxG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  function tone(f, dur, type = 'sine', vol = .2, slide = 0, delay = 0, dest) {
    if (!ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + dur + .03);
  }
  function noise(dur, vol, f0, f1, delay = 0, q = 1.2, dest) {
    if (!ctx) return;
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG);
    s.start(t); s.stop(t + dur + .03);
  }

  const SFX = {
    throw() { noise(.32, .35, 500, 2400, 0, 1.4); tone(300, .18, 'triangle', .06, 2.2); },
    hook() { tone(900, .07, 'square', .12, .6); tone(140, .16, 'sine', .3, .5); noise(.06, .25, 3000, 1500); },
    tick(o = 0) { tone(380 + o * 380, .05, 'square', .07, 1.15); },
    miss() { noise(.18, .15, 1400, 500); },
    warn() { tone(520, .09, 'sawtooth', .07, 1); tone(520, .09, 'sawtooth', .07, 1, .13); },
    struggle() { tone(90, .3, 'sawtooth', .22, .5); noise(.25, .3, 300, 90); },
    catch() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .17, 0, i * .06)); },
    coin() { tone(1320, .09, 'square', .07); tone(1760, .16, 'square', .07, 0, .07); },
    escape() { tone(420, .35, 'sawtooth', .13, .35); noise(.2, .2, 2000, 400); },
    ui() { tone(660, .06, 'triangle', .12); },
    buy() { [660, 880, 1320].forEach((f, i) => tone(f, .12, 'triangle', .14, 0, i * .07)); },
    deny() { tone(180, .16, 'square', .1, .7); tone(150, .2, 'square', .1, .7, .1); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .28, 'triangle', .17, 0, i * .11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .3, 'triangle', .15, .98, i * .14)); },
    start() { tone(392, .12, 'triangle', .14); tone(523, .12, 'triangle', .14, 0, .12); tone(784, .3, 'triangle', .16, 0, .24); },
    moo() { tone(130, .55, 'sawtooth', .09, .78); tone(135, .55, 'sawtooth', .05, .8, .02); },
    tink() { tone(1500, .1, 'triangle', .08, 1.5); }
  };
  function play(name, a) { if (!ctx || !sfxOn) return; const f = SFX[name]; if (f) f(a); }

  /* Nhạc nền đồng quê: gam ngũ cung, nhịp nhảy */
  const SC = [262, 294, 330, 392, 440];
  const fq = i => SC[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5));
  const MEL = [
    [5, -1, 7, 6, 5, -1, 3, -1], [4, -1, 6, 5, 4, -1, 2, -1],
    [3, -1, 5, 4, 3, 2, 0, -1], [4, 2, 3, -1, 2, 1, 0, -1]
  ];
  const BASS = [130.8, 110, 87.3, 98];
  function schedule() {
    if (!ctx) return;
    const e = .3;
    while (nextT < ctx.currentTime + .25) {
      const bar = Math.floor(step / 8) % 4, k = step % 8, d = nextT - ctx.currentTime;
      const m = MEL[bar][k];
      if (m >= 0) tone(fq(m), .22, 'triangle', .12, 0, Math.max(0, d), musicG);
      if (k === 0 || k === 4) tone(BASS[bar], .34, 'sine', .22, 0, Math.max(0, d), musicG);
      if (k === 2 || k === 6) tone(BASS[bar] * 1.5, .2, 'sine', .1, 0, Math.max(0, d), musicG);
      if (k % 2 === 1) noise(.05, .05, 6000, 5000, Math.max(0, d), 2, musicG);
      nextT += e * (k % 2 ? 1.12 : .88); // nhịp lắc nhẹ
      step++;
    }
  }
  function startMusic() { if (timer || !ctx) return; nextT = ctx.currentTime + .1; timer = setInterval(schedule, 60); }
  function setMusic(on) { musicOn = on; if (musicG) musicG.gain.setTargetAtTime(on ? .38 : 0, ctx.currentTime, .05); }
  function setSfx(on) { sfxOn = on; if (sfxG) sfxG.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .02); }
  function duck(on) { if (musicG && musicOn) musicG.gain.setTargetAtTime(on ? .14 : .38, ctx.currentTime, .15); }
  return { init, play, setMusic, setSfx, duck };
})();
