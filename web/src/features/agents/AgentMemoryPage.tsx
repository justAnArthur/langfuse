import Link from "next/link";
import { useRouter } from "next/router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { agentMemoryUrl } from "./agentPaths";
import { AgentHubPage } from "./components/AgentHubPage";
import { hubStatus, ScopeLabel } from "./components/hubBits";
import { useMemoryList } from "./useHub";

export default function AgentMemoryPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const documents = useMemoryList(projectId, agentId);

  return (
    <AgentHubPage tab="memory" withPadding>
      {hubStatus(documents, "No memory documents yet.")}
      {documents.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slot</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.data.map((doc) => (
              <TableRow key={doc.key}>
                <TableCell>
                  <Link
                    href={agentMemoryUrl(projectId, agentId, doc.key)}
                    className="font-mono hover:underline"
                  >
                    {doc.slot}
                  </Link>
                </TableCell>
                <TableCell>
                  <ScopeLabel doc={doc} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {doc.size}
                </TableCell>
                <TableCell>
                  {new Date(doc.updated_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </AgentHubPage>
  );
}
