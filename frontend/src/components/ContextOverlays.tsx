import { CircleMarker, Polygon, Polyline, Popup } from "react-leaflet";
import type { ContextLayer } from "../types";
import { normalizeCoordinates } from "../coordinates";
import { displayTimestamp, featureHasGeometry } from "../gis";
export default function ContextOverlays({
  layers,
}: {
  layers: ContextLayer[];
}) {
  return (
    <>
      {layers
        .filter((layer) => layer.state !== "unavailable")
        .map((layer) =>
          (layer.features ?? []).filter(featureHasGeometry).map((feature) => {
            const popup = (
              <Popup>
                <div className="incident-map-popup">
                  <strong>{feature.name}</strong>
                  <span>{feature.description}</span>
                  <small>
                    {layer.state === "synthetic"
                      ? "SYNTHETIC CONTEXT · not an official source"
                      : "Connected context · source supplied"}
                  </small>
                  <small>
                    {feature.source} · {displayTimestamp(feature.updatedAt)}
                  </small>
                </div>
              </Popup>
            );
            const color = layer.id.includes("flood")
              ? "#267cba"
              : layer.id.includes("weather")
                ? "#7a65a9"
                : layer.id.includes("fire")
                  ? "#c37841"
                  : "#4e7c82";
            const geometry = feature.geometry;
            if (geometry.type === "point") {
              const point = normalizeCoordinates(geometry.position)!;
              return (
                <CircleMarker
                  key={`${layer.id}-${feature.id}`}
                  center={[point.latitude, point.longitude]}
                  radius={layer.id.includes("hazards") ? 23 : 10}
                  pathOptions={{
                    className: `context-feature context-${layer.id}`,
                    color,
                    fillOpacity: layer.id.includes("hazards") ? 0.1 : 0.55,
                    weight: 2,
                    dashArray: layer.state === "synthetic" ? "4 3" : undefined,
                  }}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target.getElement();
                      element?.setAttribute("tabindex", "0");
                      element?.setAttribute("role", "button");
                      element?.setAttribute(
                        "aria-label",
                        `${feature.name}, ${layer.state} context`,
                      );
                    },
                    keydown: (event) => {
                      if (
                        event.originalEvent.key === "Enter" ||
                        event.originalEvent.key === " "
                      ) {
                        event.originalEvent.preventDefault();
                        event.target.openPopup();
                      }
                    },
                  }}
                >
                  {popup}
                </CircleMarker>
              );
            }
            const positions = geometry.positions.map(
              (point) => [point.latitude, point.longitude] as [number, number],
            );
            const options = {
              className: `context-feature context-${layer.id}`,
              color,
              fillOpacity: 0.12,
              weight: 2,
              dashArray: "6 5",
            };
            return geometry.type === "polygon" ? (
              <Polygon
                key={`${layer.id}-${feature.id}`}
                positions={positions}
                pathOptions={options}
              >
                {popup}
              </Polygon>
            ) : (
              <Polyline
                key={`${layer.id}-${feature.id}`}
                positions={positions}
                pathOptions={{ ...options, weight: 5 }}
              >
                {popup}
              </Polyline>
            );
          }),
        )}
    </>
  );
}
