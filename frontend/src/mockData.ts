import type { Snapshot } from "./types";
export const sampleData: Snapshot = {
  incidents: [
    {
      id: "R4-001",
      title: "Stranded vehicle",
      location: "Cypress Bend Market",
      detail: "West service entrance",
      hazards: "Rising water",
      people: "2 reported",
      injuries: "Unknown",
      status: "Location updated",
      callIds: ["CALL-001", "CALL-002"],
    },
    {
      id: "R4-002",
      title: "Road blocked",
      location: "Bayou Oak Lane",
      detail: "Exact location unknown",
      hazards: "Fallen tree reported",
      people: "Unknown",
      injuries: "Unknown",
      status: "Needs review",
      callIds: ["CALL-003"],
    },
    {
      id: "R4-003",
      title: "Smoke report",
      location: "Pelican Yard",
      detail: "Building unknown",
      hazards: "Smoke reported; source unknown",
      people: "Unknown",
      injuries: "Unknown",
      status: "Assigned",
      callIds: ["CALL-004"],
    },
  ],
  calls: [
    {
      id: "CALL-001",
      incidentId: "R4-001",
      language: "English",
      time: "10:42 AM",
      transcript: [
        {
          speaker: "Caller",
          text: "Our vehicle is stuck near Cypress Bend Market. There are two of us. The water is coming up.",
        },
        { speaker: "Intake", text: "Which entrance are you near?" },
        {
          speaker: "Caller",
          text: "The west service entrance. I cannot tell how deep the water is.",
        },
      ],
    },
    {
      id: "CALL-002",
      incidentId: "R4-001",
      language: "English",
      time: "10:45 AM",
      transcript: [
        {
          speaker: "Caller",
          text: "I can see a vehicle at the west service entrance of Cypress Bend Market. There is water around it.",
        },
        { speaker: "Intake", text: "Are you with the people in the vehicle?" },
        {
          speaker: "Caller",
          text: "No, I am across the street. I do not know whether anyone is hurt.",
        },
      ],
    },
    {
      id: "CALL-003",
      incidentId: "R4-002",
      language: "English",
      time: "10:46 AM",
      transcript: [
        {
          speaker: "Caller",
          text: "A tree is blocking Bayou Oak Lane. I do not know the nearest house number.",
        },
      ],
    },
    {
      id: "CALL-004",
      incidentId: "R4-003",
      language: "English",
      time: "10:48 AM",
      transcript: [
        {
          speaker: "Caller",
          text: "There is smoke at Pelican Yard. I cannot see where it is coming from.",
        },
      ],
    },
  ],
  units: [
    { id: "U04", name: "Rescue 04", capability: "Rescue unit" },
    { id: "U07", name: "Engine 07", capability: "Fire unit" },
    { id: "U12", name: "Support 12", capability: "Support unit" },
  ],
  assignments: [
    {
      id: "AS-001",
      incidentId: "R4-003",
      unitId: "U04",
      approvedBy: "Demo dispatcher",
      acknowledged: false,
    },
  ],
  activity: [
    {
      id: "ACT-001",
      time: "10:49 AM",
      title: "Assignment approved",
      detail:
        "Demo dispatcher assigned Rescue 04 to R4-003. Awaiting acknowledgement.",
      incidentId: "R4-003",
    },
    {
      id: "ACT-002",
      time: "10:45 AM",
      title: "Location corrected",
      detail:
        "Demo dispatcher updated location detail to West service entrance after reviewing CALL-002.",
      incidentId: "R4-001",
    },
  ],
};
