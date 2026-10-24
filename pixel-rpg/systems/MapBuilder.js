// maps.json 의 문자 레이아웃 → Phaser 타일맵 + 충돌/높이 정보 + 장식 오브젝트
//
// 레이아웃 문자 (maps.json 의 legend 로 맵별 재정의 가능)
//   ~ 물(통행불가)   , 풀   . 석판   : 흙길   _ 자갈 광장
//   ^ 높은 석단(2층) | 석단 앞면 벽(통행불가)   = 계단(1층↔2층 연결)   # 바위(통행불가)
//   장식: T 나무  P/p 기둥(1층/2층)  t/y 횃불(1층/2층)  b 부서진 기둥  x 상자  l 가로등
SR.MapBuilder = {
  CHARS: {
    '~': { kind: 'water' },
    ',': { kind: 'floor', level: 0, tile: 'grass' },
    '.': { kind: 'floor', level: 0, tile: 'floor' },
    ':': { kind: 'floor', level: 0, tile: 'dirt' },
    '_': { kind: 'floor', level: 0, tile: 'cobble' },
    '^': { kind: 'floor', level: 1, tile: 'high' },
    '|': { kind: 'wall' },
    '=': { kind: 'stairs' },
    '#': { kind: 'rock' },
    'T': { decor: 'tree', floor: ',' },
    'P': { decor: 'pillar', floor: '.' },
    'p': { decor: 'pillar', floor: '^' },
    't': { decor: 'torch', floor: '.' },
    'y': { decor: 'torch', floor: '^' },
    'b': { decor: 'pillar_broken', floor: '.' },
    'x': { decor: 'crate', floor: null },
    'l': { decor: 'lamp', floor: '_' }
  },

  build(scene, mapId) {
    const data = SR.Data.maps[mapId];
    if (!data) throw new Error('맵 없음: ' + mapId);
    const T = SR.Data.config.tileSize;
    const rows = data.layout;
    const h = rows.length, w = rows[0].length;
    const theme = data.theme === 'dark' ? 1 : 0;
    const legend = Object.assign({}, this.CHARS, data.legend || {});
    const TILE = SR.Art.TILE;

    // 1) 셀 정보
    const cells = new Array(w * h);
    const decorList = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let ch = rows[y][x] || '~';
        let def = legend[ch] || legend['~'];
        if (def.decor) {
          decorList.push({ type: def.decor, x, y });
          ch = def.floor || data.defaultFloor || '.';
          def = legend[ch];
        }
        const c = { ch, kind: def.kind, level: def.level || 0, tile: def.tile, walk: false, stairs: false, water: false };
        if (def.kind === 'floor') c.walk = true;
        else if (def.kind === 'stairs') { c.walk = true; c.stairs = true; c.level = 0.5; }
        else if (def.kind === 'water') c.water = true;
        cells[y * w + x] = c;
      }
    }
    const cell = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : cells[y * w + x];
    (data.decor || []).forEach(d => decorList.push(Object.assign({}, d)));

    // 2) 타일 인덱스
    const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const off = theme * 16;
    const grid = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const c = cell(x, y);
        const r = hash(x, y) % 100;
        let idx = -1;
        if (c.kind === 'floor') {
          switch (c.tile) {
            case 'grass': idx = r < 72 ? TILE.grass : r < 86 ? TILE.grass2 : TILE.grass3; break;
            case 'floor': idx = r < 80 ? TILE.floor : TILE.floorMoss; break;
            case 'dirt': idx = TILE.dirt; break;
            case 'cobble': idx = r < 85 ? TILE.cobble : TILE.cobble2; break;
            case 'high': idx = r < 82 ? TILE.high : TILE.highMoss; break;
            default: idx = TILE.floor;
          }
        } else if (c.kind === 'wall') {
          const s = cell(x, y + 1);
          idx = s && s.water ? TILE.wallWater : TILE.wall;
        } else if (c.kind === 'stairs') idx = TILE.stairs;
        else if (c.kind === 'rock') idx = TILE.rock;
        else if (c.water) {
          const n = cell(x, y - 1);
          if (n && (n.kind === 'floor' || n.kind === 'stairs')) idx = (n.tile === 'grass' || n.tile === 'dirt') ? TILE.ledgeBank : TILE.ledgeStone;
        }
        row.push(idx < 0 ? -1 : idx + off);
      }
      grid.push(row);
    }

    // 3) 물 배경 (흐르는 물결) + 타일맵
    const W = w * T, H = h * T;
    const waterKey = theme ? 'water_dark' : 'water_light';
    // 물은 화면 크기만큼만 그리고 카메라 위치만큼 무늬를 밀어서 맵 전체에 깔린 것처럼 보이게 한다
    const VW = scene.scale.width, VH = scene.scale.height;
    const water = scene.add.tileSprite(0, 0, VW, VH, waterKey).setOrigin(0).setScrollFactor(0).setDepth(SR.DEPTH.water);
    const glint = scene.add.tileSprite(0, 0, VW, VH, 'water_glint').setOrigin(0).setScrollFactor(0).setDepth(SR.DEPTH.water + 1).setAlpha(0.8);
    const tilemap = scene.make.tilemap({ data: grid, tileWidth: T, tileHeight: T });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
    const layer = tilemap.createLayer(0, tileset, 0, 0).setDepth(SR.DEPTH.ground);

    // 4) 높낮이 가장자리 / 물가 표현
    const g = scene.add.graphics().setDepth(SR.DEPTH.edges);
    const P = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = cell(x, y);
        const px = x * T, py = y * T;
        if (c.kind === 'floor' && c.level === 1) {
          const isLow = n => n && (n.kind === 'floor' && n.level === 0);
          const W_ = cell(x - 1, y), E_ = cell(x + 1, y), N_ = cell(x, y - 1);
          if (isLow(W_) || (W_ && W_.water)) { g.fillStyle(0x000000, 0.28).fillRect(px - 2 * P, py, 2 * P, T); g.fillStyle(0xffffff, 0.18).fillRect(px, py, P, T); }
          if (isLow(E_) || (E_ && E_.water)) { g.fillStyle(0x000000, 0.28).fillRect(px + T, py, 2 * P, T); g.fillStyle(0x000000, 0.18).fillRect(px + T - P, py, P, T); }
          if (isLow(N_) || (N_ && N_.water)) { g.fillStyle(0xffffff, 0.22).fillRect(px, py, T, P); }
        }
        if (c.walk) {
          const W_ = cell(x - 1, y), E_ = cell(x + 1, y), N_ = cell(x, y - 1);
          if (W_ && W_.water) { g.fillStyle(0x000000, 0.25).fillRect(px, py, P, T); g.fillStyle(0xdff6ff, 0.35).fillRect(px - P, py, P, T); }
          if (E_ && E_.water) { g.fillStyle(0x000000, 0.25).fillRect(px + T - P, py, P, T); g.fillStyle(0xdff6ff, 0.35).fillRect(px + T, py, P, T); }
          if (N_ && N_.water) { g.fillStyle(0x000000, 0.2).fillRect(px, py, T, P); }
        }
        // 벽 아래 그림자
        if (c.kind === 'wall') {
          const s = cell(x, y + 1);
          if (s && s.walk) g.fillStyle(0x000000, 0.22).fillRect(px, py + T, T, 2 * P);
        }
      }
    }

    // 5) 장식 오브젝트
    const decor = [];
    decorList.forEach(d => {
      const obj = SR.Decor.create(scene, d, theme);
      if (!obj) return;
      obj.footprint.forEach(([fx, fy]) => { const c = cell(fx, fy); if (c) c.walk = false; });
      decor.push(obj);
    });

    const world = {
      id: mapId, data, w, h, T, W, H, cells, theme, layer, tilemap, water, glint, decor, edges: g,
      cell,
      cellAtPx(px, py) { return cell(Math.floor(px / T), Math.floor(py / T)); },
      // 이 위치에 서 있을 수 있는가 (from: 현재 서 있는 셀 — 높이 비교용)
      canStand(px, py, from, r) {
        r = r == null ? 12 : r;
        const pts = [[px - r, py - r * 0.5], [px + r, py - r * 0.5], [px - r, py + r * 0.5], [px + r, py + r * 0.5]];
        for (const [qx, qy] of pts) {
          const c = this.cellAtPx(qx, qy);
          if (!c || !c.walk) return false;
          if (from && !from.stairs && !c.stairs && c.level !== from.level) return false;
        }
        return true;
      },
      // 축 분리 이동 (벽을 따라 미끄러짐)
      move(ent, dx, dy, r) {
        const from = this.cellAtPx(ent.x, ent.y);
        let moved = false;
        if (dx && this.canStand(ent.x + dx, ent.y, from, r)) { ent.x += dx; moved = true; }
        const from2 = this.cellAtPx(ent.x, ent.y);
        if (dy && this.canStand(ent.x, ent.y + dy, from2, r)) { ent.y += dy; moved = true; }
        return moved;
      },
      // 같은 높이의 걸을 수 있는 임의 지점
      randomPointNear(cx, cy, radiusPx, r) {
        const base = this.cellAtPx(cx, cy);
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.random() * radiusPx;
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
          if (this.canStand(x, y, base, r)) return { x, y };
        }
        return { x: cx, y: cy };
      },
      update(time) {
        const cam = scene.cameras.main;
        water.tilePositionX = cam.scrollX + time * 0.012;
        water.tilePositionY = cam.scrollY + Math.sin(time * 0.0006) * 6;
        glint.tilePositionX = cam.scrollX - time * 0.02;
        glint.tilePositionY = cam.scrollY + time * 0.008;
        glint.setAlpha(0.55 + Math.sin(time * 0.002) * 0.25);
      }
    };
    return world;
  }
};
