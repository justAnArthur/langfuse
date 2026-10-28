import { useRouter } from "next/router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import DiffViewer from "@/src/components/DiffViewer";
import { Button } from "@/src/components/design-system/Button/Button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { Textarea } from "@/src/components/ui/textarea";
import { AgentHubPage } from "./components/AgentHubPage";
import { hubStatus, ScopeLabel } from "./components/hubBits";
import {
  HubError,
  type MemoryDocument,
  type Revision,
  useIsHubOwner,
  useMemoryDocument,
  useSaveMemory,
} from "./useHub";

export default function MemoryDocumentPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const key = router.query.key as string;
  const doc = useMemoryDocument(projectId, key);
  const owner = useIsHubOwner(projectId);

  return (
    <AgentHubPage tab="memory" withPadding>
      {hubStatus(doc)}
      {doc.data ? (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h2 className="font-mono text-lg">{doc.data.slot}</h2>
            <span className="text-muted-foreground flex items-center gap-3 text-xs">
              <ScopeLabel doc={doc.data} />
              {doc.data.size} chars · updated{" "}
              {new Date(doc.data.updated_at).toLocaleString()}
            </span>
          </header>
          {owner ? (
            <MemoryEditor
              key={doc.data.key}
              projectId={projectId}
              doc={doc.data}
            />
          ) : (
            <pre className="bg-muted rounded-md p-3 font-mono text-sm whitespace-pre-wrap">
              {doc.data.body ?? ""}
            </pre>
          )}
          <Revisions doc={doc.data} />
        </div>
      ) : null}
    </AgentHubPage>
  );
}

/**
 * The draft and the version it was based on survive a refetch, so the agent
 * writing meanwhile never replaces the draft and the save gets hr's 409.
 */
const MemoryEditor = ({
  projectId,
  doc,
}: {
  projectId: string;
  doc: MemoryDocument;
}) => {
  const [base, setBase] = useState({
    version: doc.version,
    body: doc.body ?? "",
  });
  const [draft, setDraft] = useState(base.body);
  const save = useSaveMemory(projectId, doc.key);
  const conflict = save.error instanceof HubError && save.error.status === 409;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        className="min-h-[320px] font-mono"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button
          text="Save"
          loading={save.isPending}
          disabled={draft === base.body}
          onClick={() =>
            save.mutate(
              { content: draft, expectedVersion: base.version },
              {
                onSuccess: ({ version }) => setBase({ version, body: draft }),
              },
            )
          }
        />
        {save.error ? (
          <span className="text-destructive text-sm">
            {conflict
              ? "Changed since you opened it. Reload to see the new version."
              : save.error.message}
          </span>
        ) : null}
      </div>
    </div>
  );
};

/** Newest first; each one's body was replaced by the next newer one, the newest by the current body. */
const Revisions = ({ doc }: { doc: MemoryDocument }) => {
  if (doc.revisions.length === 0)
    return (
      <p className="text-muted-foreground text-sm">No earlier versions.</p>
    );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">History</h3>
      {doc.revisions.map((revision, index) => (
        <RevisionDiff
          key={revision.id}
          revision={revision}
          replacedBy={
            index === 0
              ? (doc.body ?? "")
              : (doc.revisions[index - 1]?.body ?? "")
          }
        />
      ))}
    </section>
  );
};

const RevisionDiff = ({
  revision,
  replacedBy,
}: {
  revision: Revision;
  replacedBy: string;
}) => (
  <Collapsible className="rounded-md border">
    <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
      Replaced {new Date(revision.replaced_at).toLocaleString()} by{" "}
      {revision.by ?? "the agent"}
    </CollapsibleTrigger>
    <CollapsibleContent className="border-t p-3">
      <DiffViewer
        oldString={revision.body}
        newString={replacedBy}
        oldLabel="Before"
        newLabel="After"
      />
    </CollapsibleContent>
  </Collapsible>
);
