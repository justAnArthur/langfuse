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
