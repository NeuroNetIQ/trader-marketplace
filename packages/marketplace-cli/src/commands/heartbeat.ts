import { Command } from "commander";
import colors from "picocolors";
import { loadConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";

const heartbeat = new Command("heartbeat")
  .description("Send heartbeat to marketplace")
  .option("--deployment-id <id>", "Deployment ID")
  .option("--status <status>", "Deployment status", "ready")
  .option("--interval <seconds>", "Send heartbeat every N seconds")
  .action(async (options) => {
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

    const sendHeartbeat = async () => {
      try {
        const result = await apiRequest("/api/marketplace/vendor/heartbeats", {
          method: "POST",
          body: {
            deployment_id: deploymentId,
            status: options.status,
            timestamp: new Date().toISOString(),
            metrics: {
              cpu_usage: getCpuUsage(),
              memory_usage: getMemoryUsage(),
              avg_latency_ms: getAverageLatency(),
              requests_last_minute: getRequestCount(),
              error_count_last_minute: 0,
              model_version: process.env.MODEL_VERSION || "1.0.0",
            },
            message: `Heartbeat from CLI v${require("../../package.json").version}`,
          },
        });

        if (result.success) {
          console.log(colors.green("💓 Heartbeat sent"), colors.dim(`(${deploymentId})`));
        } else {
          console.log(colors.red("❌ Heartbeat failed:"), result.error);
        }

        return result.success;
      } catch (error) {
        console.log(colors.red("❌ Heartbeat error:"), error instanceof Error ? error.message : String(error));
        return false;
      }
    };

    if (options.interval) {
      console.log(colors.cyan("💓 Starting heartbeat monitor"));
      console.log(colors.dim(`   Deployment: ${deploymentId}`));
      console.log(colors.dim(`   Interval: ${options.interval}s`));
      console.log(colors.dim(`   Status: ${options.status}`));
      console.log();

      // Send initial heartbeat
      await sendHeartbeat();

      // Set up interval
      const intervalMs = Number(options.interval) * 1000;
      const intervalId = setInterval(sendHeartbeat, intervalMs);

      // Handle graceful shutdown
      process.on("SIGINT", () => {
        console.log(colors.yellow("\\n🛑 Stopping heartbeat monitor..."));
        clearInterval(intervalId);
        process.exit(0);
      });

      console.log(colors.dim("Press Ctrl+C to stop"));

    } else {
      console.log(colors.cyan("💓 Sending single heartbeat"));
      const success = await sendHeartbeat();
      
      if (success) {
        console.log();
        console.log("To monitor continuously:");
        console.log(colors.cyan("  mp heartbeat --interval 30"));
      } else {
        process.exit(1);
      }
    }
  });

// Helper functions for system metrics
function getCpuUsage(): number {
  // Mock implementation - in production, use actual system monitoring
  return Math.random() * 0.8; // 0-80% CPU usage
}

function getMemoryUsage(): number {
  // Mock implementation - in production, use process.memoryUsage()
  return Math.random() * 0.6; // 0-60% memory usage
}

function getAverageLatency(): number {
  // Mock implementation - in production, track actual response times
  return 50 + Math.random() * 100; // 50-150ms latency
}

function getRequestCount(): number {
  // Mock implementation - in production, track actual request counts
  return Math.floor(Math.random() * 60); // 0-60 requests/minute
}

export default heartbeat;
