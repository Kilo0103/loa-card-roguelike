import {
  createEnemy,
  getEncounterForNode,
} from "../data/enemies.js";
import { getCard } from "../data/cards.js";
import { hasMagicBook } from "../data/magicBooks.js";
import {
  discardHand,
  drawCards,
  movePlayedCard,
  shuffle,
} from "./deck.js";
import {
  dealDamageToEnemy,
  resolveCardEffects,
  resolveCharge,
} from "./effects.js";
import {
  BASE_MAX_ENERGY,
  getBlockGain,
  getCardCostAdjustment,
  getIncomingDamageMultiplier,
  getMaxEnergy,
  getStartingChargeStage,
} from "./magicBookEffects.js";

export const MAX_ENERGY = BASE_MAX_ENERGY;
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

function maybeTriggerFirstAid(run, battle) {
  if (
    !hasMagicBook(run, "first_aid") ||
    battle.playerStatuses.firstAidUsed ||
    run.hp > run.maxHp * 0.5 ||
    run.hp <= 0
  ) {
    return;
  }

  const previousHp = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + 5);
  battle.playerStatuses.firstAidUsed = true;
  addLog(battle, "응급 처치 — HP " + (run.hp - previousHp) + " 회복");
}

function addPlayerDebuff(
  run,
  battle,
  type,
  duration,
  value,
  sourceEnemy = null
) {
  if (
    hasMagicBook(run, "cleanse_instinct") &&
    !battle.playerStatuses.cleanseInstinctUsed
  ) {
    battle.playerStatuses.cleanseInstinctUsed = true;
    addLog(battle, "정화 본능 — " + type + " 무효");
    return false;
  }

  if (battle.playerDebuffs[type]) {
    battle.playerDebuffs[type].duration += duration;
    return true;
  }

  battle.playerDebuffs[type] = {
    duration,
    value: value || 0,
    sourceEnemyId: sourceEnemy ? sourceEnemy.id : null,
  };
  return true;
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
  const weakenedAmount = Math.max(0, amount - (weakness ? weakness.value : 0));
  const reducedAmount = Math.ceil(
    weakenedAmount * getIncomingDamageMultiplier(run)
  );
  const absorbed = piercing ? 0 : Math.min(battle.playerBlock, reducedAmount);
  const hpDamage = reducedAmount - absorbed;

  if (!piercing) {
    battle.playerBlock -= absorbed;
  }

  if (
    absorbed > 0 &&
    hasMagicBook(run, "counter_stance")
  ) {
    battle.playerStatuses.counterStanceReady = true;
  }

  run.hp = Math.max(0, run.hp - hpDamage);

  const piercingText = piercing ? " [쉴드 관통]" : "";
  addLog(
    battle,
    enemy.name + " 공격 " + reducedAmount + piercingText +
      " (HP 피해 " + hpDamage + ")"
  );

  if (
    hpDamage > 0 &&
    hasMagicBook(run, "indomitable") &&
    !battle.playerStatuses.indomitableUsedThisEnemyTurn
  ) {
    const gained = getBlockGain(run, 3);
    battle.playerBlock += gained;
    battle.playerStatuses.indomitableUsedThisEnemyTurn = true;
    addLog(battle, "불굴 — 보호막 " + gained + " 획득");
  }

  maybeTriggerFirstAid(run, battle);

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

  battle.playerStatuses.indomitableUsedThisEnemyTurn = false;
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
        run,
        battle,
        intent.status,
        intent.duration,
        intent.statusValue,
        enemy
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
        run,
        battle,
        intent.status,
        intent.duration,
        intent.statusValue,
        enemy
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
    const bleedDamage = Math.ceil(
      bleed.value * getIncomingDamageMultiplier(run)
    );
    run.hp = Math.max(0, run.hp - bleedDamage);
    addLog(battle, "출혈로 HP " + bleedDamage + " 피해");
    maybeTriggerFirstAid(run, battle);
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
        addPlayerDebuff(run, battle, "frozen", 1, 1, enemy);
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

function startPlayerTurn(run, battle) {
  battle.turn += 1;

  const bonusEnergy = battle.playerStatuses.nextTurnEnergyBonus;
  battle.energy = getMaxEnergy(run) + bonusEnergy;
  battle.playerStatuses.nextTurnEnergyBonus = 0;
  battle.playerStatuses.cardsPlayedThisTurn = 0;
  battle.playerStatuses.guardianInstinctUsed = false;
  battle.playerStatuses.manaRefundUsed = false;
  battle.playerStatuses.rapidDeploymentUsed = false;
  battle.playerStatuses.tidyUpUsed = false;
  battle.playerStatuses.combatBreathingReady = false;

  if (
    hasMagicBook(run, "iron_will") &&
    battle.playerBlock > 0
  ) {
    const gained = getBlockGain(run, 2);
    battle.playerBlock += gained;
    addLog(battle, "철벽의 의지 — 보호막 " + gained + " 획득");
  }

  drawCards(battle, HAND_SIZE);
  ensureSelectedEnemy(battle);
  addLog(battle, battle.turn + "턴 시작");
}

function resolveVictoryEffects(run, battle) {
  if (battle.playerStatuses.victoryResolved) {
    return;
  }

  battle.playerStatuses.victoryResolved = true;

  if (hasMagicBook(run, "recovery")) {
    const previousHp = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + 3);
    addLog(battle, "회생 — HP " + (run.hp - previousHp) + " 회복");
  }
}

function checkVictory(run, battle) {
  const alive = battle.enemies.some(function alive(enemy) {
    return enemy.hp > 0;
  });

  if (!alive) {
    battle.status = "victory";
    battle.charge = null;
    resolveVictoryEffects(run, battle);
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

function resolvePostCardMagicBooks(run, battle, card) {
  if (
    hasMagicBook(run, "lightweight_combat") &&
    card.cost <= 1
  ) {
    battle.playerStatuses.lightweightCount += 1;

    if (battle.playerStatuses.lightweightCount % 3 === 0) {
      drawCards(battle, 1);
      addLog(battle, "경량 전투 — 1장 드로우");
    }
  }

  if (
    hasMagicBook(run, "rapid_deployment") &&
    battle.playerStatuses.cardsPlayedThisTurn >= 3 &&
    !battle.playerStatuses.rapidDeploymentUsed
  ) {
    battle.playerStatuses.rapidDeploymentUsed = true;
    drawCards(battle, 1);
    addLog(battle, "신속 전개 — 1장 드로우");
  }

  if (
    hasMagicBook(run, "tidy_up") &&
    battle.hand.length === 0 &&
    !battle.playerStatuses.tidyUpUsed
  ) {
    battle.playerStatuses.tidyUpUsed = true;
    drawCards(battle, 2);
    addLog(battle, "정리 정돈 — 2장 드로우");
  }
}

function finishAttackCard(battle, card) {
  if (card.type !== "attack") {
    return;
  }

  battle.playerStatuses.firstAttackUsed = true;
  battle.playerStatuses.counterStanceReady = false;
  battle.playerStatuses.counterattackReady = false;
  battle.playerStatuses.nightmareAttackBonus = false;
}

export function getPlayerMaxEnergy(run) {
  return getMaxEnergy(run);
}

export function createBattle(run, mapNode) {
  const encounterInfo = getEncounterForNode(mapNode, run.lastEncounterKey);
  run.lastEncounterKey = encounterInfo.key;

  const battle = {
    encounter: encounterInfo.enemies,
    encounterKey: encounterInfo.key,
    mapNodeId: mapNode.id,
    mapNodeType: mapNode.type,
    isFinalBoss: mapNode.type === "boss",
    enemies: encounterInfo.enemies.map(function makeEnemy(enemyId) {
      return createEnemy(enemyId);
    }),
    selectedEnemyIndex: 0,
    turn: 0,
    energy: getMaxEnergy(run),
    playerBlock: 0,
    playerStatuses: {
      counterSpear: false,
      cardsPlayedThisTurn: 0,
      firstAttackUsed: false,
      firstAidUsed: false,
      counterStanceReady: false,
      counterattackReady: false,
      guardianInstinctUsed: false,
      manaRefundUsed: false,
      rapidDeploymentUsed: false,
      tidyUpUsed: false,
      combatBreathingReady: false,
      lightweightCount: 0,
      nextTurnEnergyBonus: 0,
      currentCardEndsAtZero: false,
      indomitableUsedThisEnemyTurn: false,
      bloodContractActive: false,
      victoryResolved: false,
      cleanseInstinctUsed: false,
      nightmareFreeCard: false,
      nightmareAttackBonus: false,
      manaEchoStreak: 0,
      manaEchoTurns: 0,
      retainedHandIndex: null,
      retainSelectionMode: false,
      contingencyRemaining: 0,
      recyclingUsed: false,
    },
    playerDebuffs: {},
    charge: null,
    drawPile: shuffle(run.deck),
    discardPile: [],
    exhaustPile: [],
    hand: [],
    status: "playing",
    log: [],
  };

  if (hasMagicBook(run, "blood_contract")) {
    const hpLoss = Math.ceil(run.maxHp * 0.1);
    run.hp = Math.max(1, run.hp - hpLoss);
    battle.playerStatuses.bloodContractActive = true;
    addLog(battle, "피의 계약 — HP " + hpLoss + " 소모");
    maybeTriggerFirstAid(run, battle);
  }

  startPlayerTurn(run, battle);

  if (hasMagicBook(run, "contingency_plan")) {
    drawCards(battle, 2);
    battle.playerStatuses.contingencyRemaining = 2;
    addLog(battle, "예비 계획 — 2장을 추가 드로우. 버릴 카드 2장을 선택하세요.");
  }

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
      label: intent.label +
        (hasStatus ? " → " + (intent.value + intent.bonus) : ""),
    };
  }

  if (
    (
      intent.type === "attack" ||
      intent.type === "attackStatus" ||
      intent.type === "multiAttack" ||
      intent.type === "multiAttackStatus"
    ) &&
    enemy.attackBonus > 0
  ) {
    return {
      ...intent,
      label: intent.label + " (강화 +" + enemy.attackBonus + ")",
    };
  }

  return intent;
}

export function getEffectiveCardCost(run, battle, card) {
  if (card.unplayable) {
    return Number.POSITIVE_INFINITY;
  }

  let cost = card.cost;

  if (card.charge && battle.charge && battle.charge.card.id === card.id) {
    cost = 0;
  } else {
    cost += getCardCostAdjustment(run, battle, card);
  }

  if (battle.playerStatuses.cardsPlayedThisTurn === 0) {
    const cold = battle.playerDebuffs.cold;
    const frozen = battle.playerDebuffs.frozen;
    cost += cold ? cold.value : 0;
    cost += frozen ? frozen.value : 0;

    if (
      hasMagicBook(run, "endless_nightmare") &&
      battle.playerStatuses.nightmareFreeCard
    ) {
      return 0;
    }
  }

  return Math.max(0, cost);
}

export function discardContingencyCard(run, battle, handIndex) {
  if (
    !hasMagicBook(run, "contingency_plan") ||
    battle.status !== "playing" ||
    battle.playerStatuses.contingencyRemaining <= 0
  ) {
    return false;
  }

  const cardId = battle.hand[handIndex];
  if (!cardId) {
    return false;
  }

  battle.hand.splice(handIndex, 1);
  battle.discardPile.push(cardId);
  battle.playerStatuses.contingencyRemaining -= 1;

  addLog(
    battle,
    "예비 계획 — " + getCard(cardId).name +
      " 버림 (" + battle.playerStatuses.contingencyRemaining + "장 남음)"
  );

  return true;
}

export function toggleRetainSelectionMode(run, battle) {
  if (
    !hasMagicBook(run, "fixed_memory") ||
    battle.status !== "playing" ||
    battle.playerStatuses.contingencyRemaining > 0
  ) {
    return false;
  }

  battle.playerStatuses.retainSelectionMode =
    !battle.playerStatuses.retainSelectionMode;
  return true;
}

export function selectRetainedCard(run, battle, handIndex) {
  if (
    !hasMagicBook(run, "fixed_memory") ||
    battle.status !== "playing" ||
    !battle.playerStatuses.retainSelectionMode
  ) {
    return false;
  }

  if (!battle.hand[handIndex]) {
    return false;
  }

  battle.playerStatuses.retainedHandIndex = handIndex;
  battle.playerStatuses.retainSelectionMode = false;
  addLog(
    battle,
    "기억 고정 대상 — " + getCard(battle.hand[handIndex]).name
  );
  return true;
}

export function canEscapeBattle(run, battle) {
  return Boolean(
    battle &&
    battle.status === "playing" &&
    !battle.isFinalBoss &&
    hasMagicBook(run, "escape_master")
  );
}

export function escapeBattle(run, battle) {
  if (!canEscapeBattle(run, battle)) {
    return false;
  }

  battle.status = "escaped";
  battle.charge = null;
  addLog(battle, "탈출의 명수 — 보상을 포기하고 전투에서 이탈");
  return true;
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

  if (battle.playerStatuses.contingencyRemaining > 0) {
    addLog(battle, "예비 계획의 버릴 카드부터 선택해야 합니다.");
    return;
  }

  const cardId = battle.hand[handIndex];
  const card = getCard(cardId);

  if (card.unplayable) {
    addLog(battle, card.name + "은 사용할 수 없습니다.");
    return;
  }

  const cost = getEffectiveCardCost(run, battle, card);

  if (cost > battle.energy) {
    addLog(battle, "코스트가 부족합니다.");
    return;
  }

  if (battle.charge && battle.charge.card.id !== card.id) {
    resolveCharge(run, battle);

    if (checkVictory(run, battle)) {
      return;
    }
  }

  const enemy = selectedEnemy(battle);
  if (card.target === "enemy" && !enemy) {
    addLog(battle, "대상이 없습니다.");
    return;
  }

  const wasFirstCard = battle.playerStatuses.cardsPlayedThisTurn === 0;
  const guardianInstinctApplies =
    hasMagicBook(run, "guardian_instinct") &&
    card.type === "defense" &&
    battle.playerBlock >= 20 &&
    !battle.playerStatuses.guardianInstinctUsed;
  const combatBreathingApplies =
    hasMagicBook(run, "combat_breathing") &&
    battle.playerStatuses.combatBreathingReady;
  const manaRefundApplies =
    hasMagicBook(run, "mana_refund") &&
    card.cost >= 3 &&
    !battle.playerStatuses.manaRefundUsed;

  battle.playerStatuses.currentCardEndsAtZero =
    battle.energy - cost === 0;

  battle.energy -= cost;

  if (
    hasMagicBook(run, "mana_echo") &&
    battle.playerStatuses.manaEchoTurns > 0
  ) {
    battle.energy = Math.max(3, battle.energy);
  }

  battle.hand.splice(handIndex, 1);

  if (
    battle.playerStatuses.retainedHandIndex !== null &&
    handIndex < battle.playerStatuses.retainedHandIndex
  ) {
    battle.playerStatuses.retainedHandIndex -= 1;
  } else if (battle.playerStatuses.retainedHandIndex === handIndex) {
    battle.playerStatuses.retainedHandIndex = null;
  }

  movePlayedCard(run, battle, cardId, card);
  battle.playerStatuses.cardsPlayedThisTurn += 1;

  if (wasFirstCard) {
    battle.playerStatuses.nightmareFreeCard = false;
  }

  if (guardianInstinctApplies) {
    battle.playerStatuses.guardianInstinctUsed = true;
  }

  if (combatBreathingApplies) {
    battle.playerStatuses.combatBreathingReady = false;
  }

  if (
    hasMagicBook(run, "combat_breathing") &&
    battle.playerStatuses.cardsPlayedThisTurn === 3
  ) {
    battle.playerStatuses.combatBreathingReady = true;
  }

  if (manaRefundApplies) {
    battle.playerStatuses.manaRefundUsed = true;
    battle.energy += 1;
    addLog(battle, "마력 환급 — 코스트 1 회복");
  }

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
        stage: getStartingChargeStage(run, card),
        targetIndex: battle.selectedEnemyIndex,
        allIn: battle.playerStatuses.currentCardEndsAtZero,
      };

      addLog(
        battle,
        card.name + " 차징 " + battle.charge.stage +
          "단계 (-" + cost + ")"
      );
    }

    resolvePostCardMagicBooks(run, battle, card);
    battle.playerStatuses.currentCardEndsAtZero = false;

    if (battle.charge.stage >= card.charge.stages.length) {
      resolveCharge(run, battle);
      checkVictory(run, battle);
    }
    return;
  }

  addLog(battle, card.name + " 사용 (-" + cost + ")");
  resolveCardEffects(run, battle, card, enemy);
  finishAttackCard(battle, card);
  resolvePostCardMagicBooks(run, battle, card);
  battle.playerStatuses.currentCardEndsAtZero = false;
  checkVictory(run, battle);
}

export function endTurn(run, battle) {
  if (battle.status !== "playing") {
    return;
  }

  if (battle.playerStatuses.contingencyRemaining > 0) {
    addLog(battle, "예비 계획의 버릴 카드 2장을 먼저 선택해야 합니다.");
    return;
  }

  resolveCharge(run, battle);

  if (checkVictory(run, battle)) {
    return;
  }

  if (
    hasMagicBook(run, "catch_breath") &&
    battle.energy >= 2
  ) {
    battle.playerStatuses.nextTurnEnergyBonus = 1;
    addLog(battle, "숨 고르기 — 다음 턴 코스트 +1");
  }

  if (hasMagicBook(run, "endless_nightmare")) {
    battle.playerStatuses.nightmareFreeCard = battle.energy >= 4;
    battle.playerStatuses.nightmareAttackBonus = battle.energy === 0;

    if (battle.energy >= 4) {
      addLog(battle, "끝없는 악몽 — 다음 턴 첫 카드 코스트 0");
    } else if (battle.energy === 0) {
      addLog(battle, "끝없는 악몽 — 다음 턴 첫 공격 피해 +4");
    }
  }

  if (hasMagicBook(run, "mana_echo")) {
    if (battle.playerStatuses.manaEchoTurns > 0) {
      battle.playerStatuses.manaEchoTurns -= 1;

      if (battle.playerStatuses.manaEchoTurns === 0) {
        battle.playerStatuses.manaEchoStreak = 0;
        addLog(battle, "마력 잔향 종료");
      }
    } else if (battle.energy >= 3) {
      battle.playerStatuses.manaEchoStreak += 1;

      if (battle.playerStatuses.manaEchoStreak >= 5) {
        battle.playerStatuses.manaEchoStreak = 0;
        battle.playerStatuses.manaEchoTurns = 3;
        addLog(battle, "마력 잔향 발동 — 다음 3턴 코스트 최저 3");
      }
    } else {
      battle.playerStatuses.manaEchoStreak = 0;
    }
  }

  const handResult = discardHand(run, battle);

  if (handResult.retainedCardId) {
    addLog(
      battle,
      "기억 고정 — " + getCard(handResult.retainedCardId).name +
        " 다음 턴까지 보존"
    );
  }

  if (handResult.recycledCardId) {
    addLog(
      battle,
      "재활용 — " + getCard(handResult.recycledCardId).name +
        " 소멸 대신 버림 더미로 이동"
    );
  }

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

  if (checkVictory(run, battle)) {
    return;
  }

  startPlayerTurn(run, battle);
}
