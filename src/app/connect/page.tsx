"use client";

import { useState } from "react";
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

const ROLES: RoleId[] = ["ceo", "cfo", "cmo", "cto", "researcher", "designer", "support", "ops"];

export default function ConnectPage() {
  const { connectBot } = useWorld();
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>("cto");
  const [endpoint, setEndpoint] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Grokbot adapter
        </p>
        <h1 className="font-heading text-4xl tracking-tight">
          Walk your bot onto the lot.
        </h1>
        <p className="text-muted-foreground text-pretty">
          Phase 1 is honest simulation: name, role, optional webhook. They spawn at the
          south path and walk to their building. Later, Grokbot will post heartbeats and
          we will just pathfind.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Connect a crew member</CardTitle>
          <CardDescription>
            No API key required. If you paste an endpoint we only echo it in their thought.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Name the bot.");
                return;
              }
              connectBot({ name: name.trim(), role, endpoint: endpoint.trim() });
              toast.success(`${name.trim()} is walking in. Watch the Lot.`);
              setName("");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bot-name">Bot name</FieldLabel>
                <Input
                  id="bot-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jules"
                />
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
                <FieldDescription>C-suite maps to the tower, studio, or factory.</FieldDescription>
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
            <Button type="submit">Connect onto the lot</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
