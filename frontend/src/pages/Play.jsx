import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BookmarkPlus, Pencil, Box, Volume2, VolumeX, Loader2, Keyboard, MonitorUp, BookOpen } from "lucide-react";
import { StoryCrawl } from "../components/StoryCrawl";
import { channelName, openBackglassScreen } from "../lib/secondScreen";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { Header } from "../components/Header";
import { Backglass } from "../components/Backglass";
import { PlayfieldCanvas } from "../components/PlayfieldCanvas";
import { TouchControls, useKeyboardControls } from "../components/Controls";
import { MissionList, ScoringLegend } from "../components/TableInfo";
import { useTable, isGenerating } from "../hooks/useTable";
import { useAssets } from "../hooks/useTableMedia";
import { errMsg, fileUrl, http } from "../lib/api";
import { setMuted, unlockAudio } from "../game/sound";

export default function Play() {
  const { id } = useParams();
  const { table, setTable, error } = useTable(id);
  const { assets } = useAssets();
  const gameRef = useRef(null);
  const [state, setState] = useState(null);
  const [mute, setMute] = useState(false);
  const [cabinet, setCabinet] = useState(false);
  const [story, setStory] = useState(false);
  const storyShown = useRef(false);
  const storyRequested = useRef(false);
  const chan = useRef(null);
  const stateRef = useRef(null);
  const tableRef = useRef(null);
  tableRef.current = table;
  useKeyboardControls(gameRef, !!table && !story);

  useEffect(() => {
    const ch = new BroadcastChannel(channelName(id));
    ch.onmessage = ({ data }) => {
      if (data.type === "hello") {
        if (tableRef.current) ch.postMessage({ type: "table", table: tableRef.current });
        ch.postMessage({ type: "state", state: stateRef.current });
      }
    };
    chan.current = ch;
    return () => ch.close();
  }, [id]);

  const onState = useCallback((s) => {
    setState(s);
    stateRef.current = s;
    chan.current?.postMessage({ type: "state", state: s });
  }, []);

  const showStory = useCallback((on) => {
    setStory(on);
    chan.current?.postMessage({ type: "story", on });
  }, []);

  useEffect(() => {
    if (!table) return;
    chan.current?.postMessage({ type: "table", table });
    if (table.story?.crawl?.length) {
      if (!storyShown.current && !stateRef.current?.started) {
        storyShown.current = true;
        showStory(true);
      }
    } else if (!storyRequested.current) {
      storyRequested.current = true;
      http.post(`/tables/${id}/story`).then((r) => setTable((t) => ({ ...t, story: r.data.story, style: r.data.style }))).catch(() => {});
    }
  }, [table, id, setTable, showStory]);

  const onGameOver = async (score) => {
    try {
      const { data } = await http.post(`/tables/${id}/score`, { score });
      setTable((t) => ({ ...t, high_score: data.high_score, plays: (t.plays || 0) + 1 }));
      if (data.new_record) toast.success(`New high score: ${score.toLocaleString()}!`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const save = async () => {
    try {
      const { data } = await http.put(`/tables/${id}`, { saved: true });
      setTable((t) => ({ ...t, saved: data.saved }));
      toast.success("Saved to your library");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const canvasTouch = (down) => (e) => {
    if (e.pointerType === "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    unlockAudio();
    gameRef.current?.setFlipper(e.clientX - r.left < r.width / 2 ? "left" : "right", down);
  };

  if (error) return <div className="p-10 text-center" data-testid="play-error">{error} · <Link to="/" className="text-[var(--cyan)]">Back</Link></div>;
  if (!table) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--cyan)]" /></div>;

  const b = table.brand;
  const logoAsset = b?.enabled && b.backglassLogo && assets.find((a) => a.id === b.asset_ids?.[0]);
  const cabinetUrl = table.art?.cabinet && fileUrl(table.art.cabinet);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-6">
        <section className="order-1 min-w-0 space-y-4 lg:order-1">
          <Backglass table={table} state={state} logo={logoAsset ? fileUrl(logoAsset.storage_path) : null} />
          <div className="flex flex-wrap gap-2">
            {!table.saved && (
              <button onClick={save} className="neon-btn h-10 rounded-full px-5 text-sm" data-testid="save-table-btn">
                <BookmarkPlus className="h-4 w-4" /> Save to library
              </button>
            )}
            <Link to={`/edit/${id}`} className="ghost-btn" data-testid="edit-table-link"><Pencil className="h-4 w-4" /> Edit table</Link>
            {cabinetUrl && (
              <button onClick={() => setCabinet(true)} className="ghost-btn" data-testid="view-cabinet-btn"><Box className="h-4 w-4" /> Cabinet</button>
            )}
            <button onClick={() => openBackglassScreen(id)} className="ghost-btn" data-testid="second-screen-btn"><MonitorUp className="h-4 w-4" /> Back-glass on 2nd screen</button>
            {table.story?.crawl?.length > 0 && (
              <button onClick={() => showStory(true)} className="ghost-btn" data-testid="replay-story-btn"><BookOpen className="h-4 w-4" /> Story</button>
            )}
            <button
              onClick={() => { setMute(!mute); setMuted(!mute); }}
              className="ghost-btn" aria-label="Toggle sound" data-testid="toggle-sound-btn"
            >
              {mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          {isGenerating(table) && (
            <p className="flex items-center gap-2 font-mono text-xs text-[var(--amber)]" data-testid="art-generating-indicator">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Painting photo-realistic art… it will appear automatically.
            </p>
          )}
          <div className="hidden rounded-2xl border border-white/5 bg-[var(--surface)] p-4 lg:block">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50"><Keyboard className="h-3.5 w-3.5" /> Controls</p>
            <ul className="space-y-1 font-mono text-xs text-white/70">
              <li>← / Z / Left Shift — left flipper</li>
              <li>→ / M / Right Shift — right flipper</li>
              <li>Space / Enter / ↓ — hold to pull plunger, release to launch</li>
              <li>N — nudge (careful, 3 = tilt)</li>
            </ul>
          </div>
        </section>

        <section className="order-2 flex flex-col items-center gap-3">
          <div className="cabinet-frame">
            <PlayfieldCanvas
              table={table}
              gameRef={gameRef}
              onState={onState}
              onGameOver={onGameOver}
              className="w-[min(92vw,460px)] lg:h-[calc(100vh-14rem)] lg:w-auto"
              onPointerDown={canvasTouch(true)}
              onPointerUp={canvasTouch(false)}
              onPointerCancel={canvasTouch(false)}
            />
          </div>
          <div className="w-[min(92vw,460px)]"><TouchControls gameRef={gameRef} /></div>
        </section>

        <aside className="order-3 min-w-0 space-y-5">
          <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold uppercase tracking-widest">Missions</h2>
              <span className="font-mono text-xs text-white/50" data-testid="table-high-score">HI {(table.high_score || 0).toLocaleString()}</span>
            </div>
            <MissionList table={table} state={state} />
          </div>
          <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-4">
            <h2 className="mb-3 font-display text-base font-bold uppercase tracking-widest">Scoring</h2>
            <ScoringLegend table={table} />
          </div>
        </aside>
      </main>
      <Dialog open={cabinet} onOpenChange={setCabinet}>
        <DialogContent className="dark max-w-2xl border-white/10 bg-[var(--surface)] p-2" data-testid="cabinet-dialog">
          <DialogTitle className="sr-only">Cabinet</DialogTitle>
          {cabinetUrl && <img src={cabinetUrl} alt="Cabinet" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
      {story && <StoryCrawl table={table} onDone={() => showStory(false)} onPauseChange={(paused) => chan.current?.postMessage({ type: "storyPause", paused })} />}
    </div>
  );
}
