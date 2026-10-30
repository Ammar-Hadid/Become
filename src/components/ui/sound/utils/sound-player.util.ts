import type {
  NavigationProfile,
  SoundOption,
  SoundShape,
  SoundTexture,
} from "../types/sound.types";

type NavigationVoice = {
  at: number;
  duration: number;
  from: number;
  to: number;
  level: number;
  attack: number;
  pan: number;
  wave: OscillatorType;
};

function envelope(
  context: AudioContext,
  output: AudioNode,
  start: number,
  duration: number,
  peak: number,
  attack: number,
) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(output);
  return gain;
}

function shapeTiming(shape: SoundShape, index: number, count: number, total: number) {
  const step = total / Math.max(count + 0.3, 1.3);
  const at = index * step;
  const duration =
    shape === "tap"
      ? Math.min(0.075, total - at)
      : shape === "pulse"
        ? Math.min(0.13, total - at)
        : shape === "fall"
          ? Math.min(0.22, total - at)
          : Math.min(0.38, total - at);
  return { at, duration: Math.max(0.045, duration) };
}

function scheduleTone(
  context: AudioContext,
  output: AudioNode,
  pitch: number,
  start: number,
  duration: number,
  shape: SoundShape,
  texture: SoundTexture,
) {
  const wave: OscillatorType =
    texture === "deep" ? "triangle" : texture === "metal" ? "sine" : "sine";
  const base = context.createOscillator();
  base.type = wave;
  const entry =
    shape === "rise" || shape === "glide"
      ? pitch * 0.8
      : shape === "fall"
        ? pitch * 1.12
        : pitch;
  const exit = shape === "fall" ? pitch * 0.86 : pitch;
  base.frequency.setValueAtTime(entry, start);
  base.frequency.exponentialRampToValueAtTime(exit, start + duration * 0.8);
  const attack = shape === "tap" ? 0.004 : texture === "air" ? 0.028 : 0.012;
  const level = texture === "deep" ? 0.14 : texture === "metal" ? 0.09 : 0.11;
  const mainGain = envelope(context, output, start, duration, level, attack);
  base.connect(mainGain);
  base.start(start);
  base.stop(start + duration + 0.005);
  base.onended = () => {
    base.disconnect();
    mainGain.disconnect();
  };

  const overtone = context.createOscillator();
  overtone.type = texture === "warm" || texture === "deep" ? "sine" : "triangle";
  const ratio =
    texture === "metal"
      ? 2.37
      : texture === "air"
        ? 1.51
        : texture === "deep"
          ? 0.5
          : 2;
  overtone.frequency.setValueAtTime(entry * ratio, start);
  overtone.frequency.exponentialRampToValueAtTime(
    exit * ratio,
    start + duration * 0.8,
  );
  const overtoneGain = envelope(
    context,
    output,
    start,
    duration,
    level * (texture === "metal" ? 0.28 : 0.17),
    attack,
  );
  overtone.connect(overtoneGain);
  overtone.start(start);
  overtone.stop(start + duration + 0.005);
  overtone.onended = () => {
    overtone.disconnect();
    overtoneGain.disconnect();
  };
}

function scheduleAir(
  context: AudioContext,
  output: AudioNode,
  start: number,
  texture: SoundTexture,
) {
  if (texture !== "air" && texture !== "metal") return;
  const duration = texture === "air" ? 0.11 : 0.045;
  const sampleCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = texture === "air" ? 2100 : 3200;
  filter.Q.value = 0.8;
  const gain = envelope(
    context,
    output,
    start,
    duration,
    texture === "air" ? 0.022 : 0.015,
    0.006,
  );
  source.connect(filter);
  filter.connect(gain);
  source.start(start);
  source.stop(start + duration);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function scheduleNavigationVoice(
  context: AudioContext,
  output: AudioNode,
  start: number,
  voice: NavigationVoice,
) {
  const oscillator = context.createOscillator();
  oscillator.type = voice.wave;
  oscillator.frequency.setValueAtTime(voice.from, start + voice.at);
  oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + voice.at + voice.duration);

  const panner = context.createStereoPanner();
  panner.pan.value = voice.pan;
  panner.connect(output);
  const gain = envelope(
    context,
    panner,
    start + voice.at,
    voice.duration,
    voice.level,
    voice.attack,
  );
  oscillator.connect(gain);
  oscillator.start(start + voice.at);
  oscillator.stop(start + voice.at + voice.duration + 0.005);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
    panner.disconnect();
  };
}

function navigationVoices(profile: NavigationProfile, [low, high]: number[]): NavigationVoice[] {
  switch (profile) {
    case "threshold":
      return [
        { at: 0, duration: 0.38, from: low * 0.7, to: low * 1.25, level: 0.12, attack: 0.11, pan: -0.18, wave: "triangle" },
        { at: 0.29, duration: 0.14, from: high * 0.92, to: high, level: 0.055, attack: 0.012, pan: 0.18, wave: "sine" },
      ];
    case "aperture":
      return [
        { at: 0, duration: 0.33, from: low * 0.84, to: low * 1.05, level: 0.1, attack: 0.06, pan: -0.12, wave: "sine" },
        { at: 0.09, duration: 0.28, from: high * 0.86, to: high * 1.08, level: 0.075, attack: 0.045, pan: 0.12, wave: "sine" },
      ];
    case "slipstream":
      return [
        { at: 0, duration: 0.42, from: low * 0.72, to: high * 0.96, level: 0.095, attack: 0.09, pan: -0.75, wave: "sine" },
        { at: 0.09, duration: 0.31, from: high * 0.67, to: high, level: 0.052, attack: 0.08, pan: 0.68, wave: "triangle" },
      ];
    case "soft-dock":
      return [
        { at: 0, duration: 0.17, from: low * 1.1, to: low * 0.83, level: 0.12, attack: 0.008, pan: 0, wave: "triangle" },
        { at: 0.16, duration: 0.14, from: high * 1.04, to: high, level: 0.085, attack: 0.006, pan: 0, wave: "sine" },
      ];
    case "phase-lock":
      return [
        { at: 0, duration: 0.13, from: low, to: low * 1.04, level: 0.08, attack: 0.012, pan: -0.38, wave: "sine" },
        { at: 0.11, duration: 0.13, from: high, to: high * 0.97, level: 0.08, attack: 0.012, pan: 0.38, wave: "sine" },
        { at: 0.24, duration: 0.13, from: low * 1.25, to: low * 1.22, level: 0.06, attack: 0.02, pan: 0, wave: "triangle" },
      ];
    case "horizon":
      return [
        { at: 0, duration: 0.54, from: low * 0.8, to: low * 1.3, level: 0.18, attack: 0.17, pan: 0, wave: "triangle" },
        { at: 0.11, duration: 0.37, from: high * 0.79, to: high, level: 0.048, attack: 0.14, pan: 0, wave: "sine" },
      ];
    case "relay":
      return [
        { at: 0, duration: 0.11, from: low, to: low, level: 0.07, attack: 0.006, pan: -0.34, wave: "sine" },
        { at: 0.12, duration: 0.11, from: high * 0.91, to: high * 0.91, level: 0.07, attack: 0.006, pan: 0, wave: "sine" },
        { at: 0.24, duration: 0.14, from: high, to: high, level: 0.065, attack: 0.008, pan: 0.34, wave: "sine" },
      ];
    case "gravity":
      return [
        { at: 0, duration: 0.34, from: low * 1.24, to: high * 0.87, level: 0.09, attack: 0.04, pan: 0.2, wave: "sine" },
        { at: 0.29, duration: 0.13, from: high, to: high * 0.91, level: 0.12, attack: 0.007, pan: 0, wave: "triangle" },
      ];
  }
}

/** Render an approved cue through Web Audio after the caller authorizes playback. */
export function playSoundPreview(
  context: AudioContext,
  option: SoundOption,
  volume: number,
) {
  const start = context.currentTime + 0.012;
  const total = option.durationMs / 1000;
  const output = context.createGain();
  output.gain.setValueAtTime(Math.max(0, Math.min(volume, 1)) * 0.6, start);
  output.connect(context.destination);

  if (option.navigationProfile) {
    navigationVoices(option.navigationProfile, option.notes).forEach((voice) => {
      scheduleNavigationVoice(context, output, start, voice);
    });
    if (option.navigationProfile === "threshold" || option.navigationProfile === "slipstream") {
      scheduleAir(context, output, start, "air");
    }
  } else {
    option.notes.forEach((pitch, index) => {
      const timing = shapeTiming(option.shape, index, option.notes.length, total);
      scheduleTone(
        context,
        output,
        pitch,
        start + timing.at,
        timing.duration,
        option.shape,
        option.texture,
      );
      if (index === 0) {
        scheduleAir(context, output, start + timing.at, option.texture);
      }
    });
  }

  window.setTimeout(() => output.disconnect(), option.durationMs + 250);
  return () => {
    const now = context.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setTargetAtTime(0, now, 0.012);
  };
}
