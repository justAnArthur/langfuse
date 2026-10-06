import { Bot } from "lucide-react";
import type { Route } from "@/src/components/layouts/routes";

/**
 * The fork's nav entries. `routes.tsx` passes its own section value in, so this
 * module needs nothing from it at runtime and the two never import in a cycle.
 */
export const agentRoutes = (section: Route["section"]): Route[] => [
  {
    title: "Agents",
    icon: Bot,
    section,
    href: `/project/[projectId]/agents`,
    projectRbacScopes: ["playground:execute"],
  },
];
