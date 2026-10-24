// 메뉴 / 이벤트(출석) / NPC 대화 / 부활 / 확인 창
SR.MenuPanel = class MenuPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 560, 430, '메뉴');
    const items = [
      ['스킬  (K)', () => scene.openPanel('skills')],
      ['가방 · 캐릭터  (I)', () => scene.openPanel('inventory')],
      ['지금 저장하기', () => { const ok = SR.gameScene && SR.gameScene.saveNow(); SR.log(ok ? '저장되었습니다.' : '저장에 실패했습니다.', ok ? '#7dff8a' : '#ff9a7a'); }],
      ['', () => { SR.state.settings.sound = !SR.state.settings.sound; SR.Sound.setEnabled(SR.state.settings.sound); this.refresh(); }],
      ['전체 화면 전환', () => { if (scene.scale.isFullscreen) scene.scale.stopFullscreen(); else scene.scale.startFullscreen(); }],
      ['데이터 초기화', () => scene.confirm('모든 진행 상황을 지우고 처음부터 시작할까요?', () => { SR.Save.clear(); SR.resetting = true; location.reload(); })]
    ];
    this.btns = items.map(([label, fn], i) => this.button(24, 54 + i * 50, 240, 40, label, fn, i === 5 ? { color: 0x8a2a3a } : {}));
    this.text(290, 54, '조작법', 15, '#ffe9a8');
    this.text(290, 80, [
      '이동  WASD / 방향키 / 십자패드',
      '기본공격  Space · J (누르고 있기)',
      '스킬  1 ~ 5',
      '회피  Shift · L',
      '물약  Q     대화  E / 공격 버튼',
      '가방 I · 스킬 K · 지도 M',
      '창 닫기  Esc',
      '',
      '공격하면 기(氣)◆가 충전되고,',
      '천붕격이 기를 소모해 큰 피해를 줍니다.',
      '',
      '진행 상황은 10초마다 자동 저장됩니다.'
    ].join('\n'), 12, '#cfc6e6', { lineSpacing: 5 });
    this.saveInfo = this.text(24, 360, '', 11, '#8f88aa');
    this.dataInfo = this.text(24, 380, '', 11, '#8f88aa');
  }
  refresh() {
    if (!this.isOpen) return;
    this.btns[3].setLabel('사운드: ' + (SR.state.settings.sound ? '켜짐' : '꺼짐'));
    const t = SR.Save.lastSaved ? new Date(SR.Save.lastSaved).toLocaleTimeString('ko-KR') : '-';
    this.saveInfo.setText(`마지막 저장: ${t}`);
    this.dataInfo.setText(`데이터 소스: ${SR.Data.source === 'json' ? 'data/*.json' : 'data/bundle.js'}`);
  }
};

SR.EventPanel = class EventPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 560, 340, '이벤트 · 출석 보상');
    this.text(24, 54, '매일 한 번, 모험가 지원 물자를 받을 수 있습니다.', 14, '#cfc6e6');
    const cfg = SR.Data.config.dailyReward;
    const rewards = [{ icon: 'icon_gold', label: `${SR.util.fmt(cfg.gold)} 골드` }].concat(cfg.items.map(it => ({ icon: SR.Data.items[it.id].icon, label: `${SR.Data.items[it.id].name} x${it.qty}` })));
    rewards.forEach((r, i) => {
      const x = 40 + i * 165;
      const box = scene.add.rectangle(this.x + x, this.y + 96, 140, 120, 0x120e20).setOrigin(0).setStrokeStyle(2, 0xc9a24a);
      const ic = scene.add.image(this.x + x + 70, this.y + 140, r.icon).setScale(r.icon === 'icon_gold' ? 3 : 1.2);
      this.add([box, ic]);
      this.text(x + 70, 186, r.label, 12, '#ffe9a8', { align: 'center', wordWrap: { width: 130 } }).setOrigin(0.5, 0);
    });
    this.status = this.text(this.w / 2, 238, '', 14, '#ffffff').setOrigin(0.5, 0);
    this.claimBtn = this.button(this.w / 2 - 90, 270, 180, 44, '보상 받기', () => this.claim(), { color: 0x3a8a5a, fontSize: 17 });
  }
  claim() {
    const st = SR.state, cfg = SR.Data.config.dailyReward;
    if (st.lastDailyClaim === SR.util.todayKey()) return;
    const need = cfg.items.length;
    if (st.freeSlots() < need && !cfg.items.every(it => st.canFit(it.id, it.qty))) { SR.log('가방 공간이 부족합니다.', '#ff9a7a'); return; }
    st.lastDailyClaim = SR.util.todayKey();
    st.addGold(cfg.gold);
    cfg.items.forEach(it => st.addItem(it.id, it.qty));
    SR.bus.emit('goldNotice', cfg.gold);
    SR.log('출석 보상을 받았습니다!', '#7dff8a');
    SR.Sound.play('buy');
    if (SR.gameScene) SR.gameScene.saveNow();
    this.refresh();
  }
  refresh() {
    if (!this.isOpen) return;
    const done = SR.state.lastDailyClaim === SR.util.todayKey();
    this.status.setText(done ? '오늘의 보상을 이미 받았습니다. 내일 다시 오세요!' : '오늘의 보상을 받을 수 있습니다.').setColor(done ? '#8f88aa' : '#7dff8a');
    this.claimBtn.setEnabled(!done).setLabel(done ? '수령 완료' : '보상 받기');
  }
};

SR.DialogPanel = class DialogPanel extends SR.Panel {
  constructor(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    super(scene, 800, 170, null, { x: (W - 800) / 2, y: H - 250, dimAlpha: 0.3 });
    this.portrait = scene.add.sprite(this.x + 70, this.y + 160, 'npc_merchant', 0).setOrigin(0.5, 1).setScale(1.8);
    this.add(this.portrait);
    this.nameText = this.text(150, 16, '', 17, '#ffe9a8');
    this.body = this.text(150, 46, '', 15, '#ffffff', { wordWrap: { width: 600 }, lineSpacing: 6 });
    this.btnA = this.button(this.w - 330, 118, 150, 38, '', () => this.actionA(), { color: 0x3a8a5a });
    this.btnB = this.button(this.w - 170, 118, 150, 38, '닫기', () => this.close(), { color: 0x5a4a7a });
  }
  onOpen(npcId) {
    this.npcId = npcId;
    this.def = SR.Data.npcs.npcs[npcId];
    this.line = 0;
    this.portrait.setTexture(this.def.sprite, 0);
    this.nameText.setText(`${this.def.name}  [${this.def.title}]`);
    this.body.setText(this.def.lines[0]);
    const role = this.def.role;
    this.btnA.setVisible(true);
    if (role === 'shop') this.btnA.setLabel('상점 열기');
    else if (role === 'heal') this.btnA.setLabel('치료 받기');
    else this.btnA.setLabel(this.def.lines.length > 1 ? '다음' : '알겠어요');
  }
  actionA() {
    const role = this.def.role;
    if (role === 'shop') { this.close(); this.scene.openPanel('shop', this.def.shop); }
    else if (role === 'heal') {
      const st = SR.state;
      st.hp = st.stats.maxHp; st.mp = st.stats.maxMp;
      this.body.setText(this.def.healedLine);
      SR.log('HP/MP가 모두 회복되었습니다.', '#7dff8a');
      SR.Sound.play('potion');
      SR.bus.emit('healed');
    } else {
      this.line++;
      if (this.line >= this.def.lines.length) { this.close(); return; }
      this.body.setText(this.def.lines[this.line]);
      if (this.line === this.def.lines.length - 1) this.btnA.setLabel('알겠어요');
    }
  }
};

SR.RevivePanel = class RevivePanel extends SR.Panel {
  constructor(scene) {
    super(scene, 460, 210, '쓰러졌습니다', { modal: true, noClose: true, dimAlpha: 0.4 });
    this.text(this.w / 2, 60, '몬스터에게 쓰러졌습니다.\n마을의 치유사 곁에서 깨어납니다.', 15, '#ffffff', { align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
    this.button(this.w / 2 - 110, 140, 220, 46, '마을에서 부활', () => { this.close(); SR.gameScene.reviveInTown(); }, { color: 0x3a8a5a, fontSize: 17 });
  }
};

SR.ConfirmPanel = class ConfirmPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 460, 200, '확인', { modal: true });
    this.msg = this.text(this.w / 2, 64, '', 15, '#ffffff', { align: 'center', wordWrap: { width: 410 } }).setOrigin(0.5, 0);
    this.button(this.w / 2 - 170, 134, 150, 42, '확인', () => { const fn = this.onYes; this.close(); if (fn) fn(); }, { color: 0x8a2a3a });
    this.button(this.w / 2 + 20, 134, 150, 42, '취소', () => this.close(), { color: 0x5a4a7a });
  }
  onOpen(arg) { this.msg.setText(arg.text); this.onYes = arg.onYes; }
};
