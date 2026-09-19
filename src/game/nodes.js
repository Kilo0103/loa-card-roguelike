import {
  CLASS_REWARD_POOL,
  COMMON_REWARD_POOL,
  getCard,
} from "../data/cards.js";
import {
  acquireMagicBook,
  getAvailableImplementedMagicBookIds,
  getMagicBook,
  hasMagicBook,
} from "../data/magicBooks.js";
import { shuffle } from "./deck.js";
import {
  BOND_MATERIAL_LABELS,
  BOND_MATERIAL_SHOP_OFFERS,
  grantBondMaterial,
} from "./bond.js";
import {
  addPotion,
  getPotion,
  MAX_POTIONS,
  POTION_IDS,
} from "./potions.js";

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

const MAGIC_BOOK_PRICE = 100;
const POTION_PRICE = 45;
const CARD_REMOVE_PRICE = 75;

const EVENT_LIBRARY = Object.freeze([
  "abandoned_supplies",
  "beast_altar",
  "wandering_mercenary",
  "sealed_magic_book",
]);

function randomClassCard() {
  return shuffle(CLASS_REWARD_POOL)[0];
}

function cardPrice(cardId) {
  const card = getCard(cardId);
  return CARD_PRICES[card.rarity] || 40;
}

export function awardBattleGold(run, nodeType) {
  const baseAmount = GOLD_REWARDS[nodeType] || 20;
  let amount = baseAmount;

  if (hasMagicBook(run, "tooki_tooki")) {
    const bonusPercent = 25 + Math.floor(Math.random() * 31);
    amount += Math.floor(baseAmount * bonusPercent / 100);
  }

  run.gold += amount;
  return amount;
}

export function restAtNode(run) {
  const healAmount = Math.ceil(run.maxHp * 0.2);
  const previousHp = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + healAmount);

  return run.hp - previousHp;
}

export function createShop(run) {
  const classCards = shuffle(CLASS_REWARD_POOL).slice(0, 3);
  const commonCards = shuffle(COMMON_REWARD_POOL).slice(0, 1);
  const cardIds = [...classCards, ...commonCards];

  const availableBooks = getAvailableImplementedMagicBookIds(run);
  const availablePotions = shuffle(
    POTION_IDS.filter(function potionNotOwned(potionId) {
      return !run.potions.includes(potionId);
    })
  ).slice(0, 2);

  return {
    items: cardIds.map(function shopItem(cardId) {
      return {
        cardId,
        price: cardPrice(cardId),
        sold: false,
      };
    }),
    magicBookItem: {
      bookId: availableBooks[Math.floor(Math.random() * availableBooks.length)] || null,
      price: MAGIC_BOOK_PRICE,
      sold: false,
    },
    potionItems: availablePotions.map(function potionItem(potionId) {
      return {
        potionId,
        price: POTION_PRICE,
        sold: false,
      };
    }),
    cardRemoval: {
      price: CARD_REMOVE_PRICE,
      used: false,
    },
    bondMaterialItems: BOND_MATERIAL_SHOP_OFFERS.map(function materialItem(offer) {
      return {
        material: offer.material,
        amount: offer.amount,
        price: offer.price,
        sold: false,
      };
    }),
  };
}

export function buyShopMagicBook(run, shop) {
  const item = shop.magicBookItem;

  if (!item || !item.bookId || item.sold) {
    return {
      success: false,
      message: "이미 판매된 마법서입니다.",
    };
  }

  if (run.gold < item.price) {
    return {
      success: false,
      message: "골드가 부족합니다.",
    };
  }

  if (!acquireMagicBook(run, item.bookId)) {
    return {
      success: false,
      message: "현재 획득할 수 없는 마법서입니다.",
    };
  }

  run.gold -= item.price;
  item.sold = true;

  return {
    success: true,
    message: getMagicBook(item.bookId).name + " 구매 완료",
  };
}

export function buyShopPotion(run, shop, itemIndex) {
  const item = shop.potionItems[itemIndex];

  if (!item || item.sold) {
    return {
      success: false,
      message: "이미 판매된 물약입니다.",
    };
  }

  if (run.potions.includes(item.potionId)) {
    return {
      success: false,
      message: "동일한 물약은 중복 소지할 수 없습니다.",
    };
  }

  if (run.potions.length >= MAX_POTIONS) {
    return {
      success: false,
      message: "물약 슬롯이 가득 찼습니다.",
    };
  }

  if (run.gold < item.price) {
    return {
      success: false,
      message: "골드가 부족합니다.",
    };
  }

  if (!addPotion(run, item.potionId)) {
    return {
      success: false,
      message: "물약을 구매할 수 없습니다.",
    };
  }

  run.gold -= item.price;
  item.sold = true;

  return {
    success: true,
    message: getPotion(item.potionId).name + " 구매 완료",
  };
}

export function removeShopDeckCard(run, shop, deckIndex) {
  const service = shop.cardRemoval;

  if (!service || service.used) {
    return {
      success: false,
      message: "이 상점의 카드 제거 서비스는 이미 사용했습니다.",
    };
  }

  if (run.deck.length <= 1) {
    return {
      success: false,
      message: "덱에는 최소 1장의 카드가 남아야 합니다.",
    };
  }

  if (deckIndex < 0 || deckIndex >= run.deck.length) {
    return {
      success: false,
      message: "제거할 카드를 찾을 수 없습니다.",
    };
  }

  if (run.gold < service.price) {
    return {
      success: false,
      message: "골드가 부족합니다.",
    };
  }

  const cardId = run.deck[deckIndex];
  run.gold -= service.price;
  run.deck.splice(deckIndex, 1);
  service.used = true;

  return {
    success: true,
    message: getCard(cardId).name + " 제거 완료",
  };
}

export function buyShopBondMaterial(run, shop, itemIndex) {
  const item = shop.bondMaterialItems[itemIndex];

  if (!item || item.sold) {
    return {
      success: false,
      message: "이미 판매된 결속 재료입니다.",
    };
  }

  if (run.gold < item.price) {
    return {
      success: false,
      message: "골드가 부족합니다.",
    };
  }

  if (!grantBondMaterial(run, item.material, item.amount)) {
    return {
      success: false,
      message: "결속 재료를 구매할 수 없습니다.",
    };
  }

  run.gold -= item.price;
  item.sold = true;

  return {
    success: true,
    message:
      BOND_MATERIAL_LABELS[item.material] + " +" + item.amount +
      " 구매 완료",
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

function createSealedMagicBookEvent(run) {
  const availableBooks = getAvailableImplementedMagicBookIds(run);

  if (availableBooks.length === 0) {
    return createAbandonedSuppliesEvent();
  }

  const bookId = availableBooks[
    Math.floor(Math.random() * availableBooks.length)
  ];
  const book = getMagicBook(bookId);

  return {
    id: "sealed_magic_book",
    title: "봉인된 마법서",
    description: "마수의 흔적 사이에서 강한 마력이 새어 나오는 봉인된 책을 발견했습니다.",
    rewardBookId: bookId,
    choices: [
      {
        id: "read_book",
        label: "봉인을 풀고 읽는다",
        detail: "HP 10 소모 · " + book.name + " 획득",
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

export function createEvent(run) {
  const eventId = shuffle(EVENT_LIBRARY)[0];

  if (eventId === "beast_altar") {
    return createBeastAltarEvent();
  }

  if (eventId === "wandering_mercenary") {
    return createWanderingMercenaryEvent();
  }

  if (eventId === "sealed_magic_book") {
    return createSealedMagicBookEvent(run);
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

  if (event.id === "sealed_magic_book" && choiceId === "read_book") {
    return run.hp > 10 &&
      Boolean(event.rewardBookId) &&
      getAvailableImplementedMagicBookIds(run).includes(event.rewardBookId);
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

  if (event.id === "sealed_magic_book" && choiceId === "read_book") {
    if (!acquireMagicBook(run, event.rewardBookId)) {
      return {
        success: false,
        message: "현재 획득할 수 없는 마법서입니다.",
      };
    }

    run.hp -= 10;
    return {
      success: true,
      message: getMagicBook(event.rewardBookId).name + " 획득 · HP 10 소모",
    };
  }

  return {
    success: true,
    message: "아무 일도 일어나지 않았습니다.",
  };
}
