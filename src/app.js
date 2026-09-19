import {
  createBattle,
  endTurn,
  playCard,
  selectEnemy,
} from "./game/battle.js";
import {
  completeCurrentMapNode,
  getCurrentMapNode,
  selectMapNode,
} from "./game/map.js";
import {
  awardBattleGold,
  buyShopCard,
  buyShopMagicBook,
  createEvent,
  createShop,
  resolveEventChoice,
  restAtNode,
} from "./game/nodes.js";
import {
  acquireMagicBook,
  getMagicBook,
  rollMagicBookDrop,
} from "./data/magicBooks.js";
import {
  addCardToDeck,
  advanceRun,
  createCardRewards,
  createRun,
} from "./game/run.js";
import {
  addPotion,
  replacePotion,
  rollPotionDrop,
  usePotion,
} from "./game/potions.js";
import { render } from "./ui/render.js";

const root = document.querySelector("#app");

const app = {
  mode: "map",
  run: createRun(),
  battle: null,
  rewards: [],
  shop: null,
  event: null,
  notice: "",
  lastGoldReward: 0,
  lastMagicBookDrop: null,
  pendingPotionDrop: null,
  draggedHandIndex: null,
  draggedCardTarget: null,
  dragPreview: null,
  dragHandTop: 0,
};

function openMap(notice = "") {
  app.mode = "map";
  app.battle = null;
  app.rewards = [];
  app.shop = null;
  app.event = null;
  app.notice = notice;
  render(root, app);
}

function completeSpecialNode(notice) {
  completeCurrentMapNode(app.run.map);
  app.notice = notice;
  openMap(notice);
}

function enterSelectedMapNode() {
  const node = getCurrentMapNode(app.run.map);
  if (!node) {
    return;
  }

  app.notice = "";

  if (
    node.type === "normal" ||
    node.type === "elite" ||
    node.type === "midboss" ||
    node.type === "boss"
  ) {
    app.mode = "battle";
    app.battle = createBattle(app.run, node);
    app.rewards = [];
    render(root, app);
    return;
  }

  if (node.type === "rest") {
    app.mode = "rest";
    render(root, app);
    return;
  }

  if (node.type === "shop") {
    app.mode = "shop";
    app.shop = createShop(app.run);
    render(root, app);
    return;
  }

  if (node.type === "event") {
    app.mode = "event";
    app.event = createEvent(app.run);
    render(root, app);
  }
}

function selectAndEnterNode(nodeId) {
  const selected = selectMapNode(app.run.map, nodeId);
  if (!selected) {
    return;
  }

  enterSelectedMapNode();
}

function completeBattleNode() {
  completeCurrentMapNode(app.run.map);
  advanceRun(app.run);
}

function grantBossMagicBookDrop(nodeType) {
  if (nodeType !== "midboss" && nodeType !== "boss") {
    return null;
  }

  const bookId = rollMagicBookDrop(app.run);
  if (!bookId) {
    return null;
  }

  const acquired = acquireMagicBook(app.run, bookId);
  return acquired ? getMagicBook(bookId) : null;
}

function openRewards(goldReward) {
  const nodeType = app.battle.mapNodeType;
  const droppedBook = grantBossMagicBookDrop(nodeType);
  app.lastMagicBookDrop = droppedBook;

  completeBattleNode();
  app.mode = "reward";
  app.rewards = createCardRewards();
  app.lastGoldReward = goldReward;
  app.pendingPotionDrop = rollPotionDrop(app.run, nodeType);

  if (droppedBook) {
    app.notice = droppedBook.name + " 마법서 획득";
  }

  render(root, app);
}

function finishCardReward(notice) {
  if (app.pendingPotionDrop) {
    app.mode = "potion-reward";
    app.notice = notice;
    render(root, app);
    return;
  }

  openMap(notice);
}

function finishBattleAction() {
  if (app.battle.status === "victory") {
    const goldReward = awardBattleGold(app.run, app.battle.mapNodeType);

    if (app.battle.isFinalBoss) {
      const droppedBook = grantBossMagicBookDrop("boss");
      app.lastMagicBookDrop = droppedBook;
      completeBattleNode();
      app.lastGoldReward = goldReward;
      app.pendingPotionDrop = null;
      app.mode = "field-clear";
      app.notice = droppedBook
        ? droppedBook.name + " 마법서 획득"
        : "";
      render(root, app);
      return;
    }

    openRewards(goldReward);
    return;
  }

  if (app.battle.status === "defeat") {
    app.mode = "defeat";
  }

  render(root, app);
}

function removeDragPreview() {
  if (app.dragPreview) {
    app.dragPreview.remove();
    app.dragPreview = null;
  }
}

function createDragPreview(cardElement, event) {
  removeDragPreview();

  const preview = cardElement.cloneNode(true);
  preview.removeAttribute("data-action");
  preview.removeAttribute("data-index");
  preview.removeAttribute("data-drag-card-index");
  preview.removeAttribute("draggable");
  preview.disabled = false;
  preview.classList.remove("card--dragging");
  preview.classList.add("card-drag-preview");

  document.body.appendChild(preview);
  app.dragPreview = preview;

  const hand = root.querySelector(".hand");
  app.dragHandTop = hand
    ? hand.getBoundingClientRect().top
    : window.innerHeight * 0.72;

  updateDragPreview(event.clientX, event.clientY);
}

function updateDragPreview(clientX, clientY) {
  if (!app.dragPreview || !clientX || !clientY) {
    return;
  }

  const travelDistance = Math.max(280, app.dragHandTop - 100);
  const upwardDistance = Math.max(0, app.dragHandTop - clientY);
  const progress = Math.min(1, upwardDistance / travelDistance);
  const scale = 1 - progress * 0.33;

  app.dragPreview.style.left = clientX + "px";
  app.dragPreview.style.top = clientY + "px";
  app.dragPreview.style.setProperty("--drag-scale", scale.toFixed(3));
}

function clearCardDrag() {
  app.draggedHandIndex = null;
  app.draggedCardTarget = null;
  app.dragHandTop = 0;
  removeDragPreview();

  for (const element of root.querySelectorAll(".drop-target--active, .drop-target--invalid, .card--dragging")) {
    element.classList.remove("drop-target--active", "drop-target--invalid", "card--dragging");
  }
}

function playDraggedCard(enemyIndex = null) {
  if (app.draggedHandIndex === null || app.mode !== "battle") {
    return;
  }

  if (app.draggedCardTarget === "enemy") {
    if (enemyIndex === null) {
      return;
    }
    selectEnemy(app.battle, enemyIndex);
  } else if (app.draggedCardTarget !== "self") {
    return;
  }

  const handIndex = app.draggedHandIndex;
  clearCardDrag();
  playCard(app.run, app.battle, handIndex);
  finishBattleAction();
}

function newRun() {
  app.run = createRun();
  app.battle = null;
  app.rewards = [];
  app.shop = null;
  app.event = null;
  app.notice = "";
  app.lastGoldReward = 0;
  app.lastMagicBookDrop = null;
  app.pendingPotionDrop = null;
  app.draggedHandIndex = null;
  app.draggedCardTarget = null;
  app.dragPreview = null;
  app.dragHandTop = 0;
  app.mode = "map";
  render(root, app);
}

root.addEventListener("dragstart", function handleDragStart(event) {
  if (app.mode !== "battle") {
    return;
  }

  const card = event.target.closest("[data-drag-card-index]");
  if (!card || card.disabled) {
    event.preventDefault();
    return;
  }

  app.draggedHandIndex = Number(card.dataset.dragCardIndex);
  app.draggedCardTarget = card.dataset.cardTarget;
  card.classList.add("card--dragging");
  createDragPreview(card, event);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(app.draggedHandIndex));

    const transparentDragImage = document.createElement("canvas");
    transparentDragImage.width = 1;
    transparentDragImage.height = 1;
    event.dataTransfer.setDragImage(transparentDragImage, 0, 0);
  }
});

root.addEventListener("dragover", function handleDragOver(event) {
  if (app.mode !== "battle" || app.draggedHandIndex === null) {
    return;
  }

  updateDragPreview(event.clientX, event.clientY);

  const enemyTarget = event.target.closest("[data-drop-enemy-index]");
  const selfTarget = event.target.closest("[data-drop-self]");

  if (enemyTarget && app.draggedCardTarget === "enemy" && !enemyTarget.disabled) {
    event.preventDefault();
    enemyTarget.classList.add("drop-target--active");
    return;
  }

  if (selfTarget && app.draggedCardTarget === "self") {
    event.preventDefault();
    selfTarget.classList.add("drop-target--active");
  }
});

root.addEventListener("dragleave", function handleDragLeave(event) {
  const dropTarget = event.target.closest("[data-drop-enemy-index], [data-drop-self]");
  if (!dropTarget) {
    return;
  }

  const related = event.relatedTarget;
  if (related && dropTarget.contains(related)) {
    return;
  }

  dropTarget.classList.remove("drop-target--active");
});

root.addEventListener("drop", function handleDrop(event) {
  if (app.mode !== "battle" || app.draggedHandIndex === null) {
    return;
  }

  const enemyTarget = event.target.closest("[data-drop-enemy-index]");
  if (enemyTarget && app.draggedCardTarget === "enemy" && !enemyTarget.disabled) {
    event.preventDefault();
    playDraggedCard(Number(enemyTarget.dataset.dropEnemyIndex));
    return;
  }

  const selfTarget = event.target.closest("[data-drop-self]");
  if (selfTarget && app.draggedCardTarget === "self") {
    event.preventDefault();
    playDraggedCard();
  }
});

root.addEventListener("drag", function handleDrag(event) {
  updateDragPreview(event.clientX, event.clientY);
});

root.addEventListener("dragend", function handleDragEnd() {
  clearCardDrag();
});

root.addEventListener("click", function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "select-map-node") {
    selectAndEnterNode(button.dataset.nodeId);
    return;
  }

  if (action === "select-enemy") {
    selectEnemy(app.battle, Number(button.dataset.enemyIndex));
    render(root, app);
    return;
  }

  if (action === "play-card") {
    playCard(app.run, app.battle, Number(button.dataset.index));
    finishBattleAction();
    return;
  }

  if (action === "end-turn") {
    endTurn(app.run, app.battle);
    finishBattleAction();
    return;
  }

  if (action === "choose-reward") {
    addCardToDeck(app.run, button.dataset.cardId);
    finishCardReward("카드를 덱에 추가했습니다.");
    return;
  }

  if (action === "skip-reward") {
    finishCardReward("카드 보상을 건너뛰었습니다.");
    return;
  }

  if (action === "take-potion") {
    const added = addPotion(app.run, app.pendingPotionDrop);
    if (added) {
      app.pendingPotionDrop = null;
      openMap("물약을 획득했습니다.");
    }
    return;
  }

  if (action === "replace-potion") {
    const replaced = replacePotion(
      app.run,
      Number(button.dataset.inventoryIndex),
      app.pendingPotionDrop
    );

    if (replaced) {
      app.pendingPotionDrop = null;
      openMap("물약을 교체했습니다.");
    }
    return;
  }

  if (action === "decline-potion") {
    app.pendingPotionDrop = null;
    openMap("물약을 포기했습니다.");
    return;
  }

  if (action === "use-potion") {
    const result = usePotion(
      app.run,
      app.battle,
      Number(button.dataset.inventoryIndex)
    );
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "rest-heal") {
    const healed = restAtNode(app.run);
    completeSpecialNode("휴식으로 HP를 " + healed + " 회복했습니다.");
    return;
  }

  if (action === "buy-shop-magic-book") {
    const result = buyShopMagicBook(app.run, app.shop);
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "buy-shop-card") {
    const result = buyShopCard(
      app.run,
      app.shop,
      Number(button.dataset.itemIndex)
    );
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "leave-shop") {
    completeSpecialNode("상점을 떠났습니다.");
    return;
  }

  if (action === "choose-event") {
    const result = resolveEventChoice(
      app.run,
      app.event,
      button.dataset.choiceId
    );

    if (result.success) {
      completeSpecialNode(result.message);
    } else {
      app.notice = result.message;
      render(root, app);
    }
    return;
  }

  if (action === "new-run") {
    newRun();
  }
});

render(root, app);
