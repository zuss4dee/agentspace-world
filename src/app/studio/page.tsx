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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorld } from "@/components/world/world-store";

export default function StudioPage() {
  const { submitStudio } = useWorld();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("furniture");
  const [notes, setNotes] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Creator studio
        </p>
        <h1 className="font-heading text-4xl tracking-tight">
          Build a prop. Earn when it sells.
        </h1>
        <p className="text-muted-foreground text-pretty">
          Submit a building, table, sky, or outfit. Review is manual in this slice —
          Orbit crates the intake in the warehouse and the Director writes it down.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Intake</CardTitle>
          <CardDescription>Local only. No listing goes live until we run a real catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Name the prop.");
                return;
              }
              submitStudio(name.trim(), kind, notes.trim());
              toast.success("In the warehouse queue.");
              setName("");
              setNotes("");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prop-name">Name</FieldLabel>
                <Input
                  id="prop-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Last Light sky"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prop-kind">Kind</FieldLabel>
                <Input
                  id="prop-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  placeholder="furniture, building, environment, outfit"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prop-notes">Notes for review</FieldLabel>
                <Textarea
                  id="prop-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Silhouette reads at 32px. Warm windows. No logos."
                />
              </Field>
            </FieldGroup>
            <Button type="submit">Submit to warehouse</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
