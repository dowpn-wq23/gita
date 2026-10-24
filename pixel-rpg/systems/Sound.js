// 효과음: 외부 파일이 없으면 WebAudio 로 간단한 합성음을 낸다 (원작 사운드 미사용).
SR.Sound = {
  ctx: null,
  master: null,
  enabled: true,
  _last: {},

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },

  setEnabled(v) { this.enabled = v; },

  tone(freq, dur, type, vol, slideTo, delay) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, freq, delay) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  },

  play(name) {
    if (!this.enabled) return;
    // 외부 사운드 파일이 등록돼 있으면 우선 사용
    if (SR.game && SR.game.cache.audio.exists('sfx_' + name)) { SR.game.sound.play('sfx_' + name, { volume: 0.5 }); return; }
    if (!this.ctx) return;
    // 같은 소리가 한 프레임에 몰리면 시끄러우므로 제한
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < 35) return;
    this._last[name] = now;
    switch (name) {
      case 'punch': this.noise(0.06, 0.25, 900); this.tone(180, 0.06, 'square', 0.08, 90); break;
      case 'hit': this.noise(0.08, 0.35, 1600); this.tone(240, 0.07, 'square', 0.1, 110); break;
      case 'crit': this.noise(0.12, 0.4, 2200); this.tone(520, 0.12, 'square', 0.12, 260); break;
      case 'deadly': this.noise(0.18, 0.45, 2600); this.tone(880, 0.18, 'sawtooth', 0.12, 220); this.tone(1320, 0.1, 'square', 0.06, null, 0.05); break;
      case 'whoosh': this.noise(0.18, 0.18, 600); break;
      case 'fire': this.noise(0.35, 0.25, 500); this.tone(120, 0.3, 'sawtooth', 0.06, 60); break;
      case 'quake': this.noise(0.5, 0.5, 200); this.tone(70, 0.5, 'sawtooth', 0.15, 35); break;
      case 'buff': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, null, i * 0.06)); break;
      case 'hurt': this.tone(200, 0.15, 'square', 0.12, 80); break;
      case 'dash': this.noise(0.15, 0.2, 1400); this.tone(400, 0.1, 'sine', 0.06, 900); break;
      case 'coin': this.tone(988, 0.07, 'square', 0.08); this.tone(1319, 0.12, 'square', 0.08, null, 0.06); break;
      case 'pickup': this.tone(660, 0.06, 'triangle', 0.12); this.tone(990, 0.08, 'triangle', 0.1, null, 0.05); break;
      case 'levelup': [523, 659, 784, 1046, 1319].forEach((f, i) => this.tone(f, 0.25, 'square', 0.09, null, i * 0.08)); break;
      case 'die': this.tone(300, 0.25, 'square', 0.1, 60); this.noise(0.2, 0.2, 700); break;
      case 'click': this.tone(880, 0.04, 'square', 0.06); break;
      case 'error': this.tone(160, 0.12, 'square', 0.08); this.tone(120, 0.12, 'square', 0.08, null, 0.08); break;
      case 'potion': this.tone(523, 0.08, 'sine', 0.12, 1046); this.tone(784, 0.12, 'sine', 0.08, null, 0.06); break;
      case 'portal': this.tone(300, 0.4, 'sine', 0.12, 1200); break;
      case 'warn': this.tone(440, 0.1, 'square', 0.08); this.tone(440, 0.1, 'square', 0.08, null, 0.15); break;
      case 'buy': this.tone(784, 0.06, 'square', 0.08); this.tone(1046, 0.1, 'square', 0.08, null, 0.05); break;
      case 'equip': this.noise(0.08, 0.2, 3000); this.tone(330, 0.1, 'triangle', 0.1); break;
    }
  }
};
