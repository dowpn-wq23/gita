// 데미지 계산
SR.Combat = {
  mitigation(def) {
    const K = SR.Data.config.combat.defenseConstant;
    return K / (K + Math.max(0, def));
  },
  variance() {
    const v = SR.Data.config.combat.damageVariance;
    return 1 + (Math.random() * 2 - 1) * v;
  },
  // 플레이어 → 몬스터. 결과: { amount, crit, deadly }
  playerHit(stats, mult, targetDef) {
    let dmg = stats.atk * mult * this.variance() * this.mitigation(targetDef);
    let crit = false, deadly = false;
    if (Math.random() < stats.crit) {
      crit = true;
      if (Math.random() < stats.deadly) { deadly = true; dmg *= stats.deadlyDmg; }
      else dmg *= stats.critDmg;
    }
    return { amount: Math.max(1, Math.round(dmg)), crit, deadly };
  },
  // 몬스터 → 플레이어
  monsterHit(atk, mult, playerDef) {
    return Math.max(1, Math.round(atk * (mult || 1) * this.variance() * this.mitigation(playerDef)));
  },
  // 스킬 계수 (레벨 반영)
  scaled(v, level) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    return v.base + v.perLevel * Math.max(0, level - 1);
  }
};
