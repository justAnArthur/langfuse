import { useRouter } from "next/router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/src/components/design-system/Button/Button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { MarkdownView } from "@/src/components/ui/MarkdownViewer";
import { Textarea } from "@/src/components/ui/textarea";
import { AgentHubPage } from "./components/AgentHubPage";
import { hubStatus, RuleFields } from "./components/hubBits";
import {
  type Rule,
  useIsHubOwner,
  usePlaybook,
  useRetireRule,
  useSkills,
} from "./useHub";

type SkillView = { name: string; description?: string; markdown?: string };

export default function AgentSkillsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const skills = useSkills(projectId, agentId);
  const playbook = usePlaybook(projectId, agentId);
  const owner = useIsHubOwner(projectId);
  const rules = playbook.data?.rules ?? [];

  // a rule whose skill the agent no longer ships still shows, under its own name
  const shipped: SkillView[] = skills.data ?? [];
  const orphaned = [...new Set(rules.map((rule) => rule.skill))]
    .filter((name) => !shipped.some((skill) => skill.name === name))
    .map((name) => ({ name }));

  return (
    <AgentHubPage tab="skills">
      <div className="flex flex-col gap-6">
        {hubStatus(skills, "This agent has no skills.")}
        {hubStatus(playbook)}
        {[...shipped, ...orphaned].map((skill) => (
          <SkillSection
            key={skill.name}
            skill={skill}
            rules={rules.filter((rule) => rule.skill === skill.name)}
            owner={owner}
            projectId={projectId}
            agentId={agentId}
          />
        ))}
      </div>
    </AgentHubPage>
  );
}

const SkillSection = ({
  skill,
  rules,
  owner,
  projectId,
  agentId,
}: {
  skill: SkillView;
  rules: Rule[];
  owner: boolean;
  projectId: string;
  agentId: string;
}) => {
  const active = rules.filter((rule) => rule.active);
  const retired = rules.filter((rule) => !rule.active);

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <header>
        <h2 className="font-mono font-bold">{skill.name}</h2>
        {skill.description ? (
          <p className="text-muted-foreground text-sm">{skill.description}</p>
        ) : null}
      </header>
      {skill.markdown ? <MarkdownView markdown={skill.markdown} /> : null}

      <h3 className="text-sm font-bold">Playbook rules</h3>
      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active rules.</p>
      ) : null}
      {active.map((rule) => (
        <div key={rule.id} className="flex items-start gap-3">
          <span className="text-muted-foreground font-mono text-xs">
            #{rule.id}
          </span>
          <div className="flex-1">
            <RuleFields rule={rule} />
            {rule.verdict ? (
              <p className="text-muted-foreground text-xs">
                verdict {rule.verdict} {rule.verdict_on}
              </p>
            ) : null}
          </div>
          {owner ? (
            <RetireButton projectId={projectId} agentId={agentId} rule={rule} />
          ) : null}
        </div>
      ))}

      {retired.length ? (
        <Collapsible>
          <CollapsibleTrigger className="group text-muted-foreground flex items-center gap-1 text-sm">
            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
            {retired.length} retired
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-3 pt-3">
            {retired.map((rule) => (
              <div key={rule.id} className="flex gap-3 opacity-70">
                <span className="text-muted-foreground font-mono text-xs">
                  #{rule.id}
                </span>
                <div className="flex-1">
                  <RuleFields rule={rule} />
                  <p className="text-muted-foreground text-xs">
                    retired{" "}
                    {rule.retired_at
                      ? new Date(rule.retired_at).toLocaleDateString()
                      : null}
                    {rule.retired_reason ? `: ${rule.retired_reason}` : null}
                  </p>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </section>
  );
};

const RetireButton = ({
  projectId,
  agentId,
  rule,
}: {
  projectId: string;
  agentId: string;
  rule: Rule;
}) => {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const retire = useRetireRule(projectId, agentId);

  const onConfirm = () =>
    retire.mutate(
      { id: rule.id, why: why.trim() },
      { onSuccess: () => setOpen(false) },
    );

  return (
    <>
      <Button
        text="Retire"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) retire.reset();
        }}
        title={`Retire rule #${rule.id}?`}
        description="The agent stops following it. The playbook keeps it, with your reason, as retired."
        confirmLabel="Retire"
        loading={retire.isPending}
        confirmDisabled={!why.trim()}
        onConfirm={onConfirm}
      >
        <Textarea
          placeholder="Why (required)"
          maxLength={400}
          value={why}
          onChange={(event) => setWhy(event.target.value)}
        />
        {retire.error ? (
          <p className="text-destructive text-sm">{retire.error.message}</p>
        ) : null}
      </ConfirmDialog>
    </>
  );
};
