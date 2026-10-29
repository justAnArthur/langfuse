import Link from "next/link";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { productsUrl } from "./agentPaths";
import { hubStatus } from "./components/hubBits";
import { useProducts } from "./useHub";

export default function ProductsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const products = useProducts(projectId);

  return (
    <Page
      headerProps={{
        title: "Products",
        breadcrumb: [{ name: "Agents", href: `/project/${projectId}/agents` }],
        help: {
          description:
            "Each product's goal, the brief every channel agent follows, the weekly review and the experiment log.",
        },
      }}
      withPadding
      scrollable
    >
      {hubStatus(products, "No products yet.")}
      {products.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Open experiments</TableHead>
              <TableHead className="text-right">Decided</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data.map(({ product, documents, experiments }) => (
              <TableRow key={product}>
                <TableCell>
                  <Link
                    href={productsUrl(projectId, product)}
                    className="font-mono hover:underline"
                  >
                    {product}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {documents.map((doc) => doc.slot).join(", ") || "none"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {experiments.open}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {experiments.decided}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </Page>
  );
}
