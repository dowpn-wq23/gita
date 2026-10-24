// 따라다니는 펫 (1단계: 따라다니기만)
SR.Pet = class Pet {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.x = player.x - 40; this.y = player.y + 10;
    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(SR.DEPTH.shadow).setScale(0.7).setAlpha(0.7);
    this.sprite = scene.add.sprite(this.x, this.y, 'pet_star', 0).setOrigin(0.5, 1).setScale(SR.Assets.scaleOf('pet_star'));
    this.sprite.play('pet_star_fly');
    this.glow = scene.add.image(this.x, this.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe27a).setScale(0.45).setAlpha(0.35);
    this.name = scene.add.text(this.x, this.y, '꼬마 별빛', SR.textStyle(11, '#fff2a8')).setOrigin(0.5, 1).setDepth(SR.DEPTH.nameplate).setAlpha(0.85);
    this.t = Math.random() * 10;
  }

  update(dt) {
    const p = this.player;
    this.t += dt;
    // 플레이어 등 뒤 + 약간 옆
    const back = p.facingAngle + Math.PI;
    const tx = p.x + Math.cos(back) * 46 + Math.cos(back + Math.PI / 2) * 18;
    const ty = p.y + Math.sin(back) * 30 + 6;
    const d = SR.util.dist(this.x, this.y, tx, ty);
    const k = d > 400 ? 1 : Math.min(1, dt * (d > 120 ? 6 : 3.2));
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    const bob = Math.sin(this.t * 4) * 5;
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y - 26 + bob));
    this.sprite.setFlipX(p.x < this.x);
    this.sprite.setDepth(SR.DEPTH.sortBase + this.y);
    this.shadow.setPosition(this.x, this.y).setScale(0.7 - bob * 0.01);
    this.glow.setPosition(this.sprite.x, this.sprite.y - 20).setDepth(SR.DEPTH.sortBase + this.y - 1);
    this.name.setPosition(this.sprite.x, this.sprite.y - 44);
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.glow.destroy(); this.name.destroy(); }
};
