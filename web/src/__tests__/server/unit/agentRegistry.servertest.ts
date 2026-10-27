import { describe, expect, it } from "vitest";
import { enabledAgents } from "@/src/features/agents/server/registry";

const agent = (id: string) => ({
  id,
  label: id,
  url: `http://agent-${id}:4274`,
});
const registry = [agent("foreman"), agent("seo"), agent("strategist")];

describe("enabledAgents", () => {
  it("keeps only the agents the deployment runs", () => {
    expect(
      enabledAgents(registry, "foreman, strategist").map((a) => a.id),
    ).toEqual(["foreman", "strategist"]);
  });

  it("keeps every agent when nothing is enabled explicitly", () => {
    expect(enabledAgents(registry, undefined)).toEqual(registry);
    expect(enabledAgents(registry, "")).toEqual(registry);
  });
});
