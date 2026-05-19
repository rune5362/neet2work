import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJobOperationalSchedulerPlan,
  parseJobOperationalSchedulerArgs
} from "./jobOperationalScheduler.js";

describe("buildJobOperationalSchedulerPlan", () => {
  it("builds a manual-trigger scheduler skeleton from the manual run plan", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalSchedulerPlan({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan).toMatchObject({
      schemaVersion: "job_operational_scheduler_v1",
      scope: "kr",
      trigger: "manual",
      executionPolicy: "artifact_generation_only_no_db_writes",
      sources: ["saramin", "jobkorea", "linkareer"]
    });
    expect(plan.manualRunCommand).toMatchObject({
      command: "corepack",
      args: ["pnpm", "run", "jobs:operational:manual-run"]
    });
    expect(plan.steps.map((step) => step.id)).toEqual([
      "manual_run_plan",
      "collect_batch",
      "import_dry_run",
      "import_sql_artifact",
      "lifecycle_snapshot",
      "lifecycle_plan",
      "lifecycle_sql_artifact",
      "post_apply_verification"
    ]);
  });

  it("keeps write steps out of the scheduler execution skeleton", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalSchedulerPlan({ repoRoot });

    expect(plan.steps.every((step) => step.writesDb === false)).toBe(true);
    expect(plan.excludedApprovalGatedWriteSteps).toEqual(["import_apply", "lifecycle_apply"]);
    expect(plan.steps.map((step) => step.id)).not.toContain("import_apply");
    expect(plan.steps.map((step) => step.id)).not.toContain("lifecycle_apply");
  });

  it("states the KR architecture close-out contract before JP expansion", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalSchedulerPlan({ repoRoot });

    expect(plan.architectureCloseout).toMatchObject({
      goal: "kr_architecture_closeout_before_jp",
      jpExpansionPolicy: "start_jp_after_kr_architecture_rehearsal",
      requiredEvidence: [
        "scheduler plan emits all non-mutating KR steps",
        "3 KR sources can generate import SQL artifacts",
        "3 KR sources can generate lifecycle SQL artifacts",
        "runbook documents JP handoff and deferred KR details"
      ],
      deferredWork: [
        "cron or background scheduling",
        "automatic Supabase apply",
        "exhaustive closed/inactive edge-case tuning"
      ]
    });
  });

  it("supports source filters for single-source rehearsal loops", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalSchedulerPlan({
      repoRoot,
      sources: ["linkareer"]
    });

    expect(plan.sources).toEqual(["linkareer"]);
    expect(plan.steps[1]?.commands?.map((command) => command.source)).toEqual(["linkareer"]);
  });
});

describe("parseJobOperationalSchedulerArgs", () => {
  it("parses optional source filters while tolerating pnpm separators", () => {
    expect(
      parseJobOperationalSchedulerArgs(["--", "--source", "saramin", "--source", "jobkorea"])
    ).toEqual({
      sources: ["saramin", "jobkorea"]
    });
  });

  it("rejects sources outside the KR scheduler skeleton scope", () => {
    expect(() => parseJobOperationalSchedulerArgs(["--source", "green_japan"])).toThrow(
      "Unsupported scheduler source: green_japan"
    );
  });
});
