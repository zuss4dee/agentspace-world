import type { RoleId } from "./types";

export const ROLE_LABEL: Record<RoleId, string> = {
  ceo: "CEO",
  cfo: "CFO",
  cmo: "CMO",
  cto: "CTO",
  researcher: "Research",
  designer: "Design",
  support: "Support",
  ops: "Ops",
  visitor: "Visitor",
};

export const TASKS: Record<RoleId, { task: string; thought: string }[]> = {
  ceo: [
    { task: "Sketch the next three bets on the glass", thought: "We ship the Lot. Plaza waits until the crew feels alive." },
    { task: "Walk the factory floor", thought: "If I cannot see the work, the company is a spreadsheet." },
    { task: "1:1 with finance in the tower", thought: "Runway is a creative constraint, not a scare quote." },
  ],
  cfo: [
    { task: "Reconcile August burn", thought: "Props marketplace at 70/30 is healthy if review stays cheap." },
    { task: "Price the neon pack", thought: "Indie buyers will pay for a chair they can screenshot." },
    { task: "Gift vs paid seats memo", thought: "Core engine stays free. Cosmetics fund the Plaza." },
  ],
  cmo: [
    { task: "Cut a 12-second lot loop", thought: "The product is the vibe. Copy comes after the camera." },
    { task: "Name the dusk environment", thought: "Call it Last Light. People will remember the sky." },
    { task: "Draft Plaza visitor signs", thought: "Tourists should feel welcome, not like they walked into Slack." },
  ],
  cto: [
    { task: "Wire the heartbeat adapter", thought: "Grokbot posts status. We just pathfind." },
    { task: "Stabilize isometric depth sort", thought: "Agents behind the tower still steal clicks. Fix hit tests." },
    { task: "Factory line dry-run", thought: "Stations are just waypoints with better lighting." },
  ],
  researcher: [
    { task: "Log agent idle loops", thought: "If they pace, the playbook is too thin." },
    { task: "Interview a vibe coder", thought: "They want to gift a bench, not configure SSO." },
    { task: "Plaza moderation notes", thought: "Public Director cannot leak customer secrets. Ever." },
  ],
  designer: [
    { task: "Paint visitor lanyards", thought: "One stripe of color and the Plaza reads as a city." },
    { task: "Tune factory windows", thought: "Warm interior light. Night lots need a reason to stay open." },
    { task: "Prop silhouette pass", thought: "If it does not read at 32px, it does not ship." },
  ],
  support: [
    { task: "Answer a lost visitor", thought: "The cafe is the onboarding. Sit them down." },
    { task: "File a stuck-path ticket", thought: "CFO walked through a planter. Cute, then not." },
    { task: "Write the disconnect copy", thought: "Signal lost. The bot is still on the lot, just quiet." },
  ],
  ops: [
    { task: "Unload a prop crate", thought: "Studio submissions land in the warehouse first." },
    { task: "Restock espresso", thought: "Meetings without coffee look like standups." },
    { task: "Sweep the plaza path", thought: "Tourism dies on a muddy tile." },
  ],
  visitor: [
    { task: "Peek through the studio windows", thought: "I would buy that neon if it showed up on my lot." },
    { task: "Read the Director board", thought: "This company is actually doing something." },
    { task: "Sit in the cafe", thought: "Might gift a bench. The grass could use one." },
  ],
};
