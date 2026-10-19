'use strict';
/* Bắn Bò: lối chơi bắn súng, mở rộng lớp Game. Các hàm của kiểu này đều bắt đầu bằng "sh". */

Object.assign(Game.prototype, {
  /* ---------- vòng đời ---------- */
  shReset() {
    this.proj = []; this.beam = null; this.holding = false; this.fireCd = 0; this.spin = 0; this.spinA = 0; this.recoil = 0; this.flashT = 0;
    this.br = null; this.sndT = 0; this.sndN = 0; this.expKills = 0;
  },
  shStart(n) {
    const d = Save.data.shoot;
    SHOULDER.x = 640;
    this.level = slevelConfig(n); this.gear = computeGear({});
    this.mode = 'intro'; this.introT = 1.9; this.paused = false;
    this.score = 0; this.timeLeft = this.level.time; this.streak = 0; this.comboT = 0; this.ended = false;
    this.session = { caught: {}, shots: 0, hits: 0, gold: 0, bestCombo: 0 };
    this.resetWorld(); this.shReset();
    this.wep = Arsenal.owned(d.equipped) ? d.equipped : 'pistol';
    this.fillQueue();
    Sound.play('start');
    this.cb.onStart && this.cb.onStart(this.level);
  },
  shDemo() {
    this.level = Object.assign(slevelConfig(8), { maxCows: 7, hpMul: .6 });
    this.gear = computeGear({});
    SHOULDER.x = 990;
    this.mode = 'demo'; this.paused = false; this.demoT = 1.2;
    this.resetWorld(); this.shReset(); this.wep = 'pistol';
    this.fillQueue();
  },
  shEquip(id) {
    if (!Arsenal.owned(id) || this.wep === id) return false;
    this.wep = id; Arsenal.equip(id); this.spin = 0; this.beam = null; this.fireCd = Math.max(this.fireCd, .12);
    Sound.play('ui');
    return true;
  },
  shHold(on) { this.holding = !!on && (this.mode === 'play' || this.mode === 'demo') && !this.paused; },

  /* ---------- cập nhật ---------- */
  shUpdate(dt) {
    this.t += dt;
    const play = this.mode === 'play';
    if (this.mode === 'intro') { this.introT -= dt; if (this.introT <= 0) { this.mode = 'play'; this.cb.onGo && this.cb.onGo(); } }
    if (play) {
      if (this.keyAim) {
        this.aimTarget = clamp(this.aimTarget + this.keyAim * dt * 1.9, -Math.PI + .1, -.1);
        this.aimX = SHOULDER.x + Math.cos(this.aimTarget) * 520; this.aimY = SHOULDER.y + Math.sin(this.aimTarget) * 520;
      }
      const before = this.timeLeft;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (before > 0 && this.timeLeft === 0) this.cb.onTimeUp && this.cb.onTimeUp(false);
    }
    this.aimAng += (this.aimTarget - this.aimAng) * (1 - Math.exp(-dt * 30));
    if (this.mode === 'demo') this.shDemoAI(dt);
    this.recoil = Math.max(0, this.recoil - dt * 9); this.flashT = Math.max(0, this.flashT - dt);
    this.fireCd = Math.max(-.02, this.fireCd - dt); this.sndT -= dt;
    if (this.streak > 0 && this.mode !== 'demo') { this.comboT -= dt; if (this.comboT <= 0) this.streak = 0; }
    this.shFireUpdate(dt);

    this.spawnT = (this.spawnT || 0) - dt;
    if (this.spawnT <= 0) {
      if (this.cows.filter(c => c.state === 'walk').length < this.level.maxCows) this.spawn(false);
      this.spawnT = rnd(.6, 1.3);
    }
    this.updateCows(dt);
    this.shUpdateCows(dt);
    this.shUpdateProj(dt);
    this.updateFx(dt);

    if (play && !this.ended) {
      if (this.score >= this.level.target) this.end(true);
      else if (this.timeLeft <= 0) this.end(false);
    }
  },
  shDemoAI(dt) {
    this.demoT -= dt;
    if (this.demoT > 0) return;
    if (this.holding) { this.holding = false; this.demoT = rnd(.6, 1.3); return; }
    const cand = this.cows.filter(c => c.state === 'walk' && Math.abs(c.x - SHOULDER.x) > 150);
    if (!cand.length) { this.demoT = .5; return; }
    const cow = cand[Math.floor(Math.random() * cand.length)], m = cow.center();
    this.wep = WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id;
    this.aimX = m.x; this.aimY = m.y; this.aimTarget = clamp(Math.atan2(m.y - SHOULDER.y, m.x - SHOULDER.x), -Math.PI + .1, -.1);
    this.aimAng = this.aimTarget; this.holding = true; this.demoT = rnd(.7, 1.5);
  },
  shUpdateCows(dt) {
    for (let i = this.cows.length - 1; i >= 0; i--) {
      const c = this.cows[i];
      c.hurt = Math.max(0, c.hurt - dt); c.flash = Math.max(0, c.flash - dt);
      if (c.state === 'walk') {
        if (c.burn > 0) {
          c.burn -= dt;
          this.shDot(c, c.burnD * dt);
          if (c.state === 'walk' && Math.random() < dt * 18) { const m = c.center(); this.puff(m.x + rnd(-20, 20) * c.s, m.y + rnd(-10, 30) * c.s, 1, Math.random() < .5 ? '#FF9A2E' : '#FFE27A', 60, .45, 7 * c.s, -90); }
        }
      } else if (c.state === 'ko') {
        c.ko += dt / .95;
        const k = Math.min(1, c.ko);
        c.koLift = Math.sin(k * Math.PI * .9) * 150 + k * 60; c.tilt = (c.tilt || 0) + dt * 13 * c.face;
        c.alpha = clamp(1 - k * k * k, 0, 1); c.vx = 0; c.vy = 0;
        if (c.ko >= 1) this.cows.splice(i, 1);
      }
    }
  },

  /* ---------- bắn ---------- */
  shMuzzle(W_) {
    const h = this.hand(), a = this.aimAng, L = (W_.len || 40) - this.recoil * 4;
    return { x: h.x + Math.cos(a) * L, y: h.y + Math.sin(a) * L };
  },
  /* điểm trỏ chuột, giữ trong vùng đồng cỏ để đạn vòng cung rơi xuống đất */
  shTarget() {
    const h = this.hand(), ax = this.aimX == null ? SHOULDER.x : this.aimX, ay = this.aimY == null ? 400 : this.aimY;
    let x = clamp(ax, 24, W - 24), y = clamp(ay, 300, 660);
    const d = Math.hypot(x - h.x, y - h.y);
    if (d > 880) { x = h.x + (x - h.x) / d * 880; y = h.y + (y - h.y) / d * 880; }
    return { x, y };
  },
  shFireUpdate(dt) {
    const W_ = WEAPON[this.wep];
    if (!W_) return;
    const can = this.holding && !this.paused && (this.mode === 'demo' || (this.mode === 'play' && this.timeLeft > 0));
    if (W_.kind === 'minigun') {
      this.spin = clamp(this.spin + (can ? dt / 1 : -dt / 1.2), 0, 1); this.spinA += dt * this.spin * 38;
    } else this.spin = 0;
    this.beam = null;
    if (!can) return;
    if (W_.kind === 'laser') return this.shLaser(W_, dt);
    if (W_.kind === 'flame') return this.shFlame(W_, dt);
    let rate = W_.rate;
    if (W_.kind === 'minigun') { if (this.spin < .35) return; rate = lerp(5, W_.rate, (this.spin - .35) / .65); }
    for (let n = 0; this.fireCd <= 0 && n < 4; n++) {
      if (!this.shShoot(W_)) break;
      this.fireCd += 1 / rate;
    }
  },
  shShoot(W_) {
    const m = this.shMuzzle(W_), a = this.aimAng, mult = Arsenal.mult(W_.id), dmg = (W_.dmg || 0) * mult, play = this.mode === 'play';
    const tg = this.shTarget();
    if (W_.kind === 'boomerang' && this.br) return false;
    if (play) { this.session.shots++; Save.data.shoot.stats.shots++; }
    this.recoil = 1; this.flashT = .06;
    switch (W_.kind) {
      case 'bullet': case 'minigun': {
        const sp = a + rnd(-1, 1) * (W_.spread || 0);
        this.proj.push({ k: 'b', x: m.x, y: m.y, vx: Math.cos(sp) * W_.speed, vy: Math.sin(sp) * W_.speed, dmg, life: 1, r: 5, big: W_.kind === 'minigun' });
        if (W_.kind === 'minigun') { if (this.sndN++ % 3 === 0) Sound.play('rifle'); } else Sound.play(W_.id === 'pistol' ? 'shot' : 'rifle');
        break;
      }
      case 'boomerang': {
        const sgn = this.aimTarget < -Math.PI / 2 ? -1 : 1;
        this.br = { k: 'br', t: 0, H: { x: m.x, y: m.y }, u: { x: Math.cos(a), y: Math.sin(a) }, v: { x: -Math.sin(a) * sgn, y: Math.cos(a) * sgn }, R: W_.range, Wd: 150, dmg, hit: new Set(), x: m.x, y: m.y, rot: 0 };
        this.proj.push(this.br); Sound.play('swoosh');
        break;
      }
      case 'grenade': case 'mortar': {
        const d = Math.hypot(tg.x - m.x, tg.y - m.y), mortar = W_.kind === 'mortar';
        this.proj.push({ k: mortar ? 'm' : 'g', sx: m.x, sy: m.y, tx: tg.x, ty: tg.y, x: m.x, y: m.y, t: 0, dur: mortar ? .85 + d / 1500 : .5 + d / 1400, arc: mortar ? 340 : 150, dmg, radius: W_.radius, fuse: W_.fuse || 0, sit: 0 });
        Sound.play('lob');
        break;
      }
      case 'rocket': {
        const d = Math.hypot(tg.x - m.x, tg.y - m.y);
        this.proj.push({ k: 'r', x: m.x, y: m.y, vx: Math.cos(a) * W_.speed, vy: Math.sin(a) * W_.speed, ang: a, dmg, radius: W_.radius, trav: 0, maxD: Math.max(220, d) });
        Sound.play('rocket');
        break;
      }
    }
    if (W_.kind !== 'grenade' && W_.kind !== 'boomerang') this.puff(m.x, m.y, 3, 'rgba(255,230,150,.9)', 140, .18, 3.5);
    return true;
  },
  shLaser(W_, dt) {
    const m = this.shMuzzle(W_), a = this.aimAng, ca = Math.cos(a), sa = Math.sin(a), dps = W_.dps * Arsenal.mult(W_.id);
    this.beam = { x: m.x, y: m.y, a, len: 1700 };
    if (this.sndT <= 0) { Sound.play('laser'); this.sndT = .16; }
    for (const c of this.cows.slice()) {
      if (c.state !== 'walk') continue;
      const q = c.center(), px = q.x - m.x, py = q.y - m.y, along = px * ca + py * sa, perp = Math.abs(px * sa - py * ca);
      if (along > 0 && perp < c.radius()) {
        this.shHurt(c, dps * dt, q.x - ca * 10, q.y - sa * 10, true);
        if (Math.random() < dt * 22) this.puff(q.x, q.y, 1, '#9ff5ff', 120, .25, 4);
      }
    }
    this.recoil = Math.max(this.recoil, .25);
  },
  shFlame(W_, dt) {
    const m = this.shMuzzle(W_), a = this.aimAng, mult = Arsenal.mult(W_.id), dps = W_.dps * mult;
    if (this.sndT <= 0) { Sound.play('flame'); this.sndT = .14; }
    for (let i = 0; i < 4; i++) {
      const sp = a + rnd(-.2, .2), v = rnd(260, 520);
      this.parts.push({ type: 'dust', x: m.x, y: m.y, vx: Math.cos(sp) * v, vy: Math.sin(sp) * v, life: rnd(.25, .5), max: .5, size: rnd(7, 15), color: ['#FFB02E', '#FF6A2E', '#FFE27A', '#FF8A3D'][i & 3], rot: 0, vr: 0 });
    }
    for (const c of this.cows.slice()) {
      if (c.state !== 'walk') continue;
      const q = c.center(), px = q.x - m.x, py = q.y - m.y, d = Math.hypot(px, py), r = c.radius();
      if (d > W_.range + r) continue;
      let da = Math.abs(Math.atan2(py, px) - a); if (da > Math.PI) da = TAU - da;
      if (da < .3 + r / Math.max(d, 1) * .6) {
        this.shHurt(c, dps * dt, q.x, q.y, true);
        if (c.state === 'walk') { c.burn = 3.2; c.burnD = W_.burn * mult; }
      }
    }
    this.recoil = Math.max(this.recoil, .2);
  },

  /* ---------- đạn và nổ ---------- */
  shHit(x, y, r) {
    let best = null, bd = 1e9;
    for (const c of this.cows) {
      if (c.state !== 'walk') continue;
      const q = c.center(), d = Math.hypot(q.x - x, q.y - y) / (c.radius() + r);
      if (d < 1 && d < bd) { bd = d; best = c; }
    }
    return best;
  },
  shUpdateProj(dt) {
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i]; let dead = false;
      if (p.k === 'b') {
        p.life -= dt;
        const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 20));
        for (let s = 0; s < n && !dead; s++) {
          p.x += p.vx * dt / n; p.y += p.vy * dt / n;
          const c = this.shHit(p.x, p.y, p.r);
          if (c) { this.shHurt(c, p.dmg, p.x, p.y); this.puff(p.x, p.y, 3, 'rgba(255,240,170,.9)', 130, .22, 3); dead = true; }
        }
        if (p.life <= 0 || p.x < -60 || p.x > W + 60 || p.y < -80 || p.y > H + 40) dead = true;
      } else if (p.k === 'r') {
        const step = Math.hypot(p.vx, p.vy) * dt, n = Math.max(1, Math.ceil(step / 22));
        for (let s = 0; s < n && !dead; s++) {
          p.x += p.vx * dt / n; p.y += p.vy * dt / n; p.trav += step / n;
          if (this.shHit(p.x, p.y, 8) || p.trav >= p.maxD) dead = 'boom';
        }
        if (!dead && Math.random() < dt * 60) this.puff(p.x - Math.cos(p.ang) * 22, p.y - Math.sin(p.ang) * 22, 1, 'rgba(235,235,235,.8)', 40, .55, 7, -20);
        if (!dead && (p.x < -80 || p.x > W + 80 || p.y < -100 || p.y > H + 60)) dead = 'boom';
        if (dead === 'boom') this.shExplode(p.x, p.y, p.radius, p.dmg);
      } else if (p.k === 'g' || p.k === 'm') {
        if (p.t < 1) {
          p.t = Math.min(1, p.t + dt / p.dur);
          p.x = lerp(p.sx, p.tx, p.t); p.y = lerp(p.sy, p.ty, p.t) - Math.sin(p.t * Math.PI) * p.arc;
          if (p.t >= 1) { if (p.k === 'm') { this.shExplode(p.tx, p.ty, p.radius, p.dmg); dead = true; } else { p.sit = p.fuse; this.puff(p.tx, p.ty, 3, 'rgba(235,215,170,.7)', 60, .4, 6); } }
        } else { p.sit -= dt; if (p.sit <= 0) { this.shExplode(p.tx, p.ty, p.radius, p.dmg); dead = true; } }
      } else if (p.k === 'br') {
        p.t += dt / 1.55; p.rot += dt * 22;
        const th = p.t * TAU, f = p.R * (1 - Math.cos(th)) / 2, l = p.Wd * Math.sin(th);
        p.x = p.H.x + p.u.x * f + p.v.x * l; p.y = p.H.y + p.u.y * f + p.v.y * l;
        if (p.t >= .5 && !p.second) { p.second = true; p.hit.clear(); }
        for (const c of this.cows.slice()) {
          if (c.state !== 'walk' || p.hit.has(c.id)) continue;
          const q = c.center();
          if (Math.hypot(q.x - p.x, q.y - p.y) < c.radius() + 16) { p.hit.add(c.id); this.shHurt(c, p.dmg, p.x, p.y); this.puff(p.x, p.y, 4, 'rgba(255,230,140,.9)', 120, .25, 4); }
        }
        if (p.t >= 1) { dead = true; this.br = null; Sound.play('tink'); }
      }
      if (dead) this.proj.splice(i, 1);
    }
  },
  shExplode(x, y, radius, dmg) {
    this.expKills = 0;
    this.parts.push({ type: 'boom', x, y, vx: 0, vy: 0, life: .5, max: .5, r: radius * 1.05 });
    this.puff(x, y, 14, 'rgba(70,50,40,.65)', 220, .8, 11, -40);
    this.puff(x, y, 10, '#FFB02E', 260, .5, 8, -60);
    this.shake = Math.max(this.shake, 8 + radius / 20);
    Sound.play('boom');
    for (const c of this.cows.slice()) {
      if (c.state !== 'walk') continue;
      const q = c.center(), d = Math.hypot(q.x - x, q.y - y);
      if (d > radius + c.radius() * .5) continue;
      const k = 1 - .55 * clamp(d / radius, 0, 1);
      c.x += (q.x - x) / Math.max(d, 1) * 26 * k;
      this.shHurt(c, dmg * k, q.x, q.y);
    }
    if (this.expKills >= 3 && this.mode === 'play') {
      const bonus = this.expKills * 25; this.score += bonus;
      this.text(x, y - 90, `Nổ chùm x${this.expKills}! +${bonus}`, '#FFB02E', 46);
      SAch.unlock('multi');
    }
  },
  /* sát thương theo thời gian (cháy), không có hiệu ứng trúng đạn */
  shDot(c, dmg) { if (c.state !== 'walk') return; c.hp -= dmg; if (c.hp <= 0) this.shKill(c); },
  shHurt(c, dmg, x, y, quiet) {
    if (c.state !== 'walk') return false;
    c.hp -= dmg; c.hurt = .22; c.flash = quiet ? .04 : .09;
    if (this.mode === 'play' && !quiet) this.session.hits++;
    if (!quiet && dmg >= 30 && c.hp > 0) this.text(x, y - 30 * c.s, '-' + Math.round(dmg), '#FFE27A', 26);
    if (c.hp <= 0) { this.shKill(c); return true; }
    if (c.hp < c.maxhp * .35 && !c.fled) { c.fled = 1; c.boost = 2.6; }
    return false;
  },
  shKill(c) {
    if (c.state !== 'walk') return;
    c.state = 'ko'; c.ko = 0; c.koLift = 0; c.vx = 0; c.hp = 0;
    this.expKills++;
    const def = c.def, m = c.center(), play = this.mode === 'play';
    this.puff(m.x, m.y, 14, 'confetti', 240, 1, 6);
    Sound.play('ko'); Sound.play('moo');
    this.shake = Math.max(this.shake, 4);
    if (!play) return;
    const d = Save.data.shoot, ses = this.session;
    this.streak++; this.comboT = 2.6; ses.bestCombo = Math.max(ses.bestCombo, this.streak);
    const mult = 1 + this.streakBonus(), sc = Math.round(def.score * mult), gd = Math.round(def.gold * mult);
    this.score += sc; d.gold += gd; ses.gold += gd;
    ses.caught[c.type] = (ses.caught[c.type] || 0) + 1;
    d.stats.killed[c.type] = (d.stats.killed[c.type] || 0) + 1;
    this.text(m.x, m.y - 50 * c.s, `+${sc}`, '#fff', 42);
    this.text(m.x, m.y - 14 * c.s, `+${gd} vàng`, '#FFD54A', 30, .1);
    for (let i = 0; i < Math.min(10, 3 + Math.ceil(gd / 8)); i++) this.parts.push({ type: 'coin', x: m.x, y: m.y, sx: m.x, sy: m.y, t: -i * .05, dur: rnd(.7, .95), arc: rnd(-120, 120), life: 9 });
    SAch.unlock('first');
    if (c.type === 'tank') SAch.unlock('tank');
    if (c.type === 'ufo') SAch.unlock('ufo');
    if (this.streak >= 8) SAch.unlock('combo');
    if (['superman', 'wonder', 'ironman'].every(t => d.stats.killed[t])) SAch.unlock('heroes');
    Save.commit();
    this.cb.onCatch && this.cb.onCatch(c, sc, gd);
  },
  shEnd(win) {
    if (this.ended) return; this.ended = true; this.mode = 'end'; this.holding = false; this.beam = null;
    const d = Save.data.shoot, L = this.level, ses = this.session;
    let bonus = 0, timeBonus = 0;
    if (win) {
      bonus = 40 + L.id * 30; timeBonus = Math.floor(this.timeLeft * .8);
      d.gold += bonus + timeBonus; d.stats.levelsWon++; d.unlockedLevel = Math.max(d.unlockedLevel, L.id + 1);
    }
    const isBest = this.score > (d.bestByLevel[L.id] || 0);
    if (isBest) d.bestByLevel[L.id] = this.score;
    d.bestScore = Math.max(d.bestScore, this.score); d.stats.hits += ses.hits;
    Save.commit();
    Sound.play(win ? 'win' : 'lose');
    this.cb.onEnd && this.cb.onEnd({ mode: 'shoot', win, level: L, score: this.score, target: L.target, caught: ses.caught, shots: ses.shots, hits: ses.hits, bestCombo: ses.bestCombo, gold: ses.gold, bonus, timeBonus, isBest, timeLeft: this.timeLeft });
  },

  /* ---------- vẽ ---------- */
  shDrawBars(c, list) {
    for (const cow of list) {
      if (cow.state !== 'walk' || cow.hp >= cow.maxhp) continue;
      const w = clamp(60 * cow.s, 44, 96), x = cow.x - w / 2, y = cow.y - ((cow.def.cy || 62) * 2 + 18) * cow.s - cow.lift() - (cow.def.fly ? 0 : 0), k = clamp(cow.hp / cow.maxhp, 0, 1);
      c.fillStyle = 'rgba(15,28,66,.85)'; rr(c, x - 3, y - 3, w + 6, 14, 7); c.fill();
      c.fillStyle = k > .5 ? '#7CF0BF' : k > .25 ? '#FFD54A' : '#FF6A4A'; rr(c, x, y, Math.max(6, w * k), 8, 4); c.fill();
    }
  },
  shDrawGunArm(c, shake) {
    const px = SHOULDER.x, a = this.aimAng, hd = this.hand(a), rec = this.recoil * 7;
    const hx = hd.x - Math.cos(a) * rec, hy = hd.y - Math.sin(a) * rec, sx = px + 18 + shake, sy = 740;
    c.lineCap = 'round';
    c.strokeStyle = '#8f261b'; c.lineWidth = 34; c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, hx, .72), lerp(sy, hy, .72)); c.stroke();
    c.strokeStyle = '#C2412F'; c.lineWidth = 26; c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, hx, .72), lerp(sy, hy, .72)); c.stroke();
    c.save(); c.translate(hx, hy); c.rotate(a); if (Math.cos(a) < 0) c.scale(1, -1);
    drawGun(c, this.wep, this);
    c.restore();
    c.fillStyle = '#EBBD90'; c.strokeStyle = 'rgba(45,20,25,.92)'; c.lineWidth = 3.5;
    c.beginPath(); c.ellipse(hx + shake * .3, hy + 4, 15, 18, 0, 0, TAU); c.fill(); c.stroke();
    if (this.flashT > 0 && !this.beam && WEAPON[this.wep].kind !== 'boomerang') {
      const m = this.shMuzzle(WEAPON[this.wep]), s = 16 + this.flashT * 200;
      c.save(); c.translate(m.x, m.y); c.rotate(a); c.globalAlpha = clamp(this.flashT / .06, 0, 1);
      c.fillStyle = '#FFF2A8'; c.beginPath(); c.moveTo(0, -s * .5); c.lineTo(s * 1.3, 0); c.lineTo(0, s * .5); c.lineTo(-s * .3, 0); c.closePath(); c.fill();
      c.restore();
    }
  },
  shDrawProj(c) {
    if (this.beam) {
      const b = this.beam, ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len, w = 1 + .15 * Math.sin(this.t * 60);
      c.save(); c.lineCap = 'round';
      c.strokeStyle = 'rgba(56,217,245,.28)'; c.lineWidth = 26 * w; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = 'rgba(160,248,255,.75)'; c.lineWidth = 12 * w; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(ex, ey); c.stroke();
      c.restore();
    }
    for (const p of this.proj) {
      if (p.k === 'b') {
        const sp = Math.hypot(p.vx, p.vy), L = p.big ? 34 : 26;
        c.strokeStyle = 'rgba(255,200,80,.5)'; c.lineWidth = p.big ? 7 : 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / sp * L, p.y - p.vy / sp * L); c.stroke();
        c.strokeStyle = '#FFF6C4'; c.lineWidth = p.big ? 3.4 : 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / sp * L * .8, p.y - p.vy / sp * L * .8); c.stroke();
      } else if (p.k === 'r') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.ang);
        const f = 14 + Math.sin(this.t * 50) * 4; rPoly(c, [[-14, -4], [-14 - f, 0], [-14, 4]], '#FFB02E', null);
        rPoly(c, [[-14, -6], [10, -6], [20, 0], [10, 6], [-14, 6]], '#E9EEF7', RK, 3); rPoly(c, [[10, -6], [20, 0], [10, 6]], '#E5483A', RK, 3); rPoly(c, [[-14, -6], [-20, -12], [-8, -6]], '#E5483A', RK, 2.5);
        c.restore();
      } else if (p.k === 'g') {
        const gy = p.t >= 1 ? 0 : 0;
        if (p.t < 1) { c.fillStyle = 'rgba(80,40,10,.25)'; c.beginPath(); c.ellipse(lerp(p.sx, p.tx, p.t), lerp(p.sy, p.ty, p.t), 9, 4, 0, 0, TAU); c.fill(); }
        c.save(); c.translate(p.x, p.y + gy); c.rotate(this.t * 14);
        rEll(c, 0, 0, 9, 9, '#5E8C4A', RK, 2.5); rPoly(c, [[-2, -9], [6, -12], [7, -8], [-2, -6]], '#cfd8e8', RK, 2); c.restore();
        if (p.t >= 1) {
          const blink = Math.sin(this.t * (10 + (1 - p.sit / p.fuse) * 30)) > 0;
          c.strokeStyle = blink ? 'rgba(255,90,60,.9)' : 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.arc(p.tx, p.ty, p.radius * .96, 0, TAU); c.stroke(); c.setLineDash([]);
        }
      } else if (p.k === 'm') {
        c.fillStyle = 'rgba(80,40,10,.28)'; c.beginPath(); c.ellipse(lerp(p.sx, p.tx, p.t), lerp(p.sy, p.ty, p.t), 10, 4, 0, 0, TAU); c.fill();
        const k = 1 - p.t; c.strokeStyle = `rgba(255,${Math.round(100 + 120 * p.t)},60,.9)`; c.lineWidth = 4; c.setLineDash([8, 6]);
        c.beginPath(); c.ellipse(p.tx, p.ty, p.radius * (.7 + .3 * k), p.radius * (.7 + .3 * k) * .42, 0, 0, TAU); c.stroke(); c.setLineDash([]);
        const vx = (p.tx - p.sx) / p.dur, vy = (p.ty - p.sy) / p.dur - p.arc * Math.PI * Math.cos(p.t * Math.PI) / p.dur;
        c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(vy, vx));
        rEll(c, 0, 0, 14, 7, '#3a4258', RK, 3); rPoly(c, [[8, -5], [16, 0], [8, 5]], '#E5483A', RK, 2.5); c.restore();
      } else if (p.k === 'br') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.beginPath(); c.moveTo(-4, -14); c.quadraticCurveTo(26, -34, 40, 0); c.lineTo(32, 10); c.quadraticCurveTo(20, -14, -2, -3); c.closePath();
        c.translate(-18, 4); c.fillStyle = '#F6B93B'; c.fill(); c.strokeStyle = '#7A4A1B'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke();
        c.restore();
      }
    }
  },
  shDrawAim(c) {
    if (this.mode !== 'play' || this.paused) return;
    const W_ = WEAPON[this.wep]; if (!W_) return;
    const tg = this.shTarget(), kind = W_.kind;
    c.save();
    if (kind === 'grenade' || kind === 'mortar') {
      const r = W_.radius;
      c.strokeStyle = 'rgba(255,214,110,.9)'; c.lineWidth = 3.5; c.setLineDash([8, 7]);
      c.beginPath(); c.ellipse(tg.x, tg.y, r, r * .42, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,214,110,.9)'; c.beginPath(); c.arc(tg.x, tg.y, 4, 0, TAU); c.fill();
    } else {
      const h = this.hand(), a = this.aimAng, ca = Math.cos(a), sa = Math.sin(a), R = kind === 'flame' ? W_.range : 900;
      for (let d = 90; d < R; d += 36) { c.fillStyle = `rgba(255,255,255,${Math.max(.08, .5 - d / R * .45)})`; c.beginPath(); c.arc(h.x + ca * d, h.y + sa * d, 2.8, 0, TAU); c.fill(); }
      if (kind === 'rocket') {
        c.strokeStyle = 'rgba(255,214,110,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(tg.x, tg.y, 14, 0, TAU); c.moveTo(tg.x - 22, tg.y); c.lineTo(tg.x + 22, tg.y); c.moveTo(tg.x, tg.y - 22); c.lineTo(tg.x, tg.y + 22); c.stroke();
      } else if (kind === 'flame') {
        c.strokeStyle = 'rgba(255,160,60,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(h.x, h.y); c.arc(h.x, h.y, R, a - .3, a + .3); c.closePath(); c.stroke();
      }
    }
    c.restore();
  }
});

/* Hình khẩu súng trong tay, vẽ ở toạ độ cục bộ: gốc là bàn tay, trục x hướng về phía trước */
function drawGun(c, id, g) {
  const t = g.t || 0;
  switch (id) {
    case 'pistol':
      rPoly(c, [[-6, 3], [8, 3], [4, 23], [-10, 23]], '#6b4a2b', RK, 3);
      rPoly(c, [[-8, -9], [38, -9], [42, -4], [42, 3], [-8, 3]], '#cfd8e8', RK, 3); rLine(c, [[-2, -5], [34, -5]], 2.5, 'rgba(255,255,255,.7)'); break;
    case 'ak':
      rPoly(c, [[-32, -4], [-6, -6], [-6, 8], [-26, 14]], '#8a5a2b', RK, 3);
      rPoly(c, [[18, 5], [30, 5], [38, 28], [27, 30]], '#59647f', RK, 3);
      rPoly(c, [[-6, -8], [48, -8], [48, 4], [-6, 6]], '#2c3550', RK, 3);
      rPoly(c, [[36, -6], [66, -6], [66, 3], [36, 3]], '#8a5a2b', RK, 3); rLimb(c, [[64, -2], [90, -2]], 4, '#59647f'); break;
    case 'grenade':
      rEll(c, 14, 2, 12, 12, '#5E8C4A', RK, 3); rPoly(c, [[10, -10], [26, -6], [24, -1], [10, -5]], '#cfd8e8', RK, 2.5); rEll(c, 4, -10, 4.5, 4.5, null, '#F6B93B', 2.2);
      rLine(c, [[8, 0], [12, -4]], 2.5, 'rgba(255,255,255,.5)'); break;
    case 'flame':
      rEll(c, -10, 14, 15, 10, '#C0392B', RK, 3); rLine(c, [[-10, 10], [10, 2]], 3, RK);
      rPoly(c, [[0, -7], [58, -7], [58, 5], [0, 5]], '#cfd8e8', RK, 3); rPoly(c, [[58, -9], [68, -9], [68, 7], [58, 7]], '#59647f', RK, 3);
      rEll(c, 72, -1, 4 + Math.sin(t * 20) * 1.5, 3, '#FFB02E', null); break;
    case 'mortar':
      rPoly(c, [[-6, -14], [62, -14], [62, 14], [-6, 14]], '#59647f', RK, 3.5); rLine(c, [[14, -14], [14, 14]], 4); rLine(c, [[36, -14], [36, 14]], 4);
      rPoly(c, [[62, -17], [71, -17], [71, 17], [62, 17]], '#8a96b3', RK, 3); break;
    case 'laser':
      rPoly(c, [[-6, -9], [34, -9], [50, -5], [64, -5], [64, 5], [50, 5], [34, 9], [-6, 9]], '#eaf6ff', RK, 3); rLine(c, [[0, 0], [58, 0]], 3.5, '#38d9f5');
      rPoly(c, [[8, 9], [20, 9], [16, 24], [6, 24]], '#59647f', RK, 2.5); rEll(c, 65, 0, 4, 6, '#38d9f5', RK, 2); break;
    case 'bazooka':
      rPoly(c, [[14, 9], [26, 9], [24, 24], [12, 24]], '#4a3320', RK, 2.5);
      rPoly(c, [[-30, -9], [80, -9], [80, 9], [-30, 9]], '#6b7f45', RK, 3.5); rPoly(c, [[-30, -12], [-40, -16], [-40, 16], [-30, 12]], '#4a5a30', RK, 3);
      rPoly(c, [[80, -7], [98, 0], [80, 7]], '#E5483A', RK, 3); rPoly(c, [[10, -9], [36, -9], [36, -16], [10, -16]], '#2c3550', RK, 2.5); break;
    case 'm134': {
      rPoly(c, [[-4, 10], [24, 10], [24, 28], [-4, 28]], '#6b7f45', RK, 3);
      for (let i = 0; i < 6; i++) { const y = Math.sin(g.spinA + i * Math.PI / 3) * 8; rLimb(c, [[26, y], [86, y]], 2.6, '#cfd8e8'); }
      rPoly(c, [[-6, -12], [28, -12], [28, 12], [-6, 12]], '#59647f', RK, 3); rEll(c, 86, 0, 3.5, 11, null, RK, 2.6); break;
    }
    case 'boomerang':
      if (!g.br) {
        c.beginPath(); c.moveTo(-4, -8); c.quadraticCurveTo(26, -30, 42, 2); c.lineTo(34, 12); c.quadraticCurveTo(20, -10, -2, 2); c.closePath();
        c.fillStyle = '#F6B93B'; c.fill(); c.strokeStyle = '#7A4A1B'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke();
      }
      break;
  }
}
