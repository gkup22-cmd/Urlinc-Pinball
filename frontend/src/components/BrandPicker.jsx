import { Check } from "lucide-react";
import { fileUrl } from "../lib/api";

export const BrandPicker = ({ assets, selected, onChange }) => {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  if (!assets.length) return <p className="text-sm text-muted-foreground">No brand assets yet. Add some in the Brand Kit.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="brand-picker">
      {assets.map((a) => {
        const on = selected.includes(a.id);
        return (
          <button
            type="button"
            key={a.id}
            onClick={() => toggle(a.id)}
            className={`group relative aspect-square overflow-hidden rounded-xl border bg-black/60 p-2 transition-colors duration-200 ${on ? "border-[var(--accent-amber)]" : "border-white/10 hover:border-white/30"}`}
            data-testid={`brand-asset-option-${a.id}`}
            title={a.name}
          >
            <img src={fileUrl(a.storage_path)} alt={a.name} className="h-full w-full object-contain" />
            {on && (
              <span className="absolute right-1 top-1 rounded-full bg-[var(--accent-amber)] p-0.5 text-black">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const PLACEMENTS = [
  ["bumperCaps", "Bumper caps"],
  ["backglassLogo", "Backglass logo"],
  ["apronLogo", "Apron logos"],
];
