import { useQuery } from "@tanstack/react-query";
import type { PublicAgent } from "./server/registry";
import { agentListUrl } from "./agentPaths";

export const useAgents = (projectId: string) =>
  useQuery({
    queryKey: ["just-agents", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<PublicAgent[]> => {
      const response = await fetch(agentListUrl(projectId));
      if (!response.ok)
        throw new Error(`Agents unavailable (${response.status})`);
      return (await response.json()) as PublicAgent[];
    },
  });
