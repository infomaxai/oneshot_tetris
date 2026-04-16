import type { GameEvent } from "./types";

type AudioState = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
};

export class AudioManager {
  private context: AudioContext | null = null;
  private musicTimer: number | null = null;
  private noteIndex = 0;
  private state: AudioState = {
    musicEnabled: true,
    sfxEnabled: true
  };

  private melody = [220, 293.66, 329.63, 246.94, 392, 329.63, 293.66, 196];

  private ensureContext() {
    if (typeof window === "undefined") {
      return null;
    }

    if (!this.context) {
      this.context = new window.AudioContext();
    }

    return this.context;
  }

  resume() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }
  }

  setEffectsEnabled(enabled: boolean) {
    this.state.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.state.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType
  ) {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  private startMusic() {
    const context = this.ensureContext();
    if (!context || this.musicTimer !== null) {
      return;
    }

    const schedule = () => {
      if (!this.state.musicEnabled) {
        return;
      }

      const note = this.melody[this.noteIndex % this.melody.length];
      this.playTone(note, 0.42, 0.025, "triangle");
      this.noteIndex += 1;
    };

    schedule();
    this.musicTimer = window.setInterval(schedule, 440);
  }

  private stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  sync(state: AudioState) {
    this.state = state;
    if (state.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  trigger(events: GameEvent[]) {
    if (!this.state.sfxEnabled || events.length === 0) {
      return;
    }

    const latest = events[events.length - 1];
    switch (latest) {
      case "move":
        this.playTone(330, 0.05, 0.03, "square");
        break;
      case "rotate":
        this.playTone(440, 0.07, 0.03, "square");
        break;
      case "hold":
        this.playTone(523.25, 0.08, 0.03, "triangle");
        break;
      case "drop":
        this.playTone(180, 0.08, 0.04, "sawtooth");
        break;
      case "line_clear":
        this.playTone(659.25, 0.14, 0.04, "triangle");
        break;
      case "level_up":
        this.playTone(880, 0.16, 0.05, "triangle");
        break;
      case "pause":
        this.playTone(220, 0.06, 0.03, "square");
        break;
      case "resume":
      case "start":
        this.playTone(392, 0.08, 0.03, "triangle");
        break;
      case "game_over":
        this.playTone(110, 0.25, 0.05, "sawtooth");
        break;
      default:
        break;
    }
  }

  destroy() {
    this.stopMusic();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
