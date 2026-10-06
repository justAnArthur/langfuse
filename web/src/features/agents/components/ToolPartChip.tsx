import type { EveDynamicToolPart } from "eve/react";
import { useState } from "react";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import {
  pickToolKindLabel,
  pickToolOutcome,
  type ToolOutcome,
} from "./ChatPart";

const outcomeClass: Record<ToolOutcome, string> = {
  "in-progress": "text-muted-foreground",
  ok: "text-dark-green",
  failed: "text-destructive",
  denied: "text-muted-foreground",
};

const outcomeText: Record<ToolOutcome, string> = {
  "in-progress": "…",
  ok: "ok",
  failed: "failed",
  denied: "denied",
};

export function ToolPartChip({ part }: { part: EveDynamicToolPart }) {
  const [open, setOpen] = useState(false);
  const outcome = pickToolOutcome(part);
  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  const hasInput = part.input !== undefined && part.input !== null;
  const hasOutput = part.output !== undefined && part.output !== null;
  const errorText = part.errorText ?? "";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
        <span className="font-bold">{name}</span>
        <span className="text-muted-foreground font-mono">
          {pickToolKindLabel(part.toolMetadata)}
        </span>
        <span className={outcomeClass[outcome]}>{outcomeText[outcome]}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-2">
        {hasInput ? <JSONView title="input" json={part.input} /> : null}
        {outcome === "failed" && errorText ? (
          <p className="text-destructive text-xs">{errorText}</p>
        ) : null}
        {hasOutput ? <JSONView title="output" json={part.output} /> : null}
        {!hasInput && !hasOutput && !errorText ? (
          <p className="text-muted-foreground text-xs italic">
            no input or output yet
          </p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
