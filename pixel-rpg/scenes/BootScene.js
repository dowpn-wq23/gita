// 에셋 로드(외부 파일이 있으면) + 플레이스홀더 생성
SR.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 10, 0x8fd0ff).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2, 404, 14).setStrokeStyle(2, 0x5a4a7a);
    this.load.on('progress', p => { bar.width = 400 * p; });
    SR.Assets.preload(this);
  }

  create() {
    SR.Assets.generate(this);
    const params = new URLSearchParams(location.search);
    if (params.get('preview') === 'art') { this.showArtPreview(); return; }
    this.scene.start('Title');
  }

  // 개발용: ?preview=art 로 생성된 텍스처 전체 확인
  showArtPreview() {
    this.cameras.main.setBackgroundColor('#3a4a5a');
    let x = 8, y = 8, rowH = 0;
    const only = new URLSearchParams(location.search).get('key');
    const keys = only ? only.split(',') : Object.keys(SR.Art.defs);
    const maxW = only ? 1270 : 300, maxH = only ? 560 : 200;
    keys.forEach(key => {
      const tex = this.textures.get(key);
      const src = tex.getSourceImage();
      let w = src.width, h = src.height;
      const s = Math.min(1, maxW / w, maxH / h);
      w *= s; h *= s;
      if (x + w > 1272) { x = 8; y += rowH + 14; rowH = 0; }
      this.add.image(x, y, key, '__BASE').setOrigin(0).setScale(s);
      this.add.text(x, y + h, key, { fontSize: '9px', color: '#fff' });
      x += w + 8; rowH = Math.max(rowH, h);
    });
    const t = this.add.bitmapText(8, 540, 'pixelfont', '0123456789 CRITICAL! DEADLY! +EXP MISS LEVEL UP!').setScale(3).setTint(0xffd24a);
    t.setDepth(10);
  }
};
