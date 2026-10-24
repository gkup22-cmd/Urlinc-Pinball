import { Field, TextInput } from "./Fields";

const COLORS = [["bg", "Playfield base"], ["primary", "Walls / main neon"], ["secondary", "Bumpers & slings"], ["accent", "Flippers & shots"], ["glow", "Lane lights"], ["dmd", "DMD dots"]];

export const BackglassTab = ({ draft, patch }) => {
  const bg = draft.backglass;
  const set = (k, v) => patch({ backglass: { ...bg, [k]: v } });
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="ed-h">Back-glass</h3>
        <Field label="Title"><TextInput value={bg.title} maxLength={32} onChange={(e) => set("title", e.target.value)} testid="backglass-title-input" /></Field>
        <Field label="Subtitle"><TextInput value={bg.subtitle} maxLength={48} onChange={(e) => set("subtitle", e.target.value)} testid="backglass-subtitle-input" /></Field>
        <Field label="Tagline"><TextInput value={bg.tagline} maxLength={80} onChange={(e) => set("tagline", e.target.value)} testid="backglass-tagline-input" /></Field>
        <Field label="DMD attract messages" hint="One per line, shown on the score display between games">
          <textarea
            className="ed-input min-h-[96px] py-2"
            value={bg.attract.join("\n")}
            onChange={(e) => set("attract", e.target.value.split("\n").slice(0, 6))}
            data-testid="backglass-attract-input"
          />
        </Field>
      </div>
      <div className="space-y-4">
        <h3 className="ed-h">Colors</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COLORS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-2">
              <input type="color" value={draft.palette[k]} onChange={(e) => patch({ palette: { ...draft.palette, [k]: e.target.value } })} className="h-8 w-10 cursor-pointer rounded bg-transparent" data-testid={`color-${k}-input`} />
              <span className="text-xs text-white/70">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
