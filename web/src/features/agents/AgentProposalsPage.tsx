import { useRouter } from "next/router";
import { useState } from "react";
import DiffViewer from "@/src/components/DiffViewer";
import { Button } from "@/src/components/design-system/Button/Button";
import { Badge } from "@/src/components/ui/badge";
import { Textarea } from "@/src/components/ui/textarea";
import { AgentHubPage } from "./components/AgentHubPage";
import { hubStatus, RuleFields } from "./components/hubBits";
import {
  type Proposal,
  type Rule,
  useDecideProposal,
  useIsHubOwner,
  useMemoryDocument,
  usePlaybook,
} from "./useHub";

const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "error",
} as const;

export default function AgentProposalsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const playbook = usePlaybook(projectId, agentId);
  const owner = useIsHubOwner(projectId);
  const proposals = playbook.data?.proposals ?? [];
  const pending = proposals.filter((p) => p.status === "pending");
  const settled = proposals.filter((p) => p.status !== "pending");

  const card = (proposal: Proposal) => (
    <ProposalCard
      key={proposal.id}
      proposal={proposal}
      rules={playbook.data?.rules ?? []}
      owner={owner}
      projectId={projectId}
    />
  );

  return (
    <AgentHubPage tab="proposals" withPadding>
      <div className="flex flex-col gap-4">
        {hubStatus(playbook)}
        <h2 className="font-bold">Pending</h2>
        {playbook.data && pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing waiting.</p>
        ) : null}
        {pending.map(card)}
        {settled.length ? <h2 className="font-bold">Recent</h2> : null}
        {settled.map(card)}
      </div>
    </AgentHubPage>
  );
}

const ProposalCard = ({
  proposal,
  rules,
  owner,
  projectId,
}: {
  proposal: Proposal;
  rules: Rule[];
  owner: boolean;
  projectId: string;
}) => {
  const pending = proposal.status === "pending";
  const target = rules.find((rule) => rule.id === proposal.target);

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground font-mono">#{proposal.id}</span>
        <Badge variant="outline">{proposal.kind}</Badge>
        {proposal.skill ? (
          <span className="font-mono">{proposal.skill}</span>
        ) : null}
        <Badge variant={STATUS_BADGE[proposal.status]}>{proposal.status}</Badge>
        {proposal.decided_by ? (
          <span className="text-muted-foreground text-xs">
            by {proposal.decided_by}
            {proposal.note ? `: ${proposal.note}` : null}
          </span>
        ) : null}
      </header>

      {proposal.why ? <p className="text-sm">{proposal.why}</p> : null}

      {proposal.kind === "add" && proposal.rule ? (
        <>
          {proposal.target ? (
            <p className="text-muted-foreground text-xs">
              Replaces rule #{proposal.target}
            </p>
          ) : null}
          <RuleFields rule={proposal.rule} />
        </>
      ) : null}

      {proposal.kind === "retire" ? (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            Retires rule #{proposal.target}
          </p>
          {target ? <RuleFields rule={target} /> : null}
        </div>
      ) : null}

      {proposal.kind === "memory" ? (
        <MemoryChange
          projectId={projectId}
          proposal={proposal}
          showDiff={pending}
        />
      ) : null}

      {owner && pending ? (
        <Decision projectId={projectId} id={proposal.id} />
      ) : null}
    </article>
  );
};

/** Against the document as it is now, which is what an approval replaces. */
const MemoryChange = ({
  projectId,
  proposal,
  showDiff,
}: {
  projectId: string;
  proposal: Proposal;
  showDiff: boolean;
}) => {
  const key = proposal.target_key ?? "";
  const current = useMemoryDocument(projectId, showDiff ? key : "");
  const moved =
    current.data && current.data.version !== proposal.expected_version;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground font-mono text-xs">{key}</p>
      {showDiff ? hubStatus(current) : null}
      {moved ? (
        <p className="text-sm text-amber-600">
          The document changed after this was proposed; approving it will fail.
        </p>
      ) : null}
      {current.data ? (
        <DiffViewer
          oldString={current.data.body ?? ""}
          newString={proposal.body ?? ""}
          oldLabel="Current"
          newLabel="Proposed"
        />
      ) : null}
    </div>
  );
};

/** A 409 (settled meanwhile, or the memory moved) refetches the list, so the card shows where it stands. */
const Decision = ({ projectId, id }: { projectId: string; id: number }) => {
  const [note, setNote] = useState("");
  const decide = useDecideProposal(projectId);

  const answer = (decision: "approve" | "reject") =>
    decide.mutate({ id, decision, note: note.trim() || undefined });

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder="Note (optional)"
        maxLength={400}
        className="min-h-[60px]"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button
          text="Approve"
          loading={decide.isPending && decide.variables?.decision === "approve"}
          disabled={decide.isPending}
          onClick={() => answer("approve")}
        />
        <Button
          text="Reject"
          variant="secondary"
          loading={decide.isPending && decide.variables?.decision === "reject"}
          disabled={decide.isPending}
          onClick={() => answer("reject")}
        />
        {decide.error ? (
          <span className="text-destructive text-sm">
            {decide.error.message}
          </span>
        ) : null}
      </div>
    </div>
  );
};
