import {
  CLASS_REWARD_POOL,
  COMMON_REWARD_POOL,
  getCard,
} from "../data/cards.js";
import { shuffle } from "./deck.js";

const GOLD_REWARDS = Object.freeze({
  normal: 20,
  elite: 35,
  midboss: 45,
  boss: 60,
});

const CARD_PRICES = Object.freeze({
  common: 35,
  uncommon: 50,
  rare: 70,
});

const EVENT_LIBRARY = Object.freeze([
  "abandoned_supplies",
  "beast_altar",
  "wandering_mercenary",
]);

function randomClassCard() {
  return shuffle(CLASS_REWARD_POOL)[0];
}

function cardPrice(cardId) {
  const card = getCard(cardId);
  return CARD_PRICES[card.rarity] || 40;
}

export function awardBattleGold(run, nodeType) {
  const amount = GOLD_REWARDS[nodeType] || 20;
  run.gold += amount;
  return amount;
}

export function restAtNode(run) {
  const healAmount = Math.ceil(run.maxHp * 0.2);
  const previousHp = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + healAmount);

  return run.hp - previousHp;
}

export function createShop() {
  const classCards = shuffle(CLASS_REWARD_POOL).slice(0, 3);
  const commonCards = shuffle(COMMON_REWARD_POOL).slice(0, 1);
  const cardIds = [...classCards, ...commonCards];

  return {
    items: cardIds.map(function shopItem(cardId) {
      return {
        cardId,
        price: cardPrice(cardId),
        sold: false,
      };
    }),
  };
}

export function buyShopCard(run, shop, itemIndex) {
  const item = shop.items[itemIndex];

  if (!item || item.sold) {
    return {
      success: false,
      message: "이미 판매된 카드입니다.",
    };
  }

  if (run.gold < item.price) {
    return {
      success: false,
      message: "골드가 부족합니다.",
    };
  }

  run.gold -= item.price;
  run.deck.push(item.cardId);
  item.sold = true;

  return {
    success: true,
    message: getCard(item.cardId).name + " 구매 완료",
  };
}

function createAbandonedSuppliesEvent() {
  return {
    id: "abandoned_supplies",
    title: "버려진 보급품",
    description: "마수들이 지나간 자리에서 아직 쓸 만한 보급품을 발견했습니다.",
    choices: [
      {
        id: "take_gold",
        label: "골드 주머니를 챙긴다",
        detail: "+30G",
      },
      {
        id: "use_supplies",
        label: "남은 물자를 사용한다",
        detail: "HP 10 회복",
      },
    ],
  };
}

function createBeastAltarEvent() {
  const cardId = randomClassCard();

  return {
    id: "beast_altar",
    title: "피 묻은 제단",
    description: "불길한 힘이 깃든 제단입니다. 대가를 치르면 전투 기술을 얻을 수 있을 것 같습니다.",
    rewardCardId: cardId,
    choices: [
      {
        id: "offer_blood",
        label: "피를 바친다",
        detail: "HP 7 소모 · " + getCard(cardId).name + " 획득",
      },
      {
        id: "leave",
        label: "건드리지 않는다",
        detail: "아무 일도 일어나지 않음",
      },
    ],
  };
}

function createWanderingMercenaryEvent() {
  const cardId = randomClassCard();

  return {
    id: "wandering_mercenary",
    title: "떠돌이 용병",
    description: "전장을 떠도는 용병이 자신의 전투 비법을 팔겠다고 합니다.",
    rewardCardId: cardId,
    choices: [
      {
        id: "buy_training",
        label: "비법을 배운다",
        detail: "25G · " + getCard(cardId).name + " 획득",
      },
      {
        id: "leave",
        label: "지나간다",
        detail: "아무 일도 일어나지 않음",
      },
    ],
  };
}

export function createEvent() {
  const eventId = shuffle(EVENT_LIBRARY)[0];

  if (eventId === "beast_altar") {
    return createBeastAltarEvent();
  }

  if (eventId === "wandering_mercenary") {
    return createWanderingMercenaryEvent();
  }

  return createAbandonedSuppliesEvent();
}

export function canChooseEventOption(run, event, choiceId) {
  if (event.id === "beast_altar" && choiceId === "offer_blood") {
    return run.hp > 7;
  }

  if (event.id === "wandering_mercenary" && choiceId === "buy_training") {
    return run.gold >= 25;
  }

  return true;
}

export function resolveEventChoice(run, event, choiceId) {
  if (!canChooseEventOption(run, event, choiceId)) {
    return {
      success: false,
      message: "현재 상태에서는 선택할 수 없습니다.",
    };
  }

  if (event.id === "abandoned_supplies") {
    if (choiceId === "take_gold") {
      run.gold += 30;
      return { success: true, message: "30G를 획득했습니다." };
    }

    if (choiceId === "use_supplies") {
      const previousHp = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + 10);
      return {
        success: true,
        message: "HP를 " + (run.hp - previousHp) + " 회복했습니다.",
      };
    }
  }

  if (event.id === "beast_altar" && choiceId === "offer_blood") {
    run.hp -= 7;
    run.deck.push(event.rewardCardId);
    return {
      success: true,
      message: getCard(event.rewardCardId).name + " 획득 · HP 7 소모",
    };
  }

  if (event.id === "wandering_mercenary" && choiceId === "buy_training") {
    run.gold -= 25;
    run.deck.push(event.rewardCardId);
    return {
      success: true,
      message: getCard(event.rewardCardId).name + " 획득 · 25G 지불",
    };
  }

  return {
    success: true,
    message: "아무 일도 일어나지 않았습니다.",
  };
}
