import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  NEXT_PUBLIC_SIGN_UP_DISABLED: undefined as string | undefined,
  AUTH_DISABLE_SIGNUP: undefined as string | undefined,
}));
const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/src/env.mjs", () => ({ env }));
vi.mock("@langfuse/shared/src/db", () => ({
  prisma: { membershipInvitation: { findFirst } },
}));

import { signupClosedFor } from "@/src/features/agents/server/invitedSignup";

describe("signupClosedFor", () => {
  beforeEach(() => {
    env.NEXT_PUBLIC_SIGN_UP_DISABLED = undefined;
    env.AUTH_DISABLE_SIGNUP = "true";
    findFirst.mockReset();
  });

  it("stays open when sign-up is enabled", async () => {
    env.AUTH_DISABLE_SIGNUP = undefined;
    expect(await signupClosedFor("anyone@example.com")).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("lets an invited email in, matching case-insensitively", async () => {
    findFirst.mockResolvedValue({ id: "inv1" });
    expect(await signupClosedFor("Teammate@Example.com")).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: { email: "teammate@example.com" },
      select: { id: true },
    });
  });

  it("keeps everyone else out, whichever flag closed it", async () => {
    env.AUTH_DISABLE_SIGNUP = undefined;
    env.NEXT_PUBLIC_SIGN_UP_DISABLED = "true";
    findFirst.mockResolvedValue(null);
    expect(await signupClosedFor("stranger@example.com")).toBe(true);
  });

  it("keeps a profile without an email out", async () => {
    expect(await signupClosedFor(undefined)).toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
