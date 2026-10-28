import Link from "next/link";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import { Badge } from "@/src/components/ui/badge";
import { agentPageUrl } from "./agentPaths";
import { useAgents } from "./useAgents";
import { useHubAgents, usePendingCounts } from "./useHub";

export default function AgentsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agents = useAgents(projectId);
  // without a hub these fail quietly and the list is the chat list it always was
  const health = useHubAgents(projectId);
  const ids = agents.data?.map((agent) => agent.id) ?? [];
  const pending = usePendingCounts(projectId, health.isSuccess ? ids : []);

  return (
    <Page
      headerProps={{
        title: "Agents",
        help: {
          description:
            "Chat with the just-agents deployments. Each conversation is traced here as a session.",
        },
      }}
      withPadding
      scrollable
    >
      {agents.error ? (
        <p className="text-destructive text-sm">{agents.error.message}</p>
      ) : null}
      {agents.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No agents configured. Set JUST_AGENTS on langfuse-web.
        </p>
      ) : null}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {agents.data?.map((agent, index) => (
          <li key={agent.id}>
            <Link
              href={agentPageUrl(projectId, agent.id)}
              className="hover:bg-muted flex flex-col gap-1 rounded-lg border p-4"
            >
              <span className="flex items-center gap-2">
                <span className="font-bold">{agent.label}</span>
                {healthBadge(health.data?.find((h) => h.id === agent.id)?.up)}
                {pending[index]?.data ? (
                  <Badge variant="warning">{pending[index].data} pending</Badge>
                ) : null}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {agent.id}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}

function healthBadge(up: boolean | undefined) {
  if (up === undefined) return null;
  return <Badge variant={up ? "success" : "error"}>{up ? "up" : "down"}</Badge>;
}
