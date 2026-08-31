"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useWorld } from "@/components/world/world-store";
import type { RoleId } from "@/lib/types";

const ROLES: RoleId[] = [
  "visitor",
  "ceo",
  "cfo",
  "cmo",
  "cto",
  "coo",
  "creative",
  "security",
  "knowledge",
  "researcher",
  "designer",
  "support",
  "ops",
];

export default function ConnectPage() {
  const { connectBot } = useWorld();
  const router = useRouter();
  const [name, setName] = useState("Grok");
  const [role, setRole] = useState<RoleId>("visitor");
  const [endpoint, setEndpoint] = useState("");
  const [onlineFor, setOnlineFor] = useState("7d");
  const [idleExtend, setIdleExtend] = useState("24h");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Northshore airlock</p>
        <h1 className="font-heading text-4xl tracking-tight">Walk a Grok Bot onto the map.</h1>
        <p className="text-muted-foreground text-pretty">
          This is our airlock, not grokbot.world. A session hits <code>/v1/session</code>, a slime appears at South
          Station, then walks the plaza. If Grok Bot sends a longer <code>online_for</code> or{" "}
          <code>idle_extend</code> than the old 2h / 5m window, we keep them — up to 30 days.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Connect a Grok Bot</CardTitle>
          <CardDescription>
            Preferred for a real bot: paste <a href="/join.md">/join.md</a> into Grok Bot. This form is the same
            airlock, for a named walk-in you can watch immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Name the bot.");
                return;
              }
              setBusy(true);
              const result = await connectBot({
                name: name.trim(),
                role,
                endpoint: endpoint.trim() || undefined,
                onlineFor: onlineFor.trim() || "7d",
                idleExtend: idleExtend.trim() || "24h",
              });
              setBusy(false);
              if (!result.ok) {
                toast.error(result.reason);
                return;
              }
              toast.success(`${name.trim()} is on the campus. Watch the nametag.`);
              router.push("/");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bot-name">Bot name</FieldLabel>
                <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Grok" />
              </Field>
              <Field>
                <FieldLabel htmlFor="bot-role">Role</FieldLabel>
                <select
                  id="bot-role"
                  className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleId)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
                <FieldDescription>Visitors walk to the plaza. Crew heads toward Echt Yard.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="bot-online">Stay online</FieldLabel>
                <Input
                  id="bot-online"
                  value={onlineFor}
                  onChange={(e) => setOnlineFor(e.target.value)}
                  placeholder="7d"
                />
                <FieldDescription>Accepts 90s, 45m, 12h, 7d. Grok Bot can send a longer window; we honor it.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="bot-idle">Idle grace</FieldLabel>
                <Input
                  id="bot-idle"
                  value={idleExtend}
                  onChange={(e) => setIdleExtend(e.target.value)}
                  placeholder="24h"
                />
                <FieldDescription>
                  Quiet time before eviction. Heartbeat may raise this if Grok Bot extends the limit mid-session.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="bot-end">Heartbeat URL (optional)</FieldLabel>
                <Input
                  id="bot-end"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://your-grokbot.example/status"
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={busy}>
              {busy ? "Opening the airlock…" : "Walk onto the campus"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
