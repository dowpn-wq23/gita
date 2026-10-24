// UI 씬: HUD + 터치 컨트롤 + 창 + 키보드 입력. GameScene 위에 항상 떠 있다.
SR.UIScene = class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    SR.uiScene = this;
    this.input.addPointer(3);
    this.hud = new SR.HUD(this);
    this.msgLog = new SR.MessageLog(this);
    this.controls = new SR.Controls(this);
    this.panels = {
      inventory: new SR.InventoryPanel(this),
      skills: new SR.SkillPanel(this),
      shop: new SR.ShopPanel(this),
      map: new SR.MapPanel(this),
      menu: new SR.MenuPanel(this),
      event: new SR.EventPanel(this),
      dialog: new SR.DialogPanel(this),
      revive: new SR.RevivePanel(this),
      confirm: new SR.ConfirmPanel(this)
    };
    this.panels.confirm.root.setDepth(150);
    this.panels.revive.root.setDepth(140);

    this.setupKeyboard();

    // 이벤트 버스 연결
    const on = (ev, fn) => { SR.bus.on(ev, fn); this.events.once('shutdown', () => SR.bus.off(ev, fn)); };
    on('log', m => this.msgLog.add(m.text, m.color));
    on('goldNotice', g => this.hud.notice(`${SR.util.fmt(g)} 골드`, '#ffe08a', 'icon_gold'));
    on('itemNotice', (id, n) => { const it = SR.Data.items[id]; this.hud.notice(`${it.name}${n > 1 ? ' x' + n : ''}`, SR.RARITY_COLOR[it.rarity], it.icon); });
    on('mapEnter', (name, id) => {
      this.hud.mapName.setText('📍 ' + name);
      const md = SR.Data.maps[id];
      this.hud.showBanner(name, md.safe ? '안전 지역' : '사냥터');
      SR.log(`${name}에 들어왔습니다.`, '#bfe9ff');
    });
    on('npcInteract', id => this.openPanel('dialog', id));
    on('playerDead', () => this.time.delayedCall(1100, () => this.openPanel('revive')));
    ['inventory', 'equipment', 'skills', 'gold', 'buffs', 'levelup', 'stats'].forEach(ev => on(ev, () => this.refreshPanels()));
    on('shopTrade', () => { if (SR.gameScene) SR.gameScene.saveNow(); });

    // 창을 닫거나 탭을 숨길 때 저장
    const saveOnHide = () => { if (!SR.resetting && SR.gameScene && SR.gameScene.player && !SR.gameScene.changing) SR.gameScene.saveNow(); };
    window.addEventListener('beforeunload', saveOnHide);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveOnHide(); });

    SR.log('별빛 대륙에 오신 것을 환영합니다!', '#ffe9a8');
    if (!this.sys.game.device.input.touch) SR.log('이동 WASD · 공격 Space(누르고 있기) · 스킬 1~5 · 회피 Shift', '#bdb6d6');
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    SR.Input.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D', space: 'SPACE', j: 'J'
    });
    kb.on('keydown', e => {
      SR.Sound.unlock();
      const k = e.key.toLowerCase();
      if (e.repeat) return;
      if (k === 'escape') {
        const open = this.openPanels();
        if (open.length) { const top = open[open.length - 1]; if (top !== this.panels.revive) top.close(); }
        else this.openPanel('menu');
        return;
      }
      if (k === 'i' || k === 'b') return this.togglePanel('inventory');
      if (k === 'k') return this.togglePanel('skills');
      if (k === 'm') return this.togglePanel('map');
      if (this.openPanels().length) return;
      if (k >= '1' && k <= '5') SR.Input.push({ type: 'skill', index: Number(k) - 1 });
      else if (k === 'shift' || k === 'l') SR.Input.push({ type: 'dash' });
      else if (k === 'q') SR.Input.push({ type: 'potion' });
      else if (k === 'e' || k === 'enter' || (k === ' ' && this.isTalkMode())) SR.Input.push({ type: 'interact' });
    });
  }

  isTalkMode() { return !!(SR.gameScene && SR.gameScene.talkMode); }

  openPanels() { return Object.values(this.panels).filter(p => p.isOpen); }

  togglePanel(name) {
    const p = this.panels[name];
    if (p && p.isOpen) p.close(); else this.openPanel(name);
  }

  openPanel(name, arg) {
    if (name === 'supply') { name = 'shop'; arg = 'field_supply'; }
    const p = this.panels[name];
    if (!p) return;
    if (SR.gameScene && SR.gameScene.player && SR.gameScene.player.dead && name !== 'revive' && name !== 'confirm') return;
    // 확인창 외에는 한 번에 하나만
    if (name !== 'confirm') this.openPanels().forEach(o => { if (o !== p && o !== this.panels.revive) { o.isOpen = false; o.root.setVisible(false); o.onClose(); } });
    if (p.isOpen && name !== 'confirm') { p.refresh(); return; }
    p.open(arg);
    SR.Input.reset();
    SR.Input.blocked = true;
    this.controls.pad.pointerId = null; this.controls.attackPointer = null; this.controls.drawPad(0, 0);
    if (this.scene.isActive('Game')) this.scene.pause('Game');
  }

  onPanelClosed() {
    if (this.openPanels().length) return;
    SR.Input.blocked = false;
    SR.Input.reset();
    if (this.scene.isPaused('Game')) this.scene.resume('Game');
  }

  confirm(text, onYes) { this.openPanel('confirm', { text, onYes }); }

  refreshPanels() { this.openPanels().forEach(p => p.refresh()); }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.hud.update(dt);
    this.controls.update();
    this.panels.map.update();
  }
};
