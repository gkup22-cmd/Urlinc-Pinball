import { Loader2, Wand2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../ui/switch";
import { errMsg, fileUrl, http } from "../../lib/api";

const KINDS = [
  ["playfield", "Playfield", "Printed art under the bumpers and flippers", "aspect-[5/9]"],
  ["backglass", "Back-glass", "Illuminated header art above the score display", "aspect-[5/3]"],
  ["cabinet", "Machine cabinet", "Full machine product shot", "aspect-square"],
  ["caps", "Bumper caps", "Photo-real emblem caps on every pop bumper", "aspect-square"],
];

export const ArtTab = ({ draft, setDraft, dirty }) => {
  const generate = async (kinds) => {
    if (dirty) toast.message("Tip: save first so the art uses your latest name and colors");
    try {
      await http.post(`/tables/${draft.id}/art`, { kinds });
      setDraft((d) => ({ ...d, art_status: { ...d.art_status, ...Object.fromEntries(kinds.map((k) => [k, "generating"])) } }));
      toast.success("Painting started — about a minute each");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const toggle = (k, v) => setDraft((d) => ({ ...d, art_enabled: { ...d.art_enabled, [k]: v } }));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/60">Create photo-realistic artwork for this machine.</p>
        <button className="neon-btn h-10 shrink-0 rounded-full px-4 text-sm" onClick={() => generate(KINDS.map((k) => k[0]))} data-testid="generate-all-art-btn">
          <Wand2 className="h-4 w-4" /> Generate all
        </button>
      </div>
      {KINDS.map(([k, title, desc, aspect]) => {
        const status = draft.art_status?.[k];
        const url = draft.art?.[k];
        const busy = status === "generating";
        return (
          <div key={k} className="flex gap-4 rounded-2xl border border-white/10 bg-black/30 p-3" data-testid={`art-card-${k}`}>
            <div className={`w-24 shrink-0 overflow-hidden rounded-lg bg-white/5 ${aspect}`}>
              {url && <img src={fileUrl(url)} alt={title} className="h-full w-full object-cover" data-testid={`art-img-${k}`} />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-white/50">{desc}</p>
              {status?.startsWith("error") && (
                <p className="flex items-center gap-1 text-xs text-red-400" data-testid={`art-error-${k}`}><AlertTriangle className="h-3 w-3" /> Generation failed, try again</p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-3">
                <button className="ghost-btn !h-9" disabled={busy} onClick={() => generate([k])} data-testid={`generate-art-${k}-btn`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {busy ? "Painting…" : url ? "Regenerate" : "Generate"}
                </button>
                {url && k !== "cabinet" && (
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <Switch checked={draft.art_enabled?.[k] !== false} onCheckedChange={(v) => toggle(k, v)} data-testid={`art-enabled-${k}-switch`} /> Show on table
                  </label>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
