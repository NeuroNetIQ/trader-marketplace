import { Command } from "commander";
import colors from "picocolors";
import prompts from "prompts";
import { loadConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";

const register = new Command("register")
  .description("Register model and version in marketplace catalog")
  .option("--name <name>", "Model name")
  .option("--version <version>", "Model version", "1.0.0")
  .option("--task <type>", "Model task type", "signal")
  .option("--description <desc>", "Model description")
  .option("--deployment-id <id>", "Deployment ID")
  .action(async (options) => {
    console.log(colors.cyan("📝 Register Model"));
    console.log();

    const config = await loadConfig();
    
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    let modelName = options.name;
    let description = options.description;
    let deploymentId = options.deploymentId || config.lastDeploymentId;

    // Interactive prompts for missing options
    const responses = await prompts([
      {
        type: modelName ? null : "text",
        name: "modelName",
        message: "Model name:",
        validate: (value) => value.length > 0 || "Model name is required",
      },
      {
        type: description ? null : "text",
        name: "description",
        message: "Model description:",
        initial: `${options.task} inference model`,
      },
      {
        type: deploymentId ? null : "text",
        name: "deploymentId",
        message: "Deployment ID:",
        validate: (value) => value.length > 0 || "Deployment ID is required",
      },
    ]);

    modelName = modelName || responses.modelName;
    description = description || responses.description;
    deploymentId = deploymentId || responses.deploymentId;

    if (!modelName || !deploymentId) {
      console.log(colors.red("❌ Registration cancelled"));
      process.exit(1);
    }

    try {
      console.log(colors.dim("Registering model..."));

      // Register model
      const modelResult = await apiRequest("/api/vendors/models", {
        method: "POST",
        body: {
          name: modelName,
          description,
          task: options.task,
          version: options.version,
          deployment_id: deploymentId,
        },
      });

      if (!modelResult.success) {
        console.log(colors.red("❌ Failed to register model:"), modelResult.error);
        process.exit(1);
      }

      const { model_id, version_id } = modelResult.data;

      console.log(colors.green("✅ Model registered successfully!"));
      console.log();
      console.log("Model details:");
      console.log(colors.dim(`   Model ID: ${model_id}`));
      console.log(colors.dim(`   Version ID: ${version_id}`));
      console.log(colors.dim(`   Name: ${modelName}`));
      console.log(colors.dim(`   Task: ${options.task}`));
      console.log(colors.dim(`   Version: ${options.version}`));
      console.log(colors.dim(`   Deployment: ${deploymentId}`));

      console.log();
      console.log("Your model will appear in the public catalog once it passes health checks.");
      console.log();
      console.log("Next steps:");
      console.log(colors.cyan("  mp heartbeat  # Send heartbeat to show model is alive"));
      console.log(colors.cyan("  mp link-infra  # Connect to Infrastructure for live trading"));

      // Check catalog visibility
      setTimeout(async () => {
        console.log(colors.dim("Checking catalog visibility..."));
        
        const catalogResult = await apiRequest("/api/catalog");
        if (catalogResult.success) {
          const model = catalogResult.data.find((m: any) => m.id === model_id);
          if (model) {
            console.log(colors.green("✅ Model is visible in public catalog"));
          } else {
            console.log(colors.yellow("⏳ Model not yet visible in catalog (health checks pending)"));
          }
        }
      }, 2000);

    } catch (error) {
      console.log(colors.red("❌ Registration failed:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default register;
