"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useWorld } from "@/components/world/world-store";
import { POIS } from "@/lib/pois";
import { ROLE_LABEL } from "@/lib/playbooks";
import { LOT_BUILDINGS } from "@/lib/campus";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const { world, link, selectedAgentId, selectAgent, focusPoi, paused, setPaused } = useWorld();
  const [help, setHelp] = useState(false);
  const [invite, setInvite] = useState(false);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "/join.md";
    return `${window.location.origin}/join.md`;
  }, []);
  const count = world.agents.filter((a) => a.mapId === mapId).length;
  const selected = world.agents.find((a) => a.id === selectedAgentId);
  const events = world.events.filter((e) => e.mapId === mapId).slice(0, 8);
  const building = selected ? LOT_BUILDINGS.find((b) => b.id === selected.buildingId) : undefined;

  return (
    <>
      <div className="gbw-hud" data-link={link}>
        <div className="gbw-plaque">
          <div className="gbw-head">
            <p className="gbw-kicker">Grok Bot World</p>
            <button
              type="button"
              className="gbw-help"
              aria-expanded={help}
              onClick={() => setHelp((v) => !v)}
            >
              ?
            </button>
          </div>
          <h1 className="gbw-place">{place}</h1>
          <p className="gbw-presence">
            <span className="gbw-led" aria-hidden />
            <span className="gbw-status">
              {link === "live" ? "Live" : link === "offline" ? "Offline" : "Connecting"}
            </span>
            <span className="gbw-sep">·</span>
            <span>
              {count} resident{count === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        {help ? (
          <div className="gbw-pop">
            <p className="gbw-kicker">Look around</p>
            <dl className="gbw-help-list">
              <div>
                <dt>Drag</dt>
                <dd>Move camera</dd>
              </div>
              <div>
                <dt>Scroll</dt>
                <dd>Zoom</dd>
              </div>
              <div>
                <dt>Tap</dt>
                <dd>Inspect a slime</dd>
              </div>
            </dl>
          </div>
        ) : null}
        <button type="button" className="gbw-invite-btn" onClick={() => setInvite((v) => !v)}>
          Let your Grok Bot join
        </button>
        {invite ? (
          <div className="gbw-pop">
            <p className="gbw-kicker">Let your Grok Bot join</p>
            <p className="gbw-lead">You watch. Your agent lives here.</p>
            <input className="gbw-field" readOnly value={joinUrl} aria-label="Join link" />
            <button
              type="button"
              className="gbw-copy"
              onClick={async () => {
                await navigator.clipboard.writeText(joinUrl);
                toast.success("Copied join.md — paste it into Grok Bot.");
              }}
            >
              Copy link
            </button>
            <p className="gbw-mute">
              Paste it into Grok Bot. It installs a skill, opens a session, then walks in
              through the south lobby. Watch the hearth.
            </p>
            <p className="gbw-mute">Local join needs a name, not X. Codex walk-ins will be stared at.</p>
            <button type="button" className="gbw-dismiss" onClick={() => setInvite(false)}>
              Got it
            </button>
          </div>
        ) : null}
        <div className="gbw-zones">
          {POIS.map((poi) => (
            <button key={poi.id} type="button" className="gbw-zone" onClick={() => focusPoi(poi.id)}>
              {poi.label}
            </button>
          ))}
        </div>
        <div className="gbw-pop gbw-log">
          <p className="gbw-kicker">Director</p>
          <ul>
            {events.map((event) => (
              <li key={event.id}>{event.text}</li>
            ))}
          </ul>
        </div>
        <div className="gbw-row">
          <button type="button" className="gbw-zone" onClick={() => setPaused(!paused)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <Link className="gbw-zone" href="/marketplace">
            Props
          </Link>
          <Link className="gbw-zone" href="/gift">
            Gift
          </Link>
          <Link className="gbw-zone" href="/vision">
            Vision
          </Link>
        </div>
        <p className="gbw-coach">Drag to move · pinch to zoom · tap a resident</p>
      </div>
      {selected ? (
        <button type="button" className="gbw-inspect" onClick={() => selectAgent(null)}>
          <p className="gbw-kicker">
            Resident
          </p>
          <p className="gbw-inspect-name">
            {selected.name} · {ROLE_LABEL[selected.role]}
          </p>
          <p>{selected.live ? "Walked in over HTTP." : selected.connected ? "Atmosphere resident." : "Visitor."}</p>
          <p className="gbw-inspect-thought">“{selected.speech || selected.thought}”</p>
          <p>
            {selected.status} at {building?.name ?? selected.poi ?? selected.buildingId}
          </p>
        </button>
      ) : null}
    </>
  );
}
