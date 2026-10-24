import { useEffect, useState } from "react";

export const DMD = ({ table, state, large = false }) => {
  const attract = table.backglass?.attract || ["PRESS START"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const s = state || {};
  const color = table.palette?.dmd || "#ff6b00";
  let main;
  if (s.message) main = s.message;
  else if (s.started) main = (s.score || 0).toLocaleString();
  else if (s.gameOver) main = `GAME OVER  ${(s.score || 0).toLocaleString()}`;
  else main = i % 2 ? "PRESS LAUNCH TO START" : attract[Math.floor(i / 2) % attract.length];
  return (
    <div className="dmd relative px-4 py-3" style={{ "--dmd": color }} data-testid="dmd-display">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest" style={{ color }}>
        <span data-testid="dmd-ball">{s.started ? `BALL ${s.ballNum}/${s.totalBalls}` : `${table.physics?.balls} BALLS`}</span>
        <span data-testid="dmd-multipliers">
          {s.combo > 1 ? `COMBO x${s.combo} ` : ""}BONUS x{s.bonusX || 1}
          {s.ballSave ? " • SAVE" : ""}
        </span>
      </div>
      <div
        className={`dmd-text my-1 text-center font-display font-black leading-tight ${large ? "text-4xl lg:text-6xl" : String(main).length > 16 ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"}`}
        style={{ color }}
        data-testid="dmd-main-text"
      >
        {main}
      </div>
      {s.started && s.mission && (
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase" style={{ color }} data-testid="dmd-mission">
          <span className="truncate">{s.mission.title}: {s.mission.description}</span>
          <span>{s.mission.progress}/{s.mission.need}</span>
        </div>
      )}
      {s.started && s.score > 0 && s.message && (
        <div className="text-center font-mono text-[10px]" style={{ color }}>{s.score.toLocaleString()}</div>
      )}
    </div>
  );
};
