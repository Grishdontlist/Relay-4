import { useEffect, useState } from "react";
import { fetchIncident, fetchIncidents } from "./api";
import { geocode } from "./geocode";
import { parseTime } from "./format";
import type { Incident, IncidentDetail, LatLng } from "./types";

const POLL_MS = 4000;

export type Connection = "connecting" | "online" | "offline";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const list = await fetchIncidents();
        if (cancelled) return;
        setIncidents(list.sort((a, b) => parseTime(b.updated_at) - parseTime(a.updated_at)));
        setConnection("online");
      } catch {
        if (!cancelled) setConnection("offline");
      }
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { incidents, connection };
}

/** Full record (with caller statements) for the selected incident; refetched when it changes. */
export function useIncidentDetail(id: string | null, updatedAt: string | undefined) {
  const [detail, setDetail] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchIncident(id)
      .then((record) => !cancelled && setDetail(record))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, updatedAt]);

  return detail?.id === id ? detail : null;
}

/** location text → coordinates. Missing key = still looking up; null = not found. */
export function useGeocodes(incidents: Incident[]) {
  const [points, setPoints] = useState<Record<string, LatLng | null>>({});
  const key = [...new Set(incidents.map((incident) => incident.location).filter(Boolean))].join("\n");

  useEffect(() => {
    let cancelled = false;
    for (const location of key.split("\n").filter(Boolean)) {
      geocode(location).then((point) => {
        if (!cancelled) setPoints((prev) => (location in prev && prev[location] === point ? prev : { ...prev, [location]: point }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return points;
}

export function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export type Assignment = { unitId: string; sentAt: string; report: string };
const ASSIGNMENTS_KEY = "relay4.assignments.v1";

/** Dispatcher-approved reports. Simulated: kept in this browser until the backend has an assignment API. */
export function useAssignments() {
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(() => {
    try {
      return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch {
      // Storage unavailable; assignments last for this session only.
    }
  }, [assignments]);

  const send = (incidentId: string, assignment: Assignment) => setAssignments((prev) => ({ ...prev, [incidentId]: assignment }));
  const cancel = (incidentId: string) =>
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[incidentId];
      return next;
    });

  return { assignments, send, cancel };
}
