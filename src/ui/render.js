import { getCard } from "../data/cards.js";
import { getMagicBook } from "../data/magicBooks.js";
import {
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
  const disabled = card.unplayable || cost > battle.energy;
  const costText = card.unplayable ? "—" : String(cost);

  return (
    '<button class="' + cardClass(card) + '" data-action="play-card" data-index="' + index + '"' +
    ' data-drag-card-index="' + index + '"' +
    ' data-card-target="' + card.target + '"' +
    (disabled ? ' draggable="false" disabled' : ' draggable="true"') + ">" +
      '<div class="card__header">' +
        '<span class="card__cost">' + costText + "</span>" +
        '<span class="card__rarity">' + card.rarity + "</span>" +
      "</div>" +
      '<strong class="card__name">' + card.name + "</strong>" +
      '<span class="card__type">' + card.type + "</span>" +
      "<p>" + card.description + "</p>" +
      renderTags(card) +
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
  const chargeText = battle.charge
    ? '<div class="charge-banner">차징 중 · ' +
        battle.charge.card.name + " " +
        battle.charge.stage + " / " +
        battle.charge.card.charge.stages.length +
        "단계 · 같은 카드는 추가 기본 코스트 0</div>"
    : "";

  return (
    '<main class="game-shell">' +
      '<header class="topbar panel">' +
        '<div><span class="label">HP</span><strong>' +
          run.hp + " / " + run.maxHp + "</strong></div>" +
        '<div><span class="label">보호막</span><strong>' +
          battle.playerBlock + "</strong></div>" +
        '<div><span class="label">코스트</span><strong>' +
          battle.energy + " / " + getPlayerMaxEnergy(run) + "</strong></div>" +
        '<div><span class="label">골드</span><strong>' +
          run.gold + "G</strong></div>" +
        '<div><span class="label">덱</span><strong>' +
          run.deck.length + "장</strong></div>" +
      "</header>" +

      renderMagicBookBar(run) +
      renderPlayerDebuffs(battle) +
      renderPotionInventory(run, battle) +
      chargeText +

      '<section class="player-drop-zone panel" data-drop-self>' +
        '<div><span class="eyebrow">WARLORD</span><strong>플레이어</strong></div>' +
        '<div><span>HP ' + run.hp + " / " + run.maxHp + "</span>" +
        '<span>보호막 ' + battle.playerBlock + "</span></div>" +
        '<small>자기 대상 카드를 여기로 드롭</small>' +
      "</section>" +

      '<section class="battlefield panel">' +
        '<div class="battlefield__heading">' +
          '<div><span class="eyebrow">BEAST LEGION</span><h1>마수군단</h1></div>' +
          "<p>카드를 클릭하거나 원하는 적에게 드래그해서 사용하세요.</p>" +
        "</div>" +
        '<div class="enemy-grid">' +
          battle.enemies.map(function enemyHtml(enemy, index) {
            return renderEnemy(battle, enemy, index);
          }).join("") +
        "</div>" +
      "</section>" +

      '<section class="combat-info">' +
        '<div class="pile panel"><span>드로우</span><strong>' +
          battle.drawPile.length + "</strong></div>" +
        '<div class="pile panel"><span>버림</span><strong>' +
          battle.discardPile.length + "</strong></div>" +
        '<button class="end-turn" data-action="end-turn">턴 종료</button>' +
      "</section>" +

      '<section class="hand" aria-label="손패">' +
        battle.hand.map(function cardHtml(cardId, index) {
          return renderCard(battle, cardId, index);
        }).join("") +
      "</section>" +

      '<section class="battle-log panel">' +
        "<h2>전투 로그</h2>" +
        "<div>" +
          battle.log.map(function logHtml(entry) {
            return "<p>" + entry + "</p>";
          }).join("") +
        "</div>" +
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
        "<p>직업 1장, 공통 1장, 랜덤 1장. 한 장을 선택하거나 건너뜁니다.</p>" +
        '<div class="reward-grid">' +
          app.rewards.map(function rewardHtml(cardId, index) {
            return renderRewardCard(cardId, labels[index] || "보상");
          }).join("") +
        "</div>" +
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
    '<main class="center-screen">' +
      '<section class="panel node-panel">' +
        '<p class="eyebrow">REST</p>' +
        "<h1>야영지</h1>" +
        "<p>잠시 쉬며 체력을 회복할 수 있습니다.</p>" +
        '<div class="node-stat">현재 HP <strong>' + run.hp + " / " + run.maxHp + "</strong></div>" +
        '<button data-action="rest-heal">휴식하기 · HP ' + actualHeal + " 회복</button>" +
      "</section>" +
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
      "</section>" +
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
