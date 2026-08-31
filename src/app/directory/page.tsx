"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { directoryEntries, ZONE_TABLE, ZONE_THEME, type DirectoryEntry } from "@/lib/city-shop";
import type { PlotZone } from "@/lib/plots";

const FILTERS: { id: "all" | PlotZone; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ultimate", label: "Beacon" },
  { id: "downtown", label: "Downtown" },
  { id: "midtown", label: "Midtown" },
  { id: "uptown", label: "Uptown" },
  { id: "outskirts", label: "Outskirts" },
];

export default function DirectoryPage() {
  const all = useMemo(() => directoryEntries(), []);
  const [q, setQ] = useState("");
  const [zone, setZone] = useState<(typeof FILTERS)[number]["id"]>("all");
  const rows = all.filter((row) => {
    if (zone !== "all" && row.zone !== zone) return false;
    const hay = `${row.name} ${row.tagline} ${row.buildingName}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="ns-dir">
      <header className="ns-dir-head">
        <div>
          <p className="ns-dir-kicker">Building Directory</p>
          <h1>Companies on the map</h1>
          <p>Each listing is a workplace already standing in Agentspace. Open the map to stand in front of it.</p>
        </div>
        <Link href="/" className="ns-game-btn ns-dir-map">
          View on map
        </Link>
      </header>
      <div className="ns-dir-filters">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" data-on={zone === f.id ? "1" : "0"} onClick={() => setZone(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <input
        className="ns-dir-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search buildings by name, industry, or tagline…"
        aria-label="Search directory"
      />
      <div className="ns-dir-grid">
        {rows.map((row) => (
          <DirectoryCard key={row.id} row={row} />
        ))}
        {rows.length === 0 ? <p className="ns-dir-empty">No buildings match that filter.</p> : null}
      </div>
    </div>
  );
}

function DirectoryCard({ row }: { row: DirectoryEntry }) {
  const theme = ZONE_THEME[row.zone];
  const zoneLabel = ZONE_TABLE.find((z) => z.key === row.zone)?.zone ?? theme.label;
  return (
    <article className="ns-dir-card">
      <div className="ns-dir-thumb">
        <span>{row.name.slice(0, 1)}</span>
      </div>
      <div className="ns-dir-body">
        <h2>{row.name}</h2>
        <p>{row.tagline}</p>
        <div className="ns-plot-badges">
          <span className="ns-badge">{zoneLabel}</span>
          <span className="ns-badge">{row.buildingName}</span>
        </div>
        <Link href={`/?plot=${row.plotId}`} className="ns-game-btn">
          View on map
        </Link>
      </div>
    </article>
  );
}
