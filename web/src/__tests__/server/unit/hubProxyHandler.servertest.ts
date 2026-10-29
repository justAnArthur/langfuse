import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/src/server/auth", () => ({
  getServerAuthSessionForRequest: getSession,
}));

import hubProxyHandler from "@/src/features/agents/server/hubProxyHandler";

const signedIn = (role: string | null, admin = false) =>
  getSession.mockResolvedValue({
    user: {
      email: "ana@example.com",
      admin,
      organizations: [
        { projects: role ? [{ id: "p1", role }] : [{ id: "other", role }] },
      ],
    },
  });

beforeEach(() => {
  process.env.HUB_URL = "http://agent-hr:4274";
  process.env.HUB_TOKEN = "hub-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
  getSession.mockReset();
});

const call = (
  path: string[],
  init: ConstructorParameters<typeof NextRequest>[1] = { method: "GET" },
  search = "",
) =>
  hubProxyHandler(
    new NextRequest(
      `http://langfuse/api/hub-proxy/p1/${path.map(encodeURIComponent).join("/")}${search}`,
      init,
    ),
    { params: Promise.resolve({ projectId: "p1", path }) },
  );

const stubHub = () =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ ok: true }, { status: 200 }));

const sentHeaders = (hub: ReturnType<typeof stubHub>) =>
  new Headers(hub.mock.calls[0]?.[1]?.headers);

describe("hub proxy", () => {
  it("vouches for the signed-in user and their project role, and nothing the browser sent", async () => {
    signedIn("MEMBER");
    const hub = stubHub();

    const res = await call(["hub", "v1", "agents", "foreman", "memory"], {
      method: "GET",
      headers: {
        cookie: "next-auth.session-token=secret",
        authorization: "Bearer from-the-browser",
        "x-just-agents-user": "boss@example.com",
        "x-just-agents-role": "OWNER",
      },
    });

    expect(res.status).toBe(200);
    expect(hub.mock.calls[0]?.[0]).toBe(
      "http://agent-hr:4274/hub/v1/agents/foreman/memory",
    );
    const sent = sentHeaders(hub);
    expect(sent.get("authorization")).toBe("Bearer hub-secret");
    expect(sent.get("x-just-agents-user")).toBe("ana@example.com");
    expect(sent.get("x-just-agents-role")).toBe("MEMBER");
    expect(sent.get("cookie")).toBeNull();
  });

  it("sends a global admin outside the project as ADMIN", async () => {
    signedIn(null, true);
    const hub = stubHub();

    await call(["hub", "v1", "me"]);

    expect(sentHeaders(hub).get("x-just-agents-role")).toBe("ADMIN");
  });

  it("keeps a memory key one segment and passes the page query on", async () => {
    signedIn("OWNER");
    const hub = stubHub();

    await call(["hub", "v1", "memory", "foreman/notes"], undefined, "?x=1");

    expect(hub.mock.calls[0]?.[0]).toBe(
      "http://agent-hr:4274/hub/v1/memory/foreman%2Fnotes?x=1",
    );
  });

  it.each([
    ["PUT", ["hub", "v1", "memory", "foreman/notes"]],
    ["POST", ["hub", "v1", "proposals", "7", "decision"]],
    ["POST", ["hub", "v1", "agents", "foreman", "playbook", "3", "retire"]],
    ["PUT", ["hub", "v1", "products", "camasys", "documents", "brief-seo"]],
    ["POST", ["hub", "v1", "experiments", "12", "decision"]],
  ])("forwards the body of a %s", async (method, path) => {
    signedIn("OWNER");
    const hub = stubHub();

    const res = await call(path, {
      method,
      headers: { "content-type": "text/plain" },
      body: '{"decision":"approve"}',
    });

    expect(res.status).toBe(200);
    const init = hub.mock.calls[0]?.[1];
    expect(init?.method).toBe(method);
    expect(init?.body).toBe('{"decision":"approve"}');
    expect(sentHeaders(hub).get("content-type")).toBe("application/json");
  });

  it("passes the hub's status and error through", async () => {
    signedIn("MEMBER");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "only a platform owner" }, { status: 403 }),
    );

    const res = await call(["hub", "v1", "memory", "k"], {
      method: "PUT",
      body: "{}",
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "only a platform owner" });
  });

  it.each([
    ["a route outside the hub's pages", ["hub", "v1", "agents", "foreman"]],
    [
      "the traces route, which the pages link to Langfuse for",
      ["hub", "v1", "agents", "foreman", "traces"],
    ],
    [
      "an agent id outside the registry's form",
      ["hub", "v1", "agents", "../x", "memory"],
    ],
    ["a parent segment as a key", ["hub", "v1", "memory", ".."]],
    [
      "a product slot the pages never ask for",
      ["hub", "v1", "products", "camasys", "documents", "notes", "revisions"],
    ],
    ["a product id outside the slug form", ["hub", "v1", "products", "../x"]],
    ["the agent's own api", ["eve", "v1", "session"]],
  ])("refuses %s", async (_, path) => {
    signedIn("OWNER");
    const hub = stubHub();

    const res = await call(path);

    expect(res.status).toBe(404);
    expect(hub).not.toHaveBeenCalled();
  });

  it("lets the weekly review be read with the product, never written", async () => {
    signedIn("OWNER");
    const hub = stubHub();

    const res = await call(
      ["hub", "v1", "products", "camasys", "documents", "weekly-review"],
      { method: "PUT", body: "{}" },
    );

    expect(res.status).toBe(404);
    expect(hub).not.toHaveBeenCalled();
  });

  it("refuses a method the route does not take", async () => {
    signedIn("OWNER");
    const hub = stubHub();

    const res = await call(["hub", "v1", "agents"], {
      method: "POST",
      body: "{}",
    });

    expect(res.status).toBe(405);
    expect(hub).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-member", () => signedIn(null)],
    ["a viewer", () => signedIn("VIEWER")],
  ])("reaches no hub for %s", async (_, signIn) => {
    signIn();
    const hub = stubHub();

    const res = await call(["hub", "v1", "me"]);

    expect(res.status).toBe(403);
    expect(hub).not.toHaveBeenCalled();
  });

  it("says so when the hub is not configured", async () => {
    signedIn("OWNER");
    delete process.env.HUB_TOKEN;
    const hub = stubHub();

    const res = await call(["hub", "v1", "me"]);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "hub not configured" });
    expect(hub).not.toHaveBeenCalled();
  });

  it("answers 502 when the hub is down", async () => {
    signedIn("OWNER");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("refused"));

    const res = await call(["hub", "v1", "me"]);

    expect(res.status).toBe(502);
  });
});
