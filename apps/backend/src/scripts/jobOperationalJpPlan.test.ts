import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJobOperationalJpPlan,
  parseJobOperationalJpPlanArgs
} from "./jobOperationalJpPlan.js";

describe("buildJobOperationalJpPlan", () => {
  it("starts JP operational architecture with mynavi_tenshoku by default", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalJpPlan({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan).toMatchObject({
      schemaVersion: "job_operational_jp_plan_v1",
      scope: "jp",
      country: "JP",
      defaultSource: "mynavi_tenshoku",
      sources: ["mynavi_tenshoku"],
      executionPolicy: "plan_only_no_db_writes"
    });
    expect(plan.sourcePlans[0]).toMatchObject({
      source: "mynavi_tenshoku",
      mode: "review",
      artifacts: {
        batchReviewPath: path.join(repoRoot, "tmp", "mynavi_tenshoku_batch_review.json"),
        importApplySqlPath: path.join(
          repoRoot,
          "tmp",
          "job-operational-sql",
          "mynavi_tenshoku_import_apply.sql"
        ),
        lifecycleReportPath: path.join(
          repoRoot,
          "tmp",
          "mynavi_tenshoku_lifecycle_dry_run.json"
        )
      }
    });
  });

  it("keeps the JP architecture source rollout explicit", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalJpPlan({ repoRoot });

    expect(plan.rollout).toEqual({
      nextSources: ["green_japan", "daijob", "careercross"],
      heldSources: ["doda", "rikunabi_next"],
      notes: [
        "Start with one JP/ja source before widening source-specific behavior.",
        "Keep DB writes approval-gated and out of the JP architecture start."
      ]
    });
    expect(plan.architectureCloseout).toMatchObject({
      goal: "jp_architecture_closeout",
      status: "in_progress",
      completionPolicy: "all_jp_green_sources_plan_only_no_db_writes"
    });
  });

  it("can plan another JP GREEN source without widening to all JP sources", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalJpPlan({
      repoRoot,
      sources: ["green_japan"]
    });

    expect(plan.sources).toEqual(["green_japan"]);
    expect(plan.sourcePlans[0]?.source).toBe("green_japan");
  });

  it("closes out JP architecture when all JP GREEN sources are planned", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalJpPlan({
      repoRoot,
      sources: ["mynavi_tenshoku", "green_japan", "daijob", "careercross"]
    });

    expect(plan.sources).toEqual(["mynavi_tenshoku", "green_japan", "daijob", "careercross"]);
    expect(plan.sourcePlans.map((sourcePlan) => sourcePlan.source)).toEqual([
      "mynavi_tenshoku",
      "green_japan",
      "daijob",
      "careercross"
    ]);
    expect(plan.rollout.nextSources).toEqual([]);
    expect(plan.rollout.heldSources).toEqual(["doda", "rikunabi_next"]);
    expect(plan.architectureCloseout).toEqual({
      goal: "jp_architecture_closeout",
      status: "ready_for_manual_db_review",
      completionPolicy: "all_jp_green_sources_plan_only_no_db_writes",
      requiredEvidence: [
        "jobs:operational:jp-plan emits every current JP GREEN source.",
        "Each JP source reuses the KR-proven collection, import dry-run, SQL artifact, lifecycle, and approval-gated apply stages.",
        "Sample checks pass for mynavi_tenshoku, green_japan, daijob, and careercross.",
        "doda and rikunabi_next remain held until fresh public HTML evidence changes their status.",
        "JP import and lifecycle database writes remain approval-gated."
      ],
      deferredWork: [
        "JP database import approval and apply.",
        "JP lifecycle snapshot/apply against Supabase.",
        "cron or background scheduling.",
        "source-specific JP inactive-threshold tuning.",
        "frontend exposure of JP lifecycle/category fields."
      ]
    });
  });
});

describe("parseJobOperationalJpPlanArgs", () => {
  it("parses optional JP GREEN source filters while tolerating pnpm separators", () => {
    expect(
      parseJobOperationalJpPlanArgs(["--", "--source", "mynavi_tenshoku", "--source", "daijob"])
    ).toEqual({
      sources: ["mynavi_tenshoku", "daijob"]
    });
  });

  it("parses all JP GREEN sources for close-out", () => {
    expect(parseJobOperationalJpPlanArgs(["--", "--all"])).toEqual({
      sources: ["mynavi_tenshoku", "green_japan", "daijob", "careercross"]
    });
  });

  it("rejects JP sources that are not GREEN operational candidates", () => {
    expect(() => parseJobOperationalJpPlanArgs(["--source", "doda"])).toThrow(
      "Unsupported JP operational source: doda"
    );
  });

  it("rejects ambiguous all-plus-source filters", () => {
    expect(() => parseJobOperationalJpPlanArgs(["--all", "--source", "daijob"])).toThrow(
      "--all cannot be combined with --source."
    );
  });
});
