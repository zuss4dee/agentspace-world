"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Activity } from "lucide-react";
import { DEMO_AGENTS } from "@/lib/simulation";
import { mergeWorkspaceBots, type LiveWorldAgent, type WorkspaceBot } from "@/lib/bot-workspace";
import { roleLabel } from "@/lib/playbooks";

const BotWorkspaceCanvas = dynamic(
  () => import("@/components/world/bot-workspace/bot-workspace-canvas").then((m) => m.BotWorkspaceCanvas),
  {
    ssr: false,
    loading: () => <div className="size-full bg-[#1c1814]" />,
  },
);

export function BotWorkspaceView() {
  const [liveAgents, setLiveAgents] = useState<LiveWorldAgent[]>([]);
  const [link, setLink] = useState<"connecting" | "live" | "offline">("connecting");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/v1/world", { cache: "no-store" });
        if (!res.ok) throw new Error("world");
        const data = (await res.json()) as { agents: LiveWorldAgent[] };
        if (stop) return;
        setLink("live");
        setLiveAgents(data.agents);
      } catch {
        if (!stop) setLink("offline");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const bots = useMemo(() => mergeWorkspaceBots(DEMO_AGENTS, liveAgents), [liveAgents]);
  const selected = bots.find((b) => b.id === selectedId) ?? null;
  const liveCount = bots.filter((b) => b.live).length;

  return (
    <div className="relative min-h-0 flex-1">
      <BotWorkspaceCanvas bots={bots} selectedId={selectedId} onSelect={setSelectedId} />
      <div className="gbw-hud pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between gap-3 p-3" data-link={link}>
        <div className="gbw-plaque pointer-events-auto max-w-sm">
          <div className="gbw-head">
            <p className="gbw-kicker">Open floor</p>
            <h1 className="font-heading text-lg tracking-tight">Bot workspace</h1>
          </div>
          <p className="gbw-mute text-pretty text-xs">
            Among Us-style top-down crew view — your Grok bots at their stations. Demo agents fill empty seats; live
            airlock sessions replace by name.
          </p>
          <div className="gbw-presence mt-2">
            <span className="gbw-led" aria-hidden />
            <span className="gbw-status">
              {link === "live" ? `${liveCount} live · ${bots.length} total` : link === "connecting" ? "Syncing…" : "Offline demo crew"}
            </span>
          </div>
        </div>
        <nav className="pointer-events-auto flex flex-wrap items-start gap-2 text-xs">
          <Link href="/" className="gbw-zone">
            Campus map
          </Link>
          <Link href="/connect" className="gbw-invite-btn">
            Connect bot
          </Link>
        </nav>
      </div>
      <aside className="gbw-inspect pointer-events-auto absolute right-3 bottom-3 z-10 w-[min(100%,18rem)]">
        {selected ? (
          <BotDetail bot={selected} />
        ) : (
          <div>
            <p className="gbw-inspect-name">Your crew</p>
            <p className="gbw-mute mb-2 text-xs">Click a character to inspect their station.</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {bots.map((bot) => (
                <li key={bot.id}>
                  <button
                    type="button"
                    className="gbw-row w-full justify-between text-left"
                    onClick={() => setSelectedId(bot.id)}
                  >
                    <span>{bot.name}</span>
                    <span className="gbw-mute">{roleLabel(bot.role)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function BotDetail({ bot }: { bot: WorkspaceBot }) {
  return (
    <>
      <p className="gbw-inspect-name">{bot.name}</p>
      <p className="gbw-inspect-thought">
        {roleLabel(bot.role)} · {bot.status}
        {bot.live ? " · live" : " · simulated"}
      </p>
      <p className="text-sm">{bot.task}</p>
      {bot.thought && bot.thought !== bot.task ? (
        <p className="gbw-mute mt-2 text-xs italic">{bot.thought}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="size-3.5" aria-hidden />
        {bot.connected ? "Connected" : "Signal lost"}
      </div>
    </>
  );
}
