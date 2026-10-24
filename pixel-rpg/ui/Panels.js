// 창(패널) 기반 클래스. 열려 있는 동안 월드는 일시정지되고 조작 입력이 막힌다.
SR.Panel = class Panel {
  constructor(scene, w, h, title, opts) {
    opts = opts || {};
    this.scene = scene;
    const W = scene.scale.width, H = scene.scale.height;
    this.w = w; this.h = h;
    this.x = Math.round(opts.x != null ? opts.x : (W - w) / 2);
    this.y = Math.round(opts.y != null ? opts.y : (H - h) / 2 - 6);
    this.root = scene.add.container(0, 0).setDepth(100).setVisible(false);
    this.dim = scene.add.rectangle(0, 0, W, H, 0x05030a, opts.dimAlpha != null ? opts.dimAlpha : 0.55).setOrigin(0).setInteractive();
    let downOnDim = false;
    this.dim.on('pointerdown', () => { downOnDim = true; });
    this.dim.on('pointerup', () => { if (downOnDim && !opts.modal) this.close(); downOnDim = false; });
    // 창 본체가 클릭을 먹도록 (뒤의 dim 으로 새지 않게)
    this.body = scene.add.rectangle(this.x, this.y, w, h, 0x000000, 0.001).setOrigin(0).setInteractive();
    this.frame = SR.UI.frame(scene, this.x, this.y, w, h);
    this.root.add([this.dim, this.body, this.frame]);
    if (title) {
      const tb = scene.add.rectangle(this.x + 2, this.y + 2, w - 4, 36, SR.UI.COLORS.title).setOrigin(0);
      const tt = scene.add.text(this.x + 16, this.y + 20, title, SR.textStyle(18, '#ffe9a8')).setOrigin(0, 0.5);
      this.titleText = tt;
      this.root.add([tb, tt]);
    }
    if (!opts.noClose) {
      const cb = scene.add.rectangle(this.x + w - 34, this.y + 5, 30, 30, 0x8a2a3a).setOrigin(0).setStrokeStyle(2, 0x0c0914).setInteractive({ useHandCursor: true });
      const cx = scene.add.text(this.x + w - 19, this.y + 20, '✕', SR.textStyle(16, '#ffffff')).setOrigin(0.5);
      cb.on('pointerup', (p, lx, ly, ev) => { ev.stopPropagation(); SR.Sound.play('click'); this.close(); });
      this.root.add([cb, cx]);
    }
    this.isOpen = false;
  }

  add(objs) {
    (Array.isArray(objs) ? objs : [objs]).forEach(o => this.root.add(o.container || o));
    return objs;
  }
  text(x, y, str, size, color, extra) {
    const t = this.scene.add.text(this.x + x, this.y + y, str, SR.textStyle(size || 14, color || '#ffffff', extra));
    this.root.add(t);
    return t;
  }
  button(x, y, w, h, label, onClick, opts) {
    const b = SR.UI.button(this.scene, this.x + x, this.y + y, w, h, label, onClick, opts);
    this.root.add(b.container);
    return b;
  }

  open(arg) {
    this.isOpen = true;
    this.root.setVisible(true);
    this.onOpen(arg);
    this.refresh();
    this.root.setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 120 });
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.setVisible(false);
    this.onClose();
    this.scene.onPanelClosed(this);
  }
  onOpen() {}
  onClose() {}
  refresh() {}
  update() {}
};
