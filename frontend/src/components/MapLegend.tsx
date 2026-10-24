import type { Incident, ContextLayer } from "../types";
import { categories, featureHasGeometry } from "../gis";
import { contextLayerStyle } from "../layerStyles";
import { isLayerReady } from "../responsePresets";
import { normalizeCoordinates } from "../coordinates";
export default function MapLegend({
  incidents,
  layers,
}: {
  incidents: Incident[];
  layers: ContextLayer[];
}) {
  const markerCategories = new Set(
    incidents
      .filter((i) => normalizeCoordinates(i.coordinates))
      .map((i) => i.category),
  );
  const drawn = layers.filter(
    (layer) => isLayerReady(layer) && layer.features.some(featureHasGeometry),
  );
  return (
    <details className="gis-legend" open>
      <summary>Legend · visible map content</summary>
      <div>
        {categories
          .filter((c) => c.id !== "all" && markerCategories.has(c.id))
          .map((c) => (
            <span key={c.id}>
              <i
                className={`legend-symbol category-${c.id}`}
                aria-hidden="true"
              >
                {c.symbol}
              </i>
              {c.label}
            </span>
          ))}
        {markerCategories.has("other") && (
          <span>
            <i className="legend-symbol" aria-hidden="true">
              •
            </i>
            Other report
          </span>
        )}
        {drawn.map((layer) => {
          const geometry =
            layer.features.find(featureHasGeometry)!.geometry.type;
          return (
            <span
              className="context-legend-entry"
              data-layer-id={layer.id}
              key={layer.id}
            >
              <i
                className={`legend-context legend-${geometry}`}
                style={{ borderColor: contextLayerStyle(layer.id).color }}
                aria-hidden="true"
              />
              {layer.name} ·{" "}
              {layer.state === "synthetic" ? "Synthetic" : "Connected"}
            </span>
          );
        })}
        {!markerCategories.size && !drawn.length && (
          <span>No mapped features for the current selection.</span>
        )}
      </div>
      <p>
        Icons show primary incident category; secondary tags remain in the list
        and incident panel. Dashed circles: synthetic points. Shaded dashed
        outlines: zones. Dashed lines: closures or demonstration waterways. Only
        enabled, ready layers with valid geometry appear here.
      </p>
    </details>
  );
}
