export const ENEMY_LIBRARY = Object.freeze({
  hungry_beast: {
    id: "hungry_beast",
    name: "굶주린 마수",
    tier: "normal",
    maxHp: 15,
    intents: [
      { type: "attack", value: 5, label: "할퀴기 5" },
    ],
  },
  blood_beast: {
    id: "blood_beast",
    name: "피에 취한 마수",
    tier: "normal",
    maxHp: 13,
    intents: [
      { type: "attackStatus", value: 3, status: "bleed", duration: 2, statusValue: 2, label: "피 묻은 발톱 3 + 출혈" },
      { type: "attack", value: 4, label: "물어뜯기 4" },
    ],
  },
  armored_beast: {
    id: "armored_beast",
    name: "철갑 마수",
    tier: "normal",
    maxHp: 20,
    intents: [
      { type: "guard", value: 6, label: "철갑 방어 6" },
      { type: "attack", value: 3, label: "들이받기 3" },
    ],
  },
  beast_shaman: {
    id: "beast_shaman",
    name: "마수 주술사",
    tier: "normal",
    maxHp: 12,
    intents: [
      { type: "buffAllAttack", value: 2, label: "사기 고양: 아군 다음 공격 +2" },
      { type: "attack", value: 3, label: "주술탄 3" },
    ],
  },
  horned_charger: {
    id: "horned_charger",
    name: "뿔 달린 돌격수",
    tier: "normal",
    maxHp: 17,
    intents: [
      { type: "attack", value: 4, label: "견제 4" },
      { type: "attack", value: 9, label: "돌진 9" },
    ],
  },
  pack_hunter: {
    id: "pack_hunter",
    name: "무리 사냥꾼",
    tier: "normal",
    maxHp: 14,
    intents: [
      { type: "packAttack", value: 4, bonusPerAlly: 1, maxBonus: 3, label: "무리 본능" },
    ],
  },
  blood_tracker: {
    id: "blood_tracker",
    name: "핏빛 추적자",
    tier: "elite",
    maxHp: 34,
    maxStagger: 8,
    intents: [
      { type: "attack", value: 5, label: "추적 5" },
      { type: "attackStatus", value: 4, status: "bleed", duration: 2, statusValue: 2, label: "찢어발기기 4 + 출혈" },
      { type: "attack", value: 10, label: "포식 돌진 10", counterable: true },
    ],
  },
  iron_destroyer: {
    id: "iron_destroyer",
    name: "철갑 파괴자",
    tier: "elite",
    maxHp: 42,
    maxStagger: 12,
    initialBlock: 8,
    intents: [
      { type: "attack", value: 7, label: "중갑 강타 7" },
      { type: "guard", value: 8, label: "철갑 강화 8" },
      { type: "attack", value: 9, label: "분쇄 9" },
    ],
  },
  shaman_captain: {
    id: "shaman_captain",
    name: "마수군단 주술대장",
    tier: "elite",
    maxHp: 30,
    maxStagger: 8,
    intents: [
      { type: "buffAllAttack", value: 2, label: "사기 고양: 아군 다음 공격 +2" },
      { type: "attack", value: 4, label: "저주의 탄환 4" },
      { type: "summon", enemyId: "hungry_beast", label: "굶주린 마수 소환" },
    ],
  },
});

export const ENCOUNTER_POOL = Object.freeze({
  early: [
    ["hungry_beast", "hungry_beast"],
    ["hungry_beast", "blood_beast"],
    ["hungry_beast", "armored_beast"],
    ["hungry_beast", "hungry_beast", "pack_hunter"],
  ],
  mid: [
    ["blood_beast", "blood_beast", "hungry_beast"],
    ["armored_beast", "beast_shaman", "hungry_beast"],
    ["horned_charger", "hungry_beast", "hungry_beast"],
    ["pack_hunter", "pack_hunter", "hungry_beast", "hungry_beast"],
  ],
  late: [
    ["horned_charger", "horned_charger", "beast_shaman"],
    ["blood_beast", "blood_beast", "armored_beast", "beast_shaman"],
    ["pack_hunter", "pack_hunter", "blood_beast", "hungry_beast"],
    ["hungry_beast", "hungry_beast", "pack_hunter", "armored_beast", "beast_shaman"],
  ],
  elite: [
    ["blood_tracker", "hungry_beast"],
    ["blood_tracker", "blood_beast"],
    ["iron_destroyer"],
    ["iron_destroyer", "hungry_beast"],
    ["shaman_captain", "hungry_beast", "hungry_beast"],
    ["shaman_captain", "armored_beast", "pack_hunter"],
  ],
});

export function createEnemy(enemyId) {
  const template = ENEMY_LIBRARY[enemyId];
  if (!template) {
    throw new Error("Unknown enemy: " + enemyId);
  }

  return {
    id: template.id,
    name: template.name,
    tier: template.tier,
    maxHp: template.maxHp,
    hp: template.maxHp,
    block: template.initialBlock || 0,
    maxStagger: template.maxStagger || 0,
    stagger: template.maxStagger || 0,
    staggeredTurns: 0,
    intentIndex: 0,
    actionCancelled: false,
    attackBonus: 0,
    statuses: {},
    intents: template.intents.map(function copyIntent(intent) {
      return { ...intent };
    }),
  };
}

export function getEncounterForBattle(battleNumber) {
  if (battleNumber % 4 === 0) {
    const eliteIndex = Math.floor(battleNumber / 4 - 1) % ENCOUNTER_POOL.elite.length;
    return ENCOUNTER_POOL.elite[eliteIndex];
  }

  let pool = ENCOUNTER_POOL.early;
  if (battleNumber >= 7) {
    pool = ENCOUNTER_POOL.late;
  } else if (battleNumber >= 4) {
    pool = ENCOUNTER_POOL.mid;
  }

  return pool[(battleNumber - 1) % pool.length];
}
