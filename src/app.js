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
};

function openMap() {
  app.mode = "map";
  app.battle = null;
  app.rewards = [];
  render(root, app);
}

function startBattle(nodeId) {
  const selected = selectMapNode(app.run.map, nodeId);
  if (!selected) {
    return;
  }

  const node = getCurrentMapNode(app.run.map);
  if (!node) {
    return;
  }

  app.mode = "battle";
  app.battle = createBattle(app.run, node);
  app.rewards = [];
  render(root, app);
}

function completeBattleNode() {
  completeCurrentMapNode(app.run.map);
  advanceRun(app.run);
}

function openRewards() {
  completeBattleNode();
  app.mode = "reward";
  app.rewards = createCardRewards();
  render(root, app);
}

function finishBattleAction() {
  if (app.battle.status === "victory") {
    if (app.battle.isFinalBoss) {
      completeBattleNode();
      app.mode = "field-clear";
      render(root, app);
      return;
    }

    openRewards();
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
    startBattle(button.dataset.nodeId);
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
    openMap();
    return;
  }

  if (action === "skip-reward") {
    openMap();
    return;
  }

  if (action === "new-run") {
    newRun();
  }
});

render(root, app);
