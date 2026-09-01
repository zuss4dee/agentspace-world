/**
 * AssetId-based registry for Blender-published GLBs.
 * PACK_GLTF is the runtime URL map used by R3F.
 */
export type AssetRecord = {
  assetId: string;
  kind: string;
  folder: string;
  url: string;
  componentIds?: string[];
  brandId?: string;
  buildingId?: string;
  footprintMeters?: { width: number; depth: number };
  heightMeters?: number;
};

export const LAST_PUBLISHED_ASSET_IDS = [
  "pack.agentspace.building.echt.02"
] as const;

export const ASSET_CATALOG: AssetRecord[] = [
  {
    "assetId": "pack.agentspace.barrier.crowd.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.barrier.crowd.01.glb",
    "componentIds": [
      "pack.agentspace.barrier.crowd.01/body",
      "pack.agentspace.barrier.crowd.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.bench.city.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.bench.city.01.glb",
    "componentIds": [
      "pack.agentspace.bench.city.01/root",
      "pack.agentspace.bench.city.01/seat"
    ]
  },
  {
    "assetId": "pack.agentspace.billboard.frame.01",
    "kind": "sign",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.billboard.frame.01.glb",
    "componentIds": [
      "pack.agentspace.billboard.frame.01/board",
      "pack.agentspace.billboard.frame.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.bin.city.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.bin.city.01.glb",
    "componentIds": [
      "pack.agentspace.bin.city.01/body",
      "pack.agentspace.bin.city.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.bollard.city.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.bollard.city.01.glb",
    "componentIds": [
      "pack.agentspace.bollard.city.01/body",
      "pack.agentspace.bollard.city.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.building.echt.01",
    "kind": "building",
    "folder": "buildings",
    "url": "/assets/gltf/buildings/pack.agentspace.building.echt.01.glb",
    "componentIds": [
      "pack.agentspace.building.echt.01/entrance",
      "pack.agentspace.building.echt.01/entrance.glass",
      "pack.agentspace.building.echt.01/mullion.center.h.0",
      "pack.agentspace.building.echt.01/mullion.center.h.1",
      "pack.agentspace.building.echt.01/mullion.center.h.2",
      "pack.agentspace.building.echt.01/mullion.center.h.3",
      "pack.agentspace.building.echt.01/mullion.left.h.0",
      "pack.agentspace.building.echt.01/mullion.left.h.1",
      "pack.agentspace.building.echt.01/mullion.left.h.2",
      "pack.agentspace.building.echt.01/mullion.left.v.0",
      "pack.agentspace.building.echt.01/mullion.left.v.1",
      "pack.agentspace.building.echt.01/mullion.right.h.0",
      "pack.agentspace.building.echt.01/mullion.right.h.1",
      "pack.agentspace.building.echt.01/mullion.right.h.2",
      "pack.agentspace.building.echt.01/mullion.right.v.0",
      "pack.agentspace.building.echt.01/mullion.right.v.1",
      "pack.agentspace.building.echt.01/parapet.center",
      "pack.agentspace.building.echt.01/plinth",
      "pack.agentspace.building.echt.01/roof.center",
      "pack.agentspace.building.echt.01/roof.left",
      "pack.agentspace.building.echt.01/roof.right",
      "pack.agentspace.building.echt.01/root",
      "pack.agentspace.building.echt.01/slab.left",
      "pack.agentspace.building.echt.01/slab.right",
      "pack.agentspace.building.echt.01/volume.center.glass",
      "pack.agentspace.building.echt.01/wing.left.glass",
      "pack.agentspace.building.echt.01/wing.right.glass"
    ]
  },
  {
    "assetId": "pack.agentspace.building.echt.02",
    "kind": "building",
    "folder": "buildings",
    "url": "/assets/gltf/buildings/pack.agentspace.building.echt.02.glb",
    "componentIds": [
      "pack.agentspace.building.echt.02/beacon.base",
      "pack.agentspace.building.echt.02/beacon.beacon",
      "pack.agentspace.building.echt.02/beacon.e.bot",
      "pack.agentspace.building.echt.02/beacon.e.mid",
      "pack.agentspace.building.echt.02/beacon.e.stem",
      "pack.agentspace.building.echt.02/beacon.e.top",
      "pack.agentspace.building.echt.02/bench.leg.0",
      "pack.agentspace.building.echt.02/bench.leg.1",
      "pack.agentspace.building.echt.02/bench.seat",
      "pack.agentspace.building.echt.02/bike.bar",
      "pack.agentspace.building.echt.02/bike.frame",
      "pack.agentspace.building.echt.02/bike.wheel.0",
      "pack.agentspace.building.echt.02/bike.wheel.1",
      "pack.agentspace.building.echt.02/bollard.0.cap",
      "pack.agentspace.building.echt.02/bollard.0.post",
      "pack.agentspace.building.echt.02/bollard.1.cap",
      "pack.agentspace.building.echt.02/bollard.1.post",
      "pack.agentspace.building.echt.02/entrance.canopy",
      "pack.agentspace.building.echt.02/entrance.canopy.trim",
      "pack.agentspace.building.echt.02/entrance.canopy.underside",
      "pack.agentspace.building.echt.02/entrance.col.l",
      "pack.agentspace.building.echt.02/entrance.col.l.accent",
      "pack.agentspace.building.echt.02/entrance.col.r",
      "pack.agentspace.building.echt.02/entrance.col.r.accent",
      "pack.agentspace.building.echt.02/entrance.door",
      "pack.agentspace.building.echt.02/entrance.door.1",
      "pack.agentspace.building.echt.02/entrance.light.0",
      "pack.agentspace.building.echt.02/entrance.light.1",
      "pack.agentspace.building.echt.02/entrance.light.2",
      "pack.agentspace.building.echt.02/entrance.recess",
      "pack.agentspace.building.echt.02/entrance.sign.c.1.0",
      "pack.agentspace.building.echt.02/entrance.sign.c.1.1",
      "pack.agentspace.building.echt.02/entrance.sign.c.1.2",
      "pack.agentspace.building.echt.02/entrance.sign.e.0.0",
      "pack.agentspace.building.echt.02/entrance.sign.e.0.1",
      "pack.agentspace.building.echt.02/entrance.sign.e.0.2",
      "pack.agentspace.building.echt.02/entrance.sign.e.0.3",
      "pack.agentspace.building.echt.02/entrance.sign.h.2.0",
      "pack.agentspace.building.echt.02/entrance.sign.h.2.1",
      "pack.agentspace.building.echt.02/entrance.sign.h.2.2",
      "pack.agentspace.building.echt.02/entrance.sign.t.3.0",
      "pack.agentspace.building.echt.02/entrance.sign.t.3.1",
      "pack.agentspace.building.echt.02/entrance.step.0",
      "pack.agentspace.building.echt.02/entrance.step.1",
      "pack.agentspace.building.echt.02/entrance.step.2",
      "pack.agentspace.building.echt.02/facade.sign.c.1.0",
      "pack.agentspace.building.echt.02/facade.sign.c.1.1",
      "pack.agentspace.building.echt.02/facade.sign.c.1.2",
      "pack.agentspace.building.echt.02/facade.sign.e.0.0",
      "pack.agentspace.building.echt.02/facade.sign.e.0.1",
      "pack.agentspace.building.echt.02/facade.sign.e.0.2",
      "pack.agentspace.building.echt.02/facade.sign.e.0.3",
      "pack.agentspace.building.echt.02/facade.sign.h.2.0",
      "pack.agentspace.building.echt.02/facade.sign.h.2.1",
      "pack.agentspace.building.echt.02/facade.sign.h.2.2",
      "pack.agentspace.building.echt.02/facade.sign.t.3.0",
      "pack.agentspace.building.echt.02/facade.sign.t.3.1",
      "pack.agentspace.building.echt.02/lamp.0.glow",
      "pack.agentspace.building.echt.02/lamp.0.head",
      "pack.agentspace.building.echt.02/lamp.0.pole",
      "pack.agentspace.building.echt.02/lamp.1.glow",
      "pack.agentspace.building.echt.02/lamp.1.head",
      "pack.agentspace.building.echt.02/lamp.1.pole",
      "pack.agentspace.building.echt.02/link.front",
      "pack.agentspace.building.echt.02/link.left",
      "pack.agentspace.building.echt.02/link.right",
      "pack.agentspace.building.echt.02/mass.left",
      "pack.agentspace.building.echt.02/mass.left.win.a.frame",
      "pack.agentspace.building.echt.02/mass.left.win.a.glass",
      "pack.agentspace.building.echt.02/mass.left.win.a.sill",
      "pack.agentspace.building.echt.02/mass.left.win.b.frame",
      "pack.agentspace.building.echt.02/mass.left.win.b.glass",
      "pack.agentspace.building.echt.02/mass.left.win.b.sill",
      "pack.agentspace.building.echt.02/mass.rear",
      "pack.agentspace.building.echt.02/mass.right",
      "pack.agentspace.building.echt.02/mass.right.win.frame",
      "pack.agentspace.building.echt.02/mass.right.win.glass",
      "pack.agentspace.building.echt.02/mass.right.win.sill",
      "pack.agentspace.building.echt.02/mass.tower",
      "pack.agentspace.building.echt.02/mass.tower.crown",
      "pack.agentspace.building.echt.02/mass.tower.front.glass",
      "pack.agentspace.building.echt.02/mass.tower.front.mullion.0",
      "pack.agentspace.building.echt.02/mass.tower.front.mullion.1",
      "pack.agentspace.building.echt.02/mass.tower.front.mullion.2",
      "pack.agentspace.building.echt.02/planter.fl.box",
      "pack.agentspace.building.echt.02/planter.fl.plant.pot",
      "pack.agentspace.building.echt.02/planter.fl.plant.shrub",
      "pack.agentspace.building.echt.02/planter.fl.soil",
      "pack.agentspace.building.echt.02/planter.fr.box",
      "pack.agentspace.building.echt.02/planter.fr.plant.pot",
      "pack.agentspace.building.echt.02/planter.fr.plant.shrub",
      "pack.agentspace.building.echt.02/planter.fr.soil",
      "pack.agentspace.building.echt.02/podium.body",
      "pack.agentspace.building.echt.02/podium.lip",
      "pack.agentspace.building.echt.02/roof.left.lip",
      "pack.agentspace.building.echt.02/roof.left.slab",
      "pack.agentspace.building.echt.02/roof.right.lip",
      "pack.agentspace.building.echt.02/roof.right.slab",
      "pack.agentspace.building.echt.02/roof.tower.lip",
      "pack.agentspace.building.echt.02/roof.tower.slab",
      "pack.agentspace.building.echt.02/roof.unit.0",
      "pack.agentspace.building.echt.02/roof.unit.1",
      "pack.agentspace.building.echt.02/root",
      "pack.agentspace.building.echt.02/sculpture.base",
      "pack.agentspace.building.echt.02/sculpture.cap",
      "pack.agentspace.building.echt.02/sculpture.pedestal",
      "pack.agentspace.building.echt.02/sculpture.ring.a",
      "pack.agentspace.building.echt.02/sculpture.ring.b",
      "pack.agentspace.building.echt.02/sculpture.ring.c",
      "pack.agentspace.building.echt.02/site.berm.e",
      "pack.agentspace.building.echt.02/site.berm.n",
      "pack.agentspace.building.echt.02/site.berm.s",
      "pack.agentspace.building.echt.02/site.berm.w",
      "pack.agentspace.building.echt.02/site.curb.front",
      "pack.agentspace.building.echt.02/site.forecourt",
      "pack.agentspace.building.echt.02/site.forecourt.lip",
      "pack.agentspace.building.echt.02/site.grade",
      "pack.agentspace.building.echt.02/site.podium",
      "pack.agentspace.building.echt.02/site.podium.lip",
      "pack.agentspace.building.echt.02/terrace.right.deck",
      "pack.agentspace.building.echt.02/terrace.right.planter.a.box",
      "pack.agentspace.building.echt.02/terrace.right.planter.a.plant.pot",
      "pack.agentspace.building.echt.02/terrace.right.planter.a.plant.shrub",
      "pack.agentspace.building.echt.02/terrace.right.planter.a.soil",
      "pack.agentspace.building.echt.02/terrace.right.planter.b.box",
      "pack.agentspace.building.echt.02/terrace.right.planter.b.plant.pot",
      "pack.agentspace.building.echt.02/terrace.right.planter.b.plant.shrub",
      "pack.agentspace.building.echt.02/terrace.right.planter.b.soil",
      "pack.agentspace.building.echt.02/tree.ne.canopy",
      "pack.agentspace.building.echt.02/tree.ne.trunk",
      "pack.agentspace.building.echt.02/tree.nw.canopy",
      "pack.agentspace.building.echt.02/tree.nw.trunk",
      "pack.agentspace.building.echt.02/tree.sw.canopy",
      "pack.agentspace.building.echt.02/tree.sw.trunk"
    ],
    "buildingId": "loft",
    "brandId": "echt",
    "footprintMeters": {
      "width": 48.11,
      "depth": 32.67
    },
    "heightMeters": 30
  },
  {
    "assetId": "pack.agentspace.busstop.shelter.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.busstop.shelter.01.glb",
    "componentIds": [
      "pack.agentspace.busstop.shelter.01/panel",
      "pack.agentspace.busstop.shelter.01/roof",
      "pack.agentspace.busstop.shelter.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.character.agent.civic.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.agent.civic.01.glb",
    "componentIds": [
      "pack.agentspace.character.agent.civic.01/arm.l",
      "pack.agentspace.character.agent.civic.01/arm.r",
      "pack.agentspace.character.agent.civic.01/head",
      "pack.agentspace.character.agent.civic.01/leg.l",
      "pack.agentspace.character.agent.civic.01/leg.r",
      "pack.agentspace.character.agent.civic.01/root",
      "pack.agentspace.character.agent.civic.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.agent.human.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.agent.human.01.glb",
    "componentIds": [
      "pack.agentspace.character.agent.human.01/arm.l",
      "pack.agentspace.character.agent.human.01/arm.r",
      "pack.agentspace.character.agent.human.01/head",
      "pack.agentspace.character.agent.human.01/leg.l",
      "pack.agentspace.character.agent.human.01/leg.r",
      "pack.agentspace.character.agent.human.01/root",
      "pack.agentspace.character.agent.human.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.avatar.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.avatar.01.glb",
    "componentIds": [
      "pack.agentspace.character.avatar.01/arm.l",
      "pack.agentspace.character.avatar.01/arm.r",
      "pack.agentspace.character.avatar.01/head",
      "pack.agentspace.character.avatar.01/leg.l",
      "pack.agentspace.character.avatar.01/leg.r",
      "pack.agentspace.character.avatar.01/root",
      "pack.agentspace.character.avatar.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.avatar.human.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.avatar.human.01.glb",
    "componentIds": [
      "pack.agentspace.character.avatar.human.01/arm.l",
      "pack.agentspace.character.avatar.human.01/arm.r",
      "pack.agentspace.character.avatar.human.01/head",
      "pack.agentspace.character.avatar.human.01/leg.l",
      "pack.agentspace.character.avatar.human.01/leg.r",
      "pack.agentspace.character.avatar.human.01/root",
      "pack.agentspace.character.avatar.human.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.npc.human.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.npc.human.01.glb",
    "componentIds": [
      "pack.agentspace.character.npc.human.01/arm.l",
      "pack.agentspace.character.npc.human.01/arm.r",
      "pack.agentspace.character.npc.human.01/head",
      "pack.agentspace.character.npc.human.01/leg.l",
      "pack.agentspace.character.npc.human.01/leg.r",
      "pack.agentspace.character.npc.human.01/root",
      "pack.agentspace.character.npc.human.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.pedestrian.casual.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.pedestrian.casual.01.glb",
    "componentIds": [
      "pack.agentspace.character.pedestrian.casual.01/arm.l",
      "pack.agentspace.character.pedestrian.casual.01/arm.r",
      "pack.agentspace.character.pedestrian.casual.01/head",
      "pack.agentspace.character.pedestrian.casual.01/leg.l",
      "pack.agentspace.character.pedestrian.casual.01/leg.r",
      "pack.agentspace.character.pedestrian.casual.01/root",
      "pack.agentspace.character.pedestrian.casual.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.character.pedestrian.worker.01",
    "kind": "character",
    "folder": "characters",
    "url": "/assets/gltf/characters/pack.agentspace.character.pedestrian.worker.01.glb",
    "componentIds": [
      "pack.agentspace.character.pedestrian.worker.01/arm.l",
      "pack.agentspace.character.pedestrian.worker.01/arm.r",
      "pack.agentspace.character.pedestrian.worker.01/head",
      "pack.agentspace.character.pedestrian.worker.01/leg.l",
      "pack.agentspace.character.pedestrian.worker.01/leg.r",
      "pack.agentspace.character.pedestrian.worker.01/root",
      "pack.agentspace.character.pedestrian.worker.01/torso"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.accessory.bag.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.accessory.bag.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.accessory.bag.01/mesh",
      "pack.agentspace.clothing.accessory.bag.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.accessory.hair.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.accessory.hair.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.accessory.hair.01/mesh",
      "pack.agentspace.clothing.accessory.hair.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.accessory.hair.long.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.accessory.hair.long.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.accessory.hair.long.01/mesh",
      "pack.agentspace.clothing.accessory.hair.long.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.dress.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.dress.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.dress.01/mesh",
      "pack.agentspace.clothing.dress.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.hat.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.hat.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.hat.01/mesh",
      "pack.agentspace.clothing.hat.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.jacket.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.jacket.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.jacket.01/mesh",
      "pack.agentspace.clothing.jacket.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.shirt.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.shirt.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.shirt.01/mesh",
      "pack.agentspace.clothing.shirt.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.shoes.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.shoes.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.shoes.01/mesh",
      "pack.agentspace.clothing.shoes.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.trousers.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.trousers.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.trousers.01/mesh",
      "pack.agentspace.clothing.trousers.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.clothing.uniform.civic.01",
    "kind": "clothing",
    "folder": "props",
    "url": "/assets/gltf/props/pack.agentspace.clothing.uniform.civic.01.glb",
    "componentIds": [
      "pack.agentspace.clothing.uniform.civic.01/mesh",
      "pack.agentspace.clothing.uniform.civic.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.gutter.strip.01",
    "kind": "road",
    "folder": "environment",
    "url": "/assets/gltf/environment/pack.agentspace.gutter.strip.01.glb",
    "componentIds": [
      "pack.agentspace.gutter.strip.01/body",
      "pack.agentspace.gutter.strip.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.hydrant.city.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.hydrant.city.01.glb",
    "componentIds": [
      "pack.agentspace.hydrant.city.01/body",
      "pack.agentspace.hydrant.city.01/cap",
      "pack.agentspace.hydrant.city.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.parking.meter.01",
    "kind": "street_furniture",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.parking.meter.01.glb",
    "componentIds": [
      "pack.agentspace.parking.meter.01/head",
      "pack.agentspace.parking.meter.01/pole",
      "pack.agentspace.parking.meter.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.poster.frame.01",
    "kind": "sign",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.poster.frame.01.glb",
    "componentIds": [
      "pack.agentspace.poster.frame.01/board",
      "pack.agentspace.poster.frame.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.sign.parking.01",
    "kind": "sign",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.sign.parking.01.glb",
    "componentIds": [
      "pack.agentspace.sign.parking.01/face",
      "pack.agentspace.sign.parking.01/pole",
      "pack.agentspace.sign.parking.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.sign.post.01",
    "kind": "sign",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.sign.post.01.glb",
    "componentIds": [
      "pack.agentspace.sign.post.01/face",
      "pack.agentspace.sign.post.01/pole",
      "pack.agentspace.sign.post.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.street.sign.standard.01",
    "kind": "sign",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.street.sign.standard.01.glb",
    "componentIds": [
      "pack.agentspace.street.sign.standard.01/face",
      "pack.agentspace.street.sign.standard.01/pole",
      "pack.agentspace.street.sign.standard.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.streetlight.modern.01",
    "kind": "street_light",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.streetlight.modern.01.glb",
    "componentIds": [
      "pack.agentspace.streetlight.modern.01/arm",
      "pack.agentspace.streetlight.modern.01/fixture",
      "pack.agentspace.streetlight.modern.01/lamp",
      "pack.agentspace.streetlight.modern.01/light",
      "pack.agentspace.streetlight.modern.01/pole",
      "pack.agentspace.streetlight.modern.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.streetlight.park.01",
    "kind": "street_light",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.streetlight.park.01.glb",
    "componentIds": [
      "pack.agentspace.streetlight.park.01/arm",
      "pack.agentspace.streetlight.park.01/fixture",
      "pack.agentspace.streetlight.park.01/lamp",
      "pack.agentspace.streetlight.park.01/light",
      "pack.agentspace.streetlight.park.01/pole",
      "pack.agentspace.streetlight.park.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.streetlight.pedestrian.01",
    "kind": "street_light",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.streetlight.pedestrian.01.glb",
    "componentIds": [
      "pack.agentspace.streetlight.pedestrian.01/arm",
      "pack.agentspace.streetlight.pedestrian.01/fixture",
      "pack.agentspace.streetlight.pedestrian.01/lamp",
      "pack.agentspace.streetlight.pedestrian.01/light",
      "pack.agentspace.streetlight.pedestrian.01/pole",
      "pack.agentspace.streetlight.pedestrian.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.trafficlight.standard.01",
    "kind": "traffic_light",
    "folder": "street",
    "url": "/assets/gltf/street/pack.agentspace.trafficlight.standard.01.glb",
    "componentIds": [
      "pack.agentspace.trafficlight.standard.01/amber",
      "pack.agentspace.trafficlight.standard.01/arm",
      "pack.agentspace.trafficlight.standard.01/green",
      "pack.agentspace.trafficlight.standard.01/housing",
      "pack.agentspace.trafficlight.standard.01/pedestrian_signal",
      "pack.agentspace.trafficlight.standard.01/pole",
      "pack.agentspace.trafficlight.standard.01/red",
      "pack.agentspace.trafficlight.standard.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.bike.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.bike.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.bike.01/frame",
      "pack.agentspace.vehicle.bike.01/root",
      "pack.agentspace.vehicle.bike.01/wheel/0",
      "pack.agentspace.vehicle.bike.01/wheel/1"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.bus.city.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.bus.city.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.bus.city.01/body",
      "pack.agentspace.vehicle.bus.city.01/cabin",
      "pack.agentspace.vehicle.bus.city.01/root",
      "pack.agentspace.vehicle.bus.city.01/wheel/0",
      "pack.agentspace.vehicle.bus.city.01/wheel/1",
      "pack.agentspace.vehicle.bus.city.01/wheel/2",
      "pack.agentspace.vehicle.bus.city.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.car.hatch.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.car.hatch.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.car.hatch.01/body",
      "pack.agentspace.vehicle.car.hatch.01/cabin",
      "pack.agentspace.vehicle.car.hatch.01/root",
      "pack.agentspace.vehicle.car.hatch.01/wheel/0",
      "pack.agentspace.vehicle.car.hatch.01/wheel/1",
      "pack.agentspace.vehicle.car.hatch.01/wheel/2",
      "pack.agentspace.vehicle.car.hatch.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.car.sedan.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.car.sedan.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.car.sedan.01/body",
      "pack.agentspace.vehicle.car.sedan.01/cabin",
      "pack.agentspace.vehicle.car.sedan.01/root",
      "pack.agentspace.vehicle.car.sedan.01/wheel/0",
      "pack.agentspace.vehicle.car.sedan.01/wheel/1",
      "pack.agentspace.vehicle.car.sedan.01/wheel/2",
      "pack.agentspace.vehicle.car.sedan.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.car.suv.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.car.suv.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.car.suv.01/body",
      "pack.agentspace.vehicle.car.suv.01/cabin",
      "pack.agentspace.vehicle.car.suv.01/root",
      "pack.agentspace.vehicle.car.suv.01/wheel/0",
      "pack.agentspace.vehicle.car.suv.01/wheel/1",
      "pack.agentspace.vehicle.car.suv.01/wheel/2",
      "pack.agentspace.vehicle.car.suv.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.car.taxi.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.car.taxi.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.car.taxi.01/body",
      "pack.agentspace.vehicle.car.taxi.01/cabin",
      "pack.agentspace.vehicle.car.taxi.01/root",
      "pack.agentspace.vehicle.car.taxi.01/wheel/0",
      "pack.agentspace.vehicle.car.taxi.01/wheel/1",
      "pack.agentspace.vehicle.car.taxi.01/wheel/2",
      "pack.agentspace.vehicle.car.taxi.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.car.tesla.sedan.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.car.tesla.sedan.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.car.tesla.sedan.01/body",
      "pack.agentspace.vehicle.car.tesla.sedan.01/brake.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/brake.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/brake.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/brake.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/bumper.front",
      "pack.agentspace.vehicle.car.tesla.sedan.01/bumper.rear",
      "pack.agentspace.vehicle.car.tesla.sedan.01/charge.port",
      "pack.agentspace.vehicle.car.tesla.sedan.01/diffuser",
      "pack.agentspace.vehicle.car.tesla.sedan.01/door.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/door.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/door.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/door.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/glass.rear",
      "pack.agentspace.vehicle.car.tesla.sedan.01/glass.side.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/glass.side.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/glass.side.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/glass.side.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/handle.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/handle.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/handle.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/handle.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/headlight.bar",
      "pack.agentspace.vehicle.car.tesla.sedan.01/headlight.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/headlight.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/hood",
      "pack.agentspace.vehicle.car.tesla.sedan.01/mirror.glass.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/mirror.glass.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/mirror.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/mirror.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/pillar.a.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/pillar.a.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/pillar.c.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/pillar.c.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/rim.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/rim.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/rim.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/rim.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/roof",
      "pack.agentspace.vehicle.car.tesla.sedan.01/root",
      "pack.agentspace.vehicle.car.tesla.sedan.01/taillight.bar",
      "pack.agentspace.vehicle.car.tesla.sedan.01/taillight.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/taillight.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/trunk",
      "pack.agentspace.vehicle.car.tesla.sedan.01/tyre.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/tyre.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/tyre.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/tyre.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/underbody",
      "pack.agentspace.vehicle.car.tesla.sedan.01/wheel.front.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/wheel.front.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/wheel.rear.left",
      "pack.agentspace.vehicle.car.tesla.sedan.01/wheel.rear.right",
      "pack.agentspace.vehicle.car.tesla.sedan.01/windshield"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.emergency.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.emergency.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.emergency.01/body",
      "pack.agentspace.vehicle.emergency.01/lightbar",
      "pack.agentspace.vehicle.emergency.01/root"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.truck.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.truck.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.truck.01/body",
      "pack.agentspace.vehicle.truck.01/cabin",
      "pack.agentspace.vehicle.truck.01/root",
      "pack.agentspace.vehicle.truck.01/wheel/0",
      "pack.agentspace.vehicle.truck.01/wheel/1",
      "pack.agentspace.vehicle.truck.01/wheel/2",
      "pack.agentspace.vehicle.truck.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.van.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.van.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.van.01/body",
      "pack.agentspace.vehicle.van.01/cabin",
      "pack.agentspace.vehicle.van.01/root",
      "pack.agentspace.vehicle.van.01/wheel/0",
      "pack.agentspace.vehicle.van.01/wheel/1",
      "pack.agentspace.vehicle.van.01/wheel/2",
      "pack.agentspace.vehicle.van.01/wheel/3"
    ]
  },
  {
    "assetId": "pack.agentspace.vehicle.van.delivery.01",
    "kind": "vehicle",
    "folder": "vehicles",
    "url": "/assets/gltf/vehicles/pack.agentspace.vehicle.van.delivery.01.glb",
    "componentIds": [
      "pack.agentspace.vehicle.van.delivery.01/body",
      "pack.agentspace.vehicle.van.delivery.01/cabin",
      "pack.agentspace.vehicle.van.delivery.01/root",
      "pack.agentspace.vehicle.van.delivery.01/wheel/0",
      "pack.agentspace.vehicle.van.delivery.01/wheel/1",
      "pack.agentspace.vehicle.van.delivery.01/wheel/2",
      "pack.agentspace.vehicle.van.delivery.01/wheel/3"
    ]
  }
];
