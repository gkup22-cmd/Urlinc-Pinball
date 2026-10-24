import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "../components/Header";
import { ThemeForge } from "../components/ThemeForge";
import { TableCard } from "../components/TableCard";
import { errMsg, http } from "../lib/api";

export default function Home() {
  const [tables, setTables] = useState(null);

  useEffect(() => {
    http.get("/tables", { params: { saved: true } }).then((r) => setTables(r.data)).catch(() => setTables([]));
  }, []);

  const remove = async (t) => {
    try {
      await http.delete(`/tables/${t.id}`);
      setTables((x) => x.filter((y) => y.id !== t.id));
      toast.success(`Deleted "${t.name}"`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-8">
        <section className="grid gap-10 py-12 lg:grid-cols-[1fr_1.25fr] lg:items-center lg:py-20">
          <div className="rise">
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--amber)]">AI table designer</p>
            <h1 className="mt-4 font-display text-4xl font-black leading-[0.95] sm:text-5xl lg:text-6xl">
              Type a theme.<br />
              <span className="hero-gradient">Play a new table.</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-white/70">
              Every theme forges a unique playfield with its own bumpers, shots, missions and back-glass. Save the ones you love, tweak them, and chase your high score.
            </p>
          </div>
          <div className="rise" style={{ animationDelay: "120ms" }}>
            <ThemeForge />
          </div>
        </section>

        <section data-testid="saved-tables-section">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-base font-bold uppercase tracking-[0.2em] md:text-lg">Saved tables</h2>
            <span className="font-mono text-xs text-white/50" data-testid="saved-tables-count">{tables?.length ?? 0} tables</span>
          </div>
          {tables === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/5" />)}
            </div>
          ) : tables.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/60" data-testid="empty-library">
              No saved tables yet. Forge one above, then hit <span className="text-[var(--cyan)]">Save to library</span> while playing.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tables.map((t, i) => <TableCard key={t.id} table={t} index={i} onDelete={remove} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
