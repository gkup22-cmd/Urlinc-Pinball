import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Field, NumInput, TextInput } from "./Fields";

const EVENTS = ["bumper", "target", "rollover", "ramp", "saucer", "sling"];

export const MissionsTab = ({ draft, patch }) => {
  const ms = draft.missions;
  const set = (i, k, v) => patch({ missions: ms.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });
  const add = () => patch({ missions: [...ms, { title: "New Mission", description: "Hit the bumpers", event: "bumper", count: 5, reward: 50000, multiball: false }] });
  return (
    <div className="space-y-4">
      {ms.map((m, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4" data-testid={`mission-editor-${i}`}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--amber)]">#{i + 1}</span>
            <TextInput value={m.title} onChange={(e) => set(i, "title", e.target.value)} testid={`mission-title-${i}`} />
            <button onClick={() => patch({ missions: ms.filter((_, j) => j !== i) })} disabled={ms.length <= 1} className="icon-btn" aria-label="Remove mission" data-testid={`mission-remove-${i}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <TextInput value={m.description} placeholder="Instruction" onChange={(e) => set(i, "description", e.target.value)} testid={`mission-desc-${i}`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Hit type">
              <Select value={m.event} onValueChange={(v) => set(i, "event", v)}>
                <SelectTrigger className="ed-input" data-testid={`mission-event-${i}`}><SelectValue /></SelectTrigger>
                <SelectContent className="dark">
                  {EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Count"><NumInput value={m.count} min={1} max={50} onChange={(v) => set(i, "count", v)} testid={`mission-count-${i}`} /></Field>
            <Field label="Reward"><NumInput value={m.reward} min={100} onChange={(v) => set(i, "reward", v)} testid={`mission-reward-${i}`} /></Field>
            <Field label="Multiball">
              <div className="flex h-10 items-center"><Switch checked={m.multiball} onCheckedChange={(v) => set(i, "multiball", v)} data-testid={`mission-multiball-${i}`} /></div>
            </Field>
          </div>
        </div>
      ))}
      <button onClick={add} disabled={ms.length >= 8} className="ghost-btn w-full justify-center" data-testid="add-mission-btn"><Plus className="h-4 w-4" /> Add mission</button>
    </div>
  );
};
