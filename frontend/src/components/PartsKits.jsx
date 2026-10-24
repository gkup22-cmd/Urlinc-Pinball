import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { errMsg, fileUrl, http } from "../lib/api";

export const SLOT_LABELS = {
  bumper_cap: "Bumper cap", bumper_cap_lit: "Bumper cap (lit)", bumper_base: "Bumper base ring", ball: "Ball",
  saucer: "Saucer", flipper_left: "Flipper (pivot left)", slingshot: "Slingshot insert",
  target_drop: "Drop target", target_flag: "Flag target", target_shield: "Shield target", target_gem: "Gem target", target_post: "Post target",
  rollover: "Lane light", rollover_lit: "Lane light (lit)", arrow: "Shot arrow", arrow_lit: "Shot arrow (lit)",
  rail: "Guide rail", rail_post: "Rail post", apron_left: "Apron left", apron_right: "Apron right",
};
const SLOTS = Object.keys(SLOT_LABELS);

export function usePartsKits() {
  const [kits, setKits] = useState([]);
  const refresh = () => http.get("/parts-kits").then((r) => setKits(r.data));
  useEffect(() => {
    refresh();
  }, []);
  return { kits, setKits, refresh };
}

export const KitSelect = ({ kits, value, onChange, testid }) => (
  <select className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm" value={value || ""} onChange={(e) => onChange(e.target.value || null)} data-testid={testid}>
    <option value="">Drawn parts (no kit)</option>
    {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
  </select>
);

const Slot = ({ kit, slot, onKit }) => {
  const src = kit.parts?.[slot];
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      onKit((await http.post(`/parts-kits/${kit.id}/parts/${slot}`, fd)).data);
      toast.success(`${SLOT_LABELS[slot]} updated`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const remove = async () => onKit((await http.delete(`/parts-kits/${kit.id}/parts/${slot}`)).data);
  return (
    <div className="group relative rounded-xl border border-white/10 bg-black/50 p-2" data-testid={`kit-slot-${kit.id}-${slot}`}>
      <label className="flex aspect-square cursor-pointer items-center justify-center" title="Upload a transparent PNG">
        {src ? <img src={fileUrl(src)} alt={slot} className="max-h-full max-w-full object-contain" /> : <Upload className="h-5 w-5 text-white/30" />}
        <input type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid={`kit-slot-input-${slot}`} />
      </label>
      <p className="mt-1 truncate text-center text-[10px] text-white/55">{SLOT_LABELS[slot]}</p>
      {src && (
        <button onClick={remove} className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 group-hover:block" aria-label="Remove part" data-testid={`kit-slot-remove-${slot}`}>
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export const PartsKits = () => {
  const { kits, setKits, refresh } = usePartsKits();
  const [name, setName] = useState("");
  const onKit = (k) => setKits((ks) => ks.map((x) => (x.id === k.id ? k : x)));
  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await http.post("/parts-kits", { name });
      setName("");
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const remove = async (k) => {
    if (!window.confirm(`Delete the "${k.name}" parts kit? Tables using it go back to drawn parts.`)) return;
    await http.delete(`/parts-kits/${k.id}`);
    refresh();
  };
  return (
    <section className="mt-16" data-testid="parts-kits-section">
      <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--amber)]">Parts kits</p>
      <h2 className="mt-3 font-display text-base font-bold uppercase tracking-[0.2em] md:text-lg">Photo-real table hardware</h2>
      <p className="mt-3 max-w-2xl text-sm text-white/60">
        A kit replaces the drawn bumpers, flippers, targets, lights and rails with your images. Use transparent PNGs seen from above; flippers should have the pivot on the left. Empty slots keep the drawn part.
      </p>
      <form onSubmit={create} className="mt-5 flex max-w-md gap-2">
        <input className="ed-input" placeholder="New kit name" value={name} onChange={(e) => setName(e.target.value)} data-testid="new-kit-name-input" />
        <button className="neon-btn h-10 shrink-0 rounded-full px-5 text-sm" data-testid="create-kit-btn"><Plus className="h-4 w-4" /> Create</button>
      </form>
      <div className="mt-6 space-y-6">
        {kits.map((k) => (
          <div key={k.id} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4" data-testid={`parts-kit-${k.id}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">{k.name} <span className="ml-2 font-mono text-xs text-white/40">{Object.keys(k.parts || {}).length}/{SLOTS.length} parts · {k.material}</span></p>
              <button onClick={() => remove(k)} className="icon-btn hover:!border-red-500" aria-label="Delete kit" data-testid={`delete-kit-${k.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
              {SLOTS.map((s) => <Slot key={s} kit={k} slot={s} onKit={onKit} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
