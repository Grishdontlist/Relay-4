import { Layers } from "lucide-react";
import type { ContextLayer } from "../types";
import { displayTimestamp, featureHasGeometry } from "../gis";
import { isLayerReady } from "../responsePresets";
export default function MapLayerControls({
  layers,
  enabled,
  onToggle,
  onReset,
  onRetry,
}: {
  layers: ContextLayer[];
  enabled: string[];
  onToggle: (id: string, checked: boolean) => void;
  onReset: () => void;
  onRetry: (layer: ContextLayer) => void;
}) {
  return (
    <details className="gis-layers">
      <summary>
        <Layers size={17} aria-hidden="true" />
        Layers{" "}
        <span>
          {
            layers.filter((l) => enabled.includes(l.id) && isLayerReady(l))
              .length
          }{" "}
          ready
        </span>
      </summary>
      <div className="gis-layer-content">
        <p>
          Each preset remembers your overrides. Context layers remain
          independent of category filters. Loading, unavailable or failed
          sources are not drawn.
        </p>
        <button
          type="button"
          className="text-button reset-preset-layers"
          onClick={onReset}
        >
          Reset preset layers
        </button>
        <div className="gis-layer-options">
          {layers.map((layer) => {
            const located = layer.features.filter(featureHasGeometry).length;
            const status =
              layer.state === "loading"
                ? "Loading"
                : layer.state === "error"
                  ? "Error"
                  : layer.state === "unavailable"
                    ? "Unavailable"
                    : !layer.features.length
                      ? "Empty"
                      : !located
                        ? "Location unknown"
                        : layer.state === "synthetic"
                          ? "Synthetic"
                          : "Connected";
            return (
              <div
                className={`gis-layer layer-state-${layer.state}`}
                key={layer.id}
                data-layer-id={layer.id}
              >
                <label>
                  <input
                    type="checkbox"
                    aria-label={layer.name}
                    disabled={!isLayerReady(layer)}
                    checked={enabled.includes(layer.id)}
                    onChange={(e) => onToggle(layer.id, e.target.checked)}
                  />
                  <span>
                    <strong>{layer.name}</strong>
                    <small aria-live="polite">
                      {status} · {located} mapped / {layer.features.length}{" "}
                      records
                      {layer.state === "synthetic" && status !== "Synthetic"
                        ? " · Synthetic"
                        : ""}
                    </small>
                  </span>
                </label>
                <p>
                  {layer.source} · Updated {displayTimestamp(layer.updatedAt)}
                </p>
                {layer.message && <p>{layer.message}</p>}
                {layer.state === "loading" && (
                  <p>Loading context records. Your map view is preserved.</p>
                )}
                {layer.state === "error" && (
                  <div role="alert">
                    <p>
                      Context could not load. Other layers and incident facts
                      remain available.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onRetry(layer)}
                    >
                      Retry {layer.name}
                    </button>
                  </div>
                )}
                {enabled.includes(layer.id) && isLayerReady(layer) && (
                  <ul className="gis-layer-records">
                    {layer.features.length ? (
                      layer.features.map((feature) => (
                        <li key={feature.id}>
                          <strong>{feature.name}</strong>
                          <span>{feature.description}</span>
                          <small>
                            {featureHasGeometry(feature)
                              ? "Position supplied · " +
                                (feature.geometry.type === "point"
                                  ? feature.geometry.position?.source
                                  : feature.geometry.positions[0]?.source)
                              : "Exact location unknown · not mapped"}{" "}
                            · {feature.source} ·{" "}
                            {displayTimestamp(feature.updatedAt)}
                          </small>
                        </li>
                      ))
                    ) : (
                      <li>
                        No records supplied. The base map remains available.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
