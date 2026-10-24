export type Incident = {
  id: string;
  title: string;
  location: string;
  detail: string;
  hazards: string;
  people: string;
  injuries: string;
  status: "Needs review" | "Location updated" | "Assigned";
  callIds: string[];
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
};
export type Unit = { id: string; name: string; capability: string };
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
};
export type Correction = {
  field: "location" | "detail" | "hazards" | "people" | "injuries";
  value: string;
  reason: string;
};
