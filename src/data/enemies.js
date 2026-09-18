export const ENEMY_LIBRARY = Object.freeze({
  training_golem: {
    id: "training_golem",
    name: "수련용 골렘",
    maxHp: 48,
    maxStagger: 10,
    intents: [
      { type: "attack", value: 8, label: "공격 8" },
      { type: "guard", value: 6, label: "방어 6" },
      { type: "attack", value: 13, label: "강공격 13" },
      { type: "attack", value: 6, label: "공격 6" },
    ],
  },
});

export function createEnemy(enemyId, battleNumber = 1) {
  const template = ENEMY_LIBRARY[enemyId];
  if (!template) {
    throw new Error(`Unknown enemy: ${enemyId}`);
  }

  const hpBonus = Math.max(0, battleNumber - 1) * 6;
  const attackBonus = Math.floor(Math.max(0, battleNumber - 1) / 2);

  return {
    id: template.id,
    name: template.name,
    maxHp: template.maxHp + hpBonus,
    hp: template.maxHp + hpBonus,
    block: 0,
    maxStagger: template.maxStagger,
    stagger: template.maxStagger,
    intentIndex: 0,
    skipNextAction: false,
    vulnerableUntilTurn: 0,
    intents: template.intents.map((intent) => ({
      ...intent,
      value: intent.type === "attack" ? intent.value + attackBonus : intent.value,
      label:
        intent.type === "attack"
          ? `${intent.label.split(" ")[0]} ${intent.value + attackBonus}`
          : intent.label,
    })),
  };
}
