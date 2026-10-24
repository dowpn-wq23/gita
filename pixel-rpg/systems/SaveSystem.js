// localStorage 자동 저장 (캐릭터, 인벤토리, 스킬 레벨, 위치)
SR.Save = {
  key() { return SR.Data.config.saveKey; },

  exists() {
    try { return !!localStorage.getItem(this.key()); } catch (e) { return false; }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.key());
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || obj.version !== 1) return null;
      return obj;
    } catch (e) {
      console.warn('[Save] 불러오기 실패', e);
      return null;
    }
  },

  // state: PlayerState, pos: { map, x, y }
  save(state, pos) {
    if (!state) return false;
    try {
      const data = state.serialize();
      if (pos) data.position = { map: pos.map, x: Math.round(pos.x), y: Math.round(pos.y) };
      data.version = 1;
      data.savedAt = Date.now();
      localStorage.setItem(this.key(), JSON.stringify(data));
      this.lastSaved = data.savedAt;
      return true;
    } catch (e) {
      console.warn('[Save] 저장 실패', e);
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(this.key()); } catch (e) { /* 무시 */ }
  }
};
