# The just-agents fork

Upstream Langfuse plus an **Agents** section: a chat with each
[just-agents](https://github.com/justAnArthur/just-agents) deployment, a
history of those chats, and the hub: each agent's memory, skills, playbook
proposals and health. Everything else is upstream, unchanged.

## What the fork adds

| Path | Purpose |
| --- | --- |
| `web/src/features/agents/**` | Pages, chat UI (with tool approvals), agent registry, proxy |
| `web/src/app/api/agents-proxy/**` | `GET` agent list; the eve proxy |
| `web/src/app/api/hub-proxy/**` | The hub proxy to hr's `hub/v1` API |
| `web/src/pages/project/[projectId]/agents/**` | One-line page re-exports |
| `web/src/__tests__/server/unit/agentProxyHandler.servertest.ts` | Proxy contract |
| `web/src/__tests__/server/unit/hubProxyHandler.servertest.ts` | Hub proxy contract |
| `web/src/__tests__/server/unit/agentRegistry.servertest.ts` | Enabled agents filter |
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
- A tool call gated by eve's `approval` shows an approval card under its
  tool chip (`ApprovalCard.tsx`). Approve or Deny (with an optional note the
  model reads) goes back through the same proxy route as a message, as
  `inputResponses`; the card then shows the decision from eve's input ledger.
- An agent ends a session after its timeout. The chat then shows the
  conversation read-only with a "New chat" button.
- Sign-up stays closed (`AUTH_DISABLE_SIGNUP`), except for an email with a
  pending invitation: creating that account is what accepts the invite.
  Without SMTP the invite email is skipped, so send the invitee
  `/auth/sign-up` yourself.

## The hub

Each agent page has tabs: Chat | Overview | Memory | Skills | Proposals | Traces.

- Overview shows what the agent is made of, from its own `eve/v1/info`
  (through the chat proxy): description, model, the static instructions (its
  system prompt) and dynamic instruction sources, tools, subagents and remote
  agents, schedules, memory slots and channel routes.

- The data comes from hr's hub API through
  `/api/hub-proxy/<projectId>/hub/v1/...`. The proxy takes the same session
  check as the chat, sends `Authorization: Bearer $HUB_TOKEN`,
  `x-just-agents-user: <email>` and `x-just-agents-role: <project role>` (a
  global admin outside the project is `ADMIN`), and forwards nothing else the
  browser sent. It allows only these routes; anything else is 404, a wrong
  method 405:

  | Route | Methods |
  | --- | --- |
  | `hub/v1/me`, `hub/v1/agents` | GET |
  | `hub/v1/agents/<id>/(memory\|playbook)` | GET |
  | `hub/v1/agents/<id>/playbook/<n>/retire` | POST |
  | `hub/v1/memory/<key>` (one encoded segment) | GET, PUT |
  | `hub/v1/proposals/<n>/decision` | POST |

- hr decides who may write (OWNER or ADMIN plus a `PLATFORM_OWNERS` entry);
  the pages show the write controls only when `hub/v1/me` says `owner`.
- Skills read the skill text from the agent's own `eve/v1/info` (through the
  chat proxy) and the playbook rules from the hub.
- Traces opens Langfuse's traces table filtered on the tag every agent puts
  on its traces, `agent:<id>`.
- Without `HUB_URL` and `HUB_TOKEN` the proxy answers 503 and the agents list
  works as before, without health or pending counts.

## Configuration (langfuse-web only)

| Variable | Example |
| --- | --- |
| `JUST_AGENTS` | `[{"id":"foreman","label":"Foreman","url":"http://agent-foreman:4274"}]` |
| `WEB_CHAT_TOKEN` | the same value every agent has |
| `HUB_URL` | `http://agent-hr:4274` (hr) |
| `HUB_TOKEN` | the same value hr has |
| `JUST_AGENTS_ENABLED` | `foreman,surveyor`: the ids this deployment runs (just-agents passes its `COMPOSE_PROFILES`); unset lists every entry |

`id` must equal the id the agent passes to agent-lib's `langfuse(...)`.

## Upgrading upstream

1. `git fetch upstream --tags && git rebase --onto vX.Y.Z vOLD just-agents`
2. Conflicts land in `routes.tsx` (re-add the two lines), the two sign-up
   checks (call `signupClosedFor` again), `web/package.json` and
   `pnpm-lock.yaml` (take upstream's, then `pnpm --filter web add eve@<version>`).
3. `pnpm --filter web exec tsc --noEmit`, the unit tests above, a local `pnpm dev`.
4. Tag `ja/X.Y.Z-ja.1`, push, and set `LANGFUSE_VERSION=X.Y.Z` and
   `LANGFUSE_WEB_TAG=X.Y.Z-ja.1` together in just-agents' Dokploy env.
