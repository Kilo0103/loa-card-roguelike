export const BOND_MATERIAL_LABELS = Object.freeze({
  fragments: "결속의 파편",
  resonanceStones: "공명석",
  estherSeals: "에스더의 인장",
  bondCore: "결속의 핵",
});

export const ESTHER_LIBRARY = Object.freeze({
  silian: {
    id: "silian",
    name: "실리안",
    role: "단일 폭딜 / 파괴",
    descriptions: [
      "대상에게 피해 18.",
      "대상에게 피해 24 + 파괴 20% 2턴.",
      "대상에게 피해 32 + 파괴 20% 3턴. 무력화 대상이면 추가 피해 8.",
    ],
  },
  wei: {
    id: "wei",
    name: "웨이",
    role: "무력화",
    descriptions: [
      "대상에게 피해 8 + 무력화 5.",
      "대상에게 피해 10 + 무력화 8.",
      "대상에게 피해 12 + 무력화 11. 이 효과로 무력화 성공 시 2장 드로우 + 코스트 1.",
    ],
  },
  inanna: {
    id: "inanna",
    name: "이난나",
    role: "회복 / 정화",
    descriptions: [
      "HP 12 회복 + 무작위 디버프 1개 정화.",
      "HP 18 회복 + 모든 디버프 정화.",
      "HP 22 회복 + 모든 디버프 정화 + 보호막 12.",
    ],
  },
  balthorr: {
    id: "balthorr",
    name: "바훈투르",
    role: "보호막 / 생존",
    descriptions: [
      "보호막 18.",
      "보호막 26.",
      "보호막 34 + 다음 적 행동 동안 쉴드 관통도 보호막으로 방어.",
    ],
  },
  ninav: {
    id: "ninav",
    name: "니나브",
    role: "정밀 타격 / 강적 사냥",
    descriptions: [
      "대상의 보호막을 무시하고 피해 16.",
      "보호막 무시 피해 22 + 약화 2턴.",
      "보호막 무시 피해 28 + 약화 2턴. 엘리트 이상이면 추가 피해 8.",
    ],
  },
  azena: {
    id: "azena",
    name: "아제나",
    role: "광역 섬멸",
    descriptions: [
      "모든 적에게 피해 7.",
      "모든 적에게 피해 10.",
      "모든 적에게 피해 7을 2회.",
    ],
  },
  shandi: {
    id: "shandi",
    name: "샨디",
    role: "드로우 / 코스트 순환",
    descriptions: [
      "카드 2장 드로우 + 코스트 1 회복.",
      "카드 3장 드로우 + 코스트 2 회복.",
      "카드 3장 드로우 + 코스트 2 회복 + 다음 카드 2장 코스트 -1.",
    ],
  },
});

export const ESTHER_IDS = Object.freeze(Object.keys(ESTHER_LIBRARY));

export const BOND_UPGRADE_COSTS = Object.freeze({
  2: Object.freeze({
    fragments: 6,
    resonanceStones: 2,
    estherSeals: 1,
    bondCore: 0,
  }),
  3: Object.freeze({
    fragments: 12,
    resonanceStones: 5,
    estherSeals: 2,
    bondCore: 1,
  }),
});

export const BOND_SHOP_FEES = Object.freeze({
  2: 40,
  3: 80,
});

export const BOND_MATERIAL_SHOP_OFFERS = Object.freeze([
  Object.freeze({
    material: "fragments",
    amount: 3,
    price: 25,
  }),
  Object.freeze({
    material: "resonanceStones",
    amount: 1,
    price: 30,
  }),
  Object.freeze({
    material: "estherSeals",
    amount: 1,
    price: 65,
  }),
]);

export function createBondState() {
  return {
    estherId: null,
    level: 0,
    completedBattles: 0,
    ready: false,
    materials: {
      fragments: 0,
      resonanceStones: 0,
      estherSeals: 0,
      bondCore: 0,
    },
  };
}

export function ensureBondState(run) {
  if (!run.bond) {
    run.bond = createBondState();
  }

  if (!run.bond.materials) {
    run.bond.materials = createBondState().materials;
  }

  for (const key of Object.keys(BOND_MATERIAL_LABELS)) {
    if (!Number.isFinite(run.bond.materials[key])) {
      run.bond.materials[key] = 0;
    }
  }

  run.bond.level = Number.isFinite(run.bond.level) ? run.bond.level : 0;
  run.bond.completedBattles = Number.isFinite(run.bond.completedBattles)
    ? Math.max(0, Math.min(2, run.bond.completedBattles))
    : 0;
  run.bond.ready = Boolean(
    run.bond.estherId && run.bond.completedBattles >= 2
  );

  return run.bond;
}

export function getEsther(estherId) {
  return ESTHER_LIBRARY[estherId] || null;
}

export function selectBond(run, estherId) {
  const bond = ensureBondState(run);
  if (bond.estherId || !getEsther(estherId)) {
    return false;
  }

  bond.estherId = estherId;
  bond.level = 1;
  bond.completedBattles = 0;
  bond.ready = false;
  return true;
}

export function recordBondBattleVictory(run) {
  const bond = ensureBondState(run);
  if (!bond.estherId || bond.ready) {
    return bond.completedBattles;
  }

  bond.completedBattles = Math.min(2, bond.completedBattles + 1);
  bond.ready = bond.completedBattles >= 2;
  return bond.completedBattles;
}

export function consumeBondCharge(run) {
  const bond = ensureBondState(run);
  if (!bond.estherId || !bond.ready) {
    return false;
  }

  bond.completedBattles = 0;
  bond.ready = false;
  return true;
}

export function grantBondMaterial(run, material, amount) {
  const bond = ensureBondState(run);
  if (!Object.prototype.hasOwnProperty.call(bond.materials, material)) {
    return false;
  }

  bond.materials[material] += amount;
  return true;
}

function pushMaterialReward(run, rewards, material, amount) {
  if (amount <= 0) {
    return;
  }

  grantBondMaterial(run, material, amount);
  rewards.push({
    material,
    amount,
  });
}

export function awardBondBattleMaterials(
  run,
  nodeType,
  encounterKey,
  random = Math.random
) {
  const rewards = [];

  if (nodeType === "normal") {
    if (random() < 0.35) {
      pushMaterialReward(run, rewards, "fragments", 1);
    }
    return rewards;
  }

  if (nodeType === "elite") {
    pushMaterialReward(run, rewards, "fragments", 2);
    if (random() < 0.5) {
      pushMaterialReward(run, rewards, "resonanceStones", 1);
    }
    return rewards;
  }

  if (encounterKey === "midboss:lugaru") {
    pushMaterialReward(run, rewards, "fragments", 3);
    pushMaterialReward(run, rewards, "resonanceStones", 1);
    pushMaterialReward(run, rewards, "estherSeals", 1);
  } else if (encounterKey === "midboss:lucas") {
    pushMaterialReward(run, rewards, "fragments", 4);
    pushMaterialReward(run, rewards, "resonanceStones", 2);
    pushMaterialReward(run, rewards, "estherSeals", 1);
  } else if (encounterKey === "midboss:black_mountain_predator") {
    pushMaterialReward(run, rewards, "fragments", 4);
    pushMaterialReward(run, rewards, "resonanceStones", 2);
    pushMaterialReward(run, rewards, "estherSeals", 1);
    pushMaterialReward(run, rewards, "bondCore", 1);
  }

  return rewards;
}

export function formatBondMaterialRewards(rewards) {
  if (!rewards || rewards.length === 0) {
    return "";
  }

  return rewards.map(function rewardText(reward) {
    return BOND_MATERIAL_LABELS[reward.material] + " +" + reward.amount;
  }).join(" · ");
}

export function getNextBondLevel(run) {
  const bond = ensureBondState(run);
  if (!bond.estherId || bond.level >= 3) {
    return null;
  }
  return bond.level + 1;
}

export function getBondUpgradeCost(run) {
  const nextLevel = getNextBondLevel(run);
  return nextLevel ? BOND_UPGRADE_COSTS[nextLevel] : null;
}

export function canUpgradeBond(run, source) {
  const bond = ensureBondState(run);
  const nextLevel = getNextBondLevel(run);

  if (!bond.estherId) {
    return {
      success: false,
      message: "아직 결속한 에스더가 없습니다.",
    };
  }

  if (!nextLevel) {
    return {
      success: false,
      message: "결속이 이미 최대 3강입니다.",
    };
  }

  const cost = BOND_UPGRADE_COSTS[nextLevel];
  for (const material of Object.keys(cost)) {
    if (bond.materials[material] < cost[material]) {
      return {
        success: false,
        message: BOND_MATERIAL_LABELS[material] + "이 부족합니다.",
      };
    }
  }

  const goldFee = source === "shop" ? BOND_SHOP_FEES[nextLevel] : 0;
  if (source !== "shop" && source !== "rest") {
    return {
      success: false,
      message: "결속 강화소에서만 강화할 수 있습니다.",
    };
  }

  if (run.gold < goldFee) {
    return {
      success: false,
      message: "강화 수수료를 낼 골드가 부족합니다.",
    };
  }

  return {
    success: true,
    nextLevel,
    cost,
    goldFee,
  };
}

export function upgradeBond(run, source) {
  const result = canUpgradeBond(run, source);
  if (!result.success) {
    return result;
  }

  const bond = ensureBondState(run);
  for (const material of Object.keys(result.cost)) {
    bond.materials[material] -= result.cost[material];
  }

  run.gold -= result.goldFee;
  bond.level = result.nextLevel;

  return {
    success: true,
    nextLevel: bond.level,
    goldFee: result.goldFee,
    message:
      getEsther(bond.estherId).name + " 결속 " + bond.level + "강 완료" +
      (result.goldFee > 0 ? " · " + result.goldFee + "G 지불" : " · 무료 강화"),
  };
}
