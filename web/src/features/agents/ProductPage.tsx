import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import { Button } from "@/src/components/design-system/Button/Button";
import Page from "@/src/components/layouts/page";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { productsUrl } from "./agentPaths";
import { DocumentEditor } from "./components/DocumentEditor";
import { DocumentBody, hubStatus } from "./components/hubBits";
import { Revisions } from "./components/Revisions";
import type { PublicAgent } from "./server/registry";
import { useAgents } from "./useAgents";
import {
  type Experiment,
  type ProductDocument,
  useDecideExperiment,
  useIsHubOwner,
  useProduct,
  useProductRevisions,
  useSaveProductDocument,
  type Verdict,
  VERDICTS,
} from "./useHub";

const BRIEF = "brief-";

const VERDICT = {
  keep: { label: "Keep", badge: "success" },
  iterate: { label: "Iterate", badge: "warning" },
  revert: { label: "Revert", badge: "error" },
  noise: { label: "Noise", badge: "secondary" },
} as const satisfies Record<Verdict, unknown>;

// hr may send a date column as `YYYY-MM-DD` or as midnight UTC; either way the day is the first ten
const day = (date: string) => date.slice(0, 10);

export default function ProductPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const product = router.query.product as string;
  const query = useProduct(projectId, product);
  const owner = useIsHubOwner(projectId);
  const agents = useAgents(projectId).data ?? [];
  // briefs an owner started here and has not saved yet
  const [started, setStarted] = useState<string[]>([]);

  const documents = query.data?.documents ?? [];
  const find = (slot: string) => documents.find((doc) => doc.slot === slot);
  const briefs = [
    ...documents.map((doc) => doc.slot).filter((s) => s.startsWith(BRIEF)),
    ...started.filter((slot) => !find(slot)),
  ];
  const unbriefed = agents.filter(
    (agent) => !briefs.includes(BRIEF + agent.id),
  );
  const weeklyReview = find("weekly-review");

  const card = (slot: string, title: ReactNode) => (
    <ProductDocumentCard
      key={slot}
      projectId={projectId}
      product={product}
      slot={slot}
      title={title}
      doc={find(slot)}
      owner={owner}
    />
  );

  return (
    <Page
      headerProps={{
        title: product ?? "Product",
        breadcrumb: [
          { name: "Agents", href: `/project/${projectId}/agents` },
          { name: "Products", href: productsUrl(projectId) },
        ],
      }}
      withPadding
      scrollable
    >
      {hubStatus(query)}
      {query.data ? (
        <div className="flex flex-col gap-8">
          {card("goal", "Goal")}

          <section className="flex flex-col gap-3">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Briefs</h2>
              {owner && unbriefed.length ? (
                <StartBrief
                  agents={unbriefed}
                  onStart={(slot) => setStarted([...started, slot])}
                />
              ) : null}
            </header>
            {briefs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No briefs yet. Each channel agent runs its own strategy until
                its product has one.
              </p>
            ) : null}
            {briefs.map((slot) => card(slot, channelTitle(slot)))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">Weekly review</h2>
            {weeklyReview ? (
              <>
                <Updated doc={weeklyReview} />
                <DocumentBody body={weeklyReview.body} />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No weekly review yet.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">Experiments</h2>
            <Experiments
              projectId={projectId}
              experiments={query.data.experiments}
              owner={owner}
            />
          </section>
        </div>
      ) : null}
    </Page>
  );
}

const channelTitle = (slot: string) => (
  <span className="font-mono">{slot.slice(BRIEF.length)}</span>
);

const Updated = ({ doc }: { doc: ProductDocument }) => (
  <span className="text-muted-foreground text-xs">
    updated {new Date(doc.updated_at).toLocaleString()}
    {doc.updated_by ? ` by ${doc.updated_by}` : null}
  </span>
);

const EMPTY = { body: null, version: null };

/** Editable for an owner, with the document's history; a document not written yet starts empty. */
const ProductDocumentCard = ({
  projectId,
  product,
  slot,
  title,
  doc,
  owner,
}: {
  projectId: string;
  product: string;
  slot: string;
  title: ReactNode;
  doc: ProductDocument | undefined;
  owner: boolean;
}) => {
  const save = useSaveProductDocument(projectId, product, slot);
  const revisions = useProductRevisions(projectId, product, doc ? slot : "");

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-bold">{title}</h2>
        {doc ? <Updated doc={doc} /> : null}
      </header>
      {owner ? <DocumentEditor doc={doc ?? EMPTY} save={save} /> : null}
      {!owner && doc ? <DocumentBody body={doc.body} /> : null}
      {!owner && !doc ? (
        <p className="text-muted-foreground text-sm">Not written yet.</p>
      ) : null}
      {doc ? hubStatus(revisions) : null}
      {doc && revisions.data ? (
        <Revisions body={doc.body} revisions={revisions.data} />
      ) : null}
    </article>
  );
};

/** One brief per channel agent; the slot is `brief-<agent id>`. */
const StartBrief = ({
  agents,
  onStart,
}: {
  agents: PublicAgent[];
  onStart: (slot: string) => void;
}) => (
  <Select value="" onValueChange={(id) => onStart(BRIEF + id)}>
    <SelectTrigger className="w-56">
      <SelectValue placeholder="Add a brief for…" />
    </SelectTrigger>
    <SelectContent>
      {agents.map((agent) => (
        <SelectItem key={agent.id} value={agent.id}>
          {agent.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Experiments = ({
  projectId,
  experiments,
  owner,
}: {
  projectId: string;
  experiments: Experiment[];
  owner: boolean;
}) => {
  if (experiments.length === 0)
    return (
      <p className="text-muted-foreground text-sm">No experiments logged.</p>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hypothesis</TableHead>
          <TableHead>Metric</TableHead>
          <TableHead>Baseline</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Verdict</TableHead>
          <TableHead>Result</TableHead>
          {owner ? <TableHead /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {experiments.map((experiment) => (
          <ExperimentRow
            key={experiment.id}
            projectId={projectId}
            experiment={experiment}
            owner={owner}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const ExperimentRow = ({
  projectId,
  experiment,
  owner,
}: {
  projectId: string;
  experiment: Experiment;
  owner: boolean;
}) => {
  const [deciding, setDeciding] = useState(false);
  const decidable = owner && experiment.verdict === null;
  const cell = "align-top";

  return (
    <>
      <TableRow>
        <TableCell density="comfortable" className={cell}>
          <p>{experiment.hypothesis}</p>
          <p className="text-muted-foreground">
            <span className="font-mono">{experiment.agent}</span> ·{" "}
            {experiment.change}
          </p>
        </TableCell>
        <TableCell density="comfortable" className={cell}>
          {experiment.metric}
        </TableCell>
        <TableCell density="comfortable" className={cell}>
          {experiment.baseline}
        </TableCell>
        <TableCell density="comfortable" className={`${cell} tabular-nums`}>
          {day(experiment.verdict_due)}
        </TableCell>
        <TableCell density="comfortable" className={cell}>
          {experiment.verdict ? (
            <Badge variant={VERDICT[experiment.verdict].badge}>
              {experiment.verdict}
            </Badge>
          ) : (
            <Badge variant="outline">open</Badge>
          )}
          {experiment.decided_on ? (
            <p className="text-muted-foreground mt-1 tabular-nums">
              {day(experiment.decided_on)}
            </p>
          ) : null}
        </TableCell>
        <TableCell density="comfortable" className={cell}>
          {experiment.result}
        </TableCell>
        {owner ? (
          <TableCell density="comfortable" className={cell}>
            {decidable ? (
              <Button
                text={deciding ? "Cancel" : "Decide"}
                size="sm"
                variant="secondary"
                onClick={() => setDeciding(!deciding)}
              />
            ) : null}
          </TableCell>
        ) : null}
      </TableRow>
      {decidable && deciding ? (
        <TableRow>
          <TableCell density="comfortable" colSpan={7}>
            <VerdictForm projectId={projectId} id={experiment.id} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};

/** A 409 (decided meanwhile) refetches the product, so the row shows the verdict it got. */
const VerdictForm = ({ projectId, id }: { projectId: string; id: number }) => {
  const [result, setResult] = useState("");
  const decide = useDecideExperiment(projectId);
  const measured = result.trim();

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Result: the measured value and its window"
        value={result}
        onChange={(event) => setResult(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {VERDICTS.map((verdict) => (
          <Button
            key={verdict}
            text={VERDICT[verdict].label}
            size="sm"
            variant="secondary"
            loading={decide.isPending && decide.variables?.verdict === verdict}
            disabled={!measured || decide.isPending}
            onClick={() => decide.mutate({ id, verdict, result: measured })}
          />
        ))}
        <span className="text-muted-foreground text-xs">
          A verdict is final. Iterate means logging a new experiment.
        </span>
        {decide.error ? (
          <span className="text-destructive text-sm">
            {decide.error.message}
          </span>
        ) : null}
      </div>
    </div>
  );
};
