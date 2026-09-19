import { getCard } from "../data/cards.js";

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

export function discardHand(battle) {
  for (const cardId of battle.hand) {
    const card = getCard(cardId);
    if (!card.exhaustOnTurnEnd) {
      battle.discardPile.push(cardId);
    }
  }

  battle.hand = [];
}
