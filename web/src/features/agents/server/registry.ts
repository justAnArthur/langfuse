import { z } from "zod";

/**
 * The just-agents deployments this instance chats with, from `JUST_AGENTS`:
 * `[{"id":"foreman","label":"Foreman","url":"http://agent-foreman:4274"}]`.
 * `id` must equal the id each agent tags its traces with (`webchat:<id>`).
 * Read here rather than in `env.mjs` so the fork touches no upstream file.
 */
const AgentEntry = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  label: z.string().min(1),
  url: z.url(),
});

export type AgentEntry = z.infer<typeof AgentEntry>;
export type PublicAgent = Pick<AgentEntry, "id" | "label">;

const parseRegistry = (raw: string | undefined): AgentEntry[] => {
  if (!raw) return [];
  return z.array(AgentEntry).parse(JSON.parse(raw));
};

/** `JUST_AGENTS_ENABLED` (the deployment's compose profiles) keeps the agents it
 *  runs; unset keeps every entry, so a registry can list agents an org has off. */
export const enabledAgents = (
  agents: AgentEntry[],
  enabled: string | undefined,
): AgentEntry[] => {
  const ids = (enabled ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return agents;
  return agents.filter((agent) => ids.includes(agent.id));
};

let cached: AgentEntry[] | undefined;

export const listAgents = (): AgentEntry[] => {
  if (cached === undefined) {
    cached = enabledAgents(
      parseRegistry(process.env.JUST_AGENTS),
      process.env.JUST_AGENTS_ENABLED,
    );
  }
  return cached;
};

export const findAgent = (id: string): AgentEntry | undefined =>
  listAgents().find((agent) => agent.id === id);

/** Shared with every agent; the proxy is its only holder on this side. */
export const webChatToken = (): string => process.env.WEB_CHAT_TOKEN ?? "";
