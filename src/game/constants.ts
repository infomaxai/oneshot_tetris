import type { Keymap, PieceType, UserSettings } from "./types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const PREVIEW_COUNT = 5;

export const GRAVITY_BY_LEVEL: Record<number, number> = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5,
  5: 3.5,
  6: 5,
  7: 7,
  8: 9,
  9: 12
};

export const MAX_VISIBLE_GRAVITY_LEVEL = 10;

export const BASE_LINE_CLEAR_POINTS: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800
};

export const DEFAULT_KEYMAP: Keymap = {
  start: "Enter",
  left: "ArrowLeft",
  right: "ArrowRight",
  soft_drop: "ArrowDown",
  hard_drop: "Space",
  rotate_cw: "ArrowUp",
  rotate_ccw: "KeyZ",
  hold: "ShiftLeft",
  pause: "KeyP",
  restart: "KeyR"
};

export const DEFAULT_SETTINGS: UserSettings = {
  keymap: DEFAULT_KEYMAP,
  sfxEnabled: true,
  musicEnabled: true,
  reducedMotion: false,
  highContrast: false,
  colorPalette: "signal",
  mobileControlPreset: "split"
};

export const PALETTE_SWATCHES: Record<
  UserSettings["colorPalette"],
  Record<PieceType, string>
> = {
  signal: {
    I: "var(--piece-i)",
    O: "var(--piece-o)",
    T: "var(--piece-t)",
    S: "var(--piece-s)",
    Z: "var(--piece-z)",
    J: "var(--piece-j)",
    L: "var(--piece-l)"
  },
  "high-contrast": {
    I: "var(--piece-i-contrast)",
    O: "var(--piece-o-contrast)",
    T: "var(--piece-t-contrast)",
    S: "var(--piece-s-contrast)",
    Z: "var(--piece-z-contrast)",
    J: "var(--piece-j-contrast)",
    L: "var(--piece-l-contrast)"
  },
  "protanopia-friendly": {
    I: "var(--piece-i-colorblind)",
    O: "var(--piece-o-colorblind)",
    T: "var(--piece-t-colorblind)",
    S: "var(--piece-s-colorblind)",
    Z: "var(--piece-z-colorblind)",
    J: "var(--piece-j-colorblind)",
    L: "var(--piece-l-colorblind)"
  }
};

export const STORAGE_KEY = "stackhouse.profile.v1";
