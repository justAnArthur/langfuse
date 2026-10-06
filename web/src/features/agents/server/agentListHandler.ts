import { NextResponse, type NextRequest } from "next/server";
import { BaseError } from "@langfuse/shared";
import { authorizeAgentChatOrThrow } from "./authorizeAgentChat";
import { listAgents, type PublicAgent } from "./registry";

/** Ids and labels only: agent URLs are compose-network addresses, not the browser's. */
export default async function agentListHandler(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await authorizeAgentChatOrThrow(projectId, req);
    const agents: PublicAgent[] = listAgents().map(({ id, label }) => ({
      id,
      label,
    }));
    return NextResponse.json(agents);
  } catch (err) {
    if (err instanceof BaseError) {
      return NextResponse.json(
        { error: err.name, message: err.message },
        { status: err.httpCode },
      );
    }
    throw err;
  }
}
