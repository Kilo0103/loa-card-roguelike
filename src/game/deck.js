import { getCard } from "../data/cards.js";
import { hasMagicBook } from "../data/magicBooks.js";

export function shuffle(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function drawCards(battle, amount) {
  for (let count = 0; count < amount; count += 1) {
    if (battle.drawPile.length === 0) {
      if (battle.discardPile.length === 0) {
        return;
      }

      battle.drawPile = shuffle(battle.discardPile);
      battle.discardPile = [];
    }

    const cardId = battle.drawPile.pop();
    battle.hand.push(cardId);
  }
}

function recycleOrExhaust(run, battle, cardId) {
  if (
    hasMagicBook(run, "recycling") &&
    !battle.playerStatuses.recyclingUsed
  ) {
    battle.playerStatuses.recyclingUsed = true;
    battle.discardPile.push(cardId);
    return "recycled";
  }

  battle.exhaustPile.push(cardId);
  return "exhausted";
}

export function movePlayedCard(run, battle, cardId, card) {
  if (card.exhaustOnPlay) {
    return recycleOrExhaust(run, battle, cardId);
  }

  battle.discardPile.push(cardId);
  return "discarded";
}

export function discardHand(run, battle) {
  const retained = [];
  let recycledCardId = null;
  let exhaustedCount = 0;

  for (let index = 0; index < battle.hand.length; index += 1) {
    const cardId = battle.hand[index];
    const card = getCard(cardId);

    if (
      hasMagicBook(run, "fixed_memory") &&
      battle.playerStatuses.retainedHandIndex === index &&
      retained.length === 0
    ) {
      retained.push(cardId);
      continue;
    }

    if (card.exhaustOnTurnEnd) {
      const result = recycleOrExhaust(run, battle, cardId);
      if (result === "recycled") {
        recycledCardId = cardId;
      } else {
        exhaustedCount += 1;
      }
      continue;
    }

    battle.discardPile.push(cardId);
  }

  battle.hand = retained;
  battle.playerStatuses.retainedHandIndex = null;
  battle.playerStatuses.retainSelectionMode = false;

  return {
    retainedCardId: retained[0] || null,
    recycledCardId,
    exhaustedCount,
  };
}
