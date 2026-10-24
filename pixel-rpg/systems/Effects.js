// 전투 연출 모음: 데미지 숫자, 타격 스파크, 충격파, 화염, 레벨업 등
SR.FX = {
  // ------------------------------------------------------------
  // 데미지 숫자 (픽셀 비트맵 폰트, 다단 히트 시 위로 쌓임)
  // opts: { crit, deadly, kind: 'enemy' | 'player' | 'heal' | 'burn', stack }
  // ------------------------------------------------------------
  damage(scene, x, y, amount, opts) {
    opts = opts || {};
    const kind = opts.kind || 'enemy';
    let scale = 4, tint = 0xfff4d0;
    if (kind === 'player') { scale = 3; tint = 0xff5a5a; }
    else if (kind === 'heal') { scale = 3; tint = 0x7dff8a; }
    else if (kind === 'burn') { scale = 3; tint = 0xff9a3a; }
    if (opts.crit) { scale = 5; tint = 0xffa23a; }
    if (opts.deadly) { scale = 6; tint = 0xff4fd8; }
    const stack = opts.stack || 0;
    const lineH = 9 * 3.2;
    const yy = y - stack * lineH;
    const xx = x + (stack % 2 ? 10 : -6) * (stack ? 1 : 0);
    const text = (kind === 'heal' ? '+' : '') + amount;
    const t = scene.add.bitmapText(xx, yy, 'pixelfont', text).setOrigin(0.5).setTint(tint).setDepth(SR.DEPTH.damage + stack);
    t.setScale(scale * 0.4);
    const objs = [t];
    let label = null;
    if (opts.deadly) label = scene.add.bitmapText(xx, yy - scale * 9 * 0.75, 'pixelfont', 'DEADLY!').setTint(0xff7ae6);
    else if (opts.crit) label = scene.add.bitmapText(xx, yy - scale * 9 * 0.72, 'pixelfont', 'CRITICAL!').setTint(0xffd24a);
    if (label) {
      label.setOrigin(0.5).setDepth(SR.DEPTH.damage + 50 + stack).setScale(opts.deadly ? 2 : 1.5);
      objs.push(label);
      scene.tweens.add({ targets: label, scale: opts.deadly ? 4 : 3, duration: 140, ease: 'Back.Out' });
      if (opts.deadly) scene.tweens.add({ targets: label, x: label.x + 3, yoyo: true, repeat: 5, duration: 30 });
    }
    scene.tweens.add({ targets: t, scale, duration: 130, ease: 'Back.Out' });
    scene.tweens.add({
      targets: objs, y: '-=' + (kind === 'player' ? 30 : 46), delay: 120, duration: 650, ease: 'Cubic.Out'
    });
    scene.tweens.add({
      targets: objs, alpha: 0, delay: opts.deadly ? 820 : 620, duration: 260,
      onComplete: () => objs.forEach(o => o.destroy())
    });
  },

  // 화면 위 짧은 문구 (MISS, 기 부족 등)
  popText(scene, x, y, str, tint, scale) {
    const t = scene.add.bitmapText(x, y, 'pixelfont', str).setOrigin(0.5).setTint(tint || 0xffffff).setScale(scale || 2).setDepth(SR.DEPTH.damage);
    scene.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  },

  // 화면 전체를 살짝 밝히는 플래시 (카메라 flash 는 너무 강해서 별도 구현)
  softFlash(scene, color, alpha, duration) {
    const cam = scene.cameras.main;
    const r = scene.add.rectangle(0, 0, cam.width, cam.height, color || 0xffffff, alpha || 0.3)
      .setOrigin(0).setScrollFactor(0).setDepth(SR.DEPTH.damage - 10);
    scene.tweens.add({ targets: r, alpha: 0, duration: duration || 200, onComplete: () => r.destroy() });
  },

  // 화염 폭발 (열화각 타격, 화상 등)
  fireBurst(scene, x, y, size) {
    size = size || 1;
    const s = scene.add.sprite(x, y, 'spark', 0).setDepth(SR.DEPTH.overhead).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff8a2a).setScale(2 * size).setRotation(Math.random() * Math.PI);
    s.play('spark_burst');
    s.once('animationcomplete', () => s.destroy());
    this.impact(scene, x, y, 0xff6a2a, 0.9 * size);
    const e = scene.add.particles(x, y, 'flame_p', {
      speed: { min: 60, max: 170 * size }, angle: { min: 0, max: 360 }, lifespan: { min: 220, max: 380 },
      scale: { start: 1.6 * size, end: 0.3 }, color: [0xfff3b0, 0xffa23a, 0xe0452a], emitting: false
    }).setDepth(SR.DEPTH.overhead);
    e.explode(10);
    const g = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a2a).setScale(0.9 * size).setAlpha(0.6).setDepth(SR.DEPTH.overhead - 1);
    scene.tweens.add({ targets: g, alpha: 0, scale: 1.4 * size, duration: 300, onComplete: () => g.destroy() });
    scene.time.delayedCall(500, () => e.destroy());
  },

  hitSpark(scene, x, y, tint, scale) {
    const s = scene.add.sprite(x + SR.util.rand(-8, 8), y + SR.util.rand(-8, 8), 'spark', 0)
      .setDepth(SR.DEPTH.overhead).setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.random() * Math.PI)
      .setScale(scale || 1);
    if (tint) s.setTint(tint);
    s.play('spark_burst');
    s.once('animationcomplete', () => s.destroy());
  },

  impact(scene, x, y, color, size) {
    const r = scene.add.image(x, y, 'ring').setDepth(SR.DEPTH.overhead).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color || 0xffffff).setScale(0.15);
    scene.tweens.add({ targets: r, scale: size || 0.7, alpha: 0, duration: 220, ease: 'Cubic.Out', onComplete: () => r.destroy() });
  },

  fist(scene, x, y, angle) {
    const f = scene.add.image(x, y, 'fist_fx').setDepth(SR.DEPTH.overhead).setRotation(angle).setAlpha(0.95).setScale(0.8);
    scene.tweens.add({ targets: f, scale: 1.4, alpha: 0, duration: 140, onComplete: () => f.destroy() });
  },

  // 지면 충격파 (쿼터뷰라 세로를 눌러서 표시)
  shockwave(scene, x, y, radius, color, duration, thick) {
    const s = radius * 2 / 96;
    const r = scene.add.image(x, y, 'ring').setDepth(SR.DEPTH.decal + 1).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color || 0xffffff).setScale(s * 0.2, s * 0.2 * 0.55);
    scene.tweens.add({ targets: r, scaleX: s, scaleY: s * 0.55, alpha: { from: 1, to: 0 }, duration: duration || 380, ease: 'Cubic.Out', onComplete: () => r.destroy() });
    if (thick) {
      const d = scene.add.image(x, y, 'disc').setDepth(SR.DEPTH.decal).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(color || 0xffffff).setScale(s * 0.3, s * 0.3 * 0.55).setAlpha(0.6);
      scene.tweens.add({ targets: d, scaleX: s, scaleY: s * 0.55, alpha: 0, duration: (duration || 380) * 0.8, onComplete: () => d.destroy() });
    }
  },

  // 정예 몬스터 강공격 예고 원 (duration 후 사라짐)
  telegraph(scene, x, y, radius, duration) {
    const s = radius * 2 / 96;
    const d = scene.add.image(x, y, 'disc').setDepth(SR.DEPTH.decal).setTint(0xff3030).setAlpha(0.18).setScale(s, s * 0.55);
    const ring = scene.add.image(x, y, 'ring').setDepth(SR.DEPTH.decal).setTint(0xff5050).setAlpha(0.9).setScale(s, s * 0.55);
    const fill = scene.add.image(x, y, 'disc').setDepth(SR.DEPTH.decal).setTint(0xff6040).setAlpha(0.35).setScale(0.01, 0.01 * 0.55);
    scene.tweens.add({ targets: fill, scaleX: s, scaleY: s * 0.55, duration: duration * 1000, ease: 'Linear' });
    scene.tweens.add({ targets: [d, ring], alpha: { from: 0.9, to: 0.3 }, yoyo: true, repeat: -1, duration: 180 });
    const objs = [d, ring, fill];
    scene.time.delayedCall(duration * 1000, () => objs.forEach(o => o.destroy()));
    return objs;
  },

  dust(scene, x, y, n) {
    for (let i = 0; i < (n || 3); i++) {
      const d = scene.add.sprite(x + SR.util.rand(-14, 14), y + SR.util.rand(-4, 4), 'dust', 0).setDepth(SR.DEPTH.decal + 2).setAlpha(0.8);
      d.play('dust_puff');
      scene.tweens.add({ targets: d, y: d.y - 10, x: d.x + SR.util.rand(-10, 10), duration: 300 });
      d.once('animationcomplete', () => d.destroy());
    }
  },

  burst(scene, x, y, tint, count, speed, life, texture) {
    const e = scene.add.particles(x, y, texture || 'px', {
      speed: { min: (speed || 160) * 0.4, max: speed || 160 }, angle: { min: 0, max: 360 },
      lifespan: life || 500, scale: { start: 2.5, end: 0 }, tint: tint || 0xffffff,
      blendMode: 'ADD', emitting: false, gravityY: 0
    }).setDepth(SR.DEPTH.overhead);
    e.explode(count || 14);
    scene.time.delayedCall((life || 500) + 100, () => e.destroy());
  },

  // 화염 부채꼴 (열화각)
  flameCone(scene, x, y, angle, range, arc) {
    const deg = Phaser.Math.RadToDeg(angle);
    const e = scene.add.particles(x, y, 'flame_p', {
      speed: { min: range * 1.4, max: range * 2.1 },
      angle: { min: deg - arc / 2, max: deg + arc / 2 },
      lifespan: { min: 260, max: 420 },
      scale: { start: 1.6, end: 2.6 },
      alpha: { start: 0.9, end: 0 },
      color: [0xffe08a, 0xff9a3a, 0xe0452a, 0x5a1010],
      emitting: false
    }).setDepth(SR.DEPTH.overhead);
    for (let i = 0; i < 6; i++) scene.time.delayedCall(i * 45, () => e.active && e.explode(9));
    const glow = scene.add.image(x + Math.cos(angle) * range * 0.5, y + Math.sin(angle) * range * 0.5, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a2a).setScale(range / 60, range / 95).setAlpha(0.45).setDepth(SR.DEPTH.overhead - 1);
    scene.tweens.add({ targets: glow, alpha: 0, duration: 500, onComplete: () => glow.destroy() });
    scene.time.delayedCall(1000, () => e.destroy());
  },

  // 몸에 붙는 화상 불꽃
  burnTick(scene, x, y) {
    const e = scene.add.particles(x, y, 'flame_p', {
      speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 }, lifespan: 380,
      scale: { start: 1.8, end: 0 }, color: [0xffd24a, 0xff5a2a], blendMode: 'ADD', emitting: false
    }).setDepth(SR.DEPTH.overhead);
    e.explode(6);
    scene.time.delayedCall(500, () => e.destroy());
  },

  // 선풍각: 회전하는 초승달 + 충격파
  whirl(scene, target, radius) {
    const s = radius * 2 / 96;
    [0, Math.PI].forEach(off => {
      const c = scene.add.image(target.x, target.y - 20, 'crescent').setDepth(SR.DEPTH.overhead).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xbfe9ff).setScale(s, s * 0.6).setRotation(off).setAlpha(0.9);
      scene.tweens.add({
        targets: c, rotation: off + Math.PI * 4, alpha: 0, duration: 420,
        onUpdate: () => { c.x = target.x; c.y = target.y - 20; }, onComplete: () => c.destroy()
      });
    });
    this.shockwave(scene, target.x, target.y, radius, 0xbfe9ff, 420, true);
    this.dust(scene, target.x, target.y, 5);
  },

  // 천붕격: 화면 흔들림 + 큰 충격파 + 파편
  quake(scene, x, y, radius) {
    scene.cameras.main.shake(260, 0.012);
    this.softFlash(scene, 0xfff0c8, 0.28, 220);
    this.shockwave(scene, x, y, radius, 0xffe08a, 450, true);
    scene.time.delayedCall(90, () => this.shockwave(scene, x, y, radius * 1.25, 0x5ff0ff, 500));
    const e = scene.add.particles(x, y, 'px', {
      speed: { min: 120, max: 320 }, angle: { min: 200, max: 340 }, gravityY: 700, lifespan: 700,
      scale: { start: 3, end: 1 }, tint: [0x8a7a5a, 0x6a5a3a, 0xc9b88a], emitting: false
    }).setDepth(SR.DEPTH.overhead);
    e.explode(30);
    scene.time.delayedCall(900, () => e.destroy());
    const p = scene.add.image(x, y - 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe08a).setScale(radius / 40, radius / 70).setDepth(SR.DEPTH.overhead - 1);
    scene.tweens.add({ targets: p, alpha: 0, duration: 450, onComplete: () => p.destroy() });
    this.dust(scene, x, y, 8);
  },

  // 연환권 잔상 주먹
  flurry(scene, x, y, angle, range) {
    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 55, () => {
        const d = SR.util.rand(range * 0.35, range * 0.85);
        const a = angle + SR.util.rand(-0.35, 0.35);
        this.fist(scene, x + Math.cos(a) * d, y - 24 + Math.sin(a) * d * 0.7, a);
      });
    }
  },

  aura(scene, x, y) {
    const r = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb347).setScale(1.6, 2.2).setDepth(SR.DEPTH.overhead - 1);
    scene.tweens.add({ targets: r, alpha: 0, scaleX: 2.6, scaleY: 3.2, duration: 600, onComplete: () => r.destroy() });
    this.shockwave(scene, x, y, 120, 0xffb347, 500, true);
    this.burst(scene, x, y - 30, 0xffd24a, 24, 220, 600);
  },

  levelUp(scene, player) {
    const x = player.x, y = player.y;
    const beam = scene.add.image(x, y + 8, 'beam').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2, 1.4).setAlpha(0).setDepth(SR.DEPTH.overhead);
    scene.tweens.add({ targets: beam, alpha: 1, scaleX: 1.6, duration: 220, yoyo: true, hold: 500, onComplete: () => beam.destroy() });
    this.shockwave(scene, x, y, 140, 0xffe08a, 600, true);
    scene.time.delayedCall(150, () => this.shockwave(scene, x, y, 180, 0xffffff, 600));
    const e = scene.add.particles(x, y, 'px', {
      x: { min: -40, max: 40 }, speedY: { min: -220, max: -80 }, speedX: { min: -20, max: 20 },
      lifespan: 1000, scale: { start: 2.5, end: 0 }, tint: [0xffe08a, 0xffffff, 0x8fe8ff], blendMode: 'ADD', frequency: 25, quantity: 2
    }).setDepth(SR.DEPTH.overhead);
    scene.time.delayedCall(700, () => e.stop());
    scene.time.delayedCall(1800, () => e.destroy());
    const t = scene.add.bitmapText(x, y - 110, 'pixelfont', 'LEVEL UP!').setOrigin(0.5).setTint(0xffe066).setScale(2).setDepth(SR.DEPTH.damage + 100);
    scene.tweens.add({ targets: t, scale: 5, duration: 260, ease: 'Back.Out' });
    scene.tweens.add({ targets: t, y: y - 150, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() });
    this.softFlash(scene, 0xfff5c8, 0.35, 350);
  },

  heal(scene, x, y, tint) {
    const e = scene.add.particles(x, y, 'px', {
      x: { min: -22, max: 22 }, speedY: { min: -120, max: -40 }, lifespan: 700, scale: { start: 2.5, end: 0 },
      tint: tint || [0x7dff8a, 0xd9ffd9], blendMode: 'ADD', emitting: false
    }).setDepth(SR.DEPTH.overhead);
    e.explode(22);
    scene.time.delayedCall(900, () => e.destroy());
  },

  afterimage(scene, sprite, tint) {
    const g = scene.add.sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY).setFlipX(sprite.flipX).setScale(sprite.scaleX, sprite.scaleY)
      .setTintFill(tint || 0x8fe8ff).setAlpha(0.55).setDepth(sprite.depth - 1);
    scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  },

  // 피격 흰색 번쩍임
  flash(scene, sprite, color) {
    if (!sprite.active) return;
    sprite.setTintFill(color || 0xffffff);
    scene.time.delayedCall(70, () => { if (sprite.active) sprite.clearTint(); });
  }
};
