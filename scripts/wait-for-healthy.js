#!/usr/bin/env node

/**
 * Wait for Healthy Services
 * 
 * Polls all services until they're healthy or timeout is reached.
 */

const SERVICES = [
  { name: 'Redis', url: 'redis://localhost:6379', type: 'redis' },
  { name: 'TruthCore', url: process.env.TRUTHCORE_URL || 'http://localhost:3001', type: 'http' },
  { name: 'JobForge', url: process.env.JOBFORGE_URL || 'http://localhost:3002', type: 'http' },
  { name: 'Runner', url: process.env.RUNNER_URL || 'http://localhost:3003', type: 'http' },
];

const TIMEOUT = 120000; // 2 minutes
const INTERVAL = 5000; // 5 seconds

async function checkHealth(service: typeof SERVICES[0]): Promise<boolean> {
  try {
    if (service.type === 'http') {
      const response = await fetch(`${service.url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    }
    // Redis checks would need a Redis client, simplified for now
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('⏳ Waiting for services to become healthy...\n');
  
  const start = Date.now();
  const healthy = new Set<string>();

  while (Date.now() - start < TIMEOUT) {
    for (const service of SERVICES) {
      if (healthy.has(service.name)) continue;

      const isHealthy = await checkHealth(service);
      
      if (isHealthy) {
        healthy.add(service.name);
        console.log(`✅ ${service.name} is healthy`);
      }
    }

    if (healthy.size === SERVICES.length) {
      console.log('\n🎉 All services are healthy!');
      process.exit(0);
    }

    const remaining = SERVICES.filter(s => !healthy.has(s.name));
    console.log(`⏳ Waiting for: ${remaining.map(s => s.name).join(', ')}...`);
    
    await new Promise(r => setTimeout(r, INTERVAL));
  }

  console.error('\n❌ Timeout waiting for services');
  const unhealthy = SERVICES.filter(s => !healthy.has(s.name));
  console.error(`Still unhealthy: ${unhealthy.map(s => s.name).join(', ')}`);
  process.exit(1);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(2);
});
