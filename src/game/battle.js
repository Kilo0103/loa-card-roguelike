import { createEnemy } from "../data/enemies.js";
import { getCard } from "../data/cards.js";
import { discardHand, drawCards, shuffle } from "./deck.js";
import { resolveCardEffects } from "./effects.js";

const STARTING_ENERGY = 3;
const HAND_SIZE = 5;

function addLog(battle, message) {
  battle.log.unshift(message);
  battle.log = battle.log.slice(0, 12);
}

function getIntent(enemy) {
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}

function advanceIntent(enemy) {
  enemy.intentIndex = (enemy.intentIndex + 1) % enemy.intents.length;
}

function damagePlayer(run, battle, amount) {
  const absorbed = Math.min(battle.playerBlock, amount);
  const hpDamage = amount - absorbed;

  battle.playerBlock -= absorbed;
  run.hp = Math.max(0, run.hp - hpDamage);
  addLog(battle, `적의 공격: ${amount} 피해 (HP 피해 ${hpDamage})`);
}

function startPlayerTurn(battle) {
  battle.turn += 1;
  battle.energy = STARTING_ENERGY;
  battle.playerBlock = 0;
  drawCards(battle, HAND_SIZE);
  addLog(battle, `${battle.turn}턴 시작`);
}

export function createBattle(run, enemyId = "training_golem") {
  const battle = {
    enemy: createEnemy(enemyId, run.battleNumber),
    turn: 0,
    energy: STARTING_ENERGY,
    playerBlock: 0,
    drawPile: shuffle(run.deck),
    discardPile: [],
    hand: [],
    status: "playing",
    log: [],
  };

  startPlayerTurn(battle);
  return battle;
}

export function getEnemyIntent(battle) {
  if (battle.enemy.skipNextAction) {
    return { type: "stunned", value: 0, label: "무력화됨 — 행동 취소" };
  }

  return getIntent(battle.enemy);
}

export function playCard(run, battle, handIndex) {
  if (battle.status !== "playing") {
    return;
  }

  const cardId = battle.hand[handIndex];
  const card = getCard(cardId);

  if (card.cost > battle.energy) {
    addLog(battle, "행동력이 부족합니다.");
    return;
  }

  battle.energy -= card.cost;
  battle.hand.splice(handIndex, 1);
  addLog(battle, `${card.name} 사용 (-${card.cost})`);

  resolveCardEffects(battle, card);
  battle.discardPile.push(cardId);

  if (battle.enemy.hp <= 0) {
    battle.status = "victory";
    addLog(battle, "전투 승리!");
  }

  if (run.hp <= 0) {
    battle.status = "defeat";
  }
}

export function endTurn(run, battle) {
  if (battle.status !== "playing") {
    return;
  }

  discardHand(battle);

  if (battle.enemy.skipNextAction) {
    addLog(battle, "무력화로 적의 행동이 취소되었습니다.");
    battle.enemy.skipNextAction = false;
    battle.enemy.stagger = battle.enemy.maxStagger;
    advanceIntent(battle.enemy);
  } else {
    const intent = getIntent(battle.enemy);

    if (intent.type === "attack") {
      damagePlayer(run, battle, intent.value);
    } else if (intent.type === "guard") {
      battle.enemy.block += intent.value;
      addLog(battle, `적이 실드 ${intent.value} 획득`);
    }

    advanceIntent(battle.enemy);
  }

  if (run.hp <= 0) {
    battle.status = "defeat";
    addLog(battle, "플레이어가 쓰러졌습니다.");
    return;
  }

  startPlayerTurn(battle);
}
