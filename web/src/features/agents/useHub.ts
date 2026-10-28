import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { agentChatHost, hubApiUrl } from "./agentPaths";

// hr's hub API (agents/hr/agent/lib/hub.ts in just-agents), only the fields the pages read

export type HubMe = { email: string; role: string; owner: boolean };
export type HubAgent = { id: string; label: string; up: boolean };

export type MemoryScope = "agent" | "tenant" | "person";
export type MemoryInfo = {
  key: string;
  slot: string;
  scope: MemoryScope;
  label: string[] | null;
  size: number;
  updated_at: string;
};
export type Revision = {
  id: number;
  by: string | null;
  replaced_at: string;
  body: string;
};
export type MemoryDocument = MemoryInfo & {
  body: string | null;
  version: string | null;
  revisions: Revision[];
};

export type NewRule = {
  skill: string;
  rule: string;
  applies_to: string;
  source: string;
  evidence: string;
  read_on: string;
  recheck_on: string;
  measure?: string | null;
};
export type Rule = NewRule & {
  id: number;
  verdict: string | null;
  verdict_on: string | null;
  active: boolean;
  retired_at: string | null;
  retired_reason: string | null;
};
export type Proposal = {
  id: number;
  skill: string | null;
  kind: "add" | "retire" | "memory";
  rule: NewRule | null;
  target: number | null;
  target_key: string | null;
  expected_version: string | null;
  body: string | null;
  why?: string;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
  note: string | null;
};
export type Playbook = { rules: Rule[]; proposals: Proposal[] };

// eve 0.83's agent info (`kind: "eve-agent-info"`), only the fields the pages render
type Named = { name: string; description?: string };
type DynamicSource = { slug: string; logicalPath: string };
export type AgentInfo = {
  agent: Named & { model: { id?: string; reasoning?: string } };
  instructions: {
    static: { name: string; role: string; content: string }[];
    dynamic: DynamicSource[];
  };
  tools: {
    static: (Named & { requiresApproval: boolean })[];
    dynamic: DynamicSource[];
  };
  skills: { static: (Named & { markdown: string })[] };
  subagents: { local: Named[] };
  remoteAgents: { entries: Named[] };
  schedules: { name: string; cron: string; markdown?: string }[];
  memories: { slot: string; description?: string; visibility: string }[];
  channels: { routes: { name: string; method: string; urlPath: string }[] };
};

export class HubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  if (!response.ok)
    throw new HubError(
      response.status,
      payload.message ?? payload.error ?? `Request failed (${response.status})`,
    );
  return payload as T;
}

const send = (method: "PUT" | "POST", body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

// the most hr serves in one page, so a pending proposal or an old rule is not cut off
const WHOLE_PLAYBOOK = "limit=500";

// every page shows these errors inline; the app's global handler would toast
// and report each one (a deployment without a hub 503s on every visit), and
// retrying a 403 or 503 only delays the message
const inline = { retry: false, meta: { silentAllErrors: true } } as const;
const ownError = () => {};

const hubKey = (projectId: string, ...rest: unknown[]) => [
  "just-agents-hub",
  projectId,
  ...rest,
];

export const useHubMe = (projectId: string) =>
  useQuery({
    ...inline,
    queryKey: hubKey(projectId, "me"),
    enabled: Boolean(projectId),
    queryFn: () => getJson<HubMe>(hubApiUrl(projectId, "me")),
  });

export const useIsHubOwner = (projectId: string) =>
  useHubMe(projectId).data?.owner ?? false;

export const useHubAgents = (projectId: string) =>
  useQuery({
    ...inline,
    queryKey: hubKey(projectId, "agents"),
    enabled: Boolean(projectId),
    queryFn: async () =>
      (await getJson<{ agents: HubAgent[] }>(hubApiUrl(projectId, "agents")))
        .agents,
  });

const playbookUrl = (projectId: string, agentId: string) =>
  hubApiUrl(projectId, `agents/${agentId}/playbook?${WHOLE_PLAYBOOK}`);

export const usePlaybook = (projectId: string, agentId: string) =>
  useQuery({
    ...inline,
    queryKey: hubKey(projectId, "playbook", agentId),
    enabled: Boolean(projectId && agentId),
    queryFn: () => getJson<Playbook>(playbookUrl(projectId, agentId)),
  });

export const usePendingCounts = (projectId: string, agentIds: string[]) =>
  useQueries({
    queries: agentIds.map((agentId) => ({
      ...inline,
      queryKey: hubKey(projectId, "playbook", agentId),
      queryFn: () => getJson<Playbook>(playbookUrl(projectId, agentId)),
      select: (playbook: Playbook) =>
        playbook.proposals.filter((p) => p.status === "pending").length,
    })),
  });

export const useMemoryList = (projectId: string, agentId: string) =>
  useQuery({
    ...inline,
    queryKey: hubKey(projectId, "memory-list", agentId),
    enabled: Boolean(projectId && agentId),
    queryFn: async () =>
      (
        await getJson<{ documents: MemoryInfo[] }>(
          hubApiUrl(projectId, `agents/${agentId}/memory?limit=500`),
        )
      ).documents,
  });

const memoryUrl = (projectId: string, key: string) =>
  hubApiUrl(projectId, `memory/${encodeURIComponent(key)}`);

export const useMemoryDocument = (projectId: string, key: string) =>
  useQuery({
    ...inline,
    queryKey: hubKey(projectId, "memory", key),
    // an owner may be mid-edit; the editor keeps its base version either way
    refetchOnWindowFocus: false,
    enabled: Boolean(projectId && key),
    queryFn: () => getJson<MemoryDocument>(memoryUrl(projectId, key)),
  });

// one fetch of the agent's info, shared by the overview and the skills page
const agentInfoQuery = (projectId: string, agentId: string) => ({
  ...inline,
  queryKey: ["just-agents-info", projectId, agentId],
  enabled: Boolean(projectId && agentId),
  queryFn: () =>
    getJson<AgentInfo>(`${agentChatHost(projectId, agentId)}/eve/v1/info`),
});

export const useAgentInfo = (projectId: string, agentId: string) =>
  useQuery(agentInfoQuery(projectId, agentId));

export const useSkills = (projectId: string, agentId: string) =>
  useQuery({
    ...agentInfoQuery(projectId, agentId),
    select: (info: AgentInfo) => info.skills.static,
  });

export function useSaveMemory(projectId: string, key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onError: ownError,
    mutationFn: (write: { content: string; expectedVersion: string | null }) =>
      getJson<{ version: string }>(
        memoryUrl(projectId, key),
        send("PUT", write),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: hubKey(projectId) }),
  });
}

export function useDecideProposal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onError: ownError,
    mutationFn: ({
      id,
      ...decision
    }: {
      id: number;
      decision: "approve" | "reject";
      note?: string;
    }) =>
      getJson(
        hubApiUrl(projectId, `proposals/${id}/decision`),
        send("POST", decision),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: hubKey(projectId) }),
  });
}

export function useRetireRule(projectId: string, agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onError: ownError,
    mutationFn: ({ id, why }: { id: number; why: string }) =>
      getJson(
        hubApiUrl(projectId, `agents/${agentId}/playbook/${id}/retire`),
        send("POST", { why }),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: hubKey(projectId) }),
  });
}
