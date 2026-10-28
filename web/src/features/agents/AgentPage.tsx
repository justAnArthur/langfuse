import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "@/src/components/design-system/Button/Button";
import { agentPageUrl } from "./agentPaths";
import { AgentChat } from "./components/AgentChat";
import { AgentHubPage } from "./components/AgentHubPage";
import { AgentHistory } from "./components/AgentHistory";

/**
 * One page for a new chat (`/agents/<id>`) and a past one (`/agents/<id>/<session>`).
 * A chat started here moves the URL to its session without remounting, so the
 * stream it is reading keeps going; any other session change remounts the chat.
 */
export default function AgentPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const sessionId = router.query.sessionId as string | undefined;

  const [startedHere, setStartedHere] = useState<string>();
  const [freshChats, setFreshChats] = useState(0);
  const chatKey =
    sessionId && sessionId !== startedHere ? sessionId : `new-${freshChats}`;

  const onSessionStarted = (id: string) => {
    setStartedHere(id);
    router.replace(agentPageUrl(projectId, agentId, id), undefined, {
      shallow: true,
    });
  };
  const onNewChat = () => {
    setStartedHere(undefined);
    setFreshChats((count) => count + 1);
    router.push(agentPageUrl(projectId, agentId));
  };

  return (
    <AgentHubPage
      tab="chat"
      actions={
        sessionId ? (
          <>
            <Button
              text="Open trace"
              variant="secondary"
              href={`/project/${projectId}/sessions/${encodeURIComponent(sessionId)}`}
            />
            <Button text="New chat" onClick={onNewChat} />
          </>
        ) : null
      }
    >
      <div className="flex h-full min-h-0">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r md:block">
          {projectId && agentId ? (
            <AgentHistory
              projectId={projectId}
              agentId={agentId}
              activeSessionId={sessionId}
            />
          ) : null}
        </aside>
        <section className="min-h-0 flex-1">
          {projectId && agentId ? (
            <AgentChat
              key={chatKey}
              projectId={projectId}
              agentId={agentId}
              sessionId={sessionId === startedHere ? undefined : sessionId}
              onSessionStarted={onSessionStarted}
              onNewChat={onNewChat}
            />
          ) : null}
        </section>
      </div>
    </AgentHubPage>
  );
}
