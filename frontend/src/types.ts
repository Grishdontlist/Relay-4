// Mirrors backend/app/schemas.py. Missing facts stay null.
export type IncidentStatus = "intake" | "needs_review" | "reviewed";

export type Incident = {
  id: string;
  incident_type: string | null;
  description: string | null;
  location: string | null;
  landmark: string | null;
  hazard: string | null;
  people_count: number | null;
  injuries: string | null;
  location_confirmed: boolean;
  status: IncidentStatus;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Evidence = {
  id: string;
  source_quote: string;
  transcript_reference: string | null;
  verification_status: "unverified" | "verified";
  created_at: string;
};

export type IncidentDetail = Incident & { evidence: Evidence[] };

export type LatLng = [number, number];
