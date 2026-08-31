"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATALOG } from "@/lib/catalog";
import { useWorld } from "@/components/world/world-store";

const KIND_COPY: Record<string, string> = {
  furniture: "Drops onto the campus immediately.",
  building: "Cosmetic kit for a future plot.",
  environment: "Skies swap on the world camera.",
  outfit: "Wardrobe unlock for the crew.",
  decoration: "Dress the streets.",
  character: "Inhabitant skin.",
  vehicle: "Moves between districts later.",
};

export default function MarketplacePage() {
  const { world, buyProp } = useWorld();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex max-w-2xl flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Prop market
        </p>
        <h1 className="font-heading text-4xl tracking-tight">
          Buildings, chairs, skies, outfits.
        </h1>
        <p className="text-muted-foreground text-pretty">
          The engine stays open source. Building grammar packs plug into{" "}
          <code>registerPack</code> / <code>CITY_KIT.modules</code> — same BuildingSpec
          the city renderer instances. Furniture still drops on the grass.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((item) => {
          const owned = world.ownedCatalogIds.includes(item.id);
          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{item.name}</CardTitle>
                  <Badge variant="secondary">{item.kind}</Badge>
                </div>
                <CardDescription>{item.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm">{KIND_COPY[item.kind]}</p>
                <p className="text-muted-foreground text-xs">
                  ${item.price} · {item.creator} keeps {Math.round(item.creatorShare * 100)}%
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={owned && item.kind !== "furniture" ? "outline" : "default"}
                  onClick={() => {
                    const result = buyProp(item.id);
                    if (!result.ok) {
                      toast.error(result.reason);
                      return;
                    }
                    toast.success(
                      `Yours. ${item.creator} earns $${result.creatorPayout.toFixed(2)}.`,
                    );
                  }}
                >
                  {owned && item.kind !== "furniture" ? "Owned — apply" : `Buy · $${item.price}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
