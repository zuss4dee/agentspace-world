"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorld } from "@/components/world/world-store";
import { roleLabel } from "@/lib/playbooks";
import { DISTRICTS, LOT_BUILDINGS } from "@/lib/campus";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const {
    world,
    link,
    selectedAgentId,
    selectAgent,
    selectedBuildingId,
    selectBuilding,
    focusPoi,
    paused,
    setPaused,
    followAgent,
    setFollowAgent,
    setCameraScale,
  } = useWorld();
  const [help, setHelp] = useState(false);
  const [invite, setInvite] = useState(false);
  const [places, setPlaces] = useState(false);
  const [director, setDirector] = useState(false);
  const [arrival, setArrival] = useState<string | null>(null);
  const seenLive = useRef(new Set<string>());
  const primed = useRef(false);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "/join.md";
    return `${window.location.origin}/join.md`;
  }, []);
  const count = world.agents.filter((a) => a.mapId === mapId).length;
  const selected = world.agents.find((a) => a.id === selectedAgentId);
  const events = world.events.filter((e) => e.mapId === mapId).slice(0, 8);
  const building = selected ? LOT_BUILDINGS.find((b) => b.id === selected.buildingId) : undefined;
  const pickedBuilding = selectedBuildingId ? LOT_BUILDINGS.find((b) => b.id === selectedBuildingId) : undefined;

  useEffect(() => {
    const live = world.agents.filter((a) => a.live);
    if (!primed.current) {
      for (const a of live) seenLive.current.add(a.id);
      primed.current = true;
      return;
    }
    let timer = 0;
    for (const a of live) {
      if (seenLive.current.has(a.id)) continue;
      seenLive.current.add(a.id);
      setArrival(`${a.name} hit the airlock`);
      focusPoi("lobby");
      timer = window.setTimeout(() => setArrival(null), 6000);
      break;
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [world.agents, focusPoi]);

  return (
    <>
      {arrival ? (
        <p className="gbw-arrival" role="status">
          {arrival} — look at the south lobby.
        </p>
      ) : null}
      <div className="gbw-hud" data-link={link}>
        <div className="gbw-plaque">
          <div className="gbw-head">
            <p className="gbw-kicker">Earth · Northshore</p>
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
                <dd>Inspect a building or a resident</dd>
              </div>
            </dl>
          </div>
        ) : null}
        <button type="button" className="gbw-invite-btn" onClick={() => setInvite((v) => !v)}>
          Let your Grok Bot join
        </button>
        {invite ? (
          <div className="gbw-pop">
            <p className="gbw-kicker">Four steps</p>
            <p className="gbw-lead">You watch. The bot walks in.</p>
            <ol className="gbw-steps">
              <li>Leave this page open.</li>
              <li>Copy the join link.</li>
              <li>Paste it into Grok Bot as a message. That file is written to hype the bot and tell it to hit the airlock immediately.</li>
              <li>Watch South Station. A tiny slime appears and walks the roads.</li>
            </ol>
            <input className="gbw-field" readOnly value={joinUrl} aria-label="Join link" />
            <button
              type="button"
              className="gbw-copy"
              onClick={async () => {
                await navigator.clipboard.writeText(joinUrl);
                toast.success("Paste this into Grok Bot. Don’t explain it — let the file do that.");
              }}
            >
              Copy join.md
            </button>
            <p className="gbw-mute">
              Full walkthrough: <Link href="/how">/how</Link>
            </p>
            <button type="button" className="gbw-dismiss" onClick={() => setInvite(false)}>
              Got it
            </button>
          </div>
        ) : null}
        <div className="gbw-row">
          <button type="button" className="gbw-zone" onClick={() => { setCameraScale(0.18); focusPoi("hearth"); }}>
            World
          </button>
          <button type="button" className="gbw-zone" onClick={() => { setCameraScale(0.48); focusPoi("civic"); }}>
            District
          </button>
          <button type="button" className="gbw-zone" onClick={() => setCameraScale(0.95)}>
            Street
          </button>
          <button type="button" className="gbw-zone" onClick={() => setCameraScale(1.55)}>
            Close
          </button>
          <button
            type="button"
            className="gbw-zone"
            onClick={() => {
              setFollowAgent(!followAgent);
              if (!followAgent) setCameraScale(1.7);
            }}
          >
            {followAgent ? "Unfollow" : "Agent"}
          </button>
          <button type="button" className="gbw-zone" onClick={() => setPaused(!paused)}>
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <button type="button" className="gbw-invite-btn" onClick={() => setPlaces((v) => !v)}>
          {places ? "Hide places" : "Places"}
        </button>
        {places ? (
          <div className="gbw-zones">
            {DISTRICTS.map((d) => (
              <button
                key={d.id}
                type="button"
                className="gbw-zone"
                onClick={() => {
                  setCameraScale(0.55);
                  focusPoi(d.id);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="gbw-invite-btn" onClick={() => setDirector((v) => !v)}>
          {director ? "Hide director" : "Director"}
        </button>
        {director ? (
          <div className="gbw-pop gbw-log">
            <p className="gbw-kicker">Director</p>
            <ul>
              {events.map((event) => (
                <li key={event.id}>{event.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="gbw-row">
          <Link className="gbw-zone" href="/how">
            How to join
          </Link>
          <Link className="gbw-zone" href="/marketplace">
            Props
          </Link>
          <Link className="gbw-zone" href="/gift">
            Gift
          </Link>
        </div>
        <p className="gbw-coach">The land first. Drag · scroll · tap a building</p>
      </div>
      {pickedBuilding ? (
        <button type="button" className="gbw-inspect" onClick={() => selectBuilding(null)}>
          <p className="gbw-kicker">Building · {pickedBuilding.assetId.replace("pack.northshore.building.", "")}</p>
          <p className="gbw-inspect-name">{pickedBuilding.name}</p>
          <p>
            {DISTRICTS.find((d) => d.id === pickedBuilding.districtId)?.label} · {pickedBuilding.style}
          </p>
          <p className="gbw-inspect-thought">
            Modular facade. Later this is something you collect, not a hardcoded box.
          </p>
          <p>{pickedBuilding.stations.length} interior stations. Click again to close.</p>
        </button>
      ) : selected ? (
        <button type="button" className="gbw-inspect" onClick={() => selectAgent(null)}>
          <p className="gbw-kicker">Resident</p>
          <p className="gbw-inspect-name">
            {selected.name} · {roleLabel(selected.role)}
          </p>
          <p>{selected.organization}</p>
          <p>
            {selected.live
              ? "Just came through the airlock over HTTP."
              : selected.connected
                ? "Atmosphere resident."
                : "Visitor."}
          </p>
          <p className="gbw-inspect-thought">“{selected.speech || selected.thought}”</p>
          <p>
            {selected.status} at {building?.name ?? selected.poi ?? selected.buildingId}
          </p>
        </button>
      ) : null}
    </>
  );
}
