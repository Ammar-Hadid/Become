"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { allSoundOptions } from "../constants/sound-catalog.constants";
import {
  SOUND_EVENT_CUES,
  SOUND_SYSTEM_CONFIG,
  type SoundEvent,
} from "../config/sound-system.config";
import { playSoundPreview } from "../utils/sound-player.util";

type InterfaceSoundContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  play: (event: SoundEvent) => void;
};

export const InterfaceSoundContext = createContext<InterfaceSoundContextValue | null>(null);

const recipes = new Map(allSoundOptions.map((option) => [option.id, option]));

export function InterfaceSoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(SOUND_SYSTEM_CONFIG.defaultEnabled);
  const enabledRef = useRef<boolean>(enabled);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastPlayedRef = useRef({ event: "" as SoundEvent | "", at: -Infinity });

  const getContext = useCallback(() => {
    if (!contextRef.current && typeof AudioContext !== "undefined") {
      try { contextRef.current = new AudioContext(); } catch { return null; }
    }
    return contextRef.current;
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    enabledRef.current = next;
    setEnabledState(next);
    try { localStorage.setItem(SOUND_SYSTEM_CONFIG.storageKey, String(next)); } catch { /* Playback still works without storage. */ }
    if (!next) {
      stopRef.current?.();
      stopRef.current = null;
    } else {
      const context = getContext();
      if (context?.state === "suspended") void context.resume().catch(() => {});
    }
  }, [getContext]);

  useEffect(() => {
    let restore: ReturnType<typeof setTimeout> | null = null;
    try {
      const saved = localStorage.getItem(SOUND_SYSTEM_CONFIG.storageKey);
      if (saved === "true" || saved === "false") {
        restore = setTimeout(() => {
          enabledRef.current = saved === "true";
          setEnabledState(saved === "true");
        }, 0);
      }
    } catch { /* The default remains available. */ }

    const unlock = () => {
      if (!enabledRef.current) return;
      const context = getContext();
      if (context?.state === "suspended") void context.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      if (restore) clearTimeout(restore);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      stopRef.current?.();
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, [getContext]);

  const play = useCallback((event: SoundEvent) => {
    if (!enabledRef.current || document.visibilityState !== "visible") return;
    const now = performance.now();
    const previous = lastPlayedRef.current;
    const gap = event === "attentionArrived"
      ? SOUND_SYSTEM_CONFIG.attentionGapMs
      : SOUND_SYSTEM_CONFIG.minimumGapMs;
    if (previous.event === event && now - previous.at < gap) return;
    const option = recipes.get(SOUND_EVENT_CUES[event]);
    const context = getContext();
    if (!option || !context) return;

    const start = () => {
      if (!enabledRef.current || document.visibilityState !== "visible" || context.state !== "running") return;
      try {
        stopRef.current?.();
        stopRef.current = playSoundPreview(context, option, SOUND_SYSTEM_CONFIG.volume);
        lastPlayedRef.current = { event, at: performance.now() };
      } catch { /* Sound is supplemental and must never block an action. */ }
    };
    if (context.state === "running") start();
    else if (context.state === "suspended") void context.resume().then(start).catch(() => {});
  }, [getContext]);

  return (
    <InterfaceSoundContext.Provider value={{ enabled, setEnabled, play }}>
      {children}
    </InterfaceSoundContext.Provider>
  );
}
