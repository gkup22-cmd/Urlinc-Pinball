import os, sys, requests, random
sys.path.insert(0, "/app/backend")
from table_gen import sanitize_layout
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
keys = ["palette", "bumpers", "targets", "rollovers", "ramps", "saucers", "rails", "style", "missions", "scoring", "physics", "backglass"]
for tid in ["3af4fa41-62ed-47db-91e0-0ffa6c843219"]:
    t = requests.get(f"{BASE}/api/tables/{tid}").json()
    print("orig rails", t["rails"])
    ok = 0
    for i in range(20):
        c = sanitize_layout({k: t.get(k) for k in keys})
        ok += len(c["rails"]) == len(t["rails"])
        same_pos = all(a["x"] == b["x"] and a["y"] == b["y"] for k in ["bumpers", "targets", "ramps"] for a, b in zip(t[k], c[k]))
    print("idempotent rails runs:", ok, "/20; last positions same:", same_pos, "counts", {k: (len(t[k]), len(c[k])) for k in ["bumpers", "targets", "rollovers", "ramps", "saucers", "rails"]})
    # editor default rail add
    m = {k: t.get(k) for k in keys}
    m["rails"] = t["rails"] + [{"id": "new", "x": 233, "y": 420, "pts": [[-12, -55], [0, 0], [12, 55]], "label": ""}]
    c = sanitize_layout(m)
    print("default editor rail kept:", any(r["id"] == "new" for r in c["rails"]))
