import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  DEFAULT_KEYMAP,
  DEFAULT_SETTINGS,
  PALETTE_SWATCHES,
  PREVIEW_COUNT
} from "./game/constants";
import {
  advanceTime,
  createInitialState,
  getPreviewMatrix,
  getRenderBoard,
  hardDrop,
  holdActive,
  moveHorizontal,
  restartGame,
  rotateActive,
  softDrop,
  startGame,
  togglePause
} from "./game/engine";
import { AudioManager } from "./game/audio";
import {
  loadProfile,
  markTutorialDismissed,
  recordRun,
  saveProfile
} from "./game/storage";
import type {
  EngineResult,
  GameEvent,
  InputAction,
  Keymap,
  PieceType,
  RunResult,
  UserSettings
} from "./game/types";

const ACTION_LABELS: Record<InputAction, string> = {
  start: "Start",
  left: "Move left",
  right: "Move right",
  soft_drop: "Soft drop",
  hard_drop: "Hard drop",
  rotate_cw: "Rotate CW",
  rotate_ccw: "Rotate CCW",
  hold: "Hold",
  pause: "Pause",
  restart: "Restart"
};

const TUTORIAL_STEPS = [
  "Build full horizontal lines to clear them and raise your level every 10 lines.",
  "Use hold once per active piece. The hold slot resets after a lock.",
  "Ghost projection shows the landing spot. Hard drop scores 2 per row. Soft drop scores 1.",
  "Desktop uses keyboard remapping. Mobile uses touch clusters with three layout presets."
];

const EVENT_COPY: Partial<Record<GameEvent, string>> = {
  start: "Run started",
  line_clear: "Line cleared",
  level_up: "Level up",
  hold: "Piece held",
  pause: "Game paused",
  resume: "Game resumed",
  game_over: "Run finished"
};

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  Space: "Space",
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  Enter: "Enter",
  Escape: "Esc",
  KeyZ: "Z",
  KeyX: "X",
  KeyC: "C",
  KeyP: "P",
  KeyR: "R"
};

const SETTINGS_SECTIONS = [
  {
    title: "Sound",
    actions: ["sfxEnabled", "musicEnabled"] as const
  },
  {
    title: "Display",
    actions: ["reducedMotion", "highContrast"] as const
  }
];

const actionOrder: InputAction[] = [
  "start",
  "left",
  "right",
  "soft_drop",
  "hard_drop",
  "rotate_cw",
  "rotate_ccw",
  "hold",
  "pause",
  "restart"
];

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));

const getKeyLabel = (code: string) => KEY_LABELS[code] ?? code.replace(/^Key/, "");

const toneMessage = (events: GameEvent[]) => {
  const prioritized = [...events].reverse().find((event) => EVENT_COPY[event]);
  return prioritized ? EVENT_COPY[prioritized] ?? "" : "";
};

const swapKeymap = (current: Keymap, target: InputAction, nextCode: string) => {
  const existingAction = actionOrder.find(
    (action) => action !== target && current[action] === nextCode
  );
  const nextKeymap: Keymap = {
    ...current
  };

  if (existingAction) {
    nextKeymap[existingAction] = current[target];
  }

  nextKeymap[target] = nextCode;
  return nextKeymap;
};

const getPalette = (settings: UserSettings) => PALETTE_SWATCHES[settings.colorPalette];

const buildRunResult = (score: number, linesCleared: number, levelReached: number, durationMs: number): RunResult => ({
  score,
  linesCleared,
  levelReached,
  durationMs,
  playedAt: new Date().toISOString()
});

type PreviewProps = {
  type: PieceType | null;
  settings: UserSettings;
  label: string;
};

function MiniPreview({ type, settings, label }: PreviewProps) {
  const matrix = getPreviewMatrix(type);
  const palette = getPalette(settings);

  return (
    <div className="preview-block" aria-label={label}>
      {matrix.map((row, rowIndex) => (
        <div className="mini-grid-row" key={`${label}-${rowIndex}`}>
          {row.map((cell, cellIndex) => (
            <span
              className={`mini-grid-cell${cell ? " is-filled" : ""}`}
              key={`${label}-${rowIndex}-${cellIndex}`}
              style={
                cell
                  ? ({
                      "--cell-color": palette[cell]
                    } as CSSProperties)
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type ControlButtonProps = {
  action: InputAction;
  label: string;
  secondary?: string;
  dispatch: (action: InputAction) => void;
  repeat?: boolean;
};

function ControlButton({
  action,
  label,
  secondary,
  dispatch,
  repeat = false
}: ControlButtonProps) {
  const intervalRef = useRef<number | null>(null);

  const clearRepeater = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dispatch(action);
    if (!repeat) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    clearRepeater();
    intervalRef.current = window.setInterval(() => dispatch(action), 90);
  };

  return (
    <button
      className={`control-button control-${action}`}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={clearRepeater}
      onPointerLeave={clearRepeater}
      onPointerCancel={clearRepeater}
    >
      <span>{label}</span>
      {secondary ? <small>{secondary}</small> : null}
    </button>
  );
}

type BoardProps = {
  settings: UserSettings;
  board: ReturnType<typeof getRenderBoard>;
};

function Playfield({ settings, board }: BoardProps) {
  const palette = getPalette(settings);

  return (
    <div className="playfield-grid" role="grid" aria-label="Tetris board">
      {board.map((row, rowIndex) =>
        row.map((cell, cellIndex) => {
          const className = [
            "playfield-cell",
            cell.type ? "is-filled" : "",
            cell.ghost ? "is-ghost" : "",
            cell.active ? "is-active" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <span
              aria-hidden="true"
              className={className}
              key={`${rowIndex}-${cellIndex}`}
              style={
                cell.type
                  ? ({
                      "--cell-color": palette[cell.type]
                    } as CSSProperties)
                  : undefined
              }
            />
          );
        })
      )}
    </div>
  );
}

export function App() {
  const initialProfile = loadProfile();
  const [profile, setProfile] = useState(initialProfile);
  const [game, setGame] = useState(() => createInitialState());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(!initialProfile.tutorialDismissed);
  const [rebinding, setRebinding] = useState<InputAction | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const gameRef = useRef(game);
  const profileRef = useRef(profile);
  const audioRef = useRef<AudioManager | null>(null);
  const recordedRunRef = useRef<number | null>(null);

  if (!audioRef.current) {
    audioRef.current = new AudioManager();
  }

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    audioRef.current?.sync({
      musicEnabled: profile.settings.musicEnabled,
      sfxEnabled: profile.settings.sfxEnabled
    });
  }, [profile.settings.musicEnabled, profile.settings.sfxEnabled]);

  useEffect(() => {
    document.documentElement.dataset.palette = profile.settings.colorPalette;
    document.documentElement.dataset.contrast = profile.settings.highContrast
      ? "high"
      : "default";
    document.documentElement.dataset.motion = profile.settings.reducedMotion
      ? "reduced"
      : "full";
  }, [
    profile.settings.colorPalette,
    profile.settings.highContrast,
    profile.settings.reducedMotion
  ]);

  useEffect(() => {
    return () => audioRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (game.status !== "game_over" || game.startTimestamp === null) {
      return;
    }

    if (recordedRunRef.current === game.startTimestamp) {
      return;
    }

    recordedRunRef.current = game.startTimestamp;
    const nextProfile = recordRun(
      buildRunResult(game.score, game.lines, game.level, game.elapsedMs)
    );
    setProfile(nextProfile);
  }, [game.elapsedMs, game.level, game.lines, game.score, game.startTimestamp, game.status]);

  const commitProfile = (nextSettings: UserSettings) => {
    const nextProfile = {
      ...profileRef.current,
      settings: nextSettings
    };
    profileRef.current = nextProfile;
    saveProfile(nextProfile);
    setProfile(nextProfile);
  };

  const applyResult = (result: EngineResult) => {
    if (result.events.length > 0) {
      audioRef.current?.trigger(result.events);
      const message = toneMessage(result.events);
      if (message) {
        setLiveMessage(message);
      }
    }

    gameRef.current = result.state;
    setGame(result.state);
  };

  const dispatchAction = (action: InputAction) => {
    audioRef.current?.resume();
    const current = gameRef.current;
    const now = performance.now();

    let result: EngineResult = {
      state: current,
      events: []
    };

    switch (action) {
      case "start":
        result =
          current.status === "idle" || current.status === "game_over"
            ? startGame(now)
            : current.status === "paused"
              ? togglePause(current, now)
              : result;
        break;
      case "left":
        result = moveHorizontal(current, -1);
        break;
      case "right":
        result = moveHorizontal(current, 1);
        break;
      case "soft_drop":
        result = softDrop(current);
        break;
      case "hard_drop":
        result = hardDrop(current);
        break;
      case "rotate_cw":
        result = rotateActive(current, 1);
        break;
      case "rotate_ccw":
        result = rotateActive(current, -1);
        break;
      case "hold":
        result = holdActive(current);
        break;
      case "pause":
        result = togglePause(current, now);
        break;
      case "restart":
        recordedRunRef.current = null;
        result = restartGame(now);
        break;
      default:
        break;
    }

    applyResult(result);
  };

  const handleTick = useEffectEvent((time: number) => {
    const result = advanceTime(gameRef.current, time);
    if (
      result.state !== gameRef.current ||
      result.events.length > 0
    ) {
      applyResult(result);
    }
  });

  useEffect(() => {
    if (game.status !== "playing") {
      return;
    }

    let frameId = 0;
    const loop = (time: number) => {
      handleTick(time);
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [game.status, handleTick]);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (rebinding) {
      event.preventDefault();
      const nextKeymap = swapKeymap(
        profileRef.current.settings.keymap,
        rebinding,
        event.code
      );
      commitProfile({
        ...profileRef.current.settings,
        keymap: nextKeymap
      });
      setRebinding(null);
      return;
    }

    const mappedAction = actionOrder.find(
      (action) => profileRef.current.settings.keymap[action] === event.code
    );

    if (!mappedAction) {
      return;
    }

    event.preventDefault();
    dispatchAction(mappedAction);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKeyDown]);

  const renderBoard = getRenderBoard(game);
  const queuePreview = game.queue.slice(0, PREVIEW_COUNT);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    commitProfile({
      ...profile.settings,
      [key]: value
    });
  };

  const dismissTutorial = () => {
    const nextProfile = markTutorialDismissed();
    setProfile(nextProfile);
    setTutorialOpen(false);
  };

  const overlayMode =
    game.status === "idle"
      ? "start"
      : game.status === "paused"
        ? "paused"
        : game.status === "game_over"
          ? "game_over"
          : null;

  const primaryAction =
    game.status === "playing"
      ? { label: "Pause run", action: "pause" as const }
      : game.status === "paused"
        ? { label: "Resume run", action: "pause" as const }
        : game.status === "game_over"
          ? { label: "Run again", action: "restart" as const }
          : { label: "Start run", action: "start" as const };

  return (
    <main
      className="app-shell"
      data-contrast={profile.settings.highContrast ? "high" : "default"}
      data-motion={profile.settings.reducedMotion ? "reduced" : "full"}
    >
      <div className="noise-layer" />
      <header className="masthead">
        <p className="eyebrow">Single-player browser Tetris</p>
        <div>
          <h1>Stackhouse</h1>
          <p>
            Modern guideline play, tactile touch controls, and local records in a
            sharp arcade poster shell.
          </p>
        </div>
        <div className="masthead-actions">
          <button className="solid-button" type="button" onClick={() => dispatchAction(primaryAction.action)}>
            {primaryAction.label}
          </button>
          <button className="ghost-button" type="button" onClick={() => setTutorialOpen(true)}>
            How to play
          </button>
          <button className="ghost-button" type="button" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? "Close settings" : "Settings"}
          </button>
        </div>
      </header>

      <section className="hero-grid">
        <aside className="hero-copy">
          <div className="hero-copy-block">
            <span className="section-kicker">Arcade brief</span>
            <p>
              Clear lines, keep the stack breathing, and chase a longer run without
              relying on servers or accounts.
            </p>
          </div>
          <div className="hero-copy-block">
            <span className="section-kicker">Control surface</span>
            <p>
              Keyboard remap on desktop, touch clusters on mobile, and motion or
              contrast adjustments for different play contexts.
            </p>
          </div>
          <div className="hero-copy-block">
            <span className="section-kicker">Run state</span>
            <ul className="plain-list">
              <li>Mode: Marathon</li>
              <li>Queue: 7-bag with 5-piece preview</li>
              <li>Rules: Hold, ghost, SRS rotation</li>
            </ul>
          </div>
        </aside>

        <section className="board-stage" aria-labelledby="board-title">
          <div className="board-frame">
            <div className="board-side board-side-left">
              <div className="side-panel">
                <span className="section-kicker">Hold</span>
                <MiniPreview
                  type={game.hold}
                  settings={profile.settings}
                  label="Held piece"
                />
              </div>
              <div className="side-panel scoreboard-panel">
                <span className="section-kicker">Telemetry</span>
                <div className="metric-line">
                  <strong>{game.score}</strong>
                  <span>Score</span>
                </div>
                <div className="metric-line">
                  <strong>{game.level}</strong>
                  <span>Level</span>
                </div>
                <div className="metric-line">
                  <strong>{game.lines}</strong>
                  <span>Lines</span>
                </div>
                <div className="metric-line">
                  <strong>{formatDuration(game.elapsedMs)}</strong>
                  <span>Time</span>
                </div>
              </div>
            </div>

            <div className="board-column">
              <div className="board-title-row">
                <span className={`status-pill status-${game.status}`}>{game.status.replace("_", " ")}</span>
                <h2 id="board-title">Playfield</h2>
                <span className="ghost-label">Ghost + hold ready {game.canHold ? "yes" : "no"}</span>
              </div>
              <div className="board-surface">
                <Playfield settings={profile.settings} board={renderBoard} />
                {overlayMode ? (
                  <div className={`board-overlay overlay-${overlayMode}`}>
                    {overlayMode === "start" ? (
                      <>
                        <p className="overlay-kicker">Ready state</p>
                        <h3>Open with a clean board. Survive the ramp.</h3>
                        <p>
                          Press {getKeyLabel(profile.settings.keymap.start)} or tap play to begin.
                        </p>
                        <div className="overlay-actions">
                          <button className="solid-button" type="button" onClick={() => dispatchAction("start")}>
                            Start run
                          </button>
                          <button className="ghost-button" type="button" onClick={() => setTutorialOpen(true)}>
                            Review controls
                          </button>
                        </div>
                      </>
                    ) : null}
                    {overlayMode === "paused" ? (
                      <>
                        <p className="overlay-kicker">Paused</p>
                        <h3>Board frozen. Timing preserved.</h3>
                        <p>Resume from the same stack or start over.</p>
                        <div className="overlay-actions">
                          <button className="solid-button" type="button" onClick={() => dispatchAction("pause")}>
                            Resume
                          </button>
                          <button className="ghost-button" type="button" onClick={() => dispatchAction("restart")}>
                            Restart
                          </button>
                        </div>
                      </>
                    ) : null}
                    {overlayMode === "game_over" ? (
                      <>
                        <p className="overlay-kicker">Top out</p>
                        <h3>Best score to beat: {profile.bestScore}</h3>
                        <p>
                          Final: {game.score} points, {game.lines} lines, level {game.level}.
                        </p>
                        <div className="overlay-actions">
                          <button className="solid-button" type="button" onClick={() => dispatchAction("restart")}>
                            Run again
                          </button>
                          <button className="ghost-button" type="button" onClick={() => setSettingsOpen(true)}>
                            Tune settings
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="board-side board-side-right">
              <div className="side-panel">
                <span className="section-kicker">Queue</span>
                <div className="queue-stack">
                  {queuePreview.map((type, index) => (
                    <MiniPreview
                      key={`${type}-${index}`}
                      type={type}
                      settings={profile.settings}
                      label={`Next piece ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="side-panel">
                <span className="section-kicker">Best local</span>
                <div className="metric-line">
                  <strong>{profile.bestScore}</strong>
                  <span>Highest score</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="mobile-controls"
            data-preset={profile.settings.mobileControlPreset}
            aria-label="Touch controls"
          >
            <div className="mobile-cluster movement-cluster">
              <ControlButton action="left" label="Left" dispatch={dispatchAction} repeat />
              <ControlButton action="right" label="Right" dispatch={dispatchAction} repeat />
              <ControlButton action="soft_drop" label="Soft" secondary="+1/row" dispatch={dispatchAction} repeat />
            </div>
            <div className="mobile-cluster action-cluster">
              <ControlButton action="rotate_ccw" label="CCW" dispatch={dispatchAction} />
              <ControlButton action="rotate_cw" label="CW" dispatch={dispatchAction} />
              <ControlButton action="hard_drop" label="Drop" secondary="+2/row" dispatch={dispatchAction} />
              <ControlButton action="hold" label="Hold" dispatch={dispatchAction} />
              <ControlButton action="pause" label="Pause" dispatch={dispatchAction} />
            </div>
          </div>
        </section>

        <aside className="history-panel">
          <div className="history-header">
            <span className="section-kicker">Recent 10</span>
            <p>Stored locally on this browser only.</p>
          </div>
          <ol className="history-list">
            {profile.recentRuns.length === 0 ? (
              <li className="history-empty">No finished runs yet.</li>
            ) : (
              profile.recentRuns.map((run) => (
                <li key={`${run.playedAt}-${run.score}`}>
                  <strong>{run.score}</strong>
                  <span>{run.linesCleared} lines</span>
                  <span>L{run.levelReached}</span>
                  <span>{formatDuration(run.durationMs)}</span>
                  <time dateTime={run.playedAt}>{formatDate(run.playedAt)}</time>
                </li>
              ))
            )}
          </ol>

          <div className="shortcut-panel">
            <span className="section-kicker">Desktop keys</span>
            <ul className="plain-list">
              <li>{getKeyLabel(profile.settings.keymap.left)} / {getKeyLabel(profile.settings.keymap.right)} to move</li>
              <li>{getKeyLabel(profile.settings.keymap.rotate_ccw)} and {getKeyLabel(profile.settings.keymap.rotate_cw)} to rotate</li>
              <li>{getKeyLabel(profile.settings.keymap.hard_drop)} drop, {getKeyLabel(profile.settings.keymap.hold)} hold</li>
              <li>{getKeyLabel(profile.settings.keymap.pause)} pause, {getKeyLabel(profile.settings.keymap.restart)} restart</li>
            </ul>
          </div>
        </aside>
      </section>

      <aside
        aria-hidden={!settingsOpen}
        className={`settings-sheet${settingsOpen ? " is-open" : ""}`}
        inert={settingsOpen ? undefined : true}
      >
        <div className="settings-sheet-header">
          <div>
            <span className="section-kicker">Settings</span>
            <h2>Calibrate the cabinet</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => setSettingsOpen(false)}>
            Close
          </button>
        </div>

        <section className="settings-row-grid">
          {SETTINGS_SECTIONS.map((section) => (
            <div className="settings-block" key={section.title}>
              <span className="section-kicker">{section.title}</span>
              {section.actions.map((field) => (
                <label className="toggle-row" key={field}>
                  <span>{field === "sfxEnabled" ? "Effects" : field === "musicEnabled" ? "Music loop" : field === "reducedMotion" ? "Reduced motion" : "High contrast"}</span>
                  <button
                    aria-pressed={Boolean(profile.settings[field])}
                    className={`toggle-switch${profile.settings[field] ? " is-on" : ""}`}
                    type="button"
                    onClick={() => updateSetting(field, !profile.settings[field])}
                  >
                    <span />
                  </button>
                </label>
              ))}
            </div>
          ))}

          <div className="settings-block">
            <span className="section-kicker">Palette</span>
            <div className="choice-row">
              {(["signal", "high-contrast", "protanopia-friendly"] as const).map((palette) => (
                <button
                  className={`choice-button${profile.settings.colorPalette === palette ? " is-selected" : ""}`}
                  key={palette}
                  type="button"
                  onClick={() => updateSetting("colorPalette", palette)}
                >
                  {palette}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <span className="section-kicker">Mobile layout</span>
            <div className="choice-row">
              {(["split", "cluster", "compact"] as const).map((preset) => (
                <button
                  className={`choice-button${profile.settings.mobileControlPreset === preset ? " is-selected" : ""}`}
                  key={preset}
                  type="button"
                  onClick={() => updateSetting("mobileControlPreset", preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="keymap-section">
          <div className="keymap-header">
            <span className="section-kicker">Keyboard remap</span>
            <p>
              {rebinding
                ? `Press a key for ${ACTION_LABELS[rebinding]}.`
                : "Tap rebind, then press the replacement key."}
            </p>
          </div>
          <div className="keymap-grid">
            {actionOrder.map((action) => (
              <div className="keymap-row" key={action}>
                <span>{ACTION_LABELS[action]}</span>
                <strong>{getKeyLabel(profile.settings.keymap[action])}</strong>
                <button
                  className={`ghost-button${rebinding === action ? " is-arming" : ""}`}
                  type="button"
                  onClick={() => setRebinding((current) => (current === action ? null : action))}
                >
                  {rebinding === action ? "Listening" : "Rebind"}
                </button>
              </div>
            ))}
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() =>
              commitProfile({
                ...profile.settings,
                keymap: DEFAULT_KEYMAP
              })
            }
          >
            Reset to defaults
          </button>
        </section>
      </aside>

      {tutorialOpen ? (
        <section className="tutorial-panel" aria-labelledby="tutorial-title">
          <div className="tutorial-header">
            <span className="section-kicker">Tutorial</span>
            <h2 id="tutorial-title">Four rules before the stack starts moving</h2>
          </div>
          <ol className="tutorial-steps">
            {TUTORIAL_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="tutorial-actions">
            <button className="solid-button" type="button" onClick={dismissTutorial}>
              Dismiss tutorial
            </button>
            <button className="ghost-button" type="button" onClick={() => setTutorialOpen(false)}>
              Keep visible for this visit only
            </button>
          </div>
        </section>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
    </main>
  );
}
