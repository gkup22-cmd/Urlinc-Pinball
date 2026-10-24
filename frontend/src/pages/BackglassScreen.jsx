import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Maximize } from "lucide-react";
import { fileUrl } from "../lib/api";
import { useTable } from "../hooks/useTable";
import { useAssets } from "../hooks/useTableMedia";
import { channelName } from "../lib/secondScreen";
import { loadThemeFonts, themeFonts } from "../game/fonts";
import { DMD } from "../components/DMD";
import { StoryCrawl } from "../components/StoryCrawl";
import { ScoreOverlay } from "../components/Backglass";

export default function BackglassScreen() {
  const { id } = useParams();
  const { table, setTable } = useTable(id);
  const { assets } = useAssets();
  const [state, setState] = useState(null);
  const [story, setStory] = useState(false);

  useEffect(() => {
    const ch = new BroadcastChannel(channelName(id));
    ch.onmessage = ({ data }) => {
      if (data.type === "state") setState(data.state);
      if (data.type === "story") setStory(data.on);
      if (data.type === "table") setTable(data.table);
    };
    ch.postMessage({ type: "hello" });
    return () => ch.close();
  }, [id, setTable]);

  useEffect(() => {
    const k = (e) => e.key.toLowerCase() === "f" && document.documentElement.requestFullscreen?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    if (table) loadThemeFonts(table);
  }, [table]);

  if (!table) return <div className="h-screen bg-black" />;
  const { display } = themeFonts(table);
  const art = table.art_enabled?.backglass !== false && table.art?.backglass;
  const b = table.brand;
  const logo = b?.enabled && b.backglassLogo && assets.find((a) => a.id === b.asset_ids?.[0]);
  const p = table.palette;
  return (
    <div className="flex h-screen flex-col bg-black" style={{ "--bg-primary": p.primary, "--bg-secondary": p.secondary }} data-testid="backglass-screen">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {art ? (
          <img src={fileUrl(art)} alt="Back-glass" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="backglass-procedural absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="font-mono text-sm uppercase tracking-[0.5em] text-white/80">{table.backglass?.subtitle}</p>
            <h1 className="backglass-title px-6 text-6xl font-black uppercase lg:text-8xl" style={{ fontFamily: `"${display}", sans-serif` }}>{table.backglass?.title || table.name}</h1>
            <p className="mt-4 text-xl text-white/80">{table.backglass?.tagline}</p>
          </div>
        )}
        {logo && <img src={fileUrl(logo.storage_path)} alt="Brand logo" className="absolute right-6 top-6 h-24 w-auto" />}
        <ScoreOverlay table={table} state={state} big />
        <button onClick={() => document.documentElement.requestFullscreen?.()} className="ghost-btn absolute left-4 top-4 bg-black/40 opacity-40 hover:opacity-100" data-testid="backglass-fullscreen-btn">
          <Maximize className="h-4 w-4" /> Fullscreen (F)
        </button>
      </div>
      <div className="relative text-2xl"><DMD table={table} state={state} large /></div>
      {story && <StoryCrawl table={table} onDone={() => setStory(false)} showSkip={false} />}
    </div>
  );
}
