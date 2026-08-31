"use client";

import { Building2, X } from "lucide-react";
import { QUICK_PRESETS, applyPreset } from "@/lib/building-grammar";
import { specifyBuilding } from "@/lib/building-ai";
import { kitIdFor, modulesForSlot, registerPack } from "@/lib/city-kit";
import { GRAMMAR_SLOTS, setModule, type GrammarSlot } from "@/lib/building-spec";
import { useWorld, type StudioMode } from "@/components/world/world-store";

const CUSTOMISE_SLOTS: GrammarSlot[] = ["roof", "wall", "entrance", "window"];

export function BuildingStudio() {
  const {
    studioOpen,
    setStudioOpen,
    studioMode,
    setStudioMode,
    draftSpec,
    upsertBuildingSpec,
    selectedPlotId,
    selectedBuildingId,
    saveCreatorPack,
  } = useWorld();

  if (!studioOpen) {
    return (
      <button type="button" className="ns-studio-toggle" aria-label="Building studio" onClick={() => setStudioOpen(true)}>
        <Building2 className="size-4" />
      </button>
    );
  }

  return (
    <aside className="ns-studio" aria-label="Building studio">
      <div className="ns-card">
        <div className="ns-studio-head">
          <p className="ns-plot-kicker">Studio</p>
          <button type="button" className="ns-icon-btn" aria-label="Close studio" onClick={() => setStudioOpen(false)}>
            <X className="size-4" />
          </button>
        </div>
        <div className="ns-studio-modes">
          {(["quick", "customise", "creator"] as StudioMode[]).map((m) => (
            <button key={m} type="button" className="ns-chip" data-on={studioMode === m ? "1" : "0"} onClick={() => setStudioMode(m)}>
              {m === "quick" ? "Quick Build" : m === "customise" ? "Customise" : "Creator"}
            </button>
          ))}
        </div>
        {!draftSpec ? (
          <p className="ns-plot-copy">Select a lot or a company building.</p>
        ) : studioMode === "quick" ? (
          <ul className="ns-studio-list">
            {QUICK_PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="ns-chip"
                  data-on={draftSpec.family === p.family ? "1" : "0"}
                  onClick={() => upsertBuildingSpec(applyPreset(draftSpec, p))}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        ) : studioMode === "customise" ? (
          <div className="ns-studio-slots">
            {CUSTOMISE_SLOTS.map((slot) => (
              <SlotRow key={slot} slot={slot} />
            ))}
          </div>
        ) : (
          <CreatorBody />
        )}
        <p className="ns-studio-foot">
          {draftSpec ? `${draftSpec.family} · v${draftSpec.version}` : selectedPlotId || selectedBuildingId || "No target"}
        </p>
      </div>
    </aside>
  );
}

function SlotRow({ slot }: { slot: GrammarSlot }) {
  const { draftSpec, upsertBuildingSpec } = useWorld();
  if (!draftSpec) return null;
  const current = draftSpec.modules.find((m) => m.slot === slot)?.variant;
  const mods = modulesForSlot(slot);
  return (
    <div className="ns-studio-slot">
      <p className="ns-plot-mute">{slot}</p>
      <div className="ns-studio-list">
        {mods.map((m) => (
          <button
            key={m.id}
            type="button"
            className="ns-chip"
            data-on={current === m.variant ? "1" : "0"}
            onClick={() => upsertBuildingSpec(setModule(draftSpec, slot, m.id, m.variant ?? m.slug))}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreatorBody() {
  const { draftSpec, upsertBuildingSpec, saveCreatorPack } = useWorld();
  if (!draftSpec) return null;
  return (
    <div className="ns-studio-creator">
      {GRAMMAR_SLOTS.map((slot) => (
        <SlotRow key={slot} slot={slot} />
      ))}
      <form
        className="ns-studio-ai"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const next = specifyBuilding({
            personality: String(fd.get("personality") ?? ""),
            industry: String(fd.get("industry") ?? ""),
            size: (String(fd.get("size") || "office") as "cottage" | "shop" | "office" | "campus"),
            architecturalStyle: String(fd.get("style") ?? ""),
            companyId: draftSpec.companyId,
            sign: draftSpec.signage.text,
            tilesW: draftSpec.footprint.tilesW,
            tilesH: draftSpec.footprint.tilesH,
            wall: draftSpec.materials.wall,
            roof: draftSpec.materials.roof,
            accent: draftSpec.materials.accent,
            wallDark: draftSpec.materials.wallDark,
          });
          upsertBuildingSpec({
            ...next,
            id: draftSpec.id,
            height: draftSpec.height,
            footprint: draftSpec.footprint,
          });
        }}
      >
        <input name="personality" placeholder="Personality" defaultValue="warm, ambitious" />
        <input name="industry" placeholder="Industry" defaultValue="tech" />
        <input name="style" placeholder="Architectural style" defaultValue="curtain" />
        <select name="size" defaultValue="office">
          <option value="cottage">Cottage</option>
          <option value="shop">Shop</option>
          <option value="office">Office</option>
          <option value="campus">Campus</option>
        </select>
        <button type="submit" className="ns-game-btn">
          Spec from brief
        </button>
      </form>
      <button
        type="button"
        className="ns-ghost"
        onClick={() => {
          const packId = `pack.user.${draftSpec.family}.${draftSpec.id}`;
          registerPack({
            id: packId,
            label: `${draftSpec.family} pack`,
            family: draftSpec.family,
            modules: draftSpec.modules.map((m) => ({
              id: m.kitId || kitIdFor(m.slot, m.variant),
              kind: "module" as const,
              slug: m.variant,
              family: m.slot,
              label: m.variant,
              slot: m.slot,
              variant: m.variant,
            })),
          });
          saveCreatorPack(packId);
          upsertBuildingSpec({ ...draftSpec, packId, version: draftSpec.version + 1 });
        }}
      >
        Save as pack
      </button>
    </div>
  );
}
