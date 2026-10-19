'use strict';
/* Lõi game: bò, dây thòng lọng, kéo bò, vẽ cảnh. Canvas 2D, toạ độ logic 1280x720. */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const SHOULDER = { x: 640, y: 622 }, FEET_Y = 704, ARM = 34;
const LANE_MIN = 262, LANE_MAX = 575, LANE_Y = 440;
const WANDER = { x0: 70, x1: W - 70, y0: 340, y1: 585 };
const DIFF = [.8, 1, 1.25];
const COIN_TARGET = { x: 1110, y: 44 };
const laneScale = y => .66 + (clamp(y, LANE_MIN, LANE_MAX + 40) - LANE_MIN) / (LANE_MAX - LANE_MIN) * .62;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
}

/* ---------- Vẽ bò (dùng cả cho bộ sưu tập) ---------- */
function cowPalette(type) {
  switch (type) {
    case 'small': return { body: '#E3BE8E', spot: '#FFF1D6', leg: '#C79C69' };
    case 'big': return { body: '#8A5B3A', spot: '#F1E2CC', leg: '#6E4429' };
    case 'fast': return { body: '#5C90E4', spot: '#FFFFFF', leg: '#3F6FC0' };
    case 'mad': return { body: '#6C4A3C', spot: '#2B1B16', leg: '#4F342A' };
    case 'red': return { body: '#D93C2D', spot: '#8E2017', leg: '#A82A1E' };
    case 'gold': return { body: '#F4C43D', spot: '#FFE58C', leg: '#D49B1F' };
    case 'rainbow': return { body: '#fff', spot: '#fff', leg: '#C9B6E4' };
    case 'witch': return { body: '#8A5BC0', spot: '#E8DCF5', leg: '#6A3F9E' };
    case 'ghost': return { body: '#D7ECFF', spot: '#F4FAFF', leg: '#B6D4F0' };
    default: return { body: '#F6EBDC', spot: '#9A6A3E', leg: '#D9C6AE' };
  }
}

/* ---------- Bò chibi cử động bằng xương ảo ----------
   Mỗi con là các ảnh rời (assets/cows/rig). Mỗi khung hình ghép lại và xoay quanh khớp: bước đi, thở, cúi đầu gặm cỏ,
   vung tay khi bị bắt, cộng thêm vài động tác ngẫu nhiên (nhảy, vẫy tay, nhìn quanh, vươn vai, nhún nhảy). */
const RIG_CW = 299, RIG_CH = 394, RIG_IDX = { back: 0, tail: 1, legL: 2, legR: 3, body: 4, armL: 5, armR: 6, head: 7, glow: 8 };
const RIG_TUNE = {
  small: { rate: 1.5, amp: 1.2, hop: 1 }, big: { rate: .8, amp: .85, stomp: 1 }, fast: { rate: 2.4, amp: 1.4, lean: .12 },
  mad: { rate: 1.3, amp: 1, jit: 1 }, red: { rate: 1.2, amp: 1, paw: 1 }, gold: { rate: 1, amp: .9, glint: 1 },
  rainbow: { rate: 1.3, amp: 1, hue: 1, glint: 1 }, witch: { rate: 1, amp: .5, float: 1 }, ghost: { rate: .8, amp: .4, float: 1, ghost: 1 }
};
const RIG_ACTS = { hop: .75, wave: 1.7, look: 1.6, stretch: 1.5, dance: 2.2 };

function rigPose(o, T, upset) {
  const t = o.t || 0, A = T.amp || 1, p = {
    bx: 0, by: 0, brot: 0, bsx: 1, bsy: 1, hrot: 0, hy: 0, rotR: 0, rotL: 0, lLy: 0, lRy: 0, lLr: 0, lRr: 0, trot: 0, krot: 0
  };
  const sq = o.squash || 0, moving = o.moving !== false;
  if (upset) {
    const yell = o.mood === 'yell', f = yell ? 1 : .55, fl = Math.sin(t * (yell ? 16 : 9)), fl2 = Math.sin(t * (yell ? 16 : 9) + 1.9);
    p.bx = Math.sin(t * 41) * 2.2 * f; p.by = Math.sin(t * 33) * 1.4 * f; p.brot = Math.sin(t * 23) * .035 * f;
    p.rotR = fl * .5 * f; p.rotL = -fl2 * .5 * f; p.hrot = Math.sin(t * (yell ? 30 : 12)) * (yell ? .09 : .04);
    p.lLy = -Math.max(0, Math.sin(t * 14)) * 7 * f; p.lRy = -Math.max(0, -Math.sin(t * 14)) * 7 * f; p.lLr = -.1; p.lRr = .1;
    p.trot = Math.sin(t * 20) * .6; p.krot = Math.sin(t * 11) * .08;
  } else if (moving) {
    const w = (o.walk || 0) * (T.rate || 1) * 1.8, sn = Math.sin(w);
    p.by = -Math.abs(sn) * 5 * A * (T.hop ? 2.4 : 1); p.brot = sn * .05 * A + (T.lean || 0);
    p.bsy = 1 - .035 * A * Math.max(0, -Math.cos(2 * w)) * (T.stomp ? 2 : 1); p.bsx = 1 + (1 - p.bsy) * .8;
    p.rotR = -.55 * sn * A; p.rotL = -.55 * sn * A;
    p.hrot = -sn * .06 + Math.sin(t * 1.7) * .02; p.hy = -Math.abs(Math.sin(w + .6)) * 2;
    p.lLy = -Math.max(0, sn) * 13 * A; p.lRy = -Math.max(0, -sn) * 13 * A; p.lLr = sn * .12 * A; p.lRr = sn * .12 * A;
    if (T.paw) { p.lRy = Math.min(p.lRy, -Math.max(0, Math.sin(t * 3)) * 18); p.lRr = Math.sin(t * 3) * .2; }
    p.trot = Math.sin(w + 1) * .45 + Math.sin(t * 5) * .1; p.krot = Math.sin(w + .9) * .05;
  } else {
    p.bsy = 1 + .018 * Math.sin(t * 2.2); p.by = -(p.bsy - 1) * 40;
    p.rotR = -Math.sin(t * 1.6) * .07; p.rotL = Math.sin(t * 1.6 + 1) * .07; p.hrot = Math.sin(t * 1.3) * .04; p.trot = Math.sin(t * 2.4) * .3;
    if (o.headDip) { p.hy = 11 + Math.sin(t * 9) * 2; p.hrot += .04; }
  }
  if (!upset && T.float) {
    p.by += Math.sin(t * 2.2) * 5 - 4; p.lLr = Math.sin(t * 2.4) * .18; p.lRr = Math.sin(t * 2.4 + 1) * .18; p.lLy = p.lRy = 0;
    p.krot = Math.sin(t * 2.6) * .07; if (T.ghost) p.brot = Math.sin(t * 1.8) * .05;
  }
  if (T.jit) { p.bx += Math.sin(t * 37) * 1.6; p.brot += Math.sin(t * 29) * .02; }
  if (sq) { p.bsy *= 1 - .08 * sq; p.bsx *= 1 + .06 * sq; }
  // động tác ngẫu nhiên khi bò đang bình thường
  const ap = o.actT || 0, e = Math.min(1, ap * 6, (1 - ap) * 6);
  if (!upset && o.act === 'hop') {
    const s = Math.sin(ap * Math.PI);
    p.by -= s * 34; if (ap < .15) { p.by += (1 - ap / .15) * 6; p.bsy *= .92; } else p.bsy *= 1 + .06 * s;
    p.lLy -= s * 10; p.lRy -= s * 10; p.rotR = -s * 2.4; p.rotL = s * 2.4;
  } else if (!upset && o.act === 'wave') { p.rotR = -(2.5 + Math.sin(t * 14) * .35) * e + p.rotR * (1 - e); p.hrot += .08 * e; }
  else if (!upset && o.act === 'look') p.hrot += Math.sin(ap * Math.PI * 2) * .22;
  else if (!upset && o.act === 'stretch') { const s = Math.sin(ap * Math.PI); p.rotR = -2.7 * s; p.rotL = 2.7 * s; p.bsy *= 1 + .06 * s; p.hy -= 3 * s; }
  else if (!upset && o.act === 'dance') {
    const s = Math.sin(t * 13);
    p.brot += s * .1 * e; p.by -= Math.abs(s) * 6 * e; p.rotR += -1.6 * e * (.5 + .5 * s); p.rotL += 1.6 * e * (.5 - .5 * s);
  }
  return p;
}

/* ---------- Mặt bò hoạt hình (kiểu mặc định): dễ thương, siêu quậy, khó chịu ----------
   Vẽ đè lên khung mặt tròn của ảnh đầu, xoay theo đầu. Toạ độ tính từ tâm khung mặt, theo đơn vị ảnh rig. */
const FACES = {
  normal: { skin: '#FFF3E2', a: 60, b: 70, eye: 'derp', mouth: 'tongue', brow: 'raise', horn: 1 },
  small: { skin: '#FFF0E6', a: 60, b: 70, eye: 'sparkle', mouth: 'buck', brow: 'soft' },
  big: { skin: '#C99467', a: 50, eye: 'half', mouth: 'smirk', brow: 'flat' },
  fast: { skin: '#FFFFFF', a: 50, eye: 'cross', mouth: 'grin', brow: 'raise', band: 1 },
  mad: { skin: '#A98BD3', a: 50, eye: 'angry', mouth: 'fang', brow: 'angry' },
  red: { skin: '#F07A68', a: 50, eye: 'angry', mouth: 'fang', brow: 'angry' },
  gold: { skin: '#FFDF7A', a: 50, eye: 'half', mouth: 'smirk', brow: 'raise', gold: 1 },
  rainbow: { skin: '#FFFFFF', a: 50, eye: 'wink', mouth: 'tongue', brow: 'soft', rainbow: 1 },
  witch: { skin: '#E4D3F5', a: 50, eye: 'slant', mouth: 'cackle', brow: 'angry', hat: 1 },
  ghost: { skin: '#EAF6FF', a: 50, eye: 'hollow', mouth: 'oh', brow: 'worry' }
};
function drawFace(c, o, upset, U, X, Y) {
  const F = FACES[o.type] || FACES.normal, a = F.a, b = F.b || 65, t = o.t || 0, ph = o.ph || 0, yell = o.mood === 'yell';
  const INK = '#2a1830', blink = !upset && (t + ph) % 3.6 < .13;
  c.save(); c.translate(X(150), Y(152)); c.scale(U, U); c.lineCap = 'round'; c.lineJoin = 'round';
  const ell = (x, y, rx, ry, fill, stroke, lw = 3, rot = 0) => {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  };
  const line = (x1, y1, x2, y2, lw, col = INK) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  if (F.horn) for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(s * 30, -58); c.quadraticCurveTo(s * 44, -66, s * 46, -92); c.quadraticCurveTo(s * 28, -80, s * 18, -62); c.closePath();
    c.fillStyle = '#FFF1CF'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  }
  ell(0, 0, a, b, F.skin, INK, 4);
  // mõm hồng + lỗ mũi
  ell(0, 33, a * .5, 17, '#F8B4AA', INK, 3);
  const nw = upset ? 1.15 + (yell ? .25 : 0) : 1 + .12 * Math.sin(t * 6 + ph);
  ell(-8, 30, 3 * nw, 4.2, '#8a3f46'); ell(8, 30, 3 * nw, 4.2, '#8a3f46');
  // má hồng
  ell(-a * .7, 12, 10, 6, 'rgba(255,80,110,.42)'); ell(a * .7, 12, 10, 6, 'rgba(255,80,110,.42)');
  // mắt
  const ex = a * .4, ey = -14, wob = k => Math.sin(t * 1.7 + ph + k) * 3.2, jit = Math.sin(t * 40) * 1.2;
  const eyes = F.eye;
  if (upset) {
    const f = yell ? 1 : .6;
    for (const s of [-1, 1]) {
      const x = s * ex;
      if (yell || eyes === 'angry') { // mắt nhắm tịt hình > <, nước mắt phun
        c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x - s * 11, ey - 9); c.lineTo(x + s * 9, ey); c.lineTo(x - s * 11, ey + 9); c.stroke();
        const d = (t * 2.4 + (s > 0 ? .5 : 0)) % 1; ell(x + s * (14 + d * 22), ey + 6 + d * 18, 3.6 * (1 - d * .5), 5 * (1 - d * .5), 'rgba(138,211,236,' + (1 - d) + ')');
      } else { // mắt tròn xoe hoảng hốt, đồng tử tí xíu rung
        ell(x, ey, 14, 15, '#fff', INK, 3); ell(x + jit, ey + Math.sin(t * 33) * 1.4, 3.6, 3.6, INK);
      }
    }
    line(-ex - 12, ey - 31, -ex + 10, ey - 18 - 3 * f, 5); line(ex + 12, ey - 31, ex - 10, ey - 18 - 3 * f, 5);
    // mồm la hét, lưỡi vẫy
    const open = (yell ? 17 : 10) + Math.sin(t * (yell ? 30 : 16)) * 3;
    ell(0, 52, 19, open, '#5a0f1f', INK, 3.5);
    c.save(); c.beginPath(); c.ellipse(0, 52, 19, open, 0, 0, TAU); c.clip();
    ell(Math.sin(t * 22) * 4, 52 + open * .75, 12, 9, '#F2788A');
    c.fillStyle = '#fff'; c.fillRect(-12, 52 - open, 10, 7); c.fillRect(2, 52 - open, 10, 7); c.restore();
    ell(0, 52, 19, open, null, INK, 3.5);
    if (yell) { const d = (t * 2.6) % 1; ell(a * .95, -40 + d * 20, 4, 6.5, 'rgba(138,211,236,' + (1 - d * .6) + ')', INK, 2); }
  } else {
    // lông mày
    const brow = (s, k, dy = 0) => line(s * (ex + 11), ey - 22 + dy + k, s * (ex - 11), ey - 22 + dy - k, 5);
    if (F.brow === 'angry') { brow(-1, -8); brow(1, -8); }
    else if (F.brow === 'raise') { brow(-1, 1, -2); brow(1, -3, -9 + Math.sin(t * 3 + ph) * 2); }
    else if (F.brow === 'flat') { brow(-1, 0, 2); brow(1, 0, 2); }
    else if (F.brow === 'worry') { brow(-1, 6); brow(1, 6); }
    else { brow(-1, 2, -3); brow(1, 2, -3); }
    for (const s of [-1, 1]) {
      const x = s * ex, wk = s > 0 ? 1.7 : 0;
      if (blink || (eyes === 'wink' && s > 0)) {
        c.strokeStyle = INK; c.lineWidth = 4.5; c.beginPath();
        if (eyes === 'wink') { c.moveTo(x - 11, ey + 3); c.quadraticCurveTo(x, ey - 10, x + 11, ey + 3); } else { c.moveTo(x - 11, ey); c.quadraticCurveTo(x, ey + 7, x + 11, ey); }
        c.stroke(); continue;
      }
      if (eyes === 'sparkle') {
        ell(x, ey, 16, 18, '#fff', INK, 3); ell(x + wob(wk) * .3, ey + 2, 11, 13, '#2b1b3a'); ell(x - 3, ey - 3, 4.6, 5, '#fff'); ell(x + 4, ey + 6, 2.4, 2.4, '#fff');
      } else if (eyes === 'derp') {
        ell(x, ey, 14, 15, '#fff', INK, 3); ell(x + wob(wk * 2), ey + wob(wk) * .8, 5.6, 5.6, INK); ell(x + wob(wk * 2) - 1.6, ey + wob(wk) * .8 - 2, 1.8, 1.8, '#fff');
      } else if (eyes === 'cross') {
        ell(x, ey, 14, 15, '#fff', INK, 3); ell(x - s * 6 + Math.sin(t * 9 + wk) * 1.2, ey + 2, 5.6, 5.6, INK);
      } else if (eyes === 'angry') {
        ell(x, ey, 14, 14, '#FFE3E0', INK, 3); ell(x + s * 2, ey + 2, 4.4, 4.4, '#1b0f0c');
        c.strokeStyle = '#d02a22'; c.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) { const an = i * 1.5 + .4; c.beginPath(); c.moveTo(x + Math.cos(an) * 13, ey + Math.sin(an) * 13); c.lineTo(x + Math.cos(an) * 8, ey + Math.sin(an) * 8); c.stroke(); }
      } else if (eyes === 'slant') {
        ell(x, ey + 2, 14, 11, '#fff', INK, 3, s * .35); ell(x + wob(wk) * .3, ey + 3, 4.6, 6.4, '#2dc653');
      } else if (eyes === 'hollow') {
        ell(x, ey, 15, 17, '#fff', INK, 3); ell(x + wob(wk) * .4, ey + 2, 8, 10, '#14091f'); ell(x - 2, ey - 2, 2.6, 2.6, '#fff');
      } else { // half: mắt lờ đờ khinh khỉnh, đảo mắt
        ell(x, ey, 14, 15, '#fff', INK, 3); ell(x + Math.sin(t * 1.1 + ph) * 6, ey + 2, 5.4, 5.6, INK);
        c.save(); c.beginPath(); c.ellipse(x, ey, 14, 15, 0, 0, TAU); c.clip(); c.fillStyle = F.skin; c.fillRect(x - 16, ey - 17, 32, 17); c.restore();
        line(x - 14, ey - 1, x + 14, ey - 1, 4);
      }
    }
    // miệng
    const my = 46, m = F.mouth;
    if (m === 'cackle') {
      const op = 10 + Math.abs(Math.sin(t * 6 + ph)) * 5; ell(0, my + 6, 20, op, '#4a0f35', INK, 3.4);
      c.save(); c.beginPath(); c.ellipse(0, my + 6, 20, op, 0, 0, TAU); c.clip(); c.fillStyle = '#fff'; c.fillRect(-14, my + 6 - op, 28, 7); ell(0, my + 6 + op * .8, 11, 7, '#F2788A'); c.restore();
    } else if (m === 'oh') {
      ell(0, my + 8, 11, 11 + Math.sin(t * 3 + ph) * 3, '#14091f', INK, 3);
    } else {
      c.strokeStyle = INK; c.lineWidth = 3.6; c.beginPath();
      if (m === 'smirk') { c.moveTo(-14, my + 2); c.quadraticCurveTo(2, my + 6, 16, my - 6); }
      else if (m === 'grin' || m === 'fang') { c.moveTo(-20, my - 2); c.quadraticCurveTo(0, my + 20, 20, my - 2); c.closePath(); c.fillStyle = '#6e1220'; c.fill(); }
      else { c.moveTo(-14, my); c.quadraticCurveTo(0, my + 9, 14, my); }
      c.stroke();
      if (m === 'grin') { c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-20, my - 3, 40, 8); c.restore(); }
      if (m === 'fang') { c.fillStyle = '#fff'; c.lineWidth = 2.4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 13 - 4, my - 1); c.lineTo(s * 13 + 4, my - 1); c.lineTo(s * 13, my + 11); c.closePath(); c.fill(); c.stroke(); } }
      if (m === 'buck') { c.fillStyle = '#fff'; c.lineWidth = 2.6; for (const s of [-1, 0]) { rr(c, s * 8 - 1, my + 3, 9, 12, 2); c.fill(); c.stroke(); } }
      if (m === 'tongue') {
        const w = Math.sin(t * 7 + ph) * 3;
        c.beginPath(); c.moveTo(1, my + 5); c.lineTo(1, my + 17); c.quadraticCurveTo(10 + w, my + 30, 18 + w, my + 16); c.lineTo(13, my + 4); c.closePath();
        c.fillStyle = '#F2788A'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); line(10 + w * .5, my + 7, 12 + w * .8, my + 17, 2, '#c24a5e');
      }
      if (m === 'smirk' && F.gold) { c.fillStyle = '#FFD54A'; rr(c, 3, my - 1, 7, 8, 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); }
      if (m === 'smirk' && !F.gold) ell(15 + Math.sin(t * 2 + ph) * .8, my + 4, 4, 3.4, '#F2788A', INK, 2);
    }
  }
  // phụ kiện bị khuôn mặt đè lên
  if (F.band) { c.fillStyle = '#EF2F3F'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -52, -58, 104, 17, 4); c.fill(); c.stroke(); }
  if (F.hat) {
    c.fillStyle = '#F08A24'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -40, -80, 80, 15, 3); c.fill(); c.stroke();
    ell(0, -57, 72, 11, '#4B2D7F', INK, 3.4);
  }
  if (F.rainbow) { c.lineWidth = 5; c.lineCap = 'butt'; ['#F33', '#FA3', '#FE4', '#4D5', '#39F', '#74F'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(0, -26, 60 - i * 5, Math.PI, TAU); c.stroke(); }); }
  c.restore();
}

function drawRig(c, o, A, upset) {
  const def = COWS[o.type], R = RIG[o.type], T = RIG_TUNE[o.type] || {}, k0 = def.skinK || 1.23, U = 140 * k0 / RIG_CH, hw = R.hw;
  const t = o.t || 0, p = rigPose(o, T, upset), tp = upset ? (R.tailH || R.tail) : R.tail;
  const X = x => (x - RIG_CW / 2) * U, Y = y => (y - RIG_CH) * U;
  const img = k => c.drawImage(A, RIG_IDX[k] * RIG_CW, 0, RIG_CW, RIG_CH, X(0), Y(0), RIG_CW * U, RIG_CH * U);
  const joint = (px, py, tx, ty, rot, fn, sx = 1, sy = 1) => {
    c.save(); c.translate(X(px) + tx * U, Y(py) + ty * U); c.rotate(rot); c.scale(sx, sy); c.translate(-X(px), -Y(py)); fn(); c.restore();
  };
  if (T.ghost) { c.save(); c.globalAlpha *= .55 + .3 * Math.sin(t * 2.6); img('glow'); c.restore(); }
  joint(150 - hw * .45, 318, 0, p.lLy, p.lLr, () => img('legL'));
  joint(150 + hw * .45, 318, 0, p.lRy, p.lRr, () => img('legR'));
  joint(150, 328, p.bx, p.by, p.brot, () => {
    joint(150, 230, 0, 0, p.krot, () => img('back'));
    joint(tp[0], tp[1], 0, 0, p.trot, () => img('tail'));
    if (T.hue) { c.save(); try { c.filter = 'hue-rotate(' + Math.round((t * 70) % 360) + 'deg)'; } catch (e) { /* trình duyệt cũ */ } img('body'); c.restore(); } else img('body');
    joint(150 + (hw - 4), 238, 0, 0, p.rotR, () => img('armR'));
    joint(150 - (hw - 4), 238, 0, 0, p.rotL, () => img('armL'));
    joint(150, 214, 0, p.hy, p.hrot, () => { img('head'); if (!CLASSIC) drawFace(c, o, upset, U, X, Y); });
  }, p.bsx, p.bsy);
  if (T.glint) {
    c.save(); c.fillStyle = T.hue ? '#fff' : '#FFF6C4';
    for (let i = 0; i < 4; i++) {
      const a = t * .9 + i * 1.57, k = .5 + .5 * Math.sin(t * 3.1 + i * 2.3), x = X(150 + Math.cos(a) * 92), y = Y(210 + Math.sin(a * 1.3) * 120), s = (3 + 6 * k) * U * 2.2;
      c.globalAlpha = (o.alpha == null ? 1 : o.alpha) * k;
      c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * .5, y - s * .5); c.lineTo(x + s * 2, y); c.lineTo(x + s * .5, y + s * .5); c.lineTo(x, y + s * 2); c.lineTo(x - s * .5, y + s * .5); c.lineTo(x - s * 2, y); c.lineTo(x - s * .5, y - s * .5); c.closePath(); c.fill();
    }
    c.restore();
  }
}

function drawCow(c, o) {
  const P = cowPalette(o.type), s = o.s, f = o.face || 1, t = o.t || 0;
  const moving = o.moving !== false, sq = o.squash || 0;
  const mood = o.mood || 'calm', upset = mood !== 'calm';
  c.save();
  c.translate(o.x, o.y);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  // bóng
  c.fillStyle = 'rgba(20,60,25,.3)';
  c.beginPath(); c.ellipse(0, 3 * s, 66 * s, 12 * s, 0, 0, TAU); c.fill();
  // bò bay: bóng ở lại mặt đất, thân nâng lên
  if (o.lift) c.translate(0, -o.lift);
  // hào quang
  const cy = -62 * s;
  if (o.type === 'red' || o.type === 'mad' || o.type === 'gold') {
    const col = o.type === 'gold' ? '255,214,70' : o.type === 'red' ? '255,70,40' : '200,40,30';
    const a = (o.type === 'mad' ? .28 : .5) + Math.sin(t * 6) * .08;
    const g = c.createRadialGradient(0, cy, 10 * s, 0, cy, 120 * s);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(0, cy, 120 * s, 0, TAU); c.fill();
  }
  if (o.type === 'rainbow') {
    c.lineWidth = 5 * s; c.globalAlpha = (o.alpha == null ? 1 : o.alpha) * .55;
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = `hsl(${(t * 90 + i * 60) % 360},95%,62%)`;
      c.beginPath(); c.arc(0, cy + 10 * s, (92 + i * 6) * s, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    }
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  }
  c.scale(f * s * (1 + .05 * sq), s * (1 - .05 * sq));
  if (o.tilt) c.rotate(o.tilt);

  // vệt tốc độ
  if (o.type === 'fast' && moving) {
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = -40 - i * 22, L = 34 + ((t * 120 + i * 40) % 40);
      c.beginPath(); c.moveTo(-64, y); c.lineTo(-64 - L, y); c.stroke();
    }
  }

  // bò mới của Bắn Bò: cưỡi phương tiện hoặc mặc đồ, vẽ riêng
  if (COWS[o.type] && COWS[o.type].rider) { drawRider(c, o); c.restore(); return; }
  // bò chibi cử động bằng xương ảo (nếu có đủ ảnh bộ phận và người chơi chưa chọn ảnh riêng)
  const rigAtlas = typeof RIG !== 'undefined' && RIG[o.type] ? Skins.rig(o.type, upset) : null;
  if (rigAtlas) { drawRig(c, o, rigAtlas, upset); c.restore(); return; }
  // hình do người chơi chọn thay cho bò vẽ sẵn
  const skin = Skins.get(o.type, upset);
  if (skin) {
    const sw0 = o.walk || 0, k0 = (COWS[o.type] && COWS[o.type].skinK) || 1, h = 140 * k0;
    /* bảng ảnh nhiều khung: bước chân theo nhịp đi, giãy nhanh khi bị bắt, thở chậm khi đứng */
    const nf = Skins.frames(o.type, skin), cw = skin.width / nf;
    const fi = nf > 1 ? (upset ? Math.floor(t * 12) : moving ? Math.floor(Math.abs(sw0) / (Math.PI / 4)) : Math.floor(t * 2.5)) % nf : 0;
    const w = Math.min(190 * k0, h * cw / skin.height);
    c.save();
    c.rotate((moving ? Math.sin(sw0) * .04 : 0) + (upset ? Math.sin(t * 40) * .035 : 0));
    c.translate(0, moving && nf === 1 && !(COWS[o.type] && COWS[o.type].fly) ? -Math.abs(Math.sin(sw0)) * 7 : 0);
    if (Skins.flip(o.type)) c.scale(-1, 1);
    if (Skins.oval(o.type)) { c.beginPath(); c.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, TAU); c.clip(); }
    const paint = (ox, a) => { const ga = c.globalAlpha; c.globalAlpha = ga * a; c.drawImage(skin, fi * cw, 0, cw, skin.height, -w / 2 + ox, -h, w, h); c.globalAlpha = ga; };
    if (o.type === 'fast' && moving && !upset) { paint(-46, .16); paint(-24, .3); }   // bóng mờ khi chạy nhanh
    paint(0, 1);
    c.restore();
    if (upset) {
      c.strokeStyle = '#E5382B'; c.lineWidth = 5; c.lineCap = 'round';
      const x = 40, y = -h / (((COWS[o.type] && COWS[o.type].skinK) || 1)) - 8;
      c.beginPath(); c.moveTo(x - 8, y - 6); c.quadraticCurveTo(x, y - 2, x - 8, y + 6); c.moveTo(x + 6, y - 6); c.quadraticCurveTo(x - 2, y - 2, x + 6, y + 6); c.stroke();
    }
    c.restore();
    return;
  }
  // chân
  const sw = o.walk || 0, amp = moving ? .55 : .08;
  const hips = [[-38, 0, 1], [-22, Math.PI, 0], [24, Math.PI, 1], [40, 0, 0]];
  hips.forEach(([hx, off, far]) => {
    c.save(); c.translate(hx, -44); c.rotate(Math.sin(sw + off) * amp);
    c.fillStyle = far ? P.leg : (o.type === 'rainbow' ? '#d7c6ef' : P.body);
    rr(c, -6.5, 0, 13, 45, 5); c.fill();
    c.fillStyle = '#3a2a22'; rr(c, -7, 38, 14, 8, 3); c.fill();
    c.restore();
  });

  // đuôi
  const tw = Math.sin(t * 5 + (o.ph || 0)) * 10;
  c.strokeStyle = o.type === 'rainbow' ? '#b9a0e8' : P.leg; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-54, -80); c.quadraticCurveTo(-72 + tw * .3, -76, -70 + tw, -48); c.stroke();
  c.fillStyle = '#3a2a22'; c.beginPath(); c.ellipse(-70 + tw, -44, 6, 10, 0, 0, TAU); c.fill();

  // thân
  let body = P.body;
  if (o.type === 'rainbow') {
    body = c.createLinearGradient(-56, -66, 56, -66);
    for (let i = 0; i <= 5; i++) body.addColorStop(i / 5, `hsl(${(t * 70 + i * 55) % 360},90%,68%)`);
  }
  c.save();
  c.beginPath(); c.ellipse(0, -66, 56, 35, 0, 0, TAU);
  c.fillStyle = body; c.fill();
  c.clip();
  c.fillStyle = P.spot;
  [[-24, -78, 17, 13, .3], [14, -50, 15, 12, -.2], [30, -86, 12, 9, 0], [-46, -52, 13, 10, .5]].forEach(([x, y, a, b, r]) => {
    if (o.type === 'rainbow') return;
    c.beginPath(); c.ellipse(x, y, a, b, r, 0, TAU); c.fill();
  });
  if (o.type === 'gold') {
    const bx = ((t * 90) % 220) - 80, g = c.createLinearGradient(bx - 20, 0, bx + 20, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-60, -110, 120, 90);
  }
  c.fillStyle = 'rgba(40,20,0,.16)'; c.beginPath(); c.ellipse(0, -38, 58, 15, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-4, -92, 40, 9, 0, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 4.5;
  c.beginPath(); c.ellipse(0, -66, 56, 35, 0, 0, TAU); c.stroke();
  c.fillStyle = '#F4A8A0'; c.beginPath(); c.ellipse(-8, -33, 10, 6, 0, 0, TAU); c.fill();

  // cổ + đầu
  const bob = Math.sin(t * 6 + (o.ph || 0)) * (moving ? 1.8 : .6) + (o.headDip || 0);
  c.fillStyle = body; c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 4.5;
  c.beginPath(); c.ellipse(46, -74 + bob * .5, 22, 25, .3, 0, TAU); c.fill();
  // tai
  c.fillStyle = o.type === 'rainbow' ? '#d9c2f5' : P.leg;
  c.beginPath(); c.ellipse(50, -102 + bob, 13, 6.5, -.6, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#F4A8A0'; c.beginPath(); c.ellipse(50, -102 + bob, 7, 3, -.6, 0, TAU); c.fill();
  // sừng
  const hs = (o.type === 'mad' || o.type === 'big' || o.type === 'red') ? 1.35 : 1;
  c.fillStyle = '#FFF1CF'; c.strokeStyle = 'rgba(80,50,20,.55)'; c.lineWidth = 2.5;
  const hx = 64 + (hs - 1) * 12, hy = -114 - (hs - 1) * 20;
  c.beginPath(); c.moveTo(58, -102 + bob); c.quadraticCurveTo(55, -110 + bob, hx, hy + bob); c.quadraticCurveTo(70, -108 + bob, 68, -100 + bob); c.closePath(); c.fill(); c.stroke();
  // đầu
  c.save(); c.translate(70, -82 + bob); c.rotate(.12 + (o.headTilt || 0)); c.scale(1.22, 1.22);
  c.fillStyle = body; c.beginPath(); c.ellipse(0, 0, 26, 22, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 4.5; c.stroke();
  c.fillStyle = '#F5B7A8'; c.beginPath(); c.ellipse(15, 10, 15, 12, 0, 0, TAU); c.fill(); c.stroke();
  if (upset) {
    const open = mood === 'yell' ? 11 : 6;
    c.fillStyle = '#6e1220'; c.beginPath(); c.ellipse(17, 16, 11, open, .1, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#fff'; rr(c, 8, 10.5, 7, 6, 2); c.fill(); rr(c, 16.5, 10.5, 7, 6, 2); c.fill();
    if (mood === 'yell') { c.fillStyle = '#F2788A'; c.beginPath(); c.ellipse(17, 22, 7, 4.5, 0, 0, TAU); c.fill(); }
  }
  c.fillStyle = '#9b4f4a'; c.beginPath(); c.ellipse(21, 8, 2.2, 3, 0, 0, TAU); c.ellipse(13, 12, 2.2, 3, 0, 0, TAU); c.fill();
  // mắt
  const angry = o.type === 'mad' || o.type === 'red' || upset;
  const blink = (t * 1.0 + (o.ph || 0)) % 3.2 < .12;
  if (blink) { c.strokeStyle = '#2b1b16'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -6); c.lineTo(10, -6); c.stroke(); }
  else if (angry) {
    c.fillStyle = '#FFE3E0'; c.beginPath(); c.arc(5, -6, upset ? 11.5 : 9.5, 0, TAU); c.fill(); c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#d02a22'; c.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + .3; c.beginPath(); c.moveTo(5 + Math.cos(a) * 9, -6 + Math.sin(a) * 9); c.lineTo(5 + Math.cos(a) * 5, -6 + Math.sin(a) * 5); c.stroke(); }
    c.fillStyle = '#1b0f0c'; c.beginPath(); c.arc(7, -6, upset ? 2.6 : 3.2, 0, TAU); c.fill();
    c.strokeStyle = '#2b1b16'; c.lineWidth = upset ? 7 : 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8, upset ? -24 : -19); c.lineTo(17, -12); c.stroke();
  } else {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(5, -6, 9, 0, TAU); c.fill(); c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#1b0f0c'; c.beginPath(); c.arc(7.5, -5.5, 4.6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(8.8, -7, 1.3, 0, TAU); c.fill();
  }
  c.restore();
  // gân giận dữ
  if (upset) {
    const d = (t * 2.2) % 1;
    c.fillStyle = '#8AD3EC'; c.strokeStyle = 'rgba(45,20,25,.8)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(92, -112 + d * 16); c.quadraticCurveTo(100, -100 + d * 16, 92, -94 + d * 16); c.quadraticCurveTo(84, -100 + d * 16, 92, -112 + d * 16); c.fill(); c.stroke();
  }
  if (o.type === 'mad' || upset) {
    c.strokeStyle = '#E5382B'; c.lineWidth = 4; c.lineCap = 'round';
    const x = 56, y = -116 + bob;
    c.beginPath(); c.moveTo(x - 6, y - 6); c.quadraticCurveTo(x, y - 2, x - 6, y + 4); c.moveTo(x + 4, y - 6); c.quadraticCurveTo(x - 2, y - 2, x + 4, y + 4); c.stroke();
  }
  c.restore();
}

/* ---------- Thực thể bò ---------- */
class Cow {
  constructor(type, x, y, dir, vmul) {
    this.id = ++Cow.n; this.type = type; this.def = COWS[type];
    this.x = x; this.y = y; this.laneY = y; this.dir = dir; this.face = dir; this.vmul = vmul;
    this.state = 'walk'; this.walk = rnd(0, TAU); this.ph = rnd(0, TAU);
    this.graze = 0; this.grazeCd = rnd(1.5, 5); this.boost = 0; this.squash = 0;
    this.rewarded = false; this.cap = 0; this.vx = 0; this.tilt = 0; this.dust = 0;
    this.act = null; this.actT = 0; this.actDur = 1; this.actCd = rnd(1.5, 4);
  }
  get s() { return laneScale(this.y) * this.def.size * .92; }
  /* độ cao khi bay: thấp xuống khi bị dây móc, lên xuống nhẹ theo nhịp */
  lift() { const f = this.def.fly; if (!f) return 0; return f * this.s * (1 + .16 * Math.sin(this.fp || 0)) * (this.state === 'walk' ? 1 : .45); }
  center() { return { x: this.x, y: this.y - (this.def.cy || 62) * this.s - this.lift() }; }
  radius() { return (this.def.hr || 46) * this.s; }
  hasSkin() { return !!Skins.get(this.type, this.state === 'hooked'); }
  /* điểm vòng dây siết vào: với ảnh tự chọn là phần cổ, giữa thân ảnh phía trên */
  neck() { return this.hasSkin() ? { x: this.x, y: this.y - (this.def.skinK ? 98 : 80) * this.s - this.lift() } : { x: this.x + this.face * 52 * this.s, y: this.y - 86 * this.s - this.lift() }; }
}
Cow.n = 0;

/* ---------- Game ---------- */
class Game {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.cb = {}; this.t = 0; this.mode = 'idle'; this.paused = false; this.kind = 'catch'; this.proj = []; this.holding = false;
    this.aimTarget = -Math.PI / 2; this.aimAng = -Math.PI / 2; this.keyAim = 0;
    this.cows = []; this.parts = []; this.texts = []; this.shake = 0;
    this.rope = this.newRope(); this.pull = null; this.assistHeld = false;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.gear = computeGear({});
    this.tufts = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(330, 690), p: rnd(0, TAU), h: rnd(10, 22) }));
    this.crowd = Array.from({ length: 17 }, (_, i) => ({ x: 40 + i * 75 + rnd(-12, 12), ph: rnd(0, TAU), hat: i % 4 === 1 ? 3 : Math.floor(rnd(0, 3)), col: Math.floor(rnd(0, 6)) }));
    this.clouds = Array.from({ length: 3 }, (_, i) => ({ x: rnd(0, W), y: rnd(40, 170), s: rnd(.7, 1.4), v: rnd(5, 12) }));
    this.resize();
    this.last = performance.now();
    requestAnimationFrame(ts => this.loop(ts));
  }
  newRope() { return { state: 'idle', ang: -Math.PI / 2, len: 0, range: 600, cool: 0, hit: new Set(), touched: false, fast: false }; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), r = this.cv.getBoundingClientRect();
    this.cv.width = Math.max(2, Math.round(r.width * dpr)); this.cv.height = Math.max(2, Math.round(r.height * dpr));
    this.k = this.cv.width / W;
    this.buildBg();
  }

  /* --- vòng đời màn chơi --- */
  start(n) {
    if (this.kind === 'shoot') return this.shStart(n);
    const d = Save.data;
    SHOULDER.x = 640;
    this.level = levelConfig(n); this.gear = computeGear(d.items);
    this.mode = 'intro'; this.introT = 1.9; this.paused = false;
    this.score = 0; this.timeLeft = this.level.time; this.streak = 0; this.ended = false;
    this.session = { caught: {}, thrown: 0, missed: 0, escaped: 0, gold: 0 };
    this.resetWorld();
    this.fillQueue();
    Sound.play('start');
    this.cb.onStart && this.cb.onStart(this.level);
  }
  setKind(k) { this.kind = k; this.startDemo(); }
  startDemo() {
    if (this.kind === 'shoot') return this.shDemo();
    this.level = Object.assign(levelConfig(4), { maxCows: 6 });
    this.level.weights = { normal: 40, small: 20, big: 25, fast: 20, mad: 20, red: 10, gold: 8, rainbow: 6 };
    this.gear = computeGear({ long_rope: 2 });
    SHOULDER.x = 990;
    this.mode = 'demo'; this.paused = false; this.demoT = 1.2; this.demoP = 0;
    this.resetWorld();
    this.fillQueue();
  }
  resetWorld() {
    this.cows = []; this.parts = []; this.texts = []; this.shake = 0;
    this.rope = this.newRope(); this.pull = null; this.assistHeld = false;
  }
  setPaused(p) { if (this.mode !== 'play' && this.mode !== 'intro') return; this.paused = p; Sound.duck(p); }

  /* --- sinh bò --- */
  pickType() {
    const w = this.level.weights, luck = this.gear.luck;
    let total = 0; const rare = this.cows.filter(c => c.def.rare).length;
    const entries = Object.keys(w).map(k => {
      let v = w[k] * (COWS[k].rare ? luck : 1);
      if (COWS[k].rare && rare >= 1) v = 0; // tối đa một bò hiếm cùng lúc
      total += v; return [k, v];
    });
    let r = Math.random() * total;
    for (const [k, v] of entries) { if ((r -= v) <= 0) return k; }
    return 'normal';
  }
  /* Bò chạy lung tung khắp đấu trường */
  spawn(init) {
    const type = this.pickType(), def = COWS[type];
    const side = Math.random() < .5 ? -1 : 1;
    const x = init ? rnd(120, W - 120) : (side < 0 ? -90 : W + 90);
    const c = new Cow(type, x, rnd(WANDER.y0, WANDER.y1), side < 0 ? 1 : -1, this.level.speed * rnd(.9, 1.1));
    c.tx = rnd(WANDER.x0, WANDER.x1); c.ty = rnd(WANDER.y0, WANDER.y1); c.wanderT = rnd(1, 3); c.vy = 0;
    c.maxhp = c.hp = (def.hp || 50) * (this.level.hpMul || 1); c.hurt = 0; c.flash = 0;
    this.cows.push(c);
    if (!init && def.rare) this.cb.onRare && this.cb.onRare(def);
  }
  fillQueue() { for (let i = 0; i < this.level.maxCows; i++) this.spawn(true); }

  /* --- vòng lặp --- */
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(.05, (ts - this.last) / 1000); this.last = ts;
    if (!this.paused) this.update(dt);
    this.render();
    this.cb.onFrame && this.cb.onFrame(dt);
  }

  hand(ang = this.aimAng) { return { x: SHOULDER.x + Math.cos(ang) * ARM, y: SHOULDER.y + Math.sin(ang) * ARM }; }
  tip() {
    const r = this.rope;
    if (r.state === 'hooked' && this.pull) return this.pull.cow.neck();
    const h = this.hand(r.ang); return { x: h.x + Math.cos(r.ang) * r.len, y: h.y + Math.sin(r.ang) * r.len };
  }
  setAimPoint(x, y) { this.aimX = x; this.aimY = y; this.aimTarget = clamp(Math.atan2(y - SHOULDER.y, x - SHOULDER.x), -Math.PI + .1, -.1); }
  canAct() { return (this.mode === 'play' || this.mode === 'demo') && !this.paused; }

  update(dt) {
    if (this.kind === 'shoot') return this.shUpdate(dt);
    this.t += dt;
    if (this.mode === 'intro') { this.introT -= dt; if (this.introT <= 0) { this.mode = 'play'; this.cb.onGo && this.cb.onGo(); } }
    if (this.mode === 'play') {
      if (this.keyAim) this.aimTarget = clamp(this.aimTarget + this.keyAim * dt * 1.7, -Math.PI + .1, -.1);
      const before = this.timeLeft;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (before > 0 && this.timeLeft === 0) this.cb.onTimeUp && this.cb.onTimeUp(!!this.pull);
    }
    if (this.rope.state === 'idle' || this.rope.state === 'fly') this.aimAng += (this.aimTarget - this.aimAng) * (1 - Math.exp(-dt * 28));
    if (this.mode === 'demo') this.demoAI(dt);

    // sinh bò
    this.spawnT = (this.spawnT || 0) - dt;
    if (this.spawnT <= 0) {
      if (this.cows.filter(c => c.state === 'walk' || c.state === 'hooked').length < this.level.maxCows) this.spawn(false);
      this.spawnT = rnd(.6, 1.4);
    }
    this.updateCows(dt);
    this.updateRope(dt);
    this.updateFx(dt);

    // kết thúc màn
    if (this.mode === 'play' && !this.ended && !this.pull && this.rope.state !== 'fly' && this.rope.state !== 'hooked' && !this.cows.some(c => c.state === 'captured')) {
      if (this.score >= this.level.target) this.end(true);
      else if (this.timeLeft <= 0) this.end(false);
    }
  }

  updateCows(dt) {
    for (let i = this.cows.length - 1; i >= 0; i--) {
      const c = this.cows[i];
      c.squash = Math.max(0, c.squash - dt * 8);
      if (c.def.fly) c.fp = (c.fp || c.ph) + dt * 2.6;
      if (c.def.frames && !this.reduce) {
        if (c.state === 'captured') { c.act = 'hop'; c.actT = (c.cap * 2.2) % 1; }
        else if (c.state !== 'walk') c.act = null;
        else if (c.act) { c.actT += dt / c.actDur; if (c.actT >= 1) { c.act = null; c.actCd = rnd(3, 7); } }
        else if ((c.actCd -= dt) <= 0 && !(c.graze > 0)) {
          const list = c.def.fly ? ['wave', 'look', 'dance'] : Object.keys(RIG_ACTS);
          c.act = list[Math.floor(Math.random() * list.length)]; c.actT = 0; c.actDur = RIG_ACTS[c.act];
        }
      }
      if (c.state === 'walk') {
        c.grazeCd -= dt;
        if (c.grazeCd <= 0 && c.boost <= 0) {
          if ((c.type === 'normal' || c.type === 'big') && Math.random() < .5) c.graze = rnd(.9, 1.7);
          c.grazeCd = rnd(3, 7);
        }
        c.graze = Math.max(0, c.graze - dt); c.boost = Math.max(0, c.boost - dt);
        c.wanderT -= dt;
        let dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy);
        if (c.wanderT <= 0 || dist < 24) {
          c.tx = rnd(WANDER.x0, WANDER.x1); c.ty = rnd(WANDER.y0, WANDER.y1); c.wanderT = rnd(2.5, 5.5);
          dx = c.tx - c.x; dy = c.ty - c.y; dist = Math.hypot(dx, dy);
        }
        const target = c.graze > 0 ? .06 : 1;
        c.mul = (c.mul == null ? 1 : c.mul); c.mul += (target - c.mul) * Math.min(1, dt * 4);
        const sp = c.def.speed * c.vmul * c.mul * (c.boost > 0 ? 2.4 : 1);
        c.vx = dist > 1 ? dx / dist * sp : 0; c.vy = dist > 1 ? dy / dist * sp * .7 : 0;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (Math.abs(c.vx) > 12) c.face = c.vx > 0 ? 1 : -1;
        const spd = Math.hypot(c.vx, c.vy);
        c.walk += spd * dt * .045;
        c.headDip = c.graze > 0 && c.mul < .3 ? 12 : 0;
        c.dust -= dt;
        if (c.def.fly) {
          if (spd > 20 && Math.random() < dt * 16) this.puff(c.x - c.face * 44 * c.s, c.y - c.lift() - 28 * c.s, 1, c.type === 'witch' ? 'rgba(255,214,90,.9)' : 'rgba(190,240,255,.8)', 26, .8, 4.5 * c.s, 14);
        } else if (c.dust <= 0 && spd > 90) {
          c.dust = c.type === 'fast' ? .05 : .16;
          this.puff(c.x - c.face * 50 * c.s, c.y, 1, 'rgba(235,215,170,.7)', 18, .55, 7 * c.s);
        }
        if (c.type === 'mad' && Math.random() < dt * 5) this.puff(c.x + c.face * 70 * c.s, c.y - 98 * c.s, 1, 'rgba(255,255,255,.75)', 22, .6, 7 * c.s, -60);
      } else if (c.state === 'captured') {
        c.cap += dt / .55;
        const k = ease(Math.min(1, c.cap));
        c.x = lerp(c.cx0, SHOULDER.x, k); c.y = lerp(c.cy0, FEET_Y - 40, k);
        c.alpha = 1 - k * k; c.tilt = k * 1.2 * c.face;
        c.scaleMul = 1 - k * .75;
        if (c.cap >= 1) this.cows.splice(i, 1);
      }
    }
    // đẩy nhẹ các con đang chạy ra khỏi nhau
    const q = this.cows.filter(c => c.state === 'walk');
    for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
      const a = q[i], b = q[j], dx = b.x - a.x, dy = b.y - a.y, need = 90 * (a.s + b.s) / 2;
      if (Math.abs(dy) < 26 && Math.abs(dx) < need) { const p = (need - Math.abs(dx)) * .05, sg = dx >= 0 ? 1 : -1; a.x -= sg * p; b.x += sg * p; }
    }
  }

  /* --- dây --- */
  throwRope() {
    const r = this.rope;
    if (!this.canAct() || r.state !== 'idle' || r.cool > 0) return false;
    if (this.mode === 'play' && this.timeLeft <= 0) return false;
    r.state = 'fly'; r.ang = this.aimAng; r.len = 0; r.hit = new Set(); r.touched = false; r.fast = false; r.range = this.gear.range;
    if (this.mode === 'play') { this.session.thrown++; Save.data.stats.thrown++; }
    const h = this.hand();
    this.puff(h.x, h.y, 5, 'rgba(255,255,255,.7)', 40, .35, 4);
    Sound.play('throw');
    return true;
  }
  updateRope(dt) {
    const r = this.rope; r.cool = Math.max(0, r.cool - dt);
    if (r.state === 'fly') {
      const step = this.gear.ropeSpeed * dt, sub = Math.max(1, Math.ceil(step / 16));
      for (let i = 0; i < sub; i++) {
        r.len += step / sub;
        this.checkHit();
        if (r.state !== 'fly') return;
        if (r.len >= r.range) break;
      }
      if (r.len >= r.range) {
        r.len = r.range;
        if (this.gear.hold > 0) { r.state = 'hold'; r.holdT = this.gear.hold; } else this.ropeMissEnd();
      }
    } else if (r.state === 'hold') {
      this.checkHit();
      r.holdT -= dt;
      if (r.state === 'hold' && r.holdT <= 0) this.ropeMissEnd();
    } else if (r.state === 'retract') {
      r.len -= this.gear.ropeSpeed * (r.fast ? 2.4 : 1.4) * dt;
      if (r.len <= 0) { r.len = 0; r.state = 'idle'; r.cool = this.gear.cool; r.fast = false; }
    } else if (r.state === 'hooked') this.updatePull(dt);
  }
  ropeMissEnd() {
    const r = this.rope; r.state = 'retract';
    if (!r.touched && this.mode === 'play') {
      this.session.missed++; Save.data.stats.missed++;
      this.streak = 0;
      const t = this.tip(); this.text(t.x, t.y - 20, 'Trượt!', '#fff', 30);
      Sound.play('miss');
    }
  }
  checkHit() {
    const r = this.rope, tip = this.tip();
    for (const c of this.cows) {
      if (c.state !== 'walk' || r.hit.has(c.id)) continue;
      const m = c.neck(), d = Math.hypot(m.x - tip.x, m.y - tip.y), hr = (c.hasSkin() ? 48 : 38) * c.s + this.gear.loopR * .55;
      if (d < hr) {
        r.hit.add(c.id); r.touched = true;
        const acc = 1 - .3 * (d / hr) * (d / hr);
        const p = clamp(c.def.hook * acc * this.gear.hit, .05, .99);
        if (Math.random() < p) { this.hook(c); return; }
        this.text(m.x, m.y - 50 * c.s, 'Dây trượt!', '#fff', 28);
        this.puff(m.x, m.y, 5, 'rgba(255,255,255,.8)', 50, .4, 5);
        Sound.play('miss');
      }
    }
  }
  hook(cow) {
    const r = this.rope; r.state = 'hooked';
    cow.state = 'hooked'; cow.ox = cow.x; cow.oy = cow.y; cow.vx = 0;
    cow.face = cow.x < SHOULDER.x ? 1 : -1; cow.headDip = 0; cow.headTilt = -.15;
    const diff = DIFF[Save.data.settings.difficulty] ?? 1;
    const presses = cow.def.presses * diff * this.level.resist;
    this.pull = {
      cow, prog: 0, presses, per: 100 / presses,
      esc: cow.def.escape * this.gear.escape * (this.mode === 'demo' ? 2 : 1), last: -9, rhy: 0, st: 'none',
      stT: rnd(.9, 1.6) * 2.8 / cow.def.struggle, surge: 0, t0: this.t, auto: 0, fxT: 0, pc: 0
    };
    this.pull.escMax = this.pull.esc;
    const tip = cow.neck();
    this.puff(tip.x, tip.y, 8, 'rgba(255,230,140,.9)', 120, .4, 4);
    this.shake = Math.max(this.shake, 6);
    Sound.play('hook');
    if (this.mode === 'play') this.cb.onHook && this.cb.onHook(cow);
  }

  press(power = 1) {
    const p = this.pull;
    if (!p || !this.canAct()) return false;
    if (this.t - p.last < .075) return false; // giới hạn ~13 nhấn/giây
    const dtp = this.t - p.last; p.last = this.t;
    if (dtp > .11 && dtp < .26) p.rhy = Math.min(6, p.rhy + 1); else if (dtp > .45) p.rhy = 0; else p.rhy = Math.max(0, p.rhy - .5);
    const rhythm = 1 + p.rhy * .04, g = this.gear;
    const add = p.per * g.power * g.perPress * rhythm * (p.surge > 0 ? 2 : 1) * power;
    p.prog = Math.min(100, p.prog + add); p.pc++;
    p.cow.squash = 1;
    Sound.play('tick', p.prog / 100);
    const n = p.cow.neck();
    this.puff(n.x, n.y + 20, 1, 'rgba(255,240,200,.8)', 40, .3, 3);
    this.ropeBuzz = 1;
    if (p.prog >= 100) this.capture();
    return true;
  }
  usePotion() {
    const p = this.pull, d = Save.data;
    if (!p || p.surge > 0 || (d.consumables.energy_potion || 0) < 1 || this.mode !== 'play') return false;
    d.consumables.energy_potion--; Save.commit();
    p.surge = 5;
    this.text(p.cow.x, p.cow.y - 140 * p.cow.s, 'Sức kéo x2!', '#6DE0B0', 40);
    Sound.play('buy');
    this.cb.onPotion && this.cb.onPotion();
    return true;
  }

  updatePull(dt) {
    const p = this.pull; if (!p) return;
    const cow = p.cow, g = this.gear;
    p.stT -= dt;
    if (p.st === 'none' && p.stT <= 0) { p.st = 'warn'; p.stT = .55; Sound.play('warn'); }
    else if (p.st === 'warn' && p.stT <= 0) { p.st = 'on'; p.stT = .85; Sound.play('struggle'); this.shake = Math.max(this.shake, 9); }
    else if (p.st === 'on' && p.stT <= 0) { p.st = 'none'; p.stT = rnd(.75, 1.25) * 2.8 / cow.def.struggle; }

    let drain = p.per * 1.5;
    if (p.st === 'on') drain *= 3 * (1 - g.grip);
    if (this.t - p.last > .7) drain *= 1.8;
    p.prog = Math.max(0, p.prog - drain * dt);
    p.esc -= dt * (p.st === 'on' ? 2.2 : 1);
    if (p.surge > 0) p.surge -= dt;
    this.ropeBuzz = Math.max(0, (this.ropeBuzz || 0) - dt * 6);

    if (Save.data.settings.assist && this.assistHeld && this.mode === 'play') { p.auto -= dt; if (p.auto <= 0) { p.auto = .2; this.press(.75); if (!this.pull) return; } }

    p.steam = (p.steam || 0) - dt;
    if (p.steam <= 0) { p.steam = .22; this.puff(cow.x + cow.face * 90 * cow.s, cow.y - 70 * cow.s, 2, 'rgba(255,255,255,.85)', 24, .6, 7 * cow.s, -70); }
    p.fxT -= dt;
    if (p.st === 'on' && p.fxT <= 0) { p.fxT = .09; this.puff(cow.x, cow.y, 2, 'rgba(235,215,170,.8)', 80, .5, 8 * cow.s); this.shake = Math.max(this.shake, 4); }

    // vị trí bò: bị kéo về phía người chơi
    const k = ease(p.prog / 100) * .8;
    let tx = lerp(cow.ox, SHOULDER.x, k), ty = lerp(cow.oy, 596, k);
    if (p.st === 'on') { tx += Math.sin(this.t * 55) * 9; ty += Math.cos(this.t * 47) * 2; }
    if (p.st === 'warn') tx += Math.sin(this.t * 30) * 2.5;
    const sm = Math.min(1, dt * 12);
    cow.x += (tx - cow.x) * sm; cow.y += (ty - cow.y) * sm;
    cow.walk += dt * (p.st === 'on' ? 22 : 6); cow.tilt = -cow.face * (.08 + .06 * (p.st === 'on'));
    cow.vx = 0;

    if (p.esc <= 0) this.escape();
  }
  snapRope(cow, fast) {
    const n = cow.neck(), h = this.hand(), r = this.rope;
    r.ang = Math.atan2(n.y - h.y, n.x - h.x); r.len = Math.hypot(n.x - h.x, n.y - h.y);
    r.state = 'retract'; r.fast = fast;
  }
  escape() {
    const p = this.pull, cow = p.cow;
    this.snapRope(cow, true);
    this.pull = null;
    cow.state = 'walk'; cow.boost = 3; cow.tx = cow.x < SHOULDER.x ? WANDER.x1 : WANDER.x0; cow.ty = rnd(WANDER.y0, WANDER.y1); cow.wanderT = 3; cow.tilt = 0; cow.headTilt = 0; cow.mul = 1; cow.grazeCd = 99;
    if (this.mode === 'play') {
      this.session.escaped++; Save.data.stats.escaped++; this.streak = 0;
      this.text(cow.x, cow.y - 130 * cow.s, 'Bò thoát rồi!', '#ff8f7f', 40);
      this.shake = Math.max(this.shake, 8);
      Sound.play('escape'); Sound.play('moo');
      this.cb.onEscape && this.cb.onEscape(cow);
    }
    this.puff(cow.x, cow.y, 8, 'rgba(235,215,170,.8)', 120, .6, 9);
  }
  streakBonus() { const s = this.streak; if (this.kind === 'shoot') return s >= 2 ? Math.min(.5, (s - 1) * .05) : 0; return s >= 5 ? .2 : s >= 3 ? .1 : s >= 2 ? .05 : 0; }

  capture() {
    const p = this.pull, cow = p.cow, def = cow.def;
    if (cow.rewarded) return;
    cow.rewarded = true;
    this.snapRope(cow, true);
    this.pull = null;
    cow.state = 'captured'; cow.cap = 0; cow.cx0 = cow.x; cow.cy0 = cow.y; cow.tilt = 0;
    this.puff(cow.x, cow.y - 60 * cow.s, 22, 'confetti', 260, 1.1, 6);
    this.shake = Math.max(this.shake, 5);
    if (this.mode !== 'play') return;

    const d = Save.data;
    this.streak++;
    const mult = 1 + this.streakBonus();
    const sc = Math.round(def.score * mult), gd = Math.round(def.gold * mult);
    this.score += sc; d.gold += gd; this.session.gold += gd;
    this.session.caught[cow.type] = (this.session.caught[cow.type] || 0) + 1;
    d.stats.caught[cow.type] = (d.stats.caught[cow.type] || 0) + 1;
    Save.commit();

    const m = cow.center();
    this.text(m.x, m.y - 40 * cow.s, `+${sc} điểm`, '#fff', 40);
    this.text(m.x, m.y - 4 * cow.s, `+${gd} vàng`, '#FFD54A', 34, .12);
    for (let i = 0; i < Math.min(12, 3 + Math.ceil(gd / 6)); i++) this.parts.push({ type: 'coin', x: m.x, y: m.y, sx: m.x, sy: m.y, t: -i * .05, dur: rnd(.7, .95), arc: rnd(-120, 120), life: 9 });
    Sound.play('catch'); Sound.play('moo');
    if (def.rare) Sound.play('win');

    const dur = this.t - p.t0;
    Ach.unlock('first');
    if (def.presses >= 22 && dur < 2.5) Ach.unlock('speed');
    if (cow.type === 'red') Ach.unlock('red');
    if (cow.type === 'rainbow') Ach.unlock('rainbow');
    if (this.streak >= 5) Ach.unlock('streak');
    if (d.gold >= 1000) Ach.unlock('rich');
    this.cb.onCatch && this.cb.onCatch(cow, sc, gd);
  }

  end(win) {
    if (this.kind === 'shoot') return this.shEnd(win);
    if (this.ended) return; this.ended = true; this.mode = 'end';
    const d = Save.data, L = this.level, ses = this.session;
    let bonus = 0, timeBonus = 0;
    if (win) {
      bonus = 30 + L.id * 15; timeBonus = Math.floor(this.timeLeft * .5);
      d.gold += bonus + timeBonus; d.stats.levelsWon++;
      d.unlockedLevel = Math.max(d.unlockedLevel, L.id + 1);
      if (ses.escaped === 0 && ses.missed === 0) Ach.unlock('clean');
      if (d.gold >= 1000) Ach.unlock('rich');
    }
    const prev = d.bestByLevel[L.id] || 0, isBest = this.score > prev;
    if (isBest) d.bestByLevel[L.id] = this.score;
    d.bestScore = Math.max(d.bestScore, this.score);
    Save.commit();
    Sound.play(win ? 'win' : 'lose');
    this.cb.onEnd && this.cb.onEnd({ win, level: L, score: this.score, target: L.target, caught: ses.caught, thrown: ses.thrown, missed: ses.missed, escaped: ses.escaped, gold: ses.gold, bonus, timeBonus, isBest, timeLeft: this.timeLeft });
  }

  /* --- chế độ demo ở màn hình chính --- */
  demoAI(dt) {
    const r = this.rope;
    if (r.state === 'idle') {
      this.demoT -= dt;
      if (this.demoT <= 0) {
        const h = this.hand(-1.2), sp = this.gear.ropeSpeed;
        const cand = this.cows.filter(c => c.state === 'walk' && c.x > 720 && c.x < W - 60 && Math.hypot(c.x - SHOULDER.x, c.y - SHOULDER.y) < this.gear.range - 80);
        if (cand.length) {
          const c = cand[Math.floor(Math.random() * cand.length)], n = c.neck();
          const tt = Math.hypot(n.x - h.x, n.y - h.y) / sp;
          this.aimTarget = clamp(Math.atan2(n.y + c.vy * tt - SHOULDER.y, n.x + c.vx * tt - SHOULDER.x), -Math.PI + .1, -.1);
          this.aimAng = this.aimTarget;
          this.throwRope();
        }
        this.demoT = rnd(1.8, 3);
      }
    } else if (r.state === 'hooked' && this.pull) {
      this.demoP -= dt;
      if (this.demoP <= 0) { this.press(); this.demoP = rnd(.1, .16); }
    }
  }

  /* --- hiệu ứng --- */
  puff(x, y, n, color, speed, life, size, up = -30) {
    if (this.reduce) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), v = rnd(.3, 1) * speed;
      const confetti = color === 'confetti';
      this.parts.push({
        type: confetti ? 'conf' : 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (confetti ? -speed * .6 : up),
        life: rnd(.6, 1) * life, max: life, size: size * rnd(.6, 1.2), color: confetti ? `hsl(${Math.floor(rnd(0, 360))},90%,62%)` : color, rot: rnd(0, TAU), vr: rnd(-8, 8)
      });
    }
  }
  text(x, y, str, color, size, delay = 0) { this.texts.push({ x, y, str, color, size, life: 1.2, max: 1.2, delay }); }
  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt * 22);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.type === 'coin') {
        p.t += dt / p.dur;
        if (p.t >= 1) { this.parts.splice(i, 1); this.cb.onCoin && this.cb.onCoin(); Sound.play('tink'); }
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'conf') { p.vy += 520 * dt; p.vx *= .985; p.rot += p.vr * dt; } else { p.vx *= .93; p.vy *= .93; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      if (t.delay > 0) { t.delay -= dt; continue; }
      t.life -= dt; t.y -= 38 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  /* ---------- Đấu trường cát: nền tĩnh vẽ một lần ---------- */
  buildBg() {
    const c = document.createElement('canvas'); c.width = this.cv.width; c.height = this.cv.height;
    const g = c.getContext('2d'); g.scale(c.width / W, c.width / W);
    let gr = g.createLinearGradient(0, 0, 0, 280);
    gr.addColorStop(0, '#62B9E3'); gr.addColorStop(.6, '#B9E2EE'); gr.addColorStop(1, '#FBE2A2');
    g.fillStyle = gr; g.fillRect(0, 0, W, 300);
    gr = g.createRadialGradient(1060, 120, 10, 1060, 120, 260);
    gr.addColorStop(0, 'rgba(255,248,200,.95)'); gr.addColorStop(.3, 'rgba(255,236,160,.5)'); gr.addColorStop(1, 'rgba(255,236,160,0)');
    g.fillStyle = gr; g.fillRect(560, 0, 720, 400);
    g.fillStyle = '#FFF6C4'; g.beginPath(); g.arc(1060, 120, 40, 0, TAU); g.fill();
    const mesa = (x, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, 270); g.lineTo(x + w * .12, 270 - h); g.lineTo(x + w * .88, 270 - h); g.lineTo(x + w, 270); g.closePath(); g.fill(); };
    mesa(300, 260, 78, '#E7A66E'); mesa(520, 190, 54, '#D98F5C'); mesa(760, 300, 92, '#E7A66E'); mesa(-30, 230, 60, '#D98F5C');
    const house = (x, w, h, col, sign) => {
      g.fillStyle = col; g.fillRect(x, 262 - h, w, h);
      g.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < h; i += 14) g.fillRect(x, 262 - h + i, w, 2);
      g.fillStyle = '#6a3b1f'; g.fillRect(x - 6, 262 - h - 10, w + 12, 12);
      g.fillStyle = '#F6E3B4'; g.fillRect(x + w * .1, 262 - h * .8, w * .8, 22);
      g.fillStyle = sign; for (let i = 0; i < 4; i++) g.fillRect(x + w * .14 + i * w * .2, 262 - h * .8 + 5, w * .12, 12);
      g.fillStyle = '#5b3a24'; for (let i = 0; i < 2; i++) g.fillRect(x + w * (.18 + i * .5), 262 - h * .45, w * .24, h * .4);
      g.fillStyle = '#9FD3E6'; for (let i = 0; i < 2; i++) g.fillRect(x + w * (.2 + i * .5), 262 - h * .42, w * .2, h * .16);
    };
    house(70, 210, 120, '#A8693A', '#C2412F'); house(310, 150, 96, '#8F5530', '#2F6FB5');
    house(860, 200, 128, '#9A6238', '#2F8F4E'); house(1085, 170, 100, '#B87440', '#C2412F');
    const cactus = (x, y, s) => { g.strokeStyle = '#4F9A4F'; g.lineWidth = 11 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 60 * s); g.moveTo(x, y - 22 * s); g.lineTo(x - 16 * s, y - 22 * s); g.lineTo(x - 16 * s, y - 40 * s); g.moveTo(x, y - 30 * s); g.lineTo(x + 16 * s, y - 30 * s); g.lineTo(x + 16 * s, y - 48 * s); g.stroke(); };
    cactus(520, 270, 1); cactus(790, 272, .8); cactus(1270, 270, 1.1);
    gr = g.createLinearGradient(0, 262, 0, H);
    gr.addColorStop(0, '#F0D08C'); gr.addColorStop(.5, '#E3BD73'); gr.addColorStop(1, '#C8964F');
    g.fillStyle = gr; g.fillRect(0, 262, W, H - 262);
    let seed = 7; const rn = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,240,200,${.12 + rn() * .12})`; g.beginPath(); g.ellipse(rn() * W, 320 + rn() * 380, 30 + rn() * 90, 4 + rn() * 9, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(140,90,40,${.12 + rn() * .15})`; g.fillRect(rn() * W, 300 + rn() * 400, 2 + rn() * 3, 2); }
    g.fillStyle = 'rgba(150,100,50,.18)';
    for (let i = 0; i < 26; i++) { const x = 40 + i * 50 + rn() * 20, y = 470 + rn() * 14; g.beginPath(); g.ellipse(x, y, 7, 5, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(80,40,10,.22)'; g.fillRect(0, 300, W, 14);
    gr = g.createLinearGradient(0, 676, 0, H); gr.addColorStop(0, 'rgba(120,70,20,0)'); gr.addColorStop(1, 'rgba(120,70,20,.35)');
    g.fillStyle = gr; g.fillRect(0, 676, W, H - 676);
    this.bg = c;
  }
  drawCrowd(c) {
    const hats = ['#8A5A2B', '#C2412F', '#2F6FB5', '#F2D78D', '#2F8F4E'], shirts = ['#C2412F', '#2F6FB5', '#F6B93B', '#7B4BB5', '#2F8F4E', '#E9DFC6'];
    for (const p of this.crowd) {
      const b = Math.sin(this.t * 4 + p.ph), cheer = Math.max(0, Math.sin(this.t * 2.2 + p.ph * 3));
      const x = p.x, y = 238 - Math.abs(b) * 6;
      const sc = shirts[p.col % shirts.length];
      c.fillStyle = sc; rr(c, x - 18, y + 8, 36, 36, 10); c.fill();
      c.strokeStyle = sc; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 16, y + 18); c.lineTo(x - 26, y + 18 - cheer * 34); c.moveTo(x + 16, y + 18); c.lineTo(x + 26, y + 18 - cheer * 30); c.stroke();
      c.fillStyle = '#E8B98A'; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill();
      c.fillStyle = '#2b1b16'; c.beginPath(); c.arc(x - 5, y - 1, 1.8, 0, TAU); c.arc(x + 5, y - 1, 1.8, 0, TAU); c.fill();
      c.strokeStyle = '#a5503f'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + 3, 5, .2, Math.PI - .2); c.stroke();
      if (p.hat === 3) { c.fillStyle = '#F2D78D'; c.beginPath(); c.moveTo(x - 28, y - 8); c.quadraticCurveTo(x, y - 4, x + 28, y - 8); c.lineTo(x, y - 40); c.closePath(); c.fill(); }
      else { c.fillStyle = hats[p.hat]; c.fillRect(x - 12, y - 24, 24, 14); c.beginPath(); c.ellipse(x, y - 10, 24, 6, 0, 0, TAU); c.fill(); }
    }
  }
  drawCones(c) {
    for (let x = 100; x < W; x += 200) {
      c.fillStyle = 'rgba(80,40,10,.25)'; c.beginPath(); c.ellipse(x, 556, 22, 6, 0, 0, TAU); c.fill();
      c.fillStyle = '#F28C1E'; c.beginPath(); c.moveTo(x - 17, 552); c.lineTo(x - 6, 512); c.lineTo(x + 6, 512); c.lineTo(x + 17, 552); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 12, 536); c.lineTo(x - 9, 526); c.lineTo(x + 9, 526); c.lineTo(x + 12, 536); c.closePath(); c.fill();
      c.fillStyle = '#F28C1E'; rr(c, x - 21, 549, 42, 8, 3); c.fill();
    }
  }
  drawFence(c) {
    for (let x = 14; x < W; x += 80) { c.fillStyle = '#8A5A2B'; rr(c, x, 252, 18, 52, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 3, 254, 4, 48); }
    [[262, 14], [286, 14]].forEach(([y, h]) => {
      c.fillStyle = '#B97B43'; c.fillRect(0, y, W, h);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, y, W, 3);
      c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, y + h - 3, W, 3);
    });
  }

  /* ---------- Vẽ mỗi khung hình ---------- */
  render() {
    const c = this.ctx, k = this.k;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bg) c.drawImage(this.bg, 0, 0);
    c.setTransform(k, 0, 0, k, 0, 0);
    if (this.level && this.level.halloween && this.mode !== 'demo') {
      const n = c.createLinearGradient(0, 0, 0, H); n.addColorStop(0, 'rgba(30,10,70,.62)'); n.addColorStop(1, 'rgba(60,20,70,.32)');
      c.fillStyle = n; c.fillRect(0, 0, W, H);
      c.fillStyle = '#FFE9A8'; c.beginPath(); c.arc(1060, 120, 46, 0, TAU); c.fill();
    }
    if (this.kind === 'shoot' && this.mode !== 'demo' && !(this.level && this.level.halloween)) {
      const n = c.createLinearGradient(0, 0, 0, H); n.addColorStop(0, 'rgba(255,96,40,.22)'); n.addColorStop(.5, 'rgba(255,150,60,.1)'); n.addColorStop(1, 'rgba(120,30,20,.16)');
      c.fillStyle = n; c.fillRect(0, 0, W, H);
    }
    // mây trôi
    if (!this.paused) this.clouds.forEach(m => { m.x += m.v * 1 / 60; if (m.x > W + 160) m.x = -160; });
    this.clouds.forEach(m => {
      c.fillStyle = 'rgba(255,255,255,.88)';
      c.beginPath();
      c.ellipse(m.x, m.y, 60 * m.s, 20 * m.s, 0, 0, TAU); c.ellipse(m.x - 34 * m.s, m.y + 4 * m.s, 36 * m.s, 15 * m.s, 0, 0, TAU); c.ellipse(m.x + 30 * m.s, m.y - 8 * m.s, 34 * m.s, 18 * m.s, 0, 0, TAU);
      c.fill();
    });
    let sx = 0, sy = 0;
    if (this.shake > .1) { const m = this.reduce ? .2 : 1; sx = rnd(-1, 1) * this.shake * m; sy = rnd(-1, 1) * this.shake * m; }
    c.save(); c.translate(sx, sy);
    this.drawCrowd(c);
    this.drawFence(c);
    this.drawCones(c);
    this.drawTufts(c, false);
    // bò theo chiều sâu
    const list = this.cows.slice().sort((a, b) => a.y - b.y);
    for (const cow of list) {
      const sc = cow.s * (cow.scaleMul || 1);
      drawCow(c, {
        type: cow.type, x: cow.x, y: cow.y, lift: cow.lift() * (cow.scaleMul || 1) + (cow.koLift || 0), s: sc, flash: cow.flash, face: cow.face, walk: cow.walk, t: this.t, ph: cow.ph,
        mood: this.kind === 'shoot' ? (cow.hurt > 0 || cow.state === 'ko' ? 'yell' : 'calm') : cow.state === 'hooked' ? (this.pull && this.pull.st === 'on' ? 'yell' : 'annoy') : 'calm', squash: cow.squash, tilt: cow.tilt, act: cow.act, actT: cow.actT, alpha: cow.alpha != null ? cow.alpha : (cow.type === 'ghost' && cow.state === 'walk' ? .72 + .22 * Math.sin(this.t * 3 + cow.ph) : undefined), moving: Math.abs(cow.vx) > 8 || Math.abs(cow.vy || 0) > 8 || cow.state === 'hooked',
        headDip: cow.headDip, headTilt: (cow.headTilt || 0) + (cow.state === 'hooked' && this.pull && this.pull.st === 'on' ? Math.sin(this.t * 45) * .14 : 0)
      });
    }
    if (this.kind === 'shoot') this.shDrawBars(c, list);
    else for (const cow of list) {
      if (cow.state === 'captured') continue;
      const s = cow.s, bx = cow.x + cow.face * 14 * s, by = cow.y - 150 * s - cow.lift();
      c.save(); c.textAlign = 'center'; c.lineJoin = 'round';
      c.font = `800 ${Math.round(30 * Math.min(1.25, s + .1))}px "Baloo 2", sans-serif`;
      c.lineWidth = 7; c.strokeStyle = 'rgba(30,15,30,.95)'; c.strokeText(cow.def.score, bx, by);
      c.fillStyle = cow.def.rare ? '#FFD66E' : '#fff'; c.fillText(cow.def.score, bx, by);
      c.restore();
    }
    this.drawPlayer(c);
    this.drawRope(c);
    this.drawAim(c);
    if (this.kind === 'shoot') this.shDrawProj(c);
    this.drawTufts(c, true);
    this.drawParts(c);
    c.restore();
    // vignette
    const v = c.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.02);
    v.addColorStop(0, 'rgba(10,20,50,0)'); v.addColorStop(1, 'rgba(10,20,50,.38)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }

  drawTufts(c, front) {
    c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = front ? '#8A6130' : '#B78A4A';
    for (const f of this.tufts) {
      if ((f.y > 600) !== front) continue;
      const w = Math.sin(this.t * 1.8 + f.p) * 4;
      c.beginPath();
      c.moveTo(f.x - 5, f.y); c.quadraticCurveTo(f.x - 4, f.y - f.h * .6, f.x - 4 + w, f.y - f.h);
      c.moveTo(f.x, f.y); c.quadraticCurveTo(f.x, f.y - f.h * .7, f.x + w * 1.3, f.y - f.h * 1.2);
      c.moveTo(f.x + 5, f.y); c.quadraticCurveTo(f.x + 4, f.y - f.h * .6, f.x + 4 + w, f.y - f.h);
      c.stroke();
    }
  }

  drawPlayer(c) {
    const r = this.rope, px = SHOULDER.x, pulling = r.state === 'hooked' && this.pull;
    const st = pulling ? this.pull.st : 'none';
    const shake = pulling ? (st === 'on' ? Math.sin(this.t * 55) * 4 : Math.sin(this.t * 30) * (this.ropeBuzz || 0) * 2) : 0;
    const bob = Math.sin(this.t * 2.4) * 2;
    c.fillStyle = 'rgba(120,70,20,.3)'; c.beginPath(); c.ellipse(px, 712, 190, 20, 0, 0, TAU); c.fill();
    // đầu ngựa: người chơi cưỡi ngựa nên chỉ lộ đầu ngựa và cánh tay
    c.save(); c.translate(px - 100 + shake * .4, 716 + bob);
    c.fillStyle = '#F4E9D0'; c.beginPath(); c.moveTo(34, -64); c.quadraticCurveTo(-10, -96, -34, -62); c.quadraticCurveTo(-6, -70, 2, -40); c.closePath(); c.fill();
    c.fillStyle = '#B9763A'; c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 4.5;
    c.beginPath(); c.moveTo(-48, 0); c.quadraticCurveTo(-52, -70, -10, -86); c.quadraticCurveTo(34, -100, 52, -66); c.quadraticCurveTo(70, -30, 52, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#F4E9D0'; c.beginPath(); c.moveTo(22, -88); c.quadraticCurveTo(38, -60, 40, -20); c.lineTo(52, -26); c.quadraticCurveTo(52, -62, 36, -90); c.closePath(); c.fill();
    c.fillStyle = '#B9763A'; c.beginPath(); c.moveTo(-6, -84); c.lineTo(-14, -112); c.lineTo(10, -90); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(12, -60, 9, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#1b0f0c'; c.beginPath(); c.arc(14, -59, 4.4, 0, TAU); c.fill();
    c.strokeStyle = '#C2412F'; c.lineWidth = 6; c.beginPath(); c.moveTo(-24, -20); c.quadraticCurveTo(10, -34, 50, -34); c.stroke();
    c.fillStyle = '#F6B93B'; c.beginPath(); c.arc(-4, -26, 5, 0, TAU); c.fill();
    c.restore();
    if (this.kind === 'shoot') { this.shDrawGunArm(c, shake); return; }
    // cuộn dây bên hông
    c.strokeStyle = '#7A4A1B'; c.lineWidth = 3; c.fillStyle = '#E6A23C';
    c.beginPath(); c.ellipse(px + 70, 690, 15, 12, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(px + 70, 690, 7, 5, 0, 0, TAU); c.stroke();
    // tay áo đỏ và bàn tay cầm dây
    const hd = this.hand(r.state === 'idle' ? this.aimAng : r.ang), sx = px + 18 + shake, sy = 740;
    c.lineCap = 'round';
    c.strokeStyle = '#8f261b'; c.lineWidth = 34; c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, hd.x, .72), lerp(sy, hd.y, .72)); c.stroke();
    c.strokeStyle = '#C2412F'; c.lineWidth = 26; c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, hd.x, .72), lerp(sy, hd.y, .72)); c.stroke();
    c.fillStyle = '#EBBD90'; c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 3.5;
    c.beginPath(); c.ellipse(hd.x + shake * .3, hd.y + 4, 15, 18, 0, 0, TAU); c.fill(); c.stroke();
  }

  ropeStyle(c, x0, y0, x1, y1) {
    if (this.gear.rainbow) {
      const g = c.createLinearGradient(x0, y0, x1 + .01, y1 + .01);
      for (let i = 0; i <= 5; i++) g.addColorStop(i / 5, `hsl(${(this.t * 120 + i * 60) % 360},90%,60%)`);
      return g;
    }
    return '#E6A23C';
  }
  strokeRope(c, x0, y0, cx, cy, x1, y1) {
    const path = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); };
    c.lineCap = 'round';
    path(); c.strokeStyle = '#6a3f14'; c.lineWidth = 8; c.stroke();
    path(); c.strokeStyle = this.ropeStyle(c, x0, y0, x1, y1); c.lineWidth = 5; c.stroke();
    path(); c.strokeStyle = 'rgba(255,240,200,.75)'; c.lineWidth = 2; c.setLineDash([3, 9]); c.lineDashOffset = 0; c.stroke(); c.setLineDash([]);
  }
  drawLoop(c, x, y, ang, R, cinch) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const rx = R * (cinch ? .32 : .5), ry = R * (cinch ? .7 : 1);
    c.lineWidth = 8; c.strokeStyle = '#6a3f14'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke();
    c.lineWidth = 5; c.strokeStyle = this.ropeStyle(c, 0, -ry, 0, ry); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,240,200,.7)'; c.setLineDash([3, 9]); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    c.restore();
  }
  drawRope(c) {
    const r = this.rope;
    if (this.kind === 'shoot' || r.state === 'idle') return;
    const h = this.hand(r.ang);
    if (r.state === 'hooked' && this.pull) {
      const p = this.pull, n = p.cow.neck();
      const vib = (this.ropeBuzz || 0) * 3 + (p.st === 'on' ? 6 : p.st === 'warn' ? 1.5 : 0.6);
      const sag = 4 + Math.sin(this.t * 60) * vib;
      const mx = (h.x + n.x) / 2, my = (h.y + n.y) / 2 + sag;
      this.strokeRope(c, h.x, h.y, mx, my, n.x, n.y);
      this.drawLoop(c, n.x, n.y, Math.atan2(n.y - h.y, n.x - h.x), 22 * p.cow.s + 8, true);
      return;
    }
    const tip = this.tip(), len = r.len;
    const sag = clamp(60 - len * .09, 4, 60) * (r.state === 'retract' ? .6 : 1);
    this.strokeRope(c, h.x, h.y, (h.x + tip.x) / 2, (h.y + tip.y) / 2 + sag, tip.x, tip.y);
    this.drawLoop(c, tip.x, tip.y, r.ang, this.gear.loopR * (r.state === 'retract' ? .85 : 1), r.state === 'retract' && r.fast);
  }
  drawAim(c) {
    if (this.kind === 'shoot') return this.shDrawAim(c);
    const r = this.rope;
    if (this.mode !== 'play' || this.paused || r.state !== 'idle' || this.timeLeft <= 0) return;
    const h = this.hand(), a = this.aimAng, R = this.gear.range, ca = Math.cos(a), sa = Math.sin(a);
    const near = this.cows.some(k => {
      if (k.state !== 'walk') return false;
      const n = k.neck(), px = n.x - h.x, py = n.y - h.y, along = px * ca + py * sa;
      return along > 0 && along < R && Math.abs(px * sa - py * ca) < 38;
    });
    c.save();
    for (let d = 50; d < R; d += 32) {
      c.fillStyle = `rgba(255,255,255,${(1 - d / R) * .55 + .12})`;
      c.beginPath(); c.arc(h.x + ca * d, h.y + sa * d, 3.4, 0, TAU); c.fill();
    }
    c.strokeStyle = near ? '#FFD66E' : 'rgba(255,255,255,.5)'; c.lineWidth = near ? 5 : 3; c.setLineDash(near ? [] : [6, 8]);
    c.beginPath(); c.ellipse(h.x + ca * R, h.y + sa * R, this.gear.loopR * .5, this.gear.loopR, a, 0, TAU); c.stroke();
    c.restore();
  }
  drawParts(c) {
    for (const p of this.parts) {
      if (p.type === 'coin') {
        if (p.t < 0) continue;
        const k = ease(clamp(p.t, 0, 1)), x = lerp(p.sx, COIN_TARGET.x, k) + Math.sin(k * Math.PI) * p.arc, y = lerp(p.sy, COIN_TARGET.y, k) - Math.sin(k * Math.PI) * 90;
        c.fillStyle = '#FFC93C'; c.strokeStyle = '#B9780A'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(x, y, 11 * Math.abs(Math.cos(this.t * 10 + p.arc)) + 3, 11, 0, 0, TAU); c.fill(); c.stroke();
        continue;
      }
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'boom') {
        const k = 1 - a, r = p.r * (.35 + .65 * Math.sqrt(k)), g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,248,200,${a})`); g.addColorStop(.35, `rgba(255,170,50,${a * .95})`); g.addColorStop(.75, `rgba(220,60,20,${a * .7})`); g.addColorStop(1, 'rgba(90,30,20,0)');
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
        c.strokeStyle = `rgba(255,240,200,${a * .8})`; c.lineWidth = 6 * a; c.beginPath(); c.arc(p.x, p.y, r * 1.02, 0, TAU); c.stroke();
        continue;
      }
      if (p.type === 'conf') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, a * 2);
        c.fillStyle = p.color; c.fillRect(-4, -2.5, 8, 5); c.restore();
      } else {
        c.globalAlpha = a * .8; c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size * (1.4 - a * .4), 0, TAU); c.fill(); c.globalAlpha = 1;
      }
    }
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (const t of this.texts) {
      if (t.delay > 0) continue;
      const a = clamp(t.life / t.max * 2, 0, 1), pop = 1 + Math.max(0, (t.life - t.max + .18) / .18) * .5;
      c.save(); c.globalAlpha = a; c.translate(t.x, t.y); c.scale(pop, pop);
      c.font = `800 ${t.size}px "Baloo 2", "Be Vietnam Pro", sans-serif`;
      c.lineWidth = 7; c.strokeStyle = 'rgba(20,34,74,.9)'; c.strokeText(t.str, 0, 0);
      c.fillStyle = t.color; c.fillText(t.str, 0, 0);
      c.restore();
    }
  }
}
