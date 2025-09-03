import { Command } from "commander";
import colors from "picocolors";
import prompts from "prompts";
import ora from "ora";
import { loadConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";
import { TrainingSpecSchema, TrainingStatus } from "@neuronetiq/marketplace-contracts";

// Create the main train command with subcommands
const train = new Command("train")
  .description("Manage training runs");

// train start subcommand
const start = new Command("start")
  .description("Start a new training run")
  .option("--template <name>", "Training template", "runpod-signal-train")
  .option("--round <id>", "Dataset round ID")
  .option("--task <type>", "Training task", "signal")
  .option("--hp <key=value>", "Hyperparameter (repeatable)", collect, {})
  .option("--gpu <type>", "GPU type", "A100")
  .option("--cpu <cores>", "CPU cores", "8")
  .option("--memory <gb>", "Memory in GB", "32")
  .option("--disk <gb>", "Disk in GB", "40")
  .option("--max-hours <hours>", "Maximum training hours")
  .option("--max-cost <usd>", "Maximum cost in USD")
  .option("--hf-repo <repo>", "Hugging Face repository")
  .option("--wandb", "Enable Weights & Biases tracking")
  .option("--wandb-project <project>", "W&B project name")
  .action(async (options) => {
    console.log(colors.cyan("🚀 Starting Training Run"));
    console.log();

    const config = await loadConfig();
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    let roundId = options.round;
    if (!roundId) {
      // Get current round
      try {
        const roundResult = await apiRequest("/api/rounds/current");
        if (roundResult.success && roundResult.data?.round_id) {
          roundId = roundResult.data.round_id;
          console.log(colors.dim(`Using current round: ${roundId}`));
        } else {
          const response = await prompts({
            type: "text",
            name: "roundId",
            message: "Dataset round ID:",
            validate: (value) => value.length > 0 || "Round ID is required",
          });
          if (!response.roundId) {
            console.log(colors.red("❌ Training cancelled"));
            process.exit(1);
          }
          roundId = response.roundId;
        }
      } catch (error) {
        const response = await prompts({
          type: "text",
          name: "roundId",
          message: "Dataset round ID:",
          validate: (value) => value.length > 0 || "Round ID is required",
        });
        if (!response.roundId) {
          console.log(colors.red("❌ Training cancelled"));
          process.exit(1);
        }
        roundId = response.roundId;
      }
    }

    // Get signed dataset URLs
    console.log(colors.dim("Getting dataset URLs..."));
    const urlsResult = await apiRequest("/api/datasets/signed-urls", {
      method: "POST",
      body: { round_id: roundId },
    });

    if (!urlsResult.success) {
      console.log(colors.red("❌ Failed to get dataset URLs:"), urlsResult.error);
      process.exit(1);
    }

    const datasetUrls = urlsResult.data.urls.map((u: any) => u.url);

    // Build training spec
    const spec = {
      round_id: roundId,
      dataset_urls: datasetUrls,
      task: options.task,
      hyperparams: options.hp || {},
      hf_repo_id: options.hfRepo,
      wandb: {
        enabled: !!options.wandb,
        project: options.wandbProject,
      },
      budget: {
        max_hours: options.maxHours ? Number(options.maxHours) : undefined,
        max_cost_usd: options.maxCost ? Number(options.maxCost) : undefined,
      },
    };

    // Validate spec
    const validation = TrainingSpecSchema.safeParse(spec);
    if (!validation.success) {
      console.log(colors.red("❌ Invalid training specification:"));
      validation.error.issues.forEach((issue) => {
        console.log(colors.red(`   ${issue.path.join('.')}: ${issue.message}`));
      });
      process.exit(1);
    }

    const spinner = ora("Creating training run...").start();

    try {
      const result = await apiRequest("/api/training/runs", {
        method: "POST",
        body: validation.data,
      });

      if (!result.success) {
        spinner.fail("Failed to create training run");
        console.log(colors.red("Error:"), result.error);
        process.exit(1);
      }

      spinner.succeed("Training run created!");
      
      const runId = result.data.run_id;
      console.log();
      console.log(colors.green("✅ Training Details:"));
      console.log(colors.dim(`   Run ID: ${runId}`));
      console.log(colors.dim(`   Task: ${options.task}`));
      console.log(colors.dim(`   Round: ${roundId}`));
      console.log(colors.dim(`   GPU: ${options.gpu}`));
      console.log(colors.dim(`   Template: ${options.template}`));

      console.log();
      console.log("Monitor progress:");
      console.log(colors.cyan(`  mp train logs ${runId}`));
      console.log(colors.cyan(`  mp train status ${runId}`));

    } catch (error) {
      spinner.fail("Training run failed");
      console.log(colors.red("Error:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// train status subcommand
const status = new Command("status")
  .description("Get training run status")
  .argument("<run_id>", "Training run ID")
  .action(async (runId) => {
    console.log(colors.cyan(`📊 Training Run Status: ${runId}`));
    console.log();

    try {
      const result = await apiRequest(`/api/training/runs/${runId}`);
      
      if (!result.success) {
        console.log(colors.red("❌ Failed to get status:"), result.error);
        process.exit(1);
      }

      const run = result.data;
      console.log(colors.green("✅ Run Information:"));
      console.log(colors.dim(`   Status: ${getStatusIcon(run.status)} ${run.status}`));
      console.log(colors.dim(`   Provider: ${run.provider}`));
      console.log(colors.dim(`   Created: ${formatDate(run.created_at)}`));
      
      if (run.started_at) {
        console.log(colors.dim(`   Started: ${formatDate(run.started_at)}`));
      }
      
      if (run.finished_at) {
        console.log(colors.dim(`   Finished: ${formatDate(run.finished_at)}`));
      }

      if (run.artifacts?.hf_repo) {
        console.log(colors.dim(`   HF Repo: ${run.artifacts.hf_repo}`));
      }

      if (Object.keys(run.metrics).length > 0) {
        console.log();
        console.log(colors.green("📈 Metrics:"));
        Object.entries(run.metrics).forEach(([key, value]) => {
          console.log(colors.dim(`   ${key}: ${value}`));
        });
      }

      if (run.logs_url) {
        console.log();
        console.log("View logs:");
        console.log(colors.cyan(`  mp train logs ${runId}`));
      }

    } catch (error) {
      console.log(colors.red("❌ Status check failed:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// train logs subcommand
const logs = new Command("logs")
  .description("Stream training run logs")
  .argument("<run_id>", "Training run ID")
  .option("--follow", "Follow log output", false)
  .action(async (runId, options) => {
    console.log(colors.cyan(`📋 Training Logs: ${runId}`));
    console.log();

    try {
      const result = await apiRequest(`/api/training/runs/${runId}/logs`);
      
      if (!result.success) {
        console.log(colors.red("❌ Failed to get logs:"), result.error);
        process.exit(1);
      }

      // For now, just show the logs URL
      // In a full implementation, you'd set up SSE streaming here
      if (result.data.logs_url) {
        console.log(colors.dim("Logs available at:"), result.data.logs_url);
        console.log();
        console.log(colors.yellow("⚠️  Log streaming not yet implemented in CLI"));
        console.log("View logs in the web interface or check the logs URL directly");
      } else {
        console.log(colors.yellow("⚠️  No logs available yet"));
      }

    } catch (error) {
      console.log(colors.red("❌ Failed to get logs:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// train stop subcommand
const stop = new Command("stop")
  .description("Stop a running training job")
  .argument("<run_id>", "Training run ID")
  .action(async (runId) => {
    console.log(colors.cyan(`🛑 Stopping Training Run: ${runId}`));
    console.log();

    const confirm = await prompts({
      type: "confirm",
      name: "stop",
      message: "Are you sure you want to stop this training run?",
      initial: false,
    });

    if (!confirm.stop) {
      console.log(colors.yellow("❌ Stop cancelled"));
      return;
    }

    try {
      const result = await apiRequest(`/api/training/runs/${runId}/cancel`, {
        method: "POST",
      });
      
      if (!result.success) {
        console.log(colors.red("❌ Failed to stop run:"), result.error);
        process.exit(1);
      }

      console.log(colors.green("✅ Training run stopped"));

    } catch (error) {
      console.log(colors.red("❌ Failed to stop run:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Helper functions
function collect(value: string, previous: Record<string, any>) {
  const [key, val] = value.split('=');
  if (!key || val === undefined) {
    throw new Error(`Invalid hyperparameter format: ${value}. Use key=value`);
  }
  
  // Try to parse as number or boolean
  let parsedVal: any = val;
  if (val === 'true') parsedVal = true;
  else if (val === 'false') parsedVal = false;
  else if (!isNaN(Number(val)) && val !== '') parsedVal = Number(val);
  
  return { ...previous, [key]: parsedVal };
}

function getStatusIcon(status: TrainingStatus): string {
  switch (status) {
    case "queued": return "⏳";
    case "running": return "🏃";
    case "succeeded": return "✅";
    case "failed": return "❌";
    case "cancelled": return "🛑";
    default: return "❓";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// Add subcommands to main train command
train.addCommand(start);
train.addCommand(status);
train.addCommand(logs);
train.addCommand(stop);

export default train;
