import { drawCards } from "./deck.js";

function addLog(battle, message) {
  battle.log.unshift(message);
  battle.log = battle.log.slice(0, 12);
}

function dealDamageToEnemy(battle, rawDamage) {
  const vulnerable = battle.turn <= battle.enemy.vulnerableUntilTurn;
  const modifiedDamage = vulnerable ? Math.ceil(rawDamage * 1.5) : rawDamage;
  const absorbed = Math.min(battle.enemy.block, modifiedDamage);
  const hpDamage = modifiedDamage - absorbed;

  battle.enemy.block -= absorbed;
  battle.enemy.hp = Math.max(0, battle.enemy.hp - hpDamage);

  const suffix = vulnerable ? " (무력화 취약 +50%)" : "";
  addLog(battle, `적에게 ${modifiedDamage} 피해${suffix}`);
}

function applyStagger(battle, value) {
  if (battle.enemy.stagger <= 0) {
    return;
  }

  battle.enemy.stagger = Math.max(0, battle.enemy.stagger - value);
  addLog(battle, `무력화 ${value} 감소`);

  if (battle.enemy.stagger === 0) {
    battle.enemy.skipNextAction = true;
    battle.enemy.vulnerableUntilTurn = battle.turn + 1;
    addLog(battle, "무력화 성공! 다음 적 행동이 취소되고 잠시 취약해집니다.");
  }
}

export function resolveCardEffects(battle, card) {
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage":
        dealDamageToEnemy(battle, effect.value);
        break;
      case "block":
        battle.playerBlock += effect.value;
        addLog(battle, `실드 ${effect.value} 획득`);
        break;
      case "stagger":
        applyStagger(battle, effect.value);
        break;
      case "draw":
        drawCards(battle, effect.value);
        addLog(battle, `카드 ${effect.value}장 드로우`);
        break;
      case "energy":
        battle.energy += effect.value;
        addLog(battle, `행동력 ${effect.value} 회복`);
        break;
      default:
        throw new Error(`Unsupported effect type: ${effect.type}`);
    }
  }
}
