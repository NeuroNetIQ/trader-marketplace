import Fastify from "fastify";
import fetch from "node-fetch";
import {
  SignalInferenceRequest,
  SignalWrite,
  withMarketplaceHeaders,
  makeIdempotencyKey,
} from "@neuronetiq/marketplace-contracts";

const app = Fastify({ logger: true });

// Health check endpoint
app.get("/health", async () => ({
  status: "ok",
  version: "1.0.0",
  timestamp: new Date().toISOString(),
}));

// Main inference endpoint
app.post("/infer", async (req, reply) => {
  const parsed = SignalInferenceRequest.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ 
      error: "Invalid request", 
      details: parsed.error.issues 
    });
  }

  const { symbol, timeframe, ohlcv, features } = parsed.data;
  const now = new Date();

  // TODO: Replace with your actual model inference
  const decision = inferDecision(symbol, timeframe, ohlcv, features);
  
  const payload = SignalWrite.parse({
    symbol,
    timeframe,
    decision: decision.decision,
    confidence: decision.confidence,
    model_version: "1.0.0",
    timestamp: now.toISOString(),
    rationale: decision.rationale,
    vendor_id: process.env.VENDOR_ID,
    deployment_id: process.env.DEPLOYMENT_ID,
  });

  // Write to Infrastructure if configured
  if (process.env.INFRA_SIGNALS_URL && process.env.MARKETPLACE_TOKEN) {
    try {
      await fetch(process.env.INFRA_SIGNALS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MARKETPLACE_TOKEN}`,
          "X-Idempotency-Key": makeIdempotencyKey(symbol, timeframe, now),
          ...withMarketplaceHeaders(),
        },
        body: JSON.stringify([payload]),
      });
      
      app.log.info({ symbol, timeframe, decision: payload.decision }, "Signal written to Infrastructure");
    } catch (error) {
      app.log.warn({ error }, "Failed to write to Infrastructure");
    }
  }

  return reply.send(payload);
});

// Simple model inference (replace with your logic)
function inferDecision(
  symbol: string,
  timeframe: string,
  ohlcv?: number[][],
  features?: Record<string, number>
) {
  // TODO: Implement your actual model logic here
  // This is a placeholder that returns random decisions
  
  const decisions = ["BUY", "SELL", "HOLD"] as const;
  const decision = decisions[Math.floor(Math.random() * decisions.length)];
  const confidence = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
  
  return {
    decision,
    confidence,
    rationale: [`Placeholder inference for ${symbol} ${timeframe}`],
  };
}

// Start server
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});