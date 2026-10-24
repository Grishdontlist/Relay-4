import type { Incident } from "../types";
import { tagLabels } from "../gis";
export default function IncidentTags({ incident }: { incident: Incident }) {
  return (
    <div className="incident-tags" aria-label="Incident type and tags">
      {tagLabels(incident).map((label) => (
        <span
          key={label}
          className={`incident-tag tag-${label === "Fire hazard" ? "fire" : incident.category}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
