import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2, Clapperboard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Field, SliderField, TextInput } from "./Fields";
import { FONTS, loadThemeFonts } from "../../game/fonts";
import { StoryCrawl } from "../StoryCrawl";
import { errMsg, http } from "../../lib/api";

const MATERIALS = ["chrome", "gold", "copper", "neon", "crystal"];
const AMBIENTS = ["fog", "bubbles", "embers", "stars", "rain", "snow", "lightning", "leaves", "sparks", "matrix", "petals", "bats", "fireflies", "none"];
const TARGET_STYLES = ["drop", "flag", "shield", "gem", "post"];

const Pick = ({ label, value, options, onChange, testid, fontPreview }) => (
  <Field label={label}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="ed-input" data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent className="dark max-h-72">
        {options.map((o) => (
          <SelectItem key={o} value={o} style={fontPreview ? { fontFamily: `"${o}"` } : undefined}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
);

export const StoryTab = ({ draft, patch }) => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const story = draft.story || { title: "", episode: "", crawl: [] };
  const style = draft.style || { font: "Orbitron", material: "chrome", ambient: "sparks", targetStyle: "drop" };
  const setStory = (k, v) => patch({ story: { ...story, [k]: v } });
  const setStyle = (k, v) => {
    const next = { ...style, [k]: v };
    const p = { style: next };
    if (k === "targetStyle") p.targets = draft.targets.map((t) => ({ ...t, style: v }));
    patch(p);
    if (k === "font") loadThemeFonts({ style: next });
  };

  const rewrite = async () => {
    setBusy(true);
    try {
      const { data } = await http.post(`/tables/${draft.id}/story`);
      patch({ story: data.story });
      toast.success("A new story has been written");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="ed-h">Theme style</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Pick label="Theme font" value={style.font} options={Object.keys(FONTS)} onChange={(v) => setStyle("font", v)} testid="style-font-select" fontPreview />
          <Pick label="Hardware finish" value={style.material} options={MATERIALS} onChange={(v) => setStyle("material", v)} testid="style-material-select" />
          <Pick label="Ambient animation" value={style.ambient} options={AMBIENTS} onChange={(v) => setStyle("ambient", v)} testid="style-ambient-select" />
          <Pick label="Knock-down targets" value={style.targetStyle || "drop"} options={TARGET_STYLES} onChange={(v) => setStyle("targetStyle", v)} testid="style-target-select" />
        </div>
        <p className="text-3xl" style={{ fontFamily: `"${style.font}"` }} data-testid="font-preview">{draft.name}</p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="ed-h">Intro story</h3>
          <div className="flex gap-2">
            <button className="ghost-btn !h-9" onClick={() => setPreview(true)} disabled={!story.crawl.length} data-testid="preview-story-btn"><Clapperboard className="h-4 w-4" /> Preview</button>
            <button className="ghost-btn !h-9" onClick={rewrite} disabled={busy} data-testid="rewrite-story-btn">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Rewrite with AI
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Episode line"><TextInput value={story.episode} maxLength={40} onChange={(e) => setStory("episode", e.target.value)} testid="story-episode-input" /></Field>
          <Field label="Story title"><TextInput value={story.title} maxLength={60} onChange={(e) => setStory("title", e.target.value)} testid="story-title-input" /></Field>
        </div>
        <SliderField label="Scroll speed" value={story.speed || 1} min={0.5} max={2.5} step={0.1} onChange={(v) => setStory("speed", v)} testid="story-speed-slider" format={(v) => `${v.toFixed(1)}×${v < 1 ? " slower" : v > 1 ? " faster" : ""}`} />
        <Field label="Crawl text" hint="Blank line between paragraphs">
          <textarea
            className="ed-input min-h-[220px] py-2 leading-relaxed"
            value={story.crawl.join("\n\n")}
            onChange={(e) => setStory("crawl", e.target.value.split(/\n\s*\n/).slice(0, 6))}
            data-testid="story-crawl-input"
          />
        </Field>
      </div>
      {preview && <StoryCrawl table={draft} onDone={() => setPreview(false)} />}
    </div>
  );
};
