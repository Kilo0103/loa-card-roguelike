const MAP_COLUMNS = 4;
const MAP_ROWS = 18;

const FIXED_ROWS = Object.freeze({
  4: { type: "midboss", encounterId: "lugaru", label: "통솔자 루가루" },
  9: { type: "midboss", encounterId: "lucas", label: "파괴자 루카스" },
  14: { type: "midboss", encounterId: "black_mountain_predator", label: "검은 산의 포식자" },
  17: { type: "boss", encounterId: "valtan", label: "마수군단장 발탄" },
});

const SEGMENTS = Object.freeze([
  [0, 3],
  [5, 8],
  [10, 13],
  [15, 16],
]);

const REGULAR_TYPE_WEIGHTS = Object.freeze([
  { type: "normal", weight: 50 },
  { type: "elite", weight: 15 },
  { type: "event", weight: 15 },
  { type: "rest", weight: 10 },
  { type: "shop", weight: 10 },
]);

function createRng(seed) {
  let state = seed >>> 0;

  return function nextRandom() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
}

function shuffleWithRng(values, rng) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function weightedType(rng) {
  const total = REGULAR_TYPE_WEIGHTS.reduce(function addWeight(sum, entry) {
    return sum + entry.weight;
  }, 0);
  let roll = rng() * total;

  for (const entry of REGULAR_TYPE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.type;
    }
  }

  return "normal";
}

function createNode(row, column, type, encounterId, label) {
  return {
    id: "r" + row + "c" + column,
    row,
    column,
    type,
    encounterId: encounterId || null,
    label: label || null,
    nextIds: [],
    completed: false,
  };
}

function chooseColumns(count, rng) {
  return shuffleWithRng([0, 1, 2, 3], rng)
    .slice(0, count)
    .sort(function ascending(left, right) {
      return left - right;
    });
}

function isImmediatelyAfterCheckpoint(row) {
  return row === 5 || row === 10 || row === 15;
}

function isImmediatelyBeforeCheckpoint(row) {
  return row === 3 || row === 8 || row === 13 || row === 16;
}

function assignWeightedTypes(rows, rng) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    if (FIXED_ROWS[rowIndex]) {
      continue;
    }

    for (const node of rows[rowIndex].nodes) {
      if (rowIndex === 0) {
        node.type = "normal";
        continue;
      }

      let type = weightedType(rng);

      if (type === "elite" && isImmediatelyAfterCheckpoint(rowIndex)) {
        type = "normal";
      }

      if (type === "elite" && isImmediatelyBeforeCheckpoint(rowIndex)) {
        type = rng() < 0.5 ? "rest" : "normal";
      }

      node.type = type;
    }
  }
}

function segmentNodes(rows, startRow, endRow) {
  const nodes = [];

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    nodes.push(...rows[rowIndex].nodes);
  }

  return nodes;
}

function ensureTypeInSegment(rows, startRow, endRow, type, rng) {
  const nodes = segmentNodes(rows, startRow, endRow);
  const alreadyExists = nodes.some(function hasType(node) {
    return node.type === type;
  });

  if (alreadyExists) {
    return;
  }

  const protectedTypes = ["event", "rest", "shop"];
  const candidates = nodes.filter(function eligible(node) {
    if (node.row === 0) {
      return false;
    }

    if (type === "shop" && isImmediatelyBeforeCheckpoint(node.row)) {
      return false;
    }

    return !protectedTypes.includes(node.type) && node.type !== "elite";
  });

  const fallback = candidates.length > 0
    ? candidates
    : nodes.filter(function fallbackNode(node) {
        return node.row !== 0 && !protectedTypes.includes(node.type);
      });

  if (fallback.length === 0) {
    return;
  }

  const target = fallback[Math.floor(rng() * fallback.length)];
  target.type = type;
}

function limitEliteDensity(rows, startRow, endRow, rng) {
  let previousRowHadElite = false;

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const elites = rows[rowIndex].nodes.filter(function eliteNode(node) {
      return node.type === "elite";
    });

    if (previousRowHadElite) {
      for (const node of elites) {
        node.type = rng() < 0.5 ? "normal" : "event";
      }
      previousRowHadElite = false;
      continue;
    }

    if (elites.length > 1) {
      const keep = elites[Math.floor(rng() * elites.length)];
      for (const node of elites) {
        if (node !== keep) {
          node.type = "normal";
        }
      }
    }

    previousRowHadElite = rows[rowIndex].nodes.some(function hasElite(node) {
      return node.type === "elite";
    });
  }
}

function assignRegularTypes(rows, rng) {
  assignWeightedTypes(rows, rng);

  for (const segment of SEGMENTS) {
    const startRow = segment[0];
    const endRow = segment[1];

    limitEliteDensity(rows, startRow, endRow, rng);
    ensureTypeInSegment(rows, startRow, endRow, "event", rng);
    ensureTypeInSegment(rows, startRow, endRow, "rest", rng);
    ensureTypeInSegment(rows, startRow, endRow, "shop", rng);
  }
}

function nearestNode(nodes, column) {
  return [...nodes].sort(function byDistance(left, right) {
    const leftDistance = Math.abs(left.column - column);
    const rightDistance = Math.abs(right.column - column);

    if (leftDistance === rightDistance) {
      return left.column - right.column;
    }

    return leftDistance - rightDistance;
  })[0];
}

function connectRows(currentRow, nextRow, rng) {
  if (currentRow.nodes.length === 1) {
    currentRow.nodes[0].nextIds = nextRow.nodes.map(function nodeId(node) {
      return node.id;
    });
    return;
  }

  if (nextRow.nodes.length === 1) {
    for (const node of currentRow.nodes) {
      node.nextIds = [nextRow.nodes[0].id];
    }
    return;
  }

  for (const source of currentRow.nodes) {
    const sortedTargets = [...nextRow.nodes].sort(function byDistance(left, right) {
      const leftDistance = Math.abs(left.column - source.column);
      const rightDistance = Math.abs(right.column - source.column);

      if (leftDistance === rightDistance) {
        return left.column - right.column;
      }

      return leftDistance - rightDistance;
    });

    source.nextIds = [sortedTargets[0].id];

    if (sortedTargets.length > 1 && rng() < 0.42) {
      source.nextIds.push(sortedTargets[1].id);
    }
  }

  for (const target of nextRow.nodes) {
    const hasIncoming = currentRow.nodes.some(function sourceConnects(source) {
      return source.nextIds.includes(target.id);
    });

    if (!hasIncoming) {
      const source = nearestNode(currentRow.nodes, target.column);
      source.nextIds.push(target.id);
    }
  }

  for (const source of currentRow.nodes) {
    source.nextIds = [...new Set(source.nextIds)];
  }
}

function createRows(rng) {
  const rows = [];

  for (let rowIndex = 0; rowIndex < MAP_ROWS; rowIndex += 1) {
    const fixed = FIXED_ROWS[rowIndex];

    if (fixed) {
      const column = rowIndex === MAP_ROWS - 1 ? 2 : Math.floor(rng() * MAP_COLUMNS);
      rows.push({
        index: rowIndex,
        nodes: [
          createNode(
            rowIndex,
            column,
            fixed.type,
            fixed.encounterId,
            fixed.label
          ),
        ],
      });
      continue;
    }

    const nodeCount = rng() < 0.45 ? 4 : 3;
    const columns = chooseColumns(nodeCount, rng);

    rows.push({
      index: rowIndex,
      nodes: columns.map(function makeNode(column) {
        return createNode(rowIndex, column, "normal", null, null);
      }),
    });
  }

  assignRegularTypes(rows, rng);

  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex += 1) {
    connectRows(rows[rowIndex], rows[rowIndex + 1], rng);
  }

  return rows;
}

export function createMap(seed = randomSeed()) {
  const normalizedSeed = seed >>> 0;
  const rng = createRng(normalizedSeed);

  return {
    seed: normalizedSeed,
    rows: createRows(rng),
    currentNodeId: null,
  };
}

export function getAllMapNodes(map) {
  return map.rows.flatMap(function rowNodes(row) {
    return row.nodes;
  });
}

export function getMapNode(map, nodeId) {
  return getAllMapNodes(map).find(function sameId(node) {
    return node.id === nodeId;
  }) || null;
}

export function getCurrentMapNode(map) {
  if (!map.currentNodeId) {
    return null;
  }

  return getMapNode(map, map.currentNodeId);
}

export function getAvailableMapNodes(map) {
  const current = getCurrentMapNode(map);

  if (!current) {
    return map.rows[0].nodes;
  }

  if (!current.completed) {
    return [current];
  }

  return current.nextIds
    .map(function nextNode(nodeId) {
      return getMapNode(map, nodeId);
    })
    .filter(Boolean);
}

export function selectMapNode(map, nodeId) {
  const availableIds = getAvailableMapNodes(map).map(function availableId(node) {
    return node.id;
  });

  if (!availableIds.includes(nodeId)) {
    return false;
  }

  map.currentNodeId = nodeId;
  return true;
}

export function completeCurrentMapNode(map) {
  const current = getCurrentMapNode(map);
  if (current) {
    current.completed = true;
  }
}

export function getMapProgress(map) {
  const current = getCurrentMapNode(map);
  return current ? current.row : -1;
}
