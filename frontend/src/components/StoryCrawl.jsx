import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, SkipForward } from "lucide-react";
import { loadThemeFonts, themeFonts } from "../game/fonts";

const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: (i * 73.13) % 100,
  y: (i * 37.71) % 100,
  s: (i % 3) + 1,
  d: (i % 7) * 0.4,
}));

export const StoryCrawl = ({ table, onDone, showSkip = true, paused: pausedProp, onPauseChange }) => {
  const story = table.story || {};
  const { display, body } = themeFonts(table);
  const p = table.palette;
  const words = (story.crawl || []).join(" ").split(/\s+/).length;
  const speed = story.speed || 1;
  const duration = useMemo(() => Math.max(20, Math.round(Math.max(38, words * 0.42) / speed)), [words, speed]);
  const done = useRef(onDone);
  done.current = onDone;
  const tableId = table.id;
  const [localPaused, setLocalPaused] = useState(false);
  const paused = pausedProp ?? localPaused;
  const toggle = useRef(null);
  toggle.current = () => {
    setLocalPaused(!paused);
    onPauseChange?.(!paused);
  };

  useEffect(() => {
    loadThemeFonts(table);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") done.current();
      if (e.key === " " && showSkip) {
        e.preventDefault();
        toggle.current();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [showSkip]);

  const onEnd = (e) => {
    if (e.animationName === "crawl-scroll") setTimeout(() => done.current(), 1200);
  };

  return (
    <div
      className={`crawl-root fixed inset-0 z-50 overflow-hidden bg-black ${paused ? "crawl-paused" : ""} ${showSkip ? "cursor-pointer" : ""}`}
      style={{ "--crawl-color": p.accent, "--crawl-glow": p.primary }}
      onClick={() => showSkip && toggle.current()}
      data-testid="story-crawl"
    >
      {STARS.map((s, i) => (
        <span key={i} className="crawl-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
      <div className="crawl-nebula" style={{ background: `radial-gradient(ellipse at 50% 120%, ${p.primary}55, transparent 60%)` }} />
      <p className="crawl-intro" style={{ fontFamily: `"${body}", serif`, color: p.secondary }} data-testid="story-episode">
        {story.episode || "A long time ago, on a table far, far away…"}
      </p>
      <h1 className="crawl-title" style={{ fontFamily: `"${display}", sans-serif` }} data-testid="story-title">
        {story.title || table.name}
      </h1>
      <div className="crawl-stage">
        <div className="crawl-text" style={{ animationDuration: `${duration}s`, fontFamily: `"${body}", serif` }} onAnimationEnd={onEnd} data-testid="story-text">
          <p className="crawl-heading" style={{ fontFamily: `"${display}", sans-serif` }}>{table.name}</p>
          {(story.crawl || []).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
      {paused && (
        <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center" data-testid="story-paused-indicator">
          <span className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.3em] text-white backdrop-blur">
            <Pause className="h-4 w-4" /> Paused
          </span>
        </div>
      )}
      {showSkip && (
        <div className="absolute bottom-6 left-6 z-10 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 backdrop-blur" data-testid="story-hint">
          {paused ? "Click or Space to resume" : "Click or Space to pause"}
        </div>
      )}
      {showSkip && (
        <button onClick={(e) => { e.stopPropagation(); onDone(); }} className="ghost-btn absolute right-4 top-4 z-10 bg-black/40 backdrop-blur sm:bottom-6 sm:right-6 sm:top-auto" data-testid="story-skip-btn">
          <SkipForward className="h-4 w-4" /> Skip intro
        </button>
      )}
    </div>
  );
};
