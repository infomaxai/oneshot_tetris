import {
  BASE_LINE_CLEAR_POINTS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GRAVITY_BY_LEVEL,
  MAX_VISIBLE_GRAVITY_LEVEL
} from "./constants";
import type {
  ActivePiece,
  CellValue,
  EngineResult,
  GameState,
  PieceType,
  Point,
  RenderCell,
  RotationIndex
} from "./types";

type RandomSource = () => number;

const EMPTY_ROW = () => Array<CellValue>(BOARD_WIDTH).fill(null);

const JLSTZ_KICKS: Record<string, Point[]> = {
  "0>1": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 }
  ],
  "1>0": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 }
  ],
  "1>2": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 }
  ],
  "2>1": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 }
  ],
  "2>3": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 }
  ],
  "3>2": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 }
  ],
  "3>0": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 }
  ],
  "0>3": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 }
  ]
};

const I_KICKS: Record<string, Point[]> = {
  "0>1": [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 }
  ],
  "1>0": [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 }
  ],
  "1>2": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 }
  ],
  "2>1": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 }
  ],
  "2>3": [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 }
  ],
  "3>2": [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 }
  ],
  "3>0": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 }
  ],
  "0>3": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 }
  ]
};

const SHAPES: Record<PieceType, Point[][]> = {
  I: [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 }
    ],
    [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 }
    ],
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 }
    ]
  ],
  O: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ]
  ],
  T: [
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  ],
  S: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  ],
  Z: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 }
    ]
  ],
  J: [
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ]
  ],
  L: [
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 }
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  ]
};

export const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => EMPTY_ROW());

const shuffleBag = (random: RandomSource): PieceType[] => {
  const bag: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }

  return bag;
};

const ensureQueue = (queue: PieceType[], random: RandomSource) => {
  const nextQueue = [...queue];

  while (nextQueue.length < 7) {
    nextQueue.push(...shuffleBag(random));
  }

  return nextQueue;
};

const takeFromQueue = (queue: PieceType[], random: RandomSource) => {
  const nextQueue = ensureQueue(queue, random);
  const [type, ...rest] = nextQueue;
  return {
    type,
    queue: ensureQueue(rest, random)
  };
};

export const getSpawnPiece = (type: PieceType): ActivePiece => ({
  type,
  rotation: 0,
  x: type === "O" ? 3 : 3,
  y: -1
});

export const getCells = (piece: ActivePiece) =>
  SHAPES[piece.type][piece.rotation].map((point) => ({
    x: piece.x + point.x,
    y: piece.y + point.y
  }));

export const collides = (board: CellValue[][], piece: ActivePiece) =>
  getCells(piece).some(({ x, y }) => {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return true;
    }

    if (y < 0) {
      return false;
    }

    return board[y][x] !== null;
  });

const withActive = (piece: ActivePiece, delta: Partial<ActivePiece>): ActivePiece => ({
  ...piece,
  ...delta
});

const lockPiece = (board: CellValue[][], piece: ActivePiece) => {
  const nextBoard = board.map((row) => [...row]);
  let overflow = false;

  for (const cell of getCells(piece)) {
    if (cell.y < 0) {
      overflow = true;
      continue;
    }

    nextBoard[cell.y][cell.x] = piece.type;
  }

  return { board: nextBoard, overflow };
};

const clearLines = (board: CellValue[][]) => {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_HEIGHT - remaining.length;

  while (remaining.length < BOARD_HEIGHT) {
    remaining.unshift(EMPTY_ROW());
  }

  return {
    board: remaining,
    cleared
  };
};

const gravityForLevel = (level: number) =>
  GRAVITY_BY_LEVEL[Math.min(level, MAX_VISIBLE_GRAVITY_LEVEL)] ??
  GRAVITY_BY_LEVEL[MAX_VISIBLE_GRAVITY_LEVEL];

const getKickTests = (piece: ActivePiece, nextRotation: RotationIndex) => {
  if (piece.type === "O") {
    return [{ x: 0, y: 0 }];
  }

  const key = `${piece.rotation}>${nextRotation}`;
  return piece.type === "I" ? I_KICKS[key] : JLSTZ_KICKS[key];
};

const spawnNextPiece = (
  board: CellValue[][],
  queue: PieceType[],
  random: RandomSource
) => {
  const { type, queue: nextQueue } = takeFromQueue(queue, random);
  const active = getSpawnPiece(type);
  return {
    active,
    queue: nextQueue,
    blocked: collides(board, active)
  };
};

const finalizeLock = (state: GameState, random: RandomSource): EngineResult => {
  if (!state.active) {
    return { state, events: [] };
  }

  const locked = lockPiece(state.board, state.active);
  const cleared = clearLines(locked.board);
  const linePoints = BASE_LINE_CLEAR_POINTS[cleared.cleared] ?? 0;
  const nextLines = state.lines + cleared.cleared;
  const nextLevel = Math.floor(nextLines / 10) + 1;
  const nextScore = state.score + linePoints * state.level;
  const spawn = spawnNextPiece(cleared.board, state.queue, random);
  const gameOver = locked.overflow || spawn.blocked;
  const events = ["lock"] as EngineResult["events"];

  if (cleared.cleared > 0) {
    events.push("line_clear");
  }

  if (nextLevel > state.level) {
    events.push("level_up");
  }

  if (gameOver) {
    events.push("game_over");
  }

  return {
    state: {
      ...state,
      board: cleared.board,
      active: gameOver ? null : spawn.active,
      queue: spawn.queue,
      canHold: true,
      score: nextScore,
      lines: nextLines,
      level: nextLevel,
      status: gameOver ? "game_over" : state.status
    },
    events
  };
};

export const createInitialState = (random: RandomSource = Math.random): GameState => {
  const firstQueue = ensureQueue([], random);
  const firstDraw = takeFromQueue(firstQueue, random);
  const active = getSpawnPiece(firstDraw.type);

  return {
    status: "idle",
    board: createEmptyBoard(),
    active,
    queue: firstDraw.queue,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    startTimestamp: null,
    elapsedMs: 0,
    gravityBufferMs: 0,
    lastTickAt: null
  };
};

export const startGame = (
  now: number,
  random: RandomSource = Math.random
): EngineResult => {
  const state = createInitialState(random);

  return {
    state: {
      ...state,
      status: "playing",
      startTimestamp: now,
      elapsedMs: 0,
      gravityBufferMs: 0,
      lastTickAt: now
    },
    events: ["start"]
  };
};

export const restartGame = startGame;

export const togglePause = (state: GameState, now: number): EngineResult => {
  if (state.status === "idle") {
    return startGame(now);
  }

  if (state.status === "game_over") {
    return { state, events: [] };
  }

  if (state.status === "paused") {
    return {
      state: {
        ...state,
        status: "playing",
        lastTickAt: now
      },
      events: ["resume"]
    };
  }

  return {
    state: {
      ...state,
      status: "paused"
    },
    events: ["pause"]
  };
};

export const moveHorizontal = (
  state: GameState,
  direction: -1 | 1
): EngineResult => {
  if (state.status !== "playing" || !state.active) {
    return { state, events: [] };
  }

  const candidate = withActive(state.active, { x: state.active.x + direction });
  if (collides(state.board, candidate)) {
    return { state, events: [] };
  }

  return {
    state: {
      ...state,
      active: candidate
    },
    events: ["move"]
  };
};

export const rotateActive = (
  state: GameState,
  direction: 1 | -1
): EngineResult => {
  if (state.status !== "playing" || !state.active) {
    return { state, events: [] };
  }

  const nextRotation = (((state.active.rotation + direction) % 4) + 4) % 4 as RotationIndex;
  const tests = getKickTests(state.active, nextRotation);

  for (const test of tests) {
    const candidate = withActive(state.active, {
      rotation: nextRotation,
      x: state.active.x + test.x,
      y: state.active.y + test.y
    });

    if (!collides(state.board, candidate)) {
      return {
        state: {
          ...state,
          active: candidate
        },
        events: ["rotate"]
      };
    }
  }

  return { state, events: [] };
};

export const getGhostPiece = (state: GameState) => {
  if (!state.active) {
    return null;
  }

  let ghost = state.active;

  while (!collides(state.board, withActive(ghost, { y: ghost.y + 1 }))) {
    ghost = withActive(ghost, { y: ghost.y + 1 });
  }

  return ghost;
};

const applyLock = (
  state: GameState,
  nextActive: ActivePiece,
  random: RandomSource,
  dropBonus: number
): EngineResult => {
  const advanced = {
    ...state,
    active: nextActive,
    score: state.score + dropBonus
  };

  return finalizeLock(advanced, random);
};

const advancePieceDown = (
  state: GameState,
  random: RandomSource,
  scoreBonus: number
): EngineResult => {
  if (state.status !== "playing" || !state.active) {
    return { state, events: [] };
  }

  const candidate = withActive(state.active, { y: state.active.y + 1 });
  if (!collides(state.board, candidate)) {
    return {
      state: {
        ...state,
        active: candidate,
        score: state.score + scoreBonus
      },
      events: scoreBonus > 0 ? ["drop"] : []
    };
  }

  return applyLock(state, state.active, random, 0);
};

export const softDrop = (
  state: GameState,
  random: RandomSource = Math.random
): EngineResult => {
  return advancePieceDown(state, random, 1);
};

export const hardDrop = (
  state: GameState,
  random: RandomSource = Math.random
): EngineResult => {
  if (state.status !== "playing" || !state.active) {
    return { state, events: [] };
  }

  let candidate = state.active;
  let distance = 0;

  while (!collides(state.board, withActive(candidate, { y: candidate.y + 1 }))) {
    candidate = withActive(candidate, { y: candidate.y + 1 });
    distance += 1;
  }

  const result = applyLock(state, candidate, random, distance * 2);
  return {
    state: result.state,
    events: ["drop", ...result.events]
  };
};

export const holdActive = (
  state: GameState,
  random: RandomSource = Math.random
): EngineResult => {
  if (
    state.status !== "playing" ||
    !state.active ||
    !state.canHold
  ) {
    return { state, events: [] };
  }

  if (state.hold) {
    const swapped = getSpawnPiece(state.hold);
    if (collides(state.board, swapped)) {
      return { state, events: [] };
    }

    return {
      state: {
        ...state,
        active: swapped,
        hold: state.active.type,
        canHold: false
      },
      events: ["hold"]
    };
  }

  const spawn = spawnNextPiece(state.board, state.queue, random);
  if (spawn.blocked) {
    return {
      state: {
        ...state,
        status: "game_over",
        active: null,
        hold: state.active.type,
        canHold: false,
        queue: spawn.queue
      },
      events: ["hold", "game_over"]
    };
  }

  return {
    state: {
      ...state,
      active: spawn.active,
      queue: spawn.queue,
      hold: state.active.type,
      canHold: false
    },
    events: ["hold"]
  };
};

export const advanceTime = (
  state: GameState,
  now: number,
  random: RandomSource = Math.random
): EngineResult => {
  if (state.status !== "playing" || !state.active) {
    if (state.status === "paused" || state.status === "game_over") {
      return {
        state: {
          ...state,
          elapsedMs: state.elapsedMs
        },
        events: []
      };
    }

    return { state, events: [] };
  }

  const previousTick = state.lastTickAt ?? now;
  const delta = Math.max(0, now - previousTick);
  let current = {
    ...state,
    elapsedMs: state.elapsedMs + delta,
    gravityBufferMs: state.gravityBufferMs + delta,
    lastTickAt: now
  };
  const events: EngineResult["events"] = [];

  while (current.status === "playing") {
    const interval = 1000 / gravityForLevel(current.level);
    if (current.gravityBufferMs < interval) {
      break;
    }

    const step = advancePieceDown(current, random, 0);
    current = {
      ...step.state,
      gravityBufferMs: current.gravityBufferMs - interval,
      lastTickAt: now
    };
    events.push(...step.events);
  }

  return {
    state: current,
    events
  };
};

export const getRenderBoard = (state: GameState): RenderCell[][] => {
  const renderBoard = state.board.map((row) =>
    row.map((type) => ({
      type,
      ghost: false,
      active: false
    }))
  );
  const ghost = getGhostPiece(state);

  if (ghost) {
    for (const cell of getCells(ghost)) {
      if (cell.y >= 0) {
        renderBoard[cell.y][cell.x] = {
          type: ghost.type,
          ghost: true,
          active: false
        };
      }
    }
  }

  if (state.active) {
    for (const cell of getCells(state.active)) {
      if (cell.y >= 0) {
        renderBoard[cell.y][cell.x] = {
          type: state.active.type,
          ghost: false,
          active: true
        };
      }
    }
  }

  return renderBoard;
};

export const getPreviewMatrix = (type: PieceType | null) => {
  const matrix = Array.from({ length: 4 }, () => Array<PieceType | null>(4).fill(null));

  if (!type) {
    return matrix;
  }

  for (const cell of SHAPES[type][0]) {
    matrix[cell.y][cell.x] = type;
  }

  return matrix;
};
