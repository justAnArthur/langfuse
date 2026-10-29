import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/src/components/design-system/Button/Button";
import { Textarea } from "@/src/components/ui/textarea";
import { type DocumentWrite, HubError } from "../useHub";

type DocumentEditorProps = {
  doc: { body: string | null; version: string | null };
  save: UseMutationResult<{ version: string }, Error, DocumentWrite>;
};

/**
 * The draft and the version it was based on survive a refetch, so someone
 * writing meanwhile never replaces the draft and the save gets hr's 409.
 */
export const DocumentEditor = ({ doc, save }: DocumentEditorProps) => {
  const [base, setBase] = useState({
    version: doc.version,
    body: doc.body ?? "",
  });
  const [draft, setDraft] = useState(base.body);
  const conflict = save.error instanceof HubError && save.error.status === 409;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        // grows with the text up to 70vh, then scrolls; where field-sizing is
        // unsupported it stays at the minimum and scrolls
        className="field-sizing-content max-h-[70vh] min-h-[320px] font-mono"
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
              { body: draft, version: base.version },
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
