import { useEffect, useMemo } from "react";
import { SkipForward } from "lucide-react";
import { loadThemeFonts, themeFonts } from "../game/fonts";

const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: (i * 73.13) % 100,
  y: (i * 37.71) % 100,
  s: (i % 3) + 1,
  d: (i % 7) * 0.4,
}));

export const StoryCrawl = ({ table, onDone, showSkip = true }) => {
  const story = table.story || {};
  const { display, body } = themeFonts(table);
  const p = table.palette;
  const words = (story.crawl || []).join(" ").split(/\s+/).length;
  const duration = useMemo(() => Math.max(38, Math.round(words * 0.42)), [words]);

  useEffect(() => {
    loadThemeFonts(table);
    const t = setTimeout(onDone, (duration + 9) * 1000);
    const key = (e) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", key);
    };
  }, [duration, onDone, table]);

  return (
    <div className="crawl-root fixed inset-0 z-50 overflow-hidden bg-black" style={{ "--crawl-color": p.accent, "--crawl-glow": p.primary }} data-testid="story-crawl">
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
        <div className="crawl-text" style={{ animationDuration: `${duration}s`, fontFamily: `"${body}", serif` }} data-testid="story-text">
          <p className="crawl-heading" style={{ fontFamily: `"${display}", sans-serif` }}>{table.name}</p>
          {(story.crawl || []).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
      {showSkip && (
        <button onClick={onDone} className="ghost-btn absolute bottom-6 right-6 z-10 bg-black/40 backdrop-blur" data-testid="story-skip-btn">
          <SkipForward className="h-4 w-4" /> Skip intro
        </button>
      )}
    </div>
  );
};
