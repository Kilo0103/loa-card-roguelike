import { hasMagicBook } from "../data/magicBooks.js";
import { drawCards } from "./deck.js";
import {
  getAttackMultiplier,
  getBlockGain,
  getDestructionDuration,
  getFlatAttackBonus,
  getStaggerGain,
  ignoresEnemyShield,
} from "./magicBookEffects.js";

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

export function dealDamageToEnemy(
  battle,
  enemy,
  rawDamage,
  options = {}
) {
  if (!enemy || enemy.hp <= 0) {
    return 0;
  }

  const destruction = enemy.statuses.destruction;
  const bonusPercent = destruction ? destruction.value : 0;
  const reductionPercent = enemy.special && enemy.special.immortalStacks > 0
    ? enemy.special.immortalStacks * 15
    : 0;
  const netPercent = Math.max(-90, bonusPercent - reductionPercent);
  const modifiedDamage = Math.max(
    0,
    Math.ceil(rawDamage * (1 + netPercent / 100))
  );
  const absorbed = options.ignoreBlock
    ? 0
    : Math.min(enemy.block, modifiedDamage);
  const hpDamage = modifiedDamage - absorbed;

  if (!options.ignoreBlock) {
    enemy.block -= absorbed;
  }

  enemy.hp = Math.max(0, enemy.hp - hpDamage);

  let suffix = "";
  if (bonusPercent > 0) {
    suffix += " (파괴 +" + bonusPercent + "%)";
  }
  if (reductionPercent > 0) {
    suffix += " (불멸 -" + reductionPercent + "%)";
  }
  if (options.ignoreBlock) {
    suffix += " [쉴드 관통]";
  }

  addLog(battle, enemy.name + "에게 " + modifiedDamage + " 피해" + suffix);
  return modifiedDamage;
}

function dealCardDamage(
  run,
  battle,
  card,
  enemy,
  baseDamage,
  options = {}
) {
  const bonus = getFlatAttackBonus(
    run,
    battle,
    card,
    enemy,
    options
  );
  const multiplier = getAttackMultiplier(run, enemy);
  const damage = Math.ceil((baseDamage + bonus) * multiplier);

  return dealDamageToEnemy(
    battle,
    enemy,
    damage,
    {
      ignoreBlock: ignoresEnemyShield(run),
    }
  );
}

function gainBlock(run, battle, card, baseAmount) {
  const gained = getBlockGain(run, baseAmount, battle, card);
  battle.playerBlock += gained;
  addLog(battle, "보호막 " + gained + " 획득");
  return gained;
}

export function applyStagger(
  battle,
  enemy,
  value,
  run = null,
  card = null
) {
  if (!enemy || enemy.maxStagger <= 0 || enemy.staggeredTurns > 0) {
    return;
  }

  const actualValue = run && card
    ? getStaggerGain(run, card, value)
    : value;

  enemy.stagger = Math.max(0, enemy.stagger - actualValue);
  addLog(battle, enemy.name + " 무력화 " + actualValue + " 감소");

  if (enemy.stagger === 0) {
    enemy.staggeredTurns = 2;
    addLog(battle, enemy.name + " 무력화 성공 — 2턴 동안 행동 불가");
  }
}

export function applyEnemyStatus(
  run,
  battle,
  enemy,
  type,
  duration,
  value
) {
  if (!enemy || enemy.hp <= 0) {
    return;
  }

  let actualDuration = duration;
  if (type === "destruction") {
    actualDuration = getDestructionDuration(run, duration);
  }

  addTimedStatus(enemy.statuses, type, actualDuration, value);

  if (type === "taunt") {
    if (enemy.tier !== "boss") {
      enemy.actionCancelled = true;

      if (hasMagicBook(run, "counterattack")) {
        battle.playerStatuses.counterattackReady = true;
      }

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

function resolveCounter(run, battle, enemy) {
  if (!enemy || enemy.hp <= 0 || enemy.staggeredTurns > 0) {
    return false;
  }

  const intent = getCurrentIntent(enemy);
  if (!intent.counterable || enemy.actionCancelled) {
    return false;
  }

  enemy.actionCancelled = true;

  if (intent.removeImmortalOnCounter) {
    removeImmortalStack(battle, enemy, "카운터 성공");
  }

  drawCards(battle, 1);

  if (hasMagicBook(run, "opportunity_capture")) {
    battle.energy += 1;
    drawCards(battle, 1);
    addLog(battle, "기회 포착 — 코스트 1 회복 + 1장 추가 드로우");
  }

  if (hasMagicBook(run, "counterattack")) {
    battle.playerStatuses.counterattackReady = true;
  }

  addLog(battle, enemy.name + " 카운터 성공 — 현재 행동 취소 + 1장 드로우");
  return true;
}

export function resolveCharge(run, battle) {
  if (!battle.charge) {
    return;
  }

  const card = battle.charge.card;
  const enemy = battle.enemies[battle.charge.targetIndex];
  const stage = battle.charge.stage;
  const damage = card.charge.stages[stage - 1];
  const maxCharge = stage >= card.charge.stages.length;

  if (enemy && enemy.hp > 0) {
    dealCardDamage(
      run,
      battle,
      card,
      enemy,
      damage,
      {
        maxCharge,
        allIn: Boolean(battle.charge.allIn),
      }
    );

    if (card.chargeStatus) {
      applyEnemyStatus(
        run,
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

  battle.playerStatuses.firstAttackUsed = true;
  battle.playerStatuses.counterStanceReady = false;
  battle.playerStatuses.counterattackReady = false;
  battle.playerStatuses.nightmareAttackBonus = false;
  battle.charge = null;
}

export function resolveCardEffects(run, battle, card, enemy) {
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage":
        dealCardDamage(
          run,
          battle,
          card,
          enemy,
          effect.value,
          { allIn: battle.playerStatuses.currentCardEndsAtZero }
        );
        break;
      case "block":
        gainBlock(run, battle, card, effect.value);
        break;
      case "stagger":
        applyStagger(battle, enemy, effect.value, run, card);
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
        const gained = gainBlock(run, battle, card, battle.playerBlock);
        addLog(battle, "철옹성 — 보호막 " + gained + " 추가");
        break;
      }
      case "taunt":
        applyEnemyStatus(
          run,
          battle,
          enemy,
          "taunt",
          effect.duration,
          0
        );
        break;
      case "weakness":
        applyEnemyStatus(
          run,
          battle,
          enemy,
          "weakness",
          effect.duration,
          effect.value
        );
        break;
      case "cleanse":
        cleansePlayerDebuff(battle);
        break;
      case "counterSpear":
        battle.playerStatuses.counterSpear = true;
        addLog(battle, "카운터 스피어 준비");
        break;
      case "holdTheLine":
        gainBlock(run, battle, card, 6);
        if (battle.playerBlock >= 15) {
          drawCards(battle, 1);
          addLog(battle, "전선 유지 조건 달성 — 1장 드로우");
        }
        break;
      case "shieldBash": {
        const shield = battle.playerBlock;
        const damage = shield >= 5 ? 6 : 4;
        dealCardDamage(
          run,
          battle,
          card,
          enemy,
          damage,
          { allIn: battle.playerStatuses.currentCardEndsAtZero }
        );

        if (shield >= 15) {
          applyStagger(battle, enemy, 1, run, card);
        }
        break;
      }
      case "shieldCharge": {
        const refund = battle.playerBlock >= 10;
        dealCardDamage(
          run,
          battle,
          card,
          enemy,
          6,
          { allIn: battle.playerStatuses.currentCardEndsAtZero }
        );
        gainBlock(run, battle, card, 3);

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

        dealCardDamage(
          run,
          battle,
          card,
          enemy,
          damage,
          { allIn: battle.playerStatuses.currentCardEndsAtZero }
        );
        break;
      }
      case "damageIfStaggered":
        dealCardDamage(
          run,
          battle,
          card,
          enemy,
          enemy && enemy.staggeredTurns > 0
            ? effect.staggered
            : effect.normal,
          { allIn: battle.playerStatuses.currentCardEndsAtZero }
        );
        break;
      case "counter":
        resolveCounter(run, battle, enemy);
        break;
      case "chargeDamage":
        break;
      default:
        throw new Error("Unsupported effect type: " + effect.type);
    }
  }
}
