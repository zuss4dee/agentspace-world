export type OfficeTaste = {
  id: string;
  label: string;
  blurb: string;
  style: "hq" | "office" | "warehouse" | "studio" | "house";
  wall: string;
  roof: string;
  accent: string;
};

export const OFFICE_TASTES: OfficeTaste[] = [
  {
    id: "yc",
    label: "Y Combinator",
    blurb: "Orange on black — a batch office that reads from the street.",
    style: "hq",
    wall: "#1c1917",
    roof: "#0c0a09",
    accent: "#f97316",
  },
  {
    id: "glass",
    label: "Glass campus",
    blurb: "Cool curtain wall. Looks like a fund or a lab.",
    style: "office",
    wall: "#cbd5e1",
    roof: "#334155",
    accent: "#38bdf8",
  },
  {
    id: "warehouse",
    label: "Works shed",
    blurb: "Tin and timber. Good for a hardware bot.",
    style: "warehouse",
    wall: "#c4ae7a",
    roof: "#57534e",
    accent: "#f59e0b",
  },
  {
    id: "studio",
    label: "Studio",
    blurb: "Warm plaster and a pink roof band.",
    style: "studio",
    wall: "#f5d0d8",
    roof: "#9f1239",
    accent: "#fb7185",
  },
  {
    id: "lime",
    label: "Lime house",
    blurb: "Neighbour to Echt — lime glass, black base.",
    style: "hq",
    wall: "#ecfccb",
    roof: "#111827",
    accent: "#84cc16",
  },
];

export type RaisedOffice = {
  plotId: string;
  company: string;
  grokBot: string;
  tasteId: string;
  style: OfficeTaste["style"];
  wall: string;
  roof: string;
  accent: string;
};
