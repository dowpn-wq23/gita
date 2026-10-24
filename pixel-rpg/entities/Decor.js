// 맵 장식 오브젝트: 발밑(footprint)은 통행 불가, 스프라이트는 발 위치 기준으로 Y 정렬되어
// 캐릭터가 기둥 뒤로 돌아가면 가려지는 쿼터뷰 느낌을 낸다.
SR.Decor = {
  // w,h: 점유 타일 수 (좌상단 기준), light: 광원 색
  TYPES: {
    tree: { w: 1, h: 1, tex: 'tree' },
    pillar: { w: 1, h: 1, tex: 'pillar', texDark: 'pillar_dark' },
    pillar_broken: { w: 1, h: 1, tex: 'pillar_broken', texDark: 'pillar_broken_dark' },
    torch: { w: 1, h: 1, tex: 'brazier', light: 0xff9a3a, flame: true },
    crate: { w: 1, h: 1, tex: 'crate' },
    lamp: { w: 1, h: 1, tex: 'lamp', light: 0xffe08a },
    signpost: { w: 1, h: 1, tex: 'signpost' },
    statue: { w: 2, h: 1, tex: 'statue' },
    altar: { w: 2, h: 1, tex: 'altar', anim: 'altar_glow', light: 0x5ff0ff },
    house: { w: 4, h: 3, tex: 'house', variants: true },
    fountain: { w: 3, h: 2, tex: 'fountain', anim: 'fountain_flow' },
    well: { w: 2, h: 2, tex: 'well' }
  },

  create(scene, d, theme) {
    const t = this.TYPES[d.type];
    if (!t) { console.warn('알 수 없는 장식', d.type); return null; }
    const T = SR.Data.config.tileSize;
    const footprint = [];
    for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) footprint.push([d.x + i, d.y + j]);
    const cx = (d.x + t.w / 2) * T;
    const by = (d.y + t.h) * T - 6;
    const key = theme && t.texDark ? t.texDark : t.tex;
    const frame = t.variants ? (d.variant || 0) : 0;
    const spr = scene.add.sprite(cx, by, key, t.variants || t.anim ? frame : undefined).setOrigin(0.5, 1)
      .setScale(SR.Assets.scaleOf(key)).setDepth(SR.DEPTH.sortBase + by);
    if (t.anim) spr.play(t.anim);
    const objs = [spr];
    if (t.flame) {
      const f = scene.add.sprite(cx, by - spr.displayHeight + 14, 'flame', 0).setOrigin(0.5, 1).setDepth(SR.DEPTH.sortBase + by + 1);
      f.play({ key: 'flame_burn', startFrame: Math.floor(Math.random() * 4) });
      objs.push(f);
    }
    if (t.light) {
      const ly = t.flame ? by - spr.displayHeight + 4 : by - spr.displayHeight * 0.75;
      const g = scene.add.image(cx, ly, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(t.light)
        .setScale(theme ? 2.4 : 1.8).setAlpha(theme ? 0.4 : 0.28).setDepth(SR.DEPTH.overhead - 2);
      scene.tweens.add({ targets: g, alpha: g.alpha * 0.7, scale: g.scale * 0.94, yoyo: true, repeat: -1, duration: 260 + Math.random() * 200 });
      objs.push(g);
    }
    if (d.type === 'fountain') {
      const e = scene.add.particles(cx, by - 108, 'px', {
        speedX: { min: -70, max: 70 }, speedY: { min: -120, max: -40 }, gravityY: 300, lifespan: 600,
        scale: { start: 1.5, end: 0.5 }, tint: [0xbfe9ff, 0xffffff], alpha: { start: 0.9, end: 0 }, frequency: 40
      }).setDepth(SR.DEPTH.sortBase + by + 1);
      objs.push(e);
    }
    return { type: d.type, footprint, objs, x: cx, y: by };
  }
};
