import type {
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessagePart,
  EveMessageToolMetadata,
} from "eve/react";
import { ToolPartChip } from "./ToolPartChip";

const RENDERED = [
  "text",
  "reasoning",
  "dynamic-tool",
  "step-start",
  "authorization",
  "file",
] as const;

export type RenderedPart = Extract<
  EveMessagePart,
  { type: (typeof RENDERED)[number] }
>;

/** Source links and custom data parts have nothing to show in a chat. */
export const isRenderedPart = (part: EveMessagePart): part is RenderedPart =>
  (RENDERED as readonly string[]).includes(part.type);

export function ChatPart({ part }: { part: RenderedPart }) {
  switch (part.type) {
    case "text":
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {part.text}
        </p>
      );
    case "reasoning":
      return (
        <div className="bg-muted/50 rounded-md border px-3 py-2">
          <div className="text-muted-foreground mb-1 text-xs">thinking</div>
          <div className="text-foreground/80 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {part.text}
          </div>
        </div>
      );
    case "dynamic-tool":
      return <ToolPartChip part={part} />;
    case "step-start":
      return <div className="bg-border my-1 h-px" aria-hidden />;
    case "authorization":
      return <AuthorizationChip part={part} />;
    case "file":
      return <FilePart part={part} />;
  }
}

function FilePart({
  part,
}: {
  part: Extract<EveMessagePart, { type: "file" }>;
}) {
  const label = `${part.filename ?? "attachment"} (${part.mediaType})`;
  if (typeof part.url !== "string" || part.url.length === 0)
    return <div className="text-muted-foreground text-xs italic">{label}</div>;
  return (
    <a
      href={part.url}
      target="_blank"
      rel="noreferrer"
      className="text-xs break-all underline"
    >
      {label}
    </a>
  );
}

function AuthorizationChip({ part }: { part: EveAuthorizationPart }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
      <span>needs approval · {part.displayName || part.name}</span>
      <span className="font-mono opacity-70">
        {pickAuthorizationText(part)}
      </span>
    </span>
  );
}

export function pickAuthorizationText(part: EveAuthorizationPart): string {
  if (part.state === "required") return "pending";
  switch (part.outcome) {
    case "authorized":
      return "approved";
    case "declined":
      return "declined";
    case "failed":
      return "failed";
    case "timed-out":
      return "timed-out";
  }
}

export type ToolOutcome = "in-progress" | "ok" | "failed" | "denied";

export function pickToolOutcome(part: EveDynamicToolPart): ToolOutcome {
  switch (part.state) {
    case "output-available":
      return "ok";
    case "output-error":
      return "failed";
    case "output-denied":
      return "denied";
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return "in-progress";
  }
}

export function pickToolKindLabel(
  meta: EveMessageToolMetadata | undefined,
): string {
  const kind = meta?.eve?.kind;
  if (kind === "subagent-call") return "sub-agent";
  if (kind === "load-skill") return "skill";
  return "tool";
}
