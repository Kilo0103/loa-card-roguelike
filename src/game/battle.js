import { createEnemy, getEncounterForBattle } from "../data/enemies.js";
import { getCard } from "../data/cards.js";
import { discardHand, drawCards, shuffle } from "./deck.js";
import {
  applyEnemyStatus,
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

function getIntent(enemy) {
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}

function advanceIntent(enemy) {
  enemy.intentIndex = (enemy.intentIndex + 1) % enemy.intents.length;
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
    enemy.name + " 공격 " + reducedAmount + piercingText + " (HP 피해 " + hpDamage + ")"
  );

  if (battle.playerStatuses.counterSpear) {
    battle.playerStatuses.counterSpear = false;
    if (absorbed > 0 && enemy.hp > 0) {
      dealDamageToEnemy(battle, enemy, absorbed);
      addLog(battle, "카운터 스피어 — 소모된 보호막 " + absorbed + " 반격");
    }
  }
}

function resolveEnemyIntent(run, battle, enemy) {
  if (enemy.hp <= 0) {
    return;
  }

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
  } else if (intent.type === "packAttack") {
    const livingAllies = battle.enemies.filter(function aliveAlly(other) {
      return other !== enemy && other.hp > 0;
    }).length;
    const bonus = Math.min(intent.maxBonus, livingAllies * intent.bonusPerAlly);
    damagePlayer(run, battle, enemy, intent.value + bonus + enemy.attackBonus, false);
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
  }

  advanceIntent(enemy);
  tickStatuses(enemy.statuses);
}

function resolvePlayerEndStatuses(run, battle) {
  const bleed = battle.playerDebuffs.bleed;
  if (bleed) {
    run.hp = Math.max(0, run.hp - bleed.value);
    addLog(battle, "출혈로 HP " + bleed.value + " 피해");
  }

  tickStatuses(battle.playerDebuffs);
}

function startPlayerTurn(battle) {
  battle.turn += 1;
  battle.energy = MAX_ENERGY;
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
    enemies: encounter.map(function makeEnemy(enemyId) {
      return createEnemy(enemyId);
    }),
    selectedEnemyIndex: 0,
    turn: 0,
    energy: MAX_ENERGY,
    playerBlock: 0,
    playerStatuses: {
      counterSpear: false,
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

  if ((intent.type === "attack" || intent.type === "attackStatus") && enemy.attackBonus > 0) {
    return {
      ...intent,
      label: intent.label + " (강화 +" + enemy.attackBonus + ")",
    };
  }

  return intent;
}

export function getEffectiveCardCost(battle, card) {
  if (card.charge && battle.charge && battle.charge.card.id === card.id) {
    return 0;
  }

  return card.cost;
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

  let enemy = selectedEnemy(battle);
  if (card.target === "enemy" && !enemy) {
    addLog(battle, "대상이 없습니다.");
    return;
  }

  battle.energy -= cost;
  battle.hand.splice(handIndex, 1);
  battle.discardPile.push(cardId);

  if (card.charge) {
    if (battle.charge && battle.charge.card.id === card.id) {
      battle.charge.stage += 1;
      addLog(battle, card.name + " 차징 " + battle.charge.stage + "단계 (추가 코스트 0)");
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
  resolvePlayerEndStatuses(run, battle);

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
