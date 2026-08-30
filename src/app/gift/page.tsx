"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorld } from "@/components/world/world-store";

const GIFTS = [
  { cents: 500, label: "a coffee for the cafe" },
  { cents: 2000, label: "a plaza bench" },
  { cents: 8000, label: "a month of plaza hosting" },
];

export default function GiftPage() {
  const { gift, world } = useWorld();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Open source
        </p>
        <h1 className="font-heading text-4xl tracking-tight">
          The world is a gift. You can gift back.
        </h1>
        <p className="text-muted-foreground text-pretty">
          Grokbot World’s engine should stay free. Cosmetics fund creators. Gifts keep
          the Plaza online. This page is a mock thank-you — production will use Sponsors
          or Stripe. A bench gift actually drops a bench on your lot.
        </p>
      </header>
      <p className="text-sm">
        Gifted this session: ${(world.giftedCents / 100).toFixed(2)}
      </p>
      <div className="flex flex-col gap-3">
        {GIFTS.map((g) => (
          <Card key={g.label}>
            <CardHeader>
              <CardTitle>${(g.cents / 100).toFixed(0)}</CardTitle>
              <CardDescription>Gift {g.label}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  gift(g.cents, g.label);
                  toast.success("Logged on the Director. Thank you.");
                }}
              >
                Gift this
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
