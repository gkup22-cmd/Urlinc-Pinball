# Iteration 2: story crawl, theme style, rails, habitrails, target styles
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
STORYLESS_ID = "da0fe73f-b1fd-4fe4-9c68-4b480bc18929"
FONTS = {"Creepster", "Nosifer", "Pirata One", "Cinzel Decorative", "Uncial Antiqua", "MedievalSharp", "Rye", "Bungee",
         "Monoton", "Audiowide", "Orbitron", "Press Start 2P", "Special Elite", "Black Ops One", "Metal Mania", "Bangers",
         "Righteous", "Fredoka", "Playfair Display", "Faster One"}
TARGET_STYLES = {"drop", "flag", "shield", "gem", "post"}


@pytest.fixture(scope="module")
def s():
    x = requests.Session()
    x.headers.update({"Content-Type": "application/json"})
    return x


@pytest.fixture(scope="module")
def gen_table(s):
    r = s.post(f"{BASE_URL}/api/tables/generate", json={"theme": "TEST_ pirate treasure island"}, timeout=150)
    assert r.status_code == 200, r.text
    t = r.json()
    yield t
    s.delete(f"{BASE_URL}/api/tables/{t['id']}")


# Generate: style/story/rails/habitrail/target style
def test_generate_has_style(gen_table):
    st = gen_table["style"]
    assert st["font"] in FONTS
    assert st["material"] in {"chrome", "gold", "copper", "neon", "crystal"}
    assert isinstance(st["ambient"], str)
    assert st["targetStyle"] in TARGET_STYLES
    print("style:", st)


def test_generate_has_story(gen_table):
    story = gen_table["story"]
    assert story["title"]
    assert isinstance(story["episode"], str)
    assert isinstance(story["crawl"], list) and len(story["crawl"]) >= 2
    print("story:", story["title"], story["episode"], len(story["crawl"]))


def test_generate_rails_ramps_targets(gen_table):
    assert isinstance(gen_table["rails"], list)
    for rl in gen_table["rails"]:
        assert {"id", "x", "y", "pts", "label"} <= rl.keys()
        assert len(rl["pts"]) >= 2
    for rp in gen_table["ramps"]:
        assert rp["habitrail"] in {"left", "right", "none"}
    for tg in gen_table["targets"]:
        assert tg["style"] in TARGET_STYLES
    print("rails:", len(gen_table["rails"]), "habitrails:", [r["habitrail"] for r in gen_table["ramps"]],
          "targets:", [t["style"] for t in gen_table["targets"]])


# PUT persists story/style/rails
def test_put_story_style_rails(s, gen_table):
    tid = gen_table["id"]
    rail = {"id": "testrail1", "x": 100, "y": 430, "pts": [[-12, -55], [0, 0], [12, 55]], "label": "TEST_rail"}
    payload = {
        "story": {"title": "TEST_ Title", "episode": "EPISODE IX", "crawl": ["Para one.", "Para two."]},
        "style": {"font": "Rye", "material": "gold", "ambient": "snow", "targetStyle": "flag"},
        "rails": [rail],
        "targets": [{**t, "style": "shield"} for t in gen_table["targets"]],
    }
    r = s.put(f"{BASE_URL}/api/tables/{tid}", json=payload)
    assert r.status_code == 200, r.text
    g = s.get(f"{BASE_URL}/api/tables/{tid}").json()
    assert g["story"] == payload["story"]
    assert g["style"] == payload["style"]
    assert all(t["style"] == "shield" for t in g["targets"])
    print("rails after PUT:", g["rails"])
    ids = [x["id"] for x in g["rails"]]
    assert "testrail1" in ids, f"rail dropped by sanitize: {g['rails']}"
    saved = next(x for x in g["rails"] if x["id"] == "testrail1")
    assert saved["pts"] == [[-12, -55], [0, 0], [12, 55]]


def test_put_invalid_style_falls_back(s, gen_table):
    tid = gen_table["id"]
    r = s.put(f"{BASE_URL}/api/tables/{tid}", json={"style": {"font": "Comic Sans", "material": "wood", "ambient": "x", "targetStyle": "zz"}})
    assert r.status_code == 200
    st = r.json()["style"]
    assert st == {"font": "Orbitron", "material": "chrome", "ambient": "sparks", "targetStyle": "drop"}


# Story generation for existing table
def test_story_existing_table(s):
    r = s.post(f"{BASE_URL}/api/tables/{STORYLESS_ID}/story", timeout=150)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["id"] == STORYLESS_ID
    assert t["story"]["title"] and len(t["story"]["crawl"]) >= 2
    assert t["style"]["font"] in FONTS
    assert "_id" not in t
    g = s.get(f"{BASE_URL}/api/tables/{STORYLESS_ID}").json()
    assert g["story"] == t["story"]
    print("story:", t["story"]["title"], "style:", t["style"])


def test_story_404(s):
    r = s.post(f"{BASE_URL}/api/tables/nonexistent-xyz/story")
    assert r.status_code == 404
