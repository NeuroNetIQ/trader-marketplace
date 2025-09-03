import { Command } from "commander";
import colors from "picocolors";
import fetch from "node-fetch";
import {
  SignalInferenceRequest,
  SignalInferenceResponse,
  ConsensusInferenceRequest,
  ConsensusInferenceResponse,
} from "@neuronetiq/marketplace-contracts";

const validate = new Command("validate")
  .description("Validate model endpoints and responses")
  .option("--url <url>", "Model endpoint URL", "http://localhost:8080")
  .option("--task <type>", "Model task type", "signal")
  .action(async (options) => {
    console.log(colors.cyan("🔍 Validating Model"));
    console.log();

    const baseUrl = options.url;
    let hasErrors = false;

    // Test health endpoint
    console.log(colors.dim("Testing /health endpoint..."));
    try {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json() as any;
      
      if (response.ok && data?.status === "ok") {
        console.log(colors.green("✅ Health endpoint working"));
      } else {
        console.log(colors.red("❌ Health endpoint failed:"), data);
        hasErrors = true;
      }
    } catch (error) {
      console.log(colors.red("❌ Health endpoint error:"), error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test inference endpoint based on task type
    console.log(colors.dim(`Testing /infer endpoint (${options.task})...`));
    
    try {
      let testRequest: any;
      let schema: any;

      if (options.task === "signal") {
        testRequest = {
          symbol: "EURUSD",
          timeframe: "5m",
          ohlcv: [[Date.now() / 1000, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]],
        };
        schema = SignalInferenceResponse;
      } else if (options.task === "consensus") {
        testRequest = {
          symbol: "EURUSD",
          timeframe: "1h",
          signals: [
            { decision: "BUY", confidence: 0.8, source: "model_1" },
            { decision: "HOLD", confidence: 0.6, source: "model_2" },
          ],
        };
        schema = ConsensusInferenceResponse;
      } else {
        console.log(colors.yellow("⚠️  Unknown task type, using signal validation"));
        testRequest = {
          symbol: "EURUSD",
          timeframe: "5m",
        };
        schema = SignalInferenceResponse;
      }

      const response = await fetch(`${baseUrl}/infer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testRequest),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.log(colors.red("❌ Inference endpoint failed:"), data);
        hasErrors = true;
      } else {
        // Validate response schema
        const validation = schema.safeParse(data);
        
        if (validation.success) {
          console.log(colors.green("✅ Inference endpoint working"));
          console.log(colors.dim("   Response:"), {
            decision: data?.decision,
            confidence: data?.confidence,
            model_version: data?.model_version,
          });
        } else {
          console.log(colors.red("❌ Invalid response schema:"));
          validation.error.issues.forEach((issue: any) => {
            console.log(colors.red(`   ${issue.path.join('.')}: ${issue.message}`));
          });
          hasErrors = true;
        }
      }
    } catch (error) {
      console.log(colors.red("❌ Inference endpoint error:"), error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Summary
    console.log();
    if (hasErrors) {
      console.log(colors.red("❌ Validation failed"));
      console.log();
      console.log("Common issues:");
      console.log(colors.dim("  • Make sure your server is running: npm run dev"));
      console.log(colors.dim("  • Check that endpoints return correct schemas"));
      console.log(colors.dim("  • Verify Content-Type headers are set"));
      process.exit(1);
    } else {
      console.log(colors.green("✅ All validations passed!"));
      console.log();
      console.log("Your model is ready for deployment:");
      console.log(colors.cyan("  mp deploy --provider runpod"));
    }
  });

export default validate;
