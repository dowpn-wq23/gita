// 플레이스홀더 픽셀아트 생성기.
// 각 정의는 텍스처 키 하나에 대응한다. AssetManifest.js 에서 같은 키로 실제 이미지 파일을 등록하면
// 해당 플레이스홀더는 생성되지 않고 파일이 대신 쓰인다.
//
// 빌드 함수 반환 형식:
//   { rows: [[PixelBuf, ...], ...], fw, fh }  → 스프라이트시트 (프레임 번호 = 행*열수 + 열)
//   { buf: PixelBuf }                          → 단일 이미지
//   { w, h, draw(ctx) }                         → 캔버스 직접 그리기 (그라데이션 등)
SR.Art = { defs: {}, PX: 3 };
SR.Art.def = function (key, build) { SR.Art.defs[key] = build; };

(function () {
  const B = (w, h) => new SR.PixelBuf(w, h);
  const C = SR.Color;
  const OUT = '#1a1020';

  // ------------------------------------------------------------------
  // 사람형 캐릭터 (플레이어/NPC 공용) 22x26
  // dir: 'down' | 'up' | 'side'(오른쪽을 봄)
  // pose: { bob, leg, armL, armR, kick, hurt }
  //   arm 상태: 'rest' | 'fwd' | 'back' | 'punch' | 'guard' | 'up'
  // ------------------------------------------------------------------
  function drawHuman(dir, pose, P, opt) {
    opt = opt || {};
    const b = B(22, 26);
    const bob = pose.bob || 0;
    const hx = pose.hurt ? -1 : 0;
    const pal = {
      h: P.hair, r: P.band || P.hair, s: P.skin, S: P.skinShade, e: P.eye || '#20141e',
      g: P.gi, G: P.giShade, B: P.belt, w: P.wrap, p: P.pants, f: P.shoes
    };
    const sleeve = P.gi, sleeveShade = P.giShade;

    // ----- 다리 -----
    const leg = pose.leg || 0;
    if (!opt.robe) {
      if (dir === 'side') {
        if (pose.kick) {
          b.rect(9, 19, 3, 5, P.pants); b.rect(8, 24, 4, 1, P.shoes);       // 디딤발
          b.rect(12, 17, 6, 3, P.pants); b.rect(18, 16, 2, 4, P.shoes);     // 차는 발
        } else {
          const fx = leg === 1 ? 2 : leg === -1 ? -1 : 0;
          const bx = -fx;
          b.rect(9 + bx, 19, 3, 5, C.shade(P.pants, -0.25)); b.rect(9 + bx, 24, 4, 1, C.shade(P.shoes, -0.25));
          b.rect(11 + fx, 19, 3, 5, P.pants); b.rect(11 + fx, 24, 4, 1, P.shoes);
        }
      } else {
        const lUp = leg === 1 ? 1 : 0, rUp = leg === -1 ? 1 : 0;
        b.rect(8, 19, 3, 5 - lUp, P.pants); b.rect(7, 24 - lUp, 4, 1, P.shoes);
        if (pose.kick) {
          b.rect(11, 18, 3, 3, P.pants); b.rect(12, 21, 4, 2, P.shoes);
        } else {
          b.rect(11, 19, 3, 5 - rUp, P.pants); b.rect(11, 24 - rUp, 4, 1, P.shoes);
        }
      }
    }

    const ty = 12 + bob; // 몸통 시작
    // ----- 뒤쪽 팔 (옆모습) -----
    const backArm = (state) => {
      const sl = C.shade(sleeve, -0.2), sk = P.skinShade, wr = C.shade(P.wrap, -0.15);
      if (state === 'punch') { b.rect(10, ty + 2, 4, 2, sl); b.rect(14, ty + 2, 4, 2, sk); b.rect(18, ty + 1, 3, 3, wr); }
      else if (state === 'guard') { b.rect(10, ty + 1, 2, 3, sl); b.rect(12, ty, 2, 2, wr); }
      else if (state === 'fwd') { b.rect(10, ty, 2, 3, sl); b.rect(11, ty + 3, 2, 2, sk); b.rect(12, ty + 4, 2, 2, wr); }
      else if (state === 'back') { b.rect(9, ty, 2, 3, sl); b.rect(8, ty + 3, 2, 2, sk); b.rect(7, ty + 4, 2, 2, wr); }
      else if (state === 'up') { b.rect(10, ty - 3, 2, 4, sk); b.rect(10, ty - 5, 2, 2, wr); }
      else { b.rect(9, ty, 2, 3, sl); b.rect(9, ty + 3, 2, 2, sk); b.rect(9, ty + 5, 2, 2, wr); }
    };
    if (dir === 'side') backArm(pose.armR);

    // ----- 몸통 -----
    if (dir === 'side') {
      b.rect(8, ty, 7, 7, P.gi);
      b.rect(8, ty, 2, 7, P.giShade);
      if (dir !== 'up' && !opt.robe) b.rect(13, ty, 2, 2, P.skin);
      b.rect(8, ty + 4, 7, 1, P.belt);
      if (opt.robe) { b.rect(8, ty + 5, 7, 7 - bob, P.gi); b.rect(8, ty + 5, 2, 7 - bob, P.giShade); b.rect(8, 24, 7, 1, P.shoes); }
      else b.rect(8, ty + 5, 7, 2, P.gi);
    } else {
      b.rect(7, ty, 8, 7, P.gi);
      if (dir === 'down' && !opt.robe && !opt.armor) { b.rect(10, ty, 2, 3, P.skin); b.set(10, ty + 3, P.skinShade); }
      b.rect(7, ty, 1, 7, P.giShade); b.rect(14, ty, 1, 7, P.giShade);
      b.rect(7, ty + 4, 8, 1, P.belt);
      if (dir === 'down' && opt.apron) { b.rect(8, ty + 4, 6, 6, opt.apron); }
      if (opt.robe) {
        b.rect(6, ty + 5, 10, 8 - bob, P.gi); b.rect(6, ty + 5, 1, 8 - bob, P.giShade); b.rect(15, ty + 5, 1, 8 - bob, P.giShade);
        b.rect(10, ty + 5, 2, 8 - bob, opt.robeTrim || P.giShade);
        b.rect(7, 24, 8, 1, P.shoes);
      } else b.rect(7, ty + 5, 8, 2, P.gi);
    }

    // ----- 앞쪽 팔 / 양팔 -----
    const frontArm = (state, side) => {
      // side: -1 = 왼팔(화면 왼쪽), 1 = 오른팔, 0 = 옆모습 앞팔
      if (dir === 'side') {
        if (state === 'punch') { b.rect(11, ty + 1, 4, 2, sleeve); b.rect(15, ty + 1, 3, 2, P.skin); b.rect(18, ty, 3, 3, P.wrap); }
        else if (state === 'guard') { b.rect(12, ty + 1, 2, 3, sleeve); b.rect(14, ty, 2, 2, P.wrap); }
        else if (state === 'fwd') { b.rect(12, ty, 2, 3, sleeve); b.rect(13, ty + 3, 2, 2, P.skin); b.rect(14, ty + 4, 2, 2, P.wrap); }
        else if (state === 'back') { b.rect(10, ty, 2, 3, sleeve); b.rect(9, ty + 3, 2, 2, P.skin); b.rect(8, ty + 4, 2, 2, P.wrap); }
        else if (state === 'up') { b.rect(12, ty - 3, 2, 4, P.skin); b.rect(13, ty - 5, 2, 2, P.wrap); }
        else { b.rect(11, ty, 2, 3, sleeve); b.rect(11, ty + 3, 2, 2, P.skin); b.rect(11, ty + 5, 2, 2, P.wrap); }
        return;
      }
      const x = side < 0 ? 5 : 15;
      if (state === 'punch') {
        // 화면 쪽(아래) 또는 위로 뻗는 주먹
        if (dir === 'down') {
          const fx = side < 0 ? 7 : 12;
          b.rect(x, ty, 2, 2, sleeve); b.rect(side < 0 ? 6 : 14, ty + 2, 2, 3, P.skin);
          b.rect(fx, ty + 5, 3, 3, P.wrap); b.set(fx + 1, ty + 7, C.shade(P.wrap, -0.2));
        } else {
          b.rect(x, ty - 1, 2, 2, sleeve); b.rect(x, ty - 4, 2, 3, P.skin); b.rect(x - (side < 0 ? 0 : 1), ty - 7, 3, 3, P.wrap);
        }
      } else if (state === 'guard') {
        b.rect(x, ty, 2, 2, sleeve); b.rect(side < 0 ? 7 : 13, ty - 1, 2, 2, P.wrap);
      } else if (state === 'up') {
        b.rect(x, ty - 3, 2, 4, P.skin); b.rect(x, ty - 5, 2, 2, P.wrap);
      } else {
        const dy = state === 'fwd' ? 1 : state === 'back' ? -1 : 0;
        b.rect(x, ty, 2, 3, side < 0 ? sleeveShade : sleeve);
        b.rect(x, ty + 3, 2, 2 + dy, P.skin);
        b.rect(x, ty + 5 + dy, 2, 2, P.wrap);
      }
    };
    if (dir === 'side') frontArm(pose.armL, 0);
    else { frontArm(pose.armL, -1); frontArm(pose.armR, 1); }

    // ----- 머리 -----
    const hy = 2 + bob;
    if (dir === 'down') {
      b.stamp(6 + hx, hy, [
        '.h.hhhh.h.',
        'hhhhhhhhhh',
        'hhhhhhhhhh',
        'rrrrrrrrrr',
        'hssssssssh',
        'ssessssess',
        'ssessssess',
        'ssssssssss',
        '.ssssssss.',
        '..SSSSSS..'
      ], pal);
      if (pose.hurt) { b.set(8 + hx, hy + 5, P.skin); b.set(13 + hx, hy + 5, P.skin); }
      if (P.band && !opt.hat && !opt.helmet) { b.set(16 + hx, hy + 4, P.band); b.set(17 + hx, hy + 5, P.band); b.set(16 + hx, hy + 5, P.band); }
    } else if (dir === 'up') {
      b.stamp(6 + hx, hy, [
        '.h.hhhh.h.',
        'hhhhhhhhhh',
        'hhhhhhhhhh',
        'rrrrrrrrrr',
        'hhhhrrhhhh',
        'hhhhhhhhhh',
        'hhhhhhhhhh',
        'shhhhhhhhs',
        '.shhhhhhs.',
        '..SSSSSS..'
      ], pal);
      if (P.band && !opt.hat && !opt.helmet) { b.rect(10, ty, 1, 3, P.band); b.rect(11, ty + 1, 1, 3, P.band); }
    } else {
      b.stamp(7 + hx, hy, [
        '..hhhh.h.',
        '.hhhhhhh.',
        'hhhhhhhhh',
        'rrrrrrrrr',
        'hhhssssss',
        'hhssssses',
        'hhssssses',
        '.hsssssss',
        '..sssssS.',
        '...SSSS..'
      ], pal);
      if (P.band && !opt.hat && !opt.helmet) { b.set(6 + hx, hy + 3, P.band); b.set(5 + hx, hy + 4, P.band); b.set(4 + hx, hy + 4, P.band); b.set(5 + hx, hy + 5, P.band); }
    }
    // 모자/투구/긴 머리
    if (opt.hat) {
      const hc = opt.hat, hs = C.shade(opt.hat, -0.3);
      b.rect(4 + hx, hy + 2, 14, 2, hc); b.rect(7 + hx, hy - 1, 8, 3, hc); b.rect(7 + hx, hy + 1, 8, 1, hs);
    }
    if (opt.helmet) {
      const hc = opt.helmet, hs = C.shade(opt.helmet, -0.3), hl = C.shade(opt.helmet, 0.35);
      b.rect(6 + hx, hy, 10, 4, hc); b.rect(7 + hx, hy - 1, 8, 1, hc); b.rect(7 + hx, hy, 3, 1, hl);
      b.rect(6 + hx, hy + 3, 10, 1, hs);
      if (dir !== 'up') b.rect(10 + hx, hy - 3, 2, 3, opt.plume || '#c23b3b');
    }
    if (opt.longHair) {
      if (dir === 'down') { b.rect(5 + hx, hy + 3, 1, 8, P.hair); b.rect(16 + hx, hy + 3, 1, 8, P.hair); }
      else if (dir === 'up') { b.rect(6, hy + 7, 10, 5, P.hair); }
      else { b.rect(7 + hx, hy + 4, 2, 8, P.hair); }
    }
    if (opt.spear) {
      const sx = dir === 'side' ? 15 : 17;
      b.rect(sx, 1, 1, 24, '#7b5534'); b.rect(sx - 1, 0, 3, 3, '#d9dde4'); b.set(sx, -1, '#d9dde4');
    }
    b.outline(OUT);
    return b;
  }

  // 무도가 팔레트
  const MONK = {
    hair: '#2b2135', band: '#d8343f', skin: '#f2c49b', skinShade: '#cf966b',
    gi: '#f3eee0', giShade: '#c4bba6', belt: '#2d3f94', wrap: '#fbfbf2', pants: '#364262', shoes: '#5e3b25'
  };
  // 프레임 구성 (열): 0,1 대기 / 2~5 걷기 / 6 잽 / 7 스트레이트 / 8 발차기 / 9 피격 / 10 시전
  const HUMAN_POSES = [
    { bob: 0 }, { bob: 1 },
    { leg: 1, armL: 'back', armR: 'fwd' }, { leg: 0, bob: 1 }, { leg: -1, armL: 'fwd', armR: 'back' }, { leg: 0, bob: 1 },
    { armL: 'punch', armR: 'guard' }, { armL: 'guard', armR: 'punch' }, { kick: true, armL: 'guard', armR: 'back' },
    { hurt: true, armL: 'back', armR: 'back', bob: 1 }, { armL: 'up', armR: 'up' }
  ];
  function humanSheet(P, opt) {
    const rows = ['down', 'up', 'side'].map(dir => HUMAN_POSES.map(p => drawHuman(dir, Object.assign({ armL: 'rest', armR: 'rest' }, p), P, opt)));
    return { rows, fw: 22, fh: 26 };
  }
  SR.Art.def('player_monk', () => humanSheet(MONK));

  // NPC: 2프레임 대기 (정면)
  function npcSheet(P, opt) {
    return { rows: [[drawHuman('down', { armL: 'rest', armR: 'rest' }, P, opt), drawHuman('down', { bob: 1, armL: 'rest', armR: 'rest' }, P, opt)]], fw: 22, fh: 26 };
  }
  SR.Art.def('npc_merchant', () => npcSheet({
    hair: '#6b4426', skin: '#e9b98f', skinShade: '#c48c63', gi: '#4f7a3a', giShade: '#3a5c2a', belt: '#8a5a2b', wrap: '#e9b98f', pants: '#5a4632', shoes: '#3b2a1c'
  }, { hat: '#8b5a2b', apron: '#e8dcc0' }));
  SR.Art.def('npc_healer', () => npcSheet({
    hair: '#e7a0c4', skin: '#f6d2b5', skinShade: '#d6a786', gi: '#f4f6fb', giShade: '#b9c7dd', belt: '#4fb3a6', wrap: '#f6d2b5', pants: '#f4f6fb', shoes: '#7a8aa6'
  }, { robe: true, longHair: true, robeTrim: '#4fb3a6' }));
  SR.Art.def('npc_guard', () => npcSheet({
    hair: '#3a2a20', skin: '#e2ae84', skinShade: '#bd875f', gi: '#5a6f9c', giShade: '#41527a', belt: '#c9a24a', wrap: '#9aa3b5', pants: '#3b4766', shoes: '#2a2a35'
  }, { helmet: '#aab3c2', spear: true, armor: true }));

  // 초상화 (HUD 좌상단) 24x24
  SR.Art.def('portrait_monk', () => {
    const b = B(24, 24);
    b.rect(0, 0, 24, 24, '#3b4f7a');
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if ((x + y) % 7 === 0) b.set(x, y, '#46608f');
    const P = MONK;
    // 어깨/도복
    b.rect(3, 19, 18, 5, P.gi); b.rect(3, 19, 2, 5, P.giShade); b.rect(19, 19, 2, 5, P.giShade);
    b.rect(10, 19, 4, 3, P.skin); b.rect(11, 22, 2, 2, P.skinShade);
    // 목/머리
    b.rect(10, 16, 4, 3, P.skinShade);
    b.ellipse(12, 10, 6.5, 7, P.skin);
    b.rect(5, 2, 14, 5, P.hair); b.set(6, 1, P.hair); b.set(9, 0, P.hair); b.set(9, 1, P.hair); b.set(13, 1, P.hair); b.set(16, 0, P.hair); b.set(16, 1, P.hair);
    b.rect(5, 6, 14, 2, P.band); b.set(19, 7, P.band); b.set(20, 8, P.band); b.set(21, 8, P.band); b.set(20, 9, P.band);
    b.rect(5, 8, 1, 4, P.hair); b.rect(18, 8, 1, 4, P.hair);
    b.rect(8, 10, 2, 2, '#20141e'); b.rect(14, 10, 2, 2, '#20141e'); b.set(8, 10, '#ffffff'); b.set(14, 10, '#ffffff');
    b.rect(7, 9, 3, 1, P.hair); b.rect(14, 9, 3, 1, P.hair);
    b.rect(11, 13, 2, 1, P.skinShade); b.rect(10, 15, 4, 1, '#b25a4a');
    return { buf: b };
  });

  // ------------------------------------------------------------------
  // 펫: 꼬마 별빛 (12x12, 4프레임)
  // ------------------------------------------------------------------
  SR.Art.def('pet_star', () => {
    const frames = [0, 1, 2, 3].map(i => {
      const b = B(14, 14);
      const body = '#ffe27a', shade = '#f0b847', cheek = '#ff9eaa';
      const dy = [0, -1, 0, 1][i];
      b.ellipse(7, 7 + dy, 4.5, 4, body);
      b.set(7, 1 + dy, body); b.set(7, 2 + dy, body); b.set(6, 2 + dy, body); b.set(8, 2 + dy, body);
      b.set(1, 6 + dy, body); b.set(2, 6 + dy, body); b.set(12, 6 + dy, body); b.set(11, 6 + dy, body);
      b.rect(3, 9 + dy, 8, 2, shade);
      b.set(5, 6 + dy, '#3a2440'); b.set(9, 6 + dy, '#3a2440'); b.set(5, 5 + dy, '#3a2440'); b.set(9, 5 + dy, '#3a2440');
      b.set(4, 8 + dy, cheek); b.set(10, 8 + dy, cheek);
      b.set(6, 8 + dy, '#3a2440'); b.set(7, 9 + dy, '#3a2440'); b.set(8, 8 + dy, '#3a2440');
      // 꼬리 반짝임
      if (i % 2 === 0) { b.set(1, 11, '#fff6c2'); b.set(0, 12, '#fff6c2'); } else { b.set(2, 12, '#fff6c2'); b.set(1, 13, '#ffffff'); }
      b.outline('#6b4a1a');
      return b;
    });
    return { rows: [frames], fw: 14, fh: 14 };
  });

  // ------------------------------------------------------------------
  // 몬스터 (오른쪽을 바라봄). 프레임: 0,1 대기 / 2,3 이동 / 4 공격 / 5 피격
  // ------------------------------------------------------------------
  function monsterSheet(fw, fh, drawFrame) {
    const frames = [0, 1, 2, 3, 4, 5].map(i => { const b = B(fw, fh); drawFrame(b, i); b.outline(OUT); return b; });
    return { rows: [frames], fw, fh };
  }
  const eye = (b, x, y, hurt) => {
    if (hurt) { b.set(x, y, '#20141e'); b.set(x + 1, y + 1, '#20141e'); b.set(x + 1, y, null); }
    else { b.rect(x, y, 2, 2, '#20141e'); b.set(x, y, '#ffffff'); }
  };

  SR.Art.def('mon_jelly', () => monsterSheet(20, 18, (b, i) => {
    const body = '#5fb8e8', shade = '#3a86c2', light = '#bfe9ff';
    const sq = [0, 1, -1, 0, 0, 2][i];   // 찌그러짐
    const lift = [0, 0, 3, 1, 0, 0][i];
    const lean = i === 4 ? 2 : 0;
    const cx = 10 + lean, cy = 11 - lift + sq * 0.5;
    b.ellipse(cx, cy, 7 + sq * 0.6, 5.5 - sq * 0.5, body);
    b.ellipse(cx, cy + 2, 6 + sq * 0.6, 2.5, shade);
    b.ellipse(cx, cy - 0.5, 6 + sq * 0.6, 3.5, body);
    b.rect(cx - 4, cy - 4, 3, 2, light); b.set(cx - 5, cy - 2, light);
    eye(b, cx + 1, cy - 1, i === 5); eye(b, cx + 4, cy - 1, i === 5);
    b.set(cx + 3, cy + 2, '#20141e');
    if (i === 4) { b.rect(cx + 7, cy - 1, 2, 2, body); }
  }));

  SR.Art.def('mon_turtle', () => monsterSheet(26, 20, (b, i) => {
    const shell = '#7a8a3c', shellD = '#5a6a2a', spike = '#e8dcc0', skin = '#9cc46a', skinD = '#6e9a46';
    const step = [0, 0, 1, -1, 0, 0][i];
    const dy = i === 1 ? 1 : 0;
    const head = i === 4 ? 4 : i === 5 ? -1 : 0;
    // 다리
    b.rect(6 + step, 15, 3, 3, skinD); b.rect(16 - step, 15, 3, 3, skinD);
    b.rect(9 - step, 15, 3, 3, skin); b.rect(19 + step, 15, 3, 3, skin);
    // 머리
    b.ellipse(21 + head, 11 + dy, 3, 2.5, skin); eye(b, 22 + head, 10 + dy, i === 5);
    b.set(24 + head, 12 + dy, skinD);
    // 등껍질
    b.ellipse(12, 11 + dy, 9, 6, shell);
    b.rect(3, 13 + dy, 19, 3, shellD);
    for (let k = 0; k < 4; k++) { const x = 6 + k * 4; b.set(x, 5 + dy - (k % 2), spike); b.set(x, 6 + dy, spike); b.set(x + 1, 6 + dy, spike); }
    b.rect(8, 9 + dy, 3, 2, '#9aab52'); b.rect(13, 8 + dy, 3, 2, '#9aab52');
  }));

  SR.Art.def('mon_bat', () => monsterSheet(26, 20, (b, i) => {
    const body = '#4a3a6a', bodyD = '#332650', wing = '#5e4a86', wingD = '#3d2f5c';
    const flap = [0, 1, 0, 1, 2, 0][i];
    const dy = [0, 1, -1, 0, 0, 0][i];
    const cx = 13, cy = 9 + dy;
    if (flap === 0) {
      b.line(cx - 2, cy, cx - 11, cy - 6, wing); b.line(cx - 2, cy + 1, cx - 11, cy - 5, wing);
      b.line(cx - 11, cy - 5, cx - 9, cy + 2, wingD); b.line(cx - 8, cy - 3, cx - 6, cy + 3, wingD);
      b.line(cx + 2, cy, cx + 11, cy - 6, wing); b.line(cx + 2, cy + 1, cx + 11, cy - 5, wing);
      b.line(cx + 11, cy - 5, cx + 9, cy + 2, wingD); b.line(cx + 8, cy - 3, cx + 6, cy + 3, wingD);
      b.ellipse(cx - 6, cy - 1, 3, 1.5, wing); b.ellipse(cx + 6, cy - 1, 3, 1.5, wing);
    } else {
      b.line(cx - 2, cy + 1, cx - 11, cy + 6, wing); b.line(cx - 2, cy, cx - 10, cy + 5, wing);
      b.line(cx + 2, cy + 1, cx + 11, cy + 6, wing); b.line(cx + 2, cy, cx + 10, cy + 5, wing);
      b.ellipse(cx - 6, cy + 3, 3, 1.5, wingD); b.ellipse(cx + 6, cy + 3, 3, 1.5, wingD);
    }
    b.ellipse(cx, cy + 1, 3.5, 4, body); b.rect(cx - 3, cy + 3, 7, 2, bodyD);
    b.set(cx - 2, cy - 4, body); b.set(cx - 3, cy - 5, body); b.set(cx + 2, cy - 4, body); b.set(cx + 3, cy - 5, body);
    b.set(cx - 1, cy, i === 5 ? '#ffffff' : '#ff5a6a'); b.set(cx + 2, cy, i === 5 ? '#ffffff' : '#ff5a6a');
    if (flap === 2) { b.set(cx + 1, cy + 3, '#ffffff'); b.set(cx + 3, cy + 3, '#ffffff'); }
  }));

  SR.Art.def('mon_golem', () => monsterSheet(26, 30, (b, i) => {
    const st = '#8a8478', stD = '#615c53', stL = '#aaa497', rune = '#5ff0e0';
    const dy = i === 1 ? 1 : 0;
    const step = [0, 0, 1, -1, 0, 0][i];
    const arm = i === 4 ? 5 : 0;
    // 다리
    b.rect(7 + step, 23, 5, 5, stD); b.rect(14 - step, 23, 5, 5, stD);
    // 몸통
    b.rect(5, 11 + dy, 16, 13, st); b.rect(5, 20 + dy, 16, 4, stD); b.rect(6, 11 + dy, 14, 2, stL);
    b.rect(11, 15 + dy, 4, 4, rune); b.set(12, 16 + dy, '#ffffff');
    // 머리
    b.rect(8, 4 + dy, 10, 8, st); b.rect(8, 4 + dy, 10, 2, stL);
    b.rect(14, 7 + dy, 3, 2, i === 5 ? '#ffffff' : rune);
    // 팔 (뒤/앞)
    b.rect(1, 12 + dy, 4, 9, stD); b.rect(0, 20 + dy, 5, 4, stD);
    b.rect(19 + arm, 12 + dy - (arm ? 2 : 0), 5, 9, st); b.rect(19 + arm, 20 + dy - (arm ? 2 : 0), 6, 4, stL);
    b.set(9, 14 + dy, stD); b.set(17, 21 + dy, stD); b.set(7, 18 + dy, stD);
  }));

  // 정예: 늪지기 바르곤 (42x40)
  SR.Art.def('mon_bogkeeper', () => monsterSheet(44, 42, (b, i) => {
    const sk = '#5f8a4a', skD = '#3f6634', skL = '#86b268', moss = '#2e4a26', horn = '#e6dcc0', eyeC = '#ffe066';
    const dy = [0, 1, 0, 1, -1, 0][i];
    const step = [0, 0, 2, -2, 0, 0][i];
    const smash = i === 4;
    // 다리
    b.rect(12 + step, 32, 7, 8, skD); b.rect(24 - step, 32, 7, 8, skD);
    b.rect(10 + step, 38, 10, 2, moss); b.rect(23 - step, 38, 10, 2, moss);
    // 몸통
    b.ellipse(21, 23 + dy, 14, 11, sk);
    b.ellipse(21, 27 + dy, 12, 7, skL);
    b.ellipse(21, 17 + dy, 13, 5, skD);
    for (let k = 0; k < 6; k++) b.rect(9 + k * 4, 14 + dy + (k % 2), 3, 3, moss);
    // 머리
    b.ellipse(30, 13 + dy, 8, 7, sk);
    b.rect(26, 17 + dy, 11, 3, skD);
    b.rect(31, 18 + dy, 2, 2, horn); b.rect(35, 18 + dy, 2, 2, horn); // 송곳니
    b.rect(30, 10 + dy, 3, 2, i === 5 ? '#ffffff' : eyeC); b.rect(34, 10 + dy, 2, 2, i === 5 ? '#ffffff' : eyeC);
    // 뿔
    b.line(26, 7 + dy, 22, 1 + dy, horn); b.line(27, 7 + dy, 23, 1 + dy, horn); b.line(32, 6 + dy, 35, 0 + dy, horn); b.line(33, 6 + dy, 36, 0 + dy, horn);
    // 팔
    if (smash) {
      b.rect(30, 4, 6, 14, sk); b.ellipse(33, 4, 5, 4, skD);
      b.rect(4, 20 + dy, 6, 12, skD); b.ellipse(7, 32 + dy, 5, 4, skD);
    } else {
      b.rect(4, 19 + dy, 6, 12, skD); b.ellipse(7, 31 + dy, 5, 4, skD);
      b.rect(33, 21 + dy, 6, 11, sk); b.ellipse(36, 32 + dy, 5, 4, sk);
    }
  }));

  // 정예: 성소 수호자 카르논 (40x48)
  SR.Art.def('mon_sentinel', () => monsterSheet(42, 50, (b, i) => {
    const ar = '#6c7ea8', arD = '#4a5878', arL = '#9cb0d8', gold = '#e0b84a', core = '#6ff2ff', cloth = '#3a2a5e';
    const dy = [0, 1, 0, 1, -1, 0][i];
    const step = [0, 0, 2, -2, 0, 0][i];
    const strike = i === 4;
    // 망토
    b.rect(10, 18 + dy, 20, 22, cloth); b.rect(9, 36 + dy, 22, 4, C.shade(cloth, -0.3));
    // 다리
    b.rect(13 + step, 38, 6, 10, arD); b.rect(22 - step, 38, 6, 10, arD);
    b.rect(12 + step, 46, 8, 2, gold); b.rect(21 - step, 46, 8, 2, gold);
    // 몸통 갑옷
    b.rect(11, 17 + dy, 19, 18, ar); b.rect(11, 17 + dy, 19, 3, arL); b.rect(11, 31 + dy, 19, 4, arD);
    b.rect(18, 22 + dy, 5, 5, core); b.set(19, 23 + dy, '#ffffff');
    b.rect(11, 29 + dy, 19, 1, gold);
    // 어깨
    b.ellipse(10, 18 + dy, 5, 4, arL); b.ellipse(31, 18 + dy, 5, 4, arL);
    // 투구
    b.rect(15, 5 + dy, 12, 12, ar); b.rect(15, 5 + dy, 12, 3, arL); b.rect(17, 10 + dy, 9, 2, '#14101e');
    b.rect(19, 10 + dy, 2, 2, i === 5 ? '#ffffff' : core); b.rect(23, 10 + dy, 2, 2, i === 5 ? '#ffffff' : core);
    b.rect(20, 1 + dy, 2, 5, gold); b.rect(18, 2 + dy, 6, 1, gold);
    // 무기 (도끼창)
    if (strike) {
      b.line(30, 24, 40, 6, '#7b5534'); b.line(31, 24, 41, 6, '#7b5534');
      b.rect(35, 2, 6, 6, '#d9dde4'); b.rect(35, 2, 6, 1, '#ffffff');
    } else {
      b.rect(34, 6 + dy, 2, 40, '#7b5534');
      b.rect(32, 4 + dy, 7, 7, '#d9dde4'); b.rect(32, 4 + dy, 7, 1, '#ffffff'); b.set(35, 2 + dy, '#d9dde4'); b.set(35, 3 + dy, '#d9dde4');
    }
    b.rect(31, 20 + dy, 5, 8, ar);
  }));

  // ------------------------------------------------------------------
  // 타일셋: 16x16 타일 16종 x 테마 2종 (light / dark)
  // 0 풀 1 꽃풀 2 풀3 3 석판 4 이끼석판 5 흙 6 자갈 7 자갈2 8 고지석판 9 고지이끼
  // 10 벽면 11 벽면(물) 12 계단 13 석조 턱(물 위) 14 흙둑(물 위) 15 바위(통행불가)
  // ------------------------------------------------------------------
  const THEMES = {
    light: {
      grass: '#5fa54a', grassD: '#4d8c3c', grassL: '#7cc25c', flower1: '#fff4c8', flower2: '#ffcf5a',
      floor: '#8f9189', floorD: '#6f716a', floorL: '#a8aaa1', moss: '#6b8f45', mossD: '#557536',
      dirt: '#a07a4f', dirtD: '#86643f', dirtL: '#b8916a',
      cobble: '#b3a68e', cobbleD: '#857a66', cobbleL: '#cdc1a8',
      high: '#b9bcb0', highD: '#94978c', highL: '#d6d8ce',
      wall: '#6f726b', wallD: '#4e514c', wallL: '#9a9d94', water: '#2f7fa8', foam: '#cfefff',
      rock: '#4d4a46', rockL: '#6a6660'
    },
    dark: {
      grass: '#3c5a52', grassD: '#2e4842', grassL: '#4c6e64', flower1: '#a4c8ff', flower2: '#7aa0e0',
      floor: '#5c6278', floorD: '#434860', floorL: '#727992', moss: '#3d6b6a', mossD: '#2d5251',
      dirt: '#5a5266', dirtD: '#463f52', dirtL: '#6c637a',
      cobble: '#6a6a86', cobbleD: '#4a4a62', cobbleL: '#80809e',
      high: '#7a809c', highD: '#5c627c', highL: '#959bb6',
      wall: '#3f4358', wallD: '#2b2e3e', wallL: '#5d6280', water: '#1d3f6b', foam: '#9ec4ff',
      rock: '#2a2a36', rockL: '#3c3c4c'
    }
  };
  function drawTile(idx, T, rnd) {
    const b = B(16, 16);
    const speck = (n, c) => { for (let k = 0; k < n; k++) b.set(Math.floor(rnd() * 16), Math.floor(rnd() * 16), c); };
    const slabs = (base, D, L, size) => {
      b.rect(0, 0, 16, 16, base);
      for (let y = 0; y < 16; y += size) {
        const off = ((y / size) % 2) * (size / 2);
        b.rect(0, y, 16, 1, D);
        for (let x = -size; x < 16; x += size) {
          const sx = x + off;
          b.rect(sx, y, 1, size, D);
          b.rect(sx + 1, y + 1, size - 2, 1, L);
        }
      }
    };
    switch (idx) {
      case 0: case 1: case 2:
        b.rect(0, 0, 16, 16, T.grass); speck(22, T.grassD); speck(10, T.grassL);
        for (let k = 0; k < 3; k++) { const x = 1 + Math.floor(rnd() * 13), y = 2 + Math.floor(rnd() * 12); b.set(x, y, T.grassL); b.set(x + 2, y, T.grassL); b.set(x + 1, y + 1, T.grassD); }
        if (idx === 1) for (let k = 0; k < 3; k++) { const x = 2 + Math.floor(rnd() * 12), y = 2 + Math.floor(rnd() * 12); b.set(x, y, k % 2 ? T.flower2 : T.flower1); b.set(x + 1, y, T.flower1); b.set(x, y + 1, T.flower1); }
        if (idx === 2) { speck(14, T.grassD); }
        break;
      case 3: case 4:
        slabs(T.floor, T.floorD, T.floorL, 8); speck(10, T.floorD);
        if (idx === 4) { for (let k = 0; k < 3; k++) b.ellipse(2 + rnd() * 12, 2 + rnd() * 12, 1.5 + rnd() * 1.5, 1 + rnd(), k ? T.moss : T.mossD); }
        break;
      case 5:
        b.rect(0, 0, 16, 16, T.dirt); speck(24, T.dirtD); speck(10, T.dirtL);
        for (let k = 0; k < 3; k++) { const x = Math.floor(rnd() * 15), y = Math.floor(rnd() * 15); b.rect(x, y, 2, 1, T.cobbleL); b.set(x, y + 1, T.dirtD); }
        break;
      case 6: case 7:
        b.rect(0, 0, 16, 16, T.cobbleD);
        for (let y = 0; y < 16; y += 4) {
          const off = (y / 4) % 2 ? 2 : 0;
          for (let x = -4; x < 16; x += 4) {
            const c = rnd() < 0.2 ? C.shade(T.cobble, -0.08) : T.cobble;
            b.rect(x + off + 0, y, 3, 3, c); b.set(x + off, y, T.cobbleL); b.set(x + off + 1, y, T.cobbleL);
          }
        }
        if (idx === 7) speck(6, T.moss);
        break;
      case 8: case 9:
        b.rect(0, 0, 16, 16, T.high);
        b.rect(0, 0, 16, 1, T.highL); b.rect(0, 0, 1, 16, T.highL);
        b.rect(0, 15, 16, 1, T.highD); b.rect(15, 0, 1, 16, T.highD);
        b.rect(7, 1, 1, 14, T.highD); b.rect(8, 1, 1, 14, T.highL);
        speck(8, T.highD);
        if (idx === 9) { b.ellipse(3 + rnd() * 10, 3 + rnd() * 10, 2, 1.5, T.moss); b.ellipse(3 + rnd() * 10, 3 + rnd() * 10, 1.5, 1, T.mossD); }
        break;
      case 10: case 11:
        b.rect(0, 0, 16, 16, T.wall);
        b.rect(0, 0, 16, 2, T.wallL);
        for (let y = 2; y < 16; y += 4) {
          b.rect(0, y + 3, 16, 1, T.wallD);
          const off = ((y - 2) / 4) % 2 ? 4 : 0;
          for (let x = off; x < 16; x += 8) b.rect(x, y, 1, 3, T.wallD);
        }
        for (let k = 0; k < 2; k++) { const x = Math.floor(rnd() * 14); const l = 2 + Math.floor(rnd() * 4); b.rect(x, 2, 1, l, T.moss); b.rect(x + 1, 2, 1, Math.max(1, l - 2), T.mossD); }
        b.rect(0, 14, 16, 2, T.wallD);
        if (idx === 11) { b.rect(0, 13, 16, 3, T.water); for (let x = 0; x < 16; x += 3) b.set(x + Math.floor(rnd() * 2), 13, T.foam); }
        break;
      case 12:
        b.rect(0, 0, 16, 16, T.wallD);
        for (let y = 0; y < 16; y += 4) { b.rect(1, y, 14, 2, T.highL); b.rect(1, y + 2, 14, 2, T.high); b.rect(1, y + 3, 14, 1, T.highD); }
        b.rect(0, 0, 1, 16, T.wallD); b.rect(15, 0, 1, 16, T.wallD);
        break;
      case 13:
        b.rect(0, 0, 16, 5, T.wall); b.rect(0, 0, 16, 1, T.wallL);
        for (let x = 3; x < 16; x += 6) b.rect(x, 1, 1, 4, T.wallD);
        b.rect(0, 5, 16, 1, T.wallD);
        for (let x = 0; x < 16; x += 2) if (rnd() < 0.7) b.set(x, 6, T.foam);
        break;
      case 14:
        b.rect(0, 0, 16, 4, T.dirt); b.rect(0, 0, 16, 1, T.grassD); speck(0, T.dirtD);
        for (let x = 0; x < 16; x += 3) b.set(x, 2, T.dirtD);
        b.rect(0, 4, 16, 1, T.dirtD);
        for (let x = 0; x < 16; x += 2) if (rnd() < 0.7) b.set(x, 5, T.foam);
        break;
      case 15:
        b.rect(0, 0, 16, 16, T.rock); speck(30, T.rockL);
        break;
    }
    return b;
  }
  SR.Art.def('tiles', () => {
    const rows = ['light', 'dark'].map((name, r) => {
      const T = THEMES[name];
      const row = [];
      for (let i = 0; i < 16; i++) row.push(drawTile(i, T, SR.seeded(1000 + i * 31 + r * 7)));
      return row;
    });
    return { rows, fw: 16, fh: 16 };
  });
  SR.Art.TILE = {
    grass: 0, grass2: 1, grass3: 2, floor: 3, floorMoss: 4, dirt: 5, cobble: 6, cobble2: 7,
    high: 8, highMoss: 9, wall: 10, wallWater: 11, stairs: 12, ledgeStone: 13, ledgeBank: 14, rock: 15
  };

  // 물 배경 (32x32, 반복 타일)
  function waterBuf(T, seed, glint) {
    const b = B(32, 32);
    const rnd = SR.seeded(seed);
    if (!glint) {
      b.rect(0, 0, 32, 32, T.water);
      for (let k = 0; k < 18; k++) {
        const x = Math.floor(rnd() * 32), y = Math.floor(rnd() * 32), l = 2 + Math.floor(rnd() * 4);
        for (let i = 0; i < l; i++) b.set((x + i) % 32, y, C.shade(T.water, 0.18));
        b.set((x + 1) % 32, (y + 1) % 32, C.shade(T.water, -0.18));
      }
    } else {
      for (let k = 0; k < 7; k++) {
        const x = Math.floor(rnd() * 32), y = Math.floor(rnd() * 32);
        b.set(x, y, 'rgba(255,255,255,0.75)'); b.set((x + 1) % 32, y, 'rgba(220,245,255,0.5)');
      }
    }
    return b;
  }
  SR.Art.def('water_light', () => ({ buf: waterBuf(THEMES.light, 77) }));
  SR.Art.def('water_dark', () => ({ buf: waterBuf(THEMES.dark, 78) }));
  SR.Art.def('water_glint', () => ({ buf: waterBuf(THEMES.light, 99, true) }));

  // ------------------------------------------------------------------
  // 장식 오브젝트
  // ------------------------------------------------------------------
  function pillar(broken, dark) {
    const T = dark ? THEMES.dark : THEMES.light;
    const h = broken ? 24 : 42;
    const b = B(16, h);
    const st = T.highL, stD = T.highD, stM = T.high;
    // 받침
    b.rect(1, h - 5, 14, 5, stM); b.rect(1, h - 5, 14, 1, st); b.rect(1, h - 1, 14, 1, stD);
    // 기둥
    const top = broken ? 6 : 6;
    b.rect(3, top, 10, h - 5 - top, stM);
    b.rect(3, top, 2, h - 5 - top, st); b.rect(11, top, 2, h - 5 - top, stD);
    b.rect(7, top, 1, h - 5 - top, stD);
    // 주두
    if (!broken) { b.rect(1, 2, 14, 4, stM); b.rect(1, 2, 14, 1, st); b.rect(2, 5, 12, 1, stD); b.rect(0, 1, 16, 1, st); }
    else { b.set(3, top - 1, stM); b.set(4, top - 2, stM); b.set(8, top - 1, stM); b.set(11, top - 1, stM); b.set(12, top - 2, stM); }
    // 이끼
    const rnd = SR.seeded(broken ? 5 : 9);
    for (let k = 0; k < 4; k++) { const x = 3 + Math.floor(rnd() * 9), y = top + Math.floor(rnd() * (h - top - 8)); b.rect(x, y, 2, 2 + Math.floor(rnd() * 3), T.moss); }
    b.outline(OUT);
    return b;
  }
  SR.Art.def('pillar', () => ({ buf: pillar(false) }));
  SR.Art.def('pillar_dark', () => ({ buf: pillar(false, true) }));
  SR.Art.def('pillar_broken', () => ({ buf: pillar(true) }));
  SR.Art.def('pillar_broken_dark', () => ({ buf: pillar(true, true) }));

  SR.Art.def('brazier', () => {
    const b = B(12, 22);
    const iron = '#3d3a44', ironL = '#6a6676';
    b.rect(5, 8, 2, 12, iron); b.rect(5, 8, 1, 12, ironL);
    b.rect(2, 19, 8, 2, iron); b.rect(3, 18, 6, 1, iron);
    b.rect(1, 4, 10, 4, iron); b.rect(1, 4, 10, 1, ironL); b.rect(2, 8, 8, 1, iron);
    b.rect(2, 3, 8, 1, '#ffb347');
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('flame', () => {
    const frames = [0, 1, 2, 3].map(i => {
      const b = B(10, 14);
      const sway = [0, 1, 0, -1][i];
      const hgt = [10, 11, 9, 11][i];
      for (let y = 0; y < hgt; y++) {
        const t = y / hgt;
        const w = Math.max(1, Math.round((1 - Math.abs(t - 0.65) * 1.3) * 4));
        const x = 5 + Math.round(sway * (1 - t));
        const c = t < 0.35 ? '#fff3b0' : t < 0.6 ? '#ffd24a' : t < 0.85 ? '#ff8a2a' : '#e0452a';
        b.rect(x - w, 13 - hgt + y + 1 - 1, w * 2, 1, null);
        for (let xx = x - Math.floor(w * (y / hgt + 0.3)); xx <= x + Math.floor(w * (y / hgt + 0.3)) - 1; xx++) b.set(xx, 13 - hgt + y, c);
      }
      b.set(5 + sway, 13 - hgt - 1, '#ffb347');
      return b;
    });
    return { rows: [frames], fw: 10, fh: 14 };
  });

  SR.Art.def('tree', () => {
    const b = B(26, 36);
    const leaf = '#3f8a46', leafD = '#2d6a35', leafL = '#5fb25e', trunk = '#6b4a2e', trunkD = '#4e3420';
    b.rect(11, 24, 5, 11, trunk); b.rect(11, 24, 2, 11, trunkD); b.rect(9, 33, 9, 2, trunkD);
    b.ellipse(13, 14, 11, 10, leafD);
    b.ellipse(12, 12, 10, 8.5, leaf);
    b.ellipse(9, 8, 5, 4, leafL);
    b.ellipse(17, 11, 3, 3, leafL);
    const rnd = SR.seeded(44);
    for (let k = 0; k < 14; k++) b.set(3 + Math.floor(rnd() * 20), 4 + Math.floor(rnd() * 18), leafD);
    b.set(6, 16, '#e05a5a'); b.set(16, 17, '#e05a5a'); b.set(12, 6, '#e05a5a');
    b.outline(OUT);
    return { buf: b };
  });

  SR.Art.def('house', () => {
    const variants = [['#b5463c', '#8c3029'], ['#3f6fb0', '#2c4f84'], ['#5f8f3c', '#45692a']];
    const frames = variants.map(([roof, roofD], v) => {
      const b = B(64, 62);
      const wall = '#e9dcc0', wallD = '#c4b393', wood = '#7a5232', woodD = '#553823', stone = '#9a958a';
      // 벽
      b.rect(4, 30, 56, 30, wall); b.rect(4, 30, 56, 2, wallD);
      for (let x = 4; x < 60; x += 14) b.rect(x, 30, 2, 30, wood);
      b.rect(4, 44, 56, 2, wood);
      b.rect(2, 57, 60, 5, stone); b.rect(2, 57, 60, 1, '#b8b3a6');
      // 문
      b.rect(26, 42, 12, 15, woodD); b.rect(27, 43, 10, 14, wood); b.rect(31, 43, 2, 14, woodD); b.set(35, 50, '#e8c35a');
      // 창문
      [[10, 35], [44, 35]].forEach(([x, y]) => { b.rect(x, y, 10, 8, woodD); b.rect(x + 1, y + 1, 8, 6, '#ffe7a3'); b.rect(x + 5, y + 1, 1, 6, woodD); b.rect(x + 1, y + 4, 8, 1, woodD); });
      // 지붕
      for (let y = 0; y < 30; y++) {
        const inset = Math.max(0, 22 - y);
        const x0 = 0 + Math.floor(inset * 1.2) - 0, x1 = 64 - Math.floor(inset * 1.2);
        b.rect(x0, y + 4, x1 - x0, 1, (y % 4 === 3) ? roofD : roof);
      }
      b.rect(0, 33, 64, 2, roofD);
      b.rect(26, 4, 12, 2, C.shade(roof, 0.25));
      // 굴뚝
      b.rect(46, 4, 6, 12, stone); b.rect(46, 4, 6, 2, '#b8b3a6');
      // 간판
      if (v === 0) { b.rect(40, 46, 14, 7, wood); b.rect(42, 48, 10, 3, '#e8c35a'); }
      b.outline(OUT);
      return b;
    });
    return { rows: [frames], fw: 64, fh: 62 };
  });

  SR.Art.def('fountain', () => {
    const frames = [0, 1].map(i => {
      const b = B(48, 40);
      const st = '#c9c6bb', stD = '#9a978c', stL = '#e6e3d8', w = '#4aa3d6', wL = '#a9e2ff';
      // 바닥 수반
      b.ellipse(24, 28, 23, 10, stD);
      b.ellipse(24, 26, 23, 10, st);
      b.ellipse(24, 25, 20, 7.5, w);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + i * 0.4; b.set(24 + Math.cos(a) * 14, 25 + Math.sin(a) * 5, wL); }
      b.rect(2, 27, 44, 2, stD);
      // 기둥
      b.rect(20, 10, 8, 16, st); b.rect(20, 10, 2, 16, stL); b.rect(26, 10, 2, 16, stD);
      b.ellipse(24, 10, 8, 3, st); b.ellipse(24, 9, 6, 2, w);
      // 물줄기
      const s = i ? 1 : 0;
      b.rect(23, 1 + s, 2, 8, wL); b.set(21, 3 + s, wL); b.set(26, 4 - s, wL); b.set(19, 6, w); b.set(29, 6, w);
      b.line(18, 8, 14, 18 + s, w); b.line(30, 8, 34, 18 - s + 1, w);
      b.outline(OUT);
      return b;
    });
    return { rows: [frames], fw: 48, fh: 40 };
  });

  SR.Art.def('lamp', () => {
    const b = B(10, 30);
    b.rect(4, 8, 2, 20, '#3d3a44'); b.rect(2, 27, 6, 2, '#3d3a44');
    b.rect(2, 2, 6, 7, '#3d3a44'); b.rect(3, 3, 4, 5, '#ffe28a'); b.rect(1, 1, 8, 1, '#3d3a44');
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('crate', () => {
    const b = B(14, 14);
    b.rect(0, 2, 14, 12, '#a0703f'); b.rect(0, 2, 14, 1, '#c08a52'); b.rect(0, 13, 14, 1, '#6e4a26');
    b.line(1, 3, 12, 12, '#6e4a26'); b.rect(0, 7, 14, 1, '#6e4a26'); b.rect(0, 2, 1, 12, '#6e4a26'); b.rect(13, 2, 1, 12, '#6e4a26');
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('signpost', () => {
    const b = B(18, 22);
    b.rect(8, 6, 2, 16, '#6e4a26'); b.rect(1, 3, 16, 7, '#a0703f'); b.rect(1, 3, 16, 1, '#c08a52');
    b.rect(3, 5, 10, 1, '#5a3a1e'); b.rect(3, 7, 7, 1, '#5a3a1e'); b.set(16, 6, '#c08a52'); b.set(17, 6, '#a0703f');
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('well', () => {
    const b = B(30, 32);
    const st = '#9a958a', stL = '#bdb8ac', stD = '#6e6a62', wood = '#7a5232';
    b.rect(3, 4, 2, 16, wood); b.rect(25, 4, 2, 16, wood); b.rect(1, 2, 28, 3, '#8c3029'); b.rect(1, 2, 28, 1, '#b5463c');
    b.rect(13, 5, 1, 9, '#3d3a44'); b.rect(11, 13, 5, 4, wood);
    b.ellipse(15, 22, 13, 6, stD); b.ellipse(15, 21, 13, 6, st); b.ellipse(15, 20, 10, 4, '#1d3f6b');
    b.rect(2, 21, 26, 9, st); b.rect(2, 21, 26, 1, stL);
    for (let x = 4; x < 28; x += 6) b.rect(x, 22, 1, 8, stD);
    b.rect(2, 25, 26, 1, stD);
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('statue', () => {
    const b = B(18, 36);
    const st = '#b9bcb0', stD = '#8a8d82', stL = '#dcded4';
    b.rect(1, 28, 16, 8, stD); b.rect(1, 28, 16, 2, st);
    b.ellipse(9, 7, 4, 4, st); b.rect(5, 11, 8, 12, st); b.rect(5, 11, 2, 12, stL); b.rect(11, 11, 2, 12, stD);
    b.rect(3, 13, 2, 7, st); b.rect(13, 12, 2, 4, st); b.rect(14, 9, 3, 3, stL);
    b.rect(6, 23, 3, 5, stD); b.rect(10, 23, 3, 5, stD);
    b.rect(5, 6, 8, 1, stD);
    b.rect(5, 15, 8, 1, '#6b8f45'); b.set(12, 4, '#6b8f45');
    b.outline(OUT);
    return { buf: b };
  });
  SR.Art.def('altar', () => {
    const frames = [0, 1].map(i => {
      const b = B(32, 34);
      const st = '#7a809c', stD = '#5c627c', stL = '#959bb6', crys = i ? '#8ff8ff' : '#5ff0e0';
      b.rect(2, 22, 28, 12, stD); b.rect(2, 22, 28, 2, st); b.rect(4, 18, 24, 5, st); b.rect(4, 18, 24, 1, stL);
      b.rect(10, 26, 12, 4, '#3a2a5e'); b.rect(14, 27, 4, 2, crys);
      // 크리스탈
      b.line(16, 2, 11, 11, crys); b.line(16, 2, 21, 11, crys);
      for (let y = 3; y < 17; y++) { const w = y < 11 ? Math.floor((y - 2) * 0.6) : Math.floor((17 - y) * 0.9); b.rect(16 - w, y, w * 2 + 1, 1, y % 3 === 0 ? '#c8ffff' : crys); }
      b.rect(15, 5, 1, 8, '#ffffff');
      b.outline(OUT);
      return b;
    });
    return { rows: [frames], fw: 32, fh: 34 };
  });
  SR.Art.def('portal', () => {
    const frames = [0, 1, 2, 3].map(i => {
      const b = B(36, 18);
      b.ellipse(18, 9, 17, 8, 'rgba(120,220,255,0.25)');
      b.ring(18, 9, 16, '#7fe8ff', 1);
      for (let y = 0; y < 18; y++) for (let x = 0; x < 36; x++) {
        const dx = (x - 18) / 16, dy = (y - 9) / 7.5; const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.93 && d < 1.08) b.set(x, y, '#7fe8ff');
        if (d > 0.55 && d < 0.66) b.set(x, y, '#b9f4ff');
      }
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + i * (Math.PI / 12);
        b.rect(18 + Math.cos(a) * 12.5 - 1, 9 + Math.sin(a) * 5.6 - 0.5, 2, 1, '#ffffff');
      }
      return b;
    });
    return { rows: [frames], fw: 36, fh: 18 };
  });

  // ------------------------------------------------------------------
  // 이펙트
  // ------------------------------------------------------------------
  SR.Art.def('shadow', () => { const b = B(16, 6); b.ellipse(8, 3, 7.5, 2.6, 'rgba(10,6,20,0.38)'); return { buf: b }; });
  SR.Art.def('px', () => { const b = B(2, 2); b.rect(0, 0, 2, 2, '#ffffff'); return { buf: b }; });
  SR.Art.def('spark', () => {
    const frames = [0, 1, 2, 3].map(i => {
      const b = B(16, 16);
      const r = [3, 6, 7, 7][i];
      const c = ['#ffffff', '#fff3b0', '#ffd24a', '#ff9a3a'][i];
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        const len = k % 2 ? r * 0.6 : r;
        const inner = i >= 2 ? r * 0.5 : 0;
        b.line(8 + Math.cos(a) * inner, 8 + Math.sin(a) * inner, 8 + Math.cos(a) * len, 8 + Math.sin(a) * len, c);
      }
      if (i < 2) b.circle(8, 8, 2 - i, '#ffffff');
      return b;
    });
    return { rows: [frames], fw: 16, fh: 16 };
  });
  SR.Art.def('ring', () => { const b = B(32, 32); b.ring(16, 16, 15, '#ffffff', 2); return { buf: b }; });
  SR.Art.def('disc', () => { const b = B(32, 32); b.circle(16, 16, 15, 'rgba(255,255,255,0.55)'); b.ring(16, 16, 15, '#ffffff', 1); return { buf: b }; });
  SR.Art.def('dust', () => {
    const frames = [0, 1, 2].map(i => { const b = B(10, 10); b.circle(5, 5, 2 + i, ['#e8e0d0', '#cfc6b4', 'rgba(180,170,150,0.6)'][i]); return b; });
    return { rows: [frames], fw: 10, fh: 10 };
  });
  SR.Art.def('flame_p', () => { const b = B(6, 6); b.circle(3, 3, 2.4, '#ffd24a'); b.circle(3, 3, 1.2, '#fff6c8'); return { buf: b }; });
  SR.Art.def('orb', () => { const b = B(12, 12); b.circle(6, 6, 5, '#7fd8ff'); b.circle(6, 6, 3, '#d9f6ff'); b.circle(5, 5, 1, '#ffffff'); return { buf: b }; });
  SR.Art.def('crescent', () => {
    const b = B(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d1 = Math.hypot(x - 16, y - 16), d2 = Math.hypot(x - 19, y - 13);
      if (d1 < 15 && d2 > 12) b.set(x, y, d1 > 13 ? '#ffffff' : 'rgba(200,240,255,0.7)');
    }
    return { buf: b };
  });
  SR.Art.def('fist_fx', () => {
    const b = B(12, 12);
    b.circle(6, 6, 5, 'rgba(255,240,200,0.6)'); b.rect(3, 4, 6, 5, '#fff6dc'); b.rect(3, 4, 6, 1, '#ffffff'); b.rect(4, 5, 1, 3, '#e8c890'); b.rect(6, 5, 1, 3, '#e8c890');
    return { buf: b };
  });
  // 부드러운 광원 (가산 혼합용)
  SR.Art.def('glow', () => ({
    w: 128, h: 128, raw: true, draw(ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
  }));
  SR.Art.def('beam', () => ({
    w: 48, h: 256, raw: true, draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 48, 0);
      g.addColorStop(0, 'rgba(255,240,160,0)'); g.addColorStop(0.5, 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,240,160,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 48, 256);
      const v = ctx.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.3, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = v; ctx.fillRect(0, 0, 48, 256);
      ctx.globalCompositeOperation = 'source-over';
    }
  }));

  // ------------------------------------------------------------------
  // UI 아이콘
  // ------------------------------------------------------------------
  SR.Art.def('icon_event', () => {
    const b = B(16, 16);
    b.rect(2, 6, 12, 9, '#d8343f'); b.rect(1, 4, 14, 3, '#ef5a5a'); b.rect(7, 4, 2, 11, '#ffd24a');
    b.line(8, 4, 4, 1, '#ffd24a'); b.line(8, 4, 12, 1, '#ffd24a'); b.set(4, 2, '#ffd24a'); b.set(12, 2, '#ffd24a');
    b.rect(2, 7, 12, 1, '#a82632');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_shop', () => {
    const b = B(16, 16);
    b.ellipse(8, 10, 6, 5, '#c08a52'); b.rect(5, 3, 6, 3, '#a0703f'); b.rect(4, 5, 8, 1, '#6e4a26');
    b.circle(8, 10, 2.5, '#ffd24a'); b.rect(8, 8, 1, 5, '#a07a1a');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_map', () => {
    const b = B(16, 16);
    b.rect(1, 3, 14, 11, '#e8dcb0'); b.rect(1, 3, 1, 11, '#c4b383'); b.rect(14, 3, 1, 11, '#c4b383');
    b.line(3, 6, 7, 9, '#7a5232'); b.line(7, 9, 11, 6, '#7a5232'); b.line(11, 6, 12, 11, '#7a5232');
    b.rect(10, 9, 3, 3, '#d8343f'); b.set(4, 11, '#4aa3d6'); b.set(5, 11, '#4aa3d6'); b.set(5, 12, '#4aa3d6');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_bag', () => {
    const b = B(16, 16);
    b.rect(3, 5, 10, 10, '#8a5a2b'); b.rect(3, 5, 10, 2, '#a8763e'); b.rect(5, 2, 6, 3, '#6e4a26'); b.rect(6, 3, 4, 2, null);
    b.rect(5, 9, 6, 4, '#a8763e'); b.rect(7, 9, 2, 2, '#ffd24a');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_menu', () => {
    const b = B(16, 16);
    b.circle(8, 8, 6, '#9aa3b5'); b.circle(8, 8, 2.5, '#3d3a44');
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; b.rect(8 + Math.cos(a) * 6.5 - 1, 8 + Math.sin(a) * 6.5 - 1, 2, 2, '#9aa3b5'); }
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_attack', () => {
    const b = B(20, 20);
    const sk = '#f2c49b', w = '#fbfbf2', wD = '#d9d4c4';
    b.rect(4, 6, 12, 10, w); b.rect(4, 6, 12, 1, '#ffffff');
    for (let k = 0; k < 4; k++) b.rect(4 + k * 3, 6, 1, 5, wD);
    b.rect(4, 11, 12, 1, wD); b.rect(2, 9, 3, 6, sk); b.rect(6, 15, 8, 3, sk);
    b.line(17, 4, 19, 2, '#ffd24a'); b.line(17, 9, 19, 9, '#ffd24a'); b.line(16, 1, 16, 0, '#ffd24a');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_dash', () => {
    const b = B(16, 16);
    b.rect(2, 4, 8, 2, '#bfe9ff'); b.rect(4, 8, 10, 2, '#ffffff'); b.rect(1, 12, 7, 2, '#bfe9ff');
    b.line(10, 3, 14, 7, '#ffffff'); b.line(14, 7, 12, 9, '#ffffff');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_talk', () => {
    const b = B(16, 16);
    b.ellipse(8, 7, 7, 5, '#ffffff'); b.line(4, 11, 2, 15, '#ffffff'); b.line(5, 11, 3, 15, '#ffffff');
    b.rect(4, 7, 2, 1, '#3d3a44'); b.rect(7, 7, 2, 1, '#3d3a44'); b.rect(10, 7, 2, 1, '#3d3a44');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_lock', () => {
    const b = B(10, 12);
    b.rect(2, 1, 6, 2, '#c9c6bb'); b.rect(2, 1, 1, 5, '#c9c6bb'); b.rect(7, 1, 1, 5, '#c9c6bb');
    b.rect(1, 5, 8, 6, '#e0b84a'); b.rect(4, 7, 2, 2, '#5a3a1e');
    b.outline(OUT); return { buf: b };
  });
  SR.Art.def('icon_gold', () => {
    const b = B(9, 9);
    b.circle(4, 4, 3.6, '#ffd24a'); b.circle(4, 4, 2, '#f0b030'); b.set(3, 2, '#fff6c2'); b.set(2, 3, '#fff6c2');
    b.outline('#6b4a1a'); return { buf: b };
  });
  SR.Art.def('diamond', () => {
    const frames = [true, false].map(full => {
      const b = B(9, 11);
      const c = full ? '#5ff0ff' : '#2a3a52', cL = full ? '#d9ffff' : '#3e5272', cD = full ? '#2aa8d8' : '#1d2a3e';
      for (let y = 0; y < 11; y++) { const w = y <= 5 ? y : 10 - y; b.rect(4 - Math.floor(w * 0.8), y, Math.floor(w * 0.8) * 2 + 1, 1, y < 5 ? c : cD); }
      b.set(3, 3, cL); b.set(3, 4, cL); b.set(4, 2, cL);
      b.outline(OUT); return b;
    });
    return { rows: [frames], fw: 9, fh: 11 };
  });

  // 스킬 아이콘 18x18
  function skillIcon(bg, drawFn) {
    const b = B(18, 18);
    b.rect(0, 0, 18, 18, bg); b.rect(0, 0, 18, 1, C.shade(bg, 0.3)); b.rect(0, 17, 18, 1, C.shade(bg, -0.4));
    drawFn(b);
    return { buf: b };
  }
  SR.Art.def('skill_flurry', () => skillIcon('#7a3a2a', b => {
    [[3, 4], [8, 2], [5, 9], [10, 8], [7, 13]].forEach(([x, y], k) => { b.rect(x, y, 5, 4, k % 2 ? '#fff3dc' : '#ffffff'); b.rect(x, y + 3, 5, 1, '#d9c49a'); });
    b.line(14, 3, 17, 1, '#ffd24a'); b.line(14, 12, 17, 13, '#ffd24a');
  }));
  SR.Art.def('skill_whirl', () => skillIcon('#2a4a6a', b => {
    b.ring(9, 9, 7, '#bfe9ff', 2); b.ring(9, 9, 4, '#ffffff', 1);
    b.rect(13, 3, 3, 2, '#ffffff'); b.rect(2, 13, 3, 2, '#ffffff'); b.circle(9, 9, 1.5, '#ffd24a');
  }));
  SR.Art.def('skill_flame', () => skillIcon('#5a1a14', b => {
    b.ellipse(9, 11, 6, 5, '#e0452a'); b.ellipse(9, 10, 4, 5, '#ff8a2a'); b.ellipse(9, 11, 2.5, 3, '#ffd24a');
    b.line(9, 2, 6, 8, '#ff8a2a'); b.line(12, 3, 11, 8, '#ffd24a'); b.set(9, 13, '#fff3b0');
  }));
  SR.Art.def('skill_aura', () => skillIcon('#4a2a6a', b => {
    b.circle(9, 6, 2.5, '#ffd24a'); b.rect(7, 9, 5, 6, '#ffd24a'); b.rect(4, 9, 3, 2, '#ffd24a'); b.rect(12, 9, 3, 2, '#ffd24a');
    b.ring(9, 10, 8, '#d38bff', 1); b.set(2, 3, '#ffffff'); b.set(15, 4, '#ffffff'); b.set(3, 15, '#ffffff');
  }));
  SR.Art.def('skill_heavenfall', () => skillIcon('#3a3a2a', b => {
    b.rect(0, 13, 18, 5, '#7a6a4a'); b.line(9, 13, 5, 17, '#2a2014'); b.line(9, 13, 13, 17, '#2a2014'); b.line(9, 13, 9, 17, '#2a2014');
    b.rect(6, 3, 6, 6, '#ffffff'); b.rect(6, 8, 6, 1, '#d9c49a'); b.rect(8, 9, 2, 3, '#f2c49b');
    b.line(3, 2, 5, 6, '#5ff0ff'); b.line(15, 2, 13, 6, '#5ff0ff');
  }));
  // 버프 아이콘 10x10
  function buffIcon(bg, fn) { const b = B(10, 10); b.rect(0, 0, 10, 10, bg); b.rect(0, 0, 10, 1, C.shade(bg, 0.35)); fn(b); b.outline(OUT); return { buf: b }; }
  SR.Art.def('buff_exp', () => buffIcon('#2f7a3a', b => { b.rect(2, 2, 6, 6, '#ffe27a'); b.rect(3, 3, 4, 1, '#2f7a3a'); b.rect(3, 5, 4, 1, '#2f7a3a'); b.rect(3, 4, 1, 1, '#2f7a3a'); b.rect(3, 6, 4, 1, '#2f7a3a'); }));
  SR.Art.def('buff_crit', () => buffIcon('#8a2a2a', b => { b.line(2, 2, 7, 7, '#ffffff'); b.line(7, 2, 2, 7, '#ffd24a'); b.set(5, 5, '#ffffff'); }));
  SR.Art.def('buff_aura', () => buffIcon('#4a2a6a', b => { b.circle(5, 4, 2, '#ffd24a'); b.rect(3, 6, 5, 3, '#ffd24a'); }));
  SR.Art.def('buff_newbie', () => buffIcon('#2a5a4a', b => { b.rect(4, 5, 1, 4, '#6b8f45'); b.ellipse(3, 4, 2, 1.2, '#9cdc6a'); b.ellipse(6, 3, 2, 1.2, '#9cdc6a'); }));

  // 아이템 아이콘 14x14
  function itemIcon(fn) { const b = B(14, 14); fn(b); b.outline(OUT); return { buf: b }; }
  function potion(b, c, cL, big) {
    const top = big ? 1 : 3;
    b.rect(5, top, 4, 2, '#a0703f'); b.rect(5, top + 2, 4, 2, '#d9f0f5');
    b.ellipse(7, big ? 9 : 10, big ? 5 : 4, big ? 4.5 : 3.5, c); b.rect(4, big ? 6 : 8, 2, 2, cL); b.set(8, big ? 12 : 12, C.shade(c, -0.3));
  }
  SR.Art.def('item_potion_red', () => itemIcon(b => potion(b, '#d8343f', '#ff9a9a')));
  SR.Art.def('item_potion_red_big', () => itemIcon(b => potion(b, '#b0202c', '#ff7a7a', true)));
  SR.Art.def('item_potion_blue', () => itemIcon(b => potion(b, '#3a7ae0', '#a9ccff')));
  SR.Art.def('item_elixir', () => itemIcon(b => potion(b, '#e0a030', '#fff0a0', true)));
  SR.Art.def('item_scroll', () => itemIcon(b => {
    b.rect(2, 3, 10, 8, '#f0e2b6'); b.rect(1, 2, 2, 10, '#c4a86a'); b.rect(11, 2, 2, 10, '#c4a86a');
    b.rect(4, 5, 6, 1, '#7a5232'); b.rect(4, 7, 5, 1, '#7a5232'); b.rect(6, 9, 2, 2, '#d8343f');
  }));
  SR.Art.def('item_wraps', () => itemIcon(b => { b.rect(3, 3, 8, 8, '#f3eee0'); for (let k = 0; k < 4; k++) b.rect(3, 3 + k * 2, 8, 1, '#c4bba6'); b.rect(9, 10, 3, 3, '#f3eee0'); }));
  SR.Art.def('item_knuckle', () => itemIcon(b => { b.rect(2, 4, 10, 4, '#9aa3b5'); b.rect(2, 4, 10, 1, '#d0d6e2'); for (let k = 0; k < 4; k++) b.rect(2 + k * 3, 3, 2, 2, '#d0d6e2'); b.rect(4, 8, 6, 4, '#6a7284'); b.rect(5, 9, 4, 2, null); }));
  SR.Art.def('item_claw', () => itemIcon(b => { b.rect(3, 6, 8, 6, '#c08a3a'); b.rect(3, 6, 8, 1, '#e8b860'); for (let k = 0; k < 3; k++) b.line(4 + k * 3, 6, 5 + k * 3, 1, '#f0f0f0'); b.rect(5, 8, 4, 1, '#3a2a14'); }));
  SR.Art.def('item_gauntlet', () => itemIcon(b => { b.rect(2, 3, 10, 9, '#3a7ab0'); b.rect(2, 3, 10, 2, '#7fd8ff'); b.rect(5, 6, 4, 3, '#5ff0ff'); b.set(6, 7, '#ffffff'); b.rect(2, 11, 10, 1, '#e0b84a'); }));
  SR.Art.def('item_gi', () => itemIcon(b => { b.rect(3, 2, 8, 10, '#f3eee0'); b.rect(1, 2, 3, 5, '#f3eee0'); b.rect(10, 2, 3, 5, '#f3eee0'); b.line(5, 2, 7, 6, '#c4bba6'); b.line(9, 2, 7, 6, '#c4bba6'); b.rect(3, 8, 8, 1, '#2d3f94'); }));
  SR.Art.def('item_vest', () => itemIcon(b => { b.rect(3, 2, 8, 10, '#8a5a2b'); b.rect(3, 2, 8, 1, '#a8763e'); b.rect(6, 2, 2, 10, '#6e4a26'); b.set(5, 5, '#e8c35a'); b.set(8, 5, '#e8c35a'); b.set(5, 8, '#e8c35a'); b.set(8, 8, '#e8c35a'); }));
  SR.Art.def('item_robe', () => itemIcon(b => { b.rect(3, 2, 8, 11, '#3f8a8a'); for (let y = 3; y < 13; y += 2) for (let x = 3 + (y % 4 === 1 ? 1 : 0); x < 11; x += 2) b.set(x, y, '#7fd0c8'); b.rect(3, 7, 8, 1, '#e0b84a'); }));
  SR.Art.def('item_ring', () => itemIcon(b => { b.ring(7, 8, 4, '#e0b84a', 1); b.circle(7, 4, 2, '#4fd88a'); b.set(6, 3, '#c8ffd8'); }));
  SR.Art.def('item_charm', () => itemIcon(b => { b.line(7, 1, 7, 4, '#c4a86a'); b.rect(4, 4, 6, 8, '#5f8a4a'); b.rect(5, 5, 4, 6, '#86b268'); b.line(6, 6, 8, 9, '#e6dcc0'); b.line(8, 6, 6, 9, '#e6dcc0'); }));
  SR.Art.def('item_gel', () => itemIcon(b => { b.ellipse(7, 9, 5, 3.5, '#5fb8e8'); b.ellipse(7, 7, 3, 2.5, '#5fb8e8'); b.rect(4, 6, 2, 1, '#bfe9ff'); }));
  SR.Art.def('item_shell', () => itemIcon(b => { b.ellipse(7, 8, 6, 4.5, '#7a8a3c'); b.rect(4, 6, 3, 2, '#9aab52'); b.rect(8, 7, 3, 2, '#9aab52'); b.set(4, 3, '#e8dcc0'); b.set(9, 3, '#e8dcc0'); }));
  SR.Art.def('item_wing', () => itemIcon(b => { b.line(1, 3, 12, 6, '#5e4a86'); b.line(1, 4, 12, 7, '#5e4a86'); b.line(12, 7, 9, 12, '#3d2f5c'); b.line(8, 5, 6, 11, '#3d2f5c'); b.line(4, 4, 2, 10, '#3d2f5c'); b.line(2, 10, 9, 12, '#5e4a86'); }));
  SR.Art.def('item_rune', () => itemIcon(b => { b.rect(3, 2, 8, 10, '#8a8478'); b.rect(3, 2, 8, 1, '#aaa497'); b.line(5, 4, 9, 4, '#5ff0e0'); b.line(7, 4, 7, 10, '#5ff0e0'); b.line(5, 8, 9, 10, '#5ff0e0'); }));
  SR.Art.def('item_core', () => itemIcon(b => { b.circle(7, 7, 5, '#3a2a5e'); b.circle(7, 7, 3.5, '#6ff2ff'); b.circle(6, 6, 1.5, '#ffffff'); }));

  // ------------------------------------------------------------------
  // 비트맵 픽셀 폰트 (데미지 숫자용) 5x7 글리프 + 1px 외곽선 → 셀 7x9
  // ------------------------------------------------------------------
  const GLYPHS = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
  };
  SR.Art.FONT_CHARS = Object.keys(GLYPHS).join('');
  SR.Art.def('pixelfont', () => {
    const chars = SR.Art.FONT_CHARS;
    const cols = 16;
    const rowsCount = Math.ceil(chars.length / cols);
    const cellW = 7, cellH = 9;
    return {
      w: cols * cellW, h: rowsCount * cellH, raw: true, draw(ctx) {
        for (let i = 0; i < chars.length; i++) {
          const g = GLYPHS[chars[i]];
          const b = B(cellW, cellH);
          g.forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '1') b.set(x + 1, y + 1, '#ffffff'); });
          b.outline('#000000', true);
          b.drawTo(ctx, (i % cols) * cellW, Math.floor(i / cols) * cellH, 1);
        }
      }
    };
  });
  SR.Art.FONT = { cellW: 7, cellH: 9, cols: 16 };
})();
