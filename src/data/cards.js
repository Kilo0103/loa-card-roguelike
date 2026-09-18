export const CARD_LIBRARY = Object.freeze({
  basic_strike: {
    id: "basic_strike",
    name: "기본 공격",
    cost: 1,
    type: "attack",
    rarity: "common",
    faction: "neutral",
    tags: ["starter"],
    description: "피해를 6 줍니다.",
    effects: [{ type: "damage", value: 6 }],
  },
  basic_guard: {
    id: "basic_guard",
    name: "방어 태세",
    cost: 1,
    type: "defense",
    rarity: "common",
    faction: "neutral",
    tags: ["starter"],
    description: "실드를 5 얻습니다.",
    effects: [{ type: "block", value: 5 }],
  },
  stagger_blow: {
    id: "stagger_blow",
    name: "충격 타격",
    cost: 1,
    type: "attack",
    rarity: "common",
    faction: "neutral",
    tags: ["starter", "stagger"],
    description: "피해를 4 주고 무력화를 3 감소시킵니다.",
    effects: [
      { type: "damage", value: 4 },
      { type: "stagger", value: 3 },
    ],
  },
  heavy_swing: {
    id: "heavy_swing",
    name: "강력한 일격",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    faction: "neutral",
    tags: ["reward"],
    description: "피해를 13 줍니다.",
    effects: [{ type: "damage", value: 13 }],
  },
  crushing_wave: {
    id: "crushing_wave",
    name: "압도",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    faction: "neutral",
    tags: ["reward", "stagger"],
    description: "피해를 7 주고 무력화를 5 감소시킵니다.",
    effects: [
      { type: "damage", value: 7 },
      { type: "stagger", value: 5 },
    ],
  },
  iron_wall: {
    id: "iron_wall",
    name: "철벽",
    cost: 2,
    type: "defense",
    rarity: "uncommon",
    faction: "neutral",
    tags: ["reward"],
    description: "실드를 12 얻습니다.",
    effects: [{ type: "block", value: 12 }],
  },
  quick_step: {
    id: "quick_step",
    name: "빠른 전개",
    cost: 0,
    type: "skill",
    rarity: "common",
    faction: "neutral",
    tags: ["reward", "draw"],
    description: "카드를 1장 뽑습니다.",
    effects: [{ type: "draw", value: 1 }],
  },
  battle_focus: {
    id: "battle_focus",
    name: "전투 집중",
    cost: 1,
    type: "skill",
    rarity: "rare",
    faction: "neutral",
    tags: ["reward", "energy"],
    description: "행동력을 1 얻고 카드를 1장 뽑습니다.",
    effects: [
      { type: "energy", value: 1 },
      { type: "draw", value: 1 },
    ],
  },
  guarded_strike: {
    id: "guarded_strike",
    name: "견제",
    cost: 1,
    type: "attack",
    rarity: "common",
    faction: "neutral",
    tags: ["reward"],
    description: "피해를 5 주고 실드를 3 얻습니다.",
    effects: [
      { type: "damage", value: 5 },
      { type: "block", value: 3 },
    ],
  },
});

export const STARTING_DECK = Object.freeze([
  "basic_strike",
  "basic_strike",
  "basic_strike",
  "basic_strike",
  "basic_strike",
  "basic_guard",
  "basic_guard",
  "basic_guard",
  "basic_guard",
  "stagger_blow",
]);

export const REWARD_POOL = Object.freeze([
  "heavy_swing",
  "crushing_wave",
  "iron_wall",
  "quick_step",
  "battle_focus",
  "guarded_strike",
]);

export function getCard(cardId) {
  const card = CARD_LIBRARY[cardId];
  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }

  return card;
}
