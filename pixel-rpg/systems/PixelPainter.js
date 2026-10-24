// 플레이스홀더 픽셀아트를 코드로 그리기 위한 작은 픽셀 버퍼.
// 논리 픽셀 단위로 그린 뒤 drawTo()로 캔버스에 PX배 확대해서 찍는다.
SR.PixelBuf = class PixelBuf {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (c == null || x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.d[y * this.w + x] = c;
    return this;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  // 채운 타원 (cx, cy 는 소수 가능)
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }
  circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  ring(cx, cy, r, c, thick) {
    thick = thick || 1;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d <= r + 0.3 && d >= r - thick + 0.3) this.set(x, y, c);
      }
    }
    return this;
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  // 픽셀 문자열 스텐실: rows = ['..aa..', ...], pal = { a: '#fff' }
  stamp(x, y, rows, pal) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch !== '.' && ch !== ' ' && pal[ch]) this.set(x + i, y + j, pal[ch]);
      }
    });
    return this;
  }
  // 불투명 픽셀 둘레에 외곽선을 친다 (픽셀아트 느낌의 핵심)
  outline(c, diagonal) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
          (diagonal && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
        if (n) add.push([x, y]);
      }
    }
    add.forEach(([x, y]) => this.set(x, y, c));
    return this;
  }
  // 특정 색을 다른 색으로 치환
  replace(from, to) {
    for (let i = 0; i < this.d.length; i++) if (this.d[i] === from) this.d[i] = to;
    return this;
  }
  // 좌우 반전 복사본
  flipped() {
    const b = new SR.PixelBuf(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) b.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return b;
  }
  drawTo(ctx, ox, oy, s, alpha) {
    if (alpha != null) ctx.globalAlpha = alpha;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.d[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
    if (alpha != null) ctx.globalAlpha = 1;
  }
};

// 색 보조 함수
SR.Color = {
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    const c = v => SR.util.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  },
  // amt > 0 밝게, < 0 어둡게 (-1..1)
  shade(hex, amt) {
    const [r, g, b] = SR.Color.hexToRgb(hex);
    if (amt >= 0) return SR.Color.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return SR.Color.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  },
  mix(a, b, t) {
    const A = SR.Color.hexToRgb(a), B = SR.Color.hexToRgb(b);
    return SR.Color.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  },
  toInt(hex) { return parseInt(hex.replace('#', ''), 16); }
};

// 결정론적 난수 (타일 무늬가 매번 같게)
SR.seeded = function (seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
};
