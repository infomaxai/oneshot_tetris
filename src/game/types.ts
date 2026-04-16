export const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"] as const;

export type PieceType = (typeof PIECE_TYPES)[number];
export type RotationIndex = 0 | 1 | 2 | 3;
export type CellValue = PieceType | null;

export type Point = {
  x: number;
  y: number;
};

export type ActivePiece = {
  type: PieceType;
  rotation: RotationIndex;
  x: number;
  y: number;
};

export type GameStatus = "idle" | "playing" | "paused" | "game_over";

export type InputAction =
  | "left"
  | "right"
  | "soft_drop"
  | "hard_drop"
  | "rotate_cw"
  | "rotate_ccw"
  | "hold"
  | "pause"
  | "restart"
  | "start";

export type ControlPreset = "split" | "cluster" | "compact";
export type ColorPalette = "signal" | "high-contrast" | "protanopia-friendly";

export type Keymap = Record<InputAction, string>;

export type UserSettings = {
  keymap: Keymap;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorPalette: ColorPalette;
  mobileControlPreset: ControlPreset;
};

export type RunResult = {
  score: number;
  linesCleared: number;
  levelReached: number;
  durationMs: number;
  playedAt: string;
};

export type StoredProfileV1 = {
  version: 1;
  bestScore: number;
  recentRuns: RunResult[];
  settings: UserSettings;
  tutorialDismissed: boolean;
};

export type GameEvent =
  | "start"
  | "move"
  | "rotate"
  | "hold"
  | "drop"
  | "lock"
  | "line_clear"
  | "level_up"
  | "pause"
  | "resume"
  | "game_over";

export type EngineResult = {
  state: GameState;
  events: GameEvent[];
};

export type GameState = {
  status: GameStatus;
  board: CellValue[][];
  active: ActivePiece | null;
  queue: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  startTimestamp: number | null;
  elapsedMs: number;
  gravityBufferMs: number;
  lastTickAt: number | null;
};

export type RenderCell = {
  type: PieceType | null;
  ghost: boolean;
  active: boolean;
};
