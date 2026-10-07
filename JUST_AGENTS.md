# The just-agents fork

Upstream Langfuse plus an **Agents** section: a chat with each
[just-agents](https://github.com/justAnArthur/just-agents) deployment and a
history of those chats. Everything else is upstream, unchanged.

## What the fork adds

| Path | Purpose |
| --- | --- |
| `web/src/features/agents/**` | Pages, chat UI, agent registry, proxy |
| `web/src/app/api/agents-proxy/**` | `GET` agent list; the eve proxy |
| `web/src/pages/project/[projectId]/agents/**` | One-line page re-exports |
| `web/src/__tests__/server/unit/agentProxyHandler.servertest.ts` | Proxy contract |
| `web/src/__tests__/server/unit/invitedSignup.servertest.ts` | Invite-only sign-up |
| `.github/workflows/ja-publish-web.yml` | Image build on `ja/*` tags |
| `web/src/components/layouts/routes.tsx` | **Upstream file:** one import, one `...agentRoutes(...)` line |
| `web/package.json`, `pnpm-lock.yaml` | **Upstream files:** the `eve` dependency |
| `web/src/features/auth-credentials/server/signupApiHandler.ts`, `web/src/server/auth.ts` | **Upstream files:** the sign-up-disabled check calls `signupClosedFor(email)` |

## How it works

- The browser talks to `/api/agents-proxy/<projectId>/<agentId>/eve/v1/...`
  only. The proxy checks the Langfuse session (project member with
  `playground:execute`), allows the chat routes of eve's protocol and nothing
  else, drops cookies and the browser's authorization, and calls the agent
  with `Authorization: Bearer $WEB_CHAT_TOKEN` and `x-just-agents-user: <email>`.
- Every agent tags a conversation opened this way `webchat:<agentId>` and
  records the email as the Langfuse user. The history list is Langfuse's own
  sessions query filtered on that tag; opening one replays it from the agent
  (`initialSession` + `resume`), which also follows a turn still running.
- An agent ends a session after its timeout. The chat then shows the
  conversation read-only with a "New chat" button.
- Sign-up stays closed (`AUTH_DISABLE_SIGNUP`), except for an email with a
  pending invitation: creating that account is what accepts the invite.
  Without SMTP the invite email is skipped, so send the invitee
  `/auth/sign-up` yourself.

## Configuration (langfuse-web only)

| Variable | Example |
| --- | --- |
| `JUST_AGENTS` | `[{"id":"foreman","label":"Foreman","url":"http://agent-foreman:4274"}]` |
| `WEB_CHAT_TOKEN` | the same value every agent has |

`id` must equal the id the agent passes to agent-lib's `langfuse(...)`.

## Upgrading upstream

1. `git fetch upstream --tags && git rebase --onto vX.Y.Z vOLD just-agents`
2. Conflicts land in `routes.tsx` (re-add the two lines), the two sign-up
   checks (call `signupClosedFor` again), `web/package.json` and
   `pnpm-lock.yaml` (take upstream's, then `pnpm --filter web add eve@<version>`).
3. `pnpm --filter web exec tsc --noEmit`, the two unit tests, a local `pnpm dev`.
4. Tag `ja/X.Y.Z-ja.1`, push, and set `LANGFUSE_VERSION=X.Y.Z` and
   `LANGFUSE_WEB_TAG=X.Y.Z-ja.1` together in just-agents' Dokploy env.
