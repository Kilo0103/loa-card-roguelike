import { hasMagicBook } from "../data/magicBooks.js";

export const BASE_MAX_ENERGY = 5;

export function getMaxEnergy(run) {
  return BASE_MAX_ENERGY + (hasMagicBook(run, "max_mana_increase") ? 3 : 0);
}

export function getCardCostAdjustment(run, battle, card) {
  let adjustment = 0;

  if (hasMagicBook(run, "mass_increase") && card.type === "attack") {
    adjustment += 1;
  }

  if (
    hasMagicBook(run, "quick_counter") &&
    card.tags.includes("counter")
  ) {
    adjustment -= 1;
  }

  if (
    hasMagicBook(run, "guardian_instinct") &&
    card.type === "defense" &&
    battle.playerBlock >= 20 &&
    !battle.playerStatuses.guardianInstinctUsed
  ) {
    adjustment -= 1;
  }

  if (
    hasMagicBook(run, "combat_breathing") &&
    battle.playerStatuses.combatBreathingReady
  ) {
    adjustment -= 1;
  }

  return adjustment;
}

export function getFlatAttackBonus(run, battle, card, enemy, options = {}) {
  let bonus = 0;

  if (hasMagicBook(run, "mass_increase")) {
    bonus += 2;
  }

  if (hasMagicBook(run, "master_of_ambush") && card.tags.includes("back_attack")) {
    bonus += 4;
  }

  if (hasMagicBook(run, "master_brawler") && card.tags.includes("head_attack")) {
    bonus += 4;
  }

  if (
    hasMagicBook(run, "hit_master") &&
    !card.tags.includes("back_attack") &&
    !card.tags.includes("head_attack")
  ) {
    bonus += 3;
  }

  if (
    hasMagicBook(run, "broken_bone") &&
    enemy &&
    enemy.staggeredTurns > 0
  ) {
    bonus += 5;
  }

  if (
    hasMagicBook(run, "weakness_capture") &&
    enemy &&
    Object.keys(enemy.statuses).length > 0
  ) {
    bonus += 2;
  }

  if (
    hasMagicBook(run, "first_strike") &&
    !battle.playerStatuses.firstAttackUsed
  ) {
    bonus += 6;
  }

  if (
    hasMagicBook(run, "heavy_weapon") &&
    card.cost >= 3
  ) {
    bonus += 3;
  }

  if (
    hasMagicBook(run, "full_charge") &&
    options.maxCharge
  ) {
    bonus += 4;
  }

  if (
    hasMagicBook(run, "counter_stance") &&
    battle.playerStatuses.counterStanceReady
  ) {
    bonus += 3;
  }

  if (
    hasMagicBook(run, "blood_contract") &&
    battle.playerStatuses.bloodContractActive
  ) {
    bonus += 2;
  }

  if (
    hasMagicBook(run, "desperate_fight") &&
    run.hp <= run.maxHp * 0.5
  ) {
    bonus += 2;
  }

  if (
    hasMagicBook(run, "all_in") &&
    options.allIn
  ) {
    bonus += 4;
  }

  if (
    hasMagicBook(run, "strong_hunter") &&
    enemy &&
    (enemy.tier === "elite" || enemy.tier === "boss")
  ) {
    bonus += 2;
  }

  if (
    hasMagicBook(run, "counterattack") &&
    battle.playerStatuses.counterattackReady
  ) {
    bonus += 5;
  }

  return bonus;
}

export function getAttackMultiplier(run, enemy) {
  let bonusRatio = 0;

  if (hasMagicBook(run, "masters_tenacity")) {
    bonusRatio += Math.max(0, (run.maxHp - run.hp) / run.maxHp);
  }

  if (
    hasMagicBook(run, "grudge") &&
    enemy &&
    (enemy.tier === "midboss" || enemy.tier === "boss")
  ) {
    bonusRatio += 0.20;
  }

  return 1 + bonusRatio;
}

export function getIncomingDamageMultiplier(run) {
  return hasMagicBook(run, "grudge") ? 1.20 : 1;
}

export function ignoresEnemyShield(run) {
  return hasMagicBook(run, "shield_piercing");
}

export function getBlockGain(run, baseAmount, battle = null, card = null) {
  let gain = baseAmount + (hasMagicBook(run, "shield_mastery") ? 1 : 0);

  if (
    battle &&
    card &&
    card.type === "defense" &&
    hasMagicBook(run, "all_in") &&
    battle.playerStatuses.currentCardEndsAtZero
  ) {
    gain += 4;
  }

  return gain;
}

export function getStaggerGain(run, card, baseAmount) {
  if (
    hasMagicBook(run, "overwhelm") &&
    card.tags.includes("stagger") &&
    baseAmount > 0
  ) {
    return baseAmount + 1;
  }

  return baseAmount;
}

export function getDestructionDuration(run, baseDuration) {
  return baseDuration + (hasMagicBook(run, "demolition_expert") ? 1 : 0);
}

export function getStartingChargeStage(run, card) {
  if (!card.charge) {
    return 0;
  }

  return hasMagicBook(run, "charge_assist")
    ? Math.min(2, card.charge.stages.length)
    : 1;
}
