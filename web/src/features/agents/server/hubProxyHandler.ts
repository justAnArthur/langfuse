import { NextResponse, type NextRequest } from "next/server";
import { BaseError } from "@langfuse/shared";
import { logger } from "@langfuse/shared/src/server";
import { authorizeAgentChatOrThrow } from "./authorizeAgentChat";
import { hubToken, hubUrl } from "./registry";

const AGENT = "[a-z0-9][a-z0-9_-]*";
// one encoded segment, never `.` or `..`, which fetch would resolve to a parent route
const KEY = "(?!\\.\\.?$)[^/]+";

/** The hub routes the pages use, each with its methods. Everything else hr serves stays unreachable. */
const ROUTES: { pattern: RegExp; methods: string[] }[] = [
  { pattern: /^hub\/v1\/(me|agents)$/, methods: ["GET"] },
  {
    pattern: new RegExp(`^hub/v1/agents/${AGENT}/(memory|playbook|traces)$`),
    methods: ["GET"],
  },
  {
    pattern: new RegExp(`^hub/v1/agents/${AGENT}/playbook/\\d+/retire$`),
    methods: ["POST"],
  },
  { pattern: new RegExp(`^hub/v1/memory/${KEY}$`), methods: ["GET", "PUT"] },
  { pattern: /^hub\/v1\/proposals\/\d+\/decision$/, methods: ["POST"] },
];

const HUB_TIMEOUT_MS = 15_000;

type Params = { projectId: string; path: string[] };

/**
 * hr believes `x-just-agents-user` and `x-just-agents-role` only behind HUB_TOKEN,
 * so the proxy sets both from the Langfuse session and forwards nothing else the
 * browser sent. hr decides who may write; the proxy decides who may ask.
 */
export default async function hubProxyHandler(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { projectId, path } = await params;
    const { email, role } = await authorizeAgentChatOrThrow(projectId, req);

    // Next hands the segments over decoded; a memory key's `/` must stay inside its segment.
    const route = path.map(encodeURIComponent).join("/");
    const allowed = ROUTES.find(({ pattern }) => pattern.test(route));
    if (!allowed)
      return NextResponse.json({ error: "NotFound" }, { status: 404 });
    if (!allowed.methods.includes(req.method))
      return NextResponse.json({ error: "MethodNotAllowed" }, { status: 405 });

    const url = hubUrl();
    const token = hubToken();
    if (!url || !token)
      return NextResponse.json(
        { error: "hub not configured" },
        { status: 503 },
      );

    const hasBody = req.method !== "GET";
    const headers = new Headers({
      authorization: `Bearer ${token}`,
      "x-just-agents-user": email,
      "x-just-agents-role": role,
    });
    if (hasBody) headers.set("content-type", "application/json");

    const upstream = await fetch(`${url}/${route}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      signal: AbortSignal.any([
        req.signal,
        AbortSignal.timeout(HUB_TIMEOUT_MS),
      ]),
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof BaseError) {
      return NextResponse.json(
        { error: err.name, message: err.message },
        { status: err.httpCode },
      );
    }
    if (req.signal.aborted) return new Response(null, { status: 499 });
    logger.error("Hub proxy failed", err);
    return NextResponse.json(
      { error: "BadGateway", message: "The hub did not answer." },
      { status: 502 },
    );
  }
}
