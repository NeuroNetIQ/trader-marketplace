import { Command } from "commander";
import colors from "picocolors";
import { loadConfig, updateConfig } from "../lib/config.js";

const config = new Command("config")
  .description("Manage CLI configuration");

// config get subcommand
const get = new Command("get")
  .description("Get configuration value")
  .argument("<key>", "Configuration key")
  .action(async (key) => {
    try {
      const currentConfig = await loadConfig();
      const value = (currentConfig as any)[key];
      
      if (value !== undefined) {
        // Redact sensitive values
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          console.log(`${key}: ${value.substring(0, 8)}...`);
        } else {
          console.log(`${key}: ${value}`);
        }
      } else {
        console.log(colors.yellow(`⚠️  Configuration key '${key}' not set`));
        console.log();
        console.log("Available keys:");
        Object.keys(currentConfig).forEach(k => {
          console.log(colors.dim(`  ${k}`));
        });
      }
    } catch (error) {
      console.log(colors.red("❌ Failed to get configuration:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// config set subcommand
const set = new Command("set")
  .description("Set configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Configuration value")
  .action(async (key, value) => {
    try {
      await updateConfig({ [key]: value });
      console.log(colors.green(`✅ Set ${key}`));
      
      // Show helpful next steps
      if (key === 'apiUrl') {
        console.log();
        console.log("Next steps:");
        console.log(colors.cyan("  mp login --sso"));
        console.log(colors.cyan("  mp doctor"));
      }
    } catch (error) {
      console.log(colors.red("❌ Failed to set configuration:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// config list subcommand
const list = new Command("list")
  .description("List all configuration")
  .action(async () => {
    try {
      const currentConfig = await loadConfig();
      
      console.log(colors.cyan("🔧 Current Configuration:"));
      console.log();
      
      Object.entries(currentConfig).forEach(([key, value]) => {
        // Redact sensitive values
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          console.log(`${colors.dim(key)}: ${(value as string).substring(0, 8)}...`);
        } else {
          console.log(`${colors.dim(key)}: ${value}`);
        }
      });
      
      if (Object.keys(currentConfig).length === 0) {
        console.log(colors.yellow("⚠️  No configuration found"));
        console.log();
        console.log("Set up authentication:");
        console.log(colors.cyan("  mp login --sso"));
      }
    } catch (error) {
      console.log(colors.red("❌ Failed to list configuration:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// config reset subcommand
const reset = new Command("reset")
  .description("Reset all configuration")
  .option("--force", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      if (!options.force) {
        const prompts = await import("prompts");
        const response = await prompts.default({
          type: "confirm",
          name: "confirm",
          message: "Are you sure you want to reset all configuration?",
          initial: false,
        });

        if (!response.confirm) {
          console.log(colors.yellow("❌ Reset cancelled"));
          return;
        }
      }

      await updateConfig({});
      console.log(colors.green("✅ Configuration reset"));
      console.log();
      console.log("To set up again:");
      console.log(colors.cyan("  mp login --sso"));
    } catch (error) {
      console.log(colors.red("❌ Failed to reset configuration:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Add subcommands to main config command
config.addCommand(get);
config.addCommand(set);
config.addCommand(list);
config.addCommand(reset);

export default config;
