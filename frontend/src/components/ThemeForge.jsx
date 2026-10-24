import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Camera, BadgeCheck, Boxes } from "lucide-react";
import { KitSelect, usePartsKits } from "./PartsKits";
import { toast } from "sonner";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { BrandPicker, PLACEMENTS } from "./BrandPicker";
import { errMsg, http, PRESETS } from "../lib/api";
import { useAssets } from "../hooks/useTableMedia";

const STEPS = ["Sketching the playfield", "Placing bumpers & targets", "Writing missions", "Tuning the flippers", "Lighting the backglass"];

export const ThemeForge = () => {
  const nav = useNavigate();
  const { assets } = useAssets();
  const [theme, setTheme] = useState("");
  const [art, setArt] = useState(false);
  const [brandOn, setBrandOn] = useState(false);
  const [brand, setBrand] = useState({ asset_ids: [], bumperCaps: true, backglassLogo: true, apronLogo: true });
  const [busy, setBusy] = useState(false);
  const { kits } = usePartsKits();
  const [kitId, setKitId] = useState(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3500);
    return () => clearInterval(t);
  }, [busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (!theme.trim()) return toast.error("Type a theme first");
    if (brandOn && !brand.asset_ids.length) return toast.error("Pick at least one brand asset");
    setBusy(true);
    try {
      const { data } = await http.post("/tables/generate", {
        theme,
        generate_art: art,
        parts_kit_id: kitId,
        brand: { ...brand, enabled: brandOn },
      });
      toast.success(`"${data.name}" is ready to play`);
      nav(`/play/${data.id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="forge-panel relative rounded-3xl p-6 sm:p-8" data-testid="theme-forge-form">
      <label htmlFor="theme" className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--cyan)]">
        Theme
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          maxLength={300}
          placeholder="e.g. Pirates of the frozen north"
          className="forge-input h-14 flex-1 rounded-full px-6 text-base"
          disabled={busy}
          data-testid="theme-input"
        />
        <button type="submit" disabled={busy} className="neon-btn h-14 rounded-full px-8 font-display font-bold" data-testid="generate-table-btn">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {busy ? "Forging…" : "Forge Table"}
        </button>
      </div>
      {busy && (
        <p className="mt-3 font-mono text-xs text-[var(--amber)] animate-pulse" data-testid="generation-progress">
          {STEPS[step]}… (about 30 seconds)
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => setTheme(p)} className="pill" disabled={busy} data-testid={`preset-${p.toLowerCase().replace(/\s+/g, "-")}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="option-row" data-testid="option-photo-art">
          <Camera className="h-5 w-5 text-[var(--magenta)]" />
          <div className="flex-1">
            <p className="font-semibold">Photo-realistic art</p>
            <p className="text-xs text-muted-foreground">Playfield, back-glass & cabinet images (ready ~1 min after)</p>
          </div>
          <Switch checked={art} onCheckedChange={setArt} disabled={busy} data-testid="photo-art-switch" />
        </label>
        <label className="option-row" data-testid="option-brand">
          <BadgeCheck className="h-5 w-5 text-[var(--amber)]" />
          <div className="flex-1">
            <p className="font-semibold">Use my brand assets</p>
            <p className="text-xs text-muted-foreground">Buttons, logos & icons on the table</p>
          </div>
          <Switch checked={brandOn} onCheckedChange={setBrandOn} disabled={busy} data-testid="brand-assets-switch" />
        </label>
      </div>

      <label className="option-row mt-3" data-testid="option-parts-kit">
        <Boxes className="h-5 w-5 text-[var(--cyan)]" />
        <div className="flex-1">
          <p className="font-semibold">Hardware</p>
          <p className="text-xs text-muted-foreground">Use a photo-real parts kit for bumpers, flippers, targets & lights</p>
        </div>
        <div className="w-48"><KitSelect kits={kits} value={kitId} onChange={setKitId} testid="forge-parts-kit-select" /></div>
      </label>

      {brandOn && (
        <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4" data-testid="brand-options">
          <BrandPicker assets={assets} selected={brand.asset_ids} onChange={(ids) => setBrand({ ...brand, asset_ids: ids })} />
          <div className="flex flex-wrap gap-4">
            {PLACEMENTS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={brand[k]} onCheckedChange={(v) => setBrand({ ...brand, [k]: !!v })} data-testid={`placement-${k}`} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};
