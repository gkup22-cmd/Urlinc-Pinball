import { fileUrl } from "../lib/api";
import { themeFonts } from "../game/fonts";
import { DMD } from "./DMD";

export const ScoreOverlay = ({ table, state, big = false }) => {
  const { display } = themeFonts(table);
  const s = state || {};
  const score = s.started || s.gameOver ? s.score || 0 : table.high_score || 0;
  const caption = s.started ? `BALL ${s.ballNum}/${s.totalBalls}` : s.gameOver ? "FINAL SCORE" : "HIGH SCORE";
  return (
    <div className={`score-overlay absolute inset-x-0 bottom-0 flex items-end justify-between ${big ? "px-10 pb-8" : "px-4 pb-2"}`} data-testid="backglass-score-overlay">
      <div>
        <p className={`font-mono uppercase tracking-[0.3em] text-white/80 ${big ? "text-base" : "text-[9px]"}`} data-testid="backglass-score-caption">{caption}</p>
        <p className={`score-digits font-black leading-none ${big ? "text-7xl lg:text-9xl" : "text-3xl sm:text-4xl"}`} style={{ fontFamily: `"${display}", sans-serif` }} data-testid="backglass-score">
          {score.toLocaleString()}
        </p>
      </div>
      <div className="text-right">
        {s.started && s.combo > 1 && <p className={`font-mono font-bold text-[var(--bg-secondary)] ${big ? "text-3xl" : "text-xs"}`}>COMBO x{s.combo}</p>}
        <p className={`font-mono uppercase text-white/70 ${big ? "text-xl" : "text-[10px]"}`} data-testid="backglass-high-score">HI {(table.high_score || 0).toLocaleString()}</p>
      </div>
    </div>
  );
};

export const Backglass = ({ table, state, logo }) => {
  const bg = table.backglass || {};
  const p = table.palette;
  const art = table.art_enabled?.backglass !== false && table.art?.backglass;
  const { display } = themeFonts(table);
  return (
    <div
      className="backglass relative w-full overflow-hidden rounded-t-2xl border border-white/10"
      style={{ "--bg-primary": p.primary, "--bg-secondary": p.secondary, "--bg-accent": p.accent }}
      data-testid="backglass"
    >
      <div className="relative aspect-[16/9] w-full">
        {art ? (
          <img src={fileUrl(art)} alt="Backglass art" className="absolute inset-0 h-full w-full object-cover" data-testid="backglass-art-img" />
        ) : (
          <div className="backglass-procedural absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
        {logo && <img src={logo} alt="Brand logo" className="absolute right-3 top-3 h-12 w-auto drop-shadow-[0_0_12px_rgba(255,184,0,0.6)]" data-testid="backglass-brand-logo" />}
        {!art && (
          <div className="absolute inset-0 flex flex-col items-start justify-start px-6 pt-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.35em] text-white [text-shadow:0_0_8px_var(--bg-secondary),0_1px_2px_#000]">{bg.subtitle}</p>
            <h1 className="backglass-title text-2xl sm:text-3xl font-black uppercase leading-none" style={{ fontFamily: `"${display}", sans-serif` }} data-testid="backglass-title">
              {bg.title || table.name}
            </h1>
            <p className="mt-2 max-w-[80%] text-xs text-white/80" data-testid="backglass-tagline">{bg.tagline}</p>
          </div>
        )}
        <ScoreOverlay table={table} state={state} />
      </div>
      <DMD table={table} state={state} />
    </div>
  );
};
