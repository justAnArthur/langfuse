import { defaultMessageReducer, useEveAgent } from "eve/react";
import { useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { Button } from "@/src/components/design-system/Button/Button";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/utils/tailwind";
import { agentChatHost } from "../agentPaths";
import { ChatPart, isRenderedPart } from "./ChatPart";

type AgentChatProps = {
  projectId: string;
  agentId: string;
  /** Replays this conversation from its first event and follows a running turn. */
  sessionId?: string;
  onSessionStarted?: (sessionId: string) => void;
  onNewChat: () => void;
};

/**
 * An ended session (past the agent's session timeout, or reset) still replays,
 * but eve refuses new messages with `session_not_active`.
 */
const isEnded = (error: Error | undefined) =>
  error !== undefined &&
  "code" in error &&
  (error as { code?: unknown }).code === "session_not_active";

export function AgentChat(props: AgentChatProps) {
  const resumed = props.sessionId
    ? {
        initialSession: { sessionId: props.sessionId, streamIndex: 0 },
        resume: true,
      }
    : {};
  const { data, status, error, send } = useEveAgent({
    host: agentChatHost(props.projectId, props.agentId),
    reducer: defaultMessageReducer(),
    ...resumed,
    onSessionChange: (session) => {
      if (!props.sessionId && session)
        props.onSessionStarted?.(session.sessionId);
    },
  });
  const [draft, setDraft] = useState("");
  const ended = isEnded(error);
  const busy = status !== "ready" && status !== "error";

  // A failed send lands in `error` through the store; the promise adds nothing.
  const submit = () => {
    const text = draft.trim();
    if (!text || busy || ended) return;
    setDraft("");
    send(text).catch(() => undefined);
  };
  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    submit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {data.messages.length === 0 && status === "ready" ? (
          <li className="text-muted-foreground text-sm">
            Ask the agent something to start a conversation.
          </li>
        ) : null}
        {data.messages.map((message) => (
          <li
            key={message.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border px-3 py-2",
              message.role === "user" ? "bg-muted" : "bg-background",
            )}
          >
            <span className="text-muted-foreground text-xs">
              {message.role === "user" ? "you" : props.agentId}
            </span>
            {message.parts.filter(isRenderedPart).map((part, index) => (
              <ChatPart key={`${message.id}-${index}`} part={part} />
            ))}
          </li>
        ))}
      </ul>
      {ended ? (
        <div className="flex items-center justify-between gap-2 border-t p-4 text-sm">
          <span className="text-muted-foreground">
            This conversation has ended. It can be read, not continued.
          </span>
          <Button
            text="New chat"
            variant="secondary"
            onClick={props.onNewChat}
          />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex gap-2 border-t p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder={busy ? "The agent is working…" : "Message the agent"}
            className="min-h-10 flex-1 resize-none"
            rows={2}
          />
          <Button
            text="Send"
            type="submit"
            disabled={busy || !draft.trim()}
            loading={busy}
          />
        </form>
      )}
      {error && !ended ? (
        <p className="text-destructive px-4 pb-4 text-xs">{error.message}</p>
      ) : null}
    </div>
  );
}
