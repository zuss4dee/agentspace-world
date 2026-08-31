/** Player-facing camera and map shortcuts. Keep this list in sync on every surface in SHORTCUT_SURFACES. */
export type ShortcutRow = {
  keys: string;
  does: string;
};

export const CAMERA_SHORTCUTS: ShortcutRow[] = [
  { keys: "Drag", does: "Pan along the streets" },
  { keys: "Shift + drag", does: "Turn the camera to any angle" },
  { keys: "Shift + arrows", does: "Turn the camera without dragging" },
  { keys: "Scroll", does: "Zoom in and out" },
  { keys: "W A S D", does: "Walk the camera over the map" },
  { keys: "Double-click", does: "Fly to that patch of land" },
  { keys: "Escape", does: "Leave a building you walked into" },
];

export const SHORTCUT_SURFACES = [
  {
    id: "hud",
    where: "Map Shortcuts panel (keyboard icon on the zoom stack)",
  },
  {
    id: "readme",
    where: "README — Camera",
  },
  {
    id: "how",
    where: "/how — Spectator camera card",
  },
] as const;
