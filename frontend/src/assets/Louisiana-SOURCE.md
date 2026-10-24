# Louisiana wordmark silhouette

- Local asset: `louisiana.svg`.
- Source: [US Atlas 3.0.1, states-albers-10m.json](https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json), Louisiana state geometry, FIPS `22`.
- Upstream: [topojson/us-atlas](https://github.com/topojson/us-atlas), a redistribution of the U.S. Census Bureau's 2017 cartographic boundary shapefiles. The source uses the Albers USA projection.
- License: ISC, copyright 2013–2019 Michael Bostock. Full notice is included in `us-atlas-LICENSE.txt` and inside the SVG.
- Conversion: decoded and joined the source TopoJSON arcs into SVG path rings; cropped the viewBox to Louisiana's bounds; applied the existing Relay4 lime `#c1f249`. All source Louisiana vertices, coastline, and island rings are retained without additional simplification or redrawing. The SVG uses even-odd fill for interior rings and preserves the source aspect ratio.

This is a cartographic silhouette for branding, not a current coastline survey or navigation map. It is bundled locally and makes no remote image request.
