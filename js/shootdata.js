'use strict';
/* Bắn Bò: bò mới, vũ khí, màn chơi và thành tích riêng. Tách hẳn khỏi Bắt Bò: vàng, màn đã mở và kho súng đều tính riêng. */

/* Máu của các bò cũ khi bị bắn */
const HP0 = { normal: 40, small: 24, big: 120, fast: 44, mad: 90, red: 105, gold: 95, rainbow: 140, witch: 90, ghost: 75 };
Object.keys(HP0).forEach(k => { COWS[k].hp = HP0[k]; });

/* Bò mới chỉ có trong Bắn Bò. hr: bán kính trúng đạn, cy: độ cao tâm thân, đều tính ở tỉ lệ 1 */
Object.assign(COWS, {
  skirt: { id: 'skirt', name: 'Bò mặt váy', score: 20, gold: 8, size: 1, speed: 85, hp: 55, hr: 46, cy: 66, diff: 'Hay ngượng', desc: 'Diện váy hồng xoè đi dạo đồng cỏ, bước chân rất tự tin. Không biết ai đã mặc cho.' },
  drag: { id: 'drag', name: 'Bò giả gái', score: 30, gold: 12, size: 1.02, speed: 120, hp: 60, hr: 46, cy: 66, diff: 'Đi giày cao gót', desc: 'Tóc vàng, son đỏ, túi xách đung đưa. Chạy khá nhanh dù mang giày cao gót.' },
  bike: { id: 'bike', name: 'Bò đạp xe', score: 28, gold: 11, size: 1, speed: 170, hp: 50, hr: 50, cy: 78, diff: 'Lạng lách nhanh', desc: 'Đội mũ bảo hiểm, đạp hết ga qua bãi cỏ. Chạy nhanh nên phải bắn đón đầu.' },
  cyclo: { id: 'cyclo', name: 'Bò đạp xích lô', score: 45, gold: 18, size: 1.25, speed: 110, hp: 110, hr: 70, cy: 70, diff: 'Chở khách phía trước', desc: 'Đội nón lá, đạp xích lô chở một chú bò khách. Cả hai cùng là mục tiêu.' },
  tank: { id: 'tank', name: 'Bò lái xe tăng', score: 90, gold: 40, size: 1.5, speed: 55, hp: 380, hr: 82, cy: 58, rare: 1, diff: 'Rất trâu', desc: 'Chậm nhưng cực dày máu, đầu bò thò ra khỏi nắp xe. Cần vũ khí nổ.' },
  plane: { id: 'plane', name: 'Bò lái máy bay', score: 70, gold: 30, size: 1.15, speed: 190, hp: 120, hr: 60, cy: 64, fly: 78, diff: 'Bay nhanh', desc: 'Cánh quạt quay tít, bay vòng vòng trên đồng. Bóng bay thấp hơn mục tiêu một chút.' },
  ufo: { id: 'ufo', name: 'Bò lái UFO', score: 110, gold: 50, size: 1.1, speed: 150, hp: 190, hr: 62, cy: 62, fly: 100, rare: 1, diff: 'Bay lơ lửng', desc: 'Đĩa bay phát sáng, đầu bò nằm trong mái kính. Trượt qua trượt lại rất khó ngắm.' },
  superman: { id: 'superman', name: 'Bò Superman', score: 130, gold: 60, size: 1.1, speed: 210, hp: 260, hr: 54, cy: 72, fly: 64, rare: 1, diff: 'Bay vút', desc: 'Áo choàng đỏ bay phần phật, bay nhanh nhất đồng cỏ. Chịu đòn khá tốt.' },
  wonder: { id: 'wonder', name: 'Bò Wonder Woman', score: 140, gold: 65, size: 1.08, speed: 175, hp: 280, hr: 52, cy: 68, fly: 40, rare: 1, diff: 'Nhảy bật liên tục', desc: 'Vương miện vàng, sợi dây thần, bước nhảy rất xa. Hay đổi hướng bất ngờ.' },
  ironman: { id: 'ironman', name: 'Bò Ironman', score: 160, gold: 75, size: 1.1, speed: 160, hp: 340, hr: 54, cy: 70, fly: 80, rare: 1, diff: 'Giáp dày', desc: 'Giáp đỏ vàng, lò phản ứng sáng xanh trước ngực và hai chân phun lửa. Rất khó hạ.' }
});
['skirt', 'drag', 'bike', 'cyclo', 'tank', 'plane', 'ufo', 'superman', 'wonder', 'ironman'].forEach(k => { COWS[k].rider = 1; COWS[k].shootOnly = 1; });
const SHOOT_ORDER = ['normal', 'small', 'big', 'fast', 'mad', 'red', 'gold', 'rainbow', 'witch', 'ghost', 'skirt', 'drag', 'bike', 'cyclo', 'tank', 'plane', 'ufo', 'superman', 'wonder', 'ironman'];

/* ---------- Vũ khí ---------- */
const WEAPONS = [
  { id: 'pistol', name: 'Súng lục', price: 0, up: 120, kind: 'bullet', dmg: 14, rate: 3.2, speed: 1500, len: 44, tags: ['Chính xác', 'Không hết đạn'], desc: 'Nhẹ, chính xác, giữ chuột để bắn đều tay. Khởi đầu của mọi xạ thủ.' },
  { id: 'boomerang', name: 'Bumerang', price: 300, up: 150, kind: 'boomerang', dmg: 34, rate: 1, range: 540, len: 26, tags: ['Xuyên bò', 'Bay vòng'], desc: 'Bay ra theo vòng cung rồi quay về, trúng bò cả lúc đi lẫn lúc về. Chỉ ném được khi nó đã về tay.' },
  { id: 'ak', name: 'Súng AK', price: 700, up: 260, kind: 'bullet', dmg: 9, rate: 9, spread: .06, speed: 1700, len: 80, tags: ['Bắn liên thanh'], desc: 'Nã liên tục, đạn hơi lệch. Giữ chuột để xả cả băng.' },
  { id: 'grenade', name: 'Lựu đạn', price: 1100, up: 350, kind: 'grenade', dmg: 50, rate: 1, radius: 98, fuse: .6, len: 18, tags: ['Nổ lan', 'Ném tới chỗ trỏ'], desc: 'Ném tới chỗ trỏ chuột, nằm chờ nửa giây rồi nổ. Hợp với bò đứng tụm lại.' },
  { id: 'flame', name: 'Súng phun lửa', price: 1700, up: 500, kind: 'flame', dps: 75, burn: 12, range: 290, len: 62, tags: ['Tầm gần', 'Gây cháy'], desc: 'Phun lửa trước mặt, bò dính lửa sẽ tiếp tục cháy thêm vài giây dù đã chạy xa.' },
  { id: 'mortar', name: 'Súng cối', price: 2400, up: 700, kind: 'mortar', dmg: 90, rate: .55, radius: 138, len: 66, tags: ['Nổ rộng', 'Bắn vòng cung'], desc: 'Đạn bay vòng cung rồi rơi đúng chỗ trỏ chuột, sức nổ rất rộng. Phải ngắm trước đường bò chạy.' },
  { id: 'laser', name: 'Súng laser', price: 3200, up: 900, kind: 'laser', dps: 125, len: 72, tags: ['Xuyên thấu', 'Bắn liên tục'], desc: 'Tia sáng cắt qua mọi thứ trên đường thẳng. Giữ chuột rồi quét ngang cả hàng bò.' },
  { id: 'bazooka', name: 'Súng bazoka', price: 4200, up: 1100, kind: 'rocket', dmg: 150, rate: .75, radius: 128, speed: 740, len: 98, tags: ['Sát thương lớn', 'Nổ lan'], desc: 'Tên lửa nổ khi chạm bò hoặc tới điểm ngắm. Một phát đủ hạ một con bò bự.' },
  { id: 'm134', name: 'Súng M134', price: 5600, up: 1500, kind: 'minigun', dmg: 7, rate: 30, spread: .1, speed: 1800, len: 84, tags: ['Mưa đạn', 'Cần lên tốc'], desc: 'Sáu nòng quay. Mất một giây để lên tốc, sau đó xả đạn như mưa.' }
];
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
const WICONS = {
  pistol: '<path d="M6 16h30l4 3v6H27l-3 13h-9l3-13H6z" fill="#cfd8e8" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M10 19h22" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>',
  boomerang: '<path d="M7 40C5 20 20 7 43 9c-13 4-19 13-19 31z" fill="#F6B93B" stroke="#7A4A1B" stroke-width="3" stroke-linejoin="round"/><path d="M12 33c1-9 6-16 14-20" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".6"/>',
  ak: '<path d="M3 24l9-3h26l7-4v8l-7 3H21l-3 11h-7l3-11H3z" fill="#8a5a2b" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M16 21h24" stroke="#2c3550" stroke-width="5" stroke-linecap="round"/>',
  grenade: '<ellipse cx="24" cy="29" rx="13" ry="15" fill="#5E8C4A" stroke="#0f1c42" stroke-width="3"/><rect x="19" y="7" width="10" height="8" rx="2" fill="#cfd8e8" stroke="#0f1c42" stroke-width="3"/><path d="M29 10h9a4 4 0 0 1 0 8" fill="none" stroke="#F6B93B" stroke-width="3"/><path d="M17 26c2-3 5-4 8-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".5"/>',
  flame: '<rect x="4" y="18" width="14" height="24" rx="6" fill="#C0392B" stroke="#0f1c42" stroke-width="3"/><path d="M18 24h14v8H18z" fill="#cfd8e8" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M33 28c2-8 8-12 11-12-1 5 2 6 1 10-1 5-7 8-12 2z" fill="#FF9A2E" stroke="#B8420F" stroke-width="2.5" stroke-linejoin="round"/>',
  mortar: '<path d="M17 6l10-3 9 25-11 4z" fill="#59647f" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M9 42h30l-5-9H14z" fill="#8a96b3" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><circle cx="23" cy="11" r="3" fill="#0f1c42"/>',
  laser: '<path d="M4 20h24l7-5h8v14h-8l-7-5H4z" fill="#eaf6ff" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M8 24h24" stroke="#38d9f5" stroke-width="4" stroke-linecap="round"/><circle cx="43" cy="22" r="3" fill="#38d9f5"/>',
  bazooka: '<rect x="3" y="15" width="38" height="13" rx="5" fill="#6b7f45" stroke="#0f1c42" stroke-width="3"/><path d="M30 28l-4 12h-6l3-12z" fill="#4a5a30" stroke="#0f1c42" stroke-width="3" stroke-linejoin="round"/><path d="M41 15l6 6-6 7z" fill="#E5483A" stroke="#0f1c42" stroke-width="2.5" stroke-linejoin="round"/>',
  m134: '<rect x="3" y="13" width="30" height="4" rx="2" fill="#cfd8e8" stroke="#0f1c42" stroke-width="2"/><rect x="3" y="19" width="30" height="4" rx="2" fill="#cfd8e8" stroke="#0f1c42" stroke-width="2"/><rect x="3" y="25" width="30" height="4" rx="2" fill="#cfd8e8" stroke="#0f1c42" stroke-width="2"/><rect x="31" y="10" width="14" height="22" rx="4" fill="#59647f" stroke="#0f1c42" stroke-width="3"/><path d="M36 32l-2 10h6l2-10z" fill="#8a5a2b" stroke="#0f1c42" stroke-width="2.5" stroke-linejoin="round"/>'
};
const wicon = id => `<svg viewBox="0 0 48 48" class="ico" aria-hidden="true">${WICONS[id] || ''}</svg>`;

/* Kho súng: mở khoá một lần, nâng tối đa 5 cấp (mỗi cấp +20% sát thương) */
const Arsenal = {
  MAX: 5,
  lvl(id) { return Save.data.shoot.weapons[id] || 0; },
  owned(id) { return this.lvl(id) > 0; },
  mult(id) { return 1 + .2 * (Math.max(1, this.lvl(id)) - 1); },
  upPrice(w) { return w.up * this.lvl(w.id); },
  buy(id) {
    const w = WEAPON[id], d = Save.data.shoot;
    if (!w) return 'UNKNOWN';
    if (this.owned(id)) return 'OWNED';
    if (d.gold < w.price) return 'NOT_ENOUGH_GOLD';
    d.gold -= w.price; d.weapons[id] = 1; d.equipped = id;
    if (WEAPONS.every(x => this.owned(x.id))) SAch.unlock('arsenal');
    Save.commit(); return 'OK';
  },
  up(id) {
    const w = WEAPON[id], d = Save.data.shoot, l = this.lvl(id);
    if (!w || !l) return 'UNKNOWN';
    if (l >= this.MAX) return 'MAX';
    const p = this.upPrice(w);
    if (d.gold < p) return 'NOT_ENOUGH_GOLD';
    d.gold -= p; d.weapons[id] = l + 1; Save.commit(); return 'OK';
  },
  equip(id) { if (!this.owned(id)) return false; Save.data.shoot.equipped = id; Save.commit(); return true; }
};

/* ---------- Màn chơi ---------- */
const SLEVELS = [
  { name: 'Bãi tập bắn', target: 150, time: 80, maxCows: 4, speed: 1, hpMul: 1, weights: { normal: 70, small: 30, skirt: 12 }, hint: 'Di chuột để ngắm, giữ chuột hoặc Space để bắn. Súng lục là đủ cho màn này.' },
  { name: 'Đạp xe ra phố', target: 320, time: 90, maxCows: 5, speed: 1.05, hpMul: 1, weights: { normal: 25, bike: 40, small: 20, skirt: 25, fast: 14 }, hint: 'Bò đạp xe chạy nhanh. Ngắm đón đầu một chút.' },
  { name: 'Phố xích lô', target: 520, time: 100, maxCows: 5, speed: 1.05, hpMul: 1.1, weights: { cyclo: 35, bike: 25, big: 20, skirt: 20, drag: 15 }, hint: 'Xích lô nhiều máu. Mở khoá lựu đạn hoặc AK ở Kho súng sẽ nhẹ hơn.' },
  { name: 'Đêm giả gái', target: 780, time: 110, maxCows: 6, speed: 1.1, hpMul: 1.15, weights: { drag: 40, skirt: 30, mad: 20, fast: 15, big: 15 }, hint: 'Bò mad xuất hiện kèm bò giả gái. Đừng để chúng chạy tụm lại.' },
  { name: 'Thiết giáp bò', target: 1100, time: 120, maxCows: 6, speed: 1.1, hpMul: 1.2, weights: { tank: 18, cyclo: 25, big: 25, mad: 25, bike: 20 }, hint: 'Xe tăng rất trâu. Súng cối và bazoka sinh ra để dành cho chúng.' },
  { name: 'Mặt trận trên không', target: 1500, time: 120, maxCows: 7, speed: 1.15, hpMul: 1.25, weights: { plane: 35, ufo: 14, fast: 20, witch: 15, ghost: 15, bike: 15 }, hint: 'Bò bay lượn quanh. Súng laser quét ngang rất hợp.' },
  { name: 'Biệt đội siêu bò', target: 2000, time: 130, maxCows: 7, speed: 1.15, hpMul: 1.3, weights: { superman: 15, wonder: 15, ironman: 15, tank: 10, ufo: 10, plane: 15, mad: 15 }, hint: 'Ba siêu anh hùng bay lượn. Chịu đòn rất tốt, hãy nâng cấp súng.' },
  { name: 'Ngày tận thế bò', target: 2700, time: 150, maxCows: 8, speed: 1.2, hpMul: 1.4, weights: { normal: 12, small: 10, big: 14, fast: 12, mad: 14, red: 8, gold: 6, skirt: 10, drag: 10, bike: 14, cyclo: 12, tank: 8, plane: 10, ufo: 6, superman: 6, wonder: 6, ironman: 6 }, hint: 'Đủ mọi loại bò cùng ra đồng. Dùng thứ mạnh nhất bạn có.' }
];
function slevelConfig(n) {
  if (n <= SLEVELS.length) return Object.assign({ id: n }, SLEVELS[n - 1]);
  const k = n - SLEVELS.length, w = SLEVELS[SLEVELS.length - 1].weights;
  return { id: n, name: 'Bắn vô tận ' + k, target: 2700 + k * 500, time: 150, maxCows: 8, speed: Math.min(1.7, 1.2 + .04 * k), hpMul: Math.min(3, 1.4 + .1 * k), weights: w, hint: 'Bò ngày càng trâu sau mỗi màn.', endless: true };
}

/* ---------- Thành tích riêng của Bắn Bò ---------- */
const SACHV = [
  { id: 'first', name: 'Phát súng đầu tiên', desc: 'Hạ con bò đầu tiên.' },
  { id: 'multi', name: 'Nổ chùm', desc: 'Hạ 3 con bò chỉ bằng một vụ nổ.' },
  { id: 'combo', name: 'Xạ thủ liên hoàn', desc: 'Hạ 8 con bò liên tiếp, mỗi con cách nhau chưa tới 2,6 giây.' },
  { id: 'tank', name: 'Thợ săn xe tăng', desc: 'Hạ một con bò lái xe tăng.' },
  { id: 'ufo', name: 'Đĩa bay rơi', desc: 'Hạ một con bò lái UFO.' },
  { id: 'heroes', name: 'Biệt đội bị hạ', desc: 'Hạ đủ ba siêu bò: Superman, Wonder Woman và Ironman.' },
  { id: 'arsenal', name: 'Kho vũ khí đầy đủ', desc: 'Sở hữu cả chín loại vũ khí.' }
];
const SAch = {
  cb: null,
  unlock(id) {
    const a = Save.data.shoot.achievements;
    if (a[id]) return false;
    a[id] = true; Save.commit();
    if (this.cb) this.cb(SACHV.find(x => x.id === id));
    return true;
  }
};
