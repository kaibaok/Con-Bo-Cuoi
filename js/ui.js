'use strict';
/* Giao diện: menu, chọn màn, cửa hàng, bộ sưu tập, thành tích, cài đặt, HUD, kết quả. */

const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('vi-VN');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  strong_rope: '<path d="M10 34c6 8 22 8 28 0M10 28c6 8 22 8 28 0M10 22c6 8 22 8 28 0" fill="none" stroke="#E6A23C" stroke-width="6" stroke-linecap="round"/><path d="M10 22c0-8 6-12 14-12s14 4 14 12" fill="none" stroke="#7A4A1B" stroke-width="3" stroke-linecap="round"/>',
  long_rope: '<path d="M6 36C14 10 30 10 42 36" fill="none" stroke="#E6A23C" stroke-width="6" stroke-linecap="round"/><path d="M36 14l8-2-2 8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  fast_rope: '<path d="M6 30h22M4 22h18M10 38h16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/><ellipse cx="34" cy="26" rx="8" ry="12" fill="none" stroke="#E6A23C" stroke-width="6"/>',
  pull_gloves: '<path d="M14 40V22l4-2v-8a3 3 0 0 1 6 0v6h2v-8a3 3 0 0 1 6 0v8h2v-4a3 3 0 0 1 6 0v16c0 6-4 10-10 10h-6c-6 0-10-4-10-6z" fill="#F6B93B" stroke="#7A4A1B" stroke-width="3" stroke-linejoin="round"/>',
  grip_gloves: '<path d="M14 40V22l4-2v-8a3 3 0 0 1 6 0v6h2v-8a3 3 0 0 1 6 0v8h2v-4a3 3 0 0 1 6 0v16c0 6-4 10-10 10h-6c-6 0-10-4-10-6z" fill="#6DE0B0" stroke="#0f3d36" stroke-width="3" stroke-linejoin="round"/><path d="M20 38h14M20 33h14" stroke="#0f3d36" stroke-width="2.5" stroke-linecap="round"/>',
  precise_hook: '<circle cx="24" cy="24" r="14" fill="none" stroke="#E6A23C" stroke-width="5"/><circle cx="24" cy="24" r="4" fill="#fff"/><path d="M24 4v8M24 36v8M4 24h8M36 24h8" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>',
  saddle: '<path d="M6 28c4-10 12-12 18-12s14 2 18 12c-4 2-8 0-10-2-4 4-12 4-16 0-2 2-6 4-10 2z" fill="#C0643A" stroke="#5a2a14" stroke-width="3" stroke-linejoin="round"/><path d="M12 36v6M36 36v6" stroke="#5a2a14" stroke-width="4" stroke-linecap="round"/>',
  lucky: '<g fill="#6DE0B0" stroke="#0f3d36" stroke-width="2.5"><circle cx="17" cy="17" r="8"/><circle cx="31" cy="17" r="8"/><circle cx="17" cy="31" r="8"/><circle cx="31" cy="31" r="8"/></g><path d="M24 24l8 18" stroke="#0f3d36" stroke-width="3.5" stroke-linecap="round"/>',
  rainbow_rope: '<g fill="none" stroke-width="4.5" stroke-linecap="round"><path d="M6 38a18 18 0 0 1 36 0" stroke="#E5483A"/><path d="M11 38a13 13 0 0 1 26 0" stroke="#F6B93B"/><path d="M16 38a8 8 0 0 1 16 0" stroke="#3FA5E0"/></g>',
  energy_potion: '<path d="M19 6h10v4l-2 2v8l9 16a5 5 0 0 1-4.4 7.4H16.400A5 5 0 0 1 12 36l9-16v-8l-2-2z" fill="#6DE0B0" stroke="#0f3d36" stroke-width="3" stroke-linejoin="round"/><path d="M17 30h14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
};
const icon = id => `<svg viewBox="0 0 48 48" class="ico" aria-hidden="true">${ICONS[id] || ''}</svg>`;

const UI = {
  cur: null, anim: null, dispScore: 0, dispGold: 0, flash: null, bannerT: 0, hintT: 0, resultT: 0, assistTimer: 0,
  el: {}, last: {},

  init() {
    const q = id => document.getElementById(id);
    ['hud', 'ui', 'toasts', 'hScore', 'hTarget', 'hScoreBar', 'hTime', 'hClock', 'hGold', 'hGoldChip', 'hStreak', 'hBanner', 'hPull', 'pName', 'pReward', 'pPower', 'pEsc', 'pWarn', 'btnThrow', 'btnPull', 'btnPotion', 'potCount', 'stage']
      .forEach(id => this.el[id] = q(id));
    const hint = document.createElement('div'); hint.className = 'hint'; hint.id = 'hHint'; this.el.hud.appendChild(hint); this.el.hint = hint;
    this.fit(); game.resize();
    addEventListener('resize', () => { this.fit(); game.resize(); });
    if (window.ResizeObserver) new ResizeObserver(() => { const r = game.cv.getBoundingClientRect(); if (Math.abs(r.width * Math.min(devicePixelRatio || 1, 2) - game.cv.width) > 2) game.resize(); }).observe(this.el.stage);
    this.bind();
    Ach.cb = a => this.toast(`<b>Thành tích mới</b><span>${esc(a.name)}</span>`, 'achv');
    this.applySettings();
    this.dispGold = Save.data.gold;
  },

  fit() {
    const vw = innerWidth, vh = innerHeight;
    const w = Math.min(vw, vh * 16 / 9), h = w * 9 / 16, st = this.el.stage;
    st.style.width = w + 'px'; st.style.height = h + 'px';
    st.style.setProperty('--p', (w / 1280) + 'px');
  },

  applySettings() { const s = Save.data.settings; Sound.setMusic(s.music); Sound.setSfx(s.sfx); },

  /* ---------- điều khiển ---------- */
  bind() {
    const st = this.el.stage, cv = game.cv;
    const toLogical = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 1280, y: (e.clientY - r.top) / r.height * 720 }; };
    cv.addEventListener('pointermove', e => { if (game.mode === 'play') { const p = toLogical(e); game.setAimPoint(p.x, p.y); } });
    cv.addEventListener('pointerdown', e => {
      Sound.init();
      if (game.mode !== 'play' || game.paused) return;
      const p = toLogical(e); game.setAimPoint(p.x, p.y);
      if (game.pull) game.press(); else { game.aimAng = game.aimTarget; game.throwRope(); }
    });
    this.el.btnThrow.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); game.throwRope(); });
    const pullDown = e => { e.preventDefault(); game.assistHeld = true; game.press(); };
    this.el.btnPull.addEventListener('pointerdown', pullDown);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => this.el.btnPull.addEventListener(ev, () => game.assistHeld = false));
    this.el.btnPotion.addEventListener('pointerdown', e => { e.preventDefault(); game.usePotion(); });

    st.addEventListener('change', e => {
      const id = e.target.dataset && e.target.dataset.skin;
      if (id) { this.loadSkin(id, e.target.files && e.target.files[0], e.target.dataset.kind || 'src'); e.target.value = ''; }
    });
    st.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      Sound.init(); this.act(b.dataset.act, b.dataset);
    });

    addEventListener('keydown', e => {
      Sound.init();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); this.back(); return; }
      if (game.mode !== 'play' || game.paused) return;
      if (k === ' ' || k === 'Spacebar') {
        e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (e.repeat) return;
        game.assistHeld = true;
        if (game.pull) game.press(); else game.throwRope();
      } else if (k === 'e' || k === 'E') {
        if (e.repeat) return; game.assistHeld = true; game.press();
      } else if (k === 'q' || k === 'Q') game.usePotion();
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') game.keyAim = -1;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') game.keyAim = 1;
    });
    addEventListener('keyup', e => {
      const k = e.key;
      if (k === ' ' || k === 'e' || k === 'E') game.assistHeld = false;
      if (['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(k)) game.keyAim = 0;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'play' && !game.paused) this.pause(); });

    game.cb.onFrame = dt => this.frame(dt);
    game.cb.onStart = L => this.onStart(L);
    game.cb.onGo = () => { this.say('Bắt đầu!', 'go', 900); if (game.level.id === 1) this.hintText('Di chuột để ngắm vào cổ bò, bấm chuột hoặc Space để quăng dây. Quăng đón đầu vì bò chạy liên tục.', 7000); };
    game.cb.onHook = () => this.hintText('', 0);
    game.cb.onCatch = (cow) => { if (cow.def.rare) this.say(cow.def.name + '!', 'rare', 1500); };
    game.cb.onRare = def => this.say(def.name + ' xuất hiện!', 'rare', 1700);
    game.cb.onTimeUp = pulling => this.say(pulling ? 'Hết giờ! Kéo nốt lượt cuối' : 'Hết giờ!', 'warn', 1600);
    game.cb.onEscape = () => {};
    game.cb.onCoin = () => { this.el.hGoldChip.classList.remove('bump'); void this.el.hGoldChip.offsetWidth; this.el.hGoldChip.classList.add('bump'); };
    game.cb.onEnd = res => {
      this.el.hPull.classList.remove('on');
      clearTimeout(this.resultT);
      this.resultT = setTimeout(() => { if (game.mode === 'end') { this.el.hud.classList.add('off'); this.show('result', res); } }, res.win ? 1300 : 900);
    };
  },

  loadSkin(id, file, kind) {
    if (!file || !file.type.startsWith('image/')) { this.toast('<b>Không đọc được tệp</b><span>Hãy chọn ảnh PNG, JPG hoặc WEBP.</span>', 'warn'); return; }
    const fr = new FileReader();
    fr.onerror = () => this.toast('<b>Không đọc được tệp</b>', 'warn');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => this.toast('<b>Ảnh bị lỗi</b><span>Thử một ảnh khác nhé.</span>', 'warn');
      im.onload = () => {
        const k = Math.min(1, 320 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const label = esc(COWS[id].name) + (kind === 'hooked' ? ', khi bị bắt dây' : '');
        const png = c.toDataURL('image/png');
        fetch('/api/skin?type=' + id + '&kind=' + kind, { method: 'POST', body: png })
          .then(r => { if (!r.ok) throw new Error('save'); Skins.setFile(id, kind); this.toast('<b>Đã lưu vào thư mục game</b><span>assets/cows, ' + label + '</span>'); })
          .catch(() => {
            const ok = Skins.set(id, kind, c.toDataURL('image/webp', .9));
            if (ok) this.toast('<b>Đã đổi hình</b><span>' + label + '. Mở game bằng start-game.bat để lưu thẳng vào thư mục.</span>');
            else { Skins.clear(id); this.toast('<b>Bộ nhớ trình duyệt đầy</b><span>Mở game bằng start-game.bat để lưu vào thư mục, hoặc dùng ảnh nhỏ hơn.</span>', 'warn'); }
          })
          .finally(() => setTimeout(() => this.refresh(), 250));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  },

  back() {
    if (game.mode === 'play' && !game.paused) return this.pause();
    if (game.paused && this.cur === 'pause') return this.resume();
    if (['levels', 'shop', 'coll', 'achv', 'settings'].includes(this.cur)) this.show('menu');
  },

  act(a, d) {
    Sound.play('ui');
    switch (a) {
      case 'menu': this.toMenu(); break;
      case 'levels': this.show('levels'); break;
      case 'shop': this.show('shop'); break;
      case 'coll': this.show('coll'); break;
      case 'achv': this.show('achv'); break;
      case 'settings': this.show('settings'); break;
      case 'play': this.startLevel(+d.level); break;
      case 'pause': this.pause(); break;
      case 'resume': this.resume(); break;
      case 'restart': this.startLevel(game.level.id); break;
      case 'next': this.startLevel(game.level.id + 1); break;
      case 'buy': this.buy(d.id); break;
      case 'toggle': {
        const s = Save.data.settings; s[d.key] = !s[d.key]; Save.commit(); this.applySettings(); this.refresh(); break;
      }
      case 'skinflip': Skins.toggle(d.id, 'flip'); this.refresh(); break;
      case 'skinoval': Skins.toggle(d.id, 'oval'); this.refresh(); break;
      case 'skinclear': Skins.clear(d.id); this.toast('<b>Đã dùng lại hình gốc</b><span>' + esc(COWS[d.id].name) + '</span>'); this.refresh(); break;
      case 'diff': Save.data.settings.difficulty = +d.val; Save.commit(); this.refresh(); break;
      case 'reset':
        if (!this.confirmReset) { this.confirmReset = true; this.refresh(); setTimeout(() => { this.confirmReset = false; if (this.cur === 'settings') this.refresh(); }, 4000); }
        else { this.confirmReset = false; Save.reset(); this.dispGold = 0; this.applySettings(); this.toast('<b>Đã xoá dữ liệu</b><span>Bắt đầu lại từ đầu.</span>'); this.refresh(); }
        break;
    }
  },

  /* ---------- luồng màn chơi ---------- */
  startLevel(n) {
    clearTimeout(this.resultT);
    this.hideScreen();
    this.el.hud.classList.remove('off');
    this.el.hud.classList.remove('hasPull');
    this.dispScore = 0; this.dispGold = Save.data.gold;
    this.el.hint.classList.remove('show');
    Sound.init();
    game.start(n);
  },
  onStart(L) {
    this.el.hTarget.textContent = fmt(L.target);
    this.el.hTime.textContent = L.time;
    this.intro(L);
  },
  pause() {
    if (game.mode !== 'play' && game.mode !== 'intro') return;
    game.setPaused(true); game.assistHeld = false;
    this.show('pause');
  },
  resume() { this.hideScreen(); game.setPaused(false); },
  toMenu() {
    clearTimeout(this.resultT);
    this.el.hud.classList.add('off');
    game.setPaused(false); game.assistHeld = false;
    if (game.mode !== 'demo') game.startDemo();
    Sound.duck(false);
    this.show('menu');
  },
  buy(id) {
    const res = Shop.buy(id), it = ITEM[id];
    if (res === 'OK') {
      Sound.play('buy'); this.flash = [id, 'ok'];
      const l = Shop.level(it);
      this.toast(`<b>Mua thành công</b><span>${esc(it.name)}${it.consumable ? ', còn ' + l : ', cấp ' + l}</span>`);
    } else if (res === 'NOT_ENOUGH_GOLD') {
      Sound.play('deny'); this.flash = [id, 'deny'];
      this.toast('<b>Không đủ vàng</b><span>Bắt thêm bò để có vàng nhé.</span>', 'warn');
    } else if (res === 'MAX') {
      Sound.play('deny'); this.toast('<b>Đã đạt cấp tối đa</b>', 'warn');
    }
    this.refresh();
  },

  /* ---------- HUD ---------- */
  frame(dt) {
    const E = this.el, g = game, d = Save.data;
    if (g.mode === 'play' || g.mode === 'intro' || g.mode === 'end') {
      this.dispScore += (g.score - this.dispScore) * Math.min(1, dt * 9);
      if (Math.abs(g.score - this.dispScore) < .5) this.dispScore = g.score;
      this.set('hScore', fmt(this.dispScore));
      E.hScoreBar.style.transform = `scaleX(${clamp(this.dispScore / g.level.target, 0, 1)})`;
      const tl = Math.ceil(g.timeLeft);
      this.set('hTime', tl);
      E.hClock.classList.toggle('urgent', tl <= 10 && g.mode === 'play');
    }
    this.dispGold += (d.gold - this.dispGold) * Math.min(1, dt * 7);
    if (Math.abs(d.gold - this.dispGold) < .5) this.dispGold = d.gold;
    this.set('hGold', fmt(this.dispGold));
    const mg = document.getElementById('mGold'); if (mg) mg.textContent = fmt(d.gold);

    const p = g.pull, inPlay = g.mode === 'play';
    E.hPull.classList.toggle('on', !!p && inPlay);
    E.btnPull.classList.toggle('on', !!p && inPlay);
    E.btnThrow.classList.toggle('off', !!p || !inPlay || g.timeLeft <= 0);
    E.btnThrow.classList.toggle('cool', g.rope.state !== 'idle' || g.rope.cool > 0);
    const pots = d.consumables.energy_potion || 0;
    this.set('potCount', pots);
    E.btnPotion.classList.toggle('on', !!p && inPlay && pots > 0);
    E.btnPotion.classList.toggle('surge', !!p && p.surge > 0);
    if (p && inPlay) {
      this.set('pName', p.cow.def.name);
      const m = 1 + g.streakBonus();
      this.set('pReward', `+${Math.round(p.cow.def.score * m)} điểm, +${Math.round(p.cow.def.gold * m)} vàng`);
      E.pPower.style.transform = `scaleX(${p.prog / 100})`;
      E.pEsc.style.transform = `scaleX(${clamp(p.esc / p.escMax, 0, 1)})`;
      E.hPull.dataset.st = p.st; E.hPull.classList.toggle('surge', p.surge > 0);
      E.pPower.classList.toggle('rhythm', p.rhy >= 3);
    }
    const sb = g.streakBonus(), sk = inPlay ? g.streak : 0;
    const txt = sk >= 2 ? `Chuỗi ${sk}${sb ? ` (+${Math.round(sb * 100)}% thưởng)` : ''}` : '';
    if (this.last.streak !== txt) {
      this.last.streak = txt; E.hStreak.textContent = txt; E.hStreak.classList.toggle('show', !!txt);
      if (txt) { E.hStreak.classList.remove('pop'); void E.hStreak.offsetWidth; E.hStreak.classList.add('pop'); }
    }
  },
  set(id, v) { if (this.last[id] !== v) { this.last[id] = v; this.el[id].textContent = v; } },

  say(text, kind = '', ms = 1200, sub = '') {
    const b = this.el.hBanner;
    b.className = 'banner'; void b.offsetWidth;
    b.innerHTML = `<b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    b.className = 'banner show ' + kind;
    clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.classList.remove('show'), ms);
  },
  intro(L) {
    const b = this.el.hBanner;
    b.className = 'banner'; void b.offsetWidth;
    b.innerHTML = `<small>${L.endless ? 'Thử thách' : 'Màn ' + L.id}</small><b>${esc(L.name)}</b><span>Đạt ${fmt(L.target)} điểm trong ${L.time} giây</span>`;
    b.className = 'banner show intro';
    clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.classList.remove('show'), 1700);
  },
  hintText(t, ms) {
    const h = this.el.hint; clearTimeout(this.hintT);
    if (!t) { h.classList.remove('show'); return; }
    h.textContent = t; h.classList.add('show');
    this.hintT = setTimeout(() => h.classList.remove('show'), ms);
  },
  toast(html, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html;
    this.el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  },

  /* ---------- màn hình ---------- */
  hideScreen() { this.cur = null; this.stopAnim(); this.el.ui.innerHTML = ''; this.el.ui.className = 'ui'; },
  show(name, arg) {
    this.stopAnim();
    this.cur = name; this.arg = arg;
    const ui = this.el.ui;
    ui.className = 'ui s-' + name + ' in';
    ui.innerHTML = SCREENS[name](arg, this);
    if (name === 'coll') this.animCollection();
    if (name === 'result') this.animResult(arg);
    const f = ui.querySelector('[data-focus]') || ui.querySelector('button'); if (f) f.focus({ preventScroll: true });
  },
  refresh() {
    if (!this.cur) return;
    const list = this.el.ui.querySelector('.scroll'), top = list ? list.scrollTop : 0;
    const act = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset : null;
    this.el.ui.classList.remove('in');
    this.el.ui.innerHTML = SCREENS[this.cur](this.arg, this);
    const l2 = this.el.ui.querySelector('.scroll'); if (l2) l2.scrollTop = top;
    if (this.cur === 'coll') this.animCollection();
    if (act && act.act) {
      const sel = '[data-act="' + act.act + '"]' + (act.id ? '[data-id="' + act.id + '"]' : '') + (act.key ? '[data-key="' + act.key + '"]' : '') + (act.val ? '[data-val="' + act.val + '"]' : '');
      const n = this.el.ui.querySelector(sel); if (n) n.focus({ preventScroll: true });
    }
    this.flash = null;
  },
  stopAnim() { cancelAnimationFrame(this.anim); this.anim = 0; clearInterval(this.cnt); },
  animCollection() {
    const cvs = [...this.el.ui.querySelectorAll('canvas[data-type]')];
    const loop = ts => {
      const t = ts / 1000;
      cvs.forEach(cv => {
        const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
        c.setTransform(cv.width / 260, 0, 0, cv.width / 260, 0, 0);
        const type = cv.dataset.type, def = COWS[type];
        drawCow(c, { type, x: 130, y: 150, s: Math.min(1.35, .75 + def.size * .45) * .98, face: 1, walk: t * 4, t, ph: 0.3, moving: true, lift: def.fly ? 26 + Math.sin(t * 2.6) * 5 : 0, act: ['hop', 'wave', 'look', 'stretch', 'dance'][Math.floor(t / 2.5) % 5], actT: (t % 2.5) / 2.5 });
      });
      this.anim = requestAnimationFrame(loop);
    };
    this.anim = requestAnimationFrame(loop);
  },
  animResult(res) {
    const sEl = document.getElementById('rScore'), gEl = document.getElementById('rGold');
    const total = res.gold + res.bonus + res.timeBonus, t0 = performance.now();
    this.cnt = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
      if (sEl) sEl.textContent = fmt(res.score * e);
      if (gEl) gEl.textContent = '+' + fmt(total * e);
      if (k >= 1) clearInterval(this.cnt);
    }, 30);
    if (res.win) for (let i = 0; i < 5; i++) setTimeout(() => game.puff(rnd(300, 980), rnd(120, 300), 14, 'confetti', 320, 1.6, 6), i * 220);
  }
};

const SCREENS = {
  menu() {
    const d = Save.data;
    return `
    <div class="chip gold abs-tr"><i class="coin"></i><b id="mGold">${fmt(d.gold)}</b></div>
    <div class="menu-col">
      <div class="logo">
        <svg class="ring" viewBox="0 0 640 300" aria-hidden="true">
          <g class="ring-g" transform="rotate(-4 320 150)">
            <ellipse cx="320" cy="150" rx="296" ry="118" fill="none" stroke="#6a3f14" stroke-width="15"/>
            <ellipse cx="320" cy="150" rx="296" ry="118" fill="none" stroke="#E6A23C" stroke-width="10"/>
            <ellipse cx="320" cy="150" rx="296" ry="118" fill="none" stroke="#FFE7AE" stroke-width="3" stroke-dasharray="3 12"/>
          </g>
          <g stroke-linecap="round" fill="none"><path d="M560 224c14 12 10 34 26 40" stroke="#6a3f14" stroke-width="11"/><path d="M560 224c14 12 10 34 26 40" stroke="#E6A23C" stroke-width="7"/></g>
          <circle cx="556" cy="222" r="15" fill="#E6A23C" stroke="#6a3f14" stroke-width="5"/>
        </svg>
        <h1><span class="w1">BẮT</span><span class="w2">BÒ</span></h1>
      </div>
      <nav class="panel menu-panel" aria-label="Menu chính">
        <button class="btn big" data-act="levels" data-focus>Chơi</button>
        <div class="row2">
          <button class="btn leaf" data-act="shop">Cửa hàng</button>
          <button class="btn leaf" data-act="coll">Bộ sưu tập bò</button>
          <button class="btn leaf" data-act="achv">Thành tích</button>
          <button class="btn leaf" data-act="settings">Cài đặt</button>
        </div>
      </nav>
    </div>`;
  },

  levels() {
    const d = Save.data, un = d.unlockedLevel;
    const cards = LEVELS.map((L, i) => {
      const n = i + 1, locked = n > un, best = d.bestByLevel[n];
      return `<button class="lvl ${locked ? 'locked' : ''} ${n === un ? 'current' : ''}" ${locked ? 'disabled' : `data-act="play" data-level="${n}"`} ${n === Math.min(un, 6) ? 'data-focus' : ''}>
        <span class="n">${n}</span>
        <span class="t"><b>${esc(L.name)}</b><em>Đạt ${fmt(L.target)} điểm trong ${L.time} giây</em></span>
        <span class="b">${locked ? 'Chưa mở khoá' : best ? 'Cao nhất ' + fmt(best) : n === un ? 'Chơi tiếp' : 'Chưa chơi'}</span>
      </button>`;
    }).join('');
    const eLevel = Math.max(7, un), eLocked = un < 7, eBest = d.bestByLevel[eLevel];
    const endless = `<button class="lvl wide ${eLocked ? 'locked' : 'current'}" ${eLocked ? 'disabled' : `data-act="play" data-level="${eLevel}"`}>
      <span class="n inf">∞</span>
      <span class="t"><b>Thử thách vô tận</b><em>${eLocked ? 'Qua màn 6 để mở' : `Đang ở màn ${eLevel}. Độ khó tăng dần`}</em></span>
      <span class="b">${eBest ? 'Cao nhất ' + fmt(eBest) : ''}</span></button>`;
    return `<div class="panel wide-panel">
      ${head('Chọn màn chơi')}
      <div class="lvl-grid">${cards}${endless}</div></div>`;
  },

  shop() {
    const d = Save.data, f = UI.flash;
    const cards = ITEMS.map(it => {
      const l = Shop.level(it), max = l >= it.max, price = Shop.price(it, l);
      const cur = it.consumable ? '' : it.fmt(it.eff(l)), nxt = it.consumable ? '' : it.fmt(it.eff(l + 1));
      const afford = d.gold >= price;
      const pips = it.consumable ? `<span class="owned">Đang có ${l}/${it.cap}</span>` : `<span class="pips" aria-label="Cấp ${l} trên ${it.max}">${Array.from({ length: it.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span>`;
      const eff = it.consumable ? `<span class="eff"><em>Hiệu quả</em> Kéo mạnh gấp đôi trong 5 giây</span>`
        : max ? `<span class="eff"><em>Hiện tại</em> ${cur}</span>` : `<span class="eff"><em>${l ? 'Hiện tại ' + cur : 'Chưa có'}</em><br>Sau nâng cấp: <b>${nxt}</b></span>`;
      const label = max ? 'Đã tối đa' : it.consumable ? 'Mua' : l ? 'Nâng cấp' : 'Mua';
      return `<article class="item ${f && f[0] === it.id ? f[1] : ''}">
        <div class="ico-wrap">${icon(it.id)}</div>
        <div class="info"><h3>${esc(it.name)}</h3><p>${esc(it.desc)}</p>${eff}${pips}</div>
        <button class="btn buy ${afford || max ? '' : 'poor'}" data-act="buy" data-id="${it.id}" ${max ? 'disabled' : ''}>
          <span>${label}</span>${max ? '' : `<span class="price"><i class="coin"></i>${fmt(price)}</span>`}</button>
      </article>`;
    }).join('');
    return `<div class="panel wide-panel shop">
      ${head('Cửa hàng', `<div class="chip gold"><i class="coin"></i><b>${fmt(d.gold)}</b><span class="sr">vàng</span></div>`)}
      <div class="scroll item-grid">${cards}</div></div>`;
  },

  coll() {
    const d = Save.data;
    const cards = COW_ORDER.map(id => {
      const c = COWS[id], n = d.stats.caught[id] || 0, seen = n > 0;
      return `<article class="cow-card ${seen ? '' : 'unseen'}">
        <canvas width="390" height="225" data-type="${id}" role="img" aria-label="${seen ? esc(c.name) : 'Bò chưa gặp'}"></canvas>
        <h3>${seen ? esc(c.name) : 'Chưa bắt được'}</h3>
        <p>${seen ? esc(c.desc) : 'Bắt một con để mở thẻ này.'}</p>
        <div class="tags">${seen ? `<span>${c.score} điểm</span><span>${c.gold} vàng</span><span>${esc(c.diff)}</span><span>Đã bắt ${n}</span>` : ''}</div>
      </article>`;
    }).join('');
    return `<div class="panel wide-panel">${head('Bộ sưu tập bò', `<span class="count">${COW_ORDER.filter(i => d.stats.caught[i]).length} / ${COW_ORDER.length} loại</span>`)}
      <div class="scroll cow-grid">${cards}</div></div>`;
  },

  achv() {
    const d = Save.data, got = ACHV.filter(a => d.achievements[a.id]).length;
    const rows = ACHV.map(a => {
      const ok = !!d.achievements[a.id];
      return `<li class="${ok ? 'ok' : ''}"><span class="tick">${ok ? '✓' : ''}</span><div><b>${esc(a.name)}</b><p>${esc(a.desc)}</p></div></li>`;
    }).join('');
    return `<div class="panel mid-panel">${head('Thành tích', `<span class="count">${got} / ${ACHV.length}</span>`)}<ul class="achv scroll">${rows}</ul>
      <div class="stats"><span>Đã quăng <b>${fmt(d.stats.thrown)}</b> lần</span><span>Trượt <b>${fmt(d.stats.missed)}</b></span><span>Bò thoát <b>${fmt(d.stats.escaped)}</b></span><span>Điểm cao nhất <b>${fmt(d.bestScore)}</b></span></div></div>`;
  },

  settings(_, ui) {
    const s = Save.data.settings;
    const sw = (key, label, hint) => `<div class="set-row"><div><b>${label}</b><p>${hint}</p></div>
      <button class="switch ${s[key] ? 'on' : ''}" role="switch" aria-checked="${s[key]}" aria-label="${label}" data-act="toggle" data-key="${key}"><i></i></button></div>`;
    const dif = ['Thư thả', 'Chuẩn', 'Thử thách'].map((n, i) => `<button class="seg ${s.difficulty === i ? 'on' : ''}" data-act="diff" data-val="${i}" aria-pressed="${s.difficulty === i}">${n}</button>`).join('');
    return `<div class="panel mid-panel">${head('Cài đặt')}
      <div class="scroll set">
      ${sw('music', 'Nhạc nền', 'Giai điệu đồng quê.')}
      ${sw('sfx', 'Hiệu ứng âm thanh', 'Tiếng dây, bò và vàng.')}
      ${sw('assist', 'Chế độ giữ phím', 'Giữ E, Space hoặc nút KÉO để tự kéo, với lực nhẹ hơn.')}
      <div class="set-row"><div><b>Độ khó</b><p>Thay đổi số lần nhấn cần để kéo bò.</p></div><div class="segs">${dif}</div></div>
      <div class="skin-head"><b>Hình bò của bạn</b><p>Chọn ảnh của riêng bạn thay cho từng loại bò. Có thể chọn riêng ảnh lúc bình thường và ảnh lúc bị bắt dây. Ảnh PNG nền trong suốt đẹp nhất, ảnh có nền thì bật cắt oval. Mở game bằng start-game.bat thì ảnh được lưu thẳng vào thư mục assets/cows. Bạn cũng có thể tự bỏ ảnh vào thư mục đó, xem README trong thư mục.</p></div>
      ${COW_ORDER.map(id => { const sa = Skins.src(id, 'src'), sh = Skins.src(id, 'hooked'), th = (src, lbl) => `<div class="skin-thumb">${src ? `<img src="${src}" alt="">` : `<span>${lbl}</span>`}</div>`; return `<div class="skin-row"><b>${esc(COWS[id].name)}</b>
        <div class="skin-pair"><div>${th(sa, 'Hình gốc')}<label class="btn ghost sm">Ảnh bình thường<input class="sr" type="file" accept="image/*" data-skin="${id}" data-kind="src"></label></div>
        <div>${th(sh || sa, 'Hình gốc')}<label class="btn ghost sm">Ảnh khi bị bắt<input class="sr" type="file" accept="image/*" data-skin="${id}" data-kind="hooked"></label></div></div>
        <div class="skin-actions">${sa || sh ? `<button class="btn ghost sm" data-act="skinflip" data-id="${id}">${Skins.flip(id) ? 'Lật ảnh: đang lật' : 'Lật ảnh: không'}</button><button class="btn ghost sm" data-act="skinoval" data-id="${id}">${Skins.oval(id) ? 'Cắt oval: bật' : 'Cắt oval: tắt'}</button><button class="btn ghost sm" data-act="skinclear" data-id="${id}">Dùng hình gốc</button>` : ''}</div></div>`; }).join('')}
      <div class="set-row"><div><b>Dữ liệu đã lưu</b><p>Vàng, vật phẩm và màn đã mở nằm trong trình duyệt này.</p></div>
        <button class="btn ${ui.confirmReset ? 'danger' : 'ghost'}" data-act="reset">${ui.confirmReset ? 'Bấm lần nữa để xoá' : 'Xoá dữ liệu'}</button></div>
      </div></div>`;
  },

  pause() {
    const s = Save.data.settings;
    return `<div class="panel pause">
      <h2>Tạm dừng</h2>
      <div class="stack">
        <button class="btn big" data-act="resume" data-focus>Tiếp tục</button>
        <button class="btn leaf" data-act="restart">Chơi lại màn này</button>
        <button class="btn ghost" data-act="menu">Về màn hình chính</button>
      </div>
      <div class="quick"><button class="switch-lbl ${s.music ? 'on' : ''}" data-act="toggle" data-key="music" role="switch" aria-checked="${s.music}">Nhạc</button>
      <button class="switch-lbl ${s.sfx ? 'on' : ''}" data-act="toggle" data-key="sfx" role="switch" aria-checked="${s.sfx}">Âm thanh</button></div>
    </div>`;
  },

  result(r) {
    const caught = COW_ORDER.filter(id => r.caught[id]).map(id => `<li><b>${r.caught[id]}</b> ${esc(COWS[id].name)}</li>`).join('') || '<li class="none">Chưa bắt được con nào</li>';
    const total = r.gold + r.bonus + r.timeBonus;
    return `<div class="panel result ${r.win ? 'win' : 'lose'}">
      <h2>${r.win ? 'Vượt màn!' : 'Chưa đạt mục tiêu'}</h2>
      <p class="sub">${esc(r.level.endless ? r.level.name : 'Màn ' + r.level.id + ': ' + r.level.name)}</p>
      <div class="score-big"><b id="rScore">0</b><span>/ ${fmt(r.target)} điểm</span>${r.isBest ? '<em>Kỷ lục mới</em>' : ''}</div>
      <div class="res-cols">
        <ul class="caught">${caught}</ul>
        <dl class="facts">
          <div><dt>Quăng trượt</dt><dd>${r.missed}</dd></div>
          <div><dt>Bò thoát</dt><dd>${r.escaped}</dd></div>
          <div><dt>Vàng từ bò</dt><dd>${fmt(r.gold)}</dd></div>
          ${r.win ? `<div><dt>Thưởng qua màn</dt><dd>${fmt(r.bonus)}</dd></div><div><dt>Thưởng thời gian</dt><dd>${fmt(r.timeBonus)}</dd></div>` : ''}
          <div class="tot"><dt>Tổng vàng nhận</dt><dd id="rGold">+0</dd></div>
        </dl>
      </div>
      <div class="actions">
        ${r.win ? '<button class="btn big" data-act="next" data-focus>Màn tiếp theo</button><button class="btn leaf" data-act="restart">Chơi lại</button>' : '<button class="btn big" data-act="restart" data-focus>Chơi lại</button>'}
        <button class="btn leaf" data-act="shop">Cửa hàng</button>
        <button class="btn ghost" data-act="menu">Màn hình chính</button>
      </div>
    </div>`;
  }
};

function head(title, extra = '') {
  return `<header class="head"><button class="back" data-act="menu" aria-label="Về màn hình chính"><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2>${title}</h2><div class="head-extra">${extra}</div></header>`;
}

/* ---------- khởi động ---------- */
Save.load();
const game = new Game(document.getElementById('cv'));
UI.init();
game.startDemo();
UI.show('menu');
