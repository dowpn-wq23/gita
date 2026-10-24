// 지도: 현재 맵을 축소해 그리고 플레이어/NPC/포탈/몬스터 위치 표시
SR.MapPanel = class MapPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 860, 500, '지도');
    this.g = scene.add.graphics();
    this.add(this.g);
    this.labels = [];
    this.legend = this.text(18, 470, '● 나   ● NPC   ◆ 포탈   ● 몬스터   ★ 정예', 12, '#cfc6e6');
    this.route = this.text(this.w - 18, 470, '', 12, '#8fe8ff').setOrigin(1, 0);
  }

  onOpen() {
    const gs = SR.gameScene;
    this.titleText.setText('지도 — ' + gs.mapData.name);
    this.route.setText('바람결 마을  ▶  이끼 낀 수로 유적  ▶  가라앉은 성소');
  }

  update() { if (this.isOpen) this.refresh(); }

  refresh() {
    if (!this.isOpen) return;
    const gs = SR.gameScene;
    if (!gs || !gs.world) return;
    const w = gs.world, T = w.T;
    const areaW = this.w - 36, areaH = this.h - 90;
    const s = Math.floor(Math.min(areaW / w.w, areaH / w.h));
    const ox = this.x + 18 + Math.floor((areaW - s * w.w) / 2), oy = this.y + 48 + Math.floor((areaH - s * w.h) / 2);
    const g = this.g;
    g.clear();
    const dark = w.theme === 1;
    const colors = {
      water: dark ? 0x1d3f6b : 0x2f7fa8, grass: dark ? 0x3c5a52 : 0x5fa54a, floor: dark ? 0x5c6278 : 0x8f9189,
      dirt: dark ? 0x5a5266 : 0xa07a4f, cobble: dark ? 0x6a6a86 : 0xb3a68e, high: dark ? 0x7a809c : 0xc2c5b8,
      wall: dark ? 0x2b2e3e : 0x4e514c, stairs: 0xd6d8ce, rock: 0x2a2a36
    };
    g.fillStyle(0x0c0914, 1).fillRect(ox - 3, oy - 3, s * w.w + 6, s * w.h + 6);
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      const c = w.cell(x, y);
      let col = colors.water;
      if (c.kind === 'floor') col = colors[c.tile] || colors.floor;
      else if (c.kind === 'wall') col = colors.wall;
      else if (c.kind === 'stairs') col = colors.stairs;
      else if (c.kind === 'rock') col = colors.rock;
      if (c.kind === 'floor' && !c.walk) col = 0x3a3040; // 장식
      g.fillStyle(col, 1).fillRect(ox + x * s, oy + y * s, s, s);
    }
    const P = (px, py) => [ox + px / T * s, oy + py / T * s];
    gs.portals.forEach(p => {
      const [x, y] = P(p.x + p.w / 2, p.y + p.h / 2);
      g.fillStyle(0x7fe8ff, 1).fillTriangle(x, y - 7, x - 6, y, x + 6, y).fillTriangle(x, y + 7, x - 6, y, x + 6, y);
    });
    gs.npcs.forEach(n => { const [x, y] = P(n.x, n.y); g.fillStyle(0x0c0914, 1).fillCircle(x, y, 6); g.fillStyle(0x6fe0a0, 1).fillCircle(x, y, 4); });
    gs.monsters.forEach(m => {
      if (!m.alive) return;
      const [x, y] = P(m.x, m.y);
      if (m.elite) { g.fillStyle(0xffcf4a, 1); this.star(g, x, y, 8); }
      else { g.fillStyle(0x0c0914, 1).fillCircle(x, y, 4); g.fillStyle(0xff5a5a, 1).fillCircle(x, y, 3); }
    });
    const [px, py] = P(gs.player.x, gs.player.y);
    const pulse = 5 + Math.sin(this.scene.time.now * 0.008) * 1.5;
    g.fillStyle(0x0c0914, 1).fillCircle(px, py, pulse + 2);
    g.fillStyle(0xfff36a, 1).fillCircle(px, py, pulse);
  }

  star(g, x, y, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    g.fillPoints(pts, true);
  }
};
