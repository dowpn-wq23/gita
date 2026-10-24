// 상점: 좌측 구매 목록, 우측 내 가방에서 판매
SR.ShopPanel = class ShopPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 940, 496, '상점');
    this.shopId = null;
    this.goldText = this.text(this.w - 52, 20, '', 15, '#ffe08a').setOrigin(1, 0.5);
    // ---- 구매 목록 ----
    this.text(18, 46, '구매', 15, '#ffe9a8');
    this.rows = [];
    for (let i = 0; i < 10; i++) {
      const y = 70 + i * 40;
      const bg = scene.add.rectangle(this.x + 14, this.y + y, 470, 36, i % 2 ? 0x161226 : 0x1b162e).setOrigin(0).setInteractive();
      const icon = scene.add.image(this.x + 34, this.y + y + 18, 'px').setScale(0.75);
      this.add([bg, icon]);
      const name = this.text(56, y + 9, '', 14, '#ffffff');
      const price = this.text(330, y + 9, '', 13, '#ffe08a').setOrigin(1, 0);
      const b1 = this.button(342, y + 4, 62, 28, '1개', () => this.buy(i, 1), { fontSize: 13 });
      const b10 = this.button(410, y + 4, 66, 28, '10개', () => this.buy(i, 10), { fontSize: 13, color: 0x3a7a5a });
      bg.on('pointerup', () => { this.descIndex = i; this.refresh(); });
      this.rows.push({ bg, icon, name, price, b1, b10 });
    }
    this.desc = this.text(18, 474, '', 12, '#cfc6e6');
    this.descIndex = -1;

    // ---- 판매 (내 가방) ----
    const sx = 506;
    this.text(sx, 46, '판매 (내 가방)', 15, '#ffe9a8');
    this.slots = [];
    const size = 52, gap = 5;
    for (let i = 0; i < SR.Data.config.inventorySlots; i++) {
      const c = i % 6, r = Math.floor(i / 6);
      const s = SR.UI.slot(scene, this.x + sx + c * (size + gap), this.y + 70 + r * (size + gap), size, () => { this.sel = i; this.refresh(); });
      this.add(s);
      this.slots.push(s);
    }
    this.sel = -1;
    const dy = 70 + 5 * (size + gap) + 6;
    this.sellName = this.text(sx, dy, '', 14, '#ffffff');
    this.sellInfo = this.text(sx, dy + 22, '', 12, '#bdb6d6', { wordWrap: { width: 410 } });
    this.sell1 = this.button(sx, dy + 64, 120, 32, '1개 판매', () => this.sell(1), { color: 0x8a5a2a });
    this.sellAll = this.button(sx + 130, dy + 64, 120, 32, '모두 판매', () => this.sell(Infinity), { color: 0x8a5a2a });
    this.sellJunk = this.button(sx + 260, dy + 64, 160, 32, '재료 일괄 판매', () => this.sellMaterials(), { color: 0x6a4a8a });
  }

  onOpen(shopId) {
    this.shopId = shopId || 'general_store';
    const shop = SR.Data.npcs.shops[this.shopId];
    this.titleText.setText(shop.name);
    this.items = shop.items.slice(0, 10);
    this.sel = -1; this.descIndex = -1;
  }

  buy(i, n) {
    const id = this.items[i];
    if (!id) return;
    const it = SR.Data.items[id], st = SR.state;
    if (it.type === 'equipment') n = 1;
    const cost = it.price * n;
    if (st.gold < cost) { SR.log('골드가 부족합니다.', '#ff9a7a'); SR.Sound.play('error'); return; }
    if (!st.canFit(id, n)) { SR.log('가방 공간이 부족합니다.', '#ff9a7a'); SR.Sound.play('error'); return; }
    st.addGold(-cost);
    st.addItem(id, n);
    SR.log(`${it.name}${n > 1 ? ' x' + n : ''} 구매 (-${SR.util.fmt(cost)} 골드)`, '#bff0ff');
    SR.Sound.play('buy');
    SR.bus.emit('shopTrade');
    this.refresh();
  }

  sell(n) {
    const st = SR.state, s = st.inventory[this.sel];
    if (!s) return;
    const it = SR.Data.items[s.id];
    const count = Math.min(n, s.qty);
    st.removeAt(this.sel, count);
    const gain = it.sell * count;
    st.addGold(gain);
    SR.log(`${it.name}${count > 1 ? ' x' + count : ''} 판매 (+${SR.util.fmt(gain)} 골드)`, '#ffe08a');
    SR.Sound.play('coin');
    SR.bus.emit('shopTrade');
    if (!st.inventory[this.sel]) this.sel = -1;
    this.refresh();
  }

  sellMaterials() {
    const st = SR.state;
    let total = 0, n = 0;
    st.inventory.forEach((s, i) => {
      if (s && SR.Data.items[s.id].type === 'material') { total += SR.Data.items[s.id].sell * s.qty; n += s.qty; st.inventory[i] = null; }
    });
    if (!n) { SR.log('판매할 재료가 없습니다.', '#a9a4bf'); return; }
    SR.bus.emit('inventory');
    st.addGold(total);
    SR.log(`재료 ${n}개 일괄 판매 (+${SR.util.fmt(total)} 골드)`, '#ffe08a');
    SR.Sound.play('coin');
    SR.bus.emit('shopTrade');
    this.sel = -1;
    this.refresh();
  }

  refresh() {
    if (!this.isOpen) return;
    const st = SR.state;
    this.goldText.setText(`보유 ${SR.util.fmt(st.gold)} 골드`);
    this.rows.forEach((r, i) => {
      const id = this.items[i];
      const vis = !!id;
      [r.bg, r.icon, r.name, r.price].forEach(o => o.setVisible(vis));
      r.b1.setVisible(vis); r.b10.setVisible(vis);
      if (!vis) return;
      const it = SR.Data.items[id];
      r.icon.setTexture(it.icon);
      const owned = st.count(id);
      r.name.setText(it.name + (it.reqLevel && it.type === 'equipment' ? ` (Lv.${it.reqLevel})` : '') + (owned ? `  [${owned}]` : '')).setColor(SR.RARITY_COLOR[it.rarity]);
      r.price.setText(SR.util.fmt(it.price) + ' G');
      r.b1.setEnabled(st.gold >= it.price);
      r.b10.setVisible(it.type !== 'equipment');
      r.b10.setEnabled(st.gold >= it.price * 10);
      r.bg.setStrokeStyle(this.descIndex === i ? 2 : 0, 0xffcf4a);
    });
    const di = this.items[this.descIndex];
    this.desc.setText(di ? `${SR.Data.items[di].name}: ${SR.Data.items[di].desc} ${SR.UI.statLines(SR.Data.items[di]).join(', ')}` : '목록을 누르면 설명이 표시됩니다.');

    this.slots.forEach((sl, i) => {
      const s = st.inventory[i];
      sl.set(s ? s.id : null, s ? s.qty : 0);
      sl.select(this.sel === i);
    });
    const s = st.inventory[this.sel];
    if (s) {
      const it = SR.Data.items[s.id];
      this.sellName.setText(`${it.name}${s.qty > 1 ? ' x' + s.qty : ''}`).setColor(SR.RARITY_COLOR[it.rarity]);
      this.sellInfo.setText(`개당 ${SR.util.fmt(it.sell)} 골드 · 전부 팔면 ${SR.util.fmt(it.sell * s.qty)} 골드\n${it.desc}`);
    } else {
      this.sellName.setText('판매할 아이템을 선택하세요').setColor('#8f88aa');
      this.sellInfo.setText('장착 중인 장비는 가방에서 해제한 뒤 판매할 수 있습니다.');
    }
    this.sell1.setEnabled(!!s);
    this.sellAll.setEnabled(!!s && s.qty > 1);
  }
};
