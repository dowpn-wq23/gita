// 몬스터: 배회 → 발견 시 추격 → 근접 공격(예비동작 후 판정) → 너무 멀어지면 귀환
// 정예 몬스터는 큰 HP바/이름표를 항상 표시하고, 예고 원이 뜨는 범위 강공격을 쓴다.
SR.Monster = class Monster {
  constructor(scene, id, spawner, x, y) {
    const def = SR.Data.monsters[id];
    this.scene = scene;
    this.id = id;
    this.def = def;
    this.spawner = spawner;
    this.x = x; this.y = y;
    this.home = { x, y };
    this.elite = !!def.elite;
    this.bodyRadius = def.bodyRadius || 18;
    this.moveRadius = Math.min(this.bodyRadius * 0.6, 20);
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.level = def.level;
    this.name = def.name;
    this.alive = true;
    this.state = 'idle';
    this.stateT = SR.util.rand(0.5, 2.5);
    this.attackCd = 0;
    this.specialCd = def.special ? def.special.cooldown * 0.6 : 0;
    this.aggro = false;
    this.wanderTarget = null;
    this.stack = 0; this.lastHitAt = 0;
    this.burn = null;
    this.hurtT = 0;
    this.slide = null;
    this.showHpT = 0;
    this.bob = Math.random() * 10;

    const sc = SR.Assets.scaleOf(def.sprite);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(SR.DEPTH.shadow).setScale(this.bodyRadius / 13, this.bodyRadius / 18);
    this.sprite = scene.add.sprite(x, y, def.sprite, 0).setOrigin(0.5, 0.94).setScale(sc);
    this.sprite.play(def.sprite + '_idle');
    // 이름표
    const nameColor = this.elite ? '#ffcf4a' : '#f4f0ff';
    const label = (this.elite ? '[정예] ' : '') + `Lv.${def.level} ${def.name}`;
    this.nameText = scene.add.text(x, y, label, SR.textStyle(this.elite ? 15 : 12, nameColor)).setOrigin(0.5, 1).setDepth(SR.DEPTH.nameplate);
    this.hpBar = scene.add.graphics().setDepth(SR.DEPTH.nameplate);
    this.hpText = this.elite ? scene.add.text(x, y, '', SR.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(SR.DEPTH.nameplate + 1) : null;
    this.drawHp();

    // 등장 연출
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 400 });
  }

  get height() { return this.sprite.displayHeight; }

  drawHp() {
    const g = this.hpBar;
    g.clear();
    const show = this.elite || this.showHpT > 0;
    if (!show || !this.alive) { if (this.hpText) this.hpText.setVisible(false); return; }
    const w = this.elite ? 150 : 56, h = this.elite ? 10 : 6;
    const r = this.hp / this.maxHp;
    g.fillStyle(0x120a18, 0.85).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    g.fillStyle(0x4a1a1a, 1).fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(this.elite ? 0xe8402a : 0xd83a3a, 1).fillRect(-w / 2, -h / 2, Math.max(0, w * r), h);
    g.fillStyle(0xffffff, 0.25).fillRect(-w / 2, -h / 2, Math.max(0, w * r), Math.ceil(h / 3));
    if (this.hpText) this.hpText.setVisible(true).setText(`${SR.util.fmt(this.hp)}/${SR.util.fmt(this.maxHp)}`);
  }

  setState(s, t) { this.state = s; this.stateT = t || 0; }

  knockback(fx, fy, dist) {
    if (this.elite) dist *= 0.3;
    const a = Math.atan2(this.y - fy, this.x - fx);
    const t = 0.15;
    this.slide = { vx: Math.cos(a) * dist / t, vy: Math.sin(a) * dist / t, t };
  }

  applyBurn(mult, ticks, interval) {
    this.burn = { mult, ticks, interval, t: interval };
  }

  // 데미지 받기. info: { crit, deadly, kind }
  takeDamage(amount, info) {
    if (!this.alive) return;
    info = info || {};
    const now = this.scene.time.now;
    if (now - this.lastHitAt < SR.Data.config.combat.stackWindowMs) this.stack = (this.stack + 1) % 7;
    else this.stack = 0;
    this.lastHitAt = now;
    this.hp = Math.max(0, this.hp - amount);
    SR.FX.damage(this.scene, this.x, this.y - this.height * 0.95 - 8, amount, {
      crit: info.crit, deadly: info.deadly, kind: info.kind || 'enemy', stack: this.stack
    });
    if (info.kind !== 'burn') {
      SR.FX.flash(this.scene, this.sprite);
      this.hurtT = 0.14;
      if (!this.elite && !this.slide) this.knockback(this.scene.player.x, this.scene.player.y, 5);
    }
    this.aggro = true;
    this.showHpT = 4;
    if (this.state === 'idle' || this.state === 'wander' || this.state === 'return') this.setState('chase');
    this.drawHp();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.sprite.anims.stop();
    this.sprite.setFrame(5);
    this.nameText.setVisible(false);
    this.hpBar.clear();
    if (this.hpText) this.hpText.setVisible(false);
    SR.Sound.play('die');
    SR.FX.burst(this.scene, this.x, this.y - this.height * 0.4, this.elite ? 0xffd24a : 0xffffff, this.elite ? 40 : 16, this.elite ? 260 : 160, 600);
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow], alpha: 0, duration: 450, delay: 150,
      onComplete: () => this.destroy()
    });
    this.scene.tweens.add({ targets: this.sprite, scaleY: this.sprite.scaleY * 0.6, y: this.sprite.y + 4, duration: 450, delay: 150 });
    this.scene.onMonsterKilled(this);
  }

  destroy() {
    this.sprite.destroy(); this.shadow.destroy(); this.nameText.destroy(); this.hpBar.destroy();
    if (this.hpText) this.hpText.destroy();
    this.destroyed = true;
  }

  update(dt) {
    if (!this.alive) return;
    const scene = this.scene, world = scene.world, player = scene.player;
    const def = this.def;
    this.stateT -= dt;
    this.attackCd = Math.max(0, this.attackCd - dt);
    if (this.specialCd > 0) this.specialCd -= dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.showHpT > 0) { this.showHpT -= dt; if (this.showHpT <= 0) this.drawHp(); }

    // 화상
    if (this.burn) {
      this.burn.t -= dt;
      if (this.burn.t <= 0) {
        this.burn.t = this.burn.interval;
        this.burn.ticks--;
        const dmg = Math.max(1, Math.round(SR.state.stats.atk * this.burn.mult * SR.Combat.mitigation(def.def)));
        SR.FX.burnTick(scene, this.x, this.y - this.height * 0.5);
        if (this.burn.ticks % 2 === 0) SR.FX.fireBurst(scene, this.x, this.y - this.height * 0.5, 0.6);
        if (this.burn.ticks <= 0) this.burn = null;
        this.takeDamage(dmg, { kind: 'burn' });
        if (!this.alive) return;
      }
    }

    if (this.slide) {
      world.move(this, this.slide.vx * dt, this.slide.vy * dt, this.moveRadius);
      this.slide.t -= dt;
      if (this.slide.t <= 0) this.slide = null;
    }

    const pd = SR.util.dist(this.x, this.y, player.x, player.y);
    const homeD = SR.util.dist(this.x, this.y, this.home.x, this.home.y);
    const canTarget = !player.dead && !scene.mapData.safe;
    let moving = false;
    const moveTo = (tx, ty, speed) => {
      const a = Math.atan2(ty - this.y, tx - this.x);
      const sp = speed * dt;
      moving = world.move(this, Math.cos(a) * sp, Math.sin(a) * sp, this.moveRadius);
      this.sprite.setFlipX(tx < this.x);
      return moving;
    };
    const reach = def.attackRange + player.radius;

    switch (this.state) {
      case 'idle':
        if (canTarget && pd < def.aggroRange) { this.setState('chase'); break; }
        if (this.stateT <= 0) {
          this.wanderTarget = world.randomPointNear(this.home.x, this.home.y, 110, this.moveRadius);
          this.setState('wander', 3);
        }
        break;
      case 'wander':
        if (canTarget && pd < def.aggroRange) { this.setState('chase'); break; }
        if (!this.wanderTarget || SR.util.dist(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y) < 6 || this.stateT <= 0) {
          this.setState('idle', SR.util.rand(1, 3));
        } else moveTo(this.wanderTarget.x, this.wanderTarget.y, def.speed * 0.5);
        break;
      case 'chase':
        if (!canTarget) { this.setState('return'); break; }
        if (homeD > SR.Data.config.monsterLeashRange || (!this.aggro && pd > def.aggroRange * 1.6)) { this.setState('return'); break; }
        // 정예 특수기
        if (def.special && this.specialCd <= 0 && pd < def.special.radius * 0.8) { this.startSpecial(); break; }
        if (pd <= reach) {
          this.sprite.setFlipX(player.x < this.x);
          if (this.attackCd <= 0) this.setState('windup', def.windup);
        } else moveTo(player.x, player.y, def.speed);
        break;
      case 'windup':
        this.sprite.setFlipX(player.x < this.x);
        if (this.stateT <= 0) {
          if (!player.dead && SR.util.dist(this.x, this.y, player.x, player.y) <= reach + 24) {
            player.takeDamage(SR.Combat.monsterHit(def.atk, 1, SR.state.stats.def), this);
            SR.FX.hitSpark(scene, player.x, player.y - 40, 0xff8080);
          }
          this.attackCd = def.attackCooldown;
          this.setState('recover', 0.25);
        }
        break;
      case 'special':
        if (this.stateT <= 0) {
          const sp = def.special;
          SR.FX.quake(scene, this.x, this.y, sp.radius);
          SR.Sound.play('quake');
          if (!player.dead && SR.util.dist(this.x, this.y, player.x, player.y) <= sp.radius) {
            player.takeDamage(SR.Combat.monsterHit(def.atk, sp.damageMul, SR.state.stats.def), this);
          }
          this.specialCd = sp.cooldown;
          this.attackCd = def.attackCooldown * 0.6;
          this.setState('recover', 0.6);
        }
        break;
      case 'recover':
        if (this.stateT <= 0) this.setState('chase');
        break;
      case 'return':
        if (homeD < 10) { this.aggro = false; this.hp = this.maxHp; this.drawHp(); this.setState('idle', 1); break; }
        moveTo(this.home.x, this.home.y, def.speed * 1.4);
        // 귀환 중 체력 회복
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * dt);
        if (this.elite) this.drawHp();
        break;
    }

    // 스프라이트 상태
    const s = this.sprite;
    if (this.hurtT > 0) { s.anims.stop(); s.setFrame(5); }
    else if (this.state === 'windup' || this.state === 'special') { s.anims.stop(); s.setFrame(this.stateT > 0.12 ? 0 : 4); if (this.state === 'special') s.setFrame(4); }
    else if (this.state === 'recover') { s.anims.stop(); s.setFrame(4); }
    else {
      const key = def.sprite + (moving ? '_move' : '_idle');
      if (!s.anims.isPlaying || s.anims.currentAnim.key !== key) s.play(key, true);
    }
    this.bob += dt;
    const fly = def.flying ? Math.sin(this.bob * 5) * 4 - 16 : 0;
    s.setPosition(Math.round(this.x), Math.round(this.y + fly));
    s.setDepth(SR.DEPTH.sortBase + this.y);
    this.shadow.setPosition(this.x, this.y);
    const top = this.y + fly - this.height * 0.94;
    this.nameText.setPosition(this.x, top - (this.elite ? 18 : 4));
    if (!this.elite) this.nameText.setVisible(this.showHpT > 0 || scene.target === this || pd < 150);
    this.hpBar.setPosition(this.x, top - (this.elite ? 8 : -2));
    if (this.hpText) this.hpText.setPosition(this.x, top - 8);
    // 예비동작 중 붉게 깜빡
    if (this.state === 'windup' && this.hurtT <= 0) s.setTint(Math.floor(this.stateT * 20) % 2 ? 0xffb0b0 : 0xffffff);
    else if (this.hurtT <= 0 && s.isTinted && s.tintFill === false) s.clearTint();
  }

  startSpecial() {
    const sp = this.def.special;
    this.setState('special', sp.windup);
    SR.FX.telegraph(this.scene, this.x, this.y, sp.radius, sp.windup);
    SR.FX.popText(this.scene, this.x, this.y - this.height - 30, '!', 0xff4040, 5);
    SR.Sound.play('warn');
    this.sprite.setFrame(4);
  }
};
