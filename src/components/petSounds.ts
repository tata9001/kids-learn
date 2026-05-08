export type KittenSoundKind = "pet" | "feed" | "play" | "dress" | "undress" | "speak";

export interface KittenSoundPattern {
  type: OscillatorType;
  frequencies: number[];
  duration: number;
  volume: number;
}

const SOUND_PATTERNS: Record<KittenSoundKind, KittenSoundPattern> = {
  pet: { type: "sine", frequencies: [520, 780, 430], duration: 0.34, volume: 0.18 },
  feed: { type: "triangle", frequencies: [420, 540, 680, 520], duration: 0.42, volume: 0.16 },
  play: { type: "square", frequencies: [620, 840, 700, 920, 560], duration: 0.5, volume: 0.1 },
  dress: { type: "sine", frequencies: [500, 660, 880, 990], duration: 0.46, volume: 0.14 },
  undress: { type: "triangle", frequencies: [620, 500, 390], duration: 0.36, volume: 0.12 },
  speak: { type: "sine", frequencies: [470, 610, 760, 640, 820], duration: 0.56, volume: 0.13 }
};

export function getKittenSoundPattern(kind: KittenSoundKind): KittenSoundPattern {
  return SOUND_PATTERNS[kind];
}

type WindowWithAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function playKittenSound(kind: KittenSoundKind): void {
  const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!AudioCtor) return;

  const pattern = getKittenSoundPattern(kind);
  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const step = pattern.duration / Math.max(pattern.frequencies.length - 1, 1);

  oscillator.type = pattern.type;
  pattern.frequencies.forEach((frequency, index) => {
    const time = context.currentTime + step * index;
    if (index === 0) {
      oscillator.frequency.setValueAtTime(frequency, time);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(frequency, time);
    }
  });

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(pattern.volume, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + pattern.duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + pattern.duration + 0.03);
}
