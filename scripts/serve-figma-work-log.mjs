import { createServer } from 'node:http';
import { buildWorkLogExport, todayKstIso } from './export-work-log.mjs';

const DEFAULT_PORT = 3927;
const DEFAULT_HOST = 'localhost';
const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_ALLOWED_ORIGINS = ['https://www.figma.com', 'https://figma.com'];

let currentJob = null;
let nextJobNumber = 1;
const finishedJobs = new Map();

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

function allowedOrigins() {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.FIGMA_WORK_LOG_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'null') return process.env.FIGMA_WORK_LOG_ALLOW_NULL_ORIGIN === 'true';
  return allowedOrigins().has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  if (request.headers['access-control-request-private-network'] === 'true') {
    headers['Access-Control-Allow-Private-Network'] = 'true';
  }

  return headers;
}

function sendForbiddenOrigin(response) {
  response.writeHead(403, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify({ error: 'origin_not_allowed' }, null, 2));
}

function sendEmpty(request, response, statusCode) {
  response.writeHead(statusCode, corsHeaders(request));
  response.end();
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders(request),
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders(request),
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(payload);
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error('Request body is too large.');
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};

  return JSON.parse(text);
}

function makeJobId() {
  const id = `worklog-${Date.now()}-${nextJobNumber}`;
  nextJobNumber += 1;
  return id;
}

function buildJob({ date }) {
  const exportPayload = buildWorkLogExport({ date });
  return {
    id: makeJobId(),
    status: 'queued',
    delivered: false,
    createdAt: new Date().toISOString(),
    payload: {
      type: 'append-work-log',
      date: exportPayload.date,
      displayDate: exportPayload.displayDate,
      text: exportPayload.text,
    },
  };
}

function publicJobStatus(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    delivered: job.delivered,
    displayDate: job.payload?.displayDate,
    result: job.result ?? null,
    error: job.error ?? null,
  };
}

const port = Number(readArg('port') ?? process.env.FIGMA_WORK_LOG_PORT ?? DEFAULT_PORT);
const host = readArg('host') ?? process.env.FIGMA_WORK_LOG_HOST ?? DEFAULT_HOST;
const date = readArg('date') ?? todayKstIso();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);

  if (!isAllowedOrigin(request.headers.origin)) {
    sendForbiddenOrigin(response);
    return;
  }

  if (request.method === 'OPTIONS') {
    sendEmpty(request, response, 204);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(request, response, 200, {
      ok: true,
      date,
      currentJob: currentJob ? publicJobStatus(currentJob) : null,
      finishedJobCount: finishedJobs.size,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    sendText(
      request,
      response,
      200,
      [
        'Neet2Work Figma work log bridge',
        '',
        'GET  /health',
        'GET  /work-log',
        'POST /work-log/jobs',
        'GET  /work-log/jobs/next',
        'GET  /work-log/jobs/:id',
        'POST /work-log/jobs/:id/result',
        '',
      ].join('\n'),
    );
    return;
  }

  if (request.method === 'GET' && url.pathname === '/work-log') {
    try {
      sendJson(request, response, 200, buildWorkLogExport({ date }));
    } catch (error) {
      sendJson(request, response, 500, { error: 'work_log_export_failed', message: error.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/work-log/jobs') {
    if (currentJob) {
      sendJson(request, response, 409, {
        error: 'job_already_pending',
        message: `Job ${currentJob.id} is still ${currentJob.status}.`,
        job: publicJobStatus(currentJob),
      });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const jobDate = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : date;
      currentJob = buildJob({ date: jobDate });
      sendJson(request, response, 201, publicJobStatus(currentJob));
    } catch (error) {
      sendJson(request, response, 500, { error: 'job_create_failed', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/work-log/jobs/next') {
    if (!currentJob || currentJob.delivered) {
      sendEmpty(request, response, 204);
      return;
    }

    currentJob.status = 'processing';
    currentJob.delivered = true;
    currentJob.deliveredAt = new Date().toISOString();
    sendJson(request, response, 200, {
      id: currentJob.id,
      ...currentJob.payload,
    });
    return;
  }

  const jobStatusMatch = url.pathname.match(/^\/work-log\/jobs\/([^/]+)$/);
  if (request.method === 'GET' && jobStatusMatch) {
    const jobId = decodeURIComponent(jobStatusMatch[1]);
    const job = currentJob?.id === jobId ? currentJob : finishedJobs.get(jobId);
    if (!job) {
      sendJson(request, response, 404, { error: 'job_not_found' });
      return;
    }

    sendJson(request, response, 200, publicJobStatus(job));
    return;
  }

  const jobResultMatch = url.pathname.match(/^\/work-log\/jobs\/([^/]+)\/result$/);
  if (request.method === 'POST' && jobResultMatch) {
    const jobId = decodeURIComponent(jobResultMatch[1]);
    if (!currentJob || currentJob.id !== jobId) {
      sendJson(request, response, 404, { error: 'job_not_found' });
      return;
    }

    try {
      const body = await readJsonBody(request);
      currentJob.status = body.ok ? 'completed' : 'failed';
      currentJob.finishedAt = new Date().toISOString();
      currentJob.result = body.result ?? null;
      currentJob.error = body.error ?? null;
      finishedJobs.set(currentJob.id, currentJob);
      const finishedJob = currentJob;
      currentJob = null;
      sendJson(request, response, 200, publicJobStatus(finishedJob));
    } catch (error) {
      sendJson(request, response, 500, { error: 'job_result_failed', message: error.message });
    }
    return;
  }

  sendJson(request, response, 404, { error: 'not_found' });
});

server.listen(port, host, () => {
  console.log(`Figma work log server running at http://${host}:${port}`);
  console.log(`Serving KST date ${date}`);
  console.log('Queue a sync with corepack pnpm run figma:apply-log');
});
