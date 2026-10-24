import json
import math
import os
import random
import re
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

EVENTS = ["bumper", "target", "rollover", "ramp", "saucer", "sling"]
FONTS = {
    "Creepster": "horror, haunted, zombies", "Nosifer": "vampires, gore, blood", "Pirata One": "pirates, gothic, dark fantasy",
    "Cinzel Decorative": "ancient myths, gods, epic, Rome, Greece", "Uncial Antiqua": "celtic, wizards, high fantasy",
    "MedievalSharp": "knights, castles, dragons", "Rye": "wild west, cowboys, saloon", "Bungee": "urban, street, arcade, sports",
    "Monoton": "80s retro, synthwave, disco neon", "Audiowide": "racing, futuristic cars, cyber", "Orbitron": "space, sci-fi, tech",
    "Press Start 2P": "8-bit video games, retro computers", "Special Elite": "spy, noir, detective, typewriter",
    "Black Ops One": "military, action, heist", "Metal Mania": "heavy metal, rock, hell", "Bangers": "comic book, superheroes, cartoons",
    "Righteous": "70s, groovy, surf, tiki", "Fredoka": "cute, kids, candy, animals", "Playfair Display": "luxury, elegant, casino, royalty",
    "Faster One": "speed, motorsport, jets",
}
MATERIALS = ["chrome", "gold", "copper", "neon", "crystal"]
AMBIENTS = ["fog", "bubbles", "embers", "stars", "rain", "snow", "lightning", "leaves", "sparks", "matrix", "petals", "bats", "fireflies", "none"]
TARGET_STYLES = ["drop", "flag", "shield", "gem", "post"]
HABITRAILS = ["left", "right", "none"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

SYSTEM = """You are a world-class pinball table designer (think Zen Studios). You design a unique 2D pinball table from a theme and reply with ONLY a JSON object, no prose, no markdown.

Playfield coordinates: width 500, height 900, origin top-left, y grows downward. The usable upper playfield is x 50..420 and y 110..560. The top is an arch, so near y<200 keep x between 120 and 380. Flippers/slingshots occupy y>560 (do NOT place anything there). The shooter lane is at x>455 (do NOT place anything there). Leave at least 45px of space between element edges so the ball (radius 10) can flow.

JSON schema:
{
 "name": "short catchy table title (max 28 chars)",
 "tagline": "one-line backglass slogan",
 "palette": {"bg":"#hex very dark base","primary":"#hex main neon","secondary":"#hex","accent":"#hex flipper/highlight","glow":"#hex","dmd":"#hex DMD dot color"},
 "bumpers": [ {"x":int,"y":int,"r":18-28,"points":int,"label":"1-2 word"} ]  (3-5 items, usually clustered),
 "targets": [ {"x":int,"y":int,"w":24-36,"angle":radians -1.2..1.2,"points":int,"label":"word","style":"drop|flag|shield|gem|post"} ] (3-6 knock-down targets, often a bank in a row; style fits the theme e.g. flag for pirates/racing/castles, shield for knights, gem for treasure/magic, post for sci-fi),
 "rollovers": [ {"x":int,"y":int,"points":int,"label":"1 letter or short"} ] (3-4 top lanes around y 140-200),
 "ramps": [ {"x":int,"y":int,"angle":radians direction the shot travels (-1.57 = straight up),"points":int,"label":"shot name","habitrail":"left|right|none"} ] (2-3 shot entrances; habitrail left/right = a chrome wire ramp carries the ball over the playfield and drops it into that side's inlane, give 1-2 ramps a habitrail),
 "rails": [ {"points":[[x,y],[x,y],[x,y]],"label":"name"} ] (0-2 curved metal guide rails the ball bounces off, 3-5 points with y strictly increasing along the list, each 80-200px long, used to shape lanes/orbits around bumpers; keep 40px from every other element),
 "saucers": [ {"x":int,"y":int,"angle":eject radians,"points":int,"label":"name"} ] (0-2),
 "missions": [ {"title":"themed mission name","description":"short instruction","event":"bumper|target|rollover|ramp|saucer|sling","count":int 3-20,"reward":int,"multiball":bool} ] (4-6 items, at most 2 multiball),
 "scoring": {"comboMax":2-6,"extraBallScore":int,"targetBankBonus":int,"rolloverBonus":int,"slingPoints":int},
 "physics": {"gravity":0.8-1.25,"flipperPower":0.9-1.2,"bounce":0.9-1.3},
 "backglass": {"title":"same or stylized name","subtitle":"short","tagline":"short","attract":["3-5 short DMD attract messages in theme"],"style":"one sentence describing backglass art"},
 "art_brief": "two sentences describing the visual world of this table for an illustrator",
 "style": {"font":"one of FONTS","material":"chrome|gold|copper|neon|crystal (bumper/rail hardware finish)","ambient":"one of AMBIENTS (animated particles drifting over the playfield)"},
 "story": {"title":"dramatic story title","episode":"e.g. EPISODE IV or CHAPTER ONE or a short era line","crawl":["3-4 paragraphs, 2-3 vivid sentences each, an exciting original backstory for the table that ends by putting the player in charge of the flippers"]}
}
FONTS (pick the one matching the theme): """ + "; ".join(f"{k} = {v}" for k, v in FONTS.items()) + """
AMBIENTS: """ + ", ".join(AMBIENTS) + """
Make every table feel different: vary the bumper cluster position (left, right, center, high, low, spread), the number and direction of shots, the rails and target banks, the scoring values and missions to match the theme."""


def _rand_palette():
    return {"bg": "#0b0a16", "primary": "#ff007a", "secondary": "#00f0ff", "accent": "#ffb800", "glow": "#00ff88", "dmd": "#ff6b00"}


def _num(v, lo, hi, default):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


def _radius(kind, el):
    return {"bumpers": el.get("r", 22), "targets": el.get("w", 30) / 2 + 6, "rollovers": 14, "ramps": 20, "saucers": 16}[kind]


def _inside(x, y, r):
    if x - r < 40 or x + r > 430 or y - r < 95 or y + r > 575:
        return False
    if y < 250 and math.hypot(x - 250, y - 250) > 238 - r - 28:
        return False
    return True


def _place(kind, el, placed):
    r = _radius(kind, el)
    x, y = el["x"], el["y"]
    for i in range(40):
        ok = _inside(x, y, r) and all(math.hypot(x - px, y - py) >= r + pr + 24 for px, py, pr in placed)
        if ok:
            el["x"], el["y"] = int(x), int(y)
            placed.append((x, y, r))
            return True
        x = el["x"] + random.uniform(-1, 1) * (12 + i * 6)
        y = el["y"] + random.uniform(-1, 1) * (12 + i * 6)
    return False


def _seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - dx * t, py - ay - dy * t)


def _sanitize_rails(raw_rails, placed):
    rails = []
    for raw in raw_rails[:3]:
        if not isinstance(raw, dict):
            continue
        if "pts" in raw:
            cx, cy = _num(raw.get("x"), 0, 500, 250), _num(raw.get("y"), 0, 900, 300)
            pts = [(cx + _num(p[0], -200, 200, 0), cy + _num(p[1], -200, 200, 0)) for p in raw["pts"] if isinstance(p, (list, tuple)) and len(p) == 2]
        else:
            pts = [(_num(p[0], 0, 500, 250), _num(p[1], 0, 900, 300)) for p in (raw.get("points") or []) if isinstance(p, (list, tuple)) and len(p) == 2]
        pts = sorted(pts[:5], key=lambda p: p[1])
        if len(pts) < 2 or any(b[1] - a[1] < 4 for a, b in zip(pts, pts[1:])):
            continue
        base = pts
        for i in range(60):
            ox = 0 if i == 0 else random.uniform(-1, 1) * (10 + i * 5)
            oy = 0 if i == 0 else random.uniform(-1, 1) * (10 + i * 5)
            pts = [(x + ox, y + oy) for x, y in base]
            if all(_inside(x, y, 18) for x, y in pts) and not any(
                    _seg_dist(px, py, *a, *b) < pr + 26 for a, b in zip(pts, pts[1:]) for px, py, pr in placed):
                break
        else:
            continue
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        rails.append({"id": raw.get("id") or uuid.uuid4().hex[:8], "x": int(cx), "y": int(cy),
                      "pts": [[int(x - cx), int(y - cy)] for x, y in pts], "label": str(raw.get("label") or "")[:16]})
        placed.extend((x, y, 6) for x, y in pts)
    return rails


def sanitize_story(st, name=""):
    st = st if isinstance(st, dict) else {}
    crawl = [str(p)[:600] for p in (st.get("crawl") or []) if p][:6]
    return {"title": str(st.get("title") or name or "")[:60], "episode": str(st.get("episode") or "")[:40], "crawl": crawl,
            "speed": _num(st.get("speed"), 0.5, 2.5, 1.0)}


def sanitize_layout(data: dict) -> dict:
    out = {}
    pal = data.get("palette") or {}
    base = _rand_palette()
    out["palette"] = {k: (pal.get(k) if isinstance(pal.get(k), str) and HEX.match(pal.get(k)) else base[k]) for k in base}
    limits = {"bumpers": 6, "targets": 8, "rollovers": 5, "ramps": 4, "saucers": 2}
    placed = []
    for kind in ["rollovers", "bumpers", "ramps", "saucers", "targets"]:
        items = []
        for raw in (data.get(kind) or [])[: limits[kind]]:
            if not isinstance(raw, dict):
                continue
            el = {
                "id": raw.get("id") or uuid.uuid4().hex[:8],
                "x": _num(raw.get("x"), 0, 500, 250),
                "y": _num(raw.get("y"), 0, 900, 300),
                "points": int(_num(raw.get("points"), 10, 1000000, 1000)),
                "label": str(raw.get("label") or "")[:16],
            }
            if kind == "bumpers":
                el["r"] = int(_num(raw.get("r"), 16, 32, 22))
            if kind == "targets":
                el["w"] = int(_num(raw.get("w"), 20, 44, 30))
                el["angle"] = _num(raw.get("angle"), -1.6, 1.6, 0)
            if kind in ("ramps", "saucers"):
                el["angle"] = _num(raw.get("angle"), -3.2, 3.2, -1.57)
            if kind == "targets":
                el["style"] = raw.get("style") if raw.get("style") in TARGET_STYLES else None
            if kind == "ramps":
                el["habitrail"] = raw.get("habitrail") if raw.get("habitrail") in HABITRAILS else "none"
            if _place(kind, el, placed):
                items.append(el)
        out[kind] = items
    if len(out["bumpers"]) < 3:
        for x, y in [(190, 300), (280, 300), (235, 370), (150, 380), (320, 380)]:
            if len(out["bumpers"]) >= 3:
                break
            el = {"id": uuid.uuid4().hex[:8], "x": x, "y": y, "r": 22, "points": 500, "label": ""}
            if _place("bumpers", el, placed):
                out["bumpers"].append(el)
    out["rails"] = _sanitize_rails(data.get("rails") or [], placed)
    st = data.get("style") or {}
    out["style"] = {
        "font": st.get("font") if st.get("font") in FONTS else "Orbitron",
        "material": st.get("material") if st.get("material") in MATERIALS else "chrome",
        "ambient": st.get("ambient") if st.get("ambient") in AMBIENTS else "sparks",
        "targetStyle": st.get("targetStyle") if st.get("targetStyle") in TARGET_STYLES else "drop",
    }
    for t in out["targets"]:
        t["style"] = t.get("style") or out["style"]["targetStyle"]
    missions = []
    for m in (data.get("missions") or [])[:8]:
        if not isinstance(m, dict):
            continue
        missions.append({
            "title": str(m.get("title") or "Mission")[:32],
            "description": str(m.get("description") or "")[:80],
            "event": m.get("event") if m.get("event") in EVENTS else "bumper",
            "count": int(_num(m.get("count"), 1, 50, 5)),
            "reward": int(_num(m.get("reward"), 100, 10000000, 50000)),
            "multiball": bool(m.get("multiball")),
        })
    if not missions:
        missions = [{"title": "Warm Up", "description": "Hit the bumpers", "event": "bumper", "count": 10, "reward": 25000, "multiball": False}]
    out["missions"] = missions
    sc = data.get("scoring") or {}
    out["scoring"] = {
        "comboMax": int(_num(sc.get("comboMax"), 1, 10, 4)),
        "extraBallScore": int(_num(sc.get("extraBallScore"), 10000, 100000000, 1000000)),
        "targetBankBonus": int(_num(sc.get("targetBankBonus"), 0, 10000000, 25000)),
        "rolloverBonus": int(_num(sc.get("rolloverBonus"), 0, 10000000, 15000)),
        "slingPoints": int(_num(sc.get("slingPoints"), 0, 100000, 50)),
    }
    ph = data.get("physics") or {}
    out["physics"] = {
        "gravity": round(_num(ph.get("gravity"), 0.5, 1.6, 1.0), 2),
        "flipperPower": round(_num(ph.get("flipperPower"), 0.6, 1.5, 1.0), 2),
        "bounce": round(_num(ph.get("bounce"), 0.6, 1.6, 1.0), 2),
        "balls": int(_num(ph.get("balls"), 1, 9, 3)),
        "ballSave": int(_num(ph.get("ballSave"), 0, 30, 8)),
    }
    bg = data.get("backglass") or {}
    attract = [str(a)[:40] for a in (bg.get("attract") or []) if a][:6]
    out["backglass"] = {
        "title": str(bg.get("title") or data.get("name") or "Pinball")[:32],
        "subtitle": str(bg.get("subtitle") or "")[:48],
        "tagline": str(bg.get("tagline") or data.get("tagline") or "")[:80],
        "attract": attract or ["PRESS START", "GOOD LUCK"],
        "style": str(bg.get("style") or "")[:200],
    }
    return out


def _extract_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("No JSON in model response")
    return json.loads(text[start:end + 1])


async def generate_layout(theme: str, brand_names: list) -> dict:
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"table-{uuid.uuid4()}",
                   system_message=SYSTEM).with_model("anthropic", "claude-sonnet-5-5")
    prompt = f"Theme: {theme}\nRandom seed for variety: {random.randint(1, 99999)}"
    if brand_names:
        prompt += ("\nThe owner wants their brand featured. Brand assets available: " + ", ".join(brand_names) +
                   ". Weave these brand names into the table name, labels, missions and backglass where natural.")
    text = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            text += ev.content
        elif isinstance(ev, StreamDone):
            break
    raw = _extract_json(text)
    layout = sanitize_layout(raw)
    layout["name"] = str(raw.get("name") or theme.title())[:32]
    layout["art_brief"] = str(raw.get("art_brief") or "")[:400]
    layout["story"] = sanitize_story(raw.get("story"), layout["name"])
    return layout


async def _ask(system: str, prompt: str) -> str:
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"tbl-{uuid.uuid4()}",
                   system_message=system).with_model("anthropic", "claude-sonnet-5-5")
    text = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            text += ev.content
        elif isinstance(ev, StreamDone):
            break
    return text


STORY_SYSTEM = """You write the opening crawl for a themed pinball table, like a Star Wars intro. Reply ONLY with JSON:
{"story":{"title":"dramatic title","episode":"e.g. EPISODE IV or CHAPTER ONE","crawl":["3-4 paragraphs, 2-3 vivid sentences each, ending by putting the player at the flippers"]},
 "style":{"font":"one of FONTS","ambient":"one of AMBIENTS","material":"chrome|gold|copper|neon|crystal"}}
FONTS: """ + "; ".join(f"{k} = {v}" for k, v in FONTS.items()) + "\nAMBIENTS: " + ", ".join(AMBIENTS)


async def generate_story(t: dict) -> dict:
    missions = "; ".join(m["title"] for m in t.get("missions", []))
    text = await _ask(STORY_SYSTEM, f"Table '{t.get('name')}', theme: {t.get('theme')}. Missions: {missions}. Tagline: {t.get('backglass', {}).get('tagline')}")
    raw = _extract_json(text)
    st = raw.get("style") or {}
    style = dict(t.get("style") or {})
    if not t.get("style"):
        style = {"font": st.get("font") if st.get("font") in FONTS else "Orbitron",
                 "material": st.get("material") if st.get("material") in MATERIALS else "chrome",
                 "ambient": st.get("ambient") if st.get("ambient") in AMBIENTS else "sparks",
                 "targetStyle": "drop"}
    return {"story": sanitize_story(raw.get("story"), t.get("name")), "style": style}


def art_prompt(kind: str, t: dict) -> str:
    pal = t.get("palette", {})
    colors = f"color palette {pal.get('primary')}, {pal.get('secondary')}, {pal.get('accent')} over dark {pal.get('bg')}"
    brief = t.get("art_brief") or ""
    name = t.get("name")
    theme = t.get("theme")
    if kind == "playfield":
        return (f"Photo-realistic overhead straight-down view of a printed pinball playfield artwork for a table themed '{theme}'. "
                f"{brief} Glossy lacquered wood surface with rich illustrated theme artwork, subtle round insert lights, "
                f"flat printed art only: no flippers, no bumpers, no balls, no plastic toys, no text. Dark vignette edges, {colors}. Highly detailed.")
    if kind == "backglass":
        return (f"Photo-realistic illuminated pinball machine backglass artwork, the title '{name}' in bold stylized lettering, themed '{theme}'. "
                f"{brief} {t.get('backglass', {}).get('style', '')} Dramatic characters and scenery, backlit translucent glass glow, {colors}. Landscape composition.")
    if kind == "caps":
        return (f"Photo-realistic macro product photo, straight top-down, of ONE round glossy pinball pop-bumper cap for a '{theme}' themed table. "
                f"Domed translucent cap with an embossed {brief[:160]} emblem in the center, polished {t.get('style', {}).get('material', 'chrome')} rim, "
                f"glowing from within, {colors}. Perfectly centered circle filling the frame on a pure black background, no text.")
    return (f"Photo-realistic studio product photograph of a complete modern pinball machine cabinet themed '{theme}' named '{name}', "
            f"three-quarter front view, illuminated backglass, side cabinet artwork, chrome legs and lockdown bar, {colors}, in a moody dim arcade with reflections.")
