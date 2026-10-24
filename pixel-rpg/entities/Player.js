// 플레이어 캐릭터 (화면 표현 + 조작). 수치는 SR.state(PlayerState)에 있다.
SR.Player = class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.radius = 12;
    this.tex = SR.state.cls.sprite;
    const sc = SR.Assets.scaleOf(this.tex);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(SR.DEPTH.shadow).setScale(1.25);
    this.sprite = scene.add.sprite(x, y, this.tex, 0).setOrigin(0.5, 0.95).setScale(sc);
    this.auraGlow = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa63a)
      .setScale(1.1, 1.5).setAlpha(0).setDepth(SR.DEPTH.shadow + 1);

    this.dir = 'down';
    this.facingAngle = Math.PI / 2;
    this.lockT = 0;          // 행동 잠금 (스킬 시전 중 이동 불가)
    this.pose = null;        // 'punchL' | 'punchR' | 'kick' | 'cast' | 'hurt'
    this.poseT = 0;
    this.attackT = 0;        // 다음 기본공격까지
    this.combo = 0;
    this.comboResetT = 0;
    this.hitCounter = 0;     // 기 충전용
    this.dashT = 0; this.dashCd = 0; this.invulnT = 0; this.dashVec = null; this.trailT = 0;
    this.slide = null;       // 짧은 밀림/돌진 { vx, vy, t }
    this.spinT = 0;
    this.jumpY = 0;
    this.combatT = 99;       // 마지막 전투 후 경과 시간
    this.hurtT = 0;
    this.dead = false;
    this.moving = false;
  }

  get stats() { return SR.state.stats; }

  faceTowards(tx, ty) {
    this.facingAngle = Math.atan2(ty - this.y, tx - this.x);
    this.dir = SR.util.dirFromVector(tx - this.x, ty - this.y, this.dir);
  }

  lockFor(sec, pose) {
    this.lockT = Math.max(this.lockT, sec);
    if (pose) this.setPose(pose === 'punch' ? (Math.random() < 0.5 ? 'punchL' : 'punchR') : pose, sec);
    this.combatT = 0;
  }
  setPose(pose, sec) { this.pose = pose; this.poseT = sec; }

  lunge(angle, dist) {
    const t = 0.12;
    this.slide = { vx: Math.cos(angle) * dist / t, vy: Math.sin(angle) * dist / t, t };
  }
  spin(sec) { this.spinT = sec; }
  jumpSlam(sec) {
    this.scene.tweens.add({ targets: this, jumpY: -46, duration: sec * 500, yoyo: true, ease: 'Quad.Out' });
  }

  dash(mv) {
    if (this.dead || this.dashCd > 0) return false;
    const cfg = SR.Data.config.dash;
    let ax = mv.x, ay = mv.y;
    if (Math.abs(ax) < 0.01 && Math.abs(ay) < 0.01) { ax = Math.cos(this.facingAngle); ay = Math.sin(this.facingAngle); }
    const len = Math.hypot(ax, ay) || 1;
    this.dashVec = { x: ax / len, y: ay / len };
    this.facingAngle = Math.atan2(this.dashVec.y, this.dashVec.x);
    this.dir = SR.util.dirFromVector(this.dashVec.x, this.dashVec.y, this.dir);
    this.dashT = cfg.duration;
    this.dashCd = cfg.cooldown;
    this.invulnT = cfg.invulnerable;
    this.lockT = 0; this.pose = null;
    SR.FX.dust(this.scene, this.x, this.y, 4);
    SR.Sound.play('dash');
    return true;
  }

  takeDamage(amount, source) {
    if (this.dead) return;
    if (this.invulnT > 0) { SR.FX.popText(this.scene, this.x, this.y - 90, 'MISS', 0x9fe8ff, 3); return; }
    const st = SR.state;
    st.hp = Math.max(0, st.hp - amount);
    this.combatT = 0;
    SR.FX.damage(this.scene, this.x, this.y - 92, amount, { kind: 'player' });
    SR.FX.flash(this.scene, this.sprite, 0xff4040);
    SR.Sound.play('hurt');
    if (this.lockT <= 0 && this.dashT <= 0) { this.hurtT = 0.15; }
    if (st.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.sprite.anims.stop();
    this.sprite.setFrame(this.frameIndex('down', 9)).setTint(0x8a8aa0);
    this.scene.tweens.add({ targets: this.sprite, angle: -90, duration: 300 });
    SR.Sound.play('die');
    SR.log('쓰러졌습니다…', '#ff7a7a');
    SR.bus.emit('playerDead');
  }

  frameIndex(dir, col) {
    const row = dir === 'up' ? 1 : (dir === 'left' || dir === 'right') ? 2 : 0;
    return row * 11 + col;
  }

  // 기본 공격 1타
  basicAttack(target) {
    const cls = SR.state.cls;
    const combo = cls.basicAttack.combo;
    const i = this.combo % combo.length;
    const last = i === combo.length - 1;
    const pose = last ? 'kick' : (i % 2 === 0 ? 'punchL' : 'punchR');
    const interval = this.stats.attackInterval;
    this.setPose(pose, interval * 0.75);
    this.attackT = interval * (last ? 1.5 : 1);
    this.combo = (this.combo + 1) % combo.length;
    this.comboResetT = 0.9;
    this.combatT = 0;
    if (target) {
      this.faceTowards(target.x, target.y);
      this.lunge(this.facingAngle, last ? 14 : 5);
      this.scene.playerDamage(target, combo[i], { fx: last ? 'kick' : 'punch', basic: true });
      this.hitCounter++;
      if (this.hitCounter >= (cls.basicAttack.chargeEvery || 2)) { this.hitCounter = 0; SR.state.addCharge(1); }
      SR.Sound.play(last ? 'hit' : 'punch');
    } else {
      SR.Sound.play('whoosh');
    }
  }

  update(dt, time) {
    const scene = this.scene, world = scene.world;
    const st = SR.state;
    // 타이머
    this.lockT = Math.max(0, this.lockT - dt);
    this.poseT = Math.max(0, this.poseT - dt);
    if (this.poseT <= 0) this.pose = null;
    this.attackT = Math.max(0, this.attackT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.spinT = Math.max(0, this.spinT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.combatT += dt;
    if (this.comboResetT > 0) { this.comboResetT -= dt; if (this.comboResetT <= 0) this.combo = 0; }

    if (this.dead) { this.syncSprite(); return; }

    // 자연 회복 (전투 이탈 시 3배)
    const ooc = this.combatT > SR.Data.config.combat.outOfCombatSeconds ? 3 : 1;
    st.heal(this.stats.hpRegen * ooc * dt, this.stats.mpRegen * ooc * dt);

    const input = SR.Input;
    const mv = input.move();
    this.moving = false;

    if (this.slide) {
      world.move(this, this.slide.vx * dt, this.slide.vy * dt, this.radius);
      this.slide.t -= dt;
      if (this.slide.t <= 0) this.slide = null;
    }

    if (this.dashT > 0) {
      const cfg = SR.Data.config.dash;
      const sp = cfg.distance / cfg.duration;
      world.move(this, this.dashVec.x * sp * dt, this.dashVec.y * sp * dt, this.radius);
      this.dashT -= dt;
      this.trailT -= dt;
      if (this.trailT <= 0) { this.trailT = 0.03; SR.FX.afterimage(scene, this.sprite); }
    } else if (this.lockT > 0) {
      // 시전 중
    } else if (mv.x || mv.y) {
      const sp = this.stats.moveSpeed * dt;
      world.move(this, mv.x * sp, mv.y * sp, this.radius);
      this.facingAngle = Math.atan2(mv.y, mv.x);
      this.dir = SR.util.dirFromVector(mv.x, mv.y, this.dir);
      this.moving = true;
    } else if (input.attackHeld() && !scene.talkMode) {
      const cls = SR.state.cls;
      const target = scene.pickTarget(cls.basicAttack.acquireRange);
      if (target) {
        const d = SR.util.dist(this.x, this.y, target.x, target.y) - target.bodyRadius;
        if (d > cls.basicAttack.range) {
          // 사거리 밖이면 자동으로 다가감
          const a = Math.atan2(target.y - this.y, target.x - this.x);
          const sp = this.stats.moveSpeed * dt;
          const moved = world.move(this, Math.cos(a) * sp, Math.sin(a) * sp, this.radius);
          this.faceTowards(target.x, target.y);
          this.moving = moved;
        } else if (this.attackT <= 0) {
          this.basicAttack(target);
        }
      } else if (this.attackT <= 0) {
        this.basicAttack(null);
      }
    }
    this.syncSprite(time);
  }

  syncSprite(time) {
    const s = this.sprite;
    const hasAura = SR.state.buffs.some(b => b.id === 'battle_aura');
    this.auraGlow.setPosition(this.x, this.y - 30).setAlpha(hasAura ? 0.35 + Math.sin((time || 0) * 0.008) * 0.12 : 0);
    s.setPosition(Math.round(this.x), Math.round(this.y + this.jumpY));
    this.shadow.setPosition(this.x, this.y).setScale(1.25 * (1 + this.jumpY / 120));
    s.setDepth(SR.DEPTH.sortBase + this.y);
    if (this.invulnT > 0 && this.dashT <= 0) s.setAlpha(0.6); else s.setAlpha(1);
    if (this.dead) return;

    let dir = this.dir;
    if (this.spinT > 0) dir = ['down', 'right', 'up', 'left'][Math.floor(this.spinT * 22) % 4];
    s.setFlipX(dir === 'left');
    const rowKey = dir === 'up' ? 'up' : (dir === 'left' || dir === 'right') ? 'side' : 'down';

    let col = -1;
    if (this.hurtT > 0 && !this.pose) col = 9;
    else if (this.pose) col = { punchL: 6, punchR: 7, kick: 8, cast: 10, hurt: 9 }[this.pose];
    if (col >= 0) {
      s.anims.stop();
      s.setFrame(this.frameIndex(dir, col));
    } else {
      const key = `${this.tex}_${this.moving ? 'walk' : 'idle'}_${rowKey}`;
      if (s.anims.currentAnim == null || s.anims.currentAnim.key !== key || !s.anims.isPlaying) s.play(key, true);
    }
  }

  revive(hpRatio) {
    this.dead = false;
    this.sprite.setAngle(0).clearTint();
    SR.state.hp = Math.max(1, Math.round(SR.state.stats.maxHp * hpRatio));
    SR.state.mp = Math.round(SR.state.stats.maxMp * hpRatio);
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.auraGlow.destroy(); }
};
