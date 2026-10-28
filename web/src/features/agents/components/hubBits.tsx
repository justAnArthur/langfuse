import type { ReactNode } from "react";
import { Badge } from "@/src/components/ui/badge";
import type { MemoryInfo, NewRule } from "../useHub";

type QueryState = { isLoading: boolean; error: Error | null; data?: unknown };

/** Loading, the hub's error, or `empty` for an empty list; nothing once there is data to show. */
export function hubStatus(query: QueryState, empty?: string): ReactNode {
  if (query.isLoading)
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (query.error)
    return <p className="text-destructive text-sm">{query.error.message}</p>;
  const isEmpty = Array.isArray(query.data) && query.data.length === 0;
  if (isEmpty && empty)
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  return null;
}

/** hr withholds a person's label from anyone but a platform owner. */
export const ScopeLabel = ({ doc }: { doc: MemoryInfo }) => {
  const hidden = doc.scope === "person" && !doc.label;
  return (
    <span className="flex items-center gap-2">
      <Badge variant="outline">{doc.scope}</Badge>
      <span className="text-muted-foreground text-xs">
        {hidden ? "hidden" : doc.label?.join(", ")}
      </span>
    </span>
  );
};

export const RuleFields = ({ rule }: { rule: NewRule }) => (
  <div className="flex flex-col gap-1 text-sm">
    <p>{rule.rule}</p>
    <p className="text-muted-foreground text-xs">
      Applies to: {rule.applies_to} · source {rule.source} · class{" "}
      {rule.evidence} · read {rule.read_on}, recheck {rule.recheck_on} ·{" "}
      {rule.measure ? `measure: ${rule.measure}` : "unmeasured"}
    </p>
  </div>
);
