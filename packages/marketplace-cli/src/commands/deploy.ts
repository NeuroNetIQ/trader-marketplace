import { Command } from "commander";
import colors from "picocolors";
import prompts from "prompts";
import ora from "ora";
import { loadConfig, updateConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";
import { createRunPodDeployment } from "../lib/runpod.js";

const deploy = new Command("deploy")
  .description("Deploy model to cloud provider")
  .option("--provider <name>", "Cloud provider", "runpod")
  .option("--name <name>", "Deployment name")
  .option("--cpu <cores>", "CPU cores", "2")
  .option("--memory <gb>", "Memory in GB", "4")
  .option("--gpu <type>", "GPU type (optional)")
  .option("--image <uri>", "Docker image URI")
  .action(async (options) => {
    console.log(colors.cyan("🚀 Deploy Model"));
    console.log();

    const config = await loadConfig();
    
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    let deploymentName = options.name;
    let imageUri = options.image;

    // Interactive prompts for missing options
    if (!deploymentName) {
      const response = await prompts({
        type: "text",
        name: "name",
        message: "Deployment name:",
        initial: `${config.vendorId}-signal-model`,
      });
      
      if (!response.name) {
        console.log(colors.red("❌ Deployment cancelled"));
        process.exit(1);
      }
      
      deploymentName = response.name;
    }

    if (!imageUri) {
      const response = await prompts({
        type: "text",
        name: "image",
        message: "Docker image URI:",
        initial: "runpod/pytorch:2.0.1-py3.10-cuda11.8.0-devel-ubuntu22.04",
        validate: (value) => value.length > 0 || "Image URI is required",
      });
      
      if (!response.image) {
        console.log(colors.red("❌ Deployment cancelled"));
        process.exit(1);
      }
      
      imageUri = response.image;
    }

    const spinner = ora("Creating deployment...").start();

    try {
      // Register deployment with marketplace to get scoped infra token
      spinner.text = "Registering deployment with marketplace...";
      
      const deploymentResult = await apiRequest("/api/deployments", {
        method: "POST",
        body: {
          name: deploymentName,
          provider: options.provider,
          cpu: Number(options.cpu),
          memory: Number(options.memory),
          gpu: options.gpu,
          image: imageUri,
        },
      });

      if (!deploymentResult.success) {
        spinner.fail("Failed to register deployment");
        console.log(colors.red("Error:"), deploymentResult.error);
        process.exit(1);
      }

      const { deployment_id, infra_token, runpod_api_key } = deploymentResult.data;

      // Create RunPod deployment
      if (options.provider === "runpod") {
        spinner.text = "Creating RunPod deployment...";
        
        if (!runpod_api_key) {
          spinner.fail("RunPod API key not configured in marketplace");
          console.log(colors.red("Contact support to configure RunPod integration"));
          process.exit(1);
        }

        const runpodDeployment = await createRunPodDeployment(runpod_api_key, {
          name: deploymentName,
          imageUri,
          containerDiskInGb: 10,
          volumeInGb: 20,
          cpu: Number(options.cpu),
          memory: Number(options.memory) * 1024, // Convert GB to MB
          gpu: options.gpu,
          env: {
            VENDOR_ID: config.vendorId!,
            DEPLOYMENT_ID: deployment_id,
            MARKETPLACE_TOKEN: infra_token,
            PORT: "8080",
          },
          ports: [8080],
        });

        // Update marketplace with RunPod deployment ID
        await apiRequest(`/api/deployments/${deployment_id}`, {
          method: "PATCH",
          body: {
            runpod_id: runpodDeployment.id,
            status: "pending",
          },
        });

        spinner.succeed("Deployment created successfully!");
        
        console.log();
        console.log(colors.green("✅ Deployment Details:"));
        console.log(colors.dim(`   Deployment ID: ${deployment_id}`));
        console.log(colors.dim(`   RunPod ID: ${runpodDeployment.id}`));
        console.log(colors.dim(`   Name: ${deploymentName}`));
        console.log(colors.dim(`   CPU: ${options.cpu} cores`));
        console.log(colors.dim(`   Memory: ${options.memory}GB`));
        if (options.gpu) {
          console.log(colors.dim(`   GPU: ${options.gpu}`));
        }
        
        if (runpodDeployment.endpoints?.http) {
          console.log(colors.dim(`   Endpoint: ${runpodDeployment.endpoints.http}`));
        }

        // Save deployment info to config
        await updateConfig({
          lastDeploymentId: deployment_id,
          lastRunpodId: runpodDeployment.id,
        });

        console.log();
        console.log("Next steps:");
        console.log(colors.cyan("  mp register --name 'My Signal Model'"));
        console.log(colors.cyan("  mp heartbeat"));
        console.log(colors.cyan("  mp link-infra"));

      } else {
        spinner.fail(`Provider "${options.provider}" not supported yet`);
        process.exit(1);
      }

    } catch (error) {
      spinner.fail("Deployment failed");
      console.log(colors.red("Error:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default deploy;
