#!/usr/bin/env node
/**
 * Shared mock service used by the E2E stack (see .github/workflows/e2e.yml).
 *
 * This repository ships contracts and tooling only — there are no runtime
 * services here — so the E2E suite runs against lightweight reference mocks
 * that implement the minimal ControlPlane API surface the specs exercise and
 * answer with contract-valid payloads (packages/contracts):
 *
 *   any role:   GET  /health
 *   jobforge:   POST /jobs, GET /jobs/:id
 *   truthcore:  POST /assert, POST /query
 *
 * The role is selected with SERVICE_ROLE (truthcore | jobforge | runner).
 * Responses validate against JobRequest/JobResponse/ErrorEnvelope/TruthAssertion
 * from the canonical contracts; the specs safeParse them.
 */
'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

const ROLE = process.env.SERVICE_ROLE || 'truthcore';
const PORT = Number(process.env.PORT || 3000);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** In-memory job store for the jobforge role. */
const jobs = new Map();
/** In-memory assertion store for the truthcore role. */
const assertions = new Map();

// Job lifecycle is derived from elapsed time so the mock is stateless w.r.t.
// timers: queued (0-50ms) -> running (50-150ms) -> completed (result.success).
const QUEUED_MS = 50;
const RUNNING_MS = 150;

function errorEnvelope(category, code, message, details) {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    category,
    severity: 'error',
    code,
    message,
    details: details || [],
    service: ROLE,
    retryable: category !== 'VALIDATION_ERROR',
    contractVersion: { major: 1, minor: 0, patch: 0 },
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendError(res, status, category, code, message, details) {
  sendJson(res, status, { error: errorEnvelope(category, code, message, details) });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function readJson(req, res) {
  let raw;
  try {
    raw = await readBody(req);
  } catch {
    sendError(res, 400, 'VALIDATION_ERROR', 'E_INVALID_BODY', 'Could not read request body');
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    sendError(res, 400, 'VALIDATION_ERROR', 'E_INVALID_JSON', 'Malformed JSON in request body');
    return undefined;
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Minimal structural validation mirroring JobRequest from the contracts:
 * id (uuid), type (string), payload ({type,data}), metadata ({source,createdAt}).
 */
function validateJobRequest(body) {
  if (!isPlainObject(body)) return 'request body must be a JSON object';
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return 'id must be a UUID';
  if (typeof body.type !== 'string' || body.type.length === 0) return 'type is required';
  if (!isPlainObject(body.payload)) return 'payload is required';
  if (typeof body.payload.type !== 'string' || body.payload.type.length === 0) {
    return 'payload.type is required';
  }
  if (!isPlainObject(body.payload.data)) return 'payload.data must be an object';
  if (!isPlainObject(body.metadata)) return 'metadata is required';
  if (typeof body.metadata.source !== 'string' || body.metadata.source.length === 0) {
    return 'metadata.source is required';
  }
  if (typeof body.metadata.createdAt !== 'string') return 'metadata.createdAt is required';
  if (
    body.priority !== undefined &&
    (typeof body.priority !== 'number' || body.priority < 0 || body.priority > 100)
  ) {
    return 'priority must be a number between 0 and 100';
  }
  return null;
}

function jobStatusFor(job) {
  const elapsed = Date.now() - job.acceptedAt;
  if (elapsed >= RUNNING_MS) return 'completed';
  if (elapsed >= QUEUED_MS) return 'running';
  return 'queued';
}

function jobResponse(job) {
  const status = jobStatusFor(job);
  const resp = {
    id: job.id,
    status,
    request: job.request,
    updatedAt: new Date().toISOString(),
  };
  if (status === 'completed') {
    resp.result = {
      success: true,
      data: { echoed: job.request.payload.data },
      metadata: {
        startedAt: new Date(job.acceptedAt + QUEUED_MS).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - job.acceptedAt - QUEUED_MS),
        attempts: 1,
        runnerId: 'runner-example-001',
        runnerVersion: '1.0.0',
      },
    };
  }
  return resp;
}

function pruneJobs() {
  if (jobs.size < 5000) return;
  const cutoff = Date.now() - 30000;
  for (const [id, job] of jobs) {
    if (job.acceptedAt < cutoff) jobs.delete(id);
    if (jobs.size < 2500) break;
  }
}

function handleJobforge(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/jobs') {
    readJson(req, res).then((body) => {
      if (body === undefined) return; // malformed JSON already answered with 400
      const invalid = validateJobRequest(body);
      if (invalid) {
        sendError(res, 400, 'VALIDATION_ERROR', 'E_INVALID_JOB', invalid, [
          { message: invalid, code: 'E_INVALID_JOB' },
        ]);
        return;
      }
      pruneJobs();
      const job = { id: body.id, request: body, acceptedAt: Date.now() };
      jobs.set(job.id, job);
      sendJson(res, 202, jobResponse(job));
    });
    return;
  }

  const jobMatch = pathname.match(/^\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    if (!job) {
      sendError(res, 404, 'RESOURCE_NOT_FOUND', 'E_JOB_NOT_FOUND', `Unknown job: ${jobMatch[1]}`);
      return;
    }
    sendJson(res, 200, jobResponse(job));
    return;
  }

  sendError(res, 404, 'RESOURCE_NOT_FOUND', 'E_NOT_FOUND', `No route: ${req.method} ${pathname}`);
}

function validateAssertion(body) {
  if (!isPlainObject(body)) return 'request body must be a JSON object';
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return 'id must be a UUID';
  if (typeof body.subject !== 'string' || body.subject.length === 0) return 'subject is required';
  if (typeof body.predicate !== 'string' || body.predicate.length === 0)
    return 'predicate is required';
  if (typeof body.timestamp !== 'string') return 'timestamp is required';
  if (typeof body.source !== 'string' || body.source.length === 0) return 'source is required';
  if (
    body.confidence !== undefined &&
    (typeof body.confidence !== 'number' || body.confidence < 0 || body.confidence > 1)
  ) {
    return 'confidence must be a number between 0 and 1';
  }
  return null;
}

function handleTruthcore(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/assert') {
    readJson(req, res).then((body) => {
      if (body === undefined) return;
      const invalid = validateAssertion(body);
      if (invalid) {
        sendError(res, 400, 'VALIDATION_ERROR', 'E_INVALID_ASSERTION', invalid, [
          { message: invalid, code: 'E_INVALID_ASSERTION' },
        ]);
        return;
      }
      assertions.set(body.id, {
        id: body.id,
        subject: body.subject,
        predicate: body.predicate,
        object: body.object,
        confidence: typeof body.confidence === 'number' ? body.confidence : 1.0,
        timestamp: body.timestamp,
        source: body.source,
        metadata: isPlainObject(body.metadata) ? body.metadata : {},
      });
      sendJson(res, 201, { id: body.id, status: 'asserted', timestamp: new Date().toISOString() });
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/query') {
    readJson(req, res).then((body) => {
      if (body === undefined) return;
      if (!isPlainObject(body) || !isPlainObject(body.pattern)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'E_INVALID_QUERY', 'query.pattern is required');
        return;
      }
      const { subject, predicate } = body.pattern;
      const limit = typeof body.limit === 'number' && body.limit > 0 ? body.limit : 100;
      const matched = [];
      for (const assertion of assertions.values()) {
        if (subject !== undefined && assertion.subject !== subject) continue;
        if (predicate !== undefined && assertion.predicate !== predicate) continue;
        matched.push(assertion);
      }
      const page = matched.slice(0, limit);
      sendJson(res, 200, {
        queryId: randomUUID(),
        assertions: page,
        totalCount: matched.length,
        hasMore: matched.length > page.length,
        queryTimeMs: 0,
      });
    });
    return;
  }

  sendError(res, 404, 'RESOURCE_NOT_FOUND', 'E_NOT_FOUND', `No route: ${req.method} ${pathname}`);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'healthy',
      service: ROLE,
      name: ROLE,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (ROLE === 'jobforge') {
    handleJobforge(req, res, pathname);
  } else if (ROLE === 'truthcore') {
    handleTruthcore(req, res, pathname);
  } else {
    sendError(res, 404, 'RESOURCE_NOT_FOUND', 'E_NOT_FOUND', `No route: ${req.method} ${pathname}`);
  }
});

server.listen(PORT, () => {
  console.log(`[mock] ${ROLE} listening on :${PORT}`);
});
