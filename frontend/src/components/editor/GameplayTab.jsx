import { Field, NumInput, SliderField } from "./Fields";

const SCORING = [
  ["comboMax", "Max combo multiplier", 1, 10],
  ["extraBallScore", "Extra ball every (points)", 10000],
  ["targetBankBonus", "Target bank bonus", 0],
  ["rolloverBonus", "All top lanes bonus", 0],
  ["slingPoints", "Slingshot points", 0],
];

export const GameplayTab = ({ draft, patch }) => {
  const ph = draft.physics;
  const sc = draft.scoring;
  const setP = (k) => (v) => patch({ physics: { ...ph, [k]: v } });
  const setS = (k) => (v) => patch({ scoring: { ...sc, [k]: v } });
  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <h3 className="ed-h">Physics</h3>
        <SliderField label="Table slope (gravity)" value={ph.gravity} min={0.5} max={1.6} onChange={setP("gravity")} testid="gravity-slider" format={(v) => `${v.toFixed(2)}×`} />
        <SliderField label="Flipper power" value={ph.flipperPower} min={0.6} max={1.5} onChange={setP("flipperPower")} testid="flipper-power-slider" format={(v) => `${v.toFixed(2)}×`} />
        <SliderField label="Bumper & sling kick" value={ph.bounce} min={0.6} max={1.6} onChange={setP("bounce")} testid="bounce-slider" format={(v) => `${v.toFixed(2)}×`} />
        <SliderField label="Balls per game" value={ph.balls} min={1} max={9} step={1} onChange={setP("balls")} testid="balls-slider" />
        <SliderField label="Ball save (seconds)" value={ph.ballSave} min={0} max={30} step={1} onChange={setP("ballSave")} testid="ballsave-slider" format={(v) => `${v}s`} />
      </div>
      <div className="space-y-4">
        <h3 className="ed-h">Scoring rules</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {SCORING.map(([k, label, min, max]) => (
            <Field key={k} label={label}>
              <NumInput value={sc[k]} min={min} max={max} onChange={setS(k)} testid={`scoring-${k}-input`} />
            </Field>
          ))}
        </div>
        <p className="text-xs text-white/45">Per-element points are edited on the Layout tab. Hitting shots and saucers back-to-back builds the combo multiplier.</p>
      </div>
    </div>
  );
};
