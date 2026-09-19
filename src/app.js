import {
  createBattle,
  endTurn,
  playCard,
  selectEnemy,
} from "./game/battle.js";
import {
  addCardToDeck,
  advanceRun,
  createCardRewards,
  createRun,
} from "./game/run.js";
import { render } from "./ui/render.js";

const root = document.querySelector("#app");

const app = {
  mode: "battle",
  run: createRun(),
  battle: null,
  rewards: [],
};

function startBattle() {
  app.mode = "battle";
  app.battle = createBattle(app.run);
  app.rewards = [];
  render(root, app);
}

function openRewards() {
  advanceRun(app.run);
  app.mode = "reward";
  app.rewards = createCardRewards();
  render(root, app);
}

function finishBattleAction() {
  if (app.battle.status === "victory") {
    if (app.battle.isFinalBoss) {
      advanceRun(app.run);
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
  startBattle();
}

root.addEventListener("click", function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

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
    startBattle();
    return;
  }

  if (action === "skip-reward") {
    startBattle();
    return;
  }

  if (action === "new-run") {
    newRun();
  }
});

startBattle();
