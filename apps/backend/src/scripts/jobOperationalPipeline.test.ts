import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJobOperationalPipelinePlan,
  parseJobOperationalPipelineArgs
} from "./jobOperationalPipeline.js";

describe("buildJobOperationalPipelinePlan", () => {
  it("plans the KR operational job pipeline without executing database writes", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalPipelinePlan({
      repoRoot,
      source: "saramin",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan).toMatchObject({
      source: "saramin",
      mode: "review",
      artifacts: {
        batchReviewPath: path.join(repoRoot, "tmp", "saramin_batch_review.json"),
        importApplySqlPath: path.join(
          repoRoot,
          "tmp",
          "job-operational-sql",
          "saramin_import_apply.sql"
        ),
        lifecycleSnapshotPath: path.join(
          repoRoot,
          "tmp",
          "saramin_existing_lifecycle_snapshot.json"
        ),
        lifecycleReportPath: path.join(repoRoot, "tmp", "saramin_lifecycle_dry_run.json"),
        lifecycleApplySqlPath: path.join(
          repoRoot,
          "tmp",
          "job-operational-sql",
          "saramin_lifecycle_apply.sql"
        )
      }
    });
    expect(plan.stages.map((stage) => stage.id)).toEqual([
      "collect_batch",
      "import_dry_run",
      "import_sql_artifact",
      "import_apply",
      "lifecycle_snapshot",
      "lifecycle_plan",
      "lifecycle_sql_artifact",
      "lifecycle_apply"
    ]);
  });

  it("uses the agreed batch collection defaults for KR review artifacts", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalPipelinePlan({
      repoRoot,
      source: "jobkorea",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.stages[0]).toMatchObject({
      id: "collect_batch",
      runner: "shell",
      status: "implemented",
      writesDb: false,
      requiresApproval: false,
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
  });

  it("keeps Supabase access explicit as a plugin-backed read step", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalPipelinePlan({
      repoRoot,
      source: "linkareer",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.stages[4]).toMatchObject({
      id: "lifecycle_snapshot",
      runner: "supabase_plugin",
      status: "external",
      writesDb: false,
      requiresApproval: false,
      outputPaths: [
        path.join(repoRoot, "tmp", "linkareer_existing_lifecycle_snapshot.json")
      ]
    });
  });

  it("marks DB mutation stages as approval-gated", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalPipelinePlan({
      repoRoot,
      source: "saramin",
      mode: "apply",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.stages[3]).toMatchObject({
      id: "import_apply",
      status: "implemented",
      writesDb: true,
      requiresApproval: true
    });
    expect(plan.stages[7]).toMatchObject({
      id: "lifecycle_apply",
      status: "implemented",
      writesDb: true,
      requiresApproval: true,
      inputPaths: [path.join(repoRoot, "tmp", "saramin_lifecycle_dry_run.json")]
    });
  });

  it("adds SQL artifact generation stages without database writes", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobOperationalPipelinePlan({
      repoRoot,
      source: "saramin",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.stages[2]).toMatchObject({
      id: "import_sql_artifact",
      runner: "shell",
      status: "implemented",
      writesDb: false,
      requiresApproval: false,
      command: "tsx",
      args: [
        path.join(repoRoot, "apps", "backend", "src", "scripts", "jobOperationalSqlArtifacts.ts"),
        "--batch",
        path.join(repoRoot, "tmp", "saramin_batch_review.json"),
        "--output-dir",
        path.join(repoRoot, "tmp", "job-operational-sql")
      ],
      outputPaths: [
        path.join(repoRoot, "tmp", "job-operational-sql", "saramin_import_apply.sql")
      ]
    });
    expect(plan.stages[6]).toMatchObject({
      id: "lifecycle_sql_artifact",
      writesDb: false,
      requiresApproval: false,
      inputPaths: [path.join(repoRoot, "tmp", "saramin_lifecycle_dry_run.json")],
      outputPaths: [
        path.join(repoRoot, "tmp", "job-operational-sql", "saramin_lifecycle_apply.sql")
      ]
    });
  });
});

describe("parseJobOperationalPipelineArgs", () => {
  it("parses source and mode while tolerating pnpm argument separators", () => {
    expect(parseJobOperationalPipelineArgs(["--", "--source", "saramin", "--mode", "apply"])).toEqual(
      {
        source: "saramin",
        mode: "apply"
      }
    );
  });

  it("allows JP GREEN sources while rejecting non-operational candidates", () => {
    expect(parseJobOperationalPipelineArgs(["--source", "mynavi_tenshoku"])).toEqual({
      source: "mynavi_tenshoku",
      mode: "review"
    });
    expect(() => parseJobOperationalPipelineArgs(["--source", "doda"])).toThrow(
      "Unsupported operational source: doda"
    );
  });
});
