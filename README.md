# Hong Kong Hours
Interactive procedural 3D Hong Kong harbour (Three.js), built from real OpenStreetMap data. Live: https://hongkong-hours.billionstudio.co.uk
Deploy: own Vercel project (Framework: Other, no build), domain hongkong-hours.billionstudio.co.uk. Local test: `python3 -m http.server 8080` (not file://).
Files: index.html, engine.js, cities/hongkong.js (scene), cities/hkdata.js (map data, generated), paintings/, og.jpg.
Data pipeline: tools/get_hk_osm.py downloads OSM -> hk-osm.json; tools/build_hk.py (numpy, scipy, Pillow) -> cities/hkdata.js.
Map data (c) OpenStreetMap contributors, ODbL.
