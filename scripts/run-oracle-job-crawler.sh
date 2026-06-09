#!/usr/bin/env bash
set -euo pipefail

repo_root="${NEET2WORK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$repo_root"

sources_text="${JOB_CRAWLER_SOURCES:-saramin jobkorea linkareer}"
limit="${JOB_CRAWLER_LIMIT:-50}"
delay_seconds="${JOB_CRAWLER_DELAY_SECONDS:-1}"
source_cap="${JOB_CRAWLER_SOURCE_CAP:-20}"
category_cap="${JOB_CRAWLER_CATEGORY_CAP:-12}"
python_cmd="${PYTHON:-python3}"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
output_dir="${JOB_CRAWLER_OUTPUT_DIR:-tmp/oracle-job-crawler/$run_id}"

mkdir -p "$output_dir"

echo "job_crawler_run_id=$run_id"
echo "job_crawler_sources=$sources_text"
echo "job_crawler_limit=$limit"
echo "job_crawler_source_cap=$source_cap"
echo "job_crawler_category_cap=$category_cap"

for source in $sources_text; do
  output_path="$output_dir/${source}_batch.json"

  echo "collect_start source=$source output=$output_path"
  "$python_cmd" scripts/job_crawler/run_source.py \
    --source "$source" \
    --limit "$limit" \
    --delay-seconds "$delay_seconds" \
    --format batch \
    --mode batch \
    --source-cap "$source_cap" \
    --category-cap "$category_cap" \
    --output "$output_path"

  echo "import_dry_run_start source=$source"
  pnpm --filter @neet2work/backend exec tsx apps/backend/prisma/importJobPostings.ts \
    --dry-run "$output_path"

  echo "import_apply_start source=$source"
  pnpm --filter @neet2work/backend exec tsx apps/backend/prisma/importJobPostings.ts \
    "$output_path"

  echo "import_apply_done source=$source"
done

echo "job_crawler_done run_id=$run_id output_dir=$output_dir"
