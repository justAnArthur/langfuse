import Link from "next/link";
import { api } from "@/src/utils/api";
import { useReadPath } from "@/src/features/events";
import { cn } from "@/src/utils/tailwind";
import { agentPageUrl, webChatTag } from "../agentPaths";

type HistoryRow = {
  id: string;
  userIds: string[];
  countTraces: number;
  createdAt: Date;
};

type AgentHistoryProps = {
  projectId: string;
  agentId: string;
  activeSessionId?: string;
};

/**
 * Langfuse sessions are the index: every web-chat conversation is one session,
 * tagged by the agent that served it. The messages themselves come from the
 * agent when one is opened.
 */
export function AgentHistory(props: AgentHistoryProps) {
  const { isV4 } = useReadPath();
  const input = {
    projectId: props.projectId,
    filter: [
      {
        column: "traceTags",
        type: "arrayOptions" as const,
        operator: "any of" as const,
        value: [webChatTag(props.agentId)],
      },
    ],
    orderBy: { column: "createdAt", order: "DESC" as const },
    page: 0,
    limit: 50,
  };
  const options = { refetchInterval: 10_000 };
  const legacy = api.sessions.all.useQuery(input, {
    ...options,
    enabled: !isV4,
  });
  const fromEvents = api.sessions.allFromEvents.useQuery(input, {
    ...options,
    enabled: isV4,
  });
  const query = isV4 ? fromEvents : legacy;
  const sessions: HistoryRow[] =
    (isV4 ? fromEvents.data?.sessions : legacy.data?.sessions) ?? [];

  if (query.isLoading)
    return <p className="text-muted-foreground p-4 text-sm">Loading…</p>;
  if (sessions.length === 0)
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No conversations yet. They appear here a few seconds after the first
        reply.
      </p>
    );

  return (
    <ul className="flex flex-col">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={agentPageUrl(props.projectId, props.agentId, session.id)}
            className={cn(
              "hover:bg-muted flex flex-col gap-0.5 border-b px-4 py-2 text-sm",
              session.id === props.activeSessionId && "bg-muted",
            )}
          >
            <span>{new Date(session.createdAt).toLocaleString()}</span>
            <span
              className="text-muted-foreground truncate text-xs"
              title={session.userIds.join(", ")}
            >
              {session.userIds.join(", ") || "unknown user"} ·{" "}
              {session.countTraces} turn{session.countTraces === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
