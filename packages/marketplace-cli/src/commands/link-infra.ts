import { Command } from "commander";
import colors from "picocolors";
import prompts from "prompts";
import { loadConfig, updateConfig } from "../lib/config.js";
import { apiRequest, infraRequest } from "../lib/api.js";

const linkInfra = new Command("link-infra")
  .description("Link deployment to Infrastructure for live trading")
  .option("--deployment-id <id>", "Deployment ID")
  .option("--signals-url <url>", "Infrastructure signals endpoint")
  .option("--consensus-url <url>", "Infrastructure consensus endpoint")
  .action(async (options) => {
    console.log(colors.cyan("🔗 Link to Infrastructure"));
    console.log();

    const config = await loadConfig();
    
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    const deploymentId = options.deploymentId || config.lastDeploymentId;
    
    if (!deploymentId) {
      console.log(colors.red("❌ No deployment ID found."));
      console.log("Provide --deployment-id or run 'mp deploy' first.");
      process.exit(1);
    }

    let signalsUrl = options.signalsUrl;
    let consensusUrl = options.consensusUrl;

    // Interactive prompts for missing URLs
    if (!signalsUrl) {
      const response = await prompts({
        type: "text",
        name: "signalsUrl",
        message: "Infrastructure signals endpoint:",
        initial: "https://infra.neuronetiq.com/api/signals/store",
      });
      
      if (!response.signalsUrl) {
        console.log(colors.red("❌ Link cancelled"));
        process.exit(1);
      }
      
      signalsUrl = response.signalsUrl;
    }

    if (!consensusUrl) {
      consensusUrl = signalsUrl.replace("/signals/", "/consensus/");
    }

    try {
      console.log(colors.dim("Requesting Infrastructure access token..."));

      // Request scoped Infrastructure token from marketplace
      const tokenResult = await apiRequest(`/api/deployments/${deploymentId}/infra-token`, {
        method: "POST",
        body: {
          signals_url: signalsUrl,
          consensus_url: consensusUrl,
        },
      });

      if (!tokenResult.success) {
        console.log(colors.red("❌ Failed to get Infrastructure token:"), tokenResult.error);
        process.exit(1);
      }

      const { infra_token, expires_at } = tokenResult.data;

      // Test the token by making a test request to Infrastructure
      console.log(colors.dim("Testing Infrastructure connection..."));

      // Update config with Infrastructure details
      await updateConfig({
        infraUrl: signalsUrl.replace("/api/signals/store", ""),
        infraToken: infra_token,
      });

      // Test connection
      const testResult = await infraRequest("/api/health");
      
      if (!testResult.success) {
        console.log(colors.yellow("⚠️  Infrastructure connection test failed:"), testResult.error);
        console.log("Token saved anyway - check your Infrastructure URL");
      } else {
        console.log(colors.green("✅ Infrastructure connection successful"));
      }

      console.log();
      console.log(colors.green("✅ Infrastructure linked successfully!"));
      console.log();
      console.log("Configuration:");
      console.log(colors.dim(`   Deployment ID: ${deploymentId}`));
      console.log(colors.dim(`   Signals URL: ${signalsUrl}`));
      console.log(colors.dim(`   Consensus URL: ${consensusUrl}`));
      console.log(colors.dim(`   Token expires: ${expires_at}`));

      console.log();
      console.log("Your model can now write to Infrastructure:");
      console.log(colors.cyan("  • Signals: POST " + signalsUrl));
      console.log(colors.cyan("  • Consensus: POST " + consensusUrl));
      console.log();
      console.log("Environment variables for your deployment:");
      console.log(colors.dim(`  INFRA_SIGNALS_URL=${signalsUrl}`));
      console.log(colors.dim(`  INFRA_CONSENSUS_URL=${consensusUrl}`));
      console.log(colors.dim(`  MARKETPLACE_TOKEN=${infra_token.substring(0, 20)}...`));

      // Test a sample write
      console.log();
      console.log(colors.dim("Testing sample signal write..."));
      
      const sampleSignal = [{
        symbol: "EURUSD",
        timeframe: "5m",
        decision: "HOLD",
        confidence: 1.0,
        model_version: "test",
        timestamp: new Date().toISOString(),
        vendor_id: config.vendorId,
        deployment_id: deploymentId,
      }];

      const writeResult = await infraRequest("/api/signals/store", {
        method: "POST",
        body: sampleSignal,
        headers: {
          "X-Idempotency-Key": `TEST:5m:${Math.floor(Date.now() / 5000)}`,
        },
      });

      if (writeResult.success) {
        console.log(colors.green("✅ Sample signal write successful"));
      } else {
        console.log(colors.yellow("⚠️  Sample signal write failed:"), writeResult.error);
      }

      console.log();
      console.log("Your model is now connected to live trading infrastructure!");

    } catch (error) {
      console.log(colors.red("❌ Infrastructure linking failed:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default linkInfra;
