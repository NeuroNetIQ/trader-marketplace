import { Command } from "commander";
import colors from "picocolors";
import prompts from "prompts";
import ora from "ora";
import { promises as fs } from "fs";
import { join } from "path";
import fetch from "node-fetch";
import { loadConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";

const data = new Command("data")
  .description("Manage training datasets");

// data pull subcommand
const pull = new Command("pull")
  .description("Download dataset for training")
  .option("--round <id>", "Dataset round ID (default: current)")
  .option("--output <dir>", "Output directory", "./data")
  .action(async (options) => {
    console.log(colors.cyan("📥 Pulling Dataset"));
    console.log();

    const config = await loadConfig();
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    let roundId = options.round;
    
    // Get current round if not specified
    if (!roundId) {
      console.log(colors.dim("Getting current round..."));
      try {
        const roundResult = await apiRequest("/api/rounds/current");
        if (roundResult.success && roundResult.data?.round_id) {
          roundId = roundResult.data.round_id;
          console.log(colors.dim(`Using current round: ${roundId}`));
        } else {
          console.log(colors.red("❌ No current round available"));
          process.exit(1);
        }
      } catch (error) {
        console.log(colors.red("❌ Failed to get current round:"), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    // Get signed URLs
    console.log(colors.dim("Getting signed download URLs..."));
    const urlsResult = await apiRequest("/api/datasets/signed-urls", {
      method: "POST",
      body: { round_id: roundId },
    });

    if (!urlsResult.success) {
      console.log(colors.red("❌ Failed to get dataset URLs:"), urlsResult.error);
      process.exit(1);
    }

    const { urls, ttl_seconds } = urlsResult.data;
    console.log(colors.dim(`Found ${urls.length} files (URLs expire in ${Math.floor(ttl_seconds / 60)} minutes)`));

    // Create output directory
    const outputDir = join(process.cwd(), options.output, roundId);
    await fs.mkdir(outputDir, { recursive: true });

    // Download each file
    const spinner = ora("Downloading files...").start();
    let downloaded = 0;
    
    try {
      for (const file of urls) {
        spinner.text = `Downloading ${file.name}...`;
        
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`Failed to download ${file.name}: ${response.statusText}`);
        }

        const filePath = join(outputDir, file.name);
        const buffer = await response.buffer();
        await fs.writeFile(filePath, buffer);
        
        downloaded++;
        spinner.text = `Downloaded ${downloaded}/${urls.length} files...`;
      }

      spinner.succeed(`Downloaded ${downloaded} files to ${outputDir}`);
      
      console.log();
      console.log(colors.green("✅ Dataset Download Complete"));
      console.log(colors.dim(`   Round: ${roundId}`));
      console.log(colors.dim(`   Files: ${downloaded}`));
      console.log(colors.dim(`   Location: ${outputDir}`));
      
      // Show file listing
      console.log();
      console.log("Files downloaded:");
      for (const file of urls) {
        const filePath = join(outputDir, file.name);
        const stats = await fs.stat(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(colors.dim(`  ${file.name} (${sizeKB} KB)`));
      }

      console.log();
      console.log("Next steps:");
      console.log(colors.cyan(`  mp train start --round ${roundId}`));
      
    } catch (error) {
      spinner.fail("Download failed");
      console.log(colors.red("Error:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// data info subcommand
const info = new Command("info")
  .description("Show dataset information")
  .option("--round <id>", "Dataset round ID (default: current)")
  .action(async (options) => {
    console.log(colors.cyan("📊 Dataset Information"));
    console.log();

    const config = await loadConfig();
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    let roundId = options.round;
    
    // Get current round if not specified
    if (!roundId) {
      try {
        const roundResult = await apiRequest("/api/rounds/current");
        if (roundResult.success && roundResult.data?.round_id) {
          roundId = roundResult.data.round_id;
        } else {
          console.log(colors.red("❌ No current round available"));
          process.exit(1);
        }
      } catch (error) {
        console.log(colors.red("❌ Failed to get current round:"), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    try {
      const result = await apiRequest(`/api/rounds/${roundId}`);
      
      if (!result.success) {
        console.log(colors.red("❌ Failed to get round information:"), result.error);
        process.exit(1);
      }

      const round = result.data;
      console.log(colors.green("📋 Round Details:"));
      console.log(colors.dim(`   Round ID: ${round.round_id}`));
      console.log(colors.dim(`   Name: ${round.name}`));
      if (round.description) {
        console.log(colors.dim(`   Description: ${round.description}`));
      }
      console.log(colors.dim(`   Schema Version: ${round.schema_version}`));
      console.log(colors.dim(`   Created: ${formatDate(round.created_at)}`));
      if (round.expires_at) {
        console.log(colors.dim(`   Expires: ${formatDate(round.expires_at)}`));
      }

      if (round.files && round.files.length > 0) {
        console.log();
        console.log(colors.green("📁 Files:"));
        round.files.forEach((file: any) => {
          const sizeMB = Math.round(file.size_bytes / (1024 * 1024));
          console.log(colors.dim(`   ${file.name} (${file.type}, ${sizeMB}MB, ${file.format})`));
        });
      }

      if (round.metadata && Object.keys(round.metadata).length > 0) {
        console.log();
        console.log(colors.green("🏷️  Metadata:"));
        Object.entries(round.metadata).forEach(([key, value]) => {
          console.log(colors.dim(`   ${key}: ${value}`));
        });
      }

      console.log();
      console.log("Download dataset:");
      console.log(colors.cyan(`  mp data pull --round ${roundId}`));

    } catch (error) {
      console.log(colors.red("❌ Failed to get dataset info:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// data list subcommand
const list = new Command("list")
  .description("List available dataset rounds")
  .option("--limit <n>", "Number of rounds to show", "10")
  .action(async (options) => {
    console.log(colors.cyan("📚 Available Dataset Rounds"));
    console.log();

    const config = await loadConfig();
    if (!config.apiKey) {
      console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
      process.exit(1);
    }

    try {
      const result = await apiRequest(`/api/rounds?limit=${options.limit}`);
      
      if (!result.success) {
        console.log(colors.red("❌ Failed to get rounds:"), result.error);
        process.exit(1);
      }

      const rounds = result.data.rounds || [];
      
      if (rounds.length === 0) {
        console.log(colors.yellow("⚠️  No dataset rounds available"));
        return;
      }

      console.log(colors.green(`📋 Found ${rounds.length} rounds:`));
      console.log();

      rounds.forEach((round: any, index: number) => {
        const isCurrent = round.is_current || false;
        const status = isCurrent ? colors.green("● CURRENT") : colors.dim("○");
        
        console.log(`${status} ${colors.cyan(round.round_id)} - ${round.name}`);
        console.log(colors.dim(`   Created: ${formatDate(round.created_at)}`));
        if (round.files) {
          const fileCount = Array.isArray(round.files) ? round.files.length : 0;
          console.log(colors.dim(`   Files: ${fileCount}`));
        }
        if (index < rounds.length - 1) console.log();
      });

      console.log();
      console.log("Get dataset info:");
      console.log(colors.cyan("  mp data info --round <round_id>"));
      console.log(colors.cyan("  mp data pull --round <round_id>"));

    } catch (error) {
      console.log(colors.red("❌ Failed to list rounds:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// Add subcommands to main data command
data.addCommand(pull);
data.addCommand(info);
data.addCommand(list);

export default data;
