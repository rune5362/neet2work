import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJobOperationalManualRunPlan,
  parseJobOperationalManualRunArgs
} from "./jobOperationalManualRun.js";

describe("buildJobOperationalManualRunPlan", () => {
  it("builds one ordered KR manual run plan across all current operational sources", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalManualRunPlan({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan).toMatchObject({
      schemaVersion: "job_operational_manual_run_v1",
      scope: "kr",
      mode: "manual",
      sources: ["saramin", "jobkorea", "linkareer"],
      requiresSupabasePlugin: true,
      executionPolicy: "manual_steps_with_approval_gates"
    });
    expect(plan.steps.map((step) => step.id)).toEqual([
      "collect_batch",
      "import_dry_run",
      "import_sql_artifact",
      "import_apply_approval",
      "import_apply",
      "lifecycle_snapshot",
      "lifecycle_plan",
      "lifecycle_sql_artifact",
      "lifecycle_apply_approval",
      "lifecycle_apply",
      "post_apply_verification"
    ]);
  });

  it("reuses the source pipeline commands for local collection and dry-run steps", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalManualRunPlan({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });
    const collectStep = plan.steps[0]!;
    const dryRunStep = plan.steps[1]!;

    expect(collectStep.kind).toBe("local_commands");
    expect(collectStep.commands).toHaveLength(3);
    expect(collectStep.commands?.[1]).toMatchObject({
      source: "jobkorea",
      command: "python",
      args: [
        path.join(repoRoot, "scripts", "job_crawler", "run_source.py"),
        "--source",
        "jobkorea",
        "--limit",
        "50",
        "--delay-seconds",
        "1",
        "--format",
        "batch",
        "--mode",
        "batch",
        "--source-cap",
        "20",
        "--output",
        path.join(repoRoot, "tmp", "jobkorea_batch_review.json")
      ]
    });

    expect(dryRunStep.commands?.map((command) => command.source)).toEqual([
      "saramin",
      "jobkorea",
      "linkareer"
    ]);
    expect(dryRunStep.commands?.[0]?.args).toContain("--dry-run");
  });

  it("keeps Supabase read/write work explicit and approval-gated", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalManualRunPlan({ repoRoot });

    expect(plan.steps[5]).toMatchObject({
      id: "lifecycle_snapshot",
      kind: "supabase_sql",
      writesDb: false,
      requiresApproval: false,
      sqlPurpose: "export_existing_lifecycle_snapshot"
    });
    expect(plan.steps[8]).toMatchObject({
      id: "lifecycle_apply_approval",
      kind: "approval_gate",
      writesDb: false,
      requiresApproval: true
    });
    expect(plan.steps[9]).toMatchObject({
      id: "lifecycle_apply",
      kind: "supabase_sql",
      writesDb: true,
      requiresApproval: true,
      sqlPurpose: "apply_lifecycle_report"
    });
    expect(plan.supabaseSql.postApplyVerification).toContain("duplicate_count");
    expect(plan.supabaseSql.postApplyVerification).toContain("non_it");
  });

  it("allows running a subset when a source list is provided", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalManualRunPlan({
      repoRoot,
      sources: ["jobkorea"]
    });

    expect(plan.sources).toEqual(["jobkorea"]);
    expect(plan.steps[0]?.commands?.map((command) => command.source)).toEqual(["jobkorea"]);
  });

  it("includes SQL artifact generation steps before approval-gated writes", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalManualRunPlan({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.steps[2]).toMatchObject({
      id: "import_sql_artifact",
      kind: "local_commands",
      writesDb: false,
      requiresApproval: false
    });
    expect(plan.steps[2]?.commands?.[0]).toMatchObject({
      source: "saramin",
      command: "tsx",
      args: [
        path.join(repoRoot, "apps", "backend", "src", "scripts", "jobOperationalSqlArtifacts.ts"),
        "--batch",
        path.join(repoRoot, "tmp", "saramin_batch_review.json"),
        "--output-dir",
        path.join(repoRoot, "tmp", "job-operational-sql")
      ]
    });
    expect(plan.steps[7]).toMatchObject({
      id: "lifecycle_sql_artifact",
      kind: "local_commands",
      writesDb: false,
      requiresApproval: false
    });
    expect(plan.steps[7]?.commands?.[2]?.args).toEqual([
      path.join(repoRoot, "apps", "backend", "src", "scripts", "jobOperationalSqlArtifacts.ts"),
      "--lifecycle-report",
      path.join(repoRoot, "tmp", "linkareer_lifecycle_dry_run.json"),
      "--output-dir",
      path.join(repoRoot, "tmp", "job-operational-sql")
    ]);
  });
});

describe("parseJobOperationalManualRunArgs", () => {
  it("parses optional source filters while tolerating pnpm separators", () => {
    expect(
      parseJobOperationalManualRunArgs(["--", "--source", "saramin", "--source", "linkareer"])
    ).toEqual({
      sources: ["saramin", "linkareer"]
    });
  });

  it("rejects sources outside the KR manual operation scope", () => {
    expect(() => parseJobOperationalManualRunArgs(["--source", "green_japan"])).toThrow(
      "Unsupported manual run source: green_japan"
    );
  });
});
