import json
import math
import os
import random
import re
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

EVENTS = ["bumper", "target", "rollover", "ramp", "saucer", "sling"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

SYSTEM = """You are a world-class pinball table designer (think Zen Studios). You design a unique 2D pinball table from a theme and reply with ONLY a JSON object, no prose, no markdown.

Playfield coordinates: width 500, height 900, origin top-left, y grows downward. The usable upper playfield is x 50..420 and y 110..560. The top is an arch, so near y<200 keep x between 120 and 380. Flippers/slingshots occupy y>560 (do NOT place anything there). The shooter lane is at x>455 (do NOT place anything there). Leave at least 45px of space between element edges so the ball (radius 10) can flow.

JSON schema:
{
 "name": "short catchy table title (max 28 chars)",
 "tagline": "one-line backglass slogan",
 "palette": {"bg":"#hex very dark base","primary":"#hex main neon","secondary":"#hex","accent":"#hex flipper/highlight","glow":"#hex","dmd":"#hex DMD dot color"},
 "bumpers": [ {"x":int,"y":int,"r":18-28,"points":int,"label":"1-2 word"} ]  (3-5 items, usually clustered),
 "targets": [ {"x":int,"y":int,"w":24-36,"angle":radians -1.2..1.2,"points":int,"label":"word"} ] (3-6 items, often a bank in a row),
 "rollovers": [ {"x":int,"y":int,"points":int,"label":"1 letter or short"} ] (3-4 top lanes around y 140-200),
 "ramps": [ {"x":int,"y":int,"angle":radians direction the shot travels (-1.57 = straight up),"points":int,"label":"shot name"} ] (2-3 shot gates),
 "saucers": [ {"x":int,"y":int,"angle":eject radians,"points":int,"label":"name"} ] (0-2),
 "missions": [ {"title":"themed mission name","description":"short instruction","event":"bumper|target|rollover|ramp|saucer|sling","count":int 3-20,"reward":int,"multiball":bool} ] (4-6 items, at most 2 multiball),
 "scoring": {"comboMax":2-6,"extraBallScore":int,"targetBankBonus":int,"rolloverBonus":int,"slingPoints":int},
 "physics": {"gravity":0.8-1.25,"flipperPower":0.9-1.2,"bounce":0.9-1.3},
 "backglass": {"title":"same or stylized name","subtitle":"short","tagline":"short","attract":["3-5 short DMD attract messages in theme"],"style":"one sentence describing backglass art"},
 "art_brief": "two sentences describing the visual world of this table for an illustrator"
}
Make every table feel different: vary layout, counts, scoring values and missions to match the theme."""


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
                "label": str(raw.get("label") or "")[:14],
            }
            if kind == "bumpers":
                el["r"] = int(_num(raw.get("r"), 16, 32, 22))
            if kind == "targets":
                el["w"] = int(_num(raw.get("w"), 20, 44, 30))
                el["angle"] = _num(raw.get("angle"), -1.6, 1.6, 0)
            if kind in ("ramps", "saucers"):
                el["angle"] = _num(raw.get("angle"), -3.2, 3.2, -1.57)
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
    return layout


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
    return (f"Photo-realistic studio product photograph of a complete modern pinball machine cabinet themed '{theme}' named '{name}', "
            f"three-quarter front view, illuminated backglass, side cabinet artwork, chrome legs and lockdown bar, {colors}, in a moody dim arcade with reflections.")
