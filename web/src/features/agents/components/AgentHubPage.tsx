import { useRouter } from "next/router";
import type { ReactNode } from "react";
import Page from "@/src/components/layouts/page";
import {
  agentMemoryUrl,
  agentOverviewUrl,
  agentPageUrl,
  agentProposalsUrl,
  agentSkillsUrl,
  agentTracesFilter,
} from "../agentPaths";
import { useAgents } from "../useAgents";

export type AgentTab = "chat" | "overview" | "memory" | "skills" | "proposals";

type AgentHubPageProps = {
  tab: AgentTab;
  actions?: ReactNode;
  /** The chat fills the viewport and scrolls its own panes; every other page scrolls as a whole. */
  fill?: boolean;
  children: ReactNode;
};

/** The frame of every agent page: its name, the way back, and Chat | Memory | Skills | Proposals | Traces. */
export const AgentHubPage = ({
  tab,
  actions,
  fill = false,
  children,
}: AgentHubPageProps) => {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const label = useAgents(projectId).data?.find(
    (agent) => agent.id === agentId,
  )?.label;

  const tabs = [
    { value: "chat", label: "Chat", href: agentPageUrl(projectId, agentId) },
    {
      value: "overview",
      label: "Overview",
      href: agentOverviewUrl(projectId, agentId),
    },
    {
      value: "memory",
      label: "Memory",
      href: agentMemoryUrl(projectId, agentId),
    },
    {
      value: "skills",
      label: "Skills",
      href: agentSkillsUrl(projectId, agentId),
    },
    {
      value: "proposals",
      label: "Proposals",
      href: agentProposalsUrl(projectId, agentId),
    },
    {
      value: "traces",
      label: "Traces",
      href: `/project/${projectId}/traces`,
      querySelector: () => ({ filter: agentTracesFilter(agentId) }),
    },
  ];

  return (
    <Page
      withPadding={!fill}
      scrollable={!fill}
      headerProps={{
        title: label ?? agentId ?? "Agent",
        breadcrumb: [{ name: "Agents", href: `/project/${projectId}/agents` }],
        actionButtonsRight: actions,
        tabsProps: { tabs, activeTab: tab },
      }}
    >
      {children}
    </Page>
  );
};
