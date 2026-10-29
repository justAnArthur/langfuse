import { ChevronRight } from "lucide-react";
import DiffViewer from "@/src/components/DiffViewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import type { Revision } from "../useHub";

/** Newest first; each one's body was replaced by the next newer one, the newest by the current body. */
export const Revisions = ({
  body,
  revisions,
}: {
  body: string;
  revisions: Revision[];
}) => {
  if (revisions.length === 0)
    return (
      <p className="text-muted-foreground text-sm">No earlier versions.</p>
    );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">History</h3>
      {revisions.map((revision, index) => (
        <RevisionDiff
          key={revision.id}
          revision={revision}
          replacedBy={index === 0 ? body : (revisions[index - 1]?.body ?? "")}
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
