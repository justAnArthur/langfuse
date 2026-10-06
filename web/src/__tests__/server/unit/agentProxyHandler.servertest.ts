import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@langfuse/shared";

const authorize = vi.hoisted(() => vi.fn());
vi.mock("@/src/features/agents/server/authorizeAgentChat", () => ({
  authorizeAgentChatOrThrow: authorize,
}));

import agentProxyHandler from "@/src/features/agents/server/agentProxyHandler";

beforeAll(() => {
  process.env.JUST_AGENTS = JSON.stringify([
    { id: "foreman", label: "Foreman", url: "http://agent-foreman:4274" },
  ]);
  process.env.WEB_CHAT_TOKEN = "web-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
  authorize.mockReset();
});

const call = (
  path: string,
  init: ConstructorParameters<typeof NextRequest>[1],
) => {
  const [agentId = "", ...rest] = path.split("?")[0]?.split("/") ?? [];
  return agentProxyHandler(
    new NextRequest(`http://langfuse/api/agents-proxy/p1/${path}`, init),
    { params: Promise.resolve({ projectId: "p1", agentId, path: rest }) },
  );
};

const stubAgent = () =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response('{"ok":true}', {
      status: 202,
      headers: {
        "content-type": "application/json",
        "x-eve-session-id": "wrun_1",
      },
    }),
  );

describe("agent chat proxy", () => {
  it("names the signed-in user and drops the browser's credentials", async () => {
    authorize.mockResolvedValue({ email: "ana@example.com" });
    const agent = stubAgent();

    const res = await call("foreman/eve/v1/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "next-auth.session-token=secret",
        authorization: "Bearer from-the-browser",
        "x-just-agents-user": "admin@example.com",
      },
      body: '{"message":"hi"}',
    });

    expect(res.status).toBe(202);
    expect(res.headers.get("x-eve-session-id")).toBe("wrun_1");
    const [url, init] = agent.mock.calls[0] ?? [];
    expect(url).toBe("http://agent-foreman:4274/eve/v1/session");
    const sent = new Headers(init?.headers);
    expect(sent.get("authorization")).toBe("Bearer web-secret");
    expect(sent.get("x-just-agents-user")).toBe("ana@example.com");
    expect(sent.get("cookie")).toBeNull();
    expect(init?.body).toBe('{"message":"hi"}');
  });

  it("keeps the stream's query and tells proxies not to buffer it", async () => {
    authorize.mockResolvedValue({ email: "ana@example.com" });
    const agent = stubAgent();

    const res = await call(
      "foreman/eve/v1/session/wrun_1/stream?startIndex=0",
      {
        method: "GET",
      },
    );

    expect(agent.mock.calls[0]?.[0]).toBe(
      "http://agent-foreman:4274/eve/v1/session/wrun_1/stream?startIndex=0",
    );
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
  });

  it.each([
    ["an agent route outside the chat", "foreman/youtrack/webhook"],
    ["an agent not in JUST_AGENTS", "nobody/eve/v1/session"],
  ])("refuses %s", async (_, path) => {
    authorize.mockResolvedValue({ email: "ana@example.com" });
    const agent = stubAgent();

    const res = await call(path, { method: "POST", body: "{}" });

    expect(res.status).toBe(404);
    expect(agent).not.toHaveBeenCalled();
  });

  it("reaches no agent for a user without chat rights", async () => {
    authorize.mockRejectedValue(new ForbiddenError("viewer"));
    const agent = stubAgent();

    const res = await call("foreman/eve/v1/session", {
      method: "POST",
      body: "{}",
    });

    expect(res.status).toBe(403);
    expect(agent).not.toHaveBeenCalled();
  });
});
