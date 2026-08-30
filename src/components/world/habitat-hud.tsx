"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorld } from "@/components/world/world-store";
import { roleLabel } from "@/lib/playbooks";
import { BuildingPopup } from "@/components/world/building-popup";
import { DISTRICTS } from "@/lib/campus";
import { ALL_BUILDINGS } from "@/lib/city-gen";
import { WORLD_SECTIONS } from "@/lib/world-sections";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const {
    world,
    link,
    selectedAgentId,
    selectAgent,
    selectedBuildingId,
    selectBuilding,
    selectedDistrictId,
    selectDistrict,
    enterBuilding,
    exitInterior,
    interiorId,
    focusPoi,
    focusCoord,
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
  const [chrome, setChrome] = useState(false);
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
  const building = selected ? ALL_BUILDINGS.find((b) => b.id === selected.buildingId) : undefined;
  const pickedBuilding = selectedBuildingId ? ALL_BUILDINGS.find((b) => b.id === selectedBuildingId) : undefined;
  const lockedSection = selectedDistrictId?.startsWith("locked:")
    ? WORLD_SECTIONS.find((s) => s.id === selectedDistrictId.slice(7))
    : undefined;
  const pickedDistrict =
    selectedDistrictId && selectedDistrictId !== "street" && !selectedDistrictId.startsWith("locked:")
      ? DISTRICTS.find((d) => d.id === selectedDistrictId)
      : undefined;
  const directorLines = world.agents
    .filter((a) => a.mapId === mapId && !a.live)
    .slice(0, 10)
    .map((a) => `${a.name} is ${a.task.charAt(0).toLowerCase()}${a.task.slice(1)}`);

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
      {chrome ? (
      <div className="gbw-hud" data-link={link}>
        <div className="gbw-plaque">
          <div className="gbw-head">
            <p className="gbw-kicker">Earth · {place}</p>
            <button type="button" className="gbw-help" aria-label="Hide interface" onClick={() => setChrome(false)}>
              Hide
            </button>
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
                <dd>Left-drag pan · WASD · scroll zoom · right-drag tilt</dd>
              </div>
              <div>
                <dt>Double</dt>
                <dd>Fly to that patch of land</dd>
              </div>
              <div>
                <dt>Tap</dt>
                <dd>Inspect a street, district, building, or resident</dd>
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
          {places ? "Hide neighbourhood" : "Neighbourhood"}
        </button>
        {places ? (
          <div className="gbw-zones">
            {DISTRICTS.map((d) => (
              <button
                key={d.id}
                type="button"
                className="gbw-zone"
                onClick={() => {
                  selectDistrict(d.id);
                  focusCoord(d.origin.x + d.size.x / 2, d.origin.y + d.size.y / 2, 0.5);
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
              {directorLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {events.slice(0, 4).map((event) => (
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
        <p className="gbw-coach">Drag across the city. The map is a window, not a board.</p>
      </div>
      ) : (
        <div className="gbw-hud gbw-hud-min" data-link={link}>
          <button type="button" className="gbw-invite-btn" onClick={() => setChrome(true)}>
            Show UI
          </button>
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
          </div>
        </div>
      )}
      {interiorId ? (
        <button type="button" className="gbw-inside" onClick={exitInterior}>
          Inside {ALL_BUILDINGS.find((b) => b.id === interiorId)?.name} — return to the world
        </button>
      ) : null}
      {pickedBuilding ? (
        <BuildingPopup
          building={pickedBuilding}
          agents={world.agents}
          interiorId={interiorId}
          onClose={() => selectBuilding(null)}
          onEnter={() => enterBuilding(pickedBuilding.id)}
          onLeave={exitInterior}
        />
      ) : selected ? (
        <div className="gbw-inspect">
          <p className="gbw-kicker">{roleLabel(selected.role)}</p>
          <p className="gbw-inspect-name">{selected.name}</p>
          <p>Currently {selected.status === "walking" ? "on the street" : selected.status}</p>
          <p>{selected.task}</p>
          <p>Location · {building?.name ?? selected.poi ?? "Northshore"}</p>
          {selected.speech || selected.thought ? (
            <p className="gbw-inspect-thought">“{selected.speech || selected.thought}”</p>
          ) : null}
          <div className="gbw-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="gbw-zone"
              onClick={() => {
                setFollowAgent(true);
                setCameraScale(1.7);
              }}
            >
              Follow
            </button>
            <button type="button" className="gbw-zone" onClick={() => selectAgent(null)}>
              Close
            </button>
          </div>
        </div>
      ) : lockedSection ? (
        <button type="button" className="gbw-inspect" onClick={() => selectDistrict(null)}>
          <p className="gbw-kicker">Coming soon</p>
          <p className="gbw-inspect-name">{lockedSection.label}</p>
          <p>{lockedSection.blurb}</p>
          <p>This chapter of the world is locked. Starter City stays open.</p>
        </button>
      ) : pickedDistrict ? (
        <button type="button" className="gbw-inspect" onClick={() => selectDistrict(null)}>
          <p className="gbw-kicker">District</p>
          <p className="gbw-inspect-name">{pickedDistrict.label}</p>
          <p>{pickedDistrict.blurb}</p>
          <p>
            {ALL_BUILDINGS.filter((b) => b.districtId === pickedDistrict.id).length} places ·{" "}
            {world.agents.filter((a) => {
              const home = ALL_BUILDINGS.find((b) => b.id === a.buildingId);
              return home?.districtId === pickedDistrict.id;
            }).length}{" "}
            agents tied here
          </p>
        </button>
      ) : selectedDistrictId === "street" ? (
        <button type="button" className="gbw-inspect" onClick={() => selectDistrict(null)}>
          <p className="gbw-kicker">Street</p>
          <p className="gbw-inspect-name">Arterial</p>
          <p>Cars and walkers use this grid. Double-click to drop in closer.</p>
        </button>
      ) : null}
      {chrome && directorLines[0] ? (
        <p className="gbw-ticker" role="status">
          {directorLines[0]}
        </p>
      ) : null}
      <nav className="gbw-worldnav" aria-label="World sections">
        {WORLD_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="gbw-worldnav-item"
            data-locked={s.locked ? "1" : "0"}
            onClick={() => {
              if (s.locked) {
                selectDistrict(`locked:${s.id}`);
                return;
              }
              selectDistrict(null);
              focusPoi("civic");
              setCameraScale(0.55);
            }}
          >
            {s.locked ? "🔒 " : "● "}
            {s.label}
          </button>
        ))}
      </nav>
    </>
  );
}
