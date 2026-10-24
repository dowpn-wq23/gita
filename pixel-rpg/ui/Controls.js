// 터치 조작: 좌하단 십자 패드(8방향) + 우하단 공격 버튼/스킬 5개(호 배치)/회피/물약
SR.Controls = class Controls {
  constructor(scene) {
    this.scene = scene;
    const H = scene.scale.height, W = scene.scale.width;

    // ---------------- 십자 패드 ----------------
    this.pad = { cx: 138, cy: H - 132, arm: 54, pointerId: null };
    this.padG = scene.add.graphics();
    this.drawPad(0, 0);
    // 패드 터치 영역 (보이지 않음)
    const zone = scene.add.zone(0, H - 330, 340, 330).setOrigin(0).setInteractive();
    zone.on('pointerdown', p => { this.pad.pointerId = p.id; this.updatePad(p); SR.Sound.unlock(); });
    scene.input.on('pointermove', p => { if (p.id === this.pad.pointerId) this.updatePad(p); });
    const release = p => {
      if (p.id === this.pad.pointerId) { this.pad.pointerId = null; SR.Input.padX = 0; SR.Input.padY = 0; this.drawPad(0, 0); }
      if (p.id === this.attackPointer) { this.attackPointer = null; SR.Input.attackTouch = false; this.atkBtn.setScale(1); }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    scene.input.on('gameout', () => { this.pad.pointerId = null; SR.Input.padX = 0; SR.Input.padY = 0; SR.Input.attackTouch = false; this.drawPad(0, 0); });

    // ---------------- 공격 버튼 ----------------
    const ax = W - 104, ay = H - 108;
    this.atk = { x: ax, y: ay, r: 62 };
    this.attackPointer = null;
    this.atkBtn = scene.add.container(ax, ay);
    const atkBg = scene.add.circle(0, 0, 62, 0x120e20, 0.55).setStrokeStyle(4, 0xe0d4ff, 0.75);
    const atkInner = scene.add.circle(0, 0, 52, 0xffffff, 0.08);
    this.atkIcon = scene.add.image(0, -2, 'icon_attack').setScale(1.05);
    this.atkLabel = scene.add.text(0, 40, '', SR.textStyle(13, '#ffffff')).setOrigin(0.5);
    this.atkBtn.add([atkBg, atkInner, this.atkIcon, this.atkLabel]);
    atkBg.setInteractive(new Phaser.Geom.Circle(62, 62, 62), Phaser.Geom.Circle.Contains);
    atkBg.on('pointerdown', (p, lx, ly, ev) => {
      ev.stopPropagation();
      SR.Sound.unlock();
      this.atkBtn.setScale(0.93);
      if (scene.isTalkMode()) { SR.Input.push({ type: 'interact' }); return; }
      this.attackPointer = p.id;
      SR.Input.attackTouch = true;
    });

    // ---------------- 스킬 5개 (호 배치) ----------------
    const skills = SR.state.cls.skills;
    this.skillBtns = [];
    const arcR = 150, start = 170, end = 270;
    skills.forEach((id, i) => {
      const deg = start + (end - start) * (i / (skills.length - 1 || 1));
      const rad = Phaser.Math.DegToRad(deg);
      const x = ax + Math.cos(rad) * arcR, y = ay + Math.sin(rad) * arcR;
      this.skillBtns.push(this.makeSkillButton(id, i, x, y));
    });

    // ---------------- 회피 / 물약 ----------------
    this.dashBtn = this.makeRoundButton(W - 196, H - 34, 27, 'icon_dash', '회피', () => SR.Input.push({ type: 'dash' }));
    this.potionBtn = this.makeRoundButton(W - 300, H - 40, 26, 'item_potion_red', '', () => SR.Input.push({ type: 'potion' }));
    this.potionCount = scene.add.text(W - 280, H - 22, '', SR.textStyle(13, '#ffffff')).setOrigin(1, 1);

    // PC 단축키 안내
    this.keyHints = scene.add.text(W - 8, H - 18, '', SR.textStyle(10, '#bdb6d6')).setOrigin(1, 1).setAlpha(0.8);
    if (!scene.sys.game.device.input.touch) this.keyHints.setText('');
  }

  drawPad(dx, dy) {
    const { cx, cy, arm } = this.pad;
    const g = this.padG;
    g.clear();
    g.fillStyle(0x000000, 0.18).fillCircle(cx, cy, arm * 2.15);
    const a = arm, half = a / 2;
    const arms = [
      { x: cx - half, y: cy - half - a, on: dy < 0, dir: 'up' },
      { x: cx - half, y: cy + half, on: dy > 0, dir: 'down' },
      { x: cx - half - a, y: cy - half, on: dx < 0, dir: 'left' },
      { x: cx + half, y: cy - half, on: dx > 0, dir: 'right' }
    ];
    g.fillStyle(0xffffff, 0.16).fillRect(cx - half, cy - half, a, a);
    arms.forEach(r => {
      g.fillStyle(0x0c0914, 0.35).fillRect(r.x - 2, r.y - 2, a + 4, a + 4);
      g.fillStyle(0xffffff, r.on ? 0.5 : 0.2).fillRect(r.x, r.y, a, a);
      // 화살표
      const mx = r.x + a / 2, my = r.y + a / 2, s = 11;
      g.fillStyle(0xffffff, r.on ? 0.95 : 0.6);
      if (r.dir === 'up') g.fillTriangle(mx, my - s, mx - s, my + s * 0.6, mx + s, my + s * 0.6);
      if (r.dir === 'down') g.fillTriangle(mx, my + s, mx - s, my - s * 0.6, mx + s, my - s * 0.6);
      if (r.dir === 'left') g.fillTriangle(mx - s, my, mx + s * 0.6, my - s, mx + s * 0.6, my + s);
      if (r.dir === 'right') g.fillTriangle(mx + s, my, mx - s * 0.6, my - s, mx - s * 0.6, my + s);
    });
    g.fillStyle(0xffffff, 0.3).fillCircle(cx, cy, 8);
  }

  updatePad(p) {
    const { cx, cy } = this.pad;
    const dx = p.x - cx, dy = p.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < 14) { SR.Input.padX = 0; SR.Input.padY = 0; this.drawPad(0, 0); return; }
    // 8방향으로 스냅
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    let x = Math.round(Math.cos(ang) * 100) / 100, y = Math.round(Math.sin(ang) * 100) / 100;
    SR.Input.padX = x; SR.Input.padY = y;
    this.drawPad(Math.abs(x) > 0.3 ? Math.sign(x) : 0, Math.abs(y) > 0.3 ? Math.sign(y) : 0);
  }

  makeRoundButton(x, y, r, icon, label, onPress) {
    const s = this.scene;
    const c = s.add.container(x, y);
    const bg = s.add.circle(0, 0, r, 0x120e20, 0.6).setStrokeStyle(3, 0xbfe9ff, 0.7);
    const img = s.add.image(0, label ? -3 : 0, icon).setScale(r / 30);
    const cd = s.add.graphics();
    const t = s.add.text(0, r - 6, label, SR.textStyle(11, '#ffffff')).setOrigin(0.5);
    c.add([bg, img, cd, t]);
    bg.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    bg.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); SR.Sound.unlock(); c.setScale(0.9); onPress(); });
    bg.on('pointerup', () => c.setScale(1));
    bg.on('pointerout', () => c.setScale(1));
    return { c, bg, img, cd, t, r };
  }

  makeSkillButton(id, index, x, y) {
    const s = this.scene, sk = SR.Data.skills[id];
    const r = 31;
    const c = s.add.container(x, y);
    const bg = s.add.circle(0, 0, r, 0x120e20, 0.7).setStrokeStyle(3, 0xffcf4a, 0.85);
    const iconMask = s.add.graphics().fillCircle(x, y, r - 3).setVisible(false);
    const img = s.add.image(0, 0, sk.icon).setScale(1.05);
    img.setMask(iconMask.createGeometryMask());
    const dim = s.add.graphics();
    const lv = s.add.text(0, r - 2, '', SR.textStyle(12, '#ffffff', { strokeThickness: 3 })).setOrigin(0.5, 0.5);
    const cdText = s.add.text(0, -2, '', SR.textStyle(20, '#ffffff', { strokeThickness: 4 })).setOrigin(0.5);
    const lock = s.add.image(0, -4, 'icon_lock').setScale(0.8).setVisible(false);
    const key = s.add.text(-r + 2, -r + 2, String(index + 1), SR.textStyle(11, '#d9d2ff')).setOrigin(0, 0);
    const cost = sk.chargeCost ? s.add.image(r - 6, -r + 8, 'diamond', 0).setScale(0.5) : null;
    c.add([bg, img, dim, lock, cdText, lv, key]);
    if (cost) c.add(cost);
    bg.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    bg.on('pointerdown', (p, lx, ly, ev) => {
      ev.stopPropagation();
      SR.Sound.unlock();
      c.setScale(0.9);
      if (SR.state.skillLevel(id) <= 0) {
        SR.log(`[${sk.name}] 캐릭터 Lv.${sk.reqLevel}부터 습득 가능 — 메뉴 > 스킬에서 배우세요.`, '#ff9a7a');
        SR.Sound.play('error');
        return;
      }
      SR.Input.push({ type: 'skill', index });
    });
    bg.on('pointerup', () => c.setScale(1));
    bg.on('pointerout', () => c.setScale(1));
    return { id, sk, c, bg, img, dim, lv, cdText, lock, r, cost };
  }

  update() {
    const st = SR.state;
    // 공격 버튼: NPC 근처면 "대화" 모드
    const talk = this.scene.isTalkMode();
    this.atkIcon.setTexture(talk ? 'icon_talk' : 'icon_attack').setScale(talk ? 1.8 : 1.05);
    this.atkLabel.setText(talk ? '대화' : '');

    this.skillBtns.forEach(b => {
      const lv = st.skillLevel(b.id);
      const rem = SR.Skills.remaining(b.id);
      const g = b.dim;
      g.clear();
      b.lv.setText(lv > 0 ? `LV${lv}` : `Lv.${b.sk.reqLevel}`);
      if (lv <= 0) {
        g.fillStyle(0x000000, 0.65).fillCircle(0, 0, b.r - 2);
        b.lock.setVisible(true); b.cdText.setText('');
        b.lv.setColor('#ff9a7a');
        return;
      }
      b.lock.setVisible(false);
      b.lv.setColor('#ffffff');
      const lacksMp = st.mp < SR.Skills.mpCost(b.sk, lv);
      const lacksCharge = b.sk.chargeCost && st.charge < b.sk.chargeCost;
      if (rem > 0) {
        // 남은 쿨타임 비율만큼 어둡게 (부채꼴)
        const ratio = rem / b.sk.cooldown;
        g.fillStyle(0x000000, 0.62);
        g.slice(0, 0, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false).fillPath();
        g.fillStyle(0x000000, 0.25).fillCircle(0, 0, b.r - 2);
        b.cdText.setText(rem >= 1 ? String(Math.ceil(rem)) : rem.toFixed(1));
      } else {
        b.cdText.setText('');
        if (lacksMp || lacksCharge) g.fillStyle(0x10204a, 0.55).fillCircle(0, 0, b.r - 2);
      }
      if (b.cost) b.cost.setFrame(st.charge >= b.sk.chargeCost ? 0 : 1);
    });

    // 회피 쿨타임
    const p = SR.gameScene && SR.gameScene.player;
    const dcd = p ? p.dashCd : 0;
    const dg = this.dashBtn.cd;
    dg.clear();
    if (dcd > 0) {
      dg.fillStyle(0x000000, 0.55);
      dg.slice(0, 0, this.dashBtn.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (dcd / SR.Data.config.dash.cooldown), false).fillPath();
    }
    const n = st.count('potion_hp_s') + st.count('potion_hp_m');
    this.potionCount.setText(String(n));
    this.potionBtn.img.setAlpha(n > 0 ? 1 : 0.35);
  }
};
