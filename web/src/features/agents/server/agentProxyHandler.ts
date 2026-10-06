import { NextResponse, type NextRequest } from "next/server";
import { BaseError } from "@langfuse/shared";
import { logger } from "@langfuse/shared/src/server";
import { authorizeAgentChatOrThrow } from "./authorizeAgentChat";
import { findAgent, webChatToken } from "./registry";

/** The eve routes a chat needs. Everything else an agent serves stays unreachable. */
const ALLOWED_ROUTE =
  /^eve\/v1\/(info|session(\/[\w-]+(\/(stream|cancel)|\/subagents\/[\w-]+\/[\w-]+\/stream)?)?)$/;

/**
 * Cookies and the browser's own authorization never reach an agent. The agent
 * trusts `x-just-agents-user` only behind WEB_CHAT_TOKEN, so the proxy sets it
 * from the Langfuse session and drops whatever the browser sent.
 */
const forwardedRequestHeaders = (req: NextRequest, email: string) => {
  const headers = new Headers();
  for (const [name, value] of req.headers) {
    if (
      name === "content-type" ||
      name === "accept" ||
      name.startsWith("x-eve-")
    )
      headers.set(name, value);
  }
  headers.set("authorization", `Bearer ${webChatToken()}`);
  headers.set("x-just-agents-user", email);
  return headers;
};

const forwardedResponseHeaders = (upstream: Response) => {
  const headers = new Headers({
    // The session stream is NDJSON held open for a whole turn; compression or
    // a buffering proxy would hold its events back until the turn ends.
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  for (const [name, value] of upstream.headers) {
    if (name === "content-type" || name.startsWith("x-eve-"))
      headers.set(name, value);
  }
  return headers;
};

type Params = { projectId: string; agentId: string; path: string[] };

export default async function agentProxyHandler(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { projectId, agentId, path } = await params;
    const { email } = await authorizeAgentChatOrThrow(projectId, req);

    const agent = findAgent(agentId);
    const route = path.join("/");
    if (!agent || !ALLOWED_ROUTE.test(route))
      return NextResponse.json({ error: "NotFound" }, { status: 404 });

    const upstream = await fetch(`${agent.url}/${route}${req.nextUrl.search}`, {
      method: req.method,
      headers: forwardedRequestHeaders(req, email),
      body: req.method === "POST" ? await req.text() : undefined,
      signal: req.signal,
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: forwardedResponseHeaders(upstream),
    });
  } catch (err) {
    if (err instanceof BaseError) {
      return NextResponse.json(
        { error: err.name, message: err.message },
        { status: err.httpCode },
      );
    }
    if (req.signal.aborted) return new Response(null, { status: 499 });
    logger.error("Agent chat proxy failed", err);
    return NextResponse.json(
      { error: "BadGateway", message: "The agent did not answer." },
      { status: 502 },
    );
  }
}
