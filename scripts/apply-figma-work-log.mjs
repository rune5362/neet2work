const DEFAULT_BRIDGE_URL = 'http://localhost:3927';
const DEFAULT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 750;

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function getJson(url) {
  const response = await fetch(url);
  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function waitForJob({ bridgeUrl, jobId, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJson(`${bridgeUrl}/work-log/jobs/${encodeURIComponent(jobId)}`);

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(job.error ?? 'Figma plugin reported failure.');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for Figma plugin result after ${timeoutMs}ms.`);
}

async function main() {
  const bridgeUrl = (readArg('bridge') ?? process.env.FIGMA_WORK_LOG_BRIDGE_URL ?? DEFAULT_BRIDGE_URL).replace(
    /\/+$/,
    '',
  );
  const date = readArg('date');
  const timeoutMs = Number(readArg('timeout-ms') ?? DEFAULT_TIMEOUT_MS);
  const noWait = process.argv.includes('--no-wait');

  try {
    const job = await postJson(`${bridgeUrl}/work-log/jobs`, { date });
    console.log(`Queued ${job.id} for ${job.displayDate}.`);

    if (noWait) {
      console.log('Not waiting for Figma plugin result because --no-wait was set.');
      return;
    }

    const finishedJob = await waitForJob({ bridgeUrl, jobId: job.id, timeoutMs });
    const resultText = finishedJob.result?.skipped
      ? 'Figma WORK_LOG was already up to date.'
      : `Figma WORK_LOG ${finishedJob.result?.mode ?? 'updated'}.`;
    console.log(resultText);
  } catch (error) {
    console.error(error.message);
    console.error('Start the bridge with npm.cmd run figma:bridge and keep the Figma plugin runner open.');
    process.exitCode = 1;
  }
}

await main();
