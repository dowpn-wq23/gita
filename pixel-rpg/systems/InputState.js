// 키보드 + 가상 패드(터치) 입력을 하나로 합친 상태.
// UIScene 이 키/터치를 받아 여기에 기록하고, GameScene 이 읽는다.
SR.Input = {
  keys: null,          // UIScene 에서 addKeys 결과
  padX: 0, padY: 0,    // 가상 십자패드 (-1..1, 8방향)
  attackTouch: false,  // 공격 버튼 누르는 중
  queue: [],           // 1회성 행동: { type: 'skill', index } | { type: 'dash' } | { type: 'interact' } | { type: 'potion' }
  blocked: false,      // 패널이 열려 있으면 true

  move() {
    if (this.blocked) return { x: 0, y: 0 };
    let x = this.padX, y = this.padY;
    const k = this.keys;
    if (k) {
      if (k.left.isDown || k.a.isDown) x -= 1;
      if (k.right.isDown || k.d.isDown) x += 1;
      if (k.up.isDown || k.w.isDown) y -= 1;
      if (k.down.isDown || k.s.isDown) y += 1;
    }
    x = SR.util.clamp(x, -1, 1); y = SR.util.clamp(y, -1, 1);
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  attackHeld() {
    if (this.blocked) return false;
    const k = this.keys;
    return this.attackTouch || !!(k && (k.space.isDown || k.j.isDown));
  },

  push(action) { if (!this.blocked) this.queue.push(action); },
  consume() { const q = this.queue; this.queue = []; return q; },
  reset() { this.padX = 0; this.padY = 0; this.attackTouch = false; this.queue = []; }
};
