import { describe, expect, it } from "vitest";
import { createEmptyBoard, hardDrop, holdActive, rotateActive, startGame } from "./engine";
import type { GameState } from "./types";

const zeroRandom = () => 0;

describe("engine", () => {
  it("uses a 7-bag sequence for the opening spread", () => {
    const { state } = startGame(0, zeroRandom);
    const openingSet = new Set([state.active?.type, ...state.queue.slice(0, 6)]);

    expect(openingSet.size).toBe(7);
  });

  it("allows hold only once until the piece locks", () => {
    const { state } = startGame(0, zeroRandom);
    const firstHold = holdActive(state, zeroRandom);
    const secondHold = holdActive(firstHold.state, zeroRandom);

    expect(firstHold.state.canHold).toBe(false);
    expect(secondHold.state).toEqual(firstHold.state);
  });

  it("awards drop bonus and line clear score", () => {
    const board = createEmptyBoard();

    for (let column = 0; column < 6; column += 1) {
      board[19][column] = "T";
    }

    const state: GameState = {
      status: "playing",
      board,
      active: {
        type: "I",
        rotation: 0,
        x: 6,
        y: 0
      },
      queue: ["O", "T", "S", "Z", "J", "L", "I"],
      hold: null,
      canHold: true,
      score: 0,
      lines: 0,
      level: 1,
      startTimestamp: 0,
      elapsedMs: 0,
      gravityBufferMs: 0,
      lastTickAt: 0
    };

    const result = hardDrop(state, zeroRandom);

    expect(result.state.lines).toBe(1);
    expect(result.state.score).toBe(136);
  });

  it("levels up after every ten cleared lines", () => {
    const board = createEmptyBoard();

    for (let column = 0; column < 6; column += 1) {
      board[19][column] = "T";
    }

    const state: GameState = {
      status: "playing",
      board,
      active: {
        type: "I",
        rotation: 0,
        x: 6,
        y: 0
      },
      queue: ["O", "T", "S", "Z", "J", "L", "I"],
      hold: null,
      canHold: true,
      score: 0,
      lines: 9,
      level: 1,
      startTimestamp: 0,
      elapsedMs: 0,
      gravityBufferMs: 0,
      lastTickAt: 0
    };

    const result = hardDrop(state, zeroRandom);

    expect(result.state.level).toBe(2);
    expect(result.events).toContain("level_up");
  });

  it("applies wall kicks for a rotation near the boundary", () => {
    const { state } = startGame(0, zeroRandom);
    const nearWall: GameState = {
      ...state,
      active: {
        type: "T",
        rotation: 0,
        x: -1,
        y: 0
      }
    };

    const result = rotateActive(nearWall, 1);

    expect(result.state.active?.rotation).toBe(1);
    expect(result.events).toContain("rotate");
  });
});
