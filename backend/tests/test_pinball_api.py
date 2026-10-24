# Pinball Forge API regression tests (tables CRUD, generation, score, assets, files, art)
import os
import time
import io
import pytest
import requests

def _base():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        for line in open("/app/frontend/.env"):
            if line.startswith("REACT_APP_BACKEND_URL="):
                url = line.split("=", 1)[1].strip()
    return url.rstrip("/")

BASE_URL = _base()
EXISTING = "da0fe73f-b1fd-4fe4-9c68-4b480bc18929"
STATE = {}

# 1x1 PNG
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# Health
def test_root(s):
    r = s.get(f"{BASE_URL}/api/")
    assert r.status_code == 200 and "message" in r.json()


# Generation (Claude)
def test_generate_table(s):
    r = s.post(f"{BASE_URL}/api/tables/generate",
               json={"theme": "TEST_ deep sea volcano", "generate_art": False, "brand": {"enabled": False}}, timeout=180)
    assert r.status_code == 200, r.text
    t = r.json()
    for k in ["id", "name", "palette", "bumpers", "targets", "rollovers", "ramps", "saucers", "missions", "scoring", "physics", "backglass"]:
        assert k in t, k
    assert "_id" not in t
    assert len(t["bumpers"]) >= 3
    assert len(t["missions"]) >= 1
    assert t["saved"] is False
    assert t["brand"]["enabled"] is False
    STATE["tid"] = t["id"]
    print("Generated:", t["name"], len(t["bumpers"]), len(t["targets"]), len(t["rollovers"]), len(t["ramps"]), len(t["saucers"]))


def test_generate_validation(s):
    r = s.post(f"{BASE_URL}/api/tables/generate", json={"theme": ""})
    assert r.status_code == 422


def test_get_table_and_404(s):
    tid = STATE.get("tid", EXISTING)
    r = s.get(f"{BASE_URL}/api/tables/{tid}")
    assert r.status_code == 200 and r.json()["id"] == tid
    assert s.get(f"{BASE_URL}/api/tables/nonexistent-xyz").status_code == 404


def test_unsaved_not_in_saved_list(s):
    tid = STATE.get("tid")
    if not tid:
        pytest.skip("no generated table")
    lst = s.get(f"{BASE_URL}/api/tables", params={"saved": "true"}).json()
    assert all(x["saved"] for x in lst)
    assert tid not in [x["id"] for x in lst]
    unsaved = s.get(f"{BASE_URL}/api/tables", params={"saved": "false"}).json()
    assert tid in [x["id"] for x in unsaved]


def test_update_and_sanitize(s):
    tid = STATE.get("tid")
    if not tid:
        pytest.skip("no generated table")
    t = s.get(f"{BASE_URL}/api/tables/{tid}").json()
    bumpers = t["bumpers"] + [{"x": 9999, "y": -50, "r": 999, "points": -5, "label": "TEST_LONG_LABEL_XXXXXXXXXXXX"}]
    body = {"saved": True, "name": "TEST_Renamed",
            "physics": {"gravity": 99, "flipperPower": 1.1, "bounce": 0.1, "balls": 5, "ballSave": 10},
            "scoring": {"comboMax": 3, "extraBallScore": 500000, "targetBankBonus": 1, "rolloverBonus": 2, "slingPoints": 3},
            "backglass": {"title": "TEST_GLASS", "subtitle": "s", "tagline": "t", "attract": ["A"], "style": ""},
            "missions": [{"title": "TEST_M", "description": "d", "event": "bogus", "count": 4, "reward": 1000, "multiball": False}],
            "bumpers": bumpers}
    r = s.put(f"{BASE_URL}/api/tables/{tid}", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["saved"] is True and d["name"] == "TEST_Renamed"
    assert d["physics"]["gravity"] == 1.6 and d["physics"]["bounce"] == 0.6 and d["physics"]["balls"] == 5
    assert d["scoring"]["comboMax"] == 3
    assert d["missions"][0]["event"] == "bumper"
    assert d["backglass"]["title"] == "TEST_GLASS"
    for b in d["bumpers"]:
        assert 16 <= b["r"] <= 32 and 40 <= b["x"] <= 430 and b["points"] >= 10
    # persisted
    g = s.get(f"{BASE_URL}/api/tables/{tid}").json()
    assert g["backglass"]["title"] == "TEST_GLASS" and g["saved"] is True
    # existing bumper ids preserved
    assert set(b["id"] for b in t["bumpers"]).issubset(set(b["id"] for b in g["bumpers"]))
    lst = s.get(f"{BASE_URL}/api/tables", params={"saved": "true"}).json()
    assert tid in [x["id"] for x in lst]


def test_score(s):
    tid = STATE.get("tid")
    if not tid:
        pytest.skip("no generated table")
    r1 = s.post(f"{BASE_URL}/api/tables/{tid}/score", json={"score": 12345}).json()
    assert r1["high_score"] == 12345 and r1["new_record"] is True
    r2 = s.post(f"{BASE_URL}/api/tables/{tid}/score", json={"score": 100}).json()
    assert r2["high_score"] == 12345 and r2["new_record"] is False
    g = s.get(f"{BASE_URL}/api/tables/{tid}").json()
    assert g["plays"] == 2 and g["high_score"] == 12345
    assert s.post(f"{BASE_URL}/api/tables/{tid}/score", json={"score": -1}).status_code == 422


def test_art_invalid_kind(s):
    assert s.post(f"{BASE_URL}/api/tables/{EXISTING}/art", json={"kinds": ["bogus"]}).status_code == 400


def test_art_backglass(s):
    tid = STATE.get("tid")
    if not tid:
        pytest.skip("no generated table")
    r = s.post(f"{BASE_URL}/api/tables/{tid}/art", json={"kinds": ["backglass"]})
    assert r.status_code == 200 and r.json()["kinds"] == ["backglass"]
    g = s.get(f"{BASE_URL}/api/tables/{tid}").json()
    assert g["art_status"]["backglass"] in ("generating", "ready")
    status = None
    for _ in range(36):
        time.sleep(5)
        g = s.get(f"{BASE_URL}/api/tables/{tid}").json()
        status = g["art_status"].get("backglass")
        if status != "generating":
            break
    assert status == "ready", status
    path = g["art"]["backglass"]
    f = s.get(f"{BASE_URL}/api/files/{path}")
    assert f.status_code == 200 and f.headers["content-type"].startswith("image/") and len(f.content) > 1000
    STATE["art_path"] = path


# Assets
def test_seeded_assets(s):
    r = s.get(f"{BASE_URL}/api/assets")
    assert r.status_code == 200
    a = r.json()
    seeded = [x for x in a if x.get("seed_key")]
    assert len(seeded) == 5, [x["name"] for x in a]
    f = s.get(f"{BASE_URL}/api/files/{seeded[0]['storage_path']}")
    assert f.status_code == 200 and f.headers["content-type"].startswith("image/")


def test_asset_upload_delete(s):
    r = s.post(f"{BASE_URL}/api/assets", files={"file": ("t.png", io.BytesIO(PNG), "image/png")},
               data={"name": "TEST_asset", "brand": "TEST_brand"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["name"] == "TEST_asset" and a["brand"] == "TEST_brand" and "_id" not in a
    ids = [x["id"] for x in s.get(f"{BASE_URL}/api/assets").json()]
    assert a["id"] in ids
    f = s.get(f"{BASE_URL}/api/files/{a['storage_path']}")
    assert f.status_code == 200
    d = s.delete(f"{BASE_URL}/api/assets/{a['id']}")
    assert d.status_code == 200
    ids = [x["id"] for x in s.get(f"{BASE_URL}/api/assets").json()]
    assert a["id"] not in ids
    assert s.delete(f"{BASE_URL}/api/assets/nope-xyz").status_code == 404


def test_asset_upload_non_image(s):
    r = s.post(f"{BASE_URL}/api/assets", files={"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")},
               data={"name": "TEST_bad"})
    assert r.status_code == 400


def test_file_404(s):
    assert s.get(f"{BASE_URL}/api/files/pinball-forge/none.png").status_code == 404


def test_delete_table(s):
    tid = STATE.get("tid")
    if not tid:
        pytest.skip("no generated table")
    assert s.delete(f"{BASE_URL}/api/tables/{tid}").status_code == 200
    assert s.get(f"{BASE_URL}/api/tables/{tid}").status_code == 404
    assert s.delete(f"{BASE_URL}/api/tables/{tid}").status_code == 404
