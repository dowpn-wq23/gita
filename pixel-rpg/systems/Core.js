// 전역 네임스페이스 + 이벤트 버스 + 공용 유틸.
// 모든 스크립트는 classic <script>로 로드된다 (file:// 직접 실행을 지원하기 위해 ES 모듈을 쓰지 않음).
window.SR = window.SR || {};

SR.bus = new Phaser.Events.EventEmitter();

SR.util = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  chance(p) { return Math.random() < p; },
  dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
  angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
  // 두 각의 최소 차 (라디안)
  angleDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  },
  // 1234567 -> "1,234,567"
  fmt(n) { return Math.floor(n).toLocaleString('en-US'); },
  // 이동 벡터 -> 4방향 스프라이트 방향
  dirFromVector(x, y, fallback) {
    if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return fallback || 'down';
    if (Math.abs(x) > Math.abs(y) * 1.05) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'down' : 'up';
  },
  dirToAngle(dir) {
    return { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir] || 0;
  },
  formatTime(sec) {
    if (sec < 0) return '∞';
    if (sec >= 60) return Math.ceil(sec / 60) + 'm';
    return Math.ceil(sec) + 's';
  },
  todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  deepClone(o) { return JSON.parse(JSON.stringify(o)); }
};

// 공용 폰트 스타일 (Galmuri11: 한글 픽셀 폰트, fonts/galmuri.css)
SR.FONT = '"Galmuri11", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
SR.textStyle = function (size, color, extra) {
  return Object.assign({
    fontFamily: SR.FONT,
    fontSize: size + 'px',
    color: color || '#ffffff',
    stroke: '#120a18',
    strokeThickness: Math.max(2, Math.round(size / 6))
  }, extra || {});
};

SR.RARITY_COLOR = { common: '#f2efe6', rare: '#6fc3ff', epic: '#d38bff' };

// 깊이(렌더 순서) 규칙
SR.DEPTH = {
  water: -10,
  ground: 0,
  edges: 1,
  decal: 3,
  shadow: 5,
  sortBase: 100,   // + 발 위치 y
  overhead: 6000,
  nameplate: 7000,
  damage: 9000
};
