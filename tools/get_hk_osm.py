#!/usr/bin/env python3
"""Download Hong Kong harbour area data from OpenStreetMap (Overpass API) and
write a compact hk-osm.json. Needs only Python 3 (no extra packages).
Usage:  python3 get_hk_osm.py      then send hk-osm.json back to Claude.
Data (c) OpenStreetMap contributors, ODbL."""
import json, urllib.request, urllib.parse, sys, time

S, W, N, E = 22.270, 114.140, 22.340, 114.225      # south, west, north, east
QUERY = f"""[out:json][timeout:120];
(
  way["natural"="coastline"]({S},{W},{N},{E});
  way["building"]({S},{W},{N},{E});
  way["man_made"="pier"]({S},{W},{N},{E});
  way["highway"~"^(motorway|trunk|primary|secondary)$"]({S},{W},{N},{E});
);
out geom tags;"""
SERVERS = ["https://overpass-api.de/api/interpreter",
           "https://overpass.kumi.systems/api/interpreter",
           "https://overpass.private.coffee/api/interpreter"]

def fetch():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    for url in SERVERS:
        for attempt in range(2):
            try:
                print("trying", url, "...", flush=True)
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "hk-hours-fetch/1.0"})
                with urllib.request.urlopen(req, timeout=180) as r:
                    return json.load(r)
            except Exception as e:
                print("  failed:", e, flush=True); time.sleep(3)
    sys.exit("All servers failed. Try again in a few minutes.")

def num(s):
    try: return float(str(s).lower().replace("m", "").strip().split()[0])
    except Exception: return None

def pts(g): return [[round(p["lon"], 5), round(p["lat"], 5)] for p in g]

def main():
    raw = fetch()
    out = {"bbox": [S, W, N, E], "coast": [], "pier": [], "roads": [], "buildings": [],
           "attribution": "(c) OpenStreetMap contributors, ODbL"}
    for el in raw.get("elements", []):
        if el.get("type") != "way" or "geometry" not in el: continue
        t = el.get("tags", {})
        g = pts(el["geometry"])
        if t.get("natural") == "coastline": out["coast"].append(g)
        elif t.get("man_made") == "pier": out["pier"].append(g)
        elif "highway" in t: out["roads"].append(g)
        elif "building" in t:
            h = num(t.get("height"))
            lv = num(t.get("building:levels"))
            b = {"p": g}
            if h: b["h"] = h
            elif lv: b["l"] = lv
            if t.get("name"): b["n"] = t["name"]
            if t.get("name:en"): b["e"] = t["name:en"]
            out["buildings"].append(b)
    with open("hk-osm.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("done: coast %d, pier %d, roads %d, buildings %d" % (len(out["coast"]), len(out["pier"]), len(out["roads"]), len(out["buildings"])))
    print("File: hk-osm.json - please send it back.")

if __name__ == "__main__":
    main()
