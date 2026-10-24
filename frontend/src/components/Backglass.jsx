import { fileUrl } from "../lib/api";
import { DMD } from "./DMD";

export const Backglass = ({ table, state, logo }) => {
  const bg = table.backglass || {};
  const p = table.palette;
  const art = table.art_enabled?.backglass !== false && table.art?.backglass;
  return (
    <div
      className="backglass relative w-full overflow-hidden rounded-t-2xl border border-white/10"
      style={{ "--bg-primary": p.primary, "--bg-secondary": p.secondary, "--bg-accent": p.accent }}
      data-testid="backglass"
    >
      <div className="relative aspect-[5/2] w-full">
        {art ? (
          <img src={fileUrl(art)} alt="Backglass art" className="absolute inset-0 h-full w-full object-cover" data-testid="backglass-art-img" />
        ) : (
          <div className="backglass-procedural absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
        {logo && <img src={logo} alt="Brand logo" className="absolute right-3 top-3 h-12 w-auto drop-shadow-[0_0_12px_rgba(255,184,0,0.6)]" data-testid="backglass-brand-logo" />}
        {!art && (
          <div className="absolute inset-0 flex flex-col items-start justify-center px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: p.secondary }}>{bg.subtitle}</p>
            <h1 className="backglass-title font-display text-2xl sm:text-3xl font-black uppercase leading-none" data-testid="backglass-title">
              {bg.title || table.name}
            </h1>
            <p className="mt-2 max-w-[80%] text-xs text-white/80" data-testid="backglass-tagline">{bg.tagline}</p>
          </div>
        )}
      </div>
      <DMD table={table} state={state} />
    </div>
  );
};
