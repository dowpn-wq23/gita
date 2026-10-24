// 캐릭터 데이터 모델 (저장 대상). 화면 표현(Player 엔티티)과 분리되어 있어
// 맵 이동(GameScene 재시작) 중에도 그대로 유지된다. 전역 SR.state 로 접근.
SR.log = function (text, color) { SR.bus.emit('log', { text, color: color || '#ffffff' }); };

SR.PlayerState = class PlayerState {
  constructor(classId) {
    const D = SR.Data, cfg = D.config;
    const cls = D.classes[classId];
    if (!cls) throw new Error('알 수 없는 직업: ' + classId);
    this.classId = classId;
    this.level = 1;
    this.exp = 0;
    this.gold = 0;
    this.charge = 0;
    this.skillPoints = cfg.startSkillPoints || 0;
    this.skills = Object.assign({}, cls.startSkills || {});
    this.inventory = new Array(cfg.inventorySlots).fill(null);
    this.equipment = { weapon: null, armor: null, accessory: null };
    Object.assign(this.equipment, cls.startEquipment || {});
    (cls.startItems || []).forEach(it => this.addItem(it.id, it.qty, true));
    this.buffs = [];
    this.lastDailyClaim = null;
    this.settings = { sound: true };
    this.kills = 0;
    this.position = { map: cfg.startMap, x: null, y: null };
    this.addBuff('newbie', null, true);
    this.recalc();
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
  }

  get cls() { return SR.Data.classes[this.classId]; }

  // ---------------- 능력치 ----------------
  recalc() {
    const cls = this.cls, b = cls.base, g = cls.growth, L = this.level - 1;
    const s = {
      maxHp: b.maxHp + g.maxHp * L,
      maxMp: b.maxMp + g.maxMp * L,
      atk: b.atk + g.atk * L,
      def: b.def + g.def * L,
      crit: b.crit + (g.crit || 0) * L,
      critDmg: b.critDmg,
      deadly: b.deadly,
      deadlyDmg: b.deadlyDmg,
      moveSpeed: b.moveSpeed,
      attackInterval: b.attackInterval,
      hpRegen: b.hpRegen + L * 0.6,
      mpRegen: b.mpRegen + L * 0.2,
      expPct: 0,
      atkPct: 0
    };
    const addStats = st => { for (const k in st) s[k] = (s[k] || 0) + st[k]; };
    for (const slot in this.equipment) {
      const id = this.equipment[slot];
      if (id && SR.Data.items[id]) addStats(SR.Data.items[id].stats || {});
    }
    this.buffs.forEach(bf => addStats(bf.stats || {}));
    s.atk = Math.round(s.atk * (1 + s.atkPct));
    s.crit = Math.min(0.95, s.crit);
    this.stats = s;
    if (this.hp != null) {
      this.hp = Math.min(this.hp, s.maxHp);
      this.mp = Math.min(this.mp, s.maxMp);
    }
    SR.bus.emit('stats');
  }

  // 전투력 (UI 표시용 단순 지표)
  get power() {
    const s = this.stats;
    return Math.round(s.atk * 10 * (1 + s.crit * (s.critDmg - 1)) + s.def * 6 + s.maxHp * 0.5);
  }

  // ---------------- 경험치 / 레벨 ----------------
  expToNext(level) {
    const e = SR.Data.config.exp;
    return Math.round(e.base * Math.pow(level || this.level, e.exponent));
  }
  expPercent() {
    if (this.level >= SR.Data.config.maxLevel) return 100;
    return this.exp / this.expToNext() * 100;
  }
  gainExp(amount) {
    const cfg = SR.Data.config;
    const gained = Math.round(amount * (1 + (this.stats.expPct || 0)));
    if (this.level >= cfg.maxLevel) return 0;
    this.exp += gained;
    let ups = 0;
    while (this.level < cfg.maxLevel && this.exp >= this.expToNext()) {
      this.exp -= this.expToNext();
      this.level++;
      ups++;
      this.skillPoints += cfg.levelUp.skillPoints;
    }
    if (ups > 0) {
      if (this.level >= cfg.maxLevel) this.exp = 0;
      // 새싹 버프 만료 검사
      const nb = SR.Data.buffs.newbie;
      if (nb && nb.maxLevel && this.level > nb.maxLevel) this.removeBuff('newbie');
      this.recalc();
      if (cfg.levelUp.fullHeal) { this.hp = this.stats.maxHp; this.mp = this.stats.maxMp; }
      SR.bus.emit('levelup', this.level, ups);
    }
    return gained;
  }

  addGold(n) {
    this.gold = Math.max(0, this.gold + Math.round(n));
    SR.bus.emit('gold', this.gold);
  }

  addCharge(n) {
    const max = SR.Data.config.charge.max;
    const before = this.charge;
    this.charge = SR.util.clamp(this.charge + n, 0, max);
    if (this.charge !== before) SR.bus.emit('charge', this.charge);
  }

  heal(hp, mp) {
    if (hp) this.hp = Math.min(this.stats.maxHp, this.hp + hp);
    if (mp) this.mp = Math.min(this.stats.maxMp, this.mp + mp);
  }

  // ---------------- 인벤토리 ----------------
  stackSize(id) {
    const it = SR.Data.items[id];
    if (!it) return 1;
    return it.type === 'equipment' ? 1 : (it.stack || 99);
  }
  // 넣을 수 있는 개수 계산 (실제로 넣지 않음)
  canFit(id, qty) {
    const max = this.stackSize(id);
    let room = 0;
    for (const s of this.inventory) {
      if (!s) room += max;
      else if (s.id === id) room += max - s.qty;
      if (room >= qty) return true;
    }
    return room >= qty;
  }
  // 실제로 넣은 개수를 반환
  addItem(id, qty, silent) {
    if (!SR.Data.items[id]) { console.warn('알 수 없는 아이템', id); return 0; }
    qty = qty || 1;
    const max = this.stackSize(id);
    let left = qty;
    for (const s of this.inventory) {
      if (left <= 0) break;
      if (s && s.id === id && s.qty < max) {
        const add = Math.min(max - s.qty, left);
        s.qty += add; left -= add;
      }
    }
    for (let i = 0; i < this.inventory.length && left > 0; i++) {
      if (!this.inventory[i]) {
        const add = Math.min(max, left);
        this.inventory[i] = { id, qty: add };
        left -= add;
      }
    }
    if (!silent) SR.bus.emit('inventory');
    return qty - left;
  }
  removeAt(slot, qty) {
    const s = this.inventory[slot];
    if (!s) return 0;
    const n = Math.min(qty || 1, s.qty);
    s.qty -= n;
    if (s.qty <= 0) this.inventory[slot] = null;
    SR.bus.emit('inventory');
    return n;
  }
  count(id) {
    return this.inventory.reduce((a, s) => a + (s && s.id === id ? s.qty : 0), 0);
  }
  findSlot(id) { return this.inventory.findIndex(s => s && s.id === id); }
  freeSlots() { return this.inventory.filter(s => !s).length; }

  // 아이템 사용/장착. { ok, msg }
  useAt(slot) {
    const s = this.inventory[slot];
    if (!s) return { ok: false };
    const it = SR.Data.items[s.id];
    if (it.type === 'equipment') return this.equipFrom(slot);
    if (it.type !== 'consumable') return { ok: false, msg: '사용할 수 없는 아이템입니다.' };
    const u = it.use || {};
    if (this.hp <= 0) return { ok: false, msg: '쓰러진 상태에서는 사용할 수 없습니다.' };
    if (u.hp && !u.mp && this.hp >= this.stats.maxHp) return { ok: false, msg: 'HP가 이미 가득 찼습니다.' };
    if (u.mp && !u.hp && this.mp >= this.stats.maxMp) return { ok: false, msg: 'MP가 이미 가득 찼습니다.' };
    this.heal(u.hp || 0, u.mp || 0);
    if (u.buff) this.addBuff(u.buff);
    this.removeAt(slot, 1);
    SR.bus.emit('itemUsed', s.id, u);
    return { ok: true, msg: `${it.name} 사용` };
  }

  equipFrom(slot) {
    const s = this.inventory[slot];
    if (!s) return { ok: false };
    const it = SR.Data.items[s.id];
    if (it.type !== 'equipment') return { ok: false, msg: '장착할 수 없는 아이템입니다.' };
    if ((it.reqLevel || 1) > this.level) return { ok: false, msg: `레벨 ${it.reqLevel} 이상 착용 가능합니다.` };
    if (it.weaponType && it.weaponType !== this.cls.weaponType) return { ok: false, msg: `${this.cls.name}는 착용할 수 없는 무기입니다.` };
    const prev = this.equipment[it.slot];
    this.equipment[it.slot] = s.id;
    this.inventory[slot] = prev ? { id: prev, qty: 1 } : null;
    this.recalc();
    SR.bus.emit('inventory');
    SR.bus.emit('equipment');
    return { ok: true, msg: `${it.name} 장착` };
  }

  unequip(slotName) {
    const id = this.equipment[slotName];
    if (!id) return { ok: false };
    if (this.freeSlots() <= 0) return { ok: false, msg: '가방이 가득 찼습니다.' };
    this.equipment[slotName] = null;
    this.addItem(id, 1);
    this.recalc();
    SR.bus.emit('equipment');
    return { ok: true, msg: `${SR.Data.items[id].name} 해제` };
  }

  // ---------------- 스킬 ----------------
  skillLevel(id) { return this.skills[id] || 0; }
  canUpgradeSkill(id) {
    const sk = SR.Data.skills[id];
    if (!sk) return { ok: false, msg: '없는 스킬' };
    const lv = this.skillLevel(id);
    if (lv >= sk.maxLevel) return { ok: false, msg: '최대 레벨입니다.' };
    if (this.level < sk.reqLevel) return { ok: false, msg: `캐릭터 레벨 ${sk.reqLevel} 필요` };
    if (this.skillPoints <= 0) return { ok: false, msg: '스킬 포인트가 부족합니다.' };
    return { ok: true };
  }
  upgradeSkill(id) {
    const c = this.canUpgradeSkill(id);
    if (!c.ok) return c;
    this.skills[id] = this.skillLevel(id) + 1;
    this.skillPoints--;
    SR.bus.emit('skills');
    const sk = SR.Data.skills[id];
    return { ok: true, msg: this.skills[id] === 1 ? `[${sk.name}] 습득!` : `[${sk.name}] LV${this.skills[id]} 강화!` };
  }

  // ---------------- 버프 ----------------
  addBuff(id, stats, silent) {
    const def = SR.Data.buffs[id];
    if (!def) return;
    const duration = def.duration;
    const existing = this.buffs.find(b => b.id === id);
    const st = stats || Object.assign({}, def.stats);
    if (existing) { existing.remaining = duration; existing.duration = duration; existing.stats = st; }
    else this.buffs.push({ id, remaining: duration, duration, stats: st });
    if (!silent) { this.recalc(); SR.bus.emit('buffs'); }
  }
  removeBuff(id) {
    const n = this.buffs.length;
    this.buffs = this.buffs.filter(b => b.id !== id);
    if (n !== this.buffs.length) { this.recalc(); SR.bus.emit('buffs'); }
  }
  updateBuffs(dt) {
    let changed = false;
    for (const b of this.buffs) {
      if (b.remaining < 0) continue; // 영구
      b.remaining -= dt;
      if (b.remaining <= 0) changed = true;
    }
    if (changed) {
      const ended = this.buffs.filter(b => b.duration > 0 && b.remaining <= 0);
      this.buffs = this.buffs.filter(b => !(b.duration > 0 && b.remaining <= 0));
      ended.forEach(b => SR.log(`${SR.Data.buffs[b.id].name} 효과가 끝났습니다.`, '#a9a4bf'));
      this.recalc();
      SR.bus.emit('buffs');
    }
  }

  // ---------------- 저장 ----------------
  serialize() {
    return {
      classId: this.classId, level: this.level, exp: this.exp, gold: this.gold,
      hp: Math.round(this.hp), mp: Math.round(this.mp), charge: this.charge,
      skillPoints: this.skillPoints, skills: Object.assign({}, this.skills),
      inventory: this.inventory.map(s => s ? { id: s.id, qty: s.qty } : null),
      equipment: Object.assign({}, this.equipment),
      buffs: this.buffs.map(b => ({ id: b.id, remaining: b.remaining, duration: b.duration, stats: b.stats })),
      lastDailyClaim: this.lastDailyClaim, settings: Object.assign({}, this.settings), kills: this.kills,
      position: Object.assign({}, this.position)
    };
  }

  static fromSave(o) {
    const st = new SR.PlayerState(o.classId || SR.Data.config.startClass);
    const cfg = SR.Data.config;
    st.level = SR.util.clamp(o.level || 1, 1, cfg.maxLevel);
    st.exp = o.exp || 0;
    st.gold = o.gold || 0;
    st.charge = o.charge || 0;
    st.skillPoints = o.skillPoints || 0;
    st.skills = Object.assign({}, o.skills || {});
    const inv = new Array(cfg.inventorySlots).fill(null);
    (o.inventory || []).forEach((s, i) => { if (s && SR.Data.items[s.id] && i < inv.length) inv[i] = { id: s.id, qty: s.qty }; });
    st.inventory = inv;
    st.equipment = { weapon: null, armor: null, accessory: null };
    for (const k in (o.equipment || {})) if (o.equipment[k] && SR.Data.items[o.equipment[k]]) st.equipment[k] = o.equipment[k];
    st.buffs = (o.buffs || []).filter(b => SR.Data.buffs[b.id]);
    st.lastDailyClaim = o.lastDailyClaim || null;
    st.settings = Object.assign({ sound: true }, o.settings || {});
    st.kills = o.kills || 0;
    st.position = o.position || { map: cfg.startMap };
    st.hp = null;
    st.recalc();
    st.hp = SR.util.clamp(o.hp != null ? o.hp : st.stats.maxHp, 1, st.stats.maxHp);
    st.mp = SR.util.clamp(o.mp != null ? o.mp : st.stats.maxMp, 0, st.stats.maxMp);
    return st;
  }
};
