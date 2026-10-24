import { Target, CircleDot, ArrowUpRight, Disc3, Zap, Triangle } from "lucide-react";

const ICONS = { bumper: CircleDot, target: Target, rollover: Disc3, ramp: ArrowUpRight, saucer: Zap, sling: Triangle };

export const MissionList = ({ table, state }) => (
  <ol className="space-y-2" data-testid="mission-list">
    {table.missions.map((m, i) => {
      const Icon = ICONS[m.event] || CircleDot;
      const active = state?.started && state.mission?.index === i;
      return (
        <li
          key={i}
          className={`flex items-start gap-3 rounded-xl border p-3 transition-colors duration-200 ${active ? "border-[var(--amber)] bg-[var(--amber)]/10" : "border-white/5 bg-white/[0.02]"}`}
          data-testid={`mission-item-${i}`}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cyan)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {m.title} {m.multiball && <span className="ml-1 rounded bg-[var(--magenta)] px-1.5 py-0.5 font-mono text-[9px] uppercase">Multiball</span>}
            </p>
            <p className="text-xs text-white/60">{m.description} · {m.count}× {m.event}</p>
          </div>
          <span className="font-mono text-xs text-[var(--amber)]">{m.reward.toLocaleString()}</span>
        </li>
      );
    })}
  </ol>
);

export const ScoringLegend = ({ table }) => {
  const rows = [
    ...table.bumpers.map((b) => [b.label || "Bumper", b.points]),
    ...table.ramps.map((r) => [`${r.label || "Shot"} shot`, r.points]),
    ...(table.saucers || []).map((s) => [`${s.label || "Saucer"} saucer`, s.points]),
    ["Target bank", table.scoring.targetBankBonus],
    ["All top lanes", table.scoring.rolloverBonus],
    ["Extra ball at", table.scoring.extraBallScore],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs" data-testid="scoring-legend">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="truncate text-white/60">{k}</dt>
          <dd className="text-right text-white">{Number(v).toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
};
