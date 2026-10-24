// 진입점: 데이터 + 폰트 로드 → Phaser 게임 생성
(async function start() {
  const bootEl = document.getElementById('boot');
  try {
    await SR.Data.load();
    // 한글 픽셀 폰트가 준비된 뒤에 텍스트를 만들어야 글꼴이 깨지지 않는다
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([document.fonts.load('16px "Galmuri11"', '가A1'), document.fonts.ready]),
        new Promise(r => setTimeout(r, 2500))
      ]);
    }
  } catch (e) {
    bootEl.textContent = '데이터 로드 실패: ' + e.message;
    throw e;
  }
  bootEl.remove();

  const cfg = SR.Data.config;
  // ?renderer=canvas 로 캔버스 렌더러 강제 (WebGL 이 불안정한 기기용)
  const forceCanvas = new URLSearchParams(location.search).get('renderer') === 'canvas';
  SR.game = new Phaser.Game({
    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    width: cfg.width,
    height: cfg.height,
    backgroundColor: '#0b0812',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: { activePointers: 4 },
    fps: { target: 60 },
    scene: [SR.BootScene, SR.TitleScene, SR.GameScene, SR.UIScene]
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
})();
