export const MAGIC_BOOK_LIBRARY = Object.freeze({
  grudge: { number: 1, id: "grudge", name: "원한", source: "loa", implemented: true, description: "중간 보스·보스에게 주는 피해 +20%, 받는 피해 +20%." },
  adrenaline: { number: 2, id: "adrenaline", name: "아드레날린", source: "loa", implemented: false, description: "사용한 코스트에 따라 다음 턴 추가 피해. 정확한 구간 미정." },
  mass_increase: { number: 3, id: "mass_increase", name: "질량 증가", source: "loa", implemented: true, description: "모든 공격 카드 기본 코스트 +1, 공격 피해 +2." },
  crisis_evasion: { number: 4, id: "crisis_evasion", name: "위기 모면", source: "loa", implemented: false, description: "치명 피해 생존 후 랜덤 마법서 파괴. 세부 계산 미정." },
  max_mana_increase: { number: 5, id: "max_mana_increase", name: "최대 마나 증가", source: "loa", implemented: true, description: "최대 코스트 +3." },
  master_of_ambush: { number: 6, id: "master_of_ambush", name: "기습의 대가", source: "loa", implemented: true, description: "백어택 공격 카드 피해 +4." },
  master_brawler: { number: 7, id: "master_brawler", name: "결투의 대가", source: "loa", implemented: true, description: "헤드어택 공격 카드 피해 +4." },
  hit_master: { number: 8, id: "hit_master", name: "타격의 대가", source: "loa", implemented: true, description: "백어택/헤드어택이 없는 공격 카드 피해 +3." },
  masters_tenacity: { number: 9, id: "masters_tenacity", name: "달인의 저력", source: "loa", implemented: true, description: "잃은 HP 비율만큼 공격 피해 증가." },
  shield_piercing: { number: 10, id: "shield_piercing", name: "쉴드 관통", source: "loa", implemented: true, description: "공격 카드가 적 보호막을 무시합니다." },
  broken_bone: { number: 11, id: "broken_bone", name: "부러진 뼈", source: "loa", implemented: true, description: "무력화된 대상에게 공격 피해 +5." },

  weakness_capture: { number: 12, id: "weakness_capture", name: "약점 포착", source: "original", implemented: true, description: "디버프가 있는 적에게 공격 피해 +2." },
  first_strike: { number: 13, id: "first_strike", name: "기선 제압", source: "original", implemented: true, description: "매 전투 첫 공격 카드 피해 +6." },
  potion_addiction: { number: 14, id: "potion_addiction", name: "물약 중독", source: "original", implemented: true, description: "전투 보상에서 물약이 항상 드롭됩니다." },
  keen_combat_sense: { number: 15, id: "keen_combat_sense", name: "예리한 전투 감각", source: "original", implemented: false, description: "직전 턴에 사용하지 않은 종류 카드 코스트 -1. 첫 턴 판정 미정." },
  heavy_weapon: { number: 16, id: "heavy_weapon", name: "대형 병기", source: "original", implemented: true, description: "원래 코스트 3 이상 공격 카드 피해 +3." },
  lightweight_combat: { number: 17, id: "lightweight_combat", name: "경량 전투", source: "original", implemented: true, description: "원래 코스트 1 이하 카드를 3장 사용할 때마다 1장 드로우." },
  endless_nightmare: { number: 18, id: "endless_nightmare", name: "끝없는 악몽", source: "original", implemented: true, description: "턴 종료 시 코스트가 4 이상이면 다음 턴 첫 카드 코스트 0. 코스트가 0이면 다음 턴 첫 공격 피해 +4." },
  full_charge: { number: 19, id: "full_charge", name: "완전 충전", source: "original", implemented: true, description: "최대 단계 차징 공격 피해 +4." },
  charge_assist: { number: 20, id: "charge_assist", name: "충전 보조", source: "original", implemented: true, description: "차징 카드를 1단계 높은 상태에서 시작합니다." },
  shield_mastery: { number: 21, id: "shield_mastery", name: "방패 숙련", source: "original", implemented: true, description: "보호막 획득량 +1." },
  iron_will: { number: 22, id: "iron_will", name: "철벽의 의지", source: "original", implemented: true, description: "턴 시작 시 보호막이 남아 있으면 보호막 +2." },
  counter_stance: { number: 23, id: "counter_stance", name: "반격 태세", source: "original", implemented: true, description: "적 공격으로 보호막이 감소하면 다음 공격 카드 피해 +3." },
  guardian_instinct: { number: 24, id: "guardian_instinct", name: "수호 본능", source: "original", implemented: true, description: "보호막 20 이상이면 매 턴 첫 방어/보호 계열 카드 코스트 -1." },
  escape_master: { number: 25, id: "escape_master", name: "탈출의 명수", source: "original", implemented: true, description: "보스 외 전투에서 보상을 포기하고 즉시 이탈합니다." },
  first_aid: { number: 26, id: "first_aid", name: "응급 처치", source: "original", implemented: true, description: "전투 중 처음 HP 50% 이하가 되면 HP 5 회복." },
  recovery: { number: 27, id: "recovery", name: "회생", source: "original", implemented: true, description: "전투 승리 시 HP 3 회복." },
  catch_breath: { number: 28, id: "catch_breath", name: "숨 고르기", source: "original", implemented: true, description: "코스트 2 이상 남기고 턴 종료 시 다음 턴 코스트 +1." },
  mana_echo: { number: 29, id: "mana_echo", name: "마력 잔향", source: "original", implemented: true, description: "턴 종료 시 코스트 3 이상을 5턴 연속 유지하면 다음 3턴 동안 현재 코스트가 3 아래로 내려가지 않습니다." },
  combat_breathing: { number: 30, id: "combat_breathing", name: "전투 호흡", source: "original", implemented: true, description: "한 턴에 카드 3장 사용 후 다음 카드 코스트 -1." },
  rapid_deployment: { number: 31, id: "rapid_deployment", name: "신속 전개", source: "original", implemented: true, description: "한 턴 카드 3장 사용 시 1장 드로우. 턴당 1회." },
  tooki_tooki: { number: 32, id: "tooki_tooki", name: "두키? 두키!", source: "original", implemented: true, description: "전투 승리 골드를 25~55% 추가 획득." },
  fixed_memory: { number: 33, id: "fixed_memory", name: "기억 고정", source: "original", implemented: true, description: "턴 종료 전에 손패 1장을 지정하면 다음 턴까지 보존합니다." },
  contingency_plan: { number: 34, id: "contingency_plan", name: "예비 계획", source: "original", implemented: true, description: "전투 시작 시 카드 2장을 추가로 드로우한 뒤 2장을 선택해 버립니다." },
  mana_refund: { number: 35, id: "mana_refund", name: "마력 환급", source: "original", implemented: true, description: "매 턴 처음 사용하는 3코스트 이상 카드가 코스트 1 반환." },
  recycling: { number: 36, id: "recycling", name: "재활용", source: "original", implemented: true, description: "전투 중 처음 소멸되는 카드 1장은 소멸하지 않고 버림 더미로 이동합니다." },
  tidy_up: { number: 37, id: "tidy_up", name: "정리 정돈", source: "original", implemented: true, description: "카드 사용으로 손패가 0장이 되면 2장 드로우. 턴당 1회." },
  overwhelm: { number: 38, id: "overwhelm", name: "압도", source: "original", implemented: true, description: "무력화 수치를 가진 카드의 무력화 +1." },
  demolition_expert: { number: 39, id: "demolition_expert", name: "파쇄 전문가", source: "original", implemented: true, description: "자신이 부여하는 파괴 지속시간 +1턴." },
  thorns: { number: 40, id: "thorns", name: "가시", source: "original", implemented: false, exclusiveGroup: "first_debuff_response", description: "전투 중 처음 받은 디버프를 적에게도 동일 부여." },
  cleanse_instinct: { number: 41, id: "cleanse_instinct", name: "정화 본능", source: "original", implemented: true, exclusiveGroup: "first_debuff_response", description: "매 전투 처음 받는 디버프 1개를 무효화합니다." },
  opportunity_capture: { number: 42, id: "opportunity_capture", name: "기회 포착", source: "original", implemented: true, description: "카운터 성공 시 코스트 1 회복 + 1장 드로우." },
  quick_counter: { number: 43, id: "quick_counter", name: "재빠른 반격", source: "original", implemented: true, description: "카운터 효과 카드 코스트 -1, 최소 0." },
  counterattack: { number: 44, id: "counterattack", name: "역공", source: "original", implemented: true, description: "적 행동을 취소하면 다음 공격 카드 피해 +5." },
  blood_contract: { number: 45, id: "blood_contract", name: "피의 계약", source: "original", implemented: true, description: "전투 시작 HP 10% 감소, 해당 전투 공격 피해 +2." },
  desperate_fight: { number: 46, id: "desperate_fight", name: "사투", source: "original", implemented: true, description: "현재 HP 50% 이하일 때 공격 피해 +2." },
  indomitable: { number: 47, id: "indomitable", name: "불굴", source: "original", implemented: true, description: "적에게 직접 HP 피해를 받으면 보호막 3. 턴당 1회." },
  all_in: { number: 48, id: "all_in", name: "승부수", source: "original", implemented: true, description: "사용 후 코스트가 정확히 0이면 공격 피해 +4 또는 보호막 +4." },
  strong_hunter: { number: 49, id: "strong_hunter", name: "강자 사냥", source: "original", implemented: true, description: "엘리트와 보스에게 공격 피해 +2." },
  fate_reselection: { number: 50, id: "fate_reselection", name: "운명의 재선택", source: "original", implemented: true, description: "각 카드 보상 화면에서 랜덤 슬롯을 1회 재추첨할 수 있습니다." },
});

export const MAGIC_BOOK_IDS = Object.freeze(
  Object.values(MAGIC_BOOK_LIBRARY)
    .sort(function byNumber(left, right) {
      return left.number - right.number;
    })
    .map(function bookId(book) {
      return book.id;
    })
);

export function getMagicBook(bookId) {
  const book = MAGIC_BOOK_LIBRARY[bookId];
  if (!book) {
    throw new Error("Unknown magic book: " + bookId);
  }

  return book;
}

export function hasMagicBook(run, bookId) {
  return Array.isArray(run.magicBooks) && run.magicBooks.includes(bookId);
}

export function canAcquireMagicBook(run, bookId) {
  const book = getMagicBook(bookId);

  if (hasMagicBook(run, bookId)) {
    return false;
  }

  if (!book.exclusiveGroup) {
    return true;
  }

  return !run.magicBooks.some(function exclusiveConflict(ownedId) {
    const owned = getMagicBook(ownedId);
    return owned.exclusiveGroup === book.exclusiveGroup;
  });
}

export function acquireMagicBook(run, bookId) {
  if (!canAcquireMagicBook(run, bookId)) {
    return false;
  }

  run.magicBooks.push(bookId);
  return true;
}

export function removeMagicBook(run, bookId) {
  const index = run.magicBooks.indexOf(bookId);
  if (index < 0) {
    return false;
  }

  run.magicBooks.splice(index, 1);
  return true;
}

export function getAvailableMagicBookIds(run) {
  return MAGIC_BOOK_IDS.filter(function available(bookId) {
    return canAcquireMagicBook(run, bookId);
  });
}


export function getAvailableImplementedMagicBookIds(run) {
  return getAvailableMagicBookIds(run).filter(function implementedOnly(bookId) {
    return getMagicBook(bookId).implemented;
  });
}

export function rollMagicBookDrop(run) {
  const available = getAvailableImplementedMagicBookIds(run);

  if (available.length === 0) {
    return null;
  }

  return available[Math.floor(Math.random() * available.length)];
}
