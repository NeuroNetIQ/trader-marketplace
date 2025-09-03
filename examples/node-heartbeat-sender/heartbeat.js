#!/usr/bin/env node
/**
 * Node.js Heartbeat Sender Example
 * 
 * Demonstrates how to send deployment heartbeats to the marketplace
 * to show your model is alive and healthy.
 */

import fetch from 'node-fetch';

class HeartbeatSender {
  constructor(apiUrl, marketplaceToken) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.marketplaceToken = marketplaceToken;
    this.vendorId = process.env.VENDOR_ID || 'node_example';
    this.deploymentId = process.env.DEPLOYMENT_ID || 'dep_node_example';
    this.modelVersion = process.env.MODEL_VERSION || '1.0.0';
  }

  async sendHeartbeat(status = 'ready', metrics = {}) {
    const heartbeat = {
      deployment_id: this.deploymentId,
      status, // 'ready' | 'error' | 'maintenance' | 'offline'
      timestamp: new Date().toISOString(),
      metrics: {
        cpu_usage: this.getCpuUsage(),
        memory_usage: this.getMemoryUsage(),
        avg_latency_ms: this.getAverageLatency(),
        requests_last_minute: this.getRequestCount(),
        error_count_last_minute: 0,
        ...metrics
      },
      message: `Heartbeat from ${this.modelVersion}`
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.marketplaceToken}`,
      'X-Marketplace-Contracts-Version': '0.2.0',
      'User-Agent': `node-heartbeat-sender/1.0.0 vendor/${this.vendorId}`,
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/marketplace/vendor/heartbeats`, {
        method: 'POST',
        headers,
        body: JSON.stringify(heartbeat),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`💓 Heartbeat sent: ${this.deploymentId} (${status})`);
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ Heartbeat failed: ${response.status} ${error}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Heartbeat error: ${error.message}`);
      return false;
    }
  }

  // Mock system metrics (replace with actual monitoring)
  getCpuUsage() {
    return Math.random() * 0.8; // 0-80% CPU usage
  }

  getMemoryUsage() {
    return Math.random() * 0.6; // 0-60% memory usage
  }

  getAverageLatency() {
    return 50 + Math.random() * 100; // 50-150ms latency
  }

  getRequestCount() {
    return Math.floor(Math.random() * 60); // 0-60 requests/minute
  }

  async startHeartbeatLoop(intervalSeconds = 30) {
    console.log(`💓 Starting heartbeat monitor (every ${intervalSeconds}s)`);
    console.log(`   Deployment: ${this.deploymentId}`);
    console.log(`   Vendor: ${this.vendorId}`);
    console.log(`   Model: ${this.modelVersion}`);
    console.log();

    // Send initial heartbeat
    await this.sendHeartbeat();

    // Set up interval with jitter to avoid thundering herd
    const jitter = Math.random() * 5000; // 0-5 second jitter
    const interval = intervalSeconds * 1000 + jitter;

    const heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping heartbeat monitor...');
      clearInterval(heartbeatInterval);
      
      // Send final offline heartbeat
      this.sendHeartbeat('offline').then(() => {
        console.log('👋 Final heartbeat sent');
        process.exit(0);
      });
    });

    console.log('💓 Heartbeat monitor running. Press Ctrl+C to stop.');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const apiUrl = process.env.INFRA_BASE_URL || 'https://infra.neuronetiq.com';
  const token = process.env.MARKETPLACE_TOKEN;

  if (!token) {
    console.error('❌ MARKETPLACE_TOKEN environment variable required');
    console.error('Get your token with: mp link-infra');
    process.exit(1);
  }

  const sender = new HeartbeatSender(apiUrl, token);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 30;

  sender.startHeartbeatLoop(interval);
}

export { HeartbeatSender };
