// 월드 씬: 맵 / 플레이어 / 몬스터 / 전투 판정. 맵 이동 시 이 씬만 재시작되고 UIScene 은 유지된다.
SR.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    data = data || {};
    this.mapId = data.map || (SR.state.position && SR.state.position.map) || SR.Data.config.startMap;
    if (!SR.Data.maps[this.mapId]) this.mapId = SR.Data.config.startMap;
    this.spawnAt = data.x != null ? { x: data.x, y: data.y } : null;
    this.reviving = !!data.revive;
  }

  create() {
    SR.gameScene = this;
    const T = SR.Data.config.tileSize;
    this.mapData = SR.Data.maps[this.mapId];
    this.cameras.main.setBackgroundColor(this.mapData.bgColor || '#000000');
    this.world = SR.MapBuilder.build(this, this.mapId);

    // 시작 위치: 포탈 도착 지점 > 저장 위치 > 맵 기본 위치
    const pos = SR.state.position || {};
    let px, py;
    if (this.spawnAt) { px = this.spawnAt.x; py = this.spawnAt.y; }
    else if (pos.map === this.mapId && pos.x != null) { px = pos.x; py = pos.y; }
    else { px = this.mapData.playerStart[0] * T; py = this.mapData.playerStart[1] * T; }
    if (!this.world.canStand(px, py, null, 12)) { px = this.mapData.playerStart[0] * T; py = this.mapData.playerStart[1] * T; }

    this.player = new SR.Player(this, px, py);
    if (this.reviving) { this.player.revive(SR.Data.config.death.reviveHpRatio); SR.FX.heal(this, px, py - 30); }
    else if (SR.state.hp <= 0) this.player.revive(SR.Data.config.death.reviveHpRatio);
    this.pet = new SR.Pet(this, this.player);
    this.monsters = [];
    this.drops = [];
    this.target = null;
    this.nearNpc = null;
    this.spawners = (this.mapData.spawns || []).map(e => new SR.Spawner(this, e));
    this.npcs = (this.mapData.npcs || []).map(n => new SR.Npc(this, n));
    this.portals = (this.mapData.portals || []).map(p => this.createPortal(p));
    this.portalGrace = 0.8;
    this.autosaveT = 0;
    this.changing = false;

    const cam = this.cameras.main;
    // 사냥터는 맵 가장자리 너머(물)까지 카메라가 갈 수 있게 해서 캐릭터가 HUD 밑에 깔리지 않게 한다
    const pad = this.mapData.safe ? 0 : 2 * T, padTop = this.mapData.safe ? 0 : 4 * T;
    cam.setBounds(-pad, -padTop, this.world.W + pad * 2, this.world.H + padTop + pad);
    cam.startFollow(this.player, true, 0.14, 0.14, 0, 40);
    cam.setRoundPixels(true);
    cam.fadeIn(300, 0, 0, 0);

    SR.state.position = { map: this.mapId, x: px, y: py };
    SR.bus.emit('mapEnter', this.mapData.name, this.mapId);

    // 전역 이벤트 (씬 재시작 시 해제)
    const onLevel = (lv) => {
      SR.FX.levelUp(this, this.player);
      SR.Sound.play('levelup');
      SR.log(`레벨 업! Lv.${lv} 달성 — 스킬 포인트 +${SR.Data.config.levelUp.skillPoints}`, '#ffe066');
      this.saveNow();
    };
    const onItemUsed = (id, use) => {
      if (use.hp) { SR.FX.heal(this, this.player.x, this.player.y - 20); SR.FX.damage(this, this.player.x, this.player.y - 96, use.hp, { kind: 'heal' }); }
      if (use.mp) SR.FX.heal(this, this.player.x, this.player.y - 20, [0x6fb8ff, 0xd9f0ff]);
      if (use.buff) SR.FX.aura(this, this.player.x, this.player.y);
      SR.Sound.play('potion');
    };
    SR.bus.on('levelup', onLevel);
    SR.bus.on('itemUsed', onItemUsed);
    this.events.once('shutdown', () => {
      SR.bus.off('levelup', onLevel);
      SR.bus.off('itemUsed', onItemUsed);
    });
  }

  createPortal(p) {
    const T = SR.Data.config.tileSize;
    const cx = (p.x + p.w / 2) * T, cy = (p.y + p.h / 2) * T;
    const spr = this.add.sprite(cx, cy, 'portal', 0).setDepth(SR.DEPTH.decal).setScale(Math.max(p.w, p.h) * 0.75);
    spr.play('portal_spin');
    const glow = this.add.image(cx, cy - 20, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fe8ff).setScale(1.3, 1.8).setAlpha(0.45).setDepth(SR.DEPTH.overhead - 2);
    this.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 });
    const e = this.add.particles(cx, cy, 'px', {
      x: { min: -30, max: 30 }, speedY: { min: -90, max: -40 }, lifespan: 1000, scale: { start: 2, end: 0 },
      tint: [0x7fe8ff, 0xffffff], blendMode: 'ADD', frequency: 90
    }).setDepth(SR.DEPTH.overhead - 1);
    const label = this.add.text(cx, cy + p.h * T / 2 + 18, '▶ ' + p.label, SR.textStyle(14, '#9ff0ff')).setOrigin(0.5).setDepth(SR.DEPTH.nameplate);
    return { def: p, x: p.x * T, y: p.y * T, w: p.w * T, h: p.h * T, objs: [spr, glow, e, label] };
  }

  // ---------------- 조회 ----------------
  aliveMonsters() { return this.monsters.filter(m => m.alive); }

  findNearestMonster(x, y, range) {
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = SR.util.dist(x, y, m.x, m.y) - m.bodyRadius;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  // 기본공격 자동 타겟: 기존 타겟 유지 우선
  pickTarget(range) {
    const p = this.player;
    if (this.target && this.target.alive && SR.util.dist(p.x, p.y, this.target.x, this.target.y) - this.target.bodyRadius < range * 1.25) return this.target;
    const t = this.findNearestMonster(p.x, p.y, range);
    if (t) this.target = t;
    return t;
  }

  monstersInArc(x, y, range, angle, arcDeg) {
    const half = Phaser.Math.DegToRad(arcDeg) / 2;
    return this.monsters.filter(m => {
      if (!m.alive) return false;
      const d = SR.util.dist(x, y, m.x, m.y);
      if (d - m.bodyRadius > range) return false;
      if (d < m.bodyRadius + 24) return true;
      return SR.util.angleDiff(angle, Math.atan2(m.y - y, m.x - x)) <= half + Math.atan2(m.bodyRadius, d);
    });
  }

  monstersInRadius(x, y, r) {
    return this.monsters.filter(m => m.alive && SR.util.dist(x, y, m.x, m.y) - m.bodyRadius <= r);
  }

  // ---------------- 전투 ----------------
  playerDamage(m, mult, opts) {
    if (!m.alive) return;
    opts = opts || {};
    const r = SR.Combat.playerHit(SR.state.stats, mult, m.def.def);
    m.takeDamage(r.amount, r);
    this.target = m;
    this.player.combatT = 0;
    const hx = m.x, hy = m.y - m.height * 0.5;
    const tint = opts.fx === 'fire' ? 0xff8a2a : r.deadly ? 0xff6ae0 : r.crit ? 0xffd24a : 0xffffff;
    SR.FX.hitSpark(this, hx, hy, tint, r.deadly ? 2 : r.crit ? 1.5 : 1);
    if (opts.fx === 'fire') SR.FX.fireBurst(this, hx, hy, m.elite ? 1.4 : 1);
    else if (opts.fx === 'kick' || r.crit) SR.FX.impact(this, hx, hy, tint, r.deadly ? 1.4 : 0.9);
    if (r.deadly) { this.cameras.main.shake(140, 0.008); SR.Sound.play('deadly'); }
    else if (r.crit) { this.cameras.main.shake(80, 0.004); SR.Sound.play('crit'); }
    else if (opts.skill) SR.Sound.play('hit');
  }

  onMonsterKilled(m) {
    const st = SR.state, def = m.def;
    st.kills++;
    if (this.target === m) this.target = null;
    const gained = st.gainExp(def.exp);
    const gold = SR.util.randInt(def.gold[0], def.gold[1]);
    st.addGold(gold);
    SR.bus.emit('goldNotice', gold);
    SR.Sound.play('coin');
    // 코인 연출
    for (let i = 0; i < (m.elite ? 10 : 3); i++) {
      const c = this.add.image(m.x, m.y - 20, 'icon_gold').setDepth(SR.DEPTH.overhead);
      const tx = m.x + SR.util.rand(-50, 50), ty = m.y + SR.util.rand(-10, 20);
      this.tweens.add({ targets: c, x: tx, duration: 350 });
      this.tweens.add({ targets: c, y: ty - 50, duration: 175, yoyo: true, ease: 'Quad.Out' });
      this.tweens.add({ targets: c, x: () => this.player.x, y: () => this.player.y - 40, delay: 450 + i * 30, duration: 250, ease: 'Quad.In', onComplete: () => c.destroy() });
    }
    if (m.elite) SR.log(`정예 [${m.name}] 처치! 경험치 +${SR.util.fmt(gained)}`, '#ffcf4a');
    else SR.log(`${m.name} 처치. 경험치 +${gained}`, '#d9d2ff');
    (def.drops || []).forEach(d => { if (Math.random() < d.chance) this.drops.push(new SR.Drop(this, d.id, d.qty || 1, m.x, m.y)); });
    if (m.spawner) m.spawner.onKilled();
    SR.bus.emit('monsterKilled', m.id);
  }

  // ---------------- 행동 ----------------
  handleAction(a) {
    const p = this.player;
    if (p.dead) return;
    if (a.type === 'skill') {
      const id = SR.state.cls.skills[a.index];
      if (!id) return;
      if (p.lockT > 0 || p.dashT > 0) return;
      const r = SR.Skills.cast(this, p, id);
      if (!r.ok && !r.silent) { SR.log(r.reason, '#ff9a7a'); SR.Sound.play('error'); }
    } else if (a.type === 'dash') {
      p.dash(SR.Input.move());
    } else if (a.type === 'interact') {
      if (this.nearNpc) SR.bus.emit('npcInteract', this.nearNpc.id);
    } else if (a.type === 'potion') {
      this.quickPotion();
    }
  }

  quickPotion() {
    const st = SR.state;
    const order = ['potion_hp_s', 'potion_hp_m'];
    for (const id of order) {
      const slot = st.findSlot(id);
      if (slot >= 0) {
        const r = st.useAt(slot);
        if (!r.ok && r.msg) { SR.log(r.msg, '#ff9a7a'); SR.Sound.play('error'); }
        return;
      }
    }
    SR.log('HP 물약이 없습니다. 상점에서 구매하세요.', '#ff9a7a');
    SR.Sound.play('error');
  }

  changeMap(mapId, tx, ty, extra) {
    if (this.changing) return;
    this.changing = true;
    const T = SR.Data.config.tileSize;
    SR.state.position = { map: mapId, x: tx * T, y: ty * T };
    SR.Save.save(SR.state, SR.state.position);
    SR.Sound.play('portal');
    SR.Input.reset();
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart(Object.assign({ map: mapId, x: tx * T, y: ty * T }, extra || {}));
    });
  }

  reviveInTown() {
    const town = SR.Data.maps[SR.Data.config.startMap];
    this.changeMap(SR.Data.config.startMap, town.playerStart[0], town.playerStart[1], { revive: true });
  }

  saveNow() {
    if (this.changing) return;
    const ok = SR.Save.save(SR.state, { map: this.mapId, x: this.player.x, y: this.player.y });
    if (ok) SR.state.position = { map: this.mapId, x: this.player.x, y: this.player.y };
    return ok;
  }

  // ---------------- 루프 ----------------
  update(time, delta) {
    if (this.changing) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.world.update(time);
    SR.Input.consume().forEach(a => this.handleAction(a));
    this.player.update(dt, time);
    this.pet.update(dt);

    for (const m of this.monsters) m.update(dt);
    this.separateMonsters();
    this.monsters = this.monsters.filter(m => !m.destroyed);
    this.spawners.forEach(s => s.update(dt));
    this.drops.forEach(d => d.update(dt, this.player));
    this.drops = this.drops.filter(d => !d.collected);

    SR.state.updateBuffs(dt);
    SR.Skills.update(dt);

    // NPC 근접
    let near = null, nd = 110;
    for (const n of this.npcs) {
      const d = SR.util.dist(this.player.x, this.player.y, n.x, n.y);
      if (d < nd) { nd = d; near = n; }
    }
    this.talkMode = !!near && !this.monsters.some(m => m.alive && SR.util.dist(m.x, m.y, this.player.x, this.player.y) < 320);
    if (near !== this.nearNpc) {
      if (this.nearNpc) this.nearNpc.setNear(false);
      if (near) near.setNear(true);
      this.nearNpc = near;
    }

    // 포탈
    this.portalGrace -= dt;
    if (this.portalGrace <= 0 && !this.player.dead) {
      for (const p of this.portals) {
        if (this.player.x >= p.x && this.player.x <= p.x + p.w && this.player.y >= p.y && this.player.y <= p.y + p.h) {
          this.changeMap(p.def.to, p.def.toX, p.def.toY);
          return;
        }
      }
    }

    // 타겟 유효성
    if (this.target && (!this.target.alive || SR.util.dist(this.player.x, this.player.y, this.target.x, this.target.y) > 700)) this.target = null;

    // 자동 저장
    this.autosaveT += dt;
    if (this.autosaveT >= SR.Data.config.autosaveSeconds) { this.autosaveT = 0; if (!this.player.dead) this.saveNow(); }
  }

  separateMonsters() {
    const list = this.monsters.filter(m => m.alive);
    const p = this.player;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const min = (a.bodyRadius + b.bodyRadius) * 0.75;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < min && d > 0.01) {
          const push = (min - d) * 0.25;
          const nx = dx / d, ny = dy / d;
          this.world.move(a, -nx * push, -ny * push, a.moveRadius);
          this.world.move(b, nx * push, ny * push, b.moveRadius);
        }
      }
      // 플레이어와 겹치지 않게 (몬스터만 밀림)
      const min = a.bodyRadius * 0.7 + p.radius;
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy);
      if (d < min && d > 0.01 && !p.dead) this.world.move(a, dx / d * (min - d) * 0.3, dy / d * (min - d) * 0.3, a.moveRadius);
    }
  }
};

// 자동 테스트/디버그용 훅 (게임 진행에는 사용되지 않음)
SR.debug = {
  scene() { return SR.gameScene; },
  teleport(tx, ty) {
    const s = SR.gameScene, T = SR.Data.config.tileSize;
    s.player.x = tx * T; s.player.y = ty * T;
  },
  info() {
    const s = SR.gameScene, st = SR.state;
    return {
      map: s.mapId, x: Math.round(s.player.x), y: Math.round(s.player.y), level: st.level, exp: st.exp, gold: st.gold,
      hp: Math.round(st.hp), mp: Math.round(st.mp), charge: st.charge, sp: st.skillPoints, skills: Object.assign({}, st.skills),
      dead: s.player.dead, monsters: s.monsters.filter(m => m.alive).map(m => ({ id: m.id, hp: m.hp, x: Math.round(m.x), y: Math.round(m.y) })),
      target: s.target ? { id: s.target.id, hp: s.target.hp } : null,
      inv: st.inventory.filter(Boolean).map(i => i.id + 'x' + i.qty), equip: Object.assign({}, st.equipment)
    };
  }
};
