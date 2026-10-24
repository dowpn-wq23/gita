// UI 공용 위젯: 픽셀 테두리 창, 버튼, 게이지 바, 아이템 슬롯
SR.UI = {
  COLORS: {
    panel: 0x1d1830, panelLight: 0x2c2547, border: 0x8a78c8, borderDark: 0x0c0914, title: 0x3b2f66,
    btn: 0x3e5aa8, btnHover: 0x4f6fc4, btnDown: 0x2d4280, btnDisabled: 0x3a3a48, gold: 0xffcf4a
  },

  // 픽셀 느낌의 이중 테두리 창
  frame(scene, x, y, w, h, opts) {
    opts = opts || {};
    const C = this.COLORS;
    const g = scene.add.graphics();
    g.fillStyle(C.borderDark, 1).fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle(opts.border || C.border, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(opts.fill != null ? opts.fill : C.panel, opts.alpha != null ? opts.alpha : 0.97).fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle(0xffffff, 0.06).fillRect(x + 2, y + 2, w - 4, 2);
    // 모서리 장식
    g.fillStyle(opts.border || C.border, 1);
    [[x - 5, y - 5], [x + w - 1, y - 5], [x - 5, y + h - 1], [x + w - 1, y + h - 1]].forEach(([cx, cy]) => g.fillRect(cx, cy, 6, 6));
    return g;
  },

  // 버튼: { container, setLabel, setEnabled, bg, text }
  button(scene, x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const C = this.COLORS;
    const base = opts.color != null ? opts.color : C.btn;
    const cont = scene.add.container(x, y);
    const shadow = scene.add.rectangle(2, 3, w, h, 0x000000, 0.5).setOrigin(0);
    const bg = scene.add.rectangle(0, 0, w, h, base).setOrigin(0).setStrokeStyle(2, 0x0c0914);
    const hl = scene.add.rectangle(2, 2, w - 4, 3, 0xffffff, 0.22).setOrigin(0);
    const text = scene.add.text(w / 2, h / 2, label, SR.textStyle(opts.fontSize || 15, opts.textColor || '#ffffff')).setOrigin(0.5);
    cont.add([shadow, bg, hl, text]);
    let enabled = opts.enabled !== false;
    const paint = (state) => {
      if (!enabled) { bg.setFillStyle(C.btnDisabled); text.setColor('#8a8698'); return; }
      text.setColor(opts.textColor || '#ffffff');
      bg.setFillStyle(state === 'down' ? Phaser.Display.Color.ValueToColor(base).darken(25).color
        : state === 'hover' ? Phaser.Display.Color.ValueToColor(base).lighten(12).color : base);
    };
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => paint('hover'));
    bg.on('pointerout', () => paint('normal'));
    bg.on('pointerdown', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); paint('down'); });
    bg.on('pointerup', (p, lx, ly, ev) => {
      if (ev) ev.stopPropagation();
      paint('hover');
      if (!enabled) { SR.Sound.play('error'); return; }
      SR.Sound.play('click');
      if (onClick) onClick();
    });
    paint('normal');
    return {
      container: cont, bg, text,
      setLabel(s) { text.setText(s); return this; },
      setEnabled(v) { enabled = v; paint('normal'); return this; },
      setVisible(v) { cont.setVisible(v); return this; },
      destroy() { cont.destroy(); }
    };
  },

  // 게이지 바
  bar(scene, x, y, w, h, color, opts) {
    opts = opts || {};
    const g = scene.add.graphics();
    const text = opts.text === false ? null : scene.add.text(x + w / 2, y + h / 2, '', SR.textStyle(opts.fontSize || 12, '#ffffff')).setOrigin(0.5);
    const api = {
      g, text, ratio: 1, shown: 1,
      set(ratio, label) {
        this.ratio = SR.util.clamp(ratio, 0, 1);
        if (text && label != null) text.setText(label);
      },
      draw(dt) {
        // 감소 시 흰 잔상
        this.shown = this.shown > this.ratio ? Math.max(this.ratio, this.shown - (dt || 0.016) * 0.8) : this.ratio;
        g.clear();
        g.fillStyle(0x0c0914, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
        g.fillStyle(opts.back || 0x2a2236, 1).fillRect(x, y, w, h);
        g.fillStyle(0xffffff, 0.55).fillRect(x, y, Math.round(w * this.shown), h);
        g.fillStyle(color, 1).fillRect(x, y, Math.round(w * this.ratio), h);
        g.fillStyle(0xffffff, 0.28).fillRect(x, y, Math.round(w * this.ratio), Math.max(2, Math.floor(h / 3)));
        g.fillStyle(0x000000, 0.25).fillRect(x, y + h - 2, Math.round(w * this.ratio), 2);
      },
      setVisible(v) { g.setVisible(v); if (text) text.setVisible(v); }
    };
    api.draw();
    return api;
  },

  // 아이템 슬롯 (아이콘 + 수량). onClick(slotIndex)
  slot(scene, x, y, size, onClick) {
    const cont = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, size, size, 0x141022).setOrigin(0).setStrokeStyle(2, 0x4a3f72);
    const icon = scene.add.image(size / 2, size / 2, 'px').setVisible(false);
    const qty = scene.add.text(size - 4, size - 2, '', SR.textStyle(12, '#ffffff')).setOrigin(1, 1);
    const sel = scene.add.rectangle(0, 0, size, size).setOrigin(0).setStrokeStyle(3, 0xffcf4a).setVisible(false);
    const tag = scene.add.text(3, 1, '', SR.textStyle(10, '#7dff8a')).setOrigin(0, 0);
    cont.add([bg, icon, qty, tag, sel]);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => { if (onClick) { SR.Sound.play('click'); onClick(); } });
    return {
      container: cont, bg, icon, qty, sel, tag,
      set(itemId, n, label) {
        if (!itemId) { icon.setVisible(false); qty.setText(''); tag.setText(''); bg.setStrokeStyle(2, 0x4a3f72); return; }
        const it = SR.Data.items[itemId];
        icon.setTexture(it.icon).setVisible(true).setScale(Math.min(1, (size - 8) / 42));
        qty.setText(n > 1 ? String(n) : '');
        tag.setText(label || '');
        const rc = Phaser.Display.Color.HexStringToColor(SR.RARITY_COLOR[it.rarity] || '#4a3f72').color;
        bg.setStrokeStyle(2, it.rarity === 'common' ? 0x4a3f72 : rc);
      },
      select(v) { sel.setVisible(v); }
    };
  },

  // 아이템 능력치 설명 줄
  statLines(it) {
    const names = { atk: '공격력', def: '방어력', maxHp: '최대 HP', maxMp: '최대 MP', crit: '치명타 확률', critDmg: '치명 피해', deadly: 'DEADLY 확률' };
    const pct = { crit: 1, deadly: 1, critDmg: 1 };
    return Object.entries(it.stats || {}).map(([k, v]) => `${names[k] || k} +${pct[k] ? Math.round(v * 100) + '%' : v}`);
  },

  itemTypeLabel(it) {
    if (it.type === 'equipment') return { weapon: '무기', armor: '방어구', accessory: '장신구' }[it.slot] + (it.reqLevel ? ` · Lv.${it.reqLevel} 이상` : '');
    return { consumable: '소비', material: '재료' }[it.type] || '';
  }
};
