import Fastify from "fastify";
import fetch from "node-fetch";
import {
  SignalInferenceRequest,
  SignalWrite,
  withMarketplaceHeaders,
  makeIdempotencyKey,
  Decision,
} from "@neuronetiq/marketplace-contracts";

const app = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const startTime = Date.now();

// Health check endpoint
app.get("/health", async () => ({
  status: "ok",
  version: process.env.MODEL_VERSION || "1.0.0",
  timestamp: new Date().toISOString(),
  deployment_id: process.env.DEPLOYMENT_ID,
  vendor_id: process.env.VENDOR_ID,
}));

// Readiness endpoint for cold-start gating
app.get("/ready", async () => ({
  status: "ready",
  model_loaded: true,
  last_inference_at: new Date().toISOString(),
  startup_time_ms: Date.now() - startTime,
}));

// Main inference endpoint
app.post("/infer", async (req, reply) => {
  const startTime = Date.now();
  
  try {
    // Validate request schema
    const parsed = SignalInferenceRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ 
        error: "Invalid request", 
        details: parsed.error.issues 
      });
    }

    const { symbol, timeframe, ohlcv, features } = parsed.data;
    const now = new Date();

    // Run model inference
    app.log.info({ symbol, timeframe }, "Running inference");
    const decision = await inferDecision(symbol, timeframe, ohlcv, features);
    
    const inferenceTime = Date.now() - startTime;
    

    // Prepare marketplace response (for API consumers)
    const payload = SignalWrite.parse({
      symbol,
      timeframe,
      decision: decision.decision,
      confidence: decision.confidence,
      model_version: process.env.MODEL_VERSION || "1.0.0",
      timestamp: now.toISOString(),
      rationale: decision.rationale,
      vendor_id: process.env.VENDOR_ID,
      deployment_id: process.env.DEPLOYMENT_ID,
      metadata: {
        inference_time_ms: inferenceTime,
        features_count: features ? Object.keys(features).length : 0,
        ohlcv_bars: ohlcv ? ohlcv.length : 0,
      },
    });

    // Write to Infrastructure if configured
    if (process.env.INFRA_SIGNALS_URL && process.env.MARKETPLACE_TOKEN) {
      try {
        const writeStartTime = Date.now();
        const response = await fetch(process.env.INFRA_SIGNALS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MARKETPLACE_TOKEN}`,
            "X-Contracts-Version": process.env.CONTRACTS_VERSION || "0.17.0",
            "X-Idempotency-Key": makeIdempotencyKey(symbol, timeframe, now),
            ...withMarketplaceHeaders(),
          },
          body: JSON.stringify([payload]),
        });

        const writeTime = Date.now() - writeStartTime;
        
        if (response.ok) {
          app.log.info({ 
            symbol, 
            timeframe, 
            decision: payload.decision, 
            confidence: payload.confidence,
            inference_time_ms: inferenceTime,
            write_time_ms: writeTime
          }, "Signal written to Infrastructure");
        } else {
          const errorText = await response.text();
          app.log.warn({ 
            status: response.status, 
            error: errorText,
            symbol,
            timeframe 
          }, "Failed to write to Infrastructure");
        }
      } catch (error) {
        app.log.warn({ error, symbol, timeframe }, "Infrastructure write failed");
      }
    }

    // Return inference response (without vendor fields for API response)
    const { vendor_id, deployment_id, ...responsePayload } = payload;
    return reply.send(responsePayload);
    
  } catch (error) {
    app.log.error({ error }, "Inference failed");
    return reply.code(500).send({
      error: "Inference failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Simple model inference function
 * Replace this with your actual model logic
 */
async function inferDecision(
  symbol: string,
  timeframe: string,
  ohlcv?: number[][],
  features?: Record<string, number>
): Promise<{
  decision: Decision;
  confidence: number;
  rationale: string[];
}> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 100));
  
  // TODO: Replace this with your actual model logic
  // This is a placeholder implementation
  
  let decision: Decision = "HOLD";
  let confidence = 0.5;
  const rationale: string[] = [];
  
  // Simple example logic based on available data
  if (ohlcv && ohlcv.length > 0) {
    const lastBar = ohlcv[ohlcv.length - 1];
    const [, open, high, low, close] = lastBar;
    
    // Simple trend analysis
    const bodySize = Math.abs(close - open);
    const wickSize = (high - Math.max(open, close)) + (Math.min(open, close) - low);
    const bodyRatio = bodySize / (bodySize + wickSize);
    
    if (close > open && bodyRatio > 0.6) {
      decision = "BUY";
      confidence = Math.min(0.9, 0.6 + bodyRatio * 0.3);
      rationale.push(`Strong bullish candle (body ratio: ${bodyRatio.toFixed(2)})`);
    } else if (close < open && bodyRatio > 0.6) {
      decision = "SELL";
      confidence = Math.min(0.9, 0.6 + bodyRatio * 0.3);
      rationale.push(`Strong bearish candle (body ratio: ${bodyRatio.toFixed(2)})`);
    } else {
      decision = "HOLD";
      confidence = 0.7;
      rationale.push("Indecisive price action");
    }
    
    rationale.push(`Analyzed ${ohlcv.length} price bars`);
  }
  
  if (features && Object.keys(features).length > 0) {
    rationale.push(`Used ${Object.keys(features).length} technical features`);
    
    // Adjust confidence based on feature availability
    confidence = Math.min(1.0, confidence + 0.1);
  }
  
  // Add some randomness to simulate model uncertainty
  confidence = Math.max(0.5, confidence + (Math.random() - 0.5) * 0.2);
  
  rationale.push(`${symbol} ${timeframe} analysis complete`);
  
  return { decision, confidence, rationale };
}

// Graceful shutdown
process.on('SIGTERM', () => {
  app.log.info('Received SIGTERM, shutting down gracefully');
  app.close(() => {
    app.log.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  app.log.info('Received SIGINT, shutting down gracefully');
  app.close(() => {
    app.log.info('Server closed');
    process.exit(0);
  });
});

// Heartbeat system
async function sendHeartbeat() {
  const marketplaceApiUrl = process.env.MARKETPLACE_API_URL;
  const marketplaceToken = process.env.MARKETPLACE_TOKEN;
  const deploymentId = process.env.DEPLOYMENT_ID;
  
  if (!marketplaceApiUrl || !marketplaceToken || !deploymentId) {
    app.log.warn("⚠️  Heartbeat not configured - skipping");
    return;
  }

  try {
    const heartbeat = {
      deployment_id: deploymentId,
      status: "ready",
      timestamp: new Date().toISOString(),
      metrics: {
        cpu_usage: process.cpuUsage().system / 1000000, // Convert to percentage approximation
        memory_usage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
        uptime_seconds: process.uptime(),
        requests_processed: 0, // TODO: Track actual request count
        avg_latency_ms: 75, // TODO: Track actual latency
      },
      message: `Heartbeat from ${process.env.MODEL_VERSION || "1.0.0"}`,
    };

    const response = await fetch(`${marketplaceApiUrl}/api/marketplace/vendor/heartbeats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${marketplaceToken}`,
        ...withMarketplaceHeaders(),
      },
      body: JSON.stringify(heartbeat),
    });

    if (response.ok) {
      app.log.info(`💓 Heartbeat sent: ${deploymentId} (ready)`);
    } else {
      app.log.warn(`⚠️  Heartbeat failed: ${response.status}`);
    }
  } catch (error) {
    app.log.warn({ error }, "Heartbeat error");
  }
}

// Start heartbeat loop
function startHeartbeatLoop() {
  const intervalSeconds = parseInt(process.env.HEARTBEAT_INTERVAL || "30");
  const jitter = Math.random() * 5000; // 0-5 second jitter to prevent thundering herd
  
  app.log.info(`💓 Starting heartbeat loop (${intervalSeconds}s + jitter)`);
  
  // Send initial heartbeat after startup
  setTimeout(sendHeartbeat, 5000);
  
  // Set up regular heartbeats with jitter
  setInterval(sendHeartbeat, intervalSeconds * 1000 + jitter);
}

// Start server
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  
  app.log.info(`🚀 Signal HTTP server listening at ${address}`);
  app.log.info(`📊 Model version: ${process.env.MODEL_VERSION || "1.0.0"}`);
  app.log.info(`🏪 Vendor ID: ${process.env.VENDOR_ID || "not configured"}`);
  app.log.info(`🚀 Deployment ID: ${process.env.DEPLOYMENT_ID || "not configured"}`);
  
  if (process.env.INFRA_SIGNALS_URL) {
    app.log.info(`🔗 Infrastructure URL: ${process.env.INFRA_SIGNALS_URL}`);
    
    // Start heartbeat system if marketplace is configured
    if (process.env.MARKETPLACE_API_URL && process.env.MARKETPLACE_TOKEN) {
      startHeartbeatLoop();
    } else {
      app.log.warn("⚠️  Marketplace not configured - heartbeats disabled");
    }
  } else {
    app.log.warn("⚠️  Infrastructure URL not configured - signals will not be written");
  }
});
