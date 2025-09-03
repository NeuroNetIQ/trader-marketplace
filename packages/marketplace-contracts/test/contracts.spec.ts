import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import {
  SignalInferenceRequest,
  SignalInferenceResponse,
  SignalWrite,
  ConsensusInferenceRequest,
  ConsensusInferenceResponse,
  ConsensusWrite,
  OptimizerInferenceRequest,
  OptimizerInferenceResponse,
  CatalogModel,
  Heartbeat,
  makeIdempotencyKey,
  withMarketplaceHeaders,
  isValidSymbol,
  formatConfidence,
} from "../src/index.js";

describe("Signal Schemas", () => {
  test("SignalInferenceRequest validation", () => {
    const validRequest = {
      symbol: "EURUSD",
      timeframe: "5m" as const,
      ohlcv: [[1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]],
    };

    const result = SignalInferenceRequest.safeParse(validRequest);
    assert.ok(result.success);
    assert.equal(result.data.symbol, "EURUSD");
  });

  test("SignalInferenceResponse validation", () => {
    const validResponse = {
      decision: "BUY" as const,
      confidence: 0.85,
      model_version: "1.0.0",
      timestamp: new Date().toISOString(),
      rationale: ["Strong upward momentum"],
    };

    const result = SignalInferenceResponse.safeParse(validResponse);
    assert.ok(result.success);
    assert.equal(result.data.decision, "BUY");
  });

  test("SignalWrite validation with vendor fields", () => {
    const validWrite = {
      symbol: "EURUSD",
      timeframe: "5m" as const,
      decision: "HOLD" as const,
      confidence: 1.0,
      model_version: "1.0.0",
      timestamp: new Date().toISOString(),
      vendor_id: "vendor_123",
      deployment_id: "dep_456",
    };

    const result = SignalWrite.safeParse(validWrite);
    assert.ok(result.success);
    assert.equal(result.data.vendor_id, "vendor_123");
  });
});

describe("Consensus Schemas", () => {
  test("ConsensusInferenceRequest validation", () => {
    const validRequest = {
      symbol: "EURUSD",
      timeframe: "1h" as const,
      signals: [
        { decision: "BUY" as const, confidence: 0.8, source: "signal_model_1" },
        { decision: "HOLD" as const, confidence: 0.6, source: "signal_model_2" },
      ],
    };

    const result = ConsensusInferenceRequest.safeParse(validRequest);
    assert.ok(result.success);
    assert.equal(result.data.signals?.length, 2);
  });
});

describe("Catalog Schemas", () => {
  test("CatalogModel validation", () => {
    const validModel = {
      id: "model_123",
      name: "Advanced Signal Generator",
      vendor: "TradingCorp",
      task: "signal" as const,
      stage: "prod" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      last_oos_sharpe: 1.45,
    };

    const result = CatalogModel.safeParse(validModel);
    assert.ok(result.success);
    assert.equal(result.data.task, "signal");
  });

  test("Heartbeat validation", () => {
    const validHeartbeat = {
      deployment_id: "dep_123",
      status: "ready" as const,
      timestamp: new Date().toISOString(),
      metrics: {
        cpu_usage: 0.65,
        memory_usage: 0.45,
        avg_latency_ms: 120,
      },
    };

    const result = Heartbeat.safeParse(validHeartbeat);
    assert.ok(result.success);
    assert.equal(result.data.status, "ready");
  });
});

describe("Utility Functions", () => {
  test("makeIdempotencyKey generates consistent keys", () => {
    const date = new Date("2025-01-01T10:30:15.000Z");
    const key1 = makeIdempotencyKey("EURUSD", "5m", date);
    const key2 = makeIdempotencyKey("EURUSD", "5m", date);
    
    assert.equal(key1, key2);
    assert.ok(key1.startsWith("EURUSD:5m:"));
  });

  test("withMarketplaceHeaders adds required headers", () => {
    const headers = withMarketplaceHeaders({ "Custom": "value" });
    
    assert.ok(headers["X-Marketplace-Contracts-Version"]);
    assert.equal(headers["Custom"], "value");
  });

  test("isValidSymbol validates symbol formats", () => {
    assert.ok(isValidSymbol("EURUSD"));
    assert.ok(isValidSymbol("AAPL"));
    assert.ok(!isValidSymbol("invalid"));
    assert.ok(!isValidSymbol("EU"));
  });

  test("formatConfidence converts to percentage", () => {
    assert.equal(formatConfidence(0.85), "85.0%");
    assert.equal(formatConfidence(1.0), "100.0%");
    assert.equal(formatConfidence(0.123), "12.3%");
  });
});
