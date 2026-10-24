import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Play, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Header } from "../components/Header";
import { PlayfieldCanvas } from "../components/PlayfieldCanvas";
import { LayoutTab } from "../components/editor/LayoutTab";
import { GameplayTab } from "../components/editor/GameplayTab";
import { MissionsTab } from "../components/editor/MissionsTab";
import { BackglassTab } from "../components/editor/BackglassTab";
import { ArtTab } from "../components/editor/ArtTab";
import { BrandTab } from "../components/editor/BrandTab";
import { useTable } from "../hooks/useTable";
import { KINDS, W, H, elementRadius } from "../game/geometry";
import { errMsg, http } from "../lib/api";

const EDITABLE = ["name", "palette", "bumpers", "targets", "rollovers", "ramps", "saucers", "missions", "scoring", "physics", "backglass", "brand", "art_enabled"];
const TABS = [["layout", "Layout"], ["gameplay", "Gameplay"], ["missions", "Missions"], ["backglass", "Back-glass"], ["art", "Art"], ["brand", "Brand"]];

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { table, error } = useTable(id);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const gameRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!table) return;
    setDraft((d) => (d ? { ...d, art: table.art, art_status: table.art_status } : table));
  }, [table]);

  useEffect(() => {
    if (gameRef.current) gameRef.current.selected = selected;
  }, [selected, draft]);

  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };
  const setDraftDirty = (fn) => {
    setDraft(fn);
    setDirty(true);
  };

  const toTable = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const onDown = (e) => {
    const pt = toTable(e);
    for (const kind of KINDS) {
      for (const el of draft[kind] || []) {
        if (Math.hypot(el.x - pt.x, el.y - pt.y) < elementRadius(kind, el) + 6) {
          setSelected({ kind, id: el.id });
          drag.current = { kind, id: el.id, dx: el.x - pt.x, dy: el.y - pt.y };
          e.currentTarget.setPointerCapture?.(e.pointerId);
          return;
        }
      }
    }
    setSelected(null);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const pt = toTable(e);
    const x = Math.round(Math.max(40, Math.min(430, pt.x + d.dx)));
    const y = Math.round(Math.max(100, Math.min(570, pt.y + d.dy)));
    patch({ [d.kind]: draft[d.kind].map((el) => (el.id === d.id ? { ...el, x, y } : el)) });
  };
  const onUp = () => (drag.current = null);

  const save = async (andPlay) => {
    setSaving(true);
    try {
      const body = Object.fromEntries(EDITABLE.map((k) => [k, draft[k]]));
      const { data } = await http.put(`/tables/${id}`, { ...body, saved: true });
      setDraft(data);
      setDirty(false);
      toast.success("Table saved");
      if (andPlay) nav(`/play/${id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="p-10 text-center" data-testid="editor-error">{error} · <Link to="/" className="text-[var(--cyan)]">Back</Link></div>;
  if (!draft) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--cyan)]" /></div>;

  const tabProps = { draft, patch, selected, setSelected, setDraft: setDraftDirty, dirty };
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            value={draft.name}
            maxLength={32}
            onChange={(e) => patch({ name: e.target.value })}
            className="min-w-0 flex-1 bg-transparent font-display text-3xl font-black uppercase outline-none focus:text-[var(--cyan)] sm:text-4xl"
            data-testid="table-name-input"
          />
          {dirty && <span className="font-mono text-xs text-[var(--amber)]" data-testid="unsaved-indicator">Unsaved changes</span>}
          <button onClick={() => save(false)} disabled={saving} className="neon-btn h-11 rounded-full px-6 text-sm" data-testid="save-changes-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
          <button onClick={() => save(true)} disabled={saving} className="ghost-btn" data-testid="save-and-play-btn"><Play className="h-4 w-4" /> Save & play</button>
        </div>
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="cabinet-frame mx-auto self-start">
            <PlayfieldCanvas
              table={draft}
              preview
              gameRef={gameRef}
              className="w-[min(92vw,420px)] cursor-pointer lg:h-[calc(100vh-14rem)] lg:w-auto"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
          </div>
          <Tabs defaultValue="layout" className="min-w-0">
            <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-white/5 p-1">
              {TABS.map(([v, l]) => (
                <TabsTrigger key={v} value={v} className="data-[state=active]:bg-[var(--magenta)] data-[state=active]:text-white" data-testid={`editor-tab-${v}`}>{l}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="layout"><LayoutTab {...tabProps} /></TabsContent>
            <TabsContent value="gameplay"><GameplayTab {...tabProps} /></TabsContent>
            <TabsContent value="missions"><MissionsTab {...tabProps} /></TabsContent>
            <TabsContent value="backglass"><BackglassTab {...tabProps} /></TabsContent>
            <TabsContent value="art"><ArtTab {...tabProps} /></TabsContent>
            <TabsContent value="brand"><BrandTab {...tabProps} /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
