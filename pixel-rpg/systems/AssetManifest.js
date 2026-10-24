// =====================================================================
//  에셋 로딩 단일 진입점
// =====================================================================
// 지금은 모든 그래픽이 PlaceholderArt.js 에서 코드로 생성된다.
// 실제 스프라이트로 교체하려면 아래 manifest 에 같은 키로 파일을 등록하면 끝.
// (등록된 키는 플레이스홀더 생성을 건너뛰고 파일을 로드한다)
//
//   type   : 'image' | 'spritesheet'
//   url    : index.html 기준 경로
//   frameWidth/frameHeight : 스프라이트시트의 한 프레임 크기 (원본 픽셀)
//   scale  : 화면 배율. 플레이스홀더는 논리 1px = 화면 3px 로 그려지므로,
//            1배 크기로 그린 픽셀아트라면 scale: 3 을 주면 같은 크기로 보인다.
//
// 프레임 배치 규칙 (교체 시 동일하게 맞출 것)
//   player_*  : 22x26, 3행(아래/위/옆-오른쪽) x 11열
//               열: 0,1 대기 | 2~5 걷기 | 6 잽 | 7 스트레이트 | 8 발차기 | 9 피격 | 10 시전
//   npc_*     : 22x26, 1행 x 2열 (대기)
//   mon_*     : 1행 x 6열 (오른쪽을 봄) 0,1 대기 | 2,3 이동 | 4 공격 | 5 피격
//   tiles     : 16x16, 2행(light/dark 테마) x 16열 (PlaceholderArt.js 의 SR.Art.TILE 참고)
//   pet_star  : 14x14, 1행 x 4열
//
// 예)
//   player_monk: { type: 'spritesheet', url: 'assets/monk.png', frameWidth: 22, frameHeight: 26, scale: 3 },
//   mon_jelly:   { type: 'spritesheet', url: 'assets/jelly.png', frameWidth: 20, frameHeight: 18, scale: 3 },
//   tiles:       { type: 'spritesheet', url: 'assets/tiles.png', frameWidth: 48, frameHeight: 48, scale: 1 },
SR.Assets = {
  manifest: {
  },

  // 사운드도 같은 방식 (비워두면 Sound.js 의 합성음을 사용)
  // 예) hit: { url: 'assets/sfx/hit.ogg' }
  sounds: {
  },

  PX: 3,

  preload(scene) {
    for (const [key, m] of Object.entries(this.manifest)) {
      if (m.type === 'spritesheet') scene.load.spritesheet(key, m.url, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
      else scene.load.image(key, m.url);
    }
    for (const [key, s] of Object.entries(this.sounds)) scene.load.audio('sfx_' + key, s.url);
    scene.load.on('loaderror', file => console.warn('[Assets] 로드 실패 → 플레이스홀더 사용:', file.key));
  },

  // 로드되지 않은 키는 모두 플레이스홀더로 생성
  generate(scene) {
    const PX = this.PX;
    for (const [key, build] of Object.entries(SR.Art.defs)) {
      if (scene.textures.exists(key)) continue;
      const out = build();
      if (out.raw) {
        const tex = scene.textures.createCanvas(key, out.w, out.h);
        out.draw(tex.getContext());
        tex.refresh();
      } else if (out.buf) {
        const tex = scene.textures.createCanvas(key, out.buf.w * PX, out.buf.h * PX);
        out.buf.drawTo(tex.getContext(), 0, 0, PX);
        tex.refresh();
      } else {
        const cols = Math.max(...out.rows.map(r => r.length));
        const fw = out.fw * PX, fh = out.fh * PX;
        const tex = scene.textures.createCanvas(key, cols * fw, out.rows.length * fh);
        const ctx = tex.getContext();
        out.rows.forEach((row, r) => row.forEach((buf, c) => {
          buf.drawTo(ctx, c * fw, r * fh, PX);
          tex.add(r * cols + c, 0, c * fw, r * fh, fw, fh);
        }));
        tex.refresh();
      }
    }
    this.registerFont(scene);
    this.createAnimations(scene);
  },

  scaleOf(key) {
    const m = this.manifest[key];
    return m && m.scale ? m.scale : 1;
  },

  // 데미지 숫자용 비트맵 폰트 등록
  registerFont(scene) {
    if (scene.cache.bitmapFont.exists('pixelfont')) return;
    const F = SR.Art.FONT;
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: 'pixelfont',
      width: F.cellW,
      height: F.cellH,
      chars: SR.Art.FONT_CHARS,
      charsPerRow: F.cols,
      spacing: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      lineSpacing: 1
    });
    scene.cache.bitmapFont.add('pixelfont', data);
  },

  createAnimations(scene) {
    const A = scene.anims;
    const make = (key, tex, frames, rate, repeat) => {
      if (A.exists(key)) return;
      A.create({ key, frames: frames.map(f => ({ key: tex, frame: f })), frameRate: rate, repeat: repeat == null ? -1 : repeat });
    };
    // 플레이어/NPC
    ['player_monk'].forEach(tex => {
      ['down', 'up', 'side'].forEach((dir, r) => {
        const base = r * 11;
        make(`${tex}_idle_${dir}`, tex, [base, base + 1], 2.5);
        make(`${tex}_walk_${dir}`, tex, [base + 2, base + 3, base + 4, base + 5], 9);
      });
    });
    ['npc_merchant', 'npc_healer', 'npc_guard'].forEach(tex => make(`${tex}_idle`, tex, [0, 1], 2));
    ['mon_jelly', 'mon_turtle', 'mon_bat', 'mon_golem', 'mon_bogkeeper', 'mon_sentinel'].forEach(tex => {
      make(`${tex}_idle`, tex, [0, 1], tex === 'mon_bat' ? 8 : 3);
      make(`${tex}_move`, tex, [2, 3], tex === 'mon_bat' ? 10 : 6);
    });
    make('pet_star_fly', 'pet_star', [0, 1, 2, 3], 7);
    make('flame_burn', 'flame', [0, 1, 2, 3], 10);
    make('portal_spin', 'portal', [0, 1, 2, 3], 6);
    make('fountain_flow', 'fountain', [0, 1], 4);
    make('altar_glow', 'altar', [0, 1], 2);
    make('spark_burst', 'spark', [0, 1, 2, 3], 24, 0);
    make('dust_puff', 'dust', [0, 1, 2], 14, 0);
  }
};
