import { prisma } from "@langfuse/shared/src/db";
import { env } from "@/src/env.mjs";

/**
 * just-agents keeps sign-up closed to the public, but an invited email may
 * still create its account: that is what accepts the invitation
 * (createProjectMembershipsOnSignup). Without this, an invite can never land.
 */
export async function signupClosedFor(email: string | null | undefined) {
  const closed =
    env.NEXT_PUBLIC_SIGN_UP_DISABLED === "true" ||
    env.AUTH_DISABLE_SIGNUP === "true";
  if (!closed) return false;
  if (!email) return true;

  const invitation = await prisma.membershipInvitation.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return !invitation;
}
