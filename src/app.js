import {
  createBattle,
  discardContingencyCard,
  endTurn,
  escapeBattle,
  playCard,
  selectEnemy,
  selectRetainedCard,
  toggleRetainSelectionMode,
  useBond,
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
  buyShopPotion,
  buyShopBondMaterial,
  createEvent,
  createShop,
  removeShopDeckCard,
  resolveEventChoice,
  restAtNode,
} from "./game/nodes.js";
import {
  acquireMagicBook,
  getMagicBook,
  rollMagicBookDrop,
} from "./data/magicBooks.js";
import {
  awardBondBattleMaterials,
  ensureBondState,
  formatBondMaterialRewards,
  recordBondBattleVictory,
  selectBond,
  upgradeBond,
} from "./game/bond.js";
import {
  addCardToDeck,
  advanceRun,
  createCardRewards,
  createRun,
  rerollRandomReward,
} from "./game/run.js";
import {
  addPotion,
  replacePotion,
  rollPotionDrop,
  usePotion,
} from "./game/potions.js";
import {
  createSaveFileName,
  parseSaveData,
  restoreAppState,
  stringifySaveData,
} from "./game/save.js";
import { render } from "./ui/render.js";

const root = document.querySelector("#app");
const downloadSaveButton = document.querySelector("#download-save");
const loadSaveButton = document.querySelector("#load-save");
const loadSaveInput = document.querySelector("#load-save-input");

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
  rewardRerollUsed: false,
  pendingBondSelection: false,
  draggedHandIndex: null,
  draggedCardTarget: null,
  dragPreview: null,
  dragHandTop: 0,
};

function downloadCurrentSave() {
  clearCardDrag();

  const json = stringifySaveData(app);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = createSaveFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  app.notice = "현재 런을 JSON 파일로 저장했습니다.";
  render(root, app);
}

async function loadSaveFile(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const saveData = parseSaveData(text);
    clearCardDrag();
    restoreAppState(app, saveData);
    ensureBondState(app.run);
    app.notice = "저장 파일을 불러왔습니다.";
    render(root, app);
  } catch (error) {
    app.notice = "저장 파일 불러오기 실패: " + error.message;
    render(root, app);
  } finally {
    loadSaveInput.value = "";
  }
}

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
  recordBondBattleVictory(app.run);
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

function openRewards(goldReward, bondMaterialNotice) {
  const nodeType = app.battle.mapNodeType;
  const droppedBook = grantBossMagicBookDrop(nodeType);
  app.lastMagicBookDrop = droppedBook;
  app.pendingBondSelection =
    app.battle.encounterKey === "midboss:lugaru" &&
    !ensureBondState(app.run).estherId;

  completeBattleNode();
  app.mode = "reward";
  app.rewards = createCardRewards();
  app.lastGoldReward = goldReward;
  app.pendingPotionDrop = rollPotionDrop(app.run, nodeType);
  app.rewardRerollUsed = false;

  const notices = [];
  if (droppedBook) {
    notices.push(droppedBook.name + " 마법서가 드랍되어 획득되었습니다.");
  }
  if (bondMaterialNotice) {
    notices.push("결속 재료 · " + bondMaterialNotice);
  }
  app.notice = notices.join(" ");


  render(root, app);
}

function finishPostBattleRewards(notice) {
  if (app.pendingBondSelection && !ensureBondState(app.run).estherId) {
    app.mode = "bond-select";
    app.notice = notice;
    render(root, app);
    return;
  }

  openMap(notice);
}

function finishCardReward(notice) {
  if (app.pendingPotionDrop) {
    app.mode = "potion-reward";
    app.notice = notice;
    render(root, app);
    return;
  }

  finishPostBattleRewards(notice);
}

function captureBattleFeedbackState() {
  if (!app.battle) {
    return null;
  }

  return {
    playerHp: app.run.hp,
    playerBlock: app.battle.playerBlock,
    energy: app.battle.energy,
    bondReady: Boolean(app.run.bond && app.run.bond.ready),
    enemies: app.battle.enemies.map(function captureEnemy(enemy) {
      return {
        hp: enemy.hp,
        block: enemy.block,
        stagger: enemy.stagger,
        staggeredTurns: enemy.staggeredTurns,
      };
    }),
  };
}

function createFloatingCombatText(target, text, kind) {
  if (!target || !text) {
    return;
  }

  const element = document.createElement("span");
  element.className = "combat-float combat-float--" + kind;
  element.textContent = text;
  target.appendChild(element);

  window.setTimeout(function removeCombatFloat() {
    element.remove();
  }, 900);
}

function applyBattleFeedback(before, source) {
  if (!before || app.mode !== "battle" || !app.battle) {
    return;
  }

  const after = captureBattleFeedbackState();

  window.requestAnimationFrame(function animateBattleFeedback() {
    const playerHud = root.querySelector(".player-hud");

    if (playerHud) {
      const hpDelta = after.playerHp - before.playerHp;
      const blockDelta = after.playerBlock - before.playerBlock;

      if (hpDelta < 0) {
        playerHud.classList.add("combat-hit--player");
        createFloatingCombatText(playerHud, String(hpDelta), "damage");
      } else if (hpDelta > 0) {
        playerHud.classList.add("combat-heal--player");
        createFloatingCombatText(playerHud, "+" + hpDelta, "heal");
      }

      if (blockDelta > 0) {
        createFloatingCombatText(playerHud, "+" + blockDelta + " BLOCK", "block");
      }
    }

    after.enemies.forEach(function animateEnemy(enemyAfter, enemyIndex) {
      const enemyBefore = before.enemies[enemyIndex];
      if (!enemyBefore) {
        return;
      }

      const enemyElement = root.querySelector(
        '[data-enemy-index="' + enemyIndex + '"]'
      );
      if (!enemyElement) {
        return;
      }

      const hpDelta = enemyAfter.hp - enemyBefore.hp;
      const blockDelta = enemyAfter.block - enemyBefore.block;
      const staggerDelta = enemyAfter.stagger - enemyBefore.stagger;

      if (hpDelta < 0) {
        enemyElement.classList.add("combat-hit--enemy");
        createFloatingCombatText(enemyElement, String(hpDelta), "damage");
      }

      if (blockDelta < 0 && hpDelta === 0) {
        createFloatingCombatText(
          enemyElement,
          String(blockDelta) + " BLOCK",
          "block-break"
        );
      }

      if (staggerDelta < 0) {
        createFloatingCombatText(
          enemyElement,
          String(staggerDelta) + " STG",
          "stagger"
        );
      }

      if (
        enemyBefore.staggeredTurns === 0 &&
        enemyAfter.staggeredTurns > 0
      ) {
        enemyElement.classList.add("combat-stagger-burst");
        createFloatingCombatText(enemyElement, "무력화!", "stagger-break");
      }

      if (enemyBefore.hp > 0 && enemyAfter.hp <= 0) {
        enemyElement.classList.add("combat-defeated");
      }
    });

    if (source === "bond") {
      const bondButton = root.querySelector(".bond-use-button");
      const bondBar = root.querySelector(".bond-bar");
      if (bondButton) {
        bondButton.classList.add("combat-bond-burst");
      }
      if (bondBar) {
        bondBar.classList.add("combat-bond-burst");
      }
    }

    if (!before.bondReady && after.bondReady) {
      const bondBar = root.querySelector(".bond-bar");
      if (bondBar) {
        bondBar.classList.add("combat-bond-ready-burst");
      }
    }
  });
}

function finishBattleAction() {
  if (app.battle.status === "victory") {
    const goldReward = awardBattleGold(app.run, app.battle.mapNodeType);
    const bondMaterialRewards = awardBondBattleMaterials(
      app.run,
      app.battle.mapNodeType,
      app.battle.encounterKey
    );
    const bondMaterialNotice = formatBondMaterialRewards(bondMaterialRewards);

    if (app.battle.isFinalBoss) {
      const droppedBook = grantBossMagicBookDrop("boss");
      app.lastMagicBookDrop = droppedBook;
      completeBattleNode();
      app.lastGoldReward = goldReward;
      app.pendingPotionDrop = null;
      app.mode = "field-clear";
      const notices = [];
      if (droppedBook) {
        notices.push(droppedBook.name + " 마법서가 드랍되어 획득되었습니다.");
      }
      if (bondMaterialNotice) {
        notices.push("결속 재료 · " + bondMaterialNotice);
      }
      app.notice = notices.join(" ");
      render(root, app);
      return;
    }

    openRewards(goldReward, bondMaterialNotice);
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
  const before = captureBattleFeedbackState();
  clearCardDrag();
  playCard(app.run, app.battle, handIndex);
  finishBattleAction();
  applyBattleFeedback(before, "card");
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
  app.rewardRerollUsed = false;
  app.pendingBondSelection = false;
  app.draggedHandIndex = null;
  app.draggedCardTarget = null;
  app.dragPreview = null;
  app.dragHandTop = 0;
  app.mode = "map";
  render(root, app);
}

downloadSaveButton.addEventListener("click", function handleSaveDownload() {
  downloadCurrentSave();
});

loadSaveButton.addEventListener("click", function handleLoadSave() {
  loadSaveInput.click();
});

loadSaveInput.addEventListener("change", function handleSaveFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  loadSaveFile(file);
});

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
    const before = captureBattleFeedbackState();
    button.classList.add("combat-card-use");
    playCard(app.run, app.battle, Number(button.dataset.index));
    finishBattleAction();
    applyBattleFeedback(before, "card");
    return;
  }

  if (action === "discard-contingency-card") {
    discardContingencyCard(
      app.run,
      app.battle,
      Number(button.dataset.index)
    );
    render(root, app);
    return;
  }

  if (action === "toggle-retain-mode") {
    toggleRetainSelectionMode(app.run, app.battle);
    render(root, app);
    return;
  }

  if (action === "select-retain-card") {
    selectRetainedCard(
      app.run,
      app.battle,
      Number(button.dataset.index)
    );
    render(root, app);
    return;
  }

  if (action === "use-bond") {
    const before = captureBattleFeedbackState();
    const result = useBond(app.run, app.battle);
    app.notice = result.message;
    finishBattleAction();
    applyBattleFeedback(before, "bond");
    return;
  }

  if (action === "end-turn") {
    const before = captureBattleFeedbackState();
    endTurn(app.run, app.battle);
    finishBattleAction();
    applyBattleFeedback(before, "enemy-turn");
    return;
  }

  if (action === "escape-battle") {
    if (escapeBattle(app.run, app.battle)) {
      completeCurrentMapNode(app.run.map);
      openMap("탈출의 명수 — 보상을 포기하고 다음 경로로 이동합니다.");
    }
    return;
  }

  if (action === "reroll-random-reward") {
    if (!app.rewardRerollUsed) {
      app.rewards = rerollRandomReward(app.rewards);
      app.rewardRerollUsed = true;
      render(root, app);
    }
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
      finishPostBattleRewards("물약을 획득했습니다.");
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
      finishPostBattleRewards("물약을 교체했습니다.");
    }
    return;
  }

  if (action === "decline-potion") {
    app.pendingPotionDrop = null;
    finishPostBattleRewards("물약을 포기했습니다.");
    return;
  }

  if (action === "use-potion") {
    const before = captureBattleFeedbackState();
    const result = usePotion(
      app.run,
      app.battle,
      Number(button.dataset.inventoryIndex)
    );
    app.notice = result.message;
    render(root, app);
    applyBattleFeedback(before, "potion");
    return;
  }

  if (action === "rest-heal") {
    const healed = restAtNode(app.run);
    completeSpecialNode("휴식으로 HP를 " + healed + " 회복했습니다.");
    return;
  }

  if (action === "rest-upgrade-bond") {
    const result = upgradeBond(app.run, "rest");
    if (result.success) {
      completeSpecialNode(result.message);
    } else {
      app.notice = result.message;
      render(root, app);
    }
    return;
  }

  if (action === "shop-upgrade-bond") {
    const result = upgradeBond(app.run, "shop");
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "buy-shop-bond-material") {
    const result = buyShopBondMaterial(
      app.run,
      app.shop,
      Number(button.dataset.itemIndex)
    );
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "buy-shop-magic-book") {
    const result = buyShopMagicBook(app.run, app.shop);
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "buy-shop-potion") {
    const result = buyShopPotion(
      app.run,
      app.shop,
      Number(button.dataset.itemIndex)
    );
    app.notice = result.message;
    render(root, app);
    return;
  }

  if (action === "remove-shop-card") {
    const result = removeShopDeckCard(
      app.run,
      app.shop,
      Number(button.dataset.deckIndex)
    );
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

  if (action === "choose-bond") {
    const selected = selectBond(app.run, button.dataset.estherId);
    if (selected) {
      app.pendingBondSelection = false;
      finishPostBattleRewards("결속 1강을 획득했습니다.");
    }
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
