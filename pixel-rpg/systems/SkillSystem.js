// 스킬 시전 로직. skills.json 의 type 별로 판정 범위와 연출이 정해진다.
//   melee    : 전방 부채꼴 근접 다단히트 (+ 돌진)
//   aoe      : 자신 주변 원형 다단히트 (+ 넉백)
//   cone     : 전방 원거리 부채꼴 (+ 화상)
//   buff     : 자신 강화
//   finisher : 기(氣)를 소모하는 전방 범위 일격
SR.Skills = {
  cooldowns: {},   // skillId -> 남은 초

  update(dt) {
    for (const k in this.cooldowns) {
      this.cooldowns[k] -= dt;
      if (this.cooldowns[k] <= 0) delete this.cooldowns[k];
    }
  },
  remaining(id) { return this.cooldowns[id] || 0; },

  mpCost(sk, lv) { return Math.round(sk.mpCost + (sk.mpPerLevel || 0) * Math.max(0, lv - 1)); },

  // 시전 가능 여부 { ok, reason }
  check(state, id) {
    const sk = SR.Data.skills[id];
    const lv = state.skillLevel(id);
    if (!sk) return { ok: false, reason: '없는 스킬입니다.' };
    if (lv <= 0) return { ok: false, reason: `[${sk.name}] 캐릭터 Lv.${sk.reqLevel}부터 습득 가능 — 스킬 창(K)에서 배우세요.` };
    if (this.remaining(id) > 0) return { ok: false, reason: '재사용 대기 중입니다.', silent: true };
    if (state.mp < this.mpCost(sk, lv)) return { ok: false, reason: 'MP가 부족합니다.' };
    if (sk.chargeCost && state.charge < sk.chargeCost) return { ok: false, reason: `기(氣)가 부족합니다. (${state.charge}/${sk.chargeCost})` };
    return { ok: true };
  },

  cast(scene, player, id) {
    const state = SR.state;
    const c = this.check(state, id);
    if (!c.ok) return c;
    const sk = SR.Data.skills[id];
    const lv = state.skillLevel(id);
    state.mp -= this.mpCost(sk, lv);
    this.cooldowns[id] = sk.cooldown;

    // 대상 방향 정하기: 가까운 적이 있으면 그쪽을 바라봄
    const reach = (sk.range || sk.radius || 120) + 120;
    const tgt = scene.findNearestMonster(player.x, player.y, reach);
    if (tgt && sk.type !== 'buff' && sk.type !== 'aoe') player.faceTowards(tgt.x, tgt.y);
    const ang = player.facingAngle;
    const mult = SR.Combat.scaled(sk.damage, lv);

    let chargeUsed = 0;
    if (sk.consumeAllCharge) { chargeUsed = state.charge; state.addCharge(-state.charge); }
    else if (sk.chargeCost) { chargeUsed = sk.chargeCost; state.addCharge(-sk.chargeCost); }

    switch (sk.type) {
      case 'melee': {
        player.lockFor(sk.hits * sk.hitInterval + 0.12, 'punch');
        if (sk.lunge) player.lunge(ang, sk.lunge);
        SR.FX.flurry(scene, player.x, player.y, ang, sk.range);
        SR.Sound.play('whoosh');
        for (let i = 0; i < sk.hits; i++) {
          scene.time.delayedCall(60 + i * sk.hitInterval * 1000, () => {
            const targets = scene.monstersInArc(player.x, player.y, sk.range, ang, sk.arc);
            targets.forEach(m => scene.playerDamage(m, mult, { fx: 'punch', skill: true }));
            if (targets.length) SR.Sound.play('punch');
          });
        }
        break;
      }
      case 'aoe': {
        player.lockFor(sk.hits * sk.hitInterval + 0.15, 'kick');
        player.spin(sk.hits * sk.hitInterval + 0.1);
        SR.FX.whirl(scene, player, sk.radius);
        SR.Sound.play('whoosh');
        for (let i = 0; i < sk.hits; i++) {
          scene.time.delayedCall(40 + i * sk.hitInterval * 1000, () => {
            const targets = scene.monstersInRadius(player.x, player.y, sk.radius);
            targets.forEach(m => {
              scene.playerDamage(m, mult, { fx: 'kick', skill: true });
              if (sk.knockback && i === sk.hits - 1) m.knockback(player.x, player.y, sk.knockback);
            });
          });
        }
        break;
      }
      case 'cone': {
        player.lockFor(0.4, 'kick');
        SR.FX.flameCone(scene, player.x + Math.cos(ang) * 20, player.y - 20 + Math.sin(ang) * 14, ang, sk.range, sk.arc);
        SR.Sound.play('fire');
        for (let i = 0; i < sk.hits; i++) {
          scene.time.delayedCall(120 + i * sk.hitInterval * 1000, () => {
            const targets = scene.monstersInArc(player.x, player.y, sk.range, ang, sk.arc);
            targets.forEach(m => {
              scene.playerDamage(m, mult, { fx: 'fire', skill: true });
              if (sk.burn && i === 0) m.applyBurn(SR.Combat.scaled({ base: sk.burn.base, perLevel: sk.burn.perLevel }, lv), sk.burn.ticks, sk.burn.interval);
            });
          });
        }
        break;
      }
      case 'buff': {
        player.lockFor(0.35, 'cast');
        const b = sk.buff;
        state.addBuff(b.id, {
          atkPct: SR.Combat.scaled(b.atkPct, lv),
          crit: SR.Combat.scaled(b.crit, lv)
        });
        SR.FX.aura(scene, player.x, player.y);
        SR.Sound.play('buff');
        SR.log(`[${sk.name}] 공격력 +${Math.round(SR.Combat.scaled(b.atkPct, lv) * 100)}%, 치명타 +${Math.round(SR.Combat.scaled(b.crit, lv) * 100)}%`, '#ffd27a');
        break;
      }
      case 'finisher': {
        player.lockFor(0.5, 'cast');
        const cx = player.x + Math.cos(ang) * sk.range, cy = player.y + Math.sin(ang) * sk.range * 0.7;
        player.jumpSlam(0.35);
        scene.time.delayedCall(340, () => {
          SR.FX.quake(scene, cx, cy, sk.radius);
          SR.Sound.play('quake');
          const per = sk.perCharge ? Math.max(1, chargeUsed) : 1;
          scene.monstersInRadius(cx, cy, sk.radius).forEach(m => scene.playerDamage(m, mult * per, { fx: 'quake', skill: true }));
        });
        break;
      }
    }
    if (sk.chargeGain) state.addCharge(sk.chargeGain);
    SR.bus.emit('skillCast', id);
    return { ok: true };
  }
};
