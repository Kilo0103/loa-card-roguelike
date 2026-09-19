import { drawCards } from "./deck.js";

function addLog(battle, message) {
  battle.log.unshift(message);
  battle.log = battle.log.slice(0, 18);
}

function addTimedStatus(statuses, type, duration, value) {
  if (statuses[type]) {
    statuses[type].duration += duration;
    return;
  }

  statuses[type] = {
    duration,
    value: value || 0,
  };
}

function currentIntentList(enemy) {
  if (enemy.bossPhase === "ghost") {
    if (enemy.special.immortalStacks > 0) {
      return enemy.ghostIntents.filter(function availableIntent(intent) {
        return !intent.requiresNoImmortal;
      });
    }
    return enemy.ghostIntents;
  }

  return enemy.intents;
}

function getCurrentIntent(enemy) {
  const intents = currentIntentList(enemy);
  return intents[enemy.intentIndex % intents.length];
}

function removeImmortalStack(battle, enemy, reason) {
  if (enemy.special.immortalStacks <= 0) {
    return;
  }

  enemy.special.immortalStacks -= 1;
  addLog(
    battle,
    enemy.name + " 불멸 1중첩 제거 (" + reason + ") — 남은 " +
      enemy.special.immortalStacks
  );
}

export function dealDamageToEnemy(battle, enemy, rawDamage) {
  if (!enemy || enemy.hp <= 0) {
    return 0;
  }

  const destruction = enemy.statuses.destruction;
  const bonusPercent = destruction ? destruction.value : 0;
  const reductionPercent = enemy.special && enemy.special.immortalStacks > 0
    ? enemy.special.immortalStacks * 15
    : 0;
  const netPercent = Math.max(-90, bonusPercent - reductionPercent);
  const modifiedDamage = Math.max(0, Math.ceil(rawDamage * (1 + netPercent / 100)));
  const absorbed = Math.min(enemy.block, modifiedDamage);
  const hpDamage = modifiedDamage - absorbed;

  enemy.block -= absorbed;
  enemy.hp = Math.max(0, enemy.hp - hpDamage);

  let suffix = "";
  if (bonusPercent > 0) {
    suffix += " (파괴 +" + bonusPercent + "%)";
  }
  if (reductionPercent > 0) {
    suffix += " (불멸 -" + reductionPercent + "%)";
  }

  addLog(battle, enemy.name + "에게 " + modifiedDamage + " 피해" + suffix);
  return modifiedDamage;
}

export function applyStagger(battle, enemy, value) {
  if (!enemy || enemy.maxStagger <= 0 || enemy.staggeredTurns > 0) {
    return;
  }

  enemy.stagger = Math.max(0, enemy.stagger - value);
  addLog(battle, enemy.name + " 무력화 " + value + " 감소");

  if (enemy.stagger === 0) {
    enemy.staggeredTurns = 2;
    addLog(battle, enemy.name + " 무력화 성공 — 2턴 동안 행동 불가");
  }
}

export function applyEnemyStatus(battle, enemy, type, duration, value) {
  if (!enemy || enemy.hp <= 0) {
    return;
  }

  addTimedStatus(enemy.statuses, type, duration, value);

  if (type === "taunt") {
    if (enemy.tier !== "boss") {
      enemy.actionCancelled = true;
      addLog(battle, enemy.name + " 도발 — 현재 행동 취소");
    } else {
      addLog(battle, enemy.name + "은 보스라 도발의 행동 취소에 면역");
    }
  }
}

function cleansePlayerDebuff(battle) {
  const keys = Object.keys(battle.playerDebuffs);
  if (keys.length === 0) {
    addLog(battle, "정화할 디버프가 없습니다.");
    return;
  }

  const index = Math.floor(Math.random() * keys.length);
  const key = keys[index];
  delete battle.playerDebuffs[key];
  addLog(battle, key + " 정화");
}

function resolveCounter(battle, enemy) {
  if (!enemy || enemy.hp <= 0 || enemy.staggeredTurns > 0) {
    return;
  }

  const intent = getCurrentIntent(enemy);
  if (!intent.counterable || enemy.actionCancelled) {
    return;
  }

  enemy.actionCancelled = true;

  if (intent.removeImmortalOnCounter) {
    removeImmortalStack(battle, enemy, "카운터 성공");
  }

  drawCards(battle, 1);
  addLog(battle, enemy.name + " 카운터 성공 — 현재 행동 취소 + 1장 드로우");
}

export function resolveCharge(battle) {
  if (!battle.charge) {
    return;
  }

  const card = battle.charge.card;
  const enemy = battle.enemies[battle.charge.targetIndex];
  const stage = battle.charge.stage;
  const damage = card.charge.stages[stage - 1];

  if (enemy && enemy.hp > 0) {
    dealDamageToEnemy(battle, enemy, damage);
    if (card.chargeStatus) {
      applyEnemyStatus(
        battle,
        enemy,
        card.chargeStatus.type,
        card.chargeStatus.duration,
        card.chargeStatus.value
      );
    }
    addLog(battle, card.name + " " + stage + "단계 발사");
  } else {
    addLog(battle, card.name + " 차징 대상이 없어 취소");
  }

  battle.charge = null;
}

export function resolveCardEffects(run, battle, card, enemy) {
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage":
        dealDamageToEnemy(battle, enemy, effect.value);
        break;
      case "block":
        battle.playerBlock += effect.value;
        addLog(battle, "보호막 " + effect.value + " 획득");
        break;
      case "stagger":
        applyStagger(battle, enemy, effect.value);
        break;
      case "draw":
        drawCards(battle, effect.value);
        addLog(battle, "카드 " + effect.value + "장 드로우");
        break;
      case "energy":
        battle.energy += effect.value;
        addLog(battle, "코스트 " + effect.value + " 회복");
        break;
      case "doubleShield": {
        const gained = battle.playerBlock;
        battle.playerBlock += gained;
        addLog(battle, "철옹성 — 보호막 " + gained + " 추가");
        break;
      }
      case "taunt":
        applyEnemyStatus(battle, enemy, "taunt", effect.duration, 0);
        break;
      case "weakness":
        applyEnemyStatus(battle, enemy, "weakness", effect.duration, effect.value);
        break;
      case "cleanse":
        cleansePlayerDebuff(battle);
        break;
      case "counterSpear":
        battle.playerStatuses.counterSpear = true;
        addLog(battle, "카운터 스피어 준비");
        break;
      case "holdTheLine":
        battle.playerBlock += 6;
        addLog(battle, "보호막 6 획득");
        if (battle.playerBlock >= 15) {
          drawCards(battle, 1);
          addLog(battle, "전선 유지 조건 달성 — 1장 드로우");
        }
        break;
      case "shieldBash": {
        const shield = battle.playerBlock;
        const damage = shield >= 5 ? 6 : 4;
        dealDamageToEnemy(battle, enemy, damage);
        if (shield >= 15) {
          applyStagger(battle, enemy, 1);
        }
        break;
      }
      case "shieldCharge": {
        const refund = battle.playerBlock >= 10;
        dealDamageToEnemy(battle, enemy, 6);
        battle.playerBlock += 3;
        addLog(battle, "보호막 3 획득");
        if (refund) {
          battle.energy += 1;
          addLog(battle, "방패 돌진 조건 달성 — 코스트 1 회복");
        }
        break;
      }
      case "damageByShield": {
        let damage = effect.base;
        for (const threshold of effect.thresholds) {
          if (battle.playerBlock >= threshold[0]) {
            damage = threshold[1];
            break;
          }
        }
        dealDamageToEnemy(battle, enemy, damage);
        break;
      }
      case "damageIfStaggered":
        dealDamageToEnemy(
          battle,
          enemy,
          enemy && enemy.staggeredTurns > 0 ? effect.staggered : effect.normal
        );
        break;
      case "counter":
        resolveCounter(battle, enemy);
        break;
      case "chargeDamage":
        break;
      default:
        throw new Error("Unsupported effect type: " + effect.type);
    }
  }
}
