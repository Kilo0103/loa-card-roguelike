import { hasMagicBook } from "../data/magicBooks.js";
import { drawCards } from "./deck.js";
import { getBlockGain } from "./magicBookEffects.js";

export const MAX_POTIONS = 3;

export const POTION_LIBRARY = Object.freeze({
  healing_potion: {
    id: "healing_potion",
    name: "회복 물약",
    shortName: "회복",
    description: "HP를 15 회복합니다.",
    effect: "heal",
    value: 15,
  },
  shield_potion: {
    id: "shield_potion",
    name: "수호 물약",
    shortName: "수호",
    description: "보호막을 12 얻습니다.",
    effect: "block",
    value: 12,
  },
  energy_potion: {
    id: "energy_potion",
    name: "마력 물약",
    shortName: "마력",
    description: "현재 코스트를 2 회복합니다.",
    effect: "energy",
    value: 2,
  },
  cleanse_potion: {
    id: "cleanse_potion",
    name: "정화 물약",
    shortName: "정화",
    description: "무작위 디버프 1개를 제거합니다.",
    effect: "cleanse",
    value: 1,
  },
  draw_potion: {
    id: "draw_potion",
    name: "집중 물약",
    shortName: "집중",
    description: "카드를 2장 드로우합니다.",
    effect: "draw",
    value: 2,
  },
});

export const POTION_IDS = Object.freeze(Object.keys(POTION_LIBRARY));

const DROP_CHANCES = Object.freeze({
  normal: 0.30,
  elite: 0.45,
  midboss: 0.60,
  boss: 0,
});

export function getPotion(potionId) {
  const potion = POTION_LIBRARY[potionId];
  if (!potion) {
    throw new Error("Unknown potion: " + potionId);
  }
  return potion;
}

export function rollPotionDrop(run, nodeType, guaranteed = false) {
  const forced = guaranteed || hasMagicBook(run, "potion_addiction");
  const chance = forced ? 1 : (DROP_CHANCES[nodeType] || 0);
  if (Math.random() >= chance) {
    return null;
  }

  const available = POTION_IDS.filter(function notOwned(potionId) {
    return !run.potions.includes(potionId);
  });

  if (available.length === 0) {
    return null;
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function addPotion(run, potionId) {
  if (run.potions.includes(potionId)) {
    return false;
  }

  if (run.potions.length >= MAX_POTIONS) {
    return false;
  }

  run.potions.push(potionId);
  return true;
}

export function replacePotion(run, inventoryIndex, potionId) {
  if (
    inventoryIndex < 0 ||
    inventoryIndex >= run.potions.length ||
    run.potions.includes(potionId)
  ) {
    return false;
  }

  run.potions[inventoryIndex] = potionId;
  return true;
}

function cleanseRandomDebuff(battle) {
  const keys = Object.keys(battle.playerDebuffs);
  if (keys.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * keys.length);
  const removed = keys[index];
  delete battle.playerDebuffs[removed];
  return removed;
}

export function canUsePotion(run, battle, potionId) {
  if (!battle || battle.status !== "playing") {
    return false;
  }

  const potion = getPotion(potionId);

  if (potion.effect === "heal") {
    return run.hp < run.maxHp;
  }

  if (potion.effect === "cleanse") {
    return Object.keys(battle.playerDebuffs).length > 0;
  }

  return true;
}

export function usePotion(run, battle, inventoryIndex) {
  const potionId = run.potions[inventoryIndex];
  if (!potionId || !canUsePotion(run, battle, potionId)) {
    return {
      success: false,
      message: "지금은 이 물약을 사용할 수 없습니다.",
    };
  }

  const potion = getPotion(potionId);
  let message = potion.name + " 사용";

  if (potion.effect === "heal") {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + potion.value);
    message += " · HP " + (run.hp - before) + " 회복";
  } else if (potion.effect === "block") {
    const gained = getBlockGain(run, potion.value);
    battle.playerBlock += gained;
    message += " · 보호막 +" + gained;
  } else if (potion.effect === "energy") {
    battle.energy += potion.value;
    message += " · 코스트 +" + potion.value;
  } else if (potion.effect === "cleanse") {
    const removed = cleanseRandomDebuff(battle);
    message += removed ? " · " + removed + " 제거" : "";
  } else if (potion.effect === "draw") {
    drawCards(battle, potion.value);
    message += " · " + potion.value + "장 드로우";
  }

  run.potions.splice(inventoryIndex, 1);

  return {
    success: true,
    message,
  };
}
