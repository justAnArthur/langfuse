import type {
  ConversationInput,
  EveDynamicToolPart,
  EveMessageInputRequest,
} from "eve/react";
import { useState } from "react";
import { Button } from "@/src/components/design-system/Button/Button";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import { Textarea } from "@/src/components/ui/textarea";
import type { RenderedPart } from "./ChatPart";

export type ApprovalResponse = {
  requestId: string;
  optionId: "approve" | "cancel";
  text?: string;
};

type ApprovalCardProps = {
  part: EveDynamicToolPart;
  request: EveMessageInputRequest;
  /** The request's entry in eve's input ledger (`conversation.inputs`). */
  entry: ConversationInput | undefined;
  /** No answer can be sent: the session is resuming or has ended. */
  disabled: boolean;
  onRespond: (response: ApprovalResponse) => Promise<void>;
};

/** eve puts the approval request on the tool call it gates. */
export const pickApprovalRequest = (
  part: RenderedPart,
): EveMessageInputRequest | undefined => {
  if (part.type !== "dynamic-tool") return undefined;
  const request = part.toolMetadata?.eve?.inputRequest;
  return request?.kind === "tool-approval" ? request : undefined;
};

const outcomeText: Record<string, string> = {
  approve: "approved",
  cancel: "denied",
  approved: "approved",
  denied: "denied",
  cancelled: "withdrawn, the turn was cancelled",
  ignored: "skipped, a new message took over the turn",
  invalid: "invalid answer",
};

type ApprovalState =
  | { status: "open" }
  | { status: "responded" | "settled"; decision: string; note?: string };

/**
 * The ledger is eve's own record: `responded` once an answer is submitted,
 * `settled` when the server accepts it. Without a ledger entry the tool part
 * still says how its approval ended.
 */
export function pickApprovalState(
  entry: ConversationInput | undefined,
  part: EveDynamicToolPart,
): ApprovalState {
  if (entry?.status === "open") return { status: "open" };
  const note = entry?.response?.text;
  if (entry?.status === "responded")
    return {
      status: "responded",
      decision: outcomeText[entry.response?.optionId ?? ""] ?? "answered",
      note,
    };
  if (entry?.status === "settled")
    return {
      status: "settled",
      decision: outcomeText[entry.outcome ?? ""] ?? entry.outcome ?? "answered",
      note,
    };
  const response = part.toolMetadata?.eve?.inputResponse;
  const approved = part.approval?.approved;
  if (approved === undefined && response === undefined)
    return { status: "settled", decision: "no longer open" };
  return {
    status: "settled",
    decision:
      approved === true
        ? "approved"
        : approved === false
          ? "denied"
          : (outcomeText[response?.optionId ?? ""] ?? "answered"),
    note: response?.text ?? part.approval?.reason,
  };
}

export function ApprovalCard(props: ApprovalCardProps) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const state = pickApprovalState(props.entry, props.part);
  const prompt = props.request.prompt.trim();
  const toolName = props.part.toolMetadata?.eve?.name ?? props.part.toolName;

  // A refused or undelivered answer reopens the request in the ledger.
  const answer = (optionId: ApprovalResponse["optionId"]) => {
    const text = note.trim();
    setSending(true);
    setFailure(undefined);
    props
      .onRespond({
        requestId: props.request.requestId,
        optionId,
        ...(optionId === "cancel" && text ? { text } : {}),
      })
      .catch((error: unknown) =>
        setFailure(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setSending(false));
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="text-muted-foreground text-xs">approval</div>
      {prompt ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{prompt}</p>
      ) : (
        <>
          <p className="text-sm font-bold">{toolName}</p>
          {props.part.input !== undefined && props.part.input !== null ? (
            <JSONView title="input" json={props.part.input} />
          ) : null}
        </>
      )}
      {state.status === "open" ? (
        <>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={props.disabled || sending}
            placeholder="Why you deny it (optional, the agent reads it)"
            className="min-h-8 resize-none text-xs"
            rows={1}
          />
          <div className="flex gap-2">
            <Button
              text="Approve"
              size="sm"
              disabled={props.disabled || sending}
              onClick={() => answer("approve")}
            />
            <Button
              text="Deny"
              size="sm"
              variant="secondary"
              disabled={props.disabled || sending}
              onClick={() => answer("cancel")}
            />
          </div>
        </>
      ) : (
        <p className="text-xs">
          <span className="font-bold">{state.decision}</span>
          {state.status === "responded" ? (
            <span className="text-muted-foreground"> · sending…</span>
          ) : null}
          {state.note ? (
            <span className="text-muted-foreground"> · {state.note}</span>
          ) : null}
        </p>
      )}
      {failure ? <p className="text-destructive text-xs">{failure}</p> : null}
    </div>
  );
}
