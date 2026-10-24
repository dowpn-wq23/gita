// 가방: 좌측 캐릭터 능력치 + 장비 3칸, 가운데 인벤토리 6x5, 우측 아이템 상세
SR.InventoryPanel = class InventoryPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 900, 486, '가방 · 캐릭터');
    const st = SR.state;
    // ---- 좌측 능력치 ----
    const pf = scene.add.rectangle(this.x + 16, this.y + 50, 60, 60, 0x0c0914).setOrigin(0).setStrokeStyle(2, 0xc9a24a);
    const pi = scene.add.image(this.x + 18, this.y + 52, st.cls.portrait).setOrigin(0).setScale(56 / 72);
    this.add([pf, pi]);
    this.nameText = this.text(88, 52, '', 16, '#ffe9a8');
    this.powerText = this.text(88, 76, '', 13, '#ffcf4a');
    this.goldTop = this.text(88, 94, '', 13, '#ffe08a');
    this.statTexts = [];
    for (let i = 0; i < 10; i++) {
      this.statTexts.push([this.text(18, 124 + i * 22, '', 13, '#bdb6d6'), this.text(270, 124 + i * 22, '', 13, '#ffffff', { align: 'right' })]);
      this.statTexts[i][1].setOrigin(1, 0);
    }
    // 장비 슬롯
    this.text(18, 352, '장착 장비', 14, '#ffe9a8');
    this.equipSlots = {};
    [['weapon', '무기'], ['armor', '방어구'], ['accessory', '장신구']].forEach(([slot, label], i) => {
      const s = SR.UI.slot(scene, this.x + 18 + i * 86, this.y + 378, 62, () => this.select({ equip: slot }));
      this.add(s);
      this.text(18 + i * 86 + 31, 444, label, 12, '#bdb6d6').setOrigin(0.5, 0);
      this.equipSlots[slot] = s;
    });

    // ---- 가운데 인벤토리 ----
    const gx = 300, gy = 50, size = 58, gap = 6;
    this.slots = [];
    for (let i = 0; i < SR.Data.config.inventorySlots; i++) {
      const c = i % 6, r = Math.floor(i / 6);
      const s = SR.UI.slot(scene, this.x + gx + c * (size + gap), this.y + gy + r * (size + gap), size, () => this.select({ slot: i }));
      this.add(s);
      this.slots.push(s);
    }
    this.countText = this.text(gx, 384, '', 13, '#bdb6d6');
    this.goldText = this.text(gx + 378, 384, '', 15, '#ffe08a').setOrigin(1, 0);
    this.add(scene.add.image(this.x + gx + 378 - this.goldText.width - 14, this.y + 393, 'icon_gold'));
    this.goldIcon = this.root.last;
    this.hint = this.text(gx, 412, '아이템을 눌러 사용/장착하세요.\n재료 아이템은 마을 상점에서 팔 수 있습니다.', 12, '#8f88aa', { lineSpacing: 4 });

    // ---- 우측 상세 ----
    const dx = 700;
    this.detailBg = scene.add.rectangle(this.x + dx, this.y + 50, 184, 420, 0x120e20).setOrigin(0).setStrokeStyle(2, 0x4a3f72);
    this.add(this.detailBg);
    this.dIcon = scene.add.image(this.x + dx + 92, this.y + 92, 'px').setVisible(false).setScale(1.3);
    this.add(this.dIcon);
    this.dName = this.text(dx + 92, 132, '', 15, '#ffffff', { align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5, 0);
    this.dType = this.text(dx + 92, 156, '', 12, '#bdb6d6').setOrigin(0.5, 0);
    this.dBody = this.text(dx + 10, 182, '', 12, '#e8e2ff', { wordWrap: { width: 166 }, lineSpacing: 4 });
    this.useBtn = this.button(dx + 12, 382, 160, 34, '사용', () => this.useSelected());
    this.dropBtn = this.button(dx + 12, 424, 160, 34, '버리기', () => this.dropSelected(), { color: 0x6a3a4a });
    this.selected = null;
  }

  onOpen() { this.selected = null; }

  select(sel) {
    this.selected = sel;
    this.refresh();
  }

  selectedItem() {
    const st = SR.state;
    if (!this.selected) return null;
    if (this.selected.equip) { const id = st.equipment[this.selected.equip]; return id ? { id, qty: 1, equipped: true } : null; }
    const s = st.inventory[this.selected.slot];
    return s ? { id: s.id, qty: s.qty } : null;
  }

  useSelected() {
    const st = SR.state, it = this.selectedItem();
    if (!it) return;
    const r = it.equipped ? st.unequip(this.selected.equip) : st.useAt(this.selected.slot);
    if (r.msg) SR.log(r.msg, r.ok ? '#bff0ff' : '#ff9a7a');
    if (r.ok && SR.Data.items[it.id].type === 'equipment') SR.Sound.play('equip');
    if (!r.ok) SR.Sound.play('error');
    if (r.ok && it.equipped) this.selected = null;
    if (r.ok && !it.equipped && !SR.state.inventory[this.selected.slot]) this.selected = null;
    this.refresh();
  }

  dropSelected() {
    const it = this.selectedItem();
    if (!it || it.equipped) return;
    this.scene.confirm(`${SR.Data.items[it.id].name}${it.qty > 1 ? ' x' + it.qty : ''}을(를) 버릴까요?`, () => {
      SR.state.removeAt(this.selected.slot, it.qty);
      SR.log(`${SR.Data.items[it.id].name}을(를) 버렸습니다.`, '#a9a4bf');
      this.selected = null;
      this.refresh();
    });
  }

  refresh() {
    if (!this.isOpen) return;
    const st = SR.state, s = st.stats;
    this.nameText.setText(`Lv.${st.level} ${st.cls.name}`);
    this.powerText.setText(`전투력 ${SR.util.fmt(st.power)}`);
    this.goldTop.setText(`스킬 포인트 ${st.skillPoints}`);
    const rows = [
      ['공격력', SR.util.fmt(s.atk)], ['방어력', SR.util.fmt(s.def)],
      ['최대 HP', SR.util.fmt(s.maxHp)], ['최대 MP', SR.util.fmt(s.maxMp)],
      ['치명타 확률', (s.crit * 100).toFixed(1) + '%'], ['치명타 피해', Math.round(s.critDmg * 100) + '%'],
      ['DEADLY 확률', '치명타의 ' + Math.round(s.deadly * 100) + '%'], ['DEADLY 피해', Math.round(s.deadlyDmg * 100) + '%'],
      ['초당 공격', (1 / s.attackInterval).toFixed(1) + '회'], ['경험치 보너스', '+' + Math.round((s.expPct || 0) * 100) + '%']
    ];
    rows.forEach((r, i) => { this.statTexts[i][0].setText(r[0]); this.statTexts[i][1].setText(r[1]); });
    for (const k in this.equipSlots) {
      this.equipSlots[k].set(st.equipment[k], 1);
      this.equipSlots[k].select(!!(this.selected && this.selected.equip === k));
    }
    this.slots.forEach((sl, i) => {
      const it = st.inventory[i];
      sl.set(it ? it.id : null, it ? it.qty : 0);
      sl.select(!!(this.selected && this.selected.slot === i));
    });
    this.countText.setText(`${st.inventory.filter(Boolean).length}/${st.inventory.length} 칸`);
    this.goldText.setText(`${SR.util.fmt(st.gold)} 골드`);
    this.goldIcon.x = this.goldText.x - this.goldText.width - 14;

    const sel = this.selectedItem();
    if (!sel) {
      this.dIcon.setVisible(false); this.dName.setText('아이템을 선택하세요').setColor('#8f88aa'); this.dType.setText(''); this.dBody.setText('');
      this.useBtn.setVisible(false); this.dropBtn.setVisible(false);
      return;
    }
    const it = SR.Data.items[sel.id];
    this.dIcon.setTexture(it.icon).setVisible(true);
    this.dName.setText(it.name + (sel.qty > 1 ? ` x${sel.qty}` : '')).setColor(SR.RARITY_COLOR[it.rarity]);
    this.dType.setText(SR.UI.itemTypeLabel(it) + (sel.equipped ? ' · 장착 중' : ''));
    const lines = SR.UI.statLines(it);
    if (it.type === 'equipment' && !sel.equipped) {
      // 현재 장비와 비교
      const cur = st.equipment[it.slot];
      if (cur && cur !== sel.id) {
        const cs = SR.Data.items[cur].stats || {};
        const diff = [];
        const keys = new Set(Object.keys(cs).concat(Object.keys(it.stats || {})));
        keys.forEach(k => { const d = ((it.stats || {})[k] || 0) - (cs[k] || 0); if (d) diff.push((d > 0 ? '▲' : '▼') + (k === 'crit' || k === 'deadly' ? Math.round(Math.abs(d) * 100) + '%' : Math.abs(d)) + ' ' + ({ atk: '공격', def: '방어', maxHp: 'HP', maxMp: 'MP', crit: '치명', deadly: 'DEADLY' }[k] || k)); });
        if (diff.length) lines.push('', '현재 장비 대비:', diff.join('  '));
      }
    }
    this.dBody.setText(lines.concat(lines.length ? [''] : [], [it.desc, '', `판매가 ${SR.util.fmt(it.sell)} 골드`]).join('\n'));
    this.useBtn.setVisible(true);
    this.useBtn.setLabel(sel.equipped ? '장착 해제' : it.type === 'equipment' ? '장착' : it.type === 'consumable' ? '사용' : '사용 불가');
    this.useBtn.setEnabled(sel.equipped || it.type !== 'material');
    this.dropBtn.setVisible(!sel.equipped);
  }
};
