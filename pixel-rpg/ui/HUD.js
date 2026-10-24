// HUD: 좌상단 캐릭터 정보, 상단 중앙 타겟, 우상단 메뉴 아이콘, 하단 경험치 바, 우측 골드 알림
SR.HUD = class HUD {
  constructor(scene) {
    this.scene = scene;
    const W = scene.scale.width, H = scene.scale.height;

    // ---------- 좌상단: 초상화 + 레벨 + HP/MP + 기(氣) ----------
    const pf = scene.add.graphics();
    pf.fillStyle(0x0c0914, 1).fillRect(6, 6, 80, 80);
    pf.fillStyle(0xc9a24a, 1).fillRect(8, 8, 76, 76);
    pf.fillStyle(0x0c0914, 1).fillRect(10, 10, 72, 72);
    this.portrait = scene.add.image(10, 10, SR.state.cls.portrait).setOrigin(0);
    const badge = scene.add.graphics();
    badge.fillStyle(0x0c0914, 1).fillCircle(20, 80, 17);
    badge.fillStyle(0xe0b84a, 1).fillCircle(20, 80, 15);
    badge.fillStyle(0x8a5a1a, 1).fillCircle(20, 80, 12);
    this.levelText = scene.add.text(20, 81, '1', SR.textStyle(15, '#fff6d0')).setOrigin(0.5);
    this.className = scene.add.text(96, 6, '', SR.textStyle(12, '#cfc6e6'));

    this.hpBar = SR.UI.bar(scene, 96, 24, 250, 18, 0xd8343f, { back: 0x3a1418, fontSize: 13 });
    this.mpBar = SR.UI.bar(scene, 96, 48, 196, 13, 0x3a7ae0, { back: 0x14203a, fontSize: 11 });
    this.diamond = scene.add.image(312, 54, 'diamond', 1).setScale(0.75);
    this.chargeText = scene.add.text(326, 55, '0/6', SR.textStyle(14, '#9ff6ff')).setOrigin(0, 0.5);

    // 버프 아이콘 줄
    this.buffIcons = [];
    for (let i = 0; i < 8; i++) {
      const x = 96 + i * 32, y = 68;
      const icon = scene.add.image(x, y, 'buff_exp').setOrigin(0).setScale(0.9).setVisible(false);
      const t = scene.add.text(x + 28, y + 28, '', SR.textStyle(10, '#ffffff')).setOrigin(1, 1).setVisible(false);
      const v = scene.add.text(x + 13, y + 30, '', SR.textStyle(10, '#bff0ff')).setOrigin(0.5, 0).setVisible(false);
      icon.setInteractive();
      icon.on('pointerdown', () => { const b = this.buffIcons[i].buff; if (b) SR.log(this.buffDesc(b), '#bff0ff'); });
      this.buffIcons.push({ icon, t, v, buff: null });
    }

    // ---------- 상단 중앙: 타겟 ----------
    const tx = W / 2 - 190, ty = 6;
    this.targetCont = scene.add.container(0, 0);
    const tf = SR.UI.frame(scene, tx, ty, 380, 56, { alpha: 0.85 });
    const tp = scene.add.rectangle(tx + 6, ty + 6, 44, 44, 0x0c0914).setOrigin(0).setStrokeStyle(2, 0x8a78c8);
    this.targetMask = scene.add.graphics().fillRect(tx + 7, ty + 7, 42, 42).setVisible(false);
    this.targetPortrait = scene.add.sprite(tx + 28, ty + 50, 'mon_jelly', 0).setOrigin(0.5, 1);
    this.targetPortrait.setMask(this.targetMask.createGeometryMask());
    this.targetName = scene.add.text(tx + 58, ty + 6, '', SR.textStyle(14, '#ffffff'));
    this.targetBar = SR.UI.bar(scene, tx + 58, ty + 30, 310, 16, 0xe8402a, { back: 0x3a1418, fontSize: 12 });
    this.targetCont.add([tf, tp, this.targetPortrait, this.targetName, this.targetBar.g, this.targetBar.text]);
    this.targetCont.setVisible(false);
    this.lastTarget = null;

    // ---------- 우상단: 아이콘 5개 ----------
    const icons = [
      { key: 'icon_event', label: '이벤트', panel: 'event' },
      { key: 'icon_shop', label: '상점', panel: 'supply' },
      { key: 'icon_map', label: '지도', panel: 'map' },
      { key: 'icon_bag', label: '가방', panel: 'inventory' },
      { key: 'icon_menu', label: '메뉴', panel: 'menu' }
    ];
    this.menuIcons = {};
    icons.forEach((ic, i) => {
      const cx = W - 8 - (icons.length - i) * 60 + 30, cy = 30;
      const bg = scene.add.circle(cx, cy, 25, 0x120e20, 0.6).setStrokeStyle(2, 0x8a78c8, 0.8);
      const img = scene.add.image(cx, cy, ic.key).setScale(0.82);
      const lbl = scene.add.text(cx, cy + 30, ic.label, SR.textStyle(12, '#f4f0ff')).setOrigin(0.5, 0);
      const dot = scene.add.circle(cx + 18, cy - 18, 6, 0xff4040).setStrokeStyle(2, 0x0c0914).setVisible(false);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); img.setScale(0.72); });
      bg.on('pointerout', () => img.setScale(0.82));
      bg.on('pointerup', (p, lx, ly, ev) => { ev.stopPropagation(); img.setScale(0.82); SR.Sound.play('click'); scene.openPanel(ic.panel); });
      this.menuIcons[ic.panel] = { bg, img, lbl, dot };
    });
    this.mapName = scene.add.text(W - 10, 82, '', SR.textStyle(13, '#bfe9ff')).setOrigin(1, 0);
    this.goldText = scene.add.text(W - 10, 100, '', SR.textStyle(13, '#ffe08a')).setOrigin(1, 0);

    // 아이콘 아래 채팅 버튼 (싱글이므로 메시지 기록창을 펼친다)
    const chx = W - 38, chy = 146;
    this.chatBtn = scene.add.circle(chx, chy, 20, 0x120e20, 0.6).setStrokeStyle(2, 0x8a78c8, 0.8);
    this.chatIcon = scene.add.image(chx, chy - 2, 'icon_talk').setScale(0.62);
    this.chatLabel = scene.add.text(chx, chy + 22, '채팅', SR.textStyle(11, '#f4f0ff')).setOrigin(0.5, 0);
    this.chatBtn.setInteractive({ useHandCursor: true });
    this.chatBtn.on('pointerup', (p, lx, ly, ev) => { ev.stopPropagation(); SR.Sound.play('click'); scene.msgLog.toggle(); });

    // ---------- 우측: 골드/아이템 획득 알림 ----------
    this.notices = [];

    // ---------- 하단: 경험치 바 ----------
    this.expG = scene.add.graphics();
    this.expText = scene.add.text(W / 2, H - 6, '', SR.textStyle(12, '#fff6d0')).setOrigin(0.5);
    this.expLv = scene.add.text(8, H - 6, '', SR.textStyle(11, '#ffe08a')).setOrigin(0, 0.5);

    // 지역 이름 배너
    this.banner = scene.add.text(W / 2, 120, '', SR.textStyle(30, '#ffffff', { strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
    this.bannerSub = scene.add.text(W / 2, 156, '', SR.textStyle(14, '#bfe9ff')).setOrigin(0.5).setAlpha(0);
  }

  buffDesc(b) {
    const def = SR.Data.buffs[b.id];
    const parts = [];
    if (b.stats.expPct) parts.push(`경험치 +${Math.round(b.stats.expPct * 100)}%`);
    if (b.stats.crit) parts.push(`치명타 +${Math.round(b.stats.crit * 100)}%`);
    if (b.stats.atkPct) parts.push(`공격력 +${Math.round(b.stats.atkPct * 100)}%`);
    const time = b.duration < 0 ? (def.maxLevel ? `Lv.${def.maxLevel}까지` : '영구') : `${Math.ceil(b.remaining)}초 남음`;
    return `[${def.name}] ${parts.join(', ')} (${time})`;
  }

  // 버프 아이콘 아래 짧은 수치 (원작처럼 +20% 등)
  buffShort(b) {
    const st = b.stats || {};
    if (st.expPct) return `+${Math.round(st.expPct * 100)}%`;
    if (st.atkPct) return `+${Math.round(st.atkPct * 100)}%`;
    if (st.crit) return `+${Math.round(st.crit * 100)}`;
    return '';
  }

  showBanner(name, sub) {
    this.banner.setText(name).setAlpha(0).setScale(0.8);
    this.bannerSub.setText(sub || '').setAlpha(0);
    this.scene.tweens.killTweensOf([this.banner, this.bannerSub]);
    this.scene.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 1, scale: 1, duration: 300 });
    this.scene.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 0, delay: 2000, duration: 600 });
  }

  // 우측 "OOO 골드" 획득 알림
  notice(text, color, iconKey) {
    const W = this.scene.scale.width;
    const y0 = 200;
    const cont = this.scene.add.container(W + 10, y0);
    const bg = this.scene.add.rectangle(0, 0, 200, 28, 0x0c0914, 0.6).setOrigin(1, 0.5);
    const icon = this.scene.add.image(-172, 0, iconKey || 'icon_gold').setScale(iconKey && iconKey !== 'icon_gold' ? 0.55 : 1);
    const t = this.scene.add.text(-12, 0, text, SR.textStyle(15, color || '#ffe08a')).setOrigin(1, 0.5);
    bg.setSize(Math.max(140, t.width + 50), 28);
    icon.x = -bg.width + 16;
    cont.add([bg, icon, t]);
    this.notices.unshift(cont);
    this.notices.forEach((c, i) => this.scene.tweens.add({ targets: c, y: y0 + i * 32, duration: 150 }));
    this.scene.tweens.add({ targets: cont, x: W - 8, duration: 200, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: cont, alpha: 0, x: W + 40, delay: 1800, duration: 350,
      onComplete: () => { cont.destroy(); this.notices = this.notices.filter(c => c !== cont); }
    });
    if (this.notices.length > 5) { const old = this.notices.pop(); old.destroy(); }
  }

  update(dt) {
    const st = SR.state, s = st.stats;
    const W = this.scene.scale.width, H = this.scene.scale.height;
    this.levelText.setText(String(st.level));
    this.className.setText(`${st.cls.name}  ·  전투력 ${SR.util.fmt(st.power)}`);
    this.hpBar.set(st.hp / s.maxHp, `${SR.util.fmt(Math.ceil(st.hp))}/${SR.util.fmt(s.maxHp)}`);
    this.mpBar.set(st.mp / s.maxMp, `${SR.util.fmt(Math.floor(st.mp))}/${SR.util.fmt(s.maxMp)}`);
    this.hpBar.draw(dt); this.mpBar.draw(dt);
    const max = SR.Data.config.charge.max;
    this.diamond.setFrame(st.charge > 0 ? 0 : 1);
    this.chargeText.setText(`${st.charge}/${max}`);
    if (st.charge >= max) this.diamond.setScale(0.75 + Math.sin(this.scene.time.now * 0.012) * 0.08);
    else this.diamond.setScale(0.75);

    // 버프
    this.buffIcons.forEach((b, i) => {
      const bf = st.buffs[i];
      b.buff = bf || null;
      if (!bf) { b.icon.setVisible(false); b.t.setVisible(false); b.v.setVisible(false); return; }
      b.v.setVisible(true).setText(this.buffShort(bf));
      const def = SR.Data.buffs[bf.id];
      b.icon.setTexture(def.icon).setVisible(true);
      b.t.setVisible(true).setText(bf.duration < 0 ? '' : SR.util.formatTime(bf.remaining));
      b.icon.setAlpha(bf.duration > 0 && bf.remaining < 5 ? 0.5 + Math.sin(this.scene.time.now * 0.02) * 0.5 : 1);
    });

    // 타겟
    const gs = SR.gameScene;
    const tg = gs && gs.target && gs.target.alive ? gs.target : null;
    if (tg) {
      if (tg !== this.lastTarget) {
        this.targetPortrait.setTexture(tg.def.sprite, 0);
        const fh = this.targetPortrait.frame.height, fw = this.targetPortrait.frame.width;
        const sc = Math.min(1, 52 / fh, 52 / fw) * (tg.elite ? 1.15 : 1);
        this.targetPortrait.setScale(sc);
        this.targetName.setText((tg.elite ? '[정예] ' : '') + `Lv.${tg.level} ${tg.name}`).setColor(tg.elite ? '#ffcf4a' : '#ffffff');
        this.targetBar.shown = tg.hp / tg.maxHp;
      }
      this.targetBar.set(tg.hp / tg.maxHp, `${SR.util.fmt(tg.hp)}/${SR.util.fmt(tg.maxHp)}`);
      this.targetBar.draw(dt);
      this.targetCont.setVisible(true);
    } else this.targetCont.setVisible(false);
    this.lastTarget = tg;

    // 이벤트 알림 점
    this.menuIcons.event.dot.setVisible(st.lastDailyClaim !== SR.util.todayKey());
    this.menuIcons.menu.dot.setVisible(st.skillPoints > 0);
    this.goldText.setText(`${SR.util.fmt(st.gold)} 골드`);

    // 경험치 바
    const pct = st.expPercent();
    const g = this.expG;
    g.clear();
    g.fillStyle(0x0c0914, 1).fillRect(0, H - 12, W, 12);
    g.fillStyle(0x2a2236, 1).fillRect(2, H - 10, W - 4, 8);
    g.fillStyle(0x8fd14f, 1).fillRect(2, H - 10, Math.round((W - 4) * pct / 100), 8);
    g.fillStyle(0xffffff, 0.3).fillRect(2, H - 10, Math.round((W - 4) * pct / 100), 2);
    for (let i = 1; i < 10; i++) g.fillStyle(0x0c0914, 0.5).fillRect(Math.round(W * i / 10), H - 10, 1, 8);
    this.expText.setText(`${pct.toFixed(3)}%`);
    this.expLv.setText(`Lv.${st.level}  EXP ${SR.util.fmt(st.exp)}/${SR.util.fmt(st.expToNext())}`);
  }
};
