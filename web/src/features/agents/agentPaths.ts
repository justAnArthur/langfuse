import { encodeFiltersGeneric } from "@langfuse/shared";

/** Same-origin base the eve client appends `/eve/v1/...` to. */
export const agentChatHost = (projectId: string, agentId: string) =>
  `/api/agents-proxy/${encodeURIComponent(projectId)}/${encodeURIComponent(agentId)}`;

export const agentListUrl = (projectId: string) =>
  `/api/agents-proxy/${encodeURIComponent(projectId)}`;

export const agentPageUrl = (
  projectId: string,
  agentId: string,
  sessionId?: string,
) =>
  `/project/${projectId}/agents/${agentId}${sessionId ? `/${encodeURIComponent(sessionId)}` : ""}`;

/** The tag every agent puts on a conversation a person opened in this chat. */
export const webChatTag = (agentId: string) => `webchat:${agentId}`;

/** Every trace an agent writes carries this tag (agent-lib's `langfuse(...)`). */
export const agentTag = (agentId: string) => `agent:${agentId}`;

/** The traces table's `filter` query for one agent's traces. */
export const agentTracesFilter = (agentId: string) =>
  encodeFiltersGeneric([
    {
      column: "traceTags",
      type: "arrayOptions",
      operator: "any of",
      value: [agentTag(agentId)],
    },
  ]);

export const agentMemoryUrl = (
  projectId: string,
  agentId: string,
  key?: string,
) =>
  `/project/${projectId}/agents/${agentId}/memory${key ? `/${encodeURIComponent(key)}` : ""}`;

export const agentSkillsUrl = (projectId: string, agentId: string) =>
  `/project/${projectId}/agents/${agentId}/skills`;

export const agentProposalsUrl = (projectId: string, agentId: string) =>
  `/project/${projectId}/agents/${agentId}/proposals`;

/** `route` is hr's path after `hub/v1/`, its segments already encoded. */
export const hubApiUrl = (projectId: string, route: string) =>
  `/api/hub-proxy/${encodeURIComponent(projectId)}/hub/v1/${route}`;
