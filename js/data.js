'use strict';
/* Dữ liệu cân bằng, vật phẩm, thành tích và lưu trữ. Mọi con số ở đây chỉnh được mà không đụng tới logic. */

const W = 1280, H = 720;

const COWS = {
  normal: { id: 'normal', name: 'Bò thường', score: 10, gold: 5, size: 1, speed: 80, escape: 6.5, hook: .92, presses: 10, struggle: .25, weight: 60, diff: 'Dễ', desc: 'Hiền lành, hay dừng lại gặm cỏ. Con vật tập sự lý tưởng.' },
  small: { id: 'small', frames: 4, skinK: 1.23, name: 'Bò nhỏ', score: 8, gold: 4, size: .66, speed: 115, escape: 5, hook: .74, presses: 7, struggle: .3, weight: 26, diff: 'Khó quăng trúng', desc: 'Nhỏ và chạy nhanh nên khó móc, nhưng kéo rất nhẹ.' },
  big: { id: 'big', frames: 4, skinK: 1.23, name: 'Bò bự', score: 25, gold: 12, size: 1.45, speed: 55, escape: 9.5, hook: .97, presses: 22, struggle: .35, weight: 34, diff: 'Cần nhiều lực kéo', desc: 'Chậm, to, dễ quăng trúng. Phải kéo bền tay mới về.' },
  fast: { id: 'fast', frames: 4, skinK: 1.23, name: 'Bò nhanh', score: 18, gold: 9, size: .95, speed: 160, escape: 5, hook: .8, presses: 12, struggle: .25, weight: 22, diff: 'Cửa sổ bắt ngắn', desc: 'Chạy vút qua đồng, để lại một vệt bụi. Quăng đón đầu mới trúng.' },
  mad: { id: 'mad', frames: 4, skinK: 1.23, name: 'Bò điên', score: 40, gold: 20, size: 1.12, speed: 100, escape: 8, hook: .86, presses: 30, struggle: .85, weight: 18, diff: 'Giãy mạnh', desc: 'Mắt trợn, sừng lớn. Giãy từng đợt, cần kéo đều và đúng nhịp.' },
  red: { id: 'red', frames: 4, skinK: 1.23, name: 'Bò đỏ', score: 60, gold: 30, size: 1.18, speed: 110, escape: 8.5, hook: .8, presses: 34, struggle: .95, weight: 8, rare: 1, diff: 'Rất hung hăng', desc: 'Hiếm, nổi bật, hung hăng. Phần thưởng cao cho ai đủ gan.' },
  gold: { id: 'gold', frames: 4, skinK: 1.23, name: 'Bò vàng', score: 80, gold: 40, size: 1.05, speed: 130, escape: 8, hook: .72, presses: 36, struggle: .65, weight: 5, rare: 1, diff: 'Khó bắt', desc: 'Lấp lánh như rơm mới gặt. Chạy nhanh, thoát nhanh.' },
  witch: { id: 'witch', frames: 4, name: 'Bò phù thủy', score: 90, gold: 45, size: 1.05, speed: 125, escape: 8.5, hook: .7, presses: 38, struggle: .9, weight: 4, rare: 1, fly: 52, skinK: 1.23, halloween: 1, diff: 'Bay trên chổi', desc: 'Cưỡi chổi bay lượn trên đồng cỏ. Đội mũ nhọn, vãi sao vàng, và rất ghét bị trói.' },
  ghost: { id: 'ghost', frames: 4, name: 'Bò ma', score: 70, gold: 35, size: 1, speed: 95, escape: 9, hook: .74, presses: 30, struggle: .7, weight: 4, rare: 1, fly: 38, skinK: 1.23, halloween: 1, diff: 'Bay lơ lửng, chập chờn', desc: 'Trôi lơ lửng, lúc rõ lúc mờ. Bị bắt thì hóa xanh lục và giãy rất nhanh.' },
  rainbow: { id: 'rainbow', frames: 4, skinK: 1.23, name: 'Bò ngũ sắc', score: 150, gold: 75, size: 1, speed: 140, escape: 9, hook: .66, presses: 44, struggle: .85, weight: 3, rare: 1, diff: 'Cực hiếm', desc: 'Truyền thuyết đồng cỏ. Thấy là phải thử một lần.' }
};
if (!CLASSIC) COWS.normal.skinK = 1.23;
const COW_ORDER = ['normal', 'small', 'big', 'fast', 'mad', 'red', 'gold', 'rainbow', 'witch', 'ghost'];

const LEVELS = [
  { name: 'Đồng cỏ tập sự', target: 100, time: 90, maxCows: 4, speed: 1, resist: 1, weights: { normal: 80, big: 8 }, hint: 'Chủ yếu bò thường. Làm quen việc ngắm và kéo.' },
  { name: 'Đàn bò chạy nhanh', target: 180, time: 100, maxCows: 5, speed: 1.05, resist: 1, weights: { normal: 50, small: 30, fast: 25, big: 8 }, hint: 'Có bò nhỏ và bò nhanh. Quăng đón đầu.' },
  { name: 'Bò bự xuất hiện', target: 300, time: 110, maxCows: 5, speed: 1.05, resist: 1.03, weights: { normal: 40, big: 45, small: 15, fast: 10 }, hint: 'Nhiều bò bự. Một nâng cấp lực kéo sẽ giúp ích.' },
  { name: 'Đàn bò điên', target: 450, time: 120, maxCows: 6, speed: 1.1, resist: 1.06, weights: { normal: 35, big: 25, mad: 35, small: 10, fast: 10 }, hint: 'Bò giãy mạnh. Giữ nhịp kéo khi có cảnh báo.' },
  { name: 'Sắc đỏ nguy hiểm', target: 650, time: 130, maxCows: 6, speed: 1.12, resist: 1.08, weights: { normal: 30, big: 25, mad: 30, small: 10, fast: 12, red: 12 }, hint: 'Bò đỏ có thể xuất hiện. Đáng giá nhưng rất hung.' },
  { name: 'Săn cầu vồng', target: 900, time: 150, maxCows: 7, speed: 1.15, resist: 1.1, weights: { normal: 25, big: 25, mad: 25, small: 10, fast: 12, red: 12, gold: 9, rainbow: 6 }, hint: 'Bò hiếm xuất hiện nhiều hơn. Mục tiêu điểm cao.' },
  { name: 'Đêm Halloween', target: 1100, time: 150, maxCows: 7, speed: 1.15, resist: 1.1, halloween: true, weights: { normal: 22, big: 18, mad: 22, fast: 12, red: 8, witch: 14, ghost: 14 }, hint: 'Bò phù thủy và bò ma bay lơ lửng. Quăng dây lên cao hơn một chút.' }
];
function levelConfig(n) {
  if (n <= LEVELS.length) return Object.assign({ id: n }, LEVELS[n - 1]);
  const k = n - LEVELS.length;
  return {
    id: n, name: 'Thử thách vô tận ' + k, target: 900 + k * 300, time: 150, maxCows: 7,
    speed: Math.min(1.9, 1.2 + .05 * k), resist: Math.min(1.5, 1.12 + .03 * k),
    weights: { normal: 25, small: 22, big: 25, fast: 20, mad: 25, red: 12, gold: 9, rainbow: 6, witch: 6, ghost: 6 },
    hint: 'Độ khó tăng dần sau mỗi màn.', endless: true
  };
}

/* Mỗi cấp cộng ít dần: cấp cao không phá cân bằng */
const dim = (per, l) => { let s = 0; for (let i = 0; i < l; i++) s += per * (1 - .1 * i); return s; };
const pct = v => Math.round(v * 100);
const ITEMS = [
  { id: 'strong_rope', name: 'Dây thòng lọng chắc', base: 50, max: 5, desc: 'Sợi dây bện chặt, mỗi nhịp kéo hiệu quả hơn.', eff: l => dim(.05, l), fmt: v => `+${pct(v)}% lực kéo` },
  { id: 'long_rope', name: 'Dây dài', base: 70, max: 5, desc: 'Vòng thòng lọng nằm trên cao lâu hơn, dễ chờ cổ bò chạy qua.', eff: l => dim(.08, l), fmt: v => `+${Math.round(v * 1000)} ms giữ vòng` },
  { id: 'fast_rope', name: 'Dây bắt nhanh', base: 100, max: 5, desc: 'Dây bay nhanh, bò ít kịp đổi chỗ.', eff: l => dim(.1, l), fmt: v => `+${pct(v)}% tốc độ dây` },
  { id: 'pull_gloves', name: 'Găng tay kéo', base: 120, max: 5, desc: 'Mỗi lần nhấn KÉO cộng thêm lực.', eff: l => dim(.06, l), fmt: v => `+${pct(v)}% lực mỗi nhấn` },
  { id: 'grip_gloves', name: 'Găng tay chống trượt', base: 150, max: 5, desc: 'Mất ít lực hơn khi bò giãy.', eff: l => dim(.1, l), fmt: v => `-${pct(v)}% lực mất khi giãy` },
  { id: 'precise_hook', name: 'Móc dây chuẩn xác', base: 180, max: 5, desc: 'Vòng thòng lọng rộng hơn, dễ móc hơn.', eff: l => dim(4, l), fmt: v => `+${v.toFixed(1)} vùng móc` },
  { id: 'saddle', name: 'Yên giữ bò', base: 220, max: 5, desc: 'Bò mất nhiều thời gian hơn mới thoát được.', eff: l => dim(.08, l), fmt: v => `+${pct(v)}% thời gian thoát` },
  { id: 'lucky', name: 'Bùa may mắn', base: 250, max: 5, desc: 'Bò hiếm xuất hiện nhiều hơn một chút.', eff: l => dim(.12, l), fmt: v => `+${pct(v)}% bò hiếm` },
  { id: 'rainbow_rope', name: 'Dây cầu vồng', base: 500, max: 1, desc: 'Dây đổi màu cầu vồng, tăng nhẹ mọi chỉ số.', eff: l => l ? 1 : 0, fmt: v => v ? '+3% mọi chỉ số' : 'Chưa trang bị' },
  { id: 'energy_potion', name: 'Bình năng lượng', base: 80, max: 9, consumable: true, cap: 9, desc: 'Dùng khi đang kéo: sức kéo gấp đôi trong 5 giây.', eff: l => l, fmt: v => `${v} bình` }
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

function computeGear(items) {
  const L = id => items[id] || 0, e = id => ITEM[id].eff(L(id)), rb = L('rainbow_rope') ? 1 : 0;
  return {
    power: 1 + e('strong_rope') + rb * .03,
    perPress: 1 + e('pull_gloves'),
    grip: Math.min(.6, e('grip_gloves')),
    range: 700,
    hold: e('long_rope') + rb * .02,
    ropeSpeed: 1300 * (1 + e('fast_rope')) * (1 + rb * .03),
    loopR: 30 + e('precise_hook'),
    hit: 1 + e('precise_hook') * .004 + rb * .03,
    escape: 1 + e('saddle'),
    luck: 1 + e('lucky'),
    cool: .3,
    rainbow: !!rb
  };
}

const ACHV = [
  { id: 'first', name: 'Người chăn bò mới', desc: 'Bắt con bò đầu tiên.' },
  { id: 'speed', name: 'Tay kéo thần tốc', desc: 'Kéo xong bò bự hoặc bò nặng hơn trong dưới 2,5 giây.' },
  { id: 'streak', name: 'Chuỗi liền tay', desc: 'Bắt 5 con liên tiếp không để tuột.' },
  { id: 'red', name: 'Thợ săn bò đỏ', desc: 'Bắt được một con bò đỏ.' },
  { id: 'rainbow', name: 'Săn cầu vồng', desc: 'Bắt được một con bò ngũ sắc.' },
  { id: 'clean', name: 'Không để tuột', desc: 'Qua một màn mà không trượt dây và không để bò thoát.' },
  { id: 'rich', name: 'Đại gia đồng cỏ', desc: 'Có trong tay 1.000 vàng.' }
];

const DEFAULT_SAVE = () => ({
  version: 1, player: '', mode: 'catch', gold: 0, unlockedLevel: 1, bestScore: 0, bestByLevel: {},
  items: {}, consumables: { energy_potion: 0 },
  stats: { caught: {}, thrown: 0, missed: 0, escaped: 0, levelsWon: 0 },
  achievements: {},
  settings: { music: true, sfx: true, assist: false, difficulty: 1 },
  /* Bắn Bò có vàng, màn đã mở, kho súng và thành tích riêng */
  shoot: {
    gold: 0, unlockedLevel: 1, bestScore: 0, bestByLevel: {}, weapons: { pistol: 1 }, equipped: 'pistol',
    stats: { killed: {}, shots: 0, hits: 0, levelsWon: 0 }, achievements: {}
  }
});

const Save = {
  KEY: 'batbo.save',
  data: null,
  load() {
    let d = DEFAULT_SAVE();
    try {
      const raw = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (raw && typeof raw === 'object') this.merge(d, raw);
    } catch (e) { /* bỏ qua: dùng dữ liệu mặc định */ }
    d.gold = Math.max(0, Math.floor(+d.gold || 0));
    d.unlockedLevel = Math.max(1, Math.floor(+d.unlockedLevel || 1));
    d.version = 1;
    const sh = d.shoot;
    sh.gold = Math.max(0, Math.floor(+sh.gold || 0)); sh.unlockedLevel = Math.max(1, Math.floor(+sh.unlockedLevel || 1));
    sh.weapons.pistol = Math.max(1, +sh.weapons.pistol || 1);
    if (!(sh.weapons[sh.equipped] > 0)) sh.equipped = 'pistol';
    if (d.mode !== 'shoot') d.mode = 'catch';
    this.data = d;
  },
  merge(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') this.merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  },
  commit() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* chế độ riêng tư */ } },
  reset() { this.data = DEFAULT_SAVE(); this.commit(); }
};

/* Bảng thành tích chung: gửi lên máy chủ (mọi người chơi cùng thấy). Không có máy chủ thì lưu tạm trên máy này. */
const Board = {
  KEY: 'batbo.localboard',
  cleanName(n) { return String(n || '').replace(/[\x00-\x1f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); },
  best(runs) {
    const m = new Map();
    runs.forEach(e => { const k = e.name.toLowerCase(), o = m.get(k); if (!o || e.score > o.score) m.set(k, e); });
    return [...m.values()].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, 50);
  },
  localRuns() { try { const r = JSON.parse(localStorage.getItem(this.KEY) || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; } },
  async list(mode = 'catch') {
    try {
      const r = await fetch('api/scores.php?mode=' + mode, { cache: 'no-store' });
      if (!r.ok) throw new Error('x');
      return { rows: await r.json(), shared: true };
    } catch (e) { return { rows: this.best(this.localRuns().filter(x => (x.mode || 'catch') === mode)), shared: false }; }
  },
  async submit(e) {
    try {
      const r = await fetch('api/scores.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
      if (!r.ok) throw new Error('x');
      return { rows: await r.json(), shared: true };
    } catch (err) {
      const runs = this.localRuns(); runs.push(Object.assign({ ts: Date.now() }, e));
      try { localStorage.setItem(this.KEY, JSON.stringify(runs.slice(-300))); } catch (e2) { /* chế độ riêng tư */ }
      return { rows: this.best(runs.filter(x => (x.mode || 'catch') === (e.mode || 'catch'))), shared: false };
    }
  }
};

/* Dữ liệu của kiểu chơi đang chọn: vàng và màn đã mở nằm riêng theo kiểu */
const cur = () => Save.data.mode === 'shoot' ? Save.data.shoot : Save.data;

const Shop = {
  price(it, lvl) { return it.consumable ? it.base : Math.round(it.base * (1 + .6 * lvl) / 5) * 5; },
  level(it) { return it.consumable ? (Save.data.consumables[it.id] || 0) : (Save.data.items[it.id] || 0); },
  /* Trừ vàng đúng một lần, kiểm tra trước khi đổi dữ liệu */
  buy(id) {
    const it = ITEM[id], d = Save.data;
    if (!it) return 'UNKNOWN';
    const lvl = this.level(it);
    if (lvl >= it.max) return 'MAX';
    const p = this.price(it, lvl);
    if (d.gold < p) return 'NOT_ENOUGH_GOLD';
    d.gold -= p;
    if (it.consumable) d.consumables[id] = lvl + 1; else d.items[id] = lvl + 1;
    Save.commit();
    return 'OK';
  }
};

const Ach = {
  cb: null,
  unlock(id) {
    if (Save.data.achievements[id]) return false;
    Save.data.achievements[id] = true;
    Save.commit();
    if (this.cb) this.cb(ACHV.find(a => a.id === id));
    return true;
  }
};

/* Hình bò: ưu tiên ảnh trong thư mục assets/cows (normal.png, normal-hooked.png...), sau đó mới tới ảnh lưu trong trình duyệt. */
const Skins = {
  KEY: 'batbo.skins', data: {}, imgs: {}, imgsH: {}, rigs: {}, rigsH: {}, ver: Date.now(), server: false,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; } catch (e) { this.data = {}; }
    Object.keys(COWS).forEach(t => this.mk(t));
  },
  probe(t, kind, store) {
    const base = 'assets/cows/' + t + (kind === 'hooked' ? '-hooked' : ''), exts = ['png', 'webp', 'jpg'];
    let i = 0;
    const next = () => {
      if (i >= exts.length) return;
      const im = new Image();
      im.onload = () => { store[t] = im; };
      im.onerror = () => { i++; next(); };
      im.src = base + '.' + exts[i] + '?v=' + this.ver;
    };
    next();
  },
  /* ảnh rời từng bộ phận (đầu, thân, tay, chân...) để bò cử động bằng xương ảo; chỉ dùng khi người chơi chưa chọn ảnh riêng */
  mkRig(t) {
    delete this.rigs[t]; delete this.rigsH[t];
    const s = this.data[t] || {}; if (s.src || s.hooked || typeof RIG === 'undefined' || !RIG[t]) return;
    [['', this.rigs], ['-hooked', this.rigsH]].forEach(([suf, store]) => {
      const im = new Image(); im.onload = () => { store[t] = im; }; im.src = 'assets/cows/rig/' + t + suf + '.png?v=' + this.ver;
    });
  },
  rig(t, upset) { return (upset && this.rigsH[t]) || this.rigs[t] || null; },
  mk(t) {
    this.mkRig(t);
    const s = this.data[t] || {};
    [['src', this.imgs], ['hooked', this.imgsH]].forEach(([k, store]) => {
      delete store[t];
      if (s[k]) { const im = new Image(); im.onload = () => { store[t] = im; }; im.src = s[k]; }
      else this.probe(t, k, store);
    });
  },
  /* trả ảnh khi bị bắt nếu có, nếu không thì dùng ảnh bình thường */
  get(t, upset) { return (upset && this.imgsH[t]) || this.imgs[t] || null; },
  has(t, kind) { return !!(kind === 'hooked' ? this.imgsH[t] : this.imgs[t]); },
  /* ảnh nhiều khung (bảng ảnh ngang) nếu rộng hơn hai lần chiều cao */
  frames(t, im) { const f = (COWS[t] && COWS[t].frames) || 1; return f > 1 && im && im.width / im.height > 2 ? f : 1; },
  src(t, kind) {
    const im = kind === 'hooked' ? this.imgsH[t] : this.imgs[t]; if (!im) return '';
    const f = this.frames(t, im); if (f === 1) return im.src;
    const cw = Math.round(im.width / f), c = document.createElement('canvas'); c.width = cw; c.height = im.height;
    c.getContext('2d').drawImage(im, 0, 0, cw, im.height, 0, 0, cw, im.height);
    try { return c.toDataURL('image/png'); } catch (e) { return ''; }
  },
  opt(t, key) { return !!(this.data[t] && this.data[t][key]); },
  flip(t) { return this.opt(t, 'flip'); },
  oval(t) { return this.opt(t, 'oval'); },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; } },
  /* lưu trong trình duyệt (khi không có máy chủ) */
  set(t, kind, src) { const s = this.data[t] || (this.data[t] = {}); s[kind] = src; this.mk(t); return this.save(); },
  /* ảnh đã được máy chủ ghi vào thư mục assets/cows */
  setFile(t, kind) { if (this.data[t]) delete this.data[t][kind]; this.ver = Date.now(); this.save(); this.mk(t); },
  toggle(t, key) { const s = this.data[t] || (this.data[t] = {}); s[key] = !s[key]; this.save(); },
  clear(t) {
    delete this.data[t]; this.save(); delete this.imgs[t]; delete this.imgsH[t];
    fetch('/api/skin?type=' + t, { method: 'DELETE' }).catch(() => { /* không có máy chủ */ });
  }
};
Skins.load();
