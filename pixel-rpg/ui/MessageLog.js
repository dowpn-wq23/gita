// 하단 중앙 시스템 메시지 2줄 (원작 채팅창 자리)
SR.MessageLog = class MessageLog {
  constructor(scene) {
    this.scene = scene;
    const W = scene.scale.width, H = scene.scale.height;
    this.w = 500;
    this.x = W / 2 - this.w / 2 - 40;
    this.y = H - 62;
    this.bg = scene.add.rectangle(this.x, this.y, this.w, 46, 0x07050c, 0.45).setOrigin(0).setStrokeStyle(1, 0x8a78c8, 0.35);
    this.lines = [0, 1].map(i => scene.add.text(this.x + 10, this.y + 5 + i * 20, '', SR.textStyle(13, '#ffffff', { strokeThickness: 3 })));
    this.history = [];
    // 탭하면 최근 기록 펼치기
    this.bg.setInteractive();
    this.expanded = false;
    this.bg.on('pointerup', () => this.toggle());
    this.expandText = scene.add.text(this.x + 10, this.y - 8, '', SR.textStyle(12, '#e8e2ff', { strokeThickness: 3, lineSpacing: 4 })).setOrigin(0, 1).setVisible(false);
    this.expandBg = scene.add.rectangle(this.x, this.y - 4, this.w, 0, 0x07050c, 0.75).setOrigin(0, 1).setVisible(false);
    this.expandBg.setDepth(-1);
  }

  add(text, color) {
    const time = new Date();
    this.history.push({ text, color: color || '#ffffff', t: time });
    if (this.history.length > 60) this.history.shift();
    const last = this.history.slice(-2);
    this.lines.forEach((l, i) => {
      const m = last[i - (2 - last.length)];
      if (m) l.setText(m.text).setColor(m.color); else l.setText('');
    });
    // 새 줄 강조
    const nl = this.lines[last.length - 1] || this.lines[1];
    nl.setAlpha(0.3);
    this.scene.tweens.add({ targets: nl, alpha: 1, duration: 200 });
    if (this.expanded) this.refreshExpanded();
  }

  toggle() {
    this.expanded = !this.expanded;
    this.expandText.setVisible(this.expanded);
    this.expandBg.setVisible(this.expanded);
    if (this.expanded) this.refreshExpanded();
  }

  refreshExpanded() {
    const lines = this.history.slice(-14, -2).map(m => m.text);
    if (!lines.length) lines.push('(이전 메시지 없음)');
    this.expandText.setText(lines.join('\n'));
    this.expandBg.setSize(this.w, this.expandText.height + 10);
  }
};
