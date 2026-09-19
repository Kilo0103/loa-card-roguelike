const SAVE_GAME_ID = "loa-card-roguelike";
export const SAVE_VERSION = 1;

const VALID_MODES = Object.freeze([
  "map",
  "battle",
  "reward",
  "potion-reward",
  "rest",
  "shop",
  "event",
  "defeat",
  "field-clear",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSaveData(app) {
  return {
    game: SAVE_GAME_ID,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: {
      mode: app.mode,
      run: clone(app.run),
      battle: clone(app.battle),
      rewards: clone(app.rewards),
      shop: clone(app.shop),
      event: clone(app.event),
      notice: app.notice || "",
      lastGoldReward: app.lastGoldReward || 0,
      lastMagicBookDrop: clone(app.lastMagicBookDrop),
      pendingPotionDrop: app.pendingPotionDrop || null,
      rewardRerollUsed: Boolean(app.rewardRerollUsed),
    },
  };
}

export function stringifySaveData(app) {
  return JSON.stringify(createSaveData(app), null, 2);
}

export function parseSaveData(text) {
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error("JSON 형식이 올바르지 않습니다.");
  }

  if (!data || data.game !== SAVE_GAME_ID) {
    throw new Error("LOA Card Roguelike 저장 파일이 아닙니다.");
  }

  if (data.version !== SAVE_VERSION) {
    throw new Error(
      "지원하지 않는 저장 버전입니다. 현재 버전: " + SAVE_VERSION
    );
  }

  if (!data.state || !VALID_MODES.includes(data.state.mode)) {
    throw new Error("저장 파일의 화면 상태가 올바르지 않습니다.");
  }

  if (
    !data.state.run ||
    !Array.isArray(data.state.run.deck) ||
    !Array.isArray(data.state.run.potions) ||
    !Array.isArray(data.state.run.magicBooks) ||
    !data.state.run.map
  ) {
    throw new Error("저장 파일의 런 데이터가 올바르지 않습니다.");
  }

  return data;
}

export function restoreAppState(app, saveData) {
  const state = saveData.state;

  app.mode = state.mode;
  app.run = clone(state.run);
  app.battle = clone(state.battle);
  app.rewards = clone(state.rewards || []);
  app.shop = clone(state.shop);
  app.event = clone(state.event);
  app.notice = state.notice || "";
  app.lastGoldReward = state.lastGoldReward || 0;
  app.lastMagicBookDrop = clone(state.lastMagicBookDrop);
  app.pendingPotionDrop = state.pendingPotionDrop || null;
  app.rewardRerollUsed = Boolean(state.rewardRerollUsed);

  app.draggedHandIndex = null;
  app.draggedCardTarget = null;
  app.dragPreview = null;
  app.dragHandTop = 0;
}

export function createSaveFileName(savedAt = new Date()) {
  const pad = function pad(value) {
    return String(value).padStart(2, "0");
  };

  return (
    "loa-card-roguelike-save-" +
    savedAt.getFullYear() +
    pad(savedAt.getMonth() + 1) +
    pad(savedAt.getDate()) +
    "-" +
    pad(savedAt.getHours()) +
    pad(savedAt.getMinutes()) +
    pad(savedAt.getSeconds()) +
    ".json"
  );
}
