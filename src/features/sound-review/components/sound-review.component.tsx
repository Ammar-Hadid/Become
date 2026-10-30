"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import {
  allSoundOptions,
  chosenSoundIds,
  soundCategories,
} from "@/components/ui/sound/constants/sound-catalog.constants";
import type { SoundCategory, SoundOption } from "@/components/ui/sound/types/sound.types";
import { playSoundPreview } from "@/components/ui/sound/utils/sound-player.util";
import "./sound-review.css";

const selectionKey = "become.sound-review.selection.v3";

function selectionStatus(category: SoundCategory, selected: string[]) {
  const chosen = category.options.filter((option) => selected.includes(option.id));
  if (category.id === "focus" && chosen.length === 3) {
    const moments = new Set(chosen.map((option) => option.moment));
    if (moments.size !== 3) return "Choose one per timer event";
  }
  if (category.id === "movement" && chosen.length === 3) {
    const moments = new Set(chosen.map((option) => option.moment));
    if (moments.size !== 3) return "Choose one per movement";
  }
  if (category.id === "cots" && chosen.length === 2 && chosen[0].moment === chosen[1].moment) {
    return "Choose one per C.O.T.S event";
  }
  if (chosen.length < category.minimum) return "Still exploring";
  if (chosen.length > category.maximum) return "Above recommendation";
  return "In range";
}

function SoundCard({
  option,
  selected,
  playing,
  onPlay,
  onSelect,
}: {
  option: SoundOption;
  selected: boolean;
  playing: boolean;
  onPlay: () => void;
  onSelect: () => void;
}) {
  return (
    <article className="sound-card material-glass" data-selected={selected} data-playing={playing}>
      <div className="sound-card__top">
        <div className="sound-card__identity">
          <span className="sound-card__mark" aria-hidden="true"><Volume2 /></span>
          <div>
            <h3 className="type-widget-title">{option.name}</h3>
            <p className="type-caption">{option.character}</p>
          </div>
        </div>
        <span className="sound-card__duration type-system">{option.durationMs} MS</span>
      </div>
      <div className="sound-card__wave" aria-hidden="true">
        {Array.from({ length: 21 }, (_, index) => (
          <i key={index} style={{ height: `${18 + ((index * 17 + option.name.length * 11) % 66)}%` }} />
        ))}
      </div>
      <p className="sound-card__use type-body-sm">
        {option.moment && <span className="sound-card__moment type-system">{option.moment} / </span>}
        {option.use}
      </p>
      <div className="sound-card__actions">
        <Button type="button" variant="secondary" size="sm" onClick={onPlay} aria-label={`Preview ${option.name}`}>
          {playing ? <Volume2 aria-hidden="true" /> : <Play aria-hidden="true" />}
          {playing ? "Playing" : "Preview"}
        </Button>
        <Button type="button" variant={selected ? "primary" : "ghost"} size="sm" onClick={onSelect} aria-pressed={selected} aria-label={`${selected ? "Remove" : "Keep"} ${option.name}`}>
          <Check aria-hidden="true" />
          {selected ? "Kept" : "Keep"}
        </Button>
      </div>
    </article>
  );
}

export function SoundReview() {
  const [selected, setSelected] = useState<string[]>(chosenSoundIds);
  const [volume, setVolume] = useState(55);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const saved = localStorage.getItem(selectionKey);
      if (saved === null) localStorage.setItem(selectionKey, JSON.stringify(chosenSoundIds));
      const stored = JSON.parse(saved ?? JSON.stringify(chosenSoundIds));
      if (Array.isArray(stored)) {
        const valid = new Set(allSoundOptions.map((option) => option.id));
        const restored = stored.filter((id): id is string => typeof id === "string" && valid.has(id));
        restoreTimer = setTimeout(() => setSelected(restored), 0);
      }
    } catch {
      // A stale local preview choice never blocks the gallery.
    }
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      stopRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
      void contextRef.current?.close();
    };
  }, []);

  function toggleSelected(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    setSelected(next);
    try {
      localStorage.setItem(selectionKey, JSON.stringify(next));
    } catch {
      // The comparison remains usable without local persistence.
    }
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlayingId(null);
  }

  async function preview(option: SoundOption) {
    try {
      if (!contextRef.current) contextRef.current = new AudioContext();
      await contextRef.current.resume();
      stop();
      stopRef.current = playSoundPreview(contextRef.current, option, volume / 100);
      setPlayingId(option.id);
      setAudioError(null);
      timerRef.current = setTimeout(() => {
        setPlayingId(null);
        stopRef.current = null;
      }, option.durationMs + 80);
    } catch {
      setAudioError("Audio preview is unavailable in this browser.");
    }
  }

  const selectedNames = allSoundOptions
    .filter((option) => selected.includes(option.id))
    .map((option) => option.name);

  return (
    <main className="sound-review">
      <header className="sound-review__topbar">
        <BrandMark />
        <span className="type-system sound-review__topbar-label">SOUND SYSTEM / EXPLORATION 01</span>
        <span className="type-system sound-review__topbar-count">{selected.length.toString().padStart(2, "0")} KEPT</span>
      </header>

      <div className="sound-review__layout">
        <div className="sound-review__main">
          <section className="sound-review__intro">
            <span className="type-overline sound-review__eyebrow">BECOME / SOUND STUDIES</span>
            <h1 className="type-page-title">Give the interface a voice.</h1>
            <p className="type-body">
              Your twelve chosen cues are kept. Their event assignments are now applied to the dashboard where the underlying interaction exists. Preview any cue here, or adjust your shortlist.
            </p>
            <div className="sound-review__principles" aria-label="Sound design principles">
              <span className="type-label">Brief by default</span>
              <span className="type-label">One meaning per cue</span>
              <span className="type-label">Silence is part of the system</span>
            </div>
            <nav className="sound-review__jump" aria-label="Sound categories">
              {soundCategories.map((category) => (
                <a className="type-label" href={`#sound-${category.id}`} key={category.id}>
                  <span>{category.number}</span> {category.name}
                </a>
              ))}
            </nav>
          </section>

          <section className="sound-review__console material-elevated-glass" aria-label="Preview controls">
            <div className="sound-review__console-label">
              <Headphones aria-hidden="true" />
              <div>
                <strong className="type-widget-title">Audition console</strong>
                <p className="type-caption">Sound plays only when you press Preview.</p>
              </div>
            </div>
            <label className="sound-review__volume type-label">
              <span>{volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />} Preview volume</span>
              <input type="range" min="0" max="100" step="5" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
              <output className="type-system">{volume}%</output>
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={stop} disabled={!playingId}>
              <Pause aria-hidden="true" /> Stop
            </Button>
            {audioError && <p className="sound-review__error type-caption" role="status">{audioError}</p>}
          </section>

          {soundCategories.map((category) => {
            const chosen = category.options.filter((option) => selected.includes(option.id));
            return (
              <section className="sound-category" id={`sound-${category.id}`} key={category.id}>
                <div className="sound-category__heading">
                  <span className="sound-category__number type-system">{category.number} / 08</span>
                  <div>
                    <h2 className="type-section-title">{category.name}</h2>
                    <p className="type-body">{category.purpose}</p>
                    {category.id === "movement" && <p className="sound-category__round type-system">APPROVED · APERTURE / HORIZON / GRAVITY</p>}
                  </div>
                  <div className="sound-category__recommend type-label">
                    <span>RECOMMENDED</span>
                    <strong>{category.minimum === category.maximum ? category.minimum : `${category.minimum}–${category.maximum}`} <small>OF {category.options.length}</small></strong>
                  </div>
                </div>
                <div className="sound-category__guidance">
                  <p className="type-body-sm"><strong>Use for</strong> {category.examples}</p>
                  <p className="type-body-sm"><strong>Keep silent</strong> {category.restraint}</p>
                  <p className="type-body-sm"><strong>Select</strong> {category.recommended}</p>
                </div>
                <div className="sound-category__grid">
                  {category.options.map((option) => (
                    <SoundCard
                      key={option.id}
                      option={option}
                      selected={selected.includes(option.id)}
                      playing={playingId === option.id}
                      onPlay={() => void preview(option)}
                      onSelect={() => toggleSelected(option.id)}
                    />
                  ))}
                </div>
                <p className="sound-category__status type-system">
                  {chosen.length.toString().padStart(2, "0")} KEPT / {selectionStatus(category, selected)}
                </p>
              </section>
            );
          })}

          <footer className="sound-review__footer type-caption">
            <p>Research basis: short, meaningful, coordinated cues; sound supplements visible feedback and remains under your control.</p>
            <div>
              <a href="https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-sound" target="_blank" rel="noreferrer">Microsoft sound guidance</a>
              <a href="https://developer.apple.com/design/human-interface-guidelines/playing-audio" target="_blank" rel="noreferrer">Apple audio guidance</a>
              <a href="https://www.w3.org/WAI/WCAG21/Understanding/audio-control" target="_blank" rel="noreferrer">W3C audio control</a>
            </div>
          </footer>
        </div>

        <aside className="sound-review__sidebar" aria-label="Your sound shortlist">
          <div className="sound-review__summary material-elevated-glass">
            <span className="type-overline sound-review__eyebrow">YOUR SHORTLIST</span>
            <div className="sound-review__summary-total">
              <strong className="type-metric-lg">{selected.length.toString().padStart(2, "0")}</strong>
              <span className="type-body-sm">sounds kept<br />from {allSoundOptions.length} studies</span>
            </div>
            <p className="type-body-sm">Twelve cues are approved. The category targets below show how each event remains distinct.</p>
            <div className="sound-review__summary-rows">
              {soundCategories.map((category) => {
                const count = category.options.filter((option) => selected.includes(option.id)).length;
                const status = selectionStatus(category, selected);
                return (
                  <a href={`#sound-${category.id}`} key={category.id} className="sound-review__summary-row type-label" data-in-range={status === "In range"}>
                    <span>{category.name}</span>
                    <span>{count} / {category.minimum === category.maximum ? category.minimum : `${category.minimum}–${category.maximum}`}</span>
                  </a>
                );
              })}
            </div>
            <div className="sound-review__selected">
              <strong className="type-label">Kept so far</strong>
              <p className="type-body-sm">{selectedNames.length ? selectedNames.join(" · ") : "Play a few sounds, then press Keep to build your shortlist."}</p>
            </div>
            {selected.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setSelected([]);
                try { localStorage.removeItem(selectionKey); } catch { /* local storage may be unavailable */ }
              }}>
                <RotateCcw aria-hidden="true" /> Clear shortlist
              </Button>
            )}
            <p className="type-caption sound-review__summary-note"><Check aria-hidden="true" /> Your shortlist is saved in this browser for review.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
