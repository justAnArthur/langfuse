import { useRouter } from "next/router";
import { AgentHubPage } from "./components/AgentHubPage";
import { DocumentEditor } from "./components/DocumentEditor";
import { DocumentBody, hubStatus, ScopeLabel } from "./components/hubBits";
import { Revisions } from "./components/Revisions";
import { useIsHubOwner, useMemoryDocument, useSaveMemory } from "./useHub";

export default function MemoryDocumentPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const key = router.query.key as string;
  const doc = useMemoryDocument(projectId, key);
  const owner = useIsHubOwner(projectId);
  const save = useSaveMemory(projectId, key);

  return (
    <AgentHubPage tab="memory">
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
            <DocumentEditor key={doc.data.key} doc={doc.data} save={save} />
          ) : (
            <DocumentBody body={doc.data.body} />
          )}
          <Revisions
            body={doc.data.body ?? ""}
            revisions={doc.data.revisions}
          />
        </div>
      ) : null}
    </AgentHubPage>
  );
}
