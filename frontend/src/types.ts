export type IncidentCategory =
  "accident" | "fire" | "medical" | "flood" | "weather" | "other";
export type UnitDiscipline = "fire" | "ems" | "rescue" | "support";
export type Coordinates = {
  latitude: number;
  longitude: number;
  source: "simulated" | "reported";
};
export type Incident = {
  category: IncidentCategory;
  tags: (IncidentCategory | "road-blockage")[];
  responseNeeds: UnitDiscipline[];
  source: string;
  reportedAt: string;
  updatedAt: string;
  id: string;
  title: string;
  location: string;
  detail: string;
  hazards: string;
  people: string;
  injuries: string;
  status: "Needs review" | "Location updated" | "Assigned";
  callIds: string[];
  coordinates: Coordinates | null;
};
export type Call = {
  id: string;
  incidentId: string | null;
  language: string;
  time: string;
  transcript: { speaker: string; text: string }[];
};
export type Assignment = {
  id: string;
  incidentId: string;
  unitId: string;
  approvedBy: string;
  acknowledged: boolean;
  source: string;
  approvedAt: string;
  acknowledgedAt: string | null;
};
export type Unit = {
  id: string;
  name: string;
  capability: string;
  discipline: UnitDiscipline;
  coordinates: Coordinates | null;
  source: string;
  updatedAt: string;
};
export type ContextFeature = {
  id: string;
  name: string;
  description: string;
  source: string;
  updatedAt: string;
  geometry:
    | { type: "point"; position: Coordinates | null }
    | { type: "polygon" | "line"; positions: Coordinates[] };
};
export type ContextLayer = {
  id: string;
  name: string;
  state: "synthetic" | "connected" | "unavailable" | "loading" | "error";
  source: string;
  updatedAt: string | null;
  message?: string;
  features: ContextFeature[];
};
export type Activity = {
  id: string;
  time: string;
  title: string;
  detail: string;
  incidentId: string;
};
export type Snapshot = {
  incidents: Incident[];
  calls: Call[];
  units: Unit[];
  assignments: Assignment[];
  activity: Activity[];
  contextLayers: ContextLayer[];
};
export type Correction = {
  field: "location" | "detail" | "hazards" | "people" | "injuries";
  value: string;
  reason: string;
};
