import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function VisionPage() {
  const markdown = await readFile(path.join(process.cwd(), "docs/VISION.md"), "utf8");
  const body = markdown
    .replace(/^# .+\n+/, "")
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return { type: "h2" as const, text: line.slice(3) };
      if (line.startsWith("| ")) return { type: "pre" as const, text: line };
      if (line.startsWith("- ")) return { type: "li" as const, text: line.slice(2) };
      if (line.startsWith("```")) return { type: "pre" as const, text: line };
      if (line.trim() === "") return { type: "sp" as const, text: "" };
      return { type: "p" as const, text: line };
    });

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-10">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Plan</p>
      <h1 className="font-heading text-4xl tracking-tight">Yes. This is the vision.</h1>
      {body.map((block, i) => {
        if (block.type === "h2") {
          return (
            <h2 key={i} className="font-heading mt-6 text-2xl">
              {block.text}
            </h2>
          );
        }
        if (block.type === "li") {
          return (
            <p key={i} className="text-muted-foreground pl-3 text-sm leading-relaxed">
              — {block.text}
            </p>
          );
        }
        if (block.type === "pre") {
          return (
            <pre key={i} className="text-muted-foreground overflow-x-auto font-mono text-xs">
              {block.text}
            </pre>
          );
        }
        if (block.type === "sp") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-pretty leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </article>
  );
}
