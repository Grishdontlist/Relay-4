import { useEffect, useRef, type MutableRefObject } from "react";
import { latLngBounds } from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import type { MapCamera, ViewportRequest } from "../responsePresets";
import { LOUISIANA_BOUNDS } from "../mapConfig";

// The full GIS workspace uses commands, not reactive data extents. A layer,
// filter, timestamp or assignment update must never replay a preset zoom.
export default function MapViewportController({
  initialCamera,
  initialExtent,
  request,
  appliedRequest,
  onChange,
  helpId,
}: {
  initialCamera?: MapCamera;
  initialExtent: [number, number][];
  request?: ViewportRequest;
  appliedRequest: MutableRefObject<number | undefined>;
  onChange: (camera: MapCamera) => void;
  helpId: string;
}) {
  const map = useMap();
  const latest = useRef({ initialCamera, initialExtent, request, onChange });
  latest.current = { initialCamera, initialExtent, request, onChange };
  const report = () => {
    const center = map.getCenter();
    latest.current.onChange({
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
    });
  };
  function applyRequest() {
    const command = latest.current.request;
    if (
      !command ||
      command.token === appliedRequest.current ||
      !map.getContainer().clientWidth ||
      !map.getContainer().clientHeight
    )
      return;
    map.stop();
    if (command.mode === "pan") {
      if (command.points.length)
        map.panTo(command.points[0], { animate: false });
    } else if (command.points.length)
      map.fitBounds(latLngBounds(command.points), {
        padding: [32, 32],
        maxZoom: command.maxZoom,
        animate: false,
      });
    else map.fitBounds(LOUISIANA_BOUNDS, { padding: [12, 12], animate: false });
    appliedRequest.current = command.token;
    report();
  }
  useMapEvents({ moveend: report, zoomend: report });
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Interactive incident map");
    container.setAttribute("aria-describedby", helpId);
    let initialized = false;
    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      map.invalidateSize({ animate: false });
      if (!initialized) {
        initialized = true;
        const camera = latest.current.initialCamera;
        if (camera)
          map.setView([camera.latitude, camera.longitude], camera.zoom, {
            animate: false,
          });
        else if (latest.current.initialExtent.length)
          map.fitBounds(latLngBounds(latest.current.initialExtent), {
            padding: [32, 32],
            maxZoom: 12,
            animate: false,
          });
        else
          map.fitBounds(LOUISIANA_BOUNDS, {
            padding: [12, 12],
            animate: false,
          });
      }
      applyRequest();
      report();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, [map, helpId, appliedRequest]);
  useEffect(() => {
    applyRequest();
  }, [map, request?.token]);
  return null;
}
