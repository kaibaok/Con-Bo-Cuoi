'use strict';
/* Bò mới của Bắn Bò: mỗi con có trang phục hoặc phương tiện riêng, vẽ bằng canvas.
   Đầu bò là ảnh gương mặt khi mở bo-style=1, còn mặc định là mặt hoạt hình như các bò khác. */

const RIDER_PHOTO = CLASSIC ? Object.assign(new Image(), { src: 'assets/cows/rig/big.png' }) : null;
const RIDER_PHOTO_BOX = [299 * 7 + 150 - 48, 90, 96, 124];   // vùng gương mặt trong ô đầu của ảnh rig
Object.assign(FACES, {
  skirt: { skin: '#FFF3E2', a: 50, eye: 'derp', mouth: 'buck', brow: 'raise' },
  drag: { skin: '#FFF0E6', a: 50, eye: 'sparkle', mouth: 'tongue', brow: 'soft' },
  bike: { skin: '#FFFFFF', a: 50, eye: 'cross', mouth: 'grin', brow: 'raise' },
  cyclo: { skin: '#FFF3E2', a: 50, eye: 'half', mouth: 'smirk', brow: 'flat' },
  tank: { skin: '#F3E2C8', a: 50, eye: 'angry', mouth: 'fang', brow: 'angry' },
  plane: { skin: '#FFFFFF', a: 50, eye: 'cross', mouth: 'grin', brow: 'raise' },
  ufo: { skin: '#E6F7EA', a: 50, eye: 'hollow', mouth: 'oh', brow: 'worry' },
  superman: { skin: '#FFF3E2', a: 50, eye: 'half', mouth: 'smirk', brow: 'raise' },
  wonder: { skin: '#FFF0E6', a: 50, eye: 'wink', mouth: 'tongue', brow: 'soft' },
  ironman: { skin: '#FFF3E2', a: 50, eye: 'slant', mouth: 'cackle', brow: 'angry' }
});

const RK = '#2a1830', RCREAM = '#FFF3E2';
function rEll(c, x, y, rx, ry, fill, stroke, lw = 3.5, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}
function rPoly(c, pts, fill, stroke, lw = 3.5) {
  c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}
function rLine(c, pts, w, col = RK) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
}
/* chi có viền: viền tối rồi tô màu bên trong */
function rLimb(c, pts, w, fill = RCREAM) { rLine(c, pts, w + 4, RK); rLine(c, pts, w, fill); }
function rTorso(c, x, y, rx, ry, fill = RCREAM, spots = true, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  rEll(c, 0, 0, rx, ry, fill, null);
  if (spots) {
    c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.clip(); c.fillStyle = '#A9714A';
    [[-.4, -.3, .35, .3], [.45, .25, .3, .28]].forEach(([a, b, w, h]) => { c.beginPath(); c.ellipse(a * rx, b * ry, w * rx, h * ry, .3, 0, TAU); c.fill(); });
    c.restore();
  }
  rEll(c, 0, 0, rx, ry, null, RK, 4); c.restore();
}
function rWheel(c, x, y, r, rot) {
  rEll(c, x, y, r, r, null, RK, 5);
  c.strokeStyle = '#cfd8e8'; c.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); c.stroke(); }
  rEll(c, x, y, 3.5, 3.5, '#cfd8e8', RK, 1.5);
}
function rStar(c, x, y, r, fill) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr_ = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_); }
  c.closePath(); c.fillStyle = fill; c.fill();
}

/* Đầu bò đặt tại (x, y), k là tỉ lệ so với khung mặt của ảnh rig. behind vẽ phía sau đầu (tóc, vòng giáp), deco vẽ lên trên mặt (mũ, kính). */
function riderHead(c, o, x, y, k, behind, deco, tilt = 0) {
  const upset = !!o.mood && o.mood !== 'calm', t = o.t || 0, ph = o.ph || 0;
  c.save(); c.translate(x, y); c.rotate(tilt + (upset ? Math.sin(t * 30) * .06 : Math.sin(t * 1.7 + ph) * .03)); c.scale(k, k);
  if (behind) behind(c);
  // sừng và tai
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(s * 26, -56); c.quadraticCurveTo(s * 40, -66, s * 42, -88); c.quadraticCurveTo(s * 26, -78, s * 14, -60); c.closePath();
    c.fillStyle = '#FFF1CF'; c.fill(); c.strokeStyle = RK; c.lineWidth = 3.5; c.stroke();
    c.save(); c.translate(s * 60, -2); c.rotate(s * .45);
    rEll(c, 0, 0, 28, 15, RCREAM, RK, 4); rEll(c, 0, 0, 17, 8, '#F8B4AA', null); c.restore();
  }
  if (RIDER_PHOTO && RIDER_PHOTO.complete && RIDER_PHOTO.naturalWidth) {
    c.save(); c.beginPath(); c.ellipse(0, 0, 48, 62, 0, 0, TAU); c.clip();
    c.drawImage(RIDER_PHOTO, RIDER_PHOTO_BOX[0], RIDER_PHOTO_BOX[1], RIDER_PHOTO_BOX[2], RIDER_PHOTO_BOX[3], -48, -62, 96, 124);
    c.restore(); rEll(c, 0, 0, 48, 62, null, RK, 4);
    if (upset) { // ảnh không đổi nét mặt nên thêm dấu hiệu bị bắn trúng
      c.strokeStyle = '#E5382B'; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(40, -62); c.quadraticCurveTo(52, -54, 40, -42); c.moveTo(58, -62); c.quadraticCurveTo(46, -54, 58, -42); c.stroke();
    }
  } else drawFace(c, { type: o.type, t, ph, mood: o.mood }, upset, 1, v => v - 150, v => v - 152);
  if (deco) deco(c);
  c.restore();
}
const rHelmet = col => c => {
  c.beginPath(); c.moveTo(-52, -22); c.quadraticCurveTo(-58, -96, 0, -98); c.quadraticCurveTo(58, -96, 52, -22); c.quadraticCurveTo(0, -44, -52, -22); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = RK; c.lineWidth = 4; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-6, -92); c.lineTo(-4, -46); c.stroke();
};

const RIDERS = {};

RIDERS.skirt = (c, o) => {
  const w = (o.walk || 0) * 1.6, mv = o.moving !== false, sn = Math.sin(w), sway = mv ? sn * 5 : 0;
  c.translate(0, mv ? -Math.abs(sn) * 3 : 0);
  for (const s of [-1, 1]) { const sw = mv ? Math.sin(w + (s > 0 ? 0 : Math.PI)) * 13 : 0; rLimb(c, [[s * 9, -40], [s * 9 + sw, -7]], 8); rEll(c, s * 9 + sw, -4, 8, 4, '#3a2a22'); }
  rLine(c, [[-22, -82], [-40 - sway, -70 - Math.sin(o.t * 5) * 4], [-44 - sway, -50]], 5, '#C79C69');
  rTorso(c, 0, -70, 26, 29);
  rPoly(c, [[-26, -50], [26, -50], [46 + sway, -17], [-46 + sway, -17]], '#EE6FA3', RK);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-20 + i * 10, -48); c.lineTo(-33 + i * 16.5 + sway * .7, -19); c.stroke(); }
  rPoly(c, [[-26, -52], [26, -52], [26, -45], [-26, -45]], '#FFD54A', RK, 3);
  for (const s of [-1, 1]) rLimb(c, [[s * 24, -78], [s * 36 + (mv ? sn * 5 * s : 0), -56]], 7);
  riderHead(c, o, 0, -116, .46, null, cc => rEll(cc, -46, -50, 10, 10, '#FF6FA8', RK, 3));
};

RIDERS.drag = (c, o) => {
  const w = (o.walk || 0) * 1.8, mv = o.moving !== false, sn = Math.sin(w);
  c.translate(0, mv ? -Math.abs(sn) * 3 : 0);
  for (const s of [-1, 1]) {
    const sw = mv ? Math.sin(w + (s > 0 ? 0 : Math.PI)) * 14 : 0;
    rLimb(c, [[s * 9, -44], [s * 9 + sw, -10]], 7);
    rPoly(c, [[s * 9 + sw - 7, -12], [s * 9 + sw + 8, -12], [s * 9 + sw + 12, -3], [s * 9 + sw - 5, -3]], '#D81B4A', RK, 3);
  }
  rTorso(c, 0, -72, 24, 29);
  rPoly(c, [[-25, -96], [25, -96], [31, -46], [-31, -46]], '#8E44AD', RK);
  for (let i = 0; i < 7; i++) rEll(c, -18 + (i * 13) % 36, -88 + (i * 9) % 38, 2, 2, 'rgba(255,255,255,.8)', null);
  rLine(c, [[0, -96], [0, -52]], 2, 'rgba(255,255,255,.35)');
  // túi xách đung đưa
  const bg = mv ? sn * 6 : 0;
  rLimb(c, [[24, -82], [38 + bg, -58]], 7);
  rLine(c, [[38 + bg, -58], [34 + bg, -44]], 2.5, RK); rPoly(c, [[26 + bg, -44], [46 + bg, -44], [44 + bg, -28], [28 + bg, -28]], '#FF6FA8', RK, 3);
  rLimb(c, [[-24, -82], [-36 - bg * .5, -60]], 7);
  riderHead(c, o, 0, -118, .46,
    cc => { rEll(cc, 0, 8, 64, 86, '#F2C94C', RK, 4); rPoly(cc, [[-60, 40], [-70, 96], [-40, 80]], '#F2C94C', RK, 3); rPoly(cc, [[60, 40], [70, 96], [40, 80]], '#F2C94C', RK, 3); },
    cc => {
      rPoly(cc, [[-50, -22], [-44, -66], [0, -74], [44, -66], [50, -22], [30, -46], [0, -38], [-30, -46]], '#F2C94C', RK, 3.5);
      rEll(cc, 0, 50, 15, 7, '#D81B4A', null); rEll(cc, -4, 48, 5, 2, 'rgba(255,255,255,.5)', null);
      for (const s of [-1, 1]) { const x = s * 20; for (let i = -1; i <= 1; i++) rLine(cc, [[x + i * 7, -26], [x + i * 9 + s * 4, -36]], 3); rEll(cc, s * 54, 12, 5, 8, '#F6B93B', RK, 2.5); }
    });
};

RIDERS.bike = (c, o) => {
  const w = o.walk || 0, sp = w * 1.5, mv = o.moving !== false;
  const B = [-2, -24], S = [-14, -64], H = [28, -62];
  c.translate(0, mv ? Math.sin(w * 2) * 1.2 : 0);
  rLine(c, [[-26, -90], [-44, -82 + Math.sin(o.t * 6) * 3], [-50, -66]], 5, '#C79C69');
  rWheel(c, -40, -24, 24, sp); rWheel(c, 40, -24, 24, sp);
  rLine(c, [[-40, -24], B, S, H, [40, -24]], 5, '#E5483A'); rLine(c, [B, H], 5, '#E5483A');
  rLine(c, [H, [32, -78], [42, -80]], 4); rEll(c, -17, -67, 12, 4, RK);
  for (const ph of [0, Math.PI]) {
    const a = sp + ph, fx = B[0] + Math.cos(a) * 14, fy = B[1] + Math.sin(a) * 14, hip = [-12, -70];
    rLimb(c, [hip, [(hip[0] + fx) / 2 + 9, (hip[1] + fy) / 2 - 8], [fx, fy]], 8); rEll(c, fx + 3, fy + 2, 8, 4, '#3a2a22');
  }
  rTorso(c, -3, -94, 20, 28, RCREAM, true, .35);
  rLimb(c, [[8, -104], [22, -88], [34, -78]], 7);
  riderHead(c, o, 12, -134, .44, null, rHelmet('#4FC3F7'), .1);
};

RIDERS.cyclo = (c, o) => {
  const w = o.walk || 0, sp = w * 1.3, mv = o.moving !== false;
  c.translate(0, mv ? Math.sin(w * 2) * 1 : 0);
  rWheel(c, -50, -26, 26, sp); rWheel(c, 54, -22, 22, sp);
  // xe và ghế khách
  rLine(c, [[-50, -26], [-22, -26], [-8, -60], [6, -56]], 5, '#2F8F4E'); rLine(c, [[-22, -26], [8, -26], [54, -22]], 5, '#2F8F4E');
  rPoly(c, [[6, -40], [84, -40], [90, -28], [6, -28]], '#2F8F4E', RK);
  rPoly(c, [[8, -40], [10, -76], [42, -76], [40, -40]], '#E5483A', RK);
  // khách ngồi: một chú bò nhỏ
  riderHead(c, { type: 'small', t: o.t, ph: (o.ph || 0) + 1, mood: o.mood }, 56, -66, .27, null,
    cc => { rEll(cc, -22, -4, 22, 22, '#222', null); rEll(cc, 22, -4, 22, 22, '#222', null); rLine(cc, [[-44, -4], [44, -4]], 6, '#222'); }, -.05);
  rPoly(c, [[56, -28], [92, -28], [84, -50], [60, -50]], '#E8C14A', RK, 3);
  c.beginPath(); c.moveTo(6, -76); c.quadraticCurveTo(46, -108, 96, -66); c.lineTo(88, -60); c.quadraticCurveTo(46, -90, 14, -64); c.closePath();
  c.fillStyle = '#E8C14A'; c.fill(); c.strokeStyle = RK; c.lineWidth = 3.5; c.stroke();
  for (let i = 0; i < 6; i++) rLine(c, [[14 + i * 14, -66 - Math.sin(i / 5 * Math.PI) * 14 + 2], [14 + i * 14, -58]], 2, '#E5483A');
  // người đạp
  for (const ph of [0, Math.PI]) {
    const a = sp + ph, fx = -22 + Math.cos(a) * 14, fy = -28 + Math.sin(a) * 14, hip = [-40, -74];
    rLimb(c, [hip, [(hip[0] + fx) / 2 + 8, (hip[1] + fy) / 2 - 6], [fx, fy]], 8); rEll(c, fx + 3, fy + 2, 8, 4, '#3a2a22');
  }
  rTorso(c, -40, -98, 20, 26, RCREAM, true, .1);
  rLimb(c, [[-30, -108], [-12, -96], [0, -84]], 7);
  riderHead(c, o, -38, -134, .44, null, cc => {
    c.beginPath(); cc.moveTo(-92, -26); cc.quadraticCurveTo(0, -150, 92, -26); cc.quadraticCurveTo(0, -48, -92, -26); cc.closePath();
    cc.fillStyle = '#F1D58A'; cc.fill(); cc.strokeStyle = RK; cc.lineWidth = 4; cc.stroke();
    rLine(cc, [[-34, -62], [-30, -34]], 2, '#B8903D'); rLine(cc, [[0, -92], [0, -40]], 2, '#B8903D'); rLine(cc, [[34, -62], [30, -34]], 2, '#B8903D');
    rLine(cc, [[-46, -22], [-40, 40]], 3, '#E5483A'); rLine(cc, [[46, -22], [40, 40]], 3, '#E5483A');
  });
};

RIDERS.tank = (c, o) => {
  const w = o.walk || 0, t = o.t || 0, mv = o.moving !== false, rc = Math.pow(Math.max(0, Math.sin(t * 1.3 + (o.ph || 0))), 10) * 12;
  c.translate(mv ? Math.sin(w * 6) * .8 : 0, 0);
  // xích
  c.save(); rEll(c, 0, -16, 72, 17, '#3a3f33', RK, 4);
  c.clip(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4;
  const off = (w * 14) % 14; for (let x = -90; x < 90; x += 14) { c.beginPath(); c.moveTo(x + off, -34); c.lineTo(x + off, 2); c.stroke(); }
  c.restore();
  for (let i = -3; i <= 3; i++) rEll(c, i * 20, -16, 8.5, 8.5, '#59615a', RK, 3);
  rPoly(c, [[-62, -30], [62, -30], [50, -58], [-50, -58]], '#6B8E3A', RK);
  rLine(c, [[-40, -44], [40, -44]], 2, 'rgba(0,0,0,.25)'); for (const x of [-48, -24, 0, 24, 48]) rEll(c, x, -36, 2, 2, '#3b5220', null);
  rStar(c, 38, -46, 8, '#fff');
  // nòng pháo
  rPoly(c, [[24, -81], [112 - rc, -81], [112 - rc, -69], [24, -69]], '#4a6228', RK, 4); rPoly(c, [[106 - rc, -84], [118 - rc, -84], [118 - rc, -66], [106 - rc, -66]], '#3b5220', RK, 3.5);
  rEll(c, -4, -70, 36, 17, '#5C7C33', RK, 4.5);
  // bò thò đầu ra khỏi nắp
  rEll(c, -18, -80, 18, 6, '#3b5220', RK, 3);
  riderHead(c, o, -18, -112, .44, null, rHelmet('#6B8E3A'));
  rPoly(c, [[-38, -84], [2, -84], [4, -76], [-40, -76]], '#5C7C33', RK, 3.5);
};

RIDERS.plane = (c, o) => {
  const t = o.t || 0;
  c.translate(0, Math.sin(t * 3) * 2); c.rotate(Math.sin(t * 1.4 + (o.ph || 0)) * .06);
  rLine(c, [[-14, -40], [-18, -26]], 4); rEll(c, -18, -23, 8, 8, '#2a1830', RK, 2); rLine(c, [[18, -40], [14, -26]], 4); rEll(c, 14, -23, 8, 8, '#2a1830', RK, 2);
  rPoly(c, [[-50, -64], [-76, -100], [-62, -102], [-34, -72]], '#E5483A', RK);
  rEll(c, -60, -64, 18, 6, '#F6B93B', RK, 3.5);
  rEll(c, 0, -60, 66, 23, '#E5483A', RK, 4.5);
  c.save(); c.beginPath(); c.ellipse(0, -60, 66, 23, 0, 0, TAU); c.clip(); c.fillStyle = '#FFF3E2'; c.fillRect(-70, -52, 140, 10); c.fillStyle = '#F6B93B'; c.fillRect(-70, -44, 140, 4); c.restore();
  rEll(c, 0, -60, 66, 23, null, RK, 4.5);
  // lái máy bay: đầu bò trong buồng lái
  riderHead(c, o, 8, -86, .4, null, cc => {
    cc.beginPath(); cc.moveTo(-50, -24); cc.quadraticCurveTo(-56, -92, 0, -94); cc.quadraticCurveTo(56, -92, 50, -24); cc.quadraticCurveTo(0, -40, -50, -24); cc.closePath();
    cc.fillStyle = '#8A5A2B'; cc.fill(); cc.strokeStyle = RK; cc.lineWidth = 4; cc.stroke();
    for (const s of [-1, 1]) { rEll(cc, s * 24, -44, 15, 15, 'rgba(160,230,255,.85)', RK, 4); }
    rLine(cc, [[-50, -44], [50, -44]], 4);
  });
  c.beginPath(); c.ellipse(8, -74, 34, 38, 0, Math.PI, TAU); c.closePath();
  c.fillStyle = 'rgba(170,225,255,.35)'; c.fill(); c.strokeStyle = 'rgba(80,150,190,.9)'; c.lineWidth = 3; c.stroke();
  const sc = Math.sin(t * 2.4) * 5; rLine(c, [[-10, -66], [-34, -70 + sc], [-52, -64 + sc * 1.4]], 6, '#F6B93B');
  rEll(c, 4, -50, 30, 8, '#F6B93B', RK, 3.5, -.08);
  // cánh quạt
  c.save(); c.translate(68, -60); rEll(c, 0, 0, 5, 7, '#cfd8e8', RK, 2.5);
  c.globalAlpha *= .32; rEll(c, 0, 0, 7, 30, '#9fb2c9', null); c.globalAlpha /= .32;
  const a = t * 40; for (let i = 0; i < 2; i++) { c.save(); c.rotate(a + i * Math.PI); c.scale(.25, 1); rEll(c, 0, -16, 6, 16, '#2a1830', null); c.restore(); }
  c.restore();
};

RIDERS.ufo = (c, o) => {
  const t = o.t || 0;
  c.save(); c.globalAlpha *= .2 + .08 * Math.sin(t * 5);
  rPoly(c, [[-24, -48], [24, -48], [74, 18], [-74, 18]], '#bff7ff', null);
  c.restore();
  c.translate(0, Math.sin(t * 2.4 + (o.ph || 0)) * 3); c.rotate(Math.sin(t * 1.8) * .05);
  riderHead(c, o, 0, -90, .42, null, cc => { for (const s of [-1, 1]) { rLine(cc, [[s * 20, -58], [s * 34, -96]], 5, '#3d8f58'); rEll(cc, s * 35, -100, 8, 8, '#7CF0BF', RK, 3); } });
  c.beginPath(); c.ellipse(0, -66, 38, 48, 0, Math.PI, TAU); c.closePath();
  c.fillStyle = 'rgba(150,240,255,.32)'; c.fill(); c.strokeStyle = '#5fc4d6'; c.lineWidth = 3.5; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.beginPath(); c.arc(0, -66, 30, Math.PI * 1.1, Math.PI * 1.35); c.stroke();
  rEll(c, 0, -52, 74, 17, '#B8C4D8', RK, 4.5); rEll(c, 0, -60, 54, 12, '#DCE4F2', RK, 3.5);
  for (let i = 0; i < 7; i++) rEll(c, -54 + i * 18, -46 + Math.abs(i - 3) * -.6 + 4, 4.5, 4.5, `hsl(${(i * 50 + t * 240) % 360},95%,${55 + 12 * Math.sin(t * 8 + i)}%)`, RK, 1.8);
};

RIDERS.superman = (c, o) => {
  const w = o.walk || 0, t = o.t || 0, wv = Math.sin(t * 7 + w);
  c.translate(0, Math.sin(t * 2.6) * 2); c.rotate(-.12);
  // áo choàng bay phần phật
  rPoly(c, [[-8, -102], [12, -102], [-34 + wv * 4, -80], [-84 + wv * 8, -62 + wv * 6], [-92 + wv * 6, -34 - wv * 5], [-70, -22 + wv * 4], [-40, -34], [-14, -50]], '#D32F2F', RK);
  rLine(c, [[-20, -90], [-62 + wv * 5, -58]], 2, 'rgba(255,255,255,.3)');
  // chân xanh, giày đỏ
  rLimb(c, [[-8, -48], [-22, -30], [-34, -14]], 9, '#1F5FBF'); rEll(c, -37, -11, 9, 5, '#C62828', RK, 3);
  rLimb(c, [[8, -48], [14, -28], [8, -10]], 9, '#1F5FBF'); rEll(c, 10, -7, 9, 5, '#C62828', RK, 3);
  rTorso(c, 0, -76, 24, 30, '#1F5FBF', false);
  rPoly(c, [[-24, -56], [24, -56], [22, -44], [-22, -44]], '#C62828', RK, 3.5); rPoly(c, [[-24, -58], [24, -58], [24, -52], [-24, -52]], '#FFD54A', RK, 3);
  rPoly(c, [[-11, -92], [11, -92], [11, -76], [0, -66], [-11, -76]], '#FFD54A', RK, 3);
  c.fillStyle = '#C62828'; c.font = '800 17px "Baloo 2", sans-serif'; c.textAlign = 'center'; c.fillText('S', 0, -76);
  // một tay đấm tới, một tay chống hông
  rLimb(c, [[18, -96], [42, -112], [58, -118]], 8, '#1F5FBF'); rEll(c, 62, -119, 8, 8, RCREAM, RK, 3);
  rLimb(c, [[-20, -94], [-32, -80], [-22, -66]], 8, '#1F5FBF');
  riderHead(c, o, 6, -128, .46, null, cc => {
    cc.beginPath(); cc.moveTo(-50, -18); cc.quadraticCurveTo(-58, -82, 0, -84); cc.quadraticCurveTo(58, -82, 50, -18);
    cc.quadraticCurveTo(44, -48, 10, -50); cc.quadraticCurveTo(-30, -52, -50, -18); cc.closePath(); cc.fillStyle = '#16121c'; cc.fill(); cc.strokeStyle = RK; cc.lineWidth = 3.5; cc.stroke();
    cc.beginPath(); cc.moveTo(0, -50); cc.quadraticCurveTo(14, -34, 30, -38); cc.quadraticCurveTo(14, -52, 0, -50); cc.fillStyle = '#16121c'; cc.fill(); cc.stroke();
  }, -.12);
};

RIDERS.wonder = (c, o) => {
  const w = (o.walk || 0) * 1.5, t = o.t || 0, mv = o.moving !== false, sn = Math.sin(w), hop = mv ? Math.abs(sn) * 8 : 0;
  c.translate(0, -hop);
  // tóc dài và sợi dây thần
  for (const s of [-1, 1]) {
    const sw = mv ? Math.sin(w + (s > 0 ? 0 : Math.PI)) * 12 : 0;
    rLimb(c, [[s * 9, -46], [s * 9 + sw, -8]], 8); rPoly(c, [[s * 9 + sw - 8, -30], [s * 9 + sw + 8, -30], [s * 9 + sw + 7, -4], [s * 9 + sw - 7, -4]], '#C62828', RK, 3);
  }
  rTorso(c, 0, -76, 22, 28, '#C62828', false);
  rPoly(c, [[-9, -92], [9, -92], [7, -72], [0, -68], [-7, -72]], '#F2B01E', RK, 2.5);
  rLine(c, [[-22, -62], [22, -62]], 6, '#F2B01E');
  rPoly(c, [[-22, -56], [22, -56], [30, -34], [-30, -34]], '#1E4DA8', RK);
  c.fillStyle = '#fff'; c.font = '800 12px sans-serif'; c.textAlign = 'center'; for (const x of [-16, 0, 16]) c.fillText('★', x, -42);
  for (const s of [-1, 1]) {
    const sw = mv ? sn * 6 * s : 0;
    rLimb(c, [[s * 21, -92], [s * 34 + sw, -70], [s * 30 + sw * 1.3, -50]], 7); rLine(c, [[s * 32 + sw, -62], [s * 31 + sw * 1.3, -54]], 9, '#F2B01E');
  }
  // dây thần xoay vòng
  c.save(); c.translate(48, -54); c.rotate(t * 3); rEll(c, 0, -14, 15, 12, null, '#F2B01E', 4); c.restore();
  riderHead(c, o, 0, -118, .46, cc => { rEll(cc, 0, 14, 62, 90, '#1b1020', RK, 4); }, cc => {
    rPoly(cc, [[-44, -34], [-34, -50], [-20, -44], [0, -62], [20, -44], [34, -50], [44, -34], [30, -40], [0, -48], [-30, -40]], '#F2B01E', RK, 3.5);
    rStar(cc, 0, -50, 9, '#E5483A');
  });
};

RIDERS.ironman = (c, o) => {
  const t = o.t || 0, pulse = .6 + .4 * Math.sin(t * 7);
  c.translate(0, Math.sin(t * 2.8) * 2.5);
  // lửa phun từ hai bàn chân
  for (const x of [-12, 12]) {
    const L = 22 + 10 * Math.sin(t * 30 + x);
    rPoly(c, [[x - 7, -16], [x + 7, -16], [x, -16 + L]], '#FFB02E', null); rPoly(c, [[x - 4, -16], [x + 4, -16], [x, -16 + L * .6]], '#FFF2A8', null);
  }
  for (const x of [-12, 12]) { rLimb(c, [[x, -52], [x, -26]], 10, '#C0392B'); rPoly(c, [[x - 8, -28], [x + 8, -28], [x + 6, -14], [x - 6, -14]], '#F2B01E', RK, 3); }
  rTorso(c, 0, -80, 25, 30, '#C0392B', false);
  rPoly(c, [[-18, -56], [18, -56], [14, -48], [-14, -48]], '#F2B01E', RK, 3);
  rPoly(c, [[-16, -100], [-6, -96], [-6, -62], [-16, -66]], '#F2B01E', RK, 3); rPoly(c, [[16, -100], [6, -96], [6, -62], [16, -66]], '#F2B01E', RK, 3);
  const g = c.createRadialGradient(0, -82, 1, 0, -82, 20); g.addColorStop(0, `rgba(160,250,255,${.9 * pulse})`); g.addColorStop(1, 'rgba(160,250,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, -82, 20, 0, TAU); c.fill(); rEll(c, 0, -82, 8, 8, '#E6FFFF', RK, 2.5);
  rLimb(c, [[22, -98], [44, -92], [62, -90]], 9, '#C0392B'); rEll(c, 66, -90, 9, 9, '#F2B01E', RK, 3);
  const g2 = c.createRadialGradient(66, -90, 1, 66, -90, 18); g2.addColorStop(0, `rgba(180,252,255,${pulse})`); g2.addColorStop(1, 'rgba(180,252,255,0)');
  c.fillStyle = g2; c.beginPath(); c.arc(66, -90, 18, 0, TAU); c.fill();
  rLimb(c, [[-22, -98], [-36, -82], [-26, -66]], 9, '#C0392B'); rEll(c, -26, -64, 8, 8, '#F2B01E', RK, 3);
  riderHead(c, o, 0, -126, .46, cc => { rEll(cc, 0, 4, 62, 76, '#C0392B', RK, 4.5); },
    cc => {
      rEll(cc, 0, 0, 48, 62, null, '#F2B01E', 9);
      rPoly(cc, [[-50, -22], [-44, -66], [0, -76], [44, -66], [50, -22], [34, -48], [0, -42], [-34, -48]], '#C0392B', RK, 4);
      rLine(cc, [[0, -76], [0, -46]], 6, '#F2B01E');
      rPoly(cc, [[-52, 4], [-38, 18], [-38, 48], [-52, 40]], '#F2B01E', RK, 3.5); rPoly(cc, [[52, 4], [38, 18], [38, 48], [52, 40]], '#F2B01E', RK, 3.5);
    });
};

function drawRider(c, o) {
  const f = RIDERS[o.type]; if (!f) return;
  c.save();
  if (o.flash > 0) { try { c.filter = 'brightness(2.1) saturate(.35)'; } catch (e) { /* trình duyệt cũ */ } }
  c.lineCap = 'round'; c.lineJoin = 'round';
  f(c, o);
  c.restore();
}
