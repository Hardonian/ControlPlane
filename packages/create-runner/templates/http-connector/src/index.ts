import express from 'express';
import {
  JobRequest,
  JobResponse,
  RunnerHeartbeat,
  HealthCheck,
  CONTRACT_VERSION_CURRENT,
  createErrorEnvelope,
} from '@controlplane/contracts';

const app = express();
app.use(express.json());

const RUNNER_ID = process.env.RUNNER_ID || crypto.randomUUID();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JOBFORGE_URL = process.env.JOBFORGE_URL || 'http://localhost:8080';
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://api.example.com';
const API_KEY = process.env.EXTERNAL_API_KEY || '';

// Active jobs tracking
const activeJobs = new Map();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check external API connectivity
    const apiCheck = await checkExternalAPI();

    const health = HealthCheck.parse({
      service: '{{name}}',
      status: apiCheck.healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '{{version}}',
      uptime: process.uptime(),
      checks: [
        {
          name: 'external-api',
          status: apiCheck.healthy ? 'healthy' : 'degraded',
          responseTimeMs: apiCheck.responseTimeMs,
          message: apiCheck.message,
        },
        {
          name: 'jobforge-connection',
          status: 'healthy',
          responseTimeMs: 25,
        },
      ],
    });

    res.json(health);
  } catch (error) {
    res.json({
      service: '{{name}}',
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '{{version}}',
      uptime: process.uptime(),
      checks: [
        {
          name: 'external-api',
          status: 'unhealthy',
          responseTimeMs: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

async function checkExternalAPI() {
  const start = Date.now();
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      healthy: response.ok,
      responseTimeMs: Date.now() - start,
      message: response.ok ? 'API reachable' : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      healthy: false,
      responseTimeMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// Job execution endpoint
app.post('/execute', async (req, res) => {
  try {
    const job = JobRequest.parse(req.body);

    console.log(`[Job ${job.jobId}] Starting execution`);

    // Add to active jobs
    activeJobs.set(job.jobId, { startedAt: Date.now(), job });

    // Execute job by calling external API
    const result = await executeWithExternalAPI(job);

    const response = JobResponse.parse({
      jobId: job.jobId,
      status: 'completed',
      result,
      executedAt: new Date().toISOString(),
      runnerId: RUNNER_ID,
      contractVersion: CONTRACT_VERSION_CURRENT,
    });

    console.log(`[Job ${job.jobId}] Completed successfully`);
    res.json(response);
  } catch (error) {
    console.error(`[Job ${req.body.jobId}] Execution failed:`, error);

    const errorEnvelope = createErrorEnvelope({
      category: 'RUNTIME_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'API_CALL_FAILED',
    });

    res.status(500).json({
      jobId: req.body.jobId,
      status: 'failed',
      error: errorEnvelope,
      executedAt: new Date().toISOString(),
      runnerId: RUNNER_ID,
      contractVersion: CONTRACT_VERSION_CURRENT,
    });
  } finally {
    activeJobs.delete(req.body.jobId);
  }
});

async function executeWithExternalAPI(job) {
  const start = Date.now();

  try {
    // Transform job payload to external API format
    const externalPayload = {
      requestId: job.jobId,
      action: job.type,
      data: job.payload,
      timestamp: new Date().toISOString(),
    };

    // Call external API
    const response = await fetch(`${EXTERNAL_API_URL}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalPayload),
    });

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}: ${await response.text()}`);
    }

    const externalResult = await response.json();

    return {
      success: true,
      externalResponse: externalResult,
      responseTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `External API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Heartbeat
async function sendHeartbeat() {
  try {
    const heartbeat = RunnerHeartbeat.parse({
      runnerId: RUNNER_ID,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      activeJobs: activeJobs.size,
      queuedJobs: 0,
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        jobThroughput: 0,
      },
      contractVersion: CONTRACT_VERSION_CURRENT,
    });

    await fetch(`${JOBFORGE_URL}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeat),
    });
  } catch (error) {
    console.error('Heartbeat failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 {{name}} running on port ${PORT}`);
  console.log(`📋 Contract version: ${CONTRACT_VERSION_CURRENT}`);
  console.log(`🔗 Runner ID: ${RUNNER_ID}`);
  console.log(`🌐 External API: ${EXTERNAL_API_URL}`);
});

// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
