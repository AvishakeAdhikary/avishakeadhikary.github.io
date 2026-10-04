import { profile } from "./profile";

/** Real places connected to the work: production cloud + where the research is published. */
export const GLOBE_HOME = { id: "kolkata", label: "Kolkata, India", location: [profile.location.lat, profile.location.lng] as [number, number] };

export const GLOBE_POINTS = [
  { id: "scaleway", label: "Paris: Scaleway cloud running ZoyeMed", location: [48.8566, 2.3522] as [number, number] },
  { id: "springer", label: "Cham, Switzerland: Springer", location: [47.1758, 8.4622] as [number, number] },
  { id: "wiley", label: "Hoboken, USA: John Wiley & Sons", location: [40.744, -74.0324] as [number, number] },
  { id: "tandf", label: "Abingdon, UK: Taylor & Francis", location: [51.6708, -1.2879] as [number, number] },
];
