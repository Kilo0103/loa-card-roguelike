import { getCard } from "../data/cards.js";
import {
  getMagicBook,
  hasMagicBook,
} from "../data/magicBooks.js";
import {
  canEscapeBattle,
  canUseBond,
  getEffectiveCardCost,
  getEnemyIntent,
  getPlayerMaxEnergy,
} from "../game/battle.js";
import {
  getAllMapNodes,
  getAvailableMapNodes,
  getCurrentMapNode,
} from "../game/map.js";
import { canChooseEventOption } from "../game/nodes.js";
import {
  BOND_MATERIAL_LABELS,
  BOND_SHOP_FEES,
  ESTHER_IDS,
  canUpgradeBond,
  ensureBondState,
  getBondUpgradeCost,
  getEsther,
} from "../game/bond.js";
import {
  canUsePotion,
  getPotion,
  MAX_POTIONS,
} from "../game/potions.js";

const STATUS_LABELS = Object.freeze({
  bleed: "출혈",
  cold: "냉기",
  frozen: "빙결",
  destruction: "파괴",
  weakness: "약화",
  taunt: "도발",
});

function statusLabel(name) {
  return STATUS_LABELS[name] || name;
}

function cardClass(card) {
  return "card card--" + card.type + " card--" + card.rarity;
}

function renderTags(card) {
  const tags = card.tags.filter(function visibleTag(tag) {
    return tag !== "starter";
  });

  if (tags.length === 0) {
    return "";
  }

  return '<div class="card__tags">' +
    tags.map(function tagHtml(tag) {
      return "<span>#" + tag + "</span>";
    }).join("") +
    "</div>";
}

function renderCard(run, battle, cardId, index) {
  const card = getCard(cardId);
  const cost = getEffectiveCardCost(run, battle, card);
  const contingency = battle.playerStatuses.contingencyRemaining > 0;
  const retainMode = battle.playerStatuses.retainSelectionMode;
  const selectedForRetain = battle.playerStatuses.retainedHandIndex === index;
  const normalDisabled = card.unplayable || cost > battle.energy;
  const disabled = contingency || retainMode ? false : normalDisabled;
  const action = contingency
    ? "discard-contingency-card"
    : (retainMode ? "select-retain-card" : "play-card");
  const draggable = !contingency && !retainMode && !normalDisabled;
  const costText = card.unplayable ? "—" : String(cost);
  const classes = cardClass(card) +
    " battle-card" +
    (selectedForRetain ? " card--retained" : "") +
    (contingency ? " card--setup-choice" : "") +
    (retainMode ? " card--retain-choice" : "");
  const handCenter = (battle.hand.length - 1) / 2;
  const handDelta = index - handCenter;
  const rotation = Math.max(-8, Math.min(8, handDelta * 2.4));
  const drop = Math.min(18, Math.abs(handDelta) * 3.2);
  const artLabel = card.type === "attack"
    ? "ATK"
    : (card.type === "defense"
      ? "DEF"
      : (card.type === "status" ? "STS" : "SKL"));

  return (
    '<button class="' + classes + '" data-action="' + action + '" data-index="' + index + '"' +
    ' data-drag-card-index="' + index + '"' +
    ' data-card-target="' + card.target + '"' +
    ' style="--hand-rotate:' + rotation.toFixed(2) + 'deg;--hand-drop:' +
      drop.toFixed(1) + 'px;--hand-z:' + (20 + index) + '"' +
    (draggable ? ' draggable="true"' : ' draggable="false"') +
    (disabled ? " disabled" : "") + ">" +
      '<div class="card__frame">' +
        '<div class="card__header">' +
          '<span class="card__cost">' + costText + "</span>" +
          '<div class="card__title-block">' +
            '<strong class="card__name">' + card.name + "</strong>" +
            '<span class="card__type">' + card.type + "</span>" +
          "</div>" +
          '<span class="card__rarity">' + card.rarity + "</span>" +
        "</div>" +
        '<div class="card__art" aria-hidden="true">' +
          '<span class="card__art-sigil">' + artLabel + "</span>" +
        "</div>" +
        '<div class="card__body">' +
          "<p>" + card.description + "</p>" +
          renderTags(card) +
        "</div>" +
      "</div>" +
    "</button>"
  );
}

function renderEnemySpecial(enemy) {
  const tags = [];

  if (enemy.bossPhase === "ghost") {
    tags.push("유령 페이즈");
  }
  if (enemy.special.immortalStacks > 0) {
    tags.push("불멸 ×" + enemy.special.immortalStacks);
  }
  if (enemy.special.frostTrap) {
    tags.push("빙결 덫");
  }
  if (enemy.special.delayedBlast) {
    tags.push("지연 폭발 " + enemy.special.delayedBlast.value);
  }
  if (enemy.special.bondPending) {
    tags.push("결속 무력화 체크");
  }

  if (tags.length === 0) {
    return "";
  }

  return '<div class="enemy-statuses enemy-statuses--special">' +
    tags.map(function specialTag(tag) {
      return "<span>" + tag + "</span>";
    }).join("") +
    "</div>";
}

function renderEnemy(battle, enemy, index) {
  const selected = battle.selectedEnemyIndex === index;
  const dead = enemy.hp <= 0;
  const hpPercent = Math.max(0, enemy.hp / enemy.maxHp * 100);
  const intent = dead
    ? { label: "처치됨", counterable: false }
    : getEnemyIntent(battle, enemy);
  const counter = intent.counterable
    ? '<span class="counter-tag">카운터 가능</span>'
    : "";

  let stagger = "";
  if (enemy.maxStagger > 0) {
    const staggerPercent = Math.max(0, enemy.stagger / enemy.maxStagger * 100);
    stagger =
      '<div class="mini-meter mini-meter--stagger">' +
        '<div style="width:' + staggerPercent + '%"></div>' +
      "</div>" +
      '<span class="enemy-card__sub">무력화 ' +
        enemy.stagger + " / " + enemy.maxStagger + "</span>";
  }

  const statusNames = Object.keys(enemy.statuses);
  const statuses = statusNames.length > 0
    ? '<div class="enemy-statuses">' +
        statusNames.map(function statusName(name) {
          const status = enemy.statuses[name];
          return "<span>" + statusLabel(name) + " " + status.duration + "</span>";
        }).join("") +
      "</div>"
    : "";

  return (
    '<button class="enemy-card' +
      (selected ? " enemy-card--selected" : "") +
      (dead ? " enemy-card--dead" : "") + '"' +
      ' data-action="select-enemy" data-enemy-index="' + index + '"' +
      ' data-drop-enemy-index="' + index + '"' +
      (dead ? " disabled" : "") + ">" +
      '<div class="enemy-card__top">' +
        '<span class="enemy-tier">' + enemy.tier + "</span>" +
        "<strong>" + enemy.name + "</strong>" +
      "</div>" +
      '<div class="enemy-intent-inline">' + intent.label + counter + "</div>" +
      '<div class="mini-meter"><div style="width:' + hpPercent + '%"></div></div>' +
      '<span class="enemy-card__sub">HP ' + enemy.hp + " / " + enemy.maxHp +
        " · 보호막 " + enemy.block + "</span>" +
      stagger +
      statuses +
      renderEnemySpecial(enemy) +
    "</button>"
  );
}

function renderPlayerDebuffs(battle) {
  const names = Object.keys(battle.playerDebuffs);
  if (names.length === 0) {
    return "";
  }

  return '<section class="player-status-strip panel">' +
    '<span class="label">상태이상</span>' +
    names.map(function debuffHtml(name) {
      const debuff = battle.playerDebuffs[name];
      return "<strong>" + statusLabel(name) + " " + debuff.duration + "턴</strong>";
    }).join("") +
  "</section>";
}

function renderRewardCard(cardId, slotLabel) {
  const card = getCard(cardId);

  return (
    '<button class="' + cardClass(card) +
      ' reward-card" data-action="choose-reward" data-card-id="' + cardId + '">' +
      '<div class="reward-slot">' + slotLabel + "</div>" +
      '<div class="card__header">' +
        '<span class="card__cost">' + card.cost + "</span>" +
        '<span class="card__rarity">' + card.rarity + "</span>" +
      "</div>" +
      '<strong class="card__name">' + card.name + "</strong>" +
      '<span class="card__type">' + card.type + "</span>" +
      "<p>" + card.description + "</p>" +
      renderTags(card) +
    "</button>"
  );
}


const MAP_TYPE_LABELS = Object.freeze({
  normal: "전투",
  elite: "엘리트",
  event: "이벤트",
  rest: "휴식",
  shop: "상점",
  midboss: "중간 보스",
  boss: "보스",
});

const MAP_TYPE_MARKS = Object.freeze({
  normal: "N",
  elite: "E",
  event: "?",
  rest: "R",
  shop: "$",
  midboss: "M",
  boss: "B",
});

function mapNodePosition(node, rowCount) {
  const xPositions = [14, 38, 62, 86];

  return {
    xPercent: xPositions[node.column],
    xView: xPositions[node.column] * 10,
    y: 40 + (rowCount - 1 - node.row) * 92,
  };
}

function renderMapEdges(map) {
  const nodes = getAllMapNodes(map);
  const byId = new Map(nodes.map(function mapEntry(node) {
    return [node.id, node];
  }));
  const height = 80 + (map.rows.length - 1) * 92;
  const lines = [];

  for (const source of nodes) {
    const sourcePosition = mapNodePosition(source, map.rows.length);

    for (const targetId of source.nextIds) {
      const target = byId.get(targetId);
      if (!target) {
        continue;
      }

      const targetPosition = mapNodePosition(target, map.rows.length);
      const active = source.completed;

      lines.push(
        '<line class="map-edge' + (active ? " map-edge--active" : "") + '"' +
        ' x1="' + sourcePosition.xView + '"' +
        ' y1="' + sourcePosition.y + '"' +
        ' x2="' + targetPosition.xView + '"' +
        ' y2="' + targetPosition.y + '"></line>'
      );
    }
  }

  return (
    '<svg class="map-edges" viewBox="0 0 1000 ' + height + '"' +
      ' preserveAspectRatio="none" aria-hidden="true">' +
      lines.join("") +
    "</svg>"
  );
}

function renderMapNode(map, node, availableIds, currentNode) {
  const position = mapNodePosition(node, map.rows.length);
  const available = availableIds.has(node.id);
  const current = currentNode && currentNode.id === node.id;
  const classes = [
    "map-node",
    "map-node--" + node.type,
    available ? "map-node--available" : "",
    node.completed ? "map-node--completed" : "",
    current ? "map-node--current" : "",
  ].filter(Boolean).join(" ");

  const label = node.label || MAP_TYPE_LABELS[node.type];
  const disabled = available ? "" : " disabled";

  return (
    '<button class="' + classes + '"' +
      ' style="left:' + position.xPercent + '%;top:' + position.y + 'px"' +
      ' data-action="select-map-node"' +
      ' data-node-id="' + node.id + '"' +
      disabled + ">" +
      '<span class="map-node__mark">' + MAP_TYPE_MARKS[node.type] + "</span>" +
      '<span class="map-node__label">' + label + "</span>" +
      '<span class="map-node__floor">F' + (node.row + 1) + "</span>" +
    "</button>"
  );
}

function renderNotice(app) {
  if (!app.notice) {
    return "";
  }

  return '<div class="notice-banner">' + app.notice + "</div>";
}

function renderMap(app) {
  const run = app.run;
  const map = run.map;
  const nodes = getAllMapNodes(map);
  const availableIds = new Set(
    getAvailableMapNodes(map).map(function availableId(node) {
      return node.id;
    })
  );
  const currentNode = getCurrentMapNode(map);
  const height = 80 + (map.rows.length - 1) * 92;

  return (
    '<main class="game-shell map-screen">' +
      '<header class="topbar panel">' +
        '<div><span class="label">HP</span><strong>' +
          run.hp + " / " + run.maxHp + "</strong></div>" +
        '<div><span class="label">골드</span><strong>' +
          run.gold + "G</strong></div>" +
        '<div><span class="label">승리</span><strong>' +
          run.victories + "</strong></div>" +
        '<div><span class="label">덱</span><strong>' +
          run.deck.length + "장</strong></div>" +
        '<div><span class="label">현재 층</span><strong>' +
          (currentNode ? "F" + (currentNode.row + 1) : "시작") + "</strong></div>" +
      "</header>" +

      renderNotice(app) +
      renderMagicBookBar(run) +
      renderBondBar(run) +

      '<section class="map-panel panel">' +
        '<div class="map-panel__header">' +
          '<div><span class="eyebrow">BEAST LEGION ROUTE</span>' +
          "<h1>마수군단 진군로</h1></div>" +
          "<p>밝게 표시된 연결 노드 중 하나를 선택하세요. · Seed " + map.seed + "</p>" +
        "</div>" +

        '<div class="map-legend">' +
          '<span><i class="legend-mark legend-mark--normal">N</i>전투</span>' +
          '<span><i class="legend-mark legend-mark--elite">E</i>엘리트</span>' +
          '<span><i class="legend-mark legend-mark--event">?</i>이벤트</span>' +
          '<span><i class="legend-mark legend-mark--rest">R</i>휴식</span>' +
          '<span><i class="legend-mark legend-mark--shop">$</i>상점</span>' +
          '<span><i class="legend-mark legend-mark--midboss">M</i>중간 보스</span>' +
          '<span><i class="legend-mark legend-mark--boss">B</i>발탄</span>' +
        "</div>" +

        '<div class="map-canvas" style="height:' + height + 'px">' +
          renderMapEdges(map) +
          nodes.map(function mapNodeHtml(node) {
            return renderMapNode(map, node, availableIds, currentNode);
          }).join("") +
        "</div>" +
      "</section>" +
    "</main>"
  );
}


function renderMagicBookBar(run) {
  if (!run.magicBooks || run.magicBooks.length === 0) {
    return "";
  }

  return (
    '<div class="magic-book-bar panel">' +
      '<span class="label">마법서</span>' +
      '<div class="magic-book-list">' +
        run.magicBooks.map(function bookHtml(bookId) {
          const book = getMagicBook(bookId);
          return (
            '<span class="magic-book-chip" title="' + book.description + '">' +
              '<b>#' + book.number + "</b>" +
              book.name +
            "</span>"
          );
        }).join("") +
      "</div>" +
    "</div>"
  );
}

function renderBondBar(run) {
  const bond = ensureBondState(run);
  const materialEntries = Object.keys(BOND_MATERIAL_LABELS);
  const hasMaterials = materialEntries.some(function hasMaterial(key) {
    return bond.materials[key] > 0;
  });

  if (!bond.estherId && !hasMaterials) {
    return "";
  }

  const esther = bond.estherId ? getEsther(bond.estherId) : null;
  const charge = bond.ready ? "READY" : bond.completedBattles + " / 2";

  return (
    '<div class="bond-bar panel">' +
      '<div class="bond-bar__identity">' +
        '<span class="label">결속</span>' +
        '<strong>' + (esther ? esther.name + " " + bond.level + "강" : "미결속") + "</strong>" +
        (esther ? '<span class="bond-charge">' + charge + "</span>" : "") +
      "</div>" +
      '<div class="bond-materials">' +
        materialEntries.map(function materialChip(key) {
          return (
            '<span title="' + BOND_MATERIAL_LABELS[key] + '">' +
              BOND_MATERIAL_LABELS[key] + " " + bond.materials[key] +
            "</span>"
          );
        }).join("") +
      "</div>" +
    "</div>"
  );
}

function renderBondWorkshop(run, source) {
  const bond = ensureBondState(run);

  if (!bond.estherId) {
    return (
      '<section class="panel bond-workshop">' +
        '<span class="eyebrow">BOND WORKSHOP</span>' +
        "<h2>결속 강화소</h2>" +
        "<p>F5 루가루 처치 후 에스더와 결속하면 이용할 수 있습니다.</p>" +
      "</section>"
    );
  }

  const esther = getEsther(bond.estherId);
  const cost = getBondUpgradeCost(run);

  if (!cost) {
    return (
      '<section class="panel bond-workshop">' +
        '<span class="eyebrow">BOND WORKSHOP</span>' +
        "<h2>" + esther.name + " 결속 3강</h2>" +
        "<p>현재 결속은 최대 단계입니다.</p>" +
      "</section>"
    );
  }

  const check = canUpgradeBond(run, source);
  const nextLevel = bond.level + 1;
  const fee = source === "shop" ? BOND_SHOP_FEES[nextLevel] : 0;
  const action = source === "shop"
    ? "shop-upgrade-bond"
    : "rest-upgrade-bond";
  const costText = Object.keys(cost)
    .filter(function positiveCost(key) {
      return cost[key] > 0;
    })
    .map(function costPart(key) {
      return BOND_MATERIAL_LABELS[key] + " " + cost[key];
    })
    .join(" · ");

  return (
    '<section class="panel bond-workshop">' +
      '<div class="bond-workshop__heading">' +
        '<div><span class="eyebrow">BOND WORKSHOP</span>' +
        "<h2>" + esther.name + " " + bond.level + "강 → " + nextLevel + "강</h2></div>" +
        '<strong>' + (source === "shop" ? fee + "G 수수료" : "무료") + "</strong>" +
      "</div>" +
      "<p>필요 재료 · " + costText + "</p>" +
      "<p>다음 효과 · " + esther.descriptions[nextLevel - 1] + "</p>" +
      '<button data-action="' + action + '"' +
        (check.success ? "" : " disabled") + ">" +
        (check.success ? "결속 강화" : check.message) +
      "</button>" +
    "</section>"
  );
}

function renderBondSelect(app) {
  return (
    '<main class="center-screen bond-select-screen">' +
      '<section class="panel bond-select-panel">' +
        '<p class="eyebrow">ESTHER BOND</p>' +
        "<h1>에스더와 결속</h1>" +
        "<p>이번 런에서 함께할 에스더 한 명을 선택합니다. 선택 후 변경할 수 없습니다.</p>" +
        '<div class="bond-select-grid">' +
          ESTHER_IDS.map(function estherOption(estherId) {
            const esther = getEsther(estherId);
            return (
              '<button class="bond-select-card" data-action="choose-bond" data-esther-id="' + estherId + '">' +
                "<strong>" + esther.name + "</strong>" +
                "<span>" + esther.role + "</span>" +
                "<p>1강 · " + esther.descriptions[0] + "</p>" +
              "</button>"
            );
          }).join("") +
        "</div>" +
        renderNotice(app) +
      "</section>" +
    "</main>"
  );
}

function renderPotionInventory(run, battle) {
  const slots = [];

  for (let index = 0; index < MAX_POTIONS; index += 1) {
    const potionId = run.potions[index];

    if (!potionId) {
      slots.push(
        '<div class="potion-slot potion-slot--empty">' +
          '<span>빈 슬롯</span>' +
        "</div>"
      );
      continue;
    }

    const potion = getPotion(potionId);
    const usable = battle ? canUsePotion(run, battle, potionId) : false;

    slots.push(
      '<button class="potion-slot" data-action="use-potion"' +
        ' data-inventory-index="' + index + '"' +
        (usable ? "" : " disabled") +
        ' title="' + potion.description + '">' +
        '<strong>' + potion.shortName + "</strong>" +
        '<span>' + potion.description + "</span>" +
      "</button>"
    );
  }

  return '<div class="potion-bar">' + slots.join("") + "</div>";
}

function renderPotionReward(app) {
  const potion = getPotion(app.pendingPotionDrop);
  const isFull = app.run.potions.length >= MAX_POTIONS;

  let actions = "";

  if (!isFull) {
    actions +=
      '<button data-action="take-potion">획득하기</button>';
  } else {
    actions +=
      '<div class="potion-replace-list">' +
        app.run.potions.map(function replaceOption(potionId, index) {
          const current = getPotion(potionId);
          return (
            '<button data-action="replace-potion" data-inventory-index="' + index + '">' +
              '<strong>' + current.name + "</strong>" +
              '<span>이 물약과 교체</span>' +
            "</button>"
          );
        }).join("") +
      "</div>";
  }

  actions +=
    '<button class="secondary-button" data-action="decline-potion">포기하기</button>';

  return (
    '<main class="center-screen">' +
      '<section class="panel node-panel potion-reward-panel">' +
        '<p class="eyebrow">POTION DROP</p>' +
        "<h1>" + potion.name + "</h1>" +
        "<p>" + potion.description + "</p>" +
        '<div class="potion-reward-card">' +
          '<strong>' + potion.shortName + "</strong>" +
          '<span>' + potion.description + "</span>" +
        "</div>" +
        (isFull
          ? "<p>물약 슬롯이 가득 찼습니다. 교체할 물약을 선택하거나 포기하세요.</p>"
          : "<p>현재 물약 " + app.run.potions.length + " / " + MAX_POTIONS + "</p>") +
        actions +
      "</section>" +
    "</main>"
  );
}

function renderBattle(app) {
  const run = app.run;
  const battle = app.battle;
  const hpPercent = Math.max(0, Math.min(100, run.hp / run.maxHp * 100));
  const setupText = battle.playerStatuses.contingencyRemaining > 0
    ? '<div class="setup-banner battle-alert">예비 계획 · 버릴 카드 ' +
        battle.playerStatuses.contingencyRemaining +
        "장을 선택하세요.</div>"
    : "";

  const retainedIndex = battle.playerStatuses.retainedHandIndex;
  const retainedName = retainedIndex !== null && battle.hand[retainedIndex]
    ? getCard(battle.hand[retainedIndex]).name
    : null;

  const chargeText = battle.charge
    ? '<div class="charge-banner battle-alert">차징 중 · ' +
        battle.charge.card.name + " " +
        battle.charge.stage + " / " +
        battle.charge.card.charge.stages.length +
        "단계 · 같은 카드는 추가 기본 코스트 0</div>"
    : "";

  const bondButton = run.bond && run.bond.estherId
    ? '<button class="bond-use-button combat-action-button" data-action="use-bond"' +
      (canUseBond(run, battle) ? "" : " disabled") + ">" +
      '<span class="combat-action-button__label">결속</span>' +
      '<strong>' + getEsther(run.bond.estherId).name + "</strong>" +
      '<small>' + (run.bond.ready ? "READY" : run.bond.completedBattles + "/2") + "</small>" +
      "</button>"
    : "";

  const retainButton =
    hasMagicBook(run, "fixed_memory") &&
    battle.playerStatuses.contingencyRemaining === 0
      ? '<button class="secondary-button retain-button combat-action-button' +
        (battle.playerStatuses.retainSelectionMode ? " retain-button--active" : "") +
        '" data-action="toggle-retain-mode">' +
        '<span class="combat-action-button__label">마법서</span>' +
        '<strong>' + (retainedName ? retainedName : "기억 고정") + "</strong>" +
        '<small>' + (retainedName ? "보존 대상" : "카드 선택") + "</small>" +
        "</button>"
      : "";

  const escapeButton = canEscapeBattle(run, battle)
    ? '<button class="secondary-button escape-button combat-action-button" data-action="escape-battle">' +
        '<span class="combat-action-button__label">특수</span>' +
        "<strong>전투 이탈</strong>" +
        "<small>보상 포기</small>" +
      "</button>"
    : "";

  return (
    '<main class="game-shell battle-screen">' +
      '<section class="battle-shell">' +
        '<header class="battle-topstrip">' +
          '<div class="battle-topstrip__encounter">' +
            '<span class="eyebrow">' + (MAP_TYPE_LABELS[battle.mapNodeType] || "전투") + "</span>" +
            "<strong>" + battle.enemies.map(function enemyName(enemy) {
              return enemy.name;
            }).join(" · ") + "</strong>" +
            '<span class="battle-turn">TURN ' + battle.turn + "</span>" +
          "</div>" +
          '<div class="battle-topstrip__meta">' +
            '<span><b>' + run.gold + "</b> G</span>" +
            '<span>덱 <b>' + run.deck.length + "</b></span>" +
            '<span>드로우 <b>' + battle.drawPile.length + "</b></span>" +
            '<span>버림 <b>' + battle.discardPile.length + "</b></span>" +
            '<span>소멸 <b>' + battle.exhaustPile.length + "</b></span>" +
          "</div>" +
        "</header>" +

        renderNotice(app) +
        setupText +
        chargeText +

        '<section class="battle-stage">' +
          '<div class="battlefield battle-arena">' +
            '<div class="battlefield__heading battle-arena__heading">' +
              '<div><span class="eyebrow">BEAST LEGION</span><h1>전장</h1></div>' +
              "<p>적의 의도를 읽고 카드를 사용하세요.</p>" +
            "</div>" +
            '<div class="enemy-grid battle-enemy-line">' +
              battle.enemies.map(function enemyHtml(enemy, index) {
                return renderEnemy(battle, enemy, index);
              }).join("") +
            "</div>" +
          "</div>" +

          '<section class="player-hud player-drop-zone" data-drop-self>' +
            '<div class="player-hud__identity">' +
              '<span class="player-hud__class">WARLORD</span>' +
              '<div class="player-hud__avatar">W</div>' +
              '<div class="player-hud__name">' +
                "<strong>워로드</strong>" +
                "<small>자기 대상 카드를 이 영역으로 드롭</small>" +
              "</div>" +
            "</div>" +
            '<div class="player-hud__vitals">' +
              '<div class="player-hud__vital-row">' +
                '<span>HP</span>' +
                '<div class="player-hp-meter"><div style="width:' + hpPercent + '%"></div></div>' +
                "<strong>" + run.hp + " / " + run.maxHp + "</strong>" +
              "</div>" +
              '<div class="player-hud__secondary">' +
                '<span class="player-block-badge">보호막 <strong>' + battle.playerBlock + "</strong></span>" +
                renderPlayerDebuffs(battle) +
              "</div>" +
            "</div>" +
            '<div class="player-energy">' +
              '<span>코스트</span>' +
              "<strong>" + battle.energy + "</strong>" +
              "<small>/ " + getPlayerMaxEnergy(run) + "</small>" +
            "</div>" +
          "</section>" +
        "</section>" +

        '<section class="battle-resource-row">' +
          renderPotionInventory(run, battle) +
          renderBondBar(run) +
          renderMagicBookBar(run) +
        "</section>" +

        '<section class="combat-command-bar">' +
          '<div class="combat-command-bar__left">' +
            '<div class="pile battle-pile"><span>드로우</span><strong>' +
              battle.drawPile.length + "</strong></div>" +
            '<div class="pile battle-pile"><span>버림</span><strong>' +
              battle.discardPile.length + "</strong></div>" +
            '<div class="pile battle-pile"><span>소멸</span><strong>' +
              battle.exhaustPile.length + "</strong></div>" +
          "</div>" +
          '<div class="combat-command-bar__actions">' +
            retainButton +
            bondButton +
            escapeButton +
            '<button class="end-turn battle-end-turn" data-action="end-turn">' +
              '<span>행동 완료</span><strong>턴 종료</strong>' +
            "</button>" +
          "</div>" +
        "</section>" +

        '<section class="hand battle-hand" aria-label="손패">' +
          battle.hand.map(function cardHtml(cardId, index) {
            return renderCard(run, battle, cardId, index);
          }).join("") +
        "</section>" +

        '<details class="battle-log battle-log--compact panel">' +
          "<summary>전투 로그 · 최근 " + Math.min(18, battle.log.length) + "개</summary>" +
          "<div>" +
            battle.log.map(function logHtml(entry) {
              return "<p>" + entry + "</p>";
            }).join("") +
          "</div>" +
        "</details>" +
      "</section>" +
    "</main>"
  );
}

function renderReward(app) {
  const labels = ["직업 카드", "공통 카드", "랜덤"];

  return (
    '<main class="reward-screen game-shell">' +
      '<section class="panel reward-panel">' +
        '<p class="eyebrow">전투 승리</p>' +
        "<h1>카드 보상</h1>" +
        "<p>전투 보상 +" + app.lastGoldReward + "G · 현재 " + app.run.gold + "G</p>" +
        (app.lastMagicBookDrop
          ? "<p><strong>마법서 드랍 · " + app.lastMagicBookDrop.name + "</strong></p>"
          : "") +
        "<p>직업 1장, 공통 1장, 랜덤 1장. 한 장을 선택하거나 건너뜁니다.</p>" +
        '<div class="reward-grid">' +
          app.rewards.map(function rewardHtml(cardId, index) {
            return renderRewardCard(cardId, labels[index] || "보상");
          }).join("") +
        "</div>" +
        (
          hasMagicBook(app.run, "fate_reselection") && !app.rewardRerollUsed
            ? '<button class="secondary-button reward-reroll" data-action="reroll-random-reward">운명의 재선택 · 랜덤 슬롯 재추첨</button>'
            : ""
        ) +
        '<button class="secondary-button" data-action="skip-reward">건너뛰기</button>' +
      "</section>" +
    "</main>"
  );
}


function renderRest(app) {
  const run = app.run;
  const healAmount = Math.ceil(run.maxHp * 0.2);
  const actualHeal = Math.min(healAmount, run.maxHp - run.hp);

  return (
    '<main class="center-screen rest-screen">' +
      '<div class="rest-layout">' +
        '<section class="panel node-panel">' +
          '<p class="eyebrow">REST</p>' +
          "<h1>야영지</h1>" +
          "<p>이번 휴식에서는 체력 회복과 무료 결속 강화 중 하나만 선택할 수 있습니다.</p>" +
          '<div class="node-stat">현재 HP <strong>' + run.hp + " / " + run.maxHp + "</strong></div>" +
          '<button data-action="rest-heal">HP 회복 선택 · ' + actualHeal + " 회복</button>" +
        "</section>" +
        renderBondBar(run) +
        renderBondWorkshop(run, "rest") +
      "</div>" +
    "</main>"
  );
}

function renderShopItem(app, item, index) {
  const card = getCard(item.cardId);
  const affordable = app.run.gold >= item.price;
  const disabled = item.sold || !affordable;
  const stateText = item.sold
    ? "판매 완료"
    : item.price + "G";

  return (
    '<div class="shop-item">' +
      '<div class="' + cardClass(card) + '">' +
        '<div class="card__header">' +
          '<span class="card__cost">' + card.cost + "</span>" +
          '<span class="card__rarity">' + card.rarity + "</span>" +
        "</div>" +
        '<strong class="card__name">' + card.name + "</strong>" +
        '<span class="card__type">' + card.type + "</span>" +
        "<p>" + card.description + "</p>" +
        renderTags(card) +
      "</div>" +
      '<button data-action="buy-shop-card" data-item-index="' + index + '"' +
        (disabled ? " disabled" : "") + ">" + stateText + "</button>" +
    "</div>"
  );
}

function renderShopMagicBook(app) {
  const item = app.shop.magicBookItem;

  if (!item || !item.bookId) {
    return "";
  }

  const book = getMagicBook(item.bookId);
  const affordable = app.run.gold >= item.price;
  const disabled = item.sold || !affordable;
  const stateText = item.sold ? "판매 완료" : item.price + "G";

  return (
    '<div class="shop-item shop-item--magic-book">' +
      '<div class="magic-book-card">' +
        '<span class="eyebrow">MAGIC BOOK #' + book.number + "</span>" +
        "<strong>" + book.name + "</strong>" +
        "<p>" + book.description + "</p>" +
      "</div>" +
      '<button data-action="buy-shop-magic-book"' +
        (disabled ? " disabled" : "") + ">" +
        stateText +
      "</button>" +
    "</div>"
  );
}


function renderShopPotion(app, item, index) {
  const potion = getPotion(item.potionId);
  const full = app.run.potions.length >= MAX_POTIONS;
  const duplicate = app.run.potions.includes(item.potionId);
  const affordable = app.run.gold >= item.price;
  const disabled = item.sold || full || duplicate || !affordable;

  let stateText = item.price + "G";
  if (item.sold) {
    stateText = "판매 완료";
  } else if (duplicate) {
    stateText = "보유 중";
  } else if (full) {
    stateText = "슬롯 가득 참";
  }

  return (
    '<div class="shop-item shop-item--potion">' +
      '<div class="shop-potion-card">' +
        '<span class="eyebrow">POTION</span>' +
        "<strong>" + potion.name + "</strong>" +
        "<p>" + potion.description + "</p>" +
      "</div>" +
      '<button data-action="buy-shop-potion" data-item-index="' + index + '"' +
        (disabled ? " disabled" : "") + ">" +
        stateText +
      "</button>" +
    "</div>"
  );
}

function renderCardRemovalService(app) {
  const service = app.shop.cardRemoval;
  if (!service) {
    return "";
  }

  const affordable = app.run.gold >= service.price;
  const globallyDisabled =
    service.used ||
    app.run.deck.length <= 1 ||
    !affordable;

  const serviceState = service.used
    ? "이 상점에서 사용 완료"
    : service.price + "G · 카드 1장 제거";

  return (
    '<section class="panel card-removal-panel">' +
      '<div class="card-removal-heading">' +
        '<div><span class="eyebrow">DECK SERVICE</span><h2>카드 제거</h2></div>' +
        "<strong>" + serviceState + "</strong>" +
      "</div>" +
      "<p>현재 덱에서 카드 1장을 영구 제거합니다. 한 상점에서 1회만 사용할 수 있습니다.</p>" +
      '<div class="deck-removal-list">' +
        app.run.deck.map(function removalCard(cardId, index) {
          const card = getCard(cardId);
          return (
            '<button data-action="remove-shop-card" data-deck-index="' + index + '"' +
              (globallyDisabled ? " disabled" : "") + ">" +
              "<strong>" + card.name + "</strong>" +
              '<span>' + card.cost + "코스트 · " + card.type + "</span>" +
            "</button>"
          );
        }).join("") +
      "</div>" +
    "</section>"
  );
}

function renderShopBondMaterials(app) {
  const items = app.shop.bondMaterialItems || [];

  return (
    '<section class="panel bond-material-shop">' +
      '<div><span class="eyebrow">BOND MATERIALS</span><h2>결속 재료</h2></div>' +
      '<div class="bond-material-shop__items">' +
        items.map(function materialOffer(item, index) {
          const disabled = item.sold || app.run.gold < item.price;
          return (
            '<button data-action="buy-shop-bond-material" data-item-index="' + index + '"' +
              (disabled ? " disabled" : "") + ">" +
              "<strong>" + BOND_MATERIAL_LABELS[item.material] + " +" + item.amount + "</strong>" +
              "<span>" + (item.sold ? "판매 완료" : item.price + "G") + "</span>" +
            "</button>"
          );
        }).join("") +
      "</div>" +
    "</section>"
  );
}

function renderShop(app) {
  return (
    '<main class="game-shell special-screen">' +
      '<header class="special-header panel">' +
        '<div><span class="eyebrow">SHOP</span><h1>떠돌이 상점</h1></div>' +
        '<strong>' + app.run.gold + "G</strong>" +
      "</header>" +
      renderNotice(app) +
      '<section class="shop-grid">' +
        app.shop.items.map(function itemHtml(item, index) {
          return renderShopItem(app, item, index);
        }).join("") +
        renderShopMagicBook(app) +
        app.shop.potionItems.map(function potionHtml(item, index) {
          return renderShopPotion(app, item, index);
        }).join("") +
      "</section>" +
      renderCardRemovalService(app) +
      renderBondBar(app.run) +
      renderShopBondMaterials(app) +
      renderBondWorkshop(app.run, "shop") +
      '<button class="secondary-button special-leave" data-action="leave-shop">상점 나가기</button>' +
    "</main>"
  );
}

function renderEvent(app) {
  const event = app.event;

  return (
    '<main class="center-screen">' +
      '<section class="panel node-panel event-panel">' +
        '<p class="eyebrow">EVENT</p>' +
        "<h1>" + event.title + "</h1>" +
        "<p>" + event.description + "</p>" +
        '<div class="event-choices">' +
          event.choices.map(function choiceHtml(choice) {
            const enabled = canChooseEventOption(
              app.run,
              event,
              choice.id
            );

            return (
              '<button data-action="choose-event" data-choice-id="' + choice.id + '"' +
                (enabled ? "" : " disabled") + ">" +
                "<strong>" + choice.label + "</strong>" +
                "<span>" + choice.detail + "</span>" +
              "</button>"
            );
          }).join("") +
        "</div>" +
        renderNotice(app) +
      "</section>" +
    "</main>"
  );
}

function renderDefeat(app) {
  return (
    '<main class="center-screen">' +
      '<section class="panel result-panel">' +
        '<p class="eyebrow">RUN END</p>' +
        "<h1>런 종료</h1>" +
        "<p>" + app.run.victories + "승 후 쓰러졌습니다.</p>" +
        '<button data-action="new-run">새 런 시작</button>' +
      "</section>" +
    "</main>"
  );
}

function renderFieldClear(app) {
  return (
    '<main class="center-screen">' +
      '<section class="panel result-panel">' +
        '<p class="eyebrow">FIELD CLEAR</p>' +
        "<h1>마수군단 클리어</h1>" +
        "<p>마수군단장 발탄을 쓰러뜨렸습니다. +" + app.lastGoldReward + "G · 총 " + app.run.gold + "G</p>" +
        (app.lastMagicBookDrop
          ? "<p><strong>마법서 드랍 · " + app.lastMagicBookDrop.name + "</strong></p>"
          : "") +
        "<p>현재 Vertical Slice의 마지막입니다.</p>" +
        '<button data-action="new-run">새 런 시작</button>' +
      "</section>" +
    "</main>"
  );
}

export function render(root, app) {
  if (app.mode === "map") {
    root.innerHTML = renderMap(app);
    return;
  }

  if (app.mode === "reward") {
    root.innerHTML = renderReward(app);
    return;
  }

  if (app.mode === "potion-reward") {
    root.innerHTML = renderPotionReward(app);
    return;
  }

  if (app.mode === "rest") {
    root.innerHTML = renderRest(app);
    return;
  }

  if (app.mode === "shop") {
    root.innerHTML = renderShop(app);
    return;
  }

  if (app.mode === "event") {
    root.innerHTML = renderEvent(app);
    return;
  }

  if (app.mode === "bond-select") {
    root.innerHTML = renderBondSelect(app);
    return;
  }

  if (app.mode === "defeat") {
    root.innerHTML = renderDefeat(app);
    return;
  }

  if (app.mode === "field-clear") {
    root.innerHTML = renderFieldClear(app);
    return;
  }

  root.innerHTML = renderBattle(app);
}
