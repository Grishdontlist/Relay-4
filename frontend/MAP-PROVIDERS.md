# Map provider review

Reviewed for this frontend change on October 24, 2026.

| Style | Configuration | License/attribution | Credentials | Browser status |
| --- | --- | --- | --- | --- |
| Streets | Existing `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Visible © OpenStreetMap contributors link to the copyright/license page | No API key required by this configured public tile source | Existing Leaflet 1.9 / React Leaflet 5 raster layer; checked in desktop Chromium and an emulated mobile/touch viewport |
| Satellite | Unavailable; no configured source | No imagery license or attribution agreement configured | No provider-specific credential interface configured | No imagery source was added or represented as tested |
| Terrain | Unavailable; no configured source | No terrain license or attribution agreement configured | No provider-specific credential interface configured | No terrain source was added or represented as tested |

OpenStreetMap data uses the [Open Database License](https://www.openstreetmap.org/copyright). Use of the public raster server must also follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): retain visible attribution, standard browser Referer/User-Agent behavior and HTTP caching; request the current viewport without bulk/offline download or cache bypass. This implementation retains the existing URL, `keepBuffer: 0`, idle updates and issue-report link. Normal browser request/caching behavior is used. Automated gesture tests intercept tile requests with local test images rather than driving OSM's community service.

The existing raster stack is documented by [Leaflet](https://leafletjs.com/reference.html#tilelayer). Desktop/mobile interaction tests do not establish compatibility with every browser or any unconfigured imagery source. Verify a future provider's HTTPS delivery, CORS and credential/referrer restrictions, projection (the current map uses EPSG:3857), tile scheme, zoom coverage, licensing and attribution before enabling it. Keep keys intended for servers out of the browser. No new map-provider dependency, server credential, proxy or external imagery integration is included.

The style registry is separate from response presets. Disabled styles cannot be selected in the UI. If an unavailable style is ever supplied programmatically, the map shows an unavailable message with no substitute basemap; it does not serve Streets tiles under that name. Incident overlays and text remain separate from basemap availability.
