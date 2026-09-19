import {
  createEnemy,
  getEncounterForBattle,
  isFinalBossEncounter,
} from "../data/enemies.js";
import { getCard } from "../data/cards.js";
import { discardHand, drawCards, shuffle } from "./deck.js";
import {
  dealDamageToEnemy,
  resolveCardEffects,
  resolveCharge,
} from "./effects.js";

export const MAX_ENERGY = 5;
const HAND_SIZE = 5;

function addLog(battle, message) {
  battle.log.unshift(message);
  battle.log = battle.log.slice(0, 18);
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

function getIntent(enemy) {
  const intents = currentIntentList(enemy);
  return intents[enemy.intentIndex % intents.length];
}

function advanceIntent(enemy) {
  enemy.intentIndex += 1;
}

function firstLivingEnemyIndex(battle) {
  return battle.enemies.findIndex(function isAlive(enemy) {
    return enemy.hp > 0;
  });
}

function ensureSelectedEnemy(battle) {
  const selected = battle.enemies[battle.selectedEnemyIndex];
  if (!selected || selected.hp <= 0) {
    battle.selectedEnemyIndex = firstLivingEnemyIndex(battle);
  }
}

function tickStatuses(statuses) {
  for (const key of Object.keys(statuses)) {
    statuses[key].duration -= 1;
    if (statuses[key].duration <= 0) {
      delete statuses[key];
    }
  }
}

function addPlayerDebuff(battle, type, duration, value) {
  if (battle.playerDebuffs[type]) {
    battle.playerDebuffs[type].duration += duration;
    return;
  }

  battle.playerDebuffs[type] = {
    duration,
    value: value || 0,
  };
}

function updateBossPhase(battle, enemy) {
  if (
    enemy.id === "valtan" &&
    enemy.hp > 0 &&
    enemy.hp <= 30 &&
    enemy.bossPhase !== "ghost"
  ) {
    enemy.bossPhase = "ghost";
    enemy.intentIndex = 0;
    enemy.special.immortalStacks = 3;
    enemy.block = 0;
    addLog(battle, "유령 발탄 등장 — 불멸 3중첩");
  }
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

function damagePlayer(run, battle, enemy, amount, piercing) {
  const weakness = enemy.statuses.weakness;
  const reducedAmount = Math.max(0, amount - (weakness ? weakness.value : 0));
  const absorbed = piercing ? 0 : Math.min(battle.playerBlock, reducedAmount);
  const hpDamage = reducedAmount - absorbed;

  if (!piercing) {
    battle.playerBlock -= absorbed;
  }

  run.hp = Math.max(0, run.hp - hpDamage);

  const piercingText = piercing ? " [쉴드 관통]" : "";
  addLog(
    battle,
    enemy.name + " 공격 " + reducedAmount + piercingText +
      " (HP 피해 " + hpDamage + ")"
  );

  if (battle.playerStatuses.counterSpear) {
    battle.playerStatuses.counterSpear = false;
    if (absorbed > 0 && enemy.hp > 0) {
      dealDamageToEnemy(battle, enemy, absorbed);
      addLog(battle, "카운터 스피어 — 소모된 보호막 " + absorbed + " 반격");
    }
  }
}

function extendPlayerDebuff(battle, status, duration) {
  const debuff = battle.playerDebuffs[status];
  if (!debuff) {
    addLog(battle, status + "이 없어 연장되지 않음");
    return;
  }

  debuff.duration += duration;
  addLog(battle, status + " 지속시간 +" + duration + "턴");
}

function addRubble(battle, enemy) {
  enemy.special.collapseCount += 1;
  const amount = Math.min(2, enemy.special.collapseCount);

  for (let count = 0; count < amount; count += 1) {
    battle.discardPile.push("rubble");
  }

  addLog(battle, "지형 붕괴 — 잔해 " + amount + "장 추가");
}

function resolveEnemyIntent(run, battle, enemy) {
  if (enemy.hp <= 0) {
    return;
  }

  updateBossPhase(battle, enemy);

  if (enemy.staggeredTurns > 0) {
    addLog(battle, enemy.name + " 무력화 — 행동 불가");
    enemy.staggeredTurns -= 1;
    advanceIntent(enemy);
    tickStatuses(enemy.statuses);

    if (enemy.staggeredTurns === 0) {
      enemy.stagger = enemy.maxStagger;
      addLog(battle, enemy.name + " 무력화 종료 — 게이지 완전 회복");
    }
    return;
  }

  if (enemy.actionCancelled) {
    addLog(battle, enemy.name + "의 현재 행동이 취소됨");
    enemy.actionCancelled = false;
    advanceIntent(enemy);
    tickStatuses(enemy.statuses);
    return;
  }

  const intent = getIntent(enemy);

  if (intent.type === "attack" || intent.type === "attackStatus") {
    const amount = intent.value + enemy.attackBonus;
    damagePlayer(run, battle, enemy, amount, Boolean(intent.piercing));
    enemy.attackBonus = 0;

    if (intent.type === "attackStatus" && run.hp > 0) {
      addPlayerDebuff(
        battle,
        intent.status,
        intent.duration,
        intent.statusValue
      );
      addLog(battle, intent.status + " " + intent.duration + "턴 부여");
    }
  } else if (intent.type === "multiAttack") {
    const amount = intent.value * intent.hits + enemy.attackBonus;
    damagePlayer(run, battle, enemy, amount, Boolean(intent.piercing));
    enemy.attackBonus = 0;
  } else if (intent.type === "multiAttackStatus") {
    const amount = intent.value * intent.hits + enemy.attackBonus;
    damagePlayer(run, battle, enemy, amount, false);
    enemy.attackBonus = 0;

    if (run.hp > 0) {
      addPlayerDebuff(
        battle,
        intent.status,
        intent.duration,
        intent.statusValue
      );
      addLog(battle, intent.status + " " + intent.duration + "턴 부여");
    }
  } else if (intent.type === "packAttack") {
    const livingAllies = battle.enemies.filter(function aliveAlly(other) {
      return other !== enemy && other.hp > 0;
    }).length;
    const bonus = Math.min(intent.maxBonus, livingAllies * intent.bonusPerAlly);
    damagePlayer(
      run,
      battle,
      enemy,
      intent.value + bonus + enemy.attackBonus,
      false
    );
    enemy.attackBonus = 0;
  } else if (intent.type === "conditionalAttack") {
    const bonus = battle.playerDebuffs[intent.status] ? intent.bonus : 0;
    damagePlayer(
      run,
      battle,
      enemy,
      intent.value + bonus + enemy.attackBonus,
      false
    );
    enemy.attackBonus = 0;
  } else if (intent.type === "conditionalAttackAny") {
    const hasStatus = intent.statuses.some(function hasDebuff(status) {
      return Boolean(battle.playerDebuffs[status]);
    });
    const bonus = hasStatus ? intent.bonus : 0;
    damagePlayer(
      run,
      battle,
      enemy,
      intent.value + bonus + enemy.attackBonus,
      false
    );
    enemy.attackBonus = 0;
  } else if (intent.type === "guard") {
    enemy.block += intent.value;
    addLog(battle, enemy.name + " 보호막 " + intent.value + " 획득");
  } else if (intent.type === "buffAllAttack") {
    for (const ally of battle.enemies) {
      if (ally !== enemy && ally.hp > 0) {
        ally.attackBonus += intent.value;
      }
    }
    addLog(battle, enemy.name + "이 다른 마수들의 다음 공격을 강화");
  } else if (intent.type === "summon") {
    const livingCount = battle.enemies.filter(function alive(other) {
      return other.hp > 0;
    }).length;

    if (livingCount < 5) {
      battle.enemies.push(createEnemy(intent.enemyId));
      addLog(battle, enemy.name + "이 마수를 소환");
    } else {
      addLog(battle, "전장이 가득 차 소환 실패");
    }
  } else if (intent.type === "extendPlayerDebuff") {
    extendPlayerDebuff(battle, intent.status, intent.duration);
  } else if (intent.type === "frostTrap") {
    enemy.special.frostTrap = true;
    addLog(battle, "빙결 덫 설치 — 다음 턴 카드 3장 사용 필요");
  } else if (intent.type === "delayedBlast") {
    enemy.special.delayedBlast = {
      value: intent.value,
    };
    addLog(battle, "지연 폭발 생성 — 다음 플레이어 턴 종료 전에 무력화 가능");
  } else if (intent.type === "bondCheck") {
    enemy.special.bondPending = {
      value: intent.value,
      block: intent.block,
    };
    addLog(battle, "결속 시작 — 다음 " + enemy.name + " 턴 전까지 무력화 필요");
  } else if (intent.type === "terrainStrike") {
    damagePlayer(run, battle, enemy, intent.value + enemy.attackBonus, false);
    enemy.attackBonus = 0;
  } else if (intent.type === "terrainCollapse") {
    damagePlayer(run, battle, enemy, intent.value + enemy.attackBonus, false);
    enemy.attackBonus = 0;
    addRubble(battle, enemy);
  }

  if (intent.removeImmortalAfter) {
    removeImmortalStack(battle, enemy, "패턴 종료");
  }

  advanceIntent(enemy);
  tickStatuses(enemy.statuses);
}

function resolvePlayerDebuffsAtTurnEnd(run, battle) {
  const bleed = battle.playerDebuffs.bleed;
  if (bleed) {
    run.hp = Math.max(0, run.hp - bleed.value);
    addLog(battle, "출혈로 HP " + bleed.value + " 피해");
  }

  tickStatuses(battle.playerDebuffs);
}

function resolvePendingChecks(run, battle) {
  for (const enemy of battle.enemies) {
    if (enemy.hp <= 0) {
      continue;
    }

    if (enemy.special.frostTrap) {
      enemy.special.frostTrap = false;

      if (battle.playerStatuses.cardsPlayedThisTurn < 3) {
        damagePlayer(run, battle, enemy, 8, false);
        addPlayerDebuff(battle, "frozen", 1, 1);
        addLog(battle, "빙결 덫 실패 — 빙결 1턴");
      } else {
        addLog(battle, "빙결 덫 해제 성공");
      }
    }

    if (enemy.special.delayedBlast) {
      const delayed = enemy.special.delayedBlast;
      enemy.special.delayedBlast = null;

      if (enemy.staggeredTurns > 0) {
        addLog(battle, enemy.name + " 무력화로 지연 폭발 취소");
      } else {
        damagePlayer(run, battle, enemy, delayed.value, false);
      }
    }

    if (enemy.special.bondPending) {
      const bond = enemy.special.bondPending;
      enemy.special.bondPending = false;

      if (enemy.staggeredTurns > 0) {
        addLog(battle, "결속 파훼 성공 — 무력화 유지");
      } else {
        damagePlayer(run, battle, enemy, bond.value, false);
        enemy.block += bond.block;
        enemy.actionCancelled = true;
        addLog(
          battle,
          "결속 파훼 실패 — 피해 " + bond.value +
            " + 보호막 " + bond.block
        );
      }
    }

    if (run.hp <= 0) {
      return;
    }
  }
}

function startPlayerTurn(battle) {
  battle.turn += 1;
  battle.energy = MAX_ENERGY;
  battle.playerStatuses.cardsPlayedThisTurn = 0;
  drawCards(battle, HAND_SIZE);
  ensureSelectedEnemy(battle);
  addLog(battle, battle.turn + "턴 시작");
}

function checkVictory(battle) {
  const alive = battle.enemies.some(function alive(enemy) {
    return enemy.hp > 0;
  });

  if (!alive) {
    battle.status = "victory";
    battle.charge = null;
    addLog(battle, "전투 승리!");
    return true;
  }

  for (const enemy of battle.enemies) {
    if (enemy.hp > 0) {
      updateBossPhase(battle, enemy);
    }
  }

  ensureSelectedEnemy(battle);
  return false;
}

function selectedEnemy(battle) {
  ensureSelectedEnemy(battle);
  return battle.enemies[battle.selectedEnemyIndex] || null;
}

export function createBattle(run) {
  const encounter = getEncounterForBattle(run.battleNumber);
  const battle = {
    encounter,
    isFinalBoss: isFinalBossEncounter(encounter),
    enemies: encounter.map(function makeEnemy(enemyId) {
      return createEnemy(enemyId);
    }),
    selectedEnemyIndex: 0,
    turn: 0,
    energy: MAX_ENERGY,
    playerBlock: 0,
    playerStatuses: {
      counterSpear: false,
      cardsPlayedThisTurn: 0,
    },
    playerDebuffs: {},
    charge: null,
    drawPile: shuffle(run.deck),
    discardPile: [],
    hand: [],
    status: "playing",
    log: [],
  };

  startPlayerTurn(battle);
  return battle;
}

export function getEnemyIntent(battle, enemy) {
  updateBossPhase(battle, enemy);

  if (enemy.staggeredTurns > 0) {
    return {
      type: "staggered",
      value: 0,
      label: "무력화 " + enemy.staggeredTurns + "턴",
      counterable: false,
    };
  }

  if (enemy.actionCancelled) {
    return {
      type: "cancelled",
      value: 0,
      label: "행동 취소됨",
      counterable: false,
    };
  }

  const intent = getIntent(enemy);

  if (intent.type === "packAttack") {
    const livingAllies = battle.enemies.filter(function aliveAlly(other) {
      return other !== enemy && other.hp > 0;
    }).length;
    const bonus = Math.min(intent.maxBonus, livingAllies * intent.bonusPerAlly);
    return {
      ...intent,
      label: "무리 공격 " + (intent.value + bonus + enemy.attackBonus),
    };
  }

  if (intent.type === "conditionalAttack") {
    const bonus = battle.playerDebuffs[intent.status] ? intent.bonus : 0;
    return {
      ...intent,
      label: intent.label + (bonus > 0 ? " → " + (intent.value + bonus) : ""),
    };
  }

  if (intent.type === "conditionalAttackAny") {
    const hasStatus = intent.statuses.some(function hasDebuff(status) {
      return Boolean(battle.playerDebuffs[status]);
    });
    return {
      ...intent,
      label: intent.label + (hasStatus ? " → " + (intent.value + intent.bonus) : ""),
    };
  }

  if (
    (intent.type === "attack" ||
      intent.type === "attackStatus" ||
      intent.type === "multiAttack" ||
      intent.type === "multiAttackStatus") &&
    enemy.attackBonus > 0
  ) {
    return {
      ...intent,
      label: intent.label + " (강화 +" + enemy.attackBonus + ")",
    };
  }

  return intent;
}

export function getEffectiveCardCost(battle, card) {
  if (card.unplayable) {
    return Number.POSITIVE_INFINITY;
  }

  let cost = card.cost;

  if (card.charge && battle.charge && battle.charge.card.id === card.id) {
    cost = 0;
  }

  if (battle.playerStatuses.cardsPlayedThisTurn === 0) {
    const cold = battle.playerDebuffs.cold;
    const frozen = battle.playerDebuffs.frozen;
    cost += cold ? cold.value : 0;
    cost += frozen ? frozen.value : 0;
  }

  return cost;
}

export function selectEnemy(battle, enemyIndex) {
  const enemy = battle.enemies[enemyIndex];
  if (enemy && enemy.hp > 0) {
    battle.selectedEnemyIndex = enemyIndex;
  }
}

export function playCard(run, battle, handIndex) {
  if (battle.status !== "playing") {
    return;
  }

  const cardId = battle.hand[handIndex];
  const card = getCard(cardId);

  if (card.unplayable) {
    addLog(battle, card.name + "은 사용할 수 없습니다.");
    return;
  }

  const cost = getEffectiveCardCost(battle, card);

  if (cost > battle.energy) {
    addLog(battle, "코스트가 부족합니다.");
    return;
  }

  if (battle.charge && battle.charge.card.id !== card.id) {
    resolveCharge(battle);
    if (checkVictory(battle)) {
      return;
    }
  }

  const enemy = selectedEnemy(battle);
  if (card.target === "enemy" && !enemy) {
    addLog(battle, "대상이 없습니다.");
    return;
  }

  const wasFirstCard = battle.playerStatuses.cardsPlayedThisTurn === 0;

  battle.energy -= cost;
  battle.hand.splice(handIndex, 1);
  battle.discardPile.push(cardId);
  battle.playerStatuses.cardsPlayedThisTurn += 1;

  if (wasFirstCard && battle.playerDebuffs.frozen) {
    delete battle.playerDebuffs.frozen;
    addLog(battle, "빙결 해제");
  }

  if (card.charge) {
    if (battle.charge && battle.charge.card.id === card.id) {
      battle.charge.stage += 1;
      addLog(
        battle,
        card.name + " 차징 " + battle.charge.stage +
          "단계 (추가 기본 코스트 0)"
      );
    } else {
      battle.charge = {
        card,
        stage: 1,
        targetIndex: battle.selectedEnemyIndex,
      };
      addLog(battle, card.name + " 차징 1단계 (-" + cost + ")");
    }

    if (battle.charge.stage >= card.charge.stages.length) {
      resolveCharge(battle);
      checkVictory(battle);
    }
    return;
  }

  addLog(battle, card.name + " 사용 (-" + cost + ")");
  resolveCardEffects(run, battle, card, enemy);
  checkVictory(battle);
}

export function endTurn(run, battle) {
  if (battle.status !== "playing") {
    return;
  }

  resolveCharge(battle);
  if (checkVictory(battle)) {
    return;
  }

  discardHand(battle);
  resolvePlayerDebuffsAtTurnEnd(run, battle);
  resolvePendingChecks(run, battle);

  if (run.hp <= 0) {
    battle.status = "defeat";
    addLog(battle, "플레이어가 쓰러졌습니다.");
    return;
  }

  const enemySnapshot = [...battle.enemies];
  for (const enemy of enemySnapshot) {
    resolveEnemyIntent(run, battle, enemy);

    if (run.hp <= 0) {
      battle.status = "defeat";
      addLog(battle, "플레이어가 쓰러졌습니다.");
      return;
    }
  }

  if (checkVictory(battle)) {
    return;
  }

  startPlayerTurn(battle);
}
