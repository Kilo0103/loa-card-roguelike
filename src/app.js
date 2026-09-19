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
  createEvent,
  createShop,
  resolveEventChoice,
  restAtNode,
} from "./game/nodes.js";
import {
  addCardToDeck,
  advanceRun,
  createCardRewards,
  createRun,
} from "./game/run.js";
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
    app.shop = createShop();
    render(root, app);
    return;
  }

  if (node.type === "event") {
    app.mode = "event";
    app.event = createEvent();
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

function openRewards(goldReward) {
  completeBattleNode();
  app.mode = "reward";
  app.rewards = createCardRewards();
  app.lastGoldReward = goldReward;
  render(root, app);
}

function finishBattleAction() {
  if (app.battle.status === "victory") {
    const goldReward = awardBattleGold(app.run, app.battle.mapNodeType);

    if (app.battle.isFinalBoss) {
      completeBattleNode();
      app.lastGoldReward = goldReward;
      app.mode = "field-clear";
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

function newRun() {
  app.run = createRun();
  app.battle = null;
  app.rewards = [];
  app.shop = null;
  app.event = null;
  app.notice = "";
  app.lastGoldReward = 0;
  app.mode = "map";
  render(root, app);
}

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
    openMap("카드를 덱에 추가했습니다.");
    return;
  }

  if (action === "skip-reward") {
    openMap("카드 보상을 건너뛰었습니다.");
    return;
  }

  if (action === "rest-heal") {
    const healed = restAtNode(app.run);
    completeSpecialNode("휴식으로 HP를 " + healed + " 회복했습니다.");
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
