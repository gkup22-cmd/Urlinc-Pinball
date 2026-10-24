import { Link } from "react-router-dom";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { BrandPicker, PLACEMENTS } from "../BrandPicker";
import { useAssets } from "../../hooks/useTableMedia";

export const BrandTab = ({ draft, patch }) => {
  const { assets } = useAssets();
  const b = draft.brand || { enabled: false, asset_ids: [], bumperCaps: true, backglassLogo: true, apronLogo: true };
  const set = (k, v) => patch({ brand: { ...b, [k]: v } });
  return (
    <div className="space-y-5">
      <label className="option-row">
        <div className="flex-1">
          <p className="font-semibold">Use brand assets on this table</p>
          <p className="text-xs text-white/50">The first selected asset is used as the back-glass and apron logo.</p>
        </div>
        <Switch checked={b.enabled} onCheckedChange={(v) => set("enabled", v)} data-testid="editor-brand-switch" />
      </label>
      {b.enabled && (
        <>
          <BrandPicker assets={assets} selected={b.asset_ids} onChange={(ids) => set("asset_ids", ids)} />
          <div className="flex flex-wrap gap-4">
            {PLACEMENTS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={b[k]} onCheckedChange={(v) => set(k, !!v)} data-testid={`editor-placement-${k}`} /> {label}
              </label>
            ))}
          </div>
        </>
      )}
      <Link to="/brand" className="text-sm text-[var(--cyan)] underline-offset-4 hover:underline" data-testid="manage-brand-kit-link">Manage brand kit →</Link>
    </div>
  );
};
