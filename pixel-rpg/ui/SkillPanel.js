// 스킬 창: 스킬 포인트로 습득/강화
SR.SkillPanel = class SkillPanel extends SR.Panel {
  constructor(scene) {
    super(scene, 820, 500, '스킬');
    this.spText = this.text(this.w - 52, 20, '', 15, '#ffe066').setOrigin(1, 0.5);
    this.rows = SR.state.cls.skills.map((id, i) => {
      const sk = SR.Data.skills[id];
      const y = 48 + i * 89;
      const bg = scene.add.rectangle(this.x + 14, this.y + y, this.w - 28, 82, 0x120e20).setOrigin(0).setStrokeStyle(2, 0x3a3060);
      const icon = scene.add.image(this.x + 50, this.y + y + 41, sk.icon).setScale(1.1);
      const ring = scene.add.circle(this.x + 50, this.y + y + 41, 32).setStrokeStyle(3, 0xffcf4a);
      this.add([bg, icon, ring]);
      const name = this.text(96, y + 8, '', 16, '#ffffff');
      const lv = this.text(96, y + 8, '', 14, '#ffcf4a');
      const desc = this.text(96, y + 30, sk.desc, 11, '#cfc6e6', { wordWrap: { width: 590 } });
      const info = this.text(96, y + 49, '', 11, '#8fe8ff', { lineSpacing: 2 });
      const btn = this.button(this.w - 132, y + 22, 104, 38, '강화', () => this.upgrade(id));
      return { id, sk, icon, name, lv, desc, info, btn };
    });
  }

  upgrade(id) {
    const r = SR.state.upgradeSkill(id);
    if (r.ok) { SR.log(r.msg, '#ffe066'); SR.Sound.play('buff'); }
    else { SR.log(r.msg, '#ff9a7a'); SR.Sound.play('error'); }
    this.refresh();
  }

  describe(sk, lv) {
    if (lv <= 0) return '';
    const parts = [];
    const dmg = SR.Combat.scaled(sk.damage, lv);
    if (sk.type === 'buff') {
      parts.push(`공격력 +${Math.round(SR.Combat.scaled(sk.buff.atkPct, lv) * 100)}%`, `치명타 +${Math.round(SR.Combat.scaled(sk.buff.crit, lv) * 100)}%`, `${sk.buff.duration}초`);
    } else if (sk.perCharge) parts.push(`기 1개당 공격력 ${Math.round(dmg * 100)}%`);
    else parts.push(`공격력 ${Math.round(dmg * 100)}% x ${sk.hits}회`);
    if (sk.burn) parts.push(`화상 ${Math.round(SR.Combat.scaled(sk.burn, lv) * 100)}% x ${sk.burn.ticks}`);
    parts.push(`MP ${SR.Skills.mpCost(sk, lv)}`, `재사용 ${sk.cooldown}초`);
    return parts.join('  ·  ');
  }

  refresh() {
    if (!this.isOpen) return;
    const st = SR.state;
    this.spText.setText(`스킬 포인트: ${st.skillPoints}`);
    this.rows.forEach(r => {
      const lv = st.skillLevel(r.id);
      r.name.setText(r.sk.name);
      r.lv.setX(r.name.x + r.name.width + 10).setText(lv > 0 ? `LV${lv}/${r.sk.maxLevel}` : `미습득 (Lv.${r.sk.reqLevel} 필요)`).setColor(lv > 0 ? '#ffcf4a' : '#ff9a7a');
      r.icon.setAlpha(lv > 0 ? 1 : 0.4);
      const cur = this.describe(r.sk, lv);
      const next = lv < r.sk.maxLevel ? this.describe(r.sk, lv + 1) : '';
      r.info.setText(lv > 0 ? (next ? `현재: ${cur}\n다음: ${next}` : `현재: ${cur} (최대)`) : `습득 시: ${next}`);
      const c = st.canUpgradeSkill(r.id);
      r.btn.setLabel(lv <= 0 ? '습득' : lv >= r.sk.maxLevel ? '최대' : '강화 +1');
      r.btn.setEnabled(c.ok);
    });
  }
};
