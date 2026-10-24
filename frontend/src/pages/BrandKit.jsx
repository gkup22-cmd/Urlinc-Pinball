import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { Header } from "../components/Header";
import { useAssets } from "../hooks/useTableMedia";
import { errMsg, fileUrl, http } from "../lib/api";

export default function BrandKit() {
  const { assets, loading, refresh } = useAssets();
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Choose an image");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name || file.name.replace(/\.[^.]+$/, ""));
      fd.append("brand", brand);
      await http.post("/assets", fd);
      toast.success("Asset added");
      setFile(null);
      setName("");
      e.target.reset();
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    try {
      await http.delete(`/assets/${a.id}`);
      toast.success(`Removed ${a.name}`);
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--amber)]">Brand kit</p>
        <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">Your buttons, logos & icons</h1>
        <p className="mt-4 max-w-xl text-white/65">Assets here are only used on a table when you switch on "Use my brand assets" while forging or editing it.</p>

        <form onSubmit={upload} className="forge-panel mt-8 grid gap-3 rounded-3xl p-5 sm:grid-cols-[1fr_1fr_1fr_auto]" data-testid="asset-upload-form">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="ed-input file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-white" data-testid="asset-file-input" />
          <input className="ed-input" placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} data-testid="asset-name-input" />
          <input className="ed-input" placeholder="Brand name (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} data-testid="asset-brand-input" />
          <button className="neon-btn h-11 rounded-full px-6 text-sm" disabled={busy} data-testid="asset-upload-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
          </button>
        </form>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" data-testid="asset-grid">
          {loading && [0, 1, 2].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />)}
          {assets.map((a, i) => (
            <div key={a.id} className="table-card group rise p-3" style={{ animationDelay: `${i * 50}ms` }} data-testid={`asset-card-${a.id}`}>
              <div className="aspect-square rounded-xl bg-black/60 p-3">
                <img src={fileUrl(a.storage_path)} alt={a.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="truncate text-xs text-white/50">{a.brand}</p>
                </div>
                <button onClick={() => remove(a)} className="icon-btn hover:!border-red-500" aria-label="Delete asset" data-testid={`delete-asset-${a.id}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
