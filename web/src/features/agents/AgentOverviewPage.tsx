import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { MarkdownView } from "@/src/components/ui/MarkdownViewer";
import { AgentHubPage } from "./components/AgentHubPage";
import { hubStatus } from "./components/hubBits";
import { type AgentInfo, useAgentInfo } from "./useHub";

/** What the agent is made of, from its own `eve/v1/info`: the system prompt, tools, schedules and the rest. */
export default function AgentOverviewPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const info = useAgentInfo(projectId, agentId);

  return (
    <AgentHubPage tab="overview">
      {hubStatus(info)}
      {info.data ? <Overview info={info.data} /> : null}
    </AgentHubPage>
  );
}

const Overview = ({ info }: { info: AgentInfo }) => {
  const { agent, instructions, tools, schedules, memories } = info;
  const agents = [...info.subagents.local, ...info.remoteAgents.entries];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        {agent.description ? <p>{agent.description}</p> : null}
        <p className="text-muted-foreground text-sm">
          Model {agent.model.id ?? "chosen at run time"}
          {agent.model.reasoning
            ? ` · reasoning ${agent.model.reasoning}`
            : null}
        </p>
      </header>

      <Section
        title="Instructions"
        count={instructions.static.length + instructions.dynamic.length}
        open
      >
        {instructions.static.map((part) => (
          <MarkdownView
            key={part.name}
            title={`${part.name} (${part.role})`}
            markdown={part.content}
          />
        ))}
        {instructions.dynamic.length ? (
          <p className="text-muted-foreground text-sm">
            Added at run time by{" "}
            {instructions.dynamic.map((source) => source.slug).join(", ")}
          </p>
        ) : null}
      </Section>

      <Section title="Tools" count={tools.static.length + tools.dynamic.length}>
        {tools.static.map((tool) => (
          <Entry
            key={tool.name}
            name={tool.name}
            description={tool.description}
          >
            {tool.requiresApproval ? (
              <Badge variant="warning">needs approval</Badge>
            ) : null}
          </Entry>
        ))}
        {tools.dynamic.map((source) => (
          <Entry
            key={source.slug}
            name={source.slug}
            description="Tools added at run time"
          />
        ))}
      </Section>

      <Section title="Subagents and remote agents" count={agents.length}>
        {agents.map((other) => (
          <Entry
            key={other.name}
            name={other.name}
            description={other.description}
          />
        ))}
      </Section>

      <Section title="Schedules" count={schedules.length}>
        {schedules.map((schedule) => (
          <div key={schedule.name} className="flex flex-col gap-2">
            <Entry name={schedule.name}>
              <Badge variant="outline">{schedule.cron}</Badge>
            </Entry>
            {schedule.markdown ? (
              <MarkdownView markdown={schedule.markdown} />
            ) : null}
          </div>
        ))}
      </Section>

      <Section title="Memory slots" count={memories.length}>
        {memories.map((memory) => (
          <Entry
            key={memory.slot}
            name={memory.slot}
            description={memory.description}
          >
            <Badge variant="outline">{memory.visibility}</Badge>
          </Entry>
        ))}
      </Section>

      <Section title="Channel routes" count={info.channels.routes.length}>
        {info.channels.routes.map((route) => (
          <Entry
            key={`${route.method} ${route.urlPath}`}
            name={`${route.method} ${route.urlPath}`}
            description={route.name}
          />
        ))}
      </Section>
    </div>
  );
};

const Section = ({
  title,
  count,
  open = false,
  children,
}: {
  title: string;
  count: number;
  open?: boolean;
  children: ReactNode;
}) => (
  <Collapsible defaultOpen={open} className="rounded-lg border">
    <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left font-bold">
      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
      {title}
      <span className="text-muted-foreground text-sm font-normal">{count}</span>
    </CollapsibleTrigger>
    <CollapsibleContent className="flex flex-col gap-3 border-t p-4">
      {count === 0 ? (
        <p className="text-muted-foreground text-sm">None.</p>
      ) : (
        children
      )}
    </CollapsibleContent>
  </Collapsible>
);

const Entry = ({
  name,
  description,
  children,
}: {
  name: string;
  description?: string;
  children?: ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="flex items-center gap-2">
      <span className="font-mono text-sm">{name}</span>
      {children}
    </span>
    {description ? (
      <span className="text-muted-foreground text-sm">{description}</span>
    ) : null}
  </div>
);
