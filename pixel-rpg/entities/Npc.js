// 마을 NPC (상점 / 회복 / 안내)
SR.Npc = class Npc {
  constructor(scene, entry) {
    const T = SR.Data.config.tileSize;
    const def = SR.Data.npcs.npcs[entry.id];
    this.scene = scene;
    this.id = entry.id;
    this.def = def;
    this.x = entry.x * T; this.y = entry.y * T;
    this.radius = 16;
    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(SR.DEPTH.shadow).setScale(1.25);
    this.sprite = scene.add.sprite(this.x, this.y, def.sprite, 0).setOrigin(0.5, 0.95).setScale(SR.Assets.scaleOf(def.sprite))
      .setDepth(SR.DEPTH.sortBase + this.y);
    this.sprite.play(def.sprite + '_idle');
    const top = this.y - this.sprite.displayHeight * 0.95;
    this.title = scene.add.text(this.x, top - 20, `[${def.title}]`, SR.textStyle(12, '#8fe8ff')).setOrigin(0.5, 1).setDepth(SR.DEPTH.nameplate);
    this.nameText = scene.add.text(this.x, top - 4, def.name, SR.textStyle(13, '#fff4c2')).setOrigin(0.5, 1).setDepth(SR.DEPTH.nameplate);
    // 말풍선 표시 (가까이 오면)
    this.bubble = scene.add.image(this.x + 22, top - 40, 'icon_talk').setDepth(SR.DEPTH.nameplate).setScale(0.8).setVisible(false);
    scene.tweens.add({ targets: this.bubble, y: this.bubble.y - 5, yoyo: true, repeat: -1, duration: 500 });
  }
  setNear(v) { this.bubble.setVisible(v); }
  destroy() { [this.sprite, this.shadow, this.title, this.nameText, this.bubble].forEach(o => o.destroy()); }
};
