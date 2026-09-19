import {
  CLASS_REWARD_POOL,
  COMMON_REWARD_POOL,
  STARTING_DECK,
} from "../data/cards.js";
import { shuffle } from "./deck.js";
import { createMap } from "./map.js";

export function createRun() {
  return {
    classId: "warlord",
    maxHp: 70,
    hp: 70,
    deck: [...STARTING_DECK],
    gold: 0,
    potions: [],
    magicBooks: [],
    battleNumber: 1,
    victories: 0,
    map: createMap(),
    lastEncounterKey: null,
  };
}

function randomCard(pool, excluded) {
  const candidates = shuffle(pool).filter(function notExcluded(cardId) {
    return !excluded.includes(cardId);
  });

  return candidates[0] || null;
}

export function createCardRewards() {
  const rewards = [];

  const classCard = randomCard(CLASS_REWARD_POOL, rewards);
  if (classCard) {
    rewards.push(classCard);
  }

  const commonCard = randomCard(COMMON_REWARD_POOL, rewards);
  if (commonCard) {
    rewards.push(commonCard);
  }

  const randomPool = Math.random() < 0.5
    ? CLASS_REWARD_POOL
    : COMMON_REWARD_POOL;

  let randomChoice = randomCard(randomPool, rewards);
  if (!randomChoice) {
    randomChoice = randomCard(
      [...CLASS_REWARD_POOL, ...COMMON_REWARD_POOL],
      rewards
    );
  }

  if (randomChoice) {
    rewards.push(randomChoice);
  }

  return rewards;
}

export function rerollRandomReward(rewards) {
  if (!Array.isArray(rewards) || rewards.length < 3) {
    return rewards;
  }

  const excluded = [...rewards];
  const randomPool = Math.random() < 0.5
    ? CLASS_REWARD_POOL
    : COMMON_REWARD_POOL;

  let randomChoice = randomCard(randomPool, excluded);
  if (!randomChoice) {
    randomChoice = randomCard(
      [...CLASS_REWARD_POOL, ...COMMON_REWARD_POOL],
      excluded
    );
  }

  if (!randomChoice) {
    return rewards;
  }

  const nextRewards = [...rewards];
  nextRewards[2] = randomChoice;
  return nextRewards;
}

export function addCardToDeck(run, cardId) {
  run.deck.push(cardId);
}

export function advanceRun(run) {
  run.battleNumber += 1;
  run.victories += 1;
}
