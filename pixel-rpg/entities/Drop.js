// 바닥에 떨어진 아이템. 가까이 가면 빨려와서 자동 획득.
SR.Drop = class Drop {
  constructor(scene, itemId, qty, x, y) {
    this.scene = scene;
    this.itemId = itemId;
    this.qty = qty || 1;
    const it = SR.Data.items[itemId];
    this.x = x + SR.util.rand(-40, 40);
    this.y = y + SR.util.rand(-16, 24);
    this.age = 0;
    this.collected = false;
    this.fullWarned = false;
    const color = Phaser.Display.Color.HexStringToColor(SR.RARITY_COLOR[it.rarity] || '#ffffff').color;
    this.glow = scene.add.image(this.x, this.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setScale(0.5, 0.3).setAlpha(0.5)
      .setDepth(SR.DEPTH.decal);
    this.sprite = scene.add.image(x, y - 20, it.icon).setOrigin(0.5, 1).setScale(0.8).setDepth(SR.DEPTH.sortBase + this.y);
    // 튀어나오는 포물선
    scene.tweens.add({ targets: this.sprite, x: this.x, duration: 500, ease: 'Linear' });
    scene.tweens.add({ targets: this.sprite, y: this.y - 70, duration: 230, ease: 'Quad.Out', yoyo: false,
      onComplete: () => scene.tweens.add({ targets: this.sprite, y: this.y, duration: 270, ease: 'Bounce.Out' }) });
  }

  update(dt, player) {
    if (this.collected) return;
    this.age += dt;
    this.glow.setAlpha(0.35 + Math.sin(this.age * 5) * 0.15);
    if (this.age > 90) { this.remove(); return; }
    if (this.age < 0.6 || player.dead) return;
    const d = SR.util.dist(this.x, this.y, player.x, player.y);
    if (d < SR.Data.config.pickupRadius) {
      if (!SR.state.canFit(this.itemId, this.qty)) {
        if (!this.fullWarned) { this.fullWarned = true; SR.log('가방이 가득 차서 아이템을 주울 수 없습니다.', '#ff9a7a'); }
        return;
      }
      const sp = Math.max(240, 900 - d * 4) * dt;
      const a = Math.atan2(player.y - 30 - this.y, player.x - this.x);
      this.x += Math.cos(a) * sp; this.y += Math.sin(a) * sp;
      this.sprite.setPosition(this.x, this.y);
      this.glow.setPosition(this.x, this.y);
      if (d < 26) this.collect();
    } else {
      this.fullWarned = false;
    }
  }

  collect() {
    const it = SR.Data.items[this.itemId];
    const n = SR.state.addItem(this.itemId, this.qty);
    if (n <= 0) return;
    this.collected = true;
    SR.Sound.play('pickup');
    SR.log(`${it.name}${this.qty > 1 ? ' x' + this.qty : ''} 획득`, SR.RARITY_COLOR[it.rarity] || '#ffffff');
    SR.bus.emit('itemNotice', this.itemId, this.qty);
    this.remove();
  }

  remove() {
    this.collected = true;
    this.scene.tweens.add({ targets: [this.sprite, this.glow], alpha: 0, scale: 0.2, duration: 150, onComplete: () => { this.sprite.destroy(); this.glow.destroy(); } });
  }
};
