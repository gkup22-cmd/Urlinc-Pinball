# Parts Kits feature tests (iteration 3)
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TABLE_ID = "da0fe73f-b1fd-4fe4-9c68-4b480bc18929"
SLOTS = ["bumper_cap", "bumper_cap_lit", "bumper_base", "ball", "saucer", "flipper_left", "slingshot",
         "target_drop", "target_flag", "target_shield", "target_gem", "target_post",
         "rollover", "rollover_lit", "arrow", "arrow_lit", "rail", "rail_post", "apron_left", "apron_right"]


def tiny_png():
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    raw = b"\x00\xff\x00\x00\xff"
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def gold(s):
    r = s.get(f"{API}/parts-kits")
    assert r.status_code == 200
    k = [x for x in r.json() if x["name"] == "URLinc Gold"]
    assert len(k) == 1, [x["name"] for x in r.json()]
    return k[0]


@pytest.fixture(scope="module")
def orig_kit(s):
    t = s.get(f"{API}/tables/{TABLE_ID}").json()
    yield t.get("parts_kit_id")
    s.put(f"{API}/tables/{TABLE_ID}", json={"parts_kit_id": t.get("parts_kit_id") or ""})


# Seeded kit
def test_seeded_gold_kit(gold):
    assert gold["material"] == "gold"
    assert set(gold["parts"].keys()) == set(SLOTS)
    assert "_id" not in gold


def test_seed_parts_servable(s, gold):
    for slot in ["bumper_cap", "ball", "flipper_left", "apron_right"]:
        r = s.get(f"{API}/files/{gold['parts'][slot]}")
        assert r.status_code == 200, slot
        assert r.headers.get("content-type", "").startswith("image/")
        assert r.content[:4] == b"\x89PNG"


def test_slots_endpoint(s):
    r = s.get(f"{API}/parts-kits/slots")
    assert r.status_code == 200 and r.json() == SLOTS


# Kit CRUD + parts upload
def test_kit_lifecycle(s, orig_kit):
    r = s.post(f"{API}/parts-kits", json={"name": "TEST_kit"})
    assert r.status_code == 200
    kit = r.json()
    kid = kit["id"]
    assert kit["name"] == "TEST_kit" and kit["parts"] == {} and kit["material"] == "chrome"
    try:
        # upload
        r = s.post(f"{API}/parts-kits/{kid}/parts/ball", files={"file": ("b.png", tiny_png(), "image/png")})
        assert r.status_code == 200, r.text
        path = r.json()["parts"]["ball"]
        assert s.get(f"{API}/files/{path}").status_code == 200
        # unknown slot
        r = s.post(f"{API}/parts-kits/{kid}/parts/nope", files={"file": ("b.png", tiny_png(), "image/png")})
        assert r.status_code == 400
        # non-image
        r = s.post(f"{API}/parts-kits/{kid}/parts/ball", files={"file": ("a.txt", b"hello", "text/plain")})
        assert r.status_code == 400
        # persistence
        k = [x for x in s.get(f"{API}/parts-kits").json() if x["id"] == kid][0]
        assert "ball" in k["parts"]
        # remove part
        r = s.delete(f"{API}/parts-kits/{kid}/parts/ball")
        assert r.status_code == 200 and "ball" not in r.json()["parts"]
        # assign to table
        r = s.put(f"{API}/tables/{TABLE_ID}", json={"parts_kit_id": kid})
        assert r.status_code == 200 and r.json()["parts_kit_id"] == kid
    finally:
        r = s.delete(f"{API}/parts-kits/{kid}")
    assert r.status_code == 200
    assert kid not in [x["id"] for x in s.get(f"{API}/parts-kits").json()]
    assert s.get(f"{API}/tables/{TABLE_ID}").json()["parts_kit_id"] is None
    assert s.delete(f"{API}/parts-kits/{kid}").status_code == 404


def test_create_kit_validation(s):
    assert s.post(f"{API}/parts-kits", json={"name": ""}).status_code == 422
    assert s.post(f"{API}/parts-kits/nonexistent/parts/ball",
                  files={"file": ("b.png", tiny_png(), "image/png")}).status_code == 404


# Table assign
def test_table_set_clear_kit(s, gold, orig_kit):
    r = s.put(f"{API}/tables/{TABLE_ID}", json={"parts_kit_id": gold["id"]})
    assert r.status_code == 200 and r.json()["parts_kit_id"] == gold["id"]
    assert s.get(f"{API}/tables/{TABLE_ID}").json()["parts_kit_id"] == gold["id"]
    r = s.put(f"{API}/tables/{TABLE_ID}", json={"parts_kit_id": ""})
    assert r.status_code == 200 and r.json()["parts_kit_id"] is None
    assert s.put(f"{API}/tables/{TABLE_ID}", json={"parts_kit_id": "bogus"}).status_code == 404


# Generate with kit (one LLM call)
def test_generate_with_kit(s, gold):
    r = s.post(f"{API}/tables/generate", json={"theme": "TEST_ gold casino heist", "parts_kit_id": gold["id"],
                                                "generate_art": False}, timeout=120)
    assert r.status_code == 200, r.text
    t = r.json()
    try:
        assert t["parts_kit_id"] == gold["id"]
        assert t["style"]["material"] == "gold"
        assert s.get(f"{API}/tables/{t['id']}").json()["parts_kit_id"] == gold["id"]
    finally:
        s.delete(f"{API}/tables/{t['id']}")


def test_generate_unknown_kit_404(s):
    r = s.post(f"{API}/tables/generate", json={"theme": "x", "parts_kit_id": "bogus"}, timeout=30)
    assert r.status_code == 404
