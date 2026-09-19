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

  lugaru: {
    id: "lugaru",
    name: "통솔자 루가루",
    tier: "midboss",
    maxHp: 46,
    maxStagger: 12,
    intents: [
      { type: "attackStatus", value: 5, status: "bleed", duration: 1, statusValue: 2, label: "할퀴기 5 + 출혈" },
      { type: "multiAttackStatus", value: 3, hits: 2, status: "bleed", duration: 1, statusValue: 2, label: "연속 할퀴기 3×2 + 출혈" },
      { type: "extendPlayerDebuff", status: "bleed", duration: 1, label: "피의 냄새: 출혈 +1턴" },
      { type: "conditionalAttack", value: 10, status: "bleed", bonus: 4, label: "포식 급습 10", counterable: true },
    ],
  },
  lucas: {
    id: "lucas",
    name: "파괴자 루카스",
    tier: "midboss",
    maxHp: 48,
    maxStagger: 12,
    intents: [
      { type: "attackStatus", value: 4, status: "cold", duration: 2, statusValue: 1, label: "냉기 투척 4 + 냉기" },
      { type: "frostTrap", label: "빙결 덫: 다음 턴 카드 3장 사용 요구" },
      { type: "delayedBlast", value: 9, label: "폭발 구체: 다음 턴 종료 시 9" },
      { type: "conditionalAttackAny", value: 7, statuses: ["cold", "frozen"], bonus: 3, label: "파괴의 파동 7" },
    ],
  },
  black_mountain_predator: {
    id: "black_mountain_predator",
    name: "검은 산의 포식자",
    tier: "midboss",
    maxHp: 52,
    maxStagger: 14,
    intents: [
      { type: "attackStatus", value: 6, status: "bleed", duration: 1, statusValue: 2, label: "붉은 할퀴기 6 + 출혈" },
      { type: "attackStatus", value: 5, status: "cold", duration: 2, statusValue: 1, label: "푸른 파동 5 + 냉기" },
      { type: "conditionalAttack", value: 11, status: "bleed", bonus: 3, label: "포식 급습 11", counterable: true },
      { type: "delayedBlast", value: 8, label: "빙결 구체: 다음 턴 종료 시 8" },
      { type: "bondCheck", value: 12, block: 8, label: "결속: 다음 턴까지 무력화 요구" },
    ],
  },

  valtan: {
    id: "valtan",
    name: "마수군단장 발탄",
    tier: "boss",
    maxHp: 120,
    maxStagger: 18,
    bossPhase: "normal",
    intents: [
      { type: "attack", value: 7, label: "도끼 휘두르기 7" },
      { type: "multiAttack", value: 4, hits: 2, label: "연속 내려치기 4×2" },
      { type: "multiAttack", value: 3, hits: 3, label: "소용돌이 3×3" },
      { type: "terrainStrike", value: 9, label: "파괴의 도끼 9 — 지형 붕괴 예고" },
      { type: "terrainCollapse", value: 5, label: "지형 붕괴 5 + 잔해" },
      { type: "attack", value: 13, label: "광폭 돌진 13", counterable: true },
    ],
    ghostIntents: [
      { type: "attack", value: 12, label: "유령 돌진 12", counterable: true, removeImmortalAfter: true, removeImmortalOnCounter: true },
      { type: "attack", value: 8, label: "유령 휘두르기 8" },
      { type: "attack", value: 5, label: "영혼의 포효 5 [쉴드 관통]", piercing: true },
      { type: "multiAttack", value: 4, hits: 3, label: "마지막 발악 4×3", requiresNoImmortal: true },
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
    bossPhase: template.bossPhase || null,
    ghostIntents: template.ghostIntents
      ? template.ghostIntents.map(function copyGhostIntent(intent) {
          return { ...intent };
        })
      : [],
    special: {
      delayedBlast: null,
      frostTrap: false,
      bondPending: false,
      collapseCount: 0,
      immortalStacks: 0,
    },
    intents: template.intents.map(function copyIntent(intent) {
      return { ...intent };
    }),
  };
}

function pickEncounter(poolName, previousEncounterKey) {
  const pool = ENCOUNTER_POOL[poolName];
  const candidates = pool
    .map(function encounterEntry(enemies, index) {
      return {
        key: poolName + ":" + index,
        enemies,
      };
    })
    .filter(function avoidImmediateRepeat(entry) {
      return entry.key !== previousEncounterKey;
    });

  const available = candidates.length > 0
    ? candidates
    : pool.map(function fallbackEntry(enemies, index) {
        return {
          key: poolName + ":" + index,
          enemies,
        };
      });

  return available[Math.floor(Math.random() * available.length)];
}

function normalPoolForRow(row) {
  if (row < 5) {
    return "early";
  }

  if (row < 10) {
    return "mid";
  }

  return "late";
}

export function getEncounterForNode(node, previousEncounterKey) {
  if (!node) {
    throw new Error("Map node is required.");
  }

  if (node.type === "midboss" || node.type === "boss") {
    return {
      key: node.type + ":" + node.encounterId,
      enemies: [node.encounterId],
    };
  }

  if (node.type === "elite") {
    return pickEncounter("elite", previousEncounterKey);
  }

  return pickEncounter(normalPoolForRow(node.row), previousEncounterKey);
}
