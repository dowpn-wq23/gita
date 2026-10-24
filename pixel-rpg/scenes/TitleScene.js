// 타이틀: 이어하기 / 새로 시작 → 직업 선택 (1단계는 무도가만 선택 가능)
SR.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const cfg = SR.Data.config;
    // 배경: 물결 + 별
    this.add.tileSprite(0, 0, W, H, 'water_dark').setOrigin(0).setAlpha(0.9);
    this.bgGlint = this.add.tileSprite(0, 0, W, H, 'water_glint').setOrigin(0);
    const g = this.add.graphics();
    g.fillGradientStyle(0x0b0812, 0x0b0812, 0x1d3f6b, 0x1d3f6b, 0.95, 0.95, 0.2, 0.2).fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const s = this.add.rectangle(Math.random() * W, Math.random() * H * 0.6, 3, 3, 0xffffff, Math.random() * 0.8 + 0.2);
      this.tweens.add({ targets: s, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 + Math.random() * 1500 });
    }
    // 유적 기둥 실루엣
    [120, 260, 1020, 1160].forEach((x, i) => this.add.image(x, H - 40 + (i % 2) * 20, i % 2 ? 'pillar_broken_dark' : 'pillar_dark').setOrigin(0.5, 1).setScale(1.4).setTint(0x8090c0));
    this.add.image(W / 2 - 170, H - 70, 'player_monk', 2 * 11 + 6).setOrigin(0.5, 1).setScale(2);
    const pet = this.add.sprite(W / 2 - 250, H - 170, 'pet_star').setScale(1.5).play('pet_star_fly');
    this.tweens.add({ targets: pet, y: pet.y - 10, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    this.add.image(W / 2 + 190, H - 70, 'mon_bogkeeper', 4).setOrigin(0.5, 1).setScale(1.3).setFlipX(true);

    const title = this.add.text(W / 2, 110, cfg.title, SR.textStyle(66, '#ffe9a8', { strokeThickness: 10, stroke: '#2a1640' })).setOrigin(0.5);
    this.add.text(W / 2, 168, cfg.subtitle.toUpperCase(), SR.textStyle(18, '#9ff0ff', { strokeThickness: 4 })).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 104, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.InOut' });

    const save = SR.Save.load();
    const bx = W / 2 - 120;
    let y = 236;
    if (save) {
      const mapName = (SR.Data.maps[save.position && save.position.map] || {}).name || '';
      SR.UI.button(this, bx, y, 240, 52, '이어하기', () => this.startGame(save), { color: 0x3a8a5a, fontSize: 20 });
      this.add.text(W / 2, y + 62, `Lv.${save.level} ${SR.Data.classes[save.classId].name} · ${mapName}`, SR.textStyle(13, '#cfc6e6')).setOrigin(0.5);
      y += 92;
    }
    SR.UI.button(this, bx, y, 240, 52, '새로 시작', () => {
      if (save) this.confirmNew(); else this.showClassSelect();
    }, { fontSize: 20 });
    this.add.text(W / 2, H - 16, '오프라인 싱글플레이 · 진행 상황은 이 브라우저에 자동 저장됩니다', SR.textStyle(12, '#8f88aa')).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => { if (save) this.startGame(save); else this.showClassSelect(); });
    this.input.on('pointerdown', () => SR.Sound.unlock());
  }

  update(t) { this.bgGlint.tilePositionX = t * 0.02; }

  confirmNew() {
    const W = this.scale.width, H = this.scale.height;
    const layer = this.add.container(0, 0).setDepth(50);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const f = SR.UI.frame(this, W / 2 - 220, H / 2 - 80, 440, 160);
    const t = this.add.text(W / 2, H / 2 - 40, '저장된 진행 상황이 삭제됩니다.\n새로 시작할까요?', SR.textStyle(16, '#ffffff', { align: 'center' })).setOrigin(0.5);
    const yes = SR.UI.button(this, W / 2 - 170, H / 2 + 20, 150, 42, '새로 시작', () => { SR.Save.clear(); layer.destroy(); this.showClassSelect(); }, { color: 0x8a2a3a });
    const no = SR.UI.button(this, W / 2 + 20, H / 2 + 20, 150, 42, '취소', () => layer.destroy(), { color: 0x5a4a7a });
    layer.add([dim, f, t, yes.container, no.container]);
  }

  showClassSelect() {
    const W = this.scale.width, H = this.scale.height;
    const layer = this.add.container(0, 0).setDepth(60);
    const dim = this.add.rectangle(0, 0, W, H, 0x05030a, 0.85).setOrigin(0).setInteractive();
    layer.add(dim);
    layer.add(this.add.text(W / 2, 60, '직업 선택', SR.textStyle(30, '#ffe9a8')).setOrigin(0.5));
    const ids = Object.keys(SR.Data.classes);
    ids.forEach((id, i) => {
      const c = SR.Data.classes[id];
      const x = W / 2 - (ids.length * 270) / 2 + i * 270 + 10;
      const f = SR.UI.frame(this, x, 110, 250, 340, { border: c.implemented ? 0xc9a24a : 0x4a4460 });
      layer.add(f);
      if (this.textures.exists(c.sprite)) layer.add(this.add.image(x + 125, 270, c.sprite, 0).setScale(2).setOrigin(0.5, 1));
      else layer.add(this.add.text(x + 125, 215, '?', SR.textStyle(80, '#4a4460')).setOrigin(0.5));
      layer.add(this.add.text(x + 125, 290, c.name, SR.textStyle(22, c.implemented ? '#ffffff' : '#7a7490')).setOrigin(0.5));
      layer.add(this.add.text(x + 16, 320, c.description, SR.textStyle(12, c.implemented ? '#cfc6e6' : '#6a6480', { wordWrap: { width: 218 }, lineSpacing: 4 })));
      const b = SR.UI.button(this, x + 25, 392, 200, 44, c.implemented ? '이 직업으로 시작' : '준비 중', () => this.newGame(id), { enabled: c.implemented, color: 0x3a8a5a });
      layer.add(b.container);
    });
  }

  newGame(classId) {
    SR.Skills.cooldowns = {};
    SR.state = new SR.PlayerState(classId);
    SR.state.addGold(100);
    this.launch();
  }

  startGame(save) {
    try {
      SR.state = SR.PlayerState.fromSave(save);
    } catch (e) {
      console.warn('세이브 복원 실패, 새로 시작', e);
      SR.state = new SR.PlayerState(SR.Data.config.startClass);
    }
    SR.Skills.cooldowns = {};
    this.launch();
  }

  launch() {
    SR.Sound.unlock();
    SR.Sound.setEnabled(SR.state.settings.sound !== false);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { map: SR.state.position.map });
      this.scene.launch('UI');
    });
  }
};
