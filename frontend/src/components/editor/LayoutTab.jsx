import { Plus, Trash2 } from "lucide-react";
import { Field, NumInput, SliderField, TextInput } from "./Fields";

const ADD = [
  ["bumpers", "Bumper", { r: 22, points: 500, label: "" }],
  ["targets", "Target", { w: 30, angle: 0, points: 1000, label: "" }],
  ["rollovers", "Top lane", { points: 500, label: "" }],
  ["ramps", "Shot", { angle: -1.57, points: 5000, label: "Shot" }],
  ["saucers", "Saucer", { angle: 1.2, points: 10000, label: "" }],
];
const LIMITS = { bumpers: 6, targets: 8, rollovers: 5, ramps: 4, saucers: 2 };

export const LayoutTab = ({ draft, patch, selected, setSelected }) => {
  const add = (kind, defaults) => {
    const el = { id: Math.random().toString(36).slice(2, 10), x: 233, y: 420, ...defaults };
    patch({ [kind]: [...(draft[kind] || []), el] });
    setSelected({ kind, id: el.id });
  };
  const el = selected && (draft[selected.kind] || []).find((e) => e.id === selected.id);
  const set = (k, v) => patch({ [selected.kind]: draft[selected.kind].map((e) => (e.id === selected.id ? { ...e, [k]: v } : e)) });
  const remove = () => {
    patch({ [selected.kind]: draft[selected.kind].filter((e) => e.id !== selected.id) });
    setSelected(null);
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="ed-h mb-3">Add element</h3>
        <div className="flex flex-wrap gap-2">
          {ADD.map(([kind, label, d]) => (
            <button key={kind} className="pill" disabled={(draft[kind] || []).length >= LIMITS[kind]} onClick={() => add(kind, d)} data-testid={`add-${kind}-btn`}>
              <Plus className="mr-1 inline h-3 w-3" />{label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">Drag elements on the preview to move them. Elements are nudged apart on save so the ball can always flow.</p>
      </div>
      {el ? (
        <div className="space-y-4 rounded-2xl border border-[var(--cyan)]/40 bg-black/30 p-4" data-testid="element-inspector">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--cyan)]">{selected.kind.slice(0, -1)}</p>
            <button onClick={remove} className="icon-btn hover:!border-red-500" aria-label="Delete element" data-testid="delete-element-btn"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label"><TextInput value={el.label} maxLength={14} onChange={(e) => set("label", e.target.value)} testid="element-label-input" /></Field>
            <Field label="Points"><NumInput value={el.points} min={10} onChange={(v) => set("points", v)} testid="element-points-input" /></Field>
          </div>
          {el.r !== undefined && <SliderField label="Size" value={el.r} min={16} max={32} step={1} onChange={(v) => set("r", v)} testid="element-size-slider" />}
          {el.w !== undefined && <SliderField label="Width" value={el.w} min={20} max={44} step={1} onChange={(v) => set("w", v)} testid="element-width-slider" />}
          {el.angle !== undefined && (
            <SliderField label="Angle" value={el.angle} min={selected.kind === "targets" ? -1.6 : -3.14} max={selected.kind === "targets" ? 1.6 : 3.14} step={0.05} onChange={(v) => set("angle", v)} testid="element-angle-slider" format={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50" data-testid="no-element-selected">Tap an element on the preview to edit it.</p>
      )}
    </div>
  );
};
