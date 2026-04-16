import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "./constants";
import {
  createDefaultProfile,
  loadProfile,
  markTutorialDismissed,
  recordRun,
  saveProfile
} from "./storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns a default profile when nothing is stored", () => {
    expect(loadProfile()).toEqual(createDefaultProfile());
  });

  it("persists tutorial dismissal", () => {
    saveProfile(createDefaultProfile());
    const nextProfile = markTutorialDismissed();

    expect(nextProfile.tutorialDismissed).toBe(true);
    expect(loadProfile().tutorialDismissed).toBe(true);
  });

  it("keeps only the 10 most recent runs and updates best score", () => {
    saveProfile(createDefaultProfile());

    for (let index = 0; index < 12; index += 1) {
      recordRun({
        score: index * 100,
        linesCleared: index,
        levelReached: 1 + Math.floor(index / 3),
        durationMs: index * 1000,
        playedAt: new Date(Date.UTC(2026, 3, index + 1)).toISOString()
      });
    }

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");

    expect(stored.bestScore).toBe(1100);
    expect(stored.recentRuns).toHaveLength(10);
    expect(loadProfile().recentRuns[0]?.score).toBe(1100);
  });
});
