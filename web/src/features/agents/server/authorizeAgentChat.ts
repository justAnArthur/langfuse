import { getServerAuthSessionForRequest } from "@/src/server/auth";
import { isProjectMemberOrAdmin } from "@/src/server/utils/checkProjectMembershipOrAdmin";
import { hasProjectAccess } from "@/src/features/rbac";
import { ForbiddenError, UnauthorizedError } from "@langfuse/shared";
import { type Role } from "@langfuse/shared/src/db";

/**
 * Chatting with an agent runs it with real tools, so it takes the same right as
 * running the playground: members, admins and owners, not viewers.
 */
export const authorizeAgentChatOrThrow = async (
  projectId: string,
  request: Request,
): Promise<{ email: string; role: Role }> => {
  const session = await getServerAuthSessionForRequest(request);
  if (!session?.user) throw new UnauthorizedError("Unauthenticated");

  if (!isProjectMemberOrAdmin(session.user, projectId))
    throw new ForbiddenError("User is not a member of this project");

  if (!hasProjectAccess({ session, projectId, scope: "playground:execute" }))
    throw new ForbiddenError("Insufficient permissions to chat with agents.");

  // The agents record this as the conversation's user; an id would mean nothing there.
  const email = session.user.email;
  if (!email) throw new ForbiddenError("A user without an email cannot chat.");

  // hr's hub grants writes on this role; a global admin outside the project acts as ADMIN.
  const projectRole = session.user.organizations
    .flatMap((org) => org.projects)
    .find((project) => project.id === projectId)?.role;
  return { email, role: projectRole ?? "ADMIN" };
};
