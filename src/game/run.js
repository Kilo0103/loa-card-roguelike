import { REWARD_POOL, STARTING_DECK } from "../data/cards.js";
import { shuffle } from "./deck.js";

export function createRun() {
  return {
    maxHp: 70,
    hp: 70,
    deck: [...STARTING_DECK],
    gold: 0,
    battleNumber: 1,
    victories: 0,
  };
}

export function createCardRewards() {
  return shuffle(REWARD_POOL).slice(0, 3);
}

export function addCardToDeck(run, cardId) {
  run.deck.push(cardId);
}

export function advanceRun(run) {
  run.battleNumber += 1;
  run.victories += 1;
}
