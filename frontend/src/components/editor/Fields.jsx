import { Slider } from "../ui/slider";

export const Field = ({ label, children, hint }) => (
  <label className="block space-y-1.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-white/40">{hint}</span>}
  </label>
);

export const TextInput = ({ testid, ...p }) => <input className="ed-input" data-testid={testid} {...p} />;

export const NumInput = ({ value, onChange, testid, min = 0, max, step = 1 }) => (
  <input
    type="number"
    className="ed-input"
    value={value ?? 0}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    data-testid={testid}
  />
);

export const SliderField = ({ label, value, onChange, min, max, step = 0.05, testid, format = (v) => v }) => (
  <div className="space-y-2" data-testid={testid}>
    <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
      <span>{label}</span>
      <span className="text-[var(--cyan)]">{format(value)}</span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
  </div>
);
