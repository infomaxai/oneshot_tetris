import { DEFAULT_SETTINGS, STORAGE_KEY } from "./constants";
import type { RunResult, StoredProfileV1, UserSettings } from "./types";

const memoryStorage = new Map<string, string>();

const getStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      }
    };
  }

  return window.localStorage;
};

export const createDefaultProfile = (): StoredProfileV1 => ({
  version: 1,
  bestScore: 0,
  recentRuns: [],
  settings: DEFAULT_SETTINGS,
  tutorialDismissed: false
});

export const loadProfile = (): StoredProfileV1 => {
  const storage = getStorage();
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return createDefaultProfile();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredProfileV1>;
    return {
      ...createDefaultProfile(),
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        keymap: {
          ...DEFAULT_SETTINGS.keymap,
          ...parsed.settings?.keymap
        }
      },
      recentRuns: Array.isArray(parsed.recentRuns)
        ? parsed.recentRuns.slice(0, 10)
        : []
    };
  } catch {
    return createDefaultProfile();
  }
};

export const saveProfile = (profile: StoredProfileV1) => {
  const storage = getStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const updateSettings = (settings: Partial<UserSettings>) => {
  const profile = loadProfile();
  const nextProfile = {
    ...profile,
    settings: {
      ...profile.settings,
      ...settings,
      keymap: {
        ...profile.settings.keymap,
        ...settings.keymap
      }
    }
  };

  saveProfile(nextProfile);
  return nextProfile;
};

export const markTutorialDismissed = () => {
  const profile = loadProfile();
  const nextProfile = {
    ...profile,
    tutorialDismissed: true
  };

  saveProfile(nextProfile);
  return nextProfile;
};

export const recordRun = (result: RunResult) => {
  const profile = loadProfile();
  const nextProfile = {
    ...profile,
    bestScore: Math.max(profile.bestScore, result.score),
    recentRuns: [result, ...profile.recentRuns].slice(0, 10)
  };

  saveProfile(nextProfile);
  return nextProfile;
};
