import { getCard } from "../data/cards.js";
import { getEnemyIntent } from "../game/battle.js";

function cardClass(card) {
  return `card card--${card.type} card--${card.rarity}`;
}

function renderCard(cardId, index, disabled = false) {
  const card = getCard(cardId);
  const tags = card.tags.filter((tag) => tag !== "starter" && tag !== "reward");

  return `
    <button class="${cardClass(card)}" data-action="play-card" data-index="${index}" ${disabled ? "disabled" : ""}>
      <div class="card__header">
        <span class="card__cost">${card.cost}</span>
        <span class="card__rarity">${card.rarity}</span>
      </div>
      <strong class="card__name">${card.name}</strong>
      <span class="card__type">${card.type}</span>
      <p>${card.description}</p>
      ${tags.length > 0 ? `<div class="card__tags">${tags.map((tag) => `<span>#${tag}</span>`).join("")}</div>` : ""}
    </button>
  `;
}

function renderRewardCard(cardId) {
  const card = getCard(cardId);
  return `
    <button class="${cardClass(card)} reward-card" data-action="choose-reward" data-card-id="${cardId}">
      <div class="card__header">
        <span class="card__cost">${card.cost}</span>
        <span class="card__rarity">${card.rarity}</span>
      </div>
      <strong class="card__name">${card.name}</strong>
      <span class="card__type">${card.type}</span>
      <p>${card.description}</p>
    </button>
  `;
}

function renderBattle(app) {
  const { run, battle } = app;
  const intent = getEnemyIntent(battle);
  const hpPercent = Math.max(0, (battle.enemy.hp / battle.enemy.maxHp) * 100);
  const staggerPercent = Math.max(0, (battle.enemy.stagger / battle.enemy.maxStagger) * 100);

  return `
    <main class="game-shell">
      <header class="topbar panel">
        <div><span class="label">HP</span><strong>${run.hp} / ${run.maxHp}</strong></div>
        <div><span class="label">실드</span><strong>${battle.playerBlock}</strong></div>
        <div><span class="label">행동력</span><strong>${battle.energy} / 3</strong></div>
        <div><span class="label">전투</span><strong>#${run.battleNumber}</strong></div>
        <div><span class="label">덱</span><strong>${run.deck.length}장</strong></div>
      </header>

      <section class="battlefield panel">
        <div class="enemy-intent">
          <span>다음 행동</span>
          <strong>${intent.label}</strong>
        </div>

        <div class="enemy-portrait" aria-hidden="true">◆</div>
        <h1>${battle.enemy.name}</h1>

        <div class="meter-group">
          <div class="meter-row">
            <span>HP ${battle.enemy.hp} / ${battle.enemy.maxHp}</span>
            <div class="meter"><div class="meter__fill" style="width:${hpPercent}%"></div></div>
          </div>
          <div class="meter-row meter-row--stagger">
            <span>무력화 ${battle.enemy.stagger} / ${battle.enemy.maxStagger}</span>
            <div class="meter"><div class="meter__fill" style="width:${staggerPercent}%"></div></div>
          </div>
          <div class="enemy-block">적 실드: ${battle.enemy.block}</div>
        </div>
      </section>

      <section class="combat-info">
        <div class="pile panel"><span>드로우</span><strong>${battle.drawPile.length}</strong></div>
        <div class="pile panel"><span>버림</span><strong>${battle.discardPile.length}</strong></div>
        <button class="end-turn" data-action="end-turn">턴 종료</button>
      </section>

      <section class="hand" aria-label="손패">
        ${battle.hand.map((cardId, index) => renderCard(cardId, index, getCard(cardId).cost > battle.energy)).join("")}
      </section>

      <section class="battle-log panel">
        <h2>전투 로그</h2>
        <div>${battle.log.map((entry) => `<p>${entry}</p>`).join("")}</div>
      </section>
    </main>
  `;
}

function renderReward(app) {
  return `
    <main class="reward-screen game-shell">
      <section class="panel reward-panel">
        <p class="eyebrow">전투 승리</p>
        <h1>카드 보상</h1>
        <p>한 장을 덱에 추가하거나 보상을 건너뛸 수 있습니다.</p>
        <div class="reward-grid">
          ${app.rewards.map((cardId) => renderRewardCard(cardId)).join("")}
        </div>
        <button class="secondary-button" data-action="skip-reward">건너뛰기</button>
      </section>
    </main>
  `;
}

function renderDefeat(app) {
  return `
    <main class="center-screen">
      <section class="panel result-panel">
        <p class="eyebrow">RUN END</p>
        <h1>런 종료</h1>
        <p>${app.run.victories}승 후 쓰러졌습니다.</p>
        <button data-action="new-run">새 런 시작</button>
      </section>
    </main>
  `;
}

export function render(root, app) {
  if (app.mode === "reward") {
    root.innerHTML = renderReward(app);
    return;
  }

  if (app.mode === "defeat") {
    root.innerHTML = renderDefeat(app);
    return;
  }

  root.innerHTML = renderBattle(app);
}
