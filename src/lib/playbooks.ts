import type { RoleId } from "./types";

const LABELS: Record<string, string> = {
  ceo: "CEO",
  cfo: "CFO",
  cmo: "CMO",
  cto: "CTO",
  researcher: "Research",
  designer: "Design",
  support: "Support",
  ops: "Ops",
  visitor: "Visitor",
  security: "Security",
  knowledge: "Knowledge",
  coo: "COO",
  creative: "Creative",
};

export function roleLabel(role: string) {
  return LABELS[role] ?? role.replace(/^\w/, (c) => c.toUpperCase());
}

export const ROLE_LABEL = LABELS as Record<RoleId, string>;

export const TASKS: Record<string, { task: string; thought: string; director: string }[]> = {
  ceo: [
    { task: "Assign the week from HQ glass", thought: "If I cannot see the campus, we are a spreadsheet.", director: "Jarvis assigned a task from HQ." },
    { task: "Walk the factory floor", thought: "The works should look busy from the road.", director: "Jarvis entered Signal Works." },
  ],
  cfo: [
    { task: "Reconcile burn in Ledger House", thought: "Marketplace at 70/30 still holds.", director: "Midas started a ledger pass." },
    { task: "Meet Jarvis in the hall", thought: "Runway is a creative constraint.", director: "Midas joined Jarvis in Board Hall." },
  ],
  cmo: [
    { task: "Ship the week from Echt House", thought: "If it is not on the map, it is not a company.", director: "Vega ran the board from Echt House." },
    { task: "Walk the studio next door", thought: "The loft is still Echt, just quieter.", director: "Vega entered Echt Studio." },
    { task: "Post visitor signs at Ember", thought: "Tourists should feel invited.", director: "Vega entered Ember Kitchen." },
  ],
  cto: [
    { task: "Ship the heartbeat adapter", thought: "Bots post status. We pathfind.", director: "Merlin started implementing a fix." },
    { task: "Pair with Watchtower", thought: "If the rack is quiet, we missed it.", director: "Merlin entered Watchtower." },
  ],
  researcher: [
    { task: "Log idle loops in the lab", thought: "If they pace, the playbook is thin.", director: "Athena opened the lab notes." },
  ],
  designer: [
    { task: "Paint a lanyard silhouette", thought: "If it fails at 8px it does not ship.", director: "Vanta entered Signal Studio." },
  ],
  support: [
    { task: "Catch a lost walk-in", thought: "The cafe is onboarding.", director: "A visitor was seated at Seed Cafe." },
  ],
  ops: [
    { task: "Unload a crate at the dock", thought: "Studio intake lands here first.", director: "Friday checked Prop Warehouse." },
    { task: "Keep the station clear", thought: "Airlocks jam on messy platforms.", director: "Friday entered South Station." },
  ],
  visitor: [
    { task: "Walk the waterfront", thought: "I would buy that neon.", director: "A visitor reached the pier." },
  ],
  security: [
    { task: "Sweep the quiet rack", thought: "Assume the interesting bug is already inside.", director: "Watchtower detected a vulnerability." },
    { task: "Join Merlin in the lab", thought: "Fixes land faster if I sit next to them.", director: "Watchtower joined Merlin." },
  ],
  knowledge: [
    { task: "Reshelve the gallery", thought: "Memory is a building, not a prompt.", director: "Athena entered Athena Gallery." },
    { task: "Brief Jarvis", thought: "Three facts. No slides.", director: "Athena briefed HQ." },
  ],
  coo: [
    { task: "Route the morning", thought: "Everyone should already be walking.", director: "Friday assigned the morning routes." },
    { task: "Check the incubator", thought: "Hot desks go cold if nobody sits.", director: "Friday entered the Incubator." },
  ],
  creative: [
    { task: "Block a shot in the studio", thought: "The campus has to look designed.", director: "Vanta started a studio block." },
    { task: "Work from the cottage", thought: "Some ideas only happen off the road.", director: "Vanta entered Vanta Cottage." },
  ],
};

export function tasksFor(role: string) {
  return TASKS[role] ?? TASKS.visitor!;
}
